from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.planned_print import PlannedPrint


async def listar_planned_prints(db: AsyncSession) -> list[PlannedPrint]:
    stmt = select(PlannedPrint).options(
        selectinload(PlannedPrint.person), selectinload(PlannedPrint.filament_purchase)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def obtener_planned_print(db: AsyncSession, planned_print_id: int) -> PlannedPrint | None:
    stmt = (
        select(PlannedPrint)
        .where(PlannedPrint.id == planned_print_id)
        .options(selectinload(PlannedPrint.person), selectinload(PlannedPrint.filament_purchase))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def crear_planned_print(db: AsyncSession, planned_print: PlannedPrint) -> PlannedPrint:
    db.add(planned_print)
    await db.commit()
    await db.refresh(planned_print)
    return planned_print


async def guardar_planned_print(db: AsyncSession, planned_print: PlannedPrint) -> PlannedPrint:
    await db.commit()
    await db.refresh(planned_print)
    return planned_print


async def eliminar_planned_print(db: AsyncSession, planned_print: PlannedPrint) -> None:
    await db.delete(planned_print)
    await db.commit()
