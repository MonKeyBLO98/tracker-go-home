"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";

export const PIN_REQUIRED = "PIN_DESBLOQUEO_REQUERIDO";

export function isPinRequiredError(err: unknown): boolean {
  if (typeof err === "string") return err.includes(PIN_REQUIRED);
  if (err instanceof Error) return err.message.includes(PIN_REQUIRED);
  return false;
}

export function usePinGate() {
  const setOpen = useAuthStore((s) => s.setOpen);

  return useCallback(
    (err: unknown) => {
      if (isPinRequiredError(err)) {
        setOpen(true);
        return true;
      }
      return false;
    },
    [setOpen]
  );
}
