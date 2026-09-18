from httpx import AsyncClient


async def test_crear_listar_y_borrar_deseado(client: AsyncClient):
    creado = (
        await client.post(
            "/api/v1/filament-wishlist",
            json={
                "material": "ASA",
                "color": "Gris",
                "brand": "Bambu Lab",
                "desired_grams": 1000,
                "estimated_price_eur": 27.99,
            },
        )
    ).json()
    assert creado["material"] == "ASA"

    listado = await client.get("/api/v1/filament-wishlist")
    assert len(listado.json()) == 1

    borrado = await client.delete(f"/api/v1/filament-wishlist/{creado['id']}")
    assert borrado.status_code == 200

    listado = await client.get("/api/v1/filament-wishlist")
    assert len(listado.json()) == 0


async def test_actualizar_deseado(client: AsyncClient):
    creado = (
        await client.post(
            "/api/v1/filament-wishlist",
            json={"material": "PLA", "color": "Rojo", "desired_grams": 1000},
        )
    ).json()

    actualizado = await client.patch(
        f"/api/v1/filament-wishlist/{creado['id']}", json={"estimated_price_eur": 19.99}
    )
    assert actualizado.status_code == 200
    assert actualizado.json()["estimated_price_eur"] == 19.99
