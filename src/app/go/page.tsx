"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { PokeballToggle } from "@/components/pokeball-toggle";
import { GoCheckToggle, GO_CHECKS } from "@/components/go-check-toggle";
import { GoStatRing } from "@/components/go-stat-ring";
import { GoGenderToggle } from "@/components/go-gender-toggle";
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
  getGoEntries,
  getGoStats,
  toggleCaptured,
  toggleGoCostume,
  toggleGoShinyOverride,
  toggleGoFormCaptured,
  toggleGoFormShiny,
  type GoGenderValue,
  type GoStatsSummary,
  type PokemonGoRow,
} from "./actions";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  VenetianMask,
} from "lucide-react";
import { formatDexNumber, formatPokemonName, POKEMON_TYPE_COLORS } from "@/lib/pokemon-types";
import { resolveCheckEligibility } from "@/lib/check-eligibility";
import { toggleHomeRegistered, toggleHomeGameOrigin, toggleHomeFormRegistered } from "@/app/home/actions";
import { usePinGate } from "@/lib/pin-gate-client";
import { useAppStore } from "@/stores/app-store";

export default function GoPage() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const pinGate = usePinGate();
  const [entries, setEntries] = useState<PokemonGoRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [capturedFilter, setCapturedFilter] = useState<boolean | undefined>(undefined);
  const [genFilter, setGenFilter] = useState<string>("all");
  const [stats, setStats] = useState<GoStatsSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [costumeDialogPokemonId, setCostumeDialogPokemonId] = useState<number | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const result = await getGoEntries({
        page,
        pageSize: 50,
        search: search || undefined,
        captured: capturedFilter,
        generation: genFilter === "all" ? undefined : parseInt(genFilter),
        userId: activeProfileId,
      });
      setEntries(result.entries);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error fetching GO entries:", error);
    }
  }, [page, search, capturedFilter, genFilter, activeProfileId]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getGoStats(activeProfileId);
      setStats(result);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
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
    void Promise.resolve().then(fetchStats);
  }, [fetchStats]);

  const handleToggleCaptured = async (pokemonNationalDex: number, captured: boolean) => {
    try {
      await toggleCaptured(pokemonNationalDex, captured, activeProfileId);
      fetchEntries();
      fetchStats();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleCheckToggle = (pokemonId: number, checkName: string, value: boolean) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.pokemonId === pokemonId) {
          return {
            ...e,
            isCaptured: true,
            checks: e.checks
              ? { ...e.checks, [checkName]: value }
              : { isShiny: false, shinyOverride: false, isLucky: false, isHundo: false, isXXL: false, isXXS: false, isGmax: false, isMegaX: false, isMegaY: false, isShadow: false, isPurified: false, hasCostume: false, [checkName]: value },
          };
        }
        return e;
      })
    );
    fetchStats();
  };

  const handleShinyOverride = async (pokemonNationalDex: number, shinyOverride: boolean) => {
    try {
      await toggleGoShinyOverride(pokemonNationalDex, shinyOverride, activeProfileId);
      setEntries((prev) =>
        prev.map((e) => {
          if (e.nationalDex === pokemonNationalDex && e.checks) {
            return {
              ...e,
              checks: { ...e.checks, isShiny: true, shinyOverride },
            };
          }
          return e;
        })
      );
    } catch (err) {
      pinGate(err);
    }
  };

  const handleFormCaptured = async (pokemonId: number, formId: number, captured: boolean) => {
    try {
      await toggleGoFormCaptured(formId, captured, activeProfileId);
      setEntries((prev) =>
        prev.map((e) => {
          if (e.pokemonId === pokemonId) {
            return {
              ...e,
              regionalForms: e.regionalForms.map((rf) =>
                rf.formId === formId
                  ? { ...rf, isCaptured: captured, capturedAt: captured ? new Date() : null }
                  : rf
              ),
            };
          }
          return e;
        })
      );
      fetchStats();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleFormShiny = async (pokemonId: number, formId: number, isShiny: boolean) => {
    try {
      await toggleGoFormShiny(formId, isShiny, activeProfileId);
      setEntries((prev) =>
        prev.map((e) => {
          if (e.pokemonId === pokemonId) {
            return {
              ...e,
              regionalForms: e.regionalForms.map((rf) =>
                rf.formId === formId ? { ...rf, isShiny } : rf
              ),
            };
          }
          return e;
        })
      );
      fetchStats();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleGenderChange = (pokemonId: number, value: GoGenderValue | null) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.pokemonId === pokemonId ? { ...e, gender: value, isCaptured: true } : e
      )
    );
  };

  const handleCostumeToggle = async (pokemonId: number, nationalDex: number, costumeName: string, registered: boolean) => {
    try {
      await toggleGoCostume(nationalDex, costumeName, registered, activeProfileId);
      setEntries((prev) =>
        prev.map((e) => {
          if (e.pokemonId === pokemonId) {
            const newCostumes = registered
              ? [...e.costumes, { costumeName }]
              : e.costumes.filter((c) => c.costumeName !== costumeName);
            return {
              ...e,
              isCaptured: true,
              costumes: newCostumes,
              checks: e.checks
                ? { ...e.checks, hasCostume: newCostumes.length > 0 }
                : { isShiny: false, shinyOverride: false, isLucky: false, isHundo: false, isXXL: false, isXXS: false, isGmax: false, isMegaX: false, isMegaY: false, isShadow: false, isPurified: false, hasCostume: newCostumes.length > 0 },
            };
          }
          return e;
        })
      );
      fetchStats();
    } catch (err) {
      pinGate(err);
    }
  };

  const handleHomeToggle = async (pokemonId: number, nationalDex: number, registered: boolean) => {
    try {
      await toggleHomeRegistered(nationalDex, registered, activeProfileId);
      if (!registered) {
        // Cascada: desregistrar HOME también quita el origen GO
        await toggleHomeGameOrigin(nationalDex, "go", false, activeProfileId);
      }
      setEntries((prev) =>
        prev.map((e) =>
          e.pokemonId === pokemonId
            ? { ...e, isHomeRegistered: registered, isGoHome: registered ? e.isGoHome : false }
            : e
        )
      );
    } catch (err) {
      pinGate(err);
    }
  };

  const handleGoHomeToggle = async (pokemonId: number, nationalDex: number, value: boolean) => {
    try {
      await toggleHomeGameOrigin(nationalDex, "go", value, activeProfileId);
      setEntries((prev) =>
        prev.map((e) =>
          e.pokemonId === pokemonId
            ? { ...e, isGoHome: value, isHomeRegistered: value ? true : e.isHomeRegistered }
            : e
        )
      );
    } catch (err) {
      pinGate(err);
    }
  };

  const handleFormHomeToggle = async (pokemonId: number, formId: number, registered: boolean) => {
    try {
      await toggleHomeFormRegistered(formId, registered, activeProfileId);
      setEntries((prev) =>
        prev.map((e) =>
          e.pokemonId === pokemonId
            ? {
                ...e,
                regionalForms: e.regionalForms.map((rf) =>
                  rf.formId === formId ? { ...rf, isHomeRegistered: registered } : rf
                ),
              }
            : e
        )
      );
    } catch (err) {
      pinGate(err);
    }
  };

  const statRings = stats
    ? (() => {
        const valueByCheck: Record<string, number> = {
          isShiny: stats.shiny,
          isHundo: stats.hundo,
          isLucky: stats.lucky,
          isXXL: stats.xxl,
          isXXS: stats.xxs,
          isMega: stats.mega,
          isGmax: stats.gmax,
          isShadow: stats.shadow,
          isPurified: stats.purified,
        };
        const maxByCheck: Record<string, number> = {
          isShiny: stats.totalPokemon,
          isHundo: stats.totalPokemon,
          isXXL: stats.totalPokemon,
          isXXS: stats.totalPokemon,
          isLucky: stats.totalPokemon - stats.totalMythical,
          isMega: stats.totalMega,
          isGmax: stats.totalGmax,
          isShadow: stats.totalShadow,
          isPurified: stats.totalShadow,
        };
        return [
          {
            key: "captured",
            iconSrc: "/badges/pokeball-on.png",
            textIcon: undefined,
            accentHex: "#DC2626",
            naturalIcon: true,
            value: stats.captured,
            max: stats.totalPokemon,
          },
          ...GO_CHECKS.map((check) => ({
            key: check.name,
            iconSrc: check.iconSrc,
            textIcon: check.iconSrc ? undefined : check.label,
            accentHex: check.accentHex ?? "#9CA3AF",
            naturalIcon: false,
            value: valueByCheck[check.name] ?? 0,
            max: maxByCheck[check.name] ?? 0,
          })),
        ];
      })()
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Mi Pokédex GO</h2>
        <p className="text-muted-foreground">
          {stats ? `${stats.captured} de ${stats.totalPokemon} capturados` : "Gestiona tu colección de Pokémon GO"}
        </p>
      </div>

      {/* Stats Rings */}
      {statsLoading ? (
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-[92px] rounded-full" />
          ))}
        </div>
      ) : stats && (
        <div className="flex flex-wrap items-center gap-4">
          {statRings.map((ring) => (
            <GoStatRing
              key={ring.key}
              iconSrc={ring.iconSrc}
              textIcon={ring.textIcon}
              accentHex={ring.accentHex}
              naturalIcon={ring.naturalIcon}
              value={ring.value}
              max={ring.max}
            />
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
            {capturedFilter === undefined
              ? "Todos"
              : capturedFilter
              ? "Capturados"
              : "No Capturados"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setCapturedFilter(undefined); setPage(1); }}>
              Todos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setCapturedFilter(true); setPage(1); }}>
              Capturados
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setCapturedFilter(false); setPage(1); }}>
              No Capturados
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filtro por generación */}
      <div className="overflow-x-auto pb-1">
        <Tabs
          value={genFilter}
          onValueChange={(value) => {
            setGenFilter(value as string);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
              <TabsTrigger key={g} value={String(g)}>
                Gen {g}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
                    <TableHead className="w-16">Capturado</TableHead>
                    <TableHead className="w-20">Géneros</TableHead>
                    <TableHead>Checks</TableHead>
                    <TableHead className="w-16">Gen</TableHead>
                    <TableHead className="w-16 border-l border-border/60 bg-muted/30 text-center text-[11px]">HOME</TableHead>
                    <TableHead className="w-16 bg-muted/30 text-center text-[11px]">(GO)HOME</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const eligibility = resolveCheckEligibility(entry);
                    return (
                    <>
                    <TableRow
                      key={entry.pokemonId}
                      className={entry.isCaptured ? "bg-muted/30" : ""}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDexNumber(entry.nationalDex)}
                      </TableCell>
                      <TableCell>
                        <div className="relative w-10 h-10">
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
                          {entry.costumeForms.length > 0 && (
                            <button
                              onClick={() => setCostumeDialogPokemonId(entry.pokemonId)}
                              className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-background border border-border shadow-sm hover:bg-accent transition-colors"
                            >
                              <VenetianMask className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                          {entry.costumes.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none z-10">
                              {entry.costumes.length}
                            </span>
                          )}
                        </div>
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
                      <TableCell>
                        <PokeballToggle
                          checked={entry.isCaptured}
                          onChange={(value) =>
                            handleToggleCaptured(entry.nationalDex, value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className={!entry.isCaptured ? "opacity-30 pointer-events-none" : ""}>
                          <GoGenderToggle
                            pokemonNationalDex={entry.nationalDex}
                            genderRate={entry.genderRate}
                            value={entry.gender}
                            userId={activeProfileId}
                            onChange={(value) => handleGenderChange(entry.pokemonId, value)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex flex-nowrap gap-1 ${!entry.isCaptured ? 'opacity-30 pointer-events-none' : ''}`}>
                          {GO_CHECKS.map((check) => {
                            if (check.name === "isMega") {
                              const megaCount = entry.megaForms.length;
                              if (megaCount === 0) {
                                return (
                                  <div key="isMega" className="hidden">
                                    <GoCheckToggle
                                      pokemonNationalDex={entry.nationalDex}
                                      checkName="isMegaX"
                                      label="Mega"
                                      iconSrc="/badges/mega.png"
                                      accentHex="#C026D3"
                                      checked={false}
                                      switchClassName=""
                                      labelActiveClass=""
                                      userId={activeProfileId}
                                      onToggle={() => {}}
                                    />
                                  </div>
                                );
                              }
                              if (megaCount === 1) {
                                return (
                                  <div key="isMega">
                                    <GoCheckToggle
                                      pokemonNationalDex={entry.nationalDex}
                                      checkName="isMegaX"
                                      label="Mega"
                                      iconSrc="/badges/mega.png"
                                      accentHex="#C026D3"
                                      checked={entry.checks?.isMegaX || false}
                                      switchClassName="data-[checked]:bg-fuchsia-500! data-[checked]:[&_[data-slot=switch-thumb]]:bg-fuchsia-100!"
                                      labelActiveClass="text-fuchsia-600 dark:text-fuchsia-400"
                                      userId={activeProfileId}
                                      onToggle={(name, value) => handleCheckToggle(entry.pokemonId, name, value)}
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div key="isMega" className="flex flex-col gap-0.5">
                                  <GoCheckToggle
                                    pokemonNationalDex={entry.nationalDex}
                                    checkName="isMegaX"
                                    label="Mega X"
                                    iconSrc="/badges/mega.png"
                                    accentHex="#C026D3"
                                    checked={entry.checks?.isMegaX || false}
                                    switchClassName="data-[checked]:bg-fuchsia-500! data-[checked]:[&_[data-slot=switch-thumb]]:bg-fuchsia-100!"
                                    labelActiveClass="text-fuchsia-600 dark:text-fuchsia-400"
                                    userId={activeProfileId}
                                    onToggle={(name, value) => handleCheckToggle(entry.pokemonId, name, value)}
                                  />
                                  <GoCheckToggle
                                    pokemonNationalDex={entry.nationalDex}
                                    checkName="isMegaY"
                                    label="Mega Y"
                                    iconSrc="/badges/mega.png"
                                    accentHex="#A21CAF"
                                    checked={entry.checks?.isMegaY || false}
                                    switchClassName="data-[checked]:bg-fuchsia-700! data-[checked]:[&_[data-slot=switch-thumb]]:bg-fuchsia-200!"
                                    labelActiveClass="text-fuchsia-700 dark:text-fuchsia-400"
                                    userId={activeProfileId}
                                    onToggle={(name, value) => handleCheckToggle(entry.pokemonId, name, value)}
                                  />
                                </div>
                              );
                            }
                            return (
                              <div
                                key={check.name}
                                className={eligibility[check.name] ? undefined : "hidden"}
                              >
                              <GoCheckToggle
                                pokemonNationalDex={entry.nationalDex}
                                checkName={check.name}
                                label={check.label}
                                icon={check.icon ? <check.icon className="h-3 w-3" /> : undefined}
                                iconSrc={check.iconSrc}
                                accentHex={check.accentHex}
                                checked={entry.checks?.[check.name as keyof typeof entry.checks] || false}
                                switchClassName={check.switchClass}
                                labelActiveClass={check.activeLabelClass}
                                userId={activeProfileId}
                                shinyOverride={check.name === "isShiny" ? entry.checks?.shinyOverride : undefined}
                                onToggle={(name, value) => handleCheckToggle(entry.pokemonId, name, value)}
                                onToggleOverride={check.name === "isShiny" ? (value) => handleShinyOverride(entry.nationalDex, value) : undefined}
                              />
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Gen {entry.generation}</Badge>
                      </TableCell>
                      <TableCell className="border-l border-border/60 bg-muted/20 text-center">
                        <Switch
                          checked={entry.isHomeRegistered}
                          onCheckedChange={(checked) =>
                            handleHomeToggle(entry.pokemonId, entry.nationalDex, checked)
                          }
                          className="data-[checked]:bg-blue-500!"
                        />
                      </TableCell>
                      <TableCell className="bg-muted/20 text-center">
                        <Switch
                          checked={entry.isGoHome}
                          onCheckedChange={(checked) =>
                            handleGoHomeToggle(entry.pokemonId, entry.nationalDex, checked)
                          }
                          className="data-[checked]:bg-emerald-500!"
                        />
                      </TableCell>
                    </TableRow>
                    {entry.regionalForms.length > 0 && entry.regionalForms.map((rf) => (
                      <TableRow
                        key={`form-${rf.formId}`}
                        className="bg-muted/10 hover:bg-muted/20"
                      >
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDexNumber(entry.nationalDex)}
                        </TableCell>
                        <TableCell>
                          <div className="w-10 h-10 ml-4">
                            {rf.spriteUrl ? (
                              <Image
                                src={rf.spriteUrl}
                                alt={`${entry.name} ${rf.formName}`}
                                width={40}
                                height={40}
                                unoptimized
                                className="w-10 h-10"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs">
                                ?
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="text-blue-600">{formatPokemonName(entry.name)}</span>
                          <span className="text-muted-foreground text-xs ml-1">({rf.formName})</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {rf.types
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
                            checked={rf.isCaptured}
                            onCheckedChange={(checked) =>
                              handleFormCaptured(entry.pokemonId, rf.formId, checked)
                            }
                            className="data-[checked]:bg-red-500!"
                          />
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground text-xs">
                          {/female/i.test(rf.formName) ? (
                            <span
                              className="text-red-500 font-bold"
                              title="Hembra"
                              aria-label="Hembra"
                            >
                              ♀
                            </span>
                          ) : /male/i.test(rf.formName) ? (
                            <span
                              className="text-blue-500 font-bold"
                              title="Macho"
                              aria-label="Macho"
                            >
                              ♂
                            </span>
                          ) : (
                            "="
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.nationalDex === 718 ? (
                            <span className="text-muted-foreground text-xs">-</span>
                          ) : rf.isCaptured ? (
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={rf.isShiny}
                                onCheckedChange={(checked) =>
                                  handleFormShiny(entry.pokemonId, rf.formId, checked)
                                }
                                className="scale-75 data-[checked]:bg-[#39FF14]! data-[checked]:[&_[data-slot=switch-thumb]]:bg-green-700!"
                              />
                              <span className={`inline-flex items-center gap-1 text-xs ${rf.isShiny ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
                                <span
                                  aria-hidden
                                  className="inline-block h-3.5 w-3.5 shrink-0"
                                  style={{
                                    WebkitMaskImage: 'url(/badges/shiny.png)',
                                    maskImage: 'url(/badges/shiny.png)',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                    backgroundColor: rf.isShiny ? '#16A34A' : '#9CA3AF',
                                  }}
                                />
                                Shiny
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">Gen {entry.generation}</Badge>
                        </TableCell>
                        <TableCell className="border-l border-border/60 bg-muted/20 text-center">
                          <Switch
                            checked={rf.isHomeRegistered}
                            onCheckedChange={(checked) =>
                              handleFormHomeToggle(entry.pokemonId, rf.formId, checked)
                            }
                            className="data-[checked]:bg-sky-400!"
                          />
                        </TableCell>
                        <TableCell className="bg-muted/20 text-center"></TableCell>
                      </TableRow>
                    ))}
                    </>
                   );
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

      {/* Costume Dialog */}
      <Dialog
        open={costumeDialogPokemonId !== null}
        onOpenChange={(open) => { if (!open) setCostumeDialogPokemonId(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {costumeDialogPokemonId !== null
              ? `Disfraces - ${formatPokemonName(entries.find((e) => e.pokemonId === costumeDialogPokemonId)?.name ?? "")}`
              : "Disfraces"}
          </DialogTitle>
          {costumeDialogPokemonId !== null && (() => {
            const entry = entries.find((e) => e.pokemonId === costumeDialogPokemonId);
            if (!entry) return null;
            const registeredNames = new Set(entry.costumes.map((c) => c.costumeName));
            return (
              <div className="grid grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {entry.costumeForms.map((form) => {
                  const isRegistered = registeredNames.has(form.formName);
                  const displayName = form.formName
                    .replace(/^.*?-/, "")
                    .split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");
                  return (
                    <button
                      key={form.formName}
                      onClick={() =>
                        handleCostumeToggle(
                          entry.pokemonId,
                          entry.nationalDex,
                          form.formName,
                          !isRegistered
                        )
                      }
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                        isRegistered
                          ? "border-primary bg-primary/5"
                          : "border-border opacity-40 hover:opacity-70"
                      }`}
                    >
                      <Image
                        src={form.spriteUrl || entry.spriteUrl || "/placeholder.png"}
                        alt={displayName}
                        width={48}
                        height={48}
                        unoptimized
                        className={`w-12 h-12 ${!isRegistered ? "grayscale" : ""}`}
                      />
                      <span className="text-[10px] text-center leading-tight text-muted-foreground">
                        {displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
