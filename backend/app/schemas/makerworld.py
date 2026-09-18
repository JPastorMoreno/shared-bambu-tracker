from pydantic import BaseModel


class DesignEstimateRequest(BaseModel):
    url: str


class DesignFilamentEstimate(BaseModel):
    type: str
    color_hex: str | None
    grams: float


class DesignInstanceEstimate(BaseModel):
    id: int
    title: str
    is_default: bool
    total_grams: float
    estimated_print_minutes: int | None
    filaments: list[DesignFilamentEstimate]


class DesignEstimateResponse(BaseModel):
    title: str
    cover_url: str | None
    instances: list[DesignInstanceEstimate]
