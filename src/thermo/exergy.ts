import { toK } from "./temps";
import type { HeatKind } from "../state/scenario";

export type HxMode = "isothermal" | "glide";

/**
 * Exergy of the heat a sensible stream gives off between tIn and tOut (Eq. 4):
 * Ex = m c_p [(T_in - T_out) - T_amb ln(T_in / T_out)], kW.
 */
export function exergySensible(mcp: number, tInC: number, tOutC: number, tAmbC: number): number {
  if (!(tInC > tOutC)) return 0;
  const Ti = toK(tInC);
  const To = toK(tOutC);
  return mcp * (Ti - To - toK(tAmbC) * Math.log(Ti / To));
}

/**
 * Gouy-Stodola loss in the low-pressure heat exchanger (Eqs. 6-7), kW.
 * The source stream is cooled tIn -> tOut. The refrigerant either evaporates at
 * (tOut - pinch) ("isothermal", vapour compression) or warms in counterflow with a
 * constant pinch ("glide", gas cycles such as rJC / RHP / AZL).
 */
export function exLossSource(
  mcp: number,
  tInC: number,
  tOutC: number,
  tAmbC: number,
  mode: HxMode,
  pinch: number,
): number {
  if (!(tInC > tOutC)) return 0;
  const Ti = toK(tInC);
  const To = toK(tOutC);
  const Q = mcp * (Ti - To);
  const dSsrc = mcp * Math.log(Ti / To);
  const dSref = mode === "isothermal" ? Q / (To - pinch) : mcp * Math.log((Ti - pinch) / (To - pinch));
  return toK(tAmbC) * (dSref - dSsrc);
}

/**
 * Gouy-Stodola loss in the high-pressure heat exchanger (Eq. 8), kW.
 * Q is the heat delivered. The refrigerant rejects heat isothermally at
 * (sink outlet + pinch) or with a glide parallel to a sensible sink.
 * A gliding refrigerant into a latent sink is not defined here (NaN).
 */
export function exLossSink(
  Q: number,
  sinkType: HeatKind,
  tSinkInC: number,
  tSinkOutC: number,
  tAmbC: number,
  mode: HxMode,
  pinch: number,
): number {
  const Tout = toK(tSinkOutC);
  if (sinkType === "latent") {
    if (mode === "glide") return NaN;
    return toK(tAmbC) * (Q / Tout - Q / (Tout + pinch));
  }
  const Tin = toK(tSinkInC);
  if (!(Tout > Tin)) return NaN;
  const mcpSink = Q / (Tout - Tin);
  const dSsink = mcpSink * Math.log(Tout / Tin);
  const dSref = mode === "isothermal" ? Q / (Tout + pinch) : mcpSink * Math.log((Tout + pinch) / (Tin + pinch));
  return toK(tAmbC) * (dSsink - dSref);
}

export type TqProfile = { q: number[]; tSrc: number[]; tRef: number[] };

/**
 * Temperature vs. transferred heat in the low-pressure HX (Fig. 2), n points.
 * x runs from the hot end (q = 0, source at tIn) to the cold end.
 */
export function tqProfile(
  mcp: number,
  tInC: number,
  tOutC: number,
  _tAmbC: number,
  mode: HxMode,
  pinch: number,
  n = 50,
): TqProfile {
  const q: number[] = [];
  const tSrc: number[] = [];
  const tRef: number[] = [];
  const span = Math.max(0, tInC - tOutC);
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1);
    const t = tInC - f * span;
    q.push(mcp * (tInC - t));
    tSrc.push(t);
    tRef.push(mode === "isothermal" ? tOutC - pinch : t - pinch);
  }
  return { q, tSrc, tRef };
}
