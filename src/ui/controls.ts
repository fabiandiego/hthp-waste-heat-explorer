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
  const out = h("output", { for: `in-${key}` });
  const input = h("input", { type: "range", id: `in-${key}`, min: lim.min, max: lim.max, step: lim.step, "aria-label": label }) as HTMLInputElement;
  const lab = h("span", {}, label);
  input.addEventListener("input", () => store.set({ [key]: Number(input.value) } as Partial<Scenario>));
  const wrap = h("div", { class: "ctl" }, h("label", { for: `in-${key}` }, lab, out), input);
  return {
    el: wrap,
    sync(s: Scenario, opts: { disabled?: boolean; label?: string } = {}) {
      input.value = String(s[key]);
      out.textContent = `${fmt(s[key], lim.step < 1 ? 1 : 0)} ${unit}`;
      input.disabled = !!opts.disabled;
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
    const card = h("div", { class: "kpi" },
      h("div", { class: "k-name" }, h("i", { class: "swatch", style: `background:${COLOR.ref[k]}` }), `COP ${REF_NAME[k]}`),
      val, sub);
    return { k, card, val, sub };
  });
  const heatCard = (name: string, color: string) => {
    const val = h("div", { class: "k-val" });
    const sub = h("div", { class: "k-sub" });
    const extra = h("div", {});
    return { card: h("div", { class: "kpi" }, h("div", { class: "k-name" }, h("i", { class: "swatch", style: `background:${color}` }), name), val, extra, sub), val, sub, extra };
  };
  const used = heatCard("Waste heat used", COLOR.src);
  const deliv = heatCard("Heat delivered", COLOR.sink);
  const full = heatCard("If cooled to ambient", COLOR.ref.cz);
  const pel = heatCard("Electric power", COLOR.cyc);
  const meter = h("div", { class: "meter", role: "meter", "aria-label": "Share of the waste heat used" }, h("i", {}));
  used.extra.append(meter);

  host.append(
    h("div", { class: "kpis" }, ...cards.map((c) => c.card)),
    h("div", { class: "heat" }, used.card, deliv.card, full.card, pel.card),
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
      c.sub.textContent = r.valid
        ? claim ? `Paper: ${claim.paper} · ${COP_DESC[c.k]}` : COP_DESC[c.k]
        : REASON[r.reason ?? ""] ?? "";
      c.card.title = c.k === d.matchKey ? "The reference that matches this source and sink" : "";
    }
    used.val.textContent = `${fmt(d.q.src, 0)} kW`;
    used.sub.textContent = s.sourceType === "latent" ? "latent source" : `${fmt(d.q.share * 100, 0)} % of ${fmt(d.q.max, 0)} kW potential`;
    (meter.firstChild as HTMLElement).style.width = `${Math.min(100, (d.q.share || 0) * 100)}%`;
    deliv.val.textContent = `${fmt(d.q.sinkMatch, 0)} kW`;
    deliv.sub.textContent = `ideal, ${REF_NAME[d.matchKey]} reference`;
    full.val.textContent = Number.isFinite(d.q.sinkFull) ? `${fmt(d.q.sinkFull, 0)} kW` : "—";
    full.sub.textContent = d.fullKey && Number.isFinite(d.q.sinkFull)
      ? `${REF_NAME[d.fullKey]} reference, ${fmt(d.q.sinkFull / d.q.sinkMatch, 1)}× the delivered heat`
      : "needs a sensible source above ambient";
    pel.val.textContent = `${fmt(d.q.pelMatch, 0)} kW`;
    pel.sub.textContent = Number.isFinite(d.q.pelFull) ? `${fmt(d.q.pelFull, 0)} kW if cooled to ambient` : "ideal cycle";
  };
  sync(store.get());
  store.subscribe(sync);
}
