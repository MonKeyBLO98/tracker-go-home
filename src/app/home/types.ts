export interface PokemonHomeRow {
  id: number;
  pokemonId: number;
  nationalDex: number;
  name: string;
  generation: number;
  spriteUrl: string | null;
  officialArtwork: string | null;
  types: { typeName: string; slot: number }[];
  isRegistered: boolean;
  entryId: number | null;
  languages: string[];
  abilities: string[];
  gameOrigins: string[];
  genderRate: number | null;
  isShiny: boolean;
  possibleAbilities: { abilityName: string; nameEs: string; isHidden: boolean }[];
  forms: HomeFormRow[];
}

export interface HomeFormRow {
  id: number;
  formId: number;
  formName: string;
  spriteUrl: string | null;
  isMega: boolean;
  isGmax: boolean;
  isShadow: boolean;
  isCostume: boolean;
  isRegional: boolean;
  isRegistered: boolean;
  isShiny: boolean;
  abilities: string[];
  possibleAbilities: { abilityName: string; nameEs: string; isHidden: boolean }[];
  types: { typeName: string; slot: number }[];
}

export interface PaginatedHomeEntries {
  entries: PokemonHomeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface HomeGameProgress {
  gameKey: string;
  gameName: string;
  totalSpecies: number;
  registered: number;
  originGame: string;
  generationRegion: string;
}

export interface HomeStatsSummary {
  totalPokemon: number;
  registered: number;
  fullLanguages: number;
  abilitiesTotal: number;
  shiny: number;
}

export const HOME_LANGUAGES = [
  { code: "ENG", short: "ENG", label: "English" },
  { code: "ESN", short: "ES-ES", label: "Español (ES)" },
  { code: "ESA", short: "ES-LA", label: "Español (LA)" },
  { code: "FRA", short: "FRA", label: "Français" },
  { code: "DEU", short: "DEU", label: "Deutsch" },
  { code: "ITA", short: "ITA", label: "Italiano" },
  { code: "JPN", short: "JPN", label: "日本語" },
  { code: "KOR", short: "KOR", label: "한국어" },
  { code: "CHS", short: "CHS", label: "中文(简体)" },
  { code: "CHT", short: "CHT", label: "中文(繁體)" },
];
