import apiClient from './client'

export interface Link {
  id: number
  supplier_id: number
  consumer_id: number
  status: 'pending' | 'accepted' | 'removed' | 'blocked'
  requested_by: number
  created_at: string
  updated_at: string | null
}

export interface CreateLinkData {
  supplier_id: number
}

export const linksApi = {
  // Get all links for current user
  getMyLinks: async (): Promise<Link[]> => {
    const response = await apiClient.get<Link[]>('/links/my-links')
    return response.data
  },

  // Create a new link request (consumer only)
  createLink: async (data: CreateLinkData): Promise<Link> => {
    const response = await apiClient.post<Link>('/links', data)
    return response.data
  },

  // Accept a link request (supplier OWNER/MANAGER only)
  acceptLink: async (linkId: number): Promise<Link> => {
    const response = await apiClient.patch<Link>(`/links/${linkId}/accept`)
    return response.data
  },

  // Decline a link request (supplier OWNER/MANAGER only)
  declineLink: async (linkId: number): Promise<Link> => {
    const response = await apiClient.patch<Link>(`/links/${linkId}/decline`)
    return response.data
  },
}

