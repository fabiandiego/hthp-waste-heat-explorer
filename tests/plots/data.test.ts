import { describe, it, expect } from "vitest";
import { buildTq, buildTds, buildSweep, buildTradeoff } from "../../src/plots/specs";
import { derive } from "../../src/state/store";
import { PRESETS, DEFAULTS } from "../../src/state/scenario";
import { interpAt, niceTicks } from "../../src/plots/svgchart";

const finitePoints = (spec: { series: { kind: string; points?: { x: number; y: number }[] }[] }) =>
  spec.series.flatMap((s) => s.points ?? []).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

describe("chart data builders", () => {
  for (const [id, p] of Object.entries(PRESETS)) {
    it(`${id}: every builder returns finite points`, () => {
      const d = derive(p.scenario);
      expect(finitePoints(buildTq(p.scenario, d, "isothermal"))).toBe(true);
      expect(finitePoints(buildTds(p.scenario, d.matchKey))).toBe(true);
      if (p.scenario.sourceType === "sensible") {
        expect(finitePoints(buildSweep(p.scenario))).toBe(true);
        expect(finitePoints(buildTradeoff(p.scenario))).toBe(true);
      }
    });
  }

  it("the glide reference at t_out = t_amb equals CZ (latent sink) and LZ (sensible sink)", () => {
    for (const s of [DEFAULTS, PRESETS.fig4.scenario]) {
      const d = derive(s);
      const sweep = buildSweep(s);
      const line = sweep.series.find((x) => x.kind === "line" && x.label.startsWith(d.matchKey === "azl" ? "AZL" : "Lorenz"));
      expect(line && line.kind === "line").toBe(true);
      if (line && line.kind === "line") expect(line.points[0].y).toBeCloseTo(d.cops[d.fullKey!].value, 6);
    }
  });

  it("T-Q readout reproduces the ~4x evaporator vs glide loss ratio", () => {
    const t = buildTq(DEFAULTS, derive(DEFAULTS), "glide");
    expect(t.lossIso / t.lossGlide).toBeGreaterThan(3.5);
  });

  it("an inapplicable cycle gives an empty, labelled T-dS chart", () => {
    const t = buildTds(DEFAULTS, "lz");
    expect(t.model.valid).toBe(false);
    expect(t.summary).toContain("does not apply");
  });
});

describe("chart helpers", () => {
  it("interpolates and returns NaN outside the line", () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 20 }];
    expect(interpAt(pts, 5)).toBe(10);
    expect(Number.isNaN(interpAt(pts, 11))).toBe(true);
    expect(interpAt([...pts].reverse(), 5)).toBe(10);
  });
  it("makes nice ticks", () => {
    expect(niceTicks(0, 500, 5)).toEqual([0, 100, 200, 300, 400, 500]);
  });
});

describe("chart numbers agree with the cards", () => {
  it("the trade-off marker sits exactly on the current outlet and equals the headline value", () => {
    for (const out of [60, 47.5, 33]) {
      const s = { ...DEFAULTS, tSrcOut: out };
      const d = derive(s);
      const marker = buildTradeoff(s).series.find((x) => x.kind === "marker" && x.label?.endsWith("now"));
      expect(marker && marker.kind === "marker").toBe(true);
      if (marker && marker.kind === "marker") {
        expect(marker.x).toBe(out);
        expect(marker.y).toBeCloseTo(d.q.sinkMatch, 10);
        expect(marker.label).toBe(`${Math.round(d.q.sinkMatch)} kW now`);
      }
    }
  });
});
