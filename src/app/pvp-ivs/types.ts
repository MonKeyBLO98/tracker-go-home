export interface PvpIvRow {
  id: number;
  pokemonId: number;
  league: string;
  rank: number;
  speciesId: string;
  pokemonName: string;
  level: number;
  attackIv: number;
  defenseIv: number;
  staminaIv: number;
  attack: number;
  defense: number;
  hp: number;
  cp: number;
  statProduct: number;
  percentBest: number;
  spriteUrl: string | null;
}

export const LEAGUES = [
  { id: "great", name: "Great League", cp: 1500 },
  { id: "ultra", name: "Ultra League", cp: 2500 },
  { id: "master", name: "Master League", cp: 10000 },
] as const;

export const LEAGUE_COLORS: Record<string, { bg: string; text: string }> = {
  great: { bg: "bg-emerald-500", text: "text-white" },
  ultra: { bg: "bg-purple-500", text: "text-white" },
  master: { bg: "bg-amber-500", text: "text-white" },
};
