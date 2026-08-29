"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HomeGameSlice } from "@/app/charts/actions";
import { legendStyle, tooltipStyle } from "./shared";

export function HomeGamesChart({ data }: { data: HomeGameSlice[] }) {
  const rows = data.map((g) => ({
    game: g.gameName,
    Registrados: g.registered,
    Faltantes: Math.max(0, g.totalSpecies - g.registered),
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={rows}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="game"
            tickLine={false}
            axisLine={false}
            width={110}
            fontSize={12}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Legend wrapperStyle={legendStyle} />
          <Bar
            dataKey="Registrados"
            stackId="a"
            fill="var(--chart-3)"
            maxBarSize={18}
          />
          <Bar
            dataKey="Faltantes"
            stackId="a"
            fill="var(--muted)"
            opacity={0.5}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
