import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Text, Box, Anchor, Divider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';
import { loginUser } from '../api/authApi';

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
      console.log("Login successful");
      
      // Save auth state
      login(token, user);
      
      // Show success notification
      notifications.show({
        title: 'Login Successful',
        message: 'Welcome back!',
        color: 'green'
      });
      
      // Navigate to projects page or return to previous page
      console.log("Navigating to:", from);
      navigate(from);
    } catch (err: any) {
      console.error("Login failed:", err);
      notifications.show({
        title: 'Login Failed',
        message: err.message || 'Please check your credentials.',
        color: 'red'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add test user login handler for development
  const handleTestUserLogin = () => {
    console.log("Using test user login");
    // Create a test user - only shown in development
    const testUser = {
      id: 999,
      email: "admin@example.com",
      is_admin: true
    };
    
    const mockToken = "test-token-12345";
    
    login(mockToken, testUser);
    navigate(from);
  };

  return (
    <Container size="xs" my={40}>
      <Paper radius="md" p="xl" withBorder>
        <Title order={2} mb="md" ta="center">
          Welcome Back
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
          Don't have an account yet?{' '}
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
              onClick={handleTestUserLogin}
            >
              Login as Test Admin
            </Button>
          </>
        )}
      </Paper>
    </Container>
  );
} 