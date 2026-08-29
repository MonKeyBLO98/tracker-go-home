"use server";

import type { MoveRow } from "./types";
import { getCachedMoves, getCachedMoveStats } from "@/lib/reference-cache";

export async function getMoves(
  category?: string,
  type?: string
): Promise<MoveRow[]> {
  const results = await getCachedMoves(category, type);

  return results.map((r) => ({
    id: r.id,
    moveId: r.moveId,
    name: r.name,
    type: r.type,
    category: r.category,
    power: r.power,
    energy: r.energy,
    energyGain: r.energyGain,
    cooldown: r.cooldown,
    turns: r.turns,
    archetype: r.archetype,
    dps: r.dps,
    dpe: r.dpe,
  }));
}

export async function getMoveStats(): Promise<{
  total: number;
  fast: number;
  charged: number;
  byType: Record<string, number>;
}> {
  return getCachedMoveStats();
}
