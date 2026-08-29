"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAbilities, toggleRegisteredAbility } from "./actions";
import { formatAbilityName, type AbilityRow } from "./types";
import { Search, Filter, ListChecks } from "lucide-react";
import { useAppStore } from "@/stores/app-store";

export default function AbilitiesPage() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [abilities, setAbilities] = useState<AbilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [registeredFilter, setRegisteredFilter] = useState<boolean | undefined>(undefined);

  const fetchAbilities = useCallback(async () => {
    try {
      const result = await getAbilities(activeProfileId);
      setAbilities(result);
    } catch (error) {
      console.error("Error fetching abilities:", error);
    } finally {
      setLoading(false);
    }
  }, [activeProfileId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      await fetchAbilities();
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchAbilities]);

  const filtered = useMemo(() => {
    let result = abilities;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.abilityName.includes(q) ||
          a.nameEs.toLowerCase().includes(q) ||
          formatAbilityName(a.abilityName).toLowerCase().includes(q)
      );
    }
    if (registeredFilter !== undefined) {
      result = result.filter((a) =>
        registeredFilter ? a.isRegistered : !a.isRegistered
      );
    }
    return result;
  }, [abilities, search, registeredFilter]);

  const totalRegistered = useMemo(
    () => abilities.filter((a) => a.isRegistered).length,
    [abilities]
  );

  const handleToggle = async (abilityName: string, value: boolean) => {
    setAbilities((prev) =>
      prev.map((a) =>
        a.abilityName === abilityName ? { ...a, isRegistered: value } : a
      )
    );
    await toggleRegisteredAbility(abilityName, value, activeProfileId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Habilidades</h2>
        <p className="text-muted-foreground">
          {loading
            ? "Cargando habilidades..."
            : `${totalRegistered} de ${abilities.length} registradas`}
        </p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total habilidades</p>
            <p className="text-2xl font-bold">{abilities.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Registradas</p>
            <p className="text-2xl font-bold text-emerald-500">{totalRegistered}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar habilidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            <Filter className="h-4 w-4" />
            {registeredFilter === undefined
              ? "Todas"
              : registeredFilter
              ? "Registradas"
              : "No Registradas"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setRegisteredFilter(undefined)}>
              Todas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRegisteredFilter(true)}>
              Registradas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRegisteredFilter(false)}>
              No Registradas
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
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28 text-center">Registrada</TableHead>
                    <TableHead>Habilidad</TableHead>
                    <TableHead className="w-24 text-center">#Pokémon</TableHead>
                    <TableHead className="w-20 text-center">Oculta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ab) => (
                    <TableRow key={ab.abilityName}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <Switch
                            checked={ab.isRegistered}
                            onCheckedChange={(checked) => handleToggle(ab.abilityName, checked)}
                            className="data-[checked]:bg-emerald-500!"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {ab.nameEs}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatAbilityName(ab.abilityName)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {ab.speciesCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {ab.hasHidden ? (
                          <Badge variant="outline" className="text-[10px]">
                            Sí
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ListChecks className="h-8 w-8" />
                          <p>No se encontraron habilidades</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
