// Hooks de @tanstack/react-query para acceder a la API de bambu-tracker.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { actualizar, crear, eliminar, obtener, subirArchivo } from './client'
import type {
  BambuLoginStartRequest,
  BambuLoginStartResponse,
  BambuLoginVerifyRequest,
  BambuLoginVerifyResponse,
  BambuStatus,
  BambuSyncResponse,
  FilamentPurchase,
  FilamentPurchaseCreate,
  FilamentPurchaseUpdate,
  FilamentWishlistItem,
  FilamentWishlistItemCreate,
  FilamentWishlistItemUpdate,
  InventoryProjection,
  Person,
  PlannedPrint,
  PlannedPrintComplete,
  PlannedPrintCreate,
  PlannedPrintUpdate,
  PrintJob,
  PrintJobCreate,
  PrintJobFilters,
  PrintJobUpdate,
  ProjectWishlistItem,
  ProjectWishlistItemCreate,
  ProjectWishlistItemUpdate,
  StatsSummary,
  StockItem,
} from './types'

const CLAVES = {
  persons: ['persons'] as const,
  purchases: ['filament-purchases'] as const,
  stock: ['filament-purchases', 'stock'] as const,
  printJobs: (filtros?: PrintJobFilters) => ['print-jobs', filtros ?? {}] as const,
  plannedPrints: ['planned-prints'] as const,
  statsSummary: ['stats', 'summary'] as const,
  bambuStatus: ['bambu', 'status'] as const,
  filamentWishlist: ['filament-wishlist'] as const,
  projectWishlist: ['project-wishlist'] as const,
  inventoryProjection: ['stats', 'inventory-projection'] as const,
}

// --- Consultas (queries) ---

export function usePersons() {
  return useQuery({
    queryKey: CLAVES.persons,
    queryFn: () => obtener<Person[]>('/persons'),
  })
}

export function useFilamentPurchases() {
  return useQuery({
    queryKey: CLAVES.purchases,
    queryFn: () => obtener<FilamentPurchase[]>('/filament-purchases'),
  })
}

export function useStock() {
  return useQuery({
    queryKey: CLAVES.stock,
    queryFn: () => obtener<StockItem[]>('/filament-purchases/stock'),
  })
}

export function usePrintJobs(filtros?: PrintJobFilters) {
  return useQuery({
    queryKey: CLAVES.printJobs(filtros),
    queryFn: () =>
      obtener<PrintJob[]>('/print-jobs', {
        status: filtros?.status,
        person_id: filtros?.person_id,
      }),
  })
}

export function usePlannedPrints() {
  return useQuery({
    queryKey: CLAVES.plannedPrints,
    queryFn: () => obtener<PlannedPrint[]>('/planned-prints'),
  })
}

export function useStatsSummary() {
  return useQuery({
    queryKey: CLAVES.statsSummary,
    queryFn: () => obtener<StatsSummary>('/stats/summary'),
  })
}

export function useFilamentWishlist() {
  return useQuery({
    queryKey: CLAVES.filamentWishlist,
    queryFn: () => obtener<FilamentWishlistItem[]>('/filament-wishlist'),
  })
}

export function useProjectWishlist() {
  return useQuery({
    queryKey: CLAVES.projectWishlist,
    queryFn: () => obtener<ProjectWishlistItem[]>('/project-wishlist'),
  })
}

export function useInventoryProjection() {
  return useQuery({
    queryKey: CLAVES.inventoryProjection,
    queryFn: () => obtener<InventoryProjection>('/stats/inventory-projection'),
  })
}

export function useBambuStatus() {
  return useQuery({
    queryKey: CLAVES.bambuStatus,
    queryFn: () => obtener<BambuStatus>('/bambu/status'),
  })
}

// --- Mutaciones: compras de filamento ---

export function useCreatePurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: FilamentPurchaseCreate) => crear<FilamentPurchase>('/filament-purchases', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.purchases })
      queryClient.invalidateQueries({ queryKey: CLAVES.stock })
      queryClient.invalidateQueries({ queryKey: CLAVES.statsSummary })
    },
  })
}

export function usePatchPurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: FilamentPurchaseUpdate }) =>
      actualizar<FilamentPurchase>(`/filament-purchases/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.purchases })
      queryClient.invalidateQueries({ queryKey: CLAVES.stock })
      queryClient.invalidateQueries({ queryKey: CLAVES.statsSummary })
    },
  })
}

export function useDeletePurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminar(`/filament-purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.purchases })
      queryClient.invalidateQueries({ queryKey: CLAVES.stock })
      queryClient.invalidateQueries({ queryKey: CLAVES.statsSummary })
    },
  })
}

// --- Mutaciones: impresiones ---

export function useCreatePrintJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PrintJobCreate) => crear<PrintJob>('/print-jobs', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs'] })
      queryClient.invalidateQueries({ queryKey: CLAVES.stock })
      queryClient.invalidateQueries({ queryKey: CLAVES.statsSummary })
    },
  })
}

export function usePatchPrintJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PrintJobUpdate }) =>
      actualizar<PrintJob>(`/print-jobs/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs'] })
      queryClient.invalidateQueries({ queryKey: CLAVES.stock })
      queryClient.invalidateQueries({ queryKey: CLAVES.statsSummary })
    },
  })
}

export function useUploadPrintJobPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      subirArchivo<PrintJob>(`/print-jobs/${id}/photo`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs'] })
    },
  })
}

export function useDeletePrintJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminar(`/print-jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs'] })
      queryClient.invalidateQueries({ queryKey: CLAVES.stock })
      queryClient.invalidateQueries({ queryKey: CLAVES.statsSummary })
    },
  })
}

// --- Mutaciones: impresiones planificadas ---

export function useCreatePlannedPrint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PlannedPrintCreate) => crear<PlannedPrint>('/planned-prints', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.plannedPrints })
    },
  })
}

export function usePatchPlannedPrint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PlannedPrintUpdate }) =>
      actualizar<PlannedPrint>(`/planned-prints/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.plannedPrints })
    },
  })
}

export function useDeletePlannedPrint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminar(`/planned-prints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.plannedPrints })
    },
  })
}

export function useCompletePlannedPrint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PlannedPrintComplete }) =>
      crear<PrintJob>(`/planned-prints/${id}/complete`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.plannedPrints })
      queryClient.invalidateQueries({ queryKey: ['print-jobs'] })
      queryClient.invalidateQueries({ queryKey: CLAVES.stock })
      queryClient.invalidateQueries({ queryKey: CLAVES.statsSummary })
    },
  })
}

// --- Mutaciones: lista de deseados de filamento ---

export function useCreateFilamentWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: FilamentWishlistItemCreate) =>
      crear<FilamentWishlistItem>('/filament-wishlist', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.filamentWishlist })
      queryClient.invalidateQueries({ queryKey: CLAVES.inventoryProjection })
    },
  })
}

export function usePatchFilamentWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: FilamentWishlistItemUpdate }) =>
      actualizar<FilamentWishlistItem>(`/filament-wishlist/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.filamentWishlist })
      queryClient.invalidateQueries({ queryKey: CLAVES.inventoryProjection })
    },
  })
}

export function useDeleteFilamentWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminar(`/filament-wishlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.filamentWishlist })
      queryClient.invalidateQueries({ queryKey: CLAVES.inventoryProjection })
    },
  })
}

// --- Mutaciones: lista de deseados de proyectos ---

export function useCreateProjectWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ProjectWishlistItemCreate) =>
      crear<ProjectWishlistItem>('/project-wishlist', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.projectWishlist })
      queryClient.invalidateQueries({ queryKey: CLAVES.inventoryProjection })
    },
  })
}

export function usePatchProjectWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProjectWishlistItemUpdate }) =>
      actualizar<ProjectWishlistItem>(`/project-wishlist/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.projectWishlist })
      queryClient.invalidateQueries({ queryKey: CLAVES.inventoryProjection })
    },
  })
}

export function useDeleteProjectWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminar(`/project-wishlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.projectWishlist })
      queryClient.invalidateQueries({ queryKey: CLAVES.inventoryProjection })
    },
  })
}

export function usePromoteProjectWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      crear<PlannedPrint, Record<string, never>>(`/project-wishlist/${id}/promote`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.projectWishlist })
      queryClient.invalidateQueries({ queryKey: CLAVES.inventoryProjection })
      queryClient.invalidateQueries({ queryKey: CLAVES.plannedPrints })
    },
  })
}

// --- Mutaciones: sincronización con Bambu Cloud ---

export function useBambuLoginStart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BambuLoginStartRequest) =>
      crear<BambuLoginStartResponse>('/bambu/login/start', body),
    onSuccess: (data) => {
      if (!data.requires_code) {
        queryClient.invalidateQueries({ queryKey: CLAVES.bambuStatus })
      }
    },
  })
}

export function useBambuLoginVerify() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BambuLoginVerifyRequest) =>
      crear<BambuLoginVerifyResponse>('/bambu/login/verify', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVES.bambuStatus })
    },
  })
}

export function useBambuSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => crear<BambuSyncResponse, Record<string, never>>('/bambu/sync', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs'] })
      queryClient.invalidateQueries({ queryKey: CLAVES.bambuStatus })
      queryClient.invalidateQueries({ queryKey: CLAVES.statsSummary })
    },
  })
}
