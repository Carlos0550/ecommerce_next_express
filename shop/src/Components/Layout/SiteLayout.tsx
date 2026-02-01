"use client";
import { useAppContext } from "@/providers/AppContext";
import { AppShell, Burger, Group, Stack, Text, Avatar, Button, Box, Paper, Divider, Flex } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import LoginForm from "../Auth/LoginForm";
import AuthModal from "../Modals/AuthModal/AuthModal";
import { useEffect, useMemo, useState } from "react";
import { FiHome, FiUser, FiBox, FiHelpCircle, FiLogIn } from "react-icons/fi";
import { usePathname } from "next/navigation";
import type { BusinessData } from "@/Api/useBusiness";
import { SidebarContent } from "../Common/SidebarContent";

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
        <SidebarContent
          business={business}
          menuItems={menuItems}
          pathname={pathname}
          onLinkClick={close}
          topExtra={
            !auth.isAuthenticated && (
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
