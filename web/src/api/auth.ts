import apiClient from './client'

// Simple auth module to get token
export const getToken = (): string | null => {
  return localStorage.getItem('token')
}

export const setToken = (token: string): void => {
  localStorage.setItem('token', token)
}

export const removeToken = (): void => {
  localStorage.removeItem('token')
}

// Auth API helpers
export interface RegisterData {
  email: string
  password: string
  full_name: string
  user_type: 'supplier' | 'consumer'
}

export interface LoginData {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface User {
  id: number
  email: string
  full_name: string
  user_type: 'supplier' | 'consumer'
  is_active: boolean
  created_at: string
}

export const authApi = {
  register: async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', data)
    return response.data
  },

  login: async (data: LoginData): Promise<TokenResponse> => {
    const params = new URLSearchParams()
    params.append('username', data.username)
    params.append('password', data.password)

    const response = await apiClient.post<TokenResponse>('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },
}
