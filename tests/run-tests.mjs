/* Keyrari: öll þrjú prófasöfnin, samandregin niðurstaða.
   1. model.test.mjs    — einingapróf á hverri birtri tölu
   2. ffdr-backtest.mjs — FFDR gegn raunverulegum úrslitum 2025/26
   3. travel-measure.mjs — vörður: ferðalengd utan FFDR meðan ómarktæk
   4. smoke.test.mjs    — appið keyrt í jsdom með alvöru gögnum      */
import { spawnSync } from "node:child_process";
const here = new URL(".", import.meta.url).pathname;
let failed = 0;
for (const [f, loader] of [["model.test.mjs"], ["ffdr-backtest.mjs"], ["travel-measure.mjs"], ["smoke.test.mjs", true]]) {
  console.log(`\n${"=".repeat(56)}\n  ${f}\n${"=".repeat(56)}`);
  const args = loader ? ["--import", `data:text/javascript,import{register}from"node:module";register("${here}jsx-loader.mjs","file://${here}")`, here + f] : [here + f];
  const r = spawnSync("node", args, { stdio: ["ignore", "inherit", "pipe"] });
  if (r.status !== 0) failed++;
}
console.log(`\n${"=".repeat(56)}`);
console.log(failed ? `HEILD: ${failed} prófasafn féll` : "HEILD: öll fjögur prófasöfnin græn");
process.exit(failed ? 1 : 0);
