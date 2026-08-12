#!/usr/bin/env node
/* ============================================================
   expert-persistence.mjs — ER EINHVER SPAMADUR ALLTAF BESTUR?

     node scripts/expert-persistence.mjs [--from=2015] [--to=2025]

   -> data/expert_persistence.json

   ============================================================
   SPURNINGIN, OG HVERS VEGNA HUN VAR OSVARANLEG THANGAD TIL NU
   ============================================================
   "Ef Jon Jonsson er alltaf besti spamadurinn i fimmtan ar er
   liklega ohaett ad taka mark a honum." Thetta er rett hugsun og hun
   er PROFANLEG — en pipeline-id sotti nakvaemni FantasyPros adeins
   fyrir YFIRSTANDANDI timabil (215 serfraedingar, 2025) og eitt ar
   getur ekki svarad henni.

   Sidan svarar hins vegar `?year=` og gerir thad afturabak: 2018 ber
   160 radir, 2022 ber 256, 2024 ber 234. Sagan var til allan timann
   og enginn hafdi bedid um hana.

   ============================================================
   HVAD ER MAELT
   ============================================================
   1. FLYTST ROD MILLI ARA? Spearman a rod theirra sem eru i BADUM
      arum. Thetta er nakvaemlega sama prof og var notad a
      thjoppunarstudulinn og a domara-spjoldin i FPL-verkefninu, og
      thad er retta profid: hafi rodin ekkert minni er "bestur i fyrra"
      merkingarlaust um naesta ar.

   2. TOPP-10 I FYRRA — HVAR LENDA THEIR I AR? Ef hæfileiki raedur
      eiga their ad vera nalaegt toppnum aftur. Ef hendingu raedur
      lenda their i midjunni.

   3. HVE MARGIR ERU I BADUM ARUM? Ef serfraedingar hverfa milli ara er
      "sami madur" ekki einu sinni skilgreinanlegur, og thad er sjalft
      svar.

   4. SNIDID INNAN ARSINS. Sa sem var #1 i heild 2025 var 187. af 215
      i TIGHT END. Skil milli stada innan sama manns er sterk
      visbending um ad heildarrodin se hávaði — haefileiki aetti ad
      fylgjast ad milli stada hja sama manni.
   ============================================================ */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), { from: "number", to: "number" });
const FROM = Number(ARG.from || 2015);
const TO = Number(ARG.to || 2025);
const UA = "Mozilla/5.0 (compatible; fantasy-tools/1.0)";
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

/** Svigatalning — radirnar bera hreidrada hluti, svo regex dugar ekki. */
function sliceBalanced(s, at) {
  let d = 0;
  for (let i = at; i < s.length; i++) {
    if (s[i] === "[") d++;
    else if (s[i] === "]") { d--; if (!d) return s.slice(at, i + 1); }
  }
  return null;
}

async function accuracyFor(year) {
  const url = `https://www.fantasypros.com/nfl/accuracy/draft.php?year=${year}`;
  let html;
  try { html = await (await fetch(url, { headers: { "user-agent": UA } })).text(); }
  catch { return null; }
  const title = (html.match(/<title>\s*(\d{4})\s+Fantasy Football/) || [])[1];
  /* ARID A SIDUNNI VERDUR AD PASSA VID THAD SEM VAR BEDID UM.
     Væri sidan ad hunsa `?year=` og skila alltaf thvi sama myndum vid
     maela SAMA ARID vid sjalft sig og fa fullkomna fylgni — sem vaeri
     truverdug og alrong. */
  if (String(title) !== String(year)) return { year, mismatch: title || null, rows: [] };
  const at = html.indexOf('"rows":[');
  if (at < 0) return { year, rows: [] };
  const json = sliceBalanced(html, at + '"rows":'.length);
  if (!json) return { year, rows: [] };
  let raw;
  try { raw = JSON.parse(json); } catch { return { year, rows: [] }; }
  const rows = raw.map((r) => ({
    id: r.id,
    name: (r.expert && r.expert.label) || null,
    overall: Number(r.rank) || null,
    qb: Number(r.qb) || null, rb: Number(r.rb) || null,
    wr: Number(r.wr) || null, te: Number(r.te) || null,
  })).filter((r) => r.id && r.overall);
  return { year, rows };
}

function spearman(a, b) {
  const R = (x) => {
    const i = x.map((v, k) => [v, k]).sort((p, q) => p[0] - q[0]);
    const o = [];
    let k = 0;
    while (k < i.length) {
      let j = k;
      while (j + 1 < i.length && i[j + 1][0] === i[k][0]) j++;
      const r = (k + j) / 2 + 1;
      for (let t = k; t <= j; t++) o[i[t][1]] = r;
      k = j + 1;
    }
    return o;
  };
  const ra = R(a), rb = R(b), ma = mean(ra), mb = mean(rb);
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < ra.length; i++) {
    const u = ra[i] - ma, v = rb[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : null;
}

async function main() {
  const years = [];
  for (let y = FROM; y <= TO; y++) years.push(y);
  console.log(`saeki nakvaemni FantasyPros ${FROM}-${TO} …`);

  const byYear = {};
  for (const y of years) {
    const got = await accuracyFor(y);
    await new Promise((r) => setTimeout(r, 400));         // vid erum gestir
    if (!got || !got.rows.length) {
      console.log(`  ${y}: ${got && got.mismatch ? `sidan skilaði ${got.mismatch}` : "engar radir"}`);
      continue;
    }
    byYear[y] = got.rows;
    console.log(`  ${y}: ${got.rows.length} serfraedingar`);
  }
  const ys = Object.keys(byYear).map(Number).sort();
  if (ys.length < 3) { console.error("of fa ar — haetti"); process.exit(2); }

  /* ---------- 1. FLYTST RODIN MILLI ARA? ---------- */
  console.log("\n1. flytst rodin milli ara?");
  const pairs = [];
  for (let i = 1; i < ys.length; i++) {
    const a = byYear[ys[i - 1]], b = byYear[ys[i]];
    const mb = new Map(b.map((r) => [r.id, r]));
    const A = [], B = [];
    for (const r of a) { const n = mb.get(r.id); if (n) { A.push(r.overall); B.push(n.overall); } }
    if (A.length < 20) { console.log(`  ${ys[i - 1]}->${ys[i]}: adeins ${A.length} i badum`); continue; }
    const rho = spearman(A, B);
    pairs.push({ from: ys[i - 1], to: ys[i], n: A.length, rho: r3(rho) });
    console.log(`  ${ys[i - 1]}->${ys[i]}  n=${String(A.length).padStart(3)}  rho=${rho.toFixed(3)}`);
  }
  const rhos = pairs.map((p) => p.rho).filter((v) => v != null);
  const avgRho = mean(rhos);
  const negative = rhos.filter((v) => v < 0).length;
  console.log(`  MEDALTAL rho = ${avgRho.toFixed(3)} · ${negative} af ${rhos.length} porum NEIKVAED`);

  /* ---------- 2. TOPP-10 I FYRRA, HVAR I AR? ---------- */
  console.log("\n2. topp-10 i fyrra — hvar lenda their i ar?");
  const followUp = [];
  for (let i = 1; i < ys.length; i++) {
    const a = byYear[ys[i - 1]], b = byYear[ys[i]];
    const mb = new Map(b.map((r) => [r.id, r]));
    const top = a.filter((r) => r.overall <= 10).map((r) => mb.get(r.id)).filter(Boolean);
    if (top.length < 3) continue;
    const pct = mean(top.map((r) => r.overall / b.length * 100));
    followUp.push({ from: ys[i - 1], to: ys[i], survived: top.length, avgPercentile: r3(pct) });
    console.log(`  ${ys[i - 1]} topp-10 -> ${ys[i]}: ${top.length} enn med, ` +
      `medal-hundradshluti ${pct.toFixed(1)}% (50% = hendingu radid)`);
  }
  const avgPct = mean(followUp.map((f) => f.avgPercentile));

  /* ---------- 3. SNIDID INNAN ARSINS ---------- */
  console.log("\n3. fylgjast stodurnar ad innan sama manns?");
  const within = [];
  for (const y of ys) {
    const rows = byYear[y].filter((r) => r.rb && r.wr && r.te && r.qb);
    if (rows.length < 30) continue;
    const rp = {
      "RB/WR": spearman(rows.map((r) => r.rb), rows.map((r) => r.wr)),
      "RB/TE": spearman(rows.map((r) => r.rb), rows.map((r) => r.te)),
      "QB/WR": spearman(rows.map((r) => r.qb), rows.map((r) => r.wr)),
    };
    within.push({ year: y, n: rows.length,
                  ...Object.fromEntries(Object.entries(rp).map(([k, v]) => [k, r3(v)])) });
    console.log(`  ${y} (n=${rows.length})  RB/WR ${rp["RB/WR"].toFixed(2)}  ` +
      `RB/TE ${rp["RB/TE"].toFixed(2)}  QB/WR ${rp["QB/WR"].toFixed(2)}`);
  }

  /* ---------- DOMURINN ---------- */
  console.log(`\n${"=".repeat(72)}`);
  const persistent = avgRho > 0.3 && negative === 0;
  console.log(persistent
    ? "  ROD SERFRAEDINGA FLYTST — ThAD MA TAKA MARK A HENNI."
    : "  ROD SERFRAEDINGA FLYTST EKKI. 'Bestur i fyrra' segir ekkert um naesta ar.");
  console.log(`  medaltal rho = ${avgRho.toFixed(3)} yfir ${rhos.length} arapor` +
    `${negative ? `, thar af ${negative} NEIKVAED` : ""}`);
  if (followUp.length) {
    console.log(`  topp-10 i fyrra lendir ad medaltali i ${avgPct.toFixed(1)}% saeti i ar ` +
      `(50% vaeri hrein hending)`);
  }

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "expert_persistence.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { from: 2015, to: 2025 }, inputs: [], dataDir: OUT }),
    seasons: ys,
    expertsPerYear: Object.fromEntries(ys.map((y) => [y, byYear[y].length])),
    yearPairs: pairs,
    avgRho: r3(avgRho),
    negativePairs: negative,
    topTenFollowUp: followUp,
    avgPercentileOfPriorTopTen: r3(avgPct),
    withinYearPositionAgreement: within,
    persistent,
  }, null, 1));
  console.log(`\n-> data/expert_persistence.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
