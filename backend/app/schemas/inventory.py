from pydantic import BaseModel


class InventoryProjectionRow(BaseModel):
    material: str
    color: str
    current_stock_g: float
    incoming_wishlist_g: float
    reserved_by_projects_g: float
    projected_balance_g: float
    deficit_g: float


class InventoryProjection(BaseModel):
    rows: list[InventoryProjectionRow]
    total_wishlist_cost_eur: float
    total_deficit_g: float
    projects_without_material: int
