import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const POKEAPI_ABILITY_URL = "https://pokeapi.co/api/v2/ability";
const CONCURRENCY = 12;

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: "file:./dev.db" }),
});

interface PokeApiAbility {
  names: { name: string; language: { name: string } }[];
}

async function fetchSpanishName(abilityName: string): Promise<string | null> {
  const res = await fetch(`${POKEAPI_ABILITY_URL}/${abilityName}`);
  if (!res.ok) throw new Error(`PokeAPI ${abilityName} HTTP ${res.status}`);
  const data = (await res.json()) as PokeApiAbility;
  const es = data.names.find((n) => n.language.name === "es");
  return es?.name ?? null;
}

async function main() {
  const dryRun = process.argv.includes("--dry");

  const distinct = await prisma.pokemonAbility.groupBy({
    by: ["abilityName"],
    orderBy: { abilityName: "asc" },
  });
  const names = distinct.map((d) => d.abilityName);
  console.log(`Habilidades distintas: ${names.length}`);

  const existing = await prisma.ability.findMany();
  const existingMap = new Map(existing.map((a) => [a.abilityName, a.nameEs]));
  console.log(`Ya traducidas: ${existingMap.size}`);

  const pending = names.filter((n) => !existingMap.has(n));
  console.log(`Por traducir: ${pending.length}`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (name) => {
        try {
          return { name, es: await fetchSpanishName(name) };
        } catch (err) {
          console.error(`Error en "${name}":`, (err as Error).message);
          return { name, es: null };
        }
      })
    );

    for (const r of results) {
      if (!r.es) {
        failed++;
        continue;
      }
      if (!dryRun) {
        await prisma.ability.upsert({
          where: { abilityName: r.name },
          update: { nameEs: r.es },
          create: { abilityName: r.name, nameEs: r.es },
        });
      }
      updated++;
      console.log(`  ${r.name} → ${r.es}`);
    }
  }

  console.log(
    `Listo. Traducidas ahora: ${updated}${dryRun ? " (dry run, nada escrito)" : ""}, fallos: ${failed}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
