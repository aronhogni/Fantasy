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
  candidatePool, coversNeed, findRotationPartners, gwCell, horizonGws, needOf,
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
  40: { 1: 2.0, 2: 2.0, 3: 2.0, 4: 2.0, 5: 2.0, 6: 2.0 },  // flatur GRAENN (threp 1)
  /* Lid fyrir throskulds-profid. ATH: 2,00 er GRAENT, ekki hlutlaust —
     hlutlaust threp er 2,32-2,54 skv. TIER_CUTS. Thad var min villa i
     fyrstu utgafu profsins og kodinn hafdi rett fyrir ser.              */
  50: { 1: 2.40, 2: 2.40, 3: 2.40, 4: 2.40, 5: 2.40, 6: 2.40 }, // flatur HVITUR
  60: { 1: 1.60, 2: 1.60, 3: 1.60, 4: 1.60, 5: 1.60, 6: 1.60 }, // flatur DOKKGRAENN
  70: { 1: 2.45, 2: 2.45, 3: 2.45, 4: 2.45, 5: 2.45, 6: 2.45 }, // annar HVITUR
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
ok(TIER_NEED[0] === 0 && TIER_NEED[1] === 0,
  "dökkgrænt og grænt kalla ALDREI á hjálp (þyngd 0)");
ok(needOf({ blank:false, tier:2 }) === 0 && needOf({ blank:false, tier:2 }, 2) === TIER_NEED[2],
  `hlutlaust er 0 við SJÁLFGEFINN þröskuld en ${TIER_NEED[2]} þegar hann er færður í 2`);
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
ok(!capped.results.some(r => r.p.id === 500) &&
   !capped.results.some(r => r.others.some(o => o.id === 500)),
  "þakið fjarlægir dýra manninn ALVEG — hann leynist ekki í +N heldur");
ok(capped.results.some(r => r.teamId === 20 && r.p.id === 200),
  "lið 20 heldur röð sinni, nú með spegilmyndina í forsvari (dýri var í SAMA liði)");

/* ---------- 5b. EITT LID = EIN ROD ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("5b. EITT LIÐ = EIN RÖÐ (FFDR er eiginleiki liðsins)");
console.log("─".repeat(84));
{
  /* thrir varnarmenn i SAMA lidi (20) -> eiga NAKVAEMLEGA somu sex leiki */
  const three = [
    { p: mk(201, 20, 2, "6.0"), teamId: 20 },
    { p: mk(202, 20, 2, "5.0"), teamId: 20 },
    { p: mk(203, 20, 2, "4.0"), teamId: 20 },
    { p: mk(400, 40, 2, "5.0"), teamId: 40 },
  ];
  const g = findRotationPartners({ targets: [target], candidates: three, gwFrom: 1,
    horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty });
  console.log(`  ${g.results.map(r => `${r.p.web_name}(+${r.others.length})`).join("  ")}`);
  ok(g.results.length === 2,
    `þrír úr liði 20 + einn úr 40 -> TVÆR raðir, ekki fjórar (${g.results.length})`);
  const t20 = g.results.find(r => r.teamId === 20);
  ok(t20 && t20.p.id === 201,
    "BESTI mannsins úr liðinu er sá sem birtist (hæsta vænt stig)");
  ok(t20 && t20.others.length === 2 && t20.others.every(o => o.team === 20),
    `hinir tveir eru taldir og fylgja með (+${t20?.others.length})`);
  ok(t20 && t20.others.every(o => o.id !== t20.p.id), "sá sem birtist er ekki líka í +N");
  const flat = findRotationPartners({ targets: [target], candidates: three, gwFrom: 1,
    horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty, byTeamOnly: false });
  ok(flat.results.length === 4 && flat.results.every(r => r.others.length === 0),
    "byTeamOnly:false gefur ALLA (svo hægt sé að slá þetta af)");
}

/* ---------- 5c. HLUTLAUSIR LEIKIR: "graenn a moti hvitum" ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("5c. ÞRÖSKULDUR — hvítur leikur er UPPFÆRANLEGUR");
console.log("─".repeat(84));
{
  /* Lid 50 er FLATUR HVITUR (2,40 alla sex) — VVD-daemid notandans:
     ekki vondur leikur, en UPPFAERANLEGUR ef annar a graenan.            */
  const flatTarget = { p: mk(110, 50, 2), teamId: 50 };
  const cands2 = [{ p: mk(600, 60, 2), teamId: 60 },   // 1,60 dokkgraent
                  { p: mk(700, 70, 2), teamId: 70 }];  // 2,45 annar hvitur
  const d3 = findRotationPartners({ targets: [flatTarget], candidates: cands2,
    gwFrom: 1, horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty, hardFrom: 3 });
  ok(d3.hard.length === 0,
    "þröskuldur 3 (dökkgult): hvítur leikur telst EKKI erfiður — óbreytt hegðun");
  ok(coversNeed({ blank:false, tier:1 }, 2) && !coversNeed({ blank:false, tier:2 }, 2)
     && !coversNeed({ blank:true }, 2),
    "coversNeed: þrep UNDIR þröskuldi þekur, jafnt þrep gerir ekki, auð umferð aldrei");
  const d2 = findRotationPartners({ targets: [flatTarget], candidates: cands2,
    gwFrom: 1, horizon: 6, maxGw: 6, fixByTeamGw, fixDifficulty, hardFrom: 2 });
  console.log(`  þröskuldur 2: ${d2.hard.length} umferðir, þyngd ${d2.totalNeed}` +
    ` · pör: ${d2.results.map(r => r.p.web_name + " " + r.cover + "%").join(", ")}`);
  ok(d2.hard.length === 6 && d2.hard.every(h => h.need === TIER_NEED[2]),
    `þröskuldur 2: allir sex hvítu teljast, þyngd ${TIER_NEED[2]} hver`);
  ok(TIER_NEED[2] > 0 && TIER_NEED[2] < TIER_NEED[3],
    `hlutlaust vegur MINNA en dökkgult (${TIER_NEED[2]} < ${TIER_NEED[3]}) — forgangur heldur`);
  const green = d2.results.find(r => r.p.id === 600);
  ok(green && green.cover === 100,
    "GRÆNI (dökkgrænt 1,60) þekur hvítu umferðirnar 100% — þetta er það sem beðið var um");
  ok(!d2.results.find(r => r.p.id === 700),
    "annar HVÍTUR þekur EKKI hvítt: þekja krefst þreps UNDIR þröskuldi, ekki jafns");
}

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
  /* RADAD EFTIR FFDR — LETTASTA PROGRAMMID FYRST (beidni 7.8.2026).
     Adur var radad eftir VINNINGI; sú stadhaefing er hér snuin vid.    */
  ok(r.results.every((x, i, a) => i === 0 || (a[i - 1].ffdr ?? 99) <= (x.ffdr ?? 99)),
    "raðað VAXANDI eftir FFDR (léttasta prógrammið efst)");
  ok(r.results.every(x => x.ffdr == null || (x.ffdr > 0 && x.ffdr < 7)),
    "medal-FFDR er a vitrænu bili (auð umferd faer BLANK_FFDR=6)");
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

/* ---------- 7. BYRJUNAR-GOLFID — varamadur sem spilar ekki er EKKI par ----------
   Notandinn sa varamarkmenn sem spila ALDREI a listanum (4.8.2026):
   heilbrigdur (tiltaekileiki 1,0), odyr og med graena leiki lidsins.
   Golfid notar 6h-likanid: MAELT a raungognum eru hreinir varamarkmenn
   P=0,038 en hvildur adalmadur (Raya GW38) P=0,47 — MIN_START_PROB=0,15
   sker med breidu bili a bada boga. LYKILATRIDI: P=null (engin gogn,
   t.d. nyr leikmadur) utilokar EKKI — "engin gogn" er ekki "bekkur".   */
console.log(`\n${"─".repeat(84)}`);
console.log("7. BYRJUNAR-GOLFID OG -VOGIN (startProbOf)");
console.log("─".repeat(84));
{
  const { MIN_START_PROB } = await import("../src/rotation.js");
  ok(MIN_START_PROB === 0.15,
    `golfid er 0,15 — undir hvildar-adalmanni (0,47) og yfir hreinum varamanni (0,038)`);

  /* minn madur (lid 10, thungur 2 og 4) + tveir frambjodendur i SAMA
     spegil-lidi (20): adalmadurinn P=0,9 og varamadurinn P=0,04.
     byTeamOnly:false svo badir sjaist; eini munurinn er P.              */
  const me = mk(1, 10), star = mk(2, 20), backup = mk(3, 20);
  const P = { 2: 0.9, 3: 0.04 };
  const args = {
    targets: [{ p: me, teamId: 10 }],
    candidates: [{ p: star, teamId: 20 }, { p: backup, teamId: 20 }],
    gwFrom: 1, horizon: 6, maxGw: 38, fixByTeamGw, fixDifficulty,
    byTeamOnly: false,
  };
  const r1 = findRotationPartners({ ...args, startProbOf: p => P[p.id] ?? null });
  ok(r1.results.some(x => x.p.id === 2), "adalmadurinn (P=0,9) er a listanum");
  ok(!r1.results.some(x => x.p.id === 3),
    "varamadurinn (P=0,04) er EKKI a listanum thott leikir lidsins seu eins");
  ok(r1.results.find(x => x.p.id === 2)?.startP === 0.9,
    "byrjunar-likurnar fylgja rodinni (fyrir birtingu i UI)");

  /* engin gogn (null) utilokar EKKI — nyr leikmadur an sogu er i lauginni */
  const r2 = findRotationPartners({ ...args, startProbOf: p => (p.id === 3 ? null : P[p.id]) });
  ok(r2.results.some(x => x.p.id === 3),
    "P=null (engin gogn) utilokar EKKI — nyr leikmadur helst i lauginni");

  /* an startProbOf er hegdunin OBREYTT (gamla leidin) */
  const r3 = findRotationPartners(args);
  ok(r3.results.some(x => x.p.id === 3),
    "an startProbOf er engin utilokun (bakvirk samhaefni)");

  /* VOGIN: tveir eins menn, P 0,9 og 0,5 -> sa med haerri P vinnur.
     Badir yfir golfinu, sami FFDR, sama verd — adeins P skilur.        */
  const a = mk(4, 20), b = mk(5, 20);
  const P2 = { 4: 0.5, 5: 0.9 };
  const r4 = findRotationPartners({
    targets: [{ p: me, teamId: 10 }],
    candidates: [{ p: a, teamId: 20 }, { p: b, teamId: 20 }],
    gwFrom: 1, horizon: 6, maxGw: 38, fixByTeamGw, fixDifficulty,
    byTeamOnly: false, startProbOf: p => P2[p.id] ?? null,
  });
  const ia = r4.results.findIndex(x => x.p.id === 4);
  const ib = r4.results.findIndex(x => x.p.id === 5);
  ok(ib >= 0 && ia >= 0 && ib < ia,
    `vinningurinn er VEGINN med P: sa med 0,9 radast ofar theim med 0,5 (${ib} < ${ia})`);
  const g4 = r4.results[ia].gain, g5 = r4.results[ib].gain;
  ok(g5 > g4, `vegni vinningurinn er staerri hja P=0,9 (${g5} > ${g4})`);

  /* MARKMADURINN SJALFUR er lika veginn: sami frambjodandi gefur MEIRI
     vinning gegn manni sem spilar ekki (ep hans nalgast 0).            */
  const r5 = findRotationPartners({
    targets: [{ p: me, teamId: 10 }],
    candidates: [{ p: star, teamId: 20 }],
    gwFrom: 1, horizon: 6, maxGw: 38, fixByTeamGw, fixDifficulty,
    byTeamOnly: false, startProbOf: p => (p.id === 1 ? 0.2 : 0.9),
  });
  const r6 = findRotationPartners({
    targets: [{ p: me, teamId: 10 }],
    candidates: [{ p: star, teamId: 20 }],
    gwFrom: 1, horizon: 6, maxGw: 38, fixByTeamGw, fixDifficulty,
    byTeamOnly: false, startProbOf: p => (p.id === 1 ? 0.9 : 0.9),
  });
  ok(r5.results[0].gain > r6.results[0].gain,
    "vogin er symmetrisk: vinningur eykst thegar MINN madur spilar sjaldnar");
}

/* ================================================================
   8. SUMARGLUGGINN — BYRJUNAR-GOLFID VAR OVIRKT FYRIR ALLA SEM SKIPTU

   Notandinn sa thetta: Meslier var bodinn sem roterings-par hja Arsenal
   thott hann sé varamarkmadur med `starts5: 0, mins5: 0`. Golfid
   (MIN_START_PROB) AETTI ad sia hann burt og gerdi thad ekki.

   ORSOKIN VAR EKKI I GOLFINU HELDUR I UPPFLETTINGUNNI. `imminent.json`
   bar lid SIDASTA timabils (Meslier undir LEE) en appid flettir upp eftir
   lidi leikmannsins I DAG (ARS). Uppflettingin misheppnadist, `P` vard
   null — og null-reglan (`P=null utilokar ALDREI`, kafli 3d) hleypti
   honum i gegn. Golfid VIRTIST virka; thad var einfaldlega aldrei spurt.
   Maelt 8.8.2026: 38 leikmenn voru skradir a rangt lid.

   NULL-REGLAN SJALF STENDUR — hun er rett fyrir menn sem eiga ENGIN gogn
   (nyir i deildinni). Thad sem var rangt var ad bua til fals-null.
   ================================================================ */
console.log(`\n${"─".repeat(72)}\n8. SUMARGLUGGINN — lid i imminent.json verdur ad vera lid DAGSINS\n${"─".repeat(72)}`);
{
  const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
  let imm = null, players = null, teams = null;
  try { imm = read("imminent.json"); players = read("players.json").players; teams = read("teams.json").teams; }
  catch { /* skrar mega vanta */ }

  if (!imm || !players || !teams) {
    ok(true, "gagnaskrar vantar — kafli sleppt");
  } else {
    const shortById = Object.fromEntries(teams.map(t => [t.id, t.short]));
    const immByCode = new Map((imm.players || []).filter(r => r.code != null).map(r => [r.code, r]));
    ok(immByCode.size > 300,
       `imminent.json ber \`code\` a ${immByCode.size} rodum (an hans er engin orugg uppfletting)`);

    const wrong = [];
    for (const p of players) {
      const r = immByCode.get(p.code);
      if (!r) continue;                       // ekki i glugganum — annad mal
      const cur = shortById[p.team];
      if (cur && r.team !== cur) wrong.push(`${p.web_name}: ${r.team} != ${cur}`);
    }
    ok(wrong.length === 0,
       `hver rod ber lid DAGSINS${wrong.length ? ` — ${wrong.length} rangar: ` + wrong.slice(0, 5).join(", ") : ""}`);

    /* Og hid raunverulega tilfelli: varamadur med 0 minutur i glugganum
       verdur ad fa MAELDA byrjunar-liku undir golfinu — ekki null.      */
    /* AÐEINS their sem eru I DEILDINNI I DAG. Hinir (423 alls) eru menn
       sem foru ur deildinni — their eiga engan mann i dag og thad er RETT
       ad their finnist ekki. Ad telja tha med vaeri ad maela brottfor sem
       villu.                                                            */
    const curByCode = new Map(players.map(p => [p.code, p]));
    const zero = (imm.players || []).filter(r =>
      r.code != null && curByCode.has(r.code)
      && r.start_feats && r.start_feats.mins5 === 0 && r.start_feats.starts5 === 0);
    ok(zero.length > 0,
       `menn i deildinni i dag med 0 minutur i glugganum: ${zero.length} (their eiga ad MAELAST lagir, ekki hverfa)`);
    const found = zero.filter(r => shortById[curByCode.get(r.code).team] === r.team);
    ok(found.length === zero.length,
       `hver theirra er finnanlegur undir sinu lidi i dag — annars sleppur hann gegnum golfid (${found.length}/${zero.length})`);
  }
}

console.log(`\nRÓTERINGS-PAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
