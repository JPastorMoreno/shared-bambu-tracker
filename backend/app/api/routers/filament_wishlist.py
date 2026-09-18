from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import filament_wishlist as crud_wishlist
from app.db.session import get_db
from app.models.filament_wishlist import FilamentWishlistItem
from app.schemas.filament_wishlist import (
    FilamentWishlistItemCreate,
    FilamentWishlistItemRead,
    FilamentWishlistItemUpdate,
)

router = APIRouter(prefix="/api/v1/filament-wishlist", tags=["filament-wishlist"])


@router.get("", response_model=list[FilamentWishlistItemRead])
async def get_filament_wishlist(db: AsyncSession = Depends(get_db)):
    return await crud_wishlist.listar_deseados(db)


@router.post("", response_model=FilamentWishlistItemRead)
async def create_filament_wishlist_item(
    data: FilamentWishlistItemCreate, db: AsyncSession = Depends(get_db)
):
    item = FilamentWishlistItem(**data.model_dump())
    return await crud_wishlist.crear_deseado(db, item)


@router.patch("/{item_id}", response_model=FilamentWishlistItemRead)
async def update_filament_wishlist_item(
    item_id: int, data: FilamentWishlistItemUpdate, db: AsyncSession = Depends(get_db)
):
    item = await crud_wishlist.obtener_deseado(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Filamento deseado no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    return await crud_wishlist.guardar_deseado(db, item)


@router.delete("/{item_id}")
async def delete_filament_wishlist_item(item_id: int, db: AsyncSession = Depends(get_db)):
    item = await crud_wishlist.obtener_deseado(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Filamento deseado no encontrado")
    await crud_wishlist.eliminar_deseado(db, item)
    return {"ok": True}
