import { Box, Grid, Text, Select, Card, Group, Stack, Badge, ActionIcon, Divider, Paper, Loader, Button, TextInput, Switch, Textarea } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { showNotification } from "@mantine/notifications";
import dayjs from "dayjs";
import { useState, useMemo, useEffect } from "react";
import { FiTrash, FiShoppingCart } from "react-icons/fi";
import { useGetAllProducts, type GetProductsParams, type Product } from "@/components/Api/ProductsApi";
import { useSaveSale, useUpdateSale } from "../Api/SalesApi";
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
    options?: any;
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
    items?: { product_id: string; quantity: number; options?: any }[]
    sale_date?: string
}

type Props = {
    onClose: () => void,
    sale?: Sales
}

const formatDateOnly = (d: unknown) => {
    const m = dayjs(d as any);
    return m.isValid() ? m.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
};

const getInitialFormValue = (sale?: Sales): SaleRequest => {
    if (sale) {
        const pm = Array.isArray((sale as any).paymentMethods) ? (sale as any).paymentMethods : [];
        return {
            payment_method: sale.payment_method,
            source: sale.source,
            product_ids: (sale.products || []).map(p => p.id),
            tax: Number(sale.tax) || 0,
            loadedManually: !!sale.loadedManually,
            manualProducts: (sale.manualProducts || []) as any,
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
        return sale.products as any;
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
    }, [updateSale.isSuccess])

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

            <Paper withBorder p="md" radius="md">
                <Switch
                    label="Cargar manualmente"
                    name="loadedManually"
                    checked={formValue.loadedManually}
                    onChange={handleChangeValues}
                />
                <Grid gutter={16}>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <DateInput
                            label="Fecha de venta"
                            value={saleDate}
                            onChange={(value) => { const v = value || null; setSaleDate(v as Date | null); setFormValue(s => ({ ...s, sale_date: v ? dayjs(v).format('YYYY-MM-DD') : undefined })); }}
                            locale="es"
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        {!formValue.loadedManually ? (
                            <Stack gap="sm">
                                <Select
                                    label="Productos"
                                    name="product_ids"
                                    placeholder={isLoading ? "Cargando productos..." : "Buscar y seleccionar"}
                                    data={productsOptions}
                                    searchable
                                    leftSection={isLoading && <Loader size={"xs"} />}
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

                                <Card withBorder shadow="sm" radius="md">
                                    <Group justify="space-between" mb="xs">
                                        <Group>
                                            <FiShoppingCart />
                                            <Text fw={500}>Seleccionados</Text>
                                        </Group>
                                        <Badge color="blue" variant="light">{selectedProducts.length}</Badge>
                                    </Group>
                                    <Divider my="sm" />
                                    <Stack gap="xs">
                                        {selectedProducts.length === 0 ? (
                                            <Text c="dimmed">No hay productos seleccionados</Text>
                                        ) : (
                                            selectedProducts.map(p => (
                                                <Group key={p.id} justify="space-between">
                                                    <Group gap="xs">
                                                        <Badge color="green" variant="light">{currency.format(typeof p.price === 'number' ? p.price : 0)}</Badge>
                                                        <Text>{p.title}</Text>
                                                    </Group>
                                                    <ActionIcon color="red" variant="light" aria-label="Eliminar" onClick={() => removeProduct(p.id)}>
                                                        <FiTrash />
                                                    </ActionIcon>
                                                </Group>
                                            ))
                                        )}
                                    </Stack>
                                </Card>
                            </Stack>
                        ) : (
                            <Stack gap="xs">
                                <Textarea
                                    label="Productos manuales"
                                    placeholder='Formato: "CANTIDAD PRODUCTO PRECIO" por línea. Ej: "1 gloss 1500"'
                                    name="manualText"
                                    value={manualText}
                                    autosize
                                    minRows={3}
                                    maxRows={40}
                                    onChange={handleChangeValues}
                                />
                                {manualInvalid && (
                                    <Text c="red" size="sm">Hay productos con formato inválido o vacío. Corrige antes de guardar.</Text>
                                )}
                            </Stack>
                        )}

                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="sm">
                            <Card withBorder shadow="sm" radius="md">
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text fw={500}>Métodos de pago (máx. 2)</Text>
                                        <Button size="xs" variant="light" disabled={(formValue.payment_methods?.length || 0) >= 2}
                                            onClick={() => setFormValue(v => ({
                                                ...v,
                                                payment_methods: [
                                                    ...(v.payment_methods || []),
                                                    { method: "EFECTIVO", amount: 0 }
                                                ]
                                            }))}
                                        >Agregar método</Button>
                                    </Group>
                                    <Divider my="xs" />
                                    {(formValue.payment_methods || []).map((pm, idx) => (
                                        <Group key={idx} align="end" justify="space-between">
                                            <Select
                                                label={`Método ${idx + 1}`}
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
                                                <ActionIcon color="red" variant="light" aria-label="Eliminar" onClick={() => {
                                                    setFormValue(v => ({
                                                        ...v,
                                                        payment_methods: (v.payment_methods || []).filter((_, i) => i !== idx)
                                                    }))
                                                }}>
                                                    <FiTrash />
                                                </ActionIcon>
                                            )}
                                        </Group>
                                    ))}
                                    {/* {paymentMismatch && (
                                        <Text c="red">Advertencia: la suma de los métodos de pago ({currency.format(paymentSum)}) no coincide con el total ({currency.format(finalTotal)}).</Text>
                                    )} */}
                                    {remainingAmount > 0 && ((formValue.payment_methods?.length || 0) > 1) && (
                                        <Text c="orange">Faltan {currency.format(remainingAmount)} {effectiveTax > 0 ? "(calculado sobre subtotal sin impuesto)" : ""}</Text>
                                    )}
                                </Stack>
                            </Card>
                            {["TARJETA", "QR", "TRANSFERENCIA"].includes(primaryPaymentMethod) && (
                                <TextInput
                                    label="Agregar impuesto"
                                    placeholder="Ingresar impuesto"
                                    name="tax"
                                    value={formValue.tax}
                                    onChange={handleChangeValues}
                                />
                            )}
                            <Card withBorder shadow="sm" radius="md">
                                {effectiveTax > 0 && (
                                    <Group justify="space-between">
                                        <Text>Impuesto ({effectiveTax}%)</Text>
                                        <Text>{currency.format(Number(subtotal) * Number(effectiveTax) / 100)}</Text>
                                    </Group>
                                )}
                                <Group justify="space-between">
                                    <Text fw={500}>Total</Text>
                                    <Text fw={700}>{currency.format(finalTotal)}</Text>
                                </Group>
                            </Card>
                        </Stack>
                    </Grid.Col>
                    <Button
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
                    >{sale ? 'Guardar cambios' : 'Guardar venta'}</Button>
                </Grid>
            </Paper>
        </Box>
    )
}

