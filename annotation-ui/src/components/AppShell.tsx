import { useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  NavLink,
  Title,
  Avatar,
  Menu,
  Button,
  Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconHome, 
  IconMessageCircle, 
  IconLogout, 
  IconSettings, 
  IconUser 
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

export function AppShell() {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Title order={3}>Annotation UI</Title>
            </Link>
          </Group>

          <Group>
            {user && (
              <Menu position="bottom-end" withArrow>
                <Menu.Target>
                  <Button variant="subtle" style={{ padding: '5px' }}>
                    <Group gap={8}>
                      <Avatar color="blue" radius="xl" size="sm">
                        {user.email.charAt(0).toUpperCase()}
                      </Avatar>
                      <span>{user.email}</span>
                    </Group>
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Account</Menu.Label>
                  <Menu.Item
                    leftSection={<IconUser size={14} />}
                  >
                    Profile
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconLogout size={14} />}
                    onClick={handleLogout}
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <NavLink
          label="Projects"
          leftSection={<IconHome size={16} />}
          component={Link}
          to="/projects"
          active={active === 'projects'}
          onClick={() => setActive('projects')}
          variant="light"
        />
        <NavLink
          label="My Annotations"
          leftSection={<IconMessageCircle size={16} />}
          component={Link}
          to="/annotations"
          active={active === 'annotations'}
          onClick={() => setActive('annotations')}
          variant="light"
        />
        <Divider my="sm" />
        {user?.is_admin && (
          <NavLink
            label="Admin Settings"
            leftSection={<IconSettings size={16} />}
            component={Link}
            to="/admin"
            active={active === 'admin'}
            onClick={() => setActive('admin')}
            variant="light"
          />
        )}
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
} 