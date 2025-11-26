import apiClient from './client'
import type { Message, MessageCreate } from '../types/api'

/**
 * Chat API functions
 * These match the FastAPI endpoints in ../backend/app/routers/chat.py
 */

/**
 * Get messages in a thread between supplier and consumer
 * 
 * Backend endpoint: GET /chat/threads/{supplier_id}/{consumer_id}
 * Returns: List[MessageResponse]
 * 
 * Messages are ordered by time (ascending)
 * Requires: ACCEPTED link between supplier and consumer
 */
export const getThread = async (
  supplierId: number,
  consumerId: number
): Promise<Message[]> => {
  const response = await apiClient.get<Message[]>(
    `/chat/threads/${supplierId}/${consumerId}`
  )
  return response.data
}

/**
 * Send a message in a thread
 * 
 * Backend endpoint: POST /chat/messages
 * Body: { supplier_id, consumer_id, text, order_id?, file_url? }
 * Returns: MessageResponse
 * 
 * Requires: ACCEPTED link between supplier and consumer
 * Current user must be either the consumer or supplier staff
 */
export const sendMessage = async (messageData: MessageCreate): Promise<Message> => {
  const response = await apiClient.post<Message>('/chat/messages', messageData)
  return response.data
}

