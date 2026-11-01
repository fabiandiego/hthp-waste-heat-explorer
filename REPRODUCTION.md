# Reproduction of Zotter (2026)

Paper: G. Zotter, *Optimization of the utilization of different industrial waste heat streams via high temperature heat pumps*, 15th IEA Heat Pump Conference 2026, AIP3.2, https://doi.org/10.23697/79kf-p342

This file is generated from `src/content/claims.ts` by `bun scripts/gen-reproduction.ts`.
Each row is pinned by a test in `tests/reproduction.test.ts`:

- **Reproduced**: the paper's equations with its stated inputs give the printed value within 2 %.
- **Reproduced with assumption**: the value matches only after supplying an input the paper does not state at that point.
- **Not reproducible**: no consistent set of the paper's inputs gives the printed value; the test asserts the deviation stays above 2 %.

Summary: 10 reproduced, 5 reproduced with an assumption, 9 not reproducible, out of 24 numeric claims.

## Conventions

- T [K] = t [°C] + 273.15. Reference COPs use no pinch (as in the paper).
- Carnot uses the source and sink outlet temperatures (Sec. 5.2). Entropic mean temperatures follow Eqs. 12, 13 and 19.
- Ambient temperature is 20 °C unless a row says otherwise.

## Claims

| Id | Where | Paper states | Paper | Recomputed | Deviation | Status | Note |
|---|---|---|---|---|---|---|---|
| `Q-90-60-vs-80` | Sec. 3, text | Cooling 90 °C water to 60 °C instead of 80 °C gives 200 % more heat. | 200 % | 200.0 % | 0.0 % | Reproduced | Pure ratio of temperature differences (Eq. 1); independent of flow rate. |
| `Q-fig2-80` | Fig. 2, top | Heat extracted down to 80 °C: 71 kW of a 500 kW potential. | 71 kW | 71.43 kW | 0.6 % | Reproduced with assumption | Capacity rate 500 kW / 70 K = 7.14 kW/K. Assumption: 500 kW means cooling to t_amb = 20 °C (stated in the Fig. 2 caption). |
| `Q-fig2-60` | Fig. 2, bottom | Heat extracted down to 60 °C: 214 kW of a 500 kW potential. | 214 kW | 214.3 kW | 0.1 % | Reproduced with assumption | Same capacity rate as above. Assumption: 500 kW means cooling to t_amb = 20 °C. |
| `Q-90-30-vs-60` | Sec. 6, conclusion | Cooling 90 °C wastewater to 30 °C instead of 60 °C gives two times more heat. | 2 × | 2.00 × | 0.0 % | Reproduced | Ratio of temperature differences. |
| `Q-90-0-vs-60` | Abstract and Sec. 6 | Cooling 90 °C to 0 °C instead of 60 °C recovers three times more waste heat. | 3 × | 3.00 × | 0.0 % | Reproduced with assumption | The abstract mixes two ambient temperatures (see the CZ claim below). Assumption: Ambient taken as 0 °C here, while every figure uses 20 °C. At 20 °C the ratio is 2.33×. |
| `COP-car-latent` | Sec. 5.1 and Fig. 3 | Carnot COP for a latent source at 90 °C and a latent sink at 150 °C is 7.1. | 7.1 – | 7.05 – | 0.7 % | Reproduced | 423.15 / (423.15 − 363.15) = 7.05. |
| `COP-lor-latent-text` | Sec. 5.1, text | Lorenz COP for the same latent–latent case is 3.8. | 3.8 – | 7.05 – | 85.6 % | Not reproducible | With isothermal source and sink the entropic mean temperatures equal T_H and T_0, so Lorenz equals Carnot (7.05). |
| `COP-lor-latent-fig` | Fig. 3, left | Lorenz COP for the latent–latent case is 4.9 (contradicts the 3.8 in the text). | 4.9 – | 7.05 – | 43.9 % | Not reproducible | The figure uses T̄_H = 438 K, which no stated sink temperature produces (150 °C = 423.15 K). |
| `T-H-ln-fig3` | Fig. 3, left | Entropic mean sink temperature T̄_H,ln = 438 K. | 438 K | 423.1 K | 3.4 % | Not reproducible | A latent sink at 150 °C has T̄_H = 423.15 K. 438 K (165 °C) matches no temperature in the paper. |
| `COP-lor-sens-text` | Sec. 5.2, text | Lorenz COP for source 90→60 °C and sink 110→150 °C is 6.9. | 6.9 – | 7.34 – | 6.4 % | Not reproducible | Eq. 11 gives 7.34, which is the value in Fig. 4 and the conclusion. The text contradicts the figure. |
| `COP-car-sens-text` | Sec. 5.2, text | Carnot COP for the same case is 4.9. | 4.9 – | 4.70 – | 4.0 % | Not reproducible | Eq. 10 with the outlet temperatures gives 4.70, as in Fig. 4. |
| `COP-lor-fig4` | Fig. 4 and Sec. 6 | Lorenz COP for source 90→60 °C and sink 110→150 °C is 7.3. | 7.3 – | 7.34 – | 0.5 % | Reproduced | 402.82 / (402.82 − 347.93) = 7.34. |
| `COP-car-fig4` | Fig. 4 and Sec. 6 | Carnot COP for the same case is 4.7. | 4.7 – | 4.70 – | 0.0 % | Reproduced | 423.15 / (423.15 − 333.15) = 4.70. |
| `T-HM-fig4` | Fig. 4 | Entropic mean sink temperature 110→150 °C is 403 K. | 403 K | 402.8 K | 0.0 % | Reproduced | Eq. 13. |
| `T-0M-fig4` | Figs. 4–7 | Entropic mean source temperature 90→60 °C is 348 K. | 348 K | 347.9 K | 0.0 % | Reproduced | Eq. 12. |
| `COP-car-sens-latent` | Sec. 5.3, Fig. 5, abstract | Carnot COP for source 90→60 °C and steam at 150 °C is 4.7. | 4.7 – | 4.70 – | 0.0 % | Reproduced | Uses the source outlet, 60 °C. |
| `COP-lor-sens-latent` | Sec. 5.3, Fig. 5, abstract | Lorenz COP for source 90→60 °C and steam at 150 °C is 4.3. | 4.3 – | 5.63 – | 30.8 % | Not reproducible | With a latent sink, T̄_H = T_H and Lorenz equals AZL (5.63). Even Fig. 5's own inputs, 438/(438 − 348), give 4.87. |
| `COP-azl` | Sec. 5.3, Fig. 5, abstract | AZL COP for source 90→60 °C and steam at 150 °C is 5.6. | 5.6 – | 5.63 – | 0.5 % | Reproduced | Eq. 16: 423.15 / (423.15 − 347.93) = 5.63. Eq. 16 is Eq. 11 with an isothermal sink. |
| `T-0AM` | Figs. 6–7 | Entropic mean source temperature from 90 °C down to ambient is 327 K. | 327 K | 326.9 K | 0.0 % | Reproduced with assumption | Eq. 19. Assumption: Ambient 20 °C (only stated in the Fig. 2 caption). |
| `COP-cz` | Fig. 6 | CZ COP for source 90 °C cooled to ambient and steam at 150 °C is 4.4. | 4.4 – | 4.40 – | 0.1 % | Reproduced with assumption | Eq. 17: 423.15 / (423.15 − 326.90) = 4.40. Assumption: Ambient 20 °C. |
| `COP-cz-abstract` | Abstract | Cooling the source from 90 °C to 0 °C limits the COP to about 4.4 (CZ). | 4.4 – | 3.95 – | 10.2 % | Not reproducible | With 0 °C ambient, Eq. 17 gives 3.95. The 4.4 belongs to a 20 °C ambient. |
| `COP-lz-fig7` | Fig. 7, right | LZ COP for source to ambient and sink 110→150 °C, printed as "COP_Car = 4.7". | 4.7 – | 5.31 – | 12.9 % | Not reproducible | Eq. 18 gives 402.82 / (402.82 − 326.90) = 5.31. The panel header shows the CZ formula and a Carnot label. |
| `COP-car-wrong` | Sec. 6, conclusion | Carnot with sink outlet and source INLET (a common shortcut) gives 7.0. | 7 – | 7.05 – | 0.7 % | Reproduced | 423.15 / (423.15 − 363.15) = 7.05; the paper uses it as an example of a misleading reference. |
| `Ex-ratio` | Sec. 3 | Exergy losses with isothermal heat absorption are up to 6 times higher than with a glide. | 6 × | 4.13 × | 31.1 % | Not reproducible | No case is given. For the paper's 90 °C stream with a 5 K pinch the ratio is 4.1× at a 60 °C outlet, reaches 6× near 43 °C and 8.6× when cooled to 20 °C ambient, so "up to 6" understates the full-cooling case the paper argues for. Drag the outlet slider in the Fig. 2 view to see it. |

## Not covered

- **Fig. 1** (six real cycles with non-isentropic compression): the paper gives no working fluid, pressures or component efficiencies, so it contains no numbers to reproduce. The dashboard shows schematic layouts only.
- **T–ΔṠ figure geometry (Figs. 3–7)**: footnote 1 says a larger pinch was used for the drawings without giving it. The dashboard rebuilds the diagrams from the reversible-cycle entropy balance, so shapes match qualitatively.
