import { describe, it, expect } from "vitest";
import { resolveCheckEligibility } from "../check-eligibility";

describe("resolveCheckEligibility", () => {
  it("permite shiny/hundo/XXS/XXL para cualquier especie", () => {
    const e = resolveCheckEligibility({
      isMythical: false,
      hasMega: false,
      hasGmax: false,
      hasShadow: false,
    });
    expect(e.isShiny).toBe(true);
    expect(e.isHundo).toBe(true);
    expect(e.isXXL).toBe(true);
    expect(e.isXXS).toBe(true);
  });

  it("excluye Lucky para míticos (no son intercambiables)", () => {
    const mythical = resolveCheckEligibility({ isMythical: true });
    expect(mythical.isLucky).toBe(false);

    const normal = resolveCheckEligibility({ isMythical: false });
    expect(normal.isLucky).toBe(true);
  });

  it("requiere forma Mega/Gmax registrada", () => {
    const none = resolveCheckEligibility({});
    expect(none.isMega).toBe(false);
    expect(none.isGmax).toBe(false);

    const withMega = resolveCheckEligibility({ hasMega: true, hasShadow: false });
    expect(withMega.isMega).toBe(true);

    const withGmax = resolveCheckEligibility({ hasGmax: true });
    expect(withGmax.isGmax).toBe(true);
  });

  it("habilita Shadow y Purified juntos según la forma shadow", () => {
    const without = resolveCheckEligibility({});
    expect(without.isShadow).toBe(false);
    expect(without.isPurified).toBe(false);

    const withShadow = resolveCheckEligibility({ hasShadow: true });
    expect(withShadow.isShadow).toBe(true);
    expect(withShadow.isPurified).toBe(true);
  });

  it("excluye shiny/hundo/XXS/XXL para míticos sin shiny, pero no Lucky", () => {
    const mythical = resolveCheckEligibility({ isMythical: true, nationalDex: 494 }); // Victini
    expect(mythical.isShiny).toBe(false);
    expect(mythical.isHundo).toBe(false);
    expect(mythical.isXXS).toBe(false);
    expect(mythical.isXXL).toBe(false);
    expect(mythical.isLucky).toBe(false);
  });

  it("solo permite shiny (no hundo/XXS/XXL/mega) para míticos con shiny en GO (ej. Darkrai)", () => {
    const darkrai = resolveCheckEligibility({ isMythical: true, nationalDex: 491 });
    expect(darkrai.isShiny).toBe(true);
    // Los míticos con shiny en GO solo pueden ser shiny; sus IVs y formas no varían
    expect(darkrai.isHundo).toBe(false);
    expect(darkrai.isXXS).toBe(false);
    expect(darkrai.isXXL).toBe(false);
    expect(darkrai.isMega).toBe(false);
    expect(darkrai.isGmax).toBe(false);
    expect(darkrai.isShadow).toBe(false);
    expect(darkrai.isLucky).toBe(false);
  });
});
