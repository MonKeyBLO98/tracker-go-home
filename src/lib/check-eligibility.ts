export interface CheckEligibilityInput {
  isMythical?: boolean | null;
  hasMega?: boolean | null;
  hasGmax?: boolean | null;
  hasShadow?: boolean | null;
}

// Qué registros son posibles para cada especie según datos del juego:
// - Míticos: sin checks extra (solo registro básico + HOME).
// - Lucky: los míticos no se pueden intercambiar → nunca lucky.
// - Mega/Gmax/Shadow: solo especies con esa forma registrada.
// - Purified: cualquier Shadow puede purificarse.
// - Shiny/Hundo/XXS/XXL: posibles para todas las especies capturables no míticas.
export function resolveCheckEligibility(
  input: CheckEligibilityInput
): Record<string, boolean> {
  if (input.isMythical) {
    return {
      isShiny: false,
      isHundo: false,
      isXXL: false,
      isXXS: false,
      isLucky: false,
      isMega: false,
      isGmax: false,
      isShadow: false,
      isPurified: false,
    };
  }
  return {
    isShiny: true,
    isHundo: true,
    isXXL: true,
    isXXS: true,
    isLucky: true,
    isMega: input.hasMega === true,
    isGmax: input.hasGmax === true,
    isShadow: input.hasShadow === true,
    isPurified: input.hasShadow === true,
  };
}
