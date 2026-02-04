"use client";
import { Box, Button, Text, Title, Flex, ActionIcon, Affix, Transition } from "@mantine/core";
import SalesTable from "@/Components/Admin/Sales/SalesTable";
import { useState } from "react";
import ModalWrapper from "@/Components/Admin/Common/ModalWrapper";
import { SalesForm } from "@/Components/Admin/Sales/SalesForm";
import { useMediaQuery, useWindowScroll } from "@mantine/hooks";
import { FiPlus } from "react-icons/fi";
export function Sales() {
    const [opened, setOpened] = useState<boolean>(false)
    const isMobile = useMediaQuery("(max-width: 768px)")
    const [] = useWindowScroll()
    const handleToggle = () => {
        setOpened(!opened)
    }
    return (
        <Box pb={80}>
            <Flex
                direction="column"
                justify={"center"}
                align={"flex-start"}
            >
                <Title order={1} fw={800} fz={isMobile ? "24px" : "32px"}>
                    Ventas
                </Title>
                <Text c="dimmed" fz="sm">
                    Resumen detallado de ingresos y gestión de pedidos.
                </Text>
            </Flex>
            <Box mt="lg">
                <SalesTable />
            </Box>
            <Affix position={{ bottom: 20, right: 20 }}>
                <Transition transition="slide-up" mounted={true}>
                    {(transitionStyles) => (
                        isMobile ? (
                            <ActionIcon
                                style={transitionStyles}
                                size={56}
                                radius="xl"
                                variant="filled"
                                onClick={handleToggle}
                                aria-label="Realizar venta"
                            >
                                <FiPlus size={24} />
                            </ActionIcon>
                        ) : (
                            <Button
                                style={transitionStyles}
                                onClick={handleToggle}
                                leftSection={<FiPlus size={18} />}
                                size="lg"
                                radius="xl"
                            >
                                Realizar Venta
                            </Button>
                        )
                    )}
                </Transition>
            </Affix>
            {opened && <ModalWrapper
                size="90vw"
                fullScreen={isMobile}
                opened={opened}
                onClose={handleToggle}
                title={<Text fw={600} fz="lg">Formulario de Venta</Text>}
            >
                <SalesForm onClose={handleToggle} />
            </ModalWrapper>}
        </Box>
    )
}
