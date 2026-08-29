export interface BackupChecks {
  shiny: boolean;
  shinyOverride?: boolean;
  lucky: boolean;
  hundo: boolean;
  xxl: boolean;
  xxs: boolean;
  gmax: boolean;
  megaX: boolean;
  megaY: boolean;
  shadow: boolean;
  purified: boolean;
  hasCostume: boolean;
}

export interface BackupStats {
  cp: number | null;
  level: number | null;
  attackIv: number | null;
  defenseIv: number | null;
  staminaIv: number | null;
}

export interface BackupGoEntry {
  nationalDex: number;
  isCaptured: boolean;
  capturedAt: string | null;
  gender?: "male" | "female" | "both" | "genderless" | null;
  checks: BackupChecks | null;
  stats: BackupStats | null;
  costumes: string[];
  regionalForms?: { formName: string; pokemonName: string; isCaptured: boolean; isShiny: boolean }[];
}

export interface BackupHomeEntry {
  nationalDex: number;
  isRegistered: boolean;
  languages: string[];
  abilities: string[];
  gameOrigins: string[];
}

export interface BackupFile {
  app: "tracker-go-home";
  version: 1;
  exportedAt: string;
  profileName: string;
  go: BackupGoEntry[];
  home: BackupHomeEntry[];
  registeredAbilities: string[];
}

export interface BackupLogRow {
  id: number;
  filename: string;
  action: string;
  createdAt: string;
  profileName: string;
}

export interface BackupPreview {
  version: number;
  exportedAt: string | null;
  profileName: string | null;
  goCount: number;
  homeCount: number;
  registeredAbilitiesCount: number;
}

export interface ImportResult {
  goProcessed: number;
  homeProcessed: number;
  skipped: number;
}
