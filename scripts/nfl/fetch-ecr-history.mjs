#!/usr/bin/env node
/* ============================================================
   fetch-ecr-history.mjs — SOGULEG SERFRAEDINGA-SAMSTEYPA.

     node scripts/nfl/fetch-ecr-history.mjs

   -> data-nfl/ecr_history.json

   DynastyProcess speglar FantasyPros-radningar og geymir hverja
   skrapun med dagsetningu — 1,5 milljon radir, 2019-2025. Ur thvi
   ma draga **forleiks-samsteypuna fyrir hvert ar**, sem er eina
   leidin til ad maela SERFRAEDINGA (ekki bara ADP) yfir morg timabil.

   TVAER SIUR OG BADAR ERU NAUDSYNLEGAR:

   1. `ecr_type` = `rp` (redraft PPR) eda `ro` (redraft standard).
      Skrain ber lika dynasty (`dp`/`do`), best ball (`bp`/`bo`),
      superflex og vikulegar radningar. Ad blanda theim vaeri ad
      maela adra spurningu — dynasty-rod er VILJANDI onnur en
      redraft-rod og vaeri "rong" gegn einu timabili an thess ad
      serfraedingurinn hefdi haft rangt fyrir ser.

   2. DAGSETNINGIN VERDUR AD VERA FYRIR FYRSTA LEIK. Fyrsta utgafan
      leyfdi fram til 8. september og valdi tha 2023-skrapun fra
      **2023-09-08** — deginum EFTIR ad timabilid hofst. Su radning
      gat borid upplysingar ur viku 1 og hefdi gert serfraedingana
      betri en their voru. Nu er hardur threskuldur 3. september;
      NFL hefur aldrei hafist fyrr en 4.
   ============================================================ */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getBuf, record } from "./lib/http.mjs";
import { rows as csvRows } from "./lib/csv.mjs";
import { normPos } from "../../src-nfl/scoring.js";
import { normTeam } from "../../src-nfl/names.js";

const OUT = path.resolve(process.cwd(), "data-nfl");
const SRC = "https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_fpecr.csv.gz";

/** Hardur threskuldur: NFL hefst aldrei fyrr en 4. september. */
const CUTOFF_MONTH = 9, CUTOFF_DAY = 3;

async function main() {
  console.log("saeki db_fpecr (~100 MB afthjappad) …");
  const buf = await getBuf(SRC, { timeout: 300_000 });
  const txt = buf.toString("utf8");
  console.log(`  ${(txt.length / 1e6).toFixed(0)} MB`);

  /* LINU-SKONNUN, EKKI HEILDAR-THATTUN.
     Fyrsta utgafan kalladi `csvRows(txt)` og byggdi fylki med 1,5
     milljon rodum × 24 strengjum. Node sprakk a minni (heap OOM).
     Skrain er hins vegar 99,9% radir sem vid viljum EKKI: adeins tvaer
     af fjortan `ecr_type`-tegundum og adeins nokkrir dagar af hverju
     ari. Vid siium thvi a HRARRI LINU adur en nokkud er thattad —
     odyr regluleg segd fellir ~1,49 milljon radir, og adeins
     eftirstodvarnar fara i gegnum CSV-thattarann.

     `ecr_type` og `scrape_date` eru TVEIR SIDUSTU dalkarnir, svo
     endinn a linunni dugir til ad sia. Nafnadalkurinn getur borid
     kommu innan gaesalappa — thess vegna er thattarinn samt notadur
     a thaer linur sem lifa. */
  const lineIter = function* (s) {
    let i = 0;
    while (i < s.length) {
      let j = s.indexOf("\n", i);
      if (j < 0) j = s.length;
      yield s.slice(i, j);
      i = j + 1;
    }
  };

  const header = txt.slice(0, txt.indexOf("\n"));
  const col = Object.fromEntries(csvRows(header)[0].map((h, i) => [h, i]));
  for (const c of ["player", "pos", "ecr", "ecr_type", "scrape_date"]) {
    if (col[c] == null) throw new Error(`dalk vantar: ${c}`);
  }

  const KEEP = /,(rp|ro),(\d{4})-(08|09)-(\d{2})\r?$/;
  const kept = [];
  const latest = new Map();
  let scanned = 0;
  for (const line of lineIter(txt)) {
    scanned++;
    const m = KEEP.exec(line);
    if (!m) continue;
    const [, t, yr, mo, day] = m;
    if (!(mo === "08" || (Number(mo) === CUTOFF_MONTH && Number(day) <= CUTOFF_DAY))) continue;
    const d = `${yr}-${mo}-${day}`;
    const k = `${yr}|${t}`;
    if (!latest.has(k) || d > latest.get(k)) latest.set(k, d);
    kept.push([k, d, line]);
  }
  console.log(`  skannadar ${scanned} linur, ${kept.length} i forleiks-glugga`);

  const out = {};
  for (const [k, d, line] of kept) {
    if (latest.get(k) !== d) continue;
    const r = csvRows(line)[0];
    if (!r) continue;
    const t = r[col.ecr_type];
    const ecr = numOr(r[col.ecr]);
    if (ecr == null) continue;
    const pos = normPos(r[col.pos]);
    if (!["QB", "RB", "WR", "TE"].includes(pos)) continue;
    (out[k] = out[k] || { scrapeDate: d, players: [] }).players.push({
      name: r[col.player], pos,
      team: normTeam(r[col.tm] ?? r[col.team]),
      ecr, sd: numOr(r[col.sd]),
      best: numOr(r[col.best]), worst: numOr(r[col.worst]),
    });
  }

  /* Skrapun med of faum leikmonnum er ekki nothaef samsteypa. */
  for (const k of Object.keys(out)) {
    if (out[k].players.length < 120) { delete out[k]; continue; }
    out[k].players.sort((a, b) => a.ecr - b.ecr);
  }

  const keys = Object.keys(out).sort();
  for (const k of keys) {
    console.log(`  ${k}  ${out[k].scrapeDate}  ${out[k].players.length} leikmenn`);
  }
  record("ecr_history", keys.length >= 8,
    `${keys.length} preseason consensus sets, ${keys[0]}..${keys.at(-1)}`);

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "ecr_history.json"),
    JSON.stringify({ generated: new Date().toISOString(), cutoff: "Sep 3", sets: out }));
  console.log("-> data-nfl/ecr_history.json");
}

const numOr = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "NA") return null;
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
};

main().catch((e) => { console.error(e); process.exit(1); });
