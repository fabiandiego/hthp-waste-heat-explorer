import { toK, logMeanT } from "./temps";
import type { Scenario } from "../state/scenario";

export type CopReason = "no-lift" | "not-applicable" | "no-source";
export type CopResult = { value: number; valid: boolean; reason?: CopReason };
export type CopKey = "carnot" | "lorenz" | "azl" | "cz" | "lz";

/** Reversible heat-pump COP between a hot and a cold (mean) temperature, in K. */
function kernel(Thot: number, Tcold: number): CopResult {
  if (!(Thot > Tcold) || !(Tcold > 0)) return { value: NaN, valid: false, reason: "no-lift" };
  return { value: Thot / (Thot - Tcold), valid: true };
}

const na = (reason: CopReason): CopResult => ({ value: NaN, valid: false, reason });

/** Eq. 10: isothermal source T0 and sink TH. */
export const copCarnot = (TH: number, T0: number) => kernel(TH, T0);
/** Eq. 11: entropic mean sink and source temperatures. */
export const copLorenz = (THM: number, T0M: number) => kernel(THM, T0M);
/** Eq. 16: isothermal sink, gliding source. A special case of Lorenz. */
export const copAZL = (TH: number, T0M: number) => kernel(TH, T0M);
/** Eq. 17: isothermal sink, source cooled to ambient. */
export const copCZ = (TH: number, T0AM: number) => kernel(TH, T0AM);
/** Eq. 18: gliding sink, source cooled to ambient. */
export const copLZ = (THM: number, T0AM: number) => kernel(THM, T0AM);

/** Characteristic temperatures (K) the reference COPs are built from. */
export type RefTemps = { TH: number; THM: number; T0: number; T0M: number; T0AM: number };

export function refTemps(s: Scenario): RefTemps {
  const tSrcOut = s.sourceType === "latent" ? s.tSrcIn : s.tSrcOut;
  const TH = toK(s.tSinkOut);
  const THM = s.sinkType === "latent" ? TH : logMeanT(s.tSinkOut, s.tSinkIn);
  return {
    TH,
    THM,
    T0: toK(tSrcOut),
    T0M: logMeanT(s.tSrcIn, tSrcOut),
    T0AM: logMeanT(s.tSrcIn, s.tAmb),
  };
}

/**
 * All five reference COPs for a scenario, following the paper's definitions:
 * Carnot uses the source and sink OUTLET temperatures (Sec. 5.2);
 * AZL and CZ apply to a sensible source with a latent sink, LZ to sensible sinks;
 * CZ and LZ apply to sensible sources only and need t_amb < t_src,in.
 */
export function referenceCops(s: Scenario): Record<CopKey, CopResult> {
  const t = refTemps(s);
  const latentSink = s.sinkType === "latent";
  const sensibleSrc = s.sourceType === "sensible";
  const ambientOk = s.tAmb < s.tSrcIn;
  return {
    carnot: copCarnot(t.TH, t.T0),
    lorenz: copLorenz(t.THM, t.T0M),
    // AZL needs a gliding source; on a latent source it would just repeat Carnot.
    azl: latentSink && sensibleSrc ? copAZL(t.TH, t.T0M) : na("not-applicable"),
    cz: !latentSink || !sensibleSrc ? na("not-applicable") : ambientOk ? copCZ(t.TH, t.T0AM) : na("no-source"),
    lz: latentSink || !sensibleSrc ? na("not-applicable") : ambientOk ? copLZ(t.THM, t.T0AM) : na("no-source"),
  };
}
