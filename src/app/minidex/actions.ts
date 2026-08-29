"use server";

import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/profile";
import { minidexIconParts } from "./types";
import type { GameDexMap, MiniDexEntry, MiniDexGame } from "./types";
import {
  getCachedMiniDexGames,
  getCachedMiniDexRows,
  getCachedGameDexMap,
} from "@/lib/reference-cache";

export async function getMiniDexGames(): Promise<MiniDexGame[]> {
  const games = await getCachedMiniDexGames();
  return games.map((g) => ({
    gameKey: g.gameKey,
    gameName: g.gameName,
    totalSpecies: g.totalSpecies,
    icons: minidexIconParts(g.gameKey),
  }));
}

export async function getMiniDex({
  gameKey,
  userId,
}: {
  gameKey: string;
  userId?: number | null;
}): Promise<MiniDexEntry[]> {
  const uid = await resolveUserId(userId);

  const [rows, origins] = await Promise.all([
    getCachedMiniDexRows(gameKey),
    prisma.homeGameOrigin.findMany({
      where: { gameKey, entry: { userId: uid } },
      select: { entry: { select: { pokemonId: true } } },
    }),
  ]);

  const registeredIds = new Set(origins.map((o) => o.entry.pokemonId));

  return rows.map((r) => ({
    pokemonId: r.pokemonId,
    nationalDex: r.pokemon.nationalDex,
    name: r.pokemon.name,
    dexNumber: r.dexNumber,
    formName: r.formName,
    spriteUrl: r.spriteUrl ?? r.pokemon.spriteUrl,
    registered: registeredIds.has(r.pokemonId),
  }));
}

export async function getGameDexMap(userId?: number | null): Promise<GameDexMap> {
  await resolveUserId(userId);
  return getCachedGameDexMap();
}
