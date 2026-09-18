import { useState, type FormEvent } from 'react'
import { usePatchPrintJob } from '../../api/hooks'
import type { FilamentPurchase, Person, PrintJob, PrintJobFilamentUsageInput } from '../../api/types'
import { FilamentUsageFields } from './FilamentUsageFields'

interface PrintJobReviewFormProps {
  printJob: PrintJob
  personas: Person[]
  compras: FilamentPurchase[]
}

type Beneficiario = 'persona' | 'tercero'

/**
 * Formulario inline para revisar una impresión traída de Bambu Cloud
 * (source: 'bambu_sync', status: 'pending_review'): hay que asignarle
 * persona o tercero, bobina usada y gramos, y al confirmar el backend
 * la deja en status 'confirmed'.
 */
export function PrintJobReviewForm({ printJob, personas, compras }: PrintJobReviewFormProps) {
  const patchImpresion = usePatchPrintJob()

  const [tipoBeneficiario, setTipoBeneficiario] = useState<Beneficiario>('persona')
  const [personId, setPersonId] = useState<string>('')
  const [thirdPartyName, setThirdPartyName] = useState('')
  const [thirdPartyCharge, setThirdPartyCharge] = useState('')
  const [filamentUsages, setFilamentUsages] = useState<PrintJobFilamentUsageInput[]>(() =>
    printJob.filament_usages.map((uso) => ({
      filament_purchase_id: uso.filament_purchase_id,
      grams_used: uso.grams_used,
    })),
  )
  const [salePrice, setSalePrice] = useState('')

  function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()

    const usosValidos = filamentUsages.filter(
      (uso) => uso.filament_purchase_id > 0 && uso.grams_used > 0,
    )

    patchImpresion.mutate({
      id: printJob.id,
      body: {
        person_id: tipoBeneficiario === 'persona' && personId ? Number(personId) : undefined,
        third_party_name: tipoBeneficiario === 'tercero' ? thirdPartyName.trim() : undefined,
        third_party_charge_eur:
          tipoBeneficiario === 'tercero' && thirdPartyCharge ? Number(thirdPartyCharge) : undefined,
        filament_usages: usosValidos,
        sale_price_eur: salePrice ? Number(salePrice) : undefined,
        status: 'confirmed',
      },
    })
  }

  return (
    <form className="review-form" onSubmit={manejarEnvio}>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor={`rev-beneficiario-${printJob.id}`}>Para quién</label>
          <select
            id={`rev-beneficiario-${printJob.id}`}
            value={tipoBeneficiario}
            onChange={(e) => setTipoBeneficiario(e.target.value as Beneficiario)}
          >
            <option value="persona">Javi / Nacho</option>
            <option value="tercero">Un tercero (encargo)</option>
          </select>
        </div>
        {tipoBeneficiario === 'persona' ? (
          <div className="form-field">
            <label htmlFor={`rev-persona-${printJob.id}`}>Persona</label>
            <select
              id={`rev-persona-${printJob.id}`}
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
              <label htmlFor={`rev-tercero-${printJob.id}`}>Nombre del tercero</label>
              <input
                id={`rev-tercero-${printJob.id}`}
                type="text"
                value={thirdPartyName}
                onChange={(e) => setThirdPartyName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor={`rev-cobro-${printJob.id}`}>Cobro (€, opcional)</label>
              <input
                id={`rev-cobro-${printJob.id}`}
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
          idPrefix={`rev-${printJob.id}`}
        />
        <div className="form-field">
          <label htmlFor={`rev-venta-${printJob.id}`}>Precio de venta (€, opcional)</label>
          <input
            id={`rev-venta-${printJob.id}`}
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-small" disabled={patchImpresion.isPending}>
          {patchImpresion.isPending ? 'Confirmando…' : 'Confirmar'}
        </button>
      </div>
      {patchImpresion.isError && (
        <p className="form-error">No se ha podido confirmar la impresión.</p>
      )}
    </form>
  )
}
