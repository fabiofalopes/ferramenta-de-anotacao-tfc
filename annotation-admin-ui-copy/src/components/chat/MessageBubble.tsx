import { Paper, Text, Group, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';

interface Message {
  id: string;
  turn_id: string;
  turn_text: string;
  user_id: string;
  timestamp: string;
}

interface ThreadAnnotation {
  id: string;
  thread_id: string;
  type: string;
  confidence: number;
  notes?: string;
  data?: Record<string, any>;
}

interface MessageBubbleProps {
  message: Message;
  annotations?: ThreadAnnotation[];
  isCurrentUser: boolean;
  onAnnotate: (message: Message) => void;
}

export function MessageBubble({ message, annotations = [], isCurrentUser, onAnnotate }: MessageBubbleProps) {
  return (
    <Paper
      p="sm"
      radius="md"
      bg={isCurrentUser ? 'blue.1' : 'gray.0'}
      style={{
        alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
        maxWidth: '75%',
        position: 'relative',
      }}
    >
      <Group justify="space-between" mb={5}>
        <Group gap="xs">
          <Text size="sm" fw={500}>
            {message.user_id}
          </Text>
          {annotations.length > 0 && (
            <Badge size="sm" variant="filled" color="green">
              {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </Group>
        <Tooltip label="Add annotation">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation();
              onAnnotate(message);
            }}
          >
            <IconPencil size="1rem" />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Text size="md">{message.turn_text}</Text>
      <Text size="xs" c="dimmed" mt={5}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </Text>
    </Paper>
  );
}
