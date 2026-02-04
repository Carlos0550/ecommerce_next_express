"use client";
import CategoriesForm from "@/Components/Admin/Categories/CategoriesForm";
import { CategoriesTable } from "@/Components/Admin/Categories/CategoriesTable";
import ModalWrapper from "@/Components/Admin/Common/ModalWrapper";
import { Box, Title } from "@mantine/core";
import { useState } from "react";
export default function Categories() {
  const [addOpened, setAddOpened] = useState<boolean>(false);
  return (
    <Box>
      <Title mb="md">Categorías</Title>
      <CategoriesTable setAddOpened={setAddOpened} />
      <ModalWrapper opened={addOpened} onClose={() => setAddOpened(false)} title="Añadir categoría" size="lg">
        <CategoriesForm closeForm={() => setAddOpened(false)} />
      </ModalWrapper>
    </Box>
  )
}
