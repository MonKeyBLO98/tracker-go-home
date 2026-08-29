export const LEAGUES = [
  { id: "great", name: "Great League", cp: 1500 },
  { id: "ultra", name: "Ultra League", cp: 2500 },
  { id: "master", name: "Master League", cp: 10000 },
] as const;

export type LeagueId = (typeof LEAGUES)[number]["id"];

export const LEAGUE_COLORS: Record<string, { bg: string; text: string }> = {
  great: { bg: "bg-green-500/10", text: "text-green-500" },
  ultra: { bg: "bg-purple-500/10", text: "text-purple-500" },
  master: { bg: "bg-amber-500/10", text: "text-amber-500" },
};
