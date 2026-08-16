/* ============================================================
   dst.mjs — VORNIN: FORMULAN, AKKERID, NULL-AGINN OG VALID EIGINLEIKI

   Fimm spurningar og thaer eru fimm af asettu radi:

     1. REKUR BAKADA AKKERID? `DST_ANCHOR` og `DST_STREAM_MEASURED` eru
        bakadar tolur; verdi labid endurkeyrt med annarri utkomu a
        THETTA ad falla, ekki appid ad thegja.
     2. ER FORMULAN RETT? Ekki „skilar hun tolu" heldur: skilar hun
        NAKVAEMLEGA sömu tolu og Sleeper a raunverulegri viku.
     3. NULL ER EKKI NULL. Sex leidir til ad fa ekkert svar, og hver
        og ein verdur ad gefa `null` — ekki 0.
     4. VALDI EIGINLEIKINN. Maelingin sagdi STREYMI, ekki rod, og
        talan sem birtist a skjanum verdur ad vera su sem sagdi thad.

     5. ER ÞETTA TENGT? Kaflar 1-8 gaetu allir verid graenir medan
        hlutinn er hvergi a skjanum — kafli 9 ver thad.

   OG HVERT PROF HER VAR STOKKBREYTT. Vardhundur sem lifir af sina
   eigin stokkbreytingu er ekki vardhundur, og kafli 8 ber listann
   yfir thaer nitjan stokkbreytingar sem VORU keyrdar og felldu prof.
   ============================================================ */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { BASE, DST_ANCHOR, dstPoints, dstPointsAllowed, dstBracket }
  from "../src/scoring.js";
import { dstRulesFromSettings } from "../src/sleeper-league.js";
import { DST_STREAM_MEASURED, dstStream, dstStreamNote, compareOppImplied,
         weekContext } from "../src/weekview.js";

const DATA = path.resolve(new URL(".", import.meta.url).pathname, "..", "data");
let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? "ok  " : "FAIL"} ${m}`); if (!c) fail++; };
const near = (a, b, eps) => a != null && b != null && Math.abs(a - b) <= eps;

/* ============================================================
   1. BAKADA TAFLAN MA EKKI REKA FRA `data/measure/dst.json`
   ============================================================ */
console.log("1. bakadar tolur gegn data/measure/dst.json");
{
  const p = path.join(DATA, "measure", "dst.json");
  if (!existsSync(p)) {
    ok(false, "dst.json vantar — keyrdu scripts/dst-lab.mjs");
  } else {
    const M = JSON.parse(readFileSync(p, "utf8"));
    const drift = [];
    let checked = 0;

    const cmp = (label, baked, got, eps) => {
      checked++;
      if (!near(baked, got, eps)) drift.push(`${label}: bakad ${baked} != malt ${got}`);
    };
    /* -- akkerid (`scoring.js`) -- */
    cmp("vsLeague.r", DST_ANCHOR.vsLeague.r, M.anchor.vsLeague.r, 0.0005);
    cmp("vsLeague.mae", DST_ANCHOR.vsLeague.mae, M.anchor.vsLeague.mae, 0.0005);
    cmp("vsLeague.exactPct", DST_ANCHOR.vsLeague.exactPct, M.anchor.vsLeague.exactPct, 0.001);
    cmp("vsLeague.n", DST_ANCHOR.vsLeague.n, M.anchor.vsLeague.n, 0);
    cmp("vsPublished.r", DST_ANCHOR.vsPublished.r, M.anchor.vsPublished.r, 0.0005);
    cmp("vsPublished.mae", DST_ANCHOR.vsPublished.mae, M.anchor.vsPublished.mae, 0.0005);
    cmp("vsPublished.exactPct", DST_ANCHOR.vsPublished.exactPct,
        M.anchor.vsPublished.exactPct, 0.001);
    cmp("vsPublishedWithLeagueBrackets", DST_ANCHOR.vsPublishedWithLeagueBrackets.exactPct,
        M.anchor.vsPublishedLeagueRules.exactPct, 0.001);
    cmp("sleeper self-disagreement", DST_ANCHOR.sleeperSelfDisagreement.differ,
        M.anchor.sleeperSelfDisagreement.differ, 0);

    /* -- leifin, FLOKKUD. Talan er hluti af fullyrdingunni: „27 rodir
          eru serlids-endurheimt" er annad en „27 rodir eru havadi". -- */
    for (const [k, v] of Object.entries(DST_ANCHOR.residuals)) {
      checked++;
      if (M.anchor.residualClasses[k] !== v) {
        drift.push(`residual "${k}": bakad ${v} != malt ${M.anchor.residualClasses[k]}`);
      }
    }
    /* -- akvordunin (`weekview.js`) -- */
    const D = M.decision;
    cmp("stream", DST_STREAM_MEASURED.stream.gain, D.fullPool.stream.gain, 0.005);
    cmp("stream.t", DST_STREAM_MEASURED.stream.t, D.fullPool.stream.t, 0.005);
    cmp("streamWaiverPool", DST_STREAM_MEASURED.streamWaiverPool.gain,
        D.waiverPool.stream.gain, 0.005);
    cmp("prevSeasonRank", DST_STREAM_MEASURED.prevSeasonRank.gain,
        D.fullPool.prevSeasonRank.gain, 0.005);
    cmp("prevSeasonRankWaiverPool", DST_STREAM_MEASURED.prevSeasonRankWaiverPool.gain,
        D.waiverPool.prevSeasonRank.gain, 0.005);
    cmp("seasonToDate", DST_STREAM_MEASURED.seasonToDate.gain,
        D.fullPool.seasonToDate.gain, 0.005);
    cmp("oracle", DST_STREAM_MEASURED.oracle.gain, D.fullPool.oracle.gain, 0.005);
    cmp("placeboMax", DST_STREAM_MEASURED.placeboMax, D.placebo.max, 0.005);
    cmp("streamPlusRank", DST_STREAM_MEASURED.streamPlusRank.gain,
        D.fullPool.streamPlusRank.gain, 0.005);
    cmp("streamPlusHalfRank", DST_STREAM_MEASURED.streamPlusHalfRank.gain,
        D.fullPool.streamPlusHalfRank.gain, 0.005);
    cmp("holdVsStream", DST_STREAM_MEASURED.holdVsStream.gain, D.holdVsStream.gain, 0.005);
    cmp("yearOverYear.r", DST_STREAM_MEASURED.yearOverYear.r,
        M.persistence.yearOverYear.r, 0.0005);
    cmp("weekToWeek.r", DST_STREAM_MEASURED.weekToWeek.r,
        M.persistence.weekToWeek.r, 0.0005);
    cmp("teamWeeks", DST_STREAM_MEASURED.teamWeeks, M.teamWeeks, 0);

    /* THEKJA ER FULLYRDING: falli fjoldinn hefur einhver eytt ur
       toflunni og thad a ad sjast, ekki lesast sem „allt i lagi". */
    ok(checked >= 26, `${checked} gildi borin saman (lagmark 26)`);
    ok(drift.length === 0, drift.length ? `REKUR: ${drift.join(" · ")}`
      : "hvert bakad gildi er nakvaemlega thad sem labid skrifadi");
  }
}

/* ============================================================
   2. NIDURSTADAN SJALF — STREYMI SLAER ROD, OG THAD ER SKILYRDID
      SEM RETTLAETIR AD ENGIN DST-ROD SE BYGGD
   ============================================================
   Þetta er ekki endurtekning a kafla 1. Kafli 1 spyr „er talan su sama
   og maelingin skrifadi"; hér er spurt „SEGIR talan thad sem eiginleikinn
   byggir a". Snuist merkid vid einn daginn a appid ad breytast, og tha
   a THETTA ad falla fyrst.                                          */
console.log("\n2. maelingin styður streymi, ekki rod");
{
  const M = DST_STREAM_MEASURED;
  ok(M.stream.gain > M.prevSeasonRank.gain * 3,
    `streymi ${M.stream.gain} er meira en throfaldur abati rodunar ${M.prevSeasonRank.gain}`);
  ok(M.prevSeasonRankWaiverPool.gain < 0,
    `rod er NEGATIF medal theirra sem eru lausir (${M.prevSeasonRankWaiverPool.gain})`);
  ok(M.prevSeasonRankWaiverPool.positive === 0,
    `og hun er negatif i ollum ${M.prevSeasonRankWaiverPool.years} arum`);
  ok(M.stream.gain > M.placeboMax * 5,
    `streymi ${M.stream.gain} er langt yfir placebo-thakinu ${M.placeboMax}`);
  ok(M.stream.positive === M.stream.years,
    `streymi er jakvaett i ollum ${M.stream.years} arum`);
  /* Ad blanda rodinni inn SKADAR — thad er rokstudningurinn fyrir thvi
     ad hun se hvergi i eiginleikanum, ekki bara „veik". */
  ok(M.streamPlusRank.gain < M.stream.gain && M.streamPlusHalfRank.gain < M.stream.gain,
    "hvert vaegi a rodina LAEKKAR abatan (fullt " +
    `${M.streamPlusRank.gain}, halft ${M.streamPlusHalfRank.gain} < ${M.stream.gain})`);
  /* Ferillinn milli ara ER til — og thad er einmitt thess vegna sem
     freistnin er raunveruleg. Hann ma ekki hverfa ur skjoluninni. */
  ok(M.yearOverYear.r > 0.25 && M.weekToWeek.r < 0.1,
    `ferill milli ara ${M.yearOverYear.r} en vika-til-viku ${M.weekToWeek.r}`);
  const note = dstStreamNote();
  ok(note.text.includes(String(M.stream.gain)) &&
     note.text.includes(String(M.prevSeasonRankWaiverPool.gain)),
    "setningin a skjanum ber BADAR tolurnar — abatan OG thad sem var hafnad");
}

/* ============================================================
   3. FORMULAN GEGN RAUNVERULEGRI VIKU, UPP A STIGID
   ============================================================
   Handreiknud lidsvika ur Sleeper 2025 (DEN, viku 1, gegn TEN).
   Sleeper birti: sack 6, ff 2, fum_rec 2, pts_allow 12 -> pts_std 16
   med theirra throskuldum. Med DEILDAR-throskuldunum (bilid 7-13 er
   4 i badum) er svarid thad SAMA, svo thetta profar formuluna en ekki
   throskulda-osamraemid — thad er profad ser i kafla 5.             */
console.log("\n3. formulan gegn thekktri viku");
{
  const den = { def_sacks: 6, def_fumbles_forced: 2, fumble_recovery_opp: 2,
                def_interceptions: 0, def_tds: 0, fumble_recovery_tds: 0,
                def_safeties: 0, special_teams_tds: 0,
                def_punt_blocks: 0, def_pat_blocks: 0, def_fg_blocks: 0,
                points_allowed: 12 };
  ok(dstPoints(den, BASE) === 16, `DEN viku 1 2025 = ${dstPoints(den, BASE)} (Sleeper: 16)`);

  /* Strengir. LABID FELL A THESSU: nflverse-CSV skilar strengjum og
     fyrsta utgafan gaf **0 fyrir hvert svid**, svo medaltalid var 0,47
     stig i stad 7,33 og akkerid las bias -7,08. Profid er hér svo thad
     geti ekki gerst thegjandi aftur. */
  const asText = {};
  for (const [k, v] of Object.entries(den)) asText[k] = String(v);
  ok(dstPoints(asText, BASE) === 16,
    `sama rod sem STRENGIR = ${dstPoints(asText, BASE)} (verdur ad vera 16)`);
  /* "NA" er nflverse-nullid og ma ekki verda NaN. */
  ok(dstPoints({ ...asText, def_interceptions: "NA" }, BASE) === 16,
    '"NA" les sem 0, ekki NaN');

  /* Baðir TD-dalkarnir leggjast saman — su villa kostadi MAE
     0,306 -> 0,112 og hun er thogul: badar utgafur skila tolu. */
  const base = { points_allowed: 20 };
  ok(dstPoints({ ...base, def_tds: 1 }, BASE) === dstPoints({ ...base, fumble_recovery_tds: 1 }, BASE),
    "def_tds og fumble_recovery_tds vega EINS (6 hvor)");
  ok(dstPoints({ ...base, def_tds: 1, fumble_recovery_tds: 1 }, BASE) -
     dstPoints(base, BASE) === 12, "og thau leggjast saman, ekki i stad hvor annars");

  /* Serlids-TD og forced fumble — bædi voru utan fyrstu toflunnar. */
  ok(dstPoints({ ...base, special_teams_tds: 1 }, BASE) - dstPoints(base, BASE) === 6,
    "return TD gefur 6");
  ok(dstPoints({ ...base, def_fumbles_forced: 3 }, BASE) - dstPoints(base, BASE) === 3,
    "forced fumble gefur 1 hver (an hennar fell nakvaemnin i 50,9%)");
  ok(dstPoints({ ...base, def_punt_blocks: 1, def_pat_blocks: 1, def_fg_blocks: 1 }, BASE) -
     dstPoints(base, BASE) === 6, "allar thrjar blokkerings-tegundir telja, 2 hver");
}

/* ============================================================
   4. STIG A SIG — LOKASTADAN ER EKKI SVARID
   ============================================================ */
console.log("\n4. dstPointsAllowed");
{
  /* 99,6% maeldist a thessari formulu; heil lokastada gaf 90,3%. */
  const opp = { def_tds: 1, fumble_recovery_tds: 0, def_safeties: 0 };
  ok(dstPointsAllowed(27, opp) === 21,
    `pick-six motherjans dregst fra: ${dstPointsAllowed(27, opp)} (27 - 6)`);
  ok(dstPointsAllowed(27, { ...opp, def_tds: 0, def_safeties: 1 }) === 25,
    "safety motherjans dregst fra (2)");
  /* ENDURKOMU-TD ER TALINN MED — maelt, ekki alyktað: sú utgafa sem dro
     hann lika fra fell ur 525/527 i 501/527. */
  ok(dstPointsAllowed(27, { def_tds: 0, special_teams_tds: 1 }) === 27,
    "en RETURN TD motherjans er TALINN MED (maelt: annad fell ur 99,6% i 95,1%)");
  ok(dstPointsAllowed("27", { def_tds: "1" }) === 21, "strengir virka lika");
}

/* ============================================================
   5. NULL ER EKKI NULL — SEX LEIDIR AD ENGU SVARI
   ============================================================
   Hver einasta thessara myndi, ef hun skilaði 0, birta „0.0" a skjanum
   sem er RAUNVERULEG utkoma i thessari toflu. Þess vegna er hver
   profud ser og thess vegna er throskuldurinn `null`-adgreindur fra
   bilinu 21-27, sem er lika 0.                                      */
console.log("\n5. null-agi");
{
  ok(dstPoints(null) === null, "engin rod -> null");
  ok(dstPoints(undefined) === null, "undefined -> null");
  ok(dstPoints("BAL") === null, "strengur i stad radar -> null");
  ok(dstPoints({ def_sacks: 5 }) === null,
    "rod AN stiga a sig -> null (throskuldurinn er -4..+10, svo tala an hans er allt ad 14 stigum rong)");
  ok(dstPoints({ def_sacks: 5, points_allowed: null }) === null,
    "points_allowed: null -> null");
  ok(dstPointsAllowed(null, {}) === null, "engin lokastada -> null");
  ok(dstPointsAllowed(20, null) === null, "engin rod motherjans -> null");
  ok(dstPointsAllowed("", {}) === null, "tomur strengur -> null, ekki 0");

  /* OG 0 VERDUR AD KOMAST I GEGN. Prof sem sannar adeins ad null verdi
     null getur stadist thott fallid skilaði ALLTAF null. */
  ok(dstPointsAllowed(0, { def_tds: 0 }) === 0, "hreint blad = 0 stig a sig, ekki null");
  ok(dstPoints({ points_allowed: 0 }, BASE) === 10, "og thad gefur 10 stig");
  ok(dstPoints({ points_allowed: 24 }, BASE) === 0,
    "og bilid 21-27 gefur NULL STIG — sem er tala, ekki 'ekkert'");

  /* `dstBracket` ma ekki fela skemmda toflu. */
  ok(dstBracket(20, []) === null, "tom throskuldatafla -> null");
  ok(dstBracket(20) === 1, "sjalfgefna taflan gefur 1 fyrir 20 stig a sig");
  ok(dstBracket(NaN) === null, "NaN -> null");
}

/* ============================================================
   6. DEILDIN ER HEIMILDIN — REGLURNAR ERU LESNAR, EKKI GISKADAR
   ============================================================ */
console.log("\n6. dstRulesFromSettings");
{
  /* Raunverulegar stillingar ur deild 1257117602308689920 (2025). */
  const real = { rec: 1, sack: 1, int: 2, fum_rec: 2, safe: 2, def_td: 6,
    blk_kick: 2, ff: 1, def_st_td: 6, def_st_ff: 1, def_st_fum_rec: 1,
    st_td: 6, st_ff: 1, st_fum_rec: 1,
    pts_allow_0: 10, pts_allow_1_6: 7, pts_allow_7_13: 4, pts_allow_14_20: 1,
    pts_allow_21_27: 0, pts_allow_28_34: -1, pts_allow_35p: -4 };
  const r = dstRulesFromSettings(real);
  ok(r.exact === true, "raunveruleg deild les sem EXACT (engin fals-vidvorun)");
  ok(r.missing.length === 0 && r.unmodelled.length === 0,
    "og hun ber hvorki vantandi ne oreiknanleg svid");
  ok(r.rules.dstSack === 1 && r.rules.dstInt === 2 && r.rules.dstTD === 6,
    "svidin lesast rett");
  ok(r.rules.dstPtsAllowed[3][1] === 1,
    "throskuldurinn 14-20 er 1 — LESINN UR DEILDINNI");

  /* Deild sem hefur BREYTT throskuldi faer sina tolu, ekki okkar. */
  const tweaked = dstRulesFromSettings({ ...real, pts_allow_14_20: 3, sack: 1.5 });
  ok(tweaked.rules.dstPtsAllowed[3][1] === 3 && tweaked.rules.dstSack === 1.5,
    "breytt deild faer SIN gildi, ekki sjalfgefin");
  ok(dstPoints({ def_sacks: 2, points_allowed: 17 }, tweaked.rules) === 6,
    `og dstPoints notar thau (2 x 1,5 + 3 = ${dstPoints({ def_sacks: 2, points_allowed: 17 }, tweaked.rules)})`);

  /* VANTI REGLA ER THAD SAGT. Þogul sjalfgefin tala er omaeld tala
     med utlit maeldrar — kjarnareglan i thessu repo-i. */
  const thin = dstRulesFromSettings({ rec: 1, sack: 1 });
  ok(thin.exact === false, "thunnar stillingar eru EKKI exact");
  ok(thin.missing.includes("int") && thin.missing.includes("pts_allow_14_20"),
    `og hvert vantandi svid er nefnt (${thin.missing.length} talsins)`);
  ok(thin.warnings.some((w) => w.includes("default")),
    "vidvorunin segir berum ordum ad sjalfgefid se notad");
  ok(thin.rules.dstInt === BASE.dstInt, "en gildid er samt nothaeft (sjalfgefid)");

  /* Regla sem vid getum ekki reiknad ma ekki thegja. */
  const yds = dstRulesFromSettings({ ...real, yds_allow_0_100: 5 });
  ok(yds.exact === false && yds.unmodelled.some((u) => u.startsWith("yds_allow_0_100")),
    "yards-allowed bonus er flaggad sem oreiknanlegt");
  /* ...EN SLEEPER-SJALFGEFID MA EKKI FLAGGA. Sama gildra og `fum: 0`
     hér ad ofan, sem flaggadi hverja einustu venjulegu deild. */
  ok(dstRulesFromSettings(real).unmodelled.length === 0,
    "og serlids-sjalfgefid (def_st_ff, st_fum_rec ...) flaggar EKKI");
  ok(dstRulesFromSettings({}).missing.length >= 15,
    "tomar stillingar -> allt talid vantandi, ekki thagad");
}

/* ============================================================
   7. STREYMID SEM APPID BIRTIR
   ============================================================ */
console.log("\n7. dstStream");
const TEAMS = [
  { team: "BAL", name: "Baltimore Ravens" }, { team: "CLE", name: "Cleveland Browns" },
  { team: "PIT", name: "Pittsburgh Steelers" }, { team: "CIN", name: "Cincinnati Bengals" },
  { team: "DEN", name: "Denver Broncos" }, { team: "KC", name: "Kansas City Chiefs" },
  { team: "LV", name: "Las Vegas Raiders" }, { team: "LAC", name: "Los Angeles Chargers" },
];
const SCHED = [
  /* spread er UR SJONARHORNI HEIMALIDS og jakvaett = heimalid favorit.
     total 40, spread 10 -> heima 25, uti 15. */
  { week: 3, type: "REG", home: "BAL", away: "CLE", total: 40, spread: 10 },
  { week: 3, type: "REG", home: "PIT", away: "CIN", total: 50, spread: 0 },
  /* leikur AN linu — motherjinn er thekktur en talan er ekki til. */
  { week: 3, type: "REG", home: "DEN", away: "KC", total: null, spread: null },
  /* LV og LAC eru i frii i viku 3 — engin rod. */
];
{
  const ctx = weekContext({ schedule: SCHED, defense: [], week: 3 });
  const s = dstStream({ ctx, teams: TEAMS, taken: new Set(["BAL"]), mine: "CLE" });

  ok(s.week === 3, "vikan fylgir med");
  ok(s.rows.length === 8, `allar ${s.rows.length} varnir eru i listanum (lika thaer an linu)`);

  const by = Object.fromEntries(s.rows.map((r) => [r.team, r]));
  /* BAL heima, favorit um 10 -> CLE er vaentanlegt ad skora 15. */
  ok(by.BAL.oppImplied === 15 && by.CLE.oppImplied === 25,
    `motherjans vaenta skor er lesid, ekki eigid (BAL ${by.BAL.oppImplied}, CLE ${by.CLE.oppImplied})`);
  ok(by.PIT.oppImplied === 25 && by.CIN.oppImplied === 25, "jafn leikur -> 25/25");

  /* TVAER OLIKAR TEGUNDIR AF ENGU, OG THAER MEGA EKKI RUGLAST SAMAN. */
  ok(by.DEN.oppImplied === null && by.DEN.bye === false && by.DEN.opp === "KC",
    "leikur an linu: motherji thekktur, tala null, EKKI bye");
  ok(by.LV.oppImplied === null && by.LV.bye === true && by.LV.opp === null,
    "fri: enginn motherji, tala null, bye satt");

  /* RODIN: laegst fyrst, null SIDAST. */
  ok(s.rows[0].team === "BAL", `laegsta vaenta skor motherja er efst (${s.rows[0].team})`);
  const firstNull = s.rows.findIndex((r) => r.oppImplied == null);
  ok(firstNull === 4 && s.rows.slice(firstNull).every((r) => r.oppImplied == null),
    "og oll null-gildin sitja i einum hala nedst");
  ok(s.rows.filter((r) => r.rank != null).length === 4 && s.rows[0].rank === 1,
    "rank er adeins gefid theim sem eiga tolu");

  /* TILLAGAN sleppir theim sem adrir eiga — en birtir tha samt. */
  ok(s.best.every((r) => !r.taken || r.mine), "tillagan er ur theim sem eru lausir (eda minir)");
  /* MIN EIGIN VORN ER GILDUR KOSTUR. Hun er „taken" i Sleeper-gognunum
     eins og hver onnur, svo sia sem hendir ollum toldum myndi henda
     henni lika og segja mer ad taka einhvern annan af engri astaedu. */
  ok(s.best.some((r) => r.team === "CLE" && r.mine),
    `min eigin vorn er i tillogunni (${s.best.map((r) => r.team).join(",")})`);
  ok(by.BAL.taken === true && s.best.every((r) => r.team !== "BAL"),
    "vorn sem annar a er SYND en er ekki tillaga");

  /* NULL SIDAST I BADAR ATTIR — thetta er profsteinninn. */
  const asc = s.rows.slice().sort((a, b) => compareOppImplied(a, b, "asc"));
  const desc = s.rows.slice().sort((a, b) => compareOppImplied(a, b, "desc"));
  ok(asc[0].oppImplied === 15 && asc[asc.length - 1].oppImplied == null,
    "asc: laegsta tala efst, null nedst");
  ok(desc[0].oppImplied === 25 && desc[desc.length - 1].oppImplied == null,
    "desc: haesta tala efst, null ENN nedst");
  ok(desc.slice(0, 4).every((r) => r.oppImplied != null),
    "og engin null-rod flytur upp i desc (fyrsta utgafan gaf `a-b` og null vard 0)");

  /* Forleikur: ekkert ctx -> engin tala, en listinn er samt til. */
  const pre = dstStream({ ctx: null, teams: TEAMS });
  ok(pre.rows.length === 8 && pre.rows.every((r) => r.oppImplied === null && r.rank === null),
    "an viku-samhengis er hver tala null — vid buum ekki til tolu ur engu");
  ok(pre.why && pre.why.length > 10, "og thad er SAGT, ekki tomur listi");
  ok(dstStream({}).rows.length === 0 && dstStream({}).why,
    "engar varnir -> tomt OG skyring");

  /* Vika thar sem ENGIN lina er opnud -> `why`, ekki throm rod af null. */
  const noLine = weekContext({ schedule: [
    { week: 9, type: "REG", home: "BAL", away: "CLE", total: null, spread: null }],
    defense: [], week: 9 });
  const nl = dstStream({ ctx: noLine, teams: TEAMS });
  ok(nl.why && nl.best.length === 0,
    "vika an nokkurrar linu segir hvers vegna listinn er tomur");
}

/* ============================================================
   8. STOKKBREYTINGAR — VARDHUNDUR SEM LIFIR SINA EIGIN ER ENGINN
   ============================================================
   Hver lina hér VAR keyrd med afturkallada lagfaeringu og felldi
   profid sem er nefnt. Þetta er skra yfir thad, ekki fullyrding um
   framtidina — en hun segir naesta lesanda HVAD var reynt.

   NITJAN stokkbreytingar voru keyrdar 14.8.2026 og ALLAR FELLDU:

      #  stokkbreyting                            fellir
      1  `dstFumForced -> 0`                      3 (DEN = 14, ekki 16)
      2  `fumble_recovery_tds` ur `dstTD`         3 (TD-linurnar)
      3  `dn` -> `n` (strengir verda 0)           3 (DEN = 4, ekki 16)
      4  `dstPointsAllowed` skilar lokastodu      4
      5  `dstBracket` skilar 0 i stad null        5
      6  `dstPoints` skilar 0 an points_allowed   5
      7  `compareOppImplied` -> `a-b`             7 (null flytur upp)
      8  `dstStream` les EIGID implied            7 (BAL 25, CLE 15)
      9  `bye` hardkodad `false`                  7 (LV)
     10  `missing` skilad tomu                    6
     11  `DST_UNMODELLED` tomad                   6 (fals-vidvorun)
     12  sjalfgefid `pts_allow_14_20 -> 0`        5
     13  `best` hunsar `taken`                    7
     14  return-TD lidurinn tekinn ut             3
     15  blokkeringar: adeins punt-blokk talin    3
     16  `<DstStream>` tekid ut ur tredinu        9
     17  `Dashboard` radar sjalfur med `a-b`      9
     18  maelda setningin tekin af skjanum        9
     19  hlutinn syndur i deild AN varnarsaetis   9

   Þrjar theirra fundust EKKI vid lestur heldur vid keyrslu: (3) kom ur
   akkerinu sjalfu (bias nakvaemlega -7,08), og (1) og (2) ur thvi ad
   FLOKKA leifina i stad thess ad kalla hana havada.                 */
console.log("\n8. stokkbreytingar eru skjaladar i haus thessa kafla");
{
  /* Ein er sannreynd HER OG NU, thvi hun er su eina sem ma ekki bida:
     falli null-agi i `compareOppImplied` fer bye-vorn efst i tillogu. */
  const withNull = [{ team: "A", oppImplied: null }, { team: "B", oppImplied: 20 }];
  const naive = withNull.slice().sort((a, b) => a.oppImplied - b.oppImplied);
  ok(naive[0].team === "A",
    "SANNPROFAD: naive `a-b` setur null-rodina EFST (thess vegna er compareOppImplied til)");
  ok(withNull.slice().sort((a, b) => compareOppImplied(a, b, "asc"))[0].team === "B",
    "og compareOppImplied gerir thad ekki");
}

/* ============================================================
   9. ER ÞETTA TENGT? — HREINT FALL GETUR VERID FULLPROFAD OG ALDREI KALLAD
   ============================================================
   Sama gat og `wiring.mjs` ver fyrir `draft-sync.js`, og fordaemid er
   markadslidurinn i FPL-appinu sem var **daudur i heila viku medan oll
   profin voru graen**. Kaflar 1-8 hér ad ofan gaetu allir verid graenir
   medan `DstStream` er hvergi a skjanum.

   Vardurinn er hér en ekki i `wiring.mjs` af hagnytri astaedu og hun er
   skrad: `wiring.mjs` var i virkri breytingu hja annarri lotu a sama
   vinnutre thegar thetta var skrifad, og ad skrifa i skra sem onnur lota
   er ad breyta er hvernig vinna tapast (`CLAUDE.md` kafli 2).

   OG FYRIRVARINN UR `wiring.mjs` GILDIR OBREYTTUR: thetta les KODA,
   ekki skjainn. Þad getur sagt „kallid er i skranni"; thad getur EKKI
   sagt „kallid keyrir i rettri grein".                               */
console.log("\n9. eiginleikinn er TENGDUR vid forsiduna");
{
  const src = readFileSync(
    path.resolve(new URL(".", import.meta.url).pathname, "..", "src", "Dashboard.jsx"),
    "utf8");
  /* Athugasemdir eru STRIPPADAR. Annars finnur leitin heitin i
     athugasemdinni sem NEFNIR thau og er graen thott kallid se farid —
     nakvaemlega gildran sem `wiring.mjs` kafli 5 skjalar. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");

  ok(/from\s+["']\.\/weekview\.js["']/.test(code) && /\bdstStream\b/.test(code),
    "`Dashboard.jsx` flytur inn `dstStream` ur `weekview.js`");
  ok(/dstStream\s*\(/.test(code), "og KALLAR hann");
  ok(/compareOppImplied\s*\(/.test(code),
    "og notar `compareOppImplied` — ekki sina eigin rodun (null myndi fljota upp)");
  ok(/dstStreamNote\s*\(/.test(code),
    "og birtir maelinguna sjalfa, svo talan standi ekki ein");
  ok(/<DstStream\b/.test(code), "og setur hlutann inn i tred");
  /* SÝNT ADEINS I DEILD SEM BYRJAR VORN. Kassi sem kviknar a deild an
     varnarsaetis er havadi, og havadi er laerdur sem eitthvad sem madur
     hunsar — sama rok og keeper-fals-jakvaednin i `sleeper-league.js`. */
  ok(/starters\s*&&\s*league\.starters\.DST|league\.starters\.DST/.test(code),
    "og adeins thegar deildin ber DST-saeti");
  /* Talan a skjanum ma ekki vera onnur en su sem var maeld. */
  ok(!/3\.82|\+3,82/.test(code),
    "abatinn er EKKI hardkodadur i .jsx — hann kemur ur `DST_STREAM_MEASURED`");
}

/* ============================================================
   10. PROSINN SJALFUR — TOLURNAR OG VIRUNAR-FULLYRDINGIN
   ============================================================
   Kafli 1 ber `DST_ANCHOR` vid `data/measure/dst.json`. Thad er
   vélsvid gegn vélsvidi og thad HELT — medan prosinn i somu tveimur
   skram bar 195/43/152 ur eldri keyrslu og akkerid bar 209/160/49.
   Profid las adeins vélsvidid, svo prosinn gat rekid ad eilifu:
   "athugasemd sem ekkert prof getur fellt" (CLAUDE.md 5b).

   Hér eru tolurnar LESNAR UT UR PROSANUM og bornar vid akkerid.

   OG SEINNI HELMINGURINN ER MIKILVAEGARI: README fullyrti ad appid
   laesi DST-reglur deildarinnar gegnum `dstRulesFromSettings`. Thad
   gerdi thad aldrei — null kallendur i `src/`. Vordurinn telur
   kallendurna og krefst thess ad SKJALIN SEGI THAD SAMA, i badar
   attir.                                                             */
console.log("\n10. prosinn: tolur og virunar-fullyrding");
{
  const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
  const readme = readFileSync(path.join(ROOT, "README.md"), "utf8");
  const scoringSrc = readFileSync(path.join(ROOT, "src", "scoring.js"), "utf8");

  /* --- 10a. tolurnar thrjar, LESNAR UT UR PROSANUM --- */
  const A = DST_ANCHOR.sleeperSelfDisagreement;
  const n = A.agree + A.differ;

  /* Fullyrdingin er ONYT nema strengirnir seu SANNANLEGA THARNA
     (CLAUDE.md 5b regla 2), svo hvert akkeri er fyrst fundid og
     TALID adur en tolurnar eru bornar saman. */
  const readmeBlock = readme.match(
    /Mælt á \*\*(\d+) sameiginlegum röðum\*\*:\s*\n\*\*(\d+) eru jafnar\*\* og \*\*(\d+) skeika\*\*/);
  ok(!!readmeBlock, "README ber setninguna um sameiginlegu radirnar (akkeri fannst)");
  if (readmeBlock) {
    const [, rn, rAgree, rDiffer] = readmeBlock.map(Number);
    ok(rn === n, `README: ${rn} sameiginlegar radir = akkerid ${n}`);
    ok(rAgree === A.agree, `README: ${rAgree} jafnar = akkerid ${A.agree}`);
    ok(rDiffer === A.differ, `README: ${rDiffer} skeika = akkerid ${A.differ}`);
  }

  const scoringBlock = scoringSrc.match(
    /Maelt a (\d+) sameiginlegum rodum: (\d+) eru jafnar og (\d+) skeika/);
  ok(!!scoringBlock, "`scoring.js` ber somu setningu (akkeri fannst)");
  if (scoringBlock) {
    const [, sn, sAgree, sDiffer] = scoringBlock.map(Number);
    ok(sn === n, `scoring.js: ${sn} sameiginlegar radir = akkerid ${n}`);
    ok(sAgree === A.agree, `scoring.js: ${sAgree} jafnar = akkerid ${A.agree}`);
    ok(sDiffer === A.differ, `scoring.js: ${sDiffer} skeika = akkerid ${A.differ}`);
  }

  /* Histogrammid er EITT STAK og prosinn segir bæði stakid og fjoldann.
     Thad er fullyrdingin sem ber "ekkert annad bil skeikar".

     AKKERID BER `delta: 1` (eitt stak, samanthjappad) en MAELISKRAIN ber
     `deltas: {"1": 49}` (allt histogrammid). Baedi eru lesin: akkerid er
     thad sem prosinn vitnar i, maeliskrain er thad sem sannar ad stakid
     se AÐEINS eitt. Ad lesa bara annad vaeri ad trua samanthjoppuninni. */
  ok(A.delta === 1, `akkerid: stakid er +${A.delta}`);
  {
    const M = JSON.parse(readFileSync(path.join(DATA, "measure", "dst.json"), "utf8"));
    const H = M.anchor.sleeperSelfDisagreement.deltas || {};
    const keys = Object.keys(H);
    ok(keys.length === 1 && keys[0] === String(A.delta) && H[keys[0]] === A.differ,
      `measure/dst.json: histogrammid er EITT stak, +${A.delta} x${A.differ}`);
  }
  ok(new RegExp(`\\+1 × ${A.differ}`).test(readme),
    `README nefnir stakid berum ordum ("+1 × ${A.differ}")`);
  ok(new RegExp(`\\+1 x${A.differ}`).test(scoringSrc),
    `scoring.js nefnir stakid berum ordum ("+1 x${A.differ}")`);

  /* GAMLA TALNASETTID MA EKKI SNUA AFTUR. Neikvaed fullyrding sem
     nefnir streng sem VAR sannanlega tharna (hann var i badum skram
     fram ad thessari lotu). */
  ok(!/195 sameiginlegum/.test(readme) && !/43 af 43/.test(readme),
    "gamla settid (195 / 43 af 43) er farid ur README");
  ok(!/43 af 43/.test(scoringSrc),
    "gamla settid (43 af 43) er farid ur `scoring.js`");

  /* --- 10b. VIRUNIN: kallendur taldir, badar attir --- */
  /* FYRSTA UTGAFA THESSA VARDAR TALDI BER NOFN OG FLAGGADI
     `scoring.js:dstBracket` SEM VIRUN. Thad var RANGT og vardurinn
     kenndi mér thad sjalfur: `dstPoints` kallar `dstBracket` inni i
     SINNI EIGIN skilgreiningu. Innri samsetning lab-eignarinnar er ekki
     virun i appid.

     RETTA SPURNINGIN I ES-EININGUM ER INNFLUTNINGUR. Ekkert i `src/`
     getur notad fallid an thess ad flytja thad inn, svo listinn yfir
     innflutninga ER listinn yfir kallendur — og hann er odyr ad lesa
     og omogulegur ad ruglast a vid innri samsetningu.                */
  const SRC = path.join(ROOT, "src");
  const NAMES = ["dstPoints", "dstBracket", "dstPointsAllowed",
                 "dstRulesFromSettings"];
  const DEFN = new Set(["scoring.js", "sleeper-league.js"]);
  const callers = [];
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (/\.(js|jsx)$/.test(e.name)) files.push(p);
    }
  };
  walk(SRC);

  for (const p of files) {
    const code = readFileSync(p, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^[ \t]*\/\/.*$/gm, " ");
    /* Hver innflutnings-blokk, hvort sem hun er a einni linu eda morgum. */
    for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']+["']/g)) {
      for (const nm of NAMES) {
        if (new RegExp(`\\b${nm}\\b`).test(m[1])) callers.push(`${path.basename(p)} flytur inn ${nm}`);
      }
    }
    /* OG GATID INNAN SKILGREININGARSKRANNA: `leagueFromSleeper` (sem
       App.jsx KALLAR) gaeti kallad `dstRulesFromSettings` an thess ad
       nokkur innflutningur saeist. Innganga lab-eignarinnar ma thvi
       birtast NAKVAEMLEGA EINU SINNI i sinni eigin skra — sem er
       skilgreiningin sjalf. */
    if (DEFN.has(path.basename(p))) {
      for (const nm of ["dstPoints", "dstRulesFromSettings"]) {
        const hits = (code.match(new RegExp(`\\b${nm}\\b`, "g")) || []).length;
        if (hits > 1) callers.push(`${path.basename(p)} nefnir ${nm} ${hits}x (> skilgreiningin ein)`);
      }
    }
  }

  /* THEKJA ER FULLYRDING: leitin verdur ad hafa SED skrarnar.
     Fyndi hun 0 skrar vaeri `callers.length === 0` satt af rangri
     astaedu — nakvaemlega tomma fullyrdingin ur CLAUDE.md 5b. */
  let scanned = 0;
  const count = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) count(p);
      else if (/\.(js|jsx)$/.test(e.name)) scanned++;
    }
  };
  count(SRC);
  ok(scanned >= 15, `leitin sa ${scanned} skrar i src/ (>= 15)`);
  /* THEKJA ER FULLYRDING, ekki logga: leitin verdur ad SANNA ad hun
     finni innflutninga a annad bord. Fyndi regexid ekkert (t.d. eftir
     breytingu a snidi) vaeri `callers.length === 0` satt af rangri
     astaedu — tomma fullyrdingin ur CLAUDE.md 5b. `dstStream` ER
     fluttur inn i Dashboard.jsx, svo hann er jakvaeda vidmidid. */
  let importsSeen = 0;
  for (const p of files) {
    const code = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
    for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']+["']/g)) {
      if (/\bdstStream\b/.test(m[1])) importsSeen++;
    }
  }
  ok(importsSeen >= 1,
    `innflutnings-leitin finnur SANNANLEGA innflutning (dstStream x${importsSeen})`);

  const wired = callers.length > 0;
  ok(!wired,
    `DST-stigafollin hafa ${callers.length} kallendur i src/` +
    (wired ? ` — ${callers.join(", ")}` : " (lab-heimild, eins og skjalad er)"));

  /* README VERDUR AD SEGJA THAD SAMA. Thetta er hlidid sem fellur ef
     einhver virar follin an thess ad leidretta kaflann — OG ef
     einhver skrifar kaflann aftur i fyrra horf an thess ad vira.

     GAMLA SETNINGIN ER VITNAD I VILJANDI i leidrettingunni ("Hér stod
     adur: ..."), svo ber leit ad henni FELLUR A EIGIN LAGFAERINGU. Hun
     ma thvi birtast NAKVAEMLEGA EINU SINNI og AÐEINS i tilvitnun. */
  const claimHits = (readme.match(/Þess vegna les appið reglurnar úr deildinni/g) || []).length;
  ok(claimHits === 1,
    `gamla virunar-setningin birtist ${claimHits}x (a ad vera 1: tilvitnunin)`);
  ok(/Hér stóð áður: \*„Þess vegna les appið reglurnar úr deildinni/.test(readme),
    "og hun er INNAN tilvitnunar, ekki sem lifandi fullyrding");
  const claimsLabOnly = /núll kallendur í `src\/`/.test(readme);
  ok(claimsLabOnly, "README segir berum ordum ad kallendur seu null i src/");
  ok(wired !== claimsLabOnly,
    "skjalid og kodinn segja THAD SAMA um virunina");
}

console.log(`\n${fail ? `${fail} PROF FELLU` : "oll DST-profin graen"}`);
process.exit(fail ? 1 : 0);
