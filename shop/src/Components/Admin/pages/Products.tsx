"use client";
import { useState } from "react";
import { Box, Title} from "@mantine/core";

import ModalWrapper from "@/Components/Admin/Common/ModalWrapper";
import ProductForm from "@/Components/Admin/Products/ProductForm";
import ProductTable from "@/Components/Admin/Products/ProductTable";

export default function Products() {
  const [addOpened, setAddOpened] = useState<boolean>(false);

  return (
    <Box>
      <Title mb="md">Productos</Title>
      <ProductTable setAddOpened={setAddOpened} />
      <ModalWrapper opened={addOpened} onClose={() => setAddOpened(false)} title="Añadir producto" size="lg">
        <ProductForm onCancel={() => setAddOpened(false)} />
      </ModalWrapper>
    </Box>
  );
}