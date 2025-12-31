'use client'
import { Modal, Box, Stack, Group, Image, Text, ActionIcon, Divider, Button, Stepper, TextInput, Checkbox, Select, Loader, Alert, Card, CopyButton, Tooltip, Badge } from '@mantine/core'
import { FaMinus, FaPlus, FaUniversity, FaCopy, FaCheck, FaTag, FaTimes } from 'react-icons/fa'
import { useState } from 'react'
import { showNotification } from '@mantine/notifications'
import { useAppContext } from '@/providers/AppContext'
import useCart from './useCart'
import type { SelectedOption } from '@/providers/useCart'

type CartProps = {
  opened?: boolean
  onClose: () => void
}

function Cart({ opened = true, onClose }: CartProps) {
  const {
    cart,
    clearCart,
    updateQuantity,
    formValues,
    setFormValues,
    shippingInfoCompleted,
    initShipping,
    provinces,
    localities,
    handleProvinceChange,
    handleLocalityChange,
    submitOrder,
    processingOrder,
    receiptFile,
    setReceiptFile,
    businessData,
    isLoadingBankInfo,
    bankInfoError,
    applyPromoCode,
    removePromoCode
  } = useCart(onClose);

  const { utils } = useAppContext()
  const [promoInput, setPromoInput] = useState('')
  const [validatingPromo, setValidatingPromo] = useState(false)

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) {
      showNotification({ title: 'Código requerido', message: 'Ingresa un código de promoción', color: 'yellow' })
      return
    }
    setValidatingPromo(true)
    const result = await applyPromoCode(promoInput, utils.baseUrl)
    setValidatingPromo(false)
    if (result.ok) {
      showNotification({ title: 'Promoción aplicada', message: `Descuento de ${formatCurrency(result.discount || 0)} aplicado`, color: 'green' })
      setPromoInput('')
    } else {
      const errorMessages: Record<string, string> = {
        'promo_not_found': 'Código de promoción no encontrado',
        'promo_inactive': 'Esta promoción no está activa',
        'promo_expired': 'Esta promoción ha expirado',
        'promo_not_started': 'Esta promoción aún no está disponible',
        'promo_usage_limit_reached': 'Esta promoción alcanzó su límite de uso',
        'promo_user_limit_reached': 'Ya has usado esta promoción el máximo de veces permitido',
        'min_order_amount_not_met': `El monto mínimo de compra es ${formatCurrency((result as { min_amount?: number }).min_amount || 0)}`,
        'promo_not_applicable_to_items': 'Esta promoción no aplica a los productos en tu carrito',
        'network_error': 'Error de conexión. Intenta de nuevo.'
      }
      showNotification({ 
        title: 'Código inválido', 
        message: errorMessages[result.error] || 'El código de promoción no es válido', 
        color: 'red' 
      })
    }
  }

  const handleRemovePromo = () => {
    removePromoCode()
    showNotification({ title: 'Promoción removida', message: 'El código de promoción fue removido', color: 'blue' })
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Mi carrito" size="lg">
      <Box>
        <Box style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <Stack gap="md">
            {cart.items.length === 0 ? (
              <Text c="dimmed">Tu carrito está vacío</Text>
            ) : (
              cart.items.map((item) => (
                <Box key={`${item.product_id}-${JSON.stringify(item.options)}`} style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8, padding: 12 }}>
                  <Group justify="space-between" align="center">
                    <Group align="center" gap="md">
                      <Image src={item.image_url} alt={item.product_name} w={64} h={64} fit="cover" radius="sm" />
                      <Stack gap={4}>
                        <Text fw={600}>{item.product_name}</Text>
                        <Text>{formatCurrency(item.price)}</Text>
                        {Array.isArray(item.options) && item.options.length > 0 && (
                          <Group gap="xs">
                            {item.options.map((opt: SelectedOption, idx: number) => (
                              <Badge key={idx} variant="light" color="gray">
                                {`${opt?.name || ''}: ${opt?.value || ''}`}
                              </Badge>
                            ))}
                            <Badge variant="filled" color="blue">x{item.quantity}</Badge>
                          </Group>
                        )}
                        {item.price_changed && (
                          <Text size="xs" c="yellow.6">El precio de este producto ha cambiado recientemente</Text>
                        )}
                      </Stack>
                    </Group>
                    <Group align="center" gap="sm">
                      <ActionIcon variant="light" aria-label="decrement" onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.options)}>
                        <FaMinus />
                      </ActionIcon>
                      <Text fw={600}>{item.quantity}</Text>
                      <ActionIcon variant="light" aria-label="increment" onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.options)}>
                        <FaPlus />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Box>
              ))
            )}
          </Stack>
        </Box>

        <Divider my="md" />

        {/* Código de promoción */}
        {cart.items.length > 0 && (
          <Box>
            {cart.promo_code ? (
              <Group justify="space-between" align="center" p="sm" style={{ border: '1px solid var(--mantine-color-green-6)', borderRadius: 8, backgroundColor: 'var(--mantine-color-green-0)' }}>
                <Group gap="xs">
                  <FaTag size={14} />
                  <Text size="sm" fw={500}>{cart.promo_code}</Text>
                  {cart.promo_title && <Text size="xs" c="dimmed">- {cart.promo_title}</Text>}
                </Group>
                <Group gap="xs">
                  {cart.discount && cart.discount > 0 && (
                    <Text size="sm" fw={600} c="green">-{formatCurrency(cart.discount)}</Text>
                  )}
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={handleRemovePromo}>
                    <FaTimes size={12} />
                  </ActionIcon>
                </Group>
              </Group>
            ) : (
              <Group gap="xs" align="flex-end">
                <TextInput
                  placeholder="Código de promoción"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.currentTarget.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                  leftSection={<FaTag size={14} />}
                  style={{ flex: 1 }}
                  size="sm"
                />
                <Button 
                  size="sm" 
                  onClick={handleApplyPromo} 
                  loading={validatingPromo}
                  disabled={!promoInput.trim() || validatingPromo}
                >
                  Aplicar
                </Button>
              </Group>
            )}
          </Box>
        )}

        <Divider my="md" />

        <Stack gap="xs">
          {cart.discount && cart.discount > 0 && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Subtotal:</Text>
              <Text size="sm" c="dimmed">{formatCurrency(cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0))}</Text>
            </Group>
          )}
          {cart.discount && cart.discount > 0 && (
            <Group justify="space-between">
              <Text size="sm" c="green">Descuento:</Text>
              <Text size="sm" fw={600} c="green">-{formatCurrency(cart.discount)}</Text>
            </Group>
          )}
          <Group justify="space-between" align="center">
            <Text fw={700} size="lg">Total: {formatCurrency(cart.total)}</Text>
            <Group>
              <Button variant="outline" color="red" onClick={clearCart}>Limpiar carrito</Button>
              {!formValues.checkoutOpen && (
                   <Button color="green" onClick={initShipping} disabled={cart.items.length === 0}>Continuar</Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Box>
      {formValues.checkoutOpen && (
        <Box mt="md">
          <Stepper active={formValues.activeStep} onStepClick={(step) => setFormValues({ ...formValues, activeStep: step })} allowNextStepsSelect={false} size="sm">
            <Stepper.Step label="Datos del cliente">
              <Stack mt="md">
                <TextInput label="Nombre" value={formValues.name} onChange={(e) => setFormValues({ ...formValues, name: e.currentTarget.value })} required />
                <TextInput label="Correo" value={formValues.email} onChange={(e) => setFormValues({ ...formValues, email: e.currentTarget.value })} required />
                <TextInput label="Teléfono" value={formValues.phone} onChange={(e) => setFormValues({ ...formValues, phone: e.currentTarget.value })} required />
                <Checkbox label="Retiro en local" checked={formValues.pickup} onChange={(e) => setFormValues({ ...formValues, pickup: e.currentTarget.checked, orderMethod: e.currentTarget.checked ? 'EN_LOCAL' : 'TRANSFERENCIA' })} />
                {!formValues.pickup && (
                  <Stack>
                    <TextInput label="Calle" value={formValues.street} onChange={(e) => setFormValues({ ...formValues, street: e.currentTarget.value })} />
                    <Select searchable label="Provincia" data={provinces.map(p => ({ label: p.nombre, value: p.id }))} value={formValues.selectedProvinceId} onChange={(value) => handleProvinceChange(value || '')} withAsterisk />
                    <Select searchable label="Localidad/Municipio" data={localities.map(l => ({ label: l.nombre, value: l.id }))} value={formValues.selectedLocalityId} onChange={(value) => handleLocalityChange(value || '')} disabled={!formValues.selectedProvinceId || localities.length === 0} withAsterisk />
                    <TextInput label="Código postal" value={formValues.postal_code} onChange={(e) => setFormValues({ ...formValues, postal_code: e.currentTarget.value })} />
                  </Stack>
                )}
                <Group justify="end">
                  <Button onClick={() => setFormValues({ ...formValues, activeStep: 1 })} disabled={!shippingInfoCompleted}>Continuar</Button>
                </Group>
              </Stack>
            </Stepper.Step>
            <Stepper.Step label="Pago">
              <Stack mt="md">
                <Select searchable label="Método de pago" data={[{ label: 'Transferencia bancaria', value: 'TRANSFERENCIA' }, { label: 'Acordar en el negocio', value: 'EN_LOCAL' }]} value={formValues.orderMethod} onChange={(value) => setFormValues({ ...formValues, orderMethod: (value === 'TRANSFERENCIA' || value === 'EN_LOCAL') ? value : 'EN_LOCAL' })} />
                
                {formValues.orderMethod === 'TRANSFERENCIA' && (
                  <Stack gap="xs">
                    {isLoadingBankInfo ? (
                        <Group justify="center" my="md">
                            <Loader size="sm" />
                            <Text size="sm">Cargando datos bancarios...</Text>
                        </Group>
                    ) : bankInfoError ? (
                        <Alert color="red" title="Error">No se pudieron cargar los datos bancarios. Por favor contacte al negocio.</Alert>
                    ) : businessData?.bankData && businessData.bankData.length > 0 ? (
                        <Stack gap="sm">
                            <Text size="sm" fw={500}>Cuentas disponibles para transferir:</Text>
                            {businessData.bankData.map((bank, index) => (
                                <Card key={index} withBorder shadow="sm" radius="md" p="sm">
                                    <Group justify="space-between" align="start">
                                        <Stack gap={2}>
                                            <Group gap="xs">
                                                <FaUniversity size={14} color="gray" />
                                                <Text size="sm" fw={700}>{bank.bank_name}</Text>
                                            </Group>
                                            <Text size="sm">CBU/CVU: {bank.account_number}</Text>
                                            <Text size="xs" c="dimmed">Titular: {bank.account_holder}</Text>
                                        </Stack>
                                        <CopyButton value={bank.account_number} timeout={2000}>
                                            {({ copied, copy }) => (
                                                <Tooltip label={copied ? 'Copiado' : 'Copiar CBU'} withArrow position="right">
                                                    <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                                                        {copied ? <FaCheck size={16} /> : <FaCopy size={16} />}
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </CopyButton>
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    ) : (
                        <Alert color="yellow">No hay cuentas bancarias configuradas.</Alert>
                    )}
                    
                    <Divider my="xs" />
                    <Text size="sm" fw={500}>Adjunta tu comprobante de transferencia (imagen/PDF):</Text>
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                  </Stack>
                )}

                <Group justify="space-between" mt="md">
                  <Button variant="outline" onClick={() => setFormValues({ ...formValues, activeStep: 0 })}>Volver</Button>
                  <Button color="green" onClick={submitOrder} disabled={processingOrder || (formValues.orderMethod === 'TRANSFERENCIA' && !receiptFile)} loading={processingOrder}>Finalizar compra</Button>
                </Group>
              </Stack>
            </Stepper.Step>
          </Stepper>
        </Box>
      )}
    </Modal>
  )
}



export default Cart
