#!/usr/bin/env node
/* ============================================================
   dynamic-lab.mjs — KVIKT VBD: BREYTIR THAD NOKKRU?

     node scripts/dynamic-lab.mjs [--scoring=ppr|standard]
                                  [--proj=sleeper|fftoday] [--runs=10]

   -> data/dynamic_<scoring>_<proj>.json

   HUGMYNDIN, OG HUN ER RAUNVERULEGA ONNUR EN ALLT SEM VAR PROFAD ADUR.

   A-Ranking reiknar varamanns-threpid EINU SINNI, fyrir draftid:
   "24. besti RB" er varamadurinn og allir eru maeldir vid hann. En i
   herberginu er thad ekki satt. Se buid ad taka 20 RB i fyrstu fjorum
   umferdunum er varamadurinn thinn ekki lengur sa 24. — hann er sa
   sem er raunverulega naestur i rodinni THEGAR THU VELUR NAEST.

   Kvikt VBD reiknar threpid upp a nytt vid HVERT val ur theim sem eru
   eftir. Thad er thekkt hugmynd i faginu (VORP med lifandi
   varamannsthrepi) og hun er OPROFUD hér.

   TVAER UTGAFUR eru maeldar, thvi thaer svara ekki somu spurningu:

     `remaining`  threpid er n-ti besti SEM ER EFTIR, thar sem n er
                  sama tala og i dag. Einfalt og lifandi.

     `nextpick`   threpid er sa sem vaentanlega verdur bestur a theirri
                  stodu THEGAR ROÐIN KEMUR AFTUR AD MER. Thetta er
                  spurningin sem draftari spyr i raun, og hun tekur
                  tillit til thess hve long bidin er.

   NULLTILGATAN er kyrrstaeda bordid sem er i loftinu, og hun draftar
   i SOMU DEILD gegn hverju afbrigdi — svo arsahrifin dragist ut.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const SCORING = String(ARG.scoring || "ppr");
const PROJ = String(ARG.proj || "sleeper");
const FIELD = PROJ === "fftoday" ? "ffProj" : "sleeperProj";
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const RUNS = Number(ARG.runs || 10);
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };

const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

/** Kyrrstaeda bordid — nakvaemlega thad sem appid notar i dag. */
function staticBoard(pool) {
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

/**
 * KVIKT BORD. Skilar FALLI sem `simulateDraft` kallar vid hvert val.
 *
 * `mode`
 *   remaining  varamadur = n-ti besti SEM ER EFTIR
 *   nextpick   varamadur = sa sem vaentanlega er bestur a stodunni
 *              thegar rodin kemur aftur — thad er `wait` valum sidar,
 *              og vid gerum rad fyrir ad hlutfall theirra falli a
 *              hverja stodu i takt vid hve margir eru eftir af henni.
 */
function dynamicBoard(pool, mode) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  for (const list of Object.values(byPos)) list.sort((a, b) => b.proj - a.proj);
  const total = pool.length;

  return (taken, _counts, round) => {
    const scored = [];
    /* Hve morg val lida thangad til rodin kemur aftur? I snak-drafti
       er thad 2*(teams-1) i mesta lagi; medaltalid dugar hér. */
    const wait = 2 * (TEAMS - 1);
    let leftTotal = 0;
    const left = {};
    for (const [pos, list] of Object.entries(byPos)) {
      left[pos] = list.filter((p) => !taken.has(p.id));
      leftTotal += left[pos].length;
    }
    for (const [pos, list] of Object.entries(left)) {
      if (!list.length) continue;
      let k;
      if (mode === "remaining") {
        k = Math.min(list.length - 1, (REPL[pos] ?? 24) - 1);
      } else {
        /* Hlutfall komandi vala sem lendir a thessari stodu er metid
           ur thvi hve stort hlutfall laugarinnar hun er NUNA. Thad er
           groft en thad er MAELANLEGT og engin ny stika. */
        const share = leftTotal ? list.length / leftTotal : 0;
        k = Math.min(list.length - 1, Math.max(0, Math.round(wait * share)));
      }
      const around = list.slice(Math.max(0, k - 1), k + 2).map((p) => p.proj);
      const base = around.length ? mean(around) : 0;
      for (const p of list) scored.push([p.id, p.proj - base]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    return new Map(scored.map(([id], i) => [id, i + 1]));
  };
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r[FIELD] != null).map((r) => r.season))].sort();
  console.log(`heimild ${PROJ} · ${SCORING} · ${years.length} timabil: ${years.join(", ")}`);

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

  const noisyField = (pool, seed) => {
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

  /* Beint einvigi vid kyrrstaeda bordid, baðar attir a hverju saetapari. */
  const duel = (makeBoard) => {
    const perYear = {};
    for (const y of ys) {
      const w = world[y];
      const mine = makeBoard(w.pool);
      const base = staticBoard(w.pool);
      const d = [];
      for (let r = 0; r < RUNS; r++) {
        const field = r === 0 ? w.field : noisyField(w.pool, y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const res = simulateDraft({
              board: mine, fieldBoard: field, actual: w.actual,
              slot: swap ? j : i, league: LEAGUE,
              rival: { slot: swap ? i : j, board: base },
            });
            d.push(res.points - res.rivalPoints);
          }
        }
      }
      perYear[y] = mean(d);
    }
    const vals = ys.map((y) => perYear[y]).filter((v) => v != null);
    const m = mean(vals);
    const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2)) * vals.length /
                         Math.max(1, vals.length - 1));
    const se = sd / Math.sqrt(vals.length);
    return { mean: r1(m), se: r1(se), t: r3(se ? m / se : 0),
             wins: vals.filter((v) => v > 0).length, years: vals.length,
             perYear: Object.fromEntries(Object.entries(perYear).map(([k, v]) => [k, r1(v)])) };
  };

  const out = {};
  /* HEILBRIGDISPROF FYRST: kyrrstaett gegn sjalfu ser VERDUR ad gefa
     nakvaemlega 0. Gefi thad thad ekki er hermunin ekki samhverf og
     enginn samanburdur her er marktaekur. */
  const self = duel((pool) => staticBoard(pool));
  console.log(`\n  heilbrigdisprof (kyrrstaett gegn sjalfu ser): ${self.mean} stig ` +
    `${Math.abs(self.mean) < 0.05 ? "— HLUTLAUST, hermunin er samhverf" : "— VIDVORUN, ekki samhverf"}`);
  out.selfTest = self;

  for (const mode of ["remaining", "nextpick"]) {
    const res = duel((pool) => dynamicBoard(pool, mode));
    out[mode] = res;
    console.log(`\n  ${mode}`);
    console.log(`    ${res.mean > 0 ? "+" : ""}${res.mean} stig · ${res.wins}/${res.years} ar · t=${res.t}`);
    console.log(`    per ar: ${Object.entries(res.perYear)
      .map(([y, v]) => `${y} ${v > 0 ? "+" : ""}${v}`).join("  ")}`);
  }

  const tCrit = ys.length > 6 ? 2.228 : 2.776;
  console.log(`\n  mork |t| > ${tCrit} (adeins TVO afbrigdi profud, svo engin`);
  console.log("  leidretting fyrir fjolda samanburda er nauðsynleg)");
  for (const mode of ["remaining", "nextpick"]) {
    const r = out[mode];
    console.log(`    ${mode.padEnd(10)} ${Math.abs(r.t) > tCrit
      ? (r.mean > 0 ? "MARKTAEK BAETING" : "MARKTAEKT VERRA")
      : "innan vikmarka — engin adgerd"}`);
  }

  await writeFile(path.join(OUT, `dynamic_${SCORING}_${PROJ}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "sleeper", runs: 10 },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, projection: PROJ, seasons: ys, tCrit, ...out,
  }, null, 1));
  console.log(`\n-> data/dynamic_${SCORING}_${PROJ}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
