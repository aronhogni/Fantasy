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

import { readFileSync, readdirSync } from "node:fs";
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
/* ============================================================
   INNFLUTNINGS-STRIPPUNIN VAR SJALF BILUD — LOGUD 13.8.2026
   ============================================================
   Hver kafli hér notadi
     `stripImports(code)`
   til ad undanskilja innflutningslinurnar svo thaer geti ekki talid sem
   kall. `[\s\S]*?` fer YFIR LINUSKIL, svo med `m`-flagginu leitar hun ad
   naesta `;` sem endar linu — hvar sem hann er. I `App.jsx` at hun
   **2.749 stafi**, tha.m. allan `<Dashboard …/>` og `<MyTeam …/>`.

   ÞAD VAR ÞOGULT. Fullyrdingarnar sem eftir voru fundu sin kall i thvi
   sem LIFDI og urdu graenar; safnid sem er til thess ad greina "kall er
   horfid" gat ekki greint "helmingur skrarinnar er horfinn". Nakvaemlega
   sama aett og `react-warnings.mjs` sem heimsotti 0 af 22 vidmotum og var
   graent (CLAUDE.md 5b) — og hér i safninu sem er skrifad UM thá villu.

   Nu er strippunin LINU-BUNDIN: linur sem BYRJA a `import` eru felldar,
   og fjol-linu innflutningur heldur afram thar til lina endar a `;`.
   Ekkert er fellt sem er ekki innflutningur, og `assertStrip` nedan
   fullyrdir thad berum ordum.                                        */
function stripImports(src) {
  const out = [];
  let inImport = false;
  for (const line of src.split("\n")) {
    if (!inImport && /^\s*import\b/.test(line)) {
      /* Ein lina sem endar a `;` er buin; annars heldur hun afram. */
      if (!/;\s*$/.test(line)) inImport = true;
      out.push(" ");
      continue;
    }
    if (inImport) {
      if (/;\s*$/.test(line)) inImport = false;
      out.push(" ");
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

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
    const withoutImports = stripImports(code);
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
   ÞESSARI deild" (+186,1 i 10-lida tveggja-FLEX PPR, +147,4 i 12-lida
   half). `tests/rulebasis.mjs` ver toluna sjalfa. Hér er varid ad hun
   se BIRT — annars er hun maeld, profud og osynileg.                */
console.log("\n2. maelda forskotid er tengt");
{
  const code = stripComments(read("DraftBoard.jsx"));
  ok(/from\s+["']\.\/rulebasis\.js["']/.test(code),
    "`DraftBoard.jsx` flytur inn `rulebasis.js`");
  const withoutImports = stripImports(code);
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
  const withoutImports = stripImports(code);
  for (const fn of ["nextOwnPick", "survivalProb"]) {
    ok(new RegExp(`\\b${fn}\\s*\\(`).test(withoutImports), `\`${fn}(\` er kallad`);
  }
  ok(/reach-hi/.test(code) && /reach-lo/.test(code),
    "og threpin eru bædi notud (`reach-hi`, `reach-lo`)");

  /* ------------------------------------------------------------
     OG `adpSd` VERDUR AD FARA MED — RAUNVERULEGA STADALFRAVIKID
     ------------------------------------------------------------
     `advice.js` fullyrdir ad raunverulegt `stdev` fra FFC se notad
     ("ADP eitt dugar ekki"; `defaultSd` er BAKLEID). Stokkbreytingin
     `survivalProb(r.adp, r.adpSd, np) -> (r.adp, null, np)` LIFDI —
     ekkert prof sagdi ad breytan vaeri send.

     OG AHRIFIN ERU LITIL, SEM ER LIKA VERT AD SEGJA: maelt a
     `data/adp.json` (257 leikmenn med `sd`) breyta 2-3 rader af 257 um
     lit vid val 27, `max |delta| = 0,155`. Fullyrdingin er thvi um
     TENGINGUNA og hun er skrifud sem slik — hun heldur ekki fram ad
     thetta se stor tala, thvi thad vaeri ekki satt.                   */
  ok(/survivalProb\s*\(\s*r\.adp\s*,\s*r\.adpSd\s*,/.test(withoutImports),
    "`survivalProb` faer `r.adpSd` — ekki `null`, sem er bakleidin");

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
  const withoutImports = stripImports(code);
  for (const fn of ["leagueFromSleeper", "teamsFromLeague"]) {
    ok(new RegExp(`\\b${fn}\\s*\\(`).test(withoutImports), `\`${fn}(\` er kallad`);
  }
  const app = stripComments(read("App.jsx"));
  const appBody = stripImports(app);
  ok(/\bnormalizeLeague\s*\(/.test(appBody),
    "`App.jsx` thvingar deildina gegnum `normalizeLeague(`");

  /* ============================================================
     `boardShape` MA EKKI VERA HREINT FALL SEM ENGINN KALLAR
     ============================================================
     Þetta er nakvaemlega gildran sem thetta safn er til fyrir. Fyrir
     20.8.2026 var logun draftsins LOKUD INNI i `DraftBoard` og notud
     adeins i snakk-tolurnar; VBD var afram reiknad ur deildinni, svo
     10-lida mock a 12-lida deild gaf varamanns-threpid WR29 -> WR42 og
     sex WR i sjo umferdum. Fallid ma thvi ekki adeins vera til: utkoman
     verdur ad fara BADA leidina — i `buildRows` (tolurnar) OG nidur i
     bordid (ljosid og textinn). Vaeri annad kallid fjarlaegt vaeru thau
     tvo osamhljoda og ekkert annad prof segdi fra thvi.              */
  ok(/\bboardShape\s*\(/.test(appBody),
    "`App.jsx` kallar `boardShape(` — logun draftsins er LEIDD UT, ekki gefin ser");
  ok(/buildFor\s*\(\s*board\.league\s*\)/.test(appBody),
    "og hun fer i `buildRows` (VBD-threpin), ekki adeins i snakk-tolurnar");
  ok(/board=\{board\}/.test(app),
    "og SAMA utkoma fer nidur i bordid, svo ljosid og tolurnar geta ekki rekid i sundur");
  ok(/\bstartersFromSlots\s*\(/.test(
       stripImports(stripComments(read("DraftBoard.jsx")))),
    "`slots_*` draftsins eru LESIN (`startersFromSlots(`) — mock ber sin eigin saeti");
  ok(/\bD\.scoped\s*\(|\bscoped\s*\(/.test(
       stripImports(stripComments(read("DraftBoard.jsx")))),
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

  /* ------------------------------------------------------------
     OG INNFLUTNINGS-STRIPPUNIN VERDUR AD FELLA ADEINS INNFLUTNING
     ------------------------------------------------------------
     Gamla regexid at 2.749 stafi ur `App.jsx` — tha.m. `<Dashboard/>` og
     `<MyTeam/>` — og thad var ÞOGULT: fullyrdingarnar sem eftir voru
     fundu sin kall i thvi sem lifdi og urdu graenar. Safn sem er til
     thess ad greina "kall er horfid" gat ekki greint "helmingur
     skrarinnar er horfinn".

     Þessi kafli maelir thad: hver skra er strippud og TALIN, og
     JSX-toggin sem eiga ad lifa VERDA ad lifa.                       */
  const probe2 = [
    'import React, { useState } from "react";',
    'import * as D from "./data.js";',
    'import {',
    '  a, b,',
    '} from "./x.js";',
    'const y = 2;',
    '  return <Foo bar={1} />;',
  ].join("\n");
  const st2 = stripImports(probe2);
  ok(!/from "\.\/data\.js"/.test(st2), "einnar-linu innflutningur er felldur");
  ok(!/from "\.\/x\.js"/.test(st2), "og fjol-linu innflutningur lika");
  ok(/const y = 2/.test(st2) && /<Foo bar=/.test(st2),
    "en kodinn OG JSX-id stendur eftir");

  for (const f of ["App.jsx", "DraftBoard.jsx"]) {
    const raw = stripComments(read(f));
    const cut = stripImports(raw);
    const lost = raw.length - cut.length;
    /* Innflutningsblokkin i thessum skrám er undir 1.500 stofum. Hafi
       meira horfid er strippunin ad eta koda — sem er nakvaemlega thad
       sem gerdist. */
    ok(lost < 1500,
      `${f}: strippunin felldi ${lost} stafi (< 1500 = adeins innflutningur)`);
  }
  /* Og toggin sjalf. Þetta er fullyrdingin sem hefdi fellt gamla regexid
     samstundis, og hun er hér thess vegna. */
  {
    const app = stripImports(stripComments(read("App.jsx")));
    for (const tag of ["DraftBoard", "Dashboard", "MyTeam", "PlayerTable"]) {
      ok(app.includes("<" + tag),
        `\`<${tag}\` lifir strippunina i App.jsx`);
    }
  }

  /* Og skrarnar sem eru lesnar VERDA ad vera til og ekki tomar. */
  for (const f of ["DraftBoard.jsx", "App.jsx", "draft-sync.js",
                   "rulebasis.js", "advice.js", "sleeper-league.js"]) {
    let n = 0;
    try { n = read(f).length; } catch { n = 0; }
    ok(n > 500, `${f} er lesin (${n} b)`);
  }
}

/* ============================================================
   6. `sleeperUser` VERDUR AD KOMAST TIL ALLRA SEM ÞARFNAST HANS
   ============================================================
   Notandanafnid var hift upp i `App.jsx` svo forsidan gaeti vitad hvert
   af tiu lidum er mitt. `Dashboard` fékk thad, `DraftBoard` fékk thad —
   `MyTeam` EKKI. Flipinn bad thvi notandann ad sla inn thad sem appid
   geymdi thegar: hann sagdi "No roster yet. Load a Sleeper league above"
   medan forsidan birti raunverulega hopinn fyrir somu deild.

   ÞETTA ER NAKVAEMLEGA GATID SEM ÞETTA SAFN ER TIL FYRIR og hvers vegna
   thad er AST-prof: `MyTeam` er FALINN flipi, svo `data-resilience` opnar
   hann i tomu astandi (thar sem "ekkert nafn" er RETT svar) og
   `smoke.test` snertir hann ekki. Ekkert DOM-prof gat sed muninn a
   "notandinn hefur ekki slegid inn nafn" og "appid gleymdi ad senda thad".

   Sama aett og hift `sync` og `imported` — ástand sem er hift UPP verdur
   ad vera sent NIDUR til hvers thess sem las thad adur, og listinn yfir
   thá er ekki i haus fallsins.                                        */
console.log("\n6. `sleeperUser` er sendur nidur");
{
  const app = stripComments(read("App.jsx"));
  const noImports = stripImports(app).replace(/\n/g, " ");

  /* Hver theirra thriggja sem les nafnid verdur ad FA thad. Talan er
     fullyrding: faerist vidmot yfir a fjorda stad a hun ad falla hér og
     verda skodud, ekki ad thagna. */
  /* SKANNI, EKKI REGEX. Fyrsta utgafa notadi `<Tag[^>]*sleeperUser=` og
     FELL a ollum thremur — thvi props eins og `onX={() => ...}` bera `>`
     inni i sviga og `[^>]*` stoppar thar. Regexid var ekki ad maela thad
     sem eg hélt; sama lexia og `no-icelandic.mjs` i FPL-verkefninu laerdi
     thegar `/["']/` inni i regexi let hana gleypa 200 linur sem einn
     streng. Hér er lesid fra taginu og fram ad naesta `<`, sem er
     enda-mork props-listans i praxis.                                 */
  const propsOf = (tag) => {
    const i = noImports.indexOf("<" + tag + " ");
    if (i < 0) return null;
    const rest = noImports.slice(i + 1);
    const end = rest.indexOf("<");
    return end < 0 ? rest : rest.slice(0, end);
  };
  const consumers = ["DraftBoard", "Dashboard", "MyTeam"];
  let wired = 0;
  for (const name of consumers) {
    const props = propsOf(name);
    ok(props != null, `\`<${name}\` er teiknad i App.jsx`);
    const has = props != null && /\bsleeperUser=/.test(props);
    ok(has, `\`${name}\` faer \`sleeperUser\``);
    if (has) wired++;
  }
  /* Og skanninn verdur ad geta brugdist — annars er thekjan hér ofan tom. */
  ok(propsOf("Schedule") != null && !/\bsleeperUser=/.test(propsOf("Schedule")),
    "og skanninn ser ad `Schedule` faer hann EKKI (maelitaekid virkar)");
  ok(wired === consumers.length,
    `THEKJA: ${wired} af ${consumers.length} vidmotum tengd`);

  /* Og vidtakandinn verdur ad TAKA VID honum — prop sem er sent i
     undirskrift sem nefnir hann ekki er thogul fjarvera. */
  for (const f of ["MyTeam.jsx", "Dashboard.jsx"]) {
    const sig = stripComments(read(f))
      .match(/function\s+\w+\(\{([\s\S]*?)\}\)/);
    ok(!!sig && /sleeperUser/.test(sig[1]),
      `\`${f}\` tekur \`sleeperUser\` i undirskrift sinni`);
  }

  /* MYTEAM MA SAMT EKKI LASA REITINN. Gefna nafnid er UPPHAFSGILDI;
     notandinn a ad geta slegid inn annad nafn thar an thess ad thad
     breyti thvi sem forsidan notar. `value={sleeperUser}` vaeri las og
     hefdi verid "lagfaering" sem taeki eiginleika ur appinu. */
  const mt = stripComments(read("MyTeam.jsx"));
  ok(/useState\(sleeperUser\s*\|\|\s*""\)/.test(mt),
    "og notar hann sem UPPHAFSGILDI (`useState(sleeperUser || \"\")`)");
  ok(!/value=\{sleeperUser\}/.test(mt),
    "og lasar EKKI reitinn (`value={sleeperUser}` vaeri las)");
}

/* ============================================================
   7. FORSIDU-ROKFRAEDIN — OG DEILDIN SEM HUN FAER
   ============================================================
   `wiring.mjs` nadi yfir `draft-sync.js`, `rulebasis.js`, `advice.js` og
   `sleeper-league.js` — EKKI yfir `standings.js`, `waivers.js`,
   `weekview.js` ne `newsmatch.js`. Og gatid var raunverulegt:

   `standingsFrom` las `league.settings.playoff_teams`. Forsidan sendir
   `entry.imported`, sem BAR ÞAD EKKI, svo `playoffTeams` var ALLTAF
   `null` i appinu — "Top N make the playoffs" birtist aldrei, `●`-merkid
   aldrei, og heilbrigdisathugunin gat aldrei kviknad. Medan
   `tests/standings.mjs` profadi cutid i NIU fullyrdingum a tilbunum
   `settings` og var graent.

   Hrein rokfraedi, fullkomlega profud, ALDREI KOLLUD MED NYTILEGU
   INNTAKI. Þad er orðrétt lysingin i hausnum a thessu safni.

   ÞESS VEGNA ER ÞETTA TVIÞAETT: kallid ER til (AST), OG svidin sem thad
   les eru i thvi sem er sent (samanburdur a svidaheitum). Fyrra eitt
   hefdi verid graent allan timann.                                    */
console.log("\n7. forsidan er tengd — kall OG nytilegt inntak");
{
  const dash = stripImports(stripComments(read("Dashboard.jsx")));

  for (const [file, fn] of [["standings.js", "standingsFrom"],
                            ["waivers.js", "pickupAdvice"],
                            ["weekview.js", "weekRows"],
                            ["newsmatch.js", "newsForRoster"]]) {
    const imported = new RegExp(`from\\s+["']\\./${file.replace(".", "\\.")}["']`)
      .test(stripComments(read("Dashboard.jsx")));
    ok(imported, `\`Dashboard.jsx\` flytur inn \`${file}\``);
    /* Fallsheitid getur verid annad; profum ad EITTHVAD se kallad ur
       skranni fremur en ad neglа eitt heiti sem gaeti verid endurnefnt. */
    const called = new RegExp(`\\b${fn}\\s*\\(`).test(dash);
    ok(called, `og \`${fn}(\` er KALLAD`);
  }

  /* ------------------------------------------------------------
     OG DEILDIN SEM ER SEND VERDUR AD BERA SVIDIN SEM ERU LESIN
     ------------------------------------------------------------
     Þetta er hlutinn sem AST-prof getur venjulega ekki gert og hann er
     moglegur hér thvi bædi hlidar eru hrein rokfraedi: vid getum kallad
     `standingsFrom` med THVI SNIÐI sem `leagueFromSleeper` skrifar og
     spurt hvort cutid komi ut.                                       */
  const { leagueFromSleeper } = await import("../src/sleeper-league.js");
  const { standingsFrom } = await import("../src/standings.js");

  const built = leagueFromSleeper({
    league: {
      league_id: "1", name: "L", season: "2026", status: "in_season",
      total_rosters: 10,
      roster_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX",
                         "BN", "BN", "BN", "BN", "BN", "BN"],
      scoring_settings: { rec: 1 },
      settings: { num_teams: 10, playoff_teams: 6, playoff_week_start: 15,
                  draft_rounds: 14 },
    },
    draft: { draft_id: "2", season: "2026", status: "complete", type: "snake",
             settings: { rounds: 14, teams: 10 } },
  });
  ok(built.imported.playoffTeams === 6,
    `\`imported.playoffTeams\` er borid med (${built.imported.playoffTeams})`);
  ok(built.imported.playoffWeekStart === 15,
    `og \`playoffWeekStart\` lika (${built.imported.playoffWeekStart})`);

  const rosters = Array.from({ length: 10 }, (_, i) => ({
    roster_id: i + 1, owner_id: "u" + i,
    settings: { wins: 10 - i, losses: i, ties: 0, fpts: 1500 - i * 20,
                fpts_against: 1400 },
  }));
  const users = rosters.map((r, i) => ({ user_id: "u" + i, display_name: "T" + i }));
  const st = standingsFrom({ rosters, users, league: built.imported, userId: "u0" });
  ok(st.playoffTeams === 6,
    `\`standingsFrom\` les cutid UR \`imported\` (${st.playoffTeams}) — ` +
    "thad var `null` adur");
  ok(st.rows.filter((r) => r.inPlayoffs === true).length === 6,
    `og merkir 6 lid i urslitakeppni ` +
    `(${st.rows.filter((r) => r.inPlayoffs === true).length})`);

  /* Og profid verdur ad geta brugdist: deild AN cutsins ma ekki gefa
     tolu. Vaeri `6` sjalfgefid einhvers stadar vaeri fullyrdingin ofan
     graen fyrir koda sem giskar. */
  const none = standingsFrom({ rosters, users, league: { teams: 10 }, userId: "u0" });
  ok(none.playoffTeams == null,
    "deild an cuts gefur `null`, ekki agiskun (maelitaekid virkar)");
  ok(none.rows.every((r) => r.inPlayoffs === null),
    "og `inPlayoffs` er `null` a ollum — ekki `false`, sem vaeri fullyrding");

  /* Heilbrigdisathugunin gat ALDREI kviknad thvi `numTeams` var alltaf
     `null`. Nu getur hun — og hun a ad gera thad. */
  const bad = standingsFrom({ rosters, users,
    league: { playoffTeams: 99, teams: 10 }, userId: "u0" });
  ok(bad.playoffTeams == null,
    "cut > lidafjoldi er hafnad (`99` af 10 -> null) — athugunin er LIFANDI");
}

/* ============================================================
   8. HVERT PROFASAFN VERDUR AD GETA FELLT BYGGINGUNA
   ============================================================
   ÞETTA SAFN SPYR "ER ROKFRAEDIN TENGD?". Hér er sama spurning logd
   fyrir PROFIN SJALF, og svarid var NEI (19.8.2026).

   `audit.mjs` — safnid sem er ætlað ad LEITA AD VILLUM — taldi `fail` i
   hverri fullyrdingu og notadi hana aldrei: engin samantekt, ekkert
   `process.exit`. Node skilar tha 0. Keyrslan prentadi
   `FAIL ekkert rusl i neinum flipa (Sources: ordid null)` og endadi
   fjorum sekundum sidar a `HEILD: oll 25 profasofnin graen`. Villan var
   raunveruleg, safnid sa hana, og byggingin var graen.

   ÞAD ER NAKVAEMLEGA SAMA AETT SEM ÞETTA SAFN VAR SKRIFAD UM: fall sem
   er fullkomlega profad en aldrei kallad. Hér var thad exit-kodinn sem
   var reiknadur en aldrei kalladur — og af thvi ad `run.mjs` telur
   sofnin ur `SUITES`, var talan "25 graen" RANGFAERSLA um thekjuna, ekki
   bara vantandi vordur.

   TVAER FULLYRDINGAR, OG BADAR ERU NAUDSYNLEGAR:
     1. hvert safn ber `process.exit` med `fail` i skilyrdinu — annars
        getur thad ekki fellt bygginguna, hvad sem thad finnur.
     2. hvert safn er i `SUITES` — annars keyrir thad ekki, hvad sem thad
        getur fellt. `entry.mjs` var i thessum flokki: fullgildur vordur
        med nium fullyrdingum, utan `SUITES`, keyrdur af engum. Sama og
        `pos-vs-opponent.mjs` i FPL-appinu.

   Listinn er LEIDDUR UT ur moppunni, ekki handskrifadur — handskrifadur
   listi staðnar um leid og safni er baett vid, sem er villan sem
   `run.mjs` varar sjalfur vid i haus sinum.                            */
console.log("\n8. hvert profasafn getur fellt bygginguna");
{
  const { readdirSync } = await import("node:fs");
  const TESTS = path.join(ROOT, "tests");
  /* `run.mjs` er keyrarinn og `jsx-loader.mjs` er umhverfid — hvorugt
     er profasafn. Allt annad i moppunni er thad. */
  const INFRA = new Set(["run.mjs", "jsx-loader.mjs"]);
  const suites = readdirSync(TESTS)
    .filter((f) => f.endsWith(".mjs") && !INFRA.has(f)).sort();

  /* ÞEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b): faeri lesturinn a
     ranga moppu yrdi lykkjan tom og hver fullyrding hér nedan graen. */
  ok(suites.length >= 20, `${suites.length} profasofn finnast i tests/`);

  const runner = readFileSync(path.join(TESTS, "run.mjs"), "utf8");
  /* `SUITES`-blokkin ein, ekki oll skrain — annars taldist safn sem er
     NEFNT i athugasemd (t.d. `visual.mjs` i skyringunni) sem skrad. */
  const block = (/const SUITES = \[([\s\S]*?)\n\];/.exec(runner) || [, ""])[1];
  ok(block.length > 100, `\`SUITES\`-blokkin er lesin (${block.length} b)`);

  const noExit = [], notListed = [];
  for (const f of suites) {
    const src = readFileSync(path.join(TESTS, f), "utf8");
    /* Skilyrdid verdur ad NEFNA teljarann. `process.exit(0)` i lokin
       vaeri exit-kodi sem getur ekki fellt neitt — sem er gatid sjalft
       i nyjum klaedum. `visual.mjs` sleppir ser med `exit(0)` FYRR i
       skranni og thad er rett; hér er spurt hvort SKRAIN beri
       fail-hlidina yfirleitt. */
    if (!/process\.exit\(\s*fail\s*\?\s*1\s*:\s*0\s*\)/.test(src)) noExit.push(f);
    if (!new RegExp(`["']${f.replace(".", "\\.")}["']`).test(block)) notListed.push(f);
  }
  ok(noExit.length === 0,
    `hvert safn ber \`process.exit(fail ? 1 : 0)\` (${noExit.join(", ") || "oll"})`);
  ok(notListed.length === 0,
    `og hvert safn er i \`SUITES\` (${notListed.join(", ") || "oll"})`);
}

/* ============================================================
   9. HVERT SVID SEM LESANDI LES VERDUR AD VERA SVID SEM MODULLINN SKILAR
   ============================================================
   KAFLI 7 HER FYRIR OFAN BAR HANDSKRIFADAN LISTA AF FJORUM (skra, fall)
   PORUM — OG THAD ER ASTAEDAN FYRIR THVI AD ThETTA SAFN MISSTI STAERSTA
   GATID A FORSIDUNNI.

   `Dashboard.jsx` las `advice.swaps`. `lineupAdvice` skilar
   `{ optimal, changes, isOptimal }`; `swaps` er til HVERGI i `src/`. Þar
   med var sanna greinin ONAANLEG og hver einasta uppstilling fekk
   "your lineup is already optimal". Eiginleikinn sem notandinn bad um
   MED NAFNI hafdi aldrei virkad — fra fyrsta commit-i forsidunnar.

   OG HVERT LAG AF VORNINNI HLEYPTI HONUM I GEGN AF SINNI ASTAEDU:
     · `lineup.mjs` profar `adv.changes` — rétta heitid. Graent, og rett.
     · ekkert DOM-safn las thessi skipti (nu gerir `dashboard.mjs` 10).
     · `wiring.mjs` kafli 7 — safnid sem er TIL fyrir thennan klasa —
       bar `lineup.js` ekki a sinum HANDSKRIFADA lista. Og profid thar er
       "er fallid KALLAD", sem hefdi verid graent hvort sem er: kallid
       VAR til, svarid var notad, og eitt svid af thremur var uppspuni.

   HANDSKRIFADUR LISTI ER VILLAN, EKKI VANTANDI LINA I HONUM. Þess vegna
   er thetta MEKANISKUR skanni yfir `src/` OG `scripts/`:

     1. fyrir hvert `export function` i hreinni einingu (`src/*.js`) eru
        efstu lyklar i hverjum `return { … }` a dypt 1 taldir;
     2. hver `const X = …` bindig sem kallar EITT slikt fall i
        SKILASTODU er porud vid tha lykla;
     3. hvert `X.svid` i skranni verdur ad vera i theim.

   ÞRIR STADIR THAR SEM SKANNINN SEGIR "VEIT EKKI" — OG THAD ER RETT:
     · `return` sem er ekki hlut-bokstafur (fylki, breyta, ternora) eda
       hlutur med `...spread` -> fallid er OGAGNSAETT og er SLEPPT. Betra
       en ad giska; ogagnsae foll eru TALIN og talan er birt.
     · nafn sem er SKYGGT i skranni (annad `const`, stikubreyta i or)
       -> sleppt. `weekview.js` ber `const t = impliedTeamTotals(...)` OG
       `list.map((t) => …)`, tvo osamband gildi undir sama nafni.
     · kall inni i ANNARRI kallhalarod (`G.map((c) => simulateDraft(…))`)
       -> bindingin er FYLKID, ekki skilagildi fallsins.
   Afthetting i undirskrift React-vidmots (`function StartSit({ advice })`)
   er hins vegar ALIAS og EKKI skygging — thad er einmitt leidin sem
   `advice` fer fra `LeagueCard` til `StartSit`, og kafli 6 fullyrdir
   thegar ad prop se sent undir SAMA heiti.

   MAELITAEKID ER SANNREYNT A TILBUNUM GOGNUM ThAR SEM SVARID ER ThEKKT
   FYRIRFRAM — annars vaeri "engin brot" adeins onnur tom fullyrding, og
   thad er nakvaemlega gerdin af villu sem thessi kafli er skrifadur um.
   ============================================================ */
console.log("\n9. hvert LESID svid er svid sem modullinn SKILAR");
{
  const { readdirSync } = await import("node:fs");
  const SCRIPTS = path.join(ROOT, "scripts");

  const skipString = (s, i) => {
    const q = s[i];
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === "\\") { j++; continue; }
      if (s[j] === q) return j;
    }
    return s.length;
  };
  /** Visitala samsvarandi `}` fyrir `{` i `from`. */
  const braceEnd = (s, from) => {
    let d = 0;
    for (let i = from; i < s.length; i++) {
      const c = s[i];
      if (c === '"' || c === "'" || c === "`") { i = skipString(s, i); continue; }
      if (c === "{") d++;
      else if (c === "}") { d--; if (d === 0) return i; }
    }
    return -1;
  };

  /** Efstu lyklar hlut-bokstafs sem byrjar i `at`; `null` ef `...spread`. */
  function objectKeys(s, at) {
    const end = braceEnd(s, at);
    if (end < 0) return null;
    const keys = [];
    let d = 0, p = 0, b = 0;
    for (let i = at; i < end; i++) {
      const c = s[i];
      if (c === '"' || c === "'" || c === "`") { i = skipString(s, i); continue; }
      if (c === "{") { d++; continue; }
      if (c === "}") { d--; continue; }
      if (c === "(") { p++; continue; }
      if (c === ")") { p--; continue; }
      if (c === "[") { b++; continue; }
      if (c === "]") { b--; continue; }
      if (d !== 1 || p !== 0 || b !== 0) continue;
      if (!/[A-Za-z_$.]/.test(c)) continue;
      /* LYKILL STENDUR STRAX EFTIR `{` EDA `,`. An thessa skilyrdis
         taldist GILDID i `optimal: opt` sem lykill (`opt`) og `null` /
         `true` ur ternorum lika — mengið vard svo vitt ad hver lestur
         slapp i gegn, sem er tom fullyrding i dulargervi. */
      let k = i - 1;
      while (k >= at && /\s/.test(s[k])) k--;
      if (s[k] !== "{" && s[k] !== ",") continue;
      if (s.startsWith("...", i)) return null;
      const m = /^([A-Za-z_$][\w$]*)\s*[:,}]/.exec(s.slice(i, i + 120));
      if (!m) continue;
      keys.push(m[1]);
      i += m[0].length - 2;
    }
    return [...new Set(keys)];
  }

  /** fall -> svid, eda `null` ef skilagildid er ogagnsaett. */
  function returnFields(code) {
    const out = new Map();
    const re = /export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    let m;
    while ((m = re.exec(code))) {
      let p = 1, open = -1;
      for (let j = re.lastIndex; j < code.length; j++) {
        const c = code[j];
        if (c === '"' || c === "'" || c === "`") { j = skipString(code, j); continue; }
        if (c === "(") p++;
        else if (c === ")") { p--; if (p === 0) { open = code.indexOf("{", j); break; } }
      }
      if (open < 0) continue;
      const end = braceEnd(code, open);
      if (end < 0) continue;
      const body = code.slice(open, end + 1);

      let d = 0, opaque = false, sawObject = false;
      const fields = new Set();
      for (let j = 0; j < body.length; j++) {
        const c = body[j];
        if (c === '"' || c === "'" || c === "`") { j = skipString(body, j); continue; }
        if (c === "{") { d++; continue; }
        if (c === "}") { d--; continue; }
        if (d !== 1) continue;
        if (!/^return\b/.test(body.slice(j, j + 7))) continue;
        if (j > 0 && /[\w$.]/.test(body[j - 1])) continue;
        const rest = body.slice(j + 6);
        const t = rest.match(/^\s*/)[0].length;
        const head = rest.slice(t);
        /* `return;`, `return null;` og `return undefined;` segja ekkert
           um svid — lesandi ver sig med `x && x.f` og gerir rett. */
        if (head[0] === ";" || /^null\s*;/.test(head) || /^undefined\s*;/.test(head)) continue;
        if (head[0] !== "{") { opaque = true; continue; }
        const keys = objectKeys(body, j + 6 + t);
        if (!keys) { opaque = true; continue; }
        sawObject = true;
        for (const k of keys) fields.add(k);
      }
      out.set(m[1], sawObject && !opaque ? [...fields] : null);
    }
    return out;
  }

  /** `const X = <rhs>;` a hvada dypt sem er. */
  function constBindings(code) {
    const out = [];
    const re = /(?:^|[;{}()\n,])\s*const\s+([A-Za-z_$][\w$]*)\s*=(?!=)/g;
    let m;
    while ((m = re.exec(code))) {
      let i = re.lastIndex, p = 0, b = 0, c2 = 0;
      for (; i < code.length; i++) {
        const c = code[i];
        if (c === '"' || c === "'" || c === "`") { i = skipString(code, i); continue; }
        if (c === "(") p++; else if (c === ")") p--;
        else if (c === "[") b++; else if (c === "]") b--;
        else if (c === "{") c2++; else if (c === "}") c2--;
        else if (c === ";" && p === 0 && b === 0 && c2 === 0) break;
      }
      out.push({ ident: m[1], rhs: code.slice(re.lastIndex, i) });
    }
    return out;
  }

  /** Hve morgum sinnum er nafnid BUNDID i skranni (afthetting talin ekki). */
  function shadowCount(code, ident) {
    let n = (code.match(new RegExp(`\\b(?:const|let|var)\\s+${ident}\\b`, "g")) || []).length;
    const lists = [];
    for (const re of [/\(([^()]*)\)\s*=>/g, /function\s*[\w$]*\s*\(([^()]*)\)/g]) {
      let m;
      while ((m = re.exec(code))) lists.push(m[1]);
    }
    for (const list of lists) {
      if (/^\s*\{/.test(list)) continue;              /* afthetting = alias */
      for (const part of list.split(",")) {
        if (part.trim().replace(/\s*=.*$/, "") === ident) n++;
      }
    }
    n += (code.match(new RegExp(`(?:^|[^\\w$.])${ident}\\s*=>`, "g")) || []).length;
    return n;
  }

  /** Hvada thekkt foll eru kollud i SKILASTODU i `rhs`? */
  function returnPositionCalls(rhs, names) {
    const OPEN = new Set(["", "useMemo", "useCallback"]);
    const stack = [];
    const found = new Set();
    for (let i = 0; i < rhs.length; i++) {
      const c = rhs[i];
      if (c === '"' || c === "'" || c === "`") { i = skipString(rhs, i); continue; }
      if (c === ")") { stack.pop(); continue; }
      if (c !== "(") continue;
      const m = /([\w$.]+)\s*$/.exec(rhs.slice(0, i));
      const callee = m ? m[1] : "";
      if (names.has(callee) && stack.every((x) => OPEN.has(x))) found.add(callee);
      stack.push(callee);
    }
    return [...found];
  }

  /** Kjarninn: (svida-tafla, lesenda-skrar) -> brot + thekja. */
  function auditFields(modules, consumers) {
    const fnFields = new Map();
    const opaque = [];
    for (const [file, src] of modules) {
      for (const [fn, fields] of returnFields(stripComments(src))) {
        if (fields) fnFields.set(fn, { file, fields: new Set(fields) });
        else opaque.push(`${file}/${fn}`);
      }
    }
    const names = new Set(fnFields.keys());
    const bad = [], bound = [];
    let skipped = 0;
    for (const [file, src] of consumers) {
      const code = stripImports(stripComments(src));
      for (const { ident, rhs } of constBindings(code)) {
        const hits = returnPositionCalls(rhs, names);
        if (hits.length !== 1) { if (hits.length > 1) skipped++; continue; }
        if (shadowCount(code, ident) > 1) { skipped++; continue; }
        const { fields, file: mod } = fnFields.get(hits[0]);
        bound.push({ file, ident, fn: hits[0] });
        const rr = new RegExp(`(?:^|[^\\w$.])${ident}\\s*\\.\\s*([A-Za-z_$][\\w$]*)`, "g");
        const reads = new Set();
        let m;
        while ((m = rr.exec(code))) reads.add(m[1]);
        for (const r of reads) {
          if (!fields.has(r)) {
            bad.push(`${file}: ${ident}.${r} — ${mod}/${hits[0]} skilar ` +
                     `{${[...fields].join(", ")}}`);
          }
        }
      }
    }
    return { fnFields, opaque, bad, bound, skipped };
  }

  /* ------------------------------------------------------------
     MAELITAEKID FYRST — A TILBUNUM GOGNUM ThAR SEM SVARID ER ThEKKT
     ------------------------------------------------------------
     Fjorar spurningar, og allar fjorar VERDA ad hafa svar: rett svid
     sleppur, RANGT svid er fangad, ogagnsaett fall er SLEPPT (ekki
     flaggad), og skygging er SLEPPT. Vaeri einhver theirra ekki reynd
     gaeti "engin brot" hér nedan verid graent af thvi ad skanninn
     finnur ALDREI neitt.                                            */
  {
    const mod = [["m.js", `
      export function good(a) { return { alpha, beta: 1 }; }
      export function opaqueOne(a) { return { ...a, gamma: 2 }; }
    `]];
    const probe = (body) => auditFields(mod, [["c.jsx", body]]);

    const clean = probe(`const g = good(1); use(g.alpha, g.beta);`);
    ok(clean.bad.length === 0, "(a) rett svid sleppa i gegn");
    ok(clean.bound.length === 1, "    og bindingin var raunverulega skodud");

    const dirty = probe(`const g = good(1); use(g.swaps);`);
    ok(dirty.bad.length === 1 && /g\.swaps/.test(dirty.bad[0]),
      `(b) RANGT svid er fangad — MAELITAEKID VIRKAR (${dirty.bad[0] || "ekkert"})`);

    const opa = probe(`const o = opaqueOne(1); use(o.whatever);`);
    ok(opa.bad.length === 0 && opa.opaque.length === 1,
      "(c) `...spread` gerir fallid OGAGNSAETT og thad er sleppt, ekki giskad");

    const shad = probe(`const g = good(1); list.map((g) => g.swaps);`);
    ok(shad.bad.length === 0,
      "(d) skyggt nafn er sleppt — tvo osamband gildi undir sama nafni");

    /* Og prop-afthetting ma EKKI telja sem skygging, annars hverfur
       nakvaemlega tilfellid sem thessi kafli var skrifadur um. */
    const prop = probe(
      `const advice = good(1);\nfunction Kid({ advice }) { return advice.swaps; }`);
    ok(prop.bad.length === 1,
      "(e) prop sem er sent undir SAMA heiti er alias, ekki skygging");
  }

  /* ------------------------------------------------------------
     OG SVO A RAUNVERULEGA TRENU
     ------------------------------------------------------------ */
  const modFiles = readdirSync(SRC).filter((f) => f.endsWith(".js"));
  const consumerFiles = [
    ...readdirSync(SRC).filter((f) => /\.jsx?$/.test(f) && f !== "main.jsx")
      .map((f) => ["src/" + f, path.join(SRC, f)]),
    ...readdirSync(SCRIPTS).filter((f) => f.endsWith(".mjs"))
      .map((f) => ["scripts/" + f, path.join(SCRIPTS, f)]),
  ];
  const res = auditFields(
    modFiles.map((f) => [f, readFileSync(path.join(SRC, f), "utf8")]),
    consumerFiles.map(([label, p]) => [label, readFileSync(p, "utf8")]));

  /* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b regla 1). Faeri
     lesturinn a ranga moppu, eda brotnadi skanninn thegjandi, yrdu
     lykkjurnar tomar og "engin brot" graent ad eilifu. */
  ok(res.fnFields.size >= 20,
    `${res.fnFields.size} hrein foll skila GAGNSAEUM hlut ` +
    `(+${res.opaque.length} ogagnsae, sleppt)`);
  ok(res.bound.length >= 40,
    `${res.bound.length} bindingar skodadar i ${consumerFiles.length} skrám ` +
    `(${res.skipped} sleppt: skygging eda tvirætt kall)`);

  /* OG TILFELLID SEM SLAPP VERDUR AD VERA I ThEKJUNNI. Þetta er hjartað
     i kaflanum: an thessarar fullyrdingar gaeti skanninn verid graenn og
     BLINDUR a nakvaemlega thann lesanda sem kostadi eiginleikann. */
  ok(res.fnFields.has("lineupAdvice"),
    "`lineupAdvice` er i svida-toflunni");
  ok(res.bound.some((b) => b.file === "src/Dashboard.jsx" && b.fn === "lineupAdvice"),
    "og `Dashboard.jsx` ber SKODADA bindingu a hana (tilfellid sem slapp)");
  ok(res.bound.some((b) => b.file === "scripts/snapshot-advice.mjs"),
    "og bokhalds-skriftan er lika lesin (sami klasi, onnur skra)");

  ok(res.bad.length === 0,
    res.bad.length === 0 ? "ENGIN LESIN SVID ERU UPPSPUNI"
      : `${res.bad.length} lesin svid eru UPPSPUNI:\n       ` + res.bad.join("\n       "));
}

/* ============================================================
   `practice_status` MA EKKI VERA TENGT I RADGJOFINA
   ============================================================
   ÞETTA ER OFUGA HLIDIN A ÞESSU SAFNI. Allir adrir kaflar spyrja
   "er hreina rokfraedin RAUNVERULEGA KOLLUD?". Þessi spyr hins vegar
   "er eitthvad kallad sem MA EKKI vera kallad?" — og astaedan er ad
   hvorug spurningin sest a skjanum.

   HANDOVER-SKJALID SAGDI „practice_status ER SAFNAD EN OMAELT".
   ÞAD ER ONAKVAEMT OG ONAKVAEMNIN ER I ÞA ATT SEM FREISTAR:
   „omaelt" bydur naestu lotu ad MAELA thad og tengja. En thad ER
   maelt, og thad var FELLT:

     · SEM UPPLYSING er thad sterkt — Questionable + Full practice
       spilar ~86% a moti Questionable + DNP ~49%, naer-tvofold spönn
       a yfir thusund rodum, EINRAENT i hverri stodu.
     · SEM AKVORDUN er thad **+0,44 pp, per-leikmanns CI INNIHELDUR
       NULL** (`avail-lab.mjs`, walk-forward).
     · Og hausid er maelt LOKAD: thad sem eftir stendur af oracle-bilinu
       „is NOT reachable through report_status or practice_status —
       those are measured out" (`avail-lab.mjs`, q7). Þad situr i
       surprise inactives, sem BERA ENGA skraningu.

   `Out -> 0` sotti 84% af ollum abatanum og er thegar rett i
   `advice.js`. Fínni threp raða ENGU.

   ÞAD SEM ER OMAELT ER ONNUR SPURNING: hvort DAGSETTA serian
   (`injuries/{dagur}.json`) beri merki umfram arsskrana — nflverse
   ENDURSKRIFAR sina, svo "hvad sagdi skyrslan a fimmtudegi i viku 6"
   er osvaranlegt eftir a. Su maeling opnast i oktober. Serian er thvi
   HRAEFNI og ekkert i appinu ma lesa hana fyrr en hun er maeld.

   ============================================================
   HVERS VEGNA ÞETTA ER PROF OG EKKI ATHUGASEMD
   ============================================================
   Athugasemd i `fetch-nfl.mjs` SEGIR thegar "ekki tengja an maelingar".
   Hun stodvar ekkert. Naesta lota les `injuries/{dagur}.json` i
   `data/`, ser vel-formad svid, og tengir thad — og EKKERT verdur
   rautt, thvi talan er a rettu bili og lítur ut eins og maeling.
   Þad er nakvaemlega aettin sem gengur i gegnum badar handover-skrarnar:
   omaeld tala i vel-læsilegum reit.

   ============================================================
   TVAER GILDRUR SEM VORU MAELDAR, EKKI GISKADAR
   ============================================================
   1. NAIF TEXTALEIT FELLUR STRAX A FOLSKU JAKVAEDI. Maelt i dag:
      `grep -rn "practice_status" nfl/src/` skilar **einu** hitti og
      thad er ATHUGASEMD (`advice.js`, sem utskyrir hvers vegna thad
      er EKKI notad). Athugasemdir eru thvi strippadar adur en leitad
      er — sama gildra og CLAUDE.md 13 lysir ("textaleit sem
      athugasemd uppfyllti").
   2. OG ÞAR MED VERDUR STRIPPUNIN SJALF AD VERA VORDUD. Vaeri
      `stripComments` brotin eda fjarlaegd myndi thessi kafli verda
      GRAENN AF RONGUM ASTAEDUM — nei, hann myndi falla; en vaeri hun
      of građug (sbr. innflutnings-strippunin sem at 2.749 stafi hér
      ad ofan) gaeti hun etid HELMING skrarinnar og gert leitina blinda.
      Þess vegna er JAKVAEDA VIDMIDID hér ad nedan: kaflinn fullyrdir
      ad athugasemdin se SANNANLEGA i hraa textanum OG ad hun se horfin
      ur theim strippada. Fyrri fullyrdingin gerir tha seinni
      merkingarbaera — an hennar vaeri "engin hitti" jafn satt um tomt
      inntak.                                                        */
console.log("\n9. `practice_status` er EKKI tengt i radgjofina");
{
  const files = readdirSync(SRC).filter((f) => /\.(js|jsx)$/.test(f));

  /* ÞEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b). Faeri `SRC` a ranga
     slod yrdi lykkjan tom og "engin brot" graent ad eilifu. */
  ok(files.length >= 25,
    `${files.length} skrar i src/ skodadar (golf 25)`);

  /* JAKVAEDA VIDMIDID — sannar ad leitin SJAI textann yfirhofud.
     `advice.js` NEFNIR `practice_status` i athugasemd og su
     athugasemd er thad eina sem stendur i vegi fyrir folsku jakvaedi. */
  const adviceRaw = read("advice.js");
  ok(/practice_status/.test(adviceRaw),
    "`advice.js` NEFNIR `practice_status` i hraum texta (jakvaeda vidmidid)");
  ok(!/practice_status/.test(stripComments(adviceRaw)),
    "og thad hverfur vid strippun — thad var athugasemd, ekki lestur");

  /* KJARNINN. */
  const bad = [];
  for (const f of files) {
    const code = stripComments(read(f));
    for (const [re, what] of [
      [/\bpractice_status\b/, "practice_status"],
      [/\bpracticeStatus\b/, "practiceStatus"],
      [/["'`]injuries\//, "injuries/ serian"],
      [/\.practice\b/, ".practice (svidid ur nflverse.mjs)"],
    ]) if (re.test(code)) bad.push(`src/${f}: ${what}`);
  }

  ok(bad.length === 0,
    bad.length === 0
      ? "ekkert i src/ les meidsla-serian eda aefingastoduna"
      : `TENGT AN MAELINGAR (+0,44 pp, CI inniheldur null):\n       ` +
        bad.join("\n       "));
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
