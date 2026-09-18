from types import SimpleNamespace

from app.services import stock


def _compra(remaining_weight_g):
    return SimpleNamespace(id=1, remaining_weight_g=remaining_weight_g)


def test_descontar_stock_resta_gramos():
    compra = _compra(500.0)
    stock.descontar_stock(compra, 100.0)
    assert compra.remaining_weight_g == 400.0


def test_descontar_stock_no_baja_de_cero_ni_lanza_excepcion():
    compra = _compra(50.0)
    stock.descontar_stock(compra, 100.0)
    assert compra.remaining_weight_g == 0.0
