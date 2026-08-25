/* ============================================================
   goal-assist-dom.mjs — PORUNIN LESIN AF SKJANUM

   HVERS VEGNA SER SKRA, OG HUN ER EKKI SKRAUT:
   `goal-assist.mjs` profar HREINA FALLID og fullyrdir svo um TENGINGUNA
   med TEXTALEIT i `App.jsx` (`goalAssists={goalAssists}`). Sú fullyrding
   er AST-prof og CLAUDE.md segir berum ordum hvad hun getur EKKI:
   *"AST-prof les KODA, ekki skjainn. Thad getur sagt 'kallid er i
   skranni'; thad getur EKKI sagt 'kallid keyrir i réttri grein'."*

   OG HER VAR ThAD MAELT, EKKI OTTAST: thegar thetta var skrifad opnadi
   **ekkert prof i safninu** leikja-spjaldid — `grep` a
   "Click for goalscorers" i `tests/` gaf **0**. Porunin hefdi thvi getad
   verid rett reiknud, rett tengd, og BIRST ALDREI — og hvert einasta
   safn afram graent. Nakvaemlega sama aett og `<Teams>` sem fekk aldrei
   `bsdLive` (CLAUDE.md kafli 3) og daudi markadslidurinn (kafli 3).

   ThESSI SKRA SMELLIR ThVI A LEIKINN OG LES LINUNA.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

let pass = 0, fail = 0;
const ok = (c, n, x = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                 : (fail++, console.log(`  ✗ ${n} ${x}`)); };
const D = new URL("../data/", import.meta.url).pathname;
const J = (f) => JSON.parse(readFileSync(D + f, "utf8"));

/* ============================================================
   LIFANDI STADAN KEMUR UR PROXY, EKKI UR `data/` — OG ThAD ER
   ASTAEDAN FYRIR ThVI AD ENGINN HAFDI OPNAD ThETTA SPJALD.
   `liveByFx` er byggt ur `live?.fixtures`, sem kemur ur
   `PROXY_URL?path=live`. Prof sem herma adeins `/data/` fa `null`
   thar, `hasDetail` verdur false og hnappurinn er ALDREI teiknadur.
   Farmurinn hér er thvi SMIDADUR UR RAUNVERULEGU `fixtures.json` svo
   leikja-id-in stemmi vid porunina sem er verid ad profa.
   ============================================================ */
const FXF = J("fixtures.json");
const ALL_FX = Array.isArray(FXF) ? FXF : FXF.fixtures;
const LIVE_GW = 1;
const LIVE = {
  gw: LIVE_GW, any_live: false,
  fixtures: ALL_FX.filter((f) => f.event === LIVE_GW).map((f) => ({
    id: f.id, started: true, finished: true,
    h: { score: f.team_h_score ?? 0, goals: [], assists: [] },
    a: { score: f.team_a_score ?? 0, goals: [], assists: [] },
  })),
};
/* Markaskorarar: FPL-id skipta ekki mali fyrir PORUNINA (hun kemur ur
   ESPN), en `hasDetail` krefst thess ad EINHVER skorari se skradur —
   annars opnast spjaldid ekki. Vid setjum thvi einn raunverulegan
   leikmann per lid sem skoradi. */
{
  const players = J("players.json");
  const rows = Array.isArray(players) ? players : (players.players || players.elements || []);
  const byTeam = new Map();
  for (const p of rows) if (!byTeam.has(p.team)) byTeam.set(p.team, p.id);
  for (const lf of LIVE.fixtures) {
    const f = ALL_FX.find((x) => x.id === lf.id);
    if ((f?.team_h_score ?? 0) > 0) lf.h.goals = [byTeam.get(f.team_h)].filter((x) => x != null);
    if ((f?.team_a_score ?? 0) > 0) lf.a.goals = [byTeam.get(f.team_a)].filter((x) => x != null);
  }
}

async function boot(patch = null) {
  const dom = new JSDOM("<!doctype html><div id=root></div>",
    { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const orig = console.error;
  console.error = (...a) => { const m = String(a[0] ?? ""); if (!/not wrapped in act|Warning:/.test(m)) orig(...a); };
  globalThis.fetch = async (u) => {
    const url = String(u);
    /* SERTAEKI MOCK-INN VERDUR AD KOMA A UNDAN ThEIM ALMENNA — annars
       gleypir `/data/`-greinin proxy-slodina (CLAUDE.md kafli 5,
       "gildrur i jsdom-profunum"). */
    if (url.includes("path=live")) {
      return { ok: true, status: 200, json: async () => LIVE };
    }
    if (url.includes("path=")) return { ok: true, status: 200, json: async () => ({}) };
    const n = url.split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => ({}) };
    if (patch && n in patch) {
      if (patch[n] == null) return { ok: false, status: 404, json: async () => { throw new Error("no"); } };
      return { ok: true, status: 200, json: async () => patch[n] };
    }
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("no"); } }; }
  };
  const { default: App } = await import("../src/App.jsx");
  createRoot(document.getElementById("root")).render(React.createElement(App));
  await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
  console.error = orig;
  return dom;
}

/* Smellir a FYRSTA leikinn sem bydur upp a markaskorara-spjald og
   skilar textanum sem bættist vid. */
async function openFirstMatch(dom) {
  const btns = [...dom.window.document.querySelectorAll("button")]
    .filter((b) => /Click for goalscorers/.test(b.getAttribute("title") || ""));
  if (!btns.length) return { n: 0, text: "" };
  const before = dom.window.document.body.textContent || "";
  await act(async () => {
    btns[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 120));
  });
  const after = dom.window.document.body.textContent || "";
  return { n: btns.length, before, text: after };
}

console.log(`\n${"=".repeat(84)}`);
console.log("PORUNIN mark<->assist — LESIN AF SKJANUM");
console.log("=".repeat(84));

/* Hvada porun A ad sjast? Reiknud UR GOGNUNUM, ekki skrifud sem fasti —
   fastur strengur ("Havertz") yrdi ranguf um leid og gogn dagsins
   breytast og prófid yrdi slokkt innan viku. */
const shots = J("last_gw_shots.json");
const expected = (shots.shots || []).filter((s) => s.kind === "goal" && s.assist_by);

console.log("\n1. spjaldid opnast yfirhofud");
const dom = await boot();
const { n, text } = await openFirstMatch(dom);
ok(n > 0, `leikir med markaskorara-spjald finnast (${n})`,
  "— an thessa maelir ekkert her neitt (thekja er fullyrding)");
ok(expected.length > 0, `ESPN-skrain ber pörud mork (${expected.length})`);

console.log("\n2. PORUD LINA SEST — skorari OG gefandi i somu linu");
{
  /* Ein raunveruleg porun ur gognum dagsins verdur ad sjast med
     ORINNI a milli. Ad leita bara ad nofnunum vaeri veikara: bædi nofn
     eru hvort ed er a skjanum annars stadar (markalistinn og
     fantasy-assist linan), svo prófid myndi standast an nokkurrar
     porunar. ORIN er thad sem greinir "porad" fra "talid upp". */
  const hits = expected.filter((e) =>
    text.includes(`${e.player} ← ${e.assist_by}`));
  ok(hits.length > 0,
    `a.m.k. ein porun birtist sem "skorari ← gefandi" (${hits.length} af ${expected.length} i skranni)`,
    `— daemi sem var leitad ad: "${expected[0].player} ← ${expected[0].assist_by}"`);
}

console.log("\n3. FANTASY-ASSISTIN HVERFA EKKI — TVAER SKILGREININGAR, BADAR SYNDAR");
{
  /* Notandinn bad um BAEDI ("synum lika fantasy assist"). ESPN-assistid
     er Opta-skilgreiningin og er ThRENGRA; ad skipta thvi seinna ut
     fyrir hitt vaeri ad tapa thvi sem hann bad um. */
  const src = readFileSync(new URL("../src/App.jsx", import.meta.url).pathname, "utf8");
  ok(/FANTASY assists/.test(src),
    "fantasy-assist linan ber sitt eigid heiti i tooltip-inu");
  ok(/OFFICIAL \(Opta\) assist/.test(src),
    "og porada linan segir ad hun se OPINBERA skilgreiningin");
  ok(/did not state one, not that nobody assisted/.test(src),
    "og ad mark an assists thydi 'ekki sagt', ekki 'enginn gaf assist'");
}

console.log("\n4. AN SKOT-SKRARINNAR: ENGIN PORUN, EN SPJALDID LIFIR");
{
  /* Hlidid ma ekki fella spjaldid — markalistinn sjalfur kemur ur FPL
     og a ad standa thott ESPN vanti. */
  const dom2 = await boot({ "last_gw_shots.json": null });
  const r2 = await openFirstMatch(dom2);
  ok(r2.n > 0, "spjaldid opnast enn thott `last_gw_shots.json` svari 404");
  const paired = expected.filter((e) => r2.text.includes(`${e.player} ← ${e.assist_by}`));
  ok(paired.length === 0, "og ENGIN porun birtist (uppspuni vaeri verri en thogn)");
}

console.log("\n5. RANGT TIMABIL: ARKIV-SKRA MA ALDREI PARA (Watkins-gildran)");
{
  const stale = { ...shots, season: "2025/26" };
  const dom3 = await boot({ "last_gw_shots.json": stale });
  const r3 = await openFirstMatch(dom3);
  ok(r3.n > 0, "spjaldid opnast");
  const paired = expected.filter((e) => r3.text.includes(`${e.player} ← ${e.assist_by}`));
  ok(paired.length === 0,
    "og engin porun birtist ur skra sem er merkt FYRRA timabili",
    "— porun ur fyrra timabili nefnir TVO menn og les eins og stadreynd");
}

console.log(`\nPORUN A SKJANUM: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
