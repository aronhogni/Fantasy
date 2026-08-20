/* ============================================================
   C. HVOR ER STAERRA HOLID? — SIDUSTU FIMM UMFERDIR FYRRA TIMABILS
      A MOTI ENGRI TOLU YFIRLEITT.

   EKKI I `npm test`, EKKI I PIPELINE, ENGIR LYKLAR. Keyrsla:
       node scripts/measure-tail-to-gw1.mjs
       node scripts/measure-tail-to-gw1.mjs --iters 400 --json [SLOD]

   I FORLEIK er `imminent.json`-glugginn umferdir 34-38 FYRRA timabils
   (maelt i dag: `gws: [34,35,36,37,38]`, `season: "2025/26"`). Tvo hopar
   verda thvi til:

     · 461 leikmenn fa TOLU sem hvilir a stodum sem eru buinn (Ben White:
       starts 3/5 en adeins 109 minutur — hann var rotadur i daudum leikjum).
     · 134 leikmenn fa ENGA tolu (`startProbability` skilar `null` thvi
       `startFeatures` fær enga rod) — sumarkaup og nyliðaklubbar. 69 af
       theim kosta >= 5,0m. Null-reglan i CLAUDE.md ("P=null utilokar
       ALDREI") hleypir theim thogult gegnum hverja siu.

   SPURNINGIN SEM ThETTA MAELIR er ekki "er likanid gott" — thad er maelt
   (Brier 0,0888 a moti 0,1176 innan timabils). Hun er: **er ThETTA gluggi
   marktaekur fyrir GW1 naesta timabils?** Ef ekki, tha er honesta birtingin
   fyrir GW1 ekki BETRI tala heldur ENGIN tala — sama akvordun og
   CLAUDE.md tekur i `calibration.mjs` ("faar maelingar -> ENGIN tala").

   FJOGUR TIMABILAMOT eru til i `data/`: 2122->2223, 2223->2324,
   2324->2425, 2425->2526. Thau eru MOTIN SJALF, ekki hermun.
   ============================================================ */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { startFeatures, startProbability } from "../src/stats.js";
import {
  loadPanel, SEASONS, isStart, logit, sigmoid, brier, logloss, auc,
  fitLogistic, bootstrapCI, byPlayer, ci, fmt,
} from "./start-panel.mjs";

const argv = process.argv.slice(2);
const ITERS = +(argv[argv.indexOf("--iters") + 1] || 400) || 400;
const WRITE = argv.includes("--json");
const TAIL = [34, 35, 36, 37, 38];

const panel = await loadPanel();
const BOUNDS = [];
for (let i = 0; i < SEASONS.length - 1; i++) BOUNDS.push([SEASONS[i], SEASONS[i + 1]]);

/* ============================================================
   1. TVEIR HOPAR VID HVER TIMABILAMOT
   ============================================================ */
const withTail = [], noTail = [];

for (const [prev, next] of BOUNDS) {
  const P = panel[prev], Q = panel[next];
  for (const p of Q.byCode.values()) {
    const g1 = p.r.get(1);
    if (!g1) continue;                                  // ekki i hop i GW1
    if (!Q.teamPlayed.has(`1|${g1.team}`)) continue;     // lid spiladi ekki GW1
    const y = isStart(g1.mins) ? 1 : 0;

    const old = P.byCode.get(p.code);
    const series = [];
    if (old) for (const r of TAIL) { const g = old.r.get(r); if (g) series.push(g.mins); }

    /* Fyrra timabil I HEILD — samanburdar-inntak sem vid HOFUM lika. */
    let fullMins = 0, fullStarts = 0, fullRounds = 0;
    if (old) for (const [, g] of old.r) { fullMins += g.mins; fullStarts += isStart(g.mins) ? 1 : 0; fullRounds++; }

    const base = {
      code: p.code, name: p.webName, prev, next, pos: p.pos, team: g1.team,
      value: g1.value, y, fullMins, fullStarts, fullRounds,
      prevSeen: !!old,
    };

    if (series.length >= 2) {
      const f = startFeatures(series, g1.value);
      const pm = startProbability(f);
      if (pm != null) { withTail.push({ ...base, series, f, pm, lp: logit(pm) }); continue; }
    }
    noTail.push(base);
  }
}

console.log("=== THE TWO COHORTS AT EVERY SEASON BOUNDARY ===");
console.log("bound        with tail window   no tail window   GW1 starters from the no-number cohort");
for (const [prev, next] of BOUNDS) {
  const a = withTail.filter(r => r.prev === prev), b = noTail.filter(r => r.prev === prev);
  const sa = a.filter(r => r.y).length, sb = b.filter(r => r.y).length;
  console.log(`${prev}->${next}  n ${String(a.length).padStart(3)} started ${String(sa).padStart(3)} ` +
    `(${fmt(sa / a.length, 3)})   n ${String(b.length).padStart(3)} started ${String(sb).padStart(3)} ` +
    `(${fmt(sb / (b.length || 1), 3)})   ${fmt(sb / (sa + sb), 3)} of all GW1 starters`);
}
{
  const sa = withTail.filter(r => r.y).length, sb = noTail.filter(r => r.y).length;
  console.log(`TOTAL         n ${withTail.length} started ${sa} (${fmt(sa / withTail.length, 3)})` +
    `   n ${noTail.length} started ${sb} (${fmt(sb / noTail.length, 3)})   ` +
    `${fmt(sb / (sa + sb), 3)} of all GW1 starters`);
  console.log(`\nOf the no-number cohort, ${noTail.filter(r => r.prevSeen).length} DID appear in the previous ` +
    `season but not in rounds 34-38 (mid-season departures/injuries); ` +
    `${noTail.filter(r => !r.prevSeen).length} were not in the league at all.`);
}

/* ============================================================
   2. ER TALAN MARKTAEK FYRIR GW1? (hopur A)
   ============================================================ */
const rowsA = withTail.map(r => ({ ...r, p: r.pm }));
const baseRate = rowsA.reduce((a, r) => a + r.y, 0) / rowsA.length;

console.log("\n=== COHORT A: does the tail-window number predict GW1? ===");
console.log(`n ${rowsA.length}, players ${new Set(rowsA.map(r => r.code)).size}, GW1 start rate ${fmt(baseRate, 4)}`);
console.log(`p_model  Brier ${fmt(brier(rowsA))}  logloss ${fmt(logloss(rowsA))}  AUC ${fmt(auc(rowsA))}`);
const constRows = rowsA.map(r => ({ p: baseRate, y: r.y, code: r.code }));
console.log(`constant Brier ${fmt(brier(constRows))}  logloss ${fmt(logloss(constRows))}  (a number that says nothing)`);
console.log(`IN-SEASON REFERENCE (measure-rival-out.mjs, same model, gw 7-38): Brier 0.0923, AUC 0.9311`);
console.log(`START_MODEL's own measured figure: Brier 0.0888 vs baseline 0.1176`);

{
  const d = a => brier(a.map(r => ({ p: baseRate, y: r.y }))) - brier(a.map(r => ({ p: r.pm, y: r.y })));
  const b = bootstrapCI(byPlayer(rowsA), d, { iters: ITERS, seed: 51 });
  console.log(`\nd Brier vs a constant (>0 = the number carries information)  ${ci(b, 5)}`);
  console.log(`VERDICT: the tail number ${b.excludesZero && b.point > 0 ? "DOES" : "does NOT"} beat a constant for GW1`);
  /* Skekkja (calibration): halli og skurdpunktur a logit-kvarda. */
  const co = fitLogistic(rowsA.map(r => [1, r.lp]), rowsA.map(r => r.y));
  console.log(`calibration: intercept ${fmt(co[0], 3)}  slope ${fmt(co[1], 3)}  ` +
    `(1.0 = perfectly calibrated; <1 = the number is OVERCONFIDENT)`);
}

console.log("\nRELIABILITY — what the number said vs what happened (GW1):");
{
  const s = rowsA.slice().sort((a, b) => a.pm - b.pm), per = Math.ceil(s.length / 10);
  console.log("dec     n   mean p_model   actual GW1 start rate   gap");
  for (let d = 0; d < 10; d++) {
    const seg = s.slice(d * per, (d + 1) * per); if (!seg.length) continue;
    const mp = seg.reduce((a, r) => a + r.pm, 0) / seg.length;
    const ar = seg.reduce((a, r) => a + r.y, 0) / seg.length;
    console.log(`${String(d + 1).padStart(3)} ${String(seg.length).padStart(5)}      ${fmt(mp, 3)}` +
      `              ${fmt(ar, 3)}          ${fmt(ar - mp, 3)}`);
  }
}

console.log("\nRELIABILITY on FIXED bins — the deciles hide where the displayed number actually sits:");
{
  const bins = [[0, .05], [.05, .10], [.10, .20], [.20, .30], [.30, .50],
                [.50, .70], [.70, .90], [.90, 1.01]];
  console.log("band          n   mean p_model   actual   gap (95% CI, clustered per player)");
  for (const [lo, hi] of bins) {
    const seg = rowsA.filter(r => r.pm >= lo && r.pm < hi);
    if (seg.length < 15) { console.log(`${fmt(lo, 2)}-${fmt(hi, 2)}  n ${seg.length} — too few`); continue; }
    const mp = seg.reduce((a, r) => a + r.pm, 0) / seg.length;
    const ar = seg.reduce((a, r) => a + r.y, 0) / seg.length;
    const g = a => (a.length ? a.reduce((s, r) => s + (r.y - r.pm), 0) / a.length : NaN);
    const b = bootstrapCI(byPlayer(seg), g, { iters: ITERS, seed: 55 });
    console.log(`${fmt(lo, 2)}-${fmt(hi, 2)} ${String(seg.length).padStart(5)}     ${fmt(mp, 3)}` +
      `        ${fmt(ar, 3)}    ${ci(b, 3)}`);
  }
}

/* ============================================================
   2b. ENDURKVORDUN — SAMA TALA, RETTUR KVARDI.
   Engin ny inntok, engin ny heimild: adeins vorpun p -> p, fittud a
   ThREMUR timabilamotum og maeld a thvi FJORDA (LOSO). Ef thetta vinnur er
   villan i GW1-birtingunni KVARDI, ekki upplysingaleysi — og hun er
   ódýrasta lagfaeringin sem til er.
   ============================================================ */
console.log("\n=== RECALIBRATION for GW1 (same inputs, LOSO over the four boundaries) ===");
{
  const oos = [];
  for (const [prev] of BOUNDS) {
    const tr = rowsA.filter(r => r.prev !== prev), te = rowsA.filter(r => r.prev === prev);
    const b = fitLogistic(tr.map(r => [1, r.lp]), tr.map(r => r.y));
    for (const r of te) oos.push({ code: r.code, y: r.y, pb: r.pm, pt: sigmoid(b[0] + b[1] * r.lp) });
  }
  console.log(`raw          Brier ${fmt(brier(oos.map(r => ({ p: r.pb, y: r.y }))))} ` +
    `logloss ${fmt(logloss(oos.map(r => ({ p: r.pb, y: r.y }))))}`);
  console.log(`recalibrated Brier ${fmt(brier(oos.map(r => ({ p: r.pt, y: r.y }))))} ` +
    `logloss ${fmt(logloss(oos.map(r => ({ p: r.pt, y: r.y }))))}   (AUC is UNCHANGED by design: ` +
    `${fmt(auc(oos.map(r => ({ p: r.pt, y: r.y }))))})`);
  const d = a => a.reduce((s, r) => s + ((r.pb - r.y) ** 2 - (r.pt - r.y) ** 2), 0) / a.length;
  console.log(`d Brier ${ci(bootstrapCI(byPlayer(oos), d, { iters: ITERS, seed: 56 }), 5)}`);

  const co = fitLogistic(rowsA.map(r => [1, r.lp]), rowsA.map(r => r.y));
  console.log(`\nfull-sample map: p_gw1 = sigmoid(${fmt(co[0], 3)} + ${fmt(co[1], 3)} * logit(p_model))`);
  console.log("what the screen shows now  ->  what it should show for GW1");
  for (const p of [0.05, 0.10, 0.154, 0.24, 0.353, 0.50, 0.75, 0.90, 0.95]) {
    console.log(`   ${fmt(p * 100, 1)}%  ->  ${fmt(sigmoid(co[0] + co[1] * logit(p)) * 100, 1)}%`);
  }
}

/* Undirhopurinn sem eigandinn nefndi: rotadur i lokin (Ben White-formid). */
console.log("\n=== THE BEN WHITE SHAPE: started >=2 of the tail but averaged < 60 minutes ===");
{
  const seg = rowsA.filter(r => r.f.starts5 >= 0.4 && r.f.mins5 < 60);
  const oth = rowsA.filter(r => !(r.f.starts5 >= 0.4 && r.f.mins5 < 60));
  const sr = a => a.reduce((s, r) => s + r.y, 0) / a.length;
  const mp = a => a.reduce((s, r) => s + r.pm, 0) / a.length;
  console.log(`rotated-tail  n ${seg.length}  p_model ${fmt(mp(seg), 3)}  actual GW1 start ${fmt(sr(seg), 3)}  ` +
    `gap ${fmt(sr(seg) - mp(seg), 3)}`);
  console.log(`everyone else n ${oth.length}  p_model ${fmt(mp(oth), 3)}  actual GW1 start ${fmt(sr(oth), 3)}  ` +
    `gap ${fmt(sr(oth) - mp(oth), 3)}`);
  const gap = a => {
    const o = a.filter(r => r.f.starts5 >= 0.4 && r.f.mins5 < 60);
    return o.length ? o.reduce((s, r) => s + (r.y - r.pm), 0) / o.length : NaN;
  };
  console.log(`rotated-tail gap ${ci(bootstrapCI(byPlayer(rowsA), gap, { iters: ITERS, seed: 52 }), 4)}`);
}

/* ============================================================
   3. ER GLUGGINN SJALFUR RANGUR? — fyrra timabil I HEILD a moti sidustu 5
      LOSO yfir timabilamotin fjogur (haldid einu moti eftir i hvert skipti).
   ============================================================ */
console.log("\n=== IS THE WINDOW WRONG? tail-5 vs the WHOLE previous season ===");
{
  const feat = {
    "tail-5 (what the app uses)": r => [r.lp],
    "prev-season start RATE":     r => [r.fullRounds ? r.fullStarts / r.fullRounds : 0],
    "prev-season MINUTES/round":  r => [r.fullRounds ? r.fullMins / r.fullRounds : 0],
    "price only":                 r => [(r.value || 45) / 10],
    "tail-5 + prev-season rate":  r => [r.lp, r.fullRounds ? r.fullStarts / r.fullRounds : 0],
    "prev-season rate + price":   r => [r.fullRounds ? r.fullStarts / r.fullRounds : 0, (r.value || 45) / 10],
  };
  const oos = {};
  for (const [label, f] of Object.entries(feat)) {
    const out = [];
    for (const [prev] of BOUNDS) {
      const tr = rowsA.filter(r => r.prev !== prev), te = rowsA.filter(r => r.prev === prev);
      if (!tr.length || !te.length) continue;
      const b = fitLogistic(tr.map(r => [1, ...f(r)]), tr.map(r => r.y));
      for (const r of te) {
        const x = [1, ...f(r)];
        out.push({ code: r.code, y: r.y, p: sigmoid(x.reduce((a, v, i) => a + v * b[i], 0)) });
      }
    }
    oos[label] = out;
    console.log(`  ${label.padEnd(28)} Brier ${fmt(brier(out))}  logloss ${fmt(logloss(out))}  AUC ${fmt(auc(out))}`);
  }
  const key = "tail-5 (what the app uses)";
  const map = new Map(oos[key].map((r, i) => [i, r]));
  for (const label of Object.keys(oos)) {
    if (label === key) continue;
    const pair = oos[label].map((r, i) => ({ code: r.code, y: r.y, pb: map.get(i).p, pt: r.p }));
    const d = a => a.reduce((s, r) => s + ((r.pb - r.y) ** 2 - (r.pt - r.y) ** 2), 0) / a.length;
    const b = bootstrapCI(byPlayer(pair), d, { iters: ITERS, seed: 61 });
    console.log(`  d Brier vs tail-5: ${label.padEnd(28)} ${ci(b, 5)}`);
  }
}

/* ============================================================
   4. HOPUR B — ThEIR SEM FA ENGA TOLU. HVAD ER TIL?
   ============================================================ */
console.log("\n=== COHORT B (no number at all): is price a usable stand-in? ===");
{
  const rowsB = noTail.map(r => ({ ...r, code: r.code }));
  const br = rowsB.reduce((a, r) => a + r.y, 0) / rowsB.length;
  console.log(`n ${rowsB.length}  GW1 start rate ${fmt(br, 3)}  ` +
    `(cohort A rate ${fmt(baseRate, 3)}) — these are NOT low-risk players, they are UNKNOWN ones`);
  console.log("price band     n   GW1 start rate");
  const bands = [[0, 45], [45, 50], [50, 55], [55, 65], [65, 200]];
  for (const [lo, hi] of bands) {
    const seg = rowsB.filter(r => (r.value ?? 45) >= lo && (r.value ?? 45) < hi);
    if (!seg.length) continue;
    console.log(`  ${String(lo / 10).padStart(4)}-${String(hi / 10).padEnd(5)} ${String(seg.length).padStart(4)}   ` +
      `${fmt(seg.reduce((a, r) => a + r.y, 0) / seg.length, 3)}`);
  }
  const oos = [];
  for (const [prev] of BOUNDS) {
    const tr = rowsB.filter(r => r.prev !== prev), te = rowsB.filter(r => r.prev === prev);
    if (!tr.length || !te.length) continue;
    const b = fitLogistic(tr.map(r => [1, (r.value || 45) / 10]), tr.map(r => r.y));
    for (const r of te) oos.push({ code: r.code, y: r.y,
      p: sigmoid(b[0] + b[1] * ((r.value || 45) / 10)) });
  }
  console.log(`price-only model, out of sample: Brier ${fmt(brier(oos))} AUC ${fmt(auc(oos))} ` +
    `(constant Brier ${fmt(brier(oos.map(r => ({ p: br, y: r.y }))))})`);
  const d = a => brier(a.map(r => ({ p: br, y: r.y }))) - brier(a.map(r => ({ p: r.p, y: r.y })));
  console.log(`d Brier price vs constant ${ci(bootstrapCI(byPlayer(oos), d, { iters: ITERS, seed: 71 }), 5)}`);
  /* Til samanburdar: hversu godur er verd-adeins-lidurinn i hop A? */
  console.log("\nAnd the comparison that decides which hole is bigger:");
  console.log(`  cohort A (has a number)  AUC of p_model ${fmt(auc(rowsA), 4)}`);
  console.log(`  cohort B (no number)     AUC of price   ${fmt(auc(oos), 4)}`);
}

if (WRITE) {
  const i = argv.indexOf("--json"), nxt = argv[i + 1];
  const target = nxt && !nxt.startsWith("-")
    ? resolve(process.cwd(), nxt) : join(tmpdir(), "fpl-measure", "tail-to-gw1.json");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify({ measured: new Date().toISOString(),
    withTail: withTail.length, noTail: noTail.length, iters: ITERS }, null, 2));
  console.log(`\nwrote ${target}`);
}
