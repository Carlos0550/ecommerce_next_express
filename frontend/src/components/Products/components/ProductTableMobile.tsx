import { Stack, Paper, Group, Image, Box, Text, ActionIcon, Button } from '@mantine/core';
import { FiEdit, FiEye, FiTrash } from 'react-icons/fi';
import type { Product, ProductState } from '@/components/Api/ProductsApi';
import { ProductBadge } from './ProductBadge';
import dummyImage from '@/assets/dummy_image.png';

interface ProductTableMobileProps {
  products: Product[];
  state: ProductState;
  deletingId: string | null;
  isDeleting: boolean;
  isUpdatingStock: boolean;
  isEnhancing: boolean;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onUpdateStock: (product: Product) => void;
  onEnhance: (product: Product) => void;
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
    <Stack>
      {state === "draft" && (
        <Text mb="md" c="dimmed">
          Recuerde editar precio y activar el producto para que esté a la venta, haga esto usando el botón " <FiEdit /> editar " en la fila del producto.
        </Text>
      )}
      {products.map((p) => (
        <Paper key={p.id} withBorder p="sm" radius="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm" wrap="nowrap">
              <Image
                src={p.images?.[0] || dummyImage}
                alt={p.title}
                w={64}
                h={64}
                radius="sm"
                fit="cover"
              />
              <Box>
                <Group gap="xs">
                  <ProductBadge state={p.state} />
                </Group>
                <Text c="dimmed">
                  {typeof p.price === 'number' ? `Precio: $${p.price}` : "Precio: —"}
                </Text>
                <Text c="dimmed">
                  {p.stock !== undefined ? `Stock: ${p.stock}` : "Stock: —"}
                </Text>
              </Box>
            </Group>
            <Stack gap="xs">
              <Group gap="xs">
                <ActionIcon
                  variant="light"
                  aria-label="Ver"
                  onClick={() => onView(p)}
                >
                  <FiEye />
                </ActionIcon>
                <ActionIcon
                  color="red"
                  variant="light"
                  aria-label="Eliminar"
                  onClick={() => onDelete(p.id)}
                  loading={isDeleting && deletingId === p.id}
                  disabled={isDeleting && deletingId === p.id}
                >
                  <FiTrash />
                </ActionIcon>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<FiEdit />}
                  aria-label="Editar"
                  onClick={() => onEdit(p)}
                >
                  Editar
                </Button>
              </Group>
              <Group gap="xs">
                <Button
                  onClick={() => onUpdateStock(p)}
                  loading={isUpdatingStock}
                  disabled={isUpdatingStock}
                >
                  Actualizar stock
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  aria-label="Mejorar"
                  onClick={() => onEnhance(p)}
                  loading={isEnhancing}
                >
                  ✨ Mejorar
                </Button>
              </Group>
            </Stack>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
};

