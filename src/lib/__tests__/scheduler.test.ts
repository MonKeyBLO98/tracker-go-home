import { describe, it, expect } from "vitest";
import { shouldRunDue } from "../scheduler";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

describe("shouldRunDue", () => {
  const now = Date.parse("2026-08-23T03:00:00.000Z");

  it("devuelve true si nunca se ha ejecutado", () => {
    expect(shouldRunDue(null, DAY, now)).toBe(true);
    expect(shouldRunDue(undefined, DAY, now)).toBe(true);
    expect(shouldRunDue("", DAY, now)).toBe(true);
  });

  it("devuelve true si el lastRun no es una fecha válida", () => {
    expect(shouldRunDue("not-a-date", DAY, now)).toBe(true);
  });

  it("devuelve false si la última ejecución es más reciente que minAge", () => {
    const recent = new Date(now - 2 * HOUR).toISOString();
    expect(shouldRunDue(recent, DAY, now)).toBe(false);
  });

  it("devuelve true si ha pasado el intervalo diario (>= 24h)", () => {
    const yesterday = new Date(now - DAY).toISOString();
    expect(shouldRunDue(yesterday, DAY, now)).toBe(true);
  });

  it("devuelve true justo en el límite exacto del intervalo", () => {
    const exact = new Date(now - DAY).toISOString();
    expect(shouldRunDue(exact, DAY, now)).toBe(true);
  });

  it("respeta el intervalo semanal (7 días)", () => {
    const threeDaysAgo = new Date(now - 3 * DAY).toISOString();
    expect(shouldRunDue(threeDaysAgo, 7 * DAY, now)).toBe(false);
    const eightDaysAgo = new Date(now - 8 * DAY).toISOString();
    expect(shouldRunDue(eightDaysAgo, 7 * DAY, now)).toBe(true);
  });
});
