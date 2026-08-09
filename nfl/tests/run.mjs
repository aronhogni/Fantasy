/* Keyrari fyrir NFL-profin. ADSKILINN fra FPL-keyraranum viljandi:
   `npm test` i thessari mopu keyrir ADEINS NFL-soffnin, svo lota sem
   vinnur i odru appinu geti ekki fellt hitt.

   Safn merkt `true` tharf jsx-loaderinn (jsdom-profin).
   Fjoldinn er REIKNADUR ur `SUITES` — hardkodud tala staðnar. */
import { spawnSync } from "node:child_process";
const here = new URL(".", import.meta.url).pathname;
let failed = 0;
const SUITES = [
  ["model.mjs"], ["accuracy.mjs"], ["learn.mjs"], ["market.mjs"],
  ["advice.mjs"], ["lineup.mjs"], ["names.mjs"], ["pipeline.mjs"],
  ["render.mjs", true],
];
for (const [f, loader] of SUITES) {
  console.log(`\n${"=".repeat(56)}\n  ${f}\n${"=".repeat(56)}`);
  const args = loader
    ? ["--import", `data:text/javascript,import{register}from"node:module";register("${here}jsx-loader.mjs","file://${here}")`, here + f]
    : [here + f];
  const r = spawnSync("node", args, { stdio: ["ignore", "inherit", "pipe"] });
  if (r.status !== 0) failed++;
}
console.log(`\n${"=".repeat(56)}`);
console.log(failed ? `HEILD: ${failed} af ${SUITES.length} profasofnum fell`
                   : `HEILD: oll ${SUITES.length} profasofnin graen`);
process.exit(failed ? 1 : 0);
