export const MOVE_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic",
  "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

export type MoveType = (typeof MOVE_TYPES)[number];

export const MOVE_TYPE_COLORS: Record<MoveType, string> = {
  normal: "bg-gray-400 text-white",
  fire: "bg-orange-500 text-white",
  water: "bg-blue-500 text-white",
  electric: "bg-yellow-400 text-gray-900",
  grass: "bg-green-500 text-white",
  ice: "bg-cyan-300 text-gray-900",
  fighting: "bg-red-600 text-white",
  poison: "bg-purple-500 text-white",
  ground: "bg-amber-600 text-white",
  flying: "bg-indigo-400 text-white",
  psychic: "bg-pink-500 text-white",
  bug: "bg-lime-500 text-white",
  rock: "bg-yellow-700 text-white",
  ghost: "bg-indigo-700 text-white",
  dragon: "bg-indigo-600 text-white",
  dark: "bg-gray-700 text-white",
  steel: "bg-slate-400 text-white",
  fairy: "bg-pink-300 text-gray-900",
};

export interface MoveRow {
  id: number;
  moveId: string;
  name: string;
  type: string;
  category: string;
  power: number;
  energy: number;
  energyGain: number;
  cooldown: number;
  turns: number;
  archetype: string | null;
  dps: number | null;
  dpe: number | null;
}
