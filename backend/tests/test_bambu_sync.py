from datetime import datetime

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routers.bambu import get_bambu_client
from app.main import app
from app.models.bambu_account import BambuAccount
from app.services.bambu_cloud import BambuTaskDTO


class _FakeBambuCloudClient:
    def __init__(self, tareas):
        self._tareas = tareas

    async def obtener_tareas(self, access_token, region):
        return self._tareas


async def _sembrar_cuenta_conectada(db_session: AsyncSession) -> None:
    cuenta = BambuAccount(email="test@example.com", region="Europe", access_token="tok123")
    db_session.add(cuenta)
    await db_session.commit()


async def test_sync_crea_print_jobs_pendientes(client: AsyncClient, db_session: AsyncSession):
    await _sembrar_cuenta_conectada(db_session)

    tareas = [
        BambuTaskDTO(
            external_task_id="ext-1",
            printed_at=datetime(2026, 1, 1, 10, 0),
            model_name="Pieza A",
            grams_used_estimado=30.0,
        ),
        BambuTaskDTO(
            external_task_id="ext-2",
            printed_at=datetime(2026, 1, 2, 10, 0),
            model_name="Pieza B",
            grams_used_estimado=15.0,
        ),
    ]
    app.dependency_overrides[get_bambu_client] = lambda: _FakeBambuCloudClient(tareas)

    response = await client.post("/api/v1/bambu/sync")
    assert response.status_code == 200
    assert response.json() == {"created": 2}

    print_jobs = await client.get("/api/v1/print-jobs")
    assert len(print_jobs.json()) == 2
    assert all(pj["status"] == "pending_review" for pj in print_jobs.json())
    assert all(pj["source"] == "bambu_sync" for pj in print_jobs.json())

    del app.dependency_overrides[get_bambu_client]


async def test_sync_ignora_duplicados_por_external_task_id(
    client: AsyncClient, db_session: AsyncSession
):
    await _sembrar_cuenta_conectada(db_session)

    tareas = [
        BambuTaskDTO(
            external_task_id="ext-1",
            printed_at=datetime(2026, 1, 1, 10, 0),
            model_name="Pieza A",
        )
    ]
    app.dependency_overrides[get_bambu_client] = lambda: _FakeBambuCloudClient(tareas)

    primera = await client.post("/api/v1/bambu/sync")
    segunda = await client.post("/api/v1/bambu/sync")

    assert primera.json() == {"created": 1}
    assert segunda.json() == {"created": 0}

    print_jobs = await client.get("/api/v1/print-jobs")
    assert len(print_jobs.json()) == 1

    del app.dependency_overrides[get_bambu_client]


async def test_status_sin_cuenta_conectada(client: AsyncClient):
    response = await client.get("/api/v1/bambu/status")
    assert response.status_code == 200
    assert response.json()["connected"] is False
