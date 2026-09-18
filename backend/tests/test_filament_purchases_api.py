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
    assert response.status_code == 200
    return response.json()


async def test_crear_y_listar_compras(client: AsyncClient, sembrar_personas):
    creada = await _crear_compra(client, sembrar_personas)
    assert creada["remaining_weight_g"] == 1000.0
    assert creada["remaining_pct"] == 100.0

    response = await client.get("/api/v1/filament-purchases")
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_crear_compra_con_pct_restante_inicial(client: AsyncClient, sembrar_personas):
    creada = await _crear_compra(client, sembrar_personas, remaining_pct=70.0)
    assert creada["remaining_weight_g"] == 700.0
    assert creada["remaining_pct"] == 70.0


async def test_actualizar_pct_restante(client: AsyncClient, sembrar_personas):
    creada = await _crear_compra(client, sembrar_personas)

    response = await client.patch(
        f"/api/v1/filament-purchases/{creada['id']}", json={"remaining_pct": 40.0}
    )
    assert response.status_code == 200
    actualizada = response.json()
    assert actualizada["remaining_weight_g"] == 400.0
    assert actualizada["remaining_pct"] == 40.0


async def test_obtener_actualizar_y_borrar_compra(client: AsyncClient, sembrar_personas):
    creada = await _crear_compra(client, sembrar_personas)
    purchase_id = creada["id"]

    response = await client.get(f"/api/v1/filament-purchases/{purchase_id}")
    assert response.status_code == 200

    response = await client.patch(
        f"/api/v1/filament-purchases/{purchase_id}", json={"remaining_weight_g": 500.0}
    )
    assert response.status_code == 200
    assert response.json()["remaining_weight_g"] == 500.0

    response = await client.delete(f"/api/v1/filament-purchases/{purchase_id}")
    assert response.status_code == 200

    response = await client.get(f"/api/v1/filament-purchases/{purchase_id}")
    assert response.status_code == 404


async def test_stock_agrupado_por_material_y_color(client: AsyncClient, sembrar_personas):
    await _crear_compra(client, sembrar_personas, material="PLA", color="Negro")
    await _crear_compra(client, sembrar_personas, material="PLA", color="Negro")
    await _crear_compra(client, sembrar_personas, material="PETG", color="Blanco")

    response = await client.get("/api/v1/filament-purchases/stock")
    assert response.status_code == 200
    stock = response.json()

    entrada_pla = next(s for s in stock if s["material"] == "PLA")
    assert entrada_pla["remaining_weight_g"] == 2000.0


async def test_exportar_compras_csv(client: AsyncClient, sembrar_personas):
    await _crear_compra(client, sembrar_personas, brand="Bambu", material="PLA")

    response = await client.get("/api/v1/filament-purchases/export.csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    assert "Bambu" in response.text
    assert "PLA" in response.text
