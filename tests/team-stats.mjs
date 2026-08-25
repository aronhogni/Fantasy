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
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { buildTeamRows, TEAM_STAT_DEFS, TEAM_GROUPS, sortTeamRows, TEAM_STAT_BY_KEY,
         TEAM_RANGE_SRC, teamRangeBlind, aggShotRange, aggFixtureRange, routeInStep,
         teamRangeUse, applyTeamRange, maxEventOf, SHOT_GOAL_TYPE,
         aggLiveMatchRange, maxGwOfLiveMatches,
         buildTeamMetrics, PROMOTED_PL, seasonKey, bsdSeasonInStep, buildLiveTeamForm,
         teamFormFlags, FORM_WINDOW_GW, FORM_MIN_MATCHES }
  from "../src/teamstats.js";
import { makeFixDifficulty, tierOf, TIER_NEUTRAL } from "../src/model.js";
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

/* SKOT-VISIRINN BYGGDUR EINS OG App.jsx BYGGIR HANN, EIN UTFAERSLA.
   Hann stod ORDRETT TVISVAR i thessari skra og kafli 14 tharf hann lika —
   thrju afrit af sama visi eru thrir visar sem geta rekid i sundur
   (CLAUDE.md kafli 12: `ZONE_RE` stod ordrett i tveimur skriftum og BAEDI
   afritin vontudu markteiginn).                                          */
function buildShotIndexLikeApp(sf) {
  if (!sf?.legend?.fields || !Array.isArray(sf.shots)) return null;
  const F = Object.fromEntries(sf.legend.fields.map((f, i) => [f, i]));
  const byTeam = new Map(), byOpp = new Map();
  const put = (m, k, v) => { if (k == null) return; const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
  for (const x of sf.shots) { put(byTeam, x[F.team], x); put(byOpp, x[F.opp], x); }
  return { byTeam, byOpp, teams: sf.legend.teams, fields: F, calib: sf.calib };
}

/* ---------- 1. SKEMA ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("1. SKEMA — dalkar, flokkar, skyringar");
console.log("─".repeat(84));
ok(`ein rod per lid (${rows.length})`, rows.length === 20, `${rows.length}`);
ok("engir tvitekar lyklar", new Set(TEAM_STAT_DEFS.map(d => d.key)).size === TEAM_STAT_DEFS.length);
ok("hver dalkur tilheyrir gildum flokki",
  TEAM_STAT_DEFS.every(d => TEAM_GROUPS.some(g => g.key === d.group)));
ok("enginn flokkur tomur", TEAM_GROUPS.every(g => TEAM_STAT_DEFS.some(d => d.group === g.key)));
/* ============================================================
   FLOKKA-RODIN OG MARKVARDAR-HEITID — ORDALAG SEM ER PINNAD AF ASETTU RADI

   Reglan i thessu repo-i er ad prof profi HEGDUN en ekki ORDALAG (CLAUDE.md
   kafli 5), og hun a vid um nanast allt. HER ER UNDANTEKNING OG HUN ER
   ROKSTUDD: hvort tveggja var BEIN BEIDNI notandans 25.8.2026 og hvorugt
   hefur nokkurn annan vord.
     - RODIN ver ad notandinn lendi ekki a tomasta flokknum. Markvardar-
       flokkurinn er SKOTA-DRIFINN AD OLLU LEYTI og engin skota-heimild naer
       yfir yfirstandandi timabil, sem er sjalfgefna synin fra 22.8. Fyrir
       snuninginn var tomasti flokkurinn sa fremsti.
     - HEITID: "What the keeper faces" er thrisvar lengra en hin thrju og
       braut hnappa-rodina i tvennt a throngum skja.
   OG MISSIRINN VAERI ThOGULL AN ThESSA: `team-gw.mjs` les heitin UR ThESSARI
   SKRA (rett akvordun thar — thad safn profar hegdun), og `react-warnings`
   telur heimsokn i hlutfalli, svo EITT tapad vidmot af 52 helst yfir
   90%-golfinu. Enginn vordur beit a ordalagid; nu gerir thessi thad.   */
{
  const order = TEAM_GROUPS.map(g => g.key);
  ok(`markvardar-flokkurinn kemur AFTAN vid Defence og Attack (${order.join(" > ")})`,
     order.indexOf("keeper") > order.indexOf("defence")
     && order.indexOf("keeper") > order.indexOf("attack"));
  ok(`og hann heitir "GK" (${JSON.stringify(TEAM_GROUPS.find(g => g.key === "keeper")?.label)})`,
     TEAM_GROUPS.find(g => g.key === "keeper")?.label === "GK");
}
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
    "bc_against_pg", "xg_per_shot_against",
    /* SAMTOLURNAR ERFA ATTINA FRA PER-LEIK SYSTKINUM SINUM — mark a sig er
       mark a sig hvort sem thad er talid per leik eda lagt saman.        */
    "conceded", "xgc"];
  const HIGHER_BETTER = ["long_against_pg", "long_share", "cs_pct", "goals_pg",
    "xg_pg", "shots_pg", "sot_pg", "box_pg", "close_pg", "conversion",
    "goals_minus_xg", "corners_pg", "bc_pg",
    "goals", "xg",
    /* NEFNARARNIR: "haerra er betra" er ekki gaeda-domur um lidid heldur um
       FPL-gildid — fleiri leikir i bilinu eru fleiri taekifaeri til stiga
       (tvofold umferd). Notan segir thad, svo liturinn logi ekki.       */
    "played", "bsd_matches"];
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
  const shotIndex = buildShotIndexLikeApp(sf);

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

  /* ============================================================
     12g. YFIRSTANDANDI TIMABIL: xG OG **xGC** UR `bsd_live.team_matches`

     KAERAN: "Afhverju fae eg ekki xGC a lid?" — a yfirstandandi timabili
     voru xG og xGC baedi tom medan mork, mork a sig og hrein blod baru
     tolur. Astaedan var ad thau ein komu ur `bsd_shots.json`, sem er FROSID
     2025/26; `bsd_live.json` bar timabils-summur PER LEIKMANN, og ur theim
     ma summa xG lidsins en ALDREI xGC — hun er summa MOTHERJANNA og enginn
     motherji er nefndur i theim rodum.

     LAUSNIN ER NY ROD I SKRANNI (`team_matches`, ein per leik, badar
     hlidar), OG ThAR MED NY SAMLAGNING VID HLIDINA A `aggShotRange`. Tvaer
     utfaerslur af somu staerd eru gildran sem thetta repo hefur fallid i
     hvad eftir annad (buildTeamMetrics skrifadi NaN a 17 lid, `wOf`-afritid
     var graent eftir ad merkid baettist vid). Hun er OHJAKVAEMILEG her —
     inntokin eru sitthvor — svo hun er JAFNGILDIS-PROFUD i stad thess ad
     vera fullyrt: 2025/26-kortid er brotid nidur i leikja-radir og BADAR
     leidir verda ad skila somu tolu, a ollum lidum og ollum svidum.
     ============================================================ */
  /* ---- 12g1. JAFNGILDI A RAUNGOGNUM (9.544 skot -> 380 leikja-radir) ---- */
  {
    /* Skot -> leikja-radir. Leikja-lykill er (umferd + BADA lidin i fastri
       rod); tveir leikir sem BADIR eru null-gegn-null i somu umferd renna
       saman, en their bera hvorugt lid i deildinni og fara hvergi.       */
    const F = shotIndex.fields, TN = shotIndex.teams;
    const byGame = new Map();
    let mid = 0;
    for (const s of allShots(shotIndex)) {
      const t = s[F.team], o = s[F.opp];
      const key = `${s[F.gw]}:${[String(t ?? "x"), String(o ?? "x")].sort().join("|")}`;
      let g = byGame.get(key);
      if (!g) {
        g = { id: ++mid, gw: s[F.gw], _t: t, _o: o,
              home: { team: t == null ? null : TN[t], xg: 0, shots: 0, bc: 0, goals: 0 },
              away: { team: o == null ? null : TN[o], xg: 0, shots: 0, bc: 0, goals: 0 } };
        byGame.set(key, g);
      }
      const side = (t === g._t && o === g._o) ? g.home : g.away;
      side.shots++;
      if (typeof s[F.xg] === "number") {
        side.xg += s[F.xg];
        if (s[F.xg] >= BIG_CHANCE_XG) side.bc++;
      }
      if (s[F.type] === SHOT_GOAL_TYPE) side.goals++;
    }
    const matches = [...byGame.values()];
    /* 374, EKKI 380, OG TALAN ER SKYRD: `shotIndex` er byggdur eins og
       App.jsx byggir hann og `put` sleppir null-lykli, svo leikur ThAR SEM
       BADIR eru fallnir (team OG opp null) er hvergi i visinum. Timabilid
       2025/26 atti thrju foll lid = 3 por x 2 umferdir = SEX slikir leikir,
       og 380 - 6 = 374. Their bera hvorugt lid i deildinni i dag og
       bera thvi enga tolu i thessari toflu hvort sem er.                 */
    ok(`skotakortid brotnar i ${matches.length} leiki (380 - 6 foll-gegn-follnum)`,
      matches.length === 374, `${matches.length}`);

    const FIELDS = ["n", "nF", "nA", "xgF", "xgA", "bcF", "bcA", "gf", "ga", "cs"];
    const cmp = (range) => {
      const A = aggShotRange(shotIndex, range), B = aggLiveMatchRange(matches, range);
      const diffs = [];
      if (A.size !== B.size) diffs.push(`size ${A.size}/${B.size}`);
      for (const [short, a] of A) {
        const b = B.get(short);
        if (!b) { diffs.push(`${short} vantar`); continue; }
        /* FLEYTITOLU-SUMMUR i sitthvorri rod — vikmorkin eru ThAU, ekki
           slaki a fullyrdingunni. Maelt: mesta vik 0 i dag.              */
        for (const k of FIELDS) if (Math.abs(a[k] - b[k]) > 1e-6) diffs.push(`${short}.${k} ${a[k]}/${b[k]}`);
      }
      return diffs;
    };
    const full = cmp(null);
    ok(`leikja-leidin er SAMHLJODA skot-leidinni a ollum 17 lidum og ollum ${FIELDS.length} svidunum`,
      full.length === 0, full.slice(0, 4).join(" · "));
    for (const r of [[1, 10], [20, 25], [30, 38]]) {
      const d = cmp(r);
      ok(`og i bili GW ${r[0]}-${r[1]} lika`, d.length === 0, d.slice(0, 3).join(" · "));
    }
    /* MUTATION — fullyrdingin verdur ad geta fallid. Se xGC-hlidin tekin ur
       RONGU lidi (self i stad opp) er hun enn "tala" og enn i rettu bili. */
    {
      const swapped = matches.map(m => ({ ...m, away: { ...m.away, xg: m.home.xg } }));
      const B = aggLiveMatchRange(swapped, null);
      const moved = [...aggShotRange(shotIndex, null)]
        .filter(([s, a]) => Math.abs(a.xgA - (B.get(s)?.xgA ?? 0)) > 0.5).length;
      ok(`MUTATION — xGC tekid ur EIGIN lidi i stad motherjans fellur (${moved}/17 lid vikja)`,
        moved >= 15, `${moved}`);
    }
  }

  /* ---- 12g2. TILBUNAR RADIR ThAR SEM SVARID ER ThEKKT FYRIRFRAM ---- */
  {
    const side = (team, xg, shots, bc, goals) => ({ team, xg, shots, bc, goals });
    const M = (id, gw, h, a) => ({ id, gw, home: h, away: a });

    /* TVOFOLD UMFERD — TVEIR LEIKIR GEGN SAMA LIDI I SOMU UMFERD.
       Skot-leidin GETUR ThETTA EKKI (lykillinn er (umferd, motherji), sja
       `aggShotRange`); her er lykillinn leikurinn sjalfur, svo talan er
       rett an hjalpar fra `fixtures.json`. Thetta er eina svidid thar sem
       leidirnar tvaer eru ekki jafngildar — og leikja-leidin er STRANGARI. */
    const dbl = aggLiveMatchRange([
      M(1, 1, side("AAA", 1.0, 10, 2, 1), side("BBB", 0.5, 5, 1, 0)),
      M(2, 1, side("AAA", 0.6, 8, 1, 0), side("BBB", 0.4, 4, 0, 2)),
    ], null).get("AAA");
    ok("tvofold umferd telst TVEIR leikir (skot-leidin gefur einn)",
      dbl.n === 2, `${dbl.n}`);
    ok("xGC er summa MOTHERJANS i badum leikjum (0,5 + 0,4 = 0,9)",
      Math.abs(dbl.xgA - 0.9) < 1e-9, `${dbl.xgA}`);
    ok("og hreint blad ADEINS i leiknum sem endadi 0 a sig (1 af 2)",
      dbl.cs === 1, `${dbl.cs}`);

    /* LID UTAN DEILDAR — motherjinn ma ALDREI tapa sinu xGC vid thad.
       `BSD_TEAM` ber 20 felog; komi lid utan hennar (bikar, nylidi sem
       vantar i tofluna) er `team` null og su HLID fer hvergi — en talan
       hennar er afram xGC hins.                                          */
    const un = aggLiveMatchRange([
      M(3, 2, side("AAA", 1.2, 9, 2, 1), side(null, 0.8, 6, 1, 1)),
    ], null);
    ok("lid utan deildar fær ENGA rod (null, ekki 0)", !un.has(null) && un.size === 1);
    ok("en motherji thess fær xGC ur leiknum samt (0,8)",
      Math.abs(un.get("AAA").xgA - 0.8) < 1e-9, `${un.get("AAA").xgA}`);

    /* HALF SKRAD ROD ER FELLD I HEILD. `?? 0` badum megin vaeri her
       xGC = 0 OG hreint blad — tvaer tilbunar tolur ur einu vantandi svidi
       (CLAUDE.md 12, `net_transfers_event`).                             */
    const half = aggLiveMatchRange([
      M(4, 3, side("AAA", 1.1, 7, 1, 2), { team: "BBB", shots: 5, bc: 1, goals: 0 }),
    ], null);
    ok("rod thar sem adra hlidina vantar xG er FELLD (engin tilbuin nulltala)",
      half.size === 0, `${half.size}`);

    /* UMFERD SEM VANTAR — leikur sem ekki er haegt ad setja i bil ma ekki
       lauma ser inn i "heilt timabil" heldur. Sama og skot an umferdar.  */
    const nogw = aggLiveMatchRange([
      M(5, null, side("AAA", 2.0, 9, 3, 2), side("BBB", 0.3, 3, 0, 0)),
    ], null);
    ok("leikur an umferdar telur hvergi, lika ekki i 'heilt timabil'", nogw.size === 0);

    /* BILID SIAR. */
    const three = [
      M(6, 1, side("AAA", 1.0, 5, 1, 1), side("BBB", 0.2, 2, 0, 0)),
      M(7, 5, side("AAA", 2.0, 9, 3, 2), side("CCC", 1.5, 8, 2, 1)),
    ];
    ok("bil [1,1] tekur einn leik, [1,5] baða",
      aggLiveMatchRange(three, [1, 1]).get("AAA").n === 1 &&
      aggLiveMatchRange(three, [1, 5]).get("AAA").n === 2);
    ok("lid an leiks i bilinu er EKKI i toflunni (-> '—', ekki 0)",
      !aggLiveMatchRange(three, [2, 4]).has("AAA"));
    ok("rusl fellur ekki", aggLiveMatchRange(null).size === 0 &&
      aggLiveMatchRange([null, {}, { gw: 1 }]).size === 0);
    ok(`thakid er LEITT ur rodunum (${maxGwOfLiveMatches(three)})`,
      maxGwOfLiveMatches(three) === 5 && maxGwOfLiveMatches(null) === 0 &&
      maxGwOfLiveMatches([{ gw: null }]) === 0);
  }

  /* ---- 12g3. TENGINGIN: `liveMatches` FYLLIR xGC I TOFLUNNI ---- */
  {
    const side = (team, xg, shots, bc, goals) => ({ team, xg, shots, bc, goals });
    /* Tveir raunverulegir GW1-leikir ur `fixtures.json` i dag: ARS 3-0 COV
       og BRE 3-0 TOT. Tolurnar eru TILBUNAR (skotakort 2026/27 er ekki til
       her), en LOGUNIN er su sem pipeline skrifar.                       */
    const live = [
      { id: 209535, gw: 1, home: side("ARS", 1.803, 14, 3, 3), away: side("COV", 0.204, 4, 0, 0) },
      { id: 209540, gw: 1, home: side("BRE", 4.023, 18, 5, 3), away: side("TOT", 0.470, 6, 1, 0) },
    ];
    const fake = ["ARS", "COV", "BRE", "TOT"].map((s, i) =>
      ({ short: s, id: 100 + i, matches: 1, goals_pg: 0, goals: 0, conceded: 0, xg: null, xgc: null }));
    const rows = applyTeamRange(fake, { range: null, liveMatches: live,
      use: { shots: true, results: "shots" } });
    const R = s => rows.find(r => r.short === s);
    ok("ARS fær xG 1,8 ur EIGIN skotum", R("ARS").xg === 1.8, `${R("ARS").xg}`);
    ok("OG xGC 0,2 ur skotum COV — ThETTA ER SVARID VID KAERUNNI",
      R("ARS").xgc === 0.2, `${R("ARS").xgc}`);
    ok("speglunin stemmir: COV fær xGC 1,8 og xG 0,2",
      R("COV").xgc === 1.8 && R("COV").xg === 0.2,
      `${R("COV").xgc}/${R("COV").xg}`);
    ok("og lidin tvo eru EKKI med somu tolu (BRE 4,0 gegn ARS 1,8)",
      R("BRE").xg === 4.0 && R("BRE").xgc === 0.5, `${R("BRE").xg}/${R("BRE").xgc}`);
    ok("storar faerir fylgja med (bc 3 fyrir, 0 a sig hja ARS)",
      R("ARS").bc_pg === 3 && R("ARS").bc_against_pg === 0);
    /* NULL ER EKKI NULL: lid sem hefur ekki spilad fær "—".              */
    const withIdle = applyTeamRange([...fake, { short: "MCI", id: 199, matches: 0 }],
      { range: null, liveMatches: live, use: { shots: true, results: "shots" } });
    const idle = withIdle.find(r => r.short === "MCI");
    ok("lid an leikins leiks fær xG/xGC null, EKKI 0",
      idle.xg === null && idle.xgc === null && idle.bsd_matches === null,
      JSON.stringify([idle.xg, idle.xgc, idle.bsd_matches]));
    /* MUTATION — vaeri xGC lesin ur SJALFUM SER (self.xg i stad opp.xg)
       vaeri hun jofn xG hja ollum, sem er nakvaemlega su tala sem "eitt lid,
       einn leikur"-flytileidin gefur i umferd 2 og aframhaldandi.        */
    ok("MUTATION — xGC == xG hja ollum vaeri merki um sjalfs-lestur",
      rows.some(r => r.xg !== r.xgc));

    /* HVOR HEIMILDIN — KALLANDINN VELUR. Tomt `liveMatches` ma ALDREI
       thagga nidur frosna kortid (thad er syn fyrra timabils), og
       ofugt ma lifandi syn ekki detta i kortid ur odru timabili.         */
    const both = applyTeamRange(base, { range: null, shotIndex, liveMatches: live,
      use: { shots: true, results: "shots" } });
    ok("liveMatches VINNUR thegar badar eru sendar (valid er akvedid, ekki tilviljun)",
      (both.find(r => r.short === "ARS")?.xg) === 1.8,
      `${both.find(r => r.short === "ARS")?.xg}`);
    const noneLive = applyTeamRange(base, { range: null, shotIndex, liveMatches: [],
      use: { shots: true, results: "shots" } });
    ok("og TOMT liveMatches fellur aftur a skotakortid (ekki i tomar tolur)",
      (noneLive.find(r => r.short === "ARS")?.xg) ===
      (applyTeamRange(base, { range: null, shotIndex, use: { shots: true, results: "shots" } })
        .find(r => r.short === "ARS")?.xg));

    /* OG TAKT-PROFID SER LEIKJA-RADIRNAR — annars vaeri `use.shots` false og
       dalkarnir tomir thott gognin vaeru til.                            */
    const many = [];
    for (let i = 0; i < 10; i++)
      many.push({ id: i, gw: 1,
        home: side(`T${i}`, 1.5, 10, 2, 1), away: side(`U${i}`, 1.0, 8, 1, 1) });
    const mBase = many.flatMap((m, i) => [
      { short: `T${i}`, id: 500 + i, matches: 1, goals_pg: 1, goals: 1, conceded: 1 },
      { short: `U${i}`, id: 600 + i, matches: 1, goals_pg: 1, goals: 1, conceded: 1 }]);
    const u = teamRangeUse({ base: mBase, shotIndex: null, liveMatches: many, fixtures: null });
    ok("takt-profid samthykkir leikja-radirnar thegar thaer stemma vid tofluna",
      u.shots === true && u.maxGw === 1, JSON.stringify({ s: u.shots, g: u.maxGw }));
    const wrongSeason = many.map(m => ({ ...m, gw: m.gw,
      home: { ...m.home, goals: m.home.goals + 2 } }));
    ok("og HAFNAR theim thegar morkin eru ur odru timabili (+2/leik)",
      teamRangeUse({ base: mBase, shotIndex: null, liveMatches: wrongSeason,
        fixtures: null }).shots === false);
  }
}

/* Ollur skot ur visinum, an tvitekninga (byTeam ber hvert skot einu sinni
   per lid — skot lids utan deildar eru ADEINS i `byOpp`).                */
function allShots(shotIndex) {
  const seen = new Set(), out = [];
  for (const m of [shotIndex.byTeam, shotIndex.byOpp])
    for (const arr of m.values())
      for (const s of arr) { if (seen.has(s)) continue; seen.add(s); out.push(s); }
  return out;
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

/* ============================================================
   12. NYLIDA-FASTINN — INVARIANTID SEM VAR BROTID (20.8.2026)

   HVAD BRAST: `buildTeamMetrics` gaf nylidum B-deildar-mork x0,75 (sokn)
   og x1,35 (vorn). Hvorug talan bar rokstudning, og afleidingin var
   maelanleg: **Coventry modeladist med 1,32 mork a sig — SJOTTA BESTA
   VORN DEILDARINNAR** — og Ipswich lenti nakvaemlega a deildar-medaltali
   a badum hlidum. Nylidi a ad vera i verstu 1-3.

   MAELT (`scripts/measure-promoted-proxy.mjs`, n=45 lid-timabil, 15 PL-
   timabil): baðir margfaldararnir eru UTAN CI, OG margfoldunar-formid
   sjalft fell — B-deildar-vornin hefur r = -0,038 vid PL-vornina.
   Fastinn vinnur i LOSO a badum hlidum og tapar i engum. Sja `PROMOTED_PL`.

   ThESSI KAFLI VER ThRENNT SEM ER OLIKT:
     A. TALAN — fastarnir eru their MAELDU, innan CI.
     B. FORMID — thrju lidin fa SOMU tolu, og B-deildar-tolurnar mega
        EKKI hafa ahrif a hana. Fellur um leid og margfaldari kemur aftur.
     C. UTKOMAN — hvert nylida-lid er VERRA en deildin a BADUM hlidum, og
        ber afram TOLUR (nylidi an talna brytur FFDR i 114 leikjum).
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("12. NYLIDA-FASTINN — maeldur, EINS fyrir oll, og VERRI en deildin");
console.log("─".repeat(84));
{
  const teamsArr = Array.isArray(teams) ? teams : (teams?.teams || []);
  const promoted = J("promoted_baseline.json");
  const players = (() => { const d = J("players.json"); return Array.isArray(d) ? d : (d?.players || []); })();
  const tm = buildTeamMetrics({ players, teams: teamsArr, promoted, teamForm });
  const byId = Object.fromEntries(teamsArr.map(t => [t.id, t]));
  /* RADIRNAR ERU VALDAR EFTIR ADILDINNI, EKKI EFTIR `src` — og thad er
     ekki smekkur. Fyrsta utgafa thessa kafla sigtadi a
     `src === "promoted_measured"`, svo stokkbreyting sem SETTI GAMLA
     MARGFALDARANN AFTUR INN (og thar med gamla `src`-heitid) gerdi
     `promRows` TOMT — og tha fellu invariant-fullyrdingarnar af thvi ad
     thaer hofdu engar radir, ekki af thvi ad tolurnar voru rangar. Thad er
     nakvaemlega tóma fullyrdingin ur CLAUDE.md 5b: prof sem finnur ekkert
     og segir "fellt" er ekki ad maela thad sem thad heldur. Adildin er
     lesin ur `promoted_baseline.json` med SOMU uppflettingu sem kodinn
     notar, svo radirnar eru til sama hvad `src` heitir.                  */
  const pbOf = t => promoted[t.name.replace(/ (City|Town|United)$/, "")] || promoted[t.name];
  const promRows = teamsArr.filter(pbOf)
    .map(t => ({ name: t.name, id: t.id, pb: pbOf(t), ...tm[t.id] }));

  /* ---- A. TALAN ER SU MAELDA ---- */
  const M = PROMOTED_PL.measured;
  ok(`\`PROMOTED_PL\` ber maelinguna sjalfa (n=${PROMOTED_PL.n}, ${PROMOTED_PL.seasons} timabil)`,
     PROMOTED_PL.n === 45 && PROMOTED_PL.seasons === 15
     && Array.isArray(M?.goals_pg_ci) && Array.isArray(M?.conceded_pg_ci),
     JSON.stringify({ n: PROMOTED_PL.n, seasons: PROMOTED_PL.seasons }));
  /* Fastinn i kodanum er NAMUNDUN a maeldu medaltali og verdur ad liggja
     innan CI-sins. Vaeri hann utan thess vaeri hann VALINN, ekki maeldur —
     nakvaemlega thad sem 0,75 og 1,35 voru.                              */
  ok(`sokn ${PROMOTED_PL.goals_pg} er innan maelds CI [${M.goals_pg_ci.join(", ")}]`,
     PROMOTED_PL.goals_pg >= M.goals_pg_ci[0] && PROMOTED_PL.goals_pg <= M.goals_pg_ci[1]);
  ok(`a sig ${PROMOTED_PL.conceded_pg} er innan maelds CI [${M.conceded_pg_ci.join(", ")}]`,
     PROMOTED_PL.conceded_pg >= M.conceded_pg_ci[0] && PROMOTED_PL.conceded_pg <= M.conceded_pg_ci[1]);
  ok("fastinn er namundun a maeldu medaltali (0,01 vikmork)",
     Math.abs(PROMOTED_PL.goals_pg - M.goals_pg) <= 0.005 + 1e-9
     && Math.abs(PROMOTED_PL.conceded_pg - M.conceded_pg) <= 0.005 + 1e-9);
  /* OG GOMLU TOLURNAR MEGA EKKI KOMA AFTUR — thaer eru baðar UTAN CI.
     Fullyrdingin nefnir thaer BERUM ORDUM svo hun geti ekki thagad.      */
  ok("gomlu margfaldararnir 0,75 og 1,35 eru baðir UTAN maelds CI",
     !(0.75 >= M.goals_pg_ci[0] && 0.75 <= M.goals_pg_ci[1])
     && !(1.35 >= M.conceded_pg_ci[0] && 1.35 <= M.conceded_pg_ci[1]));

  /* ---- B. FORMID — FASTI, EKKI MARGFALDARI ---- */
  ok(`oll thrju nylida-lidin thekkjast (${promRows.length})`, promRows.length === 3,
     promRows.map(r => r.name).join(", "));
  ok("og hvert theirra er MERKT `promoted_measured`",
     promRows.length === 3 && promRows.every(r => r.src === "promoted_measured"),
     promRows.map(r => `${r.name}: ${r.src}`).join(" · "));
  /* ADILDIN VAR RAUNVERULEGA MISMUNANDI I INNTAKINU — annars gaeti
     "sama tala hja ollum thremur" stadid hja margfaldara lika.          */
  ok("B-deildar-tolurnar eru raunverulega OLIKAR (forsenda naesta kafla)",
     new Set(promRows.map(r => `${r.pb.goals_pg}/${r.pb.goals_against_pg}`)).size === 3,
     promRows.map(r => `${r.name}: ${r.pb.goals_pg}/${r.pb.goals_against_pg}`).join(" · "));
  ok("hvert theirra ber TOLUR (nylidi an talna brytur FFDR i 114 leikjum)",
     promRows.length === 3
     && promRows.every(r => Number.isFinite(r.xg90) && Number.isFinite(r.xgc90)),
     promRows.map(r => `${r.name}: ${r.xg90}/${r.xgc90}`).join(" · "));
  ok("hvert theirra ber MAELDA fastann, ekki B-deildar-margfeldi",
     promRows.every(r => r.xg90 === PROMOTED_PL.goals_pg
                      && r.xgc90 === PROMOTED_PL.conceded_pg),
     promRows.map(r => `${r.name}: ${r.xg90}/${r.xgc90}`).join(" · "));
  /* B-DEILDAR-TOLURNAR ERU ADEINS ADILDAR-PROF. Prófid stokkbreytir theim
     sjalft — threfaldar sokn og fjordungar vorn — og krefst OBREYTTRAR
     utkomu. Fullyrdingin "sama tala hja ollum thremur" ein naegdi EKKI:
     hun stendur lika hja margfaldara ef lidin baeru sama B-deildar-tolu.
     Her er ekkert gefid ser um inntakid.                                 */
  {
    const mutated = JSON.parse(JSON.stringify(promoted));
    for (const k of Object.keys(mutated)) {
      mutated[k].goals_pg = mutated[k].goals_pg * 3;
      mutated[k].goals_against_pg = mutated[k].goals_against_pg / 4;
    }
    const tm2 = buildTeamMetrics({ players, teams: teamsArr, promoted: mutated, teamForm });
    const same = promRows.every(r => tm2[r.id]?.xg90 === r.xg90 && tm2[r.id]?.xgc90 === r.xgc90);
    ok("B-deildar-tolurnar hafa ENGIN ahrif a gildin (adeins adildar-prof)", same,
       promRows.map(r => `${r.name}: ${tm2[r.id]?.xg90}/${tm2[r.id]?.xgc90}`).join(" · "));
  }
  /* MERKIMIDINN MA EKKI LJUGA. `championship_proxy` var RETT heiti medan
     tolurnar VORU B-deildartolur; nu er thad heiti a heimild sem er ekki
     notud (CLAUDE.md 8i: onakvaem tala undir rongu nafni).               */
  {
    const src = readFileSync(new URL("../src/teamstats.js", import.meta.url), "utf8");
    const body = src.slice(src.indexOf("export function buildTeamMetrics"));
    ok("`src` er `promoted_measured` — gamla heitid er hvergi i fallinu",
       /src = "promoted_measured"/.test(body) && !/championship_proxy/.test(body));
  }
  /* TVAER LAUGAR, TVEIR FASTAR. Falli `team_form.json` ut fa OLL 20 lid
     xG ~0 og 17 rotgroin PL-lid lenda i `default`; fyrir tha laug er
     ~medaltal rett svar og nylida-fastinn vaeri ROng tala.               */
  {
    const fake = [{ id: 999, name: "Nowhere Rovers", short: "NOW" }];
    const tm3 = buildTeamMetrics({ players: [], teams: fake, promoted, teamForm });
    ok("othekkt lid faer `default`, EKKI nylida-fastann",
       tm3[999]?.src === "default"
       && tm3[999]?.xg90 !== PROMOTED_PL.goals_pg
       && tm3[999]?.xgc90 !== PROMOTED_PL.conceded_pg,
       `${tm3[999]?.src} ${tm3[999]?.xg90}/${tm3[999]?.xgc90}`);
  }
  /* TVEGGJA-TIMABILA BLONDUNIN MA EKKI RORA VID FASTANN. `prevWeight` er
     1,0 thegar `matches` er null, svo vaeru `prevGoals`/`prevConc` sett
     yrdi fastinn blandadur vid timabil sem er EKKI TIL.                  */
  ok("nylidi hefur matches/prev* null — blondunin er thvi engin adgerd",
     promRows.every(r => r.matches == null && r.prevGoals == null && r.prevConc == null
                      && r.prevSotFor == null && r.prevSotAg == null),
     promRows.map(r => `${r.name}: m=${r.matches} pg=${r.prevGoals}`).join(" · "));

  /* ---- C. UTKOMAN — VERRI EN DEILDIN A BADUM HLIDUM ---- */
  const e0 = (teamForm?.teams || []).filter(t => t.matches > 0
    && Number.isFinite(t.goals_pg) && Number.isFinite(t.conceded_pg));
  ok(`deildar-dreifingin er til (${e0.length} lid med E0-rod)`, e0.length >= 15);
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const gfMean = avg(e0.map(t => t.goals_pg)), gaMean = avg(e0.map(t => t.conceded_pg));
  const pct = (a, q) => { const s = a.slice().sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]; };
  const gfQ1 = pct(e0.map(t => t.goals_pg), 0.25);
  const gaQ3 = pct(e0.map(t => t.conceded_pg), 0.75);
  /* ThETTA ER INVARIANTID SEM VAR BROTID — og thad var brotid a Coventry
     (sokn 1,58 = 5. besta, a sig 1,32 = 6. besta). Baðar hlidar tharf:
     "verri i sokn" ein hleypti gomlu Coventry-tolunni i gegn.            */
  const badMean = promRows.filter(r => !(r.xg90 < gfMean && r.xgc90 > gaMean));
  ok(`hvert nylida-lid er VERRA en deildar-medaltal a BADUM hlidum `
     + `(sokn < ${gfMean.toFixed(3)}, a sig > ${gaMean.toFixed(3)})`,
     promRows.length === 3 && badMean.length === 0,
     badMean.map(r => `${r.name}: ${r.xg90}/${r.xgc90}`).join(" · "));
  /* OG STERKARA: i lakasta fjordungi a badum hlidum. Medaltalid eitt er
     lagt mark — lid getur verid "undir medaltali" og samt i midju.       */
  const badQ = promRows.filter(r => !(r.xg90 <= gfQ1 && r.xgc90 >= gaQ3));
  ok(`hvert nylida-lid er i LAKASTA FJORDUNGI a badum hlidum `
     + `(sokn <= ${gfQ1.toFixed(2)}, a sig >= ${gaQ3.toFixed(2)})`,
     promRows.length === 3 && badQ.length === 0,
     badQ.map(r => `${r.name}: ${r.xg90}/${r.xgc90}`).join(" · "));

  /* ---- D. FFDR HELDUR AFRAM AD VERA TALA I OLLUM 114 LEIKJUM ----
     Nylidi an talna vaeri ekki "tomur dalkur" heldur `fx.fdr`-fallback i
     ollum leikjum thriggja lida — FFDR slokknar an thess ad neitt syni
     thad. Thess vegna er thetta profad A BITANUM, ekki bara a rodunum.  */
  {
    const fixtures = (() => { const d = J("fixtures.json"); return Array.isArray(d) ? d : (d?.fixtures || []); })();
    const eloByTeam = {}; (J("elo.json")?.teams || []).forEach(t => eloByTeam[t.fpl_id] = t);
    const fd = makeFixDifficulty({ teamMetrics: tm, teamById: byId, odds: J("odds.json"), eloByTeam });
    let n = 0, bad = 0, harder = 0;
    for (const f of fixtures) {
      for (const [me, opp, home] of [[f.team_h, f.team_a, 1], [f.team_a, f.team_h, 0]]) {
        if (!promRows.some(r => r.id === me)) continue;
        const fx = { opp, home, fdr: home ? f.team_h_difficulty : f.team_a_difficulty,
                     kickoff: f.kickoff_time };
        for (const p of [1, 2, 3, 4]) {
          const d = fd(me, fx, p); n++;
          if (!Number.isFinite(d) || d < 1 || d > 5) bad++;
          /* Nylidi a ekki ad eiga LETTA leiki ad medaltali — threpin eru
             algild (CLAUDE.md 3) og hlutlausa midthrepid er TIER_NEUTRAL. */
          if (tierOf(d) > TIER_NEUTRAL) harder++;
        }
      }
    }
    ok(`FFDR er tala i ollum ${n} nylida-leikjum x stodum`, n >= 400 && bad === 0,
       `${bad} ogildar`);
    ok(`meirihluti nylida-leikja er ThYNGRI en hlutlausa threpid (${harder}/${n})`,
       n > 0 && harder > n * 0.6, `${(100 * harder / n).toFixed(1)}%`);
  }

  /* ---- E. MAELINGA-SKRIFTAN ER TIL OG ER EKKI I `npm test` ---- */
  {
    const p = new URL("../scripts/measure-promoted-proxy.mjs", import.meta.url).pathname;
    ok("maelinga-skriftan er i repo (annars er talan oendurtakanleg)", existsSync(p));
    const runner = readFileSync(new URL("../tests/run-tests.mjs", import.meta.url), "utf8");
    ok("hun er EKKI i `npm test` (hun saekir ~15 CSV-skrar af netinu)",
       !/measure-promoted-proxy/.test(runner));
  }
}

/* ============================================================
   13. HVER DALKUR BORINN VID OHADA HEIMILD (21.8.2026)

   KAERAN: "lagadu team stats dalkinn thannig ad eg sjai rett team stats" —
   ITREKUD TVISVAR. Adur var flipinn profadur i BUTUM: ESPN gegn E0 (kafli
   3), skotakortid gegn E0 a MORKUM/A SIG/HREINUM BLODUM (kafli 12b), BSD-
   samlagningin a tilbunum svorum (kafli 8). ENGINN kafli spurdi hvern
   EINASTA dalk "endurgerist thessi tala ur annarri leid?" — og sa sem er
   ekki spurdur er sa sem er rangur (leikmannadalkarnir 17.8.2026: sjo af
   124 baru rangar tolur og ENGIN theirra fell a byggingu).

   ThESSI KAFLI TELUR ALLAR ThRJAR HEIMILDIRNAR UPP FRA GRUNNI:
     - `data/fdcouk/E0-2526.json` — 380 raðir af raunurslitum, talid her
       med SJALFSTAEDRI lykkju og lids-vorpun ur `teams_map.json` (svidid
       `fdcouk`). `team_form.json` er ThEGAR afleidsla af theirri skra, svo
       thetta ber vidmotid vid FRUMHEIMILDINA og ekki vid millistigid.
     - `data/bsd_shots.json` — ein rod per skot, talid her ohad
       `aggShotRange`.
     - krossprofun ESPN gegn BSD a somu staerd (teigsskot).

   NIDURSTADAN 21.8.2026: **allir 25 dalkar endurgerast**, i heilu
   timabili OG i bili (GW26-38 mælt ser). Sjo tolur voru RANGAR i
   leikmannalistanum; her er talan ENGIN — og thad er ekki thad sama sem
   "flipinn var i lagi": thrjar THOGLAR villur voru fundnar (dautt
   `season_locked`-flagg, `xgc_per_shot` med teljara og nefnara ur
   sitthvorri heimild, og hardkodad timabil i skotakorts-hausnum) og thaer
   eru vardar i koflum 13d-13f.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("13. HVER DALKUR GEGN OHADRI HEIMILD — E0-frumskrain og skotakortid");
console.log("─".repeat(84));
{
  const bsdTeams = existsSync(D + "bsd_teams.json") ? J("bsd_teams.json") : null;
  const fixtures = J("fixtures.json");
  const sf = J("bsd_shots.json");
  const map = J("teams_map.json");
  const F = Object.fromEntries(sf.legend.fields.map((f, i) => [f, i]));

  /* ---- OHAD LEID 1: E0-FRUMSKRAIN, TALIN HER ---- */
  const e0file = "fdcouk/E0-2526.json";
  const raw = existsSync(D + e0file) ? J(e0file) : null;
  ok(`${e0file} er til (forsenda kaflans)`, !!raw && Array.isArray(raw.rows));
  const fdToId = {};
  for (const [id, v] of Object.entries(map)) if (v?.fdcouk) fdToId[v.fdcouk] = +id;
  ok(`lids-vorpunin er lesin ur teams_map.json (${Object.keys(fdToId).length} heiti)`,
    Object.keys(fdToId).length >= 20, `${Object.keys(fdToId).length}`);
  const NUM = v => (v === "" || v == null ? null : Number(v));
  const E = {};
  let e0Rows = 0, e0Unmapped = 0;
  for (const r of (raw?.rows || [])) {
    /* `Div === "E0"` ER PROFSTEINNINN, ekki HTTP-stada (CLAUDE.md 6):
       2026/27-slodin skilar 301 yfir a `EC.csv` med utandeildar-leikjum. */
    if (r.Div !== "E0") continue;
    e0Rows++;
    const ids = [[fdToId[r.HomeTeam], "H"], [fdToId[r.AwayTeam], "A"]];
    if (ids.some(([id]) => id == null)) e0Unmapped++;
    for (const [id, p] of ids) {
      if (id == null) continue;
      const o = p === "H" ? "A" : "H";
      const x = E[id] = E[id] ||
        { n: 0, gf: 0, ga: 0, s: 0, sa: 0, st: 0, sta: 0, c: 0, f: 0, y: 0, cs: 0 };
      x.n++; x.gf += NUM(r[`FT${p}G`]); x.ga += NUM(r[`FT${o}G`]);
      x.s += NUM(r[`${p}S`]);  x.sa += NUM(r[`${o}S`]);
      x.st += NUM(r[`${p}ST`]); x.sta += NUM(r[`${o}ST`]);
      x.c += NUM(r[`${p}C`]); x.f += NUM(r[`${p}F`]); x.y += NUM(r[`${p}Y`]);
      if (NUM(r[`FT${o}G`]) === 0) x.cs++;
    }
  }
  /* FYRSTA UTGAFA ThESSARA TVEGGJA FULLYRDINGA VAR ROng OG ThAD ER SKRAD
     HER FREMUR EN LAGFAERT I ThOGN: hun krafdist `e0Unmapped === 0` og 20
     lida. Raunin er 108 raðir og 17 lid, og BADAR tolur eru RETTAR:
     `teams_map.json` ber ThAU 20 LID SEM ERU I DEILDINNI I DAG, svo thau
     THRJU sem fellu 2025/26 hafa enga vorpun — og thau eru i 108 leikjum.
     Krafan er thvi um ThAD SEM MA VANTA: adeins fallin lid, nakvaemlega
     thrju, og hvert eitt af theim 17 sem eftir eru VERDUR ad hafa 38 leiki.
     Fullyrding sem heimtar 20 af 17 mogulegum er ekki strangari, hun er
     bara ROng — og hun hefdi verid "lagfaerd" med thvi ad lina hana ef
     talan hefdi ekki verid skoðud.                                      */
  const unmapped = new Set();
  for (const r of (raw?.rows || [])) {
    if (r.Div !== "E0") continue;
    for (const nm of [r.HomeTeam, r.AwayTeam]) if (fdToId[nm] == null) unmapped.add(nm);
  }
  ok(`${e0Rows} E0-raðir taldar; ${unmapped.size} lid an vorpunar `
    + `(${[...unmapped].join(", ")}) — thau fellu og eru ekki i teams_map`,
    e0Rows >= 370 && unmapped.size === 3, `${e0Rows} / ${[...unmapped].join(",")}`);
  ok(`${Object.keys(E).length} lid eiga E0-rod og hvert med 38 leiki`,
    Object.keys(E).length === 17 && Object.values(E).every(x => x.n === 38),
    Object.entries(E).filter(([, x]) => x.n !== 38).map(([k, x]) => `${k}:${x.n}`).join(","));

  /* ---- OHAD LEID 2: SKOTAKORTID, TALID HER (ekki gegnum aggShotRange) ---- */
  const inR = (g, rg) => g != null && (!rg || (g >= rg[0] && g <= rg[1]));
  const bsdRef = (short, range) => {
    const ti = sf.legend.teams.indexOf(short);
    if (ti < 0) return null;
    const forr = sf.shots.filter(s => s[F.team] === ti && inR(s[F.gw], range));
    const agst = sf.shots.filter(s => s[F.opp]  === ti && inR(s[F.gw], range));
    if (!forr.length && !agst.length) return null;
    const games = new Set();
    for (const s of forr) games.add(`${s[F.gw]}:${s[F.opp]}`);
    for (const s of agst) games.add(`${s[F.gw]}:${s[F.team]}`);
    const sum = a => a.reduce((x, s) => x + (s[F.xg] || 0), 0);
    const per = new Map();
    for (const s of agst) { const k = `${s[F.gw]}:${s[F.team]}`;
      per.set(k, (per.get(k) || 0) + (s[F.type] === SHOT_GOAL_TYPE ? 1 : 0)); }
    let cs = 0; for (const k of games) if (!per.get(k)) cs++;
    return { n: games.size, nA: agst.length,
      xgF: sum(forr), xgA: sum(agst),
      bcF: forr.filter(s => (s[F.xg] || 0) >= BIG_CHANCE_XG).length,
      bcA: agst.filter(s => (s[F.xg] || 0) >= BIG_CHANCE_XG).length,
      gf: forr.filter(s => s[F.type] === SHOT_GOAL_TYPE).length,
      ga: agst.filter(s => s[F.type] === SHOT_GOAL_TYPE).length, cs,
      boxF: forr.filter(s => s[F.x] <= IN_BOX_X).length,
      boxA: agst.filter(s => s[F.x] <= IN_BOX_X).length };
  };

  const shotIndex = buildShotIndexLikeApp(sf);
  const base13 = buildTeamRows({ teams, teamForm, luck, teamShots, bsdTeams });
  const use13 = teamRangeUse({ base13: null, base: base13, shotIndex, fixtures });

  /* ---- 13a. SAMANBURDURINN SJALFUR, DALKUR FYRIR DALK ----
     `cmp` skilar FJOLDA samanburda svo thekjan geti FELLT prófid — tala
     sem er "0 af 0 rangar" er tom fullyrding (CLAUDE.md 5b regla 1).   */
  const compare = (rows, spec, range) => {
    const bad = [], seen = {};
    for (const r of rows) {
      const e = E[r.id], b = bsdRef(r.short, range);
      for (const [key, want, tol] of spec(r, e, b)) {
        if (want == null) continue;
        seen[key] = (seen[key] || 0) + 1;
        const got = TEAM_STAT_BY_KEY[key] ? TEAM_STAT_BY_KEY[key].get(r) : r[key];
        if (got == null) { bad.push(`${r.short}/${key}: tomt a moti ${want}`); continue; }
        if (Math.abs(got - want) > tol) bad.push(`${r.short}/${key}: ${got} a moti ${want}`);
      }
    }
    return { bad, seen, total: Object.values(seen).reduce((a, b) => a + b, 0) };
  };
  /* E0-DALKARNIR. Vikmorkin eru NAMUNDUNIN SJALF (tvo aukastafir -> 0,005
     + fleytitolu-slaki), ekki "naerri thvi": vikmork sem eru rummari en
     namundunin hleypa raunverulegri skekkju i gegn.                     */
  const specE0 = (r, e) => !e ? [] : [
    ["shots_against_pg", +(e.sa / e.n).toFixed(2), 0.006],
    ["sot_against_pg",   +(e.sta / e.n).toFixed(2), 0.006],
    ["conceded_pg",      +(e.ga / e.n).toFixed(2), 0.006],
    ["cs_pct",           +(100 * e.cs / e.n).toFixed(1), 0.06],
    ["goals_pg",         +(e.gf / e.n).toFixed(2), 0.006],
    ["shots_pg",         +(e.s / e.n).toFixed(2), 0.006],
    ["sot_pg",           +(e.st / e.n).toFixed(2), 0.006],
    ["corners_pg",       +(e.c / e.n).toFixed(2), 0.006],
    ["fouls_pg",         +(e.f / e.n).toFixed(2), 0.006],
    ["yellows_pg",       +(e.y / e.n).toFixed(2), 0.006],
    ["conversion",       +(e.gf / e.s).toFixed(3), 0.0006],
    ["sot_share_against", +(e.sta / e.sa).toFixed(3), 0.0011],
    ["matches",          e.n, 0],
    ["goals",            e.gf, 0],
    ["conceded",         e.ga, 0],
  ];
  /* BSD-DALKARNIR. `n` er LEIKIR (ekki umferdir) i badum leidum.        */
  const specBsd = (r, e, b) => !b || !b.n ? [] : [
    ["xg_pg",   +(b.xgF / b.n).toFixed(2), 0.006],
    ["xgc_pg",  +(b.xgA / b.n).toFixed(2), 0.006],
    ["bc_pg",   +(b.bcF / b.n).toFixed(2), 0.006],
    ["bc_against_pg", +(b.bcA / b.n).toFixed(2), 0.006],
    ["xg_per_shot_against", +(b.xgA / b.nA).toFixed(3), 0.0006],
    ["goals_minus_xg",     +(b.gf - b.xgF).toFixed(1), 0.06],
    ["conceded_minus_xgc", +(b.ga - b.xgA).toFixed(1), 0.06],
    ["bsd_matches", b.n, 0],
  ];
  const season13 = applyTeamRange(base13, { range: null, shotIndex, fixtures, use: use13 });
  {
    const rE = compare(season13, specE0, null);
    ok(`E0: ${rE.total} samanburdir yfir ${Object.keys(rE.seen).length} dalka`,
      Object.keys(rE.seen).length === 15 && rE.total >= 15 * 17,
      `${rE.total} / ${Object.keys(rE.seen).length}`);
    ok("og HVER EIN endurgerist ur E0-frumskranni", rE.bad.length === 0,
      rE.bad.slice(0, 4).join(" · "));
    const rB = compare(season13, specBsd, null);
    ok(`BSD: ${rB.total} samanburdir yfir ${Object.keys(rB.seen).length} dalka`,
      Object.keys(rB.seen).length === 8 && rB.total >= 8 * 17,
      `${rB.total} / ${Object.keys(rB.seen).length}`);
    ok("og HVER EIN endurgerist ur skotakortinu (ohad samlagning)",
      rB.bad.length === 0, rB.bad.slice(0, 4).join(" · "));
  }
  /* OG I BILI. GW26-38 ER VALID VILJANDI: thad er nakvaemlega bilid sem
     notandinn kaerdi (ARS xGC 0,94), svo profid stendur a theim tolu sem
     var tilkynnt og ekki a thaegilegri.                                 */
  {
    const rng = applyTeamRange(base13, { range: [26, 38], shotIndex, fixtures, use: use13 });
    const rB = compare(rng, (r, e, b) => !b || !b.n ? [] : [
      ["xg_pg",  +(b.xgF / b.n).toFixed(2), 0.006],
      ["xgc_pg", +(b.xgA / b.n).toFixed(2), 0.006],
      ["goals_pg", +(b.gf / b.n).toFixed(2), 0.006],
      ["conceded_pg", +(b.ga / b.n).toFixed(2), 0.006],
      ["cs_pct", +(100 * b.cs / b.n).toFixed(1), 0.06],
      ["bc_pg",  +(b.bcF / b.n).toFixed(2), 0.006],
      ["bc_against_pg", +(b.bcA / b.n).toFixed(2), 0.006],
    ], [26, 38]);
    ok(`BIL GW26-38: ${rB.total} samanburdir, allir endurgerast`,
      rB.total >= 7 * 15 && rB.bad.length === 0, rB.bad.slice(0, 4).join(" · "));
    /* TALAN SEM VAR TILKYNNT, BERUM ORDUM. Hun er RETT og ma ekki
       "lagfaerast" i seinni lotu: 121 skot a ARS i GW26-38, summa xG
       12,18, thad er 0,937/leik. Fullyrdingin nefnir bædi hlidar svo hun
       geti ekki stadid ef xGC verdur latid heita mork a sig.            */
    const ars = rng.find(r => r.short === "ARS"), ref = bsdRef("ARS", [26, 38]);
    ok(`ARS GW26-38: ${ref.nA} skot a sig, summa xG ${ref.xgA.toFixed(2)} -> xGC/leik `
      + `${ars.xgc_pg} (RETT — ekki mork a sig)`,
      ref.nA === 121 && Math.abs(ref.xgA - 12.18) < 0.02 && ars.xgc_pg === 0.94,
      `${ref.nA} / ${ref.xgA.toFixed(3)} / ${ars.xgc_pg}`);
    ok(`og raunveruleg mork a sig i sama bili eru LAEGRI (${ars.conceded_pg} < ${ars.xgc_pg})`,
      ars.conceded === 10 && ars.conceded_pg < ars.xgc_pg,
      `${ars.conceded} / ${ars.conceded_pg}`);
  }
  /* ---- 13b. MUTATION A OHADU LEIDINNI SJALFRI ----
     Samanburdur sem getur ekki fallid maelir ekkert. Bædi ohadu leidirnar
     eru raskaðar og `compare` VERDUR ad taka thad.                      */
  {
    const bump = (spec, k, add) => (r, e, b) =>
      spec(r, e, b).map(([key, want, tol]) => [key, key === k ? want + add : want, tol]);
    ok("MUTATION: E0-viðmid raskad um 0,05 skot/leik -> samanburdurinn FELLUR",
      compare(season13, bump(specE0, "shots_against_pg", 0.05), null).bad.length > 10);
    ok("MUTATION: BSD-viðmid raskad um 0,05 xG/leik -> samanburdurinn FELLUR",
      compare(season13, bump(specBsd, "xgc_pg", 0.05), null).bad.length > 10);
    ok("MUTATION: namundunar-vikmork taka EKKI heilt mark (1,0/leik)",
      compare(season13, bump(specE0, "conceded_pg", 1), null).bad.length > 10);
  }

  /* ---- 13c. ESPN-SVAEDIN GEGN BSD — ThAU EIGA ENGA ADRA LEID ----
     `box_*` og `close_*` koma ur ESPN-svaedistexta og eru ThVI EKKI
     endurgeranleg ur E0 (sem hefur engin svaedi). Nalaegasta ohada leidin
     er BSD-hnitin (`x <= IN_BOX_X`), sem er ONNUR skilgreining a somu
     staerd. Fullyrdingin er thvi um RODUN og um ATTINA a skekkjunni, ekki
     um jofn tolu — og hun er sogd BERUM ORDUM (CLAUDE.md 5b).           */
  {
    const pairs = { A: [], F: [] };
    for (const t of teamShots.teams) {
      const b = bsdRef(t.short, null); if (!b || !b.n) continue;
      if (t.in_box_against_pg != null) pairs.A.push([t.in_box_against_pg, b.boxA / b.n]);
      if (t.in_box_pg != null)         pairs.F.push([t.in_box_pg, b.boxF / b.n]);
    }
    const corr = a => { const n = a.length;
      const mx = a.reduce((s, p) => s + p[0], 0) / n, my = a.reduce((s, p) => s + p[1], 0) / n;
      let sx = 0, sy = 0, sxy = 0;
      for (const [x, y] of a) { sx += (x - mx) ** 2; sy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
      return sxy / Math.sqrt(sx * sy); };
    ok(`${pairs.A.length} lid eiga BAEDI ESPN-svaedi og BSD-hnit (forsenda)`,
      pairs.A.length >= 12 && pairs.F.length >= 12, `${pairs.A.length}/${pairs.F.length}`);
    const rA = corr(pairs.A), rF = corr(pairs.F);
    ok(`ESPN-teigsskot A SIG fylgja BSD-teigsskotum (r ${rA.toFixed(3)})`, rA > 0.9,
      rA.toFixed(3));
    ok(`og ESPN-teigsskot FYRIR gera thad lika (r ${rF.toFixed(3)})`, rF > 0.9, rF.toFixed(3));
    /* SKEKKJAN ER KERFISBUNDIN — ESPN telur LAEGRA hja OLLUM (6-13% skota
       bera engan svaedistexta og eru adeins i heildartolunni). Vaeri hun
       handahofskennd — sum lid yfir, onnur undir — vaeri urdratturinn ad
       para svaedi vid rong skot, sem er allt annad og miklu verra.       */
    ok("og hun er KERFISBUNDIN i EINA att (ESPN telur laegra hja ollum)",
      pairs.A.every(([e, b]) => e < b) && pairs.F.every(([e, b]) => e < b),
      pairs.A.filter(([e, b]) => e >= b).length + " lid yfir");
    /* OG SVAEDALAUSU SKOTIN ERU TALIN I SKRANNI, svo halli hlutfallsins er
       SKYRDUR og ekki ospurdur. Talan er LESIN, aldrei hardkodud.        */
    ok(`svaedalausu skotin eru TALIN i skranni (${teamShots.no_zone})`,
      Number(teamShots.no_zone) > 0);
  }

  /* ---- 13d. `season_locked` ER WIRED — ThAD VAR DAUTT FLAGG ----
     Sjo dalkar baru flaggid og ENGINN i `src/` las thad; adeins kafli 5
     her sannreyndi ad thad VAERI a theim. Flagg sem enginn les er
     merkimidi sem segir adeins sjalfum ser, og dagurinn sem thad verdur
     thogul lygi var dagsettur: `bsd_teams.json` var birt AN ThESS ad
     nokkud spyrdi hvada timabil hun ber.                                */
  {
    const locked = TEAM_STAT_DEFS.filter(d => d.season_locked).map(d => d.key);
    /* TALAN ER LEIDD, EKKI SLEGIN INN (22.8.2026): hun stod i 7 og for i 10
       thegar samtolurnar baettust vid, svo hardkodud tala hefdi fellt safnid
       i hvert sinn sem BSD-dalki er baett vid. Krafan sem SKIPTIR MALI er
       ekki fjoldinn heldur ad mengid se NAKVAEMLEGA their dalkar sem lesa
       BSD — thad er profad i naestu linu og aftur i kafla 13d.           */
    const bsdCols = TEAM_STAT_DEFS.filter(d => d.src === "BSD").map(d => d.key);
    ok(`${locked.length} dalkar bera \`season_locked\` og thad eru NAKVAEMLEGA `
       + `BSD-dalkarnir (${bsdCols.length})`,
       locked.length > 0 && locked.slice().sort().join(",") === bsdCols.slice().sort().join(","),
       `locked=[${locked.sort().join(",")}] bsd=[${bsdCols.sort().join(",")}]`);
    /* FORSENDAN FYRIR SVEIPNUM: hver `get` les rodar-svid med SAMA nafni
       sem lykillinn. Vaeri thad ekki satt myndi `row[d.key] = null` blanka
       svid sem enginn les og skilja dalkinn eftir fylltan.               */
    ok("hvert `get()` les rodar-svid med SAMA nafni sem lykillinn",
      TEAM_STAT_DEFS.every(d => base13.every(r => d.get(r) === r[d.key])),
      TEAM_STAT_DEFS.filter(d => base13.some(r => d.get(r) !== r[d.key])).map(d => d.key).join(","));
    ok("timabil skranna eru NORMALISUD (2025-26 og 2025/26 eru sama timabil)",
      seasonKey("2025-26") === seasonKey("2025/26") && seasonKey("2025/26") === "202526"
      && seasonKey(null) === null && seasonKey("x") === null);
    ok("i dag eru thau I TAKT (forsenda: dalkarnir eru FYLLTIR)",
      bsdSeasonInStep(teamForm, bsdTeams).ok === true
      && locked.every(k => base13.some(r => TEAM_STAT_BY_KEY[k].get(r) != null)),
      JSON.stringify(bsdSeasonInStep(teamForm, bsdTeams)));
    /* OG UR TAKTI: sama skra, ADEINS timabils-strengurinn breyttur.      */
    const stale = { ...bsdTeams, season: "2026/27" };
    const outRows = buildTeamRows({ teams, teamForm, luck, teamShots, bsdTeams: stale });
    ok("ur takti: HVER `season_locked`-dalkur verdur TOMUR hja ollum lidum",
      locked.every(k => outRows.every(r => TEAM_STAT_BY_KEY[k].get(r) === null)),
      locked.filter(k => outRows.some(r => TEAM_STAT_BY_KEY[k].get(r) != null)).join(","));
    /* OG ADEINS THEIR — annars vaeri vardurinn ad thurrka ut E0-dalka sem
       eiga engan hlut i BSD (og tha vaeri "tomt" svarid vid rongu spurn). */
    const other = TEAM_STAT_DEFS.filter(d => !d.season_locked).map(d => d.key);
    ok("og ENGINN annar dalkur haggast (E0/ESPN eru ohadar BSD-timabilinu)",
      other.every(k => base13.every((r, i) =>
        TEAM_STAT_BY_KEY[k].get(r) === TEAM_STAT_BY_KEY[k].get(outRows[i]))),
      other.filter(k => base13.some((r, i) =>
        TEAM_STAT_BY_KEY[k].get(r) !== TEAM_STAT_BY_KEY[k].get(outRows[i]))).join(","));
    /* ============================================================
       SAMNINGURINN, I BADAR ATTIR — OG FYRSTA UTGAFAN VAR TAUTOLOGIA

       Her stod: "taktu flaggid af `bc_pg`, hann a ad HAETTA ad tæmast."
       Hun FELL — og appid var i lagi. Orsokin er ad `buildTeamRows` hafdi
       ThA TVAER agerdir sem gera thad sama: `bsdOk`-gattina (les ekki
       skrana) OG sveip yfir flaggid. Sveipurinn gerdi thvi ekkert og
       fullyrdingin gat ekki maelt hann. Sveipurinn var FJARLAEGDUR (sja
       teamstats.js) og fullyrdingin endursmiðuð sem ThAD SEM ER
       RAUNVERULEGA HAEGT AD MAELA: mengið sem taemist a ad vera
       NAKVAEMLEGA thad sem ber flaggid.

       BADAR ATTIR ERU NAUDSYNLEGAR og hvorug naegir ein:
         - vantar flagg a BSD-dalk  -> hann taemist an thess ad vidmotid
           segi fra (hann fengi hvorki varnad ne tooltip-setningu).
         - flagg a E0-dalki         -> vidmotid lofar tomu holfi sem er
           fullt, og notandinn leitar skyringar a tolu sem er i lagi.
       ============================================================ */
    {
      const blanked = TEAM_STAT_DEFS
        .filter(d => outRows.every(r => d.get(r) === null))
        .map(d => d.key).sort();
      const flagged = [...locked].sort();
      ok(`mengid sem taemist ER nakvaemlega \`season_locked\`-mengid (${flagged.length})`,
        blanked.join(",") === flagged.join(","),
        `taemist: ${blanked.join(",")} | flaggad: ${flagged.join(",")}`);
      /* MUTATION 1 — FLAGG A E0-DALKI. `corners_pg` kemur ur E0 og
         taemist ekki, svo samningurinn VERDUR ad falla.                 */
      const chk = () => {
        const b = TEAM_STAT_DEFS.filter(d => outRows.every(r => d.get(r) === null))
          .map(d => d.key).sort().join(",");
        const f = TEAM_STAT_DEFS.filter(d => d.season_locked).map(d => d.key).sort().join(",");
        return b === f;
      };
      const c = TEAM_STAT_BY_KEY.corners_pg;
      c.season_locked = true;
      const m1 = chk();
      delete c.season_locked;
      ok("MUTATION: flagg sett a E0-dalk (corners_pg) -> samningurinn FELLUR", m1 === false);
      /* MUTATION 2 — FLAGG TEKID AF BSD-DALKI. */
      const b = TEAM_STAT_BY_KEY.bc_pg;
      delete b.season_locked;
      const m2 = chk();
      b.season_locked = true;
      ok("MUTATION: flagg tekid af BSD-dalki (bc_pg) -> samningurinn FELLUR", m2 === false);
      ok("og flaggid er ORDID EINS OG ThAD VAR eftir stokkbreytingarnar",
        chk() === true && TEAM_STAT_BY_KEY.bc_pg.season_locked === true
        && !TEAM_STAT_BY_KEY.corners_pg.season_locked);
    }
    /* ThOGN ER EKKI MISVISIR. Skra an `season`-svids ma ALDREI blanka —
       sama regla og null-reglan i rotation.js (`P=null` utilokar aldrei). */
    ok("skra AN `season`-svids blankar ekkert (thogn er ekki misvisir)",
      bsdSeasonInStep(teamForm, { ...bsdTeams, season: undefined }).ok === true
      && buildTeamRows({ teams, teamForm, luck, teamShots,
           bsdTeams: { ...bsdTeams, season: undefined } }).some(r => r.bc_pg != null));
    ok("og tafla an `season`-svids blankar ekkert heldur",
      bsdSeasonInStep({ ...teamForm, season: null }, bsdTeams).ok === true);
    /* HEITIN ERU BORIN MED svo vidmotid geti NEFNT bædi timabilin. */
    const st = bsdSeasonInStep(teamForm, stale);
    ok("misvisirinn ber BADA timabils-strengina (vidmotid a ad nefna thau)",
      st.ok === false && st.tableLabel === teamForm.season && st.bsdLabel === "2026/27",
      JSON.stringify(st));
    /* OG SKOTAKORTID BJARGAR ThVI ThEGAR ThAD ER I TAKT — thar var taktinn
       MAELDUR (leikjafjoldi OG mork/leik), svo blankunin ma ekki lifa
       yfir hann. Vaeri hun einrätt yrdu tolur felldar sem eru RETTAR.   */
    {
      const filled = applyTeamRange(outRows, { range: null, shotIndex, fixtures, use: use13 });
      ok("`bsd_teams` ur takti EN skotakortid i takt -> dalkarnir fyllast AFTUR",
        ["xg_pg", "xgc_pg", "bc_pg", "bc_against_pg"].every(k =>
          filled.filter(r => TEAM_STAT_BY_KEY[k].get(r) != null).length >= 15),
        ["xg_pg", "xgc_pg", "bc_pg", "bc_against_pg"]
          .map(k => `${k}:${filled.filter(r => TEAM_STAT_BY_KEY[k].get(r) != null).length}`).join(" "));
    }
  }

  /* ---- 13e. TELJARI OG NEFNARI UR SOMU HEIMILD (CLAUDE.md 12) ----
     `xgc_per_shot` var reiknud sem BSD-xGC / E0-skot-a-sig — tvaer
     oskyldar heimildir sem telja SITTHVORN skotafjolda (BSD 8,263 hja ARS
     a moti E0 8,16). Hun var AUK ThESS daud i thrjar attir: enginn dalkur
     las hana, `applyTeamRange` setti hana i null um leid og skotakortid er
     i takt, og RETTA talan er thegar til sem `xg_per_shot_against` (BSD
     badum megin). Sama villa gaf Ogbene 148% i leikmannalistanum.       */
  {
    const src = readFileSync(new URL("../src/teamstats.js", import.meta.url), "utf8");
    ok("`xgc_per_shot` er farin ur skranni (BSD-teljari / E0-nefnari)",
      !/xgc_per_shot\s*[:=]/.test(src));
    ok("og engin rod ber hana lengur", base13.every(r => !("xgc_per_shot" in r)));
    /* POSITIVA HLIDIN: RETTA talan er a skjanum og hun er BSD badum megin.
       An hennar vaeri "strengurinn finnst ekki" satt af thvi ad ekkert
       vaeri til (CLAUDE.md 5b regla 2).                                 */
    ok("en `xg_per_shot_against` ER dalkur og hann er BSD badum megin",
      TEAM_STAT_BY_KEY.xg_per_shot_against?.src === "BSD"
      && base13.filter(r => r.xg_per_shot_against != null).length >= 15);
    /* OG HLUTFOLL SEM ERU I TOFLUNNI HALDA SIG A [0,1] — hlutur yfir 100%
       er SONNUN um tvaer heimildir, ekki ha tala (CLAUDE.md 12).        */
    const shares = TEAM_STAT_DEFS.filter(d => d.pct);
    ok(`${shares.length} hlutfalls-dalkar, allir a [0,1] hja ollum lidum`,
      shares.length >= 3 && shares.every(d => base13.every(r => {
        const v = d.get(r); return v == null || (v >= 0 && v <= 1); })),
      shares.filter(d => base13.some(r => { const v = d.get(r);
        return v != null && (v < 0 || v > 1); })).map(d => d.key).join(","));
  }

  /* ---- 13f. xGC MA EKKI LESAST SEM MORK A SIG — ThAD VAR KAERAN ----
     Notandinn sagdi "ARS xGC 0,94 fyrir GW26-38 er rangt". Talan var rett
     (13a sannar hana); thad sem VAR rangt var ad ENGIN SETNING a skjanum
     sagdi ad xGC se ekki mork a sig, og "xGC per match" vid hlidina a
     "Goals conceded per match" les eins og tvaer maelingar a SAMA hlut sem
     stangast a. Vardurinn er tviskiptur AF ASETTU RADI: fyrst ad
     staerdirnar seu raunverulega OLIKAR (annars vaeri kvortunin rett), og
     svo ad textinn segi thad.                                           */
  {
    const both = season13.filter(r => r.xgc_pg != null && r.conceded_pg != null);
    const differ = both.filter(r => r.xgc_pg !== r.conceded_pg).length;
    ok(`xGC og GC eru OLIKAR tolur hja ${differ}/${both.length} lidum (forsenda)`,
      both.length >= 15 && differ >= both.length - 1, `${differ}/${both.length}`);
    const over = both.filter(r => r.xgc_pg > r.conceded_pg).length;
    ok(`og xGC er HAERRI en GC hja ${over} lidum — thad er venjulegt, ekki villa`,
      over >= 3, `${over}`);
    /* TEXTINN. Krafan er a BADA dalka: sa sem er MISLESINN verdur ad
       afneita, og sa sem hann er mislesinn SEM verdur ad benda til baka. */
    for (const [k, deny] of [["xgc_pg", /NOT GOALS CONCEDED/],
                             ["xg_pg", /NOT GOALS SCORED/]]) {
      ok(`\`${k}\` afneitar berum ordum ad vera raunmorkin`,
        deny.test(TEAM_STAT_BY_KEY[k].note), TEAM_STAT_BY_KEY[k].note.slice(0, 70));
      ok(`og \`${k}\` bendir a mismuna-dalkinn sem svarar spurningunni`,
        /(GC-xGC|G-xG) column/.test(TEAM_STAT_BY_KEY[k].note));
    }
    for (const k of ["conceded_pg", "goals_pg"])
      ok(`\`${k}\` segir ad hun se RAUNTALA og ad nagranninn se annad`,
        /actually went in/.test(TEAM_STAT_BY_KEY[k].note)
        && /meant to differ/.test(TEAM_STAT_BY_KEY[k].note),
        TEAM_STAT_BY_KEY[k].note.slice(0, 70));
    /* HEITID SJALFT BER EININGUNA "expected" — notan er annad lag, en
       haus-heitid er thad sem sest fyrst i dalkavalaranum.               */
    ok("heitin bera ordid `expected` a badum vaentu dalkunum",
      /expected/i.test(TEAM_STAT_BY_KEY.xgc_pg.label)
      && /expected/i.test(TEAM_STAT_BY_KEY.xg_pg.label),
      `${TEAM_STAT_BY_KEY.xgc_pg.label} / ${TEAM_STAT_BY_KEY.xg_pg.label}`);
    /* OG BADIR PORIN ERU I SAMA FLOKKI — vaeri xGC i odrum flokki en GC
       saei notandinn thau ALDREI hlid vid hlid og tilvisunin i notunni
       ("the column beside it") vaeri ord um eitthvad sem er ekki thar.  */
    ok("GC og xGC eru i SAMA flokki (annars er 'beside it' ekki satt)",
      TEAM_STAT_BY_KEY.conceded_pg.group === TEAM_STAT_BY_KEY.xgc_pg.group
      && TEAM_STAT_BY_KEY.goals_pg.group === TEAM_STAT_BY_KEY.xg_pg.group);
  }

  /* ---- 13g. NYLIDARNIR: SAMA TALA I FFDR, EN ENGIN TALA HER ----
     `PROMOTED_PL` gefur COV/HUL/IPS NAKVAEMLEGA somu tolu (1,03/1,71) og
     thad ER maeld akvordun (kafli 12 her ad ofan, n=45). Spurningin sem
     var borin upp — "thrju lid med byte-jofnum tolum LITUR UT eins og
     villa a skjanum" — er hins vegar EKKI um thennan flipa, og thad er
     MAELT: fastinn er FFDR-inntak og fer aldrei i tofluna. Hvert eitt af
     25 holfum theirra er "—". Merki vaeri thvi merki a ENGA tolu.        */
  {
    const prom = season13.filter(r => TEAM_STAT_DEFS.every(d => d.get(r) == null));
    ok(`${prom.map(r => r.short).join(",")} bera ENGA tolu i thessum flipa `
      + `(${TEAM_STAT_DEFS.length} holf, oll tom)`,
      prom.length === 3 && prom.every(r => TEAM_STAT_DEFS.every(d => d.get(r) === null)));
    ok("svo nylida-fastinn er hvergi SYNILEGUR her (og merki a hann vaeri merki a ekkert)",
      prom.every(r => ![PROMOTED_PL.goals_pg, PROMOTED_PL.conceded_pg]
        .some(v => TEAM_STAT_DEFS.some(d => d.get(r) === v))));
  }
}

/* ============================================================
   14. TIMABILID I SKOTAKORTS-HAUSNUM ER LEITT, EKKI HARDKODAD
   Tveir strengir "2025/26" stodu i `Teams.jsx` i haus skotakortsins.
   Sami flokkur og horna-sviðin i SetPieces 13.8.2026: fost tala um
   lifandi gogn ureldist thogult — skrain sem berst (`bsd_shots.json`) er
   lyklud a timabil og verdur endurnyjud.
   Vardurinn les UPPRUNANN thvi `bsd_shots.json` er letihladin og
   skotakorts-hausinn birtist adeins eftir smell a lidsnafn; DOM-leidin er
   i `team-gw.mjs` kafla 7.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("14. HARDKODAD TIMABIL I VIDMOTINU");
console.log("─".repeat(84));
{
  const jsx = readFileSync(new URL("../src/Teams.jsx", import.meta.url), "utf8");
  /* ATHUGASEMDIR ERU STRIPPADAR FYRST — annars uppfyllir rokstudningurinn
     sjalfur leitina og fullyrdingin verdur tautologia (CLAUDE.md 13).   */
  const code = jsx.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  /* FYRSTA UTGAFA ThESSA REGEX-S VAR OF ThRONG OG STOKKBREYTINGIN SLAPP:
     hun leitadi ad `"20dd/dd"` MED LOKANDI GAESALAPPI, svo hun hitti
     `"2025/26"` en EKKI `"2025/26 · bubble size = xG"` — sem er einmitt
     strengurinn sem stod i skranni. Fullyrding sem sleppir tilfellinu sem
     hun er nefnd eftir er verri en engin (CLAUDE.md 13). Nu er ThVERT UM
     LEITAD: hvar sem timabils-mynstur stendur i kodanum (an athugasemda).  */
  const hard = code.match(/20\d\d\s*[/-]\s*\d\d/g) || [];
  ok("engin timabils-tala er hardkodud i kodanum sjalfum", hard.length === 0,
    hard.join(","));
  /* POSITIVA HLIDIN: strengirnir sem TOKU vid eru sannanlega i skranni,
     svo "finnst ekki" getur ekki verid satt af thvi ad ekkert se til.   */
  ok("timabilid er tekid ur `teamForm.season` og GATT a taktprofinu",
    /shotSeason\s*=\s*use\.shots\s*\?\s*\(teamForm\?\.season/.test(code));
  ok("og hausinn birtir thad ur theirri breytu", /shotSeason\s*\?\s*`\$\{shotSeason\}/.test(code));
  ok("se kortid ekki i takt er EKKERT timabil nefnt (thogn, ekki agiskun)",
    /The shot map covers a single season/.test(code));
}

/* ============================================================
   SAMTOLUR YFIR VALDA UMFERDIR (22.8.2026)

   Beidni notandans: "Eg vill geta sed samtals xGC fyrir allar valdar
   gameweeks. A ad vera 1-2 i hverri umferd. 20 xGC yfir 20 umferdir."

   PROFSTEINNINN ER HANS EIGIN REIKNINGUR: samtala deilt med leikjafjolda
   verdur ad gefa per-leik dalkinn vid hlidina, i heilu timabili OG i bili.
   Su krafa er sterkari en "dalkurinn er til" og hun fellur a hverri einustu
   leid sem gæti farid urskeidis — rangur nefnari, summa ur odru bili, summa
   ur annarri heimild.

   OG NEFNARARNIR TVEIR MEGA ALDREI RUGLAST: `played` telur urslita-leiki,
   `bsd_matches` telur leiki med skotakort. Samtala undir rongum nefnara er
   verri en enginn nefnari, thvi hun litur rett ut.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("14. SAMTOLUR — summa / leikir VERDUR ad gefa per-leik dalkinn");
console.log("─".repeat(84));
{
  /* RODIRNAR ERU BYGGDAR MED `bsdTeams` — sá vidmodid gerir thad og
     xG/xGC eru ekki til an theirra. Efsta `rows` i skranni sleppir theim
     VILJANDI (adrir kaflar profa BSD-lausa tilfellid), svo an thessarar
     linu hefdi helmingur kaflans maelt `null` gegn `null`.              */
  const rows14 = buildTeamRows({ teams, teamForm, luck, teamShots,
                                 bsdTeams: J("bsd_teams.json") });
  const PAIRS = [["xgc", "xgc_pg", "bsd_matches"], ["xg", "xg_pg", "bsd_matches"],
                 ["goals", "goals_pg", "played"], ["conceded", "conceded_pg", "played"]];
  for (const [tot, pg, den] of PAIRS) {
    ok(`\`${tot}\` er dalkur vid hlidina a \`${pg}\``,
       !!TEAM_STAT_BY_KEY[tot] && TEAM_STAT_BY_KEY[tot].group === TEAM_STAT_BY_KEY[pg].group,
       `${TEAM_STAT_BY_KEY[tot]?.group} vs ${TEAM_STAT_BY_KEY[pg]?.group}`);
    ok(`\`${tot}\` erfir attina fra \`${pg}\``,
       TEAM_STAT_BY_KEY[tot].hi === TEAM_STAT_BY_KEY[pg].hi);
  }
  /* NEFNARARNIR ERU TVEIR OG ADSKILDIR — se their sameinadir er thetta
     prof thad eina sem tekur eftir thvi.                                */
  ok("nefnararnir tveir eru SITTHVOR dalkurinn",
     TEAM_STAT_BY_KEY.played.key !== TEAM_STAT_BY_KEY.bsd_matches.key
     && TEAM_STAT_BY_KEY.played.src !== TEAM_STAT_BY_KEY.bsd_matches.src,
     `${TEAM_STAT_BY_KEY.played.src} / ${TEAM_STAT_BY_KEY.bsd_matches.src}`);

  const check = (label, rs) => {
    let n = 0, bad = [];
    for (const r of rs) for (const [tot, pg, den] of PAIRS) {
      const T = TEAM_STAT_BY_KEY[tot].get(r), P = TEAM_STAT_BY_KEY[pg].get(r),
            D = TEAM_STAT_BY_KEY[den].get(r);
      if (T == null || P == null || !D) continue;
      n++;
      /* Vikmorkin eru NAMUNDUNIN EIN: samtalan er a 1 aukastaf og per-leik
         a 2, svo mesta rétta fravikid er 0,05/D + 0,005.                */
      if (Math.abs(T / D - P) > 0.05 / D + 0.006) bad.push(`${r.short} ${tot}: ${T}/${D}=${(T/D).toFixed(3)} != ${P}`);
    }
    ok(`${label}: ${n - bad.length}/${n} samtolur deilast rett i per-leik toluna`,
       n > 0 && bad.length === 0, bad.slice(0, 3).join(" · "));
    return n;
  };
  check("heilt timabil", rows14);

  /* I BILI — thad er thad sem beidnin snerist um. Tvo olik bil, svo
     "stemmir" geti ekki thytt "stemmir einu sinni".                     */
  const shotIndex = buildShotIndexLikeApp(existsSync(D + "bsd_shots.json") ? J("bsd_shots.json") : null);
  const fixtures = J("fixtures.json");
  if (shotIndex) {
    const use = teamRangeUse({ base: rows14, shotIndex, fixtures });
    for (const range of [[26, 38], [1, 19]]) {
      const rr = applyTeamRange(rows14, { range, shotIndex, fixtures, use });
      check(`GW${range[0]}-${range[1]}`, rr);
      /* OG SAMTALAN VERDUR AD MINNKA I MINNA BILI — annars er hun arstidar-
         talan sem hreyfist ekki, sem er einmitt villan sem `TEAM_RANGE_SRC`
         ver gegn (sja kafla 13).                                        */
      const full = rows14.find(r => r.short === "ARS"), part = rr.find(r => r.short === "ARS");
      ok(`GW${range[0]}-${range[1]}: samtalan er MINNI en arstidin (ARS xGC `
         + `${part?.xgc} < ${full?.xgc})`,
         part?.xgc != null && full?.xgc != null && part.xgc < full.xgc);
    }
  } else {
    ok("bils-hlutinn sefur: `bsd_shots.json` vantar", true);
  }

  /* NYLIDAR: `luck.json` ber CHAMPIONSHIP-tolur theirra (COV 97 mork a 46
     leikjum). Samtolu-dalkarnir mega ALDREI birta thaer — rett tala um
     ranga deild. Thetta fannst thegar dalkarnir voru settir inn.        */
  const promo = rows14.filter(r => TEAM_STAT_BY_KEY.goals_pg.get(r) == null);
  ok(`nylidarnir (${promo.map(r => r.short).join(", ")}) hafa enga PL-sogu (forsenda)`,
     promo.length === 3, `${promo.length}`);
  const leaked = promo.filter(r => ["goals", "conceded", "played"]
    .some(k => TEAM_STAT_BY_KEY[k].get(r) != null));
  ok("og bera ENGA samtolu — Championship-tolur mega ekki laumast inn",
     leaked.length === 0,
     leaked.map(r => `${r.short}: goals=${r.goals} played=${r.played}`).join(" · "));
}

/* ============================================================
   15. YFIRSTANDANDI TIMABIL UR LEIKJASKRANNI (`buildLiveTeamForm`)

   Toflan las adeins `team_form.json` (fyrra timabil) thvi E0-skra 2026/27
   verdur ekki til fyrr en timabilid er komid af stad. Heimildin sem ER til
   er `fixtures.json` sjalf.

   AF HVERJU TILBUIN GOGN OG EKKI BARA RAUNSKRAIN: kjarna-tilfellid er
   leikur SEM ER I GANGI — bædi skor til stadar en leikurinn ekki buinn.
   Thad astand er ekki i `data/` i dag (leikirnir sex eru allir
   `finished_provisional: true, minutes: 90`), svo stokkbreyting sem taldi
   oleikna leiki med SLAPP I GEGN a raungogunum einum: oleiknir leikir bera
   `null` skor og fellu ut hvort sem er. Her er svarid thekkt fyrirfram.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("15. YFIRSTANDANDI TIMABIL — leikur I GANGI telst ekki med");
console.log("─".repeat(84));
{
  const T = [{ id: 1, short: "AAA" }, { id: 2, short: "BBB" }, { id: 3, short: "CCC" }];
  const F = [
    /* buinn: telst med */
    { event: 1, team_h: 1, team_a: 2, team_h_score: 3, team_a_score: 0,
      finished: false, finished_provisional: true, minutes: 90 },
    /* I GANGI: skor til stadar EN leikurinn ekki buinn -> ma EKKI teljast */
    { event: 1, team_h: 3, team_a: 1, team_h_score: 1, team_a_score: 1,
      finished: false, finished_provisional: false, started: true, minutes: 55 },
    /* obyrjadur: engin skor */
    { event: 2, team_h: 2, team_a: 3, team_h_score: null, team_a_score: null,
      finished: false, finished_provisional: false, started: false, minutes: 0 },
  ];
  const tf = buildLiveTeamForm({ fixtures: F, teams: T, season: "2026-27" });
  ok(`adeins BUNI leikurinn er talinn (${tf.matches_counted})`, tf.matches_counted === 1);
  const by = Object.fromEntries(tf.teams.map(t => [t.short, t]));
  ok(`AAA: 1 leikur, 3 mork, 0 a sig, CS 100% `
     + `(${by.AAA.matches}/${by.AAA.goals}/${by.AAA.conceded}/${by.AAA.clean_sheet_pct})`,
     by.AAA.matches === 1 && by.AAA.goals === 3 && by.AAA.conceded === 0
     && by.AAA.clean_sheet_pct === 100);
  /* KJARNINN: CCC spiladi ADEINS leikinn sem er i gangi -> hann a ad standa
     eins og hann hafi ekki spilad, ekki bera 1-1.                        */
  ok(`CCC spiladi adeins leikinn sem er I GANGI -> 0 leikir, engar `
     + `hlutfallstolur (${by.CCC.matches}, goals_pg ${by.CCC.goals_pg})`,
     by.CCC.matches === 0 && by.CCC.goals_pg === undefined);
  /* Og BBB tapadi 0-3: mork a sig 3, ekkert hreint blad.                */
  ok(`BBB: 0 mork, 3 a sig, CS 0% (${by.BBB.goals}/${by.BBB.conceded}/${by.BBB.clean_sheet_pct})`,
     by.BBB.goals === 0 && by.BBB.conceded === 3 && by.BBB.clean_sheet_pct === 0);

  /* SVID SEM `fixtures.json` BER EKKI MEGA ALDREI VERDA TIL. Stokkbreyting
     sem setti `shots_pg: 0` i lifandi rodina slapp i gegn i fyrstu
     utgafu — hun var adeins profud a xGC (BSD-hlidin), sem var tomt hvort
     sem er. Her er E0-hlidin fullyrt beinum ordum.                       */
  const FORBIDDEN = ["shots_pg", "sot_pg", "shots_against_pg", "sot_against_pg",
                     "corners_pg", "fouls_pg", "yellows_pg", "conversion"];
  const leaked = FORBIDDEN.filter(k => by.AAA[k] !== undefined);
  ok(`engin skot-/spjalda-svid i lifandi rod — `+"`fixtures.json`"+` ber thau ekki `
     + `(${leaked.join(",") || "engin"})`, leaked.length === 0);

  /* ENGINN BUINN LEIKUR -> ENGIN TAFLA. Skra full af nullum vaeri verri en
     engin: hun laeti eins og hvert lid hefdi spilad og skorad ekkert.    */
  ok("enginn buinn leikur -> `null`, ekki tafla af nullum",
     buildLiveTeamForm({ fixtures: [F[1], F[2]], teams: T }) === null);
  ok("engin lid -> null", buildLiveTeamForm({ fixtures: F, teams: [] }) === null);
  ok("rusl-inntak fellur ekki", buildLiveTeamForm({}) === null
     && buildLiveTeamForm() === null);

  /* `finished: true` MA LIKA (thad er endanlega stadan) — an thess hyrfu
     tolurnar thegar umferdin er stadfest.                               */
  const fin = buildLiveTeamForm({ teams: T, fixtures: [{ event: 1, team_h: 1, team_a: 2,
    team_h_score: 2, team_a_score: 1, finished: true, finished_provisional: false }] });
  ok("`finished: true` telst lika buinn leikur", fin?.matches_counted === 1);
}

/* ============================================================
   16. ELDUR OG IS — MERKI SEM MA ALDREI VERDA AD TOLU (25.8.2026)

   Notandinn bad um form-tacn a lidum. I ThESSU REPO-I ER FORM SEM SPA
   MAELT OG FELLT (leikmanns-form er afturhvarf -4,52pp; hrein blod radast
   ekki i runur, lyfting 0,99; `PREV_K` endurmaeld 24.8. an thess ad neitt K
   slaegi K=10), svo merkid ma ADEINS lysa. Fordaemid er Evropu-stjarnan:
   synt sem samhengi, fer hvergi inn i likanid.

   KAFLINN VER FIMM ADSKILDAR AKVARDANIR, og hver theirra var stokkbreytt:
     A. EINANGRUNIN — engin onnur skra en `Teams.jsx` ma flytja fallid inn,
        og hvorki `model.js`, `market.js`, `advisor.js` ne `rotation.js`
        mega nefna thad. Vaeri thad brotid vaeri felld maeling komin aftur
        inn um bakdyrnar.
     B. URTAKS-GATTIN — undir ThREMUR leikjum i glugga er ekkert merki.
     C. SEXTILL, EKKI ThROSKULDUR — fjoldinn er `floor(n/6)` i BADA enda.
     D. EIN HEIMILD FYRIR BADA HELMINGA — sama fall, tvo bil.
     E. FLOT DREIFING FAER ENGIN MERKI — jofn lid mega ekki fa baedi eld
        og is.
   TILBUIN GOGN ThAR SEM SVARID ER ThEKKT FYRIRFRAM, svo kaflinn se ohadur
   thvi hvad `data/` ber i dag — og RAUNGOGNIN VID HLIDINA, thvi thau bera
   astandid sem notandinn ser.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("16. FORM-MERKID — LYSING, ALDREI TALA");
console.log("─".repeat(84));
{
  /* ---- A. EINANGRUNIN. Lesid UR UPPRUNANUM: hver skra i `src/` sem
     nefnir fallid. Textaleit ein vaeri veik, svo krafan er TVISKIPT —
     `Teams.jsx` VERDUR ad nefna thad (annars er merkid ekki teiknad og
     allt hitt her er thogult) og enginn annar ma gera thad.            */
  const SRC = new URL("../src/", import.meta.url).pathname;
  const files = readdirSync(SRC).filter(f => /\.jsx?$/.test(f));
  const users = files.filter(f => f !== "teamstats.js"
    && /teamFormFlags/.test(readFileSync(SRC + f, "utf8")));
  ok(`\`Teams.jsx\` teiknar merkid (forsenda: ${users.join(",") || "ENGINN"})`,
     users.includes("Teams.jsx"));
  ok("og ENGIN onnur skra i `src/` les fallid — likanid kemst ekki i thad",
     users.length === 1, users.join(","));
  /* OG HIN ATTIN: skrarnar sem BERA likanid mega ekki nefna hvorki fallid
     ne fastana. `model.js` reiknar `fixDifficulty`/`expPointsFor`,
     `market.js` markadsthyngdina, `advisor.js` kaup-prosentuna og
     `rotation.js` roterings-parid.                                     */
  for (const f of ["model.js", "market.js", "advisor.js", "rotation.js", "stats.js"]) {
    const t = readFileSync(SRC + f, "utf8");
    ok(`${f} nefnir hvorki \`teamFormFlags\` ne \`FORM_WINDOW_GW\``,
       !/teamFormFlags|FORM_WINDOW_GW|FORM_MIN_MATCHES/.test(t));
  }

  /* ---- TILBUINN HEIMUR. Tolf lid, tiu umferdir, og markamunurinn er
     STYRDUR: lid 1-2 batna i glugganum (GW5-10), lid 11-12 hrapa, hin
     atta eru obreytt. Svarid er thvi thekkt adur en fallid er kallad.  */
  const N_TEAMS = 12, N_GW = 10;
  const rowsOf = ids => ids.map(id => ({ id, short: `T${id}` }));
  const IDS = Array.from({ length: N_TEAMS }, (_, i) => i + 1);
  const rows = rowsOf(IDS);
  /* Hvert lid spilar EINN leik i hverri umferd, gegn tilbunu "mothverfi"
     sem er ekki i `rows` — thannig er markamunur hvers lids algerlega
     stydanlegur og ekkert lid haefir ahrif a annad.                     */
  const mkFix = score => {
    const out = [];
    let id = 1;
    for (let gw = 1; gw <= N_GW; gw++)
      for (const t of IDS) {
        const gf = score(t, gw);
        out.push({ id: id++, event: gw, finished: true,
          team_h: t, team_a: 900 + t, team_h_score: gf, team_a_score: 0 });
      }
    return out;
  };
  /* Grunn-markamunur 1 alls stadar; i glugganum (GW >= 5) skora tvo efstu
     THRJU og tvo nedstu NULL. Fjarlaegdin fra medaltali er thvi:
       lid 1-2  +2 ; lid 11-12 -1 ; hin 0.                              */
  const fixtures = mkFix((t, gw) => (gw >= 5 ? (t <= 2 ? 3 : t >= 11 ? 0 : 1) : 1));
  const use = { results: "fixtures", shots: false, maxGw: N_GW };
  const flagged = teamFormFlags({ rows, fixtures, use, range: null });
  const kindOf = id => flagged.flags.get(id) || null;
  ok(`forsenda: glugginn er sidustu ${FORM_WINDOW_GW} umferdirnar `
     + `(${JSON.stringify(flagged.window)}) og grunnurinn allt bilid `
     + `(${JSON.stringify(flagged.baseRange)})`,
     flagged.window?.[0] === N_GW - FORM_WINDOW_GW + 1 && flagged.window?.[1] === N_GW
     && flagged.baseRange?.[0] === 1 && flagged.baseRange?.[1] === N_GW);
  /* ---- C. SEXTILL: 12 lid -> nakvaemlega TVO i hvorn enda.           */
  ok(`sextill af ${N_TEAMS} lidum er ${Math.floor(N_TEAMS / 6)} i hvorn enda `
     + `(faekk ${[...flagged.flags.values()].filter(v => v === "hot").length} eld / `
     + `${[...flagged.flags.values()].filter(v => v === "cold").length} is)`,
     flagged.sextile === Math.floor(N_TEAMS / 6)
     && [...flagged.flags.values()].filter(v => v === "hot").length === 2
     && [...flagged.flags.values()].filter(v => v === "cold").length === 2);
  ok("og thad eru RETTU lidin: 1-2 fa eld, 11-12 fa is",
     kindOf(1) === "hot" && kindOf(2) === "hot"
     && kindOf(11) === "cold" && kindOf(12) === "cold",
     [...flagged.flags].map(([k, v]) => `${k}:${v}`).join(","));
  ok("og lidin i midjunni fa EKKERT — hvorki eld ne is",
     IDS.slice(2, 10).every(id => kindOf(id) == null),
     IDS.slice(2, 10).filter(id => kindOf(id) != null).join(","));

  /* ---- E. FLOT DREIFING: enginn munur -> ENGIN merki. Stokkbreyting sem
     sleppti `hiCut > loCut` gaf ollum tolf lidunum merki.              */
  const flat = teamFormFlags({ rows, fixtures: mkFix(() => 1), use, range: null });
  ok("FLOT dreifing (allir eins) faer ENGIN merki, ekki tolf",
     flat.flags.size === 0, `${flat.flags.size} merki`);

  /* ---- B. URTAKS-GATTIN. Lid 1 spilar ADEINS tvo leiki i glugganum og
     ma thvi ekki fa merki thott hann se langbestur i theim. Gattin er
     PROFUD SEM DELTA: sama lid med ThRIDJA leikinn FAER merkid.        */
  const gate = nInWindow => {
    const fx = mkFix((t, gw) => (gw >= 5 ? (t <= 2 ? 3 : t >= 11 ? 0 : 1) : 1))
      .filter(f => !(f.team_h === 1 && f.event >= 5
                     && f.event < N_GW - nInWindow + 1));
    return teamFormFlags({ rows, fixtures: fx, use, range: null });
  };
  const g2 = gate(2), g3 = gate(3);
  ok(`forsenda: golfid er ${FORM_MIN_MATCHES} leikir`, FORM_MIN_MATCHES === 3);
  ok("TVEIR leikir i glugga -> EKKERT merki (urtaks-gattin)",
     g2.flags.get(1) == null, String(g2.flags.get(1)));
  ok("ThRIR leikir i glugga -> merkid kviknar (sama lid, sami munur)",
     g3.flags.get(1) === "hot", String(g3.flags.get(1)));

  /* ---- D. EIN HEIMILD FYRIR BADA HELMINGA. Se urslita-leidin EKKI i
     takt (`use.results` null) faest ekkert merki — thad er sama gatt og
     umferdar-valarinn les, og hun er thad sem kemur i veg fyrir ad
     glugginn se talinn ur einni skra og grunnurinn ur annarri.        */
  ok("engin per-umferdar urslita-heimild i takt -> ENGIN merki",
     teamFormFlags({ rows, fixtures, use: { results: null, shots: true } }).flags.size === 0);
  ok("og rusl-inntak fellur ekki", teamFormFlags().flags.size === 0
     && teamFormFlags({ rows: null, use: { results: "fixtures" } }).flags.size === 0);

  /* GLUGGI SEM ER ALLT BILID GEFUR ENGA MAELINGU — mismunurinn er null hja
     ollum med byggingu. Thetta er einmitt astandid i dag (ein umferd
     spilud) og svarid a ad vera ThOGN, ekki tolf jofn merki.           */
  const oneGw = teamFormFlags({ rows,
    fixtures: fixtures.filter(f => f.event === 1), use, range: null });
  ok("EIN umferd spilud -> glugginn er allt bilid -> ENGIN merki",
     oneGw.flags.size === 0 && oneGw.window === null);

  /* ---- RAUNGOGNIN VID HLIDINA. I dag er ein umferd spilud, svo merkid er
     SLOKKT A OLLUM TUTTUGU LIDUM — og thad er RETT utkoma, ekki bilun.
     Fullyrdingin er thvi um GATTINA sjalfa, ekki um ad tacn birtist.   */
  {
    const teamsJ = J("teams.json"), fxJ = J("fixtures.json");
    const lf = buildLiveTeamForm({ fixtures: fxJ, teams: teamsJ.teams || teamsJ,
      season: "live" });
    const liveRows = buildTeamRows({ teams: teamsJ, teamForm: lf, luck: null,
      teamShots: null });
    const liveUse = teamRangeUse({ base: liveRows, shotIndex: null, fixtures: fxJ });
    const played = Math.max(0, ...(lf?.teams || []).map(t => Number(t.matches) || 0));
    const liveFlags = teamFormFlags({ rows: liveRows, fixtures: fxJ, use: liveUse });
    /* POSITIVAR FORSENDUR FYRST — an theirra vaeri "engin merki" satt af
       tomri toflu eda af thvi ad heimildin er ur takti, sem eru ALLT ADRAR
       astaedur en gattin (CLAUDE.md 5b).                                */
    ok(`raungogn: ${liveRows.length} lid og urslita-heimildin ER i takt `
       + `(${liveUse.results}), mest ${played} leikir per lid`,
       liveRows.length === 20 && !!liveUse.results && played >= 1,
       `${liveRows.length} / ${liveUse.results} / ${played}`);
    /* VORDURINN SEFUR I DAG OG SEGIR ThAD — en hann fullyrdir i BADUM
       astondum, svo "sefur" getur ekki ordid "maelir ekkert" thegjandi.  */
    if (played >= FORM_MIN_MATCHES + FORM_WINDOW_GW) {
      const k = liveFlags.sextile;
      ok(`nog spilad (${played}) -> merkin eru VIRK og bera nakvaemlega `
         + `sextil i hvorn enda (${k})`,
         k > 0 && [...liveFlags.flags.values()].filter(v => v === "hot").length >= k
              && [...liveFlags.flags.values()].filter(v => v === "cold").length >= k,
         `${liveFlags.flags.size} merki`);
    } else {
      ok(`of fatt spilad (${played} < ${FORM_MIN_MATCHES + FORM_WINDOW_GW}) -> merkid er `
         + `slokkt a ollum ${liveRows.length} lidunum — RETT utkoma, ekki bilun `
         + `(${liveFlags.flags.size} merki, gluggi ${JSON.stringify(liveFlags.window)})`,
         liveFlags.flags.size === 0 && liveFlags.window === null);
    }
    /* OG HIN ATTIN A RAUNGOGNUM: fyrra timabil (skotakortid) er FULLT
       timabil, svo thar VERDA merkin ad kvikna. An hennar vaeri "slokkt"
       satt um bilad fall lika.                                          */
    const sfR = J("bsd_shots.json");
    const FxR = Object.fromEntries(sfR.legend.fields.map((f, i) => [f, i]));
    const btR = new Map(), boR = new Map();
    const putR = (m, k2, v) => { if (k2 == null) return;
      const arr = m.get(k2); arr ? arr.push(v) : m.set(k2, [v]); };
    for (const x of sfR.shots) { putR(btR, x[FxR.team], x); putR(boR, x[FxR.opp], x); }
    const idxR = { byTeam: btR, byOpp: boR, teams: sfR.legend.teams, fields: FxR };
    const prevRows = buildTeamRows({ teams: teamsJ, teamForm: J("team_form.json"),
      luck: J("luck.json"), teamShots: J("team_shots.json"), bsdTeams: J("bsd_teams.json") });
    const prevUse = teamRangeUse({ base: prevRows, shotIndex: idxR, fixtures: fxJ });
    const prevFlags = teamFormFlags({ rows: prevRows, shotIndex: idxR, fixtures: fxJ,
      use: prevUse });
    ok(`fyrra timabil: skotakortid er i takt (shots=${prevUse.shots}, `
       + `results=${prevUse.results}) — forsenda`, prevUse.shots === true);
    const hotN = [...prevFlags.flags.values()].filter(v => v === "hot").length;
    const coldN = [...prevFlags.flags.values()].filter(v => v === "cold").length;
    ok(`og ThAR kvikna merkin: ${hotN} eldur / ${coldN} is af ${prevFlags.eligible} `
       + `gjaldgengum, sextill ${prevFlags.sextile}, gluggi `
       + `GW ${prevFlags.window?.[0]}-${prevFlags.window?.[1]}`,
       prevFlags.sextile === Math.floor(prevFlags.eligible / 6)
       && prevFlags.sextile > 0 && hotN >= prevFlags.sextile && coldN >= prevFlags.sextile
       && prevFlags.window?.[1] - prevFlags.window?.[0] + 1 === FORM_WINDOW_GW);
    /* OG ENGINN FAER BADI: mengin tvo mega ekki skarast.                */
    ok("og ekkert lid ber baedi eld og is", hotN + coldN === prevFlags.flags.size);
  }
}

console.log(`\nLIDA-TOLUR: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
