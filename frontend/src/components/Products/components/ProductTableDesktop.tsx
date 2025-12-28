import { Paper, ScrollArea, Table, Group, ActionIcon, Button, Stack, Image, Text } from '@mantine/core';
import { FiEdit, FiEye, FiTrash } from 'react-icons/fi';
import type { Product, ProductState } from '@/components/Api/ProductsApi';
import { ProductBadge } from './ProductBadge';
import dummyImage from '@/assets/dummy_image.png';

interface ProductTableDesktopProps {
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

export const ProductTableDesktop = ({
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
}: ProductTableDesktopProps) => {
  return (
    <Paper withBorder p="md" radius="md">
      {state === "draft" && (
        <Text mb="md" c="dimmed">
          Recuerde editar precio y activar el producto para que esté a la venta, haga esto usando el botón " <FiEdit /> editar " en la fila del producto.
        </Text>
      )}
      <ScrollArea>
        <Table highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 120 }}>Imagen</Table.Th>
              <Table.Th>Título</Table.Th>
              <Table.Th>Precio</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Stock</Table.Th>
              <Table.Th>Creado</Table.Th>
              <Table.Th style={{ width: 440 }}>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {products.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>
                  <Image
                    src={p.images?.[0] || dummyImage}
                    alt={p.title}
                    w={48}
                    h={48}
                    radius="sm"
                    fit="cover"
                  />
                </Table.Td>
                <Table.Td>
                  <Text fw={600} style={{ textTransform: 'capitalize' }}>
                    {p.title}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {typeof p.price === 'number' ? `$${p.price}` : '—'}
                </Table.Td>
                <Table.Td>
                  <ProductBadge state={p.state} />
                </Table.Td>
                <Table.Td>
                  {p.stock !== undefined ? p.stock : '—'}
                </Table.Td>
                <Table.Td>
                  {p.created_at ? (
                    <Text c="dimmed">
                      {new Date(p.created_at).toLocaleString()}
                    </Text>
                  ) : (
                    <Text c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td>
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
                      <Button
                        size="xs"
                        variant="outline"
                        aria-label="Mejorar"
                        onClick={() => onEnhance(p)}
                        loading={isEnhancing}
                      >
                        ✨ Mejorar
                      </Button>
                      <Button
                        onClick={() => onUpdateStock(p)}
                        loading={isUpdatingStock}
                        disabled={isUpdatingStock}
                      >
                        Actualizar stock
                      </Button>
                    </Group>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
};

