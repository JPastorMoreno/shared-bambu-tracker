from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FilamentWishlistItemCreate(BaseModel):
    material: str
    color: str
    brand: str | None = None
    desired_grams: float
    estimated_price_eur: float | None = None
    notes: str | None = None


class FilamentWishlistItemUpdate(BaseModel):
    material: str | None = None
    color: str | None = None
    brand: str | None = None
    desired_grams: float | None = None
    estimated_price_eur: float | None = None
    notes: str | None = None


class FilamentWishlistItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    material: str
    color: str
    brand: str | None
    desired_grams: float
    estimated_price_eur: float | None
    notes: str | None
    created_at: datetime
