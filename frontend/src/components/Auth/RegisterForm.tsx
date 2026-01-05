import { useEffect, useState, useCallback, useMemo } from "react";
import { Paper, Stack, TextInput, PasswordInput, Button, Group, Title, Text, Badge, Loader } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { baseUrl } from "@/components/Api";

export type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  storeName: string;
};

type SlugPreview = {
  slug: string;
  available: boolean;
  loading: boolean;
};

export default function RegisterForm({ onSubmit, loading }: { onSubmit?: (values: RegisterFormValues) => void, loading?: boolean }) {
  const [values, setValues] = useState<RegisterFormValues>({ 
    name: "", 
    email: "", 
    password: "", 
    confirmPassword: "",
    storeName: ""
  });
  const [error, setError] = useState<string>("");
  const [slugPreview, setSlugPreview] = useState<SlugPreview>({ slug: "", available: false, loading: false });
  
  
  const [debouncedStoreName] = useDebouncedValue(values.storeName, 500);
  
  
  const normalizeSlug = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, []);

  
  const previewSlug = useMemo(() => normalizeSlug(values.storeName), [values.storeName, normalizeSlug]);

  
  useEffect(() => {
    const checkSlugAvailability = async () => {
      if (!debouncedStoreName || debouncedStoreName.trim().length < 2) {
        setSlugPreview({ slug: previewSlug, available: false, loading: false });
        return;
      }

      setSlugPreview(prev => ({ ...prev, loading: true }));

      try {
        const response = await fetch(`${baseUrl}/tenant/preview-slug/${encodeURIComponent(debouncedStoreName)}`);
        const data = await response.json();
        
        if (data.ok && data.data) {
          setSlugPreview({
            slug: data.data.slug,
            available: data.data.available,
            loading: false
          });
        } else {
          setSlugPreview({ slug: previewSlug, available: false, loading: false });
        }
      } catch (err) {
        console.error("Error checking slug:", err);
        setSlugPreview({ slug: previewSlug, available: false, loading: false });
      }
    };

    checkSlugAvailability();
  }, [debouncedStoreName, previewSlug]);
  
  useEffect(()=> {
    console.log("Values", values);
  },[values])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!values.name || !values.email || !values.password || !values.confirmPassword || !values.storeName) {
      setError("Completa todos los campos");
      return;
    }
    if (values.storeName.trim().length < 2) {
      setError("El nombre de la tienda debe tener al menos 2 caracteres");
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (values.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    onSubmit?.(values);
  };

  return (
    <Paper withBorder p="md" radius="md" component="form" onSubmit={handleSubmit}>
      <Stack>
        <Title order={4}>Crear mi tienda</Title>
        <Text size="sm" c="dimmed">
          Registra tu negocio y comienza a vender online
        </Text>
        
        <TextInput
          label="Nombre de tu tienda"
          placeholder="Mi Tienda Online"
          description="Este nombre se usará para crear tu subdominio"
          value={values.storeName}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setValues((v) => ({ ...v, storeName: val }));
          }}
          required
          rightSection={slugPreview.loading ? <Loader size="xs" /> : null}
        />
        
        {previewSlug && (
          <Group gap="xs">
            <Text size="sm" c="dimmed">Tu tienda estará en:</Text>
            <Badge 
              color={slugPreview.available ? "green" : slugPreview.loading ? "gray" : "orange"}
              variant="light"
            >
              {previewSlug}.tudominio.com
            </Badge>
            {!slugPreview.loading && values.storeName.trim().length >= 2 && (
              <Text size="xs" c={slugPreview.available ? "green" : "orange"}>
                {slugPreview.available ? "✓ Disponible" : "⚠ Se asignará una variante"}
              </Text>
            )}
          </Group>
        )}
        
        <TextInput
          label="Tu nombre"
          placeholder="Tu nombre completo"
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
        <PasswordInput
          label="Contraseña"
          placeholder="••••••••"
          description="Mínimo 6 caracteres"
          value={values.password}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setValues((v) => ({ ...v, password: val }));
          }}
          required
        />
        <PasswordInput
          label="Confirmar contraseña"
          placeholder="••••••••"
          value={values.confirmPassword}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setValues((v) => ({ ...v, confirmPassword: val }));
          }}
          required
        />
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
        <Group justify="flex-end">
          <Button type="submit" loading={loading}>Crear mi tienda</Button>
        </Group>
      </Stack>
    </Paper>
  );
}
