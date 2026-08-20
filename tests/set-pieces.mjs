/* ============================================================
   FOST LEIKATRIDI — "FYRSTI TAKI" ER ROD INNAN LIDS, EKKI TALAN 1

   MAELT 31.7.2026 a data/players.json (20 lid):
     penalties_order                        1-5   -> 1 hja 20/20 lidum
     direct_freekicks_order                 1-5   -> 1 hja 20/20 lidum
     corners_and_indirect_freekicks_order   4-10  -> 1 hja  0/20 lidum
   FPL notar ANNAN GRUNN fyrir horn. Arsenal: Rice=5, Saka=6, Madueke=7,
   Odegaard=8 — Rice ER hornataki lidsins thott talan se 5.

   ENDURMAELT 14.8.2026 — FPL ENDURGRUNNADI HORNIN 13.8.2026:
     corners_and_indirect_freekicks_order   1-6   -> 1 hja 18/20 lidum
   (mælt ur committudum data/players.json: 9.8-12.8 baru 2-12 med 0/20 a 1;
   13.8 og 14.8 bera 1-6 med 18/20. `fetch.mjs:262` afritar toluna obreytta,
   svo thetta er FPL sjalft, ekki pipeline.) Arsenal: Rice ber nu 1.
   pen og fk eru bædi 1-5, svo ALLIR ThRIR sviðin hafa nu sama grunn.

   REGLAN STOD ThETTA AF — rod innan lids er rett a badum grunnum — OG HUN ER
   ENN NAUDSYNLEG: FUL og NEW hafa enga 1. ThRJAR FULLYRDINGAR FELLU samt, og
   allar thrjar voru fullyrdingar um FPL-numerin, ekki um regluna:
     "HORN na aldrei 1" · "...THOTT enginn hafi toluna 1" · "hans FPL-tala er EKKI 1"
   Ef thaer hefdu verid SLOKTAR i stad thess ad vera endurskrifadar vaeri
   afturfor-vordurinn horfinn: `order === 1` virkar nu fyrir 18 af 20 lidum.
   Vordurinn er thess vegna a TILBUNU lidi (4/7/9) sem getur aldrei ordid
   tomt, plus lifandi lidunum an 1, TOLDUM. Sja CLAUDE.md 5b.

   TVAER THOGULAR VILLUR SEM THETTA VER:
     1. "adeins fyrsti taki" (order === 1) syndi EKKERT fyrir horn.
     2. setPieceBadges notadi `order <= 3` svo HORNATAKAR FENGU ALDREI IKON.
   Baedi voru thogul: talan VAR til, hun var bara aldrei <= 3. Ekkert prof
   hefdi fundid thad — thess vegna er thetta safn til.

   Maelt: 24/24 graen.
   ============================================================ */
import { readFileSync, readdirSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (n, c, x = "") => {
  if (typeof n !== "string") throw new Error("ok(): heiti verdur ad vera strengur");
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${x ? "   " + x : ""}`); }
};

const { SP_KINDS, setPieceRanks, setPieceBadges, spRanges } =
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
/* HER STOD: ok("HORN na aldrei 1", Math.min(...ckVals) > 1) — og hun FELL
   13.8.2026 thegar FPL endurgrunnadi hornin (2-12 -> 1-6). Hun var fullyrding
   um FPL, ekki um regluna okkar, og hun var thvi ALDREI vordur um kodann.
   Svidid er REPORTAD hér fyrir ofan (thad er raunverulega gagnlegt: nu sest
   svona breyting) og reglan sjalf er vardin i kafla 2.                      */
const ckMinByTeam = new Map();
for (const p of players) {
  const o = p.corners_and_indirect_freekicks_order;
  if (o == null) continue;
  ckMinByTeam.set(p.team, Math.min(ckMinByTeam.get(p.team) ?? Infinity, o));
}
const ckNoOne = [...ckMinByTeam.entries()].filter(([, m]) => m > 1).map(([t]) => t);
console.log(`     ck: ${ckNoOne.length} lid hafa ENGA 1 (thar finnur \`order === 1\` engan taka)`);
ok("hornarodun er skrad fyrir minnst 15 lid (annars maelir kaflinn litid)",
   ckMinByTeam.size >= 15, `${ckMinByTeam.size} lid`);

/* `spRanges` BER TOLURNAR SEM BIRTAST I FLIPANUM — thess vegna er hun mæld
   hér gegn ODHADRI talningu i thessu profi. Skyringin nedst i Set pieces
   sagdi "4-10 and never reach 1" sem FASTAN TEXTA og vard osonn a skjanum
   13.8.2026; nu er hun reiknud, og tha verdur ad verja reikninginn.       */
const R = spRanges(players);
ok("spRanges skilar svidi fyrir allar thrjar tegundir",
   SP_KINDS.every(k => R[k.key] && Number.isFinite(R[k.key].min)), JSON.stringify(R));
ok(`spRanges ck-svid passar vid odhada talningu (${R.ck?.min}-${R.ck?.max})`,
   R.ck.min === Math.min(...ckVals) && R.ck.max === Math.max(...ckVals),
   `${R.ck?.min}-${R.ck?.max} a moti ${Math.min(...ckVals)}-${Math.max(...ckVals)}`);
ok(`spRanges telur lid an 1 rett (${R.ck?.teamsNoOne})`,
   R.ck.teamsNoOne === ckNoOne.length, `${R.ck?.teamsNoOne} a moti ${ckNoOne.length}`);
ok("spRanges: lid med 1 + lid an 1 = oll lid sem hafa rodun",
   R.ck.teamsWithOne + R.ck.teamsNoOne === R.ck.teams,
   `${R.ck?.teamsWithOne}+${R.ck?.teamsNoOne} a moti ${R.ck?.teams}`);
ok("spRanges(null) hrynur ekki", JSON.stringify(spRanges(null)) === JSON.stringify({pen:null,fk:null,ck:null}),
   JSON.stringify(spRanges(null)));

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
/* AFTURFOR-VORDUR — TVISKIPTUR, OG ThAD ER MAELT NAUDSYNLEGT.
   Gamla utgafan var: `primaryTeams.ck.size === teams.length && ckVals.every(v => v !== 1)`.
   Sidari lidurinn var fullyrding um FPL og fell 13.8.2026. Verra: SU FULLYRDING
   VAR ThAD EINA SEM GERDI VORDINN BITANDI. Med nyja grunninum (1-6, 18 af 20
   lidum med 1) myndi `order === 1` finna taka fyrir 18 lid, svo fyrri lidurinn
   einn saman fellur adeins um 2 lid — og se sa dagur ad FPL gefi OLLUM lidum 1
   fellur hann ekki neitt. Thess vegna:
     (a) TILBUID lid sem getur ALDREI ordid tomt — rodun 4/7/9, engin 1;
     (b) lifandi lidin sem hafa enga 1, TALIN (0 i dag vaeri ekki bilun, en tha
         ma kaflinn ekki thegja um ad hann se ekki lengur ad maela thau).
   Sja CLAUDE.md 5b: fullyrding sem tharf gagna-serkenni til ad bregdast er
   veikari en hun litur ut fyrir ad vera.                                    */
{
  const SYN = [
    { id: -101, team: 999, corners_and_indirect_freekicks_order: 7 },
    { id: -102, team: 999, corners_and_indirect_freekicks_order: 4 },
    { id: -103, team: 999, corners_and_indirect_freekicks_order: 9 },
  ];
  const sr = setPieceRanks(SYN);
  const firstSyn = SYN.find(p => (sr.get(p.id) || []).some(b => b.key === "ck" && b.rank === 1));
  ok("TILBUID: lid an nokkurrar 1 (4/7/9) fær samt hornataka",
     firstSyn != null, JSON.stringify([...sr.entries()]));
  ok("TILBUID: takinn er sa med LAEGSTU toluna (4), ekki `order === 1`",
     firstSyn?.corners_and_indirect_freekicks_order === 4,
     String(firstSyn?.corners_and_indirect_freekicks_order));
  ok("TILBUID: engin 1 er til i thvi lidi (svo `order === 1` finnur ENGAN)",
     SYN.every(p => p.corners_and_indirect_freekicks_order !== 1));
}
ok("LIFANDI: fyrsti hornataki finnst hja OLLUM lidum", primaryTeams.ck.size === teams.length,
   `vantar ${teams.length - primaryTeams.ck.size}`);
if (ckNoOne.length) {
  const missing = ckNoOne.filter(t => {
    const list = players.filter(p => p.team === t && p.corners_and_indirect_freekicks_order != null);
    return !list.some(p => (ranks.get(p.id) || []).some(b => b.key === "ck" && b.rank === 1));
  });
  ok(`LIFANDI: ${ckNoOne.length} lid an nokkurrar 1 fá samt taka (thau eru afturfor-provid)`,
     missing.length === 0, `vantar hja ${missing.length}`);
} else {
  console.log("     (0 lid an 1 i dag — tilbuna tilvikid eitt ber vordinn)");
}

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
   `an leidrettingar var thetta 0 (order <= 3 medan horn byrjadu i 2-4)`);
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
    /* HER STOD: ok("hans FPL-tala er EKKI 1"). Rice bar 5 thegar thetta var
       skrifad og ber 1 eftir 13.8.2026, svo fullyrdingin fell — an thess ad
       neitt vaeri ad reglunni. Rétta invariantid er ekki "talan er ekki 1"
       heldur "takinn er sa med LAEGSTU toluna", sem gildir a badum grunnum. */
    ok("ARS hornataki er sa med LAEGSTU FPL-toluna (gildir a hvorum grunni sem er)",
       first.corners_and_indirect_freekicks_order ===
         Math.min(...ck.map(p => p.corners_and_indirect_freekicks_order)),
       String(first.corners_and_indirect_freekicks_order));
  }
}
/* OG TILVIKID SEM AFHJUPADI VILLUNA LIFIR ENN — i odru lidi. Arsenal var
   daemid 31.7.2026 (Rice=5); eftir endurgrunnun FPL eru thad FUL og NEW sem
   hafa enga 1. Kaflinn velur ThAU UR GOGNUNUM, ekki ur harðkodadu nafni, svo
   hann fylgir FPL i naestu endurgrunnun i stad thess ad falla.            */
if (ckNoOne.length) {
  const tid = ckNoOne[0];
  const list = players.filter(p => p.team === tid && p.corners_and_indirect_freekicks_order != null)
    .sort((a, b) => a.corners_and_indirect_freekicks_order - b.corners_and_indirect_freekicks_order);
  const nm = teams.find(t => t.id === tid)?.short || tid;
  const b = (ranks.get(list[0].id) || []).find(x => x.key === "ck");
  ok(`${nm} hefur ENGA 1 (laegsta ${list[0].corners_and_indirect_freekicks_order}) og ` +
     `${list[0].web_name} er samt taki — gamla reglan hefdi sleppt honum`,
     b?.rank === 1, JSON.stringify(b));
}

/* ============================================================
   5b. SKYRINGIN A SKJANUM — WIRINGID, EKKI BARA FORMULAN

   `spRanges` er mæld i kafla 1, en THAD VAR ALDREI FORMULAN SEM BRAST:
   skyringin nedst i flipanum bar FASTAN texta ("corners 4-10 and never
   reach 1") sem vard OSONN 13.8.2026. Prof sem maelir bara `spRanges`
   myndi vera graent thott skyringin vaeri enn hardkodud — sama aett af
   villu og dauði markadslidurinn (CLAUDE.md 3) og auðgunin (8).
   Thess vegna er hlutinn RENDERADUR og talan LESIN UT UR HONUM.
   `renderToStaticMarkup` naegir: hluturinn notar adeins useMemo/useState.
   ============================================================ */
console.log("\n=== 5b. SVIDID SEST I FLIPANUM (renderad) ===");
{
  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const SetPieces = (await import(new URL("src/SetPieces.jsx", REPO).href)).default;
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  const html = renderToStaticMarkup(React.createElement(SetPieces, {
    players, teams, teamById, Crest: () => null, notes: null,
    onPickPlayer: () => {}, bsd: null,
  }));
  const txt = html.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
  const exp = R.ck.min === R.ck.max ? String(R.ck.min) : `${R.ck.min}–${R.ck.max}`;
  ok(`flipinn birtir RAUNVERULEGA ck-svidid (${exp})`, txt.includes(exp), txt.slice(-260));
  ok(`flipinn birtir pen-svidid (${R.pen.min}–${R.pen.max})`,
     txt.includes(`${R.pen.min}–${R.pen.max}`), txt.slice(-260));
  /* NEIKVAED FULLYRDING MED SANNADRI FORSENDU (CLAUDE.md 5b regla 2):
     strengurinn "4–10" VAR i thessum sama texta fyrir lagfaeringuna. */
  ok("gamla hardkodada svidid (\"4–10\") er EKKI lengur i textanum",
     !txt.includes("4–10"), txt.slice(-260));
  /* ============================================================
     ThESSI VAR TOM OG ThAD SAST EKKI (lagad 20.8.2026).
     Hun stod: `R.ck.teamsNoOne === 0 || txt.includes(...)`. `||`
     skammhleypir, og `teamsNoOne` er **0** a raungognum i dag (oll 20 lid
     hafa 1 eftir ad FPL endurtoludi hornin 13.8.), svo hun var ALLTAF SONN
     og maeldi ekkert. Nakvaemlega klasinn sem CLAUDE.md kafli 13 er
     skrifadur um ("|| bindur fastar en ?:"), i skra sem er full af
     rettum verdum.

     VIDMOTID HEFUR TVAER GAGNKVAEMT UTILOKANDI GREINAR (SetPieces.jsx
     375-378), svo rétta fullyrdingin er TVISIDA og getur fallid i BADUM
     stodum:
       teamsNoOne > 0  -> talan OG "no number 1 at all" birtast, og
                          endurtolunar-setningin ma EKKI vera thar
       teamsNoOne == 0 -> endurtolunar-setningin birtist, og appid ma EKKI
                          fullyrda ad einhver lid vanti 1
     Sidari greinin er sú sem er lifandi i dag; fyrri greinin kviknar um
     leid og FPL endurtoludi aftur, sem thad hefur gert TVISVAR a fimm
     dogum.                                                            */
  {
    const NONE = "no number 1 at all";
    const RENUM = "FPL has renumbered this base mid-season before";
    if (R.ck.teamsNoOne > 0) {
      ok(`fjoldi lida an 1 (${R.ck.teamsNoOne}) sest i textanum`,
         txt.includes(String(R.ck.teamsNoOne)), txt.slice(-260));
      ok("og setningin um lid an 1 er birt", txt.includes(NONE), txt.slice(-260));
      ok("en endurtolunar-setningin er ThA EKKI birt", !txt.includes(RENUM),
         txt.slice(-260));
    } else {
      ok(`ekkert lid an 1 (${R.ck.teamsNoOne}) -> endurtolunar-setningin er birt`,
         txt.includes(RENUM), txt.slice(-260));
      ok("og appid fullyrdir EKKI ad lid vanti 1", !txt.includes(NONE),
         txt.slice(-260));
    }
  }
  ok("engin NaN/undefined i skyringunni", !/\bNaN\b|\bundefined\b/.test(txt));

  /* ============================================================
     5c. PROSA-TRIMMID 20.8.2026 — TVEIR TEXTAR FARNIR, MAELINGIN KYRR

     Fjarlaegt af SKJANUM: (a) fyrirlida-malsgreinin ("Captains (the armband)
     are not here…") og (b) undirtitillinn ("First taker for each team — from
     FPL, updates automatically…"). Badir voru ORDRETT i thessari somu `txt`
     adur en their voru fjarlaegdir, sem er forsendan sem CLAUDE.md 5b regla 2
     krefst: `!includes(X)` er einskis virdi nema `includes(X)` hafi verid
     satt. Hvert par er thess vegna NABUI-SEM-ER-EFTIR + hinn-sem-er-farinn:
     nabuinn sannar ad hluturinn teiknadist yfirhofud, svo fullyrdingin geti
     ekki ordid graen af thvi ad flipinn se tomur eda hruninn.

     OG HUN VER TVENNT SEM MA EKKI FARA MED: mælda advorunina um urelta
     rodun (LIFANDI gagna-fyrirvari, ekki ritgerd) og skyringar-linuna um
     "First taker" nedst — sidari er ordalag sem SVIPAR til thess sem var
     fjarlaegt, svo of gradug eyding hefdi tekid hana med.
     ============================================================ */
  ok("NABUI: hausinn \"Set pieces\" er a skjanum (svo trimm-fullyrdingarnar hafa forsendu)",
     txt.includes("Set pieces"), txt.slice(0, 120));
  ok("FARIN: fyrirlida-malsgreinin (\"Captains (the armband) are not here\")",
     !txt.includes("Captains (the armband) are not here"), txt.slice(0, 400));
  ok("FARIN: skottid a henni lika (\"captaincy shortcut\")",
     !txt.includes("captaincy shortcut"), txt.slice(0, 400));
  ok("FARIN: undirtitillinn (\"First taker for each team\")",
     !txt.includes("First taker for each team"), txt.slice(0, 400));
  /* KYRRT — thetta er ekki thekja heldur AFMORKUN: bædi eru nabuar theirra
     tveggja sem foru og bædi bera ord sem svipa til theirra.              */
  ok("KYRRT: mælda advorunin um urelta rodun (lifandi fyrirvari, ekki ritgerd)",
     txt.includes("hand-entered by FPL and can be stale"), txt.slice(-300));
  ok("KYRRT: skyringin \"First taker is the team's LOWEST FPL order\"",
     txt.includes("First taker") && txt.includes("LOWEST FPL order"), txt.slice(-300));

  /* DAGSETNINGIN ER LIFANDI GAGN OG VAR INNI I THVI SEM VAR FJARLAEGT.
     Hun var i SAMA reit og undirtitillinn, svo of gradug eyding hefdi tekid
     hana med — og tha hefdi enginn seð hvenaer handslegna rodunin var sott.
     Skilyrdid er profad i BADAR attir: med notes birtist hun, an notes er
     ENGINN reitur (ekki tomur reitur — CLAUDE.md kafla 8).                */
  const html2 = renderToStaticMarkup(React.createElement(SetPieces, {
    players, teams, teamById, Crest: () => null,
    notes: { last_updated: "2026-08-20T05:00:00Z" },
    onPickPlayer: () => {}, bsd: null,
  }));
  const txt2 = html2.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
  ok("dagsetningin lifdi trimmid (\"Updated 2026-08-20\")",
     txt2.includes("Updated 2026-08-20"), txt2.slice(0, 200));
  ok("an `notes` er ENGIN dagsetningarlina (ekki tomur reitur)",
     !txt.includes("Updated"), txt.slice(0, 200));
  ok("flipinn er enn efnismikill eftir trimmid (>1.000 stafir)",
     txt.trim().length > 1000, String(txt.trim().length));
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
   rekid i sundur ThANN DAG sem FPL endurgrunnar vita-rodina — og tha i thogn:
   PEN-merkid hefdi horfid af ollum spjoldum. ADVORUNIN VAR EKKI TILGATA:
   13.8.2026 endurgrunnadi FPL hornarodunina (2-12 -> 1-6) an nokkurrar
   tilkynningar. Ad thad hafi verid horn og ekki viti var HEPPNI.
   ATHUGASEMDIR ERU SKORNAR BURT ADUR EN LEITAD ER: skyringin i App.jsx
   vitnar sjalf i gamla kodann (`pen === 1`) og myndi annars uppfylla
   fullyrdinguna sem hun utskyrir.
   ============================================================ */
console.log("\n=== C21: APPID LES RODUN, EKKI FPL-TOLUNA ===");
{
  const { readFileSync } = await import("node:fs");
  /* `setPieceOf` FLUTTIST I `availability.js` (F1, 11.8.2026) OG ThETTA SAFN
     FELL — RETTILEGA. Fullyrdingin "setPieceOf er enn til" var sett inn
     einmitt til ad safnid thegdi ekki ef fallid hyrfi; thad hvarf ekki, thad
     FLUTTI, og vordurinn fylgir thvi. App.jsx heldur sinum hluta:
     innflutningnum a `setPieceRanks` og kallstodunum.                     */
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const rd = f => strip(readFileSync(new URL(f, import.meta.url).pathname, "utf8"));
  const app = rd("../src/App.jsx"), av = rd("../src/availability.js");
  const code = app + "\n" + av;
  ok("App.jsx flytur inn setPieceRanks", /import\s+SetPieces\s*,\s*\{[^}]*setPieceRanks/.test(app));
  ok("setPieceOf tekur `ranks`", /function setPieceOf\(p, ranks\)/.test(av));
  ok("isPenTaker kemur ur rank === 1, ekki `pen === 1`",
     /rank === 1/.test(av) && !/isPenTaker: pen === 1/.test(code));
  /* Fullyrdingin ma ekki vera tóm: mynstrid VAR tharna. Se `setPieceOf`
     horfid er thetta safn ad maela ekkert.                                */
  ok("setPieceOf er enn til (annars maelir thetta ekkert)",
     /function setPieceOf\(/.test(av));
  ok("og hun bur i availability.js, ekki i App.jsx",
     /function setPieceOf\(/.test(av) && !/function setPieceOf\(/.test(app));
  /* ALLIR KALLSTADIR SENDA RODUNINA — OG VORDURINN LEITAR SJALFUR AD THEIM.
     Adur stod her `app.match(/setPieceOf\(p, spRanks\)/g).length >= 3`, sem
     var TVOFOLD hardkodun: EIN skra (App.jsx) og EIN tala (3). Hun for i
     raudan lit 18.8.2026 thegar tillogu-skorid flutti i `src/recommend.js`
     og tok EINN kallstad med ser — kodinn var rettur, talan var urelt.
     Sama aett og `gwBlindKeys` (13 af 22 lyklum rangir) og "108 dalkar":
     handskrifadur listi yfir stadi eda fjolda verdur ad rongum leidarvisi.

     RAUNVERULEG AETLUN GUARDSINS er "enginn kallstadur gleymir rodinni".
     Hun er nu maeld thannig: LEITAD er ad ollum kallstodum i `src/`, og
     HVER OG EINN verdur ad senda tvaer roksemdir. Fjoldinn er REIKNADUR og
     stadirnir FUNDNIR, svo hvorugt getur stadnad thegar kodi flyst aftur.
     Golfid er 1 og thad er FORSENDA, ekki thak: fyndust engir kallstadir
     vaeri fullyrdingin tom (CLAUDE.md 5b, regla 1).                      */
  const srcDir = new URL("../src/", import.meta.url).pathname;
  const sites = [];
  for (const f of readdirSync(srcDir)) {
    if (!/\.jsx?$/.test(f) || f === "availability.js") continue;   // skilgreiningin sjalf
    const txt = strip(readFileSync(srcDir + f, "utf8"));
    for (const m of txt.matchAll(/setPieceOf\s*\(([^)]*)\)/g))
      sites.push({ file: f, args: m[1].split(",").map(s => s.trim()).filter(Boolean) });
  }
  ok(`fann kallstadi setPieceOf yfirhofud (${sites.length} i ${new Set(sites.map(s => s.file)).size} skram)`,
     sites.length >= 1);
  const thin = sites.filter(s => s.args.length !== 2);
  ok(`hver kallstadur sendir rodunina (${sites.length} stadir, ${thin.length} an hennar)`,
     thin.length === 0, thin.map(s => `${s.file}: setPieceOf(${s.args.join(", ")})`).join(" · "));
}

console.log(`\nFOST LEIKATRIDI: ${pass}/${pass + fail} graen`);
process.exit(fail ? 1 : 0);
