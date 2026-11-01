import { DEFAULTS, PRESETS, type PresetId, type Scenario } from "../state/scenario";
import { referenceCops, refTemps } from "../thermo/cop";
import { mcpFromQmax, qSource } from "../thermo/heat";
import { exLossSource } from "../thermo/exergy";

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
  /** Extra input the paper does not state but the number needs. */
  assumption?: string;
  note: string;
  preset?: PresetId;
};

/** Relative deviation that still counts as matching the paper's rounding. */
export const MATCH_TOLERANCE = 0.02;

const at = (s: Partial<Scenario>) => ({ ...DEFAULTS, ...s });
const cops = (s: Scenario) => referenceCops(s);
const mcp500 = mcpFromQmax(500, 90, 20);
const ratioQ = (tA: number, tB: number) => (90 - tA) / (90 - tB);

export const CLAIMS: Claim[] = [
  {
    id: "Q-90-60-vs-80",
    where: "Sec. 3, text",
    statement: "Cooling 90 °C water to 60 °C instead of 80 °C gives 200 % more heat.",
    paper: 200, unit: "%",
    compute: () => (ratioQ(60, 80) - 1) * 100,
    status: "reproduced",
    note: "Pure ratio of temperature differences (Eq. 1); independent of flow rate.",
  },
  {
    id: "Q-fig2-80",
    where: "Fig. 2, top",
    statement: "Heat extracted down to 80 °C: 71 kW of a 500 kW potential.",
    paper: 71, unit: "kW",
    compute: () => qSource(mcp500, 90, 80),
    status: "reproduced-with-assumption",
    assumption: "500 kW means cooling to t_amb = 20 °C (stated in the Fig. 2 caption).",
    note: "Capacity rate 500 kW / 70 K = 7.14 kW/K.",
  },
  {
    id: "Q-fig2-60",
    where: "Fig. 2, bottom",
    statement: "Heat extracted down to 60 °C: 214 kW of a 500 kW potential.",
    paper: 214, unit: "kW",
    compute: () => qSource(mcp500, 90, 60),
    status: "reproduced-with-assumption",
    assumption: "500 kW means cooling to t_amb = 20 °C.",
    note: "Same capacity rate as above.",
  },
  {
    id: "Q-90-30-vs-60",
    where: "Sec. 6, conclusion",
    statement: "Cooling 90 °C wastewater to 30 °C instead of 60 °C gives two times more heat.",
    paper: 2, unit: "×",
    compute: () => ratioQ(30, 60),
    status: "reproduced",
    note: "Ratio of temperature differences.",
  },
  {
    id: "Q-90-0-vs-60",
    where: "Abstract and Sec. 6",
    statement: "Cooling 90 °C to 0 °C instead of 60 °C recovers three times more waste heat.",
    paper: 3, unit: "×",
    compute: () => ratioQ(0, 60),
    status: "reproduced-with-assumption",
    assumption: "Ambient taken as 0 °C here, while every figure uses 20 °C. At 20 °C the ratio is 2.33×.",
    note: "The abstract mixes two ambient temperatures (see the CZ claim below).",
  },
  {
    id: "COP-car-latent",
    where: "Sec. 5.1 and Fig. 3",
    statement: "Carnot COP for a latent source at 90 °C and a latent sink at 150 °C is 7.1.",
    paper: 7.1, unit: "–",
    compute: () => cops(PRESETS.fig3.scenario).carnot.value,
    status: "reproduced", preset: "fig3",
    note: "423.15 / (423.15 − 363.15) = 7.05.",
  },
  {
    id: "COP-lor-latent-text",
    where: "Sec. 5.1, text",
    statement: "Lorenz COP for the same latent–latent case is 3.8.",
    paper: 3.8, unit: "–",
    compute: () => cops(PRESETS.fig3.scenario).lorenz.value,
    status: "not-reproducible", preset: "fig3",
    note: "With isothermal source and sink the entropic mean temperatures equal T_H and T_0, so Lorenz equals Carnot (7.05).",
  },
  {
    id: "COP-lor-latent-fig",
    where: "Fig. 3, left",
    statement: "Lorenz COP for the latent–latent case is 4.9 (contradicts the 3.8 in the text).",
    paper: 4.9, unit: "–",
    compute: () => cops(PRESETS.fig3.scenario).lorenz.value,
    status: "not-reproducible", preset: "fig3",
    note: "The figure uses T̄_H = 438 K, which no stated sink temperature produces (150 °C = 423.15 K).",
  },
  {
    id: "T-H-ln-fig3",
    where: "Fig. 3, left",
    statement: "Entropic mean sink temperature T̄_H,ln = 438 K.",
    paper: 438, unit: "K",
    compute: () => refTemps(PRESETS.fig3.scenario).THM,
    status: "not-reproducible", preset: "fig3",
    note: "A latent sink at 150 °C has T̄_H = 423.15 K. 438 K (165 °C) matches no temperature in the paper.",
  },
  {
    id: "COP-lor-sens-text",
    where: "Sec. 5.2, text",
    statement: "Lorenz COP for source 90→60 °C and sink 110→150 °C is 6.9.",
    paper: 6.9, unit: "–",
    compute: () => cops(PRESETS.fig4.scenario).lorenz.value,
    status: "not-reproducible", preset: "fig4",
    note: "Eq. 11 gives 7.34, which is the value in Fig. 4 and the conclusion. The text contradicts the figure.",
  },
  {
    id: "COP-car-sens-text",
    where: "Sec. 5.2, text",
    statement: "Carnot COP for the same case is 4.9.",
    paper: 4.9, unit: "–",
    compute: () => cops(PRESETS.fig4.scenario).carnot.value,
    status: "not-reproducible", preset: "fig4",
    note: "Eq. 10 with the outlet temperatures gives 4.70, as in Fig. 4.",
  },
  {
    id: "COP-lor-fig4",
    where: "Fig. 4 and Sec. 6",
    statement: "Lorenz COP for source 90→60 °C and sink 110→150 °C is 7.3.",
    paper: 7.3, unit: "–",
    compute: () => cops(PRESETS.fig4.scenario).lorenz.value,
    status: "reproduced", preset: "fig4",
    note: "402.82 / (402.82 − 347.93) = 7.34.",
  },
  {
    id: "COP-car-fig4",
    where: "Fig. 4 and Sec. 6",
    statement: "Carnot COP for the same case is 4.7.",
    paper: 4.7, unit: "–",
    compute: () => cops(PRESETS.fig4.scenario).carnot.value,
    status: "reproduced", preset: "fig4",
    note: "423.15 / (423.15 − 333.15) = 4.70.",
  },
  {
    id: "T-HM-fig4",
    where: "Fig. 4",
    statement: "Entropic mean sink temperature 110→150 °C is 403 K.",
    paper: 403, unit: "K",
    compute: () => refTemps(PRESETS.fig4.scenario).THM,
    status: "reproduced", preset: "fig4",
    note: "Eq. 13.",
  },
  {
    id: "T-0M-fig4",
    where: "Figs. 4–7",
    statement: "Entropic mean source temperature 90→60 °C is 348 K.",
    paper: 348, unit: "K",
    compute: () => refTemps(PRESETS.fig4.scenario).T0M,
    status: "reproduced", preset: "fig4",
    note: "Eq. 12.",
  },
  {
    id: "COP-car-sens-latent",
    where: "Sec. 5.3, Fig. 5, abstract",
    statement: "Carnot COP for source 90→60 °C and steam at 150 °C is 4.7.",
    paper: 4.7, unit: "–",
    compute: () => cops(PRESETS.fig5.scenario).carnot.value,
    status: "reproduced", preset: "fig5",
    note: "Uses the source outlet, 60 °C.",
  },
  {
    id: "COP-lor-sens-latent",
    where: "Sec. 5.3, Fig. 5, abstract",
    statement: "Lorenz COP for source 90→60 °C and steam at 150 °C is 4.3.",
    paper: 4.3, unit: "–",
    compute: () => cops(PRESETS.fig5.scenario).lorenz.value,
    status: "not-reproducible", preset: "fig5",
    note: "With a latent sink, T̄_H = T_H and Lorenz equals AZL (5.63). Even Fig. 5's own inputs, 438/(438 − 348), give 4.87.",
  },
  {
    id: "COP-azl",
    where: "Sec. 5.3, Fig. 5, abstract",
    statement: "AZL COP for source 90→60 °C and steam at 150 °C is 5.6.",
    paper: 5.6, unit: "–",
    compute: () => cops(PRESETS.fig5.scenario).azl.value,
    status: "reproduced", preset: "fig5",
    note: "Eq. 16: 423.15 / (423.15 − 347.93) = 5.63. Eq. 16 is Eq. 11 with an isothermal sink.",
  },
  {
    id: "T-0AM",
    where: "Figs. 6–7",
    statement: "Entropic mean source temperature from 90 °C down to ambient is 327 K.",
    paper: 327, unit: "K",
    compute: () => refTemps(PRESETS.fig6.scenario).T0AM,
    status: "reproduced-with-assumption", preset: "fig6",
    assumption: "Ambient 20 °C (only stated in the Fig. 2 caption).",
    note: "Eq. 19.",
  },
  {
    id: "COP-cz",
    where: "Fig. 6",
    statement: "CZ COP for source 90 °C cooled to ambient and steam at 150 °C is 4.4.",
    paper: 4.4, unit: "–",
    compute: () => cops(PRESETS.fig6.scenario).cz.value,
    status: "reproduced-with-assumption", preset: "fig6",
    assumption: "Ambient 20 °C.",
    note: "Eq. 17: 423.15 / (423.15 − 326.90) = 4.40.",
  },
  {
    id: "COP-cz-abstract",
    where: "Abstract",
    statement: "Cooling the source from 90 °C to 0 °C limits the COP to about 4.4 (CZ).",
    paper: 4.4, unit: "–",
    compute: () => cops(at({ tAmb: 0, tSrcOut: 0 })).cz.value,
    status: "not-reproducible",
    note: "With 0 °C ambient, Eq. 17 gives 3.95. The 4.4 belongs to a 20 °C ambient.",
  },
  {
    id: "COP-lz-fig7",
    where: "Fig. 7, right",
    statement: "LZ COP for source to ambient and sink 110→150 °C, printed as \"COP_Car = 4.7\".",
    paper: 4.7, unit: "–",
    compute: () => cops(PRESETS.fig7.scenario).lz.value,
    status: "not-reproducible", preset: "fig7",
    note: "Eq. 18 gives 402.82 / (402.82 − 326.90) = 5.31. The panel header shows the CZ formula and a Carnot label.",
  },
  {
    id: "COP-car-wrong",
    where: "Sec. 6, conclusion",
    statement: "Carnot with sink outlet and source INLET (a common shortcut) gives 7.0.",
    paper: 7.0, unit: "–",
    compute: () => cops(at({ sourceType: "latent", sinkType: "latent" })).carnot.value,
    status: "reproduced",
    note: "423.15 / (423.15 − 363.15) = 7.05; the paper uses it as an example of a misleading reference.",
  },
  {
    id: "Ex-ratio",
    where: "Sec. 3",
    statement: "Exergy losses with isothermal heat absorption are up to 6 times higher than with a glide.",
    paper: 6, unit: "×",
    compute: () =>
      exLossSource(mcp500, 90, 60, 20, "isothermal", 5) / exLossSource(mcp500, 90, 60, 20, "glide", 5),
    status: "not-reproducible", preset: "fig5",
    note: "No case is given. The paper's own default case (90→60 °C, 5 K pinch, 20 °C ambient) gives about 4×. Use the pinch and outlet sliders to find where 6× is reached.",
  },
];

export const relDev = (c: Claim) => {
  const v = c.compute();
  return Math.abs(v - c.paper) / Math.abs(c.paper);
};
