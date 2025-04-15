import apiClient from './client';
import { ImportRequest, ImportStatus, Container } from '../config/api';

/**
 * Import data from a CSV file
 * @param file The CSV file to import
 * @param projectId ID of the project to associate the data with
 * @param containerName Name for the data container
 * @param columnMapping Mapping of CSV columns to data fields
 * @returns Import status
 */
export async function importCSV(
  file: File,
  projectId: number,
  containerName: string,
  columnMapping: Record<string, string>
): Promise<ImportStatus> {
  console.log('Importing CSV file:', file.name, 'to project:', projectId);
  console.log('Column mapping:', columnMapping);
  
  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  
  // Create import config
  const importConfig = {
    project_id: projectId,
    container_name: containerName,
    import_type: 'generic',
    column_mapping: {
      content: columnMapping.content, // Required field for main content
      type: columnMapping.type, // Optional field for item type
      metadata: {} as Record<string, string> // Additional metadata mappings
    }
  };
  
  // Add additional metadata mappings
  Object.entries(columnMapping).forEach(([fieldName, columnName]) => {
    if (fieldName !== 'content' && fieldName !== 'type') {
      importConfig.column_mapping.metadata[fieldName] = columnName;
    }
  });
  
  // Add config to form data
  const importConfigStr = JSON.stringify(importConfig);
  console.log('Import config being sent to server:', importConfigStr);
  formData.append('import_config', importConfigStr);
  
  try {
    console.log('Sending import request to:', '/import/import');
    const response = await apiClient.post<ImportStatus>('/import/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('Import response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Import error:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

/**
 * Get a list of data containers for a specific project
 * @param projectId Project ID
 * @returns List of data containers
 */
export async function getDataContainers(projectId: number): Promise<any[]> {
  console.log('Fetching data containers for project:', projectId);
  
  try {
    const response = await apiClient.get(`/data/containers/project/${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching data containers:', error);
    throw error;
  }
}

/**
 * Get items from a data container
 * @param containerId Container ID
 * @param offset Pagination offset
 * @param limit Pagination limit
 * @returns List of data items
 */
export async function getContainerItems(
  containerId: number,
  offset: number = 0,
  limit: number = 50
): Promise<any[]> {
  console.log('Fetching items for container:', containerId);
  
  try {
    const response = await apiClient.get(`/data/containers/${containerId}/items`, {
      params: { offset, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching container items:', error);
    throw error;
  }
}

export async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/import/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.filename;
}

export async function getFilePreview(filename: string): Promise<any> {
    const response = await apiClient.get(`/import/preview/${filename}`);
    return response.data;
}

export async function startImport(request: ImportRequest): Promise<ImportStatus> {
    const response = await apiClient.post('/import/import', request);
    return response.data;
}

export async function getImportStatus(importId: string): Promise<ImportStatus> {
    const response = await apiClient.get(`/import/status/${importId}`);
    return response.data;
}

export async function createContainer(projectId: number, name: string): Promise<Container> {
    const response = await apiClient.post<Container>('/containers', {
        project_id: projectId,
        name: name,
        status: 'active'
    });
    return response.data;
}

export async function getContainers(projectId: number): Promise<Container[]> {
    const response = await apiClient.get<Container[]>(`/projects/${projectId}/containers`);
    return response.data;
}

export async function getContainer(containerId: number): Promise<Container> {
    const response = await apiClient.get<Container>(`/containers/${containerId}`);
    return response.data;
}

export async function updateContainer(containerId: number, data: Partial<Container>): Promise<Container> {
    const response = await apiClient.put<Container>(`/containers/${containerId}`, data);
    return response.data;
}

export async function deleteContainer(containerId: number): Promise<void> {
    await apiClient.delete(`/containers/${containerId}`);
}

export async function getImportTypes(): Promise<string[]> {
    const response = await apiClient.get('/import/types');
    return response.data;
}

export async function getImportMapping(type: string): Promise<Record<string, string[]>> {
    const response = await apiClient.get(`/import/mapping/${type}`);
    return response.data;
} 