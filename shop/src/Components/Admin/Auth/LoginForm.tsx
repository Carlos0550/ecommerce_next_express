"use client";
import { useState, useEffect } from "react";
import { Paper, Stack, TextInput, PasswordInput, Button, Group, Title, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import { showNotification } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
export type LoginFormValues = {
  email: string;
  password: string;
};
import { useAuthStore } from "@/stores/useAuthStore";
import { authService } from "@/services/auth.service";
import { capitalizeTexts } from "@/utils/constants";
import { useWindowSize } from "@/utils/hooks/useWindowSize";
export default function LoginForm(){
  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [error, setError] = useState<string>("");
  const [recoverMode, setRecoverMode] = useState<boolean>(false);
  const [recoverEmail, setRecoverEmail] = useState<string>("");
  const { isMobile } = useWindowSize();
  const { loginAdmin, session, isAdmin } = useAuthStore();
  const router = useRouter();
  const loginMutation = useMutation({
    mutationKey: ["adminLogin"],
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return loginAdmin(email, password);
    },
    onSuccess: () => { 
      const user = useAuthStore.getState().session;
      router.push("/admin");
      showNotification({
        title: "Inicio de sesión exitoso",
        message: `Bienvenido ${capitalizeTexts(user?.name || "usuario")}`,
        color: "green",
      });
    },
    onError: (err: Error) => {
      const errorMessage = err.message || "Error al iniciar sesión";
      showNotification({
        title: "Error de inicio de sesión",
        message: errorMessage,
        color: "red",
      });
    }
  });
  useEffect(() => {
    if (session && isAdmin) {
      router.push("/admin");
    }
  }, [session, isAdmin, router]);
  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!values.email || !values.password) {
      setError("Completa email y contraseña");
      return;
    }
    loginMutation.mutate(values);
  };
  const [reseting, isReseting] = useState(false);
  const handleRecover = async () => {
    setError("");
    if (!recoverEmail) { setError("Ingresa tu email"); return; }
    try {
      isReseting(true);
      await authService.resetAdminPassword(recoverEmail);
      showNotification({ title: 'Correo enviado', message: 'Te enviamos una contraseña temporal de 6 dígitos.', color: 'green' });
      setRecoverMode(false);
      setRecoverEmail("");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || 'Error al recuperar contraseña';
      setError(msg);
    }finally{
      isReseting(false);
    }
  }
  return (
    <Paper withBorder p="md" radius="md" w={isMobile ? "100%" : 420}>
      <Stack>
        <Title order={4}>Iniciar sesión</Title>
        {!recoverMode && (
          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput label="Email" placeholder="tu@email.com" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: (e.target as HTMLInputElement).value }))} required />
              <PasswordInput label="Contraseña" placeholder="••••••••" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: (e.target as HTMLInputElement).value }))} required />
              {error && <Text c="red" size="sm">{error}</Text>}
              <Group justify="space-between">
                <Button variant="subtle" onClick={() => setRecoverMode(true)}>Recuperar contraseña</Button>
                <Button type="submit" loading={loginMutation.isPending} disabled={loginMutation.isPending}>Entrar</Button>
                <Link href="/">
                  <Button variant="subtle">Volver a la tienda</Button>
                </Link>
              </Group>
            </Stack>
          </form>
        )}
        {recoverMode && (
          <Stack>
            <TextInput label="Email" placeholder="tu@email.com" value={recoverEmail} onChange={(e) => setRecoverEmail((e.target as HTMLInputElement).value)} />
            {error && <Text c="red" size="sm">{error}</Text>}
            <Group justify="space-between">
              <Button variant="light" onClick={() => setRecoverMode(false)}>Volver</Button>
              <Button onClick={handleRecover} disabled={reseting} loading={reseting}>Enviar código</Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
