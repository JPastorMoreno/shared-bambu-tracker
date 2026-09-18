from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.print_job import PrintJob
from app.models.print_job_filament import PrintJobFilament

_OPCIONES_CARGA = (
    selectinload(PrintJob.person),
    selectinload(PrintJob.filament_usages).selectinload(PrintJobFilament.filament_purchase),
)


async def listar_print_jobs(
    db: AsyncSession, status: str | None = None, person_id: int | None = None
) -> list[PrintJob]:
    stmt = select(PrintJob).options(*_OPCIONES_CARGA)
    if status is not None:
        stmt = stmt.where(PrintJob.status == status)
    if person_id is not None:
        stmt = stmt.where(PrintJob.person_id == person_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def obtener_print_job(db: AsyncSession, print_job_id: int) -> PrintJob | None:
    stmt = select(PrintJob).where(PrintJob.id == print_job_id).options(*_OPCIONES_CARGA)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def obtener_print_job_por_external_id(
    db: AsyncSession, external_task_id: str
) -> PrintJob | None:
    result = await db.execute(
        select(PrintJob).where(PrintJob.external_task_id == external_task_id)
    )
    return result.scalar_one_or_none()


async def crear_print_job(db: AsyncSession, print_job: PrintJob) -> PrintJob:
    db.add(print_job)
    await db.commit()
    await db.refresh(print_job)
    return print_job


async def guardar_print_job(db: AsyncSession, print_job: PrintJob) -> PrintJob:
    await db.commit()
    await db.refresh(print_job)
    return print_job


async def eliminar_print_job(db: AsyncSession, print_job: PrintJob) -> None:
    await db.delete(print_job)
    await db.commit()
