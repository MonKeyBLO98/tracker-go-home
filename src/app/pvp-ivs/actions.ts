"use server";

import { prisma } from "@/lib/prisma";
import type { PvpIvRow } from "./types";
import { getCachedPvpIvs, getCachedPvpIvStats } from "@/lib/reference-cache";

export async function getPvpIvs(
  league: string,
  speciesId?: string
): Promise<PvpIvRow[]> {
  const results = await getCachedPvpIvs(league, speciesId);

  return results.map((r) => ({
    id: r.id,
    pokemonId: r.pokemonId,
    league: r.league,
    rank: r.rank,
    speciesId: r.speciesId,
    pokemonName: r.pokemonName,
    level: r.level,
    attackIv: r.attackIv,
    defenseIv: r.defenseIv,
    staminaIv: r.staminaIv,
    attack: r.attack,
    defense: r.defense,
    hp: r.hp,
    cp: r.cp,
    statProduct: r.statProduct,
    percentBest: r.percentBest,
    spriteUrl: r.pokemon.spriteUrl,
  }));
}

export async function getPvpIvStats(): Promise<{
  ivsPerLeague: Record<string, number>;
  pokemonPerLeague: Record<string, number>;
}> {
  return getCachedPvpIvStats();
}

export async function searchPokemon(
  query: string
): Promise<{ speciesId: string; name: string }[]> {
  if (!query || query.length < 2) return [];

  const allPokemon = await prisma.pokemon.findMany({
    select: { id: true, name: true },
  });

  const lower = query.toLowerCase();
  return allPokemon
    .filter((p) => p.name.toLowerCase().includes(lower))
    .slice(0, 20)
    .map((p) => ({
      speciesId: p.name.toLowerCase().replace(/\s+/g, "_"),
      name: p.name,
    }));
}

export async function refreshPvpIvs(): Promise<{ message: string }> {
  return {
    message:
      "To refresh PvP IVs, run: npx tsx prisma/scrape-pvp-ivs.ts",
  };
}
