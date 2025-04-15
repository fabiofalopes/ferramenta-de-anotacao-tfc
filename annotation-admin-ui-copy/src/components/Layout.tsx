import { ReactNode } from 'react';
import { AppShell, Burger, Group, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconDashboard, IconUsers, IconFolders, IconUpload, IconLogout } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const [opened, { toggle }] = useDisclosure();
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navigationItems = [
        { label: 'Dashboard', icon: IconDashboard, path: '/' },
        { label: 'Projects', icon: IconFolders, path: '/projects' },
        { label: 'Import Data', icon: IconUpload, path: '/import' },
    ];

    if (user?.is_admin) {
        navigationItems.push({ label: 'Users', icon: IconUsers, path: '/users' });
    }

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <Group justify="space-between" style={{ flex: 1 }}>
                        <h3>Annotation Admin</h3>
                        {user && (
                            <Group>
                                <span>{user.email}</span>
                                {user.is_admin && <span>(Admin)</span>}
                            </Group>
                        )}
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <nav>
                    {navigationItems.map((item) => (
                        <NavLink
                            key={item.path}
                            label={item.label}
                            leftSection={<item.icon size="1rem" />}
                            active={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                        />
                    ))}
                    <NavLink
                        label="Logout"
                        leftSection={<IconLogout size="1rem" />}
                        onClick={handleLogout}
                        color="red"
                    />
                </nav>
            </AppShell.Navbar>

            <AppShell.Main>
                {children}
            </AppShell.Main>
        </AppShell>
    );
} 