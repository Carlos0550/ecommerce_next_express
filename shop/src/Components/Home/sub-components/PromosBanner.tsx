'use client'
import { Box, Container, Title, Text, Card, Group, Image, Button, Badge } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useAppContext } from '@/providers/AppContext'
import Link from 'next/link'

type Promo = {
  id: string
  code: string
  title: string
  description?: string | null
  image?: string | null
  type: 'percentage' | 'fixed'
  value: number
  max_discount?: number | null
  min_order_amount?: number | null
  end_date?: string | Date | null
}

export default function PromosBanner() {
  const { utils } = useAppContext()

  const { data, isLoading } = useQuery<{ ok: boolean; promos: Promo[] }>({
    queryKey: ['public-promos'],
    enabled: !!utils.tenantSlug, 
    queryFn: async () => {
      const headers = utils.getTenantHeaders()
      if (!headers['x-tenant-slug']) {
        throw new Error('No tenant slug available')
      }
      const res = await fetch(`${utils.baseUrl}/promos/public`, { headers })
      
      if (res.status === 404) {
        return { ok: true, promos: [] }
      }
      if (!res.ok) throw new Error('Failed to fetch promos')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, 
    retry: false, 
  })

  const promos = data?.promos || []

  if (isLoading || promos.length === 0) {
    return null
  }

  const formatDiscount = (promo: Promo) => {
    if (promo.type === 'percentage') {
      return `${promo.value}% OFF`
    }
    return `$${promo.value} OFF`
  }

  return (
    <Box my={40}>
      <Container size="xl">
        <Title order={2} mb="md">Promociones Especiales</Title>
        <Group gap="md" style={{ flexWrap: 'wrap' }}>
          {promos.map((promo) => (
            <Card
              key={promo.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ flex: '1 1 300px', minWidth: 300, maxWidth: 400 }}
            >
              {promo.image && (
                <Card.Section>
                  <Image
                    src={promo.image}
                    height={200}
                    alt={promo.title}
                    fit="cover"
                  />
                </Card.Section>
              )}
              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500} size="lg">{promo.title}</Text>
                <Badge color="green" variant="light">
                  {formatDiscount(promo)}
                </Badge>
              </Group>
              {promo.description && (
                <Text size="sm" c="dimmed" mb="md">
                  {promo.description}
                </Text>
              )}
              <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                  Código: <Text span fw={700}>{promo.code}</Text>
                </Text>
                <Button
                  component={Link}
                  href="/"
                  variant="light"
                  color="blue"
                  size="sm"
                >
                  Ver productos
                </Button>
              </Group>
            </Card>
          ))}
        </Group>
      </Container>
    </Box>
  )
}

