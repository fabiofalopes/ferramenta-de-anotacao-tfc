import apiClient from './client';

// Get containers for a project
export async function listContainers(projectId: number) {
  const response = await apiClient.get(`/projects/${projectId}/containers`);
  return response.data;
} 