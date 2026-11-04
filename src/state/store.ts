import { DEFAULTS, PRESETS, RESET_GROUPS, normalize, type PresetId, type ResetGroup, type Scenario } from "./scenario";
import { referenceCops, refTemps, type CopKey, type CopResult, type RefTemps } from "../thermo/cop";
import { mcpFromQmax, qSource, qSink, pElectric } from "../thermo/heat";
import { exergySensible, exLossSource } from "../thermo/exergy";

export type Derived = {
  cops: Record<CopKey, CopResult>;
  temps: RefTemps;
  /** The glide-aware reference that fits this source/sink pair at the chosen outlet. */
  matchKey: CopKey;
  /** The same reference with the source used down to ambient (CZ or LZ), when it applies. */
  fullKey: CopKey | null;
  mcp: number;
  q: { src: number; max: number; share: number; sinkMatch: number; sinkFull: number; pelMatch: number; pelFull: number };
  ex: { srcUsed: number; srcFull: number; lossIso: number; lossGlide: number };
};

export function derive(s: Scenario): Derived {
  const cops = referenceCops(s);
  const temps = refTemps(s);
  const latentSrc = s.sourceType === "latent";
  const mcp = latentSrc ? NaN : mcpFromQmax(s.QmaxkW, s.tSrcIn, s.tAmb);
  const src = latentSrc ? s.QmaxkW : qSource(mcp, s.tSrcIn, s.tSrcOut);
  const max = s.QmaxkW;
  // The reference whose temperature shape matches both real streams at the current outlet:
  // isothermal sides for latent streams, entropic means for gliding ones.
  const latentSink = s.sinkType === "latent";
  const matchKey: CopKey = latentSink ? (latentSrc ? "carnot" : "azl") : "lorenz";
  const fullKey: CopKey | null = latentSrc ? null : latentSink ? "cz" : "lz";
  const copM = cops[matchKey].value;
  const copF = fullKey ? cops[fullKey].value : NaN;
  return {
    cops,
    temps,
    matchKey,
    fullKey,
    mcp,
    q: {
      src,
      max,
      share: max > 0 ? src / max : NaN,
      sinkMatch: qSink(src, copM),
      sinkFull: qSink(max, copF),
      pelMatch: pElectric(src, copM),
      pelFull: pElectric(max, copF),
    },
    ex: {
      srcUsed: latentSrc ? NaN : exergySensible(mcp, s.tSrcIn, s.tSrcOut, s.tAmb),
      srcFull: latentSrc ? NaN : exergySensible(mcp, s.tSrcIn, s.tAmb, s.tAmb),
      lossIso: latentSrc ? NaN : exLossSource(mcp, s.tSrcIn, s.tSrcOut, s.tAmb, "isothermal", s.pinch),
      lossGlide: latentSrc ? NaN : exLossSource(mcp, s.tSrcIn, s.tSrcOut, s.tAmb, "glide", s.pinch),
    },
  };
}

export type Store = {
  get(): Scenario;
  derived(): Derived;
  /** The paper figure whose inputs are loaded, or null for a custom case. */
  presetId(): PresetId | null;
  set(p: Partial<Scenario>): void;
  loadPreset(id: PresetId): void;
  /** Restore one input group, or every input when no group is given, to the Fig. 5 defaults. */
  reset(group?: ResetGroup): void;
  subscribe(fn: (s: Scenario, d: Derived) => void): () => void;
};

const sameScenario = (a: Scenario, b: Scenario) => (Object.keys(a) as (keyof Scenario)[]).every((k) => a[k] === b[k]);

/** The preset matching a scenario; keeps `prefer` when several presets share the same inputs (Figs. 4/7, 5/6). */
export function matchPreset(s: Scenario, prefer: PresetId | null = null): PresetId | null {
  if (prefer && sameScenario(s, normalize(PRESETS[prefer].scenario))) return prefer;
  for (const [id, p] of Object.entries(PRESETS)) if (sameScenario(s, normalize(p.scenario))) return id as PresetId;
  return null;
}

export function createStore(init?: Partial<Scenario>): Store {
  let s = normalize({ ...DEFAULTS, ...init });
  let d = derive(s);
  let preset = matchPreset(s);
  const subs = new Set<(s: Scenario, d: Derived) => void>();
  const commit = (next: Scenario, prefer: PresetId | null) => {
    s = normalize(next);
    d = derive(s);
    preset = matchPreset(s, prefer);
    subs.forEach((fn) => fn(s, d));
  };
  return {
    get: () => s,
    derived: () => d,
    presetId: () => preset,
    set(p) {
      commit({ ...s, ...p }, preset);
    },
    loadPreset(id) {
      commit({ ...PRESETS[id].scenario }, id);
    },
    reset(group) {
      if (!group) return commit({ ...DEFAULTS }, "fig5");
      const next = { ...s } as Record<keyof Scenario, unknown>;
      for (const k of RESET_GROUPS[group]) next[k] = DEFAULTS[k];
      commit(next as Scenario, preset);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/* Hash format: #s-<src l|s>-<sink l|s>-<tenths for each numeric field>, negatives as m<n>. */
const NUM_FIELDS = ["tSrcIn", "tSrcOut", "tSinkIn", "tSinkOut", "tAmb", "pinch", "QmaxkW"] as const;

export function encodeHash(s: Scenario): string {
  const nums = NUM_FIELDS.map((k) => {
    const v = Math.round(s[k] * 10);
    return v < 0 ? `m${-v}` : `${v}`;
  });
  return `#s-${s.sourceType[0]}-${s.sinkType[0]}-${nums.join("-")}`;
}

export function decodeHash(h: string): Scenario {
  const parts = h.replace(/^#/, "").split("-");
  if (parts[0] !== "s" || parts.length !== 3 + NUM_FIELDS.length) return { ...DEFAULTS };
  const kind = (c: string) => (c === "l" ? "latent" : c === "s" ? "sensible" : null);
  const src = kind(parts[1]);
  const sink = kind(parts[2]);
  if (!src || !sink) return { ...DEFAULTS };
  const out: Scenario = { ...DEFAULTS, sourceType: src, sinkType: sink };
  for (let i = 0; i < NUM_FIELDS.length; i++) {
    const raw = parts[3 + i];
    if (!/^m?\d+$/.test(raw)) return { ...DEFAULTS };
    const v = (raw.startsWith("m") ? -Number(raw.slice(1)) : Number(raw)) / 10;
    out[NUM_FIELDS[i]] = v;
  }
  return normalize(out);
}
