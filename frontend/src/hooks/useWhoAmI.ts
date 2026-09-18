// Hook de conveniencia de UI: recuerda "quién soy" (Javi/Nacho) en localStorage
// para preseleccionar el campo "persona" en los formularios de alta.
// Esto NO es autenticación ni seguridad real, solo comodidad.
import { useCallback, useEffect, useState } from 'react'

export type WhoAmI = 'Javi' | 'Nacho' | null

const STORAGE_KEY = 'bambu-tracker:who-am-i'

function leerAlmacenado(): WhoAmI {
  try {
    const valor = window.localStorage.getItem(STORAGE_KEY)
    return valor === 'Javi' || valor === 'Nacho' ? valor : null
  } catch {
    return null
  }
}

export function useWhoAmI(): [WhoAmI, (quien: WhoAmI) => void] {
  const [quienSoy, setQuienSoyState] = useState<WhoAmI>(() => leerAlmacenado())

  useEffect(() => {
    try {
      if (quienSoy) {
        window.localStorage.setItem(STORAGE_KEY, quienSoy)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // localStorage no disponible (modo privado, etc.); no es crítico.
    }
  }, [quienSoy])

  const setQuienSoy = useCallback((quien: WhoAmI) => {
    setQuienSoyState(quien)
  }, [])

  return [quienSoy, setQuienSoy]
}
