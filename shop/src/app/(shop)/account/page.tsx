"use client";
import { useGetProfile, useUpdateProfile, useUploadAvatar, useChangePassword } from '@/Api/useProfile';
import { useAppContext } from '@/providers/AppContext';
import { Avatar, Button, Grid, Group, Stack, Text, TextInput, Title, Tabs, Paper, Divider, FileButton, Loader, Select } from '@mantine/core';
import { PasswordInput } from '@mantine/core';
import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { showNotification } from '@mantine/notifications';

export default function AccountPage() {
  const { auth } = useAppContext();
  const router = useRouter();
  useEffect(() => {
    if (!auth.isAuthenticated) {
      showNotification({ message: 'Debes iniciar sesión para acceder a esta página', color: 'red', id: 'account-page' });
      router.push('/');
      return
    }
  }, [auth.isAuthenticated, router]);
  const { data } = useGetProfile();
  const update = useUpdateProfile();
  const upload = useUploadAvatar();
  const change = useChangePassword();
  const [form, setForm] = useState({ name: '', phone: '', shipping_street: '', shipping_postal_code: '', shipping_city: '', shipping_province: '' });
  const [activeTab, setActiveTab] = useState<string | null>('info');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<{ id: string; nombre: string }[]>([]);
  const [localities, setLocalities] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [selectedLocalityId, setSelectedLocalityId] = useState<string>('');

  useEffect(() => {
    const u = data?.user;
    if (u) {
      setTimeout(() => {
        setForm({
          name: u.name || '',
          phone: u.phone || '',
          shipping_street: u.shipping_street || '',
          shipping_postal_code: u.shipping_postal_code || '',
          shipping_city: u.shipping_city || '',
          shipping_province: u.shipping_province || '',
        });
      }, 0);
    }
  }, [data?.user]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre&max=100');
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.provincias) ? json.provincias : [];
        setProvinces(list);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!selectedProvinceId && form.shipping_province && provinces.length > 0) {
      const p = provinces.find(x => x.nombre.toLowerCase() === form.shipping_province.toLowerCase());
      if (p?.id) {
        setSelectedProvinceId(p.id);
        (async () => {
          try {
            const res = await fetch(`https://apis.datos.gob.ar/georef/api/municipios?provincia=${encodeURIComponent(p.id)}&campos=id,nombre&max=500`);
            const json = await res.json().catch(() => null);
            const list = Array.isArray(json?.municipios) ? json.municipios : [];
            setLocalities(list);
            const l = list.find((x: { id: string; nombre: string }) => x.nombre.toLowerCase() === (form.shipping_city || '').toLowerCase());
            if (l?.id) setSelectedLocalityId(l.id);
          } catch {}
        })();
      }
    }
  }, [provinces, selectedProvinceId, form.shipping_province, form.shipping_city]);

  const onProvinceChange = async (value: string | null) => {
    const id = value || '';
    setSelectedProvinceId(id);
    const name = provinces.find(x => x.id === id)?.nombre || '';
    setForm(s => ({ ...s, shipping_province: name, shipping_city: '' }));
    setSelectedLocalityId('');
    setLocalities([]);
    if (id) {
      try {
        const res = await fetch(`https://apis.datos.gob.ar/georef/api/municipios?provincia=${encodeURIComponent(id)}&campos=id,nombre&max=500`);
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.municipios) ? json.municipios : [];
        setLocalities(list);
      } catch {}
    }
  };

  const onLocalityChange = (value: string | null) => {
    const id = value || '';
    setSelectedLocalityId(id);
    const name = localities.find(x => x.id === id)?.nombre || '';
    setForm(s => ({ ...s, shipping_city: name }));
  };

  const onChange = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm(s => ({ ...s, [k]: e.target.value }));
  const onSave = async () => {
    await update.mutateAsync(form);
  };
  const onAvatar = async (file?: File | null) => {
    setAvatarError(null);
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    if (!validTypes.includes(file.type)) {
      setAvatarError('Formato inválido. Usa JPG, PNG o WEBP.');
      showNotification({ message: 'Formato de imagen inválido', color: 'red' });
      return;
    }
    if (file.size > maxSize) {
      setAvatarError('La imagen supera 5MB.');
      showNotification({ message: 'La imagen supera el límite de 5MB', color: 'red' });
      return;
    }
    setAvatarLoading(true);
    try {
      const res = await upload.mutateAsync(file);
      setAvatarPreview(res?.url || null);
      showNotification({ message: 'Imagen de perfil actualizada', color: 'green' });
    } catch (e) {
      const er = e as Error;
      setAvatarError(er.message || 'Error al subir imagen');
      showNotification({ message: er.message || 'Error al subir imagen', color: 'red' });
    } finally {
      setAvatarLoading(false);
    }
  };
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const onChangePassword = async () => {
    setChangeError(null);
    if (!oldPass || !newPass || !confirmNew) { setChangeError('Completa todos los campos'); return; }
    if (newPass !== confirmNew) { setChangeError('La nueva contraseña no coincide'); return; }
    try {
      await change.mutateAsync({ old_password: oldPass, new_password: newPass });
      setOldPass(''); setNewPass(''); setConfirmNew('');
    } catch (e) {
      const er = e as Error; setChangeError(er.message || 'Error al cambiar contraseña');
    }
  }

  const profileImage = avatarPreview || data?.user?.profile_image || auth.state.user?.profileImage || '';
  const email = data?.user?.email || auth.state.user?.email || '';

  return (
    <Stack gap="md">
      <Title order={2}>Mi cuenta</Title>
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" align="center">
          <Group align="center">
            <Avatar src={profileImage} alt={form.name || email} radius="xl" size={80} />
            <Stack gap={4}>
              <Text fw={600}>{form.name || email}</Text>
              <Text c="dimmed" size="sm">{email}</Text>
              {avatarError && <Text c="red" size="sm">{avatarError}</Text>}
              {avatarLoading && <Group gap="xs"><Loader size="xs" /><Text size="sm">Subiendo imagen...</Text></Group>}
            </Stack>
          </Group>
          <Group>
            <FileButton onChange={(file) => onAvatar(file)} accept="image/*">
              {(props) => <Button {...props} variant="light" loading={avatarLoading}>Actualizar foto</Button>}
            </FileButton>
          </Group>
        </Group>
      </Paper>

      <Tabs value={activeTab} onChange={setActiveTab} radius="md" variant="outline">
        <Tabs.List grow>
          <Tabs.Tab value="info">Información de la cuenta</Tabs.Tab>
          <Tabs.Tab value="password">Cambio de contraseña</Tabs.Tab>
        </Tabs.List>
        <Divider my="md" />
        <Tabs.Panel value="info">
          <Paper withBorder p="md" radius="md">
            <Grid>
              <Grid.Col span={12}><TextInput label="Nombre" value={form.name} onChange={onChange('name')} /></Grid.Col>
              <Grid.Col span={12}><TextInput label="Teléfono" value={form.phone} onChange={onChange('phone')} /></Grid.Col>
              <Grid.Col span={12}><TextInput label="Calle" value={form.shipping_street} onChange={onChange('shipping_street')} /></Grid.Col>
              <Grid.Col span={12}><TextInput label="Código postal" value={form.shipping_postal_code} onChange={onChange('shipping_postal_code')} /></Grid.Col>
              <Grid.Col span={12}>
                <Select searchable label="Provincia" data={provinces.map(p => ({ label: p.nombre, value: p.id }))} value={selectedProvinceId || ''} onChange={onProvinceChange} />
              </Grid.Col>
              <Grid.Col span={12}>
                <Select searchable label="Ciudad" data={localities.map(l => ({ label: l.nombre, value: l.id }))} value={selectedLocalityId || ''} onChange={onLocalityChange} disabled={!selectedProvinceId} />
              </Grid.Col>
            </Grid>
            <Group justify="flex-end" mt="md">
              <Button onClick={onSave} loading={update.isPending}>Guardar cambios</Button>
            </Group>
          </Paper>
        </Tabs.Panel>
        <Tabs.Panel value="password">
          <Paper withBorder p="md" radius="md">
            <Stack>
              <PasswordInput label="Contraseña actual" value={oldPass} onChange={(e) => setOldPass(e.currentTarget.value)} />
              <PasswordInput label="Nueva contraseña" value={newPass} onChange={(e) => setNewPass(e.currentTarget.value)} />
              <PasswordInput label="Confirmar nueva" value={confirmNew} onChange={(e) => setConfirmNew(e.currentTarget.value)} />
              {changeError && <Text c="red">{changeError}</Text>}
              <Group>
                <Button color="green" onClick={onChangePassword} loading={change.isPending}>Actualizar contraseña</Button>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
