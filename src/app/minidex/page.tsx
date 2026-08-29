"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GameDexIcon } from "@/components/game-dex-icon";
import { getMiniDex, getMiniDexGames } from "./actions";
import { toggleHomeGameOrigin } from "../home/actions";
import type { MiniDexEntry, MiniDexGame } from "./types";
import { useAppStore } from "@/stores/app-store";
import { LayoutGrid } from "lucide-react";

export default function MiniDexPage() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [games, setGames] = useState<MiniDexGame[]>([]);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [entries, setEntries] = useState<MiniDexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    try {
      const result = await getMiniDexGames();
      setGames(result);
      return result;
    } catch (error) {
      console.error("Error fetching mini dex games:", error);
      return [];
    }
  }, []);

  const fetchEntries = useCallback(
    async (gameKey: string) => {
      try {
        const result = await getMiniDex({ gameKey, userId: activeProfileId });
        setEntries(result);
      } catch (error) {
        console.error("Error fetching mini dex entries:", error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [activeProfileId]
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      setLoading(true);
      const result = await fetchGames();
      if (!active) return;
      const first = result[0]?.gameKey ?? null;
      setActiveGame((prev) => prev ?? first);
      if (!first) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchGames]);

  useEffect(() => {
    if (!activeGame) return;
    let active = true;
    void Promise.resolve().then(async () => {
      setLoading(true);
      await fetchEntries(activeGame);
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeGame, fetchEntries]);

  const game = games.find((g) => g.gameKey === activeGame);

  const registeredCount = useMemo(
    () => entries.filter((e) => e.registered).length,
    [entries]
  );

  const handleToggle = async (entry: MiniDexEntry, value: boolean) => {
    if (!activeGame) return;
    setEntries((prev) =>
      prev.map((e) =>
        e.pokemonId === entry.pokemonId && e.formName === entry.formName
          ? { ...e, registered: value }
          : e
      )
    );
    await toggleHomeGameOrigin(entry.nationalDex, activeGame, value, activeProfileId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Mini Dex</h2>
        <p className="text-muted-foreground">
          {game
            ? `${registeredCount} de ${entries.length} registrados en ${game.gameName}`
            : loading
            ? "Cargando..."
            : "Selecciona un juego"}
        </p>
      </div>

      {/* Game selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {games.map((g) => {
          const isActive = g.gameKey === activeGame;
          return (
            <button
              key={g.gameKey}
              onClick={() => setActiveGame(g.gameKey)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <GameDexIcon gameKey={g.gameKey} size={20} />
              <span className="font-medium">{g.gameName}</span>
            </button>
          );
        })}
      </div>

      {/* Progress */}
      {game && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso del Mini Dex</span>
              <span className="font-medium">
                {registeredCount} / {entries.length}
                {entries.length !== game.totalSpecies && (
                  <span className="text-muted-foreground">
                    {" "}
                    (total HOME: {game.totalSpecies})
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width:
                    entries.length > 0
                      ? `${(registeredCount / entries.length) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sprite grid */}
      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-2 text-muted-foreground">
            <LayoutGrid className="h-8 w-8" />
            <p>No hay especies en este Mini Dex</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3">
          {entries.map((entry) => (
            <button
              key={`${entry.nationalDex}-${entry.formName}`}
              type="button"
              onClick={() => handleToggle(entry, !entry.registered)}
              title={
                entry.registered
                  ? `#${entry.nationalDex} ${entry.name}${entry.formName ? ` (${entry.formName})` : ""} — Registrado`
                  : `#${entry.nationalDex} ${entry.name} — Pendiente`
              }
              className={`relative flex flex-col items-center gap-1 rounded-lg border p-2 pt-3 transition-colors ${
                entry.registered
                  ? "border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : "bg-background hover:bg-accent"
              }`}
            >
              <span className="absolute left-1.5 top-1 text-[10px] font-mono text-muted-foreground">
                {entry.dexNumber}
              </span>
              {entry.spriteUrl ? (
                <Image
                  src={entry.spriteUrl}
                  alt={entry.name}
                  width={56}
                  height={56}
                  unoptimized
                  className={`h-14 w-14 object-contain ${
                    entry.registered ? "" : "brightness-0 opacity-40"
                  }`}
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center text-xs text-muted-foreground">
                  ?
                </span>
              )}
              <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">
                {entry.name}
                {entry.formName && (
                  <span className="block font-semibold text-emerald-600 dark:text-emerald-400">
                    {entry.formName}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
