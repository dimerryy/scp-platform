import apiClient from './client'
import type { Complaint, ComplaintCreate } from '../types/api'

/**
 * Complaints API functions
 * These match the FastAPI endpoints in ../backend/app/routers/complaints.py
 */

/**
 * Get complaints for the current user
 * 
 * Backend endpoint: GET /complaints/my
 * Returns: List[ComplaintResponse]
 * 
 * For consumers: Returns complaints on their orders
 * For supplier staff: Returns complaints for their supplier(s)
 */
export const getMyComplaints = async (): Promise<Complaint[]> => {
  const response = await apiClient.get<Complaint[]>('/complaints/my')
  return response.data
}

/**
 * Create a new complaint (consumer only)
 * 
 * Backend endpoint: POST /complaints/
 * Body: { order_id, description }
 * Returns: ComplaintResponse
 * 
 * Requires: User must be a consumer
 * Validates: Order must belong to the consumer
 * Automatically creates an associated Incident
 */
export const createComplaint = async (
  payload: ComplaintCreate
): Promise<Complaint> => {
  // Use /complaints without trailing slash to avoid 307 redirects
  const response = await apiClient.post<Complaint>('/complaints', payload)
  return response.data
}

/**
 * Update complaint status
 * 
 * Backend endpoint: POST /complaints/{complaint_id}/status
 * Body: { status, resolution? }
 * Returns: ComplaintResponse
 * 
 * - Sales can change status to: in_progress, resolved, escalated
 * - Manager/Owner can change escalated complaints to: resolved
 */
export const updateComplaintStatus = async (
  complaintId: number,
  status: string,
  resolution?: string
): Promise<Complaint> => {
  const response = await apiClient.post<Complaint>(`/complaints/${complaintId}/status`, {
    status,
    resolution,
  })
  return response.data
}

/**
 * Escalate a complaint (Sales staff only) - convenience endpoint
 * 
 * Backend endpoint: POST /complaints/{complaint_id}/escalate
 * Returns: ComplaintResponse
 * 
 * Escalates complaint to Manager for resolution
 */
export const escalateComplaint = async (complaintId: number): Promise<Complaint> => {
  const response = await apiClient.post<Complaint>(`/complaints/${complaintId}/escalate`)
  return response.data
}

