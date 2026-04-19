"use client";
import { useEffect, useState } from "react";
import { Paper, Title, Text, Group, Stack, Loader } from "@mantine/core";
import { adminService } from "@/services/admin.service";
import { useConfigStore } from "@/stores/useConfigStore";
import { PALETTES, type PaletteName } from "@/theme/palettes";
import { showNotification } from "@mantine/notifications";

const OPTIONS: { name: PaletteName; label: string; description: string }[] = [
  { name: "kuromi", label: "Kuromi", description: "Oscuro lila" },
  { name: "mono", label: "Blanco y Negro", description: "Claro minimalista" },
  { name: "blush", label: "Blush", description: "Blanco y rosa" },
];

export default function PaletteSelector() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PaletteName | null>(null);
  const activePalette = useConfigStore((s) => s.activePalette);
  const setPalette = useConfigStore((s) => s.setPalette);

  useEffect(() => {
    adminService
      .getActivePalette()
      .then((data) => {
        if (data?.palette) setPalette(data.palette as PaletteName);
      })
      .finally(() => setLoading(false));
  }, [setPalette]);

  const handleSelect = async (name: PaletteName) => {
    if (saving || name === activePalette) return;
    setSaving(name);
    try {
      await adminService.setActivePalette(name);
      setPalette(name);
      showNotification({ message: `Paleta "${PALETTES[name].name}" aplicada`, color: "green" });
    } catch {
      showNotification({ message: "Error al aplicar paleta", color: "red" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Paper p="lg" radius="md" withBorder>
      <Stack gap="md">
        <div>
          <Title order={3}>Paleta de colores</Title>
          <Text c="dimmed" size="sm">
            Elegí el esquema visual de tu tienda y panel. Se aplica al instante.
          </Text>
        </div>
        {loading ? (
          <Loader size="sm" />
        ) : (
          <Group gap="md" grow>
            {OPTIONS.map((opt) => {
              const tokens = PALETTES[opt.name];
              const active = activePalette === opt.name;
              return (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => handleSelect(opt.name)}
                  disabled={saving !== null}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    border: `2px solid ${active ? tokens.accent : tokens.border}`,
                    background: tokens.bgCard,
                    color: tokens.text,
                    cursor: saving ? "wait" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    textAlign: "left",
                    fontFamily: "inherit",
                    opacity: saving && saving !== opt.name ? 0.5 : 1,
                    transition: "all .2s ease",
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: tokens.bg, border: `1px solid ${tokens.border}` }} />
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: tokens.accent }} />
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: tokens.pink }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: tokens.textDim }}>
                      {opt.description}
                    </div>
                  </div>
                  {active && (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: tokens.buttonText,
                        background: tokens.accent,
                        padding: "3px 8px",
                        borderRadius: 999,
                        alignSelf: "flex-start",
                        letterSpacing: 0.5,
                      }}
                    >
                      ACTIVA
                    </div>
                  )}
                </button>
              );
            })}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
