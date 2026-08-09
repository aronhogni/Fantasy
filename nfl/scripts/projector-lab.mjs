#!/usr/bin/env node
/* ============================================================
   projector-lab.mjs — HVER ER SOGULEGA BESTUR AD SPA?

     node scripts/projector-lab.mjs [--scoring=ppr|standard]

   -> data/projectors_<scoring>.json

   Notandinn spurdi: RotoWire, FantasyPros, serfraedingar, Sleeper,
   ESPN, NFL.com — hver er bestur? Svarid krefst thess ad hver
   heimild se til SOGULEGA og se tekin FYRIR timabilid. Thad threngir
   mengið verulega og thad er sjalft nidurstada:

   NOTHAEFT SOGULEGA (og hvers vegna):
     Sleeper-spa      2021-2025  eina raunverulega STIGA-spain
     Sleeper-ADP      2020-2025  mannfjoldinn a theim vettvangi
     FantasyPros ECR  2020-2025  samsteypa ~100 serfraedinga
     FFC-ADP          2015-2025  raundroft, badar stigagjafir
     ESPN-ADP         2021-2025  staersti vettvangur heims
     MFL-ADP          2019-2025  10-14 thusund droft a ari

   EKKI NOTHAEFT, OG THAD ER MAELT EN EKKI AGISKAD:
     ESPN-spar        endapunkturinn skilar `appliedTotal` ADEINS
                      fyrir yfirstandandi ar — 0 fyrir 2021/2023
     NFL.com          `researchinfo` skilar 503; enginn opinn
                      sogulegur endapunktur fannst
     RotoWire, PFF,   ollum lokad a greidsluvegg. Their kunna ad vera
     4for4, ETR       godir — vid getum ekki vitad thad, og tool sem
                      thykist vita thad vaeri ad ljuga
     Serfraedingar    FantasyPros-bord einstaklinga na aftur til 2025
     a X/Twitter      eins; engin varanleg skra af theim sem birta
                      radningar a samfelagsmidlum

   ÞETTA ER SVARID VID "hver er bestur": vid getum borid saman SEX
   heimildir sem eru raunverulega maelanlegar. Hinar eru ekki
   utilokadar af thvi thaer seu slaemar heldur af thvi thaer eru
   OMAELANLEGAR — og su greining er sjalf gagnleg.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getJSON, record, pool } from "./lib/http.mjs";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean, spearman, hitRate, bootstrapDiff } from "../src/learn.js";
import { buildIndexes, matchByName } from "../src/names.js";

const OUT = path.resolve(process.cwd(), "data");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const SCORING = String(ARG.scoring || "ppr");
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.map((r) => r.season))].sort();

  /* ---------- SAEKJA THAD SEM VANTAR ---------- */
  const espnAdp = await fetchEspnAdp(years);
  const mflAdp = await fetchMflAdp(years, SCORING);

  /* ---------- TENGJA VID RADIRNAR ---------- */
  const byYear = new Map();
  for (const r of rows) (byYear.get(r.season) || byYear.set(r.season, []).get(r.season)).push(r);

  for (const [y, list] of byYear) {
    const idx = buildIndexes(list);
    for (const [src, store] of [["espnAdp", espnAdp], ["mflAdp", mflAdp]]) {
      const set = store.get(y);
      if (!set) continue;
      for (const e of set) {
        const m = matchByName(idx, e.name, e.pos, e.team);
        if (m) m.item[src] = e.adp;
      }
    }
  }
  for (const [src, store] of [["espnAdp", espnAdp], ["mflAdp", mflAdp]]) {
    const n = rows.filter((r) => r[src] != null).length;
    record(`join_${src}`, n > 300, `${n} rows joined`);
  }

  /* ============================================================
     LEKA-HLID A ADFENGNUM RODUM — SETT UPP EFTIR AD ESPN FELL
     ============================================================
     Fyrsta keyrsla thessarar skrar setti **ESPN-ADP i fyrsta saeti**
     (2.094 stig, ofar en A-Ranking og Sleeper). Su nidurstada var
     rong og hun var mjog truverdug.

     Fylgni vid LEIKI SPILADA — hlidid sem greip Sleeper 2018-2020 —
     greindi hana EKKI (0,17-0,25, sama band og hreinar heimildir).
     Mengunin er hlutaleg: ESPN geymir ADP sem er uppfaert eftir a,
     ekki hreint eftirasnid.

     RETTA HLIDID ER ANNAD: spair FRAVIK heimildarinnar fra hinum
     mannfjoldunum utkomunni? Hrein forleiks-rod getur thad ekki —
     ef hun vikur fra markadinum er thad agiskun sem hittir stundum
     og klikkar stundum. Maelt:

       ar    r(fravik ESPN fra FFC, raunstig)
       2021  +0,248
       2022  +0,284
       2023  +0,325
       2024  +0,268
       2025  -0,357   <- EINA arid sem er ekki lidid

     Doemid sem tekur af vafann: **Sam LaPorta 2023 — ESPN-ADP 64,
     FFC-ADP 153, raunstig 239,3.** Hann var nyliði sem var ekki
     draftadur fyrr en um val 150 og endadi sem TE1. Og 2025, eina
     arid thar sem ADP er raunverulega forleiks-tala, snyst merkid vid.

     Hlidid keyrir a HVERRI heimild, ekki bara ESPN, og notar
     samsteypu HINNA sem vidmid. */
  const LEAK_MAX_DEV = 0.15;
  const rejected = new Map();
  {
    const crowdKeys = ["adp", "espnAdp", "mflAdp", "sleeperAdp"];
    for (const key of crowdKeys) {
      const bad = [];
      for (const y of years) {
        const list = (byYear.get(y) || []).filter((r) => r[key] != null && r.adp != null);
        if (list.length < 80) continue;
        /* Vidmid: samsteypa HINNA mannfjoldanna (skilur thennan eftir). */
        const others = crowdKeys.filter((k) => k !== key);
        const ref = list.filter((r) => others.some((k) => r[k] != null));
        if (ref.length < 80) continue;
        const rankOf = (arr, get) => {
          const idx = arr.map((r, i) => [get(r), i]).filter(([v]) => v != null)
            .sort((a, b) => a[0] - b[0]);
          const out = new Array(arr.length).fill(null);
          idx.forEach(([, i], r) => { out[i] = r + 1; });
          return out;
        };
        const mine = rankOf(ref, (r) => r[key]);
        const theirs = rankOf(ref, (r) => {
          const vs = others.map((k) => r[k]).filter((v) => v != null);
          return vs.length ? mean(vs) : null;
        });
        const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
        const dev = [], out = [];
        for (let i = 0; i < ref.length; i++) {
          if (mine[i] == null || theirs[i] == null) continue;
          dev.push(theirs[i] - mine[i]);
          out.push(pts(ref[i]));
        }
        if (dev.length < 80) continue;
        const r = corr(dev, out);
        if (r > LEAK_MAX_DEV) bad.push({ year: y, r: round3(r) });
      }
      if (bad.length) {
        rejected.set(key, bad);
        record(`leak_${key}`, false,
          `deviation from other crowds predicts the outcome in ${bad.length} seasons ` +
          `(${bad.map((b) => `${b.year} r=${b.r}`).join(", ")}) — REJECTED`);
        for (const r of rows) {
          if (bad.some((b) => b.year === r.season)) r[key] = null;
        }
      } else {
        record(`leak_${key}`, true, "deviation from other crowds carries no foresight");
      }
    }
  }

  /* ---------- SPAMENNIRNIR ---------- */
  const SOURCES = [
    { key: "sleeperProj", label: "Sleeper — projection", kind: "projection",
      dir: 1, note: "Eina raunverulega stiga-spain sem er til sogulega." },
    { key: "sleeperAdp", label: "Sleeper — ADP", kind: "crowd", dir: -1 },
    { key: "ecr", label: "FantasyPros — expert consensus", kind: "expert", dir: -1,
      note: "Samsteypa ~100 serfraedinga." },
    { key: "adp", label: "FantasyFootballCalculator — ADP", kind: "crowd", dir: -1 },
    { key: "espnAdp", label: "ESPN — ADP", kind: "crowd", dir: -1 },
    { key: "mflAdp", label: "MyFantasyLeague — ADP", kind: "crowd", dir: -1 },
  ];

  /* A-Ranking er okkar; hun er reiknud ur Sleeper-spanni. */
  const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };

  const results = [];
  for (const s of [...SOURCES, { key: "__arank", label: "A-Ranking (ours)",
                                 kind: "ours", dir: 1 }]) {
    const per = {}, rhoPer = {}, hitPer = {};
    for (const y of years) {
      const list = (byYear.get(y) || []).filter((r) => r.adp != null);
      if (list.length < 120) continue;
      const val = (r) => value(r, s, REPL, list);
      const have = list.filter((r) => val(r) != null);
      /* Krefjumst thess ad heimildin nai yfir meirihluta laugarinnar.
         Heimild sem nefnir 40 leikmenn er ekki draft-bord. */
      if (have.length < list.length * 0.6) continue;

      const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
      const actual = new Map(list.map((r) => [r.id, { pos: r.pos, pts: pts(r) }]));
      const field = new Map(list.slice().sort((a, b) => a.adp - b.adp)
        .map((r, i) => [r.id, i + 1]));
      /* Leikmenn sem heimildin nefnir ekki fara NEDST, ekki ut —
         annars vaeri hun ad njota thess ad hafa styttri lista. */
      const lo = Math.min(...have.map((r) => val(r))) - 1;
      const board = new Map(list.slice()
        .sort((a, b) => (val(b) ?? lo) - (val(a) ?? lo))
        .map((r, i) => [r.id, i + 1]));

      per[y] = mean(range(1, TEAMS).map((slot) =>
        simulateDraft({ board, fieldBoard: field, actual, slot, league: LEAGUE }).points));
      rhoPer[y] = spearman(have.map((r) => val(r)), have.map((r) => pts(r)));
      const rb = have.filter((r) => r.pos === "RB");
      hitPer[y] = rb.length > 36
        ? hitRate(rb.map((r) => val(r)), rb.map((r) => pts(r)), 24) : null;
    }
    const ys = Object.keys(per).map(Number);
    if (ys.length < 3) {
      results.push({ ...s, years: ys.length, note: (s.note || "") + " (of fa ar)" });
      continue;
    }
    results.push({
      key: s.key, label: s.label, kind: s.kind, note: s.note || null,
      years: ys.length, seasons: ys,
      draft: round1(mean(ys.map((y) => per[y]))),
      perSeason: Object.fromEntries(ys.map((y) => [y, round1(per[y])])),
      rho: round3(mean(ys.map((y) => rhoPer[y]).filter((v) => v != null))),
      hitRB: round3(mean(ys.map((y) => hitPer[y]).filter((v) => v != null))),
    });
  }

  /* ---------- SAMANBURDUR A SOMU ARUM ----------
     Heimildir sem FELLU a leka-hlidinu eru teknar UT ADUR en
     sameiginlegu arin eru reiknud. Annars threngja thaer mengið
     nidur i ekkert og fella samanburdinn a theim sem stodust —
     sem er nakvaemlega ofug afleiding thess ad hafna theim. */
  const alive = results.filter((r) => r.perSeason && !rejected.has(r.key));
  const common = years.filter((y) => alive.every((r) => r.perSeason[y] != null));
  for (const r of alive) {
    if (!r.perSeason) continue;
    r.draftCommon = common.length >= 3
      ? round1(mean(common.map((y) => r.perSeason[y]))) : null;
  }

  const ranked = alive.filter((r) => r.draftCommon != null)
    .sort((a, b) => b.draftCommon - a.draftCommon);

  console.log(`\n${"=".repeat(86)}`);
  console.log(`  HVER ER BESTUR? · ${SCORING.toUpperCase()} · somu ar: ${common.join(", ")}`);
  console.log("=".repeat(86));
  console.log("   stig    rho   RB-hittni  ar   tegund      heimild");
  for (const r of ranked) {
    console.log(`${String(r.draftCommon).padStart(7)}  ${String(r.rho).padStart(6)}  ` +
      `${String((r.hitRB * 100).toFixed(0) + "%").padStart(7)}    ${String(r.years).padStart(2)}   ` +
      `${r.kind.padEnd(11)} ${r.label}`);
  }

  const skipped = results.filter((r) => !r.draftCommon && !rejected.has(r.key));
  if (skipped.length) {
    console.log("\n  utan samanburdar (of fa ar eda of litil thekja):");
    for (const r of skipped) console.log(`    ${r.label} — ${r.years} ar`);
  }
  if (rejected.size) {
    console.log("\n  FELLDAR A LEKA-HLIDINU (rod theirra veit um utkomuna):");
    for (const [k, bad] of rejected) {
      const lab = (SOURCES.find((s) => s.key === k) || {}).label || k;
      console.log(`    ${lab} — ${bad.length} ar, fravik spair utkomu ` +
        `(r ${bad.map((b) => b.r).join(", ")})`);
    }
  }

  /* ---------- VIKMORK GEGN BESTU ODRU HEIMILD ---------- */
  const ours = ranked.find((r) => r.kind === "ours");
  const bestOther = ranked.find((r) => r.kind !== "ours");
  if (ours && bestOther) {
    const b = bootstrapDiff(
      Object.fromEntries(common.map((y) => [y, ours.perSeason[y]])),
      Object.fromEntries(common.map((y) => [y, bestOther.perSeason[y]])));
    const wins = common.filter((y) => ours.perSeason[y] > bestOther.perSeason[y]).length;
    console.log(`\n  A-Ranking gegn bestu adfengnu heimild (${bestOther.label}):`);
    console.log(`    ${sgn(ours.draftCommon - bestOther.draftCommon)} stig · ` +
      `vinnur ${wins}/${common.length} ar · ` +
      `bootstrap [${sgn(b.lo)}, ${sgn(b.hi)}] ` +
      (b.excludesZero ? "MARKTAEKT" : "utilokar ekki null"));
  }

  await writeFile(path.join(OUT, `projectors_${SCORING}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    scoring: SCORING, commonSeasons: common,
    sources: ranked, unusable: skipped.map((r) => ({ label: r.label, years: r.years })),
    leakGate: Object.fromEntries([...rejected].map(([k, v]) => [k, v])),
    notMeasurable: [
      { name: "ESPN projections", why: "appliedTotal is served only for the current season" },
      { name: "NFL.com", why: "no open historical endpoint; researchinfo returns 503" },
      { name: "RotoWire, PFF, 4for4, Establish the Run", why: "paywalled" },
      { name: "Individual analysts on X", why: "no durable archive of pre-season boards" },
    ],
  }, null, 1));
  console.log(`\n-> data/projectors_${SCORING}.json`);
}

/** Gildi heimildar fyrir rod. Haerra = betra. */
function value(r, s, REPL, list) {
  if (s.key === "__arank") {
    if (r.sleeperProj == null) return null;
    const same = list.filter((x) => x.pos === r.pos && x.sleeperProj != null)
      .map((x) => x.sleeperProj).sort((a, b) => b - a);
    if (!same.length) return null;
    const k = Math.min(same.length - 1, (REPL[r.pos] ?? 24) - 1);
    const around = same.slice(Math.max(0, k - 1), k + 2);
    return r.sleeperProj - (around.length ? mean(around) : 0);
  }
  const v = r[s.key];
  if (v == null) return null;
  return s.dir > 0 ? v : -Math.log(Math.max(1, v));
}

/* ---------- adfengin ADP ---------- */

async function fetchEspnAdp(years) {
  const out = new Map();
  const POS = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
  const TEAM = { 0: null, 1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL",
    7: "DEN", 8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR",
    15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI",
    22: "ARI", 23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WAS",
    29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU" };
  await pool(years, 2, async (y) => {
    try {
      const raw = await getJSON(
        `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${y}/players?scoringPeriodId=0&view=kona_player_info`,
        { headers: { "X-Fantasy-Filter": '{"players":{"filterActive":{"value":true}}}' },
          timeout: 180_000 });
      const list = [];
      for (const p of raw) {
        const adp = p.ownership && p.ownership.averageDraftPosition;
        if (!adp || adp <= 0 || adp > 400) continue;
        const pos = POS[p.defaultPositionId];
        if (!["QB", "RB", "WR", "TE"].includes(pos)) continue;
        list.push({ name: p.fullName, pos, team: TEAM[p.proTeamId] ?? null, adp });
      }
      if (list.length > 100) out.set(y, list);
      record(`espn_adp_${y}`, list.length > 100, `${list.length} players`);
    } catch (e) { record(`espn_adp_${y}`, false, `failed: ${e.message}`); }
  });
  return out;
}

async function fetchMflAdp(years, scoring) {
  const out = new Map();
  const ppr = scoring === "ppr" ? 1 : 0;
  /* MFL notar eigin audkenni; nofn faest ur `players`-endapunktinum.
     Sott EINU SINNI og endurnytt. */
  let names = null;
  try {
    const d = await getJSON(
      "https://api.myfantasyleague.com/2025/export?TYPE=players&DETAILS=1&JSON=1",
      { timeout: 120_000 });
    names = new Map((d.players.player || []).map((p) => [p.id, p]));
    record("mfl_players", names.size > 1000, `${names.size} players`);
  } catch (e) { record("mfl_players", false, `failed: ${e.message}`); return out; }

  await pool(years, 2, async (y) => {
    try {
      const d = await getJSON(
        `https://api.myfantasyleague.com/${y}/export?TYPE=adp&PERIOD=DRAFT&IS_PPR=${ppr}` +
        `&IS_KEEPER=N&IS_MOCK=0&CNT=400&JSON=1`, { timeout: 60_000 });
      const list = [];
      for (const p of (d.adp && d.adp.player) || []) {
        const meta = names.get(p.id);
        if (!meta || !meta.name) continue;
        const pos = meta.position;
        if (!["QB", "RB", "WR", "TE"].includes(pos)) continue;
        /* MFL skrifar "Eftirnafn, Fornafn". */
        const parts = String(meta.name).split(",").map((x) => x.trim());
        const nm = parts.length === 2 ? `${parts[1]} ${parts[0]}` : meta.name;
        const adp = Number(p.averagePick);
        if (!Number.isFinite(adp) || adp <= 0) continue;
        list.push({ name: nm, pos, team: meta.team || null, adp });
      }
      if (list.length > 100) out.set(y, list);
      record(`mfl_adp_${y}`, list.length > 100,
        `${list.length} players from ${d.adp && d.adp.totalDrafts} drafts`);
    } catch (e) { record(`mfl_adp_${y}`, false, `failed: ${e.message}`); }
  });
  return out;
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

const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const sgn = (x) => (x == null ? "-" : (x > 0 ? "+" : "") + x.toFixed(1));
const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const round3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);

main().catch((e) => { console.error(e); process.exit(1); });
