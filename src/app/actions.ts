"use server";

import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/profile";

export interface DashboardStats {
  totalPokemon: number;
  goCaptured: number;
  goShiny: number;
  goLucky: number;
  goHundo: number;
  goShadow: number;
  goMegaGmax: number;
  homeRegistered: number;
  pvpRankings: number;
  attackerRankings: number;
  moveCount: number;
  pvpIvCount: number;
}

export async function getDashboardStats(userId?: number | null): Promise<DashboardStats> {
  const uid = await resolveUserId(userId);
  const [
    totalPokemon,
    goCaptured,
    goShiny,
    goLucky,
    goHundo,
    goShadow,
    goMega,
    goGmax,
    homeRegistered,
    pvpRankings,
    attackerRankings,
    moveCount,
    pvpIvCount,
  ] = await Promise.all([
    prisma.pokemon.count(),
    prisma.goEntry.count({ where: { userId: uid, isCaptured: true } }),
    prisma.goCheck.count({ where: { isShiny: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isLucky: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isHundo: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isShadow: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { OR: [{ isMegaX: true }, { isMegaY: true }], entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isGmax: true, entry: { userId: uid } } }),
    prisma.homeEntry.count({ where: { userId: uid, isRegistered: true } }),
    prisma.pvpRanking.count(),
    prisma.attackerRanking.count(),
    prisma.move.count(),
    prisma.pvpIvRanking.count(),
  ]);

  return {
    totalPokemon,
    goCaptured,
    goShiny,
    goLucky,
    goHundo,
    goShadow,
    goMegaGmax: goMega + goGmax,
    homeRegistered,
    pvpRankings,
    attackerRankings,
    moveCount,
    pvpIvCount,
  };
}
