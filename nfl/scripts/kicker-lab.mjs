#!/usr/bin/env node
/* ============================================================
   kicker-lab.mjs — SPYRNUMENN: ER HAEGT AD VELJA THA, EDA EKKI?

     node scripts/kicker-lab.mjs

   -> data/kickers.json

   HVERS VEGNA THETTA ER TIL. Appid raðar ekki K og DST — their voru
   aldrei i neinni hermun sem stadfestir A-Ranking, og ad rada theim
   vaeri agiskun sem litur ut eins og maeling. Su akvordun stendur.

   EN AD RADA THEIM EKKI MA EKKI THYDA AD THEGJA UM THA. Notandinn
   VERDUR ad taka spyrnumann og vorn — thad eru tvo af niu byrjunar-
   saetum — og appid sagdi ekkert um hvernig. Thogn er ekki hlutleysi
   thegar akvordunin er ohjakvaemileg.

   THRJAR SPURNINGAR, OG THAER ERU ADEINS THRJAR VILJANDI: vid svo fa
   profa er engin thorf a thungri leidrettingu fyrir fjolda samanburda,
   og thad er nakvaemlega thess vegna sem thaer eru bara thrjar.

     1. Flyst arangur spyrnumanns milli ara yfirleitt?
     2. Ef ekki — er eitthvad ANNAD sem spair fyrir um tha?
        (sokn lidsins i fyrra: fleiri ferdir i teiginn, fleiri spyrnur)
     3. Hve STOR er akvordunin i stigum? Se hun einskis virdi a appid
        ad segja thad berum ordum, sem er sjalft gagnleg upplysing.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { stamp } from "./lib/provenance.mjs";

const OUT = path.resolve(process.cwd(), "data");
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const se = (a) => {
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1) / a.length);
};
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

function pearson(a, b) {
  const n = a.length, ma = mean(a), mb = mean(b);
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : 0;
}

async function main() {
  const seasons = JSON.parse(await readFile(path.join(OUT, "seasons.json"), "utf8"));
  const teamForm = JSON.parse(await readFile(path.join(OUT, "team_form.json"), "utf8"));
  const tf = new Map(teamForm.map((t) => [`${t.team}|${t.season}`, t]));

  const years = [...new Set(seasons.filter((r) => r.pos === "K").map((r) => r.season))].sort();
  const kickersIn = (y, minG = 0) =>
    seasons.filter((r) => r.pos === "K" && r.season === y && r.g >= minG);

  /* ---------- 1. FLYST ARANGUR MILLI ARA? ---------- */
  /* Borid vid hinar stodurnar, thvi talan ein segir ekkert an
     samanburdar — er 0,15 lagt? Ja: RB/WR/TE eru 0,68-0,73. */
  const persistence = {};
  for (const pos of ["K", "QB", "RB", "WR", "TE"]) {
    const A = [], B = [];
    const by = {};
    for (const r of seasons) {
      if (r.pos !== pos) continue;
      (by[r.season] = by[r.season] || new Map()).set(r.name, r);
    }
    const ys = Object.keys(by).map(Number).sort();
    for (let i = 1; i < ys.length; i++) {
      const m0 = by[ys[i - 1]], m1 = by[ys[i]];
      for (const [k, r] of m0) {
        const n = m1.get(k);
        if (n && r.g >= 8 && n.g >= 8) { A.push(r.ppr); B.push(n.ppr); }
      }
    }
    persistence[pos] = { n: A.length, r: r2(pearson(A, B)) };
  }
  console.log("1. flyst arangur milli ara?");
  for (const [pos, v] of Object.entries(persistence)) {
    console.log(`   ${pos.padEnd(3)} n=${String(v.n).padStart(4)}  r=${v.r}` +
      (pos === "K" ? "   <- naestum ekkert" : ""));
  }

  /* ---------- 2. ER EITTHVAD ANNAD SEM SPAIR? ---------- */
  /* TVAER reglur bornar vid ad velja af handahofi ur theim sem heldu
     saetinu. Baseline-id skiptir ollu: ad bera vid ALLA spyrnumenn i
     gagnasettinu — thar med talda tha sem spiladi tvo leiki sem
     afleysing — gaefi miklu haerri tolu, en enginn draftar thann mann.
     Rétta vidmidid er "einhver byrjunar-spyrnumadur". */
  const rules = { top5: [], bestOffence: [] };
  const perYear = {};
  for (let i = 1; i < years.length; i++) {
    const y0 = years[i - 1], y1 = years[i];
    const prev = kickersIn(y0, 8).sort((a, b) => b.ppr - a.ppr);
    const now = kickersIn(y1, 8);
    if (!prev.length || now.length < 15) continue;
    const byName = new Map(now.map((r) => [r.name, r]));
    const base = mean(now.map((r) => r.ppr));

    const top5 = prev.slice(0, 5).map((r) => byName.get(r.name)).filter(Boolean);
    const bestTeams = [...tf.values()].filter((t) => t.season === y0)
      .sort((a, b) => (b.ptd + b.rtd) - (a.ptd + a.rtd)).slice(0, 5).map((t) => t.team);
    const off = now.filter((r) => bestTeams.includes(r.team));

    if (top5.length) rules.top5.push(mean(top5.map((r) => r.ppr)) - base);
    if (off.length) rules.bestOffence.push(mean(off.map((r) => r.ppr)) - base);
    perYear[y1] = {
      base: r1(base),
      top5: top5.length ? r1(mean(top5.map((r) => r.ppr))) : null,
      bestOffence: off.length ? r1(mean(off.map((r) => r.ppr))) : null,
    };
  }
  console.log("\n2. abati reglu umfram annan BYRJUNAR-spyrnumann");
  const summary = {};
  for (const [name, d] of Object.entries(rules)) {
    const m = mean(d), s = se(d);
    summary[name] = { gain: r1(m), se: r1(s), t: r2(s ? m / s : 0),
                      years: d.length, wins: d.filter((v) => v > 0).length };
    console.log(`   ${name.padEnd(12)} ${m > 0 ? "+" : ""}${r1(m)} +- ${r1(s)} stig · ` +
      `${d.filter((v) => v > 0).length}/${d.length} ar · t=${r2(s ? m / s : 0)}`);
  }

  /* ---------- 3. HVE STOR ER AKVORDUNIN? ---------- */
  const spread = [];
  for (const y of years) {
    const k = kickersIn(y, 8).sort((a, b) => b.ppr - a.ppr);
    if (k.length < 20) continue;
    spread.push({ season: y, k1: r1(k[0].ppr), k12: r1(k[11].ppr),
                  median: r1(k[Math.floor(k.length / 2)].ppr) });
  }
  const hindsight = mean(spread.map((s) => s.k1 - s.k12));
  console.log("\n3. staerd akvordunarinnar");
  console.log(`   K1 gegn K12, EFTIRAA:      ${r1(hindsight)} stig = ${r2(hindsight / 17)}/viku`);
  console.log(`   besta REGLA sem vid eigum: ${summary.top5.gain} stig = ` +
    `${r2(summary.top5.gain / 17)}/viku`);

  /* ---------- 4. HVADAN KEMUR ABATINN? ---------- */
  /* Ef hann er allur "hann heldur starfinu" er thad ONNUR saga en
     "hann er betri spyrnumadur", og hun a erindi vid notandann:
     starfsoryggi er thad sem draftari getur raunverulega nytt. */
  const split = { perGame: [], games: [] };
  for (let i = 1; i < years.length; i++) {
    const prev = kickersIn(years[i - 1], 8).sort((a, b) => b.ppr - a.ppr);
    const now = kickersIn(years[i], 8);
    if (!prev.length || now.length < 15) continue;
    const byName = new Map(now.map((r) => [r.name, r]));
    const top5 = prev.slice(0, 5).map((r) => byName.get(r.name)).filter(Boolean);
    if (!top5.length) continue;
    split.perGame.push(mean(top5.map((r) => r.ppr / Math.max(1, r.g))) -
                       mean(now.map((r) => r.ppr / Math.max(1, r.g))));
    split.games.push(mean(top5.map((r) => r.g)) - mean(now.map((r) => r.g)));
  }
  const pg = { gain: r2(mean(split.perGame)), se: r2(se(split.perGame)),
               wins: split.perGame.filter((v) => v > 0).length, years: split.perGame.length };
  const gm = { gain: r2(mean(split.games)), se: r2(se(split.games)),
               wins: split.games.filter((v) => v > 0).length, years: split.games.length };
  console.log("\n4. hvadan kemur abatinn?");
  console.log(`   stig i leik  ${pg.gain > 0 ? "+" : ""}${pg.gain} +- ${pg.se} · ${pg.wins}/${pg.years} ar`);
  console.log(`   leikir       ${gm.gain > 0 ? "+" : ""}${gm.gain} +- ${gm.se} · ${gm.wins}/${gm.years} ar`);

  await writeFile(path.join(OUT, "kickers.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: {},
      inputs: ["seasons.json", "team_form.json"], dataDir: OUT }),
    seasons: years,
    persistence,
    rules: summary,
    perYear,
    spread,
    hindsightGain: r1(hindsight),
    source: { perGame: pg, games: gm },
  }, null, 1));
  console.log("\n-> data/kickers.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
