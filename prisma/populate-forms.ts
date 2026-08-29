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

interface SpeciesData {
  varieties: { pokemon: { name: string; url: string }; is_default: boolean }[];
}

interface PokemonData {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
  };
  abilities: { ability: { name: string }; is_hidden: boolean }[];
  types: { slot: number; type: { name: string } }[];
}

function isMegaForm(name: string): boolean {
  return name.includes("-mega") || name.includes("-mega-x") || name.includes("-mega-y");
}

function isGmaxForm(name: string): boolean {
  return name.includes("-gmax");
}

function isShadowForm(name: string): boolean {
  return name.includes("-shadow");
}

function isTotemForm(name: string): boolean {
  return name.includes("-totem");
}

function isRegionalForm(name: string): boolean {
  const regionalPatterns = [
    "-alola", "-galar", "-hisui", "-paldea",
  ];
  return regionalPatterns.some(p => name.includes(p));
}

function isCostumeForm(name: string): boolean {
  const costumePatterns = [
    "-cap", "-pikachu-", "-pichu-", "-cosplay", "-rock-star", "-belle",
    "-pop-star", "-phd", "-libre", "-original-cap", "-hoenn-cap", "-sinnoh-cap",
    "-unova-cap", "-kalos-cap", "-alola-cap", "-partner-cap", "-world-cap",
    "-starter", "-halloween", "-christmas",
  ];
  return costumePatterns.some(p => name.includes(p));
}

function formatFormLabel(name: string, baseName: string): string {
  const suffix = name.replace(baseName, "").replace(/^-/, "");
  if (!suffix) return "Normal";
  
  if (suffix === "mega") return "Mega";
  if (suffix === "mega-x") return "Mega X";
  if (suffix === "mega-y") return "Mega Y";
  if (suffix === "gmax") return "Gigantamax";
  if (suffix === "shadow") return "Shadow";
  
  return suffix.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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
  console.log("=== Populate PokemonForm from PokéAPI ===\n");

  const allPokemon = await prisma.pokemon.findMany({
    where: { nationalDex: { lte: 1025 } },
    orderBy: { nationalDex: "asc" },
    select: { id: true, nationalDex: true, name: true }
  });

  console.log(`Processing ${allPokemon.length} Pokémon...\n`);

  let totalForms = 0;
  let processed = 0;

  for (const pkmn of allPokemon) {
    try {
      const speciesUrl = `${POKEAPI_BASE}/pokemon-species/${pkmn.nationalDex}`;
      const speciesData = await fetchJSON<SpeciesData>(speciesUrl);

      const nonDefaultVarieties = speciesData.varieties.filter(v => !v.is_default);
      
      if (nonDefaultVarieties.length === 0) {
        processed++;
        continue;
      }

      for (const variety of nonDefaultVarieties) {
        const formId = parseInt(variety.pokemon.url.split("/").filter(Boolean).pop() || "0");
        
        const formData = await fetchJSON<PokemonData>(`${POKEAPI_BASE}/pokemon/${formId}`);
        
        const formName = formatFormLabel(variety.pokemon.name, pkmn.name);
        
        const isMega = isMegaForm(variety.pokemon.name);
        const isGmax = isGmaxForm(variety.pokemon.name);
        const isShadow = isShadowForm(variety.pokemon.name);
        const isCostume = isCostumeForm(variety.pokemon.name);
        const isTotem = isTotemForm(variety.pokemon.name);
        const isRegional = isRegionalForm(variety.pokemon.name);

        // Skip Totem forms
        if (isTotem) continue;
        
        // Upsert PokemonForm
        const form = await prisma.pokemonForm.upsert({
          where: { pokemonId_formName: { pokemonId: pkmn.id, formName } },
          update: {
            spriteUrl: formData.sprites.front_default,
            isMega,
            isGmax,
            isShadow,
            isCostume,
            isRegional,
          },
          create: {
            pokemonId: pkmn.id,
            formName,
            spriteUrl: formData.sprites.front_default,
            isMega,
            isGmax,
            isShadow,
            isCostume,
            isRegional,
          },
        });

        // Store form abilities
        for (const a of formData.abilities) {
          await prisma.pokemonFormAbility.upsert({
            where: { formId_abilityName: { formId: form.id, abilityName: a.ability.name } },
            update: { isHidden: a.is_hidden },
            create: { formId: form.id, abilityName: a.ability.name, isHidden: a.is_hidden },
          });
        }

        // Store form types
        for (const t of formData.types) {
          await prisma.pokemonFormType.upsert({
            where: { formId_slot: { formId: form.id, slot: t.slot } },
            update: { typeName: t.type.name },
            create: { formId: form.id, typeName: t.type.name, slot: t.slot },
          });
        }

        totalForms++;
        console.log(`  #${pkmn.nationalDex.toString().padStart(4)} ${pkmn.name} -> ${formName} (mega:${isMega} gmax:${isGmax} shadow:${isShadow} costume:${isCostume}) abilities:${formData.abilities.map(a=>a.ability.name).join(",")}`);
      }

      processed++;
      if (processed % 50 === 0) {
        console.log(`  Progress: ${processed}/${allPokemon.length} Pokémon processed, ${totalForms} forms created`);
      }

      await sleep(50);
    } catch (err) {
      console.error(`  ✗ Error processing ${pkmn.name}: ${err}`);
    }
  }

  // Special handling for Unown (201) - manually add letter forms since PokéAPI doesn't expose them as varieties
  console.log("\n=== Adding Unown letter forms ===");
  const unown = await prisma.pokemon.findUnique({ where: { nationalDex: 201 } });
  if (unown) {
    const unownLetters = [
      { suffix: "A", name: "unown-a" },
      { suffix: "B", name: "unown-b" },
      { suffix: "C", name: "unown-c" },
      { suffix: "D", name: "unown-d" },
      { suffix: "E", name: "unown-e" },
      { suffix: "F", name: "unown-f" },
      { suffix: "G", name: "unown-g" },
      { suffix: "H", name: "unown-h" },
      { suffix: "I", name: "unown-i" },
      { suffix: "J", name: "unown-j" },
      { suffix: "K", name: "unown-k" },
      { suffix: "L", name: "unown-l" },
      { suffix: "M", name: "unown-m" },
      { suffix: "N", name: "unown-n" },
      { suffix: "O", name: "unown-o" },
      { suffix: "P", name: "unown-p" },
      { suffix: "Q", name: "unown-q" },
      { suffix: "R", name: "unown-r" },
      { suffix: "S", name: "unown-s" },
      { suffix: "T", name: "unown-t" },
      { suffix: "U", name: "unown-u" },
      { suffix: "V", name: "unown-v" },
      { suffix: "W", name: "unown-w" },
      { suffix: "X", name: "unown-x" },
      { suffix: "Y", name: "unown-y" },
      { suffix: "Z", name: "unown-z" },
      { suffix: "!", name: "unown-!" },
      { suffix: "?", name: "unown-?" },
    ];

    for (const letter of unownLetters) {
      const formName = letter.suffix;
      const form = await prisma.pokemonForm.upsert({
        where: { pokemonId_formName: { pokemonId: unown.id, formName } },
        update: {
          isRegional: false,
          isCostume: false,
        },
        create: {
          pokemonId: unown.id,
          formName,
          isRegional: false,
          isCostume: false,
        },
      });

      // Add Levitate ability for all Unown forms
      await prisma.pokemonFormAbility.upsert({
        where: { formId_abilityName: { formId: form.id, abilityName: "levitate" } },
        update: { isHidden: false },
        create: { formId: form.id, abilityName: "levitate", isHidden: false },
      });

      // Add Psychic type
      await prisma.pokemonFormType.upsert({
        where: { formId_slot: { formId: form.id, slot: 1 } },
        update: { typeName: "psychic" },
        create: { formId: form.id, typeName: "psychic", slot: 1 },
      });

      totalForms++;
      console.log(`  #201 unown -> ${formName}`);
    }
  }

  // Special handling for Burmy (412) - forms based on cloak
  console.log("\n=== Adding Burmy cloak forms ===");
  const burmy = await prisma.pokemon.findUnique({ where: { nationalDex: 412 } });
  if (burmy) {
    const burmyForms = [
      { suffix: "Plant Cloak", name: "burmy-plant", types: ["bug"], abilities: ["shed-skin", "overcoat"] },
      { suffix: "Sandy Cloak", name: "burmy-sandy", types: ["bug"], abilities: ["shed-skin", "overcoat"] },
      { suffix: "Trash Cloak", name: "burmy-trash", types: ["bug"], abilities: ["shed-skin", "overcoat"] },
    ];

    for (const formData of burmyForms) {
      const formName = formData.suffix;
      const form = await prisma.pokemonForm.upsert({
        where: { pokemonId_formName: { pokemonId: burmy.id, formName } },
        update: {
          isRegional: false,
          isCostume: false,
        },
        create: {
          pokemonId: burmy.id,
          formName,
          isRegional: false,
          isCostume: false,
        },
      });

      // Add abilities for Burmy forms
      for (const abilityName of formData.abilities) {
        await prisma.pokemonFormAbility.upsert({
          where: { formId_abilityName: { formId: form.id, abilityName } },
          update: { isHidden: abilityName === "overcoat" },
          create: { formId: form.id, abilityName, isHidden: abilityName === "overcoat" },
        });
      }

      // Add Bug type
      await prisma.pokemonFormType.upsert({
        where: { formId_slot: { formId: form.id, slot: 1 } },
        update: { typeName: "bug" },
        create: { formId: form.id, typeName: "bug", slot: 1 },
      });

      totalForms++;
      console.log(`  #412 burmy -> ${formName}`);
    }
  }

  // Add missing Wormadam Plant form (413)
  console.log("\n=== Adding Wormadam Plant form ===");
  const wormadam = await prisma.pokemon.findUnique({ where: { nationalDex: 413 } });
  if (wormadam) {
    const formName = "Plant Cloak";
    const form = await prisma.pokemonForm.upsert({
      where: { pokemonId_formName: { pokemonId: wormadam.id, formName } },
      update: {
        isRegional: false,
        isCostume: false,
      },
      create: {
        pokemonId: wormadam.id,
        formName,
        isRegional: false,
        isCostume: false,
      },
    });

    // Add abilities for Wormadam Plant
    for (const abilityName of ["anticipation", "overcoat"]) {
      await prisma.pokemonFormAbility.upsert({
        where: { formId_abilityName: { formId: form.id, abilityName } },
        update: { isHidden: abilityName === "overcoat" },
        create: { formId: form.id, abilityName, isHidden: abilityName === "overcoat" },
      });
    }

    // Add types: Bug/Grass
    await prisma.pokemonFormType.upsert({
      where: { formId_slot: { formId: form.id, slot: 1 } },
      update: { typeName: "bug" },
      create: { formId: form.id, typeName: "bug", slot: 1 },
    });
    await prisma.pokemonFormType.upsert({
      where: { formId_slot: { formId: form.id, slot: 2 } },
      update: { typeName: "grass" },
      create: { formId: form.id, typeName: "grass", slot: 2 },
    });

    totalForms++;
    console.log(`  #413 wormadam -> ${formName}`);
  }

  console.log(`\n✓ ${processed} Pokémon processed, ${totalForms} forms created`);
  console.log("\nUpdating Pokemon hasMega/hasGmax/hasShadow flags...");
  const forms = await prisma.pokemonForm.findMany({
    select: { pokemonId: true, isMega: true, isGmax: true, isShadow: true, isCostume: true }
  });

  const flagsByPokemon = new Map<number, { hasMega: boolean; hasGmax: boolean; hasShadow: boolean; hasCostume: boolean }>();
  for (const f of forms) {
    const existing = flagsByPokemon.get(f.pokemonId) || { hasMega: false, hasGmax: false, hasShadow: false, hasCostume: false };
    existing.hasMega = existing.hasMega || f.isMega;
    existing.hasGmax = existing.hasGmax || f.isGmax;
    existing.hasShadow = existing.hasShadow || f.isShadow;
    existing.hasCostume = existing.hasCostume || f.isCostume;
    flagsByPokemon.set(f.pokemonId, existing);
  }

  for (const [pokemonId, flags] of flagsByPokemon) {
    await prisma.pokemon.update({
      where: { id: pokemonId },
      data: {
        hasMega: flags.hasMega,
        hasGmax: flags.hasGmax,
        hasShadow: flags.hasShadow,
      },
    });
  }
  console.log(`✓ Updated ${flagsByPokemon.size} Pokémon flags`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});