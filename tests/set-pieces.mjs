/* ============================================================
   FOST LEIKATRIDI — "FYRSTI TAKI" ER ROD INNAN LIDS, EKKI TALAN 1

   MAELT 31.7.2026 a data/players.json (20 lid):
     penalties_order                        1-5   -> 1 hja 20/20 lidum
     direct_freekicks_order                 1-5   -> 1 hja 20/20 lidum
     corners_and_indirect_freekicks_order   4-10  -> 1 hja  0/20 lidum
   FPL notar ANNAN GRUNN fyrir horn. Arsenal: Rice=5, Saka=6, Madueke=7,
   Odegaard=8 — Rice ER hornataki lidsins thott talan se 5.

   TVAER THOGULAR VILLUR SEM THETTA VER:
     1. "adeins fyrsti taki" (order === 1) syndi EKKERT fyrir horn.
     2. setPieceBadges notadi `order <= 3` svo HORNATAKAR FENGU ALDREI IKON.
   Baedi voru thogul: talan VAR til, hun var bara aldrei <= 3. Ekkert prof
   hefdi fundid thad — thess vegna er thetta safn til.

   Maelt: 24/24 graen.
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (n, c, x = "") => {
  if (typeof n !== "string") throw new Error("ok(): heiti verdur ad vera strengur");
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${x ? "   " + x : ""}`); }
};

const { SP_KINDS, setPieceRanks, setPieceBadges } =
  await import(new URL("src/SetPieces.jsx", REPO).href);
const players = J("players.json").players;
const teams = J("teams.json").teams;

console.log("\n=== 1. GAGNA-STADAN SEM ALLT HANGIR A ===");
/* Thetta er EKKI tilgata: profid maelir sviðin sjalft, svo ef FPL breytir
   grunninum (t.d. fer ad numera horn fra 1) sest thad HER, i skyrslunni,
   i stad thess ad koma fram sem thogul breyting a birtingu.              */
for (const k of SP_KINDS) {
  const vals = players.map(p => p[k.field]).filter(v => v != null);
  const min = Math.min(...vals), max = Math.max(...vals);
  const withOne = new Set(players.filter(p => p[k.field] === 1).map(p => p.team)).size;
  console.log(`     ${k.key}: svid ${min}-${max} · talan 1 hja ${withOne}/${teams.length} lidum`);
  ok(`${k.key}: einhver rodun er skrad`, vals.length > 0, String(vals.length));
}
const ckVals = players.map(p => p.corners_and_indirect_freekicks_order).filter(v => v != null);
ok("HORN na aldrei 1 (astaedan fyrir rod-innan-lids)", Math.min(...ckVals) > 1,
   `laegsta hornarodun er ${Math.min(...ckVals)}`);

console.log("\n=== 2. ROD INNAN LIDS FINNUR TAKA FYRIR ALLAR THRJAR ===");
const ranks = setPieceRanks(players);
ok("setPieceRanks skilar Map", ranks instanceof Map, typeof ranks);
const primaryTeams = {};
for (const k of SP_KINDS) primaryTeams[k.key] = new Set();
for (const p of players)
  for (const b of (ranks.get(p.id) || []))
    if (b.rank === 1) primaryTeams[b.key].add(p.team);
for (const k of SP_KINDS) {
  const n = primaryTeams[k.key].size;
  ok(`${k.key}: fyrsti taki finnst hja ${n}/${teams.length} lidum`, n === teams.length,
     `vantar ${teams.length - n}`);
}
/* AFTURFOR-VORDUR: ef einhver skilar `order === 1`-reglunni fellur thetta,
   thvi tha finnst enginn hornataki.                                       */
ok("HORN hafa fyrsta taka THOTT enginn hafi toluna 1",
   primaryTeams.ck.size === teams.length && ckVals.every(v => v !== 1));

console.log("\n=== 3. ROD ER SAMKVAEM OG EINKVAEM INNAN LIDS ===");
let dupRank = 0, gaps = 0, checked = 0;
for (const k of SP_KINDS) {
  for (const t of teams) {
    const list = players.filter(p => p.team === t.id && p[k.field] != null)
      .map(p => ({ p, ...(ranks.get(p.id) || []).find(b => b.key === k.key) }))
      .filter(e => e.rank != null);
    if (!list.length) continue;
    checked++;
    const rs = list.map(e => e.rank).sort((a, b) => a - b);
    if (new Set(rs).size !== rs.length) dupRank++;
    if (rs[0] !== 1 || rs[rs.length - 1] !== rs.length) gaps++;
    /* Rod 1 verdur ad vera sa med LAEGSTU FPL-tolu. */
    const byOrder = list.slice().sort((a, b) => a.order - b.order);
    if (byOrder[0].rank !== 1) dupRank++;
  }
}
ok(`engin tvitekin rod innan lids (${checked} lid-tegundir profadar)`, dupRank === 0, String(dupRank));
ok("rodin er samfelld 1..n innan hvers lids", gaps === 0, String(gaps));

console.log("\n=== 4. IKON A SPJALDI — HORNATAKAR FA THAU NUNA ===");
const withCk = players.filter(p => {
  const bs = setPieceBadges(p, ranks) || [];
  return bs.some(b => b.key === "ck");
});
ok(`hornatakar fa ikon (${withCk.length} leikmenn)`, withCk.length >= teams.length,
   `an leidrettingar var thetta 0 (order <= 3 og horn byrja i 4)`);
ok("setPieceBadges an `ranks` skilar null (betra en rangt)",
   setPieceBadges(players[0], null) === null);
ok("leikmadur an rodunar fær null",
   setPieceBadges({ id: -1 }, ranks) === null);
/* maxRank 2 sjalfgefid: rod 3+ a ekki ad tróna a spjaldi */
const anyRank3 = players.some(p => (setPieceBadges(p, ranks) || []).some(b => b.rank > 2));
ok("sjalfgefid `maxRank` 2 heldur (engin rod 3+ i ikonum)", !anyRank3);

console.log("\n=== 5. ARSENAL — TILVIKID SEM AFHJUPADI VILLUNA ===");
const ars = teams.find(t => t.short === "ARS");
if (ars) {
  const ck = players.filter(p => p.team === ars.id && p.corners_and_indirect_freekicks_order != null)
    .sort((a, b) => a.corners_and_indirect_freekicks_order - b.corners_and_indirect_freekicks_order);
  ok(`ARS hefur skrada hornarodun (${ck.length} menn)`, ck.length > 0);
  if (ck.length) {
    const first = ck[0];
    const b = (ranks.get(first.id) || []).find(x => x.key === "ck");
    ok(`ARS hornataki = ${first.web_name} (FPL-rodun ${first.corners_and_indirect_freekicks_order})`,
       b?.rank === 1, JSON.stringify(b));
    ok("hans FPL-tala er EKKI 1 — svo gamla reglan hefdi sleppt honum",
       first.corners_and_indirect_freekicks_order !== 1,
       String(first.corners_and_indirect_freekicks_order));
  }
}

console.log("\n=== 6. ILLGJARNT INNTAK ===");
ok("setPieceRanks(null) hrynur ekki", setPieceRanks(null) instanceof Map);
ok("setPieceRanks([]) skilar tomu", setPieceRanks([]).size === 0);
ok("radir an lids/rodunar eru sleppt",
   setPieceRanks([{ id: 1 }, { id: 2, team: 1 }, null].filter(Boolean)).size === 0);
ok("setPieceBadges(null, ranks) skilar null", setPieceBadges(null, ranks) === null);


/* ============================================================
   APPID VERDUR AD NOTA RODUN INNAN LIDS, EKKI FPL-TOLUNA (C21, 11.8.2026)
   `setPieceBadges`/`setPieceRanks` eru RETTA adferdin skv. hausnum a
   SetPieces.jsx — og voru samt export sem APPID NOTADI EKKI: App.jsx bar
   sina eigin `isPenTaker: pen === 1`.
   Maelt: badar adferdir gefa SOMU 20 vitaskyttur i dag (63 leikmenn med
   `penalties_order`), svo thetta var TVITEKNING, ekki villa. En thaer hefdu
   rekid i sundur ThANN DAG sem FPL endurgrunnar vita-rodina — eins og hun
   ThEGAR gerir fyrir horn (svid 4-10, svo `order === 1` naer thar aldrei) —
   og tha i thogn: PEN-merkid hefdi horfid af ollum spjoldum.
   ATHUGASEMDIR ERU SKORNAR BURT ADUR EN LEITAD ER: skyringin i App.jsx
   vitnar sjalf i gamla kodann (`pen === 1`) og myndi annars uppfylla
   fullyrdinguna sem hun utskyrir.
   ============================================================ */
console.log("\n=== C21: APPID LES RODUN, EKKI FPL-TOLUNA ===");
{
  const { readFileSync } = await import("node:fs");
  const raw = readFileSync(new URL("../src/App.jsx", import.meta.url).pathname, "utf8");
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  ok("App.jsx flytur inn setPieceRanks", /import\s+SetPieces\s*,\s*\{[^}]*setPieceRanks/.test(code));
  ok("setPieceOf tekur `ranks`", /function setPieceOf\(p, ranks\)/.test(code));
  ok("isPenTaker kemur ur rank === 1, ekki `pen === 1`",
     /rank === 1/.test(code) && !/isPenTaker: pen === 1/.test(code));
  /* Fullyrdingin ma ekki vera tóm: mynstrid VAR tharna. Se `setPieceOf`
     horfid ur App.jsx er thetta safn ad maela ekkert.                     */
  ok("setPieceOf er enn til i App.jsx (annars maelir thetta ekkert)",
     /function setPieceOf\(/.test(code));
  const calls = (code.match(/setPieceOf\(p, spRanks\)/g) || []).length;
  ok(`allir kallstadir senda rodunina (${calls})`, calls >= 3);
}

console.log(`\nFOST LEIKATRIDI: ${pass}/${pass + fail} graen`);
process.exit(fail ? 1 : 0);
