interface StatCardProps {
  label: string
  value: string
  hint?: string
}

/**
 * Tarjeta de estadística (stat tile): label en frase, valor destacado.
 * Sigue el contrato de "figuras" de la skill dataviz: valor en cifras
 * proporcionales (nunca tabulares) porque es un número grande y aislado.
 */
export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="card stat-card">
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
      {hint && <p className="stat-card-hint">{hint}</p>}
    </div>
  )
}
