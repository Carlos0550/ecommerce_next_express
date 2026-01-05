"use client"
import { useState, useTransition, useEffect } from "react"
import { Button, Loader, Select, Stack, Group, Text } from "@mantine/core"
import { useCartActions } from "@/Components/Cart/Hooks/useCart"
import { useAppContext } from "@/providers/AppContext"
import { FaCartPlus } from "react-icons/fa"
import type { SelectedOption } from "@/providers/useCart"

export default function AddToCartButton({ productId, options = [] }: { productId: string; options?: { name: string; values: string[] }[] }) {
  const {
    utils:{
      isMobile
    }
  } = useAppContext()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([])
  
  useEffect(() => {
    if (options && options.length > 0) {
      setSelectedOptions(options.map(o => ({ name: o.name, value: o.values[0] })))
    }
  }, [options])

  const busy = loading || isPending
  const { addToCart } = useCartActions()

  const handleClick = () => {
    startTransition(async () => {
      setLoading(true)
      try {
        await addToCart(productId, selectedOptions)
      } finally {
        setLoading(false)
      }
    })
  }

  const handleOptionChange = (name: string, value: string | null) => {
    if (!value) return
    setSelectedOptions(prev => prev.map(o => o.name === name ? { ...o, value } : o))
  }

  return (
    <Stack gap="sm">
      {options.length > 0 && (
        <Stack gap="xs">
          {options.map((opt, idx) => {
            // Filtrar valores duplicados
            const uniqueValues = Array.from(new Set(opt.values))
            
            return (
              <Group key={idx} justify="space-between">
                <Text size="sm" fw={500}>{opt.name}:</Text>
                <Select
                  data={uniqueValues}
                  value={selectedOptions.find(o => o.name === opt.name)?.value || ""}
                  onChange={(val) => handleOptionChange(opt.name, val)}
                  allowDeselect={false}
                  size="sm"
                  w={150}
                />
              </Group>
            )
          })}
        </Stack>
      )}
      {isMobile ? (
        <Button variant="light" fullWidth onClick={handleClick} disabled={busy} rightSection={busy ? <Loader size="xs" /> : <FaCartPlus />}>
        Añadir
      </Button>
      ) : (
        <Button variant="light" onClick={handleClick} disabled={busy} rightSection={busy ? <Loader size="xs" /> : null}>
        Agregar al carrito
      </Button>
      )}
    </Stack>
  )
}
