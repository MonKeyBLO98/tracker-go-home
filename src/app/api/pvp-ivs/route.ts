import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") || "great";
  const speciesId = req.nextUrl.searchParams.get("speciesId");

  const where: Record<string, unknown> = { league };
  if (speciesId) where.speciesId = speciesId;

  const results = await prisma.pvpIvRanking.findMany({
    where,
    orderBy: { rank: "asc" },
    take: 100,
  });

  return NextResponse.json(results);
}
