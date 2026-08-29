import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    pokemon: { groupBy: vi.fn() },
    goCheck: { count: vi.fn() },
    homeGame: { findMany: vi.fn() },
    homeGameOrigin: { groupBy: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

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

import { getChartsData } from "../actions";

const genRows = [
  { generation: 1, _count: { _all: 151 } },
  { generation: 2, _count: { _all: 100 } },
];

describe("getChartsData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ id: 7 });
    mockPrisma.pokemon.groupBy
      .mockResolvedValueOnce(genRows)
      .mockResolvedValueOnce([{ generation: 1, _count: { _all: 40 } }])
      .mockResolvedValueOnce([
        { generation: 1, _count: { _all: 25 } },
        { generation: 2, _count: { _all: 10 } },
      ]);

    const counts = [7, 3, 5, 1, 0, 4, 2, 6, 8];
    for (const c of counts) {
      mockPrisma.goCheck.count.mockResolvedValueOnce(c);
    }

    mockPrisma.homeGame.findMany.mockResolvedValue([
      {
        id: 1,
        gameKey: "red",
        gameName: "Red",
        totalSpecies: 151,
        originGame: true,
        generationRegion: "Kanto",
      },
      {
        id: 2,
        gameKey: "gold",
        gameName: "Gold",
        totalSpecies: 100,
        originGame: true,
        generationRegion: "Johto",
      },
    ]);
    mockPrisma.homeGameOrigin.groupBy.mockResolvedValue([
      { gameKey: "red", _count: { _all: 90 } },
    ]);
  });

  it("fusiona el progreso GO y HOME por generación", async () => {
    const data = await getChartsData(7);

    expect(data.generations).toEqual([
      { generation: 1, total: 151, goCaptured: 40, homeRegistered: 25 },
      { generation: 2, total: 100, goCaptured: 0, homeRegistered: 10 },
    ]);
  });

  it("devuelve la distribución de checks GO en orden fijo", async () => {
    const data = await getChartsData(7);

    expect(data.goChecks.map((c) => c.label)).toEqual([
      "Shiny",
      "Lucky",
      "Hundo",
      "XXL",
      "XXS",
      "Mega",
      "Gmax",
      "Shadow",
      "Purified",
    ]);
    expect(data.goChecks.map((c) => c.value)).toEqual([7, 3, 5, 1, 0, 4, 2, 6, 8]);
  });

  it("mapea orígenes de juegos HOME dejando 0 donde no hay datos", async () => {
    const data = await getChartsData(7);

    expect(data.homeGames).toHaveLength(2);
    const red = data.homeGames.find((g) => g.gameKey === "red");
    const gold = data.homeGames.find((g) => g.gameKey === "gold");
    expect(red).toMatchObject({ registered: 90, totalSpecies: 151 });
    expect(gold).toMatchObject({ registered: 0, totalSpecies: 100 });
  });

  it("suma los totales globales para las gauges radiales", async () => {
    const data = await getChartsData(7);

    expect(data.totals).toEqual({
      totalPokemon: 251,
      goCaptured: 40,
      homeRegistered: 35,
    });
  });
});
