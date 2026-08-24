/* ============================================================
   MEASURE-PREV-K — HVENAER HEFUR YFIRSTANDANDI TIMABIL SAGT MEIRA
   EN THAD FYRRA?

   EKKI I `npm test`, EKKI I PIPELINE. Keyrsla:
       node scripts/measure-prev-k.mjs            (~40 s, deterministisk)
       node scripts/measure-prev-k.mjs --json <slod>

   SPURNINGIN. FFDR tekur lidsstyrk ur FYRRA timabili og blandar hann
   vid yfirstandandi timabil med vog `w_prev = K/(n+K)` (PREV_K = 10 i
   `src/model.js`, maelt 28.7.2026). Thad er RETT ad hafa slika blondu,
   en threnn spurning var aldrei maeld:

     A. Er K=10 rett tala thegar hun er maeld med VIKMORKUM? Fyrri
        maelingin gaf toflu an CI og hamarkid var sagt "flatt (k=10-40)".
        Flatt hamark an CI er ekki maeling heldur myndlysing.
     B. Er FORMID k/(n+K) rett? Ein K thydir ad vogin falli eftir
        akvedinni sveigju. Ef besta vogin per n fylgir ekki theirri
        sveigju er einn fasti rangt lykkjuform, ekki rong tala.
     C. Blandast SKOT A MARK lika? `src/model.js` blandar thau
        (`mixMe(me.sotAg, me.prevSotAg)`) og `data/team_form.json` BER
        `prev.sot_pg` / `prev.sot_against_pg` — en vordurinn
        `tests/form-blend.mjs` blandar THAU EKKI og segir i athugasemd ad
        their seu ekki til. Vordurinn maelir thvi VEIKARA likan en thad
        sem er i notkun. Thad er maelt her.

   HVERS VEGNA THETTA ER EKKI "FORM". "Heitur leikmadur" er maeldur og
   hrakinn (CLAUDE.md kafli 4, 6c: −4,52pp eftir mark, t=−5,26) og hrein
   blod lida radast ekki i runur (lyfting 0,99). Her er ENGU spad um
   straeti — adeins spurt hversu mikid a ad TRUA litlu urtaki af
   yfirstandandi timabili gegn heilu fyrra timabili. Thad er Bayes-
   afturvirkni, ekki runa.

   ENGINN LEKI. `cur` fyrir leik nr. i notar AÐEINS leiki lidsins sem
   voru bunir fyrir hann; `prev` er heilt fyrra timabil; Elo er
   fyrir-leik ClubElo/nalgun; bokmakaralinan er fyrir-leik. Heimurinn er
   byggdur ur `tests/lib/e0.mjs` — SOMU uppbyggingu og oll hin bakprofin
   (CLAUDE.md: ein uppbygging a einum stad).

   TOLFRAEDIN. Bootstrap klasad per TIMABILI (14 klasar a lidsmarkinu,
   5 a stigunum) OG per LID-TIMABILI (280 / 100 klasar) — bædi eru birt
   thvi 5 klasar gefa svo breid vikmork ad their gaetu falid raunverulegt
   merki, og 280 klasar gaetu ofmetid thad. Fast frae (mulberry32, seed 7)
   ur `scripts/start-panel.mjs`, 400 itranir — SAMA vel og
   `measure-defcon-ffdr.mjs`. Ekkert endurritad.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloWalkForward, corr,
} from "../tests/lib/e0.mjs";
import { makeFixDifficulty, PREV_K, prevWeight } from "../src/model.js";
import { bootstrapCI, fmt } from "./start-panel.mjs";

const D = new URL("../data/", import.meta.url).pathname;
const ARGJSON = (() => { const i = process.argv.indexOf("--json"); return i > 0 ? process.argv[i + 1] : null; })();
const OUT = { generated: new Date().toISOString(), prev_k_live: PREV_K };
const line = (n = 78) => console.log("-".repeat(n));
const head = t => { console.log(`\n${"=".repeat(78)}\n${t}\n${"=".repeat(78)}`); };

/* ============================================================
   1. HEIMURINN — ein rod per lid-leik, bædi styrkirnir
   ============================================================ */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const PRED = SEASONS.slice(1);
const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };

const rows = [];
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prevRows = byKey[SEASONS[si - 1]];
  const list = [...byKey[key]].sort((a, b) => e0Day(a.Date).localeCompare(e0Day(b.Date)));
  const prevStr = buildStrength(prevRows);
  const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!prevStr[t]) prevStr[t] = { ...PROMO_DEFAULT };
  const run = {};
  for (const t of teams) run[t] = { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
  const curOf = t => {
    const a = run[t];
    return a.n === 0 ? null
      : { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n, n: a.n };
  };
  const idx = {}; let nn = 1;
  for (const t of teams) idx[t] = nn++;
  const origIdx = new Map(byKey[key].map((r, i) => [r, i]));
  const FDR = fdrFor(key, prevRows);
  for (const r of list) {
    const e = eloPre.get(`${key}|${origIdx.get(r)}`);
    const mk = marketForRow(r);
    const p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
    for (const [team, opTeam, home, gc, gf, fdr] of [
      [r.HomeTeam, r.AwayTeam, true, +r.FTAG, +r.FTHG, p.h],
      [r.AwayTeam, r.HomeTeam, false, +r.FTHG, +r.FTAG, p.a],
    ]) {
      rows.push({
        season: key, date: r.Date, team, opTeam, home, gc, gf, fdr,
        cs: gc === 0, n: run[team].n, nOpp: run[opTeam].n,
        prevMe: prevStr[team], prevOp: prevStr[opTeam],
        curMe: curOf(team), curOp: curOf(opTeam),
        elo: { me: home ? e.h : e.a, op: home ? e.a : e.h },
        mk: mk ? (home ? { xga: mk.axg, xg: mk.hxg } : { xga: mk.hxg, xg: mk.axg }) : null,
        ids: { me: idx[team], op: idx[opTeam] },
      });
    }
    const hs = run[r.HomeTeam], as = run[r.AwayTeam];
    hs.g += +r.FTHG; hs.c += +r.FTAG; hs.sf += +(r.HST || 0); hs.sa += +(r.AST || 0); hs.n++;
    as.g += +r.FTAG; as.c += +r.FTHG; as.sf += +(r.AST || 0); as.sa += +(r.HST || 0); as.n++;
  }
}

head(`WORLD - ${rows.length} team-matches, ${PRED.length} predicted seasons (${PRED[0]}-${PRED.at(-1)})`);
const nGap = rows.reduce((a, r) => Math.max(a, Math.abs(r.n - r.nOpp)), 0);
console.log(`  widest gap between n(me) and n(opp): ${nGap} matches  (postponed fixtures)`);
console.log(`  rows with no bookmaker line: ${rows.filter(r => !r.mk).length}`);
OUT.rows = rows.length; OUT.seasons = PRED;

/* ============================================================
   2. FFDR FYRIR GEFNA BLONDUNARREGLU

   `wRule(n)` skilar vog fyrra timabils. Tvaer notkanir:
     · K-reglan:      n => K/(n+K)      (thad sem model.js gerir)
     · FAST w:        () => w           (til ad kortleggja bestu vog per n)

   `blendSot` er SER FANI thvi thad er spurning C: model.js blandar skot
   a mark en `tests/form-blend.mjs` gerir thad ekki.
   ============================================================ */
function ffdrFor(wRule, { withMarket = false, blendSot = true } = {}) {
  const def = new Array(rows.length), att = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const blend = (cur, prev, n) => {
      if (cur == null) return prev;                       // fyrsti leikur: adeins prev
      const w = wRule(n);
      if (w <= 0) return cur;
      if (w >= 1) return prev;
      const mixV = (c, p) => (p == null || !Number.isFinite(p)) ? c : (1 - w) * c + w * p;
      return {
        xg90: mixV(cur.xg90, prev.xg90),
        xgc90: mixV(cur.xgc90, prev.xgc90),
        sotFor: blendSot ? mixV(cur.sotFor, prev.sotFor) : cur.sotFor,
        sotAg: blendSot ? mixV(cur.sotAg, prev.sotAg) : cur.sotAg,
      };
    };
    const me = blend(r.curMe, r.prevMe, r.n);
    const op = blend(r.curOp, r.prevOp, r.nOpp);
    const teamMetrics = { [r.ids.me]: me, [r.ids.op]: op };
    const teamById = { [r.ids.me]: { short: r.team }, [r.ids.op]: { short: r.opTeam } };
    const eloByTeam = { [r.ids.me]: { elo: r.elo.me }, [r.ids.op]: { elo: r.elo.op } };
    const kickoff = `${r.date}T00:00:00Z`;
    const odds = (withMarket && r.mk)
      ? { [r.team]: { xga: r.mk.xga, xg: r.mk.xg, opp: r.opTeam, kickoff } } : null;
    const f = makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam });
    const fx = { opp: r.ids.op, home: r.home, fdr: r.fdr, kickoff };
    def[i] = f(r.ids.me, fx, 2);
    att[i] = f(r.ids.me, fx, 4);
  }
  return { def, att };
}
const kRule = K => (K === Infinity ? () => 1 : K <= 0 ? () => 0 : n => K / (n + K));
const wRuleConst = w => () => w;

/* ============================================================
   3. MARKMIDIN
   ============================================================ */
const gcArr = rows.map(r => r.gc), gfArr = rows.map(r => r.gf);

/* --- 3a. Raunveruleg stig leikmanna (MARKMIDID SEM RAEDUR) --- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const HD = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const POSN = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
const rowIdx = new Map();
rows.forEach((r, i) => rowIdx.set(`${r.season}|${r.date}|${r.team}`, i));
const pl = [];
for (const [season, list] of Object.entries(PG.seasons))
  for (const r of list) {
    if (r[HD.starts] < 1 || r[HD.mins] < 60) continue;
    const i = rowIdx.get(`${season}|${r[HD.date]}|${r[HD.team]}`);
    if (i == null) continue;
    const pos = r[HD.pos] === "GKP" ? "GK" : r[HD.pos];
    if (!POSN[pos]) continue;
    pl.push({ i, season, team: r[HD.team], pos, arr: POSN[pos] <= 2 ? "def" : "att",
              pts: r[HD.pts], n: rows[i].n });
  }
const PL_SEASONS = [...new Set(pl.map(x => x.season))].sort();
console.log(`  player-gameweeks (started, 60 min or more): ${pl.length} over ${PL_SEASONS.length} seasons`);
OUT.player_rows = pl.length; OUT.player_seasons = PL_SEASONS;

/* VEGID |r| GEGN RAUNSTIGUM — sami maelikvardi og sjounda-threps-maelingin
   (CLAUDE.md kafli 4, 9.8.2026): |r| per stodu, vegid med n. Formerkid er
   thekkt (thyngri leikur -> faerri stig), svo |r| er rett samlagning.     */
function playerScore(F, subset = pl) {
  let num = 0, den = 0;
  for (const pos of Object.keys(POSN)) {
    const g = subset.filter(x => x.pos === pos);
    if (g.length < 100) continue;
    const r = corr(g.map(x => F[x.arr][x.i]), g.map(x => x.pts));
    if (!Number.isFinite(r)) continue;
    num += g.length * Math.abs(r); den += g.length;
  }
  return den ? num / den : NaN;
}
function playerPerPos(F, subset = pl) {
  const out = {};
  for (const pos of Object.keys(POSN)) {
    const g = subset.filter(x => x.pos === pos);
    out[pos] = g.length < 100 ? null
      : { n: g.length, r: corr(g.map(x => F[x.arr][x.i]), g.map(x => x.pts)) };
  }
  return out;
}

/* ============================================================
   4. SPURNING C FYRST — BLANDAST SKOT A MARK?
   Ef svarid er ja er allt sem a eftir kemur maelt a rettu likani; ef nei
   er vordurinn `form-blend.mjs` ad maela annad likan en er i notkun og
   thad er sjalfstaett vandamal.
   ============================================================ */
head("C. ARE SHOTS ON TARGET BLENDED? (model.js does; form-blend.mjs did NOT until 24 Aug 2026)");
const tf = JSON.parse(readFileSync(`${D}team_form.json`, "utf8")).teams;
const withPrevSot = Object.values(tf).filter(t => t.prev && t.prev.sot_pg != null).length;
console.log(`  data/team_form.json: ${withPrevSot}/${Object.keys(tf).length} lid bera prev.sot_pg`);
const sotOn = ffdrFor(kRule(PREV_K), { blendSot: true });
const sotOff = ffdrFor(kRule(PREV_K), { blendSot: false });
{
  const a = corr(sotOn.def, gcArr), b = corr(sotOff.def, gcArr);
  const pa = playerScore(sotOn), pb = playerScore(sotOff);
  console.log(`  r(mork a sig)  blandad sot ${a.toFixed(4)}  ·  obland ${b.toFixed(4)}  ·  delta ${(a - b >= 0 ? "+" : "") + (a - b).toFixed(4)}`);
  console.log(`  vegid |r| stig blandad sot ${pa.toFixed(4)}  ·  obland ${pb.toFixed(4)}  ·  delta ${(pa - pb >= 0 ? "+" : "") + (pa - pb).toFixed(4)}`);
  OUT.sot_blend = { r_gc_on: a, r_gc_off: b, pts_on: pa, pts_off: pb };
}

/* ============================================================
   5. SPURNING A — K-RIST MED VIKMORKUM
   ============================================================ */
const KGRID = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 60, 100, Infinity];
const FBY = new Map();
for (const K of KGRID) FBY.set(K, ffdrFor(kRule(K), { blendSot: true }));
const FMKT = new Map();
for (const K of [0, 10, 20, Infinity]) FMKT.set(K, ffdrFor(kRule(K), { withMarket: true, blendSot: true }));

head("A. K GRID - THE CORE (no market; applies to ALL gameweeks except the nextu)");
console.log("  K        r(goals conceded)  |r|(goals scored)  weighted |r| POINTS   GW1-6 vorn");
line();
const early = rows.map((r, i) => (r.n <= 5 ? i : -1)).filter(i => i >= 0);
const earlyPl = pl.filter(x => x.n <= 5);
const grid = [];
for (const K of KGRID) {
  const F = FBY.get(K);
  const rGc = corr(F.def, gcArr);
  const rGf = Math.abs(corr(F.att, gfArr));
  const ps = playerScore(F);
  const rEarly = corr(early.map(i => F.def[i]), early.map(i => gcArr[i]));
  grid.push({ K, rGc, rGf, ps, rEarly });
  const tag = K === PREV_K ? "  <- i notkun" : "";
  console.log(`  ${String(K === Infinity ? "inf" : K).padStart(4)}     ${rGc.toFixed(4)}         ${rGf.toFixed(4)}` +
    `           ${ps.toFixed(4)}         ${rEarly.toFixed(4)}${tag}`);
}
OUT.grid = grid;
const argmax = (key) => grid.reduce((a, b) => (b[key] > a[key] ? b : a)).K;
console.log(`\n  hamark: mork a sig K=${argmax("rGc")}  ·  mork skorud K=${argmax("rGf")}  ·  STIG K=${argmax("ps")}  ·  GW1-6 K=${argmax("rEarly")}`);
OUT.argmax = { gc: argmax("rGc"), gf: argmax("rGf"), pts: argmax("ps"), early: argmax("rEarly") };

/* ---- BOOTSTRAP: DELTA GEGN K=10, KLASAD ---- */
const clustersBy = (items, keyFn) => {
  const m = new Map();
  for (const x of items) { const k = keyFn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return [...m.values()];
};
const teamRowsIdx = rows.map((r, i) => ({ i, season: r.season, team: r.team }));
const CL_SEASON = clustersBy(teamRowsIdx, x => x.season);
const CL_TEAMSEASON = clustersBy(teamRowsIdx, x => `${x.season}|${x.team}`);
const PL_SEASON = clustersBy(pl, x => x.season);
const PL_TEAMSEASON = clustersBy(pl, x => `${x.season}|${x.team}`);

const dGc = (Fa, Fb) => sub => corr(sub.map(x => Fa.def[x.i]), sub.map(x => gcArr[x.i]))
                              - corr(sub.map(x => Fb.def[x.i]), sub.map(x => gcArr[x.i]));
const dPts = (Fa, Fb) => sub => playerScore(Fa, sub) - playerScore(Fb, sub);

head(`A2. VIKMORK A DELTA GEGN K=${PREV_K} (400 itranir, fast frae, klasad)`);
console.log("  delta > 0 = better than K=10.  The bar is that the CI EXCLUDES ZERO.");
const BASE = FBY.get(PREV_K);
const ciRows = [];
for (const K of [0, 5, 15, 20, 30, 40, Infinity]) {
  const F = FBY.get(K);
  const g1 = bootstrapCI(CL_SEASON, dGc(F, BASE));
  const g2 = bootstrapCI(CL_TEAMSEASON, dGc(F, BASE));
  const p1 = bootstrapCI(PL_SEASON, dPts(F, BASE));
  const p2 = bootstrapCI(PL_TEAMSEASON, dPts(F, BASE));
  ciRows.push({ K, gc_season: g1, gc_teamseason: g2, pts_season: p1, pts_teamseason: p2 });
  const lbl = String(K === Infinity ? "inf" : K).padStart(3);
  console.log(`\n  K=${lbl}  goals conceded   d=${fmt(g1.point)}  season CI [${fmt(g1.lo)}, ${fmt(g1.hi)}] ${g1.excludesZero ? "UTILOKAR 0" : "includes 0"}`);
  console.log(`          ${" ".repeat(11)}  ${" ".repeat(9)}  team-season CI [${fmt(g2.lo)}, ${fmt(g2.hi)}] ${g2.excludesZero ? "UTILOKAR 0" : "includes 0"}`);
  console.log(`  K=${lbl}  POINTS (weighted) d=${fmt(p1.point)}  season CI [${fmt(p1.lo)}, ${fmt(p1.hi)}] ${p1.excludesZero ? "UTILOKAR 0" : "includes 0"}`);
  console.log(`          ${" ".repeat(11)}  ${" ".repeat(9)}  team-season CI [${fmt(p2.lo)}, ${fmt(p2.hi)}] ${p2.excludesZero ? "UTILOKAR 0" : "includes 0"}`);
}
OUT.ci_vs_base = ciRows.map(x => ({
  K: x.K === Infinity ? "inf" : x.K,
  gc_season: { d: x.gc_season.point, lo: x.gc_season.lo, hi: x.gc_season.hi, ex: x.gc_season.excludesZero },
  gc_teamseason: { d: x.gc_teamseason.point, lo: x.gc_teamseason.lo, hi: x.gc_teamseason.hi, ex: x.gc_teamseason.excludesZero },
  pts_season: { d: x.pts_season.point, lo: x.pts_season.lo, hi: x.pts_season.hi, ex: x.pts_season.excludesZero },
  pts_teamseason: { d: x.pts_teamseason.point, lo: x.pts_teamseason.lo, hi: x.pts_teamseason.hi, ex: x.pts_teamseason.excludesZero },
}));

/* --- VORDUR A SJALFA MAELINGUNA: delta gegn SJALFUM SER er nakvaemlega 0 --- */
{
  const z = bootstrapCI(CL_SEASON, dGc(BASE, BASE));
  console.log(`\n  [machine check] delta of K=10 against itself: ${fmt(z.point)} CI [${fmt(z.lo)}, ${fmt(z.hi)}]  (must be exactly 0)`);
  OUT.selftest_zero = z.point;
}

/* ============================================================
   6. SPURNING B — LOGUN VOGARINNAR YFIR TIMABILID
   Fyrir hvern glugga af n (leikir bunir) er leitad ad BESTU FOSTU vog
   w_prev innan gluggans. Ef k/(n+K) er rett form eiga w*(n) ad liggja
   a theirri sveigju.
   ============================================================ */
head("B. SHAPE - BEST FIXED WEIGHT w_prev PER MATCH COUNT (n)");
const WGRID = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const FW = new Map();
for (const w of WGRID) FW.set(w, ffdrFor(wRuleConst(w), { blendSot: true }));

const BUCKETS = [[1, 3], [4, 6], [7, 10], [11, 15], [16, 22], [23, 37]];
console.log("  n-range  team-matches  w* (goals conceded)  w* (POINTS)  K=10 says w=   implied K (mork)");
line();
const shape = [];
for (const [lo, hi] of BUCKETS) {
  const idxs = rows.map((r, i) => (r.n >= lo && r.n <= hi ? i : -1)).filter(i => i >= 0);
  const sub = pl.filter(x => x.n >= lo && x.n <= hi);
  const nMid = (lo + hi) / 2;
  let bestW = null, bestR = -Infinity, bestPw = null, bestP = -Infinity;
  const curve = [];
  for (const w of WGRID) {
    const F = FW.get(w);
    const r = corr(idxs.map(i => F.def[i]), idxs.map(i => gcArr[i]));
    const p = sub.length > 400 ? playerScore(F, sub) : NaN;
    curve.push({ w, r, p });
    if (r > bestR) { bestR = r; bestW = w; }
    if (Number.isFinite(p) && p > bestP) { bestP = p; bestPw = w; }
  }
  const wK = prevWeight(nMid);
  const impliedK = bestW >= 1 ? Infinity : bestW <= 0 ? 0 : (bestW * nMid) / (1 - bestW);
  shape.push({ lo, hi, n: idxs.length, plN: sub.length, bestW, bestR, bestPw, bestP, wK, impliedK, curve });
  console.log(`  ${String(lo).padStart(2)}-${String(hi).padStart(2)}    ${String(idxs.length).padStart(7)}      ` +
    `${bestW.toFixed(1)} (r=${bestR.toFixed(3)})     ${bestPw == null ? " —  " : bestPw.toFixed(1)}` +
    `        ${wK.toFixed(2)}            ${impliedK === Infinity ? "inf" : impliedK.toFixed(1)}`);
}
OUT.shape = shape.map(s => ({ ...s, impliedK: s.impliedK === Infinity ? "inf" : s.impliedK }));

console.log("\n  FULL CURVE r(goals conceded) per w - to see whether the peak is sharp or flat:");
console.log("  n-bil   " + WGRID.map(w => w.toFixed(1).padStart(7)).join(""));
for (const s of shape)
  console.log(`  ${String(s.lo).padStart(2)}-${String(s.hi).padStart(2)}   ` +
    s.curve.map(c => c.r.toFixed(3).padStart(7)).join(""));
console.log("\n  SOMU SVEIGJA a vegnu |r| GEGN STIGUM:");
console.log("  n-bil   " + WGRID.map(w => w.toFixed(1).padStart(7)).join(""));
for (const s of shape)
  console.log(`  ${String(s.lo).padStart(2)}-${String(s.hi).padStart(2)}   ` +
    s.curve.map(c => (Number.isFinite(c.p) ? c.p.toFixed(3) : "  —  ").padStart(7)).join(""));

/* --- ER LOGUNIN MARKTAEKT ONNUR EN K=10 SEGIR? ---
   Fyrir hvern glugga: berum FASTA w* (thad besta i glugganum) vid
   K=10-regluna A SOMU RODUM. Ef sveigjan er rong a thad ad koma fram
   sem delta sem utilokar null i minnsta kosti einum glugga.        */
head("B2. w* AGAINST THE K=10 RULE, PER WINDOW (bootstrap clustered per team-season)");
console.log("  delta > 0 = the fixed weight in the window beats the rule.");
const shapeCI = [];
for (const s of shape) {
  const F = FW.get(s.bestW);
  const cl = clustersBy(teamRowsIdx.filter(x => rows[x.i].n >= s.lo && rows[x.i].n <= s.hi),
                        x => `${x.season}|${x.team}`);
  const g = bootstrapCI(cl, dGc(F, BASE));
  const plSub = pl.filter(x => x.n >= s.lo && x.n <= s.hi);
  const pcl = clustersBy(plSub, x => `${x.season}|${x.team}`);
  const p = plSub.length > 400 ? bootstrapCI(pcl, dPts(FW.get(s.bestPw ?? s.bestW), BASE)) : null;
  shapeCI.push({ lo: s.lo, hi: s.hi, w: s.bestW, gc: g, pts: p });
  console.log(`  n=${String(s.lo).padStart(2)}-${String(s.hi).padStart(2)}  w*=${s.bestW.toFixed(1)}  ` +
    `goals conceded d=${fmt(g.point)} CI [${fmt(g.lo)}, ${fmt(g.hi)}] ${g.excludesZero ? "UTILOKAR 0" : "includes 0"}` +
    (p ? `  ·  POINTS d=${fmt(p.point)} CI [${fmt(p.lo)}, ${fmt(p.hi)}] ${p.excludesZero ? "UTILOKAR 0" : "includes 0"}` : ""));
}
OUT.shape_ci = shapeCI.map(x => ({
  lo: x.lo, hi: x.hi, w: x.w,
  gc: { d: x.gc.point, lo: x.gc.lo, hi: x.gc.hi, ex: x.gc.excludesZero },
  pts: x.pts ? { d: x.pts.point, lo: x.pts.lo, hi: x.pts.hi, ex: x.pts.excludesZero } : null,
}));

/* ============================================================
   7. MED MARKADSLINU — thad sem notandinn ser i NAESTU umferd
   ============================================================ */
head("WITH THE MARKET LINE (next gameweek - the market carries 0.80)");
console.log("  K        r(goals conceded)  |r|(goals scored)  weighted |r| POINTS");
for (const K of [0, 10, 20, Infinity]) {
  const F = FMKT.get(K);
  console.log(`  ${String(K === Infinity ? "inf" : K).padStart(4)}     ${corr(F.def, gcArr).toFixed(4)}` +
    `         ${Math.abs(corr(F.att, gfArr)).toFixed(4)}           ${playerScore(F).toFixed(4)}`);
}

/* ============================================================
   8. PER STODU VID BESTU K — er einhver stada svikin?
   ============================================================ */
head("BY POSITION (the core): K=0 - K=10 - best K on points - prior season only");
const kBest = OUT.argmax.pts;
console.log(`  best K on weighted points = ${kBest === Infinity ? "inf" : kBest}`);
console.log("  pos      n         K=0       K=10      K=" + String(kBest === Infinity ? "inf" : kBest).padEnd(4) + "  prev only");
for (const pos of Object.keys(POSN)) {
  const g = pl.filter(x => x.pos === pos);
  const v = K => { const F = FBY.get(K); return corr(g.map(x => F[x.arr][x.i]), g.map(x => x.pts)); };
  console.log(`  ${pos.padEnd(6)} ${String(g.length).padStart(6)}    ${v(0).toFixed(3)}    ${v(10).toFixed(3)}` +
    `    ${v(kBest).toFixed(3)}    ${v(Infinity).toFixed(3)}`);
}
OUT.per_pos = Object.fromEntries(Object.keys(POSN).map(pos => {
  const g = pl.filter(x => x.pos === pos);
  const v = K => { const F = FBY.get(K); return corr(g.map(x => F[x.arr][x.i]), g.map(x => x.pts)); };
  return [pos, { n: g.length, k0: v(0), k10: v(10), kBest: v(kBest), prev: v(Infinity) }];
}));

/* ============================================================
   9. RESULT I EINNI SETNINGU
   ============================================================ */
head("RESULT");
const bestPtsRow = grid.reduce((a, b) => (b.ps > a.ps ? b : a));
const k10 = grid.find(g => g.K === PREV_K);
console.log(`  K in use: ${PREV_K}   ·   weighted |r| points ${k10.ps.toFixed(4)}`);
console.log(`  best K on the grid: ${bestPtsRow.K === Infinity ? "inf" : bestPtsRow.K}  ·  ${bestPtsRow.ps.toFixed(4)}` +
  `  ·  gain ${(bestPtsRow.ps - k10.ps >= 0 ? "+" : "") + (bestPtsRow.ps - k10.ps).toFixed(4)}`);
const anyClears = OUT.ci_vs_base.some(x =>
  (x.pts_season.ex && x.pts_season.d > 0) && (x.pts_teamseason.ex && x.pts_teamseason.d > 0));
console.log(`  DOES ANY K CLEAR THE BAR ON POINTS (both clusters, CI excludes 0, positive)? ${anyClears ? "YES" : "NO"}`);
OUT.any_clears_bar = anyClears;

if (ARGJSON) { writeFileSync(ARGJSON, JSON.stringify(OUT, null, 1)); console.log(`\n  written -> ${ARGJSON}`); }
