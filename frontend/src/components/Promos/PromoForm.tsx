import { useEffect, useState, useMemo, useCallback } from "react"
import type { PromoRequest, Promo } from "../Api/PromoApi"
import { PromoTypes, useSubmitPromo, useUpdatePromo } from "../Api/PromoApi"
import {
    Box,
    Button,
    Grid,
    Group,
    Image,
    Stack,
    TextInput,
    NumberInput,
    Select,
    MultiSelect,
    Switch,
    Text,
    Paper,
    Divider,
    FileInput,
    rem,
    Loader,
    Container,
    Textarea
} from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import { MdUpload, MdPhoto, MdCalendarToday } from "react-icons/md"
import { useDebouncedValue } from "@mantine/hooks"
import {
    useGetAllCategories
} from "@/components/Api/CategoriesApi"
import { useGetAllProducts, type GetProductsParams } from "@/components/Api/ProductsApi"
import { useCombobox } from "@mantine/core"
import { showNotification } from "@mantine/notifications"

export interface PromoFormProps {
    onClose: () => void
    promo?: Promo | null
}

const getInitialFormValues = (promo?: Promo | null): PromoRequest => ({
    code: promo?.code || "",
    title: promo?.title || "",
    description: promo?.description || "",
    type: promo?.type === 'fixed' ? PromoTypes.FIXED : PromoTypes.PERCENTAGE,
    value: Number(promo?.value || 0),
    max_discount: promo?.max_discount ?? 0,
    min_order_amount: promo?.min_order_amount ?? 0,
    start_date: promo?.start_date ? String(promo.start_date).split('T')[0] : "",
    end_date: promo?.end_date ? String(promo.end_date).split('T')[0] : "",
    is_active: !!promo?.is_active,
    usage_limit: promo?.usage_limit ?? 0,
    usage_count: promo?.usage_count ?? 0,
    show_in_home: !!promo?.show_in_home,
    per_user_limit: promo?.per_user_limit ?? 0,
    categories: (promo?.categories || []).map((c: any) => c.id),
    products: (promo?.products || []).map((p: any) => p.id),
});

const getInitialDateRange = (promo?: Promo | null): [Date | string | null, Date | string | null] => [
    promo?.start_date ? new Date(promo.start_date as any) : null,
    promo?.end_date ? new Date(promo.end_date as any) : null,
];

export function PromoForm({ onClose, promo }: PromoFormProps) {
    const [formValues, setFormValues] = useState<PromoRequest>(() => getInitialFormValues(promo))

    const [image, setImage] = useState<File | null>(null)
    const [dateRange, setDateRange] = useState<[Date | string | null, Date | string | null]>(() => getInitialDateRange(promo))

    const [productSearch, setProductSearch] = useState<string>("")
    const [debouncedProductSearch] = useDebouncedValue(productSearch, 300)

    const productCombobox = useCombobox()
    
    const submitPromo = useSubmitPromo()
    const updatePromo = useUpdatePromo()

    const handleChange = (field: keyof PromoRequest, value: any) => {
        setFormValues({
            ...formValues,
            [field]: value,
        })
    }

    const normalizeDate = (v: Date | string | null) => {
        if (!v) return ""
        if (v instanceof Date) return v.toISOString().split("T")[0]
        return v
    }

    const handleDateRangeChange = (dates: [Date | string | null, Date | string | null]) => {
        setDateRange(dates)

        setFormValues((prev) => ({
            ...prev,
            start_date: normalizeDate(dates[0]),
            end_date: normalizeDate(dates[1]),
        }))
    }

    const handleImageChange = (file: File | null) => {
        setImage(file)
    }

    const promoTypeOptions = [
        { value: PromoTypes.PERCENTAGE, label: 'Porcentaje (%)' },
        { value: PromoTypes.FIXED, label: 'Monto Fijo ($)' }
    ]

    const { data: categories, isLoading: categoriesLoading } = useGetAllCategories()

    const productSearchParams: GetProductsParams = useMemo(() => ({
        page: 1,
        limit: 10,
        state: 'active',
        title: debouncedProductSearch || undefined,
        isActive: true
    }), [debouncedProductSearch])

    const { data: products, isLoading: productsLoading } = useGetAllProducts(productSearchParams)

    const categoryOptions = categories?.categories?.map((cat: any) => ({
        value: cat.id,
        label: cat.title
    })) || []

    const productOptions = useMemo(() =>
        products?.products?.map((product: any) => ({
            value: product.id,
            label: product.title
        })) || [], [products?.products]
    )

    const handleCategoryChange = (selectedIds: string[]) => {
        handleChange('categories', selectedIds)
    }

    const handleProductChange = (selectedIds: string[]) => {
        handleChange('products', selectedIds)
    }

    const handleProductSearchChange = useCallback((searchValue: string) => {
        setProductSearch(searchValue)
    }, [productCombobox])

    useEffect(() => {
        if (productSearch) {
            productCombobox.openDropdown()
            productCombobox.updateSelectedOptionIndex()
            productCombobox.focusTarget()
        }
    }, [productsLoading, products?.products, productSearch])

    const handleSubmit = async () => {
        
        if (!formValues.title || !formValues.type || !formValues.value) {
            return showNotification({
                color: "red",
                message: "Por favor, complete todos los campos requeridos.",
                autoClose: 3000,

            })
        }

        if (formValues.value <= 0) {
            return showNotification({
                color: "red",
                title: "Valor inválido",
                message: "El valor del porcentaje o descuento debe ser mayor a 0.",
                autoClose: 3000,
            })
        }

        if (formValues.show_in_home && !image) {
            return showNotification({
                color: "red",
                title: "Imagen requerida para promociones en la página principal",
                message: "Por favor, suba una imagen para la promoción.",
                autoClose: 3000,
            })
        }
        
        if (promo?.id) {
            await updatePromo.mutateAsync({
                id: promo.id,
                values: formValues,
                image: image || undefined,
            })
            if (updatePromo.isSuccess) return onClose()
        } else {
            await submitPromo.mutateAsync({
                values: formValues,
                image : image || undefined,
            })
            if (submitPromo.isSuccess) return onClose()
        }
    }

    return (
        <Container size="xl" p={0}>
            <Paper shadow="sm" p="xl" radius="md">
                <Text size="xl" fw={600} mb="lg">{promo ? "Editar Promoción" : "Crear Nueva Promoción"}</Text>

                <Stack gap="lg">
                    <Box>
                        <Text size="lg" fw={500} mb="md" >Información Básica</Text>
                        <Grid gutter="md">
                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <TextInput
                                    label="Código de Promoción"
                                    placeholder="Ej: DESCUENTO20"
                                    value={formValues.code}
                                    onChange={(e) => handleChange('code', e.target.value)}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <TextInput
                                    label="Título"
                                    placeholder="Nombre de la promoción"
                                    value={formValues.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    required
                                />
                            </Grid.Col>
                            <Grid.Col span={12}>
                                <Textarea
                                    label="Descripción (opcional)"
                                    rows={4}
                                    placeholder="Describe los detalles de la promoción"
                                    value={formValues.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                />
                            </Grid.Col>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Configuración del Descuento */}
                    <Box>
                        <Text size="lg" fw={500} mb="md" >Configuración del Descuento</Text>
                        <Grid gutter="md">
                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                <Select
                                    label="Tipo de Descuento"
                                    data={promoTypeOptions}
                                    value={formValues.type}
                                    onChange={(value) => handleChange('type', value)}
                                    required
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                <NumberInput
                                    label={formValues.type === PromoTypes.PERCENTAGE ? "Porcentaje (%)" : "Monto Fijo ($)"}
                                    placeholder="0"
                                    value={formValues.value}
                                    onChange={(value) => handleChange('value', value || 0)}
                                    min={0}
                                    max={formValues.type === PromoTypes.PERCENTAGE ? 100 : undefined}
                                    required
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                <NumberInput
                                    label="Descuento Máximo ($)"
                                    placeholder="0"
                                    value={formValues.max_discount}
                                    onChange={(value) => handleChange('max_discount', value || 0)}
                                    min={0}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <NumberInput
                                    label="Monto Mínimo de Orden ($)"
                                    placeholder="0"
                                    value={formValues.min_order_amount}
                                    onChange={(value) => handleChange('min_order_amount', value || 0)}
                                    min={0}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6 }}>

                            </Grid.Col>

                            <Text
                                c={"red"}
                                size="xs"
                            >
                                *Nota*: Si no se selecciona ningún producto, la promoción se aplicará a todos los productos, lo mismo para las categorias.
                            </Text>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <MultiSelect
                                    label="Categorías Aplicables"
                                    placeholder="Selecciona categorías"
                                    data={categoryOptions}
                                    value={formValues.categories}
                                    onChange={handleCategoryChange}
                                    searchable
                                    clearable
                                    disabled={categoriesLoading}
                                    description="Deja vacío para aplicar a todas las categorías"
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <MultiSelect
                                    label="Productos Específicos"
                                    placeholder="Busca y selecciona productos"
                                    data={productOptions}
                                    value={formValues.products}
                                    onChange={handleProductChange}
                                    searchable
                                    searchValue={productSearch}
                                    clearable
                                    description="Escribe para buscar productos en la base de datos"
                                    onSearchChange={handleProductSearchChange}
                                    rightSection={productsLoading ? <Loader size="xs" /> : null}
                                    limit={100}
                                    maxDropdownHeight={300}
                                    nothingFoundMessage={productSearch && !productsLoading ? "No se encontraron productos" : "Escribe para buscar productos"}
                                    dropdownOpened={productCombobox.dropdownOpened}
                                    onDropdownOpen={() => productCombobox.openDropdown()}
                                    onDropdownClose={() => productCombobox.closeDropdown()}
                                    comboboxProps={{ store: productCombobox, withinPortal: true }}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 12, md: 4 }}>
                                <Switch
                                    label="Mostrar en la página principal"
                                    checked={formValues.show_in_home}
                                    onChange={(event) => handleChange('show_in_home', event.currentTarget.checked)}
                                    mt="md"
                                />
                            </Grid.Col>
                        </Grid>
                    </Box>

                    <Divider />

                    <Box>
                        <Text size="lg" fw={500} mb="md" >Período de Vigencia</Text>
                        <Grid gutter="md">
                            <Grid.Col span={12}>
                                <DatePickerInput
                                    type="range"
                                    label="Fechas de Inicio y Fin"
                                    placeholder="Selecciona el rango de fechas"
                                    value={dateRange}
                                    onChange={handleDateRangeChange}
                                    leftSection={<MdCalendarToday style={{ width: rem(18), height: rem(18) }} />}
                                    clearable
                                />
                            </Grid.Col>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Límites de Uso */}
                    <Box>
                        <Text size="lg" fw={500} mb="md" >Límites de Uso</Text>
                        <Grid gutter="md">
                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                <NumberInput
                                    label="Límite Total de Usos"
                                    placeholder="0 = Sin límite"
                                    value={formValues.usage_limit}
                                    onChange={(value) => handleChange('usage_limit', value || 0)}
                                    min={0}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                <NumberInput
                                    label="Límite por Usuario"
                                    placeholder="0 = Sin límite"
                                    value={formValues.per_user_limit}
                                    onChange={(value) => handleChange('per_user_limit', value || 0)}
                                    min={0}
                                />
                            </Grid.Col>

                        </Grid>
                    </Box>

                    <Divider />

                    <Box>
                        <Text size="lg" fw={500} mb="md" >Imagen de la Promoción</Text>
                        <Grid gutter="md">
                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                <FileInput
                                    label="Subir Imagen"
                                    placeholder="Selecciona una imagen"
                                    leftSection={<MdUpload style={{ width: rem(18), height: rem(18) }} />}
                                    accept="image/*"
                                    value={image}
                                    required={formValues.show_in_home}
                                    onChange={handleImageChange}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                {(image || promo?.image) && (
                                    <Box>
                                        <Text size="sm" mb="xs">Vista Previa:</Text>
                                        <Group gap="sm">
                                            <Image
                                                src={image ? URL.createObjectURL(image) : (promo?.image || "")}
                                                alt="Vista previa"
                                                w={120}
                                                h={120}
                                                radius="md"
                                                fit="cover"
                                            />
                                            <Button
                                                size="xs"
                                                variant="light"
                                                color="red"
                                                onClick={() => setImage(null)}
                                                leftSection={<MdPhoto style={{ width: rem(14), height: rem(14) }} />}
                                            >
                                                Eliminar
                                            </Button>
                                        </Group>
                                    </Box>
                                )}
                            </Grid.Col>
                        </Grid>
                    </Box>

                    <Divider />

                    <Group justify="flex-end" mt="xl">
                        <Button variant="light" onClick={onClose} disabled={submitPromo.isPending}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSubmit}
                            loading={promo ? updatePromo.isPending : submitPromo.isPending}
                            disabled={promo ? updatePromo.isPending : submitPromo.isPending}
                        >
                            {promo ? "Guardar cambios" : "Crear Promoción"}
                        </Button>
                    </Group>
                </Stack>
            </Paper>
        </Container>
    )
}

