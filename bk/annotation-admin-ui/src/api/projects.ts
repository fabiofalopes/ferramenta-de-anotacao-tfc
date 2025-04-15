import { apiClient } from './client';
import { CreateProjectRequest, Project, User } from '../config/api';

export async function createProject(data: CreateProjectRequest): Promise<Project> {
    console.log('Creating project:', data);
    const response = await apiClient.post<Project>('/admin/projects', data);
    return response.data;
}

export async function listProjects(): Promise<Project[]> {
    console.log('Fetching projects list');
    const response = await apiClient.get<Project[]>('/admin/projects');
    return response.data;
}

export async function getProject(id: number): Promise<Project> {
    console.log('Fetching project details:', id);
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
}

export async function updateProject(id: number, data: Partial<CreateProjectRequest>): Promise<Project> {
    console.log('Updating project:', id, data);
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
}

export async function deleteProject(id: number): Promise<void> {
    console.log('Deleting project:', id);
    await apiClient.delete(`/admin/projects/${id}`);
}

export async function getProjectUsers(projectId: number): Promise<User[]> {
    console.log('Fetching users assigned to project:', projectId);
    const response = await apiClient.get<User[]>(`/projects/${projectId}/users`);
    return response.data;
}

export async function getAllUsers(): Promise<User[]> {
    console.log('Fetching all users');
    const response = await apiClient.get<User[]>('/admin/users');
    return response.data;
}

export async function assignUserToProject(projectId: number, userId: number): Promise<void> {
    console.log('Assigning user to project:', { projectId, userId });
    await apiClient.post(`/projects/${projectId}/assign/${userId}`);
}

export async function removeUserFromProject(projectId: number, userId: number): Promise<void> {
    console.log('Removing user from project:', { projectId, userId });
    await apiClient.delete(`/projects/${projectId}/assign/${userId}`);
} 