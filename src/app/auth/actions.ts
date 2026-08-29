"use server";

import {
  isAuthenticated,
  login as authLogin,
  logout as authLogout,
  changePin as authChangePin,
  usesDefaultPin,
} from "@/lib/auth";
import { getDefaultUser } from "@/lib/profile";

export interface AuthState {
  authenticated: boolean;
  userId: number | null;
  profileName: string | null;
  usesDefault: boolean;
}

export async function getAuthState(): Promise<AuthState> {
  const ok = await isAuthenticated();
  const user = await getDefaultUser();
  return {
    authenticated: ok,
    userId: ok ? user.id : null,
    profileName: user.profileName,
    usesDefault: await usesDefaultPin(user.id),
  };
}

export async function login(userId: number, pin: string): Promise<{ success: boolean; error?: string }> {
  const ok = await authLogin(userId, pin);
  if (!ok) return { success: false, error: "PIN incorrecto" };
  return { success: true };
}

export async function logout(): Promise<void> {
  await authLogout();
}

export async function changePin(
  userId: number | null | undefined,
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authChangePin(userId, currentPin, newPin);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error" };
  }
}
