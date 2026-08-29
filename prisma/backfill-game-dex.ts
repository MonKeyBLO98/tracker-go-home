import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Mini Dex de Pokémon HOME: membresía por juego.
// Fuentes:
// - PokéAPI /pokedex/{slug} para los dexes regionales.
// - Bulbapedia "List of Pokémon in the Mega Evolution Pokédex" para megadex.
// - Todas las especies para GO salvo los 22 míticos/evento (GO_EXCLUDE).
// Exclusiones confirmadas contra las listas oficiales (HOME omite míticos/evento):
// - kanto: Mew, Meltan, Melmetal (150)
// - sinnoh: Manaphy (150)
// - luminalia: Diancie y Mewtwo (230)
// - dimensional: Zeraora (131)
// - arandano: Walking Wake, Iron Leaves, Pecharunt (240)
// - armadura: Zarude (210)

// HOME cuenta el MegaDex como 93 entradas: Charizard/Raichu/Mewtwo (Mega X/Y)
// y Garchomp/Absol/Lucario (Mega/Mega Z) son entradas separadas; Tatsugiri
// (3 formas) y Magearna (Original Color) comparten una sola entrada.

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: "file:./dev.db" }),
});

const MEGADEX_RAW_URL =
  "https://bulbapedia.bulbagarden.net/w/index.php?title=List_of_Pok%C3%A9mon_in_the_Mega_Evolution_Pok%C3%A9dex&action=raw";

const POKEAPI_DEXES: Record<string, { slug: string; exclude: number[] }> = {
  kanto: { slug: "letsgo-kanto", exclude: [151, 808, 809] },
  sinnoh: { slug: "original-sinnoh", exclude: [490] },
  galar: { slug: "galar", exclude: [] },
  armadura: { slug: "isle-of-armor", exclude: [893] },
  corona: { slug: "crown-tundra", exclude: [] },
  hisui: { slug: "hisui", exclude: [] },
  paldea: { slug: "paldea", exclude: [] },
  noroteo: { slug: "kitakami", exclude: [] },
  arandano: { slug: "blueberry", exclude: [1009, 1010, 1025] },
  luminalia: { slug: "lumiose-city", exclude: [150, 719] },
  dimensional: { slug: "hyperspace", exclude: [807] },
};

// Míticos/evento ausentes del dex de Pokémon GO en HOME (dexNumber = nacional,
// los huecos se preservan sin renumerar).
const GO_EXCLUDE = new Set([
  151, // Mew
  251, // Celebi
  385, // Jirachi
  386, // Deoxys
  489, // Phione
  490, // Manaphy
  491, // Darkrai
  492, // Shaymin
  493, // Arceus
  494, // Victini
  647, // Keldeo
  648, // Meloetta
  649, // Genesect
  719, // Diancie
  720, // Hoopa
  721, // Volcanion
  801, // Magearna
  802, // Marshadow
  807, // Zeraora
  808, // Meltan
  809, // Melmetal
  1025, // Pecharunt
]);

const GAME_ORDER = [
  "luminalia",
  "dimensional",
  "megadex",
  "paldea",
  "noroteo",
  "arandano",
  "hisui",
  "sinnoh",
  "galar",
  "armadura",
  "corona",
  "kanto",
  "go",
];

const EXPECTED_TOTALS: Record<string, number> = {
  luminalia: 230,
  dimensional: 131,
  megadex: 93,
  paldea: 400,
  noroteo: 200,
  arandano: 240,
  hisui: 242,
  sinnoh: 150,
  galar: 400,
  armadura: 210,
  corona: 210,
  kanto: 150,
  go: 1003,
};

interface PokeApiDexEntry {
  entry_number: number;
  pokemon_species: { name: string; url: string };
}

async function fetchPokeApiDex(slug: string): Promise<PokeApiDexEntry[]> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokedex/${slug}`);
  if (!res.ok) throw new Error(`PokeAPI ${slug} HTTP ${res.status}`);
  const data = (await res.json()) as { pokemon_entries: PokeApiDexEntry[] };
  return data.pokemon_entries;
}

interface MegadexEntry {
  ndex: number;
  formParam: string; // "-Mega", "-Mega X", "-Mega Y", "-Mega Z", ...
}

async function fetchMegadexEntries(): Promise<MegadexEntry[]> {
  const res = await fetch(MEGADEX_RAW_URL);
  if (!res.ok) throw new Error(`Bulbapedia megadex HTTP ${res.status}`);
  const wikitext = await res.text();
  // Solo la sección del listado (el resto de la página menciona megas sueltos)
  const sectionStart = wikitext.indexOf(
    "==List of Pokémon in the Mega Evolution Pokédex=="
  );
  if (sectionStart === -1) throw new Error("No se encontró la sección del listado");
  const headingEnd = wikitext.indexOf("\n", sectionStart);
  let sectionEnd = wikitext.indexOf("\n==", headingEnd);
  if (sectionEnd === -1) sectionEnd = wikitext.length;
  const section = wikitext.slice(headingEnd, sectionEnd);

  // Una fila por entrada; {{MSP/ZA|<ndex>|<Nombre>|form=-Mega X}}
  const chunks = section.split(/\n\|-/).slice(1);
  const entries: MegadexEntry[] = [];
  for (const chunk of chunks) {
    const m = /\{\{MSP\/ZA\|(\d+)\|[^|}]+(?:\|form=([^}|]+))?/.exec(chunk);
    if (!m) continue;
    entries.push({ ndex: parseInt(m[1]), formParam: m[2] ?? "" });
  }

  // HOME fusiona en una sola entrada las formas de Tatsugiri (3 filas) y
  // Magearna (Original Color): conservamos la primera aparición.
  const MERGED_SPECIES = new Set([978, 801]);
  const seenMerged = new Set<number>();
  return entries.filter((e) => {
    if (!MERGED_SPECIES.has(e.ndex)) return true;
    if (seenMerged.has(e.ndex)) return false;
    seenMerged.add(e.ndex);
    return true;
  });
}

function formLabel(formParam: string): string {
  // "-Mega X" → "Mega X"; "-Mega" y vacío → "" (mega base, entrada por especie)
  const label = formParam.replace(/^-/, "").trim();
  if (/^mega$/i.test(label)) return "";
  return /^Mega\b/i.test(label) ? label : "";
}

async function fetchFormSprite(
  ndex: number,
  formParam: string
): Promise<string | null> {
  try {
    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${ndex}`);
    if (!speciesRes.ok) return null;
    const species = (await speciesRes.json()) as {
      varieties: { pokemon: { name: string; url: string } }[];
    };
    const suffix = formParam.replace(/^-/, "").toLowerCase().replace(/\s+/g, "-");
    const variety = species.varieties.find((v) => v.pokemon.name.endsWith(suffix));
    if (!variety) return null;
    const pokeRes = await fetch(variety.pokemon.url);
    if (!pokeRes.ok) return null;
    const pokeData = (await pokeRes.json()) as { sprites: { front_default: string | null } };
    return pokeData.sprites.front_default;
  } catch {
    return null;
  }
}

interface DexRow {
  pokemonId: number;
  dexNumber: number;
  formName: string;
  spriteUrl: string | null;
}

async function buildGameRows(
  gameKey: string,
  dexToId: Map<number, number>,
  spriteFallback: Map<number, string | null>
): Promise<DexRow[]> {
  if (gameKey === "go") {
    return []; // se llena aparte con todas las especies
  }

  let rowsIn: { ndex: number; dexNumber: number; formParam: string }[];
  if (gameKey === "megadex") {
    rowsIn = (await fetchMegadexEntries()).map((e) => ({
      ndex: e.ndex,
      dexNumber: e.ndex,
      formParam: e.formParam,
    }));
    if (rowsIn.length !== EXPECTED_TOTALS.megadex) {
      throw new Error(
        `megadex: se esperaban ${EXPECTED_TOTALS.megadex} entradas, el parser encontró ${rowsIn.length}`
      );
    }
  } else {
    const conf = POKEAPI_DEXES[gameKey];
    if (!conf) throw new Error(`Sin fuente configurada para ${gameKey}`);
    const entries = await fetchPokeApiDex(conf.slug);
    const excluded = new Set(conf.exclude);
    // entry_number es la numeración REGIONAL del juego; el número nacional
    // (para buscar pokemonId y aplicar exclusiones) viene en species.url.
    rowsIn = entries
      .map((e) => ({
        ndex: parseInt(e.pokemon_species.url.split("/").filter(Boolean).pop() ?? ""),
        dexNumber: e.entry_number,
        formParam: "",
      }))
      .filter((e) => !excluded.has(e.ndex));
  }

  const rows: DexRow[] = [];
  for (const { ndex, dexNumber, formParam } of rowsIn) {
    const pokemonId = dexToId.get(ndex);
    if (pokemonId === undefined) {
      console.warn(`  ${gameKey}: especie #${ndex} no está en la BD, se omite`);
      continue;
    }
    const formName = gameKey === "megadex" ? formLabel(formParam) : "";
    let spriteUrl: string | null = null;
    if (gameKey === "megadex" && formName) {
      spriteUrl = await fetchFormSprite(ndex, formParam);
      if (!spriteUrl) {
        console.warn(`  megadex: sin sprite de forma para #${ndex} ${formName}, uso el de la especie`);
        spriteUrl = spriteFallback.get(pokemonId) ?? null;
      }
    }
    rows.push({ pokemonId, dexNumber, formName, spriteUrl });
  }
  return rows;
}

async function main() {
  const dryRun = process.argv.includes("--dry");

  const pokemonList = await prisma.pokemon.findMany({
    select: { id: true, nationalDex: true, spriteUrl: true },
    orderBy: { nationalDex: "asc" },
  });
  const dexToId = new Map(pokemonList.map((p) => [p.nationalDex, p.id]));
  const spriteFallback = new Map(pokemonList.map((p) => [p.id, p.spriteUrl]));

  for (const gameKey of GAME_ORDER) {
    let rows: DexRow[];
    if (gameKey === "go") {
      rows = pokemonList
        .filter((p) => !GO_EXCLUDE.has(p.nationalDex))
        .map((p) => ({
          pokemonId: p.id,
          dexNumber: p.nationalDex,
          formName: "",
          spriteUrl: null,
        }));
    } else {
      rows = await buildGameRows(gameKey, dexToId, spriteFallback);
    }

    const expected = EXPECTED_TOTALS[gameKey];
    const ok = rows.length === expected ? "OK" : `DESAJUSTE (esperado ${expected})`;
    console.log(`${gameKey}: ${rows.length} entradas — ${ok}`);

    if (rows.length !== expected) {
      throw new Error(`Conteo de ${gameKey} no coincide con HOME`);
    }
    if (dryRun) continue;

    await prisma.homeGameDex.deleteMany({ where: { gameKey } });
    await prisma.homeGameDex.createMany({
      data: rows.map((r) => ({
        gameKey,
        pokemonId: r.pokemonId,
        dexNumber: r.dexNumber,
        formName: r.formName,
        spriteUrl: r.spriteUrl,
      })),
    });
  }

  console.log(dryRun ? "Dry run completado, nada escrito." : "Backfill completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
