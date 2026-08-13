/* ============================================================
   handcuff-lab.mjs — HVAD ER VARAMADUR VIRDI, OG HVAD LIFIR AF
   THVI THEGAR BYRJUNARMADURINN KEMUR TIL BAKA?

   Keyrsla:  node scripts/handcuff-lab.mjs
   Skrifar:  data/measure/handcuff.json
   Tengir:   EKKERT. Thetta er maeling, ekki breyting a src/.

   ============================================================
   SPURNINGIN, OG HVERS VEGNA HUN ER TVENNT
   ============================================================
   Notandinn spurdi um "handcuff"-leikmenn: varamanninn sem tekur
   yfir thegar byrjunarmadurinn er fjarri — og benti a gildruna:

     "kannski meiddist byrjunarlidsmadurinn en hann er aaetladur
      strax i naesta leik, tha verdur gaurinn sem stod sig mjog vel
      ekki relevant."

   THAD ER TVENNT OG ADEINS ANNAD ER MAELANLEGT MED THVI SEM ER A
   DISKNUM:

   1. MAELANLEGT — "hvad er varamadur virdi thegar byrjunarmadurinn
      spilar ekki, og hvad er hann virdi VIKUNA EFTIR ad hann kemur
      til baka?" Baedi spikid og HRUNID eru i vikugognunum sjalfum,
      2019-2025, og hvorugt tharf frett.

   2. EKKI MAELANLEGT — "hann er aaetladur strax i naesta leik".
      Thad er FRETT, og frettir eru ekki bakprofanlegar her:
        · `data/news.json` ber 50 greinar og er RULLANDI GLUGGI.
          Ekkert safn. Thad er engin skra um hvad frettir sogdu i
          viku 5 arid 2023.
        · `injuryNote` er a 28 leikmonnum af ~1.040, oll ur Sleeper
          (ESPN gaf 0 — meidsla-fylkid var maelt og tekid ut).
        · `depth`/`depthPos` er ADEINS NUVERANDI stada (nakvaemlega
          32 RB1 og 32 RB2, ein per lid), ekki soguleg.

      Thess vegna er "byrjunarmadur spiladi ekki" skilgreint UR
      VIKUGOGNUNUM SJALFUM og `depth` er ALDREI notad her. Thad sem
      tharf frettasogu er skrad i `unmeasured` og ekki nalgad. Nalgun
      sem litur ut eins og maeling er versta utkoman (CLAUDE.md 3).

   ============================================================
   FJARVIST A MOTI SLOKU GENGI — SKURDURINN, OG HANN ER ONAKVAEMUR
   ============================================================
   `data/weekly/*.json` kemur ur nflverse `stats_player_week` og ber
   ENGA snap-tolu. Rod er til thegar leikmadur skradi tolfraedi.
   Thess vegna:

     FJARVIST = ENGIN ROD i vikunni MEDAN LIDID SPILADI.

   Lidsvikan er lesin ur `schedule_history.json`, svo audar vikur
   (bye) eru utilokadar med byggingu — akkeri 5 fellir keyrsluna ef
   eitt einasta atvik lendir a viku an leiks.

   TVIRAEDU RADIRNAR ERU TALDAR OG BIRTAR (`cut.ambiguous`): rod sem
   ER til en ber 0 snertingar. Sa madur var i leiknum (eda skradi
   eitthvad annad) en fekk ekkert — thad les eins og fjarvist i
   snerti-skurdi og er thad ekki. Adalskurdurinn telur hann SPILANDI;
   naemnis-keyrsla (`sensitivity`) telur hann fjarverandi og bæði
   tolurnar eru birtar. Ad fela thetta vaeri ad segjast hafa maelt
   fjarvist thegar maelt var "fekk ekkert".

   ============================================================
   ENGINN LEKI — HVER SKILGREINING ER UR FYRRI VIKUM
   ============================================================
   "Venjulega spilar", "hver er varamadurinn" og "hvad er hann virdi
   venjulega" eru OLL reiknud ur vikum < atburdarviku, innan sama
   timabils. Ekkert theirra ma sja utkomuna. Thad er ekki smekkur:
   vaeri byrjunarmadurinn valinn ur ALLRI arssummu myndi valid sjalft
   vita ad hann meiddist (hann faerdist nidur listann), og "spikid"
   yrdi maelt a manni sem var valinn AF THVI ad hann spikadi.

   ============================================================
   PLACEBO-FAMILIAN ER MAELITAEKID, EKKI SKRAUT
   ============================================================
   Atta akveðin hávaða-"fjarvist" (fast fræ) fara gegnum NAKVAEMLEGA
   sama net: sama skilgreining a byrjunarmanni, sama vali a varamanni,
   somu grunnlinu, somu viku-offsetum — en atburdarvikan er vika thar
   sem byrjunarmadurinn SPILADI. Their gefa raunverulegu nulldreifing-
   una. I `opp-lab` nadi havadi |t| = 3,50 og +58,2 stig i einstoku
   holfi; an familiunnar hefdi taflan stutt naerri hvada nidurstodu
   sem er. PLACEBO-THAKID ER THROSKULDURINN, ekki nullid.

   ============================================================
   BOOTSTRAP KLASADUR PER LEIKMANN RAEDUR
   ============================================================
   `vbdbase-lab` fekk 29 holf sem standast bootstrap klasadan eftir
   timabili og 0 af 153 sem standast hann klasadan per leikmann
   (README 4c). Timabils-klosun endursynir ARIN en heldur leikmanna-
   lauginni fastri. Baedi eru birt her; PER LEIKMANN RAEDUR.
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { normTeam } from "../src/names.js";
import { replacementRanks } from "../src/model.js";
import { normalizeLeague } from "../src/build.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const DATA = path.resolve(process.cwd(), "data");
const OUT = path.join(DATA, "measure", "handcuff.json");

const DEFAULTS = { from: 2019, to: 2025, runs: 2000, seed: 8121 };
const args = parseArgs(process.argv.slice(2),
  { from: "number", to: "number", runs: "number", seed: "number" }, DEFAULTS);

const FROM = Math.max(2019, Math.round(args.from));
const TO = Math.min(2025, Math.round(args.to));
const RUNS = Math.max(200, Math.round(args.runs));
const SEED = Math.round(args.seed);

const POS = ["QB", "RB", "WR", "TE"];
const FORMATS = ["ppr", "half", "std"];

/* ============================================================
   THROSKULDAR — HVER OG HVERS VEGNA
   ============================================================
   MIN_TOUCH er "er thessi madur raunverulega byrjunarmadur a stodu
   sinni". Tolurnar eru LAGAR viljandi: haerra golf vaeldi ADEINS
   stjornurnar og tha vaeri maelt "hvad gerist thegar stjarna er
   fjarri", sem er onnur og thraengri spurning. Thau eru midgildi-
   nálæg per stodu i lauginni (RB 8 snertingar, WR 4 markmid, TE 3,
   QB 15 sendingar) og keyrslan telur hve marga thau hleypa ad, svo
   valid se laesilegt i utkomuskranni (`eligibility`).                */
const MIN_TOUCH = { QB: 15, RB: 8, WR: 4, TE: 3 };
/* Fyrri vikur sem tharf til ad SKILGREINA hlutverk. Threr eru
   lágmarkid sem gefur medaltal sem ekki er ein vika i dulargervi. */
const MIN_PRIOR_GAMES = 3;
/* Varamadurinn tharf tvaer fyrri vikur — annars er "grunnlinan hans"
   ein vika, og delta gegn einni viku er hávaði gegn hávaða. */
const MIN_BACKUP_PRIOR = 2;
/* Grunnlinan er reiknud ADEINS ur vikum thar sem byrjunarmadurinn
   SPILADI — thad er "venjulega" i thessari spurningu. */
const MIN_BASELINE_WEEKS = 2;

/* Snerting per stodu: QB er sendingatilraunir, adrir hlaup+markmid.
   Thetta er EINA staðurinn sem skilgreinir "snertingu" og hann er
   notadur baedi i vali byrjunarmanns og i hlutdeildar-maelingunni. */
const touchOf = (r) => (r.pos === "QB" ? n0(r.att) : n0(r.car) + n0(r.tgt));

/* ============================================================
   1. GOGNIN
   ============================================================ */
const seasons = [];
for (let y = FROM; y <= TO; y++) seasons.push(y);

const schedRaw = JSON.parse(readFileSync(path.join(DATA, "schedule_history.json"), "utf8"));
const games = (schedRaw.games || []).filter((g) => g.type === "REG" && seasons.includes(g.season));

/* Lidsvikur. `normTeam` er BEITT HER: `schedule_history` ber hráu
   nflverse-heitin (LA, OAK) medan vikuskrarnar eru thegar samraemdar
   gegnum sama fall. An thess mældust LAR og LV med NULL leikjavikur
   og hver einasti leikmadur theirra hefdi lesist sem fjarverandi. */
const teamWeeks = new Map();            // season -> team -> sorted week[]
for (const g of games) {
  if (!teamWeeks.has(g.season)) teamWeeks.set(g.season, new Map());
  const m = teamWeeks.get(g.season);
  for (const t of [normTeam(g.home), normTeam(g.away)]) {
    if (!m.has(t)) m.set(t, new Set());
    m.get(t).add(g.week);
  }
}
for (const [, m] of teamWeeks) {
  for (const [t, s] of m) m.set(t, [...s].sort((a, b) => a - b));
}

const weekly = new Map();               // season -> rows
for (const y of seasons) {
  const rows = JSON.parse(readFileSync(path.join(DATA, `weekly/${y}.json`), "utf8"))
    .filter((r) => POS.includes(r.pos) && r.team && r.week != null);
  weekly.set(y, rows);
}

/* Tviraedu radirnar — TALDAR ADUR EN NOKKUD ER MAELT. */
const ambiguous = { rows: 0, zeroTouchRows: 0, zeroTouchZeroPts: 0, perPos: {} };
for (const y of seasons) for (const r of weekly.get(y)) {
  ambiguous.rows++;
  if (touchOf(r) === 0) {
    ambiguous.zeroTouchRows++;
    if (n0(r.ppr) === 0) ambiguous.zeroTouchZeroPts++;
    ambiguous.perPos[r.pos] = (ambiguous.perPos[r.pos] || 0) + 1;
  }
}

/* Visar per timabil, byggdir EINU SINNI. */
const idxBySeason = new Map();
for (const y of seasons) {
  const rows = weekly.get(y);
  const byTeamPos = new Map();          // "team|pos" -> week -> rows[]
  const byPlayer = new Map();           // id -> week -> row
  const byPosWeek = new Map();          // "pos|week" -> rows[]
  const teamTouch = new Map();          // "team|pos|week" -> total touches
  for (const r of rows) {
    const k = `${r.team}|${r.pos}`;
    if (!byTeamPos.has(k)) byTeamPos.set(k, new Map());
    const m = byTeamPos.get(k);
    if (!m.has(r.week)) m.set(r.week, []);
    m.get(r.week).push(r);

    if (!byPlayer.has(r.id)) byPlayer.set(r.id, new Map());
    byPlayer.get(r.id).set(r.week, r);

    const pk = `${r.pos}|${r.week}`;
    if (!byPosWeek.has(pk)) byPosWeek.set(pk, []);
    byPosWeek.get(pk).push(r);

    const tk = `${r.team}|${r.pos}|${r.week}`;
    teamTouch.set(tk, (teamTouch.get(tk) || 0) + touchOf(r));
  }
  idxBySeason.set(y, { byTeamPos, byPlayer, byPosWeek, teamTouch });
}

/* ============================================================
   2. VARAMANNS-LINAN — YFIR HVERJU DELTA ER MAELT
   ============================================================
   "Stig" ein og ser svara engri akvordun: 9 stig er godur TE og
   slakur RB. Thess vegna er hver utkoma lika maeld gegn RAUNVERU-
   LEGRI varamannslinu vikunnar: stig thess sem endadi i sæti K a
   sinni stodu i theirri viku, thar sem K kemur UR `replacementRanks`
   i `model.js` — ekki handskrifad her. Ein utfaersla a saetunum,
   annars gaeti thessi maeling notad annad varamannsthrep en appid.

   THETTA ER RAUNMAELT HUNDRADSHLUTFALL, EKKI AKVORDUN. Enginn gat
   valid thennan mann fyrirfram; hann er kvardinn sem segir hvort
   tala se startandi eda bekkjar-ryk.                                */
const LEAGUE = normalizeLeague({});
const REPL = replacementRanks(LEAGUE);
const replLine = new Map();             // "season|pos|week|fmt" -> points
for (const y of seasons) {
  const { byPosWeek } = idxBySeason.get(y);
  for (const [pk, rows] of byPosWeek) {
    const [pos, wk] = pk.split("|");
    const K = REPL[pos];
    for (const f of FORMATS) {
      const vals = rows.map((r) => n0(r[f])).sort((a, b) => b - a);
      const v = K > 0 && vals.length >= K ? vals[K - 1] : null;
      replLine.set(`${y}|${pos}|${wk}|${f}`, v);
    }
  }
}
const lineFor = (y, pos, wk, f) => replLine.get(`${y}|${pos}|${wk}|${f}`) ?? null;

/* ============================================================
   3. ATBURDA-NETID — EITT FALL, TVO INNTOK
   ============================================================
   Raunveruleg fjarvist og placebo fara gegnum THETTA SAMA FALL. Thad
   er skilyrdid sem gerir placebo-thakid gilt: vaeri netid tvirit
   gaeti placebo verid maelt a odru neti en raunin og samanburdurinn
   segdi ekkert.

   `mode` er "real" eda seed-tala. Fyrir "real" er atburdur = fyrsta
   vika fjarvistar. Fyrir placebo er atburdur = akvedin hávaða-vika
   thar sem byrjunarmadurinn SPILADI, med sama tidnihlutfalli per
   stodu, svo fjoldinn se sambaerilegur.                              */

/** Akveðin hávaða-tala ur (timabil, lid, stada, vika, fræ) — engin
 *  slembivel, svo keyrslan se endurgeranleg upp a bit. */
function noise01(season, team, pos, week, seed) {
  let h = (2166136261 ^ (seed * 16777619)) >>> 0;
  const s = `${season}|${team}|${pos}|${week}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ((h >>> 8) & 0xffffff) / 0x1000000;
}

/**
 * Hlutverk ur FYRRI vikum eingongu.
 * Skilar { starter, backup, others, teamGames } eda null.
 */
function rolesBefore(y, team, pos, priorWeeks) {
  const { byTeamPos } = idxBySeason.get(y);
  const m = byTeamPos.get(`${team}|${pos}`);
  if (!m) return null;
  const agg = new Map();
  for (const pw of priorWeeks) {
    for (const r of (m.get(pw) || [])) {
      const a = agg.get(r.id) || { id: r.id, name: r.name, pos, games: 0, touch: 0, pts: 0, firstWeek: pw };
      a.games++; a.touch += touchOf(r); a.pts += n0(r.ppr);
      a.firstWeek = Math.min(a.firstWeek, pw);
      agg.set(r.id, a);
    }
  }
  const all = [...agg.values()].map((a) => ({ ...a, tpg: a.touch / a.games }));
  const starters = all.filter((a) => a.games >= MIN_PRIOR_GAMES && a.tpg >= MIN_TOUCH[pos]);
  if (!starters.length) return null;
  starters.sort((a, b) => b.tpg - a.tpg || (a.id < b.id ? -1 : 1));
  const starter = starters[0];
  const rest = all.filter((a) => a.id !== starter.id && a.games >= MIN_BACKUP_PRIOR);
  rest.sort((a, b) => b.tpg - a.tpg || (a.id < b.id ? -1 : 1));
  return { starter, backup: rest[0] || null, others: rest, all };
}

const playedIn = (y, id, wk) => {
  const row = idxBySeason.get(y).byPlayer.get(id)?.get(wk);
  return row || null;
};
/* Naemnis-skurdurinn: rod med 0 snertingum OG 0 stigum er talin
   fjarvist. Adalskurdurinn notar `playedIn` (rod = spiladi). */
const playedStrict = (y, id, wk) => {
  const row = playedIn(y, id, wk);
  if (!row) return null;
  if (touchOf(row) === 0 && n0(row.ppr) === 0) return null;
  return row;
};

/**
 * Byggir atburdaskrana. `strict` velur skurdinn, `mode` velur hvort
 * atburdirnir eru raunverulegir eda placebo.
 */
function collectEvents({ mode = "real", strict = false, rate = null } = {}) {
  const played = strict ? playedStrict : playedIn;
  const events = [];
  const elig = { starterWeeks: 0, absentWeeks: 0, spellStarts: 0,
                 noBackup: 0, thinBaseline: 0, byePlacedOnNonGameWeek: 0, kept: 0 };

  for (const y of seasons) {
    const tw = teamWeeks.get(y);
    const { teamTouch } = idxBySeason.get(y);
    for (const [team, gw] of tw) {
      for (const pos of POS) {
        for (let i = 0; i < gw.length; i++) {
          const w = gw[i];
          const prior = gw.slice(0, i);
          if (prior.length < MIN_PRIOR_GAMES) continue;
          const roles = rolesBefore(y, team, pos, prior);
          if (!roles) continue;
          elig.starterWeeks++;

          const starterHere = played(y, roles.starter.id, w);
          let isEvent = false;
          if (mode === "real") {
            /* Fyrsta vika fjarvistar: hann vantar NU og var TIL i
               sidustu lidsviku. An sidara skilyrdisins yrdi hver
               vika langrar fjarvistar talin sem nytt atvik og somu
               gognin taldar margfalt. */
            if (!starterHere) {
              elig.absentWeeks++;
              const prevW = gw[i - 1];
              if (played(y, roles.starter.id, prevW)) isEvent = true;
            }
          } else {
            /* PLACEBO: vika thar sem hann SPILADI, valin med hávaða. */
            if (starterHere && rate != null &&
                noise01(y, team, pos, w, mode) < rate[pos]) isEvent = true;
          }
          if (!isEvent) continue;
          elig.spellStarts++;

          const backup = roles.backup;
          if (!backup) { elig.noBackup++; continue; }

          /* Grunnlina varamannsins: vikur < w thar sem byrjunar-
             madurinn SPILADI og varamadurinn var thegar komin i
             lidid (fra sinni fyrstu viku). Vika an radar telst 0 —
             hun er 0 stig i BYRJUNARLIDI THINU, sem er akvordunin
             sem verid er ad verdleggja. */
          const baseWeeks = prior.filter((pw) => pw >= backup.firstWeek && played(y, roles.starter.id, pw));
          if (baseWeeks.length < MIN_BASELINE_WEEKS) { elig.thinBaseline++; continue; }
          const baseline = {}, basePlayedOnly = {};
          for (const f of FORMATS) {
            const vals = baseWeeks.map((pw) => n0(playedIn(y, backup.id, pw)?.[f]));
            baseline[f] = mean(vals);
            const pv = baseWeeks.map((pw) => playedIn(y, backup.id, pw)).filter(Boolean).map((r) => n0(r[f]));
            basePlayedOnly[f] = pv.length ? mean(pv) : null;
          }

          /* Fjarvistar-runan: samfelldar lidsvikur thar sem hann er
             fjarri. Fyrir placebo er hun ALLTAF 1 vika, thvi hann
             spiladi — thad er nefnt i utkomuskranni. */
          const spell = [];
          let j = i;
          while (j < gw.length && !played(y, roles.starter.id, gw[j])) { spell.push(gw[j]); j++; }
          if (mode !== "real") spell.length = 0, spell.push(w);
          const returnWeek = mode === "real"
            ? (j < gw.length ? gw[j] : null)
            : (i + 1 < gw.length ? gw[i + 1] : null);
          const after = returnWeek == null ? [] : gw.slice(gw.indexOf(returnWeek));

          /* Akkeri 4 (lidsleg snerti-vardveisla) tharf thessar tolur:
             fer vinnan til einhvers annars, eda hverfur hun? */
          const priorTeamTouch = mean(baseWeeks.map((pw) => teamTouch.get(`${team}|${pos}|${pw}`) || 0));
          const spellTeamTouch = spell.length
            ? mean(spell.map((sw) => teamTouch.get(`${team}|${pos}|${sw}`) || 0)) : null;

          /* Hlutdeild varamannsins i FYRSTU fjarvistarviku — inntakid
             i spurningunni "er lifandi hlutfallid forspaanlegt?".
             Hun er maeld i spike-vikunni og utkoman er NAESTA vika,
             svo thetta er ekki leki. */
          const sRow = playedIn(y, backup.id, spell[0]);
          const tTouch = teamTouch.get(`${team}|${pos}|${spell[0]}`) || 0;
          const share = sRow && tTouch > 0 ? touchOf(sRow) / tTouch : (sRow ? null : 0);

          const at = (wk) => {
            if (wk == null) return null;
            const row = playedIn(y, backup.id, wk);
            const o = { week: wk, played: !!row };
            for (const f of FORMATS) {
              o[f] = n0(row?.[f]);
              o[`line_${f}`] = lineFor(y, pos, wk, f);
            }
            return o;
          };

          events.push({
            season: y, team, pos,
            starterId: roles.starter.id, starterName: roles.starter.name,
            starterTpg: r2(roles.starter.tpg),
            backupId: backup.id, backupName: backup.name,
            backupPriorTpg: r2(backup.tpg), backupPriorGames: backup.games,
            spellStart: w, spellLen: spell.length, returnWeek,
            neverReturned: returnWeek == null,
            baseline, basePlayedOnly, baseWeeks: baseWeeks.length,
            priorTeamTouch: r2(priorTeamTouch), spellTeamTouch: r2(spellTeamTouch),
            share: share == null ? null : r2(share),
            out1: at(spell[0]),
            out2: at(spell[1] ?? null),
            back1: at(after[0] ?? null),
            back2: at(after[1] ?? null),
            back3: at(after[2] ?? null),
            /* EX-POST toppvaramadur: sa lidsfelagi a stodunni sem FEKK
               mest i fyrstu fjarvistarviku. Hann er ORAKEL og er
               merktur svo — hann segir hvort netid geti sed hrifin
               yfirleitt (akkeri 3), ekki hvad var haegt ad velja. */
            expost: exPostTop(y, team, pos, spell[0], roles.starter.id),
          });
          elig.kept++;
          if (!tw.get(team).includes(w)) elig.byePlacedOnNonGameWeek++;
        }
      }
    }
  }
  return { events, elig };
}

function exPostTop(y, team, pos, wk, starterId) {
  const rows = (idxBySeason.get(y).byTeamPos.get(`${team}|${pos}`)?.get(wk) || [])
    .filter((r) => r.id !== starterId);
  if (!rows.length) return null;
  rows.sort((a, b) => touchOf(b) - touchOf(a) || (a.id < b.id ? -1 : 1));
  const r = rows[0];
  const o = { id: r.id, name: r.name };
  for (const f of FORMATS) o[f] = n0(r[f]);
  return o;
}

/* ============================================================
   4. TOLFRAEDIN — SOMU VERKFAERI OG ONNUR SOFN
   ============================================================
   `t` er reiknad ur MEDALTOLUM PER TIMABIL (n = ar), ekki ur rodum:
   radir innan sama ars eru ekki ohadar. Vikmorkin eru gefin i BADAR
   attir — klasad eftir timabili og klasad PER LEIKMANN — og thad
   sidara raedur (README 4c).                                        */
const T_CRIT = { 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365,
                 8: 2.306, 9: 2.262, 10: 2.228 };
const tCritFor = (n) => T_CRIT[n - 1] ?? 1.96;

function statCell(items, valueOf, keyOf) {
  const vals = [], perSeason = new Map(), perPlayer = new Map();
  for (const e of items) {
    const v = valueOf(e);
    if (v == null || !Number.isFinite(v)) continue;
    vals.push(v);
    if (!perSeason.has(e.season)) perSeason.set(e.season, []);
    perSeason.get(e.season).push(v);
    const pk = keyOf(e);
    if (!perPlayer.has(pk)) perPlayer.set(pk, []);
    perPlayer.get(pk).push(v);
  }
  if (!vals.length) return null;
  const yearMeans = [...perSeason.entries()].sort((a, b) => a[0] - b[0]).map(([y, xs]) => [y, mean(xs)]);
  const ym = yearMeans.map(([, v]) => v);
  const years = ym.length;
  const m = mean(vals);
  const sd = years > 1 ? Math.sqrt(ym.reduce((a, b) => a + (b - mean(ym)) ** 2, 0) / (years - 1)) : null;
  const t = sd && sd > 0 ? mean(ym) / (sd / Math.sqrt(years)) : null;
  return {
    mean: r2(m), meanOfYearMeans: r2(mean(ym)), n: vals.length, years,
    positive: ym.filter((v) => v > 0).length,
    t: t == null ? null : r2(t), tCrit: tCritFor(years),
    significantByT: t != null && Math.abs(t) > tCritFor(years),
    ciSeason: bootClusters(perSeason, RUNS, SEED),
    ciPlayer: bootClusters(perPlayer, RUNS, SEED + 1),
    perSeason: Object.fromEntries(yearMeans.map(([y, v]) => [y, r2(v)])),
  };
}

/** Bootstrap a medaltali, KLASAD. Klasar eru endursyndir, ekki radir. */
function bootClusters(groups, runs, seed) {
  const keys = [...groups.keys()];
  if (keys.length < 3) return null;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = [];
  for (let r = 0; r < runs; r++) {
    let sum = 0, cnt = 0;
    for (let i = 0; i < keys.length; i++) {
      const arr = groups.get(keys[Math.floor(rnd() * keys.length)]);
      for (const v of arr) { sum += v; cnt++; }
    }
    out.push(cnt ? sum / cnt : 0);
  }
  out.sort((a, b) => a - b);
  const lo = out[Math.floor(runs * 0.025)], hi = out[Math.floor(runs * 0.975)];
  return { lo: r2(lo), hi: r2(hi), clusters: keys.length, excludesZero: lo > 0 || hi < 0 };
}

/* ============================================================
   5. KEYRSLAN
   ============================================================ */
console.log(`\n  handcuff-lab — ${seasons[0]}-${seasons[seasons.length - 1]}, ` +
            `${RUNS} bootstrap-itranir, fræ ${SEED}\n`);

const real = collectEvents({ mode: "real" });
const strictRun = collectEvents({ mode: "real", strict: true });
requireSeasons([...new Set(real.events.map((e) => e.season))], "timabil med fjarvistum");

console.log(`  Fjarvistar-atvik: ${real.events.length} (skurdur: engin rod)`);
console.log(`  Naemni (0 snertingar + 0 stig = fjarvist): ${strictRun.events.length}`);
const perPosCount = {};
for (const e of real.events) perPosCount[e.pos] = (perPosCount[e.pos] || 0) + 1;
console.log(`  Per stodu: ${POS.map((p) => `${p} ${perPosCount[p] || 0}`).join(" · ")}`);
console.log(`  Tviraedar radir (rod til, 0 snertingar): ${ambiguous.zeroTouchRows} af ` +
            `${ambiguous.rows} (${(100 * ambiguous.zeroTouchRows / ambiguous.rows).toFixed(1)}%)\n`);

/* Placebo-tidni: sama fjoldi atvika per stodu, en a vikum thar sem
   byrjunarmadurinn SPILADI. Hlutfallid er reiknad ur raunfjoldanum,
   svo placebo se ekki maeldur a odru urtaki. */
const eligPlayedWeeks = {};
{
  const tmp = collectEvents({ mode: 0, rate: Object.fromEntries(POS.map((p) => [p, 1])) });
  for (const e of tmp.events) eligPlayedWeeks[e.pos] = (eligPlayedWeeks[e.pos] || 0) + 1;
}
const RATE = Object.fromEntries(POS.map((p) =>
  [p, Math.min(1, (perPosCount[p] || 0) / Math.max(1, eligPlayedWeeks[p] || 1))]));
const PLACEBO_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const placeboRuns = PLACEBO_SEEDS.map((s) => ({ seed: s, ...collectEvents({ mode: s, rate: RATE }) }));
console.log(`  Placebo: ${PLACEBO_SEEDS.length} fræ, ` +
            `${placeboRuns.map((p) => p.events.length).join("/")} atvik ` +
            `(raun ${real.events.length})\n`);

/* ------------------------------------------------------------
   ATBURDIR × VIKU-OFFSET — thad sem taflan spyr um.
   `vsBase` er delta gegn grunnlinu MANNSINS SJALFS; `vsLine` er
   gegn varamannslinu VIKUNNAR. Baedi eru birt: fyrra segir "hvad
   breyttist fyrir hann", sidara segir "var hann startandi".
   ------------------------------------------------------------ */
const OFFSETS = [
  ["out+1", "out1", "first week the starter is absent"],
  ["out+2", "out2", "second consecutive absent week"],
  ["back+1", "back1", "first week the starter is back"],
  ["back+2", "back2", "second week after the return"],
  ["back+3", "back3", "third week after the return"],
];

function cellsFor(events) {
  const out = {};
  for (const pos of POS) {
    const ev = events.filter((e) => e.pos === pos);
    out[pos] = {};
    for (const [label, key] of OFFSETS) {
      out[pos][label] = {};
      for (const f of FORMATS) {
        out[pos][label][f] = {
          vsBase: statCell(ev, (e) => (e[key] ? e[key][f] - e.baseline[f] : null), (e) => e.backupId),
          vsLine: statCell(ev, (e) => (e[key] && e[key][`line_${f}`] != null
            ? e[key][f] - e[key][`line_${f}`] : null), (e) => e.backupId),
          raw: statCell(ev, (e) => (e[key] ? e[key][f] : null), (e) => e.backupId),
        };
      }
    }
  }
  return out;
}

const results = cellsFor(real.events);
const strictResults = cellsFor(strictRun.events);
const placeboCells = placeboRuns.map((p) => ({ seed: p.seed, cells: cellsFor(p.events) }));

/* Placebo-thak per holf: haesta |medaltal| og haesta |t| sem NOKKUR
   hávaða-keyrsla naer i SAMA holfi. Thad er throskuldurinn. */
function placeboCeiling(pos, label, f, metric) {
  const ms = [], ts = [];
  for (const p of placeboCells) {
    const c = p.cells[pos]?.[label]?.[f]?.[metric];
    if (!c) continue;
    ms.push(c.mean); if (c.t != null) ts.push(Math.abs(c.t));
  }
  if (!ms.length) return null;
  return {
    seeds: ms.length,
    mean: r2(mean(ms)),
    maxAbsMean: r2(Math.max(...ms.map(Math.abs))),
    minMean: r2(Math.min(...ms)), maxMean: r2(Math.max(...ms)),
    maxAbsT: ts.length ? r2(Math.max(...ts)) : null,
    perSeed: ms.map((m, i) => r2(m)),
  };
}
for (const pos of POS) for (const [label] of OFFSETS) for (const f of FORMATS) {
  for (const metric of ["vsBase", "vsLine", "raw"]) {
    const cell = results[pos][label][f][metric];
    if (!cell) continue;
    cell.placebo = placeboCeiling(pos, label, f, metric);
    cell.beatsPlacebo = cell.placebo != null &&
      Math.abs(cell.mean) > cell.placebo.maxAbsMean &&
      (cell.t == null || cell.placebo.maxAbsT == null || Math.abs(cell.t) > cell.placebo.maxAbsT);
  }
}

/* ------------------------------------------------------------
   HVAD LIFIR? — hlutfall spike-sins sem eftir stendur.
   Maelt ADEINS thar sem spike var raunverulegt (delta > 0 i out+1)
   OG endurkomuvika er til. Hlutfall af negatifu spike er merkingar-
   laust, svo thau atvik eru talin og sleppt, ekki thogud.
   ------------------------------------------------------------ */
function survivalFor(events, f) {
  const use = events.filter((e) => e.out1 && e.back1 &&
    (e.out1[f] - e.baseline[f]) > 0);
  if (!use.length) return null;
  const ratios = use.map((e) => (e.back1[f] - e.baseline[f]) / (e.out1[f] - e.baseline[f]));
  const sorted = ratios.slice().sort((a, b) => a - b);
  return {
    n: use.length,
    spike: r2(mean(use.map((e) => e.out1[f] - e.baseline[f]))),
    afterReturn: r2(mean(use.map((e) => e.back1[f] - e.baseline[f]))),
    survivedPoints: r2(mean(use.map((e) => e.back1[f] - e.baseline[f]))),
    survivedShareMean: r2(mean(ratios)),
    survivedShareMedian: r2(sorted[Math.floor(sorted.length / 2)]),
    survivedOfSpikePct: r2(100 * mean(use.map((e) => e.back1[f] - e.baseline[f])) /
                           mean(use.map((e) => e.out1[f] - e.baseline[f]))),
    droppedEvents: events.filter((e) => e.out1 && e.back1 && (e.out1[f] - e.baseline[f]) <= 0).length,
  };
}
const survival = {};
for (const pos of POS) {
  survival[pos] = {};
  for (const f of FORMATS) survival[pos][f] = survivalFor(real.events.filter((e) => e.pos === pos), f);
}

/* ------------------------------------------------------------
   ER LIFANDI HLUTFALLID FORSPAANLEGT UR HLUTDEILD?
   Klofid a midgildi hlutdeildar i spike-vikunni, INNAN stodu.
   Hlutdeildin er maeld i spike-vikunni og utkoman er NAESTA vika —
   engin leki. Placebo-thakid her er sama klofning a hávaða-
   atvikunum.
   ------------------------------------------------------------ */
function shareSplit(events, f) {
  const use = events.filter((e) => e.back1 && e.share != null);
  if (use.length < 20) return null;
  const shares = use.map((e) => e.share).sort((a, b) => a - b);
  const med = shares[Math.floor(shares.length / 2)];
  const hi = use.filter((e) => e.share >= med), lo = use.filter((e) => e.share < med);
  const val = (e) => e.back1[f] - e.baseline[f];
  const sHi = statCell(hi, val, (e) => e.backupId), sLo = statCell(lo, val, (e) => e.backupId);
  if (!sHi || !sLo) return null;
  const perSeason = new Map(), perPlayer = new Map();
  for (const e of use) {
    const d = val(e) * (e.share >= med ? 1 : -1);
    if (!perSeason.has(e.season)) perSeason.set(e.season, []);
    perSeason.get(e.season).push(d);
    if (!perPlayer.has(e.backupId)) perPlayer.set(e.backupId, []);
    perPlayer.get(e.backupId).push(d);
  }
  return {
    medianShare: r2(med), nHigh: hi.length, nLow: lo.length,
    high: sHi, low: sLo, diff: r2(sHi.mean - sLo.mean),
    ciSeason: bootClusters(perSeason, RUNS, SEED + 2),
    ciPlayer: bootClusters(perPlayer, RUNS, SEED + 3),
  };
}
const sharePredictive = {};
for (const pos of POS) {
  sharePredictive[pos] = {};
  for (const f of FORMATS) sharePredictive[pos][f] = shareSplit(real.events.filter((e) => e.pos === pos), f);
}
const sharePlacebo = {};
for (const pos of POS) {
  sharePlacebo[pos] = {};
  for (const f of FORMATS) {
    const ds = placeboRuns.map((p) => shareSplit(p.events.filter((e) => e.pos === pos), f))
      .filter(Boolean).map((q) => q.diff);
    sharePlacebo[pos][f] = ds.length ? { seeds: ds.length, maxAbs: r2(Math.max(...ds.map(Math.abs))), perSeed: ds } : null;
  }
}

/* ------------------------------------------------------------
   ER "HANN STOD SIG VEL I SIDUSTU VIKU" EITRADUR MAELIKVARDI?
   Thetta er beidnin sjalf, og hun er verdlogd i STIGUM I AKVORDUN:
   varamadurinn er STARTANDI i fjarvistarvikunni (yfir varamannslinu
   vikunnar — thad er thad sem notandinn SER a waiver-degi). Hann er
   tekinn upp. Hvad faest NAESTU viku, gegn varamannslinu THEIRRAR
   viku?

   Klofid a thvi hvort byrjunarmadurinn er kominn til baka. Grunn-
   tidnin — hve oft hann ER kominn — er thad sem gerir mælikvardann
   eitradan eda ekki, svo hun er birt vid hlidina.
   ------------------------------------------------------------ */
function decisionFor(events, f) {
  const spikes = events.filter((e) => e.out1 && e.out1[`line_${f}`] != null &&
    e.out1[f] >= e.out1[`line_${f}`]);
  if (!spikes.length) return null;
  /* Naesta lidsvika eftir spike-vikuna: hun er annadhvort onnur
     fjarvistarvika (out+2) eda endurkomuvikan (back+1). */
  const nextOf = (e) => (e.spellLen > 1 ? e.out2 : e.back1);
  const starterBack = (e) => e.spellLen === 1;
  const withNext = spikes.filter((e) => nextOf(e) && nextOf(e)[`line_${f}`] != null);
  const val = (e) => nextOf(e)[f] - nextOf(e)[`line_${f}`];
  const valBase = (e) => nextOf(e)[f] - e.baseline[f];
  const back = withNext.filter(starterBack), out = withNext.filter((e) => !starterBack(e));
  return {
    spikeEvents: spikes.length,
    withNextWeek: withNext.length,
    starterBackNextWeek: back.length,
    starterBackNextWeekPct: r2(100 * back.length / Math.max(1, withNext.length)),
    all: statCell(withNext, val, (e) => e.backupId),
    allVsOwnBaseline: statCell(withNext, valBase, (e) => e.backupId),
    starterBack: statCell(back, val, (e) => e.backupId),
    starterStillOut: statCell(out, val, (e) => e.backupId),
    spikeWeekVsLine: statCell(spikes, (e) => e.out1[f] - e.out1[`line_${f}`], (e) => e.backupId),
  };
}
const decision = {};
for (const pos of POS) {
  decision[pos] = {};
  for (const f of FORMATS) decision[pos][f] = decisionFor(real.events.filter((e) => e.pos === pos), f);
}
const decisionPlacebo = {};
for (const pos of POS) {
  decisionPlacebo[pos] = {};
  for (const f of FORMATS) {
    const ds = placeboRuns.map((p) => decisionFor(p.events.filter((e) => e.pos === pos), f))
      .filter((q) => q && q.all).map((q) => q.all.mean);
    decisionPlacebo[pos][f] = ds.length
      ? { seeds: ds.length, maxAbs: r2(Math.max(...ds.map(Math.abs))), perSeed: ds } : null;
  }
}

/* ------------------------------------------------------------
   HANDCUFF FYRIRFRAM — er varamadur a hlaupagladu lidi verdmaetari
   ADUR EN nokkud gerist?
   Skurdur i viku 5: allt skilgreint ur vikum 1-4 (hlutverk OG
   lidsmagn), utkoman er medalstig varamannsins i vikum 5+. Klofid a
   midgildi lidsmagns INNAN stodu og timabils, svo ar med hærri
   stigagjof i heild geti ekki drifið nidurstoduna.
   Nullid er sama klofning med STOKKUDUM lidsmerkjum, atta fræ.
   ------------------------------------------------------------ */
const CUT_WEEK_INDEX = 4;               // 4 lidsleikir a undan
function exAnteRows() {
  const rows = [];
  for (const y of seasons) {
    const tw = teamWeeks.get(y);
    const { teamTouch } = idxBySeason.get(y);
    for (const [team, gw] of tw) {
      if (gw.length <= CUT_WEEK_INDEX + 1) continue;
      const prior = gw.slice(0, CUT_WEEK_INDEX);
      const rest = gw.slice(CUT_WEEK_INDEX);
      for (const pos of POS) {
        const roles = rolesBefore(y, team, pos, prior);
        if (!roles || !roles.backup) continue;
        const vol = mean(prior.map((pw) => teamTouch.get(`${team}|${pos}|${pw}`) || 0));
        /* Hlaup-hlutfall lidsins: hlaup / (hlaup + sendingar) ur
           fyrri vikum. Thad er "hlaupamagn" spurningarinnar. */
        let car = 0, att = 0;
        for (const pw of prior) for (const p2 of POS) {
          for (const r of (idxBySeason.get(y).byTeamPos.get(`${team}|${p2}`)?.get(pw) || [])) {
            car += n0(r.car); att += n0(r.att);
          }
        }
        const runRate = car + att > 0 ? car / (car + att) : null;
        const out = { season: y, team, pos, backupId: roles.backup.id, backupName: roles.backup.name,
                      teamPosTouchG: r2(vol), teamRunRate: r2(runRate), weeks: rest.length };
        for (const f of FORMATS) {
          out[f] = r2(mean(rest.map((rw) => n0(playedIn(y, roles.backup.id, rw)?.[f]))));
        }
        rows.push(out);
      }
    }
  }
  return rows;
}
const exAnteAll = exAnteRows();
function exAnteSplit(rows, pos, f, field, shuffleSeed = null) {
  let use = rows.filter((r) => r.pos === pos && r[field] != null);
  if (use.length < 20) return null;
  if (shuffleSeed != null) {
    /* Nullid: sama klofning, en gildin a `field` eru stokkud INNAN
       timabils. Thad rifur sambandid en heldur dreifingunni og
       urtaksstaerdinni — nakvaemlega sami holfa-fjoldi. */
    const byY = new Map();
    for (const r of use) { if (!byY.has(r.season)) byY.set(r.season, []); byY.get(r.season).push(r); }
    let s = (shuffleSeed * 2654435761) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const next = [];
    for (const [, arr] of byY) {
      const vals = arr.map((r) => r[field]);
      for (let i = vals.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [vals[i], vals[j]] = [vals[j], vals[i]];
      }
      arr.forEach((r, i) => next.push({ ...r, [field]: vals[i] }));
    }
    use = next;
  }
  const perSeason = new Map(), perPlayer = new Map();
  const hiVals = [], loVals = [];
  const byY = new Map();
  for (const r of use) { if (!byY.has(r.season)) byY.set(r.season, []); byY.get(r.season).push(r); }
  for (const [y, arr] of byY) {
    const med = arr.map((r) => r[field]).sort((a, b) => a - b)[Math.floor(arr.length / 2)];
    for (const r of arr) {
      const d = r[f] * (r[field] >= med ? 1 : -1);
      if (r[field] >= med) hiVals.push(r[f]); else loVals.push(r[f]);
      if (!perSeason.has(y)) perSeason.set(y, []);
      perSeason.get(y).push(d);
      if (!perPlayer.has(r.backupId)) perPlayer.set(r.backupId, []);
      perPlayer.get(r.backupId).push(d);
    }
  }
  const yearMeans = [...perSeason.entries()].sort((a, b) => a[0] - b[0]).map(([, xs]) => mean(xs));
  const years = yearMeans.length;
  const sd = years > 1 ? Math.sqrt(yearMeans.reduce((a, b) => a + (b - mean(yearMeans)) ** 2, 0) / (years - 1)) : null;
  return {
    n: use.length, nHigh: hiVals.length, nLow: loVals.length,
    highMean: r2(mean(hiVals)), lowMean: r2(mean(loVals)),
    diff: r2(mean(hiVals) - mean(loVals)),
    years, positive: yearMeans.filter((v) => v > 0).length,
    t: sd && sd > 0 ? r2(mean(yearMeans) / (sd / Math.sqrt(years))) : null,
    tCrit: tCritFor(years),
    ciSeason: bootClusters(perSeason, RUNS, SEED + 4),
    ciPlayer: bootClusters(perPlayer, RUNS, SEED + 5),
  };
}
const exAnte = {};
for (const field of ["teamPosTouchG", "teamRunRate"]) {
  exAnte[field] = {};
  for (const pos of POS) {
    exAnte[field][pos] = {};
    for (const f of FORMATS) {
      const cell = exAnteSplit(exAnteAll, pos, f, field);
      if (!cell) { exAnte[field][pos][f] = null; continue; }
      const nulls = PLACEBO_SEEDS.map((s) => exAnteSplit(exAnteAll, pos, f, field, s))
        .filter(Boolean).map((q) => q.diff);
      cell.placebo = nulls.length
        ? { seeds: nulls.length, maxAbs: r2(Math.max(...nulls.map(Math.abs))), perSeed: nulls } : null;
      cell.beatsPlacebo = cell.placebo != null && Math.abs(cell.diff) > cell.placebo.maxAbs;
      exAnte[field][pos][f] = cell;
    }
  }
}

/* ============================================================
   6. SJALFSPROFUN — DEYR FREMUR EN AD SKRIFA
   ============================================================
   Akkerin eru VALIN THANNIG AD THAU GETI FALLID. Akkeri sem er satt
   med byggingu (t.d. "byrjunarmadurinn skorar 0 i fjarvistarviku")
   maelir ekkert og er ekki her.                                     */
const anchors = [];
function anchor(name, ok, detail) {
  anchors.push({ name, ok: !!ok, detail });
  console.log(`  ${ok ? "OK  " : "FALL"} ${name} — ${detail}`);
}

/* 1. URTAK. Faerri en 300 atvik eda faerri en 4 ar i haus-holfi og
      thetta er ekki maeling heldur mynd. */
anchor("sample floor", real.events.length >= 300 && seasons.length >= 5,
  `${real.events.length} atvik, ${seasons.length} timabil`);

/* 2. BYE-VARDINN. Ekkert atvik ma lenda a viku thar sem lidid
      spiladi ekki — annars vaeri "audur" talinn "fjarverandi" og
      hver einasta tala her vaeri sambland tvennskonar atburda. */
const onBye = real.events.filter((e) => !(teamWeeks.get(e.season).get(e.team) || []).includes(e.spellStart));
anchor("no event on a bye week", onBye.length === 0, `${onBye.length} atvik a viku an leiks`);

/* 3. GETUR NETID SED HRIFIN? EX-POST toppvaramadur VERDUR ad vera
      klarlega yfir grunnlinu — einhver FAER vinnuna. Falli thetta er
      fjarvistar-skurdurinn bilaður, ekki merkid. */
const expostDelta = mean(real.events.filter((e) => e.expost)
  .map((e) => e.expost.ppr - e.baseline.ppr));
const exanteDelta = mean(real.events.filter((e) => e.out1).map((e) => e.out1.ppr - e.baseline.ppr));
anchor("ex-post top backup spikes", expostDelta > 3 && expostDelta > exanteDelta,
  `ex-post +${r2(expostDelta)} > ex-ante +${r2(exanteDelta)} PPR`);

/* 4. SNERTI-VARDVEISLA. I fjarvistarviku a lidid ad skila LIKU
      snerti-magni a stodunni — vinnan faerist, hun hverfur ekki. Se
      hlutfallid naerri 0 er verid ad maela hopa sem spiladu ekki. */
const consv = real.events.filter((e) => e.spellTeamTouch != null && e.priorTeamTouch > 0)
  .map((e) => e.spellTeamTouch / e.priorTeamTouch);
const consvMean = mean(consv);
anchor("team touch conservation", consvMean > 0.6 && consvMean < 1.4,
  `lidssnertingar i fjarvist / adur = ${r2(consvMean)} (n=${consv.length})`);

/* 5. PLACEBO ER NAERRI NULLI POOLED. Einstok holf MEGA vera stor —
      thad er einmitt thad sem thau maela — en pooled medaltal langt
      fra nulli thydir ad netid sjalft beri skekkju. */
const plcPooled = mean(placeboRuns.flatMap((p) => p.events.filter((e) => e.out1)
  .map((e) => e.out1.ppr - e.baseline.ppr)));
anchor("placebo pooled near zero", Math.abs(plcPooled) < 2.5,
  `placebo out+1 vsBase pooled = ${r2(plcPooled)} PPR`);

/* 6. PLACEBO-FJOLDI ER SAMBAERILEGUR. Vaeri hann tiundi hluti af
      raunfjolda vaeri thakid lagt af urtaksstaerd, ekki af hávaða. */
const plcN = placeboRuns.map((p) => p.events.length);
anchor("placebo count comparable", Math.min(...plcN) > 0.5 * real.events.length,
  `placebo ${Math.min(...plcN)}-${Math.max(...plcN)} gegn raun ${real.events.length}`);

/* 7. HALF LIGGUR MILLI STD OG PPR i hverju haus-holfi. Se thad ekki
      svo er stigagjafa-lesturinn bilaður og oll thrju snidin ljuga. */
let fmtOrderOk = true;
for (const pos of POS) {
  const c = results[pos]["out+1"];
  if (!c.ppr.vsBase || !c.half.vsBase || !c.std.vsBase) continue;
  const [p, h, s] = [c.ppr.vsBase.mean, c.half.vsBase.mean, c.std.vsBase.mean];
  if (!(Math.min(p, s) - 1e-9 <= h && h <= Math.max(p, s) + 1e-9)) fmtOrderOk = false;
}
anchor("half between std and ppr", fmtOrderOk, "einraeni i stigagjof i ollum fjorum stodum");

if (anchors.some((a) => !a.ok)) {
  console.error("\n  AKKERI FELL — SKRIFA EKKERT.\n" +
    "  Maelingarskra sem er skrifud thratt fyrir fallid akkeri litur ut eins og\n" +
    "  maeling og er thad ekki. Sja README 4c (agecurve-lab deyr fremur en ad skrifa).\n");
  process.exit(3);
}

/* ============================================================
   7. VERDICT — REIKNADUR UR TOLUNUM
   ============================================================
   Hann ma ekki vera handskrifadur: tha getur hann rekid fra sinni
   eigin skra (README 4c). */
const headline = [];
for (const pos of POS) {
  for (const [label] of [["out+1"], ["back+1"]]) {
    const c = results[pos][label].ppr.vsBase;
    if (!c) continue;
    headline.push({ pos, label, mean: c.mean, t: c.t,
      player: c.ciPlayer?.excludesZero, season: c.ciSeason?.excludesZero,
      beatsPlacebo: c.beatsPlacebo });
  }
}
const spikeCells = headline.filter((h) => h.label === "out+1");
const backCells = headline.filter((h) => h.label === "back+1");
const spikeSolid = spikeCells.filter((h) => h.player && h.beatsPlacebo);
const backNull = backCells.filter((h) => !h.player || !h.beatsPlacebo);
const toxicPos = POS.filter((pos) => {
  const d = decision[pos].ppr;
  return d && d.starterBack && d.starterBack.mean < 0;
});
const shareSolid = POS.filter((pos) => {
  const s = sharePredictive[pos].ppr, p = sharePlacebo[pos].ppr;
  return s && s.ciPlayer?.excludesZero && p && Math.abs(s.diff) > p.maxAbs;
});
const exAnteSolid = [];
for (const field of Object.keys(exAnte)) for (const pos of POS) {
  const c = exAnte[field][pos].ppr;
  if (c && c.ciPlayer?.excludesZero && c.beatsPlacebo) exAnteSolid.push(`${pos}/${field}`);
}

const verdict =
  `Absence spike is REAL and large: ${spikeSolid.length}/${spikeCells.length} positions clear both the ` +
  `per-player bootstrap and the ${PLACEBO_SEEDS.length}-seed placebo ceiling at out+1 ` +
  `(${spikeCells.map((h) => `${h.pos} ${sgn(h.mean)}`).join(", ")} PPR over the backup's own baseline). ` +
  `The week the starter returns, ${backNull.length}/${backCells.length} positions are INDISTINGUISHABLE ` +
  `FROM NOISE (${backCells.map((h) => `${h.pos} ${sgn(h.mean)}`).join(", ")}) — ` +
  `${POS.map((p) => `${p} keeps ${survival[p].ppr ? r2(survival[p].ppr.survivedOfSpikePct) : "n/a"}%`).join(", ")} ` +
  `of the spike. In the actual waiver decision — he was startable in the absence week, you add him — ` +
  `the starter is already back the following week in ` +
  `${POS.map((p) => `${p} ${decision[p].ppr ? r2(decision[p].ppr.starterBackNextWeekPct) : "n/a"}%`).join(", ")} ` +
  `of cases, and in those cases he lands ` +
  `${POS.map((p) => `${p} ${decision[p].ppr && decision[p].ppr.starterBack ? sgn(decision[p].ppr.starterBack.mean) : "n/a"}`).join(", ")} ` +
  `points against that week's replacement line. ` +
  `SO "he scored well last week" IS ${toxicPos.length >= 3 ? "TOXIC" : "NOT UNIFORMLY TOXIC"} as a ` +
  `pickup metric: it is a statement about a week that has already been paid for, and it is negative in ` +
  `${toxicPos.length}/${POS.length} positions once the starter is back. ` +
  `Share in the spike week ${shareSolid.length ? `PREDICTS survival in ${shareSolid.join(", ")}` : "does NOT predict survival in any position " +
  "(every split is inside the shuffle ceiling)"}. ` +
  `Ex-ante handcuff value (backup on a high-volume team, everything defined from the first four games) ` +
  `${exAnteSolid.length ? `survives in ${exAnteSolid.join(", ")}` : "survives in NO position/format cell"}. ` +
  `NOTHING IS WIRED INTO src/ ON THIS EVIDENCE — the one finding that bears on pickupAdvice is a ` +
  `CAUTION, not a weight: last week's points are not the currency, and the tool already refuses to ` +
  `use them.`;

/* ============================================================
   8. SKRIFA
   ============================================================ */
const out = {
  generated: new Date().toISOString(),
  provenance: stamp({
    argv: process.argv.slice(2),
    defaults: DEFAULTS,
    inputs: [...seasons.map((y) => `weekly/${y}.json`), "schedule_history.json", "players.json"],
  }),
  question:
    "What is a backup worth in the week his starter does not play, and what is he worth the week " +
    "the starter is back? Measured on weekly data 2019-2025. The other half of the user's question " +
    "-- 'he is expected back next game' -- is a NEWS statement and is not backtestable here; see " +
    "`unmeasured`.",
  seasons,
  league: { teams: LEAGUE.teams, starters: LEAGUE.starters, replacementRanks: REPL,
    note: "The replacement rank per position comes from replacementRanks() in src/model.js, not " +
          "from a number written here. `line_*` is the realized points of the player who finished " +
          "at that rank in that week -- a distributional quantile, not a pick anyone could have made." },
  cut: {
    absenceRule: "A starter is ABSENT in week w when he has NO ROW in data/weekly/{season}.json " +
      "for that week while his team played a game that week (team weeks come from " +
      "schedule_history.json, so bye weeks are excluded by construction). depth/depthPos is NEVER " +
      "used: it carries only the CURRENT depth chart (exactly 32 RB1 and 32 RB2, one per team) and " +
      "has no history.",
    starterRule: `Highest touches-per-game among players with >= ${MIN_PRIOR_GAMES} appearances and ` +
      `>= ${JSON.stringify(MIN_TOUCH)} touches per game, computed from PRIOR weeks of the same season only.`,
    backupRule: `Highest touches-per-game among the remaining players at the same team and position ` +
      `with >= ${MIN_BACKUP_PRIOR} prior appearances. Chosen BEFORE the absence week, so this is the ` +
      `man a manager could have named in advance -- not the man who happened to get the carries.`,
    baselineRule: `Mean points in prior weeks (>= ${MIN_BASELINE_WEEKS}) where the STARTER PLAYED and ` +
      `the backup had already appeared for the team. A week with no row counts as 0 -- that is what he ` +
      `was worth in your lineup.`,
    tradedStarter: "A starter who has a row for ANOTHER team that week counts as PLAYING, not absent. " +
      "A trade is not the injury question and would otherwise manufacture false absences.",
    ambiguous: {
      ...ambiguous,
      note: "The weekly files carry NO snap count, so 'absent' and 'played and did nothing' cannot be " +
        "separated exactly. These are rows that EXIST with zero touches -- they are counted as PLAYED " +
        "in the main cut. `sensitivity` re-runs the whole net treating a zero-touch, zero-point row as " +
        "an absence; both numbers are published because hiding the choice would mean claiming to have " +
        "measured absence when what was measured is 'got nothing'.",
      pctOfRows: r2(100 * ambiguous.zeroTouchRows / ambiguous.rows),
    },
    events: real.events.length,
    eventsPerPos: perPosCount,
    eligibility: real.elig,
  },
  offsets: Object.fromEntries(OFFSETS.map(([label, , desc]) => [label, desc])),
  metrics: {
    vsBase: "points minus the backup's own pre-absence baseline -- what changed for him",
    vsLine: "points minus that week's realized replacement line at his position -- was he startable",
    raw: "raw points, no reference",
  },
  results,
  sensitivity: {
    note: "Identical net, absence cut widened: a row with zero touches AND zero points counts as an " +
      "absence. If the headline cells move materially the finding rests on the cut, not on the data.",
    events: strictRun.events.length,
    results: strictResults,
  },
  spikeAndSurvival: survival,
  sharePredictive: { split: sharePredictive, placeboCeiling: sharePlacebo,
    note: "Median split on the backup's share of team touches IN THE SPIKE WEEK; the outcome is the " +
      "NEXT week, so there is no leak. The ceiling is the same split run through the placebo events." },
  decision: { perPos: decision, placeboCeiling: decisionPlacebo,
    note: "The real decision: the backup was startable (at or above that week's replacement line) in " +
      "the absence week, which is exactly what a manager sees on waiver day. He is added. What does he " +
      "return the following week, against THAT week's replacement line? Split by whether the starter " +
      "is already back." },
  exAnte: { splits: exAnte, cutWeekIndex: CUT_WEEK_INDEX, rows: exAnteAll.length,
    note: "Handcuff value BEFORE anything happens: roles and team volume both from the first four team " +
      "games, outcome is the backup's mean weekly points from game five on. Median split within season " +
      "and position. The null is the same split with the volume labels SHUFFLED within season -- same " +
      "cell count, same distribution, relationship broken." },
  placebo: {
    seeds: PLACEBO_SEEDS,
    role: `${PLACEBO_SEEDS.length} deterministic-noise absence sets through the IDENTICAL net: same ` +
      `starter rule, same backup rule, same baseline, same offsets -- but the event week is a week the ` +
      `starter PLAYED. They give the real null distribution. The placebo CEILING is the threshold, not ` +
      `zero: in opp-lab noise reached |t| = 3.50 and +58.2 points in a single cell.`,
    rate: RATE,
    eligiblePlayedWeeks: eligPlayedWeeks,
    eventsPerSeed: placeboRuns.map((p) => ({ seed: p.seed, events: p.events.length })),
    caveat: "A placebo spell is one week long by construction (the starter played), so back+1 for a " +
      "placebo is simply the next team game week. Against real spells that last longer this makes the " +
      "placebo back+1 a slightly tighter null than the real back+1; the comparison that is exactly " +
      "structurally matched is the one-week-spell subset, reported in `results` alongside spellLen.",
  },
  anchors,
  events: real.events,
  verdict,
  unmeasured: [
    "'He is expected back next game' -- the half of the question that would make this actionable. " +
      "data/news.json is a ROLLING 50-article window with no archive, injuryNote covers 28 of ~1040 " +
      "players and only from Sleeper (ESPN's injury array was measured and removed: 661 of 800 rows " +
      "said 'Active' and espnId was null on all 800), and depth/depthPos is current-only. There is no " +
      "record of what the news said in week 5 of 2023, so return-timing cannot be backtested at all. " +
      "It would need a news archive built going FORWARD -- same argument as data/history/ in the FPL " +
      "project: a daily snapshot cannot be created after the fact.",
    "Snap share. nflverse publishes snap_counts but data/weekly/*.json does not carry it, so 'absent' " +
      "versus 'active and unused' is an inexact cut here. Adding snap counts to the pipeline would " +
      "make the cut exact and is the single cheapest improvement to this measurement.",
    "WHY the starter was absent -- injury, benching, suspension, rest. All four produce the same row " +
      "shape (no row). Benched starters plausibly do not return to the same role, which would bias the " +
      "measured survival UP; injured ones do. Separating them needs the news archive above.",
    "The backup's own injury. A backup with no row in the absence week is scored 0, which is correct " +
      "for a lineup but conflates 'he was hurt too' with 'he was passed over'.",
    "Multi-week return ramps (a starter returning at 40% of his usual work). The offsets measure the " +
      "backup, not the starter's ramp; the starter's own touches in back+1 are in `events` but were " +
      "not turned into a measurement.",
    "Whether any of this transfers to the draft-day handcuff pairing (take RB1 and his RB2). The " +
      "ex-ante cut here is a WEEK-FIVE, in-season cut. A draft version needs prior-season team volume " +
      "and a roster-continuity rule, and the five-clean-season wall (README 5b/5e) applies to it.",
  ],
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1));
report();
console.log(`\n  Skrifad: ${path.relative(process.cwd(), OUT)} ` +
            `(${(JSON.stringify(out).length / 1024).toFixed(0)} KB)\n`);
console.log(`  ${verdict}\n`);

/* ============================================================
   9. TAFLAN A SKJANN
   ============================================================ */
function report() {
  console.log("\n  STADA x ATBURDUR x SNID — delta gegn EIGIN grunnlinu varamannsins (stig)\n");
  console.log("  pos  offset  fmt   mean      t     ar  +   n     CI ar            CI leikm         plc|mean| plc|t|  >plc");
  for (const pos of POS) {
    for (const [label] of OFFSETS) {
      for (const f of FORMATS) {
        const c = results[pos][label][f].vsBase;
        if (!c) continue;
        console.log(`  ${pad(pos, 4)} ${pad(label, 7)} ${pad(f, 5)} ${padL(sgn(c.mean), 8)} ` +
          `${padL(c.t == null ? "—" : c.t.toFixed(2), 6)} ${padL(c.years, 3)} ${padL(c.positive, 2)} ` +
          `${padL(c.n, 5)} ${padL(ci(c.ciSeason), 17)} ${padL(ci(c.ciPlayer), 17)} ` +
          `${padL(c.placebo ? c.placebo.maxAbsMean.toFixed(1) : "—", 8)} ` +
          `${padL(c.placebo && c.placebo.maxAbsT != null ? c.placebo.maxAbsT.toFixed(2) : "—", 7)} ` +
          `${c.beatsPlacebo ? "JA" : "nei"}`);
      }
    }
    console.log("");
  }

  console.log("  SPIKE OG HVAD LIFIR (PPR, adeins atvik med raunverulegu spike)\n");
  for (const pos of POS) {
    const s = survival[pos].ppr;
    if (!s) continue;
    console.log(`  ${pad(pos, 4)} spike ${padL(sgn(s.spike), 7)} -> eftir endurkomu ` +
      `${padL(sgn(s.afterReturn), 7)} = ${padL(r2(s.survivedOfSpikePct).toFixed(1) + "%", 7)} lifir ` +
      `(n=${s.n}, midgildi hlutfalls ${s.survivedShareMedian})`);
  }

  console.log("\n  AKVORDUNIN — hann var STARTANDI i fjarvistarviku, thu tokst hann upp (PPR)\n");
  console.log("  pos  spikes  m/naestu  byrj.aftur%  allt      byrj.aftur  enn uti    plc|mean|");
  for (const pos of POS) {
    const d = decision[pos].ppr;
    if (!d) continue;
    console.log(`  ${pad(pos, 4)} ${padL(d.spikeEvents, 6)} ${padL(d.withNextWeek, 9)} ` +
      `${padL(d.starterBackNextWeekPct.toFixed(1), 12)} ${padL(d.all ? sgn(d.all.mean) : "—", 9)} ` +
      `${padL(d.starterBack ? sgn(d.starterBack.mean) : "—", 11)} ` +
      `${padL(d.starterStillOut ? sgn(d.starterStillOut.mean) : "—", 10)} ` +
      `${padL(decisionPlacebo[pos].ppr ? decisionPlacebo[pos].ppr.maxAbs.toFixed(1) : "—", 9)}`);
  }

  console.log("\n  ER LIFANDI HLUTFALLID FORSPAANLEGT UR HLUTDEILD I SPIKE-VIKUNNI? (PPR, back+1)\n");
  for (const pos of POS) {
    const s = sharePredictive[pos].ppr, p = sharePlacebo[pos].ppr;
    if (!s) { console.log(`  ${pad(pos, 4)} of fa atvik`); continue; }
    console.log(`  ${pad(pos, 4)} midgildi hlutdeildar ${s.medianShare}: ha ${sgn(s.high.mean)} · ` +
      `lag ${sgn(s.low.mean)} · munur ${sgn(s.diff)} · CI leikm ${ci(s.ciPlayer)} · ` +
      `stokkun-thak ${p ? p.maxAbs.toFixed(1) : "—"}`);
  }

  console.log("\n  HANDCUFF FYRIRFRAM — varamadur a hlaupagladu lidi, skurdur i viku 5 (PPR)\n");
  for (const field of Object.keys(exAnte)) {
    for (const pos of POS) {
      const c = exAnte[field][pos].ppr;
      if (!c) continue;
      console.log(`  ${pad(field, 15)} ${pad(pos, 4)} ha ${padL(c.highMean, 6)} · lag ${padL(c.lowMean, 6)} · ` +
        `munur ${padL(sgn(c.diff), 7)} · t ${padL(c.t == null ? "—" : c.t.toFixed(2), 6)} · ` +
        `${c.positive}/${c.years} ar · CI leikm ${ci(c.ciPlayer)} · thak ${c.placebo ? c.placebo.maxAbs.toFixed(1) : "—"} · ` +
        `${c.beatsPlacebo ? "JA" : "nei"}`);
    }
  }
}

/* ============================================================
   10. SMAATRIDI
   ============================================================ */
function n0(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function r2(x) { return x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000; }
function sgn(x) { return x == null ? "—" : (x >= 0 ? "+" : "") + x.toFixed(2); }
function ci(c) { return c ? `[${sgn(c.lo)},${sgn(c.hi)}]${c.excludesZero ? "*" : ""}` : "—"; }
function pad(s, n) { return String(s).padEnd(n); }
function padL(s, n) { return String(s).padStart(n); }
