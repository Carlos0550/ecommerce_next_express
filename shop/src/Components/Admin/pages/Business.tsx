"use client";
import { Container, Stack } from "@mantine/core";
import BusinessForm from "@/Components/Admin/Business/BusinessForm";
import WhatsAppConfig from "@/Components/Admin/WhatsApp/WhatsAppConfig";
export default function Business() {
  return (
    <Container size="sm">
      <Stack gap="lg">
        <BusinessForm />
        <WhatsAppConfig />
      </Stack>
    </Container>
  );
}
