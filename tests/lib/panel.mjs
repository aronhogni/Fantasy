/* ============================================================
   PANEL.MJS — leikmanna-umferðir með ÖLLUM eiginleikum, tíma-heiðarlega

   Sameiginlegt fyrir tests/exp-points.mjs (hvaða tölur segja mest) og
   tests/rank-model.mjs (röðunarskorið fyrir tillögur). Byggingin á að vera
   á EINUM stað — annars getur eitt próf mælt annan heim en hitt, sama
   regla sem gildir um lib/e0.mjs.

   ALGJÖR REGLA: hver eiginleiki fyrir umferð t má AÐEINS nota
     - umferðir < t hjá þeim leikmanni,
     - fyrra tímabil (fortíð),
     - og leikjaþyngd/CS%, sem eru þekkt FYRIR leik.
   Ekkert úr umferð t sjálfri. `pts` er markmiðið og er aldrei eiginleiki.

   `xP` ER FPL-EIGIÐ VÆNT STIG þeirrar umferðar — sögulega jafngildi
   `ep_next` sem appið notar sem GRUNN. Það þýðir að hér má mæla
   RAUNVERULEGA aðferð appsins, ekki staðgengil. ATH: xP er strjált í
   2025/26 (3.257 af 11.498), svo `xP5` fellur á ppg5 þegar það vantar —
   og `hasXp` merkir hvort það var til.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloFor,
} from "./e0.mjs";
import { makeFixDifficulty, cleanSheetProb } from "../../src/model.js";

const D = new URL("../../data/", import.meta.url).pathname;
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };
export const POSN = { GK: 1, DEF: 2, MID: 3, FWD: 4 };

/* ---------- 1. Leikja-hlið: FFDR, CS%, hvíld ---------- */
function buildFixtures() {
  const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
  const E = eloFor(loaded);
  const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
  const out = new Map();
  for (let si = 1; si < SEASONS.length; si++) {
    const key = SEASONS[si], prevRows = byKey[SEASONS[si - 1]];
    const list = [...byKey[key]].sort((a, b) => e0Day(a.Date).localeCompare(e0Day(b.Date)));
    const prevStr = buildStrength(prevRows);
    const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
    for (const t of teams) if (!prevStr[t]) prevStr[t] = { ...PROMO_DEFAULT };
    const run = {}; for (const t of teams) run[t] = { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
    const lastDay = {};                        // síðasti leikdagur liðsins -> hvíld
    const ids = {}; let nn = 1; for (const t of teams) ids[t] = nn++;
    const orig = new Map(byKey[key].map((r, i) => [r, i]));
    const FDR = fdrFor(key, prevRows);
    for (const r of list) {
      const e = E.get(key, orig.get(r), r.HomeTeam, r.AwayTeam);
      const mk = marketForRow(r), p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
      const day = e0Day(r.Date);
      const mm = t => {
        const a = run[t], P = prevStr[t];
        const cur = a.n === 0 ? { xg90: P.xg90, xgc90: P.xgc90, sotFor: P.sotFor, sotAg: P.sotAg }
          : { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n };
        return { ...cur, matches: a.n, prevGoals: P.xg90, prevConc: P.xgc90,
          prevSotFor: P.sotFor, prevSotAg: P.sotAg };
      };
      const kickoff = `${r.Date}T00:00:00Z`;
      for (const [team, opTeam, home, fdrV] of [
        [r.HomeTeam, r.AwayTeam, true, p.h], [r.AwayTeam, r.HomeTeam, false, p.a],
      ]) {
        const me = mm(team), op = mm(opTeam);
        const tm = { [ids[team]]: me, [ids[opTeam]]: op };
        const tb = { [ids[team]]: { short: team }, [ids[opTeam]]: { short: opTeam } };
        const eloMe = home ? e.h : e.a, eloOp = home ? e.a : e.h;
        const eb = { [ids[team]]: { elo: eloMe }, [ids[opTeam]]: { elo: eloOp } };
        const odds = mk ? { [team]: { xga: home ? mk.axg : mk.hxg, xg: home ? mk.hxg : mk.axg, opp: opTeam, kickoff } } : null;
        const f = makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds, eloByTeam: eb });
        const fxo = { opp: ids[opTeam], home, fdr: fdrV, kickoff };
        const lam = mk ? (home ? mk.axg : mk.hxg) : null;
        const cs = lam != null ? Math.exp(-lam)
          : cleanSheetProb({ ownXgc: me.xgc90, oppXg: op.xg90, home, eloDiff: (eloOp - eloMe) / 100, fdr: fdrV });
        /* HVÍLD: dagar frá síðasta leik liðsins. Þekkt fyrir leik. */
        const prevDay = lastDay[team];
        const rest = prevDay ? Math.min(21, Math.round((new Date(day) - new Date(prevDay)) / 86400000)) : 7;
        out.set(`${key}|${r.Date}|${team}`, {
          dDef: f(ids[team], fxo, 2), dAtt: f(ids[team], fxo, 4),
          cs, home: home ? 1 : 0, fdr: fdrV, rest,
          teamXg: mk ? (home ? mk.hxg : mk.axg) : op.xgc90,
        });
      }
      lastDay[r.HomeTeam] = day; lastDay[r.AwayTeam] = day;
      const hs = run[r.HomeTeam], as = run[r.AwayTeam];
      hs.g += +r.FTHG; hs.c += +r.FTAG; hs.sf += +(r.HST || 0); hs.sa += +(r.AST || 0); hs.n++;
      as.g += +r.FTAG; as.c += +r.FTHG; as.sf += +(r.AST || 0); as.sa += +(r.HST || 0); as.n++;
    }
  }
  return out;
}

/* ---------- 2. Panelið ---------- */
export function buildPanel({ minHistory = 3 } = {}) {
  const fxMap = buildFixtures();
  const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
  const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));

  /* fyrra tímabil per leikmanni (fortíð) */
  const prevAgg = {};
  for (const [season, list] of Object.entries(PG.seasons)) {
    const agg = {};
    for (const q of list) {
      const a = agg[q[H.name]] ||= { p: 0, m: 0, n: 0 };
      a.p += q[H.pts]; a.m += q[H.mins]; a.n++;
    }
    const nextKey = SEASONS[SEASONS.indexOf(season) + 1];
    if (nextKey) for (const [nm, a] of Object.entries(agg))
      if (a.n >= 5) (prevAgg[nextKey] ||= {})[nm] = { ppg: a.p / a.n, mins: a.m / a.n };
  }

  const rows = [];
  for (const [season, list] of Object.entries(PG.seasons)) {
    const byPlayer = {};
    for (const q of list) (byPlayer[q[H.name]] ||= []).push(q);
    for (const [nm, arr] of Object.entries(byPlayer)) {
      arr.sort((a, b) => a[H.round] - b[H.round]);
      const hist = [];
      for (const q of arr) {
        const f = fxMap.get(`${season}|${q[H.date]}|${q[H.team]}`);
        const pos = q[H.pos] === "GKP" ? "GK" : q[H.pos];
        const code = POSN[pos];
        if (f && code && hist.length >= minHistory) {
          const l5 = hist.slice(-5);
          const sumM = l5.reduce((a, x) => a + x[H.mins], 0);
          const p90 = k => sumM > 0 ? l5.reduce((a, x) => a + (x[k] || 0), 0) / (sumM / 90) : 0;
          const prev = prevAgg[season]?.[nm];
          /* xP: FPL-eigið vænt stig. Strjált í 2025/26 -> fellur á ppg5. */
          const xpVals = l5.map(x => x[H.xP]).filter(v => v > 0);
          const ppg5 = mean(l5.map(x => x[H.pts]));
          /* mínútu-STEFNA: síðustu 2 á móti þeim 3 á undan (er hann að
             vinna sér sess eða missa hann?) */
          const m2 = mean(l5.slice(-2).map(x => x[H.mins]));
          const m3 = l5.length >= 4 ? mean(l5.slice(0, -2).map(x => x[H.mins])) : m2;
          rows.push({
            season, round: q[H.round], name: nm, team: q[H.team], pos, code, pts: q[H.pts],
            /* form og geta */
            ppg5, ppgAll: mean(hist.map(x => x[H.pts])),
            xP5: xpVals.length ? mean(xpVals) : ppg5,
            hasXp: xpVals.length ? 1 : 0,
            mins5: mean(l5.map(x => x[H.mins])),
            minsTrend: m2 - m3,
            startRate: mean(l5.map(x => x[H.starts] >= 1 ? 1 : 0)),
            xg90: p90(H.xg), xa90: p90(H.xa), bps90: p90(H.bps),
            bonus5: mean(l5.map(x => x[H.bonus])),
            ict90: p90(H.ict), threat90: p90(H.threat),
            creat90: p90(H.creat), infl90: p90(H.infl),
            ycRate: mean(l5.map(x => x[H.yc])),
            /* varnaraðgerðir — aðeins 2025/26 */
            dc90: l5.every(x => x[H.dc] == null) ? 0 : p90(H.dc),
            hasDc: l5.some(x => x[H.dc] != null) ? 1 : 0,
            /* markaður og hjörð */
            price: q[H.value] / 10,
            priceChg: (q[H.value] - l5[0][H.value]) / 10,
            own: (l5[l5.length - 1][H.sel] || 0) / 1e6,
            netT: l5.reduce((a, x) => a + (x[H.tIn] - x[H.tOut]), 0) / 1e5,
            /* fyrra tímabil */
            prevPpg: prev?.ppg ?? 0, prevMins: prev?.mins ?? 0,
            hasPrev: prev ? 1 : 0,
            /* leikur (þekkt fyrir leik) */
            ffdr: code <= 2 ? f.dDef : f.dAtt,
            cs: f.cs, home: f.home, teamXg: f.teamXg, rest: f.rest,
            /* staða */
            isGK: code === 1 ? 1 : 0, isDEF: code === 2 ? 1 : 0,
            isMID: code === 3 ? 1 : 0, isFWD: code === 4 ? 1 : 0,
          });
        }
        hist.push(q);
      }
    }
  }
  return rows;
}

/* Öll inntök á einum stað — bæði próf nota sama lista svo þau mæli sama hlut. */
export const FEATURES = [
  ["xP5", r => r.xP5], ["ppg5", r => r.ppg5], ["ppgAll", r => r.ppgAll],
  ["mins5", r => r.mins5], ["minsTrend", r => r.minsTrend], ["startRate", r => r.startRate],
  ["xg90", r => r.xg90], ["xa90", r => r.xa90], ["bps90", r => r.bps90],
  ["bonus5", r => r.bonus5], ["ict90", r => r.ict90], ["threat90", r => r.threat90],
  ["creat90", r => r.creat90], ["infl90", r => r.infl90], ["ycRate", r => r.ycRate],
  ["dc90", r => r.dc90], ["hasDc", r => r.hasDc],
  ["price", r => r.price], ["priceChg", r => r.priceChg],
  ["own", r => r.own], ["netT", r => r.netT],
  ["prevPpg", r => r.prevPpg], ["prevMins", r => r.prevMins], ["hasPrev", r => r.hasPrev],
  ["FFDR", r => r.ffdr], ["CS%", r => r.cs], ["home", r => r.home],
  ["teamXg", r => r.teamXg], ["rest", r => r.rest],
  ["isGK", r => r.isGK], ["isDEF", r => r.isDEF], ["isMID", r => r.isMID],
];

/* ---------- Tólin sem bæði próf nota ---------- */
export function fitRidge(X, y, lambda = 1e-3) {
  const n = X.length, k = X[0].length;
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = X[i];
    for (let a = 0; a < k; a++) {
      b[a] += xi[a] * y[i];
      for (let c = a; c < k; c++) A[a][c] += xi[a] * xi[c];
    }
  }
  for (let a = 0; a < k; a++) { for (let c = 0; c < a; c++) A[a][c] = A[c][a]; A[a][a] += lambda * n; }
  for (let i = 0; i < k; i++) {
    let piv = i;
    for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]]; [b[i], b[piv]] = [b[piv], b[i]];
    const d = A[i][i] || 1e-12;
    for (let r = i + 1; r < k; r++) {
      const m2 = A[r][i] / d;
      if (!m2) continue;
      for (let c = i; c < k; c++) A[r][c] -= m2 * A[i][c];
      b[r] -= m2 * b[i];
    }
  }
  const w = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < k; c++) s -= A[i][c] * w[c];
    w[i] = s / (A[i][i] || 1e-12);
  }
  return w;
}
export const design = (r, feats) => [1, ...feats.map(([, f]) => f(r))];
export function losoPredict(rows, feats, seasons) {
  const out = new Array(rows.length);
  for (const s of seasons) {
    const tr = [], te = [];
    rows.forEach((r, i) => (r.season === s ? te : tr).push(i));
    if (!te.length || !tr.length) continue;
    const w = fitRidge(tr.map(i => design(rows[i], feats)), tr.map(i => rows[i].pts));
    for (const i of te) out[i] = design(rows[i], feats).reduce((a, v, j) => a + v * w[j], 0);
  }
  return out;
}
export function spearman(a, b, corrFn) {
  const rank = arr => {
    const idx = arr.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
    const r = new Array(arr.length);
    let i = 0;
    while (i < idx.length) {
      let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  return corrFn(rank(a), rank(b));
}
/* TOPP-N PRÓFIÐ: innan hverrar umferðar, raða eftir spá og skoða RAUNSTIG
   þeirra N sem líkanið valdi. Þetta er ákvörðunin sjálf, ekki staðgengill. */
export function topN(rows, pred, N = 15) {
  const byGw = {};
  rows.forEach((r, i) => (byGw[`${r.season}|${r.round}`] ||= []).push(i));
  const got = [], best = [];
  for (const ix of Object.values(byGw)) {
    if (ix.length < 30) continue;
    got.push(mean([...ix].sort((a, b) => pred[b] - pred[a]).slice(0, N).map(i => rows[i].pts)));
    best.push(mean([...ix].sort((a, b) => rows[b].pts - rows[a].pts).slice(0, N).map(i => rows[i].pts)));
  }
  return { got: mean(got), best: mean(best), n: got.length };
}
