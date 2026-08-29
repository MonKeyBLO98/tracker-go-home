import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.length < 2) return NextResponse.json([]);

  const results = await prisma.pokemon.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { nationalDex: parseInt(q) || -1 },
      ],
    },
    select: { id: true, name: true, nationalDex: true },
    take: 20,
    orderBy: { nationalDex: "asc" },
  });

  return NextResponse.json(
    results.map((p) => ({
      id: p.id,
      name: p.name,
      speciesId: p.name.toLowerCase().replace(/\s+/g, "_"),
      dex: p.nationalDex,
    }))
  );
}
