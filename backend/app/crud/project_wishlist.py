from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project_wishlist import ProjectWishlistItem


async def listar_deseados(db: AsyncSession) -> list[ProjectWishlistItem]:
    stmt = select(ProjectWishlistItem).options(selectinload(ProjectWishlistItem.person))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def obtener_deseado(db: AsyncSession, item_id: int) -> ProjectWishlistItem | None:
    stmt = (
        select(ProjectWishlistItem)
        .where(ProjectWishlistItem.id == item_id)
        .options(selectinload(ProjectWishlistItem.person))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def crear_deseado(db: AsyncSession, item: ProjectWishlistItem) -> ProjectWishlistItem:
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def guardar_deseado(db: AsyncSession, item: ProjectWishlistItem) -> ProjectWishlistItem:
    await db.commit()
    await db.refresh(item)
    return item


async def eliminar_deseado(db: AsyncSession, item: ProjectWishlistItem) -> None:
    await db.delete(item)
    await db.commit()
