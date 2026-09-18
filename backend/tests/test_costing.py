from types import SimpleNamespace

import pytest

from app.services import costing


def _persona(name):
    return SimpleNamespace(name=name)


def _print_job(person=None, grams_used=None, third_party_charge_eur=None):
    return SimpleNamespace(
        person_id=person.name if person else None,
        person=person,
        grams_used=grams_used,
        third_party_charge_eur=third_party_charge_eur,
    )


def _compra(price_eur, paid_by_name):
    return SimpleNamespace(price_eur=price_eur, paid_by_person=_persona(paid_by_name))


def test_calcular_uso_por_persona_agrupa_y_calcula_pct():
    javi = _persona("Javi")
    nacho = _persona("Nacho")
    jobs = [
        _print_job(person=javi, grams_used=100.0),
        _print_job(person=javi, grams_used=50.0),
        _print_job(person=nacho, grams_used=50.0),
        _print_job(person=None, grams_used=100.0),
        _print_job(person=nacho, grams_used=None),
    ]

    resultado = costing.calcular_uso_por_persona(jobs)
    por_persona = {r["person"]: r for r in resultado}

    assert por_persona["Javi"]["grams"] == 150.0
    assert por_persona["Nacho"]["grams"] == 50.0
    assert por_persona["Terceros"]["grams"] == 100.0
    assert por_persona["Javi"]["pct"] == 50.0
    assert por_persona["Nacho"]["pct"] == pytest.approx(16.6667, rel=1e-3)
    assert por_persona["Terceros"]["pct"] == pytest.approx(33.3333, rel=1e-3)


def test_calcular_uso_por_persona_sin_datos_devuelve_pct_cero():
    resultado = costing.calcular_uso_por_persona([])
    assert all(r["grams"] == 0.0 and r["pct"] == 0.0 for r in resultado)


def test_calcular_balance_reparto_equitativo():
    purchases = [
        _compra(60.0, "Javi"),
        _compra(40.0, "Nacho"),
    ]
    print_jobs = [
        _print_job(third_party_charge_eur=20.0),
        _print_job(third_party_charge_eur=None),
    ]

    balance = costing.calcular_balance(purchases, print_jobs)

    assert balance["total_spent_eur"] == 100.0
    assert balance["coste_neto_eur"] == 80.0
    assert balance["saldo_javi_eur"] == 20.0
    assert balance["saldo_nacho_eur"] == 0.0
    assert balance["quien_debe"] == "nacho"
    assert balance["cuanto_eur"] == 20.0


def test_calcular_balance_nadie_debe_nada_cuando_esta_equilibrado():
    purchases = [
        _compra(50.0, "Javi"),
        _compra(50.0, "Nacho"),
    ]
    balance = costing.calcular_balance(purchases, [])

    assert balance["quien_debe"] == "nadie"
    assert balance["cuanto_eur"] == 0.0
