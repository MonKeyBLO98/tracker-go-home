"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gamepad2,
  Home,
  Sparkles,
  Star,
  Zap,
  Trophy,
  Crown,
  Flame,
  Grid3X3,
  Crosshair,
  Swords,
  Users,
} from "lucide-react";
import { getDashboardStats, type DashboardStats } from "./actions";
import {
  getChartsData,
  type ChartsData,
} from "./charts/actions";
import { RadialGauge } from "@/components/charts/radial-gauge";
import { GenerationProgressChart } from "@/components/charts/generation-chart";
import { GoChecksChart } from "@/components/charts/go-checks-chart";
import { HomeGamesChart } from "@/components/charts/home-games-chart";
import { useAppStore } from "@/stores/app-store";
import Link from "next/link";

export default function DashboardPage() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return Promise.all([
          getDashboardStats(activeProfileId),
          getChartsData(activeProfileId),
        ]);
      })
      .then(([s, c]) => {
        if (!active) return;
        setStats(s);
        setCharts(c);
      })
      .catch((error) => {
        console.error("Error fetching dashboard data:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeProfileId]);

  const statCards = stats
    ? [
        {
          title: "Pokémon GO",
          description: "Pokémon capturados",
          value: stats.goCaptured,
          total: stats.totalPokemon,
          icon: Gamepad2,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
        },
        {
          title: "Shinies",
          description: "Pokémon variocolor",
          value: stats.goShiny,
          icon: Star,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
        },
        {
          title: "Lucky",
          description: "Pokémon con suerte",
          value: stats.goLucky,
          icon: Sparkles,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
        },
        {
          title: "Hundos",
          description: "100% IVs",
          value: stats.goHundo,
          icon: Zap,
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
        },
        {
          title: "Shadow",
          description: "Pokémon oscuros",
          value: stats.goShadow,
          icon: Flame,
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
        },
        {
          title: "Mega/Gmax",
          description: "Megaevolución y Gigamax",
          value: stats.goMegaGmax,
          icon: Crown,
          color: "text-pink-500",
          bgColor: "bg-pink-500/10",
        },
        {
          title: "Home",
          description: "Pokémon registrados",
          value: stats.homeRegistered,
          icon: Home,
          color: "text-blue-400",
          bgColor: "bg-blue-400/10",
        },
        {
          title: "PvP",
          description: "Rankings disponibles",
          value: stats.pvpRankings,
          icon: Trophy,
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
        },
        {
          title: "Movimientos",
          description: "Movimientos indexados",
          value: stats.moveCount,
          icon: Zap,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
        },
        {
          title: "PvP IVs",
          description: "Combinaciones IV",
          value: stats.pvpIvCount.toLocaleString(),
          icon: Crosshair,
          color: "text-cyan-500",
          bgColor: "bg-cyan-500/10",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          Resumen de tu tracker de Pokémon
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.total ? `${stat.total} total` : stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Progreso */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Progreso</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pokédex GO
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {loading || !charts ? (
                <Skeleton className="h-[180px] w-[220px] rounded-full" />
              ) : (
                <RadialGauge
                  label="Capturados"
                  value={charts.totals.goCaptured}
                  total={charts.totals.totalPokemon}
                  color="var(--chart-2)"
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pokédex HOME
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {loading || !charts ? (
                <Skeleton className="h-[180px] w-[220px] rounded-full" />
              ) : (
                <RadialGauge
                  label="Registrados"
                  value={charts.totals.homeRegistered}
                  total={charts.totals.totalPokemon}
                  color="var(--chart-3)"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Progreso por generación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !charts ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <GenerationProgressChart data={charts.generations} />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checks GO</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !charts ? (
                <Skeleton className="h-[280px] w-full" />
              ) : (
                <GoChecksChart data={charts.goChecks} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Progreso por juego (HOME)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !charts ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (
                <HomeGamesChart data={charts.homeGames} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/type-chart">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-purple-500/10">
                <Grid3X3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="font-medium text-sm">Tabla de Tipos</div>
                <div className="text-xs text-muted-foreground">Efectividad de tipos</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/iv-checker">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-blue-500/10">
                <Crosshair className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium text-sm">IV Checker</div>
                <div className="text-xs text-muted-foreground">Ranking por liga</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/moves">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-yellow-500/10">
                <Swords className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <div className="font-medium text-sm">Move Rankings</div>
                <div className="text-xs text-muted-foreground">Mejores movimientos</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/team-builder">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="font-medium text-sm">Team Builder</div>
                <div className="text-xs text-muted-foreground">Construye equipos</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-green-500" />
              Pokémon GO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Registra y gestiona tu colección de Pokémon GO con checks
              personalizados.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Shiny",
                "Lucky",
                "Hundo",
                "XXL",
                "XXS",
                "Mega",
                "Gmax",
                "Shadow",
                "Purified",
                "Costumes",
              ].map((check) => (
                <span
                  key={check}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                >
                  {check}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-400" />
              Pokémon Home
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Trackea tu Pokédex de Home con idiomas, habilidades y orígenes de
              juego.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "ENG",
                "ES-ES",
                "ES-LA",
                "FRA",
                "DEU",
                "ITA",
                "JPN",
                "KOR",
                "CHS",
                "CHT",
              ].map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                >
                  {lang}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
