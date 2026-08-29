"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, X } from "lucide-react";
import { ALL_TYPES, GENERATION_NAMES } from "@/lib/pokemon-types";

interface PokemonFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  generation: number | null;
  onGenerationChange: (value: number | null) => void;
  type: string | null;
  onTypeChange: (value: string | null) => void;
}

export function PokemonFilters({
  search,
  onSearchChange,
  generation,
  onGenerationChange,
  type,
  onTypeChange,
}: PokemonFiltersProps) {
  const hasFilters = generation !== null || type !== null;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o #..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Generation Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
          <Filter className="h-4 w-4" />
          {generation ? `Gen ${generation}` : "Generación"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onGenerationChange(null)}>
            Todas
          </DropdownMenuItem>
          {Object.entries(GENERATION_NAMES).map(([gen, name]) => (
            <DropdownMenuCheckboxItem
              key={gen}
              checked={generation === Number(gen)}
              onCheckedChange={() =>
                onGenerationChange(generation === Number(gen) ? null : Number(gen))
              }
            >
              Gen {gen} - {name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
          <Filter className="h-4 w-4" />
          {type ? type.charAt(0).toUpperCase() + type.slice(1) : "Tipo"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
          <DropdownMenuItem onClick={() => onTypeChange(null)}>
            Todos
          </DropdownMenuItem>
          {ALL_TYPES.map((t) => (
            <DropdownMenuCheckboxItem
              key={t}
              checked={type === t}
              onCheckedChange={() => onTypeChange(type === t ? null : t)}
              className="capitalize"
            >
              {t}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            onGenerationChange(null);
            onTypeChange(null);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
