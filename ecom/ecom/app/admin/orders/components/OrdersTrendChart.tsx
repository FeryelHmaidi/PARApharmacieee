"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { AdminOrder } from "../types";

const RANGE_OPTIONS = [
  { label: "3M", description: "Last 3 months", value: "3m", months: 3 },
  { label: "6M", description: "Last 6 months", value: "6m", months: 6 },
  {
    label: "12M",
    description: "Last 12 months",
    value: "12m",
    months: 12,
  },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

type RevenueTooltipProps = TooltipProps<number, string> & {
  formatCurrency: (value: number) => string;
};

const OrdersTrendTooltip = ({
  active,
  payload,
  label,
  formatCurrency,
}: RevenueTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const bucket = (payload[0]?.payload ?? {}) as {
    fullLabel?: string;
  };
  const heading = bucket.fullLabel ?? label;
  const rawValue = typeof payload[0]?.value === "number" ? payload[0].value : 0;

  return (
    <div className="rounded-md border bg-background/90 px-3 py-2 text-sm shadow-md">
      {heading ? (
        <div className="font-medium text-foreground/80">{heading}</div>
      ) : null}
      <div className="mt-1 flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: chartConfig.revenue.color }}
          />
          {chartConfig.revenue.label}
        </span>
        <span className="font-semibold text-foreground">
          {formatCurrency(rawValue)}
        </span>
      </div>
    </div>
  );
};

type OrdersTrendChartProps = {
  orders?: AdminOrder[] | null;
  isLoading: boolean;
};

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export function OrdersTrendChart({ orders, isLoading }: OrdersTrendChartProps) {
  const [range, setRange] = useState<RangeValue>("6m");
  const selectedRange =
    RANGE_OPTIONS.find((option) => option.value === range) ?? RANGE_OPTIONS[1];

  const { data, headline, formatter, totalRevenue } = useMemo(() => {
    const months = selectedRange.months;
    const reference = new Date();
    reference.setDate(1);

    const currency = orders?.find((order) => order.currency)?.currency ?? "TND";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });

    const buckets = Array.from({ length: months }).map((_, index) => {
      const date = new Date(reference);
      date.setMonth(reference.getMonth() - (months - 1 - index));
      return {
        key: getMonthKey(date),
        label: date.toLocaleString("en-US", { month: "short" }),
        fullLabel: date.toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        }),
        revenue: 0,
      };
    });

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    (orders ?? []).forEach((order) => {
      if (!order.created_at) return;
      const created = new Date(order.created_at);
      const key = getMonthKey(created);
      const bucket = bucketMap.get(key);
      if (!bucket) return;
      bucket.revenue += order.total_amount ?? 0;
    });

    const recent = buckets[buckets.length - 1];
    const previous = buckets[buckets.length - 2];
    const deltaValue = (recent?.revenue ?? 0) - (previous?.revenue ?? 0);
    const deltaLabel = formatter.format(Math.abs(deltaValue));
    const headline =
      deltaValue === 0
        ? "No change vs previous month"
        : `${deltaValue > 0 ? "+" : "-"}${deltaLabel} vs previous month`;
    const totalRevenue = buckets.reduce(
      (sum, bucket) => sum + bucket.revenue,
      0
    );

    return { data: buckets, headline, formatter, totalRevenue };
  }, [orders, selectedRange]);

  const formatCurrency = (value: number) => formatter.format(value);

  return (
    <Card className="space-y-4 border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Revenue
          </div>
          <div className="text-2xl font-semibold">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-sm text-muted-foreground">{headline}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border bg-muted/50 p-1 text-xs font-medium">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={cn(
                "rounded-full px-3 py-1 transition",
                range === option.value
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="w-full">
        <ResponsiveContainer height={260}>
          <AreaChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              stroke="hsl(var(--muted-foreground))"
              width={40}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{
                stroke: "hsl(var(--muted-foreground))",
                strokeDasharray: "4 4",
              }}
              content={<OrdersTrendTooltip formatCurrency={formatCurrency} />}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={chartConfig.revenue.color}
              fillOpacity={0.2}
              fill={chartConfig.revenue.color}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: chartConfig.revenue.color }}
          />
          <span>{chartConfig.revenue.label}</span>
        </div>
        <span className="text-foreground">
          {formatCurrency(data[data.length - 1]?.revenue ?? 0)} last month
        </span>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading latest data…</p>
      ) : null}
    </Card>
  );
}
