import { apiClient } from './client';
import { Message } from '../config/api';

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
 * Get messages for a specific container
 */
export async function getContainerMessages(containerId: number, offset = 0, limit = 50): Promise<Message[]> {
  const response = await apiClient.get<Message[]>(`/chat-disentanglement/containers/${containerId}/messages`, {
    params: { offset, limit },
  });
  return response.data;
}

/**
 * Create a thread annotation for a message
 */
export async function createThreadAnnotation(
  messageId: number,
  annotation: ThreadAnnotation
): Promise<ThreadAnnotationResponse> {
  const response = await apiClient.post<ThreadAnnotationResponse>(
    `/chat-disentanglement/messages/${messageId}/thread`,
    annotation
  );
  return response.data;
}

/**
 * Get all thread annotations for a container
 */
export async function getContainerThreads(containerId: number): Promise<Record<string, any[]>> {
  const response = await apiClient.get<Record<string, any[]>>(
    `/chat-disentanglement/containers/${containerId}/threads`
  );
  return response.data;
}