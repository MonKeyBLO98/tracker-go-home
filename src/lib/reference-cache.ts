import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const REFERENCE_REVALIDATE = 7 * 24 * 3600;
export const REFERENCE_TAG = "reference-data";

export const getCachedPokemonPage = unstable_cache(
  async (page: number, pageSize: number, generation?: number, type?: string, search?: string) => {
    const where: Record<string, unknown> = {};
    if (generation) where.generation = generation;
    if (type) where.types = { some: { typeName: type } };
    if (search) where.name = { contains: search.toLowerCase() };

    const [pokemon, total] = await Promise.all([
      prisma.pokemon.findMany({
        where,
        include: { types: { select: { typeName: true, slot: true } } },
        orderBy: { nationalDex: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pokemon.count({ where }),
    ]);

    return { pokemon, total };
  },
  ["pokemon-page"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedPokemonBase = unstable_cache(
  async (nationalDex: number) => {
    return prisma.pokemon.findUnique({
      where: { nationalDex },
      include: {
        types: { select: { typeName: true, slot: true } },
        abilities: { select: { abilityName: true, isHidden: true } },
        forms: {
          select: {
            formName: true,
            spriteUrl: true,
            isMega: true,
            isShadow: true,
            isGmax: true,
            isCostume: true,
          },
        },
      },
    });
  },
  ["pokemon-base"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedPokemonStats = unstable_cache(
  async () => {
    const [total, legendaries, mythicals, byGeneration] = await Promise.all([
      prisma.pokemon.count(),
      prisma.pokemon.count({ where: { isLegendary: true } }),
      prisma.pokemon.count({ where: { isMythical: true } }),
      prisma.pokemon.groupBy({ by: ["generation"], _count: true, orderBy: { generation: "asc" } }),
    ]);
    return { total, legendaries, mythicals, byGeneration };
  },
  ["pokemon-stats"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedAttackers = unstable_cache(
  async (attackType?: string, search?: string) => {
    const where: Record<string, unknown> = {};
    if (attackType) where.attackType = attackType;
    if (search) where.pokemonName = { contains: search };

    return prisma.attackerRanking.findMany({
      where,
      include: { pokemon: { select: { spriteUrl: true } } },
      orderBy: { rank: "asc" },
    });
  },
  ["attackers"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedAttackerStats = unstable_cache(
  async () => {
    const [totalRankings, latest] = await Promise.all([
      prisma.attackerRanking.count(),
      prisma.attackerRanking.findFirst({
        orderBy: { lastUpdated: "desc" },
        select: { lastUpdated: true },
      }),
    ]);
    return { totalRankings, lastUpdated: latest?.lastUpdated ?? null };
  },
  ["attacker-stats"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedPvpRankings = unstable_cache(
  async (league: string) => {
    return prisma.pvpRanking.findMany({
      where: { league },
      include: { pokemon: { select: { spriteUrl: true } } },
      orderBy: { rank: "asc" },
    });
  },
  ["pvp-rankings"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedPvpStats = unstable_cache(
  async () => {
    const leagues = ["great", "ultra", "master"];
    const counts = await Promise.all(
      leagues.map((l) => prisma.pvpRanking.count({ where: { league: l } }))
    );
    const rankingsPerLeague: Record<string, number> = {};
    leagues.forEach((l, i) => {
      rankingsPerLeague[l] = counts[i];
    });
    return { rankingsPerLeague };
  },
  ["pvp-stats"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedPvpIvs = unstable_cache(
  async (league: string, speciesId?: string) => {
    const where: Record<string, unknown> = { league };
    if (speciesId) where.speciesId = speciesId;
    return prisma.pvpIvRanking.findMany({
      where,
      include: { pokemon: { select: { spriteUrl: true } } },
      orderBy: { rank: "asc" },
      take: speciesId ? 50 : 200,
    });
  },
  ["pvp-ivs"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedPvpIvStats = unstable_cache(
  async () => {
    const leagues = ["great", "ultra", "master"];
    const [ivCounts, pokemonCounts] = await Promise.all([
      Promise.all(leagues.map((l) => prisma.pvpIvRanking.count({ where: { league: l } }))),
      Promise.all(
        leagues.map((l) =>
          prisma.pvpIvRanking.groupBy({ by: ["pokemonId"], where: { league: l } }).then((g) => g.length)
        )
      ),
    ]);
    const ivsPerLeague: Record<string, number> = {};
    const pokemonPerLeague: Record<string, number> = {};
    leagues.forEach((l, i) => {
      ivsPerLeague[l] = ivCounts[i];
      pokemonPerLeague[l] = pokemonCounts[i];
    });
    return { ivsPerLeague, pokemonPerLeague };
  },
  ["pvp-ivs-stats"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedMoves = unstable_cache(
  async (category?: string, type?: string) => {
    const where: Record<string, unknown> = {};
    if (category && category !== "all") where.category = category;
    if (type && type !== "all") where.type = type;
    return prisma.move.findMany({
      where,
      orderBy:
        category === "charged"
          ? { dpe: "desc" }
          : category === "fast"
          ? { dps: "desc" }
          : { power: "desc" },
      take: 100,
    });
  },
  ["moves"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedMoveStats = unstable_cache(
  async () => {
    const [total, fast, charged] = await Promise.all([
      prisma.move.count(),
      prisma.move.count({ where: { category: "fast" } }),
      prisma.move.count({ where: { category: "charged" } }),
    ]);
    const grouped = await prisma.move.groupBy({ by: ["type"], _count: { id: true } });
    const byType: Record<string, number> = {};
    for (const g of grouped) byType[g.type] = g._count.id;
    return { total, fast, charged, byType };
  },
  ["move-stats"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedMiniDexGames = unstable_cache(
  async () => {
    return prisma.homeGame.findMany({ orderBy: { id: "asc" } });
  },
  ["mini-dex-games"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedMiniDexRows = unstable_cache(
  async (gameKey: string) => {
    return prisma.homeGameDex.findMany({
      where: { gameKey },
      orderBy: [{ dexNumber: "asc" }, { formName: "asc" }],
      include: {
        pokemon: {
          select: { id: true, nationalDex: true, name: true, spriteUrl: true },
        },
      },
    });
  },
  ["mini-dex-rows"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getCachedGameDexMap = unstable_cache(
  async () => {
    const rows = await prisma.homeGameDex.findMany({
      orderBy: [{ dexNumber: "asc" }, { formName: "asc" }],
      select: { gameKey: true, pokemon: { select: { nationalDex: true } } },
    });
    const map: Record<string, number[]> = {};
    for (const row of rows) {
      (map[row.gameKey] ??= []).push(row.pokemon.nationalDex);
    }
    return map;
  },
  ["game-dex-map"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);

export const getGoReferenceTotals = unstable_cache(
  async () => {
    const [totalPokemon, totalMythical, totalMega, totalGmax, totalShadow] =
      await Promise.all([
        prisma.pokemon.count(),
        prisma.pokemon.count({ where: { isMythical: true } }),
        prisma.pokemon.count({ where: { hasMega: true } }),
        prisma.pokemon.count({ where: { hasGmax: true } }),
        prisma.pokemon.count({ where: { hasShadow: true } }),
      ]);
    return { totalPokemon, totalMythical, totalMega, totalGmax, totalShadow };
  },
  ["go-reference-totals"],
  { tags: [REFERENCE_TAG], revalidate: REFERENCE_REVALIDATE }
);
