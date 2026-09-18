import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatCard } from '../components/StatCard'
import { useStatsSummary } from '../api/hooks'
import type { StockBajo, UsageByMaterial, UsageByPerson } from '../api/types'
import { formatEur, formatGramos } from '../utils/format'

// Colores categóricos fijos (paleta de la skill dataviz, slots 1-3):
// la identidad de persona nunca cambia de color aunque cambie el orden
// en que llegan los datos del backend.
function colorPorPersona(nombre: string): string {
  const normalizado = nombre.trim().toLowerCase()
  if (normalizado === 'javi') return 'var(--series-1)'
  if (normalizado === 'nacho') return 'var(--series-2)'
  return 'var(--series-3)' // terceros / otros
}

const MAX_MATERIALES_VISIBLES = 7

interface TooltipCargaProps {
  active?: boolean
  payload?: Array<{ value: number; payload: Record<string, unknown> }>
  formatearValor: (valor: number) => string
  etiquetaDe: (payload: Record<string, unknown>) => string
}

function TooltipGramos({ active, payload, formatearValor, etiquetaDe }: TooltipCargaProps) {
  if (!active || !payload || payload.length === 0) return null
  const punto = payload[0]
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{etiquetaDe(punto.payload)}</div>
      <div className="chart-tooltip-value">{formatearValor(punto.value)}</div>
    </div>
  )
}

function GraficoUsoPorPersona({ datos }: { datos: UsageByPerson[] }) {
  const [verTabla, setVerTabla] = useState(false)

  if (datos.length === 0) {
    return <p className="empty-state">Todavía no hay impresiones confirmadas.</p>
  }

  return (
    <div className="card">
      <div className="chart-card-header">
        <p className="card-title">Uso de filamento por persona</p>
        <button type="button" className="btn btn-small" onClick={() => setVerTabla((v) => !v)}>
          {verTabla ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>
      {verTabla ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th className="num">Gramos</th>
                <th className="num">% del total</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((fila) => (
                <tr key={fila.person}>
                  <td>{fila.person}</td>
                  <td className="num tabular">{formatGramos(fila.grams)}</td>
                  <td className="num tabular">{fila.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={datos} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--gridline)" strokeDasharray="0" />
            <XAxis
              dataKey="person"
              tickLine={false}
              axisLine={{ stroke: 'var(--axis-baseline)' }}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'var(--surface-0)' }}
              content={
                <TooltipGramos
                  formatearValor={formatGramos}
                  etiquetaDe={(p) => String(p.person)}
                />
              }
            />
            <Bar dataKey="grams" maxBarSize={48} radius={[4, 4, 0, 0]}>
              {datos.map((entrada) => (
                <Cell key={entrada.person} fill={colorPorPersona(entrada.person)} />
              ))}
              <LabelList
                dataKey="grams"
                position="top"
                formatter={(valor: number) => formatGramos(valor)}
                style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function agruparMaterialesConOtros(datos: UsageByMaterial[]): UsageByMaterial[] {
  const ordenados = [...datos].sort((a, b) => b.grams - a.grams)
  if (ordenados.length <= MAX_MATERIALES_VISIBLES) return ordenados
  const visibles = ordenados.slice(0, MAX_MATERIALES_VISIBLES - 1)
  const resto = ordenados.slice(MAX_MATERIALES_VISIBLES - 1)
  const otros = resto.reduce((acc, item) => acc + item.grams, 0)
  return [...visibles, { material: 'Otros', grams: otros }]
}

function GraficoUsoPorMaterial({ datos }: { datos: UsageByMaterial[] }) {
  const [verTabla, setVerTabla] = useState(false)
  const agrupados = useMemo(() => agruparMaterialesConOtros(datos), [datos])

  if (datos.length === 0) {
    return <p className="empty-state">Todavía no hay impresiones confirmadas.</p>
  }

  // Altura proporcional al número de barras para que quepan sin apretarse.
  const altura = Math.max(180, agrupados.length * 36 + 40)

  return (
    <div className="card">
      <div className="chart-card-header">
        <p className="card-title">Uso de filamento por material</p>
        <button type="button" className="btn btn-small" onClick={() => setVerTabla((v) => !v)}>
          {verTabla ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>
      {verTabla ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th>
                <th className="num">Gramos</th>
              </tr>
            </thead>
            <tbody>
              {agrupados.map((fila) => (
                <tr key={fila.material}>
                  <td>{fila.material}</td>
                  <td className="num tabular">{formatGramos(fila.grams)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={altura}>
          <BarChart
            data={agrupados}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--gridline)" strokeDasharray="0" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="material"
              tickLine={false}
              axisLine={{ stroke: 'var(--axis-baseline)' }}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              width={90}
            />
            <Tooltip
              cursor={{ fill: 'var(--surface-0)' }}
              content={
                <TooltipGramos
                  formatearValor={formatGramos}
                  etiquetaDe={(p) => String(p.material)}
                />
              }
            />
            <Bar dataKey="grams" fill="var(--series-1)" maxBarSize={24} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="grams"
                position="right"
                formatter={(valor: number) => formatGramos(valor)}
                style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function TarjetaBalance({
  saldoJavi,
  saldoNacho,
  quienDebe,
  cuanto,
}: {
  saldoJavi: number
  saldoNacho: number
  quienDebe: 'javi' | 'nacho' | 'nadie'
  cuanto: number
}) {
  const mensaje =
    quienDebe === 'nadie'
      ? 'Las cuentas están saldadas: nadie le debe nada a nadie.'
      : quienDebe === 'javi'
        ? `Javi le debe ${formatEur(cuanto)} a Nacho.`
        : `Nacho le debe ${formatEur(cuanto)} a Javi.`

  return (
    <div className="card balance-card">
      <p className="card-title">Balance de gasto</p>
      <p className="balance-message">{mensaje}</p>
      <div className="balance-detail">
        <span>Saldo Javi: {formatEur(saldoJavi)}</span>
        <span>Saldo Nacho: {formatEur(saldoNacho)}</span>
      </div>
    </div>
  )
}

function AvisoStockBajo({ items }: { items: StockBajo[] }) {
  if (items.length === 0) return null
  return (
    <div className="card alert-card">
      <p className="card-title">Stock bajo</p>
      <ul className="alert-list">
        {items.map((item) => (
          <li key={`${item.material}-${item.color}`}>
            {item.material} {item.color}: queda {formatGramos(item.remaining_weight_g)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Dashboard() {
  const { data, isLoading, isError } = useStatsSummary()

  if (isLoading) {
    return <p className="spinner-text">Cargando estadísticas…</p>
  }

  if (isError || !data) {
    return <p className="form-error">No se han podido cargar las estadísticas.</p>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Panel</h1>
        <p>Resumen de gasto y uso de filamento entre Javi y Nacho.</p>
      </div>

      <div className="stat-grid">
        <StatCard label="Gasto total" value={formatEur(data.total_spent_eur)} />
        <StatCard label="Filamento comprado" value={formatGramos(data.total_grams_purchased)} />
        <StatCard label="Filamento usado" value={formatGramos(data.total_grams_used)} />
        <StatCard label="Filamento restante" value={formatGramos(data.remaining_grams)} />
      </div>

      <TarjetaBalance
        saldoJavi={data.balance.saldo_javi_eur}
        saldoNacho={data.balance.saldo_nacho_eur}
        quienDebe={data.balance.quien_debe}
        cuanto={data.balance.cuanto_eur}
      />

      <AvisoStockBajo items={data.low_stock} />

      <div className="chart-grid">
        <GraficoUsoPorPersona datos={data.usage_by_person} />
        <GraficoUsoPorMaterial datos={data.usage_by_material} />
      </div>
    </div>
  )
}
