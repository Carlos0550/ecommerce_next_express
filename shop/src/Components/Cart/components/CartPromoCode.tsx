import { useState } from "react";
import { Box, Group, Text, TextInput, Button, ActionIcon } from "@mantine/core";
import { FaTag, FaTimes } from "react-icons/fa";
import { showNotification } from "@mantine/notifications";
import { formatCurrency } from "@/utils/constants";
import type { Cart } from "@/providers/useCart";

type CartPromoCodeProps = {
  cart: Cart;
  baseUrl: string;
  onApplyPromo: (code: string, baseUrl: string) => Promise<{ ok: boolean; discount?: number; error?: string; min_amount?: number }>;
  onRemovePromo: () => void;
};

const errorMessages: Record<string, string> = {
  promo_not_found: "Código de promoción no encontrado",
  promo_inactive: "Esta promoción no está activa",
  promo_expired: "Esta promoción ha expirado",
  promo_not_started: "Esta promoción aún no está disponible",
  promo_usage_limit_reached: "Esta promoción alcanzó su límite de uso",
  promo_user_limit_reached: "Ya has usado esta promoción el máximo de veces permitido",
  promo_not_applicable_to_items: "Esta promoción no aplica a los productos en tu carrito",
  network_error: "Error de conexión. Intenta de nuevo.",
};

export function CartPromoCode({ cart, baseUrl, onApplyPromo, onRemovePromo }: CartPromoCodeProps) {
  const [promoInput, setPromoInput] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) {
      showNotification({
        title: "Código requerido",
        message: "Ingresa un código de promoción",
        color: "yellow",
      });
      return;
    }
    setValidatingPromo(true);
    const result = await onApplyPromo(promoInput, baseUrl);
    setValidatingPromo(false);
    if (result.ok) {
      showNotification({
        title: "Promoción aplicada",
        message: `Descuento de ${formatCurrency(result.discount || 0)} aplicado`,
        color: "green",
      });
      setPromoInput("");
    } else {
      const minAmountMsg = result.min_amount
        ? `El monto mínimo de compra es ${formatCurrency(result.min_amount)}`
        : null;
      showNotification({
        title: "Código inválido",
        message:
          result.error === "min_order_amount_not_met" && minAmountMsg
            ? minAmountMsg
            : errorMessages[result.error || ""] || "El código de promoción no es válido",
        color: "red",
      });
    }
  };

  const handleRemovePromo = () => {
    onRemovePromo();
    showNotification({
      title: "Promoción removida",
      message: "El código de promoción fue removido",
      color: "blue",
    });
  };

  if (cart.items.length === 0) return null;

  return (
    <Box>
      {cart.promo_code ? (
        <Group
          justify="space-between"
          align="center"
          p="sm"
          style={{
            border: "1px solid var(--mantine-color-green-6)",
            borderRadius: 8,
            backgroundColor: "var(--mantine-color-green-0)",
          }}
        >
          <Group gap="xs">
            <FaTag size={14} />
            <Text size="sm" fw={500}>
              {cart.promo_code}
            </Text>
            {cart.promo_title && (
              <Text size="xs" c="dimmed">
                - {cart.promo_title}
              </Text>
            )}
          </Group>
          <Group gap="xs">
            {cart.discount && cart.discount > 0 && (
              <Text size="sm" fw={600} c="green">
                -{formatCurrency(cart.discount)}
              </Text>
            )}
            <ActionIcon variant="subtle" color="red" size="sm" onClick={handleRemovePromo}>
              <FaTimes size={12} />
            </ActionIcon>
          </Group>
        </Group>
      ) : (
        <Group gap="xs" align="flex-end">
          <TextInput
            placeholder="Código de promoción"
            value={promoInput}
            onChange={(e) => setPromoInput(e.currentTarget.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
            leftSection={<FaTag size={14} />}
            style={{ flex: 1 }}
            size="sm"
          />
          <Button
            size="sm"
            onClick={handleApplyPromo}
            loading={validatingPromo}
            disabled={!promoInput.trim() || validatingPromo}
          >
            Aplicar
          </Button>
        </Group>
      )}
    </Box>
  );
}
