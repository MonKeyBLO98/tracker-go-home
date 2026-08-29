import type { PrismaClient } from "@/generated/prisma/client";

const GAMEMASTER_URL =
  "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json";

export async function populateBaseStats(
  prisma: PrismaClient,
  log: Pick<Console, "log" | "warn" | "error"> = console
): Promise<void> {
  log.log("=== Populating base stats from PvPoke gamemaster ===\n");

  const res = await fetch(GAMEMASTER_URL);
  if (!res.ok) throw new Error(`Failed to fetch gamemaster: ${res.status}`);
  const data = await res.json();
  const pokemonList: {
    dex: number;
    baseStats: { atk: number; def: number; hp: number };
  }[] = data.pokemon;

  const allPokemon = await prisma.pokemon.findMany({
    select: { id: true, nationalDex: true },
  });
  const dexToId = new Map<number, number>();
  for (const p of allPokemon) {
    dexToId.set(p.nationalDex, p.id);
  }

  let count = 0;
  const batch: { id: number; baseAtk: number; baseDef: number; baseSta: number }[] = [];

  for (const gm of pokemonList) {
    if (gm.dex <= 0) continue;
    const pokemonId = dexToId.get(gm.dex);
    if (!pokemonId) continue;
    batch.push({
      id: pokemonId,
      baseAtk: gm.baseStats.atk,
      baseDef: gm.baseStats.def,
      baseSta: gm.baseStats.hp,
    });
  }

  for (const entry of batch) {
    await prisma.pokemon.update({
      where: { id: entry.id },
      data: {
        baseAtk: entry.baseAtk,
        baseDef: entry.baseDef,
        baseSta: entry.baseSta,
      },
    });
    count++;
    if (count % 100 === 0) log.log(`  ${count}/${batch.length}...`);
  }

  log.log(`\nUpdated ${count} Pokemon with base stats`);
}
