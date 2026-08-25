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

   Keyrsla:  node scripts/validate-data.mjs        (0 = ma committa)
             node scripts/validate-data.mjs --json <slod>
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
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
function counts(obj, prefix = "", out = {}, depth = 0) {
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

  const now = counts(obj), was = counts(headObj);
  for (const [field, before] of Object.entries(was)) {
    const after = now[field];
    if (before > 0 && after === 0) {
      problems.push(`${name}: \`${field}\` went ${before} -> 0. An empty run must `
        + "never erase good data (rule 8e).");
    } else if (before > 0 && after === undefined) {
      problems.push(`${name}: \`${field}\` (${before} rows) DISAPPEARED from the file.`);
    }
  }
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
  + `${compared} compared against HEAD`);
for (const n of notes) console.log(`  ·    ${n}`);
if (!problems.length) { console.log("  OK   snapshot is safe to commit"); process.exit(0); }
console.log(`\n  ${problems.length} PROBLEM(S) — REFUSING THE COMMIT:`);
for (const p of problems) console.log(`  ✗    ${p}`);
process.exit(1);
