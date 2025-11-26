import apiClient from './client'

export interface Message {
  id: number
  supplier_id: number
  consumer_id: number
  order_id: number | null
  sender_id: number
  text: string
  file_url: string | null
  created_at: string
}

export interface CreateMessageData {
  supplier_id: number
  consumer_id: number
  order_id?: number
  text: string
  file_url?: string
}

export const chatApi = {
  // Get messages between supplier and consumer
  getThreadMessages: async (
    supplierId: number,
    consumerId: number
  ): Promise<Message[]> => {
    const response = await apiClient.get<Message[]>(
      `/chat/threads/${supplierId}/${consumerId}`
    )
    return response.data
  },

  // Send a new message
  sendMessage: async (data: CreateMessageData): Promise<Message> => {
    const response = await apiClient.post<Message>('/chat/messages', data)
    return response.data
  },
}

