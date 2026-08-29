import type { PrismaClient } from "@/generated/prisma/client";

const GAMEMASTER_URL =
  "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json";

interface GamemasterMove {
  moveId: string;
  name: string;
  type: string;
  power?: number;
  energy?: number;
  energyGain?: number;
  cooldown?: number;
  archetype?: string;
  turns?: number;
}

export async function runMovesScraper(
  prisma: PrismaClient,
  log: Pick<Console, "log" | "warn" | "error"> = console
): Promise<void> {
  log.log("=== PvPoke Move Scraper ===\n");

  log.log(`Fetching ${GAMEMASTER_URL}...`);
  const res = await fetch(GAMEMASTER_URL);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const gamemaster = await res.json();
  const moves: GamemasterMove[] = gamemaster.moves ?? [];
  log.log(`Received ${moves.length} moves\n`);

  const records = moves.map((m) => {
    const category = (m.energyGain ?? 0) > 0 ? "fast" : "charged";
    const cooldown = m.cooldown ?? 0;
    const power = m.power ?? 0;
    const energy = m.energy ?? 0;
    const energyGain = m.energyGain ?? 0;

    const dps = cooldown > 0 ? power / (cooldown / 1000) : null;
    const dpe = category === "charged" && energy > 0 ? power / energy : null;

    return {
      moveId: m.moveId,
      name: m.name,
      type: m.type,
      category,
      power,
      energy,
      energyGain,
      cooldown,
      turns: m.turns ?? 0,
      archetype: m.archetype ?? null,
      dps,
      dpe,
    };
  });

  const fastCount = records.filter((r) => r.category === "fast").length;
  const chargedCount = records.filter((r) => r.category === "charged").length;

  const deleted = await prisma.move.deleteMany({});
  log.log(`Deleted ${deleted.count} existing moves`);

  await prisma.move.createMany({ data: records });
  log.log(`✓ Created ${records.length} moves (${fastCount} fast, ${chargedCount} charged)\n`);

  log.log("=== Scrape Complete ===");
}
