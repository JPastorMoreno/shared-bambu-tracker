import { useState, type FormEvent } from 'react'
import { useCreatePrintJob } from '../../api/hooks'
import type { FilamentPurchase, Person, PrintJobFilamentUsageInput } from '../../api/types'
import { FilamentUsageFields } from './FilamentUsageFields'

interface PrintJobFormProps {
  personas: Person[]
  compras: FilamentPurchase[]
  personaPreseleccionada: Person | null
}

function ahoraParaInputDatetime(): string {
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
  return ahora.toISOString().slice(0, 16)
}

type Beneficiario = 'persona' | 'tercero'

export function PrintJobForm({ personas, compras, personaPreseleccionada }: PrintJobFormProps) {
  const crearImpresion = useCreatePrintJob()

  const [printedAt, setPrintedAt] = useState(ahoraParaInputDatetime())
  const [modelName, setModelName] = useState('')
  const [tipoBeneficiario, setTipoBeneficiario] = useState<Beneficiario>('persona')
  const [personId, setPersonId] = useState<string>(String(personaPreseleccionada?.id ?? ''))
  const [thirdPartyName, setThirdPartyName] = useState('')
  const [thirdPartyCharge, setThirdPartyCharge] = useState('')
  const [filamentUsages, setFilamentUsages] = useState<PrintJobFilamentUsageInput[]>([])
  const [salePrice, setSalePrice] = useState('')
  const [duracion, setDuracion] = useState('')
  const [notas, setNotas] = useState('')

  function limpiarFormulario() {
    setModelName('')
    setThirdPartyName('')
    setThirdPartyCharge('')
    setFilamentUsages([])
    setSalePrice('')
    setDuracion('')
    setNotas('')
    setPrintedAt(ahoraParaInputDatetime())
  }

  function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()

    const usosValidos = filamentUsages.filter(
      (uso) => uso.filament_purchase_id > 0 && uso.grams_used > 0,
    )

    crearImpresion.mutate(
      {
        printed_at: new Date(printedAt).toISOString(),
        model_name: modelName.trim(),
        person_id: tipoBeneficiario === 'persona' && personId ? Number(personId) : undefined,
        third_party_name: tipoBeneficiario === 'tercero' ? thirdPartyName.trim() : undefined,
        third_party_charge_eur:
          tipoBeneficiario === 'tercero' && thirdPartyCharge ? Number(thirdPartyCharge) : undefined,
        filament_usages: usosValidos.length > 0 ? usosValidos : undefined,
        sale_price_eur: salePrice ? Number(salePrice) : undefined,
        print_duration_min: duracion ? Number(duracion) : undefined,
        notes: notas.trim() || undefined,
      },
      { onSuccess: limpiarFormulario },
    )
  }

  return (
    <form className="card" onSubmit={manejarEnvio}>
      <p className="card-title">Registrar impresión manual</p>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="pj-fecha">Fecha y hora</label>
          <input
            id="pj-fecha"
            type="datetime-local"
            value={printedAt}
            onChange={(e) => setPrintedAt(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="pj-modelo">Modelo</label>
          <input
            id="pj-modelo"
            type="text"
            placeholder="Nombre de la pieza"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="pj-beneficiario">Para quién</label>
          <select
            id="pj-beneficiario"
            value={tipoBeneficiario}
            onChange={(e) => setTipoBeneficiario(e.target.value as Beneficiario)}
          >
            <option value="persona">Javi / Nacho</option>
            <option value="tercero">Un tercero (encargo)</option>
          </select>
        </div>
        {tipoBeneficiario === 'persona' ? (
          <div className="form-field">
            <label htmlFor="pj-persona">Persona</label>
            <select
              id="pj-persona"
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
          <>
            <div className="form-field">
              <label htmlFor="pj-tercero">Nombre del tercero</label>
              <input
                id="pj-tercero"
                type="text"
                value={thirdPartyName}
                onChange={(e) => setThirdPartyName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="pj-cobro">Cobro (€, opcional)</label>
              <input
                id="pj-cobro"
                type="number"
                min="0"
                step="0.01"
                value={thirdPartyCharge}
                onChange={(e) => setThirdPartyCharge(e.target.value)}
              />
            </div>
          </>
        )}
        <FilamentUsageFields
          compras={compras}
          value={filamentUsages}
          onChange={setFilamentUsages}
          idPrefix="pj-nueva"
        />
        <div className="form-field">
          <label htmlFor="pj-venta">Precio de venta (€, opcional)</label>
          <input
            id="pj-venta"
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pj-duracion">Duración (min, opcional)</label>
          <input
            id="pj-duracion"
            type="number"
            min="0"
            step="1"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pj-notas">Notas (opcional)</label>
          <input
            id="pj-notas"
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={crearImpresion.isPending}>
          {crearImpresion.isPending ? 'Guardando…' : 'Registrar impresión'}
        </button>
      </div>
      {crearImpresion.isError && (
        <p className="form-error">No se ha podido registrar la impresión. Inténtalo de nuevo.</p>
      )}
    </form>
  )
}
