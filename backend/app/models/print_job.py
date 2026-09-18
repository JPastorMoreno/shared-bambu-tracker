from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.person import Person
    from app.models.print_job_filament import PrintJobFilament

SOURCE_MANUAL = "manual"
SOURCE_BAMBU_SYNC = "bambu_sync"

STATUS_PENDING_REVIEW = "pending_review"
STATUS_CONFIRMED = "confirmed"


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String, nullable=False)
    external_task_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    printed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    model_name: Mapped[str] = mapped_column(String, nullable=False)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("persons.id"), nullable=True)
    third_party_name: Mapped[str | None] = mapped_column(String, nullable=True)
    third_party_charge_eur: Mapped[float | None] = mapped_column(Float, nullable=True)
    grams_used: Mapped[float | None] = mapped_column(Float, nullable=True)
    sale_price_eur: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    print_duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    design_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    print_succeeded: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    person: Mapped["Person | None"] = relationship()
    filament_usages: Mapped[list["PrintJobFilament"]] = relationship(
        cascade="all, delete-orphan", order_by="PrintJobFilament.id"
    )
