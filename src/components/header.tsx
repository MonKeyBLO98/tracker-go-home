"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, User, Settings, DatabaseBackup, Lock, LockOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { getAuthState } from "@/app/auth/actions";

export function Header() {
  const activeProfileName = useAppStore((s) => s.activeProfileName);
  const setOpen = useAuthStore((s) => s.setOpen);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      const state = await getAuthState();
      if (!active) return;
      setAuthenticated(state.authenticated);
      setMounted(true);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold">TrackerGoHome</h1>
          <p className="text-xs text-muted-foreground">
            PokǸmon GO & Home Tracker
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden sm:inline-flex gap-1.5">
          <User className="h-3 w-3" />
          {activeProfileName ?? "Perfil"}
        </Badge>
        <Button
          variant={authenticated ? "ghost" : "outline"}
          size="icon-sm"
          onClick={() => setOpen(true)}
          title={mounted ? (authenticated ? "Edición desbloqueada" : "Edición bloqueada") : "..."}
        >
          {mounted && authenticated ? (
            <LockOpen className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="h-9 w-9 p-0">
            <User className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{activeProfileName ?? "Perfil"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/backup" />}>
              <DatabaseBackup className="h-4 w-4 mr-2" />
              Backup
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
