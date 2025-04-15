import apiClient from './client';
import { ChatMessage } from '../config/api';

interface ThreadAnnotation {
  thread_id: string;
  confidence: number;
  notes?: string;
  type: string;
  data?: Record<string, any>;
}

interface ThreadAnnotationResponse {
  id: string;
  item_id: number;
  type: string;
  data: Record<string, any>;
  created_by: number;
  created_at: string;
  updated_at: string | null;
}

/**
 * Get chat messages for a specific container
 */
export async function getContainerMessages(containerId: number, offset = 0, limit = 50): Promise<ChatMessage[]> {
  const response = await apiClient.get<ChatMessage[]>(`/containers/${containerId}/items`, {
    params: { 
      offset, 
      limit,
      type: 'chat_message'
    },
  });
  return response.data.map((item: any) => ({
    ...item,
    turn_id: item.meta_data.turn_id,
    user_id: item.meta_data.user_id,
    reply_to_turn: item.meta_data.reply_to_turn,
    timestamp: item.meta_data.timestamp
  }));
}

/**
 * Create a thread annotation for a chat message
 */
export async function createThreadAnnotation(
  itemId: number,
  annotation: ThreadAnnotation
): Promise<ThreadAnnotationResponse> {
  const response = await apiClient.post<ThreadAnnotationResponse>(
    `/items/${itemId}/annotations`,
    annotation
  );
  return response.data;
}

/**
 * Get all thread annotations for a container
 */
export async function getContainerThreads(containerId: number): Promise<Record<string, any[]>> {
  const response = await apiClient.get<Record<string, any[]>>(
    `/containers/${containerId}/annotations?type=thread`
  );
  return response.data;
}

/**
 * Create a new chat message
 */
export async function createChatMessage(containerId: number, data: {
  content: string;
  user_id: string;
  turn_id: string;
  reply_to_turn?: string;
}): Promise<ChatMessage> {
  const response = await apiClient.post<ChatMessage>(`/containers/${containerId}/items`, {
    type: 'chat_message',
    content: data.content,
    meta_data: {
      user_id: data.user_id,
      turn_id: data.turn_id,
      reply_to_turn: data.reply_to_turn,
      timestamp: new Date().toISOString()
    }
  });
  return response.data;
}