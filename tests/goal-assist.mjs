/* ============================================================
   goal-assist.mjs — PORUNIN mark<->assist

   HVERS VEGNA ThETTA SAFN ER TIL: fullyrdingin sem thad ver var
   AFSONNUD, ekki studd. Fram til 25.8.2026 sagdi `App.jsx` — og tvo
   handover-skjol — ad porunin vaeri "EKKI I NEINNI HEIMILD SEM VID
   HOFUM". Su maeling skodadi ThRJAR FPL-heimildir og var RETT um thaer;
   hun var svo ALHAEFD yfir i "enga heimild", og
   `data/last_gw_shots.json` — sem appid saekir ThEGAR — ber `assist_by`
   a hverju skoti.

   Safnid ver thvi tvennt i einu:
     (a) ad porunin se birt og RETT,
     (b) ad hun se ekki birt thegar hun a EKKI vid (rangt timabil,
         rong umferd, vantandi skra) — thvi rong porun nefnir TVO menn
         og les eins og stadreynd.

   PROFSTEINNINN A TILBUNUM GOGNUM ER ASETTUR: svarid er thekkt
   fyrirfram, svo kaflarnir geta ekki "stadist" af thvi ad raungogn
   dagsins seu thaegileg. Kafli 5 keyrir a raungognum og er thvi
   VIDBOT, ekki grunnurinn.
   ============================================================ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { goalAssistsByFixture, assistPhrase } from "../src/goalassist.js";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
let nAsserts = 0;
const OK = (c, m) => { nAsserts++; ok(c, m); };

const J = (f) => JSON.parse(readFileSync(path.join(ROOT, "data", f), "utf8"));

/* ---------- TILBUNN HEIMUR, SVARID ThEKKT FYRIRFRAM ---------- */
const TEAMS = { 1: { id: 1, short: "AAA" }, 2: { id: 2, short: "BBB" }, 3: { id: 3, short: "CCC" } };
const FIXTURES = [{ id: 77, team_h: 1, team_a: 2 }, { id: 88, team_h: 3, team_a: 1 }];
const SHOTS = {
  season: "2026/27", gw: 1,
  fixtures: [{ fixture: 1, espn_event: "e1", h: "AAA", a: "BBB" },
             { fixture: 2, espn_event: "e2", h: "CCC", a: "AAA" }],
  shots: [
    /* MINUTURNAR ERU VALDAR SVO STRENGJA-ROD OG TOLU-ROD SEU OLIKAR.
       Fyrsta utgafa thessa safns notadi 5' og 90+2' — og bædi
       `localeCompare` OG tolu-rod gefa SOMU rod a theim ("5" < "9"),
       svo fullyrdingin um minutu-rod STOD AF stokkbreytingu sem skipti
       yfir i strengja-rod. Hun het eftir einhverju sem hun gat ekki
       greint (CLAUDE.md kafli 13). Med 9' og 10' skilja leidirnar:
       strengur gefur 10 A UNDAN 9, talan gefur 9 a undan 10.        */
    { fixture: 1, team: "AAA", player: "Late Man",  kind: "goal", minute: "90+2'", assist_by: "Setter" },
    { fixture: 1, team: "AAA", player: "Mid Man",   kind: "goal", minute: "10'",   assist_by: "Crosser" },
    { fixture: 1, team: "AAA", player: "Early Man", kind: "goal", minute: "9'",    assist_by: "Passer", assist_type: "pass" },
    { fixture: 1, team: "BBB", player: "Solo Man",  kind: "goal", minute: "60'",   assist_by: null },
    { fixture: 1, team: "AAA", player: "Miss Man",  kind: "off_target", minute: "70'", assist_by: "Nobody" },
    { fixture: 1, team: "BBB", player: "Own Man",   kind: "own_goal",   minute: "80'", assist_by: "Ghost" },
    { fixture: 2, team: "CCC", player: "Cross Man", kind: "goal", minute: "12'",
      assist_by: "Winger", assist_type: "cross", assist_context: "corner" },
  ],
};
const build = (over = {}) => goalAssistsByFixture({
  shotsFile: SHOTS, fixtures: FIXTURES, teamById: TEAMS, season: "2026/27", gw: 1, ...over });

console.log("\n1. porunin sjalf");
{
  const m = build();
  OK(m.size === 2, `badir leikir pörudust (${m.size})`);
  const f77 = m.get(77);
  OK(f77.h.length === 3, `heimalid i leik 77 fekk ThRJU mork (${f77.h.length})`);
  OK(f77.a.length === 1, `utilid fekk EITT (${f77.a.length})`);

  /* RODIN ER EFTIR MINUTU, OG "90+2" MA EKKI LENDA A UNDAN "5". */
  OK(f77.h.map(e => e.scorer).join(",") === "Early Man,Mid Man,Late Man",
    `rodin er eftir MINUTU-TOLU: 9' -> 10' -> 90+2' (${f77.h.map(e => e.minute).join(" ")})`);

  OK(f77.h[0].assist === "Passer", "rett assist a rettu marki");
  OK(f77.h[1].assist === "Crosser", "og a thvi naesta");
  OK(f77.h[2].assist === "Setter", "og a thvi sidasta — theim er ekki vixlad");

  /* HLIDIN: mark BBB ma ALDREI lenda hja AAA. */
  OK(f77.a[0].scorer === "Solo Man", "mark andstaedingsins lendir hja RETTU lidi");
}

console.log("\n2. thad sem ma ALDREI rata inn");
{
  const m = build();
  const all = [...m.values()].flatMap(v => [...v.h, ...v.a]);
  OK(!all.some(e => e.scorer === "Miss Man"),
    "skot sem er EKKI mark er ekki i porun (off_target sleppt)");
  OK(!all.some(e => e.scorer === "Own Man" || e.assist === "Ghost"),
    "SJALFSMARK fær engan assist — hvorki skorari ne gefandi rata inn");
}

console.log("\n3. VANTANDI ASSIST ER `null`, EKKI 'enginn assist'");
{
  const m = build();
  const solo = m.get(77).a[0];
  OK(solo.assist === null, "mark an `assist_by` ber `null`");
  OK(assistPhrase(solo) === null, "og `assistPhrase` skilar null, ekki tomu svigi");
  /* ThETTA ER FULLYRDINGIN SEM SKIPTIR MALI: 0 og "" og "none" vaeru
     OLL rangar birtingar. Sja CLAUDE.md kafli 8, "NULL ER EKKI NULL". */
  OK(solo.assist !== "" && solo.assist !== 0 && solo.assist !== "none",
    "og hun er hvorki tomur strengur, null-tala ne ordid 'none'");
}

console.log("\n4. HLIDIN — rong gogn mega ALDREI para");
{
  OK(build({ shotsFile: { ...SHOTS, season: "2025/26" } }).size === 0,
    "RANGT TIMABIL -> engin porun (Watkins-gildran: arkiv-skra i nyju timabili)");
  OK(build({ shotsFile: { ...SHOTS, gw: 38 } }).size === 0,
    "RONG UMFERD -> engin porun");
  OK(build({ shotsFile: null }).size === 0, "engin skra -> tomt kort, ekki hrun");
  OK(build({ shotsFile: { season: "2026/27", gw: 1 } }).size === 0,
    "skra an `shots` -> tomt kort");
  OK(build({ fixtures: [] }).size === 0, "engir leikir -> tomt kort");

  /* LID SEM TILHEYRIR HVORUGU LIDINU ma ekki giskast a hlid. */
  const stray = { ...SHOTS, shots: [{ fixture: 1, team: "ZZZ", player: "Stray", kind: "goal", minute: "1'" }] };
  const m = goalAssistsByFixture({ shotsFile: stray, fixtures: FIXTURES, teamById: TEAMS, season: "2026/27", gw: 1 });
  OK(!m.size || (!m.get(77)?.h.length && !m.get(77)?.a.length),
    "mark ur lidi sem er i hvorugu lidinu er SLEPPT, ekki sett a hlid");
}

console.log("\n5. RAUNGOGN — porunin verdur ad virka a thvi sem er i `data/`");
{
  const shots = J("last_gw_shots.json");
  const fxFile = J("fixtures.json");
  const fixtures = Array.isArray(fxFile) ? fxFile : fxFile.fixtures;
  const teams = J("teams.json").teams;
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));

  const espnGoals = (shots.shots || []).filter(s => s.kind === "goal");
  const m = goalAssistsByFixture({ shotsFile: shots, fixtures, teamById,
    season: shots.season, gw: shots.gw });

  const mapped = [...m.values()].flatMap(v => [...v.h, ...v.a]);

  /* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b). Vaeri porunin
     brotin — rong lykill, rong lids-vorpun — yrdi `mapped` TOMT og
     kaflarnir 1-4 (tilbunir) vaeru afram graenir. */
  OK(espnGoals.length > 0, `ESPN-skrain ber mork (${espnGoals.length})`);
  OK(mapped.length === espnGoals.length,
    `OLL mork rotudust vid FPL-leik (${mapped.length}/${espnGoals.length})`);

  const withA = mapped.filter(e => e.assist);
  OK(withA.length > 0, `og assist fylgir their sem eiga hann (${withA.length})`);
  OK(withA.length < mapped.length,
    `og their sem eiga engan bera null (${mapped.length - withA.length}) — ` +
    "ef ALLIR baeru assist vaeri thad merki um ad tomt vaeri fyllt");

  /* Enginn tomur skorari — hann er thad sem linan er byggd a. */
  OK(mapped.every(e => e.scorer), "hvert porad mark ber NAFN skorara");
}

console.log("\n6. TENGINGIN — App.jsx verdur ad KALLA hana");
{
  /* Hreint fall getur verid fullkomlega profad og ALDREI KALLAD; thad
     er nakvaemlega gatid sem `wiring.mjs` er til fyrir i nfl/, og sama
     aett og dauði markadslidurinn i CLAUDE.md kafla 3. */
  const app = readFileSync(path.join(ROOT, "src", "App.jsx"), "utf8");
  OK(/from\s+["']\.\/goalassist\.js["']/.test(app), "`App.jsx` flytur inn `goalassist.js`");
  OK(/goalAssistsByFixture\s*\(/.test(app), "og KALLAR `goalAssistsByFixture(`");
  OK(/goalAssists=\{goalAssists\}/.test(app), "og sendir kortid inn i `GwFixtureList`");

  /* OG GAMLA FULLYRDINGIN MA EKKI KOMA AFTUR. Hun var rong og hun var
     ASTAEDAN fyrir thvi ad enginn leitadi lengra i thrja daga. */
  OK(!/EKKI I NEINNI HEIMILD SEM VID HOFUM/.test(app),
    "og fullyrdingin 'ekki i neinni heimild' er FARIN ur skranni");
}

/* GOLF: safn sem keyrir ekkert er ekki graent safn (CLAUDE.md 5b, og
   `clock-states.mjs`-draugurinn 25.8.). */
ok(nAsserts >= 20, `${nAsserts} fullyrdingar keyrdu (golf 20)`);

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
