"use client";
import { Container, Stack } from "@mantine/core";
import BusinessForm from "@/Components/Admin/Business/BusinessForm";
import PaletteSelector from "@/Components/Admin/Business/PaletteSelector";
import WhatsAppConfig from "@/Components/Admin/WhatsApp/WhatsAppConfig";
export default function Business() {
  return (
    <Container size="sm">
      <Stack gap="lg">
        <BusinessForm />
        <PaletteSelector />
        <WhatsAppConfig />
      </Stack>
    </Container>
  );
}
