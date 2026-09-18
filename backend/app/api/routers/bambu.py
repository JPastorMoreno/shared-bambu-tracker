import logging
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.crud import bambu_account as crud_bambu_account
from app.crud import filament_purchase as crud_purchase
from app.crud import print_job as crud_print_job
from app.db.session import get_db
from app.models.bambu_account import BambuAccount
from app.models.filament_purchase import FilamentPurchase
from app.models.print_job import STATUS_PENDING_REVIEW, SOURCE_BAMBU_SYNC, PrintJob
from app.models.print_job_filament import PrintJobFilament
from app.schemas.bambu import (
    BambuLoginStart,
    BambuLoginStartResult,
    BambuLoginVerify,
    BambuLoginVerifyResult,
    BambuStatus,
    BambuSyncResult,
)
from app.services.bambu_cloud import BambuAuthError, BambuCloudClient, BambuSyncError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/bambu", tags=["bambu"])


@lru_cache
def get_bambu_client() -> BambuCloudClient:
    return BambuCloudClient()


async def _guardar_token(
    db: AsyncSession, email: str, region: str, access_token: str, expires_at: datetime
):
    cuenta = await crud_bambu_account.obtener_cuenta(db)
    if cuenta is None:
        cuenta = BambuAccount(email=email, region=region)
    cuenta.email = email
    cuenta.access_token = access_token
    cuenta.token_expires_at = expires_at
    await crud_bambu_account.guardar_cuenta(db, cuenta)


@router.post("/login/start", response_model=BambuLoginStartResult)
async def post_login_start(
    data: BambuLoginStart,
    db: AsyncSession = Depends(get_db),
    client: BambuCloudClient = Depends(get_bambu_client),
):
    try:
        resultado = await client.iniciar_login(data.email, data.password, data.region)
    except BambuAuthError as e:
        raise HTTPException(status_code=401, detail=str(e)[:200]) from e

    if not resultado.requires_code:
        token = await client.verificar_codigo(resultado.login_session_id, code="")
        await _guardar_token(db, token.email, data.region, token.access_token, token.expires_at)

    return BambuLoginStartResult(
        login_session_id=resultado.login_session_id, requires_code=resultado.requires_code
    )


@router.post("/login/verify", response_model=BambuLoginVerifyResult)
async def post_login_verify(
    data: BambuLoginVerify,
    db: AsyncSession = Depends(get_db),
    client: BambuCloudClient = Depends(get_bambu_client),
):
    settings = get_settings()
    try:
        token = await client.verificar_codigo(data.login_session_id, data.code)
    except BambuAuthError as e:
        raise HTTPException(status_code=401, detail=str(e)[:200]) from e

    await _guardar_token(
        db, token.email, settings.BAMBU_REGION, token.access_token, token.expires_at
    )
    return BambuLoginVerifyResult(connected=True)


@router.get("/status", response_model=BambuStatus)
async def get_status(db: AsyncSession = Depends(get_db)):
    cuenta = await crud_bambu_account.obtener_cuenta(db)
    if cuenta is None or not cuenta.access_token:
        return BambuStatus(connected=False, email=None, last_synced_at=None)
    return BambuStatus(
        connected=True, email=cuenta.email, last_synced_at=cuenta.last_synced_at
    )


def _sugerir_filament_usages(
    filamentos, compras: list[FilamentPurchase]
) -> list[PrintJobFilament]:
    """Para cada material real reportado por el AMS en la impresión, busca si hay
    una única bobina propia de ese material con stock: si es inequívoco, lo deja
    ya seleccionado en la revisión; si hay varias o ninguna, lo deja sin sugerir
    (el usuario elige a mano, como hasta ahora)."""
    sugerencias = []
    for filamento in filamentos:
        candidatas = [
            compra
            for compra in compras
            if compra.material.strip().lower() == filamento.material.strip().lower()
            and compra.remaining_weight_g > 0
        ]
        if len(candidatas) == 1:
            sugerencias.append(
                PrintJobFilament(filament_purchase_id=candidatas[0].id, grams_used=filamento.grams)
            )
    return sugerencias


@router.post("/sync", response_model=BambuSyncResult)
async def post_sync(
    db: AsyncSession = Depends(get_db),
    client: BambuCloudClient = Depends(get_bambu_client),
):
    cuenta = await crud_bambu_account.obtener_cuenta(db)
    if cuenta is None or not cuenta.access_token:
        raise HTTPException(status_code=400, detail="Cuenta de Bambu no conectada")

    try:
        tareas = await client.obtener_tareas(cuenta.access_token, cuenta.region)
    except BambuSyncError as e:
        logger.debug("Error sincronizando con Bambu Cloud: %s", str(e)[:80])
        raise HTTPException(status_code=502, detail=str(e)[:200]) from e

    compras = await crud_purchase.listar_compras(db)

    creados = 0
    for tarea in tareas:
        existente = await crud_print_job.obtener_print_job_por_external_id(
            db, tarea.external_task_id
        )
        if existente is not None:
            continue
        print_job = PrintJob(
            source=SOURCE_BAMBU_SYNC,
            external_task_id=tarea.external_task_id,
            printed_at=tarea.printed_at,
            model_name=tarea.model_name,
            status=STATUS_PENDING_REVIEW,
            print_duration_min=tarea.print_duration_min,
            thumbnail_url=tarea.thumbnail_url,
            grams_used=tarea.grams_used_estimado,
            design_id=tarea.design_id,
            ended_at=tarea.ended_at,
            print_succeeded=tarea.print_succeeded,
        )
        print_job.filament_usages = _sugerir_filament_usages(tarea.filamentos, compras)
        await crud_print_job.crear_print_job(db, print_job)
        creados += 1

    cuenta.last_synced_at = datetime.now(timezone.utc)
    await crud_bambu_account.guardar_cuenta(db, cuenta)

    logger.info("Sincronización Bambu completada: %s tareas nuevas", creados)
    return BambuSyncResult(created=creados)
