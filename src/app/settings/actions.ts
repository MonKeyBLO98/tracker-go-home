"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { SCRAPERS } from "@/lib/scrapers";
import { setSetting as persistSetting } from "@/lib/app-settings";
import { runScraper } from "@/lib/scraper-runner";
import type { ProfileRow, ScrapingFrequency, ScrapingStatus } from "./types";

const FREQUENCIES: ScrapingFrequency[] = ["24h", "1week", "manual"];

export async function setSetting(key: string, value: string) {
  await requireAuth();
  return persistSetting(key, value);
}

export async function getProfiles(): Promise<ProfileRow[]> {
  const [users, goCounts, homeCounts] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: "asc" } }),
    prisma.goEntry.groupBy({
      by: ["userId"],
      where: { isCaptured: true },
      _count: { _all: true },
    }),
    prisma.homeEntry.groupBy({
      by: ["userId"],
      where: { isRegistered: true },
      _count: { _all: true },
    }),
  ]);

  const goMap = new Map(goCounts.map((g) => [g.userId, g._count._all]));
  const homeMap = new Map(homeCounts.map((h) => [h.userId, h._count._all]));

  return users.map((u) => ({
    id: u.id,
    profileName: u.profileName,
    createdAt: u.createdAt.toISOString(),
    goCaptured: goMap.get(u.id) ?? 0,
    homeRegistered: homeMap.get(u.id) ?? 0,
  }));
}

export async function createProfile(profileName: string): Promise<ProfileRow> {
  await requireAuth();
  const name = profileName.trim();
  if (!name) throw new Error("El nombre del perfil no puede estar vacío");
  if (name.length > 50) throw new Error("El nombre es demasiado largo (máx. 50)");

  const existing = await prisma.user.findFirst({
    where: { profileName: name },
  });
  if (existing) throw new Error(`Ya existe un perfil llamado "${name}"`);

  const user = await prisma.user.create({ data: { profileName: name } });

  return {
    id: user.id,
    profileName: user.profileName,
    createdAt: user.createdAt.toISOString(),
    goCaptured: 0,
    homeRegistered: 0,
  };
}

export async function deleteProfile(userId: number) {
  await requireAuth();
  const total = await prisma.user.count();
  if (total <= 1) {
    throw new Error("Debe existir al menos un perfil");
  }

  await prisma.$transaction(async (tx) => {
    await tx.goCheck.deleteMany({ where: { entry: { userId } } });
    await tx.goStats.deleteMany({ where: { entry: { userId } } });
    await tx.goCostume.deleteMany({ where: { entry: { userId } } });
    await tx.homeLanguage.deleteMany({ where: { entry: { userId } } });
    await tx.homeAbility.deleteMany({ where: { entry: { userId } } });
    await tx.homeGameOrigin.deleteMany({ where: { entry: { userId } } });
    await tx.goEntry.deleteMany({ where: { userId } });
    await tx.homeEntry.deleteMany({ where: { userId } });
    await tx.appSetting.deleteMany({ where: { userId } });
    await tx.backupLog.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  return { success: true };
}

export async function getScrapingStatus(): Promise<ScrapingStatus> {
  const [attackersAgg, pvpAgg, pvpIvAgg, attackerCount, pvpCount, pvpIvCount, moveCount, settings] =
    await Promise.all([
      prisma.attackerRanking.aggregate({ _max: { lastUpdated: true } }),
      prisma.pvpRanking.aggregate({ _max: { lastUpdated: true } }),
      prisma.pvpIvRanking.aggregate({ _max: { lastUpdated: true } }),
      prisma.attackerRanking.count(),
      prisma.pvpRanking.count(),
      prisma.pvpIvRanking.count(),
      prisma.move.count(),
      prisma.appSetting.findMany({ where: { key: { startsWith: "scraping." } } }),
    ]);

  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
  const freqRaw = settingsMap.get("scraping.frequency");
  const frequency: ScrapingFrequency = FREQUENCIES.includes(freqRaw as ScrapingFrequency)
    ? (freqRaw as ScrapingFrequency)
    : "24h";

  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return {
    frequency,
    sources: [
      {
        key: "attackers",
        label: SCRAPERS.attackers.label,
        lastRun: settingsMap.get("scraping.lastRun.attackers") ?? null,
        lastData: iso(attackersAgg._max.lastUpdated),
        rows: attackerCount,
      },
      {
        key: "pvp",
        label: SCRAPERS.pvp.label,
        lastRun: settingsMap.get("scraping.lastRun.pvp") ?? null,
        lastData: iso(pvpAgg._max.lastUpdated),
        rows: pvpCount,
      },
      {
        key: "pvp-ivs",
        label: SCRAPERS["pvp-ivs"].label,
        lastRun: settingsMap.get("scraping.lastRun.pvp-ivs") ?? null,
        lastData: iso(pvpIvAgg._max.lastUpdated),
        rows: pvpIvCount,
      },
      {
        key: "moves",
        label: SCRAPERS.moves.label,
        lastRun: settingsMap.get("scraping.lastRun.moves") ?? null,
        lastData: null,
        rows: moveCount,
      },
    ],
  };
}

export async function runScraperNow(key: string) {
  await requireAuth();
  return runScraper(key);
}
