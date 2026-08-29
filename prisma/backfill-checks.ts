import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const GAMEMASTER_URL =
  "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: "file:./dev.db" }),
});

interface GamemasterEntry {
  dex: number;
  speciesId: string;
  speciesName: string;
  tags?: string[];
  released?: boolean;
}

function parseFlags(entries: GamemasterEntry[]) {
  const megaDexes = new Set<number>();
  const shadowDexes = new Set<number>();
  const mythicalDexes = new Set<number>();

  for (const e of entries) {
    if (e.speciesId.endsWith("_mega") || e.speciesId.endsWith("_primal")) {
      megaDexes.add(e.dex);
    }
    if (e.tags?.includes("shadow")) {
      shadowDexes.add(e.dex);
    }
    if (e.tags?.includes("mythical")) {
      mythicalDexes.add(e.dex);
    }
  }

  return { megaDexes, shadowDexes, mythicalDexes };
}

interface PokeApiIndexEntry {
  name: string;
  url: string;
}

// El índice de PokéAPI lista cada forma como entrada independiente
// (p.ej. "venusaur-gmax"); mapeamos esas formas a dex de la especie base.
async function fetchGmaxDexes(
  nameToDex: Map<string, number>
): Promise<Set<number>> {
  const res = await fetch("https://pokeapi.co/api/v2/pokemon/?limit=15000");
  if (!res.ok) throw new Error(`PokeAPI index HTTP ${res.status}`);
  const data = (await res.json()) as { results: PokeApiIndexEntry[] };

  const gmaxDexes = new Set<number>();
  for (const { name } of data.results) {
    if (!name.endsWith("-gmax")) continue;
    const base = name.slice(0, -"-gmax".length);
    let dex = nameToDex.get(base);
    if (dex === undefined) {
      // Formas compuestas: "urshifu-single-strike-gmax" → "urshifu"
      dex = nameToDex.get(base.split("-")[0]);
    }
    if (dex !== undefined) gmaxDexes.add(dex);
  }
  return gmaxDexes;
}

async function main() {
  const dry = process.argv.includes("--dry");

  console.log("=== Backfill hasMega / hasGmax / hasShadow ===\n");

  const all = await prisma.pokemon.findMany({
    select: {
      nationalDex: true,
      name: true,
      isMythical: true,
      hasMega: true,
      hasGmax: true,
      hasShadow: true,
    },
    orderBy: { nationalDex: "asc" },
  });
  console.log(`Pokemon en BD: ${all.length}`);
  const nameToDex = new Map(all.map((p) => [p.name.toLowerCase(), p.nationalDex]));

  console.log(`Fetching ${GAMEMASTER_URL} ...`);
  const res = await fetch(GAMEMASTER_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { pokemon: GamemasterEntry[] };
  console.log(`Received ${data.pokemon.length} entries\n`);

  const { megaDexes, shadowDexes, mythicalDexes } = parseFlags(data.pokemon);
  console.log(`Mega/Primal dexes:   ${megaDexes.size}`);
  console.log(`Shadow dexes:        ${shadowDexes.size}`);
  console.log(`Mythical dexes:      ${mythicalDexes.size}`);

  const gmaxDexes = await fetchGmaxDexes(nameToDex);
  console.log(`Gmax dexes:          ${gmaxDexes.size}`);

  // Propagar hasShadow por cadenas evolutivas:
  // si un miembro de la cadena es shadow, todos deberían poder ser shadow
  const shadowChainPokemon = await prisma.pokemon.findMany({
    where: { nationalDex: { in: [...shadowDexes] }, evoChainId: { not: null } },
    select: { evoChainId: true },
  });
  const shadowChainIds = new Set(shadowChainPokemon.map((p) => p.evoChainId).filter(Boolean) as number[]);
  const chainMembers = await prisma.pokemon.findMany({
    where: { evoChainId: { in: [...shadowChainIds] } },
    select: { nationalDex: true },
  });
  for (const m of chainMembers) {
    shadowDexes.add(m.nationalDex);
  }
  console.log(`Shadow after evo chain propagation: ${shadowDexes.size}`);

  const sampleMega = [...megaDexes].slice(0, 10);
  const sampleShadow = [...shadowDexes].slice(0, 10);
  console.log(`Sample mega:   ${sampleMega.join(", ")}`);
  console.log(`Sample gmax:   ${[...gmaxDexes].sort((a, b) => a - b).join(", ")}`);
  console.log(`Sample shadow: ${sampleShadow.slice(0, 20).join(", ")}\n`);

  if (dry) {
    await prisma.$disconnect();
    return;
  }

  // Agrupar por combinación objetivo para minimizar updates
  const groups = new Map<
    string,
    { mega: boolean; gmax: boolean; shadow: boolean; dexes: number[] }
  >();

  let mythMismatch = 0;
  for (const p of all) {
    const mega = megaDexes.has(p.nationalDex);
    const gmax = gmaxDexes.has(p.nationalDex);
    const shadow = shadowDexes.has(p.nationalDex);
    if (mythicalDexes.has(p.nationalDex) !== p.isMythical) mythMismatch++;

    if (p.hasMega === mega && p.hasGmax === gmax && p.hasShadow === shadow) {
      continue;
    }
    const key = `${mega ? 1 : 0}${gmax ? 1 : 0}${shadow ? 1 : 0}`;
    const group = groups.get(key) ?? { mega, gmax, shadow, dexes: [] };
    group.dexes.push(p.nationalDex);
    groups.set(key, group);
  }

  let updated = 0;
  for (const [key, group] of groups) {
    const result = await prisma.pokemon.updateMany({
      where: { nationalDex: { in: group.dexes } },
      data: {
        hasMega: group.mega,
        hasGmax: group.gmax,
        hasShadow: group.shadow,
      },
    });
    updated += result.count;
    console.log(
      `Grupo [${key}] (mega=${group.mega}, gmax=${group.gmax}, shadow=${group.shadow}): ${result.count} filas (${group.dexes.length} dexes)`
    );
  }

  console.log(`\nActualizadas: ${updated} filas`);
  console.log(`Discrepancias mythical BD vs PvPoke: ${mythMismatch}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
