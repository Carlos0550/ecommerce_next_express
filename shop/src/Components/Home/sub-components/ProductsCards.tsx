"use client";
import AddToCartButton from '@/Components/Cart/AddToCartButton';
import { Badge, Button, Card, Flex, Group, Text, Loader, Stack, Box } from '@mantine/core'
import { FiInfo } from 'react-icons/fi'
import { useState } from 'react'
import Image from 'next/image';
import Link from 'next/link';
import { createProductSlug } from '@/utils/slugs';
import classes from './ProductsCards.module.css';
import { PublicProduct } from '@/stores/useConfigStore';
type Props = {
    product: PublicProduct
    priority?: boolean
}
import { useWindowSize } from "@/utils/hooks/useWindowSize";
function ProductsCards({ product, priority = false }: Props) {
    const { isMobile } = useWindowSize();
    const [imageLoading, setImageLoading] = useState(true)
    const slug = createProductSlug(product.title, product.id);
    return (
        <Card radius="xl" className={classes.card} padding={0}>
             <Link href={`/producto/${slug}`} className={classes.imageLink}>
                <Box className={classes.imageContainer}>
                    {imageLoading && (
                        <Flex align="center" justify="center" className={classes.imageLoader}>
                            <Loader size="sm" color="gray" />
                        </Flex>
                    )}
                    <Image
                        src={product.images?.[0] || "/image_fallback.webp"}
                        fill
                        className={classes.image}
                        onLoad={() => setImageLoading(false)}
                        priority={priority}
                        alt={product.title}
                    />
                    <div className={classes.imageOverlay}>
                        <Button
                          variant="white"
                          color="dark"
                          size="xs"
                          radius="xl"
                          leftSection={<FiInfo size={14} />}
                          style={{ pointerEvents: 'auto' }}
                        >
                          Ver detalles
                        </Button>
                    </div>
                </Box>
            </Link>
            <Stack gap="xs" className={classes.body}>
                <Stack gap={4}>
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Link href={`/producto/${slug}`} className={classes.titleLink}>
                            <Text fw={700} fz="lg" lineClamp={1} style={{ letterSpacing: '-0.2px' }}>
                                {product.title}
                            </Text>
                        </Link>
                        {product.category && (
                            <Badge 
                                variant="light" 
                                color="gray" 
                                size="xs" 
                                className={classes.badge}
                                radius="sm"
                            >
                                {product.category.title}
                            </Badge>
                        )}
                    </Group>
                    <Text fw={800} fz="xl" className={classes.price}>
                        ${product.price.toLocaleString('es-AR')}
                    </Text>
                </Stack>
                {!isMobile && (
                    <Text size="sm" c="dimmed" lineClamp={2} className={classes.description}>
                        {product.description}
                    </Text>
                )}
                <Box mt="xs" className={classes.footer}>
                    <AddToCartButton productId={product.id} fullWidth />
                </Box>
            </Stack>
        </Card>
    )
}
export default ProductsCards
