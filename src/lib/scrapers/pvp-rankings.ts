import type { PrismaClient } from "@/generated/prisma/client";

const LEAGUES = [
  { league: "great", cp: 1500 },
  { league: "ultra", cp: 2500 },
  { league: "master", cp: 10000 },
];

const BASE_URL =
  "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall";
const SOURCE = "pvpoke";

interface PvPokeRanking {
  speciesId: string;
  speciesName: string;
  rating: number;
  score: number;
  scores: number[];
  moveset: string[];
  moves: {
    fastMoves: string[];
    chargedMoves: string[];
  };
  editorScore?: number;
  editorNotes?: string;
  stats: {
    product: number;
    atk: number;
    def: number;
    hp: number;
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runPvpRankingsScraper(
  prisma: PrismaClient,
  log: Pick<Console, "log" | "warn" | "error"> = console
): Promise<void> {
  log.log("=== PvPoke PvP Rankings Scraper ===\n");

  for (const { league, cp } of LEAGUES) {
    try {
      await scrapeLeague(prisma, league, cp, log);
    } catch (err) {
      log.error(`  ✗ Error scraping ${league}: ${err}`);
    }
    // Be polite: 1.5s between requests
    await sleep(1500);
  }

  log.log("\n=== Scrape Complete ===");
}

async function scrapeLeague(
  prisma: PrismaClient,
  league: string,
  cp: number,
  log: Pick<Console, "log" | "warn" | "error">
): Promise<void> {
  const url = `${BASE_URL}/rankings-${cp}.json`;
  log.log(`\n  Fetching ${url}...`);

  const res = await fetch(url);
  if (!res.ok) {
    log.error(`  ✗ HTTP ${res.status} for ${url}`);
    return;
  }
  const data: PvPokeRanking[] = await res.json();
  log.log(`  Received ${data.length} rankings`);

  // Build name → pokemonId cache (SQLite doesn't support mode: "insensitive")
  const allPokemon = await prisma.pokemon.findMany({
    select: { id: true, name: true },
  });
  const nameToId = new Map<string, number>();
  for (const p of allPokemon) {
    nameToId.set(p.name.toLowerCase(), p.id);
  }
  log.log(`  Loaded ${nameToId.size} Pokemon names`);

  const records: {
    pokemonId: number;
    league: string;
    rank: number;
    speciesId: string;
    pokemonName: string;
    rating: number;
    score: number;
    scoreLeads: number | null;
    scoreClosers: number | null;
    scoreSwitches: number | null;
    scoreChargers: number | null;
    scoreAttackers: number | null;
    scoreConsistency: number | null;
    moveset: string;
    fastMove: string;
    chargedMove1: string;
    chargedMove2: string | null;
    editorScore: number | null;
    editorNotes: string | null;
    atk: number | null;
    def_: number | null;
    hp: number | null;
    product: number | null;
    source: string;
  }[] = [];

  let skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const lookupName = entry.speciesName.toLowerCase();

    const pokemonId = nameToId.get(lookupName);
    if (pokemonId) {
      records.push(buildRecord(league, i + 1, entry, pokemonId));
    } else {
      log.warn(
        `  ⚠ Pokemon not found: "${entry.speciesName}" (${entry.speciesId})`
      );
      skipped++;
    }
  }

  log.log(`  Matched ${records.length}, skipped ${skipped}`);

  // Delete existing records for this league
  const deleted = await prisma.pvpRanking.deleteMany({
    where: { league, source: SOURCE },
  });
  log.log(`  Deleted ${deleted.count} existing ${league} records`);

  // Insert
  await prisma.pvpRanking.createMany({ data: records });
  log.log(`  ✓ Created ${records.length} records for ${league}`);
}

function buildRecord(
  league: string,
  rank: number,
  entry: PvPokeRanking,
  pokemonId: number
) {
  const moveset = entry.moveset ?? [];
  const scores = entry.scores ?? [];

  return {
    pokemonId,
    league,
    rank,
    speciesId: entry.speciesId,
    pokemonName: entry.speciesName,
    rating: entry.rating,
    score: entry.score,
    scoreLeads: scores[0] ?? null,
    scoreClosers: scores[1] ?? null,
    scoreSwitches: scores[2] ?? null,
    scoreChargers: scores[3] ?? null,
    scoreAttackers: scores[4] ?? null,
    scoreConsistency: scores[5] ?? null,
    moveset: moveset.join(", "),
    fastMove: moveset[0] ?? "",
    chargedMove1: moveset[1] ?? "",
    chargedMove2: moveset[2] ?? null,
    editorScore: entry.editorScore ?? null,
    editorNotes: entry.editorNotes ?? null,
    atk: entry.stats?.atk ?? null,
    def_: entry.stats?.def ?? null,
    hp: entry.stats?.hp ?? null,
    product: entry.stats?.product ?? null,
    source: SOURCE,
  };
}
