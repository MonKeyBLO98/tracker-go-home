export interface CheckEligibilityInput {
  nationalDex?: number | null;
  isMythical?: boolean | null;
  hasMega?: boolean | null;
  hasGmax?: boolean | null;
  hasShadow?: boolean | null;
}

// Míticos cuyo Shiny SÍ está disponible en Pokémon GO.
// Por defecto los míticos no tienen shiny (se obtienen solo por Investigación Especial),
// pero algunos se consiguen vía incursiones/Masterwork y sí tienen shiny.
const MYTHICALS_WITH_SHINY = new Set<number>([
  151, // Mew
  251, // Celebi
  385, // Jirachi
  386, // Deoxys
  491, // Darkrai
  492, // Shaymin
  647, // Keldeo
  648, // Meloetta
  649, // Genesect
  719, // Diancie
  807, // Zeraora
  808, // Meltan
  809, // Melmetal
]);

// Qué registros son posibles para cada especie según datos del juego:
// - Míticos: sin checks extra (solo registro básico + HOME), salvo
//   los que sí tienen Shiny disponible (MYTHICALS_WITH_SHINY).
// - Lucky: los míticos no se pueden intercambiar → nunca lucky.
// - Mega/Gmax/Shadow: solo especies con esa forma registrada.
// - Purified: cualquier Shadow puede purificarse.
// - Shiny/Hundo/XXS/XXL: posibles para todas las especies capturables no míticas.
export function resolveCheckEligibility(
  input: CheckEligibilityInput
): Record<string, boolean> {
  if (input.isMythical) {
    const hasShiny = input.nationalDex !== null && input.nationalDex !== undefined
      ? MYTHICALS_WITH_SHINY.has(input.nationalDex)
      : false;
    return {
      isShiny: hasShiny,
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
