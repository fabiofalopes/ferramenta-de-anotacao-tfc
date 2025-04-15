import { Outlet } from 'react-router-dom';
import {
    AppShell as MantineAppShell,
    Burger,
    Group,
    NavLink,
    Title,
    Box,
    Stack,
    rem,
    useMantineTheme,
    Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFolder, IconUpload, IconDatabase, IconUsers, IconLogout } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AppShell() {
    const [opened, { toggle }] = useDisclosure();
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const theme = useMantineTheme();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Projects', icon: IconFolder, path: '/projects' },
        { label: 'Import', icon: IconUpload, path: '/import' },
        { label: 'Data', icon: IconDatabase, path: '/data' },
        { label: 'Users', icon: IconUsers, path: '/users' },
    ];

    return (
        <MantineAppShell
            header={{ height: 60 }}
            navbar={{
                width: 280,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding={0}
        >
            <MantineAppShell.Header>
                <Paper p={0} shadow="sm" style={{ height: '100%', width: '100%' }}>
                    <Group h="100%" px="md" justify="space-between">
                        <Group>
                            <Burger 
                                opened={opened} 
                                onClick={toggle} 
                                hiddenFrom="sm" 
                                size="sm"
                                color={theme.colors.gray[6]}
                            />
                            <Title order={3} c={theme.colors.gray[8]}>Annotation Tool Admin</Title>
                        </Group>
                    </Group>
                </Paper>
            </MantineAppShell.Header>

            <MantineAppShell.Navbar 
                p="md" 
                bg={theme.colors.gray[0]}
            >
                <Stack gap="xs" h="100%" justify="space-between">
                    <Stack gap="xs">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                label={item.label}
                                leftSection={
                                    <item.icon 
                                        style={{ 
                                            width: rem(20), 
                                            height: rem(20),
                                            color: location.pathname === item.path ? 
                                                theme.colors.blue[6] : 
                                                theme.colors.gray[6]
                                        }} 
                                    />
                                }
                                onClick={() => navigate(item.path)}
                                active={location.pathname === item.path}
                                variant={location.pathname === item.path ? "filled" : "light"}
                                style={{
                                    borderRadius: theme.radius.sm,
                                }}
                            />
                        ))}
                    </Stack>
                    <NavLink
                        label="Logout"
                        leftSection={
                            <IconLogout 
                                style={{ 
                                    width: rem(20), 
                                    height: rem(20),
                                    color: theme.colors.red[6]
                                }} 
                            />
                        }
                        onClick={handleLogout}
                        color="red"
                        variant="light"
                        style={{
                            borderRadius: theme.radius.sm,
                        }}
                    />
                </Stack>
            </MantineAppShell.Navbar>

            <MantineAppShell.Main bg={theme.colors.gray[1]}>
                <Box 
                    p="md" 
                    style={{ 
                        width: '100%',
                        maxWidth: '100%',
                        minHeight: 'calc(100vh - 60px)',
                    }}
                >
                    <Outlet />
                </Box>
            </MantineAppShell.Main>
        </MantineAppShell>
    );
} 