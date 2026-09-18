from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.person import Person


async def listar_personas(db: AsyncSession) -> list[Person]:
    result = await db.execute(select(Person))
    return list(result.scalars().all())


async def obtener_persona_por_nombre(db: AsyncSession, name: str) -> Person | None:
    result = await db.execute(select(Person).where(Person.name == name))
    return result.scalar_one_or_none()


async def crear_persona(db: AsyncSession, name: str) -> Person:
    persona = Person(name=name)
    db.add(persona)
    await db.commit()
    await db.refresh(persona)
    return persona
