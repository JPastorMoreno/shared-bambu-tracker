import type { FilamentPurchase, PrintJobFilamentUsageInput } from '../../api/types'
import { formatGramos } from '../../utils/format'

interface FilamentUsageFieldsProps {
  compras: FilamentPurchase[]
  value: PrintJobFilamentUsageInput[]
  onChange: (value: PrintJobFilamentUsageInput[]) => void
  idPrefix: string
}

/**
 * Lista editable de líneas {bobina, gramos} para una impresión: puede usar una
 * bobina o varias (p.ej. piezas multicolor con AMS), y de aquí sale el coste.
 */
export function FilamentUsageFields({ compras, value, onChange, idPrefix }: FilamentUsageFieldsProps) {
  function actualizarFila(indice: number, cambios: Partial<PrintJobFilamentUsageInput>) {
    onChange(value.map((fila, i) => (i === indice ? { ...fila, ...cambios } : fila)))
  }

  function añadirFila() {
    onChange([...value, { filament_purchase_id: 0, grams_used: 0 }])
  }

  function quitarFila(indice: number) {
    onChange(value.filter((_, i) => i !== indice))
  }

  return (
    <div className="filament-usage-fields">
      <label>Filamento(s) usado(s)</label>
      {value.length === 0 && <p className="form-hint">Sin filamento asignado todavía.</p>}
      {value.map((fila, indice) => (
        <div className="filament-usage-row" key={indice}>
          <select
            id={`${idPrefix}-bobina-${indice}`}
            value={fila.filament_purchase_id || ''}
            onChange={(e) => actualizarFila(indice, { filament_purchase_id: Number(e.target.value) })}
          >
            <option value="" disabled>
              Selecciona bobina…
            </option>
            {compras.map((compra) => (
              <option key={compra.id} value={compra.id}>
                {compra.brand} {compra.material} {compra.color} ({formatGramos(compra.remaining_weight_g)}{' '}
                restantes)
              </option>
            ))}
          </select>
          <input
            id={`${idPrefix}-gramos-${indice}`}
            type="number"
            min="0"
            step="1"
            placeholder="Gramos"
            value={fila.grams_used || ''}
            onChange={(e) => actualizarFila(indice, { grams_used: Number(e.target.value) })}
          />
          <button
            type="button"
            className="btn btn-danger btn-small"
            onClick={() => quitarFila(indice)}
          >
            Quitar
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-small" onClick={añadirFila}>
        + Añadir filamento
      </button>
    </div>
  )
}
