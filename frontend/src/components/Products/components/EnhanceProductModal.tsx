import { Stack, Text, Textarea, TextInput, Group, Button } from '@mantine/core';
import type { Product } from '@/components/Api/ProductsApi';

interface EnhanceProductModalProps {
  product: Product | null;
  enhanceTitle: string;
  enhanceDescription: string;
  additionalContext: string;
  isRegenerating: boolean;
  isApplying: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onRegenerate: () => void;
  onApply: () => void;
  onClose: () => void;
}

export const EnhanceProductModal = ({
  product,
  enhanceTitle,
  enhanceDescription,
  additionalContext,
  isRegenerating,
  isApplying,
  onTitleChange,
  onDescriptionChange,
  onContextChange,
  onRegenerate,
  onApply,
  onClose,
}: EnhanceProductModalProps) => {
  if (!product) return null;

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        La IA analizará las imágenes del producto para sugerir mejoras.
      </Text>

      <Textarea
        label="Contexto adicional (opcional)"
        description="Ej: beneficios clave, materiales, ocasión de uso, opciones de compra"
        value={additionalContext}
        onChange={(e) => onContextChange(e.currentTarget.value)}
        autosize
        minRows={2}
      />

      <Group justify="flex-end">
        <Button
          variant="light"
          onClick={onRegenerate}
          loading={isRegenerating}
        >
          Re-generar sugerencias
        </Button>
      </Group>

      <TextInput
        label="Título sugerido"
        value={enhanceTitle}
        onChange={(e) => onTitleChange(e.currentTarget.value)}
      />

      <Textarea
        label="Descripción sugerida"
        value={enhanceDescription}
        onChange={(e) => onDescriptionChange(e.currentTarget.value)}
        autosize
        minRows={4}
      />

      <Group justify="flex-end">
        <Button
          variant="light"
          onClick={onClose}
          disabled={isApplying || isRegenerating}
        >
          Cancelar
        </Button>
        <Button
          onClick={onApply}
          loading={isApplying || isRegenerating}
          disabled={isApplying || isRegenerating}
        >
          Aplicar cambios
        </Button>
      </Group>
    </Stack>
  );
};

