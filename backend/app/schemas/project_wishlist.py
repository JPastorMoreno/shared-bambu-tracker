from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectWishlistItemCreate(BaseModel):
    name: str
    person_id: int | None = None
    third_party_name: str | None = None
    desired_material: str | None = None
    desired_color: str | None = None
    expected_grams: float | None = None
    notes: str | None = None


class ProjectWishlistItemUpdate(BaseModel):
    name: str | None = None
    person_id: int | None = None
    third_party_name: str | None = None
    desired_material: str | None = None
    desired_color: str | None = None
    expected_grams: float | None = None
    notes: str | None = None


class ProjectWishlistItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    person_id: int | None
    third_party_name: str | None
    desired_material: str | None
    desired_color: str | None
    expected_grams: float | None
    notes: str | None
    created_at: datetime
