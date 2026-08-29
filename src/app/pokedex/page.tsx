"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PokemonCard } from "@/components/pokemon-card";
import { PokemonDetail } from "@/components/pokemon-detail";
import { PokemonFilters } from "@/components/pokemon-filters";
import { getPokemon, getPokemonById, type PokemonWithTypes } from "./actions";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Fuse from "fuse.js";

type PokemonDetailed = PokemonWithTypes & {
  abilities?: { abilityName: string; isHidden: boolean }[];
  forms?: {
    formName: string;
    spriteUrl: string | null;
    isMega: boolean;
    isShadow: boolean;
    isGmax: boolean;
    isCostume: boolean;
  }[];
};

export default function PokedexPage() {
  const [pokemon, setPokemon] = useState<PokemonWithTypes[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generation, setGeneration] = useState<number | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetailed | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fuseRef = useRef<Fuse<PokemonWithTypes> | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return getPokemon({
          page,
          pageSize: 36,
          generation: generation || undefined,
          type: type || undefined,
        });
      })
      .then((result) => {
        if (!active) return;
        if (search && !generation && !type) {
          if (!fuseRef.current) {
            fuseRef.current = new Fuse(result.pokemon, {
              keys: ["name", "nationalDex"],
              threshold: 0.3,
            });
          }
          const fuseResults = fuseRef.current.search(search);
          setPokemon(fuseResults.map((r) => r.item));
          setTotal(fuseResults.length);
        } else {
          fuseRef.current = null;
          setPokemon(result.pokemon);
          setTotal(result.total);
          setTotalPages(result.totalPages);
        }
      })
      .catch((error) => {
        console.error("Error fetching Pokemon:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, generation, type, search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleGenerationChange = (value: number | null) => {
    setGeneration(value);
    setPage(1);
    setSearch("");
    fuseRef.current = null;
  };

  const handleTypeChange = (value: string | null) => {
    setType(value);
    setPage(1);
    setSearch("");
    fuseRef.current = null;
  };

  const handlePokemonClick = async (pokemon: PokemonWithTypes) => {
    setDetailOpen(true);
    try {
      const detailed = await getPokemonById(pokemon.nationalDex);
      if (detailed) {
        setSelectedPokemon({
          ...pokemon,
          abilities: detailed.abilities,
          forms: detailed.forms,
        });
      } else {
        setSelectedPokemon(pokemon);
      }
    } catch {
      setSelectedPokemon(pokemon);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pokédex Nacional</h2>
          <p className="text-muted-foreground">
            {total} Pokémon disponibles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
        </div>
      </div>

      {/* Filters */}
      <PokemonFilters
        search={search}
        onSearchChange={handleSearchChange}
        generation={generation}
        onGenerationChange={handleGenerationChange}
        type={type}
        onTypeChange={handleTypeChange}
      />

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 36 }).map((_, i) => (
            <Card key={i}>
              <div className="p-4">
                <Skeleton className="h-4 w-12 mb-3" />
                <div className="flex justify-center">
                  <Skeleton className="w-24 h-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-20 mx-auto mt-3" />
                <div className="flex justify-center gap-1 mt-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pokemon Grid */}
      {!loading && (
        <>
          {pokemon.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No se encontraron Pokémon</p>
                <p className="text-sm text-muted-foreground">
                  Intenta con otros filtros o términos de búsqueda
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {pokemon.map((p) => (
                <PokemonCard
                  key={p.id}
                  pokemon={p}
                  onClick={() => handlePokemonClick(p)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!search && totalPages > 1 && (
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
        </>
      )}

      {/* Detail Dialog */}
      <PokemonDetail
        pokemon={selectedPokemon}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
