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
  /* Sameiginlegi maelinga-hermirinn. Hann ber t-morkin, tekna-profid,
     hristinginn og stadalvilluna fyrir TVAER maelingaskrár og var
     OVARDADUR — sja hausinn a `arank-world.mjs`. */
  ["arank-world.mjs"],
  /* Vikulegi maelikvardinn — sa EINI thar sem bekkjarmadur getur
     skorad, og thvi sa eini sem getur svarad hvort dypt borgi sig.
     Profud a TILBUNUM gognum thar sem svarid er thekkt fyrirfram. */
  ["weekly-depth.mjs"],
  /* Slembnar deildarlaganir. Oll onnur sofn profa EINA logun; thetta
     spyr hvort reglurnar seu samkvaemar i hvada deild sem er — og ber
     thekju-teljara svo thau geti ekki verid graen af tomri astaedu. */
  ["shapes.mjs"],
  ["sleeper-league.mjs"], ["wiring.mjs"], ["draft-sync.mjs"], ["rulebasis.mjs"],
  /* `entry.mjs` VAR UTAN THESSA LISTA og keyrdi thvi hja engum — fullgildur
     vordur med nium fullyrdingum, skradur hvergi. Hann ver villu sem sast
     BARA i notkun (NFL-hlekkurinn hladi FPL-appinu), svo hann er a
     drattar-leidinni. Skradur 19.8.2026; vordur: `wiring.mjs` kafli 8. */
  ["entry.mjs"],
  ["standings.mjs"], ["waivers.mjs"],
  ["usageblend.mjs"], ["dst.mjs"], ["advice-ledger.mjs"],
  ["render.mjs", true], ["audit.mjs", true], ["layout.mjs", true],
  ["saved-state.mjs", true], ["sleeper.mjs", true], ["dashboard.mjs", true],
  /* `draft-live.mjs` KEYRIR draft — 150 vol i gegnum raunverulega
     `DraftBoard` med Sleeper-endapunkti sem faerist fram. `sleeper.mjs`
     syar EITT augnablik; thetta syair thann tima sem lidur, sem er thar
     sem talnaskekkjur byggjast upp. */
  ["draft-live.mjs", true],
  /* `draft-race.mjs` ber tvennt sem `draft-live.mjs` GETUR EKKI tjad, og
     ekki af staerdarastaedum heldur byggingarlega: (1) hermirinn thar
     svarar SAMSTUNDIS, svo "pollun i flugi thegar notandinn slitur" er
     astand sem fixturan getur ekki skapad — og thad var raunveruleg,
     VARANLEG villa (bord sem var hreinsad fylltist aftur ur svari sem var
     a leidinni); (2) hver kafli thar keyrir a 10-lida PPR-deild med K og
     DEF, svo Sofahetjur (12 lid, half-PPR, HVORKI K NE DST, 14 umferdir)
     — logunin thar sem RETTA svarid er "engin saeti ad fylla" — hafdi
     aldrei verid drifin gegnum bordid i beinni. */
  ["draft-race.mjs", true],
  /* `visual.mjs` raesir ALVORU Chrome og maelir raunverulegt utlit.
     Hann tharf `npm run build` a undan ser og sleppir ser sjalfur ef
     Chrome finnst ekki — en thad er SLEPPT, ekki graent. */
  ["visual.mjs"],
];
/* Utlitsprofid les `dist/nfl`, svo byggingin verdur ad vera fersk. */
if (SUITES.some(([f]) => f === "visual.mjs")) {
  const build = spawnSync("npm", ["run", "build"], { stdio: "ignore" });
  if (build.status !== 0) console.log("(bygging brast — visual.mjs mun sleppa ser)");
}

for (const [f, loader] of SUITES) {
  console.log(`\n${"=".repeat(56)}\n  ${f}\n${"=".repeat(56)}`);
  const args = loader
    ? ["--import", `data:text/javascript,import{register}from"node:module";register("${here}jsx-loader.mjs","file://${here}")`, here + f]
    : [here + f];
  /* ============================================================
     TIMAMORK — FPL-KEYRARINN FEKK ThAU 25.8., ThESSI EKKI (lagad samdaegurs)

     `spawnSync` an `timeout` bidur AD EILIFU. Eitt safn sem hengir —
     opinn `setInterval`, loford sem leysist aldrei, netkall an
     timamarka — frystir ALLA keyrsluna, og i CI thydir thad job sem
     gengur thar til hamarkid rennur ut an thess ad segja HVAR thad
     stoppadi. Naer-eilif bid er ekki bilun sem sest, hun er bilun sem
     ThEGIR.

     Og HENGJA VERDUR AD VERA ADGREIND FRA FOLLNU SAFNI: barn sem fellur
     a fullyrdingu PRENTAR hana, barn sem er DREPID prentar ekkert. Vaeri
     thad ekki adgreint framleiddi thakid draug undir alagi — nakvaemlega
     thad sem `clock-states` gerdi FPL-megin (falskt rautt med tomum
     sviga). 15 minutur eru rifleg: haegasta NFL-safnid er langt undir. */
  const SUITE_TIMEOUT_MS = 15 * 60 * 1000;
  const t0 = Date.now();
  const r = spawnSync("node", args,
    { stdio: ["ignore", "inherit", "pipe"], timeout: SUITE_TIMEOUT_MS });
  const timedOut = r.error?.code === "ETIMEDOUT"
    || (r.status === null && r.signal === "SIGTERM");
  if (timedOut) {
    console.log(`\n  --- TIMAMORK (${f}) ---\n  Safnid svaradi ekki innan `
      + `${SUITE_TIMEOUT_MS / 60000} minutna og var DREPID. Thetta er HENGJA, `
      + `ekki fallin fullyrding. (Keyrdi i ${((Date.now() - t0) / 1000) | 0}s.)`);
  }
  /* STDERR ER TEKID UPP TIL AD ÞAGGA NIDUR DEPRECATION-SUDID FRA
     `module.register()` — en thad var THAGGAD OG SVO FLEYGT. Safn sem
     HRYNUR skrifar stakkinn a stderr, svo keyrslan sagdi "safn fell" og
     BIRTI EKKI EINA ORDI um hvers vegna. Nu er hann prentadur — en
     ADEINS thegar safnid fellur, svo graen keyrsla er afram hrein. */
  if (r.status !== 0) {
    failed++;
    const e = (r.stderr || "").toString().trim();
    if (e) console.log(`--- stderr (${f}) ---\n${e}`);
  }
}
console.log(`\n${"=".repeat(56)}`);
console.log(failed ? `HEILD: ${failed} af ${SUITES.length} profasofnum fell`
                   : `HEILD: oll ${SUITES.length} profasofnin graen`);
process.exit(failed ? 1 : 0);
