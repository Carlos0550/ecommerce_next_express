import { Box, Group, Image, Text, ActionIcon, Stack, Badge } from "@mantine/core";
import { FaMinus, FaPlus } from "react-icons/fa";
import type { CartItem, SelectedOption } from "@/services/cart.service";
import { formatCurrency } from "@/utils/constants";
type CartItemCardProps = {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number, options?: SelectedOption[]) => void;
};
export function CartItemCard({ item, onUpdateQuantity }: CartItemCardProps) {
  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <Group justify="space-between" align="center">
        <Group align="center" gap="md">
          <Image
            src={item.image_url}
            alt={item.product_name}
            w={64}
            h={64}
            fit="cover"
            radius="sm"
          />
          <Stack gap={4}>
            <Text fw={600}>{item.product_name}</Text>
            <Text>{formatCurrency(item.price)}</Text>
            {Array.isArray(item.options) && item.options.length > 0 && (
              <Group gap="xs">
                {item.options.map((opt: SelectedOption, idx: number) => (
                  <Badge key={idx} variant="light" color="gray">
                    {`${opt?.name || ""}: ${opt?.value || ""}`}
                  </Badge>
                ))}
                <Badge variant="filled" color="blue">
                  x{item.quantity}
                </Badge>
              </Group>
            )}
            {item.price_changed && (
              <Text size="xs" c="yellow.6">
                El precio de este producto ha cambiado recientemente
              </Text>
            )}
          </Stack>
        </Group>
        <Group align="center" gap="sm">
          <ActionIcon
            variant="light"
            aria-label="decrement"
            onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1, item.options)}
          >
            <FaMinus />
          </ActionIcon>
          <Text fw={600}>{item.quantity}</Text>
          <ActionIcon
            variant="light"
            aria-label="increment"
            onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1, item.options)}
          >
            <FaPlus />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  );
}
