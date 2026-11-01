import { h, prefersReducedMotion } from "./dom";
import type { Store } from "../state/store";
import { PRESETS, type PresetId, type Scenario } from "../state/scenario";
import { createChart, fmt } from "../plots/svgchart";
import { buildTq, buildTds, buildSweep, buildTradeoff, COLOR, REF_NAME } from "../plots/specs";
import type { HxMode } from "../thermo/exergy";
import type { CopKey } from "../thermo/cop";
import { cycleSvg } from "../schematics/cycles";
import { EQUATIONS } from "../content/equations";
import { CLAIMS, relDev, type ClaimStatus } from "../content/claims";

const legend = (items: { label: string; color: string; dash?: boolean; hatch?: boolean }[]) =>
  h("div", { class: "legend" }, ...items.map((i) =>
    h("span", {}, h("i", { class: i.dash ? "dash" : "", style: `background:${i.color};color:${i.color}${i.hatch ? `;height:10px;background:repeating-linear-gradient(45deg, ${i.color} 0 2px, transparent 2px 5px)` : ""}` }), i.label)));

/** Tween a number from a to b over ms, calling fn each frame. Returns a cancel function. */
function tween(a: number, b: number, ms: number, fn: (v: number, done: boolean) => void): () => void {
  if (prefersReducedMotion()) {
    fn(b, true);
    return () => {};
  }
  let raf = 0;
  const t0 = performance.now();
  const step = (now: number) => {
    const f = Math.min(1, (now - t0) / ms);
    const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    fn(a + (b - a) * e, f >= 1);
    if (f < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/* ---------- Fig. 2: T - Q diagram with the cooling animation ---------- */
export function mountTq(host: HTMLElement, store: Store) {
  let mode: HxMode = "isothermal";
  const chartEl = h("div", {});
  const chart = createChart(chartEl);
  const modeBtns = (["isothermal", "glide"] as HxMode[]).map((m) =>
    h("button", { type: "button", "data-m": m, onclick: () => { mode = m; render(); } }, m === "isothermal" ? "Evaporator (vapour compression)" : "Gliding HX (rJC, RHP, AZL)"));
  const readout = h("div", { class: "readout", "aria-live": "polite" });
  let cancel = () => {};
  const play = h("button", { type: "button", class: "btn ghost" }, "▶ Animate cooling to ambient");
  play.addEventListener("click", () => {
    const s = store.get();
    if (s.sourceType === "latent") return;
    cancel();
    const start = s.tSrcIn - 1;
    cancel = tween(start, s.tAmb, 3600, (v, done) => store.set({ tSrcOut: done ? s.tAmb : Math.round(v * 2) / 2 }));
  });
  host.append(
    h("div", { class: "row" }, h("div", { class: "seg", role: "group", "aria-label": "Low-pressure heat exchanger type" }, ...modeBtns), play),
    chartEl,
    legend([
      { label: "Source stream (used part)", color: COLOR.src },
      { label: "Rest of the potential, down to ambient", color: "color-mix(in srgb, var(--src) 35%, transparent)" },
      { label: "Refrigerant", color: COLOR.cyc },
      { label: "Ambient", color: COLOR.amb, dash: true },
    ]),
    readout,
  );
  const render = () => {
    const s = store.get();
    const spec = buildTq(s, store.derived(), mode);
    chart.update(spec);
    modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.m === mode)));
    play.toggleAttribute("disabled", s.sourceType === "latent");
    const d = store.derived();
    readout.innerHTML = s.sourceType === "latent"
      ? `<span>Latent source: the temperature stays at <b>${s.tSrcIn} °C</b> while it condenses.</span>`
      : `<span>Heat used <b>${fmt(d.q.src, 0)} kW</b> (${fmt(d.q.share * 100, 0)} %)</span>
         <span>Exergy loss, evaporator <b>${fmt(spec.lossIso, 1)} kW</b></span>
         <span>gliding HX <b>${fmt(spec.lossGlide, 1)} kW</b></span>
         <span>ratio <b>${fmt(spec.lossIso / spec.lossGlide, 1)}×</b> (paper: "up to 6×")</span>`;
  };
  render();
  store.subscribe(render);
}

/* ---------- Figs. 3-7: T - dS diagram ---------- */
export function mountTds(host: HTMLElement, store: Store) {
  let key: CopKey | null = null;
  let zoom = false;
  const zoomBtns = [false, true].map((z) =>
    h("button", { type: "button", "data-z": String(z), onclick: () => { zoom = z; render(1); } }, z ? "Zoom to cycle" : "Axis from 0 K"));
  const chartEl = h("div", {});
  const chart = createChart(chartEl);
  const keyBtns = (["carnot", "lorenz", "azl", "cz", "lz"] as CopKey[]).map((k) =>
    h("button", { type: "button", "data-k": k, onclick: () => { key = k; render(1); } }, REF_NAME[k]));
  const readout = h("div", { class: "readout", "aria-live": "polite" });
  let cancel = () => {};
  const replay = h("button", { type: "button", class: "btn ghost" }, "▶ Replay cycle");
  replay.addEventListener("click", () => {
    cancel();
    cancel = tween(0.02, 1, 1800, (v) => render(v));
  });
  host.append(
    h("div", { class: "row" }, h("div", { class: "seg", role: "group", "aria-label": "Reference cycle" }, ...keyBtns), h("div", { class: "seg", role: "group", "aria-label": "Temperature axis" }, ...zoomBtns), replay),
    chartEl,
    legend([
      { label: "Reference cycle", color: "var(--ink)", dash: true },
      { label: "Source stream", color: COLOR.src },
      { label: "Sink stream", color: COLOR.sink },
      { label: "Source loss T_amb·ΔṠ", color: COLOR.src, hatch: true },
      { label: "Sink loss T_amb·ΔṠ", color: COLOR.sink, hatch: true },
    ]),
    readout,
  );
  const render = (progress = 1) => {
    const s = store.get();
    const d = store.derived();
    if (!key || !d.cops[key].valid) key = d.matchKey;
    const k = key;
    const spec = buildTds(s, k, progress, zoom);
    zoomBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.z === String(zoom))));
    chart.update(spec);
    keyBtns.forEach((b) => {
      const kk = b.dataset.k as CopKey;
      b.setAttribute("aria-pressed", String(kk === k));
      b.toggleAttribute("disabled", !d.cops[kk].valid);
    });
    const m = spec.model;
    readout.innerHTML = m.valid
      ? `<span>COP <b>${fmt(m.cop)}</b></span><span>Q̇_src <b>${fmt(m.qSrc, 0)} kW</b></span><span>Q̇_H <b>${fmt(m.qH, 0)} kW</b></span>
         <span>source loss <b>${fmt(m.exLossSrc, 1)} kW</b></span><span>sink loss <b>${fmt(m.exLossSink, 1)} kW</b></span>`
      : `<span>${REF_NAME[k]} does not apply to this case.</span>`;
  };
  render();
  store.subscribe(() => render());
}

/* ---------- COP sweep and heat trade-off ---------- */
export function mountSweeps(sweepHost: HTMLElement, tradeHost: HTMLElement, store: Store) {
  const sEl = h("div", {});
  const tEl = h("div", {});
  const sChart = createChart(sEl);
  const tChart = createChart(tEl);
  const note = h("p", { class: "hint" });
  const tNote = h("p", { class: "hint" });
  const sLeg = h("div", {});
  const tLeg = h("div", {});
  sweepHost.append(sEl, sLeg, note);
  tradeHost.append(tEl, tLeg, tNote);
  const legendOf = (spec: ReturnType<typeof buildSweep>) =>
    legend(spec.series.flatMap((x) => (x.kind === "line" ? [{ label: x.label, color: x.color, dash: !!x.dash }] : [])));
  const render = (s: Scenario) => {
    const latent = s.sourceType === "latent" || !(s.tSrcIn > s.tAmb);
    sEl.hidden = latent;
    tEl.hidden = latent;
    if (latent) {
      note.textContent = "These sweeps need a sensible source above ambient.";
      tNote.textContent = "";
      return;
    }
    const sw = buildSweep(s);
    const tr = buildTradeoff(s);
    sChart.update(sw);
    tChart.update(tr);
    sLeg.replaceChildren(legendOf(sw));
    tLeg.replaceChildren(legendOf(tr));
    const d = store.derived();
    note.textContent = `Carnot uses the outlet temperature, so it collapses fastest as the source is cooled. The dashed line is the ${d.fullKey ? REF_NAME[d.fullKey] : ""} limit, reached when the outlet hits ambient.`;
    tNote.textContent = `Lower COP, more heat: at ambient the ideal machine delivers ${fmt(d.q.sinkFull, 0)} kW instead of ${fmt(d.q.sinkMatch, 0)} kW now.`;
  };
  render(store.get());
  store.subscribe(render);
}

/* ---------- Schematics ---------- */
export function mountSchematics(host: HTMLElement, store: Store) {
  const playing = { on: false };
  const toggle = h("button", { type: "button", class: "btn ghost" });
  const fitPec = h("div", { class: "row" });
  const fitGas = h("div", { class: "row" });
  const pec = h("div", { class: "panel schem" }, h("h3", {}, "Vapour compression (Perkins/Evans)"), h("div", { html: cycleSvg("pec") }), fitPec,
    h("p", { class: "hint" }, "Isothermal evaporation fits a condensing source; a sensible source leaves a large temperature gap in the evaporator."));
  const gas = h("div", { class: "panel schem" }, h("h3", {}, "Gas cycle (reverse Joule/Brayton, RHP, AZL)"), h("div", { html: cycleSvg("gas") }), fitGas,
    h("p", { class: "hint" }, "Supercritical working fluid warms with a glide, tracking a cooling sensible source. AZL rejects heat isothermally for steam."));
  const grid = h("div", { class: "grid-2" }, pec, gas);
  host.append(h("div", { class: "row" }, toggle), grid);
  const setPlay = () => {
    host.classList.toggle("playing", playing.on);
    toggle.textContent = playing.on ? "⏸ Pause flow animation" : "▶ Play flow animation";
    toggle.toggleAttribute("disabled", prefersReducedMotion());
  };
  toggle.addEventListener("click", () => { playing.on = !playing.on; setPlay(); });
  setPlay();
  const chip = (good: boolean, text: string) => h("span", { class: `fit ${good ? "good" : "poor"}` }, `${good ? "✓" : "!"} ${text}`);
  const render = (s: Scenario) => {
    const srcLatent = s.sourceType === "latent";
    const sinkLatent = s.sinkType === "latent";
    fitPec.replaceChildren(chip(srcLatent, srcLatent ? "Source: matched" : "Source: temperature mismatch"), chip(sinkLatent, sinkLatent ? "Sink: matched" : "Sink: mismatch"));
    fitGas.replaceChildren(chip(!srcLatent, srcLatent ? "Source: mismatch" : "Source: matched"), chip(true, sinkLatent ? "Sink: AZL (isothermal)" : "Sink: rJC/RHP (glide)"));
  };
  render(store.get());
  store.subscribe(render);
}

/* ---------- Equations ---------- */
export function mountEquations(host: HTMLElement, store: Store) {
  const lives: { el: HTMLElement; fn: NonNullable<(typeof EQUATIONS)[number]["live"]> }[] = [];
  for (const e of EQUATIONS) {
    const live = e.live ? h("div", { class: "live" }) : null;
    if (live && e.live) lives.push({ el: live, fn: e.live });
    host.append(h("article", { class: "eq", id: `eq-${e.id}` },
      h("div", { class: "no" }, e.paperNo, e.badge ? h("span", { class: "badge" }, e.badge) : null),
      h("div", { class: "body" }, h("h3", {}, e.title), h("div", { html: e.mathml }), h("p", { class: "expl" }, e.explain), live)));
  }
  const render = () => {
    const s = store.get();
    const d = store.derived();
    for (const l of lives) l.el.textContent = l.fn(s, d) || "—";
  };
  render();
  store.subscribe(render);
}

/* ---------- Paper audit ---------- */
const STATUS: Record<ClaimStatus, { cls: string; icon: string; text: string }> = {
  reproduced: { cls: "ok", icon: "✓", text: "Reproduced" },
  "reproduced-with-assumption": { cls: "as", icon: "≈", text: "With assumption" },
  "not-reproducible": { cls: "no", icon: "✕", text: "Not reproducible" },
};

export function mountAudit(host: HTMLElement, store: Store, onLoad: () => void) {
  const count = (st: ClaimStatus) => CLAIMS.filter((c) => c.status === st).length;
  const summary = h("div", { class: "summary" },
    ...(Object.keys(STATUS) as ClaimStatus[]).map((st) => h("span", { class: `status ${STATUS[st].cls}` }, `${STATUS[st].icon} ${count(st)} ${STATUS[st].text.toLowerCase()}`)));
  const rows = CLAIMS.map((c) => {
    const v = c.compute();
    const st = STATUS[c.status];
    const load = c.preset
      ? h("button", { type: "button", class: "chip-btn", onclick: () => { store.set(scenarioOf(c.preset!)); onLoad(); } }, "Load case")
      : null;
    return h("tr", { id: `claim-${c.id}` },
      h("td", {}, h("div", {}, c.statement), h("div", { class: "where" }, c.where)),
      h("td", { class: "num", "data-label": "Paper" }, `${c.paper} ${c.unit === "–" ? "" : c.unit}`),
      h("td", { class: "num", "data-label": "Recomputed" }, `${fmt(v, Math.abs(v) >= 100 ? 1 : 2)} ${c.unit === "–" ? "" : c.unit}`),
      h("td", { class: "num", "data-label": "Dev." }, `${fmt(relDev(c) * 100, 1)} %`),
      h("td", {}, h("span", { class: `status ${st.cls}` }, `${st.icon} ${st.text}`)),
      h("td", {}, h("div", { class: "note" }, c.note), c.assumption ? h("div", { class: "note" }, h("b", {}, "Assumption: "), c.assumption) : null),
      h("td", {}, load));
  });
  host.append(summary,
    h("div", { class: "table-wrap" }, h("table", { class: "audit-table" },
      h("thead", {}, h("tr", {}, h("th", {}, "Paper states"), h("th", { class: "num" }, "Paper"), h("th", { class: "num" }, "Recomputed"), h("th", { class: "num" }, "Dev."), h("th", {}, "Status"), h("th", {}, "Why"), h("th", {}, ""))),
      h("tbody", {}, ...rows))));
}

const scenarioOf = (id: PresetId) => PRESETS[id].scenario;
