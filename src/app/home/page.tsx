"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getHomeEntries,
  getHomeGameProgress,
  getHomeStats,
  toggleHomeRegistered,
  toggleHomeFormRegistered,
  toggleHomeFormAbility,
  toggleHomeFormShiny,
  toggleHomeShiny,
  toggleHomeLanguage,
  toggleHomeGameOrigin,
} from "./actions";
import { HOME_LANGUAGES, type PokemonHomeRow, type HomeGameProgress, type HomeFormRow, type HomeStatsSummary } from "./types";
import {
  getRegisteredAbilityNames,
  toggleRegisteredAbility,
} from "@/app/abilities/actions";
import { getGameDexMap } from "@/app/minidex/actions";
import { MINIDEX_GAME_SIGLAS, type GameDexMap } from "@/app/minidex/types";
import { GameDexIcon } from "@/components/game-dex-icon";
import { GoStatRing } from "@/components/go-stat-ring";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Languages,
  Puzzle,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { formatDexNumber, formatPokemonName, POKEMON_TYPE_COLORS } from "@/lib/pokemon-types";
import { usePinGate } from "@/lib/pin-gate-client";
import { useAppStore } from "@/stores/app-store";

function GenderInfo({ genderRate }: { genderRate: number | null }) {
  const cls = "text-sm leading-none";
  if (genderRate === null || genderRate === -1) {
    return (
      <span aria-label="Sin género" className={`${cls} text-muted-foreground`}>
        —
      </span>
    );
  }
  if (genderRate === 0) {
    return (
      <span aria-label="Solo macho" className={`${cls} font-medium text-blue-500`}>
        ♂
      </span>
    );
  }
  if (genderRate === 8) {
    return (
      <span aria-label="Solo hembra" className={`${cls} font-medium text-red-500`}>
        ♀
      </span>
    );
  }
  return (
    <span aria-label="Ambos géneros" className={`${cls} font-medium`}>
      <span className="text-blue-500">♂</span>
      <span className="text-red-500">♀</span>
    </span>
  );
}

export default function HomePage() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const pinGate = usePinGate();
  const [entries, setEntries] = useState<PokemonHomeRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [registeredFilter, setRegisteredFilter] = useState<boolean | undefined>(undefined);
  const [stats, setStats] = useState<HomeStatsSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [gameProgress, setGameProgress] = useState<HomeGameProgress[]>([]);
  const [gameProgressLoading, setGameProgressLoading] = useState(true);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonHomeRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [registeredAbilities, setRegisteredAbilities] = useState<Set<string>>(new Set());
  const [gameDexMap, setGameDexMap] = useState<GameDexMap>({});
  const [expandedForms, setExpandedForms] = useState<Set<number>>(new Set());

  const fetchEntries = useCallback(async () => {
    try {
      const result = await getHomeEntries({
        page,
        pageSize: 50,
        search: search || undefined,
        registered: registeredFilter,
        userId: activeProfileId,
      });
      setEntries(result.entries);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error fetching HOME entries:", error);
    }
  }, [page, search, registeredFilter, activeProfileId]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getHomeStats(activeProfileId);
      setStats(result);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [activeProfileId]);

  const fetchGameProgress = useCallback(async () => {
    try {
      const result = await getHomeGameProgress(activeProfileId);
      setGameProgress(result);
    } catch (error) {
      console.error("Error fetching game progress:", error);
    } finally {
      setGameProgressLoading(false);
    }
  }, [activeProfileId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      await fetchEntries();
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchEntries]);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      await fetchStats();
      await fetchGameProgress();
    });
  }, [fetchStats, fetchGameProgress]);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const map = await getGameDexMap(activeProfileId);
        setGameDexMap(map);
      } catch (error) {
        console.error("Error fetching game dex map:", error);
      }
    });
  }, [activeProfileId]);

  const gameDexSets = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(gameDexMap).map(([k, v]) => [k, new Set(v)])
      ) as Record<string, Set<number>>,
    [gameDexMap]
  );

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const names = await getRegisteredAbilityNames(activeProfileId);
        setRegisteredAbilities(new Set(names));
      } catch (error) {
        console.error("Error fetching registered abilities:", error);
      }
    });
  }, [activeProfileId]);

  const handleToggleRegistered = async (pokemonNationalDex: number, registered: boolean) => {
    try {
      await toggleHomeRegistered(pokemonNationalDex, registered, activeProfileId);
      fetchEntries();
      fetchStats();
      fetchGameProgress();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleToggleLanguage = async (pokemonNationalDex: number, languageCode: string, value: boolean) => {
    try {
      await toggleHomeLanguage(pokemonNationalDex, languageCode, value, activeProfileId);
      fetchEntries();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleToggleGameOrigin = async (pokemonNationalDex: number, gameKey: string, value: boolean) => {
    try {
      await toggleHomeGameOrigin(pokemonNationalDex, gameKey, value, activeProfileId);
      fetchEntries();
      fetchGameProgress();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleToggleAbility = async (abilityName: string, value: boolean) => {
    setRegisteredAbilities((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(abilityName);
      } else {
        next.delete(abilityName);
      }
      return next;
    });
    try {
      await toggleRegisteredAbility(abilityName, value, activeProfileId);
    } catch (err) {
      pinGate(err);
    }
  };

  const handleToggleFormRegistered = async (formId: number, registered: boolean) => {
    try {
      await toggleHomeFormRegistered(formId, registered, activeProfileId);
      fetchEntries();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleToggleFormAbility = async (formId: number, abilityName: string, registered: boolean) => {
    try {
      await toggleHomeFormAbility(formId, abilityName, registered, activeProfileId);
      fetchEntries();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleToggleFormShiny = async (formId: number, isShiny: boolean) => {
    try {
      await toggleHomeFormShiny(formId, isShiny, activeProfileId);
      fetchEntries();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleToggleShiny = async (pokemonNationalDex: number, isShiny: boolean) => {
    try {
      await toggleHomeShiny(pokemonNationalDex, isShiny, activeProfileId);
      fetchEntries();
      fetchStats();
    } catch (err) {
      pinGate(err);
    }
  };

  const toggleFormExpanded = (pokemonId: number) => {
    setExpandedForms((prev) => {
      const next = new Set(prev);
      if (next.has(pokemonId)) {
        next.delete(pokemonId);
      } else {
        next.add(pokemonId);
      }
      return next;
    });
  };

  const openDetail = (entry: PokemonHomeRow) => {
    setSelectedPokemon(entry);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Mi Pokédex HOME</h2>
        <p className="text-muted-foreground">
          {stats ? `${stats.registered} de ${stats.totalPokemon} registrados` : "Gestiona tu colección de Pokémon HOME"}
        </p>
      </div>

      {/* Stats Rings */}
      {statsLoading ? (
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 4 + Object.keys(MINIDEX_GAME_SIGLAS).length }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-[92px] rounded-full" />
          ))}
        </div>
      ) : stats && (
        <div className="flex flex-wrap items-center gap-4">
          <GoStatRing
            iconSrc="/badges/pokeball-on.png"
            naturalIcon
            accentHex="#3B82F6"
            value={stats.registered}
            max={stats.totalPokemon}
          />
          <GoStatRing
            textIcon="10L"
            accentHex="#22C55E"
            value={stats.fullLanguages}
            max={stats.registered}
          />
          <GoStatRing
            textIcon="HAB"
            accentHex="#A855F7"
            value={registeredAbilities.size}
            max={stats.abilitiesTotal}
          />
          <GoStatRing
            iconSrc="/badges/shiny.png"
            naturalIcon
            accentHex="#F59E0B"
            value={stats.shiny}
            max={stats.registered}
          />
          {gameProgress.map((game) => (
            <span
              key={game.gameKey}
              title={`${game.gameName}: ${game.registered}/${game.totalSpecies}`}
            >
              <GoStatRing
                iconNode={<GameDexIcon gameKey={game.gameKey} size={18} />}
                accentHex="#10B981"
                value={game.registered}
                max={game.totalSpecies}
              />
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            <Filter className="h-4 w-4" />
            {registeredFilter === undefined
              ? "Todos"
              : registeredFilter
              ? "Registrados"
              : "No Registrados"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setRegisteredFilter(undefined); setPage(1); }}>
              Todos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setRegisteredFilter(true); setPage(1); }}>
              Registrados
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setRegisteredFilter(false); setPage(1); }}>
              No Registrados
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipos</TableHead>
                    <TableHead className="w-16 text-center">Registrado</TableHead>
                    <TableHead className="w-14 text-center">Género</TableHead>
                    <TableHead className="w-12 text-center">Shiny</TableHead>
                    <TableHead>Idiomas</TableHead>
                    <TableHead className="text-center">Habilidades</TableHead>
                    <TableHead>
                      <div className="flex items-center justify-center">
                        {gameProgress.map((g) => (
                          <span
                            key={g.gameKey}
                            title={`Mini Dex ${g.gameName} (${g.totalSpecies})`}
                            className="flex w-7 cursor-default items-center justify-center text-[8px] font-bold tracking-tight text-muted-foreground uppercase"
                          >
                            {MINIDEX_GAME_SIGLAS[g.gameKey] ?? g.gameKey.slice(0, 3)}
                          </span>
                        ))}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
<TableBody>
                  {entries.flatMap((entry) => {
                    const isExpanded = expandedForms.has(entry.pokemonId);
                    const hasForms = entry.forms && entry.forms.length > 0;
                    const rows: React.ReactNode[] = [
                      <TableRow
                        key={entry.pokemonId}
                        className={`${entry.isRegistered ? 'bg-muted/30' : ''} cursor-pointer`}
                        onClick={() => openDetail(entry)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatDexNumber(entry.nationalDex)}
                        </TableCell>
                        <TableCell>
                          {entry.spriteUrl ? (
                            <Image
                              src={entry.spriteUrl}
                              alt={entry.name}
                              width={40}
                              height={40}
                              unoptimized
                              className="w-10 h-10"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              ?
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPokemonName(entry.name)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {entry.types
                              .sort((a, b) => a.slot - b.slot)
                              .map((t) => {
                                const colors = POKEMON_TYPE_COLORS[t.typeName] || {
                                  bg: "bg-gray-400",
                                  text: "text-white",
                                };
                                return (
                                  <span
                                    key={t.typeName}
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} capitalize`}
                                  >
                                    {t.typeName}
                                  </span>
                                );
                              })}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={entry.isRegistered}
                            onCheckedChange={(checked) =>
                              handleToggleRegistered(entry.nationalDex, checked)
                            }
                            className="data-[checked]:bg-blue-500!"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <GenderInfo genderRate={entry.genderRate} />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${entry.isShiny ? 'text-yellow-400' : 'text-muted-foreground'}`}
                            onClick={() => handleToggleShiny(entry.nationalDex, !entry.isShiny)}
                            title={entry.isShiny ? "Shiny desbloqueado" : "Marcar shiny"}
                          >
                            <Sparkles className={`h-5 w-5 ${entry.isShiny ? 'fill-current' : ''}`} />
                          </Button>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="grid w-max grid-cols-5 gap-1">
                            {HOME_LANGUAGES.map((lang) => (
                              <Badge
                                key={lang.code}
                                variant={entry.languages.includes(lang.code) ? "default" : "outline"}
                                className={`text-[10px] ${entry.languages.includes(lang.code) ? "bg-white text-black border-white hover:bg-gray-200" : ""} ${entry.isRegistered ? "cursor-pointer" : "opacity-40 pointer-events-none"}`}
                                onClick={() =>
                                  handleToggleLanguage(
                                    entry.nationalDex,
                                    lang.code,
                                    !entry.languages.includes(lang.code)
                                  )
                                }
                              >
                                {lang.short}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-1">
                            {entry.possibleAbilities.map((ab) => {
                              const isReg = registeredAbilities.has(ab.abilityName);
                              return (
                                <span
                                  key={ab.abilityName}
                                  title={ab.isHidden ? "Habilidad oculta" : undefined}
                                >
                                  <Badge
                                    variant={isReg ? "default" : "outline"}
                                    className={`w-40 justify-center text-xs cursor-pointer ${isReg ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600" : ""}`}
                                    onClick={() => handleToggleAbility(ab.abilityName, !isReg)}
                                  >
                                    {ab.nameEs}
                                    {ab.isHidden && <span className="ml-0.5 font-bold">*</span>}
                                  </Badge>
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            {gameProgress.map((g) => {
                              const inDex = (gameDexSets[g.gameKey] ?? new Set()).has(entry.nationalDex);
                              const has = entry.gameOrigins.includes(g.gameKey);
                              return (
                                <span key={g.gameKey} className="flex w-7 justify-center">
                                  {!inDex ? (
                                    <span className="flex h-7 w-7 items-center justify-center text-sm text-muted-foreground/40">
                                      -
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={!entry.isRegistered}
                                      title={`${g.gameName}${has ? " — Registrado" : " — Pendiente"}`}
                                      className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border transition-colors ${
                                        has
                                          ? "border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                                          : "border-gray-400 bg-background hover:border-gray-500"
                                      } ${entry.isRegistered ? "cursor-pointer" : "cursor-default"}`}
                                      onClick={() =>
                                        handleToggleGameOrigin(entry.nationalDex, g.gameKey, !has)
                                      }
                                    >
                                      <GameDexIcon
                                        gameKey={g.gameKey}
                                        size={28}
                                        className={has ? "" : "grayscale"}
                                      />
                                    </button>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ];

                    if (hasForms) {
                      rows.push(
                        <TableRow
                          key={`${entry.pokemonId}-forms-toggle`}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleFormExpanded(entry.pokemonId)}
                        >
                          <TableCell colSpan={9} className="py-2 pl-8 bg-muted/30">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                ▶
                              </span>
                              <span>{entry.forms.length} forma{entry.forms.length > 1 ? 's' : ''} disponible{entry.forms.length > 1 ? 's' : ''}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );

                      if (isExpanded) {
                        entry.forms.forEach((form: HomeFormRow) => {
                          rows.push(
                            <TableRow
                              key={`${entry.pokemonId}-form-${form.formId}`}
                              className="bg-muted/20"
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {formatDexNumber(entry.nationalDex)}
                              </TableCell>
                              <TableCell>
                                {form.spriteUrl ? (
                                  <Image
                                    src={form.spriteUrl}
                                    alt={`${entry.name} ${form.formName}`}
                                    width={40}
                                    height={40}
                                    unoptimized
                                    className="w-10 h-10"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                    ?
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium pl-8 text-blue-600">
                                {form.formName}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {form.types
                                    .sort((a, b) => a.slot - b.slot)
                                    .map((t) => {
                                      const colors = POKEMON_TYPE_COLORS[t.typeName] || {
                                        bg: "bg-gray-400",
                                        text: "text-white",
                                      };
                                      return (
                                        <span
                                          key={t.typeName}
                                          className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} capitalize`}
                                        >
                                          {t.typeName}
                                        </span>
                                      );
                                    })}
                                </div>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Switch
                                  checked={form.isRegistered}
                                  onCheckedChange={(checked) =>
                                    handleToggleFormRegistered(form.formId, checked)
                                  }
                                  className="data-[checked]:bg-sky-400!"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <GenderInfo genderRate={entry.genderRate} />
                              </TableCell>
                              {form.isRegional ? (
                                <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 ${form.isShiny ? 'text-yellow-400' : 'text-muted-foreground'}`}
                                    onClick={() => handleToggleFormShiny(form.formId, !form.isShiny)}
                                    title={form.isShiny ? "Shiny desbloqueado" : "Marcar shiny"}
                                  >
                                    <Sparkles className={`h-5 w-5 ${form.isShiny ? 'fill-current' : ''}`} />
                                  </Button>
                                </TableCell>
                              ) : (
                                <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 ${entry.isShiny ? 'text-yellow-400' : 'text-muted-foreground'}`}
                                    onClick={() => handleToggleShiny(entry.nationalDex, !entry.isShiny)}
                                    title={entry.isShiny ? "Shiny desbloqueado" : "Marcar shiny"}
                                  >
                                    <Sparkles className={`h-5 w-5 ${entry.isShiny ? 'fill-current' : ''}`} />
                                  </Button>
                                </TableCell>
                              )}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="grid w-max grid-cols-5 gap-1">
                                  {HOME_LANGUAGES.map((lang) => (
                                    <Badge
                                      key={lang.code}
                                      variant={entry.languages.includes(lang.code) ? "default" : "outline"}
                                      className={`text-[10px] ${entry.languages.includes(lang.code) ? "bg-white text-black border-white hover:bg-gray-200" : ""} opacity-40 pointer-events-none`}
                                    >
                                      {lang.short}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-col items-center gap-1">
                                  {form.possibleAbilities.map((ab) => {
                                    const isReg = form.abilities.includes(ab.abilityName);
                                    return (
                                      <span key={ab.abilityName} title={ab.isHidden ? "Habilidad oculta" : undefined}>
                                        <Badge
                                          variant={isReg ? "default" : "outline"}
                                          className={`w-40 justify-center text-xs cursor-pointer ${isReg ? "bg-sky-400 text-white border-sky-400 hover:bg-sky-500" : ""}`}
                                          onClick={() => handleToggleFormAbility(form.formId, ab.abilityName, !isReg)}
                                        >
                                          {ab.nameEs}
                                          {ab.isHidden && <span className="ml-0.5 font-bold">*</span>}
                                        </Badge>
                                    </span>
                                    );
                                  })}
                                </div>
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          );
                        });
                      }
                    }

                    return rows;
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Mini Pokédex per Game */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          Mini Pokédex por Juego
        </h3>
        {gameProgressLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameProgress.map((game) => {
              const progress = game.totalSpecies > 0
                ? Math.round((game.registered / game.totalSpecies) * 100)
                : 0;

              return (
                <Card key={game.gameKey}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4" />
                      {game.gameName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold">{game.registered}</span>
                      <span className="text-sm text-muted-foreground">
                        / {game.totalSpecies}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {game.originGame} • {game.generationRegion}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedPokemon && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono">
                  {formatDexNumber(selectedPokemon.nationalDex)}
                </span>
                {formatPokemonName(selectedPokemon.name)}
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6">
                {/* Sprite */}
                <div className="flex justify-center">
                  {selectedPokemon.officialArtwork ? (
                    <Image
                      src={selectedPokemon.officialArtwork}
                      alt={selectedPokemon.name}
                      width={192}
                      height={192}
                      unoptimized
                      className="w-48 h-48 object-contain"
                    />
                  ) : selectedPokemon.spriteUrl ? (
                    <Image
                      src={selectedPokemon.spriteUrl}
                      alt={selectedPokemon.name}
                      width={144}
                      height={144}
                      unoptimized
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-6xl">?</span>
                    </div>
                  )}
                </div>

                {/* Types */}
                <div className="flex justify-center gap-2">
                  {selectedPokemon.types
                    .sort((a, b) => a.slot - b.slot)
                    .map((t) => {
                      const colors = POKEMON_TYPE_COLORS[t.typeName] || {
                        bg: "bg-gray-400",
                        text: "text-white",
                      };
                      return (
                        <Badge
                          key={t.typeName}
                          className={`${colors.bg} ${colors.text} capitalize`}
                        >
                          {t.typeName}
                        </Badge>
                      );
                    })}
                </div>

                {/* Registered Toggle */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium">Registrado en HOME:</span>
                  <Switch
                    checked={selectedPokemon.isRegistered}
                    onCheckedChange={(checked) => {
                      handleToggleRegistered(selectedPokemon.nationalDex, checked);
                      setSelectedPokemon({ ...selectedPokemon, isRegistered: checked });
                    }}
                    className="data-[checked]:bg-blue-500!"
                  />
                </div>

                {/* Gender Info */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="font-medium">Géneros:</span>
                  <GenderInfo genderRate={selectedPokemon.genderRate} />
                </div>

                {/* Abilities */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    Habilidades
                  </h4>
                  <div className="flex flex-col items-center gap-2">
                    {selectedPokemon.possibleAbilities.map((ab) => {
                      const isReg = registeredAbilities.has(ab.abilityName);
                      return (
                        <span
                          key={ab.abilityName}
                          title={ab.isHidden ? "Habilidad oculta" : undefined}
                        >
                          <Badge
                            variant={isReg ? "default" : "outline"}
                            className={`w-40 justify-center cursor-pointer ${isReg ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600" : ""}`}
                            onClick={() => handleToggleAbility(ab.abilityName, !isReg)}
                          >
                            {ab.nameEs}
                            {ab.isHidden && <span className="ml-0.5 font-bold">*</span>}
                          </Badge>
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    * Habilidad oculta
                  </p>
                </div>

                {/* Languages */}
                {selectedPokemon.isRegistered && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      Idiomas
                    </h4>
                     <div className="grid w-max grid-cols-5 gap-2">
                       {HOME_LANGUAGES.map((lang) => (
                         <Badge
                           key={lang.code}
                           variant={selectedPokemon.languages.includes(lang.code) ? "default" : "outline"}
                           className={`cursor-pointer ${selectedPokemon.languages.includes(lang.code) ? "bg-white text-black border-white hover:bg-gray-200" : ""}`}
                           onClick={() => {
                             const hasLang = selectedPokemon.languages.includes(lang.code);
                             handleToggleLanguage(selectedPokemon.nationalDex, lang.code, !hasLang);
                             setSelectedPokemon({
                               ...selectedPokemon,
                               languages: hasLang
                                 ? selectedPokemon.languages.filter((l) => l !== lang.code)
                                 : [...selectedPokemon.languages, lang.code],
                             });
                           }}
                         >
                           {lang.short} - {lang.label}
                         </Badge>
                       ))}
                     </div>
                  </div>
                )}

                {/* Game Origins */}
                {selectedPokemon.isRegistered && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Puzzle className="h-4 w-4" />
                      Mini Dex por Juego
                    </h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {gameProgress.map((game) => {
                        const hasGame = selectedPokemon.gameOrigins.includes(game.gameKey);
                        return (
                          <Badge
                            key={game.gameKey}
                            variant={hasGame ? "default" : "outline"}
                            title={`${game.gameName} (${game.totalSpecies})`}
                            className={`cursor-pointer ${hasGame ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600" : ""}`}
                            onClick={() => {
                              handleToggleGameOrigin(selectedPokemon.nationalDex, game.gameKey, !hasGame);
                              setSelectedPokemon({
                                ...selectedPokemon,
                                gameOrigins: hasGame
                                  ? selectedPokemon.gameOrigins.filter((g) => g !== game.gameKey)
                                  : [...selectedPokemon.gameOrigins, game.gameKey],
                              });
                            }}
                          >
                            <GameDexIcon gameKey={game.gameKey} size={14} className="mr-1 inline-block" />
                            {game.gameName}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
