/* ============================================================
   sleeper-league.js — DEILDIN LESIN UR SLEEPER. HREIN.

   Ekkert React, ekkert `fetch`. Thetta er VORPUNIN: Sleeper-svar inn,
   deildarsnid appsins ut. Ástaedan fyrir thvi ad hun er ser skra og
   utan .jsx er sama og annars stadar i thessu repo — profin verda ad
   geta keyrt NAKVAEMLEGA somu vorpun og appid notar. Vaeri hun inni i
   `DraftBoard.jsx` gaeti profid adeins profad AFRIT af henni.

   ============================================================
   HVERS VEGNA THETTA ER TIL
   ============================================================
   Adur bar appid EINN reit: draft-id. Notandinn limdi inn slod og
   appid strikadi ut tha sem voru farnir. Reglurnar — stigagjof, fjoldi
   lida, byrjunarsaeti, umferdir — voru slegnar inn i HENDI i
   flipastikunni, og thaer eru EKKI skraut: `teams` og `scoring` raeda
   badum hvada ADP er lesid OG hvar varamanns-threpid liggur (sja
   `model.js`). Deild sem er slegin inn rangt reiknar adra deild en
   notandinn spilar i — og hun gerir thad THOGULT, med tolum sem lita
   nakvaemlega eins ut.

   Sleeper ber allt thetta a OPNUM endapunktum med CORS-hausum. Enginn
   lykill, engin innskraning, ekkert leyndarmal. Innskraning vaeri
   STRICT VERRI: hun setti raunverulegt skilriki i vafra-app i OPNU
   repo-i og gaefi engin ny gogn.

   ============================================================
   TVAER GILDRUR SEM MAELDAR VORU A RAUNVERULEGRI DEILD
   (league 1389356308104249344, 12.8.2026)
   ============================================================
   1. `league.settings.draft_rounds` VAR 3. Draftid sjalft
      (`draft.settings.rounds`) bar **15**. Hefdum vid lesid deildina
      hefdi radgjofin talid ad thrjar umferdir vaeru eftir og aldrei
      sagt ther ad taka spyrnumann ne vorn. **Draftid er heimildin um
      draftid**; deildin er heimildin um reglurnar.

   2. `draft.draft_order` var `null` — Sleeper dregur rodina EFTIR ad
      deildin er stofnud. Thad er ekki bilun og ma ekki lesast eins og
      bilun. Saetid er tha OTHEKKT, og ver leysum thad i stad thess
      gegnum `slot_to_roster_id` -> `rosters[].owner_id` -> lidsheiti,
      svo notandinn geti SMELLT a lidid sitt.
   ============================================================ */

import { DEFAULT_LEAGUE, normalizeLeague } from "./build.js";
/* Sjalfgefnu DST-reglurnar bua i `scoring.js` MED maelingunni sinni og
   eru fluttar inn hedan — ekki afritadar. Afrit vaeri onnur utfaersla
   af somu toflu, og thetta repo ber tvo skjolud tilfelli af thvi hvad
   thad kostar (`buildTeamMetrics`, `makeEnricher`). */
import { BASE as BASE_DST } from "./scoring.js";

/* ============================================================
   1. SLODIN
   ============================================================
   Notandinn limir inn thad sem hann hefur i vafranum. Thad er
   YFIRLEITT deildarslod (`/leagues/{id}/predraft`) thvi thad er
   sidan sem madur er a fyrir draft — EKKI draft-slod, sem var thad
   eina sem gamla reitið tok vid.

   Gamla `extractDraftId` tok FYRSTA 6+ stafa tolustrenginn og kalladi
   hann draft-id. A deildarslod gaf thad DEILDAR-id sem draft-id, svo
   `/draft/{leagueId}` skiladi 404 og notandinn sa "Draft fannst ekki"
   fyrir slod sem var alveg rett. Tegundin verdur ad radast af
   SLODINNI, ekki af tolunni.                                        */

/**
 * Skilar `{ kind, id }` thar sem `kind` er:
 *   "league" — deildarslod, vid vitum thad fyrir vist
 *   "draft"  — draft-slod, vid vitum thad fyrir vist
 *   "id"     — bert audkenni; TVIRAETT, sa sem kallar verdur ad kanna
 *   null     — ekkert nothaeft i strengnum
 *
 * Bert audkenni er viljandi ekki gisk. Deildar- og draft-audkenni eru
 * bædi 19 stafa snjokorn og thau eru ekki adgreinanleg a forminu.
 */
export function parseSleeperInput(s) {
  const str = String(s == null ? "" : s).trim();
  if (!str) return { kind: null, id: null };

  /* Rodin skiptir mali: `/draft/nfl/123` ber lika tolustreng sem
     almenna reglan myndi gleypa. Serstoku mynstrin fyrst. */
  const league = str.match(/\/leagues?\/(\d{6,})/);
  if (league) return { kind: "league", id: league[1] };

  const draft = str.match(/\/drafts?\/(?:nfl\/)?(\d{6,})/);
  if (draft) return { kind: "draft", id: draft[1] };

  /* Bert audkenni. TVIRAETT viljandi: deildar- og draft-audkenni eru
     bædi 19 stafa snjokorn og eru EKKI adgreinanleg a forminu, svo sa
     sem kallar verdur ad kanna badar leidir. Vid herdum ekki a
     tolustafi — hafnad audkenni gefur "thetta er ekki slod", en
     audkenni sem er reynt gefur svar fra Sleeper sjalfum, sem er
     rettari villuboð. */
  const bare = str.match(/^([A-Za-z0-9_-]{2,})$/);
  if (bare) return { kind: "id", id: bare[1] };

  /* Slod med tolu einhvers stadar en engu thekktu mynstri — betra ad
     na audkenninu en ad hafna ollu. Tha er thad tviraett. */
  const any = str.match(/(\d{6,})/);
  return any ? { kind: "id", id: any[1] } : { kind: null, id: null };
}

/* ============================================================
   2. BYRJUNARSAETIN UR `roster_positions`
   ============================================================
   Sleeper ber saetin sem FYLKI i rod, eitt stak per saeti:
     ["QB","RB","RB","WR","WR","TE","FLEX","FLEX","K","DEF","BN",...]
   Appid vill TALNINGU (`{QB:1, RB:2, ...}`), svo thetta er talning
   — ekki vorpun stak fyrir stak.

   BEKKUR ER EKKI BYRJUNARSAETI. `BN`/`IR`/`TAXI` verda ad falla ut,
   annars taeldi `starters` 15 saeti i 10-lida deild og varamanns-
   threpid faeri ut i hafsauga (`replacementRanks` i `model.js`
   margfaldar saetafjoldann med lidafjoldanum).                     */

/** Sleeper-heiti -> okkar stodur. `DEF` er `DST` hja oss. */
const FLEX_KINDS = {
  FLEX:        ["RB", "WR", "TE"],
  WRRB_FLEX:   ["RB", "WR"],
  REC_FLEX:    ["WR", "TE"],
  SUPER_FLEX:  ["QB", "RB", "WR", "TE"],
};

const BENCH_KINDS = ["BN", "IR", "TAXI"];
/* IDP — sokn-eingongu likan. Thetta er ekki stutt og thad verdur ad
   SEGJAST; thogul sleppa vaeri deild sem reiknar annad en hun synir. */
const IDP_KINDS = ["DL", "LB", "DB", "IDP_FLEX", "DE", "DT", "CB", "SS", "FS", "LB_DB"];

/**
 * `roster_positions` -> `{ starters, flexPos, superflex, bench, idp, unknown }`
 *
 * `starters` notar okkar lykla (QB/RB/WR/TE/K/DST/FLEX/SUPERFLEX).
 * `flexPos` er stodurnar sem FLEX-saetid tekur. Appid ber EINN
 * `flexPos`-lista (sja `lineup.js`), svo deild sem blandar `FLEX` og
 * `REC_FLEX` faer SAMMENGID og vidvorun — ad velja annad thegjandi
 * vaeri ad reikna annad saeti en deildin hefur.
 */
export function startersFromRoster(rosterPositions) {
  const out = { starters: {}, flexPos: null, superflex: false,
                bench: 0, idp: 0, unknown: [], mixedFlex: false };
  if (!Array.isArray(rosterPositions)) return out;

  const flexSets = [];
  for (const raw of rosterPositions) {
    const p = String(raw || "").toUpperCase();
    if (!p) continue;

    if (BENCH_KINDS.includes(p)) { out.bench++; continue; }
    if (IDP_KINDS.includes(p)) { out.idp++; continue; }

    if (p === "SUPER_FLEX") {
      out.starters.SUPERFLEX = (out.starters.SUPERFLEX || 0) + 1;
      out.superflex = true;
      continue;
    }
    if (FLEX_KINDS[p]) {
      out.starters.FLEX = (out.starters.FLEX || 0) + 1;
      flexSets.push(FLEX_KINDS[p]);
      continue;
    }
    if (p === "DEF" || p === "DST" || p === "D/ST") {
      out.starters.DST = (out.starters.DST || 0) + 1;
      continue;
    }
    if (["QB", "RB", "WR", "TE", "K"].includes(p)) {
      out.starters[p] = (out.starters[p] || 0) + 1;
      continue;
    }
    out.unknown.push(p);
  }

  if (flexSets.length) {
    const uniq = [...new Set(flexSets.map((s) => s.join("/")))];
    out.mixedFlex = uniq.length > 1;
    out.flexPos = [...new Set(flexSets.flat())];
  }
  return out;
}

/* ============================================================
   3. STIGAGJOFIN
   ============================================================
   HER ER RAUNVERULEG TAKMORKUN OG HUN VERDUR AD VERA SYNILEG.

   Appid ber THRJAR stigagjafir og ekki fleiri — `ppr`, `half-ppr`,
   `standard` — thvi Sleeper-spain og ADP eru sott i nakvaemlega theim
   thremur afbrigdum (`pts_ppr`, `pts_half_ppr`, `pts_std` og somu thrju
   ADP-svid; sja `scripts/sources/sleeper.mjs`). Deild med `rec: 0,75`
   eda TE-premium er thvi EKKI reiknanleg her; hun er NALGUD.

   Su nalgun ma ekki fara thegjandi i gegn. Sama regla og verdspain i
   FPL-appinu: nalgun ma aldrei birtast sem vissa.                   */

/** Sleeper-sjalfgefid. Frávik hedan skekkja SPAINA, ekki bara talninguna. */
const CANON = {
  pass_yd: 0.04, pass_td: 4, pass_int: -1,
  rush_yd: 0.1, rush_td: 6,
  rec_yd: 0.1, rec_td: 6,
  fum_lost: -2,
};

/** Svid sem gera stigagjofina oreiknanlega fyrir okkar spa. */
const BONUS_FIELDS = [
  ["bonus_rec_te", "TE premium"],
  ["bonus_rec_wr", "WR reception bonus"],
  ["bonus_rec_rb", "RB reception bonus"],
  ["bonus_rush_yd_100", "100-yard rushing bonus"],
  ["bonus_rec_yd_100", "100-yard receiving bonus"],
  ["bonus_pass_yd_300", "300-yard passing bonus"],
];

/* ============================================================
   HANDSKRIFADUR LISTI RYRIR THEKJU I THOGN — THVI ER HANN SNUID VID
   ============================================================
   `BONUS_FIELDS` her fyrir ofan ber SEX svid. Sleeper hefur yfir
   hundrad, og hvert eitt sem er ekki a listanum FOR THEGJANDI I GEGN
   og deildin var merkt `exact: true` — the. "vid reiknum thetta rett"
   — thott hun gaefi stig fyrir eitthvad sem spain okkar hefur aldrei
   sed. Sama aett og hardkodadi safna-fjoldinn og handskrifadi
   blind-dalka-listinn: listinn stadnar, thekjan rýrnar, og ekkert
   segir fra thvi.

   ÞETTA ER RAUNVERULEGT MAL FYRIR NOTANDANN, ekki snyrtimennska.
   Hann spurdi: "getur verid erfidara fyrir WR ad fa stig en RB, sem
   ytir RB framar?" Svarid er JA og daemin eru raunveruleg:

     rec_fd  (stig fyrir fyrsta nidur vid mottoku)  hyglar WR og TE
     rush_fd (fyrsta nidur vid hlaup)               hyglar RB
     bonus_rush_att_20 (20+ hlaup i leik)           hyglar RB throat
     rec_yd 0,05 i stad 0,1                         helmingar WR-yarda

   Ekkert af THESSUM fjorum var a listanum. Deild med `rec_fd: 1` —
   sem er ordid algengt (PPFD) — hefdi lesid sem hrein PPR-deild og
   WR-arnir hefdu maelst kerfislaega LAGT, sem er nakvaemlega su
   skekkja sem notandinn spurdi um.

   REGLAN ER THVI SNUID VID: vid teljum upp thad sem vid VITUM ad se
   ohaett, og ALLT ANNAD er flaggad. Nytt Sleeper-svid sem enginn hefur
   sed birtist tha sem "unrecognised" i stad thess ad thegja.       */

/** Sjalfgefin gildi Sleeper fyrir SOKNAR-svid. Frávik = onnur deild. */
const OFF_DEFAULT = {
  pass_yd: 0.04, pass_td: 4, pass_int: -1, pass_2pt: 2,
  pass_fd: 0, pass_inc: 0, pass_att: 0, pass_cmp: 0, pass_sack: 0,
  pass_cmp_40p: 0, pass_td_40p: 0, pass_td_50p: 0,
  rush_yd: 0.1, rush_td: 6, rush_2pt: 2, rush_fd: 0, rush_att: 0,
  rush_td_40p: 0, rush_td_50p: 0,
  rec_yd: 0.1, rec_td: 6, rec_2pt: 2, rec_fd: 0, rec_att: 0,
  rec_td_40p: 0, rec_td_50p: 0, rec_0_4: 0, rec_5_9: 0, rec_10_19: 0,
  rec_20_29: 0, rec_30_39: 0, rec_40p: 0,
  /* MAELT 12.8.2026 — TVO GILDI HER VORU RONG OG BADI FLOGGUDU
     VENJULEGA DEILD. `fum` er EKKI `fum_lost`: Sleeper ber baedi svidin
     og sjalfgefid er `fum: 0` (fumble) a moti `fum_lost: -2` (tapadur
     fumble). Med `-2` her flaggadi hver einasta sjalfgefna deild
     "fum 0 (usually -2)".
     Stadfest a TVEIMUR ohadum deildum (2026- og 2025-utgafum sama
     nafns): baðar bera `fum: 0`, og ekki EITT svid er olikt milli
     theirra — sterkasta visbendingin sem til er um ad thetta se
     sjalfgefid og ekki stilling notandans. */
  fum: 0, fum_lost: -2, fum_rec_td: 6, fum_red_zone: 0,
  bonus_rec_te: 0, bonus_rec_wr: 0, bonus_rec_rb: 0,
  bonus_rush_yd_100: 0, bonus_rush_yd_200: 0,
  bonus_rec_yd_100: 0, bonus_rec_yd_200: 0,
  bonus_pass_yd_300: 0, bonus_pass_yd_400: 0,
  bonus_rush_att_20: 0, bonus_rush_rec_yd_100: 0, bonus_rush_rec_yd_200: 0,
  bonus_fd_te: 0, bonus_fd_wr: 0, bonus_fd_rb: 0, bonus_fd_qb: 0,
  idp_blk_kick: 0,
  /* `st_ff` og `st_fum_rec` eru 1 sjalfgefid, ekki 0 — sama maeling,
     sama nidurstada. (Og thau eru serlids-svid: thau hagga hvorki
     QB/RB/WR/TE-spa, svo thau attu aldrei ad geta flaggad deild.) */
  st_td: 6, st_ff: 1, st_fum_rec: 1, st_tkl_solo: 0,
};

/* Svid sem snerta ADEINS spyrnumann, vorn eda IDP. Their eru UTAN
   A-Ranking af maeldri astaedu (sja build.js), svo their mega vera
   hvad sem er an thess ad spain okkar skekkist. Prefix-listi, thvi
   thau eru tugir og OLL med sama forskeyti. */
const IGNORE_PREFIX = ["def_", "idp_", "fgm", "fga", "xp", "pts_allow",
  "yds_allow", "blk_", "sack", "int_ret", "safe", "tkl", "ff", "fum_rec",
  "pr_", "kr_", "punt", "sf", "td_"];
const IGNORE_EXACT = new Set(["rec", "int", "fum_rec", "def_st_td",
  "def_st_ff", "def_st_fum_rec", "def_st_tkl_solo", "st_fum_rec"]);

const ignorable = (k) => IGNORE_EXACT.has(k) ||
  IGNORE_PREFIX.some((p) => k.startsWith(p));

/* ============================================================
   3b. DST-REGLURNAR — LESNAR UR DEILDINNI, EKKI HARDKODADAR
   ============================================================
   `IGNORE_PREFIX` her fyrir ofan hunsar `def_`, `pts_allow`, `sack`,
   `safe`, `ff`, `fum_rec` og `blk_` VILJANDI — thau hagga ekki
   QB/RB/WR/TE-spanni og attu thess vegna aldrei ad flagga deild.
   **Thetta fall les nakvaemlega thau svid**, og thad er ekki mots0gn:
   thau eru gagnslaus fyrir soknarspaina og thau eru ALLT sem DST er.

   HVERS VEGNA THETTA ER LESID OG EKKI SOTT I `BASE`: `BASE.dstPtsAllowed`
   ber `pts_allow_14_20 = 1` af maeldri astaedu (sja `scoring.js`), en
   thad er *Sleeper-sjalfgefid*, ekki *thin deild*. Deild sem hefur
   breytt throskuldunum — og thad er algengt, thad er fyrsta thing sem
   fólk fiktar i — myndi fa RETTA TOLU UR RANGRI TOFLU.

   VANTI REGLA ER THAD SAGT, EKKI GISKAD. `missing` ber hvert svid sem
   deildin nefnir ekki; sa sem kallar ma birta thad. Ad thegja og nota
   sjalfgefid gildi vaeri omaeld tala med utlit maeldrar.               */

/** Sleeper-svid -> okkar DST-lyklar. EIN vorpun, engin onnur. */
const DST_FIELD = [
  ["sack", "dstSack"],
  ["int", "dstInt"],
  ["fum_rec", "dstFumRec"],
  ["safe", "dstSafety"],
  ["def_td", "dstTD"],
  ["blk_kick", "dstBlock"],
  ["ff", "dstFumForced"],
];
/** Throskuldarnir, i sömu röð og `BASE.dstPtsAllowed`. */
const DST_BRACKET = [
  ["pts_allow_0", 0], ["pts_allow_1_6", 6], ["pts_allow_7_13", 13],
  ["pts_allow_14_20", 20], ["pts_allow_21_27", 27], ["pts_allow_28_34", 34],
  ["pts_allow_35p", Infinity],
];
/* Svid sem eru RAUNVERULEG DST-stig i deildinni en sem gognin okkar geta
   EKKI reiknad. Gildin eru Sleeper-sjalfgefin og thau eru hofd hér til
   ad venjuleg deild fai ENGA vidvorun — sama regla og `fum: 0` ofar,
   sem flaggadi hverja einustu sjalfgefnu deild thegar hun var rong.
   Frávik fra thessum tolum ER hins vegar sagt. */
const DST_UNMODELLED = {
  /* serlids-endurheimt og -fumble. nflverse `fumble_recovery_opp` og
     `def_fumbles_forced` blanda theim vid varnar-tolurnar, svo their eru
     TALDIR MED en a ROMGU verdi. Maelt: +1 i 27 af 544 lidsvikum. */
  def_st_ff: 1, def_st_fum_rec: 1, st_ff: 1, st_fum_rec: 1,
  st_td: 6, st_tkl_solo: 0, def_st_tkl_solo: 0,
  def_2pt: 0, def_forced_punts: 0, fg_blkd: 0, blk_kick_ret_yd: 0,
  yds_allow_0_100: 0, yds_allow_100_199: 0, yds_allow_200_299: 0,
  yds_allow_300_349: 0, yds_allow_350_399: 0, yds_allow_400_449: 0,
  yds_allow_450_499: 0, yds_allow_500_549: 0, yds_allow_550p: 0,
  yds_allow: 0, pts_allow: 0,
};

/**
 * `scoring_settings` -> DST-reglur fyrir `dstPoints`.
 *
 * Skilar `{ rules, exact, missing, unmodelled, warnings }` thar sem
 * `rules` er hlutur sem ma senda beint sem `R` i `dstPoints`.
 *
 * `exact === false` thydir „deildin ber DST-reglu sem vid reiknum ekki"
 * — og eins og annars stadar i thessari skra verdur thad ad SJAST.
 */
export function dstRulesFromSettings(ss) {
  const s = ss && typeof ss === "object" ? ss : {};
  const num = (k) => (Number.isFinite(Number(s[k])) && s[k] !== null && s[k] !== ""
    ? Number(s[k]) : null);

  const rules = {};
  const missing = [];
  for (const [key, ours] of DST_FIELD) {
    const v = num(key);
    if (v == null) { missing.push(key); rules[ours] = BASE_DST[ours]; }
    else rules[ours] = v;
  }
  /* `def_st_td` er svidid sem Sleeper-stigin okkar poruðust vid; `st_td`
     er samheiti sem sumar deildir bera i stadinn. Baðar leidir, i
     thessari rod, og hvorug thegjandi. */
  const stTd = num("def_st_td") ?? num("st_td");
  if (stTd == null) { missing.push("def_st_td"); rules.dstStTD = BASE_DST.dstStTD; }
  else rules.dstStTD = stTd;

  /* Throskuldarnir. VANTI EINN ER TAFLAN EKKI HALFNOTUD — hun er
     endurbyggd ur sjalfgefnu OG svidid er skrad i `missing`. Half tafla
     vaeri verri en engin: hun gefur rett svar a sumum bilum og rangt a
     odrum, og ekkert i utkomunni segir hvar. */
  const table = [];
  for (let i = 0; i < DST_BRACKET.length; i++) {
    const [key, hi] = DST_BRACKET[i];
    const v = num(key);
    if (v == null) { missing.push(key); table.push([hi, BASE_DST.dstPtsAllowed[i][1]]); }
    else table.push([hi, v]);
  }
  rules.dstPtsAllowed = table;

  const unmodelled = [];
  for (const [k, def] of Object.entries(DST_UNMODELLED)) {
    const v = num(k);
    if (v != null && v !== def) unmodelled.push(`${k} ${v} (usually ${def})`);
  }

  const warnings = [];
  if (missing.length) {
    warnings.push(`This league does not list ${missing.join(", ")} in its DST ` +
      `scoring, so Sleeper's default is used for those. Every other DST rule ` +
      `below is read from your league.`);
  }
  if (unmodelled.length) {
    warnings.push(`DST rules we cannot compute: ${unmodelled.join(", ")}. They ` +
      `are real points in your league, so the DST numbers read low.`);
  }
  return { rules, exact: !missing.length && !unmodelled.length,
           missing, unmodelled, warnings };
}

/**
 * `scoring_settings` -> `{ scoring, rec, exact, warnings }`
 *
 * `exact === false` thydir "vid notum naesta afbrigdi og thad er
 * NALGUN". Sa sem kallar verdur ad birta thad.
 */
export function scoringFromSettings(ss) {
  const s = ss && typeof ss === "object" ? ss : {};
  const warnings = [];
  const rec = Number.isFinite(Number(s.rec)) ? Number(s.rec) : null;

  let scoring = "ppr", exact = true;
  if (rec == null) {
    /* Ekkert `rec`-svid. Sleeper sleppir thvi ekki i raun, svo thetta
       er oheilt svar — ekki "standard". Sjalfgefna appsins stendur. */
    scoring = DEFAULT_LEAGUE.scoring;
    exact = false;
    warnings.push("No `rec` value in the league scoring — kept the current setting.");
  } else if (rec === 1) scoring = "ppr";
  else if (rec === 0.5) scoring = "half-ppr";
  else if (rec === 0) scoring = "standard";
  else {
    /* Naesta af theim thremur sem vid EIGUM spa fyrir. */
    const cands = [["ppr", 1], ["half-ppr", 0.5], ["standard", 0]];
    cands.sort((a, b) => Math.abs(a[1] - rec) - Math.abs(b[1] - rec));
    scoring = cands[0][0];
    exact = false;
    warnings.push(
      `This league gives ${rec} per reception. Projections exist only for ` +
      `1.0 / 0.5 / 0 — using ${cands[0][0]}, which is an approximation.`);
  }

  for (const [k, label] of BONUS_FIELDS) {
    const v = Number(s[k]);
    if (Number.isFinite(v) && v !== 0) {
      exact = false;
      warnings.push(`${label} (${k} = ${v}) is not in the projections — ` +
                    `players at that position will read low.`);
    }
  }

  /* Frávik fra sjalfgefnu — LEITT UT AF THVI SEM DEILDIN BER, ekki
     af lista yfir thad sem vid munum ad athuga. */
  const off = [], unknown = [];
  /* Svidin sem BONUS_FIELDS nefndi thegar med mannamali eru ekki
     nefnd aftur her — tvo skilabod um sama reit lesa eins og tvo
     vandamal. */
  const named = new Set(BONUS_FIELDS.map(([k]) => k));
  for (const [k, raw] of Object.entries(s)) {
    if (ignorable(k) || named.has(k)) continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    if (Object.prototype.hasOwnProperty.call(OFF_DEFAULT, k)) {
      if (v !== OFF_DEFAULT[k]) off.push(`${k} ${v} (usually ${OFF_DEFAULT[k]})`);
    } else if (v !== 0) {
      /* Svid sem vid hofum aldrei sed OG er ekki null. Vid vitum ekki
         hvad thad gerir, og thad er nakvaemlega thess vegna sem thad
         verdur ad sjast. */
      unknown.push(`${k} ${v}`);
    }
  }
  if (off.length) {
    exact = false;
    warnings.push(`Non-standard scoring: ${off.join(", ")}. The projections are ` +
                  `Sleeper's own at default values, so those positions shift.`);
  }
  if (unknown.length) {
    exact = false;
    warnings.push(`Scoring settings we do not model: ${unknown.join(", ")}. ` +
                  `They are real points in your league but are not in the ` +
                  `projections, so affected positions will read low.`);
  }

  return { scoring, rec, exact, warnings, offsets: off, unmodelled: unknown };
}

/* ============================================================
   4. STODU-THAKID — HER ER EKKI FUNDID UPP A TOLU
   ============================================================
   `maxPos` er EKKI deildarregla. Thad er hegdunar-thak i draft-
   herminum: hve marga af hverri stodu MADUR draftar. Talan
   `{QB:2, RB:6, WR:7, TE:2}` var maeld (sja `accuracy.js`) i
   12-lida deild med QB1/RB2/WR3/TE1/FLEX1.

   FREISTNIN ER AD SKALA HANA eftir innfluttri deild — t.d. "tvo FLEX
   saeti, tha ma TE-thakid vera 4". Su tala vaeri OMAELD og hun
   myndi lita nakvaemlega eins ut og maelda talan vid hlidina. Thad er
   versta utkoman i thessu repo-i.

   Thess vegna er thakid latid STANDA, og eina breytingin sem er gerd
   er RETTLEIKS-GOLF: thakid ma ekki vera laegra en fjoldi saeta sem
   VERDUR ad fylla, annars gaeti hermunin ekki fyllt byrjunarlidid.
   Thad er ekki fínstilling, thad er ad forda omoguleika.

   Se logun deildarinnar ekki ein af theim sem VORU maeldar
   er thad SAGT — sja `edgeSentence` i `src/rulebasis.js`.           */
export function maxPosFor(starters, superflex) {
  const st = starters || {};
  const base = DEFAULT_LEAGUE.maxPos;
  const out = {};
  for (const pos of Object.keys(base)) {
    let need = st[pos] || 0;
    /* Superflex-saetid er i raun fyllt af QB i flestum tilfellum, svo
       thakid verdur ad leyfa thann mann. Adrar stodur geta fyllt thad
       lika og thaer eiga sin eigin, haerri thok hvort ed er. */
    if (pos === "QB" && superflex) need += st.SUPERFLEX || 1;
    out[pos] = Math.max(base[pos], need);
  }
  return out;
}

/* ============================================================
   6. LIDIN — SVO SAETID SE VALID, EKKI SLEGID INN
   ============================================================
   Saetid er thad sem gerir tenginguna heila: an thess strikar appid
   ut tha sem eru farnir en THINN hopur fyllist aldrei, svo "hvern a
   ad taka naest" veit ekki hvad thu att.

   THRJAR LEIDIR AD SAETINU, i thessari rod:
     1. `draft_order[user_id]` — beint, thegar rodin er dregin
     2. `slot_to_roster_id` + `rosters[].owner_id` — virkar THOTT
        rodin se ekki dregin, thvi saeti->hopur er sett vid stofnun
     3. notandinn slaer inn tolu

   Leid 2 er astaedan fyrir thessu falli: a raunverulegri deild var
   `draft_order` NULL og leid 1 gaf ekkert. Ad birta lidsheitin og
   lata notandann smella er bædi opinbert og oyggjandi.              */
export function teamsFromLeague({ draft, users, rosters }) {
  const byUser = new Map();
  for (const u of Array.isArray(users) ? users : []) {
    if (u && u.user_id) byUser.set(String(u.user_id), u);
  }
  const byRoster = new Map();
  for (const r of Array.isArray(rosters) ? rosters : []) {
    if (r && r.roster_id != null) byRoster.set(Number(r.roster_id), r);
  }

  const order = draft && draft.draft_order && typeof draft.draft_order === "object"
    ? draft.draft_order : null;
  const s2r = draft && draft.slot_to_roster_id && typeof draft.slot_to_roster_id === "object"
    ? draft.slot_to_roster_id : null;

  const out = [];
  const seen = new Set();

  const push = (slot, userId) => {
    const key = `${slot}|${userId || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    const u = userId ? byUser.get(String(userId)) : null;
    out.push({
      slot: slot == null ? null : Number(slot),
      userId: userId ? String(userId) : null,
      /* `team_name` er valfritt i Sleeper; `display_name` er alltaf
         thar. Bædi vantad -> saetatala, aldrei "undefined" a skja. */
      name: (u && u.metadata && u.metadata.team_name) ||
            (u && u.display_name) ||
            (slot != null ? `Slot ${slot}` : "Unknown"),
    });
  };

  if (order) {
    for (const [userId, slot] of Object.entries(order)) {
      if (Number.isFinite(Number(slot))) push(Number(slot), userId);
    }
  }
  if (s2r) {
    for (const [slot, rosterId] of Object.entries(s2r)) {
      const r = byRoster.get(Number(rosterId));
      const uid = r && r.owner_id ? String(r.owner_id) : null;
      /* Se saetid thegar komid ur `draft_order` ma thad ekki
         tvitakast — thess vegna er `seen` a saeti+notanda. */
      if (!out.some((t) => t.slot === Number(slot))) push(Number(slot), uid);
    }
  }
  /* Ekkert saetakort til: birtum tha lidin an saetis svo notandinn
     sjai ad thau eru thekkt, en slaí inn saetid sjalfur. */
  if (!out.length) {
    for (const u of Array.isArray(users) ? users : []) push(null, u.user_id);
  }

  out.sort((a, b) => (a.slot == null ? 1e9 : a.slot) - (b.slot == null ? 1e9 : b.slot));
  return out;
}

/* ============================================================
   7. ALLT SAMAN — SLEEPER-SVAR INN, DEILDARSNID UT
   ============================================================ */

/**
 * `{ league, draft, shapes }` -> `{ league, imported, warnings }`
 *
 * `league`   Sleeper `/league/{id}`  (reglurnar)
 * `draft`    Sleeper `/draft/{id}`   (draftid — HEIMILDIN um umferdir,
 *                                     lidafjolda og tegund)
 * `shapes`   `shapes_sleeper.json`   (valfrjalst — "var thetta maelt?")
 *
 * Utkoman fer gegnum `normalizeLeague`, svo innflutt deild getur ekki
 * komid appinu i verra astand en handvirkt innslattur gat.
 */
export function leagueFromSleeper({ league: lg, draft, shapes } = {}) {
  const warnings = [];
  const L = lg && typeof lg === "object" ? lg : {};
  const D = draft && typeof draft === "object" ? draft : {};
  const dset = D.settings && typeof D.settings === "object" ? D.settings : {};
  const lset = L.settings && typeof L.settings === "object" ? L.settings : {};

  /* --- fjoldi lida ---
     Draftid fyrst: thad er thad sem er raunverulega draftad i. */
  const teams = num(dset.teams) ?? num(L.total_rosters) ?? num(lset.num_teams);

  /* --- byrjunarsaeti --- */
  const rp = startersFromRoster(L.roster_positions);
  const starters = Object.keys(rp.starters).length ? rp.starters : null;
  if (!starters) {
    warnings.push("No `roster_positions` in the league — starting slots kept as they were.");
  }
  if (rp.idp > 0) {
    warnings.push(`${rp.idp} IDP slot${rp.idp > 1 ? "s" : ""} (DL/LB/DB) — this app ` +
                  `models offence only, so those slots are ignored.`);
  }
  if (rp.unknown.length) {
    warnings.push(`Unrecognised roster slots: ${[...new Set(rp.unknown)].join(", ")}.`);
  }
  if (rp.mixedFlex) {
    warnings.push("This league mixes flex types (e.g. FLEX and REC_FLEX). The app " +
                  "carries one flex definition, so the union is used.");
  }

  /* --- stigagjof --- */
  const sc = scoringFromSettings(L.scoring_settings);
  warnings.push(...sc.warnings);

  /* `draft.metadata.scoring_type` er ANNAD svid og thau geta rekid i
     sundur. Reglurnar (`scoring_settings.rec`) eru heimildin; hitt er
     merking. Vid THEGJUM ekki um osamraemi. */
  const metaType = D.metadata && D.metadata.scoring_type
    ? String(D.metadata.scoring_type).toLowerCase() : null;
  if (metaType) {
    const asOurs = metaType === "std" ? "standard"
                 : metaType.replace("_", "-").replace("half-ppr", "half-ppr");
    if (["ppr", "half-ppr", "standard"].includes(asOurs) && asOurs !== sc.scoring) {
      warnings.push(`The draft is labelled "${metaType}" but the league scores ` +
                    `${sc.rec} per reception — using the league rules.`);
    }
  }

  /* --- umferdir ---
     MAELT A RAUNVERULEGRI DEILD: `league.settings.draft_rounds` var 3
     thar sem draftid bar 15. Deildar-svidið er ONYTT her. */
  const rounds = num(dset.rounds) ?? num(lset.draft_rounds);

  /* --- thakid og logunin --- */
  const superflex = rp.superflex;
  const draftShape = {
    ...DEFAULT_LEAGUE,
    ...(teams != null ? { teams } : {}),
    ...(starters ? { starters } : {}),
    ...(rp.flexPos ? { flexPos: rp.flexPos } : {}),
    ...(rounds != null ? { rounds } : {}),
    scoring: sc.scoring,
    superflex,
  };
  draftShape.maxPos = maxPosFor(draftShape.starters, superflex);

  const out = normalizeLeague(draftShape);

  /* --- thad sem likanid getur ekki heidrad --- */
  if (D.type && D.type !== "snake" && D.type !== "linear") {
    warnings.push(`This is a ${D.type} draft. The board still prices players, but ` +
                  `pick order and "who is left at your next pick" assume snake order.`);
  }
  if (num(lset.best_ball) === 1) {
    warnings.push("Best ball league — there is no weekly lineup to set, so the " +
                  "My team tab's start/sit advice does not apply.");
  }
  /* ============================================================
     KEEPER-DEILD RAEÐST AF `settings.type`, EKKI AF `max_keepers`
     ============================================================
     FYRSTA UTGAFAN FLAGGADI RETTA DEILD SEM KEEPER-DEILD OG THAD VAR
     FALS-JAKVAETT AF VERSTU GERD: vidvorun sem kviknar a ALGENGRI,
     venjulegri deild er hávaði, og notandinn laerir a viku ad hunsa
     kassann. Tha er raunveruleg vidvorun jafn gagnslaus og engin.
     Athugasemdin vid vidvaranirnar i `DraftBoard.jsx` segir thetta
     sjalf — og kodinn braut hana samt.

     MAELT 12.8.2026 a deild 1389356308104249344 og forvera hennar:

       settings.type          0        <- 0 redraft · 1 keeper · 2 dynasty
       settings.max_keepers   1        <- SLEEPER-SJALFGEFID, segir EKKERT
       previous_league_id     sett     <- deildin var endurnyjud, ekkert meira
       is_keeper i 150 volum  null i OLLUM

     Baðar visbendingarnar sem fyrsta utgafan notadi eru thvi rangar:
     `max_keepers: 1` er sjalfgefna gildid i HVERRI deild, og
     `previous_league_id` er sett a hverja deild sem er endurnyjud milli
     tímabila — sem redraft-deildir eru alltaf.

     `settings.type` er svidid sem Sleeper notar sjalft. `taxi_slots`
     fylgir med thvi taxi-saeti eru dynasty-smid og eru merkid thegar
     `type` vantar i svarinu.                                          */
  const ltype = num(lset.type);
  const taxi = num(lset.taxi_slots) || 0;
  if (ltype >= 1 || taxi > 0) {
    const kind = ltype === 2 ? "dynasty" : "keeper";
    const keepers = num(lset.max_keepers) || 0;
    warnings.push(
      `This is a ${kind} league` +
      (keepers > 0 && ltype === 1 ? ` (${keepers} keeper${keepers > 1 ? "s" : ""} each)` : "") +
      `. ADP and ECR on the board are redraft numbers, so kept players are ` +
      `priced as if they were still in the pool.`);
  }

  /* ============================================================
     LOGUNAR-VIDVORUNIN VAR FJARLAEGD 12.8.2026 — HUN VAR ORDIN OSONN
     ============================================================
     Hér stod `unmeasuredShape(out, shapes)`, sem las ADEINS
     `shapes_sleeper.json`. Sú skra ber aðeins EINN-FLEX logun, svo
     BADAR raunverulegu deildir notandans fengu "this shape has not been
     backtested":
       Patriots   10-2flex ppr
       Sofahetjur 12-2flex half
     Bædi eru NU maeld (`half-lab` -> `data/measure/half.json`): +186,1
     (11/11, t=4,10) og +147,4 (10/11, t=3,44). Vidvorunin var thvi
     fals-jakvaett a hverri deild sem notandinn spilar i — sami flokkur
     og keeper-vidvorunin sem var tekin ut sama dag, og sama afleiding:
     kassi sem er alltaf raudur haettir ad segja neitt.

     Uppflettingin a maeldri logun byr nu i `src/rulebasis.js`
     (`edgeSentence`), sem les BAEDI toflurnar og ber theer thrjar
     reglur sem gilda: omaeld logun faer ENGA tolu, omarktaek logun
     les ekki eins og marktaek, og varfaerna talan er birt. Vidmotid
     birtir hana; vorpunin fullyrdir ekkert um logun.                */

  return {
    league: out,
    imported: {
      leagueId: L.league_id ? String(L.league_id) : null,
      draftId: D.draft_id ? String(D.draft_id) : null,
      name: L.name || null,
      season: L.season || D.season || null,
      status: L.status || null,
      draftStatus: D.status || null,
      draftType: D.type || null,
      teams: out.teams,
      rounds: out.rounds,
      scoring: out.scoring,
      rec: sc.rec,
      exactScoring: sc.exact,
      superflex,
      bench: rp.bench,
      starters: out.starters,
      flexPos: out.flexPos || null,
      orderDrawn: !!(D.draft_order && Object.keys(D.draft_order).length),
      /* ============================================================
         URSLITAKEPPNIN — REGLA DEILDARINNAR, OG HUN VAR EKKI BORIN MED
         ============================================================
         `standingsFrom` les `league.settings.playoff_teams` og
         `settings.num_teams`. Forsidan sendir `entry.imported` inn og
         hann bar HVORUGT, svo `playoffTeams` var ALLTAF `null`:
         "Top N make the playoffs" birtist aldrei, `●`-merkid aldrei, og
         heilbrigdisathugunin (`playoffTeams > numTeams`) gat aldrei
         kviknad. `tests/standings.mjs` profar cutid i NIU fullyrdingum
         a tilbunum `league.settings` — hrein rokfraedi, fullkomlega
         profud, aldrei kollud med nytilegu inntaki.

         Bædi svid eru THEGAR i `L.settings`, sem thetta fall les. Þau
         voru einfaldlega ekki tekin med.

         `playoffWeekStart` fylgir thvi hun er forsenda thess ad vita
         hvada vikur telja: waiver-gjaldmidillinn "rest-of-season" (sja
         `waivers.js`) tharf ad vita hvenaer reglulegu vikurnar HAETTA,
         annars pro-rata-r hann yfir vikur sem lidid spilar ekki.        */
      playoffTeams: num(L.settings && L.settings.playoff_teams),
      playoffWeekStart: num(L.settings && L.settings.playoff_week_start),
    },
    warnings,
  };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
