import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== Backfill genderRate ===\n");

  const pending = await prisma.pokemon.findMany({
    where: { genderRate: null },
    select: { id: true, nationalDex: true, name: true },
    orderBy: { nationalDex: "asc" },
  });

  console.log(`Pokémon sin genderRate: ${pending.length}\n`);

  let done = 0;
  let errors = 0;

  for (const pkmn of pending) {
    try {
      const species = await fetchJSON<{ gender_rate: number }>(
        `${POKEAPI_BASE}/pokemon-species/${pkmn.nationalDex}`
      );
      await prisma.pokemon.update({
        where: { id: pkmn.id },
        data: { genderRate: species.gender_rate },
      });
      done++;
      if (done % 50 === 0) {
        console.log(`  Progress: ${done}/${pending.length}`);
      }
      await sleep(40);
    } catch (err) {
      errors++;
      console.error(`  ✗ Error con ${pkmn.name} (#${pkmn.nationalDex}): ${err}`);
      await sleep(200);
    }
  }

  console.log(`\n  ✓ ${done} actualizados`);
  if (errors > 0) console.log(`  ✗ ${errors} errors (quedan en null → fallback ambos géneros)`);

  console.log("\n=== Backfill Complete ===");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
