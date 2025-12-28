'use client';

import { Text, Stack, Box, List, ThemeIcon } from '@mantine/core';
import { FaCheck } from 'react-icons/fa';
import type { ReactNode } from 'react';

interface ProductDescriptionProps {
  description: string;
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
            <List.Item key={idx}>{item}</List.Item>
          ))}
        </List>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    const subtitleMatch = trimmed.match(/^\*\*(.+?):\*\*$/);
    if (subtitleMatch) {
      flushList();
      elements.push(
        <Text key={`subtitle-${index}`} fw={700} size="md" mt="md" >
          {subtitleMatch[1]}
        </Text>
      );
      return;
    }
    
    if (trimmed.startsWith('- ')) {
      currentList.push(trimmed.substring(2));
      return;
    }
    
    flushList();
    elements.push(
      <Text key={`text-${index}`} size="sm" mb="xs">
        {trimmed}
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

