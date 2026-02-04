import { Stack, Group, Image, Text, Box, Badge } from '@mantine/core';
import { ProductBadge } from './ProductBadge';
import ProductDescription from '@/Components/Admin/Common/ProductDescription';
const dummyImage = "/image_fallback.webp";
import { AdminProduct } from "@/stores/useAdminStore";

interface ProductViewModalProps {
  product: AdminProduct;
}
export const ProductViewModal = ({ product }: ProductViewModalProps) => {
  return (
    <Stack>
      <Group align="flex-start" gap="md" wrap="nowrap">
        <Image
          src={product.images?.[0] || dummyImage}
          alt={product.title}
          w={128}
          h={128}
          radius="md"
          fit="cover"
        />
        <Box>
          <Group gap="xs">
            <Text fw={700} size="lg">{product.title}</Text>
            <ProductBadge state={product.state} />
          </Group>
          <Text c="dimmed">
            Precio: {typeof product.price === 'number' ? `$${product.price}` : '—'}
          </Text>
          <Text c="dimmed">
            Categoría: {product.category?.title || '—'}
          </Text>
        </Box>
      </Group>
      {product.description && (
        <Box>
          <Text fw={600} mb="xs">Descripción</Text>
          <ProductDescription description={product.description} />
        </Box>
      )}
      {typeof product.stock === 'number' && (
        <Box>
          <Text fw={600} mb="xs">Stock</Text>
          <Text c={product.stock > 0 ? 'green' : 'red'}>
            {product.stock} unidades disponibles
          </Text>
        </Box>
      )}
      {Array.isArray(product.options) && product.options.length > 0 && (
        <Box>
          <Text fw={600} mb="xs">Opciones de compra</Text>
          <Stack gap="xs">
            {product.options.map((option: { name: string; values: string[] }, idx: number) => (
              <Box key={idx}>
                <Text fw={500} size="sm" mb={4}>{option.name}:</Text>
                <Group gap="xs">
                  {Array.isArray(option.values) && option.values.length > 0 ? (
                    option.values.map((value: string, valueIdx: number) => (
                      <Badge key={valueIdx} variant="light" color="rose">
                        {value}
                      </Badge>
                    ))
                  ) : (
                    <Text c="dimmed" size="sm">Sin valores</Text>
                  )}
                </Group>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
      {Array.isArray(product.images) && product.images.length > 1 && (
        <Stack>
          <Text fw={600}>Imágenes</Text>
          <Group gap="xs">
            {product.images.map((url: string, idx: number) => (
              <Image
                key={`${url}-${idx}`}
                src={url}
                alt={`Imagen ${idx + 1}`}
                w={72}
                h={72}
                radius="sm"
                fit="cover"
              />
            ))}
          </Group>
        </Stack>
      )}
    </Stack>
  );
};
