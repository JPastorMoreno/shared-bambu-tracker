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


async def test_crear_print_job_con_varios_filamentos_suma_coste_y_calcula_beneficio(
    client: AsyncClient, sembrar_personas
):
    negro = await _crear_compra(client, sembrar_personas)
    blanco = await _crear_compra(client, sembrar_personas, color="Blanco", price_eur=30.0)

    payload = {
        "printed_at": "2026-01-02T10:00:00",
        "model_name": "Pieza bicolor",
        "person_id": sembrar_personas["Javi"].id,
        "filament_usages": [
            {"filament_purchase_id": negro["id"], "grams_used": 100.0},
            {"filament_purchase_id": blanco["id"], "grams_used": 50.0},
        ],
        "sale_price_eur": 10.0,
    }
    response = await client.post("/api/v1/print-jobs", json=payload)
    assert response.status_code == 200
    creado = response.json()

    # 100g a 0.02€/g (negro) + 50g a 0.03€/g (blanco) = 2.0 + 1.5
    assert creado["grams_used"] == 150.0
    assert creado["cost_eur"] == 3.5
    assert creado["sale_price_eur"] == 10.0
    assert creado["profit_eur"] == 6.5
    assert len(creado["filament_usages"]) == 2
    materiales = {u["color"] for u in creado["filament_usages"]}
    assert materiales == {"Negro", "Blanco"}

    negro_actualizado = await client.get(f"/api/v1/filament-purchases/{negro['id']}")
    assert negro_actualizado.json()["remaining_weight_g"] == 900.0
    blanco_actualizado = await client.get(f"/api/v1/filament-purchases/{blanco['id']}")
    assert blanco_actualizado.json()["remaining_weight_g"] == 950.0


async def test_crear_print_job_manual_descuenta_stock(client: AsyncClient, sembrar_personas):
    compra = await _crear_compra(client, sembrar_personas)

    payload = {
        "printed_at": "2026-01-02T10:00:00",
        "model_name": "Soporte",
        "person_id": sembrar_personas["Javi"].id,
        "filament_usages": [{"filament_purchase_id": compra["id"], "grams_used": 100.0}],
    }
    response = await client.post("/api/v1/print-jobs", json=payload)
    assert response.status_code == 200
    creado = response.json()
    assert creado["status"] == "confirmed"
    assert creado["source"] == "manual"
    assert creado["cost_eur"] == 2.0
    assert creado["grams_used"] == 100.0

    compra_actualizada = await client.get(f"/api/v1/filament-purchases/{compra['id']}")
    assert compra_actualizada.json()["remaining_weight_g"] == 900.0


async def test_patch_confirma_pending_review_y_descuenta_stock(
    client: AsyncClient, sembrar_personas
):
    compra = await _crear_compra(client, sembrar_personas)

    # Simula un print job pendiente de revisión, como si viniera de bambu_sync
    payload = {
        "printed_at": "2026-01-02T10:00:00",
        "model_name": "Pieza",
    }
    response = await client.post("/api/v1/print-jobs", json=payload)
    print_job_id = response.json()["id"]

    # Forzamos manualmente el estado pendiente para simular un job sincronizado
    await client.patch(
        f"/api/v1/print-jobs/{print_job_id}",
        json={"status": "pending_review"},
    )

    response = await client.patch(
        f"/api/v1/print-jobs/{print_job_id}",
        json={
            "person_id": sembrar_personas["Nacho"].id,
            "filament_usages": [{"filament_purchase_id": compra["id"], "grams_used": 50.0}],
            "status": "confirmed",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"

    compra_actualizada = await client.get(f"/api/v1/filament-purchases/{compra['id']}")
    assert compra_actualizada.json()["remaining_weight_g"] == 950.0


async def test_editar_filamento_de_impresion_confirmada_reconcilia_stock(
    client: AsyncClient, sembrar_personas
):
    compra = await _crear_compra(client, sembrar_personas)

    creado = (
        await client.post(
            "/api/v1/print-jobs",
            json={
                "printed_at": "2026-01-02T10:00:00",
                "model_name": "Pieza",
                "person_id": sembrar_personas["Javi"].id,
                "filament_usages": [{"filament_purchase_id": compra["id"], "grams_used": 100.0}],
            },
        )
    ).json()

    compra_tras_crear = await client.get(f"/api/v1/filament-purchases/{compra['id']}")
    assert compra_tras_crear.json()["remaining_weight_g"] == 900.0

    # Se corrige a mano: en realidad se usaron 130g, no 100g.
    response = await client.patch(
        f"/api/v1/print-jobs/{creado['id']}",
        json={"filament_usages": [{"filament_purchase_id": compra["id"], "grams_used": 130.0}]},
    )
    assert response.status_code == 200
    editado = response.json()
    assert editado["grams_used"] == 130.0
    assert editado["status"] == "confirmed"

    compra_tras_editar = await client.get(f"/api/v1/filament-purchases/{compra['id']}")
    # 900 (tras el descuento inicial) + 100 devueltos - 130 nuevos = 870
    assert compra_tras_editar.json()["remaining_weight_g"] == 870.0


async def test_print_job_sin_bobina_no_tiene_coste(client: AsyncClient, sembrar_personas):
    payload = {"printed_at": "2026-01-02T10:00:00", "model_name": "Pieza sin filamento"}
    response = await client.post("/api/v1/print-jobs", json=payload)
    assert response.json()["cost_eur"] is None


async def test_filtro_por_status(client: AsyncClient, sembrar_personas):
    payload = {"printed_at": "2026-01-02T10:00:00", "model_name": "Pieza"}
    await client.post("/api/v1/print-jobs", json=payload)

    response = await client.get("/api/v1/print-jobs", params={"status": "confirmed"})
    assert response.status_code == 200
    assert len(response.json()) == 1

    response = await client.get("/api/v1/print-jobs", params={"status": "pending_review"})
    assert response.status_code == 200
    assert len(response.json()) == 0


async def test_exportar_print_jobs_csv(client: AsyncClient, sembrar_personas):
    payload = {
        "printed_at": "2026-01-02T10:00:00",
        "model_name": "Soporte movil",
        "person_id": sembrar_personas["Javi"].id,
    }
    await client.post("/api/v1/print-jobs", json=payload)

    response = await client.get("/api/v1/print-jobs/export.csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "Soporte movil" in response.text
    assert "Javi" in response.text


async def test_subir_foto_a_print_job(client: AsyncClient, sembrar_personas):
    payload = {"printed_at": "2026-01-02T10:00:00", "model_name": "Pieza con foto"}
    creado = (await client.post("/api/v1/print-jobs", json=payload)).json()

    imagen_falsa = b"\xff\xd8\xff\xe0fake-jpeg-bytes"
    response = await client.post(
        f"/api/v1/print-jobs/{creado['id']}/photo",
        files={"file": ("foto.jpg", imagen_falsa, "image/jpeg")},
    )
    assert response.status_code == 200
    thumbnail_url = response.json()["thumbnail_url"]
    assert thumbnail_url.startswith("/api/v1/media/")

    descarga = await client.get(thumbnail_url)
    assert descarga.status_code == 200
    assert descarga.content == imagen_falsa


async def test_subir_foto_formato_no_soportado(client: AsyncClient, sembrar_personas):
    payload = {"printed_at": "2026-01-02T10:00:00", "model_name": "Pieza"}
    creado = (await client.post("/api/v1/print-jobs", json=payload)).json()

    response = await client.post(
        f"/api/v1/print-jobs/{creado['id']}/photo",
        files={"file": ("archivo.txt", b"no es una imagen", "text/plain")},
    )
    assert response.status_code == 400
