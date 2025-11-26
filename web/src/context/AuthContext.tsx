import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

// Match backend UserOut schema
export interface SupplierRoleInfo {
  supplier_id: number
  role: 'OWNER' | 'MANAGER' | 'SALES'
}

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

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (accessToken: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
  setAccessToken: (token: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY_TOKEN = 'scp_access_token'
const STORAGE_KEY_USER = 'scp_user'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log('AuthProvider rendering...')
  const [user, setUserState] = useState<User | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    console.log('AuthProvider useEffect running...')
    try {
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN)
      const storedUser = localStorage.getItem(STORAGE_KEY_USER)
      console.log('Stored token exists:', !!storedToken)
      console.log('Stored user exists:', !!storedUser)
      
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as User
          setAccessTokenState(storedToken)
          setUserState(parsedUser)
          console.log('Restored user from localStorage')
        } catch (error) {
          console.error('Failed to parse stored user data:', error)
          // Clear corrupted data
          localStorage.removeItem(STORAGE_KEY_TOKEN)
          localStorage.removeItem(STORAGE_KEY_USER)
        }
      }
      setIsInitialized(true)
      console.log('AuthProvider initialized')
    } catch (error) {
      console.error('Error in AuthProvider useEffect:', error)
      setIsInitialized(true) // Still set initialized to prevent infinite loading
    }
  }, [])

  const login = useCallback((newToken: string, newUser: User) => {
    setAccessTokenState(newToken)
    setUserState(newUser)
    localStorage.setItem(STORAGE_KEY_TOKEN, newToken)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser))
  }, [])

  const logout = useCallback(() => {
    setAccessTokenState(null)
    setUserState(null)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_USER)
  }, [])

  const setUser = useCallback((newUser: User) => {
    setUserState(newUser)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser))
  }, [])

  const setAccessToken = useCallback((newToken: string) => {
    setAccessTokenState(newToken)
    localStorage.setItem(STORAGE_KEY_TOKEN, newToken)
  }, [])

  // Show loading state while checking localStorage
  if (!isInitialized) {
    console.log('AuthProvider: Not initialized, showing loading...')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  console.log('AuthProvider: Initialized, rendering children')

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken && !!user,
        login,
        logout,
        setUser,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hooks for role checking
export const useIsConsumer = () => {
  const { user } = useAuth()
  return user?.main_role === 'CONSUMER' || user?.consumer_id !== null
}

export const useIsSupplierStaff = () => {
  const { user } = useAuth()
  return user?.supplier_roles.length > 0 || 
         user?.main_role === 'SUPPLIER_OWNER' || 
         user?.main_role === 'SUPPLIER_MANAGER' || 
         user?.main_role === 'SUPPLIER_SALES'
}

export const useIsPlatformAdmin = () => {
  const { user } = useAuth()
  return user?.global_role === 'PLATFORM_ADMIN' || user?.main_role === 'PLATFORM_ADMIN'
}

export const useHasSupplierRole = (supplierId: number, roles?: ('OWNER' | 'MANAGER' | 'SALES')[]) => {
  const { user } = useAuth()
  if (!user) return false
  
  const supplierRole = user.supplier_roles.find(sr => sr.supplier_id === supplierId)
  if (!supplierRole) return false
  
  if (!roles) return true // Any role is fine
  return roles.includes(supplierRole.role)
}
