import csv
import io

from app.services import costing


def compras_a_csv(purchases) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "fecha",
            "marca",
            "material",
            "color",
            "peso_bobina_g",
            "precio_eur",
            "pagado_por",
            "restante_g",
            "notas",
        ]
    )
    for p in purchases:
        writer.writerow(
            [
                p.id,
                p.purchase_date,
                p.brand,
                p.material,
                p.color,
                p.spool_weight_g,
                p.price_eur,
                p.paid_by_person.name,
                p.remaining_weight_g,
                p.notes or "",
            ]
        )
    return buffer.getvalue()


def print_jobs_a_csv(print_jobs) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "fecha",
            "modelo",
            "persona",
            "material",
            "color",
            "gramos",
            "coste_eur",
            "precio_venta_eur",
            "beneficio_eur",
            "estado",
            "origen",
            "notas",
        ]
    )
    for j in print_jobs:
        persona = j.person.name if j.person is not None else (j.third_party_name or "Tercero")
        material = "+".join(
            {u.filament_purchase.material for u in j.filament_usages if u.filament_purchase}
        )
        color = "+".join(
            {u.filament_purchase.color for u in j.filament_usages if u.filament_purchase}
        )
        coste = costing.calcular_coste_print_job(j.filament_usages)
        beneficio = (
            round(j.sale_price_eur - coste, 2) if j.sale_price_eur is not None and coste is not None else None
        )
        writer.writerow(
            [
                j.id,
                j.printed_at,
                j.model_name,
                persona,
                material,
                color,
                j.grams_used if j.grams_used is not None else "",
                coste if coste is not None else "",
                j.sale_price_eur if j.sale_price_eur is not None else "",
                beneficio if beneficio is not None else "",
                j.status,
                j.source,
                j.notes or "",
            ]
        )
    return buffer.getvalue()
