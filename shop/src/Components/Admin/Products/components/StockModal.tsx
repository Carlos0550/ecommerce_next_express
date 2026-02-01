import { Stack, TextInput, Group, Button } from '@mantine/core';

interface StockModalProps {
  stockValue: string;
  isUpdating: boolean;
  onStockValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const StockModal = ({
  stockValue,
  isUpdating,
  onStockValueChange,
  onSave,
  onCancel,
}: StockModalProps) => {
  const handleSave = () => {
    const qty = parseInt(stockValue, 10);
    if (Number.isFinite(qty) && qty >= 0) {
      onSave();
    }
  };

  return (
    <Stack>
      <TextInput
        label="Cantidad"
        value={stockValue}
        onChange={(e) => onStockValueChange(e.currentTarget.value)}
        type="number"
        min={0}
      />
      <Group justify="flex-end">
        <Button variant="light" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} loading={isUpdating}>
          Guardar
        </Button>
      </Group>
    </Stack>
  );
};

