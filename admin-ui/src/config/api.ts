export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// API Response Types
export interface User {
    id: number;
    email: string;
    is_admin: boolean;
}

export interface Project {
    id: number;
    name: string;
    type: string;
    description: string;
}

export interface Container {
    id: number;
    name: string;
    project_id: number;
}

export interface Message {
    id: number;
    user_id: string;
    turn_id: string;
    turn_text: string;
    reply_to_turn: string;
    container_id: number;
}

export interface ThreadAnnotation {
    thread_id: string;
    confidence: number;
    notes: string;
    type: string;
    data: Record<string, any>;
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
        turn_text: string;
        reply_to_turn: string;
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