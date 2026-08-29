import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    goEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    goCheck: { upsert: vi.fn() },
    goStats: { upsert: vi.fn() },
    goCostume: { upsert: vi.fn() },
    homeEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    homeLanguage: { upsert: vi.fn() },
    homeAbility: { upsert: vi.fn() },
    homeGameOrigin: { upsert: vi.fn() },
    registeredAbility: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    pokemon: { findMany: vi.fn() },
    backupLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue(undefined),
}));
interface MockFn {
  mockResolvedValue(value: unknown): void;
  mockResolvedValueOnce(value: unknown): void;
  mockImplementation(fn: (...args: never[]) => unknown): void;
  readonly mock: { calls: unknown[][] };
}
const mockPrisma = prisma as unknown as Record<
  string,
  Record<string, MockFn>
> & { $transaction: MockFn };
import { exportBackup, previewBackup, importBackup } from "../actions";

describe("backup actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        return await fn(mockPrisma);
      }
    );
  });

  describe("exportBackup", () => {
    it("construye el archivo con la estructura correcta y registra el log", async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
        id: 7,
        profileName: "Ash",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        settings: [],
        backups: [],
        goEntries: [],
        homeEntries: [],
      });
      vi.mocked(mockPrisma.goEntry.findMany).mockResolvedValue([
        {
          id: 1,
          pokemonId: 25,
          userId: 7,
          isCaptured: true,
          capturedAt: new Date("2026-02-02T10:00:00Z"),
          checks: {
            id: 1,
            entryId: 1,
            isShiny: true,
            isLucky: false,
            isHundo: true,
            isXXL: false,
            isXXS: false,
            isGmax: false,
            isMega: false,
            isShadow: false,
            isPurified: false,
            hasCostume: true,
          },
          stats: {
            id: 1,
            entryId: 1,
            cp: 1500,
            level: 40,
            attackIv: 15,
            defenseIv: 14,
            staminaIv: 15,
          },
          costumes: [{ id: 1, entryId: 1, costumeName: "Pikachu Sombrero" }],
        },
      ]);
      vi.mocked(mockPrisma.homeEntry.findMany).mockResolvedValue([
        {
          id: 2,
          pokemonId: 6,
          userId: 7,
          isRegistered: true,
          languages: [{ id: 1, entryId: 2, languageCode: "SPA" }],
          abilities: [],
          gameOrigin: [{ id: 1, entryId: 2, gameKey: "scarlet" }],
        },
      ]);
      vi.mocked(mockPrisma.registeredAbility.findMany).mockResolvedValue([
        { abilityName: "static" },
        { abilityName: "lightning-rod" },
      ]);

      const { data, filename } = await exportBackup(7);

      expect(data.app).toBe("tracker-go-home");
      expect(data.version).toBe(1);
      expect(data.profileName).toBe("Ash");
      expect(data.go).toHaveLength(1);
      expect(data.go[0]).toMatchObject({
        nationalDex: 25,
        isCaptured: true,
        checks: { shiny: true, hundo: true, hasCostume: true },
        stats: { cp: 1500, attackIv: 15 },
        costumes: ["Pikachu Sombrero"],
      });
      expect(data.home[0]).toMatchObject({
        nationalDex: 6,
        isRegistered: true,
        languages: ["SPA"],
        gameOrigins: ["scarlet"],
      });
      expect(data.registeredAbilities).toEqual(["static", "lightning-rod"]);

      expect(filename).toMatch(/^tracker-go-home-ash-\d{4}-\d{2}-\d{2}\.json$/);
      expect(mockPrisma.backupLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 7, action: "create", filename }),
        })
      );
    });

    it("lanza error si el perfil no existe", async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
      await expect(exportBackup(999)).rejects.toThrow("Perfil no encontrado");
    });
  });

  describe("previewBackup", () => {
    it("devuelve el resumen de un archivo válido", async () => {
      const json = JSON.stringify({
        app: "tracker-go-home",
        version: 1,
        exportedAt: "2026-08-20T03:00:00Z",
        profileName: "Ash",
        go: [{ nationalDex: 25 }],
        home: [{ nationalDex: 6 }, { nationalDex: 9 }],
        registeredAbilities: ["static", "drizzle"],
      });
      const preview = await previewBackup(json);
      expect(preview).toMatchObject({
        version: 1,
        profileName: "Ash",
        goCount: 1,
        homeCount: 2,
        registeredAbilitiesCount: 2,
      });
    });

    it("cuenta 0 habilidades si el campo no existe (compatibilidad)", async () => {
      const json = JSON.stringify({
        app: "tracker-go-home",
        version: 1,
        exportedAt: "2026-08-20T03:00:00Z",
        profileName: "Ash",
        go: [],
        home: [],
      });
      const preview = await previewBackup(json);
      expect(preview.registeredAbilitiesCount).toBe(0);
    });

    it("rechaza archivos que no son de la app o con versión incorrecta", async () => {
      await expect(previewBackup(JSON.stringify({ app: "otro", version: 99 }))).rejects.toThrow();
      await expect(previewBackup("no es json")).rejects.toThrow();
    });
  });

  describe("importBackup", () => {
    it("fusiona sin desmarcar lo existente y omite dex desconocidos", async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
        id: 7,
        profileName: "Ash",
        createdAt: new Date(),
        settings: [],
        backups: [],
        goEntries: [],
        homeEntries: [],
      });
      vi.mocked(mockPrisma.pokemon.findMany).mockResolvedValue([
        { id: 25 },
        { id: 6 },
      ]);
      vi.mocked(mockPrisma.goEntry.findUnique).mockResolvedValue({
        id: 5,
        pokemonId: 25,
        userId: 7,
        isCaptured: true,
        capturedAt: null,
        checks: {
          id: 1,
          entryId: 5,
          isShiny: true,
          isLucky: false,
          isHundo: false,
          isXXL: false,
          isXXS: false,
          isGmax: false,
          isMega: false,
          isShadow: false,
          isPurified: false,
          hasCostume: false,
        },
        stats: null,
      });
      vi.mocked(mockPrisma.goEntry.upsert).mockResolvedValue({
        id: 5,
        pokemonId: 25,
        userId: 7,
        isCaptured: true,
        capturedAt: null,
      });
      vi.mocked(mockPrisma.homeEntry.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.homeEntry.upsert).mockResolvedValue({
        id: 8,
        pokemonId: 6,
        userId: 7,
        isRegistered: true,
      });

      const json = JSON.stringify({
        app: "tracker-go-home",
        version: 1,
        exportedAt: "2026-08-20T03:00:00Z",
        profileName: "Otro",
        go: [
          { nationalDex: 25, isCaptured: false, capturedAt: null, checks: { shiny: false, lucky: false, hundo: true, xxl: false, xxs: false, gmax: false, mega: false, shadow: false, purified: false, hasCostume: false }, stats: null, costumes: [] },
          { nationalDex: 99999, isCaptured: true, capturedAt: null, checks: null, stats: null, costumes: [] },
        ],
        home: [{ nationalDex: 6, isRegistered: true, languages: ["ENG"], abilities: [], gameOrigins: ["sword"] }],
        registeredAbilities: ["static", "drizzle"],
      });

      const result = await importBackup(7, json);

      expect(result).toEqual({ goProcessed: 2, homeProcessed: 1, skipped: 1 });
      expect(mockPrisma.registeredAbility.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.registeredAbility.upsert).toHaveBeenCalledWith({
        where: { userId_abilityName: { userId: 7, abilityName: "static" } },
        update: {},
        create: { userId: 7, abilityName: "static" },
      });

      expect(mockPrisma.goEntry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ isCaptured: true }),
        })
      );

      expect(mockPrisma.goCheck.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { isShiny: true, isLucky: false, isHundo: true, isXXL: false, isXXS: false, isGmax: false, isMega: false, isShadow: false, isPurified: false, hasCostume: false },
        })
      );

      expect(mockPrisma.backupLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 7, action: "restore" }) })
      );
    });
  });

  it("getBackupHistory mapea las filas con nombre de perfil", async () => {
    vi.mocked(mockPrisma.backupLog.findMany).mockResolvedValue([
      {
        id: 1,
        userId: 7,
        filename: "tracker-go-home-ash-2026-08-23.json",
        action: "create",
        createdAt: new Date("2026-08-23T03:00:00Z"),
        user: { profileName: "Ash" },
      },
    ]);
    const { getBackupHistory } = await import("../actions");
    const history = await getBackupHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: 1,
      action: "create",
      profileName: "Ash",
    });
  });
});
