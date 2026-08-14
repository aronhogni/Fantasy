/* ============================================================
   FOOTBALL-DATA E0 — DEILDIN VERDUR AD VERA E0

   VILLAN VAR LIFANDI 14.8.2026 OG HEIMILDIN VAR GRAEN:
   football-data 301-redirectar `mmz4281/2627/E0.csv` yfir a `EC.csv`
   (National League) medan PL-skrain er ekki til. `fetch` fylgir redirectum,
   og `fetchFdcouk` sannreyndi ADEINS 404 — svo:
     · data/fdcouk/E0-2627.json bar 12 radir, allar `Div: "EC"`
       (Altrincham v Southend, 08/08/2026)
     · status.json sagdi `fdcouk_e0 ok:true, count:12`
     · `gw1-checklist` atridi 8 ("er skrain til med rodum?") var ThEGAR
       uppfyllt — af utandeildar-rodum, svo thad hefdi ordid graent af
       RANGRI astaedu 21. agust
   Mælt beint: `curl -o /dev/null -w "%{http_code} %{redirect_url}"` skilar
   `301 -> .../2627/EC.csv` fyrir 2627 og `200` fyrir 2526.

   REGLAN: ohreint svar er medhondlad EINS OG 404 ("bidur timabils"), thvi
   thad er nakvaemlega thad sem redirectid thydir. Ekkert er skrifad.
   Sja CLAUDE.md 8e ("tom keyrsla ma aldrei thurrka ut god gogn") — hér er
   utvikkunin: RONG keyrsla ma ekki skrifa NEITT.
   ============================================================ */
import { readFile } from "node:fs/promises";

let pass = 0, fail = 0;
const ok = (c, m, x = "") => {
  if (c) { pass++; console.log("  ✓ " + m); }
  else { fail++; console.log(`  ✗ ${m}${x ? "   " + x : ""}`); }
};
const H = t => console.log(`\n${"─".repeat(78)}\n${t}\n${"─".repeat(78)}`);

const src = await readFile(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
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
const fnFd  = grab("fetchFdcouk");
const fnCSV = grab("parseCSV", "function");

H("0. KODINN ER DREGINN UT UR scripts/fetch.mjs");
ok(!!fnFd, "fetchFdcouk finnst");
ok(!!fnCSV, "parseCSV finnst");
/* SANNANLEG FORSENDA: skoðum ad vordurinn se raunverulega i thessum kodabalki
   — annars vaeri kaflinn hér a eftir ad maela sinn eigin stubb.           */
ok(/r\.Div === "E0"/.test(fnFd), "vordurinn (`r.Div === \"E0\"`) er i fetchFdcouk");

const HDR = "Div,Date,HomeTeam,AwayTeam,FTHG,FTAG,FTR,HST,AST";
const CSV = {
  /* Ekta lögun redirectsins: National League, dagsett fyrir PL-byrjun. */
  ec:    [HDR, "EC,08/08/2026,Altrincham,Southend,1,2,A,4,7",
               "EC,08/08/2026,Boreham Wood,Woking,0,0,D,3,3"].join("\n") + "\n",
  e0:    [HDR, "E0,21/08/2026,Arsenal,Chelsea,2,0,H,7,4",
               "E0,22/08/2026,Everton,Fulham,1,1,D,5,5"].join("\n") + "\n",
  mixed: [HDR, "E0,21/08/2026,Arsenal,Chelsea,2,0,H,7,4",
               "EC,08/08/2026,Altrincham,Southend,1,2,A,4,7"].join("\n") + "\n",
  noDiv: ["Date,HomeTeam,AwayTeam", "21/08/2026,Arsenal,Chelsea"].join("\n") + "\n",
};

async function run(kind, { throw404 = false } = {}) {
  const STUB = `
const RECORDS = [], WRITES = [];
const status = { updated: "2026-08-14T06:00:00Z" };
async function getText(url) {
  ${throw404 ? 'throw new Error("404 " + url);' : `return { text: ${JSON.stringify(CSV[kind] ?? "")} };`}
}
async function writeJSON(name, obj) { WRITES.push({ name, obj }); }
function record(k, ok, n, note) { RECORDS.push({ k, ok, n, note }); }
`;
  const mod = await import("data:text/javascript," + encodeURIComponent(
    STUB + fnCSV + "\n" + fnFd + "\nexport { fetchFdcouk, RECORDS, WRITES };"));
  await mod.fetchFdcouk();
  return { rec: mod.RECORDS.find(r => r.k === "fdcouk_e0"), writes: mod.WRITES };
}

H("1. REDIRECT A EC (National League) — TILVIKID SEM VAR LIFANDI");
{
  const { rec, writes } = await run("ec");
  ok(writes.length === 0, "EKKERT er skrifad", JSON.stringify(writes.map(w => w.name)));
  ok(rec?.ok === true, "heimildin er ekki RAUD (thetta er edlilegt forleiks-astand)");
  ok(rec?.n === 0, `talan er 0, ekki 12 (${rec?.n})`);
  ok(/EC/.test(rec?.note || ""), `notan nefnir deildina sem kom (${rec?.note})`);
  ok(/redirect/i.test(rec?.note || ""), "og skyrir AF HVERJU (redirect)", rec?.note);
}

H("2. RETT SKRA (E0) — MA EKKI STOPPAST AF VERDINUM");
{
  const { rec, writes } = await run("e0");
  ok(writes.length === 1 && writes[0].name === "fdcouk/E0-2627.json", "skrain er skrifud");
  ok(writes[0]?.obj?.rows?.length === 2, `badar E0-radir skrifadar (${writes[0]?.obj?.rows?.length})`);
  ok(rec?.ok === true && rec?.n === 2, `ok:true med 2 radir (${rec?.n})`);
  ok(!rec?.note, "engin advorunar-nota thegar allt er E0", String(rec?.note));
}

H("3. BLANDAD SVAR — ADEINS E0 ER SKRIFAD");
{
  const { rec, writes } = await run("mixed");
  ok(writes[0]?.obj?.rows?.length === 1, `adeins E0-rodin (${writes[0]?.obj?.rows?.length})`);
  ok(writes[0]?.obj?.rows?.[0]?.Div === "E0", "og hun er raunverulega E0");
  ok(/EC/.test(rec?.note || ""), `notan segir ad annad hafi fylgt med (${rec?.note})`);
}

H("4. JADARTILFELLI");
{
  const { rec, writes } = await run("noDiv");
  ok(writes.length === 0, "skra AN `Div`-dalks er ekki skrifud");
  ok(rec?.ok === true && rec?.n === 0, "og hun er skrad sem bid, ekki villa");
  ok(/no Div column/.test(rec?.note || ""), `notan segir hvad vantar (${rec?.note})`);
}
{
  const { rec, writes } = await run("e0", { throw404: true });
  ok(writes.length === 0, "404 skrifar ekkert");
  ok(rec?.ok === true && /waiting for the season/.test(rec?.note || ""),
     "404 er aframhaldandi 'bidur timabils' — gamla hegdunin helst", rec?.note);
}

H("5. GOGNIN I REPO-INU BERA ENGA ADRA DEILD");
{
  const { existsSync } = await import("node:fs");
  const D = new URL("../data/", import.meta.url).pathname;
  /* Skrain var FJARLAEGD 14.8.2026 thvi hun bar 12 EC-radir. Se hun til
     aftur (timabilid byrjad) verdur hun ad vera E0 og engu odru.        */
  if (existsSync(`${D}fdcouk/E0-2627.json`)) {
    const rows = JSON.parse(await readFile(`${D}fdcouk/E0-2627.json`, "utf8")).rows || [];
    const divs = [...new Set(rows.map(r => r.Div))];
    ok(rows.length > 0 && divs.length === 1 && divs[0] === "E0",
       `E0-2627.json ber adeins E0 (${divs.join("/")})`);
  } else {
    console.log("     E0-2627.json er ekki til — rett i forleik (PL-skrain er ekki til enn)");
    ok(true, "engin skra, engin rong deild");
  }
}

console.log(`\nFDCOUK E0: ${pass}/${pass + fail} graen`);
process.exit(fail ? 1 : 0);
