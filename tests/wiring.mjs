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
     yfirstandandi timabils. Pipeline les E0-2526 og E0-2425 (HARDKODAD,
     linur ~1772/1853/1858) og ENGIN kodaleid les 2627. I forleik er thad
     rett — skrain er 404 hja football-data thangad til fyrsti leikur er
     spiladur (kafli 6e) og lidsstyrkur a ad koma ur FYRRA timabili.
     ThEGAR TIMABILID BYRJAR tharf ad akveda hvort team_form eigi ad blanda
     inn yfirstandandi E0. Thad er INNTAKS-breyting a lidsstyrk og fellur
     thvi undir regluna i kafla 3: maela fyrst. Skrad her svo thad se ekki
     gleymt i agust.                                                      */
  "fdcouk/E0-2627.json":       "hragogn yfirstandandi timabils; pipeline les 2526/2425 — sja nota",
};
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
  ok(/API_MIN_REMAINING/.test(fetchSrc) && /x-ratelimit-requests-remaining/.test(fetchSrc),
    "API-Sports les kvota-hausinn OG hefur throskuld (reikningur var uppsagdur 2.8.)");
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
ok(/api_lineups/.test(appCode),
  "api_lineups hefur merki i heimildalistanum (annars synist hun ekki thott hun se lesin)");

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
  /* 1. API-Sports nafna-porun — fyrsta raunprofid 20.-21. agust (kafli 6) */
  const inj = J("injuries.json");
  const nPl = inj?.players?.length ?? 0, nUn = inj?.unmatched?.length ?? 0;
  if (nPl + nUn === 0) {
    console.log("  API-Sports: engin gogn enn (forleikur) — athugunin bidur");
    ok(true, "API-Sports-porun: bidur gagna (rett i forleik, 0 koll notud)");
  } else {
    const rate = nPl / (nPl + nUn);
    console.log(`  API-Sports: ${nPl} paradir, ${nUn} oparadir -> ${(100*rate).toFixed(1)}%`);
    ok(rate >= 0.9,
      `nafna-porun >=90% (${(100*rate).toFixed(1)}%) — undir thvi hefur heimild breytt nafnaformi`);
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
  /* 3. Stadfest byrjunarlid — kviknar a leikdegi */
  const lu = J("lineups.json");
  if ((lu?.players?.length ?? 0) === 0) {
    const gated = lu?.probe?.gated;
    console.log(`  Byrjunarlid: engin gogn (utan glugga)${gated ? " · ThREP LOKAD" : ""}`);
    ok(gated !== true,
      gated === true ? "ATH: API-threpid LEYFIR EKKI /fixtures/lineups — sja probe i lineups.json"
                     : "byrjunarlid bidur leikdags (threp leyfir endapunktinn)");
  } else {
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

console.log(`\nTENGINGAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
