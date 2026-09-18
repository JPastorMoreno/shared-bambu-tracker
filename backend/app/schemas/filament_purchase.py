from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class FilamentPurchaseCreate(BaseModel):
    purchase_date: date
    brand: str
    material: str
    color: str
    spool_weight_g: float
    price_eur: float
    paid_by_person_id: int
    remaining_pct: float | None = None
    notes: str | None = None


class FilamentPurchaseUpdate(BaseModel):
    purchase_date: date | None = None
    brand: str | None = None
    material: str | None = None
    color: str | None = None
    spool_weight_g: float | None = None
    price_eur: float | None = None
    paid_by_person_id: int | None = None
    remaining_weight_g: float | None = None
    remaining_pct: float | None = None
    notes: str | None = None


class FilamentPurchaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_date: date
    brand: str
    material: str
    color: str
    spool_weight_g: float
    price_eur: float
    paid_by_person_id: int
    remaining_weight_g: float
    remaining_pct: float | None = None
    notes: str | None
    created_at: datetime


class StockItem(BaseModel):
    material: str
    color: str
    remaining_weight_g: float
