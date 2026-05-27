export type EquipmentStatus = 'disponivel' | 'em_uso' | 'manutencao' | 'inativo'

export interface Category {
  id: number
  name: string
  description?: string
  color: string
  icon: string
  equipment_count?: number
  created_at: string
}

export interface Location {
  id: number
  name: string
  description?: string
  equipment_count?: number
  created_at: string
}

export interface Equipment {
  id: number
  name: string
  category_id?: number
  category_name?: string
  category_color?: string
  category_icon?: string
  brand?: string
  model?: string
  serial_number?: string
  asset_tag?: string
  status: EquipmentStatus
  location_id?: number
  location_name?: string
  assigned_to?: string
  purchase_date?: string
  purchase_price?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Movement {
  id: number
  equipment_id: number
  equipment_name?: string
  type: string
  description?: string
  performed_by?: string
  created_at: string
}

export interface DashboardData {
  total: number
  disponivel: number
  em_uso: number
  manutencao: number
  inativo: number
  byCategory: { name: string; color: string; icon: string; count: number }[]
  recent: Equipment[]
  recentMovements: Movement[]
  byLocation: { name: string; count: number }[]
  totalValue: number
  valuedCount: number
  monthlyGrowth: { month: string; count: number }[]
}

export interface AuditChange {
  field: string
  label: string
  old_value: string | null
  new_value: string | null
}

export interface AuditEntry {
  id: number
  entity_type: string
  entity_id: number
  entity_name: string | null
  action: 'created' | 'updated' | 'deleted' | 'deactivated' | 'activated' | string
  changes: AuditChange[] | null
  user_id: number | null
  user_name: string | null
  created_at: string
}
