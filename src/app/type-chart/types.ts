export const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic",
  "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export const TYPE_COLORS: Record<PokemonType, { bg: string; text: string; hex: string }> = {
  normal:   { bg: "bg-gray-400",      text: "text-white",          hex: "#A8A878" },
  fire:     { bg: "bg-orange-500",    text: "text-white",          hex: "#F08030" },
  water:    { bg: "bg-blue-500",      text: "text-white",          hex: "#6890F0" },
  electric: { bg: "bg-yellow-400",    text: "text-gray-900",       hex: "#F8D030" },
  grass:    { bg: "bg-green-500",     text: "text-white",          hex: "#78C850" },
  ice:      { bg: "bg-cyan-300",      text: "text-gray-900",       hex: "#98D8D8" },
  fighting: { bg: "bg-red-600",       text: "text-white",          hex: "#C03028" },
  poison:   { bg: "bg-purple-500",    text: "text-white",          hex: "#A040A0" },
  ground:   { bg: "bg-amber-600",     text: "text-white",          hex: "#E0C068" },
  flying:   { bg: "bg-indigo-400",    text: "text-white",          hex: "#A890F0" },
  psychic:  { bg: "bg-pink-500",      text: "text-white",          hex: "#F85888" },
  bug:      { bg: "bg-lime-500",      text: "text-white",          hex: "#A8B820" },
  rock:     { bg: "bg-yellow-700",    text: "text-white",          hex: "#B8A038" },
  ghost:    { bg: "bg-indigo-700",    text: "text-white",          hex: "#705898" },
  dragon:   { bg: "bg-indigo-600",    text: "text-white",          hex: "#7038F8" },
  dark:     { bg: "bg-gray-700",      text: "text-white",          hex: "#705848" },
  steel:    { bg: "bg-slate-400",     text: "text-white",          hex: "#B8B8D0" },
  fairy:    { bg: "bg-pink-300",      text: "text-gray-900",       hex: "#EE99AC" },
};

// Effectiveness: chart[attacking][defending] = multiplier
// 0 = immune, 0.5 = not effective, 1 = normal, 2 = super effective
export const CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export function getEffectiveness(
  attackType: PokemonType,
  defenseType: PokemonType
): number {
  return CHART[attackType]?.[defenseType] ?? 1;
}

export function getEffectivenessLabel(mult: number): string {
  if (mult === 0) return "Inmune";
  if (mult === 0.5) return "No muy eficaz";
  if (mult === 1) return "Normal";
  if (mult === 2) return "Súper eficaz";
  return `${mult}x`;
}

export function getEffectivenessColor(mult: number): string {
  if (mult === 0) return "text-gray-500 bg-gray-500/10";
  if (mult === 0.5) return "text-red-400 bg-red-500/10";
  if (mult === 1) return "text-muted-foreground";
  if (mult === 2) return "text-green-400 bg-green-500/10 font-bold";
  return "text-green-500";
}
