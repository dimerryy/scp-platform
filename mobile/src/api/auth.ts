import apiClient from './client'
import { saveAuth } from './authStorage'
import type { User, LoginResponse } from '../types/api'

/**
 * Auth API functions
 * These match the FastAPI endpoints in ../backend/app/routers/auth.py
 */

/**
 * Login with email and password
 * 
 * Backend endpoint: POST /auth/login
 * Uses OAuth2PasswordRequestForm (form data with username/password)
 * Returns: { access_token, token_type, user }
 */
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  // Backend expects form data (application/x-www-form-urlencoded)
  const formData = new URLSearchParams()
  formData.append('username', email) // OAuth2PasswordRequestForm uses 'username' field
  formData.append('password', password)

  // Add platform parameter to restrict access by role
  const response = await apiClient.post<LoginResponse>(
    '/auth/login?platform=mobile',
    formData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  // Validate response data before returning
  if (!response.data || !response.data.access_token || !response.data.user) {
    throw new Error('Invalid login response: missing required fields')
  }

  return response.data
}

/**
 * Register a new user
 * 
 * Backend endpoint: POST /auth/register
 * Body: { email, password, full_name }
 * Returns: UserResponse (basic user info)
 * 
 * Note: This only creates the user account. To become a consumer or supplier staff,
 * additional steps are required (see registerConsumer and registerSales).
 */
export const register = async (
  email: string,
  password: string,
  fullName: string
): Promise<{ id: number; email: string; full_name: string; is_active: boolean; created_at: string }> => {
    try { const response = await apiClient.post('/auth/register', {
    email,
    password,
    full_name: fullName,
  })

  return response.data
} catch (err: any) {
    console.log("REGISTER ERROR:", err?.toJSON?.() ?? err);
    throw err;
  }
}

/**
 * Register as a Consumer (two-step process)
 * 
 * Step 1: Register user via /auth/register
 * Step 2: Create consumer profile via /consumers (requires authentication)
 * 
 * This function performs both steps and returns the login response.
 */
export const registerConsumer = async (
  email: string,
  password: string,
  fullName: string,
  organizationName: string,
  contactEmail?: string,
  contactPhone?: string,
  address?: string
): Promise<LoginResponse> => {
  // Step 1: Register user
  const userResponse = await register(email, password, fullName)

  // Step 2: Login to get token (needed for authenticated consumer creation)
  const loginResponse = await login(email, password)

  // Step 3: Create consumer profile (requires authentication)
  // Save auth temporarily so the API client can use the token
  await saveAuth(loginResponse.access_token, loginResponse.user)

  try {
    await apiClient.post('/consumers', {
      organization_name: organizationName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      address: address,
    })

    // Re-login to get updated user info with consumer_id
    const updatedLoginResponse = await login(email, password)
    return updatedLoginResponse
  } catch (error) {
    // If consumer creation fails, we still have a user account
    // Return the login response anyway - user can create consumer profile later
    console.error('Failed to create consumer profile:', error)
    return loginResponse
  }
}

/**
 * Register as Sales staff
 * 
 * NOTE: The backend does not have a dedicated endpoint for sales registration.
 * The flow is:
 * 1. Register user via /auth/register
 * 2. Supplier Owner adds the user as staff via /suppliers/{supplier_id}/staff
 * 
 * This function only performs step 1 (user registration).
 * The user must then be added as staff by a supplier owner.
 * 
 * Alternative: If you have a supplier code/invite system, you could implement
 * that here. For now, this is a stub that registers the user.
 */
export const registerSales = async (
  email: string,
  password: string,
  fullName: string,
  supplierId?: number
): Promise<{ id: number; email: string; full_name: string; is_active: boolean; created_at: string }> => {
  // Step 1: Register user
  const userResponse = await register(email, password, fullName)

  // TODO: Step 2 would require supplier owner to add this user as staff
  // via POST /suppliers/{supplier_id}/staff with { email, role: "SALES" }
  // This cannot be done by the user themselves - it requires owner permission.
  // 
  // If you have an invite code system, implement it here.
  // Otherwise, the user will need to contact the supplier owner.

  return userResponse
}

