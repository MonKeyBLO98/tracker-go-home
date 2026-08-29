export const POKEMON_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  normal: { bg: "bg-gray-400", text: "text-white", border: "border-gray-400" },
  fire: { bg: "bg-orange-500", text: "text-white", border: "border-orange-500" },
  water: { bg: "bg-blue-500", text: "text-white", border: "border-blue-500" },
  electric: { bg: "bg-yellow-400", text: "text-black", border: "border-yellow-400" },
  grass: { bg: "bg-green-500", text: "text-white", border: "border-green-500" },
  ice: { bg: "bg-cyan-300", text: "text-black", border: "border-cyan-300" },
  fighting: { bg: "bg-red-700", text: "text-white", border: "border-red-700" },
  poison: { bg: "bg-purple-500", text: "text-white", border: "border-purple-500" },
  ground: { bg: "bg-yellow-600", text: "text-white", border: "border-yellow-600" },
  flying: { bg: "bg-indigo-400", text: "text-white", border: "border-indigo-400" },
  psychic: { bg: "bg-pink-500", text: "text-white", border: "border-pink-500" },
  bug: { bg: "bg-lime-500", text: "text-white", border: "border-lime-500" },
  rock: { bg: "bg-yellow-700", text: "text-white", border: "border-yellow-700" },
  ghost: { bg: "bg-purple-700", text: "text-white", border: "border-purple-700" },
  dragon: { bg: "bg-indigo-600", text: "text-white", border: "border-indigo-600" },
  dark: { bg: "bg-gray-700", text: "text-white", border: "border-gray-700" },
  steel: { bg: "bg-gray-400", text: "text-white", border: "border-gray-400" },
  fairy: { bg: "bg-pink-300", text: "text-black", border: "border-pink-300" },
};

export const GENERATION_NAMES: Record<number, string> = {
  1: "Kanto",
  2: "Johto",
  3: "Hoenn",
  4: "Sinnoh",
  5: "Unova",
  6: "Kalos",
  7: "Alola",
  8: "Galar",
  9: "Paldea",
};

export const ALL_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

export function formatPokemonName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

export function formatDexNumber(id: number): string {
  return `#${id.toString().padStart(3, "0")}`;
}
