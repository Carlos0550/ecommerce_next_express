import {
  Stack,
  Group,
  Text,
  Alert,
  Loader,
  Card,
  Divider,
  ActionIcon,
  CopyButton,
  Tooltip,
} from "@mantine/core";
import { FaUniversity, FaCopy, FaCheck } from "react-icons/fa";
type BankData = {
  bank_name: string;
  account_number: string;
  account_holder: string;
};
type CartBankInfoProps = {
  isLoading: boolean;
  error: Error | null;
  bankData: BankData[] | undefined;
  onFileChange: (file: File | null) => void;
};
export function CartBankInfo({ isLoading, error, bankData, onFileChange }: CartBankInfoProps) {
  if (isLoading) {
    return (
      <Group justify="center" my="md">
        <Loader size="sm" />
        <Text size="sm">Cargando datos bancarios...</Text>
      </Group>
    );
  }
  if (error) {
    return (
      <Alert color="red" title="Error">
        No se pudieron cargar los datos bancarios. Por favor contacte al negocio.
      </Alert>
    );
  }
  if (!bankData || bankData.length === 0) {
    return <Alert color="yellow">No hay cuentas bancarias configuradas.</Alert>;
  }
  return (
    <Stack gap="sm">
      <Text size="sm" fw={500}>
        Cuentas disponibles para transferir:
      </Text>
      {bankData.map((bank, index) => (
        <Card key={index} withBorder shadow="sm" radius="md" p="sm">
          <Group justify="space-between" align="start">
            <Stack gap={2}>
              <Group gap="xs">
                <FaUniversity size={14} color="gray" />
                <Text size="sm" fw={700}>
                  {bank.bank_name}
                </Text>
              </Group>
              <Text size="sm">CBU/CVU: {bank.account_number}</Text>
              <Text size="xs" c="dimmed">
                Titular: {bank.account_holder}
              </Text>
            </Stack>
            <CopyButton value={bank.account_number} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copiado" : "Copiar CBU"} withArrow position="right">
                  <ActionIcon color={copied ? "teal" : "gray"} variant="subtle" onClick={copy}>
                    {copied ? <FaCheck size={16} /> : <FaCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Card>
      ))}
      <Divider my="xs" />
      <Text size="sm" fw={500}>
        Adjunta tu comprobante de transferencia (imagen/PDF):
      </Text>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
    </Stack>
  );
}
