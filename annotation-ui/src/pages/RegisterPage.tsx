import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Text, Box, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';
import { registerUser, loginUser } from '../api/authApi';

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const from = (location.state as any)?.from || '/projects';

  console.log("Register page rendered, redirect destination:", from);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
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
  }) => {
    setIsLoading(true);
    console.log("Submitting registration form with values:", {...values, password: "[REDACTED]"});

    try {
      // Register the user - always as non-admin
      await registerUser({
        email: values.email,
        password: values.password,
        is_admin: false
      });

      console.log("Registration successful, now logging in");
      
      // After successful registration, log the user in
      const { token, user } = await loginUser(values.email, values.password);
      console.log("Login successful after registration");
      
      // Save auth state
      login(token, user);
      
      // Show success notification
      notifications.show({
        title: 'Success',
        message: 'Account created successfully',
        color: 'green'
      });
      
      // Navigate to projects page or previous page
      console.log("Navigating to:", from);
      navigate(from);
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
          Create an Account
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

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            required
            mt="md"
            {...form.getInputProps('confirmPassword')}
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