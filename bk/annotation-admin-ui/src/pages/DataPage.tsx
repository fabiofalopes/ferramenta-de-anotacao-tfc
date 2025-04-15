import { Title, Paper, Text, Stack, Table } from '@mantine/core';

export function DataPage() {
    // Dummy data for the table
    const elements = [
        { name: 'Chat Session 1', type: 'Text', size: '32KB', date: 'Apr 6, 2025' },
        { name: 'Chat Session 2', type: 'Text', size: '48KB', date: 'Apr 5, 2025' },
        { name: 'Conversation 1', type: 'Text', size: '56KB', date: 'Apr 4, 2025' },
    ];

    const rows = elements.map((element) => (
        <Table.Tr key={element.name}>
            <Table.Td>{element.name}</Table.Td>
            <Table.Td>{element.type}</Table.Td>
            <Table.Td>{element.size}</Table.Td>
            <Table.Td>{element.date}</Table.Td>
        </Table.Tr>
    ));

    return (
        <Stack gap="lg" style={{ width: '100%' }}>
            <Paper p="md" radius="sm" withBorder>
                <Title order={2} mb={5}>Data Browser</Title>
                <Text c="dimmed" mb="lg">Browse and manage your imported data files</Text>
                
                <Paper p="md" withBorder>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Size</Table.Th>
                                <Table.Th>Import Date</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                </Paper>
                
                <Text size="sm" mt="md" style={{ textAlign: 'center' }}>
                    This feature is under development. Check back soon for full functionality.
                </Text>
            </Paper>
        </Stack>
    );
} 