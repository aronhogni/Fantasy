/* ============================================================
   MEASURE-BEST-XI-RULE — HVERT SKOR A "PICK BEST TEAM"-TAKKINN AD
   FA ADFLUTT: `expPointsFor` EITT, EDA `expPointsFor x startProbability`?

   EKKI I `npm test`, EKKI I PIPELINE. Handvirk maelingaskrifta, sama
   flokkur og `measure-tail-to-gw1.mjs` / `measure-rival-out.mjs`.
   Keyrsla:  node scripts/measure-best-xi-rule.mjs
             node scripts/measure-best-xi-rule.mjs --squads 40   (fljotara)

   ------------------------------------------------------------
   HVERS VEGNA SPURNINGIN ER OPIN
   ------------------------------------------------------------
   `expPointsFor` veit um MEIDSLI og BANN (`availForKickoff`) en EKKERT um
   ROTERINGU: heilbrigdur madur sem er einfaldlega ekki valinn skorar sama
   og sa sem spilar 90 minutur i hverri viku. `startProbability` er maeld
   nakvaemlega a thvi (Brier 0,0888 a moti 0,1176; laegsti tiundarhluti
   fangar 42-49% theirra sem falla a bekk).
   `captain.js` MAELDI produktid og thad STENDUR fyrir fyrirlida (+0,790
   CI [0,379, 1,178]) — en thad er N=1. Ellefu-manna val er annad verkefni
   og CLAUDE.md kafli 4 er kirkjugardur yfir omaeldar framlengingar.

   ------------------------------------------------------------
   MAELIKVARDINN ER AKVORDUNIN, EKKI FYLGNI
   ------------------------------------------------------------
   Fyrir hverja loknu umferd: taktu 15-manna hop, veldu XI undir hverri
   reglu med RAUNVERULEGU velinni (`src/bestteam.js:pickXi`, adflutt skor)
   og teldu RAUNSTIGIN sem valda XI-id skoradi.

   TVAER TOLUR, OG BADAR ERU SAGDAR:
     * HRAR XI-SUMMA (11 menn, engir autosubs)
     * MED FPL-AUTOSUBS — su sem notandinn faer i raun. FPL skiptir
       sjalfkrafa inn af bekknum fyrir hvern sem spilar 0 minutur, svo
       KOSTNADURINN af ad byrja roteringar-mann er MINNI en hra summan
       segir. Ad sleppa autosubs vaeri skekkja I THAGU tilgatunnar.

   ------------------------------------------------------------
   LEKA-VORN
   ------------------------------------------------------------
   * `tests/lib/panel.mjs` byggir alla eiginleika TIMA-HEIDARLEGA (adeins
     umferdir < t hja theim leikmanni + fyrra timabil + leikjathyngd sem er
     thekkt fyrir leik). Ein uppbygging, sama sem `rank-model.mjs` notar.
   * GRUNNURINN i `expPointsFor` er `xP` ThEIRRAR UMFERDAR (FPL-eigid vaent
     stig, birt FYRIR frest — sogulega jafngildi `ep_next`), annars
     `points_per_game` REIKNAD SEM ThAD STOD ThA (uppsafnad, ekki
     arstidar-lokatala). Arstidar-lokatala vaeri leki af somu tegund og
     `selected_by_percent` ur archive-skra (95,7% -> 65,7%).
   * `startProbability` les SIDUSTU 5 UMFERDIR A UNDAN og verdid i theirri
     umferd — hvorugt er leki.
   * TILTAEKILEIKI ER 1 A OLLUM RODUM. Sogulegt `status`/`news` er ekki i
     gognunum, svo hann er FASTI — og hann er SAMI fastinn i badum reglum,
     svo hann getur ekki hallad samanburdinum. Thad gerir maelinguna EINMITT
     um thad sem spurt er um: roteringu, ekki meidsli.
   ============================================================ */
import { readFileSync } from "node:fs";
import { buildPanel } from "../tests/lib/panel.mjs";
import { expPointsFor } from "../src/model.js";
import { startFeatures, startProbability, startRisk } from "../src/stats.js";
import { pickXi, XI_MIN, XI_MAX, XI_SIZE, legalFormation } from "../src/bestteam.js";
import { MIN_START_PROB } from "../src/rotation.js";
import { mulberry32, bootstrapCI, fmt, DATA } from "./start-panel.mjs";

const argv = process.argv.slice(2);
const argn = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? +argv[i + 1] : d; };
const SQUADS = argn("--squads", 100);          // hopar per umferd per laug
/* SEED-OFFSET. Deltain ma ekki hanga a EINNI slembinni hopa-teikningu;
   `--seed 2` teiknar allt adra hopa og verdur ad gefa SAMA MERKI.      */
const SEED = argn("--seed", 1);
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const ci = o => `${fmt(o.point, 4)}  95% CI [${fmt(o.lo, 4)}, ${fmt(o.hi, 4)}]  ${o.excludesZero ? "EXCLUDES 0" : "INCLUDES 0"}`;

/* ============================================================
   1. AUKA-EIGINLEIKARNIR SEM PANELLINN BER EKKI
   `startFeatures` krefst HRAA MINUTU-FYLKISINS (5 sidustu umferdir) og
   verdsins; `expPointsFor` krefst `ep_next`-grunns. Panellinn ber `mins5`
   sem MEDALTAL og `xP5` sem MEDALTAL — hvorugt gengur her. Thess vegna er
   `fpl_player_gw.json` gengin einu sinni til vidbotar.
   TVOFOLD UMFERD ER LOGD SAMAN PER UMFERD (sama regla og start-panel.mjs):
   `startFeatures` er minutu-likan per UMFERD, ekki per leik.
   ============================================================ */
function auxByRound() {
  const PG = JSON.parse(readFileSync(`${DATA}fpl_player_gw.json`, "utf8"));
  const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
  const out = new Map();                       // "season|name|round" -> {...}
  for (const [season, list] of Object.entries(PG.seasons)) {
    const byName = {};
    for (const q of list) (byName[q[H.name]] ||= []).push(q);
    for (const [name, arr] of Object.entries(byName)) {
      /* per-umferdar samlagning */
      const rounds = new Map();
      for (const q of arr) {
        const r = +q[H.round];
        const cur = rounds.get(r) || { round: r, mins: 0, pts: 0, xP: 0, value: null };
        cur.mins += +q[H.mins] || 0;
        cur.pts += +q[H.pts] || 0;
        cur.xP += +q[H.xP] || 0;
        cur.value = +q[H.value] || cur.value;
        rounds.set(r, cur);
      }
      const seq = [...rounds.values()].sort((a, b) => a.round - b.round);
      let cumPts = 0, played = 0;
      for (let i = 0; i < seq.length; i++) {
        const s = seq[i];
        const prev = seq.slice(Math.max(0, i - 5), i).map(x => x.mins);
        out.set(`${season}|${name}|${s.round}`, {
          mins: s.mins, pts: s.pts, xP: s.xP, value: s.value,
          prevMins: prev,
          /* `points_per_game` SEM ThAD STOD ThA: uppsafnad, adeins leikir
             thar sem hann kom vid sogu (sama skilgreining og FPL notar). */
          ppgAsOf: played > 0 ? cumPts / played : 0,
        });
        cumPts += s.pts;
        if (s.mins > 0) played++;
      }
    }
  }
  return out;
}

/* ============================================================
   2. KANDIDATAR — EIN ROD PER (timabil, umferd, leikmadur)
   ============================================================ */
function buildCandidates() {
  /* minHistory 2, thvi `startFeatures` krefst tveggja umferda i glugganum.
     includeBlanks: TRUE. Thad er EKKI smekksatriði: XI-val er einmitt
     akvordunin "hvern aetti eg ad velja" og ThAR eru 0-minutu radirnar
     merkid sjalft (sja hausinn a `buildPanel`). Ad sia thaer ut vaeri ad
     fjarlaegja utkomuna sem roteringar-merkid a ad spa fyrir um.        */
  const rows = buildPanel({ minHistory: 2, includeBlanks: true });
  const aux = auxByRound();
  const g = new Map();
  for (const r of rows) {
    const k = `${r.season}|${r.round}|${r.name}`;
    let c = g.get(k);
    if (!c) g.set(k, c = { season: r.season, round: r.round, name: r.name,
      team: r.team, pos: r.pos, code: r.code, price: r.price, mins5: r.mins5,
      fxs: [], pts: 0 });
    c.fxs.push({ __d: r.ffdr, home: r.home, kickoff: null });
    c.pts += r.pts;                            // tvofold umferd: LAGT SAMAN
  }
  const out = [];
  let noAux = 0, noSp = 0;
  for (const c of g.values()) {
    const a = aux.get(`${c.season}|${c.name}|${c.round}`);
    if (!a) { noAux++; continue; }
    c.mins = a.mins;
    /* GRUNNURINN — nakvaemlega regla `expPointsFor`: `ep_next` ef hun er
       til og > 0, annars `points_per_game`. Her er `xP` theirrar umferdar
       sogulega jafngildid (birt FYRIR frest).                            */
    c.base = a.xP > 0 ? a.xP : a.ppgAsOf;
    const p = { element_type: c.code, status: "a",
                ep_next: a.xP > 0 ? String(a.xP) : "",
                points_per_game: String(a.ppgAsOf) };
    c.expPts = expPointsFor({ p, fxs: c.fxs, fixDifficulty: (_t, f) => f.__d,
                              teamId: 0, nowTs: 0 });
    const f = startFeatures(a.prevMins, a.value);
    c.sp = f ? startProbability(f) : null;
    c.risk = f ? startRisk(f) : null;
    if (c.sp == null) noSp++;
    out.push(c);
  }
  return { rows: out, noAux, noSp, panelRows: rows.length };
}

/* ============================================================
   3. HOPAR — RAUNVERULEG FPL-FORM, EKKI SLEMBIN 15
   `tests/recommend.mjs` byggir hermda 15-manna hopa THANNIG: laug =
   120 haestu eftir `mins5` innan umferdar, sidan jofn slembin drattur.
   Su uppbygging er notud OBREYTT ad tveimur skilyrdum vidbaettum, og
   BAEDI eru NAUDSYNLEG hér en voru thad ekki thar:
     * 2 GK / 5 DEF / 5 MID / 3 FWD. Solu-maelingin i recommend.mjs
       ther aðeins "botn-2" og stada skiptir engu; XI-VAL er hins vegar
       BUNDID af uppstillingunni og hopur an markmanns getur EKKI gefid
       leyfilegt XI. Slembin 15 ur laug gefur 0 markmenn i ~13% tilvika.
     * <= 3 per felag (FPL-regla). Hun stjornar hverjir geta verid i sama
       hop og thar med hverjir keppa um sama saeti.
   ThRJAR LAUGIR, thvi laugin AKVEDUR hve mikil roteringar-haetta er til:
     regulars  120 haestu eftir mins5   (recommend.mjs-laugin)
     priced    120 haestu eftir verdi   (hopurinn sem madur AETTI raunar)
     any       allar radir umferdarinnar (mesta roteringar-haetta)
   ============================================================ */
const SHAPE = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
function drawSquad(byPos, rnd) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const teamN = {}, sq = [];
    let ok = true;
    for (const pos of ["GK", "DEF", "MID", "FWD"]) {
      const need = SHAPE[pos], avail = byPos[pos];
      const used = new Set();
      for (let k = 0; k < need; k++) {
        let pick = null;
        for (let t = 0; t < 60; t++) {
          const i = (rnd() * avail.length) | 0;
          const c = avail[i];
          if (!c || used.has(i) || (teamN[c.team] || 0) >= 3) continue;
          pick = c; used.add(i); break;
        }
        if (!pick) { ok = false; break; }
        teamN[pick.team] = (teamN[pick.team] || 0) + 1;
        sq.push(pick);
      }
      if (!ok) break;
    }
    if (ok && sq.length === 15) return sq;
  }
  return null;
}

/* ============================================================
   4. RAUNSTIG — MED OG AN FPL-AUTOSUBS
   FPL skiptir inn af bekknum fyrir hvern byrjunarlidsmann sem spilar
   0 minutur, i BEKKJARROD, og adeins ef uppstillingin helst LEYFILEG.
   Markvordur er ser saeti (kemur adeins inn fyrir markvord).
   ============================================================ */
function realisedWithSubs(xi, bench, subbed) {
  const count = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const x of xi) count[x.pos]++;
  const team = xi.map(x => ({ ...x }));
  const bGk = bench.filter(b => b.pos === "GK");
  const bOut = bench.filter(b => b.pos !== "GK");
  const usedGk = new Set(), usedOut = new Set();
  for (let i = 0; i < team.length; i++) {
    if (team[i].mins > 0) continue;
    if (team[i].pos === "GK") {
      const j = bGk.findIndex((b, k) => !usedGk.has(k) && b.mins > 0);
      if (j >= 0) { usedGk.add(j); if (subbed) subbed.add(team[i].name); team[i] = { ...bGk[j] }; }
      continue;
    }
    for (let k = 0; k < bOut.length; k++) {
      if (usedOut.has(k) || !(bOut[k].mins > 0)) continue;
      const c2 = { ...count }; c2[team[i].pos]--; c2[bOut[k].pos]++;
      if (!legalFormation(c2, { min: XI_MIN, max: XI_MAX, size: XI_SIZE })) continue;
      usedOut.add(k); count[team[i].pos]--; count[bOut[k].pos]++;
      if (subbed) subbed.add(team[i].name);
      team[i] = { ...bOut[k] };
      break;
    }
  }
  return team.reduce((s, x) => s + x.pts, 0);
}

/* ============================================================
   5. REGLURNAR SEM ERU I SAMKEPPNI
   ============================================================ */
const RULES = {
  /* A — NUVERANDI REGLA. */
  exp:        r => r.expPts,
  /* B — PRODUKTID. `?? 1` er NULL-VORNIN: "engin gogn" ma ekki verda
     "spilar ekki" (sama regla og `MIN_START_PROB` i rotation.js).      */
  prod:       r => r.expPts * (r.sp ?? 1),
  /* B' — NAIVA PRODUKTID. null * tala = NaN, og velin les NaN sem
     skor 0 (`scoreKnown:false`) — madurinn sekkur a bekkinn. Maelt
     serstaklega i kafla NULL.                                          */
  prodNaive:  r => r.expPts * r.sp,
  /* C — HART GOLF i stad margfoldunar (`MIN_START_PROB` = 0,15). */
  floor:      r => (r.sp != null && r.sp < MIN_START_PROB ? -1 : r.expPts),
  /* D — "trap"-threpid sem hart golf. */
  trap:       r => (r.risk?.level === "trap" ? -1 : r.expPts),
  /* Vidmid: skorid EITT (an vaentra stiga) og ORAKEL-ThAKID. */
  spOnly:     r => (r.sp ?? 0.5),
  oracle:     r => r.pts,
};

function scoreSquad(sq, rule) {
  const res = pickXi(sq, RULES[rule], { tiebreak: (a, b) => (a.price - b.price) || 0 });
  const raw = res.xi.reduce((s, x) => s + x.pts, 0);
  return { xi: res.xi, bench: res.bench, raw, sub: realisedWithSubs(res.xi, res.bench),
           legal: res.legal };
}

/* ============================================================
   MAIN
   ============================================================ */
console.log("=".repeat(72));
console.log("PICK BEST TEAM — WHICH SCORE? expPoints  vs  expPoints x startProb");
console.log("=".repeat(72));

const { rows, noAux, noSp, panelRows } = buildCandidates();
console.log(`\n0. THE POOL`);
console.log(`   panel rows (includeBlanks, minHistory 2)  : ${panelRows}`);
console.log(`   candidates (season x gameweek x player)   : ${rows.length}`);
console.log(`   without aux features (skipped)            : ${noAux}`);
console.log(`   without start_prob (null)                 : ${noSp}`);
const played = rows.filter(r => r.mins > 0).length;
console.log(`   played (mins > 0)                         : ${played} (${(100 * played / rows.length).toFixed(1)}%)`);
{
  const sp = rows.filter(r => r.sp != null).map(r => r.sp);
  sp.sort((a, b) => a - b);
  const q = t => sp[Math.floor(t * sp.length)];
  console.log(`   start_prob spread    p10 ${fmt(q(0.1), 3)}  p50 ${fmt(q(0.5), 3)}  p90 ${fmt(q(0.9), 3)}`);
  const lo = rows.filter(r => r.sp != null && r.sp < MIN_START_PROB);
  console.log(`   start_prob < ${MIN_START_PROB}: ${lo.length} rows (${(100 * lo.length / rows.length).toFixed(1)}%), ` +
              `actual start rate ${fmt(mean(lo.map(r => r.mins >= 60 ? 1 : 0)), 3)}`);
  const trap = rows.filter(r => r.risk?.level === "trap");
  console.log(`   "trap" tier: ${trap.length} rows (${(100 * trap.length / rows.length).toFixed(1)}%), ` +
              `start rate ${fmt(mean(trap.map(r => r.mins >= 60 ? 1 : 0)), 3)}`);
}

/* --- gameweek-hopar --- */
const byGw = new Map();
for (const r of rows) {
  const k = `${r.season}|${r.round}`;
  (byGw.get(k) || byGw.set(k, []).get(k)).push(r);
}
const gwKeys = [...byGw.keys()].sort();
console.log(`   gameweeks (clusters)                      : ${gwKeys.length}`);

/* `priced` ER VALIN PER STODU, OG ThAD ER MAELINGAR-ATRIDI: hnattraen
   topp-120 eftir VERDI ber oft FAERRI EN TVO markmenn (markmenn eru
   odyrastir), svo laugin faell ur 182 umferdum i 127 — urtakid hefdi
   verid valid af verdi markmanna, ekki af spurningunni. Kvotarnir eru
   i somu hlutfollum og FPL-hopurinn sjalfur (2/5/5/3 x 8).             */
const POOLS = {
  regulars: c => [...c].sort((a, b) => b.mins5 - a.mins5).slice(0, 120),
  priced:   c => {
    const by = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const x of [...c].sort((a, b) => b.price - a.price)) if (by[x.pos]) by[x.pos].push(x);
    return [...by.GK.slice(0, 16), ...by.DEF.slice(0, 40), ...by.MID.slice(0, 40), ...by.FWD.slice(0, 24)];
  },
  any:      c => c,
};
const CMP = ["exp", "prod", "prodNaive", "floor", "trap", "spOnly", "oracle"];

/* clusters[pool] = [ [ {d..}, ... ] per umferd ] */
const results = {};
for (const pool of Object.keys(POOLS)) results[pool] = [];
let nSquads = 0, nIllegal = 0;

for (let gi = 0; gi < gwKeys.length; gi++) {
  const cands = byGw.get(gwKeys[gi]);
  const [season, round] = gwKeys[gi].split("|");
  for (const pool of Object.keys(POOLS)) {
    const p = POOLS[pool](cands);
    const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const c of p) if (byPos[c.pos]) byPos[c.pos].push(c);
    if (byPos.GK.length < 2 || byPos.DEF.length < 5 || byPos.MID.length < 5 || byPos.FWD.length < 3) continue;
    const rnd = mulberry32(1000003 * SEED + gi * 7919 + pool.length * 104729);
    const cluster = [];
    for (let s = 0; s < SQUADS; s++) {
      const sq = drawSquad(byPos, rnd);
      if (!sq) continue;
      const out = { season, round: +round, gw: gwKeys[gi] };
      for (const rule of CMP) {
        const v = scoreSquad(sq, rule);
        out[rule] = v.sub; out[rule + "_raw"] = v.raw;
        out[rule + "_ids"] = v.xi.map(x => x.name).sort().join("|");
        if (!v.legal) nIllegal++;
      }
      cluster.push(out);
      nSquads++;
    }
    if (cluster.length) results[pool].push(cluster);
  }
}
console.log(`   squads total ${nSquads}  (${SQUADS}/gameweek/pool), illegal XI: ${nIllegal}`);

/* ============================================================
   1. HEADLINE — RAUNSTIG PER UMFERD, OG DELTAID MED CI
   BOOTSTRAP ER KLASAD PER UMFERD (season|round), EKKI PER HOP, og thad
   er ekki smekksatriði: 100 hopar innan sömu umferdar deila LEIKMONNUM
   og thar med raunstigunum, svo their eru EKKI ohadir. Klosun per hop
   gaefi CI sem er of throngt af thvi einu ad vid hermdum fleiri hopa.
   Umferdin er MANAGER-GAMEWEEK-klasinn her: einn hopur = einn stjornandi
   i einni umferd, og thad sem their eiga sameiginlegt er umferdin.
   ============================================================ */
function report(pool, filter = null, label = "") {
  const clusters = results[pool]
    .map(c => (filter ? c.filter(filter) : c))
    .filter(c => c.length);
  if (!clusters.length) { console.log(`   ${pool}${label}: no rows`); return null; }
  const flat = clusters.flat();
  const st = k => rs => mean(rs.map(r => r[k]));
  const line = [];
  for (const rule of CMP) line.push(`${rule} ${fmt(mean(flat.map(r => r[rule])), 3)}`);
  console.log(`\n   [${pool}${label}]  n=${flat.length} squads, ${clusters.length} gameweeks`);
  console.log(`     WITH AUTOSUBS : ${line.join("  ")}`);
  console.log(`     RAW XI TOTAL  : ${CMP.map(r => `${r} ${fmt(mean(flat.map(x => x[r + "_raw"])), 3)}`).join("  ")}`);
  const outs = {};
  for (const [name, k] of [["prod - exp", "prod"], ["floor - exp", "floor"], ["trap - exp", "trap"], ["prodNaive - exp", "prodNaive"]]) {
    const cl = clusters.map(c => c.map(r => ({ d: r[k] - r.exp, draw: r[k + "_raw"] - r.exp_raw })));
    const a = bootstrapCI(cl, rs => mean(rs.map(r => r.d)));
    const b = bootstrapCI(cl, rs => mean(rs.map(r => r.draw)));
    outs[k] = a;
    console.log(`     d ${name.padEnd(16)} autosubs ${ci(a)}`);
    console.log(`     ${" ".repeat(18)} raw XI  ${ci(b)}`);
  }
  /* Hve oft velja reglurnar SITT HVAD XI? */
  const diff = flat.filter(r => r.prod_ids !== r.exp_ids);
  const nswap = diff.map(r => {
    const a = new Set(r.exp_ids.split("|"));
    return r.prod_ids.split("|").filter(x => !a.has(x)).length;
  });
  console.log(`     XI DIFFERS (prod vs exp): ${diff.length}/${flat.length} = ${(100 * diff.length / flat.length).toFixed(1)}%` +
              (diff.length ? `, mean ${fmt(mean(nswap), 2)} players swapped` : ""));
  const dfloor = flat.filter(r => r.floor_ids !== r.exp_ids).length;
  const dtrap = flat.filter(r => r.trap_ids !== r.exp_ids).length;
  console.log(`     XI DIFFERS: floor ${(100 * dfloor / flat.length).toFixed(1)}%  ·  trap ${(100 * dtrap / flat.length).toFixed(1)}%`);
  return outs;
}

console.log("\n" + "=".repeat(72));
console.log("1. HEADLINE — REALISED POINTS (autosubs) AND DELTA WITH CI, clustered per GAMEWEEK");
console.log("=".repeat(72));
for (const pool of Object.keys(POOLS)) report(pool);

/* ============================================================
   2. REGIME — SNYST SVARID VID EFTIR ThVI HVE MARGAR UMFERDIR ERU LOKNAR?
   GW1 ER EKKI HER OG ThAD MA EKKI ThEGJA UM ThAD: innan-timabils panell
   getur ekki bordid umferd 1 (engin fyrri umferd i sama timabili), svo
   GW1-spurningin er MAELD ANNARS STADAR — `measure-tail-to-gw1.mjs`.
   ============================================================ */
console.log("\n" + "=".repeat(72));
console.log("2. REGIME — BY GAMEWEEK (GW1-2 IS UNMEASURABLE HERE, see the header)");
console.log("=".repeat(72));
for (const [lab, f] of [["  r3-8", r => r.round <= 8], ["  r9-19", r => r.round >= 9 && r.round <= 19],
                        ["  r20-38", r => r.round >= 20]]) {
  for (const pool of ["regulars", "any"]) report(pool, f, lab);
}

/* ============================================================
   3. NULL-HLIDIN — HVAD GERIR HVOR REGLA VID MANN SEM VID HOFUM
   ENGIN GOGN UM? Maelt sem UPPLYSINGA-BROTTNAM: sami hopur, sama
   raunveruleiki, en `sp` er MASKAD i null hja hlutfalli sem er maelt i
   `data/imminent.json` i dag (134 af 595 = 22,5%).
   ============================================================ */
console.log("\n" + "=".repeat(72));
console.log("3. NULL — 22.5% masking (134/595 in imminent.json today)");
console.log("=".repeat(72));
{
  const NULL_RATE = 134 / 595;
  const clusters = [];
  let benchedNaive = 0, benchedExp = 0, benchedSafe = 0, maskedTot = 0;
  for (let gi = 0; gi < gwKeys.length; gi++) {
    const cands = byGw.get(gwKeys[gi]);
    const p = POOLS.regulars(cands);
    const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const c of p) if (byPos[c.pos]) byPos[c.pos].push(c);
    if (byPos.GK.length < 2 || byPos.DEF.length < 5 || byPos.MID.length < 5 || byPos.FWD.length < 3) continue;
    const rnd = mulberry32(77777 * SEED + gi * 6151);
    const cl = [];
    for (let s = 0; s < SQUADS; s++) {
      const sq0 = drawSquad(byPos, rnd);
      if (!sq0) continue;
      const masked = [];
      const sq = sq0.map(c => {
        const m = rnd() < NULL_RATE;
        if (m) masked.push(c.name);
        return m ? { ...c, sp: null, risk: null } : c;
      });
      if (!masked.length) continue;
      const A = scoreSquad(sq, "exp"), N = scoreSquad(sq, "prodNaive"), S = scoreSquad(sq, "prod");
      const inXi = (v, nm) => v.xi.some(x => x.name === nm);
      for (const nm of masked) {
        maskedTot++;
        if (!inXi(N, nm)) benchedNaive++;
        if (!inXi(A, nm)) benchedExp++;
        if (!inXi(S, nm)) benchedSafe++;
      }
      cl.push({ exp: A.sub, naive: N.sub, safe: S.sub });
    }
    if (cl.length) clusters.push(cl);
  }
  const flat = clusters.flat();
  console.log(`   n=${flat.length} squads with >=1 masked player, ${clusters.length} gameweeks, ${maskedTot} masked players`);
  console.log(`   BENCHED (masked player NOT in the XI):`);
  console.log(`     exp (ignores rotation)        ${(100 * benchedExp / maskedTot).toFixed(1)}%`);
  console.log(`     prod with \`?? 1\` (null guard) ${(100 * benchedSafe / maskedTot).toFixed(1)}%`);
  console.log(`     prod NAIVE (null -> NaN)      ${(100 * benchedNaive / maskedTot).toFixed(1)}%`);
  const st = (a, b) => rs => mean(rs.map(r => r[a] - r[b]));
  console.log(`   d naive - exp   ${ci(bootstrapCI(clusters, st("naive", "exp")))}`);
  console.log(`   d naive - safe  ${ci(bootstrapCI(clusters, st("naive", "safe")))}`);
  console.log(`   d safe  - exp   ${ci(bootstrapCI(clusters, st("safe", "exp")))}`);
}

/* ============================================================
   4. HRATT MERKI — er `startProb` yfirleitt upplysandi UM ThA SEM
   `expPoints` setur I XI-ID? Ef laegsti tiundarhluti innan XI-sins
   spilar jafn mikid og haesti er engu ad hafa.
   ============================================================ */
console.log("\n" + "=".repeat(72));
console.log("4. THE SIGNAL INSIDE THE XI — does the man `exp` picked and `sp` warns about play?");
console.log("=".repeat(72));
{
  /* Beint a kandidotum: their sem `expPts` setur ofarlega innan umferdar. */
  const buckets = new Map();
  for (const k of gwKeys) {
    const c = POOLS.regulars(byGw.get(k));
    const top = [...c].sort((a, b) => b.expPts - a.expPts).slice(0, 60);
    for (const r of top) {
      if (r.sp == null) continue;
      const b = r.sp < 0.15 ? "<0.15" : r.sp < 0.45 ? "0.15-0.45" : r.sp < 0.75 ? "0.45-0.75" : ">=0.75";
      (buckets.get(b) || buckets.set(b, []).get(b)).push(r);
    }
  }
  for (const b of ["<0.15", "0.15-0.45", "0.45-0.75", ">=0.75"]) {
    const rs = buckets.get(b) || [];
    if (!rs.length) { console.log(`   ${b.padEnd(10)} n=0`); continue; }
    console.log(`   ${b.padEnd(10)} n=${String(rs.length).padStart(6)}  started ${fmt(mean(rs.map(r => r.mins >= 60 ? 1 : 0)), 3)}` +
                `  played ${fmt(mean(rs.map(r => r.mins > 0 ? 1 : 0)), 3)}` +
                `  real pts ${fmt(mean(rs.map(r => r.pts)), 3)}` +
                `  expPts ${fmt(mean(rs.map(r => r.expPts)), 3)}`);
  }
}

/* ============================================================
   5. GW1-REGIME — ThAD SEM TAKKINN MAETIR A MORGUN

   Innan-timabils panellinn getur EKKI bordid umferd 1-2 (engin fyrri
   umferd i sama timabili), svo thetta er byggt UR HINNI attinni, a
   NAKVAEMLEGA thann matt sem appid gerir i dag: glugginn er sidustu 5
   umferdir FYRRA timabils (`imminent.archive === true`) og markmidid er
   GW1-3 naesta timabils. `scripts/start-panel.mjs` gefur code-porunina
   (nafna-porun tapar 2,4-7,5% a timabilamotum).

   TVENNT SEM VERDUR AD SEGJAST UPPHATT:
   (a) FFDR-MARGFALDARINN ER EKKI HER. Ad endurbyggja hann fyrir umferd
       1-3 kalladi a AFRIT af `buildFixtures` ur `tests/lib/panel.mjs`, og
       afrituð tafla er tvaer toflur sem reka i sundur (CLAUDE.md 12). Hann
       er ThVI SLEPPT — sem er i lagi fyrir ThESSA spurningu og bara hana:
       hann er SAMI margfaldari per leikmann i BADUM reglum, svo allur
       mismunur reglanna kemur afram EINGONGU ur `sp`. Talan sjalf er thvi
       ekki sambaerileg vid kafla 1; MERKI OG CI a deltainu er thad.
       VORDUR: kafli 5b keyrir SOMU adferd a umferd 3, thar sem RETT FFDR
       ER til, og ber ThAD saman — snuist merkid vid er nalgunin ogild.
   (b) ENDURKVORDUNIN (PRESEASON_CAL) SKIPTIR MALI HER OG BARA HER.
       Hun er EINRAEN, svo hun getur ekki hreyft rodun eftir `sp` einni —
       en PRODUKTID `expPts x sp` er EKKI einraent i `sp`, svo hun getur
       hreyft XI-id. Thess vegna eru BADAR maeldar.
   ============================================================ */
console.log("\n" + "=".repeat(72));
console.log("5. GW1 REGIME — archive window (previous season) -> GW1-3, NO FFDR MULTIPLIER");
console.log("=".repeat(72));
{
  const { loadPanel } = await import("./start-panel.mjs");
  const P = await loadPanel();
  const BOUND = [["2122", "2223"], ["2223", "2324"], ["2324", "2425"], ["2425", "2526"]];
  const PG = JSON.parse(readFileSync(`${DATA}fpl_player_gw.json`, "utf8"));
  const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));

  /* xP theirrar umferdar per (season|code|round) — grunnurinn, birt fyrir
     frest. Porun a code i gegnum start-panel-panellinn.                */
  const xpBy = new Map(), nameByCode = new Map();
  for (const [season, S] of Object.entries(P)) {
    for (const [code, row] of S.byCode) nameByCode.set(`${season}|${row.name}`, code);
  }
  for (const [season, list] of Object.entries(PG.seasons)) {
    for (const q of list) {
      const code = nameByCode.get(`${season}|${q[H.name]}`);
      if (code == null) continue;
      const k = `${season}|${code}|${+q[H.round]}`;
      xpBy.set(k, (xpBy.get(k) || 0) + (+q[H.xP] || 0));
    }
  }

  const clusters = { regulars: [], any: [] };
  const RULES1 = {
    exp:      r => r.expPts,
    prodCal:  r => r.expPts * (r.spCal ?? 1),
    prodRaw:  r => r.expPts * (r.spRaw ?? 1),
    floor:    r => (r.spCal != null && r.spCal < MIN_START_PROB ? -1 : r.expPts),
    oracle:   r => r.pts,
  };
  for (const [prev, cur] of BOUND) {
    const Pp = P[prev], Pc = P[cur];
    if (!Pp || !Pc) continue;
    /* fyrra timabil: tail-5 og ppg */
    const tail = new Map();
    for (const [code, row] of Pp.byCode) {
      const rs = [...row.r.entries()].sort((a, b) => a[0] - b[0]);
      if (rs.length < 2) continue;
      const last5 = rs.slice(-5).map(([, v]) => v.mins);
      const pl = rs.filter(([, v]) => v.mins > 0).length;
      tail.set(code, { last5, ppg: null, played: pl });
    }
    /* ppg fyrra timabils ur merged_gw (stig eru ekki i start-panel-rodum) */
    {
      const acc = new Map();
      for (const q of PG.seasons[prev] || []) {
        const code = nameByCode.get(`${prev}|${q[H.name]}`);
        if (code == null) continue;
        const a = acc.get(code) || { p: 0, n: 0 };
        a.p += +q[H.pts] || 0; if ((+q[H.mins] || 0) > 0) a.n++;
        acc.set(code, a);
      }
      for (const [code, t] of tail) { const a = acc.get(code); t.ppg = a && a.n ? a.p / a.n : 0; }
    }
    for (const round of [1, 2, 3]) {
      const cands = [];
      for (const [code, row] of Pc.byCode) {
        const g = row.r.get(round);
        const t = tail.get(code);
        if (!g || !t) continue;
        const f = startFeatures(t.last5, g.value);
        if (!f) continue;
        const xp = xpBy.get(`${cur}|${code}|${round}`) || 0;
        const base = xp > 0 ? xp : t.ppg;
        cands.push({ code, name: row.webName, team: g.team, pos: row.pos,
          price: (g.value || 45) / 10, mins: g.mins, mins5: mean(t.last5),
          expPts: base,
          spCal: startProbability({ ...f, from_archive_window: true }),
          spRaw: startProbability(f), pts: 0 });
      }
      /* raunstig umferdarinnar */
      {
        const acc = new Map();
        for (const q of PG.seasons[cur] || []) {
          if (+q[H.round] !== round) continue;
          const code = nameByCode.get(`${cur}|${q[H.name]}`);
          if (code == null) continue;
          acc.set(code, (acc.get(code) || 0) + (+q[H.pts] || 0));
        }
        for (const c of cands) c.pts = acc.get(c.code) || 0;
      }
      for (const poolName of ["regulars", "any"]) {
        const p = poolName === "regulars"
          ? [...cands].sort((a, b) => b.mins5 - a.mins5).slice(0, 120) : cands;
        const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
        for (const c of p) if (byPos[c.pos]) byPos[c.pos].push(c);
        if (byPos.GK.length < 2 || byPos.DEF.length < 5 || byPos.MID.length < 5 || byPos.FWD.length < 3) continue;
        const rnd = mulberry32(31337 * SEED + round * 9973 + prev.length * 13 + poolName.length);
        const cl = [];
        for (let s = 0; s < SQUADS; s++) {
          const sq = drawSquad(byPos, rnd);
          if (!sq) continue;
          const o = { boundary: `${prev}->${cur}`, round };
          for (const [nm, fn] of Object.entries(RULES1)) {
            const res = pickXi(sq, fn, { tiebreak: (a, b) => (a.price - b.price) || 0 });
            o[nm] = realisedWithSubs(res.xi, res.bench);
            o[nm + "_raw"] = res.xi.reduce((x, y) => x + y.pts, 0);
            o[nm + "_ids"] = res.xi.map(x => x.code).sort().join("|");
          }
          cl.push(o);
        }
        if (cl.length) clusters[poolName].push(cl);
      }
    }
  }
  for (const poolName of ["regulars", "any"]) {
    const cl = clusters[poolName];
    const flat = cl.flat();
    if (!flat.length) { console.log(`   ${poolName}: no rows`); continue; }
    console.log(`\n   [${poolName}] n=${flat.length} squads, ${cl.length} (season boundary x gameweek) clusters`);
    console.log(`     WITH AUTOSUBS: ${Object.keys(RULES1).map(k => `${k} ${fmt(mean(flat.map(r => r[k])), 3)}`).join("  ")}`);
    console.log(`     RAW XI       : ${Object.keys(RULES1).map(k => `${k} ${fmt(mean(flat.map(r => r[k + "_raw"])), 3)}`).join("  ")}`);
    for (const k of ["prodCal", "prodRaw", "floor"]) {
      const a = bootstrapCI(cl.map(c => c.map(r => ({ d: r[k] - r.exp }))), rs => mean(rs.map(r => r.d)));
      const b = bootstrapCI(cl.map(c => c.map(r => ({ d: r[k + "_raw"] - r.exp_raw }))), rs => mean(rs.map(r => r.d)));
      console.log(`     d ${k.padEnd(9)} - exp  autosubs ${ci(a)}`);
      console.log(`     ${" ".repeat(11)}          raw XI  ${ci(b)}`);
      const diff = flat.filter(r => r[k + "_ids"] !== r.exp_ids).length;
      console.log(`     ${" ".repeat(11)}          XI DIFFERS ${(100 * diff / flat.length).toFixed(1)}%`);
    }
  }

  /* ---- 5b. NALGUNAR-VORDURINN: sama adferd a umferd 3, THAR SEM RETT
     FFDR ER TIL i panelnum. Ef merkid a deltainu snyst vid milli
     "an FFDR" og "med FFDR" er nalgunin i kafla 5 ogild.              ---- */
  console.log(`\n   5b. APPROXIMATION GUARD — same pool (r3-8), WITH and WITHOUT the FFDR multiplier`);
  {
    const R = {
      expF:  r => r.expPts,               prodF: r => r.expPts * (r.sp ?? 1),
      expB:  r => r.base,                 prodB: r => r.base * (r.sp ?? 1),
    };
    const cl = [];
    for (const k of gwKeys.filter(k => +k.split("|")[1] <= 8)) {
      const p = POOLS.regulars(byGw.get(k));
      const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
      for (const c of p) if (byPos[c.pos]) byPos[c.pos].push(c);
      if (byPos.GK.length < 2 || byPos.DEF.length < 5 || byPos.MID.length < 5 || byPos.FWD.length < 3) continue;
      const rnd = mulberry32(555 * SEED + k.length * 97 + (+k.split("|")[1]) * 31);
      const cur = [];
      for (let s = 0; s < SQUADS; s++) {
        const sq = drawSquad(byPos, rnd);
        if (!sq) continue;
        const o = {};
        for (const [nm, fn] of Object.entries(R)) {
          const res = pickXi(sq, fn, { tiebreak: (a, b) => (a.price - b.price) || 0 });
          o[nm] = realisedWithSubs(res.xi, res.bench);
          o[nm + "_raw"] = res.xi.reduce((x, y) => x + y.pts, 0);
        }
        cur.push(o);
      }
      if (cur.length) cl.push(cur);
    }
    if (cl.length) {
      const d = (a, b, sfx = "") => bootstrapCI(cl.map(c => c.map(r => ({ v: r[a + sfx] - r[b + sfx] }))),
        rs => mean(rs.map(r => r.v)));
      console.log(`     WITH FFDR  d prod-exp  autosubs ${ci(d("prodF", "expF"))}`);
      console.log(`                            raw XI  ${ci(d("prodF", "expF", "_raw"))}`);
      console.log(`     NO FFDR    d prod-exp  autosubs ${ci(d("prodB", "expB"))}`);
      console.log(`                            raw XI  ${ci(d("prodB", "expB", "_raw"))}`);
    }
  }
}

/* ============================================================
   6. MEKANISMINN — HVERS VEGNA PRODUKTID VINNUR A HRAA XI-INU EN
      TAPAR MED AUTOSUBS

   Tilgatan: produktid setur a bekkinn mann med HA vaent stig og
   MIDLUNGS byrjunar-likur. Spili hann er stigin TOPUD (bekkjarmadur
   skorar ekkert nema byrjunarlidsmadur BLANKI), en BLANKI hann hefdi
   FPL-autosub gert somu bjorgun ENDURGJALDSLAUST. Reglan kaupir thvi
   vorn sem er thegar innifalin — og borgar fyrir hana med valkosti.
   Maelt: hverjir vikja, hverjir koma inn, spiladu their, og hve oft
   hefdi autosub bjargad theim sem `exp` byrjadi med.
   ============================================================ */
console.log("\n" + "=".repeat(72));
console.log("6. THE MECHANISM — who drops out and who comes in (pool: regulars)");
console.log("=".repeat(72));
{
  let nDiff = 0, outN = 0, inN = 0;
  let outPlayed = 0, inPlayed = 0, outPts = 0, inPts = 0, outRescued = 0;
  for (let gi = 0; gi < gwKeys.length; gi++) {
    const p = POOLS.regulars(byGw.get(gwKeys[gi]));
    const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const c of p) if (byPos[c.pos]) byPos[c.pos].push(c);
    if (byPos.GK.length < 2 || byPos.DEF.length < 5 || byPos.MID.length < 5 || byPos.FWD.length < 3) continue;
    const rnd = mulberry32(1000003 * SEED + gi * 7919 + "regulars".length * 104729);
    for (let s = 0; s < SQUADS; s++) {
      const sq = drawSquad(byPos, rnd);
      if (!sq) continue;
      const A = pickXi(sq, RULES.exp,  { tiebreak: (a, b) => (a.price - b.price) || 0 });
      const B = pickXi(sq, RULES.prod, { tiebreak: (a, b) => (a.price - b.price) || 0 });
      const aSet = new Set(A.xi.map(x => x.name)), bSet = new Set(B.xi.map(x => x.name));
      const outs = A.xi.filter(x => !bSet.has(x.name));    // `prod` setti a bekk
      const ins = B.xi.filter(x => !aSet.has(x.name));     // `prod` setti i XI
      if (!outs.length) continue;
      nDiff++;
      /* NAKVAEMLEGA hverjum autosub bjargadi i A-lidinu — ekki
         "var einhver taekur a bekknum" (thad vaeri EFRA MARK). */
      const subA = new Set();
      realisedWithSubs(A.xi, A.bench, subA);
      for (const x of outs) {
        outN++; outPts += x.pts; if (x.mins > 0) outPlayed++;
        if (!(x.mins > 0) && subA.has(x.name)) outRescued++;
      }
      for (const x of ins) { inN++; inPts += x.pts; if (x.mins > 0) inPlayed++; }
    }
  }
  console.log(`   squads with a different XI: ${nDiff}`);
  console.log(`   DROPPED (exp started, prod benched) n=${outN}  played ${fmt(outPlayed / outN, 3)}  real pts ${fmt(outPts / outN, 3)}`);
  console.log(`   BROUGHT IN (prod started)           n=${inN}   played ${fmt(inPlayed / inN, 3)}  real pts ${fmt(inPts / inN, 3)}`);
  console.log(`   RAW SWAP GAIN  ${fmt(inPts / inN - outPts / outN, 3)} pts per swapped player`);
  console.log(`   OF THOSE DROPPED WHO BLANKED, autosub would have rescued ${fmt(outRescued / Math.max(1, outN - outPlayed), 3)}` +
              ` — that is the option value the product pays for`);

  /* ---- 6b. ER TAPID I XI-INU EDA I BEKKJARRODINNI?
     `pickXi` radar bekknum eftir SAMA skori, svo `prod` faer bekk sem er
     radad eftir byrjunar-likum — sem AETTI ad hjalpa autosubs. Se svo er
     tapid EINGONGU i XI-valinu og ekki nedanverk af bekkjarrodinni. Fjorar
     samsetningar, sami hopur, sama slembitala.                          ---- */
  const acc = { AA: 0, AB: 0, BB: 0, BA: 0, n: 0 };
  const cl = [];
  for (let gi = 0; gi < gwKeys.length; gi++) {
    const p = POOLS.regulars(byGw.get(gwKeys[gi]));
    const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const c of p) if (byPos[c.pos]) byPos[c.pos].push(c);
    if (byPos.GK.length < 2 || byPos.DEF.length < 5 || byPos.MID.length < 5 || byPos.FWD.length < 3) continue;
    const rnd = mulberry32(1000003 * SEED + gi * 7919 + "regulars".length * 104729);
    const cur = [];
    for (let s = 0; s < SQUADS; s++) {
      const sq = drawSquad(byPos, rnd);
      if (!sq) continue;
      const A = pickXi(sq, RULES.exp,  { tiebreak: (a, b) => (a.price - b.price) || 0 });
      const B = pickXi(sq, RULES.prod, { tiebreak: (a, b) => (a.price - b.price) || 0 });
      const ord = (bench, fn) => [...bench].sort((a, b) => fn(b) - fn(a));
      const o = {
        AA: realisedWithSubs(A.xi, A.bench),
        AB: realisedWithSubs(A.xi, ord(A.bench, RULES.prod)),
        BB: realisedWithSubs(B.xi, B.bench),
        BA: realisedWithSubs(B.xi, ord(B.bench, RULES.exp)),
      };
      for (const k of ["AA", "AB", "BB", "BA"]) acc[k] += o[k];
      acc.n++; cur.push(o);
    }
    if (cur.length) cl.push(cur);
  }
  console.log(`\n   6b. XI CHOICE vs BENCH ORDER (n=${acc.n})`);
  for (const [k, lab] of [["AA", "XI=exp   bench=exp "], ["AB", "XI=exp   bench=prod"],
                          ["BB", "XI=prod  bench=prod"], ["BA", "XI=prod  bench=exp "]])
    console.log(`     ${lab}  ${fmt(acc[k] / acc.n, 3)}`);
  const dd = (a, b) => ci(bootstrapCI(cl.map(c => c.map(r => ({ v: r[a] - r[b] }))), rs => mean(rs.map(r => r.v))));
  console.log(`     bench order only (AB - AA) ${dd("AB", "AA")}`);
  console.log(`     XI choice only   (BA - AA) ${dd("BA", "AA")}`);
  console.log(`     both             (BB - AA) ${dd("BB", "AA")}`);
}

/* ============================================================
   7. ER EINHVER VOG A PRODUKTINU BETRI EN NULL?
   `expPts x sp^k`: k=0 er `exp`, k=1 er produktid. Ef besta k er 0 er
   svarid ekki bara "produktid tapar" heldur "ENGIN vog a thvi vinnur",
   sem er sterkari fullyrding og lokar spurningunni. Vaegari form
   (k = 0,25 / 0,5) eru einmitt thad sem madur myndi prófa naest.
   ============================================================ */
console.log("\n" + "=".repeat(72));
console.log("7. WEIGHTING THE PRODUCT — expPts x sp^k  (k=0 is `exp`), pool: regulars");
console.log("=".repeat(72));
{
  const KS = [0, 0.15, 0.25, 0.5, 0.75, 1, 1.5, 2];
  const cl = [];
  for (let gi = 0; gi < gwKeys.length; gi++) {
    const p = POOLS.regulars(byGw.get(gwKeys[gi]));
    const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const c of p) if (byPos[c.pos]) byPos[c.pos].push(c);
    if (byPos.GK.length < 2 || byPos.DEF.length < 5 || byPos.MID.length < 5 || byPos.FWD.length < 3) continue;
    const rnd = mulberry32(1000003 * SEED + gi * 7919 + "regulars".length * 104729);
    const cur = [];
    for (let s = 0; s < SQUADS; s++) {
      const sq = drawSquad(byPos, rnd);
      if (!sq) continue;
      const o = {};
      for (const k of KS) {
        const fn = r => r.expPts * Math.pow(r.sp ?? 1, k);
        const res = pickXi(sq, fn, { tiebreak: (a, b) => (a.price - b.price) || 0 });
        o["k" + k] = realisedWithSubs(res.xi, res.bench);
        o["r" + k] = res.xi.reduce((x, y) => x + y.pts, 0);
      }
      cur.push(o);
    }
    if (cur.length) cl.push(cur);
  }
  const flat = cl.flat();
  for (const k of KS) {
    const d = bootstrapCI(cl.map(c => c.map(r => ({ v: r["k" + k] - r.k0 }))), rs => mean(rs.map(r => r.v)));
    const dr = bootstrapCI(cl.map(c => c.map(r => ({ v: r["r" + k] - r.r0 }))), rs => mean(rs.map(r => r.v)));
    console.log(`   k=${String(k).padEnd(5)} autosubs ${fmt(mean(flat.map(r => r["k" + k])), 3)}  d ${ci(d)}`);
    console.log(`   ${" ".repeat(7)} raw XI   ${fmt(mean(flat.map(r => r["r" + k])), 3)}  d ${ci(dr)}`);
  }
}

console.log("\nDONE.");
