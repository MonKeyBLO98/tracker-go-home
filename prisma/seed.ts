import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "dev.db");
console.log(`DB path: ${dbPath}`);
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

// Generation ranges (national dex numbers)
const GENERATIONS: { gen: number; start: number; end: number }[] = [
  { gen: 1, start: 1, end: 151 },
  { gen: 2, start: 152, end: 251 },
  { gen: 3, start: 252, end: 386 },
  { gen: 4, start: 387, end: 493 },
  { gen: 5, start: 494, end: 649 },
  { gen: 6, start: 650, end: 721 },
  { gen: 7, start: 722, end: 809 },
  { gen: 8, start: 810, end: 905 },
  { gen: 9, start: 906, end: 1025 },
];

function getGeneration(nationalDex: number): number {
  for (const g of GENERATIONS) {
    if (nationalDex >= g.start && nationalDex <= g.end) return g.gen;
  }
  return 0;
}

interface PokemonData {
  id: number;
  name: string;
  types: { slot: number; type: { name: string } }[];
  abilities: { ability: { name: string }; is_hidden: boolean }[];
  height: number;
  weight: number;
  sprites: {
    front_default: string | null;
    other?: {
      "official-artwork"?: { front_default: string | null };
    };
  };
  species: { url: string };
}

interface SpeciesData {
  is_legendary: boolean;
  is_mythical: boolean;
  gender_rate: number;
  evolution_chain: { url: string } | null;
  varieties: { pokemon: { name: string; url: string }; is_default: boolean }[];
}

function parseChainId(url: string | null): number | null {
  if (!url) return null;
  const segments = url.split("/").filter(Boolean);
  const last = parseInt(segments[segments.length - 1] ?? "", 10);
  return isNaN(last) ? null : last;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== TrackerGoHome Seed ===\n");

  // 1. Seed HomeGames
  console.log("1. Seeding HomeGames...");
  const homeGames = [
    { gameKey: "luminalia", gameName: "Pokédex de Luminalia", totalSpecies: 230, originGame: "Pokémon Legends: Z-A", generationRegion: "Kalos" },
    { gameKey: "dimensional", gameName: "Pokédex Dimensional", totalSpecies: 131, originGame: "Pokémon Legends: Z-A", generationRegion: "Kalos" },
    { gameKey: "megadex", gameName: "MegaDex", totalSpecies: 93, originGame: "Pokémon Legends: Z-A", generationRegion: "Kalos" },
    { gameKey: "paldea", gameName: "Pokédex de Paldea", totalSpecies: 400, originGame: "Pokémon Scarlet/Violet", generationRegion: "Paldea" },
    { gameKey: "noroteo", gameName: "Pokédex de Noroteo", totalSpecies: 200, originGame: "Pokémon Scarlet/Violet", generationRegion: "Paldea" },
    { gameKey: "arandano", gameName: "Pokédex Arándano", totalSpecies: 240, originGame: "Pokémon Scarlet/Violet", generationRegion: "Paldea" },
    { gameKey: "hisui", gameName: "Pokédex de Hisui", totalSpecies: 242, originGame: "Pokémon Legends: Arceus", generationRegion: "Hisui" },
    { gameKey: "sinnoh", gameName: "Pokédex de Sinnoh", totalSpecies: 150, originGame: "Pokémon BDSP", generationRegion: "Sinnoh" },
    { gameKey: "galar", gameName: "Pokédex de Galar", totalSpecies: 400, originGame: "Pokémon Sword/Shield", generationRegion: "Galar" },
    { gameKey: "armadura", gameName: "Pokédex Armadura", totalSpecies: 210, originGame: "Pokémon Sword/Shield", generationRegion: "Galar" },
    { gameKey: "corona", gameName: "Pokédex Corona", totalSpecies: 210, originGame: "Pokémon Sword/Shield", generationRegion: "Galar" },
    { gameKey: "kanto", gameName: "Pokédex de Kanto", totalSpecies: 150, originGame: "Pokémon Let's Go", generationRegion: "Kanto" },
    { gameKey: "go", gameName: "Pokedex (Pokémon GO)", totalSpecies: 1025, originGame: "Pokémon GO", generationRegion: "Multiple" },
  ];

  for (const game of homeGames) {
    await prisma.homeGame.upsert({
      where: { gameKey: game.gameKey },
      update: game,
      create: game,
    });
  }
  console.log(`  ✓ ${homeGames.length} HomeGames created\n`);

  // 2. Seed Pokédex Nacional from PokéAPI
  console.log("2. Seeding Pokédex Nacional from PokéAPI...");
  console.log("  Fetching all Pokémon list...");

  const listRes = await fetchJSON<{ count: number; results: { name: string; url: string }[] }>(
    `${POKEAPI_BASE}/pokemon?limit=1351&offset=0`
  );
  console.log(`  Found ${listRes.count} entries (including forms)\n`);

  // Filter to only default forms (IDs 1-1025)
  const defaultPokemon = listRes.results.filter((p) => {
    const id = parseInt(p.url.split("/").filter(Boolean).pop() || "0");
    return id >= 1 && id <= 1025;
  });

  console.log(`  Processing ${defaultPokemon.length} default Pokémon...\n`);

  let processed = 0;
  let errors = 0;

  for (const pkmn of defaultPokemon) {
    try {
      const id = parseInt(pkmn.url.split("/").filter(Boolean).pop() || "0");

      // Skip if already seeded
      const existing = await prisma.pokemon.findUnique({ where: { nationalDex: id }, select: { id: true } });
      if (existing) {
        processed++;
        continue;
      }

      // Fetch pokemon data
      const pokemonData = await fetchJSON<PokemonData>(`${POKEAPI_BASE}/pokemon/${id}`);

      // Fetch species data for legendary/mythical
      const speciesData = await fetchJSON<SpeciesData>(pokemonData.species.url);

      // Upsert Pokemon
      const pokemon = await prisma.pokemon.upsert({
        where: { nationalDex: id },
        update: {
          name: pokemonData.name,
          generation: getGeneration(id),
          height: pokemonData.height / 10, // decimeters to meters
          weight: pokemonData.weight / 10, // hectograms to kg
          isLegendary: speciesData.is_legendary,
          isMythical: speciesData.is_mythical,
          genderRate: speciesData.gender_rate,
          evoChainId: parseChainId(speciesData.evolution_chain?.url ?? null),
          spriteUrl: pokemonData.sprites.front_default,
          officialArtwork: pokemonData.sprites.other?.["official-artwork"]?.front_default ?? null,
        },
        create: {
          nationalDex: id,
          name: pokemonData.name,
          generation: getGeneration(id),
          height: pokemonData.height / 10,
          weight: pokemonData.weight / 10,
          isLegendary: speciesData.is_legendary,
          isMythical: speciesData.is_mythical,
          genderRate: speciesData.gender_rate,
          evoChainId: parseChainId(speciesData.evolution_chain?.url ?? null),
          spriteUrl: pokemonData.sprites.front_default,
          officialArtwork: pokemonData.sprites.other?.["official-artwork"]?.front_default ?? null,
        },
      });

      // Upsert types
      for (const t of pokemonData.types) {
        await prisma.pokemonType.upsert({
          where: { pokemonId_slot: { pokemonId: pokemon.id, slot: t.slot } },
          update: { typeName: t.type.name },
          create: { pokemonId: pokemon.id, typeName: t.type.name, slot: t.slot },
        });
      }

      // Upsert abilities
      for (const a of pokemonData.abilities) {
        await prisma.pokemonAbility.upsert({
          where: { pokemonId_abilityName: { pokemonId: pokemon.id, abilityName: a.ability.name } },
          update: { isHidden: a.is_hidden },
          create: { pokemonId: pokemon.id, abilityName: a.ability.name, isHidden: a.is_hidden },
        });
      }

      processed++;
      if (processed % 50 === 0) {
        console.log(`  Progress: ${processed}/${defaultPokemon.length} Pokémon processed`);
      }

      // Small delay to avoid rate limiting
      await sleep(50);
    } catch (err) {
      errors++;
      console.error(`  ✗ Error processing ${pkmn.name}: ${err}`);
    }
  }

  console.log(`\n  ✓ ${processed} Pokémon processed`);
  if (errors > 0) console.log(`  ✗ ${errors} errors`);

  console.log("\n=== Seed Complete ===");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
