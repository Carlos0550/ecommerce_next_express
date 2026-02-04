"use client";
import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { authService } from "@/services/auth.service";
import { capitalizeTexts } from "@/utils/constants";
import { Button, Stack, TextInput, Title, Text, Flex, PasswordInput, Group, Checkbox } from "@mantine/core";
import { Form, useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import { useConfigStore } from "@/stores/useConfigStore";
type Props = {
  onClose: () => void;
}
export default function LoginForm({ onClose }: Props) {
  const { loginUser, registerUser, registerAdmin } = useAuthStore();
  const business = useConfigStore((state) => state.businessInfo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoverMode, setRecoverMode] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const loginForm = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
      password: (value) => (value.length >= 6 ? null : "Min 6 caracteres"),
    },
  });
  const registerForm = useForm({
    initialValues: { name: "", email: "", asAdmin: false },
    validate: {
      name: (value) => (value.length > 2 ? null : "Nombre muy corto"),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
    },
  });
  const onLoginSubmit = async (values: { email: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      await loginUser(values.email, values.password);
      const user = useAuthStore.getState().session;
      if (user) {
        showNotification({
          title: `Bienvenido nuevamente ${capitalizeTexts(user.name)}`,
          message: "",
          color: "green",
          autoClose: 3000,
        })
        onClose();
      }
    } catch (err) {
      const e = err as Error;
      setError(e?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };
  const onRegisterSubmit = async (values: { name: string; email: string; asAdmin: boolean }) => {
    setError(null);
    setLoading(true);
    try {
      if (values.asAdmin) {
          await registerAdmin(values.name, values.email);
      } else {
          await registerUser(values.name, values.email);
      }
      const user = useAuthStore.getState().session;
      if (user) {
        showNotification({
          title: `Bienvenido a ${business?.name || "Tienda online"}, ${capitalizeTexts(user.name)}`,
          message: "Tu cuenta ha sido creada exitosamente. Revisa tu correo para obtener tu contraseña.",
          color: "green",
          autoClose: 5000,
        })
        onClose();
      } else {
         showNotification({
              title: "Registro exitoso",
              message: "Revisa tu correo para continuar.",
              color: "blue",
              autoClose: 10000,
          });
          onClose();
      }
    } catch (err) {
      const e = err as Error;
      setError(e?.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };
  const onRecover = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.resetPassword(recoverEmail);
      showNotification({ title: 'Correo enviado', message: 'Revisa tu bandeja: te enviamos una contraseña temporal de 6 dígitos.', color: 'green', autoClose: 4000 });
      setRecoverMode(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || 'Error al recuperar contraseña';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }
  if (recoverMode) {
    return (
      <Flex direction="column" gap="xs" maw={520} align="center" justify={"space-between"}>
        <Title order={3}>Recuperar contraseña</Title>
        <Stack w={"100%"} p={"md"} gap="sm">
          <TextInput label="Correo" placeholder="tu@correo.com" value={recoverEmail} onChange={(e) => setRecoverEmail(e.currentTarget.value)} />
          {error && <Text c="red">{error}</Text>}
          <Group justify="space-between">
            <Button variant="light" onClick={() => setRecoverMode(false)}>Volver</Button>
            <Button onClick={onRecover} loading={loading} disabled={loading || !recoverEmail}>Enviar código</Button>
          </Group>
        </Stack>
      </Flex>
    );
  }
  return (
    <Flex direction="column" gap="xs" maw={520} align="center" justify={"space-between"}>
        <Title order={3}>{isRegistering ? "Crear cuenta" : "Iniciar sesión"}</Title>
        <Stack w={"100%"} p={"md"}>
          {!isRegistering ? (
             <Form form={loginForm} onSubmit={onLoginSubmit}>
             <Stack gap="sm">
               <TextInput
                 label="Correo"
                 placeholder="tu@correo.com"
                 {...loginForm.getInputProps("email")}
               />
               <PasswordInput
                 label="Contraseña"
                 placeholder="••••••••"
                 {...loginForm.getInputProps("password")}
               />
               {error && <Text c="red">{error}</Text>}
               <Button type="submit" loading={loading}>
                 Entrar
               </Button>
               <Button variant="subtle" size="xs" onClick={() => setRecoverMode(true)}>Recuperar contraseña</Button>
               <Flex align="center" justify="center" mt="sm">
                 <Text size="sm">¿No tienes cuenta?</Text>
                 <Button variant="subtle" size="sm" onClick={() => setIsRegistering(true)}>Crear una</Button>
               </Flex>
             </Stack>
           </Form>
          ) : (
            <Form form={registerForm} onSubmit={onRegisterSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Nombre"
                placeholder="Tu nombre"
                {...registerForm.getInputProps("name")}
              />
              <TextInput
                label="Correo"
                placeholder="tu@correo.com"
                {...registerForm.getInputProps("email")}
              />
              <Checkbox
                mt="xs"
                label="Registrar como administrador"
                {...registerForm.getInputProps("asAdmin", { type: 'checkbox' })}
              />
              {error && <Text c="red">{error}</Text>}
              <Button type="submit" loading={loading} mt="sm">
                Registrarse
              </Button>
              <Flex align="center" justify="center" mt="sm">
                 <Text size="sm">¿Ya tienes cuenta?</Text>
                 <Button variant="subtle" size="sm" onClick={() => setIsRegistering(false)}>Inicia sesión</Button>
               </Flex>
            </Stack>
          </Form>
          )}
        </Stack>
    </Flex>
  );
}
