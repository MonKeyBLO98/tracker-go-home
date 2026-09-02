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
          isRegional: true,
          isCostume: false,
        },
        create: {
          pokemonId: unown.id,
          formName,
          isRegional: true,
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

  // Special handling for Spinda (327) - GO patterns 1 to 9 (PokéAPI doesn't expose them as varieties)
  console.log("\n=== Adding Spinda GO patterns ===");
  const spinda = await prisma.pokemon.findUnique({ where: { nationalDex: 327 } });
  if (spinda) {
    const spindaPatterns = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (const pattern of spindaPatterns) {
      const formName = `Pattern ${pattern}`;
      const spriteUrl = `https://img.pokemondb.net/sprites/go/normal/1x/spinda-${pattern.toString().padStart(2, "0")}.png`;
      const form = await prisma.pokemonForm.upsert({
        where: { pokemonId_formName: { pokemonId: spinda.id, formName } },
        update: {
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
        create: {
          pokemonId: spinda.id,
          formName,
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
      });

      // Add abilities for Spinda patterns
      for (const abilityName of ["own-tempo", "tangled-feet", "contrary"]) {
        await prisma.pokemonFormAbility.upsert({
          where: { formId_abilityName: { formId: form.id, abilityName } },
          update: { isHidden: abilityName === "contrary" },
          create: { formId: form.id, abilityName, isHidden: abilityName === "contrary" },
        });
      }

      // Add Normal type
      await prisma.pokemonFormType.upsert({
        where: { formId_slot: { formId: form.id, slot: 1 } },
        update: { typeName: "normal" },
        create: { formId: form.id, typeName: "normal", slot: 1 },
      });

      totalForms++;
      console.log(`  #327 spinda -> ${formName}`);
    }
  }

  // Special handling for Castform (351) - GO weather forms
  console.log("\n=== Adding Castform weather forms ===");
  const castform = await prisma.pokemon.findUnique({ where: { nationalDex: 351 } });
  if (castform) {
    const castformForms = [
      { suffix: "Sunny", type: "fire", sprite: "castform-sunny" },
      { suffix: "Rainy", type: "water", sprite: "castform-rainy" },
      { suffix: "Snowy", type: "ice", sprite: "castform-snowy" },
    ];

    for (const formData of castformForms) {
      const formName = formData.suffix;
      const spriteUrl = `https://img.pokemondb.net/sprites/go/normal/1x/${formData.sprite}.png`;
      const form = await prisma.pokemonForm.upsert({
        where: { pokemonId_formName: { pokemonId: castform.id, formName } },
        update: {
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
        create: {
          pokemonId: castform.id,
          formName,
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
      });

      // Add Forecast ability for Castform forms
      await prisma.pokemonFormAbility.upsert({
        where: { formId_abilityName: { formId: form.id, abilityName: "forecast" } },
        update: { isHidden: false },
        create: { formId: form.id, abilityName: "forecast", isHidden: false },
      });

      // Add the weather type
      await prisma.pokemonFormType.upsert({
        where: { formId_slot: { formId: form.id, slot: 1 } },
        update: { typeName: formData.type },
        create: { formId: form.id, typeName: formData.type, slot: 1 },
      });

      totalForms++;
      console.log(`  #351 castform -> ${formName}`);
    }
  }

  // Special handling for Deoxys (386) - GO forms (Attack, Defense, Speed; Normal is the base Pokémon)
  console.log("\n=== Adding Deoxys GO forms ===");
  const deoxys = await prisma.pokemon.findUnique({ where: { nationalDex: 386 } });
  if (deoxys) {
    const deoxysForms = [
      { suffix: "Deoxys Attack", sprite: "deoxys-attack" },
      { suffix: "Deoxys Defense", sprite: "deoxys-defense" },
      { suffix: "Deoxys Speed", sprite: "deoxys-speed" },
    ];

    for (const formData of deoxysForms) {
      const formName = formData.suffix;
      const spriteUrl = `https://img.pokemondb.net/sprites/go/normal/1x/${formData.sprite}.png`;
      const form = await prisma.pokemonForm.upsert({
        where: { pokemonId_formName: { pokemonId: deoxys.id, formName } },
        update: {
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
        create: {
          pokemonId: deoxys.id,
          formName,
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
      });

      // Add Pressure ability for Deoxys forms
      await prisma.pokemonFormAbility.upsert({
        where: { formId_abilityName: { formId: form.id, abilityName: "pressure" } },
        update: { isHidden: false },
        create: { formId: form.id, abilityName: "pressure", isHidden: false },
      });

      // Add Psychic type
      await prisma.pokemonFormType.upsert({
        where: { formId_slot: { formId: form.id, slot: 1 } },
        update: { typeName: "psychic" },
        create: { formId: form.id, typeName: "psychic", slot: 1 },
      });

      totalForms++;
      console.log(`  #386 deoxys -> ${formName}`);
    }
  }

  // Special handling for Cherrim (421) - GO Sunshine form (Overcast is the base Pokémon)
  console.log("\n=== Adding Cherrim Sunshine form ===");
  const cherrim = await prisma.pokemon.findUnique({ where: { nationalDex: 421 } });
  if (cherrim) {
    const spriteUrl = "https://img.pokemondb.net/sprites/go/normal/1x/cherrim-sunshine.png";
    const form = await prisma.pokemonForm.upsert({
      where: { pokemonId_formName: { pokemonId: cherrim.id, formName: "Sunshine" } },
      update: {
        spriteUrl,
        isRegional: true,
        isCostume: false,
      },
      create: {
        pokemonId: cherrim.id,
        formName: "Sunshine",
        spriteUrl,
        isRegional: true,
        isCostume: false,
      },
    });

    // Add Flower Gift ability for Cherrim Sunshine
    await prisma.pokemonFormAbility.upsert({
      where: { formId_abilityName: { formId: form.id, abilityName: "flower-gift" } },
      update: { isHidden: false },
      create: { formId: form.id, abilityName: "flower-gift", isHidden: false },
    });

    // Add Grass type
    await prisma.pokemonFormType.upsert({
      where: { formId_slot: { formId: form.id, slot: 1 } },
      update: { typeName: "grass" },
      create: { formId: form.id, typeName: "grass", slot: 1 },
    });

    totalForms++;
    console.log(`  #421 cherrim -> Sunshine`);
  }

  // Special handling for Burmy (412) - GO cloak forms
  console.log("\n=== Adding Burmy cloak forms ===");
  const burmy = await prisma.pokemon.findUnique({ where: { nationalDex: 412 } });
  if (burmy) {
    const burmyForms = [
      { formName: "Plant Cloak", sprite: "burmy-plant", types: ["bug"], abilities: ["shed-skin", "overcoat"] },
      { formName: "Sandy Cloak", sprite: "burmy-sandy", types: ["bug"], abilities: ["shed-skin", "overcoat"] },
      { formName: "Trash Cloak", sprite: "burmy-trash", types: ["bug"], abilities: ["shed-skin", "overcoat"] },
    ];

    for (const formData of burmyForms) {
      const formName = formData.formName;
      const spriteUrl = `https://img.pokemondb.net/sprites/go/normal/1x/${formData.sprite}.png`;
      const form = await prisma.pokemonForm.upsert({
        where: { pokemonId_formName: { pokemonId: burmy.id, formName } },
        update: {
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
        create: {
          pokemonId: burmy.id,
          formName,
          spriteUrl,
          isRegional: true,
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

  // Special handling for Wormadam (413) - GO cloak forms (Plant = base Pokémon)
  console.log("\n=== Adding Wormadam cloak forms ===");
  const wormadam = await prisma.pokemon.findUnique({ where: { nationalDex: 413 } });
  if (wormadam) {
    // Rename old PokeAPI-named forms to cloak names (preserves formId + goFormEntry rows)
    const renames = [
      { oldName: "Wormadam Sandy", newName: "Sandy Cloak" },
      { oldName: "Wormadam Trash", newName: "Trash Cloak" },
    ];
    for (const r of renames) {
      const existing = await prisma.pokemonForm.findUnique({
        where: { pokemonId_formName: { pokemonId: wormadam.id, formName: r.oldName } },
      });
      if (existing) {
        const targetExists = await prisma.pokemonForm.findUnique({
          where: { pokemonId_formName: { pokemonId: wormadam.id, formName: r.newName } },
        });
        if (!targetExists) {
          await prisma.pokemonForm.update({
            where: { id: existing.id },
            data: { formName: r.newName },
          });
        }
      }
    }

    const wormadamForms = [
      { formName: "Plant Cloak", sprite: "wormadam-plant", types: ["bug", "grass"], abilities: ["anticipation", "overcoat"] },
      { formName: "Sandy Cloak", sprite: "wormadam-sandy", types: ["bug", "ground"], abilities: ["anticipation", "overcoat"] },
      { formName: "Trash Cloak", sprite: "wormadam-trash", types: ["bug", "steel"], abilities: ["anticipation", "overcoat"] },
    ];

    for (const formData of wormadamForms) {
      const formName = formData.formName;
      const spriteUrl = `https://img.pokemondb.net/sprites/go/normal/1x/${formData.sprite}.png`;
      const form = await prisma.pokemonForm.upsert({
        where: { pokemonId_formName: { pokemonId: wormadam.id, formName } },
        update: {
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
        create: {
          pokemonId: wormadam.id,
          formName,
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
      });

      // Add abilities for Wormadam forms
      for (const abilityName of formData.abilities) {
        await prisma.pokemonFormAbility.upsert({
          where: { formId_abilityName: { formId: form.id, abilityName } },
          update: { isHidden: abilityName === "overcoat" },
          create: { formId: form.id, abilityName, isHidden: abilityName === "overcoat" },
        });
      }

      // Add types (slots 1/2)
      for (let i = 0; i < formData.types.length; i++) {
        await prisma.pokemonFormType.upsert({
          where: { formId_slot: { formId: form.id, slot: i + 1 } },
          update: { typeName: formData.types[i] },
          create: { formId: form.id, typeName: formData.types[i], slot: i + 1 },
        });
      }

      totalForms++;
      console.log(`  #413 wormadam -> ${formName}`);
    }
  }

  // Special handling for Zygarde (718) - GO forms (10%, 50%, Complete).
  // PokéAPI expone varias variedades con sprites nulos; se registran manualmente
  // como isRegional para que se muestren en la página /go.
  console.log("\n=== Adding Zygarde forms ===");
  const zygarde = await prisma.pokemon.findUnique({ where: { nationalDex: 718 } });
  if (zygarde) {
    const zygardeForms = [
      { formName: "10%", sprite: "10181" },
      { formName: "50%", sprite: "718" },
      { formName: "Complete", sprite: "10120" },
    ];

    for (const formData of zygardeForms) {
      const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${formData.sprite}.png`;
      const form = await prisma.pokemonForm.upsert({
        where: { pokemonId_formName: { pokemonId: zygarde.id, formName: formData.formName } },
        update: {
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
        create: {
          pokemonId: zygarde.id,
          formName: formData.formName,
          spriteUrl,
          isRegional: true,
          isCostume: false,
        },
      });

      // Aura Veil ability for Zygarde forms
      await prisma.pokemonFormAbility.upsert({
        where: { formId_abilityName: { formId: form.id, abilityName: "aura-veil" } },
        update: { isHidden: true },
        create: { formId: form.id, abilityName: "aura-veil", isHidden: true },
      });

      // Dragon + Ground types
      await prisma.pokemonFormType.upsert({
        where: { formId_slot: { formId: form.id, slot: 1 } },
        update: { typeName: "dragon" },
        create: { formId: form.id, typeName: "dragon", slot: 1 },
      });
      await prisma.pokemonFormType.upsert({
        where: { formId_slot: { formId: form.id, slot: 2 } },
        update: { typeName: "ground" },
        create: { formId: form.id, typeName: "ground", slot: 2 },
      });

      totalForms++;
      console.log(`  #718 zygarde -> ${formData.formName}`);
    }
  }

  // Special handling for Hoopa (720) - GO "Unbound" form.
  // PokéAPI la registra como variedad con sprite propio; se marca isRegional
  // para que se muestre como forma en la página /go.
  console.log("\n=== Ensuring Hoopa Unbound form ===");
  const hoopa = await prisma.pokemon.findUnique({ where: { nationalDex: 720 } });
  if (hoopa) {
    const unbound = await prisma.pokemonForm.upsert({
      where: { pokemonId_formName: { pokemonId: hoopa.id, formName: "Unbound" } },
      update: {
        spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10086.png",
        isRegional: true,
        isCostume: false,
      },
      create: {
        pokemonId: hoopa.id,
        formName: "Unbound",
        spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10086.png",
        isRegional: true,
        isCostume: false,
      },
    });
    totalForms++;
    console.log(`  #720 hoopa -> ${unbound.formName} (isRegional)`);
  }

  // Special handling for Oricorio (741) - GO forms (Pom Pom, Pau, Sensu).
  // Se renombran a nombres simples y se marcan isRegional para /go.
  console.log("\n=== Ensuring Oricorio forms ===");
  const oricorio = await prisma.pokemon.findUnique({ where: { nationalDex: 741 } });
  if (oricorio) {
    const oricorioRenames = [
      { old: "Oricorio Pom Pom", new: "Pom Pom" },
      { old: "Oricorio Pau", new: "Pau" },
      { old: "Oricorio Sensu", new: "Sensu" },
    ];
    for (const r of oricorioRenames) {
      const existing = await prisma.pokemonForm.findUnique({
        where: { pokemonId_formName: { pokemonId: oricorio.id, formName: r.old } },
      });
      if (!existing) continue;
      const targetExists = await prisma.pokemonForm.findUnique({
        where: { pokemonId_formName: { pokemonId: oricorio.id, formName: r.new } },
      });
      if (targetExists) {
        await prisma.pokemonForm.update({ where: { id: existing.id }, data: { isRegional: true } });
      } else {
        await prisma.pokemonForm.update({
          where: { id: existing.id },
          data: { formName: r.new, isRegional: true, isCostume: false },
        });
        totalForms++;
        console.log(`  #741 oricorio -> ${r.new} (isRegional)`);
      }
    }
  }

  // Special handling for Lycanroc (745) - GO forms (Dusk, Midnight).
  // La forma Midday es el sprite base; Dusk/Midnight se marcan isRegional para /go.
  console.log("\n=== Ensuring Lycanroc forms ===");
  const lycanroc = await prisma.pokemon.findUnique({ where: { nationalDex: 745 } });
  if (lycanroc) {
    const lycanrocRenames = [
      { old: "Lycanroc Dusk", new: "Dusk" },
      { old: "Lycanroc Midnight", new: "Midnight" },
    ];
    for (const r of lycanrocRenames) {
      const existing = await prisma.pokemonForm.findUnique({
        where: { pokemonId_formName: { pokemonId: lycanroc.id, formName: r.old } },
      });
      if (!existing) continue;
      const targetExists = await prisma.pokemonForm.findUnique({
        where: { pokemonId_formName: { pokemonId: lycanroc.id, formName: r.new } },
      });
      if (targetExists) {
        await prisma.pokemonForm.update({ where: { id: existing.id }, data: { isRegional: true } });
      } else {
        await prisma.pokemonForm.update({
          where: { id: existing.id },
          data: { formName: r.new, isRegional: true, isCostume: false },
        });
        totalForms++;
        console.log(`  #745 lycanroc -> ${r.new} (isRegional)`);
      }
    }
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