/* ============================================================
   sleeper-league.mjs — DEILDIN LESIN UR SLEEPER.

   Vorpunin er HREIN (`src/sleeper-league.js`), svo thetta prof keyrir
   NAKVAEMLEGA thad sem appid notar — ekki afrit af thvi. Thad er
   forsendan fyrir thvi ad profid se marktaekt.

   ============================================================
   FASTAR ERU RAUNVERULEGT SVAR, EKKI TILBUID
   ============================================================
   `LEAGUE` og `DRAFT` hedan eru svar Sleeper fyrir deild
   1389356308104249344, sott 12.8.2026. Thad er asett: tilbuid svar
   sannar adeins ad vorpunin vinni a thvi sem VID hugsudum okkur, en
   baðar gildrurnar sem thetta prof ver fundust EINGONGU thvi
   raunverulegt svar var skodad:

     1. `league.settings.draft_rounds` er **3** thar sem draftid ber
        **15**. Hefdum vid lesid deildina hefdi radgjofin talid thrjar
        umferdir eftir og aldrei sagt ther ad taka spyrnumann ne vorn.
     2. `draft.draft_order` er **null** — Sleeper dregur rodina eftir a
        — svo saetid VERDUR ad koma ur `slot_to_roster_id`. Prof sem
        hermdi bara `draft_order` hefdi verid graent og tengingin
        half.

   Thess vegna eru bædi svidin profud BEINT og med badar attir: rett
   gildi OG thad ranga sem stod til boda.
   ============================================================ */

import {
  parseSleeperInput, startersFromRoster, scoringFromSettings,
  maxPosFor, unmeasuredShape, teamsFromLeague, leagueFromSleeper,
} from "../src/sleeper-league.js";
import { DEFAULT_LEAGUE } from "../src/build.js";
import { readFileSync } from "node:fs";
import path from "node:path";

const DATA = path.join(path.resolve(new URL(".", import.meta.url).pathname, ".."), "data");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

/* ---------- raunverulegt svar, snyrt ad theim svidum sem vorpunin les ---------- */
const LEAGUE = {
  league_id: "1389356308104249344",
  draft_id: "1389356308125192192",
  previous_league_id: "1257117602308689920",
  name: "Patriots SB champs",
  season: "2026",
  status: "pre_draft",
  total_rosters: 10,
  roster_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF",
                     "BN", "BN", "BN", "BN", "BN"],
  settings: { num_teams: 10, draft_rounds: 3, max_keepers: 1, best_ball: 0,
              playoff_teams: 6, reserve_slots: 1 },
  scoring_settings: { rec: 1, pass_yd: 0.04, pass_td: 4, pass_int: -1, rush_yd: 0.1,
                      rush_td: 6, rec_yd: 0.1, rec_td: 6, fum_lost: -2 },
};

const DRAFT = {
  draft_id: "1389356308125192192",
  league_id: "1389356308104249344",
  status: "pre_draft",
  type: "snake",
  season: "2026",
  draft_order: null,
  slot_to_roster_id: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 },
  metadata: { name: "Patriots SB champs", scoring_type: "ppr" },
  settings: { rounds: 15, teams: 10, slots_qb: 1, slots_rb: 2, slots_wr: 2, slots_te: 1,
              slots_flex: 2, slots_k: 1, slots_def: 1, slots_bn: 5 },
};

const USERS = [
  { user_id: "868216551042633728", display_name: "SteindorB" },
  { user_id: "388485536370724864", display_name: "mattitim" },
  { user_id: "997220149830778880", display_name: "The Kopavogs Monkeys",
    metadata: { team_name: "The Kopavogs Monkeys" } },
];
const ROSTERS = [
  { roster_id: 1, owner_id: "868216551042633728" },
  { roster_id: 7, owner_id: "388485536370724864" },
  { roster_id: 8, owner_id: "997220149830778880" },
];

const shapes = JSON.parse(readFileSync(path.join(DATA, "shapes_sleeper.json"), "utf8"));

/* ============================================================
   1. SLODIN — DEILDARSLOD MA EKKI LESAST SEM DRAFT-SLOD
   ============================================================
   Gamla `extractDraftId` tok FYRSTA 6+ stafa tolustrenginn og kalladi
   hann draft-id. A deildarslod gaf thad DEILDAR-id sem draft-id, svo
   `/draft/{leagueId}` skiladi 404 og notandinn sa "Draft fannst ekki"
   fyrir slod sem var alveg rett. Tegundin verdur ad radast af
   SLODINNI.

   Fullyrdingarnar eru TVIHLIDA: rett tegund OG ekki su ranga. Ein
   fullyrding um `id` eina vaeri sonn thott tegundin vaeri rong — og
   thad var nakvaemlega villan.                                       */
console.log("\n1. slodin -> tegund + audkenni");
{
  const cases = [
    ["https://sleeper.com/leagues/1389356308104249344/predraft", "league", "1389356308104249344"],
    ["https://sleeper.com/leagues/1389356308104249344", "league", "1389356308104249344"],
    ["https://sleeper.app/leagues/1389356308104249344/team", "league", "1389356308104249344"],
    ["https://sleeper.com/league/1389356308104249344", "league", "1389356308104249344"],
    ["https://sleeper.com/draft/nfl/1389356308125192192", "draft", "1389356308125192192"],
    ["https://sleeper.com/draft/1389356308125192192", "draft", "1389356308125192192"],
    ["1389356308104249344", "id", "1389356308104249344"],
    ["  1389356308104249344  ", "id", "1389356308104249344"],
  ];
  for (const [input, kind, id] of cases) {
    const r = parseSleeperInput(input);
    ok(r.kind === kind && r.id === id,
      `${kind.padEnd(6)} ${id} <- ${input.trim().slice(0, 52)}`);
  }
  /* Deildarslod MA EKKI verda draft — thetta er villan sjalf. */
  ok(parseSleeperInput("https://sleeper.com/leagues/1389356308104249344/predraft").kind !== "draft",
    "deildarslod er EKKI flokkud sem draft (gamla villan)");
  /* Og ekkert nothaeft ma ekki skila audkenni. */
  for (const junk of ["", "   ", "not a link", null, undefined, {}]) {
    const r = parseSleeperInput(junk);
    ok(r.kind === null && r.id === null, `rusl gefur ekkert audkenni: ${JSON.stringify(junk)}`);
  }
}

/* ============================================================
   2. BEKKUR ER EKKI BYRJUNARSAETI
   ============================================================
   `roster_positions` ber 15 stok, thar af 5 `BN`. Vaeri bekkurinn
   talinn med taeldi `starters` 15 saeti i 10-lida deild og
   `replacementRanks` (`model.js`) margfaldar saetafjoldann med
   lidafjoldanum — svo varamanns-threpid faeri 50% ut i hafsauga og
   HVER VBD-tala vaeri rong.

   Fullyrdingin er a SUMMUNNI, ekki bara a einum lykli: `starters.BN`
   vaeri `undefined` hvort sem bekkurinn hefdi lekid inn i `RB` eda
   ekki.                                                              */
console.log("\n2. byrjunarsaetin ur roster_positions");
{
  const rp = startersFromRoster(LEAGUE.roster_positions);
  const sum = Object.values(rp.starters).reduce((a, b) => a + b, 0);
  ok(sum === 10, `10 byrjunarsaeti talin, ekki 15 (fann ${sum})`);
  ok(rp.bench === 5, `5 a bekk, talin ser (fann ${rp.bench})`);
  ok(!("BN" in rp.starters), "`BN` er ekki lykill i starters");
  ok(rp.starters.QB === 1 && rp.starters.RB === 2 && rp.starters.WR === 2 &&
     rp.starters.TE === 1 && rp.starters.FLEX === 2 && rp.starters.K === 1 &&
     rp.starters.DST === 1,
    `QB1 RB2 WR2 TE1 FLEX2 K1 DST1 (fann ${JSON.stringify(rp.starters)})`);
  ok(rp.superflex === false, "engin superflex i thessari deild");
  ok(String(rp.flexPos) === "RB,WR,TE", `flex tekur RB/WR/TE (${rp.flexPos})`);

  /* `DEF` er `DST` hja oss. Vaeri thad ekki varpad faeri vornin i
     `unknown` og deildin hefdi ekkert varnarsaeti. */
  ok(rp.unknown.length === 0, `engin othekkt saeti (${rp.unknown.join(",")})`);

  /* Superflex — badar attir, annars getur fullyrdingin ekki brugdist. */
  const sf = startersFromRoster(["QB", "RB", "RB", "WR", "WR", "TE", "SUPER_FLEX", "BN"]);
  ok(sf.superflex === true && sf.starters.SUPERFLEX === 1,
    "SUPER_FLEX gefur superflex-deild");
  ok(!sf.starters.FLEX, "og SUPER_FLEX er EKKI talid sem venjulegt FLEX");

  /* IDP er ekki stutt og thad verdur ad SEGJAST, ekki hverfa. */
  const idp = startersFromRoster(["QB", "RB", "WR", "DL", "LB", "LB", "DB", "BN"]);
  ok(idp.idp === 4, `4 IDP-saeti talin (fann ${idp.idp})`);

  /* Blandad flex — sammengi OG flagg. */
  const mix = startersFromRoster(["QB", "FLEX", "REC_FLEX", "BN"]);
  ok(mix.mixedFlex === true, "blandad flex er flaggad");
  ok(mix.starters.FLEX === 2 && mix.flexPos.length === 3,
    `bædi saetin talin, sammengi RB/WR/TE (${mix.flexPos})`);

  /* Tomt/rusl ma ekki hrynja ne skila rusli. */
  for (const junk of [null, undefined, "QB", 42, {}]) {
    const r = startersFromRoster(junk);
    ok(Object.keys(r.starters).length === 0, `rusl gefur engin saeti: ${JSON.stringify(junk)}`);
  }
}

/* ============================================================
   3. STIGAGJOFIN — NALGUN MA ALDREI LESAST SEM VISSA
   ============================================================
   Appid ber THRJAR stigagjafir thvi spain og ADP eru sott i
   nakvaemlega theim thremur afbrigdum. Deild med `rec: 0,75` er thvi
   NALGUD, og `exact: false` er thad sem vidmotid birtir. Prof sem
   spyrdi adeins um `scoring` hefdi verid graent meðan nalgunin var
   thogul.                                                            */
console.log("\n3. stigagjofin");
{
  const exact = [[1, "ppr"], [0.5, "half-ppr"], [0, "standard"]];
  for (const [rec, want] of exact) {
    const r = scoringFromSettings({ rec });
    ok(r.scoring === want && r.exact === true && r.warnings.length === 0,
      `rec ${rec} -> ${want}, nakvaemt`);
  }

  const odd = scoringFromSettings({ rec: 0.75 });
  ok(odd.scoring === "ppr", `rec 0,75 -> naesta afbrigdi (${odd.scoring})`);
  ok(odd.exact === false, "og thad er MERKT sem nalgun");
  ok(odd.warnings.some((w) => w.includes("0.75")),
    "og vidvorunin nefnir raunverulega toluna");

  const te = scoringFromSettings({ rec: 1, bonus_rec_te: 0.5 });
  ok(te.exact === false && te.warnings.some((w) => /TE premium/.test(w)),
    "TE premium er nefnt berum ordum");

  const passtd = scoringFromSettings({ rec: 1, pass_td: 6 });
  ok(passtd.exact === false && passtd.warnings.some((w) => /pass_td 6/.test(w)),
    "6-stiga pass-TD er flaggad (spain er 4-stiga)");

  /* Notandans eigin deild er NAKVAEM — annars vaeri hver deild
     "nalgud" og merkid hefdi enga merkingu. */
  const mine = scoringFromSettings(LEAGUE.scoring_settings);
  ok(mine.scoring === "ppr" && mine.exact === true && mine.warnings.length === 0,
    "raunveruleg deild: PPR, nakvaemt, engar vidvaranir");

  /* Ekkert `rec`-svid er OHEILT SVAR, ekki "standard". Ad giska a
     standard thar vaeri ad breyta stigagjof notandans thegjandi. */
  const none = scoringFromSettings({});
  ok(none.scoring === DEFAULT_LEAGUE.scoring && none.exact === false,
    "vantandi `rec` heldur núverandi stillingu og er merkt");
}

/* ============================================================
   4. STODU-THAKID ER MAELT — THAD MA EKKI SKALAST
   ============================================================
   `maxPos` er hegdunar-thak i draft-herminum og talan var MAELD i
   12-lida deild med QB1/RB2/WR3/TE1/FLEX1 (`accuracy.js`). Freistnin
   er ad skala hana eftir innfluttri deild — "tvo FLEX-saeti, tha ma
   TE-thakid vera 4". Su tala vaeri OMAELD og hun myndi lita
   nakvaemlega eins ut og maelda talan vid hlidina.

   Thetta prof FELLUR ef einhver skalar thakid.                       */
console.log("\n4. stodu-thakid");
{
  const mp = maxPosFor(LEAGUE.roster_positions ? startersFromRoster(LEAGUE.roster_positions).starters : {}, false);
  ok(JSON.stringify(mp) === JSON.stringify(DEFAULT_LEAGUE.maxPos),
    `thakid er OBREYTT maeld tala ${JSON.stringify(mp)}`);

  /* Eina breytingin sem er leyfd er RETTLEIKS-GOLF: thakid ma ekki
     vera laegra en thad sem VERDUR ad fyllast. */
  const sf = maxPosFor({ QB: 1, RB: 2, WR: 3, TE: 1, SUPERFLEX: 1 }, true);
  ok(sf.QB >= 2, `superflex: QB-thakid leyfir manninn i superflex-saetid (${sf.QB})`);
  const twoQb = maxPosFor({ QB: 2, RB: 2, WR: 3, TE: 1 }, false);
  ok(twoQb.QB >= 2, `2QB-deild: thakid gerir byrjunarlidid fyllanlegt (${twoQb.QB})`);
  ok(twoQb.RB === DEFAULT_LEAGUE.maxPos.RB && twoQb.WR === DEFAULT_LEAGUE.maxPos.WR,
    "og adrar stodur haggast ekki");
}

/* ============================================================
   5. VAR LOGUNIN MAELD? — BADAR ATTIR
   ============================================================
   Fullyrding sem gefur alltaf sama svar er engin fullyrding
   (CLAUDE.md 5b). Thess vegna er profad bædi ad MAELD logun skili
   `null` OG ad omaeld skili nótu. Vaeri fallid einfaldlega
   `return null` faelli sidari fullyrdingin.                          */
console.log("\n5. var logunin maeld?");
{
  const measured = { teams: 12, scoring: "ppr",
    starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 } };
  ok(unmeasuredShape(measured, shapes) === null,
    "12-lida ppr QB1 RB2 WR3 TE1 FLEX1 ER maeld -> engin nota");

  const built = leagueFromSleeper({ league: LEAGUE, draft: DRAFT, shapes });
  const note = unmeasuredShape(built.league, shapes);
  ok(typeof note === "string" && note.includes("10-team"),
    "10-lida med tveimur FLEX er OMAELD -> nota");

  /* Engin `shapes`-gogn -> ENGIN fullyrding. Tala ur engu vaeri verri
     en engin tala. */
  ok(unmeasuredShape(measured, null) === null, "engin shapes-gogn -> engin fullyrding");
}

/* ============================================================
   6. LIDIN — SAETID KEMUR THOTT `draft_order` SE NULL
   ============================================================
   ÞETTA ER GILDRAN SEM AÐEINS RAUNVERULEGT SVAR SYNDI. A deildinni
   var `draft_order` **null** thvi Sleeper dregur rodina eftir a. Prof
   sem hermdi adeins `draft_order` hefdi verid graent meðan saetavalid
   var tomt — og an saetis fyllist THINN hopur aldrei, svo "hvern a ad
   taka naest" veit ekki hvad thu att.                                */
console.log("\n6. lidin og saetin");
{
  ok(DRAFT.draft_order === null, "forsendan: `draft_order` ER null i raunsvarinu");

  const teams = teamsFromLeague({ draft: DRAFT, users: USERS, rosters: ROSTERS });
  ok(teams.length === 10, `10 saeti fundust thratt fyrir null draft_order (${teams.length})`);
  ok(teams.every((t) => t.slot != null), "hvert saeti ber tolu");
  ok(String(teams.map((t) => t.slot)) === String([1,2,3,4,5,6,7,8,9,10]),
    "og thau eru i rettri rod 1-10");

  const byName = new Map(teams.map((t) => [t.slot, t.name]));
  ok(byName.get(1) === "SteindorB", `saeti 1 er SteindorB (${byName.get(1)})`);
  ok(byName.get(7) === "mattitim", `saeti 7 er mattitim (${byName.get(7)})`);
  ok(byName.get(8) === "The Kopavogs Monkeys",
    `\`team_name\` er notad thegar thad er til (${byName.get(8)})`);
  /* Saeti an eiganda ma ekki bera "undefined" a skja. */
  ok(byName.get(2) === "Slot 2", `saeti an notanda faer "Slot 2" (${byName.get(2)})`);
  ok(!teams.some((t) => /undefined|null/.test(String(t.name))),
    "ekkert lidsheiti er undefined/null");

  /* Se rodin DREGIN a hun ad vinna — hun er hin raunverulega valrod. */
  const drawn = teamsFromLeague({
    draft: { ...DRAFT, draft_order: { "388485536370724864": 3 } },
    users: USERS, rosters: ROSTERS });
  ok(drawn.find((t) => t.userId === "388485536370724864").slot === 3,
    "`draft_order` vinnur yfir `slot_to_roster_id` thegar hun er komin");
  ok(drawn.filter((t) => t.slot === 3).length === 1, "og saetid tvitakast ekki");

  /* Ekkert saetakort: lidin eru samt syn, an saetis. */
  const noMap = teamsFromLeague({ draft: {}, users: USERS, rosters: ROSTERS });
  ok(noMap.length === USERS.length && noMap.every((t) => t.slot === null),
    "an saetakorts eru lidin syn an saetis");
  ok(teamsFromLeague({}).length === 0, "engin gogn -> tomur listi, ekkert hrun");
}

/* ============================================================
   7. ALLT SAMAN — OG UMFERDIRNAR KOMA UR DRAFTINU
   ============================================================
   `league.settings.draft_rounds` er **3** i raunsvarinu meðan draftid
   ber **15**. Laesi vorpunin deildina taeldi radgjofin thrjar umferdir
   eftir og myndi aldrei segja ther ad taka spyrnumann ne vorn.
   Fullyrdingin er tvihlida — 15 OG ekki 3 — thvi tala sem er rett af
   tilviljun er engin sonnun.                                         */
console.log("\n7. allt saman");
{
  const r = leagueFromSleeper({ league: LEAGUE, draft: DRAFT, shapes });
  const L = r.league;

  ok(L.rounds === 15, `15 umferdir ur DRAFTINU (${L.rounds})`);
  ok(L.rounds !== LEAGUE.settings.draft_rounds,
    `og EKKI ${LEAGUE.settings.draft_rounds} ur deildinni (gildran)`);
  /* 15 ER LIKA SJALFGEFNA TALAN i `DEFAULT_LEAGUE`, svo fullyrdingin
     hér ofan getur ekki greint "lesid ur draftinu" fra "sjalfgefid
     stod eftir". Talan verdur ad vera onnur til ad thad se sonnun —
     sama gildra og tomu fullyrdingarnar i CLAUDE.md 5b. */
  const r16 = leagueFromSleeper({
    league: LEAGUE, draft: { ...DRAFT, settings: { ...DRAFT.settings, rounds: 16 } }, shapes });
  ok(r16.league.rounds === 16 && DEFAULT_LEAGUE.rounds !== 16,
    `draft med 16 umferdir gefur 16, ekki sjalfgefnu ${DEFAULT_LEAGUE.rounds}`);
  ok(L.teams === 10, `10 lid (${L.teams})`);
  ok(L.scoring === "ppr", `PPR (${L.scoring})`);
  ok(L.superflex === false, "ekki superflex");
  ok(JSON.stringify(L.starters) ===
     JSON.stringify({ QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 }),
    `byrjunarsaetin ${JSON.stringify(L.starters)}`);

  /* Ekkert NaN ma sleppa inn i deildina — thad var villan sem gerdi
     HVERJA VBD-tolu NaN i hitt appinu (`build.js`). */
  const flat = JSON.stringify(L);
  ok(!/null|NaN/.test(flat.replace(/"flexPos":\[[^\]]*\]/, "")),
    "engin null/NaN i deildarsnidinu");

  ok(r.imported.name === "Patriots SB champs", "heiti deildarinnar er birt");
  ok(r.imported.draftId === DRAFT.draft_id, "draft-id fylgir med");
  ok(r.imported.orderDrawn === false, "og thad er SAGT ad rodin se ekki dregin");
  ok(r.imported.bench === 5, "bekkurinn er talinn (5)");
  ok(r.imported.exactScoring === true, "stigagjofin er nakvaem");

  /* Keeper-deild — ADP a bordinu er redraft, svo geymdir leikmenn eru
     verdlagdir eins og their vaeru enn i lauginni. Thad verdur ad
     segjast; thogn thar vaeri tolur sem lita rett ut og eru ekki. */
  ok(r.warnings.some((w) => /keeper|dynasty/i.test(w)),
    "keeper-deild er flogguð (max_keepers 1)");
  ok(r.warnings.some((w) => /not one of the shapes/i.test(w)),
    "og omaeld logun er flogguð");

  /* Deild an vidvarana ma EKKI bera vidvaranir — annars er kassinn
     alltaf raudur og haettir ad segja neitt. */
  const clean = leagueFromSleeper({
    league: { ...LEAGUE, previous_league_id: null,
              settings: { ...LEAGUE.settings, max_keepers: 0 },
              roster_positions: ["QB","RB","RB","WR","WR","WR","TE","FLEX","K","DEF","BN"],
              total_rosters: 12 },
    draft: { ...DRAFT, settings: { ...DRAFT.settings, teams: 12 } },
    shapes });
  ok(clean.warnings.length === 0,
    `hrein 12-lida deild ber ENGAR vidvaranir (${clean.warnings.join(" | ")})`);

  /* Uppbods-draft og best ball — hvorugt er heidrad og bædi eru sogd. */
  const auction = leagueFromSleeper({ league: LEAGUE, draft: { ...DRAFT, type: "auction" }, shapes });
  ok(auction.warnings.some((w) => /auction/i.test(w)), "uppbods-draft er flaggad");
  const bb = leagueFromSleeper({
    league: { ...LEAGUE, settings: { ...LEAGUE.settings, best_ball: 1 } }, draft: DRAFT, shapes });
  ok(bb.warnings.some((w) => /best ball/i.test(w)), "best ball er flaggad");

  /* Merking draftsins getur rekid fra reglunum. Reglurnar vinna OG
     osamraemid er sagt. */
  const mismatch = leagueFromSleeper({
    league: { ...LEAGUE, scoring_settings: { ...LEAGUE.scoring_settings, rec: 0 } },
    draft: DRAFT, shapes });
  ok(mismatch.league.scoring === "standard",
    "reglurnar (`rec`) vinna yfir merkinguna (`scoring_type`)");
  ok(mismatch.warnings.some((w) => /labelled/i.test(w)), "og osamraemid er sagt");
}

/* ============================================================
   8. RUSL MA EKKI KOMA APPINU I VERRA ASTAND EN HANDVIRKT INNSLATTUR
   ============================================================
   Innflutt deild fer gegnum `normalizeLeague`, svo eitt onytt svid
   kostar bara sig sjalft. Thetta er sama vord og `saved-state.mjs`
   ber um vistad astand — og hun a vid HER lika, thvi svar fra ytri
   heimild er alveg eins ovarid og blob i vafranum.                   */
console.log("\n8. rusl-svor");
{
  const junk = [
    {},
    { league: null, draft: null },
    { league: { total_rosters: "abc" }, draft: { settings: { rounds: "mikid" } } },
    { league: { roster_positions: "QB,RB" }, draft: { settings: null } },
    { league: { roster_positions: [] }, draft: {} },
    { league: { scoring_settings: { rec: "eitt" } }, draft: {} },
    { league: { total_rosters: 999 }, draft: { settings: { rounds: 9999 } } },
    { league: { roster_positions: ["BN", "BN"] }, draft: {} },
  ];
  for (const j of junk) {
    let crashed = null, out = null;
    try { out = leagueFromSleeper({ ...j, shapes }); }
    catch (e) { crashed = String(e.message || e); }
    const flat = out ? JSON.stringify(out.league) : "";
    ok(!crashed && out && !/NaN/.test(flat) &&
       Number.isFinite(out.league.teams) && out.league.teams >= 4 &&
       Number.isFinite(out.league.rounds) && out.league.rounds >= 1 &&
       Object.values(out.league.starters).some((v) => v > 0),
      `${JSON.stringify(j).slice(0, 62)} -> gild deild` +
      `${crashed ? ` — HRUN: ${crashed}` : ""}`);
  }
  /* Og GILD deild verdur ad fara obreytt i gegn — annars vaeri
     "vordurinn" ad henda raunverulegri deild notandans. */
  const good = leagueFromSleeper({ league: LEAGUE, draft: DRAFT, shapes }).league;
  ok(good.teams === 10 && good.rounds === 15 && good.starters.FLEX === 2,
    "gild deild fer obreytt i gegn");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
