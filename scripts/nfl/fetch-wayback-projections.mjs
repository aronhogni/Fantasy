#!/usr/bin/env node
/* ============================================================
   fetch-wayback-projections.mjs — HREINAR SOGULEGAR SPAR.

     node scripts/nfl/fetch-wayback-projections.mjs

   -> data-nfl/wayback_projections.json
   -> data-nfl/projector_sites.json

   VANDAMALID SEM THETTA LEYSIR: allar spa-heimildir sem vid hofum
   fundid geyma UPPFAERD gogn fyrir lidin ar. Sleeper var mengud
   2018-2020, ESPN-ADP oll arin, MyFantasyLeague oll arin. Hlidin
   grípa thau, en eftir stendur ad A-Ranking hvilir a adeins fimm
   timabilum.

   LAUSNIN ER TIMASTIMPILLINN SJALFUR. Internet Archive geymir
   sidurnar EINS OG THAER VORU a tilteknum degi. Snapshot fra
   26. agust 2015 GETUR EKKI borid upplysingar ur timabilinu 2015 —
   thad var ekki byrjad. Thad er ekki hlid sem maelir mengun heldur
   sonnun sem utilokar hana.

   FANTASYPROS-SPA-SIDURNAR bera tvennt sem vid viljum:
     `id="data"`     stiga-spa per leikmann (samsteypa)
     `id="experts"`  HVADA FYRIRTAEKI logdu til, med birtingardegi

   Sidara svarar spurningunni "hverjir eru spamennirnir" beint — thad
   er skra yfir ithekjuna, ekki agiskun um hana.

   HRADATAKMORKUN: Internet Archive svarar 429 vid of morgum kollum.
   Beðid er 3 sekundur milli kalla og reynt aftur vid 429. Thad gerir
   keyrsluna haega (~8 min) og hun er thvi HANDVIRK, ekki i cron —
   gogn fra 2015 breytast ekki.
   ============================================================ */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { record } from "./lib/http.mjs";
import { normPos } from "../../src-nfl/scoring.js";

const OUT = path.resolve(process.cwd(), "data-nfl");
const YEARS = [];
for (let y = 2015; y <= 2025; y++) YEARS.push(y);
const POS = ["qb", "rb", "wr", "te"];

/* Snapshot verdur ad vera FYRIR fyrsta leik. NFL hefst i fyrsta lagi
   4. september, svo 1. september er hart thak med borð fyrir vikmork. */
const CUTOFF = (y) => new Date(`${y}-09-01T00:00:00Z`);
const TARGET = (y) => `${y}0825`;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Saekir med endurtilraun vid 429/5xx. */
async function get(url, { tries = 4, wait = 3000 } = {}) {
  for (let i = 0; i < tries; i++) {
    if (i) await sleep(wait * (i + 1));
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) continue;
      if (!res.ok) return null;
      return await res.text();
    } catch { /* reynt aftur */ }
  }
  return null;
}

async function main() {
  const projections = {};   // `${year}` -> [{ name, pos, fpts }]
  const sites = {};         // `${year}` -> [{ site, published }]

  for (const y of YEARS) {
    const byPlayer = [];
    const bySite = new Map();
    for (const pos of POS) {
      const page = `fantasypros.com/nfl/projections/${pos}.php`;
      /* 1. finna snapshot */
      const availTxt = await get(
        `http://archive.org/wayback/available?url=${page}&timestamp=${TARGET(y)}`);
      await sleep(3000);
      let snap = null;
      try {
        const a = JSON.parse(availTxt || "{}");
        snap = a.archived_snapshots && a.archived_snapshots.closest;
      } catch { /* ekkert */ }
      if (!snap || !snap.timestamp) {
        record(`wayback_${y}_${pos}`, false, "no snapshot");
        continue;
      }
      const ts = snap.timestamp;                        // YYYYMMDDhhmmss
      const when = new Date(`${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T00:00:00Z`);

      /* 2. THRJU SKILYRDI, OG THAU ERU OLL NAUDSYNLEG.

         (a) RETT AR. Wayback skilar NAESTA snapshot vid umbeðinn
             tima, ekki snapshot innan arsins. Fyrsta utgafan bad um
             `20170825` og fekk **20160406** — apríl-mynd fra 2016 —
             og skrifadi hana sem "2017-spa". Bædi 2016 og 2017 fengu
             SOMU myndina. Thad er ekki mengun heldur RONG ARSMERKING,
             sem er verri: talan er rett fyrir annad ar.

         (b) EKKI EFTIR 1. SEPT. Mynd fra 12. september ber
             viku-1 upplysingar.

         (c) EKKI FYRIR 1. JULI. Mynd fra apríl er hrein en URELT —
             hun er tekin fyrir sumarid, adur en meidsli, skipti og
             thjalfunarbudir hafa gerst. Hun er ekki su spa sem nokkur
             draftadi eftir. */
      const snapYear = Number(ts.slice(0, 4));
      const early = new Date(`${y}-07-01T00:00:00Z`);
      if (snapYear !== y) {
        record(`wayback_${y}_${pos}`, false,
          `snapshot is from ${snapYear}, not ${y} — rejected (wrong year)`);
        await sleep(1500);
        continue;
      }
      if (when >= CUTOFF(y) || when < early) {
        record(`wayback_${y}_${pos}`, false,
          `snapshot ${ts.slice(0, 8)} is outside Jul 1 – Aug 31 — rejected`);
        await sleep(1500);
        continue;
      }

      const html = await get(snap.url.replace(/^http:/, "https:"));
      await sleep(3000);
      if (!html) { record(`wayback_${y}_${pos}`, false, "fetch failed"); continue; }

      const rows = parseProjections(html, normPos(pos.toUpperCase()));
      for (const r of rows) byPlayer.push(r);
      for (const s of parseSites(html)) {
        if (!bySite.has(s.site)) bySite.set(s.site, s);
      }
      record(`wayback_${y}_${pos}`, rows.length > 20,
        `${ts.slice(0, 8)} — ${rows.length} players, ${bySite.size} sites so far`);
    }
    if (byPlayer.length > 80) {
      projections[y] = byPlayer;
      sites[y] = [...bySite.values()];
    }
  }

  const totalRows = Object.values(projections).reduce((a, v) => a + v.length, 0);
  const allSites = new Map();
  for (const [y, list] of Object.entries(sites)) {
    for (const s of list) {
      const cur = allSites.get(s.site) || { site: s.site, years: [] };
      cur.years.push(Number(y));
      allSites.set(s.site, cur);
    }
  }
  record("wayback_projections", Object.keys(projections).length >= 6,
    `${Object.keys(projections).length} seasons, ${totalRows} player rows, ` +
    `${allSites.size} distinct projection sites`);

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "wayback_projections.json"), JSON.stringify({
    generated: new Date().toISOString(),
    source: "FantasyPros consensus projections via Internet Archive",
    guarantee: "every snapshot timestamp is before September 1 of its season",
    seasons: Object.keys(projections).map(Number),
    projections,
  }));
  await writeFile(path.join(OUT, "projector_sites.json"), JSON.stringify({
    generated: new Date().toISOString(),
    note: "Companies whose projections FantasyPros aggregated, by season, " +
          "read off the archived pages themselves.",
    byYear: sites,
    all: [...allSites.values()].sort((a, b) => b.years.length - a.years.length),
  }, null, 1));

  console.log(`\n-> ${Object.keys(projections).length} timabil, ${totalRows} radir`);
  console.log(`-> ${allSites.size} spa-fyrirtaeki skrad`);
  for (const s of [...allSites.values()].sort((a, b) => b.years.length - a.years.length).slice(0, 20)) {
    console.log(`   ${String(s.years.length).padStart(2)} ar  ${s.site}`);
  }
}

/* ---------- thattarar ---------- */

/** Leikmanna-tafla: `id="data"`, sidasti dalkur er FPTS. */
function parseProjections(html, pos) {
  const i = html.indexOf('id="data"');
  if (i < 0) return [];
  const end = html.indexOf("</table>", i);
  const table = html.slice(i, end);
  const out = [];
  for (const m of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
      .map((c) => strip(c[1]));
    if (cells.length < 3) continue;
    const name = cleanName(cells[0]);
    if (!name || /^player$/i.test(name)) continue;
    const fpts = num(cells[cells.length - 1]);
    if (fpts == null || fpts <= 0) continue;
    out.push({ name, pos, fpts });
  }
  return out;
}

/** Fyrirtaekja-tafla: `id="experts"`, dalkar Expert | Site | Published. */
function parseSites(html) {
  const i = html.indexOf('id="experts"');
  if (i < 0) return [];
  const end = html.indexOf("</table>", i);
  const table = html.slice(i, end);
  const out = [];
  for (const m of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
      .map((c) => strip(c[1]));
    if (cells.length < 3) continue;
    const site = cells[cells.length - 2];
    const published = cells[cells.length - 1];
    if (!site || /^site$/i.test(site) || !/\d/.test(published)) continue;
    out.push({ site, published });
  }
  return out;
}

const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** "Andrew Luck IND" -> "Andrew Luck" (lid haengir aftan a i toflunni). */
function cleanName(s) {
  const t = strip(s).replace(/\([^)]*\)/g, "").trim();
  const m = t.match(/^(.*?)\s+[A-Z]{2,3}$/);
  return (m ? m[1] : t).trim();
}

const num = (v) => {
  const x = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(x) ? x : null;
};

main().catch((e) => { console.error(e); process.exit(1); });
