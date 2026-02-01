"use client";
import {
  Modal,
  Box,
  Stack,
  Text,
  Divider,
  Button,
  Stepper,
  TextInput,
  Checkbox,
  Select,
  Group,
} from "@mantine/core";

import useCart from "./useCart";
import { CartItemCard, CartBankInfo } from "./components";
import { formatCurrency } from "@/utils/constants";
import type { CheckoutFormValues } from "@/providers/useCart";

type CartProps = {
  opened?: boolean;
  onClose: () => void;
};

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
  } = useCart(onClose);



  const updateFormField = <K extends keyof CheckoutFormValues>(
    field: K,
    value: CheckoutFormValues[K]
  ) => {
    setFormValues({ ...formValues, [field]: value });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Mi carrito" size="lg">
      <Box>
        <Box style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <Stack gap="md">
            {cart.items.length === 0 ? (
              <Text c="dimmed">Tu carrito está vacío</Text>
            ) : (
              cart.items.map((item) => (
                <CartItemCard
                  key={`${item.product_id}-${JSON.stringify(item.options)}`}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                />
              ))
            )}
          </Stack>
        </Box>

        <Divider my="md" />



        <Stack gap="xs">

          <Group justify="space-between" align="center">
            <Text fw={700} size="lg">
              Total: {formatCurrency(cart.total)}
            </Text>
            <Group>
              <Button variant="outline" color="red" onClick={clearCart}>
                Limpiar carrito
              </Button>
              {!formValues.checkoutOpen && (
                <Button color="green" onClick={initShipping} disabled={cart.items.length === 0}>
                  Continuar
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Box>

      {formValues.checkoutOpen && (
        <Box mt="md">
          <Stepper
            active={formValues.activeStep}
            onStepClick={(step) => updateFormField("activeStep", step)}
            allowNextStepsSelect={false}
            size="sm"
          >
            <Stepper.Step label="Datos del cliente">
              <Stack mt="md">
                <TextInput
                  label="Nombre"
                  value={formValues.name}
                  onChange={(e) => updateFormField("name", e.currentTarget.value)}
                  required
                />
                <TextInput
                  label="Correo"
                  value={formValues.email}
                  onChange={(e) => updateFormField("email", e.currentTarget.value)}
                  required
                />
                <TextInput
                  label="Teléfono"
                  value={formValues.phone}
                  onChange={(e) => updateFormField("phone", e.currentTarget.value)}
                  required
                />
                <Checkbox
                  label="Retiro en local"
                  checked={formValues.pickup}
                  onChange={(e) => {
                    const pickup = e.currentTarget.checked;
                    setFormValues({
                      ...formValues,
                      pickup,
                      orderMethod: pickup ? "EN_LOCAL" : "TRANSFERENCIA",
                    });
                  }}
                />
                {!formValues.pickup && (
                  <Stack>
                    <TextInput
                      label="Calle"
                      value={formValues.street}
                      onChange={(e) => updateFormField("street", e.currentTarget.value)}
                    />
                    <Select
                      searchable
                      label="Provincia"
                      data={provinces.map((p) => ({ label: p.nombre, value: p.id }))}
                      value={formValues.selectedProvinceId}
                      onChange={(value) => handleProvinceChange(value || "")}
                      withAsterisk
                    />
                    <Select
                      searchable
                      label="Localidad/Municipio"
                      data={localities.map((l) => ({ label: l.nombre, value: l.id }))}
                      value={formValues.selectedLocalityId}
                      onChange={(value) => handleLocalityChange(value || "")}
                      disabled={!formValues.selectedProvinceId || localities.length === 0}
                      withAsterisk
                    />
                    <TextInput
                      label="Código postal"
                      value={formValues.postal_code}
                      onChange={(e) => updateFormField("postal_code", e.currentTarget.value)}
                    />
                  </Stack>
                )}
                <Group justify="end">
                  <Button
                    onClick={() => updateFormField("activeStep", 1)}
                    disabled={!shippingInfoCompleted}
                  >
                    Continuar
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Pago">
              <Stack mt="md">
                <Select
                  searchable
                  label="Método de pago"
                  data={[
                    { label: "Transferencia bancaria", value: "TRANSFERENCIA" },
                    { label: "Acordar en el negocio", value: "EN_LOCAL" },
                  ]}
                  value={formValues.orderMethod}
                  onChange={(value) =>
                    updateFormField(
                      "orderMethod",
                      value === "TRANSFERENCIA" || value === "EN_LOCAL" ? value : "EN_LOCAL"
                    )
                  }
                />

                {formValues.orderMethod === "TRANSFERENCIA" && (
                  <CartBankInfo
                    isLoading={isLoadingBankInfo}
                    error={bankInfoError}
                    bankData={businessData?.bankData}
                    onFileChange={setReceiptFile}
                  />
                )}

                <Group justify="space-between" mt="md">
                  <Button variant="outline" onClick={() => updateFormField("activeStep", 0)}>
                    Volver
                  </Button>
                  <Button
                    color="green"
                    onClick={submitOrder}
                    disabled={
                      processingOrder ||
                      (formValues.orderMethod === "TRANSFERENCIA" && !receiptFile)
                    }
                    loading={processingOrder}
                  >
                    Finalizar compra
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>
          </Stepper>
        </Box>
      )}
    </Modal>
  );
}

export default Cart;
