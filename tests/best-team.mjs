/* ============================================================
   VORDUR: "PICK BEST TEAM" (`src/bestteam.js`)

   HVAD ER PROFAD HER OG HVAD ER ThAD EKKI:
   Thetta safn ver LEITINA, ekki skorid. Skorid er `expPointsFor` og
   thad er thegar vardad i `model.test.mjs` kafla 3 og `exp-points.mjs`.
   Kafli 4 her KALLAR thad samt beint — ekki til ad endurmaela thad,
   heldur til ad sannreyna ad tiltaekileiki, audar umferdir og tvofaldar
   umferdir RENNI I RAUN gegnum velina. Ad gefa ser thad er nakvaemlega
   villan sem CLAUDE.md kafli 3 lysir ("golfid virtist virka; thad var
   einfaldlega aldrei spurt").

   PROFSTEINNINN ER KAFLI 1: TAEMANDI LEIT. Velin er GRADUG (sonnun i
   haus `bestteam.js`), svo fullyrdingin "graduga rodin er optimal" er
   ekki lesin ur athugasemd heldur STADFEST med thvi ad telja upp ALLAR
   C(15,11)=1.365 samsetningar a slembnum hopum og krefjast thess ad
   velin nai NAKVAEMLEGA hamarkinu. Se hun einhvern tima ekki optimal
   fellur thetta safn og THA — en ekki fyrr — a ad skipta i taemandi leit.

   KEYRSLA: node tests/best-team.mjs   (~3 s, engin net-koll)
   ============================================================ */
import { pickXi, bestTeamPlan, benchSwapPairs, legalFormation, posKey,
         XI_MAX, XI_SIZE, POS_ORDER } from "../src/bestteam.js";
import { expPointsFor } from "../src/model.js";
/* Adeins fyrir mismunar-profid i kafla 8 (fer ut med patchinu). */
import { bestXi, withDerived } from "../src/stats.js";
import { readFileSync } from "node:fs";
const REPORT = (() => {
  try { return JSON.parse(readFileSync(new URL("../data/last_gw.json", import.meta.url).pathname, "utf8")); }
  catch { return null; }
})();

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`); }
};
const eq = (a, b, n) => ok(n, a === b, `fekk ${JSON.stringify(a)}, vaenti ${JSON.stringify(b)}`);
const near = (a, b, tol, n) => ok(n, Math.abs(a - b) <= tol, `${a} vs ${b}`);

/* Endurgeranleg slembitala — safn sem gefur sitt hvad i hverri keyrslu
   er ekki vordur heldur frett.                                          */
let seed = 20260820;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const SQUAD_POS = ["GK", "GK", "DEF", "DEF", "DEF", "DEF", "DEF",
                   "MID", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD"];
/* SJALFGEFNA UPPSTILLINGIN VERDUR AD VERA LEYFILEG (1-3-5-2). Fyrsta
   utgafa profsins notadi "fyrstu 11 saetin", sem er 2 GK / 5 DEF / 4 MID
   / 0 FWD — uppstilling sem appid getur ekki verid i, svo vixla-kaflinn
   hefdi verid maeldur a heimi sem er ekki til.                          */
const DEFAULT_START = new Set([0, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13]);
function squad(scores, starters = DEFAULT_START) {
  return SQUAD_POS.map((pos, i) => ({
    id: 100 + i, pos, order: i + 1, starter: starters.has(i), s: scores[i],
  }));
}
const SC = s => s.s;
const randScores = () => SQUAD_POS.map(() => {
  const r = rnd();
  if (r < 0.10) return null;             // vantandi skor
  if (r < 0.20) return 0;                // maeld nulltala (aud umferd / meiddur)
  return +(rnd() * 9).toFixed(2);
});

/* -------- OHAD VIDMIDS-UTFAERSLA: TAEMANDI LEIT --------
   Vidmidid ma ekki deila LINU med thvi sem thad maelir. Thess vegna er
   thetta ber upptalning yfir ollum 11-manna hlutmengjum, engin
   stodu-korf, engin rodun, engin lagmarks-umferd.                       */
function brute(seats, score) {
  const n = seats.length;
  let best = -Infinity, legalSeen = 0;
  const idx = [];
  const rec = (start) => {
    if (idx.length === XI_SIZE) {
      const c = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
      let tot = 0;
      for (const i of idx) { c[seats[i].pos]++; const v = score(seats[i]); tot += Number.isFinite(v) ? v : 0; }
      if (!legalFormation(c)) return;
      legalSeen++;
      if (tot > best) best = tot;
      return;
    }
    for (let i = start; i < n; i++) { idx.push(i); rec(i + 1); idx.pop(); }
  };
  rec(0);
  return { total: best, legalSeen };
}

console.log(`\n${"=".repeat(84)}`);
console.log("PICK BEST TEAM — leitin, formasjonin, bekkurinn og vixlin");
console.log("=".repeat(84));

/* ============================================================
   1. TAEMANDI LEIT: ER GRADUGA RODIN OPTIMAL?
   ============================================================ */
console.log("\n=== 1. GRADUGT = OPTIMAL (taemandi leit yfir hvern hop) ===");
let worst = 0, tried = 0, legalTotal = 0, brokeAt = -1;
for (let t = 0; t < 200; t++) {
  const sq = squad(randScores());
  const g = pickXi(sq, SC, { tiebreak: (a, b) => a.id - b.id });
  const b = brute(sq, SC);
  legalTotal += b.legalSeen;
  tried++;
  const gap = b.total - g.total;
  if (gap > worst) worst = gap;
  if (gap > 1e-9) { brokeAt = t; break; }
}
ok(`gradugt = optimal i ${tried} slembnum hopum (versta frabrigdi ${worst.toExponential(1)})`,
   worst <= 1e-9, brokeAt >= 0 ? `fyrsta frabrigdi i hop #${brokeAt}` : "");
/* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b): fann upptalningin
   raunverulega leyfileg lid? An thessa gaeti `brute` skilad -Infinity
   fyrir hvern hop og samanburdurinn vaeri sjalfgefid graenn.             */
ok(`upptalningin fann leyfileg lid (${legalTotal} talin, ${Math.round(legalTotal / tried)} per hop)`,
   legalTotal / tried > 300);

/* TILRAUN TIL ADSKILNADAR — SMIdUD TILVIK ThAR SEM "LAGMORKIN FYRST"
   AETTI AD BREGDAST EF SONNUNIN ER RONG. Oll thessi eru tilfelli thar
   sem lagmarkid thvingar VEIKA menn inn (varnarlinan verdlaus, midjan
   frabaer) — thad er einmitt myndin sem laetur "gradugt" lita grunsamlegt
   ut. Faist ekkert frabrigdi her heldur er thad SJALFT sonnunin i verki. */
const traps = [
  { name: "vorn verdlaus, midja frabaer",
    s: [1, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 9, 0, 0] },
  { name: "sokn thvingud inn med 0", s: [4, 1, 9, 9, 9, 9, 9, 8, 8, 8, 8, 8, 0, 0, 0] },
  { name: "allir jafnir", s: SQUAD_POS.map(() => 3) },
  { name: "adeins tveir med stig", s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 0] },
  { name: "badir markverdir 0", s: [0, 0, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 4, 4, 4] },
  { name: "negativ skor", s: [-1, -2, -3, -1, -5, -9, -2, -1, -1, -1, -1, -1, -8, -9, -9] },
  { name: "ein stjarna i hverri stodu", s: [9, 0, 9, 0, 0, 0, 0, 9, 0, 0, 0, 0, 9, 0, 0] },
];
for (const tr of traps) {
  const sq = squad(tr.s);
  const g = pickXi(sq, SC, { tiebreak: (a, b) => a.id - b.id });
  const b = brute(sq, SC);
  near(g.total, b.total, 1e-9, `gildra "${tr.name}": ${g.total.toFixed(2)} = hamark ${b.total.toFixed(2)}`);
}

/* ============================================================
   2. LOGMAETI: HVERT SKILAD XI ER LEYFILEGT
   ============================================================ */
console.log("\n=== 2. FPL-FORMASJON — hvert einasta skilad XI ===");
let badLegal = 0, badSize = 0, badBench = 0, badDisjoint = 0;
for (let t = 0; t < 300; t++) {
  const sq = squad(randScores());
  const r = bestTeamPlan({ seats: sq, score: SC });
  if (r.xi.length !== XI_SIZE) badSize++;
  if (r.count.GK !== 1 || r.count.DEF < 3 || r.count.DEF > 5 || r.count.MID < 2 ||
      r.count.MID > 5 || r.count.FWD < 1 || r.count.FWD > 3) badLegal++;
  if (r.bench.length !== 3 || !r.benchGk) badBench++;
  const ids = new Set([...r.xi, ...r.bench, r.benchGk].map(x => x.id));
  if (ids.size !== 15) badDisjoint++;
}
eq(badSize, 0, "alltaf nakvaemlega 11 i byrjunarlidi (300 hopar)");
eq(badLegal, 0, "1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD i ollum 300");
eq(badBench, 0, "bekkurinn er alltaf 3 utileikmenn + 1 markvordur");
eq(badDisjoint, 0, "XI + bekkur + bekkjar-GK = 15 einkvaem id (engin tvitekning)");
ok("legalFormation hafnar 10 monnum", !legalFormation({ GK: 1, DEF: 3, MID: 5, FWD: 1 }));
ok("legalFormation hafnar 2 markvordum", !legalFormation({ GK: 2, DEF: 3, MID: 5, FWD: 1 }));
ok("legalFormation hafnar 6 i vorn", !legalFormation({ GK: 1, DEF: 6, MID: 3, FWD: 1 }));
ok("legalFormation hafnar 12 monnum", !legalFormation({ GK: 1, DEF: 5, MID: 5, FWD: 2 }));
ok("legalFormation hafnar 1 i midju", !legalFormation({ GK: 1, DEF: 5, MID: 1, FWD: 3 }));
ok("legalFormation tekur 1-4-4-2", legalFormation({ GK: 1, DEF: 4, MID: 4, FWD: 2 }));
ok("legalFormation tekur 1-3-5-2", legalFormation({ GK: 1, DEF: 3, MID: 5, FWD: 2 }));
ok("legalFormation tekur 1-5-2-3", legalFormation({ GK: 1, DEF: 5, MID: 2, FWD: 3 }));
/* Stodu-vorpunin tekur BADAR framsetningar (strengur og element_type) —
   annars hefdi kallandinn thurft sjounda afritid af `const POS`.        */
eq(posKey(3), "MID", "element_type 3 -> MID");
eq(posKey("FWD"), "FWD", "strengur skilar ser");
eq(posKey(5), null, "othekkt element_type -> null (ekki rong korf)");
eq(posKey(undefined), null, "vantandi stada -> null");
/* Hopur MED othekktri stodu ma ekki fella velina — og madurinn a ad
   vera sleppt, ekki settur i ranga korfu (sama regla og App.jsx:rows). */
const weird = [...squad(SQUAD_POS.map(() => 5)), { id: 999, pos: "MGR", order: 16, starter: false, s: 99 }];
const wr = pickXi(weird, SC);
eq(wr.xi.length, 11, "othekkt stada fellir ekki velina");
ok("othekkt stada kemst ekki i lidid", !wr.xi.some(x => x.id === 999) && !wr.bench.some(x => x.id === 999));

/* ============================================================
   3. JAFNTEFLI, IDEMPOTENS OG ROD INNTAKSINS
   ============================================================ */
console.log("\n=== 3. SAMA INNTAK -> SAMA LID (takkinn ma ekki flokta) ===");
const tieSq = squad(SQUAD_POS.map(() => 4));      // ALLIR jafnir: verstu adstaedur
const t1 = bestTeamPlan({ seats: tieSq, score: SC });
const t2 = bestTeamPlan({ seats: tieSq, score: SC });
eq(JSON.stringify(t1), JSON.stringify(t2), "tvo kold koll gefa sama svar (idempotens)");
/* HRIST INNTAK. Saeta-fylkid kemur ur React-state og rod thess er engin
   trygging; hrein stodug rodun gaefi tha annad lid ur SOMU tolum.       */
let shuffleDiff = 0;
const keyOf = r => r.xi.map(x => x.id).sort((p, q) => p - q).join(",") + "|" +
                   r.bench.map(x => x.id).join(",") + "|" + r.benchGk?.id;
for (let t = 0; t < 60; t++) {
  const sq = squad(randScores());
  const a = bestTeamPlan({ seats: sq, score: SC });
  const b = bestTeamPlan({ seats: sq.slice().sort(() => rnd() - 0.5), score: SC });
  if (keyOf(a) !== keyOf(b)) shuffleDiff++;
}
eq(shuffleDiff, 0, "hrist inntak gefur SAMA lid (jafntefli leyst a id, ekki a rod)");

/* ============================================================
   4. SKORID RENNUR I RAUN — expPointsFor, EKKI TILBUIN TALA
   ============================================================ */
console.log("\n=== 4. TILTAEKILEIKI, AUdAR OG TVOFALDAR UMFERDIR (raunverulegt expPointsFor) ===");
const flat = () => 2.7;
const NOW = Date.UTC(2026, 7, 20);
const P = (et, extra = {}) => ({ element_type: et, status: "a", ep_next: "5.0",
                                 points_per_game: "4.0", team: 1, ...extra });
const ONE = [{ opp: 2, home: true, fdr: 3, kickoff: "2026-08-22T14:00:00Z" }];
const ET = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
function realSquad(mod = {}) {
  return SQUAD_POS.map((pos, i) => {
    const m = mod[i] || {};
    return { id: 100 + i, pos, order: i + 1, starter: DEFAULT_START.has(i),
             p: P(ET[pos], m.p || {}), fxs: m.fxs === undefined ? ONE : m.fxs };
  });
}
const realScore = s => expPointsFor({ p: s.p, fxs: s.fxs, fixDifficulty: flat, teamId: 1, nowTs: NOW });

/* (a) 0% TILTAEKILEIKI. `expPointsFor` a ad gefa 0 og hann a thvi ad
   detta ut af sjalfu ser — engin sia i thessari skra.                   */
const injured = realSquad({ 7: { p: { status: "i", chance_of_playing_next_round: 0 } } });
eq(realScore(injured[7]), 0, "expPointsFor gefur 0 fyrir 0% tiltaekileika");
ok("0%-madur byrjar ekki (fellur ut af skorinu, ekki af siu)",
   !bestTeamPlan({ seats: injured, score: realScore }).xi.some(x => x.id === 107));
/* NULL vs 0: `status:"a"` med ovitad `chance` er FULLT tiltaekur (FPL
   status er einratt), en `status:"d"` an prosentu er 0. Thad er REGLA
   `availForKickoff` og hun er STADFEST her, ekki gefin ser.             */
near(realScore({ p: P(3, { chance_of_playing_next_round: null }), fxs: ONE }),
     realScore({ p: P(3), fxs: ONE }), 1e-9,
     'status "a" + ovitad chance = fullt tiltaekur');
eq(realScore({ p: P(3, { status: "d", chance_of_playing_next_round: null }), fxs: ONE }), 0,
   'status "d" + ovitad chance = 0 (FPL-status er einratt)');
near(realScore({ p: P(3, { status: "d", chance_of_playing_next_round: 50 }), fxs: ONE }),
     0.5 * realScore({ p: P(3), fxs: ONE }), 1e-9, "50% = halft skor (linulegt)");

/* (b) AUD UMFERD. `fxs: []` -> 0 stig -> bekkur.                        */
const blank = realSquad({ 8: { fxs: [] } });
eq(realScore(blank[8]), 0, "aud umferd = 0 stig");
ok("mann med auda umferd er settur a bekkinn",
   !bestTeamPlan({ seats: blank, score: realScore }).xi.some(x => x.id === 108));

/* (c) TVOFOLD UMFERD. Sami leikmadur, tveir leikir: 2x stig. Hopurinn
   er stilltur svo ad ADEINS EITT sokn-saeti se thess virdi (vorn/midja
   med haerri grunn), svo tvofalda umferdin verdur ad VINNA saetid gegn
   tveimur jafngodum monnum med einn leik — an nokkurrar reglu um
   tvofaldar umferdir i thessari skra.                                   */
const strong = {}; for (let i = 2; i <= 11; i++) strong[i] = { p: { ep_next: "8.0" } };
for (let i = 12; i <= 14; i++) strong[i] = { p: { ep_next: "5.0" } };
const dblSq = realSquad({ ...strong, 12: { p: { ep_next: "5.0" }, fxs: [...ONE, ...ONE] } });
near(realScore(dblSq[12]), 2 * realScore(dblSq[13]), 1e-9, "tvofold umferd = 2x einfoldur leikur");
const rd = bestTeamPlan({ seats: dblSq, score: realScore });
ok("tvofold umferd tekin fram yfir jafngoda menn med einn leik",
   rd.xi.some(x => x.id === 112) && rd.count.FWD === 1,
   `FWD=${rd.count.FWD}, XI=${rd.xi.map(x => x.id).join(",")}`);
ok("hinir tveir framherjarnir eru a bekknum", rd.bench.filter(b => b.pos === "FWD").length === 2);

/* (d) SUMMAN SEM ER BIRT ER SUMMA XI-SKORANNA — ekki 15-manna summa. */
const rr = bestTeamPlan({ seats: realSquad(), score: realScore });
near(rr.total, rr.xi.reduce((a, x) => a + x.score, 0), 1e-3, "`total` = summa byrjunarlidsins");
ok("`total` er LAEGRI en 15-manna summan (bekkurinn er ekki talinn)",
   rr.total < realSquad().reduce((a, s) => a + realScore(s), 0) - 1e-9);

/* (e) VANTANDI SKOR UTILOKAR EKKI (11 er SKYLDA) en er MERKT. */
const mostlyNull = squad([null, null, null, null, null, null, null, null, null, null, null, null, 5, null, null]);
const rn = pickXi(mostlyNull, SC);
eq(rn.xi.length, 11, "vantandi skor utilokar ekki — 11 verda ad vera 11");
ok("vantandi skor er MERKT (scoreKnown:false), ekki thagad um",
   rn.xi.filter(x => !x.scoreKnown).length === 10 && rn.xi.filter(x => x.scoreKnown).length === 1);
ok("maeld nulltala er MERKT sem vitud (scoreKnown:true)",
   pickXi(squad(SQUAD_POS.map(() => 0)), SC).xi.every(x => x.scoreKnown));

/* ============================================================
   5. BEKKJARRODIN OG MARKVORDURINN
   ============================================================ */
console.log("\n=== 5. BEKKURINN — rod og ser-saeti markvardar ===");
const BS = [9, 1, 8, 8, 8, 2, 3, 7, 7, 7, 7, 6, 5, 4, 0.5];
const rb = bestTeamPlan({ seats: squad(BS), score: SC });
ok("bekkjarrodin er faldandi eftir skori",
   rb.bench.every((b, i) => i === 0 || rb.bench[i - 1].score >= b.score),
   rb.bench.map(b => b.score).join(" > "));
eq(rb.bench.map(b => b.score).join(","), "3,2,0.5", "bekkurinn i rettri rod (3 > 2 > 0,5)");
eq(rb.benchGk.pos, "GK", "bekkjar-GK er markvordur");
eq(rb.benchGk.id, 101, "lakari markvordurinn er bekkjar-GK (9 > 1)");
ok("bekkjar-GK er EKKI i 1-2-3 rodinni", !rb.bench.some(b => b.pos === "GK"));
ok("hver bekkjarmadur er lakari en lakasti i XI af sinni stodu",
   rb.bench.every(b => rb.xi.filter(x => x.pos === b.pos).every(x => x.score >= b.score)));
/* Enginn markvordur i hopnum: `benchGk` er null, EKKI tilbuinn madur. */
const noGk = squad(SQUAD_POS.map(() => 5)).filter(s => s.pos !== "GK");
eq(bestTeamPlan({ seats: noGk, score: SC }).benchGk, null, "enginn markvordur -> benchGk = null");
eq(pickXi(noGk, SC).legal, false, "hopur an markvardar er MERKTUR ologlegur (legal:false)");

/* ============================================================
   6. VIXLIN — ThAD SEM KALLANDINN SKRIFAR I `benchSwaps[gw]`
   ============================================================ */
console.log("\n=== 6. SWAP-PORIN — beitanleg, afturkraefanleg, alltaf leyfileg ===");
/* Ef lidid er ThEGAR rett stillt: TOM vixl. `[[411,411]]` var maelt
   vandamal 18.8.2026 — sjalfs-vixl las eins og plonun.                  */
const ra = bestTeamPlan({ seats: squad(BS), score: SC });
eq(ra.swaps.length, 0, "rett stillt lid -> ENGIN vixl");
eq(ra.changed, false, "rett stillt lid -> changed:false");
eq(ra.xi.map(x => x.id).sort((a, b) => a - b).join(","),
   [...DEFAULT_START].map(i => 100 + i).sort((a, b) => a - b).join(","),
   "og XI-id er nakvaemlega sjalfgefna uppstillingin (vordurinn er ekki tomur)");

/* Slembin LEYFILEG upphafs-uppstilling — annars vaeri profad a lidi sem
   appid getur ekki verid i.                                             */
function randomLegalStart() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = SQUAD_POS.map((_, i) => i).sort(() => rnd() - 0.5);
    const c = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    const on = new Set();
    for (const i of order) {
      if (on.size >= XI_SIZE) break;
      if (c[SQUAD_POS[i]] >= XI_MAX[SQUAD_POS[i]]) continue;
      on.add(i); c[SQUAD_POS[i]]++;
    }
    if (legalFormation(c)) return on;
  }
  return null;
}
let selfSwap = 0, notLegal = 0, notApplied = 0, ranSwapCases = 0, changedCases = 0;
for (let t = 0; t < 200; t++) {
  const start = randomLegalStart();
  if (!start) continue;
  const seats = squad(randScores(), start);
  ranSwapCases++;
  const r = bestTeamPlan({ seats, score: SC });
  if (r.swaps.some(([a, b]) => a === b)) selfSwap++;
  if (!r.swapsLegal) notLegal++;
  if (r.changed) changedCases++;
  /* BEITUM theim eins og App.jsx:squadForGw gerir — nakvaemlega sama
     lykkja, thvi thad er hun sem raunverulega keyrir.                   */
  const sq = seats.map(s => ({ ...s }));
  for (const [aId, bId] of r.swaps) {
    const ia = sq.findIndex(s => s.id === aId), ib = sq.findIndex(s => s.id === bId);
    const tmp = sq[ia].starter; sq[ia].starter = sq[ib].starter; sq[ib].starter = tmp;
    const c2 = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    sq.filter(s => s.starter).forEach(s => c2[s.pos]++);
    if (!legalFormation(c2)) notLegal++;      // MILLISTIG, ekki bara endastadan
  }
  const got = sq.filter(s => s.starter).map(s => s.id).sort((a, b) => a - b).join(",");
  const want = r.xi.map(x => x.id).sort((a, b) => a - b).join(",");
  if (got !== want) notApplied++;
}
ok(`slembnar upphafs-uppstillingar profadar (${ranSwapCases})`, ranSwapCases >= 150);
ok(`og thaer kolludu raunverulega a vixl (${changedCases} af ${ranSwapCases})`, changedCases >= 100);
eq(selfSwap, 0, "engin sjalfs-vixl ([id,id] las eins og plonun, maelt 18.8.2026)");
eq(notLegal, 0, "HVERT SKREF er leyfileg uppstilling, ekki bara endastadan");
eq(notApplied, 0, "vixlin gefa NAKVAEMLEGA thad XI sem velin valdi");
/* Markvordur ma adeins parast vid markvord — annad gefur 0 eda 2 GK. */
const gkSeats = squad([2, 9, 8, 8, 8, 1, 1, 7, 7, 7, 7, 6, 5, 1, 1]);
const rgk = bestTeamPlan({ seats: gkSeats, score: SC });
const posById = id => gkSeats.find(s => s.id === id).pos;
ok(`markvarda-vixl er GK<->GK (${rgk.swaps.length} vixl)`,
   rgk.swaps.length > 0 && rgk.swaps.every(([a, b]) => (posById(a) === "GK") === (posById(b) === "GK")));
/* AFTURKRAEFANLEIKI: vixlin eru por, svo sama fylkid aftur skilar
   upphaflegu uppstillingunni — thad er thad sem gerir takkann oruggan. */
const before = gkSeats.map(s => `${s.id}:${s.starter}`).join(",");
const rev = gkSeats.map(s => ({ ...s }));
for (let round = 0; round < 2; round++) for (const [a, b] of rgk.swaps) {
  const ia = rev.findIndex(s => s.id === a), ib = rev.findIndex(s => s.id === b);
  const tmp = rev[ia].starter; rev[ia].starter = rev[ib].starter; rev[ib].starter = tmp;
}
eq(rev.map(s => `${s.id}:${s.starter}`).join(","), before, "vixlin tvisvar = upphafleg uppstilling");
/* OLOGLEG NUVERANDI UPPSTILLING (2 GK, 5 DEF, 4 MID, 0 FWD — thad sem
   "fyrstu 11 saetin" er). Velin verdur samt ad koma manni A LEYFILEGAN
   STAD, og — MAELT her, ekki gefid ser — hun kemst thangad an ad fara
   gegnum ologlegt millistig: fyrsta vixlid GK<->FWD leidrettir BADA
   villurnar i einu skrefi.                                             */
const illegalNow = squad(BS, new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
const ri2 = bestTeamPlan({ seats: illegalNow, score: SC });
ok("XI-id ur ologlegri uppstillingu er leyfilegt", ri2.legal === true);
const sq2 = illegalNow.map(s => ({ ...s }));
let mid2Bad = 0;
for (const [a, b] of ri2.swaps) {
  const ia = sq2.findIndex(s => s.id === a), ib = sq2.findIndex(s => s.id === b);
  const tmp = sq2[ia].starter; sq2[ia].starter = sq2[ib].starter; sq2[ib].starter = tmp;
  const c2 = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  sq2.filter(s => s.starter).forEach(s => c2[s.pos]++);
  if (!legalFormation(c2)) mid2Bad++;
}
eq(ri2.swapsLegal, true, "ologleg upphafs-uppstilling: leyfileg vixla-rod FANNST");
eq(mid2Bad, 0, "og hun er raunverulega leyfileg i hverju skrefi");
eq(sq2.filter(s => s.starter).map(s => s.id).sort((a, b) => a - b).join(","),
   ri2.xi.map(x => x.id).sort((a, b) => a - b).join(","), "og hun lendir a rettu XI");
/* Otaekt inntak i vixla-hlutann (target af rangri staerd) MA EKKI skila
   porum sem kallandinn keyrir thegjandi.                                */
const bad = benchSwapPairs(squad(BS), [100, 102, 103]);
eq(bad.swaps.length, 0, "target af rangri staerd -> ENGIN vixl");
eq(bad.allLegal, false, "og thad er MERKT (allLegal:false)");

/* ============================================================
   7. TOM OG BILUD INNTOK — sama regla og annars stadar i repo-inu
   ============================================================ */
console.log("\n=== 7. ILLGJORN INNTOK ===");
const shapes = [undefined, null, 0, "", "xx", 42, {}, [], [null], [undefined],
                [{}], [{ pos: "MID" }], [1, 2, 3], { xi: 1 }, [{ pos: "MID", id: null }]];
let threw = null;
for (const v of shapes) {
  try {
    pickXi(v, SC); bestTeamPlan({ seats: v, score: SC }); benchSwapPairs(v, []);
    bestTeamPlan({ seats: v });
  } catch (e) { threw = `${JSON.stringify(v)}: ${e.message}`; break; }
}
eq(threw, null, `${shapes.length} logunum af inntaki kasta ekki`);
eq(pickXi([], SC).xi.length, 0, "tomt inntak -> tomt lid");
eq(bestTeamPlan({ seats: [], score: SC }).legal, false, "tomt lid er MERKT ologlegt");
eq(bestTeamPlan({ seats: squad(randScores()) }).xi.length, 11,
   "vantandi skor-fall fellir ekki velina (allir fa 0)");
eq(bestTeamPlan().xi.length, 0, "kall an nokkurs inntaks skilar tomu, kastar ekki");

/* ============================================================
   8. AD `stats.js:bestXi` GETI FRAMSELT HINGAD AN AD BREYTA SVARI
   ------------------------------------------------------------
   Afritud utfaersla er tvaer utfaerslur sem reka i sundur
   (`buildTeamMetrics`, `headWidth`, `ZONE_RE` — CLAUDE.md koflum 7, 8, 12).
   Thessi kafli er SKILYRDID fyrir ad afritid megi hverfa: sama inntak,
   somu tolur, sama rod. `points`/`bps`-jafnteflid er hluti af svarinu.
   ============================================================ */
console.log("\n=== 8. JAFNGILDI VID stats.js:bestXi (forsenda af-afritunar) ===");
const twScore = r => r.points ?? 0;
const twTie = (a, b) => (b.bps ?? 0) - (a.bps ?? 0);
const tw = [
  ...Array.from({ length: 8 }, (_, i) => ({ name: `m${i}`, pos: "MID", points: 20 - i, bps: 0 })),
  ...Array.from({ length: 4 }, (_, i) => ({ name: `d${i}`, pos: "DEF", points: 2, bps: i })),
  { name: "gk", pos: "GK", points: 1, bps: 0 },
  { name: "f", pos: "FWD", points: 1, bps: 0 },
];
const twr = pickXi(tw, twScore, { tiebreak: twTie });
eq(twr.xi.length, 11, "synth: 11 valdir thott midjumenn seu stigahaestir");
eq(twr.count.MID, 5, "synth: midja stoppar i 5 (thak virt)");
eq(twr.count.GK, 1, "synth: markvordur tekinn thott hann se stigalaegstur");
ok("synth: lagmark 3 i vorn virt", twr.count.DEF >= 3);
ok("synth: radad eftir stodu (markv. fyrst)",
   twr.xi.every((r, i, a) => i === 0 || POS_ORDER[a[i - 1].pos] <= POS_ORDER[r.pos]));
near(twr.total, twr.xi.reduce((s, r) => s + r.points, 0), 1e-9, "stigasumma stemmir");
/* `bps` sem jafnteflis-brjotur VERDUR ad virka — annars vaeri framsalid
   hegdunar-breyting sem ekkert segdi fra.                               */
const twd = twr.xi.filter(x => x.pos === "DEF").map(x => x.bps);
eq(twd.join(","), [...twd].sort((a, b) => b - a).join(","), "jafntefli a stigum brotid a bps (haest fyrst)");
eq(twd.join(","), "3,2,1,0", "og thad er RAUNVERULEGT jafntefli (fjorir a 2 stigum, bps 3>2>1>0)");
eq(pickXi([{ pos: "GK", points: 5 }, null, { pos: "DEF", points: 3 }], twScore).xi.length, 2,
   "null i fylkinu er sleppt (sama vord og rowsOf i stats.js)");

/* ------------------------------------------------------------------
   MISMUNAR-PROFID SJALFT: ER FRAMSALID HEGDUNARLEGA EINS?
   Thetta ber RAUNVERULEGA `stats.js:bestXi` vid thad sem patchid setur i
   hennar stad. Thad er EINA leidin til ad vita hvort af-afritunin
   breytir lidi vikunnar, og thad SVARADI: fyrsta utgafa patchsins
   breytti 17 af 506 tilvikum. Summan var alltaf SU SAMA (jafntefli
   milli formasjona) en 1-5-2-3 vard 1-4-3-3, thvi gamla lykkjan radar
   jafnteflum i STODU-ROD (`rest` er byggt GK->DEF->MID->FWD og
   `Array.sort` er stodug) medan velin fell a INNTAKS-rod. Jafnteflis-
   fallid i patchinu ber thess vegna `POS_ORDER` sem thridja lid.

   ThESSI KAFLI ER TIMABUNDINN: um leid og `stats.js` framselur hingad
   ber hann tvo koll a SAMA kodann og verdur tautologia. HANN A AD
   HVERFA I SAMA COMMIT-i og patchid (CLAUDE.md 5b: tom fullyrding sem
   litur ut eins og thekja er verri en engin).
   ------------------------------------------------------------------ */
const delegated = rows => {
  const r = pickXi(rows, x => x.points ?? 0, { tiebreak: (a, b) =>
    (b.bps ?? 0) - (a.bps ?? 0) || (POS_ORDER[a.pos] ?? 9) - (POS_ORDER[b.pos] ?? 9) });
  return { xi: r.xi, count: r.count, points: r.total };
};
const sig = r => `${r.count.GK}-${r.count.DEF}-${r.count.MID}-${r.count.FWD}|${r.points}|` +
  r.xi.map(x => `${x.name ?? x.id}:${x.pos}:${x.points ?? 0}:${x.bps ?? 0}`).join(",");
const POSN = ["GK", "DEF", "MID", "FWD"];
let dseed = 7, dDiff = 0, dCases = 0, dTies = 0;
const drnd = () => (dseed = (dseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (let t = 0; t < 500; t++) {
  const m = 8 + Math.floor(drnd() * 30);
  const rows = Array.from({ length: m }, (_, i) => ({
    name: `p${i}`, pos: POSN[Math.floor(drnd() * 4)],
    points: drnd() < 0.35 ? Math.floor(drnd() * 3) : Math.floor(drnd() * 15),
    bps: drnd() < 0.4 ? 0 : Math.floor(drnd() * 5),
  }));
  dCases++;
  /* ThEKJA ER FULLYRDING: hversu oft var thetta RAUNVERULEGT jafntefli?
     An thess vaeri samanburdurinn a inntokum thar sem enginn jafnteflis-
     brjotur er spurdur, og hann gaeti ekki fallid.                      */
  const pts = rows.map(r => `${r.pos}:${r.points}:${r.bps}`);
  if (pts.length !== new Set(pts).size) dTies++;
  if (sig(bestXi(rows)) !== sig(delegated(rows))) dDiff++;
}
const realRows = withDerived(REPORT?.players || []);
if (realRows.length) {
  dCases++;
  if (sig(bestXi(realRows)) !== sig(delegated(realRows))) dDiff++;
}
for (const rows of [[], [null], [{ pos: "GK", points: 5 }, null, { pos: "DEF", points: 3 }],
                    [{ pos: "XX", points: 9 }],
                    Array.from({ length: 40 }, () => ({ pos: "MID", points: 5, bps: 5 }))]) {
  dCases++;
  if (sig(bestXi(rows)) !== sig(delegated(rows))) dDiff++;
}
ok(`mismunar-profid var raunverulegt (${dCases} tilvik, ${dTies} med jafntefli, ${realRows.length} raunradir)`,
   dCases > 500 && dTies > 300 && realRows.length > 100);
eq(dDiff, 0, "FRAMSALID ER HEGDUNARLEGA EINS vid stats.js:bestXi (0 munur)");

console.log(`\n${"=".repeat(84)}`);
console.log(`  ${pass} stodust, ${fail} fellu`);
console.log("=".repeat(84));
process.exit(fail ? 1 : 0);
