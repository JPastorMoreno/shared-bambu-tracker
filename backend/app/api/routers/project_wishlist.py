from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import planned_print as crud_planned_print
from app.crud import project_wishlist as crud_wishlist
from app.db.session import get_db
from app.models.planned_print import PlannedPrint
from app.models.project_wishlist import ProjectWishlistItem
from app.schemas.planned_print import PlannedPrintRead
from app.schemas.project_wishlist import (
    ProjectWishlistItemCreate,
    ProjectWishlistItemRead,
    ProjectWishlistItemUpdate,
)
from app.services import costing

router = APIRouter(prefix="/api/v1/project-wishlist", tags=["project-wishlist"])


@router.get("", response_model=list[ProjectWishlistItemRead])
async def get_project_wishlist(db: AsyncSession = Depends(get_db)):
    return await crud_wishlist.listar_deseados(db)


@router.post("", response_model=ProjectWishlistItemRead)
async def create_project_wishlist_item(
    data: ProjectWishlistItemCreate, db: AsyncSession = Depends(get_db)
):
    item = ProjectWishlistItem(**data.model_dump())
    return await crud_wishlist.crear_deseado(db, item)


@router.patch("/{item_id}", response_model=ProjectWishlistItemRead)
async def update_project_wishlist_item(
    item_id: int, data: ProjectWishlistItemUpdate, db: AsyncSession = Depends(get_db)
):
    item = await crud_wishlist.obtener_deseado(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Proyecto deseado no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    return await crud_wishlist.guardar_deseado(db, item)


@router.delete("/{item_id}")
async def delete_project_wishlist_item(item_id: int, db: AsyncSession = Depends(get_db)):
    item = await crud_wishlist.obtener_deseado(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Proyecto deseado no encontrado")
    await crud_wishlist.eliminar_deseado(db, item)
    return {"ok": True}


@router.post("/{item_id}/promote", response_model=PlannedPrintRead)
async def promote_project_wishlist_item(item_id: int, db: AsyncSession = Depends(get_db)):
    """Pasa una idea de proyecto a la cola de 'próximas impresiones' (PlannedPrint),
    sin bobina asignada todavía: eso se hace luego desde esa cola, como con las
    impresiones sincronizadas de Bambu Cloud."""
    item = await crud_wishlist.obtener_deseado(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Proyecto deseado no encontrado")

    planned_print = PlannedPrint(
        model_name=item.name,
        person_id=item.person_id,
        third_party_name=item.third_party_name,
        expected_grams=item.expected_grams,
        notes=item.notes,
    )
    planned_print = await crud_planned_print.crear_planned_print(db, planned_print)
    planned_print = await crud_planned_print.obtener_planned_print(db, planned_print.id)

    await crud_wishlist.eliminar_deseado(db, item)

    resultado = PlannedPrintRead.model_validate(planned_print)
    resultado.expected_cost_eur = costing.calcular_coste_linea(
        planned_print.expected_grams, planned_print.filament_purchase
    )
    return resultado
