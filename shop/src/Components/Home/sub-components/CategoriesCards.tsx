"use client";
import { Card, CardSection, Image, Text, Group, SimpleGrid, Overlay, Box, Center } from "@mantine/core";
import { useRouter } from "next/navigation";
import classes from "./CategoriesCards.module.css";
import { FiChevronRight } from "react-icons/fi";
import { capitalizeTexts } from "@/utils/constants";
import { PublicCategory } from "@/stores/useConfigStore";
export default function CategoriesCards({ categories }: { categories: PublicCategory[] }) {
  const router = useRouter();
  const goToCategory = (id: string) => {
    router.push(`/?categoryId=${id}#productos`, { scroll: false });
    setTimeout(() => {
      const el = typeof document !== 'undefined' ? document.getElementById('productos') : null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };
  return (
    <SimpleGrid
      cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
      spacing="lg"
    >
      {Array.isArray(categories) && categories.map((category) => (
        <Card
          key={category.id}
          radius="lg"
          className={classes.card}
          onClick={() => goToCategory(category.id)}
        >
          <CardSection className={classes.imageSection}>
            {category.image && category.image.trim() !== "" ? (
              <Image 
                src={category.image} 
                alt={category.title} 
                height={280} 
                fit="cover" 
                className={classes.image}
              />
            ) : (
              <Center className={classes.placeholder}>
                <Text fw={700} size="xl" c="dimmedOpacity">
                  {capitalizeTexts(category.title)}
                </Text>
              </Center>
            )}
            <Overlay
              gradient="linear-gradient(180deg, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.7) 100%)"
              opacity={1}
              zIndex={1}
            />
            <Box className={classes.content}>
              <Text c="white" fw={800} fz="xl" className={classes.title}>
                {capitalizeTexts(category.title)}
              </Text>
              <Group gap={4} className={classes.explore}>
                <Text c="white" fz="sm" fw={500}>Explorar</Text>
                <FiChevronRight size={14} color="white" />
              </Group>
            </Box>
          </CardSection>
        </Card>
      ))}
    </SimpleGrid>
  );
}
