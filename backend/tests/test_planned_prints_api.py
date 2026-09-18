from httpx import AsyncClient


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


async def test_crear_planned_print_con_coste_esperado(client: AsyncClient, sembrar_personas):
    compra = await _crear_compra(client, sembrar_personas)

    response = await client.post(
        "/api/v1/planned-prints",
        json={
            "model_name": "Soporte para bici",
            "person_id": sembrar_personas["Nacho"].id,
            "filament_purchase_id": compra["id"],
            "expected_grams": 150.0,
        },
    )
    assert response.status_code == 200
    creado = response.json()
    assert creado["expected_cost_eur"] == 3.0
    assert creado["person_id"] == sembrar_personas["Nacho"].id


async def test_crear_planned_print_para_tercero(client: AsyncClient, sembrar_personas):
    response = await client.post(
        "/api/v1/planned-prints",
        json={"model_name": "Llavero", "third_party_name": "Vecino Pepe", "expected_grams": 20.0},
    )
    assert response.status_code == 200
    creado = response.json()
    assert creado["third_party_name"] == "Vecino Pepe"
    assert creado["person_id"] is None
    assert creado["expected_cost_eur"] is None  # sin bobina asignada, no se puede estimar coste


async def test_listar_y_borrar_planned_print(client: AsyncClient, sembrar_personas):
    creado = (
        await client.post(
            "/api/v1/planned-prints", json={"model_name": "Pieza", "expected_grams": 10.0}
        )
    ).json()

    listado = await client.get("/api/v1/planned-prints")
    assert len(listado.json()) == 1

    borrado = await client.delete(f"/api/v1/planned-prints/{creado['id']}")
    assert borrado.status_code == 200

    listado = await client.get("/api/v1/planned-prints")
    assert len(listado.json()) == 0


async def test_completar_planned_print_crea_print_job_y_descuenta_stock(
    client: AsyncClient, sembrar_personas
):
    compra = await _crear_compra(client, sembrar_personas)
    planificada = (
        await client.post(
            "/api/v1/planned-prints",
            json={
                "model_name": "Pieza planificada",
                "person_id": sembrar_personas["Javi"].id,
                "filament_purchase_id": compra["id"],
                "expected_grams": 100.0,
            },
        )
    ).json()

    response = await client.post(f"/api/v1/planned-prints/{planificada['id']}/complete", json={})
    assert response.status_code == 200
    print_job = response.json()
    assert print_job["status"] == "confirmed"
    assert print_job["model_name"] == "Pieza planificada"
    assert print_job["grams_used"] == 100.0
    assert print_job["cost_eur"] == 2.0

    compra_actualizada = await client.get(f"/api/v1/filament-purchases/{compra['id']}")
    assert compra_actualizada.json()["remaining_weight_g"] == 900.0

    listado = await client.get("/api/v1/planned-prints")
    assert len(listado.json()) == 0


async def test_completar_planned_print_permite_ajustar_gramos_reales(
    client: AsyncClient, sembrar_personas
):
    compra = await _crear_compra(client, sembrar_personas)
    planificada = (
        await client.post(
            "/api/v1/planned-prints",
            json={
                "model_name": "Pieza",
                "person_id": sembrar_personas["Javi"].id,
                "filament_purchase_id": compra["id"],
                "expected_grams": 100.0,
            },
        )
    ).json()

    response = await client.post(
        f"/api/v1/planned-prints/{planificada['id']}/complete",
        json={"grams_used": 130.0, "printed_at": "2026-02-01T12:00:00"},
    )
    print_job = response.json()
    assert print_job["grams_used"] == 130.0
    assert print_job["printed_at"] == "2026-02-01T12:00:00"

    compra_actualizada = await client.get(f"/api/v1/filament-purchases/{compra['id']}")
    assert compra_actualizada.json()["remaining_weight_g"] == 870.0
