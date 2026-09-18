from httpx import AsyncClient


async def test_crear_listar_y_borrar_deseado(client: AsyncClient, sembrar_personas):
    creado = (
        await client.post(
            "/api/v1/project-wishlist",
            json={
                "name": "Maceta grande",
                "person_id": sembrar_personas["Javi"].id,
                "desired_material": "PETG",
                "desired_color": "Verde",
                "expected_grams": 300,
            },
        )
    ).json()
    assert creado["name"] == "Maceta grande"

    listado = await client.get("/api/v1/project-wishlist")
    assert len(listado.json()) == 1

    borrado = await client.delete(f"/api/v1/project-wishlist/{creado['id']}")
    assert borrado.status_code == 200
    assert (await client.get("/api/v1/project-wishlist")).json() == []


async def test_crear_deseado_para_tercero_sin_material_definido(client: AsyncClient):
    creado = (
        await client.post(
            "/api/v1/project-wishlist",
            json={"name": "Regalo cumpleaños", "third_party_name": "Ana"},
        )
    ).json()
    assert creado["third_party_name"] == "Ana"
    assert creado["desired_material"] is None


async def test_promocionar_deseado_a_planificada(client: AsyncClient, sembrar_personas):
    creado = (
        await client.post(
            "/api/v1/project-wishlist",
            json={
                "name": "Soporte de móvil",
                "person_id": sembrar_personas["Nacho"].id,
                "desired_material": "PLA",
                "desired_color": "Negro",
                "expected_grams": 80,
                "notes": "Para el coche",
            },
        )
    ).json()

    promocionado = await client.post(f"/api/v1/project-wishlist/{creado['id']}/promote")
    assert promocionado.status_code == 200
    planificada = promocionado.json()
    assert planificada["model_name"] == "Soporte de móvil"
    assert planificada["person_id"] == sembrar_personas["Nacho"].id
    assert planificada["expected_grams"] == 80.0
    assert planificada["notes"] == "Para el coche"

    # ya no debe quedar en la lista de deseados de proyectos
    assert (await client.get("/api/v1/project-wishlist")).json() == []

    # y debe aparecer en la cola de próximas impresiones
    planificadas = await client.get("/api/v1/planned-prints")
    assert len(planificadas.json()) == 1
