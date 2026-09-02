import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    pokemon: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    goEntry: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    goCheck: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    goFormEntry: {
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pokemonForm: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { prisma } from "@/lib/prisma";
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue(undefined),
}));
interface MockFn {
  mockResolvedValue(value: unknown): void;
  mockResolvedValueOnce(value: unknown): this;
  mockImplementation(fn: (...args: never[]) => unknown): void;
  readonly mock: { calls: unknown[][] };
}
const mockPrisma = prisma as unknown as Record<
  string,
  Record<string, MockFn>
>;
import { setGoGender, getGoEntries, getGoStats, toggleGoCheck } from "../actions";

describe("toggleGoCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
  });

  it("rechaza activar un check que la especie no admite", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({
      id: 1,
      isMythical: false,
      hasMega: false,
      hasGmax: false,
      hasShadow: false,
    });

    const result = await toggleGoCheck(1, "isMega", true, 1);

    expect(result).toEqual({ success: false });
    expect(mockPrisma.goEntry.findUnique).not.toHaveBeenCalled();
  });

  it("permite activar un check elegible", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({
      id: 3,
      isMythical: false,
      hasMega: true,
      hasGmax: true,
      hasShadow: true,
    });
    mockPrisma.goEntry.findUnique.mockResolvedValue(null);
    mockPrisma.goEntry.create.mockResolvedValue({ id: 20 });
    mockPrisma.goCheck.create.mockResolvedValue({ id: 30 });

    const result = await toggleGoCheck(3, "isGmax", true, 1);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.goCheck.create).toHaveBeenCalledWith({
      data: { entryId: 20, isGmax: true },
    });
  });

  it("siempre permite desactivar aunque no sea elegible", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({
      id: 1,
      isMythical: false,
      hasMega: false,
      hasGmax: false,
      hasShadow: false,
    });
    mockPrisma.goEntry.findUnique.mockResolvedValue({
      id: 10,
      checks: { id: 11 },
      stats: null,
    });
    mockPrisma.goCheck.update.mockResolvedValue({ id: 11 });

    const result = await toggleGoCheck(1, "isMega", false, 1);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.goCheck.update).toHaveBeenCalledWith({
      where: { entryId: 10 },
      data: { isMega: false },
    });
  });
});

describe("setGoGender", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
  });

  it("actualiza el género de una entrada existente", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 25 });
    mockPrisma.goEntry.findUnique.mockResolvedValue({ id: 10 });
    mockPrisma.goEntry.update.mockResolvedValue({ id: 10 });

    const result = await setGoGender(25, "female", 1);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.goEntry.update).toHaveBeenCalledWith({
      where: { pokemonId_userId: { pokemonId: 25, userId: 1 } },
      data: { gender: "female" },
    });
    expect(mockPrisma.goEntry.create).not.toHaveBeenCalled();
  });

  it("crea la entrada si no existe y el valor no es null", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 81 });
    mockPrisma.goEntry.findUnique.mockResolvedValue(null);
    mockPrisma.goEntry.create.mockResolvedValue({ id: 11 });

    await setGoGender(81, "genderless", 1);

    expect(mockPrisma.goEntry.create).toHaveBeenCalledWith({
      data: {
        pokemonId: 81,
        userId: 1,
        isCaptured: true,
        gender: "genderless",
      },
    });
    expect(mockPrisma.goEntry.update).not.toHaveBeenCalled();
  });

  it("no crea entrada cuando el valor es null y no existe entrada previa", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 4 });
    mockPrisma.goEntry.findUnique.mockResolvedValue(null);

    await setGoGender(4, null, 1);

    expect(mockPrisma.goEntry.create).not.toHaveBeenCalled();
    expect(mockPrisma.goEntry.update).not.toHaveBeenCalled();
  });

  it("limpia el género con null en una entrada existente", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue({ id: 133 });
    mockPrisma.goEntry.findUnique.mockResolvedValue({ id: 12 });

    await setGoGender(133, null, 1);

    expect(mockPrisma.goEntry.update).toHaveBeenCalledWith({
      where: { pokemonId_userId: { pokemonId: 133, userId: 1 } },
      data: { gender: null },
    });
  });

  it("lanza error si el pokemon no existe", async () => {
    mockPrisma.pokemon.findUnique.mockResolvedValue(null);

    await expect(setGoGender(99999, "male", 1)).rejects.toThrow(
      "Pokemon not found"
    );
  });
});

describe("getGoEntries", () => {
  interface FindManyArg {
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }
  const findManyCalls = () =>
    mockPrisma.pokemon.findMany.mock.calls as unknown as [FindManyArg][];

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.pokemon.count.mockResolvedValue(0);
  });

  it("aplica el filtro de generación cuando no hay búsqueda", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue([]);

    await getGoEntries({ generation: 3, userId: 1 });

    const calls = findManyCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][0].where).toEqual({ generation: 3 });
  });

  it("expande la línea evolutiva al buscar por nombre e ignora la generación", async () => {
    mockPrisma.pokemon.findMany
      .mockResolvedValueOnce([{ evoChainId: 10 }])
      .mockResolvedValueOnce([]);

    await getGoEntries({ search: "pikachu", generation: 1, userId: 1 });

    const [expansionCall, mainCall] = findManyCalls();
    expect(expansionCall[0]).toEqual({
      where: { name: { contains: "pikachu" } },
      select: { evoChainId: true },
    });
    expect(mainCall[0].where?.OR).toEqual([
      { name: { contains: "pikachu" } },
      { evoChainId: { in: [10] } },
    ]);
    expect(mainCall[0].where?.generation).toBeUndefined();
  });

  it("la búsqueda numérica también expande la línea evolutiva", async () => {
    mockPrisma.pokemon.findMany
      .mockResolvedValueOnce([{ evoChainId: 10 }, { evoChainId: 10 }])
      .mockResolvedValueOnce([]);

    await getGoEntries({ search: "25", userId: 1 });

    const [expansionCall, mainCall] = findManyCalls();
    expect(expansionCall[0].where).toEqual({ nationalDex: 25 });
    expect(mainCall[0].where?.OR).toEqual([
      { nationalDex: 25 },
      { evoChainId: { in: [10] } },
    ]);
  });

  it("sin chainIds solo aplica la coincidencia directa", async () => {
    mockPrisma.pokemon.findMany
      .mockResolvedValueOnce([{ evoChainId: null }, { evoChainId: null }])
      .mockResolvedValueOnce([]);

    await getGoEntries({ search: "missingno", userId: 1 });

    const [, mainCall] = findManyCalls();
    expect(mainCall[0].where?.OR).toEqual([
      { name: { contains: "missingno" } },
    ]);
  });

  it("mapea los flags de HOME desde homeEntries", async () => {
    mockPrisma.pokemon.findMany.mockResolvedValue([
      {
        id: 25,
        nationalDex: 25,
        name: "pikachu",
        generation: 1,
        spriteUrl: null,
        officialArtwork: null,
        genderRate: 4,
        isMythical: false,
        hasMega: false,
        hasGmax: false,
        hasShadow: true,
        types: [],
        goEntries: [],
        homeEntries: [
          {
            id: 5,
            isRegistered: true,
            gameOrigin: [{ gameKey: "go" }, { gameKey: "sword" }],
          },
        ],
      },
      {
        id: 4,
        nationalDex: 4,
        name: "charmander",
        generation: 1,
        spriteUrl: null,
        officialArtwork: null,
        genderRate: 4,
        isMythical: false,
        hasMega: false,
        hasGmax: false,
        hasShadow: false,
        types: [],
        goEntries: [],
        homeEntries: [
          { id: 6, isRegistered: true, gameOrigin: [{ gameKey: "scarlet" }] },
        ],
      },
    ]);

    const result = await getGoEntries({ userId: 1 });

    expect(result.entries[0].isHomeRegistered).toBe(true);
    expect(result.entries[0].isGoHome).toBe(true);
    expect(result.entries[1].isHomeRegistered).toBe(true);
    expect(result.entries[1].isGoHome).toBe(false);
  });
});

describe("getGoStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
  });

  it("devuelve conteos y máximos de elegibilidad", async () => {
    // pokemon.count: total, míticos, mega, gmax, shadow
    mockPrisma.pokemon.count
      .mockResolvedValueOnce(1025)
      .mockResolvedValueOnce(19)
      .mockResolvedValueOnce(55)
      .mockResolvedValueOnce(32)
      .mockResolvedValueOnce(457);
    // goEntry.count: capturados
    mockPrisma.goEntry.count.mockResolvedValueOnce(100);
    // pokemonForm.findMany (formas sin shiny, p. ej. Zygarde): ninguna
    mockPrisma.pokemonForm.findMany.mockResolvedValueOnce([]);
    // goCheck.findMany: shiny=12, lucky=5, hundo=8, xxl=3, xxs=2, mega=4, gmax=6, shadow=9, purified=7
    const rows = Array.from({ length: 12 }, (_, i) => ({
      isShiny: i < 12,
      isLucky: i < 5,
      isHundo: i < 8,
      isXXL: i < 3,
      isXXS: i < 2,
      isMegaX: i < 4,
      isMegaY: false,
      isGmax: i < 6,
      isShadow: i < 9,
      isPurified: i < 7,
    }));
    mockPrisma.goCheck.findMany.mockResolvedValueOnce(rows);
    // goFormEntry.count: capturados=0, shiny=0
    mockPrisma.goFormEntry.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await getGoStats(1);

    expect(result).toEqual({
      totalPokemon: 1025,
      totalMythical: 19,
      totalMega: 55,
      totalGmax: 32,
      totalShadow: 457,
      captured: 100,
      shiny: 12,
      lucky: 5,
      hundo: 8,
      xxl: 3,
      xxs: 2,
      mega: 4,
      gmax: 6,
      shadow: 9,
      purified: 7,
    });
    // El máximo de Lucky excluye míticos en el frontend (1025 - 19)
    expect(mockPrisma.pokemon.count).toHaveBeenCalledWith({
      where: { isMythical: true },
    });
  });
});
