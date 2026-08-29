"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import {
  type BackupFile,
  type BackupGoEntry,
  type BackupHomeEntry,
  type BackupLogRow,
  type BackupPreview,
  type ImportResult,
} from "./types";

function backupFilename(profileName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safe = profileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `tracker-go-home-${safe || "perfil"}-${date}.json`;
}

export async function exportBackup(userId: number): Promise<{ data: BackupFile; filename: string }> {
  await requireAuth();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Perfil no encontrado");

  const [goEntries, homeEntries, registeredAbilities, goFormEntries] = await Promise.all([
    prisma.goEntry.findMany({
      where: { userId },
      include: { checks: true, stats: true, costumes: true },
      orderBy: { pokemonId: "asc" },
    }),
    prisma.homeEntry.findMany({
      where: { userId },
      include: { languages: true, abilities: true, gameOrigin: true },
      orderBy: { pokemonId: "asc" },
    }),
    prisma.registeredAbility.findMany({
      where: { userId },
      orderBy: { abilityName: "asc" },
    }),
    prisma.goFormEntry.findMany({
      where: { userId },
      include: { form: { include: { pokemon: { select: { name: true } } } } },
      orderBy: { formId: "asc" },
    }),
  ]);

  const go: BackupGoEntry[] = goEntries.map((entry) => ({
    nationalDex: entry.pokemonId,
    isCaptured: entry.isCaptured,
    capturedAt: entry.capturedAt ? entry.capturedAt.toISOString() : null,
    gender: (entry.gender as BackupGoEntry["gender"]) ?? null,
    checks:
      entry.checks ?
        {
          shiny: entry.checks.isShiny,
          shinyOverride: entry.checks.shinyOverride,
          lucky: entry.checks.isLucky,
          hundo: entry.checks.isHundo,
          xxl: entry.checks.isXXL,
          xxs: entry.checks.isXXS,
          gmax: entry.checks.isGmax,
          megaX: entry.checks.isMegaX,
          megaY: entry.checks.isMegaY,
          shadow: entry.checks.isShadow,
          purified: entry.checks.isPurified,
          hasCostume: entry.checks.hasCostume,
        }
      : null,
    stats: entry.stats ?
        {
          cp: entry.stats.cp,
          level: entry.stats.level,
          attackIv: entry.stats.attackIv,
          defenseIv: entry.stats.defenseIv,
          staminaIv: entry.stats.staminaIv,
        }
      : null,
    costumes: entry.costumes.map((c) => c.costumeName),
  }));

  for (const gfe of goFormEntries) {
    const existing = go.find((e) => e.nationalDex === gfe.form.pokemonId);
    if (existing) {
      if (!existing.regionalForms) existing.regionalForms = [];
      existing.regionalForms.push({
        formName: gfe.form.formName,
        pokemonName: gfe.form.pokemon.name,
        isCaptured: gfe.isCaptured,
        isShiny: gfe.isShiny,
      });
    }
  }

  const home: BackupHomeEntry[] = homeEntries.map((entry) => ({
    nationalDex: entry.pokemonId,
    isRegistered: entry.isRegistered,
    languages: [...entry.languages].sort((a, b) => a.languageCode.localeCompare(b.languageCode)).map((l) => l.languageCode),
    abilities: [...entry.abilities].sort((a, b) => a.abilityName.localeCompare(b.abilityName)).map((a) => a.abilityName),
    gameOrigins: [...entry.gameOrigin].sort((a, b) => a.gameKey.localeCompare(b.gameKey)).map((g) => g.gameKey),
  }));

  const data: BackupFile = {
    app: "tracker-go-home",
    version: 1,
    exportedAt: new Date().toISOString(),
    profileName: user.profileName,
    go,
    home,
    registeredAbilities: registeredAbilities.map((r) => r.abilityName),
  };

  const filename = backupFilename(user.profileName);
  await prisma.backupLog.create({ data: { userId, filename, action: "create" } });

  return { data, filename };
}

export async function previewBackup(jsonString: string): Promise<BackupPreview> {
  const parsed = JSON.parse(jsonString) as Partial<BackupFile>;
  if (parsed.app !== "tracker-go-home" || parsed.version !== 1) {
    throw new Error("El archivo no es un backup válido de TrackerGoHome");
  }
  if (!Array.isArray(parsed.go) || !Array.isArray(parsed.home)) {
    throw new Error("El archivo no tiene el formato esperado");
  }
  return {
    version: parsed.version,
    exportedAt: parsed.exportedAt ?? null,
    profileName: parsed.profileName ?? null,
    goCount: parsed.go.length,
    homeCount: parsed.home.length,
    registeredAbilitiesCount: Array.isArray(parsed.registeredAbilities)
      ? parsed.registeredAbilities.length
      : 0,
  };
}

export async function importBackup(userId: number, jsonString: string): Promise<ImportResult> {
  await requireAuth();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Perfil no encontrado");

  const parsed = JSON.parse(jsonString) as Partial<BackupFile>;
  if (parsed.app !== "tracker-go-home" || parsed.version !== 1) {
    throw new Error("El archivo no es un backup válido de TrackerGoHome");
  }

  const goItems = Array.isArray(parsed.go) ? parsed.go : [];
  const homeItems = Array.isArray(parsed.home) ? parsed.home : [];

  const validPokemon = await prisma.pokemon.findMany({ select: { id: true } });
  const validIds = new Set(validPokemon.map((p) => p.id));

  let skipped = 0;

  const mergeGo = async (
    tx: Prisma.TransactionClient,
    item: BackupGoEntry
  ): Promise<void> => {
    if (!validIds.has(item.nationalDex)) {
      skipped++;
      return;
    }
    const current = await tx.goEntry.findUnique({
      where: { pokemonId_userId: { pokemonId: item.nationalDex, userId } },
      include: { checks: true, stats: true },
    });

    const entry = await tx.goEntry.upsert({
      where: { pokemonId_userId: { pokemonId: item.nationalDex, userId } },
      update: {
        isCaptured: current?.isCaptured || item.isCaptured,
        capturedAt: item.capturedAt ? new Date(item.capturedAt) : current?.capturedAt ?? null,
        gender: current?.gender ?? item.gender ?? null,
      },
      create: {
        pokemonId: item.nationalDex,
        userId,
        isCaptured: item.isCaptured,
        capturedAt: item.capturedAt ? new Date(item.capturedAt) : null,
        gender: item.gender ?? null,
      },
    });

    if (item.checks) {
      const existing = current?.checks;
      const merged = {
        isShiny: existing?.isShiny || item.checks.shiny,
        shinyOverride: existing?.shinyOverride || item.checks.shinyOverride,
        isLucky: existing?.isLucky || item.checks.lucky,
        isHundo: existing?.isHundo || item.checks.hundo,
        isXXL: existing?.isXXL || item.checks.xxl,
        isXXS: existing?.isXXS || item.checks.xxs,
        isGmax: existing?.isGmax || item.checks.gmax,
        isMegaX: existing?.isMegaX || item.checks.megaX,
        isMegaY: existing?.isMegaY || item.checks.megaY,
        isShadow: existing?.isShadow || item.checks.shadow,
        isPurified: existing?.isPurified || item.checks.purified,
        hasCostume: existing?.hasCostume || item.checks.hasCostume,
      };
      await tx.goCheck.upsert({
        where: { entryId: entry.id },
        update: merged,
        create: { entryId: entry.id, ...merged },
      });
    }

    if (item.stats && Object.values(item.stats).some((v) => v !== null)) {
      await tx.goStats.upsert({
        where: { entryId: entry.id },
        update: {
          cp: item.stats.cp,
          level: item.stats.level,
          attackIv: item.stats.attackIv,
          defenseIv: item.stats.defenseIv,
          staminaIv: item.stats.staminaIv,
        },
        create: {
          entryId: entry.id,
          cp: item.stats.cp,
          level: item.stats.level,
          attackIv: item.stats.attackIv,
          defenseIv: item.stats.defenseIv,
          staminaIv: item.stats.staminaIv,
        },
      });
    }

    for (const costumeName of item.costumes ?? []) {
      await tx.goCostume.upsert({
        where: { entryId_costumeName: { entryId: entry.id, costumeName } },
        update: {},
        create: { entryId: entry.id, costumeName },
      });
    }

    if (item.regionalForms) {
      for (const rf of item.regionalForms) {
        const pokemon = await tx.pokemon.findFirst({ where: { nationalDex: item.nationalDex } });
        if (!pokemon) continue;
        const form = await tx.pokemonForm.findFirst({
          where: { pokemonId: pokemon.id, formName: rf.formName },
        });
        if (!form) continue;
        const existingForm = await tx.goFormEntry.findUnique({
          where: { formId_userId: { formId: form.id, userId } },
        });
        await tx.goFormEntry.upsert({
          where: { formId_userId: { formId: form.id, userId } },
          update: {
            isCaptured: existingForm?.isCaptured || rf.isCaptured,
            isShiny: existingForm?.isShiny || rf.isShiny,
          },
          create: {
            formId: form.id,
            userId,
            isCaptured: rf.isCaptured,
            isShiny: rf.isShiny,
          },
        });
      }
    }
  };

  const mergeHome = async (
    tx: Prisma.TransactionClient,
    item: BackupHomeEntry
  ): Promise<void> => {
    if (!validIds.has(item.nationalDex)) {
      skipped++;
      return;
    }
    const current = await tx.homeEntry.findUnique({
      where: { pokemonId_userId: { pokemonId: item.nationalDex, userId } },
    });

    const entry = await tx.homeEntry.upsert({
      where: { pokemonId_userId: { pokemonId: item.nationalDex, userId } },
      update: { isRegistered: current?.isRegistered || item.isRegistered },
      create: {
        pokemonId: item.nationalDex,
        userId,
        isRegistered: item.isRegistered,
      },
    });

    for (const languageCode of item.languages ?? []) {
      await tx.homeLanguage.upsert({
        where: { entryId_languageCode: { entryId: entry.id, languageCode } },
        update: {},
        create: { entryId: entry.id, languageCode },
      });
    }
    for (const abilityName of item.abilities ?? []) {
      await tx.homeAbility.upsert({
        where: { entryId_abilityName: { entryId: entry.id, abilityName } },
        update: {},
        create: { entryId: entry.id, abilityName },
      });
    }
    for (const gameKey of item.gameOrigins ?? []) {
      await tx.homeGameOrigin.upsert({
        where: { entryId_gameKey: { entryId: entry.id, gameKey } },
        update: {},
        create: { entryId: entry.id, gameKey },
      });
    }
  };

  let goProcessed = 0;
  let homeProcessed = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of goItems) {
      await mergeGo(tx, item);
      goProcessed++;
    }
    for (const item of homeItems) {
      await mergeHome(tx, item);
      homeProcessed++;
    }
    for (const abilityName of Array.isArray(parsed.registeredAbilities)
      ? parsed.registeredAbilities
      : []
    ) {
      await tx.registeredAbility.upsert({
        where: { userId_abilityName: { userId, abilityName } },
        update: {},
        create: { userId, abilityName },
      });
    }
    await tx.backupLog.create({
      data: {
        userId,
        filename: `restauración ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
        action: "restore",
      },
    });
  });

  return { goProcessed, homeProcessed, skipped };
}

export async function getBackupHistory(): Promise<BackupLogRow[]> {
  const logs = await prisma.backupLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { profileName: true } } },
  });
  return logs.map((log) => ({
    id: log.id,
    filename: log.filename,
    action: log.action,
    createdAt: log.createdAt.toISOString(),
    profileName: log.user.profileName,
  }));
}
