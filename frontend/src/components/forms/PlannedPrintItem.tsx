import { useState } from 'react'
import { useCompletePlannedPrint, useDeletePlannedPrint } from '../../api/hooks'
import type { Person, PlannedPrint } from '../../api/types'
import { formatEur, formatGramos } from '../../utils/format'

interface PlannedPrintItemProps {
  plannedPrint: PlannedPrint
  personas: Person[]
}

export function PlannedPrintItem({ plannedPrint, personas }: PlannedPrintItemProps) {
  const completar = useCompletePlannedPrint()
  const cancelar = useDeletePlannedPrint()

  const [gramosReales, setGramosReales] = useState(
    plannedPrint.expected_grams !== null ? String(plannedPrint.expected_grams) : '',
  )

  const beneficiario =
    plannedPrint.person_id !== null
      ? personas.find((p) => p.id === plannedPrint.person_id)?.name ?? `#${plannedPrint.person_id}`
      : plannedPrint.third_party_name ?? 'Sin asignar'

  function manejarCompletar() {
    completar.mutate({
      id: plannedPrint.id,
      body: { grams_used: gramosReales ? Number(gramosReales) : undefined },
    })
  }

  function manejarCancelar() {
    if (window.confirm('¿Descartar esta impresión planificada?')) {
      cancelar.mutate(plannedPrint.id)
    }
  }

  return (
    <div className="card print-job-card">
      <div className="print-job-row">
        <div className="print-job-main">
          <div className="print-job-title-row">
            <strong>{plannedPrint.model_name}</strong>
          </div>
          <div className="print-job-meta">
            <span>{beneficiario}</span>
            {plannedPrint.expected_grams !== null && (
              <span>{formatGramos(plannedPrint.expected_grams)} previstos</span>
            )}
            {plannedPrint.expected_cost_eur !== null && (
              <span>{formatEur(plannedPrint.expected_cost_eur)} estimado</span>
            )}
          </div>
          {plannedPrint.notes && <p className="print-job-notes">{plannedPrint.notes}</p>}

          <div className="planned-print-complete">
            <label htmlFor={`pp-gramos-reales-${plannedPrint.id}`}>Gramos reales</label>
            <input
              id={`pp-gramos-reales-${plannedPrint.id}`}
              type="number"
              min="0"
              step="1"
              value={gramosReales}
              onChange={(e) => setGramosReales(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={manejarCompletar}
              disabled={completar.isPending}
            >
              {completar.isPending ? 'Guardando…' : 'Marcar como impresa'}
            </button>
          </div>
          {completar.isError && (
            <p className="form-error">No se ha podido registrar la impresión.</p>
          )}
        </div>
        <button type="button" className="btn btn-danger btn-small" onClick={manejarCancelar}>
          Descartar
        </button>
      </div>
    </div>
  )
}
