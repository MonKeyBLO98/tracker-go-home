"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

interface RadialGaugeProps {
  label: string;
  value: number;
  total: number;
  color?: string;
}

export function RadialGauge({
  label,
  value,
  total,
  color = "var(--chart-2)",
}: RadialGaugeProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const data = [{ name: label, value: pct }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[180px] w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              fill={color}
              background
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{pct}%</span>
          <span className="text-xs text-muted-foreground">
            {value.toLocaleString("es")} / {total.toLocaleString("es")}
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm font-medium">{label}</p>
    </div>
  );
}
