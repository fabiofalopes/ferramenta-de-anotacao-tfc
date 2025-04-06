import { MantineProvider, MantineTheme, rgba, lighten } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { ImportPage } from './pages/ImportPage';
import { DataPage } from './pages/DataPage';
import { UsersPage } from './pages/UsersPage';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Create a client
const queryClient = new QueryClient();

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
                    Modal: {
                        styles: {
                            content: { maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' },
                            header: { marginBottom: 0 },
                        },
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
                                <Route path="import" element={<ImportPage />} />
                                <Route path="data" element={<DataPage />} />
                                <Route path="users" element={<UsersPage />} />
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
