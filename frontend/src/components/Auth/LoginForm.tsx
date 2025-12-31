import { useState, useEffect } from "react";
import { Paper, Stack, TextInput, PasswordInput, Button, Group, Title, Text } from "@mantine/core";
import { useLogin } from "../Api/AuthApi";
import { useNavigate } from "react-router-dom";
import { showNotification } from "@mantine/notifications";
import { useAppContext } from "@/Context/AppContext";

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
      isMobile
    },
    auth:{
      setToken
    }
  } = useAppContext()
  const loginHook = useLogin()
  const navigate = useNavigate()

  useEffect(() => {
    if (loginHook.isSuccess && loginHook.data) {
      // La sesión se deriva automáticamente de la validación del token
      setToken(loginHook.data.token)
      navigate("/");
      showNotification({
        title: "Inicio de sesión exitoso",
        message: `Bienvenido ${capitalizeTexts(loginHook.data?.user?.name || "usuario")}`,
        color: "green",
      });
    }
  }, [loginHook.isSuccess]);

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
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"}/admin/password/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: recoverEmail }) });
      const ok = res.ok;
      if (!ok) {
        const err = await res.json().catch(() => ({} as any));
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
