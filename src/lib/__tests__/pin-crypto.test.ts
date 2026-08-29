import { describe, it, expect } from "vitest";
import {
  hashPin,
  verifyPin,
  isValidPinFormat,
  DEFAULT_PIN,
} from "../pin-crypto";

describe("pin-crypto", () => {
  it("acepta el PIN por defecto cuando no hay PIN guardado", () => {
    expect(verifyPin(null, DEFAULT_PIN)).toBe(true);
    expect(verifyPin(undefined, DEFAULT_PIN)).toBe(true);
  });

  it("rechaza otro PIN cuando no hay PIN guardado", () => {
    expect(verifyPin(null, "1234")).toBe(false);
  });

  it("hash + verify de un PIN personalizado funciona", () => {
    const stored = hashPin("1234");
    expect(stored).not.toContain("1234");
    expect(stored.split(":")).toHaveLength(2);
    expect(verifyPin(stored, "1234")).toBe(true);
  });

  it("rechaza un PIN personalizado incorrecto", () => {
    const stored = hashPin("4321");
    expect(verifyPin(stored, "4322")).toBe(false);
  });

  it("produce salts distintos para el mismo PIN (hash único)", () => {
    const a = hashPin("0000");
    const b = hashPin("0000");
    expect(a).not.toBe(b);
    expect(verifyPin(a, "0000")).toBe(true);
    expect(verifyPin(b, "0000")).toBe(true);
  });

  it("rechaza un stored mal formado", () => {
    expect(verifyPin("solo-hash", "0000")).toBe(false);
    expect(verifyPin(":", "0000")).toBe(false);
  });

  it("valida el formato de PIN (4-6 dígitos)", () => {
    expect(isValidPinFormat("0000")).toBe(true);
    expect(isValidPinFormat("123456")).toBe(true);
    expect(isValidPinFormat("123")).toBe(false);
    expect(isValidPinFormat("12ab")).toBe(false);
    expect(isValidPinFormat("1234567")).toBe(false);
    expect(isValidPinFormat("")).toBe(false);
  });
});
