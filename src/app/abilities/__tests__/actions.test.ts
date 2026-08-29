import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    pokemonAbility: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    ability: {
      findMany: vi.fn(),
    },
    registeredAbility: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getAbilities,
  getRegisteredAbilityNames,
  toggleRegisteredAbility,
} from "../actions";
import { formatAbilityName } from "../types";

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
  mockPrisma.ability.findMany.mockResolvedValue([]);
});

describe("getAbilities", () => {
  it("combina conteos, ocultas, registro del perfil y traducciones", async () => {
    mockPrisma.pokemonAbility.groupBy.mockResolvedValue([
      { abilityName: "lightning-rod", _count: { _all: 3 } },
      { abilityName: "static", _count: { _all: 50 } },
    ]);
    mockPrisma.pokemonAbility.findMany.mockResolvedValue([
      { abilityName: "lightning-rod" },
    ]);
    mockPrisma.registeredAbility.findMany.mockResolvedValue([
      { abilityName: "static" },
    ]);
    mockPrisma.ability.findMany.mockResolvedValue([
      { abilityName: "static", nameEs: "Electricidad Estática" },
      { abilityName: "lightning-rod", nameEs: "Pararrayos" },
    ]);

    const result = await getAbilities(7);

    expect(result).toEqual([
      {
        abilityName: "static",
        nameEs: "Electricidad Estática",
        speciesCount: 50,
        hasHidden: false,
        isRegistered: true,
      },
      {
        abilityName: "lightning-rod",
        nameEs: "Pararrayos",
        speciesCount: 3,
        hasHidden: true,
        isRegistered: false,
      },
    ]);
    expect(mockPrisma.registeredAbility.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      select: { abilityName: true },
    });
  });

  it("ordena alfabéticamente por nombre en español", async () => {
    mockPrisma.pokemonAbility.groupBy.mockResolvedValue([
      { abilityName: "drizzle", _count: { _all: 40 } },
      { abilityName: "speed-boost", _count: { _all: 12 } },
      { abilityName: "overgrow", _count: { _all: 20 } },
    ]);
    mockPrisma.pokemonAbility.findMany.mockResolvedValue([]);
    mockPrisma.registeredAbility.findMany.mockResolvedValue([]);
    mockPrisma.ability.findMany.mockResolvedValue([
      { abilityName: "drizzle", nameEs: "Llovizna" },
      { abilityName: "speed-boost", nameEs: "Impulso" },
      { abilityName: "overgrow", nameEs: "Espesura" },
    ]);

    const result = await getAbilities();

    expect(result.map((r) => r.nameEs)).toEqual(["Espesura", "Impulso", "Llovizna"]);
  });

  it("usa formato inglés como fallback sin traducción", async () => {
    mockPrisma.pokemonAbility.groupBy.mockResolvedValue([
      { abilityName: "pressure", _count: { _all: 10 } },
    ]);
    mockPrisma.pokemonAbility.findMany.mockResolvedValue([]);
    mockPrisma.registeredAbility.findMany.mockResolvedValue([]);

    const result = await getAbilities();

    expect(result[0].nameEs).toBe("Pressure");
  });

  it("devuelve lista vacía sin datos", async () => {
    mockPrisma.pokemonAbility.groupBy.mockResolvedValue([]);
    mockPrisma.pokemonAbility.findMany.mockResolvedValue([]);
    mockPrisma.registeredAbility.findMany.mockResolvedValue([]);
    mockPrisma.ability.findMany.mockResolvedValue([]);

    const result = await getAbilities();

    expect(result).toEqual([]);
  });
});

describe("getRegisteredAbilityNames", () => {
  it("devuelve los nombres registrados del perfil ordenados", async () => {
    mockPrisma.registeredAbility.findMany.mockResolvedValue([
      { abilityName: "pressure" },
      { abilityName: "static" },
    ]);

    const result = await getRegisteredAbilityNames(7);

    expect(result).toEqual(["pressure", "static"]);
    expect(mockPrisma.registeredAbility.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      select: { abilityName: true },
      orderBy: { abilityName: "asc" },
    });
  });
});

describe("toggleRegisteredAbility", () => {
  it("hace upsert al activar", async () => {
    const result = await toggleRegisteredAbility("static", true, 7);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.registeredAbility.upsert).toHaveBeenCalledWith({
      where: { userId_abilityName: { userId: 7, abilityName: "static" } },
      update: {},
      create: { userId: 7, abilityName: "static" },
    });
    expect(mockPrisma.registeredAbility.deleteMany).not.toHaveBeenCalled();
  });

  it("elimina al desactivar", async () => {
    const result = await toggleRegisteredAbility("static", false, 7);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.registeredAbility.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7, abilityName: "static" },
    });
    expect(mockPrisma.registeredAbility.upsert).not.toHaveBeenCalled();
  });

  it("resuelve el perfil por defecto si no se pasa userId", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await toggleRegisteredAbility("static", true);

    expect(mockPrisma.user.findFirst).toHaveBeenCalled();
    expect(mockPrisma.registeredAbility.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_abilityName: { userId: 7, abilityName: "static" } },
      })
    );
  });
});

describe("formatAbilityName", () => {
  it("convierte nombres kebab-case a título", () => {
    expect(formatAbilityName("lightning-rod")).toBe("Lightning Rod");
    expect(formatAbilityName("static")).toBe("Static");
    expect(formatAbilityName("drizzle")).toBe("Drizzle");
  });
});
