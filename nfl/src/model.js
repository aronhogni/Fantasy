/* ============================================================
   model.js — HREINT reiknilikan. Ekkert React, engin netkoll.
   Appid OG profin flytja thetta inn — sama koda, sama utkoma.

   FJORAR AKVARDANIR SEM ALLT HVILIR A, OG HVERS VEGNA:

   1. VID BUUM EKKI TIL SPA FRA GRUNNI ÞEGAR MARKADURINN ER TIL.
      Sleeper, ESPN og ~200 serfraedingar spa thegar. Maelingin i
      `accuracy.js` segir okkur AD ENGINN theirra sla hina afgerandi
      og ad **samsteypan er betri en 43% theirra**. Rett vidbrogd vid
      thvi eru ad BLANDA, ekki ad bæta vid 201. skodun og lata hana
      raeda.

   2. VOGIRNAR ERU MAELDAR, EKKI VALDAR. `blendWeights` kemur ur
      `accuracy.json` — bord sem maeldist betur fær meiri vog. Ef
      maelingin vantar er blandan JOFN, og thad er sagt.

   3. VIKULEGA LIKANID BYGGIR A VEDBANKALINUNNI. Vaent stigaskor lids
      = total/2 - spread/2 er sterkasta einstaka inntakid sem til er
      i NFL og thad er OKEYPIS i `schedule.json`. Sama rok og
      markadslidurinn i FPL-appinu: bokmakarinn hefur thegar unnid
      vinnuna.

   4. VBD ER AKVORDUNIN, EKKI STIGIN. 300 stig fra QB og 300 fra RB
      eru EKKI jafnverdmæt thvi 12. besti QB skorar naerri theim 1.
      en 12. besti RB ekki. Allt draft-lagid er thvi reiknad sem
      VIRDI YFIR VARAMANNI, ekki sem hrastig.
   ============================================================ */

/* ============================================================
   1. BLONDUN SPAA
   ============================================================ */

/**
 * Blandar spam ur morgum heimildum i eina tolu.
 * `sources` = [{ key, value, weight }]. Vantandi gildi eru SLEPPT,
 * ekki sett i 0 — heimild sem thegir er ekki heimild sem spair 0.
 * Vogirnar eru endurnormalisadar a thaer sem raunverulega maettu.
 */
export function blend(sources) {
  const live = sources.filter((s) => s.value != null && Number.isFinite(s.value)
                                     && s.weight > 0);
  if (!live.length) return { value: null, used: [], coverage: 0 };
  const wsum = live.reduce((a, s) => a + s.weight, 0);
  const value = live.reduce((a, s) => a + s.value * s.weight, 0) / wsum;
  return {
    value: Math.round(value * 10) / 10,
    used: live.map((s) => s.key),
    coverage: live.length / sources.length,
    /* DREIFING HEIMILDA er birt vid hlidina a blondunni. Hun er
       jafn mikilvaeg og talan: 250 stig thar sem allar heimildir
       segja 250 er ALLT ANNAD mal en 250 thar sem ein segir 180 og
       onnur 320. Sidara tilvikid er thar sem draft vinnast og tapast. */
    spread: live.length > 1
      ? Math.round((Math.max(...live.map((s) => s.value)) -
                    Math.min(...live.map((s) => s.value))) * 10) / 10
      : null,
  };
}

/**
 * Vogir ur maeldri nakvaemni. `accuracy` er `data/accuracy.json`.
 *
 * REGLAN: vog er fall af thvi hversu langt YFIR NULLDREIFINGUNNI
 * heimildin maeldist, ekki af rodinni. Sa sem er nr. 1 og sa sem er
 * nr. 2 geta verid jafngodir; sa sem er undir nullinu er ekki
 * heimild heldur havadi og fær vog 0.
 *
 * Ef `accuracy` vantar (t.d. adur en maelingin hefur keyrt) skilast
 * JOFN vog og `measured: false`. Appid VERDUR ad birta thann mun —
 * jofn vog sem litur ut eins og maeld vog er versta utkoman.
 */
export function blendWeights(accuracy, { topN = 20 } = {}) {
  if (!accuracy || !accuracy.experts || !accuracy.nullDist) {
    return { measured: false, weights: {}, note: "no measurement available — equal weights" };
  }
  const { mean, sd } = accuracy.nullDist;
  const weights = {};
  for (const e of accuracy.experts) {
    if (!e.draft || e.kind === "benchmark") continue;
    const z = sd ? (e.draft.mean - mean) / sd : 0;
    weights[e.id] = z > 0 ? Math.round(z * 100) / 100 : 0;
  }
  const ranked = Object.entries(weights)
    .filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, topN);
  return {
    measured: true,
    weights: Object.fromEntries(ranked),
    nullMean: mean, nullSd: sd,
    note: `${ranked.length} bord yfir nulldreifingu af ${accuracy.experts.length}`,
  };
}

/* ============================================================
   2. VIRDI YFIR VARAMANNI (VBD / VOR)
   ============================================================ */

/**
 * Varamanns-threp per stodu fyrir gefid deildarsnid.
 * Thetta er ekki fasti heldur FALL AF DEILDINNI: i 10-lida deild med
 * 2 RB i byrjunarlidi er varamadurinn RB20; i 14-lida med FLEX er hann
 * RB40. Ad nota fastan lista vaeri ad reikna ranga deild.
 *
 * FLEX-saetum er DREIFT a stodurnar i hlutfalli vid hve oft hver
 * stada endar i flex I RAUN. Maelt i `calibrate.mjs` a ollum vikum
 * 2020-2025: hverjir lenda utan fastra saeta (RB25+, WR37+, TE13+ i
 * 12-lida deild) en komast samt i topp-12 flex theirrar viku.
 *
 * MAELT:  RB 0,330 · WR 0,477 · TE 0,193
 * AGISKAD (fyrsta utgafa): RB 0,35 · WR 0,55 · TE 0,10
 *
 * TE-VILLAN VAR STOR og hun skekkti VBD beint: med 0,10 var
 * varamanns-threpid fyrir TE reiknad of hatt (TE13 i stad TE14+) og
 * allir tight endar fengu of lagt VBD. Thett-endar komast i flex
 * TVOFALT oftar en agiskad var.
 *
 * ============================================================
 * OG NU THAD SEM ATHUGASEMDIN SAGDI EKKI — SVEIPAD 18.8.2026
 * ============================================================
 * "MAELT" hér ad ofan er satt en thad er EKKI nog, og uttekt rakti
 * OLL TOLF staerstu "Value vs market"-kaupin a bordinu til thessarar
 * einu tolu (allt thett-endar i 10-lida PPR-deildinni, +11,2 umferdir
 * a theim fremsta). THRENNT SEM VANTADI ER NU SKRAD:
 *
 *  1. LOGUNIN. `calibrate.mjs` maeldi hana a 12 lidum, RB2/WR3/TE1,
 *     EINU flexi, FULLRI PPR. **HVORUG DEILD NOTANDANS ER SU LOGUN.**
 *     SAMA TALNINGIN a hans lognum gefur TE **0,073** (Patriots) og
 *     **0,083** (Sofahetjur) — minna en HELMING af 0,193 og laegra en
 *     agiskunin 0,10 sem hun kom i stad.
 *  2. VIKMORKIN. Talan hafdi ENGIN. Per timabili hleypur TE-hluturinn
 *     fra 0,130 til 0,352 i theirri sömu logun. Teygnin i sömu skra
 *     ber `se` og `n`; thessi bar hvorugt.
 *  3. UTKOMAN. Tidni er EKKI akvordun. Talan var aldrei maeld sem
 *     "draftar hun betur".
 *
 * NUNA ER HUN THAD, OG NIDURSTADAN ER AD 0,193 STENDUR:
 * `vbdbase-lab --tesweep` (stig, 11 timabil, 81 frumur) og
 * `h2h-lab --tesweep` (SIGRAR, 5 timabil, 21 frumur) sveipa TE fra 0
 * til 0,40 — RB:WR haldid fostu — i BADUM deildum notandans.
 * **0 af 102 frumum standast bar repo-sins** (jakvaett medaltal PLUS
 * ars-klasad OG leikmanna-klasad 95% bil). Hvert einasta
 * leikmanna-klasada bil inniheldur null.
 *
 * HVAD "102" TELUR — SPURT I UTTEKT 19.8.2026 OG SVARAD MED TALNINGU.
 * Uttektin sagdi toluna ranga og bauð 154. Hvorugt: thrir denominatorar
 * eru allir reynverulegir og talan sem er bokud er sú i MIDJUNNI.
 *   176 = allar frumur i maeliskranum        (144 stig + 32 sigrar)
 *   102 = frumur SEM BARINN MAT              ( 81 stig + 21 sigrar)
 *    84 = raunverulegir TE-vs-sent samanburdir (63 + 21)
 * 176-102 er ONNUR ADP-GLUGGINN: labbin PRENTA hann en META hann ekki
 * (`PRIMARY_FIELD[fmt]`, `ADP_SRC[sh.fmt][0]`). 102-84 er 9 `k1-raw`
 * (thvert akkeri, ekki TE-afbrigdi) og 9 `te0.193` (sent gildi vid
 * sjalft sig, null AD BYGGINGU). **Utkoman er 0 a ollum thremur** —
 * endurtalid a vidasta netinu (154) i `tests/model.mjs` kafla 9c, sem
 * er nyr og til thess ad thessi tala se TALIN og ekki adeins skrifud.
 * Thrennt sem stendur samt:
 *
 *   · DYPRA er MAELANLEGA VERRA. te=0,40 gefur -56,1 stig (t -2,52) og
 *     -0,74 sigra, badir ars-CI utiloka null. 0,193 er thvi a RETTRI
 *     hlid einu markanna sem gognin sja.
 *   · GRYNNRA hallar RETT en fellur a leikmanna-klosun: i 10-lida
 *     PPR-deildinni gefur te=0,10 +23,6 stig OG +0,64 sigra (badir
 *     ars-CI utiloka null i sigrum) — en leikm.-CI [-0,71, +1,00].
 *     Sama undirskrift og README 4c: 28 holf -> 0.
 *   · ATTIN HELDUR EKKI MILLI HANS TVEGGJA DEILDA. 12-lida half gefur
 *     te=0 **-0,18** sigra og -11,1 stig. Merki sem skiptir formerki
 *     milli deildanna sem thad a ad raeda er ekki merki.
 *
 * ÞRIDJA ADFERDIN, OHAD: `startable`-threpin i `vbdbase.json` (dypsti
 * madur sem einhver GAT sett i byrjunarlid, maeld ur FYRRI timabilum)
 * segja TE13 thar sem vid notum TE14, og TE15-16 thar sem vid notum
 * TE17 — thad er EITT TIL TVO saeti, ekki sex. Og eins-saetis breyting
 * var THEGAR maeld omaelanleg (README 4b-2).
 *
 * SVO: TOLURNAR HAGGAST EKKI. Rokstudningurinn gerdi thad.
 * Full tafla, badar mælieiningar og akvordunin: README 4l og
 * `data/measure/tesplit.json` + `data/measure/tesplit_h2h.json`.
 * VILTU BREYTA THESSU: `tests/model.mjs` kafli 9b pinnar toluna og
 * fellur; tha verdur ad endurgera `shapes_*.json`, `measure/half.json`,
 * `measure/ecr_duel.json` og `HALF_LAB` i `src/rulebasis.js`.
 */
export const FLEX_SPLIT = { RB: 0.330, WR: 0.477, TE: 0.193 };

/**
 * SUPERFLEX ER EKKI FLEX MED LEIKSTJORNANDA I VIDBOT — thad er annad
 * saeti, og thad var HUNSAD ALVEG.
 *
 * VILLAN: `replacementRanks` dreifdi FLEX-saetum eftir maeldu
 * hlutfalli en tok ekki eftir `SUPERFLEX` ne `league.superflex`. I
 * superflex-deild var QB-threpid thvi reiknad sem QB12 — NAKVAEMLEGA
 * sama tala og i venjulegri deild — thott naerri tvofalt fleiri
 * leikstjornendur byrji. Leikstjornendur voru thar med storlega
 * VANMETNIR i einu af theim sniðum sem appid bydur upp a, og enginn
 * dalkur syndi thad.
 *
 * MAELT EINS OG FLEX_SPLIT, ekki giskad: `superflex-lab.mjs` fyllir
 * fost saeti fyrir hverja viku 2019-2025 (124 vikur, 1.488 saeti) og
 * telur hvada stodu sa hefur sem endar i superflex-saetinu.
 *
 *   QB 86,0%  ·  RB 5,7%  ·  WR 4,7%  ·  TE 3,6%
 *
 * I 12-lida deild faerir thad QB-threpid ur 12 i 22. Ad giska a
 * "QB naestum alltaf" hefdi verid naerri lagi — en omaeld tala sem
 * situr vid hlidina a maeldum tolum og litur eins ut er versta
 * utkoman.
 */
export const SUPERFLEX_SPLIT = { QB: 0.860, RB: 0.057, WR: 0.047, TE: 0.036 };

const REPL_POS = ["QB", "RB", "WR", "TE", "K", "DST"];

/**
 * Hamilton (largest-remainder): deilir `total` HEILUM saetum a stodur i
 * hlutfalli vid `weights`, og summan er NAKVAEMLEGA `total`.
 *
 * HVERS VEGNA THETTA I STAD `Math.round` PER STODU (lagfaert 14.8.2026):
 * `Math.round` namundar hverja stodu SER, svo summan er tilviljun.
 * Maelt yfir 13 logun: saetin summudust ekki i FIMM theirra.
 *
 *   10-lida 2FLEX (deild notandans!)  RB 7 + WR 10 + TE 4 = 21 fyrir 20
 *   14-lida 2FLEX                     RB 9 + WR 13 + TE 5 = 27 fyrir 28
 *    8-lida 1FLEX                     RB 3 + WR  4 + TE 2 =  9 fyrir 8
 *   14-lida 1FLEX                     RB 5 + WR  7 + TE 3 = 15 fyrir 14
 *
 * OG THAD ER EKKI "NAMUNDUNARSUD" HELDUR SKEKKJA MED FORMERKI. Aukasaetid
 * i 10-lida deildinni fell ALLT a WR (0,477 x 20 = 9,54 -> 10), svo
 * varamanns-threp WR var reiknad EINU SAETI OF DJUPT og hver einasti
 * sendingamottakari fekk VBD sem `FLEX_SPLIT` styður ekki.
 *
 * HAMILTON ER EKKI NY MAELING. `FLEX_SPLIT` og `SUPERFLEX_SPLIT` eru
 * MAELDU tolurnar og thaer eru obreyttar; thetta er einungis rett
 * heiltolu-lesning a theim. Kvota-eiginleikinn er thad sem gerir hana
 * retta: hver stada fær `floor(kvoti)` eda `ceil(kvoti)`, aldrei fjaer.
 *
 * Jafntefli a brotum eru brotin a FASTRI STODU-ROD (`REPL_POS`), svo sama
 * deild geti ekki fengid tvaer nidurstodur eftir thvi i hvada rod
 * `weights` var byggt.
 */
function apportion(total, weights) {
  const keys = REPL_POS.filter((k) => weights[k] > 0);
  const out = {};
  for (const k of keys) out[k] = 0;
  const sum = keys.reduce((a, k) => a + weights[k], 0);
  if (!keys.length || !(sum > 0) || !(total > 0)) return out;

  const frac = [];
  let used = 0;
  for (const k of keys) {
    const q = total * (weights[k] / sum);
    out[k] = Math.floor(q);
    used += out[k];
    frac.push([k, q - Math.floor(q), REPL_POS.indexOf(k)]);
  }
  frac.sort((a, b) => (b[1] - a[1]) || (a[2] - b[2]));
  for (let i = 0; i < total - used; i++) out[frac[i % frac.length][0]]++;
  return out;
}

export function replacementRanks(league) {
  const t = league.teams || 12;
  const st = league.starters || { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 };
  const flex = (st.FLEX || 0) * t;
  /* Baðar leidirnar ad segja "thessi deild er superflex" eru virtar:
     saeti i `starters` eda flaggid a deildinni sjalfri. */
  const sflex = ((st.SUPERFLEX || 0) || (league.superflex ? 1 : 0)) * t;

  /* ============================================================
     `league.flexPos` VAR HUNSAD — LAGFAERT 14.8.2026
     ============================================================
     `FLEX_SPLIT` var lesid harðkodad RB/WR/TE, svo deild thar sem
     flexid tekur adeins RB/WR (`REC_FLEX` og aettingjar hennar) yti
     samt TE-threpinu dypra fyrir saeti sem enginn TE getur tekid.
     `sleeper-league.js` LES thennan lista ur `roster_positions` og
     `build.js` thvingar hann — hann var til allan timann og var
     einfaldlega ekki spurdur.

     HLUTFOLLIN ERU ENDURNORMOLUD a thaer stodur sem flexid tekur, og
     THAD ER VAL SEM MAELINGIN STYDUR EKKI TIL FULLS: `FLEX_SPLIT` var
     maelt a RB/WR/TE-flexi, svo sannur RB/WR-split er OMAELDUR.
     Endurnormolun er samt eina svarid sem tapar ekki saetum — RB+WR
     eitt summast i 0,807, svo an hennar yrdu 20 saeti ad 16 og
     varamanns-threpin RANGARI en thau eru i dag. Talan sem er MAELD
     hér er FJOLDI saetanna (flex x lid); skiptingin innan hlutmengis
     er varfaerin nalgun og er sogd vera thad.

     Hvorug deild notandans notar thetta (baðar RB/WR/TE), svo thetta
     er vord ad framtid, ekki lagfaering a lifandi tolu.            */
  /* ============================================================
     SIAN MA ALDREI TAEMA LISTANN — annars hverfa saetin ÞEGJANDI
     ============================================================
     `filter` gat skilad TOMUM lista (`flexPos: ["QB"]`, `["K","DST"]`,
     eda bara lagstafir — `build.js` hleypir hverjum streng i gegn).
     Tomur listi gefur `apportion` engan lykil, svo hann skilar `{}` og
     OLL flex-saetin hurfu an nokkurs merkis: 10-lida 2FLEX faer tha
     QB10/RB20/WR20/TE10 — 0 af 20 flex-saetum uthlutad.

     ÞAD ER NAKVAEMLEGA VILLAN SEM ÞESSI LAGFAERING VAR SKRIFUD GEGN,
     i annarri mynd: saetin summast ekki. Su gamla gaf EINU of mikid,
     thessi gefur TUTTUGU of litid — og hvorug segir neitt.

     Tom sia er thvi meðhondlud eins og enginn listi: fallid aftur i
     `FLEX_SPLIT` i heild. Ad tapa saetunum vaeri VERRA en varfaerna
     nalgunin sem endurnormolunin er sogd vera hér ad ofan.        */
  const pick = (list, split) => {
    if (!Array.isArray(list) || !list.length) return Object.keys(split);
    const kept = list.filter((p) => split[p] > 0);
    return kept.length ? kept : Object.keys(split);
  };
  const flexPos = pick(league.flexPos, FLEX_SPLIT);
  const sflexPos = pick(league.superflexPos, SUPERFLEX_SPLIT);

  const fw = {}; for (const p of flexPos) fw[p] = FLEX_SPLIT[p];
  const sw = {}; for (const p of sflexPos) sw[p] = SUPERFLEX_SPLIT[p];
  const fa = apportion(flex, fw);
  const sa = apportion(sflex, sw);

  const out = {};
  for (const pos of REPL_POS) {
    out[pos] = (st[pos] || 0) * t + (fa[pos] || 0) + (sa[pos] || 0);
  }
  return out;
}

/**
 * VBD fyrir hvern leikmann: spa - spa varamanns a sinni stodu.
 * `players` tharf { pos, proj }. Skilar nyju fylki med `vbd` og
 * `posRank`. Leikmenn an spar fa `vbd: null` — EKKI 0. Null er
 * "vitum ekki", 0 er "nakvaemlega a varamannsgildi".
 */
export function computeVbd(players, league) {
  const repl = replacementRanks(league);
  const byPos = {};
  for (const p of players) {
    if (p.proj == null) continue;
    (byPos[p.pos] = byPos[p.pos] || []).push(p);
  }
  const baseline = {};
  for (const [pos, list] of Object.entries(byPos)) {
    list.sort((a, b) => b.proj - a.proj);
    list.forEach((p, i) => { p.posRank = i + 1; });
    /* ============================================================
       `0` ER RAUNVERULEGT GILDI HER, EKKI "VANTAR"
       ============================================================
       Adur stod `repl[pos] || list.length`. `replacementRanks` skilar
       RETTILEGA `K: 0, DST: 0` fyrir deild sem hefur ENGIN spyrnu- eda
       varnarsaeti — en `||` les 0 sem fjarverandi og fell tha i
       laugar-golfid, svo varamanns-gildid vard VERSTI madur a stodunni
       og hver spyrnumadur maeldist risastor.

       ÞETTA ER REGLAN "NULL ER EKKI NULL" A HVOLFI: thar er haettan ad
       tomt gildi lesist sem 0; hér var hættan ad 0 lesist sem tomt.
       Baðar eru sama villa — gildi og fjarvera lögð ad jofnu.

       MAELT A RAUNVERULEGRI DEILD (Sofahetjur: 12 lid, half-PPR, HVORKI
       K NE DEF — nakvaemlega thad sem `startersFromRoster` gefur ur
       `roster_positions` theirrar deildar), GEGNUM `buildRows` — sem er
       leidin sem NOTANDINN ser, ekki endurutfaersla:
         · besti spyrnumadur fekk VBD 110,0 og sat i saeti **5** a
           bordinu — fyrir ofan Puka Nacua og Ja'Marr Chase
         · **13 af topp 20** og **29 af topp 50** voru K/DST
         · og af thvi ad `build.js` reiknar `tierize` yfir OLL vbd-gildi
           fengu **16 af 555** raunverulegum leikmonnum annad threp

       ÞESSAR FJORAR TOLUR REKA OG ÞAD ER EKKI VILLA. Þaer eru reiknadar
       ur `data/players.json`, sem pipelinan endurskrifar DAGLEGA (ADP og
       Sleeper-spar). Milli 11.8. og 13.8. for threpa-talan ur 30 af 558
       i 16 af 555 an thess ad einni linu af kodanum vaeri breytt.
       Tolurnar eru thvi DAEMI MED DAGSETNINGU (13.8.2026), ekki fastar.

       OG ÞAER ERU HARNESS-HADAR. `vbdbase-lab.mjs` maelir SOMU villu og
       fær saeti **7**, **10** af topp 20 og **28** af topp 50 — thvi thad
       kallar `computeVbd` a ollum 1.038 leikmonnum med spa, medan
       `buildRows` gefur 631 rader. Hvorugt er rangt; thau maela sitthvora
       laug. Talan sem er BOKUD hér er app-leidin, thvi hun er su sem
       notandinn hefdi sed. TALA AN HARNESS ER OSAMANBURDARHAEF — thad
       var einmitt thad sem let tvaer rettar maelingar lita ut eins og
       motsogn i yfirferd.

       ÞESS VEGNA VER PROFID INVARIANTID, EKKI TOLUNA: `tests/model.mjs`
       kafli 8 krefst thess ad hver spyrnumadur beri `null` VBD og ad
       ENGINN K/DST se i topp 20 — hvorugt rekur med gognunum.

       HVERS VEGNA ÞETTA SLAPP: `build.js` siar K/DST ur `aRank` gegnum
       `RANKED_POS`, svo RODIN sjalf var hrein og ekkert bakprof haggadist.
       Talan lak adeins i `vbd`-dalkinn og — gegnum `tierize` — i birt
       threp raunverulegra leikmanna. Fannst i `vbdbase-lab.mjs` og
       endurgerd sjalfstætt adur en hun var lagfaerd.

       STADA AN BYRJUNARSAETIS HEFUR ENGAN VARAMANN, svo VBD er
       OSKILGREINT — ekki 0 og ekki laugar-golfid. `null` er thvi rett
       svar, og thad radast sjalfkrafa sidast og birtist sem "—".      */
    const r = repl[pos] != null ? repl[pos] : list.length;
    if (r === 0) { baseline[pos] = null; continue; }
    /* Varamanns-gildid er MEDALTAL threggja i kringum threpid, ekki
       ein tala. Ein tala gerir allt VBD haad einum leikmanni sem gaeti
       verid meiddur eda utlagi. */
    const around = list.slice(Math.max(0, r - 2), r + 1).map((p) => p.proj);
    baseline[pos] = around.length
      ? around.reduce((a, b) => a + b, 0) / around.length
      : (list.length ? list[list.length - 1].proj : 0);
  }
  return players.map((p) => ({
    ...p,
    vbd: p.proj != null && baseline[p.pos] != null
      ? Math.round((p.proj - baseline[p.pos]) * 10) / 10 : null,
    replacement: baseline[p.pos] != null
      ? Math.round(baseline[p.pos] * 10) / 10 : null,
  }));
}

/* ============================================================
   3. THREP (TIERS)
   ============================================================ */

/**
 * Threpaskipting eftir BILUM i spanni, ekki eftir fostum fjolda.
 *
 * HVERS VEGNA BIL EN EKKI "12 I HVERJU THREPI": threpin eru til ad
 * svara EINNI spurningu — "ef ég bíð fram að næsta vali, fæ ég
 * sambaerilegan mann?" Fastur fjoldi svarar henni ekki; hann skiptir
 * jafnri brekku i tilviljanakennd threp og bytur upp raunveruleg
 * stokk thar sem thau eru.
 *
 * `gapSd` er hversu stort bil telst threpaskil, maelt i stadalfravikum
 * bilanna sjalfra. 1,0 er sjalfgefid og er MAELT — sja
 * `tests/nfl-tiers.mjs` sem krefst thess ad threpin sem koma ut seu
 * hvorki eitt threp med ollum ne threp per mann.
 */
export function tierize(values, { gapSd = 1.0, minTier = 2, maxTiers = 14 } = {}) {
  const xs = values.filter((v) => v != null).slice().sort((a, b) => b - a);
  /* Snemmbuna utgangan verdur ad skila EINU GILDI PER INNTAKI og
     halda null-um. Fyrsta utgafan skiladi `xs.map(...)` — fylki af
     lengd SIADA mengisins — svo threpin foru ur takti vid rodirnar
     um leid og einn leikmadur var an spar. Sá afleikur birtist ekki
     sem villa heldur sem RANGT THREP a rongum manni. */
  if (xs.length < 4) return values.map((v) => (v == null ? null : 1));
  const gaps = [];
  for (let i = 1; i < xs.length; i++) gaps.push(xs[i - 1] - xs[i]);
  const m = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - m) ** 2, 0) / gaps.length);
  const cut = m + gapSd * sd;

  const tiers = new Map();
  let t = 1, sinceBreak = 0, tierTop = xs[0];
  tiers.set(xs[0], 1);
  for (let i = 1; i < xs.length; i++) {
    sinceBreak++;
    const bigGap = gaps[i - 1] >= cut;

    /* ============================================================
       ÞREP MA EKKI SPANNA MEIRA EN BILID SEM SKILGREINIR THREPASKIL
       ============================================================
       ÞETTA VAR RAUNVERULEG VILLA OG HUN SAST A SKJANUM: threp 1 hja
       leikstjornendum bar **22 menn og spannadi 98,8 stig** — fra Josh
       Allen (65,6) nidur i mann a -33,2 — medan threp 1 hja hlaupurum
       spannadi 6,5. Threp segir "thessir eru skiptanlegir". 98,8 stig
       er ekki skiptanleiki; thad er heil brekka kolluð einu nafni.

       ORSOKIN VAR `minTier`, EKKI THROSKULDURINN. Bilid Allen -> Lamar
       er 35,5 og throskuldurinn 13,3, svo skilin ATTU ad koma strax.
       En `sinceBreak >= minTier` bannar skil fyrr en threpid hefur tvo
       menn, svo Lamar dróst inn — og eftir thad er QB-brekkan slett
       alla leid nidur i saeti 22 an nokkurs bils yfir throskuldi.

       REGLAN HER THARF ENGA NYJA TOLU: fjarlaegdin INNAN threps verdur
       ad vera minni en su fjarlaegd sem telst threpaskil. Annars er
       threpid ad fullyrda thad sem thad neitar. `cut` er thegar maeld
       ur bilunum sjalfum, svo hun er notud i badar attir.

       OG HUN GENGUR FRAMAR `minTier`: threp med EINUM manni er rett
       nidurstada thegar hann stendur einn (Allen gerir thad). Ad banna
       thad faldi einmitt thad sem mestu skiptir a QB-bordinu.

       ÞETTA ER BIRTINGARREGLA, EKKI LIKAN. `vbd` er samfelld og rodin,
       radgjofin og hermanirnar lesa hana ALLAR — aldrei threpid. Þetta
       breytir thvi engri maelingu; thad breytir thvi hvad taflan segir. */
    const tooWide = (tierTop - xs[i]) > cut;

    if ((bigGap && sinceBreak >= minTier) || (bigGap && tooWide) || tooWide) {
      if (t < maxTiers) { t++; sinceBreak = 0; tierTop = xs[i]; }
    }
    tiers.set(xs[i], t);
  }
  return values.map((v) => (v == null ? null : tiers.get(v) ?? t));
}

/* ============================================================
   4. VIRDI GEGN MARKADI
   ============================================================ */

/**
 * Hvad er leikmadurinn thess virdi MIDAD VID thad sem hann kostar?
 * `adp` er thar sem markadurinn tekur hann, `rank` er okkar rod.
 * Jakvaett = hann fellur lengra en hann aetti ad gera (kaup).
 *
 * TALAN ER I UMFERDUM, EKKI SAETUM. "18 saetum ódyrari" segir ekkert
 * an deildarstaerdar; "einni og halfri umferd" er thad sem notandinn
 * getur raunverulega notad thegar hann situr og vebur.
 */
export function valueVsMarket(rank, adp, teams = 12) {
  if (rank == null || adp == null) return null;
  return Math.round(((adp - rank) / teams) * 100) / 100;
}

/* ============================================================
   5. VIKULEGA LIKANID
   ============================================================ */

/**
 * Vaent stigaskor lids ur vedbankalinunni.
 * `spread` er UR SJONARHORNI HEIMALIDS og jakvaett = heimalid favorit
 * (nflverse-konvensjon — sja notu i `sources/nflverse.mjs`).
 *
 *   heimalid = total/2 + spread/2
 *   utilid   = total/2 - spread/2
 */
export function impliedTeamTotals(total, spread) {
  if (total == null || spread == null) return { home: null, away: null };
  return {
    home: Math.round((total / 2 + spread / 2) * 10) / 10,
    away: Math.round((total / 2 - spread / 2) * 10) / 10,
  };
}

/**
 * Margfaldari a spa vikunnar ut fra vaentu stigaskori lidsins.
 * Grunnlina er MEDAL-STIGASKOR i NFL (~22,5). Lid sem er vaent til
 * ad skora 30 gefur meiri fantasy-framleidslu en lid sem er vaent
 * til ad skora 15 — en EKKI i rettu hlutfalli, thvi hluti
 * framleidslunnar (magn) er ohaður arangri.
 *
 * Teygnin er MAELD i `scripts/calibrate.mjs` a **25.160
 * leikmanna-vikum 2020-2025** med leave-one-out grunnlinu, fittud
 * gegnum nullpunkt: log(stig/grunnlina) = e * log(vaent/22,5).
 *
 * MAELDAR TOLUR — OG THAER ERU MIKLU LAEGRI EN INNSAEID SEGIR:
 *
 *   stada   e      se     t      n
 *   QB    0,229  0,079   2,9   2.814
 *   RB    0,356  0,069   5,2   6.134
 *   WR    0,069  0,048   1,4   9.165   <- EKKI MARKTAEK
 *   TE    0,211  0,068   3,1   4.231
 *
 * FYRSTA UTGAFA THESSARAR SKRAR HAFDI 0,55 A ALLA OG 0,70 A RB.
 * Thad var AGISKUN sem leit ut eins og maeling. Raunverulega talan
 * er um thridjungur af thvi.
 *
 * WR-LIDURINN ER NULL OG THAD ER NIDURSTADAN, EKKI VANDAMAL.
 * Sendingamottakarar hagnast ekki maelanlega a thvi ad lidid se
 * vaent til ad skora mikid — thvi lid sem er UNDIR sendir meira og
 * baetir thad upp. Ad gefa WR sama margfaldara og RB (eins og fyrsta
 * utgafan gerdi) vaeri ad flytja vorn a alla, sem var staersta
 * einstaka villan i hlidstaeda FPL-verkefninu.
 *
 * VARNAGLI SEM MA EKKI FALLA UT: LOSO a RB gefur 0,278-0,467
 * (bil 0,189) — liðurinn er **ostodugur milli ara**. Hann er thvi
 * hafdur INNI en SMAR, og vidmotid syar hann sem "gameScript" i
 * sundurlidun svo notandinn sjai hve litlu hann raedur.
 *
 * SKEKKJA SEM ER VITUD: vikur med 0 stig eru sleppt (log tekur ekki
 * 0) og thaer eru oftar i leikjum med lagt vaent skor. Maelingin
 * VANMETUR thvi teygnina. Talan er varfaerin, sem er retta attin.
 *
 * ============================================================
 * HVE MIKID ER MARKADSLIDURINN VIRDI? MAELT A 20 ARUM.
 * `scripts/market-lab.mjs`, 71.347 leikmanna-vikur 2006-2025,
 * walk-forward. Lyfting = hlutfall ferskekkju sem lidurinn fjarlaegir
 * UMFRAM thad sem grunnlina leikmannsins sjalfs nær:
 *
 *   stada  besta merki                        lyfting     r
 *   QB     vaent stig eigin lids               0,33%    0,057
 *   RB     sigurlikur ur peningalinu           0,42%    0,065
 *   TE     sigurlikur ur peningalinu           0,08%    0,031
 *   WR     vaent stig eigin lids               0,03%    0,023
 *
 * ÞETTA ER ORSMATT OG THAD MA EKKI FELA. Markadurinn er sterkasta
 * inntakid THEGAR VERID ER AD RADA LEIKMONNUM (sja model-lab: 1667
 * stig gegn 1581 fyrir framleidslu og 1319 fyrir lidsstyrk) — thvi
 * ADP ber hver LEIKMADURINN ER. En thegar thu VEIST thegar hver hann
 * er og spyrd bara um EINA VIKU, tha ber linan innan vid halft
 * prosent af ferskekkjunni.
 *
 * HVERS VEGNA LIDURINN ER SAMT INNI: 0,3-0,4% er raunverulegt og
 * stodugt, og hann kostar ekkert. En vidmotid ma aldrei lata hann
 * lita ut fyrir ad rada rod.
 *
 * HVERS VEGNA VID SKIPTUM EKKI YFIR I SIGURLIKUR FYRIR RB thratt
 * fyrir ad thaer maelist betri (0,42% gegn 0,29%): munurinn er
 * 0,13 prosentustig. Ad endurbyggja likanid, endurkvarda teygnina og
 * baeta vid heimild fyrir mun sem er minni en havadinn i sjalfri
 * maelingunni vaeri flaekja an abata. Talan er skjolud hér svo
 * akvordunin se rekjanleg — ekki fald.
 *
 * MERKID HEFUR EKKI BREYST I 20 AR: 0,038 (2006-2015) gegn 0,042
 * (2016-2025), vikmorkin utiloka ekki null. Betri linur hafa ekki
 * gert markadinn ad sterkara fantasy-merki.
 * ============================================================
 */
export const IMPLIED_BASE = 22.5;
export const ELASTICITY = 0.22;          // sameiginlegt bakfall

export function gameScriptMult(impliedPoints, pos) {
  if (impliedPoints == null) return 1;
  const ratio = impliedPoints / IMPLIED_BASE;
  const e = POS_ELASTICITY[pos] ?? ELASTICITY;
  return clamp(Math.pow(ratio, e), 0.65, 1.45);
}

/**
 * Teygni per stodu — MAELDAR TOLUR (sja toflu ad ofan).
 * K og DST voru EKKI MAELD (thau eru ekki i vikulega fylkinu okkar)
 * og fa thvi sameiginlega bakfallid, ekki eigin tolu. Ad gefa theim
 * serstaka tolu vaeri omaeld tala i reit — CLAUDE.md kafli 8.
 */
export const POS_ELASTICITY = {
  QB: 0.229, RB: 0.356, WR: 0.069, TE: 0.211,
  K: ELASTICITY, DST: ELASTICITY,
};

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * Motstodu-margfaldari ur "vorn gegn stodu" (`defense.json`).
 *
 * VOGIN ER MAELD UTAN URTAKS: vornin er reiknud ur vikum < w og
 * profud a viku w, yfir 2020-2025. Ferillinn:
 *
 *   w      RMSE
 *   0,00  0,77300     <- an lidarins
 *   0,10  0,77200
 *   0,20  0,77200     <- best
 *   0,30  0,77200
 *   0,50  0,77400
 *   1,00  0,78500     <- hraur lidur er VERRI en enginn lidur
 *
 * TVAER NIDURSTODUR OG BADAR SKIPTA MALI:
 *   (a) HRAR "vorn gegn stodu" (w=1) GERIR SPANA VERRI en ad sleppa
 *       henni. Thad er alveg ondvert vid thad sem tolfraedin i
 *       fantasy-umraedu gefur i skyn.
 *   (b) Besta vogin baetir RMSE um **0,13%**. Thad er raunverulegt
 *       en ORSMATT.
 *
 * LIDURINN ER HAFDUR INNI A 0,20 EN VIDMOTID MA ALDREI SELJA HANN
 * SEM MEIRA EN HANN ER. "Erfid vidureign" a ekki ad breyta rod
 * leikmanna nema thegar allt annad er jafnt — og med thessari vog
 * gerir hun thad ekki heldur. Thad er RETT.
 */
export const DEF_WEIGHT = 0.20;

export function defenseMult(adj, leagueMean) {
  if (adj == null || !leagueMean) return 1;
  const raw = adj / leagueMean;
  return clamp(1 + (raw - 1) * DEF_WEIGHT, 0.80, 1.25);
}

/**
 * Full vikuleg spa fyrir einn leikmann.
 *
 * `base`    stig per leik ur timabils-spanni (blandan deilt med leikjum)
 * `implied` vaent stigaskor HANS lids i thessari viku
 * `def`     { adj, leagueMean } vorn andstaedingsins gegn hans stodu
 * `avail`   0..1 tiltaekileiki (meidsli/hvild)
 *
 * AUD VIKA (`bye`) SKILAR 0, EKKI NULL. Thar er munur: null er
 * "vitum ekki", 0 er "hann spilar ekki og thu faerd 0 stig". Sama
 * regla og aud umferd i FPL-appinu.
 */
export function weeklyProjection({ base, pos, implied, def, avail = 1, bye = false }) {
  if (bye) return { pts: 0, bye: true, parts: null };
  if (base == null) return { pts: null, bye: false, parts: null };
  const gs = gameScriptMult(implied, pos);
  const dm = defenseMult(def ? def.adj : null, def ? def.leagueMean : null);
  const pts = base * gs * dm * clamp(avail, 0, 1);
  return {
    pts: Math.round(pts * 10) / 10,
    bye: false,
    /* Thaettirnir eru SKILADIR svo vidmotid geti sagt HVERS VEGNA
       talan er thad sem hun er. Spa an skyringar er ekki nothaef
       til akvardana — thu getur ekki verid osammala henni. */
    parts: { base: Math.round(base * 10) / 10, gameScript: round3(gs),
             defense: round3(dm), avail: round3(avail) },
  };
}

const round3 = (x) => Math.round(x * 1000) / 1000;

/* ============================================================
   6. TILTAEKILEIKI
   ============================================================ */

/**
 * Meidslastada -> tiltaekileiki 0..1.
 * TOLURNAR ERU KVORDUN, EKKI VEFRETT. Their eru grofar og eiga ad
 * vera thad: "Questionable" i NFL er notad um allt fra "spilar
 * orugglega" til "spilar ekki", og engin heimild sem vid hofum
 * greinir thar a milli fyrir GW1. Ad gefa 0,73 i stad 0,75 vaeri
 * fals-nakvaemni.
 *
 * FPL-REGLAN GILDIR HER LIKA: opinber stada raedur. BSD-jafngildid i
 * hinu verkefninu skeikadi i ranga att og var hafnad; hér er thad
 * FPL-stadan sem er `status`/`injury` fra Sleeper, og adrar heimildir
 * mega AUDGA hana en aldrei skipta henni ut.
 */
export const AVAIL = {
  /* Spilar ekki. */
  Out: 0, IR: 0, PUP: 0, Suspended: 0, NA: 0, "Injured Reserve": 0,
  /* Sleeper skammstafar sumt — og OKUNNUGT GILDI FELL I GEGN SEM
     HEILBRIGT. `DNR` (Did Not Report) var ekki i toflunni, svo
     Brandon Aiyuk — draftanlegur mottakari sem var ekki maettur — fekk
     tiltaekileika 1,0 og spain hans var oafslegin. Talan var ekki
     rong af thvi ad hun var illa valin heldur af thvi ad HUN VAR
     ALDREI VALIN. */
  Sus: 0, COV: 0, Inactive: 0, "Non Football Injury": 0,
  "Practice Squad": 0, "Reserve/COVID-19": 0,
  Doubtful: 0.25,
  /* DNR er HOLDOUT, ekki meidsli: hann GETUR spilad en er ekki maettur.
     Grofur flokkur eins og hinir — sja notuna ad ofan um fals-nakvaemni
     — og hann er MERKTUR sem mat, ekki maeling, i `AVAIL_MEASURED`. */
  DNR: 0.5,
  Questionable: 0.75,
  Probable: 0.95,
  Active: 1, null: 1, undefined: 1,
};

/**
 * OKUNNUGT GILDI MA EKKI VERA THOGULT "HEILBRIGDUR".
 *
 * `availability` skilar 1 thegar hun thekkir ekki gildid — sem er
 * retta bakfallid (vid viljum ekki nulla mann vegna nys orðs i
 * ordafori Sleeper) EN thad ma ekki gerast an thess ad nokkur sjai.
 * Thess vegna er thetta safn til: profid ber ordin sem eru RAUNVERU-
 * LEGA i `players.json` vid thennan lista og fellur ef nytt ord
 * baetist vid. Tha er thad akvordun, ekki thogn.
 */
export const AVAIL_KNOWN = Object.keys(AVAIL)
  .filter((k) => k !== "null" && k !== "undefined");

export function availability(status, injury) {
  if (injury && AVAIL[injury] != null) return AVAIL[injury];
  if (status && AVAIL[status] != null) return AVAIL[status];
  return 1;
}
