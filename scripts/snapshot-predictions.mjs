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
/* `startFeatures` er VILJANDI EKKI FLUTT INN: hun tekur fylki af minutum og
   pipeline reiknar tha vidd ThEGAR i `imminent.json` (`start_feats`). Innflutt
   fall sem enginn kallar er bod um ad kalla thad rangt — sem var einmitt
   villan her (sja buildSnapshot).                                          */
import { startProbability } from "../src/stats.js";
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
export function buildSnapshot({ gw, players, teams, fixtures, teamForm, odds, elo, playerForm, promoted, imminent, nowTs }) {
  /* ============================================================
     BYRJUNAR-LIKURNAR KOMU UR ENGU — MAELT OG LAGAD 14.8.2026.
     Her stod `startProbability(startFeatures(mins, p.now_cost))` thar sem
     `mins` var TALA (`Number(p.minutes) || 0`). `startFeatures` tekur FYLKI
     af minutum sidustu umferda: `Array.isArray(mins)` var false -> `m = []`
     -> `m.length < 2` -> null -> `startProbability(null)` -> null.
     ThVI VAR `start_prob` NULL FYRIR ALLA 584, OG HEFDI VERID ThAD ALLT
     TIMABILID — ekki adeins i forleik. Kvordunin (Brier + bekkjar-gildran,
     `calibration.mjs`) hefdi thvi ALDREI getad maelt thessa vidd.
     Prófin voru graen af thvi ad thau profudu FORMULUNA, ekki hvort gognin
     sem hun faer seu nytileg — sami aettbogi og dauði markadslidurinn
     (CLAUDE.md 3) og auðgunin i `cook` (CLAUDE.md 8).
     RETTA HEIMILDIN ER SU SEM APPID NOTAR: `imminent.json` ber `start_feats`
     (5-umferda gluggi, reiknadur i pipeline) og App.jsx les hann beint
     (`im?.start_feats ? startProbability(im.start_feats) : null`). Bokhaldid
     verdur ad reikna a NAKVAEMLEGA somu tolum — sami lærdomur og flutningur
     `buildTeamMetrics` (CLAUDE.md 7.1): afrit af utreikningi laug.
     PORUN A `code`, EKKI NAFNI: `code` er fast yfir timabil og
     `imminent.json` ber thad (841 rodum, 841 einkvaem). Appid notar nafna-
     porun innan lids, sem er einmitt uppflettingin sem gaf falskt null i
     sumarglugganum (CLAUDE.md 3, Meslier/38 leikmenn a rongu lidi). Hér er
     ekkert ad giska: 459 af 584 parast, allir 459 med `start_feats`; hinir
     125 eiga engin gogn i glugganum og fa RETTILEGA null.
     ============================================================ */
  const startFeatsByCode = new Map();
  for (const r of (Array.isArray(imminent?.players) ? imminent.players : []))
    if (r && r.code != null && r.start_feats) startFeatsByCode.set(String(r.code), r.start_feats);
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
    /* `startFeatures` er EKKI kollud her — sja hausinn a buildSnapshot.
       `start_feats` kemur reiknadur ur pipeline, eins og appid les hann. */
    const sf = startFeatsByCode.get(String(p.code));
    const sp = sf ? startProbability(sf) : null;
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
    /* ThEKJA ER TALA, EKKI BOOLEAN — og hun a ad vera i skranni.
       `!!playerForm` sagdi "ja, skrain var til" medan hun bar engar radir,
       og `start_prob` var null fyrir alla 584 an thess ad nokkud i skranni
       segdi fra thvi. Kvordun sem reiknar Brier yfir NULL radir gefur tolu
       sem lítur eins ut og maeling — versta utkoman (CLAUDE.md 3). Nu telur
       skrain sjalf hversu margar radir baru hverja vidd, svo `calibration`
       getur sagt "of faar maelingar -> ENGIN tala" i stad thess ad thegja. */
    sources: { odds: !!odds, elo: !!elo, team_form: !!teamForm, player_form: !!playerForm,
               imminent: !!imminent },
    coverage: {
      players: rank.length,
      start_prob: rank.filter(r => r.start_prob != null).length,
      mins_trend: rank.filter(r => r.inputs?.minsTrend != null).length,
      ffdr: rank.filter(r => r.inputs?.ffdr != null).length,
      ep_next: rank.filter(r => r.ep_next != null).length,
    },
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

/* ---- FRESTURINN: I GLUGGA FYRIR HANN, og adeins einu sinni ----

   GLUGGINN VAR EKKI TIL I FYRSTU UTGAFU OG ThAD VAR RAUNVERULEG VILLA.
   Reglurnar "skrifa adeins fyrir frest" og "skrifa adeins einu sinni" eru
   badar rettar — en SAMAN gafu thaer "skrifa VID FYRSTA TAEKIFAERI og
   frysta". Hrada keyrslan gengur a 30 min fresti, svo GW1-rodin var skrifud
   **12.8. kl. 09:45, 222 KLST fyrir frestinn** (21.8. kl. 17:30), med:
       start_prob   0 af 577 (player_form tom i forleik)
       minsTrend    0 af 577
   Thad er STRANGT VERRI spa en su sem vid munum eiga nokkrum klst fyrir
   frest — og kvordunin hefdi thvi maelt likanid a sinni EIGIN VERSTU
   agiskun, sem hefdi latid thad lita verr ut en thad er.

   GLUGGINN LEYSIR ThETTA AN AD GEFA UPP ONEMANLEIKANN: vid skrifum adeins
   thegar fresturinn er I NAND, og tha aldrei aftur. 12 klst er valid svo
   30-minutna cron-inn fai ~24 taekifaeri (ein keyrsla ma bresta) medan
   gognin eru samt naer-endanleg: verd og fréttir hreyfast lítið sidasta
   daginn, og STADFEST byrjunarlid eru hvort sem er EKKI til fyrir frest
   (FPL-fresturinn er ~1,5 klst fyrir fyrsta leik, lidin birtast ~1 klst
   fyrir hvern leik). Ad bida lengur kaupir thvi enga upplysingu.

   HVERS VEGNA ThAD VAR OHAETT AD EYDA ROD SEM ThEGAR VAR SKRIFUD: onemanleiki
   er til ad hindra RETRO-FITTING — ad breyta spa eftir ad utkoman er kunn.
   GW1 var OSPILUD, svo engin utkoma var til; ad taka myndina a rettum tima i
   stad ranga er ekki endurskrifun a spa heldur RETT TIMASETNING a maelingu.
   Reglan i kodanum er samt einfold og omisnotanleg: skrifad adeins i
   glugganum, aldrei tvisvar.                                              */
/* ============================================================
   EFTIRLIT — ThOGN VAR EINA RAUNVERULEGA HAETTAN (14.8.2026)

   `snapshot-predictions.mjs` keyrir med `continue-on-error: true` i
   `fetch-fast.yml`, og ThAD ER RETT: bokhaldid er maelitaeki og ma aldrei
   fella gagna-keyrsluna. En thad thydir lika ad bilun INNAN 12-tima
   gluggans (opnast 21.8. kl. 05:30 UTC fyrir GW1) er ALGERLEGA ThOGUL —
   skrefið verdur graent i Actions, engin skra verdur til, og GW1-rodin
   verdur ALDREI endurskopud thvi inntokin eru horfin eftir frestinn.
   Ekkert i repo-inu hefdi sagt fra thvi: `calibration.mjs` SEFUR thegar
   `data/predictions/` er tom (rett hegdun, en tha maelir hun ekki neitt),
   og `gw1-checklist.mjs` nefnir bokhaldid ekki.

   ThVI SKRIFAR SKRIFTAN SJALF LINU I `status.json` I HVERT SKIPTI. Hun
   birtist undir "Data sources" i hlidarstikunni, thar sem notandinn les
   heimildir hvort sem er (CLAUDE.md 7: "Baetir thu vid heimild: skradu hana
   thar, annars er hun osynileg thegar hun brotnar").

   REGLAN UM LITINN: skip er GRAENT (utan gluggans er ekkert ad gera, og
   "thegar skrad" er rett svar), en **gluggi opinn + engin skra = RAUTT**.
   Thad er nakvaemlega su samsetning sem enginn hefdi tekid eftir.        */
export function windowOpen({ deadlineMs, nowMs, windowH = WINDOW_H }) {
  if (!Number.isFinite(deadlineMs)) return false;
  const hLeft = (deadlineMs - nowMs) / 36e5;
  return hLeft > 0 && hLeft <= windowH;
}

/* ============================================================
   PATCHAR EINA ROD I `status.json` — OG ROKSTUDNINGURINN HER VAR RANGUR

   Her stod: "`fetch.mjs` hefur thegar skrifad skrana i sama starfi
   (skrefinu a undan)". ThAD ER OSATT og var thad alltaf. Leidrett 16.8.2026:

     · Thessi skrifta keyrir ADEINS i hrada starfinu (`fetch-fast.yml`,
       skrefid "Skra spa"), a eftir `node scripts/fetch.mjs --fast`.
     · `--fast`-leidin skrifar `status_fast.json` — HUN SNERTIR ALDREI
       `status.json`. Su skra er skrifud i DAGLEGU keyrslunni kl. 05 UTC.
   Skrefid a undan skrifar thvi ADRA skra en tha sem vid patchum.

   UTKOMAN ER SAMT RETT SKRA, en ekki af theirri astaedu sem stod her.
   App.jsx les BADAR stoduskrar og blandar theim (`{...status,
   ...status_fast}`, hrada skrain vinnur a somu lyklum), svo rod i
   `status.json` SEST i "Data sources" — og `prediction_ledger` er hvergi
   annars stadar skrifud, svo enginn lykla-arekstur er til stadar.
   Retta setningin er thvi: vid patchum skra sem VID SKRIFUDUM EKKI I
   thessu starfi, og hun er samt su skra sem hlidarstikan les.

   ThAD SEM ThETTA ThYDIR I RAUN, OG ER RETT AD VITA:
     1. Skrain sem vid lesum getur verid ALLT AD SOLARHRINGS GOMUL. Vid
        maegum thess vegna ekki byggja hana upp a nytt — les-breyta-skrifa,
        adeins okkar lykill. Thad er OBREYTT og er enn rett.
     2. ThAD ER KAPPHLAUP VID DAGLEGU KEYRSLUNA (05 UTC). Skrifi hun
        `status.json` a milli thess sem vid lesum og skrifum, skrifum vid
        gomlu myndina til baka med okkar rod ofan a. Glugginn okkar er 12
        klst fyrir frest (~05:30 UTC fyrir GW1-frest kl. 17:30) svo thetta
        er RAUNVERULEGT bil, ekki fraedilegt.
        ThAD ER LATID STANDA VILJANDI: hvor keyrsla um sig endurmyndar
        `data/` I HEILD i naestu umferd (sama rok og `rebase -X theirs` i
        push-kapphlaupinu, CLAUDE.md 7), svo tapid er i mesta lagi EIN
        stodurod i alt ad einn dag — medan lasing eda vidbotar-skra vaeri
        ny bilunar-leid i maelitaeki sem ma aldrei fella gagna-keyrsluna.
        Skrad her svo naesti madur endurtaki ekki greininguna.
   ============================================================ */
function recordLedger(gw, okFlag, count, note, gaps = []) {
  try {
    const p = DATA + "status.json";
    const st = JSON.parse(readFileSync(p, "utf8"));
    /* HOLUR ERU VARANLEGT TAP OG ThVI ALLTAF RAUTT. "Gluggi opinn + engin
       skra" varar vid ADUR en rodin tapast; thetta segir ad hun ER topud.
       Ohja: eftir frestinn flettir FPL `is_next` a naestu umferd, svo su
       fyrri hverfur ur athugun skriftunnar og tapid vaeri annars osynilegt
       — graen lina AF ThVI ad glugginn er lokadur.                        */
    const gapTxt = gaps.length
      ? ` · MISSING ledger rows for GW${gaps.slice(0, 6).join(", GW")}`
        + (gaps.length > 6 ? ` (+${gaps.length - 6} more)` : "")
        + " - those deadlines have passed and the inputs are gone"
      : "";
    (st.sources ||= {}).prediction_ledger = {
      ok: !!okFlag && !gaps.length, count, note: `GW${gw}: ${note}${gapTxt}`,
    };
    writeFileSync(p, JSON.stringify(st));
  } catch (e) {
    /* Status-skrain er EKKI mikilvaegari en bokhaldid sjalft: ef hun er
       ekki til (t.d. handvirk keyrsla an pipeline) ma thetta ekki fella
       skriftuna. Loggad, ekki kastad.                                    */
    console.log(`snapshot: could not record status (${e.message})`);
  }
}

/* HREINT: hvada umferdir eru ThEGAR tapadar? Frestur lidinn OG engin rod.
   Tekid ut ur keyrslunni svo thad se profanlegt an klukku og an skra.    */
export function ledgerGaps({ events, nowMs, has }) {
  return (Array.isArray(events) ? events : [])
    .filter(e => e && Number.isInteger(e.id) && Date.parse(e.deadline_time) < nowMs)
    .filter(e => !has(e.id))
    .map(e => e.id);
}

export const WINDOW_H = 12;
export function shouldWrite({ gw, deadlineMs, nowMs, exists, windowH = WINDOW_H }) {
  if (exists) return { write: false, why: `gw${gw} already recorded - never rewritten` };
  if (!Number.isFinite(deadlineMs)) return { write: false, why: "no deadline for the gameweek" };
  if (nowMs >= deadlineMs) return { write: false, why: "deadline has passed - a prediction made after kickoff is not a prediction" };
  const hLeft = (deadlineMs - nowMs) / 36e5;
  if (hLeft > windowH)
    return { write: false, why: `${hLeft.toFixed(1)}h before the deadline - outside the ${windowH}h window, `
                              + "an early snapshot would freeze a worse-informed prediction" };
  return { write: true, why: `${Math.round((deadlineMs - nowMs) / 60000)} min before the deadline` };
}

/* ============================================================
   `--dry` VAR EKKI ThURR — OG ThAD LOKADI AEFINGUNNI FYRIR GW1 (16.8.2026)

   Hausinn a thessari skra lofar: `--dry` "skrifar ekkert". Kodinn las
   flaggid i fyrstu linu keyrslunnar en SPURDI ThAD EKKI fyrr en EFTIR
   hlidin — og bædi skip-leidin og thunn-inntok-leidin kalla `recordLedger`,
   sem er LES-BREYTA-SKRIFA a `data/status.json`.

   AFLEIDINGIN VAR EKKI FRAEDILEG. Utan gluggans (eina astandid sem er
   MOGULEGT fyrir 21. agust) fell keyrslan i skip-greinina, SKRIFADI i
   `status.json` og for ut — an thess ad na nokkurn timann i `buildSnapshot`.
   `--dry` gerdi thvi nakvaemlega hvorugt thess sem thad er til fyrir:
     · thad skrifadi (thott thad heiti "dry")
     · og thad prentadi ENGA thekju, sem er eina astaedan til ad keyra thad
   Sa sem vildi aefa bokhaldid ADUR en glugginn opnast — sem er allur
   tilgangurinn med thurrkeyrslu a einskota maelitaeki — fekk ekkert.

   REGLAN NUNA, OG HUN ER TVISKIPT:
     1. `--dry` SKRIFAR EKKERT. Hvorki `data/predictions/` ne `status.json`.
        Vordur: `tests/prediction-ledger.mjs` kafli 6 keyrir skriftuna sem
        undirferli og ber SAMAN BAETI a `status.json` fyrir og eftir.
     2. `--dry` SEGIR HVAD ThAD HEFDI GERT: hlid-astaeduna (`gate.why`) OG
        thekju-blokkina sem hefdi verid skrifud. Thess vegna heldur thurr
        keyrsla AFRAM i gegnum lokad hlid — hun er ad SVARA spurningunni
        "hvad myndi rodin bera ef glugginn vaeri opinn nuna", og thad er
        einmitt su spurning sem er osvaranleg eftir a (CLAUDE.md 7).
        Rauntima-keyrslan (an `--dry`) haettir afram vid lokad hlid.
   ============================================================ */
/* ---------------- keyrsla ---------------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dry = process.argv.includes("--dry");
  if (dry) console.log("snapshot: DRY RUN - nothing will be written (no data/predictions/, no status.json)");
  const events = arr(tryJ("events.json"), "events") || [];
  const cur = events.find(e => e.is_next) || events.find(e => e.is_current);
  if (!cur) { console.log("snapshot: no next gameweek in events.json - nothing to do"); process.exit(0); }
  const gw = cur.id;
  const deadlineMs = Date.parse(cur.deadline_time);
  const file = `${OUT}gw${gw}.json`;
  const inWindow = windowOpen({ deadlineMs, nowMs: Date.now() });
  const gaps = ledgerGaps({ events, nowMs: Date.now(),
                            has: id => existsSync(`${OUT}gw${id}.json`) });
  if (gaps.length) console.log(`snapshot: LEDGER GAPS - no row for GW${gaps.join(", GW")}`);
  const gate = shouldWrite({ gw, deadlineMs, nowMs: Date.now(), exists: existsSync(file) });
  if (!gate.write) {
    console.log(`snapshot gw${gw}: ${dry ? "would skip" : "skipped"} - ${gate.why}`);
    if (!dry) {
      /* SKIP MA VERA GRAENT — NEMA GLUGGINN SE OPINN OG SKRAIN VANTI.      */
      recordLedger(gw, !inWindow || existsSync(file), existsSync(file) ? 1 : 0, gate.why, gaps);
      process.exit(0);
    }
    /* ThURR KEYRSLA HELDUR AFRAM I GEGNUM LOKAD HLID — sja hausinn: hun er
       ad synja hvad rodin BAERI, ekki ad herma eftir utgongunni.          */
  }

  const players = arr(tryJ("players.json"), "players");
  const teams = arr(tryJ("teams.json"), "teams");
  const fixtures = arr(tryJ("fixtures.json"), "fixtures");
  const bad = inputsUsable({ players, teams, fixtures, gw });
  if (bad) {
    console.log(`snapshot gw${gw}: NOT written - ${bad}`);
    /* GLUGGINN ER OPINN (vid komumst hingad) OG VID SKRIFUM EKKI -> RAUTT. */
    if (!dry) recordLedger(gw, false, 0, `WINDOW OPEN but nothing recorded - ${bad}`, gaps);
    process.exit(0);
  }

  try {
    const snap = buildSnapshot({
      gw, players, teams, fixtures,
      teamForm: tryJ("team_form.json"), odds: tryJ("odds.json"),
      elo: tryJ("elo.json"), playerForm: tryJ("player_form.json"),
      promoted: tryJ("promoted_baseline.json"), imminent: tryJ("imminent.json"),
      nowTs: Date.now(),
    });
    if (dry) {
      /* ThEKJAN ER ASTAEDAN FYRIR ThURRKEYRSLU — hun segir hvort rodin vaeri
         MARKTAEK ef glugginn opnadist nuna (`start_prob` 0 af 577 var
         nakvaemlega thad sem glugginn var settur inn til ad hindra).      */
      console.log(`snapshot gw${gw} (dry): gate ${gate.write ? "OPEN" : "CLOSED"} - ${gate.why}`);
      console.log(`snapshot gw${gw} (dry): would write ${snap.ffdr.length} ffdr rows, `
                + `${snap.rank.length} players · coverage ${JSON.stringify(snap.coverage)}`);
      console.log(`snapshot gw${gw} (dry): sources ${JSON.stringify(snap.sources)}`);
      console.log(`snapshot gw${gw} (dry): NOTHING WRITTEN (target would be ${file})`);
      process.exit(0);
    }
    mkdirSync(OUT, { recursive: true });
    writeFileSync(file, JSON.stringify(snap));
    console.log(`snapshot gw${gw}: written (${snap.ffdr.length} ffdr rows, ${snap.rank.length} players) - ${gate.why}`);
    recordLedger(gw, true, snap.rank.length,
      `gw${gw} recorded ${gate.why} · start_prob ${snap.coverage.start_prob}/${snap.coverage.players}`
      + ` · mins_trend ${snap.coverage.mins_trend}/${snap.coverage.players}`, gaps);
  } catch (e) {
    /* HRUN INNAN GLUGGANS ER ThAD SEM MA ALDREI ThEGJA. `continue-on-error`
       i workflow-inu er VILJANDI (bokhaldid ma ekki fella gagna-keyrsluna) —
       en thad thydir ad hrun her skilur eftir sig ENGA slod nema thessa.   */
    console.log(`snapshot gw${gw}: FAILED - ${e.message}`);
    /* OG HRUN I ThURRKEYRSLU MA HELDUR EKKI SKRIFA. Thetta var thridja
       leidin ad `status.json` fram hja `dry` — hun hefdi bara verid
       sjaldgaefari en hinar tvaer, sem gerir hana verri, ekki betri.     */
    if (!dry) recordLedger(gw, false, 0, `WINDOW OPEN but the snapshot threw: ${e.message}`, gaps);
    process.exit(0);
  }
}
