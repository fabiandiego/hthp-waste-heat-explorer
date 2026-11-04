# Reproduction of Zotter (2026)

Paper: G. Zotter, *Optimization of the utilization of different industrial waste heat streams via high temperature heat pumps*, 15th IEA Heat Pump Conference 2026, AIP3.2, https://doi.org/10.23697/79kf-p342

This file is generated from `src/content/claims.ts` by `bun scripts/gen-reproduction.ts`.
Each row is pinned by a test in `tests/reproduction.test.ts`:

- **Reproduced**: the paper's equations with its stated inputs give the printed value within 2 %.
- **Reproduced with assumption**: the value matches only after supplying an input the paper does not state at that point.
- **Not reproducible**: no consistent set of the paper's inputs gives the printed value; the test asserts the deviation stays above 2 %.

Summary: 13 reproduced, 2 reproduced with an assumption, 11 not reproducible, out of 26 numeric claims.

## Conventions

- T [K] = t [°C] + 273.15. Reference COPs use no pinch (as in the paper).
- Carnot uses the source and sink outlet temperatures (Sec. 5.2). Entropic mean temperatures follow Eqs. 12, 13 and 19.
- Ambient temperature is 20 °C unless a row says otherwise.

## Claims

| Id | Where | Paper states | Paper | Recomputed | Deviation | Status | Note |
|---|---|---|---|---|---|---|---|
| `Q-90-60-vs-80` | Sec. 3, text | Cooling 90 °C water to 60 °C instead of 80 °C gives 200 % more heat. | 200 % | 200.0 % | 0.0 % | Reproduced | Ratio of temperature differences (Eq. 1): (90 − 60) / (90 − 80) = 3, i.e. 200 % more. Independent of flow rate and ambient. |
| `Q-fig2-80` | Fig. 2, top | Heat extracted down to 80 °C: 71 kW of a 500 kW potential. | 71 kW | 71.43 kW | 0.6 % | Reproduced | The 500 kW bar runs to ambient, which the Fig. 2 caption gives as 20 °C: ṁc_p = 500 kW / 70 K = 7.14 kW/K, so 7.14 × 10 K = 71.4 kW. |
| `Q-fig2-60` | Fig. 2, bottom | Heat extracted down to 60 °C: 214 kW of a 500 kW potential. | 214 kW | 214.3 kW | 0.1 % | Reproduced | 7.14 kW/K × 30 K = 214.3 kW. |
| `Q-90-30-vs-60` | Sec. 6, conclusion | Cooling 90 °C wastewater to 30 °C instead of 60 °C gives two times more heat. | 2 × | 2.00 × | 0.0 % | Reproduced | (90 − 30) / (90 − 60) = 2. |
| `Q-90-0-vs-60` | Abstract and Sec. 6 | Cooling 90 °C to 0 °C instead of 60 °C recovers three times more waste heat. | 3 × | 3.00 × | 0.0 % | Reproduced | (90 − 0) / (90 − 60) = 3, whatever the ambient. The abstract pairs this 0 °C case with COP_CZ ≈ 4.4, which needs a 20 °C ambient (see the CZ abstract row). |
| `COP-car-latent` | Sec. 5.1 and Fig. 3 | Carnot COP for a latent source at 90 °C and a latent sink at 150 °C is 7.1. | 7.1 – | 7.05 – | 0.7 % | Reproduced | Eq. 10: 423.15 / (423.15 − 363.15) = 7.05. |
| `COP-lor-latent-text` | Sec. 5.1, text | Lorenz COP for the same latent–latent case is 3.8. | 3.8 – | 7.05 – | 85.6 % | Not reproducible | With isothermal source and sink the entropic mean temperatures equal T_H and T_0, so Lorenz equals Carnot (7.05). The text also contradicts its own Fig. 3, which prints 4.9. **Likely cause:** Matches if the sink is taken as 180 °C instead of 150 °C, over a 60 °C source: 453.15 / (453.15 − 333.15) = 3.78. |
| `COP-lor-latent-fig` | Fig. 3, left | Lorenz COP for the latent–latent case is 4.9. | 4.9 – | 7.05 – | 43.9 % | Not reproducible | Lorenz must equal Carnot here (7.05). The panel computes 438 K / (438 K − 348 K) with two mean temperatures that do not belong to this case (rows below). **Likely cause:** Matches if the sink is taken as 180 °C instead of 150 °C (glide 150→180 °C, T̄ = 437.98 K) and the 90→60 °C source mean: 437.98 / (437.98 − 347.93) = 4.86. |
| `T-H-ln-fig3` | Fig. 3, left | Entropic mean sink temperature T̄_H,ln = 438 K. | 438 K | 423.1 K | 3.4 % | Not reproducible | A latent sink at 150 °C has T̄_H = T_H = 423.15 K. **Likely cause:** Eq. 13 for a sink gliding from 150 °C to 180 °C: 30 / ln(453.15 / 423.15) = 437.98 K. |
| `T-0-ln-fig3` | Fig. 3, left | Entropic mean source temperature T̄_0,ln = 348 K for the latent 90 °C source. | 348 K | 363.1 K | 4.4 % | Not reproducible | A latent source at 90 °C has T̄_0 = T_0 = 363.15 K. **Likely cause:** The mean of a 90→60 °C sensible source (Eq. 12): 347.93 K, the Fig. 4–5 value. |
| `COP-lor-sens-text` | Sec. 5.2, text | Lorenz COP for source 90→60 °C and sink 110→150 °C is 6.9. | 6.9 – | 7.34 – | 6.4 % | Not reproducible | Eq. 11 gives 7.34, the value in Fig. 4 and the conclusion. The text contradicts the figure; no simple combination of the paper's temperatures gives 6.9. |
| `COP-car-sens-text` | Sec. 5.2, text | Carnot COP for the same case is 4.9. | 4.9 – | 4.70 – | 4.0 % | Not reproducible | Eq. 10 with the outlet temperatures gives 4.70, as in Fig. 4 and the conclusion. |
| `COP-lor-fig4` | Figs. 4 and 7, Sec. 6 | Lorenz COP for source 90→60 °C and sink 110→150 °C is 7.3. | 7.3 – | 7.34 – | 0.5 % | Reproduced | Eq. 11: 402.82 / (402.82 − 347.93) = 7.34. |
| `COP-car-fig4` | Fig. 4 and Sec. 6 | Carnot COP for the same case is 4.7. | 4.7 – | 4.70 – | 0.0 % | Reproduced | Eq. 10: 423.15 / (423.15 − 333.15) = 4.70. |
| `T-HM-fig4` | Figs. 4 and 7 | Entropic mean sink temperature 110→150 °C is 403 K. | 403 K | 402.8 K | 0.0 % | Reproduced | Eq. 13: 40 / ln(423.15 / 383.15) = 402.82 K. |
| `T-0M-fig4` | Figs. 4–7 | Entropic mean source temperature 90→60 °C is 348 K. | 348 K | 347.9 K | 0.0 % | Reproduced | Eq. 12: 30 / ln(363.15 / 333.15) = 347.93 K. |
| `COP-car-sens-latent` | Sec. 5.3, Fig. 5, abstract | Carnot COP for source 90→60 °C and steam at 150 °C is 4.7. | 4.7 – | 4.70 – | 0.0 % | Reproduced | Eq. 10 with the source outlet, 60 °C: 4.70. |
| `COP-lor-sens-latent` | Sec. 5.3, Fig. 5, abstract | Lorenz COP for source 90→60 °C and steam at 150 °C is 4.3. | 4.3 – | 5.63 – | 30.8 % | Not reproducible | With a latent sink, T̄_HM = T_H and Lorenz equals AZL (5.63). Fig. 5's own printed inputs, 438 / (438 − 348), give 4.87, not 4.3. **Likely cause:** Matches if the sink is taken as 180 °C instead of 150 °C: 453.15 / (453.15 − 347.93) = 4.31. |
| `T-H-ln-fig5` | Fig. 5, left | Entropic mean sink temperature T̄_H,ln = 438 K for steam at 150 °C. | 438 K | 423.1 K | 3.4 % | Not reproducible | A latent sink at 150 °C has T̄_H = T_H = 423.15 K; the Fig. 3 value was reused. **Likely cause:** Eq. 13 for a sink gliding from 150 °C to 180 °C: 437.98 K. |
| `COP-azl` | Sec. 5.3, Figs. 5–6, abstract | AZL COP for source 90→60 °C and steam at 150 °C is 5.6. | 5.6 – | 5.63 – | 0.5 % | Reproduced | Eq. 16: 423.15 / (423.15 − 347.93) = 5.63. Eq. 16 is Eq. 11 with an isothermal sink. |
| `T-0AM` | Figs. 6–7 | Entropic mean source temperature from 90 °C down to ambient is 327 K. | 327 K | 326.9 K | 0.0 % | Reproduced with assumption | Eq. 19: 70 / ln(363.15 / 293.15) = 326.90 K. **Assumption:** Ambient 20 °C; Figs. 6–7 and Sec. 5.4 do not state it (only the Fig. 2 caption does). |
| `COP-cz` | Fig. 6 | CZ COP for source 90 °C cooled to ambient and steam at 150 °C is 4.4. | 4.4 – | 4.40 – | 0.1 % | Reproduced with assumption | Eq. 17: 423.15 / (423.15 − 326.90) = 4.40. Fig. 6's caption calls this the "LZ-Cycle"; it is the CZ cycle. **Assumption:** Ambient 20 °C. |
| `COP-cz-abstract` | Abstract | Cooling the source from 90 °C to 0 °C limits the COP to about 4.4 (CZ). | 4.4 – | 3.95 – | 10.2 % | Not reproducible | With a 0 °C ambient, Eq. 17 gives 423.15 / (423.15 − 316.02) = 3.95. The 4.4 belongs to a 20 °C ambient. |
| `COP-lz-fig7` | Fig. 7, right | LZ COP for source to ambient and sink 110→150 °C, printed as "COP_Car = 4.7". | 4.7 – | 5.31 – | 12.9 % | Not reproducible | Eq. 18 gives 402.82 / (402.82 − 326.90) = 5.31. The panel's formula uses T_H instead of T̄_HM; with its own printed inputs (423 K, 327 K) it gives 4.40, which is CZ. The 4.7 under a Carnot label matches Fig. 4's Carnot COP. |
| `COP-car-wrong` | Sec. 6, conclusion | Carnot with sink outlet and source INLET (a common shortcut) gives 7.0. | 7 – | 7.05 – | 0.7 % | Reproduced | 423.15 / (423.15 − 363.15) = 7.05. Loaded here as a 90 °C latent source, which makes Carnot use 90 °C. The paper cites it as a misleading reference. |
| `Ex-ratio` | Sec. 3 | Exergy losses with isothermal heat absorption are up to 6 times higher than with a glide. | 6 × | 4.13 × | 31.1 % | Not reproducible | No case is given. For the paper's 90 °C stream with a 5 K pinch the ratio is 4.1× at a 60 °C outlet, reaches 6× near 43 °C and 8.6× when cooled to 20 °C ambient, so "up to 6" understates the full-cooling case the paper argues for. Drag the outlet slider in the Fig. 2 view to see it. |

## The 180 °C pattern

Five of the non-reproducible values are reproduced exactly (within the paper's rounding) if the sink is taken as **180 °C** instead of the stated 150 °C:

| Printed | Where | Calculation that gives it |
|---|---|---|
| 438 K | Figs. 3 and 5, T̄_H,ln | Eq. 13 for a 150→180 °C sink: 30 / ln(453.15 / 423.15) = 437.98 K |
| 4.9 | Fig. 3, Lorenz | 437.98 / (437.98 − 347.93) = 4.86 |
| 4.3 | Fig. 5 and abstract, Lorenz | 453.15 / (453.15 − 347.93) = 4.31 |
| 3.8 | Sec. 5.1 text, Lorenz | 453.15 / (453.15 − 333.15) = 3.78 |

Fig. 3 also uses T̄_0,ln = 348 K, the mean of a 90→60 °C sensible source, for a source the caption calls latent. This is a hypothesis about how the numbers arose, checked by tests in `tests/claims.test.ts`; the paper does not state it. The Sec. 5.2 text values (Lorenz 6.9, Carnot 4.9) do not fit this or any other simple combination of the paper's temperatures.

## Statements and labels

- **Sec. 5.4:** COP_CZ is lower than COP_AZL, and COP_LZ is lower than COP_Lor. True whenever the outlet is above ambient, because T̄_0AM < T̄_0M.
- **Sec. 5.4:** COP_CZ is lower than COP_Carnot. Only for outlets above T̄_0AM (53.8 °C for 90 °C and 20 °C ambient). True for the paper's 60 °C case (4.40 < 4.70), false at 40 °C (4.40 > 3.85).
- **Fig. 6 caption:** "Comparison of the Adler/Zotter/Längauer-Cycle and the LZ-Cycle … latent heat sink." The right panel is the CZ cycle (Eq. 17); LZ (Eq. 18) needs a sensible sink.
- **Figs. 6–7 captions:** Both captions give the source as "90 °C to 60 °C". True for the left panels (AZL, Lorenz). The right panels (CZ, LZ) cool the same stream to ambient.
- **Sec. 5.1, Fig. 3:** Carnot (7.1) is "significantly higher" than Lorenz for a latent source and latent sink. Not possible: with isothermal streams the entropic means equal T_0 and T_H, so Lorenz = Carnot exactly.
- **Secs. 3 and 5:** Equation cross-references in the text. Eq. 4 is printed twice; Sec. 3 cites Eq. 5 for sensible exergy (printed as the second Eq. 4); Sec. 5.4 cites Eq. 9 for Carnot (10), Eq. 10 for Lorenz (11), Eq. 15 for CZ (17) and Eq. 17 for LZ (18).

## Not covered

- **Fig. 1** (six real cycles with non-isentropic compression): the paper gives no working fluid, pressures or component efficiencies, so it contains no numbers to reproduce. The dashboard shows schematic layouts only.
- **T–ΔṠ figure geometry (Figs. 3–7)**: footnote 1 says a larger pinch was used for the drawings without giving it. The dashboard rebuilds the diagrams from the reversible-cycle entropy balance, so shapes match qualitatively.
