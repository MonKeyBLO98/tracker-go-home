"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, Star } from "lucide-react";
import { getPvpIvs, getPvpIvStats } from "./actions";
import { LEAGUES, LEAGUE_COLORS, type PvpIvRow } from "./types";

export default function PvpIvPage() {
  const [ivs, setIvs] = useState<PvpIvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    ivsPerLeague: Record<string, number>;
    pokemonPerLeague: Record<string, number>;
  } | null>(null);
  const [activeLeague, setActiveLeague] = useState("great");
  const [search, setSearch] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return getPvpIvs(activeLeague, selectedSpecies ?? undefined);
      })
      .then((result) => {
        if (active) setIvs(result);
      })
      .catch((error) => {
        console.error("Error fetching PvP IVs:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeLeague, selectedSpecies]);

  useEffect(() => {
    let active = true;
    getPvpIvStats()
      .then((result) => {
        if (active) setStats(result);
      })
      .catch((error) => {
        console.error("Error fetching PvP IV stats:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  // Group by species for overview mode
  const groupedBySpecies = selectedSpecies
    ? ivs
    : ivs.reduce<PvpIvRow[]>((acc, iv) => {
        if (!acc.find((a) => a.speciesId === iv.speciesId)) {
          acc.push(iv);
        }
        return acc;
      }, []);

  const displayData = groupedBySpecies;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-500" />
          PvP IV Rankings
        </h2>
        <p className="text-muted-foreground">
          {stats
            ? `${Object.values(stats.pokemonPerLeague).reduce((a, b) => a + b, 0)} Pokemon | ${Object.values(stats.ivsPerLeague).reduce((a, b) => a + b, 0)} IV combos`
            : "Mejores IVs por especie y liga"}
        </p>
      </div>

      {/* League Tabs */}
      <div className="flex gap-2 flex-wrap">
        {LEAGUES.map((l) => {
          const colors = LEAGUE_COLORS[l.id];
          const isActive = activeLeague === l.id;
          return (
            <button
              key={l.id}
              onClick={() => {
                setActiveLeague(l.id);
                setSearch("");
                setSelectedSpecies(null);
              }}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                isActive
                  ? `${colors.bg} ${colors.text}`
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {l.name}
              {stats?.pokemonPerLeague?.[l.id] != null && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({stats.pokemonPerLeague[l.id]})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar Pokemon..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedSpecies(null);
          }}
          className="pl-9"
        />
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            {stats.pokemonPerLeague[activeLeague] ?? 0} Pokemon
          </span>
          <span>|</span>
          <span>
            {stats.ivsPerLeague[activeLeague] ?? 0} IV combos
          </span>
          {selectedSpecies && (
            <>
              <span>|</span>
              <button
                onClick={() => {
                  setSelectedSpecies(null);
                  setSearch("");
                }}
                className="text-blue-500 hover:underline"
              >
                ← Volver a overview
              </button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : displayData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay IVs para esta liga.</p>
              <p className="text-sm mt-1">Ejecuta el scraper para cargar datos:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                npm run db:scrape:pvp-ivs
              </code>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Pokemon</TableHead>
                    <TableHead className="text-center">IVs</TableHead>
                    <TableHead className="w-12 text-right">CP</TableHead>
                    <TableHead className="w-12 text-right">Atk</TableHead>
                    <TableHead className="w-12 text-right">Def</TableHead>
                    <TableHead className="w-12 text-right">HP</TableHead>
                    <TableHead className="text-right">Stat Prod</TableHead>
                    <TableHead className="w-16 text-right">% Best</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((iv) => (
                    <TableRow
                      key={iv.id}
                      className={
                        !selectedSpecies && iv.rank === 1
                          ? "bg-green-500/5"
                          : ""
                      }
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {iv.rank}
                      </TableCell>
                      <TableCell>
                        {iv.spriteUrl ? (
                          <Image
                            src={iv.spriteUrl}
                            alt={iv.pokemonName}
                            width={32}
                            height={32}
                            unoptimized
                            className="w-8 h-8"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                            ?
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {iv.pokemonName}
                        {!selectedSpecies && (
                          <button
                            onClick={() => {
                              setSelectedSpecies(iv.speciesId);
                              setSearch(iv.pokemonName);
                            }}
                            className="ml-1.5 text-[10px] text-blue-500 hover:underline"
                          >
                            ver IVs ▾
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-xs">
                          {iv.attackIv}/{iv.defenseIv}/{iv.staminaIv}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          Lv{iv.level}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {iv.cp.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {iv.attack.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {iv.defense.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {iv.hp}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {Math.round(iv.statProduct).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`text-xs font-bold ${
                            iv.percentBest >= 99
                              ? "text-green-500"
                              : iv.percentBest >= 95
                              ? "text-blue-500"
                              : iv.percentBest >= 90
                              ? "text-amber-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {iv.percentBest.toFixed(1)}%
                          {iv.percentBest >= 99 && (
                            <Star className="inline h-3 w-3 ml-0.5 text-yellow-500" />
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
