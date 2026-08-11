/* ============================================================
   NAFNA-NORMUN — EIN UTFAERSLA, TVEIR NOTENDUR

   HVERS VEGNA THESSI SKRA VARD TIL (11.8.2026): `normName` var
   SKILGREINT TVISVAR og BADAR utgafur voru `export`-adar undir SAMA
   NAFNI:

     src/stats.js  — ESPN-skytta  -> FPL-leikmadur (i appinu, per cook)
     src/bsd.js    — BSD-leikmadur -> FPL-leikmadur (i pipeline)

   Thaer voru EKKI eins. Munurinn var urfellingarmerkid:

     "Matt O'Riley"   stats -> "matt oriley"   bsd -> "matt o riley"
     "O'Riley"        stats -> tokn [oriley]   bsd -> tokn [riley]

   (bsd sendi `'` i BIL og `nameTokens` henti svo eins-stafs takninu "o".)
   Auk thess bar stats-utgafan fjora sjaldgaefa stafi sem bsd vantadi:
   ħ ŋ ĸ ŧ. stats-utgafan var thvi STRANGT YFIRMENGI i translit og
   OLIK i urfellingarmerkinu.

   MAELT ADUR EN NOKKRU VAR BREYTT — thetta er ekki lagfaering:
     · 1.185 einkvaem raunnofn (bsd_players.json + players.json):
       normolararnir skila SITTHVORU a 11 nofnum, 6 leikmenn
       (O'Brien, O'Reilly, O'Nien, O'Riley, O'Shea, Jun'ai Byfield).
     · EN PORUNIN BREYTIST EKKI: bædi hlidin (BSD-nafnid OG FPL-nafnid)
       fara gegnum SAMA normolara, svo munurinn styttist ut. Endurbyggt
       frambod, **393 leikmenn** (allir i `players`-fylkinu), SOMU skorun
       undir badum normolurum: **0 porun af 393 breytist**.

   >>> TOLURNAR HER VORU LAGFAERDAR 11.8.2026, SAMA DAG. <<<
   Fyrsta maelingin sagdi "0 af 284" og "endurbyggingin skilar committudu
   skranni STAFRETT (0 fravik)". BADAR tolur voru rangar og af SOMU rot:
   maeliskriftan valdi fylkid med `Object.values(file).find(Array.isArray)`,
   sem hitti a **`unmatched_names`** (284 STRENGI) i stad `players` (393
   hluti). Strengir hafa hvorki `.team` ne `.bsd_id`, svo frambodid varð
   TOMT og "0 fravik" thydd i raun "engin porun var reiknud".
   Thetta er nakvaemlega tóma fullyrdingin sem CLAUDE.md kafli 5b varar vid
   — i maelingu, ekki i profi, en sama aett: **tala sem er 0 af thvi ad
   ekkert var maelt les eins og tala sem er 0 af thvi ad ekkert breyttist.**
   Rett maeling (393) gefur SOMU NIDURSTODU, svo kodinn stendur ostuddur af
   villunni; en endurbyggingin er 2 fra committudu skranni, ekki 0:
   Bruno Guimarães (NEW) og Saša Lukić (FUL) fa `null` i endurbyggingunni.
   Astaedan er thekkt og skadlaus — endurbyggingin sleppti thridja
   skorunar-forminu (`nameScore(c.short_name, fp.web_name)`), thvi
   `short_name` er ekki i utskriftinni. ThAU TVO ERU EINS UNDIR BADUM
   NORMOLURUM, sem er einmitt thad sem skiptir mali her.

   ThETTA ER ThVI HREINSUN, EKKI VILLULAGFAERING. Astaedan til ad gera
   hana er su sem handoffid nefndi: lagfaering a ODRUM normolara naer
   ALDREI til hins, og thad er tomlaeti sem bidur um villu sidar. Til
   vidbotar er `[riley]` i stad `[oriley]` raunveruleg svidsmynd fyrir
   falska porun (lid med bædi "O'Riley" og "Riley"); su hola er nu farin.

   SKORUNAR-FOLLIN FYLGDU EKKI MED OG ThAD ER ASETT. Thau eru VILJANDI
   olik og maela sitthvad:
     stats.nameScore = fjoldi sameiginlegra takna + 0,5 fyrir sameiginlegt
                       SIDASTA tak (eftirnafn vegur thyngra)
     bsd.nameScore   = HLUTFALL sameiginlegra takna (0..1), thvi bsd.js
                       ber thad vid throskuldinn 0,6
   Ad steypa theim saman vaeri ad endurmaela tvaer poranir sem badar eru
   stadfestar (BSD: mork r 0,9998 · ESPN: fingerfar i stats.test.mjs).

   VORDUR: tests/name-norm.mjs — fellur ef normName er skilgreint aftur i
   stats.js eda bsd.js (ATHUGASEMDIR SKORNAR BURT ADUR EN LEITAD ER, thvi
   thessi athugasemd vitnar sjalf i gamla kodann og myndi annars uppfylla
   sina eigin fullyrdingu).
   ============================================================ */

const str = v => typeof v === "string" ? v : (v == null ? "" : String(v));

/* Urfellingarmerki eru FELLD UT (ekki send i bil): "O'Riley" -> "oriley".
   Hinir stafirnir eru umritadir a sinn ASCII-jafnoka.                  */
const TRANSLIT = {
  "ß":"ss", "ı":"i", "ø":"o", "ł":"l", "đ":"d",
  "ð":"d", "þ":"th", "æ":"ae", "œ":"oe", "ħ":"h",
  "ŋ":"n", "ŧ":"t", "ĸ":"k", "'":"", "’":"",
};
const TRANSLIT_RE = new RegExp("[" + Object.keys(TRANSLIT).join("") + "]", "g");

export const normName = s => str(s)
  .toLowerCase()
  .replace(TRANSLIT_RE, c => TRANSLIT[c] ?? c)
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

/* ---- MINNI A TAKNUN (memo) ----
   `nameScore` er kollud ~25.000 sinnum i hverri "cook"-umferd i
   leikmannalistanum (564 leikmenn x ~25 ESPN-skyttur x tvo nafnaform), en
   OLIKU strengirnir eru adeins ~1.500. `normName` gerir NFD-normalization
   OG fjorar regex-yfirferdir, svo SAMI strengurinn var normalizeradur
   tugthusundum sinnum.

   MAELT a raungognum (564 leikmenn, 206 ESPN-skyttur), median af 7:
     nafna-porun i cook:  60,1 ms  ->  8,6 ms  med minninu
                                   ->  4,7 ms  eftir ad Set-in foru ur
                                                nameScore (12,8x samanlagt)
   Skjalfest vidmid i CLAUDE.md kafla 6i er 8 ms fyrir alla cook-umferdina;
   hun var komin i 66,8 ms thegar dalkar fyrir ESPN-ogn og byrjunar-likur
   komu inn, thvi BADAR nafna-poranirnar keyra per leikmann.

   ThETTA GETUR EKKI BREYTT NIDURSTODU: nameTokens er hreint fall af
   strengnum. Vordur i tests/stats.test.mjs sannreynir ad fingerfar
   porunarinnar (hver leikmadur -> hvada skytta) se ORDRETT eins og an
   minnisins, og ad minnid skili SOMU toknum vid endurtekid kall.        */
const TOKEN_MEMO = new Map();
export const nameTokens = s => {
  const k = str(s);
  const hit = TOKEN_MEMO.get(k);
  if (hit !== undefined) return hit;
  const v = normName(k).split(" ").filter(t => t.length >= 2);
  /* Thak: nofn eru fa, en ef einhver kallar nameScore a NOTANDA-INNSLATT
     (leitarreit) gaeti minnid vaxid ohindrad. 4.000 er ~3x fjoldi nafna. */
  if (TOKEN_MEMO.size > 4000) TOKEN_MEMO.clear();
  TOKEN_MEMO.set(k, v);
  return v;
};
