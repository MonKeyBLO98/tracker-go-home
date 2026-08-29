import { prisma } from "@/lib/prisma";

export async function getDefaultUser() {
  let user = await prisma.user.findFirst({ orderBy: { id: "asc" } });
  if (!user) {
    user = await prisma.user.create({ data: { profileName: "Por defecto" } });
  }
  return user;
}

export async function resolveUserId(userId?: number | null): Promise<number> {
  if (userId != null && Number.isInteger(userId)) {
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (exists) return exists.id;
  }
  const def = await getDefaultUser();
  return def.id;
}
