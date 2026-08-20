#!/usr/bin/env node
/* ============================================================
   NYLIDA-STADGENGILLINN — ERU 0,75 OG 1,35 MAELDAR TOLUR?
   ============================================================
   HANDVIRK MAELINGA-SKRIFTA. EKKI I `npm test`, EKKI I PIPELINE.

     node scripts/measure-promoted-proxy.mjs
     node scripts/measure-promoted-proxy.mjs --json /tmp/promoted.json

   SPURNINGIN. `src/teamstats.js` gefur nylidum stadgengil ur B-deildinni:
   `xg90 = goals_pg * 0.75` og `xgc90 = goals_against_pg * 1.35`. Hvorug
   talan bar nokkurn rokstudning i athugasemdinni — adeins "B-deild -> PL
   afslattur" og "fa meira a sig i PL". Thaer eru thvi VALDAR tolur i
   buningi maelingar, sem er versta utkoman (CLAUDE.md kafli 3).

   AFLEIDINGIN VAR MAELD ADUR EN NOKKUD VAR GERT: Ipswich modelast
   1,74 x 0,75 = 1,305 i sokn og 1,02 x 1,35 = 1,377 a sig — nakvaemlega
   MEDALLID i Premier League (deildar-medaltal a sig 1,295). Thrju lid
   nota stadgengilinn og hvert theirra a 38 leiki, svo talan snertir
   leikjaskra ALLRA lida gegnum FFDR.

   HEIMILDIRNAR. Baðar ur football-data.co.uk, sama uppsprettu og
   bakprofin nota:
     E0 (Premier League)  — thegar i repo: data/fdcouk/E0-*.json
     E1 (Championship)    — sott her, sama URL-snid, `Div === "E1"`
                            SANNREYNT eins og E0-leidin sannreynir
                            `Div === "E0"` (kafli 6: vantandi skra
                            301-redirectadi og 12 utandeildar-radir
                            londudu i data/ undir graenu ljosi).
   Cache i scripts/.e1-cache/ (gitignored) — timabil sem er lokid
   breytist ekki, svo hun er sott einu sinni.

   PORIN. Nylidi = lid sem er i E1 timabil S OG i E0 timabil S+1.
   Thad er BEIN TALNING ur skraunum sjalfum, engin nafna-vorpun og engin
   utanad-lærð tafla — sama regla og `Div`-vordurinn hvilir a.
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CACHE = `${HERE}/.e1-cache`;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) fantasy-measure/1.0";
const FETCH_TIMEOUT_MS = 20000;

const argJson = (() => { const i = process.argv.indexOf("--json"); return i > 0 ? process.argv[i + 1] : null; })();

/* ---------- CSV: sama einfalda thattunin og fetch.mjs notar ---------- */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    if (c.length < 5) continue;
    const o = {};
    header.forEach((h, j) => { o[h.trim()] = (c[j] ?? "").trim(); });
    rows.push(o);
  }
  return { header, rows };
}

/* TIMAMORK — vordur i tests/wiring.mjs krefst theirra a HVERJU fetch-kalli. */
async function getText(url, tries = 3) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA },
                                   signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (r.ok) return await r.text();
      if (r.status === 429 || r.status >= 500) last = new Error(`${r.status} ${url}`);
      else throw new Error(`${r.status} ${url}`);
    } catch (e) {
      if (e?.message && /^\d{3} /.test(e.message) && !/^(429|5\d\d) /.test(e.message)) throw e;
      last = e;
    }
    if (i < tries - 1) await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
  throw last || new Error(`gave up: ${url}`);
}

/* E1 = Championship. SAMA SANNREYNING SEM E0-LEIDIN HEFUR:
   ohreint svar (annar `Div`) er medhondlad eins og 404, ekki skrifad. */
async function loadE1(code) {
  const path = `${CACHE}/E1-${code}.json`;
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  const text = await getText(`https://www.football-data.co.uk/mmz4281/${code}/E1.csv`);
  const { rows } = parseCSV(text);
  const clean = rows.filter(r => r.Div === "E1" && r.HomeTeam && r.AwayTeam
                                 && r.FTHG !== "" && r.FTAG !== "");
  const bad = rows.length - clean.length;
  if (!clean.length) throw new Error(`E1-${code}: no Div==="E1" row among ${rows.length}`);
  if (bad > rows.length * 0.02)
    throw new Error(`E1-${code}: ${bad} of ${rows.length} rows are NOT E1 — dirty response`);
  if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });
  const out = { season: code, rows: clean, dropped: bad };
  writeFileSync(path, JSON.stringify(out));
  return out;
}

/* ---------- summur per lid ur rodum (bæði E0 og E1 hafa somu dalka) ---------- */
function tally(rows) {
  const t = {};
  const g = n => t[n] || (t[n] = { n: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 });
  for (const r of rows) {
    const hg = +r.FTHG, ag = +r.FTAG;
    if (!Number.isFinite(hg) || !Number.isFinite(ag)) continue;
    const h = g(r.HomeTeam), a = g(r.AwayTeam);
    h.n++; a.n++;
    h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
    if (hg > ag) { h.w++; a.l++; } else if (hg < ag) { a.w++; h.l++; } else { h.d++; a.d++; }
  }
  for (const v of Object.values(t)) {
    v.gf_pg = v.gf / v.n; v.ga_pg = v.ga / v.n;
    v.pts = v.w * 3 + v.d; v.gd = v.gf - v.ga;
  }
  return t;
}

const e0Path = `${ROOT}/data/fdcouk`;
const e0Codes = readdirSync(e0Path).filter(f => /^E0-\d{4}\.json$/.test(f))
  .map(f => f.slice(3, 7)).sort();
const prevCode = c => {                       // "1213" -> "1112"
  const a = +c.slice(0, 2) - 1, b = +c.slice(2) - 1;
  return String((a + 100) % 100).padStart(2, "0") + String((b + 100) % 100).padStart(2, "0");
};

/* ---------- tolfraedi ---------- */
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const median = a => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function bootCI(vals, stat, iters = 4000, seed = 12345) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const out = [];
  for (let i = 0; i < iters; i++) {
    const r = [];
    for (let j = 0; j < vals.length; j++) r.push(vals[(rnd() * vals.length) | 0]);
    out.push(stat(r));
  }
  out.sort((a, b) => a - b);
  return [out[Math.floor(iters * 0.025)], out[Math.floor(iters * 0.975)]];
}
const f3 = x => (x == null ? "  —  " : x.toFixed(3));
function pearson(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < xs.length; i++) { const dx = xs[i] - mx, dy = ys[i] - my; a += dx * dy; b += dx * dx; c += dy * dy; }
  return b && c ? a / Math.sqrt(b * c) : null;
}

/* ============================================================ */
async function main() {
  console.log("=".repeat(84));
  console.log("PROMOTED-CLUB PROXY — MEASURING THE 0.75 (ATTACK) AND 1.35 (DEFENCE) MULTIPLIERS");
  console.log("=".repeat(84));

  const pairs = [];
  const skipped = [];
  for (const pl of e0Codes) {
    const ch = prevCode(pl);
    let e1;
    try { e1 = await loadE1(ch); }
    catch (e) { skipped.push(`E1-${ch}: ${e.message}`); continue; }
    const e0 = JSON.parse(readFileSync(`${e0Path}/E0-${pl}.json`, "utf8"));
    const e0rows = (e0.rows || []).filter(r => r.Div === "E0");
    if (e0rows.length < 300) { skipped.push(`E0-${pl}: only ${e0rows.length} rows`); continue; }
    const chT = tally(e1.rows), plT = tally(e0rows);
    /* NYLIDI = i E1 timabil S OG i E0 timabil S+1. Bein talning. */
    for (const [name, c] of Object.entries(chT)) {
      const p = plT[name];
      if (!p) continue;
      if (c.n < 40 || p.n < 30) continue;             // ohreint timabil
      /* DEILDAR-MEDALTAL ThESS TIMABILS — hvert mark er talid tvisvar
         (skorad og a sig), svo medaltalid er ThAD SAMA fyrir baðar hlidar
         og er RETTA vidmidid um "hvad er medallid thetta ar".            */
      const lg = mean(Object.values(plT).map(x => x.gf_pg));
      pairs.push({ season: `${ch}->${pl}`, ch_season: ch, pl_season: pl, name,
        ch_n: c.n, ch_gf_pg: c.gf_pg, ch_ga_pg: c.ga_pg, ch_pts: c.pts, ch_gd: c.gd,
        pl_n: p.n, pl_gf_pg: p.gf_pg, pl_ga_pg: p.ga_pg, pl_league_pg: lg,
        rel_gf: p.gf_pg / lg, rel_ga: p.ga_pg / lg,
        att: p.gf_pg / c.gf_pg, def: p.ga_pg / c.ga_pg });
    }
  }
  if (skipped.length) { console.log("\nSKIPPED:"); skipped.forEach(s => console.log("  " + s)); }

  console.log(`\nn = ${pairs.length} club-seasons from ${new Set(pairs.map(p => p.pl_season)).size} PL seasons`);
  const bySeason = {};
  for (const p of pairs) (bySeason[p.pl_season] ||= []).push(p);
  const odd = Object.entries(bySeason).filter(([, v]) => v.length !== 3);
  console.log(odd.length ? `  NOTE: ${odd.map(([k, v]) => `${k}=${v.length}`).join(", ")} (not 3 promoted)`
                         : "  3 promoted clubs in every season — as expected");

  console.log("\n" + "-".repeat(84));
  console.log("THE PAIRS — CHAMPIONSHIP (46 games) -> PL (38 games)");
  console.log("-".repeat(84));
  console.log("season        club                Ch GF  Ch GA  Ch pts | PL GF  PL GA |  att   def");
  for (const p of pairs.slice().sort((a, b) => a.pl_season.localeCompare(b.pl_season) || a.name.localeCompare(b.name)))
    console.log(`${p.season.padEnd(13)} ${p.name.padEnd(19)} ${p.ch_gf_pg.toFixed(2)}  ${p.ch_ga_pg.toFixed(2)}   `
      + `${String(p.ch_pts).padStart(3)}   | ${p.pl_gf_pg.toFixed(2)}  ${p.pl_ga_pg.toFixed(2)}  | `
      + `${f3(p.att)} ${f3(p.def)}`);

  const att = pairs.map(p => p.att), def = pairs.map(p => p.def);
  const rows = [["attack (PL GF / Ch GF)", att, 0.75], ["defence (PL GA / Ch GA)", def, 1.35]];
  console.log("\n" + "-".repeat(84));
  console.log("THE RATIOS — MEAN AND MEDIAN, BOTH WITH BOOTSTRAP CI (4,000 iterations)");
  console.log("-".repeat(84));
  const est = {};
  for (const [lab, v, cur] of rows) {
    const mCI = bootCI(v, mean), dCI = bootCI(v, median);
    const sd = Math.sqrt(v.reduce((a, x) => a + (x - mean(v)) ** 2, 0) / (v.length - 1));
    est[lab.startsWith("attack") ? "att" : "def"] = { mean: mean(v), median: median(v), meanCI: mCI, medCI: dCI, sd,
      min: Math.min(...v), max: Math.max(...v), current: cur,
      currentInMeanCI: cur >= mCI[0] && cur <= mCI[1], currentInMedCI: cur >= dCI[0] && cur <= dCI[1] };
    console.log(`${lab.padEnd(24)} mean   ${f3(mean(v))}  CI [${f3(mCI[0])}, ${f3(mCI[1])}]`);
    console.log(`${"".padEnd(24)} median ${f3(median(v))}  CI [${f3(dCI[0])}, ${f3(dCI[1])}]`);
    console.log(`${"".padEnd(24)} sd ${f3(sd)}  range ${f3(Math.min(...v))}-${f3(Math.max(...v))}`);
    console.log(`${"".padEnd(24)} CONSTANT IN CODE ${cur} -> ${cur >= mCI[0] && cur <= mCI[1] ? "INSIDE" : "OUTSIDE"} mean CI, `
      + `${cur >= dCI[0] && cur <= dCI[1] ? "INSIDE" : "OUTSIDE"} median CI`);
  }

  /* ---- 3. PASSAR EITT PAR? Segir B-deildin nokkud um hlutfallid? ---- */
  console.log("\n" + "-".repeat(84));
  console.log("DOES ONE RATIO PAIR FIT? — ratio vs Championship strength");
  console.log("-".repeat(84));
  for (const [lab, v] of [["attack:", att], ["defence:", def]]) {
    console.log(`  ${lab.padEnd(8)} r(Ch pts) = ${f3(pearson(pairs.map(p => p.ch_pts), v))}`
      + `   r(Ch GD) = ${f3(pearson(pairs.map(p => p.ch_gd), v))}`);
  }
  /* OG HITT PROFID, SEM ER ThAD SEM MALI SKIPTIR: er B-deildar-TALAN
     yfirhofud forspa um PL-utkomuna? Se r ~ 0 er MARGFOLDUNAR-FORMID
     sjalft suð — tha vaeri fasti (deildar-botn) betri en hlutfall.       */
  console.log("\n  does the Championship number predict the PL number at all?");
  console.log(`    r(Ch GF/game -> PL GF/game) = ${f3(pearson(pairs.map(p => p.ch_gf_pg), pairs.map(p => p.pl_gf_pg)))}`);
  console.log(`    r(Ch GA/game -> PL GA/game) = ${f3(pearson(pairs.map(p => p.ch_ga_pg), pairs.map(p => p.pl_ga_pg)))}`);
  console.log(`    r(Ch pts     -> PL GF/game) = ${f3(pearson(pairs.map(p => p.ch_pts), pairs.map(p => p.pl_gf_pg)))}`);
  console.log(`    r(Ch pts     -> PL GA/game) = ${f3(pearson(pairs.map(p => p.ch_pts), pairs.map(p => p.pl_ga_pg)))}`);

  /* HLUTFALL A MOTI FASTA — UT FYRIR URTAK, LEAVE-ONE-SEASON-OUT.
     Baðar leidir eru fittadar a ollum timabilum NEMA einu og maeldar a
     thvi. Thad er sama form sem `rank-model.mjs` notar (LOSO), og thad er
     eina leidin til ad segja hvort margfoldunar-formid borgi sig.        */
  /* SUNDURLIDAD PER HLID — samanlagt MAE getur falid hvor hlidin drifur
     thad, og svarid er OLIKT fyrir sokn og vorn. Ein tala fyrir baðar er
     tvaer akvardanir undir einum maelikvarda.                            */
  console.log("\n  out-of-sample MAE (leave-one-season-out), SPLIT BY SIDE:");
  const seasons = [...new Set(pairs.map(p => p.pl_season))];
  const A = { ratioMean: [], ratioMed: [], constMean: [], constMed: [], current: [] };
  const D = { ratioMean: [], ratioMed: [], constMean: [], constMed: [], current: [] };
  for (const s of seasons) {
    const tr = pairs.filter(p => p.pl_season !== s), te = pairs.filter(p => p.pl_season === s);
    const rA = mean(tr.map(p => p.att)), rD = mean(tr.map(p => p.def));
    const rAm = median(tr.map(p => p.att)), rDm = median(tr.map(p => p.def));
    const cA = mean(tr.map(p => p.pl_gf_pg)), cD = mean(tr.map(p => p.pl_ga_pg));
    const cAm = median(tr.map(p => p.pl_gf_pg)), cDm = median(tr.map(p => p.pl_ga_pg));
    for (const p of te) {
      A.ratioMean.push(Math.abs(p.ch_gf_pg * rA  - p.pl_gf_pg));
      A.ratioMed .push(Math.abs(p.ch_gf_pg * rAm - p.pl_gf_pg));
      A.constMean.push(Math.abs(cA  - p.pl_gf_pg));
      A.constMed .push(Math.abs(cAm - p.pl_gf_pg));
      A.current  .push(Math.abs(p.ch_gf_pg * 0.75 - p.pl_gf_pg));
      D.ratioMean.push(Math.abs(p.ch_ga_pg * rD  - p.pl_ga_pg));
      D.ratioMed .push(Math.abs(p.ch_ga_pg * rDm - p.pl_ga_pg));
      D.constMean.push(Math.abs(cD  - p.pl_ga_pg));
      D.constMed .push(Math.abs(cDm - p.pl_ga_pg));
      D.current  .push(Math.abs(p.ch_ga_pg * 1.35 - p.pl_ga_pg));
    }
  }
  const maes = {};
  console.log("    form         ATTACK  DEFENCE  both");
  for (const k of Object.keys(A)) {
    maes[k] = { att: mean(A[k]), def: mean(D[k]), both: mean(A[k]) + mean(D[k]) };
    console.log(`    ${k.padEnd(11)} ${f3(mean(A[k]))}   ${f3(mean(D[k]))}    ${f3(mean(A[k]) + mean(D[k]))}`);
  }
  /* PARAD BOOTSTRAP A MISMUNINUM — "hlutfall a moti fasta" a SOMU
     leikjum, thvi obundin CI tveggja MAE-talna svarar annarri spurningu. */
  for (const [lab, S] of [["ATTACK ", A], ["DEFENCE", D]]) {
    for (const [k, other] of [["ratioMean", "constMean"], ["current", "constMean"]]) {
      const d = S[k].map((x, i) => x - S[other][i]);
      const ci = bootCI(d, mean);
      console.log(`    ${lab} delta ${k} - ${other}: ${f3(mean(d))}  CI [${f3(ci[0])}, ${f3(ci[1])}]`
        + `  -> ${ci[0] > 0 ? "CONSTANT WINS" : ci[1] < 0 ? "ratio wins" : "INDISTINGUISHABLE"}`);
    }
  }

  /* FASTINN SJALFUR MED CI — thad er talan sem faeri inn i kodann. */
  const cAll = { att: pairs.map(p => p.pl_gf_pg), def: pairs.map(p => p.pl_ga_pg) };
  console.log("\n  THE CONSTANT — what promoted clubs actually did in the PL (goals/game):");
  for (const [k, v] of Object.entries(cAll)) {
    const mCI = bootCI(v, mean), dCI = bootCI(v, median);
    est[k].constMean = mean(v); est[k].constMeanCI = mCI;
    est[k].constMedian = median(v); est[k].constMedCI = dCI;
    console.log(`    ${k}: mean ${f3(mean(v))} CI [${f3(mCI[0])}, ${f3(mCI[1])}]   `
      + `median ${f3(median(v))} CI [${f3(dCI[0])}, ${f3(dCI[1])}]   range ${f3(Math.min(...v))}-${f3(Math.max(...v))}`);
  }
  /* NAEMI A URTAKI — sidustu 10 timabil ein. Nylidum hefur farnast verr
     med timanum (Sheffield United 2,74 a sig 2023/24), svo tala sem
     hvilir a 15 timabilum ma ekki fela leitni sem er raunveruleg.        */
  const last10 = pairs.filter(p => seasons.slice(-10).includes(p.pl_season));
  console.log(`\n  sensitivity — last 10 seasons only (n=${last10.length}):`);
  for (const [k, sel] of [["att", p => p.pl_gf_pg], ["def", p => p.pl_ga_pg]]) {
    const v = last10.map(sel), ci = bootCI(v, mean);
    console.log(`    ${k}: mean ${f3(mean(v))} CI [${f3(ci[0])}, ${f3(ci[1])}]`);
  }

  /* ---- 5b. ER FASTINN ERA-STODUGUR? Absolut a moti hlutfalli af deild ----
     Fasti i MORKUM er bundinn theim markafjolda sem deildin skoradi thau
     ar. Se skorun a leitni er hlutfall af deildar-medaltali rettara form.
     Maelt her fremur en agiskad — og talan er OBUNDIN af ThVI hvad
     `team_form.json` naer yfir, thvi hun kemur ur E0 sjalfri.            */
  console.log("\n" + "-".repeat(84));
  console.log("ERA STABILITY — ABSOLUTE CONSTANT VS SHARE OF THE LEAGUE MEAN");
  console.log("-".repeat(84));
  const lgBySeason = seasons.map(s => ({ s, lg: bySeason[s][0].pl_league_pg }));
  console.log(`  league mean (goals/game) ${f3(Math.min(...lgBySeason.map(x => x.lg)))}-`
    + `${f3(Math.max(...lgBySeason.map(x => x.lg)))}, latest ${f3(lgBySeason.at(-1).lg)} (${lgBySeason.at(-1).s})`);
  for (const [lab, k] of [["scored ", "rel_gf"], ["conceded", "rel_ga"]]) {
    const v = pairs.map(p => p[k]), ci = bootCI(v, mean);
    console.log(`  ${lab.padEnd(9)} share of league mean: ${f3(mean(v))} CI [${f3(ci[0])}, ${f3(ci[1])}]`
      + `  -> x ${f3(lgBySeason.at(-1).lg)} = ${f3(mean(v) * lgBySeason.at(-1).lg)} goals/game`);
    est[k === "rel_gf" ? "att" : "def"].rel = mean(v);
    est[k === "rel_gf" ? "att" : "def"].relCI = ci;
  }
  /* LEITNI I TIMA — se hun ekki greinanleg er absolut fasti nogu god. */
  const yr = pairs.map((p, i) => seasons.indexOf(p.pl_season));
  console.log(`  time trend: r(season -> PL GF) = ${f3(pearson(yr, pairs.map(p => p.pl_gf_pg)))}`
    + `   r(season -> PL GA) = ${f3(pearson(yr, pairs.map(p => p.pl_ga_pg)))}`);
  console.log(`              r(season -> share GF) = ${f3(pearson(yr, pairs.map(p => p.rel_gf)))}`
    + `   r(season -> share GA) = ${f3(pearson(yr, pairs.map(p => p.rel_ga)))}`);

  /* ---- 4. HVAD ThYDIR ThETTA FYRIR ThRJU LIDIN, OG HVAR RADAST THAU? ---- */
  console.log("\n" + "-".repeat(84));
  console.log("WHAT EACH FORM IMPLIES FOR IPSWICH / COVENTRY / HULL");
  console.log("-".repeat(84));
  const promoted = JSON.parse(readFileSync(`${ROOT}/data/promoted_baseline.json`, "utf8"));
  const tf = JSON.parse(readFileSync(`${ROOT}/data/team_form.json`, "utf8"));
  const league = (tf.teams || []).filter(t => t.matches > 0);
  const gfL = league.map(t => t.goals_pg).sort((a, b) => b - a);
  const gaL = league.map(t => t.conceded_pg).sort((a, b) => a - b);
  console.log(`  last PL season (${league.length} clubs with an E0 row): mean GF/game ${f3(mean(gfL))}, `
    + `mean GA/game ${f3(mean(gaL))}`);
  console.log(`  six worst defences: ${gaL.slice(-6).map(x => x.toFixed(2)).join(" / ")}`);
  console.log(`  six weakest attacks: ${gfL.slice(-6).map(x => x.toFixed(2)).join(" / ")}`);
  const rankOf = (arr, v, hiBetter) => {
    const s = arr.slice().sort((a, b) => (hiBetter ? b - a : a - b));
    let i = 0; while (i < s.length && (hiBetter ? s[i] > v : s[i] < v)) i++;
    return i + 1;
  };
  const variants = [
    ["IN CODE BEFORE  0.75 / 1.35", 0.75, 1.35],
    ["measured ratio, mean", est.att.mean, est.def.mean],
    ["measured ratio, median", est.att.median, est.def.median],
  ];
  for (const [lab, a, d] of variants) {
    console.log(`\n  ${lab}  (attack x${f3(a)}, defence x${f3(d)})`);
    for (const [name, pb] of Object.entries(promoted)) {
      const xg = +(pb.goals_pg * a).toFixed(2), xgc = +(pb.goals_against_pg * d).toFixed(2);
      console.log(`    ${name.padEnd(9)} attack ${xg.toFixed(2)} (rank ${String(rankOf(gfL, xg, true)).padStart(2)}/${league.length + 1})`
        + `   conceded ${xgc.toFixed(2)} (rank ${String(rankOf(gaL, xgc, false)).padStart(2)}/${league.length + 1})`);
    }
  }
  /* FASTINN — sami fyrir oll thrju, og thad er EKKI tap: B-deildar-talan
     bar enga forspa ut fyrir urtak (r=-0,038 a vornina), svo adgreining
     eftir henni var HAVADI dulbuinn sem upplysingar. Elo og markadslinan
     adgreina lidin afram og gera thad a maeldum grunni.                  */
  for (const [lab, a, d] of [["CONSTANT mean", est.att.constMean, est.def.constMean],
                             ["CONSTANT median", est.att.constMedian, est.def.constMedian],
                             ["CONSTANT rounded (into the code)", 1.03, 1.71]]) {
    console.log(`\n  ${lab}  (attack ${f3(a)}, conceded ${f3(d)} — SAME for all three)`);
    console.log(`    rank: attack ${rankOf(gfL, a, true)}/${league.length + 1}   `
      + `conceded ${rankOf(gaL, d, false)}/${league.length + 1}`);
  }
  /* INVARIANTID SEM VAR BROTID: nylidi skal vera VERRI en deildar-medaltal
     a BADUM hlidum. Talid berum ordum fyrir hverja leid.                 */
  console.log("\n  INVARIANT — promoted club worse than the league mean on BOTH sides:");
  const gfM = mean(gfL), gaM = mean(gaL);
  for (const [lab, a, d, isRatio] of [["ratio 0.75/1.35 (before)", 0.75, 1.35, true],
                                      ["constant 1.03/1.71", 1.03, 1.71, false]]) {
    const bad = [];
    for (const [name, pb] of Object.entries(promoted)) {
      const xg = isRatio ? pb.goals_pg * a : a, xgc = isRatio ? pb.goals_against_pg * d : d;
      if (!(xg < gfM && xgc > gaM)) bad.push(`${name} (attack ${xg.toFixed(2)}, conceded ${xgc.toFixed(2)})`);
    }
    console.log(`    ${lab.padEnd(26)} ${bad.length ? "VIOLATED: " + bad.join(", ") : "HOLDS for all three"}`);
  }

  /* ---- 5. ER HRAA B-DEILDAR-VARNARTALAN SJALF VANDAMALID? ----
     Ipswich fekk 1,02 a sig i B-deildinni — GOD vorn thar. Se hlutfallid
     eins fyrir alla verdur god B-deildar-vorn god PL-vorn, sem er einmitt
     einkennid. Maelt: er hlutfallid HAERRA fyrir tha sem hofdu godа vorn?  */
  console.log("\n" + "-".repeat(84));
  console.log("IS THE RATIO CONSTANT ACROSS CHAMPIONSHIP STRENGTH? (thirds)");
  console.log("-".repeat(84));
  for (const [lab, key, rkey] of [["Ch GF/game", "ch_gf_pg", "att"], ["Ch GA/game", "ch_ga_pg", "def"]]) {
    const s = pairs.slice().sort((a, b) => a[key] - b[key]);
    const k = Math.floor(s.length / 3);
    const parts = [s.slice(0, k), s.slice(k, s.length - k), s.slice(s.length - k)];
    console.log(`  ${lab}:`);
    parts.forEach((p, i) => console.log(`    third ${i + 1} (${key} ${f3(p[0][key])}-${f3(p[p.length - 1][key])}, n=${p.length}): `
      + `${rkey} ratio mean ${f3(mean(p.map(x => x[rkey])))}, median ${f3(median(p.map(x => x[rkey])))}`
      + `  |  actual PL ${rkey === "att" ? "GF" : "GA"}/game mean ${f3(mean(p.map(x => rkey === "att" ? x.pl_gf_pg : x.pl_ga_pg)))}`));
  }

  /* ---- 6. ThRIDJI KOSTURINN: MAELD HALLATALA (skridin ad medaltali) ----
     Hlutfall er sertilfelli af linu sem gengur gegnum NULL — thad
     margfaldar SPONNINA i B-deildinni ohaeft. Thridjungs-taflan segir ad
     raunveruleg PL-sponn se margfalt minni, svo retta formid gaeti verid
     `a + b*Ch` med MAELDRI b. LOSO segir hvort hun borgar sig.           */
  console.log("\n" + "-".repeat(84));
  console.log("THIRD OPTION — MEASURED SLOPE `a + b*Ch` (LOSO)");
  console.log("-".repeat(84));
  const fit = (xs, ys) => { const mx = mean(xs), my = mean(ys);
    let a = 0, b = 0; for (let i = 0; i < xs.length; i++) { a += (xs[i] - mx) * (ys[i] - my); b += (xs[i] - mx) ** 2; }
    const slope = b ? a / b : 0; return { slope, icept: my - slope * mx }; };
  const LR = { att: [], def: [] };
  for (const s of seasons) {
    const tr = pairs.filter(p => p.pl_season !== s), te = pairs.filter(p => p.pl_season === s);
    const fa = fit(tr.map(p => p.ch_gf_pg), tr.map(p => p.pl_gf_pg));
    const fd = fit(tr.map(p => p.ch_ga_pg), tr.map(p => p.pl_ga_pg));
    for (const p of te) {
      LR.att.push(Math.abs(fa.icept + fa.slope * p.ch_gf_pg - p.pl_gf_pg));
      LR.def.push(Math.abs(fd.icept + fd.slope * p.ch_ga_pg - p.pl_ga_pg));
    }
  }
  const fullA = fit(pairs.map(p => p.ch_gf_pg), pairs.map(p => p.pl_gf_pg));
  const fullD = fit(pairs.map(p => p.ch_ga_pg), pairs.map(p => p.pl_ga_pg));
  console.log(`  attack : b = ${f3(fullA.slope)}, a = ${f3(fullA.icept)}   MAE ${f3(mean(LR.att))} (constant ${f3(maes.constMean.att)})`);
  console.log(`  defence: b = ${f3(fullD.slope)}, a = ${f3(fullD.icept)}   MAE ${f3(mean(LR.def))} (constant ${f3(maes.constMean.def)})`);
  for (const [lab, k] of [["ATTACK ", "att"], ["DEFENCE", "def"]]) {
    const base = k === "att" ? A.constMean : D.constMean;
    const d = LR[k].map((x, i) => x - base[i]), ci = bootCI(d, mean);
    console.log(`  ${lab} delta line - constant: ${f3(mean(d))} CI [${f3(ci[0])}, ${f3(ci[1])}]`
      + ` -> ${ci[0] > 0 ? "CONSTANT WINS" : ci[1] < 0 ? "line wins" : "INDISTINGUISHABLE"}`);
  }
  est.att.slope = fullA.slope; est.att.icept = fullA.icept;
  est.def.slope = fullD.slope; est.def.icept = fullD.icept;

  if (argJson) {
    writeFileSync(argJson, JSON.stringify({ n: pairs.length, pairs, est, maes }, null, 2));
    console.log(`\nwrote: ${argJson}`);
  }
  console.log("\n" + "=".repeat(84));
}
main().catch(e => { console.error(e); process.exit(1); });
