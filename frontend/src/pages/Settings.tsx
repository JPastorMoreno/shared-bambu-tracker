import { useState, type FormEvent } from 'react'
import { useBambuLoginStart, useBambuLoginVerify, useBambuStatus } from '../api/hooks'
import { formatFechaHora } from '../utils/format'

const REGIONES = [
  { value: 'global', label: 'Global' },
  { value: 'china', label: 'China' },
]

export function Settings() {
  const { data: estado, isLoading, isError } = useBambuStatus()
  const loginStart = useBambuLoginStart()
  const loginVerify = useBambuLoginVerify()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [region, setRegion] = useState(REGIONES[0].value)
  const [codigo, setCodigo] = useState('')

  function manejarInicioSesion(evento: FormEvent) {
    evento.preventDefault()
    loginStart.mutate({ email, password, region })
  }

  function manejarVerificacion(evento: FormEvent) {
    evento.preventDefault()
    if (!loginStart.data) return
    loginVerify.mutate({ login_session_id: loginStart.data.login_session_id, code: codigo })
  }

  return (
    <div>
      <div className="page-header">
        <h1>Ajustes</h1>
        <p>Conexión con Bambu Cloud para sincronizar impresiones automáticamente.</p>
      </div>

      <div className="card">
        <p className="card-title">Aviso importante</p>
        <p className="form-hint">
          La sincronización con Bambu Cloud usa una integración <strong>no oficial</strong>{' '}
          (ingeniería inversa del API de Bambu Lab). Puede dejar de funcionar en cualquier
          momento si Bambu cambia su API o su sistema de login, y tus credenciales solo se
          usan para iniciar sesión contra su servicio, nunca se comparten con terceros. Úsalo
          bajo tu propio criterio.
        </p>
      </div>

      <div className="card">
        <p className="card-title">Estado de la conexión</p>
        {isLoading && <p className="spinner-text">Comprobando estado…</p>}
        {isError && <p className="form-error">No se ha podido comprobar el estado de Bambu Cloud.</p>}
        {estado && (
          <div className="print-job-meta">
            <span>
              <span
                className={`badge ${estado.connected ? 'badge-confirmed' : 'badge-pending'}`}
              >
                {estado.connected ? 'Conectado' : 'Sin conectar'}
              </span>
            </span>
            {estado.email && <span>Cuenta: {estado.email}</span>}
            {estado.last_synced_at && (
              <span>Última sincronización: {formatFechaHora(estado.last_synced_at)}</span>
            )}
          </div>
        )}
      </div>

      {!estado?.connected && (
        <div className="card">
          <p className="card-title">Conectar con Bambu Cloud</p>
          <p className="form-hint">
            Si vuestra cuenta de Bambu Lab inicia sesión con Google (u otro proveedor), esta
            pantalla no os servirá directamente: la API no admite login solo-OAuth. Hay que fijar
            antes una contraseña propia de la cuenta, una sola vez, desde la app móvil Bambu
            Handy: icono de perfil → <strong>Account Security → Change Password</strong> (o
            &quot;He olvidado mi contraseña&quot; en bambulab.com si no aparece esa opción).
            Después ya podéis iniciar sesión aquí con ese email y esa contraseña.
          </p>

          {loginStart.data && !loginStart.data.requires_code ? (
            <p className="form-hint">
              Conexión establecida correctamente, sin necesidad de código (esta cuenta no pide
              verificación adicional).
            </p>
          ) : !loginStart.data ? (
            <form onSubmit={manejarInicioSesion}>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="bambu-email">Email</label>
                  <input
                    id="bambu-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="bambu-password">Contraseña</label>
                  <input
                    id="bambu-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="bambu-region">Región</label>
                  <select id="bambu-region" value={region} onChange={(e) => setRegion(e.target.value)}>
                    {REGIONES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loginStart.isPending}>
                  {loginStart.isPending ? 'Enviando código…' : 'Iniciar sesión'}
                </button>
              </div>
              {loginStart.isError && (
                <p className="form-error">
                  {loginStart.error instanceof Error
                    ? loginStart.error.message
                    : 'No se ha podido iniciar sesión en Bambu Cloud. Revisa el email y la contraseña.'}
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={manejarVerificacion}>
              <p className="form-hint">
                Bambu Lab te ha enviado un código por email. Introdúcelo para completar la
                conexión.
              </p>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="bambu-codigo">Código recibido</label>
                  <input
                    id="bambu-codigo"
                    type="text"
                    inputMode="numeric"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loginVerify.isPending}>
                  {loginVerify.isPending ? 'Verificando…' : 'Verificar código'}
                </button>
              </div>
              {loginVerify.isError && (
                <p className="form-error">
                  {loginVerify.error instanceof Error
                    ? loginVerify.error.message
                    : 'El código no es válido o ha caducado.'}
                </p>
              )}
              {loginVerify.isSuccess && (
                <p className="form-hint">Conexión establecida correctamente.</p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
