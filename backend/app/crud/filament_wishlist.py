from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.filament_wishlist import FilamentWishlistItem


async def listar_deseados(db: AsyncSession) -> list[FilamentWishlistItem]:
    result = await db.execute(select(FilamentWishlistItem))
    return list(result.scalars().all())


async def obtener_deseado(db: AsyncSession, item_id: int) -> FilamentWishlistItem | None:
    return await db.get(FilamentWishlistItem, item_id)


async def crear_deseado(db: AsyncSession, item: FilamentWishlistItem) -> FilamentWishlistItem:
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def guardar_deseado(db: AsyncSession, item: FilamentWishlistItem) -> FilamentWishlistItem:
    await db.commit()
    await db.refresh(item)
    return item


async def eliminar_deseado(db: AsyncSession, item: FilamentWishlistItem) -> None:
    await db.delete(item)
    await db.commit()
