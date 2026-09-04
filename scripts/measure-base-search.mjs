/* ============================================================
   LEITIN AD BESTA GRUNNINUM — SAMA STRANGLEIKI OG `arank-search`
   (4.9.2026, handvirk maelingaskrifta — EKKI i `npm test`)

   Keyrsla:  node scripts/measure-base-search.mjs
             node scripts/measure-base-search.mjs --json /tmp/search.json
             node scripts/measure-base-search.mjs --quick   (faerri afbrigdi)

   ATHUGASEMDIR A ISLENSKU; ALLIR PRENTADIR STRENGIR A ENSKU.

   BEIDNIN (eiganda): „eg vill ad projected points verdi besta og
   nakvaemasta forspain i heimi ... testadu modelid svipad og a-ranking i
   nfl ... buðu til modil og keyrdu svo a alvoru gogn aftur i timann med
   thau timabil sem eru til."

   HVAD `measure-base.mjs` GERDI OG HVAD ThESSI GERIR:
   Su fyrri bar FJORA handvalda grunna. Su er nauðsynleg en ekki nog:
   fjorir frambjodendur sem EG valdi er ekki leit, og „besti" an leitar er
   „besti af theim sem mer datt i hug". Her er LEITARRUM (200 afbrigdi) og
   — thad sem skiptir meira mali — FJOLPROFA-LEIDRETTING, thvi 200
   afbrigdi gefa ~10 „marktaek" af hreinni tilviljun vid p<0,05.

   FJOGUR ATRIDI SEM ERU TEKIN BEINT UR `nfl/scripts/arank-search.mjs`:
     1. NESTED VAL. Afbrigdid er valid a ThJALFUNAR-timabilunum einum og
        MAELT a thvi sem var haldid eftir. Val a ollum gognum er
        valskekkja — NFL-skjolin maeldu hana (32 inntok 5,045 a moti 5,13
        hja thettum lista sem var valinn a ollum gognum).
     2. AKVORDUNIN ER MAELIKVARDINN, ekki `r`. Topp-15 raunstig per umferd
        er thad sem notandinn faer; `r` og MAE eru studningstolur.
     3. TEKNA-PROF A ARUM vid hlidina a t-profi. Afbrigdi sem vinnur ad
        medaltali en tapar i 3 af 5 arum er ekki bæting.
     4. FJOLPROFA-LEIDRETTING (Holm). An hennar er „besta afbrigdid"
        einfaldlega thad heppnasta.

   HEIMURINN: `tests/lib/panel2.mjs` (5 timabil, blonk medtalin), sami
   panell og `measure-base.mjs` og somu inntok og APPID HEFUR fyrir frest.
   Ekkert afbrigdi ma lesa svid sem appid getur ekki reiknad i dag.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPanel } from "../tests/lib/panel2.mjs";
import { bootstrapCI, byPlayer, ci, fmt } from "./start-panel.mjs";
import { lookupPos, POS_MEAN_PTS } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
const OUT = {};
const argJson = process.argv.indexOf("--json");
const QUICK = process.argv.includes("--quick");
const line = (c = "-", n = 78) => console.log(c.repeat(n));
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

/* ---------- Rodin: fortid EIN ---------- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const SEASONS_ALL = Object.keys(PG.seasons);
const past = new Map(), prevSeason = new Map();
for (const [season, list] of Object.entries(PG.seasons)) {
  const agg = {};
  for (const q of list) {
    const a = agg[q[H.name]] ||= { p: 0, m: 0, n: 0 };
    a.p += q[H.pts]; a.m += q[H.mins]; a.n++;
  }
  const nx = SEASONS_ALL[SEASONS_ALL.indexOf(season) + 1];
  if (nx) for (const [nm, a] of Object.entries(agg))
    if (a.n >= 5) prevSeason.set(`${nx}|${nm}`, { pts: a.p, mins: a.m, n: a.n });
  const by = {};
  for (const q of list) (by[q[H.name]] ||= []).push(q);
  for (const [nm, arr] of Object.entries(by)) {
    arr.sort((a, b) => a[H.round] - b[H.round]);
    let p = 0, m = 0, n = 0, st = 0;
    for (const q of arr) {
      past.set(`${season}|${nm}|${q[H.round]}`, { sumPts: p, nApp: n, sumMins: m, sumStarts: st });
      p += q[H.pts]; m += q[H.mins]; n++; st += q[H.starts] >= 1 ? 1 : 0;
    }
  }
}

console.log("building panel ...");
const rows = buildPanel({ minHistory: 1, includeBlanks: true })
  .map(r => ({ ...r, ...(past.get(`${r.season}|${r.name}|${r.round}`) || {}),
               prev: prevSeason.get(`${r.season}|${r.name}`) || null }))
  .filter(r => r.nApp != null);
const SEASONS = [...new Set(rows.map(r => r.season))];
console.log(`rows ${rows.length} · seasons ${SEASONS.join(", ")}`);

/* Stodu-forgildi, LOSO — reiknad UR HINUM timabilunum. */
const posPrior = {};
for (const s of SEASONS) {
  posPrior[s] = {};
  for (const p of ["GK", "DEF", "MID", "FWD"]) {
    const v = rows.filter(r => r.season !== s && r.pos === p).map(r => r.pts);
    posPrior[s][p] = v.length ? mean(v) : 2;
  }
}
/* Fost svid per rod svo innri lykkjan se odyr. */
for (const r of rows) {
  r._posP = posPrior[r.season][r.pos];
  r._mult = lookupPos(r.code, "pts", r.ffdr) / POS_MEAN_PTS[r.code];
  r._prevP90 = r.prev && r.prev.mins > 0 ? r.prev.pts / (r.prev.mins / 90) : null;
  r._prevM90 = r.prev ? r.prev.mins / 90 : 0;
  /* Vaentar minutur — ThRJU SNID SEM APPID HEFUR (player_form.json).   */
  r._mA = r.mins5;                                   // 5-leikja medaltal
  r._mB = Math.max(0, Math.min(90, r.mins5 + r.minsTrend));
  r._mC = r.startRate * 90;                          // byrjunar-hlutfall
  r._mD = 0.5 * (r._mA + r._mC);
}

/* ============================================================
   LEITARRUMID — fjorar asar, oll afbrigdi reiknanleg I APPINU
   ============================================================ */
const KS      = QUICK ? [2, 3, 5]        : [1, 2, 3, 5, 8];
const PRIORMS = QUICK ? [10, Infinity]   : [0, 5, 10, 20, Infinity];
const MINS    = QUICK ? ["A", "C"]       : ["A", "B", "C", "D"];
const UNITS   = ["per90", "perStart"];
const MKEY = { A: "_mA", B: "_mB", C: "_mC", D: "_mD" };

/* prior90 med skrumpudu forgildi: w = prevMin90/(prevMin90 + M).
   M = 0    -> fyrra timabil obreytt (thad sem `shrunkMin` gerir i dag)
   M = Inf  -> stodu-forgildid eitt (fyrra timabil hunsad)              */
/* ============================================================
   FIMMTI ASINN — HVERNIG FORGILDID VERDUR AD „STIGUM PER LEIK"
   (baett vid 4.9.2026 eftir ad formulan var lesin upphátt)

   Fyrsta grindin umbreytti forgildinu med FOSTUM 60 minutum:
   `priorPerMatch = prior90 * (60/90)`. Sa fasti er RETTUR fyrir
   stodu-medaltalid (thad ER stig per rod og rod er ~60 min) en
   KERFISBUNDID RANGUR fyrir leikmann sem spiladi 90 minutur i hverjum
   leik i fyrra — hann er skorinn nidur um thridjung an astaedu.
   Beinni leidin er til: `prevPts / prevMatches` ER stig hans per leik i
   fyrra, engin umbreyting.
   ThETTA ER MAELT, EKKI VALID: badar leidir eru i ristinni.
   ============================================================ */
function priorPerMatchOf(r, M, form) {
  const posPerMatch = r._posP;                       // stig per rod
  if (!r.prev || r._prevM90 <= 0) return posPerMatch;
  const own = form === "perMatch"
    ? r.prev.pts / r.prev.n                          // hans eigin stig/leik
    : (r.prev.pts / r._prevM90) * (REF60 / 90);      // per-90 x fastar 60 min
  if (M === 0) return own;
  if (!Number.isFinite(M)) return posPerMatch;
  const w = r._prevM90 / (r._prevM90 + M);
  return w * own + (1 - w) * posPerMatch;
}
const REF60 = 60;

function prior90Of(r, M) {
  const posP90 = r._posP / (60 / 90);
  if (r._prevP90 == null) return posP90;
  if (M === 0) return r._prevP90;
  if (!Number.isFinite(M)) return posP90;
  const w = r._prevM90 / (r._prevM90 + M);
  return w * r._prevP90 + (1 - w) * posP90;
}
function baseOf(r, v) {
  if (v.unit === "per90") {
    const pr = prior90Of(r, v.M);
    const per90 = (r.sumPts + v.K * pr) / (r.sumMins / 90 + v.K);
    return per90 * (r[MKEY[v.mins]] / 90);
  }
  /* PER LEIK: stig per leik felagsins (blonk medtalin), sinnum hlutfall
     vaentra minutna af vidmidunar-minutum.                             */
  const prPerMatch = priorPerMatchOf(r, v.M, v.priorForm);
  const perApp = (r.sumPts + v.K * prPerMatch) / (r.nApp + v.K);
  return perApp * (r[MKEY[v.mins]] / REF60);
}

const PFORMS = ["per90x60", "perMatch"];
const VARIANTS = [];
for (const K of KS) for (const M of PRIORMS) for (const mins of MINS) for (const unit of UNITS)
  for (const priorForm of (unit === "per90" ? ["per90x60"] : PFORMS))
    VARIANTS.push({ K, M, mins, unit, priorForm,
      id: `K${K}·M${M === Infinity ? "inf" : M}·${mins}·${unit}`
        + (unit === "perStart" && priorForm === "perMatch" ? "·pm" : "") });
console.log(`variants: ${VARIANTS.length}`);

/* ---------- Maelikvardar ---------- */
const gwGroups = (() => {
  const m = new Map();
  for (const r of rows) { const k = `${r.season}|${r.round}`; (m.get(k) || m.set(k, []).get(k)).push(r); }
  return [...m.values()];
})();
const top15 = (list, get) => {
  const s = [...list].sort((a, b) => get(b) - get(a)).slice(0, 15);
  return mean(s.map(r => r.pts));
};
const maeOf = (list, get) => mean(list.map(r => Math.abs(get(r) * r._mult - r.pts)));

/* VIDMIDID: `ppg5` — stadgengill `ep_next` i sogunni (FPL-eigid `xP` er
   reiknad EFTIR A og ma ekki vera vidmid, `tests/xp-contaminated.mjs`). */
const BASE_REF = r => r.ppg5;
const scoreOf = (v) => r => baseOf(r, v);

/* Per UMFERD: topp-15 delta gegn vidmidinu. Paruð maeling.            */
function perGw(v) {
  const g = scoreOf(v);
  return gwGroups.map(list => ({
    season: list[0].season,
    d: top15(list, r => g(r) * r._mult) - top15(list, r => BASE_REF(r) * r._mult),
  }));
}
const bySeason = (arr) => {
  const m = new Map();
  for (const x of arr) (m.get(x.season) || m.set(x.season, []).get(x.season)).push(x.d);
  return [...m.entries()].map(([s, v]) => [s, mean(v)]);
};
/* t-profid er a ARA-medaltolunum (5 sjalfstaed timabil), ekki a
   umferdum — umferdir innan timabils eru ekki sjalfstaedar.           */
function tOnYears(pairs) {
  const v = pairs.map(([, x]) => x), n = v.length, m = mean(v);
  const sd = Math.sqrt(mean(v.map(x => (x - m) ** 2)) * n / Math.max(1, n - 1));
  const se = sd / Math.sqrt(n);
  return { m, t: se ? m / se : 0, n, wins: v.filter(x => x > 0).length };
}
/* Tvihlida p ur t med df = n-1, reiknad ur beta-fallinu (engin dependency). */
function tP(t, df) {
  const x = df / (df + t * t);
  const ib = (a, b, x) => {                       // regularized incomplete beta
    if (x <= 0) return 0; if (x >= 1) return 1;
    const lbeta = lg(a) + lg(b) - lg(a + b);
    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
    let f = 1, c = 1, d = 0;
    for (let i = 0; i <= 200; i++) {
      const m2 = Math.floor(i / 2);
      let num;
      if (i === 0) num = 1;
      else if (i % 2 === 0) num = (m2 * (b - m2) * x) / ((a + 2 * m2 - 1) * (a + 2 * m2));
      else num = -((a + m2) * (a + b + m2) * x) / ((a + 2 * m2) * (a + 2 * m2 + 1));
      d = 1 + num * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
      c = 1 + num / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      const cd = c * d; f *= cd;
      if (Math.abs(1 - cd) < 1e-10) break;
    }
    return front * (f - 1);
  };
  const lg = z => {                               // log-gamma (Lanczos)
    const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012,
      9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lg(1 - z);
    z -= 1; let a = 0.99999999999980993; const t2 = z + 7.5;
    for (let i = 0; i < g.length; i++) a += g[i] / (z + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t2) - t2 + Math.log(a);
  };
  return ib(df / 2, 0.5, x);
}

/* ============================================================
   1. LEITIN — NESTED. Afbrigdid er valid a ThJALFUNAR-timabilunum og
   maelt a thvi sem var haldid eftir. Val a ollum gognum er valskekkja.
   ============================================================ */
line("=");
console.log("1. NESTED SEARCH — variant chosen on training seasons, measured on the held-out one");
line("=");
const cache = new Map();
const pgOf = v => cache.get(v.id) || (cache.set(v.id, perGw(v)), cache.get(v.id));

const nested = [];
for (const hold of SEASONS) {
  let best = null;
  for (const v of VARIANTS) {
    const tr = pgOf(v).filter(x => x.season !== hold);
    const m = mean(tr.map(x => x.d));
    if (!best || m > best.m) best = { v, m };
  }
  const te = pgOf(best.v).filter(x => x.season === hold);
  nested.push({ hold, id: best.v.id, train: best.m, test: mean(te.map(x => x.d)) });
  console.log(`  hold ${hold}: picked ${best.v.id.padEnd(22)} train ${fmt(best.m, 3)} -> HELD-OUT ${fmt(mean(te.map(x => x.d)), 3)}`);
}
const nestedMean = mean(nested.map(x => x.test));
const nestedWins = nested.filter(x => x.test > 0).length;
console.log(`  nested held-out mean d top-15: ${fmt(nestedMean, 3)}  ·  years won ${nestedWins}/${SEASONS.length}`);
OUT.nested = { rows: nested, mean: nestedMean, wins: nestedWins };

/* ============================================================
   2. ALLT LEITARRUMID MED FJOLPROFA-LEIDRETTINGU (Holm)
   ============================================================ */
line();
console.log("2. FULL SPACE — every variant against ppg5, Holm-corrected across the search");
const all = VARIANTS.map(v => {
  const s = tOnYears(bySeason(pgOf(v)));
  return { v, ...s, p: tP(s.t, s.n - 1) };
}).sort((a, b) => b.m - a.m);
/* Holm: raða p-gildum, thröskuldur alfa/(m-i). */
const byP = [...all].sort((a, b) => a.p - b.p);
let holmCut = 0;
for (let i = 0; i < byP.length; i++) {
  if (byP[i].p <= 0.05 / (byP.length - i)) holmCut = i + 1; else break;
}
console.log(`  variants ${all.length} · nominally significant (p<0.05): `
  + `${all.filter(x => x.p < 0.05).length} · SURVIVING HOLM: ${holmCut}`);
console.log("  top 8 by mean d top-15:");
console.log("  variant                 d top15   t      p        years");
for (const x of all.slice(0, 8))
  console.log(`  ${x.v.id.padEnd(22)} ${fmt(x.m, 3)}  ${fmt(x.t, 2)}  ${fmt(x.p, 4)}  ${x.wins}/${x.n}`);
OUT.space = all.map(x => ({ id: x.v.id, m: x.m, t: x.t, p: x.p, wins: x.wins }));
OUT.holm = holmCut;

/* ============================================================
   3. FRAMBJODANDINN — sa sem NESTED valdi oftast, ekki sa sem toppar
   listann (thad vaeri val a ollum gognum aftur).
   ============================================================ */
line();
const votes = {};
for (const n of nested) votes[n.id] = (votes[n.id] || 0) + 1;
const [pickId, pickN] = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
const PICK = VARIANTS.find(v => v.id === pickId);
console.log(`3. CANDIDATE: ${pickId}  (chosen by nested selection in ${pickN}/${SEASONS.length} folds)`);
const pickStat = all.find(x => x.v.id === pickId);
console.log(`   full-sample d top-15 ${fmt(pickStat.m, 3)} · t ${fmt(pickStat.t, 2)} · p ${fmt(pickStat.p, 4)}`
  + ` · years won ${pickStat.wins}/${pickStat.n}`
  + ` · Holm rank ${byP.findIndex(x => x.v.id === pickId) + 1}/${byP.length}`);

/* Núverandi líkan i appinu (K=3, M=0, mins5, per90) til samanburdar. */
/* Modelid sem er i appinu i dag: K8 · M5 · mins5+leitni · per-leik. */
const CUR = VARIANTS.find(v => v.K === 8 && v.M === 5 && v.mins === "B"
  && v.unit === "perStart" && v.priorForm === "per90x60");
if (CUR) {
  const c = all.find(x => x.v.id === CUR.id);
  console.log(`   in-app model (${CUR.id}): d top-15 ${fmt(c.m, 3)} · t ${fmt(c.t, 2)}`
    + ` · p ${fmt(c.p, 4)} · years ${c.wins}/${c.n}`);
  OUT.current = { id: CUR.id, m: c.m, t: c.t, p: c.p, wins: c.wins };
}
OUT.pick = { id: pickId, folds: pickN, ...pickStat, v: PICK };

/* ============================================================
   4. FRAMBJODANDINN GEGN ThVI SEM ER I APPINU — beint einvigi
   med bootstrap, KLASAD PER UMFERD (topp-15) og PER LEIKMANN (MAE).
   ============================================================ */
if (CUR && pickId !== CUR.id) {
  line();
  console.log("4. HEAD-TO-HEAD: candidate vs the model now in the app");
  const gp = scoreOf(PICK), gc = scoreOf(CUR);
  const dT = bootstrapCI(gwGroups, lists => {
    const groups = new Map();
    for (const r of lists) { const k = `${r.season}|${r.round}`; (groups.get(k) || groups.set(k, []).get(k)).push(r); }
    const per = [...groups.values()];
    return mean(per.map(l => top15(l, r => gp(r) * r._mult)))
         - mean(per.map(l => top15(l, r => gc(r) * r._mult)));
  });
  const dM = bootstrapCI(byPlayer(rows, r => r.name),
    rs => maeOf(rs, gp) - maeOf(rs, gc));
  console.log(`   d top-15 ${ci(dT, 3)}`);
  console.log(`   d MAE    ${ci(dM, 4)}   (negative is better)`);
  OUT.h2h = { top15: dT, mae: dM };
} else if (!CUR) {
  line();
  /* TVENNT SEM MA EKKI BERA SAMA SKILABOD: „leitin valdi thad sem er i
     appinu" og „modelid i appinu er EKKI i leitarruminu". Fyrsta utgafan
     prentadi thad fyrra i badum tilfellum — og i `--quick` er M=0 ekki i
     ristinni, svo hun laug um nidurstodu leitarinnar.                  */
  console.log("4. HEAD-TO-HEAD: SKIPPED — the in-app model (K8/M5/B/perStart) is not in "
    + "this grid (run without --quick).");
} else {
  line();
  console.log("4. HEAD-TO-HEAD: the nested search picked the model already in the app.");
}

/* ============================================================
   5. VARUD SEM MA EKKI GLEYMAST — hvad kostar besta afbrigdid a MAE?
   Rodun og truverdugleiki tolunnar eru TVO markmid og their geta
   snuist i sundur (sja `shrunk` a moti `shrunkMin` 4.9.2026).
   ============================================================ */
line();
console.log("5. BOTH OBJECTIVES for the top-5 by top-15 (ranking is not believability)");
console.log("  variant                 d top15   MAE     (lower is better)");
for (const x of all.slice(0, 5)) {
  const g = scoreOf(x.v);
  console.log(`  ${x.v.id.padEnd(22)} ${fmt(x.m, 3)}  ${fmt(maeOf(rows, g), 4)}`);
}
console.log(`  ${"ppg5 (reference)".padEnd(22)} ${fmt(0, 3)}  ${fmt(maeOf(rows, BASE_REF), 4)}`);

/* ============================================================
   5b. STODU-BUNDID K — EIN SPURNING I VIDBOT, EKKI NY RIST
   ============================================================
   Markmenn, varnarmenn og framherjar hafa olika dreifingu, svo ein
   skrumpunar-tala fyrir alla er tilgata en ekki stadreynd. ThETTA ER
   EKKI SETT I RISTINA (5^4 = 625 samsetningar ofan a hana vaeru
   ofurmátun i dulargervi leitar) heldur profad SEM EIN BREYTING a
   sigurvegaranum, med somu nested-adferd: K per stodu er valid a
   thjalfunar-timabilunum og maelt a thvi sem var haldid eftir.
   ============================================================ */
line();
console.log("5b. POSITION-SPECIFIC K — one extra question, chosen nested");
{
  const POS = ["GK", "DEF", "MID", "FWD"];
  const baseVar = PICK;
  const gwOfPos = (v, kByPos) => gwGroups.map(list => ({
    season: list[0].season,
    d: top15(list, r => baseOf(r, { ...v, K: kByPos[r.pos] ?? v.K }) * r._mult)
     - top15(list, r => baseOf(r, v) * r._mult),
  }));
  const folds = [];
  for (const hold of SEASONS) {
    const kBy = {};
    for (const p of POS) {
      let best = { K: baseVar.K, m: 0 };
      for (const K of KS) {
        const trial = { ...kBy, [p]: K };
        const tr = gwOfPos(baseVar, trial).filter(x => x.season !== hold);
        const m = mean(tr.map(x => x.d));
        if (m > best.m) best = { K, m };
      }
      kBy[p] = best.K;
    }
    const te = gwOfPos(baseVar, kBy).filter(x => x.season === hold);
    folds.push({ hold, kBy: { ...kBy }, test: mean(te.map(x => x.d)) });
    console.log(`   hold ${hold}: K ${POS.map(p => `${p}${kBy[p]}`).join(" ")}`
      + ` -> HELD-OUT ${fmt(mean(te.map(x => x.d)), 3)}`);
  }
  const m = mean(folds.map(f => f.test)), wins = folds.filter(f => f.test > 0).length;
  console.log(`   nested held-out gain over a single K: ${fmt(m, 3)} · years won ${wins}/${SEASONS.length}`);
  console.log(`   VERDICT: ${m > 0.05 && wins >= 4 ? "WORTH MEASURING FURTHER"
    : "NOT WORTH IT — a single K stands"}`);
  OUT.posK = { folds, mean: m, wins };
}

/* ============================================================
   5c. FASI B — MARGFALDARINN SJALFUR (4.9.2026)
   ============================================================
   Fasi A leitadi ad GRUNNINUM og helt margfaldaranum fostum. Hann er
   hins vegar HELMINGUR formulunnar og hefur ALDREI verid leitad — hann
   var punkt-maeldur 25.8.2026 (Dtopp-15 +0,175 CI [+0,066, +0,292],
   thad er ad segja „hann ber sitt") en enginn spurdi hvort hann vaeri
   RETT STILLTUR.

   TVEIR ASAR, badir ein tala:
     ALPHA  veldi a margfaldarann: `mult^a`. a = 1 er thad sem er i
            appinu; a > 1 magnar leikjaahrifin, a < 1 daempar thau, og
            **a = 0 er NEIKVAETT VIDMID** — tha er enginn leikjaliður,
            svo hann VERDUR ad tapa ef margfaldarinn ber merki.
     W      blondun grunnsins vid `ppg5` (stadgengill `ep_next`):
            `(1-w)*base + w*ppg5`. Spurningin er hvort FPL-eigin tala
            beri UPPLYSINGAR SEM OKKAR GRUNN VANTAR — t.d. lidsfrettir,
            sem hun uppfaerir en vid lesum ekki. w = 0 er obreytt.

   SAMA ADFERD: nested val, tekna-prof a arum, Holm yfir fasann.
   ============================================================ */
line();
console.log("5c. PHASE B — the multiplier itself (never searched, only spot-measured)");
{
  const ALPHAS = QUICK ? [0, 1, 1.5] : [0, 0.5, 0.75, 1, 1.25, 1.5, 2];
  const WS = QUICK ? [0, 0.3] : [0, 0.15, 0.3, 0.5];
  const BV = [];
  for (const a of ALPHAS) for (const w of WS) BV.push({ a, w, id: `a${a}·w${w}` });
  const gBase = scoreOf(PICK);
  /* `_mult` er summa yfir leiki i `_mult` sjalfum? NEI — hann er EIN
     tala per rod (leikur radarinnar). Veldid er thvi beint a hana.   */
  const sc = v => r => ((1 - v.w) * gBase(r) + v.w * BASE_REF(r)) * Math.pow(r._mult, v.a);
  const perGwB = v => gwGroups.map(list => ({
    season: list[0].season,
    d: top15(list, sc(v)) - top15(list, sc({ a: 1, w: 0 })),
  }));
  const cacheB = new Map();
  const pgB = v => cacheB.get(v.id) || (cacheB.set(v.id, perGwB(v)), cacheB.get(v.id));

  const foldsB = [];
  for (const hold of SEASONS) {
    let best = null;
    for (const v of BV) {
      const m = mean(pgB(v).filter(x => x.season !== hold).map(x => x.d));
      if (!best || m > best.m) best = { v, m };
    }
    const te = mean(pgB(best.v).filter(x => x.season === hold).map(x => x.d));
    foldsB.push({ hold, id: best.v.id, test: te });
    console.log(`   hold ${hold}: picked ${best.v.id.padEnd(12)} -> HELD-OUT ${fmt(te, 3)}`);
  }
  const mB = mean(foldsB.map(f => f.test)), wB = foldsB.filter(f => f.test > 0).length;
  console.log(`   nested held-out gain over the current multiplier: ${fmt(mB, 3)}`
    + ` · years won ${wB}/${SEASONS.length}`);

  const allB = BV.map(v => {
    const st = tOnYears(bySeason(pgB(v)));
    return { v, ...st, p: tP(st.t, st.n - 1) };
  }).sort((a, b) => b.m - a.m);
  console.log("   grid (d top-15 against alpha=1, w=0):");
  console.log("   variant       d top15   t       p        years   MAE");
  for (const x of allB) {
    const mae = maeOf(rows, r => ((1 - x.v.w) * gBase(r) + x.v.w * BASE_REF(r))
      * Math.pow(r._mult, x.v.a) / r._mult);   // MAE ber margfaldarann sjalf
    console.log(`   ${x.v.id.padEnd(12)} ${fmt(x.m, 3)}  ${fmt(x.t, 2)}  ${fmt(x.p, 4)}`
      + `  ${x.wins}/${x.n}   ${fmt(mae, 4)}`);
  }
  /* NEIKVAEDA VIDMIDID INNAN FASANS: a = 0 (enginn leikjalidur).      */
  const zero = allB.find(x => x.v.a === 0 && x.v.w === 0);
  console.log(`   CONTROL alpha=0 (no fixture term at all): ${fmt(zero.m, 3)}`
    + `  — must be clearly negative if the multiplier carries signal`);
  const winner = foldsB[0] && foldsB.every(f => f.id === foldsB[0].id) ? foldsB[0].id : null;
  console.log(`   VERDICT: ${mB > 0.05 && wB >= 4
    ? `CHANGE INDICATED${winner ? ` (${winner}, unanimous)` : ""}`
    : "NO CHANGE — the multiplier as it stands is not beaten"}`);
  OUT.phaseB = { folds: foldsB, mean: mB, wins: wB,
    grid: allB.map(x => ({ id: x.v.id, m: x.m, t: x.t, p: x.p, wins: x.wins })) };
}

/* ============================================================
   5d. FASI C — BAETIR NOKKUD OFAN A GODAN GRUNN? (4.9.2026)
   ============================================================
   Stora stigalikans-maelingin 25.8.2026 felldi sex merki — EN HUN
   PROFADI ThAU OFAN A `ppg5`-GRUNNI, sem var einmitt grunnurinn sem
   reyndist vondur. Spurningin „baetir xGI vid?" er thvi EKKI sama
   spurning nuna: merki sem drukknar i vondum grunni getur birst i
   godum, og merki sem SYNDIST hjalpa getur horfid.

   Hvert merki er profad sem MJUKUR HALLI a grunninn:
       skor = base * (1 + c * z(merki)) * margfaldari
   thar sem `z` er stadlad innan STODU (annars maelist adeins ad
   framherjar skora meira en markmenn). c > 0 og c < 0 eru badir i
   ristinni — merki sem hjalpar i RANGA att er suð, ekki merki.

   NESTED VAL og Holm yfir fasann. Ekkert er tekið upp nema thad vinni
   held-out og i minnst 4 arum af 5.
   ============================================================ */
line();
console.log("5d. PHASE C — does anything add ON TOP of a good base?");
{
  const FEATS = ["xgi90", "bps90", "threat90", "bonusRate", "dc90", "csRate5",
                 "hauls", "own", "minsTrend", "startRate"];
  /* Stadlad INNAN STODU — annars maelist stodumunur, ekki merkid.     */
  const zOf = {};
  for (const f of FEATS) {
    const byPos = {};
    for (const r of rows) (byPos[r.pos] ||= []).push(Number(r[f]) || 0);
    const mu = {}, sd = {};
    for (const [k, v] of Object.entries(byPos)) {
      mu[k] = mean(v);
      sd[k] = Math.sqrt(mean(v.map(x => (x - mu[k]) ** 2))) || 1;
    }
    zOf[f] = r => ((Number(r[f]) || 0) - mu[r.pos]) / sd[r.pos];
  }
  const CS = QUICK ? [-0.1, 0.1] : [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2];
  const CV = [];
  for (const f of FEATS) for (const c of CS) CV.push({ f, c, id: `${f}${c > 0 ? "+" : ""}${c}` });
  const gBase = scoreOf(PICK);
  const ref = r => gBase(r) * r._mult;
  const sc = v => r => gBase(r) * (1 + v.c * zOf[v.f](r)) * r._mult;
  const perGwC = v => gwGroups.map(list => ({
    season: list[0].season, d: top15(list, sc(v)) - top15(list, ref),
  }));
  const cacheC = new Map();
  const pgC = v => cacheC.get(v.id) || (cacheC.set(v.id, perGwC(v)), cacheC.get(v.id));

  const foldsC = [];
  for (const hold of SEASONS) {
    let best = null;
    for (const v of CV) {
      const m = mean(pgC(v).filter(x => x.season !== hold).map(x => x.d));
      if (!best || m > best.m) best = { v, m };
    }
    const te = mean(pgC(best.v).filter(x => x.season === hold).map(x => x.d));
    foldsC.push({ hold, id: best.v.id, test: te });
    console.log(`   hold ${hold}: picked ${best.v.id.padEnd(14)} -> HELD-OUT ${fmt(te, 3)}`);
  }
  const mC = mean(foldsC.map(f => f.test)), wC = foldsC.filter(f => f.test > 0).length;
  console.log(`   nested held-out gain over the base alone: ${fmt(mC, 3)}`
    + ` · years won ${wC}/${SEASONS.length}`);

  const allC = CV.map(v => {
    const st = tOnYears(bySeason(pgC(v)));
    return { v, ...st, p: tP(st.t, st.n - 1) };
  }).sort((a, b) => b.m - a.m);
  const byPC = [...allC].sort((a, b) => a.p - b.p);
  let holmC = 0;
  for (let i = 0; i < byPC.length; i++) {
    if (byPC[i].p <= 0.05 / (byPC.length - i)) holmC = i + 1; else break;
  }
  console.log(`   ${allC.length} tilts · nominally significant ${allC.filter(x => x.p < 0.05).length}`
    + ` · SURVIVING HOLM ${holmC}`);
  console.log("   top 6:");
  console.log("   tilt            d top15   t       p        years");
  for (const x of allC.slice(0, 6))
    console.log(`   ${x.v.id.padEnd(14)} ${fmt(x.m, 3)}  ${fmt(x.t, 2)}  ${fmt(x.p, 4)}  ${x.wins}/${x.n}`);
  console.log(`   VERDICT: ${mC > 0.05 && wC >= 4
    ? "SOMETHING ADDS — investigate"
    : "NOTHING ADDS — the base already carries it"}`);
  OUT.phaseC = { folds: foldsC, mean: mC, wins: wC, holm: holmC,
    grid: allC.map(x => ({ id: x.v.id, m: x.m, t: x.t, p: x.p, wins: x.wins })) };
}

/* ============================================================
   5e. FASI D — KVORDUN TOLUNNAR (4.9.2026)
   ============================================================
   BAKPROFID A 2025/26 (`scripts/backtest-season.mjs`) syndi tvennt i
   einu: likanid RADAR betur (4,53 stig per val a moti 4,11) EN TALAN ER
   SKOKK I EFSTA TIUNDARHLUTANUM — spad 5,46, raunverulegt 3,84,
   **+1,61 of hatt**. Nionda tiundin er hins vegar nakvaem (3,01 a moti
   2,96), svo skekkjan er ekki fasti heldur ThJOPPUN: likanid teygir
   toppinn.

   ThETTA ER NAKVAEMLEGA UPPRUNALEGA KAERAN I NYRRI MYND — „thad er
   ekkert ad marka thau" — thvi efsti tiundarhlutinn ER lidid hans.

   MEKANISMINN ER SKILJANLEGUR: `perMatch x (vaentar minutur / 60)`
   margfaldar stig-per-leik sem BER ThEGAR minutur mannsins. Fyrir mann
   sem spilar 90 minutur er thad x1,5 ofan a tolu sem innihelt 90
   minuturnar. Leitin valdi thad thvi ThAD BAETIR RODUN — en rodun og
   staerd eru tvo ólik storf (sama laerdomur og `rankScore` a moti
   `score`, CLAUDE.md kafli 3).

   LAUSNIN MA ThVI EKKI HREYFA RODUNINA. Einraen umbreyting (`a + b*x`
   med b > 0, eda `c*x^g` med g > 0) skilar NAKVAEMLEGA somu rod, svo
   allar topp-15 maelingar standa obreyttar med byggingu — og MAE ma
   batna. Fittad a ThJALFUNAR-timabilunum, maelt a thvi sem er haldid
   eftir.
   ============================================================ */
line();
console.log("5d/e. PHASE D — recalibrating the LEVEL without touching the ORDER");
{
  /* ============================================================
     MAE ER RANGUR MAELIKVARDI A ThESSA SPURNINGU — OG ThAD KOSTADI
     MIG TVAER UTGAFUR AD SJA ThAD (4.9.2026)
     ============================================================
     Fyrsta utgafan fittadi minnstu kvadrot og MAE VERSNADI i 5 ar af 5.
     Onnur utgafan fittadi thvi a MAE og hun BATNADI i 5 ar af 5 — en
     rist-leitin rak i g -> 0 og b -> jadar, og thegar yfirbordid var
     prentad var thad FLATT ALLA LEID NIDUR.

     ThAD VAR VISBENDING, EKKI SIGUR. `x^g` med g -> 0 stefnir a FASTA,
     og MAE a dreifingu thar sem 60% radanna eru NULL er minnkud med thvi
     ad spa naerri MIDGILDINU — sem er null. „Kvordunin" var thvi a leid
     i „spadu ollum lagt", sem er nakvaemlega ONYT spa.

     VAENT STIG ERU LOGD SAMAN YFIR 11 MENN. Staerdin sem skiptir mali er
     thvi MEDALTALID (ohlutdraegni), ekki midgildid. Rettur maelikvardi
     er SKEKKJA PER TIUNDARHLUT: er spadid medaltal jafnt raunverulegu
     medaltali i hverjum hluta? Bakprofid a 2025/26 syndi +1,61 i efsta
     tiundarhlutanum — ThAD er gallinn sem a ad laga.
     MAE er PRENTAD afram, en thad er STUDNINGSTALA, ekki markmid.
     ============================================================ */
  const gBase = scoreOf(PICK);
  const raw = r => gBase(r) * r._mult;
  const maeOn = (rs, f) => mean(rs.map(r => Math.abs(f(r) - r.pts)));
  /* SKEKKJA PER TIUNDARHLUT — medaltal spar a moti medaltali raunar. */
  const decBias = (rs, f) => {
    const srt = [...rs].sort((a, b) => f(a) - f(b));
    const gaps = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.floor(i * srt.length / 10), b = Math.floor((i + 1) * srt.length / 10);
      const sl = srt.slice(a, b);
      if (sl.length) gaps.push(mean(sl.map(f)) - mean(sl.map(r => r.pts)));
    }
    return { mean: mean(gaps.map(Math.abs)), top: gaps[gaps.length - 1], gaps };
  };
  const GS = QUICK ? [1, 0.8] : [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];
  const t15 = rs => {
    const m = new Map();
    for (const r of rs) { const k = `${r.season}|${r.round}`; (m.get(k) || m.set(k, []).get(k)).push(r); }
    return mean([...m.values()].map(l => top15(l, raw)));
  };

  /* ============================================================
     FITTAD A ThEIM RODUM ThAR SEM HUN GILDIR I RAUN (4.9.2026)
     ============================================================
     `expPointsFor` beitir kvordun ADEINS thegar maeldi grunnurinn er
     jakvaedur; se hann 0 (madurinn hefur engar minutur) fellur appid a
     `ep_next`. Fyrsta utgafa fasans fittadi hins vegar a OLLUM rodum,
     og 60% theirra bera grunn upp a nakvaemlega 0 — radir sem fa
     ALDREI thessa kvordun i appinu.
     Sama villa og profid sem sendi ekki `player_seasons.json`:
     MAELINGIN MAELDI ANNAN HEIM EN KEYRSLAN. Laugin er thvi skorðud vid
     `raw > 0`, sem er nakvaemlega hlidid i `expPointsFor`.
     ============================================================ */
  const live = rows.filter(r => raw(r) > 0);
  console.log(`   pool: ${live.length} of ${rows.length} rows carry a positive base `
    + `(the rest fall back to ep_next in the app and are never calibrated)`);
  const foldsD = [];
  for (const hold of SEASONS) {
    const tr = live.filter(r => r.season !== hold), te = live.filter(r => r.season === hold);
    /* `g` valid a ThJALFUN eftir tiundarhluta-skekkju; `a, b` fittud med
       minnstu kvadrotum, sem er retta taekid fyrir MEDALTAL.          */
    let best = null;
    for (const g of GS) {
      const pw = r => Math.pow(Math.max(0, raw(r)), g);
      const xs = tr.map(pw), ys = tr.map(r => r.pts);
      const mx = mean(xs), my = mean(ys);
      let sxy = 0, sxx = 0;
      for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
      const b = sxx ? sxy / sxx : 1, a = my - b * mx;
      const f = r => Math.max(0, a + b * pw(r));
      const bias = decBias(tr, f).mean;
      if (!best || bias < best.bias) best = { g, a, b, bias };
    }
    const cal = r => Math.max(0, best.a + best.b * Math.pow(Math.max(0, raw(r)), best.g));
    const b0 = decBias(te, raw), b1 = decBias(te, cal);
    foldsD.push({ hold, g: best.g, a: best.a, b: best.b,
      biasBefore: b0.mean, biasAfter: b1.mean, topBefore: b0.top, topAfter: b1.top,
      maeBefore: maeOn(te, raw), maeAfter: maeOn(te, cal) });
    console.log(`   hold ${hold}: g=${best.g} a=${fmt(best.a, 3)} b=${fmt(best.b, 3)}`
      + ` | decile bias ${fmt(b0.mean, 3)} -> ${fmt(b1.mean, 3)}`
      + ` · TOP decile ${fmt(b0.top, 2)} -> ${fmt(b1.top, 2)}`
      + ` · MAE ${fmt(maeOn(te, raw), 3)} -> ${fmt(maeOn(te, cal), 3)}`);
  }
  const dB = mean(foldsD.map(f => f.biasAfter - f.biasBefore));
  const better = foldsD.filter(f => f.biasAfter < f.biasBefore).length;
  const dTop = mean(foldsD.map(f => Math.abs(f.topAfter) - Math.abs(f.topBefore)));
  const dMae = mean(foldsD.map(f => f.maeAfter - f.maeBefore));
  console.log(`   nested held-out: decile bias ${fmt(dB, 4)} (better in ${better}/${SEASONS.length})`
    + ` · TOP-decile |bias| ${fmt(dTop, 4)} · MAE ${fmt(dMae, 4)} (support only)`);
  const f0 = foldsD[0];
  const cal0 = r => Math.max(0, f0.a + f0.b * Math.pow(Math.max(0, raw(r)), f0.g));
  const sample = live.slice(0, 4000);
  const orderSame = sample.every((r, i) => i === 0
    || (raw(sample[i - 1]) <= raw(r)) === (cal0(sample[i - 1]) <= cal0(r)));
  console.log(`   monotone (order untouched, ${sample.length} rows): ${orderSame ? "YES" : "NO"}`);
  console.log(`   top-15 ${fmt(t15(rows), 3)} — unchanged by construction`);
  console.log(`   VERDICT: ${dB < -0.02 && better >= 4 && orderSame
    ? "CALIBRATE — the number matches reality better and the ranking does not move"
    : "NO CHANGE"}`);
  OUT.phaseD = { folds: foldsD, dBias: dB, better, dTop, dMae, monotone: orderSame };
}

/* ============================================================
   6. NEIKVAETT VIDMID — GETUR ThESSI GRIND YFIRLEITT TAPAD?
   ============================================================
   Leit sem skilar „bæting" i 143 af 200 afbrigdum a ad vekja grun um
   grindina sjalfa adur en hun vekur gledi. Tvo vidmid sem VERDA ad
   tapa, annars maelir hun ekkert:
     · SNUID skor (mínus grunnurinn) — a ad vera stórtap,
     · HREINT SUD (fast gildi per rod) — a ad vera tap.
   Sama hlutverk og orakel-thakid i `rank-model.mjs`, bara hinum megin.
   ============================================================ */
line();
console.log("6. NEGATIVE CONTROLS — the harness must be able to lose");
{
  const inv = { ...PICK, id: "INVERTED" };
  const gInv = r => -baseOf(r, PICK);
  const dInv = mean(bySeason(gwGroups.map(list => ({
    season: list[0].season,
    d: top15(list, r => gInv(r) * r._mult) - top15(list, r => BASE_REF(r) * r._mult),
  }))).map(([, x]) => x));
  console.log(`   inverted candidate      d top-15 ${fmt(dInv, 3)}  (must be strongly negative)`);
  const dFlat = mean(bySeason(gwGroups.map(list => ({
    season: list[0].season,
    d: top15(list, () => 1) - top15(list, r => BASE_REF(r) * r._mult),
  }))).map(([, x]) => x));
  console.log(`   constant score          d top-15 ${fmt(dFlat, 3)}  (must be strongly negative)`);
  OUT.controls = { inverted: dInv, flat: dFlat };
  if (!(dInv < -0.5 && dFlat < -0.5))
    console.log("   *** WARNING: a control did NOT lose — the harness is not measuring what it claims");
}

if (argJson > -1) {
  writeFileSync(process.argv[argJson + 1], JSON.stringify(OUT, null, 2));
  console.log(`\nwrote ${process.argv[argJson + 1]}`);
}
