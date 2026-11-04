export type HeatKind = "latent" | "sensible";

/**
 * One operating case. Temperatures in degrees Celsius, heat in kW.
 * - Latent source: isothermal at tSrcIn (tSrcOut is ignored).
 * - Latent sink: isothermal at tSinkOut (tSinkIn is ignored).
 * - QmaxkW is the heat the stream gives off when cooled all the way to tAmb;
 *   it fixes the capacity rate m_dot * c_p = QmaxkW / (tSrcIn - tAmb).
 */
export type Scenario = {
  sourceType: HeatKind;
  tSrcIn: number;
  tSrcOut: number;
  sinkType: HeatKind;
  tSinkIn: number;
  tSinkOut: number;
  tAmb: number;
  pinch: number;
  QmaxkW: number;
};

export const LIMITS = {
  tSrcIn: { min: 30, max: 200, step: 1 },
  tSrcOut: { min: -10, max: 200, step: 1 },
  tSinkIn: { min: 40, max: 250, step: 1 },
  tSinkOut: { min: 50, max: 250, step: 1 },
  tAmb: { min: -10, max: 40, step: 1 },
  pinch: { min: 0, max: 20, step: 0.5 },
  QmaxkW: { min: 50, max: 5000, step: 50 },
} as const;

export const DEFAULTS: Scenario = {
  sourceType: "sensible",
  tSrcIn: 90,
  tSrcOut: 60,
  sinkType: "latent",
  tSinkIn: 110,
  tSinkOut: 150,
  tAmb: 20,
  pinch: 5,
  QmaxkW: 500,
};

export type PresetId = "fig3" | "fig4" | "fig5" | "fig6" | "fig7";

/** Reference cycle a paper figure is about; mirrors CopKey in thermo/cop.ts (kept local to avoid an import cycle). */
export type FocusKey = "carnot" | "lorenz" | "azl" | "cz" | "lz";

/**
 * The paper's figure cases. Figs. 6 and 7 use the same 90 -> 60 C stream as Figs. 5 and 4
 * (see their captions) and compare it with the same stream cooled to ambient (CZ, LZ).
 * `focus` is the reference cycle the figure introduces, shown first in the T-dS view.
 */
export const PRESETS: Record<PresetId, { label: string; caption: string; scenario: Scenario; focus: FocusKey }> = {
  fig3: {
    label: "Fig. 3",
    caption: "Latent source 90 °C, latent sink 150 °C: Carnot vs Lorenz",
    scenario: { ...DEFAULTS, sourceType: "latent", tSrcOut: 90, sinkType: "latent" },
    focus: "carnot",
  },
  fig4: {
    label: "Fig. 4",
    caption: "Sensible source 90→60 °C, sensible sink 110→150 °C: Carnot vs Lorenz",
    scenario: { ...DEFAULTS, sinkType: "sensible" },
    focus: "lorenz",
  },
  fig5: {
    label: "Fig. 5",
    caption: "Sensible source 90→60 °C, steam at 150 °C: Carnot, Lorenz, AZL",
    scenario: { ...DEFAULTS },
    focus: "azl",
  },
  fig6: {
    label: "Fig. 6",
    caption: "Same stream, steam at 150 °C: AZL (to 60 °C) vs CZ (to ambient)",
    scenario: { ...DEFAULTS },
    focus: "cz",
  },
  fig7: {
    label: "Fig. 7",
    caption: "Same stream, sink 110→150 °C: Lorenz (to 60 °C) vs LZ (to ambient)",
    scenario: { ...DEFAULTS, sinkType: "sensible" },
    focus: "lz",
  },
};

/** Inputs each reset button restores. */
export const RESET_GROUPS = {
  source: ["sourceType", "tSrcIn", "tSrcOut"],
  sink: ["sinkType", "tSinkIn", "tSinkOut"],
  surroundings: ["tAmb", "pinch", "QmaxkW"],
} as const satisfies Record<string, readonly (keyof Scenario)[]>;
export type ResetGroup = keyof typeof RESET_GROUPS;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Bring a scenario back inside slider limits and physical ordering. */
export function normalize(s: Scenario): Scenario {
  const n: Scenario = { ...s };
  for (const k of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    n[k] = clamp(Number.isFinite(n[k]) ? n[k] : DEFAULTS[k], LIMITS[k].min, LIMITS[k].max);
  }
  if (n.sourceType !== "latent" && n.sourceType !== "sensible") n.sourceType = DEFAULTS.sourceType;
  if (n.sinkType !== "latent" && n.sinkType !== "sensible") n.sinkType = DEFAULTS.sinkType;
  n.tSrcOut = Math.min(n.tSrcOut, n.tSrcIn);
  if (n.sourceType === "latent") n.tSrcOut = n.tSrcIn;
  n.tSinkIn = Math.min(n.tSinkIn, n.tSinkOut);
  return n;
}
