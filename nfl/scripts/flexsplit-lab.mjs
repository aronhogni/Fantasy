#!/usr/bin/env node
/* ============================================================
   flexsplit-lab.mjs — HREYFIST BORDID?

     node scripts/flexsplit-lab.mjs

   -> data/measure/flexsplit.json

   SPURNINGIN. `replacementRanks` (`src/model.js`) HAFDI TVAER
   skjaladar villur sem voru VILJANDI ekki lagfaerdar (README 4b) —
   thangad til thessi maeling var gerd 14.8.2026:

     (a) flex-saetum er uthlutad med `Math.round` PER STODU, svo thau
         summast ekki: 10-lida 2FLEX fær 21 saeti fyrir 20, 14-lida
         2FLEX fær 27 fyrir 28.
     (b) `league.flexPos` er hunsad — `FLEX_SPLIT` er hardkodad
         RB/WR/TE.

   Rokin fyrir ad lata thaer standa voru ad hvor um sig hreyfir
   varamanns-threpid og thar med hverja maelingu sem
   `data/shapes_*.json` og `data/measure/half.json` bera. Thad var
   RETT ahyggja — en hun var OMAELD, og omaeld ahyggja er sama tegund
   af tolu og omaeld vog: hun getur verid bædi stor og lítil og
   ekkert i skjalinu greindi thar a milli.

   ÞETTA MAELIR HANA — OG ÞAD ER ASTAEDAN TIL AD LAGFAERINGIN VAR GERD.
   Skriftan ber SENDA kodann (`src/model.js`, Hamilton + `flexPos`
   virt) vid GOMLU hegdunina, sem er geymd i `lib/flexsplit-legacy.mjs`
   nakvaemlega thess vegna. Gamla hegdunin er settuð inn i stad
   `replacementRanks` gegnum PATCHAD AFRIT af `src/model.js` og
   `src/build.js`, svo BADAR leidirnar keyri **appleidina**
   (`buildRows`) — ekki hlidarutfaerslu af VBD. Afritin eru bygg med
   textaskiptum ur upprunanum i hverri keyrslu; their geta thvi ekki
   rekid fra honum.

   ATT SNYST VID I OLLUM TOLUM: `*Now` er SENDI (retti) kodinn og
   `*Legacy` er su hegdun sem VAR. `shift` er thvi
   `legacy - shipped` — hvert gamla bordid setti manninn, malid fra
   thvi sem er rett i dag.

   MAELIKVARDARNIR eru their sem akvordunin snyst um:
     · Spearman rho milli bordanna (`aRank`)
     · hve margir af topp 50 haggast, og hve mikid
     · hamarks-hnik i topp 12 / 24 / 50 / 100
     · varamanns-threpin sjalf, per logun

   LAUGIN ER DAGSETT. `data/players.json` er endurskrifud DAGLEGA af
   pipelinunni, svo hver tala hér er DAEMI MED DAGSETNINGU OG HARNESS,
   ekki fasti — sama regla og README 4b skrifar um sinar fjorar tolur.
   Þess vegna er `poolSha`/`generated` i skranni og thess vegna ver
   profid INVARIANT (summan) og ekki toluna.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { replacementRanks } from "../src/model.js";
import { replacementRanksLegacy } from "./lib/flexsplit-legacy.mjs";
import { spearman } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DATA = path.join(ROOT, "data");
const TMP = path.join(ROOT, ".cache-nfl", "flexsplit");

const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
/* rho verdur ad birtast med SEX aukastofum. Vid thrja las 8-std
   "1,000" medan 270 rader hofdu haggast — talan var ekki rong, hun var
   NAMUNDUD i fullyrdingu sem hun styður ekki. */
const r6 = (x) => (x == null ? null : Math.round(x * 1e6) / 1e6);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

/* ============================================================
   1. PATCHAD AFRIT — SAMA APPLEID, ONNUR UTHLUTUN
   ============================================================
   HVERS VEGNA EKKI MONKEY-PATCH: `computeVbd` kallar
   `replacementRanks` INNAN sinnar eigin einingar, svo ekkert utanad
   getur skipt henni ut. Og hvers vegna ekki endurutfaersla a VBD hér:
   thad vaeri ad maela AFRIT af formulunni — nakvaemlega su villa sem
   `buildTeamMetrics` kostadi i FPL-verkefninu.

   Textaskiptin eru THVINGUD: finnist hausinn ekki, eda finnist hann
   oftar en einu sinni, DEYR skriftan. Thogul mistok hér myndu maela
   nuverandi kodann gegn sjalfum ser og skila rho = 1,000 — svarid sem
   maelingin er ad reyna ad greina fra hinu.                        */
async function buildLegacyModule() {
  await mkdir(TMP, { recursive: true });
  const src = await readFile(path.join(ROOT, "src", "model.js"), "utf8");
  const head = "export function replacementRanks(league) {";
  const at = src.indexOf(head);
  if (at < 0) throw new Error("fann ekki replacementRanks i src/model.js");
  if (src.indexOf(head, at + 1) >= 0) throw new Error("fann replacementRanks OFTAR EN EINU SINNI");
  const end = src.indexOf("\n}\n", at);
  if (end < 0) throw new Error("fann ekki lok replacementRanks");

  const candPath = path.join(HERE, "lib", "flexsplit-legacy.mjs");
  const patched =
    `import { replacementRanksLegacy as __fixed } from ${JSON.stringify(candPath)};\n` +
    src.slice(0, at) +
    "export function replacementRanks(league) {\n  return __fixed(league);\n}\n" +
    src.slice(end + 3);
  await writeFile(path.join(TMP, "model_fixed.js"), patched);

  const bsrc = await readFile(path.join(ROOT, "src", "build.js"), "utf8");
  if (!bsrc.includes('from "./model.js"')) throw new Error("build.js flytur ekki inn ./model.js");
  await writeFile(path.join(TMP, "build_fixed.js"),
    bsrc.replace('from "./model.js"', `from ${JSON.stringify(path.join(TMP, "model_fixed.js"))}`));

  /* HLIDID: patchada einingin verdur ad gefa ANNAD svar en su sem er i
     loftinu, a einhverri af logununum. Gefi hun sama svar alls stadar er
     patchid dautt og allar tolur hér lesa "engin breyting" af rangri
     astaedu. */
  const m = await import(path.join(TMP, "model_fixed.js"));
  return m;
}

/* ============================================================
   2. LOGUNIN — RAUNVERULEGU DEILDIRNAR FYRST
   ============================================================
   Deildir notandans eru lesnar ur `half-lab.mjs`, sem er skrain thar
   sem thaer eru skrifadar nidur (`10-2flex` Patriots, `12-2flex`
   Sofahetjur). Ad skrifa thaer upp aftur hér vaeri thridja afritid af
   somu deild.                                                     */
async function realLeagues() {
  const txt = await readFile(path.join(HERE, "half-lab.mjs"), "utf8");
  const out = [];
  const re = /\{\s*key:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*\n\s*league:\s*(\{[\s\S]*?\})\s*\}/g;
  let m;
  while ((m = re.exec(txt))) {
    /* Deildarhluturinn er lesinn med `Function`, ekki JSON — hann er
       JS-bokstafur i skriftu, ekki JSON. Innihaldid er kodinn okkar
       eigin i sama repo. */
    // eslint-disable-next-line no-new-func
    const league = Function(`"use strict";return (${m[3]});`)();
    out.push({ key: m[1], label: m[2], league });
  }
  if (out.length !== 2) throw new Error(`fann ${out.length} deildir i half-lab.mjs, aetti ad vera 2`);
  return out;
}

/* Logunin sem `shape-lab.mjs` maelir — sama skrarlestur og astaeda. */
async function shapeLabShapes() {
  const txt = await readFile(path.join(HERE, "shape-lab.mjs"), "utf8");
  const at = txt.indexOf("const SHAPES = [");
  const end = txt.indexOf("\n];", at);
  if (at < 0 || end < 0) throw new Error("fann ekki SHAPES i shape-lab.mjs");
  // eslint-disable-next-line no-new-func
  const arr = Function(`"use strict";return (${txt.slice(at + "const SHAPES = ".length, end + 2)});`)();
  /* FORSKEYTI: `12-2flex` er BADE i half-lab (raunveruleg deild) og i
     shape-lab. An forskeytis skrifadi seinni yfir fyrri i `out.shapes`
     og skyrslan taldi 12 logun thar sem 13 voru maeldar — thogul
     yfirskrift, sama aett og allt annad sem thetta repo hefur borgad fyrir. */
  return arr.map((s) => ({ key: `sl-${s.key}`, label: `shape-lab ${s.key}`,
    league: { teams: s.teams, starters: s.starters, superflex: !!s.superflex } }));
}

/* Tilbunar logun sem svara HINNI villunni og jaðartilfellunum. */
const SYNTHETIC = [
  { key: "14-2flex", label: "14 lid, 2 FLEX (README-daemid)",
    league: { teams: 14, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              flexPos: ["RB", "WR", "TE"] } },
  { key: "10-2flex-recflex", label: "10 lid, 2 FLEX sem tekur adeins WR/TE",
    league: { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              flexPos: ["WR", "TE"] } },
  { key: "12-1flex-rbwr", label: "12 lid, FLEX tekur adeins RB/WR",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 },
              flexPos: ["RB", "WR"] } },
];

/* ============================================================
   3. UTHLUTUNIN SJALF — SUMMAST HUN?
   ============================================================ */
function slotAudit(league, ranks) {
  const t = league.teams || 12;
  const st = league.starters || {};
  const want = ((st.FLEX || 0) + ((st.SUPERFLEX || 0) || (league.superflex ? 1 : 0))) * t;
  let got = 0;
  for (const pos of ["QB", "RB", "WR", "TE", "K", "DST"]) {
    got += (ranks[pos] || 0) - (st[pos] || 0) * t;
  }
  return { flexSlotsWanted: want, flexSlotsAllocated: got, sums: want === got };
}

async function main() {
  const legacyModel = await buildLegacyModule();
  /* NOFN SEGJA HVOR ER HVOR. `buildRowsLegacy` er patchada afritid og
     `buildRowsShipped` er `src/build.js`. Fyrsta utgafa thessarar
     skriftu kalladi thau `buildRows`/`buildRowsNow` og bokadi
     `replacementFixed` a GAMLA threpid eftir ad lagfaeringin var send —
     merkt tala i ranga att er verri en omerkt. */
  const { buildRows: buildRowsLegacy } = await import(path.join(TMP, "build_fixed.js"));
  const { buildRows: buildRowsShipped } = await import(path.join(ROOT, "src", "build.js"));

  const rd = async (f) => JSON.parse(await readFile(path.join(DATA, f), "utf8"));
  const players = await rd("players.json");
  const seasons = await rd("seasons.json");
  const schedule = await rd("schedule.json");
  const market = await rd("market.json");
  const poolSha = createHash("sha1")
    .update(JSON.stringify(players)).digest("hex").slice(0, 12);

  const shapes = [...(await realLeagues()), ...(await shapeLabShapes()), ...SYNTHETIC];

  /* HLIDID: patchid verdur ad bita a einhverri logun. */
  let differs = 0;
  for (const s of shapes) {
    const a = replacementRanks(s.league), b = replacementRanksLegacy(s.league);
    if (JSON.stringify(a) !== JSON.stringify(b)) differs++;
  }
  if (!differs) throw new Error("HLID: gamla hegdunin gefur SOMU threp a ollum logunum " +
    "— thad er ekki nidurstada, thad er dautt patch");
  /* Og sama hlid a patchada einingunni sjalfri, thvi hun er su sem
     `buildRows` les. Reyndist hun okeypis afrit vaeri rho 1,000 af
     rangri astaedu. */
  {
    const probe = { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 } };
    if (JSON.stringify(legacyModel.replacementRanks(probe)) ===
        JSON.stringify(replacementRanks(probe))) {
      throw new Error("HLID: patchada einingin er OBREYTT — textaskiptin bitu ekki");
    }
  }

  const out = {
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: {},
      inputs: ["players.json", "seasons.json", "schedule.json", "market.json"], dataDir: DATA }),
    /* SKRARSTRENGIR ERU A ENSKU eins og i hverri annarri
       `data/measure/*.json`; rokstudningurinn i athugasemdum er
       islenskur. Fyrsta utgafa hafdi thetta svid a islensku og thad
       hefdi verid eina islenska strengurinn i mopunni. */
    harness: "buildRows (src/build.js) — the app path, the same pool the user sees",
    pool: { players: players.length, sha1: poolSha },
    note: "shipped = src/model.js (Hamilton, flexPos honoured); legacy = the " +
          "pre-2026-08-14 behaviour kept in scripts/lib/flexsplit-legacy.mjs. " +
          "shift = legacy - shipped. Numbers here are dated examples: " +
          "data/players.json is rewritten daily by the pipeline. The invariant " +
          "(flex slots must sum) does not drift; the rank movement numbers do.",
    shapes: {},
  };

  for (const s of shapes) {
    const shipped = replacementRanks(s.league);
    const legacy = replacementRanksLegacy(s.league);
    const rec = {
      label: s.label,
      teams: s.league.teams, starters: s.league.starters,
      flexPos: s.league.flexPos || null,
      replacementShipped: shipped, replacementLegacy: legacy,
      auditShipped: slotAudit(s.league, shipped),
      auditLegacy: slotAudit(s.league, legacy),
      ranksIdentical: JSON.stringify(shipped) === JSON.stringify(legacy),
    };

    /* Bordid er adeins byggt fyrir raunverulegar deildir og
       shape-lab-logun; tilbunu flexPos-logunin eru til ad svara (b) og
       thar er svarid i threpunum sjalfum. Vid byggjum thaer samt —
       adeins ein keyrsla per logun og hun kostar sekundubrot. */
    const league = { scoring: s.league.scoring || "ppr", ...s.league };
    const A = buildRowsShipped({ players, seasons, schedule, market, league }).rows;
    const B = buildRowsLegacy({ players, seasons, schedule, market, league }).rows;

    const byIdB = new Map(B.map((r) => [r.id, r]));
    const pairs = A.filter((r) => r.aRank != null)
      .map((r) => [r, byIdB.get(r.id)])
      .filter(([, b]) => b && b.aRank != null);
    const ra = pairs.map(([a]) => a.aRank), rb = pairs.map(([, b]) => b.aRank);

    const moved = pairs.filter(([a, b]) => a.aRank !== b.aRank);
    const topN = (n) => {
      const sub = pairs.filter(([a]) => a.aRank <= n);
      const mv = sub.filter(([a, b]) => a.aRank !== b.aRank);
      const deltas = mv.map(([a, b]) => Math.abs(a.aRank - b.aRank));
      /* HVERJIR ERU I TOPP N — thad er akvordunin, ekki rodin innan
         hans. Bord sem umrodar topp 10 innbyrdis en heldur somu
         tiu monnum er ONNUR nidurstada en bord sem skiptir manni ut. */
      const setA = new Set(sub.map(([a]) => a.id));
      const setB = new Set(pairs.filter(([, b]) => b.aRank <= n).map(([, b]) => b.id));
      let same = 0; for (const id of setA) if (setB.has(id)) same++;
      return { n, inScope: sub.length, moved: mv.length,
        maxShift: deltas.length ? Math.max(...deltas) : 0,
        meanShift: deltas.length ? r1(deltas.reduce((x, y) => x + y, 0) / deltas.length) : 0,
        membershipSame: same, membershipChanged: setA.size - same };
    };

    const vbdDelta = pairs.map(([a, b]) => Math.abs((a.vbd ?? 0) - (b.vbd ?? 0)));
    rec.board = {
      compared: pairs.length,
      spearman: r6(spearman(ra, rb)),
      kendallSwapsMoved: moved.length,
      identicalOrder: moved.length === 0,
      maxShiftAll: moved.length ? Math.max(...moved.map(([a, b]) => Math.abs(a.aRank - b.aRank))) : 0,
      maxVbdDelta: r1(vbdDelta.length ? Math.max(...vbdDelta) : 0),
      top: [12, 24, 50, 100].map(topN),
      tierChanged: pairs.filter(([a, b]) => a.tier !== b.tier).length,
      posTierChanged: pairs.filter(([a, b]) => a.posTier !== b.posTier).length,
      /* NOFNIN ERU MED VILJANDI. "20 af topp 50 haggast" er ekki
         akvordun; "hverjir og hvert" er thad. Adeins topp 50, thvi
         thad er thar sem draftid er akvedid. */
      moversTop50: pairs.filter(([a, b]) => a.aRank <= 50 && a.aRank !== b.aRank)
        .sort((x, y) => x[0].aRank - y[0].aRank)
        .map(([a, b]) => ({ name: a.name || a.id, pos: a.pos,
          shipped: a.aRank, legacy: b.aRank, shift: b.aRank - a.aRank })),
    };
    out.shapes[s.key] = rec;

    const t50 = rec.board.top.find((x) => x.n === 50);
    console.log(`${s.key.padEnd(18)} rho ${String(rec.board.spearman).padStart(6)} · ` +
      `haggadir ${String(moved.length).padStart(4)}/${rec.board.compared} · ` +
      `topp50 ${t50.moved} haggadir (max ${t50.maxShift}, hopur ${t50.membershipChanged} nyr) · ` +
      `threp ${rec.ranksIdentical ? "OBREYTT" : "gamalt " + JSON.stringify(legacy) + " -> sent " + JSON.stringify(shipped)}`);
  }

  /* ============================================================
     4. SAMANTEKT SEM SVARAR SPURNINGUNNI SEM VAR SPURD
     ============================================================ */
  const real = ["10-2flex", "12-2flex"];
  out.summary = {
    shapesMeasured: Object.keys(out.shapes).length,
    shapesWhereRanksChange: Object.values(out.shapes).filter((s) => !s.ranksIdentical).length,
    shapesWhereSlotsDoNotSumLegacy: Object.values(out.shapes).filter((s) => !s.auditLegacy.sums).length,
    shapesWhereSlotsDoNotSumShipped: Object.values(out.shapes).filter((s) => !s.auditShipped.sums).length,
    realLeagues: Object.fromEntries(real.map((k) => [k, {
      ranksIdentical: out.shapes[k].ranksIdentical,
      spearman: out.shapes[k].board.spearman,
      movedTop50: out.shapes[k].board.top.find((x) => x.n === 50).moved,
      maxShiftTop50: out.shapes[k].board.top.find((x) => x.n === 50).maxShift,
      membershipChangedTop50: out.shapes[k].board.top.find((x) => x.n === 50).membershipChanged,
      boardIdentical: out.shapes[k].board.identicalOrder,
    }])),
  };

  await mkdir(path.join(DATA, "measure"), { recursive: true });
  await writeFile(path.join(DATA, "measure", "flexsplit.json"), JSON.stringify(out, null, 1));
  console.log("\n-> data/measure/flexsplit.json");
  console.log(`  threp breytast i ${out.summary.shapesWhereRanksChange} af ${out.summary.shapesMeasured} logunum`);
  console.log(`  saeti summudust ekki i ${out.summary.shapesWhereSlotsDoNotSumLegacy} logunum adur, ` +
    `${out.summary.shapesWhereSlotsDoNotSumShipped} i senda kodanum`);
  for (const k of real) {
    const s = out.summary.realLeagues[k];
    console.log(`  ${k}: bordid ${s.boardIdentical ? "OBREYTT" : "HREYFIST"} (rho ${s.spearman})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
