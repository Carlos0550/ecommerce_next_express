import { useState } from "react";
import { Paper, Stack, TextInput, Button, Group, Title, Text, Checkbox } from "@mantine/core";
export type RegisterFormValues = {
  name: string;
  email: string;
  asAdmin: boolean;
};
export default function RegisterForm({ onSubmit, loading }: { onSubmit?: (values: RegisterFormValues) => void, loading?: boolean }) {
  const [values, setValues] = useState<RegisterFormValues>({ name: "", email: "", asAdmin: false });
  const [error, setError] = useState<string>("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!values.name || !values.email) {
      setError("Completa todos los campos");
      return;
    }
    onSubmit?.(values);
  };
  return (
    <Paper withBorder p="md" radius="md" component="form" onSubmit={handleSubmit}>
      <Stack>
        <Title order={4}>Registrarme</Title>
        <TextInput
          label="Nombre"
          placeholder="Tu nombre"
          value={values.name}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setValues((v) => ({ ...v, name: val }));
          }}
          required
        />
        <TextInput
          label="Email"
          placeholder="tu@email.com"
          value={values.email}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setValues((v) => ({ ...v, email: val }));
          }}
          required
        />
        <Checkbox
          label="Registrar como administrador"
          checked={values.asAdmin}
          onChange={(e) => {
            const val = e.currentTarget.checked;
            setValues((v) => ({ ...v, asAdmin: val }));
          }}
        />
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
        <Group justify="flex-end">
          <Button type="submit" loading={loading}>Crear cuenta</Button>
        </Group>
      </Stack>
    </Paper>
  );
}
