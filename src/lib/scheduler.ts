import * as cron from "node-cron";
import { getSetting } from "@/lib/app-settings";
import { runScraper, isScraperRunning } from "@/lib/scraper-runner";
import type { ScraperKey } from "@/lib/scrapers";

const SCRAPER_KEYS: ScraperKey[] = ["attackers", "pvp", "moves", "pvp-ivs"];

export function shouldRunDue(
  lastRunIso: string | null | undefined,
  minAgeMs: number,
  now: number = Date.now()
): boolean {
  if (!lastRunIso) return true;
  const t = Date.parse(lastRunIso);
  if (isNaN(t)) return true;
  return now - t >= minAgeMs;
}

export async function runDueScrapers(now: number = Date.now()): Promise<void> {
  const freq = (await getSetting("scraping.frequency")) ?? "24h";
  if (freq === "manual") return;

  const minAge = freq === "24h" ? 24 * 3600_000 : 7 * 24 * 3600_000;

  for (const key of SCRAPER_KEYS) {
    if (isScraperRunning(key)) continue;
    try {
      const last = await getSetting(`scraping.lastRun.${key}`);
      if (shouldRunDue(last, minAge, now)) {
        await runScraper(key);
      }
    } catch (err) {
      console.error(`[scheduler] Error en scraper ${key}:`, err);
    }
  }
}

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  const tick = () => {
    runDueScrapers().catch((e) => console.error("[scheduler] Tick falló:", e));
  };

  for (const expr of ["0 3 * * *", "0 3 * * 1"]) {
    cron.schedule(expr, tick);
  }

  // Catch-up poco después de arrancar el servidor
  setTimeout(tick, 15_000);

  console.log("[scheduler] Scraping programado (evaluación 03:00 diaria/semanal)");
}
