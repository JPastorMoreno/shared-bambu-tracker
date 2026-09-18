import { useState, type FormEvent } from 'react'
import { useCreatePurchase } from '../../api/hooks'
import type { Person } from '../../api/types'
import { detectarLineasPedido, type CandidatoCompra } from '../../utils/orderParser'
import { formatEur, formatGramos } from '../../utils/format'

interface PurchaseFormProps {
  personas: Person[]
  personaPreseleccionada: Person | null
}

const HOY = new Date().toISOString().slice(0, 10)

export function PurchaseForm({ personas, personaPreseleccionada }: PurchaseFormProps) {
  const crearCompra = useCreatePurchase()

  const [fecha, setFecha] = useState(HOY)
  const [marca, setMarca] = useState('')
  const [material, setMaterial] = useState('PLA')
  const [color, setColor] = useState('')
  const [pesoBobina, setPesoBobina] = useState('1000')
  const [precio, setPrecio] = useState('')
  const [pctRestante, setPctRestante] = useState('100')
  const [pagadoPor, setPagadoPor] = useState<string>(String(personaPreseleccionada?.id ?? ''))
  const [notas, setNotas] = useState('')

  const [mostrarPegado, setMostrarPegado] = useState(false)
  const [textoPedido, setTextoPedido] = useState('')
  const [candidatos, setCandidatos] = useState<CandidatoCompra[] | null>(null)

  function manejarDetectar() {
    setCandidatos(detectarLineasPedido(textoPedido))
  }

  function usarCandidato(candidato: CandidatoCompra) {
    if (!marca) setMarca('Bambu Lab')
    setMaterial(candidato.material)
    setColor(candidato.color || '')
    if (candidato.spool_weight_g !== null) setPesoBobina(String(candidato.spool_weight_g))
    if (candidato.price_eur !== null) setPrecio(String(candidato.price_eur))
    if (candidato.purchase_date) setFecha(candidato.purchase_date)
  }

  function limpiarFormulario() {
    setMarca('')
    setColor('')
    setPesoBobina('1000')
    setPrecio('')
    setPctRestante('100')
    setNotas('')
  }

  function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    if (!pagadoPor) return

    crearCompra.mutate(
      {
        purchase_date: fecha,
        brand: marca.trim(),
        material: material.trim(),
        color: color.trim(),
        spool_weight_g: Number(pesoBobina),
        price_eur: Number(precio),
        paid_by_person_id: Number(pagadoPor),
        remaining_pct: pctRestante ? Number(pctRestante) : undefined,
        notes: notas.trim() || undefined,
      },
      { onSuccess: limpiarFormulario },
    )
  }

  return (
    <form className="card" onSubmit={manejarEnvio}>
      <p className="card-title">Registrar compra de filamento</p>

      <div className="paste-order">
        <button
          type="button"
          className="btn btn-small"
          onClick={() => setMostrarPegado((v) => !v)}
        >
          {mostrarPegado ? 'Ocultar' : 'Rellenar desde texto del pedido'}
        </button>

        {mostrarPegado && (
          <div className="paste-order-panel">
            <p className="form-hint">
              Pega aquí el texto del email de confirmación del pedido de Bambu Lab. Es una
              detección orientativa (marca/color/precio/peso): revisa siempre los campos antes
              de guardar.
            </p>
            <textarea
              rows={5}
              value={textoPedido}
              onChange={(e) => setTextoPedido(e.target.value)}
              placeholder="Pega aquí el texto del pedido…"
            />
            <div className="form-actions">
              <button
                type="button"
                className="btn"
                onClick={manejarDetectar}
                disabled={!textoPedido.trim()}
              >
                Detectar datos
              </button>
            </div>

            {candidatos !== null && candidatos.length === 0 && (
              <p className="form-hint">
                No se ha detectado ninguna línea de filamento reconocible; rellena el formulario
                a mano.
              </p>
            )}

            {candidatos !== null && candidatos.length > 0 && (
              <ul className="paste-order-candidates">
                {candidatos.map((candidato, indice) => (
                  <li key={indice}>
                    <div>
                      <strong>
                        {candidato.material}
                        {candidato.color ? ` — ${candidato.color}` : ''}
                      </strong>
                      <span className="form-hint">
                        {candidato.spool_weight_g !== null
                          ? formatGramos(candidato.spool_weight_g)
                          : 'peso no detectado'}
                        {' · '}
                        {candidato.price_eur !== null
                          ? formatEur(candidato.price_eur)
                          : 'precio no detectado'}
                      </span>
                    </div>
                    <button type="button" className="btn btn-small" onClick={() => usarCandidato(candidato)}>
                      Usar estos datos
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="compra-fecha">Fecha</label>
          <input
            id="compra-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="compra-marca">Marca</label>
          <input
            id="compra-marca"
            type="text"
            placeholder="Bambu Lab, Sunlu…"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="compra-material">Material</label>
          <input
            id="compra-material"
            type="text"
            placeholder="PLA, PETG, ABS…"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="compra-color">Color</label>
          <input
            id="compra-color"
            type="text"
            placeholder="Negro, blanco…"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="compra-peso">Peso bobina (g)</label>
          <input
            id="compra-peso"
            type="number"
            min="0"
            step="1"
            value={pesoBobina}
            onChange={(e) => setPesoBobina(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="compra-precio">Precio (€)</label>
          <input
            id="compra-precio"
            type="number"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="compra-pct-restante">% restante inicial</label>
          <input
            id="compra-pct-restante"
            type="number"
            min="0"
            max="100"
            step="1"
            value={pctRestante}
            onChange={(e) => setPctRestante(e.target.value)}
          />
          <span className="form-hint">100% si es una bobina nueva sin estrenar.</span>
        </div>
        <div className="form-field">
          <label htmlFor="compra-pagador">Quién pagó</label>
          <select
            id="compra-pagador"
            value={pagadoPor}
            onChange={(e) => setPagadoPor(e.target.value)}
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
        <div className="form-field">
          <label htmlFor="compra-notas">Notas (opcional)</label>
          <input
            id="compra-notas"
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={crearCompra.isPending}>
          {crearCompra.isPending ? 'Guardando…' : 'Registrar compra'}
        </button>
      </div>
      {crearCompra.isError && (
        <p className="form-error">No se ha podido registrar la compra. Inténtalo de nuevo.</p>
      )}
    </form>
  )
}
