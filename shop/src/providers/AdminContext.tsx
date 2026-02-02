"use client";
import { createContext, useContext, useMemo, useEffect } from "react";
import { useUnifiedAuth } from "./useUnifiedAuth";
import { useWindowSize } from "@/utils/hooks/useWindowSize";
import { capitalizeTexts, BASE_URL } from "@/utils/constants";
import { usePathname, useRouter } from "next/navigation";
import { Loader, Center, Box, Text, Button, Stack } from "@mantine/core";

type AdminContextValue = {
  auth: ReturnType<typeof useUnifiedAuth>;
  utils: {
    baseUrl: string;
    isMobile: boolean;
    capitalizeTexts: (text: string) => string;
  };
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useUnifiedAuth();
  const { isMobile } = useWindowSize();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname?.startsWith("/admin/auth");

  useEffect(() => {
    if (!auth.loading && !isAuthPage) {
      if (!auth.session) {
        router.push("/admin/auth");
        return;
      }

      if (!auth.isAdmin) {
        router.push("/admin/auth");
        return;
      }
    }
  }, [auth.loading, auth.session, auth.isAdmin, isAuthPage, router]);

  const value = useMemo<AdminContextValue>(
    () => ({
      auth,
      utils: {
        baseUrl: BASE_URL,
        isMobile,
        capitalizeTexts,
      },
    }),
    [auth, isMobile]
  );

  if (auth.loading && !isAuthPage) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Center>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Verificando sesión...</Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  if (!isAuthPage && !auth.loading && !auth.session) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Center>
          <Stack align="center" gap="md">
            <Text>Redirigiendo al inicio de sesión...</Text>
            <Button variant="light" onClick={() => router.push("/admin/auth")}>
              Ir a iniciar sesión
            </Button>
          </Stack>
        </Center>
      </Box>
    );
  }

  if (!isAuthPage && !auth.loading && auth.session && !auth.isAdmin) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Center>
          <Stack align="center" gap="md">
            <Text c="red" fw={500}>Acceso denegado</Text>
            <Text c="dimmed">Esta sección es solo para administradores.</Text>
            <Button variant="light" onClick={() => auth.logout({ redirect: "/" })}>
              Volver al inicio
            </Button>
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error(
      "useAdminContext must be used within an AdminContextProvider"
    );
  }
  return context;
}
