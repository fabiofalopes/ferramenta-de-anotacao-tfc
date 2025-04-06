import { useState } from 'react';
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
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
    IconArrowLeft, 
    IconPencil, 
    IconTrash, 
    IconUpload, 
    IconFileText 
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProject } from '../api/projects';
import { importCSV, getDataContainers, getContainerItems } from '../api/import';

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
    const [file, setFile] = useState<File | null>(null);
    const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    
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

    const { data: containerItems, isLoading: isLoadingItems } = useQuery({
        queryKey: ['containerItems', selectedContainer],
        queryFn: () => selectedContainer ? getContainerItems(selectedContainer) : Promise.reject('No container selected'),
        enabled: !!selectedContainer,
    });

    // Import mutation
    const importMutation = useMutation({
        mutationFn: (data: { 
            file: File, 
            containerName: string, 
            mappings: Record<string, string> 
        }) => {
            if (!projectId) throw new Error('No project ID');
            return importCSV(
                data.file,
                projectId,
                data.containerName,
                data.mappings
            );
        },
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: 'Data imported successfully',
                color: 'green',
            });
            setImportModalOpen(false);
            // Reset form state
            setFile(null);
            setCsvPreview(null);
            setMappings({});
            // Refresh containers
            queryClient.invalidateQueries({ queryKey: ['containers', projectId] });
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
            containerName: values.containerName,
            mappings
        });
    });

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
                    >
                        Edit Project
                    </Button>
                    <Button
                        variant="light"
                        color="red"
                        leftSection={<IconTrash size={16} />}
                    >
                        Delete Project
                    </Button>
                </Group>
            </Group>

            <Paper p="md" withBorder>
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
                        <Paper p="md" withBorder mt="md">
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
                                                        <Button 
                                                            size="xs" 
                                                            variant="light"
                                                            onClick={() => setSelectedContainer(container.id)}
                                                        >
                                                            View Items
                                                        </Button>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>

                                    {selectedContainer && (
                                        <Paper withBorder p="md" mt="md">
                                            <Title order={4} mb="md">Container Items</Title>
                                            
                                            {isLoadingItems ? (
                                                <Loader />
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
                                </Stack>
                            )}
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="annotations" pt="xs">
                        <Paper p="md" withBorder mt="md">
                            <Text>No annotations available yet.</Text>
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="users" pt="xs">
                        <Paper p="md" withBorder mt="md">
                            <Text>No users assigned to this project.</Text>
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="settings" pt="xs">
                        <Paper p="md" withBorder mt="md">
                            <Text>Project settings will be available soon.</Text>
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
                size="lg"
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
        </Stack>
    );
} 