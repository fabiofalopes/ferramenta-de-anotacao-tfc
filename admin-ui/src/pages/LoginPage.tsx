import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { LoginRequest } from '../config/api';

export function LoginPage() {
    const navigate = useNavigate();
    const { login: setAuth } = useAuth();

    const form = useForm<LoginRequest>({
        initialValues: {
            username: '',
            password: '',
        },
        validate: {
            username: (value) => (!value ? 'Email is required' : null),
            password: (value) => (!value ? 'Password is required' : null),
        },
    });

    const loginMutation = useMutation({
        mutationFn: login,
        onMutate: (variables) => {
            console.log('Attempting login with:', { email: variables.username });
        },
        onSuccess: (data) => {
            console.log('Login successful, received token');
            // Note: In a real app, you'd want to fetch user details here
            const mockUser = {
                id: 1,
                email: form.values.username,
                is_admin: true, // You'd want to get this from the backend
            };
            setAuth(data.access_token, mockUser);
            navigate('/');
        },
        onError: (error: any) => {
            console.error('Login failed:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            form.setErrors({
                username: 'Invalid credentials',
                password: 'Invalid credentials',
            });
        },
    });

    const handleSubmit = form.onSubmit((values) => {
        console.log('Submitting form with values:', values);
        loginMutation.mutate(values);
    });

    return (
        <Container size={420} my={40}>
            <Title ta="center">Welcome back</Title>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <form onSubmit={handleSubmit}>
                    <TextInput
                        label="Email"
                        placeholder="you@example.com"
                        required
                        {...form.getInputProps('username')}
                    />
                    <PasswordInput
                        label="Password"
                        placeholder="Your password"
                        required
                        mt="md"
                        {...form.getInputProps('password')}
                    />

                    {loginMutation.isError && (
                        <Text c="red" size="sm" mt="sm">
                            {loginMutation.error?.message || 'An error occurred during login'}
                        </Text>
                    )}

                    <Button
                        fullWidth
                        mt="xl"
                        type="submit"
                        loading={loginMutation.isPending}
                    >
                        Sign in
                    </Button>
                </form>
            </Paper>
        </Container>
    );
} 