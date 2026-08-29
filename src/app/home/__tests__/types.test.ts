import { describe, it, expect } from "vitest";
import { HOME_LANGUAGES } from "../types";

describe("HOME_LANGUAGES", () => {
  it("contains 10 languages", () => {
    expect(HOME_LANGUAGES).toHaveLength(10);
  });

  it("each language has code, short and label", () => {
    for (const lang of HOME_LANGUAGES) {
      expect(lang.code).toBeTruthy();
      expect(lang.short).toBeTruthy();
      expect(lang.label).toBeTruthy();
      expect(typeof lang.code).toBe("string");
      expect(typeof lang.short).toBe("string");
      expect(typeof lang.label).toBe("string");
    }
  });

  it("includes expected languages", () => {
    const codes = HOME_LANGUAGES.map((l) => l.code);
    expect(codes).toContain("ENG");
    expect(codes).toContain("JPN");
    expect(codes).toContain("FRA");
    expect(codes).toContain("ESN");
    expect(codes).toContain("KOR");
    expect(codes).toContain("CHS");
  });

  it("does not include JPN_KANA", () => {
    const codes = HOME_LANGUAGES.map((l) => l.code);
    expect(codes).not.toContain("JPN_KANA");
  });

  it("orders the two columns as specified", () => {
    const codes = HOME_LANGUAGES.map((l) => l.code);
    // Columna izquierda (filas 1-5) y columna derecha (filas 6-10)
    expect(codes.slice(0, 5)).toEqual(["ENG", "ESN", "ESA", "FRA", "DEU"]);
    expect(codes.slice(5)).toEqual(["ITA", "JPN", "KOR", "CHS", "CHT"]);
  });

  it("has unique codes", () => {
    const codes = HOME_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
