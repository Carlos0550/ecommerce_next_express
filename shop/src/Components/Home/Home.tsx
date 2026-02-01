"use client";
import {
  Box,
  Flex,
  Title,
  Text,
  Container,
  Input,
  NativeSelect,
  Loader,
  Stack,
  Center,
  Divider,
  SimpleGrid,
} from "@mantine/core";
import { useInfiniteProducts, Products, ProductsResponse } from "@/Api/useProducts";
import ProductsCards from "./sub-components/ProductsCards";
import { Categories, CategoriesResponse, useCategories } from "@/Api/useCategories";
import { BusinessData } from "@/Api/useBusiness";
import CategoriesCards from "./sub-components/CategoriesCards";
import Hero from "./sub-components/Hero";
import EmptyState from "./sub-components/EmptyState";
import { useAppContext } from "@/providers/AppContext";
import { useEffect, useMemo, useState, useRef } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CartWrapper from "../Cart/CartWrapper";
import Onboarding from "./sub-components/Onboarding";
import { FiSearch, FiPackage } from "react-icons/fi";

type Props = {
  initialProducts?: ProductsResponse;
  initialCategories?: CategoriesResponse;
  business?: BusinessData | null;
};

export default function Home({ initialProducts, initialCategories, business }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Source of truth: URL
  const urlTitle = searchParams.get("title") || "";
  const urlCategoryId = searchParams.get("categoryId") || "";

  // Local state for the search input (to be fast)
  const [search, setSearch] = useState(urlTitle);
  const [debouncedSearch] = useDebouncedValue(search, 500);

  // Synchronization: URL -> Search Input (only if they differ)
  useEffect(() => {
    if (urlTitle !== search) {
      setSearch(urlTitle);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTitle]);

  const { data, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteProducts({
    limit: 30,
    title: debouncedSearch,
    categoryId: urlCategoryId,
    initialData: initialProducts,
  });

  const { data: categoriesData, isLoading: isLoadingCats } = useCategories(initialCategories);
  const categories: Categories[] = categoriesData?.data ?? [];

  const products: Products[] = useMemo(
    () => (Array.isArray(data?.pages) ? data.pages.flatMap((p) => p?.data?.products ?? []) : []),
    [data]
  );

  const {
    utils: { capitalizeTexts, isMobile },
  } = useAppContext();

  const h1Title = useMemo(() => {
    if (business?.name) return business.name;
    return "Tienda Online";
  }, [business]);

  // Synchronization: Search Input -> URL
  // Only update URL if debouncedSearch or urlCategoryId changes
  useEffect(() => {
    if (debouncedSearch === urlTitle) return;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("title", debouncedSearch);
    } else {
      params.delete("title");
    }
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, pathname, router, urlTitle, searchParams]);

  const handleCategoryChange = (catId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (catId) {
      params.set("categoryId", catId);
    } else {
      params.delete("categoryId");
    }
    router.push(`${pathname}?${params.toString()}#productos`, { scroll: false });
    
    // Scroll handling
    if (catId) {
        setTimeout(() => {
            const el = document.getElementById("productos");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    }
  };

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
    };
  }, [hasNextPage, fetchNextPage]);

  return (
    <Box pb={80}>
      {!business ? (
        <Onboarding />
      ) : (
        <Flex direction="column">
          {!urlTitle && !urlCategoryId && (
            <Hero
              title={h1Title}
              description={
                business?.description ||
                "Exclusividad y diseño en cada paso. Descubrí nuestra colección curada."
              }
              backgroundImage={business?.hero_image}
            />
          )}



          {categories.length > 0 && (
            <Box id="categorias" my={50}>
              <Container size="xl">
                <Stack gap="xs" mb={30}>
                  <Title order={2} fw={800} size={32}>
                    Colecciones
                  </Title>
                  <Text c="dimmed" fz="lg">
                    Explorá nuestras categorías y encontrá tu estilo ideal.
                  </Text>
                </Stack>

                {isLoadingCats ? (
                  <Center h={200}>
                    <Loader variant="dots" color="dark" />
                  </Center>
                ) : (
                  <CategoriesCards categories={categories} />
                )}
              </Container>
            </Box>
          )}

          <Divider my={40} color="rgba(0,0,0,0.05)" />

          <Box id="productos-seccion" pt={20}>
            <Container size="xl">
              <Flex justify="space-between" align="flex-end" mb={40} wrap="wrap" gap="md">
                <Stack gap="xs">
                  <Title order={2} fw={800} size={32}>
                    Nuestros Productos
                  </Title>
                  <Text c="dimmed" fz="lg">
                    Calidad artesanal y materiales de primera.
                  </Text>
                </Stack>

                <Flex gap={10} wrap={"wrap"} style={{ flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
                  <Input
                    placeholder="Buscar..."
                    w={isMobile ? "100%" : 280}
                    size="md"
                    radius="xl"
                    leftSection={<FiSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    rightSection={isFetchingNextPage ? <Loader size="xs" /> : null}
                  />
                  {categories.length > 0 && (
                    <NativeSelect
                      size="md"
                      radius="xl"
                      w={isMobile ? "100%" : 180}
                      value={urlCategoryId}
                      onChange={(e) => handleCategoryChange(e.currentTarget.value)}
                      data={[
                        { value: "", label: "Todas las categorías" },
                        ...categories.map((category) => ({
                          value: category.id,
                          label: capitalizeTexts(category.title),
                        })),
                      ]}
                    />
                  )}
                </Flex>
              </Flex>

              <SimpleGrid
                id="productos"
                cols={{ base: 2, sm: 3, lg: 4 }}
                spacing={{ base: 15, sm: 20, lg: 25 }}
                verticalSpacing={{ base: 25, sm: 30, lg: 40 }}
                mih={products.length > 0 ? "50vh" : "20vh"}
              >
                {products.length > 0 ? (
                  products.map((product, index) => (
                    <ProductsCards key={product.id} product={product} priority={index < 4} />
                  ))
                ) : (
                  <Box style={{ gridColumn: '1 / -1' }}>
                    <EmptyState
                      icon={<FiPackage size={40} color="#adb5bd" />}
                      title={debouncedSearch ? "Sin resultados" : "Colección en preparación"}
                      description={
                        debouncedSearch
                          ? `No encontramos nada que coincida con "${debouncedSearch}". Probá con otros términos.`
                          : "Estamos cargando nuestros últimos diseños. Volvé en unos momentos."
                      }
                      action={debouncedSearch ? { label: "Limpiar búsqueda", onClick: () => setSearch("") } : undefined}
                    />
                  </Box>
                )}
              </SimpleGrid>

              <Box
                ref={(el) => {
                  sentinelRef.current = el;
                }}
                w="100%"
                mt={40}
              >
                {isFetchingNextPage ? (
                  <Center>
                    <Loader size="md" color="dark" />
                  </Center>
                ) : (
                  hasNextPage && (
                    <Center>
                      <Text c="dimmed">Deslizá para ver más</Text>
                    </Center>
                  )
                )}
              </Box>
            </Container>
          </Box>
        </Flex>
      )}
      <CartWrapper />
    </Box>
  );
}
