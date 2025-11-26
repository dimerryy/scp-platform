// Re-export API types for convenience
export type { User, SupplierRoleInfo, LoginResponse } from './api'

// Navigation types
export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}

export type AppStackParamList = {
  Dashboard: undefined
  Links: undefined
  Catalog: undefined
  Orders: undefined
  ChatList: undefined
  ChatThread: {
    supplierId: number
    consumerId: number
  }
  Complaints: undefined
}

