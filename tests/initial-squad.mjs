/* ============================================================
   UPPHAFSLIDID ER EKKI SKIPTI — OG SEX ADRAR KAERUR SAMA KVOLD
   (20.8.2026)

   HVERS VEGNA EITT SAFN OG EKKI SJO: fimm af sjo kaerum eiga SAMA
   rot — 'hvad er astand hopsins i umferd g, og hvad er GW1?' — og
   fullyrdingar um eina reglu eiga ad falla saman. Hver kafli ber sina
   forsendu (`localStorage`-blob) svo their skarast ekki.

   ATH `\bNaN\b` MED ORDAMORKUM, ekki `includes("NaN")`: `textContent`
   limir texta saman an bila (CLAUDE.md 5b).

   KAFLAR
     A  TENGING        — `isInitialSquadPick` er skilgreindur EINU SINNI,
                         i model.js, og App.jsx flytur hann inn
     B  GW1-AETLUN     — engin `ut -> inn` rod, ENGIN delta-tala, engin
                         'hit is subtracted'-fullyrding
     C  BLONDUD AETLUN — 'net X pts' telur ADEINS raunveruleg skipti;
                         GW2-rodin ber gain + hit + net eins og adur
     D  EYDING         — 3 val, ThAD I MIDJUNNI fjarlaegt, hin tvo OSNORT
     E  GRAENI RAMMINN — GW1-val bera hann EKKI i GW2, raunskipti BERA hann
     F  BEKKURINN      — nakvaemlega 4 BENCH-merki, somu id sem `bench`,
                         og skugginn er >= 20 i RGB (thresholdurinn sem
                         repo-id setur sjalft)
     G  LIMINGIN       — sticky er a SULUNNI, ekki a leikjakassanum
     H  ERFDIN         — kedjan GW2->GW5, afturkollun, ekkert skrifad
                         vid flakk
     H3 RITUNIN       — vixl gert I VIDMOTINU: hans breyting leggst a
                         erfda uppstillinguna, GW2 er osnort, tom fylking
                         er ekki skyr lykill
     H2 JAFNGILDID    — GAMALT blobb (6 eins) og NYTT (1) gefa SOMU
                         uppstillingu, umferd fyrir umferd, gegnum `boot`;
                         og visvitandi vixlari LIFIR
     H-gamalt         — ERFDIN         — GW3..GW5 erfa GW2; breyting i GW4 erfist upp en
                         EKKI nidur; afturkollun fellur aftur i GW2;
                         og EKKERT er skrifad i localStorage vid FLAKK
     I  'Never in XI'  — 'Save £" komid, 'frees up to" farid, og rodin
                         getur brotnad i stad thess ad flaeda ut
     J  st0%           — omaeld nulltala er farin af spjaldinu (forsendan
                         syn ad hun VAR their)
     K  AFTURABAK      — bordinn thegir i forleik; med sogu nefnir hann
                         thann sem var ALDREI i XI-inu; talan a skjanum
                         = umferdirnar
     N  RESET          — 'reset transfer planning' HELDUR upphafslidinu og
                         fyrirlidanum; hreinsar GW2+; textinn telur rett
     M  SKIPTA-TILLAGAN — sama stada, a fjarhagsaetlun ur SOLUVERDI+banka,
                         logleg undir 3-per-felag, ekki 0% tiltaek, og
                         rodunin er FLUTT INN (`rankScore`), ekki reiknud
     L  TALNINGIN      — 0 af 6 / 1 af 6 / 6 af 6 a TILBUINNI sogu thar
                         sem svarid er thekkt fyrirfram; sa sem byrjadi
                         EINU SINNI er NEFNDUR med tolunni 1
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { isInitialSquadPick, INITIAL_SQUAD_GW } from "../src/model.js";
import { rotationRisk } from "../src/availability.js";
import { playedEvents } from "./lib/played-events.mjs";
/* `boot` ER ENDURNOTAD UR `gw1-persistence.mjs` — thad er EINA harness-id
   sem rifur appid nidur og reisir thad upp UR BLOBBINU EINU, og thad er
   thad sem 'les gamalt blobb thad sama?' krefst. Annad harness vaeri
   onnur ferd og gaeti verid graen a medan hin er rauð.                  */
import { boot } from "./lib/boot-blob.mjs";
import { rarelyStarted } from "../src/model.js";
import { swapCandidates } from "../src/recommend.js";

let pass = 0, fail = 0;
const ok = (c, n, x = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                 : (fail++, console.log(`  ✗ ${n}${x ? " — " + x : ""}`)); };
const ROOT = new URL("../", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(ROOT + "data/" + f, "utf8"));
const SRC = f => readFileSync(ROOT + f, "utf8");

const ALL = J("players.json").players;
const byId = {}; ALL.forEach(p => byId[p.id] = p);

/* PROFLIDID ER ThAD SAMA OG I `smoke.test.mjs` og `planner-pitch.mjs` —
   `START_SQUAD` i App.jsx:215-231. ThAD MA EKKI BREYTAST (sja
   `gw1-persistence.mjs`, sem nagl-festir ollum 15).                     */
const START_IDS = [496,11,356,423,542,397,426,239,368,411,346,497,173,278,321];
const BENCH_IDS = [497,173,278,321];          // starter:false i START_SQUAD

const realSetTimeout = globalThis.setTimeout;
const sleep = ms => new Promise(r => realSetTimeout(r, ms));

async function mount(state, { width = 1280, patch = null } = {}) {
  const dom = new JSDOM("<!doctype html><div id=root></div>",
    { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.innerWidth = width;
  if (!("oninput" in dom.window.HTMLElement.prototype))
    for (const ev of ["oninput", "onchange"])
      Object.defineProperty(dom.window.HTMLElement.prototype, ev, {
        get() { return null; }, set() {}, configurable: true });
  if (state) dom.window.localStorage.setItem("fpl_planner_v3", JSON.stringify(state));
  const orig = console.error;
  console.error = (...a) => { const m = String(a[0] ?? ""); if (!/not wrapped in act|Warning:/.test(m)) orig(...a); };
  globalThis.fetch = async u => {
    const n = String(u).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => ({}) };
    if (patch && patch[n]) return { ok: true, status: 200, json: async () => patch[n] };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("no"); } }; }
  };
  const { default: App } = await import("../src/App.jsx");
  const root = createRoot(dom.window.document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await sleep(340); });
  console.error = orig;
  const doc = dom.window.document;
  return {
    doc, win: dom.window,
    text: () => doc.body.textContent || "",
    click: async el => { await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); }); await act(async () => { await sleep(50); }); },
    q: s => [...doc.querySelectorAll(s)],
    blob: () => dom.window.localStorage.getItem("fpl_planner_v3"),
  };
}

const cards = v => v.q('[draggable="true"]');
const NANRE = /\bNaN\b|\bundefined\b/;
/* MINNSTA element sem ber BAEDI heitid OG rod — sama adferd og
   smoke.test.mjs notar a bordann. Ad taka 'minnsta sem
   inniheldur heitid' gaf hausinn einan og gerdi fullyrdingar tomar.      */
const cardOf = (v, head, needle) => v.q("div")
  .filter(el => el.textContent.includes(head) && new RegExp(needle).test(el.textContent))
  .sort((a, b) => a.textContent.length - b.textContent.length)[0];
/* UMFERDA-HNUTUR a timalinunni. Profin annars stadar smella eftir texta
   hnappsins ("5"), svo sama adferd hér.                                  */
const gwNode = (v, n) => v.q("button").find(b => b.textContent.trim() === String(n));
const badges = (v, word) => v.q("span").filter(s => (s.textContent || "").trim() === word);
/* LAUFID, EKKI FORELDRID. Fyrsta utgafa thessa hjalpartols valdi
   `d.children.length >= 3` og ThAD MATCHADI HEILA KORTID — svo `✕` i
   'midrodinni' var i raun `✕` fyrstu rodarinnar og profid staðfesti
   ranga eydingu sem retta. Nu er skilyrdid: elementid ber textann OG
   ekkert AFKVAEMI thess ber hann.                                       */
const leaves = (v, needle) => v.q("div").filter(d =>
  new RegExp(needle).test(d.textContent || "")
  && ![...d.querySelectorAll("div")].some(c => new RegExp(needle).test(c.textContent || "")));
/* NAFN A SPJALDI A VELLINUM — `text()` er ONYTT fyrir 'er hann farinn?':
   tillogu-listinn og leitin nefna menn sem eru EKKI i hopnum, svo
   `!text().includes(nafn)` er ekki fullyrding um hopinn.                */
const onPitchNames = v => cards(v).map(c => c.textContent || "").join("|");

console.log(`\n${"=".repeat(84)}`);
console.log("UPPHAFSLIDID, ERFDIN, BEKKURINN — 20.8.2026");
console.log("=".repeat(84));

/* ============================================================
   A. TENGING — EIN UTFAERSLA, ThRIR NOTENDUR
   ============================================================
   Sama form og `prediction-ledger.mjs` (App.jsx VERDUR ad flytja
   `buildTeamMetrics` inn) og `stats.test.mjs` (`headWidth` var afritad og
   prófid var graent medan 25 hausar klipptust). Hér er thad ekki
   fagurfraedi: thrjar spurningar lesa regluna (kostnadur, aetlun, rammi)
   og AFRIT hefdi rekid i sundur i thogn.
   ============================================================ */
console.log("\n--- A. TENGING ---");
{
  const MODEL = SRC("src/model.js"), APP = SRC("src/App.jsx");
  ok(/export function isInitialSquadPick\(/.test(MODEL),
     "`isInitialSquadPick` er EXPORTUD ur model.js");
  ok(/export const INITIAL_SQUAD_GW = 1;/.test(MODEL),
     "og umferdar-numerid er NEFNDUR fasti, ekki tala i midjum kodanum");
  ok(isInitialSquadPick({ gw: 1 }) === true, "predikatinn: gw 1 er upphafslidid");
  ok(isInitialSquadPick({ gw: 2 }) === false, "gw 2 er skipti");
  /* GERDIN: `loadState` hleypir `gw:"1"` i gegn ur localStorage (sama
     strengja-gildra sem `tr.gw > g` bar). Fullyrdingin er ekki fraedileg. */
  ok(isInitialSquadPick({ gw: "1" }) === true, "`gw:\"1\"` UR localStorage er lika upphafslidid");
  ok(isInitialSquadPick(null) === false && isInitialSquadPick({}) === false,
     "og tomt/vantandi inntak kastar ekki");

  ok(/isInitialSquadPick/.test(APP) && /from "\.\/model\.js"/.test(APP),
     "App.jsx FLYTUR predikatinn inn");
  ok(!/function isInitialSquadPick/.test(APP),
     "og skilgreinir hann EKKI sjalfur");
  /* AFRITS-VORDURINN. Hann ma ekki vera 'engin `gw === 1` i App.jsx' —
     thad er of breitt og myndi falla a osskyldum koda. Hann er afmarkadur
     vid ThAER ThRJAR BLOKKIR sem lesa regluna: allar thrjar VERDA ad
     nefna predikatinn.                                                  */
  const uses = (APP.match(/isInitialSquadPick/g) || []).length;
  ok(uses >= 4, `predikatinn er lesinn a fleiri en einum stad (${uses} tilvik: innflutningur + 3 notendur)`);
  ok(/plan\.filter\(t => t\.gw <= gw && !isInitialSquadPick\(t\)\)/.test(APP),
     "GRAENI RAMMINN (`plannedIn`) les hann");
  ok(/const gw1Picks = plan\.filter\(isInitialSquadPick\)/.test(APP)
     && /const planMoves = plan\.filter\(t => !isInitialSquadPick\(t\)\)/.test(APP),
     "AETLUNIN klofnar eftir honum");
  /* KOSTNADURINN les regluna i model.js sjalfu (`isGw1Free = (g === 1)`).
     Hann er thar af sögulegum astaedum (bebd117) og a ad HALDAST tima-laus. */
  ok(/const isGw1Free = \(g === 1\);/.test(MODEL),
     "KOSTNADURINN er afram tima-laus (`g === 1`, ekki `&& preSeason`)");
  ok(INITIAL_SQUAD_GW === 1, "og fastinn er 1");
}

/* ============================================================
   B. GW1-AETLUN — ENGIN SKIPTI, ENGIN DELTA
   ============================================================
   Forsendan er RAUNVERULEG: fjogur GW1-val ur proflidinu i menn sem eru
   til i `players.json` og i somu stodu, svo appid hafni theim ekki.
   ============================================================ */
const pick = (posType, notIn) => ALL.find(p => p.element_type === posType
  && p.status === "a" && !notIn.includes(p.id));
const P_GK  = pick(1, START_IDS), P_DEF = pick(2, START_IDS);
const P_MID = pick(3, START_IDS), P_FWD = pick(4, START_IDS);

const GW1_PLAN = [
  { gw: 1, outId: 497, inId: P_GK.id },        // Dubravka -> GK
  { gw: 1, outId: 173, inId: P_DEF.id },       // Thomas   -> DEF
  { gw: 1, outId: 542, inId: P_MID.id },       // E.Le Fee -> MID
  { gw: 1, outId: 321, inId: P_FWD.id },       // Walle Egeli -> FWD
];

console.log("\n--- B. GW1-AETLUN: ENGIN SKIPTI, ENGIN DELTA ---");
{
  ok([P_GK, P_DEF, P_MID, P_FWD].every(Boolean), "forsenda: fjorir loglegir menn fundust");
  const v = await mount({ captain: 411, plan: GW1_PLAN });
  const t = v.text();

  /* POSITIF FORSENDA FYRST (5b regla 2): kaflinn a ad vera their.       */
  ok(/Starting squad/.test(t), "'Starting squad'-kaflinn birtist");
  ok(/GW1 — not transfers/.test(t), "og hann SEGIR berum orðum ad thetta seu ekki skipti");
  const sec = cardOf(v, "Starting squad", P_GK.web_name);
  ok(!!sec, "kaflinn fannst sem afmarkad element med radirnar i");
  const seg = sec ? sec.textContent : "";

  /* NEGATIFU FULLYRDINGARNAR — hver um streng sem var SANNANLEGA their. */
  ok(!/Transfer plan/.test(t), "'Transfer plan'-hausinn er HORFINN (engin raunskipti til)");
  ok(!/net \+?-?\d/.test(t) || !/Transfer plan/.test(t),
     "og thar med engin 'net X pts'-summa af handahofs-samanburdum");
  ok(!/The hit is subtracted/.test(t),
     "'The hit is subtracted' stendur EKKI yfir rodum sem geta ekki borid hit");
  ok(!/→/.test(seg), "engin `ut → inn`-or i upphaflids-kaflanum");
  ok(/in place of/.test(seg),
     "en madurinn sem vek er nefndur — hann tharf ad geta pardad rodina");

  /* ENGIN DELTA-TALA. Radirnar bera `ep N.N` og hann ma EKKI bera formerki:
     `+`/`-` laesi eins og mismunur. Fullyrdingin er a RODUNUM, ekki a
     ollum skjanum (mælabordid ber formerki annars stadar).              */
  const rows = leaves(v, "in place of");
  ok(rows.length === 4, `fjorar upphaflids-radir a skjanum (${rows.length})`);
  for (const r of rows) {
    const txt = (r.textContent || "");
    ok(/ep \d+\.\d/.test(txt), `rodin ber merkta EIGIN-tolu ('ep N.N'): ${txt.slice(0, 46)}`);
    ok(!/[+−-]\d+\.\d/.test(txt.replace(/ep \d+\.\d/, "")),
       "og ENGA tolu med formerki (delta gegn handahofs-manni)", txt.slice(0, 60));
  }
  ok(!NANRE.test(t), "ekkert NaN/undefined a skjanum");

  /* HVER GW1-ROD MA HELDUR EKKI BERA `hits`-merkid. `planGwHit` er raudur
     GW-kubbur og `computeTransferCost` gefur GW1 points 0, svo hann getur
     ekki komid — en fullyrdingin ver adur en einhver 'bætir honum vid".  */
  const hitBox = v.q("span").filter(s => /^GW1$/.test((s.textContent || "").trim())
    && /a01f2b/.test((s.getAttribute("style") || "")));
  ok(hitBox.length === 0, "enginn GW1-kubbur er merktur sem refsad (raudur)");
}

/* ============================================================
   C. BLONDUD AETLUN — SUMMAN TELUR ADEINS SKIPTI
   ============================================================ */
console.log("\n--- C. BLONDUD AETLUN ---");
{
  const P2 = ALL.find(p => p.element_type === 3 && p.status === "a"
    && ![...START_IDS, P_MID.id].includes(p.id));
  const MIX = [...GW1_PLAN, { gw: 2, outId: 397, inId: P2.id }];
  const v = await mount({ captain: 411, plan: MIX });
  const t = v.text();
  ok(/Transfer plan/.test(t), "forsenda: hausinn er their thegar RAUNSKIPTI er til");
  ok(/Starting squad/.test(t), "og upphaflids-kaflinn lika");
  ok(/The hit is subtracted/.test(t),
     "forsenda: notan stendur — hun a ad vera their yfir raunskiptum");

  /* GW2-RODIN — obreytt hegdun: gain, (hit-hlutur), net.               */
  const gw2row = v.q("div").filter(d => /→/.test(d.textContent || "")
    && /^GW2/.test((d.textContent || "").trim()) && (d.children || []).length >= 4)[0];
  ok(!!gw2row, "GW2-skipta-rodin fannst");
  const g2 = gw2row ? gw2row.textContent : "";
  ok(/→/.test(g2), "hun ber `ut → inn`");
  ok(/[+−-]?\d+\.\d/.test(g2), "og hun BER tolur (gain/net) eins og adur", g2.slice(0, 60));

  /* SUMMAN. Hun er reiknud UT FRA EINNI rod, svo hun getur ekki verid
     summa fimm. Talan er lesin AF SKJANUM og borin vid gain rodarinnar. */
  const netEl = v.q("span").find(s => /^net [+-]?\d/.test((s.textContent || "").trim()));
  ok(!!netEl, "'net X pts' er a skjanum");
  const netVal = netEl ? parseFloat((netEl.textContent || "").replace(/[^\d.+-]/g, "")) : NaN;
  const nums = [...g2.matchAll(/([+-]?\d+\.\d)/g)].map(m => parseFloat(m[1]));
  ok(Number.isFinite(netVal), `summan er tala (${netVal})`);
  /* PROFSTEINNINN: summan er nettoid af ThESSU EINA skipti (engin refsing
     i GW2 — 1 fritt skipti), svo hun er JOFN sidustu tolu rodarinnar.
     Vaeri GW1 inni vaeri hun summa fimm og gæti ekki verid jofn henni.  */
  ok(nums.length > 0 && Math.abs(netVal - nums[nums.length - 1]) < 0.051,
     `summan er nettoid af EINA skiptinu (${netVal} vs ${nums[nums.length - 1]}) — GW1 er ekki inni`);
  ok(!NANRE.test(t), "ekkert NaN/undefined");

  /* ENDURSTILLINGAR-TEXTINN TELUR LIKA SITT HVORT.                     */
  const resetBtn = v.q("button").find(b => /reset transfer planning/.test(b.textContent || ""));
  ok(!!resetBtn, "forsenda: 'reset transfer planning' er their");
  if (resetBtn) {
    await v.click(resetBtn);
    const c = v.text();
    ok(/1 transfers/.test(c), "confirm-textinn segir '1 transfers' (ekki 5)");
    ok(/starting squad \(4 GW1 picks\) is NOT touched/.test(c),
       "og hann segir BERUM ORDUM ad upphafslidid (4 val) se OSNORT");
  }
}

/* ============================================================
   D. EYDING UR MIDJUNNI — STODUGI LYKILLINN
   ============================================================
   Villan sem thetta ver er skjolud i App.jsx: visitala sem lykill faerist
   vid eydingu og React endurnytir rangan hnut. Thrjar radir, ThAD I
   MIDJUNNI fjarlaegt, og hin tvo verda ad standa OSNORT.
   ============================================================ */
console.log("\n--- D. EYDING UR MIDJUNNI ---");
{
  const THREE = GW1_PLAN.slice(0, 3);
  const v = await mount({ captain: 411, plan: THREE });
  const names = THREE.map(t => byId[t.inId].web_name);
  for (const n of names) ok(v.text().includes(n), `forsenda: ${n} er a skjanum`);

  const rowOf = n => leaves(v, "in place of").find(d => (d.textContent || "").includes(n));
  ok(leaves(v, "in place of").length === 3, `forsenda: ThRJAR radir i aetluninni (${leaves(v, "in place of").length})`);
  const mid = rowOf(names[1]);
  ok(!!mid, "midrodin fannst");
  const x = mid && [...mid.querySelectorAll("button")].find(b => (b.textContent || "").trim() === "✕");
  ok(!!x, "og hun ber `✕`");
  await v.click(x);
  const left = leaves(v, "in place of");
  ok(left.length === 2, `nakvaemlega tvaer radir eftir (${left.length})`);
  const txt = left.map(d => d.textContent || "").join("|");
  ok(!txt.includes(names[1]), `MIDRODIN (${names[1]}) er farin ur aetluninni`);
  ok(txt.includes(names[0]), `og fyrsta rodin (${names[0]}) stendur OSNORT`);
  ok(txt.includes(names[2]), `og thridja rodin (${names[2]}) stendur OSNORT`);
  /* OG VOLLURINN FYLGDI — madurinn a ad vera farinn ur hopnum sjalfum. */
  ok(!onPitchNames(v).includes(names[1]), `og hann er farinn af vellinum lika`);
  ok(onPitchNames(v).includes(names[0]) && onPitchNames(v).includes(names[2]),
     "medan hinir tveir eru afram i hopnum");
  /* OG VISTADA GERDIN ER OHREYFD — thetta er hardasta skilyrdid i kvold. */
  const blob = JSON.parse(v.blob() || "{}");
  ok(Array.isArray(blob.plan) && blob.plan.length === 2, "vistada aetlunin er tvaer radir");
  ok(blob.plan.every(t => "gw" in t && "outId" in t && "inId" in t),
     "og sviðin heita afram gw/outId/inId — GERDIN ER OHREYFD");
  ok(blob.plan.every(t => t.inId !== THREE[1].inId), "og retta rodin var fjarlaegd");
}

/* ============================================================
   E. GRAENI RAMMINN — 'NYKOMINN INN' ER EKKI SATT UM GW1
   ============================================================
   `isPlanned` -> `inset 0 0 0 Npx #00b96b` a spjaldinu.
   ============================================================ */
console.log("\n--- E. GRAENI RAMMINN ---");
const GREEN = "#00b96b";
const greenRing = v => cards(v).filter(c =>
  ((c.getAttribute("style") || "").toLowerCase()).includes(GREEN));
{
  /* POSITIF HLIDIN FYRST: raunverulegt GW2-skipti BER rammann i GW2.   */
  const P2 = ALL.find(p => p.element_type === 3 && p.status === "a" && !START_IDS.includes(p.id));
  const v2 = await mount({ captain: 411, plan: [{ gw: 2, outId: 397, inId: P2.id }] });
  const node2 = gwNode(v2, 2);
  ok(!!node2, "forsenda: GW2-hnutur er a timalinunni");
  await v2.click(node2);
  const ring2 = greenRing(v2);
  ok(ring2.length === 1, `RAUNSKIPTI: nakvaemlega EITT spjald ber graena rammann i GW2 (${ring2.length})`);
  ok(ring2.length === 1 && (ring2[0].textContent || "").includes(P2.web_name),
     `og thad er madurinn sem kom inn (${P2.web_name})`);

  /* NEGATIFA HLIDIN — GW1-val bera hann ekki, hvorki i GW1 ne i GW2.   */
  const v1 = await mount({ captain: 411, plan: GW1_PLAN });
  ok(GW1_PLAN.every(t => v1.text().includes(byId[t.inId].web_name)),
     "forsenda: allir fjorir GW1-menn eru a vellinum");
  ok(greenRing(v1).length === 0,
     `GW1: ekkert spjald ber 'nykominn inn'-rammann (${greenRing(v1).length})`);
  const node = gwNode(v1, 2);
  ok(!!node, "forsenda: GW2-hnutur er their");
  await v1.click(node);
  ok(/GW2/.test(v1.text()), "forsenda: GW2 er valin");
  ok(greenRing(v1).length === 0,
     `GW2: ENN ekkert spjald ber hann — kaeran er lagfaerd (${greenRing(v1).length})`);
}

/* ============================================================
   F. BEKKURINN — FJOGUR MERKI, OG SKUGGINN ER MAELDUR
   ============================================================ */
console.log("\n--- F. BEKKURINN ---");
{
  const base = await mount({ captain: 411 });
  ok(badges(base, "BENCH").length === 4,
     `an chips: FJOGUR BENCH-merki (${badges(base, "BENCH").length})`);

  const v = await mount({ captain: 411, chips: { "bboost:1": 1 } });
  const bb = badges(v, "BENCH");
  ok(bb.length === 4, `BENCH BOOST: nakvaemlega FJOGUR BENCH-merki (${bb.length})`);
  ok(cards(v).length === 15, `forsenda: 15 spjold (${cards(v).length})`);
  /* OG ThAD ERU SOMU MENNIRNIR — ekki 'einhverjir fjorir".             */
  const marked = cards(v).filter(c => [...c.querySelectorAll("span")]
    .some(s => (s.textContent || "").trim() === "BENCH"));
  ok(marked.length === 4, `fjogur SPJOLD bera merkid (${marked.length})`);
  const names = BENCH_IDS.map(id => byId[id].web_name);
  ok(names.every(n => marked.some(c => (c.textContent || "").includes(n))),
     `og thad eru bekkurinn sjalfur: ${names.join(", ")}`);
  ok(cards(v).length - marked.length === 11, "og ellefu bera hann EKKI");
  /* BORDINN MA EKKI FULLYRDA UM ANNAD EN ThAD SEM ER MALAD.            */
  ok(/marked BENCH are your bench/.test(v.text()),
     "bordinn bendir a MERKID (ekki a 'the lighter cards')");
  ok(!/lighter cards are your bench/.test(v.text()), "gamla osanna setningin er farin");
  /* FYRIRLIDA-VALLISTINN — obreytt: 11, sama mengi (handfangid sem er
     ohad malningu, sbr. `gw1-persistence.mjs`).                        */
  const sel = v.q("select")[0];
  ok(sel && sel.querySelectorAll("option").length === 11,
     `fyrirlida-vallistinn er ELLEFU (${sel && sel.querySelectorAll("option").length})`);

  /* SKUGGINN SJALFUR — MAELDUR, ekki skodadur. CLAUDE.md kafli 3 setur
     >= 20 i RGB fyrir sjonraena adgreiningu nagrannathrepa; bekkjar-
     skugginn var 13 og var thvi 'sama sem ekkert merki".               */
  const ST = SRC("src/appStyles.js");
  const m = ST.match(/pCardBench: \{ background:"rgba\(255,255,255,([\d.]+)\)"/);
  ok(!!m, "fann `pCardBench`-alfann i appStyles.js");
  const alpha = m ? parseFloat(m[1]) : 1;
  const TURF = [37, 107, 62];                 // #256b3e, midtonn Pitch.jsx
  const over = TURF.map(c => alpha * 255 + (1 - alpha) * c);
  const diff = Math.max(...over.map(c => Math.abs(255 - c)));
  ok(diff >= 20, `bekkjar-skugginn er ${diff.toFixed(1)} i RGB a torfi — thresholdur repo-sins er 20`);
  /* OG SOLU-ABENDINGIN DOFNAR EKKI LENGUR SPJALDID: hun var sterkasta
     doufnunin, alltaf nakvaemlega tveir menn, og bar enga skyringu.     */
  const APP = SRC("src/App.jsx");
  ok(!/isSellHint \? 0\.62/.test(APP), "`isSellHint` dofnar EKKI lengur spjaldid");
  ok(/sigSell/.test(APP), "hun er MERKI i stad thess (`sigSell`)");
  ok(/const sellIds = new Set\(sorted\.slice\(0, 2\)/.test(SRC("src/recommend.js")),
     "forsenda: `sellIds` ER alltaf nakvaemlega tveir — thess vegna gat doufnunin ekki verid 4");
  const sell = badges(v, "SELL?");
  ok(sell.length <= 2, `SELL?-merkid er a hoesta lagi tveimur spjoldum (${sell.length})`);
  ok(!NANRE.test(v.text()), "ekkert NaN/undefined");
}

/* ============================================================
   G. LIMINGIN — A SULUNNI, EKKI A KASSANUM
   ============================================================
   ThETTA ER BYGGINGARLEG FULLYRDING OG ThAD ER SAGT BERUM ORDUM: jsdom
   hefur ENGA uppsetningarvel, svo `getBoundingClientRect` er 0 i ollu og
   'skarast kassarnir?' er ekki maelanlegt hér. Fullyrdingin er thvi um
   ThAD SEM ORSAKADI skorunina — hvar `position:sticky` liggur — og hun
   fellur vid nakvaemlega thá stokkbreytingu.
   ============================================================ */
console.log("\n--- G. LIMINGIN (BYGGINGARLEG FULLYRDING) ---");
{
  const ST = SRC("src/appStyles.js"), APP = SRC("src/App.jsx");
  const gf = ST.match(/gfWrap: \{[\s\S]*?\},\n/);
  ok(!!gf, "fann `gfWrap`");
  ok(gf && !/position:"sticky"/.test(gf[0]),
     "`gfWrap` er EKKI lengur sticky — thad var thad sem malaði ofan a nagrannann");
  ok(/pitchSide: \{[^}]*position:"sticky"/.test(ST),
     "limingin er a SULUNNI (`pitchSide`) — badir kassarnir sem ein blokk");
  ok(/style=\{S\.pitchSide\}/.test(APP), "og suludivid notar hann");
  const v = await mount({ captain: 411 });
  ok(v.q(".pitch-side").length === 1, "suludivid er i DOM-inum");
  const side = v.q(".pitch-side")[0];
  ok(side && /position:\s*sticky/.test(side.getAttribute("style") || ""),
     "og limingin er lesin AF ELEMENTINU, ekki adeins ur stilaskranni");
  const gfEl = v.q(".gf-wrap")[0];
  ok(gfEl && !/position:\s*sticky/.test(gfEl.getAttribute("style") || ""),
     "leikjakassinn sjalfur er ekki limdur");
  /* OG BADIR KASSARNIR ERU INNI I SOMU SULU — annars vaeri limingin a
     einhverju odru en their sem skorudust.                             */
  ok(side && side.querySelector(".gf-wrap"), "leikirnir eru INNI i limdu sulunni");
  /* OG NAGRANNINN LIKA — hann er thad sem skarst. `|| true` stod hér i
     fyrstu utgafu og gerdi fullyrdinguna ad tautologiu (CLAUDE.md 13);
     hun tharf PLANADAN blob svo bordinn birtist yfirleitt.              */
  const PLAYED = { "events.json": { events: playedEvents(J("events.json").events, 4) } };
  const v2 = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } }, { patch: PLAYED });
  const side2 = v2.q(".pitch-side")[0];
  ok(!!side2 && /Not been in your XI/.test(side2.textContent || ""),
     "og 'Not been in your XI' er INNI i SOMU limdu sulu — thad var parid sem skarst");
}

/* ============================================================
   H. ERFDIN — SIDASTI SKYRI LYKILL, OG GOMUL BLOBB ERU OHREYFD
   ============================================================
   TVAER SPURNINGAR, OG SU ONNUR ER SU DYRA:

   1. ERFIST UPPSTILLINGIN? GW3-GW5 verda ad opnast eins og GW2. Ein
      umferd getur ekki greint 'erfir' fra 'afritad einu sinni', svo
      KEDJAN er profud, ekki eitt skref.

   2. LES GAMALT BLOBB ThAD SAMA SEM ADUR? Undir gomlu merkingunni var
      EINA leidin til ad hafa mann a bekknum GW1-6 ad skra somu vixlin i
      ALLAR SEX umferdirnar. Fyrsta lagfaeringin var FOLD og hun gerdi
      thaer sex faerslur ad VIXLARA (bSbSbS) — notandinn hefdi opnad appid
      i lid sem hann valdi aldrei, kvoldid sem hann skrair raunverulega
      hopinn. Tvibendan er OLEYSANLEG (`{1:[[A,B]],2:[[A,B]]}` er BAEDI
      gamalt 'a bekknum badar' OG nytt 'til baka i GW2'), svo ENGIN
      sameining var skrifud: reglan er 'sidasti SKYRI lykill', sem
      breytir ENGRI umferd sem BER lykil.

   JAFNGILDID ER FULLYRDINGIN: '6 eins faerslur' og '1 faersla' verda ad
   gefa SOMU uppstillingu i ollum sex umferdunum. Bædar leidir eru profadar
   GEGNUM `boot`-harness-inn ur `gw1-persistence.mjs` — appid RIFID NIDUR
   og reist upp UR BLOBBINU EINU, sem er thad eina sem sannar ferdina.
   ============================================================ */
console.log("\n--- H. ERFDIN ---");
{
  const SWAP = [[496, 497]];                  // Kinsky (start) <-> Dubravka (bench)
  const v = await mount({ captain: 411, benchSwaps: { 2: SWAP } });
  const before = v.blob();

  const xiAt = async n => {
    const node = gwNode(v, n);
    if (!node) return null;
    await v.click(node);
    const sel = v.q("select")[0];
    return sel ? [...sel.querySelectorAll("option")].map(o => o.textContent.trim()).sort().join("|") : null;
  };
  const xi1 = await xiAt(1), xi2 = await xiAt(2), xi3 = await xiAt(3),
        xi4 = await xiAt(4), xi5 = await xiAt(5);
  ok(xi1 && xi2, "forsenda: fyrirlida-vallistinn er læsilegur i badum umferdum");
  ok(xi1 !== xi2, "forsenda: GW2-breytingin BREYTIR raunverulega byrjunarlidinu (annars maelir kaflinn ekkert)");
  ok(xi2 === xi3, "GW3 ERFIR GW2 (var: fell aftur i grunnhopinn)");
  ok(xi2 === xi4, "GW4 erfir lika");
  ok(xi2 === xi5, "og GW5 — KEDJAN, ekki eitt afrit");
  ok(xi5 !== xi1, "og engin theirra er grunnhopurinn");

  /* FLAKK MA EKKI SKRIFA. Fullyrdingin sem fellir 'view verdur edit'.   */
  const after = v.blob();
  ok(before === after,
     "EKKERT var skrifad i localStorage vid ad FLAKKA milli GW1..GW5");
  const b = JSON.parse(after || "{}");
  ok(JSON.stringify(b.benchSwaps) === JSON.stringify({ 2: SWAP }),
     "og `benchSwaps` ber afram NAKVAEMLEGA hans eina breytingu (ekkert materialiserad)");
}
{
  /* BREYTING I GW4 — BERST UPP, EKKI NIDUR.                            */
  const v = await mount({ captain: 411,
    benchSwaps: { 2: [[496, 497]], 4: [[423, 173]] } });   // Shaw <-> Thomas (DEF/DEF)
  const xiAt = async n => { await v.click(gwNode(v, n));
    const sel = v.q("select")[0];
    return [...sel.querySelectorAll("option")].map(o => o.textContent.trim()).sort().join("|"); };
  const x2 = await xiAt(2), x3 = await xiAt(3), x4 = await xiAt(4), x5 = await xiAt(5);
  ok(x2 === x3, "GW3 er afram GW2 (GW4-breytingin er EKKI afturvirk)");
  ok(x4 !== x3, "GW4 er ANNAD — hans eigin uppstilling er komin inn");
  ok(x5 === x4, "og GW5 erfir GW4-utgafuna, ekki GW2-utgafuna");
}
{
  /* AFTURKOLLUNIN. Sama blob an GW4-lykilsins: GW4 og GW5 VERDA ad falla
     aftur i GW2-uppstillinguna.                                        */
  const mk = swaps => mount({ captain: 411, benchSwaps: swaps });
  const withG4 = await mk({ 2: [[496, 497]], 4: [[423, 173]] });
  const noG4   = await mk({ 2: [[496, 497]] });
  const xi = async (v, n) => { await v.click(gwNode(v, n));
    const sel = v.q("select")[0];
    return [...sel.querySelectorAll("option")].map(o => o.textContent.trim()).sort().join("|"); };
  const a4 = await xi(withG4, 4), b4 = await xi(noG4, 4);
  const b2 = await xi(noG4, 2);
  ok(a4 !== b4, "forsenda: GW4-lykillinn breytir GW4 (annars er naesta lina tom)");
  ok(b4 === b2, "AN GW4-lykilsins fellur GW4 aftur i GW2-uppstillinguna");
  ok(await xi(noG4, 5) === b2, "og GW5 lika");
}
{
  /* SKIPTI I GW3 BERAST FRAM OG MA EKKI ENDURSTILLA UPPSTILLINGUNA.    */
  const P2 = ALL.find(p => p.element_type === 3 && p.status === "a" && !START_IDS.includes(p.id));
  const v = await mount({ captain: 411, benchSwaps: { 2: [[496, 497]] },
    plan: [{ gw: 3, outId: 397, inId: P2.id }] });
  await v.click(gwNode(v, 4));
  ok(onPitchNames(v).includes(P2.web_name),
     `GW3-skiptin bera fram i GW4 (${P2.web_name} er a vellinum)`);
  ok(!onPitchNames(v).includes(byId[397].web_name), "og madurinn sem for er farinn");
  const marked = cards(v).filter(c => [...c.querySelectorAll("span")]
    .some(x => (x.textContent || "").trim() === "BENCH"));
  ok(marked.length === 4, `og bekkurinn er afram fjorir (${marked.length})`);
  ok(marked.some(c => (c.textContent || "").includes(byId[496].web_name)),
     "og GW2-uppstillingin lifir skiptin (Kinsky er enn a bekknum)");
}

/* ============================================================
   H2. JAFNGILDID — GAMALT BLOBB OG NYTT BLOBB, SAMA SVAR
   ============================================================
   ThETTA ER FULLYRDINGIN SEM FOLD-IN GAT EKKI STADIST. Sex eins faerslur
   (gamla leidin til ad segja 'a bekknum GW1-6') og ein faersla (nyja
   leidin) VERDA ad gefa somu uppstillingu i hverri umferd. `boot` reisir
   appid UR BLOBBINU EINU — sama harness sem `gw1-persistence.mjs` notar,
   thvi thad er thad eina sem sannar ferdina localStorage -> skjar.
   ============================================================ */
console.log("\n--- H2. JAFNGILDID (boot ur blobbinu einu) ---");
{
  const PAIR = [411, 321];                    // Haaland (start) <-> Walle Egeli (bench)
  const OLD_STYLE = {};                       // gamla leidin: sex eins faerslur
  for (let g = 1; g <= 6; g++) OLD_STYLE[g] = [PAIR];
  const NEW_STYLE = { 1: [PAIR] };            // nyja leidin: ein faersla

  /* HVER ER A BEKKNUM I UMFERD n — LESID AF SKJANUM, ur fyrirlida-
     vallistanum (hann ber NAKVAEMLEGA byrjunarlidid, 11 nofn).         */
  const xiOf = async (v, n) => {
    await v.click(gwNode(v, n));
    const sel = v.q("select")[0];
    return sel ? [...sel.querySelectorAll("option")].map(o => o.textContent.trim()).sort().join("|") : null;
  };
  const walk = async state => {
    const v = await boot(JSON.stringify(state));
    ok(!v.crash, `boot an hruns (${JSON.stringify(Object.keys(state))})`, v.crash || "");
    const out = [];
    for (let g = 1; g <= 6; g++) out.push(await xiOf(v, g));
    return { v, out };
  };
  const A = await walk({ captain: 356, benchSwaps: OLD_STYLE });
  const B = await walk({ captain: 356, benchSwaps: NEW_STYLE });
  ok(A.out.every(Boolean) && B.out.every(Boolean),
     "forsenda: byrjunarlidid er læsilegt i ollum sex umferdum, badum blobbum");

  const HAAL = byId[411].web_name;
  /* FORSENDAN: vixlin gera raunverulega eitthvad. An hennar vaeri
     jafngildid graent af thvi ad HVORUGT blobb hefdi ahrif.            */
  const plain = await walk({ captain: 356 });
  ok(plain.out[0] !== A.out[0],
     "forsenda: vixlin BREYTA byrjunarlidinu (annars maelir jafngildid ekkert)");
  ok(plain.out.every(x => x.includes(HAAL)),
     `forsenda: an vixla er ${HAAL} i XI-inu i ollum sex umferdum`);

  /* 1. GAMLA BLOBBID ThYDIR ENN 'A BEKKNUM ALLAR SEX'.                 */
  ok(A.out.every(x => !x.includes(HAAL)),
     `GAMALT BLOBB (6 eins faerslur): ${HAAL} er a bekknum ALLAR SEX umferdir`,
     A.out.map((x, i) => `${i + 1}:${x.includes(HAAL) ? "XI" : "bekk"}`).join(" "));
  /* 2. NYJA BLOBBID ThYDIR ThAD SAMA.                                  */
  ok(B.out.every(x => !x.includes(HAAL)),
     `NYTT BLOBB (1 faersla): ${HAAL} er lika a bekknum ALLAR SEX`,
     B.out.map((x, i) => `${i + 1}:${x.includes(HAAL) ? "XI" : "bekk"}`).join(" "));
  /* 3. OG ThAU ERU JAFNGILD, UMFERD FYRIR UMFERD — ekki bara 'bædi
        einhvern veginn a bekknum'.                                     */
  ok(A.out.join("//") === B.out.join("//"),
     "JAFNGILD: somu ellefu i XI-inu i hverri einustu umferd, badar leidir");
  /* 4. OG HVORUGT SKRIFADI I BLOBBID VID LESTUR.                       */
  ok(JSON.stringify(JSON.parse(A.v.saved() || "{}").benchSwaps) === JSON.stringify(OLD_STYLE),
     "gamla blobbid er OHREYFT a disk — engin sameining, enginn stimpill");
  ok(JSON.stringify(JSON.parse(B.v.saved() || "{}").benchSwaps) === JSON.stringify(NEW_STYLE),
     "og nyja blobbid lika");

  /* 5. VISVITANDI VIXLARI LIFIR — thad er hlidin sem sameining hefdi
        eytt. `{1:[[A,B]], 2:[[A,B]],[[A,B]]}` er 'bekkur GW1, TIL BAKA
        GW2', og GW2 ber TVO vixl a grunninn = grunnurinn.              */
  const TOGGLE = { 1: [PAIR], 2: [PAIR, PAIR] };
  const T = await walk({ captain: 356, benchSwaps: TOGGLE });
  ok(!T.out[0].includes(HAAL), `VIXLARI: ${HAAL} er a bekknum i GW1`);
  ok(T.out[1].includes(HAAL), "og TIL BAKA i XI-inu i GW2 — vixlarinn LIFIR");
  ok(T.out.slice(1).every(x => x.includes(HAAL)),
     "og GW3-6 erfa GW2, svo hann er inni afram");
}

/* ============================================================
   H3. RITUNIN — HANS BREYTING LEGGST A ThAD SEM HANN SA
   ============================================================
   ALLAR fullyrdingar hér ad ofan lesa FORSKRIFAD blob. Thess vegna
   slupppu ThRJAR stokkbreytingar a RITUN-leidinni gegnum safnid (maelt
   20.8.2026): saeding felld, tilvisun deild i stad afrits, og tom fylking
   talin sem skyr lykill. Fullyrding sem les adeins forskrifad astand
   maelir ekki kodann sem SKRIFAR thad.

   Hér er vixlid gert I VIDMOTINU (tveir smellir a spjold) og bædi
   UPPSTILLINGIN og BLOBBID lesin a eftir. Reglan sem er varin:
   `benchSwaps[g]` er ALLTAF fullur mismunur fra grunninum, svo ritun
   VERDUR ad hefjast a erfda listanum — annars hverfur thad sem hann sa a
   skjanum i sama smelli.
   ============================================================ */
console.log("\n--- H3. RITUNIN ---");
{
  const INH = [[496, 497]];                   // GW2: Kinsky <-> Dubravka
  const v = await boot(JSON.stringify({ captain: 356, benchSwaps: { 2: INH } }));
  ok(!v.crash, "boot an hruns", v.crash || "");
  const cardsOf = () => v.q('[draggable="true"]');
  const cardFor = id => cardsOf().find(c => (c.textContent || "").includes(byId[id].web_name));
  const gwBtn = n => v.q("button").find(b => b.textContent.trim() === String(n));
  const xi = () => { const sel = v.q("select")[0];
    return sel ? [...sel.querySelectorAll("option")].map(o => o.textContent.trim()).sort().join("|") : ""; };

  await v.click(gwBtn(4));
  const xiBefore = xi();
  ok(!!xiBefore, "forsenda: byrjunarlidid er læsilegt i GW4");
  /* FORSENDAN SEM GERIR ThETTA MARKTAEKT: GW4 ERFIR GW2, svo Kinsky
     (bekkjadur i GW2) er EKKI i XI-inu adur en hann gerir neitt.       */
  ok(!xiBefore.includes(byId[496].web_name),
     `forsenda: ${byId[496].web_name} er a bekknum i GW4 (erft fra GW2)`);
  ok(xiBefore.includes(byId[423].web_name),
     `forsenda: ${byId[423].web_name} er i XI-inu (hann er thad sem vixlast)`);

  /* VIXLID SJALFT — Shaw (DEF, byrjar) <-> Thomas (DEF, bekkur). Sama
     stada, svo uppstillingin er afram logleg (3 DEF fyrir og eftir).   */
  ok(await v.click(cardFor(423)), "smellur 1: velur Shaw");
  ok(await v.click(cardFor(173)), "smellur 2: vixlar vid Thomas");
  const xiAfter = xi();
  ok(xiAfter !== xiBefore, "uppstillingin BREYTTIST (annars maelir kaflinn ekkert)");
  ok(!/Illegal formation/.test(v.text()), "og hun er LOGLEG — vixlid gekk i gegn");

  /* (a) HANS BREYTING LEGGST A ThAD SEM HANN SA — ekki a grunninn.
         Kinsky VERDUR ad vera afram a bekknum. Thetta er linan sem
         fellur ef saedingin er tekin af.                              */
  ok(!xiAfter.includes(byId[496].web_name),
     `ERFDA UPPSTILLINGIN LIFIR: ${byId[496].web_name} er ENN a bekknum eftir vixlid`);
  ok(!xiAfter.includes(byId[423].web_name), `og ${byId[423].web_name} er farinn a bekkinn`);
  ok(xiAfter.includes(byId[173].web_name), `og ${byId[173].web_name} er kominn i XI-id`);

  /* (b) BLOBBID — listinn er FULLUR mismunur fra grunninum, svo hann
         ber BADA vixlin (erfda + hans).                               */
  const blob = JSON.parse(v.saved() || "{}");
  const g4 = blob.benchSwaps?.[4];
  ok(Array.isArray(g4) && g4.length === 2,
     `GW4-listinn ber TVO vixl — erfda + hans (${g4 && g4.length})`, JSON.stringify(g4));
  ok(JSON.stringify(g4?.[0]) === JSON.stringify(INH[0]),
     "og hann HEFST a erfda vixlinu", JSON.stringify(g4?.[0]));
  ok(JSON.stringify(g4?.[1]) === JSON.stringify([423, 173]), "og hans eigid kemur a eftir");

  /* (c) GW2 ER OSNORT. Fellur ef ritunin deilir TILVISUN i stad afrits —
         `own.push()` hefdi breytt GW2-fylkinu a stadnum.              */
  ok(JSON.stringify(blob.benchSwaps?.[2]) === JSON.stringify(INH),
     "GW2-listinn er OSNORTINN — ritunin afritar, hun deilir ekki tilvisun",
     JSON.stringify(blob.benchSwaps?.[2]));
  await v.click(gwBtn(2));
  ok(!xi().includes(byId[496].web_name) && xi().includes(byId[423].web_name),
     "og GW2-uppstillingin sjalf er obreytt a skjanum");
  ok(!NANRE.test(v.text()), "ekkert NaN/undefined");
}
{
  /* (c2) SAEDINGIN TEKUR NAESTA LYKIL A UNDAN, EKKI FYRSTA.
         ThETTA TILFELLI ER NAUDSYNLEGT OG ThAD VAR MAELT: med EINUM lykli
         a undan finna 'naesti nidur' og 'fyrsti upp' SAMA lykilinn, svo
         stokkbreytingin 'skanna 1..gw-1 upp' slapp gegnum safnid. Hun
         fellur adeins thegar TVEIR lyklar eru a undan og their eru OLIKIR. */
  const G1 = [[411, 321]];                    // Haaland  <-> Walle Egeli
  const G2 = [[423, 173]];                    // Shaw     <-> Thomas
  const v = await boot(JSON.stringify({ captain: 356, benchSwaps: { 1: G1, 2: G2 } }));
  ok(!v.crash, "boot an hruns (tveir lyklar a undan)", v.crash || "");
  const cardFor = id => v.q('[draggable="true"]')
    .find(c => (c.textContent || "").includes(byId[id].web_name));
  const gwBtn = n => v.q("button").find(b => b.textContent.trim() === String(n));
  const xi = () => { const sel = v.q("select")[0];
    return sel ? [...sel.querySelectorAll("option")].map(o => o.textContent.trim()).sort().join("|") : ""; };
  const HAAL = byId[411].web_name, SHAW = byId[423].web_name;
  await v.click(gwBtn(1));
  ok(!xi().includes(HAAL) && xi().includes(SHAW),
     `forsenda: GW1 = ${HAAL} a bekknum, ${SHAW} inni`);
  await v.click(gwBtn(2));
  ok(xi().includes(HAAL) && !xi().includes(SHAW),
     `forsenda: GW2 er ANNAD — ${HAAL} inni, ${SHAW} a bekknum (listinn er fullur mismunur fra grunni)`);
  await v.click(gwBtn(4));
  ok(xi().includes(HAAL) && !xi().includes(SHAW), "forsenda: GW4 erfir GW2, ekki GW1");
  /* Vixl i GW4: Virgil (DEF, byrjar) <-> Hughes (DEF, bekkur).         */
  ok(await v.click(cardFor(356)), "smellur 1 i GW4");
  ok(await v.click(cardFor(278)), "smellur 2 i GW4");
  ok(!/Illegal formation/.test(v.text()), "vixlid er logleg uppstilling");
  const g4 = JSON.parse(v.saved() || "{}").benchSwaps?.[4];
  ok(Array.isArray(g4) && g4.length === 2, `GW4 ber tvo vixl (${g4 && g4.length})`);
  ok(JSON.stringify(g4?.[0]) === JSON.stringify(G2[0]),
     "og saedingin kom ur GW2 — NAESTA lykli a undan", JSON.stringify(g4?.[0]));
  ok(JSON.stringify(g4?.[0]) !== JSON.stringify(G1[0]),
     "og EKKI ur GW1, sem er fyrsti lykillinn");
  ok(xi().includes(HAAL), `og ${HAAL} er afram inni eftir vixlid (GW2-uppstillingin lifdi)`);
}
{
  /* (d) TOM FYLKING ER EKKI SKYR LYKILL. Undir gomlu merkingunni gaf `[]`
         grunninn — nakvaemlega thad sama sem VANTANDI lykill — svo hun ber
         engan greinanlegan asetning, og stok tom fylking ur skemmdu
         blobbi mundi ella FRYSTA grunn-uppstillinguna um allt tímabilid. */
  const v = await boot(JSON.stringify({ captain: 356,
    benchSwaps: { 1: [[411, 321]], 3: [] } }));
  ok(!v.crash, "boot an hruns med tomri fylkingu", v.crash || "");
  const gwBtn = n => v.q("button").find(b => b.textContent.trim() === String(n));
  const xi = () => { const sel = v.q("select")[0];
    return sel ? [...sel.querySelectorAll("option")].map(o => o.textContent.trim()).sort().join("|") : ""; };
  const HAAL = byId[411].web_name;
  await v.click(gwBtn(1));
  ok(!xi().includes(HAAL), `forsenda: ${HAAL} er a bekknum i GW1`);
  await v.click(gwBtn(3));
  ok(!xi().includes(HAAL),
     `TOM FYLKING i GW3 er SLEPPT — GW3 erfir GW1 og ${HAAL} er afram a bekknum`);
  await v.click(gwBtn(4));
  ok(!xi().includes(HAAL), "og GW4 lika");
}

/* ============================================================
   I. 'Never in your XI' — MERKIMIDINN OG RODIN
   ============================================================
   Uppsetningin er BYGGINGARLEG fullyrding (jsdom hefur enga
   uppsetningarvel, svo `scrollWidth` er permanent-graent og thvi
   verdlaust — CLAUDE.md 5b). Fullyrt er um ThAER ThRJAR EIGINDIR sem
   orsokudu yfirflaedid.
   ============================================================ */
console.log("\n--- I. 'Never in your XI' ---");
{
  const ST = SRC("src/appStyles.js"), APP = SRC("src/App.jsx");
  ok(/srcRow: \{[^}]*flexWrap:"wrap"/.test(ST), "BYGGINGARLEG: rodin ma BROTNA (`flexWrap:\"wrap\"`)");
  ok(/srcName: \{[^}]*minWidth:0/.test(ST), "BYGGINGARLEG: nafnholfid ma skreppa (`minWidth:0`)");
  ok(/srcAct: \{[^}]*flexShrink:0/.test(ST), "BYGGINGARLEG: tala+hnappur eru OSKIPTANLEG blokk (`flexShrink:0`)");
  ok(/srcAct: \{[^}]*marginLeft:"auto"/.test(ST), "og haegri-jofnud a BADUM linum (`marginLeft:auto`)");
  ok(/posDot: \{[^}]*flexShrink:0/.test(ST), "stodu-hringurinn skreppur ekki i ekkert");
  ok(!/<span style=\{\{ flex:1 \}\} \/>\s*\n\s*<span style=\{S\.srcFrees\}/.test(APP),
     "gamla flex-fyllingin milli tolu og hnapps er farin");

  /* MERKIMIDINN — a raungognum, med POSITIFRI forsendu fyrst.          */
  const PLAYED = { "events.json": { events: playedEvents(J("events.json").events, 4) } };
  const v = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } }, { patch: PLAYED });
  const banner = cardOf(v, "Not been in your XI", "Save £");
  ok(!!banner, "bordinn birtist og ber Save-merkimidann");
  const seg = banner ? banner.textContent : "";
  ok(/£\d+\.\d/.test(seg), "forsenda: rodin ber raunverulega tolu (annars er naesta lina tom)");
  ok(/Save £\d+\.\d/.test(seg), "NYI MERKIMIDINN: Save £X");
  ok(!/frees up to/.test(v.text()), "og 'frees up to' er HORFID ur ollu vidmotinu");
  ok(!/frees the money shown/.test(v.text()), "lika ur malsgreininni fyrir ofan");
  const btn = banner && [...banner.querySelectorAll("button")]
    .find(b => (b.textContent || "").trim() === "Replace");
  ok(!!btn, "og 'Replace'-hnappurinn er a sinum stad");
  ok(!NANRE.test(seg), "ekkert NaN/undefined i bordanum");
}

/* ============================================================
   J. st0% — OMAELD NULLTALA A SPJALDINU
   ============================================================
   TVISVIDS-SKILYRDID (`starts` OG `minutes`) er profad a raungognum i
   BADAR attir i `clock-states.mjs` kafla B3. Hér er ADEINS SPJALDID:
   talan a ekki lengur ad birtast, og forsendan syn ad hun VAR their.
   ============================================================ */
console.log("\n--- J. st0% ---");
{
  /* FORSENDAN — GAMLA skilyrdid (`starts != null` eitt) reiknad hér, svo
     fullyrdingin sé ekki tom: thrir menn i PROFLIDINU sjalfu hofdu
     `starts:0, minutes:0` og fengu thvi 'st0%" og level 'high".        */
  const zeroed = START_IDS.map(id => byId[id])
    .filter(p => Number(p.starts) === 0 && Number(p.minutes) === 0);
  ok(zeroed.length >= 3,
     `forsenda: ${zeroed.length} menn i proflidinu hofdu starts=0 OG minutes=0 (Thomas/Hughes/Walle Egeli)`);
  /* HVERNIG ER SYNT AD MERKID VAR ThAR, ThEGAR GAMLA SKILYRDID ER FARID?
     EKKI med afriti af gomlu formulunni — thad vaeri onnur utfaersla sem
     gaeti rekid i sundur. Heldur med LIFANDI fallinu og MINUTUNUM SEM
     EINU BREYTUNNI: sami leikmadur, sama `starts: 0`, en 214 minutur ->
     `pct` er afram 0 og `level` er 'high'. Thad er nakvaemlega sa reitur
     sem hann bar adur, thvi gamla skilyrdid las minuturnar ALDREI.      */
  ok(zeroed.every(p => {
       const r = rotationRisk({ ...p, minutes: 214 }, 0);
       return r && r.pct === 0 && r.level === "high";
     }),
     "og med minutum (eina breytan) fa their 'high' + st0% — reiturinn VAR their");
  ok(zeroed.every(p => rotationRisk(p, 0) === null),
     "undir nyja skilyrdinu fa their ENGA tolu");

  const v = await mount({ captain: 411 });
  ok(!/\bst0%/.test(v.text()), "og 'st0%' er hvergi a skjanum");
  /* OG MERKID ER EKKI HORFID YFIR HAUS: einhver a raungognum a ad hafa
     thad afram — annars vaeri lagfaeringin ad henda mælingunni.        */
  const keep = ALL.filter(p => Number(p.starts) === 0 && Number(p.minutes) > 0);
  ok(keep.length > 0, `forsenda: ${keep.length} leikmenn hafa 0 byrjanir MED raunminutum`);
  ok(keep.every(p => rotationRisk(p, 0)?.level === "high"),
     "og their HALDA allir flagginu — bædi attir, ekki adeins lagfaeringar-attin");
  /* NULL-VORDURINN SJALFUR ER OSYNILEGUR A RAUNGOGNUM — `starts == null` er
     0 af 595 — svo hann tharf TILBUID tilfelli. An thessarar linu slapp
     stokkbreytingin `p?.starts ?? 0` GEGNUM safnid (maelt 20.8.2026).   */
  ok(rotationRisk({ starts: null, minutes: 900 }, 0) === null,
     "`starts` sem VANTAR -> ENGIN tala, thott minutur seu til (tilbuid tilfelli)");
  ok(rotationRisk({ minutes: 900 }, 0) === null, "og svid sem er hvergi -> ENGIN tala");
  ok(!NANRE.test(v.text()), "ekkert NaN/undefined");
}

/* ============================================================
   K. 'Not been in your XI' — AFTURABAK, OG FORLEIKUR ER ThOGN
   ============================================================
   Framvirka utgafan spurdi um uppstillingar sem voru ekki til. Nu er
   spurningin um umferdir sem ERU BYRJADAR. ThRJAR fullyrdingar sem
   greina thetta ad: (1) forleikur -> ekkert sagt · (2) madur a bekknum
   ALLAR spiladar umferdir -> nefndur · (3) madur sem BYRJADI EINU SINNI
   -> EKKI nefndur (thad er linan sem fellur ef golfid er tekid af eda ef
   'aldrei' er lauslega skilgreint).
   ============================================================ */
console.log("\n--- K. AFTURABAK ---");
{
  const EV = J("events.json").events;
  const P4 = { "events.json": { events: playedEvents(EV, 4) } };
  const P1 = { "events.json": { events: playedEvents(EV, 1) } };
  const HAAL = byId[411].web_name;

  /* 1. FORLEIKUR — committud gogn, engin umferd byrjud.                */
  const pre = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } });
  const started = EV.filter(e => e.deadline_time
    && Date.now() >= new Date(e.deadline_time).getTime()).length;
  ok(started === 0, `forsenda: engin umferd er byrjud i committudum gognum (${started})`);
  ok(!/Not been in your XI/.test(pre.text()),
     "FORLEIKUR: bordinn segir EKKERT — engin notkunar-saga er til");
  ok(!/as you have them set up/.test(pre.text()),
     "og gamla framvirka fullyrdingin er hvergi i vidmotinu");

  /* 2. GOLFID — EIN byrjud umferd er ekki nog til ad brennimerkja mann. */
  const one = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } }, { patch: P1 });
  ok(!/Not been in your XI/.test(one.text()),
     "EIN byrjud umferd -> afram ThOGN (golfid er tvaer)");

  /* 3. SAGA — Haaland a bekknum GW1-4 (erfist fra einni faerslu).      */
  const v = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } }, { patch: P4 });
  ok(/Not been in your XI/.test(v.text()), "FJORAR byrjadar umferdir -> bordinn birtist");
  const banner = cardOf(v, "Not been in your XI", "Save £");
  ok(!!banner, "bordinn fannst sem afmarkad element");
  const seg = banner ? banner.textContent : "";
  ok(seg.includes(HAAL), `og hann nefnir ${HAAL}, sem var a bekknum ALLAR fjorar`);
  /* GLUGGINN A SKJANUM = UMFERDIRNAR SEM VORU LESNAR. Fost tala um
     lifandi gogn er 'set-pieces 4-10'-bilunin (CLAUDE.md kafli 8).
     MALSGREININ SJALF ER FARIN 21.8. (notandinn: "alltof mikill og
     flokinn texti") og glugginn stendur i HAUSNUM i stad hennar — svo
     fullyrdingin er nu um hausinn OG um att-linuna, og MALSGREININ MA
     EKKI KOMA AFTUR.                                                   */
  ok(/GW1–4/.test(seg), "hausinn ber gluggann sem var lesinn", seg.slice(0, 90));
  ok(/what you actually did/.test(seg),
     "og ATTIN er merkt a kassanum — annars er hann ekki greinanlegur fra aaetlunar-kassanum");
  ok(!/Looking back at the/.test(v.text()),
     "MALSGREININ ER FARIN — hun sagdi thridja sinni thad sem hausinn og rodin segja");
  ok(!/Selling one saves/.test(v.text()),
     "og verdgolfs-malsgreinin er farin (reglan er i tooltip a 'Save £')");
  ok(!/next \d+ gameweeks/.test(v.text()), "ekkert 'next N gameweeks' er eftir");
  /* VERDGOLFID — odyrasti bekkjarmadur per stodu er ALDREI nefndur.    */
  ok(!/Dubravka|Thomas|Hughes/.test(seg),
     "ODYRASTI BEKKJARMADUR ER AFRAM ALDREI NEFNDUR (verdgolfin obreytt)");

  /* 3b. GLUGGINN MA ALDREI NA YFIR OBYRJADA UMFERD.
        ThETTA TILFELLI ER NAUDSYNLEGT OG ThAD VAR MAELT: med `gw === to`
        er `Math.min(gw, lastPlayed)` ohaggad hvort sem `lastPlayed` er rett
        eda `maxGw`, svo stokkbreytingin „teldu allar umferdir sem sogu"
        SLAPP GEGNUM safnid. Hun fellur adeins thegar notandinn er ad SKODA
        umferd sem er ekki byrjud.                                       */
  const P2 = { "events.json": { events: playedEvents(EV, 2) } };
  const far = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } }, { patch: P2 });
  const n6 = far.q("button").find(b => b.textContent.trim() === "6");
  ok(!!n6, "forsenda: GW6-hnutur er a timalinunni");
  await far.click(n6);
  ok(/GW6/.test(far.text()), "forsenda: GW6 er valin — umferd sem er EKKI byrjud");
  const fseg = (cardOf(far, "Not been in your XI", "Save £") || { textContent: "" }).textContent;
  ok(/Not been in your XI/.test(far.text()), "bordinn er samt their (tvaer umferdir eru byrjadar)");
  /* FULLYRDINGIN ER A HAUSNUM NUNA, OG HUN ER PORUD: fyrst ad GW1-2
     SE ThAR (svo neikvaeda fullyrdingin hafi eitthvad ad falla a — sja
     CLAUDE.md 5b regla 2), svo ad engin umferd EFTIR GW2 se i honum.
     `!/up to GW6/` var notad her adur og er nu TAUTOLOGIA (ordid "up to"
     er hvergi i vidmotinu), svo hun er skipt ut fyrir mælingu a
     GLUGGANUM sjalfum: afturvirki kassinn ma ALDREI enda a 6.         */
  ok(/GW1–2/.test(fseg),
     "hausinn les ADEINS upp i GW2 — glugginn stoppar vid sidustu BYRJADA umferd", fseg.slice(0, 100));
  ok(!/GW\d+–(?:[3-9]|\d\d)\b/.test(fseg),
     "og hann endar ALDREI a umferd sem er ekki byrjud (t.d. GW6)", fseg.slice(0, 100));

  /* 4. BYRJADI EINU SINNI -> EKKI NEFNDUR. Sama blob, en hann er tekinn
        af bekknum aftur i GW3, svo hann byrjar GW3 og GW4.              */
  /* GW3 BER TVO VIXL A GRUNNINN = GRUNNURINN, svo hann BYRJAR i GW3 og
     GW4 (sem erfir GW3). Thetta er rett kodun eftir 'sidasti skyri
     lykill'-regluna: listinn i hverri umferd er FULLUR mismunur fra
     grunninum, svo 'til baka' er tvofalt vixl og ekki tomur lykill.   */
  const v2 = await mount({ captain: 411,
    benchSwaps: { 1: [[411, 321]], 3: [[411, 321], [411, 321]] } }, { patch: P4 });
  const b2 = cardOf(v2, "Not been in your XI", "Save £");
  ok(/Not been in your XI/.test(v2.text()) === false || !(b2 || { textContent: "" }).textContent.includes(HAAL),
     `${HAAL} er EKKI nefndur eftir ad hann byrjadi tvaer af fjorum`);
  ok(!NANRE.test(v.text()) && !NANRE.test(v2.text()), "ekkert NaN/undefined");
}

/* ============================================================
   L. TALNINGIN — TILBUIN SAGA ThAR SEM SVARID ER ThEKKT FYRIRFRAM
   ============================================================
   Notandinn: „teldu tha hversu oft vidkomandi er i XI. Ballard t.d.
   kannski bara 1x eda eitthvad." KJARNINN i thessari breytingu er ad sa
   sem byrjadi EINU SINNI se NEFNDUR MED TOLUNNI 1 — undir gamla
   `starts === 0`-skilyrdinu var hann osynilegur. Fullyrdingin sem fellur
   vid afturfor er thvi 'A(1) ER I listanum', ekki 'C er i honum'.

   Radirnar eru TILBUNAR (`perGw` beint inn i `rarelyStarted`) svo svarid
   se thekkt an tilvisunar i raungogn — sama mynstur og kafli A i
   `buy-windows.mjs`.
   ============================================================ */
console.log("\n--- L. TALNINGIN ---");
{
  const W = 6;
  /* A: 0 af 6 · B: 1 af 6 (GW3) · C: 6 af 6 · D: 3 af 6 (yfir thridjungi) */
  const perGw = [];
  for (let g = 1; g <= W; g++) perGw.push({ gw: g, squad: [
    { id: 1, starter: false },
    { id: 2, starter: g === 3 },
    { id: 3, starter: true },
    { id: 4, starter: g <= 3 },
  ] });
  const bId = {
    1: { id: 1, element_type: 2, now_cost: 60 },
    2: { id: 2, element_type: 2, now_cost: 55 },
    3: { id: 3, element_type: 2, now_cost: 70 },
    4: { id: 4, element_type: 2, now_cost: 65 },
  };
  const floors = { 2: 40 };
  const res = rarelyStarted({ perGw, byId: bId, floors });
  const by = Object.fromEntries(res.map(r => [r.id, r]));
  ok(by[1]?.starts === 0 && by[1]?.gws === W, `A: 0 af ${W} — nefndur med tolunni 0`);
  /* ThETTA ER BREYTINGIN. Undir `starts === 0` var B EKKI i listanum.  */
  ok(by[2]?.starts === 1 && by[2]?.gws === W,
     `B: 1 af ${W} — NEFNDUR, og talan er 1 (var osynilegur adur)`);
  ok(!by[3], "C: 6 af 6 — EKKI nefndur");
  ok(!by[4], "D: 3 af 6 — yfir thridjungs-afmorkuninni, EKKI nefndur");
  /* RODUNIN: minnst notadur fyrst, thott B se ODYRARI en A (55 < 60) —
     svo rodin getur ekki verid fe-rodun i dulargervi.                  */
  ok(res[0]?.id === 1 && res[1]?.id === 2,
     "radad EFTIR NOTKUN UPP (0 fyrir 1), ekki eftir fe", res.map(r => r.id).join(","));
  ok(by[1]?.freesTenths === 20 && by[2]?.freesTenths === 15,
     "og fe-talan er afram verd minus golf (obreytt)");

  /* NEFNARINN: madur sem KEMUR i GW4 hefur verid i hopnum ThRJAR umferdir,
     svo talan er '0 af 3' — ekki '0 af 6', sem vaeri osatt um hann.    */
  const late = [];
  for (let g = 1; g <= W; g++) late.push({ gw: g, squad: [
    { id: 3, starter: true },
    ...(g >= 4 ? [{ id: 1, starter: false }] : []),
  ] });
  const r2 = rarelyStarted({ perGw: late, byId: bId, floors });
  ok(r2.length === 1 && r2[0].id === 1 && r2[0].gws === 3 && r2[0].starts === 0,
     "sa sem kom i GW4: '0 af 3' — nefnarinn er umferdirnar HANS, ekki gluggin");

  /* GOLFIN OG THAKID — obreytt hegdun ur eldri utgafu.                 */
  const oneGw = [{ gw: 1, squad: [{ id: 1, starter: false }] }];
  ok(rarelyStarted({ perGw: oneGw, byId: bId, floors }).length === 0,
     "EIN umferd -> ekkert flagg (golfid stendur)");
  ok(rarelyStarted({ perGw, byId: bId, floors: {} }).length === 0,
     "engin verdgolf -> ekkert flagg (verdgolfs-reglan stendur)");
  ok(Array.isArray(rarelyStarted({})) && rarelyStarted({}).length === 0,
     "tomt inntak hrynur ekki");
  /* ThAKID ER UI-AFMORKUN og hun er TALIN, ekki gefin ser.             */
  const many = [];
  for (let g = 1; g <= W; g++) many.push({ gw: g,
    squad: Array.from({ length: 9 }, (_, i) => ({ id: 10 + i, starter: false })) });
  const bMany = {}; for (let i = 0; i < 9; i++) bMany[10 + i] = { id: 10 + i, element_type: 2, now_cost: 50 + i };
  ok(rarelyStarted({ perGw: many, byId: bMany, floors }).length === 5,
     "NIU gjaldgengir -> FIMM radir (UI-thak, ekki likan)");

  /* OG A SKJANUM: talan birtist MED nefnara.                           */
  const PLAYED = { "events.json": { events: playedEvents(J("events.json").events, 4) } };
  const v = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } }, { patch: PLAYED });
  const banner = cardOf(v, "Not been in your XI", "Save £");
  ok(!!banner, "forsenda: bordinn er a skjanum");
  const seg = banner ? banner.textContent : "";
  ok(/\d+ of \d+ in XI/.test(seg), `talan er a rodinni MED nefnara`, seg.slice(0, 120));
  ok(/0 of 4 in XI/.test(seg),
     "og hun er '0 of 4' — nefnarinn er umferdirnar sem voru lesnar", seg.slice(0, 120));
  ok(!/\bof 6 in XI/.test(seg),
     "og ALDREI nefnari sem er ekki raunverulegi glugginn (6 var thakid, ekki gluggin)");
}

/* ============================================================
   M. SKIPTA-TILLAGAN — HORDU SIURNAR OG TENGINGIN
   ============================================================
   Tillaga sem er OLOGLEG er verri en engin, svo hver sia er profud a
   RAUNGOGNUM: sama stada, verd <= soluverd + banki, 3-per-felag eftir
   skiptin, `avail > 0` og raunverulegar PL-minutur. Og rodunin er ekki
   „einhver rodun" heldur SU MAELDA — thess vegna er TENGINGIN fullyrt
   eins og `buildTeamMetrics` i `prediction-ledger.mjs`.
   ============================================================ */
console.log("\n--- M. SKIPTA-TILLAGAN ---");
{
  const APP = SRC("src/App.jsx"), REC = SRC("src/recommend.js");
  /* TENGING: rodunin kemur ur `buildRecommendations`, sem raðar eftir
     `rank` (= `rankScore` i model.js). App.jsx KALLAR hana ekki sjalft. */
  ok(/rankedByPos\[pos\] = all\.filter/.test(REC) && /\.sort\(\(a,b\) => b\.rank - a\.rank\)/.test(REC),
     "TENGING: `rankedByPos` er byggd i recommend.js og roðud eftir `rank`");
  ok(/rankScore/.test(SRC("src/model.js")), "forsenda: `rankScore` er i model.js");
  ok(!/\brankScore\s*\(/.test(APP),
     "App.jsx KALLAR `rankScore` ALDREI — rodunin er flutt inn, ekki afrituð");
  ok(/recommendations\?\.rankedByPos/.test(APP), "og bordinn les hana thadan");
  /* OG HANN BLANDAR EKKI SOLU-RODUNINNI SAMAN VID KAUP-RODUNINA.       */
  ok(/rankedByPos\[pos\]/.test(REC) && !/rankedByPos\[pos\][\s\S]{0,120}a\.score/.test(REC),
     "og `rankedByPos` raðar EKKI eftir `score` (thad er SOLU-rodunin)");

  const PLAYED = { "events.json": { events: playedEvents(J("events.json").events, 4) } };
  /* HVER ER SETTUR A BEKKINN OG HVERS VEGNA EKKI HAALAND: Man City eiga
     LETTUSTU leikina i deildinni, svo ENGINN framherji a thaegilegri leiki
     en hann — og tha er RETT SVARID ad birta enga tillogu. Sa endinn er
     profadur nedar. Calvert-Lewin (LEE) a thyngri leiki, svo tillogur ERU
     til fyrir hann og siurnar hafa eitthvad ad bita i.                  */
  const SIT = 346;                                  // Calvert-Lewin, LEE FWD
  const v = await mount({ captain: 411, benchSwaps: { 1: [[SIT, 321]] } }, { patch: PLAYED });
  const banner = cardOf(v, "Not been in your XI", "Save £");
  ok(!!banner, "forsenda: bordinn er a skjanum");
  const seg = banner ? banner.textContent : "";
  ok(/Save £\d/.test(seg), "forsenda: rodin er raunveruleg (ber Save-tolu)");
  ok(seg.includes(byId[SIT].web_name), `forsenda: ${byId[SIT].web_name} er rodin sem er skodud`);  ok(!NANRE.test(seg), "ekkert NaN/undefined i bordanum");

  /* ============================================================
     HVER SIA, EIN OG SER, A TILBUNU INNTAKI
     ============================================================
     ThETTA ER KJARNI KAFLANS OG ThAD ER MAELT NAUDSYNLEGT: raungagna-
     fullyrdingarnar ad ofan stodust SJO af atta stokkbreytingum, thvi
     toppmennirnir tveir eftir `rankScore` fullnaegja hvort eda er ollum
     siunum — ad taka eina ur sambandi breytti ekki thvi sem birtist.
     Hér er hver sia latin VERA ThAD SEM SKILUR: frambjodandinn er ALLTAF
     efstur i `ranked`, svo hann kemur INN nema sian utiloki hann.
     ============================================================ */
  const OUT = { id: 900, element_type: 4, team: 10, now_cost: 90 };
  const mk = (o = {}) => ({ p: { id: 901, element_type: 4, team: 20,
    now_cost: 70, minutes: 900, chance_of_playing_next_round: null, ...(o.p || {}) },
    /* `in`, EKKI `??`: `??` gleypir `null` og gerdi `ffdrAvg: null`-
       tilfellid ad 2.0, svo fullyrdingin um vantandi FFDR maeldi allt
       annad en hun sagdi (fannst 20.8.2026 — hun FELL og sagdi thad).  */
    avail: "avail" in o ? o.avail : 1,
    ffdrAvg: "ffdrAvg" in o ? o.ffdrAvg : 2.0 });
  const call = (cand, over = {}) => swapCandidates({ ranked: [cand], outP: OUT,
    squadIds: new Set(over.squad || []), perClub: over.perClub || {},
    budget: over.budget ?? 100,
    ownFfdr: "ownFfdr" in over ? over.ownFfdr : 3.0, max: over.max ?? 2 });
  /* FORSENDAN: grunn-tilfellid KEMUR INN. An hennar vaeri hver
     „utilokad"-lina graen af thvi ad ekkert kemur inn nokkru sinni.    */
  ok(call(mk()).length === 1, "FORSENDA: grunn-frambjodandi KEMUR INN");
  ok(call(mk({ p: { element_type: 3 } })).length === 0, "ONNUR STADA -> ut");
  ok(call(mk(), { squad: [901] }).length === 0, "ThEGAR I HOPNUM -> ut");
  ok(call(mk({ p: { now_cost: 101 } }), { budget: 100 }).length === 0,
     "YFIR FJARHAGSAETLUN (101 > 100) -> ut");
  ok(call(mk({ p: { now_cost: 100 } }), { budget: 100 }).length === 1,
     "og NAKVAEMLEGA a fjarhagsaetlun kemur inn (<=, ekki <)");
  ok(call(mk(), { perClub: { 20: 3 } }).length === 0, "ThRIR FRA SAMA FELAGI -> ut");
  ok(call(mk({ p: { team: 10 } }), { perClub: { 10: 3 } }).length === 1,
     "en salan opnar saeti hja HANS felagi, svo 3 hja SAMA felagi er LOGLEGT");
  ok(call(mk({ p: { team: 10 } }), { perClub: { 10: 4 } }).length === 0,
     "og fjorir hja hans felagi er thad ekki");
  ok(call(mk({ avail: 0 })).length === 0, "`avail === 0` -> ut");
  ok(call(mk({ p: { chance_of_playing_next_round: 0 } })).length === 0,
     "FPL-tala 0% -> ut (`avail` er 1 thegar status er 'a', svo hun ein naegir ekki)");
  ok(call(mk({ p: { chance_of_playing_next_round: null } })).length === 1,
     "en `null` er 'veit ekki' og utilokar EKKI");
  ok(call(mk({ p: { minutes: 0 } })).length === 0,
     "ENGAR PL-MINUTUR -> ut ('ohekkt' ma ekki birtast eins og 'gott')");
  ok(call(mk({ ffdrAvg: 3.0 })).length === 0,
     "SOMU leikjathyngd (3,0 vs 3,0) -> ut — 'thaegilegri' tydir LAEGRI");
  ok(call(mk({ ffdrAvg: 3.5 })).length === 0, "ThYNGRI leikir -> ut");
  ok(call(mk({ ffdrAvg: null })).length === 0, "VANTANDI FFDR -> ut (vantar er ekki 'jafngott')");
  ok(call(mk(), { ownFfdr: null }).length === 0, "og vantandi FFDR HANS -> engin tillaga");
  /* ThAKID ER UI-AFMORKUN OG ThAD ER TALID.                             */
  const many = Array.from({ length: 5 }, (_, i) => mk({ p: { id: 910 + i } }));
  ok(swapCandidates({ ranked: many, outP: OUT, squadIds: new Set(),
        perClub: {}, budget: 100, ownFfdr: 3.0, max: 2 }).length === 2,
     "FIMM gjaldgengir -> TVEIR (UI-thak)");
  /* RODUNIN ER GEFIN, EKKI REIKNUD: fallid VELUR i thvi rodinni sem thad
     faer. Snuum inntakinu og fyrsta svarid snyst med.                  */
  const a = mk({ p: { id: 921 } }), b = mk({ p: { id: 922 } });
  ok(swapCandidates({ ranked: [a, b], outP: OUT, squadIds: new Set(), perClub: {},
        budget: 100, ownFfdr: 3.0, max: 1 })[0].p.id === 921
     && swapCandidates({ ranked: [b, a], outP: OUT, squadIds: new Set(), perClub: {},
        budget: 100, ownFfdr: 3.0, max: 1 })[0].p.id === 922,
     "og fallid RADAR ENGU sjalft — thad fylgir rodinni sem `rankScore` gaf");
  ok(swapCandidates({}).length === 0 && swapCandidates({ ranked: null, outP: OUT }).length === 0,
     "tomt/ogilt inntak hrynur ekki");
}

/* ============================================================
   N. RESET — HNAPPURINN SEM EYDDI LIDINU
   ============================================================
   Notandinn, korter fyrir frest: „Er mer ohaett ad reset all planning,
   dettur tha starting GW1 lidid ut?" Svarid VAR ja. `setPlan([])` er
   eydingarskipun a hopnum, thvi hopurinn ER `START_SQUAD` + `plan`.
   FULLYRDINGIN SEM HEFDI TEKID ThETTA er hopurinn FYRIR og EFTIR — ekki
   „hnappurinn er their" og ekki „textinn er rettur".
   ============================================================ */
console.log("\n--- N. RESET ---");
const squadNames = v => cards(v).map(c => {
  const t = (c.textContent || "");
  return (ALL.find(p => t.includes(p.web_name)) || {}).id;
}).filter(Boolean).sort((a, b) => a - b).join(",");
{
  /* 1. ADEINS GW1 — hopurinn A ad standa OHREYFDUR.                    */
  const v = await mount({ captain: 411, plan: GW1_PLAN });
  const before = squadNames(v);
  ok(before.split(",").length === 15, `forsenda: 15 spjold a skjanum (${before.split(",").length})`);
  ok(GW1_PLAN.every(t => before.includes(String(t.inId))),
     "forsenda: allir fjorir GW1-menn eru i hopnum FYRIR reset");
  const btn = v.q("button").find(b => /reset transfer planning/.test(b.textContent || ""));
  ok(!!btn, "forsenda: hnappurinn er their");
  await v.click(btn);
  const yes = v.q("button").find(b => /yes, clear planning/.test(b.textContent || ""));
  ok(!!yes, "forsenda: stadfestingar-hnappurinn er their");
  await v.click(yes);
  const after = squadNames(v);
  ok(after === before, "HOPURINN ER OHREYFDUR eftir reset — 15 somu id", `${before} -> ${after}`);
  ok(GW1_PLAN.every(t => after.includes(String(t.inId))),
     "og hver einasti GW1-madur er enn inni (var: allir fjorir horfnir)");
  ok(/Starting squad/.test(v.text()), "og upphaflids-kaflinn stendur afram");
  /* VISTAD ASTAND — reload ma ekki gefa annad svar. `gw1-persistence.mjs`
     ber boot-from-blob harness-inn; hér er BLOBBID sannreynt, sem er thad
     sem hann bootar UR.                                                 */
  const blob = JSON.parse(v.blob() || "{}");
  ok(Array.isArray(blob.plan) && blob.plan.length === 4,
     `vistada aetlunin ber afram fjora GW1-val (${blob.plan?.length})`);
  ok(blob.plan.every(t => Number(t.gw) === 1), "og alla i GW1");
  ok(blob.plan.every(t => "gw" in t && "outId" in t && "inId" in t),
     "og GERDIN ER OHREYFD (gw/outId/inId)");
}
{
  /* 2. GW1 + GW2-4 — ADEINS GW2+ fer, og fyrirlidinn helst.            */
  const P2 = ALL.filter(p => p.element_type === 3 && p.status === "a"
    && !START_IDS.includes(p.id) && p.id !== P_MID.id).slice(0, 3);
  const CAP = 356;                                  // Virgil, ekki START_CAPTAIN
  const mixed = [...GW1_PLAN,
    { gw: 2, outId: 397, inId: P2[0].id },
    { gw: 3, outId: 426, inId: P2[1].id },
    { gw: 4, outId: 368, inId: P2[2].id }];
  const VICE = 423;                                 // Shaw, valinn vari
  const v = await mount({ captain: CAP, vice: VICE, plan: mixed,
    benchSwaps: { 2: [[496, 497]] }, chips: { "bboost:1": 5 } });
  ok(/Transfer plan/.test(v.text()), "forsenda: skiptaaetlunin er their");
  ok(CAP !== 411, "forsenda: fyrirlidinn er EKKI sjalfgefni (START_CAPTAIN)");
  const b0 = JSON.parse(v.blob() || "{}");
  ok(Number(b0.captain) === CAP && Number(b0.vice) === VICE,
     `forsenda: bandid er SETT fyrir reset (C ${b0.captain} / V ${b0.vice})`);
  const btn = v.q("button").find(b => /reset transfer planning/.test(b.textContent || ""));
  await v.click(btn);
  const c = v.text();
  ok(/Clear transfer planning \(3 transfers/.test(c),
     "textinn telur ThRJU skipti — ekki sjo", c.slice(0, 0));
  ok(/starting squad \(4 GW1 picks\) is NOT touched/.test(c),
     "og segir ad upphafslidid se OSNORT");
  await v.click(v.q("button").find(b => /yes, clear planning/.test(b.textContent || "")));
  const b2 = JSON.parse(v.blob() || "{}");
  ok(b2.plan.length === 4 && b2.plan.every(t => Number(t.gw) === 1),
     `ADEINS GW1 stendur eftir (${b2.plan.length} radir)`);
  ok(Object.keys(b2.benchSwaps || {}).length === 0, "bekkjar-breytingar hreinsadar");
  ok(Object.keys(b2.chips || {}).length === 0, "chip hreinsad");
  ok(Number(b2.captain) === CAP,
     `FYRIRLIDINN ER OHREYFDUR (${b2.captain}) — hann er hluti af lidinu, ekki af plonuninni`);
  /* OG VARAFYRIRLIDINN — bandid er akvordun um LIDID, badir endarnir.
     Ad halda fyrirlidanum en thurrka varann er halft svar, og tha vaeri
     setningin „your starting squad is untouched" osonn.               */
  ok(Number(b2.vice) === VICE,
     `VARAFYRIRLIDINN ER LIKA OHREYFDUR (${b2.vice}) — sama rok, badir endar`);
  /* EKKI `!/Transfer plan/` — TOASTIN ber „Transfer planning reset", sem
     inniheldur thann undirstreng, svo fullyrdingin hefdi fallid a RETTUM
     koda (sama aett og `MUNaNEW` -> `NaN`, CLAUDE.md 5b). Spurt er um
     RADIRNAR: engin `ut → inn` rod ma vera eftir.                      */
  ok(leaves(v, "→").length === 0,
     `engin skipta-rod eftir (${leaves(v, "→").length})`);
  ok(/Starting squad/.test(v.text()), "medan upphaflids-kaflinn stendur");
  ok(!NANRE.test(v.text()), "ekkert NaN/undefined");
}

/* ============================================================
   O. FRAMVIRKA SYNIN — HANS EIGIN UPPSTILLING, ERFD FRAM (21.8.2026)
   ============================================================
   Notandinn: „Eg vill sja thad nuna. Til ad geta stillt upp lid 5-6 leiki
   fram i timann sem rullar vel saman."

   ThETTA ER EKKI AFTURKOLLUN A KAFLA K. Framvirka utgafan var fjarlaegd
   20.8. af ThVI ad setningin sagdi 'as you have them set up' um
   uppstillingu sem hann hafdi EKKI gert. Erfdin (kafli H) breytti
   forsendunni: GW2-7 BERA nu GW1-uppstillinguna hans. Fullyrdingarnar
   her eru thvi um ThRENNT sem ma ekki fara i sundur:
     1. SETNINGIN NEFNIR ERFDINA og gamla setningin er HVERGI.
     2. SETNINGIN BREYTIST vid skyra breytingu innan gluggans — annars
        vaeri hun fost setning um lifandi gogn ('4-10'-bilunin).
     3. HAFI HANN ENGA UPPSTILLINGU (hvorki bekkjar-vixl ne raunlid ur
        FPL) ER ThOGN. Thad er gamla falska forsendan og hun ma ekki
        koma aftur i nyju ordalagi.
   Og fjorda: PER-LEIKMANNS-SMAATRIDIN ERU A SPJALDINU (kafli P), thvi
   notandinn bad um thad ('aetti thetta kannski ad vera frekar a player
   spjaldinu?').
   ============================================================ */
console.log("\n--- O. FRAMVIRKT ---");
const FWD_HEAD = "Not in your plan's XI";
{
  const HAAL = byId[411].web_name, CAL = byId[346].web_name;

  /* 1. GW1-UPPSTILLING EIN — birtist, og SEGIR ERFDINA.
        Forleikur: afturvirka synin thegir samtimis, svo bædi svorin eru
        profud i EINNI festingu og geta ekki verid rugluð saman.        */
  const v = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } });
  ok(!/Not been in your XI/.test(v.text()),
     "FORSENDA: AFTURVIRKA synin thegir afram i forleik (0 umferdir byrjadar)");
  ok(new RegExp(FWD_HEAD + " — GW1–6").test(v.text()),
     "FRAMVIRKA synin BIRTIST — og hausinn ber gluggann");
  const fc = cardOf(v, FWD_HEAD, "Save £");
  ok(!!fc, "framvirki kassinn er ratanlegur i DOM-inum");
  const fseg = fc ? fc.textContent : "";
  ok(fseg.includes(HAAL), `og hann nefnir ${HAAL}, sem erfda uppstillingin hefur a bekknum`);

  /* ORdALAGID. GAMLA SETNINGIN ER NEFND BERUM ORDUM — neikvaed
     fullyrding um streng sem VAR sannanlega their (CLAUDE.md 5b 2), og
     hun er einmitt kaeran sem for i gegnum tvaer utgafur.              */
  ok(/carried forward/.test(fseg),
     "SETNINGIN NEFNIR ERFDINA (carried forward)", fseg.slice(0, 140));
  ok(/your own GW1 line-up, carried forward/.test(fseg),
     "og hun segir HVADAN: GW1 er hans skyra val, GW2-6 erfa thad", fseg.slice(0, 140));
  ok(!/as you have them set up/.test(v.text()),
     "OG GAMLA FALSKA FORSENDAN ER HVERGI I VIDMOTINU");

  /* GLUGGINN SEM ER SAGDUR = GLUGGINN SEM VAR SKODADUR. Nefnarinn a
     rodinni og bilid i hausnum eru TVAER birtingar sömu tolu og their
     verda ad stemma; annars er onnur theirra fost tala.               */
  const hm = fseg.match(/GW(\d+)–(\d+)/);
  /* NEFNARINN ER LESINN AF HOLFINU, EKKI UR `textContent` KASSANS —
     og thad er MAELT, ekki varfaerni: `textContent` limir texta saman an
     bila, svo verdid og talan runnu i „£15.50 of 6 in XI" og regexid las
     numerarann sem **50**. Nakvaemlega `MUNaNEW`-gildran (CLAUDE.md 5b),
     og hun felldi fyrstu utgafu THESSARAR fullyrdingar.               */
  const useEl = fc && [...fc.querySelectorAll("span")]
    .find(el => /^\d+ of \d+ in XI$/.test((el.textContent || "").trim()));
  const dm = useEl ? useEl.textContent.trim().match(/(\d+) of (\d+) in XI/) : null;
  ok(!!hm && !!dm, "forsenda: bædi bilid og nefnarinn eru a skjanum");
  if (hm && dm) {
    ok(+dm[2] === +hm[2] - +hm[1] + 1,
       `SAGDUR GLUGGI = SKODADUR GLUGGI (GW${hm[1]}-${hm[2]} -> nefnari ${dm[2]})`);
    ok(+dm[1] === 0, `og ${HAAL} er i XI-inu i ENGRI theirra (${dm[1]})`);
  }

  /* VERDGOLFIN ERU OBREYTT — odyrasti madur per stodu er ALDREI nefndur.
     Nofnin eru LEIDD ur lauginni, ekki handskrifud: handskrifadur listi
     staðnar um leid og FPL faerir verd (sbr. gwBlindKeys).             */
  const floors = {};
  for (const q of ALL) { const k = q.element_type, c = Number(q.now_cost);
    if (!k || !Number.isFinite(c) || c <= 0) continue;
    if (floors[k] == null || c < floors[k]) floors[k] = c; }
  const atFloor = START_IDS.map(i => byId[i]).filter(q => q.now_cost <= floors[q.element_type]);
  ok(atFloor.length >= 3, `forsenda: ${atFloor.length} menn i hopnum eru a verdgolfi sinnar stodu`);
  ok(atFloor.every(q => !fseg.includes(q.web_name)),
     "ODYRASTI MADUR PER STODU ER ALDREI NEFNDUR — salan losar ekkert fe");

  /* KOMPAKT, EKKI MALSGREIN. Notandinn: 'alltof mikill og flokinn texti'.
     Malsgreinarnar bornar berum ordum (their VORU their, svo hvorug
     fullyrding er tom) OG hard mork a lengd kassans: ein rod + haus +
     att-lina. Malsgreinarnar tvaer voru ~250 stafir samanlagt, svo
     thakid fellur um leid og onnur theirra kemur aftur.               */
  ok(!/Looking back at the/.test(v.text()), "MALSGREIN 1 er farin");
  ok(!/Selling one saves/.test(v.text()), "MALSGREIN 2 (verdgolfin) er farin");
  ok(!/Easier fixtures/.test(fseg),
     "og SKIPTA-TILLAGAN er ekki i merkinu — hun er a spjaldinu (kafli P)");
  ok(fseg.length <= 190,
     `MERKID ER KOMPAKT — haus + att + ein rod (${fseg.length} stafir)`, fseg.slice(0, 220));
  ok(!NANRE.test(v.text()), "ekkert NaN/undefined");

  /* 2. GLUGGINN FYLGIR VALINNI UMFERD. Fost byrjun (alltaf GW1) hefdi
        verid graen i fullyrdingunni her fyrir ofan.                    */
  const n5 = gwNode(v, 5);
  ok(!!n5, "forsenda: GW5-hnutur er a timalinunni");
  await v.click(n5);
  ok(new RegExp(FWD_HEAD + " — GW5–10").test(v.text()),
     "GW5 valin -> glugginn er GW5-10, ekki GW1-6");
  const f5 = (cardOf(v, FWD_HEAD, "Save £") || { textContent: "" }).textContent;
  ok(/carried forward from your GW1 line-up/.test(f5),
     "og ThA er ALLUR glugginn erfdur — ordalagid faerist med", f5.slice(0, 140));
  ok(!/your own GW1 line-up, carried forward/.test(f5),
     "og ekki lengur 'your own GW1 line-up' — GW1 er UTAN gluggans");

  /* 3. SKYR BREYTING INNAN GLUGGANS -> ANNAD ORdALAG.
        3: [[411,321],[346,278]] er FULLUR mismunur fra grunninum (sja
        kafla H), svo GW1-2 erfa lykil 1 og GW3-6 lykil 3.              */
  const vm = await mount({ captain: 411,
    benchSwaps: { 1: [[411, 321]], 3: [[411, 321], [346, 278]] } });
  const mseg = (cardOf(vm, FWD_HEAD, "Save £") || { textContent: "" }).textContent;
  ok(/plus your own change in GW3/.test(mseg),
     "SKYR BREYTING I GW3 -> setningin segir bædi erfd OG skyra breytingu", mseg.slice(0, 200));
  ok(!/plus your own change/.test(fseg),
     "og hun var EKKI their thegar engin skyr breyting var innan gluggans");

  /* 4. ENGIN UPPSTILLING -> ThOGN. ThETTA ER GAMLA FALSKA FORSENDAN og
        vordurinn a henni.

        FYRSTA UTGAFA ThESSARAR FULLYRDINGAR VAR TOM OG STOKKBREYTINGIN
        SLAPP (0 fallnar). Hun var `mount({ captain: 411 })` — blob AN
        bekkjar-vixla — og thognin sem hun mældi kom EKKI af thognar-
        reglunni heldur af thvi ad ALLIR FJORIR bekkjarmenn i
        `START_SQUAD` (Dubravka, Thomas, Hughes, Walle Egeli) eru a
        VERDGOLFI sinnar stodu og eru thvi ALDREI nefndir hvort eda er.
        Fullyrdingin gat thess vegna ekki fallid thott golfid vaeri tekid
        af. Sama aett og kafli 5b: „fullyrding sem tharf tvennt til ad
        bregdast er veikari en hun litur ut fyrir ad vera."

        RETTA FESTINGIN setur DYRAN mann i BEKKJAR-SAETI gegnum `plan`
        (Isak i saeti Walle Egeli) — `plan` er EKKI uppstilling, svo
        thognar-reglan gildir enn, en nu er ThAR MADUR SEM VAERI FLAGGADUR.
        Og hun er PORUD: sama `plan`, adeins bekkjar-vixl BAETT VID, og tha
        BIRTIST hann.                                                   */
  const SOLD_SEAT = { captain: 411, plan: [{ gw: 1, outId: 321, inId: 379 }] };
  const ISAK = byId[379].web_name;
  const vn = await mount(SOLD_SEAT);
  ok(!new RegExp(FWD_HEAD).test(vn.text()),
     "ENGIN uppstilling -> ThOGN, ekki setning um grunninn");
  ok(!/carried forward/.test(vn.text()),
     "og ekkert erfda-ordalag um uppstillingu sem er ekki til");
  ok(!vn.text().includes(FWD_HEAD) || !cardOf(vn, FWD_HEAD, "Save £"),
     "og enginn kassi er teiknadur");
  /* PORUNIN: SAMA `plan`, ADEINS uppstilling baett vid -> hann BIRTIST.
     An thessarar linu vaeri thognin her osannreynanleg.               */
  const vy = await mount({ ...SOLD_SEAT, benchSwaps: { 1: [[496, 497]] } });
  const yseg = (cardOf(vy, FWD_HEAD, "Save £") || { textContent: "" }).textContent;
  ok(yseg.includes(ISAK),
     `PORUN: sama plan + uppstilling -> ${ISAK} ER flaggadur (svo thognin ofan var EKKI tom)`,
     yseg.slice(0, 160));

  /* 5. MADUR SEM ER SELDUR INNAN GLUGGANS ER EKKI FLAGGADUR.
        Porud: Calvert-Lewin er a bekknum ALLAR SEX og ER flaggadur, svo
        thognin um Haaland getur ekki verid 'kassinn er tomur'.         */
  const vs = await mount({ captain: 411,
    benchSwaps: { 1: [[411, 321], [346, 278]] },
    plan: [{ gw: 3, outId: 411, inId: 107 }] });
  const sseg = (cardOf(vs, FWD_HEAD, "Save £") || { textContent: "" }).textContent;
  ok(sseg.includes(CAL), `FORSENDA: ${CAL} ER flaggadur (a bekknum allan gluggann)`);
  ok(!sseg.includes(HAAL),
     `og ${HAAL}, sem er SELDUR i GW3, er EKKI flaggadur — hann er ekki i hopnum i sidustu umferd gluggans`);
  ok(!NANRE.test(vs.text()), "ekkert NaN/undefined");
}

/* ============================================================
   P. SPJALDID — ThAR SEM PER-LEIKMANNS-TOLURNAR BUA (21.8.2026)
   ============================================================
   Notandinn: „thetta er alltof mikill og flokinn texti, thott
   upplysingar seu godar. AEtti thetta kannski ad vera frekar a player
   spjaldinu?"

   PORUN (CLAUDE.md 5b regla 2): fyrst er sannad ad SPJALDID se opid og
   beri tolu sem var ThEGAR their ('Next GW forecast'), og ADEINS ThA er
   spurt um nyju tolurnar. An thess vaeri hver neikvaed fullyrding her
   graen einfaldlega vegna thess ad spjaldid opnadist ekki.
   ============================================================ */
console.log("\n--- P. SPJALDID ---");
{
  const HAAL = byId[411].web_name;
  const v = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } });
  const fc = cardOf(v, FWD_HEAD, "Save £");
  ok(!!fc, "forsenda: framvirka merkid er a skjanum");
  /* SMELLT A NAFNID I MERKINU — thad er tengingin sem merkid heitir a:
     merki a vellinum, smaatridin a spjaldinu.                          */
  const nameEl = fc && [...fc.querySelectorAll("span")]
    .find(el => (el.textContent || "").trim() === HAAL);
  ok(!!nameEl, "og nafnid i merkinu er smellanlegt element");
  if (nameEl) await v.click(nameEl);

  const t = v.text();
  ok(/Next GW forecast/.test(t),
     "PORUN: spjaldid er OPID — reitur sem var ThEGAR their finnst");
  ok(t.includes(byId[411].second_name),
     `og thad er spjald ${HAAL} (fullt nafn i hausnum)`);

  /* FULLYRDINGARNAR ERU A REITNUM, EKKI A `v.text()` — OG ThAD ER MAELT.
     Vallar-merkid stendur AFRAM a bak vid gluggann og hausinn thess ber
     ordrett „GW1-6", svo `/GW1–6/.test(v.text())` var SONN thott
     glugginn vaeri tekinn af reitnum: stokkbreytingin (fella `sub` nidur
     i basis eina) SLAPP i gegn (0 fallnar). Sama aett og kafli 5b —
     fullyrdingin var um SIDUNA en atti ad vera um HOLFID.             */
  ok(/Your plan/.test(t), "kassinn Your plan er a spjaldinu");
  const grp = cardOf(v, "Your plan", "do not rank him against another player");
  ok(!!grp, "og hann segir BERUM ORDUM ad thetta se EKKI rodun milli manna");
  /* VALID A REITNUM NOTAR ADEINS HEITID (`In your plan's XI`), ekki
     nokkurt theirra gilda sem fullyrt er um a eftir — annars vaeri
     valid sjalft fullyrdingin og hun tautologia (CLAUDE.md 13).      */
  const kEl = v.q("div").find(d => (d.textContent || "").trim() === "In your plan's XI");
  const tile = kEl ? kEl.parentElement : null;
  ok(!!tile, "framvirki reiturinn er a spjaldinu");
  const tseg = tile ? tile.textContent : "";
  ok(/0 of 6/.test(tseg), "med nefnaranum sinum — 0 af 6", tseg.slice(0, 120));
  ok(/GW1–6/.test(tseg),
     "OG GLUGGANUM, A SAMA REIT: talan er onyt an hans", tseg.slice(0, 120));
  ok(/carried forward/.test(tseg),
     "og erfdin er nefnd a REITNUM lika — sami stadur sem talan", tseg.slice(0, 120));
  /* EIN SETNING VER GEGN RANGLESTRI — og hun er NEFND, svo hun getur
     fallid. Notandinn las Rice sem 'verstan' 20.8. ur einmitt thessari
     gerd af tolu (innan leikmanns, birt eins og rodun).               */
  ok(!/what you actually did/.test(t),
     "AFTURVIRKA talan er EKKI a spjaldinu i forleik — hun er ekki til");
  ok(!NANRE.test(t), "ekkert NaN/undefined");
}

console.log(`\n${"=".repeat(84)}`);
console.log(`${pass} pass, ${fail} fail`);
console.log("=".repeat(84));
process.exit(fail ? 1 : 0);
