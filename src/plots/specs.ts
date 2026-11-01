import type { Scenario } from "../state/scenario";
import { derive, type Derived } from "../state/store";
import { referenceCops, type CopKey } from "../thermo/cop";
import { qSink, pElectric, qSource } from "../thermo/heat";
import { tqProfile, exLossSource, type HxMode } from "../thermo/exergy";
import { tdsModel, type TdsModel } from "../thermo/tds";
import { KELVIN_OFFSET } from "../thermo/temps";
import { fmt, type ChartSpec, type Pt, type Series } from "./svgchart";

export const COLOR = {
  src: "var(--src)",
  sink: "var(--sink)",
  amb: "var(--amb)",
  cyc: "var(--cyc)",
  ink3: "var(--ink-3)",
  ref: {
    carnot: "var(--ref-carnot)",
    lorenz: "var(--ref-lorenz)",
    azl: "var(--ref-azl)",
    cz: "var(--ref-full)",
    lz: "var(--ref-full)",
  } as Record<CopKey, string>,
};

export const REF_NAME: Record<CopKey, string> = {
  carnot: "Carnot",
  lorenz: "Lorenz",
  azl: "AZL",
  cz: "CZ",
  lz: "LZ",
};

/** Fig. 2: source and refrigerant temperatures against transferred heat. */
export function buildTq(s: Scenario, d: Derived, mode: HxMode): ChartSpec & { lossIso: number; lossGlide: number } {
  const n = 48;
  const series: Series[] = [];
  const latentSrc = s.sourceType === "latent";
  const mcp = d.mcp;
  const qMax = s.QmaxkW;
  const yLo = Math.min(s.tAmb, s.tSrcOut - s.pinch) - 5;
  const yHi = s.tSrcIn + 8;

  if (latentSrc) {
    series.push({ kind: "line", label: "Condensing source", color: COLOR.src, width: 3, points: [{ x: 0, y: s.tSrcIn }, { x: qMax, y: s.tSrcIn }], hover: true });
    series.push({ kind: "line", label: "Refrigerant", color: COLOR.cyc, points: [{ x: 0, y: s.tSrcIn - s.pinch }, { x: qMax, y: s.tSrcIn - s.pinch }], hover: true });
    return {
      x: { domain: [0, qMax * 1.02], label: "Heat taken from the source, Q̇ [kW]", unit: "kW" },
      y: { domain: [yLo, yHi], label: "Temperature [°C]", unit: "°C" },
      series,
      summary: "Latent source: constant temperature while heat is extracted.",
      lossIso: NaN,
      lossGlide: NaN,
    };
  }

  const full = tqProfile(mcp, s.tSrcIn, s.tAmb, s.tAmb, "glide", 0, n);
  const used = tqProfile(mcp, s.tSrcIn, s.tSrcOut, s.tAmb, mode, s.pinch, n);
  const srcFull: Pt[] = full.q.map((q, i) => ({ x: q, y: full.tSrc[i] }));
  const srcUsed: Pt[] = used.q.map((q, i) => ({ x: q, y: used.tSrc[i] }));
  const ref: Pt[] = used.q.map((q, i) => ({ x: q, y: used.tRef[i] }));
  const qUsed = qSource(mcp, s.tSrcIn, s.tSrcOut);

  if (qUsed > 0) series.push({ kind: "poly", points: [...srcUsed, ...ref.slice().reverse()], fill: mode === "isothermal" ? "var(--warn)" : COLOR.src, opacity: 0.16 });
  series.push({ kind: "line", label: "Potential to ambient", color: COLOR.src, opacity: 0.35, width: 1.5, points: srcFull });
  series.push({ kind: "line", label: "Source (used)", color: COLOR.src, width: 3, points: srcUsed, hover: true });
  if (qUsed > 0) series.push({ kind: "line", label: mode === "isothermal" ? "Evaporating refrigerant" : "Gliding refrigerant", color: COLOR.cyc, points: ref, hover: true });
  series.push({ kind: "hline", y: s.tAmb, color: COLOR.amb, dash: true });
  series.push({ kind: "text", x: qMax * 0.02, y: s.tAmb, dy: -6, text: `Ambient ${fmt(s.tAmb, 0)} °C` });
  series.push({ kind: "vline", x: qUsed, color: COLOR.ink3, dash: true, label: `${fmt(qUsed, 0)} kW used` });
  series.push({ kind: "marker", x: qMax, y: s.tAmb, color: COLOR.src, ring: true, label: `${fmt(qMax, 0)} kW` });

  return {
    x: { domain: [0, qMax * 1.04], label: "Heat taken from the source, Q̇ [kW]", unit: "kW" },
    y: { domain: [yLo, yHi], label: "Temperature [°C]", unit: "°C" },
    series,
    aspect: 2.3,
    summary: `Source cooled from ${s.tSrcIn} to ${s.tSrcOut} °C releases ${fmt(qUsed, 0)} of ${fmt(qMax, 0)} kW available.`,
    lossIso: exLossSource(mcp, s.tSrcIn, s.tSrcOut, s.tAmb, "isothermal", s.pinch),
    lossGlide: exLossSource(mcp, s.tSrcIn, s.tSrcOut, s.tAmb, "glide", s.pinch),
  };
}

/** Figs. 3-7: one reference cycle in the T - dS diagram, axis from 0 K. */
export function buildTds(s: Scenario, key: CopKey, progress = 1, zoom = false): ChartSpec & { model: TdsModel } {
  const m = tdsModel(s, key);
  const series: Series[] = [];
  const bottom = -KELVIN_OFFSET;
  const xMax = Math.max(m.dSc, m.dSsrc, m.dSsink) || 1;
  const top = Math.max(s.tSinkOut, s.tSrcIn) + 30;
  if (m.valid) {
    const k = Math.max(1, Math.round(progress * m.cycle.length));
    const cyc = m.cycle.slice(0, k);
    if (progress >= 1) series.push({ kind: "poly", points: m.cycle, fill: COLOR.ref[key], opacity: 0.12 });
    series.push({ kind: "line", label: `${REF_NAME[key]} cycle`, color: COLOR.ref[key], width: 3, dash: "7 5", points: cyc });
    // Real streams drawn on top of the reference so they stay visible where they coincide.
    series.push({ kind: "line", label: "Source stream", color: COLOR.src, width: 2, points: m.srcCurve, hover: true, tag: { at: 0.15, text: "source" } });
    series.push({ kind: "line", label: "Sink stream", color: COLOR.sink, width: 2, points: m.sinkCurve, hover: true, tag: { at: 0.85, text: "sink" } });
    if (progress >= 1) {
      const [a0, a1] = m.lossSrc;
      const [b0, b1] = m.lossSink;
      if (m.exLossSrc > 0.05) series.push({ kind: "hatch", x0: a0, x1: a1, y0: bottom, y1: s.tAmb, color: COLOR.src, angle: 45, label: `${fmt(m.exLossSrc, 1)} kW` });
      if (m.exLossSink > 0.05) series.push({ kind: "hatch", x0: b0, x1: b1, y0: bottom, y1: s.tAmb, color: COLOR.sink, angle: 135, label: `${fmt(m.exLossSink, 1)} kW` });
    }
  }
  series.push({ kind: "hline", y: s.tAmb, color: COLOR.amb, dash: true, label: `T_amb ${fmt(s.tAmb, 0)} °C` });
  const lowest = Math.min(s.tAmb, ...m.srcCurve.map((p) => p.y), ...m.cycle.map((p) => p.y));
  return {
    x: { domain: [0, xMax * 1.12], label: "Entropy flow ΔṠ [kW/K]", unit: "kW/K" },
    y: zoom
      ? { domain: [lowest - 15, top], label: "Temperature [°C]  (zoomed; loss bars continue to 0 K)", unit: "°C" }
      : { domain: [bottom, top], label: "Temperature [°C]  (axis from 0 K)", unit: "°C", ticks: [-273.15, -200, -100, 0, 100, 200].filter((v) => v <= top) },
    series,
    aspect: 2,
    summary: m.valid
      ? `${REF_NAME[key]} reference cycle: COP ${fmt(m.cop)}, ${fmt(m.qSrc, 0)} kW in, ${fmt(m.qH, 0)} kW out.`
      : `${REF_NAME[key]} does not apply to this source and sink.`,
    model: m,
  };
}

function sweepOutlets(s: Scenario, n = 60): number[] {
  const out: number[] = [];
  const lo = s.tAmb;
  const hi = s.tSrcIn - 0.5;
  for (let i = 0; i < n; i++) out.push(lo + ((hi - lo) * i) / (n - 1));
  return out;
}

/** Reference COPs as the source outlet temperature is lowered towards ambient. */
export function buildSweep(s: Scenario): ChartSpec {
  const d = derive(s);
  const outs = sweepOutlets(s);
  const keys: CopKey[] = ["carnot", d.matchKey === "carnot" ? "lorenz" : d.matchKey];
  const series: Series[] = [];
  let yMax = 0;
  for (const k of keys) {
    const pts = outs.map((t) => ({ x: t, y: referenceCops({ ...s, tSrcOut: t })[k].value })).filter((p) => Number.isFinite(p.y));
    pts.forEach((p) => (yMax = Math.max(yMax, p.y)));
    series.push({ kind: "line", label: REF_NAME[k], color: COLOR.ref[k], points: pts, hover: true });
  }
  if (d.fullKey && d.cops[d.fullKey].valid) {
    const v = d.cops[d.fullKey].value;
    series.push({ kind: "line", label: `${REF_NAME[d.fullKey]} (fixed: source to ambient)`, color: COLOR.ref[d.fullKey], dash: true, points: [{ x: outs[0], y: v }, { x: outs[outs.length - 1], y: v }], hover: true });
    series.push({ kind: "marker", x: s.tAmb, y: v, color: COLOR.ref[d.fullKey], label: `${REF_NAME[d.fullKey]} ${fmt(v)}` });
  }
  series.push({ kind: "vline", x: s.tSrcOut, color: COLOR.ink3, dash: true, label: `t_out ${fmt(s.tSrcOut, 0)} °C` });
  const cap = Math.min(Math.max(8, Math.ceil(yMax * 1.1)), 25);
  return {
    x: { domain: [s.tAmb, s.tSrcIn], label: "Source outlet temperature t_src,out [°C]", unit: "°C" },
    y: { domain: [0, cap], label: "Reference COP [–]" },
    series,
    summary: "Reference COPs fall as the source is cooled further.",
  };
}

/** Heat delivered and electric power vs source outlet, for the matching glide reference. */
export function buildTradeoff(s: Scenario): ChartSpec {
  const d = derive(s);
  const outs = sweepOutlets(s);
  const key = d.matchKey;
  const qs: Pt[] = [], qh: Pt[] = [], pel: Pt[] = [];
  for (const t of outs) {
    const sc = { ...s, tSrcOut: t };
    const cop = referenceCops(sc)[key].value;
    const q = qSource(d.mcp, s.tSrcIn, t);
    qs.push({ x: t, y: q });
    qh.push({ x: t, y: qSink(q, cop) });
    pel.push({ x: t, y: pElectric(q, cop) });
  }
  const yMax = Math.max(...qh.map((p) => p.y).filter(Number.isFinite), s.QmaxkW);
  const cur = qh.reduce((a, p) => (Math.abs(p.x - s.tSrcOut) < Math.abs(a.x - s.tSrcOut) ? p : a), qh[0]);
  return {
    x: { domain: [s.tAmb, s.tSrcIn], label: "Source outlet temperature t_src,out [°C]", unit: "°C" },
    y: { domain: [0, yMax * 1.1], label: "Heat flow / power [kW]", unit: "kW" },
    series: [
      { kind: "line", label: `Heat delivered Q̇_H (${REF_NAME[key]})`, color: COLOR.sink, width: 2.5, points: qh, hover: true },
      { kind: "line", label: "Waste heat used Q̇_src", color: COLOR.src, points: qs, hover: true },
      { kind: "line", label: "Electric power P_el", color: COLOR.cyc, width: 1.5, points: pel, hover: true },
      { kind: "marker", x: cur.x, y: cur.y, color: COLOR.sink, label: `${fmt(cur.y, 0)} kW` },
      ...(d.fullKey && Number.isFinite(d.q.sinkFull)
        ? [{ kind: "marker" as const, x: s.tAmb, y: d.q.sinkFull, color: COLOR.ref[d.fullKey], ring: true, label: `${REF_NAME[d.fullKey]}: ${fmt(d.q.sinkFull, 0)} kW` }]
        : []),
    ],
    summary: "Cooling the source further lowers the COP but raises the heat delivered.",
  };
}
