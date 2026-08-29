export interface AbilityRow {
  abilityName: string;
  nameEs: string;
  speciesCount: number;
  hasHidden: boolean;
  isRegistered: boolean;
}

export function formatAbilityName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
