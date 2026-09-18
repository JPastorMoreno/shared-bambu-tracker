from datetime import datetime, timezone

from httpx import AsyncClient

from app.api.routers.bambu import get_bambu_client
from app.main import app
from app.services.bambu_cloud import BambuAuthError, BambuLoginIniciado, BambuToken


class _FakeClientConCodigo:
    async def iniciar_login(self, email, password, region):
        return BambuLoginIniciado(login_session_id="sesion-1", requires_code=True)

    async def verificar_codigo(self, login_session_id, code):
        assert login_session_id == "sesion-1"
        if code != "123456":
            raise BambuAuthError("Código incorrecto o caducado")
        return BambuToken(
            access_token="tok-abc", expires_at=datetime.now(timezone.utc), email="user@test.com"
        )


class _FakeClientSinCodigo:
    async def iniciar_login(self, email, password, region):
        return BambuLoginIniciado(login_session_id="sesion-2", requires_code=False)

    async def verificar_codigo(self, login_session_id, code):
        return BambuToken(
            access_token="tok-directo", expires_at=datetime.now(timezone.utc), email="user@test.com"
        )


class _FakeClientCredencialesInvalidas:
    async def iniciar_login(self, email, password, region):
        raise BambuAuthError("Bambu Cloud rechazó la petición (401): credenciales inválidas")


async def test_login_con_codigo_email(client: AsyncClient):
    app.dependency_overrides[get_bambu_client] = lambda: _FakeClientConCodigo()

    inicio = await client.post(
        "/api/v1/bambu/login/start",
        json={"email": "user@test.com", "password": "x", "region": "global"},
    )
    assert inicio.status_code == 200
    assert inicio.json() == {"login_session_id": "sesion-1", "requires_code": True}

    estado_previo = await client.get("/api/v1/bambu/status")
    assert estado_previo.json()["connected"] is False

    verificacion = await client.post(
        "/api/v1/bambu/login/verify", json={"login_session_id": "sesion-1", "code": "123456"}
    )
    assert verificacion.status_code == 200
    assert verificacion.json() == {"connected": True}

    estado = await client.get("/api/v1/bambu/status")
    assert estado.json()["connected"] is True
    assert estado.json()["email"] == "user@test.com"

    del app.dependency_overrides[get_bambu_client]


async def test_login_codigo_incorrecto(client: AsyncClient):
    app.dependency_overrides[get_bambu_client] = lambda: _FakeClientConCodigo()

    await client.post(
        "/api/v1/bambu/login/start",
        json={"email": "user@test.com", "password": "x", "region": "global"},
    )
    verificacion = await client.post(
        "/api/v1/bambu/login/verify", json={"login_session_id": "sesion-1", "code": "000000"}
    )
    assert verificacion.status_code == 401

    del app.dependency_overrides[get_bambu_client]


async def test_login_directo_sin_codigo(client: AsyncClient):
    app.dependency_overrides[get_bambu_client] = lambda: _FakeClientSinCodigo()

    inicio = await client.post(
        "/api/v1/bambu/login/start",
        json={"email": "user@test.com", "password": "x", "region": "global"},
    )
    assert inicio.json()["requires_code"] is False

    estado = await client.get("/api/v1/bambu/status")
    assert estado.json()["connected"] is True

    del app.dependency_overrides[get_bambu_client]


async def test_login_credenciales_invalidas(client: AsyncClient):
    app.dependency_overrides[get_bambu_client] = lambda: _FakeClientCredencialesInvalidas()

    inicio = await client.post(
        "/api/v1/bambu/login/start",
        json={"email": "user@test.com", "password": "mal", "region": "global"},
    )
    assert inicio.status_code == 401

    del app.dependency_overrides[get_bambu_client]
