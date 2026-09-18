import { useState, type FormEvent } from 'react'
import { useCreateProjectWishlistItem, useEstimateDesign } from '../../api/hooks'
import type { DesignInstanceEstimate, Person } from '../../api/types'
import { formatGramos } from '../../utils/format'

interface ProjectWishlistFormProps {
  personas: Person[]
  personaPreseleccionada: Person | null
}

type Beneficiario = 'persona' | 'tercero'

export function ProjectWishlistForm({ personas, personaPreseleccionada }: ProjectWishlistFormProps) {
  const crear = useCreateProjectWishlistItem()
  const estimar = useEstimateDesign()

  const [enlace, setEnlace] = useState('')
  const [name, setName] = useState('')
  const [tipoBeneficiario, setTipoBeneficiario] = useState<Beneficiario>('persona')
  const [personId, setPersonId] = useState<string>(String(personaPreseleccionada?.id ?? ''))
  const [thirdPartyName, setThirdPartyName] = useState('')
  const [desiredMaterial, setDesiredMaterial] = useState('')
  const [desiredColor, setDesiredColor] = useState('')
  const [expectedGrams, setExpectedGrams] = useState('')
  const [notas, setNotas] = useState('')

  function limpiarFormulario() {
    setName('')
    setThirdPartyName('')
    setDesiredMaterial('')
    setDesiredColor('')
    setExpectedGrams('')
    setNotas('')
  }

  function manejarEstimar(evento: FormEvent) {
    evento.preventDefault()
    if (enlace.trim()) estimar.mutate({ url: enlace.trim() })
  }

  function usarInstancia(instancia: DesignInstanceEstimate) {
    const principal = [...instancia.filaments].sort((a, b) => b.grams - a.grams)[0]
    if (!name && estimar.data) setName(estimar.data.title)
    if (principal) {
      setDesiredMaterial(principal.type)
      setDesiredColor(principal.color_hex ?? '')
    }
    setExpectedGrams(String(instancia.total_grams))

    const detalleFilamentos = instancia.filaments
      .map((f) => `${f.type} ${f.color_hex ?? ''} (${f.grams} g)`.trim())
      .join(', ')
    const detalleTiempo = instancia.estimated_print_minutes
      ? ` · ~${instancia.estimated_print_minutes} min`
      : ''
    setNotas(`MakerWorld — ${instancia.title}: ${detalleFilamentos}${detalleTiempo}`)
  }

  function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    crear.mutate(
      {
        name: name.trim(),
        person_id: tipoBeneficiario === 'persona' && personId ? Number(personId) : undefined,
        third_party_name: tipoBeneficiario === 'tercero' ? thirdPartyName.trim() : undefined,
        desired_material: desiredMaterial.trim() || undefined,
        desired_color: desiredColor.trim() || undefined,
        expected_grams: expectedGrams ? Number(expectedGrams) : undefined,
        notes: notas.trim() || undefined,
      },
      { onSuccess: limpiarFormulario },
    )
  }

  return (
    <form className="card" onSubmit={manejarEnvio}>
      <p className="card-title">Añadir idea de proyecto</p>

      <div className="paste-order">
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="pw-enlace">Enlace de MakerWorld (opcional)</label>
            <input
              id="pw-enlace"
              type="url"
              placeholder="https://makerworld.com/es/models/…"
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="btn"
            onClick={manejarEstimar}
            disabled={!enlace.trim() || estimar.isPending}
          >
            {estimar.isPending ? 'Consultando…' : 'Estimar consumo y tiempo'}
          </button>
        </div>
        {estimar.isError && (
          <p className="form-error">
            {estimar.error instanceof Error
              ? estimar.error.message
              : 'No se ha podido consultar ese enlace.'}
          </p>
        )}
        {estimar.data && estimar.data.instances.length === 0 && (
          <p className="form-hint">
            Ese modelo no tiene ningún perfil de impresión publicado con datos de consumo;
            rellena el formulario a mano.
          </p>
        )}
        {estimar.data && estimar.data.instances.length > 0 && (
          <ul className="paste-order-candidates">
            {estimar.data.instances.map((instancia) => (
              <li key={instancia.id}>
                <div>
                  <strong>{instancia.title}</strong>
                  <span className="form-hint">
                    {formatGramos(instancia.total_grams)}
                    {instancia.estimated_print_minutes && ` · ~${instancia.estimated_print_minutes} min`}
                    {' · '}
                    {instancia.filaments.map((f) => f.type).join(' + ') || 'sin filamento detectado'}
                  </span>
                </div>
                <button type="button" className="btn btn-small" onClick={() => usarInstancia(instancia)}>
                  Usar estos datos
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="pw-nombre">Proyecto</label>
          <input
            id="pw-nombre"
            type="text"
            placeholder="Qué te gustaría imprimir"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="pw-beneficiario">Para quién</label>
          <select
            id="pw-beneficiario"
            value={tipoBeneficiario}
            onChange={(e) => setTipoBeneficiario(e.target.value as Beneficiario)}
          >
            <option value="persona">Javi / Nacho</option>
            <option value="tercero">Un tercero (encargo)</option>
          </select>
        </div>
        {tipoBeneficiario === 'persona' ? (
          <div className="form-field">
            <label htmlFor="pw-persona">Persona</label>
            <select
              id="pw-persona"
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
            <label htmlFor="pw-tercero">Nombre del tercero</label>
            <input
              id="pw-tercero"
              type="text"
              value={thirdPartyName}
              onChange={(e) => setThirdPartyName(e.target.value)}
              required
            />
          </div>
        )}
        <div className="form-field">
          <label htmlFor="pw-material">Material previsto (opcional)</label>
          <input
            id="pw-material"
            type="text"
            placeholder="PLA, PETG…"
            value={desiredMaterial}
            onChange={(e) => setDesiredMaterial(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pw-color">Color previsto (opcional)</label>
          <input
            id="pw-color"
            type="text"
            value={desiredColor}
            onChange={(e) => setDesiredColor(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pw-gramos">Gramos previstos (opcional)</label>
          <input
            id="pw-gramos"
            type="number"
            min="0"
            step="1"
            value={expectedGrams}
            onChange={(e) => setExpectedGrams(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pw-notas">Notas (opcional)</label>
          <input id="pw-notas" type="text" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
      </div>
      <p className="form-hint">
        Si no defines material y color todavía, el proyecto no se contará en la proyección de
        inventario hasta que los indiques.
      </p>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando…' : 'Añadir idea'}
        </button>
      </div>
      {crear.isError && <p className="form-error">No se ha podido guardar. Inténtalo de nuevo.</p>}
    </form>
  )
}
