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
  Loader,
  Modal,
} from "@mantine/core";
import Link from "next/link";
import { FiHome, FiUser, FiBox, FiHelpCircle, FiExternalLink } from "react-icons/fi";
import { useAdminContext } from "@/providers/AdminContext";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { SidebarContent } from "../Common/SidebarContent";

type BusinessData = {
  name?: string;
  favicon?: string;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { auth, utils } = useAdminContext();
  const [changeOpened, setChangeOpened] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  const { data: businessData, isPending } = useQuery({
    queryKey: ["adminBusiness"],
    queryFn: async () => {
      const res = await fetchWithTimeout(`${utils.baseUrl}/business`, {
        headers: { Authorization: `Bearer ${auth.token}` },
        timeout: 5000,
      });
      if (!res.ok) return null;
      return res.json() as Promise<BusinessData>;
    },
    enabled: !!auth.token,
  });


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
            {isPending ? (
              <Loader type="bars" />
            ) : (
              <Anchor component={Link} href="/admin" fw={700}>
                {businessData?.name || "Gestión de mi tienda"}
              </Anchor>
            )}
          </Group>
          {!utils.isMobile && (
            <Group>
              <Button variant="light" size="xs" onClick={() => setChangeOpened(true)}>
                Cambiar contraseña
              </Button>
              <Button variant="light" size="xs" onClick={() => auth.logout(false)}>
                Cerrar sesión
              </Button>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ background: "var(--mantine-color-body)" }}>
        <SidebarContent
          business={businessData || null}
          menuItems={menuItems.map(item => ({ href: item.to, label: item.label, icon: item.icon }))}
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
              {utils.isMobile && (
                <Group grow>
                  <Button variant="light" size="xs" onClick={() => setChangeOpened(true)}>
                    Contraseña
                  </Button>
                  <Button variant="light" size="xs" onClick={() => auth.logout(false)}>
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
                  const res = await fetch(`${utils.baseUrl}/admin/password/change`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
                    body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({} as Record<string, string>));
                    throw new Error(err?.error || "change_failed");
                  }
                  setOldPass("");
                  setNewPass("");
                  setConfirmNew("");
                  setChangeOpened(false);
                } catch (e) {
                  const er = e as Error;
                  setError(er.message || "Error al cambiar contraseña");
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
