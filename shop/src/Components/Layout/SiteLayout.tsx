import { useAuthStore } from "@/stores/useAuthStore";
import { AppShell, Burger, Group, Stack, Text, Avatar, Button, Box, Paper, Divider, Flex } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import LoginForm from "../Auth/LoginForm";
import AuthModal from "../Modals/AuthModal/AuthModal";
import { useEffect, useMemo } from "react";
import { FiHome, FiUser, FiBox, FiHelpCircle, FiLogIn } from "react-icons/fi";
import { usePathname, useSearchParams } from "next/navigation";
import { useConfigStore } from "@/stores/useConfigStore";
import { SidebarContent } from "../Common/SidebarContent";
import { capitalizeTexts } from "@/utils/constants";

type Props = {
  children: React.ReactNode;
};
export default function SiteLayout({ children }: Props) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [authOpened, { open: openAuth, close: closeAuth }] = useDisclosure(false);
  const { session: user, logout, token, isAuthenticated, validateSession } = useAuthStore();
  const fullName = capitalizeTexts(user?.name || "");
  const email = user?.email || "";
  const profileImage = user?.profile_image || user?.profileImage || "";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const business = useConfigStore((state) => state.businessInfo);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  
  useEffect(() => {
    if (token && !isAuthenticated) {
      validateSession();
    }
  }, [token, isAuthenticated, validateSession]);
  
  useEffect(() => {
    const authRequired = searchParams.get("auth");
    if (authRequired === "required" && !user) {
      openAuth();
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("auth");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [searchParams, user, openAuth]);
  
  useEffect(() => {
    if (!business) fetchConfig();
  }, [business, fetchConfig]);
  const menuItems = useMemo(() => ([
    { href: "/", label: "Inicio", icon: FiHome },
    { href: "/account", label: "Mi cuenta", icon: FiUser },
    { href: "/orders", label: "Mis ordenes", icon: FiBox },
    { href: "/faq", label: "FAQ", icon: FiHelpCircle },
  ]), [])
  const hasUser = !!user;
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
            <Box visibleFrom="sm">
              <Flex align={"center"} justify={"flex-start"} gap={10}>
                <Stack p="md">
                  {hasUser ? (
                    <Group align="center" gap="md">
                      <Avatar src={profileImage} alt={fullName} radius="xl" />
                      <Text size="sm" c="dimmed">{fullName || email || "Usuario"}</Text>
                      <Button variant="light" size="xs" onClick={() => logout()}>Salir</Button>
                    </Group>
                  ) : (
                    <Group align="center" gap="md">
                      <Button onClick={openAuth}>Iniciar sesión</Button>
                    </Group>
                  )}
                </Stack>
              </Flex>
            </Box>
            <Box hiddenFrom="sm">
              {hasUser ? (
                <Group align="center" gap="sm">
                  <Avatar src={profileImage} alt={fullName} radius="xl" />
                  <Text size="sm" c="dimmed">{fullName || email || "Usuario"}</Text>
                  <Button variant="light" size="xs" onClick={() => logout()}>Salir</Button>
                </Group>
              ) : (
                <Group align="center" gap="sm">
                  <Button size="xs" onClick={openAuth}>Iniciar sesión</Button>
                </Group>
              )}
            </Box>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md" style={{ background: "var(--mantine-color-body)" }}>
        <SidebarContent
          business={business}
          menuItems={menuItems}
          pathname={pathname}
          onLinkClick={close}
          topExtra={
            !hasUser && (
              <Button
                mt="md"
                fullWidth
                variant="default"
                leftSection={<FiLogIn size={16} />}
                onClick={openAuth}
              >
                Iniciar sesión
              </Button>
            )
          }
          bottomExtra={
            <Box>
              <Divider my="md" />
              {(user?.role === 1 || !user) && (
                <Button
                component={Link}
                href="/admin"
                variant="subtle"
                fullWidth
                mb="md"
                leftSection={<FiUser size={16} />}
              >
                Panel de Administración
              </Button>
              )}
              <Paper p="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Text fw={700}>¿Necesitas ayuda?</Text>
                  <Text size="sm" c="dimmed">
                    Contáctanos para cualquier consulta
                  </Text>
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
          }
        />
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
