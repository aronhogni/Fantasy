/* ============================================================
   TVITEKNINGAR SEM MUNDU REKA I SUNDUR — VORDURINN

   HVERS VEGNA ThETTA SAFN VARD TIL (11.8.2026): fjorir hlutir voru
   skilgreindir a TVEIMUR eda ThREMUR stodum, og i thremur tilfellum voru
   afritin ThEGAR OLIK:

     1. `normName`      — src/stats.js OG src/bsd.js, BADAR `export`-adar
                          undir sama nafni, badar poradar vid somu FPL-nofn.
                          OLIKAR: "O'Riley" -> [oriley] a moti [riley].
     2. `BSD_TEAM`      — scripts/fetch-bsd.mjs, fetch-bsd-teams.mjs OG
                          fetch.mjs (`BSD_TEAM_SHORT`). Stafrett eins.
     3. MAELDU FASTARNIR `BIG_CHANCE_XG`/`IN_BOX_X` — src/bsd.js OG
                          fetch-bsd-teams.mjs, thratt fyrir ad hausinn a
                          src/bsd.js banni thad berum ordum. VERRA: profid
                          tests/team-stats.mjs flutti thá inn UR AFRITINU.
     4. lifandi timabils-rod — Compare.liveRow OG PlayerPanel.liveRecord.
                          OLIKAR a thremur svidum.

   ENGIN ThESSARA TVITEKNINGA GAT FALLID A NEINU PROFI. Thad er kjarni
   malsins: tvitekning er ekki villa i dag, hun er villa a ThEIM DEGI sem
   annad afritid er lagfaert og hitt ekki.

   ThRJAR REGLUR SEM ThETTA SAFN FYLGIR:

   A) ATHUGASEMDIR ERU SKORNAR BURT ADUR EN LEITAD ER. Thetta er ekki
      snyrtimennska heldur nauðsyn: hver lagfaering her skildi eftir
      athugasemd sem VITNAR I GAMLA KODANN ("adur stod her BSD_TEAM = {18:
      \"ARS\" …}"), svo leit i hrаum texta hefdi fundid sinn eigin
      rokstudning og stadist. Handoffid nefndi thetta sem gildru sem beit
      endurtekid: "FULLYRDING SEM ATHUGASEMD GETUR UPPFYLLT ER EINSKIS
      VIRDI."

   B) ThEKJA ER FULLYRDING, EKKI LOGGA. Hvert svid telur skrarnar sem thad
      las og FELLUR ef talan hrynur. Safn sem prentar "0 skrar skannadar"
      og skilar 0 maelir EKKERT.

   C) ThAD SEM ER VILJANDI OLIKT ER VARID LIKA. `nameScore` er TVO OLIK
      foll (hlutfall a moti fjolda+0,5) og namundunin i PlayerPanel er
      ASETT. Vordur sem heimtar "eitt af ollu" myndi thvinga fram
      sameiningu sem MAELINGIN HAFNAR — svo hann heimtar hid gagnstaeda thar.
   ============================================================ */
import { readFileSync, readdirSync } from "node:fs";

const R = new URL("../", import.meta.url).pathname;
const read = p => readFileSync(R + p, "utf8");

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓ " + msg); }
                            else { fail++; console.log("  ✗ " + msg); } };

/* Skerum athugasemdir burt — sja reglu A. Strengir eru latnir i fridi:
   their geta borid kóda-lik brot en engin skilgreining lifir i streng.  */
const strip = src => src
  .replace(/\/\*[\s\S]*?\*\//g, "")      // /* ... */
  .replace(/(^|[^:])\/\/[^\n]*/g, "$1"); // // ...  (":" hlifir "http://")

/* ---------------------------------------------------------------
   1. NORMNAME ER SKILGREINT A EINUM STAD
   --------------------------------------------------------------- */
console.log("\n=== 1. NAFNA-NORMUN: EIN SKILGREINING ===");
{
  const files = ["src/names.js", "src/stats.js", "src/bsd.js"];
  let scanned = 0;
  const defs = [];
  for (const f of files) {
    const s = strip(read(f));
    scanned++;
    /* Skilgreining = `const normName =` eda `function normName(`.
       ENDURFLUTNINGUR (`export { normName } from`) er EKKI skilgreining. */
    const isDef = /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+normName\s*=/.test(s)
               || /(?:^|\n)\s*(?:export\s+)?function\s+normName\s*\(/.test(s);
    if (isDef) defs.push(f);
  }
  ok(scanned === 3, `skannadi 3 skrar (${scanned})`);
  ok(defs.length === 1, `normName skilgreint a EINUM stad (${defs.length}: ${defs})`);
  ok(defs[0] === "src/names.js", `og thad er src/names.js (${defs[0]})`);

  const { normName: a } = await import("../src/stats.js");
  const { normName: b } = await import("../src/bsd.js");
  const { normName: c } = await import("../src/names.js");
  ok(a === c && b === c, "stats.js og bsd.js flytja SOMU fall-tilviljun inn");

  /* Hegdunin sem SKILDI thau ad — nu verdur hun ad vera eins. */
  const cases = ["Matt O'Riley", "O'Riley", "Jun'ai Byfield", "Dara O'Shea",
                 "Nico O'Reilly", "Luke O'Nien", "Jake O'Brien"];
  let same = 0;
  for (const x of cases) if (a(x) === b(x)) same++;
  ok(same === cases.length,
     `urfellingarmerki eins i badum (${same}/${cases.length})`);
  ok(a("Matt O'Riley") === "matt oriley",
     `"Matt O'Riley" -> "matt oriley" (fekk "${a("Matt O'Riley")}")`);
  ok(!a("O'Riley").includes(" "),
     "urfellingarmerki er FELLT UT, ekki sett i bil (annars tapast 'o'-taknid)");
}

/* ---------------------------------------------------------------
   2. SKORUNAR-FOLLIN ERU VILJANDI TVO — REGLA C
   --------------------------------------------------------------- */
console.log("\n=== 2. nameScore ER VILJANDI TVO OLIK FOLL ===");
{
  const s = await import("../src/stats.js");
  const b = await import("../src/bsd.js");
  ok(s.nameScore !== b.nameScore, "thau eru EKKI sama fall (asett)");
  /* bsd skilar HLUTFALLI (0..1) thvi pairPlayers ber vid throskuldinn 0,6;
     stats skilar FJOLDA + 0,5 fyrir sameiginlegt eftirnafn.              */
  const bs = b.nameScore("Matt O'Riley", "Matt O'Riley");
  const ss = s.nameScore("Matt O'Riley", "Matt O'Riley");
  ok(bs === 1, `bsd.nameScore er hlutfall, fullt hus = 1 (${bs})`);
  ok(ss > 1, `stats.nameScore er fjoldi + eftirnafns-bonus, > 1 (${ss})`);
  ok(bs !== ss, "og thau skila SITTHVORU — ekki sameina thau");
}

/* ---------------------------------------------------------------
   3. LIDATAFLAN OG MAELDU FASTARNIR — EITT AFRIT
   --------------------------------------------------------------- */
console.log("\n=== 3. BSD_TEAM OG MAELDU FASTARNIR: EIN HEIMILD ===");
{
  const dir = R + "scripts/";
  const scripts = readdirSync(dir).filter(f => f.endsWith(".mjs"));
  ok(scripts.length >= 8, `fann pipeline-skriftur (${scripts.length})`);

  /* Bokstafleg tafla = rod sem parar BSD-id vid thristafa short.
     Leitad i KODA, ekki athugasemdum (regla A).                        */
  const TABLE_RE = /\b18\s*:\s*"ARS"/;
  const copies = [];
  let scanned = 0;
  for (const f of scripts) {
    scanned++;
    if (TABLE_RE.test(strip(read("scripts/" + f)))) copies.push("scripts/" + f);
  }
  ok(scanned === scripts.length, `skannadi allar (${scanned})`);
  ok(copies.length === 0,
     `ENGIN bokstafleg lidatafla i scripts/ (fann ${copies.length}: ${copies})`);

  const srcCopies = ["src/bsd.js", "src/stats.js", "src/names.js"]
    .filter(f => TABLE_RE.test(strip(read(f))));
  ok(srcCopies.length === 1 && srcCopies[0] === "src/bsd.js",
     `taflan bur i src/bsd.js og hvergi annars (${srcCopies})`);

  /* Maeldu fastarnir: engin skrifta ma skilgreina thá upp a nytt. */
  const constDefs = [];
  for (const f of scripts) {
    const s = strip(read("scripts/" + f));
    if (/(?:const|let|var)\s+(?:BIG_CHANCE_XG|IN_BOX_X)\s*=/.test(s))
      constDefs.push("scripts/" + f);
  }
  ok(constDefs.length === 0,
     `enginn skrifta skilgreinir BIG_CHANCE_XG/IN_BOX_X (fann ${constDefs})`);

  /* OG ThAD SEM VAR RAUNVERULEGA HAETTULEGT: profid las afritid. */
  const b = await import("../src/bsd.js");
  const t = await import("../scripts/fetch-bsd-teams.mjs");
  ok(t.BIG_CHANCE_XG === b.BIG_CHANCE_XG && t.IN_BOX_X === b.IN_BOX_X,
     `fetch-bsd-teams endurflytur SOMU fasta (${t.BIG_CHANCE_XG}, ${t.IN_BOX_X})`);
  ok(Object.keys(b.BSD_TEAM).length === 20, `taflan ber 20 lid (${Object.keys(b.BSD_TEAM).length})`);
  ok(b.BSD_TEAM[17] === "MUN" && b.BSD_TEAM[12] === "MCI",
     "Man United og Man City eru RETT skilin (fuzzy porun felldi thau saman)");
}

/* ---------------------------------------------------------------
   4. LIFANDI TIMABILS-ROD — EIN UTFAERSLA, EN NAMUNDUNIN HELDUR
   --------------------------------------------------------------- */
console.log("\n=== 4. liveSeasonRow: EIN UTFAERSLA ===");
{
  const cmp = strip(read("src/Compare.jsx"));
  const pan = strip(read("src/PlayerPanel.jsx"));
  const st  = strip(read("src/stats.js"));

  ok(/export function liveSeasonRow\s*\(/.test(st),
     "liveSeasonRow er skilgreint i stats.js");

  /* Hvorugt vidmotid ma BYGGJA rodina upp a nytt.
     FYRSTA UTGAFA ThESSARAR FULLYRDINGAR VAR ROENG og hun FELL — a rettum
     kodа. Hun taldi hvert skipti sem svid eins og `expected_goals_conceded`
     kom fyrir, og fekk 11 i Compare.jsx. Thau 11 eru DALKA-SKILGREININGAR
     (`get: r => r.expected_goals_conceded`) sem lesa UR RODINNI — einmitt
     thad sem thessi vidmot eiga ad gera.

     Tvitekningin sem a ad fella profid er ONNUR: ad byggja rodina UR HRAA
     leikmanninum, `num(p.<svid>)` / `n(p.<svid>)`. ThAD er mynstrid sem var
     afritad, og thad er thvi mynstrid sem er maelt.

     (Lardomurinn er CLAUDE.md 5b: fullyrding sem faellur a rettum koda er
     jafn gagnslaus og fullyrding sem stenst a ollum koda.)              */
  const BUILD_RE = /\b[a-z]+\(\s*p\.(?:expected_goals_conceded|expected_goal_involvements|yellow_cards|clean_sheets|goals_conceded)\b/g;
  const cmpBuild = (cmp.match(BUILD_RE) || []).length;
  const panBuild = (pan.match(BUILD_RE) || []).length;
  ok(cmpBuild === 0, `Compare.jsx byggir ekki rodina ur hraum leikmanni (${cmpBuild})`);
  ok(panBuild === 0, `PlayerPanel.jsx byggir ekki rodina ur hraum leikmanni (${panBuild})`);
  /* Og fullyrdingin ma ekki vera tóm: mynstrid VAR tharna adur (regla 2 i
     CLAUDE.md 5b — neikvaed fullyrding verdur ad nefna streng sem var
     sannanlega til). stats.js byggir rodina og verdur ThVI ad hitta.    */
  const stBuild = (st.match(BUILD_RE) || []).length;
  ok(stBuild >= 4,
     `mynstrid er raunverulegt og finnst i stats.js (${stBuild}) — annars maeldi profid ekkert`);
  ok(/liveSeasonRow/.test(cmp), "Compare.jsx notar liveSeasonRow");
  ok(/liveSeasonRow/.test(pan), "PlayerPanel.jsx notar liveSeasonRow");

  /* `num` ma ekki vera endurskilgreint i PlayerPanel. */
  ok(!/(?:const|let|var)\s+n\s*=\s*v\s*=>/.test(pan),
     "PlayerPanel skilgreinir EKKI sitt eigid `n` (var afrit af num)");

  /* REGLA C: KJARNINN SKILAR HRAU, PlayerPanel NAMUNDAR.
     Hefdi namundunin verid flutt i kjarnann fengi Compare TVOFALDA
     namundun. Thetta er thvi ekki stilspurning heldur talnaspurning.  */
  const { liveSeasonRow } = await import("../src/stats.js");
  const raw = liveSeasonRow({ minutes: 90, starts: 3, defensive_contribution: 3.145 });
  ok(raw.dc_per_start != null && String(raw.dc_per_start).length > 4,
     `kjarninn skilar ONAMUNDADRI dc_per_start (${raw.dc_per_start})`);
  ok(/toFixed\(2\)/.test(pan), "PlayerPanel namundar sjalft (parity vid geymd timabil)");

  /* Og geymdu timabilin sem namundunin er til ad passa vid. */
  let stored = null;
  try {
    const f = JSON.parse(read("data/player_seasons.json"));
    for (const byS of Object.values(f.players || {})) {
      for (const r of Object.values(byS || {}))
        if (r && typeof r.dc_per_start === "number" && r.dc_per_start % 1 !== 0) { stored = r.dc_per_start; break; }
      if (stored != null) break;
    }
  } catch { /* skrain ma vanta */ }
  ok(stored == null || String(stored).split(".")[1].length <= 2,
     `geymd timabil bera <=2 aukastafi (daemi ${stored}) — thvi namundar PlayerPanel`);
}

console.log(`\n========================================`);
console.log(`NIÐURSTAÐA: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
