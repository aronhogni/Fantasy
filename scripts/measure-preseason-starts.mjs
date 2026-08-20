/* ============================================================
   B. SPA AEFINGALEIKJA-MINUTUR FYRIR BYRJUN I GW1?

   EKKI I `npm test`, EKKI I PIPELINE, ENGIR LYKLAR. Keyrsla:
       node scripts/measure-preseason-starts.mjs
       node scripts/measure-preseason-starts.mjs --summers 2024,2025 --iters 400
       node scripts/measure-preseason-starts.mjs --json [SLOD]

   SPURNING EIGANDANS: "Tzolis er buinn ad byrja alla aefingaleiki og byrjadi
   sidasta leik i Community Shield sem menn nota oftast sterkasta lidid sitt."

   HVERS VEGNA ThETTA ER SOGULEGA MAELANLEGT — ANDSTAETT ThVI SEM STOD:
   CLAUDE.md kafli 6 segir FotMob "404/gated"; kafli 10 og
   `measure-friendly-form.mjs` segja ad krossprófunin hafi ALDREI haft gogn
   og ad staðan se `UNVERIFIED`. Slodin faerdist (`/api/matchDetails` -> 404,
   `/api/data/matchDetails` -> 200) og — thad sem skiptir mali her —
   `/api/data/matches?date=` svarar 200 fyrir SOGULEGAR dagsetningar.
   Maelt 20.8.2026 an tokens, med venjulegum UA:
     20210724 200 · 20220723 200 · 20230729 200 · 20240727 200 · 20250726 200
   og hver theirra ber "Club Friendlies" med 38-64 leikjum. Sumarid 2025 eitt
   gefur 437 aefingaleiki i 1.7.-16.8. glugganum.
   ThESS VEGNA ER ThETTA EKKI "adeins framvirkt prof". Vid hofum FIMM sumur
   og fjogur-fimm GW1 til ad maela GEGN — sama uppbygging og kafli C.

   ThAD SEM ER MAELT ER DELTA OFAN A ThAD SEM VID HOFUM ThEGAR:
     · Hopur A (a start-window rod): base = logit(p_model). Vinnur aefingin
       ofan a hana?
     · Hopur B (ENGIN rod — Tzolis-hopurinn, 632 leikmenn a fjorum
       timabilamotum, 19,3% af ollum GW1-byrjunarmonnum): base = VERD EITT,
       thvi thad er thad EINA sem til er. Maelt i kafla C: verd eitt gefur
       AUC 0,597 og d Brier gegn fasta med CI sem inniheldur null — thad er
       ekki gólf, thad er ekkert.

   MORK OG xG UR AEFINGALEIKJUM ERU EKKI MAELD HER. Thau eru thegar
   MAELD OG FELLD (haus `measure-friendly-form.mjs`: "minuturnar eru
   merkid, morkin ekki") og CLAUDE.md kafli 4 fellir form innan leikmanns.

   AFMORKUN: aefingaleikja-minutur eru ekki jafngildar. 45 minutur i
   Community Shield eru annad en 45 gegn utandeildarlidi. Skriftan skrair
   ThVI hvort leikurinn var i "Club Friendlies" eda i keppni med nafni
   (Community Shield, Summer Series) og maelir badar utgafur.
   ============================================================ */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { startFeatures, startProbability, nameScore } from "../src/stats.js";
import {
  loadPanel, SEASONS, isStart, logit, sigmoid, brier, logloss, auc,
  fitLogistic, bootstrapCI, byPlayer, ci, fmt,
} from "./start-panel.mjs";

const argv = process.argv.slice(2);
const ITERS = +(argv[argv.indexOf("--iters") + 1] || 400) || 400;
const WRITE = argv.includes("--json");
const NOW = argv.includes("--now");
/* `--covered`: adeins klubb-timabil sem FotMob a >= 2 lineups fyrir.
   HVERS VEGNA ThAD ER ONNUR SPURNING OG EKKI SVINDL: pooled-talan blandar
   saman "merkid er svakt" og "gognin voru ekki til" (23 af 80 klubb-timabilum
   eiga NULL lineups). Bædi tolur eru birtar: pooled er VARFAERNA talan,
   `--covered` er thad sem er i boði thegar gognin ERU til — og sumarid 2026
   hefur fulla thekju (20 af 20 klubbum), svo hun er sú sem gildir i dag. */
const COVERED = argv.includes("--covered");
/* SJALFGEFID 2022-2025, EKKI 2021. Sumarid 2021 hefur ENGIN "fyrra
   timabil" i `data/` (elsta skrain er `player_gw_2122.json`), svo hver
   einasti leikmadur thess sumars myndi lenda i hop B — hopnum sem er
   SKILGREINDUR sem "engin start-window rod". Thad vaeri 573 fals-B-radir
   sem lita eins ut og maeling. Somu fjogur timabilamot og kafli C. */
const SUMMERS = (argv.includes("--summers")
  ? argv[argv.indexOf("--summers") + 1].split(",")
  : ["2022", "2023", "2024", "2025"]).map(Number);
/* sumar YYYY -> timabilid sem byrjar tha */
const SEASON_OF = { 2021: "2122", 2022: "2223", 2023: "2324", 2024: "2425", 2025: "2526", 2026: "2627" };

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
         + "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const FM = "https://www.fotmob.com/api/data";
const CACHE = join(tmpdir(), "fpl-preseason-cache");
mkdirSync(CACHE, { recursive: true });

/* ============================================================
   KLUBBAR ERU FESTIR A FOTMOB-ID, EKKI A NAFNI — TVAER VILLUR KOSTUDU ThETTA

   1. `matches?date=` ber SKAMMSTAFAD nafn ("Man City") en `lineup`-hnuturinn
      i matchDetails ber LANGT nafn ("Manchester City"). Fyrsta utgafan fletti
      upp langa nafninu i skammstofudu toflunni, fekk `undefined` og
      `continue` — ThOGULT. Maelt: 22 af 80 klubb-timabilum fengu NULL
      lineups (Man City, Man United, Tottenham, Newcastle, Wolves ...) og
      "seen in a preseason match" var 26% i stad 54%.
   2. VERRA: **"Arsenal" i FotMob er TVEIR KLUBBAR.** Maelt 20.8.2026 a
      sumrinu 2026: af 13 leikjum undir nafninu "Arsenal" eru **SEX** i
      russnesku "First League" — thad er FC Arsenal Tula. Nafna-porun hefdi
      talid lineups russnesks 2. deildarlids sem forleik Arsenal, og enginn
      vordur hefdi kvartad. Sama aett og fuzzy-porunin sem fell Man United
      inn i Man City (`BSD_TEAM`, CLAUDE.md kafli 6).

   ThESS VEGNA: `leagues?id=47&season=YYYY/YYYY` gefur EXAKT 20 klubba
   thess timabils med FotMob-id (Arsenal = 9825). Vorpunin er id -> FPL-nafn
   og hun er EINKVAEM. Nafnid er notad ADEINS i hand-stadfestri toflu ur
   LONGU nofnunum sem thad endapunktur skilar, og vordurinn deyr ef eitt
   theirra 20 vantar.
   ============================================================ */
const LONG_TO_FPL = {
  "Arsenal": "Arsenal", "Aston Villa": "Aston Villa",
  "AFC Bournemouth": "Bournemouth", "Bournemouth": "Bournemouth",
  "Brentford": "Brentford", "Brighton & Hove Albion": "Brighton",
  "Coventry City": "Coventry", "Hull City": "Hull",
  "Burnley": "Burnley", "Chelsea": "Chelsea", "Crystal Palace": "Crystal Palace",
  "Everton": "Everton", "Fulham": "Fulham", "Ipswich Town": "Ipswich",
  "Leeds United": "Leeds", "Leicester City": "Leicester", "Liverpool": "Liverpool",
  "Luton Town": "Luton", "Manchester City": "Man City",
  "Manchester United": "Man United", "Newcastle United": "Newcastle",
  "Norwich City": "Norwich", "Nottingham Forest": "Nott'm Forest",
  "Sheffield United": "Sheffield United", "Southampton": "Southampton",
  "Sunderland": "Sunderland", "Tottenham Hotspur": "Tottenham",
  "Watford": "Watford", "West Ham United": "West Ham",
  "Wolverhampton Wanderers": "Wolves",
};

async function cachedJson(url, file) {
  const path = join(CACHE, file);
  if (existsSync(path)) {
    try { return JSON.parse(readFileSync(path, "utf8")); } catch { /* skemmd cache */ }
  }
  /* TIMAMORK ERU SKYLDA (`tests/wiring.mjs`). FotMob svarar venjulega a
     innan vid sekundu; 30 s er rifleg efri mork, ekki stilltur fasti.   */
  const res = await fetch(url, { headers: { "User-Agent": UA },
                                 signal: AbortSignal.timeout(30000) });
  if (!res.ok) { writeFileSync(path, JSON.stringify({ __http: res.status })); return { __http: res.status }; }
  const j = await res.json();
  writeFileSync(path, JSON.stringify(j));
  return j;
}

/* FotMob-id -> FPL-nafn, per timabil. */
async function clubIds(summer) {
  const y = summer, tag = `${y}%2F${y + 1}`;
  const j = await cachedJson(`${FM}/leagues?id=47&season=${tag}`, `pl_${y}.json`);
  if (j.__http) throw new Error(`leagues?id=47 season ${y}/${y + 1}: HTTP ${j.__http}`);
  const rows = j.table?.[0]?.data?.table?.all || j.table?.[0]?.data?.table || [];
  const map = new Map(); const unknown = [];
  for (const t of rows) {
    const fpl = LONG_TO_FPL[t.name];
    if (!fpl) { unknown.push(t.name); continue; }
    map.set(t.id, fpl);
  }
  if (unknown.length) throw new Error(`LONG_TO_FPL is missing: ${unknown.join(", ")}`);
  if (map.size !== 20) throw new Error(`season ${y}/${y + 1}: got ${map.size} clubs, expected 20`);
  return map;
}

/* ============================================================
   1. FINNA LEIKINA
   ============================================================ */
function dates(year) {
  const out = [];
  for (const d = new Date(Date.UTC(year, 5, 25)); d <= new Date(Date.UTC(year, 7, 25));
       d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  return out;
}

const panel = await loadPanel();
const fixtures = [];
const comps = new Map();
for (const y of SUMMERS) {
  const season = SEASON_OF[y];
  const ids = await clubIds(y);
  /* MORKIN: adeins leikir FYRIR fyrsta PL-leik timabilsins. Leikur eftir
     thad er ekki forspa. Dagsetningin kemur ur okkar eigin gognum. */
  const cutoff = panel[season].gw1Ts;
  let n = 0, http = 0, late = 0;
  for (const ds of dates(y)) {
    const j = await cachedJson(`${FM}/matches?date=${ds}`, `matches_${ds}.json`);
    if (j.__http) { http++; continue; }
    for (const l of j.leagues || []) {
      if (+l.primaryId === 47 || +l.id === 47) continue;        // PL sjalf
      for (const m of l.matches || []) {
        const a = ids.get(m.home?.id), b = ids.get(m.away?.id);
        if (!a && !b) continue;
        const ts = m.status?.utcTime ? Date.parse(m.status.utcTime) : null;
        if (cutoff != null && ts != null && ts >= cutoff) { late++; continue; }
        fixtures.push({ summer: y, season, matchId: m.id, comp: l.name,
                        homeFpl: a || null, awayFpl: b || null,
                        teams: [a, b].filter(Boolean), utc: m.status?.utcTime || null,
                        finished: !!m.status?.finished });
        comps.set(l.name, (comps.get(l.name) || 0) + 1);
        n++;
      }
    }
  }
  console.log(`summer ${y} -> season ${season}: ${n} fixtures before the GW1 cutoff ` +
    `(${cutoff ? new Date(cutoff).toISOString().slice(0, 10) : "none"}), ` +
    `${late} dropped as too late, ${http} date requests failed`);
}
console.log("competitions included (a domestic league here would mean a wrong club got in):");
for (const [k, v] of [...comps].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);

/* VORDUR: hvert PL-lid hvers timabils verdur ad finnast. Lid an leikja er
   klubbur sem FotMob geymir ekki forleik fyrir — og thad ma ekki vera thogult. */
console.log("\nGUARD — PL clubs with NO preseason fixture found:");
let guardFail = 0;
for (const y of SUMMERS) {
  const season = SEASON_OF[y];
  const plTeams = new Set([...panel[season].byCode.values()]
    .flatMap(p => [...p.r.values()].map(g => g.team)));
  const found = new Set(fixtures.filter(f => f.summer === y).flatMap(f => f.teams));
  const missing = [...plTeams].filter(t => !found.has(t));
  if (missing.length) { guardFail += missing.length; console.log(`  ${season}: ${missing.join(", ")}`); }
  else console.log(`  ${season}: none — all 20 clubs found`);
}

/* ============================================================
   2. LEIKMENN OG MINUTUR
   ============================================================ */
function minutesOf(pl, started) {
  const ev = pl.performance?.substitutionEvents || [];
  const out = ev.find(e => e.type === "subOut"), inn = ev.find(e => e.type === "subIn");
  if (started) return out ? Math.max(0, Math.min(90, out.time)) : 90;
  if (inn) return Math.max(0, 90 - Math.min(90, inn.time));
  return 0;                       // a bekknum, kom ekki inn
}

const pre = new Map();            // `${season}|${team}|${fotmobName}` -> agg
let mdOk = 0, mdFail = 0, sideUsed = 0, sideSkipped = 0, sideEmpty = 0;
const lineupsPerClub = new Map();
for (const f of fixtures) {
  if (!f.finished) continue;
  const j = await cachedJson(`${FM}/matchDetails?matchId=${f.matchId}`, `md_${f.matchId}.json`);
  if (j.__http || !j.content?.lineup) { mdFail++; continue; }
  mdOk++;
  for (const side of ["homeTeam", "awayTeam"]) {
    const t = j.content.lineup[side]; if (!t) continue;
    const fpl = side === "homeTeam" ? f.homeFpl : f.awayFpl;
    if (!fpl) { sideSkipped++; continue; }
    if (!(t.starters || []).length) { sideEmpty++; continue; }
    sideUsed++;
    const rows = [...(t.starters || []).map(p => [p, true]),
                  ...(t.subs || []).map(p => [p, false])];
    for (const [p, st] of rows) {
      const mins = minutesOf(p, st);
      const key = `${f.season}|${fpl}|${p.name}`;
      let e = pre.get(key);
      if (!e) pre.set(key, e = { season: f.season, team: fpl, name: p.name, fmId: p.id,
        games: 0, starts: 0, mins: 0, lastMins: 0, lastStart: 0, cupStarts: 0, cupGames: 0,
        utcLast: 0 });
      e.games++; e.mins += mins;
      if (st) e.starts++;
      /* "Sterkasta lidid": keppni med NAFNI (Community Shield, Summer Series)
         a moti berum "Club Friendlies". */
      if (!/club friendlies/i.test(f.comp || "")) { e.cupGames++; if (st) e.cupStarts++; }
      const ts = f.utc ? Date.parse(f.utc) : 0;
      if (ts >= e.utcLast) { e.utcLast = ts; e.lastMins = mins; e.lastStart = st ? 1 : 0; }
    }
    lineupsPerClub.set(`${f.season}|${fpl}`, (lineupsPerClub.get(`${f.season}|${fpl}`) || 0) + 1);
  }
}
console.log(`\nmatchDetails ok ${mdOk}, failed/no lineup node ${mdFail}, ` +
            `lineup sides used ${sideUsed}, empty ${sideEmpty}, unmapped opponent ${sideSkipped}`);
console.log(`distinct preseason player-seasons ${pre.size}`);

/* VORDUR 2 — ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b).
   Klubbur med NULL lineups er ekki "klubbur sem spiladi ekki"; hann er
   nafn sem hvarf einhvers stadar a leidinni. Talan er PRENTUD berum orðum
   per klubb-timabil svo hun geti hrunid synilega. */
console.log("\nCOVERAGE — preseason lineups found per club-season:");
{
  let zero = 0, tot = 0;
  for (const y of SUMMERS) {
    const season = SEASON_OF[y];
    const clubs = [...new Set([...panel[season].byCode.values()]
      .flatMap(p => [...p.r.values()].map(g => g.team)))].sort();
    const line = clubs.map(c => {
      const n = lineupsPerClub.get(`${season}|${c}`) || 0;
      tot++; if (!n) zero++;
      return `${c}:${n}`;
    }).join("  ");
    console.log(`  ${season}  ${line}`);
  }
  console.log(`  club-seasons with ZERO lineups: ${zero} of ${tot}` +
    `${zero > tot * 0.25 ? "  <-- COVERAGE IS THIN; every 'not seen' row below is contaminated" : ""}`);
}

/* ============================================================
   3. PORUN VID FPL — NAFN INNAN KLUBBS, SKORAD MED `nameScore`
   ============================================================ */
const rows = [];
const matchStats = { matched: 0, unmatched: 0, noFpl: 0 };
for (const y of SUMMERS) {
  const season = SEASON_OF[y];
  const P = panel[season];
  /* FPL-leikmenn thessa timabils per lid (lid = lidid i GW1-rodinni theirra,
     annars fyrsta rod sem finnst). */
  const byTeam = new Map();
  for (const p of P.byCode.values()) {
    const g1 = p.r.get(1) || [...p.r.values()][0];
    if (!g1) continue;
    (byTeam.get(g1.team) || byTeam.set(g1.team, []).get(g1.team)).push({ p, g1 });
  }

  /* Fyrra timabil — til ad vita hvor hopur (A/B) hver leikmadur er i. */
  const prevKey = SEASONS[SEASONS.indexOf(season) - 1];
  const PREV = prevKey ? panel[prevKey] : null;

  const used = new Set();
  for (const [team, list] of byTeam) {
    const cands = [...pre.values()].filter(e => e.season === season && e.team === team);
    for (const { p, g1 } of list) {
      /* PORUN: haesta `nameScore` innan klubbsins, >= 1,5 (eitt sameiginlegt
         tak PLUS sama eftirnafn). Lægri throskuldur pardi "Danny Ings" vid
         "Danny Ward". Hver FotMob-rod nyttar mest EINU SINNI. */
      let best = null, bestS = 0;
      for (const c of cands) {
        if (used.has(c)) continue;
        const s = Math.max(nameScore(p.name, c.name), nameScore(p.webName, c.name));
        if (s > bestS) { bestS = s; best = c; }
      }
      const hit = bestS >= 1.5 ? best : null;
      if (hit) { used.add(hit); matchStats.matched++; } else matchStats.unmatched++;

      /* GW1-utkoman */
      if (!p.r.get(1)) continue;
      const gw1 = p.r.get(1);
      if (!P.teamPlayed.has(`1|${gw1.team}`)) continue;

      /* Hopur A eda B? Sama skilgreining og `measure-tail-to-gw1.mjs`. */
      let pm = null;
      const old = PREV ? PREV.byCode.get(p.code) : null;
      if (old) {
        const series = [];
        for (const r of [34, 35, 36, 37, 38]) { const g = old.r.get(r); if (g) series.push(g.mins); }
        if (series.length >= 2) pm = startProbability(startFeatures(series, gw1.value));
      }

      rows.push({
        code: p.code, name: p.webName, season, summer: y, team, pos: p.pos,
        value: gw1.value, y: isStart(gw1.mins) ? 1 : 0,
        pm, cohort: pm == null ? "B" : "A",
        preGames: hit ? hit.games : 0, preStarts: hit ? hit.starts : 0,
        preMins: hit ? hit.mins : 0, lastMins: hit ? hit.lastMins : 0,
        lastStart: hit ? hit.lastStart : 0,
        cupStarts: hit ? hit.cupStarts : 0, cupGames: hit ? hit.cupGames : 0,
        seen: hit ? 1 : 0,
      });
    }
  }
}
console.log(`name match inside club: matched ${matchStats.matched}, unmatched ${matchStats.unmatched}`);
console.log(`GW1 rows ${rows.length} · seen in >=1 preseason match ${rows.filter(r => r.seen).length} ` +
            `(${fmt(rows.filter(r => r.seen).length / rows.length, 3)})`);

/* ============================================================
   4. HRA MYNDIN
   ============================================================ */
console.log("\n=== RAW: preseason start share vs actual GW1 start ===");
for (const coh of ["A", "B"]) {
  const seg = rows.filter(r => r.cohort === coh);
  console.log(`\ncohort ${coh}: n ${seg.length}, seen ${seg.filter(r => r.seen).length}, ` +
              `GW1 start rate ${fmt(seg.reduce((a, r) => a + r.y, 0) / seg.length, 3)}`);
  const bands = [["not seen at all", r => !r.seen],
                 ["seen, 0 starts", r => r.seen && r.preStarts === 0],
                 ["1-2 starts", r => r.preStarts >= 1 && r.preStarts <= 2],
                 ["3-4 starts", r => r.preStarts >= 3 && r.preStarts <= 4],
                 ["5+ starts", r => r.preStarts >= 5],
                 ["started the LAST friendly", r => r.lastStart === 1],
                 ["started a NAMED competition (Shield/Summer Series)", r => r.cupStarts >= 1]];
  for (const [label, f] of bands) {
    const s = seg.filter(f);
    if (!s.length) { console.log(`  ${label.padEnd(50)} n 0`); continue; }
    console.log(`  ${label.padEnd(50)} n ${String(s.length).padStart(4)}  ` +
      `GW1 start ${fmt(s.reduce((a, r) => a + r.y, 0) / s.length, 3)}  ` +
      `mean price ${fmt((s.reduce((a, r) => a + (r.value || 45), 0) / s.length) / 10, 2)}`);
  }
}

/* ============================================================
   5. DELTA — LOSO YFIR SUMUR
   ============================================================ */
function losoRows(seg, feats, groupKey = "summer") {
  const out = [];
  const groups = [...new Set(seg.map(r => r[groupKey]))];
  for (const g of groups) {
    const tr = seg.filter(r => r[groupKey] !== g), te = seg.filter(r => r[groupKey] === g);
    if (tr.length < 40 || !te.length) continue;
    const b = fitLogistic(tr.map(r => [1, ...feats.map(f => f(r))]), tr.map(r => r.y));
    for (const r of te) {
      const x = [1, ...feats.map(f => f(r))];
      out.push({ code: r.code, y: r.y, p: sigmoid(x.reduce((a, v, i) => a + v * b[i], 0)), row: r });
    }
  }
  return out;
}
const PRICE = r => (r.value || 45) / 10;
const PRE = [
  r => r.seen,
  r => r.preGames ? r.preStarts / r.preGames : 0,
  r => r.preMins / 90,
  r => r.lastStart,
];

if (COVERED) {
  const before = rows.length;
  const keep = new Set([...lineupsPerClub].filter(([, v]) => v >= 2).map(([k]) => k));
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!keep.has(`${rows[i].season}|${rows[i].team}`)) rows.splice(i, 1);
  }
  console.log(`\n--covered: kept ${rows.length} of ${before} rows ` +
    `(${keep.size} club-seasons with >= 2 preseason lineups)`);
}

console.log("\n=== DELTA over what we already have (LOSO across summers) ===");
const results = [];
for (const [coh, base, baseLabel] of [
  ["B", [PRICE], "price only (all cohort B has)"],
  ["A", [r => logit(r.pm), PRICE], "logit(p_model) + price"],
  ["*", [r => (r.pm == null ? 0 : logit(r.pm)), r => (r.pm == null ? 1 : 0), PRICE],
        "logit(p_model) + missing-flag + price"],
]) {
  const seg = coh === "*" ? rows : rows.filter(r => r.cohort === coh);
  if (seg.length < 80) { console.log(`\ncohort ${coh}: n ${seg.length} — too few`); continue; }
  const b0 = losoRows(seg, base), b1 = losoRows(seg, [...base, ...PRE]);
  if (!b0.length || !b1.length) continue;
  const pair = b1.map((r, i) => ({ code: r.code, y: r.y, pb: b0[i].p, pt: r.p }));
  const d = a => a.reduce((s, r) => s + ((r.pb - r.y) ** 2 - (r.pt - r.y) ** 2), 0) / a.length;
  const bt = bootstrapCI(byPlayer(pair), d, { iters: ITERS, seed: 81 });
  const bconst = seg.reduce((a, r) => a + r.y, 0) / seg.length;
  console.log(`\ncohort ${coh}  n ${seg.length}  base = ${baseLabel}`);
  console.log(`  constant     Brier ${fmt(brier(seg.map(r => ({ p: bconst, y: r.y }))))}`);
  console.log(`  base         Brier ${fmt(brier(b0))}  AUC ${fmt(auc(b0))}`);
  console.log(`  base + preseason  Brier ${fmt(brier(b1))}  AUC ${fmt(auc(b1))}`);
  console.log(`  d Brier ${ci(bt, 5)}`);
  console.log(`  VERDICT: ${bt.excludesZero && bt.point > 0 ? "ACCEPT" : "REJECT"} by the CI-excludes-zero standard`);
  results.push({ cohort: coh, n: seg.length, base: baseLabel, dBrier: bt,
                 brierBase: brier(b0), brierTest: brier(b1), aucBase: auc(b0), aucTest: auc(b1) });

  /* Hvad hver einstakur lidur gerir — til ad sja hvort einn beri thad allt. */
  for (const [label, f] of [["seen at all", PRE[0]], ["start share", PRE[1]],
                            ["total minutes", PRE[2]], ["started last friendly", PRE[3]],
                            ["named-competition starts", r => r.cupStarts]]) {
    const b2 = losoRows(seg, [...base, f]);
    if (!b2.length) continue;
    const pr = b2.map((r, i) => ({ code: r.code, y: r.y, pb: b0[i].p, pt: r.p }));
    const bb = bootstrapCI(byPlayer(pr), d, { iters: ITERS, seed: 82 });
    console.log(`    + ${label.padEnd(26)} Brier ${fmt(brier(b2))}  d ${ci(bb, 5)}`);
  }
}

if (guardFail) console.log(`\nWARNING: ${guardFail} club-seasons found no fixture — see GUARD above.`);

if (WRITE) {
  const i = argv.indexOf("--json"), nxt = argv[i + 1];
  const target = nxt && !nxt.startsWith("-")
    ? resolve(process.cwd(), nxt) : join(tmpdir(), "fpl-measure", "preseason-starts.json");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify({ measured: new Date().toISOString(),
    summers: SUMMERS, fixtures: fixtures.length, mdOk, mdFail, rows: rows.length,
    seen: rows.filter(r => r.seen).length, iters: ITERS, results }, null, 2));
  console.log(`\nwrote ${target}`);
}


/* ============================================================
   7. `--now` — SAMA SOKN A SUMRINU SEM ER NYLIDID, GEGN LIFANDI `data/`.
   Maelingin her fyrir ofan segir hvad merkid er thess virdi; thessi kafli
   segir hvort thad se TIL i dag. Ekkert er skrifad i `data/`.
   ============================================================ */
if (NOW) {
  const Y = 2026;
  const dataDir = new URL("../data/", import.meta.url).pathname;
  const ev = JSON.parse(readFileSync(join(dataDir, "events.json"), "utf8"));
  const evs = ev.events || ev;
  const gw1 = (Array.isArray(evs) ? evs : Object.values(evs)).find(e => +e.id === 1);
  const cutoff = gw1?.deadline_time ? Date.parse(gw1.deadline_time) : null;
  console.log(`\n\n=== --now : summer ${Y}, cutoff = GW1 deadline ${gw1?.deadline_time} ===`);

  const ids = await clubIds(Y);
  const fx = [];
  for (const ds of dates(Y)) {
    const j = await cachedJson(`${FM}/matches?date=${ds}`, `matches_${ds}.json`);
    if (j.__http) continue;
    for (const l of j.leagues || []) {
      if (+l.primaryId === 47 || +l.id === 47) continue;
      for (const m of l.matches || []) {
        const a = ids.get(m.home?.id), b = ids.get(m.away?.id);
        if (!a && !b) continue;
        const ts = m.status?.utcTime ? Date.parse(m.status.utcTime) : null;
        if (cutoff != null && ts != null && ts >= cutoff) continue;
        fx.push({ matchId: m.id, comp: l.name, homeFpl: a || null, awayFpl: b || null,
                  utc: m.status?.utcTime, finished: !!m.status?.finished });
      }
    }
  }
  console.log(`fixtures before the deadline: ${fx.length} (finished ${fx.filter(f => f.finished).length})`);

  const agg = new Map();      // `${team}|${fotmobName}`
  let sides = 0;
  for (const f of fx) {
    if (!f.finished) continue;
    const j = await cachedJson(`${FM}/matchDetails?matchId=${f.matchId}`, `md_${f.matchId}.json`);
    if (j.__http || !j.content?.lineup) continue;
    for (const side of ["homeTeam", "awayTeam"]) {
      const t = j.content.lineup[side]; if (!t) continue;
      const fpl = side === "homeTeam" ? f.homeFpl : f.awayFpl;
      if (!fpl || !(t.starters || []).length) continue;
      sides++;
      for (const [pl, st] of [...(t.starters || []).map(x => [x, true]),
                              ...(t.subs || []).map(x => [x, false])]) {
        const k = `${fpl}|${pl.name}`;
        let e = agg.get(k);
        if (!e) agg.set(k, e = { team: fpl, name: pl.name, games: 0, starts: 0, mins: 0,
                                 lastStart: 0, lastMins: 0, lastComp: "", utcLast: 0 });
        e.games++; e.starts += st ? 1 : 0; e.mins += minutesOf(pl, st);
        const ts = f.utc ? Date.parse(f.utc) : 0;
        if (ts >= e.utcLast) { e.utcLast = ts; e.lastStart = st ? 1 : 0;
                               e.lastMins = minutesOf(pl, st); e.lastComp = f.comp; }
      }
    }
  }
  console.log(`lineup sides ${sides}, preseason players ${agg.size}`);
  const perClub = new Map();
  for (const e of agg.values()) perClub.set(e.team, (perClub.get(e.team) || 0) + 1);
  console.log([...perClub].sort().map(([k, v]) => `${k}:${v}`).join("  "));

  /* Lifandi FPL-hopur og hverjir eiga ENGA start-window rod. */
  const players = JSON.parse(readFileSync(join(dataDir, "players.json"), "utf8")).players;
  const imm = JSON.parse(readFileSync(join(dataDir, "imminent.json"), "utf8"));
  const haveFeats = new Set(Object.values(imm.players).map(e => String(e.code)));
  const TEAM_BY_ID = {};
  for (const e of Object.values(imm.players)) TEAM_BY_ID[e.team] = e.team;
  /* lid-id -> FPL-nafn: ur imminent (skammstofun) er ekki nog; notum
     `fixtures.json`-lausa leid: parum eftir stodu i players.json + BSD er
     ekki til her, svo vid notum SKAMMSTOFUN -> FPL-nafn toflu. */
  const SHORT_TO_FPL = { ARS: "Arsenal", AVL: "Aston Villa", BOU: "Bournemouth",
    BRE: "Brentford", BHA: "Brighton", BUR: "Burnley", CHE: "Chelsea",
    CRY: "Crystal Palace", EVE: "Everton", FUL: "Fulham", LEE: "Leeds",
    LIV: "Liverpool", MCI: "Man City", MUN: "Man United", NEW: "Newcastle",
    NFO: "Nott'm Forest", SUN: "Sunderland", TOT: "Tottenham", WHU: "West Ham",
    WOL: "Wolves", COV: "Coventry", HUL: "Hull", IPS: "Ipswich", LEI: "Leicester",
    SOU: "Southampton" };
  const teamOfId = new Map();
  for (const e of Object.values(imm.players)) {
    const p = players.find(x => +x.code === +e.code);
    if (p) teamOfId.set(p.team, SHORT_TO_FPL[e.team] || e.team);
  }

  const rowsNow = [];
  for (const p of players) {
    const club = teamOfId.get(p.team);
    if (!club) continue;
    const cands = [...agg.values()].filter(e => e.team === club);
    let best = null, bestS = 0;
    for (const c of cands) {
      const s = Math.max(nameScore(`${p.first_name} ${p.second_name}`, c.name),
                         nameScore(p.web_name, c.name));
      if (s > bestS) { bestS = s; best = c; }
    }
    const hit = bestS >= 1.5 ? best : null;
    rowsNow.push({ name: p.web_name, club, cost: p.now_cost, status: p.status,
                   hasFeats: haveFeats.has(String(p.code)),
                   starts: hit ? hit.starts : null, games: hit ? hit.games : null,
                   mins: hit ? hit.mins : null, lastStart: hit ? hit.lastStart : null,
                   lastComp: hit ? hit.lastComp : null });
  }
  const noFeat = rowsNow.filter(r => !r.hasFeats);
  console.log(`\nlive squad ${rowsNow.length} · WITHOUT a start-window row ${noFeat.length} ` +
    `· of those, found in >=1 preseason match ${noFeat.filter(r => r.starts != null).length}`);
  console.log("\nNO-NUMBER COHORT, priced >= 5.0m, sorted by preseason starts:");
  console.log("player            club            price  status  pre starts/games  mins  started last  last comp");
  for (const r of noFeat.filter(r => r.cost >= 50)
       .sort((a, b) => (b.starts ?? -1) - (a.starts ?? -1) || b.cost - a.cost)) {
    console.log(`${r.name.padEnd(17)} ${r.club.padEnd(15)} ${(r.cost / 10).toFixed(1)}   ${r.status}   ` +
      `${r.starts == null ? "   not seen   " : `${String(r.starts).padStart(6)}/${String(r.games).padEnd(6)}`}` +
      `  ${r.mins == null ? "  - " : String(r.mins).padStart(4)}   ` +
      `${r.lastStart == null ? "   -   " : (r.lastStart ? "  YES  " : "   no  ")}  ${r.lastComp || ""}`);
  }
}
