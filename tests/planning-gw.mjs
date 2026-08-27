/* ============================================================
   HVADA UMFERD OPNAST — OG HVERS VEGNA ThETTA PROF ER TIL (27.8.2026)

   `App.jsx` opnadi a `is_current`, og FPL heldur theirri umferd thangad
   til NAESTI frestur lidur. Fra sidasta flauti umferdarinnar og fram ad
   naesta fresti — thrir til fjorir dagar af hverri viku, nakvaemlega
   their dagar sem skipti eru gerd — opnadist skipuleggjarinn thvi a
   umferd sem VAR BUIN, og vaent stig a ollum 616 spjoldunum voru reiknud
   ur leik sem var thegar spiladur.

   PROFAD A TILBUNUM GOGNUM ThAR SEM SVARID ER ThEKKT FYRIRFRAM — sama
   mynstur og `defcon-shrink.mjs` og `bsd-pipeline.mjs`: astandid sem
   villan bjo i (allir leikir `finished_provisional`, `finished: false`)
   hverfur ur `data/` vid naestu stadfestingu, svo raungogn ein geta ekki
   varid thetta.

   Keyrsla:  node tests/planning-gw.mjs
   ============================================================ */
import { planningGw } from "../src/availability.js";

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗"} ${m}`); };

const EV = (over = {}) => ([
  { id: 1, is_current: true, is_next: false, finished: false, ...over.e1 },
  { id: 2, is_current: false, is_next: true, finished: false, ...over.e2 },
  { id: 3, is_current: false, is_next: false, finished: false },
]);
const FX = (event, states) => states.map((st, i) => ({ id: event * 100 + i, event, ...st }));
const PLAYED = { finished: false, finished_provisional: true };
const CONFIRMED = { finished: true, finished_provisional: true };
const TOPLAY = { finished: false, finished_provisional: false };
const LIVE = { finished: false, finished_provisional: false, started: true };

console.log("=== 1. ASTANDID SEM VILLAN BJO I ===");
{
  /* Allir tiu GW1-leikirnir buner en `finished` enn false — nakvaemlega
     `data/fixtures.json` 27.8.2026 — og GW2-fresturinn framundan.     */
  const gw = planningGw(EV(), FX(1, Array(10).fill(PLAYED)));
  ok(gw === 2, `umferd fullspilud (finished_provisional) -> naesta umferd (${gw})`);
  ok(planningGw(EV(), FX(1, Array(10).fill(CONFIRMED))) === 2,
    "og eins thegar hun er stadfest med bonus");
}

console.log("\n=== 2. UMFERD I GANGI ER ENN UMFERDIN MANNS ===");
{
  ok(planningGw(EV(), FX(1, [PLAYED, PLAYED, TOPLAY])) === 1,
    "einn leikur oleikinn -> stondum i umferdinni");
  ok(planningGw(EV(), FX(1, [PLAYED, LIVE])) === 1,
    "leikur I GANGI -> stondum i umferdinni (lifandi stig)");
  ok(planningGw(EV(), FX(1, Array(10).fill(TOPLAY))) === 1,
    "engin leikur byrjadur -> stondum i umferdinni");
}

console.log("\n=== 3. TOM EDA VANTANDI GOGN AKVEDA EKKERT ===");
{
  ok(planningGw(EV(), []) === 1,
    "engir leikir i skranni -> KYRR (tom fullyrding ma ekki fleyta manni afram)");
  ok(planningGw(EV(), null) === 1, "fixtures null -> kyrr");
  ok(planningGw(EV(), FX(2, Array(10).fill(PLAYED))) === 1,
    "leikir ANNARRAR umferdar telja ekki");
  ok(planningGw([], FX(1, [PLAYED])) === null, "engin events -> null (kallandinn heldur sinu)");
  ok(planningGw(null, null) === null, "events null -> null");
}

console.log("\n=== 4. JADRARNIR ===");
{
  const preseason = [{ id: 1, is_current: false, is_next: true }];
  ok(planningGw(preseason, []) === 1, "forleikur: engin current -> is_next");
  const last = [{ id: 38, is_current: true, is_next: false }];
  ok(planningGw(last, FX(38, Array(10).fill(CONFIRMED))) === 38,
    "GW38 fullspilud og ekkert is_next -> stondum i 38, ekki null");
  const noNextFlag = [{ id: 5, is_current: true }, { id: 6 }, { id: 7 }];
  ok(planningGw(noNextFlag, FX(5, [CONFIRMED])) === 6,
    "vanti `is_next` er naesta umferd fundin eftir id (6)");
}

console.log("\n=== 5. STOKKBREYTINGAR SEM VERDA AD FELLA ===");
{
  /* Hver "lagfaering" sem afturkallar regluna verdur ad brjota kafla 1,
     og hver sem gengur of langt verdur ad brjota kafla 2/3. Profad med
     staðgenglum sem herma hverja stokkbreytingu.                      */
  const mut = {
    "skilar alltaf is_current": (evs) => evs.find(e => e.is_current)?.id ?? null,
    "les `finished` a umferdinni": (evs) => (evs.find(e => e.is_current)?.finished
      ? (evs.find(e => e.is_next)?.id ?? null) : evs.find(e => e.is_current)?.id ?? null),
    "sleppir tomu-skrar vordunni": (evs, fxs) => {
      const cur = evs.find(e => e.is_current);
      const f = (fxs || []).filter(x => x.event === cur.id);
      return f.every(x => x.finished || x.finished_provisional)
        ? (evs.find(e => e.is_next)?.id ?? cur.id) : cur.id;
    },
  };
  const cases = [
    ["umferd fullspilud", EV(), FX(1, Array(10).fill(PLAYED)), 2],
    ["leikur i gangi", EV(), FX(1, [PLAYED, LIVE]), 1],
    ["tom leikjaskra", EV(), [], 1],
  ];
  for (const [name, fn] of Object.entries(mut)) {
    const broke = cases.filter(([, evs, fxs, want]) => fn(evs, fxs) !== want);
    ok(broke.length > 0,
      `"${name}" fellur a ${broke.length} tilviki (${broke.map(c => c[0]).join(", ") || "ENGU"})`);
  }
  /* Og retta utfaerslan stenst OLL thrju — annars vaeri profid ad verja
     hegdun sem kodinn hefur ekki.                                     */
  const rightPasses = cases.every(([, evs, fxs, want]) => planningGw(evs, fxs) === want);
  ok(rightPasses, "og planningGw sjalf stenst oll thrju tilvikin");
}

console.log(`\nPLANNING-GW: ${pass} stóðust, ${fail} féllu`);
if (fail) process.exit(1);
