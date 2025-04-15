import { Paper, Text, Group, Button, Badge, Stack } from '@mantine/core';
import { Message } from '../config/api';

interface MessageBubbleProps {
    message: Message;
    onAnnotate: (message: Message) => void;
}

export function MessageBubble({ message, onAnnotate }: MessageBubbleProps) {
    return (
        <Paper p="md" withBorder>
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
                    <Group gap="xs">
                        <Text size="sm" fw={500}>Reply to:</Text>
                        <Text size="sm">{message.reply_to_turn || 'None'}</Text>
                    </Group>
                </Stack>
                <Stack align="flex-end">
                    {message.type && (
                        <Badge color="blue" size="sm">
                            {message.type}
                        </Badge>
                    )}
                    <Text size="xs" c="dimmed">
                        {new Date(message.created_at).toLocaleString()}
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
    );
} 