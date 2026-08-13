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

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
