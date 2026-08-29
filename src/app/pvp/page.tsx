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
import { Trophy, Search } from "lucide-react";
import { getPvpRankings, getPvpStats } from "./actions";
import { LEAGUES, LEAGUE_COLORS, type PvpRankingRow } from "./types";

export default function PvpPage() {
  const [rankings, setRankings] = useState<PvpRankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [activeLeague, setActiveLeague] = useState("great");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return getPvpRankings(activeLeague);
      })
      .then((result) => {
        if (active) setRankings(result);
      })
      .catch((error) => {
        console.error("Error fetching PvP rankings:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeLeague]);

  useEffect(() => {
    let active = true;
    getPvpStats()
      .then((result) => {
        if (active) setStats(result.rankingsPerLeague);
      })
      .catch((error) => {
        console.error("Error fetching PvP stats:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = search
    ? rankings.filter((r) =>
        r.pokemonName.toLowerCase().includes(search.toLowerCase())
      )
    : rankings;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          PvP Rankings
        </h2>
        <p className="text-muted-foreground">
          {stats
            ? `${stats.great ?? 0} Great | ${stats.ultra ?? 0} Ultra | ${stats.master ?? 0} Master`
            : "Rankings de PvP por liga"}
        </p>
      </div>

      {/* League Tabs */}
      <div className="flex gap-2">
        {LEAGUES.map((l) => {
          const colors = LEAGUE_COLORS[l.id];
          const isActive = activeLeague === l.id;
          return (
            <button
              key={l.id}
              onClick={() => {
                setActiveLeague(l.id);
                setSearch("");
              }}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                isActive
                  ? `${colors.bg} ${colors.text}`
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {l.name}
              {stats?.[l.id] != null && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({stats[l.id]})
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
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay rankings para esta liga.</p>
              <p className="text-sm mt-1">Ejecuta el scraper para cargar datos:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                npm run db:scrape:pvp
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
                    <TableHead className="w-14 text-right">Score</TableHead>
                    <TableHead>Mov. Rapido</TableHead>
                    <TableHead>Mov. Cargado 1</TableHead>
                    <TableHead>Mov. Cargado 2</TableHead>
                    <TableHead className="w-14 text-right">Atk</TableHead>
                    <TableHead className="w-14 text-right">Def</TableHead>
                    <TableHead className="w-14 text-right">HP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.rank}
                      </TableCell>
                      <TableCell>
                        {r.spriteUrl ? (
                          <Image
                            src={r.spriteUrl}
                            alt={r.pokemonName}
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
                        {r.pokemonName}
                        {r.editorScore && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground">
                            (Ed: {r.editorScore})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`text-xs font-bold ${
                            r.score >= 90
                              ? "text-green-500"
                              : r.score >= 80
                              ? "text-blue-500"
                              : r.score >= 70
                              ? "text-amber-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {r.score.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{r.fastMove}</TableCell>
                      <TableCell className="text-xs">{r.chargedMove1}</TableCell>
                      <TableCell className="text-xs">
                        {r.chargedMove2 || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {r.atk?.toFixed(1) ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {r.def_?.toFixed(1) ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {r.hp?.toFixed(0) ?? "-"}
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
