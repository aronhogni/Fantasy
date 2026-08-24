/* ============================================================
   waivers.mjs — HVER ER LAUS, OG A AD SKIPTA?

   Rokfraedin er HREIN (`src/waivers.js`), svo thetta prof keyrir
   NAKVAEMLEGA thad sem appid myndi birta — ekki afrit af thvi.

   ============================================================
   GOGNIN ERU RAUNVERULEG OG DEILDIN ER DEILDIN SEM NOTANDINN SPILAR I
   ============================================================
   `data/players.json` gegnum `buildRows` med 10-lida PPR-deild,
   QB1 RB2 WR2 TE1 FLEX2 K1 DST1 — thad er deild 1389356308104249344
   ("Patriots SB champs", sja `sleeper-league.mjs`). Thad er asett:
   tilbuin laug sannar adeins ad kodinn vinni a thvi sem VID hugsudum
   okkur. Thrennt her hefdi ekki sest a tilbuinni laug:

     · vid waiver-threp eru NANAST ALLIR i thversto0u-threpi 14, svo
       threp er ONYTT sem oryggis-maelikvardi (fyrsta hugmyndin um
       `confident` byggdi a thvi og var felld af thessari astaedu).
     · lelegir leikstjornendur bera VBD ~ -288, svo "odyrast ad missa"
       velur ALLTAF leikstjornandann se hann ekki verndaður — og tha
       hefdi radgjofin radlagt ad drepa eina byrjunarlids-QB-inn.
     · raunverulegar rodir bera `undefined` a threm svidum
       (`projSpread`, `exp`, `depth`), svo alsherjar-skonnun a laugina
       fellur af astaedu sem hefur ekkert med waiver ad gera. Sja
       kafla 9 — thad er thess vegna sem SKANNAD ER THAD SEM SKRAIN
       BYR TIL og laugin er borin saman med JAFNGILDI hluta.

   ============================================================
   PROFSTEINNINN ER KAFLI 5
   ============================================================
   Verkfaeri sem finnur ALLTAF skipti er gagnslaust. Kafli 5 gefur
   sterkasta moguleg hop og krefst TOMS fylkis, og speglar thad svo
   med sama kalli a veikum hop sem VERDUR ad gefa tillogur. Onnur
   fullyrdingin an theirrar seinni gaeti stadist thott fallid skilaði
   alltaf tomu.
   ============================================================ */

import { readFileSync } from "node:fs";
import path from "node:path";
import { freeAgents, pickupAdvice, WAIVER_CAL } from "../src/waivers.js";
import { buildRows } from "../src/build.js";
import { slotsFor } from "../src/lineup.js";

const DATA = path.resolve(new URL(".", import.meta.url).pathname, "..", "data");
let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const num = (v) => (v == null ? null : Number(v));

/* ---------- raunveruleg gogn, raunveruleg deild ---------- */
const LEAGUE = {
  teams: 10, scoring: "ppr",
  starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
  superflex: false, maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
};
const players = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
const { rows } = buildRows({ players, league: LEAGUE });

const RANKED = ["QB", "RB", "WR", "TE"];
const ranked = rows.filter((r) => r.vbd != null && RANKED.includes(r.pos))
                   .sort((a, b) => b.vbd - a.vbd);
const kicker = rows.find((r) => r.pos === "K" && r.vbd != null);
const dst = rows.find((r) => r.pos === "DST" && r.vbd != null);

/** 10 hopar: minir eru `mineRows`, hinir 9 fa `othersRows` jafnt. */
function world(mineRows, othersRows) {
  const rosters = [{ roster_id: 1, owner_id: "me", players: mineRows.map((r) => String(r.id)) }];
  const per = Math.ceil(othersRows.length / 9);
  for (let i = 0; i < 9; i++) {
    rosters.push({ roster_id: i + 2, owner_id: `u${i}`,
                   players: othersRows.slice(i * per, (i + 1) * per).map((r) => String(r.id)) });
  }
  return rosters;
}

/* Sterkur hopur: 15 bestu i deildinni. Veikur hopur: menn i saeti
   301-315 af 558 rodudum. BADIR bera spyrnumann og vorn, thvi
   byrjunarlidid tharf tha og stodu-verndin les thad. */
const STRONG = [...ranked.slice(0, 15), kicker, dst];
const WEAK = [...ranked.slice(300, 315), kicker, dst];
const STRONG_ROSTERS = world(STRONG, ranked.slice(15, 150));
const WEAK_ROSTERS = world(WEAK, ranked.slice(315, 450));

/* ============================================================
   1. "VITUM EKKI" MA ALDREI LESAST EINS OG "ENGINN ER TEKINN"
   ============================================================
   Vantandi hopar gefa `pool: null`. Vaeri thad allir leikmenn faerdi
   appid ther 300 manna lista thar sem hver einn er i eigu einhvers —
   og hann liti NAKVAEMLEGA eins ut og rettur listi. Sama regla og
   NULL-reglan i vidmotinu og sama villa og fals-null i FPL-verkefninu.

   Fullyrdingin er THREFOLD: `pool` er null, `rosteredCount` er null
   (0 vaeri fullyrding um ad enginn se tekinn), og astaedan er sogd.  */
console.log("\n1. vantandi hopar -> pool er NULL, ekki allir");
{
  for (const [label, rosters] of [["null", null], ["undefined", undefined],
                                  ["tomt fylki", []], ["rusl", "abc"],
                                  ["fylki af rusli", [null, 3, "x"]]]) {
    const r = freeAgents({ rows, rosters, myRosterId: 1 });
    ok(r.pool === null, `${label}: pool === null (ekki ${r.pool ? r.pool.length : "null"})`);
    ok(r.rosteredCount === null, `${label}: rosteredCount === null, ekki 0`);
    ok(r.mine === null, `${label}: mine === null`);
    ok(r.notes.length > 0 && /cannot tell who|not know/i.test(r.notes.join(" ")),
      `${label}: astaedan er sogd ("${r.notes[0].slice(0, 44)}…")`);
  }

  /* Hopar sem eru til en OLESANLEGIR eru thad SAMA og engir hopar —
     ad lesa `players: "abc"` sem "tomur hopur" vaeri ad fullyrda ad
     enginn se tekinn hja lidi sem vid gatum ekki lesid. */
  const bad = freeAgents({ rows, rosters: [{ roster_id: 1, players: "abc" },
                                           { roster_id: 2, players: 7 }], myRosterId: 1 });
  ok(bad.pool === null, "allir hopar olesanlegir -> pool === null");
  ok(bad.unreadableRosters === 2, `og their eru TALDIR (${bad.unreadableRosters})`);

  /* OG GILD SVOR VERDA AD GEFA LAUG — annars gaeti fullyrdingin ad
     ofan stadist thott fallid skilaði alltaf null. */
  const good = freeAgents({ rows, rosters: STRONG_ROSTERS, myRosterId: 1 });
  ok(Array.isArray(good.pool) && good.pool.length > 0,
    `gildir hopar gefa laug (${good.pool.length} lausir)`);
  ok(good.pool.length < rows.length,
    `og hun er MINNI en bordid (${good.pool.length} af ${rows.length})`);

  /* `players: null` er raunveruleg upplysing hja Sleeper — hopur sem
     enginn hefur draftad i. Hann er tomur, ekki olesanlegur, og tha er
     "enginn tekinn" RETT svar. */
  const empty = freeAgents({ rows, rosters: [{ roster_id: 1, players: null },
                                             { roster_id: 2, players: null }],
                             myRosterId: 1 });
  ok(Array.isArray(empty.pool) && empty.pool.length === rows.length,
    `tomir hopar (players: null) gefa ALLA — thad er rett svar (${empty.pool ? empty.pool.length : "null"})`);
  ok(empty.rosteredCount === 0, "og rosteredCount er 0, sem er MAELD tala her");
  ok(Array.isArray(empty.mine) && empty.mine.length === 0,
    "minn hopur er TOMT FYLKI, sem er annad en null");
}

/* ============================================================
   2. SA SEM ER TEKINN ER EKKI LAUS
   ============================================================ */
console.log("\n2. laugin, minir og talningin");
{
  const r = freeAgents({ rows, rosters: STRONG_ROSTERS, myRosterId: 1 });
  const poolIds = new Set(r.pool.map((p) => String(p.id)));

  /* Hja OÐRUM: leikmadur nr. 20 er a hop 2 og ma ekki vera laus. */
  const other = ranked[20];
  ok(!poolIds.has(String(other.id)),
    `${other.name} er a hop hja odrum og er EKKI i lauginni`);
  /* Og minir eru ekki heldur lausir. */
  ok(!poolIds.has(String(ranked[0].id)),
    `${ranked[0].name} er a MINUM hop og er ekki i lauginni`);
  /* En sa sem er a engum hop ER laus. */
  const free = ranked[300];
  ok(poolIds.has(String(free.id)), `${free.name} er a engum hop og ER laus`);

  const known = new Set(STRONG_ROSTERS.flatMap((x) => x.players));
  ok(r.rosteredCount === known.size,
    `rosteredCount telur alla ${known.size} (fann ${r.rosteredCount})`);
  ok(r.pool.length === rows.length - known.size,
    `laugin er bordid minus their (${r.pool.length} = ${rows.length} - ${known.size})`);

  ok(Array.isArray(r.mine) && r.mine.length === STRONG.length,
    `minn hopur er ${STRONG.length} menn (fann ${r.mine ? r.mine.length : "null"})`);
  ok(r.mine[0].id === STRONG[0].id,
    `og hann er rodadur eftir VBD (${r.mine[0].name} fyrstur)`);

  /* Laugin ber SOMU HLUTI og inntakid — ekki afrit. Afrit gaeti rekid
     fra rodunum sem taflan birtir, og tha vaeri sami leikmadur med
     tvaer tolur. */
  ok(r.pool.every((p) => rows.includes(p)),
    "laugin ber somu rada-hluti og inntakid, ekki afrit");

  /* Rangt `roster_id` er OVISSA, ekki tomur hopur. */
  const nope = freeAgents({ rows, rosters: STRONG_ROSTERS, myRosterId: 99 });
  ok(nope.mine === null && Array.isArray(nope.pool),
    "othekkt roster_id -> mine === null en laugin stendur");
  ok(nope.notes.some((n) => /99/.test(n)), "og thad er sagt hvad var leitad ad");
  const noId = freeAgents({ rows, rosters: STRONG_ROSTERS });
  ok(noId.mine === null, "ekkert roster_id -> mine === null, ekki tomt fylki");
}

/* ============================================================
   3. SA SEM BORDID THEKKIR EKKI MA EKKI HVERFA THEGJANDI
   ============================================================
   Bordid naer yfir ~1.130 sokn-leikmenn; Sleeper ber thusundir. Vorn-
   og linumenn a hopum eiga rettilega ekkert erindi a bordid, EN their
   mega ekki hverfa an talningar — tha vaeri "hve marga a eg?" rong an
   thess ad nokkud brotni. Sama vord og `unmatched` i `DraftBoard.jsx`.  */
console.log("\n3. othekktir a hopum eru TALDIR");
{
  const rosters = JSON.parse(JSON.stringify(STRONG_ROSTERS));
  rosters[2].players.push("99999999", "88888888");   // eru ekki i players.json
  rosters[0].players.push("77777777");               // og einn hja mer

  const r = freeAgents({ rows, rosters, myRosterId: 1 });
  ok(r.unknownRostered === 3, `3 othekktir taldir (fann ${r.unknownRostered})`);
  ok(r.unknownRosteredIds.includes("99999999"), "og audkennin fylgja med");
  ok(r.myUnknown === 1, `their sem eru MINIR eru taldir ser (${r.myUnknown})`);
  ok(r.notes.some((n) => /not on this board/i.test(n)), "og thad stendur i notu");

  /* Talningin ma ekki lita ut eins og ad their seu i lauginni. */
  const poolIds = new Set(r.pool.map((p) => String(p.id)));
  ok(!poolIds.has("99999999"), "othekktur madur er ekki i lauginni heldur");

  /* Hann telst SAMT tekinn — annars vaeri rosteredCount rong. */
  const base = freeAgents({ rows, rosters: STRONG_ROSTERS, myRosterId: 1 });
  ok(r.rosteredCount === base.rosteredCount + 3,
    `rosteredCount vex um 3 (${base.rosteredCount} -> ${r.rosteredCount})`);
}

/* ============================================================
   4. OVISSA GEFUR ENGA RADGJOF
   ============================================================ */
console.log("\n4. tomt og ovisst inntak -> tomt fylki, ekkert hrun");
{
  const cases = [
    ["engin gogn", {}],
    ["pool null", { pool: null, mine: [], league: LEAGUE }],
    ["mine null", { pool: rows, mine: null, league: LEAGUE }],
    ["tom laug", { pool: [], mine: STRONG, league: LEAGUE }],
    ["tomur hopur", { pool: rows, mine: [], league: LEAGUE }],
    ["rusl i baðum", { pool: "abc", mine: 7, league: LEAGUE }],
    ["laug af rusli", { pool: [null, 3, {}], mine: [null, {}], league: LEAGUE }],
  ];
  for (const [label, arg] of cases) {
    let crashed = null, out = null;
    try { out = pickupAdvice(arg); } catch (e) { crashed = String(e.message || e); }
    ok(!crashed && Array.isArray(out) && out.length === 0,
      `${label} -> tomt fylki${crashed ? ` — HRUN: ${crashed}` : ""}`);
  }
}

/* ============================================================
   5. PROFSTEINNINN — STERKUR HOPUR FAER ENGIN RAD
   ============================================================
   15 bestu leikmenn deildarinnar, og laugin ber saeti 151 og nidur.
   Verkfaeri sem finnur skipti thar er ekki radgjof heldur hrindl.

   OG SPEGILMYNDIN VERDUR AD VINNA. Fullyrdingin "tomt fylki" getur
   stadist thott fallid skili ALLTAF tomu — hun er thess vegna paruð
   vid sama kall a veikum hop, sem VERDUR ad gefa tillogur. Sama regla
   og kafli 3 i `rotation.mjs` i FPL-verkefninu.                     */
console.log("\n5. PROFSTEINN: sterkur hopur -> tomt, veikur hopur -> tillogur");
{
  const s = freeAgents({ rows, rosters: STRONG_ROSTERS, myRosterId: 1 });
  const strongAdvice = pickupAdvice({ pool: s.pool, mine: s.mine, league: LEAGUE, week: 3 });
  ok(strongAdvice.length === 0,
    `15 bestu menn deildarinnar: EKKERT skipti radlagt (fann ${strongAdvice.length}` +
    `${strongAdvice.length ? ` — t.d. ${strongAdvice[0].add.name} inn fyrir ${strongAdvice[0].drop.name}` : ""})`);
  ok(s.pool.every((p) => p.vbd == null || p.vbd < Math.min(
      ...s.mine.filter((m) => RANKED.includes(m.pos)).map((m) => m.vbd))),
    "forsendan: enginn i lauginni ber haerra VBD en versti minn");

  const w = freeAgents({ rows, rosters: WEAK_ROSTERS, myRosterId: 1 });
  const weakAdvice = pickupAdvice({ pool: w.pool, mine: w.mine, league: LEAGUE, week: 3 });
  ok(weakAdvice.length > 0, `veikur hopur: tillogur berast (${weakAdvice.length})`);

  /* Besti lausi madurinn a ad vera efsta tillagan — rodin ER A-Ranking
     (VBD) og ekkert annad. Vaeri stoduthorf latin rada faerdist hann. */
  const bestFree = w.pool.filter((p) => RANKED.includes(p.pos) && p.vbd != null)
                         .sort((a, b) => b.vbd - a.vbd)[0];
  ok(weakAdvice[0].add.id === bestFree.id,
    `efsta tillagan er besti lausi madurinn: ${weakAdvice[0].add.name} ` +
    `(vaenti ${bestFree.name})`);

  /* Sa sem fer ut a ad vera ODYRASTI SEM MA FARA — nakvaemlega hann,
     ekki "einhver odyr". Fullyrding um "<=" vaeri sonn thott fallid
     taeki hvern sem er af theim thremur odyrustu.

     ============================================================
     "SEM MA FARA" ER EKKI ORDALAG — ÞAD ER SKILYRDID
     ============================================================
     Þessi utreikningur sleppti FOSTU BYRJUNARSAETUNUM og fell 13.8.2026:
     hann vaenti Jacoby Brissett (-139,7) medan `pickupAdvice` droppadi
     DJ Giddens (-139,0). Fallid var RETT — Brissett er EINI QB i hopnum
     og fasta QB-saetid verndar hann; ad droppa hann skildi eftir tomt
     byrjunarsaeti.

     Fullyrdingin hafdi verid graen af TILVILJUN: thessir tveir eru
     0,7 stigum i sundur, og daglega ADP-endurnyjunin (`players.json` er
     endurskrifud af pipelinunni) fleytti QB-inum nidur fyrir hann.
     ÞETTA ER SAMA LEXIA OG BOKUDU TOLURNAR I DAG: vaenting sem hangir a
     tolu ur skra sem breytist daglega er ekki fullyrding, hun er
     tilviljun sem bidur.

     Nu er verndin reiknud med — sama regla og `fixedSlotNeeds` beitir:
     stada sem er I NAKVAEMLEGA rettum fjolda fyrir fost saeti ma ekki
     missa mann. */
  const fixedNeed = {};
  for (const sl of slotsFor(LEAGUE)) {
    if (Array.isArray(sl.pos) && sl.pos.length === 1)
      fixedNeed[sl.pos[0]] = (fixedNeed[sl.pos[0]] || 0) + 1;
  }
  const have = {};
  for (const m of w.mine) if (m && m.pos) have[m.pos] = (have[m.pos] || 0) + 1;
  const droppable = w.mine.filter((m) => RANKED.includes(m.pos) && m.vbd != null &&
    (have[m.pos] || 0) > (fixedNeed[m.pos] || 0));
  ok(droppable.length > 0,
    `einhver ma fara (${droppable.length} af ${w.mine.length}) — ` +
    "annars vaeri fullyrdingin nedan tom");
  const cheapest = droppable.sort((a, b) => a.vbd - b.vbd)[0];
  ok(weakAdvice[0].drop.id === cheapest.id,
    `sa sem fer ut er ODYRASTI (${weakAdvice[0].drop.name} ${weakAdvice[0].drop.vbd}, ` +
    `vaenti ${cheapest.name} ${cheapest.vbd})`);

  /* RODUNIN: `gain` verdur ad vera EINRAENT FALLANDI. Vaeri hun ekki
     thad les listinn eins og "besta fyrst" en er thad ekki. */
  let mono = true, positive = true;
  for (let i = 0; i + 1 < weakAdvice.length; i++) {
    if (weakAdvice[i].gain < weakAdvice[i + 1].gain - 1e-9) mono = false;
  }
  for (const a of weakAdvice) {
    if (!(a.gain > 0) || a.gain < WAIVER_CAL.minGain.value) positive = false;
  }
  ok(mono, `gain er einraent fallandi yfir allar ${weakAdvice.length} rodir`);
  ok(positive, "og hvert gain er jakvaett OG yfir golfinu");

  /* Hver rod verdur ad bera ROKIN. Radgjof sem ekki er haegt ad vera
     osammala er hunsuð, ekki notud. */
  ok(weakAdvice.every((a) => Array.isArray(a.why) && a.why.length > 0 &&
        a.why.every((x) => x && typeof x.kind === "string" && typeof x.text === "string" &&
                           x.text.length > 8)),
    "hver rod ber `why` med kind+text");
  ok(weakAdvice.every((a) => a.why.some((x) => x.kind === "gain")),
    "og abatinn er alltaf rokstuddur i mannamali");

  /* HVER ROD ER SJALFSTAETT SKIPTI — OG THAD ER SAGT ADEINS THEGAR THAD
     ER SATT. 279 rodir nefna sama mann ut, svo vidvorunin verdur ad
     vera thar; EIN rod nefnir engan tvisvar, og tha vaeri hun osonn.
     Vidvorun sem er stundum osonn er verri en engin. */
  const shared = (list) => list.flatMap((a) =>
    a.why.filter((x) => /standalone swap/.test(x.text)));
  ok(shared(weakAdvice).length > 0,
    `margar rodir deila manni ut -> vidvorunin er thar (${shared(weakAdvice).length})`);
  const single = pickupAdvice({ pool: [bestFree], mine: w.mine, league: LEAGUE });
  ok(single.length === 1, `forsendan: ein tillaga (${single.length})`);
  ok(shared(single).length === 0, "ein rod deilir engum manni -> engin slik vidvorun");

  /* STODUTHORF MA NEFNAST — EN HUN VERDUR AD VERA MERKT. Strengur i
     dalki sem heitir "Why" les eins og hann hafi radid. */
  const needTexts = weakAdvice.flatMap((a) => a.why.filter((x) => x.kind === "need"));
  ok(needTexts.length > 0, `stoduthorf er nefnd (${needTexts.length} rodir)`);
  ok(needTexts.every((x) => /noted, not ranked/.test(x.text)),
    "og HVER slik lina er merkt \"noted, not ranked\"");

  /* Og hun ma EKKI hafa hreyft rodina: sama laug an `starters` gefur
     nakvaemlega somu rod. */
  const noStarters = pickupAdvice({ pool: w.pool, mine: w.mine, week: 3,
    league: { ...LEAGUE, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 } } });
  ok(String(weakAdvice.map((a) => a.add.id)) === String(noStarters.map((a) => a.add.id)),
    "rodin er ohoggud af thorf (sama rod i baðum kollum)");
}

/* ============================================================
   6. MEIDDIR — EKKI DROPPA `Out` OG TAKA ANNAN `Out`
   ============================================================
   BADAR ATTIR, thvi "radleggur aldrei manninn" er jafn gagnslaust og
   "radleggur alltaf": sami madur med tiltaekileika 1 VERDUR ad birtast.  */
console.log("\n6. meiddir");
{
  const w = freeAgents({ rows, rosters: WEAK_ROSTERS, myRosterId: 1 });
  const best = w.pool.filter((p) => RANKED.includes(p.pos) && p.vbd != null)
                     .sort((a, b) => b.vbd - a.vbd)[0];

  /* Forsendan: heilbrigdur er hann radlagdur. */
  const healthy = pickupAdvice({ pool: w.pool, mine: w.mine, league: LEAGUE });
  ok(healthy.some((a) => a.add.id === best.id),
    `forsendan: ${best.name} er radlagdur thegar hann er heill`);

  /* Sami madur, nu `Out`, OG hopurinn minn allur `Out` — nakvaemlega
     tilfellid sem ma ekki gefa skipti. */
  const poolOut = w.pool.map((p) => (p.id === best.id ? { ...p, injury: "Out", avail: 0 } : p));
  const mineOut = w.mine.map((m) => ({ ...m, injury: "Out", avail: 0 }));
  const outAdvice = pickupAdvice({ pool: poolOut, mine: mineOut, league: LEAGUE });
  ok(!outAdvice.some((a) => a.add.id === best.id),
    `${best.name} er EKKI radlagdur thegar hann er Out (og eg lika)`);
  ok(outAdvice.every((a) => a.add.avail > 0),
    `enginn radlagdur madur er ospilandi (${outAdvice.length} rodir)`);

  /* Og `Out` hja MER er raunveruleg upplysing um hvad skiptin kosta —
     hun ma sjast, en hun ma ekki vera thogul. MEIDDI MADURINN ER
     ODYRASTI, svo hann VERDUR sa sem tillagan tekur ut; vaeri hann
     valinn af handahofi gaeti fullyrdingin ekki brugdist. */
  const cheapMine = w.mine.filter((m) => RANKED.includes(m.pos) && m.vbd != null)
                          .sort((a, b) => a.vbd - b.vbd)[0];
  const oneOut = w.mine.map((m) => (m.id === cheapMine.id
    ? { ...m, injury: "Out", avail: 0 } : m));
  const oneAdvice = pickupAdvice({ pool: w.pool, mine: oneOut, league: LEAGUE });
  ok(oneAdvice.length > 0, "meiddur madur hja mer stoppar ekki radgjofina");
  const named = oneAdvice.filter((a) => a.drop.id === cheapMine.id);
  ok(named.length > 0, `forsendan: ${cheapMine.name} er sa sem tillagan tekur ut ` +
    `(${named.length} rodir)`);
  ok(named.every((a) => a.why.some((x) => x.kind === "injury" &&
        x.text.includes(cheapMine.name))),
    "og thad er sagt BERUM ORDUM ad hann se ur leik");

  /* Questionable er ekki Out — hann ma radleggjast, en `confident`
     ma ekki vera satt, thvi timabils-talan ofmetur hann tha. */
  const q = w.pool.map((p) => (p.id === best.id
    ? { ...p, injury: "Questionable", avail: 0.75 } : p));
  const qAdvice = pickupAdvice({ pool: q, mine: w.mine, league: LEAGUE });
  const qRow = qAdvice.find((a) => a.add.id === best.id);
  ok(qRow && qRow.confident === false,
    "Questionable er radlagdur EN ekki merktur `confident`");
  ok(qRow && qRow.why.some((x) => x.kind === "caution" && /availability/.test(x.text)),
    "og astaedan er sogd");
}

/* ============================================================
   7. RETTLEIKS-GOLFID — SKIPTI MA EKKI GERA BYRJUNARLIDID OFYLLANLEGT
   ============================================================
   ÞETTA ER EKKI RODUN OG THAD ER EKKI STODUTHORF. Ein byrjunarlids-QB
   ber VBD ~ -290 i 10-lida deild (varamanns-threpid er QB10), svo hann
   er ALLTAF odyrasti madurinn a hopnum a hreinni VBD-tolu. An golfsins
   myndi radgjofin thvi segja "droppadu eina leikstjornandanum thinum"
   fyrir hvern einasta mottakara sem er laus — og notandinn saeti med
   tomt QB-saeti alla vikuna.

   BADAR ATTIR: QB-inn er VARINN gegn WR-tillogu, en hann MA fara i
   skiptum fyrir betri QB. Golf sem verndar alltaf vaeri jafn slaemt.  */
console.log("\n7. byrjunarlidid verdur ad vera fyllanlegt");
{
  /* Lagmarkshopur ur RAUNVERULEGUM rodum: einn af hverju. */
  const pick = (pos, i) => ranked.filter((r) => r.pos === pos)[i];
  const mine = [pick("QB", 30), pick("RB", 60), pick("RB", 61),
                pick("WR", 80), pick("WR", 81), pick("TE", 30), kicker, dst];
  const mineIds = new Set(mine.map((m) => String(m.id)));
  const pool = rows.filter((r) => !mineIds.has(String(r.id)));

  const worstQb = mine.filter((m) => m.pos === "QB")
                      .sort((a, b) => a.vbd - b.vbd)[0];
  const cheapest = mine.filter((m) => RANKED.includes(m.pos) && m.vbd != null)
                       .sort((a, b) => a.vbd - b.vbd)[0];
  ok(cheapest.pos === "QB",
    `forsendan: odyrasti madurinn a HREINU VBD er leikstjornandinn ` +
    `(${cheapest.name}, ${cheapest.vbd})`);
  ok(mine.filter((m) => m.pos === "QB").length === 1, "og eg a adeins einn");

  const out = pickupAdvice({ pool, mine, league: LEAGUE });
  ok(out.length > 0, `radgjof berst (${out.length} rodir)`);
  const badRows = out.filter((a) => a.add.pos !== "QB" && a.drop.pos === "QB");
  ok(badRows.length === 0,
    `enginn radleggur ad droppa eina QB-inum fyrir adra stodu ` +
    `(${badRows.length} slikar${badRows.length ? `, t.d. ${badRows[0].add.name}` : ""})`);

  /* OG HANN MA FARA I SKIPTUM FYRIR BETRI QB — annars vaeri golfid
     ad frysta stodu sem er einmitt su sem tharf ad batna. */
  const qbUp = out.filter((a) => a.add.pos === "QB" && a.drop.pos === "QB");
  ok(qbUp.length > 0, `QB-uppfaersla er leyfd (${qbUp.length} rodir)`);
  ok(qbUp.every((a) => a.drop.id === worstQb.id),
    "og hun tekur RETTA QB-inn ut");

  /* Golfid VARDVEITIR, thad KREFST ekki: hopur sem er thegar an TE
     ma samt fa rad. Vaeri thad krafa faeri halfur hopur engin rad. */
  const noTe = mine.filter((m) => m.pos !== "TE");
  const outNoTe = pickupAdvice({ pool, mine: noTe, league: LEAGUE });
  ok(outNoTe.length > 0,
    `hopur an TE faer samt rad (${outNoTe.length}) — golfid vardveitir, krefst ekki`);
}

/* ============================================================
   8. GOLFID Á ABATA OG `confident`
   ============================================================
   `minGain` ER OMAELD TALA og hun er merkt sem slik i `WAIVER_CAL`.
   Prófid ver TVENNT: ad hun se raunverulega notud (haerra golf gefur
   faerri rodir) og ad hun se merkt omaeld. Vaeri hun merkt maeld vaeri
   thad omaeld tala sem litur ut eins og maeling — versta utkoman.     */
console.log("\n8. golfid og `confident`");
{
  const w = freeAgents({ rows, rosters: WEAK_ROSTERS, myRosterId: 1 });
  const base = pickupAdvice({ pool: w.pool, mine: w.mine, league: LEAGUE });
  const high = pickupAdvice({ pool: w.pool, mine: w.mine, league: LEAGUE, minGain: 1e6 });
  const low = pickupAdvice({ pool: w.pool, mine: w.mine, league: LEAGUE, minGain: 0 });
  ok(high.length === 0, `oendanlegt golf gefur ekkert (${high.length})`);
  ok(low.length >= base.length, `golf 0 gefur ad minnsta kosti eins mikid ` +
    `(${low.length} >= ${base.length})`);
  ok(base.every((a) => a.gain >= WAIVER_CAL.minGain.value),
    "sjalfgefna golfid er raunverulega virt");

  /* Ruslsvar i golfinu ma EKKI verda 0 — `Number("abc") >= x` er false,
     svo 0-bakfall hefdi hleypt hverju skipti i gegn. */
  const junk = pickupAdvice({ pool: w.pool, mine: w.mine, league: LEAGUE, minGain: "abc" });
  ok(junk.length === base.length, `rusl i minGain fellur i sjalfgefna golfid ` +
    `(${junk.length} = ${base.length})`);

  /* `confident` ER EKKI LIKINDATALA. Hun er sonn adeins thegar hvert
     inntak er eitt af theim maeldu — thar med ad madurinn se OFAN VID
     varamanns-threp deildarinnar (vbd > 0). Badar attir. */
  const yes = base.filter((a) => a.confident);
  const no = base.filter((a) => !a.confident);
  ok(yes.length > 0 && no.length > 0,
    `bædi confident (${yes.length}) og ekki (${no.length}) — flaggid er ekki fast`);
  ok(yes.every((a) => a.add.vbd > 0 && a.add.avail === 1),
    "confident krefst thess ad hann se ofan vid varamanns-threp OG heill");
  ok(no.every((a) => a.why.some((x) => x.kind === "caution")),
    "og hver rod sem er ekki confident segir hvers vegna");
  const below = no.find((a) => a.add.vbd <= 0);
  ok(below && below.why.some((x) => /replacement level/.test(x.text)),
    "bekkjar-dypt er kolluð thad sem hun er");

  /* Vikan raedur ENGU. Sami hopur i annarri viku gefur SOMU rod —
     auðar vikur eru maeldar (10/10 vogum jakvaedar en 8/12 ar og
     vikmorkin innihalda null), svo thaer SJAST og RADA ENGU. */
  /* VIKA 11 ER VALIN AF ASTAEDU: 90 leikmenn a bordinu eru i frii tha,
     svo `why`-linurnar VERDA til. Vaeri vika 3 notud (engin auð vika i
     NFL) yrdu thaer 0 og fullyrdingin gaeti ekki brugdist — nakvaemlega
     tóma fullyrdingin sem CLAUDE.md kafli 5b varar vid. */
  const w11 = pickupAdvice({ pool: w.pool, mine: w.mine, league: LEAGUE, week: 11 });
  const w7 = pickupAdvice({ pool: w.pool, mine: w.mine, league: LEAGUE, week: 7 });
  ok(String(w11.map((a) => a.add.id)) === String(w7.map((a) => a.add.id)),
    "vika 11 og vika 7 gefa NAKVAEMLEGA somu rod");
  const byeRows = w11.flatMap((a) => a.why.filter((x) => x.kind === "bye"));
  ok(byeRows.length > 0, `forsendan: auðar vikur eru nefndar i viku 11 (${byeRows.length})`);
  ok(byeRows.every((x) => /noted, not ranked/.test(x.text)),
    "og HVER slik lina er merkt \"noted, not ranked\"");
  ok(w11.filter((a) => a.why.some((x) => x.kind === "bye")).every((a) =>
       num(a.add.bye) === 11 || num(a.drop.bye) === 11),
    "og hun er adeins nefnd a theim sem raunverulega eru i frii");
  ok(String(base.map((a) => a.add.id)) === String(w11.map((a) => a.add.id)),
    "og engin vika gefur lika somu rod — vikan raedur ENGU");
}

/* ============================================================
   8b. `confidence.value` VERDUR AD VERA THAD SEM FALLID PROFAR
   ============================================================
   Svidid sagdi:

     "gain >= minGain AND vbd > 0 AND projection is Sleeper's own AND
      availability 1"

   og FYRSTI LIDURINN ER EKKI I `confidenceOf`. Hann getur ekki verid thar:
   `pickupAdvice` siar eftir golfinu ADUR en rod verdur til, svo hver rod
   sem kemst thangad hefur THEGAR stadid thad — "skilyrdi sem getur ekki
   brugdist er ekki skilyrdi", eins og athugasemdin i fallinu segir.

   ÞETTA VAR EKKI BARA ATHUGASEMD Á VILLIGOTUM. Sama ranga orsok stod a
   SKJANUM: fotnotan i `Dashboard.jsx` sagdi ad rodir sem eru ekki graenar
   hvili ad hluta a golfinu, sem er osatt um hverja einustu birta rod.

   Prof sem ADEINS les `value` (kafli 11 gerdi thad — hann krefst thess ad
   svidid se til og ekki tomt) getur ekki sed thennan mun. Þess vegna er
   strengurinn hér borinn vid FALLID SJALFT i tvennu lagi:
     (a) FJOLDI skilyrda: `reasons.push` i `confidenceOf` a moti " AND "-
         lidum i `value`. Nyr lidur a odrum stad fellir thetta.
     (b) HEGDUN per skilyrdi: rod sem fellur a NAKVAEMLEGA einu skilyrdi
         verdur ad missa `confident` og NEFNA thad.
   Og loks ad golfid raedur ENGU um flaggið — `confident` er obreytt hvort
   golfid er 0 eda 45, thott rodirnar seu ekki thaer somu.               */
console.log("\n8b. `confidence.value` gegn `confidenceOf`");
{
  /* --- (a) FJOLDINN, LESINN UR SKRANNI ---
     Athugasemdir eru STRIPPADAR fyrst. An thess hefdi `grep` fundid
     ordin i athugasemdinni sem NEFNIR golfid ("Golfid a abatanum er ekki
     profad her") og fullyrdingin "fallid nefnir ekki golfid" hefdi verid
     ósatt af ástæðu sem er akkurat andstæð merkingunni. Sama mynstur og
     kafli 5 i `wiring.mjs`. */
  const raw = readFileSync(path.join(DATA, "..", "src", "waivers.js"), "utf8");
  const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  const fnMatch = /function confidenceOf\(a\)\s*\{[\s\S]*?\n\}/.exec(stripped);
  ok(!!fnMatch, "`confidenceOf` finnst i skranni");
  const fn = fnMatch ? fnMatch[0] : "";
  /* MAELITAEKID SJALFT: hafi regexid gripid tomt (eda alla skrana) er
     talningin nedan einskis virdi. */
  ok(fn.length > 200 && fn.length < 2000,
    `og thad er raunverulegt fall-lik, ekki tomt ne oll skrain (${fn.length} stafir)`);

  const pushes = (fn.match(/reasons\.push\(/g) || []).length;
  const claimed = String(WAIVER_CAL.confidence.value).split(/\s+AND\s+/);
  ok(pushes === 3, `fallid ber ${pushes} skilyrdi (reasons.push)`);
  ok(claimed.length === pushes,
    `og \`confidence.value\` telur upp NAKVAEMLEGA thau somu ` +
    `(${claimed.length} lidir a moti ${pushes} skilyrdum)`);
  ok(!/minGain|floor|gain/.test(fn),
    "og fallid nefnir hvorki `minGain`, golf ne `gain` — thad profar thau EKKI");
  ok(!/minGain|gain >=/.test(String(WAIVER_CAL.confidence.value)),
    `svo gildid ma ekki heldur gera thad ("${WAIVER_CAL.confidence.value}")`);
  ok(/vbd/.test(claimed[0]) && /Sleeper/.test(claimed[1]) &&
     /availability/.test(claimed[2]),
    "og lidirnir eru thrir sem fallid raunverulega profar (vbd · Sleeper · availability)");

  /* --- (b) HEGDUN PER SKILYRDI ---
     Tilbunar rodir eru RETTA verkfaerid hér OG hvergi annars i thessu
     safni: raunlaugin (kafli 8) getur ekki gefid mann sem fellur a
     NAKVAEMLEGA einu skilyrdi. Allir eru RB svo stodu-verndin hleypi
     hverju skipti i gegn, og `drop` ber vbd -50 svo abatinn se rifligur. */
  const mineSyn = [{ id: "m1", name: "Droppa", pos: "RB", team: "SF", vbd: -50,
                     proj: 40, avail: 1 }];
  const mk = (id, over) => ({ id, name: id, pos: "RB", team: "KC", vbd: 40,
                              proj: 200, avail: 1, ...over });
  const poolSyn = [
    mk("clean"),
    mk("below", { vbd: -1 }),                       // undir varamanns-threpi
    mk("fallback", { projFallback: true }),         // ESPN-bakfall
    mk("hurt", { avail: 0.75, injury: "Questionable" }),
    mk("thin", { vbd: -45 }),                       // abati 5 — UNDIR golfinu
  ];
  const byId = (list) => new Map(list.map((r) => [String(r.add.id), r]));

  const advDefault = pickupAdvice({ pool: poolSyn, mine: mineSyn, league: LEAGUE });
  const d = byId(advDefault);
  ok(d.get("clean") && d.get("clean").confident === true,
    "rod sem stendur oll thrju skilyrdin ER `confident` (annars maeldi " +
    "hitt ekkert)");
  for (const [id, needle] of [["below", /replacement level/],
                              ["fallback", /ESPN fallback/],
                              ["hurt", /availability/]]) {
    const r = d.get(id);
    ok(!!r, `rod "${id}" er til`);
    ok(r && r.confident === false, `"${id}" fellur a sinu skilyrdi -> ekki confident`);
    ok(r && r.why.some((w) => w.kind === "caution" && needle.test(w.text)),
      `og astaedan er NEFND i \`why\` (${needle})`);
  }

  /* --- (c) GOLFID SIAR, EN THAD RAEDUR ENGU UM `confident` ---
     Þetta er fullyrdingin sem fotnotan a skjanum hvilir a: HVER birt rod
     hefur thegar stadid golfid, svo golfid getur ekki verid astaedan
     fyrir thvi ad hun se utan graena flokksins.                        */
  const lo = pickupAdvice({ pool: poolSyn, mine: mineSyn, league: LEAGUE, minGain: 0 });
  const hi = pickupAdvice({ pool: poolSyn, mine: mineSyn, league: LEAGUE, minGain: 45 });
  ok(lo.every((r) => r.gain >= 0) && advDefault.every((r) => r.gain >= WAIVER_CAL.minGain.value) &&
     hi.every((r) => r.gain >= 45),
    "hver BIRT rod hefur thegar stadid sitt golf (0 · " +
    `${WAIVER_CAL.minGain.value} · 45)`);
  ok(byId(lo).has("thin") && !d.has("thin"),
    "og golfid siar raunverulega (abati 5 sest vid golf 0, ekki vid 10)");
  const loM = byId(lo), hiM = byId(hi);
  const shared = [...hiM.keys()].filter((k) => loM.has(k));
  ok(shared.length >= 3, `${shared.length} rodir eru i badum keyrslum`);
  ok(shared.every((k) => loM.get(k).confident === hiM.get(k).confident),
    "og `confident` er NAKVAEMLEGA obreytt milli golfa — golfid er ekki " +
    "skilyrdi i henni");
}

/* ============================================================
   9. ENGIN `NaN`, ENGIN `undefined`, VID NEINU INNTAKI
   ============================================================
   SKANNAD ER THAD SEM SKRAIN BYR TIL, ekki laugin: `pool` og `mine`
   bera SOMU RADA-HLUTI og inntakid (sannad i kafla 2), og raunverulegar
   rodir bera `undefined` a `projSpread`, `exp` og `depth`. Alsherjar-
   skonnun a theim myndi thvi fella profid af astaedu sem hefur ekkert
   med waiver ad gera — og verra: hun myndi thvinga skrana til ad AFRITA
   rodirnar, sem er einmitt thad sem kafli 2 bannar.

   `JSON.stringify` DUGAR EKKI TIL AD FINNA `undefined` — hann SLEPPIR
   theim reitum thogult. Thess vegna er gengid um trėð.                */
console.log("\n9. engin NaN, engin undefined");
{
  const bad = [];
  const walk = (v, p) => {
    if (v === undefined) { bad.push(`${p} === undefined`); return; }
    if (typeof v === "number" && !Number.isFinite(v)) { bad.push(`${p} === ${v}`); return; }
    if (typeof v === "string" && /\b(NaN|undefined)\b/.test(v)) bad.push(`${p} ber "${v}"`);
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === "object") {
      for (const k of Object.keys(v)) walk(v[k], `${p}.${k}`);
    }
  };

  const worlds = [
    ["sterkur", STRONG_ROSTERS, 1, 3],
    ["veikur", WEAK_ROSTERS, 1, 9],
    ["othekkt saeti", STRONG_ROSTERS, 99, null],
    ["tomir hopar", [{ roster_id: 1, players: null }], 1, 1],
    ["olesanlegt", [{ roster_id: 1, players: "abc" }], 1, 1],
    ["engir hopar", null, 1, 1],
    ["rusl", [{}, { roster_id: 1, players: [null, "", 4046] }], 1, 22],
  ];
  for (const [label, rosters, id, week] of worlds) {
    for (const rws of [rows, [], "abc"]) {
      for (const lg of [LEAGUE, {}, null, { teams: "abc", starters: "x" }]) {
        let crashed = null, fa = null, adv = null;
        try {
          fa = freeAgents({ rows: rws, rosters, myRosterId: id });
          adv = pickupAdvice({ pool: fa.pool, mine: fa.mine, league: lg, week,
                               minGain: "abc" });
        } catch (e) { crashed = String(e.message || e); }
        ok(!crashed, `${label} / ${Array.isArray(rws) ? rws.length : "rusl"} rodir / ` +
          `${JSON.stringify(lg) ? JSON.stringify(lg).slice(0, 18) : "null"}: ekkert hrun` +
          `${crashed ? ` — ${crashed}` : ""}`);
        if (crashed) continue;
        /* Skalar-svidin ur `freeAgents` (ekki radirnar sjalfar). */
        walk({ ...fa, pool: fa.pool ? fa.pool.length : null,
                      mine: fa.mine ? fa.mine.length : null }, `${label}.fa`);
        walk(adv, `${label}.adv`);
      }
    }
  }
  ok(bad.length === 0, `ekkert NaN/undefined i utkomunni (${bad.slice(0, 3).join(", ")})`);

  /* Og fullyrdingin ma ekki vera tom: hun VERDUR ad hafa skodad tolur. */
  const w = freeAgents({ rows, rosters: WEAK_ROSTERS, myRosterId: 1 });
  const adv = pickupAdvice({ pool: w.pool, mine: w.mine, league: LEAGUE, week: 5 });
  ok(adv.length > 5, `forsendan: skonnunin hafdi raunverulega tolur ad skoda (${adv.length})`);
  ok(adv.every((a) => Number.isFinite(a.gain) && Number.isFinite(a.add.vbd) &&
                      Number.isFinite(a.drop.vbd) && typeof a.confident === "boolean"),
    "hver rod ber tolur, ekki tomt");
}

/* ============================================================
   10. K OG DST ERU UTAN RODUNAR — AF MAELDRI ASTAEDU
   ============================================================
   Their voru sleppt i HVERRI hermun sem stadfestir VBD-rodina
   (`excludePos` i `accuracy.js`), og VBD theirra verðleggur DST1 um
   val 77 — sem enginn draftar. Ad verdleggja spyrnu-skipti vaeri
   omaeld tala vid hlidina a maeldum.                                */
console.log("\n10. K og DST eru utan rodunar");
{
  const mine = [ranked.filter((r) => r.pos === "QB")[40],
                ...ranked.filter((r) => r.pos === "RB").slice(60, 62),
                ...ranked.filter((r) => r.pos === "WR").slice(80, 82),
                ranked.filter((r) => r.pos === "TE")[30], kicker, dst];
  const mineIds = new Set(mine.map((m) => String(m.id)));
  const pool = rows.filter((r) => !mineIds.has(String(r.id)));
  const out = pickupAdvice({ pool, mine, league: LEAGUE });
  ok(out.length > 0, `radgjof berst (${out.length})`);
  ok(out.every((a) => RANKED.includes(a.add.pos)),
    "engin K/DST er RADLOGÐ inn");
  ok(out.every((a) => RANKED.includes(a.drop.pos)),
    "og engin K/DST er verdlogd sem skiptimynt");
  ok(String(WAIVER_CAL.rankedPos.value) === "QB,RB,WR,TE",
    "og listinn er sa sami sem hermunin notadi");

  /* Their eru samt SYNIR i lauginni — thad er birting, ekki rodun. */
  const fa = freeAgents({ rows, rosters: world(mine, ranked.slice(200, 300)), myRosterId: 1 });
  ok(fa.pool.some((p) => p.pos === "K") && fa.pool.some((p) => p.pos === "DST"),
    "en lausir spyrnumenn og varnir SJAST i lauginni");
}

/* ============================================================
   10b. STADU-ORÐAFORÐINN SJALFUR — `normPos` VAR OPROFADUR
   ============================================================
   `RANKED_POS` ber sig vid `r.pos`, og hvert `pos` a bordinu er skrifad
   af pipeline-inu gegnum `normPos` i `src/scoring.js`. Vorpunin var samt
   ALGJORLEGA oprofud: hun er flutt inn i tiu pipeline-skriftur og engin
   fullyrding i neinu safni snerti hana.

   Þad kom i ljos vid ad fjarlaegja `return FANTASY_POS.includes(s) ? s : s`
   — daudan skilyrdis-lid thar sem BADAR greinar eru sama gildid.
   Fjarlaegingin sjalf er byte-jafngild, en spurningin sem hun opnar er
   ekki: liturinn litur ut fyrir ad hafa aetlað ad vera `: null`, og
   stokkbreytingin `: null` **LIFDI OLL 22 SOFNIN**. Vorpun sem 26 kollum
   i pipeline-inu byggja a hafdi thvi ekkert net undir sér.

   HVERS VEGNA HÉR: `scoring.js` hefur ekkert eigid safn (adeins
   `audit.mjs` flytur `offensePoints` inn, i odru skyni), og
   stadu-orðaforðinn er nakvaemlega thad sem thetta safn ber sig vid i
   kafla 10. Faedist safn fyrir `scoring.js` a thetta ad flytjast thangad.

   `: null` VAERI RAUNVERULEG VILLA, ekki bara onnur skodun:
   `nflverse.depth()` skrifar `pos: normPos(r.position) ||
   normPos(r.depth_position)` og heldur rodinni ADEINS ef `pos` er satt,
   svo allur varnar-hluti djupt-listans hefdi horfid THEGJANDI.         */
console.log("\n10b. `normPos` — orðaforðinn sem rodunin ber sig vid");
{
  const { normPos, FANTASY_POS } = await import("../src/scoring.js");

  /* Þau sem VORPUNIN A ad breyta — annars vaeri hun ekki til. */
  for (const [inp, want] of [["DEF", "DST"], ["D/ST", "DST"], ["dst", "DST"],
                             ["PK", "K"], ["FB", "RB"], ["fb", "RB"]]) {
    ok(normPos(inp) === want, `"${inp}" -> "${want}"`);
  }
  /* Og thau sem hun a ad LATA I FRIDI. */
  for (const p of FANTASY_POS) {
    ok(normPos(p.toLowerCase()) === p, `"${p.toLowerCase()}" -> "${p}"`);
  }

  /* NULL ER "EKKERT VAR GEFID" OG ÞAD ER EINA TILFELLID. */
  for (const v of [null, undefined, "", 0, false]) {
    ok(normPos(v) === null, `${JSON.stringify(v)} -> null (ekkert var gefid)`);
  }

  /* ÞETTA ER PROFSTEINNINN: staða utan fantasy fer OBREYTT ut, hun er
     EKKI thogguð i `null`. Þad er `depth()`-tilfellid ofan, og thad er
     stokkbreytingin sem lifdi oll 22 sofnin. */
  for (const p of ["LB", "CB", "OT", "P", "DE"]) {
    ok(normPos(p) === p,
      `"${p}" fer OBREYTT ut (\`: null\` felur varnar-rodir djupt-listans)`);
    ok(!FANTASY_POS.includes(normPos(p)),
      `og hun er samt EKKI fantasy-stada — sian tilheyrir kallandanum`);
  }
  /* Og adgreiningin sjalf: "gefid en ekki fantasy" a moti "ekkert gefid". */
  ok(normPos("LB") !== normPos(null),
    "\"gefid en ekki fantasy\" og \"ekkert gefid\" eru SITTHVAD");

  /* Loks: engin FANTASY_POS-stada ma hverfa — thad er forsendan fyrir thvi
     ad rodunin i kafla 10 finni nokkurn mann. */
  ok(FANTASY_POS.every((p) => normPos(p) === p),
    `allar ${FANTASY_POS.length} fantasy-stodur lifa vorpunina`);
  ok(RANKED.every((p) => normPos(p) === p),
    "og thar med hver stada sem `rankedPos` radar");
}

/* ============================================================
   11. KVORDUNIN SEGIR SJALF HVAD ER MAELT
   ============================================================
   Talan sem er VALIN og talan sem er MAELD lita nakvaemlega eins ut i
   kodanum. Thess vegna ber hver rod `measured` og `note`, og thess
   vegna fellur thetta prof ef `minGain` er merkt maeld.              */
console.log("\n11. WAIVER_CAL");
{
  const keys = Object.keys(WAIVER_CAL);
  ok(keys.length >= 4, `${keys.length} kvordunar-rodir skjaladar`);
  for (const k of keys) {
    const e = WAIVER_CAL[k];
    ok(e && typeof e.measured === "boolean", `${k}: ber \`measured\``);
    ok(e && typeof e.note === "string" && e.note.length >= 40,
      `${k}: ber notu (${e && e.note ? e.note.length : 0} stafir)`);
    ok(e && e.value != null, `${k}: ber gildi`);
  }
  ok(WAIVER_CAL.minGain.measured === false,
    "`minGain` er MERKT OMAELD — hun er varfaerid golf, ekki maeling");
  ok(/NOT MEASURED/.test(WAIVER_CAL.minGain.note),
    "og notan segir thad berum ordum");
  ok(WAIVER_CAL.confidence.measured === false,
    "`confident` er ekki likindatala og er merkt omaeld");
  ok(WAIVER_CAL.currency.measured === true && WAIVER_CAL.rankedPos.measured === true,
    "gjaldmidillinn (VBD) og stodulistinn ERU maeld");
  ok(typeof WAIVER_CAL.minGain.value === "number" && WAIVER_CAL.minGain.value > 0,
    `golfid er tala > 0 (${WAIVER_CAL.minGain.value})`);
}

/* ============================================================
   11b. „VANTAR" SEM ER KOMID — NOTAN OG README VERDA AD VERA SAMHLJODA
   ============================================================
   `WAIVER_CAL.currency.note` og README (4e og 4g) segja BADIR fra sömu
   pipulogn: `data.js` -> `loadWeekly(season)`. Notan var UPPFAERD thegar
   hun var skrifud; README var thad EKKI og sagdi a TVEIMUR stodum
   "`data.js` ber engan `loadWeekly`" eftir ad hann var til.

   UREL "VANTAR" ER DYRARI EN UREL "KOMID": naesta lota les skjalid, byrjar
   a ad byggja thad sem er thegar til, og finnur thad ekki fyrr en hun er
   halfnud. Þess vegna er thetta vordur og ekki bara lagfaering — hann ber
   BADAR fullyrdingarnar vid SKRANA sjalfa, svo hvorug getur stadnad ein.

   ÞETTA ER ORDALAGS-PROF OG ÞAD ER ASETT: fullyrdingin er sjalf um TEXTA
   (skjal sem lysir kodanum), svo textinn ER hluturinn sem er maeldur. Þad
   er ekki thad sama og prof sem smellir eftir nakvaemu flipa-heiti.     */
console.log("\n11b. notan og README gegn `data.js`");
{
  const dataSrc = readFileSync(path.join(DATA, "..", "src", "data.js"), "utf8");
  const hasLoader = /export const loadWeekly\s*=/.test(dataSrc);
  ok(hasLoader, "forsendan: `data.js` ber raunverulega `loadWeekly`");

  /* Notan i kodanum. */
  ok(/loadWeekly/.test(WAIVER_CAL.currency.note) === hasLoader,
    "`currency.note` nefnir `loadWeekly` — og hann er til");
  ok(!/data\.js (?:has|ber) (?:no|engan)/i.test(WAIVER_CAL.currency.note),
    "og hun segir EKKI ad hann vanti");

  /* README — BADIR stadirnir. */
  const readme = readFileSync(path.join(DATA, "..", "README.md"), "utf8");
  const claims = readme.match(/[^\n]*ber engan `loadWeekly`[^\n]*/g) || [];
  ok(!hasLoader || claims.length === 0,
    `README segir hvergi ad \`loadWeekly\` vanti (${claims.length} slikar linur` +
    `${claims.length ? `: "${claims[0].slice(0, 60)}…"` : ""})`);
  /* OG HUN VERDUR AD NEFNA HANN — annars vaeri fullyrdingin ofan sonn um
     skjal sem thegir um pipulognina alveg. */
  ok(/loadWeekly/.test(readme),
    "en hun NEFNIR hann (annars vaeri krafan ofan tom)");
}

/* ============================================================
   FLEX MA EKKI TELJAST FAST SAETI — OG ÞAD VAR OPROFAD
   ============================================================
   `fixedSlotNeeds` sleppir FLEX viljandi: hann tekur yfirmengi stada,
   svo hann bindur enga EINA stodu. Athugasemdin segir thad — en ekkert
   prof sagdi thad, og stokkbreytingin

     s.pos.length !== 1   ->   !s.pos.length

   LIFDI. Hun laetur FLEX telja sem fast saeti a FYRSTU stodunni i
   `s.pos`, sem i 10-lida 2FLEX-deildinni hans er RB:

     RETT    : { QB: 1, RB: 2, WR: 2, TE: 1 }
     STOKKBR.: { QB: 1, RB: 4, WR: 2, TE: 1 }      <- +2

   ÞAD ER EKKI BIRTINGARVILLA. `cheapestDrop` notar tolurnar til ad
   akveda hvern MA droppa, svo RB-krafan 4 i stad 2 blokkar LOGLEG
   skipti — radgjofin segir tha "thu maetir ekki droppa hann" um mann
   sem ma droppa, og haetir ad birta rettan pickup.

   PROFID BER AFLEIDINGUNA, EKKI FALLID. `fixedSlotNeeds` er ekki flutt
   ut (rett — hun er innri), svo krafan er maeld thar sem hun bitur: hopur
   med NAKVAEMLEGA tveimur RB i 2FLEX-deild verdur ad geta droppat theim
   thridja.                                                            */
console.log("\nFLEX telst ekki fast saeti");
{
  const L = { teams: 10, scoring: "half-ppr",
              starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              flexPos: ["RB", "WR", "TE"], rounds: 15 };

  /* Hopur: 1 QB, 3 RB, 2 WR, 1 TE. Fost saeti kalla a 2 RB, svo THRIDJI
     RB er DROPPANLEGUR. Undir stokkbreytingunni kalla thau a 4 og hann
     er ekki. */
  const mine = [
    { id: "q", name: "Q", pos: "QB", vbd: 40 },
    { id: "r1", name: "R1", pos: "RB", vbd: 60 },
    { id: "r2", name: "R2", pos: "RB", vbd: 50 },
    { id: "r3", name: "R3", pos: "RB", vbd: 1 },     /* odyrasti — a ad falla */
    { id: "w1", name: "W1", pos: "WR", vbd: 55 },
    { id: "w2", name: "W2", pos: "WR", vbd: 45 },
    { id: "t", name: "T", pos: "TE", vbd: 30 },
  ];
  const pool = [{ id: "new", name: "Nyr", pos: "WR", vbd: 70 }];

  const res = pickupAdvice({ pool, mine, league: L, week: 5, minGain: 0 });
  ok(Array.isArray(res) || (res && Array.isArray(res.moves || res.picks)),
    "`pickupAdvice` skilar lista");
  const moves = Array.isArray(res) ? res : (res.moves || res.picks || []);
  ok(moves.length > 0,
    `radgjofin finnur skipti (${moves.length}) — 70 a moti 1 er augljost`);
  if (moves.length) {
    const d = moves[0].drop;
    ok(d && (d.id === "r3"),
      `og hun droppar THRIDJA RB (${d ? d.id + " " + d.name : "ekkert"}) — ` +
      "undir stokkbreytingunni er hann verndadur og skiptin blokkud");
  }

  /* ------------------------------------------------------------
     OG PROFID VERDUR AD GETA BRUGDIST I HINA ATTINA.
     ------------------------------------------------------------
     Vaeri `fixedSlotNeeds` einfaldlega TOM myndi fullyrdingin ofan
     standast lika — hver sem er maetti falla. Krafan er thvi TVIÞAETT:
     thridji RB MA falla, en tveir fyrstu MA EKKI, thvi fost saeti kalla
     a tvo. Þad er sama osamhverfan sem `playerlist-sort.mjs` kenndi.  */
  const thin = [
    { id: "q", name: "Q", pos: "QB", vbd: 40 },
    { id: "r1", name: "R1", pos: "RB", vbd: 2 },
    { id: "r2", name: "R2", pos: "RB", vbd: 3 },
    { id: "w1", name: "W1", pos: "WR", vbd: 55 },
    { id: "w2", name: "W2", pos: "WR", vbd: 45 },
    { id: "t", name: "T", pos: "TE", vbd: 30 },
  ];
  const res2 = pickupAdvice({ pool: [{ id: "n2", name: "N2", pos: "WR", vbd: 90 }],
    mine: thin, league: L, week: 5, minGain: 0 });
  const m2 = Array.isArray(res2) ? res2 : (res2.moves || res2.picks || []);
  const dropped2 = m2.length ? m2[0].drop && m2[0].drop.pos : null;
  ok(dropped2 !== "RB",
    `med ADEINS tveimur RB er hvorugur droppadur (fell: ${dropped2 || "ekkert"}) ` +
    "— fost saeti eru virt, svo fullyrdingin ofan er ekki tom");
}

/* ============================================================
   12. REST-OF-SEASON GJALDMIDILLINN
   ============================================================
   Thrir profsteinar og their eru OLIKIR:

     A. BOKADA TAFLAN VERDUR AD PASSA VID `data/measure/waiver.json`,
        tala fyrir tolu. Thetta er ekki formsatridi: nótan i
        `WAIVER_CAL.currency` bar "+13,2 · t=2,97 · 6 af 7 · CI
        [5,9 · 22,2]" og EKKERT af thvi er i skranni. Labid var
        endurkeyrt og nótan sat eftir, svo tvaer heimildir baðu um sama
        sannleikann og sogdu sitthvad. Vordurinn er talan sjalf.
     B. AN `ros` ER ALLT BAETIS-EINS. Forleikur ma ekki hreyfast.
     C. MED `ros` HREYFIST BAEDI RODIN OG GOLFID — annars vaeri B
        stodust af koda sem hendir `ros` (tom fullyrding, 5b r.2).
   ============================================================ */
console.log("\n12. rest-of-season gjaldmidillinn");
{
  const { ROS_MEASURED, rosCurrency, proRatedFloor, pointsToDate, teamGames } =
    await import("../src/ros.js");
  const LAB = JSON.parse(readFileSync(path.join(DATA, "measure", "waiver.json"), "utf8"));

  /* ---- A. TAFLAN GEGN SKRANNI ---- */
  const pooled = LAB.verdict.currency.pooled;
  const chk = (label, baked, live, keys) => {
    for (const k of keys) {
      ok(baked[k] === live[k],
        `A: ${label}.${k} = ${baked[k]} (skra: ${live[k]})`);
    }
  };
  chk("currency.proRatedFloor", ROS_MEASURED.currency.proRatedFloor,
      { mean: pooled["rosVbdPro-seasonVbd"].mean, t: pooled["rosVbdPro-seasonVbd"].t,
        years: pooled["rosVbdPro-seasonVbd"].years, wins: pooled["rosVbdPro-seasonVbd"].wins,
        lo: pooled["rosVbdPro-seasonVbd"].ci.lo, hi: pooled["rosVbdPro-seasonVbd"].ci.hi },
      ["mean", "t", "years", "wins", "lo", "hi"]);
  chk("currency.absoluteFloor", ROS_MEASURED.currency.absoluteFloor,
      { mean: pooled["rosVbd-seasonVbd"].mean, t: pooled["rosVbd-seasonVbd"].t,
        years: pooled["rosVbd-seasonVbd"].years, wins: pooled["rosVbd-seasonVbd"].wins,
        lo: pooled["rosVbd-seasonVbd"].ci.lo, hi: pooled["rosVbd-seasonVbd"].ci.hi },
      ["mean", "t", "years", "wins", "lo", "hi"]);
  chk("currency.weekVbd", ROS_MEASURED.currency.weekVbd,
      { mean: pooled["weekVbd-seasonVbd"].mean, t: pooled["weekVbd-seasonVbd"].t,
        years: pooled["weekVbd-seasonVbd"].years, wins: pooled["weekVbd-seasonVbd"].wins,
        lo: pooled["weekVbd-seasonVbd"].ci.lo, hi: pooled["weekVbd-seasonVbd"].ci.hi },
      ["mean", "t", "years", "wins", "lo", "hi"]);

  ok(ROS_MEASURED.currency.cells === LAB.verdict.currency.rosCells,
     `A: rosCells ${ROS_MEASURED.currency.cells}`);
  ok(ROS_MEASURED.currency.positiveCells === LAB.verdict.currency.rosPositiveCells,
     `A: rosPositiveCells ${ROS_MEASURED.currency.positiveCells} af ${ROS_MEASURED.currency.cells}`);
  ok(ROS_MEASURED.currency.significantCells === LAB.verdict.currency.rosSignificantCells,
     `A: rosSignificantCells ${ROS_MEASURED.currency.significantCells}`);

  for (const key of ["seasonVbd", "rosVbd", "rosVbdPro"]) {
    const live = LAB.floorCost[`pooled|${key}`];
    const baked = ROS_MEASURED.floorCost[key];
    ok(baked.mean === live.mean && baked.lo === live.ci.lo && baked.hi === live.ci.hi &&
       baked.excludesZero === live.ci.excludesZero,
      `A: floorCost.${key} = ${baked.mean} CI [${baked.lo} · ${baked.hi}]` +
      `${baked.excludesZero ? " MARKT" : ""}`);
  }
  ok(ROS_MEASURED.kPrior === LAB.provenance.params.k.value,
     `A: k = ${ROS_MEASURED.kPrior}`);
  ok(ROS_MEASURED.labWeeks === LAB.provenance.params.weeks.value,
     `A: labs-vikur = ${ROS_MEASURED.labWeeks}`);
  ok(ROS_MEASURED.leagueRuns === LAB.design.leagueRuns,
     `A: ${ROS_MEASURED.leagueRuns} deildar-keyrslur`);

  /* OG NIDURSTADAN SJALF: pro-rata golfid er thad sem er sent, og
     astaedan er ad ALGILDA golfid kostar marktaekt. Fullyrdingin er um
     SKRANA, ekki um bokudu tofluna — annars vaeri hun sjalfsvisun. */
  ok(LAB.floorCost["pooled|rosVbd"].ci.excludesZero === true &&
     LAB.floorCost["pooled|rosVbdPro"].ci.excludesZero === false,
     "A: skrain segir sjalf: ALGILT golf kostar marktaekt, PRO-RATA ekki — thess vegna er pro-rata sent");

  /* Og gamla, ranga talan ma ekki snua aftur i nótuna. */
  const wsrc = readFileSync(path.join(DATA, "..", "src", "waivers.js"), "utf8");
  /* GOMLU TOLURNAR STANDA ENN I NOTUNNI OG THAD ER ASETT — thaer eru
     skjalfestar SEM RANGAR ("this note said ..."), sem er hvernig
     villusaga er geymd hér. Fullyrdingin ma thvi ekki vera "+13,2
     hvergi"; hun vaeri einfaldlega osonn. Hun er i stadinn: nótan ber
     REKTU toluna, og gomlu tolurnar bera merkimidann sem gerir thaer
     sogulegar. */
  ok(/13\.6 points a season/.test(wsrc) && /7 of 7 seasons/.test(wsrc) &&
     /CI \[7\.1, 21\.9\]/.test(wsrc),
     "A: nótan ber toluna sem ER i skranni (+13.6, 7 af 7, CI [7.1, 21.9])");
  ok(/THESE NUMBERS USED TO BE WRONG HERE/.test(wsrc) && /\+13\.2/.test(wsrc),
     "A: og gamla talan er GEYMD sem villusaga, ekki thurrkud ut");
  ok(/floor 0 minus floor 10 = \+7\.1/.test(wsrc) && /\[3\.8, 10\]/.test(wsrc),
     "A: golf-fundurinn ber toluna ur skranni (+7.1, CI [3.8, 10])");

  /* ---- B. AN `ros`: BAETIS-EINS ---- */
  const w = world(WEAK, ranked.slice(15, 150));
  const faW = freeAgents({ rows, rosters: w, myRosterId: 1 });
  const base   = pickupAdvice({ pool: faW.pool, mine: faW.mine, league: LEAGUE, week: 6 });
  const baseU  = pickupAdvice({ pool: faW.pool, mine: faW.mine, league: LEAGUE, week: 6, ros: undefined });
  const baseN  = pickupAdvice({ pool: faW.pool, mine: faW.mine, league: LEAGUE, week: 6, ros: null });
  ok(base.length > 0, `B: ${base.length} tillogur a timabils-VBD (grunnurinn er ekki tomur)`);
  ok(JSON.stringify(base) === JSON.stringify(baseU) &&
     JSON.stringify(base) === JSON.stringify(baseN),
     "B: `ros` undefined/null er BAETIS-EINS vid enga breytu");
  /* Tom laug telst EKKI gjaldmidill — annars felli hun alla ut. */
  const baseEmpty = pickupAdvice({ pool: faW.pool, mine: faW.mine, league: LEAGUE, week: 6,
                                   ros: { vbd: new Map(), priced: 0, weeks: 14 } });
  ok(JSON.stringify(base) === JSON.stringify(baseEmpty),
     "B: tom ROS-laug (`priced: 0`) fellur i timabils-VBD, hun tæmir ekki listann");

  /* ---- C. MED `ros`: LIFANDI ---- */
  const schedule = JSON.parse(readFileSync(path.join(DATA, "schedule.json"), "utf8"));
  const wk2025 = JSON.parse(readFileSync(path.join(DATA, "weekly", "2025.json"), "utf8"));
  const ros = rosCurrency({
    rows, weeklyRows: wk2025, schedule, season: 2025, week: 8,
    lastRegWeek: 14, scoring: "ppr", league: LEAGUE,
  });
  ok(ros != null, "C: gjaldmidill byggdur (2025, vika 8, 14 reglulegar vikur)");
  ok(ros.priced > 100, `C: ${ros.priced} leikmenn verdlagdir a ROS-kvarda`);
  ok(ros.weeksLeft === 7, `C: vikur eftir = ${ros.weeksLeft} (14 - 8 + 1)`);

  const live = pickupAdvice({ pool: faW.pool, mine: faW.mine, league: LEAGUE, week: 8, ros });
  const seasonAt8 = pickupAdvice({ pool: faW.pool, mine: faW.mine, league: LEAGUE, week: 8 });
  ok(JSON.stringify(live) !== JSON.stringify(seasonAt8),
     "C: utkoman er ONNUR en a timabils-VBD — gjaldmidillinn er lifandi");
  const topLive = live.length ? live[0].add.name : null;
  const topSeason = seasonAt8.length ? seasonAt8[0].add.name : null;
  ok(topLive != null, `C: efsta tillagan a ROS er ${topLive} (timabils-VBD: ${topSeason})`);

  /* ---- C2. ROS ER EKKI TIMABILS-VBD I DULARGERVI ----
     `live !== seasonAt8` eitt er VEIK fullyrding og hun SLEPPTI I GEGN
     stokkbreytingu sem tekur varamanns-threpid ur timabils-spanni i
     stad ROS-spanna.

     FYRSTA TILRAUN MIN AD LAGA THAD VAR LIKA TOM, og hun er skrifud hér
     thvi hun er laerdomurinn: eg taldi hve morg SAETI faerast i rodinni
     og krafdist > 50%. Rett kodi gefur 500 af 505 — en stokkbreytingin
     gefur 409, sem stenst lika. Astaedan er ad rodin er full af
     JAFNTEFLUM og saeta-talning maelir tha adallega hvernig jafntefli
     radast, ekki hvort tolurnar seu adrar. MAELIKVARDI SEM ER
     HAVADA-DRIFINN ER EKKI MAELIKVARDI.

     Profsteinninn sem GREINIR thau i sundur er GILDID sjalft: se threpid
     tekid ur timabils-spanni verda ROS-tolurnar BOKSTAFLEGA JAFNAR
     timabils-VBD (maelt: r = 0,9995 og 505 af 505 tolum eins). Se thad
     reiknad upp a nytt ur ROS-spanni er r = 0,893 og engin tala eins. */
  {
    const priced = rows.filter((r) => ros.vbd.has(String(r.id)) && r.vbd != null);
    ok(priced.length > 300, `C2: ${priced.length} leikmenn bera BADAR tolur`);

    let identical = 0;
    for (const r of priced) {
      if (Math.abs(ros.vbd.get(String(r.id)) - r.vbd) < 0.05) identical++;
    }
    const idShare = identical / priced.length;
    ok(idShare < 0.05,
      `C2: ${identical} af ${priced.length} (${(idShare * 100).toFixed(1)}%) bera SOMU tolu og ` +
      "timabils-VBD — vaeri threpid tekid ur timabils-spanni vaeri thetta 100%");

    /* Og fylgnin ma ekki vera ~1: ROS er onnur staerd, ekki skolun. */
    const xs = priced.map((r) => r.vbd);
    const ys = priced.map((r) => ros.vbd.get(String(r.id)));
    const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
    const mx = mean(xs), my = mean(ys);
    let cov = 0, sx = 0, sy = 0;
    for (let i = 0; i < xs.length; i++) {
      cov += (xs[i] - mx) * (ys[i] - my); sx += (xs[i] - mx) ** 2; sy += (ys[i] - my) ** 2;
    }
    const r = cov / Math.sqrt(sx * sy);
    ok(r < 0.98,
      `C2: r(timabils-VBD, ROS-VBD) = ${r.toFixed(3)} — undir 0,98. ` +
      "Stokkbreytingin gefur 0,9995 og fellur hér");
    ok(r > 0.5,
      `C2: en hun er samt sterk (${r.toFixed(3)}) — ROS er sami leikur, ekki nyr havadi`);
  }

  /* ---- D. GOLFID PRO-RATAST, OG THAD ER ADALATRIDID ---- */
  ok(proRatedFloor(10, { week: 1, lastRegWeek: 14 }) === 10,
     "D: vika 1 -> fullt golf (14/14)");
  ok(Math.abs(proRatedFloor(10, { week: 8, lastRegWeek: 14 }) - 10 * 7 / 14) < 1e-9,
     "D: vika 8 -> 5,0 (7 vikur eftir af 14)");
  ok(Math.abs(proRatedFloor(10, { week: 13, lastRegWeek: 14 }) - 10 * 2 / 14) < 1e-9,
     "D: vika 13 -> 1,43 — thad sem gerir verkfaerid ekki thogult i lokin");
  ok(proRatedFloor(10, { week: 20, lastRegWeek: 14 }) === 0,
     "D: eftir reglulegu vikurnar -> 0, aldrei neikvaett golf");
  ok(proRatedFloor(10, { week: null, lastRegWeek: 14 }) === 10,
     "D: an viku -> algilt golf obreytt (engin thogul skolun)");
  /* Og deildarlengdin er LESIN: 15 vikur pro-rata yfir 15, ekki 14. */
  ok(Math.abs(proRatedFloor(10, { week: 8, lastRegWeek: 15 }) - 10 * 8 / 15) < 1e-9,
     "D: 15-vikna deild pro-ratar yfir 15 — lengdin er lesin, ekki labs-fastinn 14");

  /* Golfid er RAUNVERULEGA laegra i seinni vikum -> fleiri tillogur. */
  const rosLate = rosCurrency({ rows, weeklyRows: wk2025, schedule, season: 2025,
                                week: 13, lastRegWeek: 14, scoring: "ppr", league: LEAGUE });
  ok(rosLate != null, "D: gjaldmidill i viku 13");
  const lateGains = pickupAdvice({ pool: faW.pool, mine: faW.mine, league: LEAGUE,
                                   week: 13, ros: rosLate }).map((x) => x.gain);
  ok(lateGains.length === 0 || Math.min(...lateGains) < 10,
     `D: i viku 13 komast tillogur undir 10 i gegn (laegsta ${lateGains.length ? Math.min(...lateGains) : "-"}) ` +
     "— med algildu golfi hefdu thaer allar thagnad");

  /* ---- E. LEKINN OG HLIDIN ---- */
  ok(rosCurrency({ rows, weeklyRows: wk2025, schedule, season: 2025, week: 1,
                   lastRegWeek: 14, scoring: "ppr", league: LEAGUE }) === null,
     "E: vika 1 -> null (engin fyrri vika til ad meta ur)");
  ok(rosCurrency({ rows, weeklyRows: null, schedule, season: 2026, week: 8,
                   lastRegWeek: 14, scoring: "ppr", league: LEAGUE }) === null,
     "E: engin vikuskra (forleikur 2026) -> null");
  ok(rosCurrency({ rows, weeklyRows: wk2025, schedule, season: 2025, week: 8,
                   lastRegWeek: 14, scoring: "superflex", league: LEAGUE }) === null,
     "E: omaeld stigagjof -> null");
  const p7 = pointsToDate(wk2025, { throughWeek: 7, scoring: "ppr" });
  const p8 = pointsToDate(wk2025, { throughWeek: 8, scoring: "ppr" });
  let grew = 0;
  for (const [k, v] of p8) { const a = p7.get(k); if (a && v.games > a.games) grew++; }
  ok(grew > 100, `E: ${grew} leikmenn baeta vid sig leik milli viku 7 og 8 — glugginn faerist`);
  ok([...p7.values()].every((v) => v.games <= 6),
     "E: og enginn ber fleiri en 6 leiki fyrir viku 7 (leki vaeri 7)");

  /* ---- F. LEIKIR EFTIR: AUD VIKA TELUR SIG SJALF ---- */
  const tg = teamGames(schedule, { season: 2026, week: 1, lastRegWeek: 14 });
  ok(tg.size === 32, `F: oll 32 lid i leikjaskranni (${tg.size})`);
  const lefts = [...tg.values()].map((v) => v.left);
  ok(Math.min(...lefts) === 13 && Math.max(...lefts) === 13,
     `F: hvert lid a 13 leiki i vikum 1-14 (${Math.min(...lefts)}-${Math.max(...lefts)}) ` +
     "— 14 vikur minus ein aud, og OLL fri 2026 liggja innan gluggans");
  /* OG AUDA VIKAN ER RAUNVERULEGA DREGIN FRA. 13 eitt sér gaeti komid
     ur hverju sem er; profsteinninn er ad VIKKA gluggann og sja
     muninn: 18 vikur - eitt fri = 17. Vaeri talid i vikum i stad leikja
     gaefi thetta 18. */
  const tgFull = teamGames(schedule, { season: 2026, week: 1, lastRegWeek: 18 });
  const fulls = [...tgFull.values()].map((v) => v.left);
  ok(Math.min(...fulls) === 17 && Math.max(...fulls) === 17,
     `F: og yfir allar 18 vikurnar a hvert lid 17 leiki (${Math.min(...fulls)}) — friid er dregid fra, ekki talid`);
  ok([...tg.values()].every((v) => v.played === 0),
     "F: og engir leikir 'spiladir' fyrir viku 1");

  /* ---- F2. LEIKIRNIR SEM EFTIR ERU VERDA AD RADA VERDINU ----
     `proj = ppg * leikir eftir`. Ad sleppa margfoldunni breytir NANAST
     ENGU um rodun innan stodu (allir hafa 13 eda 14 leiki), svo hun
     slapp gegnum hvern einasta raungagna-vord — thar med C2, sem er
     annars sa strangasti hér. Vélbunadurinn er samt raunverulegur og
     hann kemur i ljos um leid og tveir menn eiga OLIKAN fjolda leikja
     eftir: madur med fri framundan a faerri leiki eftir en sa sem er
     buinn med sitt, og hann er thess virdi minna. THAD er thad sem
     ROS-gjaldmidill A ad segja og thad er profad hér a TILBUNUM
     leikjaskra thar sem svarid er reiknanlegt i hausnum. */
  {
    /* Tvo lid, 4 vikur. AAA spilar allar; BBB er i frii i viku 3. */
    const synth = [];
    for (let w = 1; w <= 4; w++) {
      synth.push({ season: 2099, week: w, type: "REG", home: "AAA", away: w === 3 ? "CCC" : "BBB" });
    }
    const g = teamGames(synth, { season: 2099, week: 1, lastRegWeek: 4 });
    ok(g.get("AAA").left === 4 && g.get("BBB").left === 3,
      `F2: AAA a 4 leiki eftir, BBB 3 (${g.get("AAA").left}/${g.get("BBB").left})`);

    /* Tveir EINS leikmenn, sitthvort lidid, engin fyrri stig. Eini
       munurinn er leikjafjoldinn. */
    const wkRows = [{ id: "g1", week: 1, ppr: 10 }, { id: "g2", week: 1, ppr: 10 }];
    const synth2 = synth.map((x) => ({ ...x }));
    const twoRows = [
      { id: "p1", gsisId: "g1", pos: "RB", team: "AAA", proj: 170, adp: 10 },
      { id: "p2", gsisId: "g2", pos: "RB", team: "BBB", proj: 170, adp: 10 },
    ];
    const r2 = rosCurrency({ rows: twoRows, weeklyRows: wkRows, schedule: synth2,
                             season: 2099, week: 2, lastRegWeek: 4, scoring: "ppr",
                             league: LEAGUE });
    ok(r2 != null, "F2: gjaldmidill byggdur a tilbunu leikjaskranni");
    const v1 = r2.vbd.get("p1"), v2 = r2.vbd.get("p2");
    ok(v1 != null && v2 != null && v1 > v2,
      `F2: sa sem a FLEIRI leiki eftir er meira virdi (${v1} > ${v2}) — ` +
      "an `* leikir eftir` vaeru their JAFNIR");
    ok(Math.abs(v1 - v2) > 0.5,
      `F2: og munurinn er raunverulegur (${(v1 - v2).toFixed(1)}), ekki namundunar-suð`);
  }
}

/* ============================================================
   12b. „ODYRAST AD MISSA" VERDUR AD LESA GJALDMIDILINN SEM ER I GILDI
   ============================================================
   `cheapestDrop` radadi eftir `r.vbd` — TIMABILS-VBD — medan abatinn
   var reiknadur ur ROS-VBD. Utkoman er svar vid ANNARRI SPURNINGU en
   thad sem er birt: "odyrastur a timabilinu" settur inn i reikning sem
   er allur i ROS. Sama ætt og teljari og nefnari ur sitthvorri heimild.

   RAUNGOGN GATU EKKI FELLT THETTA — badar radanirnar gefa oftast sama
   mann, svo stokkbreytingin slapp i gegn a ollu bordinu. Vordurinn
   liggur thvi a TILBUNUM hop thar sem radanirnar tvaer eru ANDSTAEDAR
   og svarid er thekkt fyrirfram.
   ============================================================ */
console.log("\n12b. odyrasti madurinn er odyrastur i RETTA gjaldmidlinum");
{
  const L = { teams: 10, scoring: "ppr",
              starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              superflex: false };
  const mk = (id, pos, vbd, name) => ({ id, name, pos, team: "SF", vbd, proj: 100 + vbd,
                                        adp: 50, avail: 1, injury: null });
  /* Hopurinn: nogu breidur til ad hvor sem er MEGI fara (stodu-verndin
     ma ekki vera thad sem raedur). */
  const mine = [
    mk("m1", "RB", 60, "Season-cheap"),   /* odyrastur a TIMABILS-VBD */
    mk("m2", "RB", 90, "Ros-cheap"),      /* odyrastur a ROS-VBD      */
    mk("m3", "RB", 95, "RB filler"),
    mk("m4", "WR", 80, "WR a"), mk("m5", "WR", 82, "WR b"), mk("m6", "WR", 84, "WR c"),
    mk("m7", "QB", 70, "QB a"), mk("m8", "TE", 65, "TE a"),
  ];
  const add = mk("a1", "RB", 150, "The add");
  /* ROS SNYR RODINNI VID milli m1 og m2 — og adeins theirra. */
  const rosVbd = new Map([["m1", 200], ["m2", 20], ["m3", 210],
                          ["m4", 180], ["m5", 182], ["m6", 184],
                          ["m7", 170], ["m8", 165], ["a1", 300]]);
  const ros = { vbd: rosVbd, priced: rosVbd.size, weeks: 14, weeksLeft: 7, basis: "rosVbdPro" };

  const season = pickupAdvice({ pool: [add], mine, league: L, week: 8 });
  ok(season.length === 1 && season[0].drop.id === "m1",
    `a TIMABILS-VBD er droppadur "${season[0] && season[0].drop.name}" (odyrastur thar: 60)`);

  const withRos = pickupAdvice({ pool: [add], mine, league: L, week: 8, ros });
  ok(withRos.length === 1 && withRos[0].drop.id === "m2",
    `a ROS-VBD er droppadur "${withRos[0] && withRos[0].drop.name}" (odyrastur thar: 20)`);
  ok(season[0].drop.id !== withRos[0].drop.id,
    "og thad ER sitthvor madurinn — fullyrdingin getur brugdist");

  /* Abatinn verdur lika ad vera reiknadur i sama gjaldmidli. */
  ok(withRos[0].gain === 280,
    `abatinn er 300 - 20 = 280 i ROS (mælt ${withRos[0].gain}), ekki 150 - 90 = 60 i timabils-VBD`);
  ok(season[0].gain === 90,
    `og 150 - 60 = 90 an ROS (mælt ${season[0].gain})`);
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
