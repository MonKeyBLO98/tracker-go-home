"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { PokemonTypeBadge } from "@/components/pokemon-type-badge";
import { formatDexNumber, formatPokemonName } from "@/lib/pokemon-types";
import type { PokemonWithTypes } from "@/app/pokedex/actions";

interface PokemonCardProps {
  pokemon: PokemonWithTypes;
  onClick: () => void;
}

export function PokemonCard({ pokemon, onClick }: PokemonCardProps) {
  return (
    <Card
      className="group cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:border-primary/50"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            {formatDexNumber(pokemon.nationalDex)}
          </span>
          {pokemon.isLegendary && (
            <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
              LEG
            </span>
          )}
          {pokemon.isMythical && (
            <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">
              MYTH
            </span>
          )}
        </div>

        <div className="flex justify-center my-3">
          {pokemon.officialArtwork ? (
            <Image
              src={pokemon.officialArtwork}
              alt={pokemon.name}
              width={96}
              height={96}
              unoptimized
              className="w-24 h-24 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
            />
          ) : pokemon.spriteUrl ? (
            <Image
              src={pokemon.spriteUrl}
              alt={pokemon.name}
              width={80}
              height={80}
              unoptimized
              className="w-20 h-20 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
            />
          ) : (
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
              <span className="text-4xl">?</span>
            </div>
          )}
        </div>

        <h3 className="text-sm font-semibold text-center truncate">
          {formatPokemonName(pokemon.name)}
        </h3>

        <div className="flex justify-center gap-1 mt-2">
          {pokemon.types
            .sort((a, b) => a.slot - b.slot)
            .map((t) => (
              <PokemonTypeBadge key={t.typeName} type={t.typeName} />
            ))}
        </div>
      </div>
    </Card>
  );
}
