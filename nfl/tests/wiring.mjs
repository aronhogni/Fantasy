/* ============================================================
   wiring.mjs — ER HREINA ROKFRAEDIN RAUNVERULEGA TENGD?

   ÞETTA SAFN VER EINA GATID SEM ENGIN ONNUR PROF NA YFIR: hreint fall
   getur verid FULLKOMLEGA PROFAD og samt ALDREI KALLAD.

   Fordaemið er skjalad i FPL-verkefninu (CLAUDE.md, kafli 3):
   markadsthyngdin var reiknud ur `xga` thegar `diff` vantadi, og thegar
   varaleidin hvarf var markadslidurinn **daudur i appinu i heila viku
   thott OLL PROFIN VAERU GRAEN** — thau profudu formuluna, ekki hvort
   hun faengi nytileg gogn.

   Sama aett er nu i nfl/. `src/draft-sync.js` ber `pickSignature` og
   `pollDelay`; `tests/draft-sync.mjs` profar thau i 14 fullyrdingum og
   thau eru RETT. En ekkert prof stadfestir ad `DraftBoard` KALLI thau.
   Faeri pollunin aftur i `setInterval(..., 5000)`, eda hyrfi
   fingrafars-hlidid, yrdi:
     · `tests/draft-sync.mjs`  AFRAM GRAENT (follin eru enn rett)
     · `tests/sleeper.mjs`     AFRAM GRAENT (samstillingin virkar enn)
     · mock-draftid             HAEGT aftur, og 200 rada tafla endur-
                                teiknud a 5 sek fresti fyrir ekkert
   Notandinn tilkynnti thetta einmitt sem villu ("thad updateast of
   haegt hja mer leikmannalistinn"), svo thetta er ekki tilgata.

   ============================================================
   HVERS VEGNA ÞETTA ER AST-PROF OG EKKI DOM-PROF
   ============================================================
   Pollunar-hradinn er skilgreindur af TIMANUM SEM LIDUR. DOM-prof sem
   aetlar ad greina 1.500 ms fra 5.000 ms thyrfti ad bida raunverulegar
   sekundur i hverri keyrslu og vaeri flokkandi i hlutfalli vid alagið a
   vélinni — og "flöktandi prof er verra en ekkert" (nfl/README 6d).
   Hér er thvi spurt hvort TENGINGIN se til, ekki hversu hrod hun er;
   hradann sjalfan profar `draft-sync.mjs` a hreinu falli.

   MEÐ ÞEIM FYRIRVARA SEM ÞVI FYLGIR, OG HANN ER SKRIFADUR HER SVO
   ENGINN LESI MEIRA UR ÞESSU EN ER: AST-prof les KODA, ekki skjainn.
   Thad getur sagt "kallid er i skranni"; thad getur EKKI sagt "kallid
   keyrir i réttri grein". Islensku strengirnir i FPL-appinu fundust med
   thvi ad KEYRA appid og lesa thad, ekki med thvi ad skanna kodann.
   ============================================================ */

import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const SRC = path.join(ROOT, "src");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

const read = (f) => readFileSync(path.join(SRC, f), "utf8");

/* Athugasemdir eru STRIPPADAR ADUR EN LEITAD ER.
   AN THESSA ER PROFID ONYTT: hver einasta skra i thessu repo-i ber
   langar athugasemdir sem NEFNA follin sem thaer nota, svo `grep` a
   `pollDelay(` hefdi fundid athugasemdina sem SEGIR fra pollunni og
   verid graent thott kallid sjalft vaeri farid. Thad er thogul tom
   fullyrding af nakvaemlega theirri gerd sem CLAUDE.md 5b lysir.

   Strengir eru EKKI strippadir — vid leitum ekki i theim, og ad
   thatta strengi rett (fleyti-slaskar, sniðmats-strengir) er sitt eigid
   vandamal sem `no-icelandic.mjs` i FPL-verkefninu laerdi a erfida
   hattinn: fyrsta utgafan notadi regex og gleypti 200 linur af koda
   sem einn "streng". */
function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
}

/* ============================================================
   1. LIFANDI POLLUNIN — `draft-sync.js` VERDUR AD VERA TENGD
   ============================================================ */
console.log("\n1. pollunin er tengd");
{
  const raw = read("DraftBoard.jsx");
  const code = stripComments(raw);

  ok(/from\s+["']\.\/draft-sync\.js["']/.test(code),
    "`DraftBoard.jsx` flytur inn `draft-sync.js`");

  for (const fn of ["pickSignature", "pollDelay"]) {
    /* Kall, ekki nefning: `fn(` med svigi. Innflutningslinan sjalf er
       undanskilin svo hun geti ekki talid sem kall. */
    const withoutImports = code.replace(/^\s*import[\s\S]*?;\s*$/gm, " ");
    const calls = (withoutImports.match(new RegExp(`\\b${fn}\\s*\\(`, "g")) || []).length;
    ok(calls >= 1, `\`${fn}(\` er KALLAD i bordinu (${calls})`);
  }

  /* Pollunin ma ekki fara aftur i fastan takt. `setInterval` med
     pollun var einmitt villan sem notandinn tilkynnti. */
  ok(!/setInterval\s*\(/.test(code),
    "engin `setInterval(` i bordinu — takturinn er adaptifur");
  ok(/setTimeout\s*\(/.test(code),
    "og `setTimeout(` er thad sem drifur hann");

  /* Fingrafars-hlidid: `onPicks` ma ADEINS vera kallad thegar eitthvad
     breyttist. Hvarf hlidid myndi 200 rada tafla endurteiknast a 5 sek
     fresti allt draftid fyrir engar upplysingar. */
  ok(/lastSig/.test(code), "fingrafarid er geymt milli pollana (`lastSig`)");
  ok(/lastMove/.test(code), "og timi sidustu breytingar (`lastMove`)");
}

/* ============================================================
   2. MAELDA FORSKOTID — `rulebasis.js` VERDUR AD VERA TENGD
   ============================================================
   `rulebasis.js` ber toluna sem svarar "hvad er rodin thess virdi i
   ÞESSARI deild" (+188,0 i 10-lida tveggja-FLEX PPR, +147,4 i 12-lida
   half). `tests/rulebasis.mjs` ver toluna sjalfa. Hér er varid ad hun
   se BIRT — annars er hun maeld, profud og osynileg.                */
console.log("\n2. maelda forskotid er tengt");
{
  const code = stripComments(read("DraftBoard.jsx"));
  ok(/from\s+["']\.\/rulebasis\.js["']/.test(code),
    "`DraftBoard.jsx` flytur inn `rulebasis.js`");
  const withoutImports = code.replace(/^\s*import[\s\S]*?;\s*$/gm, " ");
  ok(/\bedgeSentence\s*\(/.test(withoutImports),
    "`edgeSentence(` er KALLAD");

  /* Reglan sem einingin ber: `significant: false` -> talan ma EKKI
     birtast. Thess vegna er `text` birt eins og hun kemur. Vaeri
     `mean` birt beint gaeti omarktaek tala lesist eins og marktaek —
     og `mean` er `null` thegar `exact === false`, svo `null` faeri a
     skjainn. */
  ok(!/\{\s*\w+\.mean\s*\}/.test(withoutImports),
    "`mean` er EKKI birt beint (omarktaek tala ma ekki lesast eins og maeld)");
}

/* ============================================================
   3. LIFUNIN A BORDINU — `advice.js` VERDUR AD VERA TENGD
   ============================================================
   Litun bordsins les `survivalProb` og `nextOwnPick`. Baedi eru profud
   i `sleeper-league.mjs` kafla 9 sem HREIN foll; hér er varid ad
   bordid kalli thau.                                              */
console.log("\n3. litunin er tengd");
{
  const code = stripComments(read("DraftBoard.jsx"));
  const withoutImports = code.replace(/^\s*import[\s\S]*?;\s*$/gm, " ");
  for (const fn of ["nextOwnPick", "survivalProb"]) {
    ok(new RegExp(`\\b${fn}\\s*\\(`).test(withoutImports), `\`${fn}(\` er kallad`);
  }
  ok(/reach-hi/.test(code) && /reach-lo/.test(code),
    "og threpin eru bædi notud (`reach-hi`, `reach-lo`)");

  /* ------------------------------------------------------------
     OG BORDID OG KASSINN VERDA AD LESA SOMU TOLUNA.
     ------------------------------------------------------------
     `tests/advice.mjs` kafli 12 ver ad `recommend` NOTI `nextPick`
     thegar thad er gefid. Thad prof getur EKKI sagt hvort appid gefi
     thad — og thad var einmitt villan: badar afleidslur voru rettar og
     bædi profud, en `NextPick` sendi klukkuvalid i stad saetisins og
     skjarinn bar tvaer tolur (#27 og 40 i somu deild).

     Hyrfi `nextPick={...}` ur kallinu myndi `recommend` falla thegjandi
     i afleidsluna og gamla villan vaeri komin aftur MED OLL PROF GRAEN.
     Þess vegna er tengingin fullyrding hér.                          */
  ok(/nextPick:\s*nextOwn/.test(withoutImports),
    "`recommend` faer `nextPick: nextOwn` — bordid og kassinn lesa somu toluna");
  ok(/<NextPick[^>]*nextOwn=\{nextOwn\}/.test(code.replace(/\n/g, " ")),
    "og `nextOwn` er raunverulega sent nidur i `NextPick`");
}

/* ============================================================
   4. DEILDIN — `sleeper-league.js` VERDUR AD VERA TENGD
   ============================================================ */
console.log("\n4. innflutningurinn er tengdur");
{
  const code = stripComments(read("DraftBoard.jsx"));
  const withoutImports = code.replace(/^\s*import[\s\S]*?;\s*$/gm, " ");
  for (const fn of ["leagueFromSleeper", "teamsFromLeague"]) {
    ok(new RegExp(`\\b${fn}\\s*\\(`).test(withoutImports), `\`${fn}(\` er kallad`);
  }
  const app = stripComments(read("App.jsx"));
  ok(/\bnormalizeLeague\s*\(/.test(app.replace(/^\s*import[\s\S]*?;\s*$/gm, " ")),
    "`App.jsx` thvingar deildina gegnum `normalizeLeague(`");
  ok(/\bD\.scoped\s*\(|\bscoped\s*\(/.test(
       stripComments(read("DraftBoard.jsx")).replace(/^\s*import[\s\S]*?;\s*$/gm, " ")),
    "og astandid er lyklad a deild (`scoped(`)");
}

/* ============================================================
   5. PROFID VERDUR SJALFT AD GETA BRUGDIST
   ============================================================
   Safn sem les skrar getur thagnad ef slodin er skokk — tha finnur
   `grep` ekkert, hver fullyrding fellur og thad SEST. Verra tilfellid
   er hitt: ad athugasemda-strippunin virki EKKI, thvi tha finnur
   profid follin i athugasemdunum og verdur graent an ad snerta kodann.
   Þessi kafli profar MAELITAEKID.                                  */
console.log("\n5. maelitaekid sjalft");
{
  const probe = `
/* Athugasemd sem NEFNIR pollDelay( og pickSignature( og setInterval( */
// pollDelay( i einnar-linu athugasemd
const x = 1;
`;
  const stripped = stripComments(probe);
  ok(!/pollDelay\s*\(/.test(stripped),
    "athugasemdir eru raunverulega strippadar (annars vaeri allt hér ofan tomt)");
  ok(!/setInterval\s*\(/.test(stripped),
    "og `setInterval(` i athugasemd telur ekki sem kall");
  ok(/const x = 1/.test(stripped), "en kodinn stendur eftir");

  /* Og skrarnar sem eru lesnar VERDA ad vera til og ekki tomar. */
  for (const f of ["DraftBoard.jsx", "App.jsx", "draft-sync.js",
                   "rulebasis.js", "advice.js", "sleeper-league.js"]) {
    let n = 0;
    try { n = read(f).length; } catch { n = 0; }
    ok(n > 500, `${f} er lesin (${n} b)`);
  }
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
