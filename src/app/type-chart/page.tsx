"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Target } from "lucide-react";
import {
  POKEMON_TYPES,
  TYPE_COLORS,
  getEffectiveness,
  type PokemonType,
} from "./types";

export default function TypeChartPage() {
  const [selectedAttack, setSelectedAttack] = useState<PokemonType | null>(null);
  const [selectedDefense, setSelectedDefense] = useState<PokemonType | null>(null);
  const [mode, setMode] = useState<"attack" | "defense">("attack");

  const highlightedCells = useMemo(() => {
    const cells = new Set<string>();
    const type = mode === "attack" ? selectedAttack : selectedDefense;
    if (!type) return cells;

    for (const t of POKEMON_TYPES) {
      if (mode === "attack") {
        cells.add(`${type}-${t}`);
      } else {
        cells.add(`${t}-${type}`);
      }
    }
    return cells;
  }, [selectedAttack, selectedDefense, mode]);

  const defenseSummary = useMemo(() => {
    if (!selectedDefense) return null;
    const results: { type: PokemonType; mult: number }[] = [];
    for (const atk of POKEMON_TYPES) {
      results.push({ type: atk, mult: getEffectiveness(atk, selectedDefense) });
    }
    return {
      weak: results.filter((r) => r.mult > 1).sort((a, b) => b.mult - a.mult),
      resist: results.filter((r) => r.mult > 0 && r.mult < 1).sort((a, b) => a.mult - b.mult),
      immune: results.filter((r) => r.mult === 0),
    };
  }, [selectedDefense]);

  const attackSummary = useMemo(() => {
    if (!selectedAttack) return null;
    const results: { type: PokemonType; mult: number }[] = [];
    for (const def of POKEMON_TYPES) {
      results.push({ type: def, mult: getEffectiveness(selectedAttack, def) });
    }
    return {
      superEffective: results.filter((r) => r.mult > 1).sort((a, b) => b.mult - a.mult),
      notEffective: results.filter((r) => r.mult > 0 && r.mult < 1).sort((a, b) => a.mult - b.mult),
      immune: results.filter((r) => r.mult === 0),
    };
  }, [selectedAttack]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-500" />
          Tabla de Tipos
        </h2>
        <p className="text-muted-foreground">
          Efectividad de tipos en Pokemon GO — Click en un tipo para resaltar
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("attack"); setSelectedDefense(null); }}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            mode === "attack"
              ? "bg-red-500 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Target className="h-3.5 w-3.5" />
          Atacante
        </button>
        <button
          onClick={() => { setMode("defense"); setSelectedAttack(null); }}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            mode === "defense"
              ? "bg-blue-500 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Defensor
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Matrix */}
        <Card className="flex-1 overflow-x-auto">
          <CardContent className="p-3">
            <table className="border-collapse text-[10px] sm:text-xs w-full">
              <thead>
                <tr>
                  <th className="p-1 text-muted-foreground font-normal">Atk ↓ / Def →</th>
                  {POKEMON_TYPES.map((t) => (
                    <th
                      key={t}
                      className={`p-1 cursor-pointer transition-opacity ${
                        (mode === "attack" && selectedAttack === t) ||
                        (mode === "defense" && selectedDefense === t)
                          ? "opacity-100"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => {
                        if (mode === "attack") setSelectedAttack(t);
                        else setSelectedDefense(t);
                      }}
                    >
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-[8px] sm:text-[9px] font-bold ${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].text}`}
                      >
                        {t.slice(0, 3).toUpperCase()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {POKEMON_TYPES.map((atk) => (
                  <tr key={atk}>
                    <td
                      className={`p-1 cursor-pointer transition-opacity ${
                        (mode === "attack" && selectedAttack === atk) ||
                        (mode === "defense" && selectedDefense === atk)
                          ? "opacity-100"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => {
                        if (mode === "attack") setSelectedAttack(atk);
                        else setSelectedDefense(atk);
                      }}
                    >
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-[8px] sm:text-[9px] font-bold ${TYPE_COLORS[atk].bg} ${TYPE_COLORS[atk].text}`}
                      >
                        {atk.slice(0, 3).toUpperCase()}
                      </div>
                    </td>
                    {POKEMON_TYPES.map((def) => {
                      const mult = getEffectiveness(atk, def);
                      const isHighlighted = highlightedCells.has(`${atk}-${def}`);
                      const cellColor =
                        mult === 0
                          ? "bg-gray-500/20 text-gray-400"
                          : mult === 0.5
                          ? "bg-red-500/15 text-red-400"
                          : mult === 2
                          ? "bg-green-500/20 text-green-400 font-bold"
                          : "text-muted-foreground/60";

                      return (
                        <td
                          key={`${atk}-${def}`}
                          className={`p-0.5 text-center transition-all ${cellColor} ${
                            isHighlighted ? "ring-1 ring-white/40" : ""
                          }`}
                        >
                          <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded">
                            {mult === 0 ? "0" : mult === 0.5 ? "½" : mult === 2 ? "2" : "1"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Summary panel */}
        <div className="xl:w-72 space-y-4">
          {/* Selected type info */}
          {(selectedAttack || selectedDefense) && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {mode === "attack" && selectedAttack && (
                    <>
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${TYPE_COLORS[selectedAttack].bg} ${TYPE_COLORS[selectedAttack].text}`}
                      >
                        {selectedAttack.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm capitalize">{selectedAttack}</div>
                        <div className="text-xs text-muted-foreground">Tipo atacante</div>
                      </div>
                    </>
                  )}
                  {mode === "defense" && selectedDefense && (
                    <>
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${TYPE_COLORS[selectedDefense].bg} ${TYPE_COLORS[selectedDefense].text}`}
                      >
                        {selectedDefense.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm capitalize">{selectedDefense}</div>
                        <div className="text-xs text-muted-foreground">Tipo defensor</div>
                      </div>
                    </>
                  )}
                </div>

                {mode === "attack" && attackSummary && (
                  <div className="space-y-2 text-xs">
                    {attackSummary.superEffective.length > 0 && (
                      <div>
                        <div className="text-green-400 font-medium mb-1">Súper eficaz (2x)</div>
                        <div className="flex flex-wrap gap-1">
                          {attackSummary.superEffective.map((r) => (
                            <Badge
                              key={r.type}
                              variant="outline"
                              className={`text-[10px] ${TYPE_COLORS[r.type].bg} ${TYPE_COLORS[r.type].text} border-none`}
                            >
                              {r.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {attackSummary.notEffective.length > 0 && (
                      <div>
                        <div className="text-red-400 font-medium mb-1">No muy eficaz (½x)</div>
                        <div className="flex flex-wrap gap-1">
                          {attackSummary.notEffective.map((r) => (
                            <Badge
                              key={r.type}
                              variant="outline"
                              className={`text-[10px] ${TYPE_COLORS[r.type].bg} ${TYPE_COLORS[r.type].text} border-none`}
                            >
                              {r.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {attackSummary.immune.length > 0 && (
                      <div>
                        <div className="text-gray-400 font-medium mb-1">Inmune (0x)</div>
                        <div className="flex flex-wrap gap-1">
                          {attackSummary.immune.map((r) => (
                            <Badge
                              key={r.type}
                              variant="outline"
                              className={`text-[10px] ${TYPE_COLORS[r.type].bg} ${TYPE_COLORS[r.type].text} border-none`}
                            >
                              {r.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {mode === "defense" && defenseSummary && (
                  <div className="space-y-2 text-xs">
                    {defenseSummary.weak.length > 0 && (
                      <div>
                        <div className="text-red-400 font-medium mb-1">Débil contra (2x)</div>
                        <div className="flex flex-wrap gap-1">
                          {defenseSummary.weak.map((r) => (
                            <Badge
                              key={r.type}
                              variant="outline"
                              className={`text-[10px] ${TYPE_COLORS[r.type].bg} ${TYPE_COLORS[r.type].text} border-none`}
                            >
                              {r.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {defenseSummary.resist.length > 0 && (
                      <div>
                        <div className="text-green-400 font-medium mb-1">Resiste (½x)</div>
                        <div className="flex flex-wrap gap-1">
                          {defenseSummary.resist.map((r) => (
                            <Badge
                              key={r.type}
                              variant="outline"
                              className={`text-[10px] ${TYPE_COLORS[r.type].bg} ${TYPE_COLORS[r.type].text} border-none`}
                            >
                              {r.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {defenseSummary.immune.length > 0 && (
                      <div>
                        <div className="text-gray-400 font-medium mb-1">Inmune (0x)</div>
                        <div className="flex flex-wrap gap-1">
                          {defenseSummary.immune.map((r) => (
                            <Badge
                              key={r.type}
                              variant="outline"
                              className={`text-[10px] ${TYPE_COLORS[r.type].bg} ${TYPE_COLORS[r.type].text} border-none`}
                            >
                              {r.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="font-medium text-sm mb-2">Leyenda</div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-[10px]">
                  2
                </span>
                <span className="text-green-400">Súper eficaz</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/60 text-[10px]">
                  1
                </span>
                <span className="text-muted-foreground">Efectividad normal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-red-500/15 text-red-400 flex items-center justify-center text-[10px]">
                  ½
                </span>
                <span className="text-red-400">No muy eficaz</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-gray-500/20 text-gray-400 flex items-center justify-center text-[10px]">
                  0
                </span>
                <span className="text-gray-400">Inmune</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
