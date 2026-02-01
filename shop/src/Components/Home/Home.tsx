"use client";
import { Box, Flex, Title, Text, Container, Input, NativeSelect, Loader, Stack, Center, Divider } from "@mantine/core";
import { useInfiniteProducts, Products, ProductsResponse } from "@/Api/useProducts";
import ProductsCards from "./sub-components/ProductsCards";
import { Categories, CategoriesResponse, useCategories } from "@/Api/useCategories";
import { BusinessData } from "@/Api/useBusiness";
import CategoriesCards from "./sub-components/CategoriesCards";
import PromosBanner from "./sub-components/PromosBanner";
import Hero from "./sub-components/Hero";
import EmptyState from "./sub-components/EmptyState";
import { useAppContext } from "@/providers/AppContext";
import { useEffect, useMemo, useState, useRef } from "react";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CartWrapper from "../Cart/CartWrapper";
import Onboarding from "./sub-components/Onboarding";
import { FiSearch, FiLayers, FiPackage } from "react-icons/fi";

type Props = {
  initialProducts?: ProductsResponse
  initialCategories?: CategoriesResponse
  business?: BusinessData | null
}

export default function Home({ initialProducts, initialCategories, business }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const initialTitle = useMemo(() => searchParams.get("title") || "", [searchParams])
    const initialCategoryId = useMemo(() => searchParams.get("categoryId") || "", [searchParams])
    const [limit] = useState(30)
    const [search, setSearch] = useState(initialTitle)
    const [debouncedSearch] = useDebouncedValue(search, 400)
    const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategoryId ? [initialCategoryId] : [])
    
    const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteProducts({
        limit,
        title: debouncedSearch,
        categoryId: selectedCategories[0],
        initialData: initialProducts
    })
    
    const { data: categoriesData, isLoading: isLoadingCats } = useCategories(initialCategories)
    const categories: Categories[] = categoriesData?.data ?? []
    
    const products: Products[] = Array.isArray(data?.pages)
      ? data.pages.flatMap((p) => p?.data?.products ?? [])
      : []

    const {
        utils: {
            capitalizeTexts,
            isMobile
        }
    } = useAppContext()
    
    const h1Title = useMemo(() => {
        if (business?.name) return business.name;
        return "Tienda Online";
    }, [business]);

  useEffect(() => {
    const next = new URLSearchParams(Array.from(searchParams.entries()))
    if (debouncedSearch && debouncedSearch.trim().length > 0) {
      next.set("title", debouncedSearch.trim())
    } else {
      next.delete("title")
    }
    const cat = selectedCategories[0] || ""
    if (cat) {
      next.set("categoryId", cat)
    } else {
      next.delete("categoryId")
    }
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    if (cat) {
      const el = typeof document !== 'undefined' ? document.getElementById('productos') : null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [debouncedSearch, selectedCategories]);

    useEffect(() => {
        const spTitle = searchParams.get("title") || ""
        const spCat = searchParams.get("categoryId") || ""
        if (spTitle !== search) setSearch(spTitle)
        if (spCat !== (selectedCategories[0] || "")) setSelectedCategories(spCat ? [spCat] : [])
    }, [searchParams]);

    const sentinelRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      const el = sentinelRef.current
      if (!el) return
      const obs = new IntersectionObserver((entries) => {
        const first = entries[0]
        if (first.isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      })
      obs.observe(el)
      return () => { obs.disconnect() }
    }, [sentinelRef, hasNextPage, fetchNextPage])

    return (
        <Box pb={80}>
            {!business ? (
                <Onboarding />
            ) : (
                <Flex direction="column">
                    {/* Hero Section */}
                    {!search && !selectedCategories[0] && (
                        <Hero 
                          title={h1Title} 
                          description={business?.description || "Exclusividad y diseño en cada paso. Descubrí nuestra colección curada."}
                          backgroundImage={business?.hero_image}
                        />
                    )}

                    {/* Promociones destacadas */}
                    {!search && !selectedCategories[0] && <PromosBanner />}

                    {/* Categorías */}
                    <Box id="categorias" my={50}>
                        <Container size="xl">
                            <Stack gap="xs" mb={30}>
                              <Title order={2} fw={800} size={32}>Colecciones</Title>
                              <Text c="dimmed" fz="lg">Explorá nuestras categorías y encontrá tu estilo ideal.</Text>
                            </Stack>
                            
                            {isLoadingCats ? (
                                <Center h={200}><Loader variant="dots" color="dark"/></Center>
                            ) : categories.length > 0 ? (
                                <CategoriesCards categories={categories} />
                            ) : (
                                <EmptyState 
                                  icon={<FiLayers size={40} color="#adb5bd"/>}
                                  title="Próximamente"
                                  description="Estamos organizando nuestras colecciones para vos. Volvé pronto."
                                />
                            )}
                        </Container>
                    </Box>

                    <Divider my={40} color="rgba(0,0,0,0.05)" />

                    {/* Productos */}
                    <Box id="productos-seccion" pt={20}>
                        <Container size="xl">
                            <Flex justify="space-between" align="flex-end" mb={40} wrap="wrap" gap="md">
                                <Stack gap="xs">
                                  <Title order={2} fw={800} size={32}>Nuestros Productos</Title>
                                  <Text c="dimmed" fz="lg">Calidad artesanal y materiales de primera.</Text>
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
                                    <NativeSelect
                                        size="md"
                                        radius="xl"
                                        w={isMobile ? "100%" : 180}
                                        value={selectedCategories[0]}
                                        onChange={(e) => setSelectedCategories([e.currentTarget.value])}
                                        data={[
                                            { value: "", label: "Todas las categorías" },
                                            ...categories.map((category) => ({
                                                value: category.id,
                                                label: capitalizeTexts(category.title),
                                            }))
                                        ]}
                                    />
                                </Flex>
                            </Flex>

                            <Flex 
                              id="productos" 
                              wrap="wrap" 
                              justify={products.length > 0 ? "flex-start" : "center"} 
                              align="flex-start" 
                              mih={products.length > 0 ? "50vh" : "20vh"} 
                              gap={30}
                            >
                              {products.length > 0 ? (
                                  products.map((product, index) => (
                                      <ProductsCards key={product.id} product={product} priority={index < 4} />
                                  ))
                              ) : (
                                  <EmptyState 
                                    icon={<FiPackage size={40} color="#adb5bd" />}
                                    title={search ? "Sin resultados" : "Colección en preparación"}
                                    description={search 
                                      ? `No encontramos nada que coincida con "${search}". Probá con otros términos.` 
                                      : "Estamos cargando nuestros últimos diseños. Volvé en unos momentos."
                                    }
                                    action={search ? { label: "Limpiar búsqueda", onClick: () => setSearch("") } : undefined}
                                  />
                              )}
                            </Flex>

                            <Box ref={(el) => { sentinelRef.current = el }} w="100%" mt={40}>
                                {isFetchingNextPage ? (
                                  <Center><Loader size="md" color="dark" /></Center>
                                ) : (
                                  hasNextPage && <Center><Text c="dimmed">Deslizá para ver más</Text></Center>
                                )}
                            </Box>
                        </Container>
                    </Box>
                </Flex>
            )}
            <CartWrapper/>
        </Box>
    )
}
