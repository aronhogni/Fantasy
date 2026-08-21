/* ============================================================
   BUYWINDOW.JS — HVENAER A AD KAUPA (OG HVENAER AD SELJA) ThENNAN LEIKMANN

   TVAER ATTIR, EIN LEIT (kafli 1c): `runWindows(series, { dir })`. BUY
   finnur BESTU runurnar (kaup-gluggar), SELL finnur VERSTU (solu-timasetning
   — „hann a erfida leiki framundan, og thetta eru vikurnar"). Onnur er
   spegilmynd hinnar og their DEILA UTFAERSLU; sja 1c um hvers vegna thad er
   regla og ekki smekkur.

   >>> TALAN ER INNAN LEIKMANNS OG GETUR ALDREI RADAD TVEIMUR MONNUM <<<
   Thetta er dyrasta misskilningurinn i sy'ninni og hann kom raunverulega
   upp 20.8.2026: notandinn las Rice sem „verstan" thvi `+0,98` hans stod
   vid `+2,44` hja varnarmonnum — en gluggar Rice voru bestu ThRIR AF NIU
   a sambaerilegu tolunni. TVAER MAELDAR ASTAEDUR:
     1. `MEASURED_POS`-sponnin er OLIK per stodu (DEF 2,19 a moti MID
        1,44), svo somu leikjaheppni prentar STAERRI tolu a varnarmann.
     2. `gain` er SUMMA, svo 5-vikna gluggi slaer 3-vikna glugga
        VELRAENT, ohad thvi hvort leikirnir eru betri.
   Thess vegna ber hver gluggi ThRJAR tolur og thaer eru EKKI jafngildar:
     `gain`  — summa yfir gluggann, INNAN LEIKMANNS. Ekki rada.
     `perGw` — `gain/len`, INNAN LEIKMANNS. Fjarlaegir lengdar-artefaktid
               (2) en EKKI stodu-sponnina (1). Ekki rada thvert a stodur.
     `mean`  — ALGILD vaent stig per umferd ur `MEASURED_POS`. ThESSI ein
               er sambaerileg milli leikmanna.
   Solu-runa ma thvi ALDREI birtast sem „seldu hann fremur en thennan".
   Rodun solu-tillagna er `score` i `src/recommend.js` og hun er MAELD;
   thessi skra RADAR ENGU.

   Spurningin er ONNUR en sú sem FFDR-taflan svarar. Taflan er per LID og
   hefur EINN staða-rofa (DEFENCE / ATTACK), svo hún getur ekki sagt
   „Arsenal-varnarmadur á gott program í GW4-8 en Arsenal-framherji ekki" —
   og thad er nakvaemlega thad sem `DIFF_W` gerir: vogtolurnar per stada eru
   ólíkar, sóknarhópurinn les `marketAttackDiff` (EIGIN vaent mork) medan
   varnarhopurinn les `marketDiff` (mork a sig). Sama lid, sami leikur,
   TVAER OLIKAR TOLUR. Thess vegna er thetta reiknad per LEIKMANN, ur HANS
   stodu, og thess vegna er thad ekki hægt ad lesa ur Teams-flipanum.

   ThAD SEM ER MAELT OG ThAD SEM ER BIRTING — skyr skil:

     MAELT:   `lookupPos(pos,"pts",d)` er MEASURED_POS — raunveruleg
              meðalstig leikmanns i theirri stodu vid thann FFDR
              (3.808 lið-leikir, 7 tímabil). Ekkert her fittar nyja tolu.
     BIRTING: gluggarnir sjalfir. Their eru LEIT i theirri maeldu rod,
              ekki nytt likan — `MIN_WINDOW` og glugga-thakid eru
              UI-afmarkanir eins og verðthakið i rotation.js (CLAUDE.md 3d),
              EKKI hluti likansins. Ekkert i FFDR, `rankScore` ne vaentum
              stigum les thessa skra.

   EININGIN ER SOGD BERUM ORDUM I VIDMOTINU: „vaent stig fyrir MEDAL-mann i
   theirri stodu". Hun er OHAD hans eigin getu, og thad er viljandi:
   `ep_next` er null hja morgum i forleik og hefdi thaggad heilan glugga
   nidur i 0 — tala sem les eins og „engir godir leikir" en thydir „engin
   ep". Getan er thegar a skjanum i toflunni vid hlidina; her er SPURT UM
   LEIKINA. Og skalinn skiptir hvort eð er ekki mali fyrir LOGUN glugganna:
   eigin getа er FASTUR margfaldari yfir allar 38 umferdir og fellur ut
   thegar borið er vid hans eigid medaltal.

   TILTAEKILEIKI (meidsli, bann) ER EKKI I ThESSU — sja `availForKickoff`.
   Tveir kostir voru vegnir: (a) leggja hann inn i rodina eins og
   `expPointsFor` gerir, (b) birta stoduna vid hlidina. (a) var HAFNAD af
   maelanlegri astaedu: madur med `status:"i"` og `chance:0` og ENGA
   dagsetningu i frett fær avail 0 fyrir ALLAR 38 umferdir, svo rodin verdur
   OLL nullur, medaltalid 0 og gluggarnir hverfa — birting sem les eins og
   „hann a engan godan leik" en thydir „hann er meiddur i dag". Meidsli
   lagast; leikjaprogramið gerir thad ekki. Stadan er thvi MERKT a rodinni
   (FPL-status raedur tiltaekileika, kafli 6) og gluggarnir eru um LEIKINA.
   ============================================================ */
import { lookupPos, tierOf, TIER_CUTS, TIER_NEUTRAL } from "./model.js";

/* LAGMARKSLENGD = 3, OG HUN ER EKKI NY TALA. `greenRuns` i model.js notar
   somu 3 fyrir „graen runa", svo tvaer birtingar af sömu hugmynd (runa af
   godum leikjum) hafa somu lengdarkrofu. Vaeri hun 2 her og 3 thar myndi
   FFDR-taflan og thessi sy'n vera OSAMMALA um hvad se runa.
   Rokin fyrir 3 sjalfri eru UI-rok, ekki maeling: skipti kostar 4 stig
   (eda frískiptid sem hefdi mátt nota annars stadar), svo tveggja vikna
   gluggi er sjaldan akvordun. Thad er birting og er sagt sem birting.  */
export const MIN_WINDOW = 3;

/* Thak a fjolda glugga PER LEIKMANN — BIRTINGARThAK, og thad BITUR ALLTAF.
   MAELT a ollum 80 (lid x stada) samsetningum med thakid sett a 4: hver
   einasta samsetning finnur fjora glugga, svo „upp i 3" er i reynd
   „nakvaemlega 3" — thakid bitur alltaf. Rodin 1.-4. gaf tha +0,38 / +0,34 /
   +0,26 / +0,19 stig per umferd, svo fjordi glugginn er ekki NULL — hann er
   bara sa lakasti, og fjorar merktar runur a 38 kossum eru fleiri en augad
   les. (Talan var maeld thegar rodin var eftir ABATA; hun er nu eftir SKORI,
   sem breytir RODINNI a lakasta glugganum en ekki thvi ad hann se lakastur.)
   ThAKID ER ThVI SAGT
   BERUM ORDUM I VIDMOTINU (CLAUDE.md: engin thogul thok) og stikan sjalf
   synir ALLAR 38 umferdirnar — thad er adeins MERKINGIN sem er thakmorkud. */
export const MAX_WINDOWS = 3;

/* SKRIDA (shrinkage) A LENGD — EINA STILLTA TALAN I ThESSARI SKRA, OG HUN
   ER BIRTING, EKKI SPA. Hun akvedur hvad se „gluggi" og ekkert annad les
   hana.

   VANDAMALID SEM HUN LEYSIR, MAELT 19.8.2026 a ollum 80 samsetningum:
   berum abata (`sum`) hamarkad gefur GW3-22 fyrir Arsenal-vorn — tuttugu
   vikur med +0,07 stig/umferd. Thad er satt en thad er ekki gluggi; thad
   er medaltalid sjalft med hávaða utan um sig. Ber thettleiki (`sum/len`)
   fer i hinn ofgann: NIU af hverjum tiu gluggum verda nakvaemlega 3 vikur
   og „godar GW30-38" — sem notandinn nefndi beinlinis — finnst ALDREI.

   FORMID `sum/(len + k)` er SAMA SKRIDA sem DC-hittnin notar
   (`hit_rate_adj`, CLAUDE.md 6l): k er ThYNGD FORGILDIS sem dregur stutta
   glugga ad nulli, svo gluggi verdur ad AFLA ser lengdar sinnar. Hann er
   thvi ekki nyr fasti heldur sama honnun a nyjum stad.

   k = MIN_WINDOW ER TENGING, EKKI VAL: forgildid er „ein lagmarkslengd af
   medal-umferdum". Ad hafa tvaer olikar lengdar-tolur (lagmark 3, skrida 5)
   vaeri tvaer akvardanir thar sem ein er nog.
   NAEMID ER MAELT OG ThAD ER MJUKT — k fra 0 upp i 8:
     medallengd 3,2 -> 3,4 -> 3,5 -> **3,7** -> 3,8 -> 3,9 -> 4,2
     p90-lengd    4 ->   9 ->   5 ->  **5** ->   6 ->   6 ->   7
     hluti timabils i glugga 33% -> 36% -> 37% -> **39%** -> 40% -> 41% -> 45%
   Ekkert throskuldsatvik, engin brun: talan velur bragð, ekki utkomu.
   Vaeri hun 5 eda 2 vaeri sy'nin sú sama i ollu sem mali skiptir.       */
const LEN_SHRINK = MIN_WINDOW;

/* FLEYTITOLU-GOLF, EKKI ThROSKULDUR — OG ThAD FANNST A RAUNGOGNUM
   21.8.2026 vid solu-attina. Krafan „gluggi verdur ad hafa POSITIFA
   summu" var skrifud `sum > 0`, sem er RETT i algebru en ekki i tvistolum.
   Tilfellid er BYGGINGARLEGT og ekki jadartilfelli: se sneidin nakvaemlega
   `minLen` long er EINI moguleikinn oll sneidin, og summan af
   (v - medaltal) yfir ALLA sneidina er NULL med byggingu (medaltalid er
   tekid ur henni). Med fleytitolum verdur hun +1e-16 og slapp i gegn.
   MAELT vid `gwNow = 36` (thrjar umferdir eftir): TVAER af 80 samsetningum
   fengu „erfida runu GW36-38" med `perGw = 0,00` — sy'n sem SEGIR ad runa
   se til og prentar svo tolu sem segir ad hun se engin. Fullyrdingin
   „thessar thrjar eru undir hans medaltali" er auk thess SJALFRI SER
   OSAMKVAEM thegar medaltalid er medaltal theirra thriggja.

   ThETTA ER EKKI STILLT TALA. Raunveruleg summa er af staerdargrádu 0,1-10,
   svo hvert golf milli 1e-12 og 1e-6 gefur NAKVAEMLEGA somu glugga a
   ollum 80 samsetningum i badar attir (maelt); 1e-9 er sama golf sem
   profin i thessu repo nota vid tolulegan samanburd. Vaeri thetta
   throskuldur („nogu god runa") vaeri hun ny omaeld tala — hun er thad
   ekki: hun skilur „positift" fra „nulli sem er 1e-16 fra nulli".      */
const SUM_EPS = 1e-9;

/* ---------- 1. RODIN: EITT GILDI PER UMFERD ----------
   v = SUMMA yfir leiki umferdarinnar af maeldum vaentum stigum stodunnar.

   ThRJU TILVIK OG ThAU ERU EKKI ThAD SAMA:
     tvofold umferd -> tveir leikir leggjast SAMAN (v ~ 2x). Rett: hann
                       spilar tvisvar og skorar tvisvar.
     auð umferd     -> v = 0. RAUNVERULEG NULL: hann fær 0 stig. Hun er
                       thvi TALIN i medaltalinu og gluggi MA spanna hana
                       (madur heldur manninum yfir auda vikuna).
                       >>> ThETTA ER VILJANDI ANNAD EN `greenRuns` <<<
                       thar SLITUR auð umferd runu, thvi runan svarar
                       „a hann godan LEIK i hverri af thessum vikum?".
                       Her er spurningin „er thetta godur tími ad EIGA
                       hann?" og tha er auð vika kostnadur inni i
                       glugganum, ekki endalok hans. Bædi eru rett um
                       sina spurningu; thau MEGA ekki vera samа reglan.
     ovist d        -> v = null. VANTAR er ekki 0 (kafli 8): gluggi ma
                       hvorki spanna hana ne telja hana i medaltalinu.
                       Getur adeins gerst se BAEDI `fixDifficulty` og
                       `fdr` null a sama leik.                          */
export function ffdrSeries({ teamId, pos, fixByTeamGw, fixDifficulty, from, to }) {
  const out = [];
  for (let g = from; g <= to; g++) {
    const fxs = (fixByTeamGw && fixByTeamGw[teamId] && fixByTeamGw[teamId][g]) || [];
    const items = fxs.map(f => {
      const d = (fixDifficulty ? fixDifficulty(teamId, f, pos) : null) ?? f.fdr ?? null;
      return { f, d, pts: d == null ? null : lookupPos(pos, "pts", d) };
    });
    const known = items.filter(x => x.pts != null);
    const unknown = fxs.length > 0 && known.length === 0;
    out.push({
      gw: g,
      items,
      blank: fxs.length === 0,
      unknown,
      double: fxs.length > 1,
      /* ThREPID FYLGIR ThYNGSTA LEIKNUM — sama regla og FFDR-taflan
         (`tierOf(Math.max(...))`). Annars fengi tvofold umferd med einum
         audveldum og einum ohugnanlegum leik graent holf.               */
      d: known.length ? Math.max(...known.map(x => x.d)) : null,
      tier: known.length ? tierOf(Math.max(...known.map(x => x.d))) : null,
      v: unknown ? null : known.reduce((a, x) => a + x.pts, 0),
    });
  }
  return out;
}

/* ---------- 1b. HANS EIGIN KVARDI ----------
   BEIDNIN, ORDRETT (19.8.2026): „Thad tharf ekki ad vera absolute green,
   bara besta timabil leikmannsins — ef eg aetla ad kaupa hann hvort sem er,
   hvad er besta timabilid, hvada gameweeks a eg ad kaupa hann i."

   VILLAN SEM ThAD LYSIR VAR I BIRTINGUNNI, EKKI I GLUGGUNUM. Gluggarnir voru
   fra fyrstu utgafu AFSTAEDIR vid hans eigid medaltal — en LITIRNIR voru
   ALGILDIR (`tierOf(d)`), svo besta runa Sunderland-varnarmanns var rommud i
   graenu og MALAD RAUD. Tvaer fullyrdingar um sama holf, hvor ur sinni
   spurningu. Rammi og litur verda ad svara ThEIRRI SOMU.

   AFSTAEDA VORPUNIN: FAERA HANN, EKKI TEYGJA HANN.
   Ekki sextilar HANS eigin gilda — thа fengi hver leikmadur alla sex litina
   og flatur leikjaskra liti eins og sveiflukennd. Thess i stad er MAELDA
   kvardanum (TIER_CUTS) HLIDRAD svo HANS medaltal lendi i midju hlutlausa
   threpsins: `tierOf(d - (meanD - NEUTRAL_MID))`.
     · Breiddir threpanna eru afram deildar-sextilarnir — MAELD tala,
       ohreyfd. Engin ny tala er buin til her.
     · Flatur leikjaskra er afram nanast ollu GRA (rett: hann hefur engan
       gluggа), sveiflukennd fer i baeda enda. Thad er upplysingin sem
       „sextilar hans eigin gilda" hefdi hent — sama tap sem afstaed threp
       innan LIDS voru maeld og hofnud fyrir (CLAUDE.md 3, ~30% af merkinu).
     · Hlutlausa midjan er LEIDD af TIER_CUTS og TIER_NEUTRAL, ekki skrifud:
       breytist fjoldi threpa eda mork theirra fylgir hun sjalf.

   BADIR KVARDAR ERU I VIDMOTINU MED MERKIMIDA („his own" / „league"), thvi
   their svara sitt hvorri spurningu og hvorugur er rangur:
     his own -> „hvenaer a eg ad kaupa HANN"  (spurningin i thessari sy'n)
     league  -> „er thetta godur leikur i raun" (spurningin i FFDR-toflunni)
   Sjalfgefid er HANS EIGIN, thvi thad er spurningin sem sy'nin er til fyrir. */
export const NEUTRAL_MID = (TIER_CUTS[TIER_NEUTRAL - 1] + TIER_CUTS[TIER_NEUTRAL]) / 2;

/* Medal-thyngd yfir bilid — SOMU `d` sem holfin eru lituð eftir (thyngsti
   leikur umferdarinnar), svo hlidrunin og liturinn geta ekki farid i sundur.

   NAMUNDAD I TVO AUKASTAFI, EINS OG `d` SJALFT (`fixDifficulty` skilar
   `+clamp(...).toFixed(2)`). Tvaer astaedur, og hvorug er snyrting:
     1. TALAN SEM ER BIRT ER TALAN SEM ER NOTUD. Hun sest i tooltip-inu
        („his average difficulty 2.31"); reiknadi appid med fullri
        nakvaemni gaeti holf vid threpa-mork verid a EINUM lit medan talan
        a skjanum segir ANNAN. Ellefu slik holf komu fram i profinu sem
        les litinn AF SKJANUM og endurreiknar hann ur birtu tolunni.
     2. Bædi `d` og medaltal thess eru a SAMA kvarda; ad hafa annad med
        tveimur aukastofum og annad med sextan er ekki meiri nakvaemni,
        heldur tveir kvardar.                                            */
export function meanDifficulty(series) {
  const ds = (series || []).filter(s => s.d != null).map(s => s.d);
  return ds.length ? +(ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(2) : null;
}
export function relTier(d, meanD) {
  if (d == null) return null;
  if (meanD == null) return tierOf(d);
  return tierOf(d - (meanD - NEUTRAL_MID));
}

/* ---------- 1c. ATTIN — EIN UTFAERSLA, TVAER SPURNINGAR ----------
   „Hvenaer a eg ad KAUPA hann" og „hvenaer a eg ad SELJA hann" eru SAMA
   leitin med ANDSTAEDU markmidi: besta runan er hamark a `v - medaltal`,
   versta runan er hamark a `medaltal - v`. Thess vegna er attin BREYTA i
   `runWindows` og EKKI afritud lykkja.

   ThAD ER EKKI STILSPURNING. CLAUDE.md skjalar thrju atvik ur afrituðum
   reglum: `buildTeamMetrics` skrifadi NaN fyrir 17 felog og merkti thad
   `src:"e0"` eins og maelingu · afrit prófsins af `headWidth` var graent
   medan 25 hausar klipptust · `ZONE_RE` stod i tveimur skriftum og BAEDI
   afritin vantadi markteiginn. Tvaer lykkjur sem eiga ad vera spegilmyndir
   reka i sundur thogult — og thegar thaer gera thad er annad hvort svarid
   rangt an thess ad neitt bendi a hvort.

   ALLAR REGLURNAR SPEGLAST SJALFKRAFA, OG ThAD ER PUNKTURINN:
     · Gluggi ma hvorki BYRJA ne ENDA a viku sem gengur gegn attinni
       (`w[a] > 0`). Fyrir KAUP: aldrei byrja/enda undir hans medaltali.
       Fyrir SOLU: aldrei byrja/enda OFAN vid thad. Sama lina, tvaer
       rettar utkomur — ekki tvaer reglur.
     · Einn erfidur leikur inni i KAUP-glugga og einn thaegilegur inni i
       SOLU-runu eru bædi „negatift lidur sem summan tholir". Ekkert
       „leyfa N slokum" er skrifad i hvorugri att.
     · Skridan a lengd (`LEN_SHRINK`) er SU SAMA og af somu astaedu:
       ber summa gefur „GW3-22, tuttugu vikur af havada" i badar attir,
       ber thettleiki gefur nakvaemlega 3 vikur i 9 af 10 tilvikum i
       badar attir. HUN VAR EKKI ENDURSTILLT fyrir solu-attina — thad
       vaeri ny tala an maelingar. Sama tala, sama form, spegluð leit.
   ATH: `BUY`/`SELL` eru MERKI a atttina, EKKI vogtolur. Their eru +1/-1
   thvi thad er formerkid sem speglar `v - medaltal`, ekki studull.

   AUD UMFERD: SAMA TALA, ANDSTAED AFLEIDING — OG ThAD ER RETT.
   `v = 0` er RAUNVERULEG NULL i badar attir (hann fær 0 stig). I
   kaup-attina er 0 undir medaltali og gluggi getur thvi ALDREI byrjad ne
   endad a auðri umferd (hun spannast, sja kafla 1). I solu-attina er
   NAKVAEMLEGA sama tala OFAN vid speglada thraskuldinn, svo auð umferd MA
   vera endi a erfidri runu. Thad er ekki undanthaga sem eg skrifadi
   heldur SAMA linan: auð vika ER hluti af astaedunni til ad selja —
   „seldu fyrir GW6, hann er audur og spilar svo thrja thunga" er sonn
   setning, og runa sem endadi vikunni FYRIR audu vikuna vaeri VERRI
   fullyrding um sama gagnasafn. Enginn nyr fasti, engin ny grein.
   OVIS UMFERD (`v = null`) KLYFUR i BADAR attir: vantar er ekki 0
   (CLAUDE.md 8), og hun er heldur ekki „erfid" — vid vitum ekki.

   TILTAEKILEIKI ER EKKI I SOLU-RUNUNNI HELDUR — og astaedan er STERKARI
   thar en i kaup-attina. Auk thess sem stendur i hausnum (madur med
   `status:"i"`, `chance:0` og enga dagsetningu fengi avail 0 fyrir ALLAR
   38 umferdir, svo rodin yrdi oll null): solu-tillagan sjalf (`score` i
   `src/recommend.js`) BER ThEGAR tiltaekileikann sem margfeldi
   (`availFloor + availSlope * avail`). Vaeri hann lika i rununni vaeri
   hann TVITALINN — og verra, tvitalningin vaeri OSYNILEG thvi baðar tolur
   birtast hlid vid hlid. „Hann er meiddur" er onnur akvordun sem appid
   svarar thegar; her er spurt „hvernig eru LEIKIRNIR framundan".        */
export const BUY = 1;
export const SELL = -1;

/* ---------- 1d. „FRAMUNDAN" — SIA A INNTAKID, EKKI GREIN I LEITINNI ----
   Solu-spurningin er um leiki sem eru EKKI BUNIR: thad er merkingin i
   „leikmenn eiga erfida leiki FRAMUNDAN". Thad er utfaert sem SNEID a
   rodina ADUR en leitin sest a hana — ekki sem `if (gw >= gwNow)` inni i
   `greedyWindows` — af tveimur astaedum:
     1. Leitin verdur ad vera SAMA leitin i badar attir. Skilyrdi inni i
        henni vaeri thridja hegdunin sem enginn profar per att.
     2. VIDMIDID FYLGIR MED SJALFKRAFA. Medaltalid er reiknad UR ThVI SEM
        ER LEITAD I, svo „hans eigid medaltal" thydir hans medaltal yfir
        ThA LEIKI SEM EFTIR ERU. Thad er retta samanburdarmengid:
        umferdir sem eru bunar er ekki haegt ad selja sig undan, svo
        medaltal sem telur thaer med svarar annarri spurningu. Vaeri
        medaltalid tekid yfir GW1-38 en leitad i GW20-38 fengi madur med
        jafn-thunga afgangs-leiki „hard run GW20-38" — nakvaemlega
        „GW3-22"-bilunin sem ber summa var hafnad fyrir (kafli 4).

   `gwNow` ER TALIN MED (`>=`). Hun er naesta FRESTUR, svo hun er enn
   soluhaef; „ahead of now" ma ekki thydja „eftir ad thad er of seint".  */
export function aheadOf(series, gwNow) {
  if (!Array.isArray(series)) return [];
  if (gwNow == null || !Number.isFinite(Number(gwNow))) return series.slice();
  return series.filter(s => s.gw >= Number(gwNow));
}

/* ---------- 2. GLUGGARNIR ----------
   VIDMIDID ER HANS EIGID MEDALTAL yfir bilid sem er a skjanum, ekki
   throskuldur sem eg vel. Thad er ekki smekkur heldur svar vid theirri
   spurningu sem var spurd: „hvenaer er BEST ad kaupa HANN". Fastur
   throskuldur (t.d. „threp <= 1") hefdi gefid heilu Arsenal graent allt
   timabilid og engum gluggum — sama villan og afstaed threp innan lids
   voru maelt og HOFNUD fyrir (kafli 3), bara i hina attina: thar var
   spurningin „hvern a eg ad kaupa" (ALGILT rett), her er hun „hvenaer"
   (AFSTAETT rett). Baðar sy'nir eru til og bera merkimida um hvor er hvor.

   ADFERDIN: greedy hamarks-hlutsumma (Kadane a `v - medaltal`, en yfir
   segment >= MIN_WINDOW). Besti gluggi fyrst, hann er tekinn ut, svo
   besti gluggi ur thvi sem eftir er, thangad til summan er ekki lengur
   positif. TVENNT FAEST FRITT OG BAEDI VAR BEDID UM:
     1. „thott ad thad komi einn erfidur leikur a milli" — erfidur leikur
        INNI i glugga er negatift lidur sem summan tholir se umhverfid nogu
        gott. Ekkert „leyfa N vondum" er skrifad; thad er sjalf summan sem
        akvedur, sem er tha ekki tala sem eg valdi.
     2. Gluggi getur ALDREI byrjad ne endad a umferd UNDIR medaltali — sú
        umferd myndi lækka summuna, svo hamarkid tekur hana ekki med. Thad
        er innbyggt, ekki serregla.
   Ruzzo-Tompa (1999) skilar OLLUM hamarks-hlutrodum i O(n); greedy er
   O(n^2) sem er 38^2 = 1.444 ad'gerðir per (lid,stada) — 80 slikar til,
   svo thad er maelanlega ekkert. Greedy var valid thvi hun er RODUD (besti
   gluggi fyrst) og thvi profanleg gegn beinni uppflettingu i profi.   */
export function runWindows(series, { dir = BUY, minLen = MIN_WINDOW, max = MAX_WINDOWS } = {}) {
  const d = dir < 0 ? SELL : BUY;
  const rows = Array.isArray(series) ? series : [];
  const known = rows.filter(s => s.v != null);
  const span = { from: rows.length ? rows[0].gw : null, to: rows.length ? rows[rows.length - 1].gw : null };
  if (known.length < minLen)
    return { baseline: null, windows: [], n: known.length, dir: d, ...span };
  const baseline = known.reduce((a, s) => a + s.v, 0) / known.length;
  /* EITT VAL, EITT ThAK, EINN MAELIKVARDI — OG ThAD VAR VILLA I FYRSTU
     UTGAFU (fundin 19.8.2026 af slembna profinu, kafli A8 i
     tests/buy-windows.mjs, i 1 af 300 rodum). Hun keyrdi leitina SER a
     hverjum bút milli ovissra umferda og skar svo hopinn nidur i `max`
     eftir ABATA — en leitin sjalf velur eftir SKORI (skridnum thettleika).
     Utkoman: gluggi sem leitin valdi FYRST (haesta skor, GW10-12) var
     skorinn burt fyrir glugga sem hun valdi SIDAR og var VERRI a sinn eigin
     maelikvarda (GW2-7), adeins af thvi ad hann er lengri og ber thvi haerri
     summu. Tveir maelikvardar a somu akvordun gefa akvordun sem hvorugur
     styður.
     NUNA er leitin EIN yfir alla rodina og ovissar umferdir eru merktar
     TEKNAR fyrirfram — thа klyfur `taken`-gríman rodina alveg eins og
     bútarnir gerdu, en thakid og valid nota SOMU tolu.                  */
  const blocked = rows.map(s => s.v == null);
  const windows = greedyWindows(rows, baseline, minLen, max, blocked, d);
  return { baseline, windows, n: known.length, dir: d, ...span };
}

/* KAUP-GLUGGARNIR ERU `runWindows` MED ATTINA BUY — ekkert annad. Fallid
   er haft thvi thad er nafnid sem `BuyWindows.jsx` og profin nota, og thvi
   ad „kaup-gluggi" er hugtak i vidmotinu; thad reiknar EKKERT sjalft.    */
export function buyWindows(series, opts = {}) {
  return runWindows(series, { ...opts, dir: BUY });
}

/* ERFIDU RUNURNAR FRAMUNDAN — SAMA LEITIN, ANDSTAED ATT, SNEIDD ROD.
   Skilar somu byggingu og `buyWindows`; `windows` eru rodud eftir SKORI
   (verst fyrst) thvi thad er valrodin, sama regla og i kaup-attina.     */
export function hardRuns(series, { gwNow = null, minLen = MIN_WINDOW, max = MAX_WINDOWS } = {}) {
  return runWindows(aheadOf(series, gwNow), { dir: SELL, minLen, max });
}

/* ---------- 2b. EIN SPURNING, EITT SVAR: VERSTA RUNAN FRAMUNDAN ----------
   Thetta er fallid sem solu-tillagan les. Thad SVARAR „hvenaer", thad
   RADAR ENGU — sja hausinn a `src/recommend.js`.

   `null` + `why` ER HUSREGLA, EKKI SNYRTING (sbr. `calibration.mjs`:
   „faar maelingar -> ENGIN tala"). „Engin erfid runa" og „vid vitum ekki"
   lesast EINS a skjanum se svarid bert `null`, og thau eru gerolik:
   fyrra er upplysing um leikjaskrana, seinna er upplysing um gognin.
   Thess vegna fylgir `basis` ALLTAF med — hvad var borid saman vid hvad —
   svo vidmotid geti sagt bilid sem medaltalid er tekid yfir. Merkimidi um
   samanburdarmengid er ekki skraut: „undir medaltali" an mengis er
   fullyrding sem ekki er haegt ad sannreyna a skjanum.                   */
export function hardestRun(series, { gwNow = null, minLen = MIN_WINDOW } = {}) {
  const ahead = aheadOf(series, gwNow);
  /* `max: 1` er ekki UI-thak her heldur SKILGREININGIN („hans versta
     runa"). Greedy tekur bestu rununa FYRST, svo `max:1` og `max:3`
     gefa NAKVAEMLEGA sama fyrsta glugga — thetta er odyrari leid ad somu
     tolu, ekki onnur tala. Vordur: kafli C6.                            */
  const r = runWindows(ahead, { dir: SELL, minLen, max: 1 });
  const basis = { baseline: r.baseline == null ? null : +r.baseline.toFixed(2),
                  n: r.n, from: r.from, to: r.to, gwNow, scale: "his own" };
  if (!ahead.length) return { run: null, basis, why: "no gameweeks ahead" };
  if (r.baseline == null)
    return { run: null, basis, why: `fewer than ${minLen} known gameweeks ahead` };
  if (!r.windows.length)
    return { run: null, basis, why: "no stretch below his own average" };
  return { run: r.windows[0], basis, why: null };
}

/* Hamark a `sum/(len + LEN_SHRINK)` yfir segment af lengd >= minLen,
   endurtekid a thvi sem eftir stendur. `taken` merkir umferdir sem
   tilheyra thegar glugga (eda eru ovissar), svo gluggar geta hvorki
   skarast ne spannad tolu sem er ekki til.

   TVEIR ENDA-VARDAR ERU SETTIR BERUM ORDUM (`w[a] > 0 && w[b] > 0`) i stad
   thess ad vera treyst a hamarkid. Hamarkid gefur thа sjalfkrafa i OLLUM
   tilvikum NEMA einu: se glugginn nakvaemlega `minLen` langur er ekki haegt
   ad stytta hann, svo stakur lakur endi gat lifad thar. Sa gluggi hefdi thа
   logið um bædi endamerkin sin — „byrjadu her" a viku sem er undir hans
   eigin medaltali. Skilyrdid gerir invariantid OSKILYRT og thvi profanlegt
   sem invariant, ekki sem tilviljun.                                    */
function greedyWindows(rows, baseline, minLen, max, blocked, dir) {
  const n = rows.length;
  /* ATTIN LIGGUR I ThESSARI EINU LINU OG HVERGI ANNARS STADAR. Allt sem
     kemur a eftir les `w` og veit ekkert um att — thess vegna er speglunin
     ekki afrit sem getur rekid i sundur. `dir` er formerki, ekki vog.    */
  const w = rows.map(r => (r.v == null ? -Infinity : dir * (r.v - baseline)));
  const taken = blocked.slice();
  const out = [];
  for (let k = 0; k < max; k++) {
    let best = null;
    for (let a = 0; a < n; a++) {
      if (taken[a] || !(w[a] > 0)) continue;         // ma ekki BYRJA undir medaltali
      let sum = 0;
      for (let b = a; b < n; b++) {
        if (taken[b]) break;                         // ma ekki spanna tekna umferd
        sum += w[b];
        if (b - a + 1 < minLen) continue;
        if (!(w[b] > 0)) continue;                   // ma ekki ENDA undir medaltali
        if (!(sum > SUM_EPS)) continue;              // sja SUM_EPS: 0 er ekki gluggi
        const score = sum / (b - a + 1 + LEN_SHRINK);
        if (!best || score > best.score) best = { a, b, sum, score };
      }
    }
    if (!best) break;
    for (let i = best.a; i <= best.b; i++) taken[i] = true;
    out.push(makeWindow(rows.slice(best.a, best.b + 1), best.sum, best.score, baseline, dir));
  }
  /* RODIN ER VALRODIN — besti gluggi (haesta skor) fyrst. Hun er EKKI
     endurrodud eftir abata: sja villusoguna i `buyWindows`.             */
  return out;
}

function makeWindow(seg, gain, score, baseline, dir) {
  const len = seg.length;
  const sum = seg.reduce((a, s) => a + s.v, 0);
  return {
    from: seg[0].gw,
    to: seg[len - 1].gw,
    len,
    /* ATTIN FYLGIR GLUGGANUM. Kaup-gluggi og solu-runa hafa NAKVAEMLEGA
       sama snid, svo an thessa svids gaeti vidmotid teiknad annad thar
       sem hitt atti ad vera og ekkert bent a thad. Merkimidinn a skjanum
       er LEIDDUR af thessu, ekki valinn a kallstadnum.                  */
    dir: dir < 0 ? SELL : BUY,
    /* gain  = AUKASTIG a moti medal-runu af somu lengd (hans eigid
                medaltal x len). Thad er talan sem svarar „hvers vegna
                thessi vika og ekki einhver onnur".
       mean  = ALGILD vaent stig per umferd. Hun er sambaerileg MILLI
                leikmanna (MEASURED_POS er algildur kvardi), sem `gain`
                er ekki — tveir menn med sama gain geta legid a sitt
                hvorum enda kvardans. Badar eru birtar.

       FORMERKID ER MERKINGIN, EKKI SNYRTING: `gain` er ALLTAF i attina
       „meira en medalrunan hans", svo KAUP-gluggi ber + og SOLU-runa ber
       −. `best.sum` er hins vegar alltaf positift (leitin krefst
       `sum > 0` a spegluðum kvarda), svo talan er faerd til baka med
       `dir`. Vaeri hun latin vera positif i badar attir bæri solu-runa
       „+3,42" og læsi eins og kaup.                                     */
    gain: +(dir * gain).toFixed(2),
    /* `score` ER MAELIKVARDINN SEM VALDI GLUGGANN (`sum/(len+LEN_SHRINK)`).
       Hann er birtur svo rodun i vidmotinu geti notad SAMA maelikvarda —
       „besti gluggi" ma ekki thyda eitt i leitinni og annad i rodinni.  */
    score: +score.toFixed(4),
    mean: +(sum / len).toFixed(2),
    perGw: +((dir * gain) / len).toFixed(2),
    /* UMFERDIR UNDIR HANS MEDALTALI INNI I GLUGGANUM — SAMA SKILGREINING
       I BADAR ATTIR, OG ThAD ER ASETT. Merkingin a skjanum er ólík
       (i kaup-glugga: „bekkjadu thessa vika"; i solu-runu: „thetta eru
       vikurnar sem gera hana slaka") en TALAN er sú sama: `v < baseline`.
       Svid sem ThYDIR sitt hvad eftir stodu hlutar er nakvaemlega gildran
       i CLAUDE.md 8 (`web_name` sem thydir sitt hvad eftir thvi hvort
       timabilid er byrjad), svo skilgreiningin er ATTLAUS og bædi svidin
       eru ALLTAF til stadar. Vidmotid velur hvort thad birtir.
       Auðar umferdir eru taldar SER: thar er ekkert ad bekkja.          */
    weak: seg.filter(s => !s.blank && s.v < baseline).map(s => s.gw),
    /* SPEGILMYNDIN — umferdir OFAN vid hans medaltal inni i glugganum.
       I solu-runu er thetta „eini leikurinn sem thu vildir halda honum
       fyrir"; i kaup-glugga er thad kjarni gluggans. Bædi svidin eru
       reiknud i badar attir svo hvorugt se att-bundid.                  */
    strong: seg.filter(s => !s.blank && s.v > baseline).map(s => s.gw),
    blanks: seg.filter(s => s.blank).map(s => s.gw),
    doubles: seg.filter(s => s.double).map(s => s.gw),
  };
}

/* Besti gluggi og sa NAESTI i tima fra `gwNow`. Tvaer ólíkar spurningar:
   „hver er bestur" og „hvad er naest". `windows[0]` er sa besti thvi rodin
   ER valrodin (haesta `score` fyrst) — ekki afrit af rodunar-reglu sem
   gaeti rekid i sundur vid leitina.                                     */
export function bestWindow(windows) { return windows && windows.length ? windows[0] : null; }
export function nextWindow(windows, gwNow) {
  if (!windows || !windows.length) return null;
  const ahead = windows.filter(w => w.to >= gwNow).sort((a, z) => a.from - z.from);
  return ahead.length ? ahead[0] : null;
}
