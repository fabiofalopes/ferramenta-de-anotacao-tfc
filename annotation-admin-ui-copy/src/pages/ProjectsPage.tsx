import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Title,
    Button,
    Group,
    Card,
    Text,
    Modal,
    TextInput,
    Textarea,
    Select,
    LoadingOverlay,
    Stack,
    Paper,
    Grid,
    Badge,
    Box,
    ActionIcon,
    Tooltip,
    useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { listProjects, createProject, deleteProject } from '../api/projects';
import { CreateProjectRequest, Project } from '../config/api';
import { useNavigate } from 'react-router-dom';

export function ProjectsPage() {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const queryClient = useQueryClient();
    const theme = useMantineTheme();
    const navigate = useNavigate();

    // Fetch projects
    const { data: projects, isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: listProjects,
    });

    // Create project mutation
    const createProjectMutation = useMutation({
        mutationFn: createProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setCreateModalOpen(false);
            form.reset();
            notifications.show({
                title: 'Success',
                message: 'Project created successfully',
                color: 'green',
            });
        },
        onError: (error: any) => {
            console.error('Create project error:', error);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to create project',
                color: 'red',
            });
        },
    });

    // Delete project mutation
    const deleteProjectMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            notifications.show({
                title: 'Success',
                message: 'Project deleted successfully',
                color: 'green',
            });
        },
        onError: (error: any) => {
            console.error('Delete project error:', error);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to delete project',
                color: 'red',
            });
        },
    });

    // Create project form
    const form = useForm<CreateProjectRequest>({
        initialValues: {
            name: '',
            type: 'chat_disentanglement',
            description: '',
        },
        validate: {
            name: (value) => (!value ? 'Name is required' : null),
            type: (value) => (!value ? 'Type is required' : null),
        },
    });

    const handleCreateProject = form.onSubmit((values) => {
        console.log('Creating project with values:', values);
        createProjectMutation.mutate(values);
    });

    const handleDeleteProject = (project: Project) => {
        if (window.confirm(`Are you sure you want to delete project "${project.name}"?`)) {
            deleteProjectMutation.mutate(project.id);
        }
    };

    const handleViewProject = (projectId: number) => {
        navigate(`/projects/${projectId}`);
    };

    return (
        <Stack gap="lg" style={{ width: '100%' }}>
            <Paper p="md" radius="sm" withBorder>
                <Group justify="space-between" mb="lg">
                    <div>
                        <Title order={2} mb={5}>Projects</Title>
                        <Text c="dimmed" size="sm">Manage your annotation projects</Text>
                    </div>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => setCreateModalOpen(true)}
                        variant="filled"
                    >
                        Create Project
                    </Button>
                </Group>

                {isLoading ? (
                    <Box pos="relative" h={200}>
                        <LoadingOverlay visible />
                    </Box>
                ) : !projects?.length ? (
                    <Paper 
                        p="xl" 
                        bg={theme.colors.gray[0]} 
                        style={{ textAlign: 'center' }}
                    >
                        <Text size="lg" fw={500} c="dimmed">No projects yet</Text>
                        <Text size="sm" c="dimmed" mb="lg">
                            Create your first project to get started
                        </Text>
                        <Button
                            leftSection={<IconPlus size={16} />}
                            onClick={() => setCreateModalOpen(true)}
                            variant="light"
                        >
                            Create Project
                        </Button>
                    </Paper>
                ) : (
                    <Grid>
                        {projects?.map((project) => (
                            <Grid.Col key={project.id} span={{ base: 12, xs: 6, lg: 4, xl: 3 }}>
                                <Card 
                                    withBorder 
                                    padding="lg" 
                                    radius="md"
                                    style={{ 
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    }}
                                    onClick={() => handleViewProject(project.id)}
                                >
                                    <Stack gap="sm" justify="space-between" h="100%">
                                        <Box>
                                            <Text fw={500} size="lg" mb="xs">
                                                {project.name}
                                            </Text>
                                            <Badge 
                                                color="blue" 
                                                variant="light"
                                                mb="sm"
                                            >
                                                {project.type}
                                            </Badge>
                                            <Text 
                                                size="sm" 
                                                c="dimmed" 
                                                style={{ 
                                                    minHeight: '2.5em',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {project.description || 'No description provided'}
                                            </Text>
                                        </Box>
                                        <Group gap="xs" justify="flex-end">
                                            <Tooltip label="Delete project">
                                                <ActionIcon
                                                    variant="light"
                                                    color="red"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteProject(project);
                                                    }}
                                                    size="lg"
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Stack>
                                </Card>
                            </Grid.Col>
                        ))}
                    </Grid>
                )}
            </Paper>

            <Modal
                opened={createModalOpen}
                onClose={() => {
                    setCreateModalOpen(false);
                    form.reset();
                }}
                title={
                    <Title order={3}>Create New Project</Title>
                }
                centered
                size="md"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
            >
                <form onSubmit={handleCreateProject}>
                    <Stack gap="md">
                        <TextInput
                            label="Project Name"
                            placeholder="Enter project name"
                            required
                            {...form.getInputProps('name')}
                        />
                        
                        <Select
                            label="Project Type"
                            placeholder="Select project type"
                            required
                            data={[
                                { value: 'chat_disentanglement', label: 'Chat Disentanglement' },
                            ]}
                            {...form.getInputProps('type')}
                        />
                        
                        <Textarea
                            label="Description"
                            placeholder="Enter project description"
                            minRows={3}
                            maxRows={5}
                            autosize
                            {...form.getInputProps('description')}
                        />
                        
                        <Group justify="flex-end" mt="xl">
                            <Button 
                                variant="light" 
                                onClick={() => {
                                    setCreateModalOpen(false);
                                    form.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                loading={createProjectMutation.isPending}
                            >
                                Create Project
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    );
} 