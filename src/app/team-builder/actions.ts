"use server";

import { prisma } from "@/lib/prisma";
import { getEffectiveness, type PokemonType } from "@/app/type-chart/types";
import type { TeamAnalysis } from "./types";

export async function searchPokemonForTeam(
  query: string
): Promise<{ id: number; name: string; nationalDex: number; types: string[]; spriteUrl: string | null }[]> {
  if (!query || query.length < 2) return [];

  const results = await prisma.pokemon.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { nationalDex: parseInt(query) || -1 },
      ],
    },
    include: {
      types: { select: { typeName: true } },
    },
    take: 15,
    orderBy: { nationalDex: "asc" },
  });

  return results.map((p) => ({
    id: p.id,
    name: p.name,
    nationalDex: p.nationalDex,
    types: p.types.map((t) => t.typeName),
    spriteUrl: p.spriteUrl,
  }));
}

const ALL_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic",
  "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

export async function analyzeTeam(
  team: { types: string[] }[]
): Promise<TeamAnalysis> {
  if (team.length === 0) {
    return {
      attackCoverage: [],
      typeWeaknesses: [],
      typeResistances: [],
      dualTypeCoverage: [],
      score: 0,
      summary: "Agrega Pokemon al equipo para ver el análisis.",
    };
  }

  // Collect all types in the team
  const teamTypes = new Set<string>();
  team.forEach((p) => p.types.forEach((t) => teamTypes.add(t)));

  // Check which types the team can hit super effectively
  const attackCoverage = new Set<string>();
  for (const atkType of teamTypes) {
    for (const defType of ALL_TYPES) {
      if (getEffectiveness(atkType as PokemonType, defType as PokemonType) >= 2) {
        attackCoverage.add(defType);
      }
    }
  }

  // Calculate defensive weaknesses
  const weaknessCount: Record<string, number> = {};
  const resistanceCount: Record<string, number> = {};

  for (const defType of ALL_TYPES) {
    for (const pokemon of team) {
      for (const pType of pokemon.types) {
        const mult = getEffectiveness(defType as PokemonType, pType as PokemonType);
        if (mult > 1) weaknessCount[defType] = (weaknessCount[defType] || 0) + 1;
        if (mult > 0 && mult < 1) resistanceCount[defType] = (resistanceCount[defType] || 0) + 1;
      }
    }
  }

  const typeWeaknesses = Object.entries(weaknessCount)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const typeResistances = Object.entries(resistanceCount)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate coverage score
  const coverageScore = (attackCoverage.size / ALL_TYPES.length) * 50;
  const weaknessPenalty = typeWeaknesses.filter((w) => w.count >= 3).length * -5;
  const resistanceBonus = typeResistances.filter((r) => r.count >= 2).length * 5;
  const score = Math.max(0, Math.min(100, Math.round(coverageScore + weaknessPenalty + resistanceBonus + 30)));

  // Generate summary
  const uncovered = ALL_TYPES.filter((t) => !attackCoverage.has(t));
  const summaryParts: string[] = [];
  if (uncovered.length > 0) {
    summaryParts.push(`No cubres: ${uncovered.join(", ")}`);
  }
  if (typeWeaknesses.length > 0 && typeWeaknesses[0].count >= 3) {
    summaryParts.push(`Vulnerabilidad alta: ${typeWeaknesses[0].type} (${typeWeaknesses[0].count}x)`);
  }

  return {
    attackCoverage: Array.from(attackCoverage),
    typeWeaknesses,
    typeResistances,
    dualTypeCoverage: [],
    score,
    summary: summaryParts.length > 0 ? summaryParts.join(" | ") : "Buena cobertura de tipos.",
  };
}
