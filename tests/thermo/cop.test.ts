import { describe, it, expect } from "vitest";
import { toK, logMeanT } from "../../src/thermo/temps";
import { copCarnot, copLorenz, copAZL, copCZ, copLZ, referenceCops } from "../../src/thermo/cop";
import { DEFAULTS } from "../../src/state/scenario";

const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe("temperatures", () => {
  it("converts Celsius to Kelvin with 273.15", () => {
    expect(toK(0)).toBe(273.15);
    expect(toK(150)).toBe(423.15);
  });

  it("computes entropic (logarithmic) mean temperatures used in the paper", () => {
    near(logMeanT(150, 110), 402.82);
    near(logMeanT(90, 60), 347.93);
    near(logMeanT(90, 20), 326.90);
  });

  it("returns the limit T_in for zero glide instead of NaN", () => {
    expect(logMeanT(90, 90)).toBe(363.15);
    expect(Number.isFinite(logMeanT(90, 90 + 1e-12))).toBe(true);
  });
});

describe("reference COP kernels", () => {
  it("Carnot", () => {
    near(copCarnot(423.15, 363.15).value, 7.05);
    near(copCarnot(423.15, 333.15).value, 4.70);
  });
  it("Lorenz", () => near(copLorenz(402.82, 347.93).value, 7.34));
  it("AZL", () => near(copAZL(423.15, 347.93).value, 5.63));
  it("CZ", () => {
    near(copCZ(423.15, 326.90).value, 4.40);
    near(copCZ(423.15, logMeanT(90, 0)).value, 3.95);
  });
  it("LZ", () => near(copLZ(402.82, 326.90).value, 5.31));

  it("Lorenz collapses to Carnot for isothermal source and sink", () => {
    const lor = copLorenz(logMeanT(150, 150), logMeanT(90, 90)).value;
    expect(lor).toBeCloseTo(copCarnot(423.15, 363.15).value, 10);
  });

  it("flags a source that is not colder than the sink", () => {
    const r = copCarnot(300, 310);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("no-lift");
    expect(copCarnot(300, 300).valid).toBe(false);
  });
});

describe("referenceCops(scenario)", () => {
  it("default case (sensible 90->60 C, latent 150 C, ambient 20 C) matches Figs. 5 and 6", () => {
    const c = referenceCops(DEFAULTS);
    near(c.carnot.value, 4.70);
    near(c.lorenz.value, 5.63); // Lorenz with an isothermal sink equals AZL
    near(c.azl.value, 5.63);
    near(c.cz.value, 4.40);
    expect(c.lz.valid).toBe(false);
    expect(c.lz.reason).toBe("not-applicable");
  });

  it("sensible sink 110->150 C matches Fig. 4 and Eq. 18", () => {
    const c = referenceCops({ ...DEFAULTS, sinkType: "sensible", tSinkIn: 110, tSinkOut: 150 });
    near(c.carnot.value, 4.70);
    near(c.lorenz.value, 7.34);
    near(c.lz.value, 5.31);
    expect(c.azl.reason).toBe("not-applicable");
    expect(c.cz.reason).toBe("not-applicable");
  });

  it("disables CZ/LZ when ambient is not below the source inlet", () => {
    const c = referenceCops({ ...DEFAULTS, tAmb: 95, tSrcOut: 95 });
    expect(c.cz.valid).toBe(false);
    expect(c.cz.reason).toBe("no-source");
  });

  it("treats a latent source as isothermal at its inlet temperature", () => {
    const c = referenceCops({ ...DEFAULTS, sourceType: "latent", tSrcOut: 30 });
    near(c.carnot.value, 7.05);
    near(c.lorenz.value, 7.05);
    expect(c.cz.reason).toBe("not-applicable");
  });
});
