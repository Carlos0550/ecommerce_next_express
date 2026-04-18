import { Paper, ScrollArea, Table, Group, ActionIcon, Button, Image, Text, Tooltip } from '@mantine/core';
import { FiEdit, FiEye, FiTrash, FiTrendingUp, FiBox } from 'react-icons/fi';
import { ProductBadge } from './ProductBadge';
const dummyImage = "/image_fallback.webp";
import type { AdminProduct } from "@/stores/useAdminStore";

interface ProductTableDesktopProps {
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
    <Paper withBorder radius="md" shadow="sm">
      {state === "draft" && (
        <Paper p="xs" m="md" style={{ background: 'var(--color-accent-soft)', border: '1px solid var(--color-border)' }}>
          <Text size="sm" c="var(--color-text)" fw={500}>
            Recuerde editar precio y activar el producto para que esté a la venta.
          </Text>
        </Paper>
      )}
      <ScrollArea>
        <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
          <Table.Thead bg="gray.0">
            <Table.Tr>
              <Table.Th style={{ width: 80 }}>Imagen</Table.Th>
              <Table.Th>Producto</Table.Th>
              <Table.Th>Precio</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Stock</Table.Th>
              <Table.Th>Creado</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(products || []).map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>
                  <Image
                    src={p.images?.[0] || dummyImage}
                    alt={p.title}
                    w={50}
                    h={50}
                    radius="md"
                    fit="cover"
                    fallbackSrc={dummyImage}
                    style={{ border: '1px solid #eee' }}
                  />
                </Table.Td>
                <Table.Td>
                  <Text fw={600} size="sm" style={{ textTransform: 'capitalize' }}>
                    {p.title}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    ID: {p.id.slice(0, 8)}...
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text fw={700} c="dark.4">
                    {typeof p.price === 'number' ? `$${p.price.toLocaleString()}` : '—'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <ProductBadge state={p.state} />
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <FiBox size={14} color="gray" />
                    <Text fw={500} size="sm">
                      {p.stock !== undefined ? p.stock : '—'}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  {p.created_at ? (
                    <Text size="xs" c="dimmed">
                      {new Date(p.created_at).toLocaleDateString()}<br />
                      {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  ) : (
                    <Text c="dimmed" size="xs">—</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <Tooltip label="Ver detalles" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={() => onView(p)}
                      >
                        <FiEye size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Editar producto" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => onEdit(p)}
                      >
                        <FiEdit size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Mejorar con IA" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="grape"
                        onClick={() => onEnhance(p)}
                        loading={isEnhancing}
                      >
                        <FiTrendingUp size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="rose"
                      onClick={() => onUpdateStock(p)}
                      loading={isUpdatingStock}
                      leftSection={<FiBox size={14} />}
                    >
                      Stock
                    </Button>
                    <Tooltip label="Eliminar" withArrow>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => onDelete(p.id)}
                        loading={isDeleting && deletingId === p.id}
                      >
                        <FiTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
};
