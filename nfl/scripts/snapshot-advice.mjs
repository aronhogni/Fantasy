#!/usr/bin/env node
/* ============================================================
   RADGJAFAR-BOKHALDID — ThAD SEM APPID SAGDI ADUR EN VIKAN VAR SPILUD

   HVERS VEGNA ThESSI SKRA ER TIL (18.8.2026):
   Allt i thessu appi er MAELT — a 2019-2025. Ekkert i thvi maelir hvort
   maelingarnar HALDI AFRAM ad gilda. Labsin svara "var thetta rett i
   fortidinni"; enginn spyr "er thad enn rett i ThESSU timabili".

   OG ThAD ER EKKI HAEGT AD SPYRJA EFTIR A. Vikuleg spa (`weekRows`),
   waiver-abatinn (`pickupAdvice`) og DST-streymid (`dstStream`) eru
   reiknud i APPINU ur gognum sem BREYTAST i hverri viku: markadslinur,
   meidsli, Sleeper-spar, hverjir eru lausir, vorn-gegn-stodu ur vikum sem
   BUID er ad spila. Vid getum ekki endurbyggt "hvad hefdum vid radlagt i
   viku 5" thegar vika 5 er lidin — inntokin eru horfin. Linan er farin
   thegar leikurinn er buinn (BSD-lærdomurinn i FPL-hlutanum: "their eru
   lifandi og hverfa eftir leik"), rostrar hafa breyst, og
   `defense.json` er endurskrifud i hverri viku.

   ThVI ER ThETTA SAMA ROKSEMD OG `data/history/` OG
   `scripts/snapshot-predictions.mjs` i FPL-hlutanum (CLAUDE.md 7.1):
   **dagleg/vikuleg mynd verdur ekki bum til eftir a.** Radgjof sem var
   ekki skrifud nidur ADUR en vikan var spilud er ekki radgjof, hun er
   eftira-skyring.

   ThETTA ER SMIDAD EFTIR FPL-BOKHALDINU, EKKI UPP A NYTT. Reglurnar,
   hlidin, `--dry`-hegdunin og status-rodin eru thaer sömu og thar, thvi
   thaer voru allar keyptar med villum sem eru skjaladar i
   `scripts/snapshot-predictions.mjs`. Fjorar reglur:

     1. ADEINS FYRIR FYRSTA LEIK VIKUNNAR. Radgjof skrifud eftir ad leikur
        er byrjadur er ekki radgjof. Akkerid er MIDNAETTI UTC a degi
        fyrsta leiks — viljandi ~24 klst FYRR en raunverulegt upphaf
        (20:15 ET = 00:15 UTC naesta dag), thvi skekkjan ma adeins vera i
        thessa att. Sama akkeri og `upcomingWeek` i `fetch-nfl.mjs`, og
        `tests/advice-ledger.mjs` kafli 2 BER ThAU SAMAN a raunskranni svo
        thau geti ekki rekid i sundur.
     2. ADEINS EINU SINNI. Skra sem ThEGAR er til er ALDREI yfirskrifud,
        ekki heldur "til ad uppfaera hana med betri gognum" — radgjof sem
        er endurskrifud eftir a er retro-fitting. Skran er ONEMANDI.
     3. ThUNN INNTOK -> ENGIN SKRA. Betra er ad vika vanti i bokhaldid en
        ad hun beri radgjof reiknada ur halfum gognum; sidara les eins og
        maeling.
     4. GLUGGI, EKKI "VID FYRSTA TAEKIFAERI". Sja nedar — thetta var
        RAUNVERULEG VILLA i FPL-bokhaldinu og hun er ekki endurtekin.

   ============================================================
   GLUGGINN — 48 KLST, OG TALAN KEMUR UR CRON-INU
   ============================================================
   FPL-bokhaldid skrifadi GW1-rodina **222 KLST fyrir frestinn** med
   `start_prob` null hja 577 af 577, thvi "adeins fyrir frest" OG "adeins
   einu sinni" gefa SAMAN "skrifa vid FYRSTA TAEKIFAERI og frysta".
   Kvordunin hefdi thvi maelt likanid a ThESS EIGIN VERSTU agiskun.

   Hér er cron-id annad og thvi er talan onnur. `nfl-data.yml` keyrir:
       09:00 UTC daglega           (og 21:00 i agust-september)
       12:00 UTC a thridjudogum    (vikuleg gogn)
   Akkeri venjulegrar viku er fimmtudagur 00:00 UTC. 48 klst gefa thvi
   ThRJU taekifaeri (thri 09:00, thri 12:00, mid 09:00) — eitt sleppt cron
   ma ekki kosta vikuna. 24 klst gaefu EITT.

   OG ThAD ER VIST HVAD ThETTA KOSTAR, svo thad se ekki fullyrt ranglega:
   fyrsta taekifaerid er ~2,5 dogum fyrir sunnudags-leikina, sem er RETTI
   akvordunar-punkturinn fyrir waiver (thau leysast a midvikudegi) en
   EINNI AEFINGASKYRSLU OF FYRR fyrir start/sit. Ekki er logid um thad:
   hver rod ber `hoursToAnchor`, svo kvordunin getur flokkad eftir thvi
   hve fersk radgjofin var i stad thess ad lata allar rodir lesast eins.

   ============================================================
   APPID LES ThETTA ALDREI
   ============================================================
   Thetta er MAELITAEKI, ekki birtingargagn. `tests/advice-ledger.mjs`
   kafli 7 les `src/` og fellur ef nokkur skra thar nefnir `advice/`
   -mopuna. Thess vegna er lika `continue-on-error: true` a skrefinu i
   workflow-inu: bokhaldid ma ALDREI fella gagna-keyrsluna.

   Keyrsla:
       node scripts/snapshot-advice.mjs           (les data/, saekir Sleeper, skrifar)
       node scripts/snapshot-advice.mjs --dry     (SKRIFAR EKKERT, prentar thekju)
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

/* HREINU EININGARNAR ERU FLUTTAR INN, EKKI ENDURREIKNADAR. Thetta er
   ekki smekkur: FPL-bokhaldid afritadi `buildTeamMetrics` og afritid
   skrifadi `NaN` fyrir oll 17 lidin, MERKT sem maeling, medan App.jsx var
   alltaf rett (CLAUDE.md 7.1). Bokhald sem reiknar likanid upp a nytt
   maelir ANNAD likan en notandinn sa. */
import { currentWeek, weekContext, weekRows, dstStream, onByeThisWeek,
         weeklyEdgeNote } from "../src/weekview.js";
import { optimalLineup, lineupAdvice, slotsFor } from "../src/lineup.js";
import { freeAgents, pickupAdvice } from "../src/waivers.js";
import { standingsFrom, myRosterId } from "../src/standings.js";
import { normalizeLeague, buildRows } from "../src/build.js";

const DATA = new URL("../data/", import.meta.url).pathname;
const OUT = DATA + "advice/";
const J = (f) => JSON.parse(readFileSync(DATA + f, "utf8"));
const tryJ = (f) => { try { return J(f); } catch { return null; } };

export const WINDOW_H = 48;

/* ============================================================
   DEILDIRNAR — HVERS VEGNA ThAER ERU HER OG EKKI I `data/`
   ============================================================
   Appid les deildirnar ur `localStorage` (notandinn limdi inn
   Sleeper-hlekk i Draft-flipanum). Pipeline-id hefur ENGAN adgang ad
   thvi, svo bokhaldid getur ekki spurt appid hvada deildir eru til.

   Audkennin eru ThEGAR committud i thessu repo-i — `src/standings.js`
   ber baedi i athugasemd — svo thetta er engin ny birting. Og
   Sleeper-deildar-audkenni er hvort sem er opinbert: `/league/{id}` er
   opid an lykils, sem er einmitt hvers vegna appid getur lesid thad ur
   vafranum an proxy.

   `NFL_LEDGER_LEAGUES` (kommu-skilinn listi) tekur framyfir, svo hver
   sem klonar repo-id geti maelt SINAR deildir an thess ad breyta koda. */
export const LEAGUES = [
  { id: "1389356308104249344", name: "Patriots SB champs" },
  { id: "1389328159903580160", name: "Sofahetjur" },
];

/* ============================================================
   AKKERID — MIDNAETTI UTC A DEGI FYRSTA LEIKS VIKUNNAR
   ============================================================
   SAMA REGLA OG `upcomingWeek` i `fetch-nfl.mjs`, og hun er EKKI flutt
   inn thadan af einni astaedu sem er verd ad skrifa: `fetch-nfl.mjs` er
   skrifta sem keyrir `main()` a efsta svidi, svo `import` a henni myndi
   RAESA ALLA PIPELINE-UNA. Ad flytja `upcomingWeek` ut i sameiginlega
   einingu vaeri retta lausnin en thad er endurskipulag a pipeline-inu
   ThREM DOGUM FYRIR DRAFT, og pipelinan er thad sem faerir bordid.

   ThVI ER DRIFTIN VORDUD I STAD ThESS AD VERA UTILOKUD:
   `tests/advice-ledger.mjs` kafli 2 dregur `upcomingWeek` UT UR
   `fetch-nfl.mjs` (sama adferd og `tests/pipeline.mjs` notar thegar) og
   krefst thess ad THAU GEFI SAMA AKKERI fyrir hverja viku i raunskranni.
   Tvo afrit sem eru BORIN SAMAN eru annad en tvo afrit sem eru bædi
   trud.

   OG SPURNINGIN ER EKKI SU SAMA, sem er onnur astaeda: `upcomingWeek`
   spyr "hver er naesta OSPILADA vika" (til ad vista spar); bokhaldid
   spyr "er su vika sem APPID SYNIR (`currentWeek(meta)`) enn obyrjud".
   Um midja viku eru thau ekki sama vika, og bokhaldid VERDUR ad fylgja
   appinu — annars maelir thad radgjof sem notandinn sa aldrei.        */
export function weekAnchor(schedule, season, week) {
  let best = null;
  for (const g of schedule || []) {
    if (!g || Number(g.season) !== Number(season) || Number(g.week) !== Number(week)) continue;
    if (g.type !== "REG" && g.type !== "POST" && g.type) continue;
    if (!g.date) continue;
    const t = Date.parse(`${g.date}T00:00:00Z`);
    if (!Number.isFinite(t)) continue;
    if (best == null || t < best) best = t;
  }
  return best;
}

/* ---- HLIDID: i glugga fyrir akkerid, og adeins einu sinni ---- */
export function shouldWrite({ season, week, anchorMs, nowMs, exists, windowH = WINDOW_H }) {
  if (week == null) return { write: false, why: "no league week yet - preseason has no matchup to advise on" };
  if (exists) return { write: false, why: `${season} week ${week} already recorded - never rewritten` };
  if (!Number.isFinite(anchorMs)) return { write: false, why: `no scheduled game for ${season} week ${week}` };
  if (nowMs >= anchorMs)
    return { write: false, why: "the week has started - advice recorded after kickoff is not advice" };
  const hLeft = (anchorMs - nowMs) / 36e5;
  if (hLeft > windowH)
    return { write: false, why: `${hLeft.toFixed(1)}h before the first kickoff - outside the ${windowH}h window, `
                              + "an early snapshot would freeze worse-informed advice" };
  return { write: true, why: `${hLeft.toFixed(1)}h before the first kickoff` };
}

/* ---- ThUNN INNTOK: hvad VERDUR ad vera til svo rod se marktaek ----

   TOLURNAR ERU GOLF, EKKI KVORDUN. `players.json` ber ~1.170 radir og
   ~1.040 med spa; 400 er langt undir og fellur adeins thegar sokn hefur
   raunverulega brugdist. Sama gerd og `minRows` i `fetch-nfl.mjs`, sem
   var sett upp eftir ad ESPN skiladi engum linum og vordurinn taldi
   lyklana i staðinn fyrir farminn.                                    */
export function inputsUsable({ rows, schedule, season, week }) {
  /* `rows` ER BORDID (`buildRows`), EKKI `players.json`. Fyrsta utgafa
     thessa kalls sendi hraa leikmannaskrana og hun ber ENGAN `proj` — 0 af
     1.173 — svo hlidid hafnadi HVERRI keyrslu med "too few rows carry a
     projection". Skran var i fullkomnu lagi; hlidid horfdi a rangan hlut.
     Sama gerd og `rowCount` i `fetch-nfl.mjs`: "rod er farmur, ekki
     umbudir". `projSleeper` er a `players.json`; `proj` verdur til i
     `buildRows` og er thad sem radgjofin les. */
  if (!Array.isArray(rows) || rows.length < 400) return "player rows are thin";
  if (rows.filter((r) => r && r.proj != null).length < 200) return "too few rows carry a projection";
  if (!Array.isArray(schedule) || !schedule.length) return "schedule.json is empty";
  if (!Number.isInteger(week) || week < 1 || week > 22) return `week ${week} is out of range`;
  if (!schedule.some((g) => Number(g.season) === Number(season) && Number(g.week) === week))
    return `no game carries ${season} week ${week}`;
  return null;
}

const r1 = (x) => (x == null || !Number.isFinite(Number(x)) ? null : Math.round(Number(x) * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(Number(x)) ? null : Math.round(Number(x) * 100) / 100);

/* ============================================================
   EIN LEIKMANNS-ROD I BOKHALDINU — MED INNTOKUNUM
   ============================================================
   `proj` EITT ER EKKI NOG. Kvordun sem hefur adeins utkomuna getur sagt
   "spain skeikadi" en ekki HVERS VEGNA, og tha er ekkert ad laga. Thess
   vegna eru inntokin skrifud vid hlidina: markadslina lidsins,
   motherjinn, vorn-gegn-stodu hans, tiltaekileiki og fri-flaggid.
   `projSleeper` er VIDMIDID — theirra tala, oadloguð — nakvaemlega eins
   og `ep_next` er vidmidid i FPL-bokhaldinu. An vidmids er "spain lokadi
   3,5% af bilinu" tala an samanburdar.                                */
function playerRow(p, ctx) {
  const oppTeam = ctx && p.team ? (ctx.opp.get(p.team) ?? null) : null;
  const d = ctx && oppTeam ? ctx.dvp.get(`${oppTeam}|${p.pos}`) : null;
  return {
    id: String(p.id), name: p.name ?? null, pos: p.pos ?? null, team: p.team ?? null,
    /* OKKAR tala og ThEIRRA tala, badar. */
    proj: r2(p.proj), projSleeper: r2(p.projSleeper),
    ev: r2(p.ev),
    avail: p.avail == null ? null : r2(p.avail),
    bye: !!p.bye,
    injury: p.injury ?? null,
    /* INNTOKIN. `null` er "vantar", ekki 0 — sja `weekview.js`. */
    inputs: {
      implied: ctx && p.team ? (ctx.implied.get(p.team) ?? null) : null,
      opp: oppTeam,
      defAdj: d ? r2(d.adj) : null,
      defLeagueMean: d ? r2(d.leagueMean) : null,
      defGames: d && d.games != null ? d.games : null,
    },
  };
}

/* ============================================================
   HREINT: tekur gogn, skilar bokhalds-rod. Engin skrif, engin klukka,
   engin netkoll — thess vegna er thad profanlegt a TILBUNUM gognum adur
   en fyrsta vikan er spilud. Sama mynstur og `buildSnapshot` i
   FPL-bokhaldinu og sama astaeda: kodi sem kviknar fyrst i september ma
   ekki vera omældur (CLAUDE.md 5).
   ============================================================ */
export function buildAdviceSnapshot({ season, week, rows, schedule, defense, meta,
                                      leagues, anchorMs, nowTs, windowH = WINDOW_H }) {
  const ctx = weekContext({ schedule, defense, week, season });
  const out = [];
  for (const lg of (leagues || [])) {
    const row = { id: String(lg.id), name: lg.name ?? null, error: lg.error ?? null };
    if (lg.error || !Array.isArray(lg.rosters)) {
      /* BILUN ER SKRAD, EKKI SLEPPT. Deild sem svaradi ekki er ANNAD en
         deild sem var i lagi og gaf engin rad — sama regla og
         `Dashboard.jsx` gerir a skjanum. */
      row.error = row.error || "no rosters were read";
      out.push(row);
      continue;
    }
    const L = normalizeLeague(lg.rules);
    row.shape = { teams: L.teams, scoring: L.scoring, starters: L.starters,
                  flexPos: L.flexPos ?? null };
    /* MAELDA TOLAN SEM VAR BIRT MED RADGJOFINNI. Hun er per stigagjof og
       hun rekur (`WEEKLY_MEASURED`), svo hun er SKRIFUD MED — annars
       vaeri ekki haegt ad segja seinna hvada fullyrding var a skjanum. */
    const edge = weeklyEdgeNote(L.scoring);
    row.claimed = { pct: edge.pct ?? null, t: edge.t ?? null,
                    significant: !!edge.significant, measured: !!edge.measured };

    const mineId = myRosterId({ rosters: lg.rosters, users: lg.users, userId: lg.userId });
    row.rosterId = mineId == null ? null : Number(mineId);

    const mineRoster = mineId == null ? null
      : lg.rosters.find((x) => x && Number(x.roster_id) === Number(mineId));
    const ids = mineRoster && Array.isArray(mineRoster.players)
      ? new Set(mineRoster.players.map(String)) : null;
    const myRows = ids ? rows.filter((x) => ids.has(String(x.id))) : null;

    /* ---- staðan ---- */
    const table = standingsFrom({ rosters: lg.rosters, users: lg.users,
                                  league: lg.rules, userId: lg.userId });
    row.standings = table && Array.isArray(table.rows)
      ? { complete: !!table.complete,
          rows: table.rows.map((t) => ({ rosterId: t.rosterId, name: t.name ?? null,
            rank: t.rank ?? null, wins: t.wins ?? null, losses: t.losses ?? null,
            ppts: t.ppts == null ? null : r2(t.ppts) })) }
      : null;

    /* ---- start/sit ---- */
    if (!myRows || !myRows.length) {
      /* "Vitum ekki hvada lid er mitt" er SVAR og thad er skrifad. Tomt
         `startsit` sem thegdi vaeri lesid seinna eins og "engin rad". */
      row.startsit = null;
      row.startsitWhy = mineId == null
        ? "my roster id could not be resolved from users/rosters"
        : "my roster is empty on Sleeper";
    } else {
      const slots = slotsFor(L);
      const wr = weekRows(myRows, ctx);
      const lineup = optimalLineup(wr, slots);
      const cur = mineRoster && Array.isArray(mineRoster.starters)
        ? mineRoster.starters.filter((x) => x && x !== "0").map(String) : null;
      const adv = cur && cur.length ? lineupAdvice(cur, wr, slots) : null;
      row.startsit = {
        projected: r1(lineup.projected),
        unfilled: lineup.unfilled,
        unknown: lineup.unknown,
        starters: lineup.starters.map((s) => ({ slot: s.slot, eligible: s.eligible,
          player: s.player ? playerRow(s.player, ctx) : null })),
        bench: lineup.bench.map((p) => playerRow(p, ctx)),
        /* ThAD SEM NOTANDINN VAR MED ThEGAR VID RADLOGDUM. An thess er
           `benchRegret` osvaranlegt seinna: hann tekur `started` og
           `bench` SEM ThAU VORU, ekki sem thau urdu. */
        currentStarters: cur,
        advice: adv ? { isOptimal: !!adv.isOptimal,
          changes: adv.changes.map((c) => ({ slot: c.slot,
            inId: c.in ? String(c.in.id) : null,
            outId: c.out ? String(c.out.id) : null, gain: r1(c.gain) })) } : null,
        adviceWhy: adv ? null : "Sleeper did not report a current lineup, so only the "
                               + "optimal one was shown - a different question",
        onBye: onByeThisWeek(myRows, week).map((p) => String(p.id)),
      };
    }

    /* ---- waiver ---- */
    const fa = freeAgents({ rows, rosters: lg.rosters, myRosterId: mineId });
    if (!fa || fa.pool == null) {
      row.waivers = null;
      row.waiversWhy = (fa && fa.why) || "the pool could not be read";
    } else {
      const picks = pickupAdvice({ pool: fa.pool, mine: fa.mine, league: lg.rules, week });
      row.waivers = {
        poolSize: fa.pool.length, mineSize: Array.isArray(fa.mine) ? fa.mine.length : null,
        /* `gain` ER TIMABILS-VBD og thad er SKRIFAD I RODINA svo enginn
           beri hana seinna vid vikuleg stig. `WAIVER_CAL.currency` er
           heimildin; hér er hun ordrett. */
        currency: "season vbd (value over replacement) - NOT weekly points",
        picks: picks.map((p) => ({ addId: String(p.add.id), addName: p.add.name ?? null,
          addPos: p.add.pos ?? null, addVbd: r1(p.add.vbd),
          dropId: String(p.drop.id), dropName: p.drop.name ?? null,
          dropVbd: r1(p.drop.vbd), gain: r1(p.gain), confident: !!p.confident })),
      };
    }

    /* ---- DST — ADEINS i deild sem BYRJAR vorn ---- */
    if (L.starters && L.starters.DST) {
      const dstTeams = rows.filter((r) => r && r.pos === "DST")
        .map((r) => ({ team: r.team || r.id, name: r.name }));
      const taken = new Set();
      for (const r of lg.rosters) for (const p of (r && r.players) || []) {
        if (dstTeams.some((t) => t.team === String(p))) taken.add(String(p));
      }
      const myDst = (myRows || []).find((x) => x && x.pos === "DST");
      const st = dstStream({ ctx, teams: dstTeams, taken,
                             mine: myDst ? (myDst.team || myDst.id) : null });
      row.dst = {
        why: st.why,
        best: st.best.map((b) => ({ team: b.team, opp: b.opp, oppImplied: b.oppImplied })),
        /* ALLAR RADIRNAR, ekki adeins topp 3: kvordunin tharf ad geta
           spurt "hve gott var ThAD sem vid volddum, af thvi sem var i
           bodi" og thad er osvaranlegt med thremur rodum. */
        rows: st.rows.map((r) => ({ team: r.team, opp: r.opp, oppImplied: r.oppImplied,
          bye: !!r.bye, taken: !!r.taken, mine: !!r.mine, rank: r.rank })),
      };
    } else {
      row.dst = null;
      row.dstWhy = "this league does not start a defence";
    }
    out.push(row);
  }

  /* ============================================================
     ThEKJA ER TALA, EKKI BOOLEAN
     ============================================================
     `!!ctx` sagdi "ja, samhengid var byggt" medan thad gat borid NULL
     markadslinu fyrir hvern einasta leik. FPL-bokhaldid skrifadi
     `start_prob: null` fyrir 577 af 577 an thess ad nokkud i skranni
     segdi fra thvi, og kvordun sem reiknar yfir NULL radir gefur tolu
     sem litur eins ut og maeling — versta utkoman. Nu telur skrain
     sjalf hversu margar radir baru hverja vidd.                      */
  const allPlayers = out.flatMap((l) => l.startsit
    ? [...l.startsit.starters.map((s) => s.player).filter(Boolean), ...l.startsit.bench] : []);
  return {
    season, week,
    generated: new Date(nowTs).toISOString(),
    anchor: Number.isFinite(anchorMs) ? new Date(anchorMs).toISOString() : null,
    /* HVE FERSK RADGJOFIN VAR. Sja hausinn: fyrsta taekifaerid i
       48-tima glugganum er ~2,5 dogum fyrir sunnudag, svo rodir eru
       EKKI jafn-upplystar og kvordunin verdur ad geta flokkad eftir thvi
       i stad thess ad blanda theim. */
    hoursToAnchor: Number.isFinite(anchorMs) ? r1((anchorMs - nowTs) / 36e5) : null,
    windowH,
    seasonType: meta && meta.seasonType != null ? meta.seasonType : null,
    nfl: {
      games: ctx ? ctx.games : 0,
      /* HVE MARGIR LEIKIR BERA LINU. I 2026-skranni eru linur opnar i
         fyrstu vikunum og strjalar seinna — "engin lina" er NORMAL
         astand, ekki jadartilfelli, og talan segir hvort svo var. */
      lines: ctx ? [...ctx.implied.values()].filter((v) => v != null).length : 0,
      /* HVADA AR VORNIN KOM UR. `null` i viku 1 er RETT og thad ma ekki
         lesast seinna eins og bilun (sja `weekContext`). */
      defSeason: ctx ? ctx.defSeason : null,
      defRows: ctx ? ctx.defRows : 0,
    },
    coverage: {
      leagues: out.length,
      leaguesWithError: out.filter((l) => l.error).length,
      leaguesWithStartsit: out.filter((l) => l.startsit).length,
      leaguesWithWaivers: out.filter((l) => l.waivers).length,
      leaguesWithDst: out.filter((l) => l.dst).length,
      players: allPlayers.length,
      proj: allPlayers.filter((p) => p.proj != null).length,
      implied: allPlayers.filter((p) => p.inputs.implied != null).length,
      defAdj: allPlayers.filter((p) => p.inputs.defAdj != null).length,
      picks: out.reduce((a, l) => a + (l.waivers ? l.waivers.picks.length : 0), 0),
    },
    note: "ADVICE RECORDED BEFORE THE WEEK'S FIRST KICKOFF. Written once and never "
        + "rewritten - advice re-recorded after the fact is not advice. The app never "
        + "reads this file; it is a measuring instrument. `proj` per player is what "
        + "benchRegret needs later, and `projSleeper` is the benchmark it is judged "
        + "against.",
    leagues: out,
  };
}

/* ---- HREINT: hvada vikur eru ThEGAR tapadar? ----
   Akkeri lidid OG engin rod. Tekid ut ur keyrslunni svo thad se
   profanlegt an klukku og an skra. Sama fall og `ledgerGaps` i
   FPL-bokhaldinu og af somu astaedu: eftir ad vikan er byrjud faerist
   `meta.week` fram, svo su fyrri hverfur ur athugun skriftunnar og
   tapid vaeri annars osynilegt — graen lina AF ThVI ad glugginn er
   lokadur.                                                          */
export function ledgerGaps({ schedule, season, week, nowMs, has }) {
  const gaps = [];
  for (let w = 1; w < (week ?? 1); w++) {
    const a = weekAnchor(schedule, season, w);
    if (!Number.isFinite(a) || a > nowMs) continue;
    if (!has(w)) gaps.push(w);
  }
  return gaps;
}

/* ============================================================
   STATUS-RODIN — ThOGN VAR EINA RAUNVERULEGA HAETTAN
   ============================================================
   Skrefid keyrir med `continue-on-error: true` og ThAD ER RETT. En thad
   thydir ad bilun INNAN gluggans er ALGERLEGA ThOGUL: skrefid verdur
   graent i Actions, engin skra verdur til, og vikan verdur ALDREI
   endurskopud thvi inntokin eru horfin. Thess vegna skrifar skriftan
   sjalf linu i `status.json`, sem `Sources`-flipinn birtir.

   REGLAN UM LITINN: skip er GRAENT (utan gluggans er ekkert ad gera og
   "thegar skrad" er rett svar), en **gluggi opinn + engin skra = RAUTT**.
   Thad er nakvaemlega su samsetning sem enginn hefdi tekid eftir.

   LES-BREYTA-SKRIFA a ADEINS OKKAR LYKIL: `fetch-nfl.mjs` sameinar
   `sources` a heiti og merkir radir sem hun snerti ekki `stale: true`.
   Vid endurbyggjum hana ekki — vid skiptum ut EINNI rod.               */
function recordLedger(season, week, okFlag, note, gaps = []) {
  try {
    const p = DATA + "status.json";
    const st = JSON.parse(readFileSync(p, "utf8"));
    const gapTxt = gaps.length
      ? ` · MISSING ledger rows for week ${gaps.slice(0, 6).join(", ")}`
        + (gaps.length > 6 ? ` (+${gaps.length - 6} more)` : "")
        + " - those kickoffs have passed and the inputs are gone"
      : "";
    const rows = Array.isArray(st.sources) ? st.sources : [];
    const next = rows.filter((r) => r && r.name !== "advice_ledger");
    /* ============================================================
       NULL VIKA MA EKKI VERDA ORDID "null" A SKJANUM (19.8.2026)
       ============================================================
       Þetta var `${season} week ${week}` skilyrdislaust, og i forleik er
       `week` NULL — svo `note` vard strengurinn

         "2026 week null: no league week yet - preseason has no
          matchup to advise on"

       og `Sources`-flipinn birti hann orettan. `v.note` er ekki innri
       loggi: hann er SYNILEGUR texti i "Data sources" og tooltip a
       hverri rod, svo ordid `null` var a skjanum hja notandanum.

       Þetta er nakvaemlega reglan "NULL ER EKKI NULL" i sinni beinustu
       mynd (README 8): tala eda gildi sem VANTAR ma ekki birtast sem
       gildi. Og skriftan VISSI thetta thegar — `label` tveimur tugum
       lina hér nedar ber `week == null ? "preseason (no week)" : ...`
       fyrir NAKVAEMLEGA SAMA gildi. Konsol-utakid var thvi rett allan
       timann og ADEINS thad sem notandinn ser var rangt, sem er versta
       vixlunin af theim tveimur.

       Vordur: `audit.mjs` kafli 1 (`\bnull\b` i DOM) — hann GREIP thetta
       og var thagaður, sja commit a undan thessum. */
    const when = week == null ? `${season} preseason` : `${season} week ${week}`;
    next.push({ name: "advice_ledger", ok: !!okFlag && !gaps.length,
                note: `${when}: ${note}${gapTxt}`,
                ts: new Date().toISOString(), stage: "ledger", stale: false });
    st.sources = next;
    writeFileSync(p, JSON.stringify(st));
  } catch (e) {
    /* Status-skrain er EKKI mikilvaegari en bokhaldid sjalft. Loggad,
       ekki kastad. */
    console.log(`snapshot-advice: could not record status (${e.message})`);
  }
}

/* ---- Sleeper: rostrar, notendur og deildarreglur ----
   Sleeper sendir CORS-hausa og krefst engra lykla, svo thetta er sama
   sokn og vafrinn gerir. Bilun a EINNI deild ma ekki fella hinar. */
async function readLeague(id, name) {
  const get = async (path) => {
    const r = await fetch(`https://api.sleeper.app/v1/league/${id}${path}`);
    if (!r.ok) throw new Error(`HTTP ${r.status} on ${path || "/"}`);
    return r.json();
  };
  try {
    const [league, rosters, users] = await Promise.all([get(""), get("/rosters"), get("/users")]);
    return { id, name, league, rosters, users, error: null };
  } catch (e) {
    return { id, name, league: null, rosters: null, users: null,
             error: String(e.message || e) };
  }
}

/* ---------------- keyrsla ---------------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dry = process.argv.includes("--dry");
  if (dry) console.log("snapshot-advice: DRY RUN - nothing will be written (no data/advice/, no status.json)");

  const meta = tryJ("meta.json");
  const schedule = tryJ("schedule.json") || [];
  const season = meta && meta.season != null ? Number(meta.season) : null;
  /* ============================================================
     `--week=N` ER ADEINS FYRIR ThURRKEYRSLU — OG ThAD ER ASTAEDA
     ============================================================
     I forleik er `currentWeek(meta)` NULL (`seasonType: "pre"`), svo
     thurrkeyrsla getur ekki synt NEITT — sem er nakvaemlega sama gatid og
     `--dry` hafdi i FPL-bokhaldinu: einskota maelitaeki sem ekki er haegt
     ad aefa fyrr en thad er komid i gang. `--week` leyfir aefinguna.

     ThAD MA ALDREI VIRKA I RAUNKEYRSLU. Vaeri hann virkur thar gaeti hann
     skrifad rod fyrir viku sem appid syair ekki, og hun myndi lesast
     seinna eins og radgjof sem notandinn fekk. Hlidid er hér, i EINNI
     linu, og `tests/advice-ledger.mjs` kafli 6 fellur ef thad hverfur. */
  const weekArg = /^--week=(\d+)$/.exec(process.argv.find((a) => /^--week=/.test(a)) || "");
  if (weekArg && !dry) {
    console.log("snapshot-advice: --week is a DRY-RUN REHEARSAL FLAG and is refused in a real run");
    process.exit(1);
  }
  const week = (dry && weekArg) ? Number(weekArg[1]) : currentWeek(meta);
  if (dry && weekArg) console.log(`snapshot-advice: REHEARSING week ${week} (--week, dry only)`);
  const anchorMs = week == null ? NaN : weekAnchor(schedule, season, week);
  const nowMs = Date.now();
  const label = week == null ? "preseason (no week)" : `${season} w${week}`;
  const file = `${OUT}${season}-w${week}.json`;
  const has = (w) => existsSync(`${OUT}${season}-w${w}.json`);
  const gaps = week == null ? [] : ledgerGaps({ schedule, season, week, nowMs, has });
  if (gaps.length) console.log(`snapshot-advice: LEDGER GAPS - no row for week ${gaps.join(", ")}`);

  const gate = shouldWrite({ season, week, anchorMs, nowMs, exists: existsSync(file) });
  const inWindow = Number.isFinite(anchorMs)
    && anchorMs > nowMs && (anchorMs - nowMs) / 36e5 <= WINDOW_H;
  if (!gate.write) {
    console.log(`snapshot-advice ${label}: ${dry ? "would skip" : "skipped"} - ${gate.why}`);
    if (!dry) {
      /* SKIP MA VERA GRAENT — NEMA GLUGGINN SE OPINN OG SKRAIN VANTI. */
      recordLedger(season, week, !inWindow || existsSync(file), gate.why, gaps);
      process.exit(0);
    }
    /* ThURR KEYRSLA HELDUR AFRAM I GEGNUM LOKAD HLID. Hun er ad svara
       "hvad baeri rodin ef glugginn vaeri opinn nuna", sem er einmitt su
       spurning sem er osvaranleg eftir a. FPL-bokhaldid hafdi `--dry`
       sem SKRIFADI og prentadi ENGA thekju — thad gerdi nakvaemlega
       hvorugt thess sem thad er til fyrir. */
  }

  /* Bordid er byggt EINS OG APPID BYGGIR ThAD. `buildRows` er flutt inn;
     `league` er per deild, svo bordid er byggt per deild — VBD og threp
     eru deildar-hað (`replacementRanks`), og eitt bord fyrir badar
     deildir vaeri rong tala i annarri theirra. */
  const players = tryJ("players.json");
  const base = { players, seasons: tryJ("seasons.json"), accuracy: tryJ("accuracy.json"),
                 experts: tryJ("experts.json"), schedule, market: tryJ("market.json") };
  /* Hlidid er a BORDINU, ekki a hrau skranni — sja `inputsUsable`. Bordid
     er byggt einu sinni med sjalfgefnu sniði BARA fyrir hlidid; hver deild
     faer sitt eigid bord nedar (VBD er deildar-hað). */
  const probe = buildRows({ ...base });
  const bad = inputsUsable({ rows: probe.rows, schedule, season, week });
  if (bad) {
    console.log(`snapshot-advice ${label}: NOT written - ${bad}`);
    if (!dry) recordLedger(season, week, false, `WINDOW OPEN but nothing recorded - ${bad}`, gaps);
    process.exit(0);
  }

  try {
    const want = (process.env.NFL_LEDGER_LEAGUES || "").split(",")
      .map((s) => s.trim()).filter(Boolean);
    const conf = want.length ? want.map((id) => ({ id, name: null })) : LEAGUES;
    const live = await Promise.all(conf.map((l) => readLeague(l.id, l.name)));

    const leagues = live.map((l) => ({
      id: l.id, name: l.name || (l.league && l.league.name) || null,
      error: l.error, rosters: l.rosters, users: l.users,
      /* DEILDARREGLURNAR ERU LEIDDAR UR SLEEPER-SVARINU, ekki gefnar ser.
         `roster_positions` er thad sem `startersFromRoster` les og thad
         er hvernig appid veit ad ein deildin byrjar DEF og hin ekki. */
      rules: l.league ? {
        teams: Array.isArray(l.rosters) ? l.rosters.length : null,
        rosterPositions: l.league.roster_positions || null,
        settings: l.league.scoring_settings || null,
      } : null,
      userId: null,
    }));

    /* DEILDARREGLURNAR I RETTU FORMI. `leagueFromSleeper` er thad sem
       appid notar; hun er flutt inn svo bokhaldid geti ekki lesid adrar
       reglur en notandinn sa. */
    const { leagueFromSleeper } = await import("../src/sleeper-league.js");
    for (const l of leagues) {
      const raw = live.find((x) => x.id === l.id);
      if (raw && raw.league) {
        try { l.rules = leagueFromSleeper({ league: raw.league }); }
        catch { /* reglurnar leidast ekki -> sjalfgefid snid, og thad sest
                   i `shape` i rodinni. */ }
      }
      /* HVER ER MITT LID: `owner_id` a rostri er Sleeper-notandinn. Vid
         hofum ekki notandanafnid sem appid hefur i localStorage, en
         `standingsFrom`/`myRosterId` tekur `userId`, svo hann er leiddur
         ur ThVI ROSTRI SEM BER FLESTA LEIKMENN? NEI — thad vaeri agiskun.
         Vanti hann er svarid `null` og rodin BER ThAD (`startsitWhy`),
         thvi radgjof um rangt lid er verri en engin. */
      l.userId = process.env.NFL_LEDGER_USER || null;
    }

    const rowsByLeague = new Map();
    for (const l of leagues) {
      const built = buildRows({ ...base, league: normalizeLeague(l.rules) });
      rowsByLeague.set(l.id, built.rows || []);
    }
    /* EIN ROD PER DEILD ur SINU bordi. `buildAdviceSnapshot` tekur eitt
       `rows`, svo hun er kolluð per deild og rodirnar sameinaðar — betra
       en ad lata eina deild lesa bord hinnar. */
    const parts = leagues.map((l) => buildAdviceSnapshot({
      season, week, rows: rowsByLeague.get(l.id), schedule,
      defense: tryJ("defense.json"), meta, leagues: [l], anchorMs, nowTs: nowMs,
    }));
    const snap = { ...parts[0], leagues: parts.flatMap((p) => p.leagues) };
    snap.coverage = parts.reduce((a, p) => {
      for (const [k, v] of Object.entries(p.coverage)) a[k] = (a[k] || 0) + v;
      return a;
    }, {});

    if (dry) {
      console.log(`snapshot-advice ${season} w${week} (dry): gate ${gate.write ? "OPEN" : "CLOSED"} - ${gate.why}`);
      console.log(`snapshot-advice (dry): nfl ${JSON.stringify(snap.nfl)}`);
      console.log(`snapshot-advice (dry): coverage ${JSON.stringify(snap.coverage)}`);
      for (const l of snap.leagues) {
        console.log(`  ${l.name || l.id}: ${l.error ? `ERROR ${l.error}`
          : `${l.startsit ? `${l.startsit.starters.length} slots, projected ${l.startsit.projected}`
             : `no start/sit (${l.startsitWhy})`}`
            + ` · ${l.waivers ? `${l.waivers.picks.length} picks` : `no waivers (${l.waiversWhy})`}`
            + ` · ${l.dst ? `dst ${l.dst.best.length} best` : "no dst seat"}`}`);
      }
      console.log(`snapshot-advice (dry): NOTHING WRITTEN (target would be ${file})`);
      process.exit(0);
    }

    /* ThUNN UTKOMA -> ENGIN SKRA. Skra thar sem hvorug deildin gaf rad er
       ekki maeling, hun er umbud (sama lærdomur og `rowCount`: "rod er
       farmur, ekki umbudir"). */
    if (!snap.coverage.leaguesWithStartsit && !snap.coverage.leaguesWithWaivers) {
      const why = snap.leagues.map((l) => l.error || l.startsitWhy || "?").join(" · ");
      console.log(`snapshot-advice ${season} w${week}: NOT written - no league produced advice (${why})`);
      recordLedger(season, week, false, `WINDOW OPEN but no league produced advice - ${why}`, gaps);
      process.exit(0);
    }

    mkdirSync(OUT, { recursive: true });
    writeFileSync(file, JSON.stringify(snap));
    console.log(`snapshot-advice ${season} w${week}: written (${snap.coverage.leagues} leagues, `
      + `${snap.coverage.players} players, ${snap.coverage.picks} picks) - ${gate.why}`);
    recordLedger(season, week, true,
      `recorded ${gate.why} · players ${snap.coverage.proj}/${snap.coverage.players} with proj`
      + ` · lines ${snap.nfl.lines}/${snap.nfl.games * 2} · defence ${snap.nfl.defSeason ?? "none"}`,
      gaps);
  } catch (e) {
    /* HRUN INNAN GLUGGANS ER ThAD SEM MA ALDREI ThEGJA. */
    console.log(`snapshot-advice ${season} w${week}: FAILED - ${e.message}`);
    if (!dry) recordLedger(season, week, false, `WINDOW OPEN but the snapshot threw: ${e.message}`, gaps);
    process.exit(0);
  }
}
