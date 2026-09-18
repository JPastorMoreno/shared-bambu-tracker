import { useState } from 'react'
import { BASE_URL } from '../api/client'
import {
  useBambuSync,
  useDeletePrintJob,
  useFilamentPurchases,
  usePersons,
  usePlannedPrints,
  usePrintJobs,
  useUploadPrintJobPhoto,
} from '../api/hooks'
import { PlannedPrintForm } from '../components/forms/PlannedPrintForm'
import { PlannedPrintItem } from '../components/forms/PlannedPrintItem'
import { PrintJobEditForm } from '../components/forms/PrintJobEditForm'
import { PrintJobForm } from '../components/forms/PrintJobForm'
import { PrintJobReviewForm } from '../components/forms/PrintJobReviewForm'
import { useWhoAmI } from '../hooks/useWhoAmI'
import type { PrintJobStatus } from '../api/types'
import { formatEur, formatFechaHora, formatGramos } from '../utils/format'

type FiltroEstado = 'todas' | PrintJobStatus

export function PrintJobs() {
  const { data: personas = [] } = usePersons()
  const { data: compras = [] } = useFilamentPurchases()
  const { data: planificadas = [] } = usePlannedPrints()
  const [quienSoy] = useWhoAmI()

  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas')
  const [filtroPersona, setFiltroPersona] = useState<string>('')
  const [editandoId, setEditandoId] = useState<number | null>(null)

  const {
    data: impresiones = [],
    isLoading,
    isError,
  } = usePrintJobs({
    status: filtroEstado === 'todas' ? undefined : filtroEstado,
    person_id: filtroPersona ? Number(filtroPersona) : undefined,
  })

  const sincronizar = useBambuSync()
  const eliminarImpresion = useDeletePrintJob()
  const subirFoto = useUploadPrintJobPhoto()

  const personaPreseleccionada = personas.find((p) => p.name === quienSoy) ?? null

  function nombrePersona(id: number | null): string {
    if (id === null) return '—'
    return personas.find((p) => p.id === id)?.name ?? `#${id}`
  }

  function beneficiario(impresion: (typeof impresiones)[number]): string {
    if (impresion.person_id !== null) return nombrePersona(impresion.person_id)
    if (impresion.third_party_name) return impresion.third_party_name
    return 'Sin asignar'
  }

  function manejarEliminar(id: number) {
    if (window.confirm('¿Seguro que quieres borrar esta impresión?')) {
      eliminarImpresion.mutate(id)
    }
  }

  function manejarFoto(id: number, archivos: FileList | null) {
    const file = archivos?.[0]
    if (file) subirFoto.mutate({ id, file })
  }

  return (
    <div>
      <div className="page-header">
        <h1>Impresiones</h1>
        <p>Historial de trabajos impresos, manuales y sincronizados desde Bambu Cloud.</p>
      </div>

      <div className="form-actions" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="btn"
          onClick={() => sincronizar.mutate()}
          disabled={sincronizar.isPending}
        >
          {sincronizar.isPending ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
        {sincronizar.isSuccess && (
          <span className="form-hint">
            {sincronizar.data.created} impresión(es) nueva(s) traída(s) para revisar.
          </span>
        )}
        {sincronizar.isError && (
          <span className="form-error">No se ha podido sincronizar con Bambu Cloud.</span>
        )}
        <a className="btn" href={`${BASE_URL}/print-jobs/export.csv`}>
          Exportar CSV
        </a>
      </div>

      <PlannedPrintForm
        personas={personas}
        compras={compras}
        personaPreseleccionada={personaPreseleccionada}
      />

      {planificadas.length > 0 && (
        <>
          <h2 className="section-title">Próximas impresiones</h2>
          <div className="print-job-list">
            {planificadas.map((planificada) => (
              <PlannedPrintItem
                key={planificada.id}
                plannedPrint={planificada}
                personas={personas}
              />
            ))}
          </div>
        </>
      )}

      <PrintJobForm
        personas={personas}
        compras={compras}
        personaPreseleccionada={personaPreseleccionada}
      />

      <h2 className="section-title">Historial</h2>

      <div className="filter-row">
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}>
          <option value="todas">Todas</option>
          <option value="pending_review">Pendientes de revisar</option>
          <option value="confirmed">Confirmadas</option>
        </select>
        <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)}>
          <option value="">Todas las personas</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="spinner-text">Cargando impresiones…</p>}
      {isError && <p className="form-error">No se han podido cargar las impresiones.</p>}
      {!isLoading && !isError && (
        <>
          {impresiones.length === 0 ? (
            <div className="card">
              <p className="empty-state">No hay impresiones que coincidan con el filtro.</p>
            </div>
          ) : (
            <div className="print-job-list">
              {[...impresiones]
                .sort((a, b) => b.printed_at.localeCompare(a.printed_at))
                .map((impresion) => (
                  <div className="card print-job-card" key={impresion.id}>
                    <div className="print-job-row">
                      {impresion.thumbnail_url && (
                        <img
                          className="print-job-thumb"
                          src={impresion.thumbnail_url}
                          alt={impresion.model_name}
                        />
                      )}
                      <div className="print-job-main">
                        <div className="print-job-title-row">
                          <strong>{impresion.model_name}</strong>
                          <span
                            className={`badge ${
                              impresion.status === 'confirmed' ? 'badge-confirmed' : 'badge-pending'
                            }`}
                          >
                            {impresion.status === 'confirmed' ? 'Confirmada' : 'Pendiente de revisar'}
                          </span>
                          {impresion.source === 'bambu_sync' && (
                            <span className="print-job-source">Bambu Cloud</span>
                          )}
                        </div>
                        <div className="print-job-meta">
                          <span>{formatFechaHora(impresion.printed_at)}</span>
                          <span>{beneficiario(impresion)}</span>
                          {impresion.grams_used !== null && (
                            <span>{formatGramos(impresion.grams_used)}</span>
                          )}
                          {impresion.cost_eur !== null && (
                            <span>Coste: {formatEur(impresion.cost_eur)}</span>
                          )}
                          {impresion.sale_price_eur !== null && (
                            <span>Venta: {formatEur(impresion.sale_price_eur)}</span>
                          )}
                          {impresion.profit_eur !== null && (
                            <span>Beneficio: {formatEur(impresion.profit_eur)}</span>
                          )}
                          {impresion.print_duration_min !== null && (
                            <span>{impresion.print_duration_min} min</span>
                          )}
                        </div>
                        {impresion.filament_usages.length > 0 && (
                          <p className="print-job-filaments">
                            {impresion.filament_usages
                              .map(
                                (uso) =>
                                  `${uso.brand ?? ''} ${uso.material ?? ''} ${uso.color ?? ''} (${formatGramos(uso.grams_used)})`.trim(),
                              )
                              .join(' + ')}
                          </p>
                        )}
                        {impresion.notes && <p className="print-job-notes">{impresion.notes}</p>}
                        <label className="print-job-photo-input">
                          {impresion.thumbnail_url ? 'Cambiar foto' : 'Añadir foto'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => manejarFoto(impresion.id, e.target.files)}
                          />
                        </label>
                      </div>
                      <div className="table-actions">
                        {impresion.status === 'confirmed' && (
                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() =>
                              setEditandoId(editandoId === impresion.id ? null : impresion.id)
                            }
                          >
                            {editandoId === impresion.id ? 'Cerrar' : 'Editar'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => manejarEliminar(impresion.id)}
                        >
                          Borrar
                        </button>
                      </div>
                    </div>

                    {impresion.status === 'pending_review' && (
                      <PrintJobReviewForm
                        printJob={impresion}
                        personas={personas}
                        compras={compras}
                      />
                    )}
                    {editandoId === impresion.id && (
                      <PrintJobEditForm
                        printJob={impresion}
                        personas={personas}
                        compras={compras}
                        onCancelar={() => setEditandoId(null)}
                      />
                    )}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
