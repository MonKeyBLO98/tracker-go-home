"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateGoStats } from "@/app/go/actions";
import { Save, X } from "lucide-react";

export interface GoStatsValues {
  cp: number | null;
  level: number | null;
  attackIv: number | null;
  defenseIv: number | null;
  staminaIv: number | null;
}

interface GoStatsEditorProps {
  pokemonNationalDex: number;
  pokemonName: string;
  stats: GoStatsValues | null;
  open: boolean;
  userId?: number | null;
  onOpenChange: (open: boolean) => void;
  onSave: (stats: GoStatsValues) => void;
}

export function GoStatsEditor({
  pokemonNationalDex,
  pokemonName,
  stats,
  open,
  userId,
  onOpenChange,
  onSave,
}: GoStatsEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    cp: stats?.cp?.toString() || "",
    level: stats?.level?.toString() || "",
    attackIv: stats?.attackIv?.toString() || "",
    defenseIv: stats?.defenseIv?.toString() || "",
    staminaIv: stats?.staminaIv?.toString() || "",
  });

  const totalIv =
    (parseInt(formData.attackIv) || 0) +
    (parseInt(formData.defenseIv) || 0) +
    (parseInt(formData.staminaIv) || 0);

  const handleSave = () => {
    startTransition(async () => {
      const newStats = {
        cp: formData.cp ? parseInt(formData.cp) : null,
        level: formData.level ? parseFloat(formData.level) : null,
        attackIv: formData.attackIv ? parseInt(formData.attackIv) : null,
        defenseIv: formData.defenseIv ? parseInt(formData.defenseIv) : null,
        staminaIv: formData.staminaIv ? parseInt(formData.staminaIv) : null,
      };

      await updateGoStats(pokemonNationalDex, newStats, userId);
      onSave(newStats);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Stats - {pokemonName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">CP</label>
              <Input
                type="number"
                value={formData.cp}
                onChange={(e) => setFormData({ ...formData, cp: e.target.value })}
                placeholder="Ej: 3000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nivel</label>
              <Input
                type="number"
                step="0.5"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                placeholder="Ej: 40"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">IVs</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div>
                <label className="text-xs text-muted-foreground">Ataque</label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={formData.attackIv}
                  onChange={(e) => setFormData({ ...formData, attackIv: e.target.value })}
                  placeholder="0-15"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Defensa</label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={formData.defenseIv}
                  onChange={(e) => setFormData({ ...formData, defenseIv: e.target.value })}
                  placeholder="0-15"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Stamina</label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={formData.staminaIv}
                  onChange={(e) => setFormData({ ...formData, staminaIv: e.target.value })}
                  placeholder="0-15"
                />
              </div>
            </div>
            {totalIv > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Total: <span className="font-bold">{totalIv}/45</span>
                {totalIv === 45 && (
                  <span className="text-emerald-500 ml-2">¡Hundo!</span>
                )}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              <Save className="h-4 w-4 mr-1" />
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
