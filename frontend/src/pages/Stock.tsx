import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFilamentPurchases, usePersons } from '../api/hooks'
import { useCompraEdicion } from '../hooks/useCompraEdicion'
import { formatEur, formatGramos } from '../utils/format'
import type { FilamentPurchase } from '../api/types'

type Orden = 'material' | 'restante'

interface GrupoStock {
  material: string
  color: string
  original: number
  restante: number
  pct: number | null
  bobinas: FilamentPurchase[]
}

interface TooltipStockProps {
  active?: boolean
  payload?: Array<{ payload: GrupoStock }>
}

function TooltipStock({ active, payload }: TooltipStockProps) {
  if (!active || !payload || payload.length === 0) return null
  const grupo = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">
        {grupo.material} — {grupo.color}
      </div>
      <div className="chart-tooltip-value">
        {grupo.pct !== null ? `${grupo.pct.toFixed(0)}%` : '—'} · {formatGramos(grupo.restante)} de{' '}
        {formatGramos(grupo.original)}
      </div>
    </div>
  )
}

function GraficoStockRestante({ grupos }: { grupos: GrupoStock[] }) {
  const [verTabla, setVerTabla] = useState(false)
  const datos = grupos.map((g) => ({
    ...g,
    etiqueta: `${g.material} ${g.color}`,
    pctBarra: g.pct ?? 0,
  }))
  const altura = Math.max(180, datos.length * 36 + 40)

  return (
    <div className="card">
      <div className="chart-card-header">
        <p className="card-title">% de filamento restante por tipo</p>
        <button type="button" className="btn btn-small" onClick={() => setVerTabla((v) => !v)}>
          {verTabla ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>
      {verTabla ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filamento</th>
                <th className="num">Original</th>
                <th className="num">Restante</th>
                <th className="num">% restante</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((g) => (
                <tr key={g.etiqueta}>
                  <td>{g.etiqueta}</td>
                  <td className="num tabular">{formatGramos(g.original)}</td>
                  <td className="num tabular">{formatGramos(g.restante)}</td>
                  <td className="num tabular">{g.pct !== null ? `${g.pct.toFixed(0)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={altura}>
          <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="var(--gridline)" strokeDasharray="0" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="etiqueta"
              tickLine={false}
              axisLine={{ stroke: 'var(--axis-baseline)' }}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              width={130}
            />
            <Tooltip cursor={{ fill: 'var(--surface-0)' }} content={<TooltipStock />} />
            <Bar dataKey="pctBarra" fill="var(--series-1)" maxBarSize={20} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="pctBarra"
                position="right"
                formatter={(valor: number) => `${valor.toFixed(0)}%`}
                style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export function Stock() {
  const { data: personas = [] } = usePersons()
  const { data: compras = [], isLoading, isError } = useFilamentPurchases()
  const [orden, setOrden] = useState<Orden>('material')
  const { editandoId, edicion, setEdicion, empezarEdicion, cancelarEdicion, guardarEdicion, isPending } =
    useCompraEdicion()

  function nombrePersona(id: number): string {
    return personas.find((p) => p.id === id)?.name ?? `#${id}`
  }

  const grupos = useMemo(() => {
    const porClave = new Map<string, GrupoStock>()
    for (const compra of compras) {
      const clave = `${compra.material}|${compra.color}`
      const grupo = porClave.get(clave)
      if (grupo) {
        grupo.original += compra.spool_weight_g
        grupo.restante += compra.remaining_weight_g
        grupo.bobinas.push(compra)
      } else {
        porClave.set(clave, {
          material: compra.material,
          color: compra.color,
          original: compra.spool_weight_g,
          restante: compra.remaining_weight_g,
          pct: null,
          bobinas: [compra],
        })
      }
    }
    for (const grupo of porClave.values()) {
      grupo.pct = grupo.original > 0 ? (grupo.restante / grupo.original) * 100 : null
    }
    const lista = [...porClave.values()]
    if (orden === 'material') {
      lista.sort((a, b) => a.material.localeCompare(b.material) || a.color.localeCompare(b.color))
    } else {
      lista.sort((a, b) => b.restante - a.restante)
    }
    return lista
  }, [compras, orden])

  const totalOriginal = compras.reduce((acc, c) => acc + c.spool_weight_g, 0)
  const totalRestante = compras.reduce((acc, c) => acc + c.remaining_weight_g, 0)

  return (
    <div>
      <div className="page-header">
        <h1>Stock de filamento</h1>
        <p>
          Bobinas que tienes ahora mismo, agrupadas por material y color. Edita peso, precio o %
          restante de cada una directamente aquí.
        </p>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <p className="stat-card-label">Comprado en total</p>
          <p className="stat-card-value">{formatGramos(totalOriginal)}</p>
        </div>
        <div className="card stat-card">
          <p className="stat-card-label">Restante total</p>
          <p className="stat-card-value">{formatGramos(totalRestante)}</p>
        </div>
        <div className="card stat-card">
          <p className="stat-card-label">Combinaciones material/color</p>
          <p className="stat-card-value">{grupos.length}</p>
        </div>
      </div>

      {grupos.length > 0 && <GraficoStockRestante grupos={grupos} />}

      <div className="filter-row">
        <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
          <option value="material">Ordenar por material</option>
          <option value="restante">Ordenar por cantidad restante</option>
        </select>
      </div>

      {isLoading && <p className="spinner-text">Cargando stock…</p>}
      {isError && <p className="form-error">No se ha podido cargar el stock.</p>}
      {!isLoading && !isError && (
        <>
          {grupos.length === 0 ? (
            <div className="card">
              <p className="empty-state">No hay stock registrado todavía.</p>
            </div>
          ) : (
            <div className="print-job-list">
              {grupos.map((grupo) => (
                <div className="card" key={`${grupo.material}-${grupo.color}`}>
                  <div className="section-title-row">
                    <p className="card-title">
                      {grupo.material} — {grupo.color}
                    </p>
                    <span className="form-hint">
                      {formatGramos(grupo.restante)} restantes de {formatGramos(grupo.original)}
                      {grupo.pct !== null && ` (${grupo.pct.toFixed(0)}%)`}
                    </span>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Marca</th>
                          <th className="num">Bobina</th>
                          <th className="num">Restante</th>
                          <th className="num">Precio</th>
                          <th>Pagado por</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.bobinas.map((compra) =>
                          editandoId === compra.id ? (
                            <tr key={compra.id}>
                              <td>{compra.brand}</td>
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
                                  onChange={(e) =>
                                    setEdicion((v) => ({ ...v, price_eur: e.target.value }))
                                  }
                                />
                              </td>
                              <td>{nombrePersona(compra.paid_by_person_id)}</td>
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
                              <td>{compra.brand}</td>
                              <td className="num tabular">{formatGramos(compra.spool_weight_g)}</td>
                              <td className="num tabular">
                                {formatGramos(compra.remaining_weight_g)}
                                {compra.remaining_pct !== null && ` (${compra.remaining_pct}%)`}
                              </td>
                              <td className="num tabular">{formatEur(compra.price_eur)}</td>
                              <td>{nombrePersona(compra.paid_by_person_id)}</td>
                              <td className="table-actions">
                                <button
                                  type="button"
                                  className="btn btn-small"
                                  onClick={() => empezarEdicion(compra)}
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
