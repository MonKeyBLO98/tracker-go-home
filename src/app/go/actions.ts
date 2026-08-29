"use server";

import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/profile";
import { resolveCheckEligibility } from "@/lib/check-eligibility";
import { getGoReferenceTotals } from "@/lib/reference-cache";

export type GoGenderValue = "male" | "female" | "both" | "genderless";

export interface PokemonGoRow {
  id: number;
  pokemonId: number;
  nationalDex: number;
  name: string;
  generation: number;
  spriteUrl: string | null;
  officialArtwork: string | null;
  genderRate: number | null;
  isMythical: boolean;
  hasMega: boolean;
  hasGmax: boolean;
  hasShadow: boolean;
  isHomeRegistered: boolean;
  isGoHome: boolean;
  types: { typeName: string; slot: number }[];
  isCaptured: boolean;
  capturedAt: Date | null;
  entryId: number | null;
  gender: GoGenderValue | null;
  checks: {
    isShiny: boolean;
    shinyOverride: boolean;
    isLucky: boolean;
    isHundo: boolean;
    isXXL: boolean;
    isXXS: boolean;
    isGmax: boolean;
    isMegaX: boolean;
    isMegaY: boolean;
    isShadow: boolean;
    isPurified: boolean;
    hasCostume: boolean;
  } | null;
  stats: {
    cp: number | null;
    level: number | null;
    attackIv: number | null;
    defenseIv: number | null;
    staminaIv: number | null;
  } | null;
  costumes: { costumeName: string }[];
  costumeForms: { formName: string; spriteUrl: string | null }[];
  megaForms: string[];
  regionalForms: {
    formId: number;
    formName: string;
    spriteUrl: string | null;
    types: { typeName: string; slot: number }[];
    isCaptured: boolean;
    capturedAt: Date | null;
    isShiny: boolean;
    isHomeRegistered: boolean;
  }[];
}

export interface PaginatedGoEntries {
  entries: PokemonGoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getGoEntries({
  page = 1,
  pageSize = 50,
  search,
  captured,
  generation,
  userId,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  captured?: boolean;
  generation?: number;
  userId?: number | null;
}): Promise<PaginatedGoEntries> {
  const uid = await resolveUserId(userId);
  const where: Record<string, unknown> = {};

  if (search) {
    // Con búsqueda activa se muestra la línea evolutiva completa (ignora el filtro de generación).
    const num = parseInt(search);
    const directMatch: Record<string, unknown> = isNaN(num)
      ? { name: { contains: search.toLowerCase() } }
      : { nationalDex: num };
    const matches = await prisma.pokemon.findMany({
      where: directMatch,
      select: { evoChainId: true },
    });
    const chainIds = [
      ...new Set(
        matches
          .map((m) => m.evoChainId)
          .filter((id): id is number => id !== null)
      ),
    ];
    const orConditions: Record<string, unknown>[] = [directMatch];
    if (chainIds.length > 0) {
      orConditions.push({ evoChainId: { in: chainIds } });
    }
    where.OR = orConditions;
  } else if (generation !== undefined) {
    where.generation = generation;
  }

  if (captured !== undefined) {
    where.goEntries = captured
      ? { some: { userId: uid, isCaptured: true } }
      : { none: { userId: uid, isCaptured: true } };
  }

  const [pokemonList, total] = await Promise.all([
    prisma.pokemon.findMany({
      where,
      include: {
        types: { select: { typeName: true, slot: true } },
        goEntries: {
          where: { userId: uid },
          include: {
            checks: true,
            stats: true,
            costumes: true,
          },
          take: 1,
        },
        forms: {
          where: { isCostume: true },
          select: { formName: true, spriteUrl: true },
        },
        homeEntries: {
          where: { userId: uid },
          include: { gameOrigin: true },
          take: 1,
        },
      },
      orderBy: { nationalDex: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pokemon.count({ where }),
  ]);

  const pokemonIds = pokemonList.map((p) => p.id);
  const megaFormsList = await prisma.pokemonForm.findMany({
    where: { pokemonId: { in: pokemonIds }, isMega: true },
    select: { pokemonId: true, formName: true },
  });
  const megaFormsByPokemon = new Map<number, string[]>();
  for (const mf of megaFormsList) {
    const arr = megaFormsByPokemon.get(mf.pokemonId) ?? [];
    arr.push(mf.formName);
    megaFormsByPokemon.set(mf.pokemonId, arr);
  }

  const regionalFormsList = await prisma.pokemonForm.findMany({
    where: { pokemonId: { in: pokemonIds }, isRegional: true },
    include: {
      types: { select: { typeName: true, slot: true } },
    },
    orderBy: { formName: "asc" },
  });

  const regionalFormIds = regionalFormsList.map((f) => f.id);
  const goFormEntries = await prisma.goFormEntry.findMany({
    where: { formId: { in: regionalFormIds }, userId: uid },
  });
  const goFormEntryMap = new Map<number, typeof goFormEntries[0]>();
  for (const gfe of goFormEntries) {
    goFormEntryMap.set(gfe.formId, gfe);
  }

  const homeFormEntries = await prisma.homeFormEntry.findMany({
    where: { formId: { in: regionalFormIds }, userId: uid },
  });
  const homeFormEntryMap = new Map<number, typeof homeFormEntries[0]>();
  for (const hfe of homeFormEntries) {
    homeFormEntryMap.set(hfe.formId, hfe);
  }

  const regionalFormsByPokemon = new Map<number, typeof regionalFormsList>();
  for (const rf of regionalFormsList) {
    const arr = regionalFormsByPokemon.get(rf.pokemonId) ?? [];
    arr.push(rf);
    regionalFormsByPokemon.set(rf.pokemonId, arr);
  }

  const entries: PokemonGoRow[] = pokemonList.map((p) => {
    const goEntry = p.goEntries[0];
    const homeEntry = p.homeEntries[0];
    return {
      id: goEntry?.id ?? 0,
      pokemonId: p.id,
      nationalDex: p.nationalDex,
      name: p.name,
      generation: p.generation,
      spriteUrl: p.spriteUrl,
      officialArtwork: p.officialArtwork,
      types: p.types,
      genderRate: p.genderRate,
      isMythical: p.isMythical,
      hasMega: p.hasMega,
      hasGmax: p.hasGmax,
      hasShadow: p.hasShadow,
      isHomeRegistered: homeEntry?.isRegistered ?? false,
      isGoHome:
        homeEntry?.gameOrigin.some((g) => g.gameKey === "go") ?? false,
      isCaptured: goEntry?.isCaptured ?? false,
      capturedAt: goEntry?.capturedAt ?? null,
      entryId: goEntry?.id ?? null,
      gender: (goEntry?.gender as GoGenderValue | null) ?? null,
      checks: goEntry?.checks ?? null,
      stats: goEntry?.stats ?? null,
      costumes: goEntry?.costumes ?? [],
      costumeForms: p.forms,
      megaForms: megaFormsByPokemon.get(p.id) ?? [],
      regionalForms: (regionalFormsByPokemon.get(p.id) ?? []).map((rf) => {
        const gfe = goFormEntryMap.get(rf.id);
        const hfe = homeFormEntryMap.get(rf.id);
        return {
          formId: rf.id,
          formName: rf.formName,
          spriteUrl: rf.spriteUrl,
          types: rf.types,
          isCaptured: gfe?.isCaptured ?? false,
          capturedAt: gfe?.capturedAt ?? null,
          isShiny: gfe?.isShiny ?? false,
          isHomeRegistered: hfe?.isRegistered ?? false,
        };
      }),
    };
  });

  return {
    entries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function toggleGoCheck(
  pokemonNationalDex: number,
  checkName: string,
  value: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  // No permitir activar checks que la especie no admite (p.ej. Mega en Bulbasaur)
  const eligibility = resolveCheckEligibility(pokemon);
  const checkKey = checkName === "isMegaX" || checkName === "isMegaY" ? "isMega" : checkName;
  if (value && !eligibility[checkKey]) {
    return { success: false as const };
  }

  let entry = await prisma.goEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
    include: { checks: true, stats: true },
  });

  if (!entry) {
    entry = await prisma.goEntry.create({
      data: { pokemonId: pokemon.id, userId: uid, isCaptured: true },
      include: { checks: true, stats: true },
    });
  }

  if (!entry.checks) {
    await prisma.goCheck.create({
      data: { entryId: entry.id, [checkName]: value },
    });
  } else {
    await prisma.goCheck.update({
      where: { entryId: entry.id },
      data: { [checkName]: value },
    });
  }

  return { success: true };
}

export async function toggleGoShinyOverride(
  pokemonNationalDex: number,
  shinyOverride: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  let entry = await prisma.goEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
    include: { checks: true },
  });

  if (!entry) {
    entry = await prisma.goEntry.create({
      data: { pokemonId: pokemon.id, userId: uid, isCaptured: true },
      include: { checks: true },
    });
  }

  if (shinyOverride) {
    // Activar override: isShiny = true + shinyOverride = true
    if (!entry.checks) {
      await prisma.goCheck.create({
        data: { entryId: entry.id, isShiny: true, shinyOverride: true },
      });
    } else {
      await prisma.goCheck.update({
        where: { entryId: entry.id },
        data: { isShiny: true, shinyOverride: true },
      });
    }
  } else {
    // Quitar override: solo shinyOverride = false (mantiene isShiny = true)
    if (entry.checks) {
      await prisma.goCheck.update({
        where: { entryId: entry.id },
        data: { shinyOverride: false },
      });
    }
  }

  return { success: true };
}

export async function setGoGender(
  pokemonNationalDex: number,
  value: GoGenderValue | null,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
    select: { id: true },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  const existing = await prisma.goEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
    select: { id: true },
  });

  if (existing) {
    await prisma.goEntry.update({
      where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
      data: { gender: value },
    });
  } else if (value !== null) {
    await prisma.goEntry.create({
      data: {
        pokemonId: pokemon.id,
        userId: uid,
        isCaptured: true,
        gender: value,
      },
    });
  }

  return { success: true };
}

export async function toggleCaptured(
  pokemonNationalDex: number,
  captured: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  const existing = await prisma.goEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
  });

  if (existing) {
    await prisma.goEntry.update({
      where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
      data: {
        isCaptured: captured,
        capturedAt: captured ? new Date() : null,
      },
    });
  } else if (captured) {
    await prisma.goEntry.create({
      data: {
        pokemonId: pokemon.id,
        userId: uid,
        isCaptured: true,
        capturedAt: new Date(),
      },
    });
  }

  return { success: true };
}

export async function toggleGoCostume(
  pokemonNationalDex: number,
  costumeName: string,
  registered: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  let entry = await prisma.goEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
    include: { checks: true },
  });

  if (!entry) {
    entry = await prisma.goEntry.create({
      data: { pokemonId: pokemon.id, userId: uid, isCaptured: true },
      include: { checks: true },
    });
  }

  if (registered) {
    await prisma.goCostume.upsert({
      where: { entryId_costumeName: { entryId: entry.id, costumeName } },
      update: {},
      create: { entryId: entry.id, costumeName },
    });
  } else {
    await prisma.goCostume.deleteMany({
      where: { entryId: entry.id, costumeName },
    });
  }

  const costumeCount = await prisma.goCostume.count({
    where: { entryId: entry.id },
  });

  if (!entry.checks) {
    await prisma.goCheck.create({
      data: { entryId: entry.id, hasCostume: costumeCount > 0 },
    });
  } else {
    await prisma.goCheck.update({
      where: { entryId: entry.id },
      data: { hasCostume: costumeCount > 0 },
    });
  }

  return { success: true };
}

export async function updateGoStats(
  pokemonNationalDex: number,
  stats: {
    cp?: number | null;
    level?: number | null;
    attackIv?: number | null;
    defenseIv?: number | null;
    staminaIv?: number | null;
  },
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  let entry = await prisma.goEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
    include: { checks: true, stats: true },
  });

  if (!entry) {
    entry = await prisma.goEntry.create({
      data: { pokemonId: pokemon.id, userId: uid, isCaptured: true },
      include: { checks: true, stats: true },
    });
  }

  if (!entry.stats) {
    await prisma.goStats.create({
      data: { entryId: entry.id, ...stats },
    });
  } else {
    await prisma.goStats.update({
      where: { entryId: entry.id },
      data: stats,
    });
  }

  return { success: true };
}

export interface GoStatsSummary {
  totalPokemon: number;
  totalMythical: number;
  totalMega: number;
  totalGmax: number;
  totalShadow: number;
  captured: number;
  shiny: number;
  lucky: number;
  hundo: number;
  xxl: number;
  xxs: number;
  mega: number;
  gmax: number;
  shadow: number;
  purified: number;
}

export async function getGoStats(userId?: number | null): Promise<GoStatsSummary> {
  const uid = await resolveUserId(userId);

  const [
    totals,
    captured,
    allChecks,
    capturedForms,
    shinyForms,
  ] = await Promise.all([
    getGoReferenceTotals(),
    prisma.goEntry.count({ where: { userId: uid, isCaptured: true } }),
    prisma.goCheck.findMany({
      where: { entry: { userId: uid } },
      select: {
        isShiny: true,
        isLucky: true,
        isHundo: true,
        isXXL: true,
        isXXS: true,
        isMegaX: true,
        isMegaY: true,
        isGmax: true,
        isShadow: true,
        isPurified: true,
      },
    }),
    prisma.goFormEntry.count({ where: { userId: uid, isCaptured: true } }),
    prisma.goFormEntry.count({ where: { userId: uid, isShiny: true } }),
  ]);

  let lucky = 0;
  let hundo = 0;
  let xxl = 0;
  let xxs = 0;
  let mega = 0;
  let gmax = 0;
  let shadow = 0;
  let purified = 0;
  let shiny = 0;
  for (const c of allChecks) {
    if (c.isShiny) shiny++;
    if (c.isLucky) lucky++;
    if (c.isHundo) hundo++;
    if (c.isXXL) xxl++;
    if (c.isXXS) xxs++;
    if (c.isMegaX || c.isMegaY) mega++;
    if (c.isGmax) gmax++;
    if (c.isShadow) shadow++;
    if (c.isPurified) purified++;
  }

  return {
    totalPokemon: totals.totalPokemon,
    totalMythical: totals.totalMythical,
    totalMega: totals.totalMega,
    totalGmax: totals.totalGmax,
    totalShadow: totals.totalShadow,
    captured: captured + capturedForms,
    shiny: shiny + shinyForms,
    lucky,
    hundo,
    xxl,
    xxs,
    mega,
    gmax,
    shadow,
    purified,
  };
}

export async function toggleGoFormCaptured(
  formId: number,
  captured: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);

  const existing = await prisma.goFormEntry.findUnique({
    where: { formId_userId: { formId, userId: uid } },
  });

  if (existing) {
    await prisma.goFormEntry.update({
      where: { formId_userId: { formId, userId: uid } },
      data: { isCaptured: captured, capturedAt: captured ? new Date() : null },
    });
  } else if (captured) {
    await prisma.goFormEntry.create({
      data: { formId, userId: uid, isCaptured: true, capturedAt: new Date() },
    });
  }

  return { success: true };
}

export async function toggleGoFormShiny(
  formId: number,
  isShiny: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);

  const existing = await prisma.goFormEntry.findUnique({
    where: { formId_userId: { formId, userId: uid } },
  });

  if (existing) {
    await prisma.goFormEntry.update({
      where: { formId_userId: { formId, userId: uid } },
      data: { isShiny },
    });
  } else if (isShiny) {
    await prisma.goFormEntry.create({
      data: { formId, userId: uid, isCaptured: true, capturedAt: new Date(), isShiny: true },
    });
  }

  return { success: true };
}
