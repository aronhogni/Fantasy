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
const srcFiles = readdirSync(ROOT + "src").filter(f => /\.(jsx|js)$/.test(f));
const appCode = srcFiles.map(f => readFileSync(ROOT + "src/" + f, "utf8")).join("\n");

/* Hvað skrifar pipeline? */
const written = [...fetchSrc.matchAll(/writeJSON\(\s*[`"]([^`"]+\.json)[`"]/g)]
  .map(m => m[1])
  .filter(f => !/\$\{|\{n\}/.test(f));            // sleppum sniðmátum (live/gw{n})
const uniq = [...new Set(written)].sort();
ok(uniq.length > 20, `${uniq.length} fastar gagnaskrár skrifaðar úr pipeline`);

/* SKRÁR SEM ENGINN LES — hver með ÁSTÆÐU. Ekki bæta við án ástæðu. */
const OK_UNREAD = {
  "teams_map.json":            "pipeline-innri nafnavörpun; appið notar teams.json",
  "status_fast.json":          "lesin GEGNUM pipeStatusFast — sjá athugasemd hér neðar",
  "fdcouk/h2h.json":           "hráefni fyrir framtíðar-h2h; engin sýn enn (skjalað í SCHEMA)",
  "fdcouk/referees.json":      "hráefni fyrir dómara-sýn; engin sýn enn",
  "understat/season.json":     "Understat SLÖKKT (kafli 6e) — skrifast ekki í reynd",
  "understat/big_chances.json":"Understat SLÖKKT (kafli 6e)",
  "season_baseline.json":      "lesin sem seasonsFile/baseline — nefnd óbeint",
  "gameweek_shape.json":       "lesin í GwReport gegnum breytu",
  "odds.json":                 "lesin sem `odds` (44 tilvik) — nafnið sjálft ekki í src",
  "luck.json":                 "lesin sem `luck` (12 tilvik)",
  "rotation.json":             "lesin sem `rotation` (14 tilvik)",
  "lineups.json":              "lesin sem `lineups` — TENGD 1.8.2026",
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
const unread = uniq.filter(f => {
  const base = f.split("/").pop().replace(/\.json$/, "");
  return !appCode.includes(f) && !new RegExp(`["'\`]${base}\\.json`).test(appCode)
      && !new RegExp(`\\b${base}\\b`).test(appCode);
});
console.log(`\n  skrifað en ónefnt í src/: ${unread.length ? unread.join(", ") : "engar"}`);
const undocumented = unread.filter(f => !OK_UNREAD[f]);
ok(undocumented.length === 0,
  `hver ólesin skrá hefur ÁSTÆÐU á hvítlista${undocumented.length ? ": VANTAR " + undocumented.join(", ") : ""}`);

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

console.log(`\nTENGINGAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
