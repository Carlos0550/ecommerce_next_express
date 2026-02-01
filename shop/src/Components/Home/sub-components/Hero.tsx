'use client';
import { Box, Container, Title, Text, Button, Group, Overlay, Stack } from '@mantine/core';
import { FiArrowRight, FiShoppingBag } from 'react-icons/fi';
import classes from './Hero.module.css';

interface HeroProps {
  title: string;
  description?: string;
  backgroundImage?: string;
}

export default function Hero({ title, description, backgroundImage }: HeroProps) {
  const scrollToProducts = () => {
    const el = document.getElementById('productos');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const bgStyle = backgroundImage 
    ? { backgroundImage: `url('${backgroundImage}')` }
    : undefined;

  return (
    <Box className={classes.hero} style={bgStyle}>
      <Overlay
        gradient="linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.8) 100%)"
        opacity={1}
        zIndex={0}
      />

      <Container size="xl" className={classes.container}>
        <Stack gap="xl" align="flex-start" justify="center" className={classes.content}>
          <Title className={classes.title}>
            {title}
          </Title>

          {description && (
            <Text className={classes.description} size="xl">
              {description}
            </Text>
          )}

          <Group gap="md">
            <Button
              size="lg"
              variant="filled"
              color="white"
              c="black"
              leftSection={<FiShoppingBag size={20} />}
              onClick={scrollToProducts}
              className={classes.control}
            >
              Comprar ahora
            </Button>
            <Button
              size="lg"
              variant="white"
              color="white"
              rightSection={<FiArrowRight size={20} />}
              className={classes.secondaryControl}
              onClick={() => {
                const el = document.getElementById('categorias');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Ver categorías
            </Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
