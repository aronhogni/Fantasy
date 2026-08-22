/* ============================================================
   TENGINGAR — SKRIFAR PIPELINE EITTHVAÐ SEM ENGINN LES?

   HVERS VEGNA ÞETTA PRÓF ER TIL: sama villan kom ÞRISVAR í sömu lotu þegar
   staðfest byrjunarlið (`/fixtures/lineups`) var byggt 31.7.2026:
     1. fallið var kallað úr DAGLEGU keyrslunni (05 UTC) en leikir byrja
        12–19 UTC, svo glugginn opnaðist nánast aldrei
     2. `fetch-fast.yml` gaf ekki `API_SPORTS_KEY`, svo `FLAGS.apisports`
        var false og fallið var sleppt ÞEGJANDI
     3. og loks: `lineups.json` var skrifuð en **appið las hana aldrei**
   Í öllum þrem tilvikum voru prófin GRÆN og staðan GRÆN. Kóði sem lítur út
   eins og hann virki en gerir ekkert er verri en kóði sem fellur.

   ÞETTA PRÓF LES ENGA GAGNASKRÁ — það les KÓÐANN: hvað `writeJSON` skrifar
   á móti því hvað `src/` nefnir. Það er tenging sem hvorugt hinna prófanna
   sér, því hvor endinn fyrir sig er í fullkomnu lagi.

   HVÍTLISTINN er hluti prófsins, ekki undanþága frá því: skrá sem ENGINN
   les verður að vera skjölluð hér með ástæðu. Ef þú bætir við skrá og setur
   hana á hvítlistann án ástæðu ertu að fela sama vandann aftur.
   ============================================================ */
import { readFileSync, readdirSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log(`\n${"=".repeat(84)}`);
console.log("TENGINGAR — PIPELINE Á MÓTI APPI");
console.log("=".repeat(84));

const ROOT = new URL("../", import.meta.url).pathname;
const fetchSrc = readFileSync(ROOT + "scripts/fetch.mjs", "utf8");
/* ALLAR SKRIFTIR, EKKI ADEINS fetch.mjs — ThAD VAR GAT I ThESSUM VERDI.
   1.8.2026 fundust `data/player_gw_{2122..2425}.json` (5,5 MB) med ENGAN
   lesanda. Vordurinn sa thau ekki thvi thau eru skrifud af
   scripts/fetch-player-gw.mjs og hann las adeins scripts/fetch.mjs. Sama
   tegund villu sem hann var byggdur til ad finna, i verdinum sjalfum.   */
const scriptFiles = readdirSync(ROOT + "scripts").filter(f => /\.mjs$/.test(f));
const allScripts = scriptFiles.map(f => readFileSync(ROOT + "scripts/" + f, "utf8")).join("\n");
const srcFiles = readdirSync(ROOT + "src").filter(f => /\.(jsx|js)$/.test(f));
const appCode = srcFiles.map(f => readFileSync(ROOT + "src/" + f, "utf8")).join("\n");
/* ATHUGASEMDA-SIA A EININGARSVIDI (21.8.2026). Hun var TIL en aðeins inni i
   odds_raw-kaflanum (`appNoCmt`, linu ~670), svo hinir textaverdirnir i
   thessari skra lasu HRAAN uppruna — og athugasemdirnar i thessu repo-i eru
   langar og nefna einmitt tha lykla sem verdirnir leita ad. Tveir verdir
   voru DAUDIR af theim sokum, sannad med stokkbreytingu (sja nedar).
   ATH: STRENGIR eru VILJANDI ekki fjarlaegdir — `r.headers.get("x-rate...")`
   er raunveruleg notkun og verdur ad halda afram ad hitta.               */
const stripCmt = s => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
const appNoC = stripCmt(appCode);
const fetchNoC = stripCmt(fetchSrc);
/* Prof eru LOGMAETUR lesandi — bakprof lesa sogugogn sem appid snertir ekki. */
const testFiles = readdirSync(ROOT + "tests").filter(f => /\.mjs$/.test(f));
const testCode = testFiles.map(f => readFileSync(ROOT + "tests/" + f, "utf8")).join("\n");
const consumers = appCode + "\n" + testCode;

/* Hvað skrifar pipeline? */
const written = [
  ...[...fetchSrc.matchAll(/writeJSON\(\s*[`"]([^`"]+\.json)[`"]/g)].map(m => m[1]),
  /* writeFile("data/x.json") i hinum skriftunum */
  ...[...allScripts.matchAll(/writeFile\(\s*[`"]data\/([^`"]+\.json)[`"]/g)].map(m => m[1]),
].filter(f => !/\$\{|\{n\}/.test(f));            // sleppum sniðmátum (live/gw{n})
const uniq = [...new Set(written)].sort();
ok(uniq.length > 20, `${uniq.length} fastar gagnaskrár skrifaðar úr pipeline`);

/* SKRÁR SEM ENGINN LES — hver með ÁSTÆÐU. Ekki bæta við án ástæðu. */
const OK_UNREAD = {
  "teams_map.json":            "pipeline-innri nafnavörpun; appið notar teams.json",
  "status_fast.json":          "lesin GEGNUM pipeStatusFast — sjá athugasemd hér neðar",
  "fdcouk/h2h.json":           "hráefni fyrir framtíðar-h2h; engin sýn enn (skjalað í SCHEMA)",
  "fdcouk/referees.json":      "hráefni fyrir dómara-sýn; engin sýn enn",
  "season_baseline.json":      "lesin sem seasonsFile/baseline — nefnd óbeint",
  "gameweek_shape.json":       "lesin í GwReport gegnum breytu",
  "odds.json":                 "lesin sem `odds` (44 tilvik) — nafnið sjálft ekki í src",
  "luck.json":                 "lesin sem `luck` (12 tilvik)",
  "rotation.json":             "lesin sem `rotation` (14 tilvik)",
  "lineups.json":              "lesin sem `lineups` — TENGD 1.8.2026",
  /* RAUNVERULEG EFTIRSTODVA, EKKI UNDANTHAGA. Skrain lysir ser sjalf sem
     "A FALLBACK for odds.json" — en EKKERT i src/ les hana, svo
     varaleidin er DAUD: detti Odds-API ut syni appid engar likur thott
     BSD-odds liggi i repo-inu. Ad tengja hana er ekki einnar linu verk
     (odds.json er lyklud a lid med afleiddum sviðum, bsd_odds a
     BSD-event-id), svo thad er MAELING og akvordun, ekki flyti-lagfaering.
     Skrad her svo thad se ekki thogult — sja CLAUDE.md kafla 10.        */
  "bsd_odds.json":             "VARALEID SEM ER EKKI TENGD — sja athugasemd",
  /* VILJANDI OLESIN, OG THAD ER SKJALFEST i CLAUDE.md kafla 7: BSD-spa um
     byrjunarlid er GEYMD svo haegt se ad MAELA hana sidar gegn 6h-likaninu.
     Hun ma EKKI radast i neina akvordun fyrr en su maeling liggur fyrir
     (kafli 3: maela fyrst). Sem sagt: rett astand, ekki eftirstodva.
     Baettist a listann 11.8.2026 thegar `unread` haetti ad telja prof sem
     lesendur og hun kom i ljos.                                         */
  "bsd_lineups.json":          "geymd til MAELINGAR gegn 6h-likaninu, ekki notud i akvordun",
  /* ATH — RAUNVERULEG EFTIRSTODVA, EKKI UNDANTHAGA: E0-2627 er HRAGOGN
     yfirstandandi timabils. `team_form` les E0-2526 og E0-2425 (HARDKODAD,
     linur 2491/2496 — nefndar ~1772/1853/1858 her adur og THAER TOLUR VORU
     UREALDAR) og blandar EKKI inn yfirstandandi timabili.
     LEIDRETT 14.8.2026: "ENGIN kodaleid les 2627" var RANGT — hun er lesin
     i `buildLiveGwReport` (linu 2742) fyrir leikjatolur umferdarinnar. Rétta
     fullyrdingin er ad TEAM_FORM les hana ekki. Nota sem lysir kodanum verdur
     ad vera jafn rett og kodinn; thessi laug um tvennt i einu.
     I forleik er thad rett ad blanda ekki — skrain er 404 hja football-data
     thangad til fyrsti leikur er spiladur (kafli 6e; OG ATH: 2627-slodin
     301-redirectar a EC.csv/National League a meðan, sja `fetchFdcouk`) og
     lidsstyrkur a ad koma ur FYRRA timabili.
     ThEGAR TIMABILID BYRJAR tharf ad akveda hvort team_form eigi ad blanda
     inn yfirstandandi E0. Thad er INNTAKS-breyting a lidsstyrk og fellur
     thvi undir regluna i kafla 3: maela fyrst. Skrad her svo thad se ekki
     gleymt i agust.                                                      */
  "fdcouk/E0-2627.json":       "hragogn yfirstandandi timabils; pipeline les 2526/2425 — sja nota",
  /* ============================================================
     ARKIV-SVID — SKRIFUD VILJANDI, LESIN AF ENGUM, OG ThAU MEGA EKKI
     VERDA MERKI AN NYRRAR MAELINGAR (baettust vid 16.8.2026)

     Bædi atridin her ad nedan eru GEYMSLA a gognum sem hverfa annars ad
     eilifu — sama roksemd og `data/history/` og `data/predictions/`
     (CLAUDE.md 7): dagleg/lifandi mynd verdur ekki buin til eftir a.
     FPL nullstillir fjolda-svidin vid timabils-vendingu og fria threpid
     hja the-odds-api hefur ENGAN sogulegan endapunkt.

     OG MORKIN ERU MAELD OG ThAU STANDA: CLAUDE.md kafli 4 skrair
     "Skipta-hreyfing fjoldans sem merki" sem MAELT OG HAFNAD — 4 timabil,
     104.160 leikmanna-umferdir, r = -0,0005 ofan a `ep_next` med 95% CI
     [-0,019, +0,019], og NEIKVAED (-0,111) medal theirra sem spiludu.
     AD GEYMA GOGN ER ANNAD EN AD NOTA ThAU. Ad vira eitthvert thessara
     svida inn i FFDR, `rankScore`, vaent stig eda radgjofina KREFST NYRRAR
     MAELINGAR FYRST — thessi setning er skrifud a geymslu-degi, ekki
     seinna, einmitt svo naesti madur finni hana adur en hann tengir.
     Vordur sem framfylgir thvi: kaflinn "ARKIV-SVID" nedar i thessari skra.
     ============================================================ */
  "events.json:crowd_fields":  "ARKIV: most_captained/chip_plays/transfers_made o.fl. — geymt, ALDREI lesid; "
                             + "merki-notkun krefst nyrrar maelingar (CLAUDE.md 4)",
  "odds_raw/{date}-{window}.json": "ARKIV: hratt Odds-API-svar, dagsett og onemandi — linu-hreyfing og "
                             + "misraemi milli boka fæst hvergi annars stadar; merki-notkun krefst nyrrar maelingar (CLAUDE.md 4)",
};
/* Lyklarnir sem eru ARKIV en ekki venjuleg skraarheiti. Their eru TALDIR
   UPP her svo athugunin nedar geti fallid — hvitlista-faersla sem ekkert
   les er nakvaemlega su thogn sem thetta safn er til ad drepa.          */
const ARCHIVE_ONLY = ["events.json:crowd_fields", "odds_raw/{date}-{window}.json"];
/* NEYTANDI ER APPID, EKKI PROFIN. `consumers` bar BADI appCode OG testCode,
   svo skra sem ADEINS prof nefnir taldist "lesin" — og prof sem stadfestir
   ad pipeline SKRIFI skrana er hringrok, ekki lesandi.
   Thannig slapp `bsd_odds.json` i gegn: hun lysir ser sjalf sem "A FALLBACK
   for odds.json", ekkert i src/ les hana, og eina tilvisunin var i
   bsd-pipeline.mjs. Thad er nakvaemlega `lineups.json`-villan aftur
   (CLAUDE.md kafla 7.1: "pipeline skrifadi hana en APPID LAS HANA ALDREI").
   Fundid 11.8.2026 vid kerfisbundna leit ad theim villuflokki.          */
const unread = uniq.filter(f => {
  const base = f.split("/").pop().replace(/\.json$/, "");
  return !appCode.includes(f) && !new RegExp(`["'\`]${base}\\.json`).test(appCode)
      && !new RegExp(`\\b${base}\\b`).test(appCode);
});
console.log(`\n  skrifað en ónefnt í src/: ${unread.length ? unread.join(", ") : "engar"}`);

/* ---- SKRAR A DISKI, EKKI ADEINS ThAER SEM MA LESA UT UR KODANUM ----
   ThETTA ER SU ATHUGUN SEM VIRKAR: skriftir skrifa sumar skrar med
   SNIDMATI (`player_gw_${key}.json`) og engin statisk lesning getur leyst
   thau upp i skraarnofn. Thess vegna slapp `player_gw_{2122..2425}.json`
   (5,5 MB, engir lesendur) framhja fyrstu utgafu thessa vardar TVISVAR:
   fyrst thvi hann las adeins fetch.mjs, svo thvi hann las adeins
   bokstaflegar strengja-skrifanir. Diskurinn lygur ekki.               */
const onDisk = readdirSync(ROOT + "data").filter(f => /\.json$/.test(f));
/* SNIDMATS-TILVISANIR TELJA. `player_gw_2122.json` er lesin med
   `player_gw_${key}.json` — og fyrsta utgafa thessarar athugunar flaggadi
   thaer thvi sem foreldralausar OG EG EYDDI FJORUM SKRUM A THEIM GRUNNI.
   Thaer voru endurheimtar (profin stodvudu thad) en lærdómurinn er hér:
   sniðmats-lestur er lestur. Vid skodum thvi bædi fullt nafn OG stofninn
   an talna, followed by "${" eda "`".                                    */
const stem = b => b.replace(/[0-9]+$/, "");
const orphans = onDisk.filter(f => {
  const base = f.replace(/\.json$/, "");
  if (consumers.includes(f) || new RegExp(`\\b${base}\\b`).test(consumers)) return false;
  const st = stem(base);
  return !(st !== base && (consumers.includes(st + "${") || consumers.includes("`" + st)
                           || consumers.includes(st + "{")));
});
console.log(`  ${onDisk.length} json-skrar i data/ · ${orphans.length} an lesanda`);
if (orphans.length) console.log(`    ${orphans.join(", ")}`);
/* Hver foreldralaus skra a ad vera a hvitlista MED astaedu — annars er hun
   1-2 MB af gognum sem enginn notar og enginn veit af.                  */
const ORPHAN_OK = {
  /* VILJANDI OLESIN. Thetta er MAELINGA-SAFN, ekki eiginleiki: BSD geymir
     ekki spar um byrjunarlid afturvirkt (loknir leikir skila `confirmed`),
     svo spa sem er ekki soft fyrir leik tapast ad eilifu. Hun er thvi
     soft STRAX en fer i ENGA akvordun fyrr en hun hefur verid maeld gegn
     okkar eigin 6h-likani yfir GW1-4 — sbr. regluna i kafla 3 um ad birta
     ekki omaelt merki. Ef hun stenst maelinguna verdur hun LESIN og tha
     dettur thessi faersla ut. Sja CLAUDE.md 6t.                        */
  "bsd_lineups.json": "maelinga-safn — spad byrjunarlid, omælt, ekki birt",
};
const badOrphans = orphans.filter(f => !ORPHAN_OK[f]);
ok(badOrphans.length === 0,
  `engin foreldralaus gagnaskra a diski${badOrphans.length ? ": " + badOrphans.join(", ") : ""}`);
const undocumented = unread.filter(f => !OK_UNREAD[f]);
ok(undocumented.length === 0,
  `hver ólesin skrá hefur ÁSTÆÐU á hvítlista${undocumented.length ? ": VANTAR " + undocumented.join(", ") : ""}`);

/* ---- ThYNGDARPROF A SETNINGAFRAEDI ALLRA SKRIFTA ----
   2.8.2026 skrifadi eg athugasemd sem innihelt cron-taknmal (stjarna,
   skastrik, 30) INNI I BLOKK-ATHUGASEMD. Su tveggja-stafa rod LOKAR
   athugasemdinni, svo "30, svo ..." vard kodi:
   scripts/fetch.mjs var SETNINGAFRAEDILEGA BROTIN. Ekkert prof keyrir
   pipeline-inn (hann kallar a netid) svo ENGIN vord hefdi sed thad — nema
   tests/lineups.mjs sem dregur EITT fall ut og eval-ar thad, og thad var
   tilviljun ad thad fall var i naendinni.
   Repo-id er ThETTSKRIFAD af athugasemdum (thad er visvitandi, kafli 2), svo
   thessi hætta er raunveruleg. `node --check` a hverja skrift kostar
   millisekundur og faer ALLT tred, ekki bara thad sem prof snerta.       */
console.log(`\n${"─".repeat(84)}`);
console.log("SETNINGAFRAEDI — node --check a allar skriftir");
console.log("─".repeat(84));
{
  const { execFileSync } = await import("node:child_process");
  const bad = [];
  for (const f of scriptFiles) {
    try { execFileSync(process.execPath, ["--check", ROOT + "scripts/" + f], { stdio: "pipe" }); }
    catch (e) { bad.push(`${f}: ${String(e.stderr || e).split("\n").find(l => /Error|error/.test(l)) || "?"}`); }
  }
  for (const f of srcFiles.filter(x => /\.js$/.test(x))) {
    try { execFileSync(process.execPath, ["--check", ROOT + "src/" + f], { stdio: "pipe" }); }
    catch (e) { bad.push(`src/${f}: ${String(e.stderr || e).split("\n").find(l => /Error|error/.test(l)) || "?"}`); }
  }
  console.log(`  ${scriptFiles.length} skriftir + ${srcFiles.filter(x => /\.js$/.test(x)).length} src-js skodadar`);
  ok(bad.length === 0, `engin setningafraedi-villa${bad.length ? ": " + bad.slice(0, 3).join(" | ") : ""}`);
  // Beint vordur um cron-taknmalid i athugasemd (stjarna + skastrik + tala).
  const cronInComment = [];
  for (const f of scriptFiles) {
    const txt = readFileSync(ROOT + "scripts/" + f, "utf8");
    for (const m of txt.matchAll(/\/\*[\s\S]*?\*\//g))
      if (/\*\/\d/.test(m[0])) cronInComment.push(f);
  }
  ok(cronInComment.length === 0,
    `engin cron-stjarna ("*" + "/30") inni i blokk-athugasemd${cronInComment.length ? ": " + cronInComment.join(", ") : ""}`);
}

/* ---- HRINGIR A SPJOLDUM VERDA AD VERA `inset` ----
   Notandinn sa graena rammann um spjald skarast vid naestu rod. Orsokin:
   hann var `outline` (2px + 1px offset), og OUTLINE TEIKNAST UTAN KASSANS
   OG TELUR EKKI I UPPSETNINGU. Radabilid a vellinum er 1-5 px (maelt), svo
   rammin la ofan a rodinni fyrir nedan.

   ThETTA SEST HVORKI I BOUNDING-BOX-MAELINGU NE I KODALESTRI — eg leitadi
   ad skorun a fjorum breiddum og fann ENGA, einmitt af thvi ad outline er
   utan uppsetningar. Vollurinn er i venjulegu flaedi (kafli 8), svo hver
   hringur A spjaldi verdur ad vera `inset` skuggi.                      */
console.log(`\n${"─".repeat(84)}`);
console.log("HRINGIR A SPJOLDUM ERU inset");
console.log("─".repeat(84));
{
  const app = readFileSync(ROOT + "src/App.jsx", "utf8");
  const i = app.indexOf("VALRAMMINN VAR `outline`");
  const seg = i >= 0 ? app.slice(i, i + 1400) : "";
  ok(i >= 0, "skyringin um outline-villuna er a sinum stad");
  ok(/inset 0 0 0 \$\{[^}]*\}px \$\{C\.purple\}/.test(seg),
     "valdi ramminn er inset (var `outline: 2px solid`)");
  ok(/inset 0 0 0 \$\{[^}]*\}px \$\{C\.green\}/.test(seg),
     "planadi ramminn er inset (var `outline: 2px dashed`)");
  ok(!/\n\s*outline: swapSel/.test(app),
     "ekkert spjald notar `outline` lengur — hann teiknast utan kassans");
}

/* ---- TIMAMORK A UTANHUSS-KOLLUM ----
   Maelt 2.8.2026: 8 af 10 `fetch`-kollum i pipeline hofdu ENGIN timamork,
   thar med sameiginlegi hjalparinn (getText) sem FPL, ESPN, GitHub-raw og
   football-data.co.uk fara OLL gegnum. undici hefur ~300 s sjalfgildi, sem
   er ekki timamork i cron heldur HENGJA. ClubElo (31.7.) og API-Sports
   (2.8.) fengu mörk hvor i sinu lagi — thessi vordur alhaefir thad.      */
console.log(`\n${"─".repeat(84)}`);
console.log("TIMAMORK A UTANHUSS-KOLLUM");
console.log("─".repeat(84));
{
  const naked = [];
  for (const f of scriptFiles) {
    const txt = readFileSync(ROOT + "scripts/" + f, "utf8").split("\n");
    txt.forEach((l, i) => {
      if (!/await fetch\(|= fetch\(/.test(l)) return;
      const ctx = txt.slice(Math.max(0, i - 3), i + 6).join("\n");
      if (!/AbortSignal\.timeout/.test(ctx)) naked.push(`${f}:${i + 1}`);
    });
  }
  console.log(`  ${scriptFiles.length} skriftir skodadar`);
  ok(naked.length === 0,
    `hvert fetch-kall hefur timamork${naked.length ? ": " + naked.join(", ") : ""}`);
  /* Og kvota-vordurinn a API-Sports ma ekki horfa */
  /* VAR DAUDUR (fundid 21.8.2026): baðir helmingar voru lesnir ur HRAUM
     `fetchSrc`, og athugasemdin vid throskuldinn (fetch.mjs:2838) nefnir
     `x-ratelimit-requests-remaining` ORDRETT. Stokkbreyting: haus-lesturinn
     (fetch.mjs:2854) gerdur ad `const rem = null` — vordurinn helst GRAENN
     medan kvota-vornin er blind og `apiRemaining` verdur aldrei annad en
     null. Nu er athugasemdum sviptad OG throskuldurinn verdur ad vera
     NOTADUR i samanburdi, ekki adeins skilgreindur.                     */
  ok(/x-ratelimit-requests-remaining/.test(fetchNoC),
    "API-Sports LES kvota-hausinn (ekki adeins nefndur i athugasemd)");
  ok(/apiRemaining\s*<=\s*API_MIN_REMAINING/.test(fetchNoC),
    "og throskuldurinn er NOTADUR i samanburdi (reikningur var uppsagdur 2.8.)");
  ok(/haveFx|reused/.test(fetchSrc),
    "byrjunarlid eru GEYMD per leik — glugginn er 5 klst og keyrslan a 30 min fresti");
}

/* ---- Sértækir verðir um það sem BRAST ---- */
console.log(`\n${"─".repeat(84)}`);
console.log("VERÐIR UM ÞAU ÞRJÚ TILVIK SEM BRUSTU");
console.log("─".repeat(84));

ok(/writeJSON\(\s*"lineups\.json"/.test(fetchSrc), "pipeline SKRIFAR lineups.json");
ok(/["'`]lineups\.json["'`]/.test(appCode), "appið LES lineups.json (var ekki gert — 3. tilvikið)");
ok(/lineupBy|lineups\?\.players/.test(appCode),
  "og notar innihaldið, ekki adeins hledur skrána");
ok(/confirmed/.test(appCode), "stadfest byrjunarlid berst a spjaldid (`confirmed`)");

ok(/["'`]status_fast\.json["'`]/.test(appCode),
  "appið les status_fast.json — hrada keyrslan var ANNARS OSYNILEG");
/* VAR DAUDUR (fundid 21.8.2026) OG ThAD ER NAKVAEMLEGA BILUNIN SEM KAFLI 7
   VARAR VID: "Baetir thu vid heimild: skradu hana thar, annars er hun
   osynileg thegar hun brotnar." Verdurinn las HRAAN `appCode`, og TVAER
   athugasemdir (App.jsx:586 og :3953) nefna `api_lineups` berum orðum —
   thaer voru skrifadar EINMITT vegna thess ad thetta brast einu sinni adur.
   Stokkbreyting: raunverulega SHOW-linan (App.jsx:3965,
   `api_lineups: "Confirmed lineups",`) EYDD — vordurinn helst graenn og
   heimildin er osynileg i hlidarstikunni. Nu er athugasemdum sviptad OG
   krafist merkimidans sjalfs (`api_lineups:` + gaesalappa), sem er thad
   sem SHOW-blokkin ber en athugasemdirnar ekki.                        */
ok(/api_lineups:\s*["'`]/.test(appNoC),
  "api_lineups hefur MERKI i heimildalistanum (SHOW), ekki adeins athugasemd");

/* Fallid VERDUR ad vera kallad ur HRADA keyrslunni og hun VERDUR ad hafa lykilinn */
const fastFn = fetchSrc.slice(fetchSrc.indexOf("async function fetchFast("));
const fastBody = fastFn.slice(0, fastFn.indexOf("\n}\n"));
ok(/fetchLineups\(\)/.test(fastBody),
  "fetchLineups kallad ur fetchFast (1. tilvikid: var adeins i daglegu keyrslunni)");
const fastYml = readFileSync(ROOT + ".github/workflows/fetch-fast.yml", "utf8");
ok(/API_SPORTS_KEY:\s*\$\{\{\s*secrets\.API_SPORTS_KEY/.test(fastYml),
  "fetch-fast.yml gefur API_SPORTS_KEY (2. tilvikid: vantadi, svo fallid var sleppt)");

/* ---- Almennt: hvert `record(...)`-nafn a ad vera synilegt eda skjalad ---- */
console.log(`\n${"─".repeat(84)}`);
console.log("HEIMILDIR SEM SKRÁ SIG EN SJÁST HVERGI");
console.log("─".repeat(84));
const recorded = [...new Set([...fetchSrc.matchAll(/record\(\s*"([a-z_0-9]+)"/g)].map(m => m[1]))];
const shown = recorded.filter(r => appCode.includes(r));
console.log(`  ${recorded.length} heimildir skrá sig · ${shown.length} nefndar í src/`);
/* Ekki hart skilyrdi — SHOW-listinn i App.jsx er visvitandi urval — en
   hlutfallid ma ekki hrynja, thvi tha er pipeline ad skra i tomid.        */
ok(shown.length >= 10,
  `minnst 10 heimildir eru synilegar i vidmotinu (${shown.length} af ${recorded.length})`);

/* ---------- SJALFVIRKNANDI ATHUGANIR FYRIR AGUST ----------
   Tvennt i CLAUDE.md beid thess ad "einhver athugadi i agust": fyrsta
   raunprof API-Sports (nafna-porun meidsla) og "i ar vs i fyrra"-taflan sem
   kviknar vid GW1. Ad treysta a minni er engin vord — thessar athuganir
   KVIKNA SJALFAR thegar gognin verda til, og eru ThOGULAR thangad til.  */
console.log(`\n${"─".repeat(84)}`);
console.log("SJALFVIRKNANDI ATHUGANIR (thogular i forleik)");
console.log("─".repeat(84));
{
  const J = f => { try { return JSON.parse(readFileSync(ROOT + "data/" + f, "utf8")); }
                   catch { return null; } };
  /* ============================================================
     1. API-SPORTS NAFNA-PORUN — VORDURINN VAKNADI 21.8.2026 OG SAGDI
        RANGA ORSOK. HANN MAELIR NU ThRJA OLIKA HLUTI.

     Fyrsta utgafan las `players.length / (players + unmatched)` UR SKRANNI
     og fell vid 73,0% med skilabodunum "heimild hefur breytt nafnaformi".
     Hun HAFDI EKKI breytt nafnaformi. Af tiu oporudum rodum voru
       · SJO Man Utd- og Forest-menn sem paradist ekki af thvi ad
         LIDANAFNID ("Manchester United") var ekki i `teams_map`
       · TVEIR raunverulegar nafna-villur (Nørgaard: `ø`; M. Joseph:
         samsett eftirnafn)
       · EINN sem er RETT oparadur — "B. Fredrick (Brentford)" er ekki i
         FPL. Heimildin telur hopa vidari en FPL gerir.
     Sja hausinn a `apiNameIndex` i scripts/fetch.mjs.

     ThRJU SEM ThETTA KOSTADI OG SEM ThESSI VORDUR TEKUR NU:

     (a) SKRAIN ER EKKI KODINN. Ad lesa geymda talninguna maelir sidustu
         PIPELINE-KEYRSLU, ekki thann porunar-koda sem er i hirslunni. Vid
         lagfaeringu helst skrain rod eftir rod eins og hun var (cron
         skrifar hana naest), svo profid hefdi verid RAUTT eftir rettri
         lagfaeringu og GRAENT ef porunin brotnadi eftir ferska keyrslu.
         Nu er `apiNameIndex` DREGID UT UR scripts/fetch.mjs og PORUNIN
         ENDURREIKNUD a raun-nofnunum sem heimildin sendi. Nofnin eru
         gognin; hlutfallid er utkoma sem vid reiknum sjalf.
     (b) HLUTFALL ER ROENG SPURNING UM OLEYST LIDANAFN. Eitt oleyst
         lidanafn fellir HVERJA rod thess lids i einu — og i
         `fetchLineups` fellir thad heilt byrjunarlid ThEGJANDI (thar er
         `continue` FYRIR porunina, svo `unmatched` sest thad aldrei).
         Serstok fullyrding: HVERT lidanafn sem heimildin sendi verdur ad
         parast.
     (c) 90%-GOLF A HEIMILD SEM BER MENN SEM ERU EKKI I FPL MAELIR RANGA
         STAERD. Golfid er ThVI hert, ekki lækkad: hver rod sem porunin
         hafnar verdur ad vera OPARANLEG — enginn EINN kandidat i sama
         lidi sem deilir eftirnafns-taki. Se hann til, tha atti porunin ad
         finna hann og thad er villa, ekki thekja. Golfid stendur ovid
         (90%) sem GROFT net gegn snid-breytingu: bæri heimildin allt i
         einu "SURNAME, F." myndi ALLT falla og engin ein rod vera
         "opáranleg" — tha er hlutfallid rett spurning.
     ============================================================ */
  const inj = J("injuries.json");
  const nPl = inj?.players?.length ?? 0, nUn = inj?.unmatched?.length ?? 0;
  if (nPl + nUn === 0) {
    console.log("  API-Sports: engin gogn enn (forleikur) — athugunin bidur");
    ok(true, "API-Sports-porun: bidur gagna (rett i forleik, 0 koll notud)");
  } else {
    /* Nafna-visirinn UR PIPELINE-INU, ekki eftirliking — sama adferd og
       tests/lineups.mjs (kodi sem kviknar einn morgun er dreginn UT og
       keyrdur her). Taflan `API_TEAM_ALIAS` bur INNI i fallinu einmitt
       til thess ad thessi utdrattur beri hana med ser.                  */
    const axStart = fetchSrc.indexOf("async function apiNameIndex(");
    ok(axStart > 0, "apiNameIndex finnst i scripts/fetch.mjs (annars maelir kaflinn ekkert)");
    const axDecl = fetchSrc.slice(axStart, fetchSrc.indexOf("\n}\n", axStart) + 3);
    ok(/API_TEAM_ALIAS/.test(axDecl) && /teamIdOf/.test(axDecl),
      "utdratturinn ber lidanafna-tofluna OG teamIdOf (annars er profad annad en keyrir)");
    const { readFile } = await import("node:fs/promises");
    const { normName } = await import("../src/names.js");
    const idx = await new Function("readFile", "DATA", "normName",
      `${axDecl}\nreturn apiNameIndex;`)(readFile, ROOT + "data", normName)();

    /* Raun-nofnin sem heimildin sendi — BADAR hlidar. Opörudu rodirnar eru
       geymdar sem "Nafn (Lid)", svo their eru þættar til baka.          */
    const rows = [
      ...(inj.players || []).map(p => ({ nm: p.name_api, team: p.team_api })),
      ...(inj.unmatched || []).map(t => {
        const m = String(t).match(/^(.*) \((.*)\)$/);
        return m ? { nm: m[1], team: m[2] } : { nm: String(t), team: null };
      }),
    ].filter(r => r.nm && r.team);
    ok(rows.length === nPl + nUn,
      `allar ${nPl + nUn} rodir endurbyggdar ur skranni (${rows.length}) — ThEKJA ER FULLYRDING`);

    /* (b) HVERT LIDANAFN VERDUR AD PARAST. */
    const clubs = [...new Set(rows.map(r => r.team))];
    const badClubs = clubs.filter(c => idx.teamIdOf(c) == null);
    console.log(`  API-Sports lid: ${clubs.length} nofn i gognunum, ${badClubs.length} oleyst`);
    ok(badClubs.length === 0,
      `HVERT lidanafn heimildarinnar parast (${badClubs.length} oleyst${badClubs.length ? ": " + badClubs.join(", ") : ""}) `
      + "— eitt oleyst nafn fellir HVERJA rod thess lids, og i byrjunarlidum thegjandi");
    ok(idx.aliasCollisions.length === 0,
      `engin arekstur i lidanafna-toflunni (${idx.aliasCollisions.join("; ") || "0"})`);
    /* Og skrarnar sjalfar bera svidid, svo thetta sest i `data/` lika. */
    for (const [f, o] of [["injuries.json", inj], ["lineups.json", J("lineups.json")]]) {
      if (!o) continue;
      ok(!(o.unresolved_teams?.length),
        `${f}: unresolved_teams er tomt (${(o.unresolved_teams || []).join(", ") || "tomt"})`);
    }

    /* (a)+(c) ENDURREIKNUD PORUN A RAUN-NOFNUNUM. */
    const got = rows.map(r => ({ ...r, id: (t => t ? idx.matchFpl(r.nm, t) : null)(idx.teamIdOf(r.team)) }));
    const matched = got.filter(x => x.id != null);
    const declined = got.filter(x => x.id == null);
    const rate = matched.length / got.length;
    const stored = nPl / (nPl + nUn);
    console.log(`  geymt i skranni : ${nPl} paradir, ${nUn} oparadir -> ${(100*stored).toFixed(1)}%`);
    console.log(`  ENDURREIKNAD    : ${matched.length} paradir, ${declined.length} oparadir -> ${(100*rate).toFixed(1)}%`);
    if (declined.length) console.log(`  hafnad: ${declined.map(x => `${x.nm} (${x.team})`).join(" | ")}`);
    ok(rate >= 0.9,
      `nafna-porun >=90% (${(100*rate).toFixed(1)}%) — undir thvi hefur heimild breytt nafnaformi`);

    /* (c) HVER HOFNUN VERDUR AD VERA OPARANLEG. Kandidat = leikmadur i SAMA
       lidi sem deilir taki med eftirnafni API-nafnsins. Nakvaemlega EINN
       kandidat = porunin atti ad finna hann (villa). Enginn = madurinn er
       ekki i FPL (rett). Tveir eda fleiri = raunveruleg tviræðni, og thá er
       null RETTA svarid — thogul rong porun er verri en engin.          */
    const toks = x => new Set(normName(x).split(" ").filter(t => t.length >= 2));
    const solvable = [];
    for (const x of declined) {
      const teamId = idx.teamIdOf(x.team);
      if (teamId == null) continue;                 // taldid i (b), ekki tvisvar
      const sur = [...toks(x.nm)];
      const cand = (idx.players || []).filter(p => p.team === teamId
        && sur.some(t => toks(p.second_name).has(t) || toks(p.web_name).has(t)));
      if (cand.length === 1) solvable.push(`${x.nm} (${x.team}) -> ${cand[0].web_name} #${cand[0].id}`);
    }
    ok(solvable.length === 0,
      `hver hofnun er OPARANLEG (${solvable.length} sem atti ad parast${solvable.length ? ": " + solvable.join("; ") : ""})`);
    /* OG SU FULLYRDING MA EKKI VERA TOM (CLAUDE.md 5b regla 2). Hun er 0
       thegar ALLT parast, sem er RETT utkoma — svo "declined.length >= 1"
       vaeri vordur sem fellur a fullkomnum gognum. I stad thess er
       greinirinn sannreyndur a TILBUINNI rod thar sem svarid er ThEKKT:
       raunverulegur FPL-madur, nafn hans afskraemt svo porunin hafni honum.
       Finni greinirinn hann EKKI er nullid ofan merkingarlaust.          */
    {
      const p = (idx.players || []).find(x => x.team === idx.teamIdOf(clubs[0]));
      const probe = { nm: `Zz ${p?.second_name}`, team: clubs[0] };
      const teamId = idx.teamIdOf(probe.team);
      const sur = [...toks(probe.nm)];
      const cand = (idx.players || []).filter(q => q.team === teamId
        && sur.some(t => toks(q.second_name).has(t) || toks(q.web_name).has(t)));
      ok(idx.matchFpl(probe.nm, teamId) == null && cand.length === 1 && cand[0].id === p.id,
        `greinirinn finnur PARANLEGA hofnun a tilbunu tilfelli ("${probe.nm}" -> ${p?.web_name}) `
        + `— annars maelir nullid ofan ekkert (hafnad: ${cand.length})`);
    }
  }
  /* 2. "I ar vs i fyrra" — kviknar vid GW1 (kafli 7 atridi 4) */
  const lastGw = J("last_gw.json");
  const base = J("season_baseline.json");
  const archive = lastGw?.archive === true;
  if (archive) {
    console.log(`  Samanburdartaflan: last_gw er ENN afrit (${lastGw?.season}) — bidur GW1`);
    ok(true, "samanburdartaflan bidur GW1 (last_gw.archive === true)");
  } else {
    console.log(`  Samanburdartaflan: RAUNGOGN komin (GW${lastGw?.gw}) — athugun virk`);
    ok(base?.label && (base?.players?.length ?? 0) > 100,
      `season_baseline hefur fyrra-timabils tolur (${base?.label}, ${base?.players?.length ?? 0} leikmenn)`);
    ok(lastGw?.fixtures?.length > 0, "last_gw hefur raunverulega leiki til ad bera saman");
  }
  /* ============================================================
     3. STADFEST BYRJUNARLID — OG HVERS VEGNA ADGANGSLEYSID ER LESID
        UR TVEIMUR RASUM SIDAN 22.8.2026

     Gamla utgafan las EINA ras:
         const gated = lu?.probe?.gated;
         ok(gated !== true, "ATH: API-threpid LEYFIR EKKI /fixtures/lineups")
     Hun var rong a tvo vegu og badir kostudu.

     (i) HUN NEFNDI RANGA ORSOK. Skilabodin sogdu "ThREPID leyfir ekki
         endapunktinn" — en threpid LEYFDI hann: rannsoknin 21.8.2026 kl.
         21:02 gaf http=200 og `errors: []` a somu fria askrift. Textinn sem
         heimildin sendir 22.8. er "Your account is suspended, check on
         https://dashboard.api-football.com." Thad er REIKNINGS-stada, ekki
         threp — og lagfaeringin er a dashboard-inu, ekki i uppfaerslu.
         Thetta er nakvaemlega sama villan og fetch.mjs:1706 skjalar i HINA
         attina ("adgangsleysi er adgangsleysi hvort sem thad heitir plan,
         threp eda uppsogn"), bara med ondverdu formerki: her var ordid
         "threp" sett a uppsogn. Rautt prof sem nefnir ranga orsok sendir
         naesta mann ad uppfaera askrift sem er ekki vandamalid.

     (ii) HUN VAR BLIND A LEIKDEGI — OG ThAD ER EINI DAGURINN SEM SKIPTIR
         MALI. `fetchLineups` hefur TVAER skriftar-greinar. Utan glugga
         skrifar hun `probe: {...}`; INNI I GLUGGANUM skrifar hun
         `errors: [...]` OG ENGAN `probe` (fetch.mjs ~1789). Committ
         8a5528d (22.8.2026 18:23, GW1-leikdagur) ber ordrett
           errors: ["fixtures 2026-08-22: {\"access\":\"Your account is
                     suspended, check on https://dashboard...\"}"]
         med `players: []` og ENGAN `probe`. Gamla fullyrdingin las tha
         `lu?.probe?.gated` -> undefined -> `undefined !== true` -> GRAENT.
         Safnid var thvi graent a leikdegi medan adgangur var lokadur og
         skrain sjalf bar setninguna. Sama aett og tomu fullyrdingarnar i
         CLAUDE.md 5b: hun GAT fallid, en ekki a theirri ras sem bar sonnunina.

     ThRJAR ADGREINDAR STODUR, ThVI ThAER KALLA A OLIK VIDBROGD:
       KVOTI TAEMDUR  -> ThAD ER OKKAR. Fria threpid er 100 koll/dag og
                         `API_MIN_REMAINING` (fetch.mjs:3014) er til ThESS ad
                         thetta gerist ekki. Fullyrdingin FELLUR — hun er
                         adgerdhaef i thessu repo-i.
       UPPSOGN / THREP -> UTAN REPO-INS. Enginn kodi her opnar reikning
                         aftur, svo "adgangur er opinn" er ekki fullyrdanleg
                         i thessu regime. Hun er ThVI SOFANDI MERKI — en
                         SOFANDI MA ALDREI VERDA "MAELIR EKKERT", svo
                         svefninn ber thrjar fullyrdingar med tonnum
                         (ferskleiki · synileiki · osamhverfa geymslan sem
                         ER vakningin). Vakningarskilyrdid er skrifad ut:
                         thegar heimildin haettir ad senda adgangs-villu
                         flytur greinin sig sjalf yfir i jakvaedu
                         fullyrdinguna her ad nedan.
       ENGIN VILLA     -> jakvaed fullyrding: adgangur ER opinn.
     ============================================================ */
  const lu = J("lineups.json");
  const txt = o => o == null ? "" : (typeof o === "string" ? o : JSON.stringify(o));
  /* BADAR RASIR. `probe.errors` utan glugga, `errors[]` inni i honum.     */
  const denialText = [txt(lu?.probe?.errors), ...(lu?.errors || []).map(txt)]
    .filter(Boolean).join(" ; ");
  /* Kvota-ordalag API-Sports er adgreint fra adgangs-ordalagi: kvoti kemur
     undir `requests`/"request limit", adgangur undir `access`/`plan`.     */
  const quotaOut = /request limit|rate.?limit|too many request|quota/i.test(denialText);
  const suspended = /suspend/i.test(denialText);
  const planGate  = /\bplan\b|subscription|upgrade|not allowed/i.test(denialText);
  const denied    = !quotaOut && (lu?.probe?.gated === true || suspended || planGate
                                  || /"?access"?\s*:/i.test(denialText));
  const ageDays = t => { const d = Date.parse(t ?? ""); return Number.isFinite(d) ? (Date.now() - d) / 864e5 : Infinity; };
  const nPlayers = lu?.players?.length ?? 0;

  if (quotaOut) {
    /* OKKAR HLID. Ekki sofandi merki — verdurinn a ad falla.              */
    console.log(`  Byrjunarlid: KVOTI TAEMDUR — ${denialText.slice(0, 160)}`);
    ok(false, "KVOTI TAEMDUR a API-Sports — API_MIN_REMAINING (fetch.mjs) atti ad stoppa fyrr");
  } else if (denied) {
    /* ---------- SOFANDI MERKI, MED TONNUM ---------- */
    const cause = suspended ? "REIKNINGURINN ER UPPSAGDUR (dashboard.api-football.com)"
                : planGate  ? "ThREPID leyfir ekki endapunktinn (plan/askrift)"
                            : "adgangi hafnad (heimildin gaf enga nanari astaedu)";
    console.log(`  Byrjunarlid: ADGANGUR LOKADUR — ${cause}`);
    console.log(`    heimildin segir ordrett: ${denialText.slice(0, 200)}`);
    console.log(`    rannsokn: ${lu?.probe?.at ?? "engin (skrifad inni i glugganum)"}`
              + ` · skra uppfaerd: ${lu?.updated ?? "?"}`);
    console.log("    VAKNAR SJALFT: um leid og heimildin haettir ad senda adgangs-villu");
    console.log("    faerist thessi grein yfir i jakvaedu fullyrdinguna her ad nedan.");

    /* (1) FERSKLEIKI — svefninn ma ekki byggja a gomlum sonnunargognum.
       Haetti cron ad skrifa, eda frjosi rannsoknin, verdur "sofandi" ad
       "maelir ekkert" — og thad er nakvaemlega thogla bilunin sem thetta
       safn er til ad drepa. `probe.at` ma vera i mesta lagi 2 dagar
       (PROBE_TTL_BLOCKED er 1 dagur, einn dagur i slaka), og se enginn
       `probe` (leikdags-greinin) verdur SKRAIN sjalf ad vera fersk.     */
    const probeAge = ageDays(lu?.probe?.at), fileAge = ageDays(lu?.updated);
    ok(lu?.probe ? probeAge <= 2 : fileAge <= 1,
      `sonnunargognin eru fersk (rannsokn ${probeAge === Infinity ? "engin" : probeAge.toFixed(2) + "d"}, `
      + `skra ${fileAge.toFixed(2)}d) — sofandi merki a gomlum gognum maelir ekkert`);

    /* (2) SYNILEIKI — CLAUDE.md kafli 7: "annars er hun osynileg thegar hun
       brotnar." Lokunin verdur ad sjast i stodu-skranum, ekki adeins her.  */
    const notes = ["status.json", "status_fast.json"]
      .map(f => J(f)?.sources?.api_lineups?.note ?? "").filter(Boolean);
    const seen = notes.some(n => /ENDPOINT CLOSED|suspend|access|plan/i.test(n));
    ok(seen, `lokunin sest i "Data sources" (api_lineups-notan): ${notes.map(n => `"${n.slice(0, 70)}"`).join(" | ") || "ENGIN ROD"}`);

    /* (3) VAKNINGIN SJALF — OSAMHVERFA GEYMSLAN. Hun er ekki thaegindi
       heldur forsenda thess ad thetta merki geti nokkurn tima vaknad:
       vaeri blokkerad svar geymt jafn lengi og heilbrigt (7 dagar) gaeti
       adgangur verid kominn aftur i heila viku an thess ad nokkud saegi thad
       (fetch.mjs, "geymsla sem thaggar nidur GODAR frettir"). Lesid UR
       KODANUM thvi thetta er tenging, ekki tala.                          */
    ok(/PROBE_TTL_OK = 7, PROBE_TTL_BLOCKED = 1/.test(fetchNoC)
       && /prev\?\.gated \? PROBE_TTL_BLOCKED : PROBE_TTL_OK/.test(fetchNoC),
      "osamhverfa geymslan er obreytt (1 dagur blokkerad, 7 heilbrigd) — ANNARS VAKNAR MERKID ALDREI");
  } else {
    /* ---------- ADGANGUR ER OPINN: JAKVAED FULLYRDING ---------- */
    console.log(`  Byrjunarlid: adgangur opinn · ${nPlayers} leikmenn i skra`);
    ok(lu?.probe ? lu.probe.gated === false : true,
      "engin adgangs-villa i lineups.json (hvorki i `probe` ne `errors`)");
    if (nPlayers === 0)
      ok(true, "byrjunarlid bidur leikdags (adgangur opinn, engin gogn i glugganum)");
  }

  /* GAGNA-ATHUGANIRNAR ERU OHADAR ADGANGS-STODUNNI: se eitthvad i skranni
     verdur thad ad standast, lika thott onnur rod hafi brugdist.          */
  if (nPlayers > 0) {
    const st = lu.players.filter(x => x.started).length;
    console.log(`  Byrjunarlid: ${lu.players.length} leikmenn, ${st} byrja`);
    ok(st >= 11, `minnst 11 byrjunarlidsmenn thegar gogn eru til (${st})`);
    ok((lu.unmatched?.length ?? 0) / lu.players.length < 0.15,
      `oparadir undir 15% (${lu.unmatched?.length ?? 0} af ${lu.players.length})`);
  }
}

/* ============================================================
   ER HVER SKRÁ SKJÖLLUÐ? — `data/SCHEMA.md` MÁ EKKI ROTNA

   CLAUDE.md kafli 7 bendir á `data/SCHEMA.md` sem TILVÍSUNINA yfir það sem
   pipeline skrifar. Vélræn athugun 9.8.2026 fann **fimmtán skrár sem ekkert
   nefndi** — þar á meðal allar fjórar BSD-skrárnar — og á sama tíma heilan
   kafla um `understat/season.json`, `understat/match/{id}.json` og
   `understat/big_chances.json`, sem **hafa aldrei verið til** (`data/understat/`
   er ekki til) og komu frá heimild sem var tekin úr sambandi.

   Þetta er sama ætt og hvítlistinn hér að ofan: skjal sem lýsir skrám sem
   eru ekki til, og sleppir þeim sem eru það, er VERRI en ekkert skjal — það
   sendir næsta mann að leita að gögnum sem hann finnur aldrei.

   Þrepið er lágt viljandi: aðeins að nafnið KOMI FYRIR. Að krefjast fulls
   skema væri prófun á prósa og myndi rotna sjálft.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("SKJOLUN — nefnir data/SCHEMA.md hverja skra?");
console.log("─".repeat(84));
{
  const schema = readFileSync(new URL("../data/SCHEMA.md", import.meta.url), "utf8");
  const files = readdirSync(new URL("../data/", import.meta.url))
    .filter(f => f.endsWith(".json"));
  /* Skrár sem eru SKJÖLLUÐ SEM SNIÐMÁT (ein færsla, mörg tímabil).      */
  const TEMPLATED = [[/^player_gw_\d{4}\.json$/, "player_gw_{season}.json"]];
  const missing = [];
  for (const f of files) {
    if (schema.includes(f)) continue;
    const t = TEMPLATED.find(([re]) => re.test(f));
    if (t && schema.includes(t[1])) continue;
    missing.push(f);
  }
  ok(missing.length === 0,
     `allar ${files.length} skrar i data/ eru nefndar i SCHEMA.md${
       missing.length ? " — VANTAR: " + missing.join(", ") : ""}`);

  /* Og OFUGT: SCHEMA.md ma ekki lysa skra sem er ekki til. Adeins
     `data/`-slodir eru skodadar (kaflar um API-svor eru ekki skrar).   */
  const mentioned = [...schema.matchAll(/`(data\/)?([a-z0-9_]+\.json)`/g)]
    .map(m => m[2]);
  const TEMPLATE_NAMES = new Set(["player_gw_{season}.json"]);
  const OK_ABSENT = new Set([
    "bsd_live.json",        // yfirstandandi timabil — ekki til i forleik (skjalad)
    "pros_gw.json",         // verdur til vid FYRSTU umferd (collectPros), ekki i forleik
    "pros_moves.json",      // per-stjornanda saga; verdur lika til vid fyrstu umferd
    "minutes.json", "bps.json", "set_pieces.json",   // undir "Ountfaert"
  ]);
  const ghosts = [...new Set(mentioned)]
    .filter(n => !TEMPLATE_NAMES.has(n) && !OK_ABSENT.has(n)
                 && !files.includes(n) && !/^player_gw_/.test(n));
  ok(ghosts.length === 0,
     `SCHEMA.md lysir engri skra sem er ekki til${
       ghosts.length ? " — DRAUGAR: " + ghosts.join(", ") : ""}`);
}

/* ============================================================
   TOM KEYRSLA MA ALDREI ThURRKA UT GOD GOGN — VELRAEN ATHUGUN

   Reglan er skjolud (CLAUDE.md 8e) og `fetch-bsd-teams.mjs`/`fetch-bsd.mjs`
   fylgja henni: their DEYJA fremur en ad skrifa hluta-timabil. ThRJAR
   HANDVIRKAR SKRIFTUR GERDU ThAD EKKI (fundid i uttekt 10.8.2026):

     fetch-clubelo-history  ENGINN `r.ok`-check — 404-HTML thattast i 0
                            radir og `seasons: {}` for ofan a heil sogugogn
     fetch-fdr-history      skrifadi skilyrdislaust
     fetch-player-gw        skrifadi skilyrdislaust (5,5 MB)

   Skrarnar sem thaer skrifa eru INNTAK BAKPROFANNA. Toemist ein theirra
   fellur ekki appid — bakprofin baera bara faerri timabil, thogult.

   Athugunin er GROF med vilja: hver skrifta sem skrifar i `data/` verdur
   ad eiga BADI `process.exit(2)` OG hafa vord fyrir tomri utkomu. Hun les
   ekki roksemdina, adeins ad hun se til — nakvaemari athugun vaeri onnur
   utfaersla af sama vardi.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("TOM KEYRSLA MA EKKI YFIRSKRIFA — vordur i handvirku skriftunum");
console.log("─".repeat(84));
{
  const dir = ROOT + "scripts/";
  const oneOff = readdirSync(dir).filter(f => /^fetch-.*\.mjs$/.test(f));
  ok(oneOff.length >= 4, `handvirkar saekjur fundnar (${oneOff.length})`);
  const bad = [];
  for (const f of oneOff) {
    const raw = readFileSync(dir + f, "utf8");
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    /* Skrifar hun yfirleitt i data/? Ef ekki er ekkert ad verja.        */
    if (!/write(File|JSON)\(\s*[`"']?(data\/)?[a-z_]+\.json/i.test(code)) continue;
    const dies = /process\.exit\(\s*2\s*\)/.test(code);
    /* Vord fyrir tomri utkomu: `if (!x.length)` / `Object.keys(...).length`
       i naegd vid exit. Grof leit: bædi ord verda ad koma fyrir.        */
    const guards = /!\s*\w+\.length|Object\.keys\([^)]*\)\.length|!\s*total|!\s*games/.test(code);
    if (!dies || !guards) bad.push(`${f}${!dies ? " (engin exit(2))" : ""}${!guards ? " (ekkert tomleika-vord)" : ""}`);
  }
  ok(bad.length === 0,
     `hver saekja deyr fremur en ad skrifa tomt${bad.length ? " — " + bad.join(", ") : ""}`);

  /* Og su sem for verst: `r.ok` VERDUR ad vera prófad adur en likaminn er
     lesinn — annars er villusida thattud sem gogn.                      */
  const clubelo = readFileSync(dir + "fetch-clubelo-history.mjs", "utf8");
  ok(/res\.ok|response\.ok|\.ok\s*\)/.test(clubelo),
     "fetch-clubelo-history stadfestir HTTP-stodu adur en CSV er thattad");
}

/* ============================================================
   ARKIV-SVID — GEYMT ER EKKI ThAD SAMA OG NOTAD

   Tvennt er skrifad i `data/` VILJANDI OLESID (sja hvitlistann ad ofan):
     (a) fjolda-svidin i `events.json` (most_captained, chip_plays,
         transfers_made, top_element_info …) — FPL geymir thau adeins fyrir
         yfirstandandi timabil og tvo theirra breytast INNAN umferdar
     (b) `data/odds_raw/{date}-{window}.json` — hraa the-odds-api svarid,
         thar sem linu-hreyfing og misraemi milli boka liggur

   HAETTAN ER EKKI GEYMSLAN HELDUR HITT: einhver (eg sjalfur, eftir manud)
   ser fallegt svid i skra og tengir thad. CLAUDE.md kafli 4 hefur ThEGAR
   maelt fjoldann sem merki og hafnad honum (r = -0,0005 ofan a `ep_next`,
   CI [-0,019, +0,019]; -0,111 medal theirra sem spiludu).
   Vordurinn er thvi ORFAAR LINUR MED TENNUR: nefni `src/` eitthvert
   thessara svida FELLUR ThETTA SAFN, og su sem tengir verdur ad maela
   fyrst og fjarlaegja fullyrdinguna vitandi vits.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("ARKIV-SVID — skrifud, viljandi olesin");
console.log("─".repeat(84));
{
  /* 1. Hvitlista-faerslurnar VERDA ad vera til og bera maelinga-tilvisunina.
        An thessa vaeri hin fullyrdingin ovarin gegn thvi ad rokin hverfi.  */
  for (const k of ARCHIVE_ONLY) {
    const why = OK_UNREAD[k] || "";
    ok(/CLAUDE\.md 4/.test(why) && /maelingar/i.test(why),
       `hvitlistinn ber ARKIV-astaeduna fyrir "${k}" (og visar i maelinguna)`, why || "VANTAR");
  }

  /* 2. Pipeline SKRIFAR thau raunverulega — annars er allt hitt tomt tal.  */
  ok(/most_captained:\s*ev\.most_captained/.test(fetchSrc) && /chip_plays:\s*ev\.chip_plays/.test(fetchSrc),
     "fetch.mjs afritar fjolda-svidin i events.json");
  ok(/writeJSON\(\s*rel\s*,/.test(fetchSrc) && /odds_raw\/\$\{day\}-\$\{win\}\.json/.test(fetchSrc),
     "fetch.mjs skrifar hraa Odds-svarid i dagsetta skra undir odds_raw/");
  ok(/record\(\s*"odds_raw"/.test(fetchSrc),
     "og skrair sig i stodunni (annars er hun osynileg thegar hun brotnar)");
  /* TOM KEYRSLA MA ALDREI SKRIFA, OG SKRA SEM ER TIL ER ALDREI YFIRSKRIFUD
     (CLAUDE.md 8e). Badar greinarnar verda ad vera til stadar.            */
  ok(/if \(!nRaw\)/.test(fetchSrc) && /existsSync\(`\$\{DATA\}\/\$\{rel\}`\)/.test(fetchSrc),
     "tomt svar skrifar ekkert OG skra sem er til er ekki yfirskrifud");
  /* ARKIVID MA ALDREI FELLA SOKNINA. Bresti skrifin ma `fetchOdds` ekki
     kastast ut i ytra `catch` i main() — tha vaeri `odds` skrad BILAD og
     markadslidurinn dottinn ur FFDR af thvi ad GEYMSLA brast.           */
  ok(/record\("odds_raw", false, 0, `archive failed: \$\{e\.message\}/.test(fetchSrc),
     "arkiv-skrifin eru i eigin try/catch — geymsla ma ekki fella markadslinuna");

  /* 3. OG ENGINN LES ThAU. Thetta er fullyrdingin sem ma falla.           */
  const CROWD = ["most_captained", "most_vice_captained", "most_selected",
                 "most_transferred_in", "top_element", "top_element_info",
                 "highest_score", "highest_scoring_entry", "chip_plays",
                 "transfers_made", "ranked_count", "data_checked"];
  const leaked = CROWD.filter(f => new RegExp(`\\b${f}\\b`).test(appCode));
  ok(leaked.length === 0,
     `ekkert i src/ les fjolda-svidin (${CROWD.length} svid skodud)`,
     leaked.length ? `TENGT AN MAELINGAR: ${leaked.join(", ")} — sja CLAUDE.md 4` : "");
  /* ODDS_RAW: ThAD ER GOGNIN SEM ERU BONNUD, EKKI ORDID (16.8.2026).
     Fyrsta utgafan var `!/\bodds_raw\b/.test(appCode)` og hun felldi
     RETTA breytingu: `odds_raw` var bætt i `SHOW`-vorpunina i App.jsx svo
     ARKIV-RODIN SJAIST undir "Data sources". Thad er ekki lestur a arkivinu
     — thad les `status.json.sources.odds_raw`, sem er HEILSUFAR heimildar,
     og kafli 7 heimtar beinlinis ad hver heimild skrai sig thar ("annars er
     hun osynileg thegar hun brotnar"). Ad fela hana vaeri ad endurtaka
     nakvaemlega villuna sem `prediction_ledger` var: skrifud, aldrei synd.

     Bannid er thvi a GOGNUNUM: enginn ma sækja skrana (`odds_raw/…`) ne
     lesa `response`-farminn ur henni. Status-lykillinn einn er leyfdur, og
     hann er hvitlistadur ThRONGT — sem strengur i vorpun, ekki i slod.    */
  /* ATHUGASEMDIR ERU EKKI KODI. Rokstudningurinn fyrir arkivinu NEFNIR
     `odds_raw` a islensku bædi i App.jsx og hér; fyrsta utgafan las thad
     sem nytingu og féll a sinni eigin skjolun. Sama gildra og "MEASURED"-
     notan sem urelti sig thegjandi (kafli 8) — bara ofugt formerki.      */
  const appNoCmt = appCode.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  const rawPath  = /odds_raw\s*\/|["'`]odds_raw["'`]\s*\+|\/data\/odds_raw/.test(appNoCmt);
  const rawUse   = [...appNoCmt.matchAll(/\bodds_raw\b/g)]
    .filter(m => !/^odds_raw:\s*["'`]/.test(appNoCmt.slice(m.index, m.index + 40)));
  ok(!rawPath && rawUse.length === 0,
     `ekkert i src/ SÆKIR odds_raw-arkivid (status-lykill i SHOW er leyfdur)`,
     rawPath ? "SLOD I ARKIVID FANNST — sja CLAUDE.md 4"
             : rawUse.length ? `TENGT AN MAELINGAR: ${rawUse.length} nyting — sja CLAUDE.md 4` : "");
  /* FORSENDAN — an hennar getur fullyrdingin hér ad ofan ekki brugdist
     (tomur `appCode` vaeri graenn). Um leid ver hun sjalfa SHOW-rodina:
     hverfi hun ur App.jsx er arkivid ordid osynilegt aftur.              */
  ok(/odds_raw:\s*["'`]/.test(appNoCmt),
     "en STATUS-RODIN er i SHOW — arkivid sest thegar thad brestur (kafli 7)");
  /* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b regla 1): listinn ma
     ekki tæmast thegjandi og skilja eftir graena tolu.                    */
  ok(CROWD.length === 12, `arkiv-listinn telur 12 svid (${CROWD.length})`);
}

/* ============================================================
   `elo_age` — RODIN SEM GAT HORFID ThEGJANDI

   `main()` reiknadi `ageH` og kalladi `record("elo_age", ...)` INNI I
   `if (Number.isFinite(ageH))` — MED ENGRI `else`. Ytra `catch` grípur
   adeins skra sem VANTAR; skra sem thattast fint en ber `updated: null`,
   vantandi `updated` eda rusl gefur NaN, skilyrdid slokknar og rodin
   hverfur UR "Data sources" alveg. Blokkin var skrifud (14.8.2026) til ad
   drepa nakvaemlega thessa thogn — "GOMUL gogn birt sem NY" — og bar hana
   sjalf. Latent i dag (`elo.json.updated` er gilt ISO), svo hun fannst med
   lestri en aldrei i keyrslu.

   `fetch.mjs` kallar `main()` a einingarsviði og verdur thvi EKKI FLUTT
   INN. Fallid er dregid UT UR upprunanum og keyrt her a tilbunum gognum —
   sama leid og `lineups.mjs` notar a `fetchLineups`.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("elo_age — hver utkoma skrair ROD, lika onothaeft `updated`");
console.log("─".repeat(84));
{
  const s = fetchSrc.indexOf("export function eloAgeRow(");
  ok(s >= 0, "eloAgeRow er dregid ut i hreint fall (profanlegt an nets)");
  const decl = s >= 0 ? fetchSrc.slice(s, fetchSrc.indexOf("\n}\n", s) + 3) : "";
  const eloAgeRow = s >= 0
    ? new Function(decl.replace(/^export /, "") + "\nreturn eloAgeRow;")()
    : () => undefined;

  const NOW = Date.UTC(2026, 7, 16, 12, 0, 0);
  const hAgo = h => new Date(NOW - h * 36e5).toISOString();

  const fresh = eloAgeRow({ updated: hAgo(2) }, NOW);
  ok(fresh && fresh.ok === true && /2\.0h old/.test(fresh.note),
     "ferskt (2 klst) -> graen rod", JSON.stringify(fresh));
  const stale = eloAgeRow({ updated: hAgo(120) }, NOW);
  ok(stale && stale.ok === false && /STALE: 5\.0 days/.test(stale.note),
     "5 daga gamalt -> raud rod sem segir hve gomul", JSON.stringify(stale));
  /* ThETTA ER GREININ SEM VANTADI. Fjogur onothaef `updated` og OLL verda
     ad skila rod — ekki `undefined`, ekki thogn.                          */
  const BROKEN = [
    ["updated vantar",       {}],
    ["updated: null",        { updated: null }],
    ["updated: rusl",        { updated: "rusl" }],
    /* ATH: `updated: 0` VAR HER OG ThAD VAR RANGT PROFTILVIK — `Date.parse(0)`
       thvingar i strenginn "0" sem er GILD dagsetning (ar 2000), svo rodin
       fer rettilega i STALE-greinina. Profid a ad nota gildi sem er
       raunverulega othattanlegt.                                          */
    ["updated: hlutur",      { updated: {} }],
    ["skrain sjalf er null", null],
  ];
  for (const [name, file] of BROKEN) {
    const row = eloAgeRow(file, NOW);
    /* `count` VERDUR AD VERA TALA, ekki NaN. Fyrsta utgafa fullyrdingarinnar
       kraafdist adeins ad rod VAERI TIL — og stokkbreyting sem let NaN falla
       i gegnum STALE-greinina (`Math.round(NaN)`, "STALE: NaN days old")
       SLAPP thvi i gegn. NaN i stodu-rod er ekki betra en engin rod.     */
    ok(!!row && row.ok === false && typeof row.note === "string" && row.note.length > 20
       && Number.isFinite(row.count) && !/NaN/.test(row.note),
       `${name} -> ROD ER SKRAD, an NaN (var: engin rod)`, JSON.stringify(row));
    ok(!!row && /updated/.test(row.note || ""),
       `${name} -> notan nefnir hvad er ad`, String(row && row.note));
  }
  /* Og ad kall-stadurinn noti fallid — hreint fall sem enginn kallar er
     jafn thogult og gamla `if`-id (sama lærdomur og `lineups.mjs`).      */
  ok(/const row = eloAgeRow\(eloFile\)/.test(fetchSrc)
     && /record\("elo_age", row\.ok, row\.count, row\.note\)/.test(fetchSrc),
     "main() kallar eloAgeRow og skrair rodina SKILYRDISLAUST");
  /* ATHUGASEMDIR ERU FJARLAEGDAR ADUR EN LEITAD ER. Fyrsta utgafa thessarar
     fullyrdingar FELL a RETTUM koda: hausinn a `eloAgeRow` VITNAR i gomlu
     linuna ordrett (`if (Number.isFinite(ageH))`) sem villusogu, og leitin
     fann tilvitnunina. Prof sem les kodha verdur ad lesa KODHA.          */
  const fetchCode = fetchSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(!/if \(Number\.isFinite\(ageH\)\)/.test(fetchCode),
     "gamla skilyrdid an `else` er farid ur main()");
}

console.log(`\nTENGINGAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
