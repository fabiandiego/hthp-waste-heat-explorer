/**
 * Writes REPRODUCTION.md from src/content/claims.ts so the document and the
 * dashboard's audit table can never drift apart. Run: bun scripts/gen-reproduction.ts
 */
import { CLAIMS, STATEMENTS, MATCH_TOLERANCE, relDev, type ClaimStatus } from "../src/content/claims";

const label: Record<ClaimStatus, string> = {
  reproduced: "Reproduced",
  "reproduced-with-assumption": "Reproduced with assumption",
  "not-reproducible": "Not reproducible",
};

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2));
const count = (s: ClaimStatus) => CLAIMS.filter((c) => c.status === s).length;

const rows = CLAIMS.map((c) => {
  const extra = (c.assumption ? ` **Assumption:** ${c.assumption}` : "") + (c.likelyCause ? ` **Likely cause:** ${c.likelyCause.text}` : "");
  return `| \`${c.id}\` | ${c.where} | ${c.statement} | ${c.paper} ${c.unit} | ${fmt(c.compute())} ${c.unit} | ${(relDev(c) * 100).toFixed(1)} % | ${label[c.status]} | ${c.note}${extra} |`;
});

const md = `# Reproduction of Zotter (2026)

Paper: G. Zotter, *Optimization of the utilization of different industrial waste heat streams via high temperature heat pumps*, 15th IEA Heat Pump Conference 2026, AIP3.2, https://doi.org/10.23697/79kf-p342

This file is generated from \`src/content/claims.ts\` by \`bun scripts/gen-reproduction.ts\`.
Each row is pinned by a test in \`tests/reproduction.test.ts\`:

- **Reproduced**: the paper's equations with its stated inputs give the printed value within ${MATCH_TOLERANCE * 100} %.
- **Reproduced with assumption**: the value matches only after supplying an input the paper does not state at that point.
- **Not reproducible**: no consistent set of the paper's inputs gives the printed value; the test asserts the deviation stays above ${MATCH_TOLERANCE * 100} %.

Summary: ${count("reproduced")} reproduced, ${count("reproduced-with-assumption")} reproduced with an assumption, ${count("not-reproducible")} not reproducible, out of ${CLAIMS.length} numeric claims.

## Conventions

- T [K] = t [°C] + 273.15. Reference COPs use no pinch (as in the paper).
- Carnot uses the source and sink outlet temperatures (Sec. 5.2). Entropic mean temperatures follow Eqs. 12, 13 and 19.
- Ambient temperature is 20 °C unless a row says otherwise.

## Claims

| Id | Where | Paper states | Paper | Recomputed | Deviation | Status | Note |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}

## The 180 °C pattern

Five of the non-reproducible values are reproduced exactly (within the paper's rounding) if the sink is taken as **180 °C** instead of the stated 150 °C:

| Printed | Where | Calculation that gives it |
|---|---|---|
| 438 K | Figs. 3 and 5, T̄_H,ln | Eq. 13 for a 150→180 °C sink: 30 / ln(453.15 / 423.15) = 437.98 K |
| 4.9 | Fig. 3, Lorenz | 437.98 / (437.98 − 347.93) = 4.86 |
| 4.3 | Fig. 5 and abstract, Lorenz | 453.15 / (453.15 − 347.93) = 4.31 |
| 3.8 | Sec. 5.1 text, Lorenz | 453.15 / (453.15 − 333.15) = 3.78 |

Fig. 3 also uses T̄_0,ln = 348 K, the mean of a 90→60 °C sensible source, for a source the caption calls latent. This is a hypothesis about how the numbers arose, checked by tests in \`tests/claims.test.ts\`; the paper does not state it. The Sec. 5.2 text values (Lorenz 6.9, Carnot 4.9) do not fit this or any other simple combination of the paper's temperatures.

## Statements and labels

${STATEMENTS.map((st) => `- **${st.where}:** ${st.statement} ${st.verdict}`).join("\n")}

## Not covered

- **Fig. 1** (six real cycles with non-isentropic compression): the paper gives no working fluid, pressures or component efficiencies, so it contains no numbers to reproduce. The dashboard shows schematic layouts only.
- **T–ΔṠ figure geometry (Figs. 3–7)**: footnote 1 says a larger pinch was used for the drawings without giving it. The dashboard rebuilds the diagrams from the reversible-cycle entropy balance, so shapes match qualitatively.
`;

await Bun.write("REPRODUCTION.md", md);
console.log(`REPRODUCTION.md written (${CLAIMS.length} claims)`);
