"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  Gamepad2,
  Home,
  Swords,
  Trophy,
  Shield,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Sparkles,
  Grid3X3,
  Crosshair,
  Zap,
  Users,
  ListChecks,
  LayoutGrid,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Pokédex Nacional", href: "/pokedex", icon: Search },
  { name: "Mi Pokédex GO", href: "/go", icon: Gamepad2 },
  { name: "Mi Pokédex Home", href: "/home", icon: Home },
  { name: "Habilidades", href: "/abilities", icon: ListChecks },
  { name: "Mini Dex", href: "/minidex", icon: LayoutGrid },
  { name: "Tabla de Tipos", href: "/type-chart", icon: Grid3X3 },
  { name: "Best Attackers", href: "/attackers", icon: Swords },
  { name: "PvP Rankings", href: "/pvp", icon: Trophy },
  { name: "PvP IV Checker", href: "/pvp-ivs", icon: Shield },
  { name: "IV Checker", href: "/iv-checker", icon: Crosshair },
  { name: "Move Rankings", href: "/moves", icon: Zap },
  { name: "Team Builder", href: "/team-builder", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Backup", href: "/backup", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">TGH</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Tooltip>
                  <TooltipTrigger>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  )}
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="px-2 pb-3">
        <Separator className="mb-3" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(
            "w-full justify-start gap-3",
            collapsed && "justify-center px-0"
          )}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          {!collapsed && <span>Cambiar tema</span>}
        </Button>
      </div>
    </div>
  );
}
