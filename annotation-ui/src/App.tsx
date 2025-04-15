import { MantineProvider, MantineTheme, rgba, lighten } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from './contexts/AuthContext';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { ChatView } from './pages/ChatView';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

function App() {
  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: 'blue',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        headings: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        components: {
          AppShell: {
            styles: (theme: MantineTheme) => ({
              main: { 
                background: theme.colors.gray[0],
              },
            }),
          },
          Card: {
            styles: (theme: MantineTheme) => ({
              root: { 
                height: '100%',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows.sm,
                },
              },
            }),
          },
          Paper: {
            styles: (theme: MantineTheme) => ({
              root: { 
                backdropFilter: 'blur(2px)',
                transition: 'box-shadow 0.2s ease',
                backgroundColor: theme.white,
              },
            }),
          },
          Button: {
            styles: (theme: MantineTheme) => ({
              root: {
                transition: 'all 0.2s ease',
                '&[data-variant="light"]': {
                  backgroundColor: theme.white,
                  '&:hover': {
                    backgroundColor: lighten(theme.colors.gray[0], 0.5),
                  },
                },
              },
            }),
          },
          NavLink: {
            styles: (theme: MantineTheme) => ({
              root: {
                transition: 'all 0.2s ease',
                '&[data-active]': {
                  backgroundColor: rgba(theme.colors.blue[6], 0.1),
                },
              },
            }),
          },
        },
      }}
    >
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/projects" replace />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:id" element={<ProjectDetailsPage />} />
                <Route path="projects/:projectId/chat/:containerId" element={<ChatView />} />
                <Route path="annotations" element={<div>My Annotations</div>} />
                
                {/* Admin-only route */}
                <Route 
                  path="admin" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <div>Admin Settings (Restricted Area)</div>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Unauthorized page */}
                <Route path="unauthorized" element={<div>You don't have permission to access this page</div>} />
              </Route>
              
              {/* Redirect unmatched routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}

export default App;
