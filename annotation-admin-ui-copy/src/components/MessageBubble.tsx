import { Paper, Text, Group, Button, Badge, Stack, Box } from '@mantine/core';
import { ChatMessage } from '../config/api';

interface MessageBubbleProps {
    message: ChatMessage;
    onAnnotate: (message: ChatMessage) => void;
    isReply?: boolean;
    threadId?: string;
}

export function MessageBubble({ message, onAnnotate, isReply = false, threadId }: MessageBubbleProps) {
    return (
        <Box ml={isReply ? 'xl' : 0}>
            <Paper p="md" withBorder style={{ borderLeft: threadId ? `4px solid var(--mantine-color-blue-6)` : undefined }}>
                <Group justify="space-between" mb="xs">
                    <Stack gap="xs">
                        <Group gap="xs">
                            <Text size="sm" fw={500}>User:</Text>
                            <Text size="sm">{message.user_id}</Text>
                        </Group>
                        {message.turn_id && (
                            <Group gap="xs">
                                <Text size="sm" fw={500}>Turn ID:</Text>
                                <Text size="sm">{message.turn_id}</Text>
                            </Group>
                        )}
                        {message.reply_to_turn && (
                            <Group gap="xs">
                                <Text size="sm" fw={500}>Reply to:</Text>
                                <Text size="sm">{message.reply_to_turn}</Text>
                            </Group>
                        )}
                        {threadId && (
                            <Group gap="xs">
                                <Text size="sm" fw={500}>Thread:</Text>
                                <Badge color="blue" size="sm">{threadId}</Badge>
                            </Group>
                        )}
                    </Stack>
                    <Stack align="flex-end">
                        <Badge color="blue" size="sm">
                            {message.type}
                        </Badge>
                        <Text size="xs" c="dimmed">
                            {new Date(message.timestamp || message.created_at).toLocaleString()}
                        </Text>
                    </Stack>
                </Group>
                <Text mb="sm">{message.content}</Text>
                <Group justify="flex-end">
                    <Button 
                        variant="light" 
                        size="xs"
                        onClick={() => onAnnotate(message)}
                    >
                        Add Annotation
                    </Button>
                </Group>
            </Paper>
        </Box>
    );
} 