from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import filament_purchase as crud_purchase
from app.db.session import get_db
from app.schemas.filament_purchase import (
    FilamentPurchaseCreate,
    FilamentPurchaseRead,
    FilamentPurchaseUpdate,
    StockItem,
)
from app.services import export_csv

router = APIRouter(prefix="/api/v1/filament-purchases", tags=["filament-purchases"])


@router.get("", response_model=list[FilamentPurchaseRead])
async def get_filament_purchases(db: AsyncSession = Depends(get_db)):
    return await crud_purchase.listar_compras(db)


@router.post("", response_model=FilamentPurchaseRead)
async def create_filament_purchase(
    data: FilamentPurchaseCreate, db: AsyncSession = Depends(get_db)
):
    return await crud_purchase.crear_compra(db, data)


@router.get("/stock", response_model=list[StockItem])
async def get_filament_stock(db: AsyncSession = Depends(get_db)):
    return await crud_purchase.obtener_stock_agrupado(db)


@router.get("/export.csv")
async def export_filament_purchases_csv(db: AsyncSession = Depends(get_db)):
    purchases = await crud_purchase.listar_compras(db)
    csv_text = export_csv.compras_a_csv(purchases)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=compras_filamento.csv"},
    )


@router.get("/{purchase_id}", response_model=FilamentPurchaseRead)
async def get_filament_purchase(purchase_id: int, db: AsyncSession = Depends(get_db)):
    compra = await crud_purchase.obtener_compra(db, purchase_id)
    if compra is None:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    return compra


@router.patch("/{purchase_id}", response_model=FilamentPurchaseRead)
async def update_filament_purchase(
    purchase_id: int, data: FilamentPurchaseUpdate, db: AsyncSession = Depends(get_db)
):
    compra = await crud_purchase.obtener_compra(db, purchase_id)
    if compra is None:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    return await crud_purchase.actualizar_compra(db, compra, data)


@router.delete("/{purchase_id}")
async def delete_filament_purchase(purchase_id: int, db: AsyncSession = Depends(get_db)):
    compra = await crud_purchase.obtener_compra(db, purchase_id)
    if compra is None:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    await crud_purchase.eliminar_compra(db, compra)
    return {"ok": True}
