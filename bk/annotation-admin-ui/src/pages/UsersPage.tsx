import { Title, Paper, Text, Stack, Table, Badge, Group, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export function UsersPage() {
    // Dummy data for the table
    const users = [
        { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'Admin', status: 'Active' },
        { id: 2, name: 'John Doe', email: 'john@example.com', role: 'Annotator', status: 'Active' },
        { id: 3, name: 'Jane Smith', email: 'jane@example.com', role: 'Annotator', status: 'Inactive' },
    ];

    const rows = users.map((user) => (
        <Table.Tr key={user.id}>
            <Table.Td>{user.name}</Table.Td>
            <Table.Td>{user.email}</Table.Td>
            <Table.Td>
                <Badge 
                    color={user.role === 'Admin' ? 'blue' : 'green'} 
                    variant="light"
                >
                    {user.role}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Badge 
                    color={user.status === 'Active' ? 'green' : 'gray'} 
                    variant="outline"
                >
                    {user.status}
                </Badge>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Stack gap="lg" style={{ width: '100%' }}>
            <Paper p="md" radius="sm" withBorder>
                <Group justify="space-between" mb="lg">
                    <div>
                        <Title order={2} mb={5}>Users</Title>
                        <Text c="dimmed" size="sm">Manage users and permissions</Text>
                    </div>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        variant="filled"
                    >
                        Add User
                    </Button>
                </Group>
                
                <Paper p="md" withBorder>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Email</Table.Th>
                                <Table.Th>Role</Table.Th>
                                <Table.Th>Status</Table.Th>
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