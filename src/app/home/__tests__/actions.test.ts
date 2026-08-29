import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User, Pokemon, HomeEntry } from "@/generated/prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    pokemon: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    homeEntry: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    homeFormEntry: {
      findUnique: vi.fn(),
    },
    homeShinyEntry: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    homeLanguage: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    homeGameOrigin: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    ability: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    homeGame: {
      findMany: vi.fn(),
    },
    registeredAbility: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getHomeEntries,
  toggleHomeRegistered,
  toggleHomeLanguage,
  toggleHomeGameOrigin,
  getHomeGameProgress,
  getHomeStats,
} from "../actions";

interface MockFn {
  mockResolvedValue(value: unknown): void;
  mockResolvedValueOnce(value: unknown): void;
  mockImplementation(fn: (...args: never[]) => unknown): void;
  readonly mock: { calls: unknown[][] };
}
const mockPrisma = prisma as unknown as Record<
  string,
  Record<string, MockFn>
>;

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findFirst.mockResolvedValue({
    id: 7,
    profileName: "Test",
    createdAt: new Date(),
  } as User);
  mockPrisma.ability.findMany.mockResolvedValue([]);
  mockPrisma.registeredAbility.findMany.mockResolvedValue([]);
});

describe("getHomeEntries", () => {
  const mockPokemon = [
    {
      id: 1,
      nationalDex: 25,
      name: "pikachu",
      generation: 1,
      spriteUrl: "https://example.com/pikachu.png",
      officialArtwork: null,
      genderRate: 4,
      types: [{ typeName: "electric", slot: 1 }],
      abilities: [
        { abilityName: "static", isHidden: false },
        { abilityName: "lightning-rod", isHidden: true },
      ],
      forms: [],
      homeEntries: [
        {
          id: 10,
          isRegistered: true,
          languages: [{ languageCode: "ENG" }, { languageCode: "JPN" }],
          abilities: [{ abilityName: "static" }],
          gameOrigin: [{ gameKey: "scarlet" }],
        },
      ],
      homeShinyEntries: [{ isShiny: false }],
    },
    {
      id: 2,
      nationalDex: 1,
      name: "bulbasaur",
      generation: 1,
      spriteUrl: "https://example.com/bulbasaur.png",
      officialArtwork: null,
      genderRate: 1,
      types: [
        { typeName: "grass", slot: 1 },
        { typeName: "poison", slot: 2 },
      ],
      abilities: [{ abilityName: "overgrow", isHidden: false }],
      forms: [],
      homeEntries: [],
      homeShinyEntries: [],
    },
  ];

  it("returns paginated entries with default params", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue(mockPokemon);
    mockPrisma.pokemon.count.mockResolvedValue(2);

    const result = await getHomeEntries({});

    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.totalPages).toBe(1);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].name).toBe("pikachu");
    expect(result.entries[0].isRegistered).toBe(true);
    expect(result.entries[0].languages).toEqual(["ENG", "JPN"]);
    expect(result.entries[0].gameOrigins).toEqual(["scarlet"]);
    expect(result.entries[1].isRegistered).toBe(false);
    expect(result.entries[1].languages).toEqual([]);
    expect(result.entries[0].genderRate).toBe(4);
    expect(result.entries[1].genderRate).toBe(1);
  });

  it("mapea las habilidades posibles con nombre en español", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue(mockPokemon);
    mockPrisma.pokemon.count.mockResolvedValue(2);
    mockPrisma.ability.findMany.mockResolvedValue([
      { abilityName: "static", nameEs: "Electricidad Estática" },
      { abilityName: "lightning-rod", nameEs: "Pararrayos" },
      { abilityName: "overgrow", nameEs: "Espesura" },
    ]);

    const result = await getHomeEntries({});

    expect(result.entries[0].possibleAbilities).toEqual([
      { abilityName: "static", nameEs: "Electricidad Estática", isHidden: false },
      { abilityName: "lightning-rod", nameEs: "Pararrayos", isHidden: true },
    ]);
    expect(result.entries[1].possibleAbilities).toEqual([
      { abilityName: "overgrow", nameEs: "Espesura", isHidden: false },
    ]);
    expect(mockPrisma.pokemon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          abilities: { select: { abilityName: true, isHidden: true }, orderBy: { id: "asc" } },
        }),
      })
    );
  });

  it("usa formato inglés como fallback sin traducciones", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue(mockPokemon);
    mockPrisma.pokemon.count.mockResolvedValue(2);

    const result = await getHomeEntries({});

    expect(result.entries[0].possibleAbilities).toEqual([
      { abilityName: "static", nameEs: "Static", isHidden: false },
      { abilityName: "lightning-rod", nameEs: "Lightning Rod", isHidden: true },
    ]);
  });

  it("scopes entries to the resolved profile", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue([]);
    mockPrisma.pokemon.count.mockResolvedValue(0);

    await getHomeEntries({});

    const call = mockPrisma.pokemon.findMany.mock.calls[0]?.[0] as
      | { include?: { homeEntries?: unknown } }
      | undefined;
    expect(call?.include?.homeEntries).toMatchObject({ where: { userId: 7 } });
  });

  it("applies search filter by name", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue([mockPokemon[0]]);
    mockPrisma.pokemon.count.mockResolvedValue(1);

    await getHomeEntries({ search: "pika" });

    expect(mockPrisma.pokemon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "pika" },
        }),
      })
    );
  });

  it("applies search filter by national dex number", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue([mockPokemon[0]]);
    mockPrisma.pokemon.count.mockResolvedValue(1);

    await getHomeEntries({ search: "25" });

    expect(mockPrisma.pokemon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nationalDex: 25,
        }),
      })
    );
  });

  it("applies registered=true filter scoped to profile", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue([mockPokemon[0]]);
    mockPrisma.pokemon.count.mockResolvedValue(1);

    await getHomeEntries({ registered: true });

    expect(mockPrisma.pokemon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ homeEntries: { some: { userId: 7 } } }],
        }),
      })
    );
  });

  it("applies registered=false filter scoped to profile", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue([mockPokemon[1]]);
    mockPrisma.pokemon.count.mockResolvedValue(1);

    await getHomeEntries({ registered: false });

    expect(mockPrisma.pokemon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ homeEntries: { none: { userId: 7 } } }],
        }),
      })
    );
  });

  it("combines registered and language filters with AND", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue([mockPokemon[0]]);
    mockPrisma.pokemon.count.mockResolvedValue(1);

    await getHomeEntries({ registered: true, language: "ENG" });

    expect(mockPrisma.pokemon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            { homeEntries: { some: { userId: 7 } } },
            {
              homeEntries: {
                some: { userId: 7, languages: { some: { languageCode: "ENG" } } },
              },
            },
          ],
        }),
      })
    );
  });

  it("handles pagination correctly", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue([mockPokemon[0]]);
    mockPrisma.pokemon.count.mockResolvedValue(120);

    const result = await getHomeEntries({ page: 3, pageSize: 50 });

    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(3);
    expect(mockPrisma.pokemon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 100,
        take: 50,
      })
    );
  });
});

describe("toggleHomeRegistered", () => {
  it("creates a new entry when registering an unregistered pokemon", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 1, nationalDex: 25 } as Pokemon);
    mockPrisma.homeEntry.findUnique.mockResolvedValue(null);

    const result = await toggleHomeRegistered(25, true);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.homeEntry.findUnique).toHaveBeenCalledWith({
      where: { pokemonId_userId: { pokemonId: 1, userId: 7 } },
    });
    expect(mockPrisma.homeEntry.create).toHaveBeenCalledWith({
      data: { pokemonId: 1, userId: 7, isRegistered: true },
    });
  });

  it("updates existing entry", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 1, nationalDex: 25 } as Pokemon);
    mockPrisma.homeEntry.findUnique.mockResolvedValue({ id: 10, isRegistered: true } as HomeEntry);

    const result = await toggleHomeRegistered(25, false);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.homeEntry.update).toHaveBeenCalledWith({
      where: { pokemonId_userId: { pokemonId: 1, userId: 7 } },
      data: { isRegistered: false },
    });
  });

  it("throws if pokemon not found", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue(null);

    await expect(toggleHomeRegistered(99999, true)).rejects.toThrow("Pokemon not found");
  });
});

describe("toggleHomeLanguage", () => {
  it("creates entry and upserts language when enabling", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 1, nationalDex: 25 } as Pokemon);
    mockPrisma.homeEntry.findUnique.mockResolvedValue(null);
    mockPrisma.homeEntry.create.mockResolvedValue({ id: 10 } as HomeEntry);

    const result = await toggleHomeLanguage(25, "ENG", true);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.homeEntry.create).toHaveBeenCalledWith({
      data: { pokemonId: 1, userId: 7, isRegistered: true },
    });
    expect(mockPrisma.homeLanguage.upsert).toHaveBeenCalledWith({
      where: { entryId_languageCode: { entryId: 10, languageCode: "ENG" } },
      update: {},
      create: { entryId: 10, languageCode: "ENG" },
    });
  });

  it("deletes language when disabling", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 1, nationalDex: 25 } as Pokemon);
    mockPrisma.homeEntry.findUnique.mockResolvedValue({ id: 10 } as HomeEntry);

    const result = await toggleHomeLanguage(25, "ENG", false);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.homeLanguage.deleteMany).toHaveBeenCalledWith({
      where: { entryId: 10, languageCode: "ENG" },
    });
  });

  it("throws if pokemon not found", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue(null);

    await expect(toggleHomeLanguage(99999, "ENG", true)).rejects.toThrow("Pokemon not found");
  });
});

describe("toggleHomeGameOrigin", () => {
  it("creates entry and upserts game origin when enabling", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 1, nationalDex: 25 } as Pokemon);
    mockPrisma.homeEntry.findUnique.mockResolvedValue(null);
    mockPrisma.homeEntry.create.mockResolvedValue({ id: 10 } as HomeEntry);

    const result = await toggleHomeGameOrigin(25, "scarlet", true);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.homeEntry.create).toHaveBeenCalledWith({
      data: { pokemonId: 1, userId: 7, isRegistered: true },
    });
    expect(mockPrisma.homeGameOrigin.upsert).toHaveBeenCalledWith({
      where: { entryId_gameKey: { entryId: 10, gameKey: "scarlet" } },
      update: {},
      create: { entryId: 10, gameKey: "scarlet" },
    });
  });

  it("re-registers an existing unregistered entry when enabling", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 1, nationalDex: 25 } as Pokemon);
    mockPrisma.homeEntry.findUnique.mockResolvedValue({
      id: 10,
      isRegistered: false,
    } as unknown as HomeEntry);
    mockPrisma.homeEntry.update.mockResolvedValue({ id: 10, isRegistered: true } as HomeEntry);

    const result = await toggleHomeGameOrigin(25, "go", true);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.homeEntry.create).not.toHaveBeenCalled();
    expect(mockPrisma.homeEntry.update).toHaveBeenCalledWith({
      where: { pokemonId_userId: { pokemonId: 1, userId: 7 } },
      data: { isRegistered: true },
    });
    expect(mockPrisma.homeGameOrigin.upsert).toHaveBeenCalledWith({
      where: { entryId_gameKey: { entryId: 10, gameKey: "go" } },
      update: {},
      create: { entryId: 10, gameKey: "go" },
    });
  });

  it("deletes game origin when disabling", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 1, nationalDex: 25 } as Pokemon);
    mockPrisma.homeEntry.findUnique.mockResolvedValue({ id: 10 } as HomeEntry);

    const result = await toggleHomeGameOrigin(25, "scarlet", false);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.homeGameOrigin.deleteMany).toHaveBeenCalledWith({
      where: { entryId: 10, gameKey: "scarlet" },
    });
  });

  it("throws if pokemon not found", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue(null);

    await expect(toggleHomeGameOrigin(99999, "scarlet", true)).rejects.toThrow("Pokemon not found");
  });
});

describe("getHomeGameProgress", () => {
  it("returns progress for each game scoped to profile", async () => {
    mockPrisma.homeGame.findMany.mockResolvedValue([
      { id: 1, gameKey: "scarlet", gameName: "Scarlet", totalSpecies: 400, originGame: "SV", generationRegion: "Paldea" },
      { id: 2, gameKey: "violet", gameName: "Violet", totalSpecies: 400, originGame: "SV", generationRegion: "Paldea" },
    ]);
    mockPrisma.homeGameOrigin.count.mockResolvedValueOnce(150);
    mockPrisma.homeGameOrigin.count.mockResolvedValueOnce(200);

    const result = await getHomeGameProgress();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      gameKey: "scarlet",
      gameName: "Scarlet",
      totalSpecies: 400,
      registered: 150,
      originGame: "SV",
      generationRegion: "Paldea",
    });
    expect(result[1].registered).toBe(200);
    expect(mockPrisma.homeGameOrigin.count).toHaveBeenNthCalledWith(1, {
      where: { gameKey: "scarlet", entry: { userId: 7 } },
    });
  });

  it("returns empty array when no games exist", async () => {
    mockPrisma.homeGame.findMany.mockResolvedValue([]);

    const result = await getHomeGameProgress();

    expect(result).toEqual([]);
  });
});

describe("getHomeStats", () => {
  it("returns correct stats scoped to profile", async () => {
    mockPrisma.pokemon.count.mockResolvedValueOnce(1025);
    mockPrisma.homeEntry.count.mockResolvedValueOnce(500);
    mockPrisma.homeLanguage.groupBy.mockResolvedValueOnce([
      { entryId: 1, _count: { entryId: 10 } },
      { entryId: 2, _count: { entryId: 3 } },
    ]);
    mockPrisma.ability.count.mockResolvedValueOnce(284);
    mockPrisma.homeShinyEntry.count.mockResolvedValueOnce(25);

    const result = await getHomeStats();

    expect(result).toEqual({
      totalPokemon: 1025,
      registered: 500,
      fullLanguages: 1,
      abilitiesTotal: 284,
      shiny: 25,
    });
    expect(mockPrisma.homeEntry.count).toHaveBeenCalledWith({
      where: { userId: 7, isRegistered: true },
    });
  });
});
