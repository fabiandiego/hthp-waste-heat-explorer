import { describe, it, expect } from "vitest";
import { CLAIMS, MATCH_TOLERANCE, relDev } from "../src/content/claims";

/**
 * One test per numeric claim in Zotter (2026). A claim marked "reproduced" (with or
 * without an assumption) must match the paper within its rounding; a claim marked
 * "not-reproducible" must NOT match, so a later fix to the model cannot silently
 * hide a discrepancy.
 */
describe("reproduction of every numeric claim in the paper", () => {
  it("has unique claim ids", () => {
    const ids = CLAIMS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const c of CLAIMS) {
    it(`${c.id} (${c.where}) is ${c.status}`, () => {
      const v = c.compute();
      expect(Number.isFinite(v)).toBe(true);
      if (c.status === "not-reproducible") expect(relDev(c)).toBeGreaterThan(MATCH_TOLERANCE);
      else expect(relDev(c)).toBeLessThanOrEqual(MATCH_TOLERANCE);
      if (c.status === "reproduced-with-assumption") expect(c.assumption).toBeTruthy();
    });
  }
});
