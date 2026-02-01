"use client";
import ModalWrapper from "@/Components/Admin/Common/ModalWrapper";
import { PromoForm } from "@/Components/Admin/Promos/PromoForm";
import PromosTable from "@/Components/Admin/Promos/PromosTable";
import { Box, Button, Group, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import type { Promo } from "@/Api/admin/PromoApi";
import { FiPlus, FiSearch } from "react-icons/fi";

export function Promos() {
    const [opened, setOpened] = useState<boolean>(false)
    const [search, setSearch] = useState<string>("")
    const [editingPromo, setEditingPromo] = useState<Promo | null>(null)

    const handleToggle = () => {
        setOpened(!opened)
    }
    return (
        <Box>
            <Title mb={"md"}>Promociones</Title>
            <Group mb={"md"} gap={"md"} align="center" wrap="wrap">
                <TextInput
                    placeholder="Buscar por código o título"
                    leftSection={<FiSearch />}
                    style={{ flex: "1 1 280px", minWidth: 260, maxWidth: 520 }}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                />
                <Button leftSection={<FiPlus />} onClick={() => { setEditingPromo(null); handleToggle(); }}>
                    Nueva promoción
                </Button>
            </Group>

            <PromosTable
                search={search}
                onEdit={(promo) => { setEditingPromo(promo); setOpened(true); }}
            />

            <ModalWrapper
                opened={opened}
                onClose={handleToggle}
                title={editingPromo ? "Editar promoción" : "Nueva promoción"}
                size={"xl"}
            >
                <PromoForm onClose={handleToggle} promo={editingPromo}/>
            </ModalWrapper>
        </Box>
    )
}

