#!/usr/bin/env node
/* ============================================================
   ecr-timing.mjs — KOSTAR THAD STIG AD DRAFTA 21. AGUST I STAD
   THESS AD BIDA THAR TIL SERFRAEDINGARNIR ERU BUNIR?

     node scripts/ecr-timing.mjs [--runs=6] [--day=21]

   -> data/measure/ecr_timing.json

   SPURNINGIN SEM ER VERID AD SVARA. Notandinn draftar 21. agust og
   spurdi hvort "fleiri serfraedingar seu bunir ad senda inn nuna",
   thvi hann vill vita hvort hann eigi ad horfa til fleiri borda.
   Undirspurningin sem hann spurdi EKKI en er sú sem raedur ollu:
   **bordid sem hann faer 21. agust er ekki sidasta ord theirra.**

   MAELT 17.8.2026 a `experts.json`: af 207 arkiveradum 2025-bordum
   hafa adeins **13 sidustu uppfaerslu 20. agust eda fyrr**. 90 theirra
   voru uppfaerd 4. september. Serfraedingarnir halda afram ad hreyfa
   sig fram ad fyrsta leik, svo hver sem draftar i agust draftar eftir
   MILLI-UTGAFU.

   VARNAGLI SEM VERDUR AD FYLGJA THEIRRI TOLU: `updated` er SIDASTA
   uppfaersla arkiverada bordsins, ekki thad hvenaer bordid varð til.
   Bord sem var til 17. agust 2025 og var endurskodad 4. september ber
   `9/04`. Talan segir thvi ad bordin HREYFAST seint — hun segir EKKI
   ad their hafi ekki verid til i agust. Ad lesa hana sem "adeins 13
   bord voru til" vaeri omaeld fullyrding sem litur ut eins og maeling.

   THESS VEGNA ER THETTA MAELT A GOGNUM, EKKI RADID AF TIMASTIMPLUM.
   `db_fpecr.csv.gz` (DynastyProcess) geymir hverja skrapun MED
   DAGSETNINGU, svo samsteypan eins og hun VAR 21. agust er raunveruleg
   soguleg staerd. Vid drogum tvaer myndir ur hverju ari:

     `aug`    sidasta skrapun <= 21. agust   (thad sem hann faer)
     `final`  sidasta skrapun <= 3. september (sidasta ord theirra)

   og latum thaer DRAFTA GEGN HVER ANNARRI i hans eigin deildum.

   HVERS VEGNA EINVIGI OG EKKI FYLGNI. Sami lærdomur og annars stadar
   i thessu repo-i (`aron/verd` i FPL-verkefninu, `sharpDelta` her):
   **fylgni er ekki akvordun.** Tvaer radningar geta haft rho 0,97 og
   samt skilid tveimur ólikum lidum ef munurinn liggur i fyrstu tveimur
   umferdunum. Baedi er birt, en einvigid er svarid.

   THRIDJA TALAN SEM ER BIRT ER NULL-VIDMIDID. Munurinn milli tveggja
   ECR-mynda er litill, og lítil tala ur hermun med slembnum draft-hávada
   er ekki sjalfkrafa merki. Thess vegna er `final` lika latid drafta
   gegn SJALFU SER (sama bord, badar hlidar, sami hávadi) — thad gefur
   toluna sem hermunin skilar thegar SVARID ER THEKKT AD VERA NULL.
   Maelt: **nakvaemlega 0, med staersta flakki 0** — eins bord gefa eins
   draft, svo vélin sjalf baetir engum hávada vid. Sé `aug`-vs-`final`
   frabrugdid nulli er thad thvi bordunum ad kenna, ekki hermuninni.

   ============================================================
   URTAKID ER FJOGUR AR OG THAD ER BINDANDI — LESTU THAD ADUR EN
   THU LEST TOLUNA
   ============================================================
   Speglunin skrapar VIKULEGA, svo agust-myndin er 16.-20. agust (1-5
   dogum fyrir 21.) og final-myndin 30.8.-3.9. Thad er nakvaemlega retta
   bilid. EN nothaef ar eru adeins **2021-2024**:

     2019  engin agust/september-skrapun i safninu
     2020  standard-myndin (`ro`) 20. agust naer ekki 120 leikmonnum
     2025  **adeins TVAER skrapanir i glugganum (1. og 8. agust)** — engin
           eftir 8. agust, svo "agust" og "final" eru SAMA myndin og arid
           er sleppt. Safnid thynntist 2025; thad er ekki okkar val.

   Fjogur ar geta ekki skorid ur um einvigid og gera thad ekki: t liggur
   milli -0,76 og -1,49 thar sem ~3,18 vaeri kraflst. **OG THRJU AFBRIGDI
   SEM ERU SAMMALA ERU EKKI THRJAR STADFESTINGAR** — ppr-rod, std-rod og
   badar deildirnar hvila a SOMU fjorum timabilum og somu laug, svo their
   deila hávadanum. Ad telja samhljodan theirra sem aukid urtak vaeri
   nakvaemlega su tegund villu sem thetta repo skjalfestir annars stadar
   (sja "hærri fylgni er ekki betri akvordun").

   STODUGLEIKA-TALAN ER HINS VEGAR STERK: rho >= 0,99 i 4/4 arum og
   staersta hreyfing INNAN TOPP 50 er 1,7 saeti a ollu bilinu. Thad er
   niðurstadan sem stendur; einvigid er birt sem OSKORID.

   ATH: THETTA ER MAELINGA-SKRIFTA, EKKI HLUTI AF PIPELINE. Hun
   breytir engum vogum og ekkert i appinu les `ecr_timing.json`.
   ============================================================ */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getBuf, record } from "./lib/http.mjs";
import { rows as csvRows } from "./lib/csv.mjs";
import { normPos } from "../src/scoring.js";
import { normTeam, buildIndexes, matchByName } from "../src/names.js";
import { simulateDraft } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const SRC = "https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_fpecr.csv.gz";

const ARG = parseArgs(process.argv.slice(2), { runs: "number", day: "number" });
/* 40 og ekki 6: vid 6 flokti ars-talan um +-30 stig milli keyrslna (2022
   for ur +28,7 i +90,4 eftir afbrigdi) af thvi ad draft-hávadinn var
   ekki fullnaegjandi medaltaladur. Vid 40 stodvast metid a ~-50 i ollum
   thremur afbrigdum. Flokt sem kemur ur EIGIN keyrslu vaeri lesid sem
   munur a bordunum. */
const RUNS = Number(ARG.runs || 40);
/** Draft-dagurinn sem er verid ad meta. Sjalfgefid 21. agust. */
const AUG_DAY = Number(ARG.day || 21);
/** Sami hardi threskuldur og `fetch-ecr-history.mjs`: NFL hefst aldrei fyrr en 4.9. */
const CUTOFF_MONTH = 9, CUTOFF_DAY = 3;

const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;
const numOr = (v) => {
  if (v == null || v === "" || v === "NA" || v === "-") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const tOf = (a) => {
  const v = a.filter((x) => x != null);
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
};

/* Hans eigin deildir — sömu tvaer og `ecr-duel.mjs` notar. Sama
   uppsetning, annars vaeri thetta maelt i odrum heimi en hitt. */
const LEAGUES = [
  { key: "patriots", label: "Patriots SB champs (10, PPR)", fmt: "ppr",
    league: { teams: 10, scoring: "ppr",
              starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
              flexPos: ["RB", "WR", "TE"], excludePos: ["K", "DST"] } },
  { key: "sofahetjur", label: "Sofahetjur (12, half-PPR)", fmt: "half",
    league: { teams: 12, scoring: "half-ppr",
              starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"] } },
];

/**
 * Dregur tvaer myndir per ar+tegund ur `db_fpecr`.
 *
 * LINU-SKONNUN, EKKI HEILDAR-THATTUN — sama rok og i
 * `fetch-ecr-history.mjs`: skrain er ~1,5 milljon radir og Node
 * sprakk a minni (heap OOM) thegar hun var thattud i heild. Adeins
 * tvaer af fjortan `ecr_type`-tegundum og adeins agust/september
 * komast ad, svo odyr regluleg segd fellir ~99% adur en nokkud er
 * thattad.
 */
async function snapshots() {
  console.log("saeki db_fpecr (~100 MB afthjappad) …");
  const buf = await getBuf(SRC, { timeout: 300_000 });
  const txt = buf.toString("utf8");
  console.log(`  ${(txt.length / 1e6).toFixed(0)} MB`);

  const header = txt.slice(0, txt.indexOf("\n"));
  const col = Object.fromEntries(csvRows(header)[0].map((h, i) => [h, i]));
  for (const c of ["player", "pos", "ecr", "ecr_type", "scrape_date"]) {
    if (col[c] == null) throw new Error(`dalk vantar: ${c}`);
  }

  /* `ecr_type` og `scrape_date` eru tveir sidustu dalkarnir. */
  const KEEP = /,(rp|ro),(\d{4})-(08|09)-(\d{2})\r?$/;
  /* Fyrst er FUNDIN retta dagsetningin per (ar|tegund|mynd); sidan er
     skannad aftur og adeins thaer linur thattadar. Tvaer skannanir a
     streng eru odyrari en ad geyma allar linurnar sem lifa. */
  const want = new Map();   // "ar|tegund|mynd" -> dagsetning
  let scanned = 0;
  for (const line of lines(txt)) {
    scanned++;
    const m = KEEP.exec(line);
    if (!m) continue;
    const [, t, yr, mo, day] = m;
    const d = `${yr}-${mo}-${day}`;
    const mo_ = Number(mo), day_ = Number(day);
    const inFinal = mo_ === 8 || (mo_ === CUTOFF_MONTH && day_ <= CUTOFF_DAY);
    const inAug = mo_ === 8 && day_ <= AUG_DAY;
    for (const [view, ok] of [["aug", inAug], ["final", inFinal]]) {
      if (!ok) continue;
      const k = `${yr}|${t}|${view}`;
      if (!want.has(k) || d > want.get(k)) want.set(k, d);
    }
  }
  console.log(`  skannadar ${scanned} linur, ${want.size} myndir valdar`);

  const byDate = new Map();          // dagsetning -> Set(lyklar sem vilja hana)
  for (const [k, d] of want) {
    if (!byDate.has(d)) byDate.set(d, new Set());
    byDate.get(d).add(k);
  }
  const out = {};
  for (const line of lines(txt)) {
    const m = KEEP.exec(line);
    if (!m) continue;
    const [, t, yr, mo, day] = m;
    const d = `${yr}-${mo}-${day}`;
    const keys = byDate.get(d);
    if (!keys) continue;
    const r = csvRows(line)[0];
    if (!r) continue;
    const ecr = numOr(r[col.ecr]);
    if (ecr == null) continue;
    const pos = normPos(r[col.pos]);
    if (!["QB", "RB", "WR", "TE"].includes(pos)) continue;
    const row = { name: r[col.player], pos,
                  team: normTeam(r[col.tm] ?? r[col.team]), ecr };
    for (const k of keys) {
      if (!k.startsWith(`${yr}|${t}|`)) continue;
      (out[k] = out[k] || { scrapeDate: d, players: [] }).players.push(row);
    }
  }
  /* Skrapun med of faum leikmonnum er ekki nothaef samsteypa — sami
     threskuldur og i `fetch-ecr-history.mjs`. */
  for (const k of Object.keys(out)) {
    if (out[k].players.length < 120) delete out[k];
    else out[k].players.sort((a, b) => a.ecr - b.ecr);
  }
  return out;
}

function* lines(s) {
  let i = 0;
  while (i < s.length) {
    let j = s.indexOf("\n", i);
    if (j < 0) j = s.length;
    yield s.slice(i, j);
    i = j + 1;
  }
}

const rankBy = (pool, get) => new Map(pool.filter((p) => get(p) != null)
  .slice().sort((a, b) => get(a) - get(b)).map((p, i) => [p.id, i + 1]));

function spearman(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const rank = (a) => {
    const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(a.length);
    for (let i = 0; i < idx.length;) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const a = rank(xs), b = rank(ys);
  const ma = mean(a), mb = mean(b);
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2;
  }
  return sa && sb ? r3(sab / Math.sqrt(sa * sb)) : null;
}

async function main() {
  const snaps = await snapshots();
  const keys = Object.keys(snaps).sort();
  for (const k of keys) console.log(`  ${k}  ${snaps[k].scrapeDate}  ${snaps[k].players.length} leikmenn`);

  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const ppr = new Map(), std = new Map();
  for (const r of feats.rows) {
    if (r.scoring === "ppr") ppr.set(`${r.season}|${r.id}`, r);
    else if (r.scoring === "standard") std.set(`${r.season}|${r.id}`, r);
  }

  /* Ar sem a BADAR myndir i BADUM tegundum — annars er samanburdurinn
     ekki til. Ar thar sem agust-myndin ER sidasta myndin er sleppt: tha
     eru bordin eins og "munurinn" maeldist 0 af byggingarlegum astaedum,
     ekki af maelingu. */
  const years = [...new Set(keys.map((k) => Number(k.split("|")[0])))]
    .filter((y) => ["rp", "ro"].every((t) => snaps[`${y}|${t}|aug`] && snaps[`${y}|${t}|final`]))
    .filter((y) => snaps[`${y}|rp|aug`].scrapeDate !== snaps[`${y}|rp|final`].scrapeDate)
    .sort();
  console.log(`\n${years.length} ar med badar myndir og raunverulegt bil: ${years.join(", ")}`);

  const pools = {}, agree = {};
  for (const y of years) {
    const idxA = buildIndexes(snaps[`${y}|rp|aug`].players);
    const idxF = buildIndexes(snaps[`${y}|rp|final`].players);
    const idxAs = buildIndexes(snaps[`${y}|ro|aug`].players);
    const idxFs = buildIndexes(snaps[`${y}|ro|final`].players);
    const rows = [];
    for (const [k, a] of ppr) {
      if (!k.startsWith(`${y}|`)) continue;
      const b = std.get(k);
      if (!b || a.adp == null || a.pts == null || b.ptsStd == null) continue;
      const g = (idx) => { const m = matchByName(idx, a.name, a.pos, a.team); return m ? m.item.ecr : null; };
      const eA = g(idxA), eF = g(idxF), eAs = g(idxAs), eFs = g(idxFs);
      /* BAÐAR myndir eru forsenda — leikmadur sem adeins onnur nefnir
         faeri i laug annars bordsins en ekki hins, og tha vaeri thetta
         einvigi um urtaksstaerd, ekki um timasetningu. */
      if (eA == null || eF == null || eAs == null || eFs == null) continue;
      const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
      const sj = b.sleeperProj != null ? b.sleeperProj : b.ffProj;
      rows.push({ id: a.id, pos: a.pos, name: a.name, adp: a.adp,
        augPpr: eA, finPpr: eF, augStd: eAs, finStd: eFs,
        proj: { ppr: pj, half: pj != null && sj != null ? (pj + sj) / 2 : null },
        actual: { ppr: a.pts, half: (a.pts + b.ptsStd) / 2 } });
    }
    if (rows.length < 110) continue;
    pools[y] = rows;
    const top = rows.slice().sort((p, q) => p.finPpr - q.finPpr);
    const t50 = top.slice(0, 50);
    agree[y] = {
      n: rows.length,
      augDate: snaps[`${y}|rp|aug`].scrapeDate,
      finalDate: snaps[`${y}|rp|final`].scrapeDate,
      rhoAll: spearman(rows.map((r) => r.augPpr), rows.map((r) => r.finPpr)),
      rhoTop50: spearman(t50.map((r) => r.augPpr), t50.map((r) => r.finPpr)),
      medAbsMove: r1(median(rows.map((r) => Math.abs(r.augPpr - r.finPpr)))),
      medAbsMoveTop50: r1(median(t50.map((r) => Math.abs(r.augPpr - r.finPpr)))),
      maxMoveTop50: r1(Math.max(...t50.map((r) => Math.abs(r.augPpr - r.finPpr)))),
    };
  }
  const ys = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, 4, "ecr-timing");

  /* ---- EINVIGID ---- */
  const res = {};
  for (const L of LEAGUES) {
    const repl = replacementRanks({ ...L.league, scoring: "ppr" });
    const srcs = L.fmt === "half" ? ["Ppr", "Std"] : ["Ppr"];
    res[L.key] = {};
    for (const sfx of srcs) {
      const per = {}, perNull = {};
      for (const y of ys) {
        const pool = pools[y].filter((p) => p.proj[L.fmt] != null);
        if (pool.length < 110) continue;
        const augB = rankBy(pool, (p) => p[`aug${sfx}`]);
        const finB = rankBy(pool, (p) => p[`fin${sfx}`]);
        const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[L.fmt] }]));
        const d = [], dn = [];
        for (let r = 0; r < RUNS; r++) {
          let a = (y * 1000 + r * 7919) >>> 0;
          const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
          const field = new Map(pool
            .map((p) => [p.id, p.adp + (rnd() + rnd() + rnd() - 1.5) * 8])
            .sort((x, z) => x[1] - z[1]).map(([id], i) => [id, i + 1]));
          for (let i = 1; i <= L.league.teams; i++) {
            const j = i % L.league.teams + 1;
            for (const swap of [false, true]) {
              /* AGUST gegn FINAL. Jakvaett = agust-bordid vinnur. */
              const o = simulateDraft({ board: augB, fieldBoard: field, actual,
                slot: swap ? j : i, league: L.league,
                rival: { slot: swap ? i : j, board: finB } });
              d.push(o.points - o.rivalPoints);
              /* NULL-VIDMIDID: FINAL gegn SJALFU SER. Sami havadi, sama
                 herbergi, og svarid er THEKKT AD VERA NULL. */
              const z = simulateDraft({ board: finB, fieldBoard: field, actual,
                slot: swap ? j : i, league: L.league,
                rival: { slot: swap ? i : j, board: finB } });
              dn.push(z.points - z.rivalPoints);
            }
          }
        }
        per[y] = r1(mean(d));
        perNull[y] = r1(mean(dn));
      }
      const vals = ys.map((y) => per[y]).filter((x) => x != null);
      const nulls = ys.map((y) => perNull[y]).filter((x) => x != null);
      res[L.key][sfx === "Ppr" ? "ecrPpr" : "ecrStd"] = {
        per, mean: r1(mean(vals)), t: tOf(vals),
        wins: vals.filter((x) => x > 0).length, years: vals.length,
        nullPer: perNull, nullMean: r1(mean(nulls)),
        nullAbsMax: r1(Math.max(...nulls.map(Math.abs))),
      };
    }
  }

  /* ---- SKYRSLAN ---- */
  console.log("\nHVE MIKID HREYFAST BORDIN MILLI 21.8. OG 3.9.?\n");
  console.log("  ar    agust      final      rho(allir) rho(topp50) mid.hreyf  topp50  max50");
  for (const y of ys) {
    const a = agree[y];
    console.log(`  ${y}  ${a.augDate}  ${a.finalDate}  ` +
      `${String(a.rhoAll).padEnd(10)} ${String(a.rhoTop50).padEnd(11)} ` +
      `${String(a.medAbsMove).padEnd(10)} ${String(a.medAbsMoveTop50).padEnd(7)} ${a.maxMoveTop50}`);
  }

  console.log("\nEINVIGI — AGUST-BORDID GEGN SIDASTA ORDI THEIRRA");
  console.log("(jakvaett = agust vinnur; NULL er sama bord gegn sjalfu ser)\n");
  for (const L of LEAGUES) {
    console.log(`  ${L.label}`);
    for (const [src, q] of Object.entries(res[L.key])) {
      const lbl = src === "ecrPpr" ? "ECR (ppr-rod)" : "ECR (std-rod)";
      const sig = q.t != null && Math.abs(q.t) > 2.5;
      console.log(`    ${lbl.padEnd(16)} ${q.mean > 0 ? "+" : ""}${q.mean} stig ` +
        `(${q.wins}/${q.years} ar, t=${q.t})${sig ? "  MARKTAEKT" : "  ekki marktaekt"}`);
      console.log(`    ${"".padEnd(16)} null-vidmid ${q.nullMean > 0 ? "+" : ""}${q.nullMean}, ` +
        `staersta null-flakk ${q.nullAbsMax}`);
    }
  }

  /* ============================================================
     NIDURSTADAN ER SKRIFUD I SKRANA, EKKI SKILIN LESANDANUM
     ============================================================
     Skra sem ber `mean: -50` og ekkert annad verdur lesin sem "-50
     stig" af naesta manni (eda naestu lotu) sem opnar hana. Vidmidin
     sem gera toluna OSKORNA — fjogur ar, t undir 1,5, deilt hávadi
     milli afbrigda — eiga thvi ad liggja i skranni sjalfri. */
  const duel = Object.values(res).flatMap((v) => Object.values(v));
  const tMax = Math.max(...duel.map((q) => Math.abs(q.t ?? 0)));
  const T_CRIT_N4 = 3.182;                       // t(0,05; df=3), tvihliða
  const payload = {
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { runs: RUNS, day: AUG_DAY },
      inputs: ["features.json"], dataDir: OUT }),
    draftDay: `08-${String(AUG_DAY).padStart(2, "0")}`,
    seasons: ys, agreement: agree, leagues: LEAGUES.map((L) => ({ key: L.key, label: L.label })),
    results: res,
    verdict: {
      stability: "MAELT OG STERKT: forleiks-samsteypan haggast varla milli " +
        "midjum agust og fyrsta leik. rho >= 0,99 i 4/4 arum, midgildi " +
        "hreyfingar 0,5 saeti, og staersta hreyfing innan TOPP 50 er 1,7 saeti.",
      duel: "OSKORID: agust-bordid maelist ~-50 stig, 3 af 4 arum negativt, " +
        `en |t| <= ${r3(tMax)} thar sem ${T_CRIT_N4} vaeri krafist vid n=4. ` +
        "Attin er verd athygli; staerdin er EKKI stadfest.",
      whyNotMoreYears: "Speglunin (db_fpecr) ber engar agust/september-skrapanir " +
        "2019, standard-myndin 2020 naer ekki 120 leikmonnum, og 2025 hefur " +
        "adeins tvaer skrapanir (1. og 8. agust) svo baðar myndir eru eins. " +
        "Fleiri ar eru ekki i bodi ur thessari heimild.",
      variantsAreNotIndependent: "ppr-rod, std-rod og baðar deildirnar hvila a " +
        "SOMU fjorum timabilum og somu laug. Samhljoda afbrigdi eru thvi EKKI " +
        "thrjar stadfestingar og maega ekki teljast sem aukid urtak.",
      nullBenchmark: "Sama bord baðum megin gefur nakvaemlega 0 (staersta flakk 0), " +
        "svo hermunin sjalf baetir engum hávada vid samanburdinn.",
      actionable: "Notandinn draftar 21. agust og getur ekki notad september-bordid, " +
        "svo thetta breytir engri vog. Thad sem thad STYDUR er ad gogn seu " +
        "endurnyjud a draft-degi og ad seinar frettir seu lesnar ser.",
    },
  };
  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", "ecr_timing.json"),
    JSON.stringify(payload, null, 1) + "\n");
  record("ecr_timing", ys.length >= 4,
    `${ys.length} seasons, Aug-${AUG_DAY} board vs final preseason board`);
  console.log("\n-> data/measure/ecr_timing.json");
}

function median(a) {
  const t = a.slice().sort((x, y) => x - y), h = t.length >> 1;
  return t.length % 2 ? t[h] : (t[h - 1] + t[h]) / 2;
}

main().catch((e) => { console.error(e); process.exit(1); });
