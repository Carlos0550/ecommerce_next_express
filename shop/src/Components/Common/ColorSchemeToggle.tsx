"use client";
import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { useSyncExternalStore } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return (
      <ActionIcon variant="light" aria-label="Toggle color scheme">
        <FiMoon />
      </ActionIcon>
    );
  }

  const isDark = colorScheme === "dark";
  return (
    <ActionIcon
      variant="light"
      aria-label="Toggle color scheme"
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
      title={isDark ? "Cambiar a claro" : "Cambiar a oscuro"}
    >
      {isDark ? <FiSun /> : <FiMoon />}
    </ActionIcon>
  );
}
