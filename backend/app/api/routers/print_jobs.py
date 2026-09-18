import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.crud import filament_purchase as crud_purchase
from app.crud import print_job as crud_print_job
from app.db.session import get_db
from app.models.print_job import STATUS_CONFIRMED, STATUS_PENDING_REVIEW, SOURCE_MANUAL, PrintJob
from app.models.print_job_filament import PrintJobFilament
from app.schemas.print_job import (
    PrintJobCreate,
    PrintJobFilamentUsageCreate,
    PrintJobFilamentUsageRead,
    PrintJobRead,
    PrintJobUpdate,
)
from app.services import costing, export_csv, stock

router = APIRouter(prefix="/api/v1/print-jobs", tags=["print-jobs"])

EXTENSIONES_PERMITIDAS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_FOTO_BYTES = 15 * 1024 * 1024


def _a_read(job: PrintJob) -> PrintJobRead:
    resultado = PrintJobRead.model_validate(job)
    resultado.filament_usages = [
        PrintJobFilamentUsageRead(
            filament_purchase_id=uso.filament_purchase_id,
            grams_used=uso.grams_used,
            brand=uso.filament_purchase.brand if uso.filament_purchase else None,
            material=uso.filament_purchase.material if uso.filament_purchase else None,
            color=uso.filament_purchase.color if uso.filament_purchase else None,
        )
        for uso in job.filament_usages
    ]
    resultado.cost_eur = costing.calcular_coste_print_job(job.filament_usages)
    resultado.profit_eur = (
        round(job.sale_price_eur - resultado.cost_eur, 2)
        if job.sale_price_eur is not None and resultado.cost_eur is not None
        else None
    )
    return resultado


async def _construir_usos_filamento(
    db: AsyncSession, usos: list[PrintJobFilamentUsageCreate]
) -> list[PrintJobFilament]:
    lineas = []
    for uso in usos:
        compra = await crud_purchase.obtener_compra(db, uso.filament_purchase_id)
        if compra is None:
            raise HTTPException(status_code=404, detail="Compra de filamento no encontrada")
        stock.descontar_stock(compra, uso.grams_used)
        lineas.append(
            PrintJobFilament(filament_purchase_id=uso.filament_purchase_id, grams_used=uso.grams_used)
        )
    return lineas


@router.get("", response_model=list[PrintJobRead])
async def get_print_jobs(
    status: str | None = None,
    person_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    jobs = await crud_print_job.listar_print_jobs(db, status=status, person_id=person_id)
    return [_a_read(job) for job in jobs]


@router.post("", response_model=PrintJobRead)
async def create_print_job(data: PrintJobCreate, db: AsyncSession = Depends(get_db)):
    payload = data.model_dump(exclude={"filament_usages", "grams_used"})
    grams_total = sum(uso.grams_used for uso in data.filament_usages) if data.filament_usages else None
    print_job = PrintJob(
        **payload,
        grams_used=grams_total if data.filament_usages else data.grams_used,
        source=SOURCE_MANUAL,
        status=STATUS_CONFIRMED,
    )
    print_job.filament_usages = await _construir_usos_filamento(db, data.filament_usages)
    print_job = await crud_print_job.crear_print_job(db, print_job)
    print_job = await crud_print_job.obtener_print_job(db, print_job.id)
    return _a_read(print_job)


@router.get("/export.csv")
async def export_print_jobs_csv(
    status: str | None = None, person_id: int | None = None, db: AsyncSession = Depends(get_db)
):
    jobs = await crud_print_job.listar_print_jobs(db, status=status, person_id=person_id)
    csv_text = export_csv.print_jobs_a_csv(jobs)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=impresiones.csv"},
    )


@router.get("/{print_job_id}", response_model=PrintJobRead)
async def get_print_job(print_job_id: int, db: AsyncSession = Depends(get_db)):
    print_job = await crud_print_job.obtener_print_job(db, print_job_id)
    if print_job is None:
        raise HTTPException(status_code=404, detail="Impresión no encontrada")
    return _a_read(print_job)


@router.patch("/{print_job_id}", response_model=PrintJobRead)
async def update_print_job(
    print_job_id: int, data: PrintJobUpdate, db: AsyncSession = Depends(get_db)
):
    print_job = await crud_print_job.obtener_print_job(db, print_job_id)
    if print_job is None:
        raise HTTPException(status_code=404, detail="Impresión no encontrada")

    estaba_confirmada = print_job.status == STATUS_CONFIRMED
    usos_previos = [(u.filament_purchase_id, u.grams_used) for u in print_job.filament_usages]

    updates = data.model_dump(exclude_unset=True, exclude={"filament_usages"})
    pasa_a_confirmada = (
        print_job.status == STATUS_PENDING_REVIEW
        and updates.get("status") == STATUS_CONFIRMED
    )

    for field, value in updates.items():
        setattr(print_job, field, value)

    usos_cambiaron = data.filament_usages is not None
    if usos_cambiaron:
        print_job.filament_usages = [
            PrintJobFilament(filament_purchase_id=uso.filament_purchase_id, grams_used=uso.grams_used)
            for uso in data.filament_usages
        ]
        print_job.grams_used = sum(uso.grams_used for uso in data.filament_usages)

    if estaba_confirmada and usos_cambiaron:
        # La impresión ya había descontado stock con los filamentos anteriores: se
        # devuelve ese consumo antes de descontar el nuevo, para no descuadrar el stock.
        for filament_purchase_id, grams_used in usos_previos:
            compra_anterior = await crud_purchase.obtener_compra(db, filament_purchase_id)
            if compra_anterior is not None:
                stock.devolver_stock(compra_anterior, grams_used)

    if print_job.status == STATUS_CONFIRMED and (pasa_a_confirmada or (estaba_confirmada and usos_cambiaron)):
        for uso in print_job.filament_usages:
            compra = await crud_purchase.obtener_compra(db, uso.filament_purchase_id)
            if compra is None:
                raise HTTPException(status_code=404, detail="Compra de filamento no encontrada")
            stock.descontar_stock(compra, uso.grams_used)

    print_job = await crud_print_job.guardar_print_job(db, print_job)
    print_job = await crud_print_job.obtener_print_job(db, print_job.id)
    return _a_read(print_job)


@router.post("/{print_job_id}/photo", response_model=PrintJobRead)
async def upload_print_job_photo(
    print_job_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    print_job = await crud_print_job.obtener_print_job(db, print_job_id)
    if print_job is None:
        raise HTTPException(status_code=404, detail="Impresión no encontrada")

    extension = EXTENSIONES_PERMITIDAS.get(file.content_type)
    if extension is None:
        raise HTTPException(
            status_code=400, detail="Formato de imagen no soportado (usa JPEG, PNG o WEBP)"
        )

    contenido = await file.read()
    if len(contenido) > MAX_FOTO_BYTES:
        raise HTTPException(status_code=400, detail="La imagen supera el tamaño máximo (15 MB)")

    settings = get_settings()
    nombre_fichero = f"{uuid.uuid4()}{extension}"
    Path(settings.MEDIA_DIR, nombre_fichero).write_bytes(contenido)

    print_job.thumbnail_url = f"/api/v1/media/{nombre_fichero}"
    print_job = await crud_print_job.guardar_print_job(db, print_job)
    print_job = await crud_print_job.obtener_print_job(db, print_job.id)
    return _a_read(print_job)


@router.delete("/{print_job_id}")
async def delete_print_job(print_job_id: int, db: AsyncSession = Depends(get_db)):
    print_job = await crud_print_job.obtener_print_job(db, print_job_id)
    if print_job is None:
        raise HTTPException(status_code=404, detail="Impresión no encontrada")
    await crud_print_job.eliminar_print_job(db, print_job)
    return {"ok": True}
