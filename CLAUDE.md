# CLAUDE.md — leiðarvísir fyrir Claude Code í þessu repo

Byrjaðu á `npm ci && npm test && npm run build`. Allt á að vera grænt.

Þetta skjal er **reglurnar sem gilda**. Mælingarnar sem réttlæta þær — allar
töflur, öll úrtaksstærð, allar villusögur — eru í **`docs/MAELINGAR.md`**
(3.100 línur, söguleg, uppfærist ekki). Þetta skjal var stytt úr 3.141 línu
8.8.2026; **ekkert var fellt út, aðeins flutt.**

> **UNDIRKAFLA-NÚMERIN FLUTTUST MEÐ.** Kóðinn er fullur af athugasemdum á borð
> við `// sja CLAUDE.md 6j` — um 30 talsins í `src/`, `tests/` og `scripts/`.
> **Öll númer með bókstaf eða aukastaf** (3d · 3e · 6b · 6c · 6d · 6f · 6i ·
> 6j · 6l · 6o · 6t · 7b · 7.0 · 7.1 · 8b …) eru **kaflar í
> `docs/MAELINGAR.md`**, ekki hér. Sama gildir um „kafli“-dálkinn í töflunni í
> kafla 4. Númerin í ÞESSU skjali eru einföld: 1–11.

> **Grunnreglan í öllu repo-inu:** tölur eru **mældar**, ekki valdar. Ef þú
> vilt breyta vog, þröskuldi eða töflu þarf mæling að réttlæta það. Ómæld tala
> sem lítur út eins og mæling er versta útkoman — hún er röng OG trúverðug.

---

## 1. Hvað þetta er

FPL-skipulagstól (Fantasy Premier League) fyrir eigin notkun. **Viðmótið er
enskt og bara enskt** (tungumálalagið var tekið út 7.8.2026, sjá kafla 9).
Tímabilið **2026/27 hefst 21. ágúst 2026** (GW1-frestur 21.8. kl. 17:30 UTC).
Þegar þetta er skrifað er **preseason — engin umferð lokin**, og það skýrir
flestar tómar tölur í appinu.

| Hluti | Hvar | Athugasemd |
|---|---|---|
| Framendi | GitHub Pages, `https://aronhogni.github.io/Fantasy/` | Vite, base `/Fantasy/` |
| Gagna-pipeline | GitHub Actions → `data/*.json` í repo | `fetch.yml` daglega 05 UTC, `fetch-fast.yml` á 30 mín |
| Gögn lesin af | `raw.githubusercontent.com/.../main/data/*.json` | appið sækir beint, **enginn bakendi** |
| Proxy | Netlify function `netlify/functions/odds.js` | **EINA** sem Netlify hýsir |

**Sjö flipar** (`view` í `App.jsx`): `⚽ Planner` (upprunalega appið) ·
`👥 Player stats` (`PlayerList.jsx` — aðalverkfærið, sjá 6s) · `🛡️ Teams`
(`Teams.jsx`) · `📊 Gameweek` (`GwReport.jsx`) · `🏆 Leaderboard`
(`Leaderboard.jsx`) · `Best of the best` (`BestOfBest.jsx`, kórónu-ikon) ·
`Set pieces` (`SetPieces.jsx`).
Allir nema Planner lesa **AÐEINS `data/`** — þeir hanga ekki á liðinu þínu og
virka þótt ekkert sé tengt.

### Skráaskipanin — hrein rökfræði aðskilin frá React

Þetta er ekki smekkur heldur forsenda þess að prófin séu marktæk: **prófin
keyra nákvæmlega sama kóða og appið birtir.** Ekki afrita formúlur inn í
`.jsx`-skrár.

| Hreint (ekkert React) | Birting eingöngu |
|---|---|
| `model.js` — FFDR, þrep, vænt stig, söluverð | `App.jsx` (langstærst) |
| `stats.js` — dálkaskráin, mó/aó, byrjunar-líkur, auðgun | `PlayerList.jsx` |
| `market.js` — odds → vænt mörk → FFDR-þyngd | `GwReport.jsx` · `Compare.jsx` |
| `rotation.js` — róterings-par | `Rotation.jsx` · `PlayerPanel.jsx` |
| `teamstats.js` — liða-tölur | `Teams.jsx` · `Leaderboard.jsx` |
| `advisor.js` — kaup-ráðgjöfin | `SetPieces.jsx` · `Leagues.jsx` · `Imminent.jsx` |
| `bsd.js` — BSD-samlagning | `ShotMap.jsx` · `Icons.jsx` · `Pitch.jsx` |

> **ENGAR LÍNUTÖLUR HÉR — ÞÆR REKA.** Taflan bar áður nákvæman línufjölda
> per skrá; hann var **úreltur innan sólarhrings** (t.d. `App.jsx` 4.162 ->
> 4.294, `teamstats.js` 243 -> 284). Tala sem er alltaf röng er verri en
> engin tala. `wc -l src/*.js*` gefur hana rétta á sekúndubroti.

`scripts/fetch.mjs` er 3.371 lína og skrifar allt í `data/`.

**Leyndarmál í GitHub Secrets:** `ODDS_API_KEY`, `EURO_API_KEY`,
`API_SPORTS_KEY`, `BSD_KEY`. Þau eru gefin sem `env` í workflow-unum og eru
**write-only** — þú getur ekki lesið þau héðan. Aldrei lykil í kóða eða commit;
repo-ið er **public**. `.env`/`.env.local` eru í `.gitignore`.

---

## 2. Vinnulag sem gildir hér

1. **`git pull --rebase` ALLTAF fyrst.** `fetch-fast` cron committar `data/`
   á 30 mín fresti; annars fæst fast-forward-höfnun við push.
2. **`git add <skrár>`, ALDREI `git add -A`.** Tvær lotur hafa unnið á þessu
   vinnutré samtímis og `-A` sópaði vinnu annarrar inn í commit hinnar, svo
   commit-textinn lýsti henni ekki.
3. **Keyrðu prófin þrisvar fyrir hverja ýtingu**, ekki einu sinni. Nokkur próf
   lesa raunveruleg `data/`-gögn og kvörðunarpróf endurreikna úr þeim — flökt á
   að finnast áður en það lendir í main.
4. `npm run build` verður að vera grænt.
   **`npx esbuild` er EKKI nóg eftir að kóði er fluttur milli skráa** — hann
   þáttar, hann leysir ekki nöfn. Flutningur á blokk úr `Leaderboard.jsx` skildi
   eftir þrjár tilvísanir í horfin nöfn og gaf **hvítan skjá** meðan esbuild var
   grænt. Eftir flutning: `await import()` á skrána, eða keyrðu prófin sem opna
   flipann (`data-resilience.mjs`).
5. **Netlify: forðastu byggingar.** `netlify.toml` byggir AÐEINS þegar
   `netlify/` breytist (hver bygging kostar credit).
6. Commit-skilaboð á **íslensku án broddstafa** (ASCII), ítarleg: hvað, hvers
   vegna, og hvað var mælt. Sagan er raunveruleg skjölun hér.
7. Pipeline er ræst handvirkt með `gh workflow run fetch.yml` og niðurstaða
   lesin úr `data/`.

---

## 3. Reiknilíkanið — MÁ EKKI FÍNSTILLA Á TILFINNINGU

Vogtölur og töflur í `model.js` eru mældar með grid-leit og krossprófun,
liðsstyrkur alltaf úr **fyrra** tímabili (ekkert leki). Breytir þú þeim án
mælingar fer bakprófið niður — og það er rétt hjá því.

### Hvar tölurnar búa (ekki afrita þær hingað — þær reka)

| fasti | skrá | hlutverk |
|---|---|---|
| `SCALE_FIX` `{def:{2.63,1.20}, att:{2.62,0.87}}` | `model.js` | færir líkanskjarnann af 1–5 kvarða yfir á töflukvarðann |
| `MEASURED` / `MEASURED_POS` | `model.js` | birt mörk á sig, CS%, vænt stig per þrep |
| `TIER_CUTS` | `model.js` | **sextílar raunverulegrar FFDR-dreifingar**, endurreiknaðir úr `data/` |
| `TIER_NEUTRAL = 2` | `model.js` | hlutlausa gráa miðþrepið |
| `MARKET_DIFF_A/B` = 1,05 / 1,65 | `market.js` | hvar taflan er lesin út frá markaðslínunni |
| `RANK_W` | `model.js` | röðunarskorið fyrir tillögur (stóð `stats.js` til 14.8.2026 — `RANK_W` og `rankScore` búa BÆÐI í `model.js`; `advisor.js` flytur þau þaðan) |
| `START_MODEL` | `stats.js` | byrjunar-líkurnar (5 breytur) |
| `ADVISOR_CAL` `{A:0.0258, B:0.4066}`, `ADVISOR_MAX_GAP = 3.5` | `advisor.js` | kaup-prósentan |
| `MIN_START_PROB = 0.15` | `rotation.js` | byrjunar-golf í róterings-pari |
| `BIG_CHANCE_XG = 0.18`, `IN_BOX_X = 17` | `bsd.js` | BSD-skotakort |

### Sumarglugginn — golfið var ÓVIRKT fyrir alla sem skiptu um lið (8.8.)

Notandinn sá þetta: **Meslier boðinn sem róterings-par hjá Arsenal** þótt hann
sé varamarkmaður með `starts5: 0, mins5: 0`. `MIN_START_PROB` átti að sía hann
burt og gerði það ekki.

**Orsökin var ekki í golfinu heldur í uppflettingunni.** `imminent.json` bar lið
**síðasta** tímabils (Meslier undir LEE) en appið flettir upp eftir liði hans
**í dag** (ARS), skorðað við lið. Uppflettingin misheppnaðist, `P` varð `null`
— og null-reglan (*`P=null` útilokar ALDREI*) hleypti honum í gegn.
**Golfið virtist virka; það var einfaldlega aldrei spurt.** Mælt: **38 leikmenn**
voru skráðir á rangt lið.

**Leyst nákvæmlega, ekki með nafna-pörun:** gw-skráin ber `element`
(tímabils-bundið id) og `players_raw.csv` sama tímabils parar það við `code`,
sem er fast yfir tímabil. Engin nafna-skorun, engin árekstrahætta. Leikmaður
sem er farinn úr deildinni helst óleystur og heldur gamla liðinu — það er rétt.
**Null-reglan sjálf stendur** (hún er rétt fyrir mann sem á engin gögn); það sem
var rangt var að búa til fals-null. Vörður: kafli 8 í `rotation.mjs`.

### Niðurstaðan í einni töflu

FFDR gegn **opinberu** FPL-FDR, 10 tímabil, 6.080 lið-leikir
(`ffdr-vs-fdr.mjs`):

| mælikvarði | FFDR | FDR |
|---|---|---|
| r við mörk á sig | **0,397** | 0,302 |
| AUC (hreint blað) yfir tilviljun | **17,2%** | 12,0% |
| CS% léttasti 1/6 á móti þyngsta | **44,9% / 7,8%** | 39,0% / 12,2% |

FFDR vinnur í **10/10 tímabilum**, og enn 1,79× þótt það sé þvingað í sömu
fjögur þrep sem FDR hefur — forskotið er **upplýsingar, ekki fínni þrep**.
Gegn raunverulegum leikmannastigum (28.355 byrjunarliðs-umferðir) slær FFDR
opinbert FDR í öllum fjórum stöðum; DEF er sterkast (r −0,275, léttasti
sjöttungur gefur **+145%** á móti þeim þyngsta).

### HEIMAVÖLLUR FYRIR GK/DEF (`homeCore`, 9.8.2026)

Einkennið sem notandinn sá: *„Liverpool úti og Man City heima ættu ekki að
vera grænir fyrir Arsenal."* Undirliggjandi villan var verri en litirnir —
með `home: 0` hafði varnarhópurinn **enga vallar-aðgreiningu** nema gegnum
FDR, og FPL gefur Arsenal-gegn-Liverpool sömu tölu á báðum völlum, svo
**LIV úti og LIV heima voru NÁKVÆMLEGA EINS (2,14)**.

**Reglan:** `homeCore` = 0,20 fyrir DEF, **0 fyrir GK**, dregið frá aðeins
þegar markaðslínan tók ekki við OG Elo var notað.

**Mælingin sjálf — töflurnar, LOSO, Covid-tímabilið og bæði skilyrðin — er
í athugasemdinni við `DIFF_W` í `model.js`.** Þrennt sem er vert að muna
hér því það er almennt:

1. **Lið-útkoma og stig leikmanns toppa á SITTHVORUM stað.** Fyrsta fittið
   var á mörkum liðsins og gaf 0,20 fyrir báða hópa; gegn raunstigum fellur
   GK einrænt yfir allt sviðið. **Stigin eru markmiðið** — sama lærdómur og
   elo-vogin gaf.
2. **Liður getur verið gildur aðeins þegar annað inntak er til.** Án Elo
   brotnar einrænni þrepanna (8/14 á móti 12/14); með Elo batnar hún
   (14/14). Liðurinn slokknar því sjálfur ef ClubElo dettur út.
3. **Breiðari dreifing kallar á endurreiknuð `TIER_CUTS`** — hlutlausa
   miðþrepið fór í 12,4% (gólf 12%) og var fært aftur í ~16,7%.

**Arsenal fær áfram mikið grænt og það er RÉTT:** `TIER_CUTS` eru
deildar-víðir sextílar og Arsenal á bestu vörn deildarinnar (0,71 á sig
á móti ~1,30). Afstæð þrep innan liðs voru **mæld og hafnað** (hentu ~30%
af merkinu). Birtu tölurnar eru meira að segja varfærnar: 29,9% CS fyrir
MCI heima á móti 43% úr hráu Poisson-viðmiði.

### Ákvarðanir sem hafa þegar verið véfengdar — ekki taka þær upp aftur

- **FFDR er ÚTKOMAN.** ClubElo, xGC og markaðslínan eru **inntök** og eru því
  ekki birt sem sjálfstæðir dálkar við hliðina.
- **Markaðsvog er 0,80 í ÖLLUM stöðum** — en sóknarhópurinn notar
  `marketAttackDiff` (eigin vænt mörk), ekki `marketDiff` (mörk á sig).
  Að gefa öllum stöðum vörnina var stærsta einstaka villan sem fannst.
- **Þrepin á spjöldum eru ALGILD, ekki afstæð innan liðsins.** Afstæð þrep
  hentu ~30% af merkinu og létu hvert lið nota alla litina.
- **Litirnir eru sex þrep með hlutlausu gráu miðþrepi** (`#ecedf1`). Prófin
  verja bæði að miðþrepið sé ómettað og að nágrannaþrep séu sjónrænt aðgreind
  (≥20 í RGB). `tierOf` skilar `TIER_CUTS.length` sem þyngsta þrepi — **aldrei
  harðkóðaðri tölu**, svo fjöldi þrepa megi breytast.
- **Litirnir eru afstæð kvörðun; tölurnar sjálfar haggast ekki.**
- **`rankScore` (`model.js`) er það sem RAÐAR tillögum**, ekki `FIT`. Það slær
  bæði aðferð appsins og FPL-eigið xP, og `rank-model.mjs` ber orakel-þak sem
  sýnir að hærri tala væri **leki, ekki afrek**.
- **Wildcard og Free Hit eyða EKKI söfnuðum frískiptum** (FPL-regla frá
  2024/25; þau haldast og +1 bætist við, þak 5).
- **Söluverð** = kaupverð + 50% af hagnaði, **niðurjafnað** á næstu 0,1. Tap =
  fullt núverandi verð. Reiknað í tíundum (`sellTenths`).
- **Vænt stig** (`expPointsFor`) = grunnur (`ep_next`, annars
  `points_per_game`) × mældur margfaldari fyrir FFDR leiksins × tiltækileiki.
  Tvöföld umferð leggst saman, auð umferð = 0.
- **Verðspáin („↑ í nótt?“) er NÁLGUN** — FPL birtir ekki formúluna. Hún má
  aldrei birtast sem vissa.
- **Markaðsþyngd er reiknuð úr `xga` þegar `diff` vantar.** Ekki fjarlægja þá
  varaleið: án hennar var markaðsliðurinn **dauður í appinu í heila viku** þótt
  öll prófin væru græn — þau prófuðu formúluna, ekki hvort gögnin sem hún fær
  séu nýtileg. Vörður: `model.test.mjs` kafli 5b.
- **Mínútuþróun** (`RANK_W.minsTrend = 0,01`) er **lögð ofan á** gömlu
  vogtölurnar, ekki endurfittuð — endurfitting vann á raunlauginni en TAPAÐI
  topp-5. Hún er 0 í forleik og kviknar við GW4.
- **mó** = `(xG + xA)·0,8 + threat/25·0,3 + óheppni·0,2`. Magnliðurinn er
  **xGI, ekki xG** — markmiðið inniheldur assist. **aó = bert `creativity/90`.**
- **Róterings-par raðast eftir VINNINGI, ekki þekju** (hrein þekja setur menn í
  slökum liðum á toppinn); auð umferð er ÞYNGST (3); verðþakið er
  **UI-afmörkun, EKKI hluti líkansins**.
- **Byrjunar-líkurnar eru KVÖRÐUN, ekki véfrétt.** Nákvæmnin (88,0%) er sú sama
  og hjá „byrjaði síðast"; ábatinn er Brier −24% og **bekkjar-gildran**: lægsti
  tíundarhlutinn fangar 42–49% þeirra sem falla á bekk (lyfting 2,09×,
  samhljóða öll þrjú tímabilin). **Ekki selja nákvæmnina sem ábatann.**
- **Kaup-prósentan í ráðgjöfinni þýðir EITT**: hlutfall sambærilegra
  samanburða í fortíðinni þar sem sá sem skorið setti ofar skoraði raunverulega
  meira (306.653 samanburðir innan sömu umferðar). Hún er **ekki** „líkur á að
  þetta séu góð kaup". Þakið ~81% kemur úr mælingunni — verkfæri sem segði
  „95% buy" væri að ljúga.

---

## 4. MÆLT OG HAFNAÐ — lokaðar spurningar

**Lestu þessa töflu áður en þú leggur til „augljósa bætingu".** Hvert atriði
hér var mælt á raungögnum og féll. Sum líta út eins og innsæi og eru tilviljun;
tvö reyndust **rétt mælt á röngu inntaki** og lagfærðust þannig, ekki með nýrri
töflu. Smáatriðin eru í `docs/MAELINGAR.md`.

| hugmynd | niðurstaða | MAELINGAR.md |
|---|---|---|
| Ferðalengd í FFDR | t=−0,42, r=−0,037 á 3.420 útileikjum — ógreinanlegt frá núlli. **Vörður `travel-measure.mjs` fellur ef þetta verður marktækt** | 3 |
| DefCon í FFDR eða í röðun | DC fylgir *þyngri* leikjum — dregur í gagnstæða átt við hreint blað. Lifir á spjöldum og í dálkum | 3, 6l |
| Form / „heitur leikmaður" | Innan leikmanns er þetta **afturhvarf**: −4,52pp eftir mark (t=−5,26). Hrein blöð liða raðast ekki í runur (lyfting 0,99) | 6c |
| Stöður gegn ákveðnum liðum | Leifin flyst ekki milli tímabila í neinni stöðu — 38-leikja úrtakshávaði. `pos-vs-opponent.mjs` | 3 |
| **xGChain / xGBuildup** | **Mælt 9.8.2026 á StatsBomb-opnu gögnunum (PL 2015/16, 380 leikir, 549 leikmenn, 10.450 leikmanna-leikir).** Bæta **ENGU** ofan á xG+xA: út fyrir úrtak (leikmanna-skipt) −0,0009 og −0,0014. Í öfugri röð, ofan á snertingar, −0,003. Ein og sér eru þær VERRI en xG+xA (r 0,370 og 0,344 á móti 0,469). Understat-arfurinn er ekki þess virði að elta | 4 |
| **Snertingar í vítateig** | **ENDURMÆLT 12.8.2026 OG STENST EKKI — flutt hingað úr „stenst"-flokknum.** Endurmælt á SÖMU gögnum og í sömu stærð sem fyrri mælingin nefnir (StatsBomb PL 2015/16, 380 leikir, **10.450 leikmanna-leikir** — talan stemmir orðrétt), með **bootstrap klösuðum per leikmann** (400 ítranir), sem er staðallinn í `mo-candidates.mjs`: **delta +0,0156, 95% CI [−0,0079, +0,0389] — INNIHELDUR NULL.** Fyrri talan var +0,036; hér mælist minna en helmingur og CI útilokar ekki núll. Sami mælikvarði felldi „sleppa óheppnis-liðnum" við CI [−0,023, +0,055]. **OG STAÐGENGILLINN ER ENGINN:** `shots_in_box` (sem BSD HEFUR) fylgir sanna sviðinu r 0,721 en bætir **engu** ofan á xG+xA — delta −0,0008, CI [−0,0194, +0,0091] — því hún fylgir xG (0,578) sem er ÞEGAR í líkaninu. **Há fylgni við sviðið segir ekkert um hvort sviðið bæti við það sem við höfum þegar.** Snertingar Í HEILD gefa aðeins r 0,266 við sanna sviðið, sem staðfestir mekanismann („hvar", ekki „hve mikið") en hjálpar ekki. Sex heimildir prófaðar 12.8.2026: FBref `cf-mitigated: challenge`, SofaScore 403, FotMob token-varðað, Understat ber engar snertingar, worldfootballR hefur sviðið en er ÓVIRK (síðast 2022-10-25), BSD engin snerti-hnit. **Við þurfum EKKI heimild — merkið er ekki staðfest.** Skrifta: `scripts/measure-box-touches.mjs` | 4 |
| **Post-shot xG (PSxG) — LÍKANIÐ VIRKAR, MÆLIKVARÐINN FLYST EKKI** | **Mælt 9.8.2026.** BSD birtir markhnit með HÆÐ (`gm.x/y/z`) fyrir **100% skota á mark** (3.224). Úr þeim var **fittað post-shot xG-líkan** (logistic: xG, frávik frá miðju, hæð, fjarlægð): út fyrir úrtak er það **kvarðað** (315,2 á móti 304 mörkum) þar sem hrátt xG vanmetur um **44%**, Brier 0,193 → **0,165**, AUC 0,763 → **0,793**. Líkanið sjálft er því gilt og er ÓKEYPIS útgáfa af tölu sem er seld. **EN afleiddi mælikvarðinn — „goals prevented" per lið — FLYST EKKI: r(fyrri helmingur → seinni) = −0,217** (SUN +6,7 → −3,8; TOT +1,4 → −11,0). Á einu tímabili er hann LÝSING á því sem gerðist, ekki spá. Ekki velja markvörð eftir honum | 4 |
| **Staðsetningarhæfni skota (placement)** | Sama líkan: PSxG − vænt PSxG per skot. **Flyst ekki innan tímabils: r = +0,050** (39 leikmenn með ≥20 skot á mark) — veikara en dómara-spjöldin sem var hafnað. Hrátt „PSxG − xG" er auk þess ONYTT: það er jákvætt hjá ÖLLUM af því að skot á mark eru valin úrtak (44% skekkjan), svo það mælir skotmagn, ekki hæfni | 4 |
| **Dómara-spjöld í spá (B7)** | **Mælt 9.8.2026 á 15 tímabilum E0.** Spjaldatíðni dómara **flyst ekki**: r(N→N+1) = **0,182** að meðaltali en **6 af 14 pörum eru NEIKVÆÐ** (−0,370 til +0,619), 95% CI [0,008, 0,356]. Sama undirskrift og stöður-gegn-liðum. Og stærðin er hverfandi: allt bilið frá spjaldaglaðasta til rólegasta dómara er 1,93 gul/leik, sem **deilist á 22 byrjunarliðsmenn** = 0,088 stig/leikmann/leik með FULLKOMINNI vitneskju, ~**0,016 nýtanleg**. Vænt stig eru 2–7. **Gagnaskorturinn var aldrei bindandi — merkið er það** | 4 |
| Varnarsinnaðir miðjumenn fá varnar-FFDR | 0,1σ; besta w hoppar milli tímabila og skiptir formerki | 3 |
| Stöðu-forgildi í stað `ep_next` fyrir nýliða | Skekkjan er raunveruleg en **hver leiðrétting gerir spána VERRI** á lauginni sem appið beitir henni á (MAE 0,848 → 0,873). **Vörður: `exp-points.mjs`** fellur ef blint forgildi er sett inn | 3e |
| `full90` + `start_rate5` í rankScore | −0,018 í báðum laugum | 3c |
| Margföldunar-liður `W.xg≈0,20` | 0,14σ, slær kjarnann í 5/8 tímabilum | 3 |
| `FIT` fittað gegn FFDR í stað hrás FDR | Hnífjafnt á 85.646 sýnum; leikja-liðurinn er ~0,1 stig af ~19 | 0b |
| Hvíld / leikjaálag (<4 dagar) | 27,0% á móti 27,3%. Flaggið var **tekið út** 29.7. | 6h |
| Evrópu-/bikarálag (P7.4) | Innan leikmanns −1,37pp, CI [−4,67; +1,92] — núll innan CI. **SÝNT SEM SAMHENGI FRÁ 9.8.2026** (★ í umferðastikunni og í FFDR-töflunni) en fer HVERGI inn í `fixDifficulty`, `expPointsFor` né `rankScore`. Merkið er grátt en ekki rautt af nákvæmlega þessari ástæðu: rautt væri fullyrðing sem mælingin styður ekki | 6k |
| Staða-dúmmíar í byrjunar-líkanið | +0,03× = suð | 6h |
| mó × byrjunar-líkur | Vinnur á stigum, **tapar** á mörk+assist; LOSO ekki einrátt yfir markmið | 6d |
| Sleppa óheppnis-liðnum úr mó | CI [−0,023, +0,055] — ógreinanlegt. Sami mælikvarði sem samþykkti xGI hafnaði þessu | 6d |
| mó per 90 | Verra (2,393). Magnið í glugganum er það sem gildir | 6d |
| xA inn í aó | xA-vogin valdist **alltaf 0** | 6d |
| aó sem hrá summa í stað `/90` | Ábatinn hverfur innan mínútu-þriðjunga — hann var bara „hygla þeim sem spila meira" | 6k |
| Fable mó-endurhönnun | Tapar á báðum markmiðum í 3/3 tímabilum, líka í sinni eigin laug | 6g |
| Fable fyrirfram-liðsvalstól | Tapar fyrir hráu GW1-eignarhaldi í 2/3 tímabilum | 6g |
| Aron-stuðull (jöfnuður) í `rankScore` | Ekkert eftir þegar stjórnað er fyrir stöðu OG verði. **Vörður: `consistency.mjs` kafli 5** | 6o |
| `aron/verð` sem röðun | Persistence hækkar en ÁKVÖRÐUNIN versnar (4,09 → 3,92 stig/leik). Hærri fylgni ≠ betri ákvörðun | 6o |
| Aron-þröskuldur 5 eða 6 í stað 4 | Hár þröskuldur telur **sprengingar, ekki jöfnuð**; við T=7 snýst merkið við | 6o |
| BSD `availability` í stað FPL-status | Skeikar í **ranga átt**: segir 23 meidda/bannaða/lánaða leikmenn „available". FPL-status er einrátt | 6t-b |
| BSD í bakprófin eða FFDR | Skotakort ná **aðeins yfir 2025/26** (0/8 í hverju eldra tímabili). Birtingar-heimild, ekki líkans-heimild | 6t |
| BSD í stað football-data (E0) | BSD geymir **enga sögulega odda** — þeir eru lifandi og hverfa eftir leik | 6t-b |
| Big chances úr ESPN-hnitum | ESPN gefur enga per-skot xG. **Vörður í `team-stats.mjs` kafli 6**: dálkur má heita „big chance" AÐEINS ef `src === "BSD"` | 6b, 8i |
| Heatmap úr BSD | `average_positions` er einn punktur per leikmann per leik, ekki þéttleikanet. Skot-þéttleiki ER raunverulegur — það er kortið sem er til | 6t-c |
| **SJÖUNDA ÞREPIÐ** („yellow" milli hlutlauss og dökkguls) | **ÞREPIN ERU BIRTING, EKKI LÍKAN** — `d` er samfelld og vænt stig, róterings-par og ráðgjöfin lesa hana ÖLL, aldrei litinn. Fleiri þrep geta því í mesta lagi **tapað minna**. Sex þrep halda þegar **94–98%** af samfellda merkinu. Vegið `\|r\|` gegn raunstigum: k=6 **0,21584** á móti k=7 **0,21669** (+0,00085), **95% CI [−0,00188, +0,00288] — inniheldur núll**, P(k=7 betra) **67,3%**. Til samanburðar var „sleppa óheppnis-liðnum" hafnað við **P=74%**, sem er STERKARI vísbending en þessi. Merki um hávaðagólfið: k=4 mælist **101,0%** hjá GK, sem er ómögulegt (ekki hægt að fá MEIRA merki með því að henda upplýsingum). Kostnaðurinn er raunverulegur: sjöundi aðgreinanlegur litur (grænt og ljósgult voru ÞEGAR ógreinanleg á skjá, sjá kafla 3) og `rotation.js` vegur þrep 3/4/5 sem 1/2/3 og þyrfti endurmælingu. **Ef þrepum verður fjölgað á að rökstyðja það sem LÆSILEIKA, ekki sem forspá.** | 9.8.2026 |
| `selected_by_percent` úr archive-skrá sem GW1-merki | **LEKI** — það er lokastaða, gegnsýrð af útkomunni (95,7% → 65,7% þegar lagað) | 6g |
| **Skipta-hreyfing fjöldans sem merki** | **Mælt 9.8.2026 á 4 tímabilum, 104.160 leikmanna-umferðum.** Ein og sér lítur hún STERK út (r = +0,394 innan stöðu × verðs) og heldur sér gegn hráu formi (+0,248). En ofan á `ep_next` er hún **NÚLL**: r = −0,0005, 95% CI [−0,019, +0,019]. Og meðal þeirra sem SPILUÐU er hún **neikvæð** (−0,111): fjöldinn eltir síðustu umferð og yfirskýtur. Appið notar `ep_next` þegar — það er búið að verðleggja fréttirnar | 9.8.2026 |
| **Helmingunartími 1,5 í vali hópsins** | **LEIÐRÉTT 10.8.2026 — mælt á röngu markmiði.** Fyrsta valið hámarkaði fylgni (r) yfir alla 44.000 stjórnendur og r toppar við h=1,75. En hópurinn er **topp 1.000**, ekki fylgni. Á fjórum óháðum tímaskiptingum: h=1,5 → 0,991%, h=2,0 → 0,951%, **h=3,0 → 0,929%** (−6,2%). Heldur við N=100…2.000 og með báðum umbreytingum; delta negatíft í 4/4 skiptingum. r ræðst af **miðjunni**, hópurinn er **taglið**. Aukavinningur: 46% stöðugleiki á móti 30% | 10.8.2026 |
| **Fleiri þættir í vali sérfræðinga-hópsins** | Krossfittað út fyrir úrtak (n=30.795): recency eitt = **0,540**; + jöfnuður 0,542; + leitni 0,539; + fjöldi tímabila 0,539; ALLT 0,542. Vinningurinn er ±0,002 = suð. „Verðlaunum jafna menn" og „verðlaunum batnandi menn" hljóma bæði rétt og mælast bæði sem ekkert | 9.8.2026 |
| **Klippa útlaga úr ferli stjórnanda** | Á FLÖTU meðaltali borgar það sig (0,214 → 0,224 að henda tveimur verstu). Með recency-vog **lækkar** það (0,410 → 0,401): gamalt slæmt tímabil er þegar vegið niður og nýtt slæmt tímabil er raunveruleg upplýsing. Flatt meðaltal er hvort eð er verst (0,317 á móti 0,540) | 9.8.2026 |
| **Lítill sérfræðinga-hópur (5–10 manns)** | **Verri í BÁÐA ENDA.** Mæld framtíðar-frammistaða þeirra sem valdir eru efstir: N=1 → 0,919%, N=3 → 1,088%, N=5 → 0,854%, N=10 → 0,987%, **N=100 → 0,642%**. Topp-3 standa sig VERR en meðaltal topp-100 (afturhvarf til meðaltals — toppur hvers lista er að hluta heppni). Og 60/40 skipting úr 10 mönnum hefur ±16 prósentustiga vikmörk. Hópurinn er **1.000** | 9.8.2026 |
| **Hygla þeim allra bestu innan hópsins** | Vog `10^(-alfa·skor)`: alfa=0 gefur SNR 13,279, alfa=0,25 gefur **13,363** (+0,6% = ekkert), alfa=1,0 gefur 12,032, alfa=2,0 gefur 5,735. Hvert skref eyðileggur virkt úrtak (1.000 → 146 við alfa=2) fyrir hverfandi faernibata. **Jöfn vog** | 9.8.2026 |
| **Þröskuldur (top-1%/top-10% tíðni) sem valregla** | Split-half áreiðanleiki HÆLDI top-10%/15% (0,74–0,75 á móti 0,738 fyrir samfellda kvarðann) — og það var **mettun, ekki gæði**: 9.296 stjórnendur eru JAFNIR á skurðpunktinum, svo reglan raðar þeim alls ekki. Úrslitaprófið er hópsgæði út fyrir úrtak, og þar vinnur samfelldi kvarðinn (0,890% á móti 0,956% og 1,737%). **Áreiðanleiki er ekki gagnsemi** | 9.8.2026 |
| **Velja hópinn eftir síðasta tímabili einu** | Freistandi því það þarf enga skönnun: 1,149% á móti **0,892%** fyrir recency yfir allan ferilinn (N=1000). Tvö síðustu tímabil gefa 0,958%. Full saga borgar skönnunina | 9.8.2026 |

> **HANDVIRKAR MÆLINGA-SKRIFTUR (ekki í `npm test`, ekki í pipeline):**
> `ffdr-vs-fdr.mjs` · `euro-congestion.mjs` · **`scripts/measure-box-touches.mjs`**
> — sú síðasta sækir StatsBomb-opnu gögnin (~380 skrár) í `scripts/.boxtouch-cache/`
> (gitignored, ~600 MB rannsóknargögn) og endurmælir box-snertingarnar. Hún er
> **eina leiðin til að endurtaka niðurstöðuna hér að ofan** og hún tekur ~20 mín
> í fyrstu keyrslu, sekúndur úr cache.

**Óframkvæmanlegt af ytri ástæðum:** QA-hlið gegn FFS-spám (borgunarveggur) ·
FBref um `soccerdata` (403 + Python-pakki í Node-pipeline án dependencies) ·
**frjáls skipti (free transfers) annarra stjórnenda** — FPL birtir þau hvergi,
hvorki í `picks`, `history` né `entry`; þau má aðeins **áætla** út úr
`event_transfers` og hits yfir tímabilið, og áætlun sem lítur út eins og mæling
er versta útkoman (kafli 3) · **söguleg stigatafla** — `leagues-classic/314`
skilar aðeins yfirstandandi tímabili, svo „topp 100 í fyrra" er ekki til;
skönnun á lið-id er eina leiðin og hún nær aldrei þeim sem hættu.

---

## 5. Prófakerfið — `npm test`

`tests/run-tests.mjs` keyrir öll söfnin í `SUITES`. **Fjöldinn er REIKNAÐUR úr
`SUITES`** — hann var harðkóðaður strengur sem staðnaði um leið og safni var
bætt við. Söfn merkt `true` þurfa jsx-loaderinn.

> **OG HANN STENDUR EKKI HELDUR HÉR.** Þetta skjal sagði **41** meðan
> `SUITES` bar **48** — sama villan og setningin hér að ofan varar við, í
> skjalinu sem varar við henni. Talan er í `npm test`-línunni og hvergi
> annars staðar.

Taflan er ekki tæmandi; hún nefnir þau sem **bera ákvarðanir**.

| Safn | Hvað það ver |
|---|---|
| `model.test.mjs` | Hver birt tala: söluverð, frískipti, vænt stig, mælda taflan, verðspá. **Endurkvarðar litamörkin úr `data/`.** Kafli 5b: hver röð í `odds.json` verður að vera NÝTILEG |
| `ffdr-walkforward.mjs` | 8 tímabil, 6.080 lið-leikir, FULL inntök (markaðslína endurbyggð úr B365, Elo fram í tímann). Er FFDR betri en **sitt besta inntak**, og er taflan rétt **kvörðuð** — ekki bara rétt röðuð |
| `ffdr-player-points.mjs` | Rétta markmiðið: raunveruleg leikmannastig. Kafli E ver algilda þrepið |
| `ffdr-backtest.mjs` | „Halda LITIRNIR?" á einu tímabili. Tölfræðileg vikmörk, ekki hörð mörk |
| `rank-model.mjs` | `rankScore`, LOSO á 5 tímabilum, með **orakel-þakinu** |
| `advisor.mjs` | Kaup-prósentan. 500 slembin inntök verja að hlutdeild sé alltaf á (0,1) og summan nákvæmlega 1. Kafli 5 sannar að ómældu tölurnar hreyfa hana EKKI |
| `stats.test.mjs` | Dálkaskráin öll: hvert `get()` þolir tóm inntök, allir lyklar einkvæmir (124 í dag — talan er REIKNUÐ í prófinu, ekki hörð), hver dálkur ber `note`, haus-heiti passa í hausinn, **hvert band er samfellt**. Kafli 14 ver auðgunina |
| `rotation.mjs` | Kafli 3 er PRÓFSTEINNINN: spegilmynd verður að vinna þann sem er BETRI Í HEILD, annars er þetta röðun í dulargervi |
| `mo-candidates.mjs` | mó á 4 tímabilum með **bootstrap klösuðum per leikmann** — CI verður að útiloka núll |
| `workflow-push.mjs` | Push-kapphlaupið. Dregur shell-blokkina ÚT ÚR `.github/workflows/*.yml` og keyrir á ALVÖRU git-hirslum. Ber líka saman kóða OG workflow (`env`-blokk sem vantaði) |
| `gw1-checklist.mjs` | Sefur í forleik, **vaknar við fyrstu loknu umferð**. Dagurinn sem það fyrst fellur er dagurinn sem það borgar sig |
| `name-match.mjs` | Nafna-pörunin borin við **sjálfstæða viðmiðs-útfærslu** á 9.464 raunpörum + tilbúnum jaðartilfellum. Tíma-þak 25 ms |
| `no-icelandic.mjs` | Enginn íslenskur stafur í DOM nema hann komi úr `data/`; engin ófyllt stika; **ASCII-íslenska** (sjá kafla 9) |
| `compare-visual.mjs` | Les súlurnar úr DOM og fellur ef græna súlan er á röngum manni (`hi`) |
| `team-stats.mjs` | Lægra-er-betra listarnir taldir upp **berum orðum**; nýliðar með null; nafn-vörðurinn á „big chance" |
| `shotmap.mjs` | Þrjú óháð akkeri: xG fellur einrænt með fjarlægð, vítaspyrnur á réttum punkti, teigurinn. Fellir ESPN-kvarðavilluna |
| `bsd.mjs` / `bsd-pipeline.mjs` | Ekkert dautt svið má rata í skrána; hvert birt svið verður að hafa **raunverulega dreifingu** |
| `defcon-shrink.mjs` / `dc-hit-display.mjs` | Afturvirknin á DC-hittni, og að **afturvirkjaða talan sé aðaltalan** á skjánum |
| `smoke.test.mjs` | Appið í jsdom með raunverulegum `data/` og hermdu `fetch` |
| `data-resilience.mjs` | Opnar hvern flipa og krefst marktæks innihalds — **eina sem sér hvítan skjá**. 16 atburðarásir: vantandi OG **skemmdar** skrár (hálfskrifað JSON, tómt svið, röng gerð), BSD-skrárnar báðar, og kjarna-tilfellið þar sem krafan er ekki flipar heldur **skýrð villa** |
| `player-cards.mjs` | Opnar **öll 573 leikmannaspjöldin**, líka án BSD, og lokar liðsspjaldinu úr hverju. Spjaldið sameinar sex óbundnar heimildir; önnur próf opnuðu 1 eða 15. Stökkbreyting sem felldi EINN mann (nákvæmlega eitt skot) hrundi listanum úr 573 í 57 |
| `ffdr-table.mjs` | „Teams — FFDR" lesin AF SKJÁNUM: **liturinn verður að segja það sama og talan** (`tierOf`), `n` borið við `fixtures.json` fyrir öll 20 liðin, og bilið virt. Endurreiknar EKKI FFDR — það væru tvær útfærslur |
| `playerlist-sort.mjs` | 121 dálka-áttir lesnar úr DOM. **Tómt gildi má aldrei sitja á toppnum** ef dálkurinn hefur tölur, og skrun í botninn sannar að þau fóru NIÐUR en hurfu ekki. Áttin er lesin af örinni, ekki gefin sér |
| `playerlist-narrow.mjs` | **Símahamurinn — sem ekkert próf hafði séð.** Stillir `innerWidth` OG `matchMedia` á 390 px svo báðar greinar keyri; mælir dálkabreiddir og að andlitsmyndin hverfi en liðsmerkið ekki |
| `error-boundary.mjs` | Prófar ÚTGÖNGUNA, ekki bara að kassinn birtist |
| `monkey.mjs` | 800 handahófskenndir smellir (4 föst fræ). **NET, EKKI VÖRÐUR — og það er mælt:** bilun á algengri braut (Teams-flipinn) fannst í báðum fræjum, en bilun á djúpu marki (röðun eftir Verði) **slapp í gegn í 800 smellum**. Segðu því aldrei „apinn ver X"; hver uppgötvun á að festast í alvöru verði |
| `untrusted-input.mjs` | Tvær uppsprettur sem appið ræður engu um: 15 skemmd `fpl_planner_v3`-blob og 12 proxy-svör. **Vistað ástand er alvarlegra en vantandi gagnaskrá** — `data/` lagast við næstu sókn, en blobbið er í vafranum og fer hvergi, svo óheilt blob felldi appið við HVERJA hleðslu, að eilífu. Proxy-hlutinn: net-bilanir voru allar í lagi, **talna-gerðin var gatið** (`bank:"mikid"` → `NaN` á skjá) |
| `leagues.mjs` | 500 slembin inntök: summa verðlauna má **aldrei** fara yfir pottinn og ekkert verðlaun vera neikvætt |
| `pros.mjs` | Sérfræðinga-hópurinn. Valreglan (einræn, nýleiki vegur þyngra), talningin, EO **yfir 100%**, og söfnunin sjálf á **hermdum** svörum — `picks` svara 404 í forleik svo hún getur ekki verið prófuð lifandi fyrr en 21. ágúst. Kafli 12 ver að **ekkert sé sótt fyrr en fresturinn er liðinn**; kafli 13 ver kvótann (hver umferð sótt nákvæmlega einu sinni — annars 96.000 köll á dag); kafli 17 ver að fallið sé kallað úr `fetchFast` **og** að workflow-ið keyri `--fast` |
| `pros-render.mjs` | **Fyllti helmingurinn af flipanum.** `data-resilience` opnar hann í öllum 16 bilunum en `pros_gw.json` er ekki til í forleik, svo það próf hittir alltaf á TÓMA ástandið. Hér eru tölurnar lesnar AF SKJÁNUM: hlutfall miðast við þá sem svöruðu (65,3%, ekki 62,0%), EO fer yfir 100%, vikmörkin sjást, umferðar-valarinn breytir raunverulega töflunni, og chip-athugasemdin hverfur í umferð án chips. Sex stökkbreytingar felldar |
| `prediction-ledger.mjs` | **Spá-bókhaldið.** `scripts/snapshot-predictions.mjs` skrifar niður hvað við SPÁÐUM fyrir umferð (FFDR per leik, `rankScore` per leikmann með INNTÖKUNUM, byrjunar-líkur, `ep_next` sem viðmið) svo kvörðunin geti síðar spurt hvort mælingarnar HALDI. Hliðin eru prófuð á TILBÚNUM gögnum: 1 ms eftir frest -> ekkert · nákvæmlega á frestinum -> ekkert · röð sem er til -> ekkert (ÓNEMANDI) · þunn inntök -> ekkert. **Prófsteinninn er BYGGINGARLEGUR:** App.jsx VERÐUR að flytja `buildTeamMetrics` inn úr `teamstats.js` og má EKKI skilgreina hann sjálft — og hvert FFDR-gildi er endurreiknað og borið Á BITANUM. Tvær fyrri útgáfur þessa prófsteins voru rangar og prófið sagði það: DOM-samanburður fann 0 tölur (töflan sýnir GW-BIL, ekki eina umferð) |
| `calibration.mjs` | **Heldur mælingin enn?** Ber bókhaldið við það sem gerðist: FFDR -> hrein blöð (PRÓFIÐ ER EINRÆNI, ekki stök prósenta), topp-15 -> raunstig gegn FPL-eigin `ep_next`, byrjunar-líkur -> Brier + bekkjar-gildran. **Fáar mælingar -> ENGIN tala** (`null` + `why`); tala úr einni umferð sem les eins út og tala úr átta tímabilum er versta útkoman. Vélin er sannreynd á TILBÚNUM gögnum þar sem svarið er þekkt fyrirfram (þrep 0 -> 0,75 nákvæmlega, Brier -> 0 nákvæmlega, snúið merki -> einræni brotin). **Kaflinn á raungögnum SEFUR** í forleik og fullyrðir samt að vélin hafi verið sannreynd, svo „sefur" getur ekki orðið „mælir ekkert" þegjandi |

**`tests/lib/e0.mjs`** byggir spá-heiminn fyrir ÖLL bakprófin — ein uppbygging
á einum stað, annars getur eitt bakpróf mælt annan heim en hitt og bæði virst
græn á meðan þau eru ósamanburðarhæf. Notar **opinbera FDR-ið** (`fdrFor()`)
þegar það er til.

**ÞRJÁR SKRIFTUR ERU EKKI Í `SUITES` — OG ÞAÐ ER EKKI ALLT VILJANDI.**
`ffdr-vs-fdr.mjs` og `euro-congestion.mjs` eru **mælinga-skýrslur, ekki verðir**:
þær hafa engar `ok()`-fullyrðingar og skila alltaf 0, svo þær myndu ekki fella
neitt þótt þær væru keyrðar. `ffdr-vs-fdr` prentar samanburðinn við opinbert FDR
(FFDR vinnur á báðum mælikvörðum í **14/14 tímabilum**) og er keyrð handvirkt.
**`pos-vs-opponent.mjs` VAR hins vegar raunverulegur vörður sem ENGINN keyrði** —
hann ber `ok()` og `process.exit(fail ? 1 : 0)`, tekur 0 s, og var samt utan
`SUITES`. Hann var settur inn 9.8.2026. Vörður sem keyrir ekki er ekki vörður.

**`tests/euro-congestion.mjs` er EKKI í `npm test`** — hún sækir ~65 skrár og
GitHub-kvótinn (60/klst.) gaf HTTP 403, svo safnið féll af ástæðu sem hafði
ekkert með mælinguna að gera. Keyrsluskipun er í hausnum á skránni. Öll önnur
söfn lesa committuð `data/`.

**Mynstur sem á að endurtaka:** kóði sem kviknar fyrst 21. ágúst er dreginn ÚT
ÚR `fetch.mjs` og keyrður á **tilbúnum** gögnum (`mins-trend.mjs` kafli 0,
`defcon-shrink.mjs`, `bsd-pipeline.mjs`). Ómældur kóði sem fer í gang einn
morgun er ekki ásættanlegt.

**Gildrur í jsdom-prófunum** (kostuðu tíma, ekki endurtaka):
- Sértækir `fetch`-mock-ar verða að koma **Á UNDAN** almenna `raw`-handlernum.
- Innsláttur í stýrða React-reiti er ótraustur → forfylltu `localStorage`
  í staðinn. Leit í leikmannalistanum er líka ótraust; notaðu **röðunina** til
  að fleyta réttri röð inn í sýndargluggann (`playerlist-live-cols.mjs`).
- Tvö eins `✕`-tákn í DOM. Notaðu `.at(-1)`, annars eyðir prófið sínum eigin
  gögnum.
- **Próf eiga að prófa hegðun, ekki orðalag.** Tvö próf féllu við endurnefningu
  á flipa því þau smelltu eftir nákvæmu heiti; notaðu ikon-forskeytið.

### 5b. ÞÖGUL PRÓF — ÞRJÁR TÓMAR FULLYRÐINGAR (fundið 8.8.2026)

Punkturinn hér að ofan („hegðun, ekki orðalag") reyndist **vanmetinn**: þar
féllu prófin og því sáust þau. Verra tilfellið er þegar prófið **finnur ekki
neitt og heldur bara áfram** — þá verður það grænt og hættir að mæla.

**`react-warnings.mjs` heimsótti 0 af 22 viðmótum og var grænt.** Leitarorðin
voru íslensk (`"Umferðin"`, `"Leikmenn"`, `"Grunnur"`) og viðmótið varð enskt
í commit *„enska eingongu"*. `click()` skilaði `false` í hvert einasta sinn,
lykkjan hélt áfram, og `visited` var **aðeins prentað** — svo `0/22` las eins
og upplýsing en ekki bilun. Safnið sem á að verja ALLT viðmótið varði
**ekkert** — og í skjólinu lifðu tvær raunverulegar React-viðvaranir
(`border`/`borderColor`-blöndun á umferðar-kössunum, sem React segir sjálft að
geti gefið rangan ramma). Þær fundust fyrst þegar nýtt próf (`ffdr-table.mjs`)
opnaði FFDR-kassaröðina.

Tvær aðrar tómar fullyrðingar í sömu ætt:

| staður | fullyrðingin | hvers vegna hún var alltaf sönn |
|---|---|---|
| `smoke.test.mjs` | `!text().includes("róterings-par")` | strengurinn er **hvergi í viðmótinu** (aðeins í kóða-athugasemd), svo hún stóðst hvort sem glugginn lokaðist eða ekki |
| `react-warnings.mjs` | `b.title === "Upplýsingar"` | heitir `"Information"`; blokkin var í `if (info.length)` og slapp þegjandi |

**ÞRJÁR REGLUR SEM LEIÐA AF ÞESSU:**

1. **ÞEKJA ER FULLYRÐING, EKKI LOGGA.** Ef próf telur hvað það heimsótti verður
   talan að **fella** prófið þegar hún hrynur. `react-warnings.mjs` fellur nú
   undir 90% (`MIN_VISITED`), og `player-cards.mjs` fellur ef færri en 500
   spjöld finnast.
2. **NEIKVÆÐ FULLYRÐING VERÐUR AÐ NEFNA STRENG SEM VAR SANNANLEGA ÞARNA.**
   `!includes(X)` er einskis virði nema prófið hafi sýnt `includes(X)` áður.
   Lokunarprófið leitar nú að `"Price cap"`, sem er staðfest tveimur línum ofar.
3. **STÖKKBREYTTU ÞVÍ SEM ÞÚ LAGAR.** Öll þrjú voru sannreynd með því að
   afturkalla lagfæringuna: viðvörunar-safnið sá EKKI `borderColor` fyrr en
   kveikt/slökkt-kaflanum var bætt við — að **heimsækja** viðmót nægir ekki,
   því React kvartar aðeins við endurteikningu þegar eiginleiki er FJARLÆGÐUR.

**MÆLITÆKIÐ GETUR SJÁLFT VERIÐ VILLAN.** Apaprófið féll í þremur fræjum af
fjórum með „NaN á skjá" — og appið var í fullkomnu lagi. `textContent` límir
saman texta án bila, svo FFDR-taflan skilar `"MUN" + "a" + "NEW"` sem
**`MUNaNEW`**, sem ber undirstrenginn `NaN`. Sama gildra var í **fimm öðrum
söfnum**. Leitin er nú `\bNaN\b` / `\bundefined\b`. Áður en þú trúir falli:
*athugaðu hvort prófið sé að mæla það sem það heldur.*

**FJÓRÐA TILFELLIÐ, OG ÞAÐ VAR Í MÍNU EIGIN NÝJA PRÓFI** (`playerlist-sort.mjs`):
fullyrðingin „ekkert tómt gildi ofan við tölu" **getur ekki brugðist** þegar tómu
gildin fylla allan sýndargluggann — þá sést engin tala, `lastNum` verður −1 og
skilyrðið slokknar. Stökkbreyting (`return dir` í stað `return 1`, sem fleytir
null upp) **slapp í gegn** meðan tóm gildi á toppnum fóru úr 4 í 113.
Rétta invariantið er **ósamhverft**: hafi dálkurinn tölur á annað borð má
TOPPURINN aldrei vera tómur, í hvorugri átt. Lærdómurinn er almennur —
*fullyrðing sem þarf tvennt til að bregðast (null OG tölu í sama glugga) er
veikari en hún lítur út fyrir að vera.*

---

## 6. Gagnaheimildir

**FPL-status ræður tiltækileika. Punktur.** Allar aðrar heimildir mega auðga
hann, aldrei skipta honum út.

| Heimild | Staða | Hlutverk |
|---|---|---|
| **FPL** `bootstrap-static` / `live` | virk | Kjarninn: leikmenn, verð, status, fréttir, xP |
| **football-data.co.uk (E0)** | 200 fyrir lokin tímabil | **B365-oddar fyrir bakprófin.** **LEIÐRÉTT 16.8.2026: 2026/27 gefur EKKI 404.** Mælt með `curl -w "%{http_code} %{redirect_url}"`: `2627/E0.csv` skilar **301 → `2627/EC.csv`**, sem `fetch` fylgir í 200 með 13 röðum af **utandeildar**-leikjum (`Div: "EC"` — Altrincham, Southend, Boreham Wood …). Skráin verður til við fyrsta leik en **vantandi skrá lítur út eins og gild skrá á meðan**. `fetchFdcouk` sannreynir því `Div === "E0"` (14.8.2026) og meðhöndlar óhreint svar eins og 404 — sjá `tests/fdcouk-e0.mjs`. Vörður gegn nákvæmlega þessu: 12 EC-raðir stóðu í `data/` undir grænu ljósi |
| **ClubElo** | virk | Elo-inntak í FFDR |
| **Odds API** (um Netlify-proxy) | virk, kvótaður | Markaðslínan; `h2h,totals,spreads`. Sótt tvisvar per umferð |
| **ESPN** site-API | 200 | **Eina lifandi skot-heimildin**: hnit, útkoma, stöng, svæði, upplegg úr texta. Gefur **enga xG** |
| **BSD** (`sports.bzzoiro.com`) | 200, ókeypis, enginn kvóti | Per-skot xG, skotakort, treverk, föst leikatriði. **Aðeins 2025/26** |
| **API-Sports** | virk, 100 köll/dag | `/fixtures/lineups` (staðfest byrjunarlið). **Fyrsta raunprófun 20.–21. ágúst** |
| **vaastav-speglun** | 200 | Söguleg per-umferðar CSV, 2019-20 til 2025-26 |
| **FPL `entry/{id}`** (history · picks · transfers) | virk, opin | Sérfræðinga-hópurinn. `history` byggir hópinn (handvirkt, `scan-elite.mjs`); `picks` + `transfers` lesa hvað hann gerði, **eftir frest** — fyrir frest er 404 hjá öllum og það er regla leiksins, ekki API-galli. **Engin söguleg stigatafla er til**: `leagues-classic/314` skilar aðeins yfirstandandi tímabili, svo skönnun á lið-id er eina leiðin |
| Understat | **LIFANDI — en læst fyrir HTTP-biðlara** | **LEIÐRÉTT 9.8.2026.** Fyrri greining sagði „gögnin eru farin". Það var RANGT um deildarsíður: byte-eins 18.645 b skelin var **Cloudflare-vörn**, ekki gagnaleysi. Í alvöru vafra skilar `league/EPL/2024` **175 KB með lifandi xG** og `JSON.parse` er á sínum stað. curl fær skelina (18.645 b), curl með vafra-hausum fær ANNAÐ skeljar-svar (4.675 b) — hvorugt með gögnum, bæði merkt Cloudflare. Þyrfti JS-keyrslu (headless) eða clearance-vafrakökur; pipeline er Node **án dependencies** og það er arkitektúr-breyting. **Leikja-síðurnar eru samt raunverulega tómar**: `shotsData`/`rostersData` vantar EINNIG í vafra, aðeins `match_info` eftir (staðfest á match/26630, engin XHR sækir þau). **OG ÞAÐ SKIPTIR HVORT EÐ ER EKKI MÁLI:** eina talan sem Understat átti ein — xGChain/xGBuildup — mældist gagnslaus (kafli 4). Að endurvekja hana myndi ekki bæta spána |
| FBref · SofaScore | **403** | Ónothæfar óháð því hve gott fæðið er |
| FotMob | **SKIPT: shotmap gated · `matchDetails` OPIÐ** | **LEIÐRÉTT 16.8.2026 — hér stóð „404/gated · Engin shotmap með gildu id" og hvort tveggja var orðið hálf-rangt.** Mælt beint í dag, með **venjulegum UA-haus og ENGUM token**: `/api/matchDetails` → **404**, en slóðin færðist og `/api/data/matchDetails?matchId=…` → **200, 259 KB af raunverulegu JSON**; `/api/data/matches?date=…` → 200, 289 KB. Svarið ber `Tackles`, `Clearances`, `Interceptions`, `Blocks`, `Recoveries`, `Minutes played` — **og `shotmap`**, sem fellir gömlu röksemdina orðrétt. **EN STAÐAN ER SKIPT OG MÁ EKKI EINFALDA:** skot-heimildin sjálf er enn token-varin þar sem `measure-box-touches.mjs:16` og `fetch-team-shots.mjs:21` sækja hana, svo „FotMob virkar" væri ný röng fullyrðing í stað gamallar. **Að taka hana í notkun er SÉR ÁKVÖRÐUN** sem þarf að standast BSD-regluna (birtingar-heimild, ekki burðarvirki) og DefCon-í-röðun höfnunina í kafla 4. `measure-friendly-form.mjs` ber ESPN-krossprófunina skrifaða en hún hefur **aldrei haft gögn** — staðan er `UNVERIFIED` þar til alvöru PL-leikir hefjast 21.8. |

**Ekki endurmæla þetta.** Fjórar heimildir voru prófaðar á mörgum hostum og
mörgum tímabilum og féllu; sjá 6b og 6e.

### ESPN og BSD nota SITTHVORN KVARÐANN — ekki flytja reglu milli þeirra

| | kvarði á x | teigur |
|---|---|---|
| **ESPN** | hlutfall af **HÁLFUM** velli (52,5 m), fjarlægð frá sótta markinu | 0,314 |
| **BSD** | hlutfall af **FULLUM** velli (105 m) | **17** (`IN_BOX_X`, fittað) |

ESPN-kvarðinn kostaði villu sem **ekkert próf sá**: fyrsta útgáfan margfaldaði
með 105 og setti hvert skot í tvöfalda fjarlægð. Notandinn sá það á vellinum.
Þess vegna les skotakortið (`ShotMap.jsx`) **sömu kvörðunartölur og punktarnir
eru teiknaðir úr** — þá getur völlurinn og gagnasettið ekki farið í sundur.

### BSD — reglurnar sem gilda um hana

- **Birtingar-heimild, ekki burðarvirki.** Ekkert í FFDR, `rankScore` eða væntum
  stigum les BSD. Detti hún út verða dálkarnir tómir og ekkert annað brotnar.
- **Uppruni gagnanna er ÓSVARAÐUR** og sniðið er SofaScore-lagað. Þess vegna
  fallbackið hér að ofan. Spyrja á Discord þeirra.
- **~20 svið eru 100% non-null og ALLTAF NULL** (`big_chance_created`, xGOT,
  `goals_prevented`, öll `*_value_normalized` …). Vörður í `bsd.mjs`: ekkert
  dautt svið má rata í skrána og hvert birt svið verður að hafa raunverulega
  dreifingu.
- **`has_xg` í lista-endapunktinum LÝGUR** (`false` fyrir öll tímabil). Sæktu
  `/stats/`.
- **BSD-assist eru 29% færri en FPL-assist** — Opta-skilgreining á móti
  FPL-skilgreiningu. Það er **ekki villa** og þær eiga aldrei að skipta út
  FPL-tölunni.
- **Liða-vörpunin er HANDSTAÐFEST tafla** (`BSD_TEAM`), ekki fuzzy: fuzzy felldi
  Man United inn í Man City. **Þögul röng pörun er verri en engin.**
- **Leikmanna-pörun notar nafn OG mínútur** (nafnið eitt víxlaði Jacob og Alex
  Murphy). Staðfest gegn FPL: mörk r 0,9998, mínútur 0,9998, xG r 0,995.
- **Þrjár reglur sem gera keyrsluna endurgeranlega** (skráin var það ekki —
  þrjár keyrslur gáfu 389/390/391 pörun): mistekin köll eru **talin og keyrslan
  deyr fremur en að skrifa hluta-tímabil** · lið leikmanns er **flest-leikið
  lið**, ekki „síðasti vinnur" · summur eru lagðar saman í **fastri event-id
  röð** (fleytitölu-samlagning er ekki víxlin).
- **Tóm keyrsla má ALDREI þurrka út góð gögn.** 2026/27 er í BSD með 200 leiki,
  alla `notstarted`; skriftan deyr með `exit 2` fremur en að skrifa tómt
  tímabil ofan á heilt. Skráin er lykluð á tímabil og keyrsla **sameinar**.

### Skotakortin — `bsd_shots.json` + `ShotMap.jsx`

Leikmannaspjaldið fær sitt kort; **smellur á liðsnafn í Teams** opnar tvö,
**skot á sig fyrst** — það er markvarðar-spurningin, og flipinn heldur því
sjálfur fram að 12 langskot og 9 teigsskot séu sami dálkur en gerólíkt mál.

- **EIN röð per skot, ekki þrjár.** Fyrsta útgáfan geymdi hvert skot undir
  leikmanni, „fyrir" og „á sig" — **543 KB**. Nú ein flöt röð með
  `team`/`opp`/`code` og sýnirnar eru **síaðar** úr henni (vísar byggðir einu
  sinni í `useMemo`): **338 KB**. Sömu gögn þrívegis er ekki bara stærð heldur
  hætta — þau gætu rekið í sundur.
- **Letihlaðið** þegar spjald opnast eða Teams er valinn, aldrei við ræsingu.
- **Kvörðunin fylgir skránni** (`calib`) og er MÆLD úr sömu skotum: vítapunktur
  x 11,5 (92 víti, **y = 50,00 hjá öllum**), teigur x 17 (MAE 0,133), breidd
  y 20,4–79,6 (99,5% teigsskota).
- **Staðfesting:** Arsenal mælist með **27 mörk á sig og 71 skoruð** í
  kortunum — nákvæmlega `ga=27, gf=71` í stöðutöflu BSD. Tvær óskyldar leiðir
  að sömu tölu.
- **17 lið af 20 eiga kort.** Coventry, Hull og Ipswich komu upp og spiluðu
  ekki 2025/26 — þau eiga EKKERT, og það er rétt.
- **Leikmaður án skota fær ekkert kort.** Tómur völlur les eins og „skaut
  aldrei" en þýðir „engin gögn" (197 útivallarmenn).
- **Radíus er √xG** svo FLATARMÁL sé í hlutfalli við xG; annars líta 0,50 og
  0,25 út eins og fjórfaldur munur.
- Vörður: `tests/shotmap.mjs` prófar **ekki „birtist kortið"** heldur hvort
  punktarnir séu á réttum stað, gegn þremur óháðum akkerum (xG fellur einrænt
  með fjarlægð · víti á x 11,5 / y 50 · teigsbreidd). Fimm stökkbreytingar
  felldar, þar á meðal **ESPN-kvarðavillan sjálf**.

---

## 7. Pipeline og gagnaskrár

`scripts/fetch.mjs` skrifar allt í `data/` (sjá `data/SCHEMA.md`). Hver heimild
skráir sig í `status.json` með `record(...)` og birtist undir **Data sources**
í hliðarstiku. **Bætir þú við heimild: skráðu hana þar**, annars er hún
ósýnileg þegar hún brotnar.

**Vantar API-lykil → `FLAGS` sleppir þeirri heimild þegjandi** (ekki hrun), svo
þú getur keyrt hitt án þeirra.

### Push-kapphlaupið — lagað 29.7.2026, hafði þegar kostað dag

`fetch-data` féll því `fetch-fast` pushaði **tólf sekúndum á undan**; sóknin var
fullkomlega í lagi en gögn dagsins fóru í ruslið og ekkert sagði HVAÐ tapaðist.
Lausn: **endurtilraunalykkja (5 tilraunir) í BÁÐUM** workflow-um. Við árekstur í
`data/` vinnur okkar ferska sókn (`rebase -X theirs`) — það er rétt hér því
`data/` er endurmyndað Í HEILD í hverri keyrslu. Actions-útgáfur eru **v5** í
öllum þrem workflow-um. Vörður: `workflow-push.mjs`.

### `data/predictions/` — SPÁ-BÓKHALDIÐ, OG ÞAÐ MÁ EKKI EYÐA

`scripts/snapshot-predictions.mjs` (kallað úr **`fetch-fast`**, ekki daglegu
keyrslunni — hún gengur kl. 05 UTC en frestur er ~17:30) skrifar
`data/predictions/gw{N}.json` með því sem við SPÁÐUM: FFDR per leik, `rankScore`
per leikmann með inntökunum, byrjunar-líkur og `ep_next` sem viðmið.

**Appið les þetta ALDREI.** Það er mælitæki, ekki birtingargagn — þess vegna er
`continue-on-error: true` á skrefinu: bókhaldið má aldrei fella gagna-keyrsluna.

**AF HVERJU ÞAÐ VERÐUR AÐ VERA SKRIFAÐ FYRIRFRAM:** FFDR, `rankScore` og
byrjunar-líkurnar eru reiknaðar úr gögnum sem BREYTAST í hverri viku (verð,
form, elo, markaðslína). „Hvað hefðum við sagt fyrir GW5" er ÓSVARANLEGT þegar
GW5 er liðin — inntökin eru horfin. **Sama röksemd og `history/`: dagleg mynd
verður ekki búin til eftir á.**

Fjórar reglur: **aðeins í 12 KLST GLUGGA fyrir frest** · **aðeins einu sinni**
(röð sem er til er ALDREI endurskrifuð — endurskrifuð spá er retro-fitting) ·
**þunn inntök -> engin skrá**. Verðir: `prediction-ledger.mjs`, `calibration.mjs`.

> **GLUGGINN VANTAÐI Í FYRSTU ÚTGÁFU OG ÞAÐ VAR RAUNVERULEG VILLA.** „Aðeins
> fyrir frest" og „aðeins einu sinni" eru báðar réttar — en SAMAN gáfu þær
> „skrifa við FYRSTA tækifæri og frysta". Hraða keyrslan gengur á 30 mín
> fresti, svo GW1-röðin var raunverulega skrifuð **222 KLST fyrir frestinn**
> með `start_prob` null hjá **577 af 577** og engum mínútu-þróun. Kvörðunin
> hefði því mælt líkanið á ÞESS EIGIN VERSTU ágiskun og látið það líta verr út
> en það er. 12 klst gefa 30-mínútna cron-inum ~24 tækifæri á meðan gögnin eru
> nær-endanleg; **staðfest byrjunarlið eru hvort sem er EKKI til fyrir frest**
> (FPL-fresturinn er ~1,5 klst fyrir fyrsta leik), svo lengri bið kaupir enga
> upplýsingu.

> **`buildTeamMetrics` VAR FLUTT ÚR `App.jsx` Í `src/teamstats.js` VEGNA
> ÞESSA.** Fyrsta útgáfa bókhaldsins ENDURREIKNAÐI liðsvísana og skrifaði
> `+(x.gf / x.matches)`; `team_form.json` ber ENGIN `gf`/`ga`, hún ber
> `goals_pg`/`conceded_pg` ÞEGAR per leik. Útkoman var **NaN fyrir öll 17
> E0-liðin, merkt `src:"e0"` eins og hún væri mæling** — og afritið sleppti
> `sotFor`/`sotAg`, `prev*`-aðlöguninni, `matches` og nýliða-staðgenglinum.
> App.jsx var ALLTAF RÉTT; afritið laug. **Ekki afrita þennan útreikning aftur** —
> báðir (viðmótið og bókhaldið) flytja hann inn, og `prediction-ledger.mjs`
> fellur ef App.jsx skilgreinir hann sjálft.

### `data/history/` — SKRIFAÐ, ÓLESIÐ, OG MÁ EKKI EYÐA

`fetch.mjs` skrifar daglega verðmynd í `data/history/YYYY-MM-DD.json`
(~80 KB/dag). **Ekkert les hana enn** — hún er hráefni í verðbreytinga-tímaröð
sem verður fyrst nýtileg þegar tímabilið er byrjað.

**Hún sleppur við `wiring.mjs`** því slóðin er sniðmát (`history/${today}.json`)
og regexið þar les aðeins fasta strengi — svo hún er hvorki á hvítlistanum né
flögguð. Það er gat í verðinum, ekki ákvörðun.

**EYÐIÐ HENNI SAMT EKKI.** Dagleg verðmynd er **óendurheimtanleg**: hún verður
ekki búin til eftir á. Að henda henni til að spara 1,3 MB væri að eyða einu
heimildinni um verðþróun. Sama regla og „tóm keyrsla má aldrei þurrka út góð
gögn" (8e). Vaxtarhraðinn (~29 MB/ár) er þess virði að fylgjast með, en
lausnin væri grisjun eftir aldri — ekki eyðing.

### Handvirkar skriftur — EKKI í daglegu pipeline

Tímabil sem er lokið breytist ekki, svo þessar eru keyrðar einu sinni og
niðurstaðan committuð:

| skrifta | skrifar | athugasemd |
|---|---|---|
| `fetch-bsd.mjs` | `bsd_players.json`, `bsd_shots.json` | ~1.400 köll |
| `fetch-bsd-teams.mjs` | `bsd_teams.json` | liðs-tölur; `exit 2` á tómu tímabili |
| `fetch-team-shots.mjs` | `team_shots.json` | ~660 ESPN-köll, talið eftir **svæðis-texta** (óháður kvarðanum) |
| `fetch-player-gw.mjs` | `player_gw_*.json`, `fpl_player_gw.json` | per-umferðar sagan |
| `fetch-fdr-history.mjs` | `fpl_fdr_history.json` | opinbera FDR-ið 1819–2526 |
| `fetch-clubelo-history.mjs` | Elo-saga | |
| `scan-elite.mjs` | `pros.json` | sérfræðinga-hópurinn; ~2 M köll, ~5 klst, **einu sinni á sumri** |
| `measure-friendly-dc.mjs` | ekkert (skýrsla; `--json <slóð>`) | **VANTAÐI Í ÞESSA TÖFLU til 16.8.2026** — óskráð mælingaskrifta er skrifta sem enginn getur endurtekið. Sækir FotMob `/api/data/matchDetails` (sjá kafla 6) fyrir varnar-tölur úr æfingaleikjum |
| `measure-friendly-form.mjs` | ekkert (skýrsla; `--json <slóð>`) | Sama; ber FotMob við ESPN-liðstölur. **Staðan er `UNVERIFIED`** — krossprófunin er skrifuð en hefur aldrei haft gögn, fyrst 21.8. **Vináttuleikir sem form-merki eru MÆLDIR OG FELLDIR: mínúturnar eru merkið, mörkin ekki** (skjalað í haus beggja skriftanna — ekki endurmæla) |

### Cron

`fetch.yml` daglega 05 UTC · `fetch-fast.yml` á 30 mín **auk**
`*/15 10-21 * * 0,1,5,6` (fös–mán, PL-tímar). Ástæðan: GitHub þynnir `*/30`
niður í 1–3,5 klst raunbil, og glugginn fyrir staðfest byrjunarlið er ~5 klst.
Kvótinn er varinn **í `fetch.mjs`** (geymsla per leik), ekki í cron-inu.

`fetchLineups()` er kallað úr **`--fast`**, ekki daglegu keyrslunni sem gengur
kl. 05 UTC meðan leikir byrja 12–19 UTC. Nöfnin frá API-Sports eru
**skammstöfuð** („J. Trafford"), og prófið notar það snið — fyrsta útgáfan
notaði full nöfn og staðfesti þar með snið sem API-ið sendir aldrei.
Vörður: `lineups.mjs` (29 próf á hermdum svörum, öll bilunartilvikin með).
**Tvær villur fundust hér og hvorug með lestri:** fallið var fyrst aðeins
kallað úr daglegu keyrslunni, og `fetch-fast.yml` hafði **engan `env`-blokk**
svo `FLAGS.apisports` var false og fallið var sleppt þegjandi. Prófið „er
`fetchLineups` kallað úr `fetchFast`?" var grænt allan tímann því það les
KÓÐA, ekki workflow-ið.

### `netlify/functions/odds.js`

**Strict routing: óþekkt `path` skal skila 400.** Áður féll allt óþekkt í
bókmakera-greinina og **eyddi Odds-API kvótanum**. CDN-cache 60 s. Leiðirnar
`fpl-entry`, `fpl-picks` og `fpl-league` eru þarna því FPL er CORS-lokað.

---

## 8. Viðmótsreglur sem hafa þegar verið lærðar

### Gögn og birting

- **NULL ER EKKI NÚLL.** `null` (gögn vantar) → „—" grátt og raðast **alltaf
  síðast í BÁÐAR áttir**; `0` er raunverulegt núll. Tóm gildi fljóta annars upp
  í „asc" og fylla toppinn.
- **Tómt gildi er SLEPPT, ekki sett í 0.** Súla af lengd 0 les eins og mæld
  nulltala. Sama gildir um DC-hittni í eldri tímabilum (`dc` var geymt sem 0,
  ekki null → hver leikmaður hefði fengið hittni 0,000).
- **Ómæld tala fær ekki reit.** Markmenn fá hvorki mó né aó (þeir voru aldrei
  mældir) og fá aldrei DC-hittni-reitinn. „mó 0,0" á markverði væri ómæld tala
  sem lítur út eins og mæling.
- **`hi` (hærra-er-betra) er FORSENDA, ekki skraut.** Fyrir Verð, GC, xGC,
  Mín./framlag, spjöld og allt sem lið fær **á sig** er lægra betra — nema
  langskot, sem eru ódýrustu skotin sem hægt er að gefa frá sér. Villandi mynd
  er verri en engin mynd. Verðir: `compare-visual.mjs`, `team-stats.mjs`.
- **Ófullkomin tala fullyrðir ekki.** Græna „best"-merkingin er tekin af öllum
  `incomplete`-dálkum og hausinn er gulur í staðinn. **Liða-xG/xGC ERU EKKI
  LENGUR Í ÞEIM HÓPI** (8.8.2026): þau koma nú úr BSD (per-skot xG) í stað
  FPL-summu. Gamla talan var ekki bara „~19% of lág" heldur **byggingarlega
  biluð** — lids-xGC var tekið úr `expected_goals_conceded` **eins markvarðar**,
  svo lið sem skipti um markmann fékk stórlega ranga tölu. Leeds mældist 0,70
  á móti raunverulegum 1,47 og fékk þar með græna „besta vörnin"-merkingu sem
  var hreinn tilbúningur. Mælt á 17 liðum gegn raunmörkum: **r 0,369 → 0,818**
  (vörn) og 0,667 → 0,749 (sókn), MAE ~45% lægra. **Engin FPL-varaleið** —
  BSD nær yfir nákvæmlega sömu 17 lið, hin þrjú (COV/HUL/IPS) áttu enga
  PL-röð og hafa hvorugt, svo enginn tapar tölu. Dálkarnir eru `season_locked`
  (BSD nær yfir 2025/26 eitt). Vörður: `team-stats.mjs` fellur ef einhver
  skiptir aftur í FPL-summuna án þess að setja `incomplete` aftur á.
- **Sjálfvirk felun á tómum dálkum faldi einu sinni RAUNVERULEGA VILLU**
  (dauður `team_dc`). Tómir dálkar eru **leiddir út, ekki taldir upp**, og
  fjöldinn er sagður í fótnótu.
- **ANDLITSMYNDIR ERU TVÆR FOTUR OG KEÐJA, EKKI EIN SLÓÐ** (16.8.2026).
  Heil talning á öllum 587 leikmönnum: gamla slóðin
  (`premierleague/.../p{code}.png`) vantar **206 (35,1%)**, nýja
  (`premierleague25/.../{code}.png`, **án „p"-forskeytis**) vantar 176, en
  **önnur hvor** vantar aðeins **109 (18,6%)**. Hvorug er yfirfota hinnar —
  97 menn eru aðeins í þeirri nýju og **67 aðeins í þeirri gömlu** (þeir sem
  skiptu um félag). Því er `photoNext` keðja í `Crest.jsx` og allir fjórir
  notendur ganga hana áður en þeir falla á treyju/staf. Þeir **109** sem
  eftir standa eru **raunverulega myndalausir hjá FPL** (90 með núll mínútur,
  52 hjá COV/HUL/IPS) og treyju-fallbackið er rétt svar. `premierleague26`
  er **ekki** sett inn fyrirfram: hún svarar 403 fyrir alla í dag.
  **Myndamirrun í repo-ið var mæld og hafnað** — 478 myndir eru 44,7 MB, hún
  nær ekki í það sem er ekki til, og repo-ið er public.
- **BÓKMAKARALÍNA GILDIR UM EINN LEIK — SANNREYNDU MÓTHERJA OG DAGSETNINGU**
  (16.8.2026). `csFor` gerði það; `_team_cs`-dálkurinn fletti upp á
  lids-skammstöfun EINNI. Meinlaust meðan `odds.json` er fersk, en sókninni er
  **sleppt** þegar hún var nýleg („skipped: plan window already fetched 23h
  ago"), svo dálkurinn hefði birt línu fyrir **leik sem er þegar búinn** án
  nokkurs merkis. Sama tveggja-þátta próf er nú á báðum stöðum; mælt: óbreytt
  **587/587** í dag, **0/587** bæði með úreltu `kickoff` og röngum `opp`.

### Dálkaskráin (`STAT_DEFS` í `stats.js`)

- **EIN dálkaskrá.** Leikmannalistinn, stigataflan og prófin lesa hana alla.
  Vilt þú taka dálk út: eyddu honum úr `STAT_DEFS` og hann hverfur úr töflu,
  röðun, þröskuldum OG stigatöflu í einu.
- **Fjögur svið:** `label` (dálkavalari, chip, tooltip) · `short`
  (töfluhausinn, ≤12 stafir) · `band` (spannandi hausröð) · `note` (**SKYLDA**,
  ≥12 stafir). Bandið er **forsenda styttingarinnar** — „Goals · /90" gengur
  þar sem „Goals per 90" hefði þurft 108 px.
- **`STAT_DEFS` er EIN röð og birtingar-röðin ER skrá-röðin.** Hún var í tveimur
  hlutum og þess vegna sat ICT í öðrum og ICT/90 í hinum.
- **Auðgunin er `makeEnricher` í `stats.js` og BÁÐIR lesmátar nota hana.**
  Meðan hún var inni í `cook` hafði stigataflan **20 varanlega tóma kassa** og
  þrír heilir flokkar sögðu „No numbers". Sama ætt af villu og dauði
  markaðsliðurinn. Verðir: `stats.test.mjs` kafli 14 (formúlan, mæld sem
  **delta**) og `playerlist-live-cols.mjs` kafli 3 (tengingin).
- **Blindir dálkar eru LEIDDIR ÚT, ekki handskrifaðir** (`gwBlindKeys`). Fyrsta
  útgáfan var handskrifaður lyklalisti og 13 af 22 lyklum voru rangir. Dálkur
  sem fylgir umferðar-bilinu er merktur `∑`. Vörður: `player-gw-range.mjs`.
- **Talið sem hlutfall, ekki fast þak.** Vörður sem taldi blinda dálka með
  `< 40` féll um leið og dálkum fjölgaði — sama villa og harðkóðaða safna-talan.
- **`sumGwRange` skilar FPL-sviðaheitum** (`total_points`, `expected_goals` …).
  Það er ásett: `STAT_DEFS` lesa FPL-heiti, svo allir dálkar — líka afleiddu —
  virka óbreyttir á umferðar-bilinu. Ný heiti hefðu kallað á aðra dálkaskrá.
- **`starts_per_90` er ekki hlutfall.** Það er byrjanir per 90 mínútur á velli;
  186 af 365 eru yfir 1,0. Heitið „Start rate" var **villandi**, ekki bara
  stutt. Spurningin „byrjar hann næsta?" er `start_prob` (6h-líkanið).

### Töflur og rúmfræði

- **ALDREI BLANDA STYTTINGU OG LANGRITUN Í SAMA STÍL** — og það á við um
  **`borderRadius` alveg eins og `border`**. Græna runan í FFDR-töflunni setur
  `borderTopLeftRadius` o.s.frv. á stakar hliðar ofan á `borderRadius: 5`.
  Það þagði á meðan bilið var FAST, en um leið og hægt var að **velja
  umferðir** komu **14 React-viðvaranir**: runur koma og fara við hverja
  breytingu, og React fjarlægir þá longhand-gildin í ódefineraðri röð.
  Grunnstíllinn skrifar því allar fjórar hliðar/horn berum orðum
  (`borderTopColor`… og `borderTopLeftRadius`…). Vörður: `react-warnings.mjs`.
- **Frosinn dálkur fær bakgrunn BEINT, aldrei `inherit`.** Í hausnum situr
  liturinn á sticky-umgjörðinni, svo hólfið erfir `rgba(0,0,0,0)` og haus-heiti
  skruna sýnilega undir nafnadálkinn. Mælt tvisvar, í tveimur töflum. Kant-skugga
  þarf líka við `scrollLeft > 2` — án hans les hálf-klippt heiti eins og bilun.
- **`boxSizing: "border-box"` Á BÁÐUM** haus og hólfi, annars hleðst 2 px
  skekkja upp þar til heitið situr ekki yfir sínum dálki.
- **Skjá-letur er MÆLT með canvas, ekki giskað.** Stafamatið 5,9 px lifði í
  þrjár vikur af því að það var *nálægt* réttu (6,32) og braut 34 haus-heiti.
  Hart hámark víkur fyrir orði sem getur ekki brotnað.
- **Röðunar-örin er tekin frá á ÖLLUM dálkum** — hausinn er hægri-jafnaður og
  `nowrap`, svo yfirflæði hverfur **vinstra** megin („Points ↓" varð „oints ↓").
- **ALLT SEM SITUR Í HAUSNUM VERÐUR AÐ VERA Í BREIDDINNI — LÍKA MERKI**
  (16.8.2026). `season`-merkið kom 14.8. í stað ólæsilega `∑`, en `wOf` frátók
  áfram aðeins **örina** (`marker = 9`). Mælt: **44 af 124 dálkum** bera merkið,
  hver vantar ≥17 px, og **25 af 44 misstu heitið að fullu** — sýnilegi hausinn
  var brot úr orðinu „season". Þetta er nákvæmlega gildran í liðnum hér að ofan,
  bara með merki í stað stafs. **Og vörðurinn gat ekki fallið:** `stats.test.mjs`
  ENDURRITAÐI `wOf` með sínu eigin `marker = 9`, svo afritið var grænt eftir að
  merkið bættist við — sama ætt og `buildTeamMetrics`-atvikið (kafli 7).
  Breiddin, merkja-reglan og fastinn eru nú **útflutt** (`headWidth`,
  `headBadge`, `BADGE_W`) og bæði viðmótið og prófið lesa SÖMU útfærsluna.
  **`BADGE_W` er LEIDD af mældu stafabreiddinni, ekki valin.**
- **Breið tafla fær sinn eigin skrun-kassa** svo hún ryðji ekki SÍÐUNNI út á
  síma. Síðan skrunar hvergi lárétt (mælt: `scrollWidth − clientWidth = 0`).
- **SÍMAHAMURINN VAR ALDREI PRÓFAÐUR — LAGAÐ 9.8.2026.** `narrow` kviknar á
  `window.innerWidth < 560` og `matchMedia`. jsdom gefur `innerWidth = 1024`
  og hefur **enga `matchMedia`**, svo `narrow` var **fast `false` í öllum
  prófum** og effectinn skilaði sér strax út — annar helmingur töflunnar var
  jafn óprófaður og hann væri ekki til. `playerlist-narrow.mjs` stillir
  **báðum** upp (390 px) og mælir: nafnahólf **216 → 140 px**, tölur
  **→ 66 px**, andlitsmyndir **0**, liðsmerki **áfram 31** (11 px hvert).
  Þau tvö síðustu eru ólík hlutir: fyrsta útgáfa prófsins taldi allar `<img>`
  og **felldi rétta hegðun** — merkin eiga að vera þarna.
- **Hitakortið kvarðast innan SÍAÐA hópsins**, P10–P90 (ekki min-max — Haaland
  gerir min-max ónothæft), og `hi === false` **snýr kvarðanum**. Aðeins efsti og
  neðsti fjórðungur eru litaðir; annars verður taflan flís þar sem tónarnir
  benda ekki á neitt. Föstu dálkarnir eru litaðir LÍKA — tveir ólitaðir dálkar
  innan um litaða lásu eins og villa.

### Litir og merki

Þrír litir, þrjár merkingar — þeir hafa rekist á áður og mega ekki gera það
aftur: **grænt = í mínu liði** · **ljósfjólublátt = í samanburði/röðun** ·
**blátt = valinn dálkur**. Borðinn liggur á **frosna hólfinu, ekki röðinni** —
röðin skrunar lárétt yfir 100+ dálka og borði á henni hyrfi við fyrsta skrun.
Vörður: `watchlist.mjs` (vistun, síun, og að borðinn liggi á hólfinu).

### Íkon

**Í smárri stærð er SILHÚETTAN allt.** Tvö íkon sem eru bæði „hringur með
smáatriðum" verða EINS við 13 px, hvað sem smáatriðin eru — þess vegna er
hvert á annarri grunnform-samsetningu (víti = lóðrétt tvennd · aukaspyrna =
lárétt tvennd · horn = skálína). **Íkon verður að prófa í RAUNSTÆRÐ**:
víta-íkonið var endurteiknað tvisvar eftir skjá-prófun (bogi yfir knetti las
sem horn á andliti; hringlaga depill las sem staðsetningar-næll). Teikningin
var „rétt" í öllum þremur; myndin var vitlaus í tveimur.
Tveir flipar með sama tákni er það sama og ekkert tákn.

### Annað

- **Völlurinn er í venjulegu flæði** (`rowsArea` space-evenly), EKKI negldur á
  fastar prósentur. Gamla útgáfan lét spjöld skarast og klippti bekkinn.
- Skel `maxWidth: 1280`; leikjadálkur `minmax(280px, 340px)`; spjaldabreidd
  `clamp(62px, 17.5%, 100px)`. Responsive í `src/styles.css` (1020/760/480).
- **Lyklaborðs-fókus:** `:focus-visible` (ekki `:focus`), `currentColor` (appið
  hefur bæði ljósa og dökka hnappa) og **negatíft** `outline-offset` (umgjörðir
  með `overflow:hidden` klipptu ytri hring).
- **Föst leikatriði: „fyrsti taki" er LÆGSTA RÖÐUN INNAN LIÐSINS**, ekki
  `order === 1`. Vörður: `set-pieces.mjs`. Sá sem tekur fleiri en eina tegund
  er feitletraður — talið á **röðun innan liðs**, ekki FPL-tölunni, af sömu
  ástæðu.
  > **OG GRUNNURINN BREYTTIST — 13.8.2026.** Hér stóð að FPL notaði „annan
  > grunn fyrir horn (svið 4–10), svo **0 af 20 liðum** náðu 1". Milli
  > dagskeyrslanna 12.8. og 13.8. fór `corners_and_indirect_freekicks_order`
  > úr **2–12 (0/20 með 1)** í **1–6 (18/20 með 1)**; `pen` og `fk` eru bæði
  > 1–5, svo öll þrjú sviðin hafa nú SAMA grunn. Pipeline snertir töluna ekki
  > (`fetch.mjs:262` afritar hana), svo þetta var FPL sjálft.
  > **Reglan stóðst óbreytt** — röðun innan liðs er rétt á báðum grunnum — og
  > hún er ENN nauðsynleg: FUL og NEW hafa enga 1.
  > **Það sem brotnaði var vörðurinn OG textinn á skjánum.** Þrjár
  > fullyrðingar í `set-pieces.mjs` voru um FPL-númerin en ekki um regluna og
  > féllu; `stats.js` bar nótu sem sagði **„MEASURED: … the range is 4–10 and
  > NO club has a 1"** í tooltip og `SetPieces.jsx` prentaði **„4–10 and never
  > reach 1"** í flipann sjálfan. Föst tala um lifandi gögn úreldist þegjandi —
  > og hér með orðinu MEASURED framan við. **Sviðin eru nú REIKNUÐ**
  > (`spRanges` í `SetPieces.jsx`) og birt þaðan; nótan segir regluna eina.
  > **Afturför-vörðurinn er tvískiptur og það er mælt nauðsynlegt:** með nýja
  > grunninum finnur `order === 1` taka fyrir 18 af 20 liðum, svo lifandi
  > gögn ein duga ekki lengur til að fella hann. Vörðurinn liggur á TILBÚNU
  > liði (röðun 4/7/9) sem getur aldrei orðið tómt, auk lifandi liðanna án 1,
  > TALINNA. Sjá 5b um tómar fullyrðingar.
- **Grænar runur** (`greenRuns` í `model.js`): grænt = þrep **undir** hlutlausu,
  og **auð umferð SLÍTUR runu** (blank = 0 stig). `null >= 2` er `false` í JS,
  svo `!= null` er prófað sérstaklega. Ramminn krefst `borderSpacing: 0` með
  2px gagnsæjum ramma á hverju hólfi, annars slitnar hann milli hólfa.
- **Verðlaun í einka-deildum:** `Math.max(0, …)` báðum megin. Reitirnir eru
  frjáls texti, og `pottur 10.000, skipting [50,-30]` gaf fyrsta sæti
  **2,5× allan pottinn**. Námundað NIÐUR svo greiðslur fari aldrei yfir pottinn.
  Peningar og deildarnúmer eru **notanda-gögn** í `localStorage` og fara aldrei
  í neitt kall út.
- **Villuvörnin** (`ErrorBoundary.jsx`) er utan um `<App/>`. Mikilvægara en
  kassinn er **útgangan**: `loadState` les `localStorage` beint í state, svo
  óheilt blob felldi appið við HVERJA hleðslu. Hnappurinn er **tvístiga** og
  hreinsar alla `fpl_*`-lykla — **valið yfir harðkóðaðan lista** svo nýr lykill
  verði ekki útundan þegjandi. Grípur EKKI async-villur; þær eiga sinn eigin
  villukassa í `dataState`.
- **EN VILLUVÖRNIN Á AÐ VERA SÍÐASTA ÚRRÆÐI, EKKI ÞAÐ FYRSTA** (9.8.2026).
  `loadState` ver aðeins gegn **ónýtu JSON**; gilt JSON með **rangri gerð** fór
  óspurt inn í state. Mælt á 14 skemmdum blobbum — **fjögur felldu appið**:
  `plan:"abc"` · `chips:[1,2,3]` · `benchSwaps:{"1":"x"}` · `rivals:{}`.
  Villuvörnin greip þau, en eina útgangan þar eyðir **öllu liðinu, fyrirliðanum,
  skiptaáætluninni og chip-unum**. Gerð hvers sviðs er nú þvinguð við lestur, svo
  eitt ónýtt svið kostar bara sig sjálft. `benchSwaps` er hlutur **af fylkjum**,
  svo ytri gerðin ein dugar ekki — `{"1":"x"}` er gildur hlutur en `"x".forEach`
  fellur; það tilfelli slapp fram hjá fyrstu lagfæringunni. Vörður:
  `untrusted-input.mjs` (hét `saved-state.mjs` í þessu skjali fram til
  14.8.2026 og sú skrá er EKKI til í FPL — aðeins undir `nfl/`), þar sem
  **gilt ástand verður að fara í gegn óbreytt** —
  annars væri „lagfæringin" að henda raunverulegri plönun notandans.
- **Skipta-glugginn (`selling`) má ekki fjarlægja.** Hann veit hvað þú ert að
  selja, hvað er í bankanum og hvað 3-per-félag reglan segir — leikmannalistinn
  veit ekkert af því.
- **Talning á ómögulegum tölum (`isIncoherent`) verður að haldast sýnileg.**
  FPL skilar `goals_scored: 11` með `minutes: 0` (Meslier). Að fjarlægja
  birtingu á verði og halda talningunni er nákvæmlega gildran sem kostaði viku.

---

## 9. Enska eingöngu

Tungumálalagið (`i18n.js`, `i18n-en.js`, `useLang.js`, IS/EN-hnappurinn,
`tests/i18n*.mjs`) var **tekið út 7.8.2026**. `<html lang>` er `en`.
Umritunin var vélræn (Babel-AST, 1.144 köll, enginn lykill vantaði) og
staðfest með DOM-mynd af öllu appinu fyrir og eftir: munurinn var **5 strengir
= IS/EN-hnappurinn, ekkert annað**.

**Eftir stendur `src/interp.js`** — eitt fall fyrir 93 sniðmáts-setningar þar
sem orðaröðin er hluti af setningunni. Heitið var valið **mælt**: `fmt` rakst á
staðbundna talnasniðgerð og byggingin féll strax.

**LEIFARNAR VORU HREINSAÐAR 8.8.2026 — ekki setja þær inn aftur:**

| leif | hvers vegna hún var til | staða |
|---|---|---|
| **Lötu getterarnir** (`get label() { return "…"; }`, 70 talsins í 5 skrám) | tafla á einingarsviði var reiknuð EINU SINNI við innflutning og hefði **frosið á því tungumáli sem var valið þá** | **fjarlægðir** — nú venjuleg gildi. Lestur er nákvæmlega eins; getterarnir voru hrein yfirbygging eftir að lagið fór |
| `langWrap` · `langBtn` · `langOn` í `App.jsx` | stílar IS/EN-hnappsins | **fjarlægðir** (skilgreindir, aldrei notaðir) |
| `ZONE_IS` · `FOOT_IS` · `EXPLAIN_IS` | `_IS` = íslensk heiti | **endurnefnd** `ZONE_LABEL` / `FOOT_LABEL` / `EXPLAIN_LABEL` — gildin voru fyrir löngu orðin ensk, svo nafnið laug |
| Suite-skráin í haus `run-tests.mjs` | handskrifuð upptalning | **fjarlægð** — hún taldi upp `i18n.mjs`/`i18n-dom.mjs` löngu eftir að þau voru eydd og sagði `error-boundary` verja hið gagnstæða við það sem hún ver. `SUITES` ER skráin |

> **ATH við `docs/MAELINGAR.md` kafla 8b:** þar stendur að töflur á
> einingarsviði **VERÐI** að vera lazy. Sú regla gilti á meðan tungumálalagið
> var til og er **fallin úr gildi**. Ekki endurvekja getterana.

**`tests/no-icelandic.mjs` er vörðurinn.** Kafli C er þar af því að
stafa-skynjun **getur ekki séð** „Yfirlit", „Grunnur" eða „laugardagur" —
**ASCII-íslenska er ósýnileg**. Listinn (52 orðmyndir) er byggður á því sem
raunverulega lak 31.7. og **getur staðnað**; orð með enskri merkingu (`lid`,
`min`, `man`, `mid`, `sun`) eru viljandi utan hans, annars félli prófið á
réttum enskum texta og væri slökkt innan viku.

### ÞETTA SNERI VIÐ 9.8.2026 — PIPELINE-STRENGIRNIR ERU LÍKA ENSKIR

Hér stóð áður: *„Enn íslenskt og á að vera það: `status.json`- og
`last_gw.json`-nóturnar sem `record(...)` skrifar. Þær eru **gögn, ekki
viðmót**."* **Sú forsenda var röng í framkvæmd.** `v.note` er birt undir
**Data sources** — bæði sem sýnilegur texti þegar heimild bíður eða brestur
og sem tooltip á hverri röð. Og `comp_label` fór beint í leikjalistann á
leikmannaspjaldinu: mælt 9.8.2026 bar spjald Aston Villa-manns **„Ofurbikar"**
í enskri töflu, og eftir dráttinn hefði **„Meistaradeild"** birst á sex félögum.

**Allir strengir sem pipeline skrifar eru nú enskir** — 100 talsins í sjö
skriftum: keppnisheiti, `record(...)`-nótur, `note:`-svið í hverri gagnaskrá
og rekstrar-loggarnir sem sjást í Actions.

**ATHUGASEMDIR ERU ÁFRAM ÍSLENSKAR og það er ÁSETT.** Þær eru rökstuðningur
og villusögur — sama efni og þetta skjal. Reglan er skýr:
**viðmót og gögn á ensku, rökstuðningur á íslensku.**

**Vörðurinn er nýr kafli D í `no-icelandic.mjs`** og hann les **upprunann**
(`scripts/*.mjs`), ekki DOM-inn. Það er nauðsynlegt: kafli C leyfir íslensku
sem kemur úr `data/` (leikmannanöfn, FPL-fréttir) — og nótan kom einmitt
þaðan, svo hún gat aldrei fallið þar. Strengir eru lesnir með **skanna**, ekki
regexi: fyrsta útgáfan notaði regex og `/["']/` (regluleg segð með gæsalöppum
inni) lét hana gleypa 200 línur af kóða sem einn „streng".

**Lærdómurinn sem gildir áfram:** AST-próf les kóða, ekki DOM — það sér aldrei
það sem er á skjánum. Íslensku strengirnir 31.7. fundust með því að **keyra
appið og lesa það**, ekki með því að skanna kóðann.

---

## 10. Bíður tímabilsins — GW1 er 21. ágúst 2026

Þetta er **vélrænt vaktað af `tests/gw1-checklist.mjs`**, sem sefur í forleik
og vaknar við fyrstu loknu umferð. Ekki treysta á minnið hér.

| atriði | af hverju blokkað | hvað á að skoða |
|---|---|---|
| API-Sports meiðsla-**tegund** | fría þrepið sér aðeins ±1 dag frá leikdegi | `injuries.json` → `via`, `players`, `unmatched` |
| `/fixtures/lineups` staðfest byrjunarlið | sami gluggi | pörun við skammstöfuð nöfn |
| „í ár vs. í fyrra"-taflan | byggð og villuvarin, hefur **aldrei keyrt** | birtist hún rétt? |
| `fdcouk_e0` 2026/27 | CSV verður til við fyrsta leik | **EKKI „404 → 200" — það merki er ekki til.** Slóðin 301-ar í `EC.csv` (utandeild) þangað til, svo prófsteinninn er `Div === "E0"`, ekki HTTP-staðan (sjá kafla 6) |
| Mínútuþróun (`player_form.json`) | `data/live/` er tóm í forleik | kviknar við GW4 |
| DC-hittni (`defcon.json`) | DefCon er ný stigagjöf; aðeins 2025/26 hefur gögn | `hit_rate_adj` til staðar |
| BSD spáð byrjunarlið | glugginn er **~11–13 klst** fyrir leik — FPL-fresturinn er ~1,5 klst fyrir FYRSTA leik umferðarinnar, svo laugardagsleikir eru spáðir EFTIR frestinn | **mæla gegn 6h-líkaninu yfir GW1–4 áður en henni er treyst** |

**Rök sem verða að endurmetast eftir GW1:** kafli 6 í `docs/MAELINGAR.md` segir
að API-Sports sé þarna fyrir meiðsla-TEGUND sem FPL sleppir. Mælt 8.8.:
**71% FPL-frétta nefna tegundina** og enginn flaggaður leikmaður er án fréttar.
Forsendan er brostin; heimildin er samt ekki fjarlægð því hún á enn
`/fixtures/lineups` og fyrsta raunprófun beggja er sú sama.

---

## 11. Það sem þetta skjal getur EKKI flutt með sér

1. **Git-skilríki.** `gh auth login` eða SSH-lykill.
2. **API-lyklarnir.** Þeir búa í GitHub Secrets og eru **write-only** — þú getur
   ekki lesið þá héðan; aðeins notandinn getur flutt þá út staðbundið:
   ```bash
   export API_SPORTS_KEY=... ODDS_API_KEY=... EURO_API_KEY=... BSD_KEY=...
   node scripts/fetch.mjs
   ```
   `fetch.mjs` les aðeins `process.env` (ekkert dotenv).
3. **Þitt eigið liðsástand** (byrjunarlið, fyrirliði, skiptaáætlun, chips,
   samanburður, vaktlisti, dálkaval) er í `localStorage` undir `fpl_*`, ekki í
   repo. `START_IDS` í `smoke.test.mjs` er aðeins prófliðið.

Allt annað er í repo-inu: prófin (þau **framkvæma** ákvarðanirnar í köflum 3–4
og eru þar með áreiðanlegri en prósa), `README.md`, `data/SCHEMA.md`,
`docs/MAELINGAR.md` og commit-sagan.

---

## 12. LEIKMANNADALKARNIR — SJO TOLUR SEM VORU RANGAR (17.8.2026)

Allir **124 dalkar** i Player stats voru endurreiknadir ur hraustu heimildunum
og lesnir AF SKJANUM. Sjo báru **rangar tolur** (ekki orðalag). Malingarnar eru
i `docs/MAELINGAR.md`; reglurnar sem leiða af theim eru hér:

- **Teljari og nefnari verða að koma úr SÖMU heimild og sama tímabili.**
  `xg_share` deildi árstíðar-xG með summu þeirra sem eru **í dag** hjá
  félaginu og sýndi Ogbene **148%**. Hlutur getur ekki farið yfir 100% —
  fari hann þangað er það **sönnun** um tvær heimildir, ekki há tala.
  Vörður: `stats.test.mjs` kafli 14c.
- **`?? 0` BÁÐUM MEGIN BÝR TIL TÖLU SEM ER EKKI TIL.** `net_transfers_event`
  sýndi `0` hjá öllum 587 í hverju sögulegu tímabili af því að bæði sviðin
  vantar þar. Sama regla og „NULL ER EKKI NÚLL" — hún gildir líka um
  **mismun tveggja vantandi talna**.
- **Vörður á nefnara einum dugar ekki.** `mins_per_gi` varði deilingu með
  núlli en ekki `minutes: 0`, svo Meslier (`11 mörk / 0 mínútur`) fékk `0`
  og sat **efstur** á hlutfalls-dálki.
- **FPL geymir `0` fyrir þann sem aldrei spilaði — það er ekki mæling.**
  Fimm `*_per_90` dálkar lásu FPL-sviðið beint og sýndu `0.00` þar sem
  systkini þeirra í sömu röð sýndu réttilega „—". Á `hi:false`-dálki setti
  það **164 leikmenn sem aldrei spiluðu efst** sem bestu varnirnar.
- **FLOKKURINN ER SJÁLFUR FULLYRÐING.** `bsd_blocks` sat í Vörn með `hi:true`
  og nótunni „skot andstæðinganna sem hann blokkaði" — það eru **hans eigin
  skot sem voru blokkeruð**. Dálkur í röngum flokki er ekki nótu-villa;
  hann verður að flytjast.
- **Afrituð tafla er tvær töflur sem reka í sundur.** `ZONE_RE` stóð orðrétt
  í tveimur skriftum og **bæði afritin vantaði markteiginn**, svo 22 af 170
  leikmönnum báru rangt `In box` og þrír lásu hart `0` þótt þeir hefðu skorað
  úr markteignum. Hún býr nú í `scripts/espn-zones.mjs` sem báðar flytja inn.
- **Dálkur sem les hrátt FPL-svið deyr í sögulegu tímabili.**
  `pen_order`/`fk_order`/`ck_order` voru **tómir hjá öllum 587** í sjálfgefnu
  útsýninni því `player_seasons.json` ber ekki þau svið. Sviðin sem þarf að
  bera yfir eru **LEIDD** (`liveOnlyRawFields`, Proxy-könnun á hverjum
  getter), ekki handskrifuð — handskrifaður listi staðnar (sbr. `gwBlindKeys`).

> **MARKMENN FÁ ENGIN DEFCON-STIG — MÆLT, EKKI ÁLYKTAÐ.** Núll stig í
> **hverri einustu** leikja-umferð 2025/26. Dálkarnir fimm bera nú `pos:[2,3,4]`.
> **TVENNT ER ENN ÓLAGAÐ:** nefnarinn í DC-hittni eru **leikir, ekki byrjanir**
> þótt nóturnar segi „starts" (deildar-hittni les 0,1361 en er 0,1907 — **+40%**,
> og `p0` er vanmetið af sömu villu svo aðlagaða talan erfir hana tvisvar);
> og **lifandi smiðurinn gefur markmönnum DefCon frá GW1** — hermt: **211 af 757
> markmanna-umferðum (27,9%)** ná þröskuldinum, drifið af endurheimtum
> (að grípa boltann). Það byrjar að birtast **21. ágúst**.
