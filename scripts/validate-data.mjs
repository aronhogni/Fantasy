/* ============================================================
   validate-data.mjs — HLID FYRIR COMMIT (25.8.2026)

   `status.json` skrair raudar heimildir samviskusamlega, en EKKERT
   velraent stoppadi committ-id. Skemmd eda tom snapshot for thvi beint
   i `main` — og appid les `data/` BEINT af raw.githubusercontent, an
   bakenda, svo hun lendir oleidrett i vafra notandans.

   ============================================================
   HVERS VEGNA AFTURFOR EN EKKI ThROSKULDAR
   ============================================================
   Freistandi utfaerslan er fost mork ("players >= 400, teams === 20,
   fixtures >= 380"). Eg hafnadi henni fyrir alla nema hordustu
   byggingar-invariantana, af tveimur astaedum:

     1. ThAER TOLUR VAERU VALDAR, EKKI MAELDAR. Repo-id hefur eina reglu
        yfir allar adrar: omaeld tala sem litur ut eins og maeling er
        versta utkoman. Threskuldur sem eg vel klukkan tvo um nott og
        sem stodvar gagna-keyrsluna er nakvaemlega thad.
     2. FAST THAK UREKST VID RAUNVERULEIKANN OG ThAGNAR. Sama aett og
        hardkodada safna-talan i run-tests.mjs, "4-10"-sviðið i
        SetPieces og linutolurnar i CLAUDE.md: talan er rett i dag og
        rong eftir mánud, og tha frystir hun `data/` an thess ad neinn
        skilji hvers vegna.

   ThESS I STAD ER BORID SAMAN VID ThAD SEM ER ThEGAR COMMITTAD (HEAD).
   Reglan sem repo-id notar nu thegar — "aldrei skrifa VERRI skra ofan a
   BETRI" (`seasonBaselineDecision`, kafli 8e) — er faerd upp a
   snapshot-stigid. Hun kvardar sig sjalf: 600 leikmenn i dag og 600 a
   morgun er i lagi, 600 -> 0 er ekki, og hvorugt krefst thess ad eg viti
   hvad "nogu margir" er.

   HVAD STODVAR COMMITT (og ekkert annad):
     A. JSON sem ThATTAST EKKI. Getur ekki verid loglegt astand.
        (Atomisku skrifin i `writeJSON` eiga ad utiloka thetta — thetta
        er beltid vid hlidina a axlaboondunum, thvi bilunin er thogul.)
     B. FYLKI/HLUTUR SEM VAR OTOMUR I HEAD OG ER TOMUR NUNA. Ekki "of
        litill" — TOMUR. Su breyting hefur enga loglega orsok.
     C. `teams.json` sem er ekki 20 lid. Eini fasti sem er BYGGINGARLEGUR
        i staðinn fyrir ad vera valinn: Urvalsdeildin er 20 lid, og hafi
        skrain adra tolu er thad bilun i sokninni, ekki timabils-breyting.

   HVAD STODVAR ThAD EKKI (asetningur):
     · raudar heimildir i `status.json`. Ein heimild af tuttugu ma detta
       ut an thess ad snapshot-ith se onytt — kafli 6 segir berum ordum
       ad appid eigi ad virka thott heimild vanti, og hlid sem stodvar
       vid fyrstu raudu rod myndi frysta `data/` i hvert sinn sem
       ClubElo timar ut. B3 (vidvorun a thralata rauda) er ONNUR
       spurning og a ad leysast med vidvorun, ekki med hlidi.
     · faekkun sem er ekki nidur i null. Leikmenn fara ur 609 i 600 vid
       felagaskipti-glugga; thad er RETT gagn.

   ============================================================
   ThEKJAN ER EFSTA LAGID EITT — OG ThAD ER SAGT HER ThVI ANNARS
   VAERI ThAD LOFORD SEM SKRAIN STENDUR EKKI VID
   ============================================================
   `readdir` an `recursive` les `data/*.json` og EKKI undirmoppurnar.
   MAELT 25.8.2026: 51 skra i efsta lagi, en `data/fdcouk/` (17),
   `data/history/` (31), `data/live/` (1), `data/odds_raw/` (3) og
   `data/predictions/` (1) eru UTAN thekjunnar — 53 skrar til viðbotar.

   Tvennt af thvi er meðvitað:
     · `history/` og `predictions/` eru VIDBAETANDI skrar (ein per dag /
       per umferd) og eldri raðir eru ALDREI endurskrifadar, svo
       "afturfor i null" er ekki til sem astand hja theim.
     · `live/gw{n}.json` og `odds_raw/` vaxa lika adeins.
   Hitt er einfaldlega OGERT: undirmoppurnar fa ENGA JSON-thattun, svo
   trunkud `live/gw1.json` (409 KB, lesin af appinu) slyppi gegnum thetta
   hlid. Vaeri hlidid tengt aetti thad ad vera fyrsta viðbotin.

   Ad segja "51 skrar skodadar" an thessarar notu vaeri nakvaemlega su
   tegund tolu sem repo-ith varar vid: rett tala sem les eins og
   fullyrding um allt.

   Keyrsla:  node scripts/validate-data.mjs        (0 = ma committa)
             node scripts/validate-data.mjs --json <slod>
   ============================================================ */
import { readFileSync, realpathSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const DATA = `${ROOT}data`;

const problems = [];
const notes = [];

/** Skrain eins og hun er I HEAD (committud), eda null se hun ny. */
function headVersion(rel) {
  try {
    return execFileSync("git", ["show", `HEAD:data/${rel}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }          // ny skra — ekkert ad bera saman vid
}

/** Fjoldi radaa i hverju svidi sem BER safn. Djupt nog fyrir okkar snid. */
export function counts(obj, prefix = "", out = {}, depth = 0) {
  if (depth > 2 || obj == null || typeof obj !== "object") return out;
  if (Array.isArray(obj)) { out[prefix || "(root)"] = obj.length; return out; }
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) out[`${prefix}${k}`] = v.length;
    else if (v && typeof v === "object") {
      const n = Object.keys(v).length;
      out[`${prefix}${k}`] = n;
      if (depth < 2) counts(v, `${prefix}${k}.`, out, depth + 1);
    }
  }
  return out;
}

/* ============================================================
   AFTURFOR I NULL — HREINT FALL SVO ThAD SE PROFANLEGT (31.8.2026)

   Reglan var innbyggd i lykkjuna og thvi adeins profanleg med thvi ad
   smida git-hirslu. Nu er hun fall: tvo hlutir inn, listi af vandamalum
   ut. `tests/validate-data.mjs` keyrir hana a tilbunum gognum — thar a
   medal a RAUNVERULEGA tilfellinu sem slapp 29.8.2026 (`lineups.json`
   players 40 -> 0), sem thetta hlid hefdi hafnad hefdi thad verid tengt.
   ============================================================ */

/* ============================================================
   FJORDA UNDANThAGAN A EINUM DEGI — SVO REGLAN SJALF VAR
   ENDURORDUD (4.9.2026)
   ============================================================
   Hlidid stodvadi pipeline-una FJORUM SINNUM i dag, i hvert sinn a
   RETTUM gognum:
     · `bsd_odds.events.<id>`      lifandi ~4 daga gluggi
     · `news.price_changes`        FPL nullstillir vid frestinn
     · `lineups.probe`             skrifad adeins UTAN leikja-gluggans
     · `lineups.errors` 1 -> 0     ENGAR VILLUR i thessari keyrslu
     · `status_streak.sources.elo_fixtures`  heimild haetti ad skra sig
   Fyrri thrjar voru leystar med ThVI AD BAETA VID UNDANThAGU. Su fjorda
   sagdi ad ThAD VAERI RANGA LEIDIN: `errors` sem fer ur 1 i 0 er ekki
   gagnatap heldur GODAR FRETTIR, og regla sem les godar frettir sem
   bilun er RANGT ORDUD, ekki of throng.

   RETTA ORDALAGID: hlidid ver **BURDARGOGN**, ekki bokhald um keyrsluna.
   Bokhaldid ber i thessu repo-i litinn og upptalanlegan nafnalista, og
   nofnin thyda thad sama HVAR SEM ThAU BIRTAST:

     RUN_LOG    greiningarlistar thar sem TOMT ER GOTT — `errors`,
                `probe`, `calls`, `unmatched*`, `unresolved_teams`,
                `alias_collisions`, `requests_remaining`.
                Baedi hylkid og undirlyklar mega hverfa.
     RUN_LEDGER `sources` / `sources_ok` — stok heimild ma hverfa (thaer
                koma og fara) EN HYLKID MA ALDREI TOMAST: tha hefur
                pipeline-an haett ad skra nokkud. Nakvaemlega su regla
                sem `BOOKKEEPING`-reglan bar adur (31.8.2026, thegar
                tvaer leiddar heimildir voru teknar ur notkun og
                `status.json.sources.rotation` hvarf), nu an thess ad
                vera negld vid tvaer skrar — `status_streak.json` bar
                somu villu og var ekki a theim lista.

   ThAD SEM ER EKKI SLAKAD: hvert svid sem APPID LES lytur obreyttri
   reglu. `lineups.players`/`teams` mega ALDREI hverfa — su regla felldi
   `carryLineups`-villuna fyrr i dag og hun stendur oskert.
   ============================================================ */
const RUN_LOG = /^(errors|probe|calls|unmatched|unmatched_names|unmatched_to_fpl|unresolved_teams|alias_collisions|requests_remaining)(\.|$)/;
/* ============================================================
   FIMMTA TILFELLID: SAMA NAFN, TVAER MERKINGAR (4.9.2026)
   ============================================================
   `lineups.json.sources` er **FYLKI** af heitum theirra strauma sem
   svorudu (`["fotmob"]`) — run-log, og thad hverfur thegar enginn
   straumur var notadur. `status.json.sources` er **HLUTUR** med 37
   heimildum og ER sjalft efni skrarinnar; tomni thar thydir ad
   pipeline-an haetti ad skra nokkud.

   Nafna-reglan ein raedur thvi ekki vid thetta, og thad er lardomurinn:
   endurordunin fyrr i dag („reglan er a NAFNINU, ekki a skranni") var
   RETT UM ORSOKINA en of einfold um MERKINGUNA. Skilyrdid er thvi
   tvithaett og hvor helmingur er sagdur berum ordum:
     · `sources` SEM HYLKI ma hverfa alls stadar NEMA i stodu-skram,
     · undirlyklar `sources` mega alltaf hverfa (heimildir koma og fara).
   ============================================================ */
const STATUS_FILE = /^(status|status_fast|status_streak)\.json$/;
const RUN_LEDGER = /^(sources|sources_ok)\./;
/* ============================================================
   LIFANDI GLUGGI ER EKKI GAGNATAP (4.9.2026 — HLIDID STOPPADI
   PIPELINE-UNA I FIMM KLST OG ThAD VAR ThESSI REGLA SEM VANTADI)

   `bsd_odds.json` og `bsd_lineups.json` eru lyklud a LEIK-ID og bera
   adeins thad sem er innan ~4 daga glugga. Nota theirra eigin skrar
   segir thad berum ordum: „BSD odds only reach ~4 days ahead, so the
   file is empty outside that window and THAT IS CORRECT." Leikur sem
   er buinn hverfur thvi ur `events` — og hlidid las hvern slikan
   lykil sem gagnatap: `events.209545 (7 rows) DISAPPEARED`.

   AFLEIDINGIN VAR ThOGUL A RANGA ATT: hlidid er ordid ad hafna
   commit-inu, svo `fetch-fast` fell i HVERRI keyrslu fra 09:23 og
   `data/` frysti a GW1-mynd medan GW2 var buin. Vordur sem hafnar
   rettum gognum er ekki strangur heldur bilaður — og hann litur eins
   ut og bilud sokn thangad til logginn er lesinn.

   TOMUR GLUGGI ER LIKA LEYFDUR OG ThAD ER EKKI SLAKI A REGLU 8e:
   verdi ekkert af leikjunum innan ~4 daga (t.d. landsleikjahle) ER
   `events: {}` retta svarid, og ad hafna thvi vaeri ad frysta
   pipeline-una AFTUR — a fyrirsjaanlegum degi. Reglan 8e er variN
   ThAR SEM HUN A HEIMA, i SKRIFARANUM: `fetchBsdOdds` HELDUR fyrri
   verdlagdri skra thegar OLL kollin bila (`kept`), svo tom `events`
   sem NAER i skrana getur ekki verid bilud keyrsla. Vordur:
   `bsd-pipeline.mjs` kafli 9 og fullyrdingin i `validate-data.mjs`
   kafla 1c sem ber notu-ástöndin tvo saman.

   ThAD SEM ER EKKI SLAKAD: reglan gildir ADEINS um `events` (og lykla
   undir henni) i thessum tveimur skram. Skrarnar sjalfar, `updated`,
   `season_id` og hver onnur skra lyta obreyttri reglu — og
   `bsd-pipeline.mjs` ver afram ad TOM keyrsla megi ekki skrifa yfir
   heila (regla 8e), sem er ONNUR spurning: her hverfur EIN rod ur
   glugga, thar hverfur ALLT ur skra.
   ============================================================ */
const ROLLING = /^(bsd_odds|bsd_lineups)\.json$/;
/* ============================================================
   SVID SEM HEIMILDIN SJALF NULLSTILLIR (4.9.2026)

   Tvo svid til vidbotar tomast af RETTRI astaedu, og hvorugt er gagnatap:

   · `news.json.price_changes` er `cost_change_event !== 0` beint ur
     `bootstrap-static` — ThAD ER TELJARI SEM FPL NULLSTILLIR VID
     FRESTINN. Maelt i dag: 119 -> 0 i keyrslunni strax eftir GW3-frestinn.
     Sama nullstilling og klobbradi `season_baseline` (CLAUDE.md 7.1); thar
     var hun VILLA thvi vid skrifudum verri skra ofan a betri, her er hun
     RETT thvi svidid ER teljari umferdarinnar.
   · `lineups.json.probe` er GEYMT greiningarsvar um API-Sports og er
     adeins skrifad ThEGAR ENGINN LEIKUR ER I GLUGGANUM. A leikdegi er
     thad rettilega fjarverandi. Sama edli og `status.json.sources`:
     bokhald um keyrsluna, ekki gogn.

   ThAD SEM ER EKKI SLAKAD: bædi eru negld a SKRA OG SVID. `news.json`
   ma ekki missa `players`, og `lineups.json` ma ekki missa `players`
   ne `teams` — su regla felldi einmitt villuna i `carryLineups` samdaegurs.
   ============================================================ */
const SOURCE_RESET = [
  [/^news\.json$/,    /^price_changes(\.|$)/],
  [/^lineups\.json$/, /^probe(\.|$)/],
];
export function regressions(nowObj, headObj, name = "file") {
  const out = [];
  const now = counts(nowObj), was = counts(headObj);
  for (const [field, before] of Object.entries(was)) {
    /* Stok heimild ma hverfa ur bokhaldinu; `sources` i heild ma thad ekki. */
    /* Bokhald um keyrsluna — sja RUN_LOG / RUN_LEDGER ad ofan.        */
    if (RUN_LOG.test(field)) continue;
    if (RUN_LEDGER.test(field)) continue;
    /* `sources` sem HYLKI: run-log alls stadar nema i stodu-skram. */
    if (/^(sources|sources_ok)$/.test(field) && !STATUS_FILE.test(name)) continue;
    /* Stakur leikur ma hverfa ur lifandi glugga; sja ROLLING ad ofan. */
    if (ROLLING.test(name) && /^events(\.|$)/.test(field)) continue;
    if (SOURCE_RESET.some(([f, k]) => f.test(name) && k.test(field))) continue;
    const after = now[field];
    if (before > 0 && after === 0) {
      out.push(`${name}: \`${field}\` went ${before} -> 0. An empty run must `
        + "never erase good data (rule 8e).");
    } else if (before > 0 && after === undefined) {
      out.push(`${name}: \`${field}\` (${before} rows) DISAPPEARED from the file.`);
    }
  }
  return out;
}

/* ============================================================
   HLIDID KEYRIR ADEINS ThEGAR ThAD ER KEYRT (31.8.2026)

   Skriftan var OSKILYRT: hver innflutningur keyrdi allt hlidid OG kalladi
   `process.exit()`. Profid sem atti ad profa regluna gat thvi ekki einu
   sinni raest — skriftan for ut adur en fyrsta fullyrdingin keyrdi.
   Sama villa og `fetch.mjs` bar (CLAUDE.md 7.1) og sama lausn:
   `realpathSync` a BADUM megin svo symlinkud eda afstaed slod thaggi hana
   ekki nidur. Hreinu follin (`counts`, `regressions`) eru fyrir ofan
   thetta og eru thvi innflytjanleg an thess ad neitt gerist.
   ============================================================ */
const invokedDirectly = (() => {
  try { return realpathSync(process.argv[1] || "") === realpathSync(new URL(import.meta.url).pathname); }
  catch { return false; }
})();
if (!invokedDirectly) {
  /* innflutt: engin skrif, engin utganga, engin prentun */
} else {

const files = (await readdir(DATA, { withFileTypes: true }))
  .filter(d => d.isFile() && d.name.endsWith(".json"))
  .map(d => d.name)
  .sort();

let parsed = 0, compared = 0;

for (const name of files) {
  const full = `${DATA}/${name}`;
  let text, obj;
  try { text = readFileSync(full, "utf8"); }
  catch (e) { problems.push(`${name}: unreadable — ${e.message}`); continue; }

  /* ---- A. ThATTUN ---- */
  try { obj = JSON.parse(text); parsed++; }
  catch (e) {
    problems.push(`${name}: NOT VALID JSON (${(e.message || "").slice(0, 90)}) `
      + `— ${text.length} bytes; a truncated file must never be committed`);
    continue;
  }

  /* ---- C. BYGGINGARLEGUR FASTI ---- */
  if (name === "teams.json") {
    const n = Array.isArray(obj) ? obj.length : (obj.teams || []).length;
    if (n !== 20) problems.push(`teams.json: ${n} clubs, expected exactly 20 `
      + "(structural: the Premier League is 20 clubs — a different number is a "
      + "broken fetch, not a season change)");
  }

  /* ---- B. AFTURFOR I NULL ---- */
  const headText = headVersion(name);
  if (!headText) { notes.push(`${name}: new file, nothing to compare`); continue; }
  let headObj;
  try { headObj = JSON.parse(headText); }
  catch { notes.push(`${name}: HEAD copy does not parse — skipping comparison`); continue; }
  compared++;

  for (const p of regressions(obj, headObj, name)) problems.push(p);
}

/* ============================================================
   UNDIRMOPPURNAR — GATID SEM HAUSINN NEFNIR SJALFUR (31.8.2026)

   Hausinn sagdi: "undirmoppurnar fa ENGA JSON-thattun, svo trunkud
   `live/gw1.json` (409 KB, LESIN AF APPINU) slyppi gegnum thetta hlid.
   Vaeri hlidid tengt aetti thad ad vera fyrsta viðbotin." Hlidid er nu
   tengt (badar vinnuskrar), svo thetta er su viðbot.

   ADEINS ThATTUN, ENGIN AFTURFARAR-SAMANBURDUR: skrarnar eru
   VIDBAETANDI (ein per dag / per umferd / per glugga) og eldri radir eru
   aldrei endurskrifadar, svo "afturfor i null" er ekki til sem astand
   hja theim. Ad bera thaer saman vid HEAD vaeri ad finna upp astand sem
   getur ekki komid fyrir.                                            */
const SUBDIRS = ["live", "predictions", "history", "odds_raw", "fdcouk"];
let subParsed = 0;
for (const dir of SUBDIRS) {
  let entries = [];
  try { entries = (await readdir(`${DATA}/${dir}`)).filter(f => f.endsWith(".json")); }
  catch { notes.push(`${dir}/: not present`); continue; }
  let bad = 0;
  for (const f of entries) {
    try { JSON.parse(readFileSync(`${DATA}/${dir}/${f}`, "utf8")); subParsed++; }
    catch (e) { bad++; problems.push(`${dir}/${f}: NOT VALID JSON (${(e.message || "").slice(0, 90)}) `
      + "— the app reads these files straight from raw.githubusercontent"); }
  }
  notes.push(`${dir}/: ${entries.length} json${bad ? `, ${bad} BROKEN` : ""}`);
}

/* ThEKJA ER FULLYRDING, EKKI LOGGA: fyndi hlidid engar skrar vaeri thad
   thogult og graent — sama bilun og `react-warnings.mjs` hafdi thegar hun
   heimsotti 0 af 22 vidmotum (CLAUDE.md 5b regla 1).                    */
if (files.length < 20) problems.push(`only ${files.length} json files found in data/ `
  + "— the gate cannot be trusted to have looked at anything");

const report = {
  at: new Date().toISOString(),
  files: files.length, parsed, compared,
  ok: problems.length === 0,
  problems, notes,
};

const jsonAt = process.argv.indexOf("--json");
if (jsonAt > 0 && process.argv[jsonAt + 1]) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.argv[jsonAt + 1], JSON.stringify(report, null, 2));
}

console.log(`validate-data: ${files.length} files, ${parsed} parsed, `
  + `${compared} compared against HEAD · ${subParsed} more parsed in `
  + `${SUBDIRS.join("/, ")}/`);
for (const n of notes) console.log(`  ·    ${n}`);
if (!problems.length) { console.log("  OK   snapshot is safe to commit"); process.exit(0); }
console.log(`\n  ${problems.length} PROBLEM(S) — REFUSING THE COMMIT:`);
for (const p of problems) console.log(`  ✗    ${p}`);
process.exit(1);

}
