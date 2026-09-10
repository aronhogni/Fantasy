/* ============================================================
   HJALPARFOLL SEM VORU FLUTT UR App.jsx (10.9.2026) — OG VORU ThA OPROFUD

   `csFor` (CS%-kedjan), `lastBenchKey` (thrju afrit i App.jsx) og
   `firstOpenGw` (klukka FFDR-toflunnar) bjuggu i JSX og engin prof
   keyrdu thau sem einingar — adeins `cleanSheetProb` var profad.
   Her er svarid thekkt fyrirfram a tilbunum inntokum.
   ============================================================ */
import { makeCsFor, lastBenchKey } from "../src/model.js";
import { firstOpenGw } from "../src/availability.js";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const eq = (a, b, n) => ok(JSON.stringify(a) === JSON.stringify(b), `${n} (${JSON.stringify(a)}${JSON.stringify(a) === JSON.stringify(b) ? "" : " ≠ " + JSON.stringify(b)})`);

console.log("\n1) makeCsFor — kedjan bokmakari -> elo -> logistic -> tafla");
{
  const teamById = { 1: { short: "ARS" }, 2: { short: "LIV" }, 3: { short: "MCI" } };
  const odds = { ARS: { cs: 41, opp: "LIV", kickoff: "2026-09-13T15:00:00Z" } };
  const eloCsByFx = { "1|2026-09-20": { cs: 33.4 } };
  const teamMetrics = { 1: { xgc90: 0.9, xg90: 1.8 }, 2: { xgc90: 1.2, xg90: 1.6 }, 3: { xgc90: 1.0, xg90: 2.0 } };
  const eloByTeam = { 1: { elo: 2000 }, 2: { elo: 1950 }, 3: { elo: 2050 } };
  const csFor = makeCsFor({ teamById, odds, eloCsByFx, teamMetrics, eloByTeam, fixDifficulty: () => 2.5 });

  eq(csFor(1, { opp: 2, home: true, kickoff: "2026-09-13T15:00:00Z", fdr: 4 }), { cs: 41, src: "bookie" },
     "rett motherji OG dagsetning -> bokmakaralinan");
  ok(csFor(1, { opp: 3, home: true, kickoff: "2026-09-13T15:00:00Z", fdr: 4 }).src !== "bookie",
     "rangur motherji -> EKKI bokmakaralinan (hun gildir um einn leik)");
  ok(csFor(1, { opp: 2, home: true, kickoff: "2026-09-27T15:00:00Z", fdr: 4 }).src !== "bookie",
     "rett motherji, onnur dagsetning -> EKKI bokmakaralinan");
  eq(csFor(1, { opp: 3, home: false, kickoff: "2026-09-20T15:00:00Z", fdr: 4 }), { cs: 33, src: "elo" },
     "ClubElo a lid|dag -> namundad");
  const p = csFor(1, { opp: 3, home: true, kickoff: "2026-10-04T15:00:00Z", fdr: 4 });
  ok(p.src === "probability" && p.cs >= 3 && p.cs <= 70, `badar lidstolur til -> logistic, thakad [3,70] (${p.cs})`);
  const m = csFor(2, { opp: 9, home: true, kickoff: "2026-10-04T15:00:00Z", fdr: 3 });
  ok(m.src === "measured" && Number.isFinite(m.cs), `motherja vantar i lidstolur -> maelda taflan (${m.cs})`);
  eq(csFor(1, null), { cs: null, src: null }, "enginn leikur -> null, ekki tala");
  const bare = makeCsFor({ fixDifficulty: () => null });
  eq(bare(1, { opp: 2, home: true, fdr: undefined }), { cs: null, src: null }, "ekkert inntak og ekkert FDR -> null");
}

console.log("\n2) lastBenchKey — sidasta umferd <= g med eigin bekk");
{
  const bs = { 2: [[1, 2]], 5: [[3, 4]], 7: "x", 8: [] };
  eq(lastBenchKey(bs, 1), 0, "engin fyrir GW1 -> 0");
  eq(lastBenchKey(bs, 2), 2, "eigin listi i GW2");
  eq(lastBenchKey(bs, 4), 2, "GW4 erfir GW2");
  eq(lastBenchKey(bs, 6), 5, "GW6 erfir GW5");
  eq(lastBenchKey(bs, 9), 5, "strengur (GW7) og tomt fylki (GW8) teljast EKKI — localStorage-gildi eru ekki treyst");
  eq(lastBenchKey(null, 9), 0, "null-inntak -> 0");
}

console.log("\n3) firstOpenGw — fyrsta umferd sem a oleikinn leik");
{
  const f = (event, done) => ({ event, finished: false, finished_provisional: done });
  eq(firstOpenGw([f(1, true), f(1, true), f(2, true), f(2, false), f(3, false)], 38), 2, "GW1 buin, GW2 halfnud -> 2");
  eq(firstOpenGw([f(1, true), f(2, true)], 38), 3, "umferd sem a ENGA leiki i skranni er opin");
  eq(firstOpenGw([], 38), 1, "tom leikjaskra -> 1 (engin gogn -> her)");
  eq(firstOpenGw([f(1, true), f(2, true)], 2), 2, "fullspilad -> maxGw");
  eq(firstOpenGw([{ event: 1, finished: true, finished_provisional: false }, f(2, false)], 38), 2, "`finished` telur lika sem spilad");
}

console.log(`\nAPP-HJALPARFOLL: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
