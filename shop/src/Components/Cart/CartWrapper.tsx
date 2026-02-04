'use client'
import React, { useState } from 'react'
import Cart from './Cart'
import { ActionIcon } from '@mantine/core'
import { FaShoppingCart } from 'react-icons/fa'
import { useWindowSize } from "@/utils/hooks/useWindowSize";
function CartWrapper() {
    const [cartOpened, setCartOpened] = useState(false)
    const { isMobile } = useWindowSize();
    return (
        <>
            <ActionIcon
                variant="filled"
                radius="xl"
                size={isMobile ? "xl" : "xl"}
                style={{ position: "fixed", right: isMobile ? 16 : 24, bottom: isMobile ? 16 : 24, zIndex: 1000 }}
                aria-label="Carrito"
                onClick={() => setCartOpened(!cartOpened)}
            >
                <FaShoppingCart />
            </ActionIcon>
            <Cart onClose={() => setCartOpened(false)} opened={cartOpened} />
        </>
    )
}
export default CartWrapper
