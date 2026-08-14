/* ============================================================
   UMFERDARSKYRSLAN UR SPEGLUN — `buildArchiveGwReport`

   AF HVERJU ThETTA SAFN ER TIL (14.8.2026):
   `deriveLastGwReport` fell thegjandi i ThRJA DAGA og ekkert prof sa thad.
   Villan var EIN TILVISUN: `parseCSVQuoted(text).rows`. `parseCSV` skilar
   `{header, rows}` en `parseCSVQuoted` skilar FYLKINU sjalfu, svo `.rows`
   var `undefined`, `.filter` kastadi, `try/catch` gleypti og lykkjan gekk
   g=38..1 an nidurstodu. Nidurstadan var:
     · status.json: last_gw ok:false "no gameweek file in the mirror" (12.-14.8)
     · data/last_gw.json fraus a 11.8 og Gameweek-flipinn birti thann snapshot
     · 38 tilgangslaus koll a raw.githubusercontent i hverri dagskeyrslu
   Skiptin yfir i quote-aware parserinn (11.8) voru RETT — nafn med kommu
   innan gaesalappa ("Sanchez, Robert") hlidradi ollum dalkum radarinnar —
   en thau toku ekki `.rows` med ser.

   ThAD SEM ER VARID:
   1. Skyrslan SKILAR NIDURSTODU a raunverulegu vaastav-sniði (`ok: true`,
      radir > 0). Thetta er fullyrdingin sem fell hefdi hun verid til.
   2. GAESALAPPA-KOMMAN heldur — thad var astaedan fyrir parser-skiptunum,
      svo bædi villurnar geta ekki komid til baka an thess ad safnid falli.
   3. PARSER-SAMNINGARNIR sjalfir: `parseCSV` skilar hlut med `rows`,
      `parseCSVQuoted` skilar fylki. Tveir parserar med ólíkum samningi i
      somu skra er villugildran sjalf, svo hun er skjolfest sem PROF.

   Adferdin er su sama og i `defcon-shrink.mjs` og `mins-trend.mjs` kafla 0:
   kodinn er DREGINN UT UR scripts/fetch.mjs (raunverulegur texti, ekki
   afrit) og keyrdur a TILBUNUM gognum. Afrit af formulu i profi maelir
   afritid, ekki kodann sem keyrir i pipeline (CLAUDE.md 7.0).
   ============================================================ */
import { readFile } from "node:fs/promises";

let pass = 0, fail = 0;
const ok = (c, m, x = "") => {
  if (c) { pass++; console.log("  ✓ " + m); }
  else { fail++; console.log(`  ✗ ${m}${x ? "   " + x : ""}`); }
};
const H = t => console.log(`\n${"─".repeat(78)}\n${t}\n${"─".repeat(78)}`);

const src = await readFile(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");

/* ---------- DREGID UT UR scripts/fetch.mjs ---------- */
/* Jafnvaegistalning a slaufusvigum: `indexOf("\n}\n")` (adferdin i
   defcon-shrink) klippir a fyrstu utlinu-lokun, sem er RETT thar en ekki
   her — `buildArchiveGwReport` inniheldur `for`-lykkjur sem loka svona.
   OG TALNINGIN VERDUR AD BYRJA EFTIR VIDFANGALISTANN: `normPlayerRow`
   tekur AFBYGGDAN hlut (`function normPlayerRow({ id, name, ... })`), svo
   fyrsti `{` er vidfangid sjalft og talningin lokadist a undan skrokknum.
   Fyrsta utgafan gerdi thetta og skiladi hausnum einum — `SyntaxError`.  */
function grab(name, kind = "async function") {
  const start = src.indexOf(`${kind} ${name}(`);
  if (start < 0) return null;
  let p = 0, bodyAt = -1;
  for (let k = src.indexOf("(", start); k < src.length; k++) {
    if (src[k] === "(") p++;
    else if (src[k] === ")") { p--; if (!p) { bodyAt = src.indexOf("{", k); break; } }
  }
  if (bodyAt < 0) return null;
  let d = 0;
  for (let k = bodyAt; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}") { d--; if (!d) return src.slice(start, k + 1); }
  }
  return null;
}
const fnArchive = grab("buildArchiveGwReport");
const fnNorm    = grab("normPlayerRow", "function");
const fnCSV     = grab("parseCSV", "function");
const fnCSVQ    = grab("parseCSVQuoted", "function");

H("0. KODINN FINNST OG ER DREGINN UT");
ok(!!fnArchive, "buildArchiveGwReport finnst i scripts/fetch.mjs");
ok(!!fnNorm,    "normPlayerRow finnst");
ok(!!fnCSV && !!fnCSVQ, "badir parserarnir finnast");
/* SANNANLEG FORSENDA fyrir neikvædu fullyrdinguna i kafla 3. */
ok(/parseCSVQuoted\(text\)/.test(fnArchive),
   "skyrslan notar parseCSVQuoted (forsenda naestu fullyrdingar)");

/* ---------- TILBUIN VAASTAV-GOGN ---------- */
/* Tvo lid, tveir leikir, og NAFN MED KOMMU INNAN GAESALAPPA i sinni ród —
   thad er tilfellid sem quote-aware parserinn var tekinn upp fyrir.      */
const TEAMS_CSV = "id,name,short_name\n1,Arsenal,ARS\n2,Chelsea,CHE\n";
const GW_CSV = [
  "element,name,position,team,opponent_team,was_home,fixture,kickoff_time,minutes,total_points,starts,goals_scored,assists,clean_sheets,goals_conceded,own_goals,saves,penalties_saved,penalties_missed,yellow_cards,red_cards,bonus,bps,expected_goals,expected_assists,expected_goal_involvements,expected_goals_conceded,value,team_h_score,team_a_score",
  '1,Saka,MID,Arsenal,2,True,101,2026-05-24T15:00:00Z,90,12,1,1,1,1,0,0,0,0,0,0,0,3,42,0.55,0.31,0.86,0.72,105,2,0',
  '2,"Sanchez, Robert",GK,Chelsea,1,False,101,2026-05-24T15:00:00Z,90,2,1,0,0,0,2,0,4,0,0,0,0,0,18,0.0,0.0,0.0,1.94,50,2,0',
  '3,Rice,MID,Arsenal,2,True,101,2026-05-24T15:00:00Z,67,5,1,0,1,1,0,0,0,0,0,1,0,1,26,0.11,0.44,0.55,0.72,65,2,0',
].join("\n") + "\n";

/* getText: teams.csv alltaf; gw38 er EINA umferdin sem er til, svo lykkjan
   verdur ad finna hana i fyrstu tilraun (g=38).                          */
let calls = 0;
const STUBS = `
let CALLS = 0;
const ARCHIVE_SEASON = "2025-26";
const MIRROR = "https://mirror.test";
const DATA = "/nonexistent";
const status = { updated: "2026-08-14T06:00:00Z" };
const RECORDS = [];
const WRITES = [];
const MISSING_NOTE = { measured: "test" };
const NAMES = { ARS: { fdcouk: "Arsenal" }, CHE: { fdcouk: "Chelsea" } };
async function getText(url) {
  CALLS++;
  if (url.endsWith("/teams.csv")) return { text: ${JSON.stringify(TEAMS_CSV)} };
  if (url.endsWith("/gws/gw38.csv")) return { text: ${JSON.stringify(GW_CSV)} };
  throw new Error("404 " + url);
}
async function readFile() { throw new Error("no E0 file in the test"); }
function e0Index(rows) { return {}; }
function e0Stats(row) { return null; }
async function writeJSON(name, obj) { WRITES.push({ name, obj }); }
function record(k, ok, n, note) { RECORDS.push({ k, ok, n, note }); }
`;
const mod = await import("data:text/javascript," + encodeURIComponent(
  STUBS + fnCSV + "\n" + fnCSVQ + "\n" + fnNorm + "\n" + fnArchive +
  "\nexport { buildArchiveGwReport, RECORDS, WRITES, parseCSV, parseCSVQuoted };" +
  "\nexport const callCount = () => CALLS;"));

await mod.buildArchiveGwReport();
const rec = mod.RECORDS.find(r => r.k === "last_gw");
const wrote = mod.WRITES.find(w => w.name === "last_gw.json");

H("1. SKYRSLAN SKILAR NIDURSTODU (fullyrdingin sem VANTADI)");
ok(!!rec, "last_gw er skrad i status", JSON.stringify(mod.RECORDS));
ok(rec?.ok === true, "last_gw er ok:true — EKKI 'no gameweek file in the mirror'",
   JSON.stringify(rec));
ok((rec?.n ?? 0) > 0, `radir > 0 (${rec?.n})`, JSON.stringify(rec));
ok(!!wrote, "last_gw.json er skrifud");
ok((wrote?.obj?.players?.length ?? 0) === 3, `allir thrir leikmenn komust i skrana (${wrote?.obj?.players?.length})`);
ok(wrote?.obj?.gw === 38, `umferdin er 38 (${wrote?.obj?.gw})`);
ok(wrote?.obj?.archive === true, "skran er merkt archive");
ok((wrote?.obj?.fixtures?.length ?? 0) === 1, `einn leikur endurbyggdur (${wrote?.obj?.fixtures?.length})`);
/* KVOTINN: lykkjan ma ekki brenna 38 kollum thegar gw38 er til.
   Vid 38 skiptum var thetta einkennid — ein ferd nidur allan stigann.    */
ok(mod.callCount() <= 3, `getText kollud <=3 sinnum (${mod.callCount()}), ekki 39`);

H("2. GAESALAPPA-KOMMAN — ASTAEDAN FYRIR PARSER-SKIPTUNUM");
const gk = wrote?.obj?.players?.find(p => p.pos === "GK");
ok(gk?.name === "Sanchez, Robert", `nafn med kommu helst heilt (${JSON.stringify(gk?.name)})`);
/* Med naiva parsernum hlidrudust ALLIR dalkar radarinnar um einn, svo
   tolurnar hennar eru sannprofid — ekki bara nafnid.                     */
ok(gk?.minutes === 90, `mínutur radarinnar eru rettar (${gk?.minutes})`);
ok(gk?.saves === 4, `varslur eru rettar (${gk?.saves}) — hlidrun hefdi skekkt thetta`);
ok(gk?.team === "CHE", `lid rett vardad (${gk?.team})`);

H("3. PARSER-SAMNINGARNIR (villugildran sjalf)");
const q = mod.parseCSVQuoted(TEAMS_CSV);
const c = mod.parseCSV(TEAMS_CSV);
ok(Array.isArray(q), "parseCSVQuoted skilar FYLKI");
ok(q.rows === undefined, "...og hefur ekkert `.rows` — thess vegna kastadi `.rows.filter`");
ok(!Array.isArray(c) && Array.isArray(c.rows), "parseCSV skilar `{header, rows}`");
/* NEIKVAED FULLYRDING MED SANNADRI FORSENDU (CLAUDE.md 5b regla 2):
   kafli 0 sannadi ad `parseCSVQuoted(text)` ER i thessum kodabalki.      */
ok(!/parseCSVQuoted\([^)]*\)\s*\.rows/.test(src),
   "ENGINN stadur i fetch.mjs les `.rows` af parseCSVQuoted");

console.log(`\nSKYRSLA UR SPEGLUN: ${pass}/${pass + fail} graen`);
process.exit(fail ? 1 : 0);
