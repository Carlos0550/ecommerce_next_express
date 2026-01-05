import { useEffect, useState } from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";
import { fetchActivePalette } from "@/components/Api/PalettesApi";

export default function ActivePaletteProvider({ children }: { children: React.ReactNode }) {
  const [paletteName, setPaletteName] = useState<string>("mono");
  const [colors, setColors] = useState<string[]>([
    '#ffffff','#f2f2f2','#e6e6e6','#cccccc','#b3b3b3','#999999','#7f7f7f','#666666','#4d4d4d','#1a1a1a'
  ]);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchActivePalette("admin");
        if (p?.name && Array.isArray(p.colors) && p.colors.length === 10) {
          const slug = String(p.name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'brand';
          setPaletteName(slug);
          setColors(p.colors);
        }
      } catch {
        
      }
    })();
  }, []);

  const toMantineTuple = (arr: string[]): MantineColorsTuple => {
    const fixed = arr.length >= 10 ? arr.slice(0, 10) : [...arr, ...Array(10 - arr.length).fill('#000000')];
    return fixed as unknown as MantineColorsTuple;
  };

  const theme = createTheme({
    colors: { [paletteName]: toMantineTuple(colors) },
    primaryColor: paletteName,
    primaryShade: { light: 6, dark: 6 },
    defaultRadius: 'md',
  });

  return <MantineProvider theme={theme} defaultColorScheme="auto">{children}</MantineProvider>;
}
