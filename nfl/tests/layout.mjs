/* ============================================================
   layout.mjs — UTLITID, EKKI ROKFRAEDIN.

   jsdom REIKNAR EKKI UTLIT. `getBoundingClientRect()` skilar nullum og
   engin breidd er raunveruleg. Thad thydir EKKI ad ekkert se haegt ad
   profa — thad thydir ad profa verdi ad velja thad sem er SATT AN
   UTLITSREIKNINGS. Thad er meira en flesta grunar:

     · dalkafjoldi i haus a moti dalkafjolda i rod (haus yfir rongum
       dalki er utlitsvilla sem sest i DOM)
     · `colSpan` i band-rod sem summast ekki i dalkafjoldann
     · CSS-klasar sem eru notadir i JSX en eru HVERGI i styles.css
       (og ofugt: daudir klasar)
     · innfelldir stilar sem blanda styttingu og langritun — thad er
       nakvaemlega React-vidvorunin sem kostadi FPL-verkefnid 14
       vidvaranir i FFDR-toflunni
     · tvo flipar med SAMA taknid (thad er thad sama og ekkert takn)
     · andstaeda milli texta og bakgrunns, reiknud ur CSS-breytunum

   ÞAD SEM THETTA GETUR EKKI SED er sagt berum ordum i lok skrarinnar
   svo enginn haldi ad graent profa thydi "utlitid er i lagi".
   ============================================================ */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data");
const SRC = path.join(ROOT, "src");

let fail = 0, notes = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const note = (m) => { console.log(`  ·    ${m}`); notes++; };

/* ---------- umhverfi ---------- */
const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>",
  { url: "https://example.test/nfl/", pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(globalThis, "navigator",
  { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.localStorage = dom.window.localStorage;
global.location = dom.window.location;

global.fetch = async (url) => {
  const m = String(url).match(/\/data\/(.+)$/);
  if (!m) return { ok: false, status: 404, json: async () => ({}) };
  try {
    return { ok: true, status: 200,
             json: async () => JSON.parse(readFileSync(path.join(DATA, m[1]), "utf8")) };
  } catch { return { ok: false, status: 404, json: async () => ({}) }; }
};

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
global.IS_REACT_ACT_ENVIRONMENT = true;
const App = (await import("../src/App.jsx")).default;

const root = createRoot(document.getElementById("root"));
const settle = async (ms = 400) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
await act(async () => { root.render(React.createElement(App)); });
await settle(600);

const click = async (el) => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle(400);
};
const tabButtons = () => [...document.querySelectorAll("button.tab")];

/* ============================================================
   1. TAKN FLIPANNA
   ============================================================
   Ur FPL-verkefninu: "tveir flipar med sama takni er thad sama og
   ekkert takn". I smarri staerd er SILHUETTAN allt.               */
console.log("\n1. takn flipanna");
{
  /* FALDIR FLIPAR (12.8.2026): sex flipar eru ekki i DOM fyrr en "More"
     er smellt. Their eru afram virkir — birtingar-akvordun, ekki
     likans-akvordun — svo taknaprofid a ad na yfir THA ALLA. Vaeri
     throskuldurinn einfaldlega laekkadur ur 6 i 3 myndi profid hætta ad
     sja tvitekid takn a sex flipum, og "tveir flipar med sama takni er
     thad sama og ekkert takn" er einmitt thad sem thessi kafli ver. */
  const more = tabButtons().find((b) => /More/.test(b.textContent || ""));
  /* `click` og EKKI beint `dispatchEvent`: an `act()` er React-astandid
     ekki tæmt, svo faldu fliparnir voru enn ekki i DOM thegar talid var
     og profid sa TVO flipa. Fullyrdingin FELL, sem er rett hegdun — en
     hun benti a maelitaekid, ekki a appid. */
  if (more) await click(more);
  const labels = tabButtons()
    .map((b) => (b.textContent || "").trim())
    .filter((l) => !/More/.test(l));
  const icons = labels.map((l) => [...l].filter((c) => c.codePointAt(0) > 0x2000)[0] || null);
  const dupes = icons.filter((c, i) => c && icons.indexOf(c) !== i);
  ok(labels.length >= 6, `${labels.length} flipar`);
  ok(dupes.length === 0, `hvert takn er einkvaemt (tvitekid: ${[...new Set(dupes)].join(" ") || "ekkert"})`);
  ok(icons.every(Boolean), `hver flipi ber takn (${icons.filter(Boolean).length}/${icons.length})`);
}

/* ============================================================
   2. CSS-KLASAR: NOTADIR GEGN SKILGREINDUM
   ============================================================
   Klasi sem er notadur i JSX en er hvergi i styles.css STILLIR
   EKKERT — hann litur ut eins og honnun i kodanum en er ekkert a
   skjanum. Thetta er villuflokkur sem ekkert annad profa ser.     */
/* ============================================================
   AUKATEXTI A VOLDUM CHIP — CONTRAST SEM TALNING SER EKKI
   ============================================================
   `.chip.on` er accent-blar med DOKKAN texta; `.dim` setur `#98a0b0`,
   graatt a blau, sem er nanast olesanlegt. Þad sast a SKJAMYND i
   deilda-svissaranum ("10 · PPR" hvarf) og engin talning hefdi fundid
   thad. Vordurinn er BYGGINGARLEGUR — regla VERDUR ad vera til fyrir
   `.dim` innan i `.chip.on` — thvi jsdom reiknar engan stil og getur
   thvi ekki maelt contrast sjalft.                                    */
console.log("\n1b. voldid chip ber lesanlegan aukatexta");
{
  const css = readFileSync(path.join(ROOT, "src", "styles.css"), "utf8");
  const rule = /\.chip\.on\s+\.dim\s*\{([^}]*)\}/.exec(css);
  ok(!!rule, "regla fyrir `.chip.on .dim` er til");
  if (rule) {
    const body = rule[1];
    ok(/color\s*:/.test(body),
      `og hun setur lit (${body.trim().slice(0, 60)})`);
    ok(!/var\(--dim\)/.test(body),
      "og hann er EKKI `var(--dim)` — thad var einmitt villan");
  }
}

console.log("\n2. CSS-klasar");
const css = readFileSync(path.join(SRC, "styles.css"), "utf8");
{
  const defined = new Set();
  for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) defined.add(m[1]);

  const used = new Map();
  for (const f of readdirSync(SRC).filter((x) => x.endsWith(".jsx"))) {
    const src = readFileSync(path.join(SRC, f), "utf8");
    /* Bædi className="a b" og className={`a ${x} b`}. Breytuhlutar eru
       sleppt viljandi — their eru ekki lesanlegir kyrrstaett. */
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const raw = (m[1] || m[2] || "").replace(/\$\{[^}]*\}/g, " ");
      for (const c of raw.split(/\s+/).filter(Boolean)) {
        if (!used.has(c)) used.set(c, f);
      }
    }
  }
  const missing = [...used.keys()].filter((c) => !defined.has(c));
  ok(missing.length === 0,
    `hver klasi i JSX er skilgreindur i CSS (vantar: ${missing.map((c) => `${c} [${used.get(c)}]`).join(", ") || "engan"})`);

  /* Ohreyfdir klasar eru EKKI villa — their geta komid ur
     breytu-samsetningu — svo their eru taldir sem athugasemd. */
  const unused = [...defined].filter((c) => !used.has(c) &&
    !/^(on|bad|warn|good|dim|txt|frozen|mono|null|QB|RB|WR|TE|K|DST|scrolled|banded|watch|hi)$/.test(c));
  if (unused.length) note(`${unused.length} klasar i CSS eru ekki i beinni notkun: ${unused.slice(0, 8).join(", ")}${unused.length > 8 ? " …" : ""}`);
}

/* ============================================================
   3. STYTTING OG LANGRITUN I SAMA INNFELLDA STIL
   ============================================================
   FPL-lærdómurinn ordrett: "ALDREI BLANDA STYTTINGU OG LANGRITUN I
   SAMA STIL — og thad a vid `borderRadius` alveg eins og `border`."
   Thad thagdi medan bilid var fast og gaf 14 React-vidvaranir um leid
   og haegt var ad velja umferdir, thvi React fjarlaegir longhand i
   odefineradri rod thegar eiginleiki hverfur.                     */
console.log("\n3. stytting + langritun i sama stil");
{
  const PAIRS = [
    ["border", /^border(Top|Right|Bottom|Left)(Color|Width|Style)$/],
    ["borderRadius", /^border(Top|Bottom)(Left|Right)Radius$/],
    ["padding", /^padding(Top|Right|Bottom|Left)$/],
    ["margin", /^margin(Top|Right|Bottom|Left)$/],
    ["background", /^background(Color|Image|Position|Size|Repeat)$/],
    ["font", /^font(Size|Family|Weight|Style)$/],
    ["flex", /^flex(Grow|Shrink|Basis)$/],
  ];
  const hits = [];
  for (const f of readdirSync(SRC).filter((x) => x.endsWith(".jsx"))) {
    const src = readFileSync(path.join(SRC, f), "utf8");
    /* Hvert `style={{ ... }}` er skodad sem ein heild. */
    for (const m of src.matchAll(/style=\{\{([^}]*)\}\}/g)) {
      const body = m[1];
      const keys = [...body.matchAll(/([A-Za-z][\w]*)\s*:/g)].map((k) => k[1]);
      for (const [short, longRe] of PAIRS) {
        if (keys.includes(short) && keys.some((k) => longRe.test(k))) {
          hits.push(`${f}: ${short} + ${keys.filter((k) => longRe.test(k)).join(",")}`);
        }
      }
    }
  }
  ok(hits.length === 0, `engin blondun (${hits.join(" · ") || "hrein"})`);
}

/* ============================================================
   4. TOFLURNAR — HAUS YFIR RETTUM DALKI
   ============================================================
   Ef hausrodin ber annan fjolda holfa en gagnarodin situr hvert heiti
   yfir rongum dalki. Thad er utlitsvilla sem SEST i DOM tho engin
   breidd se reiknud, og hun er nakvaemlega su tegund sem notandinn
   tekur eftir strax og engin prof grípa.                          */
console.log("\n4. toflur: haus a moti rodum");
async function checkTables(label) {
  const tables = [...document.querySelectorAll("table.data")];
  let bad = 0;
  for (const [i, t] of tables.entries()) {
    const cols = t.querySelector("thead tr.cols") || t.querySelector("thead tr");
    if (!cols) continue;
    const nHead = [...cols.children].reduce((a, th) => a + (th.colSpan || 1), 0);
    const bodyRows = [...t.querySelectorAll("tbody tr")].slice(0, 8);
    for (const tr of bodyRows) {
      const nRow = [...tr.children].reduce((a, td) => a + (td.colSpan || 1), 0);
      if (nRow !== nHead) {
        bad++;
        if (bad <= 3) console.log(`     ${label} tafla ${i + 1}: haus ${nHead} holf, rod ${nRow}`);
        break;
      }
    }
    /* Band-rodin verdur ad spanna NAKVAEMLEGA sama fjolda. */
    const bands = t.querySelector("thead tr.bands");
    if (bands) {
      const nBands = [...bands.children].reduce((a, th) => a + (th.colSpan || 1), 0);
      if (nBands !== nHead) {
        bad++;
        console.log(`     ${label} tafla ${i + 1}: bond spanna ${nBands}, haus ${nHead}`);
      }
      /* CSS: `.banded` faerir dalkahausinn 22px nidur. Vanti klasann
         felst EFSTA RODIN bak vid hausinn — thad er nakvaemlega
         villan sem athugasemdin i styles.css lysir. */
      if (!t.classList.contains("banded")) {
        bad++;
        console.log(`     ${label} tafla ${i + 1}: ber band-rod EN EKKI klasann "banded" — efsta rodin felst`);
      }
    }
    /* Frosinn dalkur: se hann i haus verdur hann lika ad vera i hverri rod. */
    const headFrozen = cols.querySelector("th.frozen") != null;
    if (headFrozen && bodyRows.length) {
      const missing = bodyRows.filter((tr) => !tr.querySelector("td.frozen")).length;
      if (missing) {
        bad++;
        console.log(`     ${label} tafla ${i + 1}: ${missing} radir an frosins holfs`);
      }
    }
  }
  return { tables: tables.length, bad };
}

let totalTables = 0, totalBad = 0;
for (const b of tabButtons()) {
  const label = (b.textContent || "").trim();
  if (/FPL/.test(label)) continue;
  await click(b);
  /* Undirflipar telja lika — their bera adrar toflur. */
  for (const chip of [...document.querySelectorAll("button.chip")].slice(0, 8)) {
    await click(chip);
    const r = await checkTables(label);
    totalTables += r.tables; totalBad += r.bad;
  }
  const r = await checkTables(label);
  totalTables += r.tables; totalBad += r.bad;
}
ok(totalBad === 0, `${totalTables} toflu-skodanir, ${totalBad} med misraedi haus/rod`);

/* ============================================================
   5. ANDSTAEDA TEXTA OG BAKGRUNNS
   ============================================================
   Reiknud ur CSS-breytunum sjalfum — thetta THARF ekki utlitsreikning.
   WCAG AA er 4,5:1 fyrir venjulegan texta og 3:1 fyrir storan. Appid
   er dokkt og notar `--dimmer` fyrir tomgildi; se hun ord in of dauf
   er "—" ekki lesanlegt.                                          */
console.log("\n5. andstaeda (reiknud ur CSS-breytum)");
{
  const vars = {};
  for (const m of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) vars[m[1]] = m[2];
  const hex = (h) => {
    let s = h.slice(1);
    if (s.length === 3) s = [...s].map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const lum = (h) => {
    const [r, g, b] = hex(h).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const bg = vars.panel || vars.bg;
  const CHECKS = [
    ["text", 4.5], ["dim", 4.5], ["good", 3], ["bad", 3], ["warn", 3], ["accent", 3],
  ];
  for (const [k, min] of CHECKS) {
    if (!vars[k]) continue;
    const r = ratio(vars[k], bg);
    ok(r >= min, `--${k} gegn --panel: ${r.toFixed(2)}:1 (lagmark ${min})`);
  }
  /* `--dimmer` er notud fyrir "—" og daufasta texta. Hun MA vera undir
     4,5 (thad er asetningur: tomgildi eiga ad hverfa) en ekki undir 3,
     tha er hun osynileg og notandinn ser tomt holf i stad merkis. */
  if (vars.dimmer) {
    const r = ratio(vars.dimmer, bg);
    ok(r >= 3, `--dimmer gegn --panel: ${r.toFixed(2)}:1 (lagmark 3 — "—" verdur ad sjast)`);
  }
}

/* ============================================================
   6. STODU-MERKIN — SEX STODUR, SEX UTLIT
   ============================================================ */
console.log("\n6. stodu-merki");
{
  const POS = ["QB", "RB", "WR", "TE", "K", "DST"];
  const missing = POS.filter((p) => !new RegExp(`\\.pos\\.${p}\\b`).test(css));
  ok(missing.length === 0, `hver stada hefur sinn stil (vantar: ${missing.join(", ") || "engan"})`);

  const colors = {};
  for (const p of POS) {
    const m = new RegExp(`\\.pos\\.${p}\\s*\\{[^}]*background:\\s*(#[0-9a-fA-F]{6})`).exec(css);
    if (m) colors[p] = m[1];
  }
  /* Nagrannar mega ekki vera sjonraent eins. Sama krafa og a
     threpalitina i FPL-verkefninu: >=20 i RGB-fjarlaegd. */
  const keys = Object.keys(colors);
  let tooClose = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = colors[keys[i]].slice(1).match(/../g).map((h) => parseInt(h, 16));
      const b = colors[keys[j]].slice(1).match(/../g).map((h) => parseInt(h, 16));
      const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      if (d < 30) tooClose.push(`${keys[i]}/${keys[j]} (${d})`);
    }
  }
  ok(tooClose.length === 0, `stodu-litir eru adgreinanlegir (of likir: ${tooClose.join(", ") || "engir"})`);
}

/* ============================================================
   7. SIDAN SKRUNAR HVERGI LARETT
   ============================================================
   jsdom reiknar ekki breidd, svo thetta er profad a REGLUNNI: hver
   tafla verdur ad sitja i `.tablewrap` sem ber `overflow-x: auto`.
   Tafla utan hans rydur sidunni ut a sima — nakvaemlega thad sem
   `overflow-x: hidden` a `body` felur an thess ad laga.            */
console.log("\n7. breidar toflur i eigin skrunkassa");
{
  const loose = [];
  for (const b of tabButtons()) {
    const label = (b.textContent || "").trim();
    if (/FPL/.test(label)) continue;
    await click(b);
    for (const t of document.querySelectorAll("table.data")) {
      if (!t.closest(".tablewrap")) loose.push(label);
    }
  }
  ok(loose.length === 0, `hver tafla er i .tablewrap (utan: ${[...new Set(loose)].join(", ") || "engin"})`);
  ok(/\.tablewrap\s*\{[^}]*overflow-x:\s*auto/.test(css),
    ".tablewrap ber overflow-x: auto");
  ok(/html,\s*body\s*\{[^}]*overflow-x:\s*hidden/.test(css),
    "sidan sjalf skrunar ekki larett");
}

/* ============================================================
   8. LYKLABORDS-FOKUS
   ============================================================
   FPL-lærdómur: `:focus-visible` (ekki `:focus`), `currentColor`, og
   NEGATIFT `outline-offset` — ytri hringur klippist i umgjordum med
   `overflow: hidden`.                                              */
console.log("\n8. lyklabords-fokus");
{
  ok(/:focus-visible/.test(css), "stillt a :focus-visible");
  ok(!/[^-]:focus\s*\{/.test(css), "ekki bert :focus (thad birtist vid mus-smell lika)");
}

/* ============================================================
   9. THAD SEM THETTA PROFA GETUR EKKI SED
   ============================================================
   Sagt berum ordum svo graent profa se ekki lesid sem "utlitid er i
   lagi". jsdom reiknar ekkert utlit: engar breiddir, engin skorun,
   engin brot i texta, engin raunveruleg skrun.                    */
console.log("\n9. takmarkanir (ekki profad hér)");
note("breidd dalka og hvort haus-heiti KOMIST fyrir — tharf canvas-maelingu eda vafra");
note("hvort tvo spjold skarist eda texti brotni — tharf raunverulegt utlit");
note("simahamur: jsdom hefur enga matchMedia og innerWidth er fast 1024");
note("hvernig thetta LITUR UT — thad tharf augu, og vafraviðbotin var ekki tengd");

console.log(`\n${fail ? `${fail} PROF FELLU` : "oll prof graen"}` +
  (notes ? `  ·  ${notes} athugasemdir` : ""));
process.exit(fail ? 1 : 0);
