from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.filament_purchase import FilamentPurchase
    from app.models.person import Person


class PlannedPrint(Base):
    __tablename__ = "planned_prints"

    id: Mapped[int] = mapped_column(primary_key=True)
    model_name: Mapped[str] = mapped_column(String, nullable=False)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("persons.id"), nullable=True)
    third_party_name: Mapped[str | None] = mapped_column(String, nullable=True)
    filament_purchase_id: Mapped[int | None] = mapped_column(
        ForeignKey("filament_purchases.id"), nullable=True
    )
    expected_grams: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    person: Mapped["Person | None"] = relationship()
    filament_purchase: Mapped["FilamentPurchase | None"] = relationship()
