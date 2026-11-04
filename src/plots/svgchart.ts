/**
 * A small dependency-free SVG chart: one x and one y scale, gridlines,
 * direct labels, hatched rectangles and a crosshair tooltip.
 * Colours are CSS custom properties so both themes work without re-rendering.
 */
export type Pt = { x: number; y: number };

export type Series =
  | { kind: "line"; label: string; color: string; points: Pt[]; dash?: boolean | string; width?: number; opacity?: number; hover?: boolean; endLabel?: boolean; tag?: { at: number; text: string } }
  | { kind: "poly"; points: Pt[]; fill: string; opacity?: number; stroke?: string }
  | { kind: "hatch"; x0: number; x1: number; y0: number; y1: number; color: string; angle: 45 | 135; label?: string }
  | { kind: "marker"; x: number; y: number; color: string; label?: string; ring?: boolean; labelPos?: "right" | "above" | "below" }
  | { kind: "vline"; x: number; color: string; dash?: boolean; label?: string }
  | { kind: "hline"; y: number; color: string; dash?: boolean; label?: string }
  | { kind: "text"; x: number; y: number; text: string; anchor?: "start" | "middle" | "end"; color?: string; dy?: number };

export type ChartSpec = {
  x: { domain: [number, number]; label: string; unit?: string; ticks?: number[] };
  y: { domain: [number, number]; label: string; unit?: string; ticks?: number[] };
  series: Series[];
  aspect?: number;
  /** Text for screen readers. */
  summary: string;
};

const NS = "http://www.w3.org/2000/svg";
let hatchSeq = 0;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/** "Nice" tick values covering [a, b] with about n steps. */
export function niceTicks(a: number, b: number, n = 6): number[] {
  if (!(b > a)) return [a];
  const raw = (b - a) / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const step = (m >= 7.5 ? 10 : m >= 3.5 ? 5 : m >= 1.5 ? 2 : 1) * p;
  const out: number[] = [];
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

export function fmt(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "–";
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 100) return v.toFixed(digits > 1 ? 1 : 0);
  return v.toFixed(digits);
}

/** Linear interpolation of a polyline at x (points sorted or reverse-sorted by x). */
export function interpAt(points: Pt[], x: number): number {
  if (points.length === 0) return NaN;
  const pts = points[0].x <= points[points.length - 1].x ? points : [...points].reverse();
  if (x < pts[0].x || x > pts[pts.length - 1].x) return NaN;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (x <= b.x) return b.x === a.x ? b.y : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
  }
  return pts[pts.length - 1].y;
}

export type Chart = { update(spec: ChartSpec): void; destroy(): void };

export function createChart(host: HTMLElement): Chart {
  host.classList.add("chart");
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  let spec: ChartSpec | null = null;
  let W = 640;
  const M = { l: 58, r: 18, t: 14, b: 44 };
  let svg: SVGSVGElement | null = null;

  const render = () => {
    if (!spec) return;
    const aspect = spec.aspect ?? 1.7;
    const H = Math.round(W / (W < 560 ? Math.min(aspect, 1.25) : aspect));
    const [x0, x1] = spec.x.domain;
    const [y0, y1] = spec.y.domain;
    const sx = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r);
    const sy = (v: number) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);
    const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": spec.summary });
    const defs = el("defs");
    s.appendChild(defs);
    const clipId = `clip${++hatchSeq}`;
    const clip = el("clipPath", { id: clipId });
    clip.appendChild(el("rect", { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b }));
    defs.appendChild(clip);

    // Grid and axes
    const gx = el("g", { class: "tick" });
    const xt = spec.x.ticks ?? niceTicks(x0, x1, Math.max(3, Math.round(W / 110)));
    const yt = spec.y.ticks ?? niceTicks(y0, y1, 5);
    for (const v of yt) {
      gx.appendChild(el("line", { x1: M.l, x2: W - M.r, y1: sy(v), y2: sy(v) }));
      const t = el("text", { x: M.l - 8, y: sy(v) + 4, "text-anchor": "end" });
      t.textContent = fmt(v, Math.abs(y1 - y0) < 10 ? 1 : 0);
      gx.appendChild(t);
    }
    for (const v of xt) {
      const t = el("text", { x: sx(v), y: H - M.b + 18, "text-anchor": "middle" });
      t.textContent = fmt(v, Math.abs(x1 - x0) < 10 ? 1 : 0);
      gx.appendChild(t);
    }
    s.appendChild(gx);
    s.appendChild(el("line", { class: "axis-line", x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }));
    const xl = el("text", { class: "ax-title", x: (M.l + W - M.r) / 2, y: H - 6, "text-anchor": "middle" });
    xl.textContent = spec.x.label;
    s.appendChild(xl);
    const yl = el("text", { class: "ax-title", transform: `translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`, "text-anchor": "middle" });
    yl.textContent = spec.y.label;
    s.appendChild(yl);

    const plot = el("g", { "clip-path": `url(#${clipId})` });
    const labels = el("g");
    s.appendChild(plot);
    s.appendChild(labels);
    const path = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");

    for (const se of spec.series) {
      if (se.kind === "poly") {
        if (se.points.length < 2) continue;
        plot.appendChild(el("path", { d: path(se.points) + "Z", fill: se.fill, "fill-opacity": se.opacity ?? 0.18, stroke: se.stroke ?? "none", "stroke-width": 1.5 }));
      } else if (se.kind === "hatch") {
        if (!(se.x1 > se.x0)) continue;
        const id = `h${++hatchSeq}`;
        const pat = el("pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: `rotate(${se.angle})` });
        pat.appendChild(el("rect", { width: 6, height: 6, fill: se.color, "fill-opacity": 0.1 }));
        pat.appendChild(el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: se.color, "stroke-width": 2 }));
        defs.appendChild(pat);
        const xa = sx(se.x0), xb = sx(se.x1);
        plot.appendChild(el("rect", { x: xa, y: sy(se.y1), width: Math.max(1, xb - xa), height: Math.max(0, sy(se.y0) - sy(se.y1)), fill: `url(#${id})`, stroke: se.color, "stroke-width": 1 }));
        if (se.label) {
          const t = el("text", { x: (xa + xb) / 2, y: sy(se.y1) - 6, "text-anchor": "middle", class: "dlabel" });
          t.textContent = se.label;
          labels.appendChild(t);
        }
      } else if (se.kind === "line") {
        if (se.points.length < 2) continue;
        plot.appendChild(el("path", { d: path(se.points), fill: "none", stroke: se.color, "stroke-width": se.width ?? 2, "stroke-opacity": se.opacity ?? 1, "stroke-dasharray": typeof se.dash === "string" ? se.dash : se.dash ? "6 5" : "none", "stroke-linejoin": "round", "stroke-linecap": "round" }));
        if (se.tag) {
          const p = se.points[Math.min(se.points.length - 1, Math.max(0, Math.round(se.tag.at * (se.points.length - 1))))];
          const t = el("text", { x: sx(p.x), y: sy(p.y) - 7, class: "dlabel", "text-anchor": "middle" });
          t.style.fill = se.color;
          t.textContent = se.tag.text;
          labels.appendChild(t);
        }
        if (se.endLabel) {
          const p = se.points[se.points.length - 1];
          const t = el("text", { x: Math.min(sx(p.x) + 6, W - M.r), y: sy(p.y) - 6, class: "dlabel", "text-anchor": sx(p.x) > W - 120 ? "end" : "start" });
          t.textContent = se.label;
          labels.appendChild(t);
        }
      } else if (se.kind === "vline" || se.kind === "hline") {
        const isV = se.kind === "vline";
        const v = isV ? sx(se.x) : sy(se.y);
        plot.appendChild(el("line", isV ? { x1: v, x2: v, y1: M.t, y2: H - M.b } : { x1: M.l, x2: W - M.r, y1: v, y2: v }));
        const ln = plot.lastChild as SVGLineElement;
        ln.setAttribute("stroke", se.color);
        ln.setAttribute("stroke-width", "1.5");
        if (se.dash) ln.setAttribute("stroke-dasharray", "4 4");
        if (se.label) {
          const t = el("text", isV ? { x: v + 5, y: M.t + 12 } : { x: W - M.r - 4, y: v - 5, "text-anchor": "end" });
          t.textContent = se.label;
          labels.appendChild(t);
        }
      } else if (se.kind === "marker") {
        if (!Number.isFinite(se.x) || !Number.isFinite(se.y)) continue;
        labels.appendChild(el("circle", { cx: sx(se.x), cy: sy(se.y), r: 5, fill: se.ring ? "var(--surface)" : se.color, stroke: se.ring ? se.color : "var(--surface)", "stroke-width": 2 }));
        if (se.label) {
          const right = sx(se.x) < W - 140;
          const pos = se.labelPos ?? "right";
          const dy = pos === "above" ? -11 : pos === "below" ? 18 : 4;
          const dx = pos === "right" ? 9 : 4;
          const t = el("text", { x: sx(se.x) + (right ? dx : -dx), y: sy(se.y) + dy, class: "dlabel", "text-anchor": right ? "start" : "end" });
          t.textContent = se.label;
          labels.appendChild(t);
        }
      } else if (se.kind === "text") {
        const t = el("text", { x: sx(se.x), y: sy(se.y) + (se.dy ?? 0), "text-anchor": se.anchor ?? "start", class: "dlabel" });
        if (se.color) t.style.fill = se.color;
        t.textContent = se.text;
        labels.appendChild(t);
      }
    }

    // Crosshair + tooltip over every hoverable line
    const hoverLines = spec.series.filter((x): x is Extract<Series, { kind: "line" }> => x.kind === "line" && !!x.hover);
    if (hoverLines.length) {
      const cross = el("line", { y1: M.t, y2: H - M.b, stroke: "var(--ink-3)", "stroke-width": 1, visibility: "hidden" });
      const dots = el("g");
      s.appendChild(cross);
      s.appendChild(dots);
      const hit = el("rect", { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, fill: "transparent" });
      s.appendChild(hit);
      const cur = spec;
      const move = (ev: PointerEvent) => {
        const r = s.getBoundingClientRect();
        const px = ((ev.clientX - r.left) / r.width) * W;
        const xv = x0 + ((px - M.l) / (W - M.l - M.r)) * (x1 - x0);
        cross.setAttribute("x1", String(px));
        cross.setAttribute("x2", String(px));
        cross.setAttribute("visibility", "visible");
        dots.replaceChildren();
        const rows: string[] = [`<div class="tr">${cur.x.label}: ${fmt(xv, 1)}</div>`];
        for (const l of hoverLines) {
          const yv = interpAt(l.points, xv);
          if (!Number.isFinite(yv)) continue;
          dots.appendChild(el("circle", { cx: px, cy: sy(yv), r: 4, fill: l.color, stroke: "var(--surface)", "stroke-width": 2 }));
          rows.push(`<div class="tr"><i class="swatch" style="background:${l.color}"></i>${l.label}: ${fmt(yv)} ${cur.y.unit ?? ""}</div>`);
        }
        tip.innerHTML = rows.join("");
        tip.hidden = false;
        const hostR = host.getBoundingClientRect();
        const left = ev.clientX - hostR.left + 14;
        tip.style.left = `${Math.min(left, hostR.width - tip.offsetWidth - 4)}px`;
        tip.style.top = `${ev.clientY - hostR.top + 12}px`;
      };
      hit.addEventListener("pointermove", move);
      hit.addEventListener("pointerdown", move);
      hit.addEventListener("pointerleave", () => {
        tip.hidden = true;
        cross.setAttribute("visibility", "hidden");
        dots.replaceChildren();
      });
    }

    if (svg) svg.replaceWith(s);
    else host.prepend(s);
    svg = s;
    renderTable(spec);
  };

  // "Show values": the hoverable lines sampled at the x ticks, for keyboard and screen-reader users.
  const details = document.createElement("details");
  details.className = "dataview";
  details.innerHTML = "<summary>Show values</summary>";
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  details.appendChild(tableWrap);
  const renderTable = (sp: ChartSpec) => {
    const lines = sp.series.filter((x): x is Extract<Series, { kind: "line" }> => x.kind === "line" && !!x.hover);
    details.hidden = lines.length === 0;
    if (!lines.length || !details.open) return;
    const xs = niceTicks(sp.x.domain[0], sp.x.domain[1], 8);
    const head = `<tr><th class="num">${sp.x.label}</th>${lines.map((l) => `<th class="num">${l.label}${sp.y.unit ? ` [${sp.y.unit}]` : ""}</th>`).join("")}</tr>`;
    const body = xs.map((x) => `<tr><td class="num">${fmt(x, 1)}</td>${lines.map((l) => `<td class="num">${fmt(interpAt(l.points, x))}</td>`).join("")}</tr>`).join("");
    tableWrap.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
  };
  details.addEventListener("toggle", () => spec && renderTable(spec));

  host.appendChild(tip);
  host.appendChild(details);
  const ro = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver((e) => {
        const w = Math.round(e[0].contentRect.width);
        if (w > 0 && Math.abs(w - W) > 4) {
          W = w;
          render();
        }
      })
    : null;
  ro?.observe(host);
  W = Math.max(320, Math.round(host.clientWidth || 640));

  return {
    update(next) {
      spec = next;
      render();
    },
    destroy() {
      ro?.disconnect();
      host.replaceChildren();
    },
  };
}
