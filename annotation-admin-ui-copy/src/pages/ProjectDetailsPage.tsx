import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Title,
    Text,
    Paper,
    Stack,
    Group,
    Button,
    Loader,
    Badge,
    Tabs,
    Box,
    Divider,
    Modal,
    FileInput,
    TextInput,
    Select,
    Table,
    Alert,
    Code,
    rem,
    ActionIcon,
    Tooltip,
    Grid,
    Textarea,
    Checkbox,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
    IconArrowLeft, 
    IconPencil, 
    IconTrash, 
    IconUpload, 
    IconFileText,
    IconUserPlus,
    IconUserMinus,
    IconDeviceFloppy,
    IconX,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProject, updateProject, getProjectUsers, getAllUsers, assignUserToProject, removeUserFromProject, deleteProject } from '../api/projects';
import { importCSV, getDataContainers, getContainerItems } from '../api/import';
import { ChatView } from './ChatView';

// CSV Preview Interface
interface CSVPreview {
    headers: string[];
    rows: string[][];
}

export function ProjectDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const projectId = id ? parseInt(id) : null;

    // State for import modal
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    
    // State for edit mode
    const [editMode, setEditMode] = useState(false);
    const [usersModalOpen, setUsersModalOpen] = useState(false);
    
    // Fetch project details
    const { data: project, isLoading: isLoadingProject, error } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectId ? getProject(projectId) : Promise.reject('No project ID'),
        enabled: !!projectId,
    });

    // Fetch data containers for the project
    const { data: containers, isLoading: isLoadingContainers } = useQuery({
        queryKey: ['containers', projectId],
        queryFn: () => projectId ? getDataContainers(projectId) : Promise.reject('No project ID'),
        enabled: !!projectId,
    });

    // Query for container items (lazy loaded when container selected)
    const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
    const [selectedContainerForChat, setSelectedContainerForChat] = useState<number | null>(null);

    const { data: containerItems, isLoading: isLoadingItems, error: containerItemsError, isError: isContainerItemsError } = useQuery({
        queryKey: ['containerItems', selectedContainer],
        queryFn: () => selectedContainer ? getContainerItems(selectedContainer) : Promise.reject('No container selected'),
        enabled: !!selectedContainer,
        retry: 1, // Only retry once to avoid too many requests for non-existent containers
    });

    // Fetch project users
    const { 
        data: projectUsers, 
        isLoading: isLoadingUsers,
        refetch: refetchProjectUsers
    } = useQuery({
        queryKey: ['projectUsers', projectId],
        queryFn: () => projectId ? getProjectUsers(projectId) : Promise.reject('No project ID'),
        enabled: !!projectId,
    });
    
    // Fetch all users (for assigning)
    const { 
        data: allUsers,
        isLoading: isLoadingAllUsers 
    } = useQuery({
        queryKey: ['allUsers'],
        queryFn: () => getAllUsers(),
        enabled: usersModalOpen, // Only fetch when modal is open
    });

    // Import mutation
    const importMutation = useMutation({
        mutationFn: (data: { 
            file: File, 
            projectId: number, 
            containerName: string, 
            mappings: Record<string, string> 
        }) => {
            return importCSV(data.file, data.projectId, data.containerName, data.mappings);
        },
        onSuccess: (_, variables) => {
            notifications.show({
                title: 'Success',
                message: 'CSV file imported successfully',
                color: 'green',
            });
            
            setFile(null);
            setImportModalOpen(false);
            setMappings({});
            // Refresh containers
            queryClient.invalidateQueries({ queryKey: ['containers', variables.projectId] });
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to import data',
                color: 'red',
            });
        },
    });

    // Form for container name
    const form = useForm({
        initialValues: {
            containerName: '',
        },
        validate: {
            containerName: (value) => (!value ? 'Container name is required' : null),
        },
    });

    // Form for project editing
    const editForm = useForm({
        initialValues: {
            name: '',
            type: '',
            description: '',
        },
    });
    
    // Update form when project data is loaded
    useEffect(() => {
        if (project) {
            editForm.setValues({
                name: project.name,
                type: project.type,
                description: project.description || '',
            });
        }
    }, [project]);

    // Update project mutation
    const updateProjectMutation = useMutation({
        mutationFn: (data: any) => {
            if (!projectId) throw new Error('No project ID');
            return updateProject(projectId, data);
        },
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: 'Project updated successfully',
                color: 'green',
            });
            setEditMode(false);
            // Refresh project data
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to update project',
                color: 'red',
            });
        },
    });
    
    // Assign user to project mutation
    const assignUserMutation = useMutation({
        mutationFn: (userId: number) => {
            if (!projectId) throw new Error('No project ID');
            return assignUserToProject(projectId, userId);
        },
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: 'User assigned to project',
                color: 'green',
            });
            // Refresh users list
            refetchProjectUsers();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to assign user',
                color: 'red',
            });
        },
    });
    
    // Remove user from project mutation
    const removeUserMutation = useMutation({
        mutationFn: (userId: number) => {
            if (!projectId) throw new Error('No project ID');
            return removeUserFromProject(projectId, userId);
        },
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: 'User removed from project',
                color: 'green',
            });
            // Refresh users list
            refetchProjectUsers();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to remove user',
                color: 'red',
            });
        },
    });
    
    // Handle project update
    const handleUpdateProject = editForm.onSubmit((values) => {
        updateProjectMutation.mutate(values);
    });
    
    // Toggle edit mode
    const toggleEditMode = () => {
        if (editMode) {
            setEditMode(false);
            // Reset form to original values
            if (project) {
                editForm.setValues({
                    name: project.name,
                    type: project.type,
                    description: project.description || '',
                });
            }
        } else {
            setEditMode(true);
        }
    };

    // Parse CSV file and generate preview
    const parseCSV = (file: File): Promise<CSVPreview> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target?.result as string;
                    const lines = text.split('\n').filter(line => line.trim().length > 0);
                    
                    if (lines.length < 2) {
                        reject(new Error('CSV file must contain at least a header row and one data row'));
                        return;
                    }
                    
                    const headers = lines[0].split(',').map(h => h.trim());
                    const rows = lines.slice(1, Math.min(6, lines.length)).map(line => 
                        line.split(',').map(cell => cell.trim())
                    );
                    
                    resolve({ headers, rows });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };

    // Handle file selection
    const handleFileChange = async (selectedFile: File | null) => {
        setFile(selectedFile);
        if (selectedFile) {
            try {
                const preview = await parseCSV(selectedFile);
                setCsvPreview(preview);
                
                // Reset mappings when a new file is selected
                setMappings({});
            } catch (error) {
                notifications.show({
                    title: 'Error',
                    message: 'Failed to parse CSV file',
                    color: 'red',
                });
            }
        }
    };

    // Handle column mapping update
    const handleMappingChange = (header: string, value: string) => {
        setMappings(prev => ({
            ...prev,
            [value]: header
        }));
    };

    // Submit import form
    const handleImport = form.onSubmit((values) => {
        if (!file || !csvPreview) {
            notifications.show({
                title: 'Error',
                message: 'Please select a CSV file first',
                color: 'red',
            });
            return;
        }

        // Check if content mapping is defined
        if (!Object.values(mappings).includes('content')) {
            notifications.show({
                title: 'Error',
                message: 'You must map a column to the "content" field',
                color: 'red',
            });
            return;
        }

        // Start import
        importMutation.mutate({
            file,
            projectId: projectId!,
            containerName: values.containerName,
            mappings
        });
    });

    // Delete project mutation
    const deleteProjectMutation = useMutation({
        mutationFn: (id: number) => deleteProject(id),
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: 'Project deleted successfully',
                color: 'green',
            });
            navigate('/projects');
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to delete project',
                color: 'red',
            });
        },
    });

    const handleDeleteProject = () => {
        if (skipDeleteConfirmation) {
            deleteProjectMutation.mutate(projectId!);
        } else {
            setDeleteModalOpen(true);
        }
    };

    const confirmDelete = () => {
        if (projectId) {
            deleteProjectMutation.mutate(projectId);
            setDeleteModalOpen(false);
        }
    };

    if (isLoadingProject) {
        return (
            <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Loader size="lg" />
            </Box>
        );
    }

    if (error || !project) {
        return (
            <Paper p="xl" style={{ textAlign: 'center' }}>
                <Title order={3} mb="md">Project Not Found</Title>
                <Text c="dimmed" mb="xl">
                    The project you're looking for doesn't exist or you don't have permission to view it.
                </Text>
                <Button
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => navigate('/projects')}
                >
                    Back to Projects
                </Button>
            </Paper>
        );
    }

    return (
        <Stack gap="lg" style={{ width: '100%' }}>
            <Group justify="space-between" mb="md">
                <Button
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => navigate('/projects')}
                >
                    Back to Projects
                </Button>
                <Group>
                    <Button
                        variant="light"
                        leftSection={<IconUpload size={16} />}
                        onClick={() => setImportModalOpen(true)}
                    >
                        Import Data
                    </Button>
                    <Button
                        variant="light"
                        leftSection={<IconPencil size={16} />}
                        onClick={() => {
                            setEditMode(true);
                            if (project) {
                                editForm.setValues({
                                    name: project.name,
                                    type: project.type,
                                    description: project.description || '',
                                });
                            }
                        }}
                    >
                        Edit Project
                    </Button>
                    <Button
                        variant="light"
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        onClick={handleDeleteProject}
                    >
                        Delete Project
                    </Button>
                </Group>
            </Group>

            <Paper p="md" withBorder style={{ width: '100%' }}>
                <Group mb="md">
                    <Title order={2}>{project.name}</Title>
                    <Badge color="blue" size="lg">{project.type}</Badge>
                </Group>
                <Text mb="lg">{project.description || 'No description provided'}</Text>
                
                <Divider my="md" />
                
                <Tabs defaultValue="data">
                    <Tabs.List>
                        <Tabs.Tab value="data">Data Sources</Tabs.Tab>
                        <Tabs.Tab value="annotations">Annotations</Tabs.Tab>
                        <Tabs.Tab value="users">Users</Tabs.Tab>
                        <Tabs.Tab value="settings">Settings</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="data" pt="xs">
                        <Paper p="md" withBorder mt="md" style={{ width: '100%' }}>
                            {isLoadingContainers ? (
                                <Loader />
                            ) : !containers || containers.length === 0 ? (
                                <Stack align="center" py="xl">
                                    <Text>No data sources attached to this project.</Text>
                                    <Button 
                                        leftSection={<IconUpload size={16} />}
                                        onClick={() => setImportModalOpen(true)}
                                        mt="md"
                                    >
                                        Import Data
                                    </Button>
                                </Stack>
                            ) : (
                                <Stack>
                                    <Group justify="space-between">
                                        <Title order={4}>Data Containers</Title>
                                        <Button 
                                            leftSection={<IconUpload size={16} />} 
                                            size="sm"
                                            onClick={() => setImportModalOpen(true)}
                                        >
                                            Import More Data
                                        </Button>
                                    </Group>
                                    
                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Name</Table.Th>
                                                <Table.Th>Status</Table.Th>
                                                <Table.Th>Date Created</Table.Th>
                                                <Table.Th>Actions</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {containers.map((container: any) => (
                                                <Table.Tr key={container.id}>
                                                    <Table.Td>{container.name}</Table.Td>
                                                    <Table.Td>
                                                        <Badge 
                                                            color={container.status === 'completed' ? 'green' : 'blue'}
                                                        >
                                                            {container.status}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {new Date(container.created_at).toLocaleDateString()}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Group gap="xs">
                                                            <Button 
                                                                size="xs" 
                                                                variant="light"
                                                                onClick={() => {
                                                                    console.log(`Viewing items for container ${container.id}`);
                                                                    setSelectedContainer(container.id);
                                                                }}
                                                            >
                                                                View Items
                                                            </Button>
                                                            <Button
                                                                size="xs"
                                                                variant="light"
                                                                onClick={() => {
                                                                    console.log(`Viewing chat for container ${container.id}`);
                                                                    setSelectedContainerForChat(container.id);
                                                                    setSelectedContainer(null);
                                                                }}
                                                            >
                                                                View Chat
                                                            </Button>
                                                        </Group>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>

                                    {selectedContainer && (
                                        <Paper withBorder p="md" mt="md">
                                            <Group justify="space-between" mb="md">
                                                <Title order={4}>Items for: {containers?.find(c => c.id === selectedContainer)?.name || 'Selected Container'}</Title>
                                                <Button 
                                                    size="xs" 
                                                    variant="subtle" 
                                                    onClick={() => setSelectedContainer(null)}
                                                >
                                                    Close
                                                </Button>
                                            </Group>
                                            
                                            {isLoadingItems ? (
                                                <Loader />
                                            ) : isContainerItemsError ? (
                                                <Alert color="red" title="Error loading items">
                                                    {containerItemsError instanceof Error 
                                                        ? containerItemsError.message 
                                                        : "Failed to load container items. The container may not exist or you don't have access."}
                                                </Alert>
                                            ) : !containerItems || containerItems.length === 0 ? (
                                                <Text>No items in this container.</Text>
                                            ) : (
                                                <Table>
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>ID</Table.Th>
                                                            <Table.Th>Type</Table.Th>
                                                            <Table.Th>Content</Table.Th>
                                                            <Table.Th>Date Created</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {containerItems.map((item: any) => (
                                                            <Table.Tr key={item.id}>
                                                                <Table.Td>{item.id}</Table.Td>
                                                                <Table.Td>{item.type}</Table.Td>
                                                                <Table.Td>
                                                                    {item.content.length > 50 
                                                                        ? `${item.content.substring(0, 50)}...` 
                                                                        : item.content}
                                                                </Table.Td>
                                                                <Table.Td>
                                                                    {new Date(item.created_at).toLocaleDateString()}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        ))}
                                                    </Table.Tbody>
                                                </Table>
                                            )}
                                        </Paper>
                                    )}

                                    {selectedContainerForChat && (
                                        <Paper withBorder p="md" mt="md">
                                            <Group justify="space-between" mb="md"> 
                                                <Title order={4}>Chat for: {containers?.find(c => c.id === selectedContainerForChat)?.name || 'Selected Container'}</Title> 
                                                <Button 
                                                    size="xs" 
                                                    variant="subtle" 
                                                    onClick={() => setSelectedContainerForChat(null)}
                                                >
                                                    Close Chat
                                                </Button>
                                            </Group>
                                            <ChatView 
                                                containerId={selectedContainerForChat.toString()} 
                                                projectId={projectId?.toString()} 
                                                isEmbedded={true} 
                                            />
                                        </Paper>
                                    )}
                                </Stack>
                            )}
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="annotations" pt="xs">
                        <Paper p="md" withBorder mt="md" style={{ width: '100%' }}>
                            <Text>No annotations available yet.</Text>
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="users" pt="xs">
                        <Paper p="md" withBorder mt="md" style={{ width: '100%' }}>
                            <Text>No users assigned to this project.</Text>
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="settings" pt="xs">
                        <Paper p="md" withBorder mt="md" style={{ width: '100%' }}>
                            <Group justify="space-between" mb="xl">
                                <Title order={3}>Project Settings</Title>
                                {editMode ? (
                                    <Group>
                                        <Button
                                            variant="light"
                                            color="red"
                                            leftSection={<IconX size={16} />}
                                            onClick={toggleEditMode}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="light"
                                            color="green"
                                            leftSection={<IconDeviceFloppy size={16} />}
                                            onClick={() => handleUpdateProject()}
                                            loading={updateProjectMutation.isPending}
                                        >
                                            Save Changes
                                        </Button>
                                    </Group>
                                ) : (
                                    <Button
                                        variant="light"
                                        leftSection={<IconPencil size={16} />}
                                        onClick={toggleEditMode}
                                    >
                                        Edit Project
                                    </Button>
                                )}
                            </Group>
                            
                            {editMode ? (
                                <form onSubmit={handleUpdateProject}>
                                    <Stack gap="md">
                                        <TextInput
                                            label="Project Name"
                                            placeholder="Enter project name"
                                            required
                                            {...editForm.getInputProps('name')}
                                        />
                                        
                                        <Select
                                            label="Project Type"
                                            placeholder="Select project type"
                                            required
                                            data={[
                                                { value: 'chat_disentanglement', label: 'Chat Disentanglement' },
                                            ]}
                                            {...editForm.getInputProps('type')}
                                        />
                                        
                                        <Textarea
                                            label="Description"
                                            placeholder="Enter project description"
                                            minRows={3}
                                            {...editForm.getInputProps('description')}
                                        />
                                    </Stack>
                                </form>
                            ) : (
                                <Box>
                                    <Grid>
                                        <Grid.Col span={3}>
                                            <Text fw={500}>Name:</Text>
                                        </Grid.Col>
                                        <Grid.Col span={9}>
                                            <Text>{project.name}</Text>
                                        </Grid.Col>
                                        
                                        <Grid.Col span={3}>
                                            <Text fw={500}>Type:</Text>
                                        </Grid.Col>
                                        <Grid.Col span={9}>
                                            <Badge color="blue">{project.type}</Badge>
                                        </Grid.Col>
                                        
                                        <Grid.Col span={3}>
                                            <Text fw={500}>Description:</Text>
                                        </Grid.Col>
                                        <Grid.Col span={9}>
                                            <Text>{project.description || 'No description provided'}</Text>
                                        </Grid.Col>
                                    </Grid>
                                </Box>
                            )}
                            
                            <Divider my="lg" label="Assigned Users" labelPosition="center" />
                            
                            <Group justify="space-between" mb="md">
                                <Title order={4}>Users with Access</Title>
                                <Button
                                    variant="light"
                                    leftSection={<IconUserPlus size={16} />}
                                    onClick={() => setUsersModalOpen(true)}
                                    size="sm"
                                >
                                    Manage Users
                                </Button>
                            </Group>
                            
                            {isLoadingUsers ? (
                                <Loader />
                            ) : !projectUsers || projectUsers.length === 0 ? (
                                <Text c="dimmed">No users assigned to this project.</Text>
                            ) : (
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>ID</Table.Th>
                                            <Table.Th>Email</Table.Th>
                                            <Table.Th>Role</Table.Th>
                                            <Table.Th>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {projectUsers.map((user) => (
                                            <Table.Tr key={user.id}>
                                                <Table.Td>{user.id}</Table.Td>
                                                <Table.Td>{user.email}</Table.Td>
                                                <Table.Td>
                                                    <Badge color={user.is_admin ? 'red' : 'blue'}>
                                                        {user.is_admin ? 'Admin' : 'Annotator'}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <ActionIcon 
                                                        color="red" 
                                                        variant="light"
                                                        onClick={() => removeUserMutation.mutate(user.id)}
                                                        loading={removeUserMutation.isPending}
                                                    >
                                                        <IconUserMinus size={16} />
                                                    </ActionIcon>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            )}
                            
                            <Divider my="lg" label="Project Status" labelPosition="center" />
                            
                            <Stack>
                                <Group justify="space-between">
                                    <Text fw={500}>Created At:</Text>
                                    <Text>{new Date(project.created_at).toLocaleString()}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text fw={500}>Data Containers:</Text>
                                    <Text>{containers ? containers.length : '0'}</Text>
                                </Group>
                            </Stack>
                        </Paper>
                    </Tabs.Panel>
                </Tabs>
            </Paper>
            
            {/* Import Data Modal */}
            <Modal
                opened={importModalOpen}
                onClose={() => {
                    setImportModalOpen(false);
                    setFile(null);
                    setCsvPreview(null);
                    setMappings({});
                    form.reset();
                }}
                title={<Title order={3}>Import Data to {project.name}</Title>}
                size="md"
                centered
                overlayProps={{
                    blur: 3,
                    opacity: 0.55,
                }}
                keepMounted={false}
            >
                <Stack>
                    <Group align="flex-start">
                        <Stack style={{ flex: 1 }}>
                            <TextInput
                                label="Container Name"
                                placeholder="Name for this data import"
                                required
                                {...form.getInputProps('containerName')}
                            />
                            
                            <FileInput
                                label="CSV File"
                                placeholder="Select CSV file"
                                accept=".csv"
                                required
                                leftSection={<IconFileText size={rem(16)} />}
                                value={file}
                                onChange={handleFileChange}
                            />
                        </Stack>
                    </Group>
                    
                    {csvPreview && (
                        <>
                            <Divider label="CSV Preview" labelPosition="center" my="md" />
                            
                            <Paper withBorder p="md">
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            {csvPreview.headers.map((header, index) => (
                                                <Table.Th key={index}>{header}</Table.Th>
                                            ))}
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {csvPreview.rows.slice(0, 3).map((row, rowIndex) => (
                                            <Table.Tr key={rowIndex}>
                                                {row.map((cell, cellIndex) => (
                                                    <Table.Td key={cellIndex}>{cell}</Table.Td>
                                                ))}
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Paper>
                            
                            <Divider label="Column Mappings" labelPosition="center" my="md" />
                            
                            <Alert title="Required Mapping" color="blue" mb="md">
                                You must map at least one column to the <Code>content</Code> field.
                            </Alert>
                            
                            <Stack>
                                {csvPreview.headers.map((header, index) => (
                                    <Group key={index} grow align="center">
                                        <Text fw={500}>{header}</Text>
                                        <Select
                                            placeholder="Map to field"
                                            data={[
                                                { value: 'content', label: 'Content (Required)' },
                                                { value: 'type', label: 'Type' },
                                                { value: 'title', label: 'Title' },
                                                { value: 'category', label: 'Category' },
                                                { value: 'author', label: 'Author' },
                                                { value: 'source', label: 'Source' },
                                                { value: 'timestamp', label: 'Timestamp' },
                                            ]}
                                            value={Object.entries(mappings).find(([_, h]) => h === header)?.[0] || ''}
                                            onChange={(value) => value && handleMappingChange(header, value)}
                                        />
                                    </Group>
                                ))}
                            </Stack>
                        </>
                    )}
                    
                    <Group justify="flex-end" mt="xl">
                        <Button 
                            variant="light" 
                            onClick={() => {
                                setImportModalOpen(false);
                                setFile(null);
                                setCsvPreview(null);
                                setMappings({});
                                form.reset();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit"
                            form="import-form"
                            loading={importMutation.isPending}
                            disabled={!file || !csvPreview || !Object.values(mappings).includes('content')}
                        >
                            Import Data
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Hidden form for import submission */}
            <form id="import-form" onSubmit={handleImport} style={{ display: 'none' }} />

            {/* Users Assignment Modal */}
            <Modal
                opened={usersModalOpen}
                onClose={() => setUsersModalOpen(false)}
                title={<Title order={3}>Manage Project Users</Title>}
                size="md"
                centered
                overlayProps={{
                    blur: 3,
                    opacity: 0.55,
                }}
                keepMounted={false}
            >
                {isLoadingAllUsers ? (
                    <Loader />
                ) : !allUsers ? (
                    <Text>Error loading users.</Text>
                ) : (
                    <Stack>
                        <Title order={4}>Available Users</Title>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>ID</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Role</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {allUsers.map((user) => {
                                    const isAssigned = projectUsers?.some(pu => pu.id === user.id);
                                    return (
                                        <Table.Tr key={user.id}>
                                            <Table.Td>{user.id}</Table.Td>
                                            <Table.Td>{user.email}</Table.Td>
                                            <Table.Td>
                                                <Badge color={user.is_admin ? 'red' : 'blue'}>
                                                    {user.is_admin ? 'Admin' : 'Annotator'}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color={isAssigned ? 'green' : 'gray'}>
                                                    {isAssigned ? 'Assigned' : 'Not Assigned'}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                {isAssigned ? (
                                                    <Tooltip label="Remove from project">
                                                        <ActionIcon
                                                            color="red"
                                                            variant="light"
                                                            onClick={() => removeUserMutation.mutate(user.id)}
                                                            loading={removeUserMutation.isPending}
                                                        >
                                                            <IconUserMinus size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip label="Add to project">
                                                        <ActionIcon
                                                            color="green"
                                                            variant="light"
                                                            onClick={() => assignUserMutation.mutate(user.id)}
                                                            loading={assignUserMutation.isPending}
                                                        >
                                                            <IconUserPlus size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                        
                        <Group justify="flex-end" mt="xl">
                            <Button onClick={() => setUsersModalOpen(false)}>
                                Close
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                opened={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title={<Title order={3}>Delete Project</Title>}
                centered
                size="sm"
            >
                <Stack>
                    <Text>Are you sure you want to delete this project? This action cannot be undone.</Text>
                    
                    <Group align="center">
                        <Checkbox
                            label="Don't ask me again"
                            checked={skipDeleteConfirmation}
                            onChange={(event) => setSkipDeleteConfirmation(event.currentTarget.checked)}
                        />
                    </Group>
                    
                    <Group justify="flex-end" mt="xl">
                        <Button variant="light" onClick={() => setDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            color="red" 
                            onClick={confirmDelete}
                            loading={deleteProjectMutation.isPending}
                        >
                            Delete Project
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
} 