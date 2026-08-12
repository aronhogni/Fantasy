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
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const DATA = path.join(path.resolve(new URL(".", import.meta.url).pathname, ".."), "data");

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

/* ============================================================
   SPYRNUMENN — MAELDA REGLAN
   ============================================================
   A-Ranking raðar ekki K/DST og a ekki ad gera thad. En notandinn
   VERDUR ad taka spyrnumann, svo `kicker-lab.mjs` maeldi hvad haegt er
   ad segja. Thetta profa ver ad talan sem BIRTIST se enn su sem var
   maeld — og ad hun se sogd med rettu formerki.                    */
console.log("\nspyrnumenn: maelda reglan");
{
  const f = path.join(DATA, "kickers.json");
  if (!existsSync(f)) {
    console.log("  (kickers.json vantar — keyrdu scripts/kicker-lab.mjs)");
  } else {
    const K = JSON.parse(readFileSync(f, "utf8"));
    ok(K.seasons.length >= 5, `${K.seasons.length} timabil maeld`);

    /* Kjarninn: spyrnumenn flytjast NAESTUM EKKERT milli ara, og thad
       er thad sem rettlaetir ad rada theim ekki. Falli thetta er
       forsendan brostin og spjaldid segir rangt. */
    ok(K.persistence.K.r < 0.35,
      `K flyst naestum ekkert milli ara (r=${K.persistence.K.r})`);
    for (const pos of ["RB", "WR", "TE"]) {
      ok(K.persistence[pos].r > K.persistence.K.r + 0.3,
        `${pos} flyst MIKLU betur (r=${K.persistence[pos].r} gegn ${K.persistence.K.r})`);
    }

    /* Reglan sjalf: jakvaed og einroma yfir arin. Snuist hun vid ma
       spjaldid ekki halda afram ad radleggja hana. */
    ok(K.rules.top5.gain > 0 && K.rules.top5.wins === K.rules.top5.years,
      `topp-5 reglan er jakvaed oll arin (${K.rules.top5.gain} stig, ` +
      `${K.rules.top5.wins}/${K.rules.top5.years})`);

    /* Og hin reglan a ad vera GAGNSLAUS. Vaeri hun thad ekki vaeri
       spjaldid ad segja notandanum ad sleppa einhverju sem virkar. */
    ok(K.rules.bestOffence.wins < K.rules.bestOffence.years,
      `"besta soknin" virkar EKKI oll arin (${K.rules.bestOffence.wins}/` +
      `${K.rules.bestOffence.years}) — spjaldid segir thad rett`);

    /* Staerdin ma ekki blasa upp. Se eftiraa-bilid ordid storkostlegt
       er eitthvad ad urtakinu. */
    ok(K.hindsightGain > 10 && K.hindsightGain < 120,
      `K1 gegn K12 eftiraa er ${K.hindsightGain} stig — raunhaeft bil`);
    ok(K.rules.top5.gain < K.hindsightGain,
      "reglan nær minna en fullkomin vitneskja, eins og hun VERDUR ad gera");
  }
}

/* ============================================================
   ÞREP MA EKKI SPANNA MEIRA EN THREPASKILIN SJALF
   ============================================================
   ÞETTA SAST A SKJANUM, EKKI I TOLU. Threp 1 hja leikstjornendum bar
   22 menn og spannadi **98,8 stig** — Josh Allen (65,6) og madur a
   -33,2 i sama threpi — medan threp 1 hja hlaupurum spannadi 6,5.
   Threp segir "thessir eru skiptanlegir"; 98,8 stig er heil brekka
   kolluð einu nafni.

   Orsokin var `minTier`, ekki throskuldurinn: bilid Allen -> Lamar er
   35,5 og throskuldurinn 13,3, svo skilin attu ad koma strax — en
   `sinceBreak >= minTier` bannadi threp med einum manni og dro Lamar
   inn. Eftir thad er QB-brekkan slett nidur i saeti 22.

   Reglan tharf enga nyja tolu: fjarlaegdin INNAN threps verdur ad vera
   minni en su sem telst threpaskil. Threp med einum manni er RETT
   nidurstada thegar hann stendur einn.                             */
console.log("\ntherpavidd");
{
  const { tierize } = await import("../src/model.js");

  /* Tilbuid tilfelli: einn madur langt a undan, sidan slett brekka.
     An reglunnar lenda ALLIR i threpi 1. */
  const vals = [100, 60, 57, 54, 51, 48, 45, 42, 39, 36, 33, 30];
  const t = tierize(vals);
  ok(t[0] === 1 && t[1] !== 1,
    `sa sem stendur einn faer sitt eigid threp (${t.slice(0, 4).join(",")})`);

  const width = (tiers, xs) => {
    const by = {};
    xs.forEach((v, i) => { (by[tiers[i]] = by[tiers[i]] || []).push(v); });
    return Math.max(...Object.values(by).map((g) => Math.max(...g) - Math.min(...g)));
  };
  /* Efri threpin mega ekki vera breidari en bil-throskuldurinn. Nedsta
     threpid er undanskilid: `maxTiers` safnar hala i eitt threp
     viljandi, og thar er hvort ed er enginn draftadur. */
  const top = vals.slice(0, 8), tTop = tierize(top);
  const gaps = [];
  for (let i = 1; i < top.length; i++) gaps.push(top[i - 1] - top[i]);
  const m = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - m) ** 2, 0) / gaps.length);
  ok(width(tTop, top) <= m + sd + 0.001,
    `ekkert threp breidara en throskuldurinn (${width(tTop, top).toFixed(1)} <= ${(m + sd).toFixed(1)})`);

  /* Og a RAUNGOGNUNUM: hvorki eitt threp med ollum ne threp per mann. */
  if (existsSync(path.join(DATA, "players.json"))) {
    const { buildRows, DEFAULT_LEAGUE } = await import("../src/build.js");
    const rd = (f) => JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
    const b = buildRows({ players: rd("players.json"), league: { ...DEFAULT_LEAGUE } });
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      const g = b.rows.filter((r) => r.pos === pos && r.posTier != null);
      if (g.length < 20) continue;
      const byTier = {};
      for (const r of g) (byTier[r.posTier] = byTier[r.posTier] || []).push(r.vbd);
      /* Nedsta threpid er halinn — sleppt af sömu astaedu og ad ofan. */
      const tiers = Object.keys(byTier).map(Number).sort((a, c) => a - c);
      const upper = tiers.slice(0, -1);
      const widest = Math.max(...upper.map((t2) =>
        Math.max(...byTier[t2]) - Math.min(...byTier[t2])));
      ok(widest < 40,
        `${pos}: breidasta threp (an hala) spannar ${widest.toFixed(1)} stig`);
      const top1 = byTier[tiers[0]];
      ok(top1.length <= 6,
        `${pos}: threp 1 ber ${top1.length} menn (ekki heila brekku)`);
    }
  }
}

/* ============================================================
   OKUNNUGT STODUGILDI MA EKKI VERA THOGULT "HEILBRIGDUR"
   ============================================================
   `availability` skilar 1 thegar hun thekkir ekki gildid. Thad er
   retta bakfallid — vid viljum ekki nulla mann vegna nys ords i
   ordafori Sleeper — EN thad ma ekki gerast an thess ad nokkur sjai.

   ÞETTA KOSTADI RAUNVERULEGA TOLU: `DNR` (Did Not Report) var ekki i
   toflunni, svo Brandon Aiyuk — DRAFTANLEGUR mottakari sem var ekki
   maettur — fekk tiltaekileika 1,0 og spain hans var oafslegin.

   Profid ber ordin sem eru RAUNVERULEGA a diskinum vid toflunna. Nytt
   ord fellir thad, og tha er thad AKVORDUN en ekki thogn.          */
console.log("\nordafor tiltaekileika");
{
  const { AVAIL, AVAIL_KNOWN, availability } = await import("../src/model.js");
  if (!existsSync(path.join(DATA, "players.json"))) {
    console.log("  (players.json vantar — slepp)");
  } else {
    const P = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
    const seen = new Set();
    for (const p of P) {
      if (p.injury) seen.add(p.injury);
      if (p.status) seen.add(p.status);
    }
    const unknown = [...seen].filter((v) => !AVAIL_KNOWN.includes(v));
    ok(unknown.length === 0,
      `hvert stodugildi a disknum er i toflunni (okunnug: ${unknown.join(", ") || "engin"})`);

    /* Og enginn ma fa FULLAN adgang med stodu sem er ekki Active. */
    const slipping = P.filter((p) => availability(p.status, p.injury) === 1 &&
      ((p.injury && p.injury !== "Active") || (p.status && p.status !== "Active")));
    ok(slipping.length === 0,
      `enginn faer fullan adgang med stodu sem er ekki Active ` +
      `(${slipping.slice(0, 3).map((p) => `${p.name} ${p.status}/${p.injury}`).join(", ") || "0"})`);

    /* Threpin verda ad vera einraen: verri stada gefur aldrei HAERRI
       tolu. Snerist eitt gildi vid vaeri taflan ad segja ad meiddur
       madur se aðgengilegri en heilbrigdur. */
    const order = ["Out", "IR", "Doubtful", "DNR", "Questionable", "Probable", "Active"];
    let mono = true;
    for (let i = 1; i < order.length; i++) {
      if (AVAIL[order[i]] < AVAIL[order[i - 1]]) mono = false;
    }
    ok(mono, `taflan er einraen: ${order.map((k) => `${k} ${AVAIL[k]}`).join(" <= ")}`);
  }
}

/* ============================================================
   SKORPU-HOPURINN ER VALINN UR FERLI, EKKI UR EINU ARI
   ============================================================
   Reglan er maeld (`expert-persistence.mjs`) og hun hefur THRJU
   skilyrdi sem OLL hafa kostad eitthvad ad uppgotva. Profad er a
   tilbunum gognum svo hvert skilyrdi se prófad EITT OG SER — a
   raungognum gaeti eitt theirra verid dautt an thess ad sjast. */
console.log("\nval a skorpu-hopnum");
{
  const { buildSharpBoard } = await import("../src/build.js");

  /* Fimm hafa langan og virkan feril (10,11,12,13,14) — their eiga
     ad komast ad. Tveir eru undantekningarnar sem reglan snyst um:
       2  godur ferill en HAETTUR (birtir ekki sidasta arid)
       3  virkur en a adeins 2 ar
     Fjoldi qualifying manna er 5, sem er yfir golfinu (4). */
  const yearsList = [2021, 2022, 2023, 2024, 2025];
  const LONG = [10, 11, 12, 13, 14];
  const accuracyHistory = {};
  for (const y of yearsList) {
    const rows = LONG.map((id, i) => ({ id, r: i + 1 }));
    if (y !== 2025) rows.push({ id: 2, r: 1 });     // haettur, en bestur medan hann var
    if (y >= 2024) rows.push({ id: 3, r: 1 });      // of stuttur ferill
    accuracyHistory[y] = rows;
  }
  const ranks = (n) => Object.fromEntries(
    Array.from({ length: 60 }, (_, i) => [`p${i + 1}`, i + 1 + n]));
  const experts = {
    accuracyHistory,
    boards: [...LONG, 2, 3].map((id) => ({ id, ranks: ranks(id % 5) })),
  };

  const S = buildSharpBoard(null, experts);
  ok(S.rule === "career", `valid byggir a ferli (${S.rule})`);
  ok(LONG.every((id) => S.ids.includes(id)),
    `allir fimm med langan virkan feril eru med (${S.ids.length})`);
  ok(!S.ids.includes(2), "sa sem er HAETTUR er ekki med thott ferillinn se godur");
  ok(!S.ids.includes(3), "sa sem a adeins 2 ar er ekki med");
  ok(S.ids[0] === 10, `bestur ad midgildi er efstur (${S.ids[0]})`);
  ok(S.ranks.size > 0 && S.measured, `${S.ranks.size} leikmenn i skorpu-rodinni`);

  /* Rodin verdur ad vera THETT 1..n — eyda i henni thydir ad
     `sharpDelta` maeli annan kvarda en `ecr` og talan yrdi bjoguð. */
  const vals = [...S.ranks.values()].sort((a, b) => a - b);
  ok(vals[0] === 1 && vals[vals.length - 1] === vals.length,
    `thett rod 1..${vals.length}`);

  /* GOLFID: faerri en fjorir sem uppfylla reglurnar er EKKI
     skorpu-hopur, og tha a fallbackid ad taka vid — thogul samsteypa
     tveggja manna vaeri verri en gamla reglan. */
  const thin = { accuracyHistory: Object.fromEntries(yearsList.map((y) =>
                   [y, [{ id: 10, r: 1 }, { id: 11, r: 2 }]])),
                 boards: experts.boards };
  const T = buildSharpBoard(null, thin);
  ok(T.rule !== "career", `tveir menn duga ekki i feril-reglu (${T.rule})`);

  /* FALLBACK: an sogu er gamla eins-ars reglan notud. Hun ma ekki
     hverfa — fyrsta keyrsla eftir uppfaerslu hefur enga sogu og
     dalkurinn a ekki ad tæmast tha. */
  const F = buildSharpBoard(
    { nullDist: { mean: 0, p95: 0.5 },
      experts: [{ id: 10, draft: { mean: 0.9 } }, { id: 11, draft: { mean: 0.1 } }] },
    { boards: experts.boards });
  ok(F.rule === "single-season", `an sogu er fallid aftur i eitt ar (${F.rule})`);
  ok(F.ids.includes(10) && !F.ids.includes(11), "og threskuldurinn thar virkar enn");

  /* OG SAGAN VERDUR AD VINNA THEGAR HUN ER TIL. Vaeri rodin ofug
     (fallback fyrst) hefdi enginn tekid eftir thvi — badar leidir
     skila gildum hop. */
  const B = buildSharpBoard(
    { nullDist: { mean: 0, p95: 0.5 },
      experts: [{ id: 2, draft: { mean: 0.9 } }] },
    experts);
  ok(B.rule === "career" && !B.ids.includes(2),
    "sagan raedur thegar hun er til, ekki eins-ars talan");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
