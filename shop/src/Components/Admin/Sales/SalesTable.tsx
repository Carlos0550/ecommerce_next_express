import { Box, Paper, Table, Text, Loader, Group, Button, Badge, Stack, ScrollArea, SegmentedControl, Checkbox, Textarea, ActionIcon, SimpleGrid, Skeleton, Divider } from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import { LineChart } from "@mui/x-charts"
import { useMediaQuery } from "@mantine/hooks"
import { theme } from "@/theme"
import { useGetSales, useProcessSale, useGetSaleReceipt, useDeclineSale, useDeleteSale, useGetSalesAnalytics } from "@/hooks/useAdminSales"
import type { PaymentMethods, SaleSource, ManualProductItem } from "./SalesForm"
import ModalWrapper from "@/Components/Admin/Common/ModalWrapper"
import React, { useMemo, useState } from "react"
import { SalesForm } from "./SalesForm"
import { FiEdit, FiTrash, FiShoppingCart, FiInfo, FiTrash2, FiUsers, FiDollarSign, FiTrendingUp, FiArrowLeft, FiArrowRight } from "react-icons/fi"
import dayjs from "dayjs"
import { capitalizeTexts } from "@/utils/constants"
import type { AdminProduct } from "@/stores/useAdminStore";
export type SaleItemOption = { name: string; value?: string; values?: string[] }
export type SaleItem = { id: string; title: string; price: number; quantity: number; options?: SaleItemOption[] }
export type Sales = {
  id: string,
  created_at: string,
  payment_method: PaymentMethods
  source: SaleSource
  tax: number,
  total: number,
  user?: {
    id?: string,
    name?: string,
    email?: string,
  } | null,
  orders?: { buyer_name?: string; buyer_email?: string; buyer_phone?: string }[],
  products: AdminProduct[],
  manualProducts?: ManualProductItem[],
  items?: SaleItem[],
  loadedManually?: boolean,
  processed?: boolean
  declined?: boolean
}
export default function SalesTable() {
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(5)
  const [preset, setPreset] = useState<string>("HOY")
  const [range, setRange] = useState<[Date | null, Date | null]>([null, null])
  const startEndFromPreset = useMemo(() => {
    const today = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 0, 0, 0, 0)
    switch (preset) {
      case "AYER": {
        const y = addDays(today, -1); return { start: startOfDay(y), end: endOfDay(y) }
      }
      case "ULTIMOS_3": {
        const s = addDays(today, -2); return { start: startOfDay(s), end: endOfDay(today) }
      }
      case "ULTIMOS_7": {
        const s = addDays(today, -6); return { start: startOfDay(s), end: endOfDay(today) }
      }
      case "MES": {
        const s = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0); const e = endOfDay(today); return { start: s, end: e }
      }
      case "PERSONALIZADO": {
        const [s, e] = range;
        const start = s instanceof Date ? s : (s ? new Date(s as unknown as string) : startOfDay(today));
        const end = e instanceof Date ? e : (e ? new Date(e as unknown as string) : endOfDay(today));
        return { start, end }
      }
      case "HOY":
      default: {
        return { start: startOfDay(today), end: endOfDay(today) }
      }
    }
  }, [preset, range])
  const toDateOnly = (d: unknown) => {
    if (!d) return undefined;
    const date = d instanceof Date ? d : new Date(d as unknown as string);
    if (isNaN(date.getTime())) return undefined;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const start_date = toDateOnly(startEndFromPreset.start)
  const end_date = toDateOnly(startEndFromPreset.end)
  const [pendingOnly, setPendingOnly] = useState<boolean>(false)
  const { data, isLoading } = useGetSales(currentPage, perPage, start_date, end_date, pendingOnly)
  const { data: analytics, isLoading: isLoadingAnalytics } = useGetSalesAnalytics(start_date, end_date)
  const processSaleMutation = useProcessSale()
  const getReceiptMutation = useGetSaleReceipt()
  const declineSaleMutation = useDeclineSale()
  const deleteSaleMutation = useDeleteSale()
  const [receiptOpen, setReceiptOpen] = useState<boolean>(false)
  const [receiptUrl, setReceiptUrl] = useState<string>("")
  const openReceipt = (saleId: string) => {
    getReceiptMutation.mutate(saleId, {
      onSuccess: (response: { url?: string } | string) => {
        const url = typeof response === 'string' ? response : response?.url;
        if (url) {
            setReceiptUrl(url);
            setReceiptOpen(true);
        } else {
            console.warn("Valid response but no URL", response);
        }
      },
      onError: () => {
        setReceiptUrl("");
        setReceiptOpen(false);
      }
    });
  }
  const sales: Sales[] = (data?.sales as unknown as Sales[]) ?? []
  const pagination = data?.pagination as {
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean,
  } | undefined;
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints?.sm || '768px'})`)
  const currency = useMemo(() => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }), [])
  const [viewProductsOpen, setViewProductsOpen] = useState<boolean>(false)
  const [selectedSale, setSelectedSale] = useState<Sales | null>(null)
  const [viewBuyerOpen, setViewBuyerOpen] = useState<boolean>(false)
  const [buyerSale, setBuyerSale] = useState<Sales | null>(null)
  const [editOpen, setEditOpen] = useState<boolean>(false)
  const [editSale, setEditSale] = useState<Sales | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const handlePresetChange = (value: string) => {
    setPreset(value)
    setCurrentPage(1)
  }
  const handleRangeChange = (value: [Date | null, Date | null]) => {
    setRange(value)
    setCurrentPage(1)
  }
  const openProducts = (sale: Sales) => {
    setSelectedSale(sale)
    setViewProductsOpen(true)
  }
  const closeProducts = () => {
    setViewProductsOpen(false)
    setSelectedSale(null)
  }
  const openBuyer = (sale: Sales) => {
    setBuyerSale(sale)
    setViewBuyerOpen(true)
  }
  const closeBuyer = () => {
    setViewBuyerOpen(false)
    setBuyerSale(null)
  }
  const formatDate = (value?: string) => {
    if (!value) return "—"
    const d = new Date(value)
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString('es-AR')
  }
  const [declineModalOpen, setDeclineModalOpen] = useState(false)
  const [saleToDecline, setSaleToDecline] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState("")
  const handleDeclineSale = (saleId: string) => {
    setSaleToDecline(saleId)
    setDeclineReason("")
    setDeclineModalOpen(true)
  }
  const confirmDecline = () => {
    if (!saleToDecline || !declineReason.trim()) return
    declineSaleMutation.mutate(
      { saleId: saleToDecline, reason: declineReason },
      {
        onSuccess: () => {
          setDeclineModalOpen(false)
          setSaleToDecline(null)
          setDeclineReason("")
        }
      }
    );
  }
  const renderActionButtons = (sale: Sales) => {
    return (
      <Group gap="xs" wrap="nowrap">
        <ActionIcon variant="light" color="blue" onClick={() => openProducts(sale)} title="Ver productos">
           <FiShoppingCart size={16} />
        </ActionIcon>
        {sale.source === 'WEB' && (
          <React.Fragment>
            {processSaleMutation.isPending ? (
              <Loader size={"xs"} type="bars" />
            ) : (
              <Checkbox 
                disabled={sale.processed || processSaleMutation.isPending || sale.declined} 
                size="xs" 
                checked={sale.processed!}
                onChange={() => processSaleMutation.mutate(sale.id)}
                title="Marcar como procesada"
              />
            )}
            <ActionIcon 
                disabled={getReceiptMutation.isPending} 
                loading={getReceiptMutation.isPending} 
                variant="light" 
                color="teal" 
                onClick={() => openReceipt(sale.id)}
                title="Ver comprobante"
            >
                <FiInfo size={16} />
            </ActionIcon>
            <ActionIcon 
              variant="light" 
              color="orange"
              disabled={sale.processed || sale.declined}
              onClick={() => handleDeclineSale(sale.id)}
              title="Declinar venta"
            >
                <FiTrash2 size={16} />
            </ActionIcon>
          </React.Fragment>
        )}
        <ActionIcon variant="light" color="indigo" onClick={() => openBuyer(sale)} title="Ver comprador">
            <FiUsers size={16} />
        </ActionIcon>
        {sale.source !== 'WEB' && (
          <ActionIcon variant="light" color="gray" onClick={() => { setEditSale(sale); setEditOpen(true); }} title="Editar">
             <FiEdit size={16} />
          </ActionIcon>
        )}
        <ActionIcon color="red" variant="light" aria-label="Eliminar"
          onClick={() => { setDeletingId(sale.id); deleteSaleMutation.mutate(sale.id, { onSettled: () => setDeletingId(null) }); }}
          loading={deleteSaleMutation.isPending && deletingId === sale.id}
          disabled={deleteSaleMutation.isPending && deletingId === sale.id}
          title="Eliminar registro"
        >
          <FiTrash size={16} />
        </ActionIcon>
      </Group>
    )
  }
  const renderStatusBadge = (sale: Sales) => {
    if (sale.source === "WEB") {
      if (sale.processed) return <Badge color="green" variant="dot">Procesada</Badge>
      if (sale.declined) return <Badge color="red" variant="dot">Declinada</Badge>
      return <Badge color="yellow" variant="dot">Pendiente</Badge>
    }
    return <Badge color="gray" variant="dot">Manual</Badge>
  }
  const chartData = useMemo(() => {
    if (!analytics?.timeseries?.by_day) return []
    return analytics.timeseries.by_day.map((point: { date: string; revenue: number }) => ({
        date: dayjs(point.date).format('DD MMM'),
        ventas: point.revenue
    }))
  }, [analytics])
  const totalToday = useMemo(() => data?.totalSalesByDate || 0, [data?.totalSalesByDate])
  return (
    <Box>
      {}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl" spacing="lg">
        <Paper withBorder p="md" radius="md" bg="rose.6" c="white">
            <Group justify="space-between" mb="xs">
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase', opacity: 0.9 }}>Ingresos Totales</Text>
                <FiDollarSign size={20} />
            </Group>
            {isLoadingAnalytics ? <Skeleton h={40} mt="sm" /> : (
                <Stack gap={0}>
                    <Text fz="24px" fw={800}>{currency.format(analytics?.totals.revenue_total || 0)}</Text>
                    <Text size="xs" fw={500} style={{ opacity: 0.8 }}>En el periodo seleccionado</Text>
                </Stack>
            )}
        </Paper>
        <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="xs">
                <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>Vendido Hoy</Text>
                <Box p={8} bg="blue.0" style={{ borderRadius: '8px' }}>
                    <FiTrendingUp size={18} color="var(--mantine-color-blue-6)" />
                </Box>
            </Group>
            <Stack gap={0}>
                <Text fz="24px" fw={800}>{currency.format(totalToday)}</Text>
                <Text size="xs" c="dimmed">Ingresos brutos de hoy</Text>
            </Stack>
        </Paper>
        <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="xs">
                <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>Ventas Totales</Text>
                <Box p={8} bg="teal.0" style={{ borderRadius: '8px' }}>
                    <FiShoppingCart size={18} color="var(--mantine-color-teal-6)" />
                </Box>
            </Group>
             <Stack gap={0}>
                <Text fz="24px" fw={800}>{analytics?.totals.sales_count || 0}</Text>
                <Text size="xs" c="dimmed">Cantidad de pedidos realizados</Text>
            </Stack>
        </Paper>
      </SimpleGrid>
      {}
      {!isMobile && (preset === "ULTIMOS_7" || preset === "MES") && analytics?.timeseries?.by_day && analytics.timeseries.by_day.length >= 1 && (
        <Paper withBorder p="xl" radius="md" mb="xl">
            <Text fw={700} mb="lg">Tendencia de Ingresos</Text>
            <Box h={220}>
                <LineChart
                    xAxis={[{
                        data: chartData.map((_: { date: string; ventas: number }, i: number) => i),
                        scaleType: "point",
                        valueFormatter: (value: number) => chartData[value]?.date || "",
                    }]}
                    series={[{
                        data: chartData.map((d: { ventas: number }) => d.ventas),
                        area: true,
                        color: "#e64980",
                        curve: "catmullRom",
                        label: "Ingresos ($)",
                        valueFormatter: (value) => currency.format(Number(value || 0)),
                    }]}
                    height={200}
                    margin={{ left: 70, right: 20, top: 20, bottom: 30 }}
                    grid={{ vertical: true, horizontal: true }}
                    hideLegend
                />
            </Box>
        </Paper>
      )}
      {}
      <Paper withBorder p="sm" radius="md" mb="md" bg="gray.0">
        <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="md">
                <SegmentedControl
                    value={preset}
                    onChange={handlePresetChange}
                    radius="xl"
                    size="sm"
                    data={[
                        { label: "Hoy", value: "HOY" },
                        { label: "Ayer", value: "AYER" },
                        { label: "7 días", value: "ULTIMOS_7" },
                        { label: "Mes", value: "MES" },
                        { label: "Personalizado", value: "PERSONALIZADO" },
                    ]}
                />
                {preset === "PERSONALIZADO" && (
                    <DatePickerInput
                        type="range"
                        value={range}
                        onChange={(value) => handleRangeChange(value as [Date | null, Date | null])}
                        placeholder="Selecciona rango"
                        locale="es"
                        size="sm"
                        radius="xl"
                        w={220}
                    />
                )}
            </Group>
            <Group gap="lg">
                <Checkbox 
                    label="Pendientes" 
                    fw={500}
                    checked={pendingOnly} 
                    onChange={(e) => { setPendingOnly(e.currentTarget.checked); setCurrentPage(1); }} 
                />
                <Group gap="xs" align="center">
                    <Text size="sm" fw={600} c="dimmed">Resultados:</Text>
                    <SegmentedControl
                      size="xs"
                      radius="xl"
                      value={String(perPage)}
                      onChange={(val) => { setPerPage(Number(val)); setCurrentPage(1); }}
                      data={['5', '10', '25', '50']}
                    />
                </Group>
            </Group>
        </Group>
      </Paper>
      {isLoading ? (
        <Group justify="center" align="center" h={200}>
          <Loader color="rose" />
        </Group>
      ) : (!sales || sales.length === 0) ? (
        <Paper withBorder p="xl" radius="md" ta="center">
            <FiInfo size={40} color="var(--mantine-color-gray-4)" style={{ marginBottom: '10px' }} />
            <Text c="dimmed">No se encontraron ventas para este periodo.</Text>
        </Paper>
      ) : isMobile ? (
        <Stack>
          {sales.map((sale) => {
            const finalTotal = Number(sale.total) || 0
            return (
              <Paper key={sale.id} withBorder p="md" radius="md" >
                <Stack gap="xs">
                 <Group justify="space-between">
                    <Text fw={700} fz="sm">#{sale.id.slice(-6)}</Text>
                    {renderStatusBadge(sale)}
                  </Group>
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2}>
                        <Text fw={600} size="md">{sale.user?.name || sale.orders?.[0]?.buyer_name || 'Consumidor Final'}</Text>
                        <Text c="dimmed" size="xs">{formatDate(sale.created_at)}</Text>
                    </Stack>
                    <Badge color="blue" variant="light" size="sm">{sale.payment_method}</Badge>
                  </Group>
                  <Divider variant="dashed" />
                  <Group justify="space-between">
                    <Text size="sm">Total</Text>
                    <Text fw={800} fz="lg" c="rose.7">{currency.format(finalTotal)}</Text>
                  </Group>
                  {renderActionButtons(sale)}
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      ) : (
        <React.Fragment>
          <Paper withBorder radius="md" shadow="sm" style={{ overflow: 'hidden' }}>
            <ScrollArea>
              <Table verticalSpacing="md" highlightOnHover>
                <Table.Thead bg="gray.0">
                  <Table.Tr>
                    <Table.Th style={{ width: 40 }}></Table.Th>
                    <Table.Th>Orden</Table.Th>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Cliente</Table.Th>
                    <Table.Th>Método</Table.Th>
                    <Table.Th>Facturación</Table.Th>
                    <Table.Th ta="right">Total</Table.Th>
                    <Table.Th ta="center">Items</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sales.map((sale) => {
                    const finalTotal = Number(sale.total) || 0
                    const taxPct = Number(sale.tax) || 0
                    const subtotal = taxPct > 0 ? finalTotal / (1 + taxPct / 100) : finalTotal
                    const itemsCount = sale?.loadedManually ? (sale?.manualProducts?.length ?? 0) : (sale?.products?.length ?? 0)
                    return (
                      <Table.Tr key={sale.id}>
                        <Table.Td>{renderStatusBadge(sale)}</Table.Td>
                        <Table.Td>
                            <Text fw={700} fz="xs" c="rose.8" style={{ fontFamily: 'monospace' }}>
                                #{sale.id.slice(-8).toUpperCase()}
                            </Text>
                        </Table.Td>
                        <Table.Td>
                            <Text size="sm">{dayjs(sale.created_at).format('DD/MM/YY')}</Text>
                            <Text size="xs" c="dimmed">{dayjs(sale.created_at).format('HH:mm')} hs</Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={600} size="sm">{capitalizeTexts(sale.user?.name || sale.orders?.[0]?.buyer_name || 'Consumidor Final')}</Text>
                            <Text c="dimmed" size="xs" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sale.user?.email || sale.orders?.[0]?.buyer_email || '—'}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="blue" variant="light" size="sm">{sale.payment_method}</Badge>
                        </Table.Td>
                        <Table.Td>
                            <Stack gap={0}>
                                <Text size="xs" fw={500}>Sub: {currency.format(subtotal)}</Text>
                                {taxPct > 0 && <Text fz="10px" c="rose">Tax: {taxPct}%</Text>}
                            </Stack>
                        </Table.Td>
                        <Table.Td ta="right">
                            <Text fw={800} c="dark">{currency.format(finalTotal)}</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Badge size="xs" variant="outline" circle color="gray">{itemsCount}</Badge>
                        </Table.Td>
                        <Table.Td>
                          {renderActionButtons(sale)}
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </React.Fragment>
      )}
      {pagination && (
        <Group justify="space-between" mt="xl" px="sm">
          <Text size="sm" c="dimmed" fw={500}>
            Mostrando página <Text span c="dark" fw={700}>{pagination.page}</Text> de <Text span c="dark" fw={700}>{pagination.totalPages}</Text> ({pagination.total} ventas en total)
          </Text>
          <Group gap="xs">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              leftSection={<FiArrowLeft />}
              size="sm"
            >
              Anterior
            </Button>
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              rightSection={<FiArrowRight />}
              size="sm"
            >
              Siguiente
            </Button>
          </Group>
        </Group>
      )}
      {viewProductsOpen && selectedSale && (
        <ModalWrapper
          opened={viewProductsOpen}
          onClose={closeProducts}
          title={<Text fw={600}>Productos de la venta #{selectedSale.id}</Text>}
          size={"lg"}
          fullScreen={isMobile}
        >
          <Stack>
            {Array.isArray(selectedSale.items) && selectedSale.items.length > 0 ? (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Producto</Table.Th>
                    <Table.Th>Precio</Table.Th>
                    <Table.Th>Opciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedSale.items.map((it, idx) => (
                    <Table.Tr key={`${selectedSale.id}-view-item-${idx}`}>
                      <Table.Td>{`${it.title}${it.quantity && it.quantity > 1 ? ` x${it.quantity}` : ''}`}</Table.Td>
                      <Table.Td>{currency.format(Number(it.price) || 0)}</Table.Td>
                      <Table.Td>
                        {Array.isArray(it.options) && it.options.length > 0 ? (
                          <Group gap="xs" wrap="wrap">
                            {it.options.map((o, i) => (
                              <Badge key={i} variant="light">
                                {(o?.name || '') + ': ' + (o?.value || (Array.isArray(o?.values) ? o.values.join(', ') : ''))}
                              </Badge>
                            ))}
                          </Group>
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed">Sin productos</Text>
            )}
            {(() => {
              const finalTotal = Number(selectedSale.total) || 0
              const taxPct = Number(selectedSale.tax) || 0
              const subtotal = taxPct > 0 ? finalTotal / (1 + taxPct / 100) : finalTotal
              const taxAmount = finalTotal - subtotal
              return (
                <Paper withBorder p="sm" radius="md">
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Text>Subtotal</Text>
                      <Text fw={600}>{currency.format(subtotal)}</Text>
                    </Group>
                    {taxPct > 0 && (
                      <Group justify="space-between">
                        <Text>Impuesto ({taxPct}%)</Text>
                        <Text fw={600}>{currency.format(taxAmount)}</Text>
                      </Group>
                    )}
                    <Group justify="space-between">
                      <Text>Total</Text>
                      <Text fw={700}>{currency.format(finalTotal)}</Text>
                    </Group>
                  </Stack>
                </Paper>
              )
            })()}
          </Stack>
        </ModalWrapper>
      )}
      {viewBuyerOpen && buyerSale && (
        <ModalWrapper
          opened={viewBuyerOpen}
          onClose={closeBuyer}
          title={<Text fw={600}>Datos del comprador</Text>}
        >
          {(() => {
            const name = buyerSale.user?.name || buyerSale.orders?.[0]?.buyer_name || ''
            const email = buyerSale.user?.email || buyerSale.orders?.[0]?.buyer_email || ''
            const phone = buyerSale.orders?.[0]?.buyer_phone || ''
            return (
              <Stack>
                <Group justify="space-between">
                  <Text>Nombre</Text>
                  <Text fw={600}>{name || '—'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>Email</Text>
                  <Text fw={600}>{email || '—'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text>Teléfono</Text>
                  <Text fw={600}>{phone || '—'}</Text>
                </Group>
              </Stack>
            )
          })()}
        </ModalWrapper>
      )}
      {receiptOpen && (
        <ModalWrapper
          opened={receiptOpen}
          onClose={() => { setReceiptOpen(false); setReceiptUrl("") }}
          title={<Text fw={600}>Comprobante</Text>}
          size={"lg"}
          fullScreen={isMobile}
        >
          <Box>
            <iframe src={receiptUrl} style={{ width: '100%', height: 520, border: 'none' }} />
          </Box>
        </ModalWrapper>
      )}
      {editOpen && editSale && (
        <ModalWrapper
          opened={editOpen}
          onClose={() => { setEditOpen(false); setEditSale(null); }}
          title={<Text fw={600}>Editar venta #{editSale.id}</Text>}
          size={'xl'}
          fullScreen={isMobile}
        >
          <SalesForm onClose={() => { setEditOpen(false); setEditSale(null); }} sale={editSale} />
        </ModalWrapper>
      )}
      {declineModalOpen && (
        <ModalWrapper
          opened={declineModalOpen}
          onClose={() => setDeclineModalOpen(false)}
          title={<Text fw={600}>Declinar Venta</Text>}
        >
          <Stack>
            <Text size="sm">Por favor ingrese el motivo de la declinación:</Text>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.currentTarget.value)}
              placeholder="Motivo..."
              autosize
              minRows={3}
              data-autofocus
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setDeclineModalOpen(false)}>Cancelar</Button>
              <Button color="red" onClick={confirmDecline} disabled={!declineReason.trim()}>Declinar</Button>
            </Group>
          </Stack>
        </ModalWrapper>
      )}
    </Box>
  )
}
