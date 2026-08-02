/* ============================================================
   STAÐFEST BYRJUNARLIÐ — `fetchLineups()` í scripts/fetch.mjs

   HVERS VEGNA ÞETTA PRÓF ER SVONA BYGGT: þessi kóði getur EKKI verið
   keyrður staðbundið. `API_SPORTS_KEY` er aðeins í GitHub Secrets — hvorki
   notandinn né ég náum í hann (`curl` án hans skilar
   {"errors":{"token":"Missing application key"}}, prófað 31.7.2026), og í
   forleik er hvort sem er enginn leikur innan gluggans. Fyrsta raunkeyrslan
   er á leikdegi.

   Ómældur kóði sem kviknar einn morgun er ekki ásættanlegt (sama regla sem
   `computePlayerForm` fékk). Þess vegna:
     * fallið er DREGIÐ ÚR scripts/fetch.mjs — raunverulegur texti, ekki
       eftirlíking sem getur rekið frá honum
     * `apiSports` er hermt með SVÖRUM Í SKJALFESTU v3-SNIÐI
     * umslagið ({get,errors,results,response}) er STAÐFEST gegn lifandi
       hostinum, svo það er ekki ágiskun
     * prófað er líka það sem GERIST ÞEGAR ÞAÐ BREGST: þrepið lokað,
       óvænt snið, engin pörun. Þá má EKKERT hrynja.
   ============================================================ */
import { readFile } from "node:fs/promises";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log(`\n${"=".repeat(84)}`);
console.log("STAÐFEST BYRJUNARLIÐ (/fixtures/lineups)");
console.log("=".repeat(84));

/* ---------- Draga fallid ut ur pipeline-inu ---------- */
const src = await readFile(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
const start = src.indexOf("async function fetchLineups(");
ok(start > 0, "fetchLineups finnst i scripts/fetch.mjs");
const end = src.indexOf("\n}\n", start);
const decl = src.slice(start, end + 3);
ok(/apiSports\(`\/fixtures\/lineups\?fixture=/.test(decl),
  "kallar a rettan endapunkt (/fixtures/lineups?fixture=)");
ok(/\/fixtures\?league=39&date=/.test(decl),
  "saekir API-fixture-id fyrst — FPL-id og API-id eru ekki somu numer");
/* VORDUR UM TENGINGU: fallid VERDUR ad vera kallad ur HRADA keyrslunni.
   Daglega keyrslan gengur kl. 05 UTC en leikir byrja 12-19 UTC, svo
   glugginn hefdi nanast aldrei opnast — dautt kodi sem virdist virka.
   Thetta var min villa i fyrstu utgafu og profid ver hana.            */
const fastFn = src.slice(src.indexOf("async function fetchFast("));
ok(/fetchLineups\(\)/.test(fastFn.slice(0, fastFn.indexOf("\n}\n"))),
  "fetchLineups er kallad ur fetchFast (30-min keyrslunni), ekki adeins daglegu");

/* ---------- Sandkassi: data/-skrar sem fallid les ---------- */
const KICK = new Date(Date.now() + 45 * 60e3).toISOString();   // 45 min i leik
async function sandbox({ kickoff = KICK } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "lu-"));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "fixtures.json"), JSON.stringify([
    { id: 9001, event: 1, team_h: 1, team_a: 2, kickoff_time: kickoff, finished: false },
    { id: 9002, event: 1, team_h: 3, team_a: 4,
      kickoff_time: new Date(Date.now() + 40 * 864e5).toISOString(), finished: false },
  ]));
  await writeFile(join(dir, "teams.json"), JSON.stringify({ teams: [
    { id: 1, name: "Arsenal", short: "ARS" }, { id: 2, name: "Chelsea", short: "CHE" },
    { id: 3, name: "Leeds", short: "LEE" },   { id: 4, name: "Everton", short: "EVE" },
  ] }));
  await writeFile(join(dir, "teams_map.json"), JSON.stringify({
    1: { fpl: "Arsenal", short: "ARS" }, 2: { fpl: "Chelsea", short: "CHE" },
    3: { fpl: "Leeds", short: "LEE" },   4: { fpl: "Everton", short: "EVE" },
  }));
  await writeFile(join(dir, "players.json"), JSON.stringify({ players: [
    { id: 11, team: 1, web_name: "Saka",     first_name: "Bukayo", second_name: "Saka" },
    { id: 12, team: 1, web_name: "Gabriel",  first_name: "Gabriel", second_name: "Magalhaes" },
    { id: 13, team: 1, web_name: "Ødegaard", first_name: "Martin", second_name: "Ødegaard" },
    { id: 21, team: 2, web_name: "Palmer",   first_name: "Cole",   second_name: "Palmer" },
  ] }));
  return dir;
}

/* SNIDID ER STADFEST GEGN LIFANDI API-INU, EKKI TEKID UR SKJOLUN.
   Rannsokn i GitHub Actions 31.7.2026 (thar er lykillinn) gaf:
     http=200  results=2  errors=[]        <- threpid LEYFIR endapunktinn
     lyklar = ["team","coach","formation","startXI","substitutes"]
     team="Burnley"  formation="5-4-1"  startXI=11  substitutes=9
     player0 = {"id":162489,"name":"J. Trafford","number":1,"pos":"G","grid":"1:1"}

   ATH NOFNIN — ThAU ERU SKAMMSTOFUD: "J. Trafford", ekki "James Trafford".
   Fyrsta utgafa thessa profs notadi FULL nofn ("Bukayo Saka") og stadfesti
   thar med snið sem API-id sendir ALDREI. Porunin virkadi samt, en af
   TILVILJUN: hun endurnytir "F. Eftirnafn"-lykilinn ur fetchInjuries. Nu er
   profad a RAUNVERULEGA snidinu svo thad se maeling og ekki heppni.       */
const LINEUP_OK = {
  http: 200, results: 2, errors: [], response: [
    { team: { id: 42, name: "Arsenal" }, coach: { id: 9, name: "M. Arteta" },
      formation: "4-3-3",
      startXI: [{ player: { id: 1, name: "B. Saka", number: 7, pos: "F", grid: "4:1" } },
                { player: { id: 2, name: "Gabriel", number: 6, pos: "D", grid: "2:2" } }],
      substitutes: [{ player: { id: 3, name: "M. Ødegaard", number: 8, pos: "M", grid: null } }] },
    { team: { id: 49, name: "Chelsea" }, coach: { id: 10, name: "E. Maresca" },
      formation: "3-4-3",
      startXI: [{ player: { id: 4, name: "C. Palmer", number: 10, pos: "M", grid: "3:2" } }],
      substitutes: [] },
  ],
};
const FIXTURES_OK = {
  http: 200, results: 1, errors: [], response: [
    { fixture: { id: 555001 }, teams: { home: { name: "Arsenal" }, away: { name: "Chelsea" } } },
  ],
};

async function run({ dir, responder }) {
  let written = null; const rec = {};
  const factory = new Function("readFile", "DATA", "writeJSON", "record", "status",
    "apiSports", "console", `${decl}\nreturn fetchLineups;`);
  const calls = [];
  const fn = factory(readFile, dir,
    async (name, obj) => { written = { name, obj }; },
    (n, o, c, note) => { rec.ok = o; rec.n = c; rec.note = note || ""; },
    /* RAUNVERULEGUR TIMASTIMPILL, ekki "prof": probe.at er stimplad ur
       status.updated og geymslu-athugunin reiknar ALDUR ur honum. Med
       ologilegri dagsetningu vard aldurinn Infinity og kallid var alltaf
       endurtekid — profid hefdi thvi sagt "geymsla virkar ekki" thott
       kodinn vaeri rettur.                                               */
    { updated: new Date().toISOString() },
    async (path) => { calls.push(path); return responder(path); },
    { log() {}, warn() {} });
  await fn();
  return { written, rec, calls };
}

/* ---------- 1. Leikdagur: allt gengur upp ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("1. LEIKDAGUR — leikur i glugganum");
console.log("─".repeat(84));
{
  const dir = await sandbox();
  const { written, rec, calls } = await run({ dir, responder: p =>
    p.startsWith("/fixtures?") ? FIXTURES_OK : LINEUP_OK });
  const o = written?.obj || {};
  ok(written?.name === "lineups.json", `skrifar lineups.json (${written?.name})`);
  ok(calls.length === 2, `TVO koll: dagsetning + lineups (${calls.length}: ${calls.join(", ")})`);
  ok(o.players?.length === 4, `fjorir leikmenn paradir (${o.players?.length})`);
  const saka = o.players?.find(x => x.fpl_id === 11);
  ok(saka?.started === true, "Saka (startXI) -> started=true");
  const ode = o.players?.find(x => x.fpl_id === 13);
  ok(ode?.started === false, "Ødegaard (substitutes) -> started=false, EKKI sleppt");
  ok(ode?.fpl_id === 13,
    "pörun tholir SKAMMSTAFAD nafn MED accent (\"M. Ødegaard\" -> fpl 13)");
  ok(saka?.name_api === "B. Saka",
    "skammstafad nafn ur API-inu er varðveitt i name_api (rekjanleiki)");
  const gab = o.players?.find(x => x.fpl_id === 12);
  ok(gab?.fpl_id === 12, "EITT nafn an upphafsstafs (\"Gabriel\") parast lika");
  ok(o.players?.every(x => x.gw === 1 && x.fixture === 9001),
    "umferd og leikur fylgja hverjum leikmanni");
  ok(o.teams?.length === 2 && o.teams.some(t => t.formation === "4-3-3"),
    "uppstilling badra lida skrad");
  ok(!o.players?.some(x => x.fpl_team === 3 || x.fpl_team === 4),
    "leikurinn 40 dogum sidar er EKKI sottur (utan glugga)");
  ok(rec.ok === true && /2 koll/.test(rec.note), `status skrad: "${rec.note}"`);
}

/* ---------- 2. Forleikur: engin koll, en RANNSAKANDI KALL ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("2. FORLEIKUR — enginn leikur i glugga");
console.log("─".repeat(84));
{
  const dir = await sandbox({ kickoff: new Date(Date.now() + 20 * 864e5).toISOString() });
  const PROBE_FREE = { http: 200, results: 0, errors: [], response: [] };
  const { written, rec, calls } = await run({ dir, responder: () => PROBE_FREE });
  ok(calls.length === 1 && calls[0].includes("/fixtures/lineups?fixture="),
    `EITT rannsakandi kall, ekkert annad (${calls.join(", ") || "engin"})`);
  ok(written?.obj?.players?.length === 0, "tomur leikmannalisti, ekkert hrun");
  ok(written?.obj?.probe && written.obj.probe.gated === false,
    "probe skrad og gated=false thegar engin plan-villa kemur");
  ok(/bidur leikdags|an plan-villu/.test(rec.note), `status segir stoduna: "${rec.note}"`);
}

/* ---------- 2b. RANNSOKNIN MA EKKI BRENNA KVOTANN ----------
   VILLA MAELD 2.8.2026: kallid var gert i HVERRI hradri keyrslu. Cron gengur
   a 30 min fresti = 48 keyrslur/dag = 48 koll af 100 i fria threpinu, i
   greiningu sem var thegar svarad 31.7. Sama dag skiladi endapunkturinn
   {"access":"Your account is suspended"}. Eg get ekki fullyrt ad kollin hafi
   valdid thvi, en helmingur dagskvotans i vordur er villa oháð thvi.       */
console.log(`\n${"─".repeat(84)}`);
console.log("2b. GEYMT SVAR — engin ny koll i hverri keyrslu");
console.log("─".repeat(84));
{
  const dir = await sandbox({ kickoff: new Date(Date.now() + 20 * 864e5).toISOString() });
  const FRESH = { http:200, results:0, errors:[], response:[] };
  /* fyrsta keyrsla: EITT kall og svarid stimplad */
  const r1 = await run({ dir, responder: () => FRESH });
  ok(r1.calls.length === 1, `fyrsta keyrsla gerir eitt kall (${r1.calls.length})`);
  ok(r1.written?.obj?.probe?.at, "svarid er TIMASTIMPLAD (an thess er ekki haegt ad geyma thad)");
  /* skrifa svarid a disk og keyra aftur — nu a EKKERT kall ad vera gert */
  await writeFile(join(dir, "lineups.json"), JSON.stringify(r1.written.obj));
  const r2 = await run({ dir, responder: () => { throw new Error("ATTI EKKI AD KALLA"); } });
  ok(r2.calls.length === 0, `onnur keyrsla gerir ENGIN koll (${r2.calls.length})`);
  ok(r2.written?.obj?.probe?.at === r1.written.obj.probe.at, "geymda svarid er bori\u00f0 afram obreytt");
  ok(/geymt svar/.test(r2.rec.note), `status segir ad svarid se geymt: "${r2.rec.note.slice(0, 60)}"`);
  /* gamalt svar (>7 dagar) -> spurt aftur */
  const old = { ...r1.written.obj,
    probe: { ...r1.written.obj.probe, at: new Date(Date.now() - 9 * 864e5).toISOString() } };
  await writeFile(join(dir, "lineups.json"), JSON.stringify(old));
  const r3 = await run({ dir, responder: () => FRESH });
  ok(r3.calls.length === 1, `9 daga gamalt svar -> spurt aftur (${r3.calls.length} kall)`);
  /* LOKAD threp i geymdu svari a ad SJAST i stodunni an nys kalls */
  const gatedPrev = { ...r1.written.obj,
    probe: { at:new Date().toISOString(), http:200, errors:{ plan:"no access" }, gated:true } };
  await writeFile(join(dir, "lineups.json"), JSON.stringify(gatedPrev));
  const r4 = await run({ dir, responder: () => { throw new Error("ATTI EKKI AD KALLA"); } });
  ok(r4.calls.length === 0 && /LOKADUR/.test(r4.rec.note),
    `lokad threp sest i stodunni UT UR geymdu svari: "${r4.rec.note.slice(0, 60)}"`);
}

/* ---------- 3. ThREPID LOKAR ENDAPUNKTINUM ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("3. ÞREPIÐ LOKAÐ — svarid sem vid vitum ekki fyrr en Actions keyrir");
console.log("─".repeat(84));
{
  const dir = await sandbox({ kickoff: new Date(Date.now() + 20 * 864e5).toISOString() });
  const GATED = { http: 200, results: 0, response: [],
    errors: { plan: "Your plan does not have access to this endpoint." } };
  const { written, rec } = await run({ dir, responder: () => GATED });
  ok(written?.obj?.probe?.gated === true, "gated=true greint ur `plan`-villunni");
  ok(/LOKADUR/.test(rec.note), `status segir ÞAÐ SKYRT: "${rec.note.slice(0, 70)}"`);
  ok(rec.ok === true, "keyrslan er samt ekki MERKT SEM BILUN — thetta er threp, ekki villa");
}

/* ---------- 4. Thegar heimildin brestur a leikdegi ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("4. BREGST Á LEIKDEGI — má ekki hrynja");
console.log("─".repeat(84));
{
  const dir = await sandbox();
  const r1 = await run({ dir, responder: p => p.startsWith("/fixtures?")
    ? FIXTURES_OK : { http: 499, results: 0, response: [], errors: { rateLimit: "Too many requests" } } });
  ok(r1.written?.obj?.players?.length === 0 && Array.isArray(r1.written?.obj?.errors),
    "lineups-villa -> 0 leikmenn og villan SKRÁÐ, ekki thoguð");
  ok(/villur/.test(r1.rec.note), `status ber villuna: "${r1.rec.note.slice(0, 60)}"`);

  const r2 = await run({ dir, responder: p => p.startsWith("/fixtures?")
    ? { http: 200, results: 0, errors: [], response: [] } : LINEUP_OK });
  ok(r2.written?.obj?.players?.length === 0 && r2.calls.length === 1,
    "finnst enginn API-leikur -> EKKERT lineups-kall gert (kvoti sparadur)");

  const r3 = await run({ dir, responder: p => p.startsWith("/fixtures?")
    ? FIXTURES_OK : { http: 200, results: 1, errors: [], response: [{ team: { name: "Arsenal" } }] } });
  ok(r3.written?.obj?.players?.length === 0,
    "svar an startXI/substitutes -> 0 leikmenn, ekkert hrun (oveent snid)");

  const r4 = await run({ dir, responder: p => p.startsWith("/fixtures?")
    ? FIXTURES_OK : { http: 200, results: 1, errors: [], response: [
      { team: { name: "Arsenal" }, formation: "4-4-2",
        startXI: [{ player: { name: "Enginn Slikur Madur" } }], substitutes: [] }] } });
  ok(r4.written?.obj?.unmatched?.length === 1,
    "oparadur leikmadur er TALINN, ekki fleygt thegjandi");
  ok(r4.written?.obj?.players?.length === 0, "og hann er EKKI skrifadur med nullu id");
}

/* ---------- 5. Ordalag ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("5. ORÐALAG — staðfesting, ekki spá");
console.log("─".repeat(84));
{
  const dir = await sandbox();
  const { written } = await run({ dir, responder: p =>
    p.startsWith("/fixtures?") ? FIXTURES_OK : LINEUP_OK });
  ok(/STADFEST|Stadfest/.test(written?.obj?.note || ""),
    "notan kallar thetta STADFESTINGU");
  ok(/FPL-status raedur/.test(written?.obj?.note || ""),
    "notan segir ad FPL-status radi aframhaldandi tiltækileika");
}

console.log(`\nBYRJUNARLIÐ: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
