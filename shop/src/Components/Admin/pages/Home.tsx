"use client";
import { Box, Title, Text, Group, Paper, SimpleGrid, Loader, ThemeIcon, Center } from "@mantine/core";
import { AreaChart, BarChart, PieChart } from "@mantine/charts";
import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useGetSalesAnalytics } from "@/Api/admin/SalesApi";
import { FiShoppingCart, FiDollarSign, FiTrendingUp, FiBarChart2 } from "react-icons/fi";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const defaultEnd = dayjs();
  const defaultStart = defaultEnd.subtract(30, 'day');
  const [range, setRange] = useState<[Date | null, Date | null]>([
    defaultStart.toDate(),
    defaultEnd.toDate(),
  ]);

  const start_date = useMemo(() => (range?.[0] ? dayjs(range[0]).format('YYYY-MM-DD') : undefined), [range]);
  const end_date = useMemo(() => (range?.[1] ? dayjs(range[1]).format('YYYY-MM-DD') : undefined), [range]);

  const { data, isLoading, isError, error, refetch } = useGetSalesAnalytics(start_date, end_date);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      refetch();
    }
  }, [start_date, end_date, mounted, refetch]);

  const revenueSeries = useMemo(() => {
    return (data?.timeseries?.by_day || []).map(d => ({ date: d.date, revenue: Number(d.revenue || 0) }))
  }, [data]);

  const countSeries = useMemo(() => {
    return (data?.timeseries?.by_day || []).map(d => ({ date: d.date, count: Number(d.count || 0) }))
  }, [data]);

  const paymentPie = useMemo(() => {
    const mapMethod: Record<string, string> = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      MERCADO_PAGO: 'Mercado Pago',
      BANK_TRANSFER: 'Transferencia',
      OTHER: 'Otro',
    };
    return (data?.breakdowns?.payment_methods || []).map(pm => ({ name: mapMethod[pm.method] || pm.method, value: pm.count }))
  }, [data]);

  const sourcePie = useMemo(() => {
    const mapSource: Record<string, string> = {
      LOCAL: 'Local',
      SHOP: 'Tienda online',
      OTHER: 'Otro',
    };
    return (data?.breakdowns?.sources || []).map(sc => ({ name: mapSource[sc.source] || sc.source, value: sc.count }))
  }, [data]);

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
      <Group justify="space-between" align="center" mb="md">
        <Title>Analíticas de ventas</Title>
        <DatePickerInput
          type="range"
          label="Rango de fechas"
          placeholder="Selecciona rango"
          value={range}
          onChange={(value) => setRange([value[0] ? new Date(value[0]) : null, value[1] ? new Date(value[1]) : null])}
          maxDate={new Date()}
        />
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
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="lg">
            <Paper p="md" radius="md" withBorder>
              <Group>
                <ThemeIcon variant="light" size="lg" color="blue"><FiShoppingCart size={20} /></ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Total de ventas</Text>
                  <Title order={3}>{data.totals.sales_count}</Title>
                </div>
              </Group>
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Group>
                <ThemeIcon variant="light" size="lg" color="green"><FiDollarSign size={20} /></ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Total vendido</Text>
                  <Title order={3}>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(data.totals.revenue_total || 0)}</Title>
                </div>
              </Group>
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Group>
                <ThemeIcon variant="light" size="lg" color="violet"><FiBarChart2 size={20} /></ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Promedio por venta</Text>
                  <Title order={3}>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(data.totals.avg_order_value || 0)}</Title>
                </div>
              </Group>
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Group>
                <ThemeIcon variant="light" size="lg" color={data.growth.revenue_percent >= 0 ? "teal" : "red"}><FiTrendingUp size={20} /></ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Crecimiento (ingresos)</Text>
                  <Title order={3}>{data.growth.revenue_percent.toFixed(1)}%</Title>
                </div>
              </Group>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="sm">Ingresos diarios</Text>
              <AreaChart
                h={260}
                data={revenueSeries}
                dataKey="date"
                series={[{ name: "revenue", label: "Ingresos", color: "green.6" }]}
                xAxisLabel="Fecha"
                yAxisLabel="ARS"
                curveType="monotone"
                withLegend
                gridAxis="xy"
                valueFormatter={(value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value || 0))}
                yAxisProps={{
                  tickFormatter: (value: number) =>
                    new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                      notation: 'compact',
                      maximumFractionDigits: 0,
                    }).format(Number(value || 0)),
                }}
              />
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="sm">Ventas diarias</Text>
              <BarChart
                h={260}
                data={countSeries}
                dataKey="date"
                series={[{ name: "count", color: "blue.6" }]}
                xAxisLabel="Fecha"
                yAxisLabel="Ventas"
                gridAxis="xy"
              />
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="sm">Métodos de pago</Text>
              <PieChart
                withLabels
                labelsType="percent"
                labelsPosition="outside"
                withLabelsLine
                data={paymentPie as any}
                h={260}
                tooltipDataSource="segment"
                pieProps={{
                  label: ({ name, percent }) => `${Math.round((percent || 0) * 100)}% ${name}`
                }}
              />
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="sm">Origen de ventas</Text>
              <PieChart
                withLabels
                labelsType="percent"
                labelsPosition="outside"
                withLabelsLine
                data={sourcePie as any}
                h={260}
                tooltipDataSource="segment"
                pieProps={{
                  label: ({ name, percent }) => `${Math.round((percent || 0) * 100)}% ${name}`
                }}
              />
            </Paper>
          </SimpleGrid>
        </>
      )}
    </Box>
  );
}