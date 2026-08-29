"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Swords, Search, TrendingUp } from "lucide-react";
import { getAttackers, getAttackerStats } from "./actions";
import { ATTACK_TYPES, ATTACK_TYPE_COLORS, type AttackerRow } from "./types";

const TIER_COLORS: Record<string, string> = {
  SSSSS: "bg-red-600 text-white",
  SSSS: "bg-red-500 text-white",
  SSS: "bg-orange-500 text-white",
  SS: "bg-amber-500 text-white",
  S: "bg-yellow-500 text-white",
  A: "bg-green-600 text-white",
  B: "bg-blue-600 text-white",
};

export default function AttackersPage() {
  const [attackers, setAttackers] = useState<AttackerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ totalRankings: number; lastUpdated: Date | null } | null>(null);
  const [activeType, setActiveType] = useState("overall");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return getAttackers({
          attackType: activeType,
          search: search || undefined,
        });
      })
      .then((result) => {
        if (active) setAttackers(result);
      })
      .catch((error) => {
        console.error("Error fetching attackers:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeType, search]);

  useEffect(() => {
    let active = true;
    getAttackerStats()
      .then((result) => {
        if (active) setStats(result);
      })
      .catch((error) => {
        console.error("Error fetching attacker stats:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-orange-500" />
          Best Attackers
        </h2>
        <p className="text-muted-foreground">
          {stats
            ? `${stats.totalRankings} rankings de atacantes`
            : "Los mejores atacantes de Pokémon GO"}
        </p>
      </div>

      {/* Stats */}
      {stats && stats.lastUpdated && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>
                Datos de DittoBase | Última actualización:{" "}
                {new Date(stats.lastUpdated).toLocaleDateString("es-AR")}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Type Tabs */}
      <div className="flex flex-wrap gap-1">
        {ATTACK_TYPES.map((t) => {
          const colors = ATTACK_TYPE_COLORS[t.value] || { bg: "bg-gray-400", text: "text-white" };
          const isActive = activeType === t.value;
          return (
            <button
              key={t.value}
              onClick={() => { setActiveType(t.value); setSearch(""); }}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                isActive
                  ? `${colors.bg} ${colors.text}`
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar Pokémon..."
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
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : attackers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Swords className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay datos de rankings para este tipo.</p>
              <p className="text-sm mt-1">Ejecutá el scraper para cargar datos:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                npm run db:scrape:attackers
              </code>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Pokémon</TableHead>
                    <TableHead className="w-12">Tier</TableHead>
                    <TableHead>Mov. Rápido</TableHead>
                    <TableHead>Mov. Cargado</TableHead>
                    <TableHead className="w-16 text-right">DPS</TableHead>
                    <TableHead className="w-16 text-right">TDO</TableHead>
                    <TableHead className="w-16 text-right">eDPS</TableHead>
                    <TableHead className="w-20 text-right">% best</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attackers.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {a.rank}
                      </TableCell>
                      <TableCell>
                        {a.spriteUrl ? (
                          <Image
                            src={a.spriteUrl}
                            alt={a.pokemonName}
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
                        {a.pokemonName}
                      </TableCell>
                      <TableCell>
                        {a.tier && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              TIER_COLORS[a.tier] || "bg-gray-500 text-white"
                            }`}
                          >
                            {a.tier}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {a.fastMoveType && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 ${
                                ATTACK_TYPE_COLORS[a.fastMoveType]?.bg || ""
                              } ${ATTACK_TYPE_COLORS[a.fastMoveType]?.text || ""}`}
                            >
                              {a.fastMoveType}
                            </Badge>
                          )}
                          <span className="text-xs">{a.fastMove}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {a.chargedMoveType && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 ${
                                ATTACK_TYPE_COLORS[a.chargedMoveType]?.bg || ""
                              } ${ATTACK_TYPE_COLORS[a.chargedMoveType]?.text || ""}`}
                            >
                              {a.chargedMoveType}
                            </Badge>
                          )}
                          <span className="text-xs">{a.chargedMove}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {a.dps.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {a.tdo.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold">
                        {a.edps.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {a.percentBest.toFixed(1)}%
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
