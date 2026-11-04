import { DEFAULTS, PRESETS, type PresetId, type Scenario } from "../state/scenario";
import { referenceCops, refTemps, type CopKey } from "../thermo/cop";
import { mcpFromQmax, qSource } from "../thermo/heat";
import { exLossSource } from "../thermo/exergy";
import { logMeanT, toK } from "../thermo/temps";

export type ClaimStatus = "reproduced" | "reproduced-with-assumption" | "not-reproducible";

export type Claim = {
  id: string;
  /** Where the number appears in the paper. */
  where: string;
  /** What the paper states, in our words. */
  statement: string;
  paper: number;
  unit: string;
  compute: () => number;
  status: ClaimStatus;
  /** Extra input the paper does not state at that point but the number needs. */
  assumption?: string;
  note: string;
  /** Figure case this number belongs to; "Load case" opens it. */
  preset?: PresetId;
  /** Other figures that print the same number. */
  alsoIn?: PresetId[];
  /** Case to load when the claim has no figure preset. */
  case?: Partial<Scenario>;
  /** Reference COP this claim reports, so the dashboard can show it beside the live value. */
  copKey?: CopKey;
  /**
   * A calculation that reproduces a non-reproducible printed value, i.e. what the
   * paper most likely computed. Stated as a hypothesis, never as the paper's intent.
   */
  likelyCause?: { text: string; compute: () => number };
};

/** Relative deviation that still counts as matching the paper's rounding. */
export const MATCH_TOLERANCE = 0.02;

/** The scenario a claim is evaluated in, and the case "Load case" opens. */
export function caseOf(c: Claim): Scenario {
  if (c.case) return { ...DEFAULTS, ...c.case };
  if (c.preset) return { ...PRESETS[c.preset].scenario };
  return { ...DEFAULTS };
}

const cop = (c: Claim) => referenceCops(caseOf(c))[c.copKey!].value;
const mcp500 = mcpFromQmax(500, 90, 20);
const ratioQ = (tA: number, tB: number) => (90 - tA) / (90 - tB);

/* The "180 C sink" hypothesis: every unexplained Lorenz value in Secs. 5.1/5.3 and Figs. 3/5
   is reproduced if the sink is taken as 180 C (or a 150 -> 180 C glide) instead of 150 C. */
const T180 = toK(180);
const TH_ln_150_180 = logMeanT(180, 150);
const SINK_180 = "Matches if the sink is taken as 180 °C instead of 150 °C";

export const CLAIMS: Claim[] = [
  {
    id: "Q-90-60-vs-80",
    where: "Sec. 3, text",
    statement: "Cooling 90 °C water to 60 °C instead of 80 °C gives 200 % more heat.",
    paper: 200, unit: "%",
    compute: () => (ratioQ(60, 80) - 1) * 100,
    status: "reproduced",
    case: { tSrcOut: 80 },
    note: "Ratio of temperature differences (Eq. 1): (90 − 60) / (90 − 80) = 3, i.e. 200 % more. Independent of flow rate and ambient.",
  },
  {
    id: "Q-fig2-80",
    where: "Fig. 2, top",
    statement: "Heat extracted down to 80 °C: 71 kW of a 500 kW potential.",
    paper: 71, unit: "kW",
    compute: () => qSource(mcp500, 90, 80),
    status: "reproduced",
    case: { tSrcOut: 80 },
    note: "The 500 kW bar runs to ambient, which the Fig. 2 caption gives as 20 °C: ṁc_p = 500 kW / 70 K = 7.14 kW/K, so 7.14 × 10 K = 71.4 kW.",
  },
  {
    id: "Q-fig2-60",
    where: "Fig. 2, bottom",
    statement: "Heat extracted down to 60 °C: 214 kW of a 500 kW potential.",
    paper: 214, unit: "kW",
    compute: () => qSource(mcp500, 90, 60),
    status: "reproduced",
    note: "7.14 kW/K × 30 K = 214.3 kW.",
  },
  {
    id: "Q-90-30-vs-60",
    where: "Sec. 6, conclusion",
    statement: "Cooling 90 °C wastewater to 30 °C instead of 60 °C gives two times more heat.",
    paper: 2, unit: "×",
    compute: () => ratioQ(30, 60),
    status: "reproduced",
    case: { tSrcOut: 30 },
    note: "(90 − 30) / (90 − 60) = 2.",
  },
  {
    id: "Q-90-0-vs-60",
    where: "Abstract and Sec. 6",
    statement: "Cooling 90 °C to 0 °C instead of 60 °C recovers three times more waste heat.",
    paper: 3, unit: "×",
    compute: () => ratioQ(0, 60),
    status: "reproduced",
    case: { tAmb: 0, tSrcOut: 0 },
    note: "(90 − 0) / (90 − 60) = 3, whatever the ambient. The abstract pairs this 0 °C case with COP_CZ ≈ 4.4, which needs a 20 °C ambient (see the CZ abstract row).",
  },
  {
    id: "COP-car-latent", copKey: "carnot",
    where: "Sec. 5.1 and Fig. 3",
    statement: "Carnot COP for a latent source at 90 °C and a latent sink at 150 °C is 7.1.",
    paper: 7.1, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-car-latent"]),
    status: "reproduced", preset: "fig3",
    note: "Eq. 10: 423.15 / (423.15 − 363.15) = 7.05.",
  },
  {
    id: "COP-lor-latent-text", copKey: "lorenz",
    where: "Sec. 5.1, text",
    statement: "Lorenz COP for the same latent–latent case is 3.8.",
    paper: 3.8, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-lor-latent-text"]),
    status: "not-reproducible", preset: "fig3",
    note: "With isothermal source and sink the entropic mean temperatures equal T_H and T_0, so Lorenz equals Carnot (7.05). The text also contradicts its own Fig. 3, which prints 4.9.",
    likelyCause: { text: `${SINK_180}, over a 60 °C source: 453.15 / (453.15 − 333.15) = 3.78.`, compute: () => T180 / (T180 - toK(60)) },
  },
  {
    id: "COP-lor-latent-fig", copKey: "lorenz",
    where: "Fig. 3, left",
    statement: "Lorenz COP for the latent–latent case is 4.9.",
    paper: 4.9, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-lor-latent-fig"]),
    status: "not-reproducible", preset: "fig3",
    note: "Lorenz must equal Carnot here (7.05). The panel computes 438 K / (438 K − 348 K) with two mean temperatures that do not belong to this case (rows below).",
    likelyCause: { text: `${SINK_180} (glide 150→180 °C, T̄ = 437.98 K) and the 90→60 °C source mean: 437.98 / (437.98 − 347.93) = 4.86.`, compute: () => TH_ln_150_180 / (TH_ln_150_180 - logMeanT(90, 60)) },
  },
  {
    id: "T-H-ln-fig3",
    where: "Fig. 3, left",
    statement: "Entropic mean sink temperature T̄_H,ln = 438 K.",
    paper: 438, unit: "K",
    compute: () => refTemps(PRESETS.fig3.scenario).THM,
    status: "not-reproducible", preset: "fig3",
    note: "A latent sink at 150 °C has T̄_H = T_H = 423.15 K.",
    likelyCause: { text: "Eq. 13 for a sink gliding from 150 °C to 180 °C: 30 / ln(453.15 / 423.15) = 437.98 K.", compute: () => TH_ln_150_180 },
  },
  {
    id: "T-0-ln-fig3",
    where: "Fig. 3, left",
    statement: "Entropic mean source temperature T̄_0,ln = 348 K for the latent 90 °C source.",
    paper: 348, unit: "K",
    compute: () => refTemps(PRESETS.fig3.scenario).T0M,
    status: "not-reproducible", preset: "fig3",
    note: "A latent source at 90 °C has T̄_0 = T_0 = 363.15 K.",
    likelyCause: { text: "The mean of a 90→60 °C sensible source (Eq. 12): 347.93 K, the Fig. 4–5 value.", compute: () => logMeanT(90, 60) },
  },
  {
    id: "COP-lor-sens-text", copKey: "lorenz",
    where: "Sec. 5.2, text",
    statement: "Lorenz COP for source 90→60 °C and sink 110→150 °C is 6.9.",
    paper: 6.9, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-lor-sens-text"]),
    status: "not-reproducible", preset: "fig4",
    note: "Eq. 11 gives 7.34, the value in Fig. 4 and the conclusion. The text contradicts the figure; no simple combination of the paper's temperatures gives 6.9.",
  },
  {
    id: "COP-car-sens-text", copKey: "carnot",
    where: "Sec. 5.2, text",
    statement: "Carnot COP for the same case is 4.9.",
    paper: 4.9, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-car-sens-text"]),
    status: "not-reproducible", preset: "fig4",
    note: "Eq. 10 with the outlet temperatures gives 4.70, as in Fig. 4 and the conclusion.",
  },
  {
    id: "COP-lor-fig4", copKey: "lorenz",
    where: "Figs. 4 and 7, Sec. 6",
    statement: "Lorenz COP for source 90→60 °C and sink 110→150 °C is 7.3.",
    paper: 7.3, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-lor-fig4"]),
    status: "reproduced", preset: "fig4", alsoIn: ["fig7"],
    note: "Eq. 11: 402.82 / (402.82 − 347.93) = 7.34.",
  },
  {
    id: "COP-car-fig4", copKey: "carnot",
    where: "Fig. 4 and Sec. 6",
    statement: "Carnot COP for the same case is 4.7.",
    paper: 4.7, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-car-fig4"]),
    status: "reproduced", preset: "fig4",
    note: "Eq. 10: 423.15 / (423.15 − 333.15) = 4.70.",
  },
  {
    id: "T-HM-fig4",
    where: "Figs. 4 and 7",
    statement: "Entropic mean sink temperature 110→150 °C is 403 K.",
    paper: 403, unit: "K",
    compute: () => refTemps(PRESETS.fig4.scenario).THM,
    status: "reproduced", preset: "fig4",
    note: "Eq. 13: 40 / ln(423.15 / 383.15) = 402.82 K.",
  },
  {
    id: "T-0M-fig4",
    where: "Figs. 4–7",
    statement: "Entropic mean source temperature 90→60 °C is 348 K.",
    paper: 348, unit: "K",
    compute: () => refTemps(PRESETS.fig4.scenario).T0M,
    status: "reproduced", preset: "fig4",
    note: "Eq. 12: 30 / ln(363.15 / 333.15) = 347.93 K.",
  },
  {
    id: "COP-car-sens-latent", copKey: "carnot",
    where: "Sec. 5.3, Fig. 5, abstract",
    statement: "Carnot COP for source 90→60 °C and steam at 150 °C is 4.7.",
    paper: 4.7, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-car-sens-latent"]),
    status: "reproduced", preset: "fig5",
    note: "Eq. 10 with the source outlet, 60 °C: 4.70.",
  },
  {
    id: "COP-lor-sens-latent", copKey: "lorenz",
    where: "Sec. 5.3, Fig. 5, abstract",
    statement: "Lorenz COP for source 90→60 °C and steam at 150 °C is 4.3.",
    paper: 4.3, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-lor-sens-latent"]),
    status: "not-reproducible", preset: "fig5",
    note: "With a latent sink, T̄_HM = T_H and Lorenz equals AZL (5.63). Fig. 5's own printed inputs, 438 / (438 − 348), give 4.87, not 4.3.",
    likelyCause: { text: `${SINK_180}: 453.15 / (453.15 − 347.93) = 4.31.`, compute: () => T180 / (T180 - logMeanT(90, 60)) },
  },
  {
    id: "T-H-ln-fig5",
    where: "Fig. 5, left",
    statement: "Entropic mean sink temperature T̄_H,ln = 438 K for steam at 150 °C.",
    paper: 438, unit: "K",
    compute: () => refTemps(PRESETS.fig5.scenario).THM,
    status: "not-reproducible", preset: "fig5",
    note: "A latent sink at 150 °C has T̄_H = T_H = 423.15 K; the Fig. 3 value was reused.",
    likelyCause: { text: "Eq. 13 for a sink gliding from 150 °C to 180 °C: 437.98 K.", compute: () => TH_ln_150_180 },
  },
  {
    id: "COP-azl", copKey: "azl",
    where: "Sec. 5.3, Figs. 5–6, abstract",
    statement: "AZL COP for source 90→60 °C and steam at 150 °C is 5.6.",
    paper: 5.6, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-azl"]),
    status: "reproduced", preset: "fig5", alsoIn: ["fig6"],
    note: "Eq. 16: 423.15 / (423.15 − 347.93) = 5.63. Eq. 16 is Eq. 11 with an isothermal sink.",
  },
  {
    id: "T-0AM",
    where: "Figs. 6–7",
    statement: "Entropic mean source temperature from 90 °C down to ambient is 327 K.",
    paper: 327, unit: "K",
    compute: () => refTemps(PRESETS.fig6.scenario).T0AM,
    status: "reproduced-with-assumption", preset: "fig6",
    assumption: "Ambient 20 °C; Figs. 6–7 and Sec. 5.4 do not state it (only the Fig. 2 caption does).",
    note: "Eq. 19: 70 / ln(363.15 / 293.15) = 326.90 K.",
  },
  {
    id: "COP-cz", copKey: "cz",
    where: "Fig. 6",
    statement: "CZ COP for source 90 °C cooled to ambient and steam at 150 °C is 4.4.",
    paper: 4.4, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-cz"]),
    status: "reproduced-with-assumption", preset: "fig6",
    assumption: "Ambient 20 °C.",
    note: "Eq. 17: 423.15 / (423.15 − 326.90) = 4.40. Fig. 6's caption calls this the \"LZ-Cycle\"; it is the CZ cycle.",
  },
  {
    id: "COP-cz-abstract", copKey: "cz",
    where: "Abstract",
    statement: "Cooling the source from 90 °C to 0 °C limits the COP to about 4.4 (CZ).",
    paper: 4.4, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-cz-abstract"]),
    status: "not-reproducible",
    case: { tAmb: 0, tSrcOut: 0 },
    note: "With a 0 °C ambient, Eq. 17 gives 423.15 / (423.15 − 316.02) = 3.95. The 4.4 belongs to a 20 °C ambient.",
  },
  {
    id: "COP-lz-fig7", copKey: "lz",
    where: "Fig. 7, right",
    statement: "LZ COP for source to ambient and sink 110→150 °C, printed as \"COP_Car = 4.7\".",
    paper: 4.7, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-lz-fig7"]),
    status: "not-reproducible", preset: "fig7",
    note: "Eq. 18 gives 402.82 / (402.82 − 326.90) = 5.31. The panel's formula uses T_H instead of T̄_HM; with its own printed inputs (423 K, 327 K) it gives 4.40, which is CZ. The 4.7 under a Carnot label matches Fig. 4's Carnot COP.",
  },
  {
    id: "COP-car-wrong", copKey: "carnot",
    where: "Sec. 6, conclusion",
    statement: "Carnot with sink outlet and source INLET (a common shortcut) gives 7.0.",
    paper: 7.0, unit: "–",
    compute: () => cop(CLAIMS_BY_ID["COP-car-wrong"]),
    status: "reproduced",
    case: { sourceType: "latent", tSrcOut: 90, sinkType: "sensible" },
    note: "423.15 / (423.15 − 363.15) = 7.05. Loaded here as a 90 °C latent source, which makes Carnot use 90 °C. The paper cites it as a misleading reference.",
  },
  {
    id: "Ex-ratio",
    where: "Sec. 3",
    statement: "Exergy losses with isothermal heat absorption are up to 6 times higher than with a glide.",
    paper: 6, unit: "×",
    compute: () =>
      exLossSource(mcp500, 90, 60, 20, "isothermal", 5) / exLossSource(mcp500, 90, 60, 20, "glide", 5),
    status: "not-reproducible", preset: "fig5",
    note: "No case is given. For the paper's 90 °C stream with a 5 K pinch the ratio is 4.1× at a 60 °C outlet, reaches 6× near 43 °C and 8.6× when cooled to 20 °C ambient, so \"up to 6\" understates the full-cooling case the paper argues for. Drag the outlet slider in the Fig. 2 view to see it.",
  },
];

const CLAIMS_BY_ID: Record<string, Claim> = Object.fromEntries(CLAIMS.map((c) => [c.id, c]));

export const relDev = (c: Claim) => {
  const v = c.compute();
  return Math.abs(v - c.paper) / Math.abs(c.paper);
};

/**
 * The printed value to show beside a live COP for a loaded figure case.
 * A value printed in that figure wins over a conflicting value in the text.
 */
export function paperClaimFor(preset: PresetId, key: CopKey): Claim | undefined {
  const inFig = (c: Claim) => c.preset === preset || (c.alsoIn ?? []).includes(preset);
  const fromFigure = (c: Claim) => /Figs?\. /.test(c.where);
  const matches = CLAIMS.filter((c) => c.copKey === key && inFig(c));
  return matches.find(fromFigure) ?? matches[0];
}

/** Qualitative statements and labelling errors in the paper, each checked by a test. */
export type Statement = { id: string; where: string; statement: string; verdict: string; check: () => boolean };

const fig5 = () => referenceCops(PRESETS.fig5.scenario);

export const STATEMENTS: Statement[] = [
  {
    id: "cz-below-azl",
    where: "Sec. 5.4",
    statement: "COP_CZ is lower than COP_AZL, and COP_LZ is lower than COP_Lor.",
    verdict: "True whenever the outlet is above ambient, because T̄_0AM < T̄_0M.",
    check: () => {
      for (const t of [25, 40, 60, 80]) {
        const c = referenceCops({ ...DEFAULTS, tSrcOut: t });
        const l = referenceCops({ ...DEFAULTS, sinkType: "sensible", tSrcOut: t });
        if (!(c.cz.value < c.azl.value && l.lz.value < l.lorenz.value)) return false;
      }
      return true;
    },
  },
  {
    id: "cz-below-carnot",
    where: "Sec. 5.4",
    statement: "COP_CZ is lower than COP_Carnot.",
    verdict: "Only for outlets above T̄_0AM (53.8 °C for 90 °C and 20 °C ambient). True for the paper's 60 °C case (4.40 < 4.70), false at 40 °C (4.40 > 3.85).",
    check: () => {
      const at = (t: number) => referenceCops({ ...DEFAULTS, tSrcOut: t });
      return fig5().cz.value < fig5().carnot.value && at(40).cz.value > at(40).carnot.value;
    },
  },
  {
    id: "fig6-caption",
    where: "Fig. 6 caption",
    statement: "\"Comparison of the Adler/Zotter/Längauer-Cycle and the LZ-Cycle … latent heat sink.\"",
    verdict: "The right panel is the CZ cycle (Eq. 17); LZ (Eq. 18) needs a sensible sink.",
    check: () => {
      const c = referenceCops(PRESETS.fig6.scenario);
      return c.cz.valid && !c.lz.valid;
    },
  },
  {
    id: "fig67-captions",
    where: "Figs. 6–7 captions",
    statement: "Both captions give the source as \"90 °C to 60 °C\".",
    verdict: "True for the left panels (AZL, Lorenz). The right panels (CZ, LZ) cool the same stream to ambient.",
    check: () => {
      const c = referenceCops(PRESETS.fig6.scenario);
      return c.cz.value < c.azl.value;
    },
  },
  {
    id: "lorenz-latent-equals-carnot",
    where: "Sec. 5.1, Fig. 3",
    statement: "Carnot (7.1) is \"significantly higher\" than Lorenz for a latent source and latent sink.",
    verdict: "Not possible: with isothermal streams the entropic means equal T_0 and T_H, so Lorenz = Carnot exactly.",
    check: () => {
      const c = referenceCops(PRESETS.fig3.scenario);
      return Math.abs(c.lorenz.value - c.carnot.value) < 1e-9;
    },
  },
  {
    id: "eq-numbering",
    where: "Secs. 3 and 5",
    statement: "Equation cross-references in the text.",
    verdict: "Eq. 4 is printed twice; Sec. 3 cites Eq. 5 for sensible exergy (printed as the second Eq. 4); Sec. 5.4 cites Eq. 9 for Carnot (10), Eq. 10 for Lorenz (11), Eq. 15 for CZ (17) and Eq. 17 for LZ (18).",
    check: () => true,
  },
];
