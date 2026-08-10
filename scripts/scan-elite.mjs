/* scan-elite.mjs — byggir sérfraedinga-hopinn (`data/pros.json`).

   HANDVIRK SKRIFTA, EKKI HLUTI AF DAGLEGU PIPELINE. Keyrd EINU SINNI a
   sumri, adur en timabilid hefst. Sama flokkun og `fetch-bsd.mjs`:
   nidurstadan er committud og notud allt timabilid.

     node scripts/scan-elite.mjs                 # 1 .. 2.000.000
     node scripts/scan-elite.mjs --to 500000     # styttra prof
     node scripts/scan-elite.mjs --from 1 --to 2000000 --conc 18

   ---------------------------------------------------------------------------
   HVERS VEGNA SKONNUN A ID-BILI OG EKKI EITTHVAD SNJALLARA:
   FPL birtir ENGA sogulega stigatoflu. `leagues-classic/314` ("Overall")
   skilar ADEINS yfirstandandi timabili og er tom i forleik. Thad er thvi
   ENGIN endapunktur sem segir "hverjir voru bestir i fyrra".
   `entry/{id}/history/` er eina leidin — hun gefur ALLAN feril hvers lids.
   Lid-id eru uthlutud i SKRANINGARROD hvert timabil, og their sem skra sig
   fyrsta daginn eru yfirgnaefandi hardkjarna-spilarar: thettleiki
   sérfraedinga fellur eins og ~1/id. Thess vegna borgar sig ad skanna
   laegstu id-in fyrst — fyrstu 40.000 gafu 46% hittni, 1,3 milljon gafu 6%.

   THEKJAN VERDUR ALDREI FULL og thad er RETT ad segja thad upphatt:
   stjornandi sem haetti ad spila a ekkert 2026/27-lid og er OSYNILEGUR
   ur thessari adferd, sama hversu breitt er skannad.

   HRADI: maelt 9.8.2026 gegn FPL-API-inu — 18 samtimis koll gafu 115/s og
   NULL villur a 1,3 milljon kollum (1.763 x HTTP 429, oll leyst med bakhoppi).
   32 samtimis gafu 3,2% 429 strax. Ekki haekka `--conc` an maelingar.       */

import { mkdir, writeFile } from "node:fs/promises";
import { recencyScore, PANEL_SIZE, MIN_SEASONS, SEASON_SIZE } from "../src/pros.js";

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > -1 && process.argv[i + 1] ? +process.argv[i + 1] : d;
};
const FROM = arg("--from", 1);
const TO   = arg("--to", 2000000);
const CONC = arg("--conc", 18);
const OUT  = "data/pros.json";
const FPL  = "https://fantasy.premierleague.com/api";

/* Adeins thau lid sem geta mögulega komist i hopinn eru geymd i minni —
   annars vaeru thetta 2 milljon hlutir. Vid höldum RUMLEGA hopnum (x8) svo
   haegt se ad skoda mörkin eftir a an thess ad skanna aftur.               */
const KEEP = PANEL_SIZE * 8;

const stat = { done: 0, hit: 0, err: 0, r429: 0, t0: Date.now() };
let best = [];          // haldid rodudu, laegsta skor fyrst

async function getHistory(id) {
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(`${FPL}/entry/${id}/history/`,
                            { headers: { "User-Agent": "Mozilla/5.0" },
                              signal: AbortSignal.timeout(25000) });
      if (r.status === 404) return null;                 // lid er ekki til
      if (r.status === 429) { stat.r429++; await sleep(2000 * (a + 1)); continue; }
      if (!r.ok) { await sleep(700 * (a + 1)); continue; }
      return await r.json();
    } catch { await sleep(700 * (a + 1)); }
  }
  stat.err++;
  return null;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function offer(rec) {
  /* Innskot i rodadan lista. O(KEEP) i versta falli en keyrir sjaldan —
     adeins thegar lid er betra en thad versta sem vid höldum.              */
  if (best.length >= KEEP && rec.score >= best[best.length - 1].score) return;
  let lo = 0, hi = best.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (best[m].score < rec.score) lo = m + 1; else hi = m; }
  best.splice(lo, 0, rec);
  if (best.length > KEEP) best.length = KEEP;
}

async function worker(ids) {
  for (const id of ids) {
    const h = await getHistory(id);
    stat.done++;
    if (!h || !Array.isArray(h.past)) continue;
    const s = recencyScore(h.past);
    if (!s) continue;
    stat.hit++;
    offer({ id, score: +s.score.toFixed(4), seasons: s.seasons, best: s.best, t1: s.t1 });
  }
}

/* OKUNN TIMABIL — VILLAN SEM HEFDI FUNDIST FYRST SUMARID 2027.
   `recencyScore` sleppir timabili sem er ekki i SEASON_SIZE (rett: vid
   giskum ekki a staerd sem vid hofum ekki maelt). En AFLEIDINGIN er throgul:
   thegar hopurinn er endurbyggdur naesta sumar er 2026/27 nyjasta timabilid
   OG THAD THYNGST VEGID (h=3) — og thad hefdi einfaldlega horfid. Stjornandi
   sem endadi i 150. saeti hefdi verid skorad eins og hans besta vaeri
   700.000. Enginn hefdi tekid eftir; skorin hefdu bara verid vitlaus.

   Thess vegna er PROBE-FASI: vid saekjum lítið urtak fyrst og deyjum
   STRAX ef timabil finnst sem vid hofum enga maelda staerd fyrir. Betra er
   ad falla a 200 kollum en ad skrifa rangan hop eftir fimm klukkustundir. */
async function probeSeasons(sampleIds) {
  const seen = new Set();
  for (const id of sampleIds) {
    const h = await getHistory(id);
    for (const p of (h?.past || [])) if (p?.season_name) seen.add(p.season_name);
  }
  const unknown = [...seen].filter(s => !SEASON_SIZE[s]).sort();
  return { seen, unknown };
}

async function main() {
  const total = TO - FROM + 1;
  console.log(`scan-elite: ${FROM.toLocaleString()} .. ${TO.toLocaleString()} `
              + `(${total.toLocaleString()} entries), ${CONC} concurrent`);
  console.log(`seasons with a measured size: ${Object.keys(SEASON_SIZE).length}, `
              + `minimum ${MIN_SEASONS} seasons per entry`);

  /* Probe a thettasta svaedinu (laeg id = flest timabil per lid). */
  const sample = Array.from({ length: 40 }, (_, k) => FROM + k * 7);
  const { seen, unknown } = await probeSeasons(sample);
  console.log(`probe: ${sample.length} entries, ${seen.size} distinct seasons seen`);
  if (unknown.length) {
    console.error(`ABORT: no measured size for season(s): ${unknown.join(", ")}`);
    console.error("SEASON_SIZE in src/pros.js must be extended before rebuilding the panel.");
    console.error("Measure it by grid-fitting `rank` against the published `rank_percentage`");
    console.error("(round(100*rank/T) must reproduce the printed value; see the comment there).");
    console.error("Without it the season is DROPPED SILENTLY - and it is the heaviest weighted one.");
    process.exit(3);
  }

  const timer = setInterval(() => {
    const el = (Date.now() - stat.t0) / 1000;
    console.log(`[${(el / 60).toFixed(1)}m] ${stat.done.toLocaleString()}/${total.toLocaleString()}`
      + ` · scored ${stat.hit.toLocaleString()} · ${(stat.done / el).toFixed(0)}/s`
      + ` · 429 ${stat.r429} · errors ${stat.err}`);
  }, 60000);

  /* Bilinu skipt i CONC rasir sem taka til skiptis — thannig dreifist
     thettleikinn (laeg id eru thyngri) jafnt a rasirnar.                   */
  const lanes = Array.from({ length: CONC }, (_, k) => {
    const ids = [];
    for (let id = FROM + k; id <= TO; id += CONC) ids.push(id);
    return ids;
  });
  await Promise.all(lanes.map(worker));
  clearInterval(timer);

  const panel = best.slice(0, PANEL_SIZE);
  if (panel.length < PANEL_SIZE) {
    /* TOM EDA HALFKLARUD KEYRSLA MA ALDREI SKRIFA YFIR GODAN HOP (8e). */
    console.error(`ABORT: only ${panel.length} entries scored — NOT writing ${OUT}`);
    process.exit(2);
  }
  await mkdir("data", { recursive: true });
  await writeFile(OUT, JSON.stringify({
    built: new Date().toISOString().slice(0, 10),
    season: "2026/27",
    method: "recency-weighted mean log10(finishing percentile), half-life 1.5 seasons",
    scanned: stat.done, candidates: stat.hit, n: panel.length,
    range: [FROM, TO],
    panel,
  }));
  const el = (Date.now() - stat.t0) / 1000;
  console.log(`\nOK: ${stat.hit.toLocaleString()} entries scored, panel ${panel.length}`
    + ` · score ${panel[0].score}% .. ${panel[panel.length - 1].score}%`
    + ` · ${(el / 60).toFixed(1)} min · errors ${stat.err}`);
}

main().catch(e => { console.error(e); process.exit(1); });
