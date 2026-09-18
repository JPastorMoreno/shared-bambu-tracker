from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.person import Person


class ProjectWishlistItem(Base):
    """Idea de proyecto/impresión que se quiere hacer algún día, sin bobina asignada
    todavía (a diferencia de PlannedPrint, que ya está en cola para imprimirse)."""

    __tablename__ = "project_wishlist_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("persons.id"), nullable=True)
    third_party_name: Mapped[str | None] = mapped_column(String, nullable=True)
    desired_material: Mapped[str | None] = mapped_column(String, nullable=True)
    desired_color: Mapped[str | None] = mapped_column(String, nullable=True)
    expected_grams: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    person: Mapped["Person | None"] = relationship()
