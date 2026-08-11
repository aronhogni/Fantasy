/* tests/pros.mjs — vordur um "Best of the best".

   HVERS VEGNA TILBUIN GOGN: `entry/{id}/event/{gw}/picks/` skilar 404 i
   forleik — LIKA fyrir umferdir sidasta timabils (profad 9.8.2026). Thad er
   thvi ENGIN leid ad sja raunverulegt svar fyrr en 21. agust. Somu adferd og
   `mins-trend.mjs` kafli 0 og `defcon-shrink.mjs`: kodinn sem kviknar fyrst
   a leikdegi er dreginn ut og keyrdur a tilbunum gognum ADUR.

   Vordurinn prófar HEGDUN, ekki ordalag.                                    */

import { aggregate, eo, movers, differential, coverageOk, marginPct,
         chipTimeline, MIN_PANEL_RESPONSE, recencyScore, seasonPct,
         MIN_SEASONS, HALF_LIFE, perManagerMoves, squadShape,
         formationOutcome } from "../src/pros.js";

let fail = 0;
const ok = (c, m) => { if (!c) { console.log("  FALL: " + m); fail++; } };
const near = (a, b, e, m) => ok(a != null && Math.abs(a - b) < e, `${m} (fekk ${a}, vaenti ${b})`);

/* Smidur eitt svar eins og FPL skilar thvi. */
function mkEntry({ ids, capt, vice, chip = null, tr = 0, cost = 0, value = 1000,
                   bank = 5, rank = 50000, tin = [], tout = [] }) {
  return {
    picks: {
      active_chip: chip,
      picks: ids.map(id => ({ element: id, is_captain: id === capt,
                              is_vice_captain: id === vice,
                              multiplier: id === capt ? 2 : 1 })),
      entry_history: { event_transfers: tr, event_transfers_cost: cost,
                       value, bank, overall_rank: rank },
    },
    transfers: tin.map((x, i) => ({ element_in: x, element_out: tout[i] ?? null })),
  };
}

console.log("1) talning — eignarhald, fyrirlidi, varafyrirlidi");
{
  const E = [
    mkEntry({ ids: [1, 2, 3], capt: 1, vice: 2 }),
    mkEntry({ ids: [1, 2, 4], capt: 2, vice: 1 }),
    mkEntry({ ids: [1, 5, 6], capt: 1, vice: 5 }),
  ];
  const a = aggregate(E);
  ok(a.n === 3, "n = 3");
  ok(a.own[1] === 3, "leikmadur 1 i ollum thremur");
  ok(a.own[4] === 1, "leikmadur 4 i einum");
  ok(a.capt[1] === 2, "leikmadur 1 fyrirlidi tvisvar");
  ok(a.vice[5] === 1, "varafyrirlidi talinn");
  ok(a.own[99] === undefined, "sparse: enginn lykill fyrir leikmann sem enginn a");
}

console.log("2) EO — fyrirlidi telur TVISVAR");
{
  const a = aggregate([mkEntry({ ids: [1, 2], capt: 1, vice: 2 }),
                       mkEntry({ ids: [1, 2], capt: 2, vice: 1 })]);
  near(eo(a, 1), (2 + 1) / 2, 1e-9, "EO(1) = (2 eiga + 1 fyrirlidi)/2");
  near(eo(a, 2), (2 + 1) / 2, 1e-9, "EO(2) eins");
  ok(eo(a, 77) === 0, "leikmadur an eignarhalds fer i 0, ekki null (n>0)");
  ok(eo({ n: 0, own: {}, capt: {} }, 1) === null, "engin svor -> null, EKKI 0");
}

console.log("3) NULL ER EKKI NULL — tomt inntak gefur null, ekki nullur");
{
  const a = aggregate([]);
  ok(a.n === 0, "n = 0");
  ok(a.transfers === null && a.hitCost === null && a.value === null,
     "medaltol eru null thegar enginn svaradi");
  ok(a.rankMedian === null, "midgildi radar er null");
  const b = aggregate([mkEntry({ ids: [1], capt: 1, vice: 1, tr: 0, cost: 0 })]);
  ok(b.transfers === 0, "raunverulegt 0 skiptum helst 0 (ekki null)");
}

console.log("4) onyt svor eru EKKI talin med");
{
  const a = aggregate([
    mkEntry({ ids: [1, 2], capt: 1, vice: 2 }),
    null, undefined, {}, { picks: null }, { picks: { picks: [] } },
  ]);
  ok(a.n === 1, `adeins gilt svar telur (n=${a.n})`);
}

console.log("5) chips");
{
  const a = aggregate([
    mkEntry({ ids: [1], capt: 1, vice: 1, chip: "bboost" }),
    mkEntry({ ids: [1], capt: 1, vice: 1, chip: "bboost" }),
    mkEntry({ ids: [1], capt: 1, vice: 1, chip: "3xc" }),
    mkEntry({ ids: [1], capt: 1, vice: 1 }),
  ]);
  ok(a.chips.bboost === 2 && a.chips["3xc"] === 1, "chip-talning");
  ok(a.chips.wildcard === undefined, "ospiladh chip faer engan lykil");
  const tl = chipTimeline({ 1: a }, ["bboost", "3xc", "wildcard"]);
  near(tl[0].bboost, 0.5, 1e-9, "helmingur spiladi bench boost");
  ok(tl[0].wildcard === 0, "wildcard 0 thegar einhver svaradi");
}

console.log("6) movers — rodun eftir FJOLDA og `net` adgreinir");
{
  /* A: 5 kaupa, 0 selja. B: 6 kaupa, 5 selja. Bert kaup setur B ofar, en
     `net` verdur ad syna ad A er raunverulega hreyfingin.                  */
  const E = [];
  for (let i = 0; i < 5; i++) E.push(mkEntry({ ids: [1], capt: 1, vice: 1, tin: [10], tout: [99] }));
  for (let i = 0; i < 6; i++) E.push(mkEntry({ ids: [1], capt: 1, vice: 1, tin: [20], tout: [98] }));
  for (let i = 0; i < 5; i++) E.push(mkEntry({ ids: [1], capt: 1, vice: 1, tin: [30], tout: [20] }));
  const a = aggregate(E);
  const mv = movers(a, "in", 5);
  ok(mv[0].id === 20 && mv[0].count === 6, "flest kaup efst");
  ok(mv[0].net === 1, `20: 6 inn - 5 ut = net 1 (fekk ${mv[0].net})`);
  const a10 = mv.find(m => m.id === 10);
  ok(a10.net === 5, "10: 5 inn - 0 ut = net 5 — nettotalan adgreinir");
  near(a10.share, 5 / 16, 1e-9, "hlutfall midast vid THA SEM SVORUDU");
  const out = movers(a, "out", 5);
  ok(out[0].id === 98 && out[0].count === 6, "solu-listinn er sjalfstaedur");
  ok(movers(aggregate([]), "in").length === 0, "tomt -> tomur listi, ekki hrun");
}

console.log("6b) SKIPTA-POR — hvad var selt FYRIR hvad");
{
  /* `in` og `out` sitt i hvoru lagi segja EKKI ad thad hafi verid SAMA
     skiptid. Spurningin "hvad selja their til ad fjarmagna X" er kjarninn i
     thvi ad LAERA af theim, og hun er osvaranleg an poranna.               */
  const E = [];
  for (let i = 0; i < 4; i++) E.push(mkEntry({ ids: [1], capt: 1, vice: 1, tin: [50], tout: [60] }));
  for (let i = 0; i < 3; i++) E.push(mkEntry({ ids: [1], capt: 1, vice: 1, tin: [50], tout: [61] }));
  E.push(mkEntry({ ids: [1], capt: 1, vice: 1, tin: [50], tout: [62] }));   // adeins EINN
  const a = aggregate(E);
  ok(a.pairs["60>50"] === 4, `por 60>50 talid 4 (fekk ${a.pairs["60>50"]})`);
  ok(a.pairs["61>50"] === 3, "annad por talid sjalfstaett");
  /* Por sem einn madur gerdi er sud og ma ekki blasa upp skrana. */
  ok(a.pairs["62>50"] === undefined, "por sem ADEINS EINN gerdi er ekki vistad");
  /* Heildartalning helst ohreyfd — porin eru VIDBOT, ekki i stad. */
  ok(a.in[50] === 8, `kaup-talning enn heil (${a.in[50]})`);
  ok(a.out[62] === 1, "solu-talning heldur EINSTAKA manninum, thott porid se sleppt");
}

console.log("6c) CHIP-NOTENDUR — hverjir, svo haegt se ad maela hvort thad borgadi sig");
{
  /* "1 spiladi wildcard" gerir OMOGULEGT ad spyrja hvort chip-id hafi
     borgad sig — til thess tharf ad fylgja SOMU monnum yfir naestu
     umferdir. Thess vegna eru lid-id theirra vistud.                      */
  const E = [
    { ...mkEntry({ ids: [1], capt: 1, vice: 1, chip: "bboost" }), id: 111 },
    { ...mkEntry({ ids: [1], capt: 1, vice: 1, chip: "bboost" }), id: 222 },
    { ...mkEntry({ ids: [1], capt: 1, vice: 1, chip: "3xc" }),    id: 333 },
    { ...mkEntry({ ids: [1], capt: 1, vice: 1 }),                 id: 444 },
  ];
  const a = aggregate(E);
  ok(a.chipIds.bboost?.join(",") === "111,222", `bboost-notendur skradir (${a.chipIds.bboost})`);
  ok(a.chipIds["3xc"]?.join(",") === "333", "3xc-notandi skradur");
  ok(a.chipIds.wildcard === undefined, "ospiladh chip faer engan lykil");
  ok(a.chips.bboost === 2 && a.chipIds.bboost.length === a.chips.bboost,
     "talningin og id-listinn segja THAD SAMA");
  /* Lid an `id` ma ekki setja null inn i listann. */
  const b = aggregate([mkEntry({ ids: [1], capt: 1, vice: 1, chip: "bboost" })]);
  ok(!b.chipIds.bboost || !b.chipIds.bboost.includes(null),
     "vantandi id setur ekki null i listann");
}

console.log("6e) LIDSSKIPAN — leikstodukerfi, bekkur og verd-uppbygging");
{
  const meta = {};
  const P = (id, pos, cost) => { meta[id] = { pos, cost }; return id; };
  /* 3-4-3: 1 GK + 3 DEF + 4 MID + 3 FWD i byrjunarlidi, bekkur GK/DEF/MID/FWD */
  const xi = [P(1,1,45), P(2,2,40),P(3,2,55),P(4,2,60),
              P(5,3,50),P(6,3,70),P(7,3,95),P(8,3,120), P(9,4,90),P(10,4,145),P(11,4,75)];
  const bn = [P(12,1,40), P(13,2,40), P(14,3,45), P(15,4,45)];
  const picks = [...xi.map((e,i) => ({ element:e, position:i+1 })),
                 ...bn.map((e,i) => ({ element:e, position:12+i }))];
  const sh = squadShape(picks, meta);
  ok(sh.formation === "3-4-3", `leikstodukerfi lesid ur BYRJUNARLIDI (${sh.formation})`);
  ok(sh.startCost === 845, `byrjunarlid kostar 845 tiundir (${sh.startCost})`);
  ok(sh.byPos[2] === 155 && sh.byPos[4] === 310, "eydsla per stodu rett");
  ok(sh.benchCost === 170, `bekkur kostar 170 (${sh.benchCost})`);
  ok(sh.benchPos.join(",") === "1,2,3,4", "bekkjar-samsetning skrad");

  /* 4-4-2 verdur ad lesast ODRUVISI — annars vaeri talan skraut. */
  /* SJALFSTAED ID-BIL. Fyrsta utgafa profsins endurnotadi 1-15 fyrir bædi
     kerfin, svo `{...meta, ...meta2}` SKRIFADI YFIR hitt og oll thrju lidin
     lasust sem 4-4-2. Kodinn hafdi rett fyrir ser; FIXTURAN var vitlaus.  */
  const meta2 = {}; const Q = (id,pos,cost) => { meta2[id]={pos,cost}; return id; };
  const xi2 = [Q(101,1,45), Q(102,2,40),Q(103,2,45),Q(104,2,50),Q(105,2,55),
               Q(106,3,60),Q(107,3,70),Q(108,3,80),Q(109,3,90), Q(110,4,100),Q(111,4,110)];
  const bn2 = [Q(112,1,40),Q(113,2,40),Q(114,3,45),Q(115,4,45)];
  const sh2 = squadShape([...xi2.map((e,i)=>({element:e,position:i+1})),
                          ...bn2.map((e,i)=>({element:e,position:12+i}))], meta2);
  ok(sh2.formation === "4-4-2", `annad kerfi lesid rett (${sh2.formation})`);

  /* BEKKURINN MA EKKI TELJA MED I KERFINU. Ef sian a `position <= 11`
     brotnar yrdi 3-4-3 ad "4-5-4" — 15 menn i 11 saetum.

     FYRSTA UTGAFAN VAR TAUTOLOGIA og gat ALDREI fallid:
       ok(!/4-5-4/.test(sh.formation) || sh.formation === "3-4-3", …)
     Hægri hlidin var thegar sonnud tveimur linum ofar, svo `||` gerdi
     fullyrdinguna alltaf sanna. Fundid vid sjalfs-uttekt a neikvaedum
     fullyrdingum 11.8.2026 — sami flokkur og kafli 5b i CLAUDE.md lysir.
     Nu er MAELT thad sem raunverulega skiptir mali: utileikmenn i
     byrjunarlidi eru TIU. Vaeri bekkurinn talinn med yrdi summan 14.    */
  const parts = sh.formation.split("-").map(Number);
  ok(parts.reduce((a, b) => a + b, 0) === 10,
     `utileikmenn i XI eru 10, ekki 14 (fekk ${parts.join("+")} = ${parts.reduce((a,b)=>a+b,0)})`);
  ok(parts.length === 3 && parts.every(Number.isInteger), "kerfid er thrjar heilar tolur");

  /* OMAELD TALA FAER EKKI REIT: an stodu-upplysinga er kerfid null.      */
  const bad = squadShape(picks, {});
  ok(bad.formation === null && bad.startCost === null && bad.byPos === null,
     "an `meta` er kerfid NULL, ekki \"0-0-0\"");
  ok(squadShape([], meta) === null && squadShape(null, meta) === null, "tomt -> null");

  /* TVEIR MARKMENN I BYRJUNARLIDI -> kerfid er NULL, ekki "2-3-4".
     Strengurinn sleppir markmanninum, svo rangt lid hefdi skilad kerfi sem
     summast i 9 og LITUR UT eins og gilt. Fundid med slembiprofi.       */
  const twoGk = { ...meta, [2]: { pos: 1, cost: 40 } };   // leikmadur 2 verdur markmadur
  ok(squadShape(picks, twoGk).formation === null,
     `tveir markmenn i XI -> null (fekk ${squadShape(picks, twoGk).formation})`);
  /* ...en verd-punktarnir standa samt, thvi their eru ekki adur en kerfid. */
  ok(squadShape(picks, twoGk).bands.length === 15, "verd-punktar tapast ekki thott kerfid se null");

  /* Vantar EINN leikmann i toflunni -> kerfid er ekki fullgilt. */
  const partial = { ...meta }; delete partial[7];
  ok(squadShape(picks, partial).formation === null,
     "vanti EINN leikmann er kerfid null (10 af 11 er ekki kerfi)");

  /* aggregate safnar theim saman. */
  const mkE = (pk, id) => ({ id, picks: { active_chip:null, picks:pk,
    entry_history:{ event_transfers:0, event_transfers_cost:0, value:1000, bank:0, overall_rank:9 } } });
  const a = aggregate([mkE(picks,1), mkE(picks,2),
    mkE([...xi2.map((e,i)=>({element:e,position:i+1})), ...bn2.map((e,i)=>({element:e,position:12+i}))],3)],
    { ...meta, ...meta2 });
  ok(a.formations["3-4-3"] === 2 && a.formations["4-4-2"] === 1,
     `kerfin tolud (${JSON.stringify(a.formations)})`);
  ok(a.shapeN === 3, "shapeN telur thau sem gafu gilt kerfi");
  ok(a.benchPos["1234"] === 3, "bekkjar-samsetning tolud (rodud, svo rod skiptir ekki mali)");
  ok(Math.abs(a.byPos[4] - (310 + 310 + 210) / 3) < 1e-9, "medaltal eydslu per stodu");
  /* AN meta ma EKKERT af thessu birtast. */
  const b = aggregate([mkE(picks,1)]);
  ok(b.shapeN === 0 && b.byPos === null && Object.keys(b.formations).length === 0,
     "an `meta` eru lidsskipans-svid TOM, ekki gisk");
}

console.log("6h) SVIDIN SEM VID VORUM ThEGAR AD SAEKJA — stig, bekkjar-stig, autosubs, timasetning");
{
  /* AUDIT 10.8.2026: `entry_history` i picks-svarinu ber ~12 svid og vid
     lasum FIMM. `points` og `points_on_bench` voru thar allan timann, og
     `automatic_subs` og `time` a skiptum lika. Ekkert af thessu kostar
     aukakall — vid vorum ad fleygja thvi.

     `points_on_bench` er serstaklega verdmaett: thad maelir BEKKJAR-
     AKVORDUN, sem er onnur faerni en leikmannaval.                       */
  const deadline = Date.parse("2026-09-12T10:30:00Z");
  const mk2 = (i, opts = {}) => ({
    id: 500 + i,
    picks: {
      active_chip: null,
      picks: Array.from({ length: 15 }, (_, k) => ({ element: k + 1, position: k + 1, is_captain: k === 0 })),
      automatic_subs: opts.subs || [],
      entry_history: { event: 7, points: opts.pts, points_on_bench: opts.bench,
                       overall_rank: 41000 + i, bank: 7, value: 1013,
                       event_transfers: 1, event_transfers_cost: 0 },
    },
    transfers: [{ element_in: 328, element_out: 401, event: 7,
                  time: new Date(deadline - (opts.minsBefore ?? 60) * 60000).toISOString() }],
  });
  const a = aggregate([
    mk2(0, { pts: 60, bench: 2, minsBefore: 20, subs: [{ element_in: 12 }] }),
    mk2(1, { pts: 70, bench: 10, minsBefore: 1500 }),
    mk2(2, { pts: 80, bench: 6, minsBefore: 3000 }),
  ], null, deadline);
  ok(a.points === 70, `medaltal stiga (${a.points})`);
  ok(a.benchPoints === 6, `medaltal bekkjar-stiga (${a.benchPoints})`);
  ok(Math.abs(a.autoSubs - 1 / 3) < 1e-9, `medaltal sjalfvirkra skiptinga (${a.autoSubs})`);
  ok(a.transferMinsMedian === 1500, `midgildi minutna fyrir frest (${a.transferMinsMedian})`);
  ok(Math.abs(a.transferLateShare - 1 / 3) < 1e-9,
     `hlutfall a sidasta klukkutima (${a.transferLateShare})`);
  /* An frests er timasetning EKKI reiknud — ekki giskad. */
  const b = aggregate([mk2(0, { pts: 60, bench: 2 })], null, null);
  ok(b.transferMinsMedian === null && b.transferLateShare === null,
     "an frests er timasetning null, ekki 0");
  /* Vantandi svid gefa null, EKKI 0 — "0 stig a bekk" og "vitum ekki" er
     sitt hvad.                                                           */
  const c = aggregate([{ id: 1, picks: { active_chip: null,
    picks: [{ element: 1, position: 1 }], entry_history: {} } }], null, deadline);
  ok(c.points === null && c.benchPoints === null,
     "vantandi stig -> null, ekki 0");
  ok(c.autoSubs === null, "vantandi automatic_subs -> null");
  /* Per stjornanda fylgja stigin lika. */
  const pm = perManagerMoves([mk2(0, { pts: 60, bench: 2, subs: [{ element_in: 12 }] })]);
  ok(pm[500].pts === 60 && pm[500].b === 2 && pm[500].as === 1,
     `stig/bekkur/autosubs per stjornanda (${JSON.stringify(pm[500])})`);
}

console.log("6f) VERD-PUNKTAR — byrjunarlid og bekkur SITT I HVORU LAGI");
{
  /* "4,5 markmadur eda 4,0?" er EKKI svaranleg med medaltali (4,25 er ekki
     verd sem er til). Og bekkjar-markmadur a 4,0 er ALLT ONNUR akvordun en
     byrjunar-markmadur a 4,5 — thess vegna verda thau ad vera adskilin.
     Thetta var adur adeins sannreynt med ad-hoc kalli og ekki i safninu:
     stokkbreyting sem sameinadi thau SLAPP.                              */
  const meta = {};
  const P = (id, pos, cost) => { meta[id] = { pos, cost }; return id; };
  const xi = [P(1,1,45), P(2,2,40),P(3,2,55),P(4,2,60),
              P(5,3,50),P(6,3,70),P(7,3,95),P(8,3,120), P(9,4,90),P(10,4,145),P(11,4,75)];
  const bn = [P(12,1,40), P(13,2,40), P(14,3,45), P(15,4,45)];
  const picks = [...xi.map((e,i) => ({ element:e, position:i+1 })),
                 ...bn.map((e,i) => ({ element:e, position:12+i }))];
  const a = aggregate([{ id:1, picks:{ active_chip:null, picks,
    entry_history:{ event_transfers:0, event_transfers_cost:0, value:1000, bank:0, overall_rank:9 } } }], meta);
  ok(a.priceStart[1][45] === 1, "byrjunar-markmadur a 4,5 talinn i priceStart");
  ok(a.priceStart[1][40] === undefined, "4,0 er EKKI i byrjunarlidi");
  ok(a.priceBench[1][40] === 1, "bekkjar-markmadur a 4,0 talinn i priceBench");
  ok(a.priceBench[1][45] === undefined, "4,5 er EKKI a bekknum");
  ok(a.priceStart[4][145] === 1 && a.priceBench[4][45] === 1,
     "dyr sokn i byrjunarlidi, odyr a bekk — adgreint");
  const startTot = Object.values(a.priceStart).reduce((s2,m2)=>s2+Object.values(m2).reduce((x,y)=>x+y,0),0);
  const benchTot = Object.values(a.priceBench).reduce((s2,m2)=>s2+Object.values(m2).reduce((x,y)=>x+y,0),0);
  ok(startTot === 11 && benchTot === 4, `11 i byrjunarlidi og 4 a bekk (${startTot}/${benchTot})`);
}

console.log("6g) HVAD STOD SIG BEST — formerki, vidmid og lagmarks-urtak");
{
  const meta = {};
  const P = (id, pos, cost) => { meta[id] = { pos, cost }; return id; };
  const sq = [P(1,1,45), P(2,2,40),P(3,2,55),P(4,2,60),
              P(5,3,50),P(6,3,70),P(7,3,95),P(8,3,120), P(9,4,90),P(10,4,145),P(11,4,75),
              P(12,1,40),P(13,2,40),P(14,3,45),P(15,4,45)];
  /* Thrir batnandi (rodun LAEKKAR) og einn versnandi. */
  const moves = {
    10: { 7: { p: sq, r: 1000 }, 8: { r: 600 } },     // -400
    11: { 7: { p: sq, r: 2000 }, 8: { r: 1500 } },    // -500
    12: { 7: { p: sq, r: 3000 }, 8: { r: 2400 } },    // -600
    13: { 7: { p: sq, r: 500 },  8: { r: 900 } },     // +400
    14: { 7: { p: sq, r: 700 } },                     // vantar GW8 -> sleppt
    15: { 8: { r: 700 } },                            // vantar GW7 -> sleppt
  };
  const o = formationOutcome(moves, 7, 8, meta);
  ok(o.n === 4, `adeins their sem eru i BADUM umferdum (${o.n})`);
  /* FORMERKID: negatift = batnadi. Ef thvi er vixlad verdur "best" "verst". */
  ok(o.byFormation["3-4-3"].delta < 0,
     `midgildi er NEGATIFT thegar flestum batnar (${o.byFormation["3-4-3"].delta})`);
  ok(o.panelDelta < 0, "hopurinn i heild batnadi lika");
  ok(o.byFormation["3-4-3"].n === 4, "fjoldinn per kerfi talinn");
  /* An `meta` er ekkert kerfi og thvi engin utkoma — ekki gisk. */
  const bad = formationOutcome(moves, 7, 8, {});
  ok(bad.n === 0 && Object.keys(bad.byFormation).length === 0, "an `meta` -> engin utkoma");
  ok(formationOutcome(null, 7, 8, meta).n === 0, "tomt inntak hrynur ekki");
  /* Lid an rodunar i annarri umferd ma ekki teljast med. */
  const noRank = { 20: { 7: { p: sq }, 8: { r: 100 } } };
  ok(formationOutcome(noRank, 7, 8, meta).n === 0, "vanti rodun er lidid sleppt");
}

console.log("6d) PER-STJORNANDA SAGA — hvada stjornandi gerdi hvada breytingar");
{
  /* HVERS VEGNA THETTA VERDUR AD VISTAST JAFNODUM: lid-id eru
     TIMABILS-BUNDIN. Lid 174 i 2026/27 er NYTT lid; `history` gefur adeins
     timabil/stig/rodun og ENGIN id, svo id fyrra timabils er ofinnanlegt og
     `event/{gw}/picks/` svarar 404 eftir timabilid (maelt a GW38 2025/26).
     Sagan er thvi OENDURHEIMTANLEG ef hun er ekki vistud i vikunni.       */
  const E = [
    { ...mkEntry({ ids: [1], capt: 1, vice: 1, chip: "bboost", tin: [301], tout: [401] }), id: 11 },
    { ...mkEntry({ ids: [1], capt: 1, vice: 1, tin: [302, 303], tout: [402, 403] }), id: 22 },
    { ...mkEntry({ ids: [1], capt: 1, vice: 1 }), id: 33 },              // engin skipti
    mkEntry({ ids: [1], capt: 1, vice: 1 }),                             // ekkert id
  ];
  const per = perManagerMoves(E);
  ok(Object.keys(per).length === 3, `adeins lid MED id skrast (${Object.keys(per).length})`);
  ok(JSON.stringify(per[11].t) === "[[401,301]]", `porid er [ut, inn] (${JSON.stringify(per[11].t)})`);
  ok(per[11].c === "bboost", "chip skrad per stjornanda");
  ok(per[22].t.length === 2, "tvo skipti bædi skrad");
  ok(per[33].t === undefined && per[33].c === undefined,
     "stjornandi sem gerdi EKKERT ber engin tom svid (38x1000 -> hvert byte telur)");
  ok(per[33].r === 50000, "...en hann ber SAMT rodun, svo 'gerdi ekkert' og 'svaradi ekki' se ekki thad sama");
  ok(perManagerMoves([]).id === undefined && Object.keys(perManagerMoves(null)).length === 0,
     "tomt inntak hrynur ekki");
  /* LIDSSKIPAN FYLGIR PER STJORNANDA — thad er thad sem gerir greiningu
     eftir 2-3 timabil mogulega ("hvernig setja their sem VINNA upp lidid?").*/
  {
    const meta = { 1:{pos:1,cost:45}, 2:{pos:2,cost:40}, 3:{pos:2,cost:50}, 4:{pos:2,cost:55},
                   5:{pos:3,cost:60}, 6:{pos:3,cost:70}, 7:{pos:3,cost:80}, 8:{pos:3,cost:90},
                   9:{pos:4,cost:100}, 10:{pos:4,cost:110}, 11:{pos:4,cost:120},
                   12:{pos:1,cost:40}, 13:{pos:2,cost:40}, 14:{pos:3,cost:45}, 15:{pos:4,cost:45} };
    const pk = Array.from({ length:15 }, (_, i) => ({ element:i+1, position:i+1 }));
    const per = perManagerMoves([{ id:77, picks:{ active_chip:null, picks:pk,
      entry_history:{ overall_rank:123 } } }], meta);
    /* HRAA LIDID: 15 id i STODUROD. Ur thvi eru kerfi, bekkjar-kostnadur og
       eydsla ALLT reiknanleg sidar, thvi verd og stada eru thegar i repo-inu.
       Ad geyma afleiddar tolur i stadinn laesir greininguna vid mitt val.  */
    ok(per[77].p.join(",") === Array.from({length:15},(_,i)=>i+1).join(","),
       "15 leikmenn i stoduroð (fyrstu 11 = byrjunarlid)");
    ok(per[77].p.length === 15, "allir 15, ekki bara byrjunarlidid");
    /* Rod skiptir MALI og ma ekki radast af komurod i svarinu. */
    const shuffled = pk.slice().reverse();
    const per2 = perManagerMoves([{ id:78, picks:{ active_chip:null, picks:shuffled,
      entry_history:{ overall_rank:1 } } }]);
    ok(per2[78].p.join(",") === per[77].p.join(","),
       "rodun er eftir `position`, ekki eftir rod i svarinu");
    const withCap = perManagerMoves([{ id:79, picks:{ active_chip:null,
      picks: pk.map((x,i) => ({ ...x, is_captain: i === 6 })),
      entry_history:{ overall_rank:1 } } }]);
    ok(withCap[79].cap === 7, `fyrirlidinn skradur (${withCap[79].cap})`);
  }
}

console.log("7) differential — vantandi almenn tala gefur null");
{
  /* EO GETUR FARID YFIR 100% og A ad gera thad: madur sem ALLIR eiga OG
     allir gera ad fyrirlida hefur EO 200% — hann skilar tvofoldum stigum
     per eiganda. Fyrsta utgafa thessa profs vaenti 100% og fell; kodinn
     hafdi rett fyrir ser. Fullyrdingin er hofd her til ad negla merkinguna. */
  const allCapt = aggregate([mkEntry({ ids: [1], capt: 1, vice: 1 }),
                             mkEntry({ ids: [1], capt: 1, vice: 1 })]);
  near(eo(allCapt, 1), 2.0, 1e-9, "allir eiga OG allir fyrirlida -> EO 200%");
  near(differential(allCapt, 1, 50), 150, 1e-9, "EO 200% gegn 50% almennu = +150");

  /* Venjulega tilfellid: allir eiga, ENGINN fyrirlidar -> EO 100%. */
  const a = aggregate([mkEntry({ ids: [1, 2], capt: 2, vice: 1 }),
                       mkEntry({ ids: [1, 2], capt: 2, vice: 1 })]);
  near(eo(a, 1), 1.0, 1e-9, "allir eiga, enginn fyrirlidar -> EO 100%");
  near(differential(a, 1, 50), 50, 1e-9, "EO 100% gegn 50% almennu = +50");
  ok(differential(a, 1, null) === null, "null crowd -> null");
  ok(differential(a, 1, "abc") === null, "onyt gerd -> null, ekki NaN");
  near(differential(a, 1, "12.5"), 87.5, 1e-9, "strengur ur FPL er thattadur");
  ok(differential({ n: 0, own: {}, capt: {} }, 1, 10) === null, "engin svor -> null");
}

console.log("8) THEKJA ER FULLYRDING (CLAUDE.md 5b)");
{
  const full = { n: 950 }, thin = { n: 500 };
  ok(coverageOk(full, 1000) === true, "95% thekja i lagi");
  ok(coverageOk(thin, 1000) === false, "50% thekja fellur");
  ok(coverageOk({ n: MIN_PANEL_RESPONSE * 1000 }, 1000) === true, "nakvaemlega a morkunum staest");
  ok(coverageOk(null, 1000) === false && coverageOk({ n: 10 }, 0) === false,
     "onyt inntok gefa false, ekki hrun");
}

console.log("9) vikmork — 62% ur 12 monnum er EKKI sama og 62% ur 1000");
{
  const few = marginPct(0.62, 12), many = marginPct(0.62, 1000);
  ok(few > 20, `12 manns -> +-${few?.toFixed(1)} stig (a ad vera >20)`);
  ok(many < 4, `1000 manns -> +-${many?.toFixed(1)} stig (a ad vera <4)`);
  ok(marginPct(0.5, 0) === null && marginPct(null, 10) === null, "onyt inntok -> null");
  /* EO GETUR ORDID 2,0 (allir eiga OG allir fyrirlida). Adur skiladi thetta
     NaN, sem hefdi lent A SKJA. Maelt 10.8.2026.                          */
  ok(marginPct(1.5, 100) === 0 && marginPct(2, 100) === 0,
     "hlutfall yfir 1 er KLEMMT, gefur ekki NaN");
  ok(Number.isFinite(marginPct(1.5, 100)), "aldrei NaN");
}

console.log("10) skemmd svor fella ekki keyrsluna (sbr. untrusted-input)");
{
  const junk = [
    { picks: { picks: [{ element: null }], entry_history: { value: "abc" } } },
    { picks: { picks: [{ element: 5 }], entry_history: null }, transfers: null },
    { picks: { picks: [{ element: 6 }] }, transfers: [{ element_in: null, element_out: 7 }] },
    { picks: { picks: "nope" } },
  ];
  let a;
  ok((() => { try { a = aggregate(junk); return true; } catch { return false; } })(),
     "aggregate kastar ekki a skemmdum inntokum");
  ok(a.own[5] === 1 && a.own[6] === 1, "gildu radirnar komast samt til skila");
  /* `element: null` ma EKKI bua til draug-lykil. Adur var thetta oprofad:
     ad fjarlaegja null-vordinn i `aggregate` slapp gegnum allt safnid, og
     afleidingin hefdi verid leikmadur sem heitir "unknown" MED eignarhaldi
     i toflunni. Fundid med lina-markvissri stokkbreytingu 10.8.2026 —
     fyrri stokkbreytingin min hafdi HITT AD RANGRI LINU (4-stafa bil er
     hlutstrengur i 6-stafa bili), svo hun profadi annad en eg taldi.     */
  for (const map of ["own", "capt", "vice"]) {
    ok(!Object.prototype.hasOwnProperty.call(a[map], "null"),
       `${map} ber engan "null"-lykil (draug-leikmadur)`);
    ok(!Object.prototype.hasOwnProperty.call(a[map], "undefined"),
       `${map} ber engan "undefined"-lykil`);
  }
  ok(a.out[7] === 1, "element_out telst thott element_in vanti");
  ok(a.value === null, "onyt talnagerd smitar ekki inn sem NaN");
  ok(!Number.isNaN(a.transfers), "ekkert NaN i medaltolum");
}

console.log("10b) VALREGLAN — recencyScore");
{
  const P = (rows) => rows.map(([s, r]) => ({ season_name: s, rank: r }));
  /* Nyleiki VERDUR ad vega thyngra. Tveir menn med somu tvo tolur i
     ondverdri rod eiga ad fa ANDSTAEDA rod.                                */
  const improving = recencyScore(P([["2023/24", 900000], ["2024/25", 400000], ["2025/26", 10000]]));
  const declining = recencyScore(P([["2023/24", 10000], ["2024/25", 400000], ["2025/26", 900000]]));
  ok(improving.score < declining.score,
     `batnandi madur skorar betur (${improving.score.toFixed(3)} < ${declining.score.toFixed(3)})`);

  /* Einrænni: betri rodun MA ALDREI gefa verri skor.                       */
  let prev = Infinity, mono = true;
  for (const r of [2000000, 500000, 100000, 20000, 2000, 200]) {
    const s = recencyScore(P([["2023/24", r], ["2024/25", r], ["2025/26", r]])).score;
    if (s > prev) mono = false;
    prev = s;
  }
  ok(mono, "betri rodun gefur alltaf laegra (betra) skor");

  ok(recencyScore(P([["2024/25", 100], ["2025/26", 100]])) === null,
     `undir ${MIN_SEASONS} timabilum -> null`);

  /* HELMINGUNARTIMINN ER MAELDUR FASTI, EKKI SMEKKUR — og hann var
     LEIDRETTUR 10.8.2026 (1,5 -> 3,0) thvi fyrra valid hamarkadi fylgni yfir
     allan hopinn i stad gaeda TOPP 1.000. Profid negglir baedi gildid og
     STEFNUNA: vid h=3 vegur timabil sem er 3 ara gamalt HELMING af thvi
     nyjasta. Ef einhver breytir HALF_LIFE an maelingar fellur thetta.     */
  ok(HALF_LIFE === 3.0, `HALF_LIFE er maeldur fasti 3.0 (er ${HALF_LIFE})`);
  {
    const n = 7;
    const w = i => Math.pow(0.5, (n - 1 - i) / HALF_LIFE);
    near(w(n - 1 - 3) / w(n - 1), 0.5, 1e-9,
         "timabil sem er 3 ara gamalt vegur HELMING af thvi nyjasta");
    ok(w(0) / w(n - 1) > 0.2,
       "elsta timabil i 7-ara ferli vegur enn >20% (langt minni, ekki bara 2 ar)");
  }
  ok(recencyScore([]) === null && recencyScore(null) === null, "tomt inntak -> null");

  /* Okunn timabil eru SLEPPT, ekki giskud — annars fengi 2005/06 persentíl
     ut ur staerd sem vid hofum aldrei maelt.                               */
  const withGhost = recencyScore(P([["1999/00", 5], ["2023/24", 100000],
                                    ["2024/25", 100000], ["2025/26", 100000]]));
  ok(withGhost.seasons === 3, `okunnugt timabil talid ekki med (fekk ${withGhost.seasons})`);
  ok(withGhost.best === 100000, "`best` litur framhja okunnu timabili lika");

  const t = recencyScore(P([["2023/24", 50000], ["2024/25", 50000], ["2025/26", 50000]]));
  ok(t.t1 === 3, "top-1% timabil talin");
  near(seasonPct("2025/26", 130871), 1.0, 0.01, "1% af 2025/26 er ~130.871");
  ok(seasonPct("1999/00", 5) === null, "okunn timabil gefa null persentíl");
  ok(seasonPct("2025/26", 0) === null, "rodun 0 er onyt -> null");
}

/* ==========================================================================
   11-15) SOFNUNIN SJALF (collectPros). Hun keyrir fyrst 21. agust og getur
   ekki verid profud gegn lifandi svari fyrr en tha — svo hun er profud gegn
   HERMDUM svorum nuna. Kvota-vornin (kafli 13) er sa hluti sem myndi kosta
   mest ef hann brygdist: 48 keyrslur a dag x 2.000 koll = 96.000 koll.     */
const { collectPros } = await import("../scripts/pros-collect.mjs");

function harness({ panel = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], events,
                   prevGw = null, entries = null, missing = [] } = {}) {
  const wrote = {}, recs = [];
  const calls = { picks: 0, transfers: 0 };
  const deps = {
    async getJSON(url) {
      const mp = url.match(/entry\/(\d+)\/event\/(\d+)\/picks/);
      if (mp) {
        calls.picks++;
        const id = +mp[1];
        if (missing.includes(id)) throw new Error("HTTP 404 fyrir " + url);
        return (entries && entries[id]) || {
          active_chip: null,
          picks: [{ element: 100 + id, is_captain: true, is_vice_captain: false, multiplier: 2 }],
          entry_history: { event_transfers: 1, event_transfers_cost: 0,
                           value: 1000, bank: 0, overall_rank: 1000 * id },
        };
      }
      const mt = url.match(/entry\/(\d+)\/transfers/);
      if (mt) {
        calls.transfers++;
        return [{ element_in: 500, element_out: 600, event: 7 },
                { element_in: 501, element_out: 601, event: 6 }];   // ONNUR umferd
      }
      throw new Error("oveant url " + url);
    },
    async writeJSON(p, o) { wrote[p] = o; },
    async readJSON(f) {
      if (f === "pros.json") {
        if (panel === null) throw new Error("ENOENT");
        return { season: "2026/27", panel };
      }
      if (f === "pros_gw.json") {
        if (!prevGw) throw new Error("ENOENT");
        return prevGw;
      }
      throw new Error("ENOENT");
    },
    record(name, ok, count, note) { recs.push({ name, ok, count, note }); },
  };
  return { deps, wrote, recs, calls,
           run: ev => collectPros(deps, ev ?? events
         ?? [{ id: 7, deadline_time: new Date(Date.now() - 36e5).toISOString() }]) };
}

console.log("11) vantandi pros.json fellir EKKI keyrsluna");
{
  const h = harness({ panel: null });
  await h.run();
  ok(h.recs.length === 1 && h.recs[0].ok === false, "skrair villu i status");
  ok(h.calls.picks === 0, "engin kall gerd an hops");
  ok(!h.wrote["pros_gw.json"], "skrifar ekki tomt yfir");
}

console.log("12) FRESTURINN — ekkert er sott fyrr en hann er lidinn");
{
  /* FPL SYNIR ENGUM LID ANNARRA FYRIR FREST. Thetta er ekki API-tilviljun
     heldur regla leiksins, svo vordurinn er a DAGSETNINGU, ekki a flaggi. */
  const future = new Date(Date.now() + 36e5).toISOString();
  const past   = new Date(Date.now() - 36e5).toISOString();

  const pre = harness({ events: [{ id: 1, is_next: true, deadline_time: future }] });
  await pre.run();
  ok(pre.calls.picks === 0, "frestur EKKI lidinn -> engin kall (annars 2.000 koll i 404)");
  ok(pre.recs[0].ok === true, "thetta er rett astand, ekki villa");

  const post = harness({ events: [{ id: 7, deadline_time: past }] });
  await post.run();
  ok(post.calls.picks === 4, `frestur lidinn -> sott (${post.calls.picks} koll)`);

  /* Og RETTA umferdin: sidasta sem er lidin, ekki su sem er framundan. */
  const mixed = harness({ events: [{ id: 6, deadline_time: past },
                                   { id: 7, deadline_time: past },
                                   { id: 8, deadline_time: future }] });
  await mixed.run();
  ok(!!mixed.wrote["pros_gw.json"] && !!mixed.wrote["pros_gw.json"].gw[7],
     "sidasta LIDNA umferdin (7) er sott, ekki 8");
  ok(!mixed.wrote["pros_gw.json"].gw[8], "umferd med opinn frest er EKKI skrifud");
}

console.log("13) KVOTAVORN — umferd sem er thegar sott er EKKI sott aftur");
{
  const full = { n: 4, own: {}, capt: {}, vice: {}, in: {}, out: {}, chips: {} };
  const h = harness({ prevGw: { season: "2026/27", gw: { 7: full } } });
  await h.run();
  ok(h.calls.picks === 0, `engin endurtekin kall (fekk ${h.calls.picks})`);
  ok(/skipped/.test(h.recs[0].note || ""), "skrair ad thvi var sleppt");
}
console.log("13b) ...en OFULL umferd ER sott aftur");
{
  const thin = { n: 1, own: {}, capt: {}, vice: {}, in: {}, out: {}, chips: {} };
  const h = harness({ prevGw: { season: "2026/27", gw: { 7: thin } } });
  await h.run();
  ok(h.calls.picks === 4, `ofull thekja er sott aftur (fekk ${h.calls.picks})`);
}

console.log("13c) KVOTA-BAKK — thekja sem stendur fost ma ekki endursaekja 96x a dag");
{
  /* B12: skammhlaupid i 13 bitur ADEINS thegar `coverageOk` er satt. Naist
     thekjan aldrei — t.d. ef >10% af hopnum eydir lidinu sinu, sem gefur
     VARANLEG 404 — endursotti HVER hrada keyrsla allan hopinn. `fetch-fast`
     gengur 48-96x a dag, svo thad var allt ad ~96.000 koll a dag fyrir gogn
     sem vid vitum ad naest ekki.
     Reglan i kafla 13 ("hver umferd sott nakvaemlega einu sinni") gilti thvi
     adeins OFAN vid throskuldinn; hér er hin hlidin varin.                */
  const thin = { n: 1, own: {}, capt: {}, vice: {}, in: {}, out: {}, chips: {} };
  const now = Date.now();

  /* (a) FYRSTU TVAER TILRAUNIR FA AD REYNA. Thekja getur batnad ef FPL var
         einfaldlega haegt, svo bakkid ma ekki bita strax.                  */
  for (const tries of [0, 1]) {
    const h = harness({ prevGw: { season: "2026/27", gw: { 7: thin },
                                  attempts: { 7: { tries, last: new Date(now - 60e3).toISOString() } } } });
    await h.run();
    ok(h.calls.picks === 4, `tilraun ${tries + 1} af 2 er LEYFD (${h.calls.picks} koll)`);
  }

  /* (b) ThRIDJA TILRAUN INNAN 6 KLST ER STOPPUD — ekkert kall.            */
  const h3 = harness({ prevGw: { season: "2026/27", gw: { 7: thin },
                                 attempts: { 7: { tries: 2, last: new Date(now - 60e3).toISOString() } } } });
  await h3.run();
  ok(h3.calls.picks === 0, `thridja tilraun innan 6 klst saekir EKKERT (${h3.calls.picks} koll)`);
  const r3 = h3.recs.find(x => x.name === "pros");
  ok(/backing off/.test(r3?.note || ""), `og segir hvers vegna (${r3?.note})`);

  /* (c) EFTIR 6 KLST ER REYNT AFTUR — bakkid er BID, ekki uppgjof. Umferdin
         naest um leid og hopurinn svarar aftur.                            */
  const h4 = harness({ prevGw: { season: "2026/27", gw: { 7: thin },
                                 attempts: { 7: { tries: 9, last: new Date(now - 7 * 36e5).toISOString() } } } });
  await h4.run();
  ok(h4.calls.picks === 4, `eftir 6 klst er reynt aftur thratt fyrir 9 tilraunir (${h4.calls.picks} koll)`);

  /* (d) VEL-HEPPNUD KEYRSLA MA EKKI ThURRKA UT BOKHALDID — annars byrjar
         bakkid upp a nytt i hvert sinn sem thekjan batnar tímabundid.      */
  const h5 = harness({ prevGw: { season: "2026/27", gw: { 6: thin },
                                 attempts: { 6: { tries: 2, last: new Date(now - 7 * 36e5).toISOString() } } } });
  await h5.run();
  const w5 = h5.wrote["pros_gw.json"];
  ok(w5?.attempts?.[6]?.tries === 2, `bokhald annarra umferda helst (${JSON.stringify(w5?.attempts)})`);
  ok(w5?.attempts?.[7]?.tries === 1, "og thessi umferd er bokfaerd");
}

console.log("14) venjuleg keyrsla — skiptin eru SIUD eftir umferd");
{
  const h = harness();
  await h.run();
  const out = h.wrote["pros_gw.json"];
  ok(!!out, "skrifar pros_gw.json");
  const a = out.gw[7];
  ok(a.n === 4, `fjoldi svara ${a.n}`);
  ok(a.in[500] === 4, "kaup thessarar umferdar talin");
  ok(a.in[501] === undefined, "kaup ANNARRAR umferdar EKKI talin (siun virkar)");
  ok(a.out[600] === 4 && a.out[601] === undefined, "solur eins");
  ok(out.panel_size === 4, "hopsstaerdin fylgir med svo thekja se lesanleg");
  ok(out.gw[7].capt[101] === 1, "fyrirlidar taldir per leikmann");
}

console.log("15) 404 telst sem ekki-svar og lækkar THEKJU (ekki thogn)");
{
  const h = harness({ missing: [2, 3] });
  await h.run();
  const a = h.wrote["pros_gw.json"].gw[7];
  ok(a.n === 2, `tveir svorudu af fjorum (fekk ${a.n})`);
  const r = h.recs.find(x => x.name === "pros");
  ok(r.ok === false, "thekja undir 90% => status ER EKKI graent");
  ok(/2\/4/.test(r.note), `nota synir ${r.note}`);
}

console.log("14a2) CONTROL-HOPUR — vidmid fyrir allt sem er EKKI eignarhald");
{
  /* "Bekkurinn kostar 17,0" er MERKINGARLAUS an vidmids. FPL gefur vidmid
     fyrir eignarhald (`selected_by_percent`) og fyrir EKKERT annad, svo
     leikstodukerfi, bekkjar-kostnadur, verd-punktar og timasetning hofdu
     ekkert ad bera sig vid. Control er FASTUR slembinn hopur.            */
  const wrote = {}; const recs = [];
  let panelCalls = 0, ctrlCalls = 0;
  const deps = {
    async getJSON(url) {
      const m = url.match(/entry\/(\d+)\/event/);
      if (m) {
        const id = +m[1];
        (id > 900 ? (ctrlCalls++) : (panelCalls++));
        return { active_chip: id > 900 ? null : "bboost",
          picks: [{ element: 1, position: 1, is_captain: true, is_vice_captain: false }],
          entry_history: { points: id > 900 ? 40 : 70, points_on_bench: id > 900 ? 11 : 2,
                           overall_rank: id > 900 ? 2500000 : 40000,
                           value: 1000, bank: 0, event_transfers: 1, event_transfers_cost: 0 } };
      }
      return [];
    },
    async writeJSON(p2, o) { wrote[p2] = o; },
    async readJSON(f) {
      if (f === "pros.json") return { season: "2026/27", panel: [{ id: 1 }, { id: 2 }],
                                      control: [901, 902, 902, null, -3] };
      throw new Error("ENOENT");
    },
    record(n, ok2, c, note) { recs.push({ n, ok: ok2, note }); },
  };
  await collectPros(deps, [{ id: 7, deadline_time: new Date(Date.now() - 36e5).toISOString() }]);
  const a = wrote["pros_gw.json"].gw[7];
  ok(panelCalls === 2, `hopurinn sottur (${panelCalls})`);
  ok(ctrlCalls === 2, `control sottur og TVITEKNINGAR/onyt id siud (${ctrlCalls} af 5 radum)`);
  ok(!!a.control, "control-talning skrifud");
  ok(a.points === 70 && a.control.points === 40, "tolurnar eru ADSKILDAR");
  ok(a.control.size === 2, `control.size ber staerd hopsins (${a.control.size})`);
  /* Control er VIDMID, ekki einstaklingar sem vid fylgjum: hvorki chip-id
     ne skipta-por eiga ad fylgja honum.                                  */
  ok(a.control.chipIds === undefined && a.control.pairs === undefined,
     "control ber hvorki chipIds ne pairs");
  ok(a.chips.bboost === 2 && !a.control.chips?.bboost,
     "chip-talning hopsins smitast EKKI i control");
  /* Per-stjornanda sagan er ADEINS fyrir hopinn — 1.000 til vidbotar
     myndu tvofalda 3,8 MB an thess ad svara nyrri spurningu.             */
  const mv = wrote["pros_moves.json"].m;
  ok(!mv["901"] && !!mv["1"], "per-stjornanda saga er adeins fyrir hopinn");
}

console.log("14a3) EKKERT control -> ekkert vidmid, og THAD ER RETT");
{
  const h = harness();      // panel an `control`
  await h.run();
  const a = h.wrote["pros_gw.json"].gw[7];
  ok(a.control === undefined, "engin control-svid buin til ur engu");
  ok(a.n === 4, "hopurinn sjalfur oskaddadur");
}

console.log("14b) SAMEINING — ny umferd ma ALDREI thurrka ut theer fyrri");
{
  /* Sama regla og BSD (CLAUDE.md 6): "skrain er lykluð a timabil og keyrsla
     SAMEINAR". Ef GW8 skrifar yfir allt vaeri sagan tapud i hverri viku og
     chip-dagatalid — sem er ALLT byggt a fyrri umferdum — yrdi tomt.      */
  const gw7 = { n: 4, own: { 9: 4 }, capt: {}, vice: {}, in: { 5: 4 }, out: {}, chips: { bboost: 2 } };
  const past = new Date(Date.now() - 36e5).toISOString();
  const h = harness({ prevGw: { season: "2026/27", gw: { 7: gw7 } },
                      events: [{ id: 8, deadline_time: past }] });
  await h.run();
  const out = h.wrote["pros_gw.json"];
  ok(!!out, "skrifar");
  ok(!!out.gw[7], "GW7 er ENN i skranni");
  ok(!!out.gw[8], "GW8 var baett vid");
  ok(out.gw[7].chips.bboost === 2, "gomlu chip-tolurnar oskaddar (dagatalid lifir)");
  ok(out.gw[7].in[5] === 4, "gomlu kaupin oskoddu");
}

console.log("14c) BETRI thekja ma skrifa yfir verri i SOMU umferd");
{
  /* Fyrri keyrsla nadi 5 af 10 (undir morkum -> endursott). Ny naer 10.
     Tha VERDUR hun ad skrifa — annars frysi ein slok keyrsla umferdina.   */
  const panel = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
  const thin = { n: 5, own: { 99: 5 }, capt: {}, vice: {}, in: {}, out: {}, chips: {} };
  const h = harness({ panel, prevGw: { season: "2026/27", gw: { 7: thin } } });
  await h.run();
  const out = h.wrote["pros_gw.json"];
  ok(!!out, "skrifar thegar thekjan BATNAR");
  ok(out.gw[7].n === 10, `n uppfaert i 10 (fekk ${out.gw[7]?.n})`);
  ok(out.gw[7].own[99] === undefined, "gamla, ofulla talningin er REPLACED, ekki lögd vid");
}

console.log("14d) TVITEKID ID i hopnum blaes ekki ut tolurnar");
{
  /* Maelt 10.8.2026: hopur med 5 radir og 3 einkvaem id gaf n=5, eignarhald
     5 (i stad 3) og thekju 100%. Skrain er byggd handvirkt einu sinni a ari
     — nakvaemlega su tegund skrar sem faer tvitekningu vid samslattur.     */
  const panel = [{ id: 1 }, { id: 2 }, { id: 2 }, { id: 2 }, { id: 3 }];
  const h = harness({ panel });
  await h.run();
  ok(h.calls.picks === 3, `adeins 3 koll fyrir 3 einkvaem id (fekk ${h.calls.picks})`);
  const out = h.wrote["pros_gw.json"];
  ok(out.gw[7].n === 3, `n = 3, ekki 5 (fekk ${out.gw[7]?.n})`);
  ok(out.panel_size === 3, `panel_size = 3 (fekk ${out.panel_size})`);
}

console.log("14e) ONYT ID eru siud burt");
{
  const panel = [{ id: 1 }, { id: null }, { id: 0 }, { id: -5 }, { id: "abc" }, { id: 2 }];
  const h = harness({ panel });
  await h.run();
  ok(h.calls.picks === 2, `adeins gild id sott (fekk ${h.calls.picks})`);
  const h2 = harness({ panel: [{ id: null }, { id: "x" }] });
  await h2.run();
  ok(!h2.wrote["pros_gw.json"], "engin gild id -> ekkert skrifad");
  ok(/no usable entry ids/.test(h2.recs[0]?.note || ""), "notan segir hvers vegna");
}

console.log("14f) `event` sem STRENGUR ma ekki fella skiptin burt");
{
  /* GERDIN ER GATID. Strong jafna (`t.event === gw`) felldi OLL skipti
     thegjandi ef FPL skilar "7" i stad 7 — og notan sagdi "0 bought,
     0 sold", sem les eins og "enginn keypti neitt". Sama aett og
     `bank:"mikid"` -> NaN.                                               */
  const mkH = (ev) => {
    const wrote = {}; const recs = [];
    const deps = {
      async getJSON(url) {
        if (/picks/.test(url)) return {
          active_chip: null,
          picks: [{ element: 11, is_captain: true, is_vice_captain: false, multiplier: 2 }],
          entry_history: { event_transfers: 1, event_transfers_cost: 0, value: 1000, bank: 0, overall_rank: 5 },
        };
        return [{ element_in: 500, element_out: 600, event: ev },
                { element_in: 501, element_out: 601, event: 6 }];
      },
      async writeJSON(p2, o) { wrote[p2] = o; },
      async readJSON(f) {
        if (f === "pros.json") return { season: "2026/27", panel: [{ id: 1 }, { id: 2 }] };
        throw new Error("ENOENT");
      },
      record(n, okv, c, note) { recs.push({ n, ok: okv, note }); },
    };
    return { deps, wrote, recs };
  };
  for (const ev of [7, "7"]) {
    const h = mkH(ev);
    await collectPros(h.deps, [{ id: 7, deadline_time: new Date(Date.now() - 36e5).toISOString() }]);
    const a = h.wrote["pros_gw.json"]?.gw?.[7];
    ok(a && a.in[500] === 2, `event=${JSON.stringify(ev)}: kaupin skrad (${a?.in?.[500]})`);
    ok(a && a.in[501] === undefined, `event=${JSON.stringify(ev)}: ONNUR umferd enn utilokud`);
  }
}

console.log("15c) HTTP-STADA ER LESIN AF BYRJUNINNI, ekki leitad i slodinni");
{
  /* Lid med id 404 og VILLU 500: fyrsta utgafan notadi /\b404\b/ a allan
     strengnum, svo `500 .../entry/404/event/7/picks/` hefdi verid flokkud
     sem "lidid er ekki til" -> engar endurtilraunir og madurinn tapast
     thegjandi. Profid saekir bara eitt lid (404) og telur kollin: raunveruleg
     404 gefur EITT kall, 500 a ad gefa ENDURTILRAUNIR.                    */
  const mk = (msg) => {
    let n = 0;
    const deps = {
      async getJSON(url) {
        if (/picks/.test(url)) { n++; throw new Error(msg.replace("{url}", url)); }
        return [];
      },
      async writeJSON() {}, 
      async readJSON(f) {
        if (f === "pros.json") return { season: "2026/27", panel: [{ id: 404 }] };
        throw new Error("ENOENT");
      },
      record() {},
    };
    return { deps, calls: () => n };
  };
  const past = new Date(Date.now() - 36e5).toISOString();
  const a = mk("404 {url}");
  await collectPros(a.deps, [{ id: 7, deadline_time: past }]);
  ok(a.calls() === 1, `raunveruleg 404 -> eitt kall (fekk ${a.calls()})`);

  const b = mk("500 {url}");
  await collectPros(b.deps, [{ id: 7, deadline_time: past }]);
  ok(b.calls() > 1, `500 a lidi nr. 404 -> ENDURTILRAUNIR (fekk ${b.calls()} koll)`);
}

console.log("15b) ALGERLEGA tom keyrsla skrifar EKKERT");
{
  /* FUNDID MED LIFANDI THURRKEYRSLU 10.8.2026 gegn 1.000 raunverulegum
     lidum: oll 404 -> skrifad `{n:0, own:{}, in:{}}`. Rod med n=0 les eins
     og "enginn gerdi neitt" i stad "sofnunin brast".                     */
  const h = harness({ missing: [1, 2, 3, 4] });
  await h.run();
  /* FULLYRDINGIN VAR "ENGIN SKRA SKRIFUD" OG ER NU "ENGIN GAGNA-ROD"
     (11.8.2026). Kvota-bakkid (B12) bokfaerir tilraunina i `attempts`, sem
     ER skrif — en thad sem thessi vordur er til fyrir er ad rod med `n: 0`
     verdi ALDREI til, thvi hun les eins og "enginn gerdi neitt" i stad
     "sofnunin brast". Vidmidid er thvi rodin sjalf, ekki hvort skrain var
     snert. Bokhaldid ber ENGIN leikmanna-gogn.
     Stokkbreytt: skrifi kodinn `gw[7] = agg` med n=0 fellur thetta.      */
  const w15 = h.wrote["pros_gw.json"];
  ok(!w15 || !Object.keys(w15.gw || {}).length,
     `engin gagna-rod skrifud thegar ENGINN svaradi (${JSON.stringify(Object.keys(w15?.gw || {}))})`);
  ok(!w15 || !("n" in (Object.values(w15.gw || {})[0] || {})),
     "og engin rod ber `n`");
  ok(!!w15?.attempts, "tilraunin ER bokfaerd (bakkid virkar adeins ef hun er)");
  const r = h.recs.find(x => x.name === "pros");
  ok(r.ok === false, "status er raudur");
  ok(/nothing written/.test(r.note || ""), `notan segir ad ekkert var skrifad (${r.note})`);
}

console.log("16) verri keyrsla ma ALDREI skrifa yfir betri (sbr. 8e)");
{
  /* HER SKIPTIR UPPSETNINGIN OLLU. Fyrsta utgafa thessa profs gaf fyrri
     keyrslunni FULLA thekju (4/4) — tha slokknar a endursokninni i kafla 13
     og prófid for ALDREI inn i thann kodha sem thad thottist profa.
     "Engin skrif" var thvi satt af RANGRI astaedu. Nu er fyrri thekjan
     viljandi ofull (5 af 10 = undir 90%) svo endursokn EIGI ser stad,
     en ny keyrsla nái faerri — thad er tilfellid sem vordurinn ver.        */
  const panel = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
  const half = { n: 5, own: { 9: 5 }, capt: {}, vice: {}, in: {}, out: {}, chips: {} };
  const h = harness({ panel, prevGw: { season: "2026/27", gw: { 7: half } },
                      missing: [2, 3, 4, 5, 6, 7, 8, 9] });   // adeins 1 og 10 svara
  await h.run();
  ok(h.calls.picks === 10, `endursokn atti ser stad (${h.calls.picks} koll)`);
  /* SAMA BREYTING OG I 15b: vidmidid er RODIN, ekki hvort skrain var snert.
     Kvota-bakkid bokfaerir tilraunina; gomlu og BETRI tolurnar verda ad
     stada obreyttar.                                                      */
  const w16 = h.wrote["pros_gw.json"];
  ok(!w16 || !w16.gw || w16.gw[7] === undefined || w16.gw[7].n === 5,
     `betri rodin stendur obreytt (n=${w16?.gw?.[7]?.n})`);
  ok(!w16?.gw?.[7] || w16.gw[7].own?.["9"] === 5 || w16.gw[7].own?.[9] === 5,
     "og gognin sjalf eru gomlu gognin");
  ok(!!w16?.attempts, "tilraunin ER bokfaerd");
  const r = h.recs.find(x => x.name === "pros");
  ok(r.ok === false && /kept previous/.test(r.note), `skrair ad gomlu var haldid (${r.note})`);
}

console.log("17b) SNIDS-VORDUR — vantandi svid hja OLLUM er sniðs-breyting, ekki thogn");
{
  /* Lifandi `picks`-svar hefur ALDREI sest (404 fram ad fresti), svo hvert
     svid er forsenda sem reynist fyrst 21. agust. Ef FPL endurnefnir eitt
     theirra hverfur talan af skjanum an thess ad neitt verdi rautt.      */
  const bare = {
    async getJSON(url) {
      if (/picks/.test(url)) return {
        active_chip: null,
        picks: [{ element: 1, position: 1, is_captain: true, is_vice_captain: false }],
        entry_history: { event: 7 },        // OLL talnasvidin horfin
      };
      return [];
    },
    async writeJSON() {}, 
    async readJSON(f) {
      if (f === "pros.json") return { season: "2026/27", panel: [{ id: 1 }, { id: 2 }] };
      throw new Error("ENOENT");
    },
    recs: [],
    record(n, ok2, c, note) { bare.recs.push({ n, ok: ok2, note }); },
  };
  await collectPros(bare, [{ id: 7, deadline_time: new Date(Date.now() - 36e5).toISOString() }]);
  const sch = bare.recs.find(r => r.n === "pros_schema");
  ok(!!sch && sch.ok === false, "snids-breyting er SKRAD sem villa");
  /* SVIDA-LISTINN ER BORINN SAMAN SEM MENGI, EKKI MED /points/.
     Fyrsta utgafan notadi hlutstrengs-leit og "points_on_bench" INNIHELDUR
     "points" — svo ad fjarlaegja `points` ur verdinum SLAPP i gegn.
     Fjorda hlutstrengs-gildran i thessari lotu; thaer eru allar sama sagan:
     leit ad broti thar sem bera atti saman heild.                        */
  const listed = new Set(String(sch?.note || "").replace(/^GW\d+:\s*/, "")
    .split(" missing")[0].split(",").map(x => x.trim()).filter(Boolean));
  for (const f of ["points", "points_on_bench", "value", "overall_rank"]) {
    ok(listed.has(f), `snids-notan nefnir "${f}" (fekk: ${[...listed].join(", ")})`);
  }
  ok(/response-shape change/.test(sch?.note || ""),
     "notan greinir snids-breytingu fra vantandi gognum");

  /* En EITT lid an svida ma EKKI kveikja hana — thad er venjuleg vontun. */
  const mixed = harness({ entries: { 1: { active_chip: null,
    picks: [{ element: 1, position: 1, is_captain: true, is_vice_captain: false }],
    entry_history: { event: 7 } } } });
  await mixed.run();
  ok(!mixed.recs.find(r => r.n === "pros_schema"),
     "eitt lid med tom svid kveikir EKKI vordinn (hinir svorudu)");
}

console.log("18) SLEMBIPROF — 500 handahofskennd inntok, VENSL sem verda ad halda");
{
  /* Sama adferd og `advisor.mjs` og `leagues.mjs`: handskrifadar fixturur
     profa thad sem eg SA fyrir mer. Slembin inntok profa hitt. Her eru
     prófud VENSL sem verda ad halda hvad sem tolurnar eru — ef eitthvad
     theirra brotnar er birt tala rong, ekki bara oveant.                 */
  let rng = 987654321;
  const rnd = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  let bad = 0, checked = 0;

  for (let iter = 0; iter < 500; iter++) {
    const nMgr = ri(1, 25);
    /* RAUNVERULEG FPL-LID. Fyrsta utgafa generatorsins gaf stodum af
       handahofi, svo byrjunarlid gat haft TVO markmenn — sem er omogulegt
       i FPL. Thad felldi "kerfid summast i 10" og var MIN villa, ekki
       kodans. Slembiprof sem framleidir omoguleg inntok profar ekkert.
       Hopurinn er nu 2 GK / 5 DEF / 5 MID / 3 FWD eins og FPL kraefst.   */
    const meta = {};
    const POOL = { 1: [], 2: [], 3: [], 4: [] };
    let nid = 1;
    for (const [pos, count] of [[1, 4], [2, 12], [3, 12], [4, 8]]) {
      for (let j = 0; j < count; j++) { meta[nid] = { pos, cost: ri(38, 150) }; POOL[pos].push(nid++); }
    }
    const pick = (pos, m) => {
      const out = [], used = new Set();
      while (out.length < m) { const x = POOL[pos][ri(0, POOL[pos].length - 1)];
        if (!used.has(x)) { used.add(x); out.push(x); } }
      return out;
    };
    const entries = [];
    for (let k = 0; k < nMgr; k++) {
      /* Gilt kerfi: 1 GK + 3-5 DEF + 2-5 MID + 1-3 FWD = 11. */
      let d, m3, f;
      do { d = ri(3, 5); m3 = ri(2, 5); f = 11 - 1 - d - m3; } while (f < 1 || f > 3);
      const gk = pick(1, 2), df = pick(2, 5), md = pick(3, 5), fw = pick(4, 3);
      const ids = [gk[0], ...df.slice(0, d), ...md.slice(0, m3), ...fw.slice(0, f),
                   gk[1], ...df.slice(d), ...md.slice(m3), ...fw.slice(f)];
      const nt = ri(0, 4);
      entries.push({
        id: 1000 + k,
        picks: {
          active_chip: rnd() < 0.2 ? ["bboost", "3xc", "wildcard", "freehit"][ri(0, 3)] : null,
          picks: ids.map((e, i) => ({ element: e, position: i + 1,
                                      is_captain: i === 0, is_vice_captain: i === 1 })),
          automatic_subs: Array.from({ length: ri(0, 3) }, () => ({ element_in: ri(1, 40) })),
          entry_history: { points: ri(0, 120), points_on_bench: ri(0, 40),
                           overall_rank: ri(1, 9000000), value: ri(980, 1080),
                           bank: ri(0, 60), event_transfers: nt,
                           event_transfers_cost: ri(0, 3) * 4 },
        },
        transfers: Array.from({ length: nt }, () => ({
          element_in: ri(1, 40), element_out: ri(1, 40), event: 7,
          time: new Date(Date.now() - ri(0, 200000) * 1000).toISOString() })),
      });
    }
    const a = aggregate(entries, meta, Date.now());
    const fail = (m) => { if (bad++ < 3) console.log(`  FALL[${iter}]: ${m}`); };
    checked++;

    /* 1. n ma aldrei fara yfir fjolda inntaka. */
    if (a.n !== nMgr) fail(`n=${a.n} en inntok voru ${nMgr}`);
    /* 2. Enginn leikmadur ma vera i fleiri lidum en til eru. */
    for (const [id, c] of Object.entries(a.own)) if (c > a.n) fail(`own[${id}]=${c} > n`);
    /* 3. Summa eignarhalds = nakvaemlega 15 per lid. */
    const tot = Object.values(a.own).reduce((x, y) => x + y, 0);
    if (tot !== 15 * a.n) fail(`summa eignarhalds ${tot} != 15*${a.n}`);
    /* 4. Fyrirlidar og varafyrirlidar: NAKVAEMLEGA einn per lid. */
    const capT = Object.values(a.capt).reduce((x, y) => x + y, 0);
    if (capT !== a.n) fail(`fyrirlidar ${capT} != ${a.n}`);
    /* 5. EO >= eignarhalds-hlutfall (fyrirlidi baetist VID, dregst ekki fra). */
    for (const id of Object.keys(a.own)) {
      const e = eo(a, +id);
      if (e < a.own[id] / a.n - 1e-9) fail(`EO(${id})=${e} < eignarhald`);
    }
    /* 6. ENGIN NaN i neinni birtri tolu — thetta er sviðið sem hefur
          bitið thetta repo adur (bank:"mikid" -> NaN).                  */
    for (const k of ["transfers", "hitCost", "hitShare", "value", "bank",
                     "points", "benchPoints", "autoSubs", "startCost", "benchCost"]) {
      if (a[k] != null && !Number.isFinite(a[k])) fail(`${k} er ${a[k]}`);
    }
    /* 7. Hlutfoll verda ad vera i [0,1]. */
    if (a.hitShare != null && (a.hitShare < 0 || a.hitShare > 1)) fail(`hitShare ${a.hitShare}`);
    if (a.transferLateShare != null && (a.transferLateShare < 0 || a.transferLateShare > 1))
      fail(`transferLateShare ${a.transferLateShare}`);
    /* 8. Vikmork mega aldrei vera NaN ne neikvaed. */
    for (const id of Object.keys(a.capt)) {
      const m = marginPct(a.capt[id] / a.n, a.n);
      if (m == null || !Number.isFinite(m) || m < 0) fail(`marginPct ${m}`);
    }
    /* 9. Leikstodukerfi: adeins gild kerfi med 10 utileikmenn. */
    for (const f of Object.keys(a.formations)) {
      const parts = f.split("-").map(Number);
      if (parts.length !== 3 || parts.some(x => !Number.isInteger(x)) ||
          parts.reduce((x, y) => x + y, 0) !== 10) fail(`onytt kerfi "${f}"`);
    }
    /* 10. shapeN ma aldrei fara yfir n, og summa kerfa = shapeN. */
    const fTot = Object.values(a.formations).reduce((x, y) => x + y, 0);
    if (a.shapeN > a.n || fTot !== a.shapeN) fail(`shapeN ${a.shapeN} / summa ${fTot} / n ${a.n}`);
    /* 11. Verd-punktar: 11 i byrjunarlidi og 4 a bekk per gilt lid. */
    const ps = Object.values(a.priceStart).reduce((x, m2) => x + Object.values(m2).reduce((u, v) => u + v, 0), 0);
    const pb = Object.values(a.priceBench).reduce((x, m2) => x + Object.values(m2).reduce((u, v) => u + v, 0), 0);
    if (ps !== 11 * a.n || pb !== 4 * a.n) fail(`verd-punktar ${ps}/${pb} vid n=${a.n}`);
    /* 12. Skipta-por mega aldrei vera fleiri en skiptin sjalf. */
    const pairTot = Object.values(a.pairs).reduce((x, y) => x + y, 0);
    const inTot = Object.values(a.in).reduce((x, y) => x + y, 0);
    if (pairTot > inTot) fail(`por ${pairTot} > kaup ${inTot}`);
    /* 13. chipIds og chips verda ad segja THAD SAMA. */
    for (const [c, cnt] of Object.entries(a.chips)) {
      if ((a.chipIds[c] || []).length !== cnt) fail(`chip ${c}: ${cnt} vs ${(a.chipIds[c] || []).length}`);
    }
  }
  ok(bad === 0, `500 slembin inntok: ${bad} vensl brotin (profud ${checked})`);
}

console.log("17) TENGINGIN — collectPros ER kolluð ur fetchFast, OG hrada keyrslan er i cron");
{
  /* CLAUDE.md 7.1 skjalfestir NAKVAEMLEGA thessa villu: `fetchLineups` var
     fullbyggt og maelt, en kallad ur RANGRI keyrslu — og profid "er thad
     kallad?" var graent allan timann af thvi ad thad las KODA en ekki
     workflow-id. Her er BAEDI athugad.                                    */
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
  const fastStart = src.indexOf("async function fetchFast()");
  const fastEnd = src.indexOf("\n}", fastStart);
  ok(fastStart > -1 && fastEnd > fastStart, "fetchFast fannst i fetch.mjs");
  const body = src.slice(fastStart, fastEnd);
  ok(/collectPros\s*\(/.test(body),
     "collectPros er kolluð INNAN fetchFast (ekki bara i daglegu keyrslunni)");
  ok(/import \{ collectPros \} from "\.\/pros-collect\.mjs"/.test(src),
     "fetch.mjs flytur inn collectPros");

  let wf = "";
  try { wf = readFileSync(new URL("../.github/workflows/fetch-fast.yml", import.meta.url), "utf8"); } catch {}
  ok(/fetch\.mjs\s+--fast/.test(wf),
     "fetch-fast.yml keyrir raunverulega `fetch.mjs --fast`");
}

console.log(fail ? `\npros: ${fail} fullyrdingar fellu` : "\npros: allt graent");
process.exit(fail ? 1 : 0);
