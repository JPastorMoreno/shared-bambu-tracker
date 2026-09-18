from datetime import datetime

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routers.bambu import get_bambu_client
from app.main import app
from app.models.bambu_account import BambuAccount
from app.services.bambu_cloud import BambuTaskDTO, BambuTaskFilamentoDTO


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


async def _crear_compra(client: AsyncClient, sembrar_personas, **overrides):
    payload = {
        "purchase_date": "2026-01-01",
        "brand": "Bambu",
        "material": "PLA",
        "color": "Negro",
        "spool_weight_g": 1000.0,
        "price_eur": 20.0,
        "paid_by_person_id": sembrar_personas["Javi"].id,
        "notes": None,
    }
    payload.update(overrides)
    response = await client.post("/api/v1/filament-purchases", json=payload)
    return response.json()


async def test_sync_sugiere_bobina_cuando_el_material_es_inequivoco(
    client: AsyncClient, db_session: AsyncSession, sembrar_personas
):
    await _sembrar_cuenta_conectada(db_session)
    compra = await _crear_compra(client, sembrar_personas)

    tareas = [
        BambuTaskDTO(
            external_task_id="ext-1",
            printed_at=datetime(2026, 1, 1, 10, 0),
            model_name="Pieza A",
            grams_used_estimado=50.0,
            design_id=1551573,
            print_succeeded=True,
            filamentos=[BambuTaskFilamentoDTO(material="PLA", grams=50.0)],
        )
    ]
    app.dependency_overrides[get_bambu_client] = lambda: _FakeBambuCloudClient(tareas)

    await client.post("/api/v1/bambu/sync")
    print_jobs = (await client.get("/api/v1/print-jobs")).json()
    assert len(print_jobs) == 1
    job = print_jobs[0]
    assert job["makerworld_url"] == "https://makerworld.com/en/models/1551573"
    assert job["print_succeeded"] is True
    assert job["filament_usages"] == [
        {
            "filament_purchase_id": compra["id"],
            "grams_used": 50.0,
            "brand": "Bambu",
            "material": "PLA",
            "color": "Negro",
        }
    ]

    del app.dependency_overrides[get_bambu_client]


async def test_sync_no_sugiere_bobina_cuando_hay_varias_del_mismo_material(
    client: AsyncClient, db_session: AsyncSession, sembrar_personas
):
    await _sembrar_cuenta_conectada(db_session)
    await _crear_compra(client, sembrar_personas, color="Negro")
    await _crear_compra(client, sembrar_personas, color="Rojo")

    tareas = [
        BambuTaskDTO(
            external_task_id="ext-1",
            printed_at=datetime(2026, 1, 1, 10, 0),
            model_name="Pieza ambigua",
            filamentos=[BambuTaskFilamentoDTO(material="PLA", grams=50.0)],
        )
    ]
    app.dependency_overrides[get_bambu_client] = lambda: _FakeBambuCloudClient(tareas)

    await client.post("/api/v1/bambu/sync")
    print_jobs = (await client.get("/api/v1/print-jobs")).json()
    assert print_jobs[0]["filament_usages"] == []

    del app.dependency_overrides[get_bambu_client]
