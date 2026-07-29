/* Keyrari: öll prófasöfnin, samandregin niðurstaða.
   1. model.test.mjs      — einingapróf á hverri birtri tölu
   1b.stats.test.mjs      — flipana "Umferðin" og "Stigatafla": stat-skráin,
                            stigatöflan, ESPN-skotin (hnitakerfi + woodwork),
                            nafna-pörun og vörður á að mörk stemmi við úrslit
   2. ffdr-backtest.mjs   — FFDR gegn raunverulegum úrslitum 2025/26 (litirnir)
   3. ffdr-walkforward.mjs— FFDR gegn 14 tímabilum með FULLUM inntökum
                            (markaðslína + Elo) og gegn sínum eigin inntökum
   3b.ffdr-player-points.mjs — FFDR gegn RAUNVERULEGUM STIGUM leikmanna
                            (56.278 leikmanna-umferðir); einnig vörður á að
                            spjöld noti ALGILT þrep og að form sé utan FFDR
   4. travel-measure.mjs  — vörður: ferðalengd utan FFDR meðan ómarktæk
   5. smoke.test.mjs      — appið keyrt í jsdom með alvöru gögnum      */
import { spawnSync } from "node:child_process";
const here = new URL(".", import.meta.url).pathname;
let failed = 0;
const SUITES = [["model.test.mjs"], ["stats.test.mjs"], ["ffdr-backtest.mjs"], ["ffdr-walkforward.mjs"], ["ffdr-player-points.mjs"], ["ffdr-old-vs-new.mjs"], ["cs-model.mjs"], ["cs-logistic.mjs"], ["form-blend.mjs"], ["ffdr-cs-versions.mjs"], ["defcon-mid.mjs"], ["exp-points.mjs"], ["rank-model.mjs"], ["mins-trend.mjs"], ["rotation.mjs"], ["travel-measure.mjs"], ["data-resilience.mjs", true], ["react-warnings.mjs", true], ["smoke.test.mjs", true]];
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
