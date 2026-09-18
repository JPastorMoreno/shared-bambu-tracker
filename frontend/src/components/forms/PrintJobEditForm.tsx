import { useState, type FormEvent } from 'react'
import { usePatchPrintJob } from '../../api/hooks'
import type { FilamentPurchase, Person, PrintJob, PrintJobFilamentUsageInput } from '../../api/types'
import { FilamentUsageFields } from './FilamentUsageFields'

interface PrintJobEditFormProps {
  printJob: PrintJob
  personas: Person[]
  compras: FilamentPurchase[]
  onCancelar: () => void
}

type Beneficiario = 'persona' | 'tercero'

function aInputDatetime(iso: string): string {
  const fecha = new Date(iso)
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset())
  return fecha.toISOString().slice(0, 16)
}

/** Formulario para corregir cualquier campo de una impresión ya guardada (manual o
 * confirmada desde Bambu Cloud): fecha, modelo, beneficiario, filamentos, precio… */
export function PrintJobEditForm({ printJob, personas, compras, onCancelar }: PrintJobEditFormProps) {
  const patchImpresion = usePatchPrintJob()

  const [printedAt, setPrintedAt] = useState(aInputDatetime(printJob.printed_at))
  const [modelName, setModelName] = useState(printJob.model_name)
  const [tipoBeneficiario, setTipoBeneficiario] = useState<Beneficiario>(
    printJob.third_party_name ? 'tercero' : 'persona',
  )
  const [personId, setPersonId] = useState<string>(
    printJob.person_id !== null ? String(printJob.person_id) : '',
  )
  const [thirdPartyName, setThirdPartyName] = useState(printJob.third_party_name ?? '')
  const [thirdPartyCharge, setThirdPartyCharge] = useState(
    printJob.third_party_charge_eur !== null ? String(printJob.third_party_charge_eur) : '',
  )
  const [filamentUsages, setFilamentUsages] = useState<PrintJobFilamentUsageInput[]>(
    printJob.filament_usages.map((uso) => ({
      filament_purchase_id: uso.filament_purchase_id,
      grams_used: uso.grams_used,
    })),
  )
  const [salePrice, setSalePrice] = useState(
    printJob.sale_price_eur !== null ? String(printJob.sale_price_eur) : '',
  )
  const [duracion, setDuracion] = useState(
    printJob.print_duration_min !== null ? String(printJob.print_duration_min) : '',
  )
  const [notas, setNotas] = useState(printJob.notes ?? '')

  function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()

    const usosValidos = filamentUsages.filter(
      (uso) => uso.filament_purchase_id > 0 && uso.grams_used > 0,
    )

    patchImpresion.mutate(
      {
        id: printJob.id,
        body: {
          printed_at: new Date(printedAt).toISOString(),
          model_name: modelName.trim(),
          person_id: tipoBeneficiario === 'persona' && personId ? Number(personId) : undefined,
          third_party_name: tipoBeneficiario === 'tercero' ? thirdPartyName.trim() : undefined,
          third_party_charge_eur:
            tipoBeneficiario === 'tercero' && thirdPartyCharge ? Number(thirdPartyCharge) : undefined,
          filament_usages: usosValidos,
          sale_price_eur: salePrice ? Number(salePrice) : undefined,
          print_duration_min: duracion ? Number(duracion) : undefined,
          notes: notas.trim() || undefined,
        },
      },
      { onSuccess: onCancelar },
    )
  }

  return (
    <form className="review-form" onSubmit={manejarEnvio}>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor={`edit-fecha-${printJob.id}`}>Fecha y hora</label>
          <input
            id={`edit-fecha-${printJob.id}`}
            type="datetime-local"
            value={printedAt}
            onChange={(e) => setPrintedAt(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor={`edit-modelo-${printJob.id}`}>Modelo</label>
          <input
            id={`edit-modelo-${printJob.id}`}
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor={`edit-beneficiario-${printJob.id}`}>Para quién</label>
          <select
            id={`edit-beneficiario-${printJob.id}`}
            value={tipoBeneficiario}
            onChange={(e) => setTipoBeneficiario(e.target.value as Beneficiario)}
          >
            <option value="persona">Javi / Nacho</option>
            <option value="tercero">Un tercero (encargo)</option>
          </select>
        </div>
        {tipoBeneficiario === 'persona' ? (
          <div className="form-field">
            <label htmlFor={`edit-persona-${printJob.id}`}>Persona</label>
            <select
              id={`edit-persona-${printJob.id}`}
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
              <label htmlFor={`edit-tercero-${printJob.id}`}>Nombre del tercero</label>
              <input
                id={`edit-tercero-${printJob.id}`}
                type="text"
                value={thirdPartyName}
                onChange={(e) => setThirdPartyName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor={`edit-cobro-${printJob.id}`}>Cobro (€, opcional)</label>
              <input
                id={`edit-cobro-${printJob.id}`}
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
          idPrefix={`edit-${printJob.id}`}
        />
        <div className="form-field">
          <label htmlFor={`edit-venta-${printJob.id}`}>Precio de venta (€, opcional)</label>
          <input
            id={`edit-venta-${printJob.id}`}
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`edit-duracion-${printJob.id}`}>Duración (min, opcional)</label>
          <input
            id={`edit-duracion-${printJob.id}`}
            type="number"
            min="0"
            step="1"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`edit-notas-${printJob.id}`}>Notas (opcional)</label>
          <input
            id={`edit-notas-${printJob.id}`}
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-small" disabled={patchImpresion.isPending}>
          {patchImpresion.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" className="btn btn-small" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
      {patchImpresion.isError && (
        <p className="form-error">No se han podido guardar los cambios.</p>
      )}
    </form>
  )
}
