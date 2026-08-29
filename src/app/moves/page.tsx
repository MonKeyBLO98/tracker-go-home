"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Swords, Flame } from "lucide-react";
import { getMoves, getMoveStats } from "./actions";
import { MOVE_TYPES, MOVE_TYPE_COLORS, type MoveRow } from "./types";

const CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "fast", label: "Rápidos" },
  { id: "charged", label: "Cargados" },
];

export default function MoveRankingsPage() {
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    fast: number;
    charged: number;
  } | null>(null);
  const [category, setCategory] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return Promise.all([getMoves(category, typeFilter), getMoveStats()]);
      })
      .then(([movesData, statsData]) => {
        if (!active) return;
        setMoves(movesData);
        setStats(statsData);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, typeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Move Rankings
        </h2>
        <p className="text-muted-foreground">
          {stats
            ? `${stats.total} movimientos (${stats.fast} rápidos, ${stats.charged} cargados)`
            : "Rankings de movimientos de Pokemon GO"}
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              category === c.id
                ? "bg-yellow-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
            typeFilter === "all"
              ? "bg-white/20 text-white ring-1 ring-white/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todos
        </button>
        {MOVE_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              typeFilter === t
                ? `${MOVE_TYPE_COLORS[t]} ring-1 ring-white/30`
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.slice(0, 3).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : moves.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay movimientos para estos filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">#</th>
                    <th className="p-3 font-medium">Movimiento</th>
                    <th className="p-3 font-medium">Tipo</th>
                    <th className="p-3 font-medium">Cat</th>
                    <th className="p-3 font-medium text-right">Poder</th>
                    <th className="p-3 font-medium text-right">
                      {category === "fast" ? "Energía" : "Costo"}
                    </th>
                    <th className="p-3 font-medium text-right">CD</th>
                    {(category === "all" || category === "fast") && (
                      <th className="p-3 font-medium text-right">DPS</th>
                    )}
                    {(category === "all" || category === "charged") && (
                      <th className="p-3 font-medium text-right">DPE</th>
                    )}
                    <th className="p-3 font-medium">Arquetipo</th>
                  </tr>
                </thead>
                <tbody>
                  {moves.map((m, idx) => (
                    <tr
                      key={m.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3 text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            MOVE_TYPE_COLORS[m.type as keyof typeof MOVE_TYPE_COLORS] || ""
                          } border-none`}
                        >
                          {m.type}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            m.category === "fast"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}
                        >
                          {m.category === "fast" ? (
                            <Swords className="inline h-2.5 w-2.5 mr-0.5" />
                          ) : (
                            <Flame className="inline h-2.5 w-2.5 mr-0.5" />
                          )}
                          {m.category === "fast" ? "Rápido" : "Cargado"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {m.power > 0 ? m.power : "-"}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {m.category === "fast"
                          ? `+${m.energyGain}`
                          : m.energy > 0
                          ? m.energy
                          : "-"}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                        {(m.cooldown / 1000).toFixed(1)}s
                      </td>
                      {(category === "all" || category === "fast") && (
                        <td className="p-3 text-right font-mono text-xs">
                          {m.dps !== null ? m.dps.toFixed(1) : "-"}
                        </td>
                      )}
                      {(category === "all" || category === "charged") && (
                        <td className="p-3 text-right font-mono text-xs">
                          {m.dpe !== null ? (
                            <span
                              className={
                                m.dpe >= 1.5
                                  ? "text-green-500 font-bold"
                                  : m.dpe >= 1.0
                                  ? "text-blue-500"
                                  : "text-muted-foreground"
                              }
                            >
                              {m.dpe.toFixed(2)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      <td className="p-3 text-xs text-muted-foreground">
                        {m.archetype || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
