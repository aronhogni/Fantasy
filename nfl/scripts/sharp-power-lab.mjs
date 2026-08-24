#!/usr/bin/env node
/* ============================================================
   sharp-power-lab.mjs — BERA THAU SJO BORD YFIRLEITT NOG MERKI?

     node scripts/sharp-power-lab.mjs [--scoring=ppr] [--k=15]
                                      [--from=2019] [--boot=2000]

   -> data/measure/sharp_power.json

   ============================================================
   SPURNINGIN ER ONNUR EN `sharp-lab` OG `disagree-lab` SVORUDU
   ============================================================
   Thaer maeldu HVORT bordid baeti akvordunina:
     `sharp-lab`      bord theirra gegn A-Ranking:  -111,3 (3/7, t -1,41)
     `disagree-lab`   blondun allrar rodarinnar:     -11,6 (1/6)
                      samhljoda hopar faerdir um P:   0    (P=0 valid oll arin)
   Baedar felldu hugmyndina. THETTA er thridja spurningin og hun er
   ekki hin sama: **hve stort er SUD SJALFRAR TOLUNNAR?**

   README 5 ber varnaglann berum orðum: "adeins 7-13 af 15 voldum eiga
   bord hvert ar (a moti ~60 i flotu samsteypunni), svo hluti bilsins
   gaeti verid urtaksstaerd." Su setning er tilgata, ekki maeling. Se
   sudid i `sharpDelta` STAERRA en talan sjalf tha er
     (a) hofnunin i `sharp-lab`/`disagree-lab` ekki "merkid er ekki
         thar" heldur "vid getum ekki maelt thad med sjo bordum", og
     (b) dalkurinn a skjanum er ONYTUR til akvordunar hvad sem
         drott-hermunin segir — hann faerir minna en sitt eigid suð.

   Thad er NAKVAEMLEGA rokfaerslan sem README 5n/Q3 endar a:
   "maelikvardi sem faerir rodina MINNA en sitt eigid sud getur ekki
   snuid neinu vid". Hér er hun beitt a INNTAKID i stad maelikvardans.

   ============================================================
   ADFERDIN — BOOTSTRAP THAR SEM KLASINN ER SERFRAEDINGURINN
   ============================================================
   `sharpDelta` = ECR - midgildi rada theirra bordanna sem eru komin.
   Klasinn her er BORDID, ekki leikmadurinn: leikmennirnir eru fastir
   og thad er urtakid AF SERFRAEDINGUM sem er lítið. Endursyning a
   leikmonnum myndi svara annarri spurningu (hve vel er MEDALTALID
   yfir leikmenn maelt) og skilja tha sem er spurt osvarada.

   Fyrir hvert ar:
     1. `pickExperts` velur K menn UR FYRRI ARUM (sama regla, sama
        `lib/experts.mjs`, engin ny valregla — annars vaeri thetta ekki
        sama borðið og appid birtir).
     2. Bordin theirra thad ar eru sott. Fjoldinn `B` er thad sem
        raunverulega faest, alveg eins og i appinu.
     3. `boot` sinnum: dragid B bord MED SKILUM ur theim B, midgildi
        endurreiknad, `sharpDelta` endurreiknad per leikmann.
     4. Per leikmann: sd yfir itranirnar = SUD TOLUNNAR.

   Tvaer tolur ur thvi, og su sidari er svarid:
     `signalToNoise` = |sharpDelta| / sd, medaltal yfir leikmenn
     `sameSideRate`  = hlutfall itrana thar sem FORMERKID heldur —
                       thad er, hve oft "their eru hrifnari en
                       markadurinn" er enn satt eftir endursyningu.
   Formerkid er thad sem dalkurinn segir notandanum; helst thad ekki
   er dalkurinn myntkast med thremur aukastofum.

   ============================================================
   TVAER SAMANBURDARLINUR, ANNARS ER TALAN NAKIN
   ============================================================
   `flat` — SOMU tolur reiknadar ur FLOTU samsteypunni (~60-100 bord)
            i stad sjo. Su tala segir hve mikid af sudinu er
            urtaksstaerd og hve mikid er raunverulegur agreiningur
            milli manna. Se flata talan LIKA slaem er vandamalid ekki
            "sjo bord" heldur "serfraedingar eru osamma", og tha kaupir
            enginn urtaksvoxtur nokkud.
   `shuffle` — nulllina: sami fjoldi borda, en radirnar innan hvers
            bords eru STOKKADAR. Thad gefur sudid sem faest ur ENGU
            merki og thvi thakid sem sannt merki verdur ad sla.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { mean } from "../src/learn.js";
import { buildIndexes, matchByName } from "../src/names.js";
import * as fp from "./sources/fantasypros.mjs";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";
import { loadAccuracy, pickExperts, median } from "./lib/experts.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2),
  { scoring: ["ppr", "standard"], k: "number", from: "number", boot: "number" });
const SCORING = String(ARG.scoring || "ppr");
const K = Number(ARG.k || 15);
const FROM = Number(ARG.from || 2019);
const BOOT = Number(ARG.boot || 2000);

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const sd = (a) => {
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

/** Fast fraekorn — engin keyrsla ma gefa adra tolu en su naesta. */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Endursynir BORDIN (ekki leikmennina) og skilar, per leikmann,
 * dreifingu `sharpDelta` yfir itranirnar.
 *
 * @param ranksBy  id -> [rod hjá hverju bordi]  (eitt sæti per bord)
 * @param field    id -> saeti i ADP/ECR-vidmidinu
 */
function bootByBoard(perBoard, field, need, boot, seed) {
  const B = perBoard.length;
  const ids = [...new Set(perBoard.flatMap((m) => [...m.keys()]))];
  const acc = new Map(ids.map((id) => [id, []]));
  const rnd = rng(seed);
  for (let it = 0; it < boot; it++) {
    const pick = [];
    for (let i = 0; i < B; i++) pick.push(perBoard[Math.floor(rnd() * B)]);
    for (const id of ids) {
      const rs = [];
      for (const m of pick) { const v = m.get(id); if (v != null) rs.push(v); }
      if (rs.length < need) continue;
      const f = field.get(id);
      if (f == null) continue;
      acc.get(id).push(f - median(rs));
    }
  }
  const out = new Map();
  for (const id of ids) {
    const a = acc.get(id);
    if (a.length < boot * 0.5) continue;        // of oft undir `need`
    const m = mean(a), s = sd(a);
    const same = a.filter((x) => (m >= 0 ? x >= 0 : x < 0)).length / a.length;
    out.set(id, { mean: m, sd: s, sameSideRate: same, iters: a.length });
  }
  return out;
}

function summarise(dist, label) {
  const rows = [...dist.values()].filter((q) => q.sd != null && q.sd > 0);
  if (!rows.length) return null;
  const snr = rows.map((q) => Math.abs(q.mean) / q.sd);
  const same = rows.map((q) => q.sameSideRate);
  const sorted = snr.slice().sort((a, b) => a - b);
  return {
    label,
    players: rows.length,
    meanAbsDelta: r1(mean(rows.map((q) => Math.abs(q.mean)))),
    meanSd: r1(mean(rows.map((q) => q.sd))),
    signalToNoise: r3(mean(snr)),
    medianSignalToNoise: r3(sorted[sorted.length >> 1]),
    /* Hlutfall theirra thar sem talan er staerri en sitt eigid sud. */
    aboveOwnNoise: r3(snr.filter((x) => x >= 1).length / snr.length),
    sameSideRate: r3(mean(same)),
    /* SU SEM SKIPTIR MALI FYRIR NOTANDANN: hve margir bera formerki
       sem heldur i 95% itrana. Undir thvi er dalkurinn ekki fullyrding. */
    signStable95: r3(same.filter((x) => x >= 0.95).length / same.length),
  };
}

async function main() {
  console.log(`saeki nakvaemni 2015-2025 …`);
  const { acc, years: accYears } = await loadAccuracy(2015, 2025, console.log);

  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r.adp != null).map((r) => r.season))]
    .sort().filter((y) => y >= FROM && y <= 2025);

  const perYear = {};
  for (const y of years) {
    const experts = pickExperts(acc, accYears, y, K);
    if (experts.length < Math.min(5, K)) { console.log(`  ${y}: of fair valdir`); continue; }

    const boards = [];
    for (const e of experts) {
      const b = await fp.expertBoard(e.id, { year: y, scoring: SCORING === "ppr" ? "PPR" : "STD" })
        .catch(() => null);
      if (b && b.ranks.length > 50) boards.push({ ...e, ranks: b.ranks });
      await new Promise((s) => setTimeout(s, 150));
    }
    if (boards.length < Math.min(4, K)) {
      console.log(`  ${y}: adeins ${boards.length} bord — slepp`); continue;
    }

    /* FLATA SAMSTEYPAN sem samanburdarlina — ALLIR sem birtu thad ar.
       Hun er sótt sem stok bord svo endursyningin se sambaerileg;
       `consensus()` gefur adeins medaltalid og ur thvi er ekki haegt
       ad endursyna. */
    const flatIds = [...new Set(acc[y] ? acc[y].map((r) => r.id) : [])];
    const flatBoards = [];
    if (flatIds.length) {
      const got = await fp.expertBoards(flatIds, { year: y, scoring: SCORING === "ppr" ? "PPR" : "STD" });
      for (const b of got) if (b.ranks.length > 50) flatBoards.push(b);
    }

    const yr = rows.filter((r) => r.season === y && r.adp != null);
    if (yr.length < 120) { console.log(`  ${y}: laug of litil`); continue; }
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, name: r.name, team: r.prevTeam || null,
      adp: r.adp }));
    const idx = buildIndexes(pool);
    const field = new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1]));

    /* EITT SAET PER BORD — thad er thad sem gerir bootstrappid ad
       bootstrappi YFIR BORD. Fyrri utgafa min flatti thetta i einn
       lista af rodum og hefdi tha endursynt RADIR, sem er onnur
       spurning og hun litur alltaf betur ut. */
    const toPerBoard = (bs) => bs.map((b) => {
      const m = new Map();
      for (const p of b.ranks) {
        const hit = matchByName(idx, p.name, p.pos, p.team);
        if (hit && !m.has(hit.item.id)) m.set(hit.item.id, p.rank);
      }
      return m;
    });
    const sharpPB = toPerBoard(boards);
    const flatPB = toPerBoard(flatBoards);

    /* NULLLINAN: somu bord, radir STOKKADAR innan hvers bords. Sami
       fjoldi, sama thekja, ENGIN samstada. */
    const rnd = rng(90210 + y);
    const shufPB = sharpPB.map((m) => {
      const ks = [...m.keys()], vs = [...m.values()];
      for (let i = vs.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [vs[i], vs[j]] = [vs[j], vs[i]];
      }
      return new Map(ks.map((k, i) => [k, vs[i]]));
    });

    const needSharp = Math.max(3, Math.ceil(sharpPB.length / 2));
    const needFlat = Math.max(3, Math.ceil(flatPB.length / 2));

    const s = summarise(bootByBoard(sharpPB, field, needSharp, BOOT, 11 + y), "sharp");
    const f = flatPB.length >= 8
      ? summarise(bootByBoard(flatPB, field, needFlat, BOOT, 22 + y), "flat") : null;
    const z = summarise(bootByBoard(shufPB, field, needSharp, BOOT, 33 + y), "shuffled");

    perYear[y] = {
      expertsPicked: experts.length, sharpBoards: sharpPB.length,
      flatBoards: flatPB.length, poolSize: pool.length,
      sharp: s, flat: f, shuffled: z,
    };
    console.log(`  ${y}: ${sharpPB.length} skorpu-bord, ${flatPB.length} flot bord` +
      `  SNR skorpu ${s ? s.signalToNoise : "-"}` +
      `  flat ${f ? f.signalToNoise : "-"}  stokkud ${z ? z.signalToNoise : "-"}`);
  }

  const ys = Object.keys(perYear).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, "timabil med bordum");

  /* ============================================================
     LIFANDI ARMID — 2026, THAD SEM HANN SER I DAG
     ============================================================
     README 5 skrair "7 af 15" 17.8.2026: attir hofdu einfaldlega ekki
     birt. Loknu arin hér ad ofan bera 12-13 bord, svo THAU MAELA EKKI
     THAD SEM ER A SKJANUM. Sudid i lifandi dalknum verdur maelt a
     lifandi bordunum — og thad tharfnast ENGRA utkoma, adeins
     endursyningar, svo forleikur er engin hindrun.

     Porunin er a `fpId`, ekki nafni: BAEDI samsteypan og bord hvers
     serfraedings koma ur SOMU FantasyPros-skra og bera sama id, svo
     nafna-porun vaeri onodsynleg villuheimild hér (`names.js` er til
     fyrir porun MILLI heimilda).                                    */
  let live = null;
  try {
    const LIVE_YEAR = 2026;
    const experts = pickExperts(acc, accYears, LIVE_YEAR, K);
    const cons = await fp.consensus({ year: LIVE_YEAR, scoring: SCORING === "ppr" ? "PPR" : "STD" });
    const field = new Map((cons.players || [])
      .filter((p) => p.ecr != null).map((p) => [p.fpId, p.ecr]));
    const got = [];
    for (const e of experts) {
      const b = await fp.expertBoard(e.id, { year: LIVE_YEAR, scoring: SCORING === "ppr" ? "PPR" : "STD" })
        .catch(() => null);
      if (b && b.ranks.length > 50) got.push(b);
      await new Promise((s) => setTimeout(s, 150));
    }
    const perBoard = got.map((b) => {
      const m = new Map();
      for (const p of b.ranks) if (field.has(p.fpId) && !m.has(p.fpId)) m.set(p.fpId, p.rank);
      return m;
    });
    if (perBoard.length >= 4) {
      const need = Math.max(3, Math.ceil(perBoard.length / 2));
      const s = summarise(bootByBoard(perBoard, field, need, BOOT, 4242), "live");
      /* Topp-50 ser: thad er thar sem draftid raest, og dalkurinn er
         gagnslaus thott hann se stodugur a saeti 180. */
      const top50 = new Map([...field.entries()].filter(([, r]) => r <= 50));
      const s50 = summarise(bootByBoard(perBoard, top50, need, BOOT, 4343), "live top50");
      live = { year: LIVE_YEAR, expertsPicked: experts.length, boards: perBoard.length,
        consensusExperts: cons.totalExperts, poolSize: field.size, all: s, top50: s50 };
      console.log(`\n  LIFANDI ${LIVE_YEAR}: ${perBoard.length} af ${experts.length} bordum komin ` +
        `(samsteypan ber ${cons.totalExperts})`);
      if (s) console.log(`    allir:  |delta| ${s.meanAbsDelta} · sd ${s.meanSd} · SNR ${s.signalToNoise}` +
        ` · formerki 95% hjá ${s.signStable95}`);
      if (s50) console.log(`    topp50: |delta| ${s50.meanAbsDelta} · sd ${s50.meanSd} · SNR ` +
        `${s50.signalToNoise} · formerki 95% hjá ${s50.signStable95}`);
    } else {
      live = { year: LIVE_YEAR, boards: perBoard.length, note: "of fa bord til ad endursyna" };
      console.log(`\n  LIFANDI ${LIVE_YEAR}: adeins ${perBoard.length} bord — ekki endursynt`);
    }
  } catch (e) {
    live = { error: String(e.message || e) };
    console.log(`\n  LIFANDI armid brast: ${e.message} — loknu arin standa`);
  }

  const pooled = (arm, key) => {
    const v = ys.map((y) => perYear[y][arm] && perYear[y][arm][key]).filter((x) => x != null);
    return v.length ? r3(mean(v)) : null;
  };
  const summary = {
    sharp: { signalToNoise: pooled("sharp", "signalToNoise"),
      medianSignalToNoise: pooled("sharp", "medianSignalToNoise"),
      aboveOwnNoise: pooled("sharp", "aboveOwnNoise"),
      sameSideRate: pooled("sharp", "sameSideRate"),
      signStable95: pooled("sharp", "signStable95"),
      meanAbsDelta: pooled("sharp", "meanAbsDelta"), meanSd: pooled("sharp", "meanSd") },
    flat: { signalToNoise: pooled("flat", "signalToNoise"),
      aboveOwnNoise: pooled("flat", "aboveOwnNoise"),
      sameSideRate: pooled("flat", "sameSideRate"),
      signStable95: pooled("flat", "signStable95"),
      meanAbsDelta: pooled("flat", "meanAbsDelta"), meanSd: pooled("flat", "meanSd") },
    shuffled: { signalToNoise: pooled("shuffled", "signalToNoise"),
      aboveOwnNoise: pooled("shuffled", "aboveOwnNoise"),
      sameSideRate: pooled("shuffled", "sameSideRate"),
      signStable95: pooled("shuffled", "signStable95"),
      meanAbsDelta: pooled("shuffled", "meanAbsDelta"), meanSd: pooled("shuffled", "meanSd") },
  };

  console.log(`\n${"=".repeat(100)}`);
  console.log("  SUD SJALFRAR TOLUNNAR — endursynt YFIR BORD, ekki yfir leikmenn");
  console.log("=".repeat(100));
  console.log(`   ${"arm".padEnd(10)}${"|delta|".padStart(9)}${"sd".padStart(9)}` +
    `${"SNR".padStart(8)}${"> eigid sud".padStart(13)}${"formerki".padStart(11)}` +
    `${"formerki 95%".padStart(14)}`);
  for (const arm of ["sharp", "flat", "shuffled"]) {
    const q = summary[arm];
    console.log(`   ${arm.padEnd(10)}${String(q.meanAbsDelta).padStart(9)}${String(q.meanSd).padStart(9)}` +
      `${String(q.signalToNoise).padStart(8)}${String(q.aboveOwnNoise).padStart(13)}` +
      `${String(q.sameSideRate).padStart(11)}${String(q.signStable95).padStart(14)}`);
  }

  const verdict = (() => {
    const s = summary.sharp, z = summary.shuffled, f = summary.flat;
    if (s.signalToNoise == null) return "OMAELT";
    const beatsNull = z.signalToNoise != null && s.signalToNoise > z.signalToNoise;
    const usable = s.signStable95 != null && s.signStable95 >= 0.5;
    if (!beatsNull) {
      return `sharpDelta ber EKKI meira merki en stokkud bord (SNR ${s.signalToNoise} ` +
        `a moti ${z.signalToNoise}) — dalkurinn er urtaksstaerd, ekki skodun`;
    }
    if (!usable) {
      return `sharpDelta ber merki umfram stokkud bord (SNR ${s.signalToNoise} a moti ` +
        `${z.signalToNoise}) EN adeins ${(s.signStable95 * 100).toFixed(0)}% leikmanna hafa ` +
        `formerki sem heldur i 95% endursyninga. Talan er samhengi, ekki fullyrding per manni. ` +
        `Flata samsteypan: SNR ${f.signalToNoise}, formerki 95% hjá ` +
        `${f.signStable95 == null ? "-" : (f.signStable95 * 100).toFixed(0) + "%"}`;
    }
    return `sharpDelta er stodugt i 95% endursyninga hjá ${(s.signStable95 * 100).toFixed(0)}% ` +
      `leikmanna — urtaksstaerdin er EKKI bindandi, og hofnunin i sharp-lab/disagree-lab ` +
      `stendur thvi sem "merkid er ekki thar"`;
  })();

  const payload = {
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: SCORING, k: K, from: FROM, boot: BOOT },
      inputs: ["features.json"], dataDir: OUT }),
    question: "sharp-lab and disagree-lab both rejected the sharp board as a ranking. Neither " +
      "asked whether seven boards can carry the number at all. This resamples THE BOARDS " +
      "(cluster = expert, not player) and reports how much of sharpDelta survives.",
    method: {
      cluster: "expert board",
      arms: { sharp: "the 15 career-selected experts, boards that exist that year",
        flat: "every expert with an accuracy row that year",
        shuffled: "same sharp boards with ranks shuffled inside each board — the null" },
      selection: "lib/experts.mjs pickExperts, walk-forward, unchanged",
    },
    seasons: ys, perYear, summary, live, verdict,
  };
  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", "sharp_power.json"), JSON.stringify(payload, null, 1));
  console.log(`\n  ${verdict}\n`);
  console.log(`-> data/measure/sharp_power.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
