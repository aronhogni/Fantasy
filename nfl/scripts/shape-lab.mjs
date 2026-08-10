#!/usr/bin/env node
/* ============================================================
   shape-lab.mjs — GILDIR THETTA I MINNI DEILD?

     node scripts/shape-lab.mjs [--proj=sleeper|fftoday] [--runs=6]

   -> data/shapes_<proj>.json

   ALLT SEM ER MAELT I THESSU VERKEFNI VAR MAELT I EINNI DEILD:
   12 lid, einn leikstjornandi, QB/RB/RB/WR/WR/WR/TE/FLEX. Hun var
   valin THVI HUN ER ALGENGUST — en appid leyfir 8 til 16 lid, PPR og
   standard, og superflex. Notandi i 10-lida superflex-deild fékk tolur
   sem enginn hafdi profad i hans deild.

   THAD ER EKKI SMAATRIDI, THVI VARAMANNS-THREPID ER DEILDARSTAERD.
   Med 10 lidum er varamadurinn a hverri stodu BETRI en med 14, svo
   VBD-bilin thjappast. Og i superflex fer QB ur thvi ad vera eitt
   saeti af niu i tvo — sem er nakvaemlega su breyting sem VBD a ad
   grípa, ef hun virkar.

   THREPIN ERU REIKNUD UR DEILDINNI, ekki fost: byrjunarsaeti x lid,
   plus flex-hlutfallid sem var maelt (FLEX_SPLIT i model.js). Thad er
   thegar rett i `model.js`; hér er profad hvort thad DUGI.

   TVAER NULLLINUR i hverri lögun, thvi thaer svara sitthvorri
   spurningu: hra spa-rod (er umreikningurinn ad gera gagn?) og ADP
   (er thetta betra en markadurinn?).
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { replacementRanks } from "../src/model.js";
import { stamp } from "./lib/provenance.mjs";

import { parseArgs, requireSeasons } from "./lib/args.mjs";
const OUT = path.resolve(process.cwd(), "data");
/* Gildi sem raedur skraarnafni verdur ad koma ur leyfdum lista —
   sja lib/args.mjs um skrarnar med bilum i nafni. */
const ARG = parseArgs(process.argv.slice(2), {
  proj: ["sleeper", "fftoday"],
  runs: "number",
});
const PROJ = String(ARG.proj || "sleeper");
const FIELD = PROJ === "fftoday" ? "ffProj" : "sleeperProj";
const RUNS = Number(ARG.runs || 6);
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

/* LOGUNIN SEM ERU PROFADAR. Hver er raunveruleg uppsetning sem folk
   spilar, ekki tilbuin tilbrigdi. */
const SHAPES = [
  { key: "8-std",     teams: 8,  starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } },
  { key: "10-std",    teams: 10, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } },
  { key: "12-std",    teams: 12, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } },
  { key: "14-std",    teams: 14, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } },
  { key: "16-std",    teams: 16, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } },
  { key: "12-2flex",  teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 } },
  { key: "12-sflex",  teams: 12, starters: { QB: 1, RB: 2, WR: 3, TE: 1, SUPERFLEX: 1 },
    superflex: true },
  { key: "12-2qb",    teams: 12, starters: { QB: 2, RB: 2, WR: 3, TE: 1, FLEX: 1 } },
];

/* Stodu-thak verdur ad fylgja loguninni. Ad halda QB-thakinu i 2 i
   2QB-deild vaeri ad banna ollum ad eiga varamann, sem enginn gerir. */
function maxPosFor(shape) {
  const qb = (shape.starters.QB || 1) + (shape.superflex || shape.starters.SUPERFLEX ? 1 : 0);
  return { QB: Math.max(2, qb + 1), RB: 6, WR: 7, TE: 2 };
}

/* Varamanns-threp UR DEILDINNI. Notar `replacementRanks` ur model.js —
   somu tolu og appid syder notandanum, svo profid maeli thad sem er i
   loftinu en ekki einhverja hlidarutgafu. */
function replFor(shape) {
  try {
    const r = replacementRanks({ teams: shape.teams, starters: shape.starters,
                                 superflex: !!shape.superflex });
    if (r && r.QB) return r;
  } catch { /* fellur i einfalda talningu ad nedan */ }
  const t = shape.teams;
  return { QB: t * (shape.starters.QB || 1), RB: t * ((shape.starters.RB || 0) + 0.33 * (shape.starters.FLEX || 0)),
           WR: t * ((shape.starters.WR || 0) + 0.48 * (shape.starters.FLEX || 0)),
           TE: t * ((shape.starters.TE || 0) + 0.19 * (shape.starters.FLEX || 0)) };
}

function vbdRank(pool, repl) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, Math.max(0, Math.round(repl[pos] ?? 24) - 1));
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) scored.push([p.id, p.proj - base]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const out = { generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: { proj: "sleeper", runs: 6 },
      inputs: ["features.json"], dataDir: OUT }),
    projection: PROJ, shapes: {} };

  for (const scoring of ["ppr", "standard"]) {
    const rows = feats.rows.filter((r) => r.scoring === scoring);
    const years = [...new Set(rows.filter((r) => r[FIELD] != null).map((r) => r.season))].sort();

    for (const shape of SHAPES) {
      const league = { ...DEFAULT_LEAGUE, teams: shape.teams, rounds: 14,
                       starters: shape.starters, superflex: !!shape.superflex,
                       maxPos: maxPosFor(shape) };
      const repl = replFor(shape);

      const world = {};
      for (const y of years) {
        const yr = rows.filter((r) => r.season === y && r.adp != null && r[FIELD] != null);
        if (yr.length < 120) continue;
        const pts = (r) => (scoring === "ppr" ? r.pts : r.ptsStd);
        const pool = yr.map((r) => ({ id: r.id, pos: r.pos, proj: r[FIELD],
                                      adp: r.adp, adpSd: r.adpSd, actual: pts(r) }));
        world[y] = {
          pool,
          actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
          field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
          raw: new Map(pool.slice().sort((a, b) => b.proj - a.proj).map((p, i) => [p.id, i + 1])),
          vbd: vbdRank(pool, repl),
        };
      }
      const ys = Object.keys(world).map(Number).sort();
      if (!ys.length) continue;

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

      const versus = (rivalKey) => {
        const perYear = {};
        for (const y of ys) {
          const w = world[y];
          const d = [];
          for (let r = 0; r < RUNS; r++) {
            const field = r === 0 ? w.field : noisy(w.pool, y * 1000 + r * 7919);
            for (let i = 1; i <= shape.teams; i++) {
              const j = i % shape.teams + 1;
              for (const swap of [false, true]) {
                const res = simulateDraft({
                  board: w.vbd, fieldBoard: field, actual: w.actual,
                  slot: swap ? j : i, league,
                  rival: { slot: swap ? i : j, board: w[rivalKey] },
                });
                d.push(res.points - res.rivalPoints);
              }
            }
          }
          perYear[y] = mean(d);
        }
        const vals = ys.map((y) => perYear[y]);
        const m = mean(vals);
        const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2)) * vals.length /
                             Math.max(1, vals.length - 1));
        const s = sd / Math.sqrt(vals.length);
        return { mean: r1(m), t: r3(s ? m / s : 0),
                 wins: vals.filter((v) => v > 0).length, years: vals.length };
      };

      const vsRaw = versus("raw"), vsAdp = versus("field");

      /* ============================================================
         SUPERFLEX-SAMANBURDURINN VID ADP ER OGILDUR OG THAD ER SAGT
         ============================================================
         Sogulega ADP-id sem vid eigum er UR EINS-QB DEILDUM. I
         superflex- og 2QB-logunum draftar vollurinn thvi eftir rongu
         bordi: hann skilur leikstjornendur eftir sem raunverulegt
         superflex-herbergi hefdi tekid strax. Bord sem metur QB rett
         "vinnur" tha gegn andstaedingi sem er ad spila vitlaust — og
         su tala maelir mistok vallarins, ekki gaedi bordsins.

         Samanburdurinn vid HRA SPA-ROD stendur eftir sem adur: bædi
         bordin lesa somu deild, svo villan i vellinum bitnar jafnt a
         theim.

         2QB-ADP ER TIL fyrir yfirstandandi timabil (`ffc_2qb_12`, 219
         leikmenn ur 2.912 droftum) en EKKI sogulega, svo thetta er
         ekki lagfaeranlegt hér — thad er skrad sem takmorkun.       */
      const superflexShape = !!(shape.superflex || shape.starters.SUPERFLEX ||
                                (shape.starters.QB || 1) > 1);
      out.shapes[`${scoring}|${shape.key}`] = { scoring, shape: shape.key,
        teams: shape.teams, starters: shape.starters,
        replacement: Object.fromEntries(Object.entries(repl).map(([k, v]) => [k, r1(v)])),
        vsRaw, vsAdp,
        adpValid: !superflexShape,
        adpNote: superflexShape
          ? "sogulegt ADP er ur eins-QB deildum — samanburdurinn vid ADP er ogildur her"
          : null };
      console.log(`${scoring.padEnd(8)} ${shape.key.padEnd(10)} ` +
        `gegn hrarri rod ${(vsRaw.mean > 0 ? "+" : "") + String(vsRaw.mean).padStart(7)} (${vsRaw.wins}/${vsRaw.years}) · ` +
        `gegn ADP ${(vsAdp.mean > 0 ? "+" : "") + String(vsAdp.mean).padStart(7)} (${vsAdp.wins}/${vsAdp.years})`);
    }
  }

  /* SAMANTEKT SEM SVARAR SPURNINGUNNI SEM VAR SPURD. */
  const all = Object.values(out.shapes);
  /* ADEINS GILDU LOGUNIN ERU TALDAR i fullyrdingunni. Ad telja
     superflex med vaeri ad styrkja nidurstoduna med tolu sem vid
     vitum ad er ogild. */
  const valid = all.filter((s) => s.adpValid);
  const adpOk = valid.filter((s) => s.vsAdp.mean > 0).length;
  const rawOk = all.filter((s) => s.vsRaw.mean > 0).length;
  console.log(`\n  gegn ADP:          jakvaett i ${adpOk} af ${valid.length} GILDUM logunum`);
  console.log(`  (${all.length - valid.length} superflex/2QB logun eru ekki taldar — ` +
    "sogulegt ADP er ur eins-QB deildum)");
  console.log(`  gegn hrarri rod:   jakvaett i ${rawOk} af ${all.length} logunum`);
  const worst = valid.slice().sort((a, b) => a.vsAdp.mean - b.vsAdp.mean)[0];
  console.log(`  lakasta logun gegn ADP: ${worst.scoring} ${worst.shape} (${worst.vsAdp.mean})`);
  out.summary = { shapes: all.length, validShapes: valid.length,
                  beatsAdp: adpOk, beatsRaw: rawOk,
                  worstVsAdp: { shape: worst.shape, scoring: worst.scoring, mean: worst.vsAdp.mean } };

  await writeFile(path.join(OUT, `shapes_${PROJ}.json`), JSON.stringify(out, null, 1));
  console.log(`\n-> data/shapes_${PROJ}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
