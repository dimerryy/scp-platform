import apiClient from './client'
import type { Link, LinkStatus } from '../types/api'

/**
 * Links API functions
 * These match the FastAPI endpoints in ../backend/app/routers/links.py
 */

/**
 * Get all links for the current user
 * 
 * Backend endpoint: GET /links/my
 * Returns: List[LinkResponse]
 * 
 * For consumers: returns links where they are the consumer
 * For supplier staff: returns links for their supplier(s)
 */
export const getMyLinks = async (): Promise<Link[]> => {
  const response = await apiClient.get<Link[]>('/links/my')
  return response.data
}

/**
 * Create a link request from consumer to supplier
 * 
 * Backend endpoint: POST /links/
 * Body: { supplier_id: number }
 * Returns: LinkResponse
 * 
 * Note: Only consumers can create link requests
 */
export const createLinkRequest = async (supplierId: number): Promise<Link> => {
  const response = await apiClient.post<Link>('/links', {
    supplier_id: supplierId,
  })
  return response.data
}

/**
 * Update link status
 * 
 * Backend endpoint: POST /links/{link_id}/status
 * Body: { status: LinkStatus }
 * Returns: LinkResponse
 * 
 * Status values: 'pending', 'accepted', 'rejected', 'blocked', 'removed'
 * 
 * Permission rules:
 * - Supplier Owner/Manager can: accept, reject, block, remove
 * - Consumer can: remove (only if link is accepted)
 */
export const updateLinkStatus = async (
  linkId: number,
  status: LinkStatus
): Promise<Link> => {
  const response = await apiClient.post<Link>(`/links/${linkId}/status`, {
    status,
  })
  return response.data
}

