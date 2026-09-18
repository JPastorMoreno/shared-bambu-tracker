import { useState, type FormEvent } from 'react'
import { useCreateProjectWishlistItem } from '../../api/hooks'
import type { Person } from '../../api/types'

interface ProjectWishlistFormProps {
  personas: Person[]
  personaPreseleccionada: Person | null
}

type Beneficiario = 'persona' | 'tercero'

export function ProjectWishlistForm({ personas, personaPreseleccionada }: ProjectWishlistFormProps) {
  const crear = useCreateProjectWishlistItem()

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
