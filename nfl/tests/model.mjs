/* ============================================================
   nfl-model.mjs — ver hverja BIRTA tolu i NFL-likaninu.

   Kafli 1  blondun: vantandi heimild er SLEPPT, ekki sett i 0
   Kafli 2  VBD: varamanns-threp fylgir DEILDINNI, ekki fasta
   Kafli 3  threp: hvorki eitt threp med ollum ne threp per mann
   Kafli 4  vaent stigaskor ur linunni — merkjareglan RETT VEGIN
   Kafli 5  teygni: STODURNAR ERU EKKI EINS og WR-lidurinn er ~0
   Kafli 6  vorn gegn stodu: liðurinn ma ALDREI rada rodun
   Kafli 7  tiltaekileiki: opinber stada raedur
   Kafli 8  virdi gegn markadi: formerkid les rett
   ============================================================ */

import {
  blend, blendWeights, replacementRanks, computeVbd, tierize,
  valueVsMarket, impliedTeamTotals, gameScriptMult, defenseMult,
  weeklyProjection, availability, POS_ELASTICITY, DEF_WEIGHT,
  FLEX_SPLIT, IMPLIED_BASE,
} from "../src/model.js";

let fail = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ok   ${msg}`);
  else { console.log(`  FAIL ${msg}`); fail++; }
};
const near = (a, b, eps, msg) => ok(Math.abs(a - b) <= eps, `${msg} (${a} ~ ${b})`);

/* ---------- 1. BLONDUN ---------- */
console.log("\n1. blondun spaa");
{
  const b = blend([
    { key: "a", value: 100, weight: 1 },
    { key: "b", value: 200, weight: 1 },
  ]);
  near(b.value, 150, 0.01, "jofn vog gefur medaltal");
  ok(b.spread === 100, "dreifing heimilda birt");

  /* HEIMILD SEM THEGIR SPAIR EKKI 0. Vaeri `null` medhondlad sem 0
     myndi leikmadur sem ADEINS Sleeper spair fyrir fa helming af
     sinni spa — thogul helmingun a hverri einustu tolu. */
  const c = blend([
    { key: "a", value: 100, weight: 1 },
    { key: "b", value: null, weight: 1 },
  ]);
  near(c.value, 100, 0.01, "null-heimild er SLEPPT, ekki talin sem 0");
  ok(c.used.length === 1 && c.coverage === 0.5, "thekja birt");
  ok(c.spread === null, "engin dreifing thegar adeins ein heimild maetti");

  ok(blend([{ key: "a", value: null, weight: 1 }]).value === null,
    "engin heimild -> null, ekki 0");

  /* Vog 0 er "ekki heimild", ekki "lett heimild". */
  const d = blend([
    { key: "a", value: 100, weight: 1 },
    { key: "b", value: 999, weight: 0 },
  ]);
  near(d.value, 100, 0.01, "vog 0 utilokar heimildina alveg");

  const w = blendWeights(null);
  ok(w.measured === false, "an maelingar er `measured: false` — jofn vog er SOGD");
}

/* ---------- 2. VBD ---------- */
console.log("\n2. virdi yfir varamanni");
{
  const r10 = replacementRanks({ teams: 10, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } });
  const r14 = replacementRanks({ teams: 14, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } });
  ok(r14.RB > r10.RB && r14.WR > r10.WR,
    "staerri deild faerir varamanns-threpid nedar");
  ok(r10.RB === 20 + Math.round(10 * FLEX_SPLIT.RB),
    `RB-threp i 10-lida = 20 + flex-hluti (${r10.RB})`);

  /* SUPERFLEX / 2QB er ekki bara "meiri stig" — thad faerir
     QB-threpid ur 12 nidur i ~24 og thad er OLL breytingin. */
  const sf = replacementRanks({ teams: 12, starters: { QB: 2, RB: 2, WR: 3, TE: 1, FLEX: 1 } });
  ok(sf.QB === 24, `superflex faerir QB-threp i 24 (${sf.QB})`);

  const players = [];
  for (let i = 0; i < 40; i++) players.push({ id: `rb${i}`, pos: "RB", proj: 300 - i * 5 });
  for (let i = 0; i < 40; i++) players.push({ id: `qb${i}`, pos: "QB", proj: 320 - i * 2 });
  const v = computeVbd(players, { teams: 12, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } });

  const topRb = v.find((p) => p.id === "rb0");
  const topQb = v.find((p) => p.id === "qb0");
  /* KJARNI VBD: QB0 skorar MEIRA en RB0 (320 > 300) en er MINNA
     VIRDI, thvi QB-brekkan er flot. Ef thetta profa fellur er appid
     ad rada eftir hrastigum og allt draft-lagid er rangt. */
  ok(topQb.proj > topRb.proj, "QB0 skorar fleiri stig en RB0");
  ok(topRb.vbd > topQb.vbd,
    `en RB0 hefur haerra VBD (${topRb.vbd} > ${topQb.vbd}) — brekkan raedur, ekki stigin`);

  ok(v.find((p) => p.id === "rb0").posRank === 1, "posRank settur");
  const noProj = computeVbd([{ id: "x", pos: "RB", proj: null }],
    { teams: 12, starters: { RB: 2 } });
  ok(noProj[0].vbd === null, "an spar er VBD null, EKKI 0");
}

/* ---------- 3. THREP ---------- */
console.log("\n3. threpaskipting");
{
  /* Skyr stokk: 3 haair, bil, 3 lagir. */
  const t = tierize([100, 98, 96, 60, 58, 56, 20, 18, 16]);
  ok(t[0] === t[1] && t[1] === t[2], "haair thrir i sama threpi");
  ok(t[3] > t[0], "stokk byr til nytt threp");
  ok(new Set(t).size >= 3, `ad minnsta kosti 3 threp (${new Set(t).size})`);

  /* Jofn brekka ma EKKI verda ad threpi per mann. */
  const flat = tierize(Array.from({ length: 40 }, (_, i) => 100 - i));
  ok(new Set(flat).size < 40, `jofn brekka gefur ekki threp per mann (${new Set(flat).size})`);
  ok(new Set(flat).size >= 1, "jofn brekka gefur ad minnsta kosti eitt threp");

  const withNull = tierize([100, null, 50]);
  ok(withNull[1] === null, "null helst null i threpun");
}

/* ---------- 4. VAENT STIGASKOR ---------- */
console.log("\n4. vaent stigaskor ur linunni");
{
  /* nflverse: spread ER UR SJONARHORNI HEIMALIDS og jakvaett =
     heimalid favorit. Snuist thetta vid les ALLT likanid ofugt og
     ekkert brotnar synilega. */
  const im = impliedTeamTotals(48, 7);
  near(im.home, 27.5, 0.01, "heimalid = total/2 + spread/2");
  near(im.away, 20.5, 0.01, "utilid = total/2 - spread/2");
  near(im.home + im.away, 48, 0.01, "summan er heildarlinan");

  const und = impliedTeamTotals(48, -7);
  ok(und.home < und.away, "neikvaett spread setur heimalidid nedar");

  const none = impliedTeamTotals(null, 3);
  ok(none.home === null && none.away === null, "an linu -> null, ekki agiskun");
}

/* ---------- 5. TEYGNI ---------- */
console.log("\n5. teygni gagnvart leikstodu");
{
  ok(gameScriptMult(IMPLIED_BASE, "RB") === 1,
    "grunnlina gefur margfaldara nakvaemlega 1");
  ok(gameScriptMult(32, "RB") > 1, "hatt vaent skor lyftir RB");
  ok(gameScriptMult(14, "RB") < 1, "lagt vaent skor laekkar RB");

  /* MAELT: RB 0,356 · WR 0,069. Ad gefa ollum somu teygni var villan
     sem thetta profa er til ad hindra. */
  ok(POS_ELASTICITY.RB > POS_ELASTICITY.WR * 2,
    `RB-teygni margfalt haerri en WR (${POS_ELASTICITY.RB} vs ${POS_ELASTICITY.WR})`);
  ok(POS_ELASTICITY.WR < 0.15,
    `WR-teygni naerri null eins og maelt var (${POS_ELASTICITY.WR})`);

  const rbSwing = gameScriptMult(30, "RB") - gameScriptMult(16, "RB");
  const wrSwing = gameScriptMult(30, "WR") - gameScriptMult(16, "WR");
  ok(rbSwing > wrSwing * 2,
    `RB sveiflast margfalt meira med leikstodu en WR (${rbSwing.toFixed(3)} vs ${wrSwing.toFixed(3)})`);

  /* Thakid ma ekki hleypa gegn ofsatolum ur bilaðri linu. */
  ok(gameScriptMult(80, "RB") <= 1.45, "margfaldari er thakinn ad ofan");
  ok(gameScriptMult(1, "RB") >= 0.65, "og ad nedan");
  ok(gameScriptMult(null, "RB") === 1, "an linu er margfaldarinn hlutlaus");
}

/* ---------- 6. VORN GEGN STODU ---------- */
console.log("\n6. vorn gegn stodu");
{
  ok(defenseMult(null, 20) === 1, "an gagna er lidurinn hlutlaus");
  ok(defenseMult(24, 20) > 1, "vorn sem gefur mikid lyftir");
  ok(defenseMult(16, 20) < 1, "vorn sem gefur litid laekkar");

  /* MAELT: besta vog er 0,20 og hun baetir ferskekkju um 0,13%.
     LIDURINN MA THVI ALDREI SNUA ROD. Profid festir thad: 20%
     munur a vorn ma ekki gefa meira en ~4% breytingu. */
  ok(DEF_WEIGHT <= 0.35, `vogin er lag eins og maelingin krefst (${DEF_WEIGHT})`);
  const swing = defenseMult(24, 20) - defenseMult(16, 20);
  ok(swing < 0.10,
    `20% munur a vorn gefur < 10% sveiflu (${(swing * 100).toFixed(1)}%)`);

  ok(defenseMult(60, 20) <= 1.25 && defenseMult(2, 20) >= 0.80,
    "thakid heldur vid ofsagildi");
}

/* ---------- 7. VIKULEG SPA OG TILTAEKILEIKI ---------- */
console.log("\n7. vikuleg spa");
{
  const p = weeklyProjection({ base: 15, pos: "RB", implied: 27,
    def: { adj: 22, leagueMean: 20 }, avail: 1 });
  ok(p.pts > 15, "godur leikur lyftir spanni");
  ok(p.parts && p.parts.gameScript > 1 && p.parts.defense > 1,
    "thaettirnir eru skiladir svo haegt se ad vera osammala tolunni");

  /* AUD VIKA ER 0, EKKI NULL. Null er "vitum ekki"; hér vitum vid. */
  const bye = weeklyProjection({ base: 15, pos: "RB", bye: true });
  ok(bye.pts === 0 && bye.bye === true, "aud vika gefur 0 og er merkt");

  const unknown = weeklyProjection({ base: null, pos: "RB", implied: 27 });
  ok(unknown.pts === null, "an grunnlinu er spain null, ekki 0");

  const out = weeklyProjection({ base: 15, pos: "RB", implied: 22.5, avail: 0 });
  ok(out.pts === 0, "tiltaekileiki 0 gefur 0");

  ok(availability("Active", null) === 1, "virkur = 1");
  ok(availability(null, "Out") === 0, "Out = 0");
  ok(availability(null, "Questionable") === 0.75, "Questionable = 0,75");
  ok(availability(null, "Doubtful") < availability(null, "Questionable"),
    "Doubtful er laegri en Questionable");
  ok(availability(null, "GobbledyGook") === 1,
    "othekkt stada fellur i 1 — vid gerum EKKI rad fyrir meidslum an heimildar");
}

/* ---------- 8. VIRDI GEGN MARKADI ---------- */
console.log("\n8. virdi gegn markadi");
{
  /* Okkar rod 10, markadurinn tekur hann 22 -> hann fellur um eina
     umferd i 12-lida deild. JAKVAETT = kaup. Snuist formerkid vid
     les dalkurinn ofugt an thess ad neitt brotni. */
  near(valueVsMarket(10, 22, 12), 1, 0.001, "12 saeti = ein umferd i 12-lida deild");
  ok(valueVsMarket(10, 22, 12) > 0, "leikmadur sem fellur faer JAKVAETT gildi");
  ok(valueVsMarket(22, 10, 12) < 0, "leikmadur sem er ofmetinn faer neikvaett");
  near(valueVsMarket(10, 20, 10), 1, 0.001, "sama bil i 10-lida deild = ein umferd");
  ok(valueVsMarket(10, null, 12) === null, "an ADP er ekkert virdi reiknad");
  ok(valueVsMarket(null, 20, 12) === null, "an okkar rodar heldur");
}

/* ---------- 9. FLEX-SKIPTING ---------- */
console.log("\n9. flex-skipting");
{
  const sum = FLEX_SPLIT.RB + FLEX_SPLIT.WR + FLEX_SPLIT.TE;
  near(sum, 1, 0.01, "hlutfollin leggjast i 1");
  /* MAELT 2020-2025: TE 0,193. Fyrsta utgafan agiskadi 0,10 og thad
     faerdi varamanns-threp allra TE upp um heilt saeti. */
  ok(FLEX_SPLIT.TE > 0.15,
    `TE-hlutur er maeldur ~0,19 og ma ekki fara aftur i 0,10 (${FLEX_SPLIT.TE})`);
  ok(FLEX_SPLIT.WR > FLEX_SPLIT.RB, "WR endar oftar i flex en RB");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
