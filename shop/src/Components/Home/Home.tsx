

"use client";
import { Box, Flex, Title, Text, Container, Input, NativeSelect, Loader, Stack, Center } from "@mantine/core";

import { useInfiniteProducts, Products, ProductsResponse } from "@/Api/useProducts";
import ProductsCards from "./sub-components/ProductsCards";
import { Categories, CategoriesResponse, useCategories } from "@/Api/useCategories";
import { BusinessData } from "@/Api/useBusiness";
import CategoriesCards from "./sub-components/CategoriesCards";
import PromosBanner from "./sub-components/PromosBanner";
import { useAppContext } from "@/providers/AppContext";
import { useEffect, useMemo, useState, useRef } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CartWrapper from "../Cart/CartWrapper";

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
    const { data: categoriesData } = useCategories(initialCategories)
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
        if (business?.type && business?.city && business?.name) {
            return `Bienvenidos a ${business.name}`;
        }
        return business?.name || "Tienda Online";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCategories])

    useEffect(() => {
        const spTitle = searchParams.get("title") || ""
        const spCat = searchParams.get("categoryId") || ""
        if (spTitle !== search) setSearch(spTitle)
        if (spCat !== (selectedCategories[0] || "")) setSelectedCategories(spCat ? [spCat] : [])
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

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
        <Box >
            <Flex direction="column" justify={"center"}>
                {}
                {!search && !selectedCategories[0] && (
                    <Box mt={30} mb={10}>
                        <Container size="xl">
                            <Title order={1} mb="xs">{h1Title}</Title>
                            {business?.description && (
                                <Text size="lg" c="dimmed" mb="md" maw={800}>
                                    {business.description}
                                </Text>
                            )}
                        </Container>
                    </Box>
                )}

                {}
                {!search && !selectedCategories[0] && <PromosBanner />}

                <Box my={30}>
                    <Container size="xl">
                        <Title order={2} mb="xs">Categorías</Title>
                        <Text c="dimmed" mb="md">Explorá por categoría y encontrá lo que buscás.</Text>
                        {isLoading ? (
                          <Center my={20}><Loader size="sm"/></Center>
                        ) : (
                          <CategoriesCards categories={categories} />
                        )}
                    </Container>
                </Box>

                <Box size="xl" p={10}>
                    <Flex direction={"column"} justify={"center"} align={"flex-start"}>
                        <Title order={2} mb={10}>
                            Nuestros productos
                        </Title>
                        <Text c="dimmed" mb="md">Busca por nombre, categoría o descripción.</Text>
                    </Flex>
                    <Flex gap={10} wrap={"wrap"}>
                        <Input
                            mb={10}
                            placeholder="Buscar"
                            w={isMobile ? "100%" : 300}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                            rightSection={isFetchingNextPage ? <Loader size="xs" /> : null}
                        />
                        <NativeSelect
                            mb={10}
                            value={selectedCategories[0]}
                            onChange={(e) => setSelectedCategories([e.currentTarget.value])}
                            data={[
                                { value: "", label: "Todos" },
                                ...categories.map((category) => ({
                                    value: category.id,
                                    label: capitalizeTexts(category.title),
                                }))
                            ]}
                        />
                    </Flex>
                </Box>
                <Flex id="productos" wrap="wrap" justify="space-evenly" align="flex-start" mih={Array.isArray(products) && products.length > 0 ? "100vh" : "10vh"} flex={1} gap={20}>
                  {Array.isArray(products) && products.length > 0 ? (
                      products.map((product, index) => (
                          <ProductsCards key={product.id} product={product} priority={index < 4} />
                      ))
                  ) : (
                        <Stack align="center">
                            {isLoading ? <Loader size="xs" /> : <Text c="dimmed">No hay productos disponibles</Text>}
                        </Stack>
                    )}
                  <Box ref={(el) => { sentinelRef.current = el }} w="100%" my={20}>
                    {isFetchingNextPage ? <Loader size="sm" /> : (hasNextPage ? <Text c="dimmed">Cargando más...</Text> : null)}
                  </Box>
                </Flex>
            </Flex>
            <CartWrapper/>
        </Box>
    )
}
