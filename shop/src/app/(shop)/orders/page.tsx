"use client";
import { useGetOrders } from '@/hooks/useUserOrders';
import { Table, Pagination, Badge, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { showNotification } from '@mantine/notifications';
export default function OrdersPage() {
  const { session } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (!session) {
      showNotification({ message: 'Debes iniciar sesión para acceder a esta página', color: 'red', id: 'orders-page' });
      router.push('/');
      return
    }
  }, [session, router]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data } = useGetOrders(page, limit);
  interface OrderItem {
    title: string;
    quantity: number;
    price: number | string;
  }
  interface Order {
    id: string;
    created_at: string;
    payment_method: string;
    total: number;
    items: OrderItem[];
  }
  const items = (data?.data?.items || data?.items || []) as Order[];
  return (
    <Stack>
      <Title order={2}>Mis ordenes</Title>
      {items.map((o: Order) => (
        <Card key={o.id} withBorder>
          <Group justify="space-between">
            <Text fw={600}>#{o.id}</Text>
            <Text c="dimmed">{dayjs(o.created_at).format('YYYY-MM-DD HH:mm')}</Text>
          </Group>
          <Group gap="xs" mt="xs">
            <Badge variant="light">Pago: {o.payment_method}</Badge>
          </Group>
          {String(o.payment_method).toUpperCase() === 'TRANSFERENCIA' && (
            <Group mt="xs">
              <div>
                <div>Alias: <strong>Roo.recalde</strong></div>
                <div>Nombre: <strong>Recalde Rocio Candelaria</strong></div>
                <div>Banco: <strong>Mercado Pago</strong></div>
              </div>
            </Group>
          )}
          <Text>Total: ${o.total.toFixed(2)}</Text>
          {Array.isArray(o.items) && o.items.length > 0 && (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th>Cantidad</Table.Th>
                  <Table.Th>Subtotal</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {o.items.map((it: OrderItem, idx: number) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{it.title}</Table.Td>
                    <Table.Td>{it.quantity}</Table.Td>
                    <Table.Td>${(Number(it.price) * Number(it.quantity)).toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      ))}
      {items.length === 0 && <Text c="dimmed">No tienes órdenes aún.</Text>}
      <Group justify="center">
        <Pagination total={Math.max(1, Number(data?.total || 1))} value={page} onChange={setPage} />
      </Group>
    </Stack>
  );
}
