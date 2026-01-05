'use client';

import { Container, Title, Text, Button, Stack, Center } from '@mantine/core';
import Link from 'next/link';
import { IoStorefrontOutline } from 'react-icons/io5';

export default function TiendaNoEncontrada() {
  return (
    <Container size="sm" py={80}>
      <Center>
        <Stack align="center" gap="lg">
          <IoStorefrontOutline size={80}  color="gray" />
          <Title order={1} ta="center">
            Tienda no encontrada
          </Title>
          <Text size="lg" c="dimmed" ta="center" maw={400}>
            No pudimos identificar la tienda que estás buscando. 
            Verifica que la dirección sea correcta.
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Si crees que esto es un error, contacta al administrador de la tienda.
          </Text>
          <Button 
            component={Link} 
            href="/" 
            variant="outline" 
            size="md"
            mt="md"
          >
            Volver al inicio
          </Button>
        </Stack>
      </Center>
    </Container>
  );
}


