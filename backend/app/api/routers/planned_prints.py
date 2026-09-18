from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import filament_purchase as crud_purchase
from app.crud import planned_print as crud_planned_print
from app.crud import print_job as crud_print_job
from app.db.session import get_db
from app.models.planned_print import PlannedPrint
from app.models.print_job import SOURCE_MANUAL, STATUS_CONFIRMED, PrintJob
from app.models.print_job_filament import PrintJobFilament
from app.schemas.planned_print import (
    PlannedPrintComplete,
    PlannedPrintCreate,
    PlannedPrintRead,
    PlannedPrintUpdate,
)
from app.api.routers.print_jobs import _a_read as _print_job_a_read
from app.schemas.print_job import PrintJobRead
from app.services import costing, stock

router = APIRouter(prefix="/api/v1/planned-prints", tags=["planned-prints"])


def _a_read(planned_print: PlannedPrint) -> PlannedPrintRead:
    resultado = PlannedPrintRead.model_validate(planned_print)
    resultado.expected_cost_eur = costing.calcular_coste_linea(
        planned_print.expected_grams, planned_print.filament_purchase
    )
    return resultado


@router.get("", response_model=list[PlannedPrintRead])
async def get_planned_prints(db: AsyncSession = Depends(get_db)):
    planned_prints = await crud_planned_print.listar_planned_prints(db)
    return [_a_read(p) for p in planned_prints]


@router.post("", response_model=PlannedPrintRead)
async def create_planned_print(data: PlannedPrintCreate, db: AsyncSession = Depends(get_db)):
    planned_print = PlannedPrint(**data.model_dump())
    planned_print = await crud_planned_print.crear_planned_print(db, planned_print)
    planned_print = await crud_planned_print.obtener_planned_print(db, planned_print.id)
    return _a_read(planned_print)


@router.get("/{planned_print_id}", response_model=PlannedPrintRead)
async def get_planned_print(planned_print_id: int, db: AsyncSession = Depends(get_db)):
    planned_print = await crud_planned_print.obtener_planned_print(db, planned_print_id)
    if planned_print is None:
        raise HTTPException(status_code=404, detail="Impresión planificada no encontrada")
    return _a_read(planned_print)


@router.patch("/{planned_print_id}", response_model=PlannedPrintRead)
async def update_planned_print(
    planned_print_id: int, data: PlannedPrintUpdate, db: AsyncSession = Depends(get_db)
):
    planned_print = await crud_planned_print.obtener_planned_print(db, planned_print_id)
    if planned_print is None:
        raise HTTPException(status_code=404, detail="Impresión planificada no encontrada")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(planned_print, field, value)

    planned_print = await crud_planned_print.guardar_planned_print(db, planned_print)
    planned_print = await crud_planned_print.obtener_planned_print(db, planned_print.id)
    return _a_read(planned_print)


@router.delete("/{planned_print_id}")
async def delete_planned_print(planned_print_id: int, db: AsyncSession = Depends(get_db)):
    planned_print = await crud_planned_print.obtener_planned_print(db, planned_print_id)
    if planned_print is None:
        raise HTTPException(status_code=404, detail="Impresión planificada no encontrada")
    await crud_planned_print.eliminar_planned_print(db, planned_print)
    return {"ok": True}


@router.post("/{planned_print_id}/complete", response_model=PrintJobRead)
async def complete_planned_print(
    planned_print_id: int, data: PlannedPrintComplete, db: AsyncSession = Depends(get_db)
):
    planned_print = await crud_planned_print.obtener_planned_print(db, planned_print_id)
    if planned_print is None:
        raise HTTPException(status_code=404, detail="Impresión planificada no encontrada")

    grams_used = data.grams_used if data.grams_used is not None else planned_print.expected_grams

    compra = None
    if planned_print.filament_purchase_id is not None:
        compra = await crud_purchase.obtener_compra(db, planned_print.filament_purchase_id)
        if compra is None:
            raise HTTPException(status_code=404, detail="Compra de filamento no encontrada")
        if grams_used is not None:
            stock.descontar_stock(compra, grams_used)

    print_job = PrintJob(
        source=SOURCE_MANUAL,
        printed_at=data.printed_at or datetime.now(timezone.utc),
        model_name=planned_print.model_name,
        person_id=planned_print.person_id,
        third_party_name=planned_print.third_party_name,
        grams_used=grams_used,
        status=STATUS_CONFIRMED,
        notes=planned_print.notes,
    )
    if planned_print.filament_purchase_id is not None and grams_used is not None:
        print_job.filament_usages = [
            PrintJobFilament(
                filament_purchase_id=planned_print.filament_purchase_id, grams_used=grams_used
            )
        ]
    print_job = await crud_print_job.crear_print_job(db, print_job)
    print_job = await crud_print_job.obtener_print_job(db, print_job.id)

    await crud_planned_print.eliminar_planned_print(db, planned_print)

    return _print_job_a_read(print_job)
