"use client";
import { Box, Button, Flex, Group, Text, Title } from "@mantine/core";
import SalesTable from "@/Components/Admin/Sales/SalesTable";
import { useState } from "react";
import ModalWrapper from "@/Components/Admin/Common/ModalWrapper";
import { SalesForm } from "@/Components/Admin/Sales/SalesForm";
import { useMediaQuery } from "@mantine/hooks";

export function Sales() {
    const [opened, setOpened] = useState<boolean>(false)
    const isMobile = useMediaQuery("(max-width: 768px)")
    const handleToggle = () => {
        setOpened(!opened)
    }
    return (
        <Box>
            <Flex
                direction="column"
                justify={"center"}
                align={"flex-start"}
            >
                <Title>
                    Ventas
                </Title>
                <Text>
                    Aquí puedes ver y realizar ventas.
                </Text>
            </Flex>
            <Group mt={"md"} gap={"md"} align="center" wrap="wrap">
                <Button onClick={handleToggle}>
                    Realizar Venta
                </Button>
            </Group>
            <Box mt="lg">
                <SalesTable />
            </Box>

            {opened && <ModalWrapper
                size={"xl"}
                fullScreen={isMobile}
                opened={opened}
                onClose={handleToggle}
                title={<Text fw={600} fz="lg" mb="md">Formulario de Venta</Text>}
            >
                <SalesForm onClose={handleToggle} />
            </ModalWrapper>}
        </Box>
    )
}

