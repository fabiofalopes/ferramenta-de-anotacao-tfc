import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  Text, 
  Title, 
  Group, 
  Badge, 
  SimpleGrid,
  Container,
  Skeleton,
  Alert
} from '@mantine/core';
import { IconAlertCircle, IconArrowRight } from '@tabler/icons-react';
import { getProjects } from '../api/projectsApi';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../config/api';

export function ProjectsPage() {
  const { token } = useAuth();
  
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => token ? getProjects(token) : Promise.resolve([]),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <Container>
        <Title order={2} mb="xl">Projects</Title>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={200} radius="md" />
          ))}
        </SimpleGrid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Error" 
          color="red"
        >
          Failed to load projects. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Title order={2} mb="xl">Projects</Title>
      
      {projects && projects.length > 0 ? (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </SimpleGrid>
      ) : (
        <Alert title="No projects found">
          You don't have access to any projects yet.
        </Alert>
      )}
    </Container>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const date = new Date(project.created_at);
  const formattedDate = date.toLocaleDateString();

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder component={Link} to={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Group justify="space-between" mb="xs">
        <Title order={4}>{project.name}</Title>
        <IconArrowRight size={18} />
      </Group>
      
      <Text size="sm" c="dimmed" mb="md" lineClamp={3}>
        {project.description}
      </Text>
      
      <Group mt="md">
        <Badge size="sm">Created: {formattedDate}</Badge>
      </Group>
    </Card>
  );
} 