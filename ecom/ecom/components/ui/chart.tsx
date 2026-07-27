"use client";

import * as React from "react";
import type { PropsWithChildren } from "react";
import type { TooltipProps } from "recharts";
import { Tooltip as RechartsTooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { label?: string; color?: string }>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue>({ config: {} });

export type ChartContainerProps = PropsWithChildren<{
  config: ChartConfig;
  className?: string;
}>;

export function ChartContainer({
  config,
  className,
  children,
}: ChartContainerProps) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("rounded-xl border bg-card p-4", className)}>
        {children}
      </div>
    </ChartContext.Provider>
  );
}

type ChartTooltipContentProps = TooltipProps<number, string> & {
  config: ChartConfig;
};

const ChartTooltipContent = ({
  active,
  payload,
  label,
  config,
}: ChartTooltipContentProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border bg-background/90 px-3 py-2 text-sm shadow-md">
      {label && <div className="font-medium text-foreground/80">{label}</div>}
      <div className="mt-1 flex flex-col gap-1">
        {payload.map((item) => {
          const configEntry = item?.name ? config[item.name] : undefined;
          return (
            <div
              key={item.name}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color ?? configEntry?.color }}
                />
                {configEntry?.label ?? item.name}
              </span>
              <span className="font-semibold text-foreground">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function ChartTooltip({
  content,
  ...props
}: TooltipProps<number, string>) {
  const ctx = React.useContext(ChartContext);
  const fallbackContent = (tooltipProps: TooltipProps<number, string>) => (
    <ChartTooltipContent {...tooltipProps} config={ctx.config} />
  );

  return <RechartsTooltip {...props} content={content ?? fallbackContent} />;
}

// ChartLegend intentionally omitted. Compose bespoke legends in each chart to avoid Legend typing issues.
