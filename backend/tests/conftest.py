import os
import tempfile
from collections.abc import AsyncGenerator

os.environ.setdefault("MEDIA_DIR", tempfile.mkdtemp(prefix="bambu_tracker_test_media_"))

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.person import Person

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def sembrar_personas(db_session: AsyncSession) -> dict[str, Person]:
    javi = Person(name="Javi")
    nacho = Person(name="Nacho")
    db_session.add_all([javi, nacho])
    await db_session.commit()
    await db_session.refresh(javi)
    await db_session.refresh(nacho)
    return {"Javi": javi, "Nacho": nacho}


@pytest_asyncio.fixture
async def client(db_session: AsyncSession, sembrar_personas) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
