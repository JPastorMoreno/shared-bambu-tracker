import {
  useDeleteFilamentWishlistItem,
  useDeleteProjectWishlistItem,
  useFilamentWishlist,
  useInventoryProjection,
  usePersons,
  useProjectWishlist,
  usePromoteProjectWishlistItem,
} from '../api/hooks'
import { FilamentWishlistForm } from '../components/forms/FilamentWishlistForm'
import { ProjectWishlistForm } from '../components/forms/ProjectWishlistForm'
import { useWhoAmI } from '../hooks/useWhoAmI'
import { formatEur, formatGramos } from '../utils/format'

export function Wishlist() {
  const { data: personas = [] } = usePersons()
  const [quienSoy] = useWhoAmI()
  const personaPreseleccionada = personas.find((p) => p.name === quienSoy) ?? null

  const { data: proyeccion, isLoading: cargandoProyeccion } = useInventoryProjection()

  const { data: filamentosDeseados = [], isLoading: cargandoFilamentos } = useFilamentWishlist()
  const borrarFilamentoDeseado = useDeleteFilamentWishlistItem()

  const { data: proyectosDeseados = [], isLoading: cargandoProyectos } = useProjectWishlist()
  const borrarProyectoDeseado = useDeleteProjectWishlistItem()
  const promocionar = usePromoteProjectWishlistItem()

  function nombrePersona(id: number | null): string {
    if (id === null) return ''
    return personas.find((p) => p.id === id)?.name ?? `#${id}`
  }

  function beneficiario(item: { person_id: number | null; third_party_name: string | null }): string {
    if (item.person_id !== null) return nombrePersona(item.person_id)
    if (item.third_party_name) return item.third_party_name
    return 'Sin asignar'
  }

  return (
    <div>
      <div className="page-header">
        <h1>Deseados</h1>
        <p>
          Filamento que queréis comprar y proyectos que os gustaría imprimir, con la proyección de
          cómo quedaría el stock si compráis y hacéis todo eso.
        </p>
      </div>

      <h2 className="section-title">Proyección de inventario</h2>
      {cargandoProyeccion && <p className="spinner-text">Calculando proyección…</p>}
      {proyeccion && (
        <>
          <div className="stat-grid">
            <div className="card stat-card">
              <p className="stat-card-label">Coste de la lista de la compra</p>
              <p className="stat-card-value">{formatEur(proyeccion.total_wishlist_cost_eur)}</p>
            </div>
            <div className="card stat-card">
              <p className="stat-card-label">Gramos que faltarían por comprar</p>
              <p className="stat-card-value">{formatGramos(proyeccion.total_deficit_g)}</p>
            </div>
            {proyeccion.projects_without_material > 0 && (
              <div className="card stat-card">
                <p className="stat-card-label">Proyectos sin material definido</p>
                <p className="stat-card-value">{proyeccion.projects_without_material}</p>
              </div>
            )}
          </div>

          <div className="card">
            {proyeccion.rows.length === 0 ? (
              <p className="empty-state">
                Añade filamento o proyectos deseados abajo para ver la proyección.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Filamento</th>
                      <th className="num">Stock actual</th>
                      <th className="num">+ Lista de compra</th>
                      <th className="num">− Proyectos deseados</th>
                      <th className="num">= Balance proyectado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proyeccion.rows.map((fila) => (
                      <tr key={`${fila.material}-${fila.color}`}>
                        <td>
                          {fila.material} — {fila.color}
                        </td>
                        <td className="num tabular">{formatGramos(fila.current_stock_g)}</td>
                        <td className="num tabular">{formatGramos(fila.incoming_wishlist_g)}</td>
                        <td className="num tabular">{formatGramos(fila.reserved_by_projects_g)}</td>
                        <td className="num tabular">
                          {formatGramos(fila.projected_balance_g)}{' '}
                          {fila.deficit_g > 0 && (
                            <span className="badge badge-critical">
                              faltan {formatGramos(fila.deficit_g)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <h2 className="section-title">Filamentos deseados</h2>
      <FilamentWishlistForm />
      {cargandoFilamentos && <p className="spinner-text">Cargando…</p>}
      {!cargandoFilamentos && (
        <div className="card">
          {filamentosDeseados.length === 0 ? (
            <p className="empty-state">Todavía no hay filamento en la lista de la compra.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Color</th>
                    <th>Marca</th>
                    <th className="num">Gramos</th>
                    <th className="num">Precio est.</th>
                    <th>Notas</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filamentosDeseados.map((item) => (
                    <tr key={item.id}>
                      <td>{item.material}</td>
                      <td>{item.color}</td>
                      <td>{item.brand ?? '—'}</td>
                      <td className="num tabular">{formatGramos(item.desired_grams)}</td>
                      <td className="num tabular">
                        {item.estimated_price_eur !== null ? formatEur(item.estimated_price_eur) : '—'}
                      </td>
                      <td>{item.notes ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => borrarFilamentoDeseado.mutate(item.id)}
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <h2 className="section-title">Proyectos deseados</h2>
      <ProjectWishlistForm personas={personas} personaPreseleccionada={personaPreseleccionada} />
      {cargandoProyectos && <p className="spinner-text">Cargando…</p>}
      {!cargandoProyectos && (
        <div className="card">
          {proyectosDeseados.length === 0 ? (
            <p className="empty-state">Todavía no hay proyectos en la lista de deseados.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Para quién</th>
                    <th>Material</th>
                    <th>Color</th>
                    <th className="num">Gramos</th>
                    <th>Notas</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {proyectosDeseados.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{beneficiario(item)}</td>
                      <td>{item.desired_material ?? '—'}</td>
                      <td>{item.desired_color ?? '—'}</td>
                      <td className="num tabular">
                        {item.expected_grams !== null ? formatGramos(item.expected_grams) : '—'}
                      </td>
                      <td>{item.notes ?? '—'}</td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="btn btn-small"
                          onClick={() => promocionar.mutate(item.id)}
                          disabled={promocionar.isPending}
                        >
                          Pasar a cola de impresión
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => borrarProyectoDeseado.mutate(item.id)}
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
