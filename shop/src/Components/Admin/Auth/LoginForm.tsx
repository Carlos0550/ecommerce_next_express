"use client";
import { useState, useEffect } from "react";
import { Paper, Stack, TextInput, PasswordInput, Button, Group, Title, Text } from "@mantine/core";
import { useLogin } from "@/Api/admin/AuthApi";
import { useRouter } from "next/navigation";
import { showNotification } from "@mantine/notifications";
import { useAdminContext } from "@/providers/AdminContext";

export type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginForm(){
  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [error, setError] = useState<string>("");
  const [recoverMode, setRecoverMode] = useState<boolean>(false);
  const [recoverEmail, setRecoverEmail] = useState<string>("");
  const {
    utils:{
      capitalizeTexts,
      isMobile,
      baseUrl
    },
    auth:{
      setToken
    }
  } = useAdminContext()
  const loginHook = useLogin()
  const router = useRouter()

  useEffect(() => {
    if (loginHook.isSuccess && loginHook.data) {
      setToken(loginHook.data.token)
      router.push("/admin");
      showNotification({
        title: "Inicio de sesión exitoso",
        message: `Bienvenido ${capitalizeTexts(loginHook.data?.user?.name || "usuario")}`,
        color: "green",
      });
    }
  }, [loginHook.isSuccess, loginHook.data, setToken, router, capitalizeTexts]);

  useEffect(() => {
    if (loginHook.isError && loginHook.error) {
      const errorMessage = loginHook.error instanceof Error 
        ? loginHook.error.message 
        : "Error al iniciar sesión";
      
      showNotification({
        title: "Error de inicio de sesión",
        message: errorMessage,
        color: "red",
      });
    }
  }, [loginHook.isError, loginHook.error]);

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!values.email || !values.password) {
      setError("Completa email y contraseña");
      return;
    }

    loginHook.mutate(values);
  };

  const handleRecover = async () => {
    setError("");
    if (!recoverEmail) { setError("Ingresa tu email"); return; }
    try {
      const res = await fetch(`${baseUrl}/admin/password/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: recoverEmail }) });
      const ok = res.ok;
      if (!ok) {
        const err = await res.json().catch(() => ({} as Record<string, string>));
        throw new Error(err?.error || 'reset_failed');
      }
      showNotification({ title: 'Correo enviado', message: 'Te enviamos una contraseña temporal de 6 dígitos.', color: 'green' });
      setRecoverMode(false);
      setRecoverEmail("");
    } catch (e) {
      const er = e as Error; setError(er.message || 'Error al recuperar contraseña');
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
                <Button type="submit" loading={loginHook.isPending} disabled={loginHook.isPending}>Entrar</Button>
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
              <Button onClick={handleRecover}>Enviar código</Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
