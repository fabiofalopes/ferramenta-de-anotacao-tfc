import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Container, 
  Paper, 
  Title, 
  Text, 
  Box, 
  Group,
  Flex,
  Skeleton,
  Alert,
  ScrollArea,
  ActionIcon,
  Badge,
  Stack,
  TextInput
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconArrowLeft, IconSend, IconTag } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { getChatMessages, getAnnotations, createAnnotation } from '../api/chatApi';
import { ChatMessage, Annotation } from '../config/api';

// Helper to generate random colors for tags
const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 20) + 50;
  const lightness = Math.floor(Math.random() * 30) + 40;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function ChatView() {
  const { projectId, containerId } = useParams<{ projectId: string; containerId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [tags, setTags] = useState<Record<string, { name: string; color: string; count: number }>>({}); 
  
  // Form for creating a new tag
  const tagForm = useForm({
    initialValues: { tag: '' },
    validate: {
      tag: (value) => !value ? 'Tag name is required' : null,
    },
  });

  // Fetch chat messages
  const { 
    data: messages, 
    isLoading: messagesLoading, 
    error: messagesError 
  } = useQuery({
    queryKey: ['messages', containerId],
    queryFn: () => token ? getChatMessages(parseInt(containerId || '0'), token) : Promise.resolve([]),
    enabled: !!token && !!containerId,
  });

  // Fetch annotations
  const { 
    data: annotations, 
    isLoading: annotationsLoading, 
    error: annotationsError 
  } = useQuery({
    queryKey: ['annotations', containerId],
    queryFn: () => token ? getAnnotations(parseInt(containerId || '0'), token) : Promise.resolve([]),
    enabled: !!token && !!containerId,
  });

  // Create annotation mutation
  const createAnnotationMutation = useMutation({
    mutationFn: ({ messageId, tag }: { messageId: number; tag: string }) => {
      if (!token) throw new Error('No authentication token');
      return createAnnotation(
        parseInt(containerId || '0'),
        messageId,
        tag,
        token
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', containerId] });
      tagForm.reset();
      setSelectedMessageId(null);
    },
  });

  // Process annotations to build tags object
  useEffect(() => {
    if (!annotations) return;
    
    const newTags: Record<string, { name: string; color: string; count: number }> = {};
    
    annotations.forEach(annotation => {
      if (!newTags[annotation.tag]) {
        newTags[annotation.tag] = {
          name: annotation.tag,
          color: getRandomColor(),
          count: 1
        };
      } else {
        newTags[annotation.tag].count += 1;
      }
    });
    
    setTags(newTags);
  }, [annotations]);

  // Find tags for a message
  const getMessageTags = (messageId: number) => {
    if (!annotations) return [];
    return annotations
      .filter(a => a.id === messageId)
      .map(a => a.tag);
  };

  // Submit a new tag for the selected message
  const handleTagSubmit = (values: { tag: string }) => {
    if (!selectedMessageId) return;
    
    createAnnotationMutation.mutate({
      messageId: selectedMessageId,
      tag: values.tag.trim()
    });
  };

  // Loading state
  if (messagesLoading || annotationsLoading) {
    return (
      <Container>
        <Group mb="md">
          <ActionIcon variant="light" onClick={() => navigate(`/projects/${projectId}`)}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Skeleton height={28} width={200} />
        </Group>
        <Skeleton height={500} radius="md" />
      </Container>
    );
  }

  // Error state
  if (messagesError || annotationsError || !messages) {
    return (
      <Container>
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
        >
          Failed to load chat data. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Group justify="space-between" mb="md">
        <Group>
          <ActionIcon variant="light" onClick={() => navigate(`/projects/${projectId}`)}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Title order={3}>Chat Annotation</Title>
        </Group>
      </Group>

      <Flex>
        {/* Chat messages */}
        <Box style={{ flex: '1' }}>
          <ScrollArea h={600} type="auto">
            <Stack gap="md" p="md">
              {messages.map((message) => {
                const messageTags = getMessageTags(message.id);
                const isCurrentUserMessage = message.user_id === user?.email;
                
                return (
                  <Paper 
                    key={message.id}
                    p="md" 
                    radius="md" 
                    withBorder
                    style={{ 
                      alignSelf: isCurrentUserMessage ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      position: 'relative',
                      backgroundColor: selectedMessageId === message.id ? '#f0f9ff' : undefined,
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedMessageId(message.id)}
                  >
                    <Group gap="xs" mb="xs">
                      <Text size="xs" fw={500} c="dimmed">
                        {message.user_id}
                      </Text>
                      <Text size="xs" c="dimmed">
                        ID: {message.turn_id}
                      </Text>
                    </Group>
                    
                    <Text>{message.turn_text}</Text>
                    
                    {messageTags.length > 0 && (
                      <Group mt="sm">
                        {messageTags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            style={{ backgroundColor: tags[tag]?.color }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </Group>
                    )}
                    
                    {selectedMessageId === message.id && (
                      <ActionIcon 
                        style={{ position: 'absolute', top: 5, right: 5 }}
                        variant="transparent"
                        color="blue"
                      >
                        <IconTag size={16} />
                      </ActionIcon>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </ScrollArea>
          
          {selectedMessageId && (
            <Paper p="md" withBorder mt="sm">
              <form onSubmit={tagForm.onSubmit(handleTagSubmit)}>
                <Group>
                  <TextInput
                    placeholder="Add tag to selected message"
                    style={{ flex: 1 }}
                    {...tagForm.getInputProps('tag')}
                    rightSection={
                      <ActionIcon 
                        type="submit" 
                        variant="filled" 
                        color="blue"
                        loading={createAnnotationMutation.isPending}
                      >
                        <IconSend size={16} />
                      </ActionIcon>
                    }
                  />
                </Group>
              </form>
            </Paper>
          )}
        </Box>
        
        {/* Tags sidebar */}
        <Box w={300} ml="md">
          <Paper p="md" withBorder>
            <Title order={4} mb="md">Tags</Title>
            
            {Object.values(tags).length > 0 ? (
              <Stack gap="xs">
                {Object.values(tags).map((tag) => (
                  <Group key={tag.name}>
                    <Badge style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {tag.count} message(s)
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm">
                No tags created yet. Select a message and add a tag.
              </Text>
            )}
          </Paper>
        </Box>
      </Flex>
    </Container>
  );
} 