from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.person import Person


class FilamentPurchase(Base):
    __tablename__ = "filament_purchases"

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    brand: Mapped[str] = mapped_column(String, nullable=False)
    material: Mapped[str] = mapped_column(String, nullable=False)
    color: Mapped[str] = mapped_column(String, nullable=False)
    spool_weight_g: Mapped[float] = mapped_column(Float, nullable=False)
    price_eur: Mapped[float] = mapped_column(Float, nullable=False)
    paid_by_person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), nullable=False)
    remaining_weight_g: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    paid_by_person: Mapped["Person"] = relationship()

    @property
    def remaining_pct(self) -> float | None:
        if not self.spool_weight_g:
            return None
        return round(self.remaining_weight_g / self.spool_weight_g * 100, 1)
