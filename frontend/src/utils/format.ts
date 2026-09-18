// Utilidades de formato compartidas por las páginas.

export function formatEur(valor: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(valor)
}

export function formatGramos(valor: number): string {
  if (Math.abs(valor) >= 1000) {
    return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(valor / 1000)} kg`
  }
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(valor)} g`
}

export function formatFecha(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(fecha)
}

export function formatFechaHora(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(fecha)
}
