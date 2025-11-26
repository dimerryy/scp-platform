/**
 * TypeScript interfaces matching backend FastAPI Pydantic schemas
 * These types correspond to the response models from ../backend/app/schemas.py
 */

// ============================================================================
// Auth Types
// ============================================================================

export interface SupplierRoleInfo {
  supplier_id: number
  role: 'OWNER' | 'MANAGER' | 'SALES'
}

/**
 * User type matching backend UserOut schema from schemas.py
 * 
 * Fields:
 * - id, email, full_name, is_active: Basic user info
 * - global_role: Optional platform admin role
 * - supplier_roles: Array of supplier roles (if user is supplier staff)
 * - consumer_id: ID of consumer profile (if user is a consumer)
 * - main_role: Computed main role string for quick role checking
 */
export interface User {
  id: number
  email: string
  full_name: string
  is_active: boolean
  global_role: 'PLATFORM_ADMIN' | null
  supplier_roles: SupplierRoleInfo[]
  consumer_id: number | null
  main_role: 'PLATFORM_ADMIN' | 'SUPPLIER_OWNER' | 'SUPPLIER_MANAGER' | 'SUPPLIER_SALES' | 'CONSUMER' | 'USER'
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

// ============================================================================
// Link Types
// ============================================================================

export type LinkStatus = 'pending' | 'accepted' | 'removed' | 'blocked'

export interface Link {
  id: number
  supplier_id: number
  consumer_id: number
  status: LinkStatus
  requested_by: number
  created_at: string // ISO datetime string
  updated_at: string | null // ISO datetime string
  supplier_name: string
  consumer_name: string
}

export interface LinkCreate {
  supplier_id: number
}

export interface LinkStatusUpdate {
  status: LinkStatus
}

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: number
  supplier_id: number
  name: string
  description: string | null
  unit: string
  price: string // Decimal as string from JSON
  discount: string | null // Decimal as string from JSON
  stock: number
  min_order_quantity: number
  delivery_available: boolean
  pickup_available: boolean
  lead_time_days: number
  is_active: boolean
  created_at: string // ISO datetime string
}

export interface ProductCreate {
  name: string
  description?: string | null
  unit: string
  price: string // Decimal as string
  discount?: string | null
  stock?: number
  min_order_quantity?: number
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'fulfilled' | 'cancelled'

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: string // Decimal as string
  total_price: string // Decimal as string
}

export interface Order {
  id: number
  supplier_id: number
  supplier_name: string
  consumer_id: number
  consumer_name: string
  status: OrderStatus
  total_amount: string | null // Decimal as string
  delivery_method: string | null // "delivery" or "pickup"
  estimated_delivery_date: string | null // ISO datetime string
  created_by: number
  created_at: string // ISO datetime string
  items: OrderItem[]
}

export interface OrderItemCreate {
  product_id: number
  quantity: number
}

export interface OrderCreate {
  supplier_id: number
  items: OrderItemCreate[]
  delivery_method?: string | null // "delivery" or "pickup"
}

export interface OrderStatusUpdate {
  new_status: 'accepted' | 'rejected'
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: number
  supplier_id: number
  consumer_id: number
  order_id: number | null
  sender_id: number
  sender_name: string | null // Full name of sender
  sender_role: string | null // Role: "CONSUMER", "OWNER", "MANAGER", "SALES"
  text: string // Backend uses "text" in API, maps to "content" in model
  file_url: string | null
  created_at: string // ISO datetime string
}

export interface MessageCreate {
  supplier_id: number
  consumer_id: number
  order_id?: number | null
  text: string
  file_url?: string | null
}

// ============================================================================
// Complaint Types
// ============================================================================

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'escalated'

export interface Complaint {
  id: number
  order_id: number
  consumer_id: number
  supplier_id: number
  created_by: number
  handled_by: number | null
  status: ComplaintStatus
  description: string
  resolution: string | null
  created_at: string // ISO datetime string
  updated_at: string | null // ISO datetime string
}

export interface ComplaintCreate {
  order_id: number
  description: string
}

export interface ComplaintUpdate {
  status?: ComplaintStatus
  resolution?: string | null
}

// ============================================================================
// Supplier Types
// ============================================================================

export interface Supplier {
  id: number
  name: string
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  is_active: boolean
  created_at: string // ISO datetime string
}

// ============================================================================
// Consumer Types
// ============================================================================

export interface Consumer {
  id: number
  user_id: number
  organization_name: string
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  is_active: boolean
  created_at: string // ISO datetime string
}
