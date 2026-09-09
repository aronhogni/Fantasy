# HANDOVER — NFL-hlutinn (`nfl/`), 24.8.2026

Skrifað af lotunni sem vann 12.–24.8. Lesið **CLAUDE.md** og **nfl/README.md** fyrst;
þetta skjal segir aðeins það sem er *í gangi núna* og það sem kostaði tíma.

---

## 0. STAÐAN

`origin/main` — **27/27 prófasöfn græn, `npm run build` grænt**, sannreynt á
rebase-aða trénu eftir að pipeline-cron (`0a54faa`) lenti inn undir vinnunni.

Afturköllunar-akkeri: **`draft-safe-2026-08-14`**.

> **LOTAN 24.8. (kvöld) KLÁRAÐI ALLA ÞRJÁ FORGANGSLIÐINA — sjá kafla 10.**
> `usageblend` og ROS-waiver-gjaldmiðillinn eru **tengd**; spá-grunnurinn er
> **mældur** (Sleeper stendur); `value`-þakið er **mælt** og svarið er þriðja
> útkoman, „við getum ekki sagt", sem kallaði á aðra aðgerð en þak.
>
> **LOTAN 25.8. KLÁRAÐI OPNA LISTANN — sjá kafla 11 og 12.** Fjórir liðir
> eftir í kafla 5 eru nú allir afgreiddir: forsíðu-kortin verðleggja hvert úr
> sinni deild · linear draft er heiðraður · meiðsla-serían er hafin · og
> `benchRegret` er **tengd** (kafli 12). **Ekkert var hent og það er
> niðurstaða, ekki aðgerðaleysi** — kafli 11 segir hvað var skoðað.

**Deildirnar hans** (ég hafði þær RANGT í marga daga — lesið úr `data/`, ekki
úr minni):
- **Patriots SB champs** — 10 lið, **FULL PPR**, `QB1 RB2 WR2 TE1 FLEX2 K1 DST1`, 15 umferðir
- **Sófahetjur** — 12 lið, **HALF-PPR**, **enginn K, engin DST**, 14 umferðir

---

## 1. FIMM REKSTRAR-REGLUR SEM KOSTUÐU RAUNVERULEGAN TÍMA

1. **ALDREI tvö `npm test` samtímis.** Dagsettu safnaskrárnar skrifa probe-skrár
   á disk; samhliða keyrslur gefa **draugaslæmar** niðurstöður. Þrjár lotur
   eltu drauga vegna þessa. Ein keyrsla tekur **~6 mín 40 sek** — það er
   normalt, ekki frost.
2. **Vinnutréð er sameiginlegt með annarri lotu (FPL).** Hún er *virk*. Aldrei
   `git add -A`, aldrei commita hennar skrár (rót-`src/`, rót-`scripts/`,
   `CLAUDE.md`, `docs/`). Vinnið í **throwaway worktree** á `origin/main`,
   symlinkið `nfl/node_modules`, pushið þaðan.
3. **REBASE ER NÝTT ÁSTAND.** Ég pushaði einu sinni eftir rebase án þess að
   endurkeyra prófin og gerði main rautt. Keyrið prófin **á rebase-aða trénu**
   fyrir hvert push.
4. **Pushið hvert increment um leið og það er grænt.** Átta agentar hafa dáið á
   limit-um í miðju verki hér. Ópushuð vinna er töpuð vinna.
5. **`tests/pipeline.mjs` keyrir FYRIR commit-þrepið** í `nfl-data.yml`. Vörður
   sem fellur eyðir gögnum þeirrar keyrslu — þrjár CI-keyrslur töpuðust svona á
   draft-degi, þar á meðal skráin sem vörðurinn var að verja.

---

## 2. FJÓRIR AGENTAR — ALLIR STÖÐVAÐIR, VERKIÐ BJARGAÐ OG KLÁRAÐ

Þessi tafla er **söguleg**. Agentarnir voru stöðvaðir, vinna þeirra björguð
(`e10b127`), og lotan 24.8. um kvöldið kláraði #1, #2 og #4. Sjá kafla 10.

| # | Verk | Hvar |
|---|---|---|
| 1 | Víra `usageblend` + ROS-waiver-gjaldmiðil (mælt, ótengt) | `src/weekview.js`, `src/waivers.js`, `src/usageblend.js` |
| 2 | TE-þyrpingin — 58% af fyrstu þrem pikkum | nýtt `*-lab.mjs` + `data/measure/` |
| 3 | Forleiks-markaðurinn dagsettur + dagsvörður á allar seríur | `scripts/sources/**`, `data/**`, `tests/pipeline.mjs` |
| 4 | Spá-grunnurinn sjálfur (Sleeper vs annað) | nýtt `*-lab.mjs` + `data/measure/` |

**#1 er stærsti mældi vinningurinn sem er ótengdur:** `usageblend` +6,4/+8,6/+7,1
pp af bilinu, per-leikmanns CI útiloka núll; ROS-gjaldmiðillinn +13,6 stig/tímabil,
7 af 7 tímabilum. Bæði bíða aðeins `data/weekly/2026.json`, sem verður til í viku 1.
**Skilyrði:** með enga vikuskrá verða allar tölur að vera **bætis-eins** og í dag,
og ROS-gjaldmiðillinn ber skilyrt fund — gólfið verður að hlutfallast við vikurnar
sem eftir eru (`WAIVER_CAL.minGain`), annars er downside tekið án upside.

---

## 3. HVAÐ VAR LAGAÐ 12.–24.8. (ekki endurgera)

**Villur sem hefðu logið á draft-nótt:** borðið og kassinn með tvær ólíkar tölur
um næsta val (samhljóða í 10% valda) · tvö vistuð svið sem felldu appið *varanlega*
við hverja hleðslu · mock A lak inn í mock B (aðeins yfir F5) · 12-liða reikningur
á 10-liða drafti · **appið las hóp ANNARS MANNS í 15 pikk í röð** (sætið erfðist)
· `DEF` í vistuðu ástandi þýddi að varnar-sætið varð ALDREI fyllt · `Reset &
disconnect` fyllti borðið aftur úr svari sem var í flugi · start/sit sagði
ALLTAF „already optimal" (las `advice.swaps`, fallið skilar `changes` — hafði
aldrei virkað) · ESPN-sentinel (169–171) notaður sem markaðsverð á 654 röðum,
þar á meðal hættir leikmenn · `value`-dálkurinn bar tvo ólíka grunna.

**Prófakerfið sjálft:** eitt safn taldi 29 föll og notaði þau aldrei (gat ekki
fallið) · `entry.mjs` var ekki í `SUITES` · runner gleypti stderr ·
innflutnings-strippun í `wiring.mjs` át 2.749 stafi af raunverulegu JSX.

**Nýtt sem virkar:** sætið leysist sjálft (þrjár leiðir, *eigin pikk vinna*,
leiðin nefnd á skjá) · tveir kostir með ★ á fyrsta · meiðsli útiloka úr ráðgjöf ·
DST-streymi (r 0,996 við Sleeper) · h2h-harness (sigrar, ekki bara stig) ·
ráðgjafar-bókhald · sex dagsettar seríur · ESPN-mirror svo CI þarf ekki handvirka
keyrslu.

---

## 4. MÆLT OG FELLT — ENDURTAKIÐ EKKI ÁN NÝRRA GAGNA

Um **fimmtán** hugmyndir hafa fallið. Allar prófuðu **leiðréttingu OFAN Á**
Sleeper-spána, og niðurstaðan er samhljóða: *spáin hefur þegar verðlagt
upplýsingarnar og VBD umbreytir þeim rétt.*

`prevCarG` · markaðsoddar (heiðarlegi armurinn: **−0,8 stig** í þá átt sem maður
myndi víra) · sérfræðinga-ECR blandað **og** eitt · fjöldahreyfing (r +0,394 EIN,
**−0,0005** ofan á `ep_next`) · **lifunarháð tímasetning** (rétta EV-formið tapar
*marktækt* í öllum þrem lögunum: −57,2 / −38,5 / −60,0) · elite-QB í þrem formum ·
`maxPos.QB` (annar QB kostar **~0,03 sigra** — ég sagði hann væri stærsta tapið
og það var **rangt**) · varamanns-hliðranir (0 af 153) · aldurs/reynslu-ferlar ·
shrink-fjölskyldan (0 af 36) · room-analýsa · tiebreak á lifun · defweek ·
mktweek/game-script · `FLEX_SPLIT.TE` sveipað 0→0,40 (**0 af 102**, formerki
snýst milli hans tveggja deilda).

**Eina sem stóðst:** VBD slær hráa spá í **umferðum 1–3** (+98,3 stig / +0,83
sigrar í 10-liða) — en mekanisminn er að **það draftar ekki QB þar**, sem það
gerir þegar. Haldið QB utan báðra arma og toppurinn er ógreinanlegur.

---

## 5. OPIÐ — OG ÞAÐ ER LÍTIÐ

**Allt sem var á listanum er gert (kaflar 10–12). Eftir stendur þetta:**

1. **Allt bíður viku 1.** `usageblend`, ROS-gjaldmiðillinn, meiðsla-serían og
   `benchRegret` eru **öll tengd og vöktuð**, en ekkert þeirra getur *skilað*
   tölu fyrr en `data/weekly/2026.json` verður til. **Fyrsta verk í viku 2 er
   að staðfesta að hún hafi verið skrifuð** — bregðist það halda öll gildi sér
   óbreytt (bæti-eins), svo bilunin væri **þögul**.
2. **`practice_status` er ómælt.** Serían er hafin en engin mæling fylgir og
   ekkert í appinu les hana. Hráefni. Fyrsta færi á mælingu er í október.
3. **`MyTeam`-flipinn — ÁKVÖRÐUN NOTANDANS.** Eina bókaða ástæðan fyrir því að
   geyma hann var `benchRegret`, sem er nú á forsíðunni. Hann var **ekki**
   fjarlægður: að henda flipa er ákvörðun sem enginn bað um. Sjá kafla 13.

## 6. ÞAÐ SEM HANN VILL (hans orð, endurtekið)

- **Draft-síðan á að segja hvern á að velja** — 1 eða 2 nöfn, ekkert annað.
  Hann hefur beðið um minni texta **fjórum sinnum**. Setningar sem eru til
  af því að eitthvað er **ÓMÆLT** verða samt að lifa (tooltip/`<details>`/Model
  lab) — að fella þær er eina sem má ekki gera.
- **Eitt innsláttarsvið, einn Connect, eitt ljós** (grænt/rautt). Komið.
  Lögunar-misræmi er **RAUTT**, ekki gult: ef tölurnar tilheyra annarri deild
  ertu ekki nytsamlega tengdur.
- Hann vill **vinna deildina**, ekki bara vera með. Nýjasta mock: **4. af 10**
  (1938 á móti 2062 hjá #1) — upp úr *síðasta* af 10 (1584) eftir sætis-villuna.

---

## 7. TVENNT SEM ÉG HAFÐI RANGT — SVO ÞÚ ENDURTAKIR ÞAÐ EKKI

1. Ég sagði **tveir-kostir-kassinn hefði verið afturkallaður**. Hann hafði
   *aldrei* verið það — hefur verið í `main` frá 20.8. Ég las commit þar sem
   *skilaboðin* voru um tvo kosti en *diffið* var mine/gone-sjálfvirknin.
2. Ég sagði **annar QB væri stærsta tapið** í drafti hans. Mælt: **~0,03 sigrar**.
   Ég fullyrti áður en ég mældi.

Almennt: **grænt segir lítið hér.** Hver alvarleg villa var græn-prófuð þegar hún
fannst, og tvær voru ósýnilegar af sömu byggingarlegu ástæðu: **fixtúran bar
forsenduna sem var villan.** Öll próf gáfu appinu réttan hóp, svo enginn athugaði
hvort hópurinn *væri* réttur. Öll próf gáfu deild og drafti sömu lögun, svo
enginn athugaði hvort þau gætu verið ólík. **Leitið að tveimur sannleiks-heimildum
sem geta verið ósamhljóða.**

---

## 10. LOTAN 24.8. (KVÖLD) — ÞRÍR FORGANGSLIÐIR, FJÖGUR PUSH

Öll fjögur pushuð á `origin/main`, hvert grænt fyrir sig (27/27), og
lokakeyrsla gerð **eftir** rebase sem dró inn pipeline-cron.

| commit | hvað |
|---|---|
| `f8835b2` | `usageblend` tengd — notkun-til-þessa ræður nú viku-spánni |
| `9d6f3af` | ROS-waiver-gjaldmiðillinn tengdur, með **pro-rata gólfi** |
| `3338e9a` | spá-grunnurinn **mældur** — Sleeper stendur |
| `a2fcda2` | `value` utan draftsins — talan stendur, fullyrðingin dregin til baka |

### Hvað var raunverulega að

**`usageblend` var skrifuð, prófuð og ÓKÖLLUÐ í tvær vikur.** Ástæðan var ekki
gleymska: `estimateFromZ` tekur `z`, og `z` er ekki eiginleiki leikmanns heldur
**þversniðs** — hann verður ekki til fyrr en einhver velur *laugina*. Það vantaði
eitt fall (`usagePool`), og enginn hafði tekið eftir því af því að einingin var
100% græn. Sama ætt og `lineups.json` í FPL: *kóðinn og verðirnir eru komnir* er
ekki sama og *talan lendir á skjánum*.

**Lykillinn er `gsisId`, ekki `id`.** Vikuskrárnar bera GSIS-auðkenni, borðið ber
Sleeper-auðkenni. Væri lyklað rangt skilar vírinn **þöglu réttu svari** (spáin
óbreytt) — bilun sem lítur nákvæmlega eins út og rétt forleiks-hegðun. Prófið ber
því töluna: 240 pöruð = sjálfstæð talning 240, og Sleeper-`id` finnur **núll**.

**ROS: gólfið er aðalatriðið, ekki gjaldmiðillinn.** `rosVbd` og `rosVbdPro` eru
sami gjaldmiðillinn; munurinn er hvernig `minGain` er beitt. Með **algildu**
gólfi kostar sent gólf 10 **+7,1 stig/tímabil** (CI [3,8 · 10], útilokar null) —
því 10 stig eru mild krafa í viku 3 og ómöguleg í viku 13, svo verkfærið þagnar
nákvæmlega þegar deildin ræðst. **Pro-rata** gólfið gerir valið óskaðlegt
(+0,1, CI [−1,1 · 1,3]), sem er einmitt það sem viðurkennd *valin* tala þarf.

### Tvær staðnaðar tölur sem sögðu sitthvað í tíu daga

`WAIVER_CAL.currency` bar „+13,2 · t=2,97 · 6 af 7 · CI [5,9 · 22,2]" og
`minGain` bar „+5,4 CI [2,2 · 8,2]". **Hvorug er í `data/measure/waiver.json`.**
Labið var endurkeyrt 14.8. kl. 23:08 og nóturnar sátu eftir. `tests/waivers.mjs`
kafli 12 **pinnar nú hverja einustu tölu við skrána** (27 fullyrðingar). Gömlu
tölurnar standa áfram í nótunni **sem villusaga**, og prófið krefst þess.

### Þrjár almennar reglur sem lotan gróf upp

1. **HLIÐ SEM GETUR EKKI STAÐIST MÆLIR EKKERT — spegilmynd tómu
   fullyrðingarinnar.** `projbase-lab` N5 reiknaði `abs / max(1e-9, |exp|)`, sem
   við `exp = 0` er `abs × 1e9`; krafan `rel ≤ 1e-9` var því `abs ≤ 1e-18`,
   undir tvöfaldri nákvæmni. **Enginn réttur reikningur gat staðist það.**
   Sleeper-armurinn slapp á heppni (enginn leikmaður lenti á nákvæmlega 0);
   FFToday-armurinn hitti einn og skriftan dó. Hlið sem *getur ekki fallið* og
   hlið sem *getur ekki staðist* líta bæði út eins og strangleiki.
2. **NÚLL ER EKKI NIÐURSTAÐA FYRR EN ÖFUGI ARMURINN FINNUR EITTHVAÐ.**
   „0 af 315" er nákvæmlega það sem bilað mælitæki gefur líka. Sama net með
   FFToday sem viðmið **finnur** sigurvegara — og hann er Sleeper (+329…+446,
   7 frumur). Þess vegna er núllið mæling en ekki þögn. Vörðurinn fellur ef
   öfugi armurinn hættir að finna sigurvegara.
3. **TVÆR STÆRÐIR SEM DEILA LIÐ ERU FYLGNAR ÁÐUR EN NOKKUR UPPLÝSING KEMUR
   VIÐ SÖGU.** Fyrsta útgáfa `valuecap-lab` mældi `r(value, realSurplus)` beint
   og fékk **hærri** fylgni utan draftsins en innan — því báðar bera `adp'`, sem
   sveiflast meira þar. Það hefði lokað spurningunni rangt. Plasebó sem heldur
   `adp'` óbreyttu og umraðar aðeins okkar röð tekur mengunina út.

### Villur í mínum eigin kóða/prófum sem prófin tóku

- **`Number(null)` er `0`, ekki `NaN`.** `num()` í `ros.js` vantaði null-vörðinn
  sem `waivers.js` hefur: `proRatedFloor(f, {week: null})` gaf `10·15/14`, röð án
  `week` taldist vika 0 og lak inn í „stig hingað til", og leikmaður án spár fékk
  ROS-verð úr engu.
- **Sæta-talning er hávaða-drifin.** Fyrsta útgáfa C2 taldi hve mörg sæti færast
  og krafðist >50%; réttur kóði gefur 500 af 505 — en stökkbreytingin gefur
  **409**, sem stenst líka, því röðin er full af jafnteflum. Prófsteinninn er
  gildið sjálft (r 0,893 á móti 0,9995).
- **Tvær töflur í sama DOM.** `querySelectorAll("table tbody tr")` las bæði
  ráðgjafar-kassann (6 dálkar) og borðið (13), svo Value-vísitalan átti við ranga
  töflu: „0 raðir lesnar" **og** „0 græn utan" — seinni fullyrðingin hefði
  staðist ein og sér.
- **`timeout` er ekki til á macOS.** Þrjú stökkbreytingapróf „keyrðu" og
  skiluðu engu; ég var nærri því að lesa það sem „engin bilun".

### Hvað er óprófað þangað til vika 1

`usagePool`, `blendedFor` og `rosCurrency` eru **öll** prófuð á `weekly/2025.json`
í gegnum nákvæmlega sama vír og 2026 mun nota. Það sem eftir stendur óprófað er
hvort `data/weekly/2026.json` **verði skrifuð** af pipeline-inu eins og ætlast er
til. Bregðist það halda öll gildi sér óbreytt (bæti-eins), svo bilunin væri
**þögul** — það er atriðið sem á að skoða fyrst í viku 2.

---

## 11. LOTAN 25.8. (NÓTT) — OPNI LISTINN KLÁRAÐUR, FJÖGUR PUSH

| commit | hvað |
|---|---|
| `b32c2f7` | hvert forsíðu-kort verðleggur úr **sinni** deild |
| `fc7fd68` | **linear draft** er heiðraður — snakk var reiknað hvað sem gerðin sagði |
| `5604b00` | meiðsla-serían hafin · `fetch-nfl` innflytjanleg · `benchRegret` hættir að ljúga |

### Það sem var raunverulega að

**Forsíðan verðlagði bæði kortin úr einni deild.** `App.jsx` byggir `rows` úr
`league` (þeirri virku) en teiknar kort **per deild**. Mælt á hans tveimur
deildum, 1.175 paraðar raðir: miðgildi **|ΔaRank| 9 sæti**, **|ΔVBD| 25,4
stig**, og **75 af 102** K/DST-röðum flökta milli raunverulegs VBD og `null`.
Tölurnar endurgerast nákvæmlega eins og úttektin skráði þær. Þetta var
ósýnilegt af því að það **leit normal út**: engin tala tóm, ekkert rautt, öll
27 söfnin græn.

**`linear` var á hvítlista út úr viðvöruninni en snakk var samt reiknað.**
`ownPickNo`/`picksUntilNext`/`nextOwnPick` gerðu alltaf ráð fyrir snáki.
Notandi í linear-drafti fékk rangt „næsta val mitt", rangan lifunar-lit á
**hverjum** leikmanni — og **enga viðvörun**. Viðvörunin var rétt að þegja; það
var reikningurinn sem var rangur. `imported.draftType` var geymt frá fyrsta
degi og **aldrei lesið**.

**`nv.injuries()` var aldrei kölluð**, og skráin hjá nflverse er
**endurskrifuð** — „hvað sagði skýrslan á fimmtudegi í viku 6" er ósvaranlegt
þegar vika 6 er liðin. Því hafin núna en ekki seinna.

### Þrjár almennar reglur sem nóttin bætti við

1. **HLIÐ Á SÓKNINNI, EKKI SÍA Á SVARINU.** Mælt: `injuries_2026.csv` er
   **404**, `injuries_2025.csv` er **200 með 6.069 röðum**. Væri sótt hvort sem
   er færi rauð röð í `status.json` daglega í margar vikur — og notandinn lærir
   á viku að hunsa kassann, þá er raunveruleg viðvörun jafn gagnslaus og engin.
2. **TÍMAMÆLING Á INNFLUTNINGI MÆLIR EKKI ASYNC KÓÐA.** Vörðurinn „importing
   má ekki keyra pipeline-una" var `await import()` með „< 3000 ms" og **slapp
   í gegnum** `if (true) main()`: `main` er async, einingin skilar strax og
   loforðið er aldrei beðið. Eina prófið sem virkar er **raunverulegt afrit í
   nýju ferli**, báðar leiðir.
3. **ÓTILVÍSUÐ SKRIFTA ER EKKI DAUÐ SKRIFTA.** Þrjár labs-skriftur höfðu enga
   tilvísun — og allar þrjár framleiddu committaðar mælingar sem README vitnar
   í. Að henda þeim væri að henda getunni til að endurtaka mælinguna.

### Hverju var hent: ENGU — og hér er hvers vegna

Hreinsun var heimiluð berum orðum og ég leitaði. **Ekkert reyndist óhætt:**

| skotmark | stærð | úrskurður |
|---|---|---|
| `_to_delete/` | 160 MB | **FPL-megin** (`captain.js`), og `review-src.tgz` þar inni var búið til **í kvöld kl. 20:18** af kóðarýni-lotu sem er enn að störfum. Ekki mitt. |
| `nfl/.cache-nfl` | 849 MB | gitignored rannsóknar-cache, sami flokkur og FPL skjalar sem *geymist*. Endurgeranlegt en dýrt. |
| 3 ótilvísaðar labs-skriftur | — | framleiða allar mælingar sem README vitnar í. |
| `PRESETS` í `scoring.js` | — | leit mín sagði „dautt"; það er **notað í línu 114 í sömu skrá**. Skönnunin útilokaði skilgreiningarskrána. Mælitækið hafði rangt fyrir sér, ekki kóðinn. |

**`_to_delete/` er eina raunverulega tækifærið (160 MB) og notandinn á að taka
þá ákvörðun sjálfur** — eða spyrja hina lotuna hvort `review-src.tgz` sé enn
í notkun.

### Villur í mínum eigin prófum sem ég fann með því að mæla

- **Skörunar-fullyrðingin var tátólógía.** Fyrsta útgáfa vörðarins á
  forsíðu-kortunum spurði hvort spjöldin bæru sömu spá-tölurnar. Mælt með og án
  lagfæringarinnar: skörunin er **0 í báðum**. Rétta prófið er orsakatengt —
  teikna sama kortið tvisvar, með og án `buildFor`, í sömu keyrslu — og það er
  auk þess ónæmt fyrir því að `players.json` er endurskrifuð daglega.
- **Ég giskaði á þröskuld** („≥ 15 af 20 hólfum víkja frá snáki") og fékk 12.
  Talan **leiðist af algebrunni**: í oddatölu-umferð er snakk eins og linear.
  Rétt fullyrðing er mynstrið sjálft, ekki þröskuldur — og hún er strangari.
- **`textContent` límir tölur saman** (`17.619` = 17,6 og 19), svo
  `\b\d\d\.\d\b` fann eina tölu þar sem fjórar voru. Sama ætt og `MUNaNEW`.
- **Ég bar saman nöfn úr 10-liða glugga** við borð sem appið teiknar með
  sjálfgefinni 12-liða deild — tveir gluggar, 150 og 180 val.

### Samvinna við aðrar lotur

`fantasy-48` var samtímis með óframdar breytingar á `nfl/src/MyTeam.jsx`. Ein
skörun, leyst með skilaboðum: þeirra breyting er tvær línur í teikningunni
(`/out|ir/i` → `avail === 0`), mín er undirskriftin og `usagePool`. Ekkert
árekstur. Þau bentu líka á tvennt sem gildir um framtíðar-vinnu í þessum hluta:
**allir Sleeper-endapunktar eiga að fara gegnum `sleeperGet`** (8 s timeout;
undici sjálfgefið ~300 s er ekki timeout heldur **frost** — borðið pollar með
`await pull()` → `setTimeout(tick)`, svo stöðnuð tenging bókar aldrei næsta
tikk meðan ljósið segir enn „reading picks live"), og **`load()` má ekki
cache-a bilanir** (það geymir loforðið, ekki niðurstöðuna — sérstök fullyrðing
ver það).

---

## 12. `benchRegret` TENGD (25.8., morgunn)

Síðasti ótengdi hlutinn. Commit `26c449c`.

**Hún átti ekki heima í `MyTeam` og það var rangt skjalað.** Sú skrá hefur
hvorki deildar-auðkenni né lifandi hóp — `roster` þar kemur úr `myPicks` í
`localStorage` (draft-borðið), sem er **önnur stærð** en „hvað var í sætunum í
viku 6". Forsíðan hefur allt sem þarf og gerir það **per deild**.

Þrennt nýtt: `D.sleeperMatchups` (gegnum `sleeperGet` hinnar lotunnar, 8 s
timeout) · `weekRegret()` í `lineup.js`, hreint fall sem byggir inntökin ·
og `Regret`-línan á kortinu.

**Tvær tölur, því munurinn er allt.** `left` er heildartapið, `avoidable` sá
hluti sem **spáin sá fyrir**. Að birta aðeins `left` væri að kenna notandanum
um heppni; aðeins `avoidable` væri að fela raunverulegt tap.

### Þrjár stökkbreytingar lifðu fyrstu útgáfu — og tvær áttu að gera það

- **`"0" talið sem leikmaður"` og `engin raunstig → 0`** lifðu báðar, og það er
  **rétt svar**: kóðinn ber **tvöfalda vörn** á hvoru (sían *og*
  `byId`-uppflettingin; `!ptsByGsis.size` *og* `!scored`). Fullyrðingarnar
  standa því um **útkomuna**, ekki um línuna.
- **`Dashboard` hættir að kalla `weekRegret`** lifði af alvöru ástæðu:
  vörðurinn í `tests/lineup.mjs` er **textaleit**, og strengurinn stendur enn í
  `(false ? weekRegret({...}) : null)`. **Textaleit greinir ekki „kallað" frá
  „skrifað".** Þess vegna er nýr kafli `dashboard.mjs` 3j sem les töluna **af
  skjánum** (tilbúinn heimur, svarið reiknað í hausnum: 3+4 spiluð, 30+1 á
  bekk, bestu tveir 34, `left` = **27**) — og hann fellir stökkbreytinguna.

Sami kafli ber líka að **í forleik sé ekkert kall gert**: fullyrðing um *það
sem var ekki gert*, sem er eina leiðin til að verja „hlið á sókninni". Rangt
hlið **brotnar ekki** — það eyðir bara Sleeper-kalli per deild allt sumarið.

> **VILLA Í MINNI EIGIN FIXTÚRU:** `slots` án `id` létu `optimalLineup` telja
> **sama manninn í bæði sætin** — `advised` mældist 60 þar sem hæsta mögulega
> summa allra fjögurra er 53. `DEFAULT_SLOTS`/`slotsFor` setja `id` alltaf.
> Fixtúran bar forsenduna sem var villan; kóðinn var réttur.

---

## 12b. TVEIR VERÐIR SEM KOMU ÚR SAMTALI VIÐ HINA LOTUNA

Hvorugur var á listanum; báðir eru raunveruleg göt sem fundust af því að
annar hélt áfram að spyrja.

**`tests/audit.mjs` var BLINT á `NaN`** (`a452409`). Úrtaks-smiðurinn í kafla
4 var `filter(v => v != null && Number.isFinite(v))` — hann **sigtar út**
ófinit gildi, svo hvert markapróf keyrði á þeim sem komust í gegn og dálkur
sem væri allur `NaN` hefði staðist þau **öll með því að vera ósýnilegur**.
`isFinite` notað til að **útiloka** þegar það átti að **fella** — sama ætt og
`!includes(X)` án sönnunar.

Á NFL-hliðinni er gatið **ekki opið og það er mælt**: 0 ófinit gildi í tíu
tölusviðum, því `blend()` skilar `{value: null}` en ekki `NaN`. Þess vegna var
pinnað upp á **framleiðandann** en ekki stráð `Number.isFinite` yfir tugi
lesenda — `weekview.js:337/374` og `lineup.js:327` lesa `r.proj != null` og
það er óhætt *nákvæmlega því* `proj` getur ekki verið NaN.

> Fyrsta stökkbreytingin var gagnslaus: að veikja `isFinite` í `blend` breytti
> engu, því **engin heimild ber NaN í dag**. Fullyrðingin er um að NaN *nái í
> raðirnar*, svo hún þarf innsprautun: `proj = NaN` á einum leikmanni gefur
> tvær bilanir (`proj` og afleidda `vbd`) auk þrepa-fullyrðingarinnar.

**Formerki `spread` var óvarið** (`e02ff5b`). `jákvætt = heimalið favorít`, og
alt viku-líkanið hangir á því (`heimalið = total/2 + spread/2`). Snerist
samningurinn hjá veitunni fengi **sterkara liðið lægra vænt skor** og
**ekkert yrði rautt** — tölurnar væru áfram á réttu bili.

Tilefnið: hin lotan mældi í dag að **ESPN breytti bæði kvarða OG viðmiðun** á
skot-hnitunum sínum í einni ferð. NFL-hliðin les engin hnit (athugað, ekki
gefið sér) en les `spread` frá **sömu veitu**. Vitnið er texti ESPN sjálfrar:
`details: "SEA -3.5"` nefnir favorítinn og er **óháður tölunni** — sama
rökfræði og `zone`-textinn sem þau kvörðuðu hnitin með.

Mælt: **271 af 271 samhljóða um bæði formerki og stærð.** Einu „frávikin"
voru þrír Washington-leikir (`WSH` á móti `WAS`) — skammstöfun, ekki villa, og
`normTeam` leysir hana. Stökkbreytingarnar tvær eru **viljandi aðskildar**, svo
breyting sem snýr báðum í einu getur ekki laumast fram hjá.

---

## 13. ÞAÐ SEM NOTANDINN ÞARF SJÁLFUR AÐ GERA

Fernt, og aðeins það fyrsta er tímaháð.

1. **`_to_delete/` — 160 MB, þín ákvörðun.** Ég henti engu. Innihaldið er
   FPL-megin (`captain.js`, `delta3.diff`, þrjár tarballs) **og
   `review-src.tgz` þar inni varð til kl. 20:18 24.8. hjá kóðarýni-lotunni**,
   sem var enn að störfum þegar ég leit. Spyrðu hana hvort skráin sé laus,
   eða eyddu möppunni sjálfur ef þú veist að hún er búin.
2. **`MyTeam`-flipinn: geyma eða henda?** Eina bókaða ástæðan fyrir honum var
   `benchRegret`, sem er nú á forsíðunni. Ég fjarlægði hann ekki — það er
   ákvörðun sem enginn bað um. Flipinn er hvort eð er falinn á bak við „More".
3. **Vika 1 (7. september): staðfestu að `data/weekly/2026.json` verði til.**
   Þetta er eina raunverulega hættan sem eftir er. Fjórar mældar niðurstöður
   hanga á þeirri skrá, og bregðist pipeline-an að skrifa hana **breytist
   ekkert á skjánum** — allt heldur sér bæti-eins og ekkert verður rautt.
   Sofandi verðirnir vakna sjálfir *ef* skráin kemur; þeir geta ekki sagt frá
   því ef hún kemur aldrei.
4. **Ekkert af þessu krefst API-lykla eða handtaka.** `NFL_LEDGER_USER` er enn
   eina `gh variable`-handtakið og það stendur óbreytt frá fyrra handover.
