#!/usr/bin/env node
/* ============================================================
   calib-lab.mjs — KVARDA SPANA ADUR EN VBD ER TEKID.

     node scripts/calib-lab.mjs [--scoring=ppr|standard]
                                [--proj=sleeper|fftoday] [--runs=5]

   -> data/calib_<scoring>_<proj>.json

   ============================================================
   GREININGIN SEM THETTA BYGGIR A
   ============================================================
   `Standard · FFToday` maeldist **-5,0% gegn ADP, 2 af 11 arum,
   marktaekt VERRA**. Spurningin var hvers vegna — og svarid er ekki
   "spain er lakari" heldur eitthvad nakvaemara.

   VBD ER CROSS-POSITION TAEKI. Innan stodu breytir thad ENGRI rod:
   thad dregur sama varamannsgildi fra ollum. Thad sem thad gerir er ad
   bera saman BIL milli stada — "hversu miklu meira er thessi RB virdi
   umfram RB24 en thessi WR umfram WR36". Rod innan stodu kemur fra
   spanni; rod MILLI stada kemur fra KVARDA spannarinnar.

   Og kvardinn er skakkur, ojafnt eftir stodum. Maelt (spad bil milli
   efsta manns og thess 24. deilt med raunverulegu bili):

     STANDARD    QB     RB     WR     TE
       sleeper  0,54x  0,48x  0,45x  0,82x
       fftoday  0,61x  0,69x  0,46x  0,59x

   Allar spar THJAPPA (oll gildi undir 1) — thad er vaentanlegt, spa
   sem regresserar ad medaltali hefur minni dreifingu en utkoman. En
   THJOPPUNIN ER OJOFN, og heimildirnar tvaer eru med OFUGAR SKEKKJUR:
   Sleeper vanmetur RB-bilid um 1,7x midad vid TE, FFToday ofmetur thad.
   Thad er nakvaemlega thad sem VBD etur.

   ============================================================
   LAGFAERINGIN
   ============================================================
   Faera spa hverrar stodu ut fra MEDALTALI STODUNNAR um mældan
   studul, svo bilin verdi thau somu og saga theirrar stodu segir:

       proj' = medaltal + (proj - medaltal) * k[stada]

   Thetta breytir ENGRI rod innan stodu (einraen umbreyting) — adeins
   thvi hversu langt stodurnar eru fra hvor annarri thegar VBD ber
   thaer saman.

   `k` ER MAELT WALK-FORWARD: fyrir ar Y er thad reiknad ur arum < Y
   eingongu. Ad reikna thad ur ollum arum og birta utkomuna vaeri leki,
   og hann litur alltaf vel ut.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  scoring: ["ppr", "standard"],
  proj: ["sleeper", "fftoday"],
  runs: "number",
});
const SCORING = String(ARG.scoring || "ppr");
const PROJ = String(ARG.proj || "sleeper");
const FIELD = PROJ === "fftoday" ? "ffProj" : "sleeperProj";
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const RUNS = Number(ARG.runs || 5);
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

/** Bil milli efsta manns og thess n-ta — maelikvardinn sem VBD les. */
function span(vals, n) {
  const s = vals.slice().sort((a, b) => b - a);
  return s[0] - s[Math.min(s.length - 1, n - 1)];
}

function vbdRank(pool) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (REPL[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) scored.push([p.id, p.proj - base]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r[FIELD] != null).map((r) => r.season))].sort();
  console.log(`${PROJ} · ${SCORING} · timabil: ${years.join(", ")}`);

  const world = {};
  for (const y of years) {
    const yr = rows.filter((r) => r.season === y && r.adp != null && r[FIELD] != null);
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, proj: r[FIELD],
                                  adp: r.adp, adpSd: r.adpSd, actual: pts(r) }));
    world[y] = {
      pool,
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  requireSeasons(ys, "timabil med spa og ADP");

  /* ---------- MAELD ThJOPPUN PER STODU, PER AR ---------- */
  const ratioByYear = {};
  console.log("\n  thjoppun (spad bil / raunbil), per ar:");
  console.log("  ar     QB     RB     WR     TE");
  for (const y of ys) {
    const W = world[y], r = {};
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      const g = W.pool.filter((p) => p.pos === pos);
      if (g.length < 25) { r[pos] = null; continue; }
      const n = REPL[pos];
      const sp = span(g.map((p) => p.proj), n);
      const sa = span(g.map((p) => p.actual), n);
      r[pos] = sp > 0 ? sa / sp : null;      // hve mikid tharf ad THENJA
    }
    ratioByYear[y] = r;
    console.log(`  ${y}  ${["QB", "RB", "WR", "TE"]
      .map((p) => (r[p] == null ? "  —  " : r[p].toFixed(2).padStart(5))).join("  ")}`);
  }

  /* ---------- WALK-FORWARD KVORDUN ----------
     Fyrir ar Y er studullinn medaltal aranna A UNDAN. Fyrsta arid
     hefur ekkert a undan ser og faer 1 (engin kvordun) — thad er rett,
     ekki lagfaering: vid hofdum enga maelingu tha.                */
  const kFor = (y) => {
    const prior = ys.filter((p) => p < y);
    const k = {};
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      const vals = prior.map((p) => ratioByYear[p][pos]).filter((v) => v != null);
      k[pos] = vals.length ? mean(vals) : 1;
    }
    return k;
  };

  const calibrated = (pool, k, strength) => {
    const byPos = {};
    for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
    const out = [];
    for (const [pos, list] of Object.entries(byPos)) {
      const m = mean(list.map((p) => p.proj));
      /* `strength` 0 = obreytt, 1 = full kvordun. Millistig svo haegt
         se ad sja hvort ahrifin seu einraen — stokk fra 0 i 1 an
         millistiga vaeri ekki maeling heldur agiskun. */
      const kk = 1 + ((k[pos] ?? 1) - 1) * strength;
      for (const p of list) out.push({ ...p, proj: m + (p.proj - m) * kk });
    }
    return out;
  };

  const noisy = (pool, seed) => {
    let a = seed >>> 0;
    const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const gauss = () => {
      const u = Math.max(1e-9, rnd()), v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return new Map(pool.map((p) => {
      const sd = p.adpSd > 0 ? p.adpSd : 1.08 * Math.sqrt(Math.max(1, p.adp));
      return [p.id, p.adp + gauss() * sd];
    }).sort((x, y) => x[1] - y[1]).map(([id], i) => [id, i + 1]));
  };

  /* Einvigi vid OKVORDUD bordid OG vid ADP — badar spurningar skipta
     mali og thaer eru ekki su sama. */
  const duel = (strength) => {
    const vsBase = {}, vsAdp = {};
    for (const y of ys) {
      const W = world[y];
      const k = kFor(y);
      const mine = vbdRank(calibrated(W.pool, k, strength));
      const base = vbdRank(W.pool);
      const db = [], da = [];
      for (let r = 0; r < RUNS; r++) {
        const field = r === 0 ? W.field : noisy(W.pool, y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const a1 = simulateDraft({ board: mine, fieldBoard: field, actual: W.actual,
              slot: swap ? j : i, league: LEAGUE, rival: { slot: swap ? i : j, board: base } });
            db.push(a1.points - a1.rivalPoints);
            const a2 = simulateDraft({ board: mine, fieldBoard: field, actual: W.actual,
              slot: swap ? j : i, league: LEAGUE, rival: { slot: swap ? i : j, board: W.field } });
            da.push(a2.points - a2.rivalPoints);
          }
        }
      }
      vsBase[y] = mean(db); vsAdp[y] = mean(da);
    }
    const stat = (per) => {
      const vals = ys.map((y) => per[y]);
      const m = mean(vals);
      const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2)) * vals.length /
                           Math.max(1, vals.length - 1));
      const se = sd / Math.sqrt(vals.length);
      return { mean: r1(m), t: r3(se ? m / se : 0),
               wins: vals.filter((v) => v > 0).length, years: vals.length,
               perYear: Object.fromEntries(ys.map((y) => [y, r1(per[y])])) };
    };
    return { vsBase: stat(vsBase), vsAdp: stat(vsAdp) };
  };

  /* HEILBRIGDISPROF: styrkur 0 er OBREYTT bord og verdur ad gefa 0. */
  const self = duel(0);
  console.log(`\n  heilbrigdisprof (styrkur 0): ${self.vsBase.mean} stig gegn okvordudu ` +
    `${Math.abs(self.vsBase.mean) < 0.05 ? "— hlutlaust" : "— VIDVORUN"}`);

  const results = [];
  console.log("\n  styrkur   gegn OKVORDUDU bordi        gegn ADP");
  for (const s of [0.25, 0.5, 0.75, 1]) {
    const res = duel(s);
    results.push({ strength: s, ...res });
    const f = (o) => `${(o.mean > 0 ? "+" : "") + String(o.mean).padStart(7)} (${o.wins}/${o.years}, t=${String(o.t).padStart(6)})`;
    console.log(`  ${String(s).padEnd(9)} ${f(res.vsBase)}   ${f(res.vsAdp)}`);
  }

  const tCrit = ys.length > 6 ? 2.228 : 2.776;
  const corrected = tCrit * 1.3;              // fjogur afbrigdi
  const best = results.slice().sort((a, b) => b.vsBase.mean - a.vsBase.mean)[0];
  const verdict = Math.abs(best.vsBase.t) > corrected && best.vsBase.mean > 0
    ? "STENST" : Math.abs(best.vsBase.t) > tCrit && best.vsBase.mean > 0
    ? "stenst hra en ekki leidrett" : "FELLUR";
  console.log(`\n  best: styrkur ${best.strength} -> ${best.vsBase.mean > 0 ? "+" : ""}${best.vsBase.mean} stig ` +
    `gegn okvordudu, ${best.vsBase.wins}/${best.vsBase.years} ar, t=${best.vsBase.t}`);
  console.log(`  mork |t| > ${tCrit} · leidrett (4 profa) |t| > ${r3(corrected)}  ->  ${verdict}`);

  await writeFile(path.join(OUT, `calib_${SCORING}_${PROJ}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "sleeper", runs: 5 },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, projection: PROJ, seasons: ys,
    compression: Object.fromEntries(ys.map((y) => [y,
      Object.fromEntries(Object.entries(ratioByYear[y]).map(([k, v]) => [k, v == null ? null : r2(v)]))])),
    walkForwardK: Object.fromEntries(ys.map((y) =>
      [y, Object.fromEntries(Object.entries(kFor(y)).map(([k, v]) => [k, r2(v)]))])),
    selfTest: self, variants: results, best, tCrit, corrected: r3(corrected), verdict,
  }, null, 1));
  console.log(`\n-> data/calib_${SCORING}_${PROJ}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
