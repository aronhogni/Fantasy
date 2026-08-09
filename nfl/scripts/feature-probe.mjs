#!/usr/bin/env node
/* ============================================================
   feature-probe.mjs — BAETIR THETTA EINHVERJU VID SLEEPER?

     node scripts/feature-probe.mjs

   -> data/feature_probe.json

   RETTA PROFID A NYRRI BREYTU ER EKKI "spair hun utkomunni" heldur
   "**spair hun thvi sem Sleeper MISSIR AF**". Sleeper-spain er
   sterkasta heimildin sem vid hofum; breyta sem endurtekur hana
   baetir engu, hversu vel sem hun fylgir utkomunni.

   Thess vegna er markmidid hér SKEKKJA SLEEPER:
       leif = raunveruleg stig - spa Sleeper
   og spurt hvort breytan fylgi henni. Fylgni vid leif er beint mat a
   thvi hvad breytan getur baett vid, og hun er odyr — engin
   draft-hermun tharf.

   THRJAR HUGMYNDIR SEM NOTANDINN SPURDI UM ERU PROFADAR HER:
     1. FORLEIKUR — ny heimild (ESPN-leikskyrslur), aldrei profud
     2. SIDUSTU/FYRSTU LEIKIR fyrra timabils — "endadi hann sterkt?"
     3. MEIDSLASAGA — thegar profud i samsettu likani, nu ein og ser
        gegn leifinni

   VARNAGLI SEM GILDIR UM ALLAR TOLUR HER: fylgni vid leif er NEDRI
   MORK a gagnsemi, ekki ovefengjanleg sonnun. Breyta getur haft
   fylgni 0,05 og samt ekki batid akvordun. En breyta med fylgni
   ~0 getur thad ekki, og thad er thad sem profid sker ur um.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getJSON, getText, record, pool } from "./lib/http.mjs";
import { objects, num, str } from "./lib/csv.mjs";
import { normPos } from "../src/scoring.js";
import { normTeam, buildIndexes, matchByName } from "../src/names.js";
import { stamp } from "./lib/provenance.mjs";
import { mean, spearman, standardize, designMatrix, ridgeFit, ridgePredict,
         pickLambda } from "../src/learn.js";

const OUT = path.resolve(process.cwd(), "data");
const REL = "https://github.com/nflverse/nflverse-data/releases/download";
const SITE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === "ppr" && r.sleeperProj != null);
  const years = [...new Set(rows.map((r) => r.season))].sort();
  console.log(`grunnur: ${rows.length} radir, ${years.join(", ")}`);

  /* ---------- 1. SIDUSTU OG FYRSTU LEIKIR FYRRA TIMABILS ----------
     "Endadi hann sterkt" er ein utbreiddasta draft-hugmyndin sem til
     er og hun er auðprofud: bædi PPG sidustu fjogurra vikna og
     munurinn a sidasta og fyrsta thridjungi. */
  console.log("\nreikna sidustu/fyrstu leiki …");
  const splits = new Map();          // `${gsis}|${year}` -> { last4, first4, trendIn }
  for (const y of [...new Set(years.map((v) => v - 1))]) {
    try {
      const t = await getText(`${REL}/stats_player/stats_player_week_${y}.csv`);
      const wk = objects(t, ["player_id", "season_type", "week", "position",
        "passing_yards", "passing_tds", "passing_interceptions", "carries",
        "rushing_yards", "rushing_tds", "receptions", "targets",
        "receiving_yards", "receiving_tds", "fumbles_lost_total"]);
      const by = new Map();
      for (const r of wk) {
        if (r.season_type !== "REG") continue;
        const id = str(r.player_id);
        if (!id) continue;
        const p = 0.04 * n(r.passing_yards) + 4 * n(r.passing_tds) -
          n(r.passing_interceptions) + 0.1 * n(r.rushing_yards) + 6 * n(r.rushing_tds) +
          n(r.receptions) + 0.1 * n(r.receiving_yards) + 6 * n(r.receiving_tds) -
          2 * n(r.fumbles_lost_total);
        (by.get(id) || by.set(id, []).get(id)).push({ week: num(r.week), pts: p,
          tgt: n(r.targets), car: n(r.carries) });
      }
      for (const [id, list] of by) {
        if (list.length < 8) continue;
        list.sort((a, b) => a.week - b.week);
        const last4 = list.slice(-4), first4 = list.slice(0, 4);
        const third = Math.max(3, Math.floor(list.length / 3));
        splits.set(`${id}|${y + 1}`, {
          last4: mean(last4.map((x) => x.pts)),
          first4: mean(first4.map((x) => x.pts)),
          last4Opp: mean(last4.map((x) => x.tgt + x.car)),
          first4Opp: mean(first4.map((x) => x.tgt + x.car)),
          lateMinusEarly: mean(list.slice(-third).map((x) => x.pts)) -
                          mean(list.slice(0, third).map((x) => x.pts)),
          oppLateMinusEarly: mean(list.slice(-third).map((x) => x.tgt + x.car)) -
                             mean(list.slice(0, third).map((x) => x.tgt + x.car)),
        });
      }
      record(`splits_${y}`, true, `${by.size} players`);
    } catch (e) { record(`splits_${y}`, false, `failed: ${e.message}`); }
  }

  /* ---------- 2. FORLEIKUR ----------
     ESPN ber fullar leikskyrslur ur forleik. Merkid sem gaeti verid
     thar er EKKI framleidsla (byrjunarlid spilar eina seriu) heldur
     hvort madurinn spilar YFIRLEITT og med hverjum. Vid maelum thad
     odyrasta sem naest: framleidslu og taekifaeri i forleik. */
  console.log("\nsaeki forleik (ESPN) …");
  const preseason = new Map();       // `${name}|${year}` -> { pts, opp, games }
  const preYears = years.slice();
  await pool(preYears, 2, async (y) => {
    try {
      let games = 0;
      for (const wk of [1, 2, 3]) {
        const sb = await getJSON(
          `${SITE}/scoreboard?dates=${y}&seasontype=1&week=${wk}`);
        const ids = (sb.events || []).map((e) => e.id);
        await pool(ids, 4, async (eid) => {
          try {
            const s = await getJSON(`${SITE}/summary?event=${eid}`);
            for (const team of (s.boxscore && s.boxscore.players) || []) {
              for (const cat of team.statistics || []) {
                const keys = cat.keys || [];
                for (const a of cat.athletes || []) {
                  const nm = a.athlete && a.athlete.displayName;
                  if (!nm) continue;
                  const k = `${nm}|${y}`;
                  const cur = preseason.get(k) ||
                    { pts: 0, opp: 0, games: new Set(), name: nm };
                  const g = (key) => {
                    const i = keys.indexOf(key);
                    return i >= 0 ? num(a.stats[i]) || 0 : 0;
                  };
                  if (cat.name === "passing") {
                    cur.pts += 0.04 * g("passingYards") + 4 * g("passingTouchdowns")
                             - g("interceptions");
                    cur.opp += g("passingAttempts") || 0;
                  } else if (cat.name === "rushing") {
                    cur.pts += 0.1 * g("rushingYards") + 6 * g("rushingTouchdowns");
                    cur.opp += g("rushingAttempts") || 0;
                  } else if (cat.name === "receiving") {
                    cur.pts += g("receptions") + 0.1 * g("receivingYards")
                             + 6 * g("receivingTouchdowns");
                    cur.opp += g("receptions") || 0;
                  } else continue;
                  cur.games.add(eid);
                  preseason.set(k, cur);
                }
              }
            }
            games++;
          } catch { /* einn leikur ma vanta */ }
        });
      }
      record(`preseason_${y}`, games > 20, `${games} preseason games read`);
    } catch (e) { record(`preseason_${y}`, false, `failed: ${e.message}`); }
  });
  console.log(`  forleiks-radir: ${preseason.size}`);

  /* Porum forleik a nafni innan ars. */
  const preIdx = {};
  for (const y of years) {
    const list = [...preseason.entries()]
      .filter(([k]) => k.endsWith(`|${y}`))
      .map(([, v]) => ({ name: v.name, pos: null, ...v }));
    preIdx[y] = list;
  }

  /* ---------- 3. TENGJUM VID LEIFINA ---------- */
  const data = [];
  for (const r of rows) {
    const sp = splits.get(`${r.id}|${r.season}`) || {};
    /* Forleikur er paradur a nafni — merkt sem slikt. */
    const preList = preIdx[r.season] || [];
    const hit = preList.find((p) => norm(p.name) === norm(r.name));
    data.push({
      ...r,
      resid: r.pts - r.sleeperProj,
      last4: sp.last4 ?? null,
      first4: sp.first4 ?? null,
      lateMinusEarly: sp.lateMinusEarly ?? null,
      oppLateMinusEarly: sp.oppLateMinusEarly ?? null,
      last4Opp: sp.last4Opp ?? null,
      preseasonPts: hit ? hit.pts : null,
      preseasonOpp: hit ? hit.opp : null,
      preseasonG: hit ? hit.games.size : null,
    });
  }
  const withPre = data.filter((d) => d.preseasonPts != null).length;
  const withSplit = data.filter((d) => d.last4 != null).length;
  console.log(`\nthekja: forleikur ${withPre}/${data.length}, ` +
    `sidustu leikir ${withSplit}/${data.length}`);

  /* ---------- 4. PROFID ---------- */
  const CANDIDATES = [
    ["last4", "Last 4 games of last season (PPG)"],
    ["first4", "First 4 games of last season (PPG)"],
    ["lateMinusEarly", "Finished stronger than he started (points)"],
    ["oppLateMinusEarly", "Finished with more opportunity than he started"],
    ["last4Opp", "Opportunity in the last 4 games"],
    ["preseasonPts", "Preseason fantasy points"],
    ["preseasonOpp", "Preseason opportunity (att + rec)"],
    ["preseasonG", "Preseason games appeared in"],
    /* Til samanburdar: thad sem vid vitum thegar ad virkar eda ekki. */
    ["prevPpg", "(control) last season PPG"],
    ["durability", "(control) durability, two seasons"],
    ["prevMissed", "(control) games missed last season"],
    ["prevOnReport", "(control) weeks on the injury report"],
    ["age", "(control) age"],
    ["logAdp", "(control) log ADP"],
  ];
  for (const d of data) d.logAdp = d.adp != null ? Math.log(d.adp) : null;

  const results = [];
  for (const [key, label] of CANDIDATES) {
    const sub = data.filter((d) => d[key] != null && Number.isFinite(d[key]));
    if (sub.length < 150) {
      results.push({ key, label, n: sub.length, r: null, note: "of fatt" });
      continue;
    }
    const r = corr(sub.map((d) => d[key]), sub.map((d) => d.resid));
    const rho = spearman(sub.map((d) => d[key]), sub.map((d) => d.resid));
    /* Innan stodu — thvert a stodur getur breyta fylgt leifinni bara
       af thvi ad hun fylgir stodunni. */
    const byPos = {};
    for (const p of ["RB", "WR", "TE", "QB"]) {
      const s2 = sub.filter((d) => d.pos === p);
      byPos[p] = s2.length >= 60 ? round3(corr(s2.map((d) => d[key]),
        s2.map((d) => d.resid))) : null;
    }
    results.push({ key, label, n: sub.length, r: round3(r), rho: round3(rho), byPos });
  }

  results.sort((a, b) => Math.abs(b.r ?? 0) - Math.abs(a.r ?? 0));
  console.log(`\n${"=".repeat(88)}`);
  console.log("  FYLGNI VID SKEKKJU SLEEPER — baetir breytan einhverju vid?");
  console.log("=".repeat(88));
  console.log("       r     RB     WR     TE      n   breyta");
  for (const x of results) {
    console.log(`${fmt(x.r)} ${fmt(x.byPos && x.byPos.RB)} ${fmt(x.byPos && x.byPos.WR)} ` +
      `${fmt(x.byPos && x.byPos.TE)} ${String(x.n).padStart(6)}   ${x.label}`);
  }

  /* ---------- 5. SAMEIGINLEGT PROF ----------
     Baeta THAER ALLAR SAMAN einhverju? Ridge a leifinni, walk-forward. */
  const NEW = ["last4", "lateMinusEarly", "oppLateMinusEarly",
               "preseasonPts", "preseasonOpp"];
  const lift = walkForwardLift(data, NEW, years);
  console.log(`\n  allar nyju breyturnar saman, ridge a leifinni, walk-forward:`);
  console.log(`    R2 utan urtaks = ${lift == null ? "-" : (lift * 100).toFixed(2) + "%"}`);
  console.log(lift != null && lift > 0.02
    ? "    -> baetir maelanlega vid. Vert ad taka inn."
    : "    -> baetir ekki maelanlega vid Sleeper.");

  await writeFile(path.join(OUT, "feature_probe.json"), JSON.stringify({
    /* Hvernig thessi skra vard til — sja lib/provenance.mjs. */
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: {}, inputs: ["features.json"], dataDir: OUT }),
    generated: new Date().toISOString(),
    seasons: years, n: data.length,
    coverage: { preseason: withPre, lateEarly: withSplit },
    candidates: results, jointLift: lift,
  }, null, 1));
  console.log("\n-> data/feature_probe.json");
}

/** Ridge a leifinni, thjalfad a fyrri arum. Skilar R2 utan urtaks. */
function walkForwardLift(data, cols, years) {
  let sse = 0, sst = 0, n = 0;
  for (let i = 1; i < years.length; i++) {
    const y = years[i];
    const tr = data.filter((d) => d.season < y);
    const te = data.filter((d) => d.season === y);
    if (tr.length < 100 || !te.length) continue;
    const stats = standardize(tr, cols);
    const m = ridgeFit(designMatrix(tr, cols, stats), tr.map((d) => d.resid),
      pickLambda(designMatrix(tr, cols, stats), tr.map((d) => d.resid)));
    if (!m) continue;
    const pred = ridgePredict(m, designMatrix(te, cols, stats));
    const mAct = mean(te.map((d) => d.resid));
    te.forEach((d, j) => {
      sse += (d.resid - pred[j]) ** 2;
      sst += (d.resid - mAct) ** 2;
      n++;
    });
  }
  return n && sst ? 1 - sse / sst : null;
}

function corr(a, b) {
  const ma = mean(a), mb = mean(b);
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : 0;
}

const n = (v) => (v == null || !Number.isFinite(Number(v)) ? 0 : Number(v));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "")
  .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "").replace(/\s+/g, " ").trim();
const round3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const fmt = (x) => (x == null ? "    - " : x.toFixed(3)).padStart(6);

main().catch((e) => { console.error(e); process.exit(1); });
