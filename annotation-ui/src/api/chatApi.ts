import axios from 'axios';
import { API_URL, ChatMessage, Annotation, getDefaultHeaders } from '../config/api';

// Get chat messages for a container
export async function getChatMessages(containerId: number, token: string): Promise<ChatMessage[]> {
  try {
    const response = await axios.get<ChatMessage[]>(
      `${API_URL}/projects/containers/${containerId}/messages`,
      {
        headers: getDefaultHeaders(token),
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    throw new Error('Failed to fetch chat messages');
  }
}

// Get annotations for a container
export async function getAnnotations(containerId: number, token: string): Promise<Annotation[]> {
  try {
    const response = await axios.get<Annotation[]>(
      `${API_URL}/annotations/container/${containerId}`,
      {
        headers: getDefaultHeaders(token),
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching annotations:', error);
    throw new Error('Failed to fetch annotations');
  }
}

// Create a new annotation
export async function createAnnotation(
  containerId: number, 
  messageId: number, 
  tag: string, 
  token: string
): Promise<Annotation> {
  try {
    const response = await axios.post<Annotation>(
      `${API_URL}/annotations/`,
      {
        container_id: containerId,
        message_id: messageId,
        tag,
      },
      {
        headers: getDefaultHeaders(token),
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating annotation:', error);
    throw new Error('Failed to create annotation');
  }
}

// Delete an annotation
export async function deleteAnnotation(annotationId: number, token: string): Promise<void> {
  try {
    await axios.delete(
      `${API_URL}/annotations/${annotationId}`,
      {
        headers: getDefaultHeaders(token),
      }
    );
  } catch (error) {
    console.error('Error deleting annotation:', error);
    throw new Error('Failed to delete annotation');
  }
} 