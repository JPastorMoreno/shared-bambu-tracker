import { BASE_URL } from '../api/client'
import { useDeletePurchase, useFilamentPurchases, usePersons, useStock } from '../api/hooks'
import { PurchaseForm } from '../components/forms/PurchaseForm'
import { useCompraEdicion } from '../hooks/useCompraEdicion'
import { useWhoAmI } from '../hooks/useWhoAmI'
import { formatEur, formatFecha, formatGramos } from '../utils/format'

export function Purchases() {
  const { data: personas = [] } = usePersons()
  const { data: compras = [], isLoading, isError } = useFilamentPurchases()
  const { data: stock = [] } = useStock()
  const [quienSoy] = useWhoAmI()
  const eliminarCompra = useDeletePurchase()
  const { editandoId, edicion, setEdicion, empezarEdicion, cancelarEdicion, guardarEdicion, isPending } =
    useCompraEdicion()

  const personaPreseleccionada = personas.find((p) => p.name === quienSoy) ?? null

  function nombrePersona(id: number): string {
    return personas.find((p) => p.id === id)?.name ?? `#${id}`
  }

  function manejarEliminar(id: number) {
    if (window.confirm('¿Seguro que quieres borrar esta compra?')) {
      eliminarCompra.mutate(id)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Compras de filamento</h1>
        <p>Historial de bobinas compradas y quién las pagó.</p>
      </div>

      <PurchaseForm personas={personas} personaPreseleccionada={personaPreseleccionada} />

      <h2 className="section-title">Stock restante</h2>
      <div className="card">
        {stock.length === 0 ? (
          <p className="empty-state">No hay stock registrado todavía.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Color</th>
                  <th className="num">Restante</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => (
                  <tr key={`${item.material}-${item.color}`}>
                    <td>{item.material}</td>
                    <td>{item.color}</td>
                    <td className="num tabular">{formatGramos(item.remaining_weight_g)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section-title-row">
        <h2 className="section-title">Historial de compras</h2>
        <a className="btn btn-small" href={`${BASE_URL}/filament-purchases/export.csv`}>
          Exportar CSV
        </a>
      </div>
      {isLoading && <p className="spinner-text">Cargando compras…</p>}
      {isError && <p className="form-error">No se han podido cargar las compras.</p>}
      {!isLoading && !isError && (
        <div className="card">
          {compras.length === 0 ? (
            <p className="empty-state">Todavía no hay compras registradas.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Marca</th>
                    <th>Material</th>
                    <th>Color</th>
                    <th className="num">Bobina</th>
                    <th className="num">Restante</th>
                    <th className="num">Precio</th>
                    <th>Pagado por</th>
                    <th>Notas</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...compras]
                    .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))
                    .map((compra) =>
                      editandoId === compra.id ? (
                        <tr key={compra.id}>
                          <td>{formatFecha(compra.purchase_date)}</td>
                          <td>{compra.brand}</td>
                          <td>{compra.material}</td>
                          <td>{compra.color}</td>
                          <td className="num">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={edicion.spool_weight_g}
                              onChange={(e) =>
                                setEdicion((v) => ({ ...v, spool_weight_g: e.target.value }))
                              }
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={edicion.remaining_pct}
                              onChange={(e) =>
                                setEdicion((v) => ({ ...v, remaining_pct: e.target.value }))
                              }
                            />
                            %
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={edicion.price_eur}
                              onChange={(e) => setEdicion((v) => ({ ...v, price_eur: e.target.value }))}
                            />
                          </td>
                          <td>{nombrePersona(compra.paid_by_person_id)}</td>
                          <td>{compra.notes ?? '—'}</td>
                          <td className="table-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-small"
                              onClick={() => guardarEdicion(compra.id)}
                              disabled={isPending}
                            >
                              Guardar
                            </button>
                            <button type="button" className="btn btn-small" onClick={cancelarEdicion}>
                              Cancelar
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={compra.id}>
                          <td>{formatFecha(compra.purchase_date)}</td>
                          <td>{compra.brand}</td>
                          <td>{compra.material}</td>
                          <td>{compra.color}</td>
                          <td className="num tabular">{formatGramos(compra.spool_weight_g)}</td>
                          <td className="num tabular">
                            {formatGramos(compra.remaining_weight_g)}
                            {compra.remaining_pct !== null && ` (${compra.remaining_pct}%)`}
                          </td>
                          <td className="num tabular">{formatEur(compra.price_eur)}</td>
                          <td>{nombrePersona(compra.paid_by_person_id)}</td>
                          <td>{compra.notes ?? '—'}</td>
                          <td className="table-actions">
                            <button
                              type="button"
                              className="btn btn-small"
                              onClick={() => empezarEdicion(compra)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-small"
                              onClick={() => manejarEliminar(compra.id)}
                            >
                              Borrar
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
