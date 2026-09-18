NOMBRE_JAVI = "Javi"
NOMBRE_NACHO = "Nacho"
NOMBRE_TERCEROS = "Terceros"


def calcular_coste_linea(grams_used: float | None, purchase) -> float | None:
    if grams_used is None or purchase is None or not purchase.spool_weight_g:
        return None
    precio_por_gramo = purchase.price_eur / purchase.spool_weight_g
    return round(precio_por_gramo * grams_used, 2)


def calcular_coste_print_job(usages) -> float | None:
    """Suma el coste de cada línea de filamento usada en la impresión
    (una impresión puede usar varias bobinas, p.ej. multicolor con AMS)."""
    total = 0.0
    alguna_valida = False
    for usage in usages:
        coste = calcular_coste_linea(usage.grams_used, usage.filament_purchase)
        if coste is not None:
            total += coste
            alguna_valida = True
    return round(total, 2) if alguna_valida else None


def calcular_uso_por_persona(print_jobs) -> list[dict]:
    gramos_javi = 0.0
    gramos_nacho = 0.0
    gramos_terceros = 0.0

    for job in print_jobs:
        if job.grams_used is None:
            continue
        if job.person_id is None:
            gramos_terceros += job.grams_used
        elif job.person.name == NOMBRE_JAVI:
            gramos_javi += job.grams_used
        elif job.person.name == NOMBRE_NACHO:
            gramos_nacho += job.grams_used

    total = gramos_javi + gramos_nacho + gramos_terceros

    def _pct(gramos: float) -> float:
        return (gramos / total * 100) if total else 0.0

    return [
        {"person": NOMBRE_JAVI, "grams": gramos_javi, "pct": _pct(gramos_javi)},
        {"person": NOMBRE_NACHO, "grams": gramos_nacho, "pct": _pct(gramos_nacho)},
        {"person": NOMBRE_TERCEROS, "grams": gramos_terceros, "pct": _pct(gramos_terceros)},
    ]


def calcular_proyeccion_inventario(purchases, filament_wishlist, project_wishlist) -> dict:
    """Proyecta, por material+color, cuánto quedaría de stock si se compra todo lo
    que hay en la lista de deseados de filamento y se imprime todo lo que hay en la
    lista de deseados de proyectos. Un balance negativo (deficit_g > 0) indica que
    hace falta comprar más de ese filamento para cubrir los proyectos deseados."""
    grupos: dict[tuple[str, str], dict] = {}

    def _grupo(material: str, color: str) -> dict:
        clave = (material, color)
        if clave not in grupos:
            grupos[clave] = {
                "material": material,
                "color": color,
                "current_stock_g": 0.0,
                "incoming_wishlist_g": 0.0,
                "reserved_by_projects_g": 0.0,
            }
        return grupos[clave]

    for compra in purchases:
        _grupo(compra.material, compra.color)["current_stock_g"] += compra.remaining_weight_g

    total_wishlist_cost_eur = 0.0
    for deseo in filament_wishlist:
        _grupo(deseo.material, deseo.color)["incoming_wishlist_g"] += deseo.desired_grams
        if deseo.estimated_price_eur is not None:
            total_wishlist_cost_eur += deseo.estimated_price_eur

    projects_without_material = 0
    for proyecto in project_wishlist:
        if not proyecto.desired_material or not proyecto.desired_color:
            projects_without_material += 1
            continue
        if proyecto.expected_grams is None:
            continue
        _grupo(proyecto.desired_material, proyecto.desired_color)[
            "reserved_by_projects_g"
        ] += proyecto.expected_grams

    filas = []
    total_deficit_g = 0.0
    for grupo in grupos.values():
        balance = (
            grupo["current_stock_g"] + grupo["incoming_wishlist_g"] - grupo["reserved_by_projects_g"]
        )
        deficit = max(0.0, -balance)
        total_deficit_g += deficit
        filas.append({**grupo, "projected_balance_g": round(balance, 1), "deficit_g": round(deficit, 1)})

    filas.sort(key=lambda f: (f["material"], f["color"]))

    return {
        "rows": filas,
        "total_wishlist_cost_eur": round(total_wishlist_cost_eur, 2),
        "total_deficit_g": round(total_deficit_g, 1),
        "projects_without_material": projects_without_material,
    }


def calcular_balance(purchases, print_jobs) -> dict:
    total_purchases_eur = sum(p.price_eur for p in purchases)
    total_third_party_eur = sum(
        j.third_party_charge_eur for j in print_jobs if j.third_party_charge_eur is not None
    )
    coste_neto = total_purchases_eur - total_third_party_eur
    parte_justa_cada_uno = coste_neto / 2

    pagado_javi = sum(p.price_eur for p in purchases if p.paid_by_person.name == NOMBRE_JAVI)
    pagado_nacho = sum(p.price_eur for p in purchases if p.paid_by_person.name == NOMBRE_NACHO)

    saldo_javi = pagado_javi - parte_justa_cada_uno
    saldo_nacho = pagado_nacho - parte_justa_cada_uno

    if saldo_javi > 0:
        quien_debe = "nacho"
        cuanto_eur = saldo_javi
    elif saldo_nacho > 0:
        quien_debe = "javi"
        cuanto_eur = saldo_nacho
    else:
        quien_debe = "nadie"
        cuanto_eur = 0.0

    return {
        "total_spent_eur": total_purchases_eur,
        "coste_neto_eur": coste_neto,
        "saldo_javi_eur": saldo_javi,
        "saldo_nacho_eur": saldo_nacho,
        "quien_debe": quien_debe,
        "cuanto_eur": cuanto_eur,
    }
