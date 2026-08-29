"use server";

import { prisma } from "@/lib/prisma";
import type { AttackerRow } from "./types";
import {
  getCachedAttackerStats,
  getCachedAttackers,
} from "@/lib/reference-cache";

export async function getAttackers(filters: {
  attackType?: string;
  search?: string;
}): Promise<AttackerRow[]> {
  const results = await getCachedAttackers(filters.attackType, filters.search);

  return results.map((r) => ({
    id: r.id,
    pokemonId: r.pokemonId,
    pokemonName: r.pokemonName,
    form: r.form,
    rank: r.rank,
    tier: r.tier,
    attackType: r.attackType,
    fastMove: r.fastMove,
    fastMoveType: r.fastMoveType,
    chargedMove: r.chargedMove,
    chargedMoveType: r.chargedMoveType,
    dps: r.dps,
    tdo: r.tdo,
    edps: r.edps,
    faints: r.faints,
    ttw: r.ttw,
    percentBest: r.percentBest,
    spriteUrl: r.pokemon.spriteUrl,
  }));
}

export async function getAttackerStats(): Promise<{
  totalRankings: number;
  lastUpdated: Date | null;
}> {
  return getCachedAttackerStats();
}

export async function refreshAttackers(): Promise<{
  success: boolean;
  count: number;
}> {
  const count = await prisma.attackerRanking.count();
  return { success: true, count };
}
