import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    homeGame: {
      findMany: vi.fn(),
    },
    homeGameDex: {
      findMany: vi.fn(),
    },
    homeGameOrigin: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getMiniDexGames, getMiniDex, getGameDexMap } from "../actions";
import { MINIDEX_GAME_SIGLAS, minidexIconParts } from "../types";

interface MockFn {
  mockResolvedValue(value: unknown): void;
  mockResolvedValueOnce(value: unknown): void;
  mockImplementation(fn: (...args: never[]) => unknown): void;
  readonly mock: { calls: unknown[][] };
}
const mockPrisma = prisma as unknown as Record<string, Record<string, MockFn>>;

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findFirst.mockResolvedValue({
    id: 7,
    profileName: "Test",
    createdAt: new Date(),
  });
});

describe("getMiniDexGames", () => {
  it("mapea los juegos con sus iconos", async () => {
    mockPrisma.homeGame.findMany.mockResolvedValue([
      { gameKey: "luminalia", gameName: "Luminalia", totalSpecies: 230 },
      { gameKey: "go", gameName: "GO", totalSpecies: 1025 },
    ]);

    const result = await getMiniDexGames();

    expect(result).toEqual([
      {
        gameKey: "luminalia",
        gameName: "Luminalia",
        totalSpecies: 230,
        icons: { left: "/home-icons/legends-za.png", right: null },
      },
      {
        gameKey: "go",
        gameName: "GO",
        totalSpecies: 1025,
        icons: { left: "/home-icons/go.png", right: null },
      },
    ]);
  });

  it("devuelve partes vacías para juegos desconocidos", () => {
    expect(minidexIconParts("desconocido")).toEqual({ left: "", right: null });
  });

  it("fusiona iconos en las parejas de juegos y asigna siglas", () => {
    expect(minidexIconParts("paldea")).toEqual({
      left: "/home-icons/scarlet.png",
      right: "/home-icons/violet.png",
    });
    expect(minidexIconParts("galar")).toEqual({
      left: "/home-icons/sword.png",
      right: "/home-icons/shield.png",
    });
    expect(minidexIconParts("sinnoh")).toEqual({
      left: "/home-icons/brilliant-diamond.png",
      right: "/home-icons/shining-pearl.png",
    });
    expect(minidexIconParts("kanto")).toEqual({
      left: "/home-icons/lets-go-pikachu.png",
      right: "/home-icons/lets-go-eevee.png",
    });
    expect(MINIDEX_GAME_SIGLAS.paldea).toBe("PAL");
    expect(MINIDEX_GAME_SIGLAS.go).toBe("GO");
    expect(Object.keys(MINIDEX_GAME_SIGLAS)).toHaveLength(13);
  });
});

describe("getMiniDex", () => {
  it("une el dex del juego con el registro del perfil y usa sprite de forma", async () => {
    mockPrisma.homeGameDex.findMany.mockResolvedValue([
      {
        pokemonId: 1,
        dexNumber: 6,
        formName: "",
        spriteUrl: null,
        pokemon: { id: 1, nationalDex: 6, name: "charizard", spriteUrl: "sp.png" },
      },
      {
        pokemonId: 1,
        dexNumber: 6,
        formName: "Mega X",
        spriteUrl: "mega-x.png",
        pokemon: { id: 1, nationalDex: 6, name: "charizard", spriteUrl: "sp.png" },
      },
      {
        pokemonId: 2,
        dexNumber: 25,
        formName: "",
        spriteUrl: null,
        pokemon: { id: 2, nationalDex: 25, name: "pikachu", spriteUrl: null },
      },
    ]);
    mockPrisma.homeGameOrigin.findMany.mockResolvedValue([
      { entry: { pokemonId: 1 } },
    ]);

    const result = await getMiniDex({ gameKey: "megadex", userId: 7 });

    expect(result).toEqual([
      {
        pokemonId: 1,
        nationalDex: 6,
        name: "charizard",
        dexNumber: 6,
        formName: "",
        spriteUrl: "sp.png",
        registered: true,
      },
      {
        pokemonId: 1,
        nationalDex: 6,
        name: "charizard",
        dexNumber: 6,
        formName: "Mega X",
        spriteUrl: "mega-x.png",
        registered: true,
      },
      {
        pokemonId: 2,
        nationalDex: 25,
        name: "pikachu",
        dexNumber: 25,
        formName: "",
        spriteUrl: null,
        registered: false,
      },
    ]);
    expect(mockPrisma.homeGameDex.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gameKey: "megadex" } })
    );
    expect(mockPrisma.homeGameOrigin.findMany).toHaveBeenCalledWith({
      where: { gameKey: "megadex", entry: { userId: 7 } },
      select: { entry: { select: { pokemonId: true } } },
    });
  });

  it("devuelve lista vacía sin entradas", async () => {
    mockPrisma.homeGameDex.findMany.mockResolvedValue([]);
    mockPrisma.homeGameOrigin.findMany.mockResolvedValue([]);

    const result = await getMiniDex({ gameKey: "kanto" });

    expect(result).toEqual([]);
  });
});

describe("getGameDexMap", () => {
  it("agrupa los números nacionales por juego en orden de dexNumber", async () => {
    mockPrisma.homeGameDex.findMany.mockResolvedValue([
      { gameKey: "kanto", pokemon: { nationalDex: 1 } },
      { gameKey: "kanto", pokemon: { nationalDex: 4 } },
      { gameKey: "go", pokemon: { nationalDex: 809 } },
    ]);

    const result = await getGameDexMap(7);

    expect(result).toEqual({
      kanto: [1, 4],
      go: [809],
    });
  });

  it("devuelve objeto vacío sin datos", async () => {
    mockPrisma.homeGameDex.findMany.mockResolvedValue([]);

    const result = await getGameDexMap();

    expect(result).toEqual({});
  });
});
