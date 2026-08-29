"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Download,
  Upload,
  History,
  ChevronDown,
  Loader2,
  FileJson,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getProfiles } from "@/app/settings/actions";
import type { ProfileRow } from "@/app/settings/types";
import { exportBackup, previewBackup, importBackup, getBackupHistory } from "./actions";
import type { BackupPreview, BackupLogRow } from "./types";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

export default function BackupPage() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingJson, setPendingJson] = useState<{ text: string; preview: BackupPreview } | null>(null);
  const [importing, setImporting] = useState(false);

  const [history, setHistory] = useState<BackupLogRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getProfiles()
      .then((result) => {
        if (!active) return;
        setProfiles(result);
        setSelectedId((prev) => prev ?? activeProfileId ?? result[0]?.id ?? null);
      })
      .catch((error) => {
        console.error("Error fetching profiles:", error);
        if (active) toast.error("No se pudieron cargar los perfiles");
      });
    return () => {
      active = false;
    };
  }, [activeProfileId]);

  useEffect(() => {
    let active = true;
    getBackupHistory()
      .then((result) => {
        if (active) setHistory(result);
      })
      .catch((error) => {
        console.error("Error fetching history:", error);
        if (active) toast.error("No se pudo cargar el historial");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null;

  const handleExport = async () => {
    if (!selectedProfile) return;
    setExporting(true);
    try {
      const { data, filename } = await exportBackup(selectedProfile.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Backup descargado (${data.go.length} GO · ${data.home.length} HOME)`);
      setHistory(await getBackupHistory());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  };

  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const preview = await previewBackup(text);
      setPendingJson({ text, preview });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archivo no válido");
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingJson || !selectedProfile) return;
    setImporting(true);
    try {
      const result = await importBackup(selectedProfile.id, pendingJson.text);
      toast.success(
        `Restaurado en "${selectedProfile.profileName}": ${result.goProcessed} GO · ${result.homeProcessed} HOME` +
          (result.skipped > 0 ? ` · ${result.skipped} omitidos` : "")
      );
      setPendingJson(null);
      setHistory(await getBackupHistory());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold">Backup</h2>
        <p className="text-muted-foreground">
          Exporta e importa los datos del tracker por perfil
        </p>
      </div>

      {/* Perfil destino */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Perfil sobre el que se aplicarán las operaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              <FileJson className="h-4 w-4" />
              {selectedProfile ? selectedProfile.profileName : "Selecciona un perfil"}
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {profiles.map((profile) => (
                <DropdownMenuItem key={profile.id} onClick={() => setSelectedId(profile.id)}>
                  {profile.profileName}
                  {profile.id === selectedId && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {/* Exportar / Importar */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Exportar</CardTitle>
            <CardDescription>
              Descarga un JSON con capturas GO, checks, IVs y registros HOME del perfil.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={!selectedProfile || exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Exportar JSON
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Importar</CardTitle>
            <CardDescription>
              Restauración no destructiva: añade y actualiza datos, nunca borra lo existente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                handleFilePicked(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedProfile}
            >
              <Upload className="h-4 w-4 mr-1" />
              Seleccionar archivo…
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial
          </CardTitle>
          <CardDescription>Últimas 20 operaciones de copia y restauración.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {historyLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay operaciones registradas.</p>
          ) : (
            history.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{row.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.profileName} · {formatDate(row.createdAt)}
                  </p>
                </div>
                <Badge variant={row.action === "restore" ? "secondary" : "outline"}>
                  {row.action === "restore" ? "Restauración" : "Copia"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Confirmación de restauración */}
      <Dialog open={pendingJson !== null} onOpenChange={(open) => !open && setPendingJson(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Restaurar backup?</DialogTitle>
            <DialogDescription className="text-left">
              <span className="block space-y-2">
                <span className="block">
                  Se fusionará en el perfil{" "}
                  <span className="font-semibold">{selectedProfile?.profileName}</span>.
                </span>
                <span className="block">
                  Origen:{" "}
                  <span className="font-semibold">{pendingJson?.preview.profileName ?? "desconocido"}</span>{" "}
                  · {formatDate(pendingJson?.preview.exportedAt)}
                </span>
                <span className="block">
                  Contenido:{" "}
                  <span className="font-semibold">
                    {pendingJson?.preview.goCount} pokémon GO · {pendingJson?.preview.homeCount} pokémon
                    HOME · {pendingJson?.preview.registeredAbilitiesCount} habilidades
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  Los marcados como capturados/registrados nunca se desmarcan; los datos nuevos se
                  añaden sin sobrescribir los actuales salvo IVs/stats.
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingJson(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing}>
              {importing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
