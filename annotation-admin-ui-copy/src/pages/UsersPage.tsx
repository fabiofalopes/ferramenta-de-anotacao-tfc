import { Title, Paper, Text, Stack, Table, Badge, Group, Button, Loader, Modal, TextInput, PasswordInput, Checkbox } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllUsers } from '../api/projects';
import { useState } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { registerUser } from '../api/authService';

export function UsersPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm({
        initialValues: {
            email: '',
            password: '',
            confirmPassword: '',
            isAdmin: false,
        },
        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => (value.length < 6 ? 'Password must be at least 6 characters' : null),
            confirmPassword: (value, values) => 
                value !== values.password ? 'Passwords do not match' : null,
        },
    });

    const handleSubmit = async (values: { 
        email: string; 
        password: string; 
        confirmPassword: string;
        isAdmin: boolean;
    }) => {
        setIsLoading(true);
        try {
            await registerUser({
                email: values.email,
                password: values.password,
                is_admin: values.isAdmin
            });
            
            notifications.show({
                title: 'Success',
                message: 'User created successfully',
                color: 'green'
            });
            
            // Reset form and close modal
            form.reset();
            setIsModalOpen(false);
            
            // Refresh users list
            queryClient.invalidateQueries({ queryKey: ['users'] });
        } catch (err: any) {
            notifications.show({
                title: 'Error',
                message: err.message || 'Failed to create user',
                color: 'red'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const { data: users, isLoading: isLoadingUsers, error } = useQuery({
        queryKey: ['users'],
        queryFn: getAllUsers
    });

    if (isLoadingUsers) {
        return (
            <Stack gap="lg" style={{ width: '100%' }}>
                <Paper p="md" radius="sm" withBorder>
                    <Loader />
                </Paper>
            </Stack>
        );
    }

    if (error) {
        return (
            <Stack gap="lg" style={{ width: '100%' }}>
                <Paper p="md" radius="sm" withBorder>
                    <Text color="red">Error loading users. Please try again later.</Text>
                </Paper>
            </Stack>
        );
    }

    const rows = users?.map((user) => (
        <Table.Tr key={user.id}>
            <Table.Td>{user.email}</Table.Td>
            <Table.Td>
                <Badge 
                    color={user.is_admin ? 'blue' : 'green'} 
                    variant="light"
                >
                    {user.is_admin ? 'Admin' : 'Annotator'}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Badge 
                    color="green" 
                    variant="outline"
                >
                    Active
                </Badge>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Stack gap="lg" style={{ width: '100%' }}>
            <Modal 
                opened={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    form.reset();
                }}
                title="Add New User"
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput
                        label="Email"
                        placeholder="user@example.com"
                        required
                        {...form.getInputProps('email')}
                    />

                    <PasswordInput
                        label="Password"
                        placeholder="Enter password"
                        required
                        mt="md"
                        {...form.getInputProps('password')}
                    />

                    <PasswordInput
                        label="Confirm Password"
                        placeholder="Confirm password"
                        required
                        mt="md"
                        {...form.getInputProps('confirmPassword')}
                    />

                    <Checkbox
                        label="Create as administrator"
                        mt="md"
                        {...form.getInputProps('isAdmin', { type: 'checkbox' })}
                    />

                    <Group justify="flex-end" mt="xl">
                        <Button variant="light" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" loading={isLoading}>Create User</Button>
                    </Group>
                </form>
            </Modal>

            <Paper p="md" radius="sm" withBorder>
                <Group justify="space-between" mb="lg">
                    <div>
                        <Title order={2} mb={5}>Users</Title>
                        <Text c="dimmed" size="sm">Manage users and permissions</Text>
                    </div>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        variant="filled"
                        onClick={() => setIsModalOpen(true)}
                    >
                        Add User
                    </Button>
                </Group>
                
                <Paper p="md" withBorder>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Email</Table.Th>
                                <Table.Th>Role</Table.Th>
                                <Table.Th>Status</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                </Paper>
            </Paper>
        </Stack>
    );
} 