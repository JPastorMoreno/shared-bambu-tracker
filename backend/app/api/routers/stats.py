from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.crud import filament_purchase as crud_purchase
from app.crud import filament_wishlist as crud_filament_wishlist
from app.crud import print_job as crud_print_job
from app.crud import project_wishlist as crud_project_wishlist
from app.db.session import get_db
from app.schemas.inventory import InventoryProjection
from app.schemas.stats import StatsSummary
from app.services import costing

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


@router.get("/inventory-projection", response_model=InventoryProjection)
async def get_inventory_projection(db: AsyncSession = Depends(get_db)):
    purchases = await crud_purchase.listar_compras(db)
    filament_wishlist = await crud_filament_wishlist.listar_deseados(db)
    project_wishlist = await crud_project_wishlist.listar_deseados(db)
    return costing.calcular_proyeccion_inventario(purchases, filament_wishlist, project_wishlist)


@router.get("/summary", response_model=StatsSummary)
async def get_stats_summary(db: AsyncSession = Depends(get_db)):
    purchases = await crud_purchase.listar_compras(db)
    print_jobs = await crud_print_job.listar_print_jobs(db)
    settings = get_settings()

    stock_agrupado = await crud_purchase.obtener_stock_agrupado(db)
    low_stock = [
        item for item in stock_agrupado if item["remaining_weight_g"] < settings.STOCK_BAJO_UMBRAL_G
    ]

    uso_por_persona = costing.calcular_uso_por_persona(print_jobs)
    balance = costing.calcular_balance(purchases, print_jobs)

    total_grams_purchased = sum(p.spool_weight_g for p in purchases)
    total_grams_used = sum(j.grams_used for j in print_jobs if j.grams_used is not None)
    remaining_grams = sum(p.remaining_weight_g for p in purchases)

    uso_por_material: dict[str, float] = defaultdict(float)
    for job in print_jobs:
        for uso in job.filament_usages:
            if uso.filament_purchase is None:
                continue
            uso_por_material[uso.filament_purchase.material] += uso.grams_used

    usage_by_material = [
        {"material": material, "grams": grams} for material, grams in uso_por_material.items()
    ]

    return StatsSummary(
        total_spent_eur=balance["total_spent_eur"],
        total_grams_purchased=total_grams_purchased,
        total_grams_used=total_grams_used,
        remaining_grams=remaining_grams,
        balance=balance,
        usage_by_person=uso_por_persona,
        usage_by_material=usage_by_material,
        low_stock=low_stock,
    )
