import { describe, it, expect } from "vitest";
import { mcpFromQmax, qSource, qSink, pElectric } from "../../src/thermo/heat";
import { exergySensible, exLossSource, exLossSink, tqProfile } from "../../src/thermo/exergy";
import { tdsModel } from "../../src/thermo/tds";
import { DEFAULTS, PRESETS } from "../../src/state/scenario";

const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
const MCP = 500 / 70; // 500 kW when 90 C water is cooled to 20 C (Fig. 2)

describe("heat balances (Eqs. 1-2)", () => {
  it("derives the capacity rate from the full potential", () => {
    near(mcpFromQmax(500, 90, 20), 7.1429, 1e-4);
    expect(Number.isNaN(mcpFromQmax(500, 20, 20))).toBe(true);
  });

  it("reproduces the Fig. 2 heat flows", () => {
    near(qSource(MCP, 90, 80), 71.43);
    near(qSource(MCP, 90, 60), 214.29);
    expect(qSource(MCP, 90, 60) / qSource(MCP, 90, 80)).toBeCloseTo(3, 10);
  });

  it("delivered heat and electric power from a COP", () => {
    near(qSink(500, 4.3964), 647.2, 0.2);
    near(qSink(214.29, 5.6258), 260.6, 0.2);
    near(pElectric(500, 4.3964), 147.2, 0.2);
    expect(Number.isNaN(qSink(100, NaN))).toBe(true);
  });
});

describe("exergy (Eq. 4) and Gouy-Stodola losses (Eqs. 6-8)", () => {
  it("exergy of the full sensible stream 90 -> 20 C", () => {
    near(exergySensible(MCP, 90, 20, 20), 51.58, 0.05);
  });

  it("evaporator (isothermal) loses about 4x more exergy than a gliding HX for 90 -> 60 C, 5 K pinch", () => {
    const iso = exLossSource(MCP, 90, 60, 20, "isothermal", 5);
    const glide = exLossSource(MCP, 90, 60, 20, "glide", 5);
    near(iso, 10.9, 0.2);
    near(glide, 2.6, 0.2);
    expect(iso / glide).toBeGreaterThan(3.5);
    expect(iso / glide).toBeLessThan(4.5);
  });

  it("losses vanish with zero pinch on a gliding HX and stay positive otherwise", () => {
    near(exLossSource(MCP, 90, 60, 20, "glide", 0), 0, 1e-9);
    expect(exLossSource(MCP, 90, 60, 20, "isothermal", 0)).toBeGreaterThan(0);
  });

  it("sink-side losses: a condensing refrigerant into a sensible 110 -> 150 C sink", () => {
    const iso = exLossSink(300, "sensible", 110, 150, 20, "isothermal", 5);
    const glide = exLossSink(300, "sensible", 110, 150, 20, "glide", 5);
    expect(iso).toBeGreaterThan(glide);
    expect(glide).toBeGreaterThan(0);
    expect(Number.isNaN(exLossSink(300, "latent", 150, 150, 20, "glide", 5))).toBe(true);
  });

  it("T-Q profile: no heat when the outlet is not below the inlet", () => {
    const p = tqProfile(MCP, 90, 90, 20, "isothermal", 5);
    expect(p.q.every((v) => v === 0)).toBe(true);
    const ok = tqProfile(MCP, 90, 60, 20, "isothermal", 5, 11);
    near(ok.q[ok.q.length - 1], 214.29);
    expect(ok.tRef.every((t) => t === 55)).toBe(true);
  });
});

describe("T-dS reference-cycle model (Figs. 3-7)", () => {
  it("Carnot on a sensible source shows a source-side loss, Lorenz does not", () => {
    const car = tdsModel(PRESETS.fig5.scenario, "carnot");
    const lor = tdsModel(PRESETS.fig5.scenario, "lorenz");
    expect(car.exLossSrc).toBeGreaterThan(1);
    near(lor.exLossSrc, 0, 1e-9);
  });

  it("delivered heat follows Q_H = Q_src * COP / (COP - 1) for a reversible cycle", () => {
    const m = tdsModel(PRESETS.fig6.scenario, "cz");
    near(m.qSrc, 500, 1e-6);
    near(m.qH, 647.2, 0.2);
  });

  it("latent source and latent sink with Carnot: no losses", () => {
    const m = tdsModel(PRESETS.fig3.scenario, "carnot");
    near(m.exLossSrc, 0, 1e-9);
    near(m.exLossSink, 0, 1e-9);
  });

  it("returns valid=false for a cycle that does not apply", () => {
    expect(tdsModel(DEFAULTS, "lz").valid).toBe(false);
  });
});
