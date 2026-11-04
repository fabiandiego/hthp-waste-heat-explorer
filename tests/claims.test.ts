import { describe, it, expect } from "vitest";
import { CLAIMS, STATEMENTS, MATCH_TOLERANCE, caseOf, paperClaimFor, relDev } from "../src/content/claims";
import { referenceCops } from "../src/thermo/cop";

describe("claim metadata", () => {
  it("every claim can be loaded as a case", () => {
    for (const c of CLAIMS) expect(caseOf(c)).toBeTruthy();
  });

  it("a claim's computed value comes from the case it loads", () => {
    for (const c of CLAIMS) {
      if (!c.copKey) continue;
      expect(referenceCops(caseOf(c))[c.copKey].value).toBeCloseTo(c.compute(), 10);
    }
  });

  it("a likely cause, when given, reproduces the printed value within rounding", () => {
    const withCause = CLAIMS.filter((c) => c.likelyCause);
    expect(withCause.length).toBeGreaterThanOrEqual(5);
    for (const c of withCause) {
      const v = c.likelyCause!.compute();
      expect(Math.abs(v - c.paper) / c.paper).toBeLessThanOrEqual(MATCH_TOLERANCE);
    }
  });

  it("chips show the value printed in the figure, not a conflicting text value", () => {
    expect(paperClaimFor("fig3", "lorenz")?.paper).toBe(4.9);
    expect(paperClaimFor("fig4", "lorenz")?.paper).toBe(7.3);
    expect(paperClaimFor("fig4", "carnot")?.paper).toBe(4.7);
    expect(paperClaimFor("fig5", "lorenz")?.paper).toBe(4.3);
    expect(paperClaimFor("fig6", "azl")?.paper).toBe(5.6);
    expect(paperClaimFor("fig6", "cz")?.paper).toBe(4.4);
    expect(paperClaimFor("fig7", "lorenz")?.paper).toBe(7.3);
    expect(paperClaimFor("fig7", "lz")?.paper).toBe(4.7);
    expect(paperClaimFor("fig5", "lz")).toBeUndefined();
  });

  it("the three-times-more-heat claim does not depend on ambient", () => {
    const c = CLAIMS.find((x) => x.id === "Q-90-0-vs-60")!;
    expect(c.status).toBe("reproduced");
    expect(relDev(c)).toBe(0);
  });
});

describe("qualitative statements in the paper", () => {
  for (const s of STATEMENTS) {
    it(`${s.id}: ${s.verdict}`, () => {
      expect(s.check()).toBe(true);
    });
  }
});
