import { describe, it, expect } from "vitest";
import { createStore, encodeHash, decodeHash, derive } from "../../src/state/store";
import { DEFAULTS, PRESETS, normalize } from "../../src/state/scenario";

describe("scenario store", () => {
  it("notifies subscribers once per set and stops after unsubscribe", () => {
    const st = createStore();
    let calls = 0;
    const off = st.subscribe(() => calls++);
    st.set({ tSrcOut: 50 });
    expect(calls).toBe(1);
    expect(st.get().tSrcOut).toBe(50);
    off();
    st.set({ tSrcOut: 40 });
    expect(calls).toBe(1);
  });

  it("normalizes impossible input (outlet above inlet, latent source)", () => {
    expect(normalize({ ...DEFAULTS, tSrcOut: 120 }).tSrcOut).toBe(90);
    expect(normalize({ ...DEFAULTS, sourceType: "latent", tSrcOut: 10 }).tSrcOut).toBe(90);
    expect(normalize({ ...DEFAULTS, tAmb: NaN }).tAmb).toBe(20);
  });

  it("derives Fig. 4 values from its preset", () => {
    const d = derive(PRESETS.fig4.scenario);
    expect(d.cops.lorenz.value).toBeCloseTo(7.339, 2);
    expect(d.q.src).toBeCloseTo(214.29, 1);
  });
});

describe("shareable hash", () => {
  it("round-trips the defaults and every preset", () => {
    expect(decodeHash(encodeHash(DEFAULTS))).toEqual(DEFAULTS);
    for (const p of Object.values(PRESETS)) expect(decodeHash(encodeHash(p.scenario))).toEqual(normalize(p.scenario));
  });

  it("round-trips negative ambient and half-kelvin pinch", () => {
    const s = { ...DEFAULTS, tAmb: -5, tSrcOut: -5, pinch: 2.5 };
    expect(decodeHash(encodeHash(s))).toEqual(s);
  });

  it("uses only letters, digits and hyphens", () => {
    expect(encodeHash({ ...DEFAULTS, tAmb: -5 })).toMatch(/^#[A-Za-z0-9-]+$/);
  });

  it("falls back to defaults for garbage", () => {
    expect(decodeHash("#garbage")).toEqual(DEFAULTS);
    expect(decodeHash("")).toEqual(DEFAULTS);
    expect(decodeHash("#s-x-y-1-2")).toEqual(DEFAULTS);
  });
});

describe("reference matching (review fixes)", () => {
  it("a latent source with a sensible sink matches Lorenz, not Carnot", () => {
    const s = { ...DEFAULTS, sourceType: "latent" as const, tSrcOut: 90, sinkType: "sensible" as const };
    const d = derive(s);
    expect(d.matchKey).toBe("lorenz");
    expect(d.cops.lorenz.value).toBeCloseTo(402.8191 / (402.8191 - 363.15), 3);
    expect(d.fullKey).toBe(null);
  });

  it("AZL is not applicable to a latent source (it would equal Carnot)", () => {
    const d = derive(PRESETS.fig3.scenario);
    expect(d.cops.azl.valid).toBe(false);
    expect(d.cops.azl.reason).toBe("not-applicable");
    expect(d.matchKey).toBe("carnot");
  });

  it("Figs. 6 and 7 use the paper's 90->60 C stream, so AZL and Lorenz keep the paper's values", () => {
    expect(PRESETS.fig6.scenario.tSrcOut).toBe(60);
    expect(PRESETS.fig7.scenario.tSrcOut).toBe(60);
    const d6 = derive(PRESETS.fig6.scenario);
    expect(d6.cops.azl.value).toBeCloseTo(5.626, 2);
    expect(d6.cops.cz.value).toBeCloseTo(4.396, 2);
    const d7 = derive(PRESETS.fig7.scenario);
    expect(d7.cops.lorenz.value).toBeCloseTo(7.339, 2);
    expect(d7.cops.lz.value).toBeCloseTo(5.306, 2);
    expect(PRESETS.fig6.focus).toBe("cz");
    expect(PRESETS.fig7.focus).toBe("lz");
  });

  it("tracks the loaded preset until an input changes", () => {
    const st = createStore();
    st.loadPreset("fig7");
    expect(st.presetId()).toBe("fig7");
    expect(st.get()).toEqual(normalize(PRESETS.fig7.scenario));
    st.set({ tAmb: 15 });
    expect(st.presetId()).toBe(null);
  });

  it("resets one group of inputs or everything", () => {
    const st = createStore({ tSrcIn: 120, tSrcOut: 50, tSinkOut: 180, tAmb: 5 });
    st.reset("source");
    expect(st.get().tSrcIn).toBe(DEFAULTS.tSrcIn);
    expect(st.get().tSrcOut).toBe(DEFAULTS.tSrcOut);
    expect(st.get().tSinkOut).toBe(180);
    st.reset();
    expect(st.get()).toEqual(DEFAULTS);
    expect(st.presetId()).toBe("fig5");
  });
});
