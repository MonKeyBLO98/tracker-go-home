import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/profile";
import { hashPin, verifyPin, isValidPinFormat } from "@/lib/pin-crypto";

const COOKIE_NAME = "tgh_auth";

async function getUserIdFromCookie(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function requireAuth(): Promise<void> {
  const id = await getUserIdFromCookie();
  if (id == null) throw new Error("PIN_DESBLOQUEO_REQUERIDO");
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw new Error("PIN_DESBLOQUEO_REQUERIDO");
}

export async function isAuthenticated(): Promise<boolean> {
  const id = await getUserIdFromCookie();
  if (id == null) return false;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  return !!user;
}

export async function login(userId: number, pin: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  if (!verifyPin(user.pin, pin)) return false;
  const store = await cookies();
  store.set(COOKIE_NAME, String(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// Cambia el PIN del perfil indicado (o del perfil por defecto).
export async function changePin(
  userId: number | null | undefined,
  currentPin: string,
  newPin: string
): Promise<void> {
  const targetId = await resolveUserId(userId);
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw new Error("Perfil no encontrado");
  if (!verifyPin(user.pin, currentPin)) throw new Error("PIN actual incorrecto");
  if (!isValidPinFormat(newPin)) throw new Error("El PIN debe tener entre 4 y 6 dígitos");
  await prisma.user.update({ where: { id: targetId }, data: { pin: hashPin(newPin) } });
}

// Devuelve true si el perfil aún usa el PIN por defecto (0000).
export async function usesDefaultPin(
  userId: number | null | undefined
): Promise<boolean> {
  const targetId = await resolveUserId(userId);
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) return true;
  return !user.pin;
}
