/* ============================================================
   te-sweep.mjs — FLEX_SPLIT.TE SEM SVEIPUR, AN AFRITS AF `apportion`

   HVERS VEGNA THESSI SKRA ER TIL. `FLEX_SPLIT.TE = 0,193` var maeld i
   `calibrate.mjs` sem TIÐNI (hve oft endar thett-endi i topp-12 flex i
   viku 2020-2025) og hun hefur ALDREI verid maeld sem UTKOMA (draftar
   hun betur?). Til ad sveipa hana tharf `replacementRanks` med ODRU
   hlutfalli — og tvaer leidir voru moguleigar:

     (a) afrita `apportion` hingad og reikna saetin sjalf
     (b) PATCHA afrit af `src/model.js` og flytja thad inn

   (a) ER SU VILLA SEM ALLT REPO-ID ER SKRIFAD GEGN: afrit af formulu
   sem getur rekid fra frumritinu (`buildTeamMetrics` i FPL-verkefninu
   skrifadi NaN fyrir 17 lid og var merkt eins og maeling). Hamilton-
   uthlutunin er nakvaemlega thess konar formula — hun ber jafntefla-
   reglu a FASTRI stodu-rod og leifar-umferd sem hringsolar, og afrit
   sem missir annad hvort maelir ANNAD en appid birtir.

   THVI (b), OG NAKVAEMLEGA SAMA ADFERD OG `flexsplit-lab.mjs` NOTAR:
   textaskipti ur upprunanum i hverri keyrslu, THVINGUD — finnist
   linan ekki, eda finnist hun oftar en einu sinni, DEYR skriftan.
   Thogul mistok hér vaeru verri en engin maeling: their myndu maela
   sendan kodann gegn sjalfum ser og skila "engin breyting" af rangri
   astaedu.

   OG AKKERID SEM GERIR THETTA SANNANLEGT: vid te = 0,193 er
   endurnormolunin EININGIN (0,330 + 0,477 + 0,193 = 1,000 nakvaemlega),
   svo patchada TEXTINN VERDUR AD VERA BITAEINS SA SAMI og uppruninn.
   `loadTeModels` fellur ef hann er thad ekki. Sveipurinn getur thvi
   ekki verid ad maela annan heim en appid.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const TMP = path.join(ROOT, ".cache-nfl", "tesweep");

/* SENDA LINAN, ORDRETT. Hun er ekki byggd ur `FLEX_SPLIT` sjalfu thvi
   tha gaeti hun aldrei fallid: textaskiptin verda ad finna THENNAN
   streng i `src/model.js`, og se honum breytt (annad snid, annar
   aukastafur) a sveipurinn ad DEYJA og ekki ad giska. */
export const SHIPPED_LINE =
  "export const FLEX_SPLIT = { RB: 0.330, WR: 0.477, TE: 0.193 };";

/** Sendi TE-hlutur. Sveipurinn verdur ad innihalda hann. */
export const TE_SHIPPED = 0.193;

/* RB/WR-hlutfallid innbyrdis er HALDID FOSTU. Sveipurinn spyr um EINN
   frelsisgrad — TE — thvi thad er talan sem uttektin dro i efa. Vaeru
   allir thrir sveipadir vaeri thetta grid-leit i thremur attum a 9
   frumum, og README 5h/4c segja hvad slik leit gefur: havada sem
   walk-forward tekur til baka. RB:WR = 0,330:0,477 er MAELT og thad er
   ekki thad sem er i deilu. */
const RB_OF_RBWR = 0.330 / (0.330 + 0.477);
const WR_OF_RBWR = 0.477 / (0.330 + 0.477);

/**
 * Sveipurinn. Nedri endinn (0) er "TE fær ENGAN flex-hlut" og hann er
 * ekki tilbuinn: `vbdbase-lab` ber hann thegar undir heitinu
 * `te-fixed`. Efri endinn (0,40) er tvofalt sent gildi.
 *
 * 0,10 ER I GRIDINU AF ASTAEDU: thad var AGISKADA talan sem 0,193 kom i
 * stad (`calibrate.mjs`, README kafli 3). Se hun betri i utkomu var
 * agiskunin retta talan og maelingin maeldi rangan hlut.
 */
export const TE_GRID = [0, 0.05, 0.10, 0.15, TE_SHIPPED, 0.25, 0.30, 0.40];

/** te -> { RB, WR, TE }, endurnormolad svo summan se NAKVAEMLEGA 1. */
export function splitFor(te) {
  const rbwr = 1 - te;
  const round6 = (x) => Math.round(x * 1e6) / 1e6;
  const RB = round6(rbwr * RB_OF_RBWR);
  const WR = round6(rbwr * WR_OF_RBWR);
  /* TE tekur leifina svo summan se 1 UPP A BITANN, ekki upp a sex
     aukastafi. Ella gaeti `apportion` fengid sum != 1 og deilt saetum
     eftir odru en sveipurinn segir. */
  return { RB, WR, TE: round6(1 - RB - WR) };
}

/** Textinn sem kemur i stad `SHIPPED_LINE` fyrir eitt te-gildi. */
export function lineFor(te) {
  const s = splitFor(te);
  const f = (x) => (x === TE_SHIPPED || x === 0.330 || x === 0.477
    ? x.toFixed(3) : String(x));
  return `export const FLEX_SPLIT = { RB: ${f(s.RB)}, WR: ${f(s.WR)}, ` +
         `TE: ${f(s.TE)} };`;
}

/**
 * Hledur einu patchada `model.js`-afriti per te-gildi.
 *
 * Skilar `Map<te, { replacementRanks, split, path }>`.
 *
 * THRJU HLID, OG THAU DEYJA OLL FREMUR EN AD SKILA TOLU:
 *   1. `SHIPPED_LINE` verdur ad finnast NAKVAEMLEGA EINU SINNI.
 *   2. Vid te = 0,193 verdur patchadi textinn ad vera BITAEINS eins og
 *      upprunninn (endurnormolunin er einingin thar).
 *   3. Minnst tvo te-gildi verda ad gefa OLIK varamanns-threp a
 *      `probeLeague` — annars er patchid daudt og hver tala les
 *      "engin breyting" af rangri astaedu.
 */
export async function loadTeModels(grid = TE_GRID, probeLeague = {
  teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
  flexPos: ["RB", "WR", "TE"],
}) {
  const src = await readFile(path.join(ROOT, "src", "model.js"), "utf8");
  const at = src.indexOf(SHIPPED_LINE);
  if (at < 0) {
    throw new Error("te-sweep: fann ekki FLEX_SPLIT-linuna ORDRETT i src/model.js — " +
      `leitad var eftir ${JSON.stringify(SHIPPED_LINE)}. Hafi hun breyst er ` +
      "sveipurinn ad maela annan heim en appid og hann DEYR fremur en ad giska.");
  }
  if (src.indexOf(SHIPPED_LINE, at + 1) >= 0) {
    throw new Error("te-sweep: fann FLEX_SPLIT-linuna OFTAR EN EINU SINNI i src/model.js");
  }

  await mkdir(TMP, { recursive: true });
  const out = new Map();
  for (const te of grid) {
    const patched = src.slice(0, at) + lineFor(te) + src.slice(at + SHIPPED_LINE.length);
    if (te === TE_SHIPPED && patched !== src) {
      throw new Error("te-sweep: te=0,193 gaf ANNAN texta en upprunann. " +
        `Linan var ${JSON.stringify(lineFor(te))}. Endurnormolunin er einingin ` +
        "thar, svo thetta er villa i `splitFor`/`lineFor` og hvert tolugildi " +
        "i sveipnum vaeri osamanburdarhaeft vid sendan koda.");
    }
    const key = String(te).replace(".", "p");
    const p = path.join(TMP, `model_te_${key}.js`);
    await writeFile(p, patched);
    const mod = await import(p);
    out.set(te, { replacementRanks: mod.replacementRanks, split: mod.FLEX_SPLIT, path: p });
  }

  /* Hlid 3: er patchid LIFANDI? */
  const seats = [...out.entries()].map(([te, m]) =>
    `${te}:${m.replacementRanks(probeLeague).TE}`);
  if (new Set(seats.map((s) => s.split(":")[1])).size < 2) {
    throw new Error(`te-sweep: OLL te-gildi gafu SAMA TE-threp (${seats.join(" ")}). ` +
      "Patchid er dautt og hver tala i sveipnum vaeri merkingarlaus.");
  }
  return out;
}

/** Lykill sem er ohultur i skraarheitum og i toflum: 0,193 -> "te0.193". */
export const teKey = (te) => `te${te}`;
