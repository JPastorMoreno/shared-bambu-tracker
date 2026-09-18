from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.filament_purchase import FilamentPurchase
from app.schemas.filament_purchase import FilamentPurchaseCreate, FilamentPurchaseUpdate


async def listar_compras(db: AsyncSession) -> list[FilamentPurchase]:
    result = await db.execute(
        select(FilamentPurchase).options(selectinload(FilamentPurchase.paid_by_person))
    )
    return list(result.scalars().all())


async def obtener_compra(db: AsyncSession, purchase_id: int) -> FilamentPurchase | None:
    return await db.get(FilamentPurchase, purchase_id)


async def crear_compra(db: AsyncSession, data: FilamentPurchaseCreate) -> FilamentPurchase:
    if data.remaining_pct is not None:
        remaining_weight_g = data.spool_weight_g * data.remaining_pct / 100
    else:
        remaining_weight_g = data.spool_weight_g
    compra = FilamentPurchase(
        **data.model_dump(exclude={"remaining_pct"}),
        remaining_weight_g=remaining_weight_g,
    )
    db.add(compra)
    await db.commit()
    await db.refresh(compra)
    return compra


async def actualizar_compra(
    db: AsyncSession, compra: FilamentPurchase, data: FilamentPurchaseUpdate
) -> FilamentPurchase:
    updates = data.model_dump(exclude_unset=True, exclude={"remaining_pct"})
    if data.remaining_pct is not None:
        spool_weight_g = updates.get("spool_weight_g", compra.spool_weight_g)
        updates["remaining_weight_g"] = spool_weight_g * data.remaining_pct / 100
    for field, value in updates.items():
        setattr(compra, field, value)
    await db.commit()
    await db.refresh(compra)
    return compra


async def eliminar_compra(db: AsyncSession, compra: FilamentPurchase) -> None:
    await db.delete(compra)
    await db.commit()


async def obtener_stock_agrupado(db: AsyncSession) -> list[dict]:
    stmt = (
        select(
            FilamentPurchase.material,
            FilamentPurchase.color,
            func.sum(FilamentPurchase.remaining_weight_g).label("remaining_weight_g"),
        )
        .group_by(FilamentPurchase.material, FilamentPurchase.color)
    )
    result = await db.execute(stmt)
    return [
        {"material": row.material, "color": row.color, "remaining_weight_g": row.remaining_weight_g}
        for row in result.all()
    ]
