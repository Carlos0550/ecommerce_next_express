"use client";
import { Box, Flex, Paper, Tabs, Title } from "@mantine/core";
import LoginForm from "@/Components/Admin/Auth/LoginForm";
import RegisterForm from "@/Components/Admin/Auth/RegisterForm";
import { useEffect, useState } from "react";
import { showNotification } from "@mantine/notifications";
import { getPublicBusiness, type BusinessData } from "@/Api/admin/BusinessApi";
import { useAdminContext } from "@/providers/AdminContext";
import { useRouter } from "next/navigation";

export default function Login() {
  const [formType, setFormType] = useState<"register" | "login">("login");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const { auth } = useAdminContext();
  const router = useRouter();

  useEffect(() => {
    getPublicBusiness().then(setBusiness);
  }, []);

  useEffect(() => {
    if (auth.session && auth.isAdmin) {
      router.push("/admin");
    }
  }, [auth.session, auth.isAdmin, router]);

  const handleRegister = async (values: { name: string; email: string; password: string; asAdmin: boolean }) => {
    setRegisterLoading(true);
    try {
      const result = await auth.registerAdmin(values.name, values.email, values.password);
      
      if (result.pending) {
        showNotification({ 
          title: "Solicitud enviada", 
          message: result.message || "Tu solicitud está pendiente de aprobación.", 
          color: "blue" 
        });
        setFormType("login");
      } else {
        showNotification({ 
          title: "Cuenta creada", 
          message: "Ahora puedes iniciar sesión", 
          color: "green" 
        });
        router.push("/admin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrarse';
      showNotification({ title: "Error de registro", message: msg, color: "red" });
    } finally {
      setRegisterLoading(false);
    }
  };
  
  return (
    <Flex
      justify="center"
      align="center"
      style={{ height: "100vh" }}
    >
      <Box m="auto">
        <Title mb="md">Bienvenido a {business?.name || "Tu tienda online"}</Title>
        <Paper withBorder p="md" radius="md">
          <Tabs defaultValue="login" value={formType} onChange={(v) => setFormType(v as "register" | "login")}>
            <Tabs.List>
              <Tabs.Tab value="login">Iniciar sesión</Tabs.Tab>
              <Tabs.Tab value="register">Registrarme</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="login" pt="md">
              <LoginForm/>
            </Tabs.Panel>
            <Tabs.Panel value="register" pt="md">
              <RegisterForm
                loading={registerLoading}
                onSubmit={handleRegister}
              />
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Box>
    </Flex>
  );
}
