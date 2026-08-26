/* ============================================================
   KVORDUNIN — MAELIR HUN ThAD SEM HUN SEGIR?

   `src/calibration.js` ber spa-bokhaldid (`data/predictions/gw{N}.json`) vid
   thad sem GERDIST og segir hvort maelingarnar haldi. Hun getur ekki keyrt a
   raungognum fyrr en fyrsta umferd er lokin — 21. agust 2026.

   ThVI ER HUN PROFUD A TILBUNUM GOGNUM NUNA. Thad er ekki varuð heldur regla:
   "Omældur kóði sem fer í gang einn morgun er ekki ásættanlegt" (CLAUDE.md
   kafli 5). Sama mynstur og `mins-trend.mjs` kafli 0, `defcon-shrink.mjs` og
   `bsd-pipeline.mjs`.

   TILBUNU GOGNIN ERU BYGGD SVO SVARID SE ThEKKT FYRIRFRAM. Fullyrding sem
   segir adeins "skilar tolu" er ekki maeling a kvordun; hun er maeling a thvi
   ad kodinn hafi keyrt. Hvert tilfelli her hefur RETTA SVARID reiknad i
   hausnum og profad gegn thvi.

   OG SIDASTI KAFLINN SEFUR: se ekkert bokhald til (forleikur) prentar hann
   thad og fellur EKKI. Dagurinn sem hann faer gogn er dagurinn sem hann fer
   ad segja eitthvad — sama hegdun og `gw1-checklist.mjs`.
   ============================================================ */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { ffdrVsCleanSheets, rankVsPoints, startProbCalibration, resultsFromFixtures,
         START_BENCHMARKS, startWindowOf } from "../src/calibration.js";
import { PRESEASON_CAL } from "../src/stats.js";

const D = new URL("../data/", import.meta.url).pathname;
const P = D + "predictions/";
let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                    : (fail++, console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`)); };

/* ---------------------------------------------------------------
   1. FFDR -> HREIN BLOD, MED ThEKKTU SVARI
   --------------------------------------------------------------- */
console.log("\n1) FFDR gegn hreinum blodum (tilbuin gogn, thekkt svar)");
{
  /* 40 lid-leikir i threpi 0 thar sem 30 halda hreinu -> 0,75.
     40 i threpi 5 thar sem 4 halda hreinu -> 0,10.
     Threpin eru thvi EINRAEN og bilid er 0,75 / 0,10.                   */
  const snapshots = [{ gw: 1, ffdr: [] }];
  const results = [];
  let fx = 1;
  const add = (tier, n, cs) => {
    for (let i = 0; i < n; i++, fx++) {
      snapshots[0].ffdr.push({ fixture: fx, team: 1, opp: 2, home: true, def: 1 + tier, def_tier: tier });
      results.push({ fixture: fx, team: 1, conceded: i < cs ? 0 : 2, scored: 1 });
    }
  };
  add(0, 40, 30); add(5, 40, 4);
  const r = ffdrVsCleanSheets({ snapshots, results, minN: 20 });
  ok(`pöruð ${r.matched} lið-leikir`, r.matched === 80, String(r.matched));
  const t0 = r.tiers.find(t => t.tier === 0), t5 = r.tiers.find(t => t.tier === 5);
  ok(`þrep 0 -> 0,75 (${t0?.value})`, t0?.value === 0.75);
  ok(`þrep 5 -> 0,10 (${t5?.value})`, t5?.value === 0.10);
  ok("bilid er skrad (lettast a moti thyngst)", r.spread?.light === 0.75 && r.spread?.heavy === 0.10);
  ok("einraeni greind", r.monotone === true);
  ok("skjalfesta vidmidid fylgir tolunni", r.documented?.lightest === 0.449);

  /* SNUID VID: thyngri threp gefa FLEIRI hrein blod -> einraeni BROTIN.
     Thetta er tilfellid sem a ad vekja mann, svo thad verdur ad greinast. */
  const snap2 = { gw: 1, ffdr: [] }, res2 = [];
  fx = 1;
  for (const [tier, cs] of [[0, 5], [5, 35]]) {
    for (let i = 0; i < 40; i++, fx++) {
      snap2.ffdr.push({ fixture: fx, team: 1, opp: 2, home: true, def: 1 + tier, def_tier: tier });
      res2.push({ fixture: fx, team: 1, conceded: i < cs ? 0 : 2, scored: 1 });
    }
  }
  ok("SNUID merki -> einraeni BROTIN (greinist)",
     ffdrVsCleanSheets({ snapshots: [snap2], results: res2, minN: 20 }).monotone === false);

  /* FAAR MAELINGAR -> ENGIN TALA. */
  const thin = ffdrVsCleanSheets({ snapshots: [{ gw: 1, ffdr: [
    { fixture: 1, team: 1, opp: 2, home: true, def: 1, def_tier: 0 }] }],
    results: [{ fixture: 1, team: 1, conceded: 0 }], minN: 20 });
  ok("1 syni -> null, ekki 100%", thin.tiers[0].value === null);
  ok("og notan segir hvers vegna", /sýni/.test(thin.tiers[0].why || ""), thin.tiers[0].why);
}

/* ---------------------------------------------------------------
   2. RODUNIN -> RAUNSTIG, MED ThEKKTU SVARI
   --------------------------------------------------------------- */
console.log("\n2) Rodunin gegn raunstigum (tilbuin gogn, thekkt svar)");
{
  /* 20 leikmenn. `score_avail` radar theim ordrett i rod stiga (20..1), svo
     topp-15 okkar = stig 20..6 -> medaltal 13.
     `ep_next` radar THVERT A MOTI (1..20), svo topp-15 FPL = stig 1..15 ->
     medaltal 8. Okkar a thvi ad SLA FPL, og tolurnar eru fyrirfram thekktar. */
  const rank = [], pts = new Map();
  for (let i = 0; i < 20; i++) {
    const id = i + 1, actual = 20 - i;
    rank.push({ id, score_avail: 20 - i, ep_next: i + 1 });
    pts.set(id, actual);
  }
  const r = rankVsPoints({ snapshots: [{ gw: 1, rank }], points: new Map([[1, pts]]), n: 15, minN: 10 });
  ok(`15 val ur 1 umferd (${r.picks}, gws ${r.gws})`, r.picks === 15 && r.gws === 1);
  ok(`okkar topp-15 = 13,000 (${r.ours})`, r.ours === 13);
  ok(`FPL-xP topp-15 = 8,000 (${r.fplXp})`, r.fplXp === 8);
  ok(`medal-leikmadur = 10,500 (${r.average})`, r.average === 10.5);
  ok("okkar slaer FPL", r.beatsFpl === true);
  ok("skjalfestu vidmidin fylgja (5,13 / 4,48)",
     r.documented?.ours === 5.13 && r.documented?.fplXp === 4.48);

  /* Se rodun okkar VERRI en FPL verdur thad ad sjast — annars er talan skraut. */
  const bad = rankVsPoints({ snapshots: [{ gw: 1,
    rank: rank.map(x => ({ ...x, score_avail: x.ep_next, ep_next: x.score_avail })) }],
    points: new Map([[1, pts]]), n: 15, minN: 10 });
  ok("VERRI rodun -> beatsFpl false (greinist)", bad.beatsFpl === false);

  /* Umferd an urslita telur EKKI — engin stig, engin tala. */
  const none = rankVsPoints({ snapshots: [{ gw: 7, rank }], points: new Map(), n: 15, minN: 10 });
  ok("engin urslit -> null + skyring", none.ours === null && /val/.test(none.why || ""));
}

/* ---------------------------------------------------------------
   3. BYRJUNAR-LIKUR: BRIER OG BEKKJAR-GILDRAN
   --------------------------------------------------------------- */
console.log("\n3) Byrjunar-likur (tilbuin gogn, thekkt svar)");
{
  /* FULLKOMIN spa: p=1 fyrir alla sem spila 90, p=0 fyrir alla sem spila 0.
     Brier a tha ad vera NAKVAEMLEGA 0 og grunntidnin verri.              */
  const rank = [], mins = new Map();
  for (let i = 0; i < 200; i++) {
    const id = i + 1, plays = i < 140;
    rank.push({ id, start_prob: plays ? 1 : 0 });
    mins.set(id, plays ? 90 : 0);
  }
  const r = startProbCalibration({ snapshots: [{ gw: 1, rank }], minutes: new Map([[1, mins]]), minN: 100 });
  ok(`200 syni (${r.n})`, r.n === 200);
  ok(`fullkomin spa -> Brier 0 (${r.brier})`, r.brier === 0);
  ok(`grunntidni verri (${r.baseline})`, r.baseline > 0 && r.beatsBaseline === true);
  /* BEKKJAR-GILDRAN: laegsti tiundarhluti (20 menn, allir p=0) eru allir a
     bekknum. 60 falla a bekk i heild -> 20/60 = 0,3333.                  */
  ok(`laegsti tiundarhluti fangar 20 af 60 = 0,3333 (${r.bottomDecileBenched})`,
     r.bottomDecileBenched === 0.3333);

  /* VITLAUS spa (snuid vid) verdur ad vera VERRI en grunntidnin.          */
  const flip = startProbCalibration({ snapshots: [{ gw: 1,
    rank: rank.map(x => ({ ...x, start_prob: 1 - x.start_prob })) }],
    minutes: new Map([[1, mins]]), minN: 100 });
  ok("SNUID spa -> slaer EKKI grunntidnina (greinist)", flip.beatsBaseline === false);

  const thin = startProbCalibration({ snapshots: [{ gw: 1, rank: rank.slice(0, 10) }],
    minutes: new Map([[1, mins]]), minN: 100 });
  ok("10 syni -> null, ekki Brier", thin.brier === null && /sýni/.test(thin.why || ""));
}

/* ---------------------------------------------------------------
   3b. HVADA LIKAN SKRIFADI RODINA? — TVO VIDMID, EINN MALSTIKA PER ROD

   Fyrsta kvordunar-skyrsla timabilsins hefdi sagt "Brier 0,18 a moti
   0,089" og lesid eins og TVOFOLD afturfor. Talan var rett; malstikan var
   fyrir annad likan (`START_MODEL` innan timabils, 65.557 syni) en thad
   sem skrifadi rodina (forleiks-endurkvordunin, maeld 0,1683).

   TILBUNU GOGNIN ERU EIN OG SAMA RODIN, SEND TVISVAR. Thad er allur
   punkturinn: 200 radir med p = 0,8 thar sem 160 byrja gefa Brier
   NAKVAEMLEGA 0,16 — sem er VERRA en 0,089 og BETRA en 0,1683. Sami
   maelipunktur, gagnstaedar niðurstodur, og provenansinn er thad EINA sem
   skilur thau ad. Vaeri talan valin utan thess bils gaeti prófið stadist
   thott bædi vidmid vaeru notud.
   --------------------------------------------------------------- */
console.log("\n3b) Provenans: forleiks-rod er borin vid FORLEIKS-vidmidid");
{
  const rank = [], mins = new Map();
  for (let i = 0; i < 200; i++) {
    const id = i + 1, plays = i < 160;
    rank.push({ id, start_prob: 0.8 });
    mins.set(id, plays ? 90 : 0);
  }
  const minutes = new Map([[1, mins]]);
  const run = win => startProbCalibration({
    snapshots: [{ gw: 1, ...(win ? { start_window: win } : {}), rank }], minutes, minN: 100 });

  /* FORSENDA SEM GERIR ALLT HITT MARKTAEKT (CLAUDE.md 5b regla 2): talan
     verdur ad LIGGJA MILLI vidmidanna, annars er samanburdurinn tomur.  */
  const A = START_BENCHMARKS.archive.brier, L = START_BENCHMARKS.live.brier;
  ok(`vidmidin eru sitt hvad (${L} innan timabils, ${A} i forleik) og munurinn er ~2x`,
     A > L * 1.7 && A < L * 2.2, `${A} / ${L}`);
  const base = run("archive");
  ok(`tilbuna rodin gefur Brier NAKVAEMLEGA 0,16 (${base.brier})`, base.brier === 0.16);
  ok("og hun liggur MILLI vidmidanna — annars maeldi kaflinn ekkert",
     base.brier > L && base.brier < A, `${L} < ${base.brier} < ${A}`);

  /* SAMA ROD, TVEIR GLUGGAR, GAGNSTAEDAR NIDURSTODUR. */
  ok(`archive-rod: malstikan er ${A} (forleiks-endurkvordunin)`,
     base.documented?.brier === A && base.window === "archive",
     JSON.stringify({ w: base.window, d: base.documented?.brier }));
  ok("og hun HELDUR (0,16 er ekki verra en 0,1683)", base.worseThanDocumented === false
     && base.cohorts.archive.worseThanDocumented === false);
  const inSeason = run("live");
  ok(`live-rod: malstikan er ${L} (hraa START_MODEL)`,
     inSeason.documented?.brier === L && inSeason.window === "live");
  ok("og HUN fellur — sama tala, annad likan, onnur nidurstada",
     inSeason.worseThanDocumented === true);
  ok("baðar bera SOMU maeldu toluna (talan er stadreynd, vidmidid er valid)",
     inSeason.brier === base.brier);

  /* ROD AN FLAGGS: MAELD TALA, ENGIN MALSTIKA — OG HUN SEGIR HVERS VEGNA.
     Thetta er `data/predictions/gw1.json` i raunveruleikanum: skrifud adur
     en svidid var til og ALDREI endurskrifud.                            */
  const unk = run(null);
  ok(`an provenans: maelda talan er skrad (${unk.brier})`, unk.brier === 0.16);
  ok("en `documented` er NULL — engin agiskun", unk.documented === null && unk.window === "unknown");
  ok("og `worseThanDocumented` er null, ekki false (thogn, ekki fullyrding)",
     unk.cohorts.unknown.worseThanDocumented === null);
  ok("og skyringin nefnir BADAR mogulegu tolurnar svo lesandinn viti bilid",
     new RegExp(String(A)).test(unk.why || "") && new RegExp(String(L)).test(unk.why || ""),
     unk.why);
  ok("provenans er ALDREI alyktad ut fra umferdarnumeri (gw1 -> unknown)",
     startWindowOf({ gw: 1 }, {}) === null && startWindowOf({ gw: 1, start_window: "archive" }) === "archive");
  ok("rod-flagg vinnur skra-flaggid (nakvaemara)",
     startWindowOf({ start_window: "live" }, { start_window: "archive" }) === "archive");

  /* BLANDADAR UMFERDIR: sameinud tala fær ENGA malstiku, en hvert cohort
     ber sina. Thetta gerist raunverulega thegar arkiv-glugginn slokknar i
     midju timabili (FETCH_WINDOW = 5 umferdir).                          */
  const mixed = startProbCalibration({ snapshots: [
    { gw: 1, start_window: "archive", rank }, { gw: 2, start_window: "live", rank }],
    minutes: new Map([[1, mins], [2, mins]]), minN: 100 });
  ok("blandad -> window 'mixed' og `documented` null", mixed.window === "mixed"
     && mixed.documented === null, JSON.stringify(mixed.window));
  ok("en badir gluggar eru taldir og bera SITT vidmid",
     mixed.cohorts.archive?.n === 200 && mixed.cohorts.live?.n === 200
     && mixed.cohorts.archive.documented.brier === A
     && mixed.cohorts.live.documented.brier === L);
  ok("og skyringin segir ad sameinud tala hafi ekkert eitt vidmid",
     /blandaðir gluggar/.test(mixed.why || ""), mixed.why);

  /* BYGGINGARLEGT: 0,1683 ER FLUTT INN, EKKI AFRITAD. Vaeri hun skrifud i
     src/calibration.js vaeru thad tvaer tolur um sama hlut sem gaetu rekid i
     sundur — sama villa og `buildTeamMetrics`-afritid (CLAUDE.md 7.1).   */
  ok("archive-vidmidid ER `PRESEASON_CAL.measured.brier_recal`, ekki afrit",
     A === PRESEASON_CAL.measured.brier_recal
     && START_BENCHMARKS.archive.rawBrier === PRESEASON_CAL.measured.brier_raw);
  const calSrc = readFileSync(new URL("../src/calibration.js", import.meta.url), "utf8");
  const calCode = calSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok("og TALAN sjalf stendur hvergi i kodanum (adeins innflutt)",
     !/0\.1683|0\.1837/.test(calCode), calCode.match(/0\.16\d+|0\.18\d+/g)?.join(", "));
  ok("og hun er FLUTT INN ur src/stats.js", /import \{[^}]*PRESEASON_CAL[^}]*\} from "\.\/stats\.js"/.test(calCode));
  /* OMAELD TALA FAER EKKI REIT: bekkjar-gildran og "byrjadi sidast" voru
     ALDREI maeld a arkiv-glugganum, svo thau eru null — ekki 0,118.      */
  ok("forleiks-vidmidid ber EKKI omaeldu tolurnar (baseline/benchCapture null)",
     START_BENCHMARKS.archive.baselineBrier === null
     && START_BENCHMARKS.archive.benchCapture === null);
  ok("medan innan-timabils vidmidid ber thaer badar (0,118 og 42-49%)",
     START_BENCHMARKS.live.baselineBrier === 0.118
     && START_BENCHMARKS.live.benchCapture?.length === 2);
}

/* ---------------------------------------------------------------
   4. URSLIT UR LEIKJASKRA
   --------------------------------------------------------------- */
console.log("\n4) Urslit ur leikjaskra");
{
  /* ============================================================
     LEIKUR 4 ER ASTAEDAN FYRIR ThVI AD ThESSI KAFLI SE EKKI HOLL
     ============================================================
     Til 25.8.2026 baru ALLIR tilbunu leikirnir hér adeins `finished`,
     og thess vegna gaf `if (!f.finished)` og
     `if (!(finished || finished_provisional))` NAKVAEMLEGA SOMU
     NIDURSTODU — kaflinn gat ekki greint reglurnar ad. Sannreynt med
     stokkbreytingu: ad skipta rettu reglunni ut fyrir bera `finished`
     felldi ENGA fullyrdingu.
     Leikur 4 er glugginn sem raunverulega er til: FPL skilur
     `finished` eftir FALSE i ~3 daga eftir umferdina medan
     `finished_provisional` er satt og urslitin fullbuin. Hann VERDUR
     ad teljast. Leikur 5 er leikur I GANGI — hlutastada, hvorugt
     flaggid — og hann ma ALDREI teljast.                            */
  const fx = [
    { id: 1, finished: true,  finished_provisional: true,  team_h: 1, team_a: 2, team_h_score: 2, team_a_score: 0 },
    { id: 2, finished: false, finished_provisional: false, team_h: 3, team_a: 4, team_h_score: 1, team_a_score: 1 },
    { id: 3, finished: true,  finished_provisional: true,  team_h: 5, team_a: 6, team_h_score: null, team_a_score: null },
    { id: 4, finished: false, finished_provisional: true,  team_h: 7, team_a: 8, team_h_score: 3, team_a_score: 1 },
    { id: 5, finished: false, finished_provisional: false, team_h: 9, team_a: 10, team_h_score: 0, team_a_score: 0 },
  ];
  const r = resultsFromFixtures(fx);
  ok(`adeins SPILADIR leikir med stodu (${r.length} radir = 2 leikir x 2 lid)`, r.length === 4);
  ok("heimalid: 0 a sig (hreint blad)", r.find(x => x.team === 1)?.conceded === 0);
  ok("utilid: 2 a sig", r.find(x => x.team === 2)?.conceded === 2);
  ok("leikur I GANGI telur EKKI (hlutastada er ekki urslit)", !r.some(x => x.team === 3));
  ok("lokinn leikur AN stodu telur ekki", !r.some(x => x.team === 5));
  /* ThESSAR TVAER ERU PROFSTEINNINN — thaer FALLA vid bert `finished`. */
  ok("PROVISIONAL leikur TELUR (finished:false, provisional:true, full urslit)",
     r.find(x => x.team === 7)?.conceded === 1 && r.find(x => x.team === 8)?.conceded === 3);
  ok("og leikur i gangi med 0-0 telur EKKI (bædi flogg fols)",
     !r.some(x => x.team === 9 || x.team === 10));
}

/* ---------------------------------------------------------------
   5. RAUNGOGN — SEFUR I FORLEIK
   --------------------------------------------------------------- */
console.log("\n5) Raungogn: bokhald + urslit");
{
  const files = existsSync(P) ? readdirSync(P).filter(f => /^gw\d+\.json$/.test(f)) : [];
  const snapshots = files.map(f => JSON.parse(readFileSync(P + f, "utf8")));
  const fixtures = (() => { try {
    const j = JSON.parse(readFileSync(D + "fixtures.json", "utf8"));
    return Array.isArray(j) ? j : (j.fixtures || []);
  } catch { return []; } })();
  const results = resultsFromFixtures(fixtures);
  const scoredGws = new Set(results.map(r => r.fixture)
    .map(id => fixtures.find(f => f.id === id)?.event).filter(x => x != null));
  const ready = snapshots.filter(s => scoredGws.has(s.gw));

  console.log(`     bokhald: ${snapshots.length} umferdir · loknar umferdir: ${scoredGws.size}`
            + ` · kvardanlegar: ${ready.length}`);

  if (!ready.length) {
    /* SEFUR. Dagurinn sem thetta faer gogn er dagurinn sem thad borgar sig —
       sama hegdun og gw1-checklist.mjs. Ekkert fall, engin tilbuin tala.  */
    console.log("     FORLEIKUR/BID: engin umferd hefur BADI bokhald OG urslit.");
    console.log("     Kvordunin sefur; kaflar 1-4 hafa sannreynt vélina a tilbunum gognum.");
    ok("kvordunin sefur an ad falla (ekkert bokhald enn)", true);
    ok("og vélin er samt sannreynd (kaflar 1-4 keyrdu)", pass > 15);
  } else {
    const r1 = ffdrVsCleanSheets({ snapshots: ready, results });
    console.log(`     FFDR: ${r1.matched} lid-leikir · einraeni ${r1.monotone}`);
    for (const t of r1.tiers) console.log(`        threp ${t.tier}: CS ${t.value ?? "—"} (n=${t.n})`);
    ok("FFDR-kvordun skilar threpum", r1.tiers.length > 0);
    /* ============================================================
       EINRAENI ER PROFID UM LEID OG URTAKID BER ThAD — OG FALLID VERDUR AD
       SKYRA SIG SJALFT (21.8.2026)

       `minN = 20` gerir hvert threp null i GW1 (20 lid-leikir a sex threp),
       svo thessi fullyrding SEFUR. A maeldri threpa-dreifingu GW1
       (2/4/6/3/1/4 lid-leikir) na TVO threp n >= 20 eftir ~5 umferdir —
       thad er skjalfest i `clock-states.mjs` kafla C2. Um leid og hun
       VAKNAR getur EIN vidsnuin prosenta a n ~ 20-40 gert `npm test`
       RAUTT i september, og su tala er innan hávaða: vikmörk hlutfalls a
       n = 20 eru ~+-0,11 (SE = sqrt(p(1-p)/n) med p ~ 0,25).

       Fullyrdingin er ekki slokkt — hun a ad falla, thvi thad er thad sem
       madur VILL vita. En textinn verdur ad bera TOLURNAR sem gera manni
       kleift ad greina hávaða fra biluðu likani, annars les fallid eins og
       afturfor. Skjalfesta maelingin er 44,9% / 7,8% a 10 timabilum og
       6.080 lid-leikjum; ein umferd er 20.
       ============================================================ */
    if (r1.monotone !== null) {
      const usable = r1.tiers.filter(t => t.value != null);
      const inv = [];
      for (let i = 1; i < usable.length; i++) {
        const a = usable[i - 1], b = usable[i];
        if (a.value >= b.value) continue;
        const se = Math.sqrt(a.value * (1 - a.value) / a.n + b.value * (1 - b.value) / b.n);
        inv.push(`threp ${a.tier} (${a.value}, n=${a.n}) < threp ${b.tier} (${b.value}, n=${b.n});`
          + ` delta ${(b.value - a.value).toFixed(3)}, SE ${se.toFixed(3)} ->`
          + ` ${Math.abs(b.value - a.value) < 2 * se ? "INNAN 2 SE = VAENTANLEGUR HAVADI"
                                                     : "UTAN 2 SE = SKODA LIKANID"}`);
      }
      ok(`FFDR er einraen i threpum (${r1.monotone})`, r1.monotone === true,
        `VAENTANLEGT SNEMMA A TIMABILI, EKKI SJALFGEFID VILLA: skjalfesta maelingin er`
        + ` 44,9% / 7,8% a 10 timabilum (6.080 lid-leikir); her eru ${r1.matched}.`
        + ` Vidsnuin por: ${inv.join(" | ")}.`
        + " Se delta INNAN 2 SE er thetta urtakshávaði — bidid fleiri umferda."
        + " Se thad UTAN 2 SE, eda haldi snuningurinn afram thegar n vex,"
        + " tha er thad likanid. Sja tests/clock-states.mjs kafla C2.");
    }
  }

  /* PROVENANS I RAUNVERULEGU BOKHALDI — LES SKRARNAR, FULLYRDIR EKKI UM
     KLUKKUNA. `gw1.json` var skrifud 21.8. kl. 05:59, ADUR en `start_window`
     var til, svo hun er `null` ad eilifu og faer thvi ENGA malstiku. Naestu
     radir bera flaggid. Fullyrdingin er thvi um GILDIN, ekki um fjoldann. */
  const wins = snapshots.map(s => `gw${s.gw}:${s.start_window ?? "OThEKKT"}`);
  console.log(`     provenans byrjunar-lika: ${wins.join(" · ") || "(engin rod)"}`);
  ok("hver rod ber `start_window` sem er 'archive', 'live' eda vantar (aldrei annad)",
     snapshots.every(s => s.start_window === undefined || s.start_window === null
                       || s.start_window === "archive" || s.start_window === "live"),
     wins.join(" · "));
  const stamped = snapshots.filter(s => s.start_window === "archive" || s.start_window === "live");
  const unstamped = snapshots.filter(s => !(s.start_window === "archive" || s.start_window === "live"));
  ok(`${stamped.length} rod med provenans, ${unstamped.length} an (thaer fa ENGA malstiku)`,
     unstamped.every(s => startProbCalibration({ snapshots: [s], minutes: new Map(),
                                                 minN: 100 }).documented === null));
}

console.log(`\nKVORDUN: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
