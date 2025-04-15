import { apiClient } from './client';
import { Message, ThreadAnnotation } from '../config/api';

export async function getMessages(containerId: string, page: number): Promise<Message[]> {
    const PAGE_SIZE = 20;
    const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString()
    });
    const url = `/chat-disentanglement/containers/${containerId}/messages/?${params.toString()}`;
    console.log(`getMessages: fetching ${url}`);
    const response = await apiClient.get<Message[]>(url);
    return response.data;
}

export async function createAnnotation(data: {
    message_id: number;
    thread_id: string;
    confidence: number;
    notes: string;
}): Promise<ThreadAnnotation> {
    const response = await apiClient.post<ThreadAnnotation>(
        `/chat-disentanglement/messages/${data.message_id}/thread`,
        {
            thread_id: data.thread_id,
            confidence: data.confidence,
            notes: data.notes,
            type: "thread",
            data: {
                tag: "CHAT"
            }
        }
    );
    return response.data;
}

export async function getThreadAnnotations(containerId: string): Promise<Record<string, any[]>> {
    const response = await apiClient.get(`/chat-disentanglement/containers/${containerId}/threads`);
    return response.data;
} 