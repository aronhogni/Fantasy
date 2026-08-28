/* ============================================================
   ThRJU KLUKKU-ASTOND — ThAD SEM BREYTIST ThEGAR ENGINN BREYTIR NEINU

   Naestum hver vordur i thessu repo-i keyrir a `data/` thar sem 0 af 380
   leikjum eru loknir. Klukkan gerir thad falskt an thess ad ein lina af
   kodanum breytist, og ThRJU astond koma i rod:

     A  frestur lidinn, ENGIN urslit  (21.8. 17:31)
        `preSeason` -> false medan `seasonStarted` er ENN false. Thetta bil
        er raunverulegt og var aldrei profad: hvorugt safnid setti klukkuna.
     B  leikir i gangi (`started` en ekki `finished`), hluta-live-skra
     C  GW1 lokin — `imminent.archive` -> false, glugginn verdur lifandi

   AF HVERJU ThETTA SAFN OG EKKI VIDBOT VID HIN: profin sem eiga vid thessi
   astond eru ATTA talsins (model, stats, calibration, prediction-ledger,
   gw1-checklist, compare-visual, rotation, archive-gw-report) og HVERT
   theirra profar sinn hlut i EINU astandi — thvi sem `data/` er i. Astandid
   sjalft er thad sem er oprofad. Sama mynstur og `mins-trend.mjs` kafli 0,
   `defcon-shrink.mjs` og `bsd-pipeline.mjs`: kodi sem kviknar einn morgun
   er dreginn UT og keyrdur a TILBUNUM gognum adur en morgunninn kemur.

   ENGIN SKRA I `data/` ER SNERT. Tilbunu astondin eru byggd i tmp-dir
   (`mkdtempSync`) og `data/` er adeins LESID.

   ThRJAR REGLUR SEM ThETTA SAFN FYLGIR:
     1. Fullyrdingarnar eru a KODANUM sem appid keyrir, ekki a afriti af
        honum. Vorpun sem er endurskrifud her maelir annad likan en
        notandinn ser (CLAUDE.md 7.1, `buildTeamMetrics`). Reglur sem BUA
        i .jsx eru thvi DREGNAR UT UR UPPRUNANUM med regexi, eins og
        `compare-visual.mjs` gerir vid `pickFor`.
     2. Tolur sem eru fullyrtar her eru MAELDAR i dag og skradar a linunni,
        svo drift sjaist a somu linu og talan.
     3. Kaflar sem geta ekki keyrt fyrr en gogn eru til SEFA og segja thad —
        og svefninn er sjalfur fullyrding (`ok(...)`), ekki logga.

   Keyrsla:  node tests/clock-states.mjs
   ============================================================ */
import { readFileSync, existsSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync }
  from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { computeTransferCost } from "../src/model.js";
import { startFeatures, startProbability, stampStartWindow, inImminentPool,
         IMMINENT_MIN_MINUTES } from "../src/stats.js";
import { rotationRisk, banRisk, seasonHasStarted, startedGameweeks } from "../src/availability.js";
import { findRotationPartners, MIN_START_PROB } from "../src/rotation.js";
import { resultsFromFixtures, ffdrVsCleanSheets } from "../src/calibration.js";
import { shouldWrite, windowOpen, ledgerGaps, WINDOW_H } from "../scripts/snapshot-predictions.mjs";

const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const SRC = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");

let pass = 0, fail = 0;
const ok = (c, n, extra = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                    : (fail++, console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`)); };
const eq = (a, b, n) => ok(a === b, `${n} (${JSON.stringify(a)})`, `vaenti ${JSON.stringify(b)}`);

console.log(`\n${"=".repeat(84)}`);
console.log("KLUKKU-ASTOND — A: frestur lidinn · B: leikir i gangi · C: GW1 lokin");
console.log("=".repeat(84));

const events = J("events.json").events;
const gw1 = events.find(e => e.id === 1);
const DEADLINE = Date.parse(gw1.deadline_time);
console.log(`  GW1-frestur: ${gw1.deadline_time} (${DEADLINE})`);

/* ============================================================
   ASTONDIN ERU BYGGD, EKKI FENGIN AD LANI UR `data/` (21.8.2026)

   Thetta safn snyr KLUKKUNNI en las FANANA i `events.json` — og medan
   forleikur stod voru their tilviljunarlega their somu sem astand
   "fyrir frest" hefur: GW1 var `is_next`, engin umferd `is_current`,
   engin `finished`. Fullyrdingar um FYRIR-frest astandid gengu thvi upp
   AF ThVI AD DAGURINN VAR SA, ekki af thvi ad inntakid var byggt.

   Um 17:30 21.8.2026 flutti FPL fanana: GW1 -> `is_current`, GW2 ->
   `is_next`. Fullyrdingin "fyrir frest velur hun GW1" fekk tha GW2 og
   féll — og hun var RETT allan timann; thad var inntakid sem hafdi
   skipt astandi undir henni. Reglan sjalf (`is_next` fyrst, svo
   `is_current`) er ohreyfd og hun er thad sem profid a ad maela.

   `PRE` og `POST` eru thvi BYGGD ur sama grunni og fanarnir SETTIR
   BERUM ORDUM, eins og `tests/lib/played-events.mjs` gerir fyrir
   timabil sem er byrjad. Baedi eru fullyrt hér ad nedan svo astandid
   sjalft geti ekki dregid thegjandi.
   ============================================================ */
const PRE = events.map(e => ({ ...e, finished: false, data_checked: false,
  is_previous: false, is_current: false, is_next: e.id === 1 }));
const POST = events.map(e => ({ ...e, finished: false, data_checked: false,
  is_previous: false, is_current: e.id === 1, is_next: e.id === 2 }));
ok(PRE.filter(e => e.is_next).length === 1 && PRE[0].is_next === true
   && PRE.every(e => !e.is_current) && PRE.every(e => !e.finished),
  "PRE er byggt: GW1 er `is_next`, engin `is_current`, engin `finished`");
ok(POST.filter(e => e.is_current).length === 1 && POST[0].is_current === true
   && POST[1].is_next === true && POST.every(e => !e.finished),
  "POST er byggt: GW1 er `is_current`, GW2 `is_next`, engin `finished`");

/* ============================================================
   A. FRESTUR LIDINN, ENGIN URSLIT
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("A) FRESTUR LIDINN, ENGIN URSLIT — `preSeason` false medan `seasonStarted` er false");
console.log("─".repeat(84));

/* A1. REGLAN ER DREGIN UT UR App.jsx, EKKI ENDURSKRIFUD HER.
   Vaeri hun endurskrifud gaeti afritid haldid afram ad vera rett eftir ad
   App.jsx breyttist — nakvaemlega `wOf`/`marker`-atvikid (CLAUDE.md 8). */
{
  const app = SRC("src/App.jsx");
  const mPre = app.match(/const preSeason = gw1Deadline \? ([^\n;]+) : false;/);
  ok(!!mPre, "`preSeason`-reglan finnst i App.jsx");
  /* PROFSTEINNINN ER BYGGINGARLEGUR — SAMA REGLA OG `buildTeamMetrics`
     (CLAUDE.md 7, `prediction-ledger.mjs`): App.jsx VERDUR ad FLYTJA INN
     klukkuna og ma EKKI skrifa hana sjalft. Fram til 24.8.2026 gerdi hun
     thad (`events.some(e => e.finished)`) og svaradi ODRU en PlayerList a
     lifandi gognum — bædi afritin litu rett ut, hvort a sinum stad.     */
  ok(/seasonHasStarted[,\s}][^\n]*from "\.\/availability\.js"|from "\.\/availability\.js"[\s\S]{0,200}?seasonHasStarted/.test(app)
     || /seasonHasStarted/.test(app.split("\n").slice(0, 60).join("\n")),
    "App.jsx FLYTUR INN `seasonHasStarted` (skrifar hana ekki sjalf)");
  ok(!/const seasonStarted = !!events\?\.some/.test(app),
    "App.jsx ber EKKI lengur sitt eigid `events.some(e => e.finished)`");
  {
    const pl = SRC("src/PlayerList.jsx");
    ok(/startedGameweeks/.test(pl) && !/e\.finished \|\| e\.is_current/.test(pl),
      "PlayerList.jsx flytur lika inn klukkuna (ekkert annad afrit)");
  }
  const mStarted = app.match(/const seasonStarted = ([^\n;]+);/);
  ok(!!mStarted, "`seasonStarted`-reglan finnst i App.jsx");
  /* Baðar reglur eru keyrdar a ThEIM inntokum sem astandid gefur. `new Date()`
     i upprunanum er skipt ut fyrir fasta klukku — thad er EINA breytingin, og
     hun er gefin sem ARGUMENT (`Date`) svo textinn ur App.jsx se ohreyfdur. */
  const RealDate = Date;
  /* Fasta klukkan verdur ad bera BADI `new Date()` OG `Date.now()` — nyja
     `deadlinePassed` notar hid sidara, og fyrri utgafan gaf adeins hid fyrra
     svo hun kastadi `Date.now is not a function`. Aftur: hrun, ekki fall. */
  const clockAt = (now) => {
    const F = function (...a) { return a.length ? new RealDate(...a) : new RealDate(now); };
    F.now = () => now;
    F.parse = RealDate.parse; F.UTC = RealDate.UTC;
    F.prototype = RealDate.prototype;
    return F;
  };
  /* `preSeason` ER SKILGREIND UT FRA `deadlinePassed` (App.jsx 20.8.2026:
     "EIN KLUKKA, EKKI FJORAR"). Reglan sem vid keyrum verdur thvi ad bera
     BADAR — og BADAR eru DREGNAR UT, hvorug endurskrifud. Adur var adeins
     `preSeason` dregin ut og fallid vantadi; keyrslan KASTADI
     `ReferenceError` i stad thess ad falla, og allar 120+ fullyrdingar sem
     komu a eftir i thessari skra ThOGDU. Hrun er ekki fall (CLAUDE.md 5b). */
  const mDp = app.match(/const deadlinePassed = useCallback\((g => \{[\s\S]*?\n  \}), \[events\]\);/);
  ok(!!mDp, "`deadlinePassed`-fallid finnst i App.jsx (`preSeason` er skilgreind ut fra thvi)");
  const preSeasonAt = (nowMs, deadline, evs = events) =>
    Function("gw1Deadline", "events", "Date",
      `const deadlinePassed = ${mDp[1]};\nreturn gw1Deadline ? ${mPre[1]} : false;`)(
      deadline, evs, clockAt(nowMs));
  ok(preSeasonAt(DEADLINE - 60000, gw1.deadline_time) === true,
    "minutu FYRIR frest: preSeason = true");
  ok(preSeasonAt(DEADLINE + 60000, gw1.deadline_time) === false,
    "minutu EFTIR frest: preSeason = false  <- astand A");
  ok(preSeasonAt(DEADLINE, gw1.deadline_time) === false,
    "NAKVAEMLEGA a frestinum: preSeason = false (`<` er strangt, FPL lokar a sekundunni)");
  /* `seasonStarted` ER NU HAD KLUKKUNNI OG ThAD ER LAGFAERINGIN SJALF
     (24.8.2026). Adur las hun `finished` eingongu og var thvi `false` allt
     astand A — medan FPL hafdi ThEGAR nullstillt arstidar-summurnar vid
     frestinn. Reglan er ekki endurskrifud her: fallid er FLUTT INN og
     klukkan gefin sem ARGUMENT, svo profid keyrir sama kodann og appid. */
  const startedFrom = (evs, now) => seasonHasStarted(evs, now);
  /* BYGGT ASTAND, EKKI DAGURINN: `PRE`/`POST` bera `finished: false` berum
     ordum OG klukkan er fost, svo thetta maelir regluna og ekki hvort GW1
     se buin i dag. An fastrar klukku vaeri `PRE` "byrjad" af thvi einu ad
     21.8. er lidinn i raunheimi.                                        */
  ok(startedFrom(PRE, DEADLINE - 60000) === false,
    "seasonStarted = false FYRIR frest (engin `is_current`, enginn frestur lidinn)");
  ok(startedFrom(POST, DEADLINE + 60000) === true,
    "og TRUE i astandi A — frestur lidinn, engin umferd lokin, tolurnar nullstilltar");
  ok(startedFrom(PRE, DEADLINE + 60000) === true,
    "frestur-sem-er-lidinn einn og ser dugar (bakvorn ef `events.json` frys)");
  ok(startedFrom(POST.map((e, i) => i === 0 ? { ...e, finished: true } : e),
                 DEADLINE - 60000) === true,
    "og `finished` einn og ser dugar lika (einratt sidar a timabilinu)");
  ok(startedGameweeks(PRE, DEADLINE - 60000) === 0,
    "`startedGameweeks` telur 0 fyrir frest");
  ok(startedGameweeks(POST, DEADLINE + 60000) === 1,
    "og nakvaemlega 1 thegar GW1 er byrjud (ekki 38)");
}

/* A2. GW1 ER UPPHAFSLIDID — MA EKKI KOSTA STIG ThEGAR KLUKKAN FER FRAM.
   MAELT 20.8.2026 a obreyttri aaetlun: gamla reglan (`g===1 && preSeason`)
   gaf points 0 fyrir frest og -16 EFTIR frest. Fullyrdingarnar hér eru a
   BADUM klukku-stodum, thvi thad var einmitt munurinn a theim sem var villan. */
{
  const noChip = () => null;
  const plan = [1, 2, 3, 4, 5].map(() => ({ gw: 1 }));
  for (const pre of [true, false]) {
    const tc = computeTransferCost({ plan, chipAt: noChip, maxGw: 5, preSeason: pre });
    eq(tc[1].hits, 0, `preSeason=${pre}: fimm GW1-val kosta ENGAN hit`);
    eq(tc[1].points, 0, `preSeason=${pre}: og engin stig`);
    eq(tc[1].unlimited, true, `preSeason=${pre}: GW1 er otakmorkud`);
    eq(tc[2].ftAvailable, 1, `preSeason=${pre}: GW2 byrjar med 1 fritt`);
  }
  eq(computeTransferCost({ plan, chipAt: noChip, maxGw: 3, preSeason: true })[1].unlimitedBy,
     "preseason", "FYRIR frest er orsokin 'preseason' (hann getur enn breytt)");
  eq(computeTransferCost({ plan, chipAt: noChip, maxGw: 3, preSeason: false })[1].unlimitedBy,
     "initial", "EFTIR frest er orsokin 'initial' — upphafslidid, EKKI otakmorkud skipti");
  /* Og textinn a skjanum ma ekki lofa skiptum sem eru ekki til. Hann er
     DREGINN UT UR App.jsx af somu astaedu og reglan hér ad ofan. */
  /* ATHUGASEMDIR STRIPPADAR — CLAUDE.md kafli 13 nefnir nakvaemlega thetta:
     „textaleit sem athugasemd uppfyllti". Rod-fullyrdingin hér ad nedan er
     `indexOf(...) < indexOf(...)` og hun FELL 20.8.2026 a PROSA i
     athugasemd vid `resetAll`, sem nefnir `unlimitedBy === "initial"` LANGT
     a undan chip-greininni. Kodinn var alveg rettur. Leitin les nu KODA.  */
  const app = SRC("src/App.jsx")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(/unlimitedBy === "initial" \? "starting squad — not transfers"/.test(app),
    "og skjarinn segir 'starting squad — not transfers', ekki 'unlimited transfers'");
  ok(/unlimitedBy === "chip" \?/.test(app) && app.indexOf('unlimitedBy === "chip"')
       < app.indexOf('unlimitedBy === "initial"'),
    "chip-greinin er profud FYRST svo hun geti ekki eignad GW1 chip-verkun");
  /* Bench Boost i GW1 EFTIR frest ma ekki verda orsokin. */
  const bb = g => (g === 1 ? "benchboost" : null);
  eq(computeTransferCost({ plan, chipAt: bb, maxGw: 3, preSeason: false })[1].unlimitedBy,
     "initial", "Bench Boost i GW1 stelur EKKI orsokinni eftir frest");
}

/* A3. ENDURKVORDUNIN ER A I ASTANDI A OG SLOKKNAR I ASTANDI C.
   Skilyrdid er `imminent.archive`, EKKI klukkan — og thad er ThAD sem
   thessi kafli sannar: sama rod, sami dagur, tvaer utkomur eftir flaggi. */
{
  const im = J("imminent.json");
  const rows = im.players.filter(r => r.start_feats);
  ok(im.archive === true, `i dag er imminent ARCHIVE (${im.season} GW${(im.gws || []).join(",")})`);
  ok(rows.length > 800, `og ${rows.length} af ${im.players.length} rodum bera start_feats`);

  const f = rows[0].start_feats;
  ok(stampStartWindow({ archive: true }, f).from_archive_window === true,
    "archive:true -> stimplad (endurkvordun A)");
  ok(stampStartWindow({ archive: false }, f) === f,
    "archive:false -> SAMA hlutartilvist til baka (engin endurkvordun, astand C)");
  ok(stampStartWindow({ archive: true }, f) !== f,
    "og stimplun er AFRIT, ekki breyting a stæd (adrir lesendur sja obreytt)");

  /* Klukkan ma ekki komast ad thessu. Astand A er einmitt tilfellid thar
     sem frestur er lidinn EN glugginn er enn arkiv — og tha A hun ad vera a. */
  ok(stampStartWindow({ archive: true, updated: "2026-08-21T17:31:00Z" }, f)
       .from_archive_window === true,
    "flaggid les ENGA dagsetningu — astand A heldur endurkvordun (thad er retta svarid)");

  let preSafe = 0, rawSafe = 0, band = 0, n = 0;
  for (const r of rows) {
    const p1 = startProbability(stampStartWindow({ archive: true }, r.start_feats));
    const p0 = startProbability(r.start_feats);
    if (p1 == null || p0 == null) continue;
    n++;
    if (p1 >= 0.75) preSafe++;
    if (p0 >= 0.75) rawSafe++;
    const b = v => v >= 0.75 ? 2 : v >= 0.45 ? 1 : 0;
    if (b(p1) !== b(p0)) band++;
  }
  /* MAELT 20.8.2026 a data/imminent.json (840 radir med start_feats):
     endurkvordad 3 yfir 0,75 · hratt 127 · 148 radir skipta bandi (17,6%),
     ALLAR i strangari att. Tolurnar eru fullyrdingar svo drift sjaist. */
  eq(n, 840, "radir med tolu a badum kvordum");
  eq(preSafe, 3, "ENDURKVORDAD: radir >= 0,75 (astand A)");
  eq(rawSafe, 127, "HRATT: sama gluggi, sama dagur (thad sem astand C vaeri MED >=2 umferdum)");
  eq(band, 148, "radir sem skipta bandi thegar flaggid slokknar");
  ok(preSafe < rawSafe, "endurkvordunin er STRANGARI — hun dregur haa tolu nidur");
}

/* A4. SPA-BOKHALDID — GLUGGINN LOKAST VID FRESTINN OG SKRA ER ONEMANDI. */
{
  /* GLUGGINN VAR BREIKKADUR UR 12 I 36 KLST (28.8.2026) — sja hausinn a
     `shouldWrite`. Astaedan er maeld: GW2-rodin tapadist thegar ENGIN
     keyrsla for i gang i 12,5 klst thvert yfir 12-klst gluggann. Talan er
     LESIN her, ekki skrifud, svo naesta breidd felli ekki kaflann af
     rangri astaedu — en hun verdur ad vera breidari en mesta maelda bilid. */
  ok(WINDOW_H > 12.1, `fraeglugginn er breidari en mesta maelda keyrslubil (${WINDOW_H}h > 12,1h)`);
  const g = (nowMs, exists = false) =>
    shouldWrite({ gw: 1, deadlineMs: DEADLINE, nowMs, exists });
  ok(g(DEADLINE - (WINDOW_H + 4) * 36e5).write === false,
     `${WINDOW_H + 4} klst fyrir frest: EKKERT skrifad (utan gluggans)`);
  ok(g(DEADLINE - 6 * 36e5).write === true, "6 klst fyrir frest: skrifad (innan gluggans)");
  ok(g(DEADLINE - 1).write === true, "1 ms fyrir frest: enn skrifad");
  const after = g(DEADLINE + 1);
  ok(after.write === false, "1 ms EFTIR frest: EKKI skrifad  <- astand A");
  ok(/deadline has passed/.test(after.why), "og skyringin nefnir frestinn", after.why);
  ok(g(DEADLINE + 7 * 864e5).write === false, "viku eftir frest: enn ekki skrifad");
  const exists = g(DEADLINE - 6 * 36e5, true);
  ok(exists.write === false, "skra sem ER til er ALDREI endurskrifud — ekki heldur innan gluggans");
  ok(/never rewritten/.test(exists.why), "og skyringin segir thad", exists.why);
  ok(g(DEADLINE + 1, true).write === false, "og hvorki eftir frest");
  ok(windowOpen({ deadlineMs: DEADLINE, nowMs: DEADLINE + 1 }) === false,
    "windowOpen er false eftir frest (svo 'skip' se GRAENT, ekki raudt)");
  ok(windowOpen({ deadlineMs: DEADLINE, nowMs: DEADLINE - 60000 }) === true,
    "og true minutu fyrir frest");

  /* GATID SEM FYLLIST I ASTANDI A: GW1-frestur lidinn OG engin skra. */
  const gaps = ledgerGaps({ events: POST, nowMs: DEADLINE + 60000, has: () => false });
  ok(gaps.length === 1 && gaps[0] === 1, `GW1 er skrad sem GAT thegar frestur er lidinn og engin skra (${gaps})`);
  ok(ledgerGaps({ events: POST, nowMs: DEADLINE + 60000, has: id => id === 1 }).length === 0,
    "og ekkert gat thegar skrain er til");
  ok(ledgerGaps({ events: PRE, nowMs: DEADLINE - 60000, has: () => false }).length === 0,
    "fyrir frest er FJARVERA skrar ekki gat (spain er ekki gjaldfallin)");

  /* OG SKRIFTAN MA ALDREI MIDA A GW1 EFTIR FRESTINN. Valreglan er dregin
     ut ur upprunanum: `is_next` er valid FYRST, svo eftir frest er markid
     GW2 og GW1-rodin er utan skotfaeris ur BADUM attum.
     BADAR ATTIR ERU LESNAR UR BYGGDU ASTANDI (`PRE`/`POST`) — sja
     athugasemdina vid thau ad ofan; her stod `events` og fullyrdingin um
     FYRIR-frest féll 21.8.2026 thegar FPL flutti fanana, an thess ad
     reglan sem verid er ad maela hefdi breyst. */
  const snapSrc = SRC("scripts/snapshot-predictions.mjs");
  const mCur = snapSrc.match(/const cur = (events\.find\([^\n;]+);/);
  ok(!!mCur, "valreglan a umferd finnst i snapshot-predictions.mjs");
  const pickFrom = evs => Function("events", `return ${mCur[1]};`)(evs);
  eq(pickFrom(POST).id, 2, "eftir frest velur skriftan GW2 (is_next), aldrei GW1");
  eq(pickFrom(PRE).id, 1, "fyrir frest velur hun GW1");
  /* OG ROD SKIPTIR MALI: `is_next` er valid FYRST. Vaeri leitinni snuid
     vid (`is_current` fyrst) gaefi POST GW1 — nakvaemlega rodin sem
     bokhaldid ma ALDREI endurskrifa. Fullyrt hér svo rodin se maeld og
     ekki bara treyst.                                                  */
  ok(/is_next/.test(mCur[1]) && mCur[1].indexOf("is_next") < mCur[1].indexOf("is_current"),
    "`is_next` er lesid A UNDAN `is_current` i valreglunni", mCur[1]);
}

/* ============================================================
   B. LEIKIR I GANGI
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("B) LEIKIR I GANGI — hlutastada ma aldrei telja sem urslit");
console.log("─".repeat(84));

/* B1. HLUTASTADA ER EKKI URSLIT. Byggt eins og GW1-laugardagur verdur:
   fjorir leikir bunir, sex i gangi med skori a skjanum. */
{
  const fx = [];
  for (let i = 1; i <= 4; i++)
    fx.push({ id: i, event: 1, finished: true, started: true, minutes: 90,
              team_h: i, team_a: i + 10, team_h_score: 1, team_a_score: 0 });
  for (let i = 5; i <= 10; i++)
    fx.push({ id: i, event: 1, finished: false, started: true, minutes: 63,
              team_h: i, team_a: i + 10, team_h_score: 2, team_a_score: 1 });
  const r = resultsFromFixtures(fx);
  eq(r.length, 8, "fjorir loknir leikir -> 8 lid-leikir; sex I GANGI telja EKKERT");
  ok(!r.some(x => x.fixture >= 5), "og engin rod ur leik i gangi slaeddist inn");
  /* Og FFDR-kvordunin ma thvi ekki nota hana. */
  const snap = { gw: 1, ffdr: fx.map(f => ({ fixture: f.id, team: f.team_h, opp: f.team_a,
                                             home: true, def: 2, def_tier: 2 })) };
  eq(ffdrVsCleanSheets({ snapshots: [snap], results: r }).matched, 4,
     "kvordunin parar adeins loknu leikina");
}

/* B2. HLUTA-LIVE-SKRA ER ThOGUL BILUN — OG INVARIANTID SEM TEKUR HANA.
   `fetch.mjs` skrifar `live/gw{cur}.json` fyrir umferd I GANGI (`is_current`)
   og lykkjan sem sækir LOKNAR umferdir sleppir skra sem ER ThEGAR TIL
   (`if (existsSync) continue`). Faerist `is_current` afram adur en skran er
   endursott stendur hluta-skra ad EILIFU — og hvert per-umferdar tala i
   appinu (last_gw, player_form, defcon, imminent, form_features) er reiknud
   ur henni an ad neitt segi thad.
   MAELT INVARIANT: full PL-umferd er 10 leikir x 2 lid x 11 menn = 220
   byrjanir og 220 x 90 = 19.800 minutur a velli. */
/* ============================================================
   LAGFAERINGIN (21.8.2026): `fetchLiveRounds` I `scripts/fetch.mjs` LOKAR
   SKRA ADEINS ThEGAR HUN ER FULL — OG LYKKJAN SJALF ER KEYRD HER.

   B2 var adur TVAER samlagningar a tilbunum gognum og svo svefn a raungognum:
   hun sannadi ad 220/19.800 vaeri rett tala en fullyrti ENGU um hlidid sem
   les hana — thad var ekki til. Nu er lykkjan DREGIN UT UR UPPRUNANUM (sama
   mynstur og `computeDefcon` i `defcon-shrink.mjs`, CLAUDE.md 7.1: afrit af
   reglunni maelir annad en pipeline gerir) og keyrd a hermdu skraarkerfi og
   hermdum FPL-svorum, thar sem svarid er ThEKKT FYRIRFRAM.

   FJOGUR ASTOND, OG ThAU ERU OLL RAUNVERULEG i thessari viku:
     1. full skra a diski        -> LOKAD, ENGIN kall  (loknar umferdir breytast ekki)
     2. hluta-skra a diski       -> ENDURSOTT og skrifud (villan sem var: hun stod ad eilifu)
     3. tom/thynnri sokn         -> EKKI skrifud (fetch-bsd-teams fordæmid, 8e)
     4. RETTMAETT stutt umferd   -> LOKAD, og thad HELDUR i annarri keyrslu
                                    (frestadur leikur ma ekki gefa eilifa endursokn)
   ============================================================ */
const FULL_STARTS = 220, FULL_MINUTES = 19800;
{
  /* ---- Lykkjan sjalf, ur upprunanum ---- */
  const fx = SRC("scripts/fetch.mjs");
  const i0 = fx.indexOf("const LIVE_MATCH_STARTS");
  const s0 = fx.indexOf("async function fetchLiveRounds(");
  const i1 = fx.indexOf("\n}\n", s0);
  ok(i0 > 0 && s0 > i0 && i1 > s0, "`liveRoundStatus` + `fetchLiveRounds` finnast i scripts/fetch.mjs");
  const decl = fx.slice(i0, i1 + 2);
  /* OG BLINDA SLEPPINGIN MA EKKI VERA KOMIN AFTUR. Neikvaeda fullyrdingin
     nefnir streng sem VAR sannanlega thar (CLAUDE.md 5b regla 2): thetta var
     lina 970 i fetch.mjs fram til 21.8.2026.                              */
  const code = fx.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok(!/if \(existsSync\(`\$\{DATA\}\/\$\{path\}`\)\) continue;/.test(code),
    "blinda `if (existsSync) continue` er FARIN ur live-lykkjunni");
  ok(/liveRoundStatus\(\{ live:/.test(code) && /have\?\.complete === true/.test(code),
    "og thekjan er ThAD sem lokar skra (`complete === true`), ekki tilvist hennar");

  /* ---- Hermt skraarkerfi + hermt FPL ---- */
  const mk = (nMatches, opts = {}) => ({ elements: Array.from({ length: 22 * nMatches },
    (_, i) => ({ id: i + 1, stats: { minutes: opts.minutes ?? 90, starts: 1 } })) });
  const build = ({ disk = {}, served = {}, events: evs, fixtures: fxs }) => {
    const files = new Map(Object.entries(disk).map(([k, v]) => [k, JSON.stringify(v)]));
    const calls = [];
    const factory = new Function("existsSync", "readFile", "DATA", "writeJSON", "getJSON",
      "FPL", "console", `${decl}\nreturn { liveRoundStatus, fetchLiveRounds };`);
    const api = factory(
      p => files.has(p),
      async p => files.get(p),
      "data",
      async (p, o) => { files.set(`data/${p}`, JSON.stringify(o)); },
      async url => { const gw = +url.match(/event\/(\d+)\/live/)[1]; calls.push(gw);
                     if (!(gw in served)) throw new Error("503 simulated");
                     return served[gw]; },
      "F", { warn: () => {}, log: () => {} });
    return { api, files, calls, run: () => api.fetchLiveRounds({ events: evs, fixtures: fxs }) };
  };
  const round = (gw, n, finished = true) => Array.from({ length: n }, (_, i) =>
    ({ id: gw * 100 + i, event: gw, finished }));
  const ev = (id, o = {}) => ({ id, finished: true, ...o });
  const totals = live => build({ events: [], fixtures: [] }).api
    .liveRoundStatus({ live, matches: 10 });

  /* ---- (a) INVARIANTID SJALFT, MED MAELDUM TOLUM ---- */
  const full = totals(mk(10)), half = totals(mk(4));
  eq(full.starts, FULL_STARTS, "full umferd: byrjanir");
  eq(full.minutes, FULL_MINUTES, "full umferd: minutur a velli");
  eq(full.complete, true, "og hun er FULL (10 leikir loknir)");
  eq(half.starts, 88, "hluta-skra (4 af 10): byrjanir");
  eq(half.minutes, 7920, "hluta-skra: minutur");
  eq(half.complete, false, "og hun er OFULLKOMIN");
  ok(/88\/220 starts/.test(half.why || ""), `og skyringin ber tolurnar (${half.why})`);
  /* RAUD KORT: minutur faekka, byrjanir ekki. Thess vegna er minutu-krafan
     GOLF og byrjana-krafan HORD — og golfid ma ekki vera svo thett ad
     raunveruleg umferd falli. 20 utaf-visanir a 60. min = 1.200 minutur.  */
  const sentOff = mk(10);
  for (let i = 0; i < 20; i++) sentOff.elements[i].stats.minutes = 30;   // rautt a 30. min
  const reds = build({ events: [], fixtures: [] }).api
    .liveRoundStatus({ live: sentOff, matches: 10 });
  eq(reds.minutes, 18600, "20 raud kort a 60. min -> 18.600 minutur");
  eq(reds.complete, true, "og umferdin er samt FULL (minutu-krafan er GOLF, ekki hord)");
  /* RETTMAETT STUTT UMFERD: nefnarinn er LOKNIR LEIKIR, ekki 10.          */
  const short = build({ events: [], fixtures: [] }).api
    .liveRoundStatus({ live: mk(9), matches: 9 });
  eq(short.starts, 198, "frestadur leikur -> 9 leikir gefa 198 byrjanir");
  eq(short.complete, true, "og umferdin er FULL — 220 hefdi gert hana eilift ofullkomna");
  eq(build({ events: [], fixtures: [] }).api
       .liveRoundStatus({ live: mk(9), matches: 10 }).complete, false,
     "en 9-leikja skra i 10-leikja umferd er ofullkomin (thad er villan sjalf)");
  eq(totals({ elements: [] }).complete, false, "TOM skra er ofullkomin");
  eq(build({ events: [], fixtures: [] }).api
       .liveRoundStatus({ live: mk(4), matches: 0 }).complete, null,
     "ENGINN lokinn leikur i umferdinni -> `complete` er NULL (ekki false)");

  /* ---- (b) LYKKJAN: FULL SKRA ER LOKUD, HLUTA-SKRA ER ENDURSOTT ---- */
  {
    const t = build({ disk: { "data/live/gw1.json": mk(10) }, served: { 1: mk(10) },
      events: [ev(1)], fixtures: round(1, 10) });
    const r = await t.run();
    eq(t.calls.length, 0, "full skra a diski -> ENGIN HTTP-koll (lokud)");
    eq(r.sealed, 1, "og hun er tolð 'sealed' i status-notunni");
    eq(r.written, 0, "og ekkert skrifad");
    ok(r.ok === true && /1 sealed complete/.test(r.note), `notan segir thad (${r.note})`);
  }
  {
    const t = build({ disk: { "data/live/gw1.json": mk(4) }, served: { 1: mk(10) },
      events: [ev(1)], fixtures: round(1, 10) });
    const r = await t.run();
    eq(t.calls.join(","), "1", "HLUTA-skra -> umferdin er ENDURSOTT (villan: hun var lokud)");
    eq(r.written, 1, "og hin fulla skra er skrifud");
    eq(JSON.parse(t.files.get("data/live/gw1.json")).elements.length, 220,
       "og skran a diski ber nu 220 radir");
    eq(r.partial.length, 0, "og hun er ekki longur skrad sem PARTIAL");
  }

  /* ---- (c) TOM EDA ThYNNRI SOKN MA ALDREI SKRIFA OFAN A GOD GOGN ---- */
  {
    for (const [label, payload] of [["TOM", { elements: [] }], ["ThYNNRI", mk(2)]]) {
      const t = build({ disk: { "data/live/gw1.json": mk(4) }, served: { 1: payload },
        events: [ev(1)], fixtures: round(1, 10) });
      const r = await t.run();
      eq(t.calls.length, 1, `${label} sokn: kallid var gert`);
      eq(r.written, 0, `${label} sokn: EKKERT skrifad`);
      eq(JSON.parse(t.files.get("data/live/gw1.json")).elements.length, 88,
         `${label} sokn: gamla (betri) skran stendur obreytt`);
      ok(r.refused.length === 1 && r.ok === false,
        `${label} sokn: hofnunin er SKRAD og heimildin verdur RAUD (${r.note})`);
    }
    /* En engin skra a diski -> hvad sem er (nema tomt) er betra en ekkert. */
    const t = build({ served: { 1: mk(4) }, events: [ev(1)], fixtures: round(1, 10) });
    const r = await t.run();
    eq(r.written, 1, "engin skra a diski -> hluta-skra ER skrifud (betri en ekkert)");
    ok(r.partial.length === 1 && /PARTIAL/.test(r.note) && r.ok === false,
      `en hun er MERKT sem hluta-skra og heimildin er raud (${r.note})`);
    const t2 = build({ served: { 1: { elements: [] } }, events: [ev(1)], fixtures: round(1, 10) });
    eq((await t2.run()).written, 0, "TOM sokn skrifar samt ekkert (hun vaeri sjalf hluta-skran)");
  }

  /* ---- (d) RETTMAETT STUTT UMFERD MA EKKI ENDURSAEKJAST AD EILIFU ---- */
  {
    const fxs = [...round(1, 9), { id: 199, event: null, finished: false }];   // frestadur
    const t = build({ disk: { "data/live/gw1.json": mk(9) }, served: { 1: mk(9) },
      events: [ev(1)], fixtures: fxs });
    const r1 = await t.run(), r2 = await t.run();
    eq(t.calls.length, 0, "9 af 9 loknum leikjum -> LOKAD, engin koll");
    ok(r1.sealed === 1 && r2.sealed === 1, "og thad HELDUR i annarri keyrslu (ekki eilif endursokn)");
    ok(r1.ok === true, "og heimildin er graen — stutt umferd er ekki bilun");
    /* En faerist frestadi leikurinn INN i umferdina og er spiladur, opnast
       hun aftur — thad er retta hegdunin og hun er sjalf-laeknandi.        */
    const t3 = build({ disk: { "data/live/gw1.json": mk(9) }, served: { 1: mk(10) },
      events: [ev(1)], fixtures: round(1, 10) });
    await t3.run();
    eq(t3.calls.length, 1, "og um leid og 10. leikurinn er spiladur i somu umferd er hun endursott");
  }

  /* ---- (e) UMFERD I GANGI: ALLTAF ENDURSOTT, EN ALDREI ThYNNRI ---- */
  {
    const t = build({ disk: { "data/live/gw1.json": mk(10) }, served: { 1: mk(10) },
      events: [ev(1, { is_current: true })], fixtures: round(1, 10) });
    await t.run();
    eq(t.calls.join(","), "1", "is_current er endursott ThOTT skrain se full (bonus leidrettist eftir a)");
    const t2 = build({ disk: { "data/live/gw2.json": mk(4) }, served: { 2: mk(2) },
      events: [{ id: 2, finished: false, is_current: true }], fixtures: round(2, 4) });
    const r = await t2.run();
    eq(JSON.parse(t2.files.get("data/live/gw2.json")).elements.length, 88,
       "og ThYNNRI svar mitt i umferd skrifar EKKI ofan a betri skra");
    ok(r.refused.length === 1, "hofnunin er skrad lika fyrir umferd i gangi");
    /* Mitt i umferd er "full" MIDAD VID ThA leiki sem eru bunir — thess
       vegna tharf greinin fyrir umferd i gangi enga sérreglu.             */
    const t3 = build({ served: { 2: mk(4) },
      events: [{ id: 2, finished: false, is_current: true }], fixtures: round(2, 4) });
    const r3 = await t3.run();
    ok(r3.written === 1 && r3.partial.length === 0 && r3.ok === true,
      "4 af 4 spiluðum leikjum mitt i umferd er FULL skra, ekki hluta-skra");
    /* HLUTA-SKRA MITT I UMFERD ER MERKT EN GERIR HEIMILDINA EKKI RAUDA:
       `fixtures.finished` getur flippad nokkrum minutum a undan
       live-endapunktinum, og `gw1-checklist` heimtar `fpl_live.ok` sem
       grunnstod — falskt raut ljos i hálftima er sjalf ekki upplysing.
       LOKIN umferd med somu skra ER hins vegar raud (kafli (c) ofar).   */
    const t4 = build({ served: { 2: mk(2) },
      events: [{ id: 2, finished: false, is_current: true }], fixtures: round(2, 4) });
    const r4 = await t4.run();
    ok(r4.partial.length === 1 && /round in progress/.test(r4.note),
      `hluta-skra mitt i umferd er MERKT (${r4.note})`);
    ok(r4.ok === true && r4.partialOver === 0,
      "en hun gerir heimildina EKKI rauda (umferdin er ekki bunin)");
    const t5 = build({ served: { 2: mk(2) },
      events: [ev(2, { is_current: true })], fixtures: round(2, 4) });
    const r5 = await t5.run();
    ok(r5.ok === false && r5.partialOver >= 1,
      `SAMA skra i LOKINNI umferd gerir hana RAUDA (${r5.partialOver} hluta-skrar, thad er villan sjalf)`);
  }

  /* ---- (f) OVERJANDI ASTAND: skra til, ENGINN lokinn leikur -> LATIN I FRIDI ---- */
  {
    const t = build({ disk: { "data/live/gw1.json": mk(4) }, served: { 1: mk(10) },
      events: [ev(1)], fixtures: [{ id: 1, event: 1, finished: false }] });
    const r = await t.run();
    eq(t.calls.length, 0, "ekkert ad maela vid -> skra sem er til er LATIN I FRIDI");
    eq(r.unverified, 1, "og astandid er TALIÐ, ekki thagad");
    ok(/unverifiable/.test(r.note), `og nefnt i notunni (${r.note})`);
  }

  /* ---- (g) MISHEPPNUD SOKN FELLIR EKKI KEYRSLUNA OG EYDIR ENGU ---- */
  {
    const t = build({ disk: { "data/live/gw1.json": mk(4) }, served: {},
      events: [ev(1)], fixtures: round(1, 10) });
    const r = await t.run();
    eq(JSON.parse(t.files.get("data/live/gw1.json")).elements.length, 88,
       "503 fra FPL -> gamla skran stendur");
    ok(r.failed.length === 1 && /failed:/.test(r.note), `og bilunin er skrad (${r.note})`);
  }

  /* ---- (h) RAUNGOGN — SEFUR ThANGAD TIL `data/live/` VERDUR TIL ---- */
  const liveDir = D + "live/";
  const files = existsSync(liveDir) ? readdirSync(liveDir).filter(f => /^gw\d+\.json$/.test(f)) : [];
  const finishedIds = new Set(events.filter(e => e.finished).map(e => e.id));
  const checkable = files.filter(f => finishedIds.has(+f.match(/\d+/)[0]));
  const fixtures = (() => { try { const j = JSON.parse(readFileSync(D + "fixtures.json", "utf8"));
    return Array.isArray(j) ? j : (j.fixtures || []); } catch { return []; } })();
  if (!checkable.length) {
    console.log(`     BID: data/live/ hefur ${files.length} skrar og ${finishedIds.size} loknar umferdir`
              + " — ekkert ad maela enn.");
    ok(true, "hluta-skra vordurinn sefur (engin lokin umferd med live-skra)");
  } else {
    const api = build({ events: [], fixtures: [] }).api;
    for (const f of checkable) {
      const gw = +f.match(/\d+/)[0];
      const matches = fixtures.filter(x => x.event === gw && x.finished).length;
      const st = api.liveRoundStatus({ live: JSON.parse(readFileSync(liveDir + f, "utf8")), matches });
      ok(st.complete !== false,
        `${f} er FULL umferd (${st.starts} byrjanir, ${st.minutes} min, ${matches} leikir)`,
        st.why || "");
    }
  }
}

/* B3. NEFNARINN SEM SKIPTIR UM MERKINGU: `rotationRisk` deilir med 38 medan
   engin umferd er lokin — og les `starts` UR players.json, sem FPL
   nullstillir vid timabilamot.

   ThESSI KAFLI VAR SKRIFADUR SEM SKJALFESTING A VILLU OG ER NU VORDUR UM
   LAGFAERINGUNA (uppfaert 20.8.2026, sama kvold).
   Upphaflega fullyrti hann `zeroed.level === "high"` og BAR ThAD SEM
   "SKJALFEST VILLA": nullstillt `starts` + engin lokin umferd gaf hverjum
   leikmanni raudan roterings-flagga. Notandinn sa thetta sjalfur a
   spjoldunum (`st0%` a Tzolis og Sangare) og `src/availability.js` var
   lagfaert samu nott. Fullyrdingin ATTI thvi ad snuast vid — og hun gerdi
   thad ekki sjalf, hun HRUNDI (`Cannot read properties of null`), thvi
   profgognin baru `starts` an `minutes`. Hrun er ekki fall: kaflarnir
   a eftir keyrdu ekki. Bædi er lagad hér.

   SKILYRDID ER NU TVISVID (`starts` OG `minutes`) og thad er MAELT
   naudsynlegt: 195 leikmenn hafa `starts=0, minutes=0` (engin saga -> engin
   tala) en 35 hafa `starts=0` med RAUNMINUTUM (Unal 214, Nwaneri 165 …),
   og fyrir thá er "byrjadi 0 af 38" raunveruleg maeling. Einssvids-lagfaering
   hefdi hreinsad bædi.                                                   */
{
  /* `minutes` VERDUR ad vera i profgognunum nuna — annars maelir kaflinn
     null-leidina i staðinn fyrir nefnarann sem hann heitir eftir.        */
  eq(rotationRisk({ starts: 30, minutes: 2700 }, 0).played, 38,
     "engin lokin umferd -> nefnarinn er 38");
  eq(rotationRisk({ starts: 30, minutes: 2700 }, 0).level, "safe",
     "30 af 38 = safe (fyrra timabil, obreytt)");
  eq(rotationRisk({ starts: 3, minutes: 270 }, 3).played, 3,
     "thrjar loknar -> nefnarinn er 3");
  eq(rotationRisk({ starts: null, minutes: 900 }, 0), null,
     "`starts` vantar -> ENGIN tala (rett)");

  /* LAGFAERINGIN, BADAR ATTIR — thad er punkturinn. */
  eq(rotationRisk({ starts: 0, minutes: 0 }, 0), null,
     "nullstillt `starts` OG engar minutur -> ENGIN tala (var 'high' fram til 20.8.2026)");
  const sub = rotationRisk({ starts: 0, minutes: 214 }, 0);
  ok(sub != null, "en 0 byrjanir MED raunminutum heldur sinni tolu (Unal-tilfellid)");
  eq(sub?.pct, 0, "og hun er 0% — sem er hér RAUNVERULEG maeling");
  eq(sub?.level, "high", "og 'high' er rett fyrir hann: hann var til leiks og byrjadi aldrei");

  /* VOKUR A RAUNGOGNUM: fellur ThANN DAG sem FPL nullstillir og engin
     umferd er lokin — thad er nakvaemlega dagurinn sem thetta borgar sig. */
  const players = J("players.json").players;
  const totalStarts = players.reduce((a, p) => a + (+p.starts || 0), 0);
  const anyFinished = events.some(e => e.finished);
  const zeroNoMins = players.filter(p => (+p.starts || 0) === 0 && (+p.minutes || 0) === 0);
  const flagged = zeroNoMins.filter(p => rotationRisk(p, 0) != null);
  ok(zeroNoMins.length > 50,
    `forsenda: ${zeroNoMins.length} leikmenn an sogu i players.json (annars maelir naesta lina ekkert)`);
  ok(flagged.length === 0,
    `og EKKI EINN theirra faer roterings-tolu (${flagged.length} af ${zeroNoMins.length})`);
  const withMins = players.filter(p => (+p.starts || 0) === 0 && (+p.minutes || 0) > 0);
  const kept = withMins.filter(p => rotationRisk(p, 0) != null);
  ok(withMins.length > 0 && kept.length === withMins.length,
    `og allir ${withMins.length} med 0 byrjanir en raunminutur HALDA sinni (${kept.length})`);
  if (totalStarts > 0 || anyFinished) {
    console.log(`     BID: players.json ber ${totalStarts} byrjanir og ${events.filter(e => e.finished).length}`
              + " loknar umferdir — nullstillingin er ekki komin.");
  }
}

/* B3b. MERKIMIDINN A UPPSAFNADAR TOLUR. `cumLabel` er `seasonStarted ?
   "GW1-N" : prevSeasonLabel`, og `seasonStarted` les LOKNAR umferdir. FPL
   nullstillir hins vegar timabils-summurnar i bootstrap thegar timabilid
   BYRJAR — sem er i astandi A eda B, ADUR en nokkur umferd er lokin. A
   thvi bili stendur "2025/26" ofan a tolum sem eru 2026/27.
   Vokull vordur: fellur ThANN DAG sem summurnar nullstillast. */
/* > VORDURINN GAT EKKI FALLID OG VAR LAGADUR 24.8.2026. Hann spurdi
   > `totalMin > 0` og LAS ThAD SEM "summurnar eru enn fyrra timabils" —
   > en um leid og EIN minuta er spilud a nyju timabili er `totalMin > 0`
   > lika satt, svo hann svaf ad eilifu. Maelt thann dag: `totalMin` 17.700
   > og summurnar voru ThESSA timabils, svo vordurinn sagdi "fyrra
   > timabil" um 2026/27-tolur. Hann gat adeins vaknad i glugganum milli
   > nullstillingar og fyrstu minutu (~1,5 klst), sem er nakvaemlega
   > "fullyrding sem tharf tvennt til ad bregdast" (CLAUDE.md 5b).
   > RETTI MAELIKVARDINN ER `starts`, og CLAUDE.md nefnir hann berum ordum:
   > "Eina svidid sem greinir astondin i sundur er `starts`" — 38 er heilt
   > timabil, 1 er ein umferd. Vidmidid er ThVI leitt: max `starts` ma
   > aldrei vera haerra en fjoldi BYRJADRA umferda.                      */
{
  const players = J("players.json").players;
  const maxStarts = players.reduce((a, p) => Math.max(a, +p.starts || 0), 0);
  const started = startedGameweeks(events);
  /* `starts` <= byrjadar umferdir  <=>  summurnar eru ThESSA timabils.
     Tvofold umferd gefur 2 byrjanir i einni umferd, svo thakid er rumt. */
  const isThisSeason = maxStarts <= Math.max(1, started) * 2;
  console.log(`     max starts ${maxStarts}, byrjadar umferdir ${started}`
            + ` -> summurnar eru ${isThisSeason ? "ThESSA" : "FYRRA"} timabils`);
  if (!isThisSeason) {
    ok(!seasonHasStarted(events),
      "summurnar eru fyrra timabils -> klukkan VERDUR ad segja 'ekki byrjad',"
      + " annars stendur 'GW1-N' ofan a tolum SIDASTA timabils");
  } else {
    ok(seasonHasStarted(events),
      "summurnar eru nullstilltar -> `seasonStarted` VERDUR ad vera true,"
      + " annars stendur 'sidasta timabil' ofan a tolum thessa timabils");
  }
}

/* B3c. DEFCON-TAEKIFAERI HRUNDI I EINN FASTA ThEGAR BOOTSTRAP NULLSTILLTIST
        — LAGAD 20.8.2026, OG VORDURINN SNYR NU I BADAR ATTIR.

   VILLAN SEM VAR: `computeDefcon` las `expected_goal_involvements`
   (lidsstyrk andstaedinga) og markvardar-`expected_goals_conceded` med
   `minutes > 400`-hlidi ur bootstrap. Verdi baðar summur 0 toku
   VARALEIDIRNAR yfir (`|| 50` og `?? 1,4`) og hver klubbur fékk SOMU tolu:
       1,4 * 22 + (50/38) * 20 = 57
   MAELT 20.8.2026 a raungognum: i dag 14 ólik gildi a bilinu 53-86; med
   nullstilltum summum **57 hja ollum 20** — tilbuinn fasti a 0-100 kvarda
   sem les eins og maeling, i ~5 umferdir (markvardar-hlidid er onaeðanlegt
   fyrr). Nakvaemlega ThAD sem CLAUDE.md kafli 3 opnar a.

   LAGFAERINGIN: `null` thegar inntokin vantar, ALDREI annar fasti. RODIN er
   samt skrifud (20 lyklar, gildin null) og thad er ASETT — `App.jsx` ber
   SITT EIGID afrit af formulunni og keyrir thad thegar `opportunity` er
   TOM, svo ad sleppa rodunum hefdi flutt fabrikkeringuna inn i appid i
   stad thess ad fjarlaegja hana.

   ThESSI BLOKK VAR "SKJALFEST VILLA"-PINNI (hun fullyrti ad `|| 50` og
   `?? 1,4` VAERU til). Nu er hun tvi-atta vordur um lagfaeringuna:
   afturkalli einhver hana falla fyrstu tvaer fullyrdingarnar. Sama form og
   `rotationRisk`-blokkin i thessari skra fékk sama kvold.
   TILBUNA TILFELLID (nullstillt bootstrap -> null, ekki 57) liggur i
   `tests/defcon-shrink.mjs` kafla 8, thar sem `computeDefcon` er DREGID UT
   og keyrt — thad er eina leidin ad fullyrda um nullstillinguna adan en
   hun gerist. */
{
  const fx = SRC("scripts/fetch.mjs");
  /* Stripum athugasemdir: villan er SKJALFEST i blokk-athugasemd hér fyrir
     ofan OG i `fetch.mjs`, svo leit i hraum texta finnur sina eigin
     lysingu og fullyrdingin gaeti ekki fallid (CLAUDE.md 13). */
  const code = fx.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok(!/teamAtt\[opp\]\s*\|\|\s*50/.test(code),
    "varaleidin fyrir sokn andstaedings (`|| 50`) er FARIN ur kodanum");
  ok(!/teamDef\[tid\]\?\.xgc90\s*\?\?\s*1\.4/.test(code),
    "og varaleidin fyrir eigid xGC (`?? 1,4`) er FARIN");
  /* FORSENDA FYRIR NEIKVAEDU FULLYRDINGUNUM (CLAUDE.md 5b regla 2): blokkin
     sem thaer eiga vid VERDUR ad vera til, annars stodust thaer af thvi ad
     `computeDefcon` var endurnefnt eda flutt.                            */
  ok(/const opportunity = \{\};/.test(code) && /defcon_opportunity:/.test(code),
    "og `opportunity`-blokkin er a sinum stad (annars maela thaer ekkert)");
  ok(/raw == null \? null :/.test(code),
    "`raw` er null nema BADIR lidir seu raunverulegir (halfur utreikningur er sama villan)");
  ok(/mins > 400/.test(code), "markvardar-hlidid er afram `minutes > 400` (onaeðanlegt fyrir GW5)");

  const opp = J("defcon.json").opportunity || {};
  const rows = Object.values(opp);
  const vals = rows.map(o => o?.defcon_opportunity).filter(v => v != null);
  ok(rows.length >= 20, `defcon.opportunity ber ${rows.length} klubba (rodin ma ALDREI horfa)`);
  /* HRUN-NEMINN. I dag eru inntokin til, svo talan a ad vera dreifd. Vaeri
     hun EIN hja ollum 20 vaeri thad annadhvort varaleidin komin aftur eda
     ny sömu tegundar. Se hun HVERGI til (nullstillt bootstrap) er thad
     RETTA astandid og fullyrdingin fer i hvild — MED tolu, ekki thegjandi. */
  if (vals.length) {
    const distinct = new Set(vals).size;
    ok(distinct >= 5, `og ${distinct} olik gildi (${Math.min(...vals)}-${Math.max(...vals)})`
      + " — EIN tala hja ollum thyddi tilbuinn fasta");
    ok(!vals.every(v => v === 57), "og thau eru ekki oll 57 (gamla fabrikkeringin)");
  } else {
    ok(rows.every(o => o.defcon_opportunity === null),
      `bootstrap er nullstillt: ALLAR ${rows.length} radir bera null, engin 57`);
  }
}

/* B4. OG SPJALDA-REGLAN MA EKKI FYLGJA MED: `banRisk` a ad thegja thangad
   til umferd er LOKIN, ekki thangad til fresturinn er lidinn. Astand A er
   einmitt bilid thar sem thau tvo eru ekki thad sama (Luke Shaw, 9 gul). */
{
  const shaw = { yellow_cards: 9 };
  eq(banRisk(shaw, 1, false), null, "frestur lidinn en engin umferd lokin -> ENGIN bann-haetta");
  ok(banRisk(shaw, 1, true) !== null, "og hun kviknar um leid og umferd er lokin");
  eq(banRisk(shaw, 1, true).toGo, 1, "9 gul -> 1 fra banni (thegar tolurnar eru ThESSA timabils)");
}

/* B5. NAFNID I `last_gw.json` MA EKKI ThYDA SITTHVAD EFTIR KLUKKUNNI.
   Baðar leidir skrifa `web_name`; archive-leidin flettir `element` upp i
   `players_raw.csv` sama timabils. Reglan er DREGIN UT UR UPPRUNANUM —
   afrit af henni hér gaeti verid rett eftir ad `fetch.mjs` breyttist. */
{
  const fx = SRC("scripts/fetch.mjs");
  ok(/name: p\.web_name/.test(fx), "lifandi leidin skrifar `p.web_name`");
  ok(/webByElement\.get\(String\(r\.element\)\) \|\| r\.name/.test(fx),
    "archive-leidin flettir `element` upp og fellur A GAMLA NAFNID, ekki a tomt");
  ok(/players_raw\.csv/.test(fx) && /r\.web_name/.test(fx),
    "og uppflettitaflan er byggd ur `players_raw.csv` (`id` -> `web_name`)");
  /* OG VORPUNIN MA EKKI VERA HEURISTIK. Leitin er SKORDUD vid smidinn
     sjalfan: `split(" ").pop()` er logleg annars stadar i `fetch.mjs`
     (nafna-porun meidsla, lina 166) og oskorðud leit myndi thvi FELLA
     rettan kóda — nakvaemlega tóma/falska fullyrdingin ur 5b, i baða atti. */
  const i0 = fx.indexOf("async function buildArchiveGwReport");
  const i1 = fx.indexOf('writeJSON("last_gw.json"', i0);
  ok(i0 > 0 && i1 > i0, "archive-smidurinn finnst i heild sinni");
  const body = fx.slice(i0, i1);
  ok(!/split\(/.test(body),
    "engin styttingar-heuristik I SMIDNUM — 'sidasta ordid' gefur 'Goncalves' fyrir 'J.Palhinha'");
  ok(/name: webByElement\.get/.test(body), "og nafnid kemur UR uppflettingunni");
  const lg = J("last_gw.json");
  const maxLen = Math.max(...lg.players.map(p => String(p.name || "").length));
  if (lg.archive === true) {
    /* MAELT 20.8.2026 gegn spegluninni: 841 af 841 rodum i gw38.csv parast
       vid `players_raw.csv` og LENGSTA `web_name` er 16 stafir. Skran i
       `data/` er endurmynduð i daglegu keyrslunni (05 UTC), svo thetta
       maelir hvort hun se ORDIN eftir lagfaeringunni. */
    console.log(`     archive-rod i data/: lengsta nafn ${maxLen} stafir`
              + (maxLen > 32 ? "  <- ENN FYRIR LAGFAERINGU (endurmyndast kl. 05 UTC)" : ""));
    ok(true, "archive-leidin er profud a UPPRUNANUM (skrain sjalf bidur daglegrar keyrslu)");
  } else {
    const web = new Set(J("players.json").players.map(p => p.web_name));
    const bad = lg.players.filter(p => !web.has(p.name)).map(p => p.name);
    ok(bad.length === 0, `lifandi rod: hvert nafn er web_name ur players.json (${bad.length} onnur)`,
      bad.slice(0, 5).join(" · "));
    ok(maxLen <= 32, `og lengsta nafn er ${maxLen} stafir (XiCard hefur fasta breidd)`);
  }
}

/* ============================================================
   C. GW1 LOKIN
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("C) GW1 LOKIN — glugginn verdur lifandi, og hann er EINA UMFERD BREIDUR");
console.log("─".repeat(84));

/* C1. GLUGGA-HRUNID, MAELT. `deriveImminent` skiptir i lifandi gluggann um
   leid og EIN umferd er lokin, og tekur tha `finished.slice(-5)` = [1].
   `startFeatures` krefst >= 2 umferda og `inImminentPool` >= 180 minutna —
   hvorugt er faanlegt i einni umferd. Tolurnar hér eru maeldar a
   `data/imminent.json` 20.8.2026 (841 radir). */
{
  const im = J("imminent.json");
  const winOf = (r, k) => {
    const byGw = new Map();
    for (const x of (r.series || [])) byGw.set(x.gw, (byGw.get(x.gw) ?? 0) + x.min);
    return [...byGw.keys()].sort((a, b) => a - b).slice(-k).map(g => byGw.get(g) ?? 0);
  };
  const featsAt = k => im.players.filter(r => startFeatures(winOf(r, k), r.now_cost)).length;
  eq(featsAt(1), 0, "gluggi = 1 umferd: EKKI EIN rod fær start_feats (astand C)");
  eq(featsAt(2), 840, "gluggi = 2 umferdir: 840 radir fa thau aftur");
  eq(featsAt(5), 840, "gluggi = 5 umferdir (i dag): 840");
  eq(startFeatures([90], 55), null, "og reglan sjalf: eitt gildi -> null (>= 2 er krafan)");

  const poolAt = k => im.players.filter(r => {
    const gws = new Set([...new Set((r.series || []).map(x => x.gw))].sort((a, b) => a - b).slice(-k));
    const w = { minutes: 0, goals: 0, assists: 0 };
    for (const x of (r.series || [])) if (gws.has(x.gw)) { w.minutes += x.min; w.goals += x.g; w.assists += x.a; }
    return inImminentPool(w);
  }).length;
  eq(IMMINENT_MIN_MINUTES, 180, "mo/ao-golfid er 180 minutur");
  eq(poolAt(1), 0, "mo/ao gluggi = 1 umferd: ENGINN i markhopnum (90 min er hamarkid)");
  eq(poolAt(2), 72, "gluggi = 2 umferdir: 72");
  eq(poolAt(4), 184, "gluggi = 4 umferdir (i dag): 184");

  /* AFLEIDINGIN SEM ER VERST: byrjunar-golfid i rotation.js hleypir null
     i gegn — VILJANDI, og rett fyrir mann sem a engin gogn. Verdi ALLIR
     null er thad ekki lengur undantekning heldur SLOKKT vorn. Reglan er
     dregin ut ur upprunanum svo hun geti ekki breyst undir thessum texta. */
  const rot = SRC("src/rotation.js");
  ok(/if \(cP != null && cP < MIN_START_PROB\) continue;/.test(rot),
    "byrjunar-golfid sleppir null i gegn (`cP != null && cP < MIN_START_PROB`)");
  ok(/\* \(cP \?\? 1\)/.test(rot),
    "og vaent stig frambjodanda eru EKKI afsloegd thegar P er null (`cP ?? 1`)");
  let below = 0, gk = 0;
  for (const r of im.players) {
    if (!r.start_feats) continue;
    const p = startProbability(stampStartWindow({ archive: true }, r.start_feats));
    if (p != null && p < 0.15) { below++; if (r.pos === "GK") gk++; }
  }
  eq(below, 472, "radir sem golfid utilokar I DAG (og sleppa inn thegar P verdur null)");
  eq(gk, 69, "thar af markmenn — nakvaemlega hopurinn sem golfid var settur fyrir 4.8.2026");
}

/* ============================================================
   C1b. LAGFAERINGIN A HRUNINU — GLUGGINN SKIPTIR VID `FETCH_WINDOW` (20.8.2026)

   C1 hér fyrir ofan MAELIR hrunid; thessi kafli fullyrdir ad thad geti ekki
   gerst. `deriveImminent` helt adur safns-glugganum thangad til
   `finished.length >= 1` og skipti tha i lifandi glugga af LENGD 1.

   ThRJAR TOLUR ERU DREGNAR UT UR UPPRUNANUM, ekki endurskrifadar hér
   (CLAUDE.md 7.1): threskuldurinn i greininni, lengd lifandi gluggans og
   lengd safns-gluggans. Vaeri hver theirra skrifud hér gaeti hun verid rett
   medan `fetch.mjs` er onnur — sama villa og `buildTeamMetrics`.

   OG AFLEIDINGIN ER FULLYRT BEINT, ekki adeins glugginn: varamarkmadur med
   0 minutur VERDUR ad falla ut ur roterings-pari i astandi "1 umferd lokin".
   Thad er nakvaemlega Meslier-tilfellid ur CLAUDE.md kafla 3 — golfid sem
   "virtist virka; thad var bara aldrei spurt".
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("C1b) GLUGGINN SKIPTIR VID FETCH_WINDOW — OG GOLFID ER ENN SPURT");
console.log("─".repeat(84));
{
  const fx = SRC("scripts/fetch.mjs");
  const der = fx.slice(fx.indexOf("async function deriveImminent("));
  ok(der.length > 500, "forsenda: `deriveImminent` finnst i scripts/fetch.mjs");

  /* Fastarnir sjalfir, ur upprunanum. */
  const nOf = re => { const m = re.exec(fx); return m ? +m[1] : null; };
  const IMM = nOf(/const IMM_WINDOW = (\d+)/);
  const START = nOf(/const START_WINDOW = (\d+)/);
  eq(IMM, 4, "IMM_WINDOW (mo/ao) = 4 umferdir");
  eq(START, 5, "START_WINDOW (byrjunar-likur) = 5 umferdir");
  const FETCH_W = Math.max(IMM, START);

  /* Greinin sjalf: hvad er threskuldurinn? */
  const branch = /if \(finished\.length >= ([A-Za-z_0-9.]+)\) \{/.exec(der);
  ok(!!branch, "greinin `if (finished.length >= ...)` finnst");
  eq(branch?.[1], "FETCH_WINDOW",
    "og threskuldurinn er FETCH_WINDOW, EKKI 1 — 1 gaf lifandi glugga af lengd 1");

  /* Lifandi glugginn og safns-glugginn eru bædi FETCH_WINDOW ad lengd. */
  const liveSlice = /gws = finished\.slice\(-([A-Za-z_0-9.]+)\)/.exec(der);
  ok(!!liveSlice, "lifandi glugginn er `finished.slice(-...)`");
  eq(liveSlice?.[1], "FETCH_WINDOW", "og hann er FETCH_WINDOW langur (ekki 1)");
  const archSlice = /top - ([A-Za-z_0-9.]+) \+ 1/.exec(der);
  eq(archSlice?.[1], "FETCH_WINDOW", "safns-glugginn er lika FETCH_WINDOW langur");

  /* ---- ASTONDIN: 0, 1, 2, 4, 5 og 6 loknar umferdir ----
     Vid keyrum SOMU akvordun og `deriveImminent` tekur (threskuldurinn ur
     upprunanum) og maelum ThEKJUNA sem hun gefur, med raunverulegu
     `startFeatures` a raunverulegum radaseriunum.                       */
  const im = J("imminent.json");
  const winOf = (r, k) => {
    const byGw = new Map();
    for (const x of (r.series || [])) byGw.set(x.gw, (byGw.get(x.gw) ?? 0) + x.min);
    return [...byGw.keys()].sort((a, b) => a - b).slice(-k).map(g => byGw.get(g) ?? 0);
  };
  const chosen = n => (n >= FETCH_W
    ? { archive: false, len: Math.min(n, FETCH_W) }
    : { archive: true,  len: FETCH_W });
  for (const n of [0, 1, 2, 4, 5, 6]) {
    const c = chosen(n);
    const feats = im.players.filter(r => startFeatures(winOf(r, c.len), r.now_cost)).length;
    ok(c.len >= 2 && feats > 100,
      `${n} loknar umferdir -> ${c.archive ? "ARCHIVE" : "LIFANDI"} gluggi af lengd ${c.len}, `
      + `${feats} radir med start_feats`);
  }
  ok(chosen(1).archive === true && chosen(4).archive === true,
    "1 og 4 loknar umferdir halda SAFNS-glugganum (bædi likön eru validerud vid 4-5)");
  ok(chosen(5).archive === false && chosen(5).len === 5,
    "og vid 5 tekur lifandi glugginn yfir i fullri lengd");

  /* ---- AFLEIDINGIN: GOLFID VERDUR ENN SPURT UM VARAMARKMANNINN ----
     Astandid er "1 umferd lokin". Med laguninni er glugginn ARCHIVE, svo
     `start_feats` eru til og `stampStartWindow` kveikir a endurkvordun.
     Meslier-tilfellid: 0 byrjanir, 0 minutur.                          */
  const reserveFeats = startFeatures([0, 0, 0, 0, 0], 45);
  ok(reserveFeats != null, "forsenda: varamarkmadur MED archive-glugga fær start_feats");
  const pReserve = startProbability(stampStartWindow({ archive: true }, reserveFeats));
  ok(pReserve != null && pReserve < MIN_START_PROB,
    `varamarkmadur (0 byrjanir, 0 min) fær P = ${pReserve?.toFixed(4)} < ${MIN_START_PROB}`);
  /* OG STAERI HELMINGURINN: einn-umferdar glugginn gefur EKKERT, svo golfid
     er ekki "of laust" heldur ALDREI SPURT. Fullyrdingin er tvi-atta.   */
  eq(startFeatures([0], 45), null,
    "medan ein-umferdar glugginn gefur null — golfid vaeri ekki laust heldur OSPURT");

  /* Og loks: kastad inn i raunverulegu roterings-vélina. */
  const mk = (id, cost, team) => ({ id, web_name: `P${id}`, element_type: 1,
    now_cost: cost, team, ep_next: "3.0", points_per_game: "3.0", minutes: 0, status: "a" });
  const target = { p: mk(1, 55, 1), teamId: 1 };
  const reserve = { p: mk(2, 40, 2), teamId: 2 };
  const fixByTeamGw = { 1: { 1: [{ id: 11, event: 1, team_h: 1, team_a: 3 }] },
                        2: { 1: [{ id: 12, event: 1, team_h: 2, team_a: 4 }] } };
  /* Erfid umferd fyrir markid, lett fyrir frambjodandann. */
  const fixDifficulty = (teamId) => (teamId === 1 ? 6 : 1);
  const run = pFn => findRotationPartners({
    targets: [target], candidates: [reserve], gwFrom: 1, horizon: 1, maxGw: 38,
    fixByTeamGw, fixDifficulty, ownedIds: [], startProbOf: pFn });
  const withFix = run(p => (p.id === 2 ? pReserve : 0.9));
  const broken  = run(() => null);           // astandid sem villan skapadi
  ok(broken.results.length === 1,
    `forsenda: med P = null hja ollum ER varamarkmadurinn bodinn (${broken.results.length} par)`);
  ok(withFix.results.length === 0,
    `og med archive-glugganum er hann SIADUR UT af golfinu (${withFix.results.length} par)`);
}

/* C2. KVORDUNIN VID GW1: FAAR MAELINGAR -> ENGIN TALA, OG EINRAENIN ER EKKI
   FULLYRT. Ein umferd er 20 lid-leikir a sex threp; `minN = 20` gerir hvert
   threp null, svo `monotone` er null og `calibration.mjs` kafli 5 sleppir
   fullyrdingunni. Thad er RETT — og hér er thad fullyrt svo enginn "einfaldi"
   minN nidur og geri einraeni-profid ad hnetuhristingi i GW1. */
{
  const tiers = [[0, 2], [1, 4], [2, 6], [3, 3], [4, 1], [5, 4]];   // maelt a raunverulegu GW1
  const snapshots = [{ gw: 1, ffdr: [] }], results = [];
  let fx = 1;
  for (const [tier, n] of tiers) for (let i = 0; i < n; i++, fx++) {
    snapshots[0].ffdr.push({ fixture: fx, team: 1, opp: 2, home: true, def: 1 + tier, def_tier: tier });
    results.push({ fixture: fx, team: 1, conceded: i % 2, scored: 1 });
  }
  const r = ffdrVsCleanSheets({ snapshots, results });
  eq(r.matched, 20, "GW1 gefur 20 lid-leiki");
  eq(r.monotone, null, "og einraeni er NULL — ekki fullyrt a 20 sýnum");
  ok(r.tiers.every(t => t.value === null), "hvert threp skilar null + skyringu");
  ok(r.tiers.length > 0, "en threpin eru skrad (kafli 5 i calibration.mjs krefst thess)");
  /* Fyrsta umferdin thar sem einraeni ER fullyrt: tvo threp med n >= 20.
     Med GW1-loguninni gerist thad vid GW5 — skrad svo thad komi ekki a ovart. */
  const firstAsserted = (() => {
    for (let k = 1; k <= 38; k++) if (tiers.filter(([, n]) => n * k >= 20).length >= 2) return k;
    return null;
  })();
  eq(firstAsserted, 5, "einraeni verdur FULLYRT fyrst eftir ~5 umferdir (2 threp na n >= 20)");
}

/* C3. GW1-VOKULISTINN — VAKANDI GREININ HEFUR ALDREI KEYRT.
   `gw1-checklist.mjs` ber `GW1_DATA_DIR` og hausinn segir ad greinin se
   profud "a TILBUNUM gognum (sja sjalfsprofunina nedst)". SU SJALFSPROFUN
   VAR ALDREI SKRIFUD og engin skra i repo-inu setti breytuna — 22
   fullyrdingar sem hafa aldrei keyrt. Hér er hun. */
{
  const tmp = mkdtempSync(join(tmpdir(), "clock-C-"));
  try {
    const W = (f, o) => { mkdirSync(join(tmp, f, ".."), { recursive: true });
                          writeFileSync(join(tmp, f), JSON.stringify(o)); };
    const players = J("players.json").players;
    const pros = J("pros.json");

    const ev = J("events.json");
    ev.events[0] = { ...ev.events[0], finished: true, data_checked: true, is_current: true, is_next: false };
    ev.events[1] = { ...ev.events[1], is_next: true };
    W("events.json", ev);
    /* LEIKJASKRA VERDUR AD FYLGJA (25.8.2026). `gw1-checklist` les nu
       klukkuna ur `playedGwIds(events, fixtures)` i stad `e.finished` —
       sjounda tilfellid af theirri lagfaeringu, og thad var i PROFI.
       Tilbuni heimurinn var thvi ekki lengur FULLBUINN: an
       `fixtures.json` kastadi listinn og NULL fullyrdingar keyrdu, sem
       kafli hér nedan greip (`0 fullyrdingar keyrdu`). Astandid sem er
       byggt er "ein umferd spilud", svo leikirnir eru merktir bunir —
       annars vaeri leikjaskrain ekki i takt vid `events`.               */
    W("fixtures.json", Array.from({ length: 10 }, (_, i) => ({
      id: 1000 + i, event: 1, team_h: (i * 2) + 1, team_a: (i * 2) + 2,
      finished: true, finished_provisional: true, started: true,
      team_h_score: 1, team_a_score: 0,
      kickoff_time: "2026-08-22T14:00:00Z" })));

    const st = J("status.json");
    const src = st.sources || st;
    src.fpl_bootstrap = { ok: true, count: players.length, note: "x" };
    src.fpl_fixtures = { ok: true, count: 380, note: null };
    src.fpl_live = { ok: true, count: 1, note: "1 finished gameweek" };
    src.apisports_injuries = { ok: true, count: 0, note: "no match day in window" };
    W("status.json", st);

    W("pros.json", pros);
    const inOut = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, i + 2]));
    W("pros_gw.json", { gw: { 1: { n: Math.round(pros.panel.length * 0.95),
      in: inOut(40), out: inOut(40), rankMedian: 250000, value: 1005,
      points: 62, benchPoints: 8, control: { n: 480, points: 55 } } } });

    W("live/gw1.json", { elements: Array.from({ length: 300 }, (_, i) => ({
      id: players[i]?.id ?? i + 1,
      stats: { minutes: i < FULL_STARTS ? 90 : 0, starts: i < FULL_STARTS ? 1 : 0, total_points: 2 } })) });

    W("player_form.json", { gws_used: 1, players: Object.fromEntries(
      players.slice(0, 300).map(p => [p.id, { mins_trend: 0 }])) });
    W("last_gw.json", { season: "2026/27", gw: 1, archive: false, source: "fpl-live",
      fixtures: [], players: players.slice(0, 100).map(p => ({ name: p.web_name, minutes: 90 })) });
    W("last_gw_shots.json", { gw: 1, shots: Array.from({ length: 120 }, () => ({ x: 20, y: 50, xg: 0.1 })) });
    W("defcon.json", { players: players.filter(p => p.element_type !== 1).slice(0, 200)
      .map(p => ({ id: p.id, hit_rate_adj: 0.2, p0: 0.19, starts: 1 })) });
    /* GLUGGINN VID GW1 — HEILBRIGDA ASTANDID SNERIST VID 20.8.2026.
       Adur skrifadi thetta `archive: false, gws: [1]` og gw1-checklist var
       GRAEN a thvi. Thad astand er einmitt hrunid sem kafli C1 maelir
       (start_feats a 0 af 841 rodum), svo "graen" var rangt svar. Med
       laguninni i `deriveImminent` heldur safns-glugginn thangad til FIMM
       umferdir eru loknar, svo heilbrigda astandid eftir GW1 ER archive. */
    const im = J("imminent.json");
    W("imminent.json", { ...im, archive: true, gws: [35, 36, 37, 38] });
    W("season_baseline.json", J("season_baseline.json"));
    W("fdcouk/E0-2627.json", { rows: Array.from({ length: 10 }, () => ({ Div: "E0" })) });

    const run = () => spawnSync("node", [new URL("gw1-checklist.mjs", import.meta.url).pathname],
      { env: { ...process.env, GW1_DATA_DIR: tmp }, encoding: "utf8" });
    /* SIGNAL-DAUDI BARNSINS ER UMHVERFI, EKKI FALLIN FULLYRDING (25.8.2026).
       MAELT: keyrsla kl. 11:46 felldi thennan kafla med thremur rodum —
       tomum tail (`...gognum ()`) og "0 fullyrdingar keyrdu" — medan safnid
       er GRAENT eitt og ser (189 stodust, 0 fellu, sama HEAD). Orsokin var
       ad barnid var DREPID undir alagi: thrjar lotur keyrdu profin samtimis
       a somu vel. Tomur tail er FINGRAFARID — barn sem fell a fullyrdingu
       prentar hana, barn sem er drepid prentar EKKERT.

       Skilabodin sogdu samt "thekjan hrundi", sem er RONG ORSOK og sendir
       naesta mann i ad leita ad villu i klukkunni sem er ekki til. Thetta er
       nakvaemlega sama aett og TIMAMORK i `run-tests.mjs`: `status: null` +
       `signal` er obreytanlega EKKI thad sama og fallid prof, og skilabodin
       verda ad greina thau i sundur.

       Ein endurtilraun (kill undir alagi er stundbundid); ef hun deyr lika
       er thad SAGT BERUM ORDUM. Fullyrdingarnar FALLA afram i badum
       tilfellum — thad sem breytist er HVAD their segja, ekki hvort thaer
       verja. Golfid `nAsserts >= 20` er obreytt, svo raunveruleg
       stokkbreyting sem lataer barnid keyra ekkert fellur enn.          */
    let r = run();
    if (r.status === null && (r.signal || r.error)) r = run();
    const killedBy = r.status === null ? (r.signal || r.error?.code || "unknown") : null;
    const lines = String(r.stdout || "").split("\n");
    const tail = lines.filter(l => /VÖKULISTI:/.test(l)).join("");
    ok(r.status === 0, killedBy
      ? `barnid var DREPID (${killedBy}) — UMHVERFI, ekki klukkan: keyrdu \`node tests/clock-states.mjs\` eitt og ser`
      : `vakandi greinin i gw1-checklist KEYRIR og er GRAEN a tilbunum gognum (${tail.trim()})`,
      lines.filter(l => /✗/.test(l)).join(" | "));
    ok(/loknar umferðir: 1/.test(String(r.stdout)), killedBy
      ? `barnid drepid (${killedBy}) — vakandi greinin var ALDREI SPURD`
      : "og hun tok vakandi greinina (1 lokin umferd)");
    const nAsserts = (String(r.stdout).match(/[✓✗]/g) || []).length;
    ok(nAsserts >= 20, killedBy
      ? `barnid drepid (${killedBy}) — thekjan er OMAELD, ekki hrunin`
      : `${nAsserts} fullyrdingar keyrdu (thekjan er fullyrding, ekki logga)`);

    /* STOKKBREYTING: EIN-UMFERDAR LIFANDI GLUGGI MA EKKI SLEPPA I GEGN.
       Thetta var adur "archive eftir GW1 fellur" — sem er nu RETTA astandid.
       Stokkbreytingin sem verdur ad falla er hin: pipeline sem skiptir i
       lifandi gluggann of fljott, thar sem ENGIN rod fær start_feats. */
    W("imminent.json", { ...im, archive: false, season: "2026/27", gws: [1],
                         players: (im.players || []).map(r => ({ ...r, start_feats: undefined })) });
    ok(run().status !== 0,
      "og hun FELLUR a ein-umferdar lifandi glugga eftir GW1 — 0 radir med start_feats (stokkbreyting)");
    W("imminent.json", { ...im, archive: true, gws: [35, 36, 37, 38] });
    W("fdcouk/E0-2627.json", { rows: [{ Div: "EC" }] });
    ok(run().status !== 0, "og fellur a EC-rodum i E0-skranni (301-gildran, stokkbreyting)");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

console.log(`\nKLUKKU-ASTOND: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
