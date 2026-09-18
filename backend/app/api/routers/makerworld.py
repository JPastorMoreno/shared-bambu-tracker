from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routers.bambu import get_bambu_client
from app.crud import bambu_account as crud_bambu_account
from app.db.session import get_db
from app.schemas.makerworld import (
    DesignEstimateRequest,
    DesignEstimateResponse,
    DesignFilamentEstimate,
    DesignInstanceEstimate,
)
from app.services import makerworld
from app.services.bambu_cloud import BambuCloudClient, BambuSyncError

router = APIRouter(prefix="/api/v1/makerworld", tags=["makerworld"])


@router.post("/estimate", response_model=DesignEstimateResponse)
async def estimate_design(
    data: DesignEstimateRequest,
    db: AsyncSession = Depends(get_db),
    client: BambuCloudClient = Depends(get_bambu_client),
):
    cuenta = await crud_bambu_account.obtener_cuenta(db)
    if cuenta is None or not cuenta.access_token:
        raise HTTPException(
            status_code=400, detail="Conecta primero tu cuenta de Bambu Cloud en Ajustes"
        )

    design_id = makerworld.extraer_design_id(data.url)
    if design_id is None:
        raise HTTPException(
            status_code=400, detail="No se reconoce ese enlace como un modelo de MakerWorld"
        )

    try:
        diseno = await client.obtener_diseno(cuenta.access_token, design_id)
    except BambuSyncError as e:
        raise HTTPException(status_code=502, detail=str(e)[:200]) from e

    return DesignEstimateResponse(
        title=diseno.title,
        cover_url=diseno.cover_url,
        instances=[
            DesignInstanceEstimate(
                id=instancia.id,
                title=instancia.title,
                is_default=instancia.is_default,
                total_grams=instancia.total_grams,
                estimated_print_minutes=(
                    instancia.estimated_seconds // 60 if instancia.estimated_seconds else None
                ),
                filaments=[
                    DesignFilamentEstimate(type=f.type, color_hex=f.color_hex, grams=f.grams)
                    for f in instancia.filaments
                ],
            )
            for instancia in diseno.instances
        ],
    )
