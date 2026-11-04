import type { Scenario } from "../state/scenario";
import type { Derived } from "../state/store";
import { toK } from "../thermo/temps";
import { fmt } from "../plots/svgchart";

/* Tiny MathML builders (MathML Core renders natively in current browsers). */
const mi = (x: string) => `<mi>${x}</mi>`;
const mn = (x: string | number) => `<mn>${x}</mn>`;
const mo = (x: string) => `<mo>${x}</mo>`;
const row = (...xs: string[]) => `<mrow>${xs.join("")}</mrow>`;
const frac = (a: string, b: string) => `<mfrac>${row(a)}${row(b)}</mfrac>`;
const sub = (b: string, s: string) => `<msub>${row(b)}${row(s)}</msub>`;
const bar = (x: string) => `<mover accent="true">${row(x)}<mo>¯</mo></mover>`;
const dot = (x: string) => `<mover accent="true">${row(x)}<mo>˙</mo></mover>`;
const txt = (x: string) => `<mtext>${x}</mtext>`;
const paren = (...xs: string[]) => row(mo("("), ...xs, mo(")"));
const ln = (...xs: string[]) => row(mi("ln"), mo("&#x2061;"), paren(...xs));
const T = (s: string) => sub(mi("T"), txt(s));
const t = (s: string) => sub(mi("t"), txt(s));
const Tb = (s: string) => sub(bar(mi("T")), txt(s));
const Q = (s: string) => sub(dot(mi("Q")), txt(s));
const mcp = row(dot(mi("m")), sub(mi("c"), mi("p")));
const eq = (...xs: string[]) => `<math display="block">${row(...xs)}</math>`;

export type Equation = {
  id: string;
  /** Number as printed in the paper ("—" for our additions). */
  paperNo: string;
  title: string;
  mathml: string;
  explain: string;
  /** Inconsistency in the paper about this equation, if any. */
  badge?: string;
  /** Full substitution with the current case. `realCop` is the user's measured COP, if entered. */
  live?: (s: Scenario, d: Derived, realCop: number | null) => string;
  /** One result for the collapsed row. */
  short?: (s: Scenario, d: Derived, realCop: number | null) => string;
  /** The card has an input for a measured COP (Eqs. 14-15). */
  takesRealCop?: boolean;
};

const S = (s: string) => sub(dot(mi("S")), txt(s));
const val = (r: { valid: boolean; value: number }) => (r.valid ? fmt(r.value) : "n/a");

const K = (v: number) => `${v.toFixed(2)} K`;
const kW = (v: number) => `${fmt(v, 1)} kW`;

export const EQUATIONS: Equation[] = [
  {
    id: "q-src", paperNo: "Eq. 1", title: "Sensible heat taken from the source",
    mathml: eq(Q("src"), mo("="), mcp, mo("⋅"), paren(t("src,in"), mo("−"), t("src,out"))),
    explain: "Heat released by a stream with constant capacity rate as it cools. Doubling the cooling range doubles the recovered heat.",
    live: (s, d) => s.sourceType === "latent" ? "Latent source: heat set directly by Q̇_max." : `${fmt(d.mcp, 3)} kW/K × (${s.tSrcIn} − ${s.tSrcOut}) = ${kW(d.q.src)}`,
    short: (_s, d) => kW(d.q.src),
  },
  {
    id: "q-max", paperNo: "Eq. 2", title: "Full potential: cool the stream to ambient",
    mathml: eq(Q("src,max"), mo("="), mcp, mo("⋅"), paren(t("src,in"), mo("−"), t("amb"))),
    explain: "The paper's starting point. Any heat left in the stream above ambient is rejected unused.",
    live: (s, d) => s.sourceType === "latent" ? "Latent source: no glide, the heat is Q̇_max." : `${fmt(d.mcp, 3)} kW/K × (${s.tSrcIn} − ${s.tAmb}) = ${kW(s.QmaxkW)}`,
    short: (s) => kW(s.QmaxkW),
  },
  {
    id: "q-entropy", paperNo: "Eq. 3", title: "Heat as mean temperature times entropy flow",
    mathml: eq(Q("src,max"), mo("="), row(mo("∮"), mi("T"), mo("⋅"), dot(mi("m")), mo("⋅"), mi("d"), mi("s")), mo("="), Tb("src"), mo("⋅"), dot(mi("m")), mo("⋅"), sub(mrowDelta("s"), txt("src"))),
    explain: "The heat of a gliding stream equals its entropic mean temperature times its entropy change. This is why areas in the T–ΔṠ diagram are heat flows.",
    live: (s, d) => s.sourceType === "latent" ? "" : `${K(d.temps.T0AM)} × ${fmt(d.mcp * Math.log(toK(s.tSrcIn) / toK(s.tAmb)), 4)} kW/K = ${kW(d.temps.T0AM * d.mcp * Math.log(toK(s.tSrcIn) / toK(s.tAmb)))}`,
  },
  {
    id: "t-mean", paperNo: "Eqs. 4, 12, 13, 19", title: "Entropic (logarithmic) mean temperature",
    mathml: eq(bar(mi("T")), mo("="), frac(row(T("in"), mo("−"), T("out")), ln(frac(T("in"), T("out"))))),
    explain: "The single temperature at which a reversible machine would exchange the same heat and the same entropy as the gliding stream. All glide-aware reference COPs are built from it. Eq. 4 applies it from the inlet down to ambient, Eq. 12 to the source, Eq. 13 to the sink (supply and return), Eq. 19 is Eq. 4 again.",
    live: (_s, d) => `T̄_0M = ${K(d.temps.T0M)}   T̄_HM = ${K(d.temps.THM)}   T̄_0AM = ${K(d.temps.T0AM)}`,
    short: (_s, d) => `T̄_0M ${K(d.temps.T0M)}`,
  },
  {
    id: "ex-sens", paperNo: "Eq. 4 (second)", title: "Exergy of sensible heat",
    mathml: eq(sub(dot(mi("Ex")), txt("src")), mo("="), Q("src"), mo("−"), T("amb"), mo("⋅"), mcp, mo("⋅"), ln(frac(T("in"), T("out")))),
    explain: "The work equivalent of the heat. Only a small part of a low-temperature stream's heat is exergy, which is why the reference temperature choice matters so much.",
    badge: "Printed as Eq. 4 twice; Sec. 3 cites it as Eq. 5",
    live: (_s, d) => Number.isFinite(d.ex.srcUsed) ? `used part: ${kW(d.ex.srcUsed)} of exergy   full stream: ${kW(d.ex.srcFull)}` : "Latent source: use Eq. 5.",
    short: (_s, d) => (Number.isFinite(d.ex.srcUsed) ? kW(d.ex.srcUsed) : ""),
  },
  {
    id: "ex-lat", paperNo: "Eq. 5", title: "Exergy of latent heat",
    mathml: eq(sub(dot(mi("Ex")), txt("latent")), mo("="), paren(mn(1), mo("−"), frac(T("amb"), T("src"))), mo("⋅"), Q("src")),
    explain: "A condensing source keeps one temperature, so the plain Carnot factor applies.",
    live: (s) => s.sourceType === "latent" ? `(1 − ${toK(s.tAmb).toFixed(2)} / ${toK(s.tSrcIn).toFixed(2)}) × ${kW(s.QmaxkW)} = ${kW((1 - toK(s.tAmb) / toK(s.tSrcIn)) * s.QmaxkW)}` : "Applies to a latent source.",
  },
  {
    id: "gouy", paperNo: "Eqs. 6, 8", title: "Gouy–Stodola exergy loss in a heat exchanger",
    mathml: eq(sub(dot(mi("Ex")), txt("loss")), mo("="), T("amb"), mo("⋅"), paren(sub(dot(mi("S")), txt("cold side")), mo("−"), sub(dot(mi("S")), txt("hot side")))),
    explain: "Entropy generated by transferring heat across a finite temperature difference, valued at ambient temperature. Matching the temperature profiles (a glide against a gliding stream) keeps it small.",
    live: (s, d) => Number.isFinite(d.ex.lossIso) ? `pinch ${fmt(s.pinch, 1)} K: evaporator ${kW(d.ex.lossIso)}   gliding HX ${kW(d.ex.lossGlide)}   ratio ${fmt(d.ex.lossIso / d.ex.lossGlide, 1)}×` : "",
    short: (_s, d) => (Number.isFinite(d.ex.lossIso) ? `${kW(d.ex.lossIso)} vs ${kW(d.ex.lossGlide)}` : ""),
  },
  {
    id: "heat-balance", paperNo: "Eq. 7", title: "Same heat, different entropy",
    mathml: eq(Q("src"), mo("="), Tb("src"), mo("⋅"), S("src"), mo("="), Tb("ref"), mo("⋅"), S("ref")),
    explain: "The refrigerant absorbs the heat the source gives off. If it does so at a lower mean temperature, it must take up more entropy, and the difference is generated entropy (Eq. 6).",
    live: (s, d) => Number.isFinite(d.ex.lossIso) ? `ΔṠ_src = ${fmt(d.q.src / d.temps.T0M, 4)} kW/K; evaporator at ${fmt(s.tSrcOut - s.pinch, 1)} °C: ΔṠ_ref = ${fmt(d.q.src / toK(s.tSrcOut - s.pinch), 4)} kW/K` : "",
  },
  {
    id: "cop", paperNo: "Eq. 9", title: "Coefficient of performance",
    mathml: eq(mi("COP"), mo("="), frac(Q("H"), sub(mi("P"), txt("el")))),
    explain: "Delivered heat per unit of electric power.",
  },
  {
    id: "carnot", paperNo: "Eq. 10", title: "Carnot reference (latent source and sink)",
    mathml: eq(sub(mi("COP"), txt("Carnot")), mo("="), frac(T("H"), row(T("H"), mo("−"), T("0")))),
    explain: "Isothermal heat absorption and rejection. Following Sec. 5.2, T_0 is the source outlet and T_H the sink outlet.",
    badge: "Cited as Eq. 9 in Sec. 5.4",
    live: (_s, d) => `${K(d.temps.TH)} / (${K(d.temps.TH)} − ${K(d.temps.T0)}) = ${val(d.cops.carnot)}`,
    short: (_s, d) => val(d.cops.carnot),
  },
  {
    id: "lorenz", paperNo: "Eq. 11", title: "Lorenz reference (sensible source and sink)",
    mathml: eq(sub(mi("COP"), txt("Lor")), mo("="), frac(Tb("HM"), row(Tb("HM"), mo("−"), Tb("0M")))),
    explain: "Carnot written with entropic mean temperatures. For an isothermal sink it becomes AZL; for isothermal source and sink it becomes Carnot.",
    badge: "Cited as Eq. 10 in Sec. 5.4",
    live: (_s, d) => `${K(d.temps.THM)} / (${K(d.temps.THM)} − ${K(d.temps.T0M)}) = ${val(d.cops.lorenz)}`,
    short: (_s, d) => val(d.cops.lorenz),
  },
  {
    id: "efficiency", paperNo: "Eqs. 14, 15", title: "Carnot and Lorenz efficiency factors",
    mathml: eq(sub(mi("ν"), txt("ref")), mo("="), frac(mi("COP"), sub(mi("COP"), txt("ref")))),
    explain: "A real machine's COP divided by the reference COP. The paper defines it for Carnot (Eq. 14) and Lorenz (Eq. 15); the same ratio works for every reference. Enter a measured or datasheet COP to compare.",
    takesRealCop: true,
    live: (_s, d, r) => {
      if (!(r && r > 0)) return "Enter a measured COP above.";
      const keys = ["carnot", "lorenz", "azl", "cz", "lz"] as const;
      return keys.filter((k) => d.cops[k].valid).map((k) => `ν_${k === "carnot" ? "Carnot" : k === "lorenz" ? "Lor" : k.toUpperCase()} = ${fmt(r / d.cops[k].value, 3)}`).join("   ");
    },
    short: (_s, d, r) => (r && r > 0 && d.cops[d.matchKey].valid ? `ν = ${fmt(r / d.cops[d.matchKey].value, 3)}` : ""),
  },
  {
    id: "azl", paperNo: "Eq. 16", title: "AZL reference (sensible source, latent sink)",
    mathml: eq(sub(mi("COP"), txt("AZL")), mo("="), frac(T("H"), row(T("H"), mo("−"), Tb("0M")))),
    explain: "Gliding heat absorption, isothermal heat rejection: the ideal steam-generating heat pump on a sensible source. Mathematically this is Eq. 11 with T̄_HM = T_H.",
    live: (_s, d) => d.cops.azl.valid ? `${K(d.temps.TH)} / (${K(d.temps.TH)} − ${K(d.temps.T0M)}) = ${fmt(d.cops.azl.value)}` : "Applies to a sensible source and a latent sink.",
    short: (_s, d) => val(d.cops.azl),
  },
  {
    id: "t0am", paperNo: "Eq. 19", title: "Mean source temperature down to ambient",
    mathml: eq(Tb("0AM"), mo("="), frac(row(T("0,in"), mo("−"), T("amb")), ln(frac(T("0,in"), T("amb"))))),
    explain: "The source's entropic mean temperature when all of its heat is used. It is lower than T̄_0M, so the new references give lower COPs for more heat.",
    live: (s, d) => `(${toK(s.tSrcIn).toFixed(2)} − ${toK(s.tAmb).toFixed(2)}) / ln(${toK(s.tSrcIn).toFixed(2)} / ${toK(s.tAmb).toFixed(2)}) = ${K(d.temps.T0AM)}`,
    short: (_s, d) => K(d.temps.T0AM),
  },
  {
    id: "cz", paperNo: "Eq. 17", title: "CZ reference (full sensible source, latent sink)",
    mathml: eq(sub(mi("COP"), txt("CZ")), mo("="), frac(T("H"), row(T("H"), mo("−"), Tb("0AM")))),
    explain: "AZL with the source cooled to ambient: the highest COP compatible with using all of the waste heat for steam.",
    badge: "Cited as Eq. 15 in Sec. 5.4",
    live: (_s, d) => d.cops.cz.valid ? `${K(d.temps.TH)} / (${K(d.temps.TH)} − ${K(d.temps.T0AM)}) = ${fmt(d.cops.cz.value)}` : "Applies to a sensible source above ambient and a latent sink.",
    short: (_s, d) => val(d.cops.cz),
  },
  {
    id: "lz", paperNo: "Eq. 18", title: "LZ reference (full sensible source, sensible sink)",
    mathml: eq(sub(mi("COP"), txt("LZ")), mo("="), frac(Tb("HM"), row(Tb("HM"), mo("−"), Tb("0AM")))),
    explain: "Lorenz with the source cooled to ambient, for hot-water or thermal-oil sinks.",
    badge: "Cited as Eq. 17 in Sec. 5.4; Fig. 7 uses T_H instead of T̄_HM",
    live: (_s, d) => d.cops.lz.valid ? `${K(d.temps.THM)} / (${K(d.temps.THM)} − ${K(d.temps.T0AM)}) = ${fmt(d.cops.lz.value)}` : "Applies to a sensible source above ambient and a sensible sink.",
    short: (_s, d) => val(d.cops.lz),
  },
  {
    id: "qh", paperNo: "— (added)", title: "Delivered heat and power for a given reference",
    mathml: eq(Q("H"), mo("="), Q("src"), mo("⋅"), frac(mi("COP"), row(mi("COP"), mo("−"), mn(1))), mspace(), sub(mi("P"), txt("el")), mo("="), frac(Q("src"), row(mi("COP"), mo("−"), mn(1)))),
    explain: "Energy balance Q̇_H = Q̇_src + P_el. The paper compares COPs across cases that use different amounts of heat; comparing Q̇_H shows what cooling to ambient actually buys.",
    live: (_s, d) => `matching reference: ${kW(d.q.sinkMatch)} delivered, ${kW(d.q.pelMatch)} electric` + (Number.isFinite(d.q.sinkFull) ? `   source to ambient: ${kW(d.q.sinkFull)} delivered, ${kW(d.q.pelFull)} electric` : ""),
    short: (_s, d) => kW(d.q.sinkMatch),
  },
];

function mrowDelta(x: string): string {
  return row(mo("Δ"), mi(x));
}

function mspace(): string {
  return `<mspace width="2em"></mspace>`;
}
