from pydantic import BaseModel


class UsageByPerson(BaseModel):
    person: str
    grams: float
    pct: float


class UsageByMaterial(BaseModel):
    material: str
    grams: float


class StockBajo(BaseModel):
    material: str
    color: str
    remaining_weight_g: float


class Balance(BaseModel):
    total_spent_eur: float
    coste_neto_eur: float
    saldo_javi_eur: float
    saldo_nacho_eur: float
    quien_debe: str
    cuanto_eur: float


class StatsSummary(BaseModel):
    total_spent_eur: float
    total_grams_purchased: float
    total_grams_used: float
    remaining_grams: float
    balance: Balance
    usage_by_person: list[UsageByPerson]
    usage_by_material: list[UsageByMaterial]
    low_stock: list[StockBajo]
