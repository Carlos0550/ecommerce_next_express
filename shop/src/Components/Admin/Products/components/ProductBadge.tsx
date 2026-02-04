import { Badge } from '@mantine/core';
type ProductState = "active" | "inactive" | "draft" | "out_stock" | "deleted";

interface ProductBadgeProps {
  state: ProductState;
}
export const ProductBadge = ({ state }: ProductBadgeProps) => {
  const badgeConfig = {
    active: { color: 'green' as const, label: 'Activo' },
    inactive: { color: 'gray' as const, label: 'Inactivo' },
    draft: { color: 'orange' as const, label: 'Borrador' },
    out_stock: { color: 'red' as const, label: 'Agotado' },
    deleted: { color: 'red' as const, label: 'Eliminado' },
  };
  const config = badgeConfig[state];
  if (!config) return null;
  return (
    <Badge variant="light" color={config.color} radius="xl">
      {config.label}
    </Badge>
  );
};
