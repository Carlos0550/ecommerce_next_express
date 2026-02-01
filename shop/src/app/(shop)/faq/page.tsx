"use client";
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/providers/AppContext';
import { Accordion, Stack, Title, Text } from '@mantine/core';

type FAQ = { id: string; question: string; answer: string };

export default function FAQPage() {
  const { utils: { baseUrl } } = useAppContext();
  const { data } = useQuery<{ ok: boolean; items: FAQ[] }, Error>({
    queryKey: ['faqs_public'],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/faqs`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'faqs_fetch_failed');
      return json;
    },
  });
  const items = data?.items || [];
  return (
    <Stack>
      <Title order={2}>Preguntas frecuentes</Title>
      {items.length === 0 && <Text c="dimmed">No hay preguntas disponibles.</Text>}
      {items.length > 0 && (
        <Accordion>
          {items.map(it => (
            <Accordion.Item key={it.id} value={it.id}>
              <Accordion.Control>{it.question}</Accordion.Control>
              <Accordion.Panel>{it.answer}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Stack>
  );
}
