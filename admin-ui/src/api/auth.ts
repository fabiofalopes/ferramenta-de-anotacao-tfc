import { apiClient } from './client';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../config/api';

export async function login(data: LoginRequest): Promise<LoginResponse> {
    console.log('Making login request to:', `${apiClient.defaults.baseURL}/auth/token`);
    
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    
    try {
        const response = await apiClient.post<LoginResponse>('/auth/token', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        console.log('Login response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Login request failed:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        throw error;
    }
}

export async function register(data: RegisterRequest): Promise<User> {
    console.log('Making registration request to:', `${apiClient.defaults.baseURL}/auth/register`);
    
    try {
        const response = await apiClient.post<User>('/auth/register', data);
        console.log('Registration response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Registration request failed:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        throw error;
    }
}

// This function would be used to get the current user's details
// You might need to implement this endpoint in your backend
export async function getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
} 