/* Keyrari: oll profasofnin, samandregin nidurstada.  `npm test`
   Safn merkt `true` i SUITES tharf jsx-loaderinn (jsdom-profin).

   HER ER ENGIN UPPTALNING A SOFNUNUM. Hausinn bar adur handskrifada
   skra yfir ~15 af theim (numerud 1, 1b, 2, 3, 3b, 4, 4a...) og hun
   STADNADI: hun taldi upp `i18n.mjs` og `i18n-dom.mjs` longu eftir ad
   thau voru EYDD (7.8.2026), sagdi walk-forward na yfir 14 timabil
   thegar thau eru 8, og sagdi `error-boundary` verja ad `fpl_lang`
   HALDI SER — sem er akkurat OFUGT vid thad sem hun ver i dag.
   Thad er sama villan og hardkodada talan nedst i thessari skra (sja
   athugasemd vid `SUITES.length`): tvitekin skra sem enginn uppfaerir
   verdur ad RONGUM leidarvisi, sem er verri en enginn.

   `SUITES` her ad nedan ER skrain. Hvert safn ber sina eigin lysingu i
   sinum haus, og CLAUDE.md kafli 5 lysir theim sem BERA AKVARDANIR.  */
import { spawnSync } from "node:child_process";
const here = new URL(".", import.meta.url).pathname;
let failed = 0;
const SUITES = [["assert-signature.mjs"], ["model.test.mjs"], ["stats.test.mjs"], ["ffdr-backtest.mjs"], ["ffdr-walkforward.mjs"], ["ffdr-player-points.mjs"], ["ffdr-old-vs-new.mjs"], ["cs-model.mjs"], ["cs-logistic.mjs"], ["form-blend.mjs"], ["ffdr-cs-versions.mjs"], ["defcon-mid.mjs"], ["defcon-shrink.mjs"], ["preseason.mjs"], ["exp-points.mjs"], ["xp-contaminated.mjs"], ["rank-model.mjs"], ["advisor.mjs"], ["recommend.mjs", true], ["captain.mjs"], ["best-team.mjs"], ["pros.mjs"], ["pros-render.mjs", true], ["mins-trend.mjs"], ["rotation.mjs"], ["workflow-push.mjs"], ["lineups.mjs"], ["elo-fetch.mjs"], ["wiring.mjs"], ["wiring-static.mjs"], ["euro-participation.mjs"], ["team-gw.mjs", true], ["gw1-checklist.mjs"], ["clock-states.mjs"], ["consistency.mjs"], ["team-stats.mjs"], ["travel-measure.mjs"], ["pos-vs-opponent.mjs"], ["mo-candidates.mjs"], ["player-gw-range.mjs"], ["bsd.mjs"], ["bsd-pipeline.mjs"], ["fetch-entry.mjs"], ["archive-gw-report.mjs"], ["fdcouk-e0.mjs"], ["shotmap.mjs", true], ["set-pieces.mjs", true], ["name-match.mjs"], ["name-norm.mjs"], ["data-resilience.mjs", true], ["player-cards.mjs", true], ["ffdr-table.mjs", true], ["playerlist-sort.mjs", true], ["playerlist-gw-filter.mjs", true], ["playerlist-narrow.mjs", true], ["playerlist-heat.mjs", true], ["buy-windows.mjs", true], ["gw-report-tiles.mjs", true], ["imminent-board.mjs", true], ["leaderboard-values.mjs", true], ["untrusted-input.mjs", true], ["gw1-persistence.mjs", true], ["extreme-values.mjs", true], ["prediction-ledger.mjs", true], ["calibration.mjs"], ["monkey.mjs", true], ["react-warnings.mjs", true], ["watchlist.mjs", true], ["dc-hit-display.mjs", true], ["player-card-panel.mjs", true], ["playerlist-live-cols.mjs", true], ["leagues.mjs", true], ["compare-visual.mjs", true], ["no-icelandic.mjs", true], ["error-boundary.mjs", true], ["planner-idle.mjs", true], ["planner-pitch.mjs", true], ["initial-squad.mjs", true], ["smoke.test.mjs", true]];
for (const [f, loader] of SUITES) {
  console.log(`\n${"=".repeat(56)}\n  ${f}\n${"=".repeat(56)}`);
  const args = loader ? ["--import", `data:text/javascript,import{register}from"node:module";register("${here}jsx-loader.mjs","file://${here}")`, here + f] : [here + f];
  /* ============================================================
     TIMAMORK A HVERT SAFN (25.8.2026)

     `spawnSync` an `timeout` bidur AD EILIFU. Eitt jsdom-safn sem
     hengir — opinn `setInterval`, loforð sem leysist aldrei, netkall
     sem svarar ekki — frystir thvi ALLA keyrsluna, og i Actions
     thydir thad job sem gengur thar til hamarkid rennur ut, an thess
     ad segja HVAR thad stoppadi. Sama aett og hengjurnar sem `fetchT`
     og `sleeperGet` leystu i pipeline-inni og NFL-appinu: naer-eilif
     bid er ekki bilun sem sest, hun er bilun sem THEGIR.

     15 minutur er rifleg: haegasta safnid i dag er langt undir thvi.
     Thakid a ad grípa HENGJU, ekki haegt safn — of throngt thak vaeri
     flokt sem enginn treystir og yrdi slokkt innan viku.
     ============================================================ */
  const SUITE_TIMEOUT_MS = 15 * 60 * 1000;
  const t0 = Date.now();
  const r = spawnSync("node", args,
    { stdio: ["ignore", "inherit", "pipe"], timeout: SUITE_TIMEOUT_MS });
  /* STDERR ER PRENTAD ThEGAR SVITA FELLUR (19.8.2026). `pipe` kyngdi thvi
     adur, svo svita sem HRYNUR (t.d. `ERR_MODULE_NOT_FOUND` af skra sem
     gleymdist i git) birtist sem TOM blokk med "1 af 65 fell" og engri
     skyringu. Bilunin var raunveruleg og skjolin sogdu ekkert um hana.
     Utkoman er thogul adeins medan allt er graent.                     */
  /* HENGJA VERDUR AD SEGJA AD HUN SE HENGJA. `spawnSync` skilar
     `status: null` og `signal: "SIGTERM"` vid timamork — thad er
     obreytanlega EKKI thad sama og fallid prof, og skilabodin verda
     ad greina thau i sundur. An thess les timamork eins og venjuleg
     bilun og naesti madur leitar ad fullyrdingu sem fell aldrei.    */
  const timedOut = r.error?.code === "ETIMEDOUT"
    || (r.status === null && r.signal === "SIGTERM");
  if (timedOut) {
    failed++;
    console.log(`\n  --- TIMAMORK (${f}) ---\n  Safnid svaradi ekki innan `
      + `${SUITE_TIMEOUT_MS / 60000} minutna og var DREPID. Thetta er HENGJA, `
      + "ekki fallin fullyrding: leitaðu ad opnum `setInterval`, loforði sem "
      + `leysist aldrei eda netkalli an timamarka. (Keyrdi i ${((Date.now() - t0) / 1000) | 0}s.)`);
  } else if (r.status !== 0) {
    failed++;
    const errText = String(r.stderr || "").trim();
    if (errText) console.log(`\n  --- stderr (${f}) ---\n${errText.split("\n").slice(0, 12).join("\n")}`);
  }
}
console.log(`\n${"=".repeat(56)}`);
/* Fjoldinn er REIKNADUR — hardkodud tala ("fimmtan") var ord
   sem staðnadi um leid og safni var bætt vid.                      */
console.log(failed ? `HEILD: ${failed} af ${SUITES.length} prófasöfnum féll`
                   : `HEILD: öll ${SUITES.length} prófasöfnin græn`);
process.exit(failed ? 1 : 0);
