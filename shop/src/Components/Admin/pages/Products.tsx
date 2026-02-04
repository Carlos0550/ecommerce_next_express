"use client";
import { useState } from "react";
import { Box, Title, Text, Stack } from "@mantine/core";
import ModalWrapper from "@/Components/Admin/Common/ModalWrapper";
import ProductForm from "@/Components/Admin/Products/ProductForm";
import ProductTable from "@/Components/Admin/Products/ProductTable";
export default function Products() {
  const [addOpened, setAddOpened] = useState<boolean>(false);
  return (
    <Box pb="xl">
      <Stack gap={4} mb="xl">
        <Title order={1} fw={800}>Gestión de Productos</Title>
        <Text c="dimmed">Administra tu inventario, precios y visualización de productos.</Text>
      </Stack>
      <ProductTable setAddOpened={setAddOpened} />
      <ModalWrapper opened={addOpened} onClose={() => setAddOpened(false)} title="Añadir producto" size="lg">
        <ProductForm onCancel={() => setAddOpened(false)} />
      </ModalWrapper>
    </Box>
  );
}
