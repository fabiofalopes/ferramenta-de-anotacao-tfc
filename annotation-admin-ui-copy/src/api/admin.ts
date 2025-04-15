import apiClient from './client';
import { User } from '../config/api';

export async function getUsers(): Promise<User[]> {
    console.log('Fetching users from admin endpoint');
    try {
        const response = await apiClient.get<User[]>('/admin/users');
        console.log('Users fetched:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
} 