import type { PrismaClient } from "@/generated/prisma/client";

const LEAGUES = [
  { league: "great", cp: 1500 },
  { league: "ultra", cp: 2500 },
  { league: "master", cp: 10000 },
];

const GAMEMASTER_URL =
  "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json";
const SOURCE = "pvpoke";

// CP Multiplier table — levels 1.0 to 51.0 in 0.5 steps (101 entries)
// Index = (level - 1) * 2
// Source: https://pokemongohub.net/post/article/pokemon-go-cpm-list
export const CPM_TABLE: number[] = [
  0.094, 0.1351374318, 0.16639787, 0.192650919,                          // 1.0-2.5
  0.21573247, 0.2365726613, 0.25572005, 0.2735303812,                    // 3.0-4.5
  0.29024988, 0.3060573775, 0.3210876, 0.3354450362,                     // 5.0-6.5
  0.34921268, 0.3624577511, 0.3752356, 0.387592416,                      // 7.0-8.5
  0.39956728, 0.4111935514, 0.4225, 0.4329264091,                        // 9.0-10.5
  0.44310755, 0.4530599591, 0.4627984, 0.472336093,                      // 11.0-12.5
  0.48168495, 0.4908558003, 0.49985844, 0.508701765,                     // 13.0-14.5
  0.51739395, 0.5259425113, 0.5343543, 0.5426357375,                     // 15.0-16.5
  0.5507927, 0.5588305862, 0.5667545, 0.5745691333,                      // 17.0-18.5
  0.5822789, 0.5898879072, 0.5974, 0.6048236651,                         // 19.0-20.5
  0.6121573, 0.6194041216, 0.6265671, 0.6336491432,                      // 21.0-22.5
  0.64065295, 0.6475809666, 0.65443563, 0.6612192524,                    // 23.0-24.5
  0.667934, 0.6745818959, 0.6811649, 0.6876849038,                       // 25.0-26.5
  0.69414365, 0.70054287, 0.7068842, 0.7131691091,                       // 27.0-28.5
  0.7193991, 0.7255756136, 0.7317, 0.7347410093,                         // 29.0-30.5
  0.7377695, 0.7407855938, 0.74378943, 0.7467812109,                     // 31.0-32.5
  0.74976104, 0.7527290867, 0.7556855, 0.7586303683,                     // 33.0-34.5
  0.76156384, 0.7644860647, 0.76739717, 0.7702972656,                    // 35.0-36.5
  0.7731865, 0.7760649616, 0.77893275, 0.7817900548,                     // 37.0-38.5
  0.784637, 0.7874736075, 0.7903, 0.792803968,                           // 39.0-40.5
  0.79530001, 0.797800015, 0.8003, 0.802799995,                          // 41.0-42.5
  0.8053, 0.8078, 0.81029999, 0.812799985,                               // 43.0-44.5
  0.81529999, 0.81779999, 0.82029999, 0.82279999,                        // 45.0-46.5
  0.82529999, 0.82779999, 0.83029999, 0.83279999,                        // 47.0-48.5
  0.83529999, 0.83779999, 0.84029999, 0.84279999,                        // 49.0-50.5
  0.84529999,                                                               // 51.0
];

interface GamemasterPokemon {
  dex: number;
  speciesName: string;
  speciesId: string;
  baseStats: { atk: number; def: number; hp: number };
  defaultIVs?: Record<string, number[]>;
  tags?: string[];
  released?: boolean;
}

export function getCpm(level: number): number {
  const idx = (level - 1) * 2;
  return CPM_TABLE[idx] ?? CPM_TABLE[CPM_TABLE.length - 1];
}

export function calcCp(atk: number, def: number, hp: number): number {
  return Math.floor((atk * Math.sqrt(def) * Math.sqrt(hp)) / 10);
}

export function calcStats(
  baseAtk: number,
  baseDef: number,
  baseHp: number,
  ivAtk: number,
  ivDef: number,
  ivHp: number,
  cpm: number
) {
  const atk = (baseAtk + ivAtk) * cpm;
  const def = (baseDef + ivDef) * cpm;
  const hp = Math.floor((baseHp + ivHp) * cpm);
  return { atk, def, hp };
}

export interface IvResult {
  level: number;
  attackIv: number;
  defenseIv: number;
  staminaIv: number;
  cp: number;
  attack: number;
  defense: number;
  hp: number;
  statProduct: number;
}

export function calculateBestIvs(
  baseAtk: number,
  baseDef: number,
  baseHp: number,
  cpCap: number,
  maxResults: number = 100
): IvResult[] {
  const results: IvResult[] = [];

  // Iterate all IV combos (0-15 each)
  for (let ivAtk = 0; ivAtk <= 15; ivAtk++) {
    for (let ivDef = 0; ivDef <= 15; ivDef++) {
      for (let ivHp = 0; ivHp <= 15; ivHp++) {
        // Find the highest level that fits under CP cap
        let bestForThisIv: IvResult | null = null;

        for (let lvlIdx = CPM_TABLE.length - 1; lvlIdx >= 0; lvlIdx--) {
          const level = 1 + lvlIdx * 0.5;
          const cpm = CPM_TABLE[lvlIdx];

          const { atk, def, hp } = calcStats(
            baseAtk, baseDef, baseHp,
            ivAtk, ivDef, ivHp,
            cpm
          );

          if (hp < 1) continue;

          const cp = calcCp(atk, def, hp);
          if (cp <= cpCap) {
            const statProduct = atk * def * hp;
            bestForThisIv = {
              level,
              attackIv: ivAtk,
              defenseIv: ivDef,
              staminaIv: ivHp,
              cp,
              attack: atk,
              defense: def,
              hp,
              statProduct,
            };
            break; // Found the highest level for this IV combo
          }
        }

        if (bestForThisIv) {
          results.push(bestForThisIv);
        }
      }
    }
  }

  // Sort by stat product descending
  results.sort((a, b) => b.statProduct - a.statProduct);

  return results.slice(0, maxResults);
}

function isShadow(tags?: string[]): boolean {
  return tags?.some((t) => t === "shadow") ?? false;
}

async function yieldToEventLoop() {
  await new Promise((resolve) => setImmediate(resolve));
}

export async function runPvpIvsScraper(
  prisma: PrismaClient,
  log: Pick<Console, "log" | "warn" | "error"> = console
): Promise<void> {
  log.log("=== PvPoke PvP IV Rankings Scraper ===\n");

  // Fetch gamemaster
  log.log("Fetching gamemaster...");
  const res = await fetch(GAMEMASTER_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch gamemaster: HTTP ${res.status}`);
  }
  const gamemasterData = await res.json();
  const pokemonList: GamemasterPokemon[] = gamemasterData.pokemon;
  log.log(`Received ${pokemonList.length} Pokemon from gamemaster\n`);

  // Build name → pokemonId cache
  const allPokemon = await prisma.pokemon.findMany({
    select: { id: true, name: true },
  });
  const nameToId = new Map<string, number>();
  for (const p of allPokemon) {
    nameToId.set(p.name.toLowerCase(), p.id);
  }
  log.log(`Loaded ${nameToId.size} Pokemon names from DB\n`);

  let totalInserted = 0;

  for (const { league, cp } of LEAGUES) {
    log.log(`\n--- ${league.toUpperCase()} League (CP ≤ ${cp}) ---`);

    const records: {
      pokemonId: number;
      league: string;
      rank: number;
      speciesId: string;
      pokemonName: string;
      level: number;
      attackIv: number;
      defenseIv: number;
      staminaIv: number;
      attack: number;
      defense: number;
      hp: number;
      cp: number;
      statProduct: number;
      percentBest: number;
      source: string;
    }[] = [];

    let processed = 0;
    let skipped = 0;
    const seenPokemonIds = new Set<number>();

    for (const poke of pokemonList) {
      // Skip shadows, legendary/mythical without guaranteed floor, etc.
      if (isShadow(poke.tags)) continue;
      if (!poke.released) continue;

      const lookupName = poke.speciesName.toLowerCase();
      const pokemonId = nameToId.get(lookupName);
      if (!pokemonId) {
        skipped++;
        continue;
      }

      // Skip if we already processed this pokemonId (e.g., normal form after alternate form)
      if (seenPokemonIds.has(pokemonId)) continue;
      seenPokemonIds.add(pokemonId);

      // Yield periodically so the Node event loop stays responsive when
      // running inside the Next.js server (cron / manual trigger).
      if (processed > 0 && processed % 50 === 0) {
        await yieldToEventLoop();
      }

      // Master league: only level 50/51
      // Great/Ultra: find all under CP cap
      const { atk: baseAtk, def: baseDef, hp: baseHp } = poke.baseStats;
      const maxResults = league === "master" ? 20 : 100;
      const ivResults = calculateBestIvs(baseAtk, baseDef, baseHp, cp, maxResults);

      if (ivResults.length === 0) continue;

      const bestProduct = ivResults[0].statProduct;

      for (let i = 0; i < ivResults.length; i++) {
        const iv = ivResults[i];
        records.push({
          pokemonId,
          league,
          rank: i + 1,
          speciesId: poke.speciesId,
          pokemonName: poke.speciesName,
          level: iv.level,
          attackIv: iv.attackIv,
          defenseIv: iv.defenseIv,
          staminaIv: iv.staminaIv,
          attack: iv.attack,
          defense: iv.defense,
          hp: iv.hp,
          cp: iv.cp,
          statProduct: iv.statProduct,
          percentBest: (iv.statProduct / bestProduct) * 100,
          source: SOURCE,
        });
      }

      processed++;
      if (processed % 100 === 0) {
        log.log(`  Processed ${processed} Pokemon, ${records.length} IVs so far...`);
      }
    }

    log.log(`  Matched ${processed}, skipped ${skipped}`);

    // Delete existing records for this league
    const deleted = await prisma.pvpIvRanking.deleteMany({
      where: { league, source: SOURCE },
    });
    log.log(`  Deleted ${deleted.count} existing ${league} records`);

    // Insert in batches of 5000
    const BATCH_SIZE = 5000;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await prisma.pvpIvRanking.createMany({ data: batch });
    }

    log.log(`  ✓ Created ${records.length} IV records for ${league}`);
    totalInserted += records.length;
  }

  log.log(`\n=== Scrape Complete: ${totalInserted} total IV records ===`);
}
