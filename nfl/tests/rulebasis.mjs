/* ============================================================
   rulebasis.mjs — HVAD ER RODIN THESS VIRDI I THESSARI DEILD?

   Einingin ber BAKADA toflu (sama mynstur og `MEASURED` i advice.js).
   Bokud tala getur ordid urelt i thogn, svo kafli 1 ber HVERT GILDI
   vid `data/measure/half.json` a diski og fellur ef thad rekur. An
   thess prófs vaeri taflan agiskun med maelingar-utliti — versta
   utkoman i thessu verkefni.

   Og kafli 3 ver thrjar reglur sem MA EKKI brota:
     1. omaeld logun faer ENGA tolu
     2. omarktaek logun ma ekki lesa eins og marktaek
     3. varfaerna talan er birt, ekki besta
   ============================================================ */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { HALF_LAB, shapeKeyOf, scoringKeyOf, describeLeague, measuredEdge, edgeSentence }
  from "../src/rulebasis.js";

const DATA = path.resolve(new URL(".", import.meta.url).pathname, "..", "data");
let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? "ok  " : "FAIL"} ${m}`); if (!c) fail++; };

/* ---------- 1. BAKADA TAFLAN MA EKKI REKA FRA DISKINUM ---------- */
console.log("1. bakada taflan gegn data/measure/half.json");
{
  const p = path.join(DATA, "measure", "half.json");
  if (!existsSync(p)) {
    ok(false, "half.json vantar — keyrdu scripts/half-lab.mjs");
  } else {
    const H = JSON.parse(readFileSync(p, "utf8"));
    let checked = 0, drift = [];
    for (const [shape, byFmt] of Object.entries(HALF_LAB)) {
      const src = H.results[shape];
      if (!src) { drift.push(`${shape} er ekki i skranni`); continue; }
      for (const [fmt, baked] of Object.entries(byFmt)) {
        const q = src[fmt];
        if (!q) { drift.push(`${shape}/${fmt} vantar`); continue; }
        /* VARFAERNA TALAN: lakari ADP-vikmarkid af tveimur, valid a
           |t|. Regla 3 er thvi profud a GILDUNUM sjalfum, ekki bara
           i athugasemd. */
        const worse = Math.abs(q.adpPpr.t) < Math.abs(q.adpStd.t) ? q.adpPpr : q.adpStd;
        checked++;
        if (Math.abs(worse.mean - baked.mean) > 0.05)
          drift.push(`${shape}/${fmt} mean ${baked.mean} != ${worse.mean}`);
        if (Math.abs(worse.t - baked.t) > 0.002)
          drift.push(`${shape}/${fmt} t ${baked.t} != ${worse.t}`);
        if (worse.wins !== baked.wins || worse.years !== baked.years)
          drift.push(`${shape}/${fmt} ${baked.wins}/${baked.years} != ${worse.wins}/${worse.years}`);
      }
    }
    /* THEKJA ER FULLYRDING, EKKI LOGGA: falli talan nidur hefur
       einhver eytt ur toflunni og profid a ad segja fra thvi. */
    ok(checked === 6, `${checked} gildi borin saman (a ad vera 6)`);
    ok(drift.length === 0, drift.length ? `REKUR: ${drift.join(" · ")}`
      : "hvert gildi er nakvaemlega thad sem maelingin skrifadi");
  }
}

/* ---------- 2. RAUNVERULEGU DEILDIRNAR ---------- */
console.log("\n2. deildirnar sem notandinn draftar i");
{
  const PAT = { teams: 10, scoring: "ppr",
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
    rounds: 15, superflex: false };
  const SOF = { teams: 12, scoring: "half-ppr",
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
    rounds: 14, superflex: false };

  ok(shapeKeyOf(PAT) === "10-2flex", `Patriots -> ${shapeKeyOf(PAT)}`);
  ok(shapeKeyOf(SOF) === "12-2flex", `Sofahetjur -> ${shapeKeyOf(SOF)}`);
  ok(scoringKeyOf(SOF) === "half", `half-ppr -> ${scoringKeyOf(SOF)}`);

  /* KJARNI THESSA PROFS. `unmeasuredShape` i sleeper-league.js las
     ADEINS shapes_sleeper.json og sagdi thvi "not one of the shapes"
     um BADAR deildir notandans — eina vidvorunin sem badar bàru, og
     hun var OSONN. Falli thetta er fals-vidvorunin komin aftur. */
  const p = measuredEdge(PAT), s = measuredEdge(SOF);
  ok(p && p.exact && p.significant && p.mean === 188.0,
    `Patriots ER maeld: +${p && p.mean} (t=${p && p.t}) — engin fals-vidvorun`);
  ok(s && s.exact && s.significant && s.mean === 147.4,
    `Sofahetjur ER maeld: +${s && s.mean} (t=${s && s.t})`);
  ok(p.source === "half-lab" && s.source === "half-lab",
    "og badar koma ur half-lab, ekki ur naestu logun");

  /* Lesmalid sem ma setja undir urskurdinn. */
  const sent = edgeSentence(SOF);
  ok(sent.measured && sent.significant && /147\.4/.test(sent.text),
    `setningin ber toluna: "${sent.text.slice(0, 72)}…"`);
  ok(/10 of 11|10 of 11 seasons/.test(sent.text),
    "og urtaksstaerdina (10 af 11 timabilum)");

  ok(describeLeague(PAT) === "10 teams · PPR · QB/2RB/2WR/TE/2FLEX/K/DST · 15 rounds",
    `lesmalid: "${describeLeague(PAT)}"`);
  ok(/half-PPR/.test(describeLeague(SOF)) && !/K/.test(describeLeague(SOF).split("·")[2]),
    `Sofahetjur an K/DST: "${describeLeague(SOF)}"`);
}

/* ---------- 3. THRJAR REGLUR SEM MA EKKI BROTA ---------- */
console.log("\n3. reglurnar sjalfar");
{
  const shapes = existsSync(path.join(DATA, "shapes_sleeper.json"))
    ? JSON.parse(readFileSync(path.join(DATA, "shapes_sleeper.json"), "utf8")) : null;
  ok(shapes != null, "shapes_sleeper.json er til (forsenda kaflans)");

  /* REGLA 1: OMAELD LOGUN FAER ENGA TOLU. 11 lid var aldrei maeld. */
  const odd = { teams: 11, scoring: "ppr", starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 },
                rounds: 15, superflex: false };
  ok(measuredEdge(odd, shapes) === null, "11-lida deild -> null, ekki naesta tala");
  const os = edgeSentence(odd, shapes);
  ok(!os.measured && !/\+\d/.test(os.text),
    `og setningin ber ENGA tolu: "${os.text.slice(0, 60)}…"`);

  /* Og an `shapes` er svarid lika null fyrir logun sem half-lab naer
     ekki yfir — MINNI THEKJA, ENGIN AGISKUN. */
  const std12 = { teams: 12, scoring: "ppr", starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 },
                  rounds: 15, superflex: false };
  ok(measuredEdge(std12, null) === null,
    "an shapes-skrarinnar er 12-std null, ekki gisk ur 12-2flex");
  const m12 = measuredEdge(std12, shapes);
  ok(m12 && m12.exact && m12.source === "shape-lab" && m12.mean === 221.6,
    `med skranni er 12-std +${m12 && m12.mean} ur shape-lab`);

  /* REGLA 2: OMARKTAEK LOGUN MA EKKI LESA EINS OG MARKTAEK.
     `ppr|12-sflex` er +140,5 med t=1,80 a 5 timabilum (throskuldur
     2,776), svo hun ER maeld en EKKI marktaek. */
  const sflex = { teams: 12, scoring: "ppr", starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 1 },
                  rounds: 15, superflex: true };
  const q = measuredEdge(sflex, shapes);
  ok(q && q.shape === "12-sflex" && q.exact && !q.significant,
    `superflex er maeld (+${q && q.mean}) en EKKI marktaek (t=${q && q.t})`);
  const ss = edgeSentence(sflex, shapes);
  ok(ss.measured && !ss.significant && /unproven|not significantly/.test(ss.text),
    `og setningin segir thad: "${ss.text.slice(0, 70)}…"`);
  ok(!/\+140/.test(ss.text),
    "og birtir EKKI stigatoluna — omarktaek tala ma ekki lesa sem stig");

  /* HALF-PPR I LOGUN SEM HALF-LAB NAER EKKI YFIR -> VIKMORK, ekki
     punktur. Half var aldrei maeld i shape-lab. */
  const half12 = { teams: 12, scoring: "half-ppr",
                   starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 }, rounds: 15,
                   superflex: false };
  const h = measuredEdge(half12, shapes);
  ok(h && !h.exact && h.mean === null && Array.isArray(h.bracket),
    `half i 12-std er BIL [${h && h.bracket}], engin punkttala`);
  ok(h && h.bracket[0] === 221.6 && h.bracket[1] === 234,
    "og bilid er akkurat maeldu ppr- og standard-tolurnar");
  ok(h && h.significant === true, "badir endar marktaekir -> bilid er marktaekt");

  /* Og bil MED omarktaekum enda er EKKI marktaekt. `16-std` er
     +214,5 marktaekt i ppr en +169,0 med t=1,11 i standard. */
  const half16 = { teams: 16, scoring: "half-ppr",
                   starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 }, rounds: 15,
                   superflex: false };
  const h16 = measuredEdge(half16, shapes);
  ok(h16 && h16.significant === false,
    `bil med omarktaekum enda er EKKI marktaekt (${h16 && h16.bracket})`);

  /* Og tomt inntak fellur ekki. */
  ok(measuredEdge(null) === null && measuredEdge({}) === null,
    "tomt inntak -> null, ekki hrun");
  ok(describeLeague(null) === "no league", "og lesmalid thegir lika");
}

/* ============================================================
   OÞEKKT STIGAGJOF MA EKKI FA PPR-TOLUNA
   ============================================================
   `scoringKeyOf` skiladi `"ppr"` sjalfgefid. `measuredEdge` notar
   lykilinn til ad fletta upp i MAELDU toflunum, svo deild med
   `scoring: null` hefdi fengid +188,0 stiga "maelda" tolu UR PPR-TOFLUNNI
   — tala ur odru sniði, birt undir heiti thessarar deildar.

   `usageblend.scoringKey` skilar `null` i sama tilfelli; thaer voru
   osamhljoda og athugasemdin thar nefndi einmitt muninn.

   ÞETTA GETUR EKKI GERST I DAG (`normalizeLeague` hvitlistar `scoring`),
   svo thetta er VARNAGLI. Hann er profadur svo hann verdi ekki
   fjarlaegdur sem "daudur kodi" — sama rok og `AVAIL_KNOWN`: ovirk vorn
   er vorn.                                                            */
console.log("\nothekkt stigagjof faer ENGA tolu");
{
  const mk = (scoring) => ({ teams: 10, scoring,
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
    flexPos: ["RB", "WR", "TE"] });

  /* Fyrst: thekktu snidin VERDA ad gefa tolu — annars vaeri `null` bara
     "fallid virkar aldrei" og fullyrdingarnar nedan einskis virdi. */
  const known = { ppr: "ppr", "half-ppr": "half", standard: "standard" };
  for (const [sc, key] of Object.entries(known)) {
    ok(scoringKeyOf(mk(sc)) === key, `${sc} -> "${key}"`);
    const e = measuredEdge(mk(sc));
    ok(e != null && e.mean != null,
      `og ${sc} faer maelda tolu (${e ? e.mean : "null"})`);
  }

  /* Sidan: othekkt gefur ENGA tolu — hvorki lykil ne edge. */
  for (const bad of [null, undefined, "tunglid", 42, "", "PPR", "half"]) {
    ok(scoringKeyOf(mk(bad)) === null,
      `\`scoring: ${JSON.stringify(bad)}\` -> lykill \`null\``);
    ok(measuredEdge(mk(bad)) === null,
      `og ENGIN maeld tala (annars vaeri PPR-talan birt sem hennar)`);
  }
  ok(scoringKeyOf(null) === null && scoringKeyOf(undefined) === null,
    "og deild sem er sjalf `null` fellur ekki");

  /* Og talan sem hefdi lekid er STAERD sem sest: PPR og standard eru
     ~29 stigum ofan i sundur, svo thogul PPR-uppfletting a
     standard-deild vaeri ekki namundunar-villa. */
  const p = measuredEdge(mk("ppr")), st = measuredEdge(mk("standard"));
  ok(p && st && Math.abs(p.mean - st.mean) > 10,
    `og snidin eru raunverulega olik (${p.mean} a moti ${st.mean}) — ` +
    "thogul uppfletting i rangri toflu vaeri EKKI namundun");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
