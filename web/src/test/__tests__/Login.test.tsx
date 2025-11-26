/**
 * Tests for Login page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from '../../pages/Login'
import { AuthProvider } from '../../context/AuthContext'
import apiClient from '../../api/client'

// Mock API client
vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

const mockApiClient = apiClient as any

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    renderLogin()

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('should show error on failed login', async () => {
    mockApiClient.post.mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } },
    })

    renderLogin()

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('should call login API on form submit', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true,
      global_role: null,
      supplier_roles: [],
      consumer_id: null,
      main_role: 'USER',
    }

    mockApiClient.post.mockResolvedValue({
      data: {
        access_token: 'test-token',
        token_type: 'bearer',
        user: mockUser,
      },
    })

    renderLogin()

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      )
    })
  })
})

