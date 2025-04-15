import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Text, Box, Anchor, Divider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';
import { loginUser } from '../api/authService';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const from = (location.state as any)?.from || '/projects';

    console.log("Login page rendered, redirect destination:", from);

    const form = useForm({
        initialValues: {
            email: '',
            password: '',
        },
        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => (value.length > 0 ? null : 'Password is required'),
        },
    });

    const handleSubmit = async (values: { email: string; password: string }) => {
        setIsLoading(true);
        console.log("Login attempt for:", values.email);

        try {
            const { token, user } = await loginUser(values.email, values.password);
            
            // Verify this is an admin account
            if (!user.is_admin) {
                console.log("Login attempt rejected: not an admin account");
                notifications.show({
                    title: 'Access Denied',
                    message: 'This account does not have admin privileges.',
                    color: 'red'
                });
                setIsLoading(false);
                return;
            }
            
            console.log("Admin login successful, saving auth state");
            login(token, user);
            
            // Show success notification
            notifications.show({
                title: 'Login Successful',
                message: 'Welcome back!',
                color: 'green'
            });
            
            console.log("Navigating to:", from);
            navigate(from);
        } catch (err) {
            console.error("Login failed:", err);
            notifications.show({
                title: 'Login Failed',
                message: 'Please check your credentials.',
                color: 'red'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Add test admin login handler for development
    const handleTestAdminLogin = () => {
        console.log("Using test admin login");
        // Create a test admin user - only shown in development
        const testUser = {
            id: 999,
            email: "admin@example.com",
            is_admin: true
        };
        
        const mockToken = "admin-test-token-12345";
        
        login(mockToken, testUser);
        navigate(from);
    };

    return (
        <Container size="xs" my={40}>
            <Paper radius="md" p="xl" withBorder>
                <Title order={2} mb="md" ta="center">
                    Admin Dashboard
                </Title>

                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput
                        label="Email"
                        placeholder="your@email.com"
                        required
                        {...form.getInputProps('email')}
                    />

                    <PasswordInput
                        label="Password"
                        placeholder="Your password"
                        required
                        mt="md"
                        {...form.getInputProps('password')}
                    />

                    <Box mt="xl">
                        <Button type="submit" fullWidth loading={isLoading}>
                            Sign in
                        </Button>
                    </Box>
                </form>

                <Text c="dimmed" size="sm" ta="center" mt="md">
                    Need an admin account?{' '}
                    <Anchor component={Link} to="/register">
                        Register
                    </Anchor>
                </Text>

                {/* Add development-only test user section */}
                {import.meta.env.DEV && (
                    <>
                        <Divider my="md" label="Development Only" labelPosition="center" />
                        <Button 
                            variant="outline" 
                            color="gray" 
                            fullWidth 
                            onClick={handleTestAdminLogin}
                        >
                            Login as Test Admin
                        </Button>
                    </>
                )}
            </Paper>
        </Container>
    );
} 