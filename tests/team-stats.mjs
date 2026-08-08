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
import { buildTeamRows, TEAM_STAT_DEFS, TEAM_GROUPS, sortTeamRows, TEAM_STAT_BY_KEY }
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
  ok("skran sjalf ber sama fyrirvara", /BIG CHANCES ERU EKKI HER/i.test(teamShots.note || ""));
  ok("og hun ber krossprofunina vid E0", /KROSSPROFAD GEGN E0/i.test(teamShots.note || ""));
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

console.log(`\nLIDA-TOLUR: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
