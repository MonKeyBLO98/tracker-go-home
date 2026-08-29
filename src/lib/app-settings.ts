import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/profile";

export async function getSetting(key: string): Promise<string | null> {
  const user = await getDefaultUser();
  const setting = await prisma.appSetting.findUnique({
    where: { userId_key: { userId: user.id, key } },
  });
  return setting?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const user = await getDefaultUser();
  await prisma.appSetting.upsert({
    where: { userId_key: { userId: user.id, key } },
    update: { value },
    create: { userId: user.id, key, value },
  });
  return { success: true };
}
