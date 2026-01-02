import { Container, Stack } from "@mantine/core";
import BusinessForm from "@/components/Business/BusinessForm";
import WhatsAppConfig from "@/components/WhatsApp/WhatsAppConfig";

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

