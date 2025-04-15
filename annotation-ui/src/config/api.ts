// API configuration

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
}

export interface Annotation {
  id: number;
  text: string;
  container_id: number;
  tag: string;
  created_at: string;
  created_by: string;
}

export interface ChatMessage {
  id: number;
  turn_id: string;
  turn_text: string;
  user_id: string;
  thread?: string;
  reply_to_turn?: string;
  container_id: number;
  tags?: string[];
}

// API URL from environment variable
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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