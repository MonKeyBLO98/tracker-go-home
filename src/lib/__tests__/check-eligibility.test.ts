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
});
