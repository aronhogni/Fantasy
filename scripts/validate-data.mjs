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
export function regressions(nowObj, headObj, name = "file") {
  const out = [];
  const now = counts(nowObj), was = counts(headObj);
  for (const [field, before] of Object.entries(was)) {
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
