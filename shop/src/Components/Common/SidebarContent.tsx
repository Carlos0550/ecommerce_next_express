"use client";
import { Stack, Paper, Group, Avatar, Text, Button, Box, Flex } from "@mantine/core";
import Link from "next/link";
import { ColorSchemeToggle } from "./ColorSchemeToggle";
import React from "react";
export type MenuItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};
type SidebarContentProps = {
  business: {
    name?: string | null;
    favicon?: string | null;
    phone?: string | null;
  } | null;
  menuItems: MenuItem[];
  pathname: string;
  onLinkClick?: () => void;
  topExtra?: React.ReactNode;
  bottomExtra?: React.ReactNode;
};
export function SidebarContent({
  business,
  menuItems,
  pathname,
  onLinkClick,
  topExtra,
  bottomExtra,
}: SidebarContentProps) {
  const isActive = (href: string) => {
    if (href === "/" || href === "/admin") return pathname === href;
    return pathname?.startsWith(href);
  };
  return (
    <Flex direction="column" h="100%" justify="space-between">
      <Stack gap="md">
        <Paper p="md" radius="md" withBorder>
          <Group align="center" justify="space-between">
            <Group align="center">
              <Avatar 
                src={business?.favicon || `https://ui-avatars.com/api/?name=${encodeURIComponent(business?.name || "Tu tienda Online")}&background=random&color=fff`} 
                radius="xl" 
                alt={business?.name || undefined}
              />
              <Stack gap={2}>
                <Text fw={600} style={{ maxWidth: 120 }} truncate="end">
                  {business?.name || "Tu tienda Online"}
                </Text>
              </Stack>
            </Group>
            <ColorSchemeToggle />
          </Group>
          {topExtra}
        </Paper>
        <Text size="xs" fw={700} c="dimmed">
          MENÚ
        </Text>
        <Stack gap="xs">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                variant={active ? "default" : "subtle"}
                radius="md"
                fullWidth
                justify="flex-start"
                leftSection={<Icon size={18} />}
                onClick={onLinkClick}
                style={
                  active
                    ? {
                        background: "var(--mantine-color-white)",
                        color: "var(--mantine-color-black)",
                        boxShadow: "var(--mantine-shadow-xs)",
                      }
                    : undefined
                }
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>
      </Stack>
      <Box>
        {bottomExtra}
      </Box>
    </Flex>
  );
}
