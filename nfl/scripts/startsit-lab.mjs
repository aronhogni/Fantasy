#!/usr/bin/env node
/* ============================================================
   startsit-lab.mjs — HJALPAR VIKULEGA SPAIN VID AD VELJA LIDID?

     node scripts/startsit-lab.mjs [--scoring=ppr|standard] [--from=2019]

   -> data/startsit_<scoring>.json

   ============================================================
   HVERS VEGNA ThETTA ER TIL, OG HVERS VEGNA ThAD KOM EKKI FYRR
   ============================================================
   `weeklyProjection()` i model.js hefur verid SKRIFAD OG OPROFAD fra
   upphafi: thad margfaldar grunnspa med LEIKJAFLAEDI (vaentum stigum
   lidsins ur markadslinunni) og VORN ANDSTAEDINGSINS. Husreglan segir
   ad omaeldur kodi fari ekki i loftid, og hann for ekki — `MyTeam`
   notar `proj / 17`, timabils-spána deilda nidur.

   Hann var ekki haegt ad maela THVI markadslinur per viku voru adeins
   til fyrir yfirstandandi timabil. `fetch-schedule-history.mjs` sotti
   thaer 2019-2025 (1.960 leikir, 100% med bædi total og spread), svo
   nu er thetta maelanlegt i fyrsta sinn.

   ============================================================
   SPURNINGIN ER EKKI "ER SPAIN NAKVAEM" HELDUR "BREYTIR HUN VALINU"
   ============================================================
   Vikuleg spa sem er nakvaemari en onnur en radar ollum eins er
   EINSKIS VIRDI i start/sit: thu setur sama lidid a vollinn. Thess
   vegna er maelikvardinn STIGIN SEM LIDID SKORADI, ekki fylgni.

   FJORAR ADFERDIR, allar med SAMA HOP i somu viku:
     floor    hendingu radid — nedri mork, hvad kostar ad velja illa
     flat     timabils-spa deilt med 17 (ThAD SEM APPID GERIR I DAG)
     weekly   `weeklyProjection` — leikjaflaedi x vorn x tiltaekileiki
     ceiling  fullkomin vitneskja um vikuna — efri mork

   Talan sem skiptir mali er HLUTFALL BILSINS SEM ER LOKAD:
       (weekly - flat) / (ceiling - flat)
   Hun segir hve mikid af thvi sem YFIRHOFUD var haegt ad vinna
   vikulega spain naer. Hratt stiga-tal er merkingarlaust an hennar:
   +3 stig a timabili gaeti verid 1% af bilinu eda 40%.

   HOPARNIR ERU RAUNVERULEGIR — their koma ur hermdum droftum eftir
   ADP, ekki ur handahofskenndum listum. Lid sem enginn myndi drafta
   gefur start/sit-akvardanir sem enginn stendur frammi fyrir.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { weeklyProjection, impliedTeamTotals, availability } from "../src/model.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), { scoring: ["ppr", "standard"], from: "number" });
const SCORING = String(ARG.scoring || "ppr");
const FROM = Number(ARG.from || 2019);
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

/** Besta uppstilling vikunnar ur GEFNU mati. Saetin eru hreidrud. */
function lineupFrom(roster, scoreOf, actualOf) {
  const pool = roster.map((id) => ({ id, s: scoreOf(id), pos: actualOf(id) && actualOf(id).pos }))
    .filter((p) => p.pos && p.s != null);
  const by = { QB: [], RB: [], WR: [], TE: [] };
  for (const p of pool) if (by[p.pos]) by[p.pos].push(p);
  for (const k in by) by[k].sort((a, b) => b.s - a.s);
  const picked = [];
  const take = (pos, n) => { picked.push(...by[pos].splice(0, n)); };
  take("QB", 1); take("RB", 2); take("WR", 3); take("TE", 1);
  const flex = [...by.RB, ...by.WR, ...by.TE].sort((a, b) => b.s - a.s);
  if (flex.length) picked.push(flex[0]);
  /* STIGIN ERU ALLTAF RAUNVERULEG. Matid velur hverjir spila; thad
     gefur engin stig sjalft. Ad skora uppstillinguna med matinu vaeri
     ad maela hvad spain heldur um sjalfa sig. */
  return picked.reduce((a, p) => a + (actualOf(p.id) ? actualOf(p.id).pts : 0), 0);
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const sched = JSON.parse(await readFile(path.join(OUT, "schedule_history.json"), "utf8"));
  let defFile = [];
  try { defFile = JSON.parse(await readFile(path.join(OUT, "defense.json"), "utf8")); }
  catch { console.log("  (defense.json vantar — vornarlidurinn verdur hlutlaus)"); }
  const rows = feats.rows.filter((r) => r.scoring === SCORING);

  const years = [...new Set(rows.filter((r) => r.sleeperProj != null || r.ffProj != null)
    .map((r) => r.season))].sort().filter((y) => y >= FROM);
  console.log(`${SCORING} · timabil: ${years.join(", ")}`);

  /* Vorn gegn stodu, per ar og lid — `defense.json` ber `adj` og
     `leagueMean` sem `defenseMult` les. */
  const dvp = new Map();
  for (const d of defFile) dvp.set(`${d.season}|${d.team}|${d.pos}`, d);

  const out = { perSeason: {}, totals: null };
  const closed = [];
  for (const y of years) {
    let weekly;
    try { weekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8")); }
    catch { continue; }

    const games = sched.games.filter((g) => g.season === y && g.type === "REG");
    if (!games.length) { console.log(`  ${y}: engir leikir i skra`); continue; }

    /* Vaent stig hvers lids i hverri viku, ur linunni. */
    const implied = new Map();
    const oppOf = new Map();
    for (const g of games) {
      const t = impliedTeamTotals(g.total, g.spread);
      if (t) {
        implied.set(`${g.home}|${g.week}`, t.home);
        implied.set(`${g.away}|${g.week}`, t.away);
      }
      oppOf.set(`${g.home}|${g.week}`, g.away);
      oppOf.set(`${g.away}|${g.week}`, g.home);
    }

    const yr = rows.filter((r) => r.season === y && r.adp != null &&
      (r.sleeperProj != null || r.ffProj != null));
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos,
      proj: r.sleeperProj != null ? r.sleeperProj : r.ffProj,
      adp: r.adp, actual: pts(r) }));

    /* Vikuleg raunstig OG lid leikmannsins tha viku. */
    const wk = new Map(), teamWk = new Map(), weeks = new Set();
    for (const w of weekly) {
      if (w.week > 18) continue;
      weeks.add(w.week);
      wk.set(`${w.id}|${w.week}`, { pos: w.pos, pts: SCORING === "ppr" ? w.ppr : w.std });
      if (w.team) teamWk.set(`${w.id}|${w.week}`, w.team);
    }
    const wl = [...weeks].sort((a, b) => a - b);

    /* Hoparnir — hermt draft eftir ADP, 12 saeti. */
    const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
    const field = new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1]));
    const rosters = [];
    for (let slot = 1; slot <= TEAMS; slot++) {
      rosters.push(simulateDraft({ board: field, fieldBoard: field, actual,
        slot, league: LEAGUE }).roster);
    }

    const projOf = new Map(pool.map((p) => [p.id, p.proj]));
    let sFloor = 0, sFlat = 0, sWeek = 0, sCeil = 0, n = 0;
    let seed = y * 7919;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    for (const roster of rosters) {
      for (const week of wl) {
        const actualOf = (id) => wk.get(`${id}|${week}`) || null;
        const played = roster.filter((id) => actualOf(id));
        if (played.length < 9) continue;            // of thunnt til ad stilla upp
        n++;

        sFloor += lineupFrom(roster, () => rnd(), actualOf);
        sFlat += lineupFrom(roster, (id) => (projOf.get(id) ?? 0) / 17, actualOf);
        sCeil += lineupFrom(roster, (id) => (actualOf(id) ? actualOf(id).pts : null), actualOf);

        sWeek += lineupFrom(roster, (id) => {
          const base = (projOf.get(id) ?? 0) / 17;
          const a = actualOf(id);
          if (!a) return null;
          const team = teamWk.get(`${id}|${week}`);
          const imp = team ? implied.get(`${team}|${week}`) : null;
          const opp = team ? oppOf.get(`${team}|${week}`) : null;
          const d = opp ? dvp.get(`${y}|${opp}|${a.pos}`) : null;
          const wp = weeklyProjection({ base, pos: a.pos, implied: imp,
            def: d ? { adj: d.adj, leagueMean: d.leagueMean } : null, avail: 1, bye: false });
          return wp && wp.pts != null ? wp.pts : base;
        }, actualOf);
      }
    }
    if (!n) continue;
    const gap = sCeil - sFlat;
    const gained = sWeek - sFlat;
    const pct = gap > 0 ? gained / gap * 100 : null;
    closed.push(pct);
    out.perSeason[y] = { lineups: n,
      floor: r1(sFloor / n), flat: r1(sFlat / n), weekly: r1(sWeek / n), ceiling: r1(sCeil / n),
      gainedPerLineup: r1(gained / n), gapPerLineup: r1(gap / n), pctOfGapClosed: r3(pct) };
    console.log(`  ${y}  n=${String(n).padStart(4)}  hending ${(sFloor / n).toFixed(1)}` +
      ` · flat ${(sFlat / n).toFixed(1)} · vikuleg ${(sWeek / n).toFixed(1)}` +
      ` · fullkomid ${(sCeil / n).toFixed(1)}  ->  ${pct == null ? "—" : pct.toFixed(1) + "% af bilinu"}`);
  }

  const ys = Object.keys(out.perSeason).map(Number).sort();
  requireSeasons(ys, "timabil med vikugognum OG linum");

  const m = mean(closed);
  const sd = Math.sqrt(mean(closed.map((v) => (v - m) ** 2)) * closed.length /
                       Math.max(1, closed.length - 1));
  const se = sd / Math.sqrt(closed.length);
  const tCrit = closed.length > 6 ? 2.228 : 2.776;
  const t = se ? m / se : 0;
  const gains = ys.map((y) => out.perSeason[y].gainedPerLineup);

  console.log(`\n${"=".repeat(72)}`);
  console.log(`  VIKULEG SPA GEGN "timabils-spa / 17" — ThAD SEM APPID GERIR I DAG`);
  console.log("=".repeat(72));
  console.log(`  lokar ${m.toFixed(1)}% af bilinu upp i fullkomna vitneskju` +
    ` · ${closed.filter((v) => v > 0).length}/${closed.length} ar jakvaed`);
  console.log(`  t = ${t.toFixed(2)} · 95% [${(m - tCrit * se).toFixed(1)}%, ${(m + tCrit * se).toFixed(1)}%]`);
  /* `mean([])` ER NULL (`src/learn.js`, 18.8.2026). Engin timabil -> "—",
     ekki "+0,00 per uppstillingu", sem hefdi lesid eins og MAELT jafntefli. */
  const gm = mean(gains);
  console.log(gm == null
    ? "  i stigum: — (engin timabil i urtakinu)"
    : `  i stigum: ${gm > 0 ? "+" : ""}${gm.toFixed(2)} per uppstillingu`
      + ` = ${(gm * 17).toFixed(1)} a timabili`);
  const verdict = Math.abs(t) > tCrit && m > 0 ? "STENST" : "FELLUR";
  console.log(`  -> ${verdict}`);

  out.totals = { pctOfGapClosed: r3(m), t: r3(t), years: closed.length,
                 positive: closed.filter((v) => v > 0).length,
                 pointsPerLineup: r3(mean(gains)), pointsPerSeason: r1(mean(gains) * 17),
                 tCrit, verdict };

  await writeFile(path.join(OUT, `startsit_${SCORING}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: { scoring: "ppr", from: 2019 },
      inputs: ["features.json", "schedule_history.json", "defense.json"], dataDir: OUT }),
    scoring: SCORING, seasons: ys, ...out,
  }, null, 1));
  console.log(`\n-> data/startsit_${SCORING}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
