// Heurística local (sin red, sin backend) para extraer datos de compra a partir
// del texto pegado de un email de confirmación de pedido. Es best-effort: el
// usuario siempre revisa/corrige el resultado antes de guardar la compra.

export interface CandidatoCompra {
  material: string
  color: string
  price_eur: number | null
  spool_weight_g: number | null
  purchase_date: string | null // YYYY-MM-DD
  lineaOriginal: string
}

// El orden no importa para la detección: ante varios que casen en la misma línea
// (p.ej. "PLA" dentro de "Support for PLA") gana siempre el nombre más largo.
const MATERIALES_CONOCIDOS = [
  'PLA-CF',
  'PLA Aero',
  'PLA Galaxy',
  'PLA Sparkle',
  'PLA Silk',
  'PLA Matte',
  'PLA Basic',
  'PLA',
  'PETG-CF',
  'PETG HF',
  'PETG Translucent',
  'PETG',
  'ABS-GF',
  'ABS',
  'ASA-CF',
  'ASA Aero',
  'ASA',
  'TPU for AMS',
  'TPU',
  'PAHT-CF',
  'PA6-CF',
  'PA-CF',
  'PA',
  'PC FR',
  'PC',
  'PVA',
  'Support for PLA',
  'Support for PA/PET',
  'Support',
]

const PESOS_HABITUALES_G = [3000, 1000, 750, 500, 250]

function detectarPrecio(texto: string): number | null {
  const match = texto.match(
    /(\d{1,4}(?:[.,]\d{2}))\s?(?:€|\bEUR\b)|(?:€|\bEUR\b)\s?(\d{1,4}(?:[.,]\d{2}))/i,
  )
  if (!match) return null
  const crudo = (match[1] ?? match[2]).replace(',', '.')
  const valor = Number(crudo)
  return Number.isFinite(valor) ? valor : null
}

function detectarPesoGramos(texto: string): number | null {
  const enKg = texto.match(/(\d+(?:[.,]\d+)?)\s?kg\b/i)
  if (enKg) {
    const valor = Number(enKg[1].replace(',', '.'))
    if (Number.isFinite(valor)) return valor * 1000
  }
  const enGramos = texto.match(/\b(\d{3,4})\s?g\b/i)
  if (enGramos) {
    const valor = Number(enGramos[1])
    if (Number.isFinite(valor)) return valor
  }
  for (const peso of PESOS_HABITUALES_G) {
    if (texto.includes(String(peso))) return peso
  }
  return null
}

function detectarFecha(texto: string): string | null {
  const iso = texto.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const conBarras = texto.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/)
  if (conBarras) {
    const [, d, m, y] = conBarras
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function limpiarSegmentoColor(segmento: string): string {
  return segmento
    .replace(/\d{1,4}(?:[.,]\d{2})?\s?(€|\bEUR\b)/gi, '')
    .replace(/\b\d+(?:[.,]\d+)?\s?(kg|g)\b/gi, '')
    .replace(/^\s*\d+\s?x\b/i, '')
    .replace(/\(\s*\)/g, '')
    .replace(/[|,]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function detectarColor(linea: string, material: string): string {
  const escapado = material.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patronMaterial = new RegExp(`\\b${escapado}\\b`, 'i')

  const segmentos = linea.split(/[-–|]/)
  const indiceMaterial = segmentos.findIndex((segmento) => patronMaterial.test(segmento))

  if (indiceMaterial === -1) return ''

  const siguiente = segmentos[indiceMaterial + 1]
  if (siguiente && limpiarSegmentoColor(siguiente)) {
    return limpiarSegmentoColor(siguiente)
  }

  // Sin segmento siguiente (o vacío tras limpiar): usamos el mismo segmento
  // quitando el nombre del material, por si el color va pegado sin separador.
  const mismoSegmentoSinMaterial = segmentos[indiceMaterial].replace(patronMaterial, '')
  return limpiarSegmentoColor(mismoSegmentoSinMaterial)
}

export function detectarLineasPedido(texto: string): CandidatoCompra[] {
  if (!texto.trim()) return []

  const fechaPedido = detectarFecha(texto)
  const lineas = texto.split(/\r?\n/)
  const candidatos: CandidatoCompra[] = []

  for (const linea of lineas) {
    const limpia = linea.trim()
    if (!limpia) continue

    const coincidencias = MATERIALES_CONOCIDOS.filter((m) =>
      new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(limpia),
    )
    if (coincidencias.length === 0) continue
    const material = [...coincidencias].sort((a, b) => b.length - a.length)[0]

    candidatos.push({
      material,
      color: detectarColor(limpia, material),
      price_eur: detectarPrecio(limpia),
      spool_weight_g: detectarPesoGramos(limpia),
      purchase_date: fechaPedido,
      lineaOriginal: limpia,
    })
  }

  return candidatos
}
