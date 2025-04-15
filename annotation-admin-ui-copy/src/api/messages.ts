import apiClient from './client';
import { DataItem, ChatMessage, ThreadAnnotation } from '../config/api';

export async function getMessages(containerId: string, page: number): Promise<ChatMessage[]> {
    const PAGE_SIZE = 20;
    const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString()
    });
    const url = `/chat-disentanglement/containers/${containerId}/messages?${params.toString()}`;
    console.log(`getMessages: fetching ${url}`);
    try {
        const response = await apiClient.get<ChatMessage[]>(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
    }
}

export async function createAnnotation(data: {
    item_id: number;
    thread_id: string;
    confidence: number;
    notes: string;
}): Promise<ThreadAnnotation> {
    const url = `/chat-disentanglement/messages/${data.item_id}/thread`;
    console.log(`createAnnotation: posting to ${url}`, data);
    try {
        const response = await apiClient.post<ThreadAnnotation>(
            url,
            {
                type: "thread",
                thread_id: data.thread_id.trim(),
                confidence: data.confidence,
                notes: data.notes?.trim() || undefined,
                data: {
                    tag: "CHAT"
                }
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Error creating annotation:', error.response || error);
        if (error.response?.status === 422) {
            const detail = error.response.data?.detail;
            if (Array.isArray(detail)) {
                error.message = detail.map(err => err.msg).join('\n');
            } else if (typeof detail === 'object') {
                error.message = Object.entries(detail)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join('\n');
            } else {
                error.message = detail || 'Invalid data format';
            }
        }
        throw error;
    }
}

export async function getThreadAnnotations(containerId: string): Promise<Record<string, any[]>> {
    const url = `/chat-disentanglement/containers/${containerId}/threads`;
    console.log(`getThreadAnnotations: fetching ${url}`);
    try {
        const response = await apiClient.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching thread annotations:', error);
        throw error;
    }
}

export async function getDataItems(containerId: string, type?: string, page: number = 0): Promise<DataItem[]> {
    const PAGE_SIZE = 20;
    const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString()
    });
    if (type) {
        params.append('type', type);
    }
    const url = `/data/containers/${containerId}/items?${params.toString()}`;
    console.log(`getDataItems: fetching ${url}`);
    try {
        const response = await apiClient.get<DataItem[]>(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching data items:', error);
        throw error;
    }
} 