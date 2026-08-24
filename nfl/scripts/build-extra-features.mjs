#!/usr/bin/env node
/* ============================================================
   build-extra-features.mjs — TVEIR NYIR FLOKKAR AF INNTOKUM,
   REIKNADIR PER (LEIKMADUR x TIMABIL) SVO `opp-lab.mjs` GETI
   KEYRT THA I GEGNUM NAKVAEMLEGA SAMA NET SEM FELLDI HITT.

     node scripts/build-extra-features.mjs [--from=2015] [--to=2025]

   -> data/measure/extra_features.json

   ============================================================
   HVERS VEGNA THETTA ER SER SKRIFTA OG EKKI INNI I `opp-lab`
   ============================================================
   `opp-lab` er maelivelin og hun a ad vera obreytt. Se hun latin
   saekja nflverse-skrar i hverri keyrslu er (a) hver keyrsla dyr og
   (b) inntakid oskjalfest — nakvaemlega vandamalid sem `provenance.mjs`
   var skrifad til ad leysa. Hér er inntakid BYGGT EINU SINNI, skrifad
   i skra med fingrafari, og `opp-lab --extra` les thad. Tha er talan
   endurgeranleg og skrain sjalf er sonnunargagnid.

   ============================================================
   FLOKKUR 1: MARKADURINN SEM ARSTIDAR-INNTAK
   ============================================================
   README 5c maelir markadinn VIKULEGA (71.347 leikmanna-vikur) og
   faer < 0,5% af leifinni. `mktweek-lab` faer 0 af 45 holum. HVORUGT
   svarar spurningunni hér: baetir ARSTIDAR-lina einhverju vid
   ARSTIDAR-rodun? Markadurinn verdleggur hvern leik timabilsins i
   forleik (272 af 272, maelt 9.8.2026), svo "vaent stig lidsins yfir
   timabilid" er raunveruleg draft-dags staerd.

   TVAER UTGAFUR, OG SU FYRRI ER THAK EKKI TILLAGA:

     ORAKEL   Lokalinur ALLRA leikja timabilsins. Thetta er LEKI —
              lina viku 14 er sett i desember og ber meidsli og form
              sem enginn vissi i agust. Hun er hér SEM THAK: falli
              orakelid getur heidarlega utgafan ekki unnid, og tha er
              spurningin lokud i einni keyrslu. Sama rok og
              orakel-thakid i `rank-model.mjs` i FPL-hlutanum.

     HEIDARLEG Adeins linur VIKU 1 — thaer eru til langt fyrir draft —
              lagdar a SKIPULAGID, sem er thekkt i heild. Ur viku 1
              faest fyrir hvert lid: `w1Own` (hvad markadurinn spair
              thvi ad thad skori) og `w1Def` (hvad hann spair
              andstaedingnum ad skora a thad). Sidan er SOS reiknad
              sem medaltal `w1Def` andstaedinganna yfir allt
              skipulagid. Ekkert i thessu ber upplysingar ur
              timabilinu.

              VARNAGLI SEM VERDUR AD STANDA: nflverse geymir
              LOKALINUNA, lika fyrir viku 1, svo hun er sett ~2 vikum
              EFTIR draftid. Thetta er thvi bjartsyn utgafa af
              heidarlegri tolu — rett att fyrir null-nidurstodu, rong
              att fyrir jakvaeda. Se hun jakvaed tharf hun endurmaelingu
              a raunverulegri forleiks-linu.

   ============================================================
   FLOKKUR 2: SERFRAEDINGARNIR SEM VIK, EKKI SEM ROD
   ============================================================
   README 5 maelir bord sérfraedinga (`sharp-lab`: -111,3 gegn
   A-Ranking) og `disagree-lab` maelir tvaer reglur: BLONDUN allrar
   rodarinnar (-11,6) og AD FAERA SAMHLJODA HOPA um P saeti (P=0 valid
   oll arin). Su fjolskylda af vogum sem `prevCarG` LIFDI i —
   **litil, EINRAEN vog LOGD OFAN A obreyttan kjarna, med
   plasebo-thaki** — hefur hins vegar ALDREI verid keyrd a
   serfraedinga-vikinu. Thad er ein rada i thessari skra:

     ecrVsAdp  `adp - ecr`. Jakvaett: sérfraedingarnir eru hrifnari en
               mannfjoldinn. Baedi eru heildarrodun i sama kvarda i
               `features.json`.
     ecrSd     dreifing sérfraedinganna um hann. Ekki "hver er godur"
               heldur "hve osamma eru their" — ovissu-maelir sem
               `shrink-lab` profadi sem HNIGNUN a spanni en aldrei sem
               rodunar-vog.

   Baedi eru THEGAR i `features.json`; their thurfa ekkert net. Their eru
   samt hér svo allar nyju breyturnar fari i gegnum eitt og sama
   plasebo-thakid — atta plaseboar per keyrsla, ekki tvenn.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getText, record, sourceReport } from "./lib/http.mjs";
import { objects, num, str } from "./lib/csv.mjs";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const REL = "https://github.com/nflverse/nflverse-data/releases/download";
const ARG = parseArgs(process.argv.slice(2), { from: "number", to: "number" });
const FROM = Number(ARG.from || 2015);
const TO = Number(ARG.to || 2025);

const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

/* ============================================================
   LINURNAR -> VAENT SKOR PER LID PER LEIK
   ============================================================
   FORMERKID ER MAELT, EKKI GEFID SER. nflverse `spread_line` er
   JAKVAETT thegar HEIMALIDID er favorit — thad er staðfest hér i
   keyrslunni (hlutfall favorita sem vinna verdur ad vera > 55%,
   annars deyr skriftan). README 5c skjalar ad ESPN notar ANDSTAETT
   formerki og ad ekkert brotnadi synilega thegar thad var rangt; su
   villa ma ekki endurtaka sig thegjandi hér.                       */
function impliedFor(spreadLine, totalLine, isHome) {
  if (spreadLine == null || totalLine == null) return null;
  const half = totalLine / 2, edge = spreadLine / 2;
  return isHome ? half + edge : half - edge;
}

async function loadGames() {
  const txt = await getText(`${REL}/schedules/games.csv`);
  const gs = objects(txt, ["season", "week", "game_type", "away_team", "home_team",
    "spread_line", "total_line", "away_score", "home_score"]);
  const out = [];
  let favWin = 0, favTot = 0;
  for (const g of gs) {
    const season = num(g.season), week = num(g.week);
    if (g.game_type !== "REG" || season == null || week == null) continue;
    if (season < FROM || season > TO) continue;
    const sp = num(g.spread_line), to = num(g.total_line);
    const home = str(g.home_team), away = str(g.away_team);
    if (!home || !away) continue;
    const hs = num(g.home_score), as = num(g.away_score);
    if (sp != null && hs != null && as != null && hs !== as) {
      favTot++;
      if ((sp > 0 && hs > as) || (sp < 0 && as > hs)) favWin++;
    }
    out.push({ season, week, home, away, homeScore: hs, awayScore: as,
      homeImp: impliedFor(sp, to, true), awayImp: impliedFor(sp, to, false) });
  }
  const rate = favTot ? favWin / favTot : 0;
  record("nflverse_schedules", true, `${out.length} REG games, favourite win rate ${(rate * 100).toFixed(1)}%`);
  /* HLIDID. 50% vaeri myntkast; < 55% thydir ad formerkid er snuid vid
     eda linan er onyt, og tha er hver tala nedar i skranni villa sem
     LITUR UT eins og maeling. */
  if (rate < 0.55) {
    console.error(`spread_line formerki STENST EKKI: favorit vinna ${(rate * 100).toFixed(1)}% (krafa > 55%)`);
    process.exit(2);
  }
  console.log(`  ${out.length} REG-leikir ${FROM}-${TO}, favorit vinna ${(rate * 100).toFixed(1)}%`);
  return out;
}

/* ============================================================
   LID-EINKUNNIR PER TIMABIL
   ============================================================ */
function teamRatings(games) {
  const bySeason = new Map();                    // season -> Map(team -> rating)
  const seasons = [...new Set(games.map((g) => g.season))].sort();

  for (const y of seasons) {
    const gy = games.filter((g) => g.season === y);
    /* Hver rod: lid, andstaedingur, vika, vaent eigid skor, vaent skor
       andstaedings. Baedi attir svo hvert lid a sina rod per leik. */
    const rows = [];
    for (const g of gy) {
      rows.push({ team: g.home, opp: g.away, week: g.week, own: g.homeImp, oppScore: g.awayImp });
      rows.push({ team: g.away, opp: g.home, week: g.week, own: g.awayImp, oppScore: g.homeImp });
    }
    const teams = [...new Set(rows.map((r) => r.team))];
    const byTeam = new Map(teams.map((t) => [t, rows.filter((r) => r.team === t)]));

    /* --- VIKA 1: eina linan sem er raunverulega fyrir draftid --- */
    const w1Own = new Map(), w1Def = new Map();
    for (const t of teams) {
      const w1 = byTeam.get(t).filter((r) => r.week === 1 && r.own != null);
      if (!w1.length) continue;
      w1Own.set(t, mean(w1.map((r) => r.own)));
      w1Def.set(t, mean(w1.map((r) => r.oppScore)));
    }

    /* --- ORAKEL: allar linur timabilsins (LEKI, thak) --- */
    const orOwn = new Map(), orDef = new Map();
    for (const t of teams) {
      const all = byTeam.get(t).filter((r) => r.own != null);
      if (!all.length) continue;
      orOwn.set(t, mean(all.map((r) => r.own)));
      orDef.set(t, mean(all.map((r) => r.oppScore)));
    }

    const out = new Map();
    for (const t of teams) {
      const sched = byTeam.get(t);
      const po = sched.filter((r) => r.week >= 15 && r.week <= 17);
      /* SOS = hve mikid gefa andstaedingarnir fra ser, medaltalad yfir
         skipulagid. HEIDARLEGA utgafan notar EINGONGU viku-1 einkunn
         andstaedingsins; orakel-utgafan notar arsmedaltalid hans. */
      const sosH = mean(sched.map((r) => w1Def.get(r.opp)).filter((v) => v != null));
      const sosO = mean(sched.map((r) => orDef.get(r.opp)).filter((v) => v != null));
      const poH = mean(po.map((r) => w1Def.get(r.opp)).filter((v) => v != null));
      const poO = mean(po.map((r) => orDef.get(r.opp)).filter((v) => v != null));
      out.set(t, {
        mktOwnHonest: r3(w1Own.get(t)),
        mktSosHonest: r3(sosH),
        mktPlayoffHonest: r3(poH),
        mktOwnOracle: r3(orOwn.get(t)),
        mktSosOracle: r3(sosO),
        mktPlayoffOracle: r3(poO),
      });
    }
    bySeason.set(y, out);
  }
  return bySeason;
}

/* ============================================================
   LEIKMADUR -> LID THAD TIMABIL
   ============================================================
   `features.json` ber `prevTeam` og `teamChange` en EKKI lidid i ar,
   svo thad verdur ad koma annad. nflverse `roster_{ar}.csv` er ~1 MB
   og ber `gsis_id` + `team`.

   VARNAGLI: thetta er lid AR-INS, ekki lid draft-dagsins. Fyrir thann
   sem er skiptur i oktober er thad rangt lid — 8 af 2.939 raðum i 2021
   bera fleiri en eina rod. Talan er skrad i `coverage` og hun er of
   lag til ad snua nidurstodu; hun er samt ekki nul.               */
async function loadTeams(seasons) {
  const out = new Map();                        // `${gsis}|${season}` -> team
  let ok = 0;
  for (const y of seasons) {
    try {
      const txt = await getText(`${REL}/rosters/roster_${y}.csv`);
      const rs = objects(txt, ["gsis_id", "team", "position"]);
      let n = 0;
      for (const r of rs) {
        const id = str(r.gsis_id), tm = str(r.team);
        if (!id || !tm) continue;
        const k = `${id}|${y}`;
        if (!out.has(k)) { out.set(k, tm); n++; }
      }
      ok++;
      record(`roster_${y}`, true, `${n} players`);
    } catch (e) {
      record(`roster_${y}`, false, `failed: ${e.message}`);
    }
  }
  return { map: out, okYears: ok };
}

async function main() {
  console.log(`saeki nflverse-skipulag og hopa ${FROM}-${TO} …`);
  const games = await loadGames();
  const ratings = teamRatings(games);

  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const universe = new Map();                   // `${id}|${season}` -> row
  for (const r of feats.rows) {
    const k = `${r.id}|${r.season}`;
    if (!universe.has(k)) universe.set(k, r);
  }
  const seasons = [...new Set([...universe.values()].map((r) => r.season))]
    .filter((y) => y >= FROM && y <= TO).sort();
  console.log(`  ${universe.size} einkvaem (leikmadur x timabil), ${seasons.length} timabil`);

  const { map: teamOf, okYears } = await loadTeams(seasons);
  if (okYears < seasons.length) {
    console.log(`  VARNAGLI: adeins ${okYears}/${seasons.length} hopaskrar fengust`);
  }

  const MKT = ["mktOwnHonest", "mktSosHonest", "mktPlayoffHonest",
    "mktOwnOracle", "mktSosOracle", "mktPlayoffOracle"];
  const EXP = ["ecrVsAdp", "ecrSd"];
  const cover = Object.fromEntries([...MKT, ...EXP].map((k) => [k, 0]));
  const rows = [];
  let noTeam = 0;

  for (const [k, r] of universe) {
    if (r.season < FROM || r.season > TO) continue;
    const tm = teamOf.get(k);
    const rt = tm ? (ratings.get(r.season) || new Map()).get(tm) : null;
    if (!tm) noTeam++;
    const row = { id: r.id, season: r.season, team: tm || null };
    for (const key of MKT) {
      const v = rt ? rt[key] : null;
      if (v != null) { row[key] = v; cover[key]++; }
    }
    /* Sérfraedinga-vikid. `adp` og `ecr` eru BAEDI heildarrodun i somu
       skra, svo mismunurinn er i saetum. Jakvaett = sérfraedingarnir
       sétja hann OFAR (laegri ecr) en mannfjoldinn. */
    if (r.adp != null && r.ecr != null) { row.ecrVsAdp = r3(r.adp - r.ecr); cover.ecrVsAdp++; }
    if (r.ecrSd != null) { row.ecrSd = r3(r.ecrSd); cover.ecrSd++; }
    rows.push(row);
  }

  /* ---------- AKKERID: eru lidseinkunnirnar yfirleitt ad maela eitthvad?
     Beri `mktOwnOracle` enga fylgni vid raunveruleg stig lidsins er
     skran onyt og allt nedar er suð sem litur ut eins og maeling.
     Thetta er sama regla og skotakortin i FPL-hlutanum: tvaer oskyldar
     leidir ad somu tolu, annars er kvordunin osonnud.               */
  const anchor = {};
  for (const y of seasons) {
    const rt = ratings.get(y);
    if (!rt) continue;
    const real = new Map();
    for (const g of games.filter((g) => g.season === y)) {
      if (g.homeScore == null || g.awayScore == null) continue;
      (real.get(g.home) || real.set(g.home, []).get(g.home)).push(g.homeScore);
      (real.get(g.away) || real.set(g.away, []).get(g.away)).push(g.awayScore);
    }
    const teams = [...rt.keys()].filter((t) => real.has(t) && real.get(t).length >= 8);
    if (teams.length < 8) { anchor[y] = { teams: teams.length }; continue; }
    const pts = teams.map((t) => mean(real.get(t)));
    const oh = teams.filter((t) => rt.get(t).mktOwnOracle != null);
    const hh = teams.filter((t) => rt.get(t).mktOwnHonest != null);
    anchor[y] = {
      teams: teams.length,
      rOracleOwnVsRealPoints: oh.length >= 8
        ? r3(pearson(oh.map((t) => rt.get(t).mktOwnOracle), oh.map((t) => mean(real.get(t))))) : null,
      rHonestOwnVsRealPoints: hh.length >= 8
        ? r3(pearson(hh.map((t) => rt.get(t).mktOwnHonest), hh.map((t) => mean(real.get(t))))) : null,
      meanRealPointsPg: r3(mean(pts)),
    };
  }

  /* Spearman milli heidarlegrar og orakel-einkunnar per timabil: se
     hun ~0 er "heidarleg" utgafan ekki thynnri utgafa af orakelinu
     heldur ONNUR TALA, og tha ma orakel-thakid ekki lesast sem thak
     yfir hana. Thetta er hlid a rokfaerslunni sjalfri.            */
  const honestVsOracle = {};
  for (const y of seasons) {
    const rt = ratings.get(y);
    if (!rt) continue;
    const pairs = [...rt.values()]
      .filter((v) => v.mktOwnHonest != null && v.mktOwnOracle != null);
    const sos = [...rt.values()]
      .filter((v) => v.mktSosHonest != null && v.mktSosOracle != null);
    honestVsOracle[y] = {
      own: pairs.length >= 8 ? r3(pearson(pairs.map((v) => v.mktOwnHonest), pairs.map((v) => v.mktOwnOracle))) : null,
      sos: sos.length >= 8 ? r3(pearson(sos.map((v) => v.mktSosHonest), sos.map((v) => v.mktSosOracle))) : null,
      teams: rt.size,
    };
  }

  const payload = {
    provenance: stamp({ argv: process.argv.slice(2), defaults: { from: FROM, to: TO },
      inputs: ["features.json"], dataDir: OUT }),
    question: "Do season-long market lines, or the expert-vs-market disagreement, add " +
      "anything on top of the shipped Sleeper -> VBD order? Built here as per-(player x season) " +
      "features so that opp-lab.mjs can run them through the same grid, the same walk-forward " +
      "and the same eight-placebo ceiling that rejected prevCarG.",
    seasons,
    variables: {
      mktOwnHonest: "Own implied team total, week 1 only (available before the draft)",
      mktSosHonest: "Mean over the full schedule of the opponent's week-1 implied points conceded",
      mktPlayoffHonest: "Same, weeks 15-17 only (the app shows this as Playoff D)",
      mktOwnOracle: "Own implied team total, all closing lines of the season (LEAKY - ceiling only)",
      mktSosOracle: "Mean over the schedule of the opponent's season-long implied points conceded (LEAKY)",
      mktPlayoffOracle: "Same, weeks 15-17 only (LEAKY)",
      ecrVsAdp: "adp - ecr. Positive: the experts are higher on him than the crowd",
      ecrSd: "Dispersion of the expert consensus about him",
    },
    leak: {
      oracleIsCeiling: "mktOwnOracle / mktSosOracle / mktPlayoffOracle use closing lines from " +
        "the whole season and are NOT a proposal. They are the ceiling: if the leaky version " +
        "cannot beat the placebo family, no honest version can.",
      honestCaveat: "nflverse stores the CLOSING line, so even the week-1 line is set about two " +
        "weeks after his draft. The honest arm is therefore optimistic, which is the safe " +
        "direction for a null and the unsafe direction for a win.",
      rosterTeam: "Team comes from roster_{year}.csv, a season-level file. For a player traded " +
        "in October it is the wrong team. Counted below, not assumed away.",
    },
    coverage: { universe: universe.size, rowsWritten: rows.length, withoutTeam: noTeam, perVariable: cover },
    honestVsOracle,
    anchor,
    sources: sourceReport(),
    rows,
  };

  await mkdir(path.join(OUT, "measure"), { recursive: true });
  const text = JSON.stringify(payload, null, 1);
  await writeFile(path.join(OUT, "measure", "extra_features.json"), text);
  console.log(`\n  thekja:`);
  for (const [k, v] of Object.entries(cover)) {
    console.log(`    ${k.padEnd(18)} ${v}/${rows.length} (${(100 * v / rows.length).toFixed(1)}%)`);
  }
  console.log(`  an lids: ${noTeam}`);
  console.log(`  r(heidarleg, orakel) per ar:`);
  for (const [y, v] of Object.entries(honestVsOracle)) {
    console.log(`    ${y}  own ${v.own}  sos ${v.sos}  (${v.teams} lid)`);
  }
  console.log(`\n-> data/measure/extra_features.json (${(text.length / 1e6).toFixed(2)} MB)`);
}

function pearson(a, b) {
  const ma = mean(a), mb = mean(b);
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : 0;
}

main().catch((e) => { console.error(e); process.exit(1); });
