"use client";
import { Button, Group, Modal, Stack, Table, TextInput, Title, Checkbox, NumberInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useCreateFaq, useDeleteFaq, useListFaqsAdmin, useUpdateFaq } from '@/hooks/useAdminFAQ';
import { useState } from 'react';
export default function FAQ() {
  const { data } = useListFaqsAdmin();
  const items = data?.items || [];
  const create = useCreateFaq();
  const update = useUpdateFaq();
  const remove = useDeleteFaq();
  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState({ question: '', answer: '', position: 0, is_active: true });
  const [editId, setEditId] = useState<string | null>(null);
  const onSave = async () => {
    if (editId) await update.mutateAsync({ id: editId, data: form });
    else await create.mutateAsync(form);
    close(); setEditId(null); setForm({ question: '', answer: '', position: 0, is_active: true });
  };
  return (
    <Stack>
      <Title order={2}>FAQ</Title>
      <Group>
        <Button onClick={() => { setEditId(null); setForm({ question: '', answer: '', position: 0, is_active: true }); open(); }}>Nueva pregunta</Button>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Pregunta</Table.Th>
            <Table.Th>Activa</Table.Th>
            <Table.Th>Posición</Table.Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(Array.isArray(items) ? items : []).map((it: any) => (
            <Table.Tr key={it.id}>
              <Table.Td>{it.question}</Table.Td>
              <Table.Td>{it.is_active ? 'Sí' : 'No'}</Table.Td>
              <Table.Td>{it.position}</Table.Td>
              <Table.Td>
                <Group>
                  <Button size="xs" variant="light" onClick={() => { setEditId(it.id); setForm({ question: it.question, answer: it.answer, position: it.position, is_active: it.is_active }); open(); }}>Editar</Button>
                  <Button size="xs" color="red" variant="light" onClick={() => remove.mutate(it.id)}>Eliminar</Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={opened} onClose={() => { close(); setEditId(null); }} title={editId ? 'Editar FAQ' : 'Nueva FAQ'}>
        <Stack>
          <TextInput label="Pregunta" value={form.question} onChange={e => setForm(s => ({ ...s, question: e.target.value }))} />
          <TextInput label="Respuesta" value={form.answer} onChange={e => setForm(s => ({ ...s, answer: e.target.value }))} />
          <NumberInput label="Posición" value={form.position} onChange={v => setForm(s => ({ ...s, position: Number(v || 0) }))} />
          <Checkbox label="Activa" checked={form.is_active} onChange={e => setForm(s => ({ ...s, is_active: e.currentTarget.checked }))} />
          <Group>
            <Button onClick={onSave} loading={create.isPending || update.isPending}>{editId ? 'Guardar cambios' : 'Crear'}</Button>
            <Button variant="light" onClick={close}>Cancelar</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
