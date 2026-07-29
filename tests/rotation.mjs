/* ============================================================
   FFDR-SAMANBURÐUR / RÓTERINGS-PAR — src/rotation.js

   ÞETTA ER ÖNNUR SPURNING EN FFDR-TAFLAN og prófið verður að sýna það:
   maður með BETRI 6 umferðir í heild getur verið VERRA par en maður með
   síðri 6 umferðir, ef sá fyrri er þungur í sömu umferðum og minn maður.
   Kafli 3 er sá prófsteinn — ef hann fellur er þetta bara röðun í dulargervi.

   Tilbúin gögn þar sem RÉTTA SVARIÐ ER ÞEKKT fyrirfram, svo prófið mælir
   ekki bara "eitthvað kom út".
   ============================================================ */
import { readFileSync } from "node:fs";
import { TIER_NEUTRAL, tierOf } from "../src/model.js";
import {
  BLANK_NEED, DEFAULT_HORIZON, HARD_TIER_MIN, TIER_NEED,
  candidatePool, findRotationPartners, gwCell, horizonGws, needOf,
} from "../src/rotation.js";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log(`\n${"=".repeat(84)}`);
console.log("FFDR-SAMANBURÐUR — RÓTERINGS-PAR");
console.log("=".repeat(84));

/* ---------- Tilbúinn heimur ----------
   4 lið. FFDR er GEFIÐ per (lið, umferð) svo prófið stjórni þrepunum
   algerlega og sé ónæmt fyrir kvörðun líkansins.                        */
const FFDR = {
  10: { 1: 1.6, 2: 3.4, 3: 1.6, 4: 3.4, 5: 2.0, 6: 2.0 },  // MINN MAÐUR: þungur 2 og 4
  20: { 1: 3.4, 2: 1.6, 3: 3.4, 4: 1.6, 5: 3.4, 6: 3.4 },  // SPEGILMYND: léttur 2 og 4
  30: { 1: 1.6, 2: 1.6, 3: 1.6, 4: 3.4, 5: 1.6, 6: 1.6 },  // BETRI Í HEILD, þungur í 4
  40: { 1: 2.0, 2: 2.0, 3: 2.0, 4: 2.0, 5: 2.0, 6: 2.0 },  // flatur hlutlaus
};
const fixByTeamGw = {};
for (const tid of Object.keys(FFDR))
  for (const gw of Object.keys(FFDR[tid]))
    fixByTeamGw[tid] = { ...(fixByTeamGw[tid] || {}), [gw]: [{ opp: 99, home: true, id: +`${tid}${gw}` }] };
delete fixByTeamGw[30][2];                       // lið 30 á AUÐA umferð 2
fixByTeamGw[40][3] = [{ opp: 98, home: true, id: 403 }, { opp: 97, home: false, id: 4031 }]; // tvöföld
const fixDifficulty = (teamId, fx, pos) => FFDR[teamId]?.[gwOf(fx)] ?? null;
const gwOf = fx => {
  for (const tid of Object.keys(fixByTeamGw))
    for (const gw of Object.keys(fixByTeamGw[tid]))
      if (fixByTeamGw[tid][gw].some(f => f.id === fx.id)) return +gw;
  return null;
};
const mk = (id, team, type = 2, ep = "5.0") =>
  ({ id, team, element_type: type, web_name: `P${id}`, status: "a",
     ep_next: ep, points_per_game: ep, now_cost: 50 });

/* ---------- 1. Byggingareiningar ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("1. BYGGINGAREININGAR");
console.log("─".repeat(84));
ok(horizonGws(3, 6, 38).join(",") === "3,4,5,6,7,8", "sjóndeildarhringur 6 frá umferð 3");
ok(horizonGws(36, 6, 38).join(",") === "36,37,38", "klippt við umferð 38, engar draugaumferðir");
ok(DEFAULT_HORIZON === 6, "sjálfgildi er 6 umferðir (það sem notandinn bað um)");
ok(HARD_TIER_MIN === 3 && TIER_NEED[3] === 1 && TIER_NEED[4] === 2 && TIER_NEED[5] === 3,
  "erfitt = dökkgult(3)/ljósrautt(4)/rautt(5), þyngd 1/2/3");
ok(TIER_NEED.slice(0, 3).every(x => x === 0),
  "dökkgrænt/grænt/hlutlaust kalla EKKI á hjálp (þyngd 0)");
ok(BLANK_NEED >= TIER_NEED[5],
  `auð umferð er ÞYNGST (${BLANK_NEED} >= rautt ${TIER_NEED[5]}) — 0 stig er verra en hvaða leikur sem er`);

const c1 = gwCell({ teamId: 10, pos: 2, gw: 2, fixByTeamGw, fixDifficulty });
ok(c1.ffdr === 3.4 && c1.tier === tierOf(3.4) && !c1.blank, `stakur leikur: FFDR 3,4 -> þrep ${c1.tier}`);
const c2 = gwCell({ teamId: 30, pos: 2, gw: 2, fixByTeamGw, fixDifficulty });
ok(c2.blank && c2.ffdr === null && needOf(c2) === BLANK_NEED, "auð umferð greind og þyngd rétt");
const c3 = gwCell({ teamId: 40, pos: 2, gw: 3, fixByTeamGw, fixDifficulty });
ok(c3.dbl && c3.fxs.length === 2, "tvöföld umferð merkt (dbl) með báðum leikjum");
ok(needOf({ blank: false, tier: TIER_NEUTRAL }) === 0, "hlutlaust þrep er ekki þörf");

/* ---------- 2. Stöðu-reglan ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("2. STÖÐU-REGLAN — markmaður kemur ekki inn fyrir varnarmann");
console.log("─".repeat(84));
const ALL = [mk(1, 10, 1), mk(2, 20, 2), mk(3, 20, 3), mk(4, 20, 4), mk(5, 30, 1)];
const poolDef = candidatePool(ALL, [{ p: mk(9, 10, 2), teamId: 10 }]);
ok(poolDef.every(c => c.p.element_type !== 1) && poolDef.length === 3,
  `varnarmaður valinn -> laugin er ALLT NEMA markmenn (${poolDef.length} af 5)`);
const poolGk = candidatePool(ALL, [{ p: mk(9, 10, 1), teamId: 10 }]);
ok(poolGk.every(c => c.p.element_type === 1) && poolGk.length === 2,
  `markmaður valinn -> AÐEINS markmenn (${poolGk.length} af 5)`);
const poolMix = candidatePool(ALL, [{ p: mk(9, 10, 1), teamId: 10 }, { p: mk(8, 20, 2), teamId: 20 }]);
ok(poolMix.every(c => c.p.element_type === 1),
  "markmaður + varnarmaður valdir -> markmenn (öruggari kosturinn, ekki blanda)");

/* ---------- 3. PRÓFSTEINNINN: rótering, ekki röðun ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("3. PRÓFSTEINNINN — spegilmynd á að vinna þann sem er BETRI Í HEILD");
console.log("─".repeat(84));
const target = { p: mk(100, 10, 2), teamId: 10 };
const cands = [
  { p: mk(200, 20, 2), teamId: 20 },   // spegilmynd: léttur EINMITT í 2 og 4
  { p: mk(300, 30, 2), teamId: 30 },   // betri í heild en þungur í 4, AUÐUR í 2
  { p: mk(400, 40, 2), teamId: 40 },   // flatur hlutlaus
];
const R = findRotationPartners({ targets: [target], candidates: cands, gwFrom: 1,
  horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty, ownedIds: new Set([100]) });

console.log(`  erfiðar umferðir hjá mínum manni: ${R.hard.map(h => `GW${h.gw}(þyngd ${h.need})`).join(", ")}`);
console.log(`  þyngd í heild: ${R.totalNeed}`);
for (const r of R.results)
  console.log(`    ${r.p.web_name}  þekja ${String(r.cover).padStart(3)}%  vinningur ${r.gain >= 0 ? "+" : ""}${r.gain.toFixed(2)}  ` +
    r.per.map(x => `GW${x.gw}:${x.cell.blank ? "auð" : `þrep${x.cell.tier}`}${x.covers ? "✓" : "·"}`).join(" "));

ok(R.hard.length === 2 && R.hard.map(h => h.gw).join(",") === "2,4",
  "greinir NÁKVÆMLEGA umferðir 2 og 4 sem erfiðar (ekki 5 og 6, sem eru hlutlausar)");
ok(R.results[0]?.p.id === 200,
  "SPEGILMYNDIN (200) vinnur — sá sem er léttur einmitt þar sem minn er þungur");
const g300 = R.results.find(r => r.p.id === 300);
ok(!g300 || R.results[0].gain > g300.gain,
  "sá sem er BETRI Í HEILD (300) vinnur EKKI — heildarröðun er önnur spurning");
ok(R.results.find(r => r.p.id === 200)?.cover === 100,
  "spegilmyndin þekur 100% af þyngdinni");
ok(!g300,
  "300 er ALVEG ÚTI: auður í GW2 og rauður í GW4 -> þekur hvoruga erfiða umferð");
ok(R.results.every(r => r.p.id !== 100), "minn eigin maður er ekki í boði sem par við sjálfan sig");
ok(R.results.find(r => r.p.id === 200)?.owned === false &&
   R.results.every(r => typeof r.owned === "boolean"),
  "merkt hvort maðurinn er ÞEGAR í liðinu (bekkjarmaður þarf engin skipti)");

/* ---------- 4. Tveir menn valdir ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("4. TVEIR MENN VALDIR — þyngdin leggst saman");
console.log("─".repeat(84));
/* Par A: lið 10 (þungt 2 og 4) + lið 30 (AUÐUR í 2, þungur í 4) */
const t2 = findRotationPartners({
  targets: [{ p: mk(100, 10, 2), teamId: 10 }, { p: mk(101, 30, 2), teamId: 30 }],
  candidates: cands.filter(c => c.p.id !== 300), gwFrom: 1, horizon: 6, maxGw: 6,
  fixByTeamGw, fixDifficulty, ownedIds: new Set() });
const gw4 = t2.hard.find(h => h.gw === 4), gw2 = t2.hard.find(h => h.gw === 2);
console.log(`  par (10 + 30):  ${t2.hard.map(h => `GW${h.gw}:${h.need}`).join("  ")}`);
ok(gw4 && gw4.need === TIER_NEED[tierOf(3.4)] * 2,
  `GW4 fær TVÖFALDA þyngd (${gw4?.need}) — báðir þungir, brýnast að leysa`);
ok(gw2 && gw2.need === TIER_NEED[tierOf(3.4)] + BLANK_NEED,
  `GW2 = þungur + auður (${gw2?.need}) — auða umferðin telur með`);
/* Par B: lið 10 (þungt 2,4) + lið 20 (þungt 1,3,5,6) — engin umferð
   sameiginleg, svo SAMMENGIÐ er allur sjóndeildarhringurinn.            */
const t2b = findRotationPartners({
  targets: [{ p: mk(100, 10, 2), teamId: 10 }, { p: mk(102, 20, 2), teamId: 20 }],
  candidates: [{ p: mk(400, 40, 2), teamId: 40 }], gwFrom: 1, horizon: 6, maxGw: 6,
  fixByTeamGw, fixDifficulty });
console.log(`  par (10 + 20):  ${t2b.hard.map(h => `GW${h.gw}:${h.need}`).join("  ")}`);
ok(t2b.hard.map(h => h.gw).join(",") === "1,2,3,4,5,6",
  "SAMMENGI, ekki snið: umferð telst erfið ef ANNAÐHVORT er þungur þar");
ok(t2b.hard.every(h => h.need === TIER_NEED[tierOf(3.4)]),
  "þar sem aðeins EINN er þungur er þyngdin einföld, ekki tvöföld");
ok(t2b.hard.every(h => h.per.length === 2 && h.per.some(x => x.need === 0)),
  "rúta beggja manna fylgir hverri umferð, líka þess sem er í lagi þar");

/* ---------- 5. Vikmörk og vörn ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("5. VIKMÖRK");
console.log("─".repeat(84));
const easy = findRotationPartners({ targets: [{ p: mk(100, 40, 2), teamId: 40 }],
  candidates: cands, gwFrom: 1, horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty });
ok(easy.hard.length === 0 && easy.results.length === 0 && easy.totalNeed === 0,
  "engar erfiðar umferðir -> TÓMT svar (ekki tillögur sem enginn bað um)");
const none = findRotationPartners({ targets: [], candidates: cands, gwFrom: 1,
  horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty });
ok(none.results.length === 0 && Array.isArray(none.gws), "enginn valinn -> tómt, ekkert hrun");
ok(findRotationPartners({ targets: [target], candidates: [], gwFrom: 1, horizon: 6,
  maxGw: 6, fixByTeamGw, fixDifficulty }).results.length === 0, "tóm laug -> tómt, ekkert hrun");
const noFx = findRotationPartners({ targets: [target], candidates: cands, gwFrom: 1,
  horizon: 6, maxGw: 6, fixByTeamGw: {}, fixDifficulty });
ok(noFx.hard.length === 6 && noFx.hard.every(h => h.need === BLANK_NEED)
   && noFx.results.length === 0,
  "engir leikir í gögnum -> allar 6 umferðir auðar, engin tillaga, ekkert hrun");
const nullDiff = findRotationPartners({ targets: [target], candidates: cands, gwFrom: 1,
  horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty: () => null });
ok(nullDiff.hard.length === 0, "FFDR ófáanlegt (null) -> engin þörf ályktuð, engin ágiskun");
const lim = findRotationPartners({ targets: [target], candidates: cands, gwFrom: 1,
  horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty, limit: 1 });
ok(lim.results.length === 1, "limit virkar");
ok(R.results.every(r => r.cover > 0),
  "sá sem þekur ENGA erfiða umferð er ekki tillaga (þekja > 0 skilyrði)");

/* VERÐÞAKIÐ — vörður um raunverulega gagnsemi, sjá skýringu í rotation.js */
const dear = { p: { ...mk(500, 20, 4, "9.0"), now_cost: 145 }, teamId: 20 };
const withDear = findRotationPartners({ targets: [target], candidates: [...cands, dear],
  gwFrom: 1, horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty });
ok(withDear.results[0]?.p.id === 500,
  "ÁN verðþaks vinnur dýri framherjinn (£14,5) — rétt svar við annarri spurningu");
const capped = findRotationPartners({ targets: [target], candidates: [...cands, dear],
  gwFrom: 1, horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty, maxTenths: 70 });
ok(capped.results.every(r => r.p.now_cost <= 70) && capped.results[0]?.p.id === 200,
  "MEÐ verðþaki £7,0 fellur hann út og spegilmyndin vinnur — listinn verður nothæfur");
ok(capped.results.length === withDear.results.length - 1,
  "þakið fjarlægir AÐEINS þá sem eru of dýrir, ekki neitt annað");

/* ---------- 6. Raunveruleg gögn ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("6. RAUNVERULEG GÖGN — data/players.json + fixtures.json");
console.log("─".repeat(84));
const J = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const players = (J("players.json").players || J("players.json"));
const fixtures = (J("fixtures.json").fixtures || J("fixtures.json"));
const rf = {};
for (const f of fixtures) {
  if (!f.event) continue;
  const add = (t, o, h, d) => {
    rf[t] = rf[t] || {};
    (rf[t][f.event] = rf[t][f.event] || []).push({ opp: o, home: h, fdr: d, id: f.id });
  };
  add(f.team_h, f.team_a, true, f.team_h_difficulty);
  add(f.team_a, f.team_h, false, f.team_a_difficulty);
}
/* opinbert FDR sem erfiðleikafall — nóg til að prófa PÍPULAGNIRNAR á
   raunverulegum formum (auðar umferðir, tvöfaldar, 20 lið).            */
const realDiff = (teamId, fx) => (fx?.fdr != null ? fx.fdr : null);
ok(players.length > 400 && fixtures.length > 300,
  `raunveruleg gögn lesin (${players.length} leikmenn, ${fixtures.length} leikir)`);

/* finna varnarmann sem Á erfiðar umferðir í raun */
let found = null;
for (const p of players.filter(x => x.element_type === 2).slice(0, 120)) {
  const r = findRotationPartners({
    targets: [{ p, teamId: p.team }],
    candidates: candidatePool(players, [{ p, teamId: p.team }]),
    gwFrom: 1, horizon: 6, maxGw: 38, fixByTeamGw: rf, fixDifficulty: realDiff,
    ownedIds: new Set(), limit: 5 });
  if (r.hard.length && r.results.length) { found = { p, r }; break; }
}
ok(found, "fann raunverulegan varnarmann með erfiðar umferðir OG raunveruleg pör");
if (found) {
  const { p, r } = found;
  console.log(`  ${p.web_name} — erfitt: ${r.hard.map(h => "GW" + h.gw).join(", ")}`);
  for (const x of r.results.slice(0, 5))
    console.log(`    ${x.p.web_name.padEnd(14)} þekja ${String(x.cover).padStart(3)}%  vinningur ${x.gain.toFixed(2)}`);
  ok(r.results.every(x => x.p.element_type !== 1),
    "EKKI EINN MARKMAÐUR í tillögum fyrir varnarmann (stöðu-reglan á raunverulegum gögnum)");
  ok(r.results.every(x => x.p.id !== p.id), "maðurinn sjálfur ekki í eigin tillögum");
  ok(r.results.every(x => Number.isFinite(x.gain) && Number.isFinite(x.cover)),
    "engin NaN í vinningi eða þekju á raunverulegum gögnum");
  ok(r.results.every(x => x.cover >= 0 && x.cover <= 100), "þekja er á 0-100");
  ok(r.results.every((x, i, a) => i === 0 || a[i - 1].gain >= x.gain),
    "raðað fallandi eftir vinningi");
  ok(r.results.every(x => x.per.length === r.hard.length),
    "hver tillaga hefur rúta fyrir HVERJA erfiða umferð (ekkert vantar í grindina)");
}
/* markmaður -> aðeins markmenn, á raunverulegum gögnum */
let gkOk = null;
for (const p of players.filter(x => x.element_type === 1).slice(0, 40)) {
  const r = findRotationPartners({ targets: [{ p, teamId: p.team }],
    candidates: candidatePool(players, [{ p, teamId: p.team }]),
    gwFrom: 1, horizon: 6, maxGw: 38, fixByTeamGw: rf, fixDifficulty: realDiff, limit: 5 });
  if (r.results.length) { gkOk = r; break; }
}
ok(gkOk && gkOk.results.every(x => x.p.element_type === 1),
  "markmaður á raunverulegum gögnum -> AÐEINS markmenn í tillögum");

console.log(`\nRÓTERINGS-PAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
