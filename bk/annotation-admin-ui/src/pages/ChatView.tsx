import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
    Stack,
    Paper,
    Text,
    ScrollArea,
    Modal,
    Button,
    Group,
    Textarea,
    NumberInput,
    Alert,
    Code,
    Title,
    Badge,
    TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { MessageBubble } from '../components/MessageBubble.tsx';
import { getMessages, createAnnotation, getThreadAnnotations } from '../api/messages.ts';
import type { Message } from '../config/api';

const PAGE_SIZE = 20;

// Define Props
interface ChatViewProps {
    containerId?: string;
    projectId?: string;
    isEmbedded?: boolean;
}

export function ChatView({ containerId: propContainerId, projectId: propProjectId, isEmbedded = false }: ChatViewProps) {
    // Use props if available, otherwise fallback to params
    const params = useParams<{ id: string, containerId: string }>();
    const containerId = propContainerId || params.containerId;
    const projectId = propProjectId || params.id;
    
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [annotationModalOpen, setAnnotationModalOpen] = useState(false);

    // Form for creating annotations
    const form = useForm({
        initialValues: {
            thread_id: '',
            confidence: 0,
            notes: '',
            tag: 'CHAT' // Default tag value
        },
        validate: {
            thread_id: (value) => (!value ? 'Thread ID is required' : null),
            confidence: (value) => (value < 0 || value > 100 ? 'Confidence must be between 0 and 100' : null),
            tag: (value) => (!value ? 'Tag is required' : null),
        },
    });

    // Fetch messages
    const { data: messages, fetchNextPage, hasNextPage, isFetchingNextPage, isError } = useInfiniteQuery({
        queryKey: ['messages', containerId],
        queryFn: async ({ pageParam = 0 }) => {
            if (!containerId) {
                console.error("ChatView: containerId is missing!");
                throw new Error("Container ID is missing"); 
            }
            console.log(`ChatView: Fetching messages for containerId: ${containerId}, page: ${pageParam}`);
            try {
                const data = await getMessages(containerId, pageParam);
                console.log(`ChatView: Received data for containerId ${containerId}, page ${pageParam}:`, data);
                return data;
            } catch (error) {
                console.error(`ChatView: Error fetching messages for containerId ${containerId}, page ${pageParam}:`, error);
                throw error; // Re-throw the error so React Query handles it
            }
        },
        getNextPageParam: (lastPage: Message[], allPages: Message[][]) => {
            return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
        },
        initialPageParam: 0,
        enabled: !!containerId,
    });

    // Fetch thread annotations
    const { data: threadAnnotations } = useQuery({
        queryKey: ['thread-annotations', containerId],
        queryFn: () => getThreadAnnotations(containerId || ''),
        enabled: !!containerId,
    });

    // Create annotation mutation
    const createAnnotationMutation = useMutation({
        mutationFn: (data: { messageId: number; thread_id: string; confidence: number; notes: string }) => 
            createAnnotation({
                message_id: data.messageId,
                thread_id: data.thread_id,
                confidence: data.confidence / 100, // Convert to 0-1 range
                notes: data.notes,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', containerId] });
            setAnnotationModalOpen(false);
            form.reset();
            notifications.show({
                title: 'Success',
                message: 'Annotation created successfully',
                color: 'green',
            });
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to create annotation',
                color: 'red',
            });
        },
    });

    const handleAnnotate = (message: Message) => {
        setSelectedMessage(message);
        setAnnotationModalOpen(true);
    };

    const handleCreateAnnotation = form.onSubmit((values) => {
        if (!selectedMessage) return;
        
        createAnnotationMutation.mutate({
            messageId: selectedMessage.id,
            thread_id: values.thread_id,
            confidence: values.confidence / 100, // Convert to 0-1 range
            notes: values.notes,
        });
    });

    const handleBackToProject = () => {
        // Use the determined projectId for navigation
        if (projectId) {
            navigate(`/projects/${projectId}`);
        } else {
            navigate('/projects');
        }
    };

    // Function to find thread annotation for a message
    const findAnnotationForMessage = (message: Message) => {
        if (!threadAnnotations) return null;
        
        for (const [threadId, annotations] of Object.entries(threadAnnotations)) {
            const annotation = annotations.find(a => 
                a.turn_id === message.turn_id || a.turn_id === message.id.toString()
            );
            if (annotation) {
                return { threadId, ...annotation };
            }
        }
        return null;
    };

    if (!containerId) {
        return <Text>No container ID provided</Text>;
    }

    if (isError) {
        return (
            <Paper p="md" withBorder>
                <Title order={3} mb="md">Container Access Issue</Title>
                
                <Alert 
                    icon={<IconInfoCircle size={16} />} 
                    title="Container Status Issue Detected" 
                    color="blue"
                    mb="md"
                >
                    <Stack>
                        <Text>
                            The container appears to exist in the project, but we can't access its messages due to a backend access control issue.
                        </Text>
                        <Text>
                            This is likely because the container is in "pending" status instead of "completed", 
                            or there is an issue with user access permissions.
                        </Text>
                        <Text fw={500}>Technical details:</Text>
                        <Code block>Container ID: {containerId} - Error status: 404 Not Found</Code>
                    </Stack>
                </Alert>
                
                <Group justify="center" mt="lg">
                    <Button onClick={handleBackToProject} variant="light">
                        Back to Project
                    </Button>
                </Group>
            </Paper>
        );
    }

    const allMessages = messages?.pages.flat() || [];

    const chatContent = (
        <>
            {/* Conditionally render Back button only if not embedded */}
            {!isEmbedded && (
                 <Group justify="space-between" mb="md">
                    <Button 
                        variant="light"
                        onClick={handleBackToProject}
                    >
                        Back to Project
                    </Button>
                    <Text fw={500}>Container ID: {containerId}</Text>
                 </Group>
            )}

            {/* Keep the message display logic */}
            {allMessages.length === 0 ? (
                <Alert 
                    icon={<IconAlertCircle size={16} />} 
                    title="No Messages" 
                    color="blue"
                >
                    No messages found in this container.
                </Alert>
            ) : (
                <ScrollArea h={isEmbedded ? 400 : 500}> {/* Adjust height if embedded */}
                    <Stack gap="xs">
                        {allMessages.map((message) => {
                            const threadInfo = findAnnotationForMessage(message);
                            return (
                                <div key={message.id}>
                                    {threadInfo && (
                                        <Group justify="flex-end" mb={5}>
                                            <Badge color="green">
                                                Thread: {threadInfo.threadId}
                                            </Badge>
                                        </Group>
                                    )}
                                    <MessageBubble 
                                        key={message.id} 
                                        message={message} 
                                        onAnnotate={() => handleAnnotate(message)}
                                    />
                                </div>
                            );
                        })}
                        {hasNextPage && (
                            <Button 
                                onClick={() => fetchNextPage()} 
                                loading={isFetchingNextPage}
                                variant="light"
                            >
                                Load More
                            </Button>
                        )}
                    </Stack>
                </ScrollArea>
            )}
        </>
    );

    // Conditionally wrap content in Paper if not embedded
    return (
        <Stack gap="md">
            {isEmbedded ? (
                chatContent
            ) : (
                <Paper p="md" withBorder>
                    {chatContent}
                </Paper>
            )}

            <Modal 
                opened={annotationModalOpen} 
                onClose={() => setAnnotationModalOpen(false)}
                title="Create Thread Annotation"
            >
                <form onSubmit={handleCreateAnnotation}>
                    <Stack>
                        {selectedMessage && (
                            <Paper p="xs" withBorder>
                                <Text size="sm" fw={500}>Message:</Text>
                                <Text size="sm">{selectedMessage.content}</Text>
                            </Paper>
                        )}
                        
                        <TextInput
                            label="Thread ID"
                            placeholder="e.g. thread1"
                            required
                            {...form.getInputProps('thread_id')}
                        />
                        
                        <TextInput
                            label="Tag"
                            required
                            readOnly
                            {...form.getInputProps('tag')}
                        />
                        
                        <NumberInput
                            label="Confidence (%)"
                            min={0}
                            max={100}
                            {...form.getInputProps('confidence')}
                        />
                        
                        <Textarea
                            label="Notes"
                            placeholder="Add notes about this annotation"
                            minRows={3}
                            {...form.getInputProps('notes')}
                        />
                        
                        <Group justify="flex-end">
                            <Button variant="light" color="red" onClick={() => setAnnotationModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={createAnnotationMutation.isPending}>
                                Create Annotation
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    );
}