// Wrapper fetch tipado sobre la API del backend.
// baseURL configurable por VITE_API_BASE_URL, con fallback a "/api/v1"
// para que funcione detrás del proxy nginx en producción.

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function manejarRespuesta<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detalle = res.statusText
    try {
      const cuerpo = await res.json()
      detalle = cuerpo?.detail ? String(cuerpo.detail) : detalle
    } catch {
      // el cuerpo no era JSON o estaba vacío; nos quedamos con statusText
    }
    throw new ApiError(res.status, detalle.slice(0, 200))
  }
  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

function construirQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return ''
  const entradas = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  if (entradas.length === 0) return ''
  const query = new URLSearchParams(entradas.map(([k, v]) => [k, String(v)]))
  return `?${query.toString()}`
}

export async function obtener<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}${construirQuery(params)}`)
  return manejarRespuesta<T>(res)
}

export async function crear<T, B = unknown>(path: string, body: B): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return manejarRespuesta<T>(res)
}

export async function actualizar<T, B = unknown>(path: string, body: B): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return manejarRespuesta<T>(res)
}

export async function eliminar(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' })
  await manejarRespuesta<void>(res)
}

export async function subirArchivo<T>(path: string, file: File): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', body: formData })
  return manejarRespuesta<T>(res)
}
