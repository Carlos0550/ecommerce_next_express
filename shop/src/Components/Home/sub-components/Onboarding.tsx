"use client";
import {
  Box,
  Title,
  Text,
  Container,
  Button,
  Stack,
  Group,
  Paper,
  Divider,
  ThemeIcon,
  SimpleGrid,
  useMantineTheme,
} from "@mantine/core";
import {
  FiShoppingBag,
  FiSettings,
  FiLayout,
  FiArrowRight,
  FiPlusCircle,
} from "react-icons/fi";
import Link from "next/link";
import { useMemo } from "react";

export default function Onboarding() {
  const theme = useMantineTheme();

  const steps = useMemo(
    () => [
      {
        icon: FiSettings,
        title: "Configura tu Negocio",
        description:
          "Define el nombre, logo, redes sociales y datos de contacto de tu tienda.",
        link: "/admin/business",
        color: "blue",
      },
      {
        icon: FiLayout,
        title: "Personaliza el Diseño",
        description:
          "Elige una paleta de colores y el estilo que mejor se adapte a tu marca.",
        link: "/admin/colors",
        color: "grape",
      },
      {
        icon: FiPlusCircle,
        title: "Carga tus Productos",
        description:
          "Agrega imágenes y detalles. Nuestra IA te ayudará a categorizarlos.",
        link: "/admin/products",
        color: "green",
      },
      {
        icon: FiShoppingBag,
        title: "¡Empieza a Vender!",
        description:
          "Comparte tu link y recibe pedidos directamente en tu panel.",
        link: "/",
        color: "orange",
      },
    ],
    []
  );

  return (
    <Container size="lg" py={50}>
      <Stack gap={40}>
        <Box ta="center">
          <Box
            style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: "100px",
              background: "var(--mantine-color-blue-light)",
              marginBottom: "16px",
            }}
          >
            <Text size="xs" fw={700} c="blue" tt="uppercase" lts={1}>
              Bienvenido a tu nueva tienda
            </Text>
          </Box>
          <Title
            order={1}
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.1 }}
          >
            Configura tu espacio y{" "}
            <Text
              component="span"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              inherit
            >
              comienza a vender
            </Text>
          </Title>
          <Text size="xl" c="dimmed" mt="xl" maw={600} mx="auto">
            Hemos preparado todo para que lances tu tienda online en cuestión de minutos. 
            Sigue estos pasos para completar la configuración.
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {steps.map((step, index) => (
            <Paper
              key={index}
              p="xl"
              radius="lg"
              withBorder
              style={{
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "pointer",
                "&:hover": {
                  transform: "translateY(-5px)",
                  boxShadow: theme.shadows.md,
                },
              }}
              component={Link}
              href={step.link}
            >
              <Group wrap="nowrap" align="flex-start" gap="lg">
                <ThemeIcon
                  size={54}
                  radius="md"
                  variant="light"
                  color={step.color}
                >
                  <step.icon size={28} />
                </ThemeIcon>
                <Stack gap={4}>
                  <Title order={3} size="h4">
                    {step.title}
                  </Title>
                  <Text size="sm" c="dimmed" lh={1.5}>
                    {step.description}
                  </Text>
                  <Group gap={4} mt="xs" c={step.color}>
                    <Text size="sm" fw={600}>
                      Ir a configurar
                    </Text>
                    <FiArrowRight size={14} />
                  </Group>
                </Stack>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>

        <Divider
          my="xl"
          label={
            <Text size="sm" c="dimmed">
              ¿Necesitas ayuda avanzada?
            </Text>
          }
          labelPosition="center"
        />

        <Paper
          p="xl"
          radius="lg"
          style={{
            background: "var(--mantine-color-dark-filled)",
            color: "white",
            textAlign: "center",
          }}
        >
          <Title order={2} size="h3" mb="xs">
            Panel de Administración
          </Title>
          <Text mb="xl" opacity={0.8}>
            Gestiona pedidos, clientes, stock y mucho más desde un solo lugar.
          </Text>
          <Button
            component={Link}
            href="/admin"
            size="lg"
            variant="white"
            color="dark"
            radius="md"
            rightSection={<FiArrowRight size={18} />}
          >
            Acceder al Panel
          </Button>
        </Paper>
      </Stack>
    </Container>
  );
}
