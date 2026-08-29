import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    goEntry: {
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
    },
    homeEntry: {
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
    },
    goCheck: { deleteMany: vi.fn() },
    goStats: { deleteMany: vi.fn() },
    goCostume: { deleteMany: vi.fn() },
    homeLanguage: { deleteMany: vi.fn() },
    homeAbility: { deleteMany: vi.fn() },
    homeGameOrigin: { deleteMany: vi.fn() },
    appSetting: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    backupLog: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
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
import { getProfiles, createProfile, deleteProfile } from "../actions";

describe("settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        return await fn(mockPrisma);
      }
    );
  });

  describe("getProfiles", () => {
    it("mapea usuarios con sus contadores de capturas y registros", async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValue([
        { id: 1, profileName: "Por defecto", createdAt: new Date("2026-01-01T00:00:00Z") },
        { id: 2, profileName: "Ash", createdAt: new Date("2026-02-01T00:00:00Z") },
      ]);
      vi.mocked(mockPrisma.goEntry.groupBy).mockResolvedValue([
        { userId: 2, _count: { _all: 42 } },
      ] as never);
      vi.mocked(mockPrisma.homeEntry.groupBy).mockResolvedValue([
        { userId: 2, _count: { _all: 10 } },
      ] as never);

      const profiles = await getProfiles();

      expect(profiles).toEqual([
        expect.objectContaining({ id: 1, profileName: "Por defecto", goCaptured: 0, homeRegistered: 0 }),
        expect.objectContaining({ id: 2, profileName: "Ash", goCaptured: 42, homeRegistered: 10 }),
      ]);
      expect(mockPrisma.goEntry.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isCaptured: true } })
      );
    });
  });

  describe("createProfile", () => {
    it("crea el perfil con el nombre recortado", async () => {
      vi.mocked(mockPrisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.user.create).mockResolvedValue({
        id: 3,
        profileName: "Misty",
        createdAt: new Date("2026-03-01T00:00:00Z"),
        settings: [],
        backups: [],
        goEntries: [],
        homeEntries: [],
      });

      const profile = await createProfile("  Misty  ");

      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: { profileName: "Misty" } });
      expect(profile).toMatchObject({ id: 3, profileName: "Misty", goCaptured: 0 });
    });

    it("rechaza nombres vacíos o duplicados", async () => {
      await expect(createProfile("   ")).rejects.toThrow("no puede estar vacío");

      vi.mocked(mockPrisma.user.findFirst).mockResolvedValue({
        id: 1,
        profileName: "Ash",
        createdAt: new Date(),
        settings: [],
        backups: [],
        goEntries: [],
        homeEntries: [],
      });
      await expect(createProfile("Ash")).rejects.toThrow('Ya existe un perfil llamado "Ash"');
    });
  });

  describe("deleteProfile", () => {
    it("rechaza borrar el último perfil", async () => {
      vi.mocked(mockPrisma.user.count).mockResolvedValue(1);
      await expect(deleteProfile(1)).rejects.toThrow("Debe existir al menos un perfil");
    });

    it("borra en cascada todos los datos del perfil", async () => {
      vi.mocked(mockPrisma.user.count).mockResolvedValue(2);

      await deleteProfile(7);

      for (const model of [
        mockPrisma.goCheck,
        mockPrisma.goStats,
        mockPrisma.goCostume,
        mockPrisma.homeLanguage,
        mockPrisma.homeAbility,
        mockPrisma.homeGameOrigin,
      ]) {
        expect(model.deleteMany).toHaveBeenCalledWith({
          where: { entry: { userId: 7 } },
        });
      }
      expect(mockPrisma.goEntry.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
      expect(mockPrisma.homeEntry.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
      expect(mockPrisma.appSetting.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
      expect(mockPrisma.backupLog.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });
  });
});
