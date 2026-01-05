import { Box, Flex, Paper, Tabs, Title } from "@mantine/core";
import LoginForm from "../components/Auth/LoginForm";
import RegisterForm from "../components/Auth/RegisterForm";
import { useState } from "react";
import { useRegister } from "@/components/Api/AuthApi";
import { showNotification } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/Context/AppContext";


export default function Login() {
  const [formType, setFormType] = useState<"register" | "login">("login");
  const registerHook = useRegister();
  const navigate = useNavigate();
  const { auth } = useAppContext();
  
  return (
    <Flex
      justify="center"
      align="center"
      style={{ height: "100vh" }}
    >
      <Box m="auto">
        <Title mb="md">Bienvenido a <strong>Pragmatienda</strong> </Title>
        <Paper withBorder p="md" radius="md">
          <Tabs defaultValue="login" value={formType} onChange={(v) => setFormType(v as "register" | "login")}>
            <Tabs.List>
              <Tabs.Tab value="login">Iniciar sesión</Tabs.Tab>
              <Tabs.Tab value="register">Crear tienda</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="login" pt="md">
              <LoginForm/>
            </Tabs.Panel>
            <Tabs.Panel value="register" pt="md">
              <RegisterForm
                loading={registerHook.isPending}
                onSubmit={(values) => {
                  registerHook.mutate({ 
                    name: values.name, 
                    email: values.email, 
                    password: values.password,
                    storeName: values.storeName
                  }, {
                    onSuccess: (result) => {
                      if (result.ok && result.data) {
                        
                        auth.setToken(result.data.token);
                        auth.setTenantId(result.data.tenant.id);
                        
                        
                        if (result.data.slugWasModified) {
                          showNotification({ 
                            title: "¡Tienda creada!", 
                            message: `Pragmatienda estará en: ${result.data.tenant.slug}. Puedes cambiarlo desde configuración.`, 
                            color: "blue",
                            autoClose: 8000
                          });
                        } else {
                          showNotification({ 
                            title: "¡Tienda creada!", 
                            message: "Pragmatienda está lista. Configura tu negocio para comenzar.", 
                            color: "green" 
                          });
                        }
                        
                        
                        navigate("/");
                      } else {
                        showNotification({ 
                          title: "Error", 
                          message: result.message || "Error al crear la tienda", 
                          color: "red" 
                        });
                      }
                    },
                    onError: (err: any) => {
                      const msg = err instanceof Error ? err.message : 'Error al registrarse';
                      showNotification({ title: "Error de registro", message: msg, color: "red" });
                    }
                  });
                }}
              />
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Box>
    </Flex>
  );
}
