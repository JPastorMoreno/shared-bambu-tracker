import { useState, type FormEvent } from 'react'
import { useCreateFilamentWishlistItem } from '../../api/hooks'

export function FilamentWishlistForm() {
  const crear = useCreateFilamentWishlistItem()

  const [material, setMaterial] = useState('')
  const [color, setColor] = useState('')
  const [marca, setMarca] = useState('')
  const [gramos, setGramos] = useState('1000')
  const [precio, setPrecio] = useState('')
  const [notas, setNotas] = useState('')

  function limpiarFormulario() {
    setMaterial('')
    setColor('')
    setMarca('')
    setGramos('1000')
    setPrecio('')
    setNotas('')
  }

  function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    crear.mutate(
      {
        material: material.trim(),
        color: color.trim(),
        brand: marca.trim() || undefined,
        desired_grams: Number(gramos),
        estimated_price_eur: precio ? Number(precio) : undefined,
        notes: notas.trim() || undefined,
      },
      { onSuccess: limpiarFormulario },
    )
  }

  return (
    <form className="card" onSubmit={manejarEnvio}>
      <p className="card-title">Añadir filamento a la lista de la compra</p>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="fw-material">Material</label>
          <input
            id="fw-material"
            type="text"
            placeholder="PLA, PETG, ABS…"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="fw-color">Color</label>
          <input
            id="fw-color"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="fw-marca">Marca (opcional)</label>
          <input id="fw-marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="fw-gramos">Gramos deseados</label>
          <input
            id="fw-gramos"
            type="number"
            min="0"
            step="1"
            value={gramos}
            onChange={(e) => setGramos(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="fw-precio">Precio estimado (€, opcional)</label>
          <input
            id="fw-precio"
            type="number"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="fw-notas">Notas (opcional)</label>
          <input id="fw-notas" type="text" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando…' : 'Añadir a la lista'}
        </button>
      </div>
      {crear.isError && <p className="form-error">No se ha podido guardar. Inténtalo de nuevo.</p>}
    </form>
  )
}
