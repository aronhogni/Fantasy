/* ============================================================
   START-PANEL — EIN UPPBYGGING A "HVER BYRJADI I HVERRI UMFERD"

   EKKI I `npm test`, EKKI I PIPELINE. Thetta er SAMEIGINLEGT modul fyrir
   maelingaskrifturnar `measure-rival-out.mjs`, `measure-tail-to-gw1.mjs` og
   `measure-preseason-starts.mjs`. Somu rok og `scripts/espn-zones.mjs`:
   toflan sem thaer THRJAR lesa ma ekki vera afrituð i thrjar skrar
   (CLAUDE.md kafli 12 — "afrituð tafla er tvaer toflur sem reka i sundur").

   HVERS VEGNA TVAER HEIMILDIR ERU SAMEINADAR HER:
     · `data/fpl_player_gw.json` er PER-LEIK (round, team, pos, mins, starts,
       VALUE) en lyklud a NAFNI — nafn er ekki stodugt milli timabila.
     · `data/player_gw_*.json` er lyklud a `code` (fast yfir timabil) en ber
       ENGAN `value`.
   Maelt 20.8.2026: nafna-porun MILLI timabila tapar 10-52 raunverulegum
   porunum per timabilamot (384/473/459/460 a moti 433/483/480/512 med
   code) — 2,4-7,5% af merkinu, thogult. Thess vegna er `players_raw.csv`
   sott ur vaastav-speglinum og `first_name + " " + second_name` parad vid
   `name`-svidid i merged_gw. Maelt EXAKT: 733/735 · 776/777 · 865/869 ·
   804/805 · 841/841 (0-4 vantandi, 0-2 tvirædd). Engin fuzzy-porun.

   `value` ER TEKIÐ MED VILJANDI. START_MODEL hefur fimm inntok og eitt
   theirra er verd (w 0,1445, sd 10,49). Ad setja thad i mu fyrir alla gerir
   p_model VERRA — og thad er nakvaemlega i thagu theirrar tilgatu sem verid
   er ad prófa (nytt inntak sem baetist ofan a). Skekkja i þágu tilgátunnar
   er versta tegund skekkju.

   CACHE: `players_raw.csv` (5 skrar) fer i os.tmpdir()/fpl-startpanel/,
   ekki i repo-id (sbr. `scripts/.boxtouch-cache/`).
   ============================================================ */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rowsToObjects } from "./csv.mjs";

export const RAW_MIRROR =
  "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data";
export const SEASON_DIR = {
  "2122": "2021-22", "2223": "2022-23", "2324": "2023-24",
  "2425": "2024-25", "2526": "2025-26",
};
export const SEASONS = Object.keys(SEASON_DIR);
export const DATA = new URL("../data/", import.meta.url).pathname;
const CACHE = join(tmpdir(), "fpl-startpanel");

/* Byrjun = >= 60 minutur. Thad er SAMA skilgreining og `startFeatures`
   (`src/stats.js`) notar i `started_last`/`starts5` — ekki `starts`-svidid.
   Tvaer skilgreiningar a somu akvordun eru tveir kvardar (CLAUDE.md 19.8). */
export const START_MIN = 60;
export const isStart = mins => (mins ?? 0) >= START_MIN;

/* ---------- CSV ---------- */
/* ThATTUNIN BYR I `scripts/csv.mjs` (25.8.2026) — sja rokstudninginn thar.
   `minFields: 1` er SIAN sem thessi skra hafdi: `players_raw.csv` er
   mjorri en per-umferdar skrarnar, svo throskuldur theirra (3) myndi
   henda gildum rodum hedan. Siurnar eru olikar AD ASETTU RADI.
   AFRAM `export` — sjo maelinga-skriftur flytja hana inn hedan.      */
export const parseCsv = text => rowsToObjects(text, { minFields: 1 });
async function playersRaw(season) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `players_raw_${season}.csv`);
  if (!existsSync(file)) {
    const url = `${RAW_MIRROR}/${SEASON_DIR[season]}/players_raw.csv`;
    /* TIMAMORK ERU SKYLDA (`tests/wiring.mjs`) — fetch an theirra getur
       hangid ad eilifu og maelinga-skrifta sem hangir eyðir lotu.        */
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`players_raw ${season}: HTTP ${res.status}`);
    writeFileSync(file, await res.text());
  }
  return parseCsv(readFileSync(file, "utf8"));
}

/* ---------- PANELLINN ----------
   { [season]: { byCode: Map(code -> row), teamPlayed: Set("round|team"),
                 nameMisses: n, ambiguous: n } }
   row = { code, name, webName, pos, r: Map(round -> {mins,starts,value,team}) }  */
export async function loadPanel(seasons = SEASONS) {
  const fg = JSON.parse(readFileSync(join(DATA, "fpl_player_gw.json"), "utf8"));
  const h = fg.header, ix = {};
  for (const k of ["round", "team", "pos", "mins", "starts", "value", "name", "date"]) ix[k] = h.indexOf(k);

  const out = {};
  for (const season of seasons) {
    const raw = await playersRaw(season);
    const codeByName = new Map(), webByCode = new Map();
    for (const r of raw) {
      const code = +r.code; if (!Number.isFinite(code)) continue;
      webByCode.set(code, r.web_name || `${r.first_name} ${r.second_name}`);
      const n = `${r.first_name} ${r.second_name}`;
      codeByName.set(n, (codeByName.get(n) || []).concat(code));
    }

    const byCode = new Map(), teamPlayed = new Set();
    let misses = 0, ambiguous = 0, gw1Ts = Infinity;
    const seenName = new Map();          // name -> code | null (talid einu sinni)
    for (const r of fg.seasons[season] || []) {
      const name = r[ix.name], round = +r[ix.round], team = r[ix.team];
      const mins = +r[ix.mins] || 0;
      if (mins > 0) teamPlayed.add(`${round}|${team}`);
      /* GW1-DAGSETNINGIN. Hun er MORKIN fyrir hvad forleiks-merki MA lesa:
         leikur sem er spiladur EFTIR ad umferdin byrjar er ekki forspa.
         Sniðid i merged_gw er DD/MM/YYYY. */
      if (round === 1) {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(r[ix.date] || ""));
        if (m) gw1Ts = Math.min(gw1Ts, Date.UTC(+m[3], +m[2] - 1, +m[1]));
      }

      let code = seenName.get(name);
      if (code === undefined) {
        const cs = codeByName.get(name);
        if (!cs) { misses++; code = null; }
        else if (cs.length > 1) { ambiguous++; code = null; }
        else code = cs[0];
        seenName.set(name, code);
      }
      if (code == null) continue;

      let row = byCode.get(code);
      if (!row) byCode.set(code, row = {
        code, name, webName: webByCode.get(code) || name,
        pos: normPos(r[ix.pos]), r: new Map(),
      });
      /* Tvofold umferd: LAGT SAMAN (per-leiks radir, sama round). */
      const cur = row.r.get(round);
      if (cur) { cur.mins += mins; cur.starts += +r[ix.starts] || 0; }
      else row.r.set(round, {
        mins, starts: +r[ix.starts] || 0, value: +r[ix.value] || null, team,
      });
    }
    out[season] = { byCode, teamPlayed, nameMisses: misses, ambiguous,
                    gw1Ts: Number.isFinite(gw1Ts) ? gw1Ts : null };
  }
  return out;
}

/* GKP (2122) og AM (2425) eru vaastav-tilbrigdi, ekki FPL-stodur. */
export function normPos(p) {
  const s = String(p || "").toUpperCase();
  if (s === "GKP") return "GK";
  if (s === "AM") return "MID";
  return s;
}

/* ---------- MAELIKVARDAR ---------- */
export const clamp01 = p => Math.min(1 - 1e-9, Math.max(1e-9, p));
export const logit = p => Math.log(clamp01(p) / (1 - clamp01(p)));
export const sigmoid = z => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
export const brier = rows => rows.reduce((a, r) => a + (r.p - r.y) ** 2, 0) / (rows.length || 1);
export const logloss = rows => -rows.reduce((a, r) =>
  a + (r.y ? Math.log(clamp01(r.p)) : Math.log(1 - clamp01(r.p))), 0) / (rows.length || 1);

export function auc(rows) {
  const pos = rows.filter(r => r.y === 1).map(r => r.p);
  const neg = rows.filter(r => r.y === 0).map(r => r.p);
  if (!pos.length || !neg.length) return null;
  /* rank-adferd, jafntefli = 0,5 */
  const all = rows.map(r => r.p).slice().sort((a, b) => a - b);
  const rank = new Map();
  for (let i = 0; i < all.length;) {
    let j = i; while (j < all.length && all[j] === all[i]) j++;
    const avg = (i + j + 1) / 2;                 // 1-baserad medalrodun
    rank.set(all[i], avg); i = j;
  }
  const sumPos = pos.reduce((a, p) => a + rank.get(p), 0);
  return (sumPos - pos.length * (pos.length + 1) / 2) / (pos.length * neg.length);
}

/* ---------- LOGISTIC (IRLS, ridge 1e-6) ---------- */
export function fitLogistic(X, y, iters = 60) {
  const n = X.length, k = X[0].length;
  let b = new Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    const g = new Array(k).fill(0);
    const H = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < n; i++) {
      let z = 0; for (let j = 0; j < k; j++) z += b[j] * X[i][j];
      const p = sigmoid(z), w = Math.max(1e-6, p * (1 - p)), e = y[i] - p;
      for (let j = 0; j < k; j++) {
        g[j] += X[i][j] * e;
        for (let l = 0; l < k; l++) H[j][l] += w * X[i][j] * X[i][l];
      }
    }
    for (let j = 0; j < k; j++) H[j][j] += 1e-6 * n;
    const d = solve(H, g);
    if (!d) break;
    let step = 1, moved = 0;
    for (let j = 0; j < k; j++) { b[j] += step * d[j]; moved = Math.max(moved, Math.abs(d[j])); }
    if (moved < 1e-9) break;
  }
  return b;
}
function solve(A, v) {
  const k = v.length, M = A.map((r, i) => r.concat([v[i]]));
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map((r, i) => r[k] / r[i]);
}

/* ---------- BOOTSTRAP, KLASAD PER LEIKMANN ----------
   THETTA ER SAMTHYKKTAR-/HOFNUNAR-STADALLINN I THESSU REPO-I
   (`tests/mo-candidates.mjs`): 400 itranir, klasar = LEIKMENN (ekki radir),
   og lidur er thess virdi ad baeta vid AÐEINS ef CI UTILOKAR NULL.
   Sama maelikvardi felldi "sleppa oheppnis-lidnum" (CI [-0,023, +0,055])
   og "snertingar i vitateig" (CI [-0,0079, +0,0389]).                     */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function bootstrapCI(clusters, stat, { iters = 400, seed = 7 } = {}) {
  const point = stat(clusters.flat());
  const rnd = mulberry32(seed), vals = [];
  for (let b = 0; b < iters; b++) {
    const pick = [];
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[(rnd() * clusters.length) | 0];
      for (const r of c) pick.push(r);
    }
    const v = stat(pick);
    if (Number.isFinite(v)) vals.push(v);
  }
  vals.sort((a, b) => a - b);
  const q = t => vals.length ? vals[Math.min(vals.length - 1, Math.floor(t * vals.length))] : NaN;
  return { point, lo: q(0.025), hi: q(0.975), n: vals.length,
           excludesZero: vals.length > 0 && (q(0.025) > 0 || q(0.975) < 0) };
}

/* Radir -> klasar per leikmann. */
export function byPlayer(rows, key = r => r.code) {
  const m = new Map();
  for (const r of rows) { const k = key(r); (m.get(k) || m.set(k, []).get(k)).push(r); }
  return [...m.values()];
}

export const fmt = (x, d = 4) => (x == null || !Number.isFinite(x) ? "  n/a  " : x.toFixed(d));
export function ci(o, d = 4) {
  return `${fmt(o.point, d)}  95% CI [${fmt(o.lo, d)}, ${fmt(o.hi, d)}]  ${o.excludesZero ? "EXCLUDES 0" : "INCLUDES 0"}`;
}
