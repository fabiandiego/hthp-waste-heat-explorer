import { h } from "./dom";
import { LIMITS, PRESETS, type HeatKind, type PresetId, type Scenario } from "../state/scenario";
import type { Store } from "../state/store";
import { CLAIMS } from "../content/claims";
import type { CopKey } from "../thermo/cop";
import { COLOR, REF_NAME } from "../plots/specs";
import { fmt } from "../plots/svgchart";

type NumKey = keyof typeof LIMITS;

function slider(store: Store, key: NumKey, label: string, unit: string) {
  const lim = LIMITS[key];
  const num = h("input", { type: "number", id: `num-${key}`, min: lim.min, max: lim.max, step: lim.step, inputmode: "decimal", "aria-label": `${label}, exact value in ${unit}` }) as HTMLInputElement;
  const input = h("input", { type: "range", id: `in-${key}`, min: lim.min, max: lim.max, step: lim.step, "aria-label": label }) as HTMLInputElement;
  const lab = h("label", { for: `in-${key}` }, label);
  input.addEventListener("input", () => store.set({ [key]: Number(input.value) } as Partial<Scenario>));
  num.addEventListener("change", () => {
    const v = Number(num.value);
    if (Number.isFinite(v) && num.value !== "") store.set({ [key]: v } as Partial<Scenario>);
    else num.value = String(store.get()[key]);
  });
  const wrap = h("div", { class: "ctl" }, h("div", { class: "row", style: "justify-content:space-between;font-size:0.88rem;color:var(--ink-2)" }, lab, h("span", { class: "val" }, num, unit)), input);
  return {
    el: wrap,
    sync(s: Scenario, opts: { disabled?: boolean; label?: string } = {}) {
      input.value = String(s[key]);
      if (document.activeElement !== num) num.value = String(s[key]);
      input.disabled = !!opts.disabled;
      num.disabled = !!opts.disabled;
      wrap.setAttribute("aria-disabled", String(!!opts.disabled));
      if (opts.label) lab.textContent = opts.label;
    },
  };
}

function kindToggle(store: Store, key: "sourceType" | "sinkType", label: string) {
  const btns = (["sensible", "latent"] as HeatKind[]).map((k) =>
    h("button", { type: "button", "data-k": k, onclick: () => store.set({ [key]: k } as Partial<Scenario>) }, k === "sensible" ? "Sensible" : "Latent"),
  );
  const el = h("div", { class: "seg", role: "group", "aria-label": label }, ...btns);
  return {
    el,
    sync(s: Scenario) {
      btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === s[key])));
    },
  };
}

const sameScenario = (a: Scenario, b: Scenario) => (Object.keys(a) as (keyof Scenario)[]).every((k) => a[k] === b[k]);

export function activePreset(s: Scenario): PresetId | null {
  for (const [id, p] of Object.entries(PRESETS)) if (sameScenario(s, p.scenario)) return id as PresetId;
  return null;
}

export function mountControls(host: HTMLElement, store: Store) {
  const srcKind = kindToggle(store, "sourceType", "Source heat type");
  const sinkKind = kindToggle(store, "sinkType", "Sink heat type");
  const sIn = slider(store, "tSrcIn", "Inlet t_src,in", "°C");
  const sOut = slider(store, "tSrcOut", "Outlet t_src,out", "°C");
  const kIn = slider(store, "tSinkIn", "Return t_H,in", "°C");
  const kOut = slider(store, "tSinkOut", "Supply t_H,out", "°C");
  const amb = slider(store, "tAmb", "Ambient t_amb", "°C");
  const pinch = slider(store, "pinch", "Pinch ΔT_pp (HX views)", "K");
  const qmax = slider(store, "QmaxkW", "Potential Q̇_max (to ambient)", "kW");

  const presetBtns = (Object.keys(PRESETS) as PresetId[]).map((id) =>
    h("button", { type: "button", class: "chip-btn", title: PRESETS[id].caption, onclick: () => store.set(PRESETS[id].scenario) }, PRESETS[id].label),
  );
  const presetCaption = h("p", { class: "hint" });

  host.append(
    h("h2", {}, "Operating case"),
    h("div", { class: "group" },
      h("div", { class: "eyebrow" }, "Paper cases"),
      h("div", { class: "presets" }, ...presetBtns),
      presetCaption,
    ),
    h("div", { class: "group" },
      h("div", { class: "group-title" }, h("i", { class: "swatch", style: `background:${COLOR.src}` }), "Waste heat source"),
      srcKind.el, sIn.el, sOut.el,
    ),
    h("div", { class: "group" },
      h("div", { class: "group-title" }, h("i", { class: "swatch", style: `background:${COLOR.sink}` }), "Heat sink"),
      sinkKind.el, kIn.el, kOut.el,
    ),
    h("div", { class: "group" },
      h("div", { class: "group-title" }, h("i", { class: "swatch", style: `background:${COLOR.amb}` }), "Surroundings"),
      amb.el, pinch.el, qmax.el,
      h("p", { class: "hint" }, "Reference COPs ignore the pinch, as in the paper. It only affects the heat-exchanger views."),
    ),
  );

  const sync = (s: Scenario) => {
    srcKind.sync(s);
    sinkKind.sync(s);
    sIn.sync(s);
    sOut.sync(s, { disabled: s.sourceType === "latent" });
    kIn.sync(s, { disabled: s.sinkType === "latent" });
    kOut.sync(s, { label: s.sinkType === "latent" ? "Steam temperature t_H" : "Supply t_H,out" });
    amb.sync(s);
    pinch.sync(s);
    qmax.sync(s, { label: s.sourceType === "latent" ? "Source heat Q̇_src" : "Potential Q̇_max (to ambient)" });
    const p = activePreset(s);
    presetBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(Object.keys(PRESETS)[i] === p)));
    presetCaption.textContent = p ? PRESETS[p].caption : "Custom case. Pick a figure to reload the paper's inputs.";
  };
  sync(store.get());
  store.subscribe(sync);
}

const COP_DESC: Record<CopKey, string> = {
  carnot: "isothermal source & sink",
  lorenz: "gliding source & sink",
  azl: "gliding source, latent sink",
  cz: "source to ambient, latent sink",
  lz: "source to ambient, sensible sink",
};

const REASON: Record<string, string> = {
  "no-lift": "No temperature lift",
  "not-applicable": "Not for this source/sink",
  "no-source": "Ambient ≥ source inlet",
};

export function mountKpis(host: HTMLElement, store: Store) {
  const keys: CopKey[] = ["carnot", "lorenz", "azl", "cz", "lz"];
  const cards = keys.map((k) => {
    const val = h("div", { class: "k-val" });
    const sub = h("div", { class: "k-sub" });
    const chip = h("a", { class: "kchip" });
    chip.hidden = true;
    const card = h("div", { class: "kpi" },
      h("div", { class: "k-name" }, h("i", { class: "swatch", style: `background:${COLOR.ref[k]}` }), `COP ${REF_NAME[k]}`),
      val, chip, sub);
    return { k, card, val, sub, chip };
  });
  const heatCard = (name: string, color: string) => {
    const val = h("div", { class: "k-val" });
    const sub = h("div", { class: "k-sub" });
    const extra = h("div", {});
    return { card: h("div", { class: "kpi" }, h("div", { class: "k-name" }, h("i", { class: "swatch", style: `background:${color}` }), name), val, extra, sub), val, sub, extra };
  };
  const used = heatCard("Waste heat used", COLOR.src);
  const pel = heatCard("Electric power", COLOR.cyc);
  const meter = h("div", { class: "meter", role: "meter", "aria-label": "Share of the waste heat used" }, h("i", {}));
  used.extra.append(meter);

  host.append(
    h("div", { class: "kpis" }, ...cards.map((c) => c.card)),
    h("div", { class: "heat" }, used.card, pel.card),
  );

  const sync = (s: Scenario) => {
    const d = store.derived();
    const preset = activePreset(s);
    for (const c of cards) {
      const r = d.cops[c.k];
      c.card.dataset.state = r.valid ? "ok" : "na";
      c.card.dataset.match = String(c.k === d.matchKey);
      c.val.textContent = r.valid ? fmt(r.value) : "—";
      const claim = preset ? CLAIMS.find((x) => x.preset === preset && x.copKey === c.k) : undefined;
      c.sub.textContent = r.valid ? COP_DESC[c.k] : REASON[r.reason ?? ""] ?? "";
      c.chip.hidden = !(r.valid && claim);
      if (r.valid && claim) {
        const st = claim.status === "reproduced" ? ["ok", "✓"] : claim.status === "not-reproducible" ? ["no", "✕"] : ["as", "≈"];
        c.chip.className = `kchip ${st[0]}`;
        c.chip.textContent = `${st[1]} paper ${claim.paper}`;
        c.chip.setAttribute("href", `#claim-${claim.id}`);
        c.chip.title = claim.status === "not-reproducible" ? "The paper prints a value its own equations do not give. See the audit row." : "Matches the paper.";
      }
      c.card.title = c.k === d.matchKey ? "The reference that matches this source and sink" : "";
    }
    used.val.textContent = `${fmt(d.q.src, 0)} kW`;
    used.sub.textContent = s.sourceType === "latent" ? "latent source" : `${fmt(d.q.share * 100, 0)} % of ${fmt(d.q.max, 0)} kW potential`;
    (meter.firstChild as HTMLElement).style.width = `${Math.min(100, (d.q.share || 0) * 100)}%`;
    pel.val.textContent = `${fmt(d.q.pelMatch, 0)} kW`;
    pel.sub.textContent = Number.isFinite(d.q.pelFull) ? `${fmt(d.q.pelFull, 0)} kW if cooled to ambient` : "ideal cycle";
  };
  sync(store.get());
  store.subscribe(sync);
}

/** The page's main result: heat delivered now vs. with the source cooled to ambient. */
export function mountHeadline(host: HTMLElement, store: Store) {
  const now = h("div", { class: "h-val" });
  const full = h("div", { class: "h-val" });
  const ratio = h("div", { class: "h-ratio" });
  const nowLab = h("div", { class: "h-lab" });
  const fullLab = h("div", { class: "h-lab" });
  const note = h("p", { class: "h-note" });
  host.className = "headline";
  host.setAttribute("aria-live", "polite");
  host.append(h("div", { class: "h-now" }, nowLab, now), h("div", { class: "h-arrow", "aria-hidden": "true" }, "→"), h("div", { class: "h-full" }, fullLab, full), ratio, note);
  const sync = (s: Scenario) => {
    const d = store.derived();
    const ok = d.fullKey && Number.isFinite(d.q.sinkFull) && Number.isFinite(d.q.sinkMatch);
    host.hidden = !ok;
    if (!ok || !d.fullKey) return;
    nowLab.textContent = `Now: to ${fmt(s.tSrcOut, 0)} °C · ${REF_NAME[d.matchKey]} COP ${fmt(d.cops[d.matchKey].value)}`;
    now.textContent = `${fmt(d.q.sinkMatch, 0)} kW`;
    fullLab.textContent = `To ambient ${fmt(s.tAmb, 0)} °C · ${REF_NAME[d.fullKey]} COP ${fmt(d.cops[d.fullKey].value)}`;
    full.textContent = `${fmt(d.q.sinkFull, 0)} kW`;
    ratio.textContent = `${fmt(d.q.sinkFull / d.q.sinkMatch, 1)}× heat`;
    note.textContent = "Heat delivered by an ideal machine on the same waste-heat stream. The lower COP still wins on heat because more of the stream is used.";
  };
  sync(store.get());
  store.subscribe(sync);
}

/** One-line case summary used by the mobile case bar. */
export function caseSummary(s: Scenario): string {
  const src = s.sourceType === "latent" ? `src ${s.tSrcIn} °C latent` : `src ${s.tSrcIn}→${s.tSrcOut} °C`;
  const sink = s.sinkType === "latent" ? `steam ${s.tSinkOut} °C` : `sink ${s.tSinkIn}→${s.tSinkOut} °C`;
  const p = activePreset(s);
  return `${p ? PRESETS[p].label + " · " : ""}${src} · ${sink} · amb ${s.tAmb} °C`;
}
