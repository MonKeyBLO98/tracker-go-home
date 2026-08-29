"use client";

import { cn } from "@/lib/utils";
import { POKEMON_TYPE_COLORS } from "@/lib/pokemon-types";

interface PokemonTypeBadgeProps {
  type: string;
  size?: "sm" | "md";
}

export function PokemonTypeBadge({ type, size = "sm" }: PokemonTypeBadgeProps) {
  const colors = POKEMON_TYPE_COLORS[type] || { bg: "bg-gray-400", text: "text-white", border: "border-gray-400" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold capitalize",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {type}
    </span>
  );
}
