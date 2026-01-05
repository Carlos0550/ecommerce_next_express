import { Box, Paper, Table, Text, Loader, Group, Button, Badge, Stack, ScrollArea, SegmentedControl, Checkbox, Textarea, ActionIcon } from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import { useMediaQuery } from "@mantine/hooks"
import { theme } from "@/theme"
import type { Product } from "../Api/ProductsApi"
import { useGetSales, useProcessSale, useGetSaleReceipt, useDeclineSale, useDeleteSale } from "../Api/SalesApi"
import type { PaymentMethods, SaleSource, ManualProductItem } from "./SalesForm"
import ModalWrapper from "@/components/Common/ModalWrapper"
import React, { useMemo, useState } from "react"
import { SalesForm } from "./SalesForm"
import { FiEdit, FiTrash } from "react-icons/fi"

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
  products: Product[],
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
  const processSaleMutation = useProcessSale()
  const getReceiptMutation = useGetSaleReceipt()
  const declineSaleMutation = useDeclineSale()
  const deleteSaleMutation = useDeleteSale()

  const [receiptOpen, setReceiptOpen] = useState<boolean>(false)
  const [receiptUrl, setReceiptUrl] = useState<string>("")

  const openReceipt = (saleId: string) => {
    getReceiptMutation.mutate(saleId, {
      onSuccess: (url) => {
        setReceiptUrl(url);
        setReceiptOpen(true);
        return
      },
      onError: () => {
        setReceiptUrl("");
        setReceiptOpen(false);
        return
      }
    });
  }

  const sales: Sales[] = (data?.sales ?? []) as Sales[]
  const pagination = data?.pagination as undefined | {
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean,
  }
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints?.sm || '768px'})`)
  const currency = useMemo(() => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }), [])

  const [viewProductsOpen, setViewProductsOpen] = useState<boolean>(false)
  const [selectedSale, setSelectedSale] = useState<Sales | null>(null)
  const [viewBuyerOpen, setViewBuyerOpen] = useState<boolean>(false)
  const [buyerSale, setBuyerSale] = useState<Sales | null>(null)
  const [editOpen, setEditOpen] = useState<boolean>(false)
  const [editSale, setEditSale] = useState<Sales | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  
  const totalToday = useMemo(() => data?.totalSalesByDate || 0, [data?.totalSalesByDate])

  
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
      <Group gap="xs" wrap="wrap">
        <Button variant="light" onClick={() => openProducts(sale)}>Ver productos</Button>
        {sale.source === 'WEB' && (
          <React.Fragment>
            {processSaleMutation.isPending ? (
              <Loader size={"xs"} type="bars" />
            ) : (
              <Checkbox disabled={sale.processed || processSaleMutation.isPending || sale.declined} size="xs" label="Procesada"
                checked={sale.processed!}
                onChange={() => processSaleMutation.mutate(sale.id)}
              />
            )}
            <Button disabled={getReceiptMutation.isPending} loading={getReceiptMutation.isPending} size="xs" variant="light" onClick={() => openReceipt(sale.id)}>Ver comprobante</Button>
            <Button size="xs" variant="light" color="red"
              disabled={sale.processed || sale.declined}
              onClick={() => handleDeclineSale(sale.id)}>Declinar
            </Button>
          </React.Fragment>
        )}
        <Button size="xs" variant="light" onClick={() => openBuyer(sale)}>Ver comprador</Button>
        {sale.source !== 'WEB' && (
          <Button size="xs" variant="light" leftSection={<FiEdit />} onClick={() => { setEditSale(sale); setEditOpen(true); }}>Editar</Button>
        )}
        <ActionIcon color="red" variant="light" aria-label="Eliminar"
          onClick={() => { setDeletingId(sale.id); deleteSaleMutation.mutate(sale.id, { onSettled: () => setDeletingId(null) }); }}
          loading={deleteSaleMutation.isPending && deletingId === sale.id}
          disabled={deleteSaleMutation.isPending && deletingId === sale.id}
        >
          <FiTrash />
        </ActionIcon>
      </Group>
    )
  }

  const renderStatusBadge = (sale: Sales) => {
    if (sale.source === "WEB") {
      if (sale.processed) return <Badge color="green">Procesada</Badge>
      if (sale.declined) return <Badge color="red">Declinada</Badge>
      return <Badge color="yellow">Pendiente</Badge>
    }
  }
  return (
    <Box>
      <Group mb="md" gap="md" align="center" wrap="wrap">
        <SegmentedControl
          value={preset}
          onChange={handlePresetChange}
          style={{ flexWrap: "wrap" }}
          data={[
            { label: "Hoy", value: "HOY" },
            { label: "Ayer", value: "AYER" },
            { label: "Últimos 3", value: "ULTIMOS_3" },
            { label: "Últimos 7", value: "ULTIMOS_7" },
            { label: "Mes", value: "MES" },
            { label: "Personalizado", value: "PERSONALIZADO" },
          ]}
        />
        <Checkbox label="Órdenes pendientes" checked={pendingOnly} onChange={(e) => { setPendingOnly(e.currentTarget.checked); setCurrentPage(1); }} />
        {preset === "PERSONALIZADO" && (
          <DatePickerInput
            type="range"
            value={range}
            onChange={(value) => handleRangeChange(value as [Date | null, Date | null])}
            placeholder="Selecciona rango"
            locale="es"
          />
        )}
      </Group>
      {isLoading ? (
        <Group justify="center" align="center" h={200}>
          <Loader />
        </Group>
      ) : (!sales || sales.length === 0) ? (
        <Text ta="center">No se encontraron ventas</Text>
      ) : isMobile ? (
        <Stack>
          <Text c={"dimmed"} size="xl">
            Total vendido hoy: {currency.format(totalToday)}
          </Text>
          {sales.map((sale) => {
            const finalTotal = Number(sale.total) || 0
            const taxPct = Number(sale.tax) || 0
            const subtotal = taxPct > 0 ? finalTotal / (1 + taxPct / 100) : finalTotal
            const taxAmount = finalTotal - subtotal
            const itemsCount = sale?.loadedManually ? (sale?.manualProducts?.length ?? 0) : (sale?.products?.length ?? 0)
            return (
              <Paper key={sale.id} withBorder p="md" radius="md" >
                <Stack gap="xs">
                {renderStatusBadge(sale)}
                  <Group justify="space-between">
                    <Text fw={600}>Venta #{sale.id}</Text>
                    <Badge variant="light">{sale.source}</Badge>
                  </Group>
                  <Text c="dimmed">Fecha: {formatDate(sale.created_at)}</Text>
                  <Group gap="xs">
                    <Badge color="blue" variant="light">{sale.payment_method}</Badge>
                    {taxPct > 0 && <Badge color="grape" variant="light">Impuesto {taxPct}%</Badge>}
                  </Group>
                  <Group justify="space-between">
                    <Text>Subtotal</Text>
                    <Text fw={600}>{currency.format(subtotal)}</Text>
                  </Group>
                  {taxPct > 0 && (
                    <Group justify="space-between">
                      <Text>Impuesto</Text>
                      <Text fw={600}>{currency.format(taxAmount)}</Text>
                    </Group>
                  )}
                  <Group justify="space-between">
                    <Text>Total</Text>
                    <Text fw={700}>{currency.format(finalTotal)}</Text>
                  </Group>
                  {}
                  <Group justify="space-between">
                    <Text>Cliente</Text>
                    <Text>{sale.user?.name || sale.orders?.[0]?.buyer_name || '—'} {sale.user?.email || sale.orders?.[0]?.buyer_email ? `(${sale.user?.email || sale.orders?.[0]?.buyer_email})` : ''}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Productos</Text>
                    <Badge>{itemsCount}</Badge>
                  </Group>
                  {renderActionButtons(sale)}
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      ) : (
        <React.Fragment>
          <Stack mb={"md"}>
            <Text c={"dimmed"} size="xl">
              Total vendido hoy: {currency.format(totalToday)}
            </Text>
          </Stack>
          <Paper withBorder radius="md" p="sm">

            <ScrollArea>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th></Table.Th>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Cliente</Table.Th>
                    <Table.Th>Método</Table.Th>
                    <Table.Th>Fuente</Table.Th>
                    <Table.Th>Impuesto %</Table.Th>
                    <Table.Th>Subtotal</Table.Th>
                    <Table.Th>Total</Table.Th>
                    <Table.Th>Productos</Table.Th>
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
                        <Table.Td>{formatDate(sale.created_at)}</Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={600}>{sale.user?.name || sale.orders?.[0]?.buyer_name || '—'}</Text>
                            <Text c="dimmed" size="sm">{sale.user?.email || sale.orders?.[0]?.buyer_email || '—'}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="blue" variant="light">{sale.payment_method}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">{sale.source}</Badge>
                        </Table.Td>
                        <Table.Td>{taxPct}</Table.Td>
                        <Table.Td>{currency.format(subtotal)}</Table.Td>
                        <Table.Td>{currency.format(finalTotal)}</Table.Td>
                        <Table.Td>
                          <Badge>{itemsCount}</Badge>
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
        <Group justify="center" mt="md" gap="md">
          <Text>
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} ventas)
          </Text>
          <Group gap="xs">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              size="sm"
            >
              Anterior
            </Button>
            <Button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              size="sm"
            >
              Siguiente
            </Button>
          </Group>
          <Group gap="xs" align="center">
            <Text size="sm">Por página:</Text>
            <Button size="xs" variant={perPage === 5 ? 'filled' : 'light'} onClick={() => { setPerPage(5); setCurrentPage(1); }}>5</Button>
            <Button size="xs" variant={perPage === 10 ? 'filled' : 'light'} onClick={() => { setPerPage(10); setCurrentPage(1); }}>10</Button>
            <Button size="xs" variant={perPage === 20 ? 'filled' : 'light'} onClick={() => { setPerPage(20); setCurrentPage(1); }}>20</Button>
            <Button size="xs" variant={perPage === 50 ? 'filled' : 'light'} onClick={() => { setPerPage(50); setCurrentPage(1); }}>50</Button>
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
