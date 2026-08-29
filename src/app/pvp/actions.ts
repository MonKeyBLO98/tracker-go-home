"use server";

import type { PvpRankingRow } from "./types";
import { getCachedPvpRankings, getCachedPvpStats } from "@/lib/reference-cache";

export async function getPvpRankings(league: string): Promise<PvpRankingRow[]> {
  const results = await getCachedPvpRankings(league);

  return results.map((r) => ({
    id: r.id,
    pokemonId: r.pokemonId,
    league: r.league,
    rank: r.rank,
    speciesId: r.speciesId,
    pokemonName: r.pokemonName,
    rating: r.rating,
    score: r.score,
    scoreLeads: r.scoreLeads,
    scoreClosers: r.scoreClosers,
    scoreSwitches: r.scoreSwitches,
    scoreChargers: r.scoreChargers,
    scoreAttackers: r.scoreAttackers,
    scoreConsistency: r.scoreConsistency,
    moveset: r.moveset,
    fastMove: r.fastMove,
    chargedMove1: r.chargedMove1,
    chargedMove2: r.chargedMove2,
    editorScore: r.editorScore,
    editorNotes: r.editorNotes,
    atk: r.atk,
    def_: r.def_,
    hp: r.hp,
    product: r.product,
    spriteUrl: r.pokemon.spriteUrl,
  }));
}

export async function getPvpStats(): Promise<{
  rankingsPerLeague: Record<string, number>;
}> {
  return getCachedPvpStats();
}

export async function refreshPvpRankings(): Promise<{
  message: string;
}> {
  return {
    message:
      "To refresh PvP rankings, run: npx tsx prisma/scrape-pvp-rankings.ts",
  };
}
