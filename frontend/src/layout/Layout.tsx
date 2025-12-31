'use client'
import { useDisclosure } from '@mantine/hooks';
import { AppShell, Burger, Group, Anchor, Stack, ActionIcon, Button, PasswordInput, Text, Loader, Paper, Avatar } from '@mantine/core';
import { Link, Outlet } from 'react-router-dom';
import { FiMenu, FiHome, FiUser, FiBox, FiHelpCircle, FiExternalLink } from 'react-icons/fi';
import { useMantineColorScheme } from '@mantine/core';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useAppContext } from '@/Context/AppContext';
import ModalWrapper from '@/components/Common/ModalWrapper';
import { useMemo, useState } from 'react';
import { useGetBusiness } from '@/components/Api/BusinessApi';
import { useLocation } from 'react-router-dom';

export default function Layout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { auth, utils } = useAppContext();
  const {data, isPending} = useGetBusiness()
  const [changeOpened, setChangeOpened] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const goToShop = () => {
    const environment = import.meta.env.VITE_ENV;
    if (environment === 'development') {
      window.open('http://localhost:3001', '_blank');
    } else {
      window.open(import.meta.env.VITE_PRODUCTION_API_URL, '_blank');
    }
  }
  const menuItems = useMemo(() => ([
    { to: "/", label: "Inicio", icon: FiHome },
    { to: "/products", label: "Productos", icon: FiBox },
    { to: "/categories", label: "Categorias", icon: FiBox },
    { to: "/sales", label: "Ventas", icon: FiBox },
    { to: "/users", label: "Usuarios", icon: FiUser },
    { to: "/faq", label: "FAQ", icon: FiHelpCircle },
    { to: "/business", label: "Negocio", icon: FiUser },
    { to: "/colors", label: "Colores", icon: FiBox },
  ]), []);
  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'lg', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header style={{ background: 'var(--mantine-color-body)' }}>
        <Group justify="space-between" px="md" h="100%">
          <Group>
            <Burger opened={opened} onClick={toggle} aria-label="Toggle navigation" hiddenFrom="lg" />
            <FiMenu size={20} style={{ display: 'none' }} />
            {isPending ? (
              <Loader type="bars"/>
            ) : (
              <Anchor component={Link} to="/" fw={700}>
                {data?.name || 'Gestión de mi tienda'}
              </Anchor>
            )}
          </Group>
          {!utils.isMobile && (
            <Group>
            <ColorSchemeToggle />
            <Button variant="light" size="xs" onClick={() => setChangeOpened(true)}>Cambiar contraseña</Button>
            <Button variant="light" size="xs" onClick={() => auth.logout(false)}>Cerrar sesión</Button>
          </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ background: 'var(--mantine-color-body)' }}>
        <Stack gap="md" onClick={close} h="100%" justify="space-between">
          <Stack gap="md">
            <Paper p="md" radius="md" withBorder>
              <Group align="center" justify="space-between">
                <Group align="center">
                  <Avatar src={data?.favicon || '/logo.png'} radius="xl" />
                  <Stack gap={2}>
                    {isPending ? (
                      <Loader type="bars"/>
                    ) : (
                      <Text fw={600}>{data?.name || 'Gestión de mi tienda'}</Text>
                    )}
              
                  </Stack>
                </Group>
                <ColorSchemeToggle />
              </Group>
              <Button mt="md" fullWidth variant="default" leftSection={<FiExternalLink />} onClick={goToShop}>
                Ir a mi tienda
              </Button>
              {utils.isMobile && (
                <Group mt="md">
                  <Button variant="light" size="xs" onClick={() => setChangeOpened(true)}>Cambiar contraseña</Button>
                  <Button variant="light" size="xs" onClick={() => auth.logout(false)}>Cerrar sesión</Button>
                </Group>
              )}
            </Paper>
            <Text size="xs" fw={700} c="dimmed">MENÚ</Text>
            <Stack gap="xs">
              {menuItems.map(item => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    variant={active ? "default" : "subtle"}
                    radius="md"
                    fullWidth
                    justify="space-between"
                    leftSection={<Icon />}
                    style={active ? { background: 'var(--mantine-color-white)', color: 'var(--mantine-color-black)' } : undefined}
                  >
                    {item.label}
                  </Button>
                )
              })}
            </Stack>
          </Stack>
         
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main style={{ background: 'var(--mantine-color-body)' }}>
        <Outlet />
      </AppShell.Main>
      <ModalWrapper opened={changeOpened} onClose={() => setChangeOpened(false)} title="Cambiar contraseña" size="sm">
        <Stack>
          <PasswordInput label="Contraseña actual" value={oldPass} onChange={(e) => setOldPass((e.target as HTMLInputElement).value)} />
          <PasswordInput label="Nueva contraseña" value={newPass} onChange={(e) => setNewPass((e.target as HTMLInputElement).value)} />
          <PasswordInput label="Confirmar nueva" value={confirmNew} onChange={(e) => setConfirmNew((e.target as HTMLInputElement).value)} />
          {error && <Text c="red">{error}</Text>}
          <Group justify="space-between">
            <Button variant="light" onClick={() => setChangeOpened(false)}>Cancelar</Button>
            <Button onClick={async () => {
              setError(null);
              if (!oldPass || !newPass || !confirmNew) { setError('Completa todos los campos'); return; }
              if (newPass !== confirmNew) { setError('La nueva contraseña no coincide'); return; }
              setChanging(true);
              try {
                const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}/admin/password/change`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
                  body: JSON.stringify({ old_password: oldPass, new_password: newPass })
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({} as any));
                  throw new Error(err?.error || 'change_failed');
                }
                setOldPass(''); setNewPass(''); setConfirmNew(''); setChangeOpened(false);
              } catch (e) {
                const er = e as Error; setError(er.message || 'Error al cambiar contraseña');
              } finally { setChanging(false); }
            }} loading={changing}>Actualizar</Button>
          </Group>
        </Stack>
      </ModalWrapper>
    </AppShell>
  );
}

function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  return (
    <ActionIcon
      variant="light"
      aria-label="Toggle color scheme"
      onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <FiSun /> : <FiMoon />}
    </ActionIcon>
  );
}
