from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PrintJobFilamentUsageCreate(BaseModel):
    filament_purchase_id: int
    grams_used: float


class PrintJobFilamentUsageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    filament_purchase_id: int
    grams_used: float
    brand: str | None = None
    material: str | None = None
    color: str | None = None


class PrintJobCreate(BaseModel):
    printed_at: datetime
    model_name: str
    person_id: int | None = None
    third_party_name: str | None = None
    third_party_charge_eur: float | None = None
    filament_usages: list[PrintJobFilamentUsageCreate] = []
    grams_used: float | None = None
    sale_price_eur: float | None = None
    print_duration_min: int | None = None
    thumbnail_url: str | None = None
    notes: str | None = None


class PrintJobUpdate(BaseModel):
    printed_at: datetime | None = None
    model_name: str | None = None
    person_id: int | None = None
    third_party_name: str | None = None
    third_party_charge_eur: float | None = None
    filament_usages: list[PrintJobFilamentUsageCreate] | None = None
    grams_used: float | None = None
    sale_price_eur: float | None = None
    status: str | None = None
    print_duration_min: int | None = None
    thumbnail_url: str | None = None
    notes: str | None = None


class PrintJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    external_task_id: str | None
    printed_at: datetime
    model_name: str
    person_id: int | None
    third_party_name: str | None
    third_party_charge_eur: float | None
    filament_usages: list[PrintJobFilamentUsageRead] = []
    grams_used: float | None
    sale_price_eur: float | None
    status: str
    print_duration_min: int | None
    thumbnail_url: str | None
    notes: str | None
    created_at: datetime
    cost_eur: float | None = None
    profit_eur: float | None = None
