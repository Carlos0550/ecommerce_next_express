import { Stack, Paper, Group, Image, Box, Text, ActionIcon, Button } from '@mantine/core';
import { FiEdit, FiEye, FiTrash, FiBox, FiTrendingUp } from 'react-icons/fi';
import { ProductBadge } from './ProductBadge';
import { theme } from '@/theme';
const dummyImage = "/image_fallback.webp";
import type { AdminProduct } from "@/stores/useAdminStore";

interface ProductTableMobileProps {
  products: AdminProduct[];
  state: string;
  deletingId: string | null;
  isDeleting: boolean;
  isUpdatingStock: boolean;
  isEnhancing: boolean;
  onView: (product: AdminProduct) => void;
  onEdit: (product: AdminProduct) => void;
  onDelete: (productId: string) => void;
  onUpdateStock: (product: AdminProduct) => void;
  onEnhance: (product: AdminProduct) => void;
}
export const ProductTableMobile = ({
  products,
  state,
  deletingId,
  isDeleting,
  isUpdatingStock,
  isEnhancing,
  onView,
  onEdit,
  onDelete,
  onUpdateStock,
  onEnhance,
}: ProductTableMobileProps) => {
  return (
    <Stack gap="md">
      {state === "draft" && (
        <Paper p="xs" bg="rose.0" style={{ border: `1px solid ${theme.colors?.rose?.[2] || '#eee'}` }}>
          <Text size="sm" c="rose.9" fw={500}>
            Recuerde editar precio y activar el producto para que esté a la venta.
          </Text>
        </Paper>
      )}
      {products.map((p) => (
        <Paper key={p.id} withBorder p="md" radius="md" shadow="xs">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Group gap="md" wrap="nowrap">
                <Image
                  src={p.images?.[0] || dummyImage}
                  alt={p.title}
                  w={70}
                  h={70}
                  radius="md"
                  fit="cover"
                  style={{ border: '1px solid #eee' }}
                />
                <Box>
                  <Text fw={700} size="sm" style={{ textTransform: 'capitalize' }} lineClamp={2}>
                    {p.title}
                  </Text>
                  <Group gap={4} mt={4}>
                    <ProductBadge state={p.state} />
                  </Group>
                  <Text fw={700} size="md" c="rose.7" mt={4}>
                    {typeof p.price === 'number' ? `$${p.price.toLocaleString()}` : '—'}
                  </Text>
                </Box>
              </Group>
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                Stock: {p.stock ?? 0}
              </Text>
            </Group>
            <Group gap="xs" grow>
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<FiEdit size={14} />}
                onClick={() => onEdit(p)}
              >
                Editar
              </Button>
              <Button
                size="xs"
                variant="light"
                color="rose"
                leftSection={<FiBox size={14} />}
                onClick={() => onUpdateStock(p)}
                loading={isUpdatingStock}
              >
                Stock
              </Button>
              <Button
                size="xs"
                variant="light"
                color="grape"
                leftSection={<FiTrendingUp size={14} />}
                onClick={() => onEnhance(p)}
                loading={isEnhancing}
              >
                IA
              </Button>
            </Group>
            <Group justify="space-between" align="center">
              <Group gap="xs">
                 <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => onView(p)}
                >
                  <FiEye size={18} />
                </ActionIcon>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => onDelete(p.id)}
                  loading={isDeleting && deletingId === p.id}
                >
                  <FiTrash size={18} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="dimmed">
                {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
              </Text>
            </Group>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};
