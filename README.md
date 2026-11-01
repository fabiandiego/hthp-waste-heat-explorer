# HTHP Waste-Heat Reference-COP Explorer

**Live page: https://fabiandiego.github.io/hthp-waste-heat-explorer/**

An interactive dashboard that reproduces, explores and audits this paper:

> G. Zotter (AEE INTEC), *Optimization of the utilization of different industrial waste heat streams via high temperature heat pumps*, 15th IEA Heat Pump Conference 2026, Vienna, AIP3.2. https://doi.org/10.23697/79kf-p342

---

## What it is

The paper asks which ideal cycle a high-temperature heat pump (HTHP) should be compared against. The answer depends on whether the waste-heat source and the heat sink exchange heat at one temperature (**latent**: condensing vapour, steam) or over a temperature range (**sensible**: hot water, flue gas, pressurised water).

| Reference COP | Source | Sink | Paper equation |
|---|---|---|---|
| Carnot | latent | latent | Eq. 10 |
| Lorenz | sensible | sensible | Eqs. 11–13 |
| AZL (Adler/Zotter/Längauer) | sensible | latent (steam) | Eq. 16 |
| **CZ** (new) | sensible, cooled to ambient | latent (steam) | Eqs. 17, 19 |
| **LZ** (new) | sensible, cooled to ambient | sensible | Eqs. 18, 19 |

The paper's central argument: a sensible waste-heat stream only gives up all of its heat if it is cooled to ambient. Doing so lowers the reference COP but raises the heat that can be delivered.

The dashboard turns every equation and figure of the paper into something you can change:

- every reference COP, recomputed live for any source, sink and ambient temperature;
- the paper's Figs. 2–7 as interactive charts, with presets that load each figure's inputs;
- schematics of the two cycle families from Fig. 1;
- all equations, with your current numbers substituted;
- an **audit** of all 24 numbers the paper prints, each recomputed and checked by an automated test.

## Why it was built

1. **To understand the paper by changing it.** Reference COPs are easy to misread from static figures. Moving the source outlet temperature and watching the COP fall while the delivered heat rises makes the trade-off concrete.
2. **To check it.** Several printed values do not follow from the paper's own equations and inputs. A reproduction that only copies the printed numbers would repeat those errors, so each value here is recomputed from the equations and the deviation is shown.
3. **To add the comparison the paper leaves out.** CZ and LZ are compared with AZL and Lorenz by COP alone, although they describe different amounts of recovered heat. The dashboard also shows the heat delivered, Q̇_H = Q̇_src · COP / (COP − 1), which is the fair basis for that comparison.

### What the audit found

Out of 24 numeric claims: **10 reproduced**, **5 reproduced only with an assumption** the paper does not state at that point (mostly a 20 °C ambient), and **9 not reproducible** from the paper's own inputs. Main findings:

- With isothermal source and sink, Lorenz must equal Carnot (7.05). The paper prints 3.8 in the text and 4.9 in Fig. 3.
- Sec. 5.2 text gives Lorenz 6.9 / Carnot 4.9; the equations and Fig. 4 give 7.34 / 4.70.
- Fig. 5's Lorenz COP of 4.3 cannot be reproduced. With a steam sink, Lorenz equals AZL (5.63).
- The abstract pairs "cooling to 0 °C" with COP_CZ ≈ 4.4, but 4.4 needs a 20 °C ambient; at 0 °C, CZ = 3.95.
- Fig. 7 labels the LZ panel as "COP_Car = 4.7" with the CZ formula; Eq. 18 gives 5.31.
- The "up to 6× higher exergy losses" claim has no stated case. For the paper's own stream the ratio is 4.1× at a 60 °C outlet and 8.6× when cooled to ambient.

The full table is in [REPRODUCTION.md](REPRODUCTION.md).

## How to use the page

**1. Pick a case.**
- Use the **Fig. 3 … Fig. 7** buttons to load the paper's inputs for each figure.
- Or set your own: source and sink type (sensible or latent), inlet and outlet temperatures, ambient, pinch, and the heat potential Q̇_max.
- Drag a slider, or click its value and type an exact number.
- On a phone, the inputs open from the **Edit case** bar at the bottom of the screen.

**2. Read the results.**
- **Headline:** heat delivered now vs. with the source cooled to ambient, and the ratio between the two.
- **COP cards:** all five reference COPs. The outlined card is the reference that matches your source and sink.
- **Paper chips** (✓ ≈ ✕) appear when a figure preset is loaded. They compare the live value with the value the paper prints. Click a chip to jump to its audit row.

**3. Explore the sections.** Use the bar at the top to move between them.

| Section | What it shows | Things to try |
|---|---|---|
| **Cycles** | Vapour compression vs. gas cycle (rJC, RHP, AZL), with a match indicator for your source and sink | Switch the source between sensible and latent; press ▶ to animate the flows |
| **Outlet & heat** (Fig. 2) | Source and refrigerant temperature against transferred heat, with the exergy lost in the heat exchanger | Toggle *Evaporator* vs *Gliding HX*; press ▶ *Animate cooling to ambient* |
| **T–ΔṠ** (Figs. 3–7) | Each reference cycle against the real streams; hatched bars are exergy losses (T_amb · ΔṠ) | Pick Carnot vs Lorenz to see where losses appear; use *Zoom to cycle*; ▶ *Replay cycle* |
| **COP vs heat** | Reference COP and delivered heat as the source outlet is lowered towards ambient | Hover the lines; compare the marker at ambient (CZ/LZ) with the current point |
| **Equations** | Eqs. 1–19 with live substitution; badges mark numbering errors in the paper | Change a temperature and watch the numbers update |
| **Paper audit** | Each printed number, recomputed, with status and reason | Click *Load case* to open the exact case behind a row |

**4. Share a case.** The address bar stores the current case, so copying the link reopens it.

Every chart has a **Show values** table for exact numbers and for keyboard and screen-reader use. The page follows your system's light or dark theme.

### Conventions used throughout

- T [K] = t [°C] + 273.15. Ambient is 20 °C unless you change it.
- Reference COPs are reversible and ignore the pinch, as in the paper. The pinch only affects the heat-exchanger views.
- Carnot uses the source and sink **outlet** temperatures (paper Sec. 5.2). Entropic mean temperatures follow Eqs. 12, 13 and 19.
- Q̇_max is the heat released when the stream is cooled to ambient; it fixes ṁ·c_p.
- In the T–ΔṠ view, a reversible cycle absorbs Q̇_src at its low mean temperature. Losses are T_amb times the entropy mismatch with the real source and sink streams. The paper does not state this model explicitly; it is this project's reading of its Gouy–Stodola argument.
- Not reproduced: Fig. 1's real-cycle state points (no fluid or component efficiencies are given), and the exact drawing pinch of Figs. 3–7 (footnote 1 leaves it open).

## How it was built

**Approach.** The project was planned first and then implemented test-first:

1. A written plan split the work into tasks, each with fixed function signatures and the exact numbers its tests had to hit.
2. The thermodynamics core was written as pure functions, with each test failing before the code that made it pass.
3. The user interface was built on top of a single scenario store.
4. A design critique (usability, hierarchy, consistency, accessibility) was carried out on the first version, and all of its findings were implemented.

The project was developed with Claude (Anthropic) as an AI pair programmer; commits are co-authored accordingly.

**Reproduction as tests.** Every numeric claim in the paper is an entry in `src/content/claims.ts`, and `tests/reproduction.test.ts` turns each one into a test:

- A claim marked *reproduced* must match the paper within 2 %.
- A claim marked *not reproducible* must stay more than 2 % off, so a later model change cannot quietly hide a discrepancy.
- `REPRODUCTION.md` and the dashboard's audit table are both generated from that same list.

**Architecture.**

```
src/thermo/     temperatures, reference COPs, heat, exergy, T–ΔṠ geometry (pure, tested)
src/state/      scenario, presets for Figs. 3–7, store, shareable URL hash
src/content/    equations (MathML) and the paper claims
src/plots/      SVG chart primitive and chart data builders (pure, tested)
src/ui/         controls, KPI cards, headline, sections
src/schematics/ cycle component drawings
tests/          68 tests: thermodynamics, store, chart data, one per paper claim
scripts/        single-file build and REPRODUCTION.md generator
```

A scenario object goes into the store. The store derives every COP, heat flow and exergy value once, and each view subscribes to the result. Charts are rebuilt from pure data builders, which is what makes them testable.

**Technology choices.**

- **TypeScript with no runtime dependencies.** Charts are hand-written SVG and equations use native MathML, so no charting or math library is loaded. The build produces one self-contained `dist/index.html` of about 75 kB that works offline once loaded. Only fonts come from Google Fonts.
- **[Bun](https://bun.sh)** runs the tests and bundles the page. Tests import from `vitest`, so they also run under Vitest.
- **Design:**
  - colour has a fixed meaning throughout: source = green, sink = red, ambient = slate;
  - the chart palette was checked for colour-blind separation, and colour is always paired with labels or patterns;
  - text contrast meets WCAG AA in both themes;
  - touch targets are 44 px;
  - the page respects reduced-motion settings.
- **Deployment:** GitHub Actions runs the tests, builds the page and publishes it to GitHub Pages on every push to `main`.

## Development

```bash
bun test                          # 68 tests
bun run typecheck                 # tsc --noEmit (needs TypeScript installed)
bun scripts/build.ts              # writes dist/index.html
bun scripts/gen-reproduction.ts   # regenerates REPRODUCTION.md from src/content/claims.ts
```

To change a model assumption, edit `src/thermo/`, run the tests, and regenerate `REPRODUCTION.md`. If a claim's status changes, update it in `src/content/claims.ts` together with its note.

The paper PDF is not included for copyright reasons. Get it via the DOI above and, if useful, keep it locally in `docs/source/` (git-ignored).

## References

- G. Zotter, 15th IEA Heat Pump Conference 2026, AIP3.2, https://doi.org/10.23697/79kf-p342
- H. Lorenz, *Beiträge zur Beurteilung von Kühlmaschinen*, Z. VDI 38 (1894)
- M. Reini, M. Casisi, *The Gouy-Stodola Theorem and the derivation of exergy revised*, Energy 210 (2020) 118486
- G. Zotter, B. Adler, A. Längauer, *A novel heat pumping cycle in a Rotation heat pump for latent process heat supply using sensible heat sources*, 16th IIR-Gustav Lorentzen Conference (2024), https://doi.org/10.18462/iir.gl2024.11113
