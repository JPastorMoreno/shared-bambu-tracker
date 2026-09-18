from datetime import datetime, timezone

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routers.bambu import get_bambu_client
from app.main import app
from app.models.bambu_account import BambuAccount
from app.services.bambu_cloud import (
    BambuDesignDTO,
    BambuDesignFilamentDTO,
    BambuDesignInstanceDTO,
    BambuSyncError,
)
from app.services.makerworld import extraer_design_id


def test_extraer_design_id_con_slug():
    url = "https://makerworld.com/en/models/1312612-low-poly-benchy"
    assert extraer_design_id(url) == 1312612


def test_extraer_design_id_sin_slug():
    assert extraer_design_id("https://makerworld.com/models/455024") == 455024


def test_extraer_design_id_url_no_reconocida():
    assert extraer_design_id("https://printables.com/model/12345") is None


class _FakeBambuCloudClient:
    async def obtener_diseno(self, access_token, design_id):
        assert access_token == "tok-real"
        assert design_id == 1312612
        return BambuDesignDTO(
            title="Low Poly Benchy",
            cover_url="https://example.com/cover.jpg",
            instances=[
                BambuDesignInstanceDTO(
                    id=1347125,
                    title="0.2mm layer, 2 walls, 10% infill",
                    is_default=True,
                    total_grams=11.0,
                    estimated_seconds=2729,
                    filaments=[BambuDesignFilamentDTO(type="PLA", color_hex="#39699E", grams=11.0)],
                )
            ],
        )


async def _sembrar_cuenta_conectada(db_session: AsyncSession) -> None:
    cuenta = BambuAccount(email="test@example.com", region="Europe", access_token="tok-real")
    db_session.add(cuenta)
    await db_session.commit()


async def test_estimate_design_devuelve_gramos_y_tiempo(client: AsyncClient, db_session: AsyncSession):
    await _sembrar_cuenta_conectada(db_session)
    app.dependency_overrides[get_bambu_client] = lambda: _FakeBambuCloudClient()

    response = await client.post(
        "/api/v1/makerworld/estimate",
        json={"url": "https://makerworld.com/en/models/1312612-low-poly-benchy"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Low Poly Benchy"
    assert len(data["instances"]) == 1
    instancia = data["instances"][0]
    assert instancia["total_grams"] == 11.0
    assert instancia["estimated_print_minutes"] == 45  # 2729 // 60
    assert instancia["filaments"] == [{"type": "PLA", "color_hex": "#39699E", "grams": 11.0}]

    del app.dependency_overrides[get_bambu_client]


async def test_estimate_design_sin_cuenta_conectada(client: AsyncClient):
    response = await client.post(
        "/api/v1/makerworld/estimate", json={"url": "https://makerworld.com/en/models/1312612-x"}
    )
    assert response.status_code == 400


async def test_estimate_design_url_no_reconocida(client: AsyncClient, db_session: AsyncSession):
    await _sembrar_cuenta_conectada(db_session)
    response = await client.post(
        "/api/v1/makerworld/estimate", json={"url": "https://printables.com/model/1"}
    )
    assert response.status_code == 400


async def test_estimate_design_sin_perfiles_publicados(client: AsyncClient, db_session: AsyncSession):
    """Algunos modelos de MakerWorld no tienen ningún perfil de impresión sliceado
    publicado (instances=null en la respuesta real): debe devolver una lista vacía,
    no un error, para que el frontend pueda avisar de que no hay estimación."""
    await _sembrar_cuenta_conectada(db_session)

    class _FakeClientSinPerfiles:
        async def obtener_diseno(self, access_token, design_id):
            return BambuDesignDTO(title="Modelo sin perfil", cover_url=None, instances=[])

    app.dependency_overrides[get_bambu_client] = lambda: _FakeClientSinPerfiles()

    response = await client.post(
        "/api/v1/makerworld/estimate", json={"url": "https://makerworld.com/en/models/455024"}
    )
    assert response.status_code == 200
    assert response.json()["instances"] == []

    del app.dependency_overrides[get_bambu_client]


async def test_estimate_design_error_de_bambu_cloud(client: AsyncClient, db_session: AsyncSession):
    await _sembrar_cuenta_conectada(db_session)

    class _FakeClientConError:
        async def obtener_diseno(self, access_token, design_id):
            raise BambuSyncError("Diseño no encontrado o privado")

    app.dependency_overrides[get_bambu_client] = lambda: _FakeClientConError()

    response = await client.post(
        "/api/v1/makerworld/estimate",
        json={"url": "https://makerworld.com/en/models/999999999-inexistente"},
    )
    assert response.status_code == 502

    del app.dependency_overrides[get_bambu_client]
