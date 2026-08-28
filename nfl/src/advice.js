/* ============================================================
   advice.js — FRA TOLUM AD AKVORDUN. Hrein, engin gogn, ekkert React.

   ALLT HITT I THESSU VERKEFNI SVARAR "hver er bestur". Thessi skra
   svarar hinni spurningunni, sem er su eina sem thu stendur
   raunverulega frammi fyrir: **hvern a ad taka NUNA?**

   THAER ERU EKKI SAMA SPURNINGIN, og munurinn er thad sem gerir
   draft ad draft: besti lausi madurinn getur verid rangt val ef hann
   verdur enn lasus thegar rodin kemur aftur ad ther, medan sa
   naestbesti verdur farinn.

   HUGMYNDIN SEM VAR PROFUD — OG FELLD
   Fyrir hverja stodu ma reikna hversu god hun verdur VID NAESTA VAL
   thitt, ad teknu tilliti til thess hverjir lifa af:

       bradanauðsyn(i) = VBD(i) - E[besta VBD a hans stodu vid naesta val]

   Thad hljomar rett og thad er thad sem hver einasta draft-leidbeining
   segir. **Thad var maelt og thad tapar.** I standard-sniði er lid sem
   velur eftir bradanauðsyn 63,8 stigum UNDIR lidi sem tekur einfaldlega
   besta A-Ranking-manninn, og vinnur 0 af 4 arum. Sja langa notu i
   `recommend` um hvers vegna.

   THVI ER SVARID EINFALT: **taktu besta A-Ranking-manninn sem thu matt.**
   Bradanauðsyn og lifunarlikur eru skiladar sem UPPLYSINGAR — thaer
   segja ther hvort thu getir beðid — en thaer rada ekki.

   LIFUNARLIKUR eru reiknadar ur ADP OG DREIFINGU THESS. ADP eitt
   dugar ekki: leikmadur med ADP 30 og stadalfravik 3 er nanast
   oruggur i 20 saeta bid, en ADP 30 med stadalfravik 20 er thad
   ekki. FantasyFootballCalculator birtir `stdev` og hann er notadur.

   MAELT (`scripts/advice-lab.mjs`): sja `MEASURED` nedst.
   ============================================================ */

/* ---------- lifunarlikur ---------- */

/**
 * Likur a ad leikmadur se ENN LAUS vid val numer `pick`.
 *
 * Likan: draft-stada hans er normaldreifd um ADP med stadalfraviki
 * `sd`. Likur a ad hann se farinn vid val `p` = P(draftstada <= p).
 *
 * HVERS VEGNA NORMALDREIFING OG EKKI EITTHVAD FINNA: FFC birtir
 * `stdev` beint ur raunverulegum droftum, svo dreifingin er MAELD
 * en ekki agiskud. Snidid sjalft (normal) er nalgun, en skekkjan i
 * thvi er miklu minni en skekkjan sem faest af thvi ad hunsa
 * dreifinguna alveg — sem er thad sem hvert einasta bord gerir
 * thegar thad birtir ADP sem eina tolu.
 *
 * VANTI `sd` er notad `SD_K * sqrt(ADP)`.
 *
 * SD_K ER MAELT, EKKI VALID. Fittad a 1.882 leikmanna-arum 2015-2025
 * thar sem FFC birti bædi ADP og stdev:  **k = 1,082**.
 * Fyrsta utgafa thessarar skrar setti 0,55 — HELMING af rettu gildi.
 * Su villa hefdi gert hvern einasta leikmann ad lita ut fyrir ad vera
 * MIKLU oruggari en hann er, og radgjofin hefdi thvi radlagt ad bida
 * eftir monnum sem eru i raun farnir. Villan sast adeins thvi
 * `advice-lab.mjs` fittar tolina i hverri keyrslu og prentar hana
 * vid hlidina a theirri sem kodinn notar.
 */
export const SD_K = 1.08;

export function survivalProb(adp, sd, pick) {
  if (adp == null || pick == null) return null;
  const s = sd != null && sd > 0 ? sd : defaultSd(adp);
  /* Samfelldnileidretting: val `pick` er heiltala, svo mork liggja
     a pick - 0,5. An hennar skeikar talan kerfisbundid um halft val. */
  const z = (pick - 0.5 - adp) / s;
  return clamp(1 - normalCdf(z), 0, 1);
}

export const defaultSd = (adp) => Math.max(2, SD_K * Math.sqrt(Math.max(1, adp)));

/** Abramowitz-Stegun 7.1.26 — nog nakvaemni (|villa| < 7,5e-8). */
export function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t *
    (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/* ---------- vaent besta gildi vid naesta val ---------- */

/**
 * E[haesta VBD a stodu `pos` sem er enn laust vid val `nextPick`].
 *
 * Reiknad nakvaemlega, ekki hermt: ef leikmenn eru radadir eftir VBD
 * tha er vaentigildi haesta lifandi gildis
 *
 *     sum_i  VBD_i * P(i lifir) * prod_{j<i} P(j lifir EKKI)
 *
 * Thetta er rett svo lengi sem lifun er ohad milli leikmanna. Hun er
 * thad ekki alveg — thegar einn hlaupari fer snemma faerast hinir upp
 * — en fylgnin er jakvaed, sem thydir ad talan er VARFAERIN
 * (vanmetur hve mikid tapast vid ad bida). Rett att ad skeika i.
 */
export function expectedBestAt(players, pos, nextPick) {
  const list = players
    .filter((p) => p.pos === pos && p.vbd != null && p.adp != null)
    .sort((a, b) => b.vbd - a.vbd);
  if (!list.length) return { value: 0, n: 0 };

  let acc = 0, none = 1;
  for (const p of list) {
    const s = survivalProb(p.adp, p.adpSd, nextPick);
    if (s == null) continue;
    acc += p.vbd * s * none;
    none *= 1 - s;
    if (none < 1e-4) break;              // afgangurinn skiptir engu
  }
  /* `none` er su likur ad ENGINN theirra lifi. Tha faerdu thann sem
     er neðstur i listanum — ekki 0. Ad setja 0 ofmaeti bradanauðsyn
     stodunnar storlega. */
  const floorV = list[list.length - 1].vbd;
  return { value: acc + none * floorV, n: list.length };
}

/* ---------- rodun hopsins ---------- */

/**
 * Hversu morg saeti eru thangad til thu velur naest, i snakk-drafti.
 * `pick` er heildar-valnumer (1-basad), `teams` fjoldi lida.
 *
 * I snakki er bidin MISLONG eftir thvi hvar i umferdinni thu ert:
 * ur saeti 1 bidur thu 2N-1 val eftir fyrsta valid en adeins 1 eftir
 * annad. Ad nota fastan N vaeri rangt fyrir alla nema thann sem
 * situr nakvaemlega i midjunni.
 */
/**
 * Valnumerid sem SAETI `slot` a i umferd `round`, i snakki.
 *
 * Ojafnar umferdir gefa `(round-1)*teams + slot`; jafnar umferdir eru
 * ANDHVERFAR, svo saeti 1 velur SIDAST. Thetta er nakvaemlega sama
 * vorpun og `picksUntilNext` notar, bara i hina attina — thaer VERDA
 * ad vera samhljoda, annars segdi bordid annad en radgjofin.
 */
/* ============================================================
   DRAFT-GERDIN ER LESIN, EKKI GEFIN SER (24.8.2026)
   ============================================================
   Þessi thrju foll REIKNUDU SNAKK og ekkert annad, medan
   `sleeper-league.js` hleypti `linear` gegnum vidvorunina — hun kviknar
   adeins a gerd sem er HVORKI snake NE linear. Utkoman: i linear-drafti
   fekk notandinn snakk-tolur an thess ad nokkud segdi fra thvi.

   Í LINEAR-DRAFTI ER RODIN EINS I HVERRI UMFERD (saeti 1 velur fyrst,
   alltaf), svo bilid milli minna vala er ALLTAF `teams`. Í snakki
   snyst rodin i sléttum umferdum og bilid skiptist a milli
   `2*(teams-slot)+1` og `2*slot-1`.

   `draftType` VAR ThEGAR TIL — `sleeper-league.js` skrifar hana i
   `imported.draftType` og `App.jsx` hreinsar hana i vistudu astandi.
   Hun var einfaldlega ekki lesin. Þess vegna er thetta ekki ny
   gagnaleid heldur tenging a heimild sem la ónotuð, sama aett og
   `usageblend` (kafli 10 i handover).

   ÓTHEKKT GERD FELLUR I SNAKK og thad er rett: snakk er sjalfgefid hja
   Sleeper og langalgengast. En gerd sem vid getum EKKI heidrad
   (uppbod o.fl.) ber afram vidvorun — sja `leagueFromSleeper`.       */
const LINEAR = "linear";

/** Val nr. `round`/`slot` i drafti af gerd `type`. */
export function ownPickNo(round, teams, slot, type) {
  if (type === LINEAR) return (round - 1) * teams + slot;
  return round % 2 === 1
    ? (round - 1) * teams + slot
    : (round - 1) * teams + (teams - slot + 1);
}

/**
 * Naesta val ÞITT eftir valnumer `cur`. Skilar `null` vanti saeti eda
 * lidafjolda — thad er rett: an saetis er engin snakk-rod og tha ma
 * appid ekki lita einn einasta leikmann.
 *
 * `cur` er valid SEM ER A KLUKKUNNI. Skilyrdid er `> cur`, ekki
 * `>= cur`, og thad er merkingarbaert i BADUM tilfellum:
 *
 *   · er valid THITT (cur === thitt val): tha er allt laust fyrir ther
 *     NUNA, svo spurningin er um valid a EFTIR — "ef eg sleppi honum".
 *   · er valid annars: tha er `> cur` einfaldlega naesta val thitt.
 *
 * Ein regla ber baedi tilfellin, svo thau geta ekki rekid i sundur.
 */
export function nextOwnPick(cur, teams, slot, maxRounds = 40, type) {
  /* `Number(null)` ER 0 OG `Number("")` ER LIKA 0 — svo `Number.isFinite`
     eitt hleypir theim BADUM i gegn sem gildu vali nr. 0. Thad er
     einmitt tilfellid sem tharf ad stoppa: "vid vitum ekki hvar draftid
     er" myndi tha lesast eins og "draftid er ekki byrjad", og bordid
     litadi hvern leikmann eftir vali sem er ekki til. `== null` fyrst,
     tolupróf sidan. */
  if (cur == null || teams == null || slot == null) return null;
  const t = Math.round(Number(teams)), s = Math.round(Number(slot));
  const c = Math.round(Number(cur));
  if (!Number.isFinite(t) || !Number.isFinite(s) || !Number.isFinite(c)) return null;
  if (t < 2 || s < 1 || s > t) return null;
  for (let r = 1; r <= maxRounds; r++) {
    const p = ownPickNo(r, t, s, type);
    if (p > c) return p;
  }
  return null;
}

/**
 * Bid fra `pick` ad naesta vali SAMA SAETIS — thegar `pick` ER thitt val.
 *
 * ============================================================
 * ÞETTA FALL LEIDIR SAETID UT AF VALNUMERINU, OG ÞAD ER FORSENDA
 * ============================================================
 * `slot` hér ad nedan er REIKNAD ur `pick`. Thad er rett nakvaemlega
 * thegar `pick` er MITT val — tha er saetid sem a `pick` mitt saeti.
 * Se `pick` valid SEM ER A KLUKKUNNI (og einhver annar a thad) leidir
 * fallid ut SAETI HINS og skilar bidinni HANS.
 *
 * ÞAÐ VAR RAUNVERULEG VILLA OG HUN VAR A SKJANUM: `NextPick` sendi
 * `taken.size + 1` (klukkuvalid) hingad medan bordid lit sig med
 * `nextOwnPick(cur, teams, sync.slot)` — sem notar RAUNVERULEGA saetid.
 * I 10-lida deild med saeti 7 og 20 vol komin sagdi sami skjar
 * samtimis **"naesta val #27"** (bordid) og **"naesta val 40, bid 19"**
 * (kassinn). Tolurnar voru samhljoda i **6 af 60 volum (10%)** — bara
 * thegar valid a klukkunni var mitt. Sami leikmadur bar 0% i kassanum
 * og 31% i sinni eigin rod.
 *
 * Þess vegna tekur `recommend` nu vid `nextPick` BERUM ORDUM thegar
 * saetid er thekkt, og thessi afleidsla er ADEINS bakleid fyrir
 * handvirkt draft an Sleeper-samstillingar. Vordur:
 * `tests/advice.mjs` kafli 12 — hann ber toluna sem BORDID litar med
 * vid toluna sem KASSINN birtir og fellur ef thaer skilja.
 */
export function picksUntilNext(pick, teams, type) {
  /* LINEAR: rodin er eins i hverri umferd, svo bilid er alltaf `teams`.
     Það er ekki serstakt tilfelli heldur ALGEBRAN sjalf — sama afleidsla
     og hér ad nedan med `slot = idx` i hverri umferd. */
  if (type === LINEAR) return teams;
  const round = Math.ceil(pick / teams);
  const idx = pick - (round - 1) * teams;            // 1..teams
  const slot = round % 2 === 1 ? idx : teams - idx + 1;
  const nextPick = round % 2 === 1
    ? round * teams + (teams - slot + 1)
    : round * teams + slot;
  return nextPick - pick;
}

/* ---------- radgjofin ---------- */

/**
 * Metur hvern lausan leikmann og skilar rodudum lista med ROKUM.
 *
 * `available`  [{ id, name, pos, vbd, adp, adpSd, tier, avail, injury, ... }]
 *
 *              `avail` ER TILTAEKILEIKI OG HANN VAR ALDREI SENDUR HINGAD.
 *              Sja notuna vid `sidelined` nedar — thad var raunveruleg
 *              villa a skjanum, ekki snyrting.
 * `roster`     [{ pos }] — thad sem thu att thegar
 * `pick`       valid sem er A KLUKKUNNI (thad naesta sem verdur tekid)
 * `nextPick`   MITT naesta val, BERUM ORDUM. Se thad gefid er thad notad
 *              og engu giskad; vanti thad er thad leitt ut med
 *              `picksUntilNext` — sem gerir tha rad fyrir ad `pick` se
 *              mitt. Sja hausinn a `picksUntilNext` fyrir villuna sem
 *              thessi breyta er til ad utiloka.
 * `lastPick`   satt thegar VITAD ER ad ekkert val kemur a eftir (saetid
 *              er thekkt og draftid a enga umferd eftir handa ther).
 *
 *              ÞETTA ER ANNAD EN `nextPick: null` OG MUNURINN ER ALLT.
 *              `nextPick: null` thydir "eg veit ekki hvar thu situr" —
 *              tha er rett ad LEIDA bidina ut, og handvirkt draft an
 *              Sleeper byggir a thvi (sja kafla 12 i `tests/advice.mjs`,
 *              sem krefst thess ad rusl-inntak gefi samt gilda bid).
 *              `lastPick` thydir "eg veit ad hun er engin", og tha er
 *              hver lifunartala tilbuningur: leikmadur "lifir" ekki til
 *              vals sem er ekki til. Þa eru `survive` og `expectedNext`
 *              **null** — tomt gildi, ekki 0.
 * `league`     { teams, starters, maxPos }
 *
 * ROKIN ERU HLUTI AF UTKOMUNNI, EKKI SKRAUT. Radgjof sem segir
 * "taktu X" an thess ad segja hvers vegna er ekki haegt ad vera
 * osammala, og notandi sem getur ekki verid osammala haettir ad nota
 * tolurnar og fer ad nota magatilfinninguna.
 */

/* ============================================================
   AFGANGUR I STODU SEM ER ThEGAR MONNUD — MAELT 28.8.2026
   ============================================================
   ÞETTA KEMUR UR MOCK-DRAFTI NOTANDANS 27.8.2026. I umferd 9 og 10 var
   efsti madur bordsins TE (Kelce, thá Andrews) og hann atti ThEGAR
   Loveland OG Kittle i deild sem byrjar EINN TE. Hann tok tvo
   leikstjornendur i stadinn — lika i deild sem byrjar EINN.

   BORDID VAR EKKI AD LJUGA: their VORU haesta VBD sem eftir var. En
   VBD spyr "hvers virdi er hann ofan a varamann DEILDARINNAR", ekki
   "hvers virdi er hann ofan a thann sem thu ert ThEGAR ad fara ad
   byrja". Fyrir mann numer tvo i einssaetis stodu er seinna svarid
   naerri NULLI, og bordid hafdi enga leid til ad segja thad.

   ÞETTA ER **EKKI** BRADANAUÐSYN (positional urgency) SEM VAR MAELD OG
   FELLD (-60,06 stig, 0 af 5 arum). Su regla TEYGIR SIG eftir stodu
   sem er ad thorna upp — hun tekur VERRI mann af ottá. Þessi dregur
   adeins fra fyrir mann sem thu getur EKKI BYRJAT. Tvaer olikar
   spurningar; adeins onnur hafdi verid maeld.

   MAELT (`scripts/arank-need-lab.mjs`, tveir OHADIR heimar):

     11 timabil (FFToday 2015-2025), einvigi i somu deild gegn
     nuverandi bordi:  +64,3 stig, 11/11 ar, t = 3,37,
                       95% [+21,7, +106,8], tekna-prof p = 0,0005
     5 timabil (Sleeper 2021-2025):  +89,4 stig, 5/5 ar, t = 3,24,
                       95% [+12,7, +166,0], p = 0,0313
     walk-forward (valid a fyrri arum): 8/10 og 4/4 ar, +67,5 / +50,4

   K ER EKKI HNIFSEGG: 5, 15, 30 og 60 eru OLL jakvaed og oll utiloka
   null i einviginu (+31,5 / +43,2 / +64,3 / +60,5 i 11-ara heiminum).
   30 er valid ur MIDJU flata bilsins, ekki af toppi thess.

   OG ÞAD ER EKKI MAELITAEKINU AD KENNA. Nálæg skyring var ad
   `startersPoints` telur arstidar-summu byrjunarlids, svo varamadur i
   einssaetis stodu er NAKVAEMLEGA 0 i honum — og tha vaeri "ekki taka
   annan QB" ohjakvaemilega betra i maelingunni an thess ad vera thad i
   raun. SUNDURLIDUN FELLDI ThA SKYRINGU: fradrattur a QB/TE EINUM
   gefur **-6,5 stig (3/11 ar)**, en a RB/WR einum **+68,4 (9/11,
   t = 3,84)**. Ahrifin eru thvi i FLEXHAEFU stodunum, thar sem
   maelikvardinn getur alveg verdlagt varamann.

   HVAD VAR LIKA PROFAD OG FELL: markadsblondun (ADP w=0,5: +36,7 en
   t = 1,43, ekki marktaekt · ECR: -8,4), tiltaekileiki ur `durability`
   (-4,6, t = -0,22) og KVIKT varamanns-threp reiknad ur theim sem eru
   eftir (**-44,9**, verst af ollu). Sja hausinn a skriftunni.       */
export const NEED_K = 30;

/** Hve marga i stodunni getur lidid BYRJAT? Leidd ur deildinni, ekki
 *  skrifud — deild med adra uppstillingu faer adra tolu an thess ad
 *  nokkur muni eftir ad breyta henni hér. FLEX telst med a hverja
 *  flex-haefa stodu: sa sem situr i flexinu ER ad byrja. */
export function startableSlots(league = {}) {
  const st = league.starters || {};
  const flexPos = Array.isArray(league.flexPos) && league.flexPos.length
    ? league.flexPos : ["RB", "WR", "TE"];
  const out = {};
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    /* SUPERFLEX telst med QB — thad ER superflexid. `flexPos` nefnir
       hann ekki, svo hann er talinn hér berum ordum. */
    out[pos] = (st[pos] || 0)
      + (flexPos.includes(pos) ? (st.FLEX || 0) : 0)
      + (pos === "QB" ? (st.SUPERFLEX || 0) : 0);
  }
  return out;
}

/** Fradrattur fyrir mann sem THU getur ekki byrjad — 0 fyrir alla adra. */
export function needPenalty(pos, counts = {}, startable = {}, k = NEED_K) {
  const cap = startable[pos];
  if (cap == null) return 0;
  const surplus = Math.max(0, (counts[pos] || 0) - cap + 1);
  return k * surplus;
}

export function recommend({ available, roster = [], pick, league, nextPick: nextIn,
                            lastPick = false, rosterUnknown = 0, draftType }) {
  const teams = league.teams || 12;
  /* Gefid `nextPick` VINNUR. Hafnad er adeins tolu sem er ekki eftir
     `pick` — hun gaefi negatifa bid og "0% lifun" a alla. */
  const nextPick = lastPick ? null
    : (Number.isFinite(nextIn) && nextIn > pick
        ? Math.round(nextIn)
        : pick + picksUntilNext(pick, teams, draftType));
  const wait = nextPick == null ? null : nextPick - pick;

  /* ============================================================
     TILTAEKILEIKI 0 = SPILAR EKKI. HANN VAR ALDREI SPURDUR.
     ============================================================
     `DraftBoard` sendi hingad `{ id, name, pos, vbd, adp, adpSd, tier,
     proj }` og EKKERT UM MEIDSLI, thott `build.js` reikni `avail`
     (`availability()` i model.js) i somu rod. Utkoman var maeld
     18.8.2026 a raunverulegu bordi dagsins, 10-lida PPR:

       George Kittle · injury PUP · avail 0 · proj 169,3 (17 leikir)
       -> aRank 61, VBD 9,9, Value **+5,4 umferdir** = GRAENT KAUP

     Þrettan leikmenn med `avail: 0` baru aRank. Spa Sleeper er OAFSLEGIN
     — hun er heilt timabil hja manni sem er ekki i lidinu — svo hvert
     einasta tala nidurstreymis (VBD, threp, virdi gegn markadi,
     bradanauðsyn, lifun) er reiknud af tolu sem er ekki til.

     ÞETTA VAR YFIRSJON, EKKI HONNUN: `src/lineup.js` (`optimalLineup`)
     ber `avail` ALLTAF og hefur alltaf gert. Tveir hlutar sama apps
     spurdu sitthvorrar heimildar um sama mann.

     REGLAN ER MAELD OG HUN ER FLOT: FPL-hlutinn thessa repo maeldi ad
     **`Out -> 0` sotti 84% af ollum tiltaekileika-abatanum** og ad
     finni threp (Questionable/Doubtful/aefingastada) baettu engu thar
     sem vikmorkin utiloka null — sama nidurstada og `avail-lab.mjs`
     ber hér (`practice_status`: +0,44 pp, CI inniheldur null). Þvi er
     **NULL-TILFELLID EITT** tekid hart og ENGINN halli fundinn upp:
     0,25 og 0,75 rada engu, nakvaemlega eins og adur.

     NULL ER EKKI NULL: `avail == null` er "vid vitum ekki" og hann
     spilar. Adeins tala sem ER null fellur ut. Þess vegna
     `p.avail != null && Number(p.avail) === 0` og ekki `!p.avail`.

     OG THEIM ER EKKI THAGAD I HEL. Radgjof sem lætur mann horfa er
     radgjof sem ekki er haegt ad vera osammala: notandinn myndi leita
     Kittle i listanum, ekki finna hann, og gruna villu. Þeir eru
     skiladir i `sidelined` MED ASTAEDU, og kassinn birtir hana.
     Vordur: `tests/advice.mjs` kafli 14.                          */
  const playable = [], benched = [];
  for (const p of available || []) {
    if (p && p.avail != null && Number(p.avail) === 0) benched.push(p);
    else playable.push(p);
  }
  /* Þeir mega ekki heldur telja i "hvad ætti stadan ad bjoda naest" —
     leikmadur sem spilar ekki "lifir" ekki til naesta vals i neinum
     nytilegum skilningi, og VBD hans blæs `expectedNext` upp og
     bradanauðsyn hinna nidur. Ein sia, tvo notkunarsvid, svo thau
     geta ekki rekid i sundur. */
  /* ============================================================
     OG EKKI ALLIR — VARAMANNS-LINAN ER SKURDURINN (19.8.2026)
     ============================================================
     Kassinn bar THRETTAN menn og notandinn sa thad a skjanum: Teddy
     Bridgewater (VBD -288) og ellefu adrir kepptu um athygli vid
     THANN EINA sem skiptir mali — Kittle, sem les eins og kaup fimm
     umferdum ofan a sinu saeti. Nafn sem enginn myndi drafta ma ekki
     jafngilda nafni sem madur MISSIR af.

     SKURDURINN ER `vbd > 0`, ekki topp-N, og hann er MAELDUR — ekki
     valinn. VBD er virdi ofan a varamann, svo `vbd <= 0` thydir
     bokstaflega "ekki thess virdi ad taka saeti". Talan sem
     rettlaetir hann er BILID: a raunbordinu i dag, i thremur
     deildarlogunum, eru 13 menn med `avail: 0` og skurdurinn lendir i
     gapi sem er MINNST 58 stig i hverri einni:

       10-lida PPR  1 yfir (Kittle +6,9) · naesti er -0,2, tha -121,8
       12-lida PPR  2 yfir (Kittle +9,9 · Pierce +7,1) · naesti -99,5
       14-lida std  2 yfir (Pierce +21,1 · Kittle +19,1) · naesti -58,8

     Hann klippir thvi ekki i midjum klasa. OG HANN ER DEILDARHAADUR
     MED RETTU: Pierce er -0,2 i 10-lida deild en +21,1 i 14-lida —
     varamanns-linan ER logun deildarinnar, svo sami madur getur verid
     undir henni i einni og yfir i annarri.

     ENGINN HVERFUR ThEGJANDI — ThAD VAR ASETT OG ThAD STENDUR. Þeir
     sem eru klipptir eru TALDIR (`sidelinedBelowRepl`) og versta
     talan er nefnd (`sidelinedWorst`), svo kassinn getur sagt bædi
     hve margir og HVERS VEGNA. Þeir eru auk thess afram i bordinu
     sjalfu med sinu rauda merki; thad er thangad sem talan visar.

     NULL ER EKKI NULL: `sidelinedWorst` er `null` thegar engum var
     sleppt, ekki 0 — 0 er raunveruleg VBD-tala og vaeri ólæsileg hér. */
  const benchedRanked = benched
    .filter((p) => p.vbd != null)
    .sort((a, b) => b.vbd - a.vbd);
  const worthSeeing = benchedRanked.filter((p) => p.vbd > 0);
  const clipped = benchedRanked.length - worthSeeing.length;
  const sidelined = worthSeeing.map((p) => ({
    id: p.id, name: p.name, pos: p.pos, vbd: round1(p.vbd),
    injury: p.injury ?? null, avail: 0,
    /* Astaedan er hluti af utkomunni, ekki skraut — sja hausinn. */
    why: `${p.injury || "unavailable"} — his projection is a full 17-game`
       + ` number and is not discounted for this`,
  }));
  const sidelinedBelowRepl = clipped;
  const sidelinedWorst = clipped > 0
    ? round1(benchedRanked[benchedRanked.length - 1].vbd) : null;

  /* Hvad a hver stada ad vera vid naesta val? Se ekkert val eftir er
     svarid ENGIN TALA — hlutinn stendur samt (hann greinir stodur sem
     rodin naer til fra theim sem hun naer ekki til, sja `mustFill`). */
  const expNext = {};
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    expNext[pos] = nextPick == null
      ? { value: null, n: 0 }
      : expectedBestAt(playable, pos, nextPick);
  }

  const counts = {};
  for (const r of roster) counts[r.pos] = (counts[r.pos] || 0) + 1;

  const out = [];
  for (const p of playable) {
    if (p.vbd == null || !expNext[p.pos]) continue;
    const max = (league.maxPos || {})[p.pos];
    if (max != null && (counts[p.pos] || 0) >= max) continue;

    const eNext = expNext[p.pos].value;
    const urgency = eNext == null ? null : p.vbd - eNext;
    const survive = nextPick == null ? null : survivalProb(p.adp, p.adpSd, nextPick);

    out.push({
      ...p,
      urgency: round1(urgency),
      expectedNext: round1(eNext),
      survive: survive == null ? null : Math.round(survive * 100) / 100,
      /* HVERS VEGNA HANN, i einni setningu sem er RETT. */
      reasons: reasonsFor(p, { urgency, eNext, survive, wait, counts, league }),
    });
  }

  /* ============================================================
     RODAD EFTIR VBD (A-RANKING), EKKI EFTIR BRADANAUÐSYN.

     ÞETTA ER NIDURSTADA MAELINGAR, EKKI SMEKKUR.
     `scripts/advice-lab.mjs` hermdi bædi: lid sem valdi eftir
     haestu bradanauðsyn gegn lidi sem valdi einfaldlega besta
     A-Ranking-manninn, 12-lida snakk, oll saeti, 2022-2025.

       PPR       radgjof 1998,9  ·  A-Ranking 1985,3   (+13,6, INNAN vikmarka)
       standard  radgjof 1501,5  ·  A-Ranking 1565,3   (-63,8, MARKTAEKT VERRI,
                                                        vinnur 0 af 4 arum)

     HVERS VEGNA HUN TAPAR: bradanauðsyn maelir STADBUNDINN bratta —
     hversu mikid stadan versnar fram ad naesta vali — og verdlaunar
     thvi mann med litid algilt virdi ef bratti er skarpur fyrir aftan
     hann. I hermuninni 2024 (standard) tok hun Tyreek Hill i vali 43
     framyfir Christian McCaffrey sem bar VBD 82. Su skipti kostar 40+
     stig sem faest ALDREI aftur, i skiptum fyrir bratta sem jafnast
     ut sidar hvort sem er.

     I PPR eru stodurnar naerri jafngildar og villan kostar litid; i
     standard, thar sem hlauparar bera virdid, kostar hun timabilid.
     Ein tala sem virkar i odru sniði en ekki hinu er ekki likan
     heldur tilviljun.

     THVI ER `urgency` SKILAD SEM UPPLYSING EN RAEDUR EKKI ROD.
     Lifunarlikur eru gagnlegar — thaer segja hvort thu getir beðid —
     en akvordunin er afram: taktu besta A-Ranking-manninn sem thu matt.
     ============================================================ */
  /* RODIN ER A LEIDRETTU VIRDI — sja `needPenalty`. `vbd` sjalft er
     OHREYFT thvi thad er BIRT talan; tvaer merkingar undir sama nafni
     vaeru tveir kvardar. Fradratturinn er per STODU, svo hann getur
     ekki vixlad monnum innan somu stodu. */
  const startable = startableSlots(league);
  const penOf = {};
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    penOf[pos] = needPenalty(pos, counts, startable);
  }
  for (const p of out) p.needPenalty = round1(penOf[p.pos] || 0);
  out.sort((a, b) => (b.vbd - (penOf[b.pos] || 0)) - (a.vbd - (penOf[a.pos] || 0)));

  /* OG ThAD VERDUR AD SJAST. Kassinn segir "Highest value over
     replacement" — su setning er OSONN um leid og fradratturinn faerir
     einhvern nidur, og thogul rodun sem stangast a vid birta tolu er
     nakvaemlega thad sem gerir tolu otruverduga. `insteadOf` ber
     manninn sem BAR haesta hra VBD, svo vidmotid geti sagt hvers vegna
     hann er ekki efstur. `null` thegar rodin er oadgreind fra hrarri
     rod — engin setning tha, ekki tom setning. */
  if (out.length) {
    const rawTop = out.reduce((a, b) => (b.vbd > a.vbd ? b : a), out[0]);
    out[0].insteadOf = rawTop.id === out[0].id ? null : {
      id: rawTop.id, name: rawTop.name, pos: rawTop.pos, vbd: round1(rawTop.vbd),
      have: counts[rawTop.pos] || 0, startable: startable[rawTop.pos] ?? null,
    };
  }

  /* ============================================================
     SAETI SEM RODIN NAER ALDREI TIL — K OG DST
     ============================================================
     K og DST eru VILJANDI utan A-Ranking: their voru aldrei med i
     neinni hermun sem stadfestir rodina, og rod an maelingar er
     agiskun sem litur ut eins og maeling.

     EN ad rada theim ekki ma ekki thyda ad thegja um tha. Hermd
     drafting i 14 umferdum gaf hopinn RB3 WR7 TE2 QB2 — fullkomlega
     nothaefan NEMA ad tvo byrjunarsaeti stodu tom alla leidina, thvi
     radgjofin nefndi hvorugan einu sinni. Notandi sem fylgir henni i
     blindni endar med enga spyrnu og enga vorn.

     Thess vegna er skilad LISTA, ekki rod: hvada stodur deildin
     BYRJAR med, ber engan i hopnum, og radgjofin mun aldrei stinga
     upp a. `urgent` kviknar thegar valin sem eftir eru duga vart
     lengur til ad fylla thau.                                    */
  const st = league.starters || {};
  /* ============================================================
     SJALFGEFID `rounds` VAR 14 HER OG 15 I `DEFAULT_LEAGUE`
     ============================================================
     Tvo olik sjalfgefin gildi fyrir SAMA reit, og thad hefur afleidingu:
     `picksLeft = rounds - roster.length` styrir `mustFillUrgent`, sem er
     thad eina sem segir ther ad taka spyrnumann eda vorn. Vid 14 taldi
     radgjofin EINU VALI FAERRA en deildin ber, svo hun kallaði
     "bradanauðsyn" einni umferd of snemma i hverri deild sem notar
     sjalfgefna toluna.

     ÞETTA ER NAKVAEMLEGA VILLAN SEM `build.js` SKJALAR UM `maxPos`:
     "thad sem var maelt var ekki thad sem for i loftid". Þar bar
     hermunin stodu-thak sem appid hafdi ekki; hér ber radgjofin
     umferda-fjolda sem deildin hefur ekki. Bædi eru sama aett: TVAER
     UTGAFUR AF SOMU DEILD.

     `DEFAULT_LEAGUE` er heimildin. `advice.js` flytur hana EKKI inn
     (thad byggi til hring: `build.js` -> `model.js` og `advice.js` er
     lesin af `build.js`-notendum), svo talan er skrifud hér med
     TILVISUN i heimildina og profid ber thaer saman — sja
     `tests/advice.mjs`, sem fellur ef thaer reka i sundur.           */
  const rounds = league.rounds || 15;
  /* ============================================================
     HOPURINN ER STAERRI EN BORDID VEIT — `rosterUnknown`
     ============================================================
     Bordid ber ~1.130 leikmenn af ~11.400 hja Sleeper, svo djupt val
     getur verid utan thess. Þau vol ERU TALIN i valnumerid (`offBoard`
     -> `pickNo`) en `roster.length` telur adeins thad sem BORDID
     ThEKKIR. Med tveimur oporadum eigin volum taldi radgjofin thvi
     TVEIMUR VOLUM FLEIRA eftir en eg a raunverulega — og `picksLeft`
     styrir `mustFillUrgent`, sem er thad EINA sem segir ther ad taka
     spyrnumann eda vorn. Bradanauðsynin kviknadi thvi UMFERD OF SEINT
     og skildi eftir tomt varnarsaeti.

     ThETTA ER NAKVAEMLEGA SAMA VILLAN SEM `offBoard` VAR SMIDAD FYRIR,
     a odru sviði: `pickNo` fekk lagfaeringuna, `roster.length` ekki.
     Sami toluflutningur, sama heimild (`unmatched.mine` i pollun),
     onnur notkun.

     `0` er RETT sjalfgefid gildi og ekki agiskun: kallandi sem veit
     ekkert um oporud vol (hrein prof, `advice-lab`) hefur engan hop
     utan bordsins.                                                  */
  const extra = Math.max(0, Math.round(Number(rosterUnknown)) || 0);
  const picksLeft = Math.max(0, rounds - roster.length - extra);
  const mustFill = [];
  for (const pos of Object.keys(st)) {
    if (pos === "FLEX" || pos === "SUPERFLEX") continue;
    if (expNext[pos]) continue;               // stada sem rodin naer til
    const short = (st[pos] || 0) - (counts[pos] || 0);
    if (short > 0) mustFill.push({ pos, short });
  }
  const needed = mustFill.reduce((a, m) => a + m.short, 0);

  /* ============================================================
     AUDAR VIKUR — TALDAR, EKKI VEGNAR
     ============================================================
     Hopurinn getur borid thrja hlaupara sem eru allir i frii i viku 7.
     Timabils-summan sem stadfestir rodina er BLIND a thad, svo thetta
     var ekki haegt ad maela fyrr en vikulega talningin var byggd.

     MAELT (bye-lab.mjs, vikulega, 2019-2025, badar spaheimildir): tiu
     af tiu vogum jakvaedar en 8 af 12 arum og vikmorkin innihalda
     null. Merkid faer thvi AD SJAST og EKKI ad rada — sama regla og
     Evruálagid i FPL-verkefninu.                                    */
  const byeClash = [];
  {
    const seen = new Map();
    for (const r of roster) {
      if (r.bye == null || !r.pos) continue;
      const k = `${r.pos}|${r.bye}`;
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    for (const [k, n] of seen) {
      if (n < 2) continue;
      const [pos, bye] = k.split("|");
      byeClash.push({ pos, bye: Number(bye), n });
    }
    byeClash.sort((a, b) => b.n - a.n);
  }

  /* ============================================================
     TVEIR KOSTIR — OG ÞAÐ ER EKKI AFTURHVARF TIL MATSEDILSINS
     ============================================================
     BEIDNI NOTANDANS 20.8.2026: "eg vill ad appid maeli med 2 leikmonnum.
     Thannig ad eg geti valid ut. 2 bestu sem eru i bodi."

     ÞETTA SNYR VID EIGIN AKVORDUN HANS — og hun var rett tha. Kassinn bar
     FIMM radir og hann sagdi: "eg vill ekki thurfa ad velja neitt". Fimm
     oadgreindar radir ERU val an hjalpar; thaer skila akvordunininni til
     baka og segja ekkert um hvad greinir thaer ad.

     ÞAD SEM BREYTTIST ER KONKRET BILUN SEM EITT NAFN GAT EKKI SYNT:

       "Pick 17 — take this: TE Brock Bowers · bye 13 · 95% likely to
        still be here in 8 picks"

     Hann spurdi — rettilega — hvers vegna hann aetti ad eyda vali 17 a
     mann sem er 95% viss um ad vera laus i vali 25. Talan var RETT, hun
     var MAELD (`survivalProb`, `SD_K` fittad a 1.882 leikmanna-arum), og
     hun stod sem ROKSTUDNINGUR fyrir vali sem var tekid a virdinu einu.
     Merkid var THEGAR i appinu og motsagdi urskurdinum i sinu eigin
     spjaldi.

     TVEIR ER EKKI FIMM: annad nafnid ber NAKVAEMLEGA thad sem greinir
     thau ad — bilid i VBD, hvort hvor lifir ad naesta vali, og stodurnar.
     Þegar einn er 95% oruggur og annar 20% er thad ekki jafntefli heldur
     augljost svar, og appid FALDI thad adur.

     RODIN HAGGAST EKKI. `list[0]` er `out[0]` — sami madur sem maelda
     rodin setur fyrstan (A-Ranking/VBD). Bradanauðsyn sem ROD var maeld
     og hun tapar (-60,06 i standard, 0 af 5 arum); lifunarlikur sem
     jafnteflis-rof voru maeldar og gafu ekkert (t = -0,06 / +0,79). Hér
     er hvorugt gert: annad nafnid er BIRT, ekki rodad.

     ÞRIDJA NAFNID KEMUR **ADEINS** ThEGAR TVO FYRSTU ERU I SOMU STODU.
     Þa eru their tveir skiptanlegir fyrir hopinn og valid sem hann
     stendur frammi fyrir er ekki til a skjanum. Hans eigin ord:
     "svo leikmadur til vara ef eg tharf frekar RB". Þridji madurinn er
     BESTI ur ANNARRI stodu — ekki ny rod, heldur sami listi, naesta
     stada.

     OG BADIR VERDA AD VERA RAUNVERULEGIR KOSTIR: skurdurinn er
     `vbd > 0` — virdi ofan a varamann, sama maelda lina og `sidelined`
     notar. Se adeins EINN yfir henni er EINN synur og thad er sagt;
     ad fylla annad saetid med manni sem er ekki thess virdi ad taka
     vaeri matsedill i sinni verstu mynd.                              */
  const above = out.filter((p) => p.vbd != null && p.vbd > 0);
  /* Seint i drafti getur ENGINN verid yfir linunni. Þa stendur urskurdurinn
     einn — bordid a ekki ad thagna i sidustu umferdum. */
  const base = above.length ? above : out.slice(0, 1);
  const withGap = (p) => ({ ...p,
    /* Bilid er ALLTAF maelt fra theim sem maelda rodin setur fyrstan, svo
       talan svarar spurningunni sem er spurd: "hvad kostar hinn?" */
    behind: base.length ? round1(base[0].vbd - p.vbd) : null });
  const list = base.slice(0, 2).map(withGap);
  const samePos = list.length === 2 && list[0].pos === list[1].pos;
  const altRaw = samePos
    ? base.slice(2).find((p) => p.pos !== list[0].pos) || null : null;

  const choice = {
    list,
    alt: altRaw ? withGap(altRaw) : null,
    /* Hve margir eru yfir varamanns-linunni — vidmotid tharf ad geta sagt
       "adeins einn er thess virdi" i stad thess ad synna tomt saeti. */
    aboveRepl: above.length,
    samePos,
    waitNote: waitNoteFor(list, nextPick, wait),
  };

  return {
    pick, nextPick, wait,
    /* TVEIR KOSTIR TIL AD VELJA UR — sja notuna ofar. Rodin er OSKERT:
       `choice.list[0]` ER `picks[0]`. */
    choice,
    /* Audar vikur sem rekast a — UPPLYSING, ekki thattur i rodinni. */
    byeClash,
    /* Menn sem rodin BAR og sem eru ekki i lidinu sinu. Þeir eru
       teknir UT UR `picks` og skiladir hér med astaedu — sja notuna
       ofar. Tomt fylki thegar allir eru heilir; ALDREI `null`, svo
       vidmotid getur skrifad `.length` an vardar.

       ADEINS THEIR SEM ERU YFIR VARAMANNS-LINUNNI eru nefndir. Hinir
       eru TALDIR og versta talan nefnd — enginn hverfur thegjandi. */
    sidelined,
    sidelinedBelowRepl,
    sidelinedWorst,
    /* Stodur sem thu verdur ad fylla en rodin nefnir aldrei. */
    mustFill,
    mustFillUrgent: needed > 0 && picksLeft <= needed + 1,
    picksLeft,
    /* Sa sem bradanauðsyn hefdi valid. Hafdur med svo haegt se ad sja
       HVENAER thaer tvaer adferdir eru osammala — thad er sjalft
       upplysandi — en hann er EKKI tillagan. */
    urgencyPick: nextPick == null ? null
      : out.slice().sort((a, b) => b.urgency - a.urgency)[0] || null,
    picks: out,
    expectedNext: Object.fromEntries(
      Object.entries(expNext).map(([k, v]) => [k, round1(v.value)])),
    /* Vidmotid VERDUR ad geta sagt fra thvi ad rodin se A-Ranking. */
    orderedBy: "aRank",
  };
}

/* ============================================================
   ÞEGAR LIFUNARTOLURNAR SEGJA SITTHVAD — SETNINGIN SEM VANTADI
   ============================================================
   ÞETTA ER LAGFAERINGIN A MOTSOGNINNI SEM NOTANDINN SA: kassinn bar
   "95% likely to still be here in 8 picks" sem ROKSTUDNING fyrir vali
   sem var tekid a virdinu einu. Talan var rett; hun var einfaldlega
   sett fram sem astaeda thegar hun er FYRIRVARI.

   Nu eru tvo nofn a skjanum og lifunartolur BEGGJA synilegar. Þessi
   setning segir hvad thaer TVAER thyda saman — og hun er ARITMETIK a
   maeldum tolum, ekki ny vog:

     · sa fyrri lifir, sa seinni ekki  -> "taktu seinni fyrst og thu
       gaetir fengid BADA" (rodin sjalf er OHREYFD, thetta er upplysing
       um TIMASETNINGU, sem er nakvaemlega thad sem `advice.js` segir ad
       lifunarlikur seu til: "thaer segja ther hvort thu getir beðid — en
       thaer rada ekki")
     · sa fyrri fer, sa seinni lifir   -> "rodin faer ther bada" —
       jafn mikilvaegt, thvi tha er ENGIN spurning og appid a ekki ad
       lata thig grufla

   ÞRESKULDIRNIR ERU ÞEIR SEM ERU ÞEGAR I `reasonsFor` (0,7 og 0,25) —
   ekki nyjar tolur. Þeir eru LESLEIKI: thad sem er birt i orðum er thad
   sem er thegar birt i prosentum vid hvert nafn.

   `null` ThEGAR EKKERT ER AD SEGJA. Setning i hvert einasta val vaeri
   havadi, og havadi er thad sem let hann missa vidvorunina 17.8.       */
function waitNoteFor(list, nextPick, wait) {
  if (!Array.isArray(list) || list.length < 2 || nextPick == null) return null;
  const [a, b] = list;
  if (a.survive == null || b.survive == null) return null;
  const pct = (x) => Math.round(x * 100);
  if (a.survive > 0.7 && b.survive < 0.25) {
    return { kind: "reverse", text:
      `${a.name} is ${pct(a.survive)}% likely to still be there at pick ${nextPick}`
      + ` and ${b.name} only ${pct(b.survive)}% — taking ${b.name} now is the one`
      + ` order that can end with both. The order above is still by value:`
      + ` ${b.name} is ${Math.abs(b.behind)} behind.` };
  }
  if (a.survive < 0.25 && b.survive > 0.7) {
    return { kind: "keep", text:
      `${a.name} is only ${pct(a.survive)}% likely to last your next ${wait} picks`
      + ` while ${b.name} is ${pct(b.survive)}% — this order gets you both.` };
  }
  return null;
}

function reasonsFor(p, { urgency, eNext, survive, wait, counts, league }) {
  const r = [];
  const need = ((league.starters || {})[p.pos] || 0) - (counts[p.pos] || 0);

  if (survive != null && survive < 0.25) {
    r.push({ kind: "gone", text:
      `only ${Math.round(survive * 100)}% likely to last your next ${wait} picks` });
  } else if (survive != null && survive > 0.7) {
    r.push({ kind: "wait", text:
      `${Math.round(survive * 100)}% likely to still be here in ${wait} picks` });
  }

  /* `urgency == null` er "ekkert val eftir". `null < 5` er **satt** i JS
     (null verdur 0), svo an thessarar vardar hefdi kassinn skrifad
     "RB drops off by only 0 before your next pick" i sidasta valinu —
     setning um val sem er ekki til. Sama gildra og `null >= 2` i
     graenu runununum i FPL-verkefninu. */
  if (urgency == null) {
    /* engin fullyrding um bid */
  } else if (urgency > 25) {
    r.push({ kind: "drop", text:
      `${Math.round(urgency)} points better than what ${p.pos} should offer next time` });
  } else if (urgency < 5) {
    r.push({ kind: "flat", text:
      `${p.pos} drops off by only ${Math.max(0, Math.round(urgency))} before your next pick` });
  }

  /* ============================================================
     "ÞU THARFT ENN 2 WR" ER STADREYND, EKKI ROKSTUDNINGUR.
     ============================================================
     Notandinn las thennan streng og spurdi hvort akvordunin taeki
     tillit til thess ad hann aetti engan WR. Hun gerir thad EKKI —
     `out.sort((a, b) => b.vbd - a.vbd)` og ekkert annad. En strengur
     sem stendur i dalki sem heitir "Why" les eins og hann hafi radid,
     og thad er sama aett af villu og omaeld tala i eigin reit.

     Stodu-thorf var maeld i thremur myndum og engin theirra slaer
     "besta lausa mann": 19 stodu-plon (strategy-lab, ekkert marktaekt),
     bradanauðsyn sem rod (advice-lab, -63,8 i standard, 0/4 ar) og
     lifunarlikur sem jafnteflis-rof (tiebreak-lab, t=-0,06 / +0,79).
     Thess vegna segir strengurinn nu sjalfur hvad hann er.

     Vordur: `tests/advice.mjs` — spegilmynd hopsins verdur ad gefa
     NAKVAEMLEGA somu rod, OG thorfin verdur samt ad vera nefnd.      */
  if (need > 0) {
    r.push({ kind: "need",
             text: `you still need ${need} at ${p.pos} — noted, not ranked` });
  }
  if (p.tier != null) r.push({ kind: "tier", text: `tier ${p.tier}` });
  return r;
}

const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

/* ============================================================
   MAELDAR TOLUR — sja `scripts/advice-lab.mjs`
   ============================================================
   Fyllt inn thegar maelingin hefur keyrt. Ef thessi hlutur er tomur
   a vidmotid ad segja ad radgjofin se OMAELD.
   ============================================================ */
export const MEASURED = {
  /* Stadalfravik ADP thegar FFC birtir thad ekki. Fittad a 1.882
     leikmanna-arum 2015-2025: k = 1,082. Kodinn notar 1,08. */
  sdRule: "1.08 * sqrt(ADP)",
  sdRuleFitted: 1.082,
  sdRuleSample: 1882,

  /* ============================================================
     ÞESSAR TOLUR ERU AFRIT AF DISKI OG ÞAER VORU URELTAR
     ============================================================
     `scripts/advice-lab.mjs` skrifar `data/advice_<scoring>.json`.
     Þetta safn bar hins vegar tolur ur ELDRI keyrslu — TOLF talna
     skekkja, fundin i yfirferd 12.8.2026:

       urgencyVsARank.ppr       13,6 -> 16,44   (lo/hi og winYears lika)
       urgencyVsARank.standard -63,8 -> -60,06
       fjoldi tímabila            4  -> 5       (2021-2025, ekki 2022-2025)
       aRankVsAdp.ppr          239,4 -> 264,08
       aRankVsAdp.standard     267,1 -> 197,46  <- naestum vidsnuid

     Sidasta lina er su alvarlegasta: bokada standard-talan var HAERRI
     en ppr, sem er ondverdt vid maelinguna. Þad les eins og A-Ranking
     vinni MEST i standard-deildum, sem er einfaldlega ekki thad sem
     stendur a diski.

     NIDURSTADAN HAGGAST SAMT EKKI OG ÞAD ER ATRIDID: ppr-CI inniheldur
     enn null (-28,3 til +43,9) og standard er enn marktaekt NEGATIFT,
     svo `urgencyDrivesOrder: false` stendur oskert. Skekkjan var i
     TOLUNUM sem eru BIRTAR, ekki i akvordunininni. Þad gerir hana ekki
     omerkilega — birt tala sem ekkert bakar upp er nakvaemlega thad sem
     thetta verkefni segir vera verstu utkomuna.

     Vordur: `tests/advice.mjs` kafli 13 les `data/advice_*.json` og
     fellur ef eitt einasta svid rekur. Afrit an vardar rekur ALLTAF —
     thad er ekki tilgata, thad er thad sem gerdist hér.

     Hermun: 12-lida snakk, OLL 12 saetin, motherjar drafta eftir ADP,
     skorad a raunverulegum stigum. Timabil 2021-2025.               */
  urgencyVsARank: {
    ppr: { diff: 16.44, lo: -28.3, hi: 43.94, significant: false, winYears: 4, years: 5 },
    standard: { diff: -60.06, lo: -92.48, hi: -26.72, significant: true, winYears: 0, years: 5 },
  },
  /* NIDURSTADAN: bradanauðsyn radar EKKI. Sja langa notu i `recommend`. */
  urgencyDrivesOrder: false,

  /* A-Ranking gegn hraru ADP i SOMU hermun — thad sem RAEDUR.

     ÞETTA ER ONNUR TALA EN "+234" I README OG ÞAER ERU EKKI I MOTSOGN.
     README-taflan er WALK-FORWARD 2015-2025 (lambda valid med
     krossprofun innan thjalfunargagna, 11 profar); thessi er hermunin
     2021-2025 sem `advice-lab` keyrir. Sitthvor honnun, sitthvor tala.
     Sama lexia og VBD-villan gaf: TALA AN HARNESS ER OSAMANBURDARHAEF. */
  aRankVsAdp: {
    ppr: { diff: 264.08, lo: 170.4, hi: 344.6, significant: true },
    standard: { diff: 197.46, lo: 91.68, hi: 298.38, significant: true },
  },
  seasons: [2021, 2022, 2023, 2024, 2025],
};
