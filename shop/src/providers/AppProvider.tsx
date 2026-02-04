"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useConfigStore } from "@/stores/useConfigStore";
import { queryClient as globalQueryClient } from "@/config/queryClient";
import { MantineProvider, createTheme, MantineColorsTuple } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
function getQueryClient() {
  return globalQueryClient;
}
const toMantineTuple = (arr: string[]): MantineColorsTuple => {
  const fixed =
    arr.length >= 10
      ? arr.slice(0, 10)
      : [...arr, ...Array(10 - arr.length).fill("#000000")];
  return fixed as unknown as MantineColorsTuple;
};
const defaultColors = [
  "#ffffff",
  "#f2f2f2",
  "#e6e6e6",
  "#cccccc",
  "#b3b3b3",
  "#999999",
  "#7f7f7f",
  "#666666",
  "#4d4d4d",
  "#1a1a1a",
];
type Props = {
  children: React.ReactNode;
};
export default function AppProvider({ children }: Props) {
  const { fetchConfig, colors, paletteName } = useConfigStore();
  const [queryClient] = useState(() => getQueryClient());
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);
  const theme = createTheme({
    fontFamily: "var(--font-stack), Arial, Helvetica, sans-serif",
    headings: { fontFamily: "var(--font-stack), Arial, Helvetica, sans-serif" },
    colors: { [paletteName]: toMantineTuple(colors || defaultColors) },
    primaryColor: paletteName,
    primaryShade: { light: 6, dark: 6 },
    defaultRadius: "md",
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}
