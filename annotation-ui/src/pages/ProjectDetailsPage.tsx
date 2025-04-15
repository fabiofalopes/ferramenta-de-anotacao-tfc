import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Title,
  Text,
  Box,
  Alert,
  Skeleton,
  Group,
  Button,
  Card,
  Badge,
  SimpleGrid,
} from '@mantine/core';
import { IconAlertCircle, IconMessageCircle } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { getProject } from '../api/projectsApi';

interface DataContainer {
  id: number;
  name: string;
  description: string;
  created_at: string;
  message_count: number;
}

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const projectId = parseInt(id || '0');

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => token ? getProject(projectId, token) : Promise.reject('No token'),
    enabled: !!token && !!projectId,
  });

  if (isLoading) {
    return (
      <Container>
        <Skeleton height={40} width={200} mb="xl" />
        <Skeleton height={20} width="70%" mb="md" />
        <Skeleton height={20} width="50%" mb="xl" />
        <Skeleton height={400} mb="md" />
      </Container>
    );
  }

  if (error || !project) {
    return (
      <Container>
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
        >
          Failed to load project details. Please try again later.
        </Alert>
      </Container>
    );
  }

  // Mock containers for demo - in real app these would come from the API
  const mockContainers: DataContainer[] = [
    {
      id: 1,
      name: 'Conversation 1',
      description: 'Chat data from user session 1',
      created_at: new Date().toISOString(),
      message_count: 42
    },
    {
      id: 2,
      name: 'Conversation 2',
      description: 'Chat data from user session 2',
      created_at: new Date().toISOString(),
      message_count: 28
    }
  ];

  return (
    <Container>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>{project.name}</Title>
          <Text c="dimmed">{project.description}</Text>
        </div>
        <Button variant="light" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Group>

      <Box mb="xl">
        <Title order={3} mb="md">Conversations</Title>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          {mockContainers.map((container) => (
            <Card key={container.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Title order={4}>{container.name}</Title>
                <Badge>{container.message_count} messages</Badge>
              </Group>
              
              <Text size="sm" c="dimmed" mb="xl">
                {container.description}
              </Text>
              
              <Button 
                leftSection={<IconMessageCircle size={14} />}
                variant="light"
                fullWidth
                onClick={() => navigate(`/projects/${projectId}/chat/${container.id}`)}
              >
                View & Annotate
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      </Box>
    </Container>
  );
} 