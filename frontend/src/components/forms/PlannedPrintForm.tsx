import { useMemo, useState, type FormEvent } from 'react'
import { useCreatePlannedPrint } from '../../api/hooks'
import type { FilamentPurchase, Person } from '../../api/types'
import { formatEur } from '../../utils/format'

interface PlannedPrintFormProps {
  personas: Person[]
  compras: FilamentPurchase[]
  personaPreseleccionada: Person | null
}

type Beneficiario = 'persona' | 'tercero'

export function PlannedPrintForm({
  personas,
  compras,
  personaPreseleccionada,
}: PlannedPrintFormProps) {
  const crearPlanificada = useCreatePlannedPrint()

  const [modelName, setModelName] = useState('')
  const [tipoBeneficiario, setTipoBeneficiario] = useState<Beneficiario>('persona')
  const [personId, setPersonId] = useState<string>(String(personaPreseleccionada?.id ?? ''))
  const [thirdPartyName, setThirdPartyName] = useState('')
  const [filamentPurchaseId, setFilamentPurchaseId] = useState('')
  const [expectedGrams, setExpectedGrams] = useState('')
  const [notas, setNotas] = useState('')

  const compraSeleccionada = compras.find((c) => String(c.id) === filamentPurchaseId)
  const costeEstimado = useMemo(() => {
    if (!compraSeleccionada || !expectedGrams) return null
    const gramos = Number(expectedGrams)
    if (!Number.isFinite(gramos) || compraSeleccionada.spool_weight_g <= 0) return null
    return (compraSeleccionada.price_eur / compraSeleccionada.spool_weight_g) * gramos
  }, [compraSeleccionada, expectedGrams])

  function limpiarFormulario() {
    setModelName('')
    setThirdPartyName('')
    setFilamentPurchaseId('')
    setExpectedGrams('')
    setNotas('')
  }

  function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()

    crearPlanificada.mutate(
      {
        model_name: modelName.trim(),
        person_id: tipoBeneficiario === 'persona' && personId ? Number(personId) : undefined,
        third_party_name: tipoBeneficiario === 'tercero' ? thirdPartyName.trim() : undefined,
        filament_purchase_id: filamentPurchaseId ? Number(filamentPurchaseId) : undefined,
        expected_grams: expectedGrams ? Number(expectedGrams) : undefined,
        notes: notas.trim() || undefined,
      },
      { onSuccess: limpiarFormulario },
    )
  }

  return (
    <form className="card" onSubmit={manejarEnvio}>
      <p className="card-title">Planificar próxima impresión</p>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="pp-modelo">Modelo</label>
          <input
            id="pp-modelo"
            type="text"
            placeholder="Nombre de la pieza"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="pp-beneficiario">Para quién</label>
          <select
            id="pp-beneficiario"
            value={tipoBeneficiario}
            onChange={(e) => setTipoBeneficiario(e.target.value as Beneficiario)}
          >
            <option value="persona">Javi / Nacho</option>
            <option value="tercero">Un tercero (encargo)</option>
          </select>
        </div>
        {tipoBeneficiario === 'persona' ? (
          <div className="form-field">
            <label htmlFor="pp-persona">Persona</label>
            <select
              id="pp-persona"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              required
            >
              <option value="" disabled>
                Selecciona…
              </option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="form-field">
            <label htmlFor="pp-tercero">Nombre del tercero</label>
            <input
              id="pp-tercero"
              type="text"
              value={thirdPartyName}
              onChange={(e) => setThirdPartyName(e.target.value)}
              required
            />
          </div>
        )}
        <div className="form-field">
          <label htmlFor="pp-bobina">Bobina prevista (opcional)</label>
          <select
            id="pp-bobina"
            value={filamentPurchaseId}
            onChange={(e) => setFilamentPurchaseId(e.target.value)}
          >
            <option value="">Sin especificar</option>
            {compras.map((compra) => (
              <option key={compra.id} value={compra.id}>
                {compra.brand} {compra.material} {compra.color} ({compra.remaining_weight_g} g
                restantes)
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="pp-gramos">Gramos previstos (opcional)</label>
          <input
            id="pp-gramos"
            type="number"
            min="0"
            step="1"
            value={expectedGrams}
            onChange={(e) => setExpectedGrams(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pp-notas">Notas (opcional)</label>
          <input
            id="pp-notas"
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
      </div>

      {costeEstimado !== null && (
        <p className="form-hint">Coste estimado: {formatEur(costeEstimado)}</p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={crearPlanificada.isPending}>
          {crearPlanificada.isPending ? 'Guardando…' : 'Añadir a la cola'}
        </button>
      </div>
      {crearPlanificada.isError && (
        <p className="form-error">No se ha podido guardar la planificación. Inténtalo de nuevo.</p>
      )}
    </form>
  )
}
