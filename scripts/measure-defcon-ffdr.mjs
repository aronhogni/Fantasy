/* ============================================================
   DEFCON-MIDJUMENN OG FFDR-HALLINN — ENDURMAELT MED DEFCON-STIGAGJOF LIFANDI
   (20.8.2026, handvirk maelingaskrifta — EKKI i `npm test`, EKKI i pipeline)

   Keyrsla:  node scripts/measure-defcon-ffdr.mjs
             node scripts/measure-defcon-ffdr.mjs --json /tmp/dc-ffdr.json

   ATHUGASEMDIR ERU A ISLENSKU (rokstudningur, kafli 9 i CLAUDE.md);
   ALLIR PRENTADIR STRENGIR ERU A ENSKU — sama snid og
   `measure-box-touches.mjs` og `measure-preseason-starts.mjs`. Ordalistinn
   i `no-icelandic.mjs` kafla D er skradur sem STADNANDI i skjalinu sjalfu,
   svo "vordurinn slapp thad" er ekki rettlaeting.

   SPURNINGIN (eiganda): "aetti DC-midjumadur ekki ad fa FLEIRI stig i
   ERFIDARI leik? Sangare a moti A.Villa uti i GW6."

   HVERS VEGNA ENDURMAELT, OG HVERS VEGNA THETTA ER ONNUR SPURNING EN THAER
   TVAER SEM CLAUDE.md KAFLI 4 HEFUR THEGAR AFGREITT:

     (a) "Varnarsinnadir midjumenn fa varnar-FFDR" (MAELINGAR 3, 28.7.2026)
         spurdi HVOR FFDR-BREYTAN spair betur — varnar (useDef) eda soknar.
         Skilgreiningin var LAGT xGI/90 ur FYRRA timabili (proxy, ekki DC),
         og laugin var 2223-2526: 2025/26 var INNI en thynnt ~4:1 af
         timabilum thar sem DefCon gaf NULL stig.
     (b) `tests/defcon-mid.mjs` (29.7.2026) spurdi SOMU spurningu med RETTU
         skilgreiningunni (raun-DefCon) a 2025/26 einu.

   HVORUG SPYR THESS SEM EIGANDINN SPYR. `expPointsFor` notar EKKI r; hun
   notar HALLANN — lookupPos(3,"pts",d)/POS_MEAN_PTS[3]. Tvaer breytur geta
   haft sama r og ALLT annan halla, svo (a) og (b) svara henni ekki.

   HORD SKORDA: DefCon-STIG eru adeins til 2025/26 (FPL-nyjung). Eldri
   maelingar voru fittadar i heimi thar sem varnaradgerdir gafu NULL stig,
   svo "DC-madur fekk engin extra stig i erfidum leik" var THAR RETT AF
   BYGGINGU. Thetta er thvi endurmaeling a NYRRI stigagjof, ekki
   endurupptaka a gamalli akvordun. Kafli 0 sannreynir ad stigin seu til.

   TVAER GILDRUR SEM THETTA SVID HEFUR THEGAR FALLID A:
     · NEFNARINN ER BYRJANIR, EKKI LEIKIR (lagad 17.8.2026, +40% — hver
       innkoma af bekknum taldist "miss" thott throskuldurinn se
       onaedanlegur a 15 minutum). Hver rod her er BYRJUN (`starts >= 1`).
     · MARKMENN FA ENGIN DEFCON-STIG (757 umferdir, 750 byrjanir, 0 stig).
       Adeins MID her, svo thad kemur ekki vid — en ekki afrita thessa
       skriftu yfir a DEF/GK an thess ad lesa kafla 12 i CLAUDE.md.

   MAELIKVARDINN: bootstrap KLASAD PER LEIKMANN, 400 itranir, CI verdur ad
   utiloka null (`tests/mo-candidates.mjs`-stadallinn; sami maelikvardi
   felldi "sleppa oheppnis-lidnum" og "snertingar i vitateig").
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloFor, corr,
} from "../tests/lib/e0.mjs";
import { makeFixDifficulty, tierOf, TIER_CUTS, lookupPos, POS_MEAN_PTS } from "../src/model.js";
import { bootstrapCI, byPlayer, ci, fmt } from "./start-panel.mjs";

const D = new URL("../data/", import.meta.url).pathname;
const KEY = "2526";
const OUT = {};
const argJson = process.argv.indexOf("--json");
const line = (c = "-", n = 78) => console.log(c.repeat(n));
const head = t => { console.log(""); line("="); console.log(t); line("="); };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };

/* MID DefCon-throskuldur (fetch.mjs: DEF 10, annad 12). */
const MID_TH = 12;
/* Afturvirknin ur CLAUDE.md kafla 12 / MAELINGAR 6l: K = 10, p0(MID) = 0,17. */
const SHRINK_K = 10, MID_P0 = 0.17;

/* ============================================================
   KAFLI 0 — ERU DEFCON-STIGIN RAUNVERULEGA I `pts` 2025/26?
   Ekkert her thydir neitt nema svarid se ja. Stigin eru endurbyggd ur
   thattunum og LEIFIN skodud vid DC-throskuld. Ef leifin er ekki +2 er
   thessi maeling um heim sem er ekki til.
   ============================================================ */
head("SECTION 0 - VERIFY: are DefCon points actually inside total_points for 2025/26?");
{
  const j = JSON.parse(readFileSync(`${D}player_gw_2526.json`, "utf8"));
  const I = Object.fromEntries(j.stats.map((s, i) => [s, i]));
  const G = { GK: 6, DEF: 6, MID: 5, FWD: 4 };
  const hit = {}, no = {};
  for (const c of Object.keys(j.players)) {
    const pl = j.players[c], pos = pl.p;
    for (const gw of Object.keys(pl.gw)) {
      const r = pl.gw[gw], m = r[I.mins];
      if (m <= 0) continue;
      let e = m >= 60 ? 2 : 1;
      e += r[I.goals] * G[pos] + r[I.assists] * 3;
      if (pos === "GK" || pos === "DEF") { e += r[I.cs] * 4; e -= Math.floor(r[I.gc] / 2); }
      else if (pos === "MID") e += r[I.cs];
      if (pos === "GK") e += Math.floor(r[I.saves] / 3);
      e += r[I.bonus] - r[I.yc] - 3 * r[I.rc];
      const res = r[I.pts] - e;
      const th = pos === "DEF" ? 10 : MID_TH;
      const b = (pos !== "GK" && r[I.dc] >= th) ? hit : no;
      b[res] = (b[res] || 0) + 1;
    }
  }
  const n = o => Object.values(o).reduce((a, b) => a + b, 0);
  console.log(`  threshold REACHED:     residual = +2 in ${hit[2]} of ${n(hit)} rows (${(100 * hit[2] / n(hit)).toFixed(1)}%)`);
  console.log(`  threshold NOT reached: residual =  0 in ${no[0]} of ${n(no)} rows (${(100 * no[0] / n(no)).toFixed(1)}%)`);
  console.log(`  -> DefCon points ARE in \`pts\`. The rest is penalties (-2/+5) and double gameweeks.`);
  OUT.section0 = { hitPlus2: hit[2], hitN: n(hit), noZero: no[0], noN: n(no) };
}

/* ============================================================
   FFDR PER (dagsetning, lid) FYRIR 2025/26
   `makeFixDifficulty` er FLUTT INN ur src/model.js — ALDREI endurritud
   (CLAUDE.md kafli 7: handafrit af buildTeamMetrics skrifadi NaN a 17 lid
   og merkti thad "e0" eins og thad vaeri maeling).
   ============================================================ */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const E = eloFor(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const prevRows = byKey["2425"];
const list = [...byKey[KEY]].sort((a, b) => e0Day(a.Date).localeCompare(e0Day(b.Date)));
const prevStr = buildStrength(prevRows);
const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
for (const t of teams) if (!prevStr[t]) prevStr[t] = { ...PROMO_DEFAULT };
const run = {}; for (const t of teams) run[t] = { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
const ids = {}; let nn = 1; for (const t of teams) ids[t] = nn++;
const orig = new Map(byKey[KEY].map((r, i) => [r, i]));
const FDR = fdrFor(KEY, prevRows);
const ffdr = new Map();
for (const r of list) {
  const e = E.get(KEY, orig.get(r), r.HomeTeam, r.AwayTeam);
  const mk = marketForRow(r), p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
  const mm = t => {
    const a = run[t], P = prevStr[t];
    const cur = a.n === 0
      ? { xg90: P.xg90, xgc90: P.xgc90, sotFor: P.sotFor, sotAg: P.sotAg }
      : { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n };
    return { ...cur, matches: a.n, prevGoals: P.xg90, prevConc: P.xgc90,
             prevSotFor: P.sotFor, prevSotAg: P.sotAg };
  };
  const kickoff = `${r.Date}T00:00:00Z`;
  for (const [team, opTeam, home, fdr] of [
    [r.HomeTeam, r.AwayTeam, true, p.h], [r.AwayTeam, r.HomeTeam, false, p.a],
  ]) {
    const tm = { [ids[team]]: mm(team), [ids[opTeam]]: mm(opTeam) };
    const tb = { [ids[team]]: { short: team }, [ids[opTeam]]: { short: opTeam } };
    const eb = { [ids[team]]: { elo: home ? e.h : e.a }, [ids[opTeam]]: { elo: home ? e.a : e.h } };
    const odds = mk ? { [team]: { xga: home ? mk.axg : mk.hxg, xg: home ? mk.hxg : mk.axg, opp: opTeam, kickoff } } : null;
    const f = makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds, eloByTeam: eb });
    const fx = { opp: ids[opTeam], home, fdr, kickoff };
    /* pos 3 = MID. DIFF_W[3].useDef === false -> soknar-hlidin, sem er
       nakvaemlega thad sem appid gefur midjumanni i dag.               */
    ffdr.set(`${r.Date}|${team}`, { d: f(ids[team], fx, 3), dDef: f(ids[team], fx, 2) });
  }
  const hs = run[r.HomeTeam], as = run[r.AwayTeam];
  hs.g += +r.FTHG; hs.c += +r.FTAG; hs.sf += +(r.HST || 0); hs.sa += +(r.AST || 0); hs.n++;
  as.g += +r.FTAG; as.c += +r.FTHG; as.sf += +(r.AST || 0); as.sa += +(r.HST || 0); as.n++;
}

/* ============================================================
   LEIKMANNARADIR — MID, BYRJANIR
   `fpl_player_gw.json` er notud (ekki `player_gw_2526.json`) af THVI ad
   hun ber DAGSETNINGU og LID per rod, sem er thad sem FFDR-uppflettingin
   tharf. Nafn er gildur lykill INNAN eins timabils — nafna-porunartapid
   (2,4-7,5%) er per TIMABILA-SKIL og kemur ekki vid her.
   ============================================================ */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const rows = [];
let noFfdr = 0;
for (const q of PG.seasons[KEY]) {
  if (q[H.pos] !== "MID") continue;
  if (q[H.starts] < 1) continue;                 // NEFNARINN ER BYRJANIR
  const f = ffdr.get(`${q[H.date]}|${q[H.team]}`);
  if (!f || f.d == null) { noFfdr++; continue; }
  const dc = q[H.dc] == null ? 0 : q[H.dc];
  rows.push({
    name: q[H.name], team: q[H.team], round: q[H.round], mins: q[H.mins],
    pts: q[H.pts], goals: q[H.goals], assists: q[H.assists], cs: q[H.cs],
    bonus: q[H.bonus], yc: q[H.yc], rc: q[H.rc], dc, cbit: q[H.cbit] || 0,
    hitDc: dc >= MID_TH ? 1 : 0, d: f.d, dDef: f.dDef, tier: tierOf(f.d),
  });
}

head(`POOL - MID STARTS 2025/26 (n=${rows.length}; ${noFfdr} rows dropped, no FFDR)`);
console.log(`  players: ${new Set(rows.map(r => r.name)).size}`);
console.log(`  DefCon threshold (${MID_TH}+) reached in ${rows.filter(r => r.hitDc).length} rows` +
  ` (${(100 * rows.filter(r => r.hitDc).length / rows.length).toFixed(1)}%)`);
console.log(`  points per start: ${mean(rows.map(r => r.pts)).toFixed(3)} · minutes per start ${mean(rows.map(r => r.mins)).toFixed(1)}`);
console.log(`  TIER_CUTS = [${TIER_CUTS.join(", ")}] (sextiles; tier 0 = easiest, 5 = hardest)`);
console.log(`  rows per tier: ${[0, 1, 2, 3, 4, 5].map(k => rows.filter(r => r.tier === k).length).join(" / ")}`);

/* ============================================================
   SKILGREININGIN A "DC-MADUR" — LEKALAUS, TVAER LEIDIR
   ============================================================ */
const H1 = rows.filter(r => r.round <= 19), H2 = rows.filter(r => r.round > 19);
/* (i) TIMA-HEIDARLEG: laert a GW1-19, maelt a GW20-38. */
const agg1 = {};
for (const r of H1) {
  const a = agg1[r.name] ||= { starts: 0, hits: 0, cbit: 0, mins: 0 };
  a.starts++; a.hits += r.hitDc; a.cbit += r.cbit; a.mins += r.mins;
}
/* hit_rate_adj: afturvirkjud hittni, CLAUDE.md kafli 12 / MAELINGAR 6l.
   VALIN FRAMYFIR HRAA HITTNI OG FRAMYFIR CBIRT/90 af tveimur astaedum:
     1. Hra hittni ofmaelist a litlum syni — utan repo-sins (FFS) for
        engin yfir ~57% en okkar n=10-15 gafu 75-80%.
     2. CBIRT/90 er sama merkid a odrum kvarda; fylgnin er prentud, og
        bædi eru prófuð i naemis-kaflanum (5c) svo valid er ekki knifsegg. */
const adj1 = {};
for (const [nm, a] of Object.entries(agg1)) {
  if (a.starts < 5) continue;                    // >= 5 byrjanir til ad skilgreina
  adj1[nm] = {
    raw: a.hits / a.starts,
    adj: (a.hits + SHRINK_K * MID_P0) / (a.starts + SHRINK_K),
    cbit90: a.mins > 0 ? (a.cbit * 90) / a.mins : null,
    starts: a.starts,
  };
}
{
  const nms = Object.keys(adj1);
  console.log(`\n  definition from GW1-19: ${nms.length} midfielders with >= 5 starts`);
  console.log(`  r(hit_rate_adj, cbit/90) = ${fmt(corr(nms.map(n => adj1[n].adj), nms.map(n => adj1[n].cbit90)), 3)}` +
    `  ·  r(raw, shrunk) = ${fmt(corr(nms.map(n => adj1[n].raw), nms.map(n => adj1[n].adj)), 3)}`);
}
/* (ii) LEAVE-ONE-ROW-OUT: hittni hans UR OLLUM ODRUM rodum. Notar allt
   timabilid (meiri kraftur) og hefur ENGAN sjalfsleka, en hun horfir
   fram i timann — thvi er hun AUKAMAELING, ekki hofudmaelingin.        */
const aggAll = {};
for (const r of rows) {
  const a = aggAll[r.name] ||= { starts: 0, hits: 0, cbit: 0, mins: 0 };
  a.starts++; a.hits += r.hitDc; a.cbit += r.cbit; a.mins += r.mins;
}
const looAdj = r => {
  const a = aggAll[r.name];
  if (a.starts - 1 < 5) return null;
  return (a.hits - r.hitDc + SHRINK_K * MID_P0) / (a.starts - 1 + SHRINK_K);
};

/* ============================================================
   TOL — OLS-HALLI OG INNAN-LEIKMANNS HALLI
   ============================================================ */
function slope(xs, ys) {
  const n = xs.length; if (n < 3) return NaN;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  return sxx === 0 ? NaN : sxy / sxx;
}
/* INNAN-LEIKMANNS halli: badar breytur draegar fra HANS EIGIN medaltali.
   THETTA ER RETTA FORMID A SPURNINGUNNI. Thversnid blandar tvennu saman:
   ha-DC midjumenn spila fyrir ADRA lidshelminginn (their verjast meira),
   svo thversnids-halli maelir ad hluta LIDID, ekki LEIKINN. Sama gildra
   og "heitur leikmadur" (MAELINGAR 6c): hra talan maeldi bara ad godir
   leikmenn skora oft; innan leikmanns snerist merkid vid.               */
function withinSlope(rs, xf, yf) {
  const by = new Map();
  for (const r of rs) { const k = r.name; (by.get(k) || by.set(k, []).get(k)).push(r); }
  const xs = [], ys = [];
  for (const g of by.values()) {
    if (g.length < 3) continue;
    const mx = mean(g.map(xf)), my = mean(g.map(yf));
    for (const r of g) { xs.push(xf(r) - mx); ys.push(yf(r) - my); }
  }
  return { s: slope(xs, ys), n: xs.length };
}
const clusters = rs => byPlayer(rs, r => r.name);
const withinStat = (xf, yf) => rs => withinSlope(rs, xf, yf).s;

/* ============================================================
   KAFLI 1 — HALLINN PER DC-HOPI (tima-heidarleg skilgreining)
   ============================================================ */
head("SECTION 1 - POINTS vs FFDR TIER, BY DC GROUP (GW20+, definition from GW1-19)");
const test = H2.filter(r => adj1[r.name]).map(r => ({ ...r, dcAdj: adj1[r.name].adj }));
console.log(`  n = ${test.length} rows · ${new Set(test.map(r => r.name)).size} players`);
const cut = (() => {
  const v = test.map(r => r.dcAdj).sort((a, b) => a - b);
  return [v[Math.floor(v.length / 3)], v[Math.floor(2 * v.length / 3)]];
})();
console.log(`  tertile cuts on hit_rate_adj: ${cut.map(x => x.toFixed(3)).join(" / ")}`);
const bands = [
  ["LOW DC   (bottom tertile)", r => r.dcAdj <= cut[0]],
  ["MID DC   (middle tertile)", r => r.dcAdj > cut[0] && r.dcAdj <= cut[1]],
  ["HIGH DC  (top tertile)", r => r.dcAdj > cut[1]],
];
line();
console.log("group                        n   pts/game  slope/tier  within-player  r(FFDR)");
line();
const band1 = [];
for (const [label, f] of bands) {
  const g = test.filter(f);
  const s = slope(g.map(r => r.tier), g.map(r => r.pts));
  const w = withinSlope(g, r => r.tier, r => r.pts);
  const r = corr(g.map(x => x.d), g.map(x => x.pts));
  band1.push({ label, n: g.length, pts: mean(g.map(x => x.pts)), s, within: w.s, r,
               players: new Set(g.map(x => x.name)).size });
  console.log(`  ${label.padEnd(26)} ${String(g.length).padStart(4)}   ${mean(g.map(x => x.pts)).toFixed(2).padStart(6)}` +
    `    ${fmt(s, 3).padStart(7)}      ${fmt(w.s, 3).padStart(7)}      ${fmt(r, 3)}`);
}
OUT.section1 = { n: test.length, cut, bands: band1 };

const hi = test.filter(bands[2][1]), lo = test.filter(bands[0][1]);
head("SECTION 1b - BOOTSTRAP, CLUSTERED PER PLAYER (400 iterations)");
const b1 = bootstrapCI(clusters(hi), rs => slope(rs.map(r => r.tier), rs.map(r => r.pts)));
const b1w = bootstrapCI(clusters(hi), withinStat(r => r.tier, r => r.pts));
console.log(`  HIGH DC, cross-sectional slope/tier : ${ci(b1, 3)}`);
console.log(`  HIGH DC, within-player slope/tier   : ${ci(b1w, 3)}`);
/* Mismunur: klasarnir eru SAMEINADIR svo bootstrap-ferlid endursyni bada
   hopa i einu og haldi fylgni theirra. */
const both = [...hi.map(r => ({ ...r, g: 1 })), ...lo.map(r => ({ ...r, g: 0 }))];
const diffStat = rs => {
  const a = rs.filter(r => r.g === 1), b = rs.filter(r => r.g === 0);
  return slope(a.map(r => r.tier), a.map(r => r.pts)) - slope(b.map(r => r.tier), b.map(r => r.pts));
};
const diffW = rs => {
  const a = rs.filter(r => r.g === 1), b = rs.filter(r => r.g === 0);
  return withinSlope(a, r => r.tier, r => r.pts).s - withinSlope(b, r => r.tier, r => r.pts).s;
};
const b2 = bootstrapCI(clusters(both), diffStat);
const b2w = bootstrapCI(clusters(both), diffW);
console.log(`\n  THE INTERACTION - what ACCEPT would have to exclude zero on:`);
console.log(`  slope(HIGH) - slope(LOW), cross-sectional : ${ci(b2, 3)}`);
console.log(`  slope(HIGH) - slope(LOW), within-player   : ${ci(b2w, 3)}`);
OUT.section1b = { hiSlope: b1, hiWithin: b1w, diff: b2, diffWithin: b2w };

/* ============================================================
   KAFLI 2 — SAMA A OLLU TIMABILINU (LOO-skilgreining, meiri kraftur)
   ============================================================ */
head("SECTION 2 - WHOLE SEASON, LEAVE-ONE-ROW-OUT DEFINITION (secondary)");
const all = rows.map(r => ({ ...r, dcAdj: looAdj(r) })).filter(r => r.dcAdj != null);
const cutA = (() => {
  const v = all.map(r => r.dcAdj).sort((a, b) => a - b);
  return [v[Math.floor(v.length / 3)], v[Math.floor(2 * v.length / 3)]];
})();
console.log(`  n = ${all.length} rows · ${new Set(all.map(r => r.name)).size} players · tertiles ${cutA.map(x => x.toFixed(3)).join(" / ")}`);
line();
console.log("group                        n   pts/game  slope/tier  within-player  hit rate");
line();
const bandsA = [
  ["LOW DC", r => r.dcAdj <= cutA[0]],
  ["MID DC", r => r.dcAdj > cutA[0] && r.dcAdj <= cutA[1]],
  ["HIGH DC", r => r.dcAdj > cutA[1]],
];
const band2 = [];
for (const [label, f] of bandsA) {
  const g = all.filter(f);
  const s = slope(g.map(r => r.tier), g.map(r => r.pts));
  const w = withinSlope(g, r => r.tier, r => r.pts);
  band2.push({ label, n: g.length, pts: mean(g.map(r => r.pts)), s, within: w.s,
               hitRate: mean(g.map(r => r.hitDc)) });
  console.log(`  ${label.padEnd(26)} ${String(g.length).padStart(4)}   ${mean(g.map(r => r.pts)).toFixed(2).padStart(6)}` +
    `    ${fmt(s, 3).padStart(7)}      ${fmt(w.s, 3).padStart(7)}       ${(100 * mean(g.map(r => r.hitDc))).toFixed(0)}%`);
}
const hiA = all.filter(bandsA[2][1]), loA = all.filter(bandsA[0][1]);
const bothA = [...hiA.map(r => ({ ...r, g: 1 })), ...loA.map(r => ({ ...r, g: 0 }))];
const b3 = bootstrapCI(clusters(bothA), diffStat);
const b3w = bootstrapCI(clusters(bothA), diffW);
console.log(`\n  slope(HIGH) - slope(LOW), cross-sectional : ${ci(b3, 3)}`);
console.log(`  slope(HIGH) - slope(LOW), within-player   : ${ci(b3w, 3)}`);
OUT.section2 = { n: all.length, cut: cutA, bands: band2, diff: b3, diffWithin: b3w };

/* ============================================================
   KAFLI 3 — SUNDURLIDUN: HVADA THATTUR HREYFIST MED THREPINU?
   Stig = koma-vid + mork/assist + hreint blad + DEFCON + bonus - kort.
   Ef eigandinn hefur rett fyrir ser HLYTUR DEFCON-lidurinn ad rísa nog
   til ad jafna soknar-tapid. Thad er thad sem thessi kafli maelir.
   ============================================================ */
head("SECTION 3 - DECOMPOSITION OF THE HIGH-DC GROUP BY TIER (whole season, LOO)");
const comp = r => ({
  app: r.mins >= 60 ? 2 : 1,
  att: r.goals * 5 + r.assists * 3,
  cs: r.cs,
  dcp: r.hitDc * 2,
  bon: r.bonus,
  card: -(r.yc + 3 * r.rc),
});
for (const [label, f] of [["HIGH DC", bandsA[2][1]], ["LOW DC", bandsA[0][1]]]) {
  const g = all.filter(f);
  console.log(`\n  ${label} (n=${g.length})`);
  line();
  console.log("  tier   n    pts   appear  goal/ast    CS   DEFCON  bonus  cards   hit rate");
  line();
  const per = [];
  for (let k = 0; k <= 5; k++) {
    const t = g.filter(r => r.tier === k);
    if (!t.length) continue;
    const c = t.map(comp);
    const m = key => mean(c.map(x => x[key]));
    per.push({ tier: k, n: t.length, pts: mean(t.map(r => r.pts)), app: m("app"), att: m("att"),
               cs: m("cs"), dcp: m("dcp"), bon: m("bon"), card: m("card"), hit: mean(t.map(r => r.hitDc)) });
    console.log(`   ${k}   ${String(t.length).padStart(4)}  ${mean(t.map(r => r.pts)).toFixed(2).padStart(5)}` +
      `   ${m("app").toFixed(2).padStart(5)}     ${m("att").toFixed(2).padStart(5)}  ${m("cs").toFixed(2).padStart(5)}` +
      `   ${m("dcp").toFixed(2).padStart(5)}  ${m("bon").toFixed(2).padStart(5)} ${m("card").toFixed(2).padStart(6)}` +
      `      ${(100 * mean(t.map(r => r.hitDc))).toFixed(0)}%`);
  }
  const sl = key => slope(g.map(r => r.tier), g.map(r => comp(r)[key]));
  const wl = key => withinSlope(g, r => r.tier, r => comp(r)[key]).s;
  console.log(`  slope/tier:    appear ${fmt(sl("app"), 3)} · goal/ast ${fmt(sl("att"), 3)} · CS ${fmt(sl("cs"), 3)}` +
    ` · DEFCON ${fmt(sl("dcp"), 3)} · bonus ${fmt(sl("bon"), 3)} · cards ${fmt(sl("card"), 3)}`);
  console.log(`  within-player: appear ${fmt(wl("app"), 3)} · goal/ast ${fmt(wl("att"), 3)} · CS ${fmt(wl("cs"), 3)}` +
    ` · DEFCON ${fmt(wl("dcp"), 3)} · bonus ${fmt(wl("bon"), 3)} · cards ${fmt(wl("card"), 3)}`);
  OUT[`decomp_${label.replace(/\s+/g, "")}`] = { perTier: per,
    slopes: { app: sl("app"), att: sl("att"), cs: sl("cs"), dcp: sl("dcp"), bon: sl("bon"), card: sl("card") },
    within: { app: wl("app"), att: wl("att"), cs: wl("cs"), dcp: wl("dcp"), bon: wl("bon"), card: wl("card") } };
}

head("SECTION 3b - THE DEFCON COMPONENT ALONE (in points, not in the raw count)");
for (const [label, f] of [["HIGH DC", bandsA[2][1]], ["MID DC", bandsA[1][1]], ["LOW DC", bandsA[0][1]]]) {
  const g = all.filter(f);
  const bd = bootstrapCI(clusters(g), rs => slope(rs.map(r => r.tier), rs.map(r => r.hitDc * 2)));
  const bw = bootstrapCI(clusters(g), withinStat(r => r.tier, r => r.hitDc * 2));
  const ba = bootstrapCI(clusters(g), withinStat(r => r.tier, r => r.goals * 5 + r.assists * 3));
  console.log(`  ${label.padEnd(8)} DEFCON pts/tier, cross-sectional : ${ci(bd, 3)}`);
  console.log(`  ${" ".repeat(8)} DEFCON pts/tier, within-player   : ${ci(bw, 3)}`);
  console.log(`  ${" ".repeat(8)} goal+assist pts/tier, within     : ${ci(ba, 3)}\n`);
  OUT[`dcComp_${label.replace(/\s+/g, "")}`] = { cross: bd, within: bw, attWithin: ba };
}

/* Hra DC-TALAN (ekki stigin) a moti threpi — er mekanisminn til yfirleitt?
   THETTA ER LIDURINN SEM CLAUDE.md KAFLI 4 FULLYRTI AN TOLU TIL 20.8.2026. */
head("SECTION 3c - THE MECHANISM: raw DC count (CBIRT) vs tier, within player");
for (const [label, f] of [["HIGH DC", bandsA[2][1]], ["MID DC", bandsA[1][1]],
                          ["LOW DC", bandsA[0][1]], ["ALL", () => true]]) {
  const g = all.filter(f);
  const b = bootstrapCI(clusters(g), withinStat(r => r.tier, r => r.dc));
  const b90 = bootstrapCI(clusters(g), withinStat(r => r.tier, r => (r.mins > 0 ? r.dc * 90 / r.mins : 0)));
  console.log(`  ${label.padEnd(8)} DC count per tier : ${ci(b, 3)}`);
  console.log(`  ${" ".repeat(8)} DC per 90 per tier : ${ci(b90, 3)}`);
  OUT[`mech_${label.replace(/\s+/g, "")}`] = { dc: b, dc90: b90 };
}

/* ============================================================
   KAFLI 4 — STAERD: hvad myndi thetta breyta i `expPointsFor`?
   ============================================================ */
head("SECTION 4 - MAGNITUDE (what rejects small-but-significant terms)");
{
  const M = POS_MEAN_PTS[3];
  const dEasy = 1.94, dHard = 3.65;                 // endar MEASURED_POS[3]
  const mEasy = lookupPos(3, "pts", dEasy) / M, mHard = lookupPos(3, "pts", dHard) / M;
  console.log(`  current MID multiplier: ${mEasy.toFixed(3)} (d=${dEasy}) -> ${mHard.toFixed(3)} (d=${dHard})`);
  console.log(`  span = ${(mEasy - mHard).toFixed(3)} of base. For a 4.5 base: ${(4.5 * (mEasy - mHard)).toFixed(2)} points.`);
  const wHi = withinSlope(hiA, r => r.tier, r => r.pts).s;
  const wLo = withinSlope(loA, r => r.tier, r => r.pts).s;
  console.log(`\n  measured within-player slope: HIGH DC ${fmt(wHi, 3)}/tier · LOW DC ${fmt(wLo, 3)}/tier`);
  console.log(`  across the whole tier range (0->5): HIGH ${(5 * wHi).toFixed(2)} pts · LOW ${(5 * wLo).toFixed(2)} pts`);
  console.log(`  THE DIFFERENCE a change would have to be worth: ${(5 * (wHi - wLo)).toFixed(2)} pts over 5 tiers` +
    ` = ${(wHi - wLo).toFixed(3)} pts/tier.`);
  const nHiPlayers = new Set(hiA.map(r => r.name)).size;
  const hardHi = hiA.filter(r => r.tier >= 4).length;
  console.log(`\n  SCOPE: ${nHiPlayers} high-DC midfielders · ${hiA.length} starts` +
    ` · ${hardHi} of them in tier 4-5 (${(100 * hardHi / hiA.length).toFixed(0)}%).`);
  const dcShare = mean(hiA.map(r => r.hitDc * 2)) / mean(hiA.map(r => r.pts));
  console.log(`  DEFCON points are ${(100 * dcShare).toFixed(1)}% of a high-DC midfielder's points` +
    ` (${mean(hiA.map(r => r.hitDc * 2)).toFixed(2)} of ${mean(hiA.map(r => r.pts)).toFixed(2)}).`);
  const maxGain = 2 * (1 - mean(hiA.filter(r => r.tier >= 4).map(r => r.hitDc)));
  console.log(`  ORACLE CEILING on the DEFCON term in tier 4-5: ${maxGain.toFixed(2)} pts` +
    ` (perfect knowledge of whether the threshold is reached).`);
  OUT.section4 = { mEasy, mHard, span: mEasy - mHard, wHi, wLo, diffPerTier: wHi - wLo,
                   nHiPlayers, nHiRows: hiA.length, hardHi, dcShare, maxGain };
}

/* ============================================================
   KAFLI 5 — STODUGLEIKI: heldur merkid i BADUM helmingum?
   Formerkis-skipti er nakvaemlega thad sem felldi varnar-FFDR 28.7.
   ============================================================ */
head("SECTION 5 - STABILITY (GW1-19 vs GW20-38, LOO definition)");
line();
console.log("  half        group      n    slope/tier   within-player");
line();
const stab = [];
for (const [hl, hf] of [["GW1-19", r => r.round <= 19], ["GW20-38", r => r.round > 19]]) {
  for (const [label, f] of [["HIGH DC", bandsA[2][1]], ["LOW DC", bandsA[0][1]]]) {
    const g = all.filter(r => hf(r) && f(r));
    const s = slope(g.map(r => r.tier), g.map(r => r.pts));
    const w = withinSlope(g, r => r.tier, r => r.pts).s;
    stab.push({ half: hl, band: label, n: g.length, s, within: w });
    console.log(`  ${hl.padEnd(11)} ${label.padEnd(9)} ${String(g.length).padStart(4)}   ${fmt(s, 3).padStart(7)}       ${fmt(w, 3)}`);
  }
}
OUT.section5 = stab;
{
  const d1 = stab[0].within - stab[1].within, d2 = stab[2].within - stab[3].within;
  console.log(`\n  INTERACTION (HIGH - LOW) per half: GW1-19 ${fmt(d1, 3)} · GW20-38 ${fmt(d2, 3)}` +
    `  -> ${Math.sign(d1) === Math.sign(d2) ? "SAME SIGN" : "SIGN FLIPS"}`);
  OUT.stability = { firstHalf: d1, secondHalf: d2, sameSign: Math.sign(d1) === Math.sign(d2) };
}

/* ============================================================
   KAFLI 5b — RASIN BUNDIN: HVE MIKID GETUR DEFCON-LIDURINN I MESTA LAGI
   GEFID? THETTA ER URSLITA-TALAN, og hun er THETTARI en heildar-hallinn.
   Heildar-stig eru havadasom (mork), svo CI a vixlverkun heildar-hallans
   er breitt. EN DEFCON-THATTURINN ER EINA LEIDIN sem thyngri leikur getur
   gefid DC-midjumanni FLEIRI stig — koma-vid er fast, hreint blad og
   mork/assist fara BÆÐI NIDUR. Bindum thvi channelinn sjalfan.
   ============================================================ */
head("SECTION 5b - THE CHANNEL BOUNDED: ceiling on what the DEFCON term could give");
{
  const bw = bootstrapCI(clusters(hiA), withinStat(r => r.tier, r => r.hitDc * 2));
  const span = 5;                                  // threp 0 -> 5
  console.log(`  DEFCON pts per tier (HIGH DC, within player): ${ci(bw, 4)}`);
  console.log(`  over the WHOLE tier range (x5): point ${(span * bw.point).toFixed(3)} pts` +
    ` · upper CI bound ${(span * bw.hi).toFixed(3)} pts`);
  const M = POS_MEAN_PTS[3];
  const spanMult = lookupPos(3, "pts", 1.94) / M - lookupPos(3, "pts", 3.65) / M;
  for (const base of [3.0, 4.5, 6.0]) {
    console.log(`  base ${base.toFixed(1)}: model span ${(base * spanMult).toFixed(2)} pts` +
      ` · DEFCON channel ${(span * bw.point).toFixed(2)} (${(100 * span * bw.point / (base * spanMult)).toFixed(0)}%)` +
      ` · at BEST ${(span * bw.hi).toFixed(2)} (${(100 * span * bw.hi / (base * spanMult)).toFixed(0)}%)`);
  }
  console.log(`  BENCHMARK: referee cards were rejected at 0.088 pts/player with PERFECT knowledge.`);
  OUT.channelBound = { perTier: bw, overSpan: span * bw.point, overSpanHi: span * bw.hi, spanMult };
}

/* ============================================================
   KAFLI 5c — NAEMI: er nullid haed af MINNI hopaskiptingu?
   Fimm sjalfstaedar utfaerslur. Ef nullid er raunverulegt eiga thaer
   allar ad innihalda thad; se thad knifsegg a einni skilgreiningu er
   thad ekki null heldur val.
   ============================================================ */
head("SECTION 5c - SENSITIVITY (other definitions, ceiling, continuous d)");
{
  const sens = [];
  const report = (label, rs) => {
    const b = bootstrapCI(clusters(rs), diffW);
    sens.push({ label, n: rs.length, ...b });
    console.log(`  ${label.padEnd(40)} n=${String(rs.length).padStart(4)}  ${ci(b, 3)}`);
  };
  {
    const v = all.map(r => r.dcAdj).sort((a, b) => a - b);
    const d9 = v[Math.floor(0.9 * v.length)], med = v[Math.floor(0.5 * v.length)];
    report("top decile vs bottom half",
      [...all.filter(r => r.dcAdj > d9).map(r => ({ ...r, g: 1 })),
       ...all.filter(r => r.dcAdj <= med).map(r => ({ ...r, g: 0 }))]);
  }
  {
    const raw = rows.map(r => {
      const a = aggAll[r.name];
      return a.starts - 1 < 5 ? null : { ...r, dcAdj: (a.hits - r.hitDc) / (a.starts - 1) };
    }).filter(Boolean);
    const v = raw.map(r => r.dcAdj).sort((a, b) => a - b);
    const c = [v[Math.floor(v.length / 3)], v[Math.floor(2 * v.length / 3)]];
    report("raw hit rate (no shrinkage)",
      [...raw.filter(r => r.dcAdj > c[1]).map(r => ({ ...r, g: 1 })),
       ...raw.filter(r => r.dcAdj <= c[0]).map(r => ({ ...r, g: 0 }))]);
  }
  {
    const c90 = rows.map(r => {
      const a = aggAll[r.name];
      return a.starts < 5 || a.mins <= 0 ? null : { ...r, dcAdj: (a.cbit * 90) / a.mins };
    }).filter(Boolean);
    const v = c90.map(r => r.dcAdj).sort((a, b) => a - b);
    const c = [v[Math.floor(v.length / 3)], v[Math.floor(2 * v.length / 3)]];
    report("CBIRT per 90 as the definition",
      [...c90.filter(r => r.dcAdj > c[1]).map(r => ({ ...r, g: 1 })),
       ...c90.filter(r => r.dcAdj <= c[0]).map(r => ({ ...r, g: 0 }))]);
  }
  report("only minutes >= 60",
    [...hiA.filter(r => r.mins >= 60).map(r => ({ ...r, g: 1 })),
     ...loA.filter(r => r.mins >= 60).map(r => ({ ...r, g: 0 }))]);
  {
    const dW = rs => {
      const a = rs.filter(r => r.g === 1), b = rs.filter(r => r.g === 0);
      return withinSlope(a, r => r.d, r => r.pts).s - withinSlope(b, r => r.d, r => r.pts).s;
    };
    const b = bootstrapCI(clusters(bothA), dW);
    sens.push({ label: "continuous d (pts per FFDR unit)", n: bothA.length, ...b });
    console.log(`  ${"continuous d (pts per FFDR unit)".padEnd(40)} n=${String(bothA.length).padStart(4)}  ${ci(b, 3)}`);
  }
  OUT.sensitivity = sens;
  console.log(`\n  ${sens.filter(s => s.excludesZero).length} of ${sens.length} exclude zero.`);
}

/* ============================================================
   KAFLI 6 — HVERJIR ERU HA-DC MIDJUMENNIRNIR? (samhengi, ekki maeling)
   ============================================================ */
head("SECTION 6 - TOP 15 HIGH-DC MIDFIELDERS 2025/26 (context, not a measurement)");
{
  const t = Object.entries(aggAll)
    .filter(([, a]) => a.starts >= 10)
    .map(([nm, a]) => ({ nm, starts: a.starts, hits: a.hits,
      adj: (a.hits + SHRINK_K * MID_P0) / (a.starts + SHRINK_K),
      cbit90: (a.cbit * 90) / a.mins }))
    .sort((a, b) => b.adj - a.adj).slice(0, 15);
  for (const x of t) console.log(`  ${x.nm.slice(0, 26).padEnd(27)} starts ${String(x.starts).padStart(2)}` +
    ` · hit ${(100 * x.hits / x.starts).toFixed(0)}% · shrunk ${(100 * x.adj).toFixed(0)}%` +
    ` · CBIRT/90 ${x.cbit90.toFixed(1)}`);
  OUT.top = t;
}

/* ============================================================
   KAFLI 7 — SANGARE: TVEIR MENN, SAMA `web_name`
   Eigandinn nefndi "Sangare a moti A.Villa uti i GW6". GW6 er
   Aston Villa - Brentford, svo hann meinar MAMADOU Sangare (Brentford,
   id 565, code 513545), sem a ENGA PL-sogu (0 byrjanir, 0 minutur).
   `players.json` ber TVO midjumenn med `web_name` = "Sangare": hinn er
   IBRAHIM Sangare (Nott'm Forest, id 488, code 210462) med fulla sogu
   (25 byrjanir, 2.073 min, 89 stig). Nafnid EITT getur thvi ekki svarad
   spurningunni — og THAD ER SJALFSTAETT ATHUGUNARVERT: `web_name` er
   ekki einkvaemt lykill i `players.json`.
   ============================================================ */
head("SECTION 7 - SANGARE (context): TWO PLAYERS SHARE THE SAME web_name");
{
  const ib = rows.filter(r => /Sangar/i.test(r.name));
  console.log(`  Ibrahim Sangare (Nott'm Forest), MID starts 2025/26: ${ib.length}`);
  if (ib.length) {
    const a = aggAll[ib[0].name];
    console.log(`  hit rate ${a.hits}/${a.starts} = ${(100 * a.hits / a.starts).toFixed(0)}%` +
      ` · shrunk ${(100 * (a.hits + SHRINK_K * MID_P0) / (a.starts + SHRINK_K)).toFixed(0)}%` +
      ` · CBIRT/90 ${((a.cbit * 90) / a.mins).toFixed(1)}  -> TOP DC TERTILE`);
    line();
    console.log("  tier   n   pts/game   DEFCON pts   goal+assist pts");
    line();
    const per = [];
    for (let k = 0; k <= 5; k++) {
      const t = ib.filter(r => r.tier === k);
      if (!t.length) continue;
      per.push({ tier: k, n: t.length, pts: mean(t.map(r => r.pts)),
                 dcp: mean(t.map(r => r.hitDc * 2)), att: mean(t.map(r => r.goals * 5 + r.assists * 3)) });
      console.log(`   ${k}   ${String(t.length).padStart(3)}    ${mean(t.map(r => r.pts)).toFixed(2).padStart(5)}` +
        `       ${mean(t.map(r => r.hitDc * 2)).toFixed(2).padStart(5)}            ${mean(t.map(r => r.goals * 5 + r.assists * 3)).toFixed(2).padStart(5)}`);
    }
    console.log(`  slope/tier ${fmt(slope(ib.map(r => r.tier), ib.map(r => r.pts)), 3)}` +
      ` (n=${ib.length} - ONE PLAYER, this is a description, not a measurement)`);
    OUT.sangare = { rows: ib.length, perTier: per, slope: slope(ib.map(r => r.tier), ib.map(r => r.pts)) };
  }
}

head("SUMMARY");
console.log(`  Section 1b (time-honest, n=${hi.length}+${lo.length}):`);
console.log(`    within-player interaction  ${ci(b2w, 3)}`);
console.log(`  Section 2  (whole season, n=${hiA.length}+${loA.length}):`);
console.log(`    within-player interaction  ${ci(b3w, 3)}`);
console.log(`  Magnitude: ${fmt(OUT.section4.diffPerTier, 3)} pts/tier` +
  ` = ${(5 * OUT.section4.diffPerTier).toFixed(2)} pts across the whole range.`);
console.log(`  Stability: ${OUT.stability.sameSign ? "same sign in both halves" : "SIGN FLIPS BETWEEN HALVES"}.`);
console.log(`  Mechanism (raw DC count, all mids): ${ci(OUT.mech_ALL.dc, 3)}`);
console.log(`  Channel (DEFCON pts, high DC):      ${ci(OUT.channelBound.perTier, 4)}`);

if (argJson > 0 && process.argv[argJson + 1]) {
  writeFileSync(process.argv[argJson + 1], JSON.stringify(OUT, null, 2));
  console.log(`\n  JSON -> ${process.argv[argJson + 1]}`);
}
