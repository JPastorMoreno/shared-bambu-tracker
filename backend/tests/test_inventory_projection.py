from httpx import AsyncClient


async def test_proyeccion_inventario(client: AsyncClient, sembrar_personas):
    await client.post(
        "/api/v1/filament-purchases",
        json={
            "purchase_date": "2026-01-01",
            "brand": "Bambu",
            "material": "PLA",
            "color": "Negro",
            "spool_weight_g": 1000.0,
            "price_eur": 20.0,
            "paid_by_person_id": sembrar_personas["Javi"].id,
            "remaining_pct": 20,  # quedan 200g
        },
    )

    await client.post(
        "/api/v1/filament-wishlist",
        json={"material": "PLA", "color": "Negro", "desired_grams": 1000, "estimated_price_eur": 20},
    )

    await client.post(
        "/api/v1/project-wishlist",
        json={"name": "Pieza A", "desired_material": "PLA", "desired_color": "Negro", "expected_grams": 500},
    )
    await client.post(
        "/api/v1/project-wishlist",
        json={"name": "Pieza B", "desired_material": "PETG", "desired_color": "Verde", "expected_grams": 300},
    )
    await client.post("/api/v1/project-wishlist", json={"name": "Idea sin material"})

    response = await client.get("/api/v1/stats/inventory-projection")
    assert response.status_code == 200
    data = response.json()

    assert data["projects_without_material"] == 1
    assert data["total_wishlist_cost_eur"] == 20.0

    fila_pla = next(f for f in data["rows"] if f["material"] == "PLA")
    assert fila_pla["current_stock_g"] == 200.0
    assert fila_pla["incoming_wishlist_g"] == 1000.0
    assert fila_pla["reserved_by_projects_g"] == 500.0
    assert fila_pla["projected_balance_g"] == 700.0
    assert fila_pla["deficit_g"] == 0.0

    fila_petg = next(f for f in data["rows"] if f["material"] == "PETG")
    assert fila_petg["current_stock_g"] == 0.0
    assert fila_petg["reserved_by_projects_g"] == 300.0
    assert fila_petg["projected_balance_g"] == -300.0
    assert fila_petg["deficit_g"] == 300.0

    assert data["total_deficit_g"] == 300.0


async def test_proyeccion_vacia(client: AsyncClient):
    response = await client.get("/api/v1/stats/inventory-projection")
    assert response.status_code == 200
    data = response.json()
    assert data["rows"] == []
    assert data["total_wishlist_cost_eur"] == 0.0
    assert data["total_deficit_g"] == 0.0
    assert data["projects_without_material"] == 0
