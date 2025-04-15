import { useState } from 'react';
import { Title, Paper, Text, Stack, Table, Badge, Group, Button } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { listContainers } from '../api/containers.ts';
import { getDataItems } from '../api/messages.ts';
import { DataItem } from '../config/api';

export function DataPage() {
    const { projectId } = useParams();
    const parsedProjectId = projectId ? parseInt(projectId) : undefined;
    const [selectedContainer, setSelectedContainer] = useState<number | null>(null);

    // Fetch all containers
    const { data: containers = [], isLoading } = useQuery({
        queryKey: ['containers', parsedProjectId],
        queryFn: () => listContainers(parsedProjectId!),
        enabled: !!parsedProjectId
    });

    // Fetch items for selected container
    const { data: items = [], isLoading: isLoadingItems } = useQuery({
        queryKey: ['dataItems', selectedContainer],
        queryFn: () => getDataItems(selectedContainer!.toString()),
        enabled: !!selectedContainer,
    });

    if (!parsedProjectId) {
        return (
            <Paper p="md">
                <Text>No project selected</Text>
            </Paper>
        );
    }

    if (isLoading) {
        return (
            <Paper p="md">
                <Text>Loading...</Text>
            </Paper>
        );
    }

    const rows = items?.map((item: DataItem) => (
        <Table.Tr key={item.id}>
            <Table.Td>{item.content}</Table.Td>
            <Table.Td><Badge color="blue">{item.type}</Badge></Table.Td>
            <Table.Td>
                {item.meta_data && Object.entries(item.meta_data).map(([key, value], i) => (
                    <Badge key={i} color="gray" mr={5}>{key}: {value}</Badge>
                ))}
            </Table.Td>
            <Table.Td>{new Date(item.created_at).toLocaleString()}</Table.Td>
        </Table.Tr>
    ));

    return (
        <Stack gap="lg" style={{ width: '100%' }}>
            <Paper p="md" radius="sm" withBorder>
                <Title order={2} mb={5}>Data Browser</Title>
                <Text c="dimmed" mb="lg">Browse and manage your data items</Text>
                
                <Group mb="md">
                    {containers?.map((container: { id: number; name: string }) => (
                        <Button
                            key={container.id}
                            variant={selectedContainer === container.id ? "filled" : "light"}
                            onClick={() => setSelectedContainer(container.id)}
                        >
                            {container.name}
                        </Button>
                    ))}
                </Group>

                {selectedContainer && (
                    <Paper p="md" withBorder>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Content</Table.Th>
                                    <Table.Th>Type</Table.Th>
                                    <Table.Th>Metadata</Table.Th>
                                    <Table.Th>Created At</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {isLoadingItems ? (
                                    <Table.Tr>
                                        <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
                                            Loading items...
                                        </Table.Td>
                                    </Table.Tr>
                                ) : rows}
                            </Table.Tbody>
                        </Table>
                    </Paper>
                )}
            </Paper>
        </Stack>
    );
} 