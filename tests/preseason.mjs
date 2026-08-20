/* ============================================================
   AEFINGALEIKJA-BYRJANIR — `fetchPreseason` OG DALKARNIR FJORIR

   HVERS VEGNA ThETTA SAFN ER TIL: kodinn hleypur i forleik, sem er ~7 vikur
   a ari, og HVERT einasta atrídi i honum er tegund villu sem repo-id hefur
   thegar borgad fyrir einu sinni:
     · nafna-porun a klubbum (BSD: Man United fell inn i Man City)
     · tvo nafna-rymi i sama flaedi (matches? = "Man City", lineup =
       "Manchester City" -> 22 af 80 klubb-timabilum thoguðu)
     · thekja sem er LOGGA i stad fullyrdingar (CLAUDE.md 5b regla 1)
     · tom/hluta keyrsla sem skrifar ofan a heila skra (kafli 8e)
   ThESS VEGNA ER `fetchPreseason` DREGID UT UR `scripts/fetch.mjs` (raun-
   texti, ekki eftirliking) og keyrt a TILBUNUM FotMob-svorum thar sem
   svarid er thekkt fyrirfram. Sama mynstur og `mins-trend.mjs` kafli 0,
   `defcon-shrink.mjs` og `bsd-pipeline.mjs`.

   ENGIN SKRA I `data/` ER SKRIFUD. Tilbunu heimarnir eru i tmp-dir.

   Keyrsla:  node tests/preseason.mjs
   ============================================================ */
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { STAT_DEFS, STAT_BY_KEY, SCOPE_NOTES, FIELDS_READ, num } from "../src/stats.js";
import { nameScore } from "../src/stats.js";

let pass = 0, fail = 0;
const ok = (c, n, extra = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                    : (fail++, console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`)); };
const eq = (a, b, n) => ok(a === b, `${n} (${JSON.stringify(a)})`, `vaenti ${JSON.stringify(b)}`);

console.log(`\n${"=".repeat(84)}`);
console.log("AEFINGALEIKJA-BYRJANIR — pipeline a tilbunum gognum, og dalkarnir");
console.log("=".repeat(84));

/* ---------- `fetchPreseason` DREGID UT UR UPPRUNANUM ---------- */
const ROOT = new URL("../", import.meta.url).pathname;
const src = readFileSync(ROOT + "scripts/fetch.mjs", "utf8");
const cut = (from, to) => {
  const a = src.indexOf(from);
  if (a < 0) return null;
  const b = src.indexOf(to, a);
  return b < 0 ? null : src.slice(a, b + to.length);
};
const decls = [
  cut('const FM = "https://www.fotmob.com/api/data";', ';'),
  cut('const FM_UA =', 'Safari/537.36";'),
  cut('const PRE_MAX_CALLS =', ';'),
  cut('const PRE_BUDGET_MS =', ';'),
  cut('const FM_LONG_TO_FPL = {', '\n};'),
  cut('function fmMinutes(', '\n}'),
  cut('async function fetchPreseason(', '\n}\n'),
];
ok(decls.every(Boolean), "allir sjo bitar `fetchPreseason` finnast i scripts/fetch.mjs");
/* `const` -> `let` A ThREMUR THOKUM, OG ADEINS THEIM: kaflar E5 setja
   kalla-thakid nidur til ad profa hluta-sokn. Textinn ad odru leyti er
   ohreyfdur — thad er thess vegna sem hann er DREGINN UT og ekki afritadur. */
const body = decls.join("\n").replace(/const (PRE_MAX_CALLS|PRE_BUDGET_MS) =/g, "let $1 =");
ok(/fplByFm\.set\(t\.id, id\)/.test(body), "klubbar eru festir a FotMob-id (`fplByFm.set(t.id, ...)`)");
ok(/side === "homeTeam" \? f\.homeFpl : f\.awayFpl/.test(body),
  "heima/uti er PORAD EFTIR STODU, ekki eftir nafni (skammstofun a moti longu nafni)");

/* Smidar keyrsluumhverfi: tmp-DATA-mappa + tilbuinn `fetch`. */
async function run({ leagues, byDate, details, fixtures, teams, els, existing = null,
                     now = Date.parse("2026-08-20T12:00:00Z"), maxCalls = null }) {
  const dir = await mkdtemp(join(tmpdir(), "pre-"));
  await writeFile(join(dir, "fixtures.json"), JSON.stringify(fixtures));
  if (existing) await writeFile(join(dir, "preseason.json"), JSON.stringify(existing));
  let written = null;
  const rec = { ok: null, n: null, note: null };
  const calls = [];
  /* TILBUINN `fetch` — skilar Response-liku hlut. Hann er GEFINN SEM
     BREYTA med nafninu `fetch`, svo textinn ur `fetch.mjs` se ohreyfdur. */
  const fakeFetch = async (url) => {
    calls.push(url);
    let j = null;
    if (/\/leagues\?/.test(url)) j = leagues;
    else if (/\/matches\?date=(\d+)/.test(url)) j = byDate[/date=(\d+)/.exec(url)[1]] ?? { leagues: [] };
    else if (/matchId=(\d+)/.test(url)) j = details[/matchId=(\d+)/.exec(url)[1]] ?? null;
    if (j === null) return { ok: false, status: 404, json: async () => ({}) };
    if (j.__throw) throw new Error("network");
    return { ok: true, status: 200, json: async () => j };
  };
  const RealDate = Date;
  const FakeDate = new Proxy(RealDate, {
    apply: () => new RealDate(now).toString(),
    construct: (T, a) => (a.length ? new T(...a) : new T(now)),
    get: (T, k) => (k === "now" ? () => now : Reflect.get(T, k)),
  });
  const factory = new Function(
    "readFile", "writeFile", "mkdir", "DATA", "writeJSON", "record", "status",
    "nameScore", "fetch", "Date", "process", "__maxCalls",
    `${body}\nif (__maxCalls != null) PRE_MAX_CALLS = __maxCalls;\nreturn fetchPreseason;`);
  const fn = factory(readFile, writeFile, mkdir, dir,
    async (name, obj) => { written = { name, obj }; },
    (k, o, c, note) => { rec.ok = o; rec.n = c; rec.note = note ?? null; },
    { updated: "prof" }, nameScore, fakeFetch, FakeDate, { env: {} }, maxCalls);
  let threw = null, map = null;
  try { map = await fn({ els, teams }); } catch (e) { threw = e; }
  return { written, rec, calls, map, threw, dir };
}

/* ---------- TILBUINN HEIMUR ----------
   Thrir klubbar (FPL 1/2/3), morkin 21.8.2026 19:00 UTC ur fixtures.json. */
const TEAMS = [{ id: 1, name: "Arsenal" }, { id: 2, name: "Man City" },
               { id: 3, name: "Nott'm Forest" }];
const FIXTURES = [
  { id: 1, event: 1, kickoff_time: "2026-08-21T19:00:00Z", team_h: 1, team_a: 2 },
  { id: 2, event: 1, kickoff_time: "2026-08-22T14:00:00Z", team_h: 3, team_a: 1 },
];
/* FotMob-id: Arsenal (London) 9825 · Man City 8456 · Forest 10203.
   OG ThRIDJI: 6217 = FC Arsenal Tula, russneskt 2. deildarlid sem HEITIR
   LIKA "Arsenal" i `matches?date=` (maelt: 6 af 13 leikjum sumarid 2026). */
const FM_ARS = 9825, FM_MCI = 8456, FM_NFO = 10203, FM_TULA = 6217;
const LEAGUES = { table: [{ data: { table: { all: [
  { id: FM_ARS, name: "Arsenal" }, { id: FM_MCI, name: "Manchester City" },
  { id: FM_NFO, name: "Nottingham Forest" },
] } } }] };
const ELS = [
  { id: 11, code: 111, team: 1, web_name: "Saka", first_name: "Bukayo", second_name: "Saka" },
  { id: 12, code: 112, team: 1, web_name: "Havertz", first_name: "Kai", second_name: "Havertz" },
  /* Man City: LANGA nafnid i lineup er "Manchester City" en `matches?date=`
     segir "Man City" — atridid sem thagdi i fyrstu utgafu maelingarinnar. */
  { id: 21, code: 221, team: 2, web_name: "Haaland", first_name: "Erling", second_name: "Haaland" },
  { id: 31, code: 331, team: 3, web_name: "Gibbs-White", first_name: "Morgan", second_name: "Gibbs-White" },
];
const pl = (id, name, subOut = null, subIn = null) => ({
  id, name, performance: { substitutionEvents: [
    ...(subOut != null ? [{ type: "subOut", time: subOut }] : []),
    ...(subIn != null ? [{ type: "subIn", time: subIn }] : []),
  ] },
});
const lineup = (home, away) => ({ content: { lineup: {
  homeTeam: { starters: home[0], subs: home[1] || [] },
  awayTeam: { starters: away[0], subs: away[1] || [] } } } });
const dateRow = (matches) => ({ leagues: [{ id: 999, primaryId: 999,
  name: "Club Friendlies", matches }] });
const m = (id, hId, aId, utc, finished = true) => ({ id, home: { id: hId }, away: { id: aId },
  status: { utcTime: utc, finished } });

/* ============================================================
   A. GRUNNTILFELLID — tolurnar eru thaer sem vid setjum inn
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("A. GRUNNTILFELLID — byrjanir, minutur og 'byrjadi sidasta'");
console.log("─".repeat(84));
{
  const byDate = {
    20260715: dateRow([m(501, FM_ARS, FM_MCI, "2026-07-15T18:00:00Z")]),
    20260802: dateRow([m(502, FM_NFO, FM_ARS, "2026-08-02T18:00:00Z")]),
  };
  const details = {
    /* Leikur 1: Saka byrjar og er tekinn af eftir 60; Havertz kemur inn a 60. */
    501: lineup([[pl(9001, "Bukayo Saka", 60)], [pl(9002, "Kai Havertz", null, 60)]],
               [[pl(9101, "Erling Haaland")], []]),
    /* Leikur 2 (SIDASTI): Havertz byrjar, Saka a bekknum og kemur ekki inn. */
    502: lineup([[pl(9201, "Morgan Gibbs-White")], []],
               [[pl(9002, "Kai Havertz")], [pl(9001, "Bukayo Saka")]]),
  };
  const r = await run({ leagues: LEAGUES, byDate, details, fixtures: FIXTURES,
                        teams: TEAMS, els: ELS });
  ok(!r.threw, `keyrslan gengur upp${r.threw ? " — " + r.threw.message : ""}`);
  const P = r.written?.obj?.players || {};
  eq(P[111]?.games, 2, "Saka: 2 leikir (byrjun + bekkur)");
  eq(P[111]?.starts, 1, "Saka: 1 byrjun");
  eq(P[111]?.minutes, 60, "Saka: 60 minutur (subOut a 60, bekkur an subIn = 0)");
  eq(P[111]?.last_start, 0, "Saka: BYRJADI EKKI sidasta leikinn");
  eq(P[112]?.starts, 1, "Havertz: 1 byrjun");
  eq(P[112]?.minutes, 120, "Havertz: 30 (subIn 60) + 90 = 120 minutur");
  eq(P[112]?.last_start, 1, "Havertz: BYRJADI sidasta leikinn");
  eq(P[221]?.minutes, 90, "Haaland: 90 (byrjun an subOut)");
  eq(r.written?.obj?.clubs_covered, 3, "thekja: allir thrir klubbar");
  eq(r.written?.obj?.lineup_sides, 4, "fjogur lineup-hlid (2 leikir x 2)");
  eq(r.rec.ok, true, "heimildin er GRAEN");
}

/* ============================================================
   B. ARSENAL TULA — NAFNID ER SAMA, KLUBBURINN ER ANNAR

   MAELT 20.8.2026: af 13 leikjum undir nafninu "Arsenal" i FotMob eru SEX
   i russnesku "First League". Nafna-porun hefdi talid tha sem forleik
   Arsenal og enginn vordur hefdi kvartad — sami aettbogi og fuzzy-porunin
   sem fell Man United inn i Man City (`BSD_TEAM`, CLAUDE.md 6).
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("B. FC ARSENAL TULA — sama nafn, annad id, MA EKKI TELJAST");
console.log("─".repeat(84));
{
  const byDate = {
    20260715: dateRow([m(501, FM_ARS, FM_MCI, "2026-07-15T18:00:00Z")]),
    /* Russneski "Arsenal" spilar sama sumar. Nafnid i `matches?date=` er
       ThAD SAMA; adeins id-id skilur a milli.                            */
    20260716: { leagues: [{ id: 555, primaryId: 555, name: "First League",
      matches: [m(777, FM_TULA, 4242, "2026-07-16T15:00:00Z")] }] },
  };
  const details = {
    501: lineup([[pl(9001, "Bukayo Saka")], []], [[pl(9101, "Erling Haaland")], []]),
    /* Ef Tula slyppi inn myndi ThESSI lineup skrifast a Arsenal. */
    777: lineup([[pl(9001, "Bukayo Saka")], []], [[pl(8888, "Ivan Ivanov")], []]),
  };
  const r = await run({ leagues: LEAGUES, byDate, details, fixtures: FIXTURES,
                        teams: TEAMS, els: ELS });
  /* FORSENDA (CLAUDE.md 5b regla 2): russneski leikurinn ER i gagnasettinu,
     annars profar naesta fullyrding ekkert.                              */
  ok(JSON.stringify(byDate[20260716]).includes(String(FM_TULA)),
    "forsenda: russneski 'Arsenal'-leikurinn er i gognunum");
  eq(r.calls.filter(u => /matchId=777/.test(u)).length, 0,
    "leikur Tula er ALDREI sottur — hann kemst ekki i leikjalistann");
  eq(r.written?.obj?.players?.[111]?.games, 1,
    "Saka telur EINN leik, ekki tvo — russneska lineup-id barst ekki a hann");
  eq(r.written?.obj?.finished, 1, "og adeins EINN leikur er skradur");
}

/* ============================================================
   C. SKAMMSTOFUN A MOTI LONGU NAFNI — KLUBBUR MA EKKI FALLA ThEGJANDI

   `matches?date=` ber "Man City" en `matchDetails.lineup` ber
   "Manchester City". Fyrsta utgafa maelingarinnar fletti langa nafninu upp
   i skammstofudu toflunni, fekk `undefined` og `continue` — ThOGULT: 22 af
   80 klubb-timabilum fengu NULL lineups og "sest i aefingaleik" maeldist
   26% i stad 54%. Her er lineup-hnuturinn MERKTUR longu nafni og hlidin
   samt porud rett, thvi porunin er a STODU.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("C. STODU-PORUN — langa nafnid i lineup fellir ekki klubbinn");
console.log("─".repeat(84));
{
  const byDate = { 20260715: dateRow([m(501, FM_ARS, FM_MCI, "2026-07-15T18:00:00Z")]) };
  /* Lineup-hnuturinn ber LONG nofn — og aukalega `teamName`-svid sem
     nafna-porun hefdi lesid. Vid lesum thad ALDREI.                     */
  const det = lineup([[pl(9001, "Bukayo Saka")], []], [[pl(9101, "Erling Haaland")], []]);
  det.content.lineup.homeTeam.teamName = "Arsenal FC";
  det.content.lineup.awayTeam.teamName = "Manchester City";
  const r = await run({ leagues: LEAGUES, byDate, details: { 501: det },
                        fixtures: FIXTURES, teams: TEAMS, els: ELS });
  const clubs = r.written?.obj?.clubs || {};
  eq(clubs[2], 1, "Man City (FPL id 2) fær sitt lineup thott hnuturinn heiti 'Manchester City'");
  eq(clubs[1], 1, "og Arsenal sitt thott hann heiti 'Arsenal FC'");
  eq(r.written?.obj?.players?.[221]?.starts, 1, "Haaland er skradur med byrjun");
  ok(!/teamName/.test(body),
    "og `fetchPreseason` LES ALDREI `teamName` — nafn kemur hvergi inn i porunina");
}

/* ============================================================
   D. MORKIN — LEIKUR EFTIR FYRSTA PL-LEIK ER EKKI FORLEIKUR
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("D. MORKIN ERU LEIDD UR fixtures.json, ekki hardkodud");
console.log("─".repeat(84));
{
  const byDate = {
    20260715: dateRow([m(501, FM_ARS, FM_MCI, "2026-07-15T18:00:00Z")]),
    /* Leikur EFTIR fyrsta PL-leik (21.8. 19:00) en INNAN dagsetningar-
       sveiflunnar — thad er tilfellid sem timastimpils-hlidið tekur.    */
    20260822: dateRow([m(503, FM_ARS, FM_NFO, "2026-08-22T14:00:00Z")]),
    /* Og einn LANGT eftir mörkunum: hann ma aldrei vera SOTTUR, thvi
       sveiflan sjalf endar vid morkin. Tvo ólik hlið, badi profud.      */
    20260825: dateRow([m(504, FM_ARS, FM_MCI, "2026-08-25T18:00:00Z")]),
  };
  const details = {
    501: lineup([[pl(9001, "Bukayo Saka")], []], [[pl(9101, "Erling Haaland")], []]),
    503: lineup([[pl(9001, "Bukayo Saka")], []], [[pl(9201, "Morgan Gibbs-White")], []]),
    504: lineup([[pl(9001, "Bukayo Saka")], []], [[pl(9101, "Erling Haaland")], []]),
  };
  const r = await run({ leagues: LEAGUES, byDate, details, fixtures: FIXTURES,
                        teams: TEAMS, els: ELS });
  eq(r.written?.obj?.cutoff, "2026-08-21T19:00:00.000Z",
    "morkin eru FYRSTI PL-leikur ur fixtures.json");
  eq(r.written?.obj?.dropped_after_cutoff, 1,
    "leikurinn 22.8. (eftir morkin, innan sveiflunnar) er TALINN og slepptur");
  eq(r.calls.filter(u => /matchId=503/.test(u)).length, 0, "og hann er aldrei sottur");
  eq(r.calls.filter(u => /date=20260825/.test(u)).length, 0,
    "og dagsetningin 25.8. er ALDREI beðin um — sveiflan endar vid morkin");
  eq(r.calls.filter(u => /date=20260822/.test(u)).length, 1,
    "FORSENDA: 22.8. ER beðin um, svo timastimpils-hlidið se raunverulega profad");
  eq(r.written?.obj?.players?.[111]?.games, 1, "Saka telur EINN leik, ekki tvo");
  /* Og engin dagsetning i kodanum: morkin koma ur gognum.               */
  ok(!/20\d\d-0[678]-\d\d/.test(body),
    "engin hardkodud sumar-dagsetning i `fetchPreseason`");
}

/* ============================================================
   E. TOM/HLUTA/AFTURFOR KEYRSLA MA EKKI SKRIFA OFAN A HEILA SKRA
      (CLAUDE.md 8e — fordaemid er `fetch-bsd-teams.mjs` og `computeDefcon`)
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("E. AFTURFOR ER EKKI FRETT — gamla skrain stendur");
console.log("─".repeat(84));
{
  const good = { season: "2026/27", updated: "i gaer", clubs_covered: 3, finished: 2,
                 players: { 111: { starts: 4, games: 5, minutes: 305, last_start: 1 } } };
  /* E1. ALLIR matchDetails 404 -> 0 thoktir klubbar ofan a 3. */
  const byDate = { 20260715: dateRow([m(501, FM_ARS, FM_MCI, "2026-07-15T18:00:00Z")]) };
  const r1 = await run({ leagues: LEAGUES, byDate, details: {}, fixtures: FIXTURES,
                         teams: TEAMS, els: ELS, existing: good });
  eq(r1.written, null, "E1: skrain er EKKI skrifud thegar oll lineups vantar");
  eq(r1.rec.ok, false, "E1: og heimildin er RAUD");
  eq(r1.map?.[111]?.starts, 4, "E1: OG GOMLU TOLURNAR ERU SKILADAR — dalkarnir tæmast ekki");
  ok(/REGRESSION/.test(String(r1.rec.note)), "E1: notan segir hvad var borid saman", r1.rec.note);

  /* E2. FAERRI loknir leikir en a diski (dagsetningar-kall brast). */
  const r2 = await run({ leagues: LEAGUES, byDate,
    details: { 501: lineup([[pl(9001, "Bukayo Saka")], []], [[pl(9101, "Erling Haaland")], []]) },
    fixtures: FIXTURES, teams: TEAMS, els: ELS, existing: good });
  eq(r2.written, null, "E2: einn leikur ofan a tvo -> skrain stendur");
  eq(r2.map?.[111]?.minutes, 305, "E2: og gomlu minuturnar skilast");

  /* E3. FORSENDA: sami heimur MED tveimur leikjum skrifast (annars er E1/E2
        graent af thvi ad ekkert skrifast nokkurn tima). */
  const byDate2 = { ...byDate,
    20260802: dateRow([m(502, FM_NFO, FM_ARS, "2026-08-02T18:00:00Z")]) };
  const r3 = await run({ leagues: LEAGUES, byDate: byDate2, details: {
      501: lineup([[pl(9001, "Bukayo Saka")], []], [[pl(9101, "Erling Haaland")], []]),
      502: lineup([[pl(9201, "Morgan Gibbs-White")], []], [[pl(9002, "Kai Havertz")], []]),
    }, fixtures: FIXTURES, teams: TEAMS, els: ELS, existing: good });
  ok(r3.written != null, "E3: FORSENDA — jafn god keyrsla SKRIFAST (3 klubbar, 2 leikir)");
  eq(r3.rec.ok, true, "E3: og hun er graen");

  /* E4. FYRSTA KEYRSLA ma skrifa thunnt — thad er upphafsstadan, ekki tap. */
  const r4 = await run({ leagues: LEAGUES, byDate, details: {}, fixtures: FIXTURES,
                         teams: TEAMS, els: ELS, existing: null });
  ok(r4.written != null, "E4: fyrsta keyrsla an skrar MA skrifa (0 thoktir klubbar)");
  eq(r4.rec.ok, false, "E4: en hun er RAUD — 0 klubbar er ekki 'bidur timabils'");
  ok(/NO club has a published lineup/.test(String(r4.rec.note)),
    "E4: og notan segir thad berum orðum", r4.rec.note);

  /* E5. SPRUNGID KALLA-ThAK -> hluta-sokn ma ekki skrifast. */
  const r5 = await run({ leagues: LEAGUES, byDate: byDate2, details: {
      501: lineup([[pl(9001, "Bukayo Saka")], []], [[pl(9101, "Erling Haaland")], []]),
      502: lineup([[pl(9201, "Morgan Gibbs-White")], []], [[pl(9002, "Kai Havertz")], []]),
    }, fixtures: FIXTURES, teams: TEAMS, els: ELS, existing: good, maxCalls: 3 });
  eq(r5.written, null, "E5: thakid sprengt -> skrain stendur");
  ok(/budget exhausted/.test(String(r5.rec.note)), "E5: og notan nefnir thakid", r5.rec.note);
}

/* ============================================================
   F. ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b regla 1)
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("F. ThEKJA — klubbur sem hverfur VERDUR ad fella");
console.log("─".repeat(84));
{
  /* Tveir klubbar spila, thridji ekki. Talan verdur ad vera 2 af 3 — og
     hun er TALIN, svo hun getur fallid. `clubs` ber SERHVERN klubb med
     tolu, thar med 0, svo "hvarf" og "spiladi ekki" seu greinanleg.    */
  const byDate = { 20260715: dateRow([m(501, FM_ARS, FM_MCI, "2026-07-15T18:00:00Z")]) };
  const r = await run({ leagues: LEAGUES, byDate,
    details: { 501: lineup([[pl(9001, "Bukayo Saka")], []], [[pl(9101, "Erling Haaland")], []]) },
    fixtures: FIXTURES, teams: TEAMS, els: ELS });
  const clubs = r.written?.obj?.clubs || {};
  eq(Object.keys(clubs).length, 3, "HVER klubbur ber tolu, lika sa sem spiladi ekki");
  eq(clubs[3], 0, "Forest ber 0 (ekki vantandi lykil) — 'sast ekki' er SYNILEGT");
  eq(r.written?.obj?.clubs_covered, 2, "thekjan er 2 af 3 og hun er TALIN");
  ok(/clubs covered/.test(String(r.rec.note)), "og hun stendur i `status.json`-notunni", r.rec.note);
  /* Og hun er RAUD ef enginn klubbur nær tholu — ekki thogul. */
  const r0 = await run({ leagues: LEAGUES, byDate, details: {}, fixtures: FIXTURES,
                         teams: TEAMS, els: ELS });
  eq(r0.rec.ok, false, "0 thoktir klubbar -> RAUD heimild, ekki graen med tomri skra");
}

/* ============================================================
   G. FRYSTING EFTIR FYRSTA PL-LEIK — ENGIN KOLL I NIU MANUDI
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("G. FROSIN eftir fyrsta PL-leik — aefingaleikir breytast ekki");
console.log("─".repeat(84));
{
  const good = { season: "2026/27", updated: "i sumar", clubs_covered: 3, finished: 2,
                 players: { 111: { starts: 4, games: 5, minutes: 305, last_start: 1 } } };
  const byDate = { 20260715: dateRow([m(501, FM_ARS, FM_MCI, "2026-07-15T18:00:00Z")]) };
  const r = await run({ leagues: LEAGUES, byDate, details: {}, fixtures: FIXTURES,
    teams: TEAMS, els: ELS, existing: good, now: Date.parse("2027-02-01T00:00:00Z") });
  eq(r.calls.length, 0, "ENGIN kall gerd — hvorki leagues, dagsetningar ne leikir");
  eq(r.written, null, "og skrain er ekki endurskrifud (nyr timastimpill a frosnum gognum)");
  eq(r.map?.[111]?.starts, 4, "gomlu tolurnar eru samt SKILADAR — dalkarnir lifa timabilid");
  eq(r.rec.ok, true, "heimildin er GRAEN og notan segir FROZEN");
  ok(/FROZEN/.test(String(r.rec.note)), "notan segir FROZEN", r.rec.note);

  /* Og se skran fra ODRU timabili er hun EKKI notud — thad vaeri
     "gomul gogn birt sem ny" (sama einkenni og elo-aldurinn).          */
  const r2 = await run({ leagues: LEAGUES, byDate, details: {}, fixtures: FIXTURES,
    teams: TEAMS, els: ELS, existing: { ...good, season: "2025/26" },
    now: Date.parse("2027-02-01T00:00:00Z") });
  eq(r2.map && Object.keys(r2.map).length, 0, "skra fra fyrra timabili er EKKI borin fram");
  eq(r2.rec.ok, false, "og heimildin er RAUD med skyringu");
}

/* ============================================================
   H. UNKNOWN KLUBBUR -> DEYR, PARAR ALDREI A NAFNI
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("H. OKUNNUGT LANGT NAFN — deyr fremur en ad para a nafni");
console.log("─".repeat(84));
{
  const lg = { table: [{ data: { table: { all: [
    { id: FM_ARS, name: "Arsenal" }, { id: FM_MCI, name: "Manchester City" },
    { id: 4321, name: "Wrexham AFC" },        // ekki i FM_LONG_TO_FPL
  ] } } }] };
  const r = await run({ leagues: lg, byDate: {}, details: {}, fixtures: FIXTURES,
                        teams: TEAMS, els: ELS });
  ok(r.threw != null, "sóknin KASTAR i stad thess ad sleppa klubbnum thegjandi");
  ok(/FM_LONG_TO_FPL is missing: Wrexham AFC/.test(String(r.threw?.message)),
    "og villan nefnir nafnid sem vantar", String(r.threw?.message));
  eq(r.written, null, "engin skra skrifud");
}

/* ============================================================
   I. DALKARNIR FJORIR — SKRA-REGLURNAR OG "null, ALDREI 0"
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("I. DALKARNIR — skra-reglurnar, null-reglan, og ENGIN LIKANS-FULLYRDING");
console.log("─".repeat(84));
{
  const KEYS = ["preseason_starts", "preseason_games", "preseason_minutes",
                "preseason_last_start"];
  const defs = KEYS.map(k => STAT_BY_KEY[k]);
  ok(defs.every(Boolean), `allir fjorir dalkar eru i STAT_DEFS (${defs.filter(Boolean).length})`);
  eq(new Set(STAT_DEFS.map(d => d.key)).size, STAT_DEFS.length, "engir tvitekiðir lyklar i skranni");
  for (const d of defs) {
    ok(d.short.length <= 12, `${d.key}: short er ${d.short.length} stafir (<= 12) — "${d.short}"`);
    ok(typeof d.note === "string" && d.note.length >= 12, `${d.key}: nota er til (>= 12 stafir)`);
    eq(d.band, "Preseason", `${d.key}: bandid er "Preseason"`);
    eq(d.group, "core", `${d.key}: flokkurinn er "core"`);
    eq(d.live_only, true, `${d.key}: live_only — talan er um SUMARID, ekki valid timabil`);
    eq(d.hi, true, `${d.key}: haerra er betra`);
  }
  /* `no_heat` A NAKVAEMLEGA TVEIMUR OG ThAD ER MAELT VAL, EKKI SNYRTING:
     `preseason_games` er naest "sast i aefingaleik", sem er MAELT OG FELLT
     sem merki, og `preseason_last_start` er BINT (P10-P90 a 0/1 gerir hvert
     1 ad "besta manni toflunnar"). Byrjanir og minutur ERU maeld merki og
     mega thvi bera lit. Vaeri thetta rangt saeti litur a tolu sem maelingin
     styður ekki — sama villa og `starts_per_90` bar (CLAUDE.md 12).      */
  eq(STAT_BY_KEY.preseason_games.no_heat, true,
    "`preseason_games` er `no_heat` — 'sast i leik' er MAELT OG FELLT sem merki");
  eq(STAT_BY_KEY.preseason_last_start.no_heat, true,
    "`preseason_last_start` er `no_heat` — 0/1 dalkur ma ekki mala hvert 1 graent");
  ok(!STAT_BY_KEY.preseason_starts.no_heat && !STAT_BY_KEY.preseason_minutes.no_heat,
    "en byrjanir og minutur BERA lit — thau eru maeldu merkin");

  /* BANDID VERDUR AD VERA SAMFELLT (sama krafa og i stats.test.mjs). */
  const idx = STAT_DEFS.map((d, i) => [d.band, i]).filter(([b]) => b === "Preseason").map(([, i]) => i);
  ok(idx.length === 4 && idx[3] - idx[0] === 3, `bandid "Preseason" er samfellt (${idx.join(",")})`);

  /* NULL ER EKKI NULL. Leikmadur sem SAST EKKI hefur ekki svidin. */
  const seen = { preseason_starts: 4, preseason_games: 5, preseason_minutes: 305,
                 preseason_last_start: 1 };
  const unseen = {};                        // hvergi i lineup -> engin svid
  for (const d of defs) {
    ok(d.get(seen) != null, `${d.key}: sest -> tala (${d.get(seen)})`);
    eq(d.get(unseen), null, `${d.key}: SAST EKKI -> null, ALDREI 0`);
  }
  eq(STAT_BY_KEY.preseason_last_start.get({ preseason_last_start: 0 }), 0,
    "og RAUNVERULEGT 0 (sast, byrjadi ekki) er 0 — thau tvo eru greinanleg");

  /* ENGINN theirra ma fullyrda ad hann se hluti af byrjunar-likaninu. */
  for (const d of defs) {
    ok(/not part of the start-probability model/i.test(d.note)
       || /NOT part of the start-probability model/.test(d.note),
      `${d.key}: notan segir BERUM ORDUM ad hun se ekki hluti af byrjunar-likaninu`);
    ok(!/start probability is|feeds the start|inside start prob/i.test(d.note),
      `${d.key}: og hun fullyrðir ekki hid gagnstaeda`);
  }
  /* SAMHENGIS-REGLAN: einn fyrirvari, fjogur skipti — engin handafrit. */
  /* VANTANDI REGLA MA EKKI HRYNJA — HUN VERDUR AD FELLA.
     Fyrsta utgafa var `SCOPE_NOTES.find(...)` og svo `rule.applies` beint:
     stokkbreyting sem fjarlaegdi regluna kastaði TypeError, og ThA HAETTU
     ALLAR fullyrdingar sem komu a eftir ad keyra. Hrun er ekki fall
     (CLAUDE.md 5b) — svo hér er staðgengill sem stenst ENGA fullyrdingu. */
  const rule = SCOPE_NOTES.find(s => s.id === "preseason")
    || { id: "preseason", applies: () => false, text: "<MISSING SCOPE NOTE>" };
  ok(SCOPE_NOTES.some(s => s.id === "preseason"), "`SCOPE_NOTES` ber reglu med id 'preseason'");
  const hit = STAT_DEFS.filter(rule.applies);
  eq(hit.length, 4, "reglan tekur til NAKVAEMLEGA fjogurra dalka");
  for (const d of hit) {
    const n = d.note.split(rule.text).length - 1;
    eq(n, 1, `${d.key}: fyrirvarinn stendur nakvaemlega EINU SINNI`);
  }
  const outside = STAT_DEFS.filter(d => !rule.applies(d) && d.note.includes(rule.text));
  eq(outside.length, 0, "og HVERGI i notu sem reglan tekur ekki til");
  /* Reitirnir sem getterarnir lesa eru ADEINS `preseason_*` — annars nær
     reglan yfir dalk sem hun a ekki ad na yfir.                         */
  for (const d of defs) {
    const f = [...(FIELDS_READ.get(d.key) || [])];
    ok(f.length === 1 && f[0] === d.key, `${d.key}: les nakvaemlega sitt eigid svid (${f.join(",")})`);
  }
}

/* ============================================================
   J. TENGINGIN — PIPELINE SKRIFAR SVIDIN OG SKRAIN LES ThAU
      (`wiring.mjs` finnur ekki thennan hlekk: svidin fara gegnum
      players.json, ekki gegnum skraarheiti.)
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("J. TENGINGIN — fetch.mjs -> players.json -> STAT_DEFS");
console.log("─".repeat(84));
{
  ok(/writeJSON\("preseason\.json"/.test(src),
    "pipeline skrifar `preseason.json` med BOKSTAFLEGU heiti (svo wiring.mjs sjai hana)");
  ok(/await fetchPreseason\(\{ els, teams \}\)/.test(src),
    "og `fetchPreseason` er kollud UR `fetchFPL`, a undan players.json");
  for (const k of ["preseason_starts", "preseason_games", "preseason_minutes",
                   "preseason_last_start"]) {
    ok(new RegExp(`${k}:\\s*preseason\\[e\\.code\\]`).test(src),
      `players.json ber ${k} (ur preseason[e.code])`);
  }
  /* OG SVIDIN VANTA ALVEG thegar hann sast ekki — `?? 0` a hvorugum stad. */
  const blk = /\.\.\.\(preseason\[e\.code\] \? \{[\s\S]{0,400}?\} : \{\}\)/.exec(src);
  ok(!!blk, "svidin eru sett med `...(row ? {...} : {})` — vantar alveg thegar rodin vantar");
  ok(!/preseason\[e\.code\]\?\.\w+ \?\? 0/.test(src),
    "ekkert `?? 0` — 'sast ekki' ma aldrei verda 'byrjadi ekki' (MAELT OG FELLT)");
  /* Daglega keyrslan, EKKI --fast. */
  const fastFn = src.slice(src.indexOf("async function fetchFast("));
  const fastBody = fastFn.slice(0, fastFn.indexOf("\n}\n"));
  ok(!/fetchPreseason/.test(fastBody),
    "`fetchPreseason` er EKKI i hrada keyrslunni (48-96x a dag fyrir 0 nyja upplysingu)");
  /* Og timamork a hverju kalli — `wiring.mjs` heldur thessu lika, en her er
     thad bundid vid ThETTA fall. */
  ok(/AbortSignal\.timeout\(20000\)/.test(body), "FotMob-kallid hefur timamork");
}

/* ============================================================
   K. HEIMILDIN VERDUR AD SJAST UNDIR "Data sources"

   CLAUDE.md kafli 7: "Baetir thu vid heimild: skradu hana thar, annars er
   hun OSYNILEG thegar hun brotnar." `SHOW` i `App.jsx` er STRANGUR
   hvitlisti, svo `record("preseason", ...)` skrifar raud linu a disk sem
   ENGINN ser — nakvaemlega thad sem gerdist fyrir `prediction_ledger` og
   `elo_age` (baett vid 16.8.2026 eftir sama uppgotvun).

   VORDURINN LIGGUR HER OG EKKI I `wiring.mjs` af thvi ad `wiring` spyr
   hvort SKRAIN se lesin; thetta er onnur spurning: hvort HEIMILDIN se synd.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("K. HEIMILDIN UNDIR 'Data sources' — raud lina sem enginn ser er engin lina");
console.log("─".repeat(84));
{
  const app = readFileSync(ROOT + "src/App.jsx", "utf8");
  ok(/record\("preseason",/.test(src), "forsenda: pipeline SKRAIR heimildina med `record(\"preseason\")`");
  const i = app.indexOf("const SHOW = {");
  ok(i > 0, "forsenda: `SHOW`-hvitlistinn finnst i App.jsx");
  const showBlk = app.slice(i, app.indexOf("};", i));
  /* FORSENDA FYRIR NEIKVAEDU FULLYRDINGUNNI (CLAUDE.md 5b regla 2): blokkin
     verdur ad bera adra heimild sem VID vitum ad er thar.               */
  ok(/prediction_ledger:/.test(showBlk),
    "forsenda: blokkin ber `prediction_ledger` (svo leitin sjalf virki)");
  ok(/preseason:\s*"/.test(showBlk),
    "og `preseason` er i `SHOW` — annars fer rautt ljos a disk og er synt ENGUM");
}

console.log(`\nAEFINGALEIKIR: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
