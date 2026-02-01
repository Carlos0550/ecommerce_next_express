"use client";
import { Products } from '@/Api/useProducts'
import AddToCartButton from '@/Components/Cart/AddToCartButton';
import { useAppContext } from '@/providers/AppContext'
import { Badge, Button, Card, Flex, Group, Text, Loader, Stack } from '@mantine/core'
import { FiArrowRight, FiInfo } from 'react-icons/fi'
import { useState } from 'react'
import Image from 'next/image';
import Link from 'next/link';
import { createProductSlug } from '@/utils/slugs';
import classes from './ProductsCards.module.css';

type Props = {
    product: Products
    priority?: boolean
}

function ProductsCards({ product, priority = false }: Props) {
    const {
        utils: {
            isMobile,
        },
    } = useAppContext()
    const [imageLoading, setImageLoading] = useState(true)
 
    const slug = createProductSlug(product.title, product.id);

    return (
        <Card radius="lg" className={classes.card} w={isMobile ? "calc(50% - 15px)" : 320}>
             <Link href={`/producto/${slug}`} className={classes.imageLink}>
                <Card.Section className={classes.imageContainer}>
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
                        >
                          Ver detalles
                        </Button>
                    </div>
                </Card.Section>
            </Link>

            <Stack gap="xs" mt="md" className={classes.body}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                   <Link href={`/producto/${slug}`} className={classes.titleLink}>
                        <Text fw={700} fz="md" lineClamp={1}>{product.title}</Text>
                    </Link>
                    {product.category && (
                        <Badge variant="dot" color="gray" size="sm">{product.category.title}</Badge>
                    )}
                </Group>
               
                <Text fw={800} fz="xl" c="dark.4">${product.price.toLocaleString('es-AR')}</Text>

                {!isMobile && (
                    <Text size="xs" c="dimmed" lineClamp={2} className={classes.description}>
                        {product.description}
                    </Text>
                )}

                <Group gap={8} mt="xs">
                    <AddToCartButton productId={product.id} fullWidth />
                </Group>
            </Stack>
        </Card>
    )
}

export default ProductsCards
