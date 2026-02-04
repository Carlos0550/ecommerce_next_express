'use client'
import React, { useState } from 'react'
import Cart from './Cart'
import { ActionIcon, Box } from '@mantine/core'
import { FaShoppingCart } from 'react-icons/fa'

function CartWrapper() {
    const [cartOpened, setCartOpened] = useState(false)

    return (
        <>
            <Box
                pos="fixed"
                right={{ base: 16, sm: 24 }}
                bottom={{ base: 16, sm: 24 }}
                style={{ zIndex: 1000 }}
            >
                <ActionIcon
                    variant="filled"
                    radius="xl"
                    size="xl"
                    aria-label="Carrito"
                    onClick={() => setCartOpened(!cartOpened)}
                >
                    <FaShoppingCart />
                </ActionIcon>
            </Box>
            <Cart onClose={() => setCartOpened(false)} opened={cartOpened} />
        </>
    )
}
export default CartWrapper
