import { DEFAULTS, normalize, type Scenario } from "./scenario";
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
  const matchKey: CopKey = latentSrc ? "carnot" : s.sinkType === "latent" ? "azl" : "lorenz";
  const fullKey: CopKey | null = latentSrc ? null : s.sinkType === "latent" ? "cz" : "lz";
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
  set(p: Partial<Scenario>): void;
  subscribe(fn: (s: Scenario, d: Derived) => void): () => void;
};

export function createStore(init?: Partial<Scenario>): Store {
  let s = normalize({ ...DEFAULTS, ...init });
  let d = derive(s);
  const subs = new Set<(s: Scenario, d: Derived) => void>();
  return {
    get: () => s,
    derived: () => d,
    set(p) {
      s = normalize({ ...s, ...p });
      d = derive(s);
      subs.forEach((fn) => fn(s, d));
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
