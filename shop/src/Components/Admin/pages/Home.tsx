"use client";
import {
  Box,
  Title,
  Text,
  Group,
  Paper,
  SimpleGrid,
  Loader,
  ThemeIcon,
  Center,
  Button,
  Tooltip,
  Stack,
  Badge,
  Divider,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { LineChart, BarChart, PieChart } from "@mui/x-charts";
import dayjs from "dayjs";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useGetSalesAnalytics } from "@/Api/admin/SalesApi";
import {
  FiShoppingCart,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiBarChart2,
  FiPackage,
  FiCalendar,
  FiClock,
  FiAward,
  FiDownload,
} from "react-icons/fi";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}

type RangePreset = "today" | "7d" | "30d" | "month" | "quarter" | "custom";

const RANGE_PRESETS: { label: string; value: RangePreset }[] = [
  { label: "Hoy", value: "today" },
  { label: "7 días", value: "7d" },
  { label: "30 días", value: "30d" },
  { label: "Este mes", value: "month" },
  { label: "Trimestre", value: "quarter" },
];

function getPresetRange(preset: RangePreset): [Date, Date] {
  const now = dayjs();
  switch (preset) {
    case "today":
      return [now.startOf("day").toDate(), now.endOf("day").toDate()];
    case "7d":
      return [now.subtract(6, "day").startOf("day").toDate(), now.endOf("day").toDate()];
    case "30d":
      return [now.subtract(29, "day").startOf("day").toDate(), now.endOf("day").toDate()];
    case "month":
      return [now.startOf("month").toDate(), now.endOf("day").toDate()];
    case "quarter":
      return [now.subtract(3, "month").startOf("day").toDate(), now.endOf("day").toDate()];
    default:
      return [now.subtract(29, "day").startOf("day").toDate(), now.endOf("day").toDate()];
  }
}

interface TrendIndicatorProps {
  value: number;
  suffix?: string;
}

function TrendIndicator({ value, suffix = "%" }: TrendIndicatorProps) {
  const isPositive = value >= 0;
  const color = isPositive ? "teal" : "red";
  const Icon = isPositive ? FiTrendingUp : FiTrendingDown;
  
  return (
    <Group gap={4}>
      <Icon size={14} color={isPositive ? "#12b886" : "#fa5252"} />
      <Text size="xs" c={color} fw={500}>
        {isPositive ? "+" : ""}{value.toFixed(1)}{suffix}
      </Text>
    </Group>
  );
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
}

function KPICard({ icon, label, value, color, trend, trendLabel, subtitle }: KPICardProps) {
  return (
    <Paper p="md" radius="md" withBorder style={{ position: "relative", overflow: "hidden" }}>
      <Box
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: `linear-gradient(135deg, var(--mantine-color-${color}-1) 0%, transparent 100%)`,
          borderRadius: "0 0 0 100%",
        }}
      />
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="sm" c="dimmed">{label}</Text>
          <Title order={3}>{value}</Title>
          {trend !== undefined && (
            <Tooltip label={trendLabel || "vs periodo anterior"}>
              <Box>
                <TrendIndicator value={trend} />
              </Box>
            </Tooltip>
          )}
          {subtitle && (
            <Text size="xs" c="dimmed">{subtitle}</Text>
          )}
        </Stack>
        <ThemeIcon variant="light" size="lg" color={color} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

const MUI_COLORS = {
  green: "#40c057",
  blue: "#228be6",
  violet: "#7950f2",
  cyan: "#15aabf",
  teal: "#12b886",
  orange: "#fd7e14",
  pink: "#e64980",
  grape: "#be4bdb",
  indigo: "#4c6ef5",
  gray: "#868e96",
};

export default function Home() {
  const mounted = useIsMounted();
  const [activePreset, setActivePreset] = useState<RangePreset>("30d");
  const defaultRange = getPresetRange("30d");
  const [range, setRange] = useState<[Date | null, Date | null]>(defaultRange);

  const start_date = useMemo(() => (range?.[0] ? dayjs(range[0]).format("YYYY-MM-DD") : undefined), [range]);
  const end_date = useMemo(() => (range?.[1] ? dayjs(range[1]).format("YYYY-MM-DD") : undefined), [range]);

  const { data, isLoading, isError, error, refetch } = useGetSalesAnalytics(start_date, end_date);

  useEffect(() => {
    if (mounted) {
      refetch();
    }
  }, [start_date, end_date, mounted, refetch]);

  const handlePresetClick = (preset: RangePreset) => {
    setActivePreset(preset);
    const newRange = getPresetRange(preset);
    setRange(newRange);
  };

  const handleCustomRange = (value: [(Date | string | null), (Date | string | null)]) => {
    setActivePreset("custom");
    const toDate = (v: Date | string | null) => {
      if (!v) return null;
      return v instanceof Date ? v : new Date(v);
    };
    setRange([toDate(value[0]), toDate(value[1])]);
  };

  const revenueSeries = useMemo(() => {
    return (data?.timeseries?.by_day || []).map(d => ({ date: d.date, revenue: Number(d.revenue || 0) }));
  }, [data]);

  const countSeries = useMemo(() => {
    return (data?.timeseries?.by_day || []).map(d => ({ date: d.date, count: Number(d.count || 0) }));
  }, [data]);

  const paymentPieData = useMemo(() => {
    const mapMethod: Record<string, string> = {
      EFECTIVO: "Efectivo",
      TARJETA: "Tarjeta",
      TRANSFERENCIA: "Transferencia",
      QR: "QR",
      NINGUNO: "Ninguno",
    };
    const colors = [MUI_COLORS.blue, MUI_COLORS.green, MUI_COLORS.violet, MUI_COLORS.orange, MUI_COLORS.gray];
    return (data?.breakdowns?.payment_methods || []).map((pm, idx) => ({
      id: idx,
      label: mapMethod[pm.method] || pm.method,
      value: pm.count,
      color: colors[idx % colors.length],
    }));
  }, [data]);

  const sourcePieData = useMemo(() => {
    const mapSource: Record<string, string> = {
      CAJA: "Local/Caja",
      WEB: "Tienda online",
    };
    const colors = [MUI_COLORS.teal, MUI_COLORS.cyan, MUI_COLORS.indigo];
    return (data?.breakdowns?.sources || []).map((sc, idx) => ({
      id: idx,
      label: mapSource[sc.source] || sc.source,
      value: sc.count,
      color: colors[idx % colors.length],
    }));
  }, [data]);

  const categoryPieData = useMemo(() => {
    const colors = [MUI_COLORS.pink, MUI_COLORS.grape, MUI_COLORS.violet, MUI_COLORS.indigo, MUI_COLORS.blue, MUI_COLORS.cyan, MUI_COLORS.teal, MUI_COLORS.green];
    return (data?.breakdowns?.by_category || []).map((cat, idx) => ({
      id: idx,
      label: cat.name,
      value: cat.revenue,
      color: colors[idx % colors.length],
    }));
  }, [data]);

  const topProductsData = useMemo(() => {
    return (data?.top_products || []).map(p => ({
      product: p.title.length > 15 ? p.title.substring(0, 15) + "..." : p.title,
      cantidad: p.quantity_sold,
      ingresos: p.revenue,
    }));
  }, [data]);

  const hourlyData = useMemo(() => {
    return (data?.breakdowns?.by_hour || []).map(h => ({
      hora: `${h.hour.toString().padStart(2, "0")}:00`,
      ventas: h.count,
      ingresos: h.revenue,
    }));
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleExportCSV = () => {
    if (!data) return;

    const rows = [
      ["Métrica", "Valor"],
      ["Total de ventas", data.totals.sales_count?.toString() || "0"],
      ["Total vendido", formatCurrency(data.totals.revenue_total || 0)],
      ["Promedio por venta", formatCurrency(data.totals.avg_order_value || 0)],
      ["Unidades vendidas", data.totals.total_units_sold?.toString() || "0"],
      ["Impuestos recaudados", formatCurrency(data.totals.total_tax_collected || 0)],
      [""],
      ["Ventas diarias"],
      ["Fecha", "Ventas", "Ingresos"],
      ...(data.timeseries?.by_day || []).map(d => [d.date, d.count.toString(), formatCurrency(d.revenue)]),
    ];

    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte_ventas_${start_date}_${end_date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) {
    return (
      <Box h={400}>
        <Center h="100%">
          <Loader size="lg" />
        </Center>
      </Box>
    );
  }

  return (
    <Box>
      <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
        <Title>Analíticas de ventas</Title>
        
        <Stack gap="xs" align="flex-end">
          <Group gap="xs">
            {RANGE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                size="xs"
                variant={activePreset === preset.value ? "filled" : "light"}
                onClick={() => handlePresetClick(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </Group>
          <Group gap="xs">
            <DatePickerInput
              type="range"
              placeholder="Rango personalizado"
              value={range}
              onChange={handleCustomRange}
              maxDate={new Date()}
              size="xs"
              w={260}
            />
            <Tooltip label="Exportar a CSV">
              <Button
                size="xs"
                variant="light"
                color="gray"
                onClick={handleExportCSV}
                disabled={!data}
              >
                <FiDownload size={16} />
              </Button>
            </Tooltip>
          </Group>
        </Stack>
      </Group>

      {isLoading && (
        <Group align="center" justify="center" mt="lg">
          <Loader />
          <Text>Obteniendo analíticas...</Text>
        </Group>
      )}
      {isError && (
        <Text c="red">{(error as Error)?.message || "Error al cargar analíticas"}</Text>
      )}

      {data && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} spacing="md" mb="lg">
            <KPICard
              icon={<FiShoppingCart size={20} />}
              label="Total de ventas"
              value={data.totals.sales_count}
              color="blue"
              trend={data.growth.count_percent}
              trendLabel="vs periodo anterior"
            />

            <KPICard
              icon={<FiDollarSign size={20} />}
              label="Total vendido"
              value={formatCurrency(data.totals.revenue_total || 0)}
              color="green"
              trend={data.growth.revenue_percent}
              trendLabel="vs periodo anterior"
            />

            <KPICard
              icon={<FiBarChart2 size={20} />}
              label="Promedio por venta"
              value={formatCurrency(data.totals.avg_order_value || 0)}
              color="violet"
            />

            <KPICard
              icon={<FiPackage size={20} />}
              label="Unidades vendidas"
              value={data.totals.total_units_sold || 0}
              color="orange"
              trend={data.growth.units_percent}
              trendLabel="vs periodo anterior"
            />

            <KPICard
              icon={<FiAward size={20} />}
              label="Mejor día"
              value={data.totals.best_day?.date ? dayjs(data.totals.best_day.date).format("DD/MM") : "-"}
              color="teal"
              subtitle={data.totals.best_day?.revenue ? formatCurrencyCompact(data.totals.best_day.revenue) : undefined}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>Ingresos diarios</Text>
                <Badge variant="light" color="green">
                  {formatCurrencyCompact(data.totals.revenue_total || 0)} total
                </Badge>
              </Group>
              <Box h={280}>
                <LineChart
                  xAxis={[{
                    data: revenueSeries.map((_, i) => i),
                    scaleType: "point",
                    valueFormatter: (value: number) => revenueSeries[value]?.date || "",
                  }]}
                  yAxis={[{
                    valueFormatter: (value: number | null) => formatCurrencyCompact(Number(value || 0)),
                  }]}
                  series={[
                    {
                      data: revenueSeries.map(d => d.revenue),
                      area: true,
                      color: MUI_COLORS.green,
                      curve: "catmullRom",
                      label: "Ingresos",
                      valueFormatter: (value) => formatCurrency(Number(value || 0)),
                    },
                  ]}
                  height={260}
                  margin={{ left: 70, right: 20, top: 20, bottom: 30 }}
                  grid={{ vertical: true, horizontal: true }}
                  hideLegend
                />
              </Box>
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>Ventas diarias</Text>
                <Badge variant="light" color="blue">
                  {data.totals.sales_count} ventas
                </Badge>
              </Group>
              <Box h={280}>
                <BarChart
                  xAxis={[{
                    data: countSeries.map(d => d.date),
                    scaleType: "band",
                  }]}
                  series={[
                    {
                      data: countSeries.map(d => d.count),
                      color: MUI_COLORS.blue,
                      label: "Ventas",
                    },
                  ]}
                  height={260}
                  margin={{ left: 50, right: 20, top: 20, bottom: 50 }}
                  grid={{ horizontal: true }}
                  hideLegend
                />
              </Box>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>
                  <Group gap={8}>
                    <FiAward size={16} />
                    Top 5 Productos más vendidos
                  </Group>
                </Text>
              </Group>
              {topProductsData.length > 0 ? (
                <Box h={280}>
                  <BarChart
                    yAxis={[{
                      data: topProductsData.map(d => d.product),
                      scaleType: "band",
                    }]}
                    xAxis={[{
                      label: "Cantidad vendida",
                    }]}
                    series={[
                      {
                        data: topProductsData.map(d => d.cantidad),
                        color: MUI_COLORS.violet,
                        label: "Cantidad",
                      },
                    ]}
                    layout="horizontal"
                    height={260}
                    margin={{ left: 100, right: 20, top: 20, bottom: 40 }}
                    grid={{ vertical: true }}
                    hideLegend
                  />
                </Box>
              ) : (
                <Center h={260}>
                  <Text c="dimmed">No hay datos de productos</Text>
                </Center>
              )}
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>
                  <Group gap={8}>
                    <FiClock size={16} />
                    Ventas por hora del día
                  </Group>
                </Text>
              </Group>
              <Box h={280}>
                <BarChart
                  xAxis={[{
                    data: hourlyData.map(d => d.hora),
                    scaleType: "band",
                  }]}
                  series={[
                    {
                      data: hourlyData.map(d => d.ventas),
                      color: MUI_COLORS.cyan,
                      label: "Ventas",
                    },
                  ]}
                  height={260}
                  margin={{ left: 50, right: 20, top: 20, bottom: 50 }}
                  grid={{ horizontal: true }}
                  hideLegend
                />
              </Box>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mt="md">
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="sm">Métodos de pago</Text>
              {paymentPieData.length > 0 ? (
                <Box h={240}>
                  <PieChart
                    series={[
                      {
                        data: paymentPieData,
                        highlightScope: { fade: "global", highlight: "item" },
                        faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
                        arcLabel: (item) => `${((item.value / paymentPieData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%`,
                        arcLabelMinAngle: 20,
                        innerRadius: 30,
                        outerRadius: 80,
                        paddingAngle: 2,
                        cornerRadius: 4,
                      },
                    ]}
                    height={220}
                    margin={{ right: 100 }}
                  />
                </Box>
              ) : (
                <Center h={220}>
                  <Text c="dimmed">Sin datos</Text>
                </Center>
              )}
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="sm">Origen de ventas</Text>
              {sourcePieData.length > 0 ? (
                <Box h={240}>
                  <PieChart
                    series={[
                      {
                        data: sourcePieData,
                        highlightScope: { fade: "global", highlight: "item" },
                        faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
                        arcLabel: (item) => `${((item.value / sourcePieData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%`,
                        arcLabelMinAngle: 20,
                        innerRadius: 30,
                        outerRadius: 80,
                        paddingAngle: 2,
                        cornerRadius: 4,
                      },
                    ]}
                    height={220}
                    margin={{ right: 100 }}
                  />
                </Box>
              ) : (
                <Center h={220}>
                  <Text c="dimmed">Sin datos</Text>
                </Center>
              )}
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="sm">Ingresos por categoría</Text>
              {categoryPieData.length > 0 ? (
                <Box h={240}>
                  <PieChart
                    series={[
                      {
                        data: categoryPieData,
                        highlightScope: { fade: "global", highlight: "item" },
                        faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
                        arcLabel: (item) => `${((item.value / categoryPieData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%`,
                        arcLabelMinAngle: 20,
                        innerRadius: 30,
                        outerRadius: 80,
                        paddingAngle: 2,
                        cornerRadius: 4,
                        valueFormatter: (item) => formatCurrencyCompact(item.value),
                      },
                    ]}
                    height={220}
                    margin={{ right: 100 }}
                  />
                </Box>
              ) : (
                <Center h={220}>
                  <Text c="dimmed">Sin datos</Text>
                </Center>
              )}
            </Paper>
          </SimpleGrid>

          <Divider my="lg" />

          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">
              <Group gap={8}>
                <FiCalendar size={16} />
                Resumen del periodo
              </Group>
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <Box>
                <Text size="sm" c="dimmed">Periodo actual</Text>
                <Text fw={500}>{data.range.start_date} al {data.range.end_date}</Text>
                <Text size="xs" c="dimmed">{data.range.days} días</Text>
              </Box>
              <Box>
                <Text size="sm" c="dimmed">Impuestos recaudados</Text>
                <Text fw={500}>{formatCurrency(data.totals.total_tax_collected || 0)}</Text>
              </Box>
              <Box>
                <Text size="sm" c="dimmed">Periodo anterior</Text>
                <Text fw={500}>{data.previous.sales_count} ventas</Text>
                <Text size="xs" c="dimmed">{formatCurrency(data.previous.revenue_total || 0)}</Text>
              </Box>
              <Box>
                <Text size="sm" c="dimmed">Peor día</Text>
                <Text fw={500}>
                  {data.totals.worst_day?.date ? dayjs(data.totals.worst_day.date).format("DD/MM/YYYY") : "-"}
                </Text>
                <Text size="xs" c="dimmed">
                  {data.totals.worst_day?.revenue ? formatCurrency(data.totals.worst_day.revenue) : "-"}
                </Text>
              </Box>
            </SimpleGrid>
          </Paper>
        </>
      )}
    </Box>
  );
}