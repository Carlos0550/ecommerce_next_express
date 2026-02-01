import { Box, Grid, Text, Select, Card, Group, Stack, Badge, ActionIcon, Divider, Paper, Loader, Button, TextInput, Textarea, SegmentedControl, Title, rem } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { showNotification } from "@mantine/notifications";
import dayjs from "dayjs";
import { useState, useMemo, useEffect } from "react";
import { FiTrash, FiShoppingCart, FiCalendar, FiCreditCard, FiPlus, FiSave, FiList, FiEdit3 } from "react-icons/fi";
import { useGetAllProducts, type GetProductsParams, type Product } from "@/Api/admin/ProductsApi";
import { useSaveSale, useUpdateSale } from "@/Api/admin/SalesApi";
import type { Sales } from "./SalesTable";
export const SaleSource = ["WEB", "CAJA"] as const;
export type SaleSource = typeof SaleSource[number];

export const PaymentMethods = ["TARJETA", "EFECTIVO", "QR", "NINGUNO", "TRANSFERENCIA"] as const;
export type PaymentMethods = typeof PaymentMethods[number];

export type UserSale = {
    user_id?: string
}

export type ManualProductItem = {
    quantity: number;
    title: string;
    price: number;
    options?: Record<string, unknown>;
}

export type SaleRequest = {
    payment_method: PaymentMethods
    source: SaleSource
    product_ids?: string[]
    manualProducts?: ManualProductItem[]
    loadedManually: boolean
    user_sale?: UserSale
    total?: number
    tax: number
    payment_methods?: { method: PaymentMethods; amount: number }[]
    items?: { product_id: string; quantity: number; options?: Record<string, unknown> }[]
    sale_date?: string
}

type Props = {
    onClose: () => void,
    sale?: Sales
}

const formatDateOnly = (d: unknown) => {
    const m = dayjs(d as string | number | Date);
    return m.isValid() ? m.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
};

const getInitialFormValue = (sale?: Sales): SaleRequest => {
    if (sale) {
        const pm = Array.isArray((sale as Sales & { paymentMethods?: { method: PaymentMethods; amount: number }[] }).paymentMethods) ? (sale as Sales & { paymentMethods?: { method: PaymentMethods; amount: number }[] }).paymentMethods : [];
        return {
            payment_method: sale.payment_method,
            source: sale.source,
            product_ids: (sale.products || []).map(p => p.id),
            tax: Number(sale.tax) || 0,
            loadedManually: !!sale.loadedManually,
            manualProducts: (sale.manualProducts || []) as ManualProductItem[],
            payment_methods: pm,
            sale_date: formatDateOnly(dayjs(sale.created_at).toDate()),
        };
    }
    return {
        payment_method: "EFECTIVO",
        source: "CAJA",
        product_ids: [],
        total: 0,
        tax: 0,
        loadedManually: true,
        manualProducts: [],
        payment_methods: [{ method: "EFECTIVO", amount: 0 }],
        sale_date: formatDateOnly(new Date()),
    };
};

const getInitialSaleDate = (sale?: Sales): Date | null => {
    if (sale) {
        return dayjs(sale.created_at).toDate();
    }
    return dayjs().toDate();
};

const getInitialManualText = (sale?: Sales): string => {
    if (sale && Array.isArray(sale.manualProducts)) {
        return sale.manualProducts.map(mi => `${mi.quantity} ${mi.title} ${mi.price}`).join("\n");
    }
    return "";
};

const getInitialSelectedProducts = (sale?: Sales): Product[] => {
    if (sale && sale.products) {
        return sale.products as Product[];
    }
    return [];
};

export function SalesForm({ onClose, sale }: Props) {
    const saveSale = useSaveSale();
    const updateSale = useUpdateSale();

    const [saleDate, setSaleDate] = useState<Date | null>(() => getInitialSaleDate(sale));
    const [formValue, setFormValue] = useState<SaleRequest>(() => getInitialFormValue(sale));

    const [manualText, setManualText] = useState<string>(() => getInitialManualText(sale));
    const [searchTitle, setSearchTitle] = useState<string>("");
    const [selectValue, setSelectValue] = useState<string | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<Product[]>(() => getInitialSelectedProducts(sale));

    const productQueryParams: GetProductsParams = useMemo(() => ({
        page: 1,
        limit: 10,
        state: "active",
        title: searchTitle || undefined,
    }), [searchTitle]);

    const { data: productsRes, isLoading } = useGetAllProducts(productQueryParams);

    const productsOptions = useMemo(() => {
        const items = productsRes?.products ?? [];
        return items.map(p => ({ value: p.id, label: p.title }));
    }, [productsRes]);

    const addProductById = (id?: string | null) => {
        if (!id) return;
        const sourceList = productsRes?.products ?? [];
        const found = sourceList.find(p => p.id === id);
        if (!found) return;
        setSelectedProducts(prev => {
            const exists = prev.some(p => p.id === id);
            const next = exists ? prev : [...prev, found];
            const nextIds = next.map(p => p.id);
            const nextTotal = next.reduce((acc, p) => acc + (typeof p.price === "number" ? p.price : 0), 0);
            setFormValue(v => ({ ...v, product_ids: nextIds, total: nextTotal }));
            return next;
        });
    };

    const removeProduct = (id: string) => {
        setSelectedProducts(prev => {
            const next = prev.filter(p => p.id !== id);
            const nextIds = next.map(p => p.id);
            const nextTotal = next.reduce((acc, p) => acc + (typeof p.price === "number" ? p.price : 0), 0);
            setFormValue(v => ({ ...v, product_ids: nextIds, total: nextTotal }));
            return next;
        });
    };
    const parseManualProducts = (text: string): ManualProductItem[] => {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        const items: ManualProductItem[] = [];
        const re = /^(\d+)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s-]+?)\s+(\d+(?:\.\d+)?)$/;
        let invalid = 0;
        for (const line of lines) {

            const m = line.match(re);
            if (!m) { invalid++; continue; }
            const quantity = Number(m[1]);
            const title = m[2].trim();
            const price = Number(m[3]);
            if (!Number.isFinite(quantity) || !Number.isFinite(price)) continue;
            items.push({ quantity, title, price });
        }
        setManualInvalidCount(invalid);
        return items;
    };
    const [manualInvalidCount, setManualInvalidCount] = useState<number>(0);
    const handleChangeValues = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        if (name === "manualText") {
            const text = value.toString();
            setManualText(text);
            const parsed = parseManualProducts(text);
            setFormValue(v => ({ ...v, manualProducts: parsed }));
            return;
        }
        setFormValue({
            ...formValue,
            [name]: type === "checkbox" ? checked : value,
        });
    };
    const currency = useMemo(() => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }), []);

    // Derivar payment_method desde el primer método de pago
    const primaryPaymentMethod = useMemo(() => {
        const primary = formValue.payment_methods?.[0]?.method;
        return primary || formValue.payment_method;
    }, [formValue.payment_methods, formValue.payment_method]);

    // Derivar tax (0 si es EFECTIVO o NINGUNO)
    const effectiveTax = useMemo(() => {
        if (primaryPaymentMethod === "EFECTIVO" || primaryPaymentMethod === "NINGUNO") {
            return 0;
        }
        return formValue.tax;
    }, [primaryPaymentMethod, formValue.tax]);

    const resetForm = () => {
        setFormValue(prev => ({
            payment_method: "EFECTIVO",
            source: "CAJA",
            product_ids: [],
            total: 0,
            tax: 0,
            loadedManually: true,
            manualProducts: [],
            payment_methods: [{ method: "EFECTIVO", amount: 0 }],
            sale_date: prev.sale_date,
        }))
        setManualText("");
        setSelectedProducts([]);
        setSearchTitle("");
        setSelectValue(null);
        setManualInvalidCount(0);
    }

    useEffect(() => {
        if (updateSale.isSuccess) {
            onClose();
        }
    }, [updateSale.isSuccess, onClose])

    const productsSubtotal = useMemo(() => selectedProducts.reduce((acc, p) => acc + (typeof p.price === 'number' ? p.price : 0), 0), [selectedProducts]);
    const manualSubtotal = useMemo(() => (formValue.manualProducts || []).reduce((acc, item) => acc + Number(item.quantity) * Number(item.price), 0), [formValue.manualProducts]);
    const subtotal = formValue.loadedManually ? manualSubtotal : productsSubtotal;
    const finalTotal = subtotal * (1 + Number(effectiveTax) / 100);
    const paymentSum = (formValue.payment_methods || []).reduce((acc, pm) => acc + Number(pm.amount || 0), 0);

    const remainingBase = effectiveTax > 0 ? subtotal : finalTotal;
    const remainingAmount = Math.max(remainingBase - paymentSum, 0);
    const manualInvalid = useMemo(() => formValue.loadedManually && (manualInvalidCount > 0 || (formValue.manualProducts?.length || 0) === 0), [formValue.loadedManually, manualInvalidCount, formValue.manualProducts]);

    return (
        <Box>
            <Paper withBorder p="lg" radius="md" style={{ backgroundColor: '#fcfcfc' }}>
                <Stack gap="xl">
                    <Group justify="space-between">
                        <Group gap="xs">
                            {sale ? <FiEdit3 size={24} /> : <FiPlus size={24} />}
                            <Title order={3}>{sale ? 'Editar Venta' : 'Nueva Venta'}</Title>
                        </Group>
                        <SegmentedControl
                            value={formValue.loadedManually ? 'manual' : 'catalog'}
                            onChange={(value) => {
                                setFormValue(v => ({ ...v, loadedManually: value === 'manual' }));
                            }}
                            data={[
                                { label: 'Catálogo', value: 'catalog' },
                                { label: 'Manual', value: 'manual' },
                            ]}
                            size="sm"
                        />
                    </Group>

                    <Grid gutter="xl">
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <Stack gap="lg">
                                <Card withBorder shadow="sm" radius="md" p="md">
                                    <Stack gap="xs">
                                        <Group gap="xs" mb="xs">
                                            <FiCalendar />
                                            <Text fw={600} size="sm">Información General</Text>
                                        </Group>
                                        <DateInput
                                            label="Fecha de venta"
                                            value={saleDate}
                                            onChange={(value) => { 
                                                const v = value || null; 
                                                setSaleDate(v as Date | null); 
                                                setFormValue(s => ({ ...s, sale_date: v ? dayjs(v).format('YYYY-MM-DD') : undefined })); 
                                            }}
                                            locale="es"
                                            placeholder="Seleccionar fecha"
                                        />
                                    </Stack>
                                </Card>

                                <Card withBorder shadow="sm" radius="md" p="md">
                                    <Stack gap="sm">
                                        <Group justify="space-between">
                                            <Group gap="xs">
                                                <FiCreditCard  />
                                                <Text fw={600} size="sm">Métodos de Pago</Text>
                                            </Group>
                                            <Button 
                                                size="compact-xs" 
                                                variant="light" 
                                       
                                                leftSection={<FiPlus size={14} />}
                                                disabled={(formValue.payment_methods?.length || 0) >= 2}
                                                onClick={() => setFormValue(v => ({
                                                    ...v,
                                                    payment_methods: [
                                                        ...(v.payment_methods || []),
                                                        { method: "EFECTIVO", amount: 0 }
                                                    ]
                                                }))}
                                            >
                                                Agregar
                                            </Button>
                                        </Group>
                                        
                                        <Divider />
                                        
                                        <Stack gap="md">
                                            {(formValue.payment_methods || []).map((pm, idx) => (
                                                <Paper key={idx} withBorder p="xs" radius="sm" style={{ backgroundColor: '#fdfdfd' }}>
                                                    <Group align="flex-end" gap="xs">
                                                        <Select
                                                            label={`Método ${idx + 1}`}
                                                            style={{ flex: 1 }}
                                                            data={PaymentMethods.map(m => ({ value: m, label: m }))}
                                                            value={pm.method}
                                                            onChange={(value) => {
                                                                if (!value) return;
                                                                setFormValue(v => ({
                                                                    ...v,
                                                                    payment_methods: (v.payment_methods || []).map((x, i) => i === idx ? { ...x, method: value as PaymentMethods } : x)
                                                                }))
                                                            }}
                                                        />
                                                        <TextInput
                                                            label="Monto"
                                                            placeholder="0"
                                                            style={{ width: rem(120) }}
                                                            value={String(pm.amount ?? 0)}
                                                            onChange={(e) => {
                                                                const amount = Number(e.target.value || 0);
                                                                setFormValue(v => ({
                                                                    ...v,
                                                                    payment_methods: (v.payment_methods || []).map((x, i) => i === idx ? { ...x, amount: Number.isFinite(amount) ? amount : 0 } : x)
                                                                }))
                                                            }}
                                                        />
                                                        {(formValue.payment_methods || []).length > 1 && (
                                                            <ActionIcon 
                                                                color="red" 
                                                                variant="subtle" 
                                                                mb={4}
                                                                onClick={() => {
                                                                    setFormValue(v => ({
                                                                        ...v,
                                                                        payment_methods: (v.payment_methods || []).filter((_, i) => i !== idx)
                                                                    }))
                                                                }}
                                                            >
                                                                <FiTrash />
                                                            </ActionIcon>
                                                        )}
                                                    </Group>
                                                </Paper>
                                            ))}
                                            
                                            {remainingAmount > 0 && ((formValue.payment_methods?.length || 0) > 1) && (
                                                <Badge color="orange" variant="light" py="md" style={{ width: '100%' }}>
                                                    Faltan {currency.format(remainingAmount)} {effectiveTax > 0 ? "(sobre base)" : ""}
                                                </Badge>
                                            )}
                                        </Stack>
                                    </Stack>
                                </Card>
                            </Stack>
                        </Grid.Col>

                        {/* Panel Derecho: Productos */}
                        <Grid.Col span={{ base: 12, md: 8 }}>
                            <Stack gap="lg" h="100%">
                                <Card withBorder shadow="sm" radius="md" p="md" style={{ flex: 1 }}>
                                    {!formValue.loadedManually ? (
                                        <Stack gap="md" h="100%">
                                            <Group gap="xs">
                                                <FiShoppingCart />
                                                <Text fw={600} size="sm">Selección de Productos</Text>
                                            </Group>
                                            
                                            <Select
                                                placeholder={isLoading ? "Cargando productos..." : "Buscar por nombre..."}
                                                data={productsOptions}
                                                searchable
                                                leftSection={isLoading ? <Loader size="xs" /> : <FiList />}
                                                searchValue={searchTitle}
                                                onSearchChange={setSearchTitle}
                                                value={selectValue}
                                                onChange={(value) => {
                                                    addProductById(value);
                                                    setSelectValue(null);
                                                    setSearchTitle("");
                                                }}
                                                withCheckIcon={false}
                                            />

                                            <Paper withBorder radius="md" p="sm" style={{ backgroundColor: '#f8f9fa', flex: 1, minHeight: rem(200) }}>
                                                <Group justify="space-between" mb="sm">
                                                    <Text size="sm" fw={600} c="dimmed">Items Seleccionados</Text>
                                                    <Badge variant="filled">{selectedProducts.length}</Badge>
                                                </Group>
                                                
                                                <Stack gap="xs" style={{ maxHeight: rem(400), overflowY: 'auto' }}>
                                                    {selectedProducts.length === 0 ? (
                                                        <Stack align="center" gap="xs" py="xl">
                                                            <FiShoppingCart size={40} color="var(--mantine-color-gray-4)" />
                                                            <Text c="dimmed" size="sm">No hay productos seleccionados</Text>
                                                        </Stack>
                                                    ) : (
                                                        selectedProducts.map(p => (
                                                            <Paper key={p.id} withBorder p="xs" radius="sm" shadow="xs">
                                                                <Group justify="space-between">
                                                                    <Group gap="sm">
                                                                        <Badge color="green" variant="light" size="lg" radius="sm">
                                                                            {currency.format(typeof p.price === 'number' ? p.price : 0)}
                                                                        </Badge>
                                                                        <Text size="sm" fw={500}>{p.title}</Text>
                                                                    </Group>
                                                                    <ActionIcon color="red" variant="subtle" onClick={() => removeProduct(p.id)}>
                                                                        <FiTrash />
                                                                    </ActionIcon>
                                                                </Group>
                                                            </Paper>
                                                        ))
                                                    )}
                                                </Stack>
                                            </Paper>
                                        </Stack>
                                    ) : (
                                        <Stack gap="md" h="100%">
                                            <Stack gap={2}>
                                                <Group gap="xs">
                                                    <FiList  />
                                                    <Text fw={600} size="sm">Carga Manual</Text>
                                                </Group>
                                                <Text size="xs" c="dimmed">Formato: &quot;CANTIDAD PRODUCTO PRECIO&quot; por línea</Text>
                                            </Stack>
                                            
                                            <Textarea
                                                placeholder='Ej: "2 Labial Mate 3500"'
                                                name="manualText"
                                                value={manualText}
                                                autosize
                                                minRows={10}
                                                styles={{
                                                    input: {
                                                        fontFamily: 'monospace',
                                                        fontSize: rem(13),
                                                        backgroundColor: '#fafafa'
                                                    }
                                                }}
                                                onChange={handleChangeValues}
                                            />
                                            {manualInvalid && (
                                                <Badge color="red" variant="light" fullWidth py="md">
                                                    Formato inválido o lista vacía
                                                </Badge>
                                            )}
                                        </Stack>
                                    )}
                                </Card>
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    <Divider />

                    <Grid align="center">
                        <Grid.Col span={{ base: 12, md: 8 }}>
                            <Group gap="xl">
                                {["TARJETA", "QR", "TRANSFERENCIA"].includes(primaryPaymentMethod) && (
                                    <TextInput
                                        label="Impuesto (%)"
                                        placeholder="0"
                                        style={{ width: rem(120) }}
                                        name="tax"
                                        value={formValue.tax}
                                        onChange={handleChangeValues}
                                    />
                                )}
                                
                                <Group gap="lg">
                                    <Stack gap={0}>
                                        <Text size="xs" c="dimmed" fw={600}>SUBTOTAL</Text>
                                        <Text size="lg" fw={600}>{currency.format(subtotal)}</Text>
                                    </Stack>
                                    
                                    {effectiveTax > 0 && (
                                        <Stack gap={0}>
                                            <Text size="xs" c="dimmed" fw={600}>IMPUESTO ({effectiveTax}%)</Text>
                                            <Text size="lg" fw={600} c="orange">{currency.format(Number(subtotal) * Number(effectiveTax) / 100)}</Text>
                                        </Stack>
                                    )}

                                    <Stack gap={0}>
                                        <Text size="xs" c="dimmed" fw={600}>TOTAL FINAL</Text>
                                        <Title order={2}>{currency.format(finalTotal)}</Title>
                                    </Stack>
                                </Group>
                            </Group>
                        </Grid.Col>
                        
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <Button
                                fullWidth
                                size="lg"
                                leftSection={<FiSave />}
                                disabled={(sale ? updateSale.isPending : false) || manualInvalid}
                                loading={sale ? updateSale.isPending : false}
                                onClick={() => {
                                    const payload = { 
                                        ...formValue, 
                                        total: finalTotal, 
                                        tax: effectiveTax,
                                        payment_method: primaryPaymentMethod 
                                    };
                                    if (sale) {
                                        updateSale.mutate({ id: sale.id, request: payload });
                                    } else {
                                        showNotification({
                                            message: "Guardando venta en segundo plano...",
                                            color: "blue",
                                        });
                                        saveSale.mutate(payload);
                                        resetForm();
                                    }
                                }}
                            >
                                {sale ? 'Guardar Cambios' : 'Confirmar Venta'}
                            </Button>
                        </Grid.Col>
                    </Grid>
                </Stack>
            </Paper>
        </Box>
    );
}

