# HTHP Waste-Heat Reference-COP Explorer

Interactive reproduction and audit of:

> G. Zotter, *Optimization of the utilization of different industrial waste heat streams via high temperature heat pumps*, 15th IEA Heat Pump Conference 2026, AIP3.2. https://doi.org/10.23697/79kf-p342

The dashboard rebuilds the paper's reference cycles (Carnot, Lorenz, AZL and the proposed CZ and LZ), lets you change every source, sink and ambient temperature, and checks each number the paper prints against its own equations.

## What is in it

| Section | Paper | What you can do |
|---|---|---|
| Reference COPs and heat flows | Secs. 5.1–5.4 | Live COP cards, heat used, heat delivered, electric power |
| Why the outlet temperature matters | Sec. 3, Fig. 2 | T–Q̇ diagram, evaporator vs gliding HX, exergy-loss ratio, cooling animation |
| Two families of cycles | Sec. 2, Fig. 1 | Animated component schematics with source/sink fit indicators |
| Reference cycles in T–ΔṠ | Figs. 3–7 | Cycle picker, Gouy–Stodola loss bars, build-up animation |
| Lower COP, more heat | Sec. 5.4 | COP and delivered heat against source outlet temperature |
| Equations | Eqs. 1–19 | MathML equations with the current numbers substituted |
| Reproduction check | all | 24 printed numbers, status, deviation, reason, "load case" |

See [REPRODUCTION.md](REPRODUCTION.md) for the full claim table (10 reproduced, 5 reproduced with an assumption, 9 not reproducible).

## Model conventions

- T [K] = t [°C] + 273.15. Reference COPs are reversible and ignore the pinch, as in the paper; the pinch only affects the heat-exchanger views.
- Carnot uses source and sink outlet temperatures (Sec. 5.2). Entropic mean temperatures follow Eqs. 12, 13 and 19.
- Q̇_max is the heat released when the stream is cooled to ambient and fixes ṁ·c_p.
- Delivered heat Q̇_H = Q̇_src·COP/(COP−1) is an addition: the paper compares COPs of cases that use different amounts of heat.
- T–ΔṠ losses: a reversible cycle absorbs Q̇_src at its low mean temperature; losses are T_amb times the entropy mismatch with the real source and sink streams.

## Development

No runtime dependencies. Tooling: [Bun](https://bun.sh) (tests and bundling) and TypeScript.

```bash
bun test                      # 68 tests, including one per paper claim
bun run typecheck             # tsc --noEmit (requires typescript)
bun scripts/build.ts          # writes dist/index.html, a single self-contained page
bun scripts/gen-reproduction.ts   # regenerates REPRODUCTION.md from src/content/claims.ts
```

Layout:

```
src/thermo/     temperatures, reference COPs, heat, exergy, T–ΔṠ geometry (pure, tested)
src/state/      scenario, presets for Figs. 3–7, store, shareable URL hash
src/content/    equations (MathML) and the paper claims
src/plots/      SVG chart primitive and chart data builders
src/ui/         controls, KPI cards, sections
src/schematics/ cycle component drawings
tests/          bun/vitest-compatible tests
```

The URL hash encodes the case (`#s-<src>-<sink>-<tenths…>`), so a link reopens it.
