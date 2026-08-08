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
const SUITES = [["model.test.mjs"], ["stats.test.mjs"], ["ffdr-backtest.mjs"], ["ffdr-walkforward.mjs"], ["ffdr-player-points.mjs"], ["ffdr-old-vs-new.mjs"], ["cs-model.mjs"], ["cs-logistic.mjs"], ["form-blend.mjs"], ["ffdr-cs-versions.mjs"], ["defcon-mid.mjs"], ["defcon-shrink.mjs"], ["exp-points.mjs"], ["rank-model.mjs"], ["advisor.mjs"], ["mins-trend.mjs"], ["rotation.mjs"], ["workflow-push.mjs"], ["lineups.mjs"], ["wiring.mjs"], ["gw1-checklist.mjs"], ["consistency.mjs"], ["team-stats.mjs"], ["travel-measure.mjs"], ["mo-candidates.mjs"], ["player-gw-range.mjs"], ["bsd.mjs"], ["bsd-pipeline.mjs"], ["shotmap.mjs", true], ["set-pieces.mjs", true], ["name-match.mjs"], ["data-resilience.mjs", true], ["react-warnings.mjs", true], ["watchlist.mjs", true], ["dc-hit-display.mjs", true], ["playerlist-live-cols.mjs", true], ["leagues.mjs", true], ["compare-visual.mjs", true], ["no-icelandic.mjs", true], ["error-boundary.mjs", true], ["smoke.test.mjs", true]];
for (const [f, loader] of SUITES) {
  console.log(`\n${"=".repeat(56)}\n  ${f}\n${"=".repeat(56)}`);
  const args = loader ? ["--import", `data:text/javascript,import{register}from"node:module";register("${here}jsx-loader.mjs","file://${here}")`, here + f] : [here + f];
  const r = spawnSync("node", args, { stdio: ["ignore", "inherit", "pipe"] });
  if (r.status !== 0) failed++;
}
console.log(`\n${"=".repeat(56)}`);
/* Fjoldinn er REIKNADUR — hardkodud tala ("fimmtan") var ord
   sem staðnadi um leid og safni var bætt vid.                      */
console.log(failed ? `HEILD: ${failed} af ${SUITES.length} prófasöfnum féll`
                   : `HEILD: öll ${SUITES.length} prófasöfnin græn`);
process.exit(failed ? 1 : 0);
