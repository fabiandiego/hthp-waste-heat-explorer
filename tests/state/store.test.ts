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
