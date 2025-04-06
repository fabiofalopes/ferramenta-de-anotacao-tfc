import { apiClient } from './client';
import { CreateProjectRequest, Project } from '../config/api';

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
    const response = await apiClient.get<Project>(`/admin/projects/${id}`);
    return response.data;
}

export async function updateProject(id: number, data: Partial<CreateProjectRequest>): Promise<Project> {
    console.log('Updating project:', id, data);
    const response = await apiClient.put<Project>(`/admin/projects/${id}`, data);
    return response.data;
}

export async function deleteProject(id: number): Promise<void> {
    console.log('Deleting project:', id);
    await apiClient.delete(`/admin/projects/${id}`);
} 