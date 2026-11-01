import { toK, toC } from "./temps";
import { referenceCops, refTemps, type CopKey } from "./cop";
import { mcpFromQmax } from "./heat";
import type { Scenario } from "../state/scenario";

export type Pt = { x: number; y: number };

/**
 * Geometry of one reference cycle in the T - dS diagram (paper Figs. 3-7).
 * x is the entropy flow in kW/K, y the temperature in degrees Celsius
 * (the axis starts at 0 K, as in the paper, so rectangle areas are heat flows).
 *
 * A reversible cycle takes in Q_src at its mean low temperature and gives off
 * Q_H = T_high * dS_c. Exergy losses are measured against the real streams:
 * the source stream that gives off Q_src and the sink that takes Q_H.
 * Each loss is drawn as a bar from 0 K to T_amb whose area is T_amb * dS (Gouy-Stodola).
 */
export type TdsModel = {
  valid: boolean;
  cop: number;
  qSrc: number;
  qH: number;
  dSc: number;
  dSsrc: number;
  dSsink: number;
  srcCurve: Pt[];
  sinkCurve: Pt[];
  cycle: Pt[];
  lossSrc: [number, number];
  lossSink: [number, number];
  exLossSrc: number;
  exLossSink: number;
};

/** Points along a constant-c_p stream from T_a to T_b (K), plotted against entropy from x0. */
function streamCurve(Ta: number, Tb: number, dS: number, x0 = 0, n = 32): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    // T(S) = T_a * (T_b/T_a)^(S/dS): exact for constant c_p, flat for T_a = T_b.
    pts.push({ x: x0 + f * dS, y: toC(Ta * Math.pow(Tb / Ta, f)) });
  }
  return pts;
}

export function tdsModel(s: Scenario, key: CopKey): TdsModel {
  const cop = referenceCops(s)[key];
  const t = refTemps(s);
  const latentSrc = s.sourceType === "latent";
  const toAmbient = key === "cz" || key === "lz";
  const mcp = mcpFromQmax(s.QmaxkW, s.tSrcIn, s.tAmb);

  const tLow = toAmbient ? s.tAmb : latentSrc ? s.tSrcIn : s.tSrcOut;
  const qSrc = latentSrc ? s.QmaxkW : mcp * (s.tSrcIn - tLow);

  // Mean temperatures of the real streams and of the reference cycle sides.
  const TsrcReal = toAmbient ? t.T0AM : t.T0M;
  const TsinkReal = s.sinkType === "latent" ? t.TH : t.THM;
  const TcycLow = key === "carnot" ? t.T0 : TsrcReal;
  const TcycHigh = key === "carnot" || key === "azl" || key === "cz" ? t.TH : t.THM;

  const empty: TdsModel = {
    valid: false, cop: NaN, qSrc, qH: NaN, dSc: 0, dSsrc: 0, dSsink: 0,
    srcCurve: [], sinkCurve: [], cycle: [], lossSrc: [0, 0], lossSink: [0, 0], exLossSrc: NaN, exLossSink: NaN,
  };
  if (!cop.valid || !(qSrc > 0)) return empty;

  const dSc = qSrc / TcycLow;
  const qH = TcycHigh * dSc;
  const dSsrc = qSrc / TsrcReal;
  const dSsink = qH / TsinkReal;
  const Tamb = toK(s.tAmb);

  const srcIn = toK(s.tSrcIn);
  const srcOut = toK(tLow);
  // The real source stream: hot end at x = dSsrc, cold end at x = 0.
  const srcCurve = streamCurve(srcOut, srcIn, dSsrc);
  const sinkLatent = s.sinkType === "latent";
  const sinkCurve = sinkLatent
    ? streamCurve(t.TH, t.TH, dSsink)
    : streamCurve(toK(s.tSinkIn), t.TH, dSsink);

  // Reference cycle: low side follows the source (or T0 for Carnot), high side the sink (or TH).
  const low = key === "carnot" ? streamCurve(t.T0, t.T0, dSc) : streamCurve(srcOut, srcIn, dSc);
  const highGlide = !sinkLatent && (key === "lorenz" || key === "lz");
  const high = highGlide ? streamCurve(toK(s.tSinkIn), t.TH, dSc) : streamCurve(t.TH, t.TH, dSc);
  const cycle = [...low, ...high.slice().reverse(), low[0]];

  return {
    valid: true,
    cop: cop.value,
    qSrc,
    qH,
    dSc,
    dSsrc,
    dSsink,
    srcCurve,
    sinkCurve,
    cycle,
    lossSrc: [Math.min(dSsrc, dSc), Math.max(dSsrc, dSc)],
    lossSink: [Math.min(dSc, dSsink), Math.max(dSc, dSsink)],
    exLossSrc: Tamb * Math.max(0, dSc - dSsrc),
    exLossSink: Tamb * Math.max(0, dSsink - dSc),
  };
}
