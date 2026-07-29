/* ============================================================
   PANEL2.MJS — RÍKT eiginleikasett + ólínuleg líkön

   Framhald af lib/panel.mjs. Markmiðið er að hækka TOPP-15 mælikvarðann
   (raunstig þeirra 15 sem skorið velur í hverri umferð) frá 5,13.

   TVEIR HLUTIR SEM MÁ ALDREI HREYFA, ANNARS ER TALAN MERKINGARLAUS:
   1. VALLAUGIN ER FÖST. Topp-15 er reiknað úr ÖLLUM leikmönnum umferðar
      sem eiga ≥3 leikja sögu. Ef laugin er síuð (t.d. "aðeins líklegir
      byrjunarmenn") hækkar talan án þess að líkanið batni. Laugin er
      skilgreind í buildPanel og er sú sama fyrir öll líkön.
   2. LOSO Á TÍMABILUM. Sérhver spá fyrir tímabil S kemur úr líkani sem
      sá EKKI S. Val á eiginleikum sem notar öll tímabil er valskekkja —
      hreiðruð próf sýndu hana þegar (32 inntök 5,045 á móti 5,13 hjá
      þéttum lista sem var valinn á öllum gögnum).
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloFor,
} from "./e0.mjs";
import { makeFixDifficulty, cleanSheetProb } from "../../src/model.js";

const D = new URL("../../data/", import.meta.url).pathname;
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };
export const POSN = { GK: 1, DEF: 2, MID: 3, FWD: 4 };

/* ---------- Leikja-hlið, með LIÐSFORMI til viðbótar ---------- */
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
    const run = {}; for (const t of teams) run[t] = { g: 0, c: 0, sf: 0, sa: 0, n: 0, last: [] };
    const lastDay = {};
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
        const prevDay = lastDay[team];
        const rest = prevDay ? Math.min(21, Math.round((new Date(day) - new Date(prevDay)) / 86400000)) : 7;
        /* LIÐSFORM: síðustu 5 leikir liðsins (mörk fyrir/á sig) — fortíð */
        const L = run[team].last.slice(-5);
        out.set(`${key}|${r.Date}|${team}`, {
          dDef: f(ids[team], fxo, 2), dAtt: f(ids[team], fxo, 4),
          cs, home: home ? 1 : 0, fdr: fdrV, rest,
          teamXg: mk ? (home ? mk.hxg : mk.axg) : op.xgc90,
          teamXga: lam != null ? lam : me.xgc90,
          eloDiff: (eloOp - eloMe) / 100,
          tmGf5: L.length ? mean(L.map(x => x.gf)) : me.xg90,
          tmGa5: L.length ? mean(L.map(x => x.ga)) : me.xgc90,
          tmCs5: L.length ? mean(L.map(x => x.ga === 0 ? 1 : 0)) : 0.27,
          tmMatches: run[team].n,
        });
      }
      lastDay[r.HomeTeam] = day; lastDay[r.AwayTeam] = day;
      const hs = run[r.HomeTeam], as = run[r.AwayTeam];
      hs.last.push({ gf: +r.FTHG, ga: +r.FTAG }); as.last.push({ gf: +r.FTAG, ga: +r.FTHG });
      hs.g += +r.FTHG; hs.c += +r.FTAG; hs.sf += +(r.HST || 0); hs.sa += +(r.AST || 0); hs.n++;
      as.g += +r.FTAG; as.c += +r.FTHG; as.sf += +(r.AST || 0); as.sa += +(r.HST || 0); as.n++;
    }
  }
  return out;
}

/* ---------- Panelið með RÍKU setti ---------- */
/* TVAER LAUGIR, TVAER SPURNINGAR — og thad er ekki smekksatriði:
     includeBlanks=false (SJALFGEFID): adeins radir med minutum > 0.
       Svarar "hversu morg stig EF hann kemur vid sogu". Allar maelingar
       sem eru skjaladar i CLAUDE.md og commit-sogunni nota THESSA laug.
     includeBlanks=true: ALLAR radir, lika 0-minutu (62% af gognum).
       Svarar "hverja aetti eg ad velja" — thad sem tillogu-velin gerir
       i raun. Talan er LAEGRI (fleiri vondir kandidatar) og NIDURSTODUR
       SNUAST VID: fleiri inntok hjalpa, thvi tiltaekileiki er merki.
   Ad blanda thessu tvennu saman er samanburdur a tveimur olikum
   verkefnum. Laugin ER hluti af skilgreiningu maelikvardans.          */
export function buildPanel({ minHistory = 3, includeBlanks = false } = {}) {
  const fxMap = buildFixtures();
  const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
  const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
  const prevAgg = {};
  for (const [season, list] of Object.entries(PG.seasons)) {
    const agg = {};
    for (const q of list) {
      const a = agg[q[H.name]] ||= { p: 0, m: 0, n: 0, g: 0, as: 0, bps: 0 };
      a.p += q[H.pts]; a.m += q[H.mins]; a.n++;
      a.g += q[H.goals]; a.as += q[H.assists]; a.bps += q[H.bps];
    }
    const nextKey = SEASONS[SEASONS.indexOf(season) + 1];
    if (nextKey) for (const [nm, a] of Object.entries(agg)) if (a.n >= 5)
      (prevAgg[nextKey] ||= {})[nm] = { ppg: a.p / a.n, mins: a.m / a.n,
        gi90: a.m > 0 ? (a.g + a.as) / (a.m / 90) : 0, bps90: a.m > 0 ? a.bps / (a.m / 90) : 0 };
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
        if (f && code && hist.length >= minHistory && (includeBlanks || q[H.mins] > 0)) {
          const win = k => hist.slice(-k);
          const l3 = win(3), l5 = win(5), l10 = win(10);
          const per90 = (arr2, k) => {
            const m = arr2.reduce((a, x) => a + x[H.mins], 0);
            return m > 0 ? arr2.reduce((a, x) => a + (x[k] || 0), 0) / (m / 90) : 0;
          };
          const prev = prevAgg[season]?.[nm];
          const xp5 = l5.map(x => x[H.xP]).filter(v => v > 0);
          const pts5 = l5.map(x => x[H.pts]);
          const ptsAll = hist.map(x => x[H.pts]);
          const m2 = mean(l5.slice(-2).map(x => x[H.mins]));
          const m3b = l5.length >= 4 ? mean(l5.slice(0, -2).map(x => x[H.mins])) : m2;
          const isDef = code <= 2;
          rows.push({
            season, round: q[H.round], date: q[H.date], name: nm, team: q[H.team], pos, code, pts: q[H.pts],
            /* --- FORM, MARGIR TÍMAKVARÐAR --- */
            ppg3: mean(l3.map(x => x[H.pts])), ppg5: mean(pts5),
            ppg10: mean(l10.map(x => x[H.pts])), ppgAll: mean(ptsAll),
            xP5: xp5.length ? mean(xp5) : mean(pts5), hasXp: xp5.length ? 1 : 0,
            /* --- MÍNÚTUR OG SESS --- */
            mins3: mean(l3.map(x => x[H.mins])), mins5: mean(l5.map(x => x[H.mins])),
            mins10: mean(l10.map(x => x[H.mins])),
            minsTrend: m2 - m3b,
            startRate: mean(l5.map(x => x[H.starts] >= 1 ? 1 : 0)),
            start10: mean(l10.map(x => x[H.starts] >= 1 ? 1 : 0)),
            full90: mean(l5.map(x => x[H.mins] >= 90 ? 1 : 0)),
            /* --- SÓKNARMERKI --- */
            xg90: per90(l5, H.xg), xa90: per90(l5, H.xa),
            xgi90: per90(l5, H.xg) + per90(l5, H.xa),
            xgi90_10: per90(l10, H.xg) + per90(l10, H.xa),
            gi90: per90(l5, H.goals) + per90(l5, H.assists),
            overPerf: (per90(l5, H.goals) + per90(l5, H.assists)) - (per90(l5, H.xg) + per90(l5, H.xa)),
            threat90: per90(l5, H.threat), creat90: per90(l5, H.creat),
            infl90: per90(l5, H.infl), ict90: per90(l5, H.ict),
            /* --- BÓNUS OG BPS --- */
            bps90: per90(l5, H.bps), bonus5: mean(l5.map(x => x[H.bonus])),
            bonusRate: mean(l5.map(x => x[H.bonus] > 0 ? 1 : 0)),
            /* --- ÞAK, GÓLF, SVEIFLA (sprengi-hæfni) --- */
            ptsMax5: Math.max(...pts5), ptsMin5: Math.min(...pts5),
            ptsSd5: sd(pts5),
            hauls: mean(l10.map(x => x[H.pts] >= 8 ? 1 : 0)),
            blanks: mean(l10.map(x => x[H.pts] <= 2 ? 1 : 0)),
            /* --- VARNARMERKI --- */
            saves90: per90(l5, H.saves), csRate5: mean(l5.map(x => x[H.cs] >= 1 ? 1 : 0)),
            gcRate5: per90(l5, H.gc),
            dc90: l5.every(x => x[H.dc] == null) ? 0 : per90(l5, H.dc),
            hasDc: l5.some(x => x[H.dc] != null) ? 1 : 0,
            /* --- VERÐ, HJÖRÐ, SPJÖLD --- */
            price: q[H.value] / 10,
            priceChg: (q[H.value] - l5[0][H.value]) / 10,
            own: (l5[l5.length - 1][H.sel] || 0) / 1e6,
            netT: l5.reduce((a, x) => a + (x[H.tIn] - x[H.tOut]), 0) / 1e5,
            ycRate: mean(l5.map(x => x[H.yc])),
            /* --- FYRRA TÍMABIL --- */
            prevPpg: prev?.ppg ?? 0, prevMins: prev?.mins ?? 0,
            prevGi90: prev?.gi90 ?? 0, prevBps90: prev?.bps90 ?? 0,
            hasPrev: prev ? 1 : 0,
            /* --- LEIKUR OG LIÐSFORM --- */
            ffdr: isDef ? f.dDef : f.dAtt,
            ffdrDef: f.dDef, ffdrAtt: f.dAtt,
            /* HRATT OPINBERT FDR — svo maela megi FFDR GEGN thvi a somu
               rodum. VILJANDI EKKI i FEATURES: thad er vidmid, ekki inntak. */
            fdrRaw: f.fdr,
            cs: f.cs, home: f.home, teamXg: f.teamXg, teamXga: f.teamXga,
            rest: f.rest, eloDiff: f.eloDiff,
            tmGf5: f.tmGf5, tmGa5: f.tmGa5, tmCs5: f.tmCs5,
            /* --- STAÐA --- */
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

/* Grunn-inntök. SAMSPIL eru bætt við í tilraununum, ekki hér. */
export const BASE_FEATURES = [
  "ppg3", "ppg5", "ppg10", "ppgAll", "xP5", "hasXp",
  "mins3", "mins5", "mins10", "minsTrend", "startRate", "start10", "full90",
  "xg90", "xa90", "xgi90", "xgi90_10", "gi90", "overPerf",
  "threat90", "creat90", "infl90", "ict90",
  "bps90", "bonus5", "bonusRate",
  "ptsMax5", "ptsMin5", "ptsSd5", "hauls", "blanks",
  "saves90", "csRate5", "gcRate5", "dc90", "hasDc",
  "price", "priceChg", "own", "netT", "ycRate",
  "prevPpg", "prevMins", "prevGi90", "prevBps90", "hasPrev",
  "ffdr", "cs", "home", "teamXg", "teamXga", "rest", "eloDiff",
  "tmGf5", "tmGa5", "tmCs5",
  "isGK", "isDEF", "isMID",
];

/* ---------- Tól ---------- */
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

/* ---------- ÓLÍNULEGT: hallalækkuð aðfallstré (GBM) ----------
   Lítil útfærsla: regression-stubbar/tré með dýpt d, lærð á leifum.
   Ólínuleg samspil koma fram sjálfkrafa — það er tilgangurinn.        */
function buildTree(X, g, idx, depth, minLeaf) {
  if (depth === 0 || idx.length < 2 * minLeaf) {
    return { leaf: mean(idx.map(i => g[i])) };
  }
  let best = null;
  const k = X[0].length;
  for (let j = 0; j < k; j++) {
    /* kvantíl-þröskuldar (10) — ódýrt og nóg */
    const vals = idx.map(i => X[i][j]);
    const srt = [...vals].sort((a, b) => a - b);
    const cand = [];
    for (let q = 1; q <= 9; q++) {
      const v = srt[Math.floor(q * srt.length / 10)];
      if (cand[cand.length - 1] !== v) cand.push(v);
    }
    for (const thr of cand) {
      let sl = 0, nl = 0, sr = 0, nr = 0;
      for (const i of idx) { if (X[i][j] <= thr) { sl += g[i]; nl++; } else { sr += g[i]; nr++; } }
      if (nl < minLeaf || nr < minLeaf) continue;
      const gain = (sl * sl) / nl + (sr * sr) / nr;
      if (!best || gain > best.gain) best = { gain, j, thr };
    }
  }
  if (!best) return { leaf: mean(idx.map(i => g[i])) };
  const L = [], R = [];
  for (const i of idx) (X[i][best.j] <= best.thr ? L : R).push(i);
  return { j: best.j, thr: best.thr,
    L: buildTree(X, g, L, depth - 1, minLeaf), R: buildTree(X, g, R, depth - 1, minLeaf) };
}
const treePred = (t, x) => t.leaf !== undefined ? t.leaf : treePred(x[t.j] <= t.thr ? t.L : t.R, x);

export function fitGBM(X, y, { rounds = 60, lr = 0.1, depth = 3, minLeaf = 40 } = {}) {
  const base = mean(y);
  const pred = new Array(X.length).fill(base);
  const trees = [];
  const allIdx = X.map((_, i) => i);
  for (let r = 0; r < rounds; r++) {
    const g = y.map((v, i) => v - pred[i]);
    const t = buildTree(X, g, allIdx, depth, minLeaf);
    trees.push(t);
    for (let i = 0; i < X.length; i++) pred[i] += lr * treePred(t, X[i]);
  }
  return { base, lr, trees };
}
export const gbmPred = (m, x) => m.base + m.lr * m.trees.reduce((a, t) => a + treePred(t, x), 0);

/* ---------- Mælikvarðar ---------- */
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
export { mean, sd };
