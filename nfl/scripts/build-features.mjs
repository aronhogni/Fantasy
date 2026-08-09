#!/usr/bin/env node
/* ============================================================
   build-features.mjs — byggir MAELIBORDID: eina rod per leikmann
   per timabil, med ollu sem VAR VITAD FYRIR thad timabil og thvi
   sem gerdist i thvi.

     node scripts/build-features.mjs

   -> data/features.json

   HVERS VEGNA THETTA ER SER SKREF: spurningin "hvad spair thvi hverjir
   verda godir" er ekki haegt ad svara an toflu thar sem INNTAK og
   UTKOMA eru adskilin i tima. Hver einasta villa i thessu tagi af
   verkefni er LEKI — svid sem litur ut eins og spa en er i raun
   utkoman. FPL-verkefnid missti heilt bakprof i thad (`selected_by_
   percent` ur archive-skra sem er LOKASTADA, ekki upphafsstada).

   REGLAN HER: hvert svid ber ARID SEM THAD KEMUR UR i nafninu.
   `prevPpg` er ur N-1. `adp` er tekid i AGUST fyrir N. `ppg` er
   utkoma N. Ekkert svid ma vera reiknad ur N nema utkomu-svidin.

   ADP-GOGNIN eru sott fra FantasyFootballCalculator med `year=N`, og
   theirra glugga-dagsetningar (`start_date`/`end_date`) eru SKRIFADAR
   I SKRANA svo haegt se ad sannreyna ad thau seu fra thvi FYRIR
   fyrsta leik. Maelt: 2015-2025 eru oll tekin 25. agust - 9. sept.
   ============================================================ */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getText, getJSON, record, pool, sourceReport } from "./lib/http.mjs";
import { objects, num, str } from "./lib/csv.mjs";
import { offensePoints, kickerPoints, normPos } from "../src/scoring.js";
import { normTeam, buildIndexes, matchByName } from "../src/names.js";

const OUT = path.resolve(process.cwd(), "data");
const REL = "https://github.com/nflverse/nflverse-data/releases/download";

/* Utkomu-timabil. 2015 er nedri mork thvi FFC-ADP byrjar thar; 2013
   er sott sem INNTAK (N-2 fyrir 2015) en er aldrei utkoma. */
const FIRST_OUTCOME = 2015;
const LAST_OUTCOME = 2025;
const FETCH_FROM = FIRST_OUTCOME - 2;          // 2013

const WEEK_COLS = [
  "player_id", "player_display_name", "position", "season", "week", "season_type",
  "team", "opponent_team",
  "completions", "attempts", "passing_yards", "passing_tds", "passing_interceptions",
  "passing_2pt_conversions", "sack_fumbles_lost",
  "carries", "rushing_yards", "rushing_tds", "rushing_fumbles_lost",
  "rushing_2pt_conversions",
  "receptions", "targets", "receiving_yards", "receiving_tds",
  "receiving_air_yards", "receiving_fumbles_lost", "receiving_2pt_conversions",
  "target_share", "air_yards_share", "wopr",
  "special_teams_tds", "fumbles_lost_total", "fumble_recovery_tds",
];

const PPR = { passYd: 0.04, passTD: 4, passInt: -1, pass2pt: 2, rushYd: 0.1,
  rushTD: 6, rush2pt: 2, rec: 1, recBonusTE: 0, recYd: 0.1, recTD: 6, rec2pt: 2,
  fumbleLost: -2, fumbleRecTD: 6, specialTeamsTD: 6 };

async function main() {
  const years = [];
  for (let y = FETCH_FROM; y <= LAST_OUTCOME; y++) years.push(y);

  /* ---------- 1. VIKULEG GOGN ---------- */
  console.log(`saeki vikuleg gogn ${FETCH_FROM}-${LAST_OUTCOME} …`);
  const weekly = new Map();
  await pool(years, 3, async (yr) => {
    const txt = await getText(`${REL}/stats_player/stats_player_week_${yr}.csv`);
    const rows = [];
    for (const r of objects(txt, WEEK_COLS)) {
      if (r.season_type !== "REG") continue;
      const pos = normPos(r.position);
      if (!["QB", "RB", "WR", "TE"].includes(pos)) continue;
      const v = {};
      for (const k of WEEK_COLS) {
        v[k] = ["player_id", "player_display_name", "position", "season_type",
                "team", "opponent_team"].includes(k) ? str(r[k]) : num(r[k]);
      }
      const ppr = offensePoints(v, PPR, pos);
      rows.push({
        id: v.player_id, name: v.player_display_name, pos,
        season: v.season, week: v.week, team: normTeam(v.team),
        ppr, std: ppr - (v.receptions || 0),
        tgt: v.targets || 0, rec: v.receptions || 0, recy: v.receiving_yards || 0,
        car: v.carries || 0, ry: v.rushing_yards || 0,
        att: v.attempts || 0, py: v.passing_yards || 0,
        ptd: v.passing_tds || 0, rtd: v.rushing_tds || 0, rectd: v.receiving_tds || 0,
        ay: v.receiving_air_yards || 0,
        tshare: v.target_share, ayshare: v.air_yards_share, wopr: v.wopr,
      });
    }
    weekly.set(yr, rows);
    record(`weekly_${yr}`, true, `${rows.length} player weeks`);
  });

  /* ---------- 2. TIMABILS-SUMMUR ---------- */
  const seasons = new Map();               // `${id}|${year}` -> agg
  for (const [yr, rows] of weekly) {
    const by = new Map();
    for (const r of rows) {
      let a = by.get(r.id);
      if (!a) {
        a = { id: r.id, name: r.name, pos: r.pos, season: yr, team: r.team,
              g: 0, ppr: 0, std: 0, tgt: 0, rec: 0, recy: 0, car: 0, ry: 0,
              att: 0, py: 0, td: 0, ay: 0, tsSum: 0, tsN: 0, woSum: 0, woN: 0 };
        by.set(r.id, a);
      }
      a.g++; a.team = r.team;
      a.ppr += r.ppr; a.std += r.std;
      a.tgt += r.tgt; a.rec += r.rec; a.recy += r.recy;
      a.car += r.car; a.ry += r.ry; a.att += r.att; a.py += r.py;
      a.ay += r.ay;
      a.td += r.rtd + r.rectd + r.ptd;
      if (r.tshare != null) { a.tsSum += r.tshare; a.tsN++; }
      if (r.wopr != null) { a.woSum += r.wopr; a.woN++; }
    }
    for (const a of by.values()) {
      a.ppg = a.ppr / a.g;
      a.ppgStd = a.std / a.g;
      a.tgtG = a.tgt / a.g;
      a.carG = a.car / a.g;
      a.touchG = (a.car + a.rec) / a.g;
      a.oppG = (a.car + a.tgt) / a.g;            // "opportunity"
      a.tshare = a.tsN ? a.tsSum / a.tsN : null;
      a.wopr = a.woN ? a.woSum / a.woN : null;
      a.ypc = a.car ? a.ry / a.car : null;
      a.ypt = a.tgt ? a.recy / a.tgt : null;
      a.tdG = a.td / a.g;
      a.ayG = a.ay / a.g;
      seasons.set(`${a.id}|${yr}`, a);
    }
  }
  console.log(`timabils-summur: ${seasons.size}`);

  /* ---------- 3. LIDS-SAMHENGI OG LIDSSTYRKUR ----------
     Notandinn spurdi beint: er thad styrkur lidsins? Til ad svara thvi
     tharf lidsstyrkur ad vera MAELDUR, ekki bara "hradí og sendihlutfall".
     Thess vegna eru sott raunveruleg lidsstig ur leikjaskranni (skorud
     og a sig) — thau eru besta einfalda maelistikan a soknarstyrk. */
  const teamSeason = new Map();
  for (const [yr, rows] of weekly) {
    const by = new Map();
    for (const r of rows) {
      const a = by.get(r.team) || { att: 0, car: 0, py: 0, ry: 0, weeks: new Set() };
      a.att += r.att; a.car += r.car; a.py += r.py; a.ry += r.ry;
      a.weeks.add(r.week);
      by.set(r.team, a);
    }
    for (const [team, a] of by) {
      const g = a.weeks.size || 1;
      teamSeason.set(`${team}|${yr}`, {
        playsG: (a.att + a.car) / g,
        passRate: a.att + a.car ? a.att / (a.att + a.car) : null,
        ydsG: (a.py + a.ry) / g,
        opps: a.att + a.car,          // nefnari fyrir hlutdeild leikmanns
      });
    }
  }

  /* Lidsstig ur leikjaskranni — soknarstyrkur og varnarstyrkur. */
  {
    const gtxt = await getText(`${REL}/schedules/games.csv`);
    const games = objects(gtxt, ["season", "game_type", "away_team", "home_team",
      "away_score", "home_score"]);
    const agg = new Map();
    for (const g of games) {
      if (g.game_type !== "REG") continue;
      const yr = num(g.season);
      if (yr == null || num(g.home_score) == null) continue;
      const add = (t, pf, pa) => {
        const k = `${normTeam(t)}|${yr}`;
        const a = agg.get(k) || { pf: 0, pa: 0, g: 0 };
        a.pf += pf; a.pa += pa; a.g++;
        agg.set(k, a);
      };
      add(g.home_team, num(g.home_score), num(g.away_score));
      add(g.away_team, num(g.away_score), num(g.home_score));
    }
    for (const [k, a] of agg) {
      const t = teamSeason.get(k) || {};
      t.pfG = a.g ? a.pf / a.g : null;
      t.paG = a.g ? a.pa / a.g : null;
      t.margin = a.g ? (a.pf - a.pa) / a.g : null;
      teamSeason.set(k, t);
    }
    record("team_strength", agg.size > 300, `${agg.size} team-seasons scored`);
  }

  /* ---------- 3b. MEIDSLASAGA ----------
     Notandinn spurdi um "injury record". Tvaer olikar staerdir og thaer
     maela EKKI thad sama:
       missti leiki   — utkoma (hann var ekki tiltaekur)
       a meidslaskra  — merki (hann var vafamal, hvort sem hann spiladi)
     Sidari er faganlegri: leikmadur sem er a skra 9 vikur en spilar
     allar er samt ad bera merki. Bædi eru med, adskilin. */
  const injRecord = new Map();             // `${gsis}|${year}` -> { onReport, outWeeks }
  {
    const yrsInj = [];
    for (let y = FETCH_FROM; y <= LAST_OUTCOME; y++) yrsInj.push(y);
    await pool(yrsInj, 3, async (yr) => {
      try {
        const t = await getText(`${REL}/injuries/injuries_${yr}.csv`);
        for (const r of objects(t, ["season", "week", "gsis_id", "report_status"])) {
          const id = str(r.gsis_id);
          if (!id) continue;
          const k = `${id}|${yr}`;
          const a = injRecord.get(k) || { onReport: 0, outWeeks: 0 };
          a.onReport++;
          const st = str(r.report_status);
          if (st === "Out" || st === "Doubtful") a.outWeeks++;
          injRecord.set(k, a);
        }
      } catch { /* eldri ar geta vantad — thad er skrad i thekju */ }
    });
    record("injury_history", injRecord.size > 5000,
      `${injRecord.size} player-seasons with an injury report row`);
  }

  /* ---------- 4. LEIKMANNA-BIO (aldur, draft) ---------- */
  const bioTxt = await getText(`${REL}/players/players.csv`);
  const bio = new Map();
  for (const r of objects(bioTxt, ["gsis_id", "display_name", "birth_date",
      "rookie_season", "draft_year", "draft_round", "draft_pick", "position"])) {
    const id = str(r.gsis_id);
    if (!id) continue;
    bio.set(id, {
      born: str(r.birth_date), rookie: num(r.rookie_season),
      draftYear: num(r.draft_year), draftRound: num(r.draft_round),
      draftPick: num(r.draft_pick),
    });
  }
  record("players_bio", true, `${bio.size} players`);

  /* ---------- 5. ADP — MARKADURINN, TEKINN FYRIR TIMABILID ---------- */
  const adp = new Map();                   // `${year}|${scoring}` -> { rows, meta }
  const adpYears = [];
  for (let y = FIRST_OUTCOME; y <= LAST_OUTCOME; y++) adpYears.push(y);
  await pool(adpYears.flatMap((y) => [[y, "ppr"], [y, "standard"]]), 3,
    async ([y, sc]) => {
      try {
        const d = await getJSON(
          `https://fantasyfootballcalculator.com/api/v1/adp/${sc}?teams=12&year=${y}`);
        if (d.status !== "Success" || !d.players) return;
        adp.set(`${y}|${sc}`, {
          meta: d.meta,
          rows: d.players.map((p) => ({
            name: p.name, pos: normPos(p.position), team: normTeam(p.team),
            adp: p.adp, sd: p.stdev, times: p.times_drafted,
          })).filter((p) => ["QB", "RB", "WR", "TE"].includes(p.pos)),
        });
      } catch { /* skrad ad nedan */ }
    });

  /* SANNREYNUM AD ADP SE FRA THVI FYRIR TIMABILID.
     Vaeri gluggi eftir fyrsta leik vaeri thetta LEKI, og allur
     samanburdurinn vid tolfraedi yrdi merkingarlaus i thagu markadarins. */
  let leaky = 0;
  for (const [k, v] of adp) {
    const end = v.meta && v.meta.end_date;
    const yr = Number(k.split("|")[0]);
    /* NFL byrjar i fyrsta lagi 4. sept. Gluggi sem endar eftir 12.
       sept gaeti borid upplysingar ur viku 1. */
    if (end && new Date(end) > new Date(`${yr}-09-12`)) leaky++;
  }
  record("adp_history", leaky === 0,
    `${adp.size} ADP sets ${FIRST_OUTCOME}-${LAST_OUTCOME}; ${leaky} outside the pre-season window`);
  if (leaky) console.log("  !! ADP-gluggi eftir tímabilsbyrjun — LEKI");

  /* ---------- 5b. SLEEPER-SPAR OG SLEEPER-ADP, SOGULEGT ----------

     Stadfest 9.8.2026: `/projections/nfl/{year}` skilar spam aftur til
     2022 — og thad eru FORLEIKS-spar, ekki uppfaerdar. Prof: 2022-listinn
     setur Lamar Jackson nr. 2 (hann meiddist) og 2025-listinn setur hann
     nr. 1 (hann att slakt ar). Uppfaerdar tolur myndu aldrei gera thad.
     `model-lab.mjs` kafli "leka-hlid" maelir thetta formlega: fylgni
     yfir ~0,80 vid raunutkomu vaeri leki, ekki spa.

     THETTA ER KEPPINAUTURINN SEM SKIPTIR MALI. Notandinn draftar a
     Sleeper og ser thessar tolur vid hlidina a okkar. A-Rankingin
     verdur ad slá thaer, ekki bara ADP. */
  const sleeperProj = new Map();          // `${gsisId}|${year}` -> { proj, adp }
  {
    const idmapTxt = await getText(
      "https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv");
    const gsisBySleeper = new Map();
    for (const r of objects(idmapTxt, ["sleeper_id", "gsis_id"])) {
      const s = str(r.sleeper_id), g = str(r.gsis_id);
      if (s && g) gsisBySleeper.set(s, g);
    }
    const POS_Q = ["QB", "RB", "WR", "TE"].map((p) => `position[]=${p}`).join("&");
    /* SLEEPER-SPAR ERU TIL FRA 2018 EN THAER ERU EKKI ALLAR SPAR.
       Endapunkturinn skilar tolum fyrir 2018-2025, en 2018-2020 eru
       MENGADAR AF UTKOMUNNI — thaer voru bakfylltar eda uppfaerdar a
       timabilinu. Maelt 9.8.2026, fylgni spar vid LEIKI SPILADA:

         2018 r=0,600   2019 r=0,609   2020 r=0,690   <- mengud
         2021 r=0,269   2022 r=0,169   2023 r=0,137
         2024 r=0,212   2025 r=0,091                  <- hrein
         (ADP til samanburdar: 0,08-0,15 OLL arin)

       Doemin taka af allan vafa. 2020: Christian McCaffrey med ADP
       1,2 — samdoma RB1 deildarinnar — var "spad" **RB48 med 64,9
       stigum**, og hann spiladi 3 leiki. Saquon Barkley (ADP 2,5)
       fekk RB54. Engin forleiks-spa setur tvo efstu hlauparana i
       48. og 54. saeti.
       2021 stenst hins vegar: Calvin Ridley (ADP 18) var spad **WR4
       med 306,5 stigum** og hann spiladi 5 leiki. Sleeper vissi
       ekkert.

       Threpid er thvi sett a 2021 OG hlidið er SJALFVIRKT (sja
       `leakyProj` nedar): ar sem fellur a fylgni-profinu er ekki
       tekid inn, hvad sem thessi athugasemd segir. Kaemi i ljos ad
       eldri gogn hreinsudust myndi hlidid hleypa theim inn af sjalfu
       ser — og ofugt. */
    const projYears = [];
    for (let y = 2018; y <= LAST_OUTCOME; y++) projYears.push(y);
    await pool(projYears, 2, async (y) => {
      try {
        const d = await getJSON(
          `https://api.sleeper.com/projections/nfl/${y}?season_type=regular&${POS_Q}&order_by=pts_ppr`);
        let n = 0;
        for (const r of d) {
          const st = r.stats || {};
          if (st.pts_ppr == null) continue;
          const g = gsisBySleeper.get(String(r.player_id));
          if (!g) continue;
          sleeperProj.set(`${g}|${y}`, {
            proj: st.pts_ppr,
            projStd: st.pts_std ?? null,
            adp: st.adp_ppr != null && st.adp_ppr < 400 ? st.adp_ppr : null,
            adpStd: st.adp_std != null && st.adp_std < 400 ? st.adp_std : null,
          });
          n++;
        }
        record(`sleeper_proj_${y}`, n > 150, `${n} projections joined to gsis`);
      } catch (e) {
        record(`sleeper_proj_${y}`, false, `failed: ${e.message}`);
      }
    });
  }

  /* ---------- 5c. SERFRAEDINGA-SAMSTEYPA (ECR), SOGULEG ----------
     Ur `data/ecr_history.json` (sja fetch-ecr-history.mjs).
     Thetta er SERFRAEDINGARNIR sjalfir, adgreint fra ADP sem er
     mannfjoldinn. Spurning notandans — "serfraedingar eda tolfraedi" —
     er ekki haegt ad svara an thess ad thessi tvo seu adskilin. */
  let ecrHist = null;
  try {
    ecrHist = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        path.join(OUT, "ecr_history.json"), "utf8"));
    record("ecr_history_load", true, `${Object.keys(ecrHist.sets).length} sets`);
  } catch {
    record("ecr_history_load", false,
      "ecr_history.json missing — run fetch-ecr-history.mjs");
  }

  /* ---------- 6. RADIRNAR ---------- */
  /* ============================================================
     FFTODAY — ELDRI SPAR EN SLEEPER NAER TIL
     ============================================================
     Sleeper geymir adeins 2021-2025 (fyrri ar falla a leka-hlidinu).
     FFToday birtir forleiks-spar aftur til 2015, sottar med
     `scripts/fetch-fftoday.mjs`, og thar med er hugsanlega haegt ad
     tvofalda gagnagrunn A-Ranking.

     GOGNIN ERU EKKI TEKIN GILD FYRIR THAD — thau fara i GEGNUM SAMA
     LEKA-HLID og Sleeper, a sama mengi (draftanlegi hopurinn) og med
     sama tholmark. Heimild sem naer lengra aftur er einskis virdi ef
     hun veit hvernig for.                                          */
  const fftoday = new Map();
  try {
    const raw = JSON.parse(await readFile(path.join(OUT, "fftoday_projections.json"), "utf8"));
    for (const yr of raw.seasons || []) {
      const list = (raw.projections || {})[yr] || [];
      const idxF = buildIndexes(list);
      fftoday.set(Number(yr), { list, idx: idxF });
    }
    record("fftoday_load", fftoday.size >= 8,
      `${fftoday.size} seasons of FFToday projections available`);
  } catch {
    record("fftoday_load", false, "fftoday_projections.json missing — run scripts/fetch-fftoday.mjs");
  }

  const rows = [];
  for (let year = FIRST_OUTCOME; year <= LAST_OUTCOME; year++) {
    /* Nafna-porun ADP -> leikmadur. FFC ber engin sameiginleg audkenni,
       svo thetta er eina leidin — og hun er MERKT.

       INDEXINN ER YFIR EINKVAEMA LEIKMENN, EKKI TIMABILS-RADIR.
       Fyrsta utgafan indexadi radir ur BADUM arum (N og N-1). Sami
       leikmadur atti tha TVAER radir med sama nafn+stodu lykli, og
       tviraedni-vordurinn i `buildIndex` — sem er REETT hugsadur —
       merkti hann OGILDAN. Utkoman var **496 radir i stad ~4.000**:
       allir sem spiludu bædi arin duttu ut, sem er einmitt hopurinn
       sem skiptir mali. Vordurinn var ad virka; hann var beittur a
       rangt mengi. */
    const uniq = new Map();
    for (const y of [year, year - 1, year - 2]) {
      for (const s of seasons.values()) {
        if (s.season === y && !uniq.has(s.id)) uniq.set(s.id, s);
      }
    }
    const idx = buildIndexes([...uniq.values()]);

    for (const sc of ["ppr", "standard"]) {
      const set = adp.get(`${year}|${sc}`);
      if (!set) continue;

      /* ECR fyrir thetta ar og thessa stigagjof, poruð a nafni.
         `rp` = redraft PPR, `ro` = redraft standard. */
      const ecrSet = ecrHist && ecrHist.sets[`${year}|${sc === "ppr" ? "rp" : "ro"}`];
      const ecrIdx = ecrSet ? buildIndexes(ecrSet.players) : null;
      for (const a of set.rows) {
        const m = matchByName(idx, a.name, a.pos, a.team);
        if (!m) continue;
        const id = m.item.id;

        const now = seasons.get(`${id}|${year}`) || null;
        const p1 = seasons.get(`${id}|${year - 1}`) || null;
        const p2 = seasons.get(`${id}|${year - 2}`) || null;
        const b = bio.get(id) || {};
        const teamPrev = p1 ? teamSeason.get(`${p1.team}|${year - 1}`) : null;

        const age = b.born
          ? (new Date(`${year}-09-01`) - new Date(b.born)) / (365.25 * 864e5) : null;

        rows.push({
          id, name: m.item.name, pos: a.pos, season: year, scoring: sc,

          /* --- MARKADURINN (agust ars N) --- */
          adp: a.adp, adpSd: a.sd, adpTimes: a.times,

          /* --- SERFRAEDINGARNIR (adgreindir fra mannfjoldanum) --- */
          ecr: (() => {
            if (!ecrIdx) return null;
            const e = matchByName(ecrIdx, a.name, a.pos, a.team);
            return e ? e.item.ecr : null;
          })(),
          ecrSd: (() => {
            if (!ecrIdx) return null;
            const e = matchByName(ecrIdx, a.name, a.pos, a.team);
            return e ? e.item.sd : null;
          })(),

          /* --- KEPPINAUTARNIR: Sleeper-spa og Sleeper-ADP --- */
          sleeperProj: sleeperProj.get(`${id}|${year}`)
            ? (sc === "ppr" ? sleeperProj.get(`${id}|${year}`).proj
                            : sleeperProj.get(`${id}|${year}`).projStd) : null,
          sleeperAdp: sleeperProj.get(`${id}|${year}`)
            ? (sc === "ppr" ? sleeperProj.get(`${id}|${year}`).adp
                            : sleeperProj.get(`${id}|${year}`).adpStd) : null,

          /* --- FFTODAY: forleiks-spa aftur til 2015 --- */
          ffProj: (() => {
            const f = fftoday.get(year);
            if (!f) return null;
            const e = matchByName(f.idx, a.name, a.pos, a.team);
            if (!e) return null;
            return sc === "ppr" ? e.item.ppr : e.item.std;
          })(),

          /* --- INNTAK UR N-1 --- */
          prevG: p1 ? p1.g : null,
          prevPpg: p1 ? r2(p1.ppg) : null,
          prevPpgStd: p1 ? r2(p1.ppgStd) : null,
          prevPts: p1 ? r1(p1.ppr) : null,
          prevTgtG: p1 ? r2(p1.tgtG) : null,
          prevCarG: p1 ? r2(p1.carG) : null,
          prevOppG: p1 ? r2(p1.oppG) : null,
          prevTshare: p1 && p1.tshare != null ? r3(p1.tshare) : null,
          prevWopr: p1 && p1.wopr != null ? r3(p1.wopr) : null,
          prevYpc: p1 && p1.ypc != null ? r2(p1.ypc) : null,
          prevYpt: p1 && p1.ypt != null ? r2(p1.ypt) : null,
          prevTdG: p1 ? r3(p1.tdG) : null,
          prevAyG: p1 ? r1(p1.ayG) : null,
          prevTeam: p1 ? p1.team : null,

          /* --- INNTAK UR N-2 --- */
          prev2G: p2 ? p2.g : null,
          prev2Ppg: p2 ? r2(p2.ppg) : null,

          /* --- SAMSETT --- */
          w3Ppg: weighted3(p1, p2),
          trend: p1 && p2 ? r2(p1.ppg - p2.ppg) : null,

          /* --- SAMHENGI --- */
          age: age != null ? r1(age) : null,
          exp: b.rookie ? year - b.rookie : null,
          draftRound: b.draftRound ?? null,
          draftPick: b.draftPick ?? null,
          teamChange: p1 && now ? (p1.team !== now.team ? 1 : 0) : null,

          /* --- LIDSSTYRKUR (ur N-1) --- */
          prevTeamPlaysG: teamPrev ? r1(teamPrev.playsG) : null,
          prevTeamPassRate: teamPrev ? r3(teamPrev.passRate) : null,
          prevTeamPfG: teamPrev && teamPrev.pfG != null ? r2(teamPrev.pfG) : null,
          prevTeamMargin: teamPrev && teamPrev.margin != null ? r2(teamPrev.margin) : null,

          /* --- VINNUALAG: HLUTDEILD, ekki bara magn ---
             Rá tala segir "hann fekk 250 taekifaeri". Hlutdeild segir
             "hann fekk 28% af thvi sem lidid hafdi", og THAD er tolan
             sem flyst milli ara thegar lidid breytir hradanum. */
          prevOppShare: p1 && teamPrev && teamPrev.opps
            ? r3((p1.car + p1.tgt) / teamPrev.opps) : null,
          prevTouches: p1 ? p1.car + p1.rec : null,
          prevOppTotal: p1 ? p1.car + p1.tgt : null,

          /* --- MEIDSLASAGA (ur N-1 og N-2) --- */
          prevMissed: p1 ? Math.max(0, gamesInSeason(year - 1) - p1.g) : null,
          missed2y: p1 && p2
            ? Math.max(0, gamesInSeason(year - 1) - p1.g) +
              Math.max(0, gamesInSeason(year - 2) - p2.g) : null,
          /* Hlutfall moguleika sem hann spiladi sidustu tvo ar. */
          durability: p1
            ? r3((p1.g + (p2 ? p2.g : 0)) /
                 (gamesInSeason(year - 1) + (p2 ? gamesInSeason(year - 2) : 0))) : null,
          prevOnReport: injRecord.get(`${id}|${year - 1}`)
            ? injRecord.get(`${id}|${year - 1}`).onReport : null,
          prevOutWeeks: injRecord.get(`${id}|${year - 1}`)
            ? injRecord.get(`${id}|${year - 1}`).outWeeks : null,

          /* --- UTKOMA (arid N) — ekkert annad svid ma koma hedan --- */
          g: now ? now.g : 0,
          ppg: now ? r2(now.ppg) : 0,
          ppgStd: now ? r2(now.ppgStd) : 0,
          pts: now ? r1(now.ppr) : 0,
          ptsStd: now ? r1(now.std) : 0,
          matchVia: m.via,
        });
      }
    }
  }

  /* ---------- 6b. LEKA-HLID A SPA-ARUNUM ----------

     Forleiks-spa getur ekki vitad hverjir meidast. Fylgni hennar vid
     LEIKI SPILADA a thvi ad vera lag. Ar sem fer yfir threpid er
     FELLT: spain er thurrkud ut fyrir thad ar og thad er skrad.

     MENGID SKIPTIR OLLU OG FYRSTA UTGAFAN HAFDI THAD RANGT.
     Hun maeldi yfir ALLA sem attu spa (600+ per ar, thar med talda
     djupa varamenn) og felldi tha OLL arin — lika hrein. Astaedan er
     ruglandi thattur sem er ekki leki: madur sem er spad 5 stigum ER
     varamadur og spilar faerri leiki, medan sa sem er spad 300 spilar
     hverja viku. Su fylgni er raunveruleg og saklaus.

     RETTA MENGID ER DRAFTANLEGI HOPURINN — their sem eiga ADP. Thar
     er ruglandi thatturinn horfinn: allir i honum voru vaentir til ad
     spila. Maelt a thvi mengi:
       2018 r=0,600  2019 r=0,609  2020 r=0,690   <- mengud
       2021 r=0,269  2022 r=0,169  2023 r=0,137
       2024 r=0,212  2025 r=0,091                 <- hreinar
       (ADP sjalft: 0,08-0,15 OLL arin)

     Doemid sem tekur af vafann: 2020 var Christian McCaffrey — ADP
     1,2, samdoma RB1 deildarinnar — "spad" RB48, og hann spiladi 3
     leiki. 2021 var Calvin Ridley (ADP 18) hins vegar spad WR4 og
     hann spiladi 5 leiki; su spa vissi ekkert. */
  const LEAK_MAX = 0.40;
  const leakyYears = new Set();
  {
    const byYear = new Map();
    for (const r of rows) {
      if (r.scoring !== "ppr" || r.sleeperProj == null || r.adp == null) continue;
      (byYear.get(r.season) || byYear.set(r.season, []).get(r.season)).push(r);
    }
    for (const [yr, list] of [...byYear].sort((a, b) => a[0] - b[0])) {
      if (list.length < 60) continue;
      const rr = pearson(list.map((x) => x.sleeperProj), list.map((x) => x.g));
      const leaky = Math.abs(rr) > LEAK_MAX;
      if (leaky) leakyYears.add(yr);
      record(`sleeper_leak_${yr}`, !leaky,
        `projection vs games played r=${rr.toFixed(3)} on ${list.length} drafted players` +
        (leaky ? " — REJECTED, outcome-aware" : ""));
    }
    for (const r of rows) {
      if (leakyYears.has(r.season)) { r.sleeperProj = null; r.sleeperAdp = null; }
    }
    record("sleeper_leak_gate", true,
      `${leakyYears.size} seasons rejected: ${[...leakyYears].sort().join(", ") || "none"}`);
  }

  /* ============================================================
     SAMA HLID A FFTODAY
     ============================================================
     Heimild sem naer lengra aftur er EINSKIS VIRDI ef hun veit
     hvernig for. FFToday er sott i dag fyrir ar sem eru longu lidin,
     svo spurningin er nakvaemlega su sama og hja Sleeper: birtir
     sidan forleiks-spa eda eitthvad sem hefur verid uppfaert?

     Profid er ekki endurhugsad heldur ENDURNOTAD — sami maelikvardi
     (fylgni spar vid FJOLDA LEIKINNA LEIKJA), sama mengi (adeins their
     sem eiga ADP, svo varamanna-thatturinn ruglist ekki inn i) og sama
     tholmark (0,40). Ar sem fellur er thurrkad ut.                */
  {
    const ffLeaky = new Set();
    const byYear = new Map();
    for (const r of rows) {
      if (r.scoring !== "ppr" || r.ffProj == null || r.adp == null) continue;
      if (!byYear.has(r.season)) byYear.set(r.season, []);
      byYear.get(r.season).push(r);
    }
    for (const [yr, list] of [...byYear].sort((a, b) => a[0] - b[0])) {
      if (list.length < 60) continue;
      const rr = pearson(list.map((x) => x.ffProj), list.map((x) => x.g));
      const leaky = Math.abs(rr) > LEAK_MAX;
      if (leaky) ffLeaky.add(yr);
      record(`fftoday_leak_${yr}`, !leaky,
        `projection vs games played r=${rr.toFixed(3)} on ${list.length} drafted players` +
        (leaky ? " — REJECTED, outcome-aware" : ""));
    }
    for (const r of rows) if (ffLeaky.has(r.season)) r.ffProj = null;
    const kept = [...byYear.keys()].filter((y) => !ffLeaky.has(y)).sort();
    record("fftoday_leak_gate", true,
      `${ffLeaky.size} seasons rejected: ${[...ffLeaky].sort().join(", ") || "none"} · ` +
      `${kept.length} clean: ${kept.join(", ")}`);
  }

  /* LEIKMADUR SEM SPILADI ALDREI FAER 0, EKKI NULL — og thad er retta
     svarid: hann var draftadur og gaf ekkert. Ad sleppa theim vaeri
     LIFUNAR-SKEKKJA sem gerdi hverja spa-adferd betri en hun er. */
  const zero = rows.filter((r) => r.g === 0).length;
  record("features", true,
    `${rows.length} player-seasons ${FIRST_OUTCOME}-${LAST_OUTCOME}; ` +
    `${zero} drafted but never played (kept as 0)`);

  const byName = rows.filter((r) => r.matchVia !== "exact").length;
  record("feature_match", byName < rows.length * 0.15,
    `${byName}/${rows.length} matched by a looser key than exact`);

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "features.json"), JSON.stringify({
    generated: new Date().toISOString(),
    firstOutcome: FIRST_OUTCOME, lastOutcome: LAST_OUTCOME,
    adpWindows: Object.fromEntries([...adp].map(([k, v]) =>
      [k, { from: v.meta.start_date, to: v.meta.end_date, drafts: v.meta.total_drafts }])),
    rows,
  }));
  console.log(`-> data/features.json  ${rows.length} radir`);

  const byYear = {};
  for (const r of rows) byYear[r.season] = (byYear[r.season] || 0) + 1;
  console.log("radir per ar:", JSON.stringify(byYear));
}

/** Pearson-fylgni — notud i leka-hlidinu. */
function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : 0;
}

/** NFL for ur 16 i 17 leiki 2021. Ad nota 17 alls stadar gaefi ollum
    fyrir 2021 einn "missta" leik sem aldrei var til. */
const gamesInSeason = (y) => (y >= 2021 ? 17 : 16);

/** Thriggja ara vog 0,5 / 0,3 — endurnormalisud a thad sem er til. */
function weighted3(p1, p2) {
  const parts = [];
  if (p1) parts.push([p1.ppg, 0.62]);
  if (p2) parts.push([p2.ppg, 0.38]);
  if (!parts.length) return null;
  const w = parts.reduce((a, [, x]) => a + x, 0);
  return r2(parts.reduce((a, [v, x]) => a + v * x, 0) / w);
}

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

main().catch((e) => { console.error(e); process.exit(1); });
