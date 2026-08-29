export interface TeamPokemon {
  id: number;
  name: string;
  nationalDex: number;
  types: string[];
  spriteUrl: string | null;
}

export interface TeamAnalysis {
  attackCoverage: string[];
  typeWeaknesses: { type: string; count: number }[];
  typeResistances: { type: string; count: number }[];
  dualTypeCoverage: { type: string; weakTo: string[] }[];
  score: number;
  summary: string;
}
