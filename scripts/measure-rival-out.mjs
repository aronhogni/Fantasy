/* ============================================================
   A. VANTAR KEPPINAUTINN? — BAETIR "SAMHERJI I SOMU STODU MISSTI SIDUSTU
      UMFERD" NOKKRU OFAN A START_MODEL?

   EKKI I `npm test`, EKKI I PIPELINE, ENGIR LYKLAR. Keyrsla:
       node scripts/measure-rival-out.mjs
       node scripts/measure-rival-out.mjs --iters 400 --json [SLOD]

   SPURNINGIN ER EIGANDANS: "Ben White er med ST 24% en adal keppinautur
   hans er meiddur, svo hann byrjar pottthett."

   ThAD SEM ER MAELT ER **DELTA**, EKKI FYLGNI. CLAUDE.md kafli 4 er fullur
   af merkjum sem litu sterk ut ein og ser og maeldust NULL ofan a thad sem
   likanid hefur thegar (xGChain -0,0009 · snertingar i vitateig CI
   [-0,0079, +0,0389] · skipta-hreyfing fjoldans r -0,0005). Kepppinautur
   sem vantar hefur AUGLJOSA leid til ad vera thegar innifalinn: leikmadurinn
   sem tok vid stodunni SPILADI sidustu umferd, svo `started_last` og `mins5`
   bera merkid. Thess vegna er base-lidid `logit(p_model)` og prófid er
   hvort `rival_out` baeti vid THAR OFAN A.

   FORSPARFORMID, EKKI SAMTIMAFORMID: spurt er hvort samherji i somu stodu
   hafi misst umferd N-1 (0 minutur) og hvort thad breyti P(byrjun i N).
   Samtimaformid ("vantar hann i THESSARI umferd") er ekki nytilegt fyrir
   frest — thad er svarid sem vid vitum ekki.

   AFMORKUN SEM MA EKKI FELA: vid geymum ENGA sogulega `chance_of_playing`.
   "Missti umferd" blandar thvi saman meidslum, banni, rotation og thvi ad
   vera skilinn eftir i erlendri ferd. Rotation-tilfellid er MOTVERKANDI
   (thjalfari sem hvilir mann i N-1 setur hann oft inn i N, sem BAETIR
   merkid) en bann-tilfellid er thad lika. Ahrifin eru thvi ATLOGUÐ NIDUR
   (attenuation) — sannur meidsla-lidur er >= thad sem maelist her, aldrei
   minni. Ef CI innihelda null er thad thvi EKKI hreint "engin ahrif";
   thad er "ekki greinanlegt med thvi umbodi sem vid geymum".
   ============================================================ */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { startFeatures, startProbability } from "../src/stats.js";
import {
  loadPanel, SEASONS, isStart, logit, sigmoid, brier, logloss, auc,
  fitLogistic, bootstrapCI, byPlayer, ci, fmt,
} from "./start-panel.mjs";

const argv = process.argv.slice(2);
const ITERS = +(argv[argv.indexOf("--iters") + 1] || 400) || 400;
const WRITE = argv.includes("--json");
const FIRST_GW = 7;                      // 5-umferda gluggi + 1 fyrir "established"

const panel = await loadPanel();
console.log("PANEL");
for (const s of SEASONS) {
  const p = panel[s];
  console.log(`  ${s}  players ${String(p.byCode.size).padStart(4)}  ` +
              `name-misses ${p.nameMisses}  ambiguous ${p.ambiguous}`);
}

/* ============================================================
   1. RADIRNAR
   ============================================================ */
const rows = [];
const drop = { noRowN: 0, shortWindow: 0, noP: 0, teamBlank: 0 };

for (const season of SEASONS) {
  const { byCode, teamPlayed } = panel[season];
  const players = [...byCode.values()];

  /* (round|team|pos) -> [code] */
  const squad = new Map();
  for (const p of players) for (const [rd, g] of p.r) {
    const k = `${rd}|${g.team}|${p.pos}`;
    (squad.get(k) || squad.set(k, []).get(k)).push(p.code);
  }

  for (const p of players) {
    for (let N = FIRST_GW; N <= 38; N++) {
      const gN = p.r.get(N);
      if (!gN) { drop.noRowN++; continue; }
      if (!teamPlayed.has(`${N}|${gN.team}`)) { drop.teamBlank++; continue; }

      /* 5-umferda gluggi — ALLAR umferdir verda ad vera til. Leikmadur sem
         kom i januar hefur ekki 5 umferdir og fer thvi UT ur urtakinu; thad
         er sama afmorkun og appid hefur i raun (imminent-glugginn). */
      const win = [];
      let ok = true;
      for (let r = N - 5; r <= N - 1; r++) {
        const g = p.r.get(r); if (!g) { ok = false; break; }
        win.push(g.mins);
      }
      if (!ok) { drop.shortWindow++; continue; }

      const pm = startProbability(startFeatures(win, gN.value));
      if (pm == null) { drop.noP++; continue; }

      /* --- KEPPINAUTAR: sama lid i N-1, sama stada --- */
      const prev = p.r.get(N - 1);
      const mates = (squad.get(`${N - 1}|${prev.team}|${p.pos}`) || [])
        .filter(c => c !== p.code)
        .map(c => byCode.get(c));

      let mySt = 0;
      for (let r = N - 5; r <= N - 2; r++) {
        const g = p.r.get(r); if (g && isStart(g.mins)) mySt++;
      }

      let anyOut = 0, countOut = 0, strongOut = 0, twoWeekOut = 0, aheadOut = 0;
      let mates0 = 0, aheadMates = 0, oracleOut = 0, oracleAhead = 0;
      for (const m of mates) {
        const g1 = m.r.get(N - 1); if (!g1) continue;
        /* "established" = byrjadi >=2 af umferdunum N-5..N-2 (fjorar). */
        let st = 0, have = 0;
        for (let r = N - 5; r <= N - 2; r++) {
          const g = m.r.get(r); if (!g) continue; have++;
          if (isStart(g.mins)) st++;
        }
        if (have < 3 || st < 2) continue;
        mates0++;
        /* "fyrir ofan hann": dyrari OG byrjadi oftar i for-glugganum.
           ThETTA ER SKILYRDINGARHOPURINN, ekki lidurinn — ad EIGA dyrari
           keppinaut er sjalft merki um ad vera varamadur, svo samanburdur
           milli theirra sem EIGA slikan og theirra sem EKKI eiga maelir
           tvennt i einu. Rett samanburdur er INNAN thessa hops. */
        const ahead = (g1.value ?? 0) >= (prev.value ?? 0) && st > mySt;
        if (ahead) aheadMates++;

        /* ORAKEL-ThAKID: vantadi hann i umferd N SJALFRI? Thad er LEKI sem
           forspa, en thad er nakvaemlega thad sem FPL-frettir GEFA appinu
           lifandi ("keppinauturinn er meiddur i dag"). Talan er thvi ekki
           tillaga heldur ThAK: er nokkud her sem er thess virdi ad elta?
           Sama rok og orakel-thakid i `tests/rank-model.mjs`. */
        const gNm = m.r.get(N);
        if (gNm && gNm.mins === 0) { oracleOut = 1; if (ahead) oracleAhead = 1; }

        if (g1.mins !== 0) continue;
        anyOut = 1; countOut++;
        if (st >= 3) strongOut = 1;
        const g2 = m.r.get(N - 2);
        if (g2 && g2.mins === 0) twoWeekOut = 1;
        if (ahead) aheadOut = 1;
      }

      /* NAESTI I ROD: raðað eftir minutum i for-glugganum innan (lid, stada).
         `deputy` = hann er nr. 2; `chiefOut/chiefOracle` = nr. 1 vantadi.
         Thetta er thad naesta sem THESSI gogn komast ad "adal keppinautnum" —
         nakvaem stada (haegri bakvordur a moti midverdi) er EKKI i FPL-gognum,
         svo stodu-hopurinn er GROF nálgun og ahrifin thvi ATLOGUÐ NIDUR. */
      const pool = (squad.get(`${N - 1}|${prev.team}|${p.pos}`) || [])
        .map(c => byCode.get(c))
        .map(m => {
          let s = 0;
          for (let r = N - 5; r <= N - 2; r++) { const g = m.r.get(r); if (g) s += g.mins; }
          return { code: m.code, mins: s, m };
        })
        .sort((a, b) => b.mins - a.mins);
      const myRank = pool.findIndex(x => x.code === p.code) + 1;
      const chief = pool[0];
      let chiefOut = 0, chiefOracle = 0;
      if (chief && chief.code !== p.code && chief.mins > 0) {
        const c1 = chief.m.r.get(N - 1), cN = chief.m.r.get(N);
        if (c1 && c1.mins === 0) chiefOut = 1;
        if (cN && cN.mins === 0) chiefOracle = 1;
      }

      rows.push({
        code: p.code, season, gw: N, pos: p.pos, team: gN.team,
        y: isStart(gN.mins) ? 1 : 0, pm, lp: logit(pm),
        anyOut, countOut, strongOut, twoWeekOut, aheadOut,
        oracleOut, oracleAhead, establishedMates: mates0, aheadMates,
        rank: myRank, poolSize: pool.length, chiefOut, chiefOracle,
      });
    }
  }
}

console.log(`\nROWS ${rows.length}  (dropped: no row in N ${drop.noRowN} · ` +
            `team blank ${drop.teamBlank} · short window ${drop.shortWindow} · ` +
            `no p_model ${drop.noP})`);
console.log(`players ${new Set(rows.map(r => r.code)).size}  ` +
            `start rate ${fmt(rows.reduce((a, r) => a + r.y, 0) / rows.length, 4)}`);

/* ============================================================
   2. HRAR TOLUR — hversu oft er keppinautur fjarri, og hvad thydir thad?
   ============================================================ */
const VARIANTS = [
  ["anyOut",     r => r.anyOut,               "any same-club same-pos established starter missed N-1"],
  ["strongOut",  r => r.strongOut,            "...who had started >=3 of the 4 pre-window rounds"],
  ["twoWeekOut", r => r.twoWeekOut,           "...who missed BOTH N-2 and N-1 (persistent absence)"],
  ["aheadOut",   r => r.aheadOut,             "...who is dearer AND started more than the focal player"],
  ["countOut",   r => Math.min(3, r.countOut), "COUNT of such rivals (capped at 3)"],
  ["oracleOut",  r => r.oracleOut,            "ORACLE (leaks N): such a rival missed gameweek N ITSELF"],
];

console.log("\n=== RAW (no model) ===");
for (const [name, f, desc] of VARIANTS) {
  const on = rows.filter(r => f(r) >= 1), off = rows.filter(r => f(r) === 0);
  const sr = a => a.length ? a.reduce((s, r) => s + r.y, 0) / a.length : NaN;
  const mp = a => a.length ? a.reduce((s, r) => s + r.pm, 0) / a.length : NaN;
  console.log(`${name.padEnd(11)} on ${String(on.length).padStart(6)} ` +
              `start ${fmt(sr(on), 3)} (p_model ${fmt(mp(on), 3)})   ` +
              `off ${String(off.length).padStart(6)} start ${fmt(sr(off), 3)} ` +
              `(p_model ${fmt(mp(off), 3)})   — ${desc}`);
}

/* Innan p_model-thundunga: er lyftingin eftir thegar likanid hefur talad? */
console.log("\n=== anyOut WITHIN p_model deciles (this is where a real term must live) ===");
{
  const sorted = rows.slice().sort((a, b) => a.pm - b.pm);
  const per = Math.ceil(sorted.length / 10);
  console.log("dec   n_on  start_on  n_off  start_off   lift   mean_p");
  for (let d = 0; d < 10; d++) {
    const seg = sorted.slice(d * per, (d + 1) * per);
    const on = seg.filter(r => r.anyOut), off = seg.filter(r => !r.anyOut);
    const sr = a => a.length ? a.reduce((s, r) => s + r.y, 0) / a.length : NaN;
    console.log(`${String(d + 1).padStart(3)} ${String(on.length).padStart(6)}  ` +
      `${fmt(sr(on), 3)}   ${String(off.length).padStart(5)}   ${fmt(sr(off), 3)}    ` +
      `${fmt(sr(on) - sr(off), 3)}  ${fmt(seg.reduce((s, r) => s + r.pm, 0) / seg.length, 3)}`);
  }
}

/* ============================================================
   3. DELTA OFAN A LIKANID — LOSO YFIR TIMABIL
   ============================================================ */
function loso(featFns) {
  const out = [];
  for (const hold of SEASONS) {
    const tr = rows.filter(r => r.season !== hold);
    const te = rows.filter(r => r.season === hold);
    if (!tr.length || !te.length) continue;
    const X = tr.map(r => [1, r.lp, ...featFns.map(f => f(r))]);
    const b = fitLogistic(X, tr.map(r => r.y));
    for (const r of te) {
      const x = [1, r.lp, ...featFns.map(f => f(r))];
      out.push({ ...r, p: sigmoid(x.reduce((a, v, i) => a + v * b[i], 0)) });
    }
  }
  return out;
}

const baseOos = loso([]);
const baseByKey = new Map(baseOos.map(r => [`${r.season}|${r.code}|${r.gw}`, r.p]));

console.log(`\n=== BASE (recalibrated p_model only), out of sample ===`);
console.log(`n ${baseOos.length}  Brier ${fmt(brier(baseOos))}  ` +
            `logloss ${fmt(logloss(baseOos))}  AUC ${fmt(auc(baseOos))}`);
console.log(`raw p_model (uncalibrated) Brier ${fmt(brier(rows.map(r => ({ p: r.pm, y: r.y }))))}` +
            `  AUC ${fmt(auc(rows.map(r => ({ p: r.pm, y: r.y }))))}`);

const results = [];
for (const [name, f, desc] of VARIANTS) {
  const testOos = loso([f]);
  const pair = testOos.map(r => ({
    code: r.code, y: r.y, pb: baseByKey.get(`${r.season}|${r.code}|${r.gw}`), pt: r.p,
    on: f(r) >= 1,
  })).filter(r => r.pb != null);

  const dBrier = a => a.reduce((s, r) => s + ((r.pb - r.y) ** 2 - (r.pt - r.y) ** 2), 0) / a.length;
  const dLog = a => a.reduce((s, r) => s +
    (r.y ? Math.log(r.pt) - Math.log(r.pb) : Math.log(1 - r.pt) - Math.log(1 - r.pb)), 0) / a.length;

  const cl = byPlayer(pair);
  const bB = bootstrapCI(cl, dBrier, { iters: ITERS, seed: 11 });
  const bL = bootstrapCI(cl, dLog, { iters: ITERS, seed: 12 });

  /* Fullt urtak -> stuðull, til ad sja STAERD og formerki. */
  const X = rows.map(r => [1, r.lp, f(r)]);
  const b = fitLogistic(X, rows.map(r => r.y));

  results.push({ name, desc, coef: b[2], dBrier: bB, dLog: bL,
                 nOn: pair.filter(r => r.on).length, n: pair.length });

  console.log(`\n--- ${name} : ${desc}`);
  console.log(`  rows ${pair.length} (on ${pair.filter(r => r.on).length}) · ` +
              `coef on logit scale ${fmt(b[2], 4)}`);
  console.log(`  d Brier  (base - test, >0 = better)  ${ci(bB, 6)}`);
  console.log(`  d loglik (>0 = better)               ${ci(bL, 6)}`);
  console.log(`  VERDICT: ${bB.excludesZero && bB.point > 0 ? "ACCEPT" : "REJECT"} by the CI-excludes-zero standard`);

  /* A THEIM RODUM ThAR SEM LIDURINN ER VIRKUR — thar hlytur hann ad vinna
     ef hann vinnur nokkud. (Delta yfir allt urtakid er thynnt ut af 90%+
     rodum thar sem lidurinn er 0.) */
  const onRows = pair.filter(r => r.on);
  if (onRows.length > 30) {
    const bOn = bootstrapCI(byPlayer(onRows), dBrier, { iters: ITERS, seed: 13 });
    console.log(`  d Brier ON THE ACTIVE ROWS only (n ${onRows.length}) ${ci(bOn, 6)}`);
  }
}

/* ============================================================
   4. HOPURINN SEM EIGANDINN SPURDI UM — laga p_model, hár keppinautur uti
   ============================================================ */
console.log("\n=== THE BEN WHITE SHAPE — CONDITIONED, not confounded ===");
console.log("Sample = rows where a DEARER, more-often-starting established rival EXISTS.");
console.log("Comparing inside that group only: was he absent, or present?");
{
  const sr = a => a.length ? a.reduce((s, r) => s + r.y, 0) / a.length : NaN;
  const mp = a => a.length ? a.reduce((s, r) => s + r.pm, 0) / a.length : NaN;
  const cases = [
    ["rival missed N-1 (usable at deadline)", r => r.aheadOut],
    ["rival missed N ITSELF (ORACLE ceiling)", r => r.oracleAhead],
  ];
  for (const band of [[0, 1.01, "all"], [0, 0.45, "p_model < 0.45"], [0, 0.30, "p_model < 0.30"]]) {
    const seg = rows.filter(r => r.aheadMates > 0 && r.pm >= band[0] && r.pm < band[1]);
    console.log(`\n  ${band[2]}: n ${seg.length} rows, ${new Set(seg.map(r => r.code)).size} players, ` +
                `mean p_model ${fmt(mp(seg), 3)}, actual start rate ${fmt(sr(seg), 3)}`);
    for (const [label, f] of cases) {
      const on = seg.filter(f), off = seg.filter(r => !f(r));
      if (!on.length || !off.length) continue;
      const d = a => {
        const o = a.filter(f), q = a.filter(r => !f(r));
        if (!o.length || !q.length) return NaN;
        return o.reduce((s, r) => s + r.y, 0) / o.length - q.reduce((s, r) => s + r.y, 0) / q.length;
      };
      const dm = a => {
        const o = a.filter(f), q = a.filter(r => !f(r));
        if (!o.length || !q.length) return NaN;
        return o.reduce((s, r) => s + (r.y - r.pm), 0) / o.length
             - q.reduce((s, r) => s + (r.y - r.pm), 0) / q.length;
      };
      console.log(`    ${label}`);
      console.log(`      out n ${String(on.length).padStart(5)} start ${fmt(sr(on), 3)} (p_model ${fmt(mp(on), 3)})` +
                  `  ·  present n ${String(off.length).padStart(5)} start ${fmt(sr(off), 3)} (p_model ${fmt(mp(off), 3)})`);
      console.log(`      raw lift          ${ci(bootstrapCI(byPlayer(seg), d, { iters: ITERS, seed: 21 }), 4)}`);
      console.log(`      lift NET of model ${ci(bootstrapCI(byPlayer(seg), dm, { iters: ITERS, seed: 22 }), 4)}` +
                  `   <- this is what a new term could actually add`);
    }
  }
}

/* ============================================================
   5. PER STADA — ORAKEL-ThAKID. Markmenn eru skarpasta tilfellid: eitt
      byrjunar-saeti per lid, svo "keppinauturinn er uti" aetti ad vera
      naerri deterministiskt. Ef merkid er ekki ThAR er thad ekki neins stadar.
   ============================================================ */
console.log("\n=== ORACLE ceiling per position (rival absent in N itself), net of p_model ===");
for (const pos of ["GK", "DEF", "MID", "FWD"]) {
  const seg = rows.filter(r => r.pos === pos && r.establishedMates > 0);
  const f = r => r.oracleOut;
  const on = seg.filter(f), off = seg.filter(r => !f(r));
  if (on.length < 30 || off.length < 30) { console.log(`  ${pos}: too few rows`); continue; }
  const sr = a => a.reduce((s, r) => s + r.y, 0) / a.length;
  const dm = a => {
    const o = a.filter(f), q = a.filter(r => !f(r));
    if (!o.length || !q.length) return NaN;
    return o.reduce((s, r) => s + (r.y - r.pm), 0) / o.length
         - q.reduce((s, r) => s + (r.y - r.pm), 0) / q.length;
  };
  console.log(`  ${pos.padEnd(4)} out n ${String(on.length).padStart(5)} start ${fmt(sr(on), 3)} · ` +
              `present n ${String(off.length).padStart(5)} start ${fmt(sr(off), 3)} · ` +
              `net of model ${ci(bootstrapCI(byPlayer(seg), dm, { iters: ITERS, seed: 31 }), 4)}`);
}

/* ============================================================
   6. NAESTI I ROD (rank 2) OG ADALMADURINN VANTAR
      Naesta sem thessi gogn komast ad spurningunni sem var spurd.
   ============================================================ */
console.log("\n=== DEPUTY (rank 2 by pre-window minutes at his club+position) ===");
console.log("y = did the deputy start gameweek N?");
for (const pos of ["GK", "DEF", "MID", "FWD"]) {
  const seg = rows.filter(r => r.pos === pos && r.rank === 2 && r.poolSize >= 2);
  if (seg.length < 60) { console.log(`  ${pos}: n ${seg.length} — too few`); continue; }
  const sr = a => (a.length ? a.reduce((s, r) => s + r.y, 0) / a.length : NaN);
  const mp = a => (a.length ? a.reduce((s, r) => s + r.pm, 0) / a.length : NaN);
  for (const [label, f, seed] of [
    ["chief missed N-1 (deadline-usable)", r => r.chiefOut, 41],
    ["chief missed N     (ORACLE)       ", r => r.chiefOracle, 42],
  ]) {
    const on = seg.filter(f), off = seg.filter(r => !f(r));
    if (on.length < 20 || off.length < 20) { console.log(`  ${pos} ${label}: too few`); continue; }
    const dm = a => {
      const o = a.filter(f), q = a.filter(r => !f(r));
      if (!o.length || !q.length) return NaN;
      return o.reduce((s, r) => s + (r.y - r.pm), 0) / o.length
           - q.reduce((s, r) => s + (r.y - r.pm), 0) / q.length;
    };
    console.log(`  ${pos.padEnd(4)} ${label}  out n ${String(on.length).padStart(5)} ` +
      `start ${fmt(sr(on), 3)} (model said ${fmt(mp(on), 3)})  ·  present n ${String(off.length).padStart(5)} ` +
      `start ${fmt(sr(off), 3)} (model said ${fmt(mp(off), 3)})`);
    console.log(`       net of model ${ci(bootstrapCI(byPlayer(seg), dm, { iters: ITERS, seed }), 4)}`);
  }
}

if (WRITE) {
  const i = argv.indexOf("--json"), nxt = argv[i + 1];
  const target = nxt && !nxt.startsWith("-")
    ? resolve(process.cwd(), nxt) : join(tmpdir(), "fpl-measure", "rival-out.json");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify({ measured: new Date().toISOString(),
    n: rows.length, iters: ITERS, results }, null, 2));
  console.log(`\nwrote ${target}`);
}
