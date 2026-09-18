import logging

from app.models.filament_purchase import FilamentPurchase

logger = logging.getLogger(__name__)


def descontar_stock(purchase: FilamentPurchase, gramos: float) -> None:
    nuevo_restante = purchase.remaining_weight_g - gramos
    if nuevo_restante < 0:
        logger.info(
            "Stock de compra %s quedaría negativo (%.2fg), se ajusta a 0.0",
            purchase.id,
            nuevo_restante,
        )
        nuevo_restante = 0.0
    purchase.remaining_weight_g = nuevo_restante


def devolver_stock(purchase: FilamentPurchase, gramos: float) -> None:
    """Inversa de descontar_stock: repone gramos ya consumidos, p.ej. al reasignar
    los filamentos de una impresión que ya estaba confirmada."""
    purchase.remaining_weight_g += gramos
