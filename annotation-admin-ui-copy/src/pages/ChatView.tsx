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
import { IconInfoCircle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { MessageBubble } from '../components/MessageBubble.tsx';
import { getMessages, createAnnotation, getThreadAnnotations } from '../api/messages.ts';
import type { ChatMessage } from '../config/api';

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
    const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
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
            thread_id: (value: string) => {
                if (!value) return 'Thread ID is required';
                if (value.length < 1) return 'Thread ID must not be empty';
                if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Thread ID can only contain letters, numbers, underscores, and hyphens';
                return null;
            },
            confidence: (value: number) => (value < 0 || value > 100 ? 'Confidence must be between 0 and 100' : null),
            tag: (value: string) => (!value ? 'Tag is required' : null),
        },
    });

    // Fetch messages
    const { data: messages, fetchNextPage, hasNextPage, isFetchingNextPage, isError, error } = useInfiniteQuery({
        queryKey: ['messages', containerId],
        queryFn: async ({ pageParam = 0 }) => {
            if (!containerId) {
                console.error("ChatView: containerId is missing!");
                throw new Error("Container ID is missing"); 
            }
            console.log(`ChatView: Fetching messages for containerId: ${containerId}, page: ${pageParam}`);
            try {
                const data = await getMessages(String(containerId), pageParam);
                console.log(`ChatView: Received data for containerId ${containerId}, page ${pageParam}:`, data);
                
                // Ensure all required fields are present
                return data.map(message => ({
                    ...message,
                    turn_id: message.turn_id || String(message.id),
                    user_id: message.user_id || 'unknown',
                    content: message.content || '',
                    type: message.type || 'chat_message',
                    created_at: message.created_at || new Date().toISOString(),
                    meta_data: message.meta_data || {},
                    timestamp: message.timestamp || message.created_at || new Date().toISOString()
                }));
            } catch (error) {
                console.error(`ChatView: Error fetching messages for containerId ${containerId}, page ${pageParam}:`, error);
                throw error;
            }
        },
        getNextPageParam: (lastPage: ChatMessage[], allPages: ChatMessage[][]) => {
            return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
        },
        initialPageParam: 0,
        enabled: !!containerId,
    });

    // Fetch thread annotations with better error handling
    const { data: threadAnnotations, error: threadError } = useQuery({
        queryKey: ['thread-annotations', containerId],
        queryFn: async () => {
            try {
                const data = await getThreadAnnotations(containerId || '');
                console.log('Thread annotations received:', data);
                return data;
            } catch (error) {
                console.error('Error fetching thread annotations:', error);
                throw error;
            }
        },
        enabled: !!containerId,
    });

    // Create annotation mutation
    const createAnnotationMutation = useMutation({
        mutationFn: (data: { itemId: number; thread_id: string; confidence: number; notes: string }) => 
            createAnnotation({
                item_id: data.itemId,
                thread_id: data.thread_id,
                confidence: data.confidence / 100, // Convert percentage to decimal
                notes: data.notes,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['thread-annotations', containerId] });
            setAnnotationModalOpen(false);
            form.reset();
            notifications.show({
                title: 'Success',
                message: 'Annotation created successfully',
                color: 'green',
            });
        },
        onError: (error: any) => {
            console.error('Annotation creation error:', error);
            notifications.show({
                title: 'Error',
                message: error.message || 'Failed to create annotation',
                color: 'red',
            });
        },
    });

    const handleAnnotate = (message: ChatMessage) => {
        setSelectedMessage(message);
        setAnnotationModalOpen(true);
        // Pre-fill the form with existing annotation if it exists
        const existingAnnotation = findAnnotationForMessage(message);
        if (existingAnnotation) {
            form.setValues({
                thread_id: existingAnnotation.threadId,
                confidence: Math.round(existingAnnotation.confidence * 100), // Convert decimal to percentage
                notes: existingAnnotation.notes || '',
                tag: 'CHAT'
            });
        } else {
            form.reset();
            form.setValues({
                thread_id: '',
                confidence: 0,
                notes: '',
                tag: 'CHAT'
            });
        }
    };

    const handleCreateAnnotation = form.onSubmit((values) => {
        if (!selectedMessage) {
            notifications.show({
                title: 'Error',
                message: 'No message selected',
                color: 'red',
            });
            return;
        }
        
        createAnnotationMutation.mutate({
            itemId: selectedMessage.id,
            thread_id: values.thread_id,
            confidence: values.confidence,
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
    const findAnnotationForMessage = (message: ChatMessage) => {
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

    if (isError || threadError) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const threadErrorMessage = threadError instanceof Error ? threadError.message : '';
        
        return (
            <Paper p="md" withBorder>
                <Title order={3} mb="md">Data Access Issue</Title>
                
                <Alert 
                    icon={<IconInfoCircle size={16} />} 
                    title="Error Loading Data" 
                    color="red"
                    mb="md"
                >
                    <Stack>
                        <Text>
                            There was an error loading the chat data. This could be due to:
                        </Text>
                        <Text>
                            - The container being in "pending" status
                            - Access permission issues
                            - Network connectivity problems
                        </Text>
                        <Text fw={500}>Technical details:</Text>
                        <Code block>
                            Container ID: {containerId}
                            {errorMessage && `\nMessage Error: ${errorMessage}`}
                            {threadErrorMessage && `\nThread Error: ${threadErrorMessage}`}
                        </Code>
                    </Stack>
                </Alert>
                
                <Group justify="center" mt="lg">
                    <Button onClick={handleBackToProject} variant="light">
                        Back to Project
                    </Button>
                    <Button 
                        onClick={() => window.location.reload()} 
                        variant="light"
                        color="blue"
                    >
                        Retry
                    </Button>
                </Group>
            </Paper>
        );
    }

    const allMessages = messages?.pages.flat() || [];
    
    // Organize messages by thread
    const messageThreads = new Map<string, ChatMessage[]>();
    const threadAnnotationMap = new Map<string, string>();
    const messageMap = new Map<string, ChatMessage>();
    
    // First pass: Create message lookup map
    allMessages.forEach(message => {
        const messageId = message.turn_id || message.id.toString();
        messageMap.set(messageId, message);
    });
    
    // Second pass: Map messages to their threads based on annotations
    allMessages.forEach(message => {
        const annotation = findAnnotationForMessage(message);
        if (annotation) {
            const threadId = annotation.threadId;
            if (!messageThreads.has(threadId)) {
                messageThreads.set(threadId, []);
            }
            messageThreads.get(threadId)?.push(message);
            threadAnnotationMap.set(message.turn_id || message.id.toString(), threadId);
        }
    });
    
    // Third pass: Add messages based on reply_to_turn relationships
    allMessages.forEach(message => {
        if (!threadAnnotationMap.has(message.turn_id || message.id.toString())) {
            if (message.reply_to_turn) {
                // Find the parent message's thread
                const parentMessage = messageMap.get(message.reply_to_turn);
                if (parentMessage) {
                    const parentThreadId = threadAnnotationMap.get(parentMessage.turn_id || parentMessage.id.toString());
                    if (parentThreadId) {
                        if (!messageThreads.has(parentThreadId)) {
                            messageThreads.set(parentThreadId, []);
                        }
                        messageThreads.get(parentThreadId)?.push(message);
                        threadAnnotationMap.set(message.turn_id || message.id.toString(), parentThreadId);
                    }
                }
            }
        }
    });
    
    // Add remaining messages that aren't part of any thread
    const unthreadedMessages = allMessages.filter(message => 
        !threadAnnotationMap.has(message.turn_id || message.id.toString())
    );

    // Sort messages within threads by timestamp
    messageThreads.forEach((messages: ChatMessage[], _threadId: string) => {
        messages.sort((a, b) => {
            const aTime = new Date(a.timestamp || a.created_at).getTime();
            const bTime = new Date(b.timestamp || b.created_at).getTime();
            return aTime - bTime;
        });
    });

    return (
        <Stack h="100%">
            {!isEmbedded && (
                <Group justify="space-between">
                    <Button variant="light" onClick={handleBackToProject}>
                        Back to Project
                    </Button>
                    <Text>Container ID: {containerId}</Text>
                </Group>
            )}
            
            <ScrollArea h={isEmbedded ? 400 : "calc(100vh - 200px)"}>
                <Stack gap="md" p="md">
                    {/* Display threaded messages */}
                    {Array.from(messageThreads.entries()).map(([threadId, messages]) => (
                        <Paper key={threadId} p="md" withBorder>
                            <Stack gap="md">
                                <Group>
                                    <Badge color="blue">Thread: {threadId}</Badge>
                                    {messages[0] && findAnnotationForMessage(messages[0]) && (
                                        <Badge color="green">
                                            Confidence: {Math.round(findAnnotationForMessage(messages[0])?.confidence * 100)}%
                                        </Badge>
                                    )}
                                </Group>
                                {messages.map((message, index) => (
                                    <MessageBubble
                                        key={message.id}
                                        message={message}
                                        onAnnotate={handleAnnotate}
                                        isReply={index > 0}
                                        threadId={threadId}
                                    />
                                ))}
                            </Stack>
                        </Paper>
                    ))}
                    
                    {/* Display unthreaded messages */}
                    {unthreadedMessages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            onAnnotate={handleAnnotate}
                            isReply={false}
                        />
                    ))}
                    
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
            
            {/* Annotation Modal */}
            <Modal 
                opened={annotationModalOpen} 
                onClose={() => setAnnotationModalOpen(false)}
                title="Create Thread Annotation"
            >
                <form onSubmit={handleCreateAnnotation}>
                    <Stack>
                        <TextInput
                            label="Thread ID"
                            placeholder="Enter thread ID (letters, numbers, underscores, hyphens only)"
                            description="At least 2 characters long, using only letters, numbers, underscores, and hyphens"
                            {...form.getInputProps('thread_id')}
                        />
                        <NumberInput
                            label="Confidence (%)"
                            placeholder="Enter confidence level"
                            min={0}
                            max={100}
                            {...form.getInputProps('confidence')}
                        />
                        <Textarea
                            label="Notes"
                            placeholder="Enter notes (optional)"
                            {...form.getInputProps('notes')}
                        />
                        <Button type="submit" loading={createAnnotationMutation.isPending}>
                            Create Annotation
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    );
}