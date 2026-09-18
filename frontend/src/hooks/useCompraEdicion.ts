import { useState } from 'react'
import { usePatchPurchase } from '../api/hooks'
import type { FilamentPurchase } from '../api/types'

interface EdicionCompra {
  spool_weight_g: string
  price_eur: string
  remaining_pct: string
}

/** Estado y acciones para editar inline peso, precio y % restante de una bobina
 * concreta; se comparte entre la pantalla de Compras y la de Stock. */
export function useCompraEdicion() {
  const patchCompra = usePatchPurchase()
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [edicion, setEdicion] = useState<EdicionCompra>({
    spool_weight_g: '',
    price_eur: '',
    remaining_pct: '',
  })

  function empezarEdicion(compra: FilamentPurchase) {
    setEditandoId(compra.id)
    setEdicion({
      spool_weight_g: String(compra.spool_weight_g),
      price_eur: String(compra.price_eur),
      remaining_pct: String(compra.remaining_pct ?? 100),
    })
  }

  function cancelarEdicion() {
    setEditandoId(null)
  }

  function guardarEdicion(id: number) {
    patchCompra.mutate(
      {
        id,
        body: {
          spool_weight_g: Number(edicion.spool_weight_g),
          price_eur: Number(edicion.price_eur),
          remaining_pct: Number(edicion.remaining_pct),
        },
      },
      { onSuccess: () => setEditandoId(null) },
    )
  }

  return {
    editandoId,
    edicion,
    setEdicion,
    empezarEdicion,
    cancelarEdicion,
    guardarEdicion,
    isPending: patchCompra.isPending,
  }
}
