"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search, X, Shield, Sword, AlertTriangle } from "lucide-react";
import { searchPokemonForTeam, analyzeTeam } from "./actions";
import { TYPE_COLORS } from "@/app/type-chart/types";
import type { TeamPokemon, TeamAnalysis } from "./types";

export default function TeamBuilderPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TeamPokemon[]>([]);
  const [team, setTeam] = useState<TeamPokemon[]>([]);
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const results = await searchPokemonForTeam(q);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const addToTeam = (pokemon: TeamPokemon) => {
    if (team.length >= 6) return;
    if (team.find((p) => p.id === pokemon.id)) return;
    setTeam((prev) => [...prev, pokemon]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeFromTeam = (id: number) => {
    setTeam((prev) => prev.filter((p) => p.id !== id));
  };

  // Re-analyze when team changes
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (team.length === 0) {
        if (active) setAnalysis(null);
        return;
      }
      try {
        const a = await analyzeTeam(team);
        if (active) setAnalysis(a);
      } catch (e) {
        console.error(e);
      }
    });
    return () => {
      active = false;
    };
  }, [team]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-emerald-500" />
          Team Builder
        </h2>
        <p className="text-muted-foreground">
          Construye un equipo de hasta 6 Pokemon y analiza su cobertura de tipos
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar Pokemon para agregar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={team.length >= 6}
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToTeam(p)}
                    disabled={team.find((t) => t.id === p.id) !== undefined}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-40"
                  >
                    {p.spriteUrl && (
                      <Image src={p.spriteUrl} alt="" width={24} height={24} unoptimized className="w-6 h-6" />
                    )}
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">#{p.nationalDex}</span>
                    <div className="flex gap-1 ml-auto">
                      {p.types.map((t) => (
                        <span
                          key={t}
                          className={`text-[9px] px-1 rounded ${TYPE_COLORS[t as keyof typeof TYPE_COLORS] || "bg-gray-400 text-white"}`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {team.length >= 6 && (
            <p className="text-xs text-muted-foreground mt-2">Equipo completo (6/6)</p>
          )}
        </CardContent>
      </Card>

      {/* Team display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => {
          const pokemon = team[i];
          return (
            <Card
              key={i}
              className={`relative ${pokemon ? "border-emerald-500/30" : "border-dashed border-muted"}`}
            >
              <CardContent className="p-3 flex flex-col items-center justify-center min-h-[120px]">
                {pokemon ? (
                  <>
                    <button
                      onClick={() => removeFromTeam(pokemon.id)}
                      className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {pokemon.spriteUrl ? (
                      <Image
                        src={pokemon.spriteUrl}
                        alt={pokemon.name}
                        width={48}
                        height={48}
                        unoptimized
                        className="w-12 h-12 mb-1"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs mb-1">
                        ?
                      </div>
                    )}
                    <div className="text-xs font-medium text-center">{pokemon.name}</div>
                    <div className="flex gap-0.5 mt-1">
                      {pokemon.types.map((t) => (
                        <span
                          key={t}
                          className={`text-[8px] px-1 rounded ${TYPE_COLORS[t as keyof typeof TYPE_COLORS] || "bg-gray-400 text-white"}`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-xs">Vacío</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analysis */}
      {analysis && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Coverage */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Sword className="h-4 w-4 text-green-500" />
                Cobertura de Ataque
              </div>
              <div className="flex flex-wrap gap-1">
                {ALL_TYPES_LIST.map((t) => {
                  const covered = analysis.attackCoverage.includes(t);
                  return (
                    <span
                      key={t}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        covered
                          ? `${TYPE_COLORS[t as keyof typeof TYPE_COLORS] || "bg-gray-400 text-white"}`
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.slice(0, 3).toUpperCase()}
                    </span>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {analysis.attackCoverage.length}/18 tipos cubiertos
              </div>
            </CardContent>
          </Card>

          {/* Weaknesses */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Debilidades del Equipo
              </div>
              <div className="space-y-1.5">
                {analysis.typeWeaknesses.slice(0, 8).map((w) => (
                  <div key={w.type} className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded w-14 text-center ${
                        TYPE_COLORS[w.type as keyof typeof TYPE_COLORS] || "bg-gray-400 text-white"
                      }`}
                    >
                      {w.type.slice(0, 3).toUpperCase()}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${Math.min(100, (w.count / 6) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-4 text-right">{w.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resistances */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4 text-blue-500" />
                Resistencias del Equipo
              </div>
              <div className="space-y-1.5">
                {analysis.typeResistances.slice(0, 8).map((r) => (
                  <div key={r.type} className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded w-14 text-center ${
                        TYPE_COLORS[r.type as keyof typeof TYPE_COLORS] || "bg-gray-400 text-white"
                      }`}
                    >
                      {r.type.slice(0, 3).toUpperCase()}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (r.count / 6) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-4 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Score */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4 text-emerald-500" />
                Puntuación del Equipo
              </div>
              <div className="text-center">
                <div
                  className={`text-4xl font-bold ${
                    analysis.score >= 75
                      ? "text-green-500"
                      : analysis.score >= 50
                      ? "text-amber-500"
                      : "text-red-500"
                  }`}
                >
                  {analysis.score}
                </div>
                <div className="text-xs text-muted-foreground">/100</div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {analysis.summary}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {team.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Agrega Pokemon a tu equipo para comenzar el análisis</p>
            <p className="text-sm mt-1">Puedes agregar hasta 6 Pokemon</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const ALL_TYPES_LIST = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic",
  "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
