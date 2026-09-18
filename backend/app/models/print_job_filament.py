from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.filament_purchase import FilamentPurchase


class PrintJobFilament(Base):
    """Línea de uso de una bobina concreta dentro de una impresión (una impresión
    puede usar varios filamentos, p.ej. multicolor con AMS)."""

    __tablename__ = "print_job_filaments"

    id: Mapped[int] = mapped_column(primary_key=True)
    print_job_id: Mapped[int] = mapped_column(
        ForeignKey("print_jobs.id", ondelete="CASCADE"), nullable=False
    )
    filament_purchase_id: Mapped[int] = mapped_column(
        ForeignKey("filament_purchases.id"), nullable=False
    )
    grams_used: Mapped[float] = mapped_column(Float, nullable=False)

    filament_purchase: Mapped["FilamentPurchase"] = relationship()
