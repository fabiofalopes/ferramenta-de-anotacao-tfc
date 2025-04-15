import axios from 'axios';
import { API_URL, Project, getDefaultHeaders } from '../config/api';

// Get all projects the user has access to
export async function getProjects(token: string): Promise<Project[]> {
  try {
    const response = await axios.get<Project[]>(
      `${API_URL}/projects/`,
      {
        headers: getDefaultHeaders(token),
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw new Error('Failed to fetch projects');
  }
}

// Get a specific project by ID
export async function getProject(projectId: number, token: string): Promise<Project> {
  try {
    const response = await axios.get<Project>(
      `${API_URL}/projects/${projectId}`,
      {
        headers: getDefaultHeaders(token),
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    throw new Error('Failed to fetch project details');
  }
} 