import { useState, useEffect, useRef } from "react";
import {
  Paper,
  Title,
  Stack,
  Switch,
  TextInput,
  Button,
  Group,
  Text,
  Badge,
  Modal,
  Center,
  Loader,
  Alert,
  Divider,
  Box,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  FaWhatsapp,
  FaQrcode,
  FaUnlink,
  FaPaperPlane,
  FaPhone,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaUserShield,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import {
  useGetWhatsAppConfig,
  useUpdateWhatsAppConfig,
  useCreateWhatsAppSession,
  useGetQRCode,
  useGetSessionStatus,
  useDisconnectWhatsAppSession,
  useSendTestMessage,
} from "@/components/Api/WhatsAppApi";
import QRCode from "qrcode";

function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "").replace(/-/g, "");
  
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  
  if (cleaned.startsWith("549")) {
    return "+" + cleaned;
  }
  
  if (cleaned.startsWith("54")) {
    return "+" + cleaned;
  }
  
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return "+549" + cleaned;
  }
  
  if (cleaned.length === 13 && /^\d+$/.test(cleaned) && cleaned.startsWith("549")) {
    return "+" + cleaned;
  }
  
  return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
}

export default function WhatsAppConfig() {
  const { data: config, isLoading } = useGetWhatsAppConfig();
  const updateConfig = useUpdateWhatsAppConfig();
  const createSession = useCreateWhatsAppSession();
  const disconnectSession = useDisconnectWhatsAppSession();
  const sendTest = useSendTestMessage();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [sessionName, setSessionName] = useState("Cinnamon Shop");
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("¡Hola! Este es un mensaje de prueba desde Cinnamon.");
  const [newRemitent, setNewRemitent] = useState("");
  const [localRemitents, setLocalRemitents] = useState<string[] | null>(null);

  const [qrModalOpened, { open: openQrModal, close: closeQrModal }] = useDisclosure(false);
  const [testModalOpened, { open: openTestModal, close: closeTestModal }] = useDisclosure(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // QR and status polling
  const { data: qrData, isLoading: isLoadingQR } = useGetQRCode(qrModalOpened && isConnecting);
  const { data: statusData } = useGetSessionStatus(qrModalOpened && isConnecting);

  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);

  // Derive allowed remitents from config or local state
  const allowedRemitents = localRemitents !== null 
    ? localRemitents 
    : config?.whatsapp_allowed_remitents
      ? config.whatsapp_allowed_remitents.split(",").map((r) => r.trim()).filter(Boolean)
      : [];

  // Track previous connection status to detect changes
  const prevStatusRef = useRef<string | undefined>(undefined);

  // Generate QR code image when data changes
  useEffect(() => {
    if (qrData?.qr_code) {
      QRCode.toDataURL(qrData.qr_code, { width: 256, margin: 2 })
        .then(setQrCodeImage)
        .catch(() => setQrCodeImage(null));
    }
  }, [qrData?.qr_code]);

  // Close modal when connection status changes to connected
  useEffect(() => {
    const currentStatus = statusData?.status;
    const wasConnecting = prevStatusRef.current !== "connected";
    
    if (currentStatus === "connected" && wasConnecting && isConnecting) {
      // Schedule state updates for next tick to avoid cascading renders
      queueMicrotask(() => {
        setIsConnecting(false);
        closeQrModal();
      });
    }
    
    prevStatusRef.current = currentStatus;
  }, [statusData?.status, closeQrModal, isConnecting]);

  const handleToggleEnabled = async (enabled: boolean) => {
    await updateConfig.mutateAsync({ whatsapp_enabled: enabled });
  };

  const handleConnect = async () => {
    if (!phoneNumber.trim()) return;

    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      await createSession.mutateAsync({
        name: sessionName,
        phone_number: normalizedPhone,
      });
      setIsConnecting(true);
      openQrModal();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDisconnect = async () => {
    await disconnectSession.mutateAsync();
  };

  const handleSendTest = async () => {
    if (!testNumber.trim() || !testMessage.trim()) return;
    await sendTest.mutateAsync({ to: testNumber, message: testMessage });
    closeTestModal();
  };

  const handleCloseQrModal = () => {
    setIsConnecting(false);
    closeQrModal();
  };

  const handleAddRemitent = async () => {
    if (!newRemitent.trim()) return;
    const normalized = normalizePhoneNumber(newRemitent);
    if (allowedRemitents.includes(normalized)) {
      setNewRemitent("");
      return;
    }
    const newList = [...allowedRemitents, normalized];
    setLocalRemitents(newList);
    setNewRemitent("");
    await updateConfig.mutateAsync({ whatsapp_allowed_remitents: newList.join(",") });
  };

  const handleRemoveRemitent = async (remitent: string) => {
    const newList = allowedRemitents.filter((r) => r !== remitent);
    setLocalRemitents(newList);
    await updateConfig.mutateAsync({ whatsapp_allowed_remitents: newList.join(",") });
  };

  if (isLoading) {
    return (
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Center h={200}>
          <Loader />
        </Center>
      </Paper>
    );
  }

  return (
    <>
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap="xs">
              <FaWhatsapp size={24} color="#25D366" />
              <Title order={3}>Integración WhatsApp</Title>
            </Group>
            <Switch
              checked={config?.whatsapp_enabled || false}
              onChange={(e) => handleToggleEnabled(e.currentTarget.checked)}
              label={config?.whatsapp_enabled ? "Activado" : "Desactivado"}
              color="green"
            />
          </Group>

          <Text size="sm" c="dimmed">
            Permite crear productos enviando imágenes por WhatsApp. La IA procesará 
            las imágenes y generará título y descripción automáticamente.
          </Text>

          <Divider />

          {/* Estado de conexión */}
          <Group gap="md">
            <Text fw={500}>Estado:</Text>
            {config?.whatsapp_connected ? (
              <Badge
                color="green"
                size="lg"
                leftSection={<FaCheckCircle size={12} />}
              >
                Conectado
              </Badge>
            ) : (
              <Badge
                color="gray"
                size="lg"
                leftSection={<FaTimesCircle size={12} />}
              >
                Desconectado
              </Badge>
            )}
            {config?.whatsapp_phone_number && (
              <Text size="sm" c="dimmed">
                ({config.whatsapp_phone_number})
              </Text>
            )}
          </Group>


          {config?.has_access_token && !config?.whatsapp_connected && (
            <Box>
              <Text size="sm" fw={500} mb="xs">
                Conectar WhatsApp
              </Text>
              <Group>
                <TextInput
                  placeholder="Nombre de la sesión"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.currentTarget.value)}
                  leftSection={<FaWhatsapp size={14} />}
                  style={{ flex: 1 }}
                />
                <TextInput
                  placeholder="+5491123456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.currentTarget.value)}
                  leftSection={<FaPhone size={14} />}
                  style={{ flex: 1 }}
                />
                <Button
                  leftSection={<FaQrcode size={14} />}
                  onClick={handleConnect}
                  loading={createSession.isPending}
                  disabled={!phoneNumber.trim()}
                  color="green"
                >
                  Conectar
                </Button>
              </Group>
            </Box>
          )}

          {config?.whatsapp_connected && (
            <Group>
              <Button
                variant="light"
                leftSection={<FaPaperPlane size={14} />}
                onClick={openTestModal}
              >
                Enviar mensaje de prueba
              </Button>
              <Button
                variant="light"
                color="red"
                leftSection={<FaUnlink size={14} />}
                onClick={handleDisconnect}
                loading={disconnectSession.isPending}
              >
                Desconectar
              </Button>
            </Group>
          )}

          {config?.whatsapp_connected && (
            <Box>
              <Divider my="md" />
              <Group gap="xs" mb="xs">
                <FaUserShield size={14} />
                <Text size="sm" fw={500}>
                  Remitentes Permitidos
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mb="sm">
                Solo estos números podrán interactuar con Cleria. Si la lista está vacía, 
                cualquier número puede usarlo (no recomendado en producción).
              </Text>
              <Group mb="sm">
                <TextInput
                  placeholder="+5491123456789"
                  value={newRemitent}
                  onChange={(e) => setNewRemitent(e.currentTarget.value)}
                  leftSection={<FaPhone size={14} />}
                  style={{ flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddRemitent();
                  }}
                />
                <Button
                  leftSection={<FaPlus size={14} />}
                  onClick={handleAddRemitent}
                  loading={updateConfig.isPending}
                  disabled={!newRemitent.trim()}
                >
                  Agregar
                </Button>
              </Group>
              {allowedRemitents.length > 0 ? (
                <Stack gap="xs">
                  {allowedRemitents.map((remitent) => (
                    <Group key={remitent} justify="space-between">
                      <Badge size="lg" variant="light">
                        {remitent}
                      </Badge>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        leftSection={<FaTrash size={12} />}
                        onClick={() => handleRemoveRemitent(remitent)}
                        loading={updateConfig.isPending}
                      >
                        Eliminar
                      </Button>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Alert color="yellow" icon={<FaExclamationTriangle />}>
                  No hay remitentes configurados. Cualquier número puede usar el bot.
                </Alert>
              )}
            </Box>
          )}

          {!config?.has_access_token && (
            <Alert
              color="yellow"
              icon={<FaExclamationTriangle />}
              title="Token no configurado"
            >
              Para usar la integración de WhatsApp, debes configurar la variable de entorno 
              WASENDER_API_KEY en el servidor con tu Personal Access Token de WasenderAPI.
            </Alert>
          )}
        </Stack>
      </Paper>

      <Modal
        opened={qrModalOpened}
        onClose={handleCloseQrModal}
        title={
          <Group gap="xs">
            <FaWhatsapp size={20} color="#25D366" />
            <Text fw={500}>Conectar WhatsApp</Text>
          </Group>
        }
        centered
      >
        <Stack align="center" gap="md">
          {isLoadingQR ? (
            <>
              <Loader size="lg" />
              <Text>Generando código QR...</Text>
            </>
          ) : qrCodeImage ? (
            <>
              <img
                src={qrCodeImage}
                alt="WhatsApp QR Code"
                style={{ maxWidth: 256, borderRadius: 8 }}
              />
              <Text ta="center" size="sm">
                Abre WhatsApp en tu teléfono y escanea este código para conectar.
              </Text>
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  Esperando conexión...
                </Text>
              </Group>
            </>
          ) : (
            <Alert color="red">
              No se pudo generar el código QR. Intenta de nuevo.
            </Alert>
          )}

          <Button variant="light" onClick={handleCloseQrModal}>
            Cancelar
          </Button>
        </Stack>
      </Modal>

      {/* Modal Test Message */}
      <Modal
        opened={testModalOpened}
        onClose={closeTestModal}
        title="Enviar mensaje de prueba"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Número de destino"
            placeholder="+5491123456789"
            value={testNumber}
            onChange={(e) => setTestNumber(e.currentTarget.value)}
            leftSection={<FaPhone size={14} />}
          />
          <TextInput
            label="Mensaje"
            placeholder="Tu mensaje..."
            value={testMessage}
            onChange={(e) => setTestMessage(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={closeTestModal}>
              Cancelar
            </Button>
            <Button
              leftSection={<FaPaperPlane size={14} />}
              onClick={handleSendTest}
              loading={sendTest.isPending}
              disabled={!testNumber.trim() || !testMessage.trim()}
            >
              Enviar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

