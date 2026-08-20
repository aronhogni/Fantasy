/* ============================================================
   LIDA-TOLUR — src/teamstats.js OG data/team_shots.json

   HVAD THETTA VER, OG HVERS VEGNA THAD ER EKKI SNYRTIVERK:
   thessi tafla er notud til ad VELJA MARKVORD. Tvennt getur eyðilagt
   hana thogult og hvorugt fellur a byggingu:

     1. LAEGRA-ER-BETRA SNYST VID. Fyrir allt sem lid faer A SIG er
        haerri tala VERRI, nema langskot — thar er hun BETRI. Tafla sem
        litar haestu toluna graena i "skot a sig" segir notandanum ad
        versta vornin se su besta. VILLANDI MYND ER VERRI EN ENGIN MYND
        (sama regla og compare-visual.mjs ver, CLAUDE.md 6j).

     2. VANTANDI GILDI VERDUR AD NULLI. Nylidar attu enga leiki i
        deildinni i fyrra. Se `null` lesid sem 0 verda their MED NULL
        SKOT A SIG — og raðast thar med EFST i "besta vornin".

   KROSSPROFUN VID E0 er kafli 3: ESPN og football-data eru OHADAR
   heimildir og verda ad segja sama hlutinn. Sa vordur er astaedan
   thess ad ESPN-urdratturinn er treystandi yfirleitt.

   Keyrsla: node tests/team-stats.mjs
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
import { buildTeamRows, TEAM_STAT_DEFS, TEAM_GROUPS, sortTeamRows, TEAM_STAT_BY_KEY,
         TEAM_RANGE_SRC, teamRangeBlind, aggShotRange, aggFixtureRange, routeInStep,
         teamRangeUse, applyTeamRange, maxEventOf, SHOT_GOAL_TYPE }
  from "../src/teamstats.js";
import { aggregateTeamShots, BIG_CHANCE_XG, IN_BOX_X } from "../scripts/fetch-bsd-teams.mjs";

const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

console.log(`\n${"=".repeat(84)}`);
console.log("LIDA-TOLUR — teamstats.js");
console.log("=".repeat(84));

ok("data/team_shots.json er til", existsSync(D + "team_shots.json"));
const teams = J("teams.json"), teamForm = J("team_form.json"),
      luck = J("luck.json"), teamShots = J("team_shots.json");
const rows = buildTeamRows({ teams, teamForm, luck, teamShots });

/* ---------- 1. SKEMA ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("1. SKEMA — dalkar, flokkar, skyringar");
console.log("─".repeat(84));
ok(`ein rod per lid (${rows.length})`, rows.length === 20, `${rows.length}`);
ok("engir tvitekar lyklar", new Set(TEAM_STAT_DEFS.map(d => d.key)).size === TEAM_STAT_DEFS.length);
ok("hver dalkur tilheyrir gildum flokki",
  TEAM_STAT_DEFS.every(d => TEAM_GROUPS.some(g => g.key === d.group)));
ok("enginn flokkur tomur", TEAM_GROUPS.every(g => TEAM_STAT_DEFS.some(d => d.group === g.key)));
/* Stutt haus-heiti eru RADGATA an skyringar; styttingin og skyringin eru
   ein og sama akvordunin (sama regla og i stats.js).                    */
ok("hver dalkur hefur skyringu", TEAM_STAT_DEFS.every(d => (d.note || "").length > 20),
  TEAM_STAT_DEFS.filter(d => (d.note || "").length <= 20).map(d => d.key).join(","));
ok("hver dalkur nefnir heimild sina", TEAM_STAT_DEFS.every(d => !!d.src));
ok("haus-heiti komast fyrir (<= 8 stafir)",
  TEAM_STAT_DEFS.every(d => String(d.short).length <= 8),
  TEAM_STAT_DEFS.filter(d => String(d.short).length > 8).map(d => d.short).join(","));

/* ---------- 2. LAEGRA-ER-BETRA ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("2. ATTIN — haerra er EKKI alltaf betra");
console.log("─".repeat(84));
{
  /* Allt sem lid faer A SIG er verra thvi meira sem thad er — NEMA
     langskot, thvi thau eru odyrustu skotin sem haegt er ad gefa fra ser.
     Thessi listi er UPPTALINN her, ekki leiddur ut ur heiti, thvi hann er
     AKVORDUN um merkingu og a ad brotna synilega ef einhver snyr honum.  */
  const LOWER_BETTER = ["shots_against_pg", "sot_against_pg", "box_against_pg",
    "close_against_pg", "sot_share_against", "conceded_pg", "xgc_pg",
    "conceded_minus_xgc", "fouls_pg", "yellows_pg",
    "bc_against_pg", "xg_per_shot_against"];
  const HIGHER_BETTER = ["long_against_pg", "long_share", "cs_pct", "goals_pg",
    "xg_pg", "shots_pg", "sot_pg", "box_pg", "close_pg", "conversion",
    "goals_minus_xg", "corners_pg", "bc_pg"];
  const bad = [];
  for (const k of LOWER_BETTER) if (TEAM_STAT_BY_KEY[k]?.hi !== false) bad.push(`${k} aetti ad vera hi:false`);
  for (const k of HIGHER_BETTER) if (TEAM_STAT_BY_KEY[k]?.hi !== true) bad.push(`${k} aetti ad vera hi:true`);
  ok("hver dalkur ber retta att", bad.length === 0, bad.slice(0, 3).join(" · "));
  ok("allir dalkar eru i attar-listunum",
    LOWER_BETTER.length + HIGHER_BETTER.length === TEAM_STAT_DEFS.length,
    `${LOWER_BETTER.length}+${HIGHER_BETTER.length} a moti ${TEAM_STAT_DEFS.length}`);
  /* LANGSKOT ERU SERTILFELLID og thess vegna prófad SER: thau eru eina
     "a sig"-talan thar sem MEIRA ER BETRA, og thad er audveldast ad
     "laga" i ogati thegar einhver samraemir dalkana.                    */
  ok("LANGSKOT A SIG: haerra er BETRA (eina 'a sig'-talan sem er thannig)",
    TEAM_STAT_BY_KEY.long_against_pg.hi === true &&
    TEAM_STAT_BY_KEY.long_share.hi === true);
}

/* ---------- 3. KROSSPROFUN VID E0 ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("3. ESPN GEGN E0 — tvaer ohadar heimildir um sama hlut");
console.log("─".repeat(84));
{
  const e0 = {}; for (const t of teamForm.teams) if (t.fpl_id != null) e0[t.fpl_id] = t;
  const diffs = [];
  for (const t of teamShots.teams) {
    const e = e0[t.fpl_id]; if (!e || t.shots_pg == null) continue;
    diffs.push({ short: t.short, d: t.shots_pg - e.shots_pg, s: t.sot_pg - e.sot_pg });
  }
  ok(`bæði skrarnar bera somu lidin (${diffs.length})`, diffs.length >= 17, `${diffs.length}`);
  const worst = Math.max(...diffs.map(x => Math.abs(x.d)));
  const mean = diffs.reduce((a, b) => a + b.d, 0) / diffs.length;
  ok(`skotafjoldi stemmir innan 1,5 skots/leik (mest ${worst.toFixed(2)})`, worst < 1.5,
    diffs.filter(x => Math.abs(x.d) >= 1.5).map(x => x.short).join(","));
  /* SKEKKJAN ER KERFISBUNDIN OG THAD ER SVARID: ESPN telur faerri i
     OLLUM lidum (commentary sleppir hluta blokkadra skota). Vaeri hun
     handahofskennd — sum lid yfir, onnur undir — vaeri urdratturinn ad
     para skot vid rong lid, sem er allt annad og miklu verra.          */
  ok(`skekkjan er KERFISBUNDIN, ekki handahofskennd (medaltal ${mean.toFixed(2)})`,
    diffs.every(x => x.d < 0) || diffs.every(x => x.d > 0));
  ok("engin lid ber fleiri skot a mark en skot",
    teamShots.teams.every(t => t.sot_pg == null || t.sot_pg <= t.shots_pg));
  ok("skot i teig + langskot fara ALDREI yfir heildarskot",
    teamShots.teams.every(t => t.in_box_against_pg == null
      || t.in_box_against_pg + t.outside_against_pg <= t.shots_against_pg + 1e-9));
  ok("naerfaeri er HLUTMENGI skota i teig (markteigur er inni i vitateig)",
    teamShots.teams.every(t => t.close_against_pg == null
      || t.close_against_pg <= t.in_box_against_pg));
  ok("oll lid med 38 leiki (heilt timabil)",
    teamShots.teams.every(t => t.matches === 38),
    teamShots.teams.filter(t => t.matches !== 38).map(t => `${t.short}:${t.matches}`).join(","));
}

/* ---------- 4. NULL ER EKKI NULL ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("4. NYLIDAR — vantandi gildi ma ALDREI verda ad nulli");
console.log("─".repeat(84));
{
  const empty = rows.filter(r => TEAM_STAT_DEFS.every(d => d.get(r) == null));
  ok(`nylidar eiga engar tolur (${empty.map(r => r.short).join(", ")})`, empty.length === 3,
    `${empty.length}`);
  ok("og thaer eru NULL, ekki 0",
    empty.every(r => TEAM_STAT_DEFS.every(d => d.get(r) !== 0)));
  /* VILLAN SEM THETTA VER: se null lesid sem 0 raðast nylidi EFST i
     "faest skot a sig" og litur ut eins og besta vornin i deildinni.   */
  const asc = sortTeamRows(rows, "shots_against_pg", "asc");
  ok("NULL RADAST SIDAST i BADAR attir — nylidi verdur ekki 'besta vornin'",
    !empty.some(e => asc.slice(0, 5).some(r => r.id === e.id)),
    asc.slice(0, 5).map(r => `${r.short}:${r.shots_against_pg}`).join(" "));
  const desc = sortTeamRows(rows, "shots_against_pg", "desc");
  ok("og heldur ekki 'versta vornin'",
    !empty.some(e => desc.slice(0, 5).some(r => r.id === e.id)));
  ok("rodun tynir engri rod", asc.length === rows.length && desc.length === rows.length);
}

/* ---------- 5. TOLURNAR SJALFAR ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("5. GILDI — a raungognum, ekki tilbunum");
console.log("─".repeat(84));
{
  const ars = rows.find(r => r.short === "ARS");
  ok("ARS finnst", !!ars);
  ok("skot a sig eru jakvæd og raunhaef (5-20)",
    rows.filter(r => r.shots_against_pg != null)
        .every(r => r.shots_against_pg > 5 && r.shots_against_pg < 20));
  ok("hlutfall langskota a [0,1]",
    rows.filter(r => r.long_share != null).every(r => r.long_share >= 0 && r.long_share <= 1));
  ok("hreint blad % a [0,100]",
    rows.filter(r => r.cs_pct != null).every(r => r.cs_pct >= 0 && r.cs_pct <= 100));
  /* xG/xGC KOMA UR BSD (8.8.2026) OG MEGA ThVI EKKI BERA `incomplete`.
     Adur voru thau FPL-summa og BYGGINGARLEGA bilud (lids-xGC ur EINUM
     markverdi) — Leeds 0,70 a moti raunverulegum 1,47. Nu er heimildin
     per-skot xG, svo flaggid vaeri RANGT og myndi fela raunverulega
     baetingu. Ef einhver skiptir aftur i FPL-summuna verdur hann ad
     setja flaggid aftur a — og tha fellur thetta prof.                */
  ok("xGC og xG koma ur BSD, ekki FPL-summu",
    ["xgc_pg", "xg_pg", "goals_minus_xg", "conceded_minus_xgc"]
      .every(k => TEAM_STAT_BY_KEY[k].src === "BSD"));
  ok("og bera thvi EKKI `incomplete`",
    ["xgc_pg", "xg_pg", "goals_minus_xg", "conceded_minus_xgc"]
      .every(k => !TEAM_STAT_BY_KEY[k].incomplete));
  /* BSD naer yfir EITT timabil — thad ma ekki gleymast i merkingunni. */
  ok("og eru `season_locked` (BSD naer adeins yfir 2025/26)",
    ["xgc_pg", "xg_pg", "goals_minus_xg", "conceded_minus_xgc"]
      .every(k => TEAM_STAT_BY_KEY[k].season_locked === true));
  ok("skyring xG/xGC nefnir per-skot-heimildina",
    ["xgc_pg", "xg_pg"].every(k => /per-shot|per shot/i.test(TEAM_STAT_BY_KEY[k].note)));
}

/* ---------- 6. BIG CHANCES ERU EKKI HER ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("6. VORDUR — 'big chances' ma ALDREI birtast sem maeld tala");
console.log("─".repeat(84));
{
  /* VORDURINN ThRENGDIST 8.8.2026 I STAD ThESS AD SLOKKNA.
     Adur bannadi hann heitid ALFARID, af thvi ad engin naanleg heimild
     gaf xG per skot. BSD gefur hana nu (100% skota 2025/26), svo bann
     vaeri ordid rangt — en TILGANGURINN er obreyttur: dalkur MA heita
     "big chance" ADEINS ef hann er raunverulega talinn ur per-skot xG.
     Se einhver seinna kominn med "big chances" ur ESPN-svaedi eda ur
     agiskun, er thad OKKAR likan sem litur ut eins og maeling —
     nakvaemlega thad sem CLAUDE.md 6b/6e banna, og THA fellur thetta.  */
  const named = TEAM_STAT_DEFS.filter(d => /big chance/i.test(`${d.label} ${d.short}`));
  ok(`${named.length} dalkar heita 'big chance' — og ALLIR koma ur BSD (per-skot xG)`,
    named.length > 0 && named.every(d => d.src === "BSD"),
    named.filter(d => d.src !== "BSD").map(d => `${d.key}:${d.src}`).join(","));
  ok("enginn ESPN-dalkur thykist vera big chance",
    TEAM_STAT_DEFS.filter(d => d.src === "ESPN")
      .every(d => !/big chance/i.test(`${d.label} ${d.short}`)));
  ok("naerfaeris-dalkurinn segir BERUM ORDUM ad hann se ekki big chance",
    /not the same number|stand-in/i.test(TEAM_STAT_BY_KEY.close_against_pg.note));
  /* BADAR RITANIR: notan var thydd a ensku 9.8.2026 en `team_shots.json`
     er skrifud af HANDVIRKRI skriftu, svo committuda skrain ber enn gomlu
     islensku notuna thangad til hun er keyrd aftur. Prof sem taeki adeins
     adra ritunina fellur vid naestu keyrslu — thogul timasprengja.      */
  ok("skran sjalf ber sama fyrirvara",
     /BIG CHANCES ERU EKKI HER|BIG CHANCES ARE NOT HERE/i.test(teamShots.note || ""));
  ok("og hun ber krossprofunina vid E0",
     /KROSSPROFAD GEGN E0|CROSS-CHECKED AGAINST E0/i.test(teamShots.note || ""));
}

/* ---------- 7. THOLIR TOM INNTOK ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("7. SEIGLA — engin skra ma fella flipann");
console.log("─".repeat(84));
{
  const cases = [
    ["engin gogn", {}],
    ["adeins lid", { teams }],
    ["team_form vantar", { teams, luck, teamShots }],
    ["luck vantar", { teams, teamForm, teamShots }],
    ["team_shots vantar", { teams, teamForm, luck }],
    ["rusl i stad skra", { teams, teamForm: 7, luck: "x", teamShots: [] }],
  ];
  let bad = null;
  for (const [name, arg] of cases) {
    try {
      const r = buildTeamRows(arg);
      for (const d of TEAM_STAT_DEFS) for (const row of r) {
        const v = d.get(row);
        if (v !== null && typeof v !== "number") { bad = `${name}: ${d.key} skilar ${typeof v}`; break; }
        if (typeof v === "number" && !Number.isFinite(v)) { bad = `${name}: ${d.key} = ${v}`; break; }
      }
    } catch (e) { bad = `${name}: ${e.message}`; }
    if (bad) break;
  }
  ok("oll 22 get() thola hvada tomu/gollud inntok sem er", !bad, bad || "");
  ok("tom inntok gefa tomt fylki, ekki hrun", buildTeamRows({}).length === 0);
}

/* ---------- 8. BSD-SAMLAGNINGIN (big chances a sig) ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("8. aggregateTeamShots — kodinn sem kviknar fyrst thegar BSD_KEY er til");
console.log("─".repeat(84));
{
  /* Sami rokstudningur og i mins-trend.mjs kafla 0 og defcon-shrink.mjs:
     thetta er kodi sem KEYRIR EKKI HER (hann tharf lykil sem er write-only
     i GitHub Secrets), og omældur kodi sem fer i gang einn morgun er ekki
     asaettanlegt. Hann er thvi dreginn UT sem hreint fall og profadur a
     TILBUNUM BSD-svorum.                                                */
  const m = (home, away, shots, reported) => ({ home, away, shots, reported });
  const S = (team_id, xg, x) => ({ team_id, xg, x });

  {
    /* Grunntilfelli: 1 gegn 2. Lid 1 tekur tvo skot (annad big chance),
       lid 2 eitt (big chance). Faced-tolurnar eru SPEGILMYND.           */
    const r = aggregateTeamShots([m(1, 2, [S(1, 0.5, 10), S(1, 0.05, 30), S(2, 0.9, 5)])]);
    const t1 = r.teams.find(t => t.team_id === 1), t2 = r.teams.find(t => t.team_id === 2);
    ok("bædi lid fa leikinn talinn", t1.matches === 1 && t2.matches === 1);
    ok("big chances FYRIR eru rett (1 og 1)", t1.bc_pg === 1 && t2.bc_pg === 1,
      `${t1.bc_pg} / ${t2.bc_pg}`);
    ok("big chances A SIG eru SPEGILMYND (1 og 1)",
      t1.bc_against_pg === 1 && t2.bc_against_pg === 1, `${t1.bc_against_pg} / ${t2.bc_against_pg}`);
    ok("skot a sig hja lidi 2 eru skotin sem lid 1 tok (2)", t2.shots_against_pg === 2,
      `${t2.shots_against_pg}`);
    ok("xG a hvert skot a sig er GAEDATALAN (0,9 fyrir lid 1)",
      Math.abs(t1.xg_per_shot_against - 0.9) < 1e-6, `${t1.xg_per_shot_against}`);
  }
  {
    /* ThROSKULDURINN ER JAFNT-EDA-STAERRA. Skot NAKVAEMLEGA a 0,18 er
       big chance; 0,179 er thad ekki. Se merkinu snuid faerast tolur.  */
    const r = aggregateTeamShots([m(1, 2, [S(1, BIG_CHANCE_XG, 10), S(1, BIG_CHANCE_XG - 0.001, 10)])]);
    ok("skot NAKVAEMLEGA a throskuldinum telst big chance",
      r.teams.find(t => t.team_id === 1).bc_pg === 1);
  }
  {
    /* SKOT AN LIDS ER SLEPPT, EKKI EIGNAD HEIMALIDINU. Rong eignun telur
       BADUM megin rangt — fyrir hja einu, a sig hja hinu — og er thvi
       TVOFOLD villa, ekki hálf.                                         */
    const r = aggregateTeamShots([m(1, 2, [S(null, 0.9, 5), S(1, 0.5, 5)])]);
    ok("skot an lids er talid SER, ekki eignad", r.no_team === 1);
    ok("og faced-talan mengast ekki af thvi",
      r.teams.find(t => t.team_id === 1).bc_against_pg === 0,
      `${r.teams.find(t => t.team_id === 1).bc_against_pg}`);
    const bad = aggregateTeamShots([m(1, 2, [S(99, 0.9, 5), S(1, 0.5, 5)])]);
    ok("skot eignad lidi sem er EKKI i leiknum er lika sleppt", bad.no_team === 1);
  }
  {
    /* SKOT AN xG TELST I `shots` EN EKKI I xG. Ad lata thad gilda 0
       thynnti medaltalid THOGULT.                                       */
    const r = aggregateTeamShots([m(1, 2, [S(1, null, 5), S(1, 0.4, 5)])]);
    const t2 = r.teams.find(t => t.team_id === 2);
    ok("skot an xG telst med i skotafjolda", t2.shots_against_pg === 2);
    ok("en THYNNIR EKKI xG a hvert skot (0,4 / 1 skot med xG)",
      Math.abs(t2.xg_per_shot_against - 0.2) < 1e-6, `${t2.xg_per_shot_against}`);
    ok("og er talid", r.no_xg === 1);
  }
  {
    /* LEIKUR AN SKOTAKORTS TELST EKKI SEM LEIKUR. Annars deildum vid med
       haerri leikjafjolda en gognin na yfir og HVER per-leik tala yrdi
       kerfisbundid of lag — thogul skekkja sem litur ut eins og maeling. */
    const r = aggregateTeamShots([m(1, 2, []), m(1, 2, [S(1, 0.9, 5)])]);
    ok("leikur an skotakorts er talinn SER", r.no_shotmap === 1);
    ok("og hann taeklar EKKI med i deilingunni (matches = 1, ekki 2)",
      r.teams.find(t => t.team_id === 1).matches === 1,
      `${r.teams.find(t => t.team_id === 1).matches}`);
    ok("svo big chances per leik er 1,0 en ekki 0,5",
      r.teams.find(t => t.team_id === 1).bc_pg === 1);
  }
  {
    /* BSD-BIRTA TALAN ER GEYMD VID HLIDINA, ALDREI I STAD OKKAR — svo
       rek i throskuldinum sjaist STRAX i stad thess ad okkar tala reki
       thogult thegar BSD skiptir um xG-likan.                           */
    const r = aggregateTeamShots([m(1, 2, [S(1, 0.9, 5)], { 1: { big_chances: 3 } })]);
    const t1 = r.teams.find(t => t.team_id === 1), t2 = r.teams.find(t => t.team_id === 2);
    ok("okkar talning stendur obreytt", t1.bc_pg === 1);
    ok("og BSD-talan er geymd SER", t1.bc_reported_pg === 3, `${t1.bc_reported_pg}`);
    ok("birta talan speglast lika sem 'a sig'", t2.bc_reported_against_pg === 3);
    const none = aggregateTeamShots([m(1, 2, [S(1, 0.9, 5)])]);
    ok("vanti birta talan er hun NULL, ekki 0",
      none.teams.find(t => t.team_id === 1).bc_reported_pg === null);
  }
  {
    /* Innan/utan teigs fylgir MAELDA kvardanum (hlutfall af FULLUM velli). */
    const r = aggregateTeamShots([m(1, 2, [S(1, 0.5, IN_BOX_X - 1), S(1, 0.5, IN_BOX_X + 1)])]);
    ok("skot innan teigs talid eftir maelda kvardanum",
      r.teams.find(t => t.team_id === 1).in_box_pg === 1);
  }
  {
    const r = aggregateTeamShots([]);
    ok("tomt inntak fellur ekki", r.teams.length === 0 && r.no_shotmap === 0);
    ok("rusl fellur ekki", aggregateTeamShots(null).teams.length === 0);
    ok("leikur an beggja lida er sleppt",
      aggregateTeamShots([{ home: 1, shots: [S(1, .5, 5)] }]).teams.length === 0);
  }
}

/* ---------- 9. DALKARNIR THOLA AD SKRAIN SE EKKI TIL ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("9. BSD-dalkar an bsd_teams.json — tomir, EKKI nullir eda hrun");
console.log("─".repeat(84));
{
  const BSD_KEYS = ["bc_against_pg", "bc_pg", "xg_per_shot_against"];
  ok("dalkarnir eru skradir", BSD_KEYS.every(k => TEAM_STAT_BY_KEY[k]));
  ok("their eru merktir BSD", BSD_KEYS.every(k => TEAM_STAT_BY_KEY[k].src === "BSD"));
  /* Their na yfir EITT timabil og verda ad segja thad sjalfir — annars
     les notandinn tomt sem "engin big chance" i 2023/24.               */
  ok("og skyring theirra segir ad thekjan se eitt timabil",
    BSD_KEYS.every(k => /2025\/26/.test(TEAM_STAT_BY_KEY[k].note)));
  const rowsNoBsd = buildTeamRows({ teams, teamForm, luck, teamShots });
  ok("an skrarinnar eru their NULL hja ollum (ekki 0)",
    rowsNoBsd.every(r => BSD_KEYS.every(k => TEAM_STAT_BY_KEY[k].get(r) === null)));
  /* Og MED skra virka their — hermd svo profid se ekki had thvi ad
     einhver hafi keyrt soknina.                                        */
  const fake = { teams: [{ fpl_id: 1, bc_against_pg: 1.5, bc_pg: 2.5, xg_per_shot_against: 0.11, matches: 38 }] };
  const rowsBsd = buildTeamRows({ teams, teamForm, luck, teamShots, bsdTeams: fake });
  const ars = rowsBsd.find(r => r.id === 1);
  ok("med skra rata tolurnar i rodina", ars.bc_against_pg === 1.5 && ars.bc_pg === 2.5);
  ok("og hin lidin haldast NULL", rowsBsd.filter(r => r.id !== 1).every(r => r.bc_against_pg === null));
  ok("BIG_CHANCE_XG er maeldi fastinn 0,18", BIG_CHANCE_XG === 0.18);
}

/* ---------- 10. OFULLKOMNIR DALKAR FULLYRDA EKKI ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("10. besta/versta ma EKKI standa a dalki sem vantar gogn i");
console.log("─".repeat(84));
{
  /* Vordurinn er a SKRANNI, ekki a birtingunni: `incomplete` er thad sem
     Teams.jsx les til ad sleppa merkingunni, svo hann verdur ad vera
     rettur a hverjum dalki sem byggir a FPL-summunni. Fari hann af einum
     theirra fer graena merkingin aftur a toluna sem getur ekki borid
     hana — og thad er nakvaemlega villan sem sast a Leeds (xGC 0,70
     "best" medan raunveruleg mork a sig voru 1,47).                    */
  const fplSummed = TEAM_STAT_DEFS.filter(d => d.src === "FPL");
  /* EFTIR 8.8.2026 ER ENGINN FPL-SUMMU-DALKUR EFTIR — xG/xGC foru i BSD.
     Reglan stendur samt: BAETIST einn vid verdur hann ad bera flaggid. */
  ok(`allir ${fplSummed.length} FPL-summu-dalkar bera \`incomplete\``,
    fplSummed.every(d => d.incomplete === true),
    fplSummed.filter(d => !d.incomplete).map(d => d.key).join(","));
  /* Og OFUGT: dalkur sem er heill ma EKKI bera flaggid, annars taeki hann
     ad astaedulausu af ser merkinguna.                                  */
  ok("engir E0- eda BSD-dalkar bera flaggid ad ostaedu",
    TEAM_STAT_DEFS.filter(d => d.src !== "FPL").every(d => !d.incomplete),
    TEAM_STAT_DEFS.filter(d => d.src !== "FPL" && d.incomplete).map(d => d.key).join(","));
  const teamsJsx = readFileSync(new URL("../src/Teams.jsx", import.meta.url), "utf8");
  ok("Teams.jsx sleppir merkingunni a theim (`if (d.incomplete) return null`)",
    /if \(d\.incomplete\) return null/.test(teamsJsx));
}

/* ---------- 11. FJOL-TIMABILA SKRAIN OG TOMA-KEYRSLU VORDURINN ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("11. bsd_teams.json — lyklud a timabil, og tom keyrsla ma ekki thurrka ut");
console.log("─".repeat(84));
{
  const bsd = existsSync(D + "bsd_teams.json") ? J("bsd_teams.json") : null;
  ok("bsd_teams.json er til", !!bsd);
  if (bsd) {
    ok("hun ber `seasons` (lyklud a timabil, ekki flot ein keyrsla)",
      !!bsd.seasons && Object.keys(bsd.seasons).length >= 1,
      Object.keys(bsd.seasons || {}).join(","));
    /* Efsta lagid speglar NYJASTA timabilid svo vidmot sem les skrana
       beint haldist obreytt thegar fleiri timabil baetast vid.        */
    const newest = Object.values(bsd.seasons)
      .sort((a, b) => String(b.season).localeCompare(String(a.season)))[0];
    ok("efsta lagid speglar nyjasta timabilid", bsd.season === newest.season,
      `${bsd.season} vs ${newest.season}`);
    ok("timabils-heitid er SOTT, ekki hardkodad (a formi 20xx/xx)",
      /^\d{4}\/\d{2}$/.test(String(bsd.season)), String(bsd.season));
    ok("hvert timabil ber sina lida-rod", Object.values(bsd.seasons)
      .every(sn => Array.isArray(sn.teams) && sn.teams.length > 0));
    /* KROSSPROFUNIN MA ALDREI VERDA NULL AFTUR: hun var thad i heilli
       keyrslu thvi lids-svidid var lesid ur RONGU sniði, og hun thagdi
       med. Se hun null er sniðið breytt.                              */
    ok(`krossprofun okkar-gegn-BSD-birtu er til (MAE ${bsd.derived_vs_reported_mae})`,
      typeof bsd.derived_vs_reported_mae === "number");
    ok("og hun er innan marka (MAE < 0,6 big chances/leik)",
      bsd.derived_vs_reported_mae < 0.6, String(bsd.derived_vs_reported_mae));
    ok("engin lid an leikja", bsd.teams.every(t => t.matches > 0));
  }
  /* Vordurinn i skriftunni sjalfri — hann er thad sem stendur milli
     "keyri fyrir naesta timabil" og thess ad thurrka ut heilt ar.     */
  const src = readFileSync(new URL("../scripts/fetch-bsd-teams.mjs", import.meta.url), "utf8");
  ok("skriftan neitar ad skrifa thegar ENGINN leikur hefur skotakort",
    /if \(!matches\.length\)[\s\S]{0,400}process\.exit\(2\)/.test(src));
  ok("og hun SAMEINAR vid fyrri timabil i stad thess ad yfirskrifa",
    /bySeason\[seasonName\] = payload/.test(src) && /old\.seasons \|\|/.test(src));
}

/* ============================================================
   12. UMFERDAR-BILID — HVER TALA FYLGIR ThVI, OG HVER SEGIR AD HUN GERI ThAD EKKI

   KAERAN (20.8.2026): "i teams se eg bara season stats, afhverju get eg ekki
   filterad GC nidur a gameweeks? Eda CS%. Eins i attack, stats breytast
   ekki thar thegar eg filtera gameweeks."

   TVO EINKENNI, EIN ORSOK. Valarinn var tengdur `fixtures.json` (YFIRSTANDANDI
   timabil, 0 loknir leikir) medan taflan synir thad sidasta, svo urslita-
   dalkarnir urdu tomir og allir hinir satu OBREYTTIR i thogn.

   ThESSI KAFLI SANNAR ThRENNT, OG ThAD MIDJA ER ThAD SEM GERIR KAERUNA
   OMOGULEGA AFTUR:
     1. Bils-heimildin er RETT — hun endurgerir E0 upp a markid.
     2. BIL SEM ER VALID BREYTIR TOLUNNI. Arstidar-tala og hluta-bil VERDA
        ad vera olik; jofn tala er nakvaemlega kaeran.
     3. Dalkur sem getur EKKI fylgt bilinu breytist EKKI og BER MERKID.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("12. UMFERDAR-BILID — pure-leidin");
console.log("─".repeat(84));
{
  const bsdTeams = existsSync(D + "bsd_teams.json") ? J("bsd_teams.json") : null;
  const fixtures = J("fixtures.json");
  const sf = J("bsd_shots.json");
  const F = Object.fromEntries(sf.legend.fields.map((f, i) => [f, i]));

  /* MARK-GERDIN ER SAETI 0 — ThAD ER FORSENDA I `teamstats.js` OG I
     `ShotMap.jsx` (`s.t === 0`), og skran er eina sem getur svarad thvi.
     Faerist markid ur saeti 0 hja BSD verda MORK, MORK A SIG og HREIN BLOD
     oll rong i bili, og ekkert annad myndi segja fra.                     */
  ok(`"goal" er saeti ${SHOT_GOAL_TYPE} i legend.type (${(sf.legend.type || []).join(",")})`,
    Array.isArray(sf.legend.type) && sf.legend.type[SHOT_GOAL_TYPE] === "goal");

  /* Visarnir eru byggdir EINS og App.jsx byggir tha — annars vaeri profid
     ad maela annan hlut en skjarinn.                                      */
  const byTeam = new Map(), byOpp = new Map();
  const put = (m, k, v) => { if (k == null) return; const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
  for (const s of sf.shots) { put(byTeam, s[F.team], s); put(byOpp, s[F.opp], s); }
  const shotIndex = { byTeam, byOpp, teams: sf.legend.teams, fields: F, calib: sf.calib };

  const base = buildTeamRows({ teams, teamForm, luck, teamShots, bsdTeams });
  const use = teamRangeUse({ base, shotIndex, fixtures });

  /* ---- 12a. SKRAINGIN SJALF: hver dalkur er annadhvort skrasettur eda blindur */
  const known = TEAM_STAT_DEFS.filter(d => TEAM_RANGE_SRC[d.key]);
  ok(`${known.length} af ${TEAM_STAT_DEFS.length} dalkum eru skrasettir sem bils-haefir`,
    known.length >= 8 && known.length < TEAM_STAT_DEFS.length, `${known.length}`);
  ok("hver skrasett heimild er ein af thremur", Object.values(TEAM_RANGE_SRC)
    .every(v => ["shots", "results", "both"].includes(v)));
  ok("hver lykill i TEAM_RANGE_SRC er RAUNVERULEGUR dalkur",
    Object.keys(TEAM_RANGE_SRC).every(k => TEAM_STAT_BY_KEY[k]),
    Object.keys(TEAM_RANGE_SRC).filter(k => !TEAM_STAT_BY_KEY[k]).join(","));
  /* Dalkur sem er EKKI skrasettur er blindur — an undantekningar, an lista. */
  ok("oskrasettur dalkur er ALLTAF blindur",
    TEAM_STAT_DEFS.filter(d => !TEAM_RANGE_SRC[d.key])
      .every(d => teamRangeBlind(d.key, { shots: true, results: "shots" })));
  /* "both" tharf BADAR — annars vaeri mismunur reiknadur ur tveimur bilum. */
  ok("`both`-dalkur er blindur vanti adra leidina",
    teamRangeBlind("goals_minus_xg", { shots: true, results: null }) === true &&
    teamRangeBlind("goals_minus_xg", { shots: false, results: "shots" }) === true &&
    teamRangeBlind("goals_minus_xg", { shots: true, results: "shots" }) === false);

  /* ---- 12b. HEIMILDIN ER RETT: OHAD ENDURTALNING GEGN E0 ---- */
  {
    /* SJALFSTAED UTFAERSLA, ekki kall i somu skra: mork eru talin med
       `type === 0`, leikir med (umferd, motherji), og bornar vid
       football-data. Tvaer oskyldar leidir ad somu tolu (CLAUDE.md 6t).  */
    const ref = new Map();
    for (const s of sf.shots) {
      const t = sf.legend.teams[s[F.team]], o = sf.legend.teams[s[F.opp]];
      const g = s[F.gw], goal = s[F.type] === SHOT_GOAL_TYPE;
      const kFor = `${g}|${s[F.opp]}`, kAg = `${g}|${s[F.team]}`;
      if (t != null) {
        const a = ref.get(t) || new Map(); ref.set(t, a);
        const m = a.get(kFor) || { gf: 0, ga: 0 }; if (goal) m.gf++; a.set(kFor, m);
      }
      if (o != null) {
        const a = ref.get(o) || new Map(); ref.set(o, a);
        const m = a.get(kAg) || { gf: 0, ga: 0 }; if (goal) m.ga++; a.set(kAg, m);
      }
    }
    const e0 = {}; for (const t of teamForm.teams) if (t.fpl_id != null) e0[t.fpl_id] = t;
    let cmp = 0, gOk = 0, cOk = 0, csOk = 0, nOk = 0;
    for (const r of base) {
      const a = ref.get(r.short), e = e0[r.id];
      if (!a || !e || !(e.matches > 0)) continue;
      cmp++;
      let gf = 0, ga = 0, cs = 0;
      for (const m of a.values()) { gf += m.gf; ga += m.ga; if (m.ga === 0) cs++; }
      if (a.size === e.matches) nOk++;
      if (Math.round(e.goals_pg * e.matches) === gf) gOk++;
      if (Math.round(e.conceded_pg * e.matches) === ga) cOk++;
      if (Math.round(e.clean_sheet_pct / 100 * e.matches) === cs) csOk++;
    }
    ok(`${cmp} lid eiga BAEDI skotakort og E0-rod (forsenda kaflans)`, cmp >= 15, `${cmp}`);
    ok(`leikjafjoldi stemmir (${nOk}/${cmp})`, nOk === cmp);
    ok(`MORK stemma UPP A MARKID (${gOk}/${cmp})`, gOk === cmp);
    ok(`MORK A SIG stemma upp a markid (${cOk}/${cmp})`, cOk === cmp);
    ok(`HREIN BLOD stemma upp a markid (${csOk}/${cmp})`, csOk === cmp);
    /* Og samlagningin i `teamstats.js` gefur SAMA og thessi ohada utfaersla. */
    const agg = aggShotRange(shotIndex, null);
    let same = 0;
    for (const [short, a] of ref) {
      const x = agg.get(short); if (!x) continue;
      let gf = 0, ga = 0; for (const m of a.values()) { gf += m.gf; ga += m.ga; }
      if (x.gf === gf && x.ga === ga && x.n === a.size) same++;
    }
    ok(`aggShotRange er samhljoda ohadu utfaerslunni (${same}/${ref.size})`, same === ref.size);
  }

  /* ---- 12b2. TVOFOLD UMFERD — TILBUID SKOTAKORT ThAR SEM SVARID ER ThEKKT
     RAUNGOGNIN GETA EKKI SVARAD ThESSU: maelt, hvert eitt af 17 lidum a
     NAKVAEMLEGA 38 leiki i 38 umferdum 2025/26, svo tvofold umferd er ekki i
     skranni og nefnari sem taeldi UMFERDIR i stad LEIKJA gaefi somu tolu.
     Stokkbreyting sannadi thad (hun fell adeins a hlidarverkun).
     Nefnarinn er ThVI profadur a tilbunu korti — sama mynstur og
     `aggregateTeamShots` i kafla 8 og af somu astaedu.                    */
  {
    const T = ["AAA", "BBB", "CCC"];
    /* [x, y, xg, type, body, sit, team, opp, code, gw] */
    const sh = (team, opp, gw, xg, type = 2) => [10, 50, xg, type, 0, 1, team, opp, 1, gw];
    const mk = shots => {
      const byT = new Map(), byO = new Map();
      const put = (m, k, v) => { if (k == null) return; const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
      for (const s of shots) { put(byT, s[6], s); put(byO, s[7], s); }
      return { byTeam: byT, byOpp: byO, teams: T,
        fields: { x:0, y:1, xg:2, type:3, body:4, sit:5, team:6, opp:7, code:8, gw:9 } };
    };
    /* AAA spilar TVO leiki i umferd 1: gegn BBB (1 mark) og gegn CCC (0). */
    const dbl = aggShotRange(mk([
      sh(0, 1, 1, 0.4, SHOT_GOAL_TYPE), sh(0, 1, 1, 0.1),
      sh(0, 2, 1, 0.5), sh(1, 0, 1, 0.3, SHOT_GOAL_TYPE),
    ]), null).get("AAA");
    ok("tvofold umferd telst TVEIR leikir, ekki ein umferd", dbl.n === 2, `${dbl.n}`);
    ok("og xG per leik deilir thvi med 2 (1,0 / 2 = 0,50)",
      +(dbl.xgF / dbl.n).toFixed(2) === 0.50, `${dbl.xgF} / ${dbl.n}`);
    ok("mork og mork a sig eru talin i badum leikjum (1 og 1)",
      dbl.gf === 1 && dbl.ga === 1, `${dbl.gf}/${dbl.ga}`);
    ok("hreint blad ADEINS i leiknum sem endadi 0 a sig (1 af 2)",
      dbl.cs === 1, `${dbl.cs}`);
    /* OG SIAN VIRKAR A TILBUNU KORTI LIKA — umferd utan bils er sleppt. */
    const one = aggShotRange(mk([
      sh(0, 1, 1, 0.4, SHOT_GOAL_TYPE), sh(0, 1, 5, 0.9, SHOT_GOAL_TYPE),
    ]), [1, 1]).get("AAA");
    ok("skot i umferd 5 telur ekki i bili [1,1]", one.n === 1 && one.gf === 1, JSON.stringify(one));
    /* ThAD SEM ThETTA NAER EKKI YFIR, SAGT BERUM ORDUM: tveir leikir gegn
       SAMA motherja i somu umferd (frestadur leikur settur i tvofalda
       umferd) renna saman i EINN, thvi skotin bera engan leikja-lykil —
       adeins umferd, lid og motherja. Tha verdur nefnarinn of lagur og
       per-leiks-tolurnar of haar. Skrad her fremur en thagad um: prof sem
       thegir um thad sem thad naer ekki yfir er verra en prof sem segir thad. */
    const same = aggShotRange(mk([sh(0, 1, 1, 0.4), sh(0, 1, 1, 0.6)]), null).get("AAA");
    ok("skot-lykillinn EINN gerir tvo leiki gegn SAMA lidi ad einum (n=1)",
      same.n === 1, `${same.n}`);
    /* OG URSLITIN LEYSA ThAD ThEGAR ThAU ERU I TAKT. Sa nefnari er
       OPROFANLEGUR a raungognum (`fixtures.json` er annad timabil og hefur
       0 lokna leiki), svo hann er profadur her — kodi sem kviknar fyrst
       einn morgun er ekki asaettanlegt (CLAUDE.md 5).                    */
    {
      const idx = mk([sh(0, 1, 1, 0.4), sh(0, 1, 1, 0.6)]);
      const fake = [{ short: "AAA", id: 1, matches: 2, goals_pg: 0, goals: 0, conceded: 0,
                      xg: null, xgc: null }];
      const FX2 = [
        { event: 1, finished: true, team_h: 1, team_a: 2, team_h_score: 0, team_a_score: 0 },
        { event: 1, finished: true, team_h: 2, team_a: 1, team_h_score: 0, team_a_score: 0 },
      ];
      const withFix = applyTeamRange(fake, { range: [1, 1], shotIndex: idx, fixtures: FX2,
        use: { shots: true, results: "fixtures" } })[0];
      const withShots = applyTeamRange(fake, { range: [1, 1], shotIndex: idx, fixtures: FX2,
        use: { shots: true, results: "shots" } })[0];
      ok("urslitin gefa nefnarann 2 -> xG/leik 0,50", withFix.xg_pg === 0.50, `${withFix.xg_pg}`);
      ok("og an theirra blaes hann upp i 1,00 (skot-lykillinn einn)",
        withShots.xg_pg === 1.00, `${withShots.xg_pg}`);
    }
  }

  /* ---- 12c. TAKT-PROFID: rett heimild samthykkt, RONG hofnud ---- */
  {
    ok("skotakortid er I TAKT vid tofluna",
      use.shots === true && use.results === "shots",
      JSON.stringify({ shots: use.shots, results: use.results, step: use.shotStep }));
    ok(`og takt-profid maelir naer-nulls skekkju i morkum (${use.shotStep.meanGoalGap})`,
      use.shotStep.meanGoalGap != null && use.shotStep.meanGoalGap < 0.05);
    /* `fixtures.json` ER YFIRSTANDANDI TIMABIL og hefur 0 lokna leiki i
       forleik. Vaeri hun samthykkt yrdu mork, mork a sig og hrein blod
       TOM hja ollum 20 lidum um leid og bil er valid — nakvaemlega thad sem
       notandinn sa 20.8.2026.                                            */
    const fin = fixtures.filter(f => f.finished).length;
    ok(`fixtures.json ber ${fin} lokna leiki af ${fixtures.length} (forsenda)`, fixtures.length > 300);
    ok("og hun er thvi EKKI valin sem urslita-heimild i dag",
      use.fixStep.ok === false && use.results !== "fixtures",
      JSON.stringify(use.fixStep));
    /* MUTATION-KANNANIR A TAKT-PROFINU SJALFU. */
    const shotFull = aggShotRange(shotIndex, null);
    ok("takt-profid FELLUR ef heimildin telur ranga leikjafjolda (helming)",
      routeInStep(base, r => { const a = shotFull.get(r.short);
        return a ? { ...a, n: Math.round(a.n / 2) } : null; }).ok === false);
    ok("takt-profid FELLUR ef morkin eru ur odru timabili (+0,3/leik)",
      routeInStep(base, r => { const a = shotFull.get(r.short);
        return a ? { ...a, gf: a.gf + Math.round(0.3 * a.n) } : null; }).ok === false);
    ok("en thad THOLIR eins leiks skekkju (heimildir uppfaerast a olikum takti)",
      routeInStep(base, r => { const a = shotFull.get(r.short);
        return a ? { ...a, n: a.n - 1 } : null; }).ok === true);
    ok("og thad samthykkir ALDREI tomt inntak (< 8 lid)",
      routeInStep(base, () => null).ok === false &&
      routeInStep([], r => ({ n: 38, gf: 70 })).ok === false);
  }

  /* ---- 12d. BILID BREYTIR TOLUNNI — ThETTA ER FULLYRDINGIN SEM VER KAERUNA */
  {
    const full = applyTeamRange(base, { range: null, shotIndex, fixtures, use });
    const part = applyTeamRange(base, { range: [1, 10], shotIndex, fixtures, use });
    const late = applyTeamRange(base, { range: [30, 38], shotIndex, fixtures, use });
    const val = (rows, short, key) => TEAM_STAT_BY_KEY[key].get(rows.find(r => r.short === short));

    /* HEILT TIMABIL UR SOMU FORMULUM = ARSTIDAR-TALAN. Vaeri thetta ekki
       satt vaeri "whole season" og "GW 1-38" tvaer tolur um sama hlut —
       og THAD var astandid: arstidar-gildid kom ur `bsd_teams.json` og
       bils-gildid var endurreiknad ur `bsd_shots.json`, skrar sottar 11
       dogum i sundur (ARS xG/leik 1,725 a moti 1,76).                    */
    const gap = k => Math.max(...base.filter(r => TEAM_STAT_BY_KEY[k].get(r) != null)
      .map(r => Math.abs((val(full, r.short, k) ?? 0) - TEAM_STAT_BY_KEY[k].get(r))));
    ok(`heilt bil endurgerir arstidar-mork (mesta vik ${gap("goals_pg").toFixed(3)})`,
      gap("goals_pg") <= 0.01);
    ok(`og arstidar-mork a sig (${gap("conceded_pg").toFixed(3)})`, gap("conceded_pg") <= 0.01);
    ok(`og hrein blod % (${gap("cs_pct").toFixed(2)})`, gap("cs_pct") <= 0.6);

    /* OG "GW 1-38" VALID BERUM ORDUM VERDUR AD GEFA SOMU TOLU SEM
       "whole season" — ThAD ER SAMFELLAN SEM NOTANDINN SER.
       Fullyrding: `range: null` og `range: [1, maxGw]` fara i GEGNUM SAMA
       fall. Vaeri arstidar-leidin sér (`if (!range) return rows`) laesi
       taflan `bsd_teams.json` a heilu timabili og `bsd_shots.json` i bili,
       og notandi sem velur allar 38 umferdirnar — thad sem madur gerir til
       ad athuga hvort sian virki — saei ADRA tolu en hann var med adur.  */
    const all38 = applyTeamRange(base, { range: [1, 38], shotIndex, fixtures, use });
    const disc = ["goals_pg", "conceded_pg", "cs_pct", "xg_pg", "xgc_pg", "bc_pg",
      "goals_minus_xg"].filter(k => base.some(r =>
        val(all38, r.short, k) !== val(full, r.short, k)));
    ok('"GW 1-38" er SAMA tala og "whole season" (engin stallur i sianu)',
      disc.length === 0, disc.join(","));

    /* OG HLUTA-BIL ER ANNAD. Fullyrdingin er TALIN, ekki a einu lidi:
       tala sem hreyfist a einu lidi en ekki a hinum vaeri jafn thogul.  */
    const FOLLOW = ["goals_pg", "conceded_pg", "cs_pct", "xg_pg", "xgc_pg",
      "bc_pg", "bc_against_pg", "xg_per_shot_against", "goals_minus_xg", "conceded_minus_xgc"];
    for (const k of FOLLOW) {
      const withVal = base.filter(r => TEAM_STAT_BY_KEY[k].get(r) != null);
      const moved = withVal.filter(r =>
        val(part, r.short, k) !== TEAM_STAT_BY_KEY[k].get(r)).length;
      ok(`${k}: GW 1-10 er ONNUR tala en timabilid hja ${moved}/${withVal.length} lidum`,
        withVal.length >= 15 && moved >= withVal.length - 2, `${moved}/${withVal.length}`);
    }
    /* ---- MISMUNA-DALKARNIR ERU SUMMA YFIR BILID, EKKI PER LEIK ----
       Fyrri utgafa reiknadi thau inni i Teams.jsx sem `goals_pg - xg_pg`,
       thad er PER LEIK, medan dalkurinn ber `dec: 1` og notu um summu — sama
       tala undir sama merkimida i tveimur EININGUM, og hun stokk um faktor n
       um leid og bil var valid. STOKKBREYTING SLAPP FYRST I GEGN her: allar
       fullyrdingarnar um "breyttist" og "obreytt" eru sannar um BADAR
       einingar, svo thaer geta ekki greint thaer i sundur. Ohad endurtalning
       getur.                                                              */
    {
      const agg = aggShotRange(shotIndex, [1, 10]);
      const bad = [];
      for (const r of base) {
        const a = agg.get(r.short); if (!a || !a.n) continue;
        const want = +(a.gf - a.xgF).toFixed(1);
        const got = val(part, r.short, "goals_minus_xg");
        if (Math.abs(got - want) > 0.05) bad.push(`${r.short} ${got} vs ${want}`);
      }
      ok("G−xG i bili er SUMMA (mork - xG yfir bilid), ekki per leik",
        bad.length === 0, bad.slice(0, 3).join(" · "));
      /* OG STAERDIN SEGIR ThAD LIKA: per-leiks-tala i 10 leikja bili vaeri
         tiu sinnum minni, svo hun kaemist ekki yfir 1 hja neinum — summan
         gerir thad hja morgum.                                            */
      const big = base.filter(r => Math.abs(val(part, r.short, "goals_minus_xg") ?? 0) > 1).length;
      ok(`og summan er stor nog til ad einingin sjaist (${big} lid yfir 1,0)`, big >= 5, `${big}`);
    }

    /* Og TVO OLIK bil eru olik hvort odru — annars gaeti "hreyfist" thytt
       "hreyfist einu sinni og frys".                                     */
    const bothMoved = base.filter(r => TEAM_STAT_BY_KEY.goals_pg.get(r) != null)
      .filter(r => val(part, r.short, "goals_pg") !== val(late, r.short, "goals_pg")).length;
    ok(`GW 1-10 og GW 30-38 eru olik hja ${bothMoved} lidum`, bothMoved >= 14, `${bothMoved}`);

    /* ---- BLINDU DALKARNIR HREYFAST EKKI ---- */
    const BLIND = TEAM_STAT_DEFS.filter(d => teamRangeBlind(d.key, use)).map(d => d.key);
    ok(`${BLIND.length} dalkar geta ekki fylgt bilinu (forsenda)`, BLIND.length >= 10);
    const drifted = BLIND.filter(k => base.some(r =>
      TEAM_STAT_BY_KEY[k].get(r) !== val(part, r.short, k)));
    ok("og ENGINN theirra hreyfist i bili (annars vaeri hann tolu-villa)",
      drifted.length === 0, drifted.join(","));
    /* MUTATION: se arstidar-talan latin heita bils-tala er thad thogla
       villan sem kaeran var um — profid verdur ad greina thad. */
    const silent = applyTeamRange(base, { range: [1, 10], shotIndex, fixtures,
      use: { shots: false, results: null } });
    ok("MUTATION — bil sem gerir EKKERT er greint (allar tolur obreyttar)",
      FOLLOW.every(k => base.every(r =>
        TEAM_STAT_BY_KEY[k].get(r) === TEAM_STAT_BY_KEY[k].get(silent.find(x => x.short === r.short)))));

    /* ---- LAEGRA-ER-BETRA HELDUR I BILI ----
       Attin er eiginleiki DALKSINS, en rodun og besta/versta lesa TOLUNA,
       svo bil sem snyri formerki (t.d. skrifadi mork a sig i mork) laeti
       "besta vornin" verda su versta an thess ad `hi` breyttist.        */
    const bestOf = (rows, k) => {
      const d = TEAM_STAT_BY_KEY[k];
      const vals = rows.map(d.get).filter(v => typeof v === "number");
      return d.hi === false ? Math.min(...vals) : Math.max(...vals);
    };
    const asc = sortTeamRows(part, "conceded_pg", "asc");
    ok("mork a sig i bili: LAEGSTA talan er efst i 'asc' og hun er 'best'",
      TEAM_STAT_BY_KEY.conceded_pg.get(asc[0]) === bestOf(part, "conceded_pg"));
    ok("og tomt gildi radast SIDAST i badar attir, lika i bili",
      TEAM_STAT_BY_KEY.conceded_pg.get(asc.at(-1)) == null &&
      TEAM_STAT_BY_KEY.conceded_pg.get(sortTeamRows(part, "conceded_pg", "desc").at(-1)) == null);
    ok("hrein blod i bili: HAESTA talan er 'best' (hi:true)",
      TEAM_STAT_BY_KEY.cs_pct.hi === true &&
      TEAM_STAT_BY_KEY.cs_pct.get(sortTeamRows(part, "cs_pct", "desc")[0]) === bestOf(part, "cs_pct"));

    /* ---- NULL ER EKKI NULL, LIKA I BILI ---- */
    const promoted = base.filter(r => TEAM_STAT_DEFS.every(d => d.get(r) == null));
    ok(`nylidar (${promoted.map(r => r.short).join(",")}) fa "—" i bili, ekki 0`,
      promoted.length === 3 && promoted.every(p => FOLLOW.every(k =>
        val(part, p.short, k) === null)));
  }

  /* ---- 12e. URSLITA-LEIDIN UR `fixtures.json` — TILBUIN GOGN, ThEKKT SVAR */
  {
    const T = { A: 1, B: 2, C: 3, D: 4 };
    const FX = [
      { event: 1, finished: true, team_h: T.A, team_a: T.B, team_h_score: 3, team_a_score: 0 },
      { event: 1, finished: true, team_h: T.C, team_a: T.D, team_h_score: 1, team_a_score: 1 },
      { event: 2, finished: true, team_h: T.B, team_a: T.A, team_h_score: 2, team_a_score: 1 },
      /* UTAN BILSINS — ma ekki telja. */
      { event: 3, finished: true, team_h: T.A, team_a: T.C, team_h_score: 5, team_a_score: 0 },
      /* OLOKINN — hlutastada ma ekki telja sem urslit. */
      { event: 2, finished: false, team_h: T.A, team_a: T.D, team_h_score: 4, team_a_score: 0 },
      /* LOKINN EN AN STODU — hun er til (frestad/felld nidur).           */
      { event: 2, finished: true, team_h: T.A, team_a: T.C, team_h_score: null, team_a_score: null },
    ];
    const a = aggFixtureRange(FX, [1, 2]);
    ok("A: 2 leikir i bilinu, 4 mork, 2 a sig",
      a.get(T.A).n === 2 && a.get(T.A).gf === 4 && a.get(T.A).ga === 2,
      JSON.stringify(a.get(T.A)));
    ok("olokni 4-0 leikurinn telur EKKI (3 leikir vaeri merki um thad)", a.get(T.A).n !== 3);
    ok("GW3-leikurinn telur EKKI (9 mork vaeri merki um thad)", a.get(T.A).gf !== 9);
    ok("hreint blad er talid PER LEIK (A: 1 af 2)", a.get(T.A).cs === 1);
    ok("jafntefli 1-1 gefur EKKERT hreint blad", a.get(T.C).cs === 0 && a.get(T.D).cs === 0);
    ok("lid an leiks i bilinu er EKKI i toflunni (null, ekki 0)",
      aggFixtureRange(FX, [5, 6]).size === 0);
    ok("`range: null` telur ALLA lokna leiki", aggFixtureRange(FX, null).get(T.A).n === 3);
    ok("rusl fellur ekki", aggFixtureRange(null, [1, 2]).size === 0 &&
      aggFixtureRange([{ finished: true }], [1, 2]).size === 0);
    ok(`thakid er LEITT ut ur skranni (${maxEventOf(fixtures)})`,
      maxEventOf(fixtures) === 38 && maxEventOf([{ event: 12 }]) === 12 && maxEventOf(null) === 0);
  }

  /* ---- 12f. SEIGLA: engin skra ma fella bilid ---- */
  {
    let bad = null;
    const cases = [
      ["ekkert", {}],
      ["adeins bil", { range: [1, 5] }],
      ["skotakort vantar", { range: [1, 5], use: { shots: true, results: "shots" } }],
      ["rusl i visum", { range: [1, 5], shotIndex: { byTeam: 7, teams: "x", fields: null },
                         use: { shots: true, results: "shots" } }],
      ["fixtures rusl", { range: [1, 5], fixtures: "nei", use: { shots: false, results: "fixtures" } }],
      ["bil a hvolfi", { range: [30, 3], shotIndex, use: { shots: true, results: "shots" } }],
    ];
    for (const [name, arg] of cases) {
      try {
        const r = applyTeamRange(base, arg);
        for (const d of TEAM_STAT_DEFS) for (const row of r) {
          const v = d.get(row);
          if (v !== null && typeof v !== "number") { bad = `${name}: ${d.key} -> ${typeof v}`; break; }
          if (typeof v === "number" && !Number.isFinite(v)) { bad = `${name}: ${d.key} = ${v}`; break; }
        }
      } catch (e) { bad = `${name}: ${e.message}`; }
      if (bad) break;
    }
    ok("hvert get() tholir bilid i hvada bilun sem er", !bad, bad || "");
    ok("og engin heimild i takti -> engin leid, med SKYRINGU",
      (() => { const u = teamRangeUse({ base, shotIndex: null, fixtures: null });
        return !u.shots && !u.results && u.why.length > 20; })());
  }
}

/* ============================================================
   EININGIN VERDUR AD STANDA I HEITINU (tilkynnt af notanda 14.8.2026)

   Notandinn sa "Big chances faced: 2" og sagdi — rettilega — ad thad gaeti
   ekki verid timabils-tala fyrir markmann i 38 leikjum. Talan var RETT
   (deildin liggur 1,05-3,05 PER LEIK) en heitid nefndi ekki eininguna;
   adeins notan gerdi thad, og notu les enginn adur en hann les toluna.
   FIMM af threttan `_pg`-dalkum brutu venjuna sem hinir atta fylgdu.

   Reglan er leidd UT UR LYKLINUM, ekki handskrifud: hver dalkur sem endar a
   `_pg` er per-leiks-tala og VERDUR ad segja thad i `label`. Nyr `_pg`-dalkur
   erfir kröfuna sjalfkrafa — handskrifadur listi hefdi stadnad (CLAUDE.md 8).
   ============================================================ */
console.log("\nEININGIN I HEITINU");
{
  const pg = TEAM_STAT_DEFS.filter(d => /_pg$/.test(d.key));
  ok(`${pg.length} dalkar eru per-leiks-tolur (forsenda kaflans)`, pg.length >= 10);
  const silent = pg.filter(d => !/per match/i.test(d.label));
  ok("hver per-leiks-dalkur segir \"per match\" i heitinu",
     silent.length === 0, silent.map(d => `${d.key}: "${d.label}"`).join(" · "));
  /* Og dalkur sem er EKKI per leik ma ekki segjast vera thad.            */
  const lying = TEAM_STAT_DEFS.filter(d => !/_pg$/.test(d.key) && /per match/i.test(d.label));
  ok("enginn dalkur segist vera per leik an thess ad vera thad",
     lying.length === 0, lying.map(d => d.key).join(" · "));
  /* `short` er thad sem sest i throngri toflu. Krafan er INNAN FLOKKS, ekki
     yfir alla skrana: taflan synir EINN flokk i einu, svo "Shots" i sokn og
     "Shots" hja markverdi rekast aldrei a. Fyrsta utgafa thessarar
     fullyrdingar var yfir ALLA skrana og felldi fimm log-mæt por —
     of strong krafa er lika rong krafa.                                  */
  const perGroup = {};
  for (const d of TEAM_STAT_DEFS) ((perGroup[d.group] ||= {})[d.short] ||= []).push(d.key);
  const dupes = Object.entries(perGroup).flatMap(([g, m]) =>
    Object.entries(m).filter(([, v]) => v.length > 1).map(([sh, v]) => `${g}/${sh}: ${v.join(",")}`));
  ok("engin tvitekin `short`-heiti INNAN flokks", dupes.length === 0, dupes.join(" · "));
}

console.log(`\nLIDA-TOLUR: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
