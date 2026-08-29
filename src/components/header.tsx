"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, User, Settings, DatabaseBackup } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/stores/app-store";

export function Header() {
  const activeProfileName = useAppStore((s) => s.activeProfileName);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold">TrackerGoHome</h1>
          <p className="text-xs text-muted-foreground">
            Pokémon GO & Home Tracker
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden sm:inline-flex gap-1.5">
          <User className="h-3 w-3" />
          {activeProfileName ?? "Perfil"}
        </Badge>
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
