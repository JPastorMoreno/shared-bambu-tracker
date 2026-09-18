from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bambu_account import BambuAccount


async def obtener_cuenta(db: AsyncSession) -> BambuAccount | None:
    result = await db.execute(select(BambuAccount))
    return result.scalars().first()


async def guardar_cuenta(db: AsyncSession, cuenta: BambuAccount) -> BambuAccount:
    db.add(cuenta)
    await db.commit()
    await db.refresh(cuenta)
    return cuenta
