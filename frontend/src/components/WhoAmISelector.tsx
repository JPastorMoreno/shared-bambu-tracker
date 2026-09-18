import { useWhoAmI } from '../hooks/useWhoAmI'

/**
 * Selector "quién soy" (Javi/Nacho). Se guarda en localStorage y se usa
 * solo para preseleccionar el campo "persona" en los formularios de alta.
 * No es autenticación: cualquiera puede cambiarlo en cualquier momento.
 */
export function WhoAmISelector() {
  const [quienSoy, setQuienSoy] = useWhoAmI()

  return (
    <div className="who-am-i" title="Quién soy (solo para preseleccionar formularios)">
      <span className="who-am-i-label">Soy:</span>
      <div className="who-am-i-options">
        {(['Javi', 'Nacho'] as const).map((nombre) => (
          <button
            key={nombre}
            type="button"
            className={`who-am-i-chip${quienSoy === nombre ? ' who-am-i-chip-active' : ''}`}
            onClick={() => setQuienSoy(quienSoy === nombre ? null : nombre)}
            aria-pressed={quienSoy === nombre}
          >
            {nombre}
          </button>
        ))}
      </div>
    </div>
  )
}
