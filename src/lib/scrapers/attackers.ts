import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { PrismaClient } from "@/generated/prisma/client";

const ATTACK_TYPES = [
  "overall", "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug", "rock",
  "ghost", "dragon", "dark", "steel", "fairy",
];

const FORM_PREFIXES: Record<string, string> = {
  "mega": "mega",
  "primal": "primal",
  "shadow": "shadow",
  "apex shadow": "shadow",
};

// Suffixes to strip after removing prefix, to get the base pokemon name
const FORM_SUFFIXES = [
  "crowned shield", "crowned sword",
  "dawn wings", "dusk mane",
  "origin", "resolute",
  "black", "white",
  "y", "x",
];

const SOURCE = "dittoBase";

export function parsePokemonName(fullName: string): { baseName: string; form: string | null } {
  const lower = fullName.toLowerCase();
  let form: string | null = null;
  let remainder = lower;

  for (const [prefix, f] of Object.entries(FORM_PREFIXES)) {
    if (lower.startsWith(prefix + " ")) {
      form = f;
      remainder = lower.slice(prefix.length + 1);
      break;
    }
  }

  // Strip known suffixes to get the base name
  for (const suffix of FORM_SUFFIXES) {
    if (remainder.endsWith(" " + suffix)) {
      remainder = remainder.slice(0, remainder.length - suffix.length - 1).trim();
      break;
    }
  }

  return { baseName: remainder, form };
}

function parsePercent(s: string): number {
  return parseFloat(s.replace("%", "")) || 0;
}

function parseNumber(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runAttackersScraper(
  prisma: PrismaClient,
  log: Pick<Console, "log" | "warn" | "error"> = console
): Promise<void> {
  log.log("=== DittoBase Attacker Ranking Scraper ===\n");

  for (const attackType of ATTACK_TYPES) {
    try {
      await scrapePage(prisma, attackType, log);
    } catch (err) {
      log.error(`  ✗ Error scraping ${attackType}: ${err}`);
    }
    // Be polite: 1.5s between requests
    await sleep(1500);
  }

  log.log("\n=== Scrape Complete ===");
}

async function scrapePage(
  prisma: PrismaClient,
  attackType: string,
  log: Pick<Console, "log" | "warn" | "error">
): Promise<void> {
  const url = `https://dittoBase.com/pokemon-go/best-attackers/${attackType}`;
  log.log(`\n  Fetching ${url}...`);

  const res = await fetch(url);
  if (!res.ok) {
    log.error(`  ✗ HTTP ${res.status} for ${url}`);
    return;
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  // Find the table container
  const table = $('div[role="table"]');
  if (!table.length) {
    log.error(`  ✗ No table found for ${attackType}`);
    return;
  }

  const rows = $('li[role="row"]', table);
  log.log(`  Found ${rows.length} rows`);

  interface AttackerRecord {
    fullName: string;
    baseName: string;
    form: string | null;
    imgSrc: string;
    nationalDex: number | null;
    rank: number;
    tier: string | null;
    fastMove: string;
    fastMoveType: string | null;
    chargedMove: string;
    chargedMoveType: string | null;
    dps: number;
    tdo: number;
    faints: number;
    ttw: string | null;
    edps: number;
    percentBest: number;
    attackType: string;
    pokemonId?: number | null;
  }

  const records: AttackerRecord[] = [];
  let currentTier: string | null = null;

  // Helper: get visible text from a cell, skipping embedded <style> tags
  function cellText(cell: Element): string {
    // Data is always in <p> tags; get only direct text nodes (skip nested <style> in badges)
    const pTag = $(cell).find("p").first();
    if (pTag.length) {
      // Get text nodes only (excludes text inside child elements like <span> with <style>)
      const directText = pTag
        .contents()
        .filter(function () { return this.type === "text"; })
        .text()
        .trim();
      if (directText) return directText;
      // Fallback: full text
      return pTag.text().trim();
    }
    // Fallback: get text from non-STYLE children
    const contentEl = $(cell).children().filter(function () {
      return $(this).prop("tagName") !== "STYLE";
    }).first();
    if (contentEl.length) {
      return contentEl.text().trim();
    }
    return "";
  }

  rows.each((_, row) => {
    const rowIndex = parseInt($(row).attr("aria-rowindex") || "0", 10);
    if (isNaN(rowIndex) || rowIndex <= 1) return; // skip header row

    const cells = $(row).find('div[role="cell"]');
    if (cells.length < 11) return;

    // Cell 0: Tier (only on first row of each tier group)
    // The tier cell has a <style> tag then a <div> with the tier label
    const tierDiv = $(cells[0]).children().filter(function () {
      return $(this).prop("tagName") !== "STYLE";
    }).first();
    const tierText = tierDiv.length ? tierDiv.text().trim() : "";
    if (tierText) {
      currentTier = tierText;
    }

    // Cell 1: Rank
    const rankText = cellText(cells[1]);
    const rank = parseInt(rankText, 10);
    if (isNaN(rank)) return;

    // Cell 2: Pokemon name + image
    const pokemonImg = $(cells[2]).find("img").first();
    const fullName = (pokemonImg.attr("alt") || "").trim();
    const imgSrc = pokemonImg.attr("src") || "";
    if (!fullName) return;

    // Extract national dex ID from src pattern: https://assets.dittobase.com/go/pokemon/{id}-{slug}.png
    const srcMatch = imgSrc.match(/\/pokemon\/(\d+)-/);
    const nationalDex = srcMatch ? parseInt(srcMatch[1], 10) : null;

    // Cell 3: Fast Move
    const fastMoveText = cellText(cells[3]);
    const fastMoveType = $(cells[3]).find("img").attr("alt") || null;

    // Cell 4: Charged Move
    const chargedMoveText = cellText(cells[4]);
    const chargedMoveType = $(cells[4]).find("img").attr("alt") || null;

    // Cell 5: DPS
    const dps = parseNumber(cellText(cells[5]));

    // Cell 6: TDO
    const tdo = parseNumber(cellText(cells[6]));

    // Cell 7: Faints
    const faints = parseNumber(cellText(cells[7]));

    // Cell 8: TTW
    const ttw = cellText(cells[8]) || null;

    // Cell 9: eDPS
    const edps = parseNumber(cellText(cells[9]));

    // Cell 10: % of best
    const percentBest = parsePercent(cellText(cells[10]));

    const { baseName, form } = parsePokemonName(fullName);

    records.push({
      fullName,
      baseName,
      form,
      imgSrc,
      nationalDex,
      rank,
      tier: currentTier,
      fastMove: fastMoveText,
      fastMoveType,
      chargedMove: chargedMoveText,
      chargedMoveType,
      dps,
      tdo,
      faints,
      ttw,
      edps,
      percentBest,
      attackType,
    });
  });

  log.log(`  Parsed ${records.length} attacker records for ${attackType}`);

  // Look up pokemonId for each record
  const pokemonCache = new Map<string, number>();

  for (const rec of records) {
    // Try by nationalDex first (more reliable), then by name
    if (rec.nationalDex) {
      const dexKey = `dex:${rec.nationalDex}`;
      if (pokemonCache.has(dexKey)) {
        rec.pokemonId = pokemonCache.get(dexKey)!;
        continue;
      }
      const pokemon = await prisma.pokemon.findUnique({
        where: { nationalDex: rec.nationalDex },
        select: { id: true },
      });
      if (pokemon) {
        pokemonCache.set(dexKey, pokemon.id);
        rec.pokemonId = pokemon.id;
        continue;
      }
    }

    // Fallback: try by name
    if (pokemonCache.has(rec.baseName)) {
      rec.pokemonId = pokemonCache.get(rec.baseName)!;
      continue;
    }
    const pokemon = await prisma.pokemon.findFirst({
      where: { name: rec.baseName },
      select: { id: true },
    });
    if (pokemon) {
      pokemonCache.set(rec.baseName, pokemon.id);
      rec.pokemonId = pokemon.id;
    } else {
      log.warn(`  ⚠ Pokemon not found: "${rec.baseName}" (from "${rec.fullName}") [dex=${rec.nationalDex}]`);
      rec.pokemonId = null;
    }
  }

  // Filter out records where pokemon wasn't found
  const validRecords = records.filter(
    (r): r is AttackerRecord & { pokemonId: number } => r.pokemonId !== null
  );
  if (validRecords.length === 0) {
    log.log(`  No valid records to insert for ${attackType}`);
    return;
  }

  // Delete existing records for this attackType + source
  const deleted = await prisma.attackerRanking.deleteMany({
    where: { attackType, source: SOURCE },
  });
  log.log(`  Deleted ${deleted.count} existing ${attackType} records`);

  // Insert new records
  await prisma.attackerRanking.createMany({
    data: validRecords.map((r) => ({
      pokemonId: r.pokemonId,
      form: r.form,
      attackType: r.attackType,
      rank: r.rank,
      tier: r.tier,
      pokemonName: r.fullName,
      fastMove: r.fastMove,
      fastMoveType: r.fastMoveType,
      chargedMove: r.chargedMove,
      chargedMoveType: r.chargedMoveType,
      dps: r.dps,
      tdo: r.tdo,
      edps: r.edps,
      faints: r.faints || null,
      ttw: r.ttw,
      percentBest: r.percentBest,
      source: SOURCE,
    })),
  });
  log.log(`  ✓ Created ${validRecords.length} records for ${attackType}`);
}
