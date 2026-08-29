"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { resolveUserId } from "@/lib/profile";
import { formatAbilityName, type AbilityRow } from "./types";

export async function getAbilities(userId?: number | null): Promise<AbilityRow[]> {
  const uid = await resolveUserId(userId);
  const [counts, hidden, registered, translations] = await Promise.all([
    prisma.pokemonAbility.groupBy({
      by: ["abilityName"],
      _count: { _all: true },
      orderBy: { abilityName: "asc" },
    }),
    prisma.pokemonAbility.findMany({
      where: { isHidden: true },
      select: { abilityName: true },
    }),
    prisma.registeredAbility.findMany({
      where: { userId: uid },
      select: { abilityName: true },
    }),
    prisma.ability.findMany(),
  ]);

  const hiddenSet = new Set(hidden.map((h) => h.abilityName));
  const registeredSet = new Set(registered.map((r) => r.abilityName));
  const nameEsMap = new Map(translations.map((t) => [t.abilityName, t.nameEs]));

  return counts
    .map((c) => ({
      abilityName: c.abilityName,
      nameEs: nameEsMap.get(c.abilityName) ?? formatAbilityName(c.abilityName),
      speciesCount: c._count._all,
      hasHidden: hiddenSet.has(c.abilityName),
      isRegistered: registeredSet.has(c.abilityName),
    }))
    .sort((a, b) => a.nameEs.localeCompare(b.nameEs, "es"));
}

export async function getRegisteredAbilityNames(
  userId?: number | null
): Promise<string[]> {
  const uid = await resolveUserId(userId);
  const rows = await prisma.registeredAbility.findMany({
    where: { userId: uid },
    select: { abilityName: true },
    orderBy: { abilityName: "asc" },
  });
  return rows.map((r) => r.abilityName);
}

export async function toggleRegisteredAbility(
  abilityName: string,
  value: boolean,
  userId?: number | null
) {
  await requireAuth();
  const uid = await resolveUserId(userId);

  if (value) {
    await prisma.registeredAbility.upsert({
      where: { userId_abilityName: { userId: uid, abilityName } },
      update: {},
      create: { userId: uid, abilityName },
    });
  } else {
    await prisma.registeredAbility.deleteMany({
      where: { userId: uid, abilityName },
    });
  }

  return { success: true };
}
