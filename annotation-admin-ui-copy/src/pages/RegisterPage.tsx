import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Text, Box, Anchor, Checkbox } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { registerUser, loginUser } from '../api/authService';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState(API_URL);

  console.log("Current API URL:", apiUrl);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      isAdmin: true, // Default to true for admin UI
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
    console.log("Submitting registration form with values:", {...values, password: "[REDACTED]"});
    console.log("Using API URL:", apiUrl);

    try {
      // Register the user using the service function
      await registerUser({
        email: values.email,
        password: values.password,
        is_admin: values.isAdmin
      });
      
      // After successful registration, log the user in
      const { token, user } = await loginUser(values.email, values.password);
      
      // Verify this is an admin account
      if (!user.is_admin) {
        notifications.show({
          title: 'Access Denied',
          message: 'This account does not have admin privileges.',
          color: 'red'
        });
        setIsLoading(false);
        return;
      }
      
      // Login in the app
      login(token, user);
      
      notifications.show({
        title: 'Success',
        message: 'Account created successfully',
        color: 'green'
      });
      
      // Navigate to projects page
      navigate('/projects');
    } catch (err: any) {
      console.error('Registration error:', err);
      notifications.show({
        title: 'Error',
        message: err.message || 'Registration failed. This email may already be registered.',
        color: 'red'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size="xs" my={40}>
      <Paper radius="md" p="xl" withBorder>
        <Title order={2} mb="md" ta="center">
          Create an Admin Account
        </Title>
        
        <Text size="sm" mb="md">API URL: {apiUrl}</Text>
        <TextInput 
          label="Custom API URL" 
          value={apiUrl} 
          onChange={(e) => setApiUrl(e.target.value)}
          mb="md"
        />

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

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            required
            mt="md"
            {...form.getInputProps('confirmPassword')}
          />
          
          <Checkbox
            label="Create as administrator"
            mt="md"
            {...form.getInputProps('isAdmin', { type: 'checkbox' })}
          />

          <Box mt="xl">
            <Button type="submit" fullWidth loading={isLoading}>
              Register
            </Button>
          </Box>
        </form>

        <Text c="dimmed" size="sm" ta="center" mt="md">
          Already have an account?{' '}
          <Anchor component={Link} to="/login">
            Log in
          </Anchor>
        </Text>
      </Paper>
    </Container>
  );
} 