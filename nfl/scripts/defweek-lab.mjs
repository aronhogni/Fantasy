#!/usr/bin/env node
/* ============================================================
   defweek-lab.mjs — ER "VORN GEGN STODU" BYGGD RETT?

     node scripts/defweek-lab.mjs [--from=2019] [--boot=400] [--quick]

   -> data/measure/defweek.json          (--quick SKRIFAR EKKI, sja nedar)

   ============================================================
   SPURNINGIN, OG HVERS VEGNA HUN ER ONNUR EN `DEF_WEIGHT`
   ============================================================
   `DEF_WEIGHT = 0,20` ER MAELD (README kafli 3: RMSE-ferill utan
   urtaks, 0,77300 an lidarins og 0,77200 vid 0,20). En HVERNIG
   VARNARTALAN SJALF ER BYGGD er OMAELT. `defenseVsPosition` i
   `fetch-nfl.mjs` tekur HRA fantasy-stig sem stada skoradi gegn
   lidinu, deilir med leikjum og skreppir ad deildarmedaltali med
   `w = n/(n+6)`. Thrjar akvardanir i theirri einu linu eru ovaldar:

     1. HRAA TALAN ER RUGLUD VID ANDSTAEDINGANA. Vorn sem lek vid
        threa bestu WR-hopana litur illa ut an ad vera thad. Vaenta
        talan sem vid VILJUM er "stig a sig GEFID medal-sokn".
     2. STIG, EKKI IHLUTIR. Stig a sig blanda saman TD-heppni og
        magni. Sama spurning og xG a moti morkum i FPL-hlutanum, og
        thar vann vaenta talan (r 0,369 -> 0,818).
     3. ALLT TIMABILID TIL THESSA, ekki sidustu N vikur. Varnir
        breytast — meidsli, skipti — en styttri gluggi er havadari.

   ============================================================
   VAENTINGIN ER LITIL OG HUN ER SKRAD FYRIRFRAM (`priorExpectation`)
   ============================================================
   `gap-lab` (README 4f) sundurgreindi start/sit-bilid i dag og fann
   ad VARNAR-FLASKAN ER TOM: vorn fangadi 26,7% af bilinu — staersti
   flokkurinn — en AUDGUN merkisins er 0,961x, thad er ad segja
   varnar-merkid flaggar eftirsja SJALDNAR en venjuleg vika. Rodin,
   afvoxtud: availability 1,42x -> hlutverk 1,20x -> vorn 0,00.

   Thess vegna er thessi skrifta skrifud til ad SVARA, ekki til ad
   finna. Ef ekkert stenst er thad SAMHLJODA gap-lab og full
   nidurstada. Ef eitthvad stenst tharf ad skyra hvernig thad fer
   saman vid audgun 0,961x, og skyringin verdur ad vera i skranni.

   ============================================================
   ORAKELID SEM SKERIR UR — OG THAD VAR ThAD SEM VANTADI
   ============================================================
   Fyrsta utgafa thessarar skriftu maeldi eingongu MATSADFERDIR. Sa
   ås getur ekki svarad "er flaskan tom af thvi ad vid matum illa,
   eda af thvi ad thad er ekkert i henni?".

   `oracle`-adferdin svarar thvi: hun notar HVERNIG VORNIN SPILADI I
   RAUN thessa viku (stig sem stadan skoradi gegn henni, deilt med
   viku-medaltali allra varna) — fullkomin vitneskja um vorn, sama
   skilgreining og `gap-lab` notar i `defDevOf`. Hun er LEK MED
   ASETNINGI og er ThAK, ekki frambjodandi; hun keppir ekki i
   plasebo-samanburdinum. Naer hun litlu er engin matsadferd til sem
   naer meira, og "flaskan er tom" er STRUKTURAL stadreynd um
   likanid, ekki gagnrymi um matid.

   Klemman `[0,80 · 1,25]` i `defenseMult` er sjalf ómæld og hun
   BINDUR orakelid. Thess vegna er orakelid maelt BAEDI med klemmu
   (eins og appid er) og AN hennar — thad skilur "klemman bindur" fra
   "merkid er ekki tharna", sem eru tvaer olikar nidurstodur.

   ============================================================
   MAELIKVARDINN ER SA SAMI OG I `startsit-lab.mjs` — ANNARS ER
   THETTA OSAMANBURDARHAEFT
   ============================================================
   Hlutfall tiltaeka bilsins sem er lokad:
       (vikuleg - flat) / (fullkomid - flat)
   Sami hopur i somu viku, hermt draft eftir ADP, 12 saeti.

   TALAN SEM ER VERID AD SLA — OLL THRJU SNID, ekki eitt:
       ppr       5,831%   t = 4,328   7/7 ar
       half      3,199%   t = 1,908   5/7  <- EKKI marktaek
       standard  2,967%   t = 2,831   6/7
   Oll thrju eru endurgerd hér sem AKKERI, hvert ur TVEIMUR ohadum
   skram thar sem thaer eru til (`startsit_*.json` og `gap.json`).
   Ad endurgera thaer krafdist thess ad viku-spain se RUNNUD A 0,1
   STIG — `weeklyProjection` gerir thad og fyrsta utgafa thessarar
   skriftu gerdi ekki. Akkerid fell og sagdi thad; an akkersins hefdi
   skran birt 5,317% sem "endurgerd".

   ============================================================
   LEKINN SEM VAR THEGAR I NULLTILGATUNNI — OG ER SAGDUR, EKKI FALINN
   ============================================================
   `data/defense.json` er TIMABILS-SUMMA: ein rod per (timabil, lid,
   stada) med `games: 16`. `startsit-lab` flettir henni upp fyrir
   viku 3 — svo nulltilgatan sjalf VEIT UTKOMUNA um vorn
   andstaedingsins allt timabilid.

   Thess vegna eru TVAER nulllinur birtar:
     `incumbent`    defense.json obreytt (5,831% — talan i README)
     `incumbentWF`  SAMA formula (hra stig, K=6) en byggd adeins ur
                    vikum < w, i snidi akvordunarinnar
   Ad bera walk-forward adferd adeins vid `incumbent` vaeri ad lata
   hana keppa vid orakel. Badar eru birtar og badar eru i domnum.

   ============================================================
   SKILYRDIN SEM THESSI SKRIFTA ERFIR
   ============================================================
   * PLASEBO-FAMILIA (opp-lab): tolf akvedin havada-"varnir" gegnum
     SAMA netid — sex fraekorn um HRAA leidina og sex um IHLUTA-leidina,
     thvi ridge-fittingin er sjalf vel sem gaeti framleitt merki. I
     opp-lab nadi havadi |t| = 3,50 i einstoku holfi.
   * PLASEBO-THAKID ER EINHLIDA. `usage-lab` fann ad `max |t|` gaf
     22,238 fyrir holf sem TAPADI i hverju tímabili (orsma dreifni),
     og sa galli FLIPPADI SVARINU. Thess vegna er thakid `maxPositiveT`
     og `maxPct`, aldrei algildi.
   * BOOTSTRAP KLASADUR PER LEIKMANN (vbdbase-lab 4c): 29 holf
     marktaek eftir timabili, 0 af 153 per leikmann. Badir birtir;
     PER-LEIKMANNS RAEDUR.
   * WALK-FORWARD: varnartalan fyrir viku w notar adeins vikur < w
     SAMA TIMABILS (og fyrri timabil, sem er fortid og thvi leyfilegt).
     Profad STRUKTURALT (`anchors.noLeak`) med eitrun, ekki fullyrt.
     FYRSTA UTGAFA THESS PROFS EITRADI OLL AR i einu og fell thvi a
     LEYFILEGRI krosstimabils-upplysingu; thad var profid sem var
     rangt, ekki kodinn. Sja `anchors.noLeak.scope`.
   * MAE ER BIRT VID HLIDINA A AKVORDUNINNI. `shrink-lab` fann 57 holf
     thar sem MAE batnadi og akvordunin versnadi. Ef thad sest hér
     stendur thad i skranni.
   * SKRIFTAN DEYR FREMUR EN AD SKRIFA falli akkeri (exit 3), og
     `--quick` SKRIFAR ALDREI (exit 0 an skrar) — half-net sem lendir
     a `data/measure/defweek.json` lítur ut eins og maeling og er thad
     ekki.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { gameScriptMult, defenseMult, impliedTeamTotals, DEF_WEIGHT } from "../src/model.js";
import { mean, solve, bootstrapDiff } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const MEAS = path.join(OUT, "measure");
const ARG = parseArgs(process.argv.slice(2), { from: "number", boot: "number" });
const FROM = Number(ARG.from || 2019);
const BOOT = Number(ARG.boot || 400);
const QUICK = !!ARG.quick;

const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const POSS = ["QB", "RB", "WR", "TE"];          // K/DST eru ekki i vikufylkinu
const PI = { QB: 0, RB: 1, WR: 2, TE: 3 };
const MAXW = 18;
const CLAMP_LO = 0.80, CLAMP_HI = 1.25;         // ordrett ur `defenseMult`

const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function die(msg, code = 3) {
  console.error(`\n  ${msg}\n`);
  process.exit(code);
}

/* NAN ER FALSY OG THAD ER GILDRAN. Tveir adrir verktakar fundu i dag
   skriftur thar sem `f[term] || 0` gerdi brotid gildi ad thogulli
   hlutleysingu og NaN-stokkbreyting slapp ut med exit 0. Hér er hvert
   NaN DAUDADOMUR, og ad thad se thad er STOKKBREYTINGARPROFAD
   (`anchors.nanGuard`). */
function assertFinite(arr, label) {
  for (let i = 0; i < arr.length; i++) {
    if (!Number.isFinite(arr[i])) throw new Error(`NON-FINITE in ${label} at ${i}: ${arr[i]}`);
  }
  return arr;
}

/* Sama t-tala og `startsit-lab` og `half-lab` reikna — n-1 i
   nefnaranum. Sama formula, svo tolurnar seu samanburdarhaefar. */
function statOf(vals) {
  const v = vals.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) {
    return { mean: v.length ? v[0] : null, t: null, years: v.length, positive: null, se: null };
  }
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  const se = sd / Math.sqrt(v.length);
  return { mean: m, t: se ? m / se : null, years: v.length,
           positive: v.filter((x) => x > 0).length, se };
}
/* Kritisk gildi, LYKLAD A URTAKSSTAERD n (gildid er fyrir df = n-1).
   TVAER `df`-VILLUR fundust i opp-lab og BADAR laekkudu throskuldinn.
   Sù sem var i FYRRI utgafu THESSARAR skriftu las `T_CRIT[n-1]`, sem
   er df = n-2 — hun HAEKKADI throskuldinn (2,571 i stad 2,447 vid
   n=7) og var thvi varfaerin i ranga att: hun hefdi fellt raunverulegt
   merki. Taflan er profud beint (`anchors.tCritTable`). */
const T_CRIT = { 2: 12.706, 3: 4.303, 4: 3.182, 5: 2.776, 6: 2.571, 7: 2.447,
                 8: 2.365, 9: 2.306, 10: 2.262, 11: 2.228, 12: 2.201 };
const tCritFor = (n) => (n >= 2 ? (T_CRIT[n] ?? 2.201) : null);

/* ============================================================
   1. UPPSTILLINGIN — EIN UTFAERSLA, EKKI TVAER
   ============================================================
   Ordrett sama val og `startsit-lab.lineupFrom`, endurskrifud a
   forreiknudum fylkjum til ad na thusundum holfa a vidunandi tima.
   AD HUN SE ORDRETT EINS ER PROFAD, ekki fullyrt: `anchors.reproduce`
   krefst thess ad hun gefi somu tolur og `startsit_*.json` OG
   `measure/gap.json` bera — floor, flat, weekly, ceiling og
   pctOfGapClosed, ollum, i ollum thremur snidum.

   HUN SKILAR BAEDI SUMMU OG MONNUM. Fyrri utgafa hafdi `pickPoints`
   og `startedIds` sem TVAER utfaerslur a somu gradugu reglu — thaer
   gatu rekid i sundur og `anchors.decompose` var eina vornin. Nu er
   thad ein lykkja og engin vorn tharf ad vera til. */
const NEED = [1, 2, 3, 1];                       // QB, RB, WR, TE
function pickLineup(entries, scores, wantIds) {
  const by = [[], [], [], []];
  for (let i = 0; i < entries.length; i++) {
    const s = scores[i];
    if (s == null) continue;
    if (!Number.isFinite(s)) throw new Error(`NON-FINITE lineup score at ${i}: ${s}`);
    by[entries[i].pi].push(i);
  }
  const cmp = (a, b) => scores[b] - scores[a];   // stodugt i V8 -> heldur hop-rod
  for (const arr of by) arr.sort(cmp);
  let sum = 0;
  const ids = wantIds ? [] : null;
  const rest = [];
  for (let p = 0; p < 4; p++) {
    const arr = by[p];
    for (let i = 0; i < arr.length; i++) {
      if (i < NEED[p]) { sum += entries[arr[i]].act; if (ids) ids.push(entries[arr[i]].id); }
      else if (p > 0) rest.push(arr[i]);         // FLEX er RB/WR/TE, ekki QB
    }
  }
  if (rest.length) {
    /* Sama rod og `[...by.RB, ...by.WR, ...by.TE].sort()` gefur. */
    rest.sort(cmp);
    sum += entries[rest[0]].act;
    if (ids) ids.push(entries[rest[0]].id);
  }
  return { sum, ids };
}

/* ============================================================
   2. UMHVERFID PER SNIDI — HOPAR, VIKUR, LINUR
   ============================================================
   `half` er REIKNAD UPP A STIG, ekki nalgad: PPR = STD + mottokur,
   svo HALF = (STD + PPR)/2. Sama algebra og `half-lab` og `gap-lab`.
   ADP fyrir half er PPR-ADP (sogulegt half-ADP er ekki til). Thad
   SKIPTIR EKKI MALI hér: hoparnir eru HALDNIR FOSTUM yfir oll holf
   innan snids, svo ADP-valid getur ekki buid hrifin til — thad
   skilgreinir adeins umhverfid. */
function buildPools(feats) {
  const rowsBy = new Map();
  for (const r of feats.rows) rowsBy.set(`${r.scoring}|${r.season}|${r.id}`, r);
  const projOf = (r) => (r.sleeperProj != null ? r.sleeperProj : r.ffProj);
  const pools = { ppr: {}, half: {}, standard: {} };
  let paired = 0, unpaired = 0;

  for (const fmt of ["ppr", "half", "standard"]) {
    const src = fmt === "standard" ? "standard" : "ppr";
    /* RODIN ER SKRA-ROD, ekki Map-rod. `field` er radad eftir ADP med
       stodugri rodun, svo jafntefli i ADP falla eftir thessari rod —
       hun VERDUR thvi ad vera sù sama og `startsit-lab` og `gap-lab`
       sja, sem er hra rod `feats.rows`. */
    for (const r of feats.rows) {
      if (r.scoring !== src || r.adp == null) continue;
      const pj = projOf(r);
      if (pj == null) continue;
      let proj = pj, act = fmt === "standard" ? r.ptsStd : r.pts;
      if (fmt === "half") {
        const o = rowsBy.get(`standard|${r.season}|${r.id}`);
        if (!o) { unpaired++; continue; }        // oporud rod er SLEPPT, ekki agiskad
        const sj = projOf(o);
        if (sj == null) { unpaired++; continue; }
        paired++;
        proj = (pj + sj) / 2; act = (r.pts + o.ptsStd) / 2;
      }
      (pools[fmt][r.season] = pools[fmt][r.season] || [])
        .push({ id: r.id, pos: r.pos, proj, adp: r.adp, actual: act });
    }
  }
  return { pools, paired, unpaired };
}

/* ============================================================
   3. AKVARDANIRNAR — FORREIKNADAR EINU SINNI PER SNIDI
   ============================================================
   Hver "akvordun" er (hopur, vika). Fyrir hana er `base*gameScript`
   fast (thad er ohaft af vorninni) og adeins varnar-margfaldarinn
   breytist milli holfa. Thess vegna kostar holf adeins uppstillingu,
   ekki endurreikning a spanni. */
function buildEnv(fmt, pools, sched, teamIdx, weeklyBy) {
  const years = Object.keys(pools[fmt] || {}).map(Number).sort((a, b) => a - b)
    .filter((y) => y >= FROM);
  const per = {};
  for (const y of years) {
    const weekly = weeklyBy[y];
    if (!weekly) continue;
    const games = sched.games.filter((g) => g.season === y && g.type === "REG");
    if (!games.length) continue;
    const implied = new Map(), oppOf = new Map();
    for (const g of games) {
      const t = impliedTeamTotals(g.total, g.spread);
      if (t) { implied.set(`${g.home}|${g.week}`, t.home); implied.set(`${g.away}|${g.week}`, t.away); }
      oppOf.set(`${g.home}|${g.week}`, g.away);
      oppOf.set(`${g.away}|${g.week}`, g.home);
    }
    const pool = pools[fmt][y];
    if (!pool || pool.length < 120) continue;

    const wk = new Map(), teamWk = new Map(), weeks = new Set();
    const ptsField = fmt === "ppr" ? "ppr" : fmt === "half" ? "half" : "std";
    for (const w of weekly) {
      if (w.week > MAXW) continue;
      weeks.add(w.week);
      wk.set(`${w.id}|${w.week}`, { pos: w.pos, pts: w[ptsField] });
      if (w.team) teamWk.set(`${w.id}|${w.week}`, w.team);
    }
    const wl = [...weeks].sort((a, b) => a - b);

    const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
    const field = new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1]));
    const rosters = [];
    for (let slot = 1; slot <= TEAMS; slot++) {
      rosters.push(simulateDraft({ board: field, fieldBoard: field, actual, slot, league: LEAGUE }).roster);
    }
    const projMap = new Map(pool.map((p) => [p.id, p.proj]));

    /* Slembi-runan er ORDRETT sù sama og i `startsit-lab`: `lineupFrom`
       kallar `scoreOf` a ALLA hopinn adur en filterinn tekur vid, svo
       `rnd()` er kallad `roster.length` sinnum per uppstillingu, i
       hop-rod. Thess vegna er `ri` (rod i hopnum) geymd. */
    let seed = y * 7919;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    const decisions = [];
    let sFloor = 0, sFlat = 0, sCeil = 0, sGsOnly = 0;
    for (const roster of rosters) {
      for (const week of wl) {
        /* `played.length < 9` i startsit-lab telur hopmenn med vikurod,
           K og DST med — thess vegna er thad talid a HRAA hopnum, ekki
           a `entries` sem sleppir theim. Laugin hér ber engan K
           (features hefur adeins QB/RB/WR/TE) svo tolurnar eru eins,
           en reglan er skrifud eins og fyrirmyndin. */
        let played = 0;
        for (const id of roster) if (wk.get(`${id}|${week}`)) played++;
        if (played < 9) continue;

        const entries = [];
        for (let ri = 0; ri < roster.length; ri++) {
          const id = roster[ri];
          const a = wk.get(`${id}|${week}`);
          if (!a || PI[a.pos] == null) continue;
          const team = teamWk.get(`${id}|${week}`);
          const imp = team ? implied.get(`${team}|${week}`) : null;
          const opp = team ? oppOf.get(`${team}|${week}`) : null;
          const base = (projMap.get(id) ?? 0) / 17;
          entries.push({ id, ri, pi: PI[a.pos], act: a.pts, base,
            baseGs: base * gameScriptMult(imp == null ? null : imp, a.pos),
            oi: opp != null && teamIdx.has(opp) ? teamIdx.get(opp) : -1 });
        }
        const rl = roster.length;
        const rvals = new Array(rl);
        for (let i = 0; i < rl; i++) rvals[i] = rnd();
        sFloor += pickLineup(entries, entries.map((e) => rvals[e.ri]), false).sum;
        sFlat += pickLineup(entries, entries.map((e) => e.base), false).sum;
        sCeil += pickLineup(entries, entries.map((e) => e.act), false).sum;
        /* `gameScript` EINN — thad sem vikuspain gefur an nokkurs
           varnar-lidar. Notad sem orakel-akkeri: W=0 VERDUR ad gefa
           thetta upp a stig (`anchors.zeroWeightIsGameScriptOnly`). */
        sGsOnly += pickLineup(entries, entries.map((e) => Math.round(e.baseGs * 10) / 10), false).sum;
        decisions.push({ week, entries });
      }
    }
    if (!decisions.length) continue;
    per[y] = { decisions, n: decisions.length, sFloor, sFlat, sCeil, sGsOnly,
               gap: sCeil - sFlat, weeks: wl };
  }
  const ys = Object.keys(per).map(Number).sort((a, b) => a - b);
  return { years: ys, per };
}

/* ============================================================
   4. VARNARTOLURNAR — FIMM ASAR, ALLIR WALK-FORWARD
   ============================================================
   Athugun er (timabil, vika, sokn, vorn, stada) med gildi `y`:
     raw    hra fantasy-stig sem stadan skoradi i theim leik
     exp    VAENT gildi ur ihlutum [1, tgt, car, ay/10, epa]
     expv   VAENT gildi ur MAGNI EINU [1, tgt, car, ay] — an epa,
            thvi epa er sjalft utkomu-lagad (TD eru i honum) og
            "vaent" sem inniheldur utkomuna er ekki vaent
   Gluggi: allar vikur < w (season) eda sidustu 3/5 vikur.
   `oppAdj`: tveggja-atta samlagningarlikan  y = mu + off_o + def_d,
   skiptifitting med `n/(n+K)` skreppingu a BADAR attir — thad er
   "vaent stig a sig GEFID medal-sokn".
   K: skreppingar-stydull. `fetch-nfl` notar 6, ovalid.

   SKILAR `ratio = adj / leagueMean` per (vika, lid, stada). Vogin
   (`DEF_WEIGHT`) er BEITT SEINNA, svo sama tafla thjoni ollum vogum
   — og svo W=0 se NAKVAEMLEGA hlutlaust i hverju afbrigdi. */
/* SJOTTI ASINN, OG HANN FANNST AF AKKERI SEM FELL.
   `defenseVsPosition` i `fetch-nfl.mjs` leggur saman `r.ppr` — PPR-STIG
   — fyrir OLL snid. `data/defense.json` er thvi PPR-tafla sem er beitt
   obreytt i standard- og half-deildum, og thad er akvordun sem hvergi
   var maeld. Hun fannst thegar endurgerdar-akkerid fell: min endurgerd
   ur std-stigum gaf 3,487% thar sem nulltilgatan gefur 2,967% — 0,52 pp
   sem hafdi ekkert med formuluna ad gera og allt med hvada stig voru
   logd saman. `src` er thvi ås: "own" = stig deildarinnar sjalfrar,
   "ppr" = thad sem appid gerir i dag. Fyrir ppr-snidid er asinn
   SJALFKRAFA EINS og hann er thvi ekki keyrdur thar (afrit i neti
   maelir ekkert og blæs upp plasebo-thakid ad osonnu). */
const SRCS = (fmt) => (fmt === "ppr" ? ["own"] : ["own", "ppr"]);
const srcTag = (src) => (src === "ppr" ? "@pprSrc" : "");

const WINDOWS = [{ key: "season", back: 0 }, { key: "roll5", back: 5 }, { key: "roll3", back: 3 }];
const KS = [2, 6, 12, 24];
const VALUES = ["raw", "exp", "expv"];
const COLS = { exp: [0, 1, 2, 3, 4], expv: [0, 1, 2, 3] };
const W_MAIN = DEF_WEIGHT;                                  // 0,20 — nulltilgatan
const W_GRID = [0, 0.10, 0.20, 0.30, 0.50, 0.75, 1.00];
const SEEDS = [1, 2, 3, 4, 5, 6];                           // sex per plasebo-leid, tolf i allt
const SCOPES = [{ key: "all", pos: null }, ...POSS.map((p) => ({ key: p, pos: p }))];

/** Deterministiskt sud — engin slembivel, svo skran se endurgeranleg. */
function noiseOf(s, seed) {
  let h = (2166136261 ^ (seed * 16777619)) >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const u = ((h >>> 8) & 0xffff) / 65536, v = (h & 0xff) / 256;
  return u + v - 1;                                          // ~normal, medaltal 0
}

/**
 * Athuganir per (timabil, stada). Ein rod per (vika, sokn, vorn, stada).
 * `x` er ihluta-vigurinn `[1, tgt, car, ay/10, epa]`; ay er deilt med
 * 10 svo normaljofnurnar seu ekki illa skilyrdar.
 */
function buildObs(weeklyBy, years, teamIdx, ptsField) {
  const obs = {};
  for (const y of years) {
    obs[y] = { QB: [], RB: [], WR: [], TE: [] };
    const byGame = new Map();
    for (const r of weeklyBy[y]) {
      if (r.week > MAXW || !r.opp || !r.team || PI[r.pos] == null) continue;
      if (!teamIdx.has(r.opp) || !teamIdx.has(r.team)) continue;
      const k = `${r.week}|${r.team}|${r.opp}|${r.pos}`;
      let a = byGame.get(k);
      if (!a) {
        a = { week: r.week, off: teamIdx.get(r.team), def: teamIdx.get(r.opp), pos: r.pos,
              y: 0, x: [1, 0, 0, 0, 0] };
        byGame.set(k, a);
      }
      a.y += r[ptsField] || 0;
      a.x[1] += r.tgt || 0;
      a.x[2] += r.car || 0;
      a.x[3] += (r.ay || 0) / 10;
      a.x[4] += r.epa || 0;
    }
    for (const a of byGame.values()) obs[y][a.pos].push(a);
    for (const p of POSS) obs[y][p].sort((a, b) => a.week - b.week);
  }
  return obs;
}

/** Normaljofnur med orlitilli ridge. Skilar null se hun sinngult. */
function fitLinear(XtX, Xty, cols, n) {
  const p = cols.length;
  const A = Array.from({ length: p }, (_, i) => cols.map((cj, j) =>
    XtX[cols[i]][cj] + (i === j ? 1e-6 * Math.max(1, n) : 0)));
  const b = cols.map((c) => Xty[c]);
  const sol = solve(A, b);
  if (!sol || sol.some((v) => !Number.isFinite(v))) return null;
  return sol;
}

/**
 * MARKGILDIN fyrir eitt afbrigdi, per (timabil, stada).
 *   raw / exp / expv  -> raunveruleg stig a sig
 *   placebo / placeboExp -> sud, KVARDAD a somu dreifingu og raunverulega
 *     talan i thessu (snidi, stodu), annars fer thad odru megin vid
 *     klemmuna i `defenseMult` og faer forskot sem hefur ekkert med
 *     havada ad gera.
 * `placeboExp` fer gegnum RIDGE-VELINA (raunveruleg `x`, sud sem `y`),
 * svo vélin sjalf geti ekki framleitt merki oathugad.
 */
function targetsFor(obs, years, kind, seed) {
  const out = {};
  for (const y of years) {
    out[y] = {};
    for (const pos of POSS) {
      const rows = obs[y][pos];
      if (!rows.length) { out[y][pos] = []; continue; }
      if (kind === "noise") {
        const raws = rows.map((r) => r.y);
        const m = mean(raws);
        const sd = Math.sqrt(mean(raws.map((v) => (v - m) ** 2))) || 1;
        const nz = rows.map((r) => noiseOf(`${y}|${r.week}|${r.off}|${r.def}|${pos}`, seed));
        const nm = mean(nz);
        const nsd = Math.sqrt(mean(nz.map((v) => (v - nm) ** 2))) || 1;
        out[y][pos] = nz.map((v) => m + (v - nm) / nsd * sd);
      } else out[y][pos] = rows.map((r) => r.y);
    }
  }
  return out;
}

/**
 * Byggir `ratio`-tofluna fyrir eitt afbrigdi.
 * Skilar { [y]: Float64Array } med idx = ((week*NT)+team)*4+pos.
 *
 * WARM START A SEASON-GLUGGANUM. Skiptifittingin er hafin fra lausninni
 * i viku w-1 og tekur faerri itranir; season-glugginn er hreidradur svo
 * thad er retta upphafspunkturinn. AD ThAD SE NOG ER PROFAD
 * (`anchors.converged`) gegn 400-itrana fittun fra grunni, ekki fullyrt.
 */
function buildRatios(obs, years, NT, spec) {
  const { fit, cols, targets } = spec;       // fit: null | "exp"
  const out = {};
  for (const y of years) {
    const arr = new Float64Array((MAXW + 1) * NT * 4).fill(1);
    for (const pos of POSS) {
      const rows = obs[y][pos];
      if (!rows.length) continue;
      const vals = targets[y][pos];

      /* --- IHLUTA-LEIDIN: studlar fittadir a FYRRI gognum eingongu --- */
      let XtX = null, Xty = null, priorN = 0;
      if (fit === "exp") {
        XtX = Array.from({ length: 5 }, () => new Array(5).fill(0));
        Xty = new Array(5).fill(0);
        for (const py of years) {
          if (py >= y) break;
          const pv = targets[py][pos];
          const pr = obs[py][pos];
          for (let i = 0; i < pr.length; i++) {
            const r = pr[i], t = pv[i];
            for (let a = 0; a < 5; a++) {
              Xty[a] += r.x[a] * t;
              for (let b = 0; b < 5; b++) XtX[a][b] += r.x[a] * r.x[b];
            }
            priorN++;
          }
        }
      }

      let offW = new Float64Array(NT), defW = new Float64Array(NT);
      for (let w = 1; w <= MAXW; w++) {
        /* `exp` endurfittar VID HVERJA VIKU a ollu sem er lidid — fyrri
           timabil PLUS vikur < w. Uppsofnudu XtX/Xty gera thad odyrt og
           tryggja ad enginn leikur i viku >= w komi vid. */
        let beta = null;
        if (fit === "exp" && priorN >= 60) beta = fitLinear(XtX, Xty, cols, priorN);

        const lo = spec.win.back ? Math.max(1, w - spec.win.back) : 1;
        const idxs = [];
        for (let i = 0; i < rows.length; i++) {
          const rw = rows[i].week;
          if (rw >= w) break;                                // rodin er vikurodud
          if (rw >= lo) idxs.push(i);
        }
        if (idxs.length >= 8 && (fit !== "exp" || beta)) {
          const ys = new Float64Array(idxs.length);
          for (let k = 0; k < idxs.length; k++) {
            const r = rows[idxs[k]];
            if (fit === "exp") {
              let v = 0;
              for (let c = 0; c < cols.length; c++) v += beta[c] * r.x[cols[c]];
              ys[k] = v;
            } else ys[k] = vals[idxs[k]];
          }
          let mu = 0;
          for (let k = 0; k < ys.length; k++) mu += ys[k];
          mu /= ys.length;
          const nDef = new Float64Array(NT), nOff = new Float64Array(NT);
          for (const i of idxs) { nDef[rows[i].def]++; nOff[rows[i].off]++; }

          if (!spec.oppAdj) {
            const sDef = new Float64Array(NT);
            for (let k = 0; k < idxs.length; k++) sDef[rows[idxs[k]].def] += ys[k];
            for (let t = 0; t < NT; t++) {
              if (!nDef[t]) continue;
              const adj = (sDef[t] + spec.K * mu) / (nDef[t] + spec.K);
              arr[((w * NT) + t) * 4 + PI[pos]] = mu ? adj / mu : 1;
            }
          } else {
            /* Skiptifitting: y = mu + off + def, badar attir skrepptar
               ad 0 med n/(n+K). Ad skreppa BADAR attir er nauðsynlegt:
               sokn sem hefur spilad tvo leiki ma ekki fa fullan studul
               og faera vorninni hann. */
            const ITER = spec.win.back ? 10 : 5;
            for (let it = 0; it < ITER; it++) {
              const sOff = new Float64Array(NT);
              for (let k = 0; k < idxs.length; k++) {
                const r = rows[idxs[k]];
                sOff[r.off] += ys[k] - mu - defW[r.def];
              }
              for (let t = 0; t < NT; t++) offW[t] = nOff[t] ? sOff[t] / (nOff[t] + spec.K) : 0;
              const sDef = new Float64Array(NT);
              for (let k = 0; k < idxs.length; k++) {
                const r = rows[idxs[k]];
                sDef[r.def] += ys[k] - mu - offW[r.off];
              }
              for (let t = 0; t < NT; t++) defW[t] = nDef[t] ? sDef[t] / (nDef[t] + spec.K) : 0;
            }
            for (let t = 0; t < NT; t++) {
              if (!nDef[t]) continue;
              arr[((w * NT) + t) * 4 + PI[pos]] = mu ? (mu + defW[t]) / mu : 1;
            }
          }
        }
        /* Vika w er NU lidin -> hun ma fara i uppsofnun fyrir w+1.
           THETTA ER LEKAVORNIN OG HUN ER STRUKTURAL: baetist vid EFTIR
           ad tafla vikunnar er skrifud. */
        if (fit === "exp") {
          for (let i = 0; i < rows.length; i++) {
            if (rows[i].week !== w) continue;
            const r = rows[i], t = vals[i];
            for (let a = 0; a < 5; a++) {
              Xty[a] += r.x[a] * t;
              for (let b = 0; b < 5; b++) XtX[a][b] += r.x[a] * r.x[b];
            }
            priorN++;
          }
        }
      }
    }
    out[y] = assertFinite(arr, `ratios[${y}] ${spec.key}`);
  }
  return out;
}

/**
 * ORAKEL 1 — "SAMA VIKA": hvernig vornin spiladi I RAUN thessa viku,
 * deilt med viku-medaltali allra varna gegn theirri stodu. Sama
 * skilgreining og `gap-lab.defDevOf` notar sem "realized".
 *
 * ATH OG THAD ER MIKILVAEGT: THESSI ER SJALF-SMITUD. "Stig sem WR
 * skorudu gegn thessari vorn i thessum leik" er summa WR-anna i lidi
 * LEIKMANNSINS SJALFS, svo hans EIGIN stig eru i teljaranum. Talan
 * maelir thvi ekki "vitneskju um vorn" heldur "vitneskju um utkomu",
 * og hun er BIRT SEM NAEMNIS-AKKERI: hun sannar ad tafla per
 * (vika, lid, stada) innan klemmunnar GETI hreyft maelikvardann
 * mikid, svo bilun matsadferda se estimation og ekki daufur
 * maelikvardi. Hun er EKKI thak fyrir raunhaeft mat.
 */
function oracleWeekRatios(obs, years, NT) {
  const out = {};
  for (const y of years) {
    const arr = new Float64Array((MAXW + 1) * NT * 4).fill(1);
    for (const pos of POSS) {
      const byWeek = new Map();
      for (const r of obs[y][pos]) {
        if (!byWeek.has(r.week)) byWeek.set(r.week, []);
        byWeek.get(r.week).push(r);
      }
      for (const [w, rows] of byWeek) {
        if (w < 1 || w > MAXW) continue;
        const m = mean(rows.map((r) => r.y));
        if (!m) continue;
        for (const r of rows) arr[((w * NT) + r.def) * 4 + PI[pos]] = r.y / m;
      }
    }
    out[y] = assertFinite(arr, `oracleWeek[${y}]`);
  }
  return out;
}

/**
 * ORAKEL 2 — "TIMABILS-STYRKUR AN THESSA LEIKS" (jackknife). Fyrir
 * viku w er varnartalan reiknud ur OLLUM odrum vikum timabilsins,
 * fyrri OG seinni, en leikur vikunnar sjalfrar er TEKINN UT.
 *
 * THETTA ER ThAKID SEM SVARAR SPURNINGUNNI. Hun er lek fram i timann
 * (og thvi ekki frambjodandi) en hun ber NULL upplysingu um utkomu
 * thessa leiks, svo hun er "fullkomin vitneskja um styrk varnarinnar"
 * og ekkert annad. Skreppingin er 0: fullkomin vitneskja skreppur ekki.
 *
 * BEINN SAMANBURDUR VID `defense.json` ER ThAD SEM GERIR HANA
 * LAESILEGA: defense.json er SAMA tala nema hun hefur leikinn INNI.
 * Munurinn a theim tveimur er thvi nakvaemlega ad maela hve mikid af
 * 5,831% er sjalf-smit.
 */
/**
 * Og TVAER SYSTUR HENNAR, sem gera hana LAESILEGA:
 *   K=0,  jackknife  -> fullkomin vitneskja um styrk, thetta ThAKID
 *   K=6,  jackknife  -> SAMA FORMULA og `defense.json` en an leiksins
 *   K=6,  allt inni  -> endurgerd `defense.json` ur MINUM gognum
 * Munurinn a tveimur sidustu er NAKVAEMLEGA sjalf-smitid i 5,831% —
 * eina breytingin er hvort leikur vikunnar er i summunni.
 */
function seasonRatios(obs, years, NT, K, jackknife) {
  const out = {};
  for (const y of years) {
    const arr = new Float64Array((MAXW + 1) * NT * 4).fill(1);
    for (const pos of POSS) {
      const rows = obs[y][pos];
      if (!rows.length) continue;
      const totAll = rows.reduce((a, r) => a + r.y, 0), nAll = rows.length;
      const sDefAll = new Float64Array(NT), nDefAll = new Float64Array(NT);
      for (const r of rows) { sDefAll[r.def] += r.y; nDefAll[r.def]++; }
      for (let w = 1; w <= MAXW; w++) {
        let sW = 0, nW = 0;
        const sDefW = new Float64Array(NT), nDefW = new Float64Array(NT);
        if (jackknife) {
          for (const r of rows) {
            if (r.week !== w) continue;
            sW += r.y; nW++; sDefW[r.def] += r.y; nDefW[r.def]++;
          }
        }
        const nEx = nAll - nW;
        if (nEx < 8) continue;
        const mu = (totAll - sW) / nEx;
        if (!mu) continue;
        for (let t = 0; t < NT; t++) {
          const n = nDefAll[t] - nDefW[t];
          if (n < 1) continue;
          const s = sDefAll[t] - sDefW[t];
          arr[((w * NT) + t) * 4 + PI[pos]] = (s + K * mu) / (n + K) / mu;
        }
      }
    }
    out[y] = assertFinite(arr, `season[K${K}${jackknife ? ",jk" : ""}][${y}]`);
  }
  return out;
}

/** `defense.json` sem `ratio`-tafla — TIMABILS-SUMMA, sami leki og i dag. */
function ratiosFromDefenseFile(defFile, years, NT, teamIdx) {
  const out = {};
  for (const y of years) out[y] = new Float64Array((MAXW + 1) * NT * 4).fill(1);
  for (const d of defFile) {
    if (!out[d.season] || PI[d.pos] == null || !teamIdx.has(d.team)) continue;
    if (d.adj == null || !d.leagueMean) continue;
    const t = teamIdx.get(d.team), rr = d.adj / d.leagueMean;
    if (!Number.isFinite(rr)) continue;
    for (let w = 0; w <= MAXW; w++) out[d.season][((w * NT) + t) * 4 + PI[d.pos]] = rr;
  }
  for (const y of years) assertFinite(out[y], `defense.json[${y}]`);
  return out;
}

/** Fost tafla med sama gildi allsstadar — fyrir hlutleysis-akkerin. */
function constantRatios(years, NT, c) {
  const out = {};
  for (const y of years) out[y] = new Float64Array((MAXW + 1) * NT * 4).fill(c);
  return out;
}

/* ============================================================
   5. HOLFID — EIN UPPSTILLING PER AKVORDUN
   ============================================================
   `scopePi` null = adferdin gildir um allar stodur; annars gildir hun
   um EINA stodu og nulltilgatan (defense.json @ 0,20) um hinar. Thannig
   er framlag hverrar stodu maelanlegt an ad blanda thremur odrum.

   RUNNUN A 0,1 STIG ER EKKI SKRAUT. `weeklyProjection` skilar
   `Math.round(pts*10)/10`, og gap-lab maeldi ad jafntefli sem verda til
   vid thad raeda 8 af 3.687 uppstillingum. An hennar mælist 5,317% i
   stad 5,831% og "endurgerdin" er onnur maeling. */
function evalCell(env, ratios, baseRatios, W, scopePi, NT, wantContrib, doClamp = true) {
  const pct = {}, weekTotal = {}, mae = {};
  const contrib = wantContrib ? new Map() : null;
  const scores = [];
  for (const y of env.years) {
    const e = env.per[y];
    let sWeek = 0, sAbs = 0, nAbs = 0;
    const rat = ratios[y], brat = baseRatios[y];
    for (const dec of e.decisions) {
      const ent = dec.entries;
      scores.length = ent.length;
      for (let i = 0; i < ent.length; i++) {
        const p = ent[i];
        let m = 1;
        if (p.oi >= 0) {
          const useNew = scopePi == null || scopePi === p.pi;
          if (useNew) {
            const rr = rat[((dec.week * NT) + p.oi) * 4 + p.pi];
            const raw = 1 + (rr - 1) * W;
            m = doClamp ? clamp(raw, CLAMP_LO, CLAMP_HI) : raw;
          } else {
            /* Hinar stodurnar halda NULLTILGATUNNI a 0,20 — thad er thad
               sem appid gerir i dag, ekki W thessa holfs. */
            const rr = brat[((dec.week * NT) + p.oi) * 4 + p.pi];
            m = clamp(1 + (rr - 1) * W_MAIN, CLAMP_LO, CLAMP_HI);
          }
        }
        const v = Math.round(p.baseGs * m * 10) / 10;
        if (!Number.isFinite(v)) throw new Error(`NON-FINITE score y=${y} w=${dec.week} i=${i}`);
        scores[i] = v;
        sAbs += Math.abs(v - p.act); nAbs++;
      }
      const res = pickLineup(ent, scores, !!contrib);
      sWeek += res.sum;
      if (contrib) {
        for (const id of res.ids) {
          let m = contrib.get(id);
          if (!m) { m = {}; contrib.set(id, m); }
          m[y] = (m[y] || 0) + actOf(ent, id);
        }
      }
    }
    pct[y] = (sWeek - e.sFlat) / e.gap * 100;
    weekTotal[y] = sWeek;
    mae[y] = nAbs ? sAbs / nAbs : null;
  }
  return { pct, weekTotal, mae, contrib };
}
function actOf(entries, id) {
  for (const e of entries) if (e.id === id) return e.act;
  return 0;
}

/* ============================================================
   6. BOOTSTRAP KLASADUR PER LEIKMANN — EXAKT UPPSKIPTING
   ============================================================
   Munurinn milli tveggja adferda er summa yfir akvardanir af (stig
   theirra sem adferdin stillti upp) - (stig theirra sem nulltilgatan
   stillti upp). Thad er NAKVAEMLEGA summa per LEIKMANNI af (hve oft
   hann var stilltur upp i A) minus (i B), sinnum stigin hans. Thvi ma
   klasa-bootstrappa MUNINN sjalfan an ad drafta upp a nytt.

   HVERS VEGNA THETTA ER BETRA EN AD ENDURDRAFTA: vbdbase-lab thurfti
   ad endurdrafta og nefnir sjalft KLONUNAR-kostnadinn (sami leikmadur
   getur komid tvisvar og fengid nytt id). Uppskiptingin er EXAKT og
   hun er profud (`anchors.decompose`).

   HVAD HUN MAELIR OG HVAD EKKI: hun endursynir LEIKMENN og heldur
   HOPUNUM fostum. Vikmorkin eru thvi utkomu-ovissa vid gefna hopa,
   ekki valovissa. Thad er sagt hér svo hun se ekki oflesin. */
function playerBootstrap(contribA, contribB, env, runs, seed) {
  const list = [...new Set([...contribA.keys(), ...contribB.keys()])];
  if (list.length < 20 || runs < 50) return null;
  const ny = env.years.length;
  const net = list.map((id) => {
    const a = contribA.get(id) || {}, b = contribB.get(id) || {};
    return env.years.map((y) => (a[y] || 0) - (b[y] || 0));
  });
  const gaps = env.years.map((y) => env.per[y].gap);
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const outs = [];
  const mult = new Int32Array(list.length);
  for (let b = 0; b < runs; b++) {
    mult.fill(0);
    for (let i = 0; i < list.length; i++) mult[Math.floor(rnd() * list.length)]++;
    const sums = new Float64Array(ny);
    for (let i = 0; i < list.length; i++) {
      const m = mult[i];
      if (!m) continue;
      const row = net[i];
      for (let k = 0; k < ny; k++) sums[k] += m * row[k];
    }
    let acc = 0;
    for (let k = 0; k < ny; k++) acc += sums[k] / gaps[k] * 100;
    outs.push(acc / ny);
  }
  outs.sort((a, b) => a - b);
  const lo = outs[Math.floor(runs * 0.025)], hi = outs[Math.floor(runs * 0.975)];
  let point = 0;
  for (let k = 0; k < ny; k++) {
    let s2 = 0;
    for (const row of net) s2 += row[k];
    point += s2 / gaps[k] * 100;
  }
  return { runs, point: r3(point / ny), lo: r3(lo), hi: r3(hi),
           median: r3(outs[Math.floor(runs / 2)]),
           excludesZero: lo > 0 || hi < 0, clusters: list.length };
}

/* ============================================================
   7. KEYRSLAN
   ============================================================ */
async function main() {
  if (BOOT < 50) die(`--boot=${BOOT} er undir 50 og tha skilar klasa-bootstrappid NULL\n` +
    "  fyrir hvert holf — og `excludesZero` verdur thogult false. Ekki keyra thad.", 2);

  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const sched = JSON.parse(await readFile(path.join(OUT, "schedule_history.json"), "utf8"));
  const defFile = JSON.parse(await readFile(path.join(OUT, "defense.json"), "utf8"));

  /* AKKERI UR TVEIMUR OHADUM SKRAM. `startsit_*.json` ber ppr og
     standard; `measure/gap.json` ber OLL THRJU (thad var gap-lab sem
     maeldi half-sniðið i fyrsta sinn). Ad krefjast beggja thar sem
     baedi eru til er odyrt og thad hefur einu sinni thegar afhjupad
     mun milli tveggja uppstillingar-vela. */
  const ext = {};
  for (const s of ["ppr", "standard"]) {
    try { ext[s] = JSON.parse(await readFile(path.join(OUT, `startsit_${s}.json`), "utf8")); }
    catch { ext[s] = null; }
  }
  let gapFile = null;
  try { gapFile = JSON.parse(await readFile(path.join(MEAS, "gap.json"), "utf8")); } catch { /* */ }

  const { pools, paired, unpaired } = buildPools(feats);
  const allYears = [...new Set(Object.values(pools).flatMap((p) => Object.keys(p))
    .map(Number))].sort((a, b) => a - b).filter((y) => y >= FROM);

  const weeklyBy = {};
  for (const y of allYears) {
    try { weeklyBy[y] = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8")); }
    catch { /* timabil an vikugagna fellur einfaldlega ut */ }
  }
  const years = allYears.filter((y) => weeklyBy[y]);
  requireSeasons(years, "timabil med bædi laug OG vikugognum");

  /* Lid-visir — ur bædi vikugognum og dagskra, svo ekkert lid vanti. */
  const teamSet = new Set();
  for (const y of years) for (const r of weeklyBy[y]) { if (r.team) teamSet.add(r.team); if (r.opp) teamSet.add(r.opp); }
  for (const g of sched.games) { teamSet.add(g.home); teamSet.add(g.away); }
  const teamList = [...teamSet].sort();
  const teamIdx = new Map(teamList.map((t, i) => [t, i]));
  const NT = teamList.length;

  console.log(`defweek-lab · timabil ${years.join(", ")} · ${NT} lid` + (QUICK ? "  [QUICK — SKRIFAR EKKI]" : ""));
  console.log(`porun ppr<->standard fyrir half: ${paired} por, ${unpaired} oporud`);

  const FORMATS = QUICK ? ["ppr"] : ["ppr", "half", "standard"];
  const envs = {}, obsOwn = {};
  for (const fmt of FORMATS) {
    envs[fmt] = buildEnv(fmt, pools, sched, teamIdx, weeklyBy);
    requireSeasons(envs[fmt].years, `timabil med vikugognum OG linum (${fmt})`);
    obsOwn[fmt] = buildObs(weeklyBy, envs[fmt].years, teamIdx,
      fmt === "ppr" ? "ppr" : fmt === "half" ? "half" : "std");
    const e = envs[fmt];
    console.log(`  ${fmt.padEnd(9)} ${e.years.length} timabil · ` +
      `${e.years.reduce((a, y) => a + e.per[y].n, 0)} uppstillingar`);
  }
  /* PPR-athuganirnar eru byggdar SJALFSTAETT, ekki teknar ur
     `obsOwn.ppr` — thaer verda ad vera til thott ppr-snidid se ekki
     keyrt, thvi `defense.json` er PPR-tafla i OLLUM snidum og
     endurgerdar-akkerid tharf hana. */
  const obsPPR = buildObs(weeklyBy, envs[FORMATS[0]].years, teamIdx, "ppr");
  const obsFor = (fmt, src) => (src === "ppr" ? obsPPR : obsOwn[fmt]);
  const obsBy = obsOwn;                       // eldri heiti, notad i akkerunum

  /* ---------- NULLTILGATAN ---------- */
  const anchors = { fail: [] };
  const incum = {}, incumWF = {};
  for (const fmt of FORMATS) {
    const env = envs[fmt];
    const rf = ratiosFromDefenseFile(defFile, env.years, NT, teamIdx);
    const cell = evalCell(env, rf, rf, W_MAIN, null, NT, true);
    incum[fmt] = { ratios: rf, cell, stat: statOf(env.years.map((y) => cell.pct[y])) };
  }

  /* ============================================================
     AKKERIN — SKRIFTAN DEYR FREMUR EN AD SKRIFA
     ============================================================ */

  /* (a) t-TAFLAN. Sù villa sem var hér skekkti `df` um eitt. */
  {
    const want = { 2: 12.706, 5: 2.776, 7: 2.447, 11: 2.228 };
    const bad = Object.entries(want).filter(([n, v]) => tCritFor(Number(n)) !== v)
      .map(([n, v]) => `n=${n}: ${tCritFor(Number(n))} vs ${v}`);
    anchors.tCritTable = { checked: Object.keys(want).length, mismatches: bad };
    if (bad.length) anchors.fail.push(`tCritTable: ${bad.join(", ")}`);
  }

  /* (b) ENDURGERD ALLRA THRIGGJA SNIDA. Talan sem er verid ad sla
         verdur ad koma UT UR THESSARI SKRIFTU, annars er hun ekki
         sami maelikvardi. THEKJA ER FULLYRDING, EKKI LOGGA: skran
         verdur ad hafa akkeri fyrir hvert snid sem er keyrt, og hvert
         akkeri ad hafa borid saman minnst 7 timabil. */
  const EXPECT = { ppr: 5.831, half: 3.199, standard: 2.967 };
  anchors.reproduce = {};
  for (const fmt of FORMATS) {
    const env = envs[fmt];
    const got = {};
    for (const y of env.years) {
      const e = env.per[y];
      got[y] = { lineups: e.n, floor: r1(e.sFloor / e.n), flat: r1(e.sFlat / e.n),
                 ceiling: r1(e.sCeil / e.n),
                 weekly: r1(incum[fmt].cell.weekTotal[y] / e.n),
                 gapPerLineup: r1(e.gap / e.n),
                 pctOfGapClosed: r3(incum[fmt].cell.pct[y]) };
    }
    const st = incum[fmt].stat;
    const sources = [];
    if (ext[fmt]) sources.push({ name: `startsit_${fmt}.json`, perSeason: ext[fmt].perSeason,
                                 total: (ext[fmt].totals || {}).pctOfGapClosed,
                                 t: (ext[fmt].totals || {}).t });
    if (gapFile && gapFile.anchors && gapFile.anchors[fmt]) {
      sources.push({ name: `measure/gap.json:anchors.${fmt}`,
                     perSeason: gapFile.anchors[fmt].perSeason,
                     total: gapFile.anchors[fmt].pctOfGapClosed, t: null });
    }
    const diffs = [];
    let compared = 0;
    for (const src of sources) {
      for (const y of env.years) {
        const w = src.perSeason ? src.perSeason[String(y)] : null;
        if (!w) { diffs.push(`${src.name} ${y}: rod vantar`); continue; }
        for (const k of ["lineups", "flat", "weekly", "ceiling", "gapPerLineup", "pctOfGapClosed"]) {
          if (w[k] == null) continue;                 // gap.json ber ekki `floor`
          if (got[y][k] == null) { diffs.push(`${src.name} ${y}.${k}: defweek skilar null`); continue; }
          if (Math.abs(w[k] - got[y][k]) > 0.011) {
            diffs.push(`${src.name} ${y}.${k}: ${w[k]} vs ${got[y][k]}`);
          }
          compared++;
        }
      }
      if (src.total != null && Math.abs(src.total - st.mean) > 0.011) {
        diffs.push(`${src.name} total: ${src.total} vs ${r3(st.mean)}`);
      }
      if (src.t != null && Math.abs(src.t - st.t) > 0.011) {
        diffs.push(`${src.name} t: ${src.t} vs ${r3(st.t)}`);
      }
    }
    /* Og TALAN SJALF ur beidninni, harðkodud — svo akkerid geti ekki
       ordid graent af thvi ad BADAR ytri skrar seu horfnar. */
    if (Math.abs(EXPECT[fmt] - st.mean) > 0.011) {
      diffs.push(`hardcoded target ${EXPECT[fmt]} vs ${r3(st.mean)}`);
    }
    anchors.reproduce[fmt] = { target: EXPECT[fmt], got: r3(st.mean), t: r3(st.t),
      years: st.years, positive: st.positive,
      sources: sources.map((s) => s.name), fieldsCompared: compared, mismatches: diffs,
      perSeason: got };
    if (diffs.length) anchors.fail.push(`reproduce/${fmt}: ${diffs.slice(0, 4).join(" | ")}`);
    if (st.years < 7) anchors.fail.push(`reproduce/${fmt}: adeins ${st.years} timabil (tharf 7)`);
    if (compared < 30) anchors.fail.push(`reproduce/${fmt}: adeins ${compared} svid borin saman`);
    if (!sources.length) anchors.fail.push(`reproduce/${fmt}: ENGIN ytri heimild fannst`);
  }
  {
    const missing = FORMATS.filter((f) => !anchors.reproduce[f]);
    anchors.reproduceCoverage = { formatsRun: FORMATS.length, anchored: FORMATS.length - missing.length };
    if (missing.length) anchors.fail.push(`reproduceCoverage: ${missing.join(",")} an akkeris`);
  }

  /* (c) ORAKEL LOKAR 100% — maelitaekid GETUR seð merki. */
  {
    let ok = true;
    for (const fmt of FORMATS) for (const y of envs[fmt].years) {
      const e = envs[fmt].per[y];
      if (Math.abs((e.sCeil - e.sFlat) / e.gap * 100 - 100) > 1e-9) ok = false;
    }
    anchors.oracleClosesGap = ok;
    if (!ok) anchors.fail.push("oracleClosesGap: fullkomin vitneskja lokar ekki 100%");
  }

  /* (d) `defenseMult` og klemman eru ORDRETT eins og i `src/model.js`. */
  {
    const bad = [];
    for (const rr of [0.5, 0.8, 0.95, 1, 1.05, 1.3, 2]) {
      const a = defenseMult(rr * 10, 10);
      const b = clamp(1 + (rr - 1) * W_MAIN, CLAMP_LO, CLAMP_HI);
      if (Math.abs(a - b) > 1e-12) bad.push(`${rr}: ${a} vs ${b}`);
    }
    anchors.defMult = { mismatches: bad, clamp: [CLAMP_LO, CLAMP_HI] };
    if (bad.length) anchors.fail.push(`defMult: ${bad.join(", ")}`);
  }

  const fmt0 = FORMATS[0], env0 = envs[fmt0];
  const specOf = (key, value, win, oppAdj, K, targets) => ({
    key, value, win, oppAdj, K, targets,
    fit: value === "exp" || value === "expv" || value === "placeboExp" ? "exp" : null,
    cols: COLS[value === "placeboExp" ? "exp" : value] || null,
  });
  const rawTargets = {};                     // "fmt|src" -> markgildi
  for (const fmt of FORMATS) for (const src of new Set([...SRCS(fmt), "ppr"])) {
    /* "ppr" er ALLTAF byggt, lika fyrir ppr-snidid thar sem asinn er
       degenerate — `incumbentWF` og endurgerdar-akkerid tharfnast thess
       thvi `defense.json` er PPR-tafla i ollum snidum. */
    rawTargets[`${fmt}|${src}`] = targetsFor(obsFor(fmt, src), envs[fmt].years, "real", 0);
  }
  const rawT = (fmt, src = "own") => rawTargets[`${fmt}|${src}`];

  /* (e) LEKAVORDURINN, MED RETTUM UMFANGI. Tafla vikunnar w innan
         timabils Y verdur ad vera OHOGGUD thott ollum vikum >= CUT i
         Y se skipt ut fyrir rugl.

         FYRSTA UTGAFA THESSA PROFS EITRADI OLL AR OG FELL. Hun var
         ROMG, ekki kodinn: `exp` safnar upp FYRRI TIMABILUM, sem er
         fortid og thvi leyfileg, svo eitrun a viku 12 arid 2019 A ad
         hreyfa toflu viku 3 arid 2023. Prof sem bannar leyfilega
         upplysingu maelir ekki leka heldur bannar minni. */
  {
    const CUT = 9, Y = env0.years[env0.years.length - 1];
    const spec = specOf("leak", "exp", WINDOWS[0], true, 6, rawT(fmt0));
    const good = buildRatios(obsBy[fmt0], env0.years, NT, spec);
    const poisoned = {};
    for (const y of env0.years) {
      poisoned[y] = {};
      for (const p of POSS) {
        poisoned[y][p] = obsBy[fmt0][y][p].map((r) => (y === Y && r.week >= CUT
          ? { ...r, y: 999, x: [1, 999, 999, 999, 999] } : r));
      }
    }
    const pt = targetsFor(poisoned, env0.years, "real", 0);
    const dirty = buildRatios(poisoned, env0.years, NT, { ...spec, targets: pt });
    let before = 0, after = 0;
    for (let w = 1; w <= CUT; w++) for (let t = 0; t < NT; t++) for (let p = 0; p < 4; p++) {
      const i = ((w * NT) + t) * 4 + p;
      before = Math.max(before, Math.abs(good[Y][i] - dirty[Y][i]));
    }
    for (let w = CUT + 1; w <= MAXW; w++) for (let t = 0; t < NT; t++) for (let p = 0; p < 4; p++) {
      const i = ((w * NT) + t) * 4 + p;
      after = Math.max(after, Math.abs(good[Y][i] - dirty[Y][i]));
    }
    anchors.noLeak = { season: Y, cutWeek: CUT, maxDiffBeforeCut: before, maxDiffAfterCut: r3(after),
      scope: "poison only season Y weeks >= CUT; prior seasons are the past and may legally inform week 1" };
    if (before > 1e-12) anchors.fail.push(`noLeak: vika < ${CUT} i ${Y} breyttist um ${before}`);
    /* OG HITT PROFID: eftir skurdinn VERDUR taflan ad breytast, annars
       vaeri "enginn leki" satt um toflu sem les ekkert. */
    if (after < 1e-6) anchors.fail.push("noLeak: taflan breyttist EKKI eftir skurdinn — hun les ekkert");
  }

  /* (f) W=0 ER NAKVAEMLEGA HLUTLAUST — og thad er PROFAD GEGN
         SJALFSTAEDRI TOLU, ekki gegn sjalfu ser. `sGsOnly` er reiknad
         i `buildEnv` ur `baseGs` einum, an nokkurrar varnar-toflu. */
  {
    const a = buildRatios(obsBy[fmt0], env0.years, NT,
      specOf("z1", "raw", WINDOWS[0], false, 6, rawT(fmt0)));
    const b = buildRatios(obsBy[fmt0], env0.years, NT,
      specOf("z2", "expv", WINDOWS[2], true, 24, rawT(fmt0)));
    const ca = evalCell(env0, a, incum[fmt0].ratios, 0, null, NT, false);
    const cb = evalCell(env0, b, incum[fmt0].ratios, 0, null, NT, false);
    let worst = 0, vsGs = 0;
    for (const y of env0.years) {
      worst = Math.max(worst, Math.abs(ca.pct[y] - cb.pct[y]));
      vsGs = Math.max(vsGs, Math.abs(ca.weekTotal[y] - env0.per[y].sGsOnly));
    }
    anchors.zeroWeight = { maxAbsDiffBetweenVariants: worst, maxAbsDiffVsGameScriptOnly: vsGs,
      gameScriptOnlyPct: r3(mean(env0.years.map((y) =>
        (env0.per[y].sGsOnly - env0.per[y].sFlat) / env0.per[y].gap * 100))) };
    if (worst !== 0) anchors.fail.push(`zeroWeight: ${worst} (W=0 verdur ad vera eins i ollum afbrigdum)`);
    if (vsGs !== 0) anchors.fail.push(`zeroWeight: W=0 er ekki sama tala og gameScript einn (${vsGs})`);
  }

  /* (g) KLASA-BOOTSTRAPPID A NULL-MUN VERDUR AD GEFA NAKVAEMLEGA
         [0, 0]. Thad er plumbing-profid, og thad er EKKI jafna vid
         sjalft sig: framlogin koma ur TVEIMUR OHADUM ratio-toflum
         (raw·season·K6 og expv·roll3·K24) sem eru sannanlega olikar —
         (f) synir ad tolurnar i theim eru adrar — og verda samt ad
         gefa sama lid vid W=0. */
  {
    const a = evalCell(env0, buildRatios(obsBy[fmt0], env0.years, NT,
      specOf("b1", "raw", WINDOWS[0], false, 6, rawT(fmt0))), incum[fmt0].ratios, 0, null, NT, true);
    const b = evalCell(env0, buildRatios(obsBy[fmt0], env0.years, NT,
      specOf("b2", "expv", WINDOWS[2], true, 24, rawT(fmt0))), incum[fmt0].ratios, 0, null, NT, true);
    const pb = playerBootstrap(a.contrib, b.contrib, env0, Math.max(50, Math.min(BOOT, 120)), 7);
    anchors.zeroWeightBootstrapZero = { lo: pb ? pb.lo : null, hi: pb ? pb.hi : null,
      point: pb ? pb.point : null, clusters: pb ? pb.clusters : null };
    if (!pb) anchors.fail.push("zeroWeightBootstrapZero: bootstrap skilaði null — plumbing oprofud");
    else if (pb.lo !== 0 || pb.hi !== 0 || pb.point !== 0) {
      anchors.fail.push(`zeroWeightBootstrapZero: [${pb.lo}, ${pb.hi}] point ${pb.point} (verdur [0,0])`);
    }
  }

  /* (h1) RUNNUNAR-JAFNTEFLIN — NULLDREIFING SEM BER ENGA UPPLYSINGU,
          OG HUN VAR ALDREI I NEINU AF THESSUM SKRIFTUM.

          Fyrsta utgafa thessa kafla var AKKERI: "fost varnartafla ma
          ekki breyta rod, svo hun VERDUR ad gefa sama svar og W=0."
          Thad fell — a 2,07 prosentustigum. Invariantid var RANGT hja
          mér, ekki kodinn: `weeklyProjection` RUNNAR a 0,1 stig, og
          runnun er ekki einhalla a JAFNTEFLUM. Tveir menn a 5,04 og
          5,05 eru 5,0 og 5,1 obreyttir en BADIR 5,2 eftir x1,03 — svo
          fost umskolun bædi slitur og skapar jafntefli, og jafntefli
          eru brotin eftir HOP-ROD sem hefur ekkert med stig ad gera.

          Thess vegna er thetta ekki akkeri heldur MAELING: fost tafla
          ber NULL upplysingu per skilgreiningu (allir fa sama
          margfaldara), svo allt sem hun haggar er runnunar-hávaði.
          Talan er GOLFID undir hverjum samanburdi i thessari skra —
          og hun er astaeda til ad lesa plasebo-thakid, ekki nullid,
          sem throskuld. Krafan hér er ad hun se EKKI NULL: null myndi
          thyda ad mælingin sjai ekki jafnteflin sem gap-lab maeldi. */
  const tieNull = {};
  {
    const CONSTS = [0.85, 0.90, 0.95, 1.05, 1.10, 1.15, 1.20, 1.30];
    for (const fmt of FORMATS) {
      const env = envs[fmt];
      const z = r3(mean(env.years.map((y) =>
        (env.per[y].sGsOnly - env.per[y].sFlat) / env.per[y].gap * 100)));
      const grid = CONSTS.map((c) => {
        const cell = evalCell(env, constantRatios(env.years, NT, c), incum[fmt].ratios,
          W_MAIN, null, NT, false);
        const st = statOf(env.years.map((y) => cell.pct[y]));
        return { c, pct: r3(st.mean), t: r3(st.t), dev: r3(st.mean - z) };
      });
      let noOpp = 0, tot = 0;
      for (const y of env.years) for (const d of env.per[y].decisions) {
        for (const e of d.entries) { tot++; if (e.oi < 0) noOpp++; }
      }
      tieNull[fmt] = { zeroWeightPct: z, grid,
        band: [Math.min(...grid.map((g) => g.pct)), Math.max(...grid.map((g) => g.pct))],
        maxAbsDeviation: r3(Math.max(...grid.map((g) => Math.abs(g.dev)))),
        maxPositiveDeviation: r3(Math.max(0, ...grid.map((g) => g.dev))),
        entriesWithoutOpponent: noOpp, entries: tot,
        note: "a CONSTANT defence multiplier carries zero information by construction; every " +
          "point of movement here is 0.1-rounding tie reshuffle, broken by roster order" };
    }
    const live = FORMATS.every((f) => tieNull[f].maxAbsDeviation > 0);
    anchors.roundingTieNullIsLive = { perFormat: Object.fromEntries(FORMATS.map((f) =>
      [f, tieNull[f].maxAbsDeviation])), live };
    if (!live) anchors.fail.push("roundingTieNullIsLive: fost tafla haggar EKKERT — " +
      "maelingin sér ekki jafnteflin sem gap-lab maeldi (8/3687)");
  }

  /* (h) NAN-VORDURINN, STOKKBREYTINGARPROFADUR. NaN er FALSY i JS og
         thad er nakvaemlega thess vegna ad thessi vordur ma ekki bara
         vera skrifadur — hann verdur ad vera SANNADUR ad geta fellt. */
  {
    const t = { caughtInTable: false, caughtInScore: false, caughtInLineup: false };
    try { assertFinite(new Float64Array([1, NaN, 1]), "mutant"); } catch { t.caughtInTable = true; }
    const c = constantRatios(env0.years, NT, 1);
    c[env0.years[0]][((1 * NT) + 0) * 4 + 0] = NaN;
    try { evalCell(env0, c, incum[fmt0].ratios, W_MAIN, null, NT, false); }
    catch { t.caughtInScore = true; }
    try { pickLineup([{ pi: 0, act: 1, id: "x" }], [NaN], false); } catch { t.caughtInLineup = true; }
    anchors.nanGuard = t;
    for (const [k, v] of Object.entries(t)) if (!v) anchors.fail.push(`nanGuard: ${k} slapp i gegn`);
  }

  /* (i) SKIPTIFITTINGIN ER SAMRUNNIN. Hlyr upphafspunktur + 5 itranir
         a moti 400 itrunum fra grunni. Talan er BIRT, thvi throskuldur
         sem situr ofan a maeldu tolunni ver ekkert. */
  {
    const y = env0.years[env0.years.length - 1];
    const warm = buildRatios(obsBy[fmt0], [y], NT,
      specOf("warm", "raw", WINDOWS[0], true, 6, rawT(fmt0)));
    const cold = coldFit(obsBy[fmt0], y, NT, 6, 400);
    let worst = 0;
    for (const p of POSS) for (let t = 0; t < NT; t++) {
      const i = ((MAXW * NT) + t) * 4 + PI[p];
      if (!Number.isFinite(cold[i])) continue;
      worst = Math.max(worst, Math.abs(warm[y][i] - cold[i]));
    }
    const TOL = 0.002;
    anchors.converged = { maxAbsRatioDiff: r3(worst), tolerance: TOL,
      iterationsWarm: 5, iterationsCold: 400,
      headroom: r3(worst > 0 ? TOL / worst : null) };
    if (worst > TOL) anchors.fail.push(`converged: hlyr fitting skeikar ${r3(worst)} (thak ${TOL})`);
  }

  if (anchors.fail.length) {
    console.error("\n  AKKERI FELLU — SKRIFA EKKERT:");
    for (const f of anchors.fail) console.error(`   · ${f}`);
    console.error("\n  Maeling sem stendst ekki sin eigin akkeri er ekki maeling.\n");
    process.exit(3);
  }
  console.log(`akkeri: ${Object.keys(anchors).filter((k) => k !== "fail").length} — oll graen\n`);

  /* ============================================================
     8. NETID
     ============================================================
     HVERS VEGNA VOG-SVEIPURINN ER ADEINS A EINUM FULLTRUA UR HVERRI
     FJOLSKYLDU: grid-utbreidsla er sjalf haetta (README 4a: Bonferroni-
     krafan hefdi verid |t| > 5,43 og hefdi thvi maelt EKKERT). Kjarna-
     netid er 72 afbrigdi a maeldu voginni 0,20; vogin sjalf er sveipud
     a season-glugga vid K=6. */
  const coreFor = (fmt) => {
    const out = [];
    for (const src of SRCS(fmt)) for (const v of VALUES) for (const oa of [false, true]) {
      for (const win of WINDOWS) for (const K of KS) {
        const key = `${v}${oa ? "+oppAdj" : ""}·${win.key}·K${K}${srcTag(src)}`;
        out.push({ kind: "core", value: v, win, oppAdj: oa, K, src, key, noise: null,
          weights: win.key === "season" && K === 6 ? W_GRID.slice() : [W_MAIN] });
      }
    }
    return out;
  };
  const placeboFor = (fmt) => {
    const out = [];
    for (const src of SRCS(fmt)) for (const p2 of ["placebo", "placeboExp"]) for (const s of SEEDS) {
      for (const oa of [false, true]) for (const win of WINDOWS) for (const K of KS) {
        const key = `${p2}${s}${oa ? "+oppAdj" : ""}·${win.key}·K${K}${srcTag(src)}`;
        out.push({ kind: "placebo", value: p2, win, oppAdj: oa, K, src, key, noise: s, seed: s,
          weights: win.key === "season" && K === 6 ? W_GRID.slice() : [W_MAIN] });
      }
    }
    return out;
  };
  /* ORAKELIN — ThOK, ekki frambjodendur. Baedi med klemmu og an, thvi
     klemman er sjalf omæld og hun BINDUR thakid.
       oracleSeason  timabils-styrkur AN thessa leiks — ThAD ER ThAKID
       oracleWeek    somu viku, SJALF-SMITUD — naemnis-akkeri eingongu */
  const ORACLE = [];
  for (const o of [
    { v: "oracleSeason", K: 0, cont: false },      // fullkomin styrk-vitneskja — ThAKID
    { v: "oracleSeasonK6", K: 6, cont: false },    // SAMA formula og defense.json, an leiksins
    { v: "leakySeasonK6", K: 6, cont: true },      // endurgerd defense.json, med leiknum inni
    { v: "oracleWeek", K: 0, cont: true },         // somu viku, SJALF-SMITAD
  ]) for (const dc of [true, false]) {
    ORACLE.push({ kind: "oracle", value: o.v, win: WINDOWS[0], oppAdj: false, K: o.K,
      key: `${o.v}${dc ? "" : "·noClamp"}`, noise: null, doClamp: dc, contaminated: o.cont,
      weights: [0.10, 0.20, 0.50, 1.00] });
  }
  const nCells = (arr) => arr.reduce((a, v) => a + v.weights.length, 0) * SCOPES.length;
  for (const fmt of FORMATS) {
    console.log(`net ${fmt.padEnd(9)} ${coreFor(fmt).length} adferdir (${nCells(coreFor(fmt))} holf) · ` +
      `${placeboFor(fmt).length} plasebo (${nCells(placeboFor(fmt))}) · ` +
      `${ORACLE.length} orakel (${nCells(ORACLE)})  [src: ${SRCS(fmt).join(",")}]`);
  }

  const results = {}, placeboRows = [], oracleRows = [];
  const t0 = Date.now();

  /* ORAKELIN LESA PPR-ATHUGANIR ThAR SEM ThAU EIGA AD SPEGLA
     `defense.json` (`leakySeasonK6`, `oracleSeasonK6`) og EIGIN STIG
     ThAR SEM ThAU EIGA AD VERA ThAK (`oracleSeason`, `oracleWeek`) —
     thakid a ad vera thad besta sem er haegt, og thad er stig
     deildarinnar sjalfrar. */
  const buildFor = (fmt, variant) => {
    const O = obsFor(fmt, variant.src || "own");
    if (variant.value === "oracleSeason") return seasonRatios(obsOwn[fmt], envs[fmt].years, NT, 0, true);
    if (variant.value === "oracleWeek") return oracleWeekRatios(obsOwn[fmt], envs[fmt].years, NT);
    if (variant.value === "oracleSeasonK6") return seasonRatios(obsPPR, envs[fmt].years, NT, 6, true);
    if (variant.value === "leakySeasonK6") return seasonRatios(obsPPR, envs[fmt].years, NT, 6, false);
    const targets = variant.noise == null ? rawT(fmt, variant.src)
      : targetsFor(O, envs[fmt].years, "noise", variant.noise);
    return buildRatios(O, envs[fmt].years, NT,
      specOf(variant.key, variant.value, variant.win, variant.oppAdj, variant.K, targets));
  };

  for (const fmt of FORMATS) {
    const env = envs[fmt], base = incum[fmt].ratios;

    /* Nulllina numer tvo: SAMA formula, walk-forward — og "sama
       formula" thydir LIKA sami stiga-grunnur, thad er PPR, thvi thad
       er thad sem `defense.json` er. */
    const wfRat = buildRatios(obsPPR, env.years, NT,
      specOf("incumbentWF", "raw", WINDOWS[0], false, 6, rawT(fmt, "ppr")));
    const wfCell = evalCell(env, wfRat, base, W_MAIN, null, NT, true);
    incumWF[fmt] = { stat: statOf(env.years.map((y) => wfCell.pct[y])), cell: wfCell };

    for (const arr of [coreFor(fmt), placeboFor(fmt), ORACLE]) {
      for (const variant of arr) {
        const rat = buildFor(fmt, variant);
        for (const W of variant.weights) {
          for (const scope of SCOPES) {
            const cell = evalCell(env, rat, base, W, scope.pos ? PI[scope.pos] : null,
              NT, false, variant.doClamp !== false);
            const pctv = env.years.map((y) => cell.pct[y]);
            const st = statOf(pctv);
            const dPct = env.years.map((y) => cell.pct[y] - incum[fmt].cell.pct[y]);
            const dWF = env.years.map((y) => cell.pct[y] - incumWF[fmt].cell.pct[y]);
            const dSt = statOf(dPct);
            const row = {
              method: variant.key, value: variant.value, window: variant.win.key,
              oppAdj: variant.oppAdj, K: variant.K, src: variant.src || null,
              defWeight: W, scope: scope.key, format: fmt,
              clamped: variant.doClamp !== false,
              pctOfGapClosed: r3(st.mean), t: r3(st.t), years: st.years, positive: st.positive,
              deltaVsIncumbent: r3(dSt.mean), deltaT: r3(dSt.t), deltaPositive: dSt.positive,
              deltaVsIncumbentWF: r3(mean(dWF)),
              mae: r3(mean(env.years.map((y) => cell.mae[y]))),
              perSeason: Object.fromEntries(env.years.map((y) => [y, r3(cell.pct[y])])),
            };
            if (variant.kind === "placebo") { row.seed = variant.seed; placeboRows.push(row); continue; }
            if (variant.kind === "oracle") {
              row.contaminated = !!variant.contaminated; oracleRows.push(row); continue;
            }
            const perA = {}, perB = {};
            for (const y of env.years) { perA[y] = cell.pct[y]; perB[y] = incum[fmt].cell.pct[y]; }
            const cs = bootstrapDiff(perA, perB, 2000, 4242);
            row.ciSeason = cs ? { lo: r3(cs.lo), hi: r3(cs.hi), excludesZero: cs.excludesZero } : null;
            results[`${fmt}|${scope.key}|${variant.key}|W${W}`] = row;
          }
        }
      }
      process.stdout.write(".");
    }
    /* Skiptigildi fyrir framlagsprofid: uppskiptingin verdur ad gefa
       SOMU tolu og munurinn a holfunum. */
    if (fmt === fmt0) {
      const rat = buildRatios(obsBy[fmt], env.years, NT,
        specOf("dec", "raw", WINDOWS[0], true, 6, rawT(fmt)));
      const cell = evalCell(env, rat, base, 0.5, null, NT, true);
      let worst = 0;
      for (const y of env.years) {
        const ids = new Set([...cell.contrib.keys(), ...incum[fmt].cell.contrib.keys()]);
        let s = 0;
        for (const id of ids) {
          s += ((cell.contrib.get(id) || {})[y] || 0) - ((incum[fmt].cell.contrib.get(id) || {})[y] || 0);
        }
        worst = Math.max(worst, Math.abs(s / env.per[y].gap * 100 -
          (cell.pct[y] - incum[fmt].cell.pct[y])));
      }
      anchors.decompose = { maxAbsDiff: worst };
      if (worst > 1e-9) die(`AKKERI FELL — uppskipting framlaga skeikar ${worst}`);
    }
    /* AKKERI: ENDURGERD `defense.json` UR OHADRI HEIMILD. `leakySeasonK6`
       byggir somu formulu (timabils-summa, K=6, allar vikur inni) ur
       `data/weekly/*.json`, en nulltilgatan les `data/defense.json` sem
       `fetch-nfl.mjs` skrifadi ur SINNI heimild. Stemmi thaer er tvennt
       sannad i einu: formulan er rett skilin, OG uppskipting minsins i
       "med leiknum" / "an leiksins" er gild — thvi hun hvilir a thvi ad
       "med leiknum" SE nulltilgatan. Skeiki thaer er attributionin
       (1,7 pp sjalf-smit) osonnud og ma ekki birtast. */
    {
      const r = oracleRows.find((q) => q.format === fmt && q.value === "leakySeasonK6" &&
        q.scope === "all" && q.clamped === true && q.defWeight === W_MAIN);
      const TOL = 0.25;
      const d = r ? Math.abs(r.pctOfGapClosed - r3(incum[fmt].stat.mean)) : null;
      /* OG HITT: TOLURNAR VERDA AD VERA OLIKAR. Ad tvaer leidir gefi
         SOMU akvordunartolu upp a thridja aukastaf er sterk vísbending
         — en hun er ekki vísbending um neitt ef leidin hrundi saman og
         bædi les i raun `defense.json`. `defense.json` er RUNNAD A TVO
         AUKASTAFI, svo hlutfollin verda ad skeika um ~1e-4 en ekki 0.
         Ef thau eru bitwise eins er kodaleidin brotin og "endurgerd"
         er tautologia. */
      let ratioDiff = 0, identical = 0, cmp = 0;
      {
        const mine = seasonRatios(obsPPR, envs[fmt].years, NT, 6, false);
        /* VIKUR 1..18 EINGONGU. Vika 0 er ekki vika: `defense.json`
           fyllir hana (timabils-summan gildir "alltaf") en `seasonRatios`
           byrjar a 1, svo hun bar mismun 0,455 sem ENGIN akvordun les —
           fyrsta utgafa thessa akkeris fell a honum. Rangt umfang i
           samanburdi er sama villan og rangt umfang i eitruninni. */
        for (const y of envs[fmt].years) {
          const a = mine[y], b = incum[fmt].ratios[y];
          for (let w = 1; w <= MAXW; w++) for (let t = 0; t < NT; t++) for (let p = 0; p < 4; p++) {
            const i = ((w * NT) + t) * 4 + p;
            if (a[i] === 1 && b[i] === 1) continue;         // ospiladar reitir
            cmp++;
            if (a[i] === b[i]) identical++;
            ratioDiff = Math.max(ratioDiff, Math.abs(a[i] - b[i]));
          }
        }
      }
      anchors.reconstructsDefenseFile = anchors.reconstructsDefenseFile || {};
      anchors.reconstructsDefenseFile[fmt] = { fromWeeklyData: r ? r.pctOfGapClosed : null,
        fromDefenseJson: r3(incum[fmt].stat.mean), absDiff: r3(d), tolerance: TOL,
        headroom: d ? r3(TOL / d) : "exact",
        ratioCellsCompared: cmp, bitwiseIdenticalRatios: identical,
        maxAbsRatioDiff: ratioDiff, ratioTolerance: 0.005,
        ratioToleranceHeadroom: ratioDiff ? r3(0.005 / ratioDiff) : null,
        note: "two independent computations of the same formula. The DECISION metric agrees to " +
          "three decimals while the underlying ratios differ by ~1e-4 (defense.json is rounded " +
          "to two decimals), which is what proves the agreement is convergence and not a " +
          "collapsed code path." };
      if (r == null) die(`AKKERI FELL — leakySeasonK6 holf vantar fyrir ${fmt}`);
      if (d > TOL) die(`AKKERI FELL — endurgerd defense.json ur vikugognum skeikar ${r3(d)} pp ` +
        `(${r.pctOfGapClosed} vs ${r3(incum[fmt].stat.mean)}) i ${fmt}; sjalf-smit-uppskiptingin ` +
        "hvilir a thvi ad thaer stemmi og ma ekki birtast");
      if (!cmp) die(`AKKERI FELL — engin hlutfoll borin saman i ${fmt}`);
      if (identical > 0) die(`AKKERI FELL — ${identical} af ${cmp} hlutfollum eru BITWISE EINS ` +
        `i ${fmt}: endurgerdin les sennilega defense.json sjalft og "endurgerd" er tautologia`);
      /* 0,005 er thak sem tveggja-aukastafa runnun getur skyrt (maeld
         skekkja er 8,7e-4, svo thakid situr ~6x fyrir ofan hana og ekki
         OFAN A henni — sja `ratioToleranceHeadroom`). */
      if (ratioDiff > 0.005) die(`AKKERI FELL — hlutfoll skeika um ${ratioDiff} i ${fmt}, sem er ` +
        "meira en tveggja-aukastafa runnun getur skyrt; formulan er ekki sù sama");
    }
  }
  console.log(`\nnet keyrt a ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  /* ---------- PLASEBO-THAKID — EINHLIDA ---------- */
  /* `usage-lab` fann ad `max |t|` gaf 22,238 fyrir holf sem TAPADI i
     hverju timabili (orsma dreifni) og sa galli FLIPPADI SVARINU.
     Thakid er thvi `maxPositiveT` og `maxPct`. `maxAbsT` er BIRT en
     ekki notad i domi — og hversu langt i sundur thau eru er sjalft
     upplysing um hvers vegna einhlida thak er nauðsynlegt. */
  const plc = {};
  for (const fmt of FORMATS) {
    const rows = placeboRows.filter((r) => r.format === fmt);
    const pos = rows.filter((r) => (r.t ?? 0) > 0);
    const perSeed = [];
    for (const path2 of ["placebo", "placeboExp"]) for (const s of SEEDS) {
      const rr = rows.filter((r) => r.seed === s && r.value === path2);
      if (!rr.length) continue;
      perSeed.push({ path: path2, seed: s,
        maxPct: r3(Math.max(...rr.map((q) => q.pctOfGapClosed))),
        maxPositiveT: r3(Math.max(0, ...rr.filter((q) => (q.t ?? 0) > 0).map((q) => q.t))),
        maxDelta: r3(Math.max(...rr.map((q) => q.deltaVsIncumbent))) });
    }
    const pm = mean(perSeed.map((q) => q.maxPct));
    const psd = Math.sqrt(mean(perSeed.map((q) => (q.maxPct - pm) ** 2)) *
      perSeed.length / Math.max(1, perSeed.length - 1));
    plc[fmt] = { cells: rows.length, seeds: perSeed.length,
      maxPct: r3(Math.max(...rows.map((r) => r.pctOfGapClosed))),
      maxPositiveT: r3(Math.max(0, ...pos.map((r) => r.t))),
      maxAbsT: r3(Math.max(...rows.map((r) => Math.abs(r.t ?? 0)))),
      maxDelta: r3(Math.max(...rows.map((r) => r.deltaVsIncumbent))),
      minDelta: r3(Math.min(...rows.map((r) => r.deltaVsIncumbent))),
      perSeed, seedMaxMean: r3(pm), seedMaxSd: r3(psd),
      /* Forspárbil a HAMARKI per fraekorni — sama hugsun og opp-lab's
         [-24,2 · +21,7]: hve hatt kemst havadi thegar hann faer ad velja
         besta holf sitt ur SAMA neti. */
      predictionHi: r3(pm + 2.201 * psd * Math.sqrt(1 + 1 / Math.max(1, perSeed.length))),
      minT: r3(Math.min(...rows.map((r) => r.t ?? 0))),
      oneSidedChangesThreshold: r3(Math.max(0, ...pos.map((r) => r.t))) !==
        r3(Math.max(...rows.map((r) => Math.abs(r.t ?? 0)))),
      note: "one-sided on purpose: usage-lab found max|t| = 22.238 for a cell that LOST every " +
        "season (tiny variance), and that flaw flipped the answer. HONESTY NOTE: in THIS data the " +
        "rule is not load-bearing — the most extreme |t| happens to be positive, so maxPositiveT " +
        "and maxAbsT coincide (see oneSidedChangesThreshold). The rule is applied because it is " +
        "correct, not because it rescued this result." };
  }

  /* ---------- SEINNI UMFERD: KLASA-BOOTSTRAPP PER LEIKMANN ---------- */
  /* Klasa-bootstrappid kostar contrib-uppbyggingu i hverju holfi og
     thad er ekki thess virdi a 1.600 plasebo-holfum. Thad er reiknad a
     theim holfum sem RAUNVERULEGA GETA breytt domnum: allt sem sleppur
     yfir plasebo-thakid, plus besta holf hvers stodusvids i hverju
     snidi (svo skran beri vikmork LIKA thegar svarid er nei), plus
     fulltruar poradra samanburda. Val a holfum getur ekki breytt
     domnum: skilyrdid "yfir thaki" er reiknad ur PASS 1. */
  const bootSet = new Map();
  const addBoot = (r) => { if (r) bootSet.set(`${r.format}|${r.scope}|${r.method}|W${r.defWeight}`, r); };
  for (const fmt of FORMATS) {
    const ceil = plc[fmt];
    const rows = Object.values(results).filter((r) => r.format === fmt);
    for (const r of rows) if (r.pctOfGapClosed > ceil.maxPct && r.deltaVsIncumbent > 0) addBoot(r);
    for (const scope of SCOPES) {
      const s = rows.filter((r) => r.scope === scope.key);
      if (s.length) addBoot(s.reduce((a, b) => (a.pctOfGapClosed >= b.pctOfGapClosed ? a : b)));
    }
    for (const src of SRCS(fmt)) for (const v of VALUES) for (const oa of ["", "+oppAdj"]) {
      addBoot(results[`${fmt}|all|${v}${oa}·season·K6${srcTag(src)}|W${W_MAIN}`]);
    }
  }
  console.log(`klasa-bootstrapp per leikmann a ${bootSet.size} holfum (BOOT=${BOOT}) ...`);
  {
    const t1 = Date.now();
    const byVariant = new Map();
    for (const r of bootSet.values()) {
      const k = `${r.format}|${r.method}`;
      if (!byVariant.has(k)) byVariant.set(k, []);
      byVariant.get(k).push(r);
    }
    for (const [k, rows] of byVariant) {
      const [fmt] = k.split("|");
      const v = coreFor(fmt).find((c) => c.key === rows[0].method);
      if (!v) continue;
      const rat = buildFor(fmt, v);
      for (const r of rows) {
        const scope = SCOPES.find((s) => s.key === r.scope);
        const cell = evalCell(envs[fmt], rat, incum[fmt].ratios, r.defWeight,
          scope.pos ? PI[scope.pos] : null, NT, true);
        r.ciPlayer = playerBootstrap(cell.contrib, incum[fmt].cell.contrib, envs[fmt], BOOT, 90210);
      }
      /* ratio-taflan er sleppt hér — hun er endurbyggd per afbrigdi. */
    }
    console.log(`  ... ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  }

  /* ---------- WALK-FORWARD VAL A ADFERD OG VOG ---------- */
  /* HEIDARLEGA SPURNINGIN um `DEF_WEIGHT`: ekki "hvad var best eftir a"
     heldur "hvad hefdi verid valid ur fortidinni". Bædi eru birt — sa
     munur ER svarid vid "tapar endurfitting toppnum?" (FPL: hun vann a
     lauginni og TAPADI topp-5). */
  const wf = {};
  for (const fmt of FORMATS) {
    const env = envs[fmt];
    for (const scope of SCOPES) {
      const cands = Object.values(results).filter((r) => r.format === fmt && r.scope === scope.key);
      const per = {}, chosen = {}, chosenW = {};
      for (let i = 0; i < env.years.length; i++) {
        const y = env.years[i];
        const prior = env.years.slice(0, i);
        if (prior.length < 2) { per[y] = null; continue; }
        let best = null;
        for (const c of cands) {
          const vals = prior.map((py) => c.perSeason[py]).filter((v) => v != null);
          if (vals.length < prior.length) continue;
          const sc = mean(vals);
          if (!best || sc > best.sc) best = { sc, c };
        }
        if (!best) { per[y] = null; continue; }
        per[y] = best.c.perSeason[y];
        chosen[y] = best.c.method; chosenW[y] = best.c.defWeight;
      }
      const st = statOf(env.years.map((y) => per[y]));
      const hind = cands.reduce((a, c) => (a && a.pctOfGapClosed >= c.pctOfGapClosed ? a : c), null);
      /* Nulllinan a SOMU arum sem walk-forward gat valid a — annars
         vaeri hun borin vid 7 ar og WF vid 5. */
      const evalYears = env.years.filter((y) => per[y] != null);
      const incOn = statOf(evalYears.map((y) => incum[fmt].cell.pct[y]));
      wf[`${fmt}|${scope.key}`] = {
        walkForward: { pctOfGapClosed: r3(st.mean), t: r3(st.t), years: st.years,
                       positive: st.positive, chosenMethod: chosen, chosenDefWeight: chosenW,
                       perSeason: Object.fromEntries(env.years.map((y) => [y, r3(per[y])])) },
        incumbentOnSameYears: { pctOfGapClosed: r3(incOn.mean), years: incOn.years },
        hindsightBest: hind ? { method: hind.method, defWeight: hind.defWeight,
                                pctOfGapClosed: hind.pctOfGapClosed, t: hind.t } : null,
        refitLosesToHindsight: !!(hind && st.mean != null && st.mean < hind.pctOfGapClosed),
        candidates: cands.length,
      };
    }
  }

  /* ---------- VOG-SVEIPURINN, LESINN BERUM ORDUM ---------- */
  const weightSweep = {};
  for (const fmt of FORMATS) for (const scope of SCOPES) {
    for (const src of SRCS(fmt)) for (const v of VALUES) for (const oa of ["", "+oppAdj"]) {
      const fam = `${v}${oa}·season·K6${srcTag(src)}`;
      const grid = W_GRID.map((W) => {
        const r = results[`${fmt}|${scope.key}|${fam}|W${W}`];
        return r ? { W, pct: r.pctOfGapClosed, t: r.t, mae: r.mae } : null;
      }).filter(Boolean);
      if (!grid.length) continue;
      const best = grid.reduce((a, b) => (a.pct >= b.pct ? a : b));
      const bestMae = grid.reduce((a, b) => (a.mae <= b.mae ? a : b));
      weightSweep[`${fmt}|${scope.key}|${fam}`] =
        { grid, bestW: best.W, bestPct: best.pct, bestMaeW: bestMae.W, bestMae: bestMae.mae };
    }
  }

  /* ---------- MAE A MOTI AKVORDUN ---------- */
  const maeVsDecision = {};
  for (const fmt of FORMATS) {
    const incMae = mean(envs[fmt].years.map((y) => incum[fmt].cell.mae[y]));
    const rows = Object.values(results).filter((r) => r.format === fmt);
    const both = rows.filter((r) => r.mae < incMae && r.deltaVsIncumbent < 0);
    const opposite = rows.filter((r) => r.mae > incMae && r.deltaVsIncumbent > 0);
    maeVsDecision[fmt] = {
      incumbentMae: r3(incMae), cells: rows.length,
      maeBetterDecisionWorse: both.length, maeWorseDecisionBetter: opposite.length,
      examples: both.sort((a, b) => a.deltaVsIncumbent - b.deltaVsIncumbent).slice(0, 5)
        .map((r) => ({ method: r.method, scope: r.scope, defWeight: r.defWeight, mae: r.mae,
                       deltaVsIncumbent: r.deltaVsIncumbent })),
    };
  }

  /* ---------- PORADIR SAMANBURDIR — MED t YFIR TIMABIL ---------- */
  /* Hver ås er borinn PARAD: somu ar, sami hopur, adeins einn ås
     breytist. Ohåd medaltol yfir mismunandi afbrigdi vaeru ekki svar
     vid "baetir andstaedings-leidretting toluna?" — thess vegna er
     deltan reiknud PER PARI OG PER ARI, medaltoluð yfir por, og t-talan
     tekin yfir ARIN (7 ohadar athuganir), ekki yfir porin (sem eru
     hakuð ad sama neti og thvi ekki ohað). */
  const pairKey = (fmt, scope, key, W) => results[`${fmt}|${scope}|${key}|W${W}`];
  function pairedContrast(fmt, scope, pairs) {
    if (!pairs.length) return null;
    const env = envs[fmt];
    const perYear = env.years.map((y) => mean(pairs.map(([a, b]) => a.perSeason[y] - b.perSeason[y])));
    const st = statOf(perYear);
    const flat = pairs.map(([a, b]) => a.pctOfGapClosed - b.pctOfGapClosed);
    const bs = bootstrapDiff(
      Object.fromEntries(env.years.map((y, i) => [y, perYear[i]])),
      Object.fromEntries(env.years.map((y) => [y, 0])), 2000, 771);
    return { pairs: pairs.length, mean: r3(st.mean), t: r3(st.t), tCrit: tCritFor(st.years),
      years: st.years, positiveYears: st.positive, positivePairs: flat.filter((v) => v > 0).length,
      perSeason: Object.fromEntries(env.years.map((y, i) => [y, r3(perYear[i])])),
      ciSeason: bs ? { lo: r3(bs.lo), hi: r3(bs.hi), excludesZero: bs.excludesZero } : null,
      significant: !!(st.t != null && st.mean > 0 && st.t > tCritFor(st.years)) };
  }
  /* HVER PORUN HELDUR OLLUM ODRUM ASUM FOSTUM, LIKA `src`. Fyrsta
     utgafan safnadi por yfir `WINDOWS x KS` en gleymdi `src` — thad
     hefdi porad "eigin stig + oppAdj" vid "PPR-stig an oppAdj" i half
     og standard og maelt tvo asa sem einn. */
  const contrasts = {};
  for (const fmt of FORMATS) for (const scope of SCOPES) {
    const SR = SRCS(fmt);
    const oppPairs = [], expPairs = [], expvPairs = [], expvVsExp = [];
    const rollPairs = [], roll3Pairs = [], shrinkPairs = [], srcPairs = [];
    for (const src of SR) {
      const tg = srcTag(src);
      for (const win of WINDOWS) for (const K of KS) {
        for (const v of VALUES) {
          const a = pairKey(fmt, scope.key, `${v}+oppAdj·${win.key}·K${K}${tg}`, W_MAIN);
          const b = pairKey(fmt, scope.key, `${v}·${win.key}·K${K}${tg}`, W_MAIN);
          if (a && b) oppPairs.push([a, b]);
        }
        for (const oa of ["", "+oppAdj"]) {
          const raw = pairKey(fmt, scope.key, `raw${oa}·${win.key}·K${K}${tg}`, W_MAIN);
          const ex = pairKey(fmt, scope.key, `exp${oa}·${win.key}·K${K}${tg}`, W_MAIN);
          const ev = pairKey(fmt, scope.key, `expv${oa}·${win.key}·K${K}${tg}`, W_MAIN);
          if (raw && ex) expPairs.push([ex, raw]);
          if (raw && ev) expvPairs.push([ev, raw]);
          if (ex && ev) expvVsExp.push([ev, ex]);
        }
      }
      for (const v of VALUES) for (const oa of ["", "+oppAdj"]) for (const K of KS) {
        const s = pairKey(fmt, scope.key, `${v}${oa}·season·K${K}${tg}`, W_MAIN);
        const r5 = pairKey(fmt, scope.key, `${v}${oa}·roll5·K${K}${tg}`, W_MAIN);
        const r3p = pairKey(fmt, scope.key, `${v}${oa}·roll3·K${K}${tg}`, W_MAIN);
        if (s && r5) rollPairs.push([r5, s]);
        if (s && r3p) roll3Pairs.push([r3p, s]);
      }
      for (const v of VALUES) for (const oa of ["", "+oppAdj"]) for (const win of WINDOWS) {
        const k24 = pairKey(fmt, scope.key, `${v}${oa}·${win.key}·K24${tg}`, W_MAIN);
        const k2 = pairKey(fmt, scope.key, `${v}${oa}·${win.key}·K2${tg}`, W_MAIN);
        if (k24 && k2) shrinkPairs.push([k24, k2]);
      }
    }
    /* `src`: eigin stig deildarinnar a moti PPR-stigum, sem er thad sem
       appid gerir. Degenerate i ppr og thvi null thar. */
    if (SR.includes("ppr") && SR.includes("own")) {
      for (const v of VALUES) for (const oa of ["", "+oppAdj"]) for (const win of WINDOWS) for (const K of KS) {
        const own = pairKey(fmt, scope.key, `${v}${oa}·${win.key}·K${K}`, W_MAIN);
        const pp = pairKey(fmt, scope.key, `${v}${oa}·${win.key}·K${K}@pprSrc`, W_MAIN);
        if (own && pp) srcPairs.push([own, pp]);
      }
    }
    contrasts[`${fmt}|${scope.key}`] = {
      oppAdjMinusPlain: pairedContrast(fmt, scope.key, oppPairs),
      expMinusRaw: pairedContrast(fmt, scope.key, expPairs),
      expvMinusRaw: pairedContrast(fmt, scope.key, expvPairs),
      expvMinusExp: pairedContrast(fmt, scope.key, expvVsExp),
      roll5MinusSeason: pairedContrast(fmt, scope.key, rollPairs),
      roll3MinusSeason: pairedContrast(fmt, scope.key, roll3Pairs),
      shrink24MinusShrink2: pairedContrast(fmt, scope.key, shrinkPairs),
      ownScoringMinusPprScoring: srcPairs.length ? pairedContrast(fmt, scope.key, srcPairs) : null,
    };
  }
  /* Gluggi og K per stodu — svarid vid "er thad olikt milli stada?" */
  const byWindowK = {};
  for (const fmt of FORMATS) for (const scope of SCOPES) {
    const o = {}, k = {};
    for (const win of WINDOWS) {
      o[win.key] = r3(mean(KS.flatMap((K) => VALUES.flatMap((v) => ["", "+oppAdj"]
        .map((oa) => pairKey(fmt, scope.key, `${v}${oa}·${win.key}·K${K}`, W_MAIN))))
        .filter(Boolean).map((r) => r.pctOfGapClosed)));   // src = own eingongu
    }
    for (const K of KS) {
      k[K] = r3(mean(WINDOWS.flatMap((win) => VALUES.flatMap((v) => ["", "+oppAdj"]
        .map((oa) => pairKey(fmt, scope.key, `${v}${oa}·${win.key}·K${K}`, W_MAIN))))
        .filter(Boolean).map((r) => r.pctOfGapClosed)));   // src = own eingongu
    }
    byWindowK[`${fmt}|${scope.key}`] = { window: o, K: k };
  }

  /* ---------- ORAKEL-ThOKIN, DREGIN SAMAN ---------- */
  const oracleCeiling = {};
  for (const fmt of FORMATS) {
    const rows = oracleRows.filter((r) => r.format === fmt);
    const pick = (val, sc, cl) => {
      const rr = rows.filter((r) => r.value === val && r.scope === sc && r.clamped === cl);
      return rr.length ? rr.reduce((a, b) => (a.pctOfGapClosed >= b.pctOfGapClosed ? a : b)) : null;
    };
    const slim = (r) => r && { defWeight: r.defWeight, pctOfGapClosed: r.pctOfGapClosed, t: r.t,
      positive: r.positive, mae: r.mae, deltaVsIncumbent: r.deltaVsIncumbent };
    const cl = pick("oracleSeason", "all", true);
    /* SJALF-SMITID, ISOLERAD: `leakySeasonK6` og `oracleSeasonK6` eru
       SAMA formula (K=6, timabils-summa) og eini munurinn er hvort
       leikur vikunnar er i summunni. Munurinn er thvi hvorki skreppa ne
       kvarði heldur nakvaemlega thad hve mikid af birtu tolunni kemur
       ur ad kikja a utkomuna. */
    const leaky = pick("leakySeasonK6", "all", true), honest = pick("oracleSeasonK6", "all", true);
    /* Og BEINT VID SAMA W SEM APPID SENDIR (0,20) — ekki vid besta W,
       thvi "hve mikid er smit" er spurning um birtu stillinguna. */
    const atW = (val, W) => rows.find((r) => r.value === val && r.scope === "all" &&
      r.clamped === true && r.defWeight === W) || null;
    const lw = atW("leakySeasonK6", W_MAIN), hw = atW("oracleSeasonK6", W_MAIN);
    oracleCeiling[fmt] = {
      seasonStrengthClamped: slim(cl),
      seasonStrengthUnclamped: slim(pick("oracleSeason", "all", false)),
      sameFormulaWithGame: slim(leaky),
      sameFormulaGameRemoved: slim(honest),
      sameWeekContaminatedClamped: slim(pick("oracleWeek", "all", true)),
      sameWeekContaminatedUnclamped: slim(pick("oracleWeek", "all", false)),
      selfContaminationAtShippedWeight: lw && hw ? {
        withGame: lw.pctOfGapClosed, gameRemoved: hw.pctOfGapClosed,
        cost: r3(lw.pctOfGapClosed - hw.pctOfGapClosed),
        shippedNumber: r3(incum[fmt].stat.mean),
        note: "identical formula (season sum, K=6) at the shipped W=0.20; the ONLY difference is " +
          "whether the projected game is inside the sum. `cost` is how much of the published " +
          "figure comes from peeking.",
      } : null,
      clampBinds: !!(cl && pick("oracleSeason", "all", false) &&
        Math.abs(cl.pctOfGapClosed - pick("oracleSeason", "all", false).pctOfGapClosed) > 0.011),
      perScopeSeasonClamped: Object.fromEntries(SCOPES.map((s) => {
        const r = pick("oracleSeason", s.key, true);
        return [s.key, r ? r.pctOfGapClosed : null];
      })),
      headroomOverIncumbent: cl ? r3(cl.pctOfGapClosed - incum[fmt].stat.mean) : null,
      headroomOverIncumbentWF: cl ? r3(cl.pctOfGapClosed - incumWF[fmt].stat.mean) : null,
      grid: rows.filter((r) => r.scope === "all").map((r) => ({ value: r.value,
        clamped: r.clamped, W: r.defWeight, pct: r.pctOfGapClosed, t: r.t })),
      note: "seasonStrength = the defence's season ratio with THIS game removed (jackknife), no " +
        "shrink: perfect knowledge of defensive strength and zero knowledge of this game's " +
        "outcome. That is the ceiling any estimator is chasing. sameWeek is SELF-CONTAMINATED " +
        "(the numerator contains the projected player's own points) and is reported only to " +
        "prove the metric is not deaf to a (week, team, position) multiplier table.",
    };
  }

  /* ---------- MATCHED NULL: PLASEBO A SOMU SPEC ---------- */
  /* Plasebo-thakid er max yfir 2.160 holf og er thvi rettur throskuldur
     fyrir tolu sem er VALIN ur netinu. Nulltilgatan er ekki valin —
     hun er eitt fast spec (defense.json, season, K=6, W=0,20, scope
     all). Rettur throskuldur FYRIR HANA er thvi plasebo a NAKVAEMLEGA
     sama spec, yfir fraekornin. Ad bera ovalda tolu vid max-yfir-2.160
     vaeri sama villa i hina attina. */
  const matchedNull = {};
  for (const fmt of FORMATS) {
    /* MATCHED THYDIR MATCHED A OLLUM ASUM, LIKA `src`. Fyrsta utgafan
       sleppti honum og tok tha 12 fraekorn (6 x tvo stiga-grunna) i
       stad 6 — thad blandadi tveimur nullum saman og `max` var ur
       ronguu. Nulltilgatan er PPR-tafla, svo nullid verdur ad vera thad. */
    /* Fyrir ppr-snidid ER "own" thad sama og "ppr" (asinn er degenerate
       og er thvi ekki keyrdur), svo nullid er valid ur theim ås sem er
       til. Ad krefjast bokstaflega "ppr" thar hefdi gefid TOMT mengi og
       `Math.max()` af tomu er -Infinity — thogul bilun. */
    const wantSrc = SRCS(fmt).includes("ppr") ? "ppr" : "own";
    const rr = placeboRows.filter((r) => r.scope === "all" && r.format === fmt &&
      r.value === "placebo" && r.window === "season" && r.K === 6 &&
      r.oppAdj === false && r.defWeight === W_MAIN && (r.src || "own") === wantSrc);
    if (!rr.length) die(`matchedNull: ekkert plasebo-holf a spec nulltilgatunnar i ${fmt}`);
    const v = rr.map((r) => r.pctOfGapClosed);
    const st = statOf(v);
    matchedNull[fmt] = { spec: `raw-path, season window, K=6, no oppAdj, W=0.20, scope=all, ` +
        `points source = ${wantSrc} (defense.json is PPR-derived in every format)`,
      seeds: v.length, mean: r3(st.mean), sd: r3(st.se != null ? st.se * Math.sqrt(v.length) : null),
      min: r3(Math.min(...v)), max: r3(Math.max(...v)), values: v.map(r3),
      incumbentWF: r3(incumWF[fmt].stat.mean),
      incumbentWFAboveMatchedMax: !!(incumWF[fmt].stat.mean > Math.max(...v)),
      note: "the matched null for incumbentWalkForward, which shares this exact spec. The shipped " +
        "`incumbent` has NO matched null because defense.json is a season total and no placebo " +
        "here is allowed to see the future." };
  }

  /* ---------- DOMURINN — REIKNADUR UR TOLUNUM ---------- */
  const verdict = { perFormat: {} };
  for (const fmt of FORMATS) {
    const rows = Object.values(results).filter((r) => r.format === fmt);
    const allScope = rows.filter((r) => r.scope === "all");
    const best = allScope.reduce((a, b) => (a && a.pctOfGapClosed >= b.pctOfGapClosed ? a : b), null);
    const bestAny = rows.reduce((a, b) => (a && a.pctOfGapClosed >= b.pctOfGapClosed ? a : b), null);
    const ceil = plc[fmt];
    const passers = rows.filter((r) =>
      r.pctOfGapClosed > ceil.maxPct &&
      r.deltaVsIncumbent > 0 &&
      (r.t ?? 0) > ceil.maxPositiveT &&
      r.ciPlayer && r.ciPlayer.excludesZero);
    const tc = tCritFor(incum[fmt].stat.years);
    verdict.perFormat[fmt] = {
      incumbent: { pctOfGapClosed: r3(incum[fmt].stat.mean), t: r3(incum[fmt].stat.t),
                   years: incum[fmt].stat.years, positive: incum[fmt].stat.positive,
                   significant: !!(incum[fmt].stat.t > tc),
                   note: "defense.json — SEASON TOTAL, so the null hypothesis itself peeks at the outcome" },
      incumbentWalkForward: { pctOfGapClosed: r3(incumWF[fmt].stat.mean),
                              t: r3(incumWF[fmt].stat.t), positive: incumWF[fmt].stat.positive,
                              note: "same formula (raw points, K=6) but built only from weeks < w" },
      tCrit: tc,
      bestAllPositions: best && { method: best.method, defWeight: best.defWeight,
        pctOfGapClosed: best.pctOfGapClosed, t: best.t, positive: best.positive,
        deltaVsIncumbent: best.deltaVsIncumbent, deltaVsIncumbentWF: best.deltaVsIncumbentWF,
        ciSeason: best.ciSeason, ciPlayer: best.ciPlayer || null },
      bestAnyScope: bestAny && { method: bestAny.method, scope: bestAny.scope,
        defWeight: bestAny.defWeight, pctOfGapClosed: bestAny.pctOfGapClosed, t: bestAny.t,
        deltaVsIncumbent: bestAny.deltaVsIncumbent, ciPlayer: bestAny.ciPlayer || null },
      placeboCeiling: { maxPct: ceil.maxPct, maxPositiveT: ceil.maxPositiveT, maxAbsT: ceil.maxAbsT,
                        predictionHi: ceil.predictionHi, maxDelta: ceil.maxDelta },
      oracleCeiling: oracleCeiling[fmt],
      beatsIncumbent: !!(best && best.pctOfGapClosed > r3(incum[fmt].stat.mean)),
      beatsPlaceboCeiling: !!(best && best.pctOfGapClosed > ceil.maxPct),
      cellsPassingAllThree: passers.length,
      passing: passers.slice(0, 8).map((r) => ({ method: r.method, scope: r.scope,
        defWeight: r.defWeight, pctOfGapClosed: r.pctOfGapClosed, t: r.t,
        ciPlayer: r.ciPlayer, ciSeason: r.ciSeason })),
    };
  }
  const anyPass = FORMATS.some((f) => verdict.perFormat[f].cellsPassingAllThree > 0);
  verdict.anythingPasses = anyPass;
  verdict.headline = anyPass
    ? "At least one rebuilt defense number clears the one-sided placebo ceiling AND the " +
      "player-clustered interval. See perFormat[*].passing. Nothing is wired into src/ on this " +
      "evidence alone, and the result must be reconciled against gap-lab enrichment 0.961x."
    : "NOTHING PASSES. Not one of 2700 cells. Six ways of rebuilding the defence-versus-position " +
      "number — opponent adjustment, expected points from components with EPA, the same without " +
      "EPA, rolling windows, shrink strength, and the league's own scoring instead of PPR — plus " +
      "a refitted DEF_WEIGHT, and none beats the incumbent by more than deterministic noise " +
      "reaches through the identical grid. The oracle rows say why: perfect pre-game knowledge " +
      "of defensive strength is worth LESS than the published figure, because the published " +
      "figure includes the game it is projecting.";
  /* AF HVERJU — OG THAD ER REIKNAD, EKKI FULLYRT. Orakelid er thakid:
     ef fullkomin vitneskja um vorn skilar litlu er ekkert mat til sem
     skilar meiru, og "flaskan er tom" er stadreynd um LIKANID. */
  verdict.whyNumbers = Object.fromEntries(FORMATS.map((f) => {
    const oc = oracleCeiling[f], ss = oc.seasonStrengthClamped, sw = oc.sameWeekContaminatedClamped;
    return [f, {
      incumbentAsShipped: r3(incum[f].stat.mean),
      incumbentWalkForward: r3(incumWF[f].stat.mean),
      matchedNullMax: matchedNull[f].max,
      incumbentWFBeatsItsMatchedNull: matchedNull[f].incumbentWFAboveMatchedMax,
      roundingTieNullMaxDeviation: tieNull[f].maxAbsDeviation,
      oracleSeasonStrengthClamped: ss ? ss.pctOfGapClosed : null,
      oracleSeasonStrengthUnclamped: oc.seasonStrengthUnclamped
        ? oc.seasonStrengthUnclamped.pctOfGapClosed : null,
      headroomForAnyEstimatorOverShipped: oc.headroomOverIncumbent,
      headroomForAnyEstimatorOverWalkForward: oc.headroomOverIncumbentWF,
      sameWeekContaminatedOracle: sw ? sw.pctOfGapClosed : null,
      placeboCeiling: plc[f].maxPct,
      bestRebuildAllScope: verdict.perFormat[f].bestAllPositions
        ? verdict.perFormat[f].bestAllPositions.pctOfGapClosed : null,
      statement: "read in this order: the metric CAN move (contaminated same-week oracle " +
        `${sw ? sw.pctOfGapClosed : "—"}%), so it is not deaf. Perfect knowledge of defensive ` +
        `STRENGTH with this game removed closes ${ss ? ss.pctOfGapClosed : "—"}%, against ` +
        `${r3(incumWF[f].stat.mean)}% for the shipped formula built walk-forward. And the ` +
        `placebo ceiling through the same grid is ${plc[f].maxPct}%. The distance between the ` +
        "achievable ceiling and the noise floor is what any rebuild has to live in.",
    }];
  }));
  /* HLIDAR-NIDURSTODUR SEM AKKERI FUNDU, EKKI LESTUR. Baedi thessi
     komu fram thegar akkeri fell; hvorugt var i beidninni. */
  verdict.sideFindings = [
    { finding: "data/defense.json is built from PPR points ONLY and applied unchanged in " +
        "standard and half-ppr leagues (`defenseVsPosition` in scripts/fetch-nfl.mjs sums " +
        "`r.ppr` for every format).",
      howFound: "the reconstruction anchor failed for standard at 3.487 vs 2.967 — 0.52 pp that " +
        "had nothing to do with the formula and everything to do with which points were summed.",
      thenMeasured: "added as the `src` axis (own scoring vs PPR), paired at every other axis.",
      result: Object.fromEntries(FORMATS.filter((f) => SRCS(f).includes("ppr")).map((f) => {
        const q = contrasts[`${f}|all`].ownScoringMinusPprScoring;
        return [f, q ? { meanPp: q.mean, t: q.t, tCrit: q.tCrit,
          positiveYears: q.positiveYears, years: q.years, pairs: q.pairs,
          ciSeason: q.ciSeason, significant: q.significant } : null];
      })),
      verdict: "NOT MEASURABLE either way. Using the league's own scoring for the defence table " +
        "is indistinguishable from using PPR. So the shipped shortcut is defensible — but it is " +
        "now defensible BY MEASUREMENT rather than by nobody having looked.",
      doNotChange: "there is no reason to change fetch-nfl.mjs on this evidence, and no reason " +
        "to claim the PPR shortcut was deliberate." },
    { finding: "a CONSTANT defence multiplier — zero information by construction — still moves " +
        "the metric, because weeklyProjection rounds to 0.1 and rounding neither preserves nor " +
        "creates ties monotonically. Measured band: " +
        FORMATS.map((f) => `${f} +-${tieNull[f].maxAbsDeviation} pp`).join(", ") + ".",
      howFound: "it was written as an ANCHOR (`a constant table must be neutral`) and the anchor " +
        "failed at 2.07 pp. The invariant was wrong, not the code.",
      whyItMatters: "it is the floor under every comparison in this file, and it is an " +
        "independent reason to threshold on the placebo ceiling rather than on zero.",
      relatedTo: "gap-lab measured FLEX rounding ties at 8/3687 lineups worth 0.174 pp; this is " +
        "the same mechanism seen from the multiplier side, where it is larger." },
  ];
  verdict.defWeightAnswer = Object.fromEntries(FORMATS.map((fmt) => {
    const sw = weightSweep[`${fmt}|all|raw·season·K6`];
    const swo = weightSweep[`${fmt}|all|raw+oppAdj·season·K6`];
    const w = wf[`${fmt}|all`];
    return [fmt, {
      shipped: W_MAIN,
      sweepBestW_raw: sw ? sw.bestW : null, sweepGrid_raw: sw ? sw.grid : null,
      sweepBestW_rawOppAdj: swo ? swo.bestW : null,
      sweepBestMaeW_raw: sw ? sw.bestMaeW : null,
      walkForwardChosen: w ? w.walkForward.chosenDefWeight : null,
      walkForwardPct: w ? w.walkForward.pctOfGapClosed : null,
      incumbentOnSameYears: w ? w.incumbentOnSameYears.pctOfGapClosed : null,
      hindsightBestPct: w && w.hindsightBest ? w.hindsightBest.pctOfGapClosed : null,
      refitLosesToHindsight: !!(w && w.refitLosesToHindsight),
      walkForwardBeatsIncumbent: !!(w && w.walkForward.pctOfGapClosed != null &&
        w.walkForward.pctOfGapClosed > w.incumbentOnSameYears.pctOfGapClosed),
    }];
  }));
  /* SAMHLJODA `gap-lab`? Svarid er REIKNAD: audgun 0,961x segir ad
     varnar-merkid flaggi eftirsja sjaldnar en grunntidnin, og orakel-
     thakid segir hve mikid vaeri i flöskunni EF merkid vaeri fullkomid.
     Ef hvorugt gefur neitt eru maelingarnar samhljoda. */
  const gapEnr = gapFile && gapFile.enrichment && gapFile.enrichment.all
    ? gapFile.enrichment.all.signals.defense : null;
  verdict.reconciliationWithGapLab = {
    gapLabDefenseEnrichment: gapEnr ? gapEnr.enrichment : null,
    gapLabDefenseShareOfGap: gapFile && gapFile.verdict
      ? (gapFile.verdict.nextWork.find((n) => n.cause === "defense") || {}).share ?? null : null,
    gapLabDefenseSignalPoints: gapFile && gapFile.verdict
      ? (gapFile.verdict.nextWork.find((n) => n.cause === "defense") || {}).signalPoints ?? null : null,
    thisLabFoundAnything: anyPass,
    agrees: !anyPass,
    /* OG HVERS VEGNA THAU FARA SAMAN — thad var thad sem vantadi. Ef
       flaskan er tom en 26,7% af bilinu er samt "vorn", hvar er thad?
       Orakelin svara: thakid fyrir HEIDARLEGT mat er ~4,9%, sem er
       LAEGRA en birta talan 5,831%, og munurinn er kiki (1,7 pp).
       Flaskan er ekki tom af thvi ad vornin skipti engu mali — hun er
       tom af thvi ad ThAD SEM MA VITA FYRIR LEIKINN er thegar naerri
       fullnytt, og thad sem eftir er er utkoma. */
    honestCeiling: Object.fromEntries(FORMATS.map((f) => [f,
      oracleCeiling[f].seasonStrengthClamped
        ? oracleCeiling[f].seasonStrengthClamped.pctOfGapClosed : null])),
    publishedFigure: Object.fromEntries(FORMATS.map((f) => [f, r3(incum[f].stat.mean)])),
    selfContamination: Object.fromEntries(FORMATS.map((f) => [f,
      oracleCeiling[f].selfContaminationAtShippedWeight
        ? oracleCeiling[f].selfContaminationAtShippedWeight.cost : null])),
    statement: anyPass
      ? "DISAGREES with gap-lab on its face and the disagreement must be explained before " +
        "anything is wired: gap-lab measured the defence SIGNAL against actual regret and got " +
        "0.961x, while this lab measures the DECISION. A cell can win the decision without " +
        "enriching regret only if it wins on near-ties, which is exactly what a tiebreaker does " +
        "— so check the rounding-tie null before believing it."
      : "AGREES with gap-lab, and the oracle rows say WHY they agree. Enrichment 0.961x said the " +
        "defence signal flags regret less often than the base rate. This lab rebuilt the number " +
        "five ways and nothing beat noise through the identical grid. The reason is not that the " +
        "metric is deaf — a same-week (self-contaminated) multiplier table closes 32% of the gap " +
        "— but that PERFECT knowledge of pre-game defensive strength closes only about 5%, which " +
        "is LESS than the published figure, whose excess is peeking at the game being projected. " +
        "The flask is empty because what is knowable before kickoff is already nearly spent.",
  };

  /* ---------- SKYRSLAN A SKJANN ---------- */
  console.log(`\n${"=".repeat(84)}`);
  console.log("  ADFERD x STADA x SNID — % af tiltaeka bilinu (W = 0,20)");
  console.log("=".repeat(84));
  for (const fmt of FORMATS) {
    const v = verdict.perFormat[fmt];
    console.log(`\n${fmt}  ·  nulltilgata ${v.incumbent.pctOfGapClosed}% ` +
      `(t=${v.incumbent.t}, ${v.incumbent.positive}/${v.incumbent.years})` +
      `  ·  walk-forward sama formula ${v.incumbentWalkForward.pctOfGapClosed}%`);
    const oc = v.oracleCeiling;
    console.log(`   PLASEBO-ThAK ${v.placeboCeiling.maxPct}% ` +
      `(max +t ${v.placeboCeiling.maxPositiveT}, max |t| ${v.placeboCeiling.maxAbsT})` +
      `  ·  matched null (sama spec) max ${matchedNull[fmt].max}%` +
      `  ·  runnunar-jafntefli +-${tieNull[fmt].maxAbsDeviation} pp`);
    console.log(`   ORAKEL timabils-styrkur AN thessa leiks ` +
      `${oc.seasonStrengthClamped ? oc.seasonStrengthClamped.pctOfGapClosed : "—"}%` +
      ` (an klemmu ${oc.seasonStrengthUnclamped ? oc.seasonStrengthUnclamped.pctOfGapClosed : "—"}%,` +
      ` klemman bindur: ${oc.clampBinds ? "JA" : "NEI"})` +
      `  ·  somu viku SJALF-SMITAD ` +
      `${oc.sameWeekContaminatedClamped ? oc.sameWeekContaminatedClamped.pctOfGapClosed : "—"}%`);
    if (oc.selfContaminationAtShippedWeight) {
      const s = oc.selfContaminationAtShippedWeight;
      console.log(`   SJALF-SMIT vid W=0,20 (sama formula, K=6): med leiknum ${s.withGame}%` +
        ` · an leiksins ${s.gameRemoved}%  ->  ${s.cost} pp af birtu tolunni er kiki`);
    }
    /* TAFLAN BIRTIR `deltaVsIncumbent`, EKKI HRATT `pct`. Astaedan er
       ad stodu-svidin (QB..TE) halda LEKU `defense.json` a hinum
       thremur stodunum — hrat `pct` theirra erfir thvi lekann og las
       eins og "5,5% > 3,5%" thott thad se sami leki tvisvar. Deltan er
       eina talan sem er samanburdarhaef milli svida. */
    console.log(`   ${"adferd (delta vs nulltilgata)".padEnd(30)}${SCOPES.map((s) => s.key.padStart(9)).join("")}`);
    for (const c of coreFor(fmt)) {
      const cells = SCOPES.map((s) => {
        const r = results[`${fmt}|${s.key}|${c.key}|W${W_MAIN}`];
        return (r ? `${r.deltaVsIncumbent > 0 ? "+" : ""}${r.deltaVsIncumbent}` : "—").padStart(9);
      }).join("");
      console.log(`   ${c.key.padEnd(30)}${cells}`);
    }
    const w = wf[`${fmt}|all`];
    console.log(`   ${"walk-forward valid (hratt %)".padEnd(30)}${String(w.walkForward.pctOfGapClosed).padStart(9)}` +
      `   (nulltilgata a somu arum ${w.incumbentOnSameYears.pctOfGapClosed}` +
      ` · eftir a: ${w.hindsightBest.pctOfGapClosed} med ${w.hindsightBest.method} @ W=${w.hindsightBest.defWeight})`);
    const sw = weightSweep[`${fmt}|all|raw·season·K6`];
    if (sw) console.log(`   DEF_WEIGHT-sveipur (raw·season·K6): ` +
      sw.grid.map((g) => `${g.W}->${g.pct}`).join(" · ") + `   best W=${sw.bestW}`);
    const c = contrasts[`${fmt}|all`];
    for (const [nm, key] of [["andstaedings-leidretting", "oppAdjMinusPlain"],
      ["ihlutir m/epa", "expMinusRaw"], ["ihlutir an epa", "expvMinusRaw"],
      ["roll5 - season", "roll5MinusSeason"], ["roll3 - season", "roll3MinusSeason"],
      ["K24 - K2", "shrink24MinusShrink2"],
      ["eigin stig - PPR-stig", "ownScoringMinusPprScoring"]]) {
      const q = c[key];
      if (!q) continue;
      console.log(`   ${nm.padEnd(26)}${String(q.mean).padStart(9)}  t=${q.t}` +
        ` (thak ${q.tCrit}) · ${q.positiveYears}/${q.years} ar · CI [${q.ciSeason.lo}, ${q.ciSeason.hi}]` +
        `${q.significant ? "  MARKTAEKT" : ""}`);
    }
    console.log(`   MAE batnar & akvordun versnar: ${maeVsDecision[fmt].maeBetterDecisionWorse}` +
      ` af ${maeVsDecision[fmt].cells} holfum  ·  hitt: ${maeVsDecision[fmt].maeWorseDecisionBetter}`);
    console.log(`   holf sem standast ALLA THRJA throskulda: ${v.cellsPassingAllThree}`);
  }
  console.log(`\n${"=".repeat(84)}`);
  console.log(`  -> ${anyPass ? "EITTHVAD STENST" : "EKKERT STENST"}`);
  console.log(`  ${verdict.reconciliationWithGapLab.agrees ? "SAMHLJODA" : "OSAMHLJODA"} gap-lab` +
    ` (audgun ${verdict.reconciliationWithGapLab.gapLabDefenseEnrichment}x)`);
  console.log("=".repeat(84));

  if (QUICK) {
    console.log("\n  --quick: half-net, SKRIFAR EKKERT. Tom eda hluta-maelingarskra litur ut");
    console.log("  eins og maeling og er thad ekki. Keyrdu an --quick fyrir skrana.\n");
    return;
  }

  await mkdir(MEAS, { recursive: true });
  const inputs = ["features.json", "schedule_history.json", "defense.json",
    "startsit_ppr.json", "startsit_standard.json", "measure/gap.json",
    ...years.map((y) => `weekly/${y}.json`)];
  await writeFile(path.join(MEAS, "defweek.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { from: 2019, boot: 400, quick: false }, inputs, dataDir: OUT }),
    question: "Is the defense-versus-position number BUILT right? DEF_WEIGHT = 0.20 is measured; " +
      "how the number it multiplies is constructed was not. Five axes, all walk-forward: " +
      "opponent adjustment, expected points from components (with and without EPA), rolling " +
      "window, shrink strength — plus a refit of DEF_WEIGHT itself, and an oracle ceiling.",
    priorExpectation: {
      magnitude: "small",
      writtenBefore: "This field is stated ex ante, before any cell was read, because gap-lab " +
        "already measured the thing this lab tries to improve.",
      because: "gap-lab (README 4f) decomposed the same start/sit gap and found the DEFENCE FLASK " +
        "IS EMPTY: defence accounted for 26.7% of the gap — the largest single bucket — but its " +
        "ENRICHMENT is 0.961x, i.e. the defence signal flags regret LESS often than an ordinary " +
        "week does. Discounted by enrichment the order is availability 1.42x -> role 1.20x -> " +
        "defence 0.00.",
      gapLabNumbers: gapEnr ? { poolRate: gapEnr.poolRate, swapRate: gapEnr.swapRate,
        enrichment: gapEnr.enrichment } : null,
      alsoMechanical: "DEF_WEIGHT = 0.20 with the [0.80, 1.25] clamp bounds how far ANY defence " +
        "number can move a projection, so a better input can only ever flip near-ties. The " +
        "oracle rows measure that bound instead of asserting it.",
      whereThePriorWasWRONG: "the prior above blamed the CLAMP as part of the bound. Measured, it " +
        "is not: oracle[*].clampBinds is " +
        FORMATS.map((f) => `${f} ${oracleCeiling[f].clampBinds}`).join(", ") +
        " — a realistic season-strength table never reaches [0.80, 1.25], so the clamped and " +
        "unclamped oracles are identical to three decimals. The binding constraints are the " +
        "WEIGHT and the SIGNAL, not the clamp. Recorded because a prior that is quietly dropped " +
        "when it turns out wrong is not a prior.",
      thereforeTwoOutcomes: "Finding nothing CONFIRMS gap-lab and is a complete result. Finding " +
        "something REQUIRES an explanation of how it coexists with enrichment 0.961x, and that " +
        "explanation is in verdict.reconciliationWithGapLab.",
      alsoNoteFromMktweek: "half-ppr is NOT significant even for the incumbent (3.199%, t = " +
        "1.908, 5/7 seasons), so a half-ppr cell cannot be called a win on a t-test alone.",
    },
    metric: "percent of the available gap closed, (weekly - flat) / (ceiling - flat), identical " +
      "to startsit-lab; anything else would not be comparable to the 5.831% / 3.199% / 2.967% " +
      "targets. Weekly scores are ROUNDED TO 0.1 exactly as weeklyProjection rounds them — " +
      "without that the same grid reads 5.317% and the reproduction is a different measurement.",
    formats: FORMATS, seasons: envs[fmt0].years,
    halfPairing: { paired, unpaired,
      note: "half is exact algebra: PPR = STD + receptions, so HALF = (STD + PPR)/2" },
    anchors,
    /* STOKKBREYTTU ThVI SEM ThU LAGAR. Akkeri sem hefur aldrei fallid er
       fullyrding, ekki vordur. Hver lina hér var keyrd a AFRITI af
       skriftunni med thessari einu breytingu og hvert afrit DO. Ekki
       keyrt inni i skriftunni — thad tvofaldadi tímann og NaN-tilfellid
       er hvort eð er stokkbreytt i keyrslu (`anchors.nanGuard`). */
    mutationsVerified: [
      { mutation: "drop the 0.1 rounding of the weekly score in evalCell",
        caughtBy: ["reproduce/ppr (5.317 vs 5.831)", "zeroWeight (21.88 off gameScript-only)"],
        exit: 3 },
      { mutation: "let week w enter its own defence table (a real leak)",
        caughtBy: ["noLeak (week < 9 moved by 0.612)", "converged (0.072 vs tolerance 0.002)"],
        exit: 3 },
      { mutation: "build leakySeasonK6 from the league's own scoring instead of PPR",
        caughtBy: ["reconstructsDefenseFile (3.487 vs 2.967 in standard)"], exit: 3 },
      { mutation: "remove all three NaN guards",
        caughtBy: ["nanGuard (all three sub-checks reported slipping through)"], exit: 3 },
      { mutation: "collapse the rounding-tie null to a single constant of 1.0",
        caughtBy: ["roundingTieNullIsLive (constant table moves nothing)"], exit: 3 },
      { mutation: "restore the df off-by-one in tCritFor (T_CRIT[n-1])",
        caughtBy: ["tCritTable (four mismatches, incl. n=7 -> 2.571 vs 2.447)"], exit: 3 },
      { mutation: "run with --boot=20, which silently returns null for every player interval",
        caughtBy: ["the --boot guard in main()"], exit: 2 },
      { mutation: "make the leak poison a no-op (spread the row unchanged)",
        caughtBy: ["noLeak second assertion (table did not change AFTER the cut)"], exit: 3 },
    ],
    leakWarning: "data/defense.json is a SEASON TOTAL (games: 16 for every row), so the " +
      "incumbent null hypothesis itself uses the whole season when projecting week 3. That is " +
      "the leak condition 3 forbids. Both nulls are reported: `incumbent` (as shipped, the " +
      "5.831% figure) and `incumbentWalkForward` (identical formula, weeks < w only).",
    grid: { methodsPerFormat: Object.fromEntries(FORMATS.map((f) => [f, coreFor(f).length])),
      placeboVariantsPerFormat: Object.fromEntries(FORMATS.map((f) => [f, placeboFor(f).length])),
      oracleVariants: ORACLE.length,
      scoringSource: Object.fromEntries(FORMATS.map((f) => [f, SRCS(f)])),
      scopes: SCOPES.map((s) => s.key), windows: WINDOWS.map((w) => w.key), shrinkK: KS,
      values: VALUES, defWeightGrid: W_GRID, placeboSeeds: SEEDS,
      placeboRole: "twelve deterministic-noise defences through the identical net — six seeds " +
        "down the RAW path and six down the COMPONENT path, because the ridge machinery is " +
        "itself a machine that could manufacture signal. The threshold is the ONE-SIDED placebo " +
        "ceiling, never zero and never max|t|.",
      oracleRole: "not a candidate: how the defence ACTUALLY played that week (points allowed to " +
        "that position / week mean across defences), the same definition gap-lab uses. " +
        "Deliberately leaky. It is the CEILING for any estimator, measured both with the shipped " +
        "[0.80, 1.25] clamp and without it, so 'the clamp binds' and 'the signal is absent' are " +
        "separable conclusions." },
    incumbent: Object.fromEntries(FORMATS.map((f) => [f, {
      pctOfGapClosed: r3(incum[f].stat.mean), t: r3(incum[f].stat.t),
      years: incum[f].stat.years, positive: incum[f].stat.positive,
      tCrit: tCritFor(incum[f].stat.years),
      perSeason: Object.fromEntries(envs[f].years.map((y) => [y, r3(incum[f].cell.pct[y])])),
      mae: r3(mean(envs[f].years.map((y) => incum[f].cell.mae[y]))),
      lineups: envs[f].years.reduce((a, y) => a + envs[f].per[y].n, 0),
    }])),
    incumbentWalkForward: Object.fromEntries(FORMATS.map((f) => [f, {
      pctOfGapClosed: r3(incumWF[f].stat.mean), t: r3(incumWF[f].stat.t),
      positive: incumWF[f].stat.positive,
      perSeason: Object.fromEntries(envs[f].years.map((y) => [y, r3(incumWF[f].cell.pct[y])])),
    }])),
    gameScriptOnly: Object.fromEntries(FORMATS.map((f) => [f, r3(mean(envs[f].years.map((y) =>
      (envs[f].per[y].sGsOnly - envs[f].per[y].sFlat) / envs[f].per[y].gap * 100)))])),
    results, contrasts, byWindowK, weightSweep, walkForward: wf,
    oracle: oracleCeiling,
    oracleCells: oracleRows.map((r) => ({ method: r.method, value: r.value, scope: r.scope,
      format: r.format, clamped: r.clamped, contaminated: r.contaminated, defWeight: r.defWeight,
      pctOfGapClosed: r.pctOfGapClosed, t: r.t, positive: r.positive,
      deltaVsIncumbent: r.deltaVsIncumbent, mae: r.mae })),
    roundingTieNull: tieNull,
    matchedNull,
    scopeWarning: "cells with scope in {QB, RB, WR, TE} replace the defence number for ONE " +
      "position and keep the shipped (leaky, season-total) defense.json for the other three. " +
      "Their raw pctOfGapClosed therefore INHERITS most of the incumbent's leak and must never " +
      "be read against the scope=all column — the comparable quantity is deltaVsIncumbent, " +
      "which shares the leak on both sides.",
    placebo: plc,
    placeboCells: placeboRows.map((r) => ({ method: r.method, scope: r.scope, format: r.format,
      seed: r.seed, value: r.value, defWeight: r.defWeight, pctOfGapClosed: r.pctOfGapClosed,
      t: r.t, deltaVsIncumbent: r.deltaVsIncumbent })),
    maeVsDecision, verdict,
    unmeasured: [
      "Cross-season carry-over of the defence number: every table restarts at week 1 with no " +
        "prior-season prior for the DECOMPOSITION (the component fit does carry prior seasons). " +
        "A prior-season defence prior would help most in weeks 1-3, which is where the table is " +
        "thinnest, and it is not measured here.",
      "Personnel: a defence that lost its top cornerback in week 6 is the whole reason a rolling " +
        "window should win, and no source in this repo carries snap-level personnel history. " +
        "The rolling-window contrast therefore measures 'recency' and not 'the thing that changed'.",
      "Pass-rush / coverage split rather than points-allowed-by-position, which is what the " +
        "public numbers actually are. Not available without play-level data.",
      "The 0.80-1.25 clamp is inherited unmeasured. Every method cell shares it, so it cannot " +
        "explain a difference BETWEEN cells; the oracle rows bound what it costs, but no cell " +
        "refits the clamp itself.",
      "K and DST positions are not in the weekly matrix, so they are in no lineup here — and " +
        "defence-versus-position for a KICKER is exactly where a hard matchup number would be " +
        "most plausible.",
      "Home/away and weather are not in any defence table here; both plausibly belong in a " +
        "matchup term and neither is in the shipped one either.",
      "The player-clustered bootstrap resamples PLAYERS and holds the drafted rosters fixed, so " +
        "its interval is outcome uncertainty at given rosters, not selection uncertainty.",
      "The player-clustered interval was computed for a SELECTED subset of cells (everything " +
        "clearing the placebo ceiling, plus the best cell in each format x scope, plus the " +
        "season/K6 family representatives) rather than all 2700, because it costs a full " +
        "contribution pass per cell. The selection cannot change the verdict — the 'clears the " +
        "ceiling' test is evaluated from the first pass, and the answer there is zero cells in " +
        "every format — but a cell outside the subset carries `ciPlayer: undefined` and must not " +
        "be read as 'interval included zero'.",
      "Whether a defence table helps MORE in some game contexts than others (big favourite, " +
        "high total, divisional) is not split out. gameScript already carries the market line, " +
        "so an interaction between the two terms is plausible and unmeasured.",
    ],
  }, null, 1));
  console.log(`\n-> data/measure/defweek.json`);
}

/** 400-itrana skiptifitting fra grunni — adeins fyrir samruna-akkerid. */
function coldFit(obs, y, NT, K, iters) {
  const arr = new Float64Array((MAXW + 1) * NT * 4).fill(NaN);
  for (const pos of POSS) {
    const rows = obs[y][pos].filter((r) => r.week < MAXW);
    if (rows.length < 8) continue;
    const mu = mean(rows.map((r) => r.y));
    const nOff = new Float64Array(NT), nDef = new Float64Array(NT);
    for (const r of rows) { nOff[r.off]++; nDef[r.def]++; }
    const off = new Float64Array(NT), def = new Float64Array(NT);
    for (let it = 0; it < iters; it++) {
      const sOff = new Float64Array(NT);
      for (const r of rows) sOff[r.off] += r.y - mu - def[r.def];
      for (let t = 0; t < NT; t++) off[t] = nOff[t] ? sOff[t] / (nOff[t] + K) : 0;
      const sDef = new Float64Array(NT);
      for (const r of rows) sDef[r.def] += r.y - mu - off[r.off];
      for (let t = 0; t < NT; t++) def[t] = nDef[t] ? sDef[t] / (nDef[t] + K) : 0;
    }
    for (let t = 0; t < NT; t++) {
      if (!nDef[t]) continue;
      arr[((MAXW * NT) + t) * 4 + PI[pos]] = mu ? (mu + def[t]) / mu : 1;
    }
  }
  return arr;
}

main().catch((e) => { console.error(e); process.exit(1); });
