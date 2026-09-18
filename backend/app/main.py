import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text

from app.api.routers import (
    bambu,
    filament_purchases,
    filament_wishlist,
    makerworld,
    persons,
    planned_prints,
    print_jobs,
    project_wishlist,
    stats,
)
from app.core.config import get_settings
from app.core.logging import configurar_logging
from app.db.base import Base
from app.db.session import async_session_maker, engine
from app.models import Person  # noqa: F401 asegura que el modelo está registrado

configurar_logging()
logger = logging.getLogger(__name__)

settings = get_settings()
os.makedirs(settings.MEDIA_DIR, exist_ok=True)


def _tiene_columna(conn, tabla: str, columna: str) -> bool:
    filas = conn.exec_driver_sql(f"PRAGMA table_info({tabla})").fetchall()
    return any(fila[1] == columna for fila in filas)


async def _migrar_columnas_nuevas() -> None:
    """create_all no altera tablas ya existentes: las columnas añadidas a modelos
    tras el primer arranque necesitan un ALTER TABLE manual (no hay Alembic aquí)."""
    async with engine.begin() as conn:
        if not await conn.run_sync(lambda c: _tiene_columna(c, "print_jobs", "sale_price_eur")):
            await conn.execute(text("ALTER TABLE print_jobs ADD COLUMN sale_price_eur FLOAT"))
            logger.info("Migración: añadida columna print_jobs.sale_price_eur")

        for columna, tipo_sql in (
            ("design_id", "INTEGER"),
            ("ended_at", "DATETIME"),
            ("print_succeeded", "BOOLEAN"),
        ):
            if not await conn.run_sync(lambda c, col=columna: _tiene_columna(c, "print_jobs", col)):
                await conn.execute(text(f"ALTER TABLE print_jobs ADD COLUMN {columna} {tipo_sql}"))
                logger.info("Migración: añadida columna print_jobs.%s", columna)


async def _sembrar_datos_iniciales() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await _migrar_columnas_nuevas()

    async with async_session_maker() as db:
        for nombre in ("Javi", "Nacho"):
            result = await db.execute(select(Person).where(Person.name == nombre))
            if result.scalar_one_or_none() is None:
                db.add(Person(name=nombre))
        await db.commit()

    logger.info("Arranque completado, tablas creadas y personas sembradas")


@asynccontextmanager
async def _lifespan(app: FastAPI):
    await _sembrar_datos_iniciales()
    yield


app = FastAPI(title="bambu-tracker", lifespan=_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/api/v1/media", StaticFiles(directory=settings.MEDIA_DIR, check_dir=False), name="media")

app.include_router(persons.router)
app.include_router(filament_purchases.router)
app.include_router(filament_wishlist.router)
app.include_router(print_jobs.router)
app.include_router(planned_prints.router)
app.include_router(project_wishlist.router)
app.include_router(bambu.router)
app.include_router(makerworld.router)
app.include_router(stats.router)
