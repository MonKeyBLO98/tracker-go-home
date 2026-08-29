"use server";

import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/profile";

export interface GenerationProgressRow {
  generation: number;
  total: number;
  goCaptured: number;
  homeRegistered: number;
}

export interface GoCheckSlice {
  label: string;
  value: number;
}

export interface HomeGameSlice {
  gameKey: string;
  gameName: string;
  registered: number;
  totalSpecies: number;
}

export interface ChartsData {
  generations: GenerationProgressRow[];
  goChecks: GoCheckSlice[];
  homeGames: HomeGameSlice[];
  totals: {
    totalPokemon: number;
    goCaptured: number;
    homeRegistered: number;
  };
}

export async function getChartsData(userId?: number | null): Promise<ChartsData> {
  const uid = await resolveUserId(userId);
  const [
    totalByGen,
    goByGen,
    homeByGen,
    shiny,
    lucky,
    hundo,
    xxl,
    xxs,
    mega,
    gmax,
    shadow,
    purified,
    games,
    gameOrigins,
  ] = await Promise.all([
    prisma.pokemon.groupBy({
      by: ["generation"],
      _count: { _all: true },
      orderBy: { generation: "asc" },
    }),
    prisma.pokemon.groupBy({
      by: ["generation"],
      where: { goEntries: { some: { userId: uid, isCaptured: true } } },
      _count: { _all: true },
      orderBy: { generation: "asc" },
    }),
    prisma.pokemon.groupBy({
      by: ["generation"],
      where: { homeEntries: { some: { userId: uid, isRegistered: true } } },
      _count: { _all: true },
      orderBy: { generation: "asc" },
    }),
    prisma.goCheck.count({ where: { isShiny: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isLucky: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isHundo: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isXXL: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isXXS: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { OR: [{ isMegaX: true }, { isMegaY: true }], entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isGmax: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isShadow: true, entry: { userId: uid } } }),
    prisma.goCheck.count({ where: { isPurified: true, entry: { userId: uid } } }),
    prisma.homeGame.findMany({ orderBy: { id: "asc" } }),
    prisma.homeGameOrigin.groupBy({
      by: ["gameKey"],
      _count: { _all: true },
      where: { entry: { userId: uid } },
    }),
  ]);

  const generations: GenerationProgressRow[] = totalByGen.map((g) => ({
    generation: g.generation,
    total: g._count._all,
    goCaptured: goByGen.find((x) => x.generation === g.generation)?._count._all ?? 0,
    homeRegistered:
      homeByGen.find((x) => x.generation === g.generation)?._count._all ?? 0,
  }));

  const goChecks: GoCheckSlice[] = [
    { label: "Shiny", value: shiny },
    { label: "Lucky", value: lucky },
    { label: "Hundo", value: hundo },
    { label: "XXL", value: xxl },
    { label: "XXS", value: xxs },
    { label: "Mega", value: mega },
    { label: "Gmax", value: gmax },
    { label: "Shadow", value: shadow },
    { label: "Purified", value: purified },
  ];

  const homeGames: HomeGameSlice[] = games.map((game) => ({
    gameKey: game.gameKey,
    gameName: game.gameName,
    totalSpecies: game.totalSpecies,
    registered:
      gameOrigins.find((o) => o.gameKey === game.gameKey)?._count._all ?? 0,
  }));

  return {
    generations,
    goChecks,
    homeGames,
    totals: {
      totalPokemon: generations.reduce((acc, g) => acc + g.total, 0),
      goCaptured: generations.reduce((acc, g) => acc + g.goCaptured, 0),
      homeRegistered: generations.reduce((acc, g) => acc + g.homeRegistered, 0),
    },
  };
}
