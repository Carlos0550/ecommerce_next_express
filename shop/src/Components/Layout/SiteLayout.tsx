"use client";
import { useAppContext } from "@/providers/AppContext";
import { AppShell, Burger, Group, Stack, Flex, Text, Avatar, Button, useMantineColorScheme, ActionIcon, Box, Paper, Divider } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import LoginForm from "../Auth/LoginForm";
import AuthModal from "../Modals/AuthModal/AuthModal";
import { useEffect, useMemo, useState } from "react";
import { FiHome, FiUser, FiBox, FiHelpCircle, FiLogIn } from "react-icons/fi";
import { usePathname } from "next/navigation";
import type { BusinessData } from "@/Api/useBusiness";
type Props = {
  children: React.ReactNode;
};

export default function SiteLayout({ children }: Props) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [authOpened, { open: openAuth, close: closeAuth }] = useDisclosure(false);
  const { auth, utils } = useAppContext();
  const fullName = utils.capitalizeTexts(auth.state.user?.name || "");
  const email = auth.state.user?.email || "";
  const {
    utils: {
      isMobile,
    }
  } = useAppContext()
  const pathname = usePathname()
  const [business, setBusiness] = useState<BusinessData | null>(null)
  useEffect(() => {
    const url = `${utils.baseUrl}/business/public`
    fetch(url).then(async (r) => {
      if (!r.ok) return null
      return r.json()
    }).then((d) => setBusiness(d as BusinessData | null)).catch(() => setBusiness(null))
  }, [utils.baseUrl])
  const menuItems = useMemo(() => ([
    { href: "/", label: "Inicio", icon: FiHome },
    { href: "/account", label: "Mi cuenta", icon: FiUser },
    { href: "/orders", label: "Mis ordenes", icon: FiBox },
    { href: "/faq", label: "FAQ", icon: FiHelpCircle },
  ]), [])
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname?.startsWith(href)
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: "lg", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header style={{ background: "var(--mantine-color-body)" }}>
        <Group justify="space-between" px="md" h="100%">
            
          <Group>
            <Burger opened={opened} onClick={toggle} aria-label="Toggle navigation" hiddenFrom="lg" />
            {!isMobile ? (
              <Flex align={"center"} justify={"flex-start"} gap={10}>
                <Stack p="md">
                  {auth.isAuthenticated ? (
                    <Group align="center" gap="md">
                      <Avatar src={auth.state.user?.profileImage} alt={fullName} radius="xl" />
                      <Text size="sm" c="dimmed">{fullName || email || "Usuario"}</Text>
                      <Button variant="light" size="xs" onClick={auth.signOut}>Salir</Button>
                    </Group>
                  ) : (
                    <Group align="center" gap="md">
                      <Button onClick={openAuth}>Iniciar sesión</Button>
                    </Group>
                  )}
                </Stack>
              </Flex>
            ) : (
              auth.isAuthenticated ? (
                <Group align="center" gap="sm">
                  <Avatar src={auth.state.user?.profileImage} alt={fullName} radius="xl" />
                  <Text size="sm" c="dimmed">{fullName || email || "Usuario"}</Text>
                  <Button variant="light" size="xs" onClick={auth.signOut}>Salir</Button>
                </Group>
              ) : (
                <Group align="center" gap="sm">
                  <Button size="xs" onClick={openAuth}>Iniciar sesión</Button>
                </Group>
              )
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ background: "var(--mantine-color-body)" }}>
        <Flex direction="column" h="100%" justify="space-between">
          <Stack gap="md" onClick={close}>
            <Paper p="md" radius="md" withBorder>
              <Group align="center" justify="space-between">
                <Group align="center">
                  <Avatar src={business?.favicon || "/logo.png"} radius="xl" />
                  <Stack gap={2}>
                    <Text fw={600}>{business?.name || "Tu Tienda"}</Text>
                  </Stack>
                </Group>
                <ColorSchemeToggle />
              </Group>
              {!auth.isAuthenticated && (
                <Button mt="md" fullWidth variant="default" leftSection={<FiLogIn size={16} />} onClick={openAuth}>
                  Iniciar sesión
                </Button>
              )}
            </Paper>
            <Text size="xs" fw={700} c="dimmed">MENÚ</Text>
            <Stack gap="xs">
              {menuItems.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    variant={active ? "default" : "subtle"}
                    radius="md"
                    fullWidth
                    justify="space-between"
                    leftSection={<Icon />}
                    style={active ? { background: "var(--mantine-color-white)", color: "var(--mantine-color-black)" } : undefined}
                  >
                    {item.label}
                  </Button>
                )
              })}
            </Stack>
          </Stack>
          <Box>
            <Divider my="md" />
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Text fw={700}>¿Necesitas ayuda?</Text>
                <Text size="sm" c="dimmed">Contáctanos para cualquier consulta</Text>
                <Button
                  component="a"
                  href={`https://wa.me/${business?.phone?.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="default"
                >
                  Contactar soporte
                </Button>
              </Stack>
            </Paper>
          </Box>
        </Flex>
      </AppShell.Navbar>

      <AppShell.Main bg="var(--mantine-color-body)">
        {children}
      </AppShell.Main>
      <AuthModal opened={authOpened} onClose={closeAuth}>
        <LoginForm onClose={closeAuth} />
      </AuthModal>
    </AppShell>
  );
}

function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hidratación mismatch: solo renderizar después del mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Durante SSR, renderizar un estado neutral
  if (!mounted) {
    return (
      <ActionIcon
        variant="light"
        aria-label="Toggle color scheme"
        title="Cambiar tema"
      >
        <span style={{ fontSize: 18 }}>🌙</span>
      </ActionIcon>
    );
  }

  const isDark = colorScheme === "dark";
  return (
    <ActionIcon
      variant="light"
      aria-label="Toggle color scheme"
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
      title={isDark ? "Cambiar a claro" : "Cambiar a oscuro"}
    >
      <span style={{ fontSize: 18 }}>{isDark ? "☀️" : "🌙"}</span>
    </ActionIcon>
  );
}
