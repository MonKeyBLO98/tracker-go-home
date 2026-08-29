export interface MiniDexGame {
  gameKey: string;
  gameName: string;
  totalSpecies: number;
  icons: MinidexIconParts;
}

export interface MinidexIconParts {
  left: string;
  right: string | null;
}

export interface MiniDexEntry {
  pokemonId: number;
  nationalDex: number;
  name: string;
  dexNumber: number;
  formName: string;
  spriteUrl: string | null;
  registered: boolean;
}

export type GameDexMap = Record<string, number[]>;

// Parejas de juegos comparten columna fusionada (mitad de cada icono):
// Paldea = Escarlata+Púrpura, Galar = Espada+Escudo,
// Sinnoh = Diamante+Perla, Kanto = LG Pikachu+Eevee.
export const MINIDEX_GAME_ICONS: Record<string, MinidexIconParts> = {
  luminalia: { left: "/home-icons/legends-za.png", right: null },
  dimensional: { left: "/home-icons/legends-za.png", right: null },
  megadex: { left: "/home-icons/legends-za.png", right: null },
  paldea: { left: "/home-icons/scarlet.png", right: "/home-icons/violet.png" },
  noroteo: { left: "/home-icons/scarlet.png", right: null },
  arandano: { left: "/home-icons/violet.png", right: null },
  hisui: { left: "/home-icons/legends-arceus.png", right: null },
  sinnoh: { left: "/home-icons/brilliant-diamond.png", right: "/home-icons/shining-pearl.png" },
  galar: { left: "/home-icons/sword.png", right: "/home-icons/shield.png" },
  armadura: { left: "/home-icons/sword.png", right: null },
  corona: { left: "/home-icons/shield.png", right: null },
  kanto: { left: "/home-icons/lets-go-pikachu.png", right: "/home-icons/lets-go-eevee.png" },
  go: { left: "/home-icons/go.png", right: null },
};

export const MINIDEX_GAME_SIGLAS: Record<string, string> = {
  luminalia: "LUM",
  dimensional: "DIM",
  megadex: "MEGA",
  paldea: "PAL",
  noroteo: "NOR",
  arandano: "ARA",
  hisui: "HIS",
  sinnoh: "SIN",
  galar: "GAL",
  armadura: "ARM",
  corona: "COR",
  kanto: "KAN",
  go: "GO",
};

const EMPTY_PARTS: MinidexIconParts = { left: "", right: null };

export function minidexIconParts(gameKey: string): MinidexIconParts {
  return MINIDEX_GAME_ICONS[gameKey] ?? EMPTY_PARTS;
}
