"use client";
import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
