"use server";

import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/profile";
import { formatAbilityName } from "@/app/abilities/types";
import { HOME_LANGUAGES } from "./types";
import type { PaginatedHomeEntries, PokemonHomeRow, HomeGameProgress, HomeFormRow, HomeStatsSummary } from "./types";

export async function getHomeEntries({
  page = 1,
  pageSize = 50,
  search,
  registered,
  language,
  gameOrigin,
  userId,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  registered?: boolean;
  language?: string;
  gameOrigin?: string;
  userId?: number | null;
}): Promise<PaginatedHomeEntries> {
  const uid = await resolveUserId(userId);
  const where: Record<string, unknown> = {};

  if (search) {
    const num = parseInt(search);
    if (!isNaN(num)) {
      where.nationalDex = num;
    } else if (search.toLowerCase() === "shiny") {
      where.homeShinyEntries = {
        some: { userId: uid, isShiny: true },
      };
    } else if (search.toLowerCase() === "mega") {
      where.forms = {
        some: {
          isMega: true,
          homeEntries: { some: { userId: uid } },
        },
      };
    } else {
      where.name = { contains: search.toLowerCase() };
    }
  }

  const homeEntryFilters: Record<string, unknown>[] = [];

  if (registered !== undefined) {
    homeEntryFilters.push(
      registered ? { some: { userId: uid } } : { none: { userId: uid } }
    );
  }

  if (language) {
    homeEntryFilters.push({
      some: { userId: uid, languages: { some: { languageCode: language } } },
    });
  }

  if (gameOrigin) {
    homeEntryFilters.push({
      some: { userId: uid, gameOrigin: { some: { gameKey: gameOrigin } } },
    });
  }

  if (homeEntryFilters.length > 0) {
    where.AND = homeEntryFilters.map((f) => ({ homeEntries: f }));
  }

  const [pokemonList, total, abilityTranslations, registeredAbilityNames] = await Promise.all([
    prisma.pokemon.findMany({
      where,
      include: {
        types: { select: { typeName: true, slot: true } },
        abilities: { select: { abilityName: true, isHidden: true }, orderBy: { id: "asc" } },
        forms: {
          where: {
            OR: [
              { isMega: true },
              { isGmax: true },
              { isShadow: true },
              { isCostume: false },
            ],
          },
          include: {
            abilities: { select: { abilityName: true, isHidden: true } },
            types: { select: { typeName: true, slot: true } },
          },
          orderBy: [
            { isMega: "desc" },
            { isGmax: "desc" },
            { formName: "asc" },
          ],
        },
        homeEntries: {
          where: { userId: uid },
          include: {
            languages: true,
            abilities: true,
            gameOrigin: true,
          },
          take: 1,
        },
        homeShinyEntries: {
          where: { userId: uid },
          take: 1,
        },
        homeFormShinyEntries: {
          where: { userId: uid },
        },
      },
      orderBy: { nationalDex: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pokemon.count({ where }),
    prisma.ability.findMany(),
    prisma.registeredAbility.findMany({
      where: { userId: uid },
      select: { abilityName: true },
    }),
  ]);

  const nameEsMap = new Map(
    abilityTranslations.map((t) => [t.abilityName, t.nameEs])
  );
  
  const globalRegisteredAbilities = new Set(registeredAbilityNames.map(r => r.abilityName));

  const entries: PokemonHomeRow[] = await Promise.all(pokemonList.map(async (p) => {
    const homeEntry = p.homeEntries[0];
    const shinyEntry = p.homeShinyEntries[0];
    
    const forms: HomeFormRow[] = await Promise.all(p.forms.map(async (form) => {
      const formEntry = await prisma.homeFormEntry.findUnique({
        where: { formId_userId: { formId: form.id, userId: uid } },
        include: { abilities: true },
      });
      
      // Get form shiny entry
      const formShinyEntry = p.homeFormShinyEntries?.find(f => f.formId === form.id);

      // Use form-specific abilities from PokemonFormAbility
      const formAbilities = form.abilities ?? [];
      const possibleAbilities = formAbilities.map((a) => ({
        abilityName: a.abilityName,
        nameEs: nameEsMap.get(a.abilityName) ?? formatAbilityName(a.abilityName),
        isHidden: a.isHidden,
      }));

      // Get registered abilities for this form from HomeFormAbility
      const localRegisteredAbilities = formEntry?.abilities.map(a => a.abilityName) ?? [];
      
      // Merge with globally registered abilities (from /abilities page)
      const allRegisteredAbilities = [...new Set([
        ...localRegisteredAbilities,
        ...formAbilities
          .filter(a => globalRegisteredAbilities.has(a.abilityName))
          .map(a => a.abilityName)
      ])];

      // Determine shiny status:
      // - Regional forms: use their own shiny status
      // - Mega/Gmax forms: inherit from base pokemon
      const isRegional = form.isRegional;
      const isMegaOrGmax = form.isMega || form.isGmax;
      const formIsShiny = isRegional 
        ? (formShinyEntry?.isShiny ?? false)
        : (isMegaOrGmax ? (shinyEntry?.isShiny ?? false) : false);

      return {
        id: formEntry?.id ?? 0,
        formId: form.id,
        formName: form.formName,
        spriteUrl: form.spriteUrl,
        isMega: form.isMega,
        isGmax: form.isGmax,
        isShadow: form.isShadow,
        isCostume: form.isCostume,
        isRegional: form.isRegional,
        isRegistered: formEntry?.isRegistered ?? false,
        isShiny: formIsShiny,
        abilities: allRegisteredAbilities,
        possibleAbilities,
        types: form.types ?? [],
      };
    }));

    return {
      id: homeEntry?.id ?? 0,
      pokemonId: p.id,
      nationalDex: p.nationalDex,
      name: p.name,
      generation: p.generation,
      spriteUrl: p.spriteUrl,
      officialArtwork: p.officialArtwork,
      types: p.types,
      isRegistered: homeEntry?.isRegistered ?? false,
      entryId: homeEntry?.id ?? null,
      languages: homeEntry?.languages.map((l) => l.languageCode) ?? [],
      abilities: homeEntry?.abilities.map((a) => a.abilityName) ?? [],
      gameOrigins: homeEntry?.gameOrigin.map((g) => g.gameKey) ?? [],
      genderRate: p.genderRate,
      isShiny: shinyEntry?.isShiny ?? false,
      possibleAbilities: p.abilities.map((a) => ({
        abilityName: a.abilityName,
        nameEs: nameEsMap.get(a.abilityName) ?? formatAbilityName(a.abilityName),
        isHidden: a.isHidden,
      })),
      forms,
    };
  }));

  return {
    entries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function toggleHomeRegistered(
  pokemonNationalDex: number,
  registered: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  const existing = await prisma.homeEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
  });

  if (existing) {
    await prisma.homeEntry.update({
      where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
      data: { isRegistered: registered },
    });
  } else if (registered) {
    await prisma.homeEntry.create({
      data: { pokemonId: pokemon.id, userId: uid, isRegistered: true },
    });
  }

  return { success: true };
}

export async function toggleHomeFormRegistered(
  formId: number,
  registered: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const form = await prisma.pokemonForm.findUnique({
    where: { id: formId },
  });

  if (!form) throw new Error("Form not found");

  const existing = await prisma.homeFormEntry.findUnique({
    where: { formId_userId: { formId: form.id, userId: uid } },
  });

  if (existing) {
    await prisma.homeFormEntry.update({
      where: { formId_userId: { formId: form.id, userId: uid } },
      data: { isRegistered: registered },
    });
  } else if (registered) {
    await prisma.homeFormEntry.create({
      data: { formId: form.id, userId: uid, isRegistered: true },
    });
  }

  return { success: true };
}

export async function toggleHomeFormAbility(
  formId: number,
  abilityName: string,
  registered: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const form = await prisma.pokemonForm.findUnique({
    where: { id: formId },
  });

  if (!form) throw new Error("Form not found");

  // Ensure form entry exists
  let formEntry = await prisma.homeFormEntry.findUnique({
    where: { formId_userId: { formId: form.id, userId: uid } },
  });

  if (!formEntry) {
    formEntry = await prisma.homeFormEntry.create({
      data: { formId: form.id, userId: uid, isRegistered: true },
    });
  }

  if (registered) {
    await prisma.homeFormAbility.upsert({
      where: { formEntryId_abilityName: { formEntryId: formEntry.id, abilityName } },
      update: {},
      create: { formEntryId: formEntry.id, abilityName },
    });
  } else {
    await prisma.homeFormAbility.deleteMany({
      where: { formEntryId: formEntry.id, abilityName },
    });
  }

  return { success: true };
}

export async function toggleHomeShiny(
  pokemonNationalDex: number,
  isShiny: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  const existing = await prisma.homeShinyEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
  });

  if (existing) {
    await prisma.homeShinyEntry.update({
      where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
      data: { isShiny },
    });
  } else if (isShiny) {
    await prisma.homeShinyEntry.create({
      data: { pokemonId: pokemon.id, userId: uid, isShiny: true },
    });
  }

  return { success: true };
}

export async function toggleHomeFormShiny(
  formId: number,
  isShiny: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const form = await prisma.pokemonForm.findUnique({
    where: { id: formId },
  });

  if (!form) throw new Error("Form not found");

  const existing = await prisma.homeFormShinyEntry.findUnique({
    where: { formId_userId: { formId: form.id, userId: uid } },
  });

  if (existing) {
    await prisma.homeFormShinyEntry.update({
      where: { formId_userId: { formId: form.id, userId: uid } },
      data: { isShiny },
    });
  } else if (isShiny) {
    await prisma.homeFormShinyEntry.create({
      data: { formId: form.id, userId: uid, isShiny: true },
    });
  }

  return { success: true };
}

export async function toggleHomeLanguage(
  pokemonNationalDex: number,
  languageCode: string,
  value: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  let entry = await prisma.homeEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
  });

  if (!entry) {
    entry = await prisma.homeEntry.create({
      data: { pokemonId: pokemon.id, userId: uid, isRegistered: true },
    });
  }

  if (value) {
    await prisma.homeLanguage.upsert({
      where: { entryId_languageCode: { entryId: entry.id, languageCode } },
      update: {},
      create: { entryId: entry.id, languageCode },
    });
  } else {
    await prisma.homeLanguage.deleteMany({
      where: { entryId: entry.id, languageCode },
    });
  }

  return { success: true };
}

export async function toggleHomeGameOrigin(
  pokemonNationalDex: number,
  gameKey: string,
  value: boolean,
  userId?: number | null
) {
  const uid = await resolveUserId(userId);
  const pokemon = await prisma.pokemon.findUnique({
    where: { nationalDex: pokemonNationalDex },
  });

  if (!pokemon) throw new Error("Pokemon not found");

  let entry = await prisma.homeEntry.findUnique({
    where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
  });

  if (!entry) {
    entry = await prisma.homeEntry.create({
      data: { pokemonId: pokemon.id, userId: uid, isRegistered: true },
    });
  } else if (value && !entry.isRegistered) {
    entry = await prisma.homeEntry.update({
      where: { pokemonId_userId: { pokemonId: pokemon.id, userId: uid } },
      data: { isRegistered: true },
    });
  }

  if (value) {
    await prisma.homeGameOrigin.upsert({
      where: { entryId_gameKey: { entryId: entry.id, gameKey } },
      update: {},
      create: { entryId: entry.id, gameKey },
    });
  } else {
    await prisma.homeGameOrigin.deleteMany({
      where: { entryId: entry.id, gameKey },
    });
  }

  return { success: true };
}

export async function getHomeGameProgress(userId?: number | null): Promise<HomeGameProgress[]> {
  const uid = await resolveUserId(userId);
  const games = await prisma.homeGame.findMany({
    orderBy: { id: "asc" },
  });

  const progress = await Promise.all(
    games.map(async (game) => {
      const registered = await prisma.homeGameOrigin.count({
        where: { gameKey: game.gameKey, entry: { userId: uid } },
      });

      return {
        gameKey: game.gameKey,
        gameName: game.gameName,
        totalSpecies: game.totalSpecies,
        registered,
        originGame: game.originGame,
        generationRegion: game.generationRegion,
      };
    })
  );

  return progress;
}

export async function getHomeStats(userId?: number | null): Promise<HomeStatsSummary> {
  const uid = await resolveUserId(userId);
  const [
    totalPokemon,
    registered,
    languagesByEntry,
    abilitiesTotal,
    shiny,
  ] = await Promise.all([
    prisma.pokemon.count(),
    prisma.homeEntry.count({ where: { userId: uid, isRegistered: true } }),
    prisma.homeLanguage.groupBy({
      by: ["entryId"],
      where: { entry: { userId: uid } },
      _count: { entryId: true },
    }),
    prisma.ability.count(),
    prisma.homeShinyEntry.count({ where: { userId: uid, isShiny: true } }),
  ]);

  const fullLanguages = languagesByEntry.filter(
    (g) => g._count.entryId === HOME_LANGUAGES.length
  ).length;

  return {
    totalPokemon,
    registered,
    fullLanguages,
    abilitiesTotal,
    shiny,
  };
}