import type { PrismaClient } from "@/generated/prisma/client";
import { runAttackersScraper } from "./attackers";
import { runPvpRankingsScraper } from "./pvp-rankings";
import { runPvpIvsScraper } from "./pvp-ivs";
import { runMovesScraper } from "./moves";
import { populateBaseStats } from "./base-stats";

export type ScraperKey = "attackers" | "pvp" | "pvp-ivs" | "moves";

export const SCRAPERS: Record<ScraperKey, { label: string; run: (prisma: PrismaClient) => Promise<void> }> = {
  attackers: { label: "Best Attackers (DittoBase)", run: runAttackersScraper },
  pvp: { label: "PvP Rankings (PvPoke)", run: runPvpRankingsScraper },
  "pvp-ivs": { label: "Mejores IVs PvP (PvPoke)", run: runPvpIvsScraper },
  moves: { label: "Move Rankings (PvPoke)", run: runMovesScraper },
};

export async function runAllScrapers(prisma: PrismaClient): Promise<void> {
  await runAttackersScraper(prisma);
  await runPvpRankingsScraper(prisma);
  await runMovesScraper(prisma);
  await runPvpIvsScraper(prisma);
}

export { runAttackersScraper, runPvpRankingsScraper, runPvpIvsScraper, runMovesScraper, populateBaseStats };
