#!/usr/bin/env node
/* ============================================================
   model-lab.mjs — HVAD SPAIR THVI HVERJIR VERDA GODIR?

     node scripts/model-lab.mjs
     node scripts/model-lab.mjs --scoring=standard

   -> data/model_eval.json   (+ "A-Ranking"-uppskriftin)

   THRJAR SPURNINGAR, EITT MAELIBORD:
     1. Serfraedingar/markadur, tolfraedi eda lid — hvad ber merkid?
     2. Er haegt ad gera BETUR en ADP og Sleeper-rodun?
     3. Hvada likan a ad rada draft-bordinu?

   ADFERD: WALK-FORWARD. Fyrir hvert profar 2018-2025 er thjalfad
   ADEINS a arum a undan og spad fyrir arid sjalft. Ekkert likan ser
   nokkurn timann framtidina, og lambda er valid med krossprofun
   INNAN thjalfunargagna. Ad velja lambda a profarinu vaeri leki sem
   gerdi okkar likan betra en thad er — nakvaemlega su tegund villu
   sem er ODYRT ad gera og DYRT ad uppgotva seint.

   FJORIR MAELIKVARDAR og their eru EKKI sammala:
     rho      radadi hann rett innan stodu?
     hit      af topp-N hans, hve margir enduðu i topp-N?
     mae      hversu naerri stigunum sjalfum?
     draft    ef thu draftadir eftir honum, HVAD SKORADI LIDID?

   SIDASTI ER SA SEM RAEDUR. Lærdomurinn ur FPL-verkefninu gildir
   obreyttur: haerri fylgni er EKKI sama og betri akvordun.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  standardize, designMatrix, ridgeFit, ridgePredict, pickLambda,
  spearman, mae, hitRate, mean, bootstrapDiff,
} from "../src/learn.js";
import { simulateAllSlots, DEFAULT_LEAGUE } from "../src/accuracy.js";

import { stamp } from "./lib/provenance.mjs";
const OUT = path.resolve(process.cwd(), "data");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const SCORING = String(ARG.scoring || "ppr");
const TEST_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

/* ---------- breytu-hopar — thetta ER svarid vid spurningu 1 ---------- */
const F = {
  /* Framleidsla i fyrra: hvad hann GERDI. */
  production: ["prevPpg", "prevPts", "prevG", "prev2Ppg", "w3Ppg", "trend"],
  /* Taekifaeri: hvad hann FEKK. Klassiska tilgatan er ad thetta se
     stodugra milli ara en framleidslan sjalf. */
  opportunity: ["prevTgtG", "prevCarG", "prevOppG", "prevTshare", "prevWopr",
                "prevAyG", "prevOppShare", "prevTouches"],
  /* Skilvirkni: hversu vel hann nytti thad. Tilgatan er ad thetta se
     THAD SEM AFTURHVERFIST og se thvi VERRA spamerki en magnid. */
  efficiency: ["prevYpc", "prevYpt", "prevTdG"],
  /* Lidid i kringum hann — hradi, snid OG raunverulegur styrkur. */
  team: ["prevTeamPlaysG", "prevTeamPassRate", "prevTeamPfG", "prevTeamMargin",
         "teamChange"],
  /* Ending: hversu oft hefur hann verid tiltaekur? */
  durability: ["prevMissed", "missed2y", "durability", "prevOnReport", "prevOutWeeks"],
  /* Hver hann er. */
  profile: ["age", "exp", "draftRound", "draftPick"],
  /* Mannfjoldinn. */
  market: ["logAdp", "adpSd"],
  /* Serfraedingarnir — ADGREINDIR fra mannfjoldanum. */
  experts: ["logEcr", "ecrSd"],
  /* Sterkasta einstaka heimildin skv. fyrstu umferd. */
  sleeper: ["sleeperProjF", "sleeperAdpF"],
};

async function main() {
  const raw = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const all = raw.rows.filter((r) => r.scoring === SCORING);
  console.log(`gogn: ${all.length} radir, ${SCORING}`);

  /* Afleiddar breytur. log(ADP) thvi merkid er MARGFOLDUNARLEGT:
     munur a saeti 1 og 13 er allt annad en munur a 101 og 113. */
  for (const r of all) {
    r.logAdp = r.adp != null ? Math.log(r.adp) : null;
    r.logEcr = r.ecr != null && r.ecr > 0 ? Math.log(r.ecr) : null;
    r.ppgY = SCORING === "ppr" ? r.ppg : r.ppgStd;

    /* MARKMIDID ER HEILDARSTIG TIMABILSINS, EKKI STIG A LEIK.
       Fyrsta utgafan spadi stigum a leik og TAPADI fyrir hraru ADP um
       189 stig. Astaedan var ekki likanid heldur MARKMIDID: hermunin
       — og deildin — skorar heildarstig, svo leikmadur sem gefur 18
       stig i 9 leikjum er ekki jafngodur og sa sem gefur 15 i 17.
       Stig-a-leik likan raðar theim fyrrnefnda ofar og er thar med
       BLINT A MEIDSLI, sem er einmitt thad sem ADP verdleggur.
       Thetta er sama aett af villu og "hærri fylgni er ekki betri
       akvordun" — rett tala, rong spurning. */
    r.y = SCORING === "ppr" ? r.pts : r.ptsStd;
    r.yTotal = r.y;

    r.sleeperProjF = r.sleeperProj ?? null;
    r.sleeperAdpF = r.sleeperAdp != null ? Math.log(r.sleeperAdp) : null;
  }

  const POS = ["QB", "RB", "WR", "TE"];
  const results = {};                 // model -> { perSeason: {}, ... }
  const boards = {};                  // model -> year -> Map(key -> rank)

  const models = buildModels();
  for (const m of models) { results[m.key] = { perSeason: {}, rows: [] }; boards[m.key] = {}; }

  for (const year of TEST_YEARS) {
    const train = all.filter((r) => r.season < year);
    const test = all.filter((r) => r.season === year);
    if (train.length < 300 || !test.length) continue;

    for (const m of models) {
      /* Spa per stodu — kvardarnir eru gerolikir og eitt likan yfir
         allar stodur myndi eyda mestum krafti i ad laera "QB skorar
         meira en TE", sem vid vitum thegar. */
      const pred = new Map();
      let usable = true;
      for (const pos of POS) {
        const tr = train.filter((r) => r.pos === pos);
        const te = test.filter((r) => r.pos === pos);
        if (!te.length) continue;
        const p = m.fit(tr, te, pos);
        if (p == null) { usable = false; break; }
        te.forEach((r, i) => pred.set(r, p[i]));
      }
      if (!usable) continue;

      /* --- maelikvardar --- */
      const perPos = {};
      for (const pos of POS) {
        const te = test.filter((r) => r.pos === pos && pred.has(r));
        if (te.length < 12) continue;
        const p = te.map((r) => pred.get(r));
        const a = te.map((r) => r.y);
        perPos[pos] = {
          rho: r3(spearman(p, a)),
          hit: r3(hitRate(p, a, { QB: 12, RB: 24, WR: 36, TE: 12 }[pos])),
          mae: r2(mae(p, a)),
          n: te.length,
        };
      }
      const withPred = test.filter((r) => pred.has(r));
      const board = new Map(withPred.slice()
        .sort((x, y) => pred.get(y) - pred.get(x))
        .map((r, i) => [r.id, i + 1]));
      boards[m.key][year] = board;

      results[m.key].perSeason[year] = {
        perPos,
        rhoAll: r3(spearman(withPred.map((r) => pred.get(r)), withPred.map((r) => r.y))),
        n: withPred.length,
      };
    }
  }

  /* ---------- DRAFT-HERMUNIN — akvordunar-maelikvardinn ---------- */
  console.log("\nhermi droft …");
  const fieldByYear = {};
  const actualByYear = {};
  for (const year of TEST_YEARS) {
    const test = all.filter((r) => r.season === year && r.adp != null);
    if (!test.length) continue;
    actualByYear[year] = new Map(test.map((r) =>
      [r.id, { pos: r.pos, pts: r.yTotal }]));
    /* Motherjarnir drafta eftir ADP — thad er raunverulegi
       markadurinn i herberginu, ekki tilbunn andstaedingur. */
    fieldByYear[year] = new Map(test.slice().sort((a, b) => a.adp - b.adp)
      .map((r, i) => [r.id, i + 1]));
  }

  for (const m of models) {
    const per = {};
    for (const year of TEST_YEARS) {
      const b = boards[m.key][year];
      if (!b || !fieldByYear[year]) continue;
      /* Bordid er threngt vid tha sem eiga ADP — thad er
         draftanlega mengid og thad sem hermunin getur radad um. */
      const trimmed = new Map([...b.entries()]
        .filter(([k]) => actualByYear[year].has(k))
        .sort((x, y) => x[1] - y[1]).map(([k], i) => [k, i + 1]));
      if (trimmed.size < 100) continue;
      const s = simulateAllSlots({ board: trimmed, fieldBoard: fieldByYear[year],
        actual: actualByYear[year], league: DEFAULT_LEAGUE });
      per[year] = s.mean;
    }
    results[m.key].draftPerSeason = per;
    const vals = Object.values(per);
    results[m.key].draft = vals.length ? r1(mean(vals)) : null;
    results[m.key].draftYears = vals.length;
  }

  /* ---------- SAMEIGINLEG AR ----------
     Sleeper naer yfir 2022-2025 og ECR yfir 2020-2025. Ad bera
     8-ara medaltal saman vid 4-ara medaltal er EKKI samanburdur —
     arin sjalf eru misjofn og hvert medaltal maelir annan heim.
     Thess vegna er ONNUR tafla, threngd vid arin thar sem ALLAR
     heimildir eru til. */
  const commonYears = TEST_YEARS.filter((y) =>
    results.adp.draftPerSeason[y] != null &&
    results.sleeper && results.sleeper.draftPerSeason[y] != null &&
    results.ecr && results.ecr.draftPerSeason[y] != null);
  for (const m of models) {
    const per = results[m.key].draftPerSeason || {};
    const vals = commonYears.map((y) => per[y]).filter((v) => v != null);
    results[m.key].draftCommon = vals.length === commonYears.length
      ? r1(mean(vals)) : null;
  }

  /* ---------- SAMANTEKT ---------- */
  const summary = models.map((m) => {
    const R = results[m.key];
    const yrs = Object.keys(R.perSeason);
    const avg = (f) => {
      const v = yrs.map((y) => f(R.perSeason[y])).filter((x) => x != null);
      return v.length ? r3(mean(v)) : null;
    };
    const posAvg = (pos, field) => {
      const v = yrs.map((y) => R.perSeason[y].perPos[pos])
        .filter(Boolean).map((p) => p[field]).filter((x) => x != null);
      return v.length ? r3(mean(v)) : null;
    };
    return {
      key: m.key, label: m.label, group: m.group, note: m.note,
      years: yrs.length,
      rho: {
        QB: posAvg("QB", "rho"), RB: posAvg("RB", "rho"),
        WR: posAvg("WR", "rho"), TE: posAvg("TE", "rho"),
        all: avg((s) => s.rhoAll),
      },
      hit: {
        RB: posAvg("RB", "hit"), WR: posAvg("WR", "hit"),
        QB: posAvg("QB", "hit"), TE: posAvg("TE", "hit"),
      },
      mae: { RB: posAvg("RB", "mae"), WR: posAvg("WR", "mae") },
      draft: R.draft, draftYears: R.draftYears,
      draftCommon: R.draftCommon,
      draftPerSeason: R.draftPerSeason,
      /* Fylgni per ar OG threngd vid sameiginlegu arin.
         Draft-hermunin er havadasom (ADP sjalft sveiflast um 150 stig
         milli ara), svo hun ein getur ekki skorid ur um mun upp a
         170 stig. Fylgnin er miklu stodugri og er thvi hofd vid
         hlidina — ekki i stad hennar, thvi hun maelir rodun en ekki
         akvordun. */
      rhoPerSeason: Object.fromEntries(yrs.map((y) =>
        [y, R.perSeason[y].rhoAll])),
      rhoCommon: (() => {
        const v = commonYears.map((y) => R.perSeason[y] && R.perSeason[y].rhoAll)
          .filter((x) => x != null);
        return v.length === commonYears.length ? r3(mean(v)) : null;
      })(),
      hitRbCommon: (() => {
        const v = commonYears.map((y) => R.perSeason[y] && R.perSeason[y].perPos.RB)
          .filter(Boolean).map((p) => p.hit).filter((x) => x != null);
        return v.length === commonYears.length ? r3(mean(v)) : null;
      })(),
      hitWrCommon: (() => {
        const v = commonYears.map((y) => R.perSeason[y] && R.perSeason[y].perPos.WR)
          .filter(Boolean).map((p) => p.hit).filter((x) => x != null);
        return v.length === commonYears.length ? r3(mean(v)) : null;
      })(),
    };
  }).filter((s) => s.years > 0);

  summary.sort((a, b) => (b.draft ?? -1e9) - (a.draft ?? -1e9));

  /* ---------- VIKMORK a mun vid ADP og Sleeper ---------- */
  const adpPer = results.adp.draftPerSeason;
  const slpPer = results.sleeper ? results.sleeper.draftPerSeason : null;
  for (const s of summary) {
    const per = results[s.key].draftPerSeason;
    s.vsAdp = bootstrapDiff(per, adpPer);
    if (slpPer && Object.keys(slpPer).length >= 3) {
      const common = {};
      for (const y of Object.keys(slpPer)) if (y in per) common[y] = per[y];
      s.vsSleeper = Object.keys(common).length >= 3
        ? bootstrapDiff(common, slpPer) : null;
    }
  }

  /* ---------- PRENTUN ---------- */
  console.log(`\n${"=".repeat(96)}`);
  console.log(`  WALK-FORWARD ${TEST_YEARS[0]}-${TEST_YEARS.at(-1)}  ·  ${SCORING.toUpperCase()}  ·  12-lida deild`);
  console.log("=".repeat(96));
  console.log("  draft   vs ADP        rho(RB) rho(WR) rho(QB) rho(TE)  hit(RB) hit(WR)  ar  likan");
  for (const s of summary) {
    const v = s.vsAdp;
    const vs = v ? `${sgn(v.diff)}${v.excludesZero ? "*" : " "} [${sgn(v.lo)},${sgn(v.hi)}]` : "";
    console.log(
      `${String(s.draft ?? "-").padStart(7)} ${vs.padEnd(22)}` +
      `${p3(s.rho.RB)} ${p3(s.rho.WR)} ${p3(s.rho.QB)} ${p3(s.rho.TE)}  ` +
      `${p3(s.hit.RB)}  ${p3(s.hit.WR)}  ${String(s.years).padStart(2)}  ${s.label}`);
  }
  console.log("\n  * = 95% bootstrap-vikmork (klosud per timabil) utiloka null");

  /* ---------- SAMEIGINLEG AR — HEIDARLEGI SAMANBURDURINN ---------- */
  const common = summary.filter((s) => s.draftCommon != null)
    .sort((a, b) => b.draftCommon - a.draftCommon);
  if (common.length && commonYears.length >= 3) {
    console.log(`\n${"=".repeat(96)}`);
    console.log(`  SOMU AR FYRIR ALLA (${commonYears.join(", ")}) — eini samanburdurinn sem er jafn`);
    console.log("=".repeat(96));
    const adpC = common.find((s) => s.key === "adp").draftCommon;
    const slpC = common.find((s) => s.key === "sleeper").draftCommon;
    console.log("  draft   vs ADP   vs Slp    rho   hitRB  hitWR   ar-fyrir-ar (vs ADP)   likan");
    for (const s of common.slice(0, 16)) {
      const dA = s.draftCommon - adpC, dS = s.draftCommon - slpC;
      const yby = commonYears.map((y) => {
        const d = (s.draftPerSeason[y] ?? 0) -
                  (common.find((x) => x.key === "adp").draftPerSeason[y] ?? 0);
        return d > 0 ? "+" : d < 0 ? "-" : "0";
      }).join("");
      console.log(`${String(s.draftCommon).padStart(7)} ${sgn(dA).padStart(7)} ` +
        `${sgn(dS).padStart(7)}  ${p3(s.rhoCommon)} ${p3(s.hitRbCommon)} ${p3(s.hitWrCommon)}` +
        `        ${yby}          ${s.label}`);
    }
  }

  if (slpPer) {
    console.log(`\n  --- vikmork gegn SLEEPER-SPANNI (${Object.keys(slpPer).length} ar) ---`);
    for (const s of summary.filter((x) => x.vsSleeper)
      .sort((a, b) => (b.vsSleeper.diff) - (a.vsSleeper.diff)).slice(0, 8)) {
      const v = s.vsSleeper;
      console.log(`  ${sgn(v.diff).padStart(7)}${v.excludesZero ? "*" : " "} ` +
        `[${sgn(v.lo)}, ${sgn(v.hi)}]  ${s.label}`);
    }
  }

  /* ---------- HVAD BER MERKID? (ablation) ---------- */
  console.log(`\n${"=".repeat(96)}`);
  console.log("  HVAD BER MERKID — hver hopur einn og ser, og hvad tapast vid ad taka hann ut");
  console.log("=".repeat(96));
  const ablation = summary.filter((s) => s.group === "ablation");
  for (const s of ablation) {
    console.log(`  draft ${String(s.draft).padStart(7)}   rho(RB) ${p3(s.rho.RB)}  rho(WR) ${p3(s.rho.WR)}   ${s.label}`);
  }

  /* ---------- LEKA-HLID a Sleeper ---------- */
  const slp = summary.find((s) => s.key === "sleeper");
  if (slp) {
    const maxRho = Math.max(...["QB", "RB", "WR", "TE"].map((p) => slp.rho[p] ?? 0));
    console.log(`\n  leka-hlid a Sleeper-spanni: haesta rho innan stodu = ${r3(maxRho)}`);
    console.log(maxRho > 0.80
      ? "  !! GRUNSAMLEGT — thetta gaeti verid uppfaerd tala, ekki forleiks-spa"
      : "  i lagi — thetta er spa, ekki utkoma i dulargervi");
  }

  await writeFile(path.join(OUT, `model_eval_${SCORING}.json`), JSON.stringify({
    /* Hvernig thessi skra vard til — sja lib/provenance.mjs. */
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr" }, inputs: ["features.json"], dataDir: OUT }),
    generated: new Date().toISOString(),
    scoring: SCORING, testYears: TEST_YEARS,
    league: DEFAULT_LEAGUE,
    featureGroups: F,
    models: summary,
  }, null, 1));
  console.log(`\n-> data/model_eval_${SCORING}.json`);
}

/* ============================================================
   LIKONIN
   ============================================================ */
function buildModels() {
  const M = [];

  /* --- 1. MARKADURINN --- */
  M.push({
    key: "adp", label: "ADP (the market)", group: "baseline",
    note: "Medal-draftstada ur raunverulegum droftum, tekin i agust.",
    fit: (tr, te) => te.map((r) => (r.adp != null ? -Math.log(r.adp) : -Math.log(300))),
  });

  M.push({
    key: "sleeper", label: "Sleeper projection", group: "baseline",
    note: "Forleiks-spa Sleeper. Adeins 2022+.",
    fit: (tr, te) => (te.every((r) => r.sleeperProj == null) ? null
      : fillLow(te.map((r) => r.sleeperProj))),
  });

  M.push({
    key: "ecr", label: "FantasyPros expert consensus (ECR)", group: "baseline",
    note: "Samsteypa ~100 serfraedinga, forleiks-skrapun. Adeins 2020+.",
    fit: (tr, te) => (te.every((r) => r.ecr == null) ? null
      : fillLow(te.map((r) => (r.ecr != null ? -Math.log(r.ecr) : null)))),
  });

  M.push({
    key: "sleeperAdp", label: "Sleeper ADP", group: "baseline",
    note: "ADP a theim vettvangi sem notandinn draftar a.",
    fit: (tr, te) => (te.every((r) => r.sleeperAdp == null) ? null
      : fillLow(te.map((r) => (r.sleeperAdp != null ? -Math.log(r.sleeperAdp) : null)))),
  });

  /* --- 2. EINFOLD TOLFRAEDI --- */
  M.push({
    key: "prevPts", label: "Last season total points", group: "baseline",
    note: "Heildarstig i fyrra — refsar fyrir meidsli, olikt PPG.",
    fit: (tr, te) => te.map((r) => r.prevPts ?? 0),
  });
  M.push({
    key: "prev", label: "Last season PPG", group: "baseline",
    note: "Stig a leik i fyrra. BLINT A ENDINGU — sja notu vid markmidid.",
    fit: (tr, te) => te.map((r) => r.prevPpg ?? 0),
  });
  M.push({
    key: "w3", label: "Two-season weighted PPG", group: "baseline",
    note: "0,62 a fyrra ar, 0,38 a hitt.",
    fit: (tr, te) => te.map((r) => r.w3Ppg ?? r.prevPpg ?? 0),
  });
  M.push({
    key: "volume", label: "Prior opportunity per game", group: "baseline",
    note: "Sendingar + hlaup per leik. Magn, ekki skilvirkni.",
    fit: (tr, te) => te.map((r) => r.prevOppG ?? 0),
  });

  /* --- 3. RIDGE A BREYTUHOPUM (ablation) --- */
  const ridge = (key, label, cols, group = "ablation", note = "") =>
    M.push({
      key, label, group, note,
      fit: (tr, te, pos) => {
        const trOk = tr.filter((r) => r.y != null);
        if (trOk.length < 25) return null;
        const stats = standardize(trOk, cols);
        const Xtr = designMatrix(trOk, cols, stats);
        const ytr = trOk.map((r) => r.y);
        const lam = pickLambda(Xtr, ytr);
        const m = ridgeFit(Xtr, ytr, lam);
        if (!m) return null;
        return ridgePredict(m, designMatrix(te, cols, stats));
      },
    });

  /* --- 3a. HVER HOPUR EINN OG SER — svarar "hvad ber merkid" --- */
  ridge("r_prod", "only: production (what he did)", F.production);
  ridge("r_opp", "only: workload (what he got)", F.opportunity);
  ridge("r_eff", "only: efficiency (how well he used it)", F.efficiency);
  ridge("r_team", "only: team strength and pace", F.team);
  ridge("r_dur", "only: durability and injury record", F.durability);
  ridge("r_prof", "only: profile (age, draft capital)", F.profile);
  ridge("r_mkt", "only: the crowd (ADP)", F.market);
  ridge("r_exp", "only: the experts (ECR)", F.experts);

  /* --- 3b. SAMSETNINGAR --- */
  const STATS = [...F.production, ...F.opportunity, ...F.efficiency,
                 ...F.team, ...F.durability, ...F.profile];

  ridge("r_stats", "stats only, NO market or experts", STATS,
    "model", "Oll tolfraedi, engin skodun annarra.");
  ridge("r_mkt_stats", "market + stats", [...F.market, ...STATS],
    "model", "Mannfjoldinn og tolfraedin.");
  ridge("r_exp_stats", "experts + stats", [...F.experts, ...STATS], "model");
  ridge("r_all", "market + experts + stats  (A-RANKING)",
    [...F.market, ...F.experts, ...STATS],
    "model", "Allt sem vid hofum. Uppskriftin ad A-Ranking ef hun vinnur.");
  ridge("r_mkt_exp", "market + experts, no stats",
    [...F.market, ...F.experts], "ablation");

  /* --- 3b2. OFAN A SLEEPER ---
     Sleeper-spain maeldist sterkasta einstaka heimildin (rho 0,695
     gegn 0,458 hja ADP). Spurningin sem eftir stendur er hvort
     tolfraedi baeti VID hana — thad er eina leidin ad rodun sem slaer
     baedi ADP OG Sleeper.

     VARNAGLI SEM VERDUR AD FYLGJA THESSUM LIKONUM: Sleeper-gogn na
     adeins til 2022, svo thegar profad er a 2023 er thjalfad a EINU
     ari. Thau eru thvi merkt `thin` og maelingin a theim er veikari
     en hin — ekki af thvi likanid se verra heldur af thvi urtakid er
     minna. */
  ridge("r_slp", "only: Sleeper projection (as a feature)", F.sleeper);
  ridge("r_slp_stats", "Sleeper + stats", [...F.sleeper, ...STATS], "model",
    "Baetir tolfraedi vid sterkustu heimildina?");
  ridge("r_slp_dur", "Sleeper + durability only",
    [...F.sleeper, ...F.durability], "model",
    "Verdleggur Sleeper meidslahaettu? Ef ekki er thetta odyrasta vidbotin.");
  ridge("r_slp_mkt", "Sleeper + market", [...F.sleeper, ...F.market], "model");
  ridge("r_slp_all", "Sleeper + market + experts + stats",
    [...F.sleeper, ...F.market, ...F.experts, ...STATS], "model");

  /* --- 3c. HVAD TAPAST VID AD TAKA HOP UT --- */
  const drop = (name, omit) => ridge(
    `r_no_${name}`, `all but ${name}`,
    [...F.market, ...F.experts, ...STATS].filter((c) => !omit.includes(c)),
    "ablation");
  drop("efficiency", F.efficiency);
  drop("team", F.team);
  drop("durability", F.durability);
  drop("workload", F.opportunity);
  drop("production", F.production);
  drop("market", F.market);
  drop("experts", F.experts);

  /* --- 3c2. OKKAR EIGIN SPA: LEIDRETTING A SKEKKJU SLEEPER ---

     Fyrri tilraunir spadu UTKOMUNNI med Sleeper sem eina breytu af
     morgum. Thad er illa skilyrt: likanid eyðir kroftum i ad laera
     aftur thad sem Sleeper veit thegar, og ridge-refsingin skreppir
     Sleeper-studulinn asamt ollum hinum.

     RETTA LEIDIN AD BAETA STERKAN GRUNN ER AD SPA SKEKKJU HANS.
     Markmidid er `raun - Sleeper`, og spain er `Sleeper + leidretting`.
     Tha byrjar likanid a thvi ad hafa 100% rett fyrir ser thar sem
     Sleeper hefur rett fyrir ser, og laerir adeins hvar hann skeikar
     kerfisbundid — t.d. a gomlum leikmonnum eda theim sem skiptu um
     lid. Ef engin kerfisbundin skekkja er til skilar hun ~0 og spain
     verdur Sleeper obreyttur, sem er retta bakfallid.

     THETTA ER SIDASTA ALVORU TILRAUNIN TIL EIGIN SPAR. Falli hun
     lika er nidurstadan endanleg: vid spaum ekki betur en Sleeper,
     og framlag okkar er umreikningurinn i virdi (A-Ranking). */
  const residModel = (key, label, cols, note) => M.push({
    key, label, group: "model", note,
    fit: (tr, te, pos) => {
      const trOk = tr.filter((r) => r.sleeperProj != null && r.y != null);
      if (trOk.length < 25) return null;
      const stats = standardize(trOk, cols);
      const Xtr = designMatrix(trOk, cols, stats);
      /* MARKMIDID ER SKEKKJAN, ekki utkoman. */
      const ytr = trOk.map((r) => r.y - r.sleeperProj);
      const lam = pickLambda(Xtr, ytr);
      const m = ridgeFit(Xtr, ytr, lam);
      if (!m) return null;
      const corr = ridgePredict(m, designMatrix(te, cols, stats));
      /* Leikmadur an Sleeper-spar faer ekkert grunngildi — hann fer
         nedst, eins og i hinum Sleeper-likonunum. */
      const base = te.map((r) => r.sleeperProj);
      const lo = Math.min(...base.filter((v) => v != null)) - 1;
      return te.map((r, i) => (base[i] == null ? lo : base[i] + corr[i]));
    },
  });

  residModel("slp_resid", "Sleeper + our correction to its error",
    [...F.production, ...F.opportunity, ...F.durability, ...F.profile,
     ...F.team, ...F.market],
    "Spair SKEKKJU Sleeper, ekki utkomunni.");
  residModel("slp_resid_lite", "Sleeper + correction (age, team change, durability only)",
    [...F.durability, ...F.profile, "teamChange"],
    "Adeins thaer breytur sem spa gaeti kerfisbundid misst af.");

  /* Og sama leidretting UMREIKNUÐ I VBD — thad er formið sem
     A-Ranking notar, svo samanburdurinn se jafn. */
  M.push({
    key: "slp_resid_vbd", label: "Sleeper + correction -> VBD",
    group: "mix", note: "Okkar spa, umreiknud i virdi yfir varamanni.",
    fit: (tr, te, pos) => {
      const base = M.find((x) => x.key === "slp_resid").fit(tr, te, pos);
      if (!base) return null;
      const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
      const sorted = base.slice().sort((a, b) => b - a);
      const k = Math.min(sorted.length - 1, (REPL[pos] ?? 24) - 1);
      const around = sorted.slice(Math.max(0, k - 1), k + 2);
      const repl = around.length ? around.reduce((a, b) => a + b, 0) / around.length : 0;
      return base.map((v) => v - repl);
    },
  });

  /* --- 3d. SAMEINING SKODANA — thad sem maelingin bendir a ---

     NIDURSTADA FYRSTU UMFERDAR: ekkert tolfraedilikan slaer ADP, en
     Sleeper-spain gerir thad. Thad er klassiskt merki um ad markadurinn
     se naerri skilvirkur OG ad ein heimild beri raunverulega vidbotar-
     upplysingu. Retta svarid vid thvi er ekki ad reyna 201. tolfraedi-
     likanid heldur ad SAMEINA SKODANIRNAR — hver theirra ber sinn
     havada og hann er ad hluta oskyldur.

     Sameinad a RODUM, ekki gildum: ADP er saeti, ECR er saeti og
     Sleeper er stig. Their eru ekki a sama kvarda og medaltal theirra
     vaeri merkingarlaust. Rodun er eini sameiginlegi kvardinn. */
  const rankMix = (key, label, parts, note) => M.push({
    key, label, group: "mix", note,
    fit: (tr, te, pos) => {
      const cols = [];
      for (const [get, w] of parts) {
        const vals = te.map(get);
        if (vals.every((v) => v == null)) return null;   // heimild vantar alveg
        const filled = fillLow(vals);
        cols.push([rankOf(filled), w]);
      }
      const wsum = cols.reduce((a, [, w]) => a + w, 0);
      return te.map((_, i) =>
        -cols.reduce((a, [r, w]) => a + r[i] * w, 0) / wsum);
    },
  });

  const gAdp = (r) => (r.adp != null ? -r.adp : null);
  const gEcr = (r) => (r.ecr != null ? -r.ecr : null);
  const gSlp = (r) => (r.sleeperProj != null ? r.sleeperProj : null);

  rankMix("mix_adp_slp", "ADP + Sleeper projection",
    [[gAdp, 1], [gSlp, 1]], "Tvaer sterkustu heimildirnar, jofn vog.");
  rankMix("mix_adp_slp2", "ADP + Sleeper x2",
    [[gAdp, 1], [gSlp, 2]], "Meiri vog a Sleeper, sem maeldist betri.");
  rankMix("mix_all3", "ADP + ECR + Sleeper",
    [[gAdp, 1], [gEcr, 1], [gSlp, 1]], "Allar thrjar skodanirnar.");
  rankMix("mix_all3w", "ADP + ECR + Sleeper x2  (A-RANKING)",
    [[gAdp, 1], [gEcr, 1], [gSlp, 2]],
    "Allar thrjar, meiri vog a tha sem maeldist bestur.");
  rankMix("mix_adp_ecr", "ADP + ECR",
    [[gAdp, 1], [gEcr, 1]], "An Sleeper — naer yfir fleiri ar.");

  /* Skodanir + tolfraedi-leidretting: byrjadu a samsteypunni og
     faerdu thig lítillega i att ad likaninu. */
  M.push({
    key: "mix_plus_model", label: "ADP + ECR + Sleeper, nudged 20% by the model",
    group: "mix",
    note: "Samsteypa skodana sem grunnur, likanid sem lítil leidretting.",
    fit: (tr, te, pos) => {
      const base = M.find((x) => x.key === "mix_all3w").fit(tr, te, pos);
      const mod = M.find((x) => x.key === "r_mkt_stats").fit(tr, te, pos);
      if (!base || !mod) return null;
      const a = rankOf(base), b = rankOf(mod);
      return te.map((_, i) => -(0.8 * a[i] + 0.2 * b[i]));
    },
  });

  /* --- 3e. VBD OFAN A BESTU HEIMILDINA ---

     Sleeper spair STIGUM. Draft snyst ekki um stig heldur um VIRDI
     YFIR VARAMANNI: 300 stig fra QB og 300 fra RB eru ekki jafngild
     thvi QB-brekkan er flot. Ef spain er god en rodun hennar er
     hra stig, tha er VBD raunveruleg vidbot — og hun er thad EINA
     sem appid getur att sjalft an thess ad thykjast spa betur.

     Threpin fylgja deildinni (12 lid) og eru reiknud INNAN
     profarsins ur spanni sjalfri, sem er leyfilegt: engin utkoma
     kemur thar vid sogu. */
  const vbdOf = (getProj) => (tr, te, pos) => {
    const vals = te.map(getProj);
    if (vals.every((v) => v == null)) return null;
    /* Varamanns-threp fyrir 12-lida deild, ur maeldri flex-skiptingu:
       QB12, RB28, WR41, TE14. Sja FLEX_SPLIT i model.js. */
    const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
    const sorted = vals.filter((v) => v != null).slice().sort((a, b) => b - a);
    const k = Math.min(sorted.length - 1, (REPL[pos] ?? 24) - 1);
    /* Medaltal thriggja i kringum threpid — ein tala gerir allt VBD
       had einum leikmanni sem gaeti verid utlagi. */
    const around = sorted.slice(Math.max(0, k - 1), k + 2);
    const base = around.length
      ? around.reduce((a, b) => a + b, 0) / around.length : 0;
    const lo = Math.min(...sorted) - base - 1;
    return vals.map((v) => (v != null ? v - base : lo));
  };

  M.push({
    key: "slp_vbd", label: "Sleeper projection -> VBD  (A-RANKING)",
    group: "mix",
    note: "Spa Sleeper umreiknud i virdi yfir varamanni fyrir 12-lida deild.",
    fit: vbdOf((r) => r.sleeperProj),
  });
  M.push({
    key: "adp_vbd_check", label: "ADP -> (no VBD possible, control)",
    group: "mix",
    note: "Vidmid: ADP er thegar virdis-rod, svo VBD a ekki vid.",
    fit: (tr, te) => te.map((r) => (r.adp != null ? -Math.log(r.adp) : -Math.log(400))),
  });

  /* --- 4. BLONDUR VID MARKADINN ---
     Ekki likan heldur LEIDRETTING: byrjadu a markadnum og faerdu thig
     hlutfallid `w` i att ad likaninu. Ef markadurinn er naerri
     skilvirkur er retta svarid lítið `w`, ekki ad henda honum. */
  for (const w of [0.15, 0.3, 0.5]) {
    M.push({
      key: `blend${Math.round(w * 100)}`,
      label: `ADP nudged ${Math.round(w * 100)}% toward the model`,
      group: "blend",
      note: "Rodum ur badum, vegid saman. Vardveitir markadinn sem grunn.",
      fit: (tr, te, pos) => {
        const base = M.find((x) => x.key === "r_mkt_stats").fit(tr, te, pos);
        if (!base) return null;
        const adpRank = rankOf(te.map((r) => (r.adp != null ? -r.adp : -400)));
        const modRank = rankOf(base);
        return te.map((_, i) => -((1 - w) * adpRank[i] + w * modRank[i]));
      },
    });
  }

  return M;
}

/** Vantandi gildi fa gildi UNDIR ollum hinum — their eru odraftadir. */
function fillLow(vals) {
  const ok = vals.filter((v) => v != null && Number.isFinite(v));
  if (!ok.length) return null;
  const lo = Math.min(...ok) - 1;
  return vals.map((v) => (v != null && Number.isFinite(v) ? v : lo));
}

/** Rod (1 = haest gildi). Notad til ad blanda tveimur rodunum. */
function rankOf(vals) {
  const idx = vals.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  const out = new Array(vals.length);
  idx.forEach(([, i], r) => { out[i] = r + 1; });
  return out;
}

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const p3 = (x) => (x == null ? "   -  " : x.toFixed(3)).padStart(6);
const sgn = (x) => (x == null ? "-" : (x > 0 ? "+" : "") + x.toFixed(1));

main().catch((e) => { console.error(e); process.exit(1); });
