/* ============================================================
   AEFINGALEIKIR — HVERJIR ERU AD STANDA SIG, OG ER HAEGT AD TREYSTA TOLUNUM?

   EKKI I `npm test`, EKKI I PIPELINE, ENGIR LYKLAR. Keyrsla:
       node scripts/measure-friendly-form.mjs
       node scripts/measure-friendly-form.mjs --json

   TVAER SPURNINGAR I EINNI KEYRSLU:
     1. ERU FOTMOB-TOLURNAR RETTAR? Thaer eru bornar saman vid ESPN — ohada
        heimild sem birtir SOMU leiki. ESPN gefur engar per-leikmanns varnar-
        tolur (stadfest: 14 svid, ekkert theirra varnar-tala) EN thad gefur
        LIDS-tolur: totalTackles, interceptions, totalClearance, blockedShots.
        Vid leggjum saman FotMob-leikmennina per lid per leik og berum vid
        ESPN-lidstoluna fyrir SAMA leik. Tvaer ohadar leidir ad somu tolu er
        eina raunverulega profid a heimild sem enginn hefur sannreynt adur
        (sama adferd og BSD var sannreynt med: mork r 0,9998, minutur 0,9998).
     2. HVERJIR STANDA SIG? Radad eftir thvi sem SKIPTIR MALI I FANTASY.

   HVERS VEGNA ROD EFTIR MINUTUM, EKKI EFTIR MORKUM:
   CLAUDE.md kafli 4 skrair "form / heitur leikmadur" sem MAELT OG FELLT —
   innan leikmanns er mark-skorun AFTURHVARF (-4,52pp eftir mark, t=-5,26).
   Aefingaleikur er enn veikari: andstaedingar ur fjorum deildum, 11 skiptingar
   i halfleik, og alagid er valid af thjalfaranum. Tvo mork gegn utandeildarlidi
   segja EKKERT um GW1.
   ThAD SEM ER RAUNVERULEGA MERKI ER MINUTUR I STERKUM LEIKJUM: hver spilar
   90 i sidustu aefingaleikjunum gegn alvoru andstaedingum. Byrjunar-likurnar
   eru MAELDAR i thessu repo-i (Brier 0,089 a moti 0,118; bekkjar-gildran
   lyfting 2,09x) og thaer eru thad eina her sem a ser maelda stod.
   Thess vegna er `starter_score` adalrodun og mork/xG eru SAMHENGI vid hlidina.
   ============================================================ */

import { readFileSync, writeFileSync } from "node:fs";
import { nameScore } from "../src/stats.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
         + "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const FM = "https://www.fotmob.com/api/data";
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/club.friendly";
const D = new URL("../data/", import.meta.url).pathname;
const WRITE = process.argv.includes("--json");

const errs = {};
const get = async (url, tries = 4) => {
  let last = "";
  for (let a = 0; a < tries; a++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, referer: "https://www.fotmob.com/",
                                              accept: "application/json", "accept-encoding": "identity" },
                                   signal: AbortSignal.timeout(30000) });
      if (r.ok) return r.json();
      last = `HTTP ${r.status}`;
      if (r.status === 404) break;
    } catch (e) { last = e.name === "TimeoutError" ? "timeout" : e.message; }
    await new Promise(r => setTimeout(r, 600 * (a + 1)));
  }
  errs[last] = (errs[last] || 0) + 1;
  throw new Error(last);
};

/* ---------- PL-lidin ur repo-inu ---------- */
const teams = JSON.parse(readFileSync(D + "teams.json", "utf8")).teams;
const players = JSON.parse(readFileSync(D + "players.json", "utf8")).players;
const FM_TEAM = {
  "arsenal":"ARS","aston villa":"AVL","bournemouth":"BOU","afc bournemouth":"BOU",
  "brentford":"BRE","brighton":"BHA","brighton & hove albion":"BHA","chelsea":"CHE",
  "coventry":"COV","coventry city":"COV","crystal palace":"CRY","everton":"EVE",
  "fulham":"FUL","hull city":"HUL","hull":"HUL","ipswich":"IPS","ipswich town":"IPS",
  "leeds":"LEE","leeds united":"LEE","liverpool":"LIV","man city":"MCI",
  "manchester city":"MCI","man united":"MUN","manchester united":"MUN","man utd":"MUN",
  "newcastle":"NEW","newcastle united":"NEW","nottm forest":"NFO","nottingham forest":"NFO",
  "tottenham":"TOT","tottenham hotspur":"TOT","spurs":"TOT","sunderland":"SUN",
};
const shortOf = n => FM_TEAM[String(n || "").toLowerCase().trim()] || null;
const byShort = Object.fromEntries(teams.map(t => [t.short, t]));
const fplByTeam = {};
for (const p of players) (fplByTeam[p.team] ||= []).push(p);
const matchFpl = (name, short) => {
  const pool = fplByTeam[byShort[short]?.id] || [];
  let best = null, bs = 0, second = 0;
  for (const p of pool) {
    const sc = Math.max(nameScore(p.web_name, name),
                        nameScore(`${p.first_name ?? ""} ${p.second_name ?? ""}`, name));
    if (sc > bs) { second = bs; bs = sc; best = p; }
    else if (sc > second) second = sc;
  }
  return (best && bs >= 1 && bs > second) ? best : null;
};

/* ---------- 1. LEIKIRNIR ---------- */
const DATES = [];
for (const [mon, days] of [[6, 30], [7, 31], [8, 15]])
  for (let d = 1; d <= days; d++)
    DATES.push(`2026${String(mon).padStart(2, "0")}${String(d).padStart(2, "0")}`);
console.log(`1) FINDING FRIENDLIES (${DATES[0]}-${DATES.at(-1)})`);
const matches = [];
for (const date of DATES) {
  let j; try { j = await get(`${FM}/matches?date=${date}`); } catch { continue; }
  for (const l of j.leagues || []) {
    if (!/friendl/i.test(l.name || "")) continue;
    for (const m of l.matches || []) {
      if (!shortOf(m.home?.name) && !shortOf(m.away?.name)) continue;
      const st = m.status || {};
      if (!st.finished && !/FT|Pen|AET/i.test(st.reason?.short || st.scoreStr || "")) continue;
      matches.push({ id: m.id, date, home: m.home?.name, away: m.away?.name });
    }
  }
  await new Promise(r => setTimeout(r, 50));
}
console.log(`   finished friendlies involving a PL club: ${matches.length}`);

/* ---------- 2. PER-LEIKMANNS TOLUR ---------- */
const val = (grp, key) => {
  const s = grp?.stats?.[key]?.stat;
  const v = s && typeof s === "object" ? s.value : s;
  return Number.isFinite(+v) ? +v : 0;
};
const agg = new Map();          // fpl id -> samtala
const teamMatch = new Map();    // `${matchId}:${short}` -> FotMob lids-summa (til ESPN-samanburdar)
let withStats = 0, noStats = 0, failed = 0;
const unmatched = new Set();
console.log("2) FETCHING PLAYER STATS");
for (const m of matches) {
  let j;
  try { j = await get(`${FM}/matchDetails?matchId=${m.id}`); } catch { failed++; continue; }
  const ps = j.content?.playerStats;
  if (!ps || !Object.keys(ps).length) { noStats++; continue; }
  withStats++;
  for (const pl of Object.values(ps)) {
    const short = shortOf(pl.teamName);
    if (!short) continue;
    const groups = pl.stats || [];
    const top = groups.find(g => g.title === "Top stats");
    const def = groups.find(g => g.title === "Defense");
    const atk = groups.find(g => g.title === "Attack");
    const mins = val(top, "Minutes played");
    if (!mins) continue;

    /* LIDS-SUMMA fyrir ESPN-samanburdinn — TALIN A OLLUM leikmonnum lidsins,
       lika markmanni, thvi ESPN telur lidid i heild.                      */
    const key = `${m.id}:${short}`;
    const t = teamMatch.get(key) || { tackles: 0, interceptions: 0, clearances: 0, blocks: 0 };
    t.tackles += val(def, "Tackles"); t.interceptions += val(def, "Interceptions");
    t.clearances += val(def, "Clearances"); t.blocks += val(def, "Blocks");
    teamMatch.set(key, t);

    if (pl.isGoalkeeper) continue;
    const fpl = matchFpl(pl.name, short);
    if (!fpl) { unmatched.add(`${short}:${pl.name}`); continue; }
    const a = agg.get(String(fpl.id)) || {
      id: fpl.id, name: fpl.web_name, team: short, price: (fpl.now_cost ?? 0) / 10,
      pos: ["", "GK", "DEF", "MID", "FWD"][fpl.element_type], et: fpl.element_type,
      games: 0, mins: 0, starts90: 0, lastMins: [],
      goals: 0, assists: 0, xg: 0, xa: 0, shots: 0, sot: 0, cc: 0, box: 0,
      clr: 0, blk: 0, int: 0, tkl: 0, rec: 0, rating: 0, ratedGames: 0,
    };
    a.games++; a.mins += mins;
    if (mins >= 60) a.starts90++;
    a.lastMins.push({ date: m.date, mins });
    a.goals += val(top, "Goals"); a.assists += val(top, "Assists");
    a.xg += val(top, "Expected goals (xG)"); a.xa += val(top, "Expected assists (xA)");
    a.shots += val(top, "Total shots"); a.sot += val(top, "Shots on target");
    a.cc += val(top, "Chances created");
    a.box += val(atk, "Touches in opposition box");
    a.clr += val(def, "Clearances"); a.blk += val(def, "Blocks");
    a.int += val(def, "Interceptions"); a.tkl += val(def, "Tackles");
    a.rec += val(def, "Recoveries");
    const r = val(top, "FotMob rating");
    if (r) { a.rating += r; a.ratedGames++; }
    agg.set(String(fpl.id), a);
  }
  process.stdout.write(`\r   ${withStats + noStats + failed}/${matches.length}`);
  await new Promise(r => setTimeout(r, 220));
}
console.log(`\n   with player stats: ${withStats} · no player stats in FotMob: ${noStats} `
          + `· fetch failed: ${failed} · unmatched names: ${unmatched.size}`);
if (failed) console.log(`   reasons: ${Object.entries(errs).map(([k, v]) => k + " x" + v).join(", ")}`);

/* ---------- 3. ER FOTMOB RETT? ESPN ER OHAD HEIMILD ---------- */
console.log("\n3) VALIDATION - FotMob player sums vs ESPN team totals (same matches)");
const espnFor = async (date) => {
  const d = date;
  try { return await (await fetch(`${ESPN}/scoreboard?dates=${d}&limit=400`,
    { headers: { "user-agent": UA, "accept-encoding": "identity" }, signal: AbortSignal.timeout(30000) })).json(); }
  catch { return null; }
};
const pairs = [];
const seenDates = [...new Set(matches.map(m => m.date))];
for (const date of seenDates) {
  const sb = await espnFor(date);
  for (const ev of sb?.events || []) {
    const comp = ev.competitions?.[0];
    if (!comp?.status?.type?.completed) continue;
    const sides = (comp.competitors || []).map(c => ({ name: c.team?.displayName, short: shortOf(c.team?.displayName) }));
    if (!sides.some(s => s.short)) continue;
    /* Pörun a (dagsetning + PL-lid) — ESPN og FotMob deila engu id-i.   */
    for (const s of sides.filter(x => x.short)) {
      const fm = matches.find(m => m.date === date &&
        (shortOf(m.home) === s.short || shortOf(m.away) === s.short));
      if (!fm) continue;
      const mine = teamMatch.get(`${fm.id}:${s.short}`);
      if (!mine) continue;
      let sum;
      try { sum = await (await fetch(`${ESPN}/summary?event=${ev.id}`,
        { headers: { "user-agent": UA, "accept-encoding": "identity" }, signal: AbortSignal.timeout(30000) })).json(); }
      catch { continue; }
      const bt = (sum.boxscore?.teams || []).find(t => shortOf(t.team?.displayName) === s.short);
      if (!bt) continue;
      const st = {};
      for (const x of bt.statistics || []) st[x.name] = +x.displayValue;
      if (!(st.totalTackles + st.interceptions + st.totalClearance)) continue;   // ESPN skiladi engu
      pairs.push({ date, short: s.short,
        fm: mine,
        espn: { tackles: st.totalTackles, interceptions: st.interceptions,
                clearances: st.totalClearance, blocks: st.blockedShots } });
      await new Promise(r => setTimeout(r, 150));
    }
  }
  await new Promise(r => setTimeout(r, 100));
}
console.log(`   team-matches present in BOTH sources: ${pairs.length}`);
if (pairs.length) {
  const cmp = (k) => {
    const xs = pairs.map(p => p.fm[k]), ys = pairs.map(p => p.espn[k]);
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
    const vx = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0));
    const vy = Math.sqrt(ys.reduce((a, y) => a + (y - my) ** 2, 0));
    const mae = xs.reduce((a, x, i) => a + Math.abs(x - ys[i]), 0) / n;
    return { k, n, fm: mx.toFixed(1), espn: my.toFixed(1), mae: mae.toFixed(2),
             r: (vx && vy) ? (cov / (vx * vy)).toFixed(3) : "n/a" };
  };
  console.log("   stat            n   FotMob   ESPN    MAE      r");
  for (const k of ["tackles", "interceptions", "clearances", "blocks"]) {
    const c = cmp(k);
    console.log(`   ${c.k.padEnd(14)} ${String(c.n).padStart(2)} ${c.fm.padStart(7)} ${c.espn.padStart(6)} ${c.mae.padStart(7)} ${c.r.padStart(6)}`);
  }
  console.log("   (r near 1 = the two providers rank the same matches the same way.");
  console.log("    A level offset is normal - providers define tackles/clearances differently,");
  console.log("    exactly like BSD assists being 29% below FPL assists. CLAUDE.md 6.)");
} else {
  console.log("   NO overlap found - validation not possible, so treat FotMob as UNVERIFIED.");
}

/* ---------- 4. HVERJIR STANDA SIG ---------- */
const rows = [...agg.values()].map(a => {
  const per90 = x => a.mins ? x * 90 / a.mins : 0;
  a.lastMins.sort((x, y) => x.date.localeCompare(y.date));
  const last3 = a.lastMins.slice(-3);
  const lateMins = last3.reduce((s, x) => s + x.mins, 0) / Math.max(1, last3.length);
  return { ...a,
    mpg: a.mins / a.games,
    lateMins,                                  // MINUTUR I SIDUSTU LEIKJUNUM = merkid
    starter_score: +(lateMins / 90).toFixed(3),
    gi: a.goals + a.assists,
    xgi90: +(per90(a.xg + a.xa)).toFixed(2),
    sh90: +(per90(a.shots)).toFixed(1),
    cc90: +(per90(a.cc)).toFixed(1),
    box90: +(per90(a.box)).toFixed(1),
    dc90: +(per90(a.clr + a.blk + a.int + a.tkl + (a.et === 2 ? 0 : a.rec))).toFixed(1),
    rate: a.ratedGames ? +(a.rating / a.ratedGames).toFixed(2) : null,
  };
});
const MIN_MINS = 120;
const q = rows.filter(r => r.mins >= MIN_MINS);
const line = r => `  ${r.name.slice(0,16).padEnd(16)} ${r.team} ${r.pos.padEnd(3)} £${r.price.toFixed(1).padStart(4)} `
  + `${String(r.games).padStart(2)} ${String(r.mins).padStart(4)} ${String(Math.round(r.lateMins)).padStart(4)} `
  + `${String(r.gi).padStart(3)} ${String(r.xgi90.toFixed(2)).padStart(5)} ${String(r.sh90).padStart(4)} `
  + `${String(r.cc90).padStart(4)} ${String(r.box90).padStart(4)} ${String(r.dc90).padStart(5)} `
  + `${r.rate == null ? "  - " : r.rate.toFixed(2).padStart(4)}`;
const HEAD = "  player           clb pos  price  M  min late  GI  xGI9  Sh9   CC9  Box9   DC9  rate";

console.log(`\n4) WHO IS PLAYING - ${q.length} players with >= ${MIN_MINS} min\n`);
console.log("   MINUTES IN THE LATEST FRIENDLIES ('late' = mean of his last 3) is the");
console.log("   only column here with measured backing. Goals in friendlies do not carry.\n");
for (const pos of ["DEF", "MID", "FWD"]) {
  console.log(`   --- ${pos} - most minutes late in preseason ---`);
  console.log(HEAD);
  q.filter(r => r.pos === pos).sort((a, b) => b.lateMins - a.lateMins || b.mins - a.mins)
   .slice(0, 12).forEach(r => console.log(line(r)));
  console.log();
}
/* ============================================================
   ThEKJA PER TOLU — PRENTUD ADUR EN RADAD ER, OG ThAD ER EKKI SKRAUT.
   Fyrsta utgafa thessarar skriftu radadi soknar-listanum eftir xGI/90 og
   listinn fylltist af Newcastle-monnum. ThAD VAR EKKI FINDING HELDUR
   ThEKJU-GALLI: FotMob birtir xG/xA fyrir ADEINS 3 af 12 fellogum i
   aefingaleikjum (28 af 200 leikmonnum), svo "haest xGI" thydir i raun
   "spilar fyrir eitt af theim thremur fellogum sem eiga xG".
   Skot, faerasköpun og einkunn na yfir OLL 12. Radad er thvi a theim, og
   thekjan er PRENTUD svo naesti lesandi sjai gildruna an thess ad detta i hana.
   Sama regla og "omaeld tala fær ekki reit" (CLAUDE.md 8).
   ============================================================ */
const cover = (f) => { const n = rows.filter(f).length;
  const cl = new Set(rows.filter(f).map(r => r.team)).size;
  return `${String(n).padStart(3)}/${rows.length} players · ${cl}/12 clubs`; };
console.log("\n   COVERAGE (read before ranking):");
console.log(`     shots            ${cover(r => r.shots > 0)}`);
console.log(`     chances created  ${cover(r => r.cc > 0)}`);
console.log(`     box touches      ${cover(r => r.box > 0)}`);
console.log(`     FotMob rating    ${cover(r => r.rate != null)}`);
console.log(`     xG / xA          ${cover(r => r.xg > 0 || r.xa > 0)}   <- TOO THIN TO RANK ON`);

console.log("\n   --- ATTACKING VOLUME per 90 (shots + chances + box touches) ---");
console.log("   Ranked on the metrics that cover all 12 clubs, NOT on xG.");
console.log(HEAD);
q.filter(r => r.et >= 3).map(r => ({ ...r, att: r.sh90 + r.cc90 + r.box90 / 2 }))
 .sort((a, b) => b.att - a.att).slice(0, 18).forEach(r => console.log(line(r)));

console.log("\n   --- HIGHEST FOTMOB RATING (their own composite) ---");
console.log(HEAD);
q.filter(r => r.rate != null).sort((a, b) => b.rate - a.rate).slice(0, 12).forEach(r => console.log(line(r)));

console.log("\n   --- TEAMS: attacking volume in friendlies ---");
const tAgg = {};
for (const r of rows) {
  const t = tAgg[r.team] || (tAgg[r.team] = { shots: 0, xg: 0, box: 0, mins: 0 });
  t.shots += r.shots; t.xg += r.xg; t.box += r.box; t.mins += r.mins;
}
console.log("   clb   shots     xG   box touches   (all players, all friendlies with stats)");
Object.entries(tAgg).sort((a, b) => b[1].xg - a[1].xg).forEach(([k, v]) =>
  console.log(`   ${k.padEnd(5)} ${String(v.shots).padStart(5)} ${v.xg.toFixed(2).padStart(6)} ${String(v.box).padStart(13)}`));

if (WRITE) {
  const out = "/private/tmp/claude-501/-Users-arongeorgsson-Fantasy/"
            + "15a4c5c8-d10a-4f11-af10-e88b359f557b/scratchpad/friendly-form.json";
  writeFileSync(out, JSON.stringify({ matches, rows, pairs, unmatched: [...unmatched] }, null, 1));
  console.log(`\n   written ${out}`);
}
console.log("\nCAVEAT THAT DOES NOT GO AWAY: friendlies are not league matches. Opponents come");
console.log("from four divisions, sides are rotated wholesale at half time, and the workload is");
console.log("chosen. CLAUDE.md 4 records 'form / hot player' as measured and rejected even in");
console.log("league play (-4.52pp after a goal, t=-5.26). Minutes are the signal; goals are not.");
