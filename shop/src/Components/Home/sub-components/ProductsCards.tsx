"use client";
import { Products } from '@/Api/useProducts'
import AddToCartButton from '@/Components/Cart/AddToCartButton';
import { useAppContext } from '@/providers/AppContext'
import { Badge, Button, Card, Flex, Group, Text, Loader } from '@mantine/core'
import { FaInfoCircle } from 'react-icons/fa'
import { useState } from 'react'
import Image from 'next/image';
import Link from 'next/link';
import { createProductSlug } from '@/utils/slugs';

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
    const [navigating, setNavigating] = useState(false)
 
    const mobileCardWidth = "calc(50% - 10px)"; 
    const slug = createProductSlug(product.title, product.id);

    const renderLoader = () => (
        <Flex align="center" justify="center" style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.9)', zIndex: 1 }}>
            <Loader type="bars" />
        </Flex>
    )
    return (
        <Card shadow="sm" radius="md" withBorder w={isMobile ? mobileCardWidth : 350}>
             <Link href={`/producto/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Card.Section style={{ position: 'relative', paddingBottom: '75%', height: '250px', cursor: 'pointer' }}>
                    {imageLoading && renderLoader()}
                    <Image
                        src={product.images[0]}
                        fill
                        
                        style={{ objectFit: 'cover' }}
                        onLoad={() => setImageLoading(false)}
                        priority={priority}
                        alt={product.title}
                    />
                </Card.Section>
            </Link>

            <Group justify="space-between" mt="md" mb="xs">
                <div>
                    <Link href={`/producto/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Text fw={500} style={{ cursor: 'pointer' }}>{product.title}</Text>
                    </Link>
                    <Text fw={700} size="lg">${product.price}</Text>
                </div>
                <Group>
                    <Badge >{product.category.title}</Badge>
                    <Badge variant="outline">En stock</Badge>
                </Group>
            </Group>

            {!isMobile && (
                <Text size="sm" c="dimmed">
                    {product.description.slice(0, 100) + "..."}
                </Text>
            )}

            {isMobile ? (
                <Flex justify="space-evenly" mt={10} gap={10} wrap='wrap'>
                    <Button component={Link} href={`/producto/${slug}`} leftSection={<FaInfoCircle />} fullWidth onClick={() => setNavigating(true)} disabled={navigating} rightSection={navigating ? <Loader size="xs" /> : null}>Ver más</Button>
                    <AddToCartButton productId={product.id} />
                </Flex>
            ) : (
                <Flex
                    justify="space-evenly"
                    mt={10}
                    gap={10}
                    wrap='nowrap'
                >
                    <Button component={Link} href={`/producto/${slug}`} leftSection={<FaInfoCircle />} onClick={() => setNavigating(true)} disabled={navigating} rightSection={navigating ? <Loader size="xs" /> : null}>Más info</Button>
                    <AddToCartButton productId={product.id} />
                </Flex>
            )}
        </Card>
    )
}

export default ProductsCards
