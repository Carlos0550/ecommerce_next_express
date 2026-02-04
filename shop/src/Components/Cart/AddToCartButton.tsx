"use client"
import { useState, useTransition, useEffect } from "react"
import { Button, Loader, Select, Stack, Group, Text } from "@mantine/core"
import { FaCartPlus } from "react-icons/fa"
import { configService } from "@/services/config.service";
import { showNotification } from "@mantine/notifications";
import { useWindowSize } from "@/utils/hooks/useWindowSize";
import { useCartStore } from "@/stores/useCartStore";
import { SelectedOption } from "@/services/cart.service";
export default function AddToCartButton({ productId, options = [], fullWidth = false }: { productId: string; options?: { name: string; values: string[] }[]; fullWidth?: boolean }) {
  const { isMobile } = useWindowSize();
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([])
  const addItem = useCartStore((state) => state.addItem)
  useEffect(() => {
    if (options && options.length > 0) {
      setSelectedOptions(options.map(o => ({ name: o.name, value: o.values[0] })))
    }
  }, [options])
  const busy = loading || isPending
  const handleClick = () => {
    startTransition(async () => {
      setLoading(true)
      try {
        const res = await configService.getProductById(productId);
        const product = res?.data?.product || res?.product || res; 
        if (!product || !product.id) {
             throw new Error("Producto no encontrado");
        }
        if (product.stock <= 0) {
            showNotification({ title: "Producto agotado", message: "No hay stock disponible", color: "yellow" });
            return;
        }
        await addItem({ 
            product_id: product.id, 
            quantity: 1, 
            options: selectedOptions, 
            product_name: product.title, 
            price: product.price,
            image_url: product.images?.[0] || "",
            price_changed: false
        })
        showNotification({ title: "Agregado", message: "Producto agregado al carrito", color: "green" });
      } catch(e) {
          console.error(e);
          showNotification({ title: "Error", message: "No se pudo agregar al carrito", color: "red" });
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
        <Button 
          variant="filled" 
          fullWidth={fullWidth} 
          onClick={handleClick} 
          disabled={busy} 
          radius="xl"
          rightSection={busy ? <Loader size="xs" color="white" /> : <FaCartPlus size={14} />}
        >
          Añadir
        </Button>
      ) : (
        <Button 
          variant="filled" 
          fullWidth={fullWidth} 
          onClick={handleClick} 
          disabled={busy} 
          radius="xl"
          rightSection={busy ? <Loader size="xs" color="white" /> : null}
        >
          Agregar al carrito
        </Button>
      )}
    </Stack>
  )
}
