from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import person as crud_person
from app.db.session import get_db
from app.schemas.person import PersonRead

router = APIRouter(prefix="/api/v1/persons", tags=["persons"])


@router.get("", response_model=list[PersonRead])
async def get_persons(db: AsyncSession = Depends(get_db)):
    return await crud_person.listar_personas(db)
