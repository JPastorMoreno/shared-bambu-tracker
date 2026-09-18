from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PlannedPrintCreate(BaseModel):
    model_name: str
    person_id: int | None = None
    third_party_name: str | None = None
    filament_purchase_id: int | None = None
    expected_grams: float | None = None
    notes: str | None = None


class PlannedPrintUpdate(BaseModel):
    model_name: str | None = None
    person_id: int | None = None
    third_party_name: str | None = None
    filament_purchase_id: int | None = None
    expected_grams: float | None = None
    notes: str | None = None


class PlannedPrintRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    model_name: str
    person_id: int | None
    third_party_name: str | None
    filament_purchase_id: int | None
    expected_grams: float | None
    notes: str | None
    created_at: datetime
    expected_cost_eur: float | None = None


class PlannedPrintComplete(BaseModel):
    grams_used: float | None = None
    printed_at: datetime | None = None
