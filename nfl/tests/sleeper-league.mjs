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
  maxPosFor, teamsFromLeague, leagueFromSleeper,
  startersFromSlots, scoringFromDraftLabel, boardShape,
  resolveSeat, SEAT_ROUTES, SEAT_ROUTE_LABEL,
} from "../src/sleeper-league.js";
import { DEFAULT_LEAGUE } from "../src/build.js";
import { ownPickNo, nextOwnPick, picksUntilNext, survivalProb } from "../src/advice.js";
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
   5. LOGUNAR-VIDVORUNIN MA EKKI KOMA AFTUR
   ============================================================
   `unmeasuredShape` var her og hun las ADEINS `shapes_sleeper.json`,
   sem ber aðeins EINN-FLEX logun. BADAR raunverulegu deildir notandans
   hafa TVO FLEX, svo baðar fengu "this shape has not been backtested" —
   fals-jakvaett a hverri deild sem hann spilar i. Bædi eru maeld i
   `data/measure/half.json`: +186,1 (11/11) og +147,4 (10/11).

   Uppflettingin byr nu i `src/rulebasis.js`. Þessi kafli ver ad
   vorpunin fullyrdi EKKERT um logun — og hann fellur ef vidvorunin er
   sett aftur inn, hvadan sem hun kemur.                              */
console.log("\n5. vorpunin fullyrdir ekkert um logun");
{
  const r = leagueFromSleeper({ league: LEAGUE, draft: DRAFT, shapes });
  ok(!r.warnings.some((w) => /shape|backtest|Model lab/i.test(w)),
    `10-2flex ppr faer ENGA logunar-vidvorun (${r.warnings.join(" | ") || "engar"})`);

  /* Og sama gildir um Sofahetjur-logunina (12 lid, half, tvo FLEX,
     HVORKI K NE DEF) — hun var lika flogguð rangt. */
  const sofa = leagueFromSleeper({
    league: { ...LEAGUE, league_id: "1389328159903580160", name: "Sofahetjur",
              total_rosters: 12,
              roster_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX",
                                 "BN", "BN", "BN", "BN", "BN", "BN"],
              settings: { ...LEAGUE.settings, num_teams: 12, type: 0 },
              scoring_settings: { ...LEAGUE.scoring_settings, rec: 0.5 } },
    draft: { ...DRAFT, settings: { ...DRAFT.settings, teams: 12, rounds: 14 },
             metadata: { scoring_type: "half_ppr" } },
    shapes });
  ok(!sofa.warnings.some((w) => /shape|backtest|Model lab/i.test(w)),
    `12-2flex half faer enga heldur (${sofa.warnings.join(" | ") || "engar"})`);
  ok(sofa.league.scoring === "half-ppr" && sofa.league.teams === 12 &&
     sofa.league.rounds === 14 && !("K" in sofa.league.starters) &&
     !("DST" in sofa.league.starters),
    `og hun les rett: 12 lid, half-ppr, 14 umf., HVORKI K NE DST ` +
    `(${JSON.stringify(sofa.league.starters)})`);
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

  /* ============================================================
     KEEPER-VIDVORUNIN — FALS-JAKVAETT SEM VAR MAELT OG LAGAD
     ============================================================
     Fyrsta utgafan flaggadi THESSA deild sem keeper-deild af thvi ad
     `max_keepers` er 1 og `previous_league_id` er sett. Baðar
     visbendingarnar eru RANGAR: `max_keepers: 1` er Sleeper-sjalfgefid
     i HVERRI deild, og `previous_league_id` er sett a hverja deild sem
     er endurnyjud milli timabila — sem redraft-deildir eru alltaf.

     Mælt 12.8.2026: `settings.type` er **0** (redraft) a bædi thessari
     deild og forvera hennar, og `is_keeper` er **null i ollum 150
     volum** sidasta drafts. Enginn var nokkurn timann geymdur.

     Vidvorun sem kviknar a algengri, venjulegri deild er havadi, og
     notandinn laerir a viku ad hunsa kassann — tha er raunveruleg
     vidvorun jafn gagnslaus og engin. Prófad i BADAR ATTIR, thvi
     "flaggar aldrei" er jafn gagnslaust og "flaggar alltaf".        */
  ok(!r.warnings.some((w) => /keeper|dynasty/i.test(w)),
    `redraft-deild (type 0) er EKKI flogguð sem keeper — ` +
    `${r.warnings.filter((w) => /keeper|dynasty/i.test(w)).join("") || "hreint"}`);
  /* RAUNVERULEG DEILD NOTANDANS BER NU ENGA VIDVORUN — og thad er
     sterkasta fullyrdingin i thessum kafla. Adur bar hun TVAER og
     BAÐAR voru osannar (keeper ur `max_keepers`, omaeld logun ur
     einn-flex-toflunni). Kassi sem er alltaf raudur haettir ad segja
     neitt, svo "thogn a rettri deild" er krafan.

     Og hann er ekki dauður: kaflarnir hér a eftir krefjast thess ad
     keeper (type 1/2), dynasty, taxi, uppbod, best ball, TE-premium og
     osamraemi milli reglna og merkingar kviknir ALLIR.               */
  ok(r.warnings.length === 0,
    `raunveruleg deild ber ENGA vidvorun (${r.warnings.join(" | ") || "engar"})`);

  for (const [type, word] of [[1, "keeper"], [2, "dynasty"]]) {
    const kp = leagueFromSleeper({
      league: { ...LEAGUE, settings: { ...LEAGUE.settings, type } }, draft: DRAFT, shapes });
    ok(kp.warnings.some((w) => new RegExp(word, "i").test(w)),
      `settings.type ${type} ER flogguð sem ${word}`);
  }
  /* Taxi-saeti eru dynasty-smid og eru merkid thegar `type` vantar. */
  const taxi = leagueFromSleeper({
    league: { ...LEAGUE, settings: { ...LEAGUE.settings, type: undefined, taxi_slots: 3 } },
    draft: DRAFT, shapes });
  ok(taxi.warnings.some((w) => /keeper|dynasty/i.test(w)),
    "taxi-saeti flagga deildina thott `type` vanti");

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

/* ============================================================
   9. SNAKK-RODIN — LITURINN A BORDINU HANGIR A HENNI
   ============================================================
   Bordid litar leikmann eftir `survivalProb(adp, sd, naesta val mitt)`.
   Se `nextOwnPick` skakkt um EITT val er liturinn skakkur a hverjum
   einasta leikmanni — og hann vaeri trulegur, thvi hann myndi enn
   halla i retta att. Thess vegna er rodin borin vid TALDA snakk-rod,
   ekki vid formuluna sjalfa: tvo utfaerslur af somu formulu geta bædi
   verid rangar a sama hatt.

   `ownPickNo` VERDUR lika ad vera andhverfa `picksUntilNext`, sem
   radgjofin notar. Vaeru thaer osamhljoda segdi bordid annad en
   radgjofin — sama flokkur villu og tvær utfaerslur af FFDR.       */
console.log("\n9. snakk-rodin");
{
  /* Taldur snakk-listi: hver eru MIN vol i 10-lida deild ur saeti 7? */
  const enumerate = (teams, slot, rounds) => {
    const mine = [];
    let pick = 0;
    for (let r = 1; r <= rounds; r++) {
      const order = r % 2 === 1
        ? Array.from({ length: teams }, (_, i) => i + 1)
        : Array.from({ length: teams }, (_, i) => teams - i);
      for (const s of order) { pick++; if (s === slot) mine.push(pick); }
    }
    return mine;
  };

  for (const [teams, slot] of [[10, 7], [12, 1], [12, 12], [8, 4], [14, 9]]) {
    const want = enumerate(teams, slot, 6);
    const got = Array.from({ length: 6 }, (_, i) => ownPickNo(i + 1, teams, slot));
    ok(String(got) === String(want),
      `${teams} lid, saeti ${slot}: ${got.join(",")} (taldi ${want.join(",")})`);
  }

  /* Andhverfan: `picksUntilNext` fra minu vali verdur ad lenda a
     naesta vali minu. */
  for (const [teams, slot] of [[10, 7], [12, 1], [12, 12], [8, 4]]) {
    let good = true;
    for (let r = 1; r <= 5; r++) {
      const p = ownPickNo(r, teams, slot);
      if (p + picksUntilNext(p, teams) !== ownPickNo(r + 1, teams, slot)) good = false;
    }
    ok(good, `${teams}/${slot}: picksUntilNext er andhverfa ownPickNo`);
  }

  /* `> cur`, EKKI `>= cur`. Er valid mitt a klukkunni er allt laust
     fyrir mer NUNA, svo spurningin er um valid a EFTIR. Fullyrdingin
     ma ekki geta stadist bædi — thess vegna er hun a BADUM tilfellum. */
  const mine10x7 = enumerate(10, 7, 4);          // 7, 14, 27, 34
  ok(String(mine10x7.slice(0, 4)) === "7,14,27,34",
    `forsendan: min vol eru ${mine10x7.slice(0, 4).join(",")}`);
  ok(nextOwnPick(7, 10, 7) === 14,
    `a mínu vali (7) skilar NAESTA vali (14), fann ${nextOwnPick(7, 10, 7)}`);
  ok(nextOwnPick(8, 10, 7) === 14,
    `eftir mitt val (8) skilar 14, fann ${nextOwnPick(8, 10, 7)}`);
  ok(nextOwnPick(1, 10, 7) === 7,
    `fyrir mitt val (1) skilar 7, fann ${nextOwnPick(1, 10, 7)}`);
  ok(nextOwnPick(14, 10, 7) === 27,
    `a vali 14 skilar 27 (snakk-parid slokknar), fann ${nextOwnPick(14, 10, 7)}`);

  /* AN SAETIS MA ENGINN LITUR BIRTAST. `null` er "vid vitum ekki",
     og litur ur ovissu vaeri hreinn tilbuningur. */
  for (const bad of [[null, 10, 7], [1, null, 7], [1, 10, null], [1, 10, 0],
                     [1, 10, 11], [1, 1, 1], [1, "tíu", 7], [NaN, 10, 7]]) {
    ok(nextOwnPick(bad[0], bad[1], bad[2]) === null,
      `ogilt inntak gefur null: ${JSON.stringify(bad)}`);
  }

  /* Og thegar saetid ER thekkt verdur talan ad vera til — annars vaeri
     "engin litun" utkoman i hverju raunverulegu drafti. */
  ok(nextOwnPick(1, 10, 7) != null, "gilt inntak gefur tolu (annars litar bordid aldrei)");

  /* Lifun: leikmadur med ADP langt fyrir mitt val a ad vera nanast
     horfinn, og leikmadur langt eftir thad nanast viss. Baðar attir,
     annars gaeti fullyrdingin ekki brugdist. */
  const np = nextOwnPick(7, 10, 7);              // 14
  const early = survivalProb(3, 2, np);
  const late = survivalProb(60, 8, np);
  ok(early < 0.05, `ADP 3 lifir EKKI til vals 14 (${early.toFixed(3)})`);
  ok(late > 0.95, `ADP 60 lifir vissulega til vals 14 (${late.toFixed(3)})`);
  ok(survivalProb(null, 2, np) === null, "engin ADP -> null, ekki 0");
}

/* ============================================================
   ALLAR STIGAREGLUR, EKKI BARA THAER SEX SEM VID MUNDUM
   ============================================================
   Notandinn spurdi 12.8.2026: "getur verid erfidara fyrir WR ad fa
   stig en RB, sem ytir RB framar?" Svarid er JA, og `BONUS_FIELDS`
   bar adeins SEX svid af meira en hundrad hja Sleeper — svo deild med
   `rec_fd: 1` (fyrsta-nidur-stig, ordid algengt) las sem hrein
   PPR-deild og WR-arnir maeldust kerfislaega lagt.

   Reglan er thvi SNUID VID: vid teljum upp thad sem er ohaett og
   flaggum allt annad. Profid ver BADAR attir — nyja svid ma ekki
   sleppa, og hrein deild ma ekki fa fals-viðvorun.                */
console.log("\nstigareglur: allt sem vid reiknum EKKI verdur ad sjast");
{
  const PURE = { rec: 1, pass_yd: 0.04, pass_td: 4, pass_int: -1,
                 rush_yd: 0.1, rush_td: 6, rec_yd: 0.1, rec_td: 6, fum_lost: -2 };

  const pure = scoringFromSettings(PURE);
  ok(pure.scoring === "ppr" && pure.exact === true,
    `hrein PPR-deild er EXACT og fær enga viðvorun (${pure.warnings.length})`);

  /* Fyrsta-nidur-stig. Thetta er tilfellid sem slapp adur. */
  const fd = scoringFromSettings({ ...PURE, rec_fd: 1, rush_fd: 1 });
  ok(fd.exact === false, "PPFD-deild er EKKI exact");
  ok(fd.offsets.some((x) => x.startsWith("rec_fd")),
    `rec_fd er nefnt (${fd.offsets.join(", ")})`);
  ok(fd.offsets.some((x) => x.startsWith("rush_fd")), "og rush_fd lika");

  /* Yarda-stig sem hyglar RB gegn WR — nakvaemlega spurning notandans. */
  const halfYd = scoringFromSettings({ ...PURE, rec_yd: 0.05 });
  ok(halfYd.exact === false && halfYd.offsets.some((x) => x.startsWith("rec_yd")),
    "halfud motttoku-yarda-stig sjast");

  const att20 = scoringFromSettings({ ...PURE, rec: 0, bonus_rush_att_20: 2 });
  ok(att20.scoring === "standard" && att20.exact === false,
    "20+ hlaup-bonus sest i standard-deild");

  /* OKUNNUGT SVID — kjarninn i snuningnum. Vaeri listinn afram
     handskrifadur faeri thetta thegjandi i gegn. */
  const nw = scoringFromSettings({ ...PURE, some_future_field: 3 });
  ok(nw.exact === false && nw.unmodelled.some((x) => x.startsWith("some_future_field")),
    `okunnugt svid er flaggad (${nw.unmodelled.join(", ")})`);

  /* Og null-gildi ma EKKI flagga: Sleeper sendir tugi svida a 0 og
     deild med thau er hrein. Vaeri thetta ekki profad myndi hver
     einasta deild lesa sem "custom" og viðvorunin yrdi merkingarlaus. */
  const zeros = scoringFromSettings({ ...PURE, some_future_field: 0, another: 0 });
  ok(zeros.exact === true && zeros.unmodelled.length === 0,
    "svid sem eru 0 eru ekki flagguð");

  /* Vorn, spyrnumadur og IDP mega vera hvad sem er — their eru utan
     A-Ranking af maeldri astaedu, svo spain skekkist ekki. */
  const dst = scoringFromSettings({ ...PURE, def_td: 6, fgm_50p: 5,
    pts_allow_0: 10, idp_tkl: 1, yds_allow_0_100: 5 });
  ok(dst.exact === true,
    `vorn/spyrna/IDP hafa engin ahrif a exact (${dst.warnings.join(" | ")})`);

  /* Og TE premium ma adeins gefa EITT skilabod, ekki tvo um sama reit. */
  const te = scoringFromSettings({ ...PURE, bonus_rec_te: 0.5 });
  ok(te.warnings.length === 1 && /TE premium/.test(te.warnings[0]),
    `TE premium gefur eitt skilabod med mannamali (${te.warnings.length})`);
}

/* ============================================================
   10. DRAFTID SEM HEIMILD — MOCK BER ENGA DEILD
   ============================================================
   VILLAN: notandinn tengdi 10-lida mock og las "Disconnected — draft
   has 10 teams, league has 12 — connect the league this draft belongs
   to" medan draftid var i beinni. Mock-draft BER ENGA `league_id`, svo
   bodin baðu hann um ad gera thad sem ekki er haegt — og verra: bordid
   reiknadi hverja VBD-tolu fyrir 12 lid medan hann draftadi i 10-lida
   mock-i (varamanns-threpid WR29 -> WR42, +26,9 stig a hvern WR).

   SVIDIN ERU MAELD A LIFANDI API 20.8.2026 (`/v1/draft/1389356308125192192`):
   `settings` ber `teams`, `rounds`, `slots_qb/rb/wr/te/flex/k/def/bn` og
   `metadata` ber `scoring_type`. Þau bua a DRAFTINU, ekki a deildinni.

   HVER FULLYRDING HER ER UM HEIMILD, EKKI UM TOLU: "hvadan kemur
   thetta svid?" — thvi thad var spurningin sem var svarad rangt.     */
console.log("\n10. mock-draft: logunin lesin ur draftinu sjalfu");
{
  /* --- byrjunarsaetin ur `slots_*` --- */
  const sl = startersFromSlots({ teams: 10, rounds: 15, slots_qb: 1, slots_rb: 2,
    slots_wr: 2, slots_te: 1, slots_flex: 2, slots_k: 1, slots_def: 1, slots_bn: 5 });
  ok(sl && sl.starters.QB === 1 && sl.starters.RB === 2 && sl.starters.WR === 2
     && sl.starters.TE === 1 && sl.starters.FLEX === 2 && sl.starters.K === 1,
    `slots_* -> byrjunarsaeti (${JSON.stringify(sl && sl.starters)})`);
  ok(sl && sl.starters.DST === 1 && sl.starters.DEF == null,
    "`slots_def` verdur **DST**, ekki DEF — thad er okkar heiti og `mustFill` les thad");
  ok(sl && sl.bench === 5, `bekkurinn er talinn ser (${sl && sl.bench})`);
  ok(sl && Array.isArray(sl.flexPos) && sl.flexPos.join("/") === "RB/WR/TE",
    `FLEX ber sinar stodur (${sl && sl.flexPos})`);

  const sf = startersFromSlots({ slots_qb: 1, slots_super_flex: 1, slots_rb: 2 });
  ok(sf && sf.superflex === true && sf.starters.SUPERFLEX === 1,
    "`slots_super_flex` kveikir a superflex");

  /* NULL ER SVAR: svar an byrjunarsaeta veit thad ekki, og tha er
     deildin eina heimildin. Tomur hlutur vaeri "deild an byrjunarsaeta". */
  ok(startersFromSlots({ teams: 10, rounds: 15 }) === null,
    "engin `slots_*` -> null (ekki tomur hlutur, sem laesi eins og engin saeti)");
  ok(startersFromSlots(null) === null && startersFromSlots("rusl") === null,
    "og rusl-inntak fellur ekki");

  /* --- stigagjofin ur `metadata.scoring_type` --- */
  ok(scoringFromDraftLabel("ppr") === "ppr", "`ppr` -> ppr");
  ok(scoringFromDraftLabel("half_ppr") === "half-ppr", "`half_ppr` -> half-ppr");
  ok(scoringFromDraftLabel("dynasty_half_ppr") === "half-ppr",
    "`dynasty_half_ppr` -> half-ppr (halfid er thad sem gildir)");
  ok(scoringFromDraftLabel("std") === "standard", "`std` -> standard");
  /* OG ThAD SEM SEGIR EKKERT FAER **NULL**. "2qb" er saeta-regla, ekki
     mottoku-stig: ad giska a ppr thar vaeri omeld tala sem lítur ut eins
     og maeling — og hun myndi faera hvert VBD i deildinni. */
  ok(scoringFromDraftLabel("2qb") === null && scoringFromDraftLabel("dynasty") === null,
    "`2qb`/`dynasty` -> null, thvi thau segja EKKERT um mottoku-stig");
  ok(scoringFromDraftLabel(null) === null && scoringFromDraftLabel("") === null,
    "og tomt gildi er null");

  /* --- utkoman: hvad bordid reiknar med, og hvadan --- */
  const league = { ...DEFAULT_LEAGUE, teams: 12, rounds: 14, scoring: "half-ppr" };
  const mockShape = { teams: 10, rounds: 15, leagueId: null, scoringType: "ppr",
    slots: startersFromSlots({ slots_qb: 1, slots_rb: 2, slots_wr: 2, slots_te: 1,
      slots_flex: 2, slots_k: 1, slots_def: 1, slots_bn: 5 }),
    type: "snake", status: "drafting", picks: 3 };

  const b = boardShape({ league, shape: mockShape, leagueId: "L1" });
  ok(b.state === "mock", `draft an deildar er "mock" (fann "${b.state}")`);
  ok(b.green === true, "og hann er TENGDUR — lifandi mock er ekki \"disconnected\"");
  ok(b.league.teams === 10 && b.league.rounds === 15,
    `logunin kemur ur draftinu (${b.league.teams}x${b.league.rounds})`);
  ok(b.league.scoring === "ppr",
    `og stigagjofin lika (${b.league.scoring}) — deildin sagdi half-ppr`);
  ok(b.league.starters.WR === 2 && b.league.starters.FLEX === 2,
    `og byrjunarsaetin (${JSON.stringify(b.league.starters)})`);
  ok(b.from.teams === "draft" && b.from.rounds === "draft"
     && b.from.scoring === "draft" && b.from.starters === "draft",
    "og `from` segir um HVERT svid hvadan thad kom");
  ok(!/connect the league/i.test(b.line || ""),
    `linan bidur ekki um ad tengja deild sem er ekki til ("${b.line}")`);
  ok(/mock draft with no league/.test(b.line || ""),
    "heldur nefnir hun astandid sjalft");

  /* HLUTASANNLEIKUR ER SAGDUR SEM HLUTASANNLEIKUR. Mock an `slots_*`
     faer byrjunarsaeti UR DEILDINNI — og thad er ekki thagað, thvi
     saetafjoldinn faerir varamanns-threpid alveg eins og lidafjoldinn. */
  const thin = boardShape({ league,
    shape: { ...mockShape, slots: null, scoringType: null }, leagueId: "L1" });
  ok(thin.green === true && thin.from.scoring === "league"
     && thin.from.starters === "league",
    "mock an `slots_*`/`scoring_type`: thau koma ur deildinni");
  ok(/scoring and starting slots from the league you have loaded/.test(thin.line),
    `og linan segir thad berum ordum ("${thin.line}")`);
  ok(thin.league.teams === 10 && thin.league.scoring === "half-ppr",
    "logunin er samt draftsins — hvert svid fyrir sig");

  /* --- ONNUR DEILD ER ANNAD MAL, OG HUN ER RAUD ---
     Þetta er vordurinn sem MA EKKI mildast thegar mock vard graent:
     draft sem BER `league_id` sem er onnur en su sem er hladin er
     raunveruleg notandavilla — reglurnar a skjanum eru einnar deildar,
     volin annarrar. Þad var HUN sem kostadi sex WR i sjo umferdum. */
  const other = boardShape({ league,
    shape: { ...mockShape, leagueId: "L9" }, leagueId: "L1" });
  ok(other.state === "other" && other.green === false,
    `draft annarrar deildar er RAUTT (${other.state})`);
  ok(/belongs to another Sleeper league \(L9\)/.test(other.line),
    `og audkennid er nefnt ("${other.line}")`);
  ok(other.league.scoring === "half-ppr" && other.league.starters.WR
     === league.starters.WR,
    "og reglur deildarinnar standa — vid tokum ekki upp reglur annarrar deildar");

  /* --- draft deildarinnar sjalfrar: engin lina, og reglurnar hennar --- */
  const own = boardShape({ league: { ...league, teams: 10, rounds: 15 },
    shape: { ...mockShape, leagueId: "L1" }, leagueId: "L1" });
  ok(own.state === "league" && own.green === true && own.line === null,
    `samstaeður deildardraft: graent og ENGIN lina (${own.line})`);
  ok(own.league.scoring === "half-ppr",
    "og `metadata.scoring_type` yfirskrifar ALDREI `scoring_settings` deildarinnar");

  /* --- ekkert draft --- */
  const none = boardShape({ league, shape: null, leagueId: "L1" });
  ok(none.state === "none" && none.green === false && none.league === league,
    "ekkert draft: engin tenging og SAMA deildin (sama tilvisun)");

  /* IDENTITETID ER STODUGT — annars endurreiknast `buildRows` (200 radir
     og hver VBD-tala) i HVERRI pollun. Þad er maelanleg krafa, ekki
     smekkur: `draft-live.mjs` for ur ~20 sek i yfir tolf minutur thegar
     hluturinn var nyr i hvert sinn. */
  const same = boardShape({ league: { ...league, teams: 10, rounds: 15 },
    shape: { teams: 10, rounds: 15, leagueId: "L1" }, leagueId: "L1" });
  ok(same.league.teams === 10, "forsenda: logunin er sú sama");
  const lg2 = { ...league, teams: 10, rounds: 15 };
  ok(boardShape({ league: lg2, shape: { teams: 10, rounds: 15, leagueId: "L1" },
                  leagueId: "L1" }).league === lg2,
    "engin breyting -> SAMA tilvisunin (ekkert endurreiknad)");

  /* RUSL-SVID MEGA EKKI SMITA. `{"teams":"abc"}` var raunveruleg villa i
     `normalizeLeague` (hver VBD-tala vard NaN); hér er sama krafa a
     ytra svarinu. */
  const junk = boardShape({ league,
    shape: { teams: "abc", rounds: null, leagueId: null }, leagueId: "L1" });
  ok(junk.league.teams === 12 && junk.league.rounds === 14,
    `rusl i `+"`settings`"+` fellur i deildina (${junk.league.teams}x${junk.league.rounds})`);
  ok(Number.isFinite(junk.league.teams), "og hvergi NaN");
}

/* ============================================================
   11. HVAR SIT EG? — ThRJAR LEIDIR, HVER PROFUD EIN
   ============================================================
   BEIDNI NOTANDANS 20.8.2026: „Nei eg vill ad thu finnir slottid mitt,
   finndu leidir til thess ad lata appid gera thad."

   Gamla `resolveSlot` bar tvaer leidir og BADAR krofdust `user_id`; i
   MOCK-I, thar sem hann hafdi aldrei slegid inn nafn, hafdi hun thvi
   enga gilda leid og tolu-reiturinn var eina svarid.

   HVER LEID ER PROFUD MED LAUG ThAR SEM ADEINS HUN GETUR SVARAD. Þad er
   ekki thaegindi heldur forsenda: vaeri laugin med allar thrjar
   heimildirnar samtimis gaeti profid verid graent thott TVAER leidirnar
   vaeru daudar — hin thridja baeri thaer. Fullyrding sem onnur leid getur
   uppfyllt er ekki fullyrding um thessa leid.

   TOLURNAR ERU UR LIFANDI API-I 20.8.2026, fjogur LOKIN draft hans:

     draft                  vol min   draft_slot   draft_order[eg]
     1257479008598110209     14/14        5              5
     1257117602308689921     15/15        3              3
     1126700095157714944     14/14        1              1
     1124851993081290753     15/15        5              5

   Fjogur draft, FJOGUR OLIK SAETI (5, 3, 1, 5) — sjalfstaed staðfesting
   a thvi ad saetid se eiginleiki DRAFTSINS og megi aldrei erfast. Og
   leidirnar A og B gafu SOMU tolu i ollum fjorum, sem er forsendan fyrir
   thvi ad hafa thaer badar i stad ad velja eina.

   OG EITT SEM VAR MAELT RANGT FYRST, skrad thvi thad er gildra: LISTA-
   endapunkturinn (`/user/{id}/drafts/nfl/{ar}`) NULLAR `draft_order` —
   lika a loknum draftum — medan STAKI (`/draft/{id}`, sa sem appid
   notar) ber hana. Fyrsta maelingin las listann og dro af thvi ad leid A
   vaeri nanast aldrei til. Hun er til; hun kemur bara thegar rodin er
   dregin.                                                             */
console.log("\n11. hvar sit eg — thrjar leidir, hver profud ein");
{
  const ME = "869560416248975360";
  const T10 = { settings: { teams: 10, rounds: 15 } };

  /* ---- B. VOLIN, OG **ADEINS** thau ----
     Engin `draft_order`, ekkert `slot_to_roster_id`, engir notendur,
     engir rostrar. Þetta er MOCK — astandid thar sem gamla leidin hafdi
     ekkert — og volin eru eina heimildin sem er til. */
  {
    const draft = { ...T10, draft_id: "m1", league_id: null,
                    draft_order: null, slot_to_roster_id: null };
    const picks = [
      { pick_no: 1, draft_slot: 1, picked_by: "bot1", player_id: "1" },
      { pick_no: 7, draft_slot: 7, picked_by: ME,     player_id: "2" },
      { pick_no: 14, draft_slot: 7, picked_by: ME,    player_id: "3" },
    ];
    const r = resolveSeat({ draft, picks, userId: ME });
    ok(r.slot === 7, `B: volin ein gefa saeti 7 (${r.slot})`);
    ok(r.route === "picks", `og leidin er nefnd "picks" (${r.route})`);
    ok(/2 picks/.test(r.why), `og hun segir a hverju hun byggir ("${r.why}")`);
    /* HIN ATTIN — annars vaeri "7" bara talan sem laugin ber: sami
       draft, en volin eru annars manns. */
    const other = resolveSeat({ draft,
      picks: picks.map((p) => ({ ...p, picked_by: "bot" + p.draft_slot })),
      userId: ME });
    ok(other.slot === null && other.route === null,
      `og vol ANNARS MANNS gefa null, ekki 7 (${other.slot})`);
    ok(/no draft order|cannot be read/.test(other.why),
      `og hun segir hvers vegna ("${other.why}")`);
  }

  /* ---- A. `draft_order`, OG **ADEINS** hun ----
     Engin vol (draftid er ekki byrjad), engin deild. */
  {
    const draft = { ...T10, draft_id: "m2", league_id: null,
                    draft_order: { [ME]: 3, other: 8 }, slot_to_roster_id: null };
    const r = resolveSeat({ draft, picks: [], userId: ME });
    ok(r.slot === 3 && r.route === "order",
      `A: rodin ein gefur saeti 3 um leid "order" (${r.slot}/${r.route})`);
    /* Audkenni sem er ekki i rodinni ma ekki fa saeti EINHVERS. */
    const nope = resolveSeat({ draft, picks: [], userId: "999" });
    ok(nope.slot === null,
      `og audkenni utan rodarinnar faer null, ekki fyrsta saetid (${nope.slot})`);
  }

  /* ---- C. DEILDIN, OG **ADEINS** hun ----
     Engin vol, engin `draft_order`. Saetid kemur ur
     `slot_to_roster_id` -> `rosters[].owner_id`, sem er leidin sem VIRKAR
     thott rodin se ekki dregin (maelt a raunverulegri deild 12.8.2026). */
  {
    const draft = { ...T10, draft_id: "m3", league_id: "L1",
                    draft_order: null, slot_to_roster_id: { 1: 4, 2: 9, 6: 2 } };
    const rosters = [{ roster_id: 4, owner_id: "x" }, { roster_id: 9, owner_id: "y" },
                     { roster_id: 2, owner_id: ME }];
    const users = [{ user_id: ME, display_name: "KanelGifler" }];
    const r = resolveSeat({ draft, picks: [], users, rosters, userId: ME });
    ok(r.slot === 6 && r.route === "league",
      `C: deildin ein gefur saeti 6 um leid "league" (${r.slot}/${r.route})`);
    const nope = resolveSeat({ draft, picks: [], users, rosters, userId: "zzz" });
    ok(nope.slot === null,
      `og notandi utan deildarinnar faer null (${nope.slot})`);
  }

  /* ---- RODIN: VOLIN VINNA ThEGAR THAU REKAST A ----
     Þetta er sterkasta reglan i fallinu og hun er ekki smekkur: leid B
     er dregin af thvi sem GERDIST, leidir A og C segja hvad ATTI ad
     gerast. Stilling getur verid gomul, afrituð eda innslegin; val sem er
     skrad a mig ER mitt. */
  {
    const draft = { ...T10, draft_id: "m4", league_id: "L1",
                    draft_order: { [ME]: 5 }, slot_to_roster_id: { 9: 2 } };
    const rosters = [{ roster_id: 2, owner_id: ME }];
    const picks = [{ pick_no: 7, draft_slot: 7, picked_by: ME, player_id: "1" }];
    const r = resolveSeat({ draft, picks, users: [], rosters, userId: ME });
    ok(r.slot === 7 && r.route === "picks",
      `agreiningur: rodin segir 5, deildin 9, VOLIN 7 -> volin vinna (${
        r.slot}/${r.route})`);
    /* OG MAELITAEKID VERDUR AD GETA BRUGDIST: an valanna svarar SAMA laug
       5 (leid A), svo "7" er ekki bara talan sem laugin ber. */
    const noPicks = resolveSeat({ draft, picks: [], users: [], rosters, userId: ME });
    ok(noPicks.slot === 5 && noPicks.route === "order",
      `og an valanna svarar sama laug 5 um "order" — svo rodin er raunveruleg (${
        noPicks.slot}/${noPicks.route})`);
  }

  /* ---- AUDKENNID ER FORSENDA ALLRA LEIDA ----
     Þetta er nakvaemlega thad sem brast i mock-i: `uid` var null og
     BADAR gomlu leidirnar krofdust hans. Svarid er `null` OG setning sem
     segir hvad vantar — thvi vidmotid a tha ad bidja um NOTANDANAFN, ekki
     um saetatolu. */
  {
    const draft = { ...T10, draft_order: { u1: 1 }, slot_to_roster_id: { 1: 1 } };
    const picks = [{ pick_no: 1, draft_slot: 1, picked_by: "u1", player_id: "1" }];
    for (const bad of [null, undefined, "", "   ", {}, []]) {
      const r = resolveSeat({ draft, picks, userId: bad });
      ok(r.slot === null && /user id/.test(r.why),
        `an audkennis: null og "${r.why.slice(0, 34)}" (${JSON.stringify(bad)})`);
    }
  }

  /* ---- SAETI UTAN DRAFTSINS ER EKKI SAETI ----
     Skorðan gildir um ALLAR leidirnar. Heimild sem skilar 13 i 10-lida
     drafti er skemmt svar, hvadan sem hun kemur — og "Slot 13 does not
     exist" er vidvorun sem notandinn getur ekkert gert vid. */
  {
    const draft = { ...T10, draft_order: { [ME]: 13 }, slot_to_roster_id: null };
    ok(resolveSeat({ draft, picks: [], userId: ME }).slot === null,
      "A: saeti 13 i 10-lida drafti -> null");
    ok(resolveSeat({ draft: { ...draft, draft_order: null },
      picks: [{ pick_no: 1, draft_slot: 13, picked_by: ME, player_id: "1" }],
      userId: ME }).slot === null,
      "B: sama um volin — 13 er ekki saeti i 10-lida drafti");
    /* En an `settings.teams` er engin skorðan til og tha ma talan standa:
       ad henda henni thar vaeri ad giska a staerd sem vid vitum ekki. */
    const noSize = resolveSeat({ draft: { draft_order: { [ME]: 13 } },
      picks: [], userId: ME });
    ok(noSize.slot === 13,
      `an \`settings.teams\` stendur talan (${noSize.slot}) — ekki giskad a staerd`);
  }

  /* ---- TVIRAETT -> ENGIN PORUN ----
     Sama regla og `myRosterId` og `names.mjs`. Getur ekki gerst i
     heilbrigðu svari — og thess vegna ma hun ekki vera thogul. */
  {
    const draft = { ...T10, draft_order: null, slot_to_roster_id: null };
    const picks = [{ pick_no: 3, draft_slot: 3, picked_by: ME, player_id: "1" },
                   { pick_no: 8, draft_slot: 8, picked_by: ME, player_id: "2" }];
    const r = resolveSeat({ draft, picks, userId: ME });
    ok(r.slot === null && /different seats/.test(r.why),
      `tvo saeti undir minu audkenni -> null og SAGT ("${r.why}")`);
  }

  /* ---- RUSL MA EKKI HRYNJA ---- */
  for (const bad of [undefined, null, {}, { draft: null, picks: null },
                     { draft: 7, picks: "nei", userId: 3 },
                     { draft: { draft_order: "nei" }, picks: [{}], userId: "x" }]) {
    let r = null, threw = false;
    try { r = resolveSeat(bad); } catch { threw = true; }
    ok(!threw && r && r.slot === null,
      `rusl-inntak gefur null an hruns: ${JSON.stringify(bad)}`);
  }

  /* ---- ORDIN SEM SKJARINN BIRTIR ERU A EINUM STAD ----
     Vidmotid les `SEAT_ROUTE_LABEL[route]`. Beri einhver leid ekki orð
     myndi skjarinn falla i "read from Sleeper" — sem er nakvaemlega su
     othekkjanlega setning sem `route` var buinn til ad leysa. */
  ok(SEAT_ROUTES.length === 3 &&
     SEAT_ROUTES.every((r) => typeof SEAT_ROUTE_LABEL[r] === "string"
                              && SEAT_ROUTE_LABEL[r].length > 8),
    `hver leid ber sin ord (${SEAT_ROUTES.map((r) =>
      `${r}="${SEAT_ROUTE_LABEL[r]}"`).join(" · ")})`);
  ok(new Set(Object.values(SEAT_ROUTE_LABEL)).size === SEAT_ROUTES.length,
    "og ordin eru olik — tvaer leidir med sama texta vaeru ein leid a skjanum");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
