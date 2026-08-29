"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PokemonTypeBadge } from "@/components/pokemon-type-badge";
import {
  formatDexNumber,
  formatPokemonName,
  GENERATION_NAMES,
} from "@/lib/pokemon-types";
import type { PokemonWithTypes } from "@/app/pokedex/actions";

interface PokemonDetailProps {
  pokemon: PokemonWithTypes & {
    abilities?: { abilityName: string; isHidden: boolean }[];
    forms?: {
      formName: string;
      spriteUrl: string | null;
      isMega: boolean;
      isShadow: boolean;
      isGmax: boolean;
      isCostume: boolean;
    }[];
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PokemonDetail({ pokemon, open, onOpenChange }: PokemonDetailProps) {
  if (!pokemon) return null;

  const heightM = pokemon.height;
  const weightKg = pokemon.weight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono">
              {formatDexNumber(pokemon.nationalDex)}
            </span>
            {formatPokemonName(pokemon.name)}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Sprite */}
            <div className="flex justify-center">
              {pokemon.officialArtwork ? (
                <Image
                  src={pokemon.officialArtwork}
                  alt={pokemon.name}
                  width={192}
                  height={192}
                  unoptimized
                  className="w-48 h-48 object-contain"
                />
              ) : pokemon.spriteUrl ? (
                <Image
                  src={pokemon.spriteUrl}
                  alt={pokemon.name}
                  width={144}
                  height={144}
                  unoptimized
                  className="w-36 h-36 object-contain"
                />
              ) : (
                <div className="w-48 h-48 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-6xl">?</span>
                </div>
              )}
            </div>

            {/* Types */}
            <div className="flex justify-center gap-2">
              {pokemon.types
                .sort((a, b) => a.slot - b.slot)
                .map((t) => (
                  <PokemonTypeBadge key={t.typeName} type={t.typeName} size="md" />
                ))}
            </div>

            {/* Tags */}
            <div className="flex justify-center gap-2">
              {pokemon.isLegendary && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                  Legendario
                </Badge>
              )}
              {pokemon.isMythical && (
                <Badge variant="outline" className="border-purple-500 text-purple-500">
                  Mítico
                </Badge>
              )}
              <Badge variant="secondary">
                Gen {pokemon.generation} - {GENERATION_NAMES[pokemon.generation] || "?"}
              </Badge>
            </div>

            <Separator />

            {/* Physical Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Altura</p>
                <p className="text-lg font-bold">{heightM} m</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Peso</p>
                <p className="text-lg font-bold">{weightKg} kg</p>
              </div>
            </div>

            {/* Abilities */}
            {pokemon.abilities && pokemon.abilities.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Habilidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {pokemon.abilities.map((a) => (
                      <Badge
                        key={a.abilityName}
                        variant={a.isHidden ? "outline" : "secondary"}
                        className="capitalize"
                      >
                        {a.abilityName.replace(/-/g, " ")}
                        {a.isHidden && " (OCULTA)"}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Forms */}
            {pokemon.forms && pokemon.forms.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Formas Alternativas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {pokemon.forms.map((f) => (
                      <div key={f.formName} className="flex items-center gap-2 p-2 bg-muted rounded">
                        {f.spriteUrl && (
                          <Image
                            src={f.spriteUrl}
                            alt={f.formName}
                            width={40}
                            height={40}
                            unoptimized
                            className="w-10 h-10"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {f.formName.replace(/-/g, " ")}
                          </p>
                          <div className="flex gap-1">
                            {f.isMega && <Badge variant="outline" className="text-[10px]">Mega</Badge>}
                            {f.isShadow && <Badge variant="outline" className="text-[10px]">Shadow</Badge>}
                            {f.isGmax && <Badge variant="outline" className="text-[10px]">Gmax</Badge>}
                            {f.isCostume && <Badge variant="outline" className="text-[10px]">Costume</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
