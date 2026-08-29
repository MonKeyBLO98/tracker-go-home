export interface PvpRankingRow {
  id: number;
  pokemonId: number;
  league: string;
  rank: number;
  speciesId: string;
  pokemonName: string;
  rating: number;
  score: number;
  scoreLeads: number | null;
  scoreClosers: number | null;
  scoreSwitches: number | null;
  scoreChargers: number | null;
  scoreAttackers: number | null;
  scoreConsistency: number | null;
  moveset: string;
  fastMove: string;
  chargedMove1: string;
  chargedMove2: string | null;
  editorScore: number | null;
  editorNotes: string | null;
  atk: number | null;
  def_: number | null;
  hp: number | null;
  product: number | null;
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
