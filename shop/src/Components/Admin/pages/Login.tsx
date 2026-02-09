"use client";
import { Box, Flex, Paper, Title } from "@mantine/core";
import LoginForm from "@/Components/Admin/Auth/LoginForm";
import { useEffect, useState } from "react";
import { configService } from "@/services/config.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { PublicBusinessInfo } from "@/stores/useConfigStore";
export default function Login() {
  const [business, setBusiness] = useState<PublicBusinessInfo | null>(null);
  const { session, isAdmin } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    configService.getPublicBusinessInfo().then(setBusiness);
  }, []);
  useEffect(() => {
    if (session && isAdmin) {
      router.push("/admin");
    }
  }, [session, isAdmin, router]);
  return (
    <Flex
      justify="center"
      align="center"
      style={{ height: "100vh" }}
    >
      <Box m="auto">
        <Title mb="md">Bienvenido a {business?.name || "Tu tienda online"}</Title>
        <Paper withBorder p="md" radius="md">
          <LoginForm />
        </Paper>
      </Box>
    </Flex>
  );
}
