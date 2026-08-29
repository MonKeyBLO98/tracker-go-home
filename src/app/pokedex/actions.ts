"use server";

import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/profile";
import {
  getCachedPokemonBase,
  getCachedPokemonPage,
  getCachedPokemonStats,
} from "@/lib/reference-cache";

export interface PokemonWithTypes {
  id: number;
  nationalDex: number;
  name: string;
  generation: number;
  height: number;
  weight: number;
  isLegendary: boolean;
  isMythical: boolean;
  spriteUrl: string | null;
  officialArtwork: string | null;
  types: { typeName: string; slot: number }[];
}

export interface PaginatedPokemon {
  pokemon: PokemonWithTypes[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getPokemon({
  page = 1,
  pageSize = 36,
  generation,
  type,
  search,
}: {
  page?: number;
  pageSize?: number;
  generation?: number;
  type?: string;
  search?: string;
}): Promise<PaginatedPokemon> {
  const { pokemon, total } = await getCachedPokemonPage(
    page,
    pageSize,
    generation,
    type,
    search
  );

  return {
    pokemon,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPokemonById(id: number, userId?: number | null) {
  const resolvedUserId = await resolveUserId(userId);
  const pokemon = await getCachedPokemonBase(id);

  if (!pokemon) return null;

  const goEntry = await prisma.goEntry.findUnique({
    where: {
      pokemonId_userId: { pokemonId: pokemon.id, userId: resolvedUserId },
    },
    include: {
      checks: true,
      stats: true,
      costumes: true,
    },
  });

  const homeEntry = await prisma.homeEntry.findUnique({
    where: {
      pokemonId_userId: { pokemonId: pokemon.id, userId: resolvedUserId },
    },
    include: {
      languages: true,
      abilities: true,
      gameOrigin: true,
    },
  });

  return { ...pokemon, goEntry, homeEntry };
}

export async function getPokemonStats() {
  return getCachedPokemonStats();
}
