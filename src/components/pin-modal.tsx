"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getAuthState, login, logout, changePin } from "@/app/auth/actions";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { Lock, LogOut, KeyRound } from "lucide-react";

export function PinModal() {
  const open = useAuthStore((s) => s.open);
  const defaultPin = useAuthStore((s) => s.defaultPin);
  const setOpen = useAuthStore((s) => s.setOpen);
  const setDefaultPin = useAuthStore((s) => s.setDefaultPin);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [mode, setMode] = useState<"unlock" | "change">("unlock");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setMode("unlock");
      setPin("");
      setNewPin("");
      setConfirmPin("");
      getAuthState().then((s) => setDefaultPin(s.usesDefault));
    }
  };

  const handleUnlock = () => {
    if (!pin) return;
    startTransition(async () => {
      const res = await login(activeProfileId ?? 1, pin);
      if (res.success) {
        toast.success("Desbloqueado");
        setOpen(false);
        setPin("");
      } else {
        toast.error(res.error ?? "PIN incorrecto");
        setPin("");
      }
    });
  };

  const handleChangePin = () => {
    if (!/^\d{4,6}$/.test(newPin)) {
      toast.error("El PIN debe tener entre 4 y 6 dígitos");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("El PIN de confirmación no coincide");
      return;
    }
    startTransition(async () => {
      const res = await changePin(activeProfileId, pin, newPin);
      if (res.success) {
        toast.success("PIN actualizado");
        setDefaultPin(false);
        setMode("unlock");
        setPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        toast.error(res.error ?? "Error al cambiar el PIN");
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      toast.info("Bloqueado");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {mode === "unlock" ? "Desbloquear edición" : "Cambiar PIN"}
          </DialogTitle>
          <DialogDescription>
            {mode === "unlock" ? (
              defaultPin ? (
                "El PIN por defecto es 0000. Úsalo para desbloquear la edición."
              ) : (
                "Introduce tu PIN para poder editar los datos."
              )
            ) : (
              "Introduce el PIN actual y el nuevo PIN que quieras usar."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {mode === "unlock" ? "PIN" : "PIN actual"}
            </label>
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mode === "unlock") handleUnlock();
                if (e.key === "Enter" && mode === "change") handleChangePin();
              }}
              placeholder="••••"
            />
          </div>

          {mode === "change" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Nuevo PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="4-6 dígitos"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Confirmar nuevo PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Repite el PIN"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {mode === "unlock" ? (
            <>
              <Button variant="ghost" onClick={() => setMode("change")}>
                <KeyRound className="h-4 w-4 mr-1.5" />
                Cambiar PIN
              </Button>
              <Button onClick={handleUnlock} disabled={!pin || isPending}>
                Desbloquear
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setMode("unlock")}>
                Volver
              </Button>
              <Button
                onClick={handleChangePin}
                disabled={!pin || !newPin || !confirmPin || isPending}
              >
                Guardar PIN
              </Button>
            </>
          )}
        </DialogFooter>

        {mode === "unlock" && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Bloquear sesión
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
