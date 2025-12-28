import { Flex, TextInput, Button, Select } from '@mantine/core';
import { FiPlus, FiSearch } from 'react-icons/fi';
import type { ProductState } from '@/components/Api/ProductsApi';

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
    <Flex gap="md" align="center" mb="md" wrap="wrap">
      <TextInput
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar producto por nombre"
        leftSection={<FiSearch />}
        style={{ flex: "1 1 280px", minWidth: 260, maxWidth: 520 }}
      />
      <Button leftSection={<FiPlus />} onClick={onAddProduct}>
        Añadir producto
      </Button>

      <Select
        value={String(limit)}
        onChange={(value) => onLimitChange(Number(value || 10))}
        label="Mostrar por página"
        data={[
          { value: '5', label: '5 por página' },
          { value: '10', label: '10 por página' },
          { value: "20", label: '20 por página' },
          { value: "50", label: '50 por página' },
        ]}
      />

      <Select
        value={String(state)}
        label="Filtrar por estado"
        onChange={(value) => onStateChange(value as ProductState)}
        data={[
          { value: 'active', label: 'Activo' },
          { value: 'inactive', label: 'Inactivo' },
          { value: 'draft', label: 'Borrador' },
          { value: 'out_stock', label: 'Agotado' },
          { value: 'deleted', label: 'Eliminado' },
        ]}
      />

      <Select
        value={sortBy ?? ''}
        label="Tipo de orden"
        onChange={(value) => onSortByChange(value || undefined)}
        data={[
          { value: '', label: 'Ninguno' },
          { value: 'title', label: 'Nombre' },
          { value: 'price', label: 'Precio' },
          { value: 'created_at', label: 'Fecha de creación' },
        ]}
      />

      <Select
        value={sortOrder}
        label="Orden"
        onChange={(value) => onSortOrderChange(value as 'asc' | 'desc')}
        data={[
          { value: 'asc', label: 'Ascendente' },
          { value: 'desc', label: 'Descendente' },
        ]}
      />
    </Flex>
  );
};

