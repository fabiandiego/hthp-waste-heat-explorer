/**
 * Component layouts for the two cycle families in the paper's Fig. 1.
 * Flow lines carry the class "flow" and animate when an ancestor has class "playing".
 */
export type CycleKind = "pec" | "gas";

const label = (x: number, y: number, t: string, cls = "lbl", anchor = "middle") =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;

const hx = (id: string, x: number, y: number, w: number, hgt: number, name: string, sub: string, below: boolean) =>
  `<g id="${id}"><rect class="comp" x="${x}" y="${y}" width="${w}" height="${hgt}" rx="4"/>
   <path d="M${x + 14} ${y + hgt / 2} q 12 -12 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0" fill="none" stroke="var(--ink-3)" stroke-width="1.2"/>
   ${label(x + w / 2, below ? y + hgt + 16 : y - 18, name)}${label(x + w / 2, below ? y + hgt + 30 : y - 5, sub, "lbl-s")}</g>`;

const arrowDefs = `<defs>
  <marker id="arr-src" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--src)"/></marker>
  <marker id="arr-sink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--sink)"/></marker>
</defs>`;

export function cycleSvg(kind: CycleKind): string {
  const W = 420;
  const H = 300;
  const common = `${arrowDefs}
    <path class="flow src" d="M12 236 H408" marker-end="url(#arr-src)"/>
    ${label(12, 260, "waste heat in", "lbl-s", "start")}${label(408, 260, "cooled out", "lbl-s", "end")}
    <path class="flow sink" d="M408 64 H12" marker-end="url(#arr-sink)"/>
    ${label(408, 52, "sink return", "lbl-s", "end")}${label(12, 52, "to process", "lbl-s", "start")}`;

  if (kind === "pec") {
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vapour compression cycle: evaporator, compressor, condenser, throttle valve">${common}
      ${hx("condenser", 110, 44, 200, 40, "Condenser", "isothermal heat rejection", false)}
      ${hx("evaporator", 110, 216, 200, 40, "Evaporator", "isothermal heat absorption", true)}
      <path class="pipe" d="M310 236 H360 V170"/><path class="pipe" d="M360 130 V64 H310"/>
      <path class="pipe" d="M110 64 H60 V132"/><path class="pipe" d="M60 168 V236 H110"/>
      <path class="flow ref" d="M310 236 H360 V170 M360 130 V64 H310 M110 64 H60 V132 M60 168 V236 H110"/>
      <g id="compressor"><circle class="comp" cx="360" cy="150" r="20"/><path d="M346 160 L374 154 M346 140 L374 146" stroke="var(--ink-2)" stroke-width="1.5"/></g>
      ${label(350, 196, "Compressor", "lbl", "end")}
      <g id="valve"><path class="comp" d="M48 132 L72 132 L48 168 L72 168 Z"/></g>
      ${label(70, 196, "Throttle valve", "lbl", "start")}
    </svg>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gas cycle: low-pressure heat exchanger, compressor, high-pressure heat exchanger, expander on a common shaft">${common}
    ${hx("hp-hx", 110, 44, 200, 40, "High-pressure HX", "AZL: isothermal · rJC/RHP: glide", false)}
    ${hx("lp-hx", 110, 216, 200, 40, "Low-pressure HX", "heat absorption with glide", true)}
    <path class="pipe" d="M310 236 H360 V176"/><path class="pipe" d="M360 124 V64 H310"/>
    <path class="pipe" d="M110 64 H60 V124"/><path class="pipe" d="M60 176 V236 H110"/>
    <path class="flow ref" d="M310 236 H360 V176 M360 124 V64 H310 M110 64 H60 V124 M60 176 V236 H110"/>
    <g id="compressor"><path class="comp" d="M342 176 L378 166 L378 134 L342 124 Z"/></g>
    <g id="expander"><path class="comp" d="M42 166 L78 176 L78 124 L42 134 Z"/></g>
    <path d="M78 150 H342" stroke="var(--ink-3)" stroke-width="3" stroke-dasharray="2 4"/>
    ${label(210, 144, "common shaft (expander work recovered)", "lbl-s")}
    ${label(350, 196, "Compressor", "lbl", "end")}${label(70, 196, "Expander", "lbl", "start")}
  </svg>`;
}
