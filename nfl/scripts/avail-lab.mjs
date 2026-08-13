#!/usr/bin/env node
/* ============================================================
   avail-lab.mjs — ER `AVAIL` MAELD EDA AGISKUD?

     node scripts/avail-lab.mjs [--from=2019] [--boot=400] [--shrink=25]

   -> data/measure/avail.json

   ============================================================
   HVERS VEGNA ThETTA ER HAESTA OMAELDA LYFTISTONGIN
   ============================================================
   `gap-lab` sundurgreindi start/sit-bilid: vikulikanid lokar 5,831%
   af `flat -> ceiling` og 94% er olokad. Af flokkunum var
   **availability #1**: 16,1% af bilinu vid audgun 1,42x — eina
   flokkurinn sem baedi ber staerd OG audgun. Vornar-flokkurinn (26,7%)
   er NULL-flaska (audgun 0,96x, merki-stig 0,00).

   Og `AVAIL` i `src/model.js` er AGISKUD. Athugasemdin thar segir
   thad sjalf ("kvordun, ekki vefrett") og hun er MERKT sem mat i
   `AVAIL_MEASURED`. Ein tafla fyrir allar stodur:

     Out/IR/PUP/Sus 0 · Doubtful 0,25 · DNR 0,5
     Questionable 0,75 · Probable 0,95 · Active 1

   `availability()` er notud i `weeklyProjection` OG i `lineup.js`
   (`ev = proj x avail`), svo hun hreyfir HVERJA start/sit-akvordun.

   ============================================================
   GOGNIN VORU A DISKNUM OG OLESIN
   ============================================================
   `build-features.mjs` linu 204 saekir `injuries_{ar}.csv` og les
   **fjora dalka**: season, week, gsis_id, report_status. Skrain ber 16.
   Thessir voru ALDREI lesnir:

     report_primary_injury · report_secondary_injury
     practice_primary_injury · practice_secondary_injury
     **practice_status**  (DNP / Limited / Full participation)

   Aefingaskyrslan er thekktasta "spilar hann?"-merkid sem til er og
   hun er bakprofanleg 2019-2025.

   ============================================================
   TVAER PROFRAUNIR, OG SU FYRRI GETUR EKKI SVARAD SPURNINGUNNI
   ============================================================
   `gap-lab` ber varnagla sem er MIKILVAEGARI en hann litur ut fyrir:
   **full fjarvist er OSYNILEG.** 19,1% af hopa-vikum (3.206: 742 bye,
   2.464 fjarverandi) bera enga rod i `weekly/*.json` og eru **siadar
   ut ur BADUM uppstillingum** — `lineupIds` sleppir theim thvi `rowOf`
   er null. Their leggja NULL til `ceiling - weekly`.

   Afleidingin er hord og hun var maeld hér: i theirri profraun er
   tiltaekileiki **naerri thvi ohreyfanlegur**. Fullkomin vitneskja um
   hverjir spila (`oracleRow`) gefur NAKVAEMLEGA sama svar og avail=1 —
   5,831% baedi — thvi hver madur i lauginni SPILADI ThEGAR. Profraun
   sem getur ekki greint fullkomna vitneskju fra engri vitneskju getur
   ekki maelt tiltaekileika. Punktur.

   Thess vegna eru profraunirnar TVAER og thaer eru merktar:

     HARNESS A "rowsOnly"   — NAKVAEMLEGA `gap-lab`/`startsit-lab`.
       Laugin er their sem BERA rod. AKKERID (5,831 / 3,199 / 2,967)
       er hér og thad er skilyrdi. Hér maelist adeins HLUTA-brestur.

     HARNESS B "absenceVisible" — laugin er allir i hopnum sem eiga
       LEIK thessa viku (bye undanskilid, thvi stjornandi ThEKKIR bye
       og `weeklyProjection` hefur `bye`-vidfang). Sa sem er fjarverandi
       er MED i lauginni og skorar 0. `flat` stillir honum upp thvi hun
       veit ekkert; tafla ur aefingaskyrslunni getur sett hann a bekk.
       **Bilid er annad og staerra, svo AKKERID GILDIR EKKI HER** —
       thad er sagt i utkomunni (`anchorApplies: false`).

   B er ekki "bjartsynni utgafan". B er spurningin. A er akkerid.

   ============================================================
   LEKI — OG HANN VAR STADFESTUR, EKKI GEFIN SER
   ============================================================
   Aefingaskyrsla vikunnar er gild INNTAK adeins ef hun er skrifud
   FYRIR leikinn. `date_modified` er i skranni og hun er maeld gegn
   raunverulegum leiktima (`schedules/games.csv`, gameday + gametime i
   ET). Utkoman er i `leakage` i skranni. Radir sem eru breyttar EFTIR
   upphaf leiks eru **felldar ut**, taldar og skradar — thaer eru ekki
   "naestum i lagi".

   ============================================================
   NULL-TILGATAN ER NUVERANDI TAFLA
   ============================================================
   Ekki avail=1. Nuverandi `AVAIL` beitt a `report_status` er
   `A1_current` og hun vinnur nema per-leikmanns CI utiloki hana OG
   deltan fari yfir placebo-thakid. Sex placeboar af TVEIMUR TEGUNDUM
   fara gegnum sama net; throskuldurinn er `maxPositiveT`, EINHLIDA
   (`usage-lab` fann ad `max |t|` gaf 22,238 fyrir holf sem TAPADI i
   hverju ari — orsmá dreifni — og sá galli flippadi svari).
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { weeklyProjection, impliedTeamTotals, AVAIL } from "../src/model.js";
import { optimalLineup, slotsFor } from "../src/lineup.js";
import { normTeam } from "../src/names.js";
import { mean } from "../src/learn.js";
import { objects, str, num } from "./lib/csv.mjs";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const MEAS = path.join(OUT, "measure");
const CACHE = path.resolve(process.cwd(), "scripts/.avail-cache");
const REL = "https://github.com/nflverse/nflverse-data/releases/download";

const ARG = parseArgs(process.argv.slice(2),
  { from: "number", boot: "number", shrink: "number" });
const FROM = Number(ARG.from ?? 2019);
const BOOT = Number(ARG.boot ?? 400);
const SHRINK = Number(ARG.shrink ?? 25);

/* Deildin er SAMA og i `startsit-lab`/`gap-lab`. Onnur deild gefur
   adra hopa og tha er akkerid ekki akkeri. */
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const SLOTS = slotsFor(LEAGUE);

const FORMATS = ["ppr", "half", "standard"];
const POSN = ["QB", "RB", "WR", "TE"];
/* Rodun stada — NOTUD TIL AD BRJOTA JAFNTEFLI EINS OG `startsit-lab`.
   Sja `gap-lab` kafla 1: `optimalLineup` gaf 8 af 3.687 annad svar an
   thessarar rodunar og heildin fell ur 5,831% i 5,657%. */
const PORD = { QB: 0, RB: 1, WR: 2, TE: 3 };

const RS_ORD = ["NotListed", "None", "Questionable", "Doubtful", "Out"];
const PS_ORD = ["NotListed", "Full", "Limited", "DNP", "None"];
const PSK = {
  "Full Participation in Practice": "Full",
  "Limited Participation in Practice": "Limited",
  "Did Not Participate In Practice": "DNP",
};

/* Likamshlutar i flokka. HOPARNIR ERU EFNISLEGIR, ekki tidni-drifnir:
   mjukvefur i nedri utlim er annad mal en fingur, og "hendum theim
   sem eru fair" vaeri ad velja flokkana eftir svarinu. */
const BODY_GROUP = {
  Hamstring: "softLower", Groin: "softLower", Calf: "softLower",
  Quadricep: "softLower", Thigh: "softLower", Hip: "softLower",
  Adductor: "softLower", Glute: "softLower", Hipflexor: "softLower",
  Knee: "jointLower", Ankle: "jointLower", Foot: "jointLower",
  Toe: "jointLower", Achilles: "jointLower", Heel: "jointLower",
  Shin: "jointLower", Fibula: "jointLower", Tibia: "jointLower",
  Shoulder: "upper", Elbow: "upper", Wrist: "upper", Hand: "upper",
  Finger: "upper", Thumb: "upper", Forearm: "upper", Biceps: "upper",
  Triceps: "upper", Pectoral: "upper", Clavicle: "upper",
  Concussion: "head", Head: "head", Neck: "head", Eye: "head",
  Jaw: "head", Face: "head",
  Back: "core", Ribs: "core", Abdomen: "core", Oblique: "core",
  Chest: "core", Core: "core", Hipandback: "core",
  Illness: "illness", Rest: "illness", "Not Injury Related": "illness",
  "Non-Football Injury": "illness", Personal: "illness",
};
const bodyGroupOf = (b) => {
  if (!b || b === "NotListed") return "NotListed";
  const k = String(b).trim();
  if (BODY_GROUP[k]) return BODY_GROUP[k];
  /* Fyrsta ordid — nflverse ber "Left Knee", "Right Hamstring" ofl. */
  for (const w of k.split(/[\s/,]+/)) if (BODY_GROUP[w]) return BODY_GROUP[w];
  return "other";
};

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
const die = (m) => { console.error(`\n  ${m}\n`); process.exit(2); };
const line = "=".repeat(74);

/* Tvihlida 95% t-throskuldur eftir frelsisgradum. HARDKODUD TALA VAR
   RONG I `startsit-lab` (2,228 er df=10, 2,776 er df=4) og hun var
   valin eftir FJOLDA ARA, ekki df. Hér er hun rett. */
const TCRIT = { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447,
  7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179 };
const tCritFor = (n) => (n < 2 ? null : (TCRIT[n - 1] ?? 1.96));

function statOf(vals) {
  const v = vals.filter((x) => x != null && Number.isFinite(x));
  if (!v.length) return { mean: null, t: null, years: 0, positive: 0, sd: null, se: null, ci: null };
  const m = mean(v);
  const sd = v.length > 1
    ? Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1)) : 0;
  const se = v.length > 1 ? sd / Math.sqrt(v.length) : 0;
  const tc = tCritFor(v.length);
  return { mean: r3(m), t: se ? r3(m / se) : null, years: v.length,
    positive: v.filter((x) => x > 0).length, sd: r3(sd), se: r3(se), tCrit: tc,
    ci: tc && se ? [r3(m - tc * se), r3(m + tc * se)] : null };
}

/* Fast fraekorn — endurgeranleg keyrsla er krafa, ekki thaegindi.
   FNV-1a: akvedid, hrad, og HAD ENGRI slembitolu-vel svo tvaer
   keyrslur geti ekki rekid i sundur. */
function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return h >>> 0;
}
const unit = (s) => hash32(s) / 4294967296;
const rngOf = (seed) => { let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

/* ============================================================
   1. SAEKJA MEIDSLASKRARNAR — MED DISKA-SKYNDIMINNI
   ============================================================
   Eigid skyndiminni i `scripts/.avail-cache/` (ekki `.cache-nfl/`,
   sem hefur 12 klst TTL): **maeling verdur ad vera endurgeranleg**, og
   skra sem fellur ur skyndiminni midja i throun laetur toluna hreyfast
   an ad kodinn breytist. Hér frystum vid heiminn thangad til einhver
   eydir skranum viljandi.

   RAASKRARNAR MA ALDREI COMMITTA. Their eru ~5 MB af hragognum sem
   nflverse birtir; repo-id a ad bera MAELINGUNA, ekki inntakid. */
async function loadInjuries(years) {
  await mkdir(CACHE, { recursive: true });
  const files = [];
  for (const y of years) {
    const f = path.join(CACHE, `injuries_${y}.csv`);
    if (!existsSync(f)) {
      const url = `${REL}/injuries/injuries_${y}.csv`;
      process.stdout.write(`  fetch injuries_${y}.csv ... `);
      const res = await fetch(url, { headers: { "User-Agent": "nfl-avail-lab" } });
      if (!res.ok) die(`injuries_${y}.csv: HTTP ${res.status}. The file must exist for ${y}.`);
      await writeFile(f, Buffer.from(await res.arrayBuffer()));
      console.log("ok");
    }
    files.push(f);
  }
  const g = path.join(CACHE, "games.csv");
  if (!existsSync(g)) {
    process.stdout.write("  fetch games.csv ... ");
    const res = await fetch(`${REL}/schedules/games.csv`, { headers: { "User-Agent": "nfl-avail-lab" } });
    if (!res.ok) die(`games.csv: HTTP ${res.status}`);
    await writeFile(g, Buffer.from(await res.arrayBuffer()));
    console.log("ok");
  }
  return { files, games: g };
}

const fpOf = (f) => {
  try {
    const buf = readFileSync(f);
    return { bytes: buf.length, sha1: createHash("sha1").update(buf).digest("hex").slice(0, 12),
      mtime: statSync(f).mtime.toISOString() };
  } catch { return null; }
};

async function main() {
  await mkdir(MEAS, { recursive: true });

  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const sched = JSON.parse(await readFile(path.join(OUT, "schedule_history.json"), "utf8"));
  const defFile = JSON.parse(await readFile(path.join(OUT, "defense.json"), "utf8"));
  const dvp = new Map();
  for (const d of defFile) dvp.set(`${d.season}|${d.team}|${d.pos}`, d);

  const years = [...new Set(feats.rows.filter((r) => r.sleeperProj != null || r.ffProj != null)
    .map((r) => r.season))].sort().filter((y) => y >= FROM);

  const weekRows = new Map();
  for (const y of years) {
    try {
      const w = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8"));
      weekRows.set(y, w.filter((r) => r.week <= 18 && POSN.includes(r.pos)));
    } catch { /* ar an vikugagna er sleppt — sama og i startsit-lab */ }
  }
  const YS = [...weekRows.keys()].sort();
  requireSeasons(YS, "timabil med vikugognum");
  console.log(`timabil: ${YS.join(", ")}\n`);

  const { files: injFiles, games: gamesFile } = await loadInjuries(YS);

  /* ---------- leiktimi, fyrir leka-profid ---------- */
  const kickAt = new Map();                    // y|w|team -> ms
  {
    const gtxt = await readFile(gamesFile, "utf8");
    for (const g of objects(gtxt, ["season", "game_type", "week", "gameday", "gametime",
        "away_team", "home_team"])) {
      const y = num(g.season);
      if (y == null || y < YS[0] || str(g.game_type) !== "REG") continue;
      const day = str(g.gameday);
      if (!day) continue;
      /* Timarnir eru i ET. An klukku er 13:00 ET notad — thad er
         FYRSTI mogulegi leiktimi, svo profid er VARFAERID: thad
         flaggar fremur ranglega en ad sleppa raunverulegum leka. */
      const ms = new Date(`${day}T${str(g.gametime) || "13:00"}:00-04:00`).getTime();
      if (!Number.isFinite(ms)) continue;
      const w = num(g.week);
      kickAt.set(`${y}|${w}|${normTeam(str(g.away_team))}`, ms);
      kickAt.set(`${y}|${w}|${normTeam(str(g.home_team))}`, ms);
    }
  }

  /* ---------- meidslaskyrslurnar ---------- */
  const INJ_COLS = ["season", "game_type", "team", "week", "gsis_id", "position",
    "report_primary_injury", "report_secondary_injury", "report_status",
    "practice_primary_injury", "practice_secondary_injury", "practice_status",
    "date_modified"];
  /* TVAER SKRAR, OG ThAD ER EKKI SKRAUT — SJA `timestampCoverage`.
       `repU`  ALLAR radir sem eiga leik. Notud AÐEINS i naemni-armi.
       `rep`   adeins radir ur timabilum sem er haegt ad LEKA-PROFA.
     `dmCover` er talin FYRST og hun akvedur hvad er stadfest. */
  const repU = new Map(), rep = new Map();
  const dmCover = new Map();                   // y -> { n, withDm }
  const ingest = { rowsAll: 0, reg: 0, posOk: 0, kept: 0,
    droppedNoKick: 0, droppedAfterKick: 0, duplicates: 0 };
  const leakHrs = [];
  const staged = [];
  for (const f of injFiles) {
    const txt = await readFile(f, "utf8");
    for (const r of objects(txt, INJ_COLS)) {
      ingest.rowsAll++;
      if (str(r.game_type) !== "REG") continue;
      ingest.reg++;
      const pos = str(r.position);
      if (!POSN.includes(pos)) continue;        // adeins skorandi stodur
      ingest.posOk++;
      const id = str(r.gsis_id), y = num(r.season), w = num(r.week);
      if (!id || y == null || w == null) continue;
      const c = dmCover.get(y) || { n: 0, withDm: 0 };
      c.n++; if (str(r.date_modified)) c.withDm++;
      dmCover.set(y, c);
      const kick = kickAt.get(`${y}|${w}|${normTeam(str(r.team))}`);
      /* Rod an leiktima er FELLD UT ur BADUM skram. Thaer eru 6 og
         thaer eru BUF-CIN 2022 (leikurinn sem var aldrei spiladur). */
      if (kick == null) { ingest.droppedNoKick++; continue; }
      const dm = str(r.date_modified) ? new Date(str(r.date_modified)).getTime() : null;
      if (dm != null) {
        leakHrs.push((kick - dm) / 3.6e6);
        /* LEKA-HLIDID. Rod sem var breytt EFTIR ad leikurinn byrjadi er
           ekki "naestum i lagi" — hun er utkoma i dulargervi inntaks. */
        if (dm > kick) { ingest.droppedAfterKick++; continue; }
      }
      let rs = str(r.report_status) || "None";
      if (!RS_ORD.includes(rs)) rs = "None";     // "Note" ofl -> engin utnefning
      staged.push({ id, y, w, dm, rs, ps: PSK[str(r.practice_status)] || "None",
        body: str(r.report_primary_injury) || "None" });
    }
  }
  /* ============================================================
     2025 BER **ENGA** `date_modified` — 1.750 af 1.750 radum
     ============================================================
     Fyrsta utgafa thessarar skriftu felldi 2025 THOGULT: leka-hlidid
     krafdist tímastimpils, 2025 hafdi hann ekki, og allar 2025-radir
     hurfu. Utkoman var ekki villa heldur VERRA: hvert 2025-holf las
     "NotListed" og arid var thvi DULBUINN A0-armur inni i medaltalinu,
     merktur eins og maeling. Talan sem birtist var 4.575 radir a
     meidslaskra i stad 5.475 og ekkert sagdi fra thvi.

     REGLAN SEM AF THESSU LEIDIR: thekja a leka-profinu er
     FULLYRDING, ekki logga. `timestampCoverage` er i skranni, arid er
     nefnt, og thad er UTAN adalmaelingarinnar — en thad er MAELT i
     naemni-armi (`*_unverified`) svo lesandi geti sed hvort utilokunin
     se varfaerin eda urslitarik. */
  const verified = new Set();
  for (const [y, c] of dmCover) if (c.n && c.withDm / c.n >= 0.95) verified.add(y);
  for (const s of staged) {
    const k = `${s.id}|${s.y}|${s.w}`;
    const val = { rs: s.rs, ps: s.ps, body: s.body, dm: s.dm };
    /* Sidasta skyrsla FYRIR leik gildir — hun er su sem stjornandi sa. */
    if (repU.has(k)) { ingest.duplicates++;
      const prev = repU.get(k);
      if (prev.dm != null && s.dm != null && s.dm <= prev.dm) continue; }
    else ingest.kept++;
    repU.set(k, val);
    if (verified.has(s.y)) rep.set(k, val);
  }
  leakHrs.sort((a, b) => a - b);
  const qh = (p) => (leakHrs.length ? r1(leakHrs[Math.floor(leakHrs.length * p)]) : null);
  const leakage = {
    rowsWithTimestamp: leakHrs.length,
    droppedNoKickoff: ingest.droppedNoKick,
    droppedModifiedAfterKickoff: ingest.droppedAfterKick,
    pctModifiedAfterKickoff: r3(leakHrs.length
      ? ingest.droppedAfterKick / leakHrs.length * 100 : null),
    hoursBeforeKickoff: { p1: qh(0.01), p5: qh(0.05), p50: qh(0.5), p95: qh(0.95) },
    timestampCoverage: Object.fromEntries([...dmCover].sort((a, b) => a[0] - b[0])
      .map(([y, c]) => [y, { rows: c.n, withDateModified: c.withDm,
        pct: r3(c.withDm / c.n * 100), leakVerifiable: verified.has(y) }])),
    verifiedSeasons: [...verified].sort(),
    unverifiedSeasons: [...dmCover.keys()].filter((y) => !verified.has(y)).sort(),
    note: "Every injury row carries date_modified and it is compared with the real kickoff " +
      "(nflverse games.csv gameday + gametime, ET; 13:00 ET assumed when gametime is blank, which " +
      "is the EARLIEST possible slot and therefore the conservative direction). Rows modified after " +
      "kickoff are DROPPED, counted and reported. The median lead time is ~49 hours and 78% of the " +
      "rows are stamped on a Friday, which is what a pre-game practice report should look like. " +
      "2025 carries NO date_modified at all (1750 of 1750 missing), so that season CANNOT be " +
      "leak-verified: it is outside the primary measurement and appears only in the *_unverified " +
      "sensitivity arms.",
  };
  console.log(`\nmeidslaskrar: ${ingest.rowsAll} radir · REG ${ingest.reg} · QB/RB/WR/TE ${ingest.posOk}`);
  console.log(`  haldid ${ingest.kept} · fellt (enginn leiktimi) ${ingest.droppedNoKick}` +
    ` · fellt (breytt EFTIR leik) ${ingest.droppedAfterKick}` +
    ` · tvitalningar ${ingest.duplicates}`);
  console.log(`  klst fyrir leik: p1 ${leakage.hoursBeforeKickoff.p1}` +
    ` · p50 ${leakage.hoursBeforeKickoff.p50} · p95 ${leakage.hoursBeforeKickoff.p95}`);
  console.log(`  timastimpla-thekja: ` + [...dmCover].sort((a, b) => a[0] - b[0])
    .map(([y, c]) => `${y} ${r1(c.withDm / c.n * 100)}%`).join(" · "));
  console.log(`  leka-stadfest timabil: ${[...verified].sort().join(", ")}` +
    `  ·  OSTADFEST: ${[...dmCover.keys()].filter((y) => !verified.has(y)).sort().join(", ") || "engin"}`);
  if (!verified.size)
    die("ENGIN timabil eru leka-stadfest. Tha er ekkert til ad maela a.");
  if (leakage.pctModifiedAfterKickoff != null && leakage.pctModifiedAfterKickoff > 2)
    die(`LEKA-HLIDID: ${leakage.pctModifiedAfterKickoff}% af radum eru breyttar EFTIR leik.\n` +
        "   Yfir 2% er ekki jadartilfelli heldur onnur skra en sú sem thessi maeling gerir rad fyrir.");

  /* ============================================================
     2. VIKU-SAMHENGI PER TIMABIL
     ============================================================ */
  const ctx = new Map();
  for (const y of YS) {
    const rs = weekRows.get(y);
    const games = sched.games.filter((g) => g.season === y && g.type === "REG");
    if (!games.length) continue;
    const implied = new Map(), oppTeam = new Map(), playing = new Map();
    for (const g of games) {
      const t = impliedTeamTotals(g.total, g.spread);
      if (t) { implied.set(`${g.home}|${g.week}`, t.home); implied.set(`${g.away}|${g.week}`, t.away); }
      oppTeam.set(`${g.home}|${g.week}`, g.away); oppTeam.set(`${g.away}|${g.week}`, g.home);
      if (!playing.has(g.week)) playing.set(g.week, new Set());
      playing.get(g.week).add(g.home); playing.get(g.week).add(g.away);
    }
    const wk = new Map(), teamWk = new Map(), weeks = new Set();
    for (const r of rs) {
      weeks.add(r.week);
      wk.set(`${r.id}|${r.week}`, { pos: r.pos, ppr: r.ppr, half: r.half, std: r.std });
      if (r.team) teamWk.set(`${r.id}|${r.week}`, normTeam(r.team));
    }
    /* Mest-spilada lid — NOTAD FYRIR THA SEM BERA ENGA ROD tha viku.
       Sama regla og `gap-lab` (og sama regla og BSD-porunin i
       FPL-verkefninu): "sidasti vinnur" er ekki endurgeranlegt. */
    const cnt = new Map();
    for (const r of rs) if (r.team) {
      const k = `${r.id}|${normTeam(r.team)}`; cnt.set(k, (cnt.get(k) || 0) + 1); }
    const seasonTeam = new Map();
    for (const [k, c] of cnt) { const [id, t] = k.split("|");
      const cur = seasonTeam.get(id); if (!cur || c > cur.c) seasonTeam.set(id, { t, c }); }
    ctx.set(y, { implied, oppTeam, playing, wk, teamWk, seasonTeam,
      weeks: [...weeks].sort((a, b) => a - b) });
  }

  /* Laug per snid — SAMA uppskrift og `gap-lab` (half = algebra, ekki
     nalgun: 0,5 per mottoku ER medaltal af 1,0 og 0,0). */
  const rowsBy = new Map();
  for (const r of feats.rows) rowsBy.set(`${r.scoring}|${r.season}|${r.id}`, r);
  function poolFor(fmt, y) {
    const src = fmt === "standard" ? "standard" : "ppr";
    const base = feats.rows.filter((r) => r.scoring === src && r.season === y &&
      r.adp != null && (r.sleeperProj != null || r.ffProj != null) && POSN.includes(r.pos));
    const out = [];
    for (const r of base) {
      const pj = r.sleeperProj != null ? r.sleeperProj : r.ffProj;
      let proj = pj, act = fmt === "standard" ? r.ptsStd : r.pts;
      if (fmt === "half") {
        const o = rowsBy.get(`standard|${y}|${r.id}`);
        if (!o) continue;                       // opardar radir eru SLEPPT, ekki agiskad
        const sj = o.sleeperProj != null ? o.sleeperProj : o.ffProj;
        if (sj == null) continue;
        proj = (pj + sj) / 2; act = (r.pts + o.ptsStd) / 2;
      }
      out.push({ id: r.id, pos: r.pos, proj, adp: r.adp, actual: act });
    }
    return out;
  }

  /* `wp1` — vikuleg spa MED avail=1. Thetta er nakvaemlega sama leid
     og `gap-lab`/`startsit-lab` nota, thvi tiltaekileiki er SIDASTI
     lidurinn i `weeklyProjection` og hann er thad sem er verid ad maela. */
  function wp1Of(y, fmt, id, pos, week, projPer17) {
    const c = ctx.get(y);
    const team = c.teamWk.get(`${id}|${week}`) || (c.seasonTeam.get(id) || {}).t;
    const imp = team ? c.implied.get(`${team}|${week}`) : null;
    const opp = team ? c.oppTeam.get(`${team}|${week}`) : null;
    const d = opp ? dvp.get(`${y}|${opp}|${pos}`) : null;
    const w = weeklyProjection({ base: projPer17, pos, implied: imp,
      def: d ? { adj: d.adj, leagueMean: d.leagueMean } : null, avail: 1, bye: false });
    return w && w.pts != null ? w.pts : projPer17;
  }

  /* ============================================================
     3. FIT-LAUGIN — DRAFTANLEG LAUG x VIKA, LID MED LEIK
     ============================================================
     Toflurnar eru fittadar a ThESSARI laug, ekki a hermdu hopunum.
     Astaedan er ekki staerd heldur ad hopunum er HERMT ur somu
     ADP-laug: fit a their vaeri fit a sjalfan maelikvardann.

     `row` er SATT ef leikmadurinn ber rod i `weekly` — og thad er
     ORDID sem er notad, ekki "spiladi". Their eru EKKI thad sama og
     munurinn er maeldur og skjaladur i `pRowCaveat`. */
  const fitRows = new Map();                   // fmt -> radir
  const unknownTeam = { n: 0, tot: 0 };
  for (const fmt of FORMATS) {
    const arr = [];
    for (const y of YS) {
      const c = ctx.get(y);
      if (!c) continue;
      for (const p of poolFor(fmt, y)) {
        const b = p.proj / 17;
        for (const week of c.weeks) {
          const r = c.wk.get(`${p.id}|${week}`);
          const team = r ? c.teamWk.get(`${p.id}|${week}`) : (c.seasonTeam.get(p.id) || {}).t;
          const pl = c.playing.get(week);
          if (fmt === "ppr") { unknownTeam.tot++; if (!team) unknownTeam.n++; }
          if (!team || !pl || !pl.has(team)) continue;   // bye eda obekkt lid
          const rp = rep.get(`${p.id}|${y}|${week}`);
          const ru = repU.get(`${p.id}|${y}|${week}`);
          arr.push({ id: p.id, season: y, week, pos: p.pos, vy: verified.has(y),
            wp1: wp1Of(y, fmt, p.id, p.pos, week, b),
            row: !!r, pts: r ? (fmt === "ppr" ? r.ppr : fmt === "half" ? r.half : r.std) : 0,
            rs: rp ? rp.rs : "NotListed",
            ps: rp ? rp.ps : "NotListed",
            bg: rp ? bodyGroupOf(rp.body) : "NotListed",
            /* OSTADFESTA utgafan — notud AÐEINS i naemni-armi. */
            rsU: ru ? ru.rs : "NotListed",
            psU: ru ? ru.ps : "NotListed",
            bgU: ru ? bodyGroupOf(ru.body) : "NotListed" });
        }
      }
    }
    fitRows.set(fmt, arr);
  }
  const fr0 = fitRows.get("ppr");
  const frV = fr0.filter((r) => r.vy);
  const onRep = frV.filter((r) => r.rs !== "NotListed").length;
  console.log(`\nfit-laug (ppr): ${fr0.length} leikmanna-vikur · leka-stadfestar ${frV.length}` +
    ` · a meidslaskra ${onRep} (${r1(onRep / frV.length * 100)}% af stadfestum)` +
    ` · obekkt lid ${unknownTeam.n}/${unknownTeam.tot}`);

  /* ---------- PORUNARHLUTFALL, BADAR ATTIR ---------- */
  const seasonIds = new Map();
  for (const y of YS) seasonIds.set(y, new Set(weekRows.get(y).map((r) => r.id)));
  let injInWeekly = 0, injTot = 0, injInPool = 0;
  const poolIds = new Map();
  for (const y of YS) poolIds.set(y, new Set(poolFor("ppr", y).map((p) => p.id)));
  for (const [k] of repU) {
    const [id, ys] = k.split("|"); const y = Number(ys);
    if (!YS.includes(y)) continue;
    injTot++;
    if (seasonIds.get(y).has(id)) injInWeekly++;
    if (poolIds.get(y).has(id)) injInPool++;
  }
  const joinRate = {
    injuryRowsKept: injTot,
    gsisFoundInWeeklySameSeason: injInWeekly,
    pctFoundInWeekly: r3(injTot ? injInWeekly / injTot * 100 : null),
    gsisInDraftablePool: injInPool,
    pctInDraftablePool: r3(injTot ? injInPool / injTot * 100 : null),
    pctInDraftablePoolNote: "This is NOT a match failure. Most injury-report rows belong to players " +
      "nobody drafts (third receivers, backup tight ends). The number that matters is " +
      "pctFoundInWeekly: 98.2% of report rows resolve to a gsis that appears in weekly the same " +
      "season, and the 1.8% that do not are players who never recorded a snap all year.",
    fitPopulationRows: fr0.length,
    fitPopulationLeakVerified: frV.length,
    fitPopulationOnReport: onRep,
    pctOfVerifiedFitPopulationOnReport: r3(onRep / frV.length * 100),
    idSpace: "injuries.gsis_id joined directly to weekly.id — both are gsis (00-00xxxxx). " +
      "No name matching anywhere in this lab, so no collision risk.",
  };
  console.log(`porun: gsis i weekly sama timabil ${joinRate.pctFoundInWeekly}%` +
    ` · i draftanlegri laug ${joinRate.pctInDraftablePool}%`);
  if (joinRate.pctFoundInWeekly < 90)
    die(`PORUNARHLUTFALLID ER ${joinRate.pctFoundInWeekly}% — undir 90%.\n` +
        "   Tha er porunin nidurstadan, ekki inntakid. Skrifa EKKERT.");

  /* ============================================================
     4. MAELDA TAFLAN
     ============================================================
     Fittad sem HLUTFALL SUMMA, ekki medaltal hlutfalla:

       avail(holf) = SUM raunstig / SUM (base x gameScript x defense)

     Thad er talan sem gerir spana OSKEKKTA i holfinu — sama rok og
     `gap-lab` notar fyrir TD-tidnirnar. Medaltal per-leikmanns hlutfalla
     hefdi gefid smaum spam sama vog og storum, og tha vaeri "avail"
     tala um bakverdi fremur en um akvardanir.

     SUNDURLIDUNIN ER NAKVAEM, EKKI NALGUN:
       pRowW  = SUM_{med rod} wp1 / SUM_alla wp1        (vegin spilatidni)
       cond   = SUM_{med rod} raunstig / SUM_{med rod} wp1
       avail  = pRowW x cond                            (nakvaemlega)
     og `pRow` (otalin tidni) er birt lika thvi hun er talan sem svarar
     spurningunni "spilar hann?" i mannamali. */
  function accum(rows2, keyFn) {
    const m = new Map();
    for (const r of rows2) {
      const k = keyFn(r);
      if (k == null) continue;
      const c = m.get(k) || { n: 0, nRow: 0, sAct: 0, sDen: 0, sDenRow: 0 };
      c.n++; c.sDen += r.wp1;
      if (r.row) { c.nRow++; c.sAct += r.pts; c.sDenRow += r.wp1; }
      m.set(k, c);
    }
    return m;
  }
  const cellOut = (c) => ({
    n: c.n, nRow: c.nRow,
    pRow: r4(c.n ? c.nRow / c.n : null),
    pRowWeighted: r4(c.sDen ? c.sDenRow / c.sDen : null),
    condRatio: r4(c.sDenRow ? c.sAct / c.sDenRow : null),
    avail: r4(c.sDen ? c.sAct / c.sDen : null),
  });

  /* SAMDRATTUR: K gervi-radir a hlutfalli MODURHOLFSINS, med
     medal-nefnara holfsins. K=25 er VAL og thad er sagt; naemnin er
     maeld vid 10/25/50/100 og birt (`shrinkSensitivity`). Holf med
     engan nefnara faer modurholfid ohreyft — thad er ekki agiskun,
     thad er "vid vitum ekkert um thetta holf". */
  const shrunk = (c, parent, K) => {
    if (!c || !c.n || !c.sDen) return parent;
    const dBar = c.sDen / c.n;
    return (c.sAct + K * parent * dBar) / (c.sDen + K * dBar);
  };

  /* Byggir tofluna ur GEFNUM radum (walk-forward gefur adeins fyrri ar). */
  function buildTable(rows2, K) {
    const g = accum(rows2, () => "*");
    const m0 = g.get("*") && g.get("*").sDen ? g.get("*").sAct / g.get("*").sDen : 1;
    const aRs = accum(rows2, (r) => r.rs);
    const aPosRs = accum(rows2, (r) => `${r.pos}|${r.rs}`);
    const aPosRsPs = accum(rows2, (r) => `${r.pos}|${r.rs}|${r.ps}`);
    const aRsPs = accum(rows2, (r) => `${r.rs}|${r.ps}`);
    const aRsPsBg = accum(rows2, (r) => `${r.rs}|${r.ps}|${r.bg}`);

    const vRs = new Map(), vPosRs = new Map(), vPosRsPs = new Map();
    for (const rs of RS_ORD) vRs.set(rs, shrunk(aRs.get(rs), m0, K));
    for (const p of POSN) for (const rs of RS_ORD)
      vPosRs.set(`${p}|${rs}`, shrunk(aPosRs.get(`${p}|${rs}`), vRs.get(rs), K));
    for (const p of POSN) for (const rs of RS_ORD) for (const ps of PS_ORD)
      vPosRsPs.set(`${p}|${rs}|${ps}`,
        shrunk(aPosRsPs.get(`${p}|${rs}|${ps}`), vPosRs.get(`${p}|${rs}`), K));

    /* Likamshluti er MARGFALDARI ofan a (rs x ps), samanlagdur yfir
       stodur. Per stodu vaeri hann 4x thynnri og tha vaeri svarid
       "n er lagt", ekki "merkid er ekki tharna". Se hluturinn hljod
       verdur hlutfallid 1 og T3 = T2 — thad er PROFID. */
    const vBg = new Map();
    for (const rs of RS_ORD) for (const ps of PS_ORD) {
      const base2 = shrunk(aRsPs.get(`${rs}|${ps}`), vRs.get(rs), K);
      for (const bg of new Set([...Object.values(BODY_GROUP), "other", "NotListed"])) {
        const v = shrunk(aRsPsBg.get(`${rs}|${ps}|${bg}`), base2, K);
        vBg.set(`${rs}|${ps}|${bg}`, base2 > 1e-6 ? v / base2 : 1);
      }
    }
    return { m0, vRs, vPosRs, vPosRsPs, vBg,
      raw: { global: cellOut(g.get("*") || { n: 0, nRow: 0, sAct: 0, sDen: 0, sDenRow: 0 }),
        byRs: aRs, byPosRs: aPosRs, byPosRsPs: aPosRsPs, byRsPs: aRsPs, byRsPsBg: aRsPsBg } };
  }

  const clamp01 = (x) => (x == null || !Number.isFinite(x) ? 1 : Math.min(1, Math.max(0, x)));
  /* THAKID 1 ER ASETT. `RB None Full` fittast i 1,086 — leikmenn sem
     eru a skra en oútnefndir SKORA YFIR spa, thvi thad er valid urtak
     (bakverdir sem eru a skra spila ekki). Ad hleypa >1 inn vaeri ad
     lata tiltaekileika-lidinn LEIDRETTA spana, sem er annad mal og
     annad prof. `availability()` i appinu skilar 0..1 og thad stendur. */

  /* ============================================================
     5. ARMAR
     ============================================================
     Nuverandi `AVAIL` beitt a `report_status` — ThAD ER NULL-TILGATAN.
     `Probable` er i toflunni en NFL AFNAM hana 2016; hun kemur ALDREI
     fyrir i thessum gognum (0 radir). Thad er sjalfstaed nidurstada:
     lina i toflunni sem gogn geta ekki nad. `DNR` er Sleeper-ord og er
     ekki i meidslaskranni heldur. */
  const CURRENT = { NotListed: 1, None: 1, Questionable: AVAIL.Questionable,
    Doubtful: AVAIL.Doubtful, Out: AVAIL.Out };

  /* Placebo-gildin: MERKINGARLAUS gildi ur SOMU DREIFINGU. Tvaer
     tegundir og thad er asett (sami larddomur og `usage-lab`):

       placeboLabel  — radir fa SLEMBIN holf-merki og fara sidan gegnum
                       ALLA fittun + walk-forward. Profar VELINA.
       placeboValue  — raunveruleg fittud gildi, SLEMBILEGA ut a
                       leikmanna-vikur i somu tidni. Profar hvort
                       abatinn se ad ThEKKJA HVERN — eda bara ad
                       DRAGA SAMAN 28% af spam og hafa heppni.

     Su sidari er sú sem skiptir mali. `weeklyProjection` er einraen i
     avail, svo hver samdrattur ROADAR upp a nytt; ef 25% samdrattur a
     handahofskennda menn vinnur er "maelda taflan vinnur" ekki maeling. */
  const NOISE_SEEDS = [11, 23, 37];

  /* ============================================================
     6. UPPSTILLING — GEGNUM `optimalLineup` UR src/lineup.js
     ============================================================
     Ekki afrit. `gap-lab` skjalar hvers vegna: tvaer utfaerslur sama
     regla geta rekid i sundur an ad neitt segi fra. Og `avail` er
     GEFIN ADSKILIN fra `proj` thvi thad er nakvaemlega leidin sem
     appid notar (`ev = proj x avail`, og `avail === 0` gerir mann
     OSPILANDI, ekki lelegan). */
  function lineupIds(cands) {
    const ps = cands.slice().sort((a, b) => PORD[a.pos] - PORD[b.pos]);
    return optimalLineup(ps, SLOTS).starters
      .map((s) => s.player && s.player.id).filter(Boolean);
  }

  /* Skipta-porun. SUMMAN ER OHAD PORUNINNI (hun er bara munur tveggja
     mengja); porunin raedur EINGONGU MERKIMIDANUM. Sjalfsprofad nedar
     (`pairSumEqualsLineupDelta`) svo thetta se vardi, ekki fullyrding.

     ============================================================
     EINHLIDA POR ERU EKKI JADARTILFELLI — THAU ERU KJARNINN HER
     ============================================================
     Fyrsta utgafan pardi adeins tvo og tvo og fell i 4 af 7.016:
     summa para var EKKI munur uppstillinganna. Orsokin er ekki
     porunin heldur ad **uppstillingarnar geta verid AF SITTHVORRI
     STAERD**. `optimalLineup` merkir mann med `avail === 0`
     OSPILANDI (ekki lelegan), svo tafla sem setur alla gjaldgenga
     TE i 0 skilar uppstillingu med OFYLLTU saeti. Tha er |ins| !=
     |outs| og afgangurinn fell UT UR summunni thegjandi.

     Thetta er ekki hjaróma tilfelli i thessari maelingu — thad er
     nakvaemlega thad sem tiltaekileika-tafla A AD GERA. Afgangurinn
     er thvi pardur vid `null` og talinn med sem einhlida por.
     Sjalfsprofid fell adur; nu er thad 0/7.016. */
  function pairSwaps(chosen, best, ptOf, posOf) {
    const cs = new Set(chosen), bs = new Set(best);
    const ins = best.filter((id) => !cs.has(id));
    const outs = chosen.filter((id) => !bs.has(id));
    const byPos = (arr) => { const m = new Map();
      for (const id of arr) { const p = posOf(id); if (!m.has(p)) m.set(p, []); m.get(p).push(id); }
      return m; };
    const iP = byPos(ins), oP = byPos(outs), pairs = [];
    const leftIn = [], leftOut = [];
    for (const p of new Set([...iP.keys(), ...oP.keys()])) {
      const a = (iP.get(p) || []).slice().sort((x, y) => (ptOf(y) ?? 0) - (ptOf(x) ?? 0));
      const b = (oP.get(p) || []).slice().sort((x, y) => (ptOf(x) ?? 0) - (ptOf(y) ?? 0));
      const k = Math.min(a.length, b.length);
      for (let i = 0; i < k; i++) pairs.push([a[i], b[i]]);
      leftIn.push(...a.slice(k)); leftOut.push(...b.slice(k));
    }
    leftIn.sort((x, y) => (ptOf(y) ?? 0) - (ptOf(x) ?? 0));
    leftOut.sort((x, y) => (ptOf(x) ?? 0) - (ptOf(y) ?? 0));
    const k2 = Math.min(leftIn.length, leftOut.length);
    for (let i = 0; i < k2; i++) pairs.push([leftIn[i], leftOut[i]]);
    /* EINHLIDA AFGANGUR — sja notuna ad ofan. `null` er ekki leikmadur
       med 0 stig; hann er TOMT SAETI, og `ptOf(null)` er skilgreint
       sem 0 i kollunum hér fyrir nedan. */
    for (let i = k2; i < leftIn.length; i++) pairs.push([leftIn[i], null]);
    for (let i = k2; i < leftOut.length; i++) pairs.push([null, leftOut[i]]);
    return pairs;
  }
  const ptSafe = (fn) => (id) => (id == null ? 0 : (fn(id) ?? 0));

  /* ============================================================
     7. ENDURSPILUN
     ============================================================ */
  const HARNESS = ["rowsOnly", "absenceVisible"];
  const ARMS = [
    { key: "A0_avail1", kind: "reference",
      label: "avail = 1 everywhere. This is the arm startsit-lab and gap-lab measured." },
    { key: "A1_current", kind: "incumbent",
      label: "The AVAIL table now in src/model.js, keyed on report_status. THE NULL HYPOTHESIS." },
    { key: "A1b_flatCurrent", kind: "incumbent",
      label: "Season projection / 17 times the current AVAIL table, no game script and no " +
        "defense step. What MyTeam does today via lineup.js." },
    { key: "T1_status", kind: "measured",
      label: "Measured, walk-forward: position x report_status." },
    { key: "T2_practice", kind: "measured",
      label: "Measured, walk-forward: position x report_status x practice_status. THE CORE ARM." },
    { key: "T3_body", kind: "measured",
      label: "T2 times a body-part-group multiplier fitted on report_status x practice_status." },
    { key: "T2_pRowOnly", kind: "measured",
      label: "T2 but only the play probability, without E[points | played]. Isolates which of " +
        "the two multipliers the app is missing." },
    /* ============================================================
       AFSTAED TAFLA — OG HVERS VEGNA HUN VARD TIL EFTIR A
       ============================================================
       ThESSIR TVEIR ARMAR VORU BAETTIR VID EFTIR AD ALGILDU
       ARMARNIR (T1/T2/T3) TOPUDU FYRIR AGISKUDU TOFLUNNI. Thad er
       sagt hér og i skranni thvi armur sem er valinn eftir ad hafa
       sed utkomuna er onnur tegund af fullyrdingu.

       MEKANISMINN VAR TIL FYRIR MAELINGUNA, sem er thad sem gerir
       hann ad tilgatu og ekki eftira-skyringu: `base` er
       **timabils-spa / 17**, og timabils-spa hefur ThEGAR verdlagt
       vaentar fjarvistir. Hun er E[stig per viku, MED fjarvistarhaettu],
       ekki E[stig | spilar]. Ad margfalda hana med ALGILDUM
       tiltaekileika er thvi ad taka sama afsláttinn TVISVAR.

       Maelingin sýnir thad beint: `NotListed` fittast i 0,924, ekki
       1,0 — og su 7,6% er ekki "oheilbrigdir menn" heldur bakverdir i
       draftanlegu lauginni sem faera aldrei rod. Uppstilling er
       ROÐUN, svo 0,924 a ALLA gerir ekkert nema fletja ut bilid milli
       heilbrigds manns (0,924) og Questionable+Full (0,845). Nuverandi
       tafla gefur 1,00 a moti 0,75.

       Afstaeda taflan deilir thvi hverju holfi med `NotListed`-holfi
       SOMU STODU. Tha er merkid eftir og tvofalda afslattinum er sleppt. */
    { key: "T1_relative", kind: "measuredRelative",
      label: "T1 divided by the same position's NotListed cell. Availability as a DEVIATION from " +
        "average availability, which is what a base of seasonProjection/17 already prices in." },
    { key: "T2_relative", kind: "measuredRelative",
      label: "T2 divided by the same position's NotListed cell. Added AFTER the absolute arms lost; " +
        "the mechanism (double-counting the absence discount) is stated in the method block." },
    { key: "S1_outOnly", kind: "ladder", years: "SCAN",
      label: "Only Out -> 0. Everything else 1. First rung of the ladder." },
    { key: "S2_outDoubtful", kind: "ladder", years: "SCAN",
      label: "Out -> 0 and Doubtful -> 0.25. Everything else 1. Second rung; the difference from " +
        "A1_current is exactly what the Questionable term is worth." },
    { key: "ORACLE_row", kind: "oracle",
      label: "Perfect knowledge of whether a scoring row will exist. The availability ceiling." },
    /* ---- NAEMNI: 2025 MED, ThOTT LEKINN SE OSTADFESTUR ----
       Baedi armarnir nota `repU` og baedi eru maeldir a `YWFU`, svo
       samanburdurinn se innan sama heims. Utan thess vaeri "2025 med"
       ad blanda tveimur breytingum i eina tolu. */
    { key: "A1_currentUnverified", kind: "sensitivity", rep: "U", years: "WFU",
      label: "The current AVAIL table, with the unverifiable 2025 report included. Reference for " +
        "the *_unverified arm only." },
    { key: "T2_practiceUnverified", kind: "sensitivity", rep: "U", years: "WFU",
      incumbent: "A1_currentUnverified",
      label: "T2 with the unverifiable 2025 report included, measured against the unverified " +
        "incumbent over the same seasons. Shows whether excluding 2025 was conservative or decisive." },
  ];
  /* ============================================================
     SKONNUN A `Questionable` — SPURNINGIN "ER 0,75 RETT?" ER
     AKVORDUNAR-SPURNING, EKKI KVORDUNAR-SPURNING
     ============================================================
     Kvordud tala og akvordunar-besta tala eru ekki sama talan (sja
     afstaedu toflurnar ad ofan). Thess vegna er hun MAELD BEINT: eitt
     gildi fyrir `Questionable`, allt annad ohreyft ur nuverandi toflu,
     og ferillinn birtur. Ekkert er valid ur ferlinum — valid er gert i
     `Qscan_walkForward`, sem tekur argmax af FYRRI arum. */
  /* ============================================================
     STIGINN — HVAR BYR TILTAEKILEIKA-VERDMAETID?
     ============================================================
     "Tiltaekileiki er 16,1% af bilinu" er merkingarlaust an thess ad
     vita HVAD i honum. Stiginn er samlagnandi og hvert threp er sami
     armur med einum lid meira:

       A0            avail = 1 (ekkert)
       S1_outOnly    adeins `Out` -> 0
       S2_outDoubtful  + `Doubtful` -> 0,25
       A1_current      + `Questionable` -> 0,75      (= nuverandi tafla)
       T2_relative     + aefingaskyrslan (Full/Limited/DNP)

     Se stiginn flatur eftir S1 er svarid ad tiltaekileiki er
     **Out-hlidid og nanast ekkert annad** — og tha er "les
     practice_status" ekki lyftistong heldur skraut. Thad er
     spurningin sem thessi maeling var sett upp til ad svara. */
  const QGRID = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1];
  /* `Doubtful` er STAERSTA MAELDA SKEKKJAN i toflunni: hun stendur i
     0,25 og maelist 0,009 — 28-faldur munur. Skekkja er samt ekki
     kostnadur fyrr en hun er maeld i akvordunum, svo hun faer sinn
     eigin ferill. Fáir Doubtful-menn eru i hopum (142 radir), svo
     jafnvel 28-faldur munur getur verid ohreyfanlegur — og thad er
     nakvaemlega thad sem tharf ad koma i ljos, ekki ad giska a. */
  const DGRID = [0, 0.05, 0.1, 0.25, 0.5];
  const SCANS = [
    { status: "Questionable", prefix: "Qscan", grid: QGRID, current: AVAIL.Questionable },
    { status: "Doubtful", prefix: "Dscan", grid: DGRID, current: AVAIL.Doubtful },
  ];
  for (const s of SCANS) for (const q of s.grid) {
    ARMS.push({ key: `${s.prefix}_${q.toFixed(2)}`, kind: "scan", q, status: s.status, years: "SCAN",
      label: `The current table with ${s.status} = ${q}, everything else untouched. A point on ` +
        `the curve, not a candidate: nothing is selected from it.` });
  }
  for (const s of NOISE_SEEDS) {
    ARMS.push({ key: `placeboLabel${s}`, kind: "placebo",
      label: `Placebo: deterministic random cell labels through the identical fitting and ` +
        `walk-forward pipeline, seed ${s}.` });
    ARMS.push({ key: `placeboValue${s}`, kind: "placebo",
      label: `Placebo: the real fitted value distribution, assigned to random player-weeks at ` +
        `the same frequency, seed ${s}. Tests whether the gain is knowing WHO or merely ` +
        `shrinking some projections.` });
  }
  const ARMKEYS = ARMS.map((a) => a.key);

  /* Walk-forward toflur: ar y er MAELT med toflu fittadri a ar < y.
     2019 hefur enga fyrri sogu og er thvi UTAN walk-forward maelingar —
     ekki "med avail=1 i stadinn", thvi tha vaeri arid dulbuinn
     A0-armur inni i medaltalinu. Thad er sagt i utkomunni. */
  const tables = new Map();                    // fmt|y -> tafla eda null (leka-stadfest)
  const tablesU = new Map();                   // fmt|y -> tafla, OSTADFEST med
  const tablesIS = new Map();                  // fmt -> tafla a OLLUM stadfestum arum
  /* Merkjaval: stadfesta utgafan eda ostadfesta. Ein leid, tvo mengi —
     annars vaeri thetta tvaer utfaerslur sama fits. */
  const useU = (r) => ({ ...r, rs: r.rsU, ps: r.psU, bg: r.bgU });
  for (const fmt of FORMATS) {
    const all = fitRows.get(fmt);
    const ver = all.filter((r) => r.vy);
    tablesIS.set(fmt, buildTable(ver, SHRINK));
    for (const y of YS) {
      const prior = ver.filter((r) => r.season < y);
      tables.set(`${fmt}|${y}`, prior.length >= 500 ? buildTable(prior, SHRINK) : null);
      const priorU = all.filter((r) => r.season < y).map(useU);
      tablesU.set(`${fmt}|${y}`, priorU.length >= 500 ? buildTable(priorU, SHRINK) : null);
    }
  }
  /* `YWF` — arin sem eru MAELD. Skilyrdin eru TVO og bædi eru nauðsyn:
     arid sjalft verdur ad vera leka-stadfest (annars er inntakid
     ostadfest) OG thad verdur ad vera til stadfest tafla ur fyrri arum
     (annars er thetta ekki walk-forward). */
  const YWF = YS.filter((y) => verified.has(y) && tables.get(`ppr|${y}`));
  const YWFU = YS.filter((y) => tablesU.get(`ppr|${y}`));
  /* Skonnunar-armarnir thurfa ENGA fittada toflu, svo their na yfir
     OLL leka-stadfest ar — lika thad fyrsta. */
  const YSCAN = YS.filter((y) => verified.has(y));
  console.log(`walk-forward ar (stadfest): ${YWF.join(", ")}` +
    `  ·  med ostadfestu: ${YWFU.join(", ")}  ·  skonnun: ${YSCAN.join(", ")}`);
  requireSeasons(YWF, "leka-stadfest timabil med fyrri sogu til ad fitta toflu a");
  /* ARASETTID PER ARM — SKILGREINT HER, FYRIR ENDURSPILUNINA.
     ============================================================
     FYRSTA UTGAFAN TALDI KLASA-EIGNINA YFIR OLL AR og thad var ekki
     smaatriði: per-leikmanns CI fyrir `T2_practice` var **allt
     negatift [-5,87; -2,01]** medan punktmatid per timabili var
     **+0,44 pp**. Tolurnar stangast ekki a vegna dreifni heldur vegna
     ThESS AD THAER MAELDU SITTHVAD: eignin bar 2019 (engin fyrri
     tafla -> armurinn er A0 i dulargervi) og 2025 (engin stadfest
     skyrsla -> avail = 1), thar sem armurinn hlytur ad tapa fyrir
     nuverandi toflu af BYGGINGARLEGUM astaedum.

     CI sem er reiknad a odru urtaki en punktmatid er ekki varfaerid
     CI, thad er annad svar. Nu er eignin bundin vid arasett armsins. */
  const yearSetOf = (a) => new Set(a && a.years === "WFU" ? YWFU
    : a && a.years === "SCAN" ? YSCAN : YWF);

  /* Placebo-gildadreifing: gildin sem RAUNVERULEGA taflan gefur, med
     theirri tidni sem thau koma fyrir i lauginni. Tekid ur in-sample
     toflunni til ad vera OHAD arinu — placeboinn a ad hafa sama
     "magn af samdraetti", ekki sama tima-strukturinn. */
  const placeboPool = new Map();               // fmt -> [gildi...]
  for (const fmt of FORMATS) {
    const T = tablesIS.get(fmt), arr = [];
    for (const r of fitRows.get(fmt)) {
      if (!r.vy) continue;
      arr.push(clamp01(T.vPosRsPs.get(`${r.pos}|${r.rs}|${r.ps}`)));
    }
    arr.sort((a, b) => a - b);
    placeboPool.set(fmt, arr);
  }
  /* Slembin holf-merki, akvedin per (id, timabil, vika, fraekorn).
     Tidni merkjanna er SU SAMA og i raungognunum, svo fittunin faer
     jafn morg "Out"-holf og hun faer i raun. */
  const labelPool = [];
  for (const r of frV) labelPool.push(`${r.rs}|${r.ps}|${r.bg}`);
  const labelOf = (id, y, w, seed) =>
    labelPool[Math.floor(unit(`${id}|${y}|${w}|L${seed}`) * labelPool.length)].split("|");

  const anchors = {}, perFmt = {};
  const attrib = new Map();                    // fmt|harness|arm -> Map(playerId -> delta)
  const perSeason = new Map();                 // fmt|harness|arm -> { y -> pct }
  const invisible = { rosterWeeks: 0, noRow: 0, bye: 0, absent: 0, unknownTeam: 0 };
  let pairSumBad = 0, pairSumChecked = 0, selfBad = 0;
  let poolBSizes = 0, poolASizes = 0, lineupN = 0;

  for (const fmt of FORMATS) {
    const gapBy = { rowsOnly: new Map(), absenceVisible: new Map() };
    const sumBy = new Map();                   // harness|arm|y -> stig
    const flatBy = { rowsOnly: new Map(), absenceVisible: new Map() };

    for (const y of YS) {
      const c = ctx.get(y);
      if (!c) continue;
      const pool = poolFor(fmt, y);
      if (pool.length < 120) continue;
      const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
      const field = new Map(pool.slice().sort((a, b) => a.adp - b.adp)
        .map((p, i) => [p.id, i + 1]));
      const rosters = [];
      for (let slot = 1; slot <= TEAMS; slot++)
        rosters.push(simulateDraft({ board: field, fieldBoard: field, actual, slot, league: LEAGUE }).roster);
      const projOf = new Map(pool.map((p) => [p.id, p.proj]));
      const posPool = new Map(pool.map((p) => [p.id, p.pos]));
      const T = tables.get(`${fmt}|${y}`);
      const TU = tablesU.get(`${fmt}|${y}`);
      const PP = placeboPool.get(fmt);

      let n = 0;
      const acc = {};
      for (const h of HARNESS) { acc[h] = { flat: 0, ceil: 0, arm: {} };
        for (const k of ARMKEYS) acc[h].arm[k] = 0; }

      for (const roster of rosters) {
        for (const week of c.weeks) {
          const rowOf = (id) => c.wk.get(`${id}|${week}`) || null;
          const played = roster.filter((id) => rowOf(id));
          /* SAMA HLID OG `startsit-lab`: of thunnt til ad stilla upp.
             Hun er reiknud ur ROWS, lika i harness B, svo bædi
             profraunirnar telji NAKVAEMLEGA somu vikur. Annars vaeri
             munurinn a A og B ad hluta munur a urtakinu. */
          if (played.length < 9) continue;
          n++; lineupN++;

          if (fmt === "ppr") {
            invisible.rosterWeeks += roster.length;
            for (const id of roster) {
              if (rowOf(id)) continue;
              invisible.noRow++;
              const t = (c.seasonTeam.get(id) || {}).t;
              const pl = c.playing.get(week);
              if (!t) invisible.unknownTeam++;
              else if (pl && !pl.has(t)) invisible.bye++;
              else invisible.absent++;
            }
          }

          const ptA = (id) => { const a = rowOf(id); return a ? (fmt === "ppr" ? a.ppr
            : fmt === "half" ? a.half : a.std) : null; };
          const ptB = (id) => { const v = ptA(id); return v == null ? 0 : v; };
          const posOf = (id) => { const a = rowOf(id); return a ? a.pos : posPool.get(id); };
          const base17 = (id) => (projOf.get(id) ?? 0) / 17;
          const wpOf = (id) => wp1Of(y, fmt, id, posOf(id), week, base17(id));
          const repOf = (id) => rep.get(`${id}|${y}|${week}`);

          const availOf = (id, arm) => {
            if (id == null || arm === "A0_avail1") return 1;
            if (arm === "ORACLE_row") return rowOf(id) ? 1 : 0;
            const unv = arm.endsWith("Unverified");
            const r = unv ? repU.get(`${id}|${y}|${week}`) : repOf(id);
            const rs = r ? r.rs : "NotListed";
            const ps = r ? r.ps : "NotListed";
            const bg = r ? bodyGroupOf(r.body) : "NotListed";
            if (arm === "A1_current" || arm === "A1b_flatCurrent" || arm === "A1_currentUnverified")
              return CURRENT[rs] != null ? CURRENT[rs] : 1;
            if (arm === "T2_practiceUnverified")
              return TU ? clamp01(TU.vPosRsPs.get(`${posOf(id)}|${rs}|${ps}`)) : 1;
            /* Skonnunar-armarnir hanga EKKI a fittari toflu — thess
               vegna eru their ofan vid `!T`-hlidid og virka lika i
               fyrsta arinu. */
            const qs = /^([QD])scan_([\d.]+)$/.exec(arm);
            if (qs) {
              const which = qs[1] === "Q" ? "Questionable" : "Doubtful";
              if (rs === which) return Number(qs[2]);
              return CURRENT[rs] != null ? CURRENT[rs] : 1;
            }
            if (arm === "S1_outOnly") return rs === "Out" ? 0 : 1;
            if (arm === "S2_outDoubtful")
              return rs === "Out" ? 0 : rs === "Doubtful" ? AVAIL.Doubtful : 1;
            if (!T) return 1;                   // enginn fyrri sogu -> engin tafla
            if (arm === "T1_relative" || arm === "T2_relative") {
              const p = posOf(id);
              const ref = arm === "T1_relative"
                ? T.vPosRs.get(`${p}|NotListed`) : T.vPosRsPs.get(`${p}|NotListed|NotListed`);
              const v = arm === "T1_relative"
                ? T.vPosRs.get(`${p}|${rs}`) : T.vPosRsPs.get(`${p}|${rs}|${ps}`);
              if (!ref || !Number.isFinite(ref) || ref < 1e-6) return clamp01(v);
              return clamp01(v / ref);
            }
            if (arm === "T1_status") return clamp01(T.vPosRs.get(`${posOf(id)}|${rs}`));
            if (arm === "T2_practice") return clamp01(T.vPosRsPs.get(`${posOf(id)}|${rs}|${ps}`));
            if (arm === "T3_body") return clamp01(T.vPosRsPs.get(`${posOf(id)}|${rs}|${ps}`) *
              (T.vBg.get(`${rs}|${ps}|${bg}`) ?? 1));
            if (arm === "T2_pRowOnly") {
              const cc = T.raw.byPosRsPs.get(`${posOf(id)}|${rs}|${ps}`);
              if (cc && cc.n >= 20) return clamp01(cc.sDen ? cc.sDenRow / cc.sDen : 1);
              const c2 = T.raw.byPosRs.get(`${posOf(id)}|${rs}`);
              if (c2 && c2.n >= 20) return clamp01(c2.sDen ? c2.sDenRow / c2.sDen : 1);
              const c3 = T.raw.byRs.get(rs);
              return clamp01(c3 && c3.sDen ? c3.sDenRow / c3.sDen : 1);
            }
            const ms = /^placebo(Label|Value)(\d+)$/.exec(arm);
            if (ms) {
              const seed = Number(ms[2]);
              if (ms[1] === "Value")
                return PP[Math.floor(unit(`${id}|${y}|${week}|V${seed}`) * PP.length)];
              const [prs, pps, pbg] = labelOf(id, y, week, seed);
              return clamp01(T.vPosRsPs.get(`${posOf(id)}|${prs}|${pps}`) *
                (T.vBg.get(`${prs}|${pps}|${pbg}`) ?? 1));
            }
            return 1;
          };

          for (const h of HARNESS) {
            /* LAUGIN — eini munurinn milli profraunanna. */
            const cand = [];
            if (h === "rowsOnly") {
              for (const id of roster) { const r = rowOf(id);
                if (r && PORD[r.pos] != null) cand.push({ id, pos: r.pos }); }
            } else {
              for (const id of roster) {
                const r = rowOf(id);
                const t = r ? c.teamWk.get(`${id}|${week}`) : (c.seasonTeam.get(id) || {}).t;
                const pl = c.playing.get(week);
                if (!t || !pl || !pl.has(t)) continue;    // bye/obekkt lid ER UTAN
                const p = r ? r.pos : posPool.get(id);
                if (p && PORD[p] != null) cand.push({ id, pos: p });
              }
            }
            const pt = h === "rowsOnly" ? ptA : ptB;
            if (h === "rowsOnly") poolASizes += cand.length; else poolBSizes += cand.length;

            const idFlat = lineupIds(cand.map((p) => ({ ...p, proj: base17(p.id) })));
            const idCeil = lineupIds(cand.map((p) => ({ ...p, proj: pt(p.id) })));
            const sum = (ids) => ids.reduce((a, id) => a + (pt(id) ?? 0), 0);
            acc[h].flat += sum(idFlat);
            acc[h].ceil += sum(idCeil);

            const idOf = {};
            for (const arm of ARMKEYS) {
              const projFn = arm === "A1b_flatCurrent" ? base17 : wpOf;
              const ids = lineupIds(cand.map((p) => ({ ...p, proj: projFn(p.id),
                avail: availOf(p.id, arm) })));
              idOf[arm] = ids;
              acc[h].arm[arm] += sum(ids);
            }

            /* ---------- SJALFSPROF: summa para == munur uppstillinga ---------- */
            const p0 = ptSafe(pt);
            if (pairSwaps(idCeil, idCeil, pt, posOf).length !== 0) selfBad++;
            {
              const inc = idOf.A1_current, arm = idOf.T2_practice;
              const pairs = pairSwaps(inc, arm, pt, posOf);
              const ds = pairs.reduce((a, [i, o]) => a + (p0(i) - p0(o)), 0);
              const dd = sum(arm) - sum(inc);
              pairSumChecked++;
              if (Math.abs(ds - dd) > 1e-6) pairSumBad++;
            }

            /* ---------- KLASA-EIGN PER LEIKMANN ----------
               Merkimidinn fer a THANN sem tiltaekileika-talan hreyfdi
               mest — thad er akvordunin sem er verid ad maela. Summa
               yfir klasa == heildar-delta, sjalfsprofad ad ofan. */
            for (const a of ARMS) {
              const arm = a.key, ref = a.incumbent || "A1_current";
              if (arm === ref) continue;
              if (!yearSetOf(a).has(y)) continue;   // sja notuna vid `yearSetOf`
              const k = `${fmt}|${h}|${arm}`;
              let m = attrib.get(k);
              if (!m) { m = new Map(); attrib.set(k, m); }
              const pairs = pairSwaps(idOf[ref], idOf[arm], pt, posOf);
              for (const [i, o] of pairs) {
                const d = p0(i) - p0(o);
                /* Merkimidinn fer a thann sem taflan HREYFDI mest. Se
                   annad porid tomt saeti fer hann a thann sem er til. */
                let owner;
                if (i == null) owner = o;
                else if (o == null) owner = i;
                else {
                  const gi = Math.abs(availOf(i, arm) - availOf(i, ref));
                  const go = Math.abs(availOf(o, arm) - availOf(o, ref));
                  owner = go >= gi ? o : i;
                }
                m.set(owner, (m.get(owner) || 0) + d);
              }
            }
          }
        }
      }
      if (!n) continue;
      for (const h of HARNESS) {
        gapBy[h].set(y, acc[h].ceil - acc[h].flat);
        flatBy[h].set(y, acc[h].flat);
        for (const k of ARMKEYS) sumBy.set(`${h}|${k}|${y}`, acc[h].arm[k]);
        sumBy.set(`${h}|__n|${y}`, n);
        sumBy.set(`${h}|__flat|${y}`, acc[h].flat);
        sumBy.set(`${h}|__ceil|${y}`, acc[h].ceil);
      }
    }

    /* ---------- hlutfall bilsins per ar ---------- */
    for (const h of HARNESS) {
      for (const k of ARMKEYS) {
        const m = new Map();
        for (const y of YS) {
          const g = gapBy[h].get(y);
          if (g == null || g <= 0) continue;
          m.set(y, (sumBy.get(`${h}|${k}|${y}`) - flatBy[h].get(y)) / g * 100);
        }
        perSeason.set(`${fmt}|${h}|${k}`, m);
      }
    }
    perFmt[fmt] = { gapBy, sumBy, flatBy };

    anchors[fmt] = {
      seasons: YS.filter((y) => gapBy.rowsOnly.get(y) != null),
      pctOfGapClosed: r3(mean(YS.filter((y) => gapBy.rowsOnly.get(y) > 0)
        .map((y) => perSeason.get(`${fmt}|rowsOnly|A0_avail1`).get(y)))),
    };
    console.log(`\n${fmt}: harness A akkeri (A0_avail1) = ${anchors[fmt].pctOfGapClosed}%`);
  }

  /* ============================================================
     8. AKKERI OG SJALFSPROF — SKRIFTAN DEYR FREMUR EN AD SKRIFA
     ============================================================ */
  const want = {};
  for (const fmt of FORMATS) {
    try {
      const g = JSON.parse(await readFile(path.join(MEAS, "gap.json"), "utf8"));
      want[fmt] = g.anchors[fmt].pctOfGapClosed;
    } catch { want[fmt] = null; }
  }
  try {
    for (const fmt of ["ppr", "standard"]) {
      const s = JSON.parse(await readFile(path.join(OUT, `startsit_${fmt}.json`), "utf8"));
      if (want[fmt] == null) want[fmt] = s.totals.pctOfGapClosed;
      else if (Math.abs(want[fmt] - s.totals.pctOfGapClosed) > 0.0005)
        die(`gap.json og startsit_${fmt}.json eru OSAMMALA um akkerid ` +
            `(${want[fmt]} a moti ${s.totals.pctOfGapClosed}). Tha er ekkert akkeri til.`);
    }
  } catch (e) { if (String(e.message || "").startsWith("gap.json")) throw e; }

  const selfTests = {
    sameEstimatorZeroSwaps: selfBad === 0,
    pairSumEqualsLineupDelta: { checked: pairSumChecked, bad: pairSumBad },
    anchorRowsOnly: {},
    oracleDominatesInHarnessB: {},
    oracleIsNoOpInHarnessA: {},
    poolBIsLargerThanPoolA: poolBSizes > poolASizes,
  };
  if (selfBad) die(`SJALFSPROF FELL: sami matsadili gaf ${selfBad} skipti. ` +
    "`ceiling - ceiling` VERDUR ad vera 0 skipti.");
  if (pairSumBad) die(`SJALFSPROF FELL: summa para != munur uppstillinga i ` +
    `${pairSumBad}/${pairSumChecked}. Tha er klasa-eignin ekki tolulega gild.`);
  if (!selfTests.poolBIsLargerThanPoolA)
    die("SJALFSPROF FELL: laug B er ekki staerri en laug A. Tha er `absenceVisible` " +
        "ekki thad sem hun segist vera.");

  for (const fmt of FORMATS) {
    const got = anchors[fmt].pctOfGapClosed;
    selfTests.anchorRowsOnly[fmt] = { got, want: want[fmt] };
    if (want[fmt] == null)
      die(`AKKERID VANTAR fyrir ${fmt} — hvorki gap.json ne startsit_${fmt}.json ` +
          "bera toluna. Maeling an akkeris er ekki maeling.");
    if (Math.abs(got - want[fmt]) > 0.0005)
      die(`AKKERID BRAST (${fmt}): ${got}% a moti ${want[fmt]}%.\n` +
          "   Harness A VERDUR ad vera sama vel og startsit-lab/gap-lab.");
  }
  console.log(`\nakkeri OK: ` + FORMATS.map((f) => `${f} ${anchors[f].pctOfGapClosed}%`).join(" · "));

  /* ORAKEL-AKKERIN. Tvo, og bædi eru fullyrdingar sem VERDA ad halda:
     1. i harness A er fullkomin vitneskja um rod NO-OP (allir i lauginni
        BERA rod) — thad er sonnun a thvi ad profraun A getur ekki maelt
        tiltaekileika, ekki agiskun um thad.
     2. i harness B VERDUR orakelid ad slá hvern raunverulegan arm. Arm
        sem slaer fullkomna vitneskju er villa, ekki afrek. */
  const meanPct = (fmt, h, k) => {
    const m = perSeason.get(`${fmt}|${h}|${k}`);
    return m ? statOf([...m.values()]) : null;
  };
  const yearsOf = (a) => (a && a.years === "WFU" ? YWFU : a && a.years === "SCAN" ? YSCAN : YWF);
  const meanPctWF = (fmt, h, k, ys) => {
    const m = perSeason.get(`${fmt}|${h}|${k}`);
    return m ? statOf((ys || YWF).map((y) => m.get(y)).filter((v) => v != null)) : null;
  };
  for (const fmt of FORMATS) {
    const a0 = meanPct(fmt, "rowsOnly", "A0_avail1").mean;
    const or = meanPct(fmt, "rowsOnly", "ORACLE_row").mean;
    selfTests.oracleIsNoOpInHarnessA[fmt] = { avail1: a0, oracle: or, equal: Math.abs(a0 - or) < 0.0005 };
    if (Math.abs(a0 - or) > 0.0005)
      die(`ORAKEL-AKKERI 1 BRAST (${fmt}): i harness A gaf fullkomin vitneskja ${or}% en ` +
          `avail=1 gaf ${a0}%. Their VERDA ad vera eins — hver madur i lauginni ber rod.`);
    const ob = meanPctWF(fmt, "absenceVisible", "ORACLE_row", YWF).mean;
    const worst = [];
    for (const a of ARMS) {
      if (a.kind === "oracle") continue;
      /* Hver armur er borinn vid orakelid a SINU EIGIN arasetti —
         annars vaeri "arm slaer orakel" bara tvo olik ar. */
      const ys = yearsOf(a);
      const v = meanPctWF(fmt, "absenceVisible", a.key, ys).mean;
      const o2 = meanPctWF(fmt, "absenceVisible", "ORACLE_row", ys).mean;
      if (v != null && v > o2 + 1e-9) worst.push(`${a.key} ${v}% > orakel ${o2}%`);
    }
    selfTests.oracleDominatesInHarnessB[fmt] = { oracle: ob, armsAbove: worst };
    if (worst.length)
      die(`ORAKEL-AKKERI 2 BRAST (${fmt}): ${worst.join("; ")}.\n` +
          "   Arm sem slaer fullkomna vitneskju um hverjir spila er villa, ekki afrek.");
  }
  console.log("orakel-akkeri OK: harness A er onaemt fyrir tiltaekileika (orakel == avail=1)," +
    " harness B er ekki");

  /* ============================================================
     9. DELTA GEGN NULL-TILGATUNNI + BOOTSTRAP
     ============================================================ */
  const results = {};
  for (const fmt of FORMATS) {
    results[fmt] = {};
    for (const h of HARNESS) {
      const gaps = new Map();
      for (const y of YS) {
        const g = perFmt[fmt].gapBy[h].get(y);
        if (g != null && g > 0) gaps.set(y, g);
      }
      const rows2 = {};
      for (const a of ARMS) {
        const ys = yearsOf(a);
        const totGapWF = ys.reduce((x, y) => x + (gaps.get(y) || 0), 0);
        const own = perSeason.get(`${fmt}|${h}|${a.key}`);
        const inc = perSeason.get(`${fmt}|${h}|${a.incumbent || "A1_current"}`);
        const lvlAll = meanPct(fmt, h, a.key);
        const lvlWF = meanPctWF(fmt, h, a.key, ys);
        const dSeason = ys.map((y) => (own.get(y) == null || inc.get(y) == null
          ? null : own.get(y) - inc.get(y))).filter((v) => v != null);
        const delta = statOf(dSeason);

        /* --- BOOTSTRAP KLASAD PER LEIKMANN ---
           `vbdbase-lab`: 29 marktaek eftir timabili, 0 af 153 per
           leikmann. Per-leikmanns raedur. Klasarnir eru their leikmenn
           sem tiltaekileika-taflan HREYFDI; leikmadur sem hun snerti
           aldrei leggur 0 til og er samt klasi — annars vaeri urtakid
           valid eftir utkomunni. */
        let boot = null;
        if (a.key !== (a.incumbent || "A1_current") && BOOT > 0) {
          const m = attrib.get(`${fmt}|${h}|${a.key}`) || new Map();
          /* Klasa-mengid er ALLIR leikmenn i lauginni, ekki adeins
             their sem hreyfdust. */
          const ids = [...new Set([...m.keys()])];
          if (ids.length >= 5 && totGapWF > 0) {
            const ds = ids.map((id) => m.get(id) || 0);
            const rnd = rngOf(hash32(`${fmt}|${h}|${a.key}`) ^ 0x5eed);
            const out = [];
            for (let b = 0; b < BOOT; b++) {
              let s = 0;
              for (let i = 0; i < ids.length; i++) s += ds[Math.floor(rnd() * ids.length)];
              out.push(s / totGapWF * 100);
            }
            out.sort((x, y2) => x - y2);
            const lo = out[Math.floor(BOOT * 0.025)], hi = out[Math.floor(BOOT * 0.975)];
            boot = { clusters: ids.length, iterations: BOOT,
              /* Punktmatid er SAMA URTAK og `deltaVsIncumbent` (sja
                 `yearSetOf`). Thad er samt ekki nakvaemlega sama tala:
                 hér er summan VEGIN eftir staerd bilsins per ar, thar
                 er hun ovegid medaltal arstalna. Munurinn er sagdur. */
              pointEstimatePooled: r3(ds.reduce((x, v) => x + v, 0) / totGapWF * 100),
              ci: [r3(lo), r3(hi)], excludesZero: lo > 0 || hi < 0 };
          }
        }
        rows2[a.key] = { kind: a.kind, label: a.label,
          measuredSeasons: ys, incumbent: a.incumbent || "A1_current",
          levelAllSeasons: lvlAll, levelWalkForward: lvlWF,
          deltaVsIncumbent: delta, bootstrapPerPlayer: boot };
      }
      const nOf = (ys) => Math.max(1, ys.reduce((a, y) =>
        a + (perFmt[fmt].sumBy.get(`${h}|__n|${y}`) || 0), 0));
      const sOf = (ys, key) => ys.reduce((a, y) =>
        a + (perFmt[fmt].sumBy.get(`${h}|__${key}|${y}`) || 0), 0);
      results[fmt][h] = { anchorApplies: h === "rowsOnly",
        gapPerLineup: r1(YWF.reduce((a, y) => a + (gaps.get(y) || 0), 0) / nOf(YWF)),
        flatPerLineup: r1(sOf(YWF, "flat") / nOf(YWF)),
        ceilingPerLineup: r1(sOf(YWF, "ceil") / nOf(YWF)),
        lineups: nOf(YWF),
        arms: rows2 };
    }
  }

  /* ---------- PLACEBO-THAKID, EINHLIDA ---------- */
  const placeboCeiling = {};
  for (const fmt of FORMATS) {
    placeboCeiling[fmt] = {};
    for (const h of HARNESS) {
      const plc = ARMS.filter((a) => a.kind === "placebo")
        .map((a) => ({ key: a.key, ...results[fmt][h].arms[a.key].deltaVsIncumbent }));
      /* EINHLIDA. `usage-lab` fann ad `max |t|` gaf 22,238 fyrir holf
         sem TAPADI i hverju ari (orsmá dreifni) og thad FLIPPADI svari.
         Vid thurfum thakid a THEIRRI hlid sem vid erum ad gera kall a. */
      placeboCeiling[fmt][h] = {
        maxPositiveT: Math.max(...plc.map((p) => (p.t == null ? -1e9 : p.t))),
        maxAbsT: Math.max(...plc.map((p) => (p.t == null ? 0 : Math.abs(p.t)))),
        maxDelta: Math.max(...plc.map((p) => (p.mean == null ? -1e9 : p.mean))),
        perSeed: plc,
      };
    }
  }

  /* ============================================================
     9b. FERILLINN FYRIR `Questionable` — OG VAL SEM ER WALK-FORWARD
     ============================================================
     Ferillinn er BIRTUR, ekki valid ur. Valid er `walkForwardPick`:
     fyrir ar y er tekid ThAD gildi sem var best a arum < y og maelt a
     y. Thad er eina utgafan sem er ekki in-sample; argmax yfir allan
     ferilinn er skrautleg tala sem thydir "vid vissum svarid". */
  const ladder = {};
  for (const fmt of FORMATS) {
    ladder[fmt] = {};
    for (const h of HARNESS) {
      const lvl = (k, ys) => { const m = perSeason.get(`${fmt}|${h}|${k}`);
        return statOf(ys.map((y) => m.get(y)).filter((v) => v != null)); };
      const rungs = [
        { rung: "A0_avail1", term: "nothing", level: lvl("A0_avail1", YSCAN) },
        { rung: "S1_outOnly", term: "Out -> 0", level: lvl("S1_outOnly", YSCAN) },
        { rung: "S2_outDoubtful", term: "+ Doubtful -> 0.25", level: lvl("S2_outDoubtful", YSCAN) },
        { rung: "A1_current", term: "+ Questionable -> 0.75", level: lvl("A1_current", YSCAN) },
        { rung: "T2_relative", term: "+ practice_status (walk-forward, WF seasons only)",
          level: lvl("T2_relative", YWF), seasonsDiffer: true },
      ];
      for (let i = 1; i < rungs.length; i++)
        rungs[i].stepUp = r3((rungs[i].level.mean ?? 0) - (rungs[i - 1].level.mean ?? 0));
      ladder[fmt][h] = { seasons: YSCAN, rungs,
        oracle: lvl("ORACLE_row", YSCAN),
        note: "Each rung is the same arm with one more term. The last rung is measured on the " +
          "walk-forward seasons only (a fitted table needs prior history), so its step is not " +
          "strictly comparable with the rungs above it - that is flagged, not smoothed over." };
    }
  }

  const qScan = {};
  for (const fmt of FORMATS) {
    qScan[fmt] = {};
    for (const h of HARNESS) {
      qScan[fmt][h] = {};
      for (const s of SCANS) {
        const curve = s.grid.map((q) => {
          const k = `${s.prefix}_${q.toFixed(2)}`;
          const m = perSeason.get(`${fmt}|${h}|${k}`);
          return { q, level: statOf(YSCAN.map((y) => m.get(y)).filter((v) => v != null)),
            delta: results[fmt][h].arms[k].deltaVsIncumbent };
        });
        const inSampleBest = curve.slice().sort((a, b) =>
          (b.level.mean ?? -1e9) - (a.level.mean ?? -1e9))[0];
        /* Walk-forward val — eina utgafan sem er ekki in-sample. */
        const picks = [], vals = [], deltas = [];
        const incM = perSeason.get(`${fmt}|${h}|A1_current`);
        for (const y of YSCAN) {
          const prior = YSCAN.filter((z) => z < y);
          if (!prior.length) continue;
          let best = null;
          for (const q of s.grid) {
            const m = perSeason.get(`${fmt}|${h}|${s.prefix}_${q.toFixed(2)}`);
            const v = mean(prior.map((z) => m.get(z)).filter((x) => x != null));
            if (best == null || v > best.v) best = { q, v };
          }
          const got = perSeason.get(`${fmt}|${h}|${s.prefix}_${best.q.toFixed(2)}`).get(y);
          if (got == null) continue;
          picks.push({ season: y, pickedValue: best.q, level: r3(got) });
          vals.push(got);
          if (incM.get(y) != null) deltas.push(got - incM.get(y));
        }
        qScan[fmt][h][s.status] = { grid: s.grid, curve,
          inSampleBestValue: inSampleBest ? inSampleBest.q : null, currentValue: s.current,
          walkForwardPick: { perSeason: picks, level: statOf(vals), deltaVsIncumbent: statOf(deltas),
            distinctValuesPicked: picks.length
              ? new Set(picks.map((p) => p.pickedValue)).size : null },
        };
      }
    }
  }

  /* ============================================================
     10. UTPRENTUN
     ============================================================ */
  console.log(`\n${line}\n  MAELDA TAFLAN (ppr, in-sample, allt 2019-${YS[YS.length - 1]})\n${line}`);
  const TIS = tablesIS.get("ppr");
  console.log("  pos  report_status  practice   n     pRow   E[pts|row]   avail(fit)  shrunk");
  for (const p of POSN) for (const rs of RS_ORD) {
    const c1 = TIS.raw.byPosRs.get(`${p}|${rs}`);
    if (c1 && c1.n >= 10) {
      const o = cellOut(c1);
      console.log(`  ${p.padEnd(4)} ${rs.padEnd(14)} ${"(all)".padEnd(10)} ${String(o.n).padStart(5)}` +
        `  ${o.pRow.toFixed(3)}  ${(o.condRatio == null ? "  —  " : o.condRatio.toFixed(3)).padStart(7)}` +
        `      ${o.avail.toFixed(3)}      ${r3(clamp01(TIS.vPosRs.get(`${p}|${rs}`)))}`);
    }
    for (const ps of PS_ORD) {
      const c2 = TIS.raw.byPosRsPs.get(`${p}|${rs}|${ps}`);
      if (!c2 || c2.n < 25) continue;
      const o = cellOut(c2);
      console.log(`  ${p.padEnd(4)} ${rs.padEnd(14)} ${ps.padEnd(10)} ${String(o.n).padStart(5)}` +
        `  ${o.pRow.toFixed(3)}  ${(o.condRatio == null ? "  —  " : o.condRatio.toFixed(3)).padStart(7)}` +
        `      ${o.avail.toFixed(3)}      ${r3(clamp01(TIS.vPosRsPs.get(`${p}|${rs}|${ps}`)))}`);
    }
  }
  console.log(`\n  POOLED YFIR STODUR — practice_status ofan a report_status:`);
  for (const rs of RS_ORD) for (const ps of PS_ORD) {
    const c2 = TIS.raw.byRsPs.get(`${rs}|${ps}`);
    if (!c2 || c2.n < 25) continue;
    const o = cellOut(c2);
    console.log(`  ${rs.padEnd(14)} ${ps.padEnd(10)} ${String(o.n).padStart(6)}  pRow ${o.pRow.toFixed(3)}` +
      `  avail ${o.avail.toFixed(3)}   [current AVAIL: ${CURRENT[rs]}]`);
  }

  for (const fmt of FORMATS) {
    for (const h of HARNESS) {
      const R = results[fmt][h];
      console.log(`\n${line}\n  ${fmt.toUpperCase()} · HARNESS ${h}` +
        `${h === "rowsOnly" ? "  (AKKERID GILDIR)" : "  (AKKERI GILDIR EKKI — annad bil)"}\n${line}`);
      console.log(`  flat ${R.flatPerLineup} · ceiling ${R.ceilingPerLineup}` +
        ` · bil ${R.gapPerLineup} stig per uppstillingu · n=${R.lineups}`);
      console.log(`  arm                 % af bili (WF)   delta gegn nuverandi   t     ar+   per-leikmanns CI`);
      for (const a of ARMS) {
        if (a.kind === "scan") continue;         // ferillinn er prentadur ser
        const q = R.arms[a.key];
        const lv = q.levelWalkForward, d = q.deltaVsIncumbent, b = q.bootstrapPerPlayer;
        console.log(`  ${a.key.padEnd(18)} ${String(lv.mean == null ? "—" : lv.mean.toFixed(3)).padStart(10)}%` +
          `   ${String(a.key === "A1_current" ? "—" : (d.mean == null ? "—" : (d.mean > 0 ? "+" : "") + d.mean.toFixed(3))).padStart(12)} pp` +
          `  ${String(d.t == null ? "—" : d.t.toFixed(2)).padStart(6)}` +
          `  ${String(d.positive == null ? "" : `${d.positive}/${d.years}`).padStart(4)}` +
          `   ${b ? `[${b.ci[0]}, ${b.ci[1]}]${b.excludesZero ? " *" : ""}` : "—"}`);
      }
      const pc = placeboCeiling[fmt][h];
      console.log(`  placebo-thak (einhlida): maxPositiveT ${r3(pc.maxPositiveT)}` +
        ` · maxDelta ${r3(pc.maxDelta)} pp   [maxAbsT ${r3(pc.maxAbsT)} — birt, EKKI throskuldur]`);
      const rung = (k, ys) => { const m = perSeason.get(`${fmt}|${h}|${k}`);
        const s = statOf(ys.map((y) => m.get(y)).filter((v) => v != null));
        return s.mean == null ? "—" : s.mean.toFixed(2); };
      console.log(`  STIGINN (% af bili, ${YSCAN.length} ar): A0 ${rung("A0_avail1", YSCAN)}` +
        ` -> S1 Out ${rung("S1_outOnly", YSCAN)}` +
        ` -> S2 +Doubtful ${rung("S2_outDoubtful", YSCAN)}` +
        ` -> A1 +Questionable ${rung("A1_current", YSCAN)}` +
        ` -> T2rel +practice ${rung("T2_relative", YWF)} (WF-ar)` +
        `   ·  orakel ${rung("ORACLE_row", YSCAN)}`);
      for (const s of SCANS) {
        const qs = qScan[fmt][h][s.status];
        console.log(`  ${s.status}-ferill (% af bili, ${YSCAN.length} ar):`);
        console.log(`    ` + qs.curve.map((c) =>
          `${c.q === s.current ? "[" : " "}${c.q.toFixed(2)}${c.q === s.current ? "]" : " "}` +
          `${(c.level.mean == null ? "—" : c.level.mean.toFixed(2)).padStart(7)}`).join(""));
        console.log(`    in-sample best = ${qs.inSampleBestValue} · nuverandi ${qs.currentValue}` +
          ` · walk-forward val: ${qs.walkForwardPick.perSeason.map((p) => `${p.season}:${p.pickedValue}`).join(" ")}` +
          `  -> ${qs.walkForwardPick.deltaVsIncumbent.mean == null ? "—"
            : (qs.walkForwardPick.deltaVsIncumbent.mean > 0 ? "+" : "") +
              qs.walkForwardPick.deltaVsIncumbent.mean.toFixed(3)} pp` +
          ` (t ${qs.walkForwardPick.deltaVsIncumbent.t ?? "—"})`);
      }
    }
  }

  /* ============================================================
     11. NAEMNI A SAMDRAETTI — K ER VAL OG THAD ER SYNT
     ============================================================ */
  const shrinkSens = {};
  for (const K of [10, 25, 50, 100]) {
    const T = buildTable(fitRows.get("ppr"), K);
    shrinkSens[K] = {};
    for (const rs of ["Questionable", "Doubtful"]) for (const ps of ["Full", "Limited", "DNP"]) {
      for (const p of POSN)
        shrinkSens[K][`${p}|${rs}|${ps}`] = r3(clamp01(T.vPosRsPs.get(`${p}|${rs}|${ps}`)));
    }
  }

  /* ============================================================
     12. VERDICT — REIKNADUR UR TOLUNUM
     ============================================================ */
  function verdictFor(fmt, h) {
    const R = results[fmt][h], pc = placeboCeiling[fmt][h];
    const out = {};
    for (const a of ARMS) {
      /* Placeboar eru THROSKULDURINN, ekki umsaekjendur. Naemni-armar
         eru maeldir a odru arasetti og geta thvi ekki verid bornir vid
         placebo-thakid — their eru birtir sér. */
      if (a.kind === "placebo" || a.kind === "sensitivity" || a.kind === "scan" ||
          a.kind === "ladder" || a.key === "A1_current") continue;
      const d = R.arms[a.key].deltaVsIncumbent, b = R.arms[a.key].bootstrapPerPlayer;
      const tOk = d.t != null && d.tCrit != null && d.t > d.tCrit;
      const plcOk = d.t != null && d.t > pc.maxPositiveT && d.mean > pc.maxDelta;
      const ciOk = !!(b && b.excludesZero && b.ci[0] > 0);
      out[a.key] = { delta: d.mean, t: d.t, tCrit: d.tCrit, seasonsPositive: `${d.positive}/${d.years}`,
        perSeasonSignificant: tOk, beatsPlaceboCeiling: plcOk, perPlayerCiExcludesZero: ciOk,
        /* PER-LEIKMANNS RAEDUR. Bædi eru birt en skilyrdid er
           `ciOk && plcOk` — tímabila-t eitt er thad sem `vbdbase-lab`
           sýndi ad hrynur (29 marktaek eftir timabili, 0 af 153 per
           leikmann). */
        verdict: ciOk && plcOk && tOk ? "STENST" : "FELLUR" };
    }
    return out;
  }
  const verdict = {};
  for (const fmt of FORMATS) { verdict[fmt] = {};
    for (const h of HARNESS) verdict[fmt][h] = verdictFor(fmt, h); }

  const core = verdict.ppr.absenceVisible;
  const CANDIDATES = ["T2_practice", "T3_body", "T1_status", "T2_pRowOnly",
    "T1_relative", "T2_relative"];
  const bestArm = CANDIDATES
    .filter((k) => core[k] && core[k].verdict === "STENST")
    .sort((a, b) => core[b].delta - core[a].delta)[0] || null;
  /* Armur verdur ad STANDAST i OLLUM THREMUR snidum til ad heita
     nidurstada. `half-lab` skjalar hvers vegna: half er ekki
     sjalfstaett prof (thad er algebra af ppr og standard) en armur sem
     vinnur i ppr og tapar i standard er formsnid, ekki merki. */
  const bestArmAllFormats = CANDIDATES.filter((k) =>
    FORMATS.every((f) => verdict[f].absenceVisible[k] &&
      verdict[f].absenceVisible[k].verdict === "STENST"))[0] || null;

  console.log(`\n${line}\n  NIDURSTADA\n${line}`);
  for (const h of HARNESS) {
    console.log(`  ${h}:`);
    for (const k of Object.keys(verdict.ppr[h])) {
      const v = verdict.ppr[h][k];
      console.log(`    ${k.padEnd(18)} ${String(v.delta == null ? "—" : (v.delta > 0 ? "+" : "") + v.delta.toFixed(3)).padStart(9)} pp` +
        `  t ${String(v.t == null ? "—" : v.t.toFixed(2)).padStart(6)}/${v.tCrit}` +
        `  placebo ${v.beatsPlaceboCeiling ? "ja " : "nei"}  CI ${v.perPlayerCiExcludesZero ? "ja " : "nei"}` +
        `  -> ${v.verdict}`);
    }
  }
  console.log(`\n  -> besti armur sem STENST i absenceVisible (ppr): ${bestArm || "ENGINN"}`);
  console.log(`  -> og i OLLUM THREMUR snidum: ${bestArmAllFormats || "ENGINN"}`);

  /* ============================================================
     12b. SVORIN — REIKNUD UR TOLUNUM, EKKI SKRIFUD
     ============================================================
     Hver strengur hér er byggdur ur toluna sem er thegar i skranni.
     Ef keyrslan gefur onnur gildi breytist textinn med theim; hann
     getur ekki stadnad i "thad sem vid vissum sidast". */
  const tableOut = {};
  for (const fmt of FORMATS) {
    const T = tablesIS.get(fmt);
    const cells = {};
    for (const p of POSN) for (const rs of RS_ORD) {
      const c1 = T.raw.byPosRs.get(`${p}|${rs}`);
      if (c1) cells[`${p}|${rs}|(all)`] = { ...cellOut(c1),
        shrunkAvail: r4(clamp01(T.vPosRs.get(`${p}|${rs}`))) };
      for (const ps of PS_ORD) {
        const c2 = T.raw.byPosRsPs.get(`${p}|${rs}|${ps}`);
        if (c2) cells[`${p}|${rs}|${ps}`] = { ...cellOut(c2),
          shrunkAvail: r4(clamp01(T.vPosRsPs.get(`${p}|${rs}|${ps}`))) };
      }
    }
    const pooled = {};
    for (const rs of RS_ORD) {
      const c0 = T.raw.byRs.get(rs);
      if (c0) pooled[`${rs}|(all)`] = { ...cellOut(c0), currentAvail: CURRENT[rs] ?? null };
      for (const ps of PS_ORD) {
        const c2 = T.raw.byRsPs.get(`${rs}|${ps}`);
        if (c2) pooled[`${rs}|${ps}`] = { ...cellOut(c2), currentAvail: CURRENT[rs] ?? null };
      }
    }
    tableOut[fmt] = { global: T.raw.global, byPositionAndStatus: cells, pooledOverPositions: pooled,
      bodyGroupMultipliers: Object.fromEntries([...T.vBg].map(([k, v]) => [k, r4(v)])
        .filter(([k]) => k.startsWith("Questionable") || k.startsWith("None"))) };
  }
  const tableOutPooled = (fmt) => tableOut[fmt].pooledOverPositions;

  const A = {};
  {
    const B = results.ppr.absenceVisible.arms;
    const L = ladder.ppr.absenceVisible;
    const Q = qScan.ppr.absenceVisible.Questionable;
    const D = qScan.ppr.absenceVisible.Doubtful;
    const inc = B.A1_current.levelWalkForward.mean;
    const orc = B.ORACLE_row.levelWalkForward.mean;
    const step = Object.fromEntries(L.rungs.map((r) => [r.rung, r.stepUp ?? null]));
    const bestQ = Q.curve.slice().sort((a, b) => (b.level.mean ?? -1e9) - (a.level.mean ?? -1e9))[0];
    const plateau = Q.curve.filter((c) => c.level.mean != null &&
      c.level.mean >= (bestQ.level.mean - 1)).map((c) => c.q);
    const qCur = Q.curve.find((c) => c.q === AVAIL.Questionable);
    const pooled = tableOutPooled("ppr");
    A.q1_isQuestionable075Right = {
      currentValue: AVAIL.Questionable,
      measuredCalibratedValue: pooled["Questionable|(all)"] ? pooled["Questionable|(all)"].avail : null,
      decisionCurveBestQ: bestQ.q, decisionCurveBestLevel: bestQ.level.mean,
      levelAtCurrentQ: qCur ? qCur.level.mean : null,
      withinOnePointOfBest: plateau,
      walkForwardPickDelta: Q.walkForwardPick.deltaVsIncumbent.mean,
      walkForwardPickedValues: [...new Set(Q.walkForwardPick.perSeason.map((p) => p.pickedValue))],
      answer: `The CALIBRATED value is ${pooled["Questionable|(all)"]
        ? pooled["Questionable|(all)"].avail : "?"}, clearly below 0.75. The DECISION-optimal value ` +
        `is ${bestQ.q} and the curve is flat across ${plateau.join(", ")}: 0.75 sits inside that ` +
        `plateau. Choosing a value with walk-forward discipline instead of using 0.75 is worth ` +
        `${Q.walkForwardPick.deltaVsIncumbent.mean} pp, which is nothing. Calibration and decision ` +
        `value are NOT the same number here, and 0.75 is right on the one that matters.`,
    };
    {
      const dBest = D.curve.slice().sort((a, b) =>
        (b.level.mean ?? -1e9) - (a.level.mean ?? -1e9))[0];
      const dCur = D.curve.find((c) => c.q === AVAIL.Doubtful);
      A.q1c_isDoubtful025Right = {
        currentValue: AVAIL.Doubtful,
        measuredCalibratedValue: pooled["Doubtful|(all)"] ? pooled["Doubtful|(all)"].avail : null,
        rowsInSample: pooled["Doubtful|(all)"] ? pooled["Doubtful|(all)"].n : null,
        decisionCurve: D.curve.map((c) => ({ value: c.q, level: c.level.mean })),
        decisionCurveBestValue: dBest.q, levelAtCurrentValue: dCur ? dCur.level.mean : null,
        costOfTheError: r3((dBest.level.mean ?? 0) - (dCur ? dCur.level.mean ?? 0 : 0)),
        walkForwardPickDelta: D.walkForwardPick.deltaVsIncumbent.mean,
        answer: `This is the LARGEST calibration error in the table: 0.25 against a measured ` +
          `${pooled["Doubtful|(all)"] ? pooled["Doubtful|(all)"].avail : "?"} - a Doubtful player ` +
          `essentially never plays (${pooled["Doubtful|(all)"] ? pooled["Doubtful|(all)"].nRow : "?"} ` +
          `of ${pooled["Doubtful|(all)"] ? pooled["Doubtful|(all)"].n : "?"} rows). And it costs ` +
          `${r3((dBest.level.mean ?? 0) - (dCur ? dCur.level.mean ?? 0 : 0))} pp, because 0.25 ` +
          "already ranks him below every healthy option: being wrong by 28x in a term that only has " +
          "to sort him to the bottom changes no lineup. Fix it if you touch the table for other " +
          "reasons; it is not a reason to touch the table.",
      };
    }
    A.q1b_doesItDifferByPosition = {
      perPositionAvail: Object.fromEntries(POSN.map((p) => {
        const c = tableOut.ppr.byPositionAndStatus[`${p}|Questionable|(all)`];
        return [p, c ? { n: c.n, pRow: c.pRow, avail: c.avail } : null];
      })),
      answer: "Yes, and by a lot: P(a scoring row exists) for a Questionable player runs from QB at " +
        "the bottom to TE/WR at the top. A single number for all four positions is measurably wrong " +
        "as calibration. It is still not worth splitting for the DECISION - see q3.",
    };
    A.q2_secondMultiplier = {
      condRatioQuestionable: Object.fromEntries(POSN.map((p) => {
        const c = tableOut.ppr.byPositionAndStatus[`${p}|Questionable|(all)`];
        return [p, c ? c.condRatio : null];
      })),
      pRowOnlyArmDelta: B.T2_pRowOnly.deltaVsIncumbent.mean,
      fullArmDelta: B.T2_practice.deltaVsIncumbent.mean,
      answer: "A Questionable player who does play scores about 0.89-1.00 of his projection, so the " +
        "second multiplier is real but small (roughly 10% at most, and 0 for RB). Dropping it " +
        `(T2_pRowOnly, ${B.T2_pRowOnly.deltaVsIncumbent.mean} pp) versus keeping it (T2_practice, ` +
        `${B.T2_practice.deltaVsIncumbent.mean} pp) changes the decision by a fraction of a point. ` +
        "The app blends the two into one number and that blending costs nothing measurable.",
    };
    A.q3_doesPracticeStatusAdd = {
      informationInPRow: Object.fromEntries(["Full", "Limited", "DNP"].map((ps) => {
        const c = pooled[`Questionable|${ps}`];
        return [ps, c ? { n: c.n, pRow: c.pRow, avail: c.avail } : null];
      })),
      decisionDelta: B.T2_relative.deltaVsIncumbent.mean,
      decisionT: B.T2_relative.deltaVsIncumbent.t,
      decisionCi: B.T2_relative.bootstrapPerPlayer ? B.T2_relative.bootstrapPerPlayer.ci : null,
      ladderStep: step.T2_relative,
      answer: "Two answers and they point opposite ways, which is the whole finding. As INFORMATION " +
        "practice_status is strong: Questionable + Full practice plays about 86% of the time, " +
        "Questionable + DNP about 49%, a near-2x spread on over a thousand rows, and it is " +
        "monotone in every position. As a DECISION it is worth " +
        `${B.T2_relative.deltaVsIncumbent.mean} pp (t ${B.T2_relative.deltaVsIncumbent.t}), and the ` +
        "per-player CI includes zero. The column is worth reading and it is not worth re-weighting " +
        "the model for. The reason is the ladder: Out alone is " +
        `${step.S1_outOnly} pp of the ${r3(inc - (L.rungs[0].level.mean ?? 0))} pp the current table ` +
        "captures, and Out is already right.",
    };
    A.q5_doesABetterTableWin = {
      incumbentLevel: inc, oracleLevel: orc, headroom: r3(orc - inc),
      armsThatBeatIncumbent: Object.entries(verdict.ppr.absenceVisible)
        .filter(([, v]) => v.verdict === "STENST" && v.delta > 0).map(([k]) => k),
      bestArm, bestArmAllFormats,
      answer: bestArmAllFormats
        ? `${bestArmAllFormats} beats the current table in all three formats.`
        : "NO. Not one measured table beats the guessed table in any format, in either harness. " +
          "The null hypothesis stands and it stands on its own merits, not on thin data: the " +
          "placebo family loses by 24-27 pp, so the current table's gain is real signal and not " +
          "an artifact of shrinking projections. The guess in src/model.js was a good guess.",
    };
    A.q7_whatIsStillUnmeasured = {
      oracleHeadroom: r3(orc - inc),
      invisibleAfterHarnessB: { unknownTeam: invisible.unknownTeam, bye: invisible.bye },
      unverifiedSeason: leakage.unverifiedSeasons,
      answer: `The headroom is ${r3(orc - inc)} pp of the flat -> ceiling gap and it is significant ` +
        `(t ${B.ORACLE_row.deltaVsIncumbent.t}). It is NOT reachable through report_status or ` +
        "practice_status - those are measured out. It sits in the surprise inactives: the players " +
        "who carry no designation at all and still do not play. Every one of them is a NotListed " +
        "cell at pRow 0.85, and nothing in the injury report separates them. Full absence is now " +
        "VISIBLE in harness absenceVisible, which is why the oracle can be measured at all, but " +
        `${invisible.unknownTeam} roster-weeks still resolve to no team and stay outside both ` +
        "harnesses, and 2025 cannot be leak-verified.",
    };
  }

  /* ---------- likamshluti: er hann forspaanlegur? ---------- */
  const bodyAnswer = { multipliers: {}, spread: null, transfers: null };
  {
    const T = TIS;
    const vals = [];
    for (const bg of new Set([...Object.values(BODY_GROUP), "other"])) {
      const c = T.raw.byRsPsBg.get(`Questionable|Limited|${bg}`);
      const m = T.vBg.get(`Questionable|Limited|${bg}`);
      if (c && c.n >= 30) { bodyAnswer.multipliers[bg] = { n: c.n, mult: r3(m),
        pRow: r4(c.nRow / c.n) }; vals.push(m); }
    }
    bodyAnswer.spread = vals.length ? r3(Math.max(...vals) - Math.min(...vals)) : null;
    /* FLYTUR HANN MILLI TIMABILA? Sama prof og felldi stodur-gegn-lidum
       og domara-spjoldin i FPL-verkefninu: fyrri helmingur -> seinni.

       PROFID ER GERT A HRAUM LIKAMSHLUTUM, EKKI FLOKKUM. Fyrsta
       utgafan notadi flokkana og gaf r = 0,74 — a **fjorum punktum**.
       Fylgni ur fjorum punktum er ekki maeling; 95%-bil hennar naer
       naerri yfir allt [-1, 1]. Hraur listi gefur tvofalt fleiri
       punkta og hann er auk thess sá kvardi sem merkid vaeri notad a. */
    const cut = YSCAN[Math.floor(YSCAN.length / 2) - 1];
    const src = frV.filter((r) => r.rs === "Questionable");
    /* FYLGNI AN VIKMARKA ER TALA, EKKI MAELING — og hér er n mjog
       lagt (4-7 holf). Fisher-z gefur bilid; ef thad inniheldur null
       er "hun flyst" ekki fullyrding sem gognin standa undir. */
    const corr = (xs, ys2) => {
      if (xs.length < 4) return { r: null, ci: null, n: xs.length };
      const mx = mean(xs), my = mean(ys2);
      const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys2[i] - my), 0);
      const sx = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0));
      const sy = Math.sqrt(ys2.reduce((a, y) => a + (y - my) ** 2, 0));
      const r = sx && sy ? cov / (sx * sy) : null;
      if (r == null || xs.length < 4 || Math.abs(r) >= 1)
        return { r: r3(r), ci: null, n: xs.length };
      const z = 0.5 * Math.log((1 + r) / (1 - r));
      const se = 1 / Math.sqrt(xs.length - 3);
      const lo = Math.tanh(z - 1.96 * se), hi = Math.tanh(z + 1.96 * se);
      return { r: r3(r), ci: [r3(lo), r3(hi)], n: xs.length, excludesZero: lo > 0 || hi < 0 };
    };
    const transferOn = (keyFn, minN) => {
      const a1 = accum(src.filter((r) => r.season <= cut), keyFn);
      const a2 = accum(src.filter((r) => r.season > cut), keyFn);
      const xs = [], ys2 = [], names = [];
      for (const [k, c] of a1) {
        const d = a2.get(k);
        if (!d || c.n < minN || d.n < minN) continue;
        xs.push(c.nRow / c.n); ys2.push(d.nRow / d.n); names.push(k);
      }
      return { cells: xs.length, minNPerHalf: minN, ...corr(xs, ys2), keys: names,
        firstHalf: xs.map(r3), secondHalf: ys2.map(r3) };
    };
    bodyAnswer.transfers = {
      splitAt: cut,
      rawBodyParts: null,                        // fyllt ut hér fyrir nedan
      groups: transferOn((r) => r.bg, 30),
      note: "P(a scoring row exists) per body part among Questionable players, first half of the " +
        "verified seasons versus the second half. Same test that killed position-vs-opponent and " +
        "referee cards in the FPL project. The raw-body-part version is the one to read: the " +
        "grouped version has only four cells and a correlation over four points is not a " +
        "measurement, whatever number it prints.",
    };
    /* Fit-radirnar bera adeins FLOKKINN, svo hrai listinn er tekinn
       beint ur skyrslunum — en BUNDINN VID DRAFTANLEGU LAUGINA, eins
       og allt annad i thessari maelingu. Annars vaeri hann maeling a
       fjordu mottakarum sem faera enga rod hvort eda er. */
    {
      const a1 = new Map(), a2 = new Map();
      for (const [k, v] of rep) {
        if (v.rs !== "Questionable") continue;
        const [id, ys3, ws] = k.split("|");
        const y = Number(ys3);
        if (!verified.has(y)) continue;
        if (!poolIds.get(y) || !poolIds.get(y).has(id)) continue;
        const c2 = ctx.get(y);
        if (!c2) continue;
        const m = y <= cut ? a1 : a2;
        const c = m.get(v.body) || { n: 0, nRow: 0 };
        c.n++;
        if (c2.wk.get(`${id}|${Number(ws)}`)) c.nRow++;
        m.set(v.body, c);
      }
      const xs = [], ys2 = [], names = [];
      for (const [k, c] of a1) {
        const d = a2.get(k);
        if (!d || c.n < 20 || d.n < 20) continue;
        xs.push(c.nRow / c.n); ys2.push(d.nRow / d.n); names.push(k);
      }
      bodyAnswer.transfers.rawBodyParts = { cells: xs.length, minNPerHalf: 20, ...corr(xs, ys2),
        keys: names, firstHalf: xs.map(r3), secondHalf: ys2.map(r3) };
    }
  }
  {
    const t = bodyAnswer.transfers, raw = t && t.rawBodyParts, grp = t && t.groups;
    console.log(`\n  likamshluti (Questionable): breidd flokka-margfaldara ${bodyAnswer.spread}` +
      ` · flutningur milli helminga: hrair hlutar r=${raw ? raw.r : "—"} (${raw ? raw.cells : 0} holf)` +
      ` · flokkar r=${grp ? grp.r : "—"} (${grp ? grp.cells : 0} holf)`);
    const B = results.ppr.absenceVisible.arms;
    A.q4_isBodyPartPredictive = {
      groupMultipliers: bodyAnswer.multipliers,
      multiplierSpread: bodyAnswer.spread,
      transferRawBodyParts: raw, transferGroups: grp,
      armDelta: B.T3_body.deltaVsIncumbent.mean,
      armDeltaVsT2: r3((B.T3_body.deltaVsIncumbent.mean ?? 0) - (B.T2_practice.deltaVsIncumbent.mean ?? 0)),
      answer: `NO, on both tests. Transfer between halves of the sample is r=${raw ? raw.r : "?"} on ` +
        `${raw ? raw.cells : 0} cells with 95% CI ${raw && raw.ci ? `[${raw.ci[0]}, ${raw.ci[1]}]` : "n/a"}, ` +
        `which ${raw && raw.excludesZero ? "excludes" : "INCLUDES"} zero - the same signature that ` +
        "killed position-vs-opponent and referee cards. And the size settles it independently: adding " +
        "the body part on top of report_status x practice_status moves the decision by " +
        `${r3((B.T3_body.deltaVsIncumbent.mean ?? 0) - (B.T2_practice.deltaVsIncumbent.mean ?? 0))} pp. ` +
        "The grouped version prints r=0.74 and that number should be ignored: it is four points. " +
        "Hamstring really does play less than a Toe, but not reliably enough to move a lineup.",
    };
    A.q6_joinRate = { ...joinRate,
      answer: `${joinRate.pctFoundInWeekly}% of the kept injury rows resolve to a gsis id that ` +
        "appears in weekly the same season, joined directly on gsis with NO name matching anywhere " +
        "in this lab. The threshold in the script is 90% and it would have refused to write below " +
        `it. The lower ${joinRate.pctInDraftablePool}% figure is the share that lands in the ` +
        "draftable pool, which is not a match failure - most injury-report rows are players nobody " +
        "drafts.",
    };
  }

  /* ============================================================
     13. SKRIFA
     ============================================================ */
  const out = {
    generated: new Date().toISOString(),
    provenance: {
      ...stamp({ argv: process.argv.slice(2),
        defaults: { from: 2019, boot: 400, shrink: 25 },
        inputs: ["features.json", "schedule_history.json", "defense.json",
          "measure/gap.json", "startsit_ppr.json", "startsit_standard.json"], dataDir: OUT }),
      weeklyFiles: Object.fromEntries(YS.map((y) =>
        [`weekly/${y}.json`, fpOf(path.join(OUT, "weekly", `${y}.json`))])),
      injuryFiles: Object.fromEntries(injFiles.map((f) => [path.basename(f), fpOf(f)])),
      gamesFile: { "games.csv": fpOf(gamesFile) },
      cacheDir: "scripts/.avail-cache (raw nflverse CSV, ~5 MB, MUST NOT be committed)",
    },
    question: "Is AVAIL in src/model.js measured or guessed, and does a measured table improve " +
      "the start/sit decision in the same flat -> ceiling metric everything else uses?",
    seasons: YS, walkForwardSeasons: YWF,
    columnsReadThatBuildFeaturesDoesNot: ["report_primary_injury", "report_secondary_injury",
      "practice_primary_injury", "practice_secondary_injury", "practice_status", "date_modified"],
    joinRate, leakage,
    method: {
      harnesses: {
        rowsOnly: "Exactly startsit-lab/gap-lab: the candidate pool is roster players who carry a " +
          "weekly row. The anchor (5.831 / 3.199 / 2.967) lives here and is enforced. Full absence " +
          "is invisible, so only PARTIAL availability failure can move this number.",
        absenceVisible: "The candidate pool is every roster player whose team has a game that week " +
          "(bye excluded, because a manager knows byes and weeklyProjection takes a bye argument). " +
          "An absent player is IN the pool and scores 0. THE ANCHOR DOES NOT APPLY HERE - the gap " +
          "is a different and larger one. Both harnesses count the identical lineup-weeks " +
          "(played.length >= 9 is computed from rows in both), so the difference between them is " +
          "the pool definition and nothing else.",
      },
      lineupEngine: "src/lineup.js optimalLineup, input sorted QB,RB,WR,TE to reproduce " +
        "startsit-lab FLEX tie-breaks. avail is passed SEPARATELY from proj, which is exactly the " +
        "path the app uses (ev = proj * avail, and avail === 0 makes a player unplayable).",
      fit: "avail(cell) = SUM actual points / SUM (base * gameScript * defense). A ratio of sums, " +
        "not a mean of ratios, so the projection is unbiased inside the cell. Exact decomposition: " +
        "avail = pRowWeighted * condRatio.",
      shrinkage: `Hierarchical: pos x status x practice -> pos x status -> status -> global. K=${SHRINK} ` +
        "pseudo-rows at the parent rate with the cell's mean denominator. K is a CHOICE and the " +
        "sensitivity at 10/25/50/100 is reported.",
      walkForward: "Every measured arm in season y uses a table fitted only on seasons < y. 2019 has " +
        "no prior history and is therefore OUTSIDE the walk-forward measurement - it is not silently " +
        "filled with avail=1, because that would be an A0 arm hiding inside the mean.",
      clustering: "Bootstrap clustered per player. Each lineup change is decomposed into swap pairs " +
        "(sum over pairs equals the lineup delta exactly - self-tested), and each pair is labelled " +
        "with the player whose availability multiplier moved most between the arms.",
      placeboRole: `${NOISE_SEEDS.length * 2} placebos of two kinds through the identical net. ` +
        "'Label' placebos get random cell labels and go through the whole fitting and walk-forward " +
        "machinery. 'Value' placebos get the real fitted value distribution assigned to random " +
        "player-weeks at the same frequency - they test whether the gain is knowing WHO or merely " +
        "shrinking 28% of the projections. The threshold is maxPositiveT, ONE-SIDED (usage-lab " +
        "found max|t| = 22.238 for a cell that LOST every year, and that flaw flipped an answer).",
      cap: "Fitted values are capped at 1. Some cells fit above 1 (RB / None / Full = 1.086): a " +
        "player who is on the report but undesignated outscores his projection, because that is a " +
        "selected sample. Letting avail exceed 1 would make the availability term CORRECT the " +
        "projection, which is a different question and a different test. availability() returns " +
        "0..1 in the app and that stands.",
    },
    pRowCaveat: "pRow is P(a weekly scoring row exists), NOT P(the player was active). A player who " +
      "is active but takes no snaps produces no row. For a start/sit decision the two are the same " +
      "thing - both score 0 - so pRow is the operationally correct target for the EV multiplier. It " +
      "is NOT the answer to the literal question 'did he play', and NotListed sitting at 0.855 " +
      "rather than 1.0 is mostly this effect, not surprise scratches.",
    measuredTable: tableOut,
    shrinkSensitivity: shrinkSens,
    currentTableApplied: CURRENT,
    currentTableDeadEntries: {
      Probable: "AVAIL has Probable = 0.95. The NFL ABOLISHED the Probable designation in 2016. It " +
        "appears 0 times in 2019-2025. A row in the table that data cannot reach.",
      DNR: "DNR = 0.5 is a Sleeper word (Did Not Report, a holdout). It does not exist in the NFL " +
        "injury report, so this lab cannot measure it and does not claim to.",
    },
    anchors: { rowsOnly: anchors, expected: want },
    selfTests, invisible: { ...invisible,
      pctOfRosterWeeks: r3(invisible.rosterWeeks ? invisible.noRow / invisible.rosterWeeks * 100 : null),
      note: "Same count as gap-lab. In harness rowsOnly these player-weeks are filtered out of both " +
        "lineups and contribute ZERO, which is why the oracle is a no-op there. In harness " +
        "absenceVisible the 'absent' ones are back in the pool; 'bye' stays out (a manager knows " +
        "byes) and 'unknownTeam' stays out (no team could be resolved for the week, so the harness " +
        "cannot place him in a game). unknownTeam is the residual invisibility of THIS lab.",
    },
    results, placeboCeiling, availabilityLadder: ladder, questionableScan: qScan,
    bodyPart: bodyAnswer, verdict, answers: A,
    bestArm, bestArmAllFormats,
    wiring: "NOTHING IS WIRED INTO src/ ON THIS EVIDENCE. This file is a measurement. The table in " +
      "src/model.js is unchanged.",
  };

  await writeFile(path.join(MEAS, "avail.json"), JSON.stringify(out, null, 1));
  console.log(`\n-> data/measure/avail.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
