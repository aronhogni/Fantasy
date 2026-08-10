#!/usr/bin/env node
/* ============================================================
   superflex-lab.mjs — HVERJIR FYLLA SUPERFLEX-SAETID I RAUN?

     node scripts/superflex-lab.mjs [--teams=12] [--scoring=ppr]

   -> data/superflex_split.json

   VILLAN SEM THETTA LAGAR. `replacementRanks` dreifdi FLEX-saetum a
   stodurnar eftir MAELDU hlutfalli (FLEX_SPLIT) en hunsadi SUPERFLEX
   alveg. I superflex-deild var QB-threpid thvi reiknad sem QB12 —
   nakvaemlega sama tala og i venjulegri deild — thott naerri TVOFALT
   fleiri leikstjornendur byrji. Leikmenn i theirri stodu voru thar med
   VANMETNIR i einu af theim sniðum sem appid bydur upp a.

   AÐFERDIN ER SU SAMA OG VAR NOTUD A FLEX_SPLIT og hun er ekki
   agiskun: fyrir hverja viku eru fost saeti fyllt (QB, RB, RB, WR, WR,
   WR, TE fyrir hvert lid), og sidan er talid HVADA STODU sa fyllir sem
   endar i superflex-saetinu. Hlutfollin eru talin yfir oll ar.

   AD GISKA A "QB fyllir thad naestum alltaf" vaeri sennilega naerri
   lagi — en omaeld tala sem litur ut eins og maeling er versta
   utkoman, og hun myndi sitja i `model.js` vid hlidina a maeldum
   tolum og lita eins ut.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { stamp } from "./lib/provenance.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const TEAMS = Number(ARG.teams || 12);
const SCORING = String(ARG.scoring || "ppr");
const FIXED = { QB: 1, RB: 2, WR: 3, TE: 1 };
const r3 = (x) => Math.round(x * 1000) / 1000;

async function main() {
  const years = [];
  for (let y = 2019; y <= 2025; y++) years.push(y);

  const fill = { QB: 0, RB: 0, WR: 0, TE: 0 };
  /* Vid teljum LIKA hvar i sinni stodu sa madur stendur, thvi thad er
     talan sem `replacementRanks` tharf: hve djupt threpid faerist. */
  const depth = { QB: [], RB: [], WR: [], TE: [] };
  let weeks = 0;

  for (const y of years) {
    let weekly;
    try { weekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8")); }
    catch { continue; }
    const byWeek = new Map();
    for (const w of weekly) {
      if (!["QB", "RB", "WR", "TE"].includes(w.pos)) continue;
      if (w.week > 18) continue;
      (byWeek.get(w.week) || byWeek.set(w.week, []).get(w.week))
        .push({ pos: w.pos, pts: SCORING === "ppr" ? w.ppr : w.std });
    }
    for (const [, list] of byWeek) {
      weeks++;
      const byPos = { QB: [], RB: [], WR: [], TE: [] };
      for (const p of list) byPos[p.pos].push(p.pts);
      for (const k in byPos) byPos[k].sort((a, b) => b - a);

      /* Fost saeti tekin af toppnum; afgangurinn keppir um superflex. */
      const rest = [];
      for (const [pos, n] of Object.entries(FIXED)) {
        const used = n * TEAMS;
        for (let i = used; i < byPos[pos].length; i++) {
          rest.push({ pos, pts: byPos[pos][i], rankInPos: i + 1 });
        }
      }
      rest.sort((a, b) => b.pts - a.pts);
      /* Eitt superflex-saeti per lid. */
      for (const p of rest.slice(0, TEAMS)) {
        fill[p.pos]++;
        depth[p.pos].push(p.rankInPos);
      }
    }
  }

  const total = Object.values(fill).reduce((a, b) => a + b, 0);
  const split = Object.fromEntries(Object.entries(fill).map(([k, v]) => [k, r3(v / total)]));
  console.log(`${weeks} vikur · ${total} superflex-saeti fyllt (${TEAMS} lid, ${SCORING})\n`);
  console.log("  stada  hlutfall  fjoldi  dypsta saeti sem komst inn (mid)");
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    const d = depth[pos].slice().sort((a, b) => a - b);
    console.log(`  ${pos.padEnd(6)} ${String((split[pos] * 100).toFixed(1) + "%").padStart(7)}  ` +
      `${String(fill[pos]).padStart(6)}  ${d.length ? d[d.length >> 1] : "—"}`);
  }

  /* Talan sem `replacementRanks` tharf: hve morgum saetum dypra fer
     threpid a hverri stodu i superflex-deild. */
  const shift = Object.fromEntries(Object.entries(split)
    .map(([k, v]) => [k, Math.round(v * TEAMS)]));
  console.log(`\n  threp faerist (${TEAMS}-lida deild): ` +
    Object.entries(shift).map(([k, v]) => `${k} +${v}`).join(" · "));
  console.log(`  -> QB-threp fer ur ${TEAMS} i ${TEAMS + shift.QB}`);

  await writeFile(path.join(OUT, "superflex_split.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { teams: 12, scoring: "ppr" }, inputs: [], dataDir: OUT }),
    teams: TEAMS, scoring: SCORING, seasons: years, weeks, filled: total,
    split, shift,
    medianDepth: Object.fromEntries(Object.entries(depth).map(([k, v]) => {
      const d = v.slice().sort((a, b) => a - b);
      return [k, d.length ? d[d.length >> 1] : null];
    })),
  }, null, 1));
  console.log("\n-> data/superflex_split.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
