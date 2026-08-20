/* ============================================================
   DraftBoard.jsx — verkfaerid sem er notad i agust.

   THRJAR HUGMYNDIR SEM GERA THETTA AD MEIRU EN LISTA:

   1. THREPIN, EKKI RODIN, RADA AKVORDUNINNI. Spurningin vid hvert
      val er aldrei "hver er bestur" heldur "hver er bestur SEM VERDUR
      FARINN THEGAR ROÐIN KEMUR AFTUR AD MER". Thess vegna er talid
      hve margir eru eftir i hverju threpi og hve morg val eru thangad
      til thu velur naest.

   2. BEIN TENGING VID SLEEPER. Sleeper-API-id sendir CORS-hausa svo
      vafrinn ma kalla thad beint. Thu limir inn draft-slodina, appid
      pollar `/draft/{id}/picks` og strikar ut tha sem eru farnir —
      i beinni, an thess ad thu skrair neitt handvirkt.

   3. SKORPU RODIN VID HLIDINA A SAMSTEYPUNNI. `sharpDelta` syar
      hvad thau bord sem MAELDUST BETUR EN HANDAHOF i fyrra segja
      umfram medaltalid. Thad er eina rodin i appinu sem hefur maelt
      umbod.
   ============================================================ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as D from "./data.js";
import { pickSignature, pollDelay } from "./draft-sync.js";
import { recommend, MEASURED, nextOwnPick, survivalProb } from "./advice.js";
import { leagueFromSleeper, teamsFromLeague, startersFromSlots } from "./sleeper-league.js";
import { edgeSentence } from "./rulebasis.js";
import { signed } from "./columns.js";

export default function DraftBoard({ rows, meta, league, season, accuracy, kickers,
                                     shapes, leagueKey, sync, setSync,
                                     imported, warnings, teams, onImportLeague,
                                     sleeperUser, setSleeperUser, onRereadRules,
                                     liveScope, setLiveScope,
                                     /* LOGUN DRAFTSINS BYR I `App.jsx` — sja
                                        `boardShape`. Hun VERDUR ad vera thar:
                                        `vbd` er reiknad i `buildRows`, svo
                                        deild sem er leidd ut ur drafti getur
                                        ekki bara verid til her nidri. */
                                     draftShape, onShape, board }) {
  /* MENGIN ERU BUNDIN DRAFTINU, EKKI DEILDINNI. Sja `boardScope` i
     `data.js`: deildu tvo mock i somu deild sama `taken` bæri hid
     seinna vol hins fyrra — og valnumerid, naesta eigid val og hver
     lifunartala byggja OLL a `taken.size`. Se ekkert draft tengt er
     bordid handvirk skraning og fylgir deildinni einni.

     `App.jsx` endurraesir thennan hlut (`key`) vid SVISSUN a deild, svo
     upphafsgildin hér eru lesin upp a nytt tha. Draft-audkenni breytist
     hins vegar an endurraesingar (SleeperSync byr i thessu tre og myndi
     missa lifandi tenginguna vid hvern staf sem er slegin i reitinn),
     svo skiptin eru medhondlud berum ordum nedar. */
  const scope = D.boardScope(leagueKey, sync && sync.draftId);
  const kTaken = D.scoped("taken", scope);
  const kMine = D.scoped("myPicks", scope);
  /* ============================================================
     AUDKENNIN ERU ÞVINGUD, EKKI ADEINS FYLKID
     ============================================================
     Þetta var `new Set(D.loadState(kTaken, []))`. Ytri gerdin var varin
     (`[]` sjalfgefid) en HVERT STAK EKKI — sama villa og `imported` bar,
     og hér er hun VERRI a einn hatt: hun hrynur EKKI og gefur ekkert
     NaN. Hun gefur RANGAR TOLUR, og thaer eru skrifadar til baka:

       ["4034","6794","11565"]   ->  3 drafted · Pick 4     (rett)
       [{"a":1},{"b":2}]         ->  2 drafted · Pick 3
       [null,null]               ->  1 drafted · Pick 2
       [4034,6794]               ->  2 drafted · Pick 3 og ENGINN
                                     strikadur ut a bordinu

     Sidasta rodin magnar `pickNo`-villuna: GERDAR-DRIFT a audkenni
     fleytir valnumerinu an thess ad strika nokkurn ut, svo bordid telur
     ad tvo vol seu komin og synir samt bada leikmennina lausa.

     TOLUR ERU UMBREYTTAR, EKKI FELLDAR. `4034` er audkenni sem ER til —
     thad er thad sama og `"4034"` med annarri gerd (JSON-umferd um
     eldri utgafu, handvirk breyting, annad tol). Ad fella thad vaeri ad
     henda raunverulegu vali notandans; ad umbreyta thvi laetur bordid
     strika rettan mann ut. `null`, hlutir og tomir strengir eru felldir,
     thvi their bera ekkert audkenni.

     Vordur: `saved-state.mjs` — blobbin fjogur hér ofan eru maeld, og
     krafan er ad TALAN A SKJANUM se rett, ekki adeins ad appid lifi. */
  const idSet = (v) => new Set((Array.isArray(v) ? v : [])
    .map((x) => (typeof x === "string" ? x.trim()
               : (typeof x === "number" && Number.isFinite(x)) ? String(x) : ""))
    .filter(Boolean));
  const [taken, setTaken] = useState(() => idSet(D.loadState(kTaken, [])));
  const [myPicks, setMyPicks] = useState(() => idSet(D.loadState(kMine, [])));
  /* Refin er SANNLEIKURINN UM SIDASTA SVAR FRA SLEEPER — sja langa notuna
     vid `onPicks`. Hun er skilgreind HER en ekki thar thvi skipti um bord
     verda ad geta nullstillt hana, og thau gerast ofar i skranni. */
  const lastSync = useRef({ ids: new Set(), mine: new Set() });
  /* Vol sem Sleeper hefur skrad en bordid kann ekki ad para. Þau ERU
     komin, svo thau tilheyra valnumerinu — sja `pickNo` nedar. Ekki
     vistad: thad er lesid upp a nytt i hverri pollun og vistad gildi an
     pollunar vaeri tala sem enginn getur leidrett. */
  const [offBoard, setOffBoard] = useState(0);
  const [posFilter, setPosFilter] = useState([]);
  /* ============================================================
     LOGUN DRAFTSINS — LESIN UR DRAFTINU, EKKI UR DEILDINNI
     ============================================================
     ÞETTA VAR RAUNVERULEG VILLA A SKJANUM HJA NOTANDANUM 17.8.2026 og
     hun kostadi hann mock-draft: kassinn skrifadi **"Pick 151 — take
     this"** i 10-lida 15-umferda drafti, sem endar a vali **150**.

     Villan er EKKI su ad hlidid vanti — thad er til (`totalPicks` i
     `NextPick`, skrifad gegn nakvaemlega thessu) — heldur ad hlidid
     spurdi RANGA HEIMILD: `league.teams * league.rounds`. Deildin i
     appinu bar 12 lid, svo thakid var 180 og val 151 slapp i gegn. Sama
     gildir um hverja adra snakk-tolu: `nextOwnPick(..., league.teams)`
     gaf 12-lida vorpun a 10-lida draft, svo "naesta val" og hver
     lifunartala voru ur ANNARRI DEILD. "13 picks away" i kassanum hans
     er 12-lida bid; rett svar var 9.

     REGLAN SEM GILDIR — og hun er ThEGAR skrad i `sleeper-league.js`
     um `rounds`: **DRAFTID ER HEIMILDIN UM DRAFTID.** Þar var hun
     beitt a innflutninginn; hér var hun ekki beitt a bordid.

     OG FRA 20.8.2026 FLYTUR VBD MED — EN ADEINS UR DRAFTI SEM A ENGA
     DEILD. Hér stod ad varamanns-threpin kaemu "afram ur deildinni, thvi
     thau eru reglur notandans". Þad er rett um DEILDARDRAFT og osatt um
     mock: mock ber enga `league_id`, svo THAR ERU ENGAR REGLUR NOTANDANS
     AD YFIRSKRIFA — draftid er eina heimildin sem til er, og hun ber
     bædi `slots_*` og `metadata.scoring_type`. Sja `boardShape` i
     `sleeper-league.js`; logunin er LYFT UPP I `App.jsx` thvi `vbd` er
     reiknad thar (`buildRows`).                                        */
  /* Hve morg vol komu UR GEYMSLUNNI en ekki fra Sleeper. Sja `RestoredNote`. */
  const [restored, setRestored] = useState(() => taken.size);

  /* ============================================================
     SKIPT UM BORD AN ENDURRAESINGAR
     ============================================================
     `useState`-upphafsgildi keyra ADEINS vid mount. Draft-audkennid
     getur breyst an mounts (nytt mock i somu deild), og tha vaeri
     astandid afram bord fyrra draftsins — OG VERRA: vistunar-effectid
     hér nedar myndi skrifa vol fyrra draftsins undir lykil hins nyja.

     Þetta er "adlaga astand thegar props breytast"-mynstrid: setja
     astand BEINT I TEIKNINGU. React keyrir hlutinn strax aftur med nyja
     gildinu adur en nokkud er teiknad eda nokkurt effect keyrir, svo
     kTaken og `taken` geta ekki verid ur sitthvoru bordinu i sama
     effecti. Ad gera thetta i `useEffect` vaeri EINNI TEIKNINGU OF SEINT
     og vistunin fengi ad hlaupa a undan.

     Merkid er ASTAND en ekki `useRef`: ref sem er skrifud i teikningu
     sem React hendir (StrictMode teiknar tvisvar) laetur seinni
     teikninguna sleppa lestrinum og astandid situr eftir rangt.       */
  const [stateScope, setStateScope] = useState(scope);
  if (stateScope !== scope) {
    const t = idSet(D.loadState(kTaken, []));
    setStateScope(scope);
    setTaken(t);
    setMyPicks(idSet(D.loadState(kMine, [])));
    /* `offBoard` er tala ur SIDUSTU POLLUN og su pollun var a odru
       drafti. Hun er ekki vistud, svo nyja bordid byrjar a 0 og faer
       sina eigin tolu vid fyrstu pollun. */
    setOffBoard(0);
    /* Og minnid um sidasta Sleeper-svar er minni um ANNAD draft. Vaeri
       thad ekki nullstillt myndi mismunar-reglan i `onPicks` reyna ad
       fjarlaegja vol hins draftsins ur thessu bordi. */
    lastSync.current = { ids: new Set(), mine: new Set() };
    setRestored(t.size);
  }

  /* ============================================================
     VISTUN FYLGIR ASTANDINU, EKKI KOLLUNUM
     ============================================================
     Adur var `persist(t, m)` kallad i hverri adgerd med THEIM mengjum
     sem adgerdin bjó til. Thad virkar adeins ef adgerdin veit rett
     astand — og pollunin gerdi thad EKKI (sja `onPicks`). Nidurstadan
     var ad afturforin var ekki bara syn heldur VISTUD.

     Effect a mengin sjalf getur ekki skeikad: hvad sem breytir theim,
     og hvadan sem thad kemur, er thad SIDASTA astand sem er skrifad.

     `saveScoped` en ekki `saveState`: tomt bord BYR EKKI TIL LYKIL (annars
     aetti hvert millistig draft-audkennis sitt tomma bord i geymslunni)
     en tomt bord SKRIFAST a lykil sem er til (annars kaemi "Reset" til
     baka vid naestu hledslu). */
  useEffect(() => { D.saveScoped(kTaken, [...taken]); }, [kTaken, taken]);
  useEffect(() => { D.saveScoped(kMine, [...myPicks]); }, [kMine, myPicks]);
  /* Bord safnast upp — eitt per mock — svo thau elstu eru grisjud. Adeins
     draft-bord; handvirka bordid er eina eintakid af sinum volum.

     ============================================================
     OG ADEINS BORD SEM HEFUR VOL (19.8.2026)
     ============================================================
     Þetta var `[scope]` eitt, og THAD EYDDI BORDINU SEM VAR I GANGI:
     hver innslattur i Draft ID-reitinn gefur nytt `scope`, svo ad slá
     19 stafa audkenni i hendi kalladi hingad **15 sinnum** med
     halfslegnum audkennum sem oll standast `DRAFT_ID_RE`. Grisjunin
     (8 sess) fylltist af theim og ytti raunverulegum bordum ut.
     Rokstudningurinn er allur vid `touchBoardScope` i `data.js`.

     `hasPicks` er thvi I HADINU, ekki adeins skilyrdi INNI i effectinu:
     bord skrair sig thegar thad FAER sitt fyrsta val, ekki thegar thad
     er opnad. Vaeri `scope` eitt i hadinu myndi bord sem er tengt tomt
     — sem er nakvaemlega thad sem gerist thegar draft er tengt fyrir
     fyrsta val — aldrei skrast, og grisjunin haetti ad grisja.

     RODIN A EFFECTUM SKIPTIR MALI OG HUN ER TRYGGD: vistunar-effectin
     tvo hér ad ofan eru skilgreind FYRR, svo lykillinn er skrifadur
     adur en spurt er hvort hann se til. Sama commit, sama teikning. */
  const hasPicks = taken.size > 0 || myPicks.size > 0;
  useEffect(() => { if (hasPicks) D.touchBoardScope(scope); }, [scope, hasPicks]);

  /* Bordid radar THEIM SEM A-RANKING NAER YFIR. K og DST eru utan
     hennar (sja notu i build.js) og eru syndir ser nedar. */
  const available = useMemo(
    () => rows.filter((r) => r.aRank != null && !taken.has(r.id))
              .sort((a, b) => a.aRank - b.aRank),
    [rows, taken]);
  const kdst = useMemo(
    () => rows.filter((r) => r.aRank == null && r.vbd != null && !taken.has(r.id))
              .sort((a, b) => b.vbd - a.vbd),
    [rows, taken]);

  const shown = useMemo(
    () => (posFilter.length ? available.filter((r) => posFilter.includes(r.pos)) : available),
    [available, posFilter]);

  /* Hve margir eru eftir i hverju threpi per stodu.
     NOTAR `posTier`, EKKI `tier`: threp thvert a stodur svara ekki
     spurningunni "hve margir RB1 eru eftir" — thau byrjudu QB-listann
     i threpi 7 og TE i threpi 6, sem er merkingarlaust her. */
  const scarcity = useMemo(() => {
    const m = {};
    for (const r of available) {
      const k = r.pos;
      m[k] = m[k] || { tiers: new Map(), total: 0 };
      m[k].total++;
      if (r.posTier != null) m[k].tiers.set(r.posTier, (m[k].tiers.get(r.posTier) || 0) + 1);
    }
    return m;
  }, [available]);

  const myRoster = useMemo(
    () => rows.filter((r) => myPicks.has(r.id)), [rows, myPicks]);

  /* ============================================================
     HVERJUM NA EG VID NAESTA VAL? — LITUR, EKKI NY TALA
     ============================================================
     Thetta er BIRTING a tolu sem er thegar maeld: `survivalProb`
     (`advice.js`), thar sem stadalfravik ADP kemur ur raunverulegum
     droftum hja FFC og `SD_K = 1,08` var FITTAD a 1.882
     leikmanna-arum. Ekkert nytt er reiknad her og engin ny vog er
     valin — bordid syair sama merki sem radgjofin notar.

     ÞRJU SKILYRDI, OG HVERT THEIRRA MA SLOKKVA A LITNUM:
       · saetid verdur ad vera thekkt — an thess er engin snakk-rod og
         tha vaeri liturinn hreinn tilbuningur
       · lidafjoldi verdur ad vera thekktur (hann er alltaf)
       · leikmadurinn verdur ad bera ADP — `null` faer ENGAN lit, ekki
         "0% likur". Tomt gildi er ekki nullgildi (sama regla og
         alls stadar annars stadar i thessu repo-i).

     THREPIN ERU LESLEIKI, EKKI LIKAN. `p` er samfelld; tveir tonar
     eru til thess ad AUGAD greini hana i 200 rada toflu. Talan sjalf
     er i `title` a nafninu, svo enginn thurfi ad giska hvad tonninn
     thydir — og radgjofin les samfelldu toluna, aldrei tonninn.     */
  /* ============================================================
     VALNUMERID ER LEITT UT EINU SINNI, HER, OG SENT NIDUR
     ============================================================
     Þad var leitt ut a THREMUR stodum (`reach`, `nextOwn`, `NextPick`),
     hvert ur `taken.size + 1`. Sama tala thrisvar er ekki bara
     endurtekning heldur haetta — thaer gaetu rekid i sundur, og gerdu
     thad: `NextPick` for adra leid ad naesta vali og skjarinn bar tvo
     svor (sja hausinn a `picksUntilNext` i `advice.js`).

     ============================================================
     OG `taken.size` VAR EKKI RETTA TALAN
     ============================================================
     Sleeper-pollunin telur vol sem hun getur EKKI paradad vid bordid
     (`unmatched.total`) — leikmenn sem eru ekki i `players.json`. Appid
     BIRTIR thau ("3 picks are not on this board") en tok thau EKKI med
     i valnumerid, svo bordid taldi ad thrju faerri vol vaeru komin.

     Þad er ekki adeins tala a skjanum: `nextOwnPick(cur, ...)` skilar
     FYRSTA eigin vali eftir `cur`, svo of lagt `cur` getur skilad vali
     sem ER THEGAR LIDID — og lifunarlikur eru tha reiknadar til valnumers
     sem kemur aldrei.

     Þess vegna er `offBoard` lyft ur `SleeperSync`. Þad er TALA UR
     SIDUSTU POLLUN, ekki summa — hver pollun telur ur ollum listanum,
     svo hun er SETT og aldrei logd vid.                                */
  const pickNo = taken.size + offBoard + 1;

  /* ============================================================
     UMFERDIRNAR ERU NAKVAEMLEGA THAER SEM DEILDIN HEFUR
     ============================================================
     Hér stod `(league.rounds || 15) + 2`. Tveir aukaumferdirnar voru
     slaki an heimildar og their LUGU I SIDUSTU UMFERD, sem er einmitt
     umferdin thar sem svarid skiptir mestu:

       10 lid, 15 umferdir, saeti 7. A minu vali i 15. umferd skilar
       `nextOwnPick(..., 17)` valinu **154** — vali sem er ekki til i
       150 vala drafti. Bordid litar tha hvern einasta mann "obidu"
       (hann lifir svo sannarlega til vals sem kemur aldrei) og
       kassinn skrifar "Your next pick is 154". Notandi sem trystir
       thvi sleppir manni i SIDASTA vali sinu.

     `null` er rett svar og thad er BORID ALLA LEID: bordid litar tha
     ekkert (engin fullyrding) og kassinn segir berum ordum ad thetta se
     sidasta valid. Sja `lastPick` i `advice.js` — thad er ANNAD en
     `nextPick: null`, sem thydir afram "eg veit ekki saetið, giskadu"
     og er rett i handvirku drafti.                                   */
  /* ============================================================
     SNAKK-TOLURNAR KOMA UR DRAFTINU THEGAR THAD ER TENGT
     ============================================================
     `draftShape` er lesid ur `/draft/{id}` (`settings.teams` /
     `settings.rounds`) — skrad stadreynd, ekki agiskun. Vanti hun
     (handvirkt draft, engin tenging) fellur allt i deildina, sem er
     rett: tha er deildin eina heimildin sem til er.

     TOLURNAR ERU ThVINGADAR. `settings` er ytra svar og `NaN` i
     lidafjolda myndi gera hverja snakk-tolu ad `NaN` — sama aett og
     `{"teams":"abc"}` i `normalizeLeague`.                            */
  const dTeams = Math.round(Number(draftShape && draftShape.teams));
  const dRounds = Math.round(Number(draftShape && draftShape.rounds));
  const hasDraftTeams = Number.isFinite(dTeams) && dTeams >= 2 && dTeams <= 32;
  const hasDraftRounds = Number.isFinite(dRounds) && dRounds >= 1 && dRounds <= 40;
  const snakeTeams = hasDraftTeams ? dTeams : (Number(league.teams) || 12);
  const rounds = hasDraftRounds ? dRounds : (league.rounds || 15);
  /* Hve morg vol eru i draftinu ALLS. Þetta er thakid sem "Pick 151"
     bratt — og thad er nu talid ur draftinu sjalfu. */
  const totalPicks = snakeTeams * rounds;

  /* ============================================================
     SAETI SEM PASSAR EKKI VID DEILDINA ER OTHEKKT SAETI, EKKI SIDASTA VAL
     ============================================================
     `nextOwnPick` skilar `null` af THREMUR olikum astaedum og adeins EIN
     theirra thydir "thu att ekkert val eftir":

       (a) inntak vantar            -> vitum ekki
       (b) `slot > teams`           -> saetid a ekki heima i thessari deild
       (c) umferdirnar eru bunar    -> SIDASTA VALID

     Bordid lagdi (b) og (c) ad jofnu og fullyrdingin sem kom ut var
     **rong og truverdug**: i 10-lida deild med saeti 12 stod
     **"This is your last pick — you have none after it." vid val 1**,
     hver lifunartala var `—` og bordid litadi ekkert. Maelt i jsdom:
     saeti 7 -> "next pick 7, 6 picks away"; saeti 11 og 12 -> sidasta-val
     fullyrdingin, strax.

     ÞAD ER EKKI TILGATA UM NOTANDA SEM SLAER VITLAUST INN. Reiturinn
     leyfir 1-16 an tillits til deildarinnar, `normalizeSync` geymir
     1-32, OG — algengara — mock-draft i annarri staerd les saetid sitt
     beint ur `draft_order`: 12-lida mock gefur saeti 11 eda 12 inn i
     10-lida deild an thess ad nokkur slaí neitt inn.

     `slotOk` skilur thau ad. Se saetid ogilt hegdar bordid ser eins og
     ekkert saeti se thekkt — engin litun, engin fullyrding — og
     `SleeperSync` SEGIR fra thvi (kassinn "Slot N does not exist in a
     T-team league"). Ad thegja vaeri ad skipta einni rangri fullyrdingu
     ut fyrir tomt bord an skyringar. */
  const slotRaw = (sync && sync.slot) != null ? Number(sync.slot) : null;
  /* SAETID ER SAETI I DRAFTINU, svo thad er borid vid lidafjolda
     DRAFTSINS. Adur var thad borid vid deildina, sem gaf tvennt rangt i
     einu i mock-i af annarri staerd: 12-lida mock gaf saeti 11-12 sem
     "er ekki til" i 10-lida deild (bordid slokknadi), og 10-lida mock
     gaf saeti sem "er til" i 12-lida deild en var vitlaust vegid. */
  const slotOk = slotRaw != null && Number.isFinite(slotRaw) &&
                 slotRaw >= 1 && slotRaw <= snakeTeams;

  const reach = useMemo(() => {
    const m = new Map();
    if (!slotOk) return m;
    const np = nextOwnPick(pickNo, snakeTeams, slotRaw, rounds);
    if (np == null) return m;
    for (const r of rows) {
      if (r.adp == null) continue;
      const p = survivalProb(r.adp, r.adpSd, np);
      if (p != null) m.set(r.id, p);
    }
    return m;
  }, [rows, pickNo, slotOk, slotRaw, snakeTeams, rounds]);

  const nextOwn = useMemo(() => {
    if (!slotOk) return null;
    return nextOwnPick(pickNo, snakeTeams, slotRaw, rounds);
  }, [pickNo, slotOk, slotRaw, snakeTeams, rounds]);
  /* Saetið er thekkt OG gilt EN ekkert val er eftir — thad er allt annad
     astand en "saetið er othekkt", og adeins fyrra ma slokkva a
     lifunartolunum. */
  const lastPick = slotOk && nextOwn == null;

  /* ============================================================
     ALLAR BREYTINGAR ERU FOLL AF FYRRA ASTANDI, EKKI AF MYND AF THVI
     ============================================================
     ÞETTA VAR ALVARLEGASTA VILLAN I nfl/ OG HUN TOK FIMM SEKUNDUR AD
     BIRTAST: notandinn smellti, sá rett, og sidan hvarf thad.

     `onPicks` var orva-fall sem var buid til i hverri teikningu og
     lokadist um `taken`/`myPicks` EINS OG THAU VORU THA. Pollunar-
     effectid ber `[live, sync.draftId, sync.slot, byId]` i deps — EKKI
     `onPicks` — svo `setInterval` helt afram ad kalla GOMLU utgafuna,
     og vid hvern tikk var mengid endurbyggt ur urveltri mynd:

         const t = new Set([...taken, ...ids]);   // `taken` er gamalt

     Handvirkt val sem kom EFTIR ad effectid keyrdi var thvi ekki i
     `taken` og hvarf — og `persist` skrifadi afturforina, svo hun lifdi
     endurhledslu.

     Foll af fyrra astandi geta ekki skeikad thannig: React gefur theim
     alltaf NUVERANDI gildi, oháð thvi hvenaer lokunin vard til. Thess
     vegna er `onPicks` lika `useCallback` med tomum deps — hun tharf
     ekki ad endurnyjast, og tha getur ekkert i henni orðið gamalt.

     Vordur: `tests/sleeper.mjs` kafli 2c bidur raunverulegar 5,5
     sekundur og krefst thess ad handvirkt val lifi pollunar-tikk. */
  /* ============================================================
     SLEEPER MA TAKA TIL BAKA — SAMMENGI GETUR ÞAÐ EKKI
     ============================================================
     ÞETTA VAR `new Set([...prev, ...ids])` OG ÞAÐ ER EINSTEFNA. Listinn
     fra Sleeper getur STYST, og hann gerir thad af thremur astaedum sem
     allar gerast a draftkvoldi:

       · umsjonarmadur EYDIR vali (rangur madur, botur sem for af stad)
       · saetid er leidrett — thu smelltir a rangt lid og lagadir thad,
         og tha eru `mine` ONNUR vol en adur
       · thu tengist ODRU drafti (annad mock) an thess ad hreinsa fyrst

     Med sammengi lifdu gomlu volin i öllum thremur. Þad er ekki adeins
     nafn a lista: `pickNo = taken.size + offBoard + 1`, svo eitt val sem
     gleymist aldrei skekkir valnumerid — OG THAR MED naesta eigid val og
     hverja lifunartolu — ALLT SEM EFTIR ER AF DRAFTINU. Maelt: val dregid
     til baka vid val 20 skildi bordid eftir a 21 ad eilifu.

     Lausnin er MISMUNUR, ekki sammengi: thad sem VAR i sidasta
     Sleeper-svari en er ekki i thessu er fjarlaegt, og thad sem er i
     thessu er baett vid. Handvirk vol (`take`) voru aldrei i
     Sleeper-svarinu og geta thvi ekki lent i fjarlaegdu mengi — thau
     lifa af, sem er retta hegdunin: thau eru thin skraning, ekki hans.

     Refin er SANNLEIKURINN UM SIDASTA SVAR og hun ma ekki reikna sig
     ut ur `taken` (thar eru handvirku volin lika). Hun er skilgreind
     OFAR i skranni (vid `taken`) thvi skipti um bord nullstilla hana.

     OG ÞAD DUGAR EKKI EITT AD MISMUNURINN SE RETTUR. Refin er `useRef`,
     svo hun byrjar TOM vid hverja hledslu medan `taken` kemur ur
     geymslunni. Fyrsta pollun eftir mount hefur thvi ekkert i `gone` og
     getur EKKERT ANNAD EN BAETT VID — mismunurinn fellur nidur i
     sammengi thvert yfir F5. Þad er onnur helft villunnar sem
     `boardScope` lagar; sja notuna thar. Hin helftin — handvirk vol eru
     VILJANDI utan mismunarins — laekki ekki heldur, og hvorug er
     lagfaeranleg her: THAU EIGA AD LIFA innan sins drafts.            */
  const onPicks = useCallback((ids, mineIds, offCount) => {
    /* Sleeper hefur talad — bordid er ekki lengur "endurheimt ur vafra". */
    setRestored(0);
    const nextIds = new Set(ids), nextMine = new Set(mineIds);
    const prevSync = lastSync.current;
    const reconcile = (prev, gone, add) => {
      const out = new Set(prev);
      for (const id of gone) if (!add.has(id)) out.delete(id);
      for (const id of add) out.add(id);
      return out;
    };
    setTaken((prev) => reconcile(prev, prevSync.ids, nextIds));
    setMyPicks((prev) => reconcile(prev, prevSync.mine, nextMine));
    lastSync.current = { ids: nextIds, mine: nextMine };
    /* SETT, EKKI LOGD VID — `unknown` er talid ur ollum listanum i hverri
       pollun. `null`/skokk gildi ma ekki verda `NaN` i valnumerinu. */
    const n = Math.round(Number(offCount));
    setOffBoard(Number.isFinite(n) && n >= 0 ? n : 0);
  }, []);

  const take = (r, mine) => {
    setRestored(0);
    setTaken((prev) => new Set(prev).add(r.id));
    if (mine) setMyPicks((prev) => new Set(prev).add(r.id));
  };
  const undo = (r) => {
    setRestored(0);
    setTaken((prev) => { const t = new Set(prev); t.delete(r.id); return t; });
    setMyPicks((prev) => { const m = new Set(prev); m.delete(r.id); return m; });
  };
  /* ============================================================
     RESET VERDUR AD SLITA SAMSTILLINGUNNI LIKA
     ============================================================
     Þetta hreinsadi `taken`/`myPicks`/`offBoard` en LET
     Sleeper-tenginguna stada. Pollunin gengur a `sync.draftId`, svo
     naesta polla (innan sekunda) kalladi `onPicks` med ollum volunum
     aftur og bordid FYLLTIST UM LEID. Notandinn sa thvi engan mun.

     Þad bitur nakvaemlega i tilfellinu sem beðið var um: MOCK-DRAFT.
     Þu prufar eitt, vilt byrja upp a nytt — og "Reset board" gerdi
     ekkert af thvi ad mock-draftid er enn tengt og enn med sin vol.

     Þess vegna er `draftId` hreinsad med. `slot` (saetid) HELST: thad er
     stilling notandans a deildinni, ekki hluti af thessu drafti, og hann
     situr venjulega i sama saeti i naesta mock-i. Ad hreinsa hann vaeri
     ad henda stillingu sem hann setti sjalfur.                        */
  const reset = () => {
    setRestored(0);
    setTaken(new Set());
    setMyPicks(new Set());
    setOffBoard(0);
    /* Minnid um sidasta svar fer LIKA. Annars vaeri "hreinsa" hálft:
       mismunar-reglan i `onPicks` bæri afram vol ur drafti sem er buid
       ad slita, og fyrsta pollun naesta drafts hefdi rangan grunn. */
    lastSync.current = { ids: new Set(), mine: new Set() };
    /* OG GEYMSLAN LIKA, BERUM ORDUM. Ad slita tenginguna faerir bordid
       yfir a deildar-lykilinn (`boardScope`), svo `setTaken(tomt)` hér
       aetti aldrei leid i lykil DRAFTSINS — hann sæti oskertur eftir og
       endurtenging vid sama draft hefdi skilad volunum ur geymslu i stad
       thess ad lesa thau upp a nytt fra Sleeper. Hnappur sem segist
       hreinsa verdur ad hreinsa thad sem hann synir. */
    D.saveScoped(kTaken, []);
    D.saveScoped(kMine, []);
    if (sync && sync.draftId) setSync((prev) => ({ ...prev, draftId: "" }));
  };

  return (
    <>
      {/* `sync` BYR I `App.jsx` MED DEILDINNI.
          Tvennt kalladi a thad. (1) Vistunar-umgjordin her tok adeins
          vid GILDI, en `pull()` kallar `setSync(prev => ...)` thegar
          `draft_order` baetist vid i midjum polli — tha var FALLID
          sjalft sent i `saveState`, `JSON.stringify` a falli skilar
          `undefined`, og strengurinn "undefined" lenti i
          `localStorage`, svo saetid TAPADIST vid naestu hledslu thott
          skjarinn hefdi synt thad rett alla lotuna. (2) Thessi hlutur
          er endurraestur vid svissun, svo draft-id sem vaeri skrifad
          hingad myndi hverfa i somu andra sem ny deild er flutt inn. */}
      {/* HNAPPURINN ER HER, EKKI NIDRI I BORDS-STIKUNNI (16.8.2026).
          Beidni notandans: "settu reset takkann ofar, vid hlidina a live
          connect". Rokin eru staerri en thaegindin — hann er thurfandi a
          NAKVAEMLEGA thvi augnabliki sem draft er sett upp: nytt mock,
          nytt audkenni, kveikt a samstillingu. Adur sat hann 300 px nedar
          vid hlidina a "N drafted", svo hann thurfti ad leita ad honum
          medan bordid syndi vol einhvers annars.

          `taken`/`myPicks` bua HER (thau eru bordid), svo adgerdin er
          send NIDUR i staðinn fyrir ad lyfta mengjunum upp. */}
      <SleeperSync sync={sync} setSync={setSync} league={league}
        sleeperUser={sleeperUser} setSleeperUser={setSleeperUser}
        season={season} rows={rows} taken={taken} onPicks={onPicks}
        imported={imported} warnings={warnings} teams={teams}
        onImportLeague={onImportLeague} onRereadRules={onRereadRules}
        shapes={shapes}
        /* SAMSTILLINGIN ER SKORDA OFAN FRA, EKKI BOOLEAN HER INNI. Sja
           `liveScope` i `App.jsx`: hlutur sem er endurraestur vid
           innflutning getur ekki haldid sinni eigin "kveikt"-stodu, og
           thad var astaedan fyrir tveimur hnoppum. */
        leagueKey={leagueKey}
        live={!!liveScope && liveScope === scope}
        onLive={setLiveScope}
        /* LOGUN DRAFTSINS ER LYFT UPP. Hun var lokud inni i thessum hlut
           og var ADEINS notud til ad prenta vidvorun — medan bordid
           reiknadi hverja snakk-tolu ur deildinni. Talan var til allan
           timann; hun var einfaldlega ekki spurd. */
        onShape={onShape}
        /* UTKOMAN UR `boardShape`, SAMA HLUTUR SEM TOLURNAR ERU REIKNADAR
           UR. Ljosid og talnagrunnurinn lesa eitt og hid sama, svo their
           geta ekki sagt sitthvad. */
        board={board}
        onReset={reset}
        /* Virkur ef eitthvad er ad hreinsa — vol, min vol, oporud vol EDA
           tenging. Skilyrdid var `!taken.size` og thad laesti hnappnum a
           tengdu mock-i sem hafdi engin porud vol, svo notandinn gat ekki
           slitid sig fra draftinu. */
        resetOff={!taken.size && !myPicks.size && !offBoard &&
                  !(sync && sync.draftId)}
        restored={restored} restoredMine={myPicks.size} />

      <NextPick available={available} kdst={kdst} roster={myRoster} pick={pickNo} nextOwn={nextOwn}
        lastPick={lastPick} league={league} sync={sync}
        /* ThAKID KEMUR HINGAD REIKNAD, ur logun DRAFTSINS. Adur reiknadi
           `NextPick` thad sjalft ur `league` og hleypti thvi "Pick 151"
           i gegn i 150 vala drafti. */
        totalPicks={totalPicks} snakeTeams={snakeTeams} snakeRounds={rounds} />

      <MarketMoving rows={rows} taken={taken} onTake={take} />

      <ScarcityBar scarcity={scarcity} league={league} />

      <div className="panel">
        <div className="row">
          <div className="chips">
            {["QB", "RB", "WR", "TE", "K", "DST"].map((p) => (
              <button key={p} className={`chip${posFilter.includes(p) ? " on" : ""}`}
                onClick={() => setPosFilter((f) =>
                  f.includes(p) ? f.filter((x) => x !== p) : [...f, p])}>{p}</button>
            ))}
            {posFilter.length > 0 && (
              <button className="chip" onClick={() => setPosFilter([])}>clear</button>
            )}
          </div>
          <div className="spacer" />
          <span className="dim" style={{ fontSize: 12.5 }}>
            {taken.size} drafted · {myPicks.size} yours
          </span>
        </div>

        {!meta.sharpMeasured && (
          <div className="note warn">
            <b>Sharp rankings are not available.</b> The accuracy measurement has not
            run, so every source is weighted equally. Columns marked <i>Sharp</i> are
            blank rather than showing an unmeasured number that would look measured.
          </div>
        )}
        {/* ============================================================
            SHARP Δ ER PPR-TALA I HVAÐA DEILD SEM ER — OG ÞAÐ VAR ÓSAGT
            ============================================================
            `sharpDelta = ecr - sharpRank` (`build.js`) notar FLATA
            `p.ecr`-svidid, sem er PPR. Skorpu bordin sjalf eru lika PPR
            og adeins PPR — `fantasypros.mjs` sækir tha med
            `scoring = "PPR"` sjalfgefid — svo talan er innbyrdis
            samkvaem: PPR gegn PPR. Hun er thad EKKI gagnvart
            ECR-DALKINUM vid hlidina, sem fylgir stigagjof deildarinnar.

            MAELT 16.8.2026 gegnum `buildRows` (leidin sem notandinn ser):
              · half-PPR, topp 60: **54 rodir** thar sem birt ECR mínus
                birt Sharp # er EKKI birta Sharp Δ
              · standard, topp 60: **56 rodir**, og i **17** theirra
                SNYST FORMERKID VID
              · versta tilfellid: Derrick Henry i standard ber ECR **12**
                og Sharp Δ **+2** (les: skorpu bordin eru hrifnari), medan
                skorpu rodin hans er **36** — gegn ECR-inu sem stendur vid
                hlidina er talan **-24**

            ÞETTA SLAPP FRAM HJA VERDINUM SEM VAR SKRIFADUR GEGN NAKVAEMLEGA
            THESSU. `PlayerTable` varar vid thegar ECR-dalkurinn er PPR i
            deild sem er thad ekki — en su vordur les `ecrScoring`, og
            ECR-dalkurinn er nu RETT snid. Sharp Δ laumast framhja af thvi
            ad hun ber ekkert svid sem segir hvad hun er.

            TALAN ER EKKI BREYTT. Ad reikna hana gegn snid-ECR-inu vaeri
            ad blanda PPR-skorpurod vid standard-samsteypu — verri villa i
            hina attina — og hvada rod skorpu bordin gaefu i standard er
            OMAELT (their birta thad ekki). Þad sem var lagfaert er
            THOGNIN: grunnurinn er nu sagdur, alltaf, i hvada sniði sem er.

            Vordur: `tests/render.mjs` kafli 2 (setningin er a skjanum) og
            `tests/model.mjs` kafli 8b (talan ER pprEcr - sharpRank, svo
            enginn "lagfaeri" hana thegjandi i hina attina).           */}
        {meta.sharpMeasured && (
          <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>
            <b>Sharp Δ is measured against the PPR consensus</b>, not against the ECR
            column beside it: the expert boards we score accuracy on are published in
            PPR only.
            {league.scoring !== "ppr" && (
              <> Your league is{" "}
                <b>{league.scoring === "half-ppr" ? "half-PPR" : "standard"}</b>, so the
                two columns will not subtract to each other — and for a handful of
                players the sign differs. Read Sharp Δ on its own.</>
            )}
          </div>
        )}
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
        <div className="grow">
          <BoardTable rows={shown.slice(0, 200)} onTake={take} taken={taken}
            reach={reach} nextOwn={nextOwn} />
        </div>
        <MyRoster roster={myRoster} league={league} onUndo={undo} />
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h2>Kickers and defences</h2>
        <div className="sub">
          Listed separately, and last, on purpose.
        </div>
        <div className="note warn">
          <b>Every simulation in this app excluded them.</b> The ordering that beats
          ADP and Sleeper was measured on quarterbacks, backs, receivers and tight
          ends only, so putting a defence into that list would be an unmeasured number
          sitting next to measured ones. Value over replacement would place the top
          defence around pick 77 — nobody drafts that way, because defences swing
          wildly week to week and can be swapped every Tuesday, which the projection
          cannot see.
        </div>
        {/* ============================================================
            EINA MAELDA REGLAN UM THESSI TVO SAETI
            ============================================================
            A-Ranking radar theim ekki og a ekki ad gera thad. En thogn
            er ekki hlutleysi thegar akvordunin er ohjakvaemileg —
            notandinn VERDUR ad taka spyrnumann. `kicker-lab.mjs` maeldi
            tvaer reglur (adeins tvaer, svo engin thung leidretting fyrir
            fjolda samanburda thurfi) og onnur theirra virkar. */}
        {kickers && kickers.rules && (
          <div className="note" style={{ marginTop: 10 }}>
            <b>If you want a rule for the kicker: take one of last season's top five.</b>
            {" "}Measured on {kickers.seasons.length} seasons — worth{" "}
            <b>{kickers.rules.top5.gain > 0 ? "+" : ""}{kickers.rules.top5.gain} points
            over a season</b> ({(kickers.rules.top5.gain / 17).toFixed(2)} a week) against
            another starting kicker, positive in {kickers.rules.top5.wins} of{" "}
            {kickers.rules.top5.years} seasons.
            {" "}Picking the kicker on last year's best offence is <b>not</b> worth
            anything ({kickers.rules.bestOffence.gain > 0 ? "+" : ""}
            {kickers.rules.bestOffence.gain} points, {kickers.rules.bestOffence.wins} of{" "}
            {kickers.rules.bestOffence.years} seasons).
            <br /><br />
            Keep the size in mind before spending a pick: a kicker's season carries over
            to the next one barely at all (<b>r = {kickers.persistence.K.r}</b>, against{" "}
            {kickers.persistence.RB.r} for backs and {kickers.persistence.WR.r} for
            receivers), and even with perfect hindsight the gap from the best kicker to
            the twelfth is only {kickers.hindsightGain} points a season —{" "}
            {(kickers.hindsightGain / 17).toFixed(2)} a week. <b>It is a last-round pick.</b>
          </div>
        )}
        <div className="chips">
          {kdst.slice(0, 16).map((r) => (
            <button key={r.id} className="chip" onClick={() => take(r, true)}
              title={`VBD ${r.vbd == null ? "—" : r.vbd.toFixed(1)}`}>
              {r.pos} {r.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   SKORTSTADAN
   ============================================================ */
function ScarcityBar({ scarcity, league }) {
  const order = ["QB", "RB", "WR", "TE"];
  return (
    <div className="panel">
      <h2>Positional scarcity</h2>
      <div className="sub">
        How many players are left in each remaining tier. A tier that is down to its
        last one or two is the reason to reach; a tier with twelve left is the reason
        to wait.
      </div>
      <div className="kpis">
        {order.map((pos) => {
          const s = scarcity[pos];
          if (!s) return null;
          const tiers = [...s.tiers.entries()].sort((a, b) => a[0] - b[0]).slice(0, 4);
          return (
            <div className="kpi" key={pos} style={{ minWidth: 150 }}>
              <div className="k"><span className={`pos ${pos}`}>{pos}</span>
                {" "}{s.total} left</div>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                {tiers.map(([t, n]) => (
                  <div key={t} style={{ display: "flex", gap: 6, alignItems: "center",
                    fontSize: 12 }}>
                    <span className="dim" style={{ width: 46 }}>tier {t}</span>
                    <span className="bar" style={{ width: Math.min(72, n * 6) }} />
                    <span className={n <= 2 ? "bad mono" : "mono"}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   BORDID
   ============================================================ */
function BoardTable({ rows, onTake, reach, nextOwn }) {
  const has = reach && reach.size > 0;
  /* ============================================================
     HVAR VBD FER UNDIR NULL — OG HVERS VEGNA ThAD MA SJAST
     ============================================================
     Bordid ber 557 menn og draftid er 150 vol, en **adeins 78 hafa
     POSITIFT VBD** (maelt 18.8.2026, 10-lida PPR). Fra rod ~79 og nidur
     er rodin thvi "minnst negatift VBD" — og thad er ONNUR SPURNING en
     efri helmingurinn svarar:

       VBD > 0  "hversu miklu betri en madurinn sem er FRIR a hans stodu"
       VBD < 0  "hversu miklu VERRI en madurinn sem er frir a hans stodu"

     Nedan vid nullid er samanburdur milli stoda enn REIKNANLEGUR en
     hann er ekki lengur akvordunin sem hann var: thu myndir hvorugan
     BYRJA. Og maelingin sem rettlaetir rodina (+233,6 gegn ADP,
     `accuracy.js`) er skorud a BYRJUNARLIDINU — bekkjarval skorar 0
     nema thad komist i lidid — svo hun hefur naestum ekkert vald a
     thessu bili. Talan er ekki rong; hun er MINNA MAELD.

     ThVI ER LINAN DREGIN OG SOGD. Rodin haggast EKKI (hun er fryst og
     hun er maeld); thetta er BIRTING, nakvaemlega eins og threpalinurnar
     hja hlidinni. Ad thegja um skilin vaeri ad birta tvo olikar
     merkingar i somu dalki, eins letradar — sem er sama aett og
     "ofullkomin tala fullyrdir ekki".                              */
  const negFrom = rows.findIndex((r) => r.vbd != null && r.vbd <= 0);
  return (
    <div className="tablewrap">
      {negFrom > 0 && (
        <div className="dim" style={{ fontSize: 11.5, padding: "6px 9px 0" }}>
          <b>{negFrom}</b> of these {rows.length} are above replacement. Below the
          marked line VBD is <b>negative</b> — those are bench picks, and comparing
          them <i>across</i> positions means much less: you would not start either
          one. The backtest that justifies this order scores <b>starters only</b>, so
          it has almost no power down there. The order is unchanged; the line is not.
        </div>
      )}
      {/* Skyringin er SKILYRT vid ad liturinn se raunverulega a. Fost
          skyring undir toflu an lita vaeri fullyrding um merki sem er
          ekki thar — og hun vaeri thogul, thvi hun les eins hvort sem
          saetid er thekkt eda ekki. */}
      {has && (
        <div className="dim" style={{ fontSize: 11.5, padding: "6px 9px 0" }}>
          Will he last to your next pick
          {nextOwn ? ` (#${nextOwn})` : ""}?
          <span className="reach-key reach-hi">yes — you can wait</span>
          <span className="reach-key reach-lo">no — take him now</span>
          <span className="dim"> · unshaded = too close to call, or no ADP</span>
        </div>
      )}
      <table className="data">
        <thead>
          <tr className="cols">
            <th className="txt frozen">Player</th>
            <th className="txt">Pos</th>
            <th className="txt">Tm</th>
            <th>Bye</th>
            <th title="Value over replacement in your league">VBD</th>
            <th title="Blended projection">Proj</th>
            <th title="Tier by gaps in VBD">Tier</th>
            <th title="Average draft position in your format">ADP</th>
            <th title="Rounds later the market takes him than our rank. Positive = value.">Value</th>
            <th title="Expert consensus rank">ECR</th>
            <th title="Consensus of only the boards that beat random last year">Sharp Δ</th>
            <th title="2025 points per game">PPG 25</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const brk = i > 0 && rows[i - 1].tier !== r.tier;
            const p = reach ? reach.get(r.id) : undefined;
            /* `i === negFrom` og ekki `r.vbd <= 0`: linan er EITT skil,
               ekki litur a hverri rod thar nidur. Skilyrdid `> 0` ver
               tilfellid thar sem ENGINN er yfir varamanni (tha er engin
               skil ad draga — allt bordid er undir og linan efst vaeri
               fullyrding um bil sem er ekki thar). */
            const cls = [brk ? "tierline" : "", reachClass(p),
                         negFrom > 0 && i === negFrom ? "vbdzero" : ""]
              .filter(Boolean).join(" ");
            return (
              <tr key={r.id} className={cls}>
                <td className="txt frozen"
                  title={p == null ? undefined
                    : `${Math.round(p * 100)}% likely to last until your next pick`}>
                  {r.name}
                  {r.rookie && <span className="badge" style={{ marginLeft: 6 }}>R</span>}
                  {/* ROD LITSINS KEMUR UR `avail`, EKKI UR NAFNALISTA.
                      Hér stod `r.injury === "Out" || r.injury === "IR"`, svo
                      **PUP, Suspended, NA, DNR og Practice Squad** — allt
                      tiltaekileiki 0 — komu GUL, vid hlidina a graenu
                      "+5,4 umferdir". Tveir litir um sama mann a somu rod.
                      `AVAIL` i model.js er heimildin og hun ber ellefu
                      gildi sem thydja "spilar ekki"; talan hennar er
                      spurd, ekki tvo af nofnunum. */}
                  {r.injury && r.injury !== "Active" && (
                    <span className={`badge ${r.avail === 0 ? "bad" : "warn"}`}
                      style={{ marginLeft: 6 }}>{r.injury}</span>
                  )}
                </td>
                <td className="txt"><span className={`pos ${r.pos}`}>{r.pos}</span></td>
                <td className="txt dim">{r.team || "—"}</td>
                <td className="mono dim">{r.bye ?? <span className="null">—</span>}</td>
                <td className="mono"><b>{r.vbd?.toFixed(1)}</b></td>
                <td className="mono">{n(r.proj)}</td>
                <td className="mono dim">{r.tier ?? "—"}</td>
                <td className="mono dim">{n(r.adp)}</td>
                {/* OFULLKOMIN TALA FULLYRDIR EKKI — sama regla og gulu
                    hausarnir i FPL-hlutanum. Talan sjalf er birt (ad
                    fela hana vaeri ad fela ad merkid se thar), en
                    GRAENA "kaup"-merkid er tekid af manni sem spilar
                    ekki: thad er fullyrding sem spain a bak vid hana
                    getur ekki barid. */}
                <td className={`mono ${r.avail === 0 ? "dim"
                  : r.value > 0.5 ? "good" : r.value < -0.5 ? "bad" : ""}`}
                  title={r.avail === 0
                    ? `${r.injury || "unavailable"} — projection is not discounted for this,`
                      + " so this figure is not a buy signal"
                    : undefined}>
                  {r.value == null ? <span className="null">—</span> : signed(r.value)}
                </td>
                <td className="mono dim">{r.ecr ?? <span className="null">—</span>}</td>
                <td className={`mono ${r.sharpDelta > 3 ? "good" : r.sharpDelta < -3 ? "bad" : ""}`}>
                  {r.sharpDelta == null ? <span className="null">—</span>
                    : signed(r.sharpDelta, 0)}
                </td>
                <td className="mono">{n(r.lastPpg)}</td>
                <td className="txt" style={{ whiteSpace: "nowrap" }}>
                  <button className="act" style={{ padding: "2px 8px", fontSize: 11.5 }}
                    onClick={() => onTake(r, true)}>mine</button>
                  <button className="act" style={{ padding: "2px 8px", fontSize: 11.5, marginLeft: 4 }}
                    onClick={() => onTake(r, false)}>gone</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const n = (v) => (v == null || !Number.isFinite(v)
  ? <span className="null">—</span> : v.toFixed(1));

/* `signed` bjo hér adur. Hun var flutt i columns.js thvi leikmanna-
   listinn tharf hana lika og erfdi hana ekki — sja notuna thar. */

/* ============================================================
   MITT LID
   ============================================================ */
function MyRoster({ roster, league, onUndo }) {
  const byPos = {};
  for (const r of roster) (byPos[r.pos] = byPos[r.pos] || []).push(r);
  const need = league.starters || {};
  const total = roster.reduce((a, r) => a + (r.proj || 0), 0);

  return (
    <div className="panel" style={{ width: 300, flexShrink: 0 }}>
      <h2>My team</h2>
      <div className="sub">
        {roster.length} picks · {total ? total.toFixed(0) : 0} projected points
      </div>
      {!roster.length && (
        <div className="dim" style={{ fontSize: 12.5 }}>
          Press <b>mine</b> on the board, or connect a Sleeper draft above and it
          fills itself.
        </div>
      )}
      {["QB", "RB", "WR", "TE", "K", "DST"].map((pos) => {
        const list = byPos[pos] || [];
        if (!list.length && !need[pos]) return null;
        return (
          <div key={pos} style={{ marginBottom: 8 }}>
            <div className="dimmer" style={{ fontSize: 10.5, letterSpacing: ".8px",
              textTransform: "uppercase" }}>
              {pos} <span className={list.length < (need[pos] || 0) ? "warn" : ""}>
                {list.length}/{need[pos] || 0}
              </span>
            </div>
            {list.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "center",
                fontSize: 12.5, padding: "1px 0" }}>
                <span className="grow" style={{ overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                <span className="mono dim">{r.proj != null ? r.proj.toFixed(0) : "—"}</span>
                <button className="act" style={{ padding: "0 5px", fontSize: 11 }}
                  onClick={() => onUndo(r)}>✕</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   BEIN TENGING VID SLEEPER-DRAFT
   ============================================================
   Sleeper sendir CORS-hausa svo thetta gengur BEINT ur vafranum —
   enginn proxy, enginn lykill. Thad er astaedan fyrir thvi ad
   lifandi fylgni er moguleg hér en ekki gagnvart ESPN eda Yahoo.

   PORUN VID OKKAR RODIR er a `sleeperId`, sem ER audkenni okkar
   leikmannarada (`players.json` er byggð Sleeper-midjad). Thess
   vegna er engin nafna-porun i thessu ferli — hun vaeri sidasta
   thad sem madur vill i beinni med 30 sekundur a klukkunni.
   ============================================================ */
/* ============================================================
   EITT REIT, EINN HNAPPUR, TVAER STODUR — 19.8.2026
   ============================================================
   BEIDNI NOTANDANS, ThRISVAR: "eg vill bara hafa eitt plass til ad
   paista (ma gera league id eda allt url), og svo connect button sem
   tengir allt og status ljos sem segir connected eda disconnected med
   graenu og raudu."

   Spjaldid bar SEX styringar og malsgrein af texta: deildarslod +
   Connect, "or", notandanafn + Find leagues, Draft ID, Your slot, og
   Start live sync. Hver theirra var svar vid raunverulegu tilfelli —
   og samanlagt vard tengingin sjalf verkefni a draftkvoldi.

   ÞRENNT ER LEITT UT I STAD THESS AD SPYRJA:
     · HVAD var limt inn — `parseSleeperInput` greinir slod, deild eda
       draft, og notandanafn er REYND TIL VARA (sja `connect`)
     · HVAR THU SITUR — `resolveSlot`, sem var thegar til
     · HVENAER A AD POLLA — Connect kveikir a samstillingu i somu adgerd

   OG EITT ER ThAD EKKI: LOGUNIN. Se draftid i annarri staerd en deildin
   sem bordid reiknar er tengingin **RAUD**, ekki graen. Sja langa notuna
   vid stoduljosid nedar — thad er villan sem kostadi hann mock-draft, og
   hun er astaedan fyrir thvi ad "tokst kallid?" er EKKI sama spurning og
   "ertu tengdur?".                                                     */
function SleeperSync({ sync, setSync, season, rows, onPicks, shapes, league,
                       imported, warnings, teams, onImportLeague,
                       sleeperUser, setSleeperUser, onRereadRules,
                       onShape, board, onReset, resetOff, restored, restoredMine,
                       leagueKey, live, onLive }) {
  /* Nafnid er FORFYLLT ur vistada audkenninu — notandinn a ekki ad slá
     thad inn i hvert sinn, og forsidan tharf thad hvort ed er. */
  const [user, setUser] = useState(() => (sleeperUser && sleeperUser.name) || "");
  /* ============================================================
     AUDKENNID VAR **EKKI** MUNAD — OG NOTAN HER SAGDI AD THAD VAERI
     ============================================================
     Her stod: "Audkenni notandans er MUNAD thegar hann finnst. Thad er
     lykillinn ad sjalfvirku saeti." Fyrri setningin var OSONN. Gildid
     var `useState(null)` — thad lifdi hvorki F5 ne svissun a deild, thvi
     `App.jsx` endurraesir thennan hlut (`key={activeId}`). NAFNID var
     forfyllt ur `sleeperUser` (linan fyrir ofan) en AUDKENNID, sem er
     thad EINA sem `resolveSlot` getur notad, var thad ekki — thott
     `sleeperUser.userId` liggi vistad i geymslunni vid hlidina a nafninu.

     MAELT (`tests/sleeper.mjs` kafli 2bb2, tvaer lotur):
     lota 1 les saetid rett ur `draft_order` (7 af 10). Eftir endurhledslu
     — sama vafra, sama vistada notandanafni, nafnareiturinn FORFYLLTUR —
     skilar nakvaemlega sama draft **engu saeti**.

     ÞRENNT SLOKKNAR MED SAETINU, OG EKKERT THEIRRA ER THOGULT UM SIG:
       · `reach` er tomt, svo BORDID LITAR EKKERT
       · `myPicks` fyllist aldrei (`isMine` krefst `sync.slot != null`)
       · radgjafarkassinn fellur i afleidsluna og GEFUR SER ad valid a
         klukkunni se mitt. I 10-lida deild er thad rangt i 9 volum af
         10: vid val 21 skrifadi hann "Your next pick is 40" thar sem
         rett svar fyrir saeti 7 er **27**.

     Og `pull()` ber varaleid fyrir rodina sem er dregin i midju drafti
     (`sync.slot == null && userId != null && d.draft_order`) — hun var
     DAUD af somu astaedu, sem er verst a nakvaemlega thvi kvoldi sem hun
     var skrifud fyrir.

     Vordur: `tests/sleeper.mjs` kafli 2bb2. Hann keyrir TVAER lotur med
     endurhledslu a milli — an hennar getur fullyrdingin ekki brugdist,
     thvi lota 1 var alltaf rett. */
  const [userId, setUserId] = useState(
    () => (sleeperUser && sleeperUser.userId) || null);
  const [leagues, setLeagues] = useState(null);
  const [slotAuto, setSlotAuto] = useState(false);
  /* ============================================================
     TVAER OLIKAR "STODUR" — OG ThAER MEGA EKKI DEILA REIT
     ============================================================
     `status` var eitt astand fyrir bædi og thad AT sjalft sig: `connect`
     skrifadi villuna, og naesta pollun (6 ms sidar i profinu, 1,5 s i
     beinni) skrifadi `setStatus(null)` af thvi ad HUN gekk. Notandinn
     yttti a Connect a rongu audkenni og fekk ENGA svorun — bordid var enn
     tengt og villan var thurrkud ut adur en hun sast.

       `status`  = utkoma sidustu ADGERDAR notandans (Connect / nafn)
       `pollErr` = sidasta POLLUN brast; hreinsast vid naestu sem gengur

     Vordur: `draft-live.mjs` kafli 15c — mistokin tenging VERDUR ad
     segjast medan bordid sem er i gangi helst oskert.                 */
  const [status, setStatus] = useState(null);
  const [pollErr, setPollErr] = useState(null);
  const [info, setInfo] = useState(null);
  /* Val sem bordid thekkir ekki — talid, ekki hent thegjandi. */
  const [unmatched, setUnmatched] = useState(null);
  /* ============================================================
     REITURINN ER FORFYLLTUR UR TENGINGUNNI SEM ER I GILDI
     ============================================================
     Þetta var `useState("")` og reiturinn "Draft ID" bar audkennid i
     stadinn. Se reiturinn tomur eftir F5 — thegar bordid kemur oskert ur
     geymslunni og samstillingin er slokkt (asett, sja `liveScope`) —
     tharf notandinn ad LEITA AD SLODINNI UPP A NYTT til ad tengja aftur,
     i midju drafti. Forfyllt audkenni gerir endurtenginguna EINN SMELL
     og reiturinn segir jafnframt hverju appid er tengt.                */
  const [url, setUrl] = useState(() => (sync && sync.draftId) || "");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  /* Fingrafar sidasta svars, fjoldi vala og hvenaer valið hreyfdist
     sidast — sja notuna vid `sig` og pollunar-hradann nedar. */
  const lastSig = useRef(null);
  const lastCount = useRef(null);
  const lastMove = useRef(0);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  /* ============================================================
     REGLURNAR ERU LESNAR, EKKI SLEGNAR INN
     ============================================================
     ÞETTA VAR STAERSTA GATID I TENGINGUNNI OG THAD VAR THOGULT.
     Appid las VOLIN ur Sleeper en engar REGLUR. Lidafjoldi, stigagjof
     og byrjunarsaeti voru slegin inn i hendi i flipastikunni — og thau
     eru ekki skraut: `teams` og `scoring` raeda BADUM hvada ADP er
     lesid OG hvar varamanns-threpid liggur (`model.js`). Deild sem er
     slegin inn rangt reiknar adra deild en notandinn spilar i, og hun
     gerir thad med tolum sem lita nakvaemlega eins ut.

     Vorpunin sjalf er i `sleeper-league.js` — HREIN og profud, svo
     profin keyri somu vorpun og appid notar.                        */
  /* ============================================================
     SAETID ER LEYST **EINU SINNI**, ADUR EN NOKKUD ER SKRIFAD
     ============================================================
     ÞETTA VAR VILLA I FYRSTU UTGAFU FJOL-DEILDA-STUDNINGSINS og hun
     er thess virdi ad skjala thvi hun er ALGJORLEGA THOGUL:

     `setSync` i `App.jsx` lokast um `activeId` SEM HANN VAR VID
     TEIKNINGU. Innflutningur breytir `activeId`, en React uppfaerir
     hann ekki fyrr en naesta teikning — svo `setSync` sem er kallad i
     SOMU adgerd og innflutningurinn skrifar saetid a **GOMLU**
     deildina. Notandinn hefdi seð rett saeti a skjanum (nya faerslan
     ber thad ur `onImportLeague`) meðan gamla deildin bar mengid, og
     vid naestu svissun hefdi thad birst a rangri deild.

     Lausnin er ekki ad "kalla setSync seinna" heldur ad hafa EINN
     skrifstad: saetid er leyst ur svarinu, sett i faersluna sem er
     flutt inn, og `setSync` er adeins notad thegar EKKERT er flutt inn
     (mock-draft eda draft an deildar).                              */
  const resolveSlot = (d, uid, bundle) => {
    const order = d && d.draft_order;
    const direct = order && uid != null ? Number(order[uid]) : NaN;
    if (Number.isFinite(direct)) return direct;
    if (uid != null && bundle) {
      const mine = teamsFromLeague({ ...bundle, draft: d })
        .find((t) => t.userId === String(uid));
      if (mine && mine.slot != null) return mine.slot;
    }
    return null;
  };

  /* ============================================================
     NOTANDANAFN ER **VARALEID**, EKKI FYRSTA GISK — OG THAD ER MAELT
     ============================================================
     Reiturinn tekur vid fjorum formum (deildarslod, draft-slod, bert
     deildar-audkenni, bert draft-audkenni) OG notandanafni. Fyrsta
     utgafan atti ad greina thau i sundur a forminu: "audkenni eru 18-19
     stafa snjokorn, notandanafn er ekki". Þad er RETT um Sleeper og
     RANGT sem regla: `d2`, `m12`, `L1` — audkenni sem vid tokum vid i
     dag — eru hvorugt, svo formid getur ekki skorid ur.

     Reglan er thvi ORDIN: reyndu audkennid, og AÐEINS ef Sleeper segir
     ad hvorki deild ne draft se til med thvi er notandanafn reynt.
     Kostnadurinn er tvo 404 fyrir thann sem limir inn nafn — einu sinni
     per smell — og verdid fyrir hina attina vaeri ad senda draft-audkenni
     i `/user/{nafn}` og fa svar sem lítur ut eins og notandi.          */
  const looksLikeName = (s) => /^[A-Za-z0-9_.-]{1,32}$/.test(s) && !/^\d+$/.test(s);

  /** Notandanafn -> audkenni + deildirnar hans sem chip. */
  const findLeagues = async (raw) => {
    const name = String(raw == null ? user : raw).trim();
    if (!name) return false;
    const u = await D.sleeperUser(name);
    setUserId(u.user_id || null);
    setUser(name);
    /* Lyft upp i `App` og vistad — forsidan finnur "mitt lid" ur thvi. */
    if (setSleeperUser) {
      setSleeperUser({ name, userId: u.user_id || null });
    }
    const ls = await D.sleeperLeagues(u.user_id, season);
    setLeagues(ls || []);
    setStatus(ls && ls.length
      ? `${ls.length} league${ls.length > 1 ? "s" : ""} found for ${name} — pick one.`
      : `No leagues for ${name} this season.`);
    return true;
  };

  /* ============================================================
     EITT KALL GERIR ALLT: LEYSIR, FLYTUR INN, FINNUR SAETID, KVEIKIR
     ============================================================
     Sidasta threpid — `onLive` — er nyja atridid og thad var EKKI
     mogulegt medan "kveikt" var astand inni i thessum hlut: innflutningur
     endurraesir hann (sja `liveScope` i `App.jsx`). Þess vegna voru
     hnapparnir tveir.                                                  */
  const connect = async (raw) => {
    const input = String(raw == null ? url : raw).trim();
    if (!input) return;
    setBusy(true);
    setStatus("connecting…");
    setLeagues(null);
    try {
      let bundle = null;
      try {
        bundle = await D.sleeperResolve(input);
      } catch (e) {
        /* Hvorki deild ne draft. Se thetta laesilegt nafn er thad reynt —
           annars stendur upprunalega villan, thvi hun er RETTARI bod.
           Bresti nafna-leidin LIKA er villan sem birt er su um audkennid:
           "notandi fannst ekki" um streng sem notandinn aetladi sem
           deildarslod sendir hann i ranga att.                        */
        let named = false;
        if (looksLikeName(input)) {
          try { named = await findLeagues(input); } catch { named = false; }
        }
        if (named) return;
        throw e;
      }
      const res = leagueFromSleeper({
        league: bundle.league, draft: bundle.draft, shapes });
      const teamList = teamsFromLeague(bundle);

      const d = bundle.draft;
      const slot = d ? resolveSlot(d, userId, bundle) : null;
      setSlotAuto(slot != null);

      /* ============================================================
         SAETI ERFIST **ALDREI** MILLI DRAFTA — 20.8.2026
         ============================================================
         ÞETTA ER ALVARLEGASTA VILLAN SEM FANNST I VIKUNNI OG HUN SYNDI
         NOTANDANUM HOP ANNARS MANNS SEM SINN EIGIN.

         Hann tengdi nytt mock (KanelGifler, saeti 7) og bordid syndi
         honum LID 5: Jayden Daniels, Jonathan Taylor, Etienne, Walker,
         Harvey, Price, Love, Metcalf, Pittman, Waddle, Robinson, Henry,
         Kincaid, Myers, Detroit. Nakvaemlega hopur saetis 5 — thvi i
         FYRRA mock-inu var hann saeti 5.

         Hér stod `slot: slot != null ? slot : sync.slot`. Rokin voru
         "hann situr venjulega i sama saeti i naesta mock-i" og thau eru
         ROMG: saetid er EIGINLEIKI DRAFTSINS, ekki stilling a deildinni.
         `sync` er vistad a DEILDINNI (`entries[].sync`), svo nytt mock i
         somu deild erfdi saetid — sama aett og `boardScope`-villan
         (`taken`/`myPicks` voru lyklud a deild, ekki draft) og saetid var
         einfaldlega ekki flutt med thegar hin voru.

         OG ÞAD ER EKKI EIN VILLA HELDUR FJORAR, ALLAR MELDAR SAMA DAG:
           · "10 WR i rod" — `recommend` fekk hop SAETIS 5, sem var
             hlaðinn RB (sex) og thunnur i WR, svo hun radlagdi WR eftir
             WR. Þad er RETT svar um RANGAN hop; rodin var ekki bilud.
           · "You have 2 picks left and still need K and DST" — lid 5 tok
             spyrnumann i 14.6 og vorn i 15.5, svo hopurinn sem appid las
             hafdi RAUNVERULEGA hvorugt nanast allt draftid.
           · "radlagdi ADRA vorn i 14.4" — sama: lid 5 atti enga vorn tha.
           · saetis-vidvorunin ("Slot N does not exist") gat ekki kviknad,
             thvi 5 er gilt saeti i hvorri staerd sem er.

         SAETI SEM VERDUR EKKI LEYST ER `null`, OG THA ER SPURT. Tomur
         hopur med spurningu er ekki thaegilegur, en hann LYGUR EKKI —
         medan erft saeti gerir HVERJA tolu ranga OG synir hop annars
         manns undir heitinu "My team". Sama regla og `resolveSlot`
         skilar `null` i stad 1: thogul agiskun er versta utkoman.

         SAMA DRAFT ER UNDANTEKNINGIN og hun er nauðsynleg: eftir F5 er
         reiturinn forfylltur og einn smellur tengir aftur. Þa er saetid
         sem er vistad HANS EIGID (hann smellti eda slo thad inn) og ad
         henda thvi vaeri ad gera innslattarvillu oviðgerdanlega — sama
         lexia og skilyrdid a saetis-reitnum sjalfum.

         Vordur: `draft-live.mjs` kafli 18, sem fullyrdir um INNIHALD
         hopsins (nofnin), ekki adeins um toluna — thad var innihaldid
         sem hann sa.                                                  */
      const sameDraft = !!(d && d.draft_id && sync && sync.draftId &&
                           String(sync.draftId) === String(d.draft_id));
      const keptSlot = slot != null ? slot
        : (sameDraft && sync.slot != null ? Number(sync.slot) : null);

      /* Draft an `league_id` er MOCK-DRAFT (Sleeper skilar thvi an
         deildar). Tha eru engar reglur ad flytja inn — adeins volin —
         og deildarflipi fyrir thad vaeri flipi sem ber sjalfgefnu
         stillinguna undir nafni sem lítur ut eins og deild. */
      if (bundle.league && res.imported.leagueId) {
        onImportLeague({
          id: res.imported.leagueId,
          name: res.imported.name || "Sleeper league",
          rules: res.league,
          imported: res.imported,
          warnings: res.warnings,
          teams: teamList,
          sync: { draftId: (d && d.draft_id) || "", slot: keptSlot },
        });
        setStatus(d && d.draft_id ? null
          : `Rules imported from ${res.imported.name || "the league"} — ` +
            `no draft has been created yet.`);
        /* SKORDAN ER REIKNUD UR **NYJU** DEILDINNI, ekki ur `leagueKey`.
           `onImportLeague` breytir `activeId`, en thessi teikning ser
           hann ekki — sama lokun og notan vid `resolveSlot` lysir. Vaeri
           gamla deildin notud hér vaeri samstillingin kveikt a bordi sem
           er ekki a skjanum. */
        if (d && d.draft_id && onLive) {
          onLive(D.boardScope(res.imported.leagueId, d.draft_id));
        }
      } else if (d && d.draft_id) {
        setSync({ draftId: d.draft_id, slot: keptSlot });
        setStatus(null);
        if (onLive) onLive(D.boardScope(leagueKey, d.draft_id));
      } else {
        setStatus("Found neither league rules nor a draft at that link");
      }
    } catch (e) {
      setStatus(String(e.message || e));
    } finally { setBusy(false); }
  };

  /* ============================================================
     SAETID ER LESID UR DRAFTINU, EKKI SLEGID INN
     ============================================================
     ÞETTA VAR GATID SEM GERDI TENGINGUNA HALFA. An saetis strikadi
     appid ut tha sem voru farnir — en hopurinn THINN fylltist aldrei,
     svo "hvern a ad taka naest" vissi ekki hvad thu attir thegar. Rad
     an vitneskju um hopinn er ekki rad.

     Sleeper ber `draft_order` a draftinu sjalfu: `{ user_id: saeti }`.
     Vid vitum `user_id` um leid og notandinn finnst, svo saetid er
     LESID. Handvirki reiturinn stendur afram fyrir tha sem lima inn
     slod an thess ad slá inn notandanafn — og fyrir tilfellid thegar
     `draft_order` er null, sem Sleeper gerir adur en rodin er dregin.

     `slotAuto` greinir a milli "vid lasum thetta" og "thu slóst thad
     inn", thvi thad fyrra ma yfirskrifast vid naesta draft og thad
     sidara ekki. */
  /* THRJAR LEIDIR AD SAETINU, i thessari rod:
       1. `draft_order[user_id]` — beint, thegar rodin er dregin
       2. `slot_to_roster_id` -> `rosters[].owner_id` — virkar THOTT
          rodin se ekki dregin
       3. notandinn smellir a lidid sitt (eda slaer inn tolu)

     Leid 2 er ekki tilgata: a raunverulegri deild (12.8.2026) var
     `draft_order` NULL — Sleeper dregur rodina eftir a — svo leid 1
     gaf ekkert og saetid vard ad koma annars stadar fra. */
  /* Notandanafns-leidin fer nu GEGNUM somu vorpun. Adur las hun adeins
     draft-id og saeti; reglurnar komu ekki med, svo deildin i appinu
     var afram su sem sidast var slegin inn i hendi. */
  const useLeague = async (lg) => {
    setStatus("connecting…");
    setBusy(true);
    try {
      await connect(lg.league_id);
    } finally { setBusy(false); }
  };

  const pull = async (id) => {
    try {
      const [d, picks] = await Promise.all([D.sleeperDraft(id), D.sleeperPicks(id)]);
      /* `leagueId` ER SVIDID SEM GREINIR MOCK FRA DEILDARDRAFTI, og thad
         var ekki lesid — svo bordid gat ekki greint "thetta draft a enga
         deild" (mock, og tha er DRAFTID eina heimildin) fra "thetta draft
         a ANNA deild en su sem er hladin" (raunveruleg notandavilla).
         Sja `draftFit` i `sleeper-league.js`. */
      const shape = { type: d.type, teams: d.settings ? d.settings.teams : null,
                      rounds: d.settings ? d.settings.rounds : null,
                      leagueId: d.league_id != null ? String(d.league_id) : null,
                      /* MOCK BER SINAR EIGIN REGLUR — og thaer voru ekki
                         lesnar. `metadata.scoring_type` og `settings.slots_*`
                         eru MAELD i lifandi svari (sja kafla 7 i
                         `sleeper-league.js`); an theirra vard bordid ad giska
                         a deildina sem er hladin, og thad var einmitt villan:
                         varamanns-threpid WR29 -> WR42. */
                      scoringType: (d.metadata && d.metadata.scoring_type) || null,
                      slots: startersFromSlots(d.settings),
                      status: d.status, picks: (picks || []).length };
      setInfo(shape);
      /* OG UPP. Bordid tharf `teams`/`rounds` DRAFTSINS til ad reikna
         snakk-tolurnar — an thessarar linu voru thaer reiknadar ur
         deildinni og "Pick 151" var moguleg i 150 vala drafti. */
      if (onShape) onShape(shape);
      /* Rodin er oft dregin EFTIR ad tengt er. Se saetid enn ekki komid
         og `draft_order` bætist vid i millitidinni tokum vid thad. */
      if (sync.slot == null && userId != null && d.draft_order) {
        const s2 = d.draft_order[userId];
        if (s2 != null && Number.isFinite(Number(s2))) {
          setSlotAuto(true);
          setSync((prev) => ({ ...prev, slot: Number(s2) }));
        }
      }
      /* VAL SEM BORDID THEKKIR EKKI MA EKKI HVERFA THEGJANDI.
         Bordid ber ~1.130 leikmenn af ~11.400 hja Sleeper, svo djupt
         val getur verid utan thess. Ad sleppa thvi ur `ids` er rett —
         thad var hvort ed er ekki i tillogunum. En ad sleppa thvi ur
         `mine` er thad EKKI: tha vantar mann i thinn eigin hop og
         ekkert segir fra thvi. Nu er thad talid og synt. */
      /* TVITEKIN ROD MA EKKI TELJAST TVISVAR. Umsjonarmadur sem lagfaerir
         val getur skilid eftir tvaer radir a sama leikmanni. `taken` er
         MENGI og taldi hann einu sinni, en `ids.length` fór i
         fingrafarid og `unknown` i valnumerid — svo talan hefdi hlaupid
         fram um eitt. Eitt audkenni = eitt val. */
      const ids = [], mine = [];
      let unknown = 0, unknownMine = 0;
      const seen = new Set();
      for (const p of picks || []) {
        const pid = String(p.player_id);
        if (seen.has(pid)) continue;
        seen.add(pid);
        const known = byId.has(pid);
        const isMine = sync.slot != null && p.draft_slot === Number(sync.slot);
        if (known) { ids.push(pid); if (isMine) mine.push(pid); }
        else { unknown++; if (isMine) unknownMine++; }
      }
      setUnmatched({ total: unknown, mine: unknownMine,
        names: (picks || []).filter((p) => !byId.has(String(p.player_id)))
          .slice(0, 6)
          .map((p) => (p.metadata &&
            [p.metadata.first_name, p.metadata.last_name].filter(Boolean).join(" ")) ||
            String(p.player_id)) });

      /* ============================================================
         OBREYTT SVAR MA EKKI ENDURTEIKNA BORDID.
         ============================================================
         `onPicks(ids, mine)` sendi NYTT fylki i hverri pollun, lika
         thegar ekkert hafdi gerst. Foreldrid byggdi tha nytt `Set`,
         `available` reiknadist upp a nytt og 200 rada tafla,
         tillagan, skortstadan og markadskassinn endurteiknudust —
         a 5 sekundna fresti, allt draftid, fyrir engar upplysingar.

         Fingrafarid er talan sjalf, ekki tilvisunin. Thad er lika
         forsenda thess ad haegt se ad polla ORAR (nedar): hrad
         pollun sem endurteiknar allt vaeri verri en haeg. */
      const sig = pickSignature(ids, mine, unknown);
      if (sig !== lastSig.current) {
        lastSig.current = sig;
        if (ids.length > (lastCount.current ?? 0)) lastMove.current = Date.now();
        lastCount.current = ids.length;
        onPicks(ids, mine, unknown);
      }
      setPollErr(null);
    } catch (e) { setPollErr(String(e.message || e)); }
  };


  /* ============================================================
     HRADINN FYLGIR DRAFTINU, HANN ER EKKI FASTUR.
     ============================================================
     Her stod 5000 ms med rokunum "snakk-draft gefur 30-90 sek a val".
     Thad er rett um RAUNDRAFT og RANGT um mock: botnar velja
     samstundis, svo mock rennur oft a 1-3 sek a val og heilt draft a
     fimm minutum. Notandinn sa nakvaemlega thad — listinn uppfaerdist
     "of haegt", og hann var ekki ad lysa hegdun heldur ranga forsendu.

     Reglan: se nytt val komid a SIDUSTU 25 SEKUNDUM er draftid a
     hreyfingu og vid spyrjum a 1,5 sek. Annars 5 sek, sem er gamla
     hegdunin — biðstada milli umferda a ekki ad kosta koll.

     Thetta er odyrt AF THVI AD obreytt svar endurteiknar nu ekkert
     (sja `sig` ofar). Vid erum gestir hja Sleeper og teljum thad:
     versta tilfellið er 40 koll a minutu medan draft er i gangi, sem
     er minna en vafrinn gerir vid ad hlada einni sidu.               */
  /* ============================================================
     FINGRAFARID TILHEYRIR EINU DRAFTI — ANNAD DRAFT, NYTT BLAD
     ============================================================
     ÞETTA VAR VILLA SEM AÐEINS SEST I LIFANDI KEYRSLU, og hun bitur
     nakvaemlega thann sem gerir thad sem "Reset & disconnect" var
     smiðad fyrir: hann hreinsar bordid i midju mock-i og tengir sig
     aftur vid SAMA draft.

     `lastSig` lifdi reset-id. Svarid fra Sleeper var oskert thad sama og
     adur, svo fingrafarid var oskert thad sama — og hlidid sem a ad
     spara endurteikningu las thad sem "ekkert hefur gerst". `onPicks`
     var ALDREI kallad. Utkoman: tengingin sagdist vera lifandi, `info`
     taldi "24 picks made", og bordid stod TOMT med valnumer 1 thangad
     til naesti madur var valinn. Maelt i hermun: 0 af 24 volum komu til
     baka.

     Fingrafarid er minni um SVAR VID EINU DRAFTI. Skipti draftid um
     audkenni — eda se thad hreinsad — a thad minni ekkert erindi.    */
  useEffect(() => {
    lastSig.current = null;
    lastCount.current = null;
    lastMove.current = 0;
    setUnmatched(null);
    setInfo(null);
    /* Og villan ur SIDUSTU pollun tilheyrdi odru drafti. */
    setPollErr(null);
    /* Og logunin uppi LIKA. Vaeri hun ekki nullstillt bæri bordid afram
       lidafjolda draftsins sem var slitid — og reiknadi snakk-tolur ur
       drafti sem er ekki tengt. Sama aett og `lastSync`-refin. */
    if (onShape) onShape(null);
  }, [sync.draftId]);

  useEffect(() => {
    if (!live || !sync.draftId) return;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      await pull(sync.draftId);
      if (stopped) return;
      timer.current = setTimeout(tick, pollDelay(lastMove.current, Date.now()));
    };
    tick();
    return () => { stopped = true; clearTimeout(timer.current); };
    /* `userId` ER I DEPS OG THAD ER EKKI SNYRTIMENNSKA: `pull` les hann
       thegar `draft_order` er dregid i midju drafti. An hans heldi
       pollunin afram med `userId = null` ur theirri teikningu sem var
       thegar samstillingin var raest — og saetid hefdi aldrei lesist hja
       theim sem slaer inn notandanafnid EFTIR ad hann tengdi. Sama aett
       og urvelta lokunin sem `onPicks` var lagfaerd fyrir. */
  }, [live, sync.draftId, sync.slot, byId, userId]);

  /* HVAD VAR LEITT UT — MED NAFNI. `teamsFromLeague` gefur
     `Slot 7` sem varaheiti thegar Sleeper ber hvorki `team_name` ne
     `display_name`; thad er ekki nafn heldur sama talan aftur, svo thad
     er sleppt fremur en skrifad tvisvar ("You are Slot 7, slot 7"). */
  /* ============================================================
     SAETIN I MOCK-I ERU MOCK-INS, EKKI DEILDARINNAR (20.8.2026)
     ============================================================
     `teams` kemur ur DEILDINNI (`teamsFromLeague` a innflutningi) og var
     synt sem saetavalid i HVERJU drafti. I mock-i — sem ber enga
     `league_id` og thar med enga notendalista — thydir thad tvennt rangt:

       · "You are Sofahetjur, slot 5" i mock-i thar sem Sofahetjur er
         ekki einu sinni med. Nafnid er ur annarri deild og thad LES eins
         og appid hafi lesid thad ur draftinu.
       · 12 saeti i bod i 10-lida mock-i. Saeti 11 og 12 eru ekki til
         thar, og `slotOk` slokknar thegjandi ef smellt er a thau.

     Mock faer thvi ENGIN lidsspjold, og tha kemur tolu-reiturinn
     ("Your slot") sjalfkrafa i stadinn — hann er skilyrtur a
     `seatList.length === 0`, sem er SAMA skilyrdi og gerir spjoldin
     engin, svo thau tvo geta ekki bædi horfid.

     TOLU-SPJOLD (1..N ur draftinu) VORU PROFUD OG TEKIN UT: thau eru
     onnur leid ad sama svari, og reiturinn er ThEGAR profadur i tveimur
     kofllum (`draft_order` odregin, nafnid slegid inn A EFTIR). Ny
     styring sem gerir thad sama og su sem er til er nakvaemlega thad sem
     "eitt reit, einn hnappur" var ad hreinsa ut.                       */
  const seatList = useMemo(() => {
    /* Mock ber enga `league_id` — og thar med engan notendalista sem
       segir hver situr hvar. Spjold ur ANNARRI deild eru ekki svar. */
    if (info && !info.leagueId) return [];
    return Array.isArray(teams) ? teams : [];
  }, [info, teams]);

  const seatName = useMemo(() => {
    if (sync.slot == null || !Array.isArray(seatList)) return null;
    const t = seatList.find((x) => x.slot === Number(sync.slot));
    const nm = t && t.name ? String(t.name) : "";
    return nm && !/^Slot \d+$/.test(nm) ? nm : null;
  }, [teams, sync.slot]);

  /* ============================================================
     STODULJOSID — TVAER STODUR, OG THAER SEGJA HVADAN TOLURNAR KOMA
     ============================================================
     BEIDNI NOTANDANS 19.8.2026: "status ljos sem segir connected eda
     disconnected med graenu og raudu." Tvo ljos, ekki thrju.

     ============================================================
     OG 20.8.2026 SAGDI THAD EITTHVAD SEM VAR OGERANLEGT
     ============================================================
     Hann tengdi 10-lida MOCK og las thetta, medan draftid var i beinni
     og pollunin gekk:

       "Disconnected — draft has 10 teams, league has 12 — connect the
        league this draft belongs to"

     BADIR HLUTAR VORU OSANNIR UM THAD ASTAND:
       · MOCK-DRAFT A ENGA DEILD. Sleeper skilar honum an `league_id` —
         thess vegna flytur `connect` engar reglur inn. Bodin bad hann um
         ad gera thad sem ER EKKI HAEGT.
       · "Disconnected" um draft sem svaradi 1,5 sek adur og bar
         "3 picks made · live" tveimur linum nedar.

     TVEIMUR ASTANDUM VAR STEYPT SAMAN og thau eru ekki sama malid:

       ENGIN DEILD (mock)   -> DRAFTID er eina heimildin, og hun er OLL i
                               svarinu: `settings.teams`/`rounds`,
                               `settings.slots_*`, `metadata.scoring_type`.
                               Tha er ENGINN mismunur til ad segja fra —
                               bordid reiknar draftid sjalft. GRAENT, med
                               einni linu um hvadan hvert svid kemur.
       ONNUR DEILD          -> raunveruleg notandavilla, og hun er su sem
                               kostadi sex WR i sjo umferdum. RAUT.

     LOGUNIN SJALF ER I `boardShape` (`sleeper-league.js`) — hrein, mæld
     og profud thar. Hér er adeins BIRTINGIN. Bæði tolurnar (`league` sem
     kemur ofan fra) og ljosid lesa SOMU utkomu, svo their geta ekki rekid
     i sundur: liti ljosid graent medan tolurnar vaeru ur annarri deild
     vaeri thad nakvaemlega villan sem er verid ad laga.

     MAELINGIN SEM GERIR THETTA NAUDSYNLEGT (hans eigin gogn, 17.8.):
     10-lida PPR 2WR/2FLEX a moti 12-lida sjalfgefnu 3WR/1FLEX faerir
     varamanns-threpid QB10->QB12, RB27->RB28, TE14->TE14 og
     **WR29->WR42** — +26,9 stig af VBD a hvern WR, +1,0 a RB, 0,0 a TE.
     Þad er skekkja MED FORMERKI, ekki jofn lyfting. Nu er hun ekki
     lengur til i mock-i: threpin eru reiknud UR DRAFTINU.

     Vordur: `draft-live.mjs` kafli 16 (mock i annarri staerd -> GRAENT,
     tolurnar draftsins, og hvergi bod um ad tengja deild sem er ekki til),
     16b (deildardraft -> graent, engin lina) og 16c (draft sem tilheyrir
     ANNARRI deild -> RAUT, og thad ma ekki mildast).                   */
  const fit = board || { green: false, line: null, state: "none" };
  const connected = !!info && !!fit.green;
  /* EIN LINA, ekki malsgrein. Rodin er akvordud af thvi hvad notandinn
     getur gert naest. */
  /* LOGUNIN FYRST — hun er STANDANDI astand, medan `status` er utkoma
     einnar adgerdar. En hin ma ekki THAGNA undir henni: notandi sem ytir
     a Connect a rongu audkenni MEDAN logunin rekur fekk annars enga
     svorun um smellinn sinn. Baðar, i thessari rod. */
  const why = fit.line
      ? fit.line + (status ? ` · ${status}` : "")
    : status ? status
    : pollErr ? `Sleeper did not answer: ${pollErr}`
    : !sync.draftId ? "paste a league link, draft link, id or your Sleeper username above"
    : !live ? "press Connect to start reading this draft"
    : "waiting for Sleeper…";

  return (
    <div className="panel">
      <h2>Connect your Sleeper draft</h2>

      <div className="row" style={{ marginBottom: 8 }}
        data-conn={connected ? "good" : "bad"}>
        <span className={`dot ${connected ? "good" : "bad"}`} aria-hidden="true" />
        <b className={connected ? "good" : "bad"}>
          {connected ? "Connected" : "Disconnected"}
        </b>
        {/* LITURINN EINN DUGAR EKKI — ordin eru vid hlidina a honum, thvi
            graent/raut er osynilegur mismunur fyrir raud-graena litblindu
            (~8% manna) og thad er sama regla og gildir annars stadar i
            thessu repo-i.

            OG `status` ER BIRT LIKA ThEGAR TENGT ER. Tengingin sem er i
            gangi slitnar EKKI af thvi ad ny tengitilraun brast — bord sem
            ber 60 vol heldur sinu, sem er rett — en tha hafdi notandinn
            yttt a Connect og fengid ENGA svorun. Þogul mistokst adgerd er
            thad sem laetur mann ytta aftur og aftur. Vordur:
            `draft-live.mjs` kafli 15c.                                 */}
        <span className="dim">
          {connected
            /* LINAN ER BIRT LIKA ThEGAR GRAENT ER, og thad er kjarninn i
               lagfaeringunni 20.8.2026: i mock-i er hun EKKI vidvorun
               heldur SVARID — "hvadan koma tolurnar sem eg er ad lesa".
               Adur var hun adeins synd i raudu astandi, svo rett astand
               var thogult um sinar eigin forsendur. */
            ? (() => {
                const bits = [];
                if (fit.line) bits.push(fit.line);
                /* "reading picks live" MA EKKI HVERFA UNDIR LINUNNI: thad
                   er svarid vid "er thetta i beinni?", sem er onnur
                   spurning en "hvadan koma tolurnar". */
                if (status) bits.push(status);
                else if (pollErr) bits.push(`Sleeper did not answer: ${pollErr}`);
                else if (live) bits.push("reading picks live");
                return bits.length ? `— ${bits.join(" · ")}` : "";
              })()
            : `— ${why}`}
        </span>
      </div>

      {/* EITT REIT OG EINN HNAPPUR. Reset er i SOMU rod og adalhnappurinn
          (beidni 16.8.2026, "settu reset takkann ofar") en ytt ut a hinn
          kant med `spacer`: eydandi adgerd ma ekki lenda undir fingrinum
          a theim sem aetlar ad tengja. */}
      <div className="row">
        <label className="field" style={{ flex: "1 1 320px" }}>
          Sleeper league, draft or username
          <input type="text" value={url} style={{ minWidth: 260, width: "100%" }}
            placeholder="sleeper.com/leagues/1389356308104249344 — or a draft link, a bare id, or your username"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connect()} />
        </label>
        <button className="act primary" onClick={() => connect()}
          disabled={busy || !url.trim()}>
          {busy ? "Connecting…" : "Connect"}
        </button>

        <div className="spacer" />
        <button className="act" onClick={onReset} disabled={resetOff}
          title={sync.draftId
            ? "Clears the board AND disconnects the draft — your seat is kept"
            : "Clears every pick you have marked"}>
          {sync.draftId ? "Reset & disconnect" : "Reset board"}
        </button>
      </div>

      {leagues && leagues.length > 0 && (
        <div className="chips" style={{ marginTop: 10 }}>
          {leagues.map((l) => (
            <button key={l.league_id} className="chip" onClick={() => useLeague(l)}>
              {l.name} · {l.total_rosters} teams
            </button>
          ))}
        </div>
      )}

      {/* ============================================================
          ÞAÐ SEM VAR LESID — SYNT, EKKI GEFID SER
          ============================================================
          Innflutt deild breytir HVERRI tolu a bordinu. Ad gera thad
          thegjandi vaeri ad skipta um heim undir notandanum. Reglurnar
          eru thvi birtar berum ordum svo hann geti bori thaer vid
          Sleeper-appid sjalft.                                       */}
      {imported && <ImportedRules imported={imported} league={league}
        shapes={shapes} onReread={onRereadRules} />}

      {/* ============================================================
          SAETID ER LEITT UT, EN GISK ER ALDREI SETT I ÞAD
          ============================================================
          "Your slot"-reiturinn er farinn af thvi ad thremur leidum var
          THEGAR til (`resolveSlot`: `draft_order[user_id]`, sidan
          `slot_to_roster_id` -> `rosters[].owner_id`, sidan smellur) og
          reiturinn var fjorda leidin ad sama svari.

          ÞAD SEM VAR LEITT UT ER SYNT MED NAFNI. Rangt saeti gerir HVERJA
          tolu ranga (bordid litar engan, hopurinn fyllist aldrei,
          radgjafarkassinn giskar ad valid a klukkunni se mitt — rangt i 9
          volum af 10 i 10-lida deild), svo thogul agiskun er versta
          utkoman. Nafnid gerir vonda agiskun SYNILEGA.

          OG ENGIN SJALFGEFIN 1: `resolveSlot` skilar `null` og saetavalid
          stendur opið. Saeti 1 sem sjalfgefid gildi vaeri tala sem lítur
          ut eins og maeling.                                            */}
      {/* ============================================================
          SAETID I ORDUM — LIKA THEGAR ENGIN SPJOLD ERU (20.8.2026)
          ============================================================
          Þessi blokk var skilyrt a `seatList.length > 0`, svo MOCK — sem
          ber engin spjold — hafdi ENGA setningu um saetid. Rangt saeti
          gerir hverja tolu ranga OG synir hop annars manns (sja kaflann
          um `keptSlot`), svo talan verdur ad vera LESIN A SKJANUM i thvi
          tilfelli AF OLLUM. Setningin og spjoldin eru thvi tvo adskilin
          skilyrdi, ekki eitt.                                          */}
      {sync.draftId && (seatList.length > 0 || (info && !info.leagueId)) && (
        <div style={{ marginTop: 10 }}>
          <div className="dim" style={{ fontSize: 12.5, marginBottom: 4 }}>
            {sync.slot != null
              ? <>{seatName
                    ? <>You are <b>{seatName}</b>, slot <b>{sync.slot}</b></>
                    /* NAFNID VANTAR — og tha ma talan ekki koma tvisvar.
                       Fyrsta utgafan skrifadi `seatName || \`slot N\`` inn i
                       nafna-sætið og gaf **"You are slot 11, slot 11"**;
                       varaheitid ur `teamsFromLeague` ER saetatalan, svo
                       thad var sama talan tvitekin i sitthvorum reit. */
                    : <>Your seat is slot <b>{sync.slot}</b></>}
                  {slotAuto && <span className="good"> · read from Sleeper</span>}
                  {" — "}<span className="dim">{seatList.length > 0
                    ? "click another to change it" : "change it below"}</span></>
              : seatList.length > 0
                ? <>Which team is yours? Your own picks only fill the roster below once
                    this is set.</>
                /* Mock an saetis: reiturinn fyrir nedan ber sina eigin
                   skyringu, svo tvo skilabod um sama reit vaeru havadi. */
                : null}
          </div>
          {/* ============================================================
              SMELLUR A ThITT LID KENNIR APPINU HVER THU ERT
              ============================================================
              Þetta er thad sem gerir "eitt reit" raunverulega einfalt i
              ANNAD sinn. Saetid krefst IDENTITETS (`resolveSlot` les
              `draft_order[user_id]`), svo sa sem limir inn deildarslod i
              ferskum vafra og hefur aldrei slegid inn notandanafn faer
              rettilega spurninguna "hvada lid er thitt?".

              En SVARID vid henni ER identitetid: `t.userId` kemur ur
              `rosters[].owner_id`, sem er sama snjokornid og
              `/user/{nafn}` skilar. Ad henda thvi og spyrja aftur i
              naesta mock vaeri ad gleyma thvi sem notandinn var buinn ad
              segja.

              VARFAERNIN ER I EINU SKILYRDI: audkenni sem er ThEGAR til
              er ekki yfirskrifad. Þad kom ur `/user/{nafn}` — notandinn
              nefndi sig sjalfur — og smellur a lid i EINNI deild ma ekki
              endurskilgreina hver hann er i ollum hinum. Nafnid er lika
              varðveitt ef thad er til, thvi `t.name` getur verid
              LIDSHEITI (`metadata.team_name`) og forsidan flettir upp
              eftir notandanafni thegar audkennid vantar.              */}
          {seatList.length > 0 && <div className="chips">
            {seatList.map((t, i) => (
              <button key={`${t.slot}|${t.userId || i}`}
                className={`chip${t.slot != null && t.slot === sync.slot ? " on" : ""}`}
                disabled={t.slot == null}
                onClick={() => {
                  setSlotAuto(false);
                  setSync({ ...sync, slot: t.slot });
                  if (t.userId) {
                    setUserId((prev) => prev || String(t.userId));
                    if (setSleeperUser) {
                      setSleeperUser((prev) => (prev && prev.userId) ? prev : {
                        name: (prev && prev.name) || String(t.name || ""),
                        userId: String(t.userId),
                      });
                    }
                  }
                }}>
                {t.slot != null ? `${t.slot}. ` : ""}{t.name}
              </button>
            ))}
          </div>}
          {seatList.length > 0 && !imported?.orderDrawn && (
            <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
              The draft order has not been drawn on Sleeper yet, so these are roster
              slots. They become the pick order once it is drawn, and the app re-reads
              it while syncing.
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          OG SE SAETID OLEYSANLEGT KEMUR REITURINN AFTUR
          ============================================================
          Draft sem ber hvorki `draft_order`, `slot_to_roster_id` ne lista
          af notendum gefur ENGIN saetaspjold — og tha er ekkert eftir sem
          notandinn getur smellt a. Reiturinn er thvi ekki fjarlaegdur
          heldur SKILYRTUR: hann birtist nakvaemlega thegar leidslan
          brast, og hvergi annars. Skilyrdid er `teams.length === 0`, sem
          er sama skilyrdi og gerir spjoldin engin — thau tvo geta thvi
          ekki bædi horfid.

          SKILYRDID SPYR **EKKI** HVORT SAETID SE ThEGAR SETT, og thad var
          fyrsta utgafan (`sync.slot == null`). Hun var rong i badar attir:
          reiturinn hvarf um leid og saeti var slegid inn, svo INNSLATTAR-
          VILLA vard ovidgerdanleg, og saeti sem kom ur eldra vistudu
          astandi (`nfl_sync`) var hvergi synilegt. Styring sem hverfur
          thegar hun hefur verid notud er verri en engin.

          SKILYRDID LES NU `seatList`, EKKI `teams`. Frá 20.8.2026 fær
          mock sin EIGIN tolu-saeti (sja `seatList`), svo `teams.length`
          er ekki lengur sama skilyrdi og "spjoldin eru engin" — og hefdi
          reiturinn haldid `teams` hefdu BADIR birst i mock-i.          */}
      {sync.draftId && seatList.length === 0 && (
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field">
            Your slot{slotAuto && sync.slot != null &&
              <span className="good" style={{ fontSize: 11, marginLeft: 5 }}>read from Sleeper</span>}
            <input type="number" min="1" max="16" value={sync.slot ?? ""}
              style={{ width: 70 }}
              onChange={(e) => { setSlotAuto(false);
                setSync({ ...sync, slot: e.target.value === "" ? null
                  : Number(e.target.value) }); }} />
          </label>
          {sync.slot == null && (
            <span className="dim" style={{ fontSize: 12.5, alignSelf: "flex-end" }}>
              This draft lists no teams, so your seat could not be read. Without it your
              own picks never reach the roster below.
            </span>
          )}
        </div>
      )}

      {/* ============================================================
          BORD SEM FYLLIST AF SJALFU SER MA EKKI THEGJA
          ============================================================
          Villan sem `boardScope` lagar var ekki adeins rong tala heldur
          THOGUL rong tala: notandinn opnadi nytt mock og bordid bar 59
          vol sem hann kannadist ekki vid, an thess ad neitt segdi hvadan
          thau kaemu. Nu segir bordid thad — og adeins tha:
          fullyrdingin er "thetta kom UR VAFRANUM", svo hun hverfur um
          leid og Sleeper hefur talad eda notandinn hreyft eitt val. */}
      {restored > 0 && (
        <div className="note" style={{ marginTop: 10 }}>
          <b>{restored} pick{restored > 1 ? "s" : ""} restored from this browser</b>
          {restoredMine > 0 ? ` (${restoredMine} marked as yours)` : ""}
          {sync.draftId
            ? " — saved earlier for this same draft. Nothing has been read from Sleeper yet."
            : " — marked by hand, with no draft connected."}
          {" Use Reset if this is a new draft."}
        </div>
      )}

      {/* ============================================================
          DRAFTID OG DEILDIN GETA VERID SITTHVOR LOGUNIN — OG THAU VORU
          THOGUL UM THAD
          ============================================================
          MOCK-DRAFT BER ENGA `league_id`, svo `connect` flytur ENGAR
          reglur inn — adeins draft-audkennid og saetid (sja thar). Bordid
          heldur thvi afram ad reikna med DEILDINNI sem er valin medan
          volin koma ur MOCK-INU. Er mock-id i annarri staerd er hver
          snakk-tala rong:

            12-lida mock, saeti 3, deildin i appinu 10 lid
            -> vid val 21 segir kassinn "next pick 40" (10-lida vorpun)
               thar sem rett svar i mock-inu er **22**

          Ekkert hrundi og ekkert var tomt; talan var einfaldlega ur
          annarri deild. Og se saetid haerra en lidafjoldi deildarinnar
          (12-lida mock gefur saeti 11 eda 12) slokknar `slotOk` i
          `DraftBoard` og bordid haettir ad lita — retta hegdunin, en hun
          vaeri OSKYRD an thessarar linu.

          TOLURNAR ERU LESNAR, EKKI GISKADAR: `info` kemur ur
          `/draft/{id}` sjalfu (`settings.teams` / `settings.rounds`), svo
          thetta er samanburdur a tveimur skradum stadreyndum.

          VID BREYTUM EKKI DEILDINNI SJALFKRAFA. Notandinn gaeti verid ad
          aefa sig fyrir sina deild i mock-i af annarri staerd viljandi;
          ad yfirskrifa reglurnar hans thegjandi vaeri staerri villa en
          su sem er verid ad laga. Vid SEGJUM fra og latum hann rada.  */}
      {/* SAETID FYRST, OG THAD HANGIR EKKI A `info`. Fyrsta utgafa thessa
          kassa las bædi ur `info`, sem er ADEINS til medan samstillingin
          er i gangi (`pull` skrifar hana). Notandi sem slaer 12 i reitinn
          i 10-lida deild AN thess ad kveikja a samstillingu hefdi thvi
          fengid olitad bord og enga skyringu — sama thogn og adur, bara i
          minna tilfelli. */}
      {(() => {
        const lt = Number(league && league.teams);
        if (sync.slot == null || !Number.isFinite(lt)) return null;
        if (sync.slot >= 1 && sync.slot <= lt) return null;
        return (
          <div className="note warn" style={{ marginTop: 10 }}>
            {/* "LEAGUE" VAR RANGA ORDID I MOCK-I. Fra 20.8.2026 er `lt`
                tolan sem BORDID reiknar med, og i mock-i kemur hun ur
                DRAFTINU — svo "does not exist in a 12-team league" hefdi
                nefnt deild sem kemur malinu ekki vid. Ordid fylgir
                heimildinni. */}
            <b>Slot {sync.slot} does not exist in a {lt}-team{" "}
              {fit.state === "mock" ? "draft" : "league"}</b> — nobody is
            shaded and the advice assumes the pick on the clock is yours.
          </div>
        );
      })()}

      {/* ============================================================
          KASSINN UM VBD VAR TEKINN UT — HANN VAR ORDINN OSANNUR
          ============================================================
          Hér stod: "Every VBD number on this board is computed for your
          league, not for this draft — the replacement receiver moves
          WR29 -> WR42". Þad var RETT thegar bordid reiknadi alltaf ur
          deildinni. Fra 20.8.2026 reiknar mock UR DRAFTINU (`boardShape`),
          svo setningin var ordin OSONN i nakvaemlega thvi tilfelli sem hun
          var skrifud fyrir — og "onnur deild"-tilfellid ber sina eigin
          linu vid ljosid, sem segir bædi hvad er ad OG hvad thad kostar.

          TVEIR STADIR SEM SEGJA SAMA HLUTINN eru verri en einn: thegar
          logunin faerdist i `boardShape` hefdi thessi kassi thurft ad vita
          um hana lika, og thad er nakvaemlega hvernig tveir textar reka i
          sundur. EIN LINA, VID LJOSID.                                 */}

      {/* VIDVARANIR ERU EKKI SKRAUT. Hver ein er atriði sem likanid
          getur EKKI heidrad — keeper-deild, TE-premium, IDP, uppbods-
          draft. Ad flytja inn deildina og thegja um thau vaeri ad lata
          nalgun lesast eins og maelingu. */}
      {warnings.length > 0 && (
        <div className="note warn" style={{ marginTop: 10 }}>
          <b>{warnings.length} thing{warnings.length > 1 ? "s" : ""} the model cannot
            take from your league:</b>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {info && (
        <div className="dim" style={{ marginTop: 10, fontSize: 12.5 }}>
          {info.type} draft · {info.teams} teams · {info.rounds} rounds ·
          {" "}status <b>{info.status}</b> · {info.picks} picks made
          {live && <span className="good"> · live</span>}
          {sync.slot == null && (
            <span className="warn"> · set your slot to auto-fill your roster</span>
          )}
        </div>
      )}

      {unmatched && unmatched.total > 0 && (
        <div className={`note ${unmatched.mine > 0 ? "warn" : ""}`} style={{ marginTop: 8 }}>
          <b>{unmatched.total} pick{unmatched.total > 1 ? "s" : ""} are not on this board</b>
          {unmatched.mine > 0
            ? ` — ${unmatched.mine} of them yours, so your roster below is short by that many.`
            : " — deep picks outside the draftable pool, which is expected."}
          {unmatched.names.length > 0 && (
            <span className="dim"> {unmatched.names.join(", ")}
              {unmatched.total > unmatched.names.length ? " …" : ""}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ÞREPIN A LIFUNINNI — BIRTING, MAELD I THREMUR TILRAUNUM
   ============================================================
   `p` er samfelld og maeld (`survivalProb`); radgjofin les hana
   samfellda og ser thetta fall ALDREI. Threpin eru eingongu til thess
   ad augad greini hana i 200 rada toflu.

   ÞRJAR UTGAFUR VORU MAELDAR A RAUNVERULEGU BORDI (10 lid, saeti 7,
   20 vol komin, naesta val #27). Tvaer fyrstu voru taldar, thridja
   var SKODUD A SKJANUM — og thad er astaedan fyrir thessari:

   (1) `>=0,75 likely` + `0,45-0,75 coin flip`, annad olitad:
       **192 af 205 rodum litadar (94%)**. Ekki rong — vid val 27 lifir
       nanast hver sem hefur ADP yfir ~40 — en tonn sem 94% radanna
       bera er BAKGRUNNUR, ekki merki.

   (2) "Vissu"-endinn (>=0,97) tekinn ut sem "engin akvordun":
       **2 af 205**, og NULL i "likely"-threpinu. Dreifingin er sterkt
       TVITOPPA — vid fast val er nanast hver leikmadur annadhvort
       longu farinn eda algerlega oruggur. Nanast olitad bord les eins
       og bilun.

   (3) Þrir tonar (graent/gult/raudt) TOLDUST rett (189/5/6) og voru
       samt onytir: a SKJAMYND voru gult og raudt **ogreinanleg**.
       Maelt: #262523 a moti #282024 er (2, 5, 1) i RGB. FPL-verkefnid
       ber thegar thessa reglu — nagrannathrep verda ad vera >=20 i
       RGB — og hun var brotin her. Tvaer tolur sem TELJAST rett geta
       samt verid einn litur fyrir auganu.

   (4) ÞETTA: TVEIR tonar, gagnstaedir, og midjan OLITUD.

     >= 0,80    graent  lifir til naesta vals — obidu
     0,40-0,80  olitad  VID VITUM EKKI — engin fullyrding
     < 0,40     raudt   farinn adur en thu velur aftur
     ADP vantar olitad  — engin tala, ekki "0%"

   Bædi olituðu tilfellin thyda thvi NAKVAEMLEGA THAD SAMA: appid
   fullyrdir ekkert. Thad er ekki tvirædni heldur ein regla, og hun er
   satt bædi um jafnteflid og um vantandi ADP. Prosentan er i `title`.
   ============================================================ */
/* ============================================================
   ÞREPID ER TEKID AF TOLUNNI SEM ER BIRT, EKKI AF HRAU `p`
   ============================================================
   `title` skrifar `Math.round(p * 100)` en threpid las hrátt `p`, svo
   vid mörkin sagdi sama rod tvennt: `p = 0,7951` ber **"80% likely to
   last"** i tooltip og er samt OLITUÐ, thvi 0,7951 < 0,80. Maelt i
   lifandi drafti: **3 radir** i einu 150-vala drafti.

   Þetta er lítil tala og hun er samt villa af verstu tegund i thessu
   repo-i: liturinn og talan eru TVAER framsetningar a EINNI maelingu og
   thaer sogdu ekki thad sama. Rúnnun a ad gerast einu sinni.        */
export function reachClass(p) {
  if (p == null) return "";
  const pct = Math.round(p * 100);
  if (pct >= 80) return "reach-hi";
  if (pct >= 40) return "";
  return "reach-lo";
}

/* ============================================================
   REGLURNAR SEM VORU LESNAR — BIRTAR, EKKI FALDAR
   ============================================================
   Innflutningur breytir hverri einustu tolu a bordinu (varamanns-
   threpid, VBD, ADP-dalkinn, radgjofina). Notandinn verdur ad geta
   bori thad sem appid les vid thad sem Sleeper-appid syni honum —
   annars er thetta svartur kassi sem segir "traustu mer".

   `exactScoring: false` er MERKT. Deild med `rec: 0,75` eda TE-premium
   er NALGUD, thvi spain er sott i thremur afbrigdum og ekki fleiri, og
   nalgun ma aldrei birtast sem vissa.                                */
function ImportedRules({ imported: im, league, shapes, onReread }) {
  const st = im.starters || {};
  const ORDER = ["QB", "RB", "WR", "TE", "FLEX", "SUPERFLEX", "K", "DST"];
  const slots = ORDER.filter((p) => st[p] > 0)
    .map((p) => (st[p] > 1 ? `${st[p]}${p}` : p)).join(" · ");

  return (
    <div className="note" style={{ marginTop: 10 }}>
      <div>
        <b>{im.name || "League"}</b>
        {im.season ? <span className="dim"> · {im.season}</span> : null}
        {im.status ? <span className="dim"> · {im.status.replace(/_/g, " ")}</span> : null}
        <span className="good" style={{ marginLeft: 6 }}>rules imported</span>
        {onReread && (
          <button className="act" style={{ marginLeft: 8, padding: "1px 7px", fontSize: 11 }}
            title="Read the rules from Sleeper again — league settings can change between seasons"
            onClick={onReread}>re-read</button>
        )}
      </div>
      <div style={{ marginTop: 3, fontSize: 12.5 }}>
        <b>{im.teams}</b> teams ·{" "}
        <b>{im.scoring === "half-ppr" ? "Half PPR" : im.scoring === "ppr" ? "PPR" : "Standard"}</b>
        {im.rec != null && <span className="dim"> ({im.rec}/rec)</span>}
        {!im.exactScoring && <span className="warn"> approximated</span>}
        {" · "}<b>{im.rounds}</b> rounds
        {im.draftType ? <span className="dim"> · {im.draftType}</span> : null}
        {im.superflex ? <span className="good"> · superflex</span> : null}
      </div>
      <div className="dim" style={{ marginTop: 2, fontSize: 12.5 }}>
        Starters: {slots || "—"}
        {im.bench > 0 ? ` · ${im.bench} bench` : ""}
        {im.flexPos ? ` · flex takes ${im.flexPos.join("/")}` : ""}
      </div>
      <MeasuredEdge league={league} shapes={shapes} />
    </div>
  );
}

/* ============================================================
   HVAD ER RODIN THESS VIRDI I ÞESSARI DEILD?
   ============================================================
   Innflutningur segir HVAD deildin er. Thetta segir hvad bordid er
   THESS VIRDI thar — og thad er onnur spurning. Deildarlogun er ekki
   skraut: varamanns-threpid faerist med lidafjolda og saetum, og
   maelda forskotid gegn ADP er OLIKT milli logana (t.d. +186,1 i
   10-lida tveggja-FLEX PPR a moti +147,4 i 12-lida half).

   TALAN KEMUR UR `src/rulebasis.js` og hun er ekki reiknud her.
   Einingin ber thrjar reglur sem eru astaedan fyrir thvi ad thetta er
   ekki bara tala i reit:
     · OMAELD logun faer ENGA tolu — aldrei naesta tala birt eins og
       hun se thessi logun
     · OMARKTAEK logun les EKKI eins og marktaek — `text` ber tha enga
       stigatolu
     · VARFAERNA talan er birt, ekki besta

   Thess vegna er `text` birt eins og hun kemur og EKKERT sniðið hér:
   sniðum vid hana myndum vid geta latid omarktaeka tolu lesast eins og
   marktaeka, sem er einmitt thad sem einingin er til ad forda.      */
function MeasuredEdge({ league, shapes }) {
  const e = useMemo(() => {
    if (!league) return null;
    try { return edgeSentence(league, shapes || null); } catch { return null; }
  }, [league, shapes]);
  if (!e || !e.text) return null;
  /* ============================================================
     `data-edge` ER TIL FYRIR VORDINN, OG THAD ER MAELT AF FALLI
     ============================================================
     `sleeper.mjs` (d2) sannreynir ad talan a skjanum se su sem `HALF_LAB`
     ber fyrir ThESSA logun — og ad hun se EKKI tala hinnar deildarinnar,
     thvi uppfletting i rangri toflu myndi annars lesast eins og rett.

     Su neikvaeda fullyrding var `!body.textContent.includes("147.4")` og
     hun **fell a origin/main 17.8.2026 an thess ad neitt vaeri ad**:
     bordid syndi Devaughn Vele med `-147.4` i virdis-dalki, svo
     undirstrengurinn VAR tharna. Nakvaemlega sama gildra og `\bNaN\b` i
     CLAUDE.md 5b — `includes` a tolu hittir hverja LENGRI tolu sem ber
     hana. Profid var rangt, kodinn rettur, og "graent eftir lagfaeringu"
     hefdi thvi verid falsk lagfaering.

     Setningin ber thvi sitt eigid svid svo vordurinn geti lesid HANA og
     ekki alla siduna. Ekki fjarlaegja: an thess getur fullyrdingin hvorki
     verid nakvaem ne stodug.                                          */
  return (
    <div style={{ marginTop: 4, fontSize: 12.5 }}
      data-edge={e.measured && e.significant ? "measured" : "unproven"}
      className={e.measured && e.significant ? "good" : "dim"}>
      {e.text}
    </div>
  );
}


/* ============================================================
   NAESTA VAL — thad sem allar tolurnar eru til fyrir
   ============================================================
   Bordid radar leikmonnum. Thessi kassi svarar spurningunni sem thu
   stendur raunverulega frammi fyrir: hvern a ad taka NUNA, og hverja
   ma bida eftir.

   RODIN ER A-RANKING. Sja `advice.js`: bradanauðsyn — ad rada eftir
   thvi hversu bratt stadan versnar — var maeld og hun TAPAR
   (marktaekt i standard). Lifunarlikur eru birtar sem upplysing.
   ============================================================ */
function NextPick({ available, kdst, roster, league, sync, nextOwn, pick, lastPick,
                    totalPicks, snakeTeams, snakeRounds }) {
  const rec = useMemo(() => {
    if (!available.length) return null;
    try {
      return recommend({
        available: available.map((r) => ({
          id: r.id, name: r.name, pos: r.pos, vbd: r.vbd,
          adp: r.adp, adpSd: r.adpSd, tier: r.tier, proj: r.proj,
          /* ÞESSI TVO VANTADI OG ThAD KOSTADI RETT SVAR. `avail`
             (0 = spilar ekki) og stadan sem SEGIR hvers vegna — sja
             notuna vid `sidelined` i advice.js. Kittle bar PUP og
             "+5,4 umferdir kaup" a sama skja. */
          avail: r.avail, injury: r.injury,
        })),
        /* NAKVAEMLEGA SAMA TALA SEM BORDID LITAR MED — sja hausinn a
           `picksUntilNext`. `null` (ekkert saeti thekkt) fellur i
           afleidsluna, sem er rett i handvirku drafti. */
        roster, pick, league, nextPick: nextOwn, lastPick,
      });
    } catch { return null; }
  }, [available, roster, pick, league, nextOwn, lastPick]);

  /* ============================================================
     DRAFTID GETUR KLARAST — OG THA ER "TAKE THIS" LYGI
     ============================================================
     Vid val 151 i 150 vala drafti helt kassinn afram: "Pick 151 — take
     this", med lifunartolum ad vali sem er ekki til. Ekkert hrundi og
     thad er einmitt vandinn — skjar sem heldur afram ad rada thegar
     ekkert er eftir ad velja les eins og hann viti eitthvad.

     ============================================================
     OG HLIDID VAR TIL EN SPURDI RANGA HEIMILD — 17.8.2026
     ============================================================
     Hér stod `(league.teams || 0) * (league.rounds || 15)`. Notandinn
     sa ThVI **"Pick 151 — take this"** i 10-lida 15-umferda drafti sem
     endar a 150: deildin i appinu bar 12 lid, svo thakid var 180.
     Hlidid var graent i hverju profi thvi hvert prof gaf SOMU logun a
     bædi deild og draft — nakvaemlega tilfellid sem getur ekki fallid.

     Talan kemur nu ad ofan, reiknud ur logun DRAFTSINS (`snakeTeams`
     x `snakeRounds`), med deildina sem varaleid. Vordur:
     `tests/draft-live.mjs` kafli 9.                                  */
  const bound = Number.isFinite(Number(totalPicks)) && Number(totalPicks) > 0
    ? Math.round(Number(totalPicks))
    : (league.teams || 0) * (league.rounds || 15);
  if (bound > 0 && pick > bound) {
    return (
      <div className="panel">
        <h2>Draft complete</h2>
        <div className="sub">
          All {bound} picks are in ({snakeTeams || league.teams} teams ×{" "}
          {snakeRounds || league.rounds || 15}{" "}
          rounds). Your roster is on the right; nothing below is a decision any more.
        </div>
      </div>
    );
  }

  if (!rec || !rec.picks.length) return null;
  const top = rec.picks.slice(0, 5);
  const differs = rec.urgencyPick && rec.urgencyPick.id !== rec.picks[0].id;

  /* ============================================================
     EITT NAFN, EKKI MATSEDILL.
     ============================================================
     Kassinn bar adur fimm radir med tolum og valkost vid hlidina, og
     notandinn sagdi rett: "eg vill ekki thurfa ad velja neitt". Fimm
     radir ERU val, hversu graent sem efsta merkid er.

     RODIN SJALF HAGGAST EKKI — hun er maeld (A-Ranking, sja advice.js).
     Thetta er birting: urskurdurinn stendur einn efst og rokstudning-
     urinn er felldur nidur. Thad er MIKILVAEGT ad hann se enn thar og
     opnanlegur: tolur an raka eru orakli, og allt i thessu verkefni
     hvilir a thvi ad haegt se ad spyrja "af hverju".

     K/DST ERU NEFNDIR MED NAFNI THEGAR AD THEIM KEMUR. Adur sagdi
     kassinn "take them late, from the K and DST table" — sem er
     nakvaemlega thad ad lata notandann velja. Their eru utan A-Ranking
     af maeldri astaedu (spar theirra flytjast ekki milli ara), svo
     urskurdurinn segir thad berum ordum i stad thess ad thegja. */
  const needKdst = rec.mustFillUrgent && rec.mustFill && rec.mustFill.length > 0;
  const kdstPick = needKdst && kdst && kdst.length
    ? kdst.find((r) => rec.mustFill.some((m) => m.pos === r.pos)) || null
    : null;
  const verdict = kdstPick || top[0];
  const vRow = available.find((r) => r.id === verdict.id)
    || (kdst || []).find((r) => r.id === verdict.id) || null;
  const why = kdstPick
    ? `You have ${rec.picksLeft} picks left and still need ${
        rec.mustFill.map((m) => m.pos).join(" and ")}. Take him now or start a player short.`
    : (top[0].reasons && top[0].reasons.length
        ? top[0].reasons[0].text
        : "Highest value over replacement on the board.");

  return (
    <div className="panel">
      <h2>Pick {pick} — take this</h2>

      <div className="verdict">
        <div className="verdict-name">
          <span className={`pos ${verdict.pos}`}>{verdict.pos}</span>
          <b>{verdict.name}</b>
          {vRow && vRow.team && <span className="dim"> · {vRow.team}</span>}
          {vRow && vRow.bye != null && <span className="dim"> · bye {vRow.bye}</span>}
        </div>
        <div className="verdict-why">{why}</div>
      </div>

      <div className="sub">
        {sync && sync.draftId
          ? `Pick ${pick} by the board below. `
          : `Assuming you are on the clock at pick ${pick}. `}
        {/* ENGIN TALA THEGAR ENGIN TALA ER TIL. Rounds+2-slakinn let
            kassann skrifa "Your next pick is 154" i 150 vala drafti —
            tala sem er rong OG truverdug, sem er versta utkoman. */}
        {rec.nextPick == null
          ? <b>This is your last pick — you have none after it.</b>
          : <>Your next pick is <b>{rec.nextPick}</b>, {rec.wait} picks away.</>}
        {kdstPick && " Kicker and defence are ranked by projection alone — their"
          + " year-to-year skill does not carry, so this is the one call in the app"
          + " that is not backed by a backtest."}
      </div>

      {/* K og DST eru utan A-Ranking af maeldri astaedu, en tha ma ekki
          thegja um: annars endar draftid med tvo tom byrjunarsaeti. */}
      {/* ============================================================
          AUDAR VIKUR ERU SYNDAR, EN THAER RADA ENGU
          ============================================================
          MAELT (scripts/bye-lab.mjs, VIKULEG talning yfir 2019-2025 a
          badum spaheimildum — timabils-summan er BLIND a audar vikur
          og gat aldrei svarad thessu):

            fftoday, 7 ar   +5,7 til +28,2 stig · besta t = 1,29
            sleeper, 5 ar   +15,5 til +37,6 stig · besta t = 1,80

          TIU AF TIU VOGUM JAKVAEDAR, a tveimur ohadum heimildum — en
          8 af 12 arum og teiknaprof p vel yfir 0,05. Merkid er thvi
          sterkara en null og veikara en maeling.

          Ad setja thad i RODUNINA vaeri ad lata omaelda tolu faera menn
          til; sama akvordun og Evruálagid i FPL-verkefninu, sem er
          synt sem samhengi en fer hvergi inn i rodun. Talan sem RADAR
          er afram hrein VBD.                                        */}
      {rec.byeClash && rec.byeClash.length > 0 && (
        <div className="note" style={{ marginTop: 8 }}>
          <b>Bye overlap in your roster:</b>{" "}
          {rec.byeClash.map((c) => `${c.n} ${c.pos} in week ${c.bye}`).join(" · ")}.
          {" "}This does <b>not</b> move anyone in the list below — measured across
          2019–2025 on both projections it is worth somewhere between nothing and
          about thirty points a season, and the interval includes zero. It is here
          because it is the one thing a season-long ranking cannot see for you.
        </div>
      )}

      {/* ============================================================
          ÞEIR SEM SPILA EKKI — NEFNDIR, EKKI FALDIR
          ============================================================
          Sja notuna vid `sidelined` i advice.js fyrir villuna sjalfa.
          Hér er BIRTINGAR-reglan: ad sia mann ut ur rodun THEGJANDI er
          jafn slæmt og ad rada honum. Notandinn leitar Kittle, finnur
          hann ekki, og veit ekki hvort appid vissi eda gleymdi. Ástaedan
          er thvi skrifud vid hvert nafn — thad er sama krafa og
          `unranked` gerir um K og DST.

          OG KASSINN NEFNIR EKKI ALLA — SKURDURINN ER I `advice.js`.
          Hann bar thretta menn og notandinn sa thad: Bridgewater a
          VBD -288 keppti um athygli vid Kittle. Þeir sem eru undir
          varamanns-linunni eru TALDIR i stad thess ad vera nefndir, og
          talan visar a bordid thar sem their standa afram — enginn
          hverfur thegjandi, sem var asetningurinn allan timann. */}
      {rec.sidelined && (rec.sidelined.length > 0 || rec.sidelinedBelowRepl > 0) && (
        <div className="note warn" style={{ marginTop: 8 }}>
          <b>Not in the list — they are not playing.</b>{" "}
          {rec.sidelined.length > 0 && <>
            {rec.sidelined.map((s, i) => (
              <span key={s.id}>
                {i > 0 && " · "}
                <span className={`pos ${s.pos}`}>{s.pos}</span> {s.name}{" "}
                <span className="badge bad">{s.injury || "unavailable"}</span>
              </span>
            ))}
            .{" "}
          </>}
          {rec.sidelinedBelowRepl > 0 && <>
            <b>{rec.sidelinedBelowRepl} more</b>{" "}
            {rec.sidelinedBelowRepl === 1 ? "is" : "are"} out and not named here:{" "}
            {rec.sidelinedBelowRepl === 1 ? "he is" : "every one of them is"}{" "}
            <b>below replacement</b> even at a full 17 games
            {rec.sidelinedWorst != null && <> (down to {rec.sidelinedWorst} VBD)</>}, so
            {rec.sidelined.length > 0
              ? " listing them would bury the name above."
              : " none of them is a pick you are missing."}{" "}
            They are in the board below, with the same red badge.{" "}
          </>}
          Their projections are full 17-game numbers with <b>no injury discount</b>,
          so the rank, tier and "value vs market" you can still read on the board
          below are all computed from points they are not going to score. They are
          out of the order above on purpose. Availability is the one part of this
          the app treats as all-or-nothing: only a status that means{" "}
          <i>will not play</i> removes anyone, because that step was measured to
          carry the benefit and finer grades were measured to carry none.
        </div>
      )}

      {rec.mustFill && rec.mustFill.length > 0 && (
        <div className={`note ${rec.mustFillUrgent ? "warn" : ""}`} style={{ marginTop: 8 }}>
          <b>Still to fill: {rec.mustFill.map((m) =>
            `${m.short} ${m.pos}`).join(", ")}.</b>{" "}
          {rec.mustFillUrgent
            ? `You have ${rec.picksLeft} picks left. The verdict above already names the one to take.`
            : `These never appear in the list below: they were excluded from every
               simulation that validates the order, so ranking them would be a guess
               dressed as a measurement. Take them late, from the K and DST table.`}
        </div>
      )}

      <details className="reasoning">
        <summary>Why him — and the four behind him</summary>
      <div className="tablewrap" style={{ marginTop: 10 }}>
        <table className="data">
          <thead><tr className="cols">
            <th className="txt frozen">Player</th>
            <th className="txt">Pos</th>
            <th title="Value over replacement — this is what decides the order">VBD</th>
            <th title="Chance he is still there at your next pick">Lasts?</th>
            <th title="Best VBD his position should still offer at your next pick">Next best</th>
            <th className="txt">Why</th>
          </tr></thead>
          <tbody>
            {top.map((p, i) => (
              <tr key={p.id} style={i === 0
                ? { background: "rgba(53,196,122,.10)" } : undefined}>
                <td className="txt frozen">
                  {i === 0 && <span className="badge on" style={{ marginRight: 6 }}>take</span>}
                  {p.name}
                </td>
                <td className="txt"><span className={`pos ${p.pos}`}>{p.pos}</span></td>
                <td className="mono"><b>{p.vbd == null ? "—" : p.vbd.toFixed(1)}</b></td>
                <td className={`mono ${p.survive != null && p.survive < 0.25 ? "bad"
                  : p.survive != null && p.survive > 0.7 ? "good" : ""}`}>
                  {p.survive == null ? <span className="null">—</span>
                    : `${Math.round(p.survive * 100)}%`}
                </td>
                <td className="mono dim">{p.expectedNext == null ? "—" : p.expectedNext}</td>
                <td className="txt dim" style={{ fontSize: 12 }}>
                  {p.reasons.slice(0, 2).map((r) => r.text).join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {differs && (
        <div className="note">
          <b>A note on scarcity.</b> If you ranked by how steeply each position
          falls off before your next pick, this would say{" "}
          <b>{rec.urgencyPick.name}</b> instead. It does not, because that rule was
          measured: a team drafting on positional urgency finished{" "}
          <b>{Math.abs(MEASURED.urgencyVsARank.standard.diff)} points behind</b> one
          that simply took the best player, in standard scoring, losing all four
          seasons tested. It trades away points you can never get back for a cliff
          that flattens out anyway.
        </div>
      )}

      <div className="dim" style={{ marginTop: 8, fontSize: 12 }}>
        "Lasts?" uses each player's ADP <i>and its spread</i> — a player at ADP 30
        with a standard deviation of 3 is a very different bet from one at 30 with a
        deviation of 20. Where a bookmaker figure is missing we fall back to{" "}
        <code>{MEASURED.sdRule}</code>, fitted on {MEASURED.sdRuleSample.toLocaleString()}{" "}
        player-seasons.
      </div>
      </details>
    </div>
  );
}

/* ============================================================
   MARKADURINN ER AD HREYFAST — OG ADP VEIT ThAD EKKI ENN
   ============================================================
   ADP ER 7 DAGA MEDALTAL. Thad er ekki agiskun heldur lesid ur
   `adp.json`: FFC gefur 5.789 droft fra 4. til 11. agust. Frett sem
   berst i dag er thvi ~3,5 daga ad sla i gegn ad medaltali og aldrei
   ad fullu fyrr en glugginn hefur velt sér. Fólk draftar a gomlu
   verdi, og thad er raunverulegt bil.

   Sleeper-trending er hins vegar SIDUSTU 24 KLST. Munurinn a theim
   tveimur er thvi thad sem herbergid er ad bregdast vid ADUR EN
   verdid hreyfist. Maelt i dag: af 40 mest saektu leikmonnum eru
   **27 med ENGA ADP** — their voru ekki draftadir fyrir viku.

   ÞETTA ER EKKI ROD OG MA ALDREI VERDA ThAD.
   Ad vera saektur mikid thydir "eitthvad gerdist", ekki "hann verdur
   godur": byrjunarmadur meiddist, einhver faerdist upp i dyptarskra,
   eda thad er einfaldlega aefingabudahype. Hvort thad SPAIR STIGUM er
   OMAELT — og thad er omaelt af godri astaedu: Sleeper geymir enga
   sogu um trending, svo bakprofid var ekki til fyrr en vid byrjudum ad
   vista thad (11.8.2026). Med einu timabili af vistun verdur haegt ad
   spyrja "borgar sig ad elta hreyfinguna?" i oktober.

   Thangad til stendur thetta sem UPPLYSING: thu sérd hvad herbergid er
   ad gera adur en verdid segir thér thad. Rodin sjalf haggast ekki.
   ============================================================ */
function MarketMoving({ rows, taken, onTake }) {
  const moving = React.useMemo(() => rows
    .filter((r) => r.trendAdd != null && r.trendAdd > 0 && !taken.has(r.id))
    .sort((a, b) => b.trendAdd - a.trendAdd)
    .slice(0, 12), [rows, taken]);
  if (!moving.length) return null;

  const unpriced = moving.filter((r) => r.adp == null).length;
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

  return (
    <div className="panel">
      <h2>The room is moving on these</h2>
      <div className="sub">
        Sleeper adds over the last 24 hours. <b>ADP is a seven-day average</b> — the
        board below prices players on what people were drafting up to a week ago, so
        anything that happened this week is not in it yet.
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        {moving.map((r) => (
          <button key={r.id} className="chip" onClick={() => onTake(r, true)}
            title={`${r.trendAdd} adds in 24h · ${r.adp == null ? "no ADP yet" : `ADP ${r.adp.toFixed(0)}`}`}>
            <span className={`pos ${r.pos}`}>{r.pos}</span> {r.name}
            {" "}<span className="dim">{fmt(r.trendAdd)}</span>
            {r.adp == null && <span className="badge warn" style={{ marginLeft: 5 }}>no ADP</span>}
          </button>
        ))}
      </div>
      <div className="note" style={{ marginTop: 10 }}>
        <b>{unpriced} of these {moving.length} have no ADP at all</b> — they were not
        being drafted a week ago. That is the gap you are looking at.
        <br /><br />
        <b>This is not a ranking and it does not move anyone in the board below.</b>{" "}
        Heavy adds mean <i>something happened</i> — a starter got hurt, someone climbed
        the depth chart, or it is camp noise. Whether it predicts points is{" "}
        <b>unmeasured</b>, and it is unmeasured for a reason: Sleeper keeps no history
        of this, so there was nothing to backtest until we started archiving it on
        11 August 2026. One season of archive makes the question answerable in October.
      </div>
    </div>
  );
}
