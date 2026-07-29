/* ============================================================
   MÍNÚTUÞRÓUN Í RÖÐUNARSKORI — vörður um vog 0,01

   HVAÐ ÞETTA MÆLIR OG HVERS VEGNA ÞAÐ ER SÉR PRÓF:
   appið hafði aðeins ÁRSTÖLUR (`minutes / gamesPlayed`). Sú tala getur
   ekki greint mann sem er að VINNA SÉR SESS frá manni sem er að MISSA
   hann — bæði geta endað í 60 mín/leik. Per-umferðar sagan getur:
     mins_trend = mín/umferð síðustu 2  −  mín/umferð þriggja þar á undan

   NIÐURSTAÐAN ER SKILYRT VIÐ LAUGINA, og það er kjarninn:
     * laug með ÖLLUM leikmönnum (það sem tillögu-vélin raðar í raun)
       -> +0,066 topp-15, jákvætt 5/5 tímabil, t=6,66. LOSO +0,066.
     * laug aðeins þeirra sem SPILUÐU
       -> −0,008, 2/5 tímabil. Ógreinanlegt frá núlli — og það er
          skiljanlegt: hafi maður þegar spilað er þróunin búin að segja
          sitt í mínútunum sjálfum.
   Þess vegna er vogin RÉTTLÆTT en LÍTIL. Þetta próf fellur ef hún
   hættir að skila á raunsæju lauginni EÐA byrjar að skaða hina.

   RAÐIR ERU PER UMFERÐ, EKKI PER LEIKINN LEIK. Bekkjarmaður fær 0 og
   telur með. Fyrri mæling sem sleppti 0-röðum sýndi bekkjarmenn "í
   formi" og gaf ranga hámarks-α — sjá tests/rank-model.mjs.
   ============================================================ */
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPanel, topN } from "./lib/panel2.mjs";
import { RANK_W, rankScore } from "../src/model.js";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log(`\n${"=".repeat(84)}`);
console.log("MÍNÚTUÞRÓUN Í RÖÐUNARSKORI");
console.log("=".repeat(84));

/* ---------- 0. PIPELINE-AFLEIÐSLAN — keyrð á TILBÚNUM live-skrám ----------
   Í forleik er data/live/ TÓM, svo þessi kóði fer fyrst í gang 21. ágúst.
   Ómældur kóði sem kviknar einn morgun er ekki ásættanlegt: hér er
   `computePlayerForm` DREGIÐ ÚR scripts/fetch.mjs (raunverulegur texti,
   ekki eftirlíking) og keyrt á umferðum sem við smíðum sjálf.          */
console.log(`\n${"─".repeat(84)}`);
console.log("PIPELINE-AFLEIÐSLAN (scripts/fetch.mjs -> data/player_form.json)");
console.log("─".repeat(84));
{
  const src = await readFile(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
  const start = src.indexOf("async function computePlayerForm(");
  ok(start > 0, "computePlayerForm finnst í scripts/fetch.mjs");
  const end = src.indexOf("\n}\n", start);
  const decl = src.slice(start, end + 3);

  const dir = await mkdtemp(join(tmpdir(), "pf-"));
  await mkdir(join(dir, "live"), { recursive: true });
  /* 5 umferðir. A missir sessinn, B vinnur hann, C fastur, D aðeins 3 umf. */
  const MINS = { 1: [90, 90, 90,  0,  0],     // A: -90
                 2: [ 0,  0,  0, 90, 90],     // B: +90
                 3: [90, 90, 90, 90, 90],     // C: 0
                 4: [45, 60, 70] };           // D: <4 raðir -> 0
  for (let gw = 1; gw <= 5; gw++) {
    const elements = Object.entries(MINS)
      .filter(([, m]) => m[gw - 1] !== undefined)
      .map(([id, m]) => ({ id: +id, stats: { minutes: m[gw - 1], total_points: 2,
                                             starts: m[gw - 1] >= 45 ? 1 : 0 } }));
    await writeFile(join(dir, "live", `gw${gw}.json`), JSON.stringify({ elements }));
  }

  let written = null;
  const rec = { ok: null, n: 0, note: "" };
  const factory = new Function("existsSync", "readFile", "DATA", "writeJSON", "record", "status",
    `${decl}\nreturn computePlayerForm;`);
  const computePlayerForm = factory(
    existsSync, readFile, dir,
    async (name, obj) => { written = { name, obj }; },
    (n, o, c, note) => { rec.ok = o; rec.n = c; rec.note = note || ""; },
    { updated: "prof" });

  const events = [1, 2, 3, 4, 5].map(id => ({ id, finished: true }));
  const els = [1, 2, 3, 4].map(id => ({ id, element_type: 3 }));
  await computePlayerForm(events, els);

  ok(written?.name === "player_form.json", `skrifar player_form.json (${written?.name})`);
  const pl = written?.obj?.players || {};
  ok(written?.obj?.gws_used === 5, `gws_used = 5 (${written?.obj?.gws_used})`);
  ok(pl[1]?.mins_trend === -90,
    `A (90,90,90,0,0) -> þróun −90: MISSIR sessinn (${pl[1]?.mins_trend})`);
  ok(pl[2]?.mins_trend === 90,
    `B (0,0,0,90,90) -> þróun +90: VINNUR sessinn (${pl[2]?.mins_trend})`);
  ok(pl[3]?.mins_trend === 0,
    `C (90×5) -> þróun 0: fastur maður (${pl[3]?.mins_trend})`);
  ok(pl[4]?.mins_trend === 0 && pl[4]?.gws === 3,
    `D með aðeins 3 umferðir -> þróun 0, ekki ágiskun (${pl[4]?.mins_trend})`);
  ok(pl[1]?.mins5 === 54 && pl[3]?.mins5 === 90,
    `mins5 er PER UMFERÐ (A 54, ekki 90 — 0-raðirnar telja) (${pl[1]?.mins5})`);
  ok(pl[2]?.start_rate5 === 0.4, `start_rate5 rétt fyrir B (0,4 = ${pl[2]?.start_rate5})`);
  /* Sama tala og rankScore fær: A á að raðast UNDIR B, allt annað eins */
  const rA = rankScore({ form: 4, minsPerGame: pl[1].mins5, price: 7, ffdr: 2.6, minsTrend: pl[1].mins_trend });
  const rB = rankScore({ form: 4, minsPerGame: pl[1].mins5, price: 7, ffdr: 2.6, minsTrend: pl[2].mins_trend });
  ok(rB > rA, `pipeline-talan berst rétt í rankScore (B ${rB.toFixed(2)} > A ${rA.toFixed(2)})`);

  /* Forleikur: engar loknar umferðir -> tóm skrá, EKKI hrun */
  written = null;
  await computePlayerForm([{ id: 1, finished: false }], els);
  ok(written?.obj && Object.keys(written.obj.players).length === 0 && rec.ok === true,
    "forleikur (0 loknar umferðir): tóm skrá, skráð í status, ekkert hrun");
  ok(/GW4|preseason/i.test(rec.note), `status-nótan segir hvenær þróunin kviknar ("${rec.note}")`);
}

/* ---------- 1. Formið á skorinu ---------- */
ok(RANK_W.minsTrend > 0,
  `vogin er JÁKVÆÐ (${RANK_W.minsTrend}) — vaxandi sess á að hjálpa, ekki skaða`);
ok(RANK_W.minsTrend < 0.05,
  `vogin er LÍTIL (<0,05) — mælt fall varð yfir 0,015 (sjá töflu neðar)`);

const base = { form: 4, minsPerGame: 70, price: 7.5, ffdr: 2.6 };
ok(rankScore({ ...base }) === rankScore({ ...base, minsTrend: 0 }),
  "vantandi þróun == þróun 0: gamla hegðunin er ÓBREYTT (preseason, <4 umferðir)");
ok(rankScore({ ...base, minsTrend: 30 }) > rankScore({ ...base, minsTrend: -30 }),
  "vaxandi sess raðast OFAR rýrnandi sessi, allt annað eins");
ok(rankScore({ ...base, minsTrend: NaN }) === rankScore({ ...base }) &&
   rankScore({ ...base, minsTrend: null }) === rankScore({ ...base }),
  "rusl-gildi (NaN/null) hrynja í 0, ekki í NaN-skor");
ok(Number.isFinite(rankScore({ ...base, minsTrend: 1e9 })) &&
   rankScore({ ...base, minsTrend: 1e9 }) === rankScore({ ...base, minsTrend: 90 }),
  "þróun er klemmd við ±90 — engin leið að einn reitur gleypi skorið");

/* ---------- 2. Mælt fall á báðum laugum ---------- */
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const scoreOf = (r, beta) =>
  rankScore({ form: r.ppg5, minsPerGame: r.mins5, price: r.price, ffdr: r.ffdr })
  + beta * r.minsTrend;

const res = {};
for (const blanks of [false, true]) {
  const rows = buildPanel({ includeBlanks: blanks });
  const S = [...new Set(rows.map(r => r.season))].sort();
  const nm = blanks ? "raunsæ (allir)" : "aðeins spiluðu";
  console.log(`\n${"─".repeat(84)}`);
  console.log(`LAUG: ${nm} — ${rows.length} raðir · ${S.length} tímabil`);
  console.log("─".repeat(84));
  console.log("  vog      " + S.map(s => s.padStart(7)).join("") + "    meðal    jákv.");
  const tbl = {};
  for (const beta of [0.005, 0.01, 0.015]) {
    const g = S.map(s => {
      const R = rows.filter(r => r.season === s);
      return topN(R, R.map(r => scoreOf(r, beta)), 15).got
           - topN(R, R.map(r => scoreOf(r, 0)), 15).got;
    });
    const m = mean(g), pos = g.filter(x => x > 0).length;
    tbl[beta] = { m, pos, n: S.length };
    const mark = beta === RANK_W.minsTrend ? "  <- útfært" : "";
    console.log(`  ${String(beta).padEnd(9)}` +
      g.map(x => ((x >= 0 ? "+" : "") + x.toFixed(2)).padStart(7)).join("") +
      `   ${(m >= 0 ? "+" : "") + m.toFixed(3)}    ${pos}/${S.length}${mark}`);
  }
  res[blanks ? "real" : "played"] = tbl;
}

const R = res.real[RANK_W.minsTrend], P = res.played[RANK_W.minsTrend];
console.log(`\n${"─".repeat(84)}`);
ok(R, `útfærða vogin (${RANK_W.minsTrend}) er ein þeirra sem prófið mælir`);
if (R) {
  ok(R.m > 0.03,
    `raunsæ laug: fall ${R.m >= 0 ? "+" : ""}${R.m.toFixed(3)} topp-15 (>0,03) — mælt +0,066`);
  ok(R.pos >= R.n - 1,
    `raunsæ laug: jákvætt í ${R.pos}/${R.n} tímabilum (mælt 5/5) — merki, ekki eitt heppið ár`);
}
if (P) {
  ok(Math.abs(P.m) < 0.05,
    `spiluðu-laug: áhrif ${P.m >= 0 ? "+" : ""}${P.m.toFixed(3)} innan hávaða (|x|<0,05) — SKAÐAR ekki`);
}

/* ---------- 3. Það sem var MÆLT ÚT, ekki með ---------- */
console.log(`\n  Mælt og SLEPPT: full90 + start_rate5 gáfu −0,018 (báðar laugar) —`);
console.log(`  þau bera sömu upplýsingar og mins5 og bæta hávaða. Ekki setja inn`);
console.log(`  aftur án nýrrar mælingar.`);

console.log(`\nMÍNÚTUÞRÓUN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
