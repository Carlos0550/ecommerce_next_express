"use client";
import { useDisclosure } from "@mantine/hooks";
import {
  AppShell,
  Burger,
  Group,
  Anchor,
  Stack,
  Button,
  PasswordInput,
  Text,
  Modal,
  LoadingOverlay,
} from "@mantine/core";
import Link from "next/link";
import { FiHome, FiUser, FiBox, FiHelpCircle, FiExternalLink } from "react-icons/fi";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAdminStore } from "@/stores/useAdminStore";
import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarContent } from "../Common/SidebarContent";
import { useWindowSize } from "@/utils/hooks/useWindowSize";
import { showNotification } from "@mantine/notifications";
import { authService } from "@/services/auth.service";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const router = useRouter();
  const { token, logout, isAuthenticated, isAdmin, validateSession, loading } = useAuthStore();
  const { business, fetchBusiness } = useAdminStore();
  const { isMobile } = useWindowSize();
  const [changeOpened, setChangeOpened] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (token && !isAuthenticated) {
        await validateSession();
      }
      setSessionChecked(true);
    };
    checkSession();
  }, [token, isAuthenticated, validateSession]);

  useEffect(() => {
    if (!sessionChecked) return;
    if (token && isAuthenticated && !isAdmin) {
      showNotification({
        title: "Acceso denegado",
        message: "Tu cuenta no tiene permisos de administrador",
        color: "red",
      });
      router.replace("/");
    }
  }, [token, isAuthenticated, isAdmin, sessionChecked, router]);

  useEffect(() => {
    if (!sessionChecked) return;
    if (!token) {
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      router.replace("/admin/auth");
    }
  }, [token, sessionChecked, router]);
  useEffect(() => {
    if (token && !business) { 
        fetchBusiness();
    }
  }, [token, business, fetchBusiness]);
  const menuItems = useMemo(
    () => [
      { to: "/admin", label: "Inicio", icon: FiHome },
      { to: "/admin/products", label: "Productos", icon: FiBox },
      { to: "/admin/categories", label: "Categorias", icon: FiBox },
      { to: "/admin/sales", label: "Ventas", icon: FiBox },
      { to: "/admin/users", label: "Usuarios", icon: FiUser },
      { to: "/admin/faq", label: "FAQ", icon: FiHelpCircle },
      { to: "/admin/business", label: "Negocio", icon: FiUser },
      { to: "/admin/colors", label: "Colores", icon: FiBox },
    ],
    []
  );
  const sidebarMenuItems = useMemo(() => menuItems.map(item => ({ href: item.to, label: item.label, icon: item.icon })), [menuItems]);
  if (!sessionChecked || !token || (token && !isAuthenticated) || (isAuthenticated && !isAdmin)) {
    return <LoadingOverlay visible zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />;
  }
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: "lg", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header style={{ background: "var(--mantine-color-body)" }}>
        <Group justify="space-between" px="md" h="100%">
          <Group>
            <Burger opened={opened} onClick={toggle} aria-label="Toggle navigation" hiddenFrom="lg" />
            <Anchor component={Link} href="/admin" fw={700}>
                {business?.name || "Gestión de mi tienda"}
            </Anchor>
          </Group>
          {!isMobile && (
            <Group>
              <Button variant="light" size="xs" onClick={() => setChangeOpened(true)}>
                Cambiar contraseña
              </Button>
              <Button variant="light" size="xs" onClick={() => logout()}>
                Cerrar sesión
              </Button>
            </Group>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md" style={{ background: "var(--mantine-color-body)" }}>
        <SidebarContent
          business={business || null}
          menuItems={sidebarMenuItems}
          pathname={pathname}
          onLinkClick={close}
          topExtra={
            <Stack gap="xs" mt="md">
              <Link
                href={"/"}
              >
                <Button
                fullWidth
                variant="default"
                leftSection={<FiExternalLink />}
              >
                Ir a mi tienda
              </Button>
              </Link>
              {isMobile && (
                <Group grow>
                  <Button variant="light" size="xs" onClick={() => setChangeOpened(true)}>
                    Contraseña
                  </Button>
                  <Button variant="light" size="xs" onClick={() => logout()}>
                    Salir
                  </Button>
                </Group>
              )}
            </Stack>
          }
        />
      </AppShell.Navbar>
      <AppShell.Main style={{ background: "var(--mantine-color-body)" }}>{children}</AppShell.Main>
      <Modal opened={changeOpened} onClose={() => setChangeOpened(false)} title="Cambiar contraseña" size="sm">
        <Stack>
          <PasswordInput
            label="Contraseña actual"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
          />
          <PasswordInput
            label="Nueva contraseña"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
          />
          <PasswordInput
            label="Confirmar nueva"
            value={confirmNew}
            onChange={(e) => setConfirmNew(e.target.value)}
          />
          {error && <Text c="red">{error}</Text>}
          <Group justify="space-between">
            <Button variant="light" onClick={() => setChangeOpened(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setError(null);
                if (!oldPass || !newPass || !confirmNew) {
                  setError("Completa todos los campos");
                  return;
                }
                if (newPass !== confirmNew) {
                  setError("La nueva contraseña no coincide");
                  return;
                }
                setChanging(true);
                try {
                  await authService.changeAdminPassword({ old_password: oldPass, new_password: newPass });
                  setOldPass("");
                  setNewPass("");
                  setConfirmNew("");
                  setChangeOpened(false);
                  showNotification({ title: 'Éxito', message: 'Contraseña actualizada', color: 'green' });
                } catch (error: unknown) {
                    const err = error as { response?: { data?: { error?: string } }; message?: string };
                    const msg = err.response?.data?.error || err.message || "Error al cambiar contraseña";
                    setError(msg);
                } finally {
                  setChanging(false);
                }
              }}
              loading={changing}
            >
              Actualizar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}
