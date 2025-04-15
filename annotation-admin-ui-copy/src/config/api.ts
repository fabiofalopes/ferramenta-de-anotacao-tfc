// API configuration
let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// If the URL contains annotation-backend and we're in a browser, replace it with localhost
if (typeof window !== 'undefined' && apiUrl.includes('annotation-backend')) {
  apiUrl = apiUrl.replace('annotation-backend', 'localhost');
}

export const API_URL = apiUrl;

// API Response Types
export interface User {
    id: number;
    email: string;
    is_admin: boolean;
}

export interface Project {
    id: number;
    name: string;
    description: string;
    created_at: string;
    type: string;
}

export interface Container {
    id: number;
    name: string;
    project_id: number;
    status: string;
}

export interface Message {
    id: number;
    turn_id?: string;
    user_id: string;
    content: string;
    reply_to_turn?: string;
    type?: string;
    created_at: string;
    container_id: number;
    meta_data?: Record<string, any>;
    timestamp?: string;
    turn_text?: string;
}

export interface ThreadAnnotation {
    id: number;
    message_id: number;
    confidence: number;
    notes: string;
    created_at: string;
    created_by: number;
}

// API Error Response
export interface APIError {
    detail: string;
}

// Auth Types
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    is_admin: boolean;
}

// Project Types
export interface CreateProjectRequest {
    name: string;
    type: string;
    description: string;
}

// Import Types
export interface ImportRequest {
    project_id: number;
    container_name: string;
    import_type: string;
    column_mapping: {
        user_id: string;
        turn_id: string;
        content: string;
        reply_to_turn: string;
        timestamp?: string;
        title?: string;
        category?: string;
        source?: string;
    };
}

export interface ImportStatus {
    id: string;
    status: string;
    progress: number;
    total_rows: number;
    processed_rows: number;
    errors: string[];
    warnings: string[];
}

export interface DataItem {
    id: number;
    type: string;
    content: string;
    container_id: number;
    created_at: string;
    meta_data: Record<string, any>;
}

export interface ChatMessage extends DataItem {
    turn_id: string;
    user_id: string;
    reply_to_turn?: string;
    timestamp: string;
}

export interface ImportedData extends DataItem {
    title: string;
    category: string;
    source: string;
}

// Default headers for API requests
export const getDefaultHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}; 