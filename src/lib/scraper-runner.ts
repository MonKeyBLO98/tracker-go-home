import { prisma } from "@/lib/prisma";
import { SCRAPERS, type ScraperKey } from "@/lib/scrapers";
import { setSetting } from "@/lib/app-settings";
import { revalidateTag } from "next/cache";
import { REFERENCE_TAG } from "@/lib/reference-cache";

const running = new Set<string>();

export function isScraperRunning(key: string): boolean {
  return running.has(key);
}

export async function runScraper(key: string): Promise<{ success: true; finishedAt: string }> {
  const scraper = SCRAPERS[key as ScraperKey];
  if (!scraper) throw new Error(`Scraper desconocido: ${key}`);
  if (running.has(key)) {
    throw new Error("Ese scraping ya está en ejecución");
  }

  running.add(key);
  try {
    console.log(`[scraper] Iniciando ${key}...`);
    await scraper.run(prisma);
    const finishedAt = new Date().toISOString();
    await setSetting(`scraping.lastRun.${key}`, finishedAt);
    revalidateTag(REFERENCE_TAG, "max");
    console.log(`[scraper] ${key} completado`);
    return { success: true, finishedAt };
  } finally {
    running.delete(key);
  }
}
