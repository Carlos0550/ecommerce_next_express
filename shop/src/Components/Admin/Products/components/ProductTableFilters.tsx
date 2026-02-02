import { Flex, TextInput, Button, Select, Paper } from '@mantine/core';
import { FiPlus, FiSearch } from 'react-icons/fi';
import type { ProductState } from '@/Api/admin/ProductsApi';

interface ProductTableFiltersProps {
  search: string;
  limit: number;
  state: ProductState;
  sortBy: string | undefined;
  sortOrder: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onLimitChange: (limit: number) => void;
  onStateChange: (state: ProductState) => void;
  onSortByChange: (sortBy: string | undefined) => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
  onAddProduct: () => void;
}

export const ProductTableFilters = ({
  search,
  limit,
  state,
  sortBy,
  sortOrder,
  onSearchChange,
  onLimitChange,
  onStateChange,
  onSortByChange,
  onSortOrderChange,
  onAddProduct,
}: ProductTableFiltersProps) => {
  return (
    <Paper withBorder p="md" radius="md" mb="xl" bg="gray.0">
      <Flex direction="column" gap="md">
        <Flex justify="space-between" align="center" wrap="wrap" gap="md">
          <TextInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar producto por nombre..."
            leftSection={<FiSearch size={16} />}
            size="md"
            style={{ flex: 1, minWidth: 260, maxWidth: 400 }}
          />
          <Button 
            leftSection={<FiPlus size={18} />} 
            onClick={onAddProduct}
            size="md"
            variant="filled"
          >
            Añadir nuevo producto
          </Button>
        </Flex>

        <Flex gap="md" align="flex-end" wrap="wrap">
          <Select
            value={String(limit)}
            onChange={(value) => onLimitChange(Number(value || 10))}
            label="Mostrar"
            size="sm"
            data={[
              { value: '5', label: '5 por página' },
              { value: '10', label: '10 por página' },
              { value: "20", label: '20 por página' },
              { value: "50", label: '50 por página' },
            ]}
            style={{ width: 140 }}
          />

          <Select
            value={String(state)}
            label="Filtrar estado"
            size="sm"
            onChange={(value) => onStateChange(value as ProductState)}
            data={[
              { value: 'active', label: 'Activo' },
              { value: 'inactive', label: 'Inactivo' },
              { value: 'draft', label: 'Borrador' },
              { value: 'out_stock', label: 'Agotado' },
              { value: 'deleted', label: 'Eliminado' },
            ]}
            style={{ width: 140 }}
          />

          <Select
            value={sortBy ?? ''}
            label="Ordenar por"
            size="sm"
            onChange={(value) => onSortByChange(value || undefined)}
            data={[
              { value: '', label: 'Ninguno' },
              { value: 'title', label: 'Nombre' },
              { value: 'price', label: 'Precio' },
              { value: 'created_at', label: 'Fecha de creación' },
            ]}
            style={{ width: 160 }}
          />

          <Select
            value={sortOrder}
            label="Dirección"
            size="sm"
            onChange={(value) => onSortOrderChange(value as 'asc' | 'desc')}
            data={[
              { value: 'asc', label: 'Ascendente' },
              { value: 'desc', label: 'Descendente' },
            ]}
            style={{ width: 130 }}
          />
        </Flex>
      </Flex>
    </Paper>
  );
};

