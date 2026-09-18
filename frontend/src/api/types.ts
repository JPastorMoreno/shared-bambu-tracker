// Tipos TypeScript que reflejan el contrato del backend (FastAPI).
// Cualquier cambio aquí debe mantenerse sincronizado con el backend.

export interface Person {
  id: number
  name: string
}

export interface FilamentPurchase {
  id: number
  purchase_date: string // YYYY-MM-DD
  brand: string
  material: string
  color: string
  spool_weight_g: number
  price_eur: number
  paid_by_person_id: number
  remaining_weight_g: number
  remaining_pct: number | null
  notes: string | null
}

export interface FilamentPurchaseCreate {
  purchase_date: string
  brand: string
  material: string
  color: string
  spool_weight_g: number
  price_eur: number
  paid_by_person_id: number
  remaining_pct?: number
  notes?: string
}

export type FilamentPurchaseUpdate = Partial<FilamentPurchaseCreate>

export interface StockItem {
  material: string
  color: string
  remaining_weight_g: number
}

export type PrintJobSource = 'manual' | 'bambu_sync'
export type PrintJobStatus = 'pending_review' | 'confirmed'

export interface PrintJobFilamentUsageInput {
  filament_purchase_id: number
  grams_used: number
}

export interface PrintJobFilamentUsage extends PrintJobFilamentUsageInput {
  brand: string | null
  material: string | null
  color: string | null
}

export interface PrintJob {
  id: number
  source: PrintJobSource
  external_task_id: string | null
  printed_at: string // ISO
  model_name: string
  person_id: number | null
  third_party_name: string | null
  third_party_charge_eur: number | null
  filament_usages: PrintJobFilamentUsage[]
  grams_used: number | null
  sale_price_eur: number | null
  status: PrintJobStatus
  print_duration_min: number | null
  thumbnail_url: string | null
  notes: string | null
  ended_at: string | null
  print_succeeded: boolean | null
  cost_eur: number | null
  profit_eur: number | null
  makerworld_url: string | null
}

export interface PrintJobCreate {
  printed_at: string
  model_name: string
  person_id?: number
  third_party_name?: string
  third_party_charge_eur?: number
  filament_usages?: PrintJobFilamentUsageInput[]
  grams_used?: number
  sale_price_eur?: number
  print_duration_min?: number
  notes?: string
}

export type PrintJobUpdate = Partial<PrintJobCreate> & {
  status?: PrintJobStatus
}

export interface PrintJobFilters {
  status?: PrintJobStatus
  person_id?: number
}

export interface PlannedPrint {
  id: number
  model_name: string
  person_id: number | null
  third_party_name: string | null
  filament_purchase_id: number | null
  expected_grams: number | null
  notes: string | null
  created_at: string
  expected_cost_eur: number | null
}

export interface PlannedPrintCreate {
  model_name: string
  person_id?: number
  third_party_name?: string
  filament_purchase_id?: number
  expected_grams?: number
  notes?: string
}

export type PlannedPrintUpdate = Partial<PlannedPrintCreate>

export interface PlannedPrintComplete {
  grams_used?: number
  printed_at?: string
}

export interface BambuStatus {
  connected: boolean
  email: string | null
  last_synced_at: string | null
}

export interface BambuLoginStartRequest {
  email: string
  password: string
  region: string
}

export interface BambuLoginStartResponse {
  login_session_id: string
  requires_code: boolean
}

export interface BambuLoginVerifyRequest {
  login_session_id: string
  code: string
}

export interface BambuLoginVerifyResponse {
  connected: true
}

export interface BambuSyncResponse {
  created: number
}

export type QuienDebe = 'javi' | 'nacho' | 'nadie'

export interface Balance {
  saldo_javi_eur: number
  saldo_nacho_eur: number
  quien_debe: QuienDebe
  cuanto_eur: number
}

export interface UsageByPerson {
  person: string
  grams: number
  pct: number
}

export interface UsageByMaterial {
  material: string
  grams: number
}

export interface StockBajo {
  material: string
  color: string
  remaining_weight_g: number
}

export interface StatsSummary {
  total_spent_eur: number
  total_grams_purchased: number
  total_grams_used: number
  remaining_grams: number
  balance: Balance
  usage_by_person: UsageByPerson[]
  usage_by_material: UsageByMaterial[]
  low_stock: StockBajo[]
}

export interface FilamentWishlistItem {
  id: number
  material: string
  color: string
  brand: string | null
  desired_grams: number
  estimated_price_eur: number | null
  notes: string | null
  created_at: string
}

export interface FilamentWishlistItemCreate {
  material: string
  color: string
  brand?: string
  desired_grams: number
  estimated_price_eur?: number
  notes?: string
}

export type FilamentWishlistItemUpdate = Partial<FilamentWishlistItemCreate>

export interface ProjectWishlistItem {
  id: number
  name: string
  person_id: number | null
  third_party_name: string | null
  desired_material: string | null
  desired_color: string | null
  expected_grams: number | null
  notes: string | null
  created_at: string
}

export interface ProjectWishlistItemCreate {
  name: string
  person_id?: number
  third_party_name?: string
  desired_material?: string
  desired_color?: string
  expected_grams?: number
  notes?: string
}

export type ProjectWishlistItemUpdate = Partial<ProjectWishlistItemCreate>

export interface InventoryProjectionRow {
  material: string
  color: string
  current_stock_g: number
  incoming_wishlist_g: number
  reserved_by_projects_g: number
  projected_balance_g: number
  deficit_g: number
}

export interface InventoryProjection {
  rows: InventoryProjectionRow[]
  total_wishlist_cost_eur: number
  total_deficit_g: number
  projects_without_material: number
}

export interface DesignEstimateRequest {
  url: string
}

export interface DesignFilamentEstimate {
  type: string
  color_hex: string | null
  grams: number
}

export interface DesignInstanceEstimate {
  id: number
  title: string
  is_default: boolean
  total_grams: number
  estimated_print_minutes: number | null
  filaments: DesignFilamentEstimate[]
}

export interface DesignEstimateResponse {
  title: string
  cover_url: string | null
  instances: DesignInstanceEstimate[]
}
