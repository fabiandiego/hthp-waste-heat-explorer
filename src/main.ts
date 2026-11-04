import { createStore, decodeHash, encodeHash } from "./state/store";
import { h } from "./ui/dom";
import { mountControls, mountKpis, mountHeadline, caseSummary } from "./ui/controls";
import { mountTq, mountTds, mountSweeps, mountSchematics, mountEquations, mountAudit } from "./ui/sections";
import { CLAIMS } from "./content/claims";

const DOI = "https://doi.org/10.23697/79kf-p342";

function readHash(): string {
  try { return location.hash; } catch { return ""; }
}

const store = createStore(decodeHash(readHash()));

// Keep the case in the URL so a link reopens it.
let hashTimer = 0;
store.subscribe((s) => {
  clearTimeout(hashTimer);
  hashTimer = window.setTimeout(() => {
    try { history.replaceState(null, "", encodeHash(s)); } catch { /* frame may forbid it */ }
  }, 250);
});
window.addEventListener("hashchange", () => {
  const h = readHash();
  if (h.startsWith("#s-")) store.set(decodeHash(h));
});

const SECTIONS: [string, string][] = [
  ["overview", "Results"], ["cycles", "Cycles"], ["potential", "Outlet & heat"], ["tds", "T–ΔṠ"],
  ["tradeoff", "COP vs heat"], ["equations", "Equations"], ["audit", "Paper audit"],
];

const section = (id: string, eyebrow: string, title: string, lede: string, ...body: Node[]) =>
  h("section", { id, "aria-labelledby": `${id}-h` },
    h("div", { class: "sec-head" }, h("div", { class: "eyebrow" }, eyebrow), h("h2", { id: `${id}-h` }, title), h("p", {}, lede)),
    ...body);

const notRepro = CLAIMS.filter((c) => c.status === "not-reproducible").length;

const app = document.getElementById("app")!;
const rail = h("aside", { class: "rail", "aria-label": "Inputs" });
const kpis = h("div", { style: "display:grid;gap:10px" });
const headline = h("div", {});
const tq = h("div", { class: "panel" });
const tds = h("div", { class: "panel" });
const sweep = h("div", { class: "panel" }, h("h3", {}, "Reference COP against source outlet"));
const trade = h("div", { class: "panel" }, h("h3", {}, "What a lower outlet buys: heat delivered"));
const schem = h("div", { style: "display:grid;gap:12px" });
const eqs = h("div", { class: "eqs" });
const audit = h("div", { style: "display:grid;gap:12px" });

app.append(
  h("header", { class: "masthead" }, h("div", { class: "wrap" },
    h("div", { class: "eyebrow" }, "15th IEA Heat Pump Conference 2026 · AIP3.2 · interactive reproduction"),
    h("h1", {}, "Waste Heat to Steam: Reference COPs"),
    h("p", { class: "lede" }, "A sensible waste-heat stream only gives up all its heat if it is cooled to ambient. This dashboard rebuilds the paper's reference cycles (Carnot, Lorenz, AZL and the new CZ and LZ), lets you move every temperature, and checks each number the paper prints."),
    h("div", { class: "thesis" },
      h("span", {}, h("b", {}, "Source: "), "how far you cool it sets the heat you get"),
      h("span", {}, h("b", {}, "Reference: "), "must match source and sink shape"),
      h("span", {}, h("b", {}, "Audit: "), h("a", { href: "#audit" }, `${notRepro} of ${CLAIMS.length} printed numbers do not follow from the paper's own inputs →`))),
    h("p", { class: "cite" }, "G. Zotter (AEE INTEC), Optimization of the utilization of different industrial waste heat streams via high temperature heat pumps. ",
      h("a", { href: DOI, target: "_blank", rel: "noopener" }, "doi:10.23697/79kf-p342")))),
  h("nav", { class: "toc", "aria-label": "Sections" }, h("div", { class: "wrap" },
    ...SECTIONS.map(([id, name]) => h("a", { href: `#${id}`, "data-sec": id }, name)))),
  h("div", { class: "wrap shell" },
    rail,
    h("main", {},
      section("overview", "Results for this case", "Reference COPs and heat flows", "The outlined card is the reference that matches this source and sink. Chips compare with the value the paper prints for this figure.", headline, kpis),
      section("cycles", "Sec. 2 · Fig. 1", "Two families of heat-pump cycles", "Which layout fits depends on whether the source and sink give or take heat at one temperature (latent) or over a range (sensible).", schem),
      section("potential", "Sec. 3 · Fig. 2", "Why the outlet temperature matters", "Heat taken from a sensible stream grows linearly with how far you cool it. An evaporator sits below the coldest point of the stream, so the gap to the hot end is lost exergy. A gas cycle glides alongside the stream.", tq),
      section("tds", "Sec. 5 · Figs. 3–7", "Reference cycles in the T–ΔṠ diagram", "With the axis from 0 K, as in the paper, every area is a heat flow, and the hatched bars from 0 K to ambient are the exergy lost against the real streams (Gouy–Stodola). Zoom in to read the cycle itself.", tds),
      section("tradeoff", "Sec. 5.4 · CZ and LZ", "Lower COP, more heat", "CZ and LZ give lower COPs than AZL and Lorenz because the source mean temperature drops. The fair comparison is the heat delivered, which the paper does not plot.", h("div", { class: "grid-2" }, sweep, trade)),
      section("equations", "Eqs. 1–19", "The equations, with your numbers", "Each live line substitutes the current case. Badges mark numbering errors in the paper.", eqs),
      section("audit", "Reproduction check", "Every number the paper prints", "Each row is recomputed from the paper's equations and pinned by an automated test. Rows that do not reproduce stay flagged; load a case to see why.", audit),
    )),
  h("footer", {}, h("div", { class: "wrap" },
    h("p", {}, "Conventions: T [K] = t [°C] + 273.15. Carnot uses source and sink outlet temperatures (Sec. 5.2). Ambient 20 °C unless changed. Reference COPs ignore the pinch."),
    h("p", {}, "Not covered: Fig. 1's real-cycle state points (no fluid or efficiencies are given) and the exact drawing pinch of Figs. 3–7 (footnote 1 leaves it open)."),
    h("p", {}, "References cited in the dashboard: Carnot (1824/1890), Lorenz (1894, Z VDI 38), Reini & Casisi (2020, Energy 210) for Gouy–Stodola, Zotter, Adler & Längauer (2024, IIR Gustav Lorentzen Conf.) for the AZL cycle."))),
);

// Mobile: the inputs live in a sheet opened from a sticky case bar.
const closeBtn = h("button", { type: "button", class: "btn ghost rail-close" }, "Done");
rail.prepend(closeBtn);
const cbSum = h("span", { class: "cb-sum" });
const openBtn = h("button", { type: "button", class: "btn", "aria-controls": "rail", "aria-expanded": "false" }, "Edit case");
rail.id = "rail";
const casebar = h("div", { class: "casebar" }, cbSum, openBtn);
document.body.append(casebar);
let scrim: HTMLElement | null = null;
const setSheet = (open: boolean) => {
  rail.classList.toggle("open", open);
  openBtn.setAttribute("aria-expanded", String(open));
  if (open && !scrim) {
    scrim = h("div", { class: "scrim", onclick: () => setSheet(false) });
    document.body.append(scrim);
    closeBtn.focus();
  } else if (!open && scrim) {
    scrim.remove();
    scrim = null;
    openBtn.focus();
  }
};
openBtn.addEventListener("click", () => setSheet(true));
closeBtn.addEventListener("click", () => setSheet(false));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && rail.classList.contains("open")) setSheet(false); });
const syncBar = () => (cbSum.textContent = caseSummary(store.get(), store.presetId()));
syncBar();
store.subscribe(syncBar);

// Highlight the section in view.
if (typeof IntersectionObserver !== "undefined") {
  const links = [...document.querySelectorAll<HTMLAnchorElement>(".toc a")];
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", String(a.dataset.sec === en.target.id)));
  }, { rootMargin: "-30% 0px -60% 0px" });
  SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
}

mountControls(rail, store);
mountHeadline(headline, store);
mountKpis(kpis, store);
mountTq(tq, store);
mountSchematics(schem, store);
mountTds(tds, store);
mountSweeps(sweep, trade, store);
mountEquations(eqs, store);
mountAudit(audit, store, () => document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" }));
