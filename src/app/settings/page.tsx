"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  Trash2,
  Check,
  ChevronDown,
  Monitor,
  Moon,
  Sun,
  RefreshCw,
  Play,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePinGate } from "@/lib/pin-gate-client";
import { useAppStore } from "@/stores/app-store";
import {
  getProfiles,
  createProfile,
  deleteProfile,
  getScrapingStatus,
  setSetting,
  runScraperNow,
} from "./actions";
import type { ProfileRow, ScrapingFrequency, ScrapingStatus } from "./types";

const FREQUENCY_LABELS: Record<ScrapingFrequency, string> = {
  manual: "Manual",
  "24h": "Diario",
  "1week": "Semanal",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const setStoreFrequency = useAppStore((s) => s.setScrapingFrequency);
  const pinGate = usePinGate();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [newProfileName, setNewProfileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [scraping, setScraping] = useState<ScrapingStatus | null>(null);
  const [scrapingLoading, setScrapingLoading] = useState(true);
  const [runningKey, setRunningKey] = useState<string | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let active = true;
    getProfiles()
      .then((result) => {
        if (active) setProfiles(result);
      })
      .catch((error) => {
        console.error("Error fetching profiles:", error);
        if (active) toast.error("No se pudieron cargar los perfiles");
      })
      .finally(() => {
        if (active) setProfilesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getScrapingStatus()
      .then((result) => {
        if (active) setScraping(result);
      })
      .catch((error) => {
        console.error("Error fetching scraping status:", error);
        if (active) toast.error("No se pudo cargar el estado del scraping");
      })
      .finally(() => {
        if (active) setScrapingLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectProfile = (profile: ProfileRow) => {
    setActiveProfile(profile.id, profile.profileName);
    toast.success(`Perfil activo: ${profile.profileName}`);
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    setCreating(true);
    try {
      const created = await createProfile(newProfileName);
      setNewProfileName("");
      setProfiles(await getProfiles());
      toast.success(`Perfil "${created.profileName}" creado`);
    } catch (error) {
      if (pinGate(error)) return;
      toast.error(error instanceof Error ? error.message : "Error al crear el perfil");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;
    setDeleting(true);
    try {
      await deleteProfile(profileToDelete.id);
      if (activeProfileId === profileToDelete.id) {
        setActiveProfile(null, null);
      }
      setProfiles(await getProfiles());
      toast.success(`Perfil "${profileToDelete.profileName}" eliminado`);
    } catch (error) {
      if (pinGate(error)) return;
      toast.error(error instanceof Error ? error.message : "Error al eliminar el perfil");
    } finally {
      setDeleting(false);
      setProfileToDelete(null);
    }
  };

  const handleFrequencyChange = async (freq: ScrapingFrequency) => {
    setScraping((prev) => (prev ? { ...prev, frequency: freq } : prev));
    setStoreFrequency(freq);
    try {
      await setSetting("scraping.frequency", freq);
      toast.success(`Frecuencia: ${FREQUENCY_LABELS[freq]}`);
    } catch (error) {
      if (pinGate(error)) return;
      toast.error("No se pudo guardar la frecuencia");
    }
  };

  const handleRunScraper = async (key: string) => {
    setRunningKey(key);
    try {
      await runScraperNow(key);
      setScraping(await getScrapingStatus());
      toast.success("Scraping completado");
    } catch (error) {
      if (pinGate(error)) return;
      toast.error(error instanceof Error ? error.message : "Error durante el scraping");
    } finally {
      setRunningKey(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Configuración de la aplicación</p>
      </div>

      {/* Perfiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Perfiles
          </CardTitle>
          <CardDescription>
            Cada perfil tiene sus propias capturas GO y registros HOME.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {profilesLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))
          ) : (
            <>
              {profiles.map((profile) => {
                const isActive = profile.id === activeProfileId;
                return (
                  <div
                    key={profile.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                      isActive && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="font-medium truncate flex items-center gap-2">
                          {profile.profileName}
                          {isActive && (
                            <Badge variant="default" className="text-[10px]">
                              Activo
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile.goCaptured} capturas GO · {profile.homeRegistered} registros HOME
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive && (
                        <Button variant="outline" size="sm" onClick={() => handleSelectProfile(profile)}>
                          <Check className="h-4 w-4 mr-1" />
                          Usar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={profiles.length <= 1}
                        onClick={() => setProfileToDelete(profile)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Separator />
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre del nuevo perfil"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProfile()}
                  maxLength={50}
                />
                <Button onClick={handleCreateProfile} disabled={creating || !newProfileName.trim()}>
                  {creating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-1" />
                  )}
                  Crear
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Scraping */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Datos externos</CardTitle>
              <CardDescription>
                Fuentes scrapeadas (DittoBase / PvPoke) y su última actualización.
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                <RefreshCw className="h-4 w-4" />
                Frecuencia: {scraping ? FREQUENCY_LABELS[scraping.frequency] : "..."}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(FREQUENCY_LABELS) as ScrapingFrequency[]).map((freq) => (
                  <DropdownMenuItem key={freq} onClick={() => handleFrequencyChange(freq)}>
                    {FREQUENCY_LABELS[freq]}
                    {scraping?.frequency === freq && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {scrapingLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : (
            scraping?.sources.map((source) => (
              <div
                key={source.key}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{source.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.rows !== null ? `${source.rows.toLocaleString("es-ES")} filas · ` : ""}
                    Último dato: {formatDate(source.lastData)} · Última ejecución:{" "}
                    {formatDate(source.lastRun)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={runningKey !== null}
                  onClick={() => handleRunScraper(source.key)}
                >
                  {runningKey === source.key ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Ejecutar
                </Button>
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground pt-1">
            Con frecuencia Diario/Semanal el scraping se ejecuta automáticamente a las 03:00.
          </p>
        </CardContent>
      </Card>

      {/* Apariencia */}
      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Tema de la interfaz.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={mounted && theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4 mr-1" />
              Claro
            </Button>
            <Button
              variant={mounted && theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4 mr-1" />
              Oscuro
            </Button>
            <Button
              variant={mounted && theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
            >
              <Monitor className="h-4 w-4 mr-1" />
              Sistema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmación de borrado */}
      <Dialog open={profileToDelete !== null} onOpenChange={(open) => !open && setProfileToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar perfil?</DialogTitle>
            <DialogDescription>
              Se eliminarán todos los datos de{" "}
              <span className="font-semibold">{profileToDelete?.profileName}</span>: capturas GO,
              checks, IVs y registros HOME. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteProfile} disabled={deleting}>
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
