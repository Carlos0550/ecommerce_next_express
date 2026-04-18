import { useMemo, useState } from "react";
import CategoriesForm from "@/Components/Admin/Categories/CategoriesForm";
import ModalWrapper from "@/Components/Admin/Common/ModalWrapper";
import { theme } from "@/theme";
import { Badge, Box, Button, Flex, Group, Image, Loader, Paper, ScrollArea, Select, Stack, Table, Text, TextInput } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { FiEdit, FiPlus, FiSearch } from "react-icons/fi";
import { useChangeCategoryStatus, useGetAllCategories } from "@/hooks/useAdminCategories";
import { useMounted } from "@/utils/hooks/useMounted";
import type { AdminCategory } from "@/stores/useAdminStore";

const NoImage = "/image_fallback.webp";

type Props = {
    setAddOpened: (opened: boolean) => void;
}
export function CategoriesTable({setAddOpened}: Props) {
    const mounted = useMounted();
    const [query, setQuery] = useState<string>("");
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints?.sm || '768px'})`);
    const [openEdit, setOpenEdit] = useState<boolean>(false);
    const { data, isLoading, isError } = useGetAllCategories();
    const useChangeStatus = useChangeCategoryStatus()

    const categories: AdminCategory[] = useMemo(() => {
        return data || [];
    }, [data]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c) => String(c.title || "").toLowerCase().includes(q));
    }, [query, categories]);

    const status_map: { [key: string]: string } = {
        active: "Activo",
        inactive: "Inactivo",
        deleted: "Eliminado"
    }

    const handleChange = (value: string, categoryId: string) => {
        useChangeStatus.mutate({
            categoryId: categoryId,
            status: value
        })
    }
    const [currentCategory, setCurrentCategory] = useState<AdminCategory>()
    const handleEdit = (category: AdminCategory) => {
        setCurrentCategory(category)
        setOpenEdit(true)
    }
    if (!mounted) {
        return (
            <Box>
                <Flex w="100%" h="50vh" justify="center" align="center">
                    <Loader type="bars" />
                </Flex>
            </Box>
        );
    }
    return (
        <Box>
            <Flex direction={"row"} gap={"md"} align={"center"} mb="md" wrap={"wrap"}>
                <TextInput
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    placeholder="Buscar categorías por título"
                    leftSection={<FiSearch />}
                    style={{ flex: "1 1 280px", minWidth: 260, maxWidth: 520 }}
                />
                <Button leftSection={<FiPlus />} onClick={() => setAddOpened(true)}>
                    Nueva categoría
                </Button>
            </Flex>
            {isError && <Text color="red">Error al cargar categorías</Text>}
            {isMobile ? (
                isLoading ? (
                    <Flex
                        w="100%" h="50vh"
                        justify="center"
                        align="center"
                    >
                        <Loader type="bars" />
                    </Flex>
                ) : (
                    <Stack>
                        {filtered.map((c) => (
                            <Paper key={c.id} withBorder p="sm" radius="md">
                                <Group justify="space-between" align="flex-start">
                                    <Group gap="sm" wrap="nowrap">
                                        <Image src={c.image || NoImage} alt={c.title} w={64} h={64} radius="sm" fit="cover" />
                                        <Box>
                                            <Group gap="xs">
                                                <Text fw={600} style={{ textTransform: 'capitalize' }}>{c.title}</Text>
                                                {c.is_active === false && <Badge variant="light" color="gray">Inactiva</Badge>}
                                            </Group>
                                            {c.created_at && (
                                                <Text c="dimmed">Creada: {new Date(c.created_at).toLocaleDateString()}</Text>
                                            )}
                                        </Box>
                                    </Group>
                                    <Group gap="xs" wrap="nowrap" >
                                        <Select
                                            value={c.status ? String(c.status) : undefined}
                                            disabled={useChangeStatus.isPending}
                                            onChange={(value) => handleChange(value || "", c.id)}
                                            style={{ flex: "1" }}
                                            data={Object.entries(status_map).map(([key, value]) => ({
                                                value: key,
                                                label: value
                                            }))}
                                        />
                                        <Button onClick={() => handleEdit(c)}  size="xs" variant="light" leftSection={<FiEdit />} aria-label="Editar">
                                            Editar
                                        </Button>
                                    </Group>
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                )
            ) : (
                isLoading ? (
                    <Flex
                        w="100%" h="50vh"
                        justify="center"
                        align="center"
                    >
                        <Loader type="bars" />
                    </Flex>
                ) : (
                    <Paper withBorder p="md" radius="md">
                        <ScrollArea>
                            <Table highlightOnHover withTableBorder withColumnBorders>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th style={{ width: 64 }}>Imagen</Table.Th>
                                        <Table.Th>Título</Table.Th>
                                        <Table.Th style={{ width: 160 }}>Creado</Table.Th>
                                        <Table.Th style={{ width: 240 }}>Acciones</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {filtered.map((c) => (
                                        <Table.Tr key={c.id}>
                                            <Table.Td>
                                                <Image src={c.image || NoImage} alt={c.title} w={48} h={48} radius="sm" fit="cover" />
                                            </Table.Td>
                                            <Table.Td>
                                                <Text fw={600} style={{ textTransform: 'capitalize' }}>{c.title}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                {c.created_at ? (
                                                    <Text c="dimmed">{new Date(c.created_at).toLocaleString()}</Text>
                                                ) : (
                                                    <Text c="dimmed">—</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="xs" justify="flex-end">
                                                    <Select
                                                        value={c.status ? String(c.status) : undefined}
                                                        disabled={useChangeStatus.isPending}
                                                        onChange={(value) => handleChange(value || "", c.id)}
                                                        style={{ flex: "1" }}
                                                        data={Object.entries(status_map).map(([key, value]) => ({
                                                            value: key,
                                                            label: value
                                                        }))}
                                                    />
                                                    <Button
                                                        onClick={() => handleEdit(c)} 
                                                        size="xs" 
                                                        variant="light" 
                                                        leftSection={<FiEdit />} 
                                                        aria-label="Editar"
                                                        >
                                                        Editar
                                                    </Button>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </Paper>
                )
            )}
            {openEdit && (
                <ModalWrapper opened={openEdit} onClose={() => setOpenEdit(false)} title="Editar categoría" size="lg">
                    <CategoriesForm closeForm={() => setOpenEdit(false)} initialValues={currentCategory} />
                </ModalWrapper>
            )}
        </Box>
    )
}
