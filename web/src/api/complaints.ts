import apiClient from './client'

export interface Complaint {
  id: number
  order_id: number
  consumer_id: number
  supplier_id: number
  created_by: number
  handled_by: number | null
  status: 'open' | 'in_progress' | 'resolved' | 'escalated'
  description: string
  resolution: string | null
  created_at: string
  updated_at: string | null
}

export interface CreateComplaintData {
  order_id: number
  description: string
}

export interface UpdateComplaintData {
  status?: 'open' | 'in_progress' | 'resolved' | 'escalated'
  resolution?: string
}

export interface Incident {
  id: number
  complaint_id: number | null
  supplier_id: number
  summary: string
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  created_by: number
  created_at: string
  updated_at: string | null
}

export interface UpdateIncidentStatusData {
  status: 'open' | 'in_progress' | 'resolved'
}

export const complaintsApi = {
  // Get all complaints for current user
  getMyComplaints: async (): Promise<Complaint[]> => {
    const response = await apiClient.get<Complaint[]>('/complaints/my')
    return response.data
  },

  // Create a new complaint (consumer only)
  createComplaint: async (data: CreateComplaintData): Promise<Complaint> => {
    const response = await apiClient.post<Complaint>('/complaints', data)
    return response.data
  },

  // Update complaint status
  updateComplaintStatus: async (
    complaintId: number,
    status: 'open' | 'in_progress' | 'resolved' | 'escalated',
    resolution?: string
  ): Promise<Complaint> => {
    const response = await apiClient.post<Complaint>(
      `/complaints/${complaintId}/status`,
      { status, resolution }
    )
    return response.data
  },

  // Update incident status (supplier OWNER/MANAGER only)
  updateIncidentStatus: async (
    incidentId: number,
    data: UpdateIncidentStatusData
  ): Promise<Incident> => {
    const response = await apiClient.post<Incident>(
      `/complaints/incidents/${incidentId}/status`,
      data
    )
    return response.data
  },
}

