import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Badge, Box, Group, Loader, Paper, Switch, Table, Text, Tooltip } from "@mantine/core";
import { FiEdit, FiTrash } from "react-icons/fi";
import { useDeletePromo, useGetPromos, useTogglePromoActive, type Promo } from "@/Api/admin/PromoApi";
import dayjs from "dayjs";

type Props = {
  search?: string;
  onEdit: (promo: Promo) => void;
};

export default function PromosTable({ search = "", onEdit }: Props) {
  const [mounted, setMounted] = useState(false);
  const { data, isLoading } = useGetPromos();
  const deletePromo = useDeletePromo();
  const toggleActive = useTogglePromoActive();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const promos: Promo[] = data?.promos ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promos;
    return promos.filter((p) =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.code || "").toLowerCase().includes(q)
    );
  }, [promos, search]);

  const handleToggle = (promo: Promo) => {
    toggleActive.mutate({ id: promo.id, is_active: !promo.is_active });
  };

  const handleDelete = async (promo: Promo) => {
    if (!confirm(`¿Eliminar la promoción "${promo.title}"?`)) return;
    setDeletingId(promo.id);
    try {
      await deletePromo.mutateAsync(promo.id);
    } finally {
      setDeletingId(null);
    }
  };

  if (!mounted) {
    return (
      <Paper withBorder shadow="sm" radius="md">
        <Box p="md">
          <Group justify="center"><Loader /></Group>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper withBorder shadow="sm" radius="md">
      <Box p="md">
        {(isLoading && promos.length === 0) ? (
          <Group justify="center"><Loader /></Group>
        ) : filtered.length === 0 ? (
          <Text c="dimmed">No hay promociones para mostrar.</Text>
        ) : (
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Código</Table.Th>
                <Table.Th>Título</Table.Th>
                <Table.Th>Tipo/Valor</Table.Th>
                <Table.Th>Vigencia</Table.Th>
                <Table.Th>Activa</Table.Th>
                <Table.Th>En Home</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td><Text fw={500}>{p.code}</Text></Table.Td>
                  <Table.Td><Text>{p.title}</Text></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Badge color="violet" variant="light">{p.type === 'fixed' ? 'Monto' : 'Porcentaje'}</Badge>
                      <Text>{p.type === 'fixed' ? `$ ${Number(p.value).toLocaleString('es-AR')}` : `${Number(p.value)}%`}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {p.start_date ? dayjs(p.start_date).format('YYYY-MM-DD') : '-'}
                      {" "}→{" "}
                      {p.end_date ? dayjs(p.end_date).format('YYYY-MM-DD') : '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      checked={p.is_active}
                      onChange={() => handleToggle(p)}
                      disabled={toggleActive.isPending}
                    />
                  </Table.Td>
                  <Table.Td>
                    {p.show_in_home ? <Badge color="green" variant="light">Sí</Badge> : <Badge color="gray" variant="light">No</Badge>}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Editar">
                        <ActionIcon variant="light" color="blue" onClick={() => onEdit(p)}>
                          <FiEdit />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Eliminar">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id || deletePromo.isPending}
                        >
                          {deletingId === p.id ? <Loader size="xs" /> : <FiTrash />}
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Box>
    </Paper>
  );
}