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
   4a.mo-candidates.mjs   — mo-studullinn gegn frambodendum a 4 timabilum;
                            bootstrap-vordur ad xGI-abatinn se merkjanlegur
   4b.watchlist.mjs       — vaktlisti: stjörnumerking vistast í localStorage,
                            hausstjarnan síar, grænn borði er á FROSNA hólfinu
                            (röðin skrunar) og grænt/fjólublátt eru aðgreind
   4c.compare-visual.mjs  — sjonraeni samanburdurinn: er GRAENA sulan a
                            rettum manni thegar LAEGRA er betra (verd, GC,
                            spjold)? Villandi mynd er verri en engin mynd
   4d.i18n.mjs            — enska thyðingin: hver tx()-lykill hefur þýðingu,
                            stikur tapast ekki, `lang` er i dep-listum og
                            EKKERT islenskt vidmotsbrot er utan tx()
   4f.name-match.mjs      — NAFNA-PORUNIN: skorid bert vid vidmids-utfaerslu a
                            9.464 raunverulegum porum OG tilbunum jadartilfellum
                            (tvitekin tokn), plus tima-thak. Hun var hagraedd
                            60,1 -> 4,7 ms; profid fellur ef thad er afturkallad
   4g.error-boundary.mjs  — VILLUVORN: hviti skjarinn. Profar UTGONGUNA (hreinsa
                            vistad astand) og ad `fpl_lang` haldi ser — sa sem
                            hrundi a ensku ma ekki kastast i islensku ofan a thad
   4e.i18n-dom.mjs        — TUNGUMAL LESID AF SKJANUM: appid teiknad a BADUM
                            malum i jsdom og DOM-arnir bornir saman. Naer thad
                            sem AST-profid getur ekki sed — ASCII-islensku
                            ("fellur") og islenskan but sprautadan INN i
                            thyddan streng. Sex stokkbreytingar profadar.
   5. smoke.test.mjs      — appið keyrt í jsdom með alvöru gögnum      */
import { spawnSync } from "node:child_process";
const here = new URL(".", import.meta.url).pathname;
let failed = 0;
const SUITES = [["model.test.mjs"], ["stats.test.mjs"], ["ffdr-backtest.mjs"], ["ffdr-walkforward.mjs"], ["ffdr-player-points.mjs"], ["ffdr-old-vs-new.mjs"], ["cs-model.mjs"], ["cs-logistic.mjs"], ["form-blend.mjs"], ["ffdr-cs-versions.mjs"], ["defcon-mid.mjs"], ["defcon-shrink.mjs"], ["exp-points.mjs"], ["rank-model.mjs"], ["mins-trend.mjs"], ["rotation.mjs"], ["workflow-push.mjs"], ["lineups.mjs"], ["wiring.mjs"], ["gw1-checklist.mjs"], ["consistency.mjs"], ["travel-measure.mjs"], ["mo-candidates.mjs"], ["player-gw-range.mjs"], ["set-pieces.mjs", true], ["name-match.mjs"], ["data-resilience.mjs", true], ["react-warnings.mjs", true], ["watchlist.mjs", true], ["dc-hit-display.mjs", true], ["playerlist-live-cols.mjs", true], ["leagues.mjs", true], ["compare-visual.mjs", true], ["no-icelandic.mjs", true], ["error-boundary.mjs", true], ["smoke.test.mjs", true]];
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
