'use client';
import { Stack, Title, Text, Button, Center, ThemeIcon, Box } from '@mantine/core';
import { FiPackage } from 'react-icons/fi';
import React from 'react';
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Center py={60} w="100%">
      <Stack align="center" gap="md" maw={400} ta="center">
        <ThemeIcon
          size={80}
          radius={100}
          variant="light"
          color="gray"
          style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
        >
          {icon || <FiPackage size={40} color="#888" />}
        </ThemeIcon>
        <Box>
          <Title order={3} fw={700} mb={4}>
            {title}
          </Title>
          <Text c="dimmed" size="sm">
            {description}
          </Text>
        </Box>
        {action && (
          <Button variant="outline" color="dark" radius="xl" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </Stack>
    </Center>
  );
}
