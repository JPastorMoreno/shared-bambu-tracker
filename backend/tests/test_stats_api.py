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


async def test_low_stock_aparece_por_debajo_del_umbral(client: AsyncClient, sembrar_personas):
    compra = await _crear_compra(client, sembrar_personas, spool_weight_g=250.0)

    await client.post(
        "/api/v1/print-jobs",
        json={
            "printed_at": "2026-01-02T10:00:00",
            "model_name": "Pieza grande",
            "person_id": sembrar_personas["Javi"].id,
            "filament_usages": [{"filament_purchase_id": compra["id"], "grams_used": 120.0}],
        },
    )

    response = await client.get("/api/v1/stats/summary")
    assert response.status_code == 200
    low_stock = response.json()["low_stock"]
    assert any(item["material"] == "PLA" and item["color"] == "Negro" for item in low_stock)


async def test_low_stock_vacio_con_stock_de_sobra(client: AsyncClient, sembrar_personas):
    await _crear_compra(client, sembrar_personas, spool_weight_g=1000.0)

    response = await client.get("/api/v1/stats/summary")
    assert response.json()["low_stock"] == []
