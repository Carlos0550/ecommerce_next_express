'use client';

import { Text, Stack, Box, List, ThemeIcon } from '@mantine/core';
import { FaCheck } from 'react-icons/fa';
import type { ReactNode } from 'react';

interface ProductDescriptionProps {
  description: string;
}

// Función para renderizar texto con formato markdown inline (negrita)
function renderTextWithFormatting(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  
  // Regex para encontrar **texto** (negrita)
  const boldRegex = /\*\*(.+?)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Agregar texto antes del match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Agregar texto en negrita
    parts.push(
      <Text component="span" fw={700} key={match.index}>
        {match[1]}
      </Text>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Agregar el resto del texto
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
}

export default function ProductDescription({ description }: ProductDescriptionProps) {
  if (!description) return null;

  const lines = description.split('\n').filter(line => line.trim() !== '');
  
  const elements: ReactNode[] = [];
  let currentList: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <List
          key={`list-${listKey++}`}
          spacing="xs"
          size="sm"
          icon={
            <ThemeIcon  size={20} radius="xl">
              <FaCheck size={10} />
            </ThemeIcon>
          }
          mt="xs"
          mb="md"
        >
          {currentList.map((item, idx) => (
            <List.Item key={idx}>{renderTextWithFormatting(item)}</List.Item>
          ))}
        </List>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Patrón 1: **Título:** (con dos puntos al final)
    const subtitleWithColonMatch = trimmed.match(/^\*\*(.+?):\*\*$/);
    if (subtitleWithColonMatch) {
      flushList();
      elements.push(
        <Text key={`subtitle-${index}`} fw={700} size="md" mt="md" >
          {subtitleWithColonMatch[1]}
        </Text>
      );
      return;
    }
    
    // Patrón 2: **Título** o **¿Pregunta?** (sin dos puntos)
    const subtitleMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (subtitleMatch) {
      flushList();
      elements.push(
        <Text key={`subtitle-${index}`} fw={700} size="md" mt="md" >
          {subtitleMatch[1]}
        </Text>
      );
      return;
    }
    
    // Listas con guion
    if (trimmed.startsWith('- ')) {
      currentList.push(trimmed.substring(2));
      return;
    }
    
    // Texto normal (puede contener **negrita** inline)
    flushList();
    elements.push(
      <Text key={`text-${index}`} size="sm" mb="xs">
        {renderTextWithFormatting(trimmed)}
      </Text>
    );
  });
  
  flushList();

  return (
    <Box>
      <Stack gap={0}>
        {elements}
      </Stack>
    </Box>
  );
}

