/* ============================================================
   HVERNIG HEFDI SPALIKANID GENGID? — EITT TIMABIL, UMFERD FYRIR
   UMFERD (4.9.2026, handvirk maelingaskrifta — EKKI i `npm test`)

   Keyrsla:  node scripts/backtest-season.mjs            (sjalfgefid 2526)
             node scripts/backtest-season.mjs --season=2425
             node scripts/backtest-season.mjs --json /tmp/bt.json

   ATHUGASEMDIR A ISLENSKU; ALLIR PRENTADIR STRENGIR A ENSKU.

   Beidni eiganda: „keyrdu projected points spalikanid a sidustu leiktid,
   sjadu hvernig thvi modeli hefdi gengid."

   ThRENNT SEM GERIR ThETTA HEIDARLEGT — an theirra er bakprof
   sjalfshrós:

   1. GONGULEIKUR (walk-forward). Hver rod er reiknud UR FORTID EINNI:
      `tests/lib/panel2.mjs` byggir hvert svid ur umferdum < t og ur
      fyrra timabili. Ekkert ur umferdinni sjalfri nema leikjathyngdin,
      sem er thekkt fyrir frest.

   2. FASTARNIR SAU EKKI ThETTA TIMABIL. `K = 8` og `M = 5` voru valdir
      med LOSO i `measure-base-search.mjs`; foldid sem HELT EFTIR thessu
      timabili valdi somu tolur, svo their eru ekki fittadir a thad sem
      er verid ad maela her. Thad er sagt BERUM ORDUM thvi bakprof med
      fittudum fostum er ekki bakprof.

   3. ThAK OG GOLF. Ein tala („4,7 stig") segir ekkert an thess ad vita
      hvad er MOGULEGT og hvad er OKEYPIS:
        · ORAKEL   — 15 bestu radirnar EFTIR A (thak sem enginn naer),
        · ppg5     — thad sem appid gerdi adur (stadgengill `ep_next`),
        · TILVILJUN — 15 slembnar radir (golf).
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPanel } from "../tests/lib/panel2.mjs";
import { fmt } from "./start-panel.mjs";
import { lookupPos, POS_MEAN_PTS, pointsBase, calibrateExp } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
const arg = k => { const h = process.argv.find(a => a.startsWith(`--${k}=`)); return h ? h.split("=")[1] : null; };
const SEASON = arg("season") || "2526";
const argJson = process.argv.indexOf("--json");
const OUT = { season: SEASON };
const line = (c = "-", n = 78) => console.log(c.repeat(n));
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

/* ---------- Uppsafnad UR FORTID EINNI ---------- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const SE = Object.keys(PG.seasons);
const past = new Map(), prev = new Map();
for (const [season, list] of Object.entries(PG.seasons)) {
  const agg = {};
  for (const q of list) {
    const a = agg[q[H.name]] ||= { p: 0, m: 0, n: 0 };
    a.p += q[H.pts]; a.m += q[H.mins]; a.n++;
  }
  const nx = SE[SE.indexOf(season) + 1];
  if (nx) for (const [nm, a] of Object.entries(agg))
    if (a.n >= 5) prev.set(`${nx}|${nm}`, { pts: a.p, mins: a.m });
  const by = {};
  for (const q of list) (by[q[H.name]] ||= []).push(q);
  for (const [nm, arr] of Object.entries(by)) {
    arr.sort((a, b) => a[H.round] - b[H.round]);
    let p = 0, m = 0, n = 0;
    for (const q of arr) {
      past.set(`${season}|${nm}|${q[H.round]}`, { sumPts: p, nApp: n, sumMins: m });
      p += q[H.pts]; m += q[H.mins]; n++;
    }
  }
}

console.log(`building walk-forward panel for ${SEASON} ...`);
const rows = buildPanel({ minHistory: 1, includeBlanks: true })
  .filter(r => r.season === SEASON)
  .map(r => ({ ...r, ...(past.get(`${SEASON}|${r.name}|${r.round}`) || {}),
               prev: prev.get(`${SEASON}|${r.name}`) || null }))
  .filter(r => r.nApp != null);
if (!rows.length) { console.log(`no rows for season ${SEASON}`); process.exit(1); }

/* ---------- Spain — NAKVAEMLEGA `pointsBase` UR `src/model.js` ----------
   Fluttur INN, ekki endurritadur: handafrit af formulu er onnur formula
   sem lítur eins ut (CLAUDE.md kafli 7).                              */
for (const r of rows) {
  r._mult = lookupPos(r.code, "pts", r.ffdr) / POS_MEAN_PTS[r.code];
  const base = pointsBase({
    seasonStarted: true,
    p: { element_type: r.code, total_points: r.sumPts },
    mins5: r.mins5, minsTrend: r.minsTrend,
    prevPts: r.prev?.pts, prevMins: r.prev?.mins,
    matchesPlayed: r.nApp,
  });
  /* KVORDUNIN ER HLUTI AF ThVI SEM NOTANDINN SER — bakprof sem sleppir
     henni maelir annad likan en appid birtir (kafli 15).             */
  r._raw = (base ?? 0) * r._mult;
  r._model = r._raw > 0 ? calibrateExp(r._raw) : 0;
  r._old = (r.ppg5 ?? 0) * r._mult;       // thad sem appid gerdi adur
}

/* ---------- Umferd fyrir umferd ---------- */
const gws = [...new Set(rows.map(r => r.round))].sort((a, b) => a - b);
const pick15 = (list, get) => [...list].sort((a, b) => get(b) - get(a)).slice(0, 15);
const top = (list, get) => mean(pick15(list, get).map(r => r.pts));
/* TILVILJUN ER GOLF — fast frae svo talan se endurgeranleg.          */
let seed = 7;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

const per = [];
for (const g of gws) {
  const list = rows.filter(r => r.round === g);
  if (list.length < 20) continue;
  const shuffled = [...list].sort(() => rnd() - 0.5).slice(0, 15);
  per.push({
    gw: g, n: list.length,
    model: top(list, r => r._model),
    old: top(list, r => r._old),
    oracle: top(list, r => r.pts),
    random: mean(shuffled.map(r => r.pts)),
    /* MAE a ThEIM SEM LIKANID VELUR — thad er talan sem notandinn les. */
    maeTop: mean(pick15(list, r => r._model).map(r => Math.abs(r._model - r.pts))),
    maeAll: mean(list.map(r => Math.abs(r._model - r.pts))),
    maeOld: mean(list.map(r => Math.abs(r._old - r.pts))),
  });
}

line("=");
console.log(`BACK-TEST · season ${SEASON} · ${rows.length} player-gameweeks · ${per.length} gameweeks`);
console.log("walk-forward: every input comes from rounds < t and from the previous season");
console.log("constants K=8, M=5 were chosen by LOSO WITHOUT this season");
line("=");
console.log(" GW   model   ppg5   oracle  random  |  model-ppg5");
for (const p of per)
  console.log(`  ${String(p.gw).padStart(2)}  ${fmt(p.model, 2)}  ${fmt(p.old, 2)}  `
    + `${fmt(p.oracle, 2)}  ${fmt(p.random, 2)}  |  ${p.model - p.old >= 0 ? "+" : ""}${fmt(p.model - p.old, 2)}`);

const M = mean(per.map(p => p.model)), O = mean(per.map(p => p.old));
const OR = mean(per.map(p => p.oracle)), R = mean(per.map(p => p.random));
line();
console.log("SEASON AVERAGE — realised points of the 15 players each rule picked");
console.log(`  model      ${fmt(M, 3)} points per pick`);
console.log(`  ppg5       ${fmt(O, 3)}   (what the app did before)`);
console.log(`  oracle     ${fmt(OR, 3)}   (the 15 best AFTER the fact — nobody reaches this)`);
console.log(`  random     ${fmt(R, 3)}   (floor)`);
const span = OR - R;
console.log(`  the model closes ${fmt((M - R) / span * 100, 1)}% of the gap from random to oracle;`
  + ` ppg5 closed ${fmt((O - R) / span * 100, 1)}%`);
const wins = per.filter(p => p.model > p.old).length;
console.log(`  model beat ppg5 in ${wins} of ${per.length} gameweeks`);
/* Yfir 15 valda menn og 38 umferdir er thetta thad sem munurinn gerir. */
console.log(`  over a full season that is ${fmt((M - O) * 15 * per.length, 0)} points across `
  + `15 picks x ${per.length} gameweeks`);
OUT.summary = { model: M, old: O, oracle: OR, random: R, wins, gws: per.length };

line();
console.log("HOW BELIEVABLE IS THE NUMBER (mean absolute error, points)");
console.log(`  model, all rows        ${fmt(mean(per.map(p => p.maeAll)), 4)}`);
console.log(`  ppg5,  all rows        ${fmt(mean(per.map(p => p.maeOld)), 4)}`);
console.log(`  model, the 15 it picks ${fmt(mean(per.map(p => p.maeTop)), 4)}`);
OUT.mae = { model: mean(per.map(p => p.maeAll)), old: mean(per.map(p => p.maeOld)),
            top15: mean(per.map(p => p.maeTop)) };

/* ---------- Kvordun: er talan RETT STILLT, ekki bara rett rodud? ---------- */
line();
console.log("CALIBRATION — predicted vs actual, by decile of the prediction");
console.log("  (rows with a positive base only — the rest fall back to ep_next in the app)");
const sorted = rows.filter(r => r._raw > 0).sort((a, b) => a._model - b._model);
const dec = [];
for (let i = 0; i < 10; i++) {
  const a = Math.floor(i * sorted.length / 10), b = Math.floor((i + 1) * sorted.length / 10);
  const sl = sorted.slice(a, b);
  dec.push({ d: i + 1, pred: mean(sl.map(r => r._model)), act: mean(sl.map(r => r.pts)), n: sl.length });
}
console.log("  decile  predicted  actual   gap");
for (const d of dec)
  console.log(`    ${String(d.d).padStart(2)}     ${fmt(d.pred, 2)}      ${fmt(d.act, 2)}   `
    + `${d.pred - d.act >= 0 ? "+" : ""}${fmt(d.pred - d.act, 2)}`);
const mono = dec.every((d, i) => i === 0 || d.act >= dec[i - 1].act - 0.15);
console.log(`  actual points rise with the prediction across deciles: ${mono ? "YES" : "NO"}`);
OUT.deciles = dec;

/* ---------- Bestu og verstu vikur ---------- */
line();
const bySpread = [...per].sort((a, b) => (b.model - b.old) - (a.model - a.old));
console.log("BEST AND WORST WEEKS FOR THE MODEL (against ppg5)");
for (const p of bySpread.slice(0, 3))
  console.log(`  GW${String(p.gw).padStart(2)}  +${fmt(p.model - p.old, 2)}  (model ${fmt(p.model, 2)} vs ${fmt(p.old, 2)})`);
for (const p of bySpread.slice(-3))
  console.log(`  GW${String(p.gw).padStart(2)}  ${fmt(p.model - p.old, 2)}  (model ${fmt(p.model, 2)} vs ${fmt(p.old, 2)})`);

if (argJson > -1) {
  writeFileSync(process.argv[argJson + 1], JSON.stringify(OUT, null, 2));
  console.log(`\nwrote ${process.argv[argJson + 1]}`);
}
