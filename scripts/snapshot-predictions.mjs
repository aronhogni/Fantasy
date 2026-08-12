/* ============================================================
   SPA-BOKHALDID — ThAD SEM VID SOGDUM ADUR EN VID VISSUM

   HVERS VEGNA ThESSI SKRA ER TIL (11.8.2026):
   Allt i thessu repo-i er MAELT — a 2019-2026. Ekkert i thvi maelir hvort
   maelingarnar HALDI AFRAM ad gilda. Bakprofin svara "var thetta rett i
   fortidinni"; enginn spyr "er thad enn rett i thessu timabili".

   OG ThAD ER EKKI HAEGT AD SPYRJA EFTIR A. FFDR, `rankScore` og
   byrjunar-likurnar eru reiknadar I APPINU ur gognum sem BREYTAST i hverri
   viku (verd, form, elo, markadslina). Vid getum ekki endurbyggt "hvad hefdum
   vid sagt fyrir GW5" thegar GW5 er lidin — inntokin eru horfin.

   ThVI ER ThETTA SAMA ROKSEMD OG `data/history/` (CLAUDE.md kafli 7):
   **dagleg mynd verdur ekki bum til eftir a.** Spa sem var ekki skrifud nidur
   ADUR en umferdin var spilud er ekki spa, hun er eftira-skyring.

   ThRJAR REGLUR SEM GERA BOKHALDID MARKTAEKT — an theirra vaeri thad verra
   en ekkert, thvi thad vaeri sjalfs-uppfyllandi:

     1. ADEINS FYRIR FREST. Spa skrifud eftir ad leikur er byrjadur er ekki
        spa. Sama regla og `pros.mjs` kafli 12 setur a sokn a lidum.
     2. ADEINS EINU SINNI. Skra sem ThEGAR er til er ALDREI yfirskrifud, ekki
        heldur "til ad uppfaera hana med betri gognum" — spa sem er endurskrifud
        eftir ad hun var gerd er retro-fitting. Skran er ONEMANDI.
     3. ThUNN INNTOK -> ENGIN SKRA. Betra er ad umferd vanti i bokhaldid en ad
        hun beri spa reiknada ur halfum gognum; sidara les eins og maeling.

   Skrifar `data/predictions/gw{N}.json`. Keyrsla:
       node scripts/snapshot-predictions.mjs            (les data/, skrifar)
       node scripts/snapshot-predictions.mjs --dry      (skrifar ekkert)
   Kallad ur hradri keyrslunni (`fetch-fast`), thvi thad er hun sem gengur
   naerri frestinum; daglega keyrslan kl. 05 UTC er of langt fra honum.
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { makeFixDifficulty, tierOf, rankScore } from "../src/model.js";
import { startFeatures, startProbability } from "../src/stats.js";
/* LIDSVISARNIR ERU FLUTTIR INN, EKKI ENDURREIKNADIR. Fyrsta utgafa thessarar
   skriftu endurreiknadi thá og skrifadi `+(x.gf / x.matches)` — `team_form.json`
   ber ENGIN `gf`/`ga`, hun ber `goals_pg`/`conceded_pg` ThEGAR per leik. Utkoman
   var `NaN` fyrir oll 17 E0-lidin, MERKT sem maeling, og afritid slepptii auk
   thess `sotFor`/`sotAg`, `prev*`-adloguninni, `matches` og nyliða-stadgenglinum.
   Bokhald sem reiknar likanid upp a nytt maelir annad likan en notandinn sa. */
import { buildTeamMetrics } from "../src/teamstats.js";

const DATA = new URL("../data/", import.meta.url).pathname;
const OUT = DATA + "predictions/";
const J = f => JSON.parse(readFileSync(DATA + f, "utf8"));
const tryJ = f => { try { return J(f); } catch { return null; } };
const arr = (v, k) => Array.isArray(v) ? v : (Array.isArray(v?.[k]) ? v[k] : null);


/* HREINT: tekur gogn, skilar bokhalds-rod. Engin skrif, engin klukka —
   thess vegna er thad profanlegt a tilbunum gognum ADUR en 21. agust.  */
export function buildSnapshot({ gw, players, teams, fixtures, teamForm, odds, elo, playerForm, promoted, nowTs }) {
  const teamMetrics = buildTeamMetrics({ players, teams, promoted, teamForm });
  const teamById = {}; for (const t of teams) teamById[t.id] = t;
  const eloByTeam = {};
  for (const e of (Array.isArray(elo?.teams) ? elo.teams : []))
    if (e && e.fpl_id != null) eloByTeam[e.fpl_id] = e.elo ?? e.rating ?? null;
  const fixDifficulty = makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam });

  /* FFDR per LEIK og per STODU-HOP. Tvo hopar, eins og spjoldin: 2 = GK+DEF
     (mork a sig) og 4 = MID+FWD (eigin vaent mork). Bædi samfellda talan OG
     threpid eru skrad — threpid er birtingin, `d` er thad sem likanid les, og
     kvordunar-profid tharf BADAR (threp eitt gefur grofari maelingu).     */
  const ffdr = [];
  for (const f of fixtures) {
    if (f.event !== gw) continue;
    for (const [teamId, oppId, home] of [[f.team_h, f.team_a, true], [f.team_a, f.team_h, false]]) {
      const fx = { opp: oppId, home, fdr: home ? f.team_h_difficulty : f.team_a_difficulty,
                   kickoff: f.kickoff_time };
      const row = { fixture: f.id, team: teamId, opp: oppId, home };
      for (const [key, pos] of [["def", 2], ["att", 4]]) {
        const d = fixDifficulty(teamId, fx, pos);
        row[key] = d == null ? null : +d.toFixed(3);
        row[key + "_tier"] = d == null ? null : tierOf(d);
      }
      ffdr.push(row);
    }
  }

  /* `player_form.json` LYKLAR A ID, ER EKKI FYLKI — og fyrsta utgafa thessarar
     skrar reyndi ad iterera hana (`for (const x of players)`) og fell med
     "object is not iterable". App.jsx les `playerForm?.players?.[p.id]`, svo
     thad er thad snid sem gildir. Tom i forleik (`gws_used: 0`).          */
  const pfById = (playerForm && playerForm.players && typeof playerForm.players === "object"
                  && !Array.isArray(playerForm.players)) ? playerForm.players : {};

  /* RODUNIN: hver leikmadur med skorid OG inntokin. Inntokin fylgja svo
     kvordunin geti sagt HVERS VEGNA skorid var thad sem thad var — skor an
     inntaka er tala sem ekki er haegt ad rannsaka.                        */
  const nextFx = {};
  for (const f of fixtures) {
    if (f.event !== gw) continue;
    (nextFx[f.team_h] ||= []).push({ opp: f.team_a, home: true, fdr: f.team_h_difficulty, kickoff: f.kickoff_time });
    (nextFx[f.team_a] ||= []).push({ opp: f.team_h, home: false, fdr: f.team_a_difficulty, kickoff: f.kickoff_time });
  }
  /* INNTOKIN ERU SAMSETT NAKVAEMLEGA EINS OG App.jsx GERIR ThAD (linur
     1725-1731). Thad er ekki smekkur: bokhald sem geymir "naerri" thad sem
     skjarinn syndi maelir annan hlut en notandinn sa, og tha er kvordunin
     ad meta likan sem enginn notadi.
       form        = parseFloat(p.form)
       minsPerGame = pf.mins5 EF hun er til, annars minutur / loknar umferdir
                     (38 i forleik — thad er FYRRA timabilid, sem er rett)
       price       = (now_cost ?? 45) / 10   <- 45, ekki 0
       ffdr        = MEDALTAL yfir leiki umferdarinnar
       minsTrend   = pf.mins_trend (0/undefined fram ad GW4)
     `gamesSoFar` er fjoldi LOKINNA umferda; her er thad leidd ut ur
     fixtures.json i stad thess ad vera gefid, svo skriftan se sjalfstaed. */
  const gamesSoFar = fixtures.filter(f => f.finished).reduce((mx, f) =>
    Math.max(mx, Number(f.event) || 0), 0) || 38;
  const rank = [];
  for (const p of players) {
    const fxs = nextFx[p.team] || [];
    const pos = p.element_type === 1 || p.element_type === 2 ? 2 : 4;
    const ds = fxs.map(fx => fixDifficulty(p.team, fx, pos)).filter(d => d != null);
    const ffdrAvg = ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null;
    const mins = Number(p.minutes) || 0;
    const pf = pfById[p.id];
    const inputs = {
      form: parseFloat(p.form) || 0,
      minsPerGame: Number.isFinite(pf?.mins5) ? pf.mins5 : mins / Math.max(1, gamesSoFar),
      price: (p.now_cost ?? 45) / 10,
      ffdr: ffdrAvg,
      minsTrend: pf?.mins_trend,
    };
    /* TILTAEKILEIKINN ER MARGFALDARI A RODUNINA i appinu (status "a" -> 1,
       annars chance/100, og 0,5 thegar talan vantar). Hann er skradur SER,
       EKKI blandadur i skorid: kvordunin tharf ad geta maelt rodunar-vélina
       eina OG rodunina eins og hun birtist.                              */
    const chance = p.chance_of_playing_next_round;
    const avail = p.status === "a" ? 1
      : (typeof chance === "number" && Number.isFinite(chance)) ? chance / 100 : 0.5;
    const sp = startProbability(startFeatures(mins, p.now_cost ?? null));
    const raw = rankScore(inputs);
    rank.push({
      id: p.id, code: p.code, team: p.team, pos: p.element_type,
      score: +raw.toFixed(4),
      score_avail: +(raw * avail).toFixed(4),
      avail,
      inputs: { ...inputs, ffdr: inputs.ffdr == null ? null : +inputs.ffdr.toFixed(3),
                minsPerGame: +Number(inputs.minsPerGame).toFixed(1),
                minsTrend: inputs.minsTrend ?? null },
      start_prob: sp == null ? null : +sp.toFixed(4),
      /* FPL-EIGID xP ER VIDMIDID, ekki skraut: `rank-model.mjs` maelir sig
         gegn thvi (4,48 a moti 5,13) og kvordunin verdur ad gera thad lika,
         annars er "5,1 stig per val" tala an samanburdar.                */
      ep_next: p.ep_next == null ? null : Number(p.ep_next),
      status: p.status ?? null,
      /* Vaentanlegt: `blank` thegar lid a engan leik i umferdinni.        */
      fixtures: fxs.length,
    });
  }
  rank.sort((a, z) => z.score - a.score);

  return {
    gw,
    generated: new Date(nowTs).toISOString(),
    sources: { odds: !!odds, elo: !!elo, team_form: !!teamForm, player_form: !!playerForm },
    note: "PREDICTIONS RECORDED BEFORE THE DEADLINE. Written once and never "
        + "rewritten - a prediction re-recorded after the fact is not a prediction. "
        + "Compared against outcomes by tests/calibration.mjs.",
    ffdr,
    rank,
  };
}

/* ---- ThUNN INNTOK: hvad VERDUR ad vera til svo rod se marktaek ---- */
export function inputsUsable({ players, teams, fixtures, gw }) {
  if (!Array.isArray(players) || players.length < 400) return "players.json is thin";
  if (!Array.isArray(teams) || teams.length !== 20) return "teams.json is not 20 clubs";
  if (!Array.isArray(fixtures) || !fixtures.length) return "fixtures.json is empty";
  if (!Number.isInteger(gw) || gw < 1 || gw > 38) return `gw ${gw} is out of range`;
  if (!fixtures.some(f => f.event === gw)) return `no fixture carries event ${gw}`;
  return null;
}

/* ---- FRESTURINN: adeins FYRIR hann, og adeins einu sinni ---- */
export function shouldWrite({ gw, deadlineMs, nowMs, exists }) {
  if (exists) return { write: false, why: `gw${gw} already recorded - never rewritten` };
  if (!Number.isFinite(deadlineMs)) return { write: false, why: "no deadline for the gameweek" };
  if (nowMs >= deadlineMs) return { write: false, why: "deadline has passed - a prediction made after kickoff is not a prediction" };
  return { write: true, why: `${Math.round((deadlineMs - nowMs) / 60000)} min before the deadline` };
}

/* ---------------- keyrsla ---------------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dry = process.argv.includes("--dry");
  const events = arr(tryJ("events.json"), "events") || [];
  const cur = events.find(e => e.is_next) || events.find(e => e.is_current);
  if (!cur) { console.log("snapshot: no next gameweek in events.json - nothing to do"); process.exit(0); }
  const gw = cur.id;
  const deadlineMs = Date.parse(cur.deadline_time);
  const file = `${OUT}gw${gw}.json`;
  const gate = shouldWrite({ gw, deadlineMs, nowMs: Date.now(), exists: existsSync(file) });
  if (!gate.write) { console.log(`snapshot gw${gw}: skipped - ${gate.why}`); process.exit(0); }

  const players = arr(tryJ("players.json"), "players");
  const teams = arr(tryJ("teams.json"), "teams");
  const fixtures = arr(tryJ("fixtures.json"), "fixtures");
  const bad = inputsUsable({ players, teams, fixtures, gw });
  if (bad) { console.log(`snapshot gw${gw}: NOT written - ${bad}`); process.exit(0); }

  const snap = buildSnapshot({
    gw, players, teams, fixtures,
    teamForm: tryJ("team_form.json"), odds: tryJ("odds.json"),
    elo: tryJ("elo.json"), playerForm: tryJ("player_form.json"),
    promoted: tryJ("promoted_baseline.json"), nowTs: Date.now(),
  });
  if (dry) {
    console.log(`snapshot gw${gw} (dry): ${snap.ffdr.length} ffdr rows, ${snap.rank.length} players`);
    process.exit(0);
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(file, JSON.stringify(snap));
  console.log(`snapshot gw${gw}: written (${snap.ffdr.length} ffdr rows, ${snap.rank.length} players) - ${gate.why}`);
}
