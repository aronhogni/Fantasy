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
    "conceded_minus_xgc", "fouls_pg", "yellows_pg"];
  const HIGHER_BETTER = ["long_against_pg", "long_share", "cs_pct", "goals_pg",
    "xg_pg", "shots_pg", "sot_pg", "box_pg", "close_pg", "conversion",
    "goals_minus_xg", "corners_pg"];
  const bad = [];
  for (const k of LOWER_BETTER) if (TEAM_STAT_BY_KEY[k]?.hi !== false) bad.push(`${k} aetti ad vera hi:false`);
  for (const k of HIGHER_BETTER) if (TEAM_STAT_BY_KEY[k]?.hi !== true) bad.push(`${k} aetti ad vera hi:true`);
  ok("hver dalkur ber retta att", bad.length === 0, bad.slice(0, 3).join(" · "));
  ok("allir 22 dalkar eru i attar-listunum",
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
  /* xGC ER OFULLKOMID OG VERDUR AD VERA MERKT SEM SLIKT — annars les
     notandinn absolut tolu sem er kerfisbundid ~19% of lag.           */
  ok("xGC og xG bera `incomplete`-flaggid",
    ["xgc_pg", "xg_pg", "goals_minus_xg", "conceded_minus_xgc"]
      .every(k => TEAM_STAT_BY_KEY[k].incomplete === true));
  ok("og skyring theirra segir fra undirtalningunni",
    ["xgc_pg", "xg_pg"].every(k => /19%|short|missing/i.test(TEAM_STAT_BY_KEY[k].note)));
}

/* ---------- 6. BIG CHANCES ERU EKKI HER ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("6. VORDUR — 'big chances' ma ALDREI birtast sem maeld tala");
console.log("─".repeat(84));
{
  /* Their krefjast xG PER SKOT og engin naanleg heimild gefur hana. Se
     einhver seinna kominn med dalk sem heitir thad, er hann OKKAR likan
     sem litur ut eins og maeling — nakvaemlega thad sem CLAUDE.md 6b og
     6e banna. Naerfaeri MA heita naerfaeri og ekkert annad.             */
  const named = TEAM_STAT_DEFS.filter(d => /big chance/i.test(`${d.label} ${d.short}`));
  ok("enginn dalkur heitir 'big chance'", named.length === 0,
    named.map(d => d.key).join(","));
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

console.log(`\nLIDA-TOLUR: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
