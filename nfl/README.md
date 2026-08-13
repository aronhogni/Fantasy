# NFL.md — leiðarvísir fyrir NFL-hlutann

`npm ci && npm test && npm run build`. Allt á að vera grænt.

Þetta er **sjálfstætt app** í sama repo og FPL-verkefnið. Þau deila
**engum kóða, engum stílum og engum gögnum** — aðeins byggingarskrefi og
hýsingu. Það er viljandi: breyting í öðru má ekki geta fellt hitt.

| | FPL | NFL |
|---|---|---|
| Slóð | `/Fantasy/` | `/Fantasy/nfl.html` |
| Kóði | `src/` | `nfl/src/` |
| Gögn | `data/` | `data/` |
| Pipeline | `scripts/fetch.mjs` | `scripts/fetch-nfl.mjs` |
| Workflow | `fetch.yml`, `fetch-fast.yml` | `fetch-nfl.yml` |
| Leyndarmál | 4 lyklar | **engir** |

> **GRUNNREGLAN ER SÚ SAMA OG Í `CLAUDE.md`:** tölur eru **mældar**, ekki
> valdar. Hver einasti fasti í `src/model.js` kemur úr
> `scripts/calibrate.mjs` og ber mælinguna í athugasemd. Ómæld tala sem
> lítur út eins og mæling er versta útkoman — hún er röng OG trúverðug.

---

## 1. Hvað þetta er

Draft- og greiningartól fyrir NFL fantasy, byggt kringum eina spurningu sem
hin öppin svara ekki: **hverjum er hægt að treysta?**

Tímabilið **2026/27 hefst í september 2026**; þegar þetta er skrifað er
preseason og drafttíðin er að byrja. Þess vegna er draft-hlutinn fullbúinn og
vikulegi hlutinn bíður fyrstu umferðar.

**Tveir flipar sýnilegir, sex faldir** (`view` í `App.jsx`). Notandinn bað um
að sjá aðeins Draft og forsíðuna; hitt er falið bak við **„… More"** en **áfram
virkt og áfram letihlaðið**. Flipi sem væri *fjarlægður* tæki með sér tölur sem
appið les: `Model lab` ber mælingarnar sjálfar, `Sources` er það eina sem
**sýnir** þegar heimild brestur, og `Experts` ber nákvæmnina sem `sharpDelta` á
borðinu er reiknað úr. Þetta er **birtingar**-ákvörðun, ekki líkans-ákvörðun.

> **ÞEKJA ER FULLYRÐING.** Földu fliparnir hefðu látið þrjú söfn heimsækja
> **tvo** flipa í stað átta — og `visual.mjs`, `audit.mjs` og `layout.mjs` féllu
> öll, sem er **rétt hegðun**. Rétta svarið var að **opna** þá í prófunum, ekki
> að lækka þröskuldinn. Í `visual.mjs` var ein tala notuð í tvennum skilningi
> („teiknaðist appið?" og „skoðuðum við alla flipa?"); þær eru nú aðskildar.

| Flipi | | Hvað hann gerir |
|---|---|---|
| 🏈 **Draft** | sýnilegur | Draft-borð með VBD, þrepum, skortstöðu og **beinni Sleeper-tengingu** |
| 🏠 **Dashboard** | sýnilegur | **Forsíðan: BÁÐAR deildirnar.** Staða · start/sit · pikka upp/droppa |
| ⭐ My team | falinn | Ein deild í einu, og **`benchRegret`** — var bekkurinn óheppni eða villa? Kviknar fyrst þegar vika er liðin |
| 👥 Players | falinn | Stóra taflan — 33 dálkar, hitakort, dálkavalari |
| 🧠 Experts | falinn | Nákvæmni ~205 sérfræðinga, **mæld af okkur** gegn 2025 |
| 💰 Market | falinn | Veðbankalínur og hvað þær segja |
| 🔬 Model lab | falinn | **Mælingarnar sjálfar** — hvaða deildarlögun voru prófaðar |
| 📅 Schedule | falinn | Leikjaskrá, vænt stigaskor úr veðbankalínu, bye-vikur |
| 🔌 Sources | falinn | Heilsa hverrar heimildar + öll kvörðunin, með áhrifastærðum |

### Skráaskipanin — hrein rökfræði aðskilin frá React

Ekki afrita formúlur inn í `.jsx`. Prófin keyra nákvæmlega sama kóða og appið
birtir; það er forsenda þess að þau séu marktæk.

| Hreint (ekkert React) | Birting eingöngu |
|---|---|
| `scoring.js` — stigagjöf í öllum sniðum | `App.jsx` — skel, flipar, deildarstillingar |
| `model.js` — blöndun, VBD, þrep, leikstaða | `DraftBoard.jsx` — borðið + Sleeper-tenging |
| `accuracy.js` — draft-hermun og mælikvarðar | `PlayerTable.jsx` — stóra taflan |
| `build.js` — byggir raðirnar sem birtast | `Experts.jsx` · `Schedule.jsx` · `Sources.jsx` |
| `names.js` — nafna-pörun (síðasta úrræði) | `ErrorBoundary.jsx` |
| `columns.js` — **ein** dálkaskrá | |
| `data.js` — hleðsla + `localStorage` | |
| `sleeper-league.js` — Sleeper-svar → deildarsnið | `Dashboard.jsx` — forsíðan |
| `standings.js` — staða úr `/rosters` + `/users` | |
| `waivers.js` — frjálsir leikmenn + pikka/droppa | |
| `weekview.js` — vika: spá, andstæðingur, bye | |
| `rulebasis.js` — hvað röðin er þess virði | |

---

## 2. Gagnaheimildir — 20+, allar ókeypis, **enginn lykill**

Það er ekki tilviljun heldur val: heimild sem krefst lykils dettur út þegar
lykillinn rennur út, og það gerist alltaf á versta tíma. FPL-hlutinn þarf fjóra
lykla; þessi þarf engan.

| Heimild | Hlutverk | Athugasemd |
|---|---|---|
| **nflverse** (GitHub Releases) | **Sannleiksgildið.** Vikuleg fylki 2006→, leikjaskrá **með veðbankalínum**, snap-hlutföll, dýptartöflur, meiðsli, NGS, PFR | Nota `stats_player`, **ekki** `player_stats` — sú útgáfa staðnaði á 2024 |
| **Sleeper** `/v1/*` + `/projections/*` | Vettvangurinn sem er draftað á: leikmenn, spár, ADP, trending, **`/draft/{id}/picks` í beinni** | Sendir CORS-hausa → vafrinn kallar beint, enginn proxy |
| **FantasyPros** (3 leiðir) | ECR + þrep · **bord hvers sérfræðings fyrir sig** · þeirra eigin nákvæmniseinkunnir | `partners.…/consensus-rankings.php?filters=<id>` — sjá varnagla í 4 |
| **DynastyProcess** `db_playerids.csv` | **Auðkennisbrúin.** fantasypros ↔ sleeper ↔ gsis ↔ espn | Handviðhaldin; kjarninn í öllu |
| **FantasyFootballCalculator** | ADP úr **raunverulegum** dröftum, 10/12/14 lið × ppr/half/std | Ber `total_drafts` — úrtaksstærðin er sýnileg |
| **ESPN** fantasy + site API | ADP, uppboðsverð, eignarhald, meiðsli, liðaskrá | Spáin þeirra er **ónothæf**, sjá 4 |

**Mælt og hafnað sem heimild:** NextGenStats-API (401), KeepTradeCut (500),
NFL.com `researchinfo` (503). Ekki endurmæla.

---

## 3. Reiknilíkanið — MÁ EKKI FÍNSTILLA Á TILFINNINGU

Allt í `scripts/calibrate.mjs`. **25.160 leikmanna-vikur, 2020–2025**, með
leave-one-out grunnlínu.

### Teygni gagnvart væntu stigaskori (`POS_ELASTICITY`)

`log(stig/grunnlína) = e · log(vænt/22,5)`, fittað gegnum núllpunkt:

| staða | e | se | t | n |
|---|---|---|---|---|
| QB | 0,229 | 0,079 | 2,9 | 2.814 |
| RB | **0,356** | 0,069 | 5,2 | 6.134 |
| WR | **0,069** | 0,048 | **1,4** | 9.165 |
| TE | 0,211 | 0,068 | 3,1 | 4.231 |

**Fyrsta útgáfan setti 0,55 á allar stöður og 0,70 á RB.** Það var ágiskun sem
leit út eins og mæling; raunverulega talan er um þriðjungur af því.

**WR-liðurinn er ekki marktækur og það er NIÐURSTAÐAN, ekki gat.**
Sendingamóttakarar hagnast ekki mælanlega á því að liðið sé spáð mörgum stigum
— lið sem er undir sendir meira og bætir það upp. Að gefa WR sama margfaldara
og RB væri að flytja vörn á allar stöður, sem var stærsta einstaka villan sem
fannst í FPL-verkefninu.

**Varnagli:** LOSO á RB gefur 0,278–0,467 (bil 0,189) — liðurinn er **óstöðugur
milli ára**. Hann er því inni en **smár**, og viðmótið sýnir hann sundurliðaðan.

**Þekkt skekkja:** vikur með 0 stig eru sleppt (log tekur ekki 0) og þær eru
oftar í leikjum með lágt vænt skor. Mælingin **vanmetur** því teygnina — talan
er varfærin, sem er rétta áttin fyrir margfaldara.

### Vörn gegn stöðu (`DEF_WEIGHT = 0,20`)

Mælt **utan úrtaks**: vörnin er reiknuð úr vikum < w og prófuð á viku w.

| w | RMSE |
|---|---|
| 0,00 | 0,77300 |
| **0,20** | **0,77200** |
| 0,50 | 0,77400 |
| 1,00 | 0,78500 |

Tvennt skiptir máli: **(a)** hrá vörn gegn stöðu (w=1) gerir spána **verri en
að sleppa henni**, þvert á það sem umræðan gefur í skyn. **(b)** Besta vogin
bætir RMSE um **0,13%**.

Liðurinn er inni sem jafntefla-brjótur. **Viðmótið má aldrei selja hann sem
meira en hann er** — `Sources`-flipinn segir þessa tölu berum orðum.

### Flex-skipting (`FLEX_SPLIT`)

Mælt með því að telja hverjir lenda raunverulega í topp-12 flex hverja viku:

| | RB | WR | TE |
|---|---|---|---|
| **mælt** | 0,330 | 0,477 | **0,193** |
| ágiskað (fyrsta útgáfa) | 0,35 | 0,55 | **0,10** |

TE-villan var stór og hún fór **beint í VBD**: varamanns-þrep allra þéttenda var
reiknað of hátt og þeir fengu allir of lágt VBD.

### Boom/bust-þrep

85. og 25. hundraðshluti af vikum þeirra sem eru raunverulega í byrjunarliði:

| | QB | RB | WR | TE |
|---|---|---|---|---|
| boom ≥ | 30 | 25 | 24 | 21 |
| bust < | 20 | 14 | 13 | 12 |

Fyrsta útgáfan ágiskaði QB-boom 24 (mælt: 30) og RB-boom 20 (mælt: 25) — með
þeim tölum hefði dálkurinn talið venjulega góða viku sem sprengingu.

---

## 4. MÆLT OG HAFNAÐ — lokaðar spurningar

### 4a. Leitin að betri A-Ranking — 12.8.2026, tvennt fellt

Notandinn bað um að leitað yrði leiða til að gera A-Ranking nákvæmara, fyrir
**bæði PPR og half-PPR**. Fyrsta lóðið: `features.json` ber **enga half-PPR röð**
(1.882 `ppr` og 1.840 `standard`) — en half er **reiknanlegt upp á stig**, ekki
nálgun: PPR = STANDARD + móttökur, svo **HALF = (STANDARD + PPR) / 2**.

| hugmynd | niðurstaða |
|---|---|
| **Ólínulegur aldursferill per stöðu** (`agecurve-lab.mjs`) | **HAFNAÐ.** Hrá leit jákvæð 8/10; **walk-forward jákvæð 4/10 og marktæk 0/10**, tvö hólf marktækt *negatíf*; LOSO 2/10. Valda fjölskyldan hoppar milli ára í hverju hólfi — sama undirskrift og CLAUDE.md 3 flaggar. `deltaR2` net of ADP er negatíft í **öllum 48 hólfum** |
| **Annar VBD-grunnur** (`vbdbase-lab.mjs`) | **HAFNAÐ — og fann VILLU.** 16 afbrigði × 3 lögun × 3 stigagjafir: **0 af 153 hólfum standast bootstrap klasaðan PER LEIKMANN**, þótt **29 standist** hann klasaðan eftir tímabili. Sjá 4b — það er sjálfstætt mikilvægasta aðferðar-atriðið hér |
| **`minGain` í waiver-ráðgjöfinni** (`waiver-lab.mjs`) | **ÓMÆLANLEGT, og það er svarið.** Gólf 0 − gólf 10 = **+0,5**, CI [−0,7 · +1,8]; walk-forward slær ekki gólf 0. `measured: false` **stendur** — gildið er val innan mældrar afskiptaleysis-bandar. Sjá 4g |
| **Rest-of-season sem gjaldmiðill** (`waiver-lab.mjs`) | **STENST** (+13,2 stig/tímabil, t=2,97, 6/7, CI [5,9 · 22,2], 17/18 hólf) — **en ekki tengjanlegt**: þarf vikurnar sem eftir eru, sem appið hefur ekki. Vikuleg spá sem gjaldmiðill er **mæld dauð** (−74,6). Sjá 4g |
| **Notkun það sem er liðið af tímabilinu** (`usage-lab.mjs`) | **STENST — fyrsti vinningurinn.** `opp_prior` lokar **12,25 / 10,75 / 10,76%** af bilinu á móti 5,83 / 3,20 / 2,97, og **per-leikmanns CI útilokar núll í öllum þremur**. Ferillinn er niðurstaðan: **ekkert í vikum 1–4, +12,3 pp í vikum 10+** (6/6 tímabil). Sjá 4e — **ekki tengt enn**, plumbing vantar |
| **Markaðurinn umfram `implied`** (`mktweek-lab.mjs`) | **FELLUR.** 0 af 45 hólfum standast öll fjögur skilyrðin i neinu sniði. Og **leikjaflæðis-folkloreið er RANGT**: hver staða gerir BETUR sem favorít, engin gerir betur á eftir — QB sem 10+ undirdogg er **−1,12**. Ósamhverfa: **12 af 12 CI innihalda núll** |
| **Availability-taflan** (`avail-lab.mjs`) | **ÁGISKAÐA TAFLAN STENDUR.** Engin mæld tafla slær hana í neinu sniði. `Questionable = 0,75` er kvarðað 0,666 en ákvörðunin er **flöt**; `Doubtful` 0,25 á móti 0,009 er 28× skekkja sem kostar 0,143 pp. `practice_status` gefur upplýsingar en **ekki ákvarðanir** (+0,44 pp, CI innihaldur núll). **OG ÞAÐ AFHJÚPAÐI AÐ `gap-lab` ER BLINT Á AVAILABILITY** — sjá 4i |
| **Vörn gegn stöðu, sundurliðuð** (`defweek-lab.mjs`) | **FELLUR — 0 af 2.700 hólfum.** Andstæðings-leiðrétting **skaðar** (marktækt í half, t −5,87). Íhlutir flytjast ekki. `DEF_WEIGHT = 0,20` stendur. **OG ÞAÐ FANN VILLU Í MÆLIKVARÐANUM:** birta talan 5,831% var sjálf-smituð; hrein walk-forward er **3,482%**. Sjá 4h |
| **Hvar liggja 94%** (`gap-lab.mjs`) | **Þakið er 29,3%** (TD 18,9 + nýtni 10,4). Vörn er **NULL-flaska** (enrichment 0,96×). Röð: availability → hlutverk → vörn ekki neitt. Sjá 4f |
| **Tækifæri sem lítil vog OFAN Á VBD-röðina** (`opp-lab.mjs`) | **EINN frambjóðandi, ekki breyting.** `prevCarG` (hlaup per leik, fyrra tímabil) mælist **+24,4 stig**, t=2,275, 8/11 ár, CI [+3,7, +43,7], einræn 4/4. Fimm varnaglar fella hana samt sem *breytingu* — sjá 4d. Hinar tíu breyturnar: engin stenst |
| **Óvissu-háð hnignun spárinnar** (`shrink-lab.mjs`) | **HAFNAÐ.** 12 óvissu-mælar × 3 forgildi × 6 vogir: **0 af 36 samsetningum jákvæðar í öllum 10 hólfum á báðum spáheimildum**. Besta samkvæma hrifin +0,5 stig af ~1900. Marktækni í **0/14** hólfum (besta \|t\| = 3,4 gegn kröfu 4,5–5,7) |

**Aldur: skugginn er raunverulegur, hann flyst bara ekki.** RB-leifin fellur
einrænt og steypist við 29–31 (**−22,3 stig** net of ADP), WR −15,4, og hnykkurinn
hjá FFToday liggur á **30,0 í sex árum í röð**. Formin eru ekki hugarburður.

**Og mekanisminn er nú þekktur.** Mælt á **sömu 740 röðum** sem bera báðar spár:

| | r(aldur, leif) gegn **Sleeper** | gegn **FFToday** |
|---|---|---|
| RB | −0,043 | **−0,124** |
| WR | −0,088 | **−0,143** |
| ALLT | −0,026 | **−0,119** |

**SLEEPER HEFUR ÞEGAR VERÐLAGT ALDUR.** Svarið er ekki „enginn aldursferill er
til" heldur „spáin sem appið notar hefur étið hann" — og það segir líka hvað
gerist ef spáheimildin breytist. Fyrri mælingin (r = −0,017 í `feature_probe`)
var **ófullnægjandi aðferð sem benti í rétta átt**: línuleg fylgni jafnar
hækkunina 22→26 út á móti fallinu 27→31 og getur ekki séð þrepið, en niðurstaðan
stendur samt.

> **ÓLÍNULEIKINN ER SJÁLFUR OFFITTUNIN.** Bestu **út fyrir úrtak** fylgnin eru
> hjá **línulegu** formunum (+0,100 til +0,113); hnykkirnir eru **verri**
> (+0,065 til +0,081). Aukafrígráðurnar kaupa þjálfunar-fit og tapa prófi.

**Hnignun: MAE batnaði meðan ákvörðunin versnaði** — 57 af 1080 hólfum, og
hreinasta tilfellið er á heimildinni sem appið notar: MAE 57,30 → **57,12** og
draft **−40,4 stig** (PPR), −85,7 í half. Þetta er `aron/verð`-niðurstaðan úr
FPL-hlutanum í nýju samhengi: **lægri MAE er ekki betri ákvörðun.**

Og eitt sem er þess virði að muna: **hnignun bætir EKKI alltaf MAE.** Gegn
Sleeper versnar hún í **210 af 216** tilfellum, því Sleeper er þegar vel kvarðað.
„Hnignun bætir MAE" gildir aðeins gegn **illa kvörðuðu** punktmati.

**PPR á móti half: tilgátan fellur á sínu eigin prófi.** Miðgildi besta `k` er
**0,1 í öllum þremur sniðum** gegn Sleeper, og pöruð per tímabili er
half − ppr = **−28,4** með 27/216 marktækt negatíf — hnignun **skaðar meira** í
half en í PPR, gagnstætt „móttökur eru stöðugri".

#### Þrennt almennt sem keyrslurnar afhjúpuðu

1. **AFFÍN ÓHAGGANLEIKI, mældur og ekki gefinn sér.** Föst hnignun að
   stöðu-meðaltali **getur ekki breytt A-Ranking**. Sé
   `proj' = (1−k)·proj + k·m_pos` þá er `baseline' = (1−k)·baseline + k·m_pos`, svo
   **`VBD' = (1−k)·VBD`** fyrir hverja stöðu — einn hnattrænn skali, **sama röð**.
   `uniform·posMean` mælist nákvæmlega **0,0** við hvert k<1 í öllum 14 hólfum.
   Það skýrir líka hvers vegna fastar hnignunar-fjölskyldur í `board-lab` og
   `arank-lab` lesa flatar.
2. **CONFOUND SEM LAS FYRST SEM +364 STIGA SIGUR.** `altProj` með
   `source = fftoday` við k=1 og u=1 setur w=0 — borðið **verður** þá
   Sleeper-borðið. Það er „Sleeper slær FFToday" (5k), ekki hnignun.
3. **TVÆR `df`-VILLUR** í uppflettingu á krítísku gildi, **báðar sem lækkuðu
   þröskuldinn** (2,228 þar sem 2,776/3,182 var rétt). Lagfærðar.

### 4d. `prevCarG` — frambjóðandi sem var EKKI tengdur

`opp-lab` spurði annarrar spurningar en `feature-probe`: ekki „berr breytan
fylgni við leif spárinnar?" (svarið var nei fyrir allar 14) heldur **„bætir
lítil, einræn vog, LÖGÐ OFAN Á VBD-röðina, ákvörðunina?"** Þær eru ólíkar: röðun
notar aðeins **röð**, og aðeins í toppnum.

Ein breyta af ellefu stóðst öll fjögur skilyrðin — `prevCarG` — og hún var samt
**ekki tengd**. Fimm ástæður, hver ein nóg:

| # | varnagli |
|---|---|
| 1 | **Ábatinn er EKKI í toppnum.** `all` +30,5 · `top100` +30,6 · **`top50` aðeins +12,0** (t=1,79). Hún vinnur í sætum 50–150 — miðjuumferðir, ekki þar sem draftið er ákveðið |
| 2 | **Ómarktæk í þeirri heimild sem appið notar.** FFToday 2015–20: +28,6 (5/6, t=2,35). **Sleeper 2021–25: +19,3 (3/5, t=0,97)** — sami veggur og 5b/5e: fimm tímabil |
| 3 | **Marginal gegn placebo:** +24,4 á móti placebo-þaki **+21,7** |
| 4 | **Fylgnin hefur ANDSTÆTT formerki.** Fylgni `prevCarG` við leif spárinnar er **−0,052**. Jákvæð ákvörðun, negatíf fylgni, í sama skripti — það er repo-ið eigin regla („hærri fylgni ≠ betri ákvörðun"), en það þýðir líka að **mekanisminn er óskýrður** |
| 5 | **Mekanisminn er líklega ekki „tækifæri".** Per stöðu lifir merkið í **RB og QB**; `prevCarG` er ~0 fyrir nánast hvern WR/TE. Líklegasta lesningin er **RB-vinnuálag + hlaupandi QB**, ekki tækifæri í heild. Óprófað |

#### Placebo-familían — mælitækið sem gerði töfluna læsilega

**Átta placebo-breytur — ákveðinn hávaði — voru keyrðar gegnum sama netið.** Þær
ná einstöku hólfi með **\|t\| = 3,50 og +58,2 stig**, og 2–24 placebo-hólf per
lögun/snið koma út „marktæk". **Eitt jákvætt marktækt hólf er það sem hávaði
lítur út eins og hér.** Pooled gefa þær meðaltal −1,2, sd 9,2, hámark
\|t\| = **1,268** og forspárbil **[−24,2, +21,7]**.

Án þeirrar familíu hefði per-hólfs taflan stutt nánast hvaða niðurstöðu sem er —
og fyrsta 4-tímabila keyrslan hafði **10 af 11** breytum jákvæðar og hækkandi í
`w`. `board-lab`'s Bonferroni-líka formúla hefði krafist \|t\| > 5,43 við þennan
fjölda afbrigða, sem **ekkert 11-ára meðaltal getur náð** — hún hefði hafnað öllu
og þar með mælt ekkert. Placebo-þakið kemur í staðinn.

#### Tvær tilgátur sem féllu beint

**Er merkið sterkara í PPR en í standard? NEI, skýrt nei.** Parað per tímabili,
sömu leikmenn, sömu vogir, sama lögun, aðeins stigagjöfin ólík: ppr > standard í
**3 af 11** breytum (sign-test p = 0,97 — ef eitthvað er þá hið gagnstæða), full
röðun ppr > half > standard í **0 af 11**, og ppr−standard sem útilokar núll í
**1 af 11** — á móti **1 af 8 placebo-um**, sem er nákvæmlega fals-jákvæðnin.
Móttökur skora 1,0 í PPR og ~0 í standard; væri þetta móttöku-tækifæri hefði
mismunurinn sýnt það. **Það er engin mæld ástæða til að bera ólíka vog per
stigagjöf.**

**Magn á móti nýtni — xGI-slær-xG hliðstæðan flyst EKKI.** volume +8,7
(t=1,73) · efficiency **+9,6 (t=2,40, CI [+1,9, +17,3])** · context −21,0 ·
trend +6,4. **volume − efficiency = −0,9, t=−0,15** — ógreinanlegt, og nýtnin er
nafnbótarlega **þéttari**. Í FPL var magn-slær-nýtni **mæld ákvörðun**; hér er
hún það ekki.

`prevTeamPassRate` er skýrasta negatífa niðurstaðan: jákvæð vog kostar
**−21,0 stig** (−30,7 í PPR), einræn 4/4 — eina „context"-breytan og það versta í
töflunni.

> **HEIÐARLEGT DEBET, skráð í skrána sjálfa:** negatífi helmingur vog-netsins var
> **bætt við EFTIR** að Tier A sýndi magn-breyturnar með negatífa fylgni við
> leifina. Það er **gagna-háð víkkun** og hún er talin í `variants`. Einhliða net
> hefði gefið sér áttina, sem er einmitt það sem `feature-probe` gat ekki staðfest.

---

### 4e. FYRSTA RAUNVERULEGA VINNINGURINN — notkun það sem er liðið af tímabilinu

Sex mælingar 12.8.2026 felldu allar sínar hugmyndir. **Þessi féll ekki.**

`weeklyProjection` byggir á árstíðar-spá deildri á 17 og notar **ekkert** af því
sem hefur gerst í þessu tímabili. `usage-lab` mældi hvað það kostar.
Sigurvegarinn er sá sami í öllum þremur sniðum: **`opp_prior`** — hlaup + sendingar
til þessa, varpað gegnum fitt á **fyrri** tímabilum.

| snið | incumbent → arm | delta | t | ár | **CI (per leikmann)** | placebo-þak |
|---|---|---|---|---|---|---|
| ppr | 5,83 → **12,25%** | +6,40 | 2,56 | 5/6 | **[2,54 · 8,49]** | +2,03 |
| half | 3,20 → **10,75%** | +8,64 | 2,26 | 5/6 | **[0,61 · 7,86]** | +3,93 |
| std | 2,97 → **10,76%** | +7,09 | 2,74 | 6/6 | **[0,60 · 8,04]** | +4,40 |

**Per-leikmanns bootstrap útilokar núll í ÖLLUM ÞREMUR** — það er skilyrðið sem
felldi allt annað í dag (`vbdbase-lab` fékk 0 af 153). Og það er ekki eitt
heppið hólf: `opp_prior` **bætir við kjarnann** (`deltaVsIncumbent > 0`) í
**45/52, 50/52, 48/52** hólfum (ppr/half/std).

> **ÞETTA STÓÐ SEM „48/52, 51/52, 47/52" OG PASSAÐI VIÐ HVORUGA LESNINGU.**
> Talið úr `usage.json -> results.<snið>.grid.opp_prior.<gluggi>.<ferill>`:
> `deltaVsIncumbent > 0` gefur **45/50/48** og `pctOfGapClosed > 0` gefur
> **51/52/49**. Bókaða talan var hvorugt.
>
> Mælikvarðinn sem skiptir máli hér er `deltaVsIncumbent` — spurningin er hvort
> `opp_prior` **bæti við** kjarnann, ekki hvort hún sé betri en ekkert. Hann er
> nefndur berum orðum í tölunni af nákvæmlega þeirri ástæðu sem `DEAD_GAMES`
> og VBD-bókunin kenndu sama dag: **tala án mælikvarða og án slóðar er
> ósamanburðarhæf**, og sá sem „leiðréttir" hana seinna getur hæglega flett upp
> í annarri töflu og bókað nýja villu ofan á þá gömlu. Ég gerði það sjálfur
> einu sinni í dag.

#### FERILLINN ER NIÐURSTAÐAN, EKKI TALAN

| viku-bil | ppr | half | std |
|---|---|---|---|
| 1–4 | +0,8 (t 0,62) | +2,2 (t 0,35) | +4,2 (t 1,26) |
| 5–9 | +2,0 (t 0,35) | +9,9 (t 3,35) | +5,9 (t 0,99) |
| **10–18** | **+12,3 (t 4,21, 6/6, boot [4,6 · 14,5])** | **+12,1 (t 4,51, 6/6)** | **+10,5 (t 3,89, 6/6)** |

Í vikum 10+ fer PPR úr því að loka 3,97% af bilinu í **18,0%** — 4,5×. Í vikum
1–4 er **ekkert**, og **kröftug blöndun þar er SKAÐLEG** (`const0.5`: −4 til −9 pp).
Vogin verður því að vera Bayesísk með **hægri byrjun** — nánast engin vog á
tímabilið fyrr en ~6 leikir eru komnir. Föst vog er verri en engin.

**Notkun slær stig, en aðeins hóflega** (+1,71/+1,72/+2,08) og það er **MAGN
tækifæra**, ekki hlutdeild: `tshare`/`wopr` **einar eru VERRI** en `opp`
(hlaup+sendingar). Per stöðu (ppr) ber **WR** merkið (+2,4 til +3,4); RB
klofnar eins og `opp-lab` sagði (`ptsPG` +2,53 t=5,40 en `tshare`/`wopr` ≈ 0);
QB/TE ≈ 0.

**`first4`-afturhvarfið endurtekur sig EKKI vikulega.** Gegn leifinni eru
fylgnin **jákvæð** (RB +0,146, WR +0,131). `first4` (−0,134) er
**þvert á tímabil** — afturhvarf frá einu ári til annars — en **innan** tímabils
spáir notkun-til-þessa því að slá sína eigin spá. Þau tvö stangast ekki á, og
þetta er ástæðan fyrir því að notkun var mæld sérstaklega frá stigum.

> **ÞRÖSKULDS-VILLA SEM FLIPPAÐI SVARINU.** Fyrsta útgáfa labsins tók
> `max |t|` yfir placebo-hólf og fékk **22,238** — en besta *hávaða*-hólfið
> fyrir sama fræ **tapaði** 1,536 pp. Hólfið var `const0.9`: að blanda 10%
> hávaða hverja viku tapar litlu og tapar því **í hverju tímabili**, svo
> dreifnin er örsmá og `|t|` risastórt. Það er þröskuldur fyrir „hve marktækt
> getur hávaði litið út **í hvora átt sem er**"; spurningin er **einhliða**.
> Með `maxPositiveT` fóru ppr og standard **úr falli í pass**. Sami galli var í
> `cellsSignificant` (46/52 „marktæk" af því að þau voru marktækt VERRI).

**EKKI TENGT ENN — OG ÞAÐ ER EKKI VAL.** `data/weekly/` ber 2019–2025 en
**ekkert 2026**, og `src/data.js` ber engan `loadWeekly`. Appið **getur ekki**
reiknað notkun-til-þessa í dag. Þrennt þarf, í þessari röð, og það þarf að vera
til **fyrir viku 5**: (1) pípan skrifar `data/weekly/2026.json` yfir tímabilið,
(2) `data.js` fær letihlaðinn `loadWeekly`, (3) `weekview.js` blandar með
Bayesískum ferli sem er **nánast núll fram að viku 6**.

### 4f. HVAR LIGGJA ÞAU 94% SEM EFTIR ERU — og varnar-flaskan var TÓM

`gap-lab` sundurgreindi `ceiling − weekly` og **endurgerði akkerið upp á þrjá
aukastafi** (ppr 5,831% = 5,831%, standard 2,967%). Að komast þangað krefðist
þess að finna eitt raunverulegt: `optimalLineup` hrátt gefur **5,657%** og
skeikar á **8 af 3.687** uppstillingum — **FLEX-jafnteflisbrot**.
`startsit-lab` skeytir leifum RB,WR,TE svo jafntefli falla til RB, og
viku-spár eru námundaðar á 0,1 svo jafntefli eru **raunveruleg**. Inntakið er nú
raðað eftir stöðu (stöðug röðun heldur hóp-röð innan stöðu) og það endurgerir
töluna á **0/3687** — með **einni** uppstillingar-vél, ekki tveimur.

**ÞAKIÐ ER 29,3%, EKKI BARA TD.** Tvennt sem beiðnin gat ekki vitað:

| | ppr | half | std |
|---|---|---|---|
| TD-slembni | 18,9% | — | — |
| **nýtni** (sömu 8 sendingar, 55 jarda eða 120) | 10,4% | — | — |
| **samtals óviðráðanlegt** | **29,3%** [26,3 · 31,7] | 33,4% | 40,6% |

Tvær óskyldar aðferðir hittu TD innan 1,2 pp (þröskuldslaus 18,9%, foss 17,7%).

**OG VARNAR-FLASKAN VAR TÓM.** Vörn (c) fangaði **26,7%** af bilinu — stærsti
flokkurinn — en **enrichment hennar er 0,96×**: merkið flaggar eftirsjá
**sjaldnar** en venjuleg vika. **Hlutfall án grunntíðni er merkingarlaust.**
Án þess skrefs hefði þessi skýrsla sagt „byrjaðu á varnarlíkaninu", sem er
nákvæmlega rangt.

**Röðin, afvöxtuð með enrichment:**

| # | flokkur | stig | hlutfall | enrichment | **merki-stig** |
|---|---|---|---|---|---|
| 1 | **availability** | 1,80 | 16,1% | **1,42×** | **0,53** |
| 2 | **hlutverk** | 1,67 | 14,9% | 1,20× | 0,28 |
| 3 | vörn | 2,98 | 26,7% | **0,96×** | **0,00** |

Availability fyrst, hlutverk næst, **vörn ekki neitt** á þessum gögnum. Það er
samhljóða `usage-lab`: hlutverk **ER** notkun, og það er einmitt það sem vann.

(a) vex yfir tímabilið (8,5% → 17,4% → **20,6%**), og per stöðu er TD-slembni
margfalt stærri hjá QB (46,8%) en WR (8,7%).

> **TVENNT SEM VERÐUR AÐ FYLGJA TÖLUNUM:** full fjarvist er **ósýnileg** — 19,1%
> af hóp-vikum (3.206: 742 bye, 2.464 fjarverandi) bera enga röð og falla úr
> **báðum** uppstillingum, svo (a) er **neðra mark**. Og óflokkaða leifin er
> **31,5%**. Loks: vikulíkanið lokar **MINNA** af bilinu í TD-hlutlausum heimi
> (4,30% á móti 5,83%) — **forskot þess er ekki merki sem drukknar í TD-hávaða**.

### 4g. WAIVER — kóðinn bað um mælinguna og fékk „ekki mælanlegt"

`WAIVER_CAL.minGain` bar `measured: false` og athugasemd sem **bað beinlínis um
lab**. `waiver-lab.mjs` er nú til: **169.368 hermd deildar-tímabil**, 2019–2025,
vikur 1–14, og **hvert annað sæti í deildinni keyrir sömu reglu** — annars mælist
einokun á lausum mönnum, ekki reglan.

#### Gólfið er ÓMÆLANLEGT — og það er svarið

- Parað á sömu dröftum: **gólf 0 − gólf 10 = +0,5 stig á tímabili, CI [−0,7 · +1,8]**
- Walk-forward val á gólfinu **slær ekki gólf 0**: +3,9 (t=1,37) í 10-liða PPR,
  +1,3 (t=0,48) í 12-liða half
- Deildirnar **vilja ekki mælanlega ólík gólf**

`10` er þess vegna **nákvæmlega eins defensíbelt og 0**, og `measured: false`
**stendur** — en ekki lengur af vanrækslu. Gildið er val **innan mældrar
afskiptaleysis-bandar**, sem er annað og heiðarlegra en óskoðuð ágiskun.

> **EITT SKILYRT ATRIÐI FYLGIR:** verði `currency` að rest-of-season byrjar
> **ALGILT** gólf að skaða (gólf 0 − gólf 10 = **+5,4**, CI [2,2 · 8,2]) og verður
> þá að vera **hlutfallsreiknað** á vikurnar sem eftir eru.

#### Gjaldmiðillinn — tvær mældar niðurstöður, önnur nothæf

| samanburður | stig/tímabil | t | ár | CI |
|---|---|---|---|---|
| **rosVbdPro − seasonVbd** | **+13,2** | **2,97** | **6/7** | **[5,9 · 22,2]** |
| rosVbd − seasonVbd | +12,3 | 2,70 | — | [4,9 · 21,6] |
| weekVbd − seasonVbd | **−74,6** | — | — | [−91 · −57] |
| weekRaw − weekVbd | **−118** | — | — | — |

**Vikuleg spá sem gjaldmiðill er MÆLD DAUÐ** — að elta eina viku þyrlar burt
tímabils-virði — og að sleppa varamanns-þrepinu alveg (hrá vikuleg stig) er
−118 til viðbótar. Það staðfestir sjálfstætt það sem `WAIVER_CAL.currency` hélt
þegar fram: **ábatinn verður að vera í VBD**.

**Rest-of-season vinnur samt yfir tímabils-VBD** (+13,2, jákvætt í **17 af 18**
hólfum) og það er **ekki tengt af því að það ER EKKI HÆGT**: það þarf vikurnar sem
eftir eru og notkun-til-þessa á bak við þær, og appið hefur hvorugt í vafranum
(`data/weekly/` stoppar 2025, `data.js` ber engan `loadWeekly`). **Í forleik eru
þau hvort eð er eins.** Sama plumbing og 4e þarf — og hún þjónar báðum.

#### „Gera ekkert" er rétt oftar en maður vill

- **42,9%** af öllum 2.205 hólfum
- Reglan skilar **tómum lista** í **34,5%** af hóp-vikum (`seasonVbd@10`)
- Aðeins **~60%** af framkvæmdum skiptum voru rétt eftir á
- Vikulegt vinningshlutfall gegn aðgerðalausu sæti er aðeins **51–53%**

Svo `pickupAdvice` sem skilar `[]` er **algengt og rétt**, og forsíðan segir það
berum orðum.

#### Mótherjarnir hálfa áhrifin

Aðgerðalaus mótherja-völlur á móti virkum: **+9 til +34 stig** (meðaltal ≈ +24).
Season-VBD í 12-half fer **23,6 → 45,4** ef aðeins mitt lið vinnur vírinn. Hefði
hermunin sleppt því hefðu **allar tölur hér lesið um tvöfalt hærra** — sama villa
og stöðuþak-aðeins-á-okkar-liði í `accuracy.js`.

> **VARNAGLI SEM VERÐUR AÐ FYLGJA:** röðin `ros > season > week` heldur í **5 af 6**
> næmis-afbrigðum og **flettist við k=8** í 12-half (ROS +7,8 á móti season +17,7).
> Hnignunar-vogin `k` er nuisance-breyta sem er haldið fastri.

Hliðin eru öll spennt (skriftan **fer út með 2–6 fremur en að skrifa**): regla
gegn spegilmynd sinni = **nákvæmlega 0** (54 athuganir) · hraða ákvörðunar-leiðin
staðfest gegn **`pickupAdvice` + `freeAgents` á 360 hóp-vikum** án fráviks ·
**ROS-orakel +36 til +181, 9/9 hólf**, svo mælitækið sér sannanlega merki. Og
eins-viku orakelið er **viljandi ekki hlið** og það er veikt (5/9, +6,9) — sem er
sjálfstæð vísbending um vikulega gjaldmiðils-niðurstöðuna.

### 4h. TALAN 5,831% VAR SJÁLF-SMITUÐ — vörn gegn stöðu, 13.8.2026

`defweek-lab` var sett á lægstu væntingu sem nokkurt lab hefur fengið hér:
`gap-lab` hafði mælt varnar-flöskuna **tóma** (enrichment 0,96×). Það fann ekkert
í vörninni — og fann í leiðinni **villu í mælikvarðanum sjálfum**.

`data/defense.json` er **SEASON TOTAL**: hver röð ber `games` 14–17, þ.e. allt
tímabilið (staðfest sjálfstætt: 773 raðir með 17, 334 með 16). Bakprófið notaði
því vörn byggða úr **öllu** tímabilinu til að „spá" viku 3 — **leikurinn sem var
spáður var inni í inntakinu**. Það er nákvæmlega leka-skilyrðið sem hvert lab í
dag var látið forðast, og incumbent-inn sjálfur braut það.

| snið | birt (smituð) | **walk-forward (hrein)** | t | ár |
|---|---|---|---|---|
| ppr | 5,831% | **3,482%** | 3,21 | 7/7 |
| half-ppr | 3,199% | **2,860%** | 2,615 | 6/7 |
| standard | 2,967% | **2,245%** | 2,862 | 6/7 |

**Sönnun, ekki ályktun:** `leakySeasonK6` endurgerir 5,831 / 3,199 / 2,967 **upp á
núll** úr `data/weekly/` (hlutföll skeika 8,7e-4), svo uppskiptingin er staðfest.
Og orakelið segir sömu sögu úr annarri átt: **fullkomin** vitneskja um varnarstyrk
**fyrir** leik lokar aðeins **4,938%** í ppr — **minna en birta talan**, sem er
ómögulegt nema birta talan innihaldi leikinn.

> **OG SMITIÐ FALDI NIÐURSTÖÐU.** Ég birti half-PPR sem **ómarktæka** (t = 1,908
> úr `mktweek-lab`). Hrein mæling gefur **t = 2,615**, sem **stenst** þröskuld
> 2,228. Smitið blés ekki aðeins upp ppr heldur faldi að half stendur. Báðar tölur
> eru í `WEEKLY_MEASURED` (`pct` og `leakyPct`); **sú hreina er birt** og sú
> smitaða er merkt og pinnuð.

**ÞETTA ER MÆLINGIN, EKKI APPIÐ.** Í lifandi notkun byggir pípan `defense.json`
úr **loknum** leikjum, svo vika sem er óspiluð er ekki í henni. Villan var í því
**hvað við sögðum að talan væri**, ekki í því hvað appið reiknar.

#### Vörnin sjálf — ekkert, og það er samhljóða `gap-lab`

**0 af 2.700 hólfum** komast yfir placebo-þakið. Season-klösuð vikmörk gefa **39**
marktæk hólf; per leikmanni **0 af 2.700** — sama undirskrift og 4c.

| ás | ppr | half | standard |
|---|---|---|---|
| **andstæðings-leiðrétting** | −0,14 | **−0,188 (t −5,87, 0/7)** | +0,057 |
| íhlutir m/EPA | +0,164 (t 0,50) | −0,05 | −0,014 |
| íhlutir án EPA | −0,121 | −0,628 | −0,392 |

Andstæðings-leiðrétting **skaðar**, marktækt í half. Og vænt stig á sig úr
**íhlutum** flyst ekki — andstætt xG-í-FPL, þar sem vænta talan vann.

**`DEF_WEIGHT = 0,20` stendur:** sveipur velur 0,5/0,3/0,1 eftir á, en
walk-forward val **tapar í öllum þrem** (3,572 á móti 6,765 · 0,629 á móti 2,742 ·
1,236 á móti 3,892) — sama og endurfitting í FPL.

#### Tvennt sem akkeri fundu og var ekki spurt um

- **`defense.json` er PPR-tafla og er notuð ÓBREYTT í standard og half.**
  `defenseVsPosition` leggur saman `r.ppr` fyrir öll snið. Fannst þegar
  endurgerðar-akkerið féll (3,487 á móti 2,967). Mælt sem nýr ás:
  **ómælanlegt í báðar áttir** (−0,035 t −0,69 · −0,011 t −0,15). Flýtileiðin er
  því defensíbel — **nú af mælingu**, ekki af því að enginn hafði litið.
- **Föst varnartala — núll upplýsing — hreyfir mælikvarðann samt** ±0,42/0,58/0,86
  pp, því 0,1-rúnnun býr til og slítur jafntefli. Það er **gólfið undir öllum
  samanburði** í skránni. Þetta var skrifað sem akkeri og **féll á 2,07 pp**;
  invariantið var rangt, ekki kóðinn.

### 4i. AVAILABILITY — ágiskaða taflan var RÉTT, og `gap-lab` gat ekki séð hana

Ég sagði að availability væri **lyftistöng #1** (enrichment 1,42× úr `gap-lab`).
`avail-lab` mældi það og **fyrri fullyrðingin var byggð á blindum mælikvarða**.

> **`gap-lab` ER PROVANLEGA BLINT Á AVAILABILITY.** Fullkomin vitneskja um hverjir
> spila gefur **NÁKVÆMLEGA `avail = 1`** — 5,831 / 3,199 / 2,967 upp á þrjá
> aukastafi — því **allir í þeim hópi bera þegar röð**. Sá sem spilaði ekki hefur
> enga röð í `weekly/*.json` og fellur úr **báðum** uppstillingum. `gap-lab`
> skrifaði þennan varnagla sjálft („(a) er neðra mark"), en ég las töluna
> **16,1% / 1,42×** eins og hún væri heildin. Hún var **hlutabrestur eingöngu**.

Rétta stærðin krefst **annars harness** þar sem fjarvist er sýnileg (hópur =
allir sem lið þeirra spilar, bye undanskilið):

| | % af bilinu lokað |
|---|---|
| `avail = 1` (engin availability) | **8,16%** |
| **núverandi ágiskaða tafla** | **23,39%** |
| orakel (fullkomin vitneskja) | **47,78%** |

**Taflan sem er í `model.js` er því að vinna +15,2 pp** — margfalt meira en allt
sem var mælt í dag. Og hún var **ágiskuð**.

#### Er `Questionable = 0,75` rétt? Á ákvörðuninni: JÁ

Kvörðun og ákvörðun eru **tvær ólíkar tölur** og hér skilja þær:

| | kvarðað | núverandi | kostnaður á ákvörðun |
|---|---|---|---|
| Questionable | **0,666** (QB 0,55 · TE 0,75) | 0,75 | ferillinn er **flatur**: 0,75 → 23,39% · 0,80 → 23,63% · 0,90 → 23,55% |
| Doubtful | **0,009** | 0,25 | **28× skekkja, kostar 0,143 pp** |

Walk-forward val á `Questionable` í stað 0,75 er vert **−0,166 pp**. Og
`Doubtful` 0,25 á móti 0,009 skiptir engu **því 0,25 raðar honum þegar undir
hvern heilbrigðan kost** — röðun notar bara röð.

**Engin mæld tafla slær ágiskaða töfluna, í neinu sniði, í hvorugu harness.**
Placebos tapa um 24–27 pp, svo ábati núverandi töflu er **raunverulegt merki**,
ekki spá-rýrnun. Ágiskunin í `src/model.js` var **góð ágiskun**.

#### `practice_status`: upplýsingar já, ákvarðanir nei

DNP/Limited/Full gefur **næstum 2× einræna** dreifingu (0,855 / 0,682 / 0,416) á
1.105 röðum — raunverulegt merki. Sem **ákvörðun**: **+0,44 pp, t 0,61,
per-leikmanns CI [−0,395 · +1,333] inniheldur núll.**

Stiginn skýrir hvers vegna:

| þrep | ábati |
|---|---|
| **`Out → 0` eitt** | **+11,63 pp af +13,8** (84%) |
| + Doubtful | +2,01 |
| + Questionable | +1,60 |
| + practice | −0,99 / +0,44 |

**Availability ER Out-dálkurinn og nánast ekkert annað — og `Out` er þegar rétt.**

Líkamshluti: **nei** (r = 0,429 á 7 hólfum, CI innihaldur núll; T3 yfir T2 er
+0,07 pp). Gróf-flokkaða útgáfan prentar r = 0,74 á **fjórum** punktum — ekki lesa
hana.

#### Þar sem 26,45 pp liggja — og hvorugur dálkurinn nær þeim

Höfuðrýmið er **26,45 pp** (t 9,31, CI [20,8 · 32,8]) og það er **EKKI í
meiðslaskýrslunni**: báðir dálkar eru nú mældir út. Það er í **óvæntum
inactives** — `NotListed`-hólf með P(röð) 0,853 sem ekkert í skýrslunni greinir.

> `Probable: 0,95` er **dautt þrep**: NFL afnam merkinguna 2016 og hún kemur **0
> sinnum** fyrir. Hún er samt **ekki fjarlægð** og það er ásett: `AVAIL_KNOWN`
> er til svo **nýtt orð frá Sleeper falli á prófi** í stað þess að fá þögult
> `avail = 1` (Aiyuk-villan, `DNR`). Óvirk röð í vörn-uppflettitöflu er
> **vörn**, ekki dauður kóði.

Pörun gsis↔gsis: **98,15%**, engin nafna-pörun. Lekaprófun: miðgildi **48,6 klst**
fyrir leik, 78% föstudags-stimplað, 8 af 10.061 röðum breyttar eftir kickoff
(felldar). **2025 ber ekkert `date_modified`** og er því ekki leka-prófanlegt;
næmnis-arm sem tekur það með gefur −0,808 pp, sama svar.

### 4b. VILLA Í `computeVbd` — `0` var lesið sem „vantar"

`vbdbase-lab` fann raunverulega villu og hún **fyrir í annarri af deildum
notandans**. Einn virki:

```js
const r = repl[pos] || list.length;      // ÁÐUR
```

`replacementRanks` skilar **réttilega** `K: 0, DST: 0` fyrir deild sem hefur
engin spyrnu- eða varnarsæti — en `||` les `0` sem **fjarverandi** og fellur í
laugar-gólfið, svo varamanns-gildið verður **versti maður á stöðunni** og hver
spyrnumaður mælist risastór.

**Þetta er reglan „NULL ER EKKI NÚLL" Á HVOLFI.** Þar er hættan að tómt gildi
lesist sem 0; hér var hættan að **0 lesist sem tómt**. Sama villa: gildi og
fjarvera lögð að jöfnu.

Mælt á **Sófahetjum** (12 lið, half-PPR, hvorki K né DEF — nákvæmlega það sem
`startersFromRoster` gefur úr `roster_positions` þeirrar deildar), og
endurgert sjálfstætt áður en það var lagfært:

| | áður | eftir |
|---|---|---|
| besti spyrnumaður | **VBD 110,0, sæti 5** á borðinu — fyrir ofan Ja'Marr Chase | ekkert VBD |
| K/DST í topp 20 | **13** | **0** |
| K/DST í topp 50 | **29** | **0** |
| raunverulegir leikmenn með annað þrep | **16 af 555** | — |

> **ÞESSAR FJÓRAR TÖLUR REKA — OG TVEIR HARNESS GEFA SITTHVORT SVAR.**
> Þetta var bókað sem „30 af 558" og var **rétt þegar það var mælt**. Tölurnar
> eru reiknaðar úr `data/players.json`, sem pipelinan endurskrifar **daglega**
> (ADP og Sleeper-spár); milli 11.8. og 13.8. fór þrepa-talan í **16 af 555**
> án þess að einni línu af kóða væri breytt.
>
> Og þær eru **harness-háðar**. `vbdbase-lab.mjs` mælir sömu villu og fær
> **sæti 7**, **10** af topp 20 og **28** af topp 50 — því það kallar
> `computeVbd` á öllum 1.038 leikmönnum með spá, meðan `buildRows` gefur 631
> raðir. **Hvorugt er rangt; þau mæla sitthvora laug.** Taflan hér að ofan er
> app-leiðin (`buildRows`), því hún er sú sem notandinn hefði séð.
>
> Yfirferð 12.8. las disk-töluna og bókaða töluna sem **mótsögn**. Hún var það
> ekki — hún var **tvær ómerktar laugar**. Lærdómurinn er almennur og hann er
> nákvæmlega sama ættar og reglan um línutölur í `CLAUDE.md`: **tala úr skrá
> sem er endurskrifuð daglega er dæmi með dagsetningu, ekki fasti** — og
> **tala án harness er ósamanburðarhæf.** Þess vegna ver prófið
> **invariantið** (spyrnumaður beri `null` VBD, enginn K/DST í topp 20),
> sem rekur ekki með gögnunum.

**Hvers vegna þetta slapp:** `build.js` síar K/DST úr `aRank` gegnum
`RANKED_POS`, svo **röðin sjálf var hrein og ekkert bakpróf haggaðist**. Talan
lak aðeins í `vbd`-dálkinn og — gegnum `tierize`, sem er reiknað yfir **öll**
vbd-gildi — í birt þrep raunverulegra leikmanna.

**Staða án byrjunarsætis hefur engan varamann**, svo VBD er **óskilgreint** —
ekki 0 og ekki laugar-gólfið. `null` er rétta svarið; það raðast sjálfkrafa
síðast og birtist sem „—". Vörður: `model.mjs`, prófað í **báðar áttir** (deild
án K/DEF gefur null, deild **með** þeim gefur tölu) — því „K fær ekkert VBD"
eitt væri satt um app sem gefur K aldrei neitt, og þá væri 10-liða deildin hans
brotin án að nokkuð segði frá. Þrjár stökkbreytingar felldar.

> **TVENNT ANNAÐ FANNST OG VAR EKKI BREYTT**, því hvort um sig hreyfir **hvert
> varamanns-þrep** og þar með allar mælingar sem `shapes_sleeper.json` og
> `half.json` bera:
> - `replacementRanks` úthlutar flex-sætum með `Math.round` **per stöðu**, svo
>   úthlutuðu sætin summast ekki: 10-liða 2FLEX fær **21 sæti fyrir 20**
>   (RB 7 + WR 10 + TE 4), 14-liða 2FLEX fær **27 fyrir 28**.
> - `league.flexPos` er **hunsað**: `FLEX_SPLIT` er harðkóðað RB/WR/TE, svo
>   `REC_FLEX`-deild myndi samt ýta RB dýpra. Hvorugt er lifandi í deildum
>   notandans (báðar nota RB/WR/TE-flex).

### 4c. Bootstrap KLASAÐUR PER LEIKMANN — aðferðin sem breytti niðurstöðu

Þetta er almennt og það á að standa: `vbdbase-lab` fékk **29 hólf** sem
standast bootstrap klasaðan **eftir tímabili** — sem er staðallinn í
`bootstrapDiff` hér — og **0 af 153** sem standast hann klasaðan **per
leikmann**.

Tímabils-klösun endursýnir **árin** en heldur leikmanna-lauginni fastri, svo hún
getur ekki séð að öll niðurstaðan hvílir á því **hvaða ~155 leikmenn** voru
draftanlegir. Um leið og leikmenn eru endursýndir leysist hvert hrif upp.

> **Mæling á draft-borðs-breytingu sem birtir aðeins tímabils-klasaða vikmörk
> er að of-fullyrða, um það sem hér mældist.** Sú lexía á við um öll þau söfn
> sem bera `bootstrapDiff`.

#### Akkerin sem gera höfnun trúverðuga

`agecurve-lab` keyrir **tvö akkeri áður en nokkuð er fullyrt**, og skriftan
**deyr fremur en að skrifa** falli annað þeirra: `w=0` (borð gegn sjálfu sér)
gefur nákvæmlega **0,0** í öllum 10 hólfum, og **orakel-borð** úr raunstigum slær
A-Ranking um **+410,7 til +738,5** (10/10, meðaltal +600,7). Duellið **getur** því
séð merki — höfnunin er niðurstaða, ekki bilað mælitæki. `verdict`-reiturinn er
**reiknaður úr tölunum**, svo hann getur ekki rekið frá sinni eigin skrá.

---

| hugmynd / vandamál | niðurstaða |
|---|---|
| **Sleeper sem auðkennisbrú** | Sleeper er **hættur** að bera `gsis_id`/`espn_id` — aðeins **162 af 989** virkum QB/RB/WR/TE. Sú leið gaf nafna-pörun á **732** leikmönnum. DynastyProcess-brúin færði það í **105** |
| **ADP beint úr Sleeper** | **999 (og 400) eru TÓMGILDI**, ekki ADP. 1.930 af 2.107 RB/WR voru nákvæmlega 999. Án síunar sluppu 3.083 leikmenn í stað 1.130 |
| **ESPN sem spáheimild** | Aðeins **56 af 1.130** bera timabils-spá og **5 af þeim voru spilltar** (Drake London 13.797 þar sem hrá-svarið segir 274,3). ESPN er **ADP- og eignarhaldsheimild**, ekki spáheimild. Skynsemishlið fellir rusl og telur það |
| **`filters=1:2:3:4:5:7` fyrir samsteypu** | Er **stöðusía**, ekki sérfræðingasía — skilar `total_experts: 1`. Engin `filters` gefur alla 93 |
| **`ecrData.experts` fyrir sérfræðingalista** | Er **tómt fylki**. Listinn er í `ecrData.filters` (kommu-strengur). Fyrsta útgáfan fékk 10 sérfræðinga í stað 94 og ekkert próf féll |
| **Regluleg segð á `"rows":[…]`** | Raðirnar bera hreiðraða hluti; fyrsta `]` er inni í þeim. Skilaði **10 röðum af 215**. Svigatalning, ekki regex |
| **Vikuleg nákvæmni FantasyPros sem draft-vog** | Röng mæling á rangri spurningu. `/nfl/accuracy/draft.php` er rétta síðan (215 raðir) |
| **Þrep þvert á stöður í skortstöðunni** | Byrjaði QB-listann í „þrepi 7" og TE í „þrepi 6" — svarar engri spurningu sem draftari spyr. `posTier` er reiknað per stöðu |
| **Stöðuþak aðeins á okkar lið í hermuninni** | Samsteypan draftaði **þrjá leikstjórnendur** og lenti í 124. sæti af 208 — tapaði fyrir handahófi. Allir drafta nú eftir sömu reglum |
| **Eitt stokkað borð sem núll-viðmið** | Úrtak af stærð 1 hefur sína eigin heppni og mældist **hærra en samsteypan**. 50 fræköst gefa dreifingu |
| **`AbortSignal` á deildu skyndiminni** | React StrictMode tvímountar → fyrsta `abort` eitrar loforðið → appið hékk á „Loading…" **að eilífu**. Fannst með því að **keyra appið og horfa á það**, ekki í jsdom-prófinu |
| **Íslenskar `status.json`-nótur (FPL-undanþágan)** | Þær **rata beint í viðmótið** hér (Sources birtir `note` orðrétt). Undanþágan í FPL var til af kostnaðarástæðum, ekki af því hún væri rétt |

---

## 5. „Hverjum er hægt að treysta?" — mælingin

`src/accuracy.js` + `scripts/measure-experts.mjs` → `data/accuracy.json`.

**205 sérfræðingaborð** frá forleik 2025 eru spiluð sem raunveruleg dröft gegn
því sem gerðist. Fjórir mælikvarðar, og **þeir eru ekki sammála**:

1. Spearman rho — raðaði hann öllum rétt?
2. Topp-50 MAE — hversu langt frá sér hann þar sem draftið ræðst?
3. Hittni á stöðu — af topp-24 RB hans, hve margir enduðu þar?
4. **Draft-hermun** — 12-liða snák frá **öllum 12 sætum**, hinir drafta eftir
   samsteypunni, allir undir sömu reglum. Skorið er hvað liðið **skoraði í raun**.

**Mælikvarði 4 er sá eini sem mælir ákvörðunina.** Lærdómurinn úr FPL-verkefninu
gildir: *hærri fylgni er ekki sama og betri ákvörðun.* Borð sem er frábært á
leikmönnum 150–300 vinnur á Spearman en breytir engu um liðið þitt.

### Niðurstaðan (2025)

```
núlldreifing (handahóf innan þrepa, 50 keyrslur)  1671,5 ± 112,3   [p95 1852]
samsteypa FantasyPros (ECR)                       1735,7           yfir núlli
ADP mannfjöldans (FFC)                            1771,6           yfir núlli
besti einstaki sérfræðingur                       2055,4

sérfræðingar yfir meðaltali núlls:  116/205  (57%)
sérfræðingar yfir p95:               23/205  (11%)
```

**Mannfjöldinn slær samsteypu sérfræðinganna.** Og 43% þeirra eru undir
handahófi.

### Er þetta hæfni eða heppni?

Listi yfir 205 menn er sannfærandi hvort sem hann mælir hæfni eða heppni, og
lesandinn getur ekki greint þar á milli af tölunum. Þess vegna:

**Helminga-áreiðanleiki.** Hvert borð er metið sérstaklega gegn vikum 1–9 og
10–18. Helmingarnir fylgjast að með **rho 0,466** (**0,636** leiðrétt með
Spearman-Brown, n=205). Gæði borðs eru **samkvæmt merki innan tímabils**.

**ÞETTA VAR MÆLT 12.8.2026 — hér stóð áður að það væri ekki hægt.** Textinn
sagði að spurningin „endurtaka sömu nöfnin sig næsta ár?" krefðist annars
mælds tímabils. Það var rangt: FantasyPros birtir nákvæmni-síðuna með
`?year=` **aftur til 2015**, svo ellefu ár lágu fyrir allan tímann.
`scripts/expert-persistence.mjs` mælir þau.

**Röðunin flyst — en veikt.** rho(N→N+1) = **0,370** og **ekkert af 10
pörum er neikvætt**. Til samanburðar féll dómara-spjaldamælingin í
FPL-verkefninu á 0,182 með 6 neikvæðum pörum af 14. Merkið er því
raunverulegt, en eitt ár er samt veikur valari.

### „Skorpu"-röðunin — VALIÐ ER ÚR FERLI, EKKI ÚR EINU ÁRI

`buildSharpBoard` velur **15 efstu á miðgildi percentila**, með þremur
skilyrðum sem öll voru mæld:

1. **Lágmark 4 ár.** Styttri „ferill" er eitt ár með annað nafn.
2. **Verður að hafa birt í fyrra.** Sá sem er hættur er ónothæfur hversu
   góður sem hann var — Joseph Dolan á besta miðgildi allra (1,4%) og birti
   síðast 2019. Þetta uppgötvaðist þegar bakprófið með K=1 skilaði **engu
   borði í sex árum af sjö**; það leit út eins og bilun og var svar.
3. **Að fella út versta árið var mælt og er MÆLANLEGA VERRA.** Miðgildið
   sinnir því hlutverki nú þegar. Ekki bæta því við.

Percentill en ekki hrá röð: fjöldi sérfræðinga fór úr ~60 í 215 á tímabilinu,
svo „sæti 20" er ekki sama frammistaða 2016 og 2025.

**Fallback:** finnist engin saga (fyrsta keyrsla eftir uppfærslu) er gamla
eins-árs reglan notuð — núlldreifingin og 95. hundraðshluti hennar. Hún er
verri en hún er ekki röng, og `rule`-sviðið segir hvor var notuð.

### OG BORÐIÐ ÞEIRRA SLÆR EKKI A-RANKING

`scripts/sharp-lab.mjs`, 7 tímabil, walk-forward val:

| samanburður | stig | ár | t |
|---|---|---|---|
| gegn ADP | **+51,9** | 4/7 | 1,92 |
| gegn flatri samsteypu allra | **−51,2** | 1/7 | −2,30 marktækt |
| gegn A-Ranking | **−111,3** | 3/7 | −1,41 |

Að **velja** sérfræðinga tapar fyrir því að taka þá alla — og hvort tveggja
tapar fyrir okkar eigin röð. Varnagli sem má ekki hverfa: aðeins 7–13 af 15
völdum eiga borð hvert ár (á móti ~60 í flötu samsteypunni), svo hluti
bilsins gæti verið úrtaksstærð.

### EN VIK ÞEIRRA FRÁ ADP BER MERKI — SEM SAMHENGI, EKKI RÖÐ

`scripts/disagree-lab.mjs` spurði þrengri spurningar: hvað gerist þar sem
þeir eru **samhljóða** ósammála markaðnum? Mælt er afgangur — raunstig mínus
það sem leikmenn á sömu slóðum í ADP **innan sömu stöðu** skoruðu.

| mæling | niðurstaða | ár | t |
|---|---|---|---|
| samhljóða „buy" − samhljóða „fade" | **+60,6 stig** | 5/5 | 3,98 |
| r(vik þeirra, afgangur) | 0,137 | 7/7 | 7,10 |
| **hlutfylgni ofan á OKKAR eigið vik** | **0,105** | **7/7** | **7,88** |

Merkið lifir því af stjórnun fyrir A-Ranking — það er ekki bara endurómur af
okkar eigin viki frá markaðnum.

**OG SAMT FER ÞAÐ EKKI Í RÖÐINA.** Tvær reglur voru prófaðar í
drott-hermuninni, báðar með vog valda walk-forward:

| regla | stig gegn hreinu A-Ranking | ár |
|---|---|---|
| blanda (öll röðin færð eftir miðgildi þeirra) | **−11,6** | 1/6 |
| aðeins samhljóða hóparnir færðir um P sæti | **0** (P=0 valið öll árin) | 0/6 |

**Fylgni er ekki ákvörðun** — sami lærdómur og `aron/verð` í FPL-verkefninu,
þar sem hærri þrautseigja fylgdi lakari stigum á leik. `sharpDelta` er þess
vegna **dálkur**, ekki röðun, og prófið `tests/learn.mjs` fellur ef einhver
vírar hann inn í `aRank`.

`sharpDelta` = ECR − skorpu-röð. Jákvætt: þeir sem eiga besta **ferilinn**
eru hrifnari en markaðurinn. Úrtaksstærðin (hve mörg borð eru komin) stendur
undir töflunni í Players — í ágúst eru það oft innan við helmingur.

---

## 5b. A-RANKING — hvað spáir því hverjir verða góðir?

`scripts/build-features.mjs` → `model-lab.mjs` → `strategy-lab.mjs`.
Walk-forward 2015–2025: fyrir hvert próf-ár er **eingöngu** þjálfað á árum á
undan, `lambda` valið með krossprófun **innan** þjálfunargagna, og hvert borð
spilað sem raunverulegt 12-liða snák-draft frá **öllum 12 sætum**. Skorið er
það sem liðið **skoraði í raun**.

### Niðurstaðan

| röðun | draft-stig (PPR) | vs ADP | rho | vinnur ADP |
|---|---|---|---|---|
| **A-Ranking** (Sleeper → VBD) | **1988,6** | **+234** | 0,590 | **5/5** |
| Sleeper-spá, hrá | 1913,8 | +159 | 0,693 | 4/5 |
| ADP + Sleeper ×2 | 1851,7 | +97 | 0,577 | 3/5 |
| **ADP (markaðurinn)** | 1755,0 | 0 | 0,454 | — |
| FantasyPros ECR | 1651,1 | −97 | 0,522 | 1/5 |
| öll tölfræði, engin skoðun | 1593,5 | −154 | — | — |

### Tvær fullyrðingar með ólíkan styrk

Þetta má ekki rugla saman, og fyrsta útgáfa þessa skjals gerði það.

**(1) Gegn ADP er A-Ranking marktækt betri.** +234 stig, vinnur **öll fimm
tímabilin**, bootstrap klasað per tímabil útilokar núll. Sú fullyrðing stenst.

**(2) Gegn Sleeper-röðinni sjálfri fer það eftir stigagjöf.**

`scripts/arank-lab.mjs` lætur **bæði borðin drafta í sömu deild**, á móti
sömu andstæðingum, úr sömu laug — með raunverulegum draft-hávaða (ADP hrist með
sínu eigin staðalfráviki). Sú hönnun dregur árs-áhrifin út: bæði liðin nutu góða
ársins eða liðu fyrir það slæma.

| | einvígi unnin | meðalmunur | tímabil | teknapróf |
|---|---|---|---|---|
| **standard** | **71,9%** af 3.000 | **+114** | **5/5** | **p = 0,031 ✓** |
| PPR | 57,2% af 3.000 | +60 | 3/5 | p = 0,50 ✗ |

**Í standard er munurinn marktækur.** Í PPR er hann jákvæður í hverri einustu
hermun sem var reynd, en árs-sveiflan (+169, −50, −43, +48, +176) er margfalt
stærri en munurinn.

**Hvers vegna standard og ekki PPR:** standard-stigagjöf dregur stöðurnar lengra
í sundur (hlauparar bera virðið), og það er nákvæmlega það sem varamanns-
leiðrétting er til að laga. PPR færir stöðurnar nær hver annarri og þá hefur
umreikningurinn minna að gera. Sama vélbúnaður og í stefnu-mælingunni, þar sem
Zero-RB var marktækt slæmt í standard en ekki í PPR.

**Hvað þyrfti til að skera úr um PPR:** við þessa áhrifastærð og þetta flökt
**þrettán tímabil**. Við eigum fimm — þau einu þar sem Sleeper-spáin er ekki
menguð af útkomunni.

### Leitað að betri útgáfu — og hvers vegna hún var ekki tekin upp

45 afbrigði af umreikningnum voru prófuð (fimm varamanns-þrep × skerping ×
blöndun við hrá stig). Það besta — „last starter" þrep með 25% blöndun — gaf
**+109 gegn Sleeper í stað +76**, og bootstrap þess útilokar núll.

Það var **ekki tekið upp.** Ástæðan: afbrigðið var valið með því að horfa á öll
fimm tímabilin, svo marktæknin er úrtaksval en ekki niðurstaða. Walk-forward
útgáfan — þar sem afbrigðið er valið á fyrri árum og beitt á það næsta — gaf
+46 og vann 3 af 4. Það er lakara en núverandi útgáfa og staðfestir að leitin
fann hávaða, ekki merki.

### Þrjár niðurstöður sem breyttu appinu

**1. Ekkert tölfræðilíkan slær markaðinn.** Ridge á 30 breytum, öllum
samsetningum, öllum úrfellingum — hvert einasta tapar fyrir hráu ADP, flest
marktækt. Markaðurinn er nálægt skilvirkur og það er ekki hægt að læra sig
framhjá honum með opinberri tölfræði.

**2. Sleeper-spáin er sterkasta einstaka heimildin sem til er.**
rho 0,695 gegn 0,458 hjá ADP og 0,522 hjá sérfræðingasamsteypunni.
**Og sérhver tilraun til að bæta hana gerði hana verri** — að blanda henni við
ADP kostaði 185 stig. Appið notar hana því **eina og óbreytta**; ESPN er
aðeins varaleið þegar hún þegir. Fyrsta útgáfan blandaði Sleeper og ESPN með
vog 1,0/0,8 og sú blanda var ágiskun sem þynnti sterkasta merkið.

**3. Framlag appsins er ekki betri spá heldur RÉTTA SPURNINGIN.**
Sleeper spáir stigum og raðar eftir hrástigum. Draft snýst ekki um stig heldur
um stig **umfram þann sem er enn laus á sömu stöðu**. Umreikningur í VBD bætir
+55 stigum ofan á Sleeper og lætur röðina vinna **öll fjögur árin**.

> **Takið eftir:** rho A-Ranking er **lægra** en Sleeper (0,604 á móti 0,695)
> en ákvörðunin er betri. Þetta er sama regla og í FPL-verkefninu, nú mæld
> innan þessa verkefnis: **hærri fylgni er ekki sama og betri ákvörðun.**

### Hvað ber merkið? (hver hópur einn og sér, PPR)

| inntak eitt og sér | draft-stig | rho (RB) |
|---|---|---|
| mannfjöldinn (ADP) | 1667 | 0,580 |
| sérfræðingar (ECR) | 1590 | 0,549 |
| **framleiðsla** — hvað hann gerði | 1581 | 0,452 |
| **vinnuálag** — hvað hann fékk | 1556 | 0,429 |
| **meiðslasaga og ending** | 1473 | 0,121 |
| **skilvirkni** — hve vel hann nýtti það | 1443 | 0,288 |
| **liðsstyrkur og hraði** | 1319 | 0,181 |
| aldur og draft-staða | 1285 | 0,297 |

**Beint svar við spurningunni:** markaðurinn > sérfræðingar > framleiðsla >
vinnuálag > ending > skilvirkni > **liðsstyrkur**. Styrkur liðsins er nánast
gagnslaus til að raða einstökum leikmönnum þótt hann virðist eiga að skipta
máli. Meiðslasaga mælir eitthvað raunverulegt en raðar illa ein og sér — að
vita hver helst heill segir ekki hver er góður.

Úrfellingar sýna svo að **ending og skilvirkni SKEMMA** samsetta líkanið
(að taka þær út bætir það um 27 og 41 stig). Þær eru hávaði, ekki upplýsingar,
og eru því ekki í neinni röðun sem appið birtir.

### Í hvaða röð á að drafta? (12 lið, 11 tímabil)

| stefna | PPR | standard |
|---|---|---|
| WR þá RB | **+24** | −18 |
| RB-RB | +8 | −20 |
| QB ekki fyrr en í 9. umferð | +3 | −13 |
| besti lausi maður (viðmið) | 0 | 0 |
| Zero-RB (enginn RB í 1.–4.) | −28 | **−57 \*** |
| WR-WR-WR | −40 | **−63 \*** |
| **QB í 2. umferð** | **−43 \*** | **−17 \*** |
| **QB í 1. umferð** | **−77 \*** | **−66 \*** |

`*` = 95% bootstrap-vikmörk (klösuð per tímabil) útiloka núll.

**Það sem er marktækt:**
- **Leikstjórnandi snemma er versta einstaka ákvörðunin**, í báðum stigagjöfum,
  í öllum 12 sætum. QB í 1. umferð vann aðeins 1 af 11 árum í PPR og **0 af 11**
  í standard.
- **Í standard eru Zero-RB og mótttakara-þungar byrjanir marktækt verri.**
  Í PPR eru þær það ekki — PPR-reglan gerir móttakara raunverulega samkeppnisfæra.

**Það sem er EKKI marktækt:** allt annað. Munurinn á RB-fyrst og WR-fyrst er
innan vikmarka í PPR, og fyrstu-umferðar taflan (`Model lab` → `Draft order`)
sýnir bil upp á 10–30 stig af ~1800 milli RB og WR eftir sæti. **Taktu QB-
niðurstöðuna sem reglu og RB/WR-röðina sem hneigð.**

Í stuttu máli fyrir 12-liða deild:

| | PPR | standard |
|---|---|---|
| 1.–2. umferð | RB eða WR — jafngilt | **RB** |
| leikstjórnandi | **bíddu**, 9. umferð eða síðar | **bíddu** |
| þéttendi | ekki snemma nema hann sé sér á báti | ekki snemma |
| Zero-RB | leyfilegt, kostar lítið | **ekki gera það** |

### Lekavarnir sem eru raunverulega prófaðar

Þessi kafli stæði og félli með einni villu: ef eitthvað „spá"-svið bæri
upplýsingar úr tímabilinu sjálfu væri allt hér rangt og trúverðugt.

- **ADP-glugginn** er staðfestur fyrir hvert ár (`adpWindows` í
  `features.json`); allir enda 25. ágúst – 8. september, fyrir fyrsta leik.
- **ECR-skrapanir** eru harðsíaðar við 3. september. Fyrsta útgáfan leyfði
  fram til 8. og valdi þá 2023-borð frá **degi eftir að tímabilið hófst**.
- **Sleeper-spár** eru prófaðar formlega: fylgni þeirra við *leiki spilaða* er
  0,09–0,21 — sú sama og hjá ADP. Uppfærð tala myndi gefa ~0,7. Sönnunin sem
  útilokar það endanlega: **Christian McCaffrey 2024, ADP 1,4, Sleeper spáði
  277,9, hann spilaði 4 leiki og skoraði 47,8.**
- **Leikmenn sem voru draftaðir en spiluðu aldrei fá 0, ekki `null`.** Að
  sleppa þeim væri lifunar-skekkja sem gerði hverja einustu aðferð betri en
  hún er.

Vörður: `tests/nfl-pipeline.mjs` kaflar 5b–5c fella byggingu ef ADP-gluggi
nær inn í tímabil, ef Sleeper-fylgni við leiki fer yfir 0,45, eða ef A-Ranking
hættir að slá bæði ADP og Sleeper.

---

## 5c. Markaðurinn — veðbankalínur sem inntak

`scripts/sources/espnodds.mjs` → `data/market.json`.

ESPN birtir **DraftKings-línur fyrir hvern leik**, framtíðarmarkaði fyrir öllum
32 liðum og marka-prop per leik — **án lykils og án kvóta**. Það heldur reglunni
í kafla 2: engin heimild í NFL-hlutanum krefst lykils. FPL-verkefnið á
`ODDS_API_KEY` en hann er kvótaður og hann er ekki notaður hér.

Mælt 9.8.2026: **272 af 272 leikjum 2026 höfðu verðlagða línu.** Til
samanburðar bar nflverse-skráin 337 af 557 — markaðslagið er því sótt frá ESPN
fyrir yfirstandandi ár og nflverse notað fyrir söguna.

### Formerkið — stærsta gildran

**ESPN og nflverse nota ANDSTÆTT formerki á forgjöfinni.**

| | heimalið favorit |
|---|---|
| ESPN `spread` | **neikvætt** (−3,5) |
| nflverse `spread_line` | **jákvætt** (+3,5) |

Staðfest á öllum 16 leikjum viku 1: `NE @ SEA, spread −3,5, details "SEA −3,5"`
gegn `BAL @ IND, spread 3,5, details "BAL −3,5"`. Snúist þetta við læsi allt
vikulega líkanið öfugt — sterku liðin fengju **lágt** vænt skor — og **ekkert
brotnaði sýnilega**. Merkinu er því snúið einu sinni við inntöku, í
nflverse-hefðina sem `impliedTeamTotals` gerir ráð fyrir.

Vörður: `tests/nfl-market.mjs` kafli 1 (spegilpróf) og kafli 5, sem ber
formerkið saman við `details`-strenginn í **öllum 265 leikjum sem nefna
uppáhaldsliðið**.

### Hvað markaðurinn svarar

**Hvaða varnir eru lélegar?** Vörn liðs = **meðaltal væntra stiga andstæðinga
þess** yfir tímabilið. Það er dómur markaðarins, dreginn úr 272 leikjum, og
hann er til **strax í forleik** — ólíkt tölfræði sem þarf leiki til að verða til.

| mýkstu varnir (sækja á) | | hörðustu varnir (forðast) | |
|---|---|---|---|
| ARI | 27,0 | DEN | 20,7 |
| MIA | 26,0 | SEA | 20,7 |
| WAS | 24,8 | HOU | 20,8 |

**Hverjir skora?** Bestu sóknirnar: LAR 26,6 · DET 26,1 · BUF 26,1 stig/leik.

**Úrslitakeppnin.** Vikur 15–17 eru taldar sér, því það er þar sem deildir
vinnast. `Playoff D`-dálkurinn sýnir hvað andstæðingar liðsins eru spáðir í
þeim vikum. **Varnaglinn stendur með tölunni:** fjórir mánuðir af meiðslum og
skiptum liggja á milli drafts og viku 15, og línur fyrir þær vikur eru þær
verst upplýstu á tímabilinu. Jafnteflabrjótur, ekki ástæða til að teygja sig.

### Það sem er byggt en bíður tímabilsins

**„Anytime Touchdown Scorer"** er beinasta svarið við „hver er líklegur til að
skora". ESPN ber markaðinn — en **bókmakarar verðleggja hann ekki fyrr en
nokkrum dögum fyrir leik**. Mælt 9.8.: hver leikur listaði 24 leikmenn og
**enginn þeirra hafði verð**. Í loknum 2025-leik voru 1.697 prop með
raunverulegum verðum.

Þátturinn er því skrifaður og prófaður gegn 2025-sniðinu en skilar tómu í
forleik — og segir það berum orðum í stað þess að sýna tómt borð sem lítur út
eins og bilun. Sama gildir um vikulegu byrjunarliðs- og waiver-tólin: þau lesa
vænt stig vikunnar sem þegar eru til, en marka-líkurnar bætast við í september.

### Varnagli sem á að standa

Markaðstalan er **ekki sundurliðuð eftir stöðu**. Vörn getur verið mjúk gegn
hlaupum og hörð gegn sendingum, og þessi tala sér það ekki. Hún er til að velja
milli tveggja svipaðra leikmanna, ekki til að yfirkeyra spá. Í `model-lab.mjs`
mældist **liðsstyrkur einn og sér næstum gagnslaus** til að raða einstökum
leikmönnum (1319 stig á móti 1667 hjá markaðs-ADP), og viðmótið segir það.

### Virkar markaðurinn? 20 ára mæling

`scripts/market-lab.mjs` → `data/market_history.json`.
**71.347 leikmanna-vikur, 2006–2025.** Fyrir hverja viku er grunnlína hans eigið
meðaltal þess tímabils **án þeirrar viku**, og mælt hversu mikið hver
markaðstala skýrir af **afganginum** — því sem grunnlínan náði ekki. Stuðlar
fittaðir á fyrri árum, mælt á árinu sjálfu.

| markaðstala | QB | RB | WR | TE |
|---|---|---|---|---|
| vænt stig eigin liðs | **0,33%** | 0,29% | **0,03%** | 0,06% |
| sigurlíkur úr peningalínu | 0,18% | **0,42%** | 0,01% | **0,08%** |
| forgjöf liðsins | 0,18% | 0,41% | 0,01% | 0,07% |
| heildarlína (O/U) ein og sér | 0,14% | −0,05% | −0,01% | −0,04% |
| vænt stig **andstæðings** | 0,00% | 0,22% | −0,02% | 0,01% |

*(hlutfall ferskekkju sem talan fjarlægir, utan úrtaks)*

**Þrennt sem 20 árin skera úr um:**

**1. Móttakarar hafa ekki gagn af leikstöðunni.** Hver einasta markaðstala er
innan hávaða af núlli fyrir WR — best 0,03%. Lið sem er undir sendir meira og
bætir upp það sem leikstaðan tók. Verkfæri sem lækkar móttakara vegna lágrar
liðslínu er að selja þér eitthvað sem hefur **aldrei mælst**. Þetta staðfestir
sjálfstætt teygni-mælinguna í kafla 3 (WR e = 0,069, t = 1,4).

**2. Fyrir hlaupara er það forgjöfin, ekki heildarlínan.** Sigurlíkur (0,42%)
slá vænt stig liðsins (0,29%), og **hrein heildarlína er einskis virði**
(−0,05%). Það sem skiptir máli er hvort liðið hans verði **yfir**, ekki hvort
leikurinn verði stigahár. Vænt stig andstæðingsins bera **neikvætt** formerki
fyrir RB (r = −0,043) — sama staðreynd frá hinni hliðinni: hættulegur
andstæðingur þýðir að liðið hans er á eftir, og lið sem eltir hættir að hlaupa.

**3. Fyrir „er þetta góð vörn að mæta" slær tölfræði markaðinn — og hvorugt er
mikils virði.** Stig sem vörnin hefur raunverulega gefið þeirri stöðu það sem af
er: r = **+0,0191**. Vænt stig andstæðings: r = **−0,0146**. Markaðstalan ber
meira að segja **rangt formerki**, því hún blandar saman gæðum varnarinnar og
leikstöðunni.

**Og þetta hefur ekki breyst.** Merkið mældist 0,038 að meðaltali 2006–2015 og
0,042 árin 2016–2025 — vikmörkin útiloka ekki núll. Tuttugu ár af beittari
veðmörkuðum hafa **ekki** gert þá að sterkara fantasy-merki.

### Tvær staðreyndir sem virðast stangast á en gera það ekki

> Í `model-lab.mjs` var markaðurinn **sterkasta inntakið af öllum** (1667 stig
> á móti 1581 fyrir framleiðslu og 1319 fyrir liðsstyrk).
> Hér ber hann **innan við hálft prósent**.

Hvort tveggja er satt. Í fyrri mælingunni er spurningin *hver er þessi
leikmaður* — og draft-staða svarar því betur en nokkur tölfræði. Hér er
spurningin *hvað gerir hann á sunnudaginn, þegar við vitum þegar hver hann er* —
og leikjalínan ber aðeins samhengið, sem er lítill hluti af dreifingunni.

**Þess vegna er markaðsliðurinn í líkaninu áfram lítill** og viðmótið segir það.
Hann var ekki færður úr væntum stigum yfir í sigurlíkur fyrir RB þótt þær
mælist betri: munurinn er 0,13 prósentustig, minni en hávaðinn í mælingunni
sjálfri, og að endurbyggja líkanið fyrir hann væri flækja án ábata. Talan er
skjöluð í `model.js` svo ákvörðunin sé rekjanleg.

---

## 5d. Frá tölum að ákvörðun — hvern á að taka núna?

Allt annað í þessu skjali svarar *hver er bestur*. Draft spyr annarrar
spurningar: **hvern á að taka við þetta val**, þegar sumir lifa fram að því
næsta og aðrir ekki. `src/advice.js` + `scripts/advice-lab.mjs`.

### Uppskriftin sem gildir

1. **Raðaðu eftir A-Ranking** (Sleeper-spá → VBD fyrir þína deild).
2. **Taktu efsta mann sem staðan þín leyfir.**
3. Notaðu **lifunarlíkur** til að vita hvort þú getir beðið — ekki til að
   breyta röðinni.
4. Ekki taka leikstjórnanda snemma. Það er eina stöðureglan sem mældist.

Það er allt. Það hljómar of einfalt miðað við töluna af mælingum hér að framan
— og það er einmitt niðurstaðan: **flest af því sem hljómar snjallt mældist
gagnslaust eða skaðlegt.**

### Hugmyndin sem var prófuð og felld

Sjálfsagða viðbótin er að raða eftir **bráðanauðsyn**:

```
bráðanauðsyn(i) = VBD(i) − E[besta VBD á hans stöðu við næsta val þitt]
```

Hún tekur tillit til þess hversu bratt staðan versnar áður en röðin kemur
aftur að þér. Hver einasta draft-leiðbeining sem til er mælir með þessu.
**Það var mælt og það tapar:**

| | ráðgjöf | A-Ranking | munur |
|---|---|---|---|
| PPR | 1998,9 | 1985,3 | +13,6 — innan vikmarka |
| standard | 1501,5 | 1565,3 | **−63,8 — marktækt, vinnur 0 af 4 árum** |

**Hvers vegna hún tapar:** bráðanauðsyn mælir **staðbundinn** bratta og
verðlaunar því mann með lítið algilt virði ef hengiflug er fyrir aftan hann.
Í herminum 2024 (standard) tók hún Tyreek Hill í vali 43 fram yfir Christian
McCaffrey sem bar **VBD 82**. Þau 40+ stig fást aldrei aftur; brattinn sem hún
var að forðast jafnast út hvort sem er.

Í PPR eru stöðurnar nærri jafngildar og villan kostar lítið. Í standard, þar
sem hlauparar bera virðið, kostar hún tímabilið. **Regla sem virkar í öðru
sniðinu en ekki hinu er ekki líkan heldur tilviljun.**

Bráðanauðsyn er því **birt** í appinu — það er upplýsandi að sjá hvenær
aðferðirnar eru ósammála — en hún **ræður ekki**. Vörður: `nfl-advice.mjs`
kafli 5 smíðar stöðu þar sem þær eru ósammála og krefst þess að VBD vinni.

### Lifunarlíkur — ADP eitt og sér dugar ekki

Leikmaður með ADP 30 og staðalfrávik **3** er nánast öruggur í 10 sæta bið.
Sami ADP með staðalfráviki **20** er það alls ekki. Hvert einasta borð sem
birtir ADP sem eina tölu hendir þeim mun.

```
P(enn laus við val p) = 1 − Φ((p − 0,5 − ADP) / sd)
```

FantasyFootballCalculator birtir `stdev` beint úr raunverulegum dröftum. Vanti
hann er notað `k · √ADP`, og **k er mælt: 1,082** á 1.882 leikmanna-árum.

> Fyrsta útgáfan setti **0,55** — helming af rétta gildinu. Sú villa hefði
> látið hvern einasta leikmann líta út fyrir að vera miklu öruggari en hann er,
> og ráðgjöfin hefði sagt þér að bíða eftir mönnum sem eru löngu farnir.
> Hún sást aðeins af því að `advice-lab.mjs` fittar töluna í hverri keyrslu og
> prentar hana við hliðina á þeirri sem kóðinn notar.

### Hvað af öllum tölunum ræður raunverulega

| lag | mælt framlag | notkun |
|---|---|---|
| **A-Ranking** (Sleeper → VBD) | **+228 gegn ADP, vinnur 4/4 ár** | ræður röðinni |
| **þrep** | brýtur listann þar sem stökkin eru | hvenær má bíða |
| **lifunarlíkur** | ADP + dreifing þess | hvort má bíða |
| **stöðuregla** | QB snemma −77 (PPR) / −66 (standard) | ein regla, mælt |
| virði gegn ADP | afleitt af A-Ranking | hvar markaðurinn er ósammála |
| — | — | — |
| sérfræðinga-ECR | 1651 gegn 1748 hjá ADP | samhengi, ekki röðun |
| mótstöðu-styrkur | 0,13–0,42% | jafnteflabrjótur |
| liðsstyrkur | 1319 gegn 1667 | bakgrunnur |
| ending og skilvirkni | **skemma líkanið** | ekki í neinni röðun |
| bráðanauðsyn | −63,8 í standard | birt, ræður ekki |

---

## 5e. Hver er sögulega bestur að spá? — og hverjir eru ómælanlegir

`scripts/projector-lab.mjs` → `data/projectors_<scoring>.json`

### Töflan (sömu fimm árin, 2021–2025)

| | PPR | standard | rho | RB-hittni | ár |
|---|---|---|---|---|---|
| **A-Ranking (okkar)** | **1988,6** | **1571,8** | 0,576 | 72% | 5 |
| Sleeper — spá | 1913,8 | 1439,3 | **0,692** | 72% | 5 |
| Sleeper — ADP | 1761,8 | 1322,2 | 0,477 | 71% | 5 |
| FantasyFootballCalculator — ADP | 1755,0 | 1303,6 | 0,384 | 65% | 11 |
| FantasyPros — sérfræðingasamsteypa | 1685,7 | 1234,0 | 0,519 | 69% | 6 |

**Sérfræðingasamsteypan er neðst.** Mannfjöldinn slær hana, og ein spá (Sleeper)
slær mannfjöldann.

### Tvær heimildir sem litu best út og voru felldar

Fyrsta keyrslan setti **ESPN-ADP í fyrsta sæti með 2.094 stig** — ofar en
A-Ranking og Sleeper. Sú niðurstaða var röng og mjög trúverðug.

Lekahliðið sem greip Sleeper 2018–2020 (fylgni við leiki spilaða) **greindi hana
ekki** — mengunin er hlutaleg. Rétta prófið er annað: **spáir frávik heimildar
frá hinum mannfjöldunum útkomunni?** Hreint forleiks-borð getur það ekki.

| ár | ESPN-frávik → raunstig | MFL-frávik → raunstig |
|---|---|---|
| 2021–2024 | +0,25 til +0,35 | +0,25 til +0,38 |
| **2025** | **−0,357** | — |

Dæmin taka af allan vafa:

> **Sam LaPorta 2023 — ESPN-ADP 64, FFC-ADP 153, raunstig 239,3.** Nýliði sem
> var ekki draftaður fyrr en um val 150 og endaði sem TE1.
>
> **Puka Nacua 2023 — MFL-ADP 98** (raunverulegt forleiks-ADP 200+).

Og 2025 — eina árið sem er ekki liðið — snýr merkinu við. Bæði ESPN og
MyFantasyLeague geyma ADP sem er **uppfært eftir á**; `PERIOD=DRAFT` hjá MFL
nær yfir draft sem gerð eru allt árið. Þær eru felldar sjálfvirkt.

### Hverjir eru ómælanlegir, og hvers vegna það er sjálft svar

| heimild | staða |
|---|---|
| **ESPN-spár** | `appliedTotal` er aðeins þjónað fyrir **yfirstandandi** ár — 0 fyrir 2021/2023 |
| **NFL.com** | `researchinfo` skilar 503; enginn opinn sögulegur endapunktur fannst |
| **RotoWire · PFF · 4for4 · Establish the Run** | greiðsluveggur |
| **Sérfræðingar á X** | engin varanleg skrá af forleiks-borðum |
| **FantasyPros einstaklingar** | borð ná aftur til 2025 eins |

Þeir eru **ekki útilokaðir af því þeir séu slæmir** — við getum ekki vitað það.
Tól sem segðist vita hver þeirra er bestur væri að ljúga. Að vita *hverja er
ekki hægt að mæla* er hluti af svarinu.

### A-Ranking gegn bestu aðfenginni heimild

| | munur | ár unnin | bootstrap |
|---|---|---|---|
| PPR | +74,8 | 4/5 | [+4,0, +153,9] **marktækt** |
| standard | +132,5 | 5/5 | [+49,1, +215,9] **marktækt** |

**Varnagli sem verður að fylgja:** þetta er *aðskilinna-drafta* hönnunin. Í
**beinu einvígi** — bæði borðin í sömu deild — er PPR **3/5 og p = 0,50**, ekki
marktækt. Standard er marktækt í báðum hönnunum (5/5, p = 0,031).

**Rétta lesningin: í standard er munurinn staðfestur. Í PPR fer það eftir því
hvernig spurt er, og það þýðir að hann er ekki staðfestur.**

---

## 5f. Gögn sem voru prófuð og bættu engu

`scripts/feature-probe.mjs`. Rétta prófið á nýrri breytu er ekki „spáir hún
útkomunni" heldur **„spáir hún því sem Sleeper missir af"** — fylgni við
*skekkju* Sleeper.

| hugmynd | r við skekkju | RB | niðurstaða |
|---|---|---|---|
| **Forleikur** — stig | −0,013 | +0,041 | **ekkert** |
| **Forleikur** — tækifæri | +0,032 | −0,036 | **ekkert** |
| **Forleikur** — leikir spilaðir | −0,008 | −0,019 | **ekkert** |
| Fyrstu 4 leikir í fyrra | **−0,134** | −0,224 | neikvætt: heitur endir á byrjun spáir falli |
| Endaði sterkar en byrjaði | +0,061 | **+0,193** | raunverulegt merki fyrir hlaupara |
| Endaði með meira tækifæri | +0,084 | +0,162 | sama |
| Vikur á meiðslaskrá | −0,103 | −0,088 | raunverulegt en hóflegt |

**Forleikurinn ber ekkert.** Ég sótti 33 forleiks-leiki á ár frá ESPN (fullar
leikskýrslur per leikmann, 3.471 raðir) og fylgnin við skekkju Sleeper er
núll á öllum þremur mælikvörðum. Byrjunarlið spilar eina sókn; það sem eftir er
mælir varamenn.

Samsett gáfu nýju breyturnar **R² = −7,1% utan úrtaks** — þær gera spána verri.
Einstakar fylgni upp á 0,13–0,19 eru raunverulegar en alhæfast ekki.

---

## 5g. Leitin að fleiri hreinum tímabilum

Marktækni í PPR strandar á einu: **fimm tímabil.** Þessi kafli er skráin yfir
hvert var leitað og hvað fékkst — því neikvæð niðurstaða sem er ekki skráð
verður leitað að aftur.

### Það sem fékkst

**FantasyPros-samsteypan fór úr 6 tímabilum í 10** (2016–2025).
DynastyProcess-safnið nær aftur til 2020; `partners.fantasypros.com` nær aftur
til 2016. `last_updated` þar er 7.–11. september — á eða rétt eftir fyrsta leik
— svo tímastimpillinn einn dugar **ekki** sem sönnun. Hvert ár var því
lekaprófað: spáir frávik ECR frá ADP mannfjöldans útkomunni?

| ár | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 |
|---|---|---|---|---|---|---|---|
| r | −0,044 | +0,120 | +0,092 | +0,079 | +0,108 | −0,005 | +0,052 |

Öll undir 0,15. Til samanburðar mældist ESPN-ADP +0,25 til +0,35 og
MyFantasyLeague +0,25 til +0,38 — báðar felldar.

### Það sem fékkst ekki

**Internet Archive — FantasyPros stiga-spár.** Hugmyndin var rétt í grunninn:
snapshot frá 26. ágúst 2015 **getur ekki** borið upplýsingar úr tímabilinu 2015.
Tímastimpillinn er sönnun, ekki mæling. En síðurnar eru einfaldlega ekki
varðveittar í forleiks-glugganum nema stöku sinnum:

| ár | QB | RB | WR | TE |
|---|---|---|---|---|
| 2015 | ✓ 26.8. | ✓ 26.8. | ✓ 27.8. | ✓ 27.8. |
| 2018 | ✓ 24.8. | — | — | — |
| 2021 | ✓ 24.8. | — | — | — |
| 2022 | ✓ 30.8. | maí | — | — |
| önnur | ekkert eða eftir 1. sept. | | | |

Aðeins **2015** er heilt. Það dugar ekki til að lengja neitt.

> **Villa í minni eigin skriftu sem prófið greip:** Wayback skilar *næsta*
> snapshot við umbeðinn tíma, ekki snapshot innan ársins. Beiðni um `20170825`
> skilaði **20160406** — apríl-mynd frá 2016 — og fyrsta útgáfan skrifaði hana
> sem „2017-spá". Bæði 2016 og 2017 fengu **sömu myndina**. Það er ekki mengun
> heldur **röng ársmerking**, sem er verri: talan er rétt fyrir annað ár.
> Nú eru þrjú skilyrði: rétt ár, ekki eftir 1. sept., og **ekki fyrir 1. júlí**
> (aprílmynd er hrein en úrelt — tekin fyrir sumarið).

### Niðurstaða um marktækni

**A-Ranking hvílir áfram á fimm tímabilum og það er þak, ekki leti.**
Stiga-spár frá því fyrir 2021 eru ekki til opinberlega í ómenguðu formi. Leitað
var í Sleeper (2018–2020 mengað), ESPN (spár aðeins yfirstandandi ár, ADP
mengað), MyFantasyLeague (mengað), Internet Archive (ekki varðveitt) og
FantasyPros-API (raðanir, ekki stig).

### En tíu tímabil svöruðu annarri spurningu

Með ECR yfir 10 tímabil er loks nóg afl til að bera **sérfræðinga saman við
mannfjöldann**:

| | meðaltal | ár unnin | bootstrap |
|---|---|---|---|
| PPR | −42,6 | 5/10 | [−107, +14] |
| **standard** | **−42,5** | **2/10** | **[−82, −1] marktækt** |

**Sérfræðingasamsteypan er marktækt verri en ADP mannfjöldans í standard**, og
ekki betri í PPR. Það sást ekki með fimm tímabilum.

### Spá-fyrirtækin sem FantasyPros safnar saman

Lesið beint af varðveittu síðunum (`projector_sites.json`):
CBS Sports · ESPN · numberFire · FFToday · STATS · NFL.com · Pro Football Focus ·
Sports Illustrated.

Ekkert þeirra birtir sögulegar spár á opnum endapunkti. Þau eru **nefnd hér því
það er skráin yfir hverjir spá — ekki mat á þeim**, sem væri ekki hægt að gera.

---

## 5h. Leitin að betri röðun — 9.8.2026, allt fellt

Þegar FFToday tvöfaldaði söguna í 11 tímabil var hægt að spyrja aftur:
**bætir eitthvað sem við eigum gögn um A-Ranking?** Sjö fjölskyldur voru mældar
í `board-lab.mjs` og `dynamic-lab.mjs`, hver með sjö vogtölum, yfir
**tvær stigagjafir × tvær óháðar spáheimildir**.

| hugmynd | hvað hún gerir | niðurstaða |
|---|---|---|
| **ADP-blöndun** | vitund fjöldans lögð við VBD | walk-forward neikvætt í öllum fjórum frumum |
| **ECR-blöndun** | samsteypa sérfræðinga lögð við | sama |
| **Ending** (`prevG`) | leikir í fyrra sem z-skor | sama |
| **Aldur** | ferilkúrfan sem z-skor | **best í hráu leitinni í HVERT einasta sinn — og féll í walk-forward í hvert einasta sinn** |
| **Sókn liðsins** | `prevTeamPfG` | neikvætt við w ≥ 0,3 |
| **Tiltækileiki sem margfaldari** | `proj × (prevG/17)^w` fyrir VBD | flatt, öll \|t\| < 0,3 |
| **Skreppa spá að markaðnum** | spáin dregin að því sem ADP-sæti gefur | flatt, öll \|t\| < 0,75 |
| **Kvikt VBD (`remaining`)** | varamannsþrep endurreiknað úr þeim sem eru eftir | **−89, −31, −97, +12** — nálægt marktækt VERRA |
| **Kvikt VBD (`nextpick`)** | þrep = sá sem verður bestur við næsta val | −33, −41, −40, +45 |

**Walk-forward er talan sem gildir:** −34,1 · −12,0 · −15,5 · −4,5 stig.
42 afbrigði voru prófuð; við svo marga samanburði er besta útkoman væntanlega
jákvæð af tilviljun einni, og Bonferroni-leiðrétt mörk fella hana alltaf.

**ÞRJÁR REGLUR SEM ÞETTA STAÐFESTI:**

1. **Núlltilgátan verður að vera hlutlaus.** Borð gegn sjálfu sér gefur
   nákvæmlega 0 í öllum átta keyrslum. Gerði það það ekki væri hermunin
   ósamhverf og hver einasta tala hér merkingarlaus. Það er fyrsta prófið.
2. **Hrá leit finnur hávaða.** Aldur vann leitina fjórum sinnum af fjórum og
   féll fjórum sinnum af fjórum.
3. **Staðbundinn skortur tapar fyrir algildu virði — í ÞRIÐJA sinn.**
   Bráðanauðsyn í ráðgjöfinni tapaði (−60 í standard), kvikt VBD tapar, og
   skorts-blöndurnar tapa. Þrjár óháðar mælingar á sama undirliggjandi mistökum:
   *„staðan er að klárast" verðlaunar mann með lítið algilt virði.*

Verðir: `tests/learn.mjs` les niðurstöðurnar af diski og fellur ef einhver
þeirra snýst við án nýrrar mælingar.

**Og ein hugmynd í viðbót sem var mæld og felld:** að **blanda spánum tveimur**
(Sleeper + FFToday). Innan stöðu og innan árs, z-stöðluð, er vogin **einræn
niður á við** — r fer úr 0,599 (bara Sleeper) í 0,501 (bara FFToday) og hver
skref þar á milli er verra en Sleeper einn. FFToday bætir engu ofan á Sleeper.
**Gildi hennar er endurtekningin, ekki samlagningin.**

---

## 5i. Forsendan sem allt hvíldi á — og var aldrei prófuð

`startersPoints` leggur saman **tímabils-summu** og velur byrjunarliðið gráðuglega
úr henni. Raunveruleg fantasy er 17 aðskildar vikulegar ákvarðanir, þar sem auð
vika kostar, meiðsli í viku 6 eyðileggja seinni helminginn, og **dýpt** hefur
gildi sem summan sér alls ekki. Væri röðun sem vinnur á tímabils-summu ekki sú
sama og vinnur vikulega, þá væru **allar** aðrar mælingar í þessu verkefni að
svara rangri spurningu.

`weekly-lab.mjs` keyrir **sama draftið** og telur stigin báðar leiðir, á
raunverulegum vikugögnum 2019–2025.

| | tímabils-summa | vikulega | fylgni |
|---|---|---|---|
| PPR · Sleeper | +34,9 (2/5) | +62,3 (4/5) | **0,906** |
| PPR · FFToday | +47,3 (4/7) | +49,3 (4/7) | **0,987** |
| standard · Sleeper | +119,8 (5/5) | +94,1 (5/5) | **0,911** |
| standard · FFToday | −22,6 (3/7) | −43,2 (3/7) | **0,889** |

**Sömu sögu í öllum fjórum, sama formerki hvert einasta ár.** Tímabils-summan er
nothæf nálgun og grunnurinn stendur. Vert að nefna: vikulega talningin er
lítillega **hagstæðari** A-Ranking í þremur af fjórum — dýpt telur örlítið, en
langt innan þess að breyta niðurstöðu.

Vörður: `tests/accuracy.mjs` fellur ef fylgnin fer undir 0,7 eða formerkin
skilja.

---

## 5j. Sterkasta merkið í leifinni — og af hverju það dugði ekki

`feature-probe` prófaði 14 breytur gegn **leif** spár Sleeper. Allt undir
\|r\| = 0,14, og `jointLift` var **−0,071**: að setja þær allar inn gerir spána
**verri** út fyrir úrtak.

Einn reitur stóð eftir: **„fyrstu 4 leikir síðasta tímabils" gegn leifinni,
r = −0,224 hjá hlaupurum.** Formerkið er það sem gerir hann áhugaverðan, ekki
stærðin — sá sem byrjaði heitt í fyrra stendur **undir** spánni sinni í ár. Það
er afturhvarf til meðaltals sem spáin hefur ekki melt, sama ætt og
„form er afturhvarf" í FPL-verkefninu.

`first4-lab.mjs` prófaði tilgátuna á **rekstrarmælikvarðanum**, ekki fylgninni:

| heimild | besta afbrigði | þyngsta vog |
|---|---|---|
| FFToday, 6 tímabil | +30,9 stig, **t = 0,70** | w=0,15 → **−144,6** (t=−2,12) |
| Sleeper, 5 tímabil | +0,2 stig, t = 0,01 | **hver einasta vog tapar, 0/5 ár, t ≈ −3,2** |

**Merkið er ekki bara gagnslaust heldur skaðlegt þegar því er beitt.**

Lærdómurinn er almennur og hann er dýrmætari en niðurstaðan sjálf:
**fylgni í töflu er tilgáta, ekki niðurstaða.** Reiturinn var einn af 56
(14 breytur × 4 stöður); sterkasti reiturinn í svo stórri töflu er væntanlega
sterkur af tilviljun. Það sem sker úr er hvort hann lifi af að vera breytt í
ákvörðun — og hann gerði það ekki.

---

## 5k. Gildir þetta í ÞINNI deild? — og villan sem það afhjúpaði

Allt annað í verkefninu var mælt í **einni** deild: 12 lið, einn leikstjórnandi.
Hún var valin því hún er algengust — en appið leyfir 8–16 lið og superflex, og
**varamannsþrepið ER deildarstærð**. `shape-lab.mjs` keyrði 16 lagnir.

**Villan sem fannst:** `replacementRanks` dreifði FLEX-sætum eftir mældu
hlutfalli en **hunsaði SUPERFLEX alveg**. Í superflex-deild var QB-þrepið
reiknað sem QB12 — nákvæmlega sama tala og í venjulegri deild — þótt nærri
tvöfalt fleiri leikstjórnendur byrji. Leikstjórnendur voru því **stórlega
vanmetnir** í einu af þeim sniðum sem appið býður upp á, og enginn dálkur sýndi það.

**Mælt, ekki giskað** (`superflex-lab.mjs`, sama aðferð og `FLEX_SPLIT`):
124 vikur 2019–2025, 1.488 superflex-sæti fyllt, talið hvaða stöðu sá hefur sem
endar í sætinu.

| staða | hlutfall |
|---|---|
| **QB** | **86,0%** |
| RB | 5,7% |
| WR | 4,7% |
| TE | 3,6% |

Í 12-liða deild færir það QB-þrepið **úr 12 í 22**. Að giska á „QB næstum alltaf"
hefði verið nærri lagi — en ómæld tala sem situr við hliðina á mældum tölum og
lítur eins út er versta útkoman.

### Niðurstaðan yfir lagnir

- **Gegn ADP: jákvætt í 12 af 12 gildum lögnum** (+169 til +322 stig).
- **Gegn hrárri spá-röð: 14 af 16.**

### Og hvað hún hvílir á

Sama tafla á FFToday: **4 af 16**. Skýringin er mæld á nákvæmlega sömu 839 röðum:

| | vs raunstig |
|---|---|
| Sleeper | **0,696** |
| FFToday | 0,628 |
| ADP | 0,452 |

Per stöðu er FFToday **varla betri en ADP** (RB 0,596/0,589 · WR 0,565/0,556 ·
TE 0,451/**0,453** — þar verri). Það er einfaldlega **ekkert umfram markaðinn til
að umreikna.** VBD bregst ekki; inntakið ber ekkert.

> **Fullyrðingin sem stenst er því nákvæmari en „A-Ranking slær ADP":**
> *spá Sleeper, umreiknuð í virði yfir varamanni, slær ADP.* Umreikningurinn
> endurtekst á báðum heimildum (14/16 og 10/16); **forskotið á markaðinn gerir það
> ekki, og það er af því að FFToday-spáin ber ekkert umfram markaðinn.**
> Appið notar Sleeper.

### Fjórar lagnir bera **enga** ADP-tölu, viljandi

Sögulegt ADP sem við eigum er úr **eins-QB** deildum. Í superflex- og 2QB-lögnum
draftar völlurinn því eftir röngu borði og skilur eftir leikstjórnendur sem
raunverulegt superflex-herbergi hefði tekið strax. Borð sem metur QB rétt „vinnur"
þá gegn andstæðingi sem er að spila vitlaust — og sú tala mælir **mistök
vallarins**, ekki gæði borðsins. 2QB-ADP er til fyrir yfirstandandi tímabil
(`ffc_2qb_12`, 219 leikmenn úr 2.912 dröftum) en ekki sögulega, svo þetta er
takmörkun sem er skráð, ekki löguð.

---

## 5l. Auðar vikur — fyrsta spurningin sem tímabils-summan gat ekki svarað

Hvert einasta draft-ráðgjafarrit segir *„ekki safna mönnum sem eru í fríi sömu
viku"*, og hér hafði það **aldrei verið mælt**. Ástæðan er tæknileg og hún
skiptir öllu: `startersPoints` leggur saman **tímabils-summu**, og í þeirri
talningu er auð vika **ósýnileg** — þrír hlauparar með bye í viku 7 skila
nákvæmlega sömu árssummu og þrír með bye í viku 5, 9 og 11. Borðið gat hvorki
verið verðlaunað né refsað, svo spurningin var **ósvaranleg með því tóli**.

Vikulega talningin (byggð í 5i til að *staðfesta* að summan sé nothæf nálgun) er
hér notuð til hins gagnstæða: að mæla það eina sem hún getur ekki séð.

`bye-lab.mjs` draftar tvö borð í sömu deild — hreint VBD á móti VBD með frádrátt
fyrir hvern mann sem deilir auðri viku með þeim sem liðið á þegar í sömu stöðu —
og dæmir á **raunverulegum vikulegum stigum**. Bye-vikur eru leiddar úr
vikugögnunum sjálfum (sú vika sem liðið kemur hvergi fyrir í).

| vog | FFToday, 7 tímabil | Sleeper, 5 tímabil |
|---|---|---|
| w=2 | +5,7 | +35,4 |
| w=5 | +24,8 | +15,5 |
| w=10 | +20,8 | +28,3 |
| w=20 | **+28,2** | +30,7 |
| w=40 | +25,2 | **+37,6** |
| besta `t` | 1,29 | 1,80 |

**Tíu af tíu vogum jákvæðar, á tveimur óháðum spáheimildum** — en 8 af 12 árum
og hvorugt stenst leiðrétt mörk. Merkið er því **sterkara en núll og veikara en
mæling**.

> **Niðurstaðan: það SÉST og það RÆÐUR ENGU.** Nákvæmlega sama ákvörðun og
> Evrópuálagið í FPL-verkefninu, sem er sýnt sem samhengi en fer hvergi inn í
> `fixDifficulty`, `expPointsFor` né `rankScore`. Að setja ómælda tölu í röðunina
> væri að láta hana færa menn til; að þegja um hana væri að fela það eina sem
> árslöng röðun getur ekki séð fyrir þig.

Verðir: `advice.mjs` krefst þess að röðunin sé **óhögguð** af auðum vikum (sami
hópur án bye-gagna verður að gefa nákvæmlega sömu röð), og `learn.mjs` fellur ef
einhver vog verður neikvæð (þá á að hætta að sýna hana) eða ef einhver verður
marktæk (þá má endurskoða hvort hún eigi að ráða).

---

## 5m. Áhætta við valið — ráðið sem öll draft-rit gefa, og það mælist ekki

*„Taktu örugga manninn snemma og sveiflukenndan seint."* Það er gefið alls
staðar og hafði aldrei verið mælt hér. `risk-lab.mjs` prófaði **þrjú áhættumöt
sem eru öll til á draft-degi** — `adpSd` (hve mikið markaðurinn er ósammála),
`ecrSd` (hve mikið sérfræðingar eru ósammála) og sveiflustuðul vikustiga í fyrra
— í **fjórum háttum**: forðast alls staðar, sækjast eftir alls staðar, forðast í
umferðum 1–4, sækjast eftir frá umferð 9. Umferðarháðu hættirnir kröfðust þess að
borðið vissi hvaða umferð væri í gangi.

**0 af 24 standast, á báðum heimildum.** Og þau sem *ná* marktækni eru öll
neikvæð:

| afbrigði | tímabils-summa | vikulega |
|---|---|---|
| `ecrSd` sækjast eftir, w=15 | **−77,2** (t=−3,7) | **−130,0** (t=−5,1) |
| `ecrSd` seint, w=15 | −44,3 (t=−2,8) | −80,2 (t=−4,4) |
| `prevVol` forðast, w=15 | −100,2 (t=−2,2) | −123,1 (t=−2,6) |

Að sækjast eftir ósamkomulagi sérfræðinga kostar á milli 77 og 130 stig á
tímabili. Klassíska ráðið sjálft (`early`/`late`) mælist hvorki upp né niður.

### Aðferðin sem gerir þetta marktækt: talið báðar leiðir

Vikulega talningin velur byrjunarlið hverrar viku **með fullkominni vitneskju um
þá viku**, og hún **verðlaunar því sveiflu**: maður sem skorar 0–0–40 kemst í
byrjunarlið nákvæmlega þá viku sem hann skorar 40. Raunveruleg fantasy velur
fyrirfram og fær það ekki.

Þess vegna er allt mælt **báðar leiðir** — tímabils-summan er hlutlaus gagnvart
sveiflu innan tímabils, vikulega ofmetur hana. Niðurstaða sem stenst aðeins þá
vikulegu er **artefakt af fullkominni vitneskju**. Í FFToday-keyrslunni var
nákvæmlega ein slík; hún var flögguð sem artefakt og fór hvergi.

> Þetta er sami lærdómur og „hærri fylgni er ekki betri ákvörðun", einu lagi
> dýpra: **réttari mælikvarði getur verið rangur mælikvarði**, og eina leiðin til
> að sjá það er að mæla báða og bera saman.

---

## 6. Prófin

Söfnin eru talin upp í `SUITES` (`nfl/tests/run.mjs`) og **fjöldinn er reiknaður
úr þeim listanum**. `npm test` í `nfl/` keyrir **aðeins** þessi — FPL-keyrarinn er
aðskilinn viljandi, svo lota sem vinnur í öðru appinu geti ekki fellt hitt.

> **OG TALAN STÓÐ EKKI HELDUR HÉR.** Hér stóð „**Tíu** söfn í `SUITES`" í sömu
> setningu sem segir að fjöldinn sé ekki harðkóðaður — meðan `SUITES` bar **15**.
> Nákvæmlega sama villa og `CLAUDE.md` kafli 5 varar við, í setningunni sem varar
> við henni. Talan er í `npm test`-úttakinu og hvergi annars staðar.

| Safn | Hvað það ver |
|---|---|
| `model.mjs` | Hver birt tala. Kjarninn: **QB0 skorar fleiri stig en RB0 en hefur lægra VBD** — falli það er appið að raða eftir hrástigum |
| `accuracy.mjs` | **PRÓFSTEINNINN:** fullkomið borð verður að slá handahóf með >4 staðalvillum, og hálfgott borð verður að lenda **á milli**. Það felldi fyrstu útgáfu hermunarinnar |
| `learn.mjs` | Hryggjar-aðhvarfið: stöðlun, λ valið með krossprófun **innan** þjálfunargagna, bootstrap klasað eftir tímabili |
| `market.mjs` | Vænt mörk úr línu, leikjaflæði, vörn andstæðings |
| `advice.mjs` | Kaup-röðin. Kafli 7 ber hana við mælinguna á disknum. **Kafli 8 ver að deildin í appinu beri sömu reglur og hermunin** — sjá 6b |
| `lineup.mjs` | Uppstillingin. Endar á **bakspors-leit**: 1.500 slembin lið og 15 deildarform, grásugan verður að vera sannanlega best og enginn á bekk má skora meira en gjaldgengt byrjunarsæti |
| `names.mjs` | Raunveruleg NFL-jaðartilfelli. **Tvíræður lykill skilar ENGU** — „síðasti vinnur" er þögla ranga pörunin |
| `pipeline.mjs` | **Gögnin sjálf, ekki formúlurnar.** Nafna-pörun má ekki taka yfir; engin tómgildi; hvert birt svið hefur raunverulega dreifingu; PPR > half > std hjá hverjum móttakara |
| `render.mjs` | **Eina prófið sem sér hvítan skjá.** Opnar hvern flipa með raunverulegum `data/` og krefst **talna, ekki bara þess að ekkert hrundi**. Ver að viðmótið sé enskt — líka ASCII-íslenska, sem stafa-skynjun sér ekki |
| `audit.mjs` | **Leitar að villum, ekki staðfestingu.** Sjá 6b |
| `sleeper-league.mjs` | **Deildin lesin úr Sleeper.** Hrein vörpun, svo prófið keyrir sama kóða og appið. Fastarnir eru **raunverulegt svar** (deild 1389356308104249344) og verja tvær gildrur sem tilbúið svar hefði ekki sýnt: umferðirnar koma úr **draftinu** (15), ekki úr deildinni (`draft_rounds: 3`), og sætið kemur úr `slot_to_roster_id` þegar `draft_order` er **null**. Kafli 8 keyrir 8 ruslsvör; gilt svar verður að fara **óbreytt** í gegn. Sjá 6e |
| `wiring.mjs` | **Er hreina rökfræðin raunverulega TENGD?** Hreint fall getur verið fullkomlega prófað og **aldrei kallað** — það er markaðsliðurinn í FPL-appinu sem var dauður í viku með græn próf. AST-próf krefst þess að borðið kalli `pickSignature`, `pollDelay`, `edgeSentence`, `nextOwnPick`, `survivalProb`, `leagueFromSleeper` og `teamsFromLeague`, að pollunin sé ekki `setInterval`, og að `mean` sé ekki birt beint. **Kafli 5 prófar MÆLITÆKIÐ**: athugasemdir eru strippaðar, annars hefði `grep` fundið föllin í athugasemdunum sem NEFNA þau og verið grænt þótt kallið væri farið. Fyrirvari í hausnum: AST-próf les kóða, ekki skjáinn |
| `dashboard.mjs` | **Forsíðan.** 8 kaflar: báðar deildir með sínum reglum, forleikur er ekki röðuð staða, báðar spátölur, fjögur ólík tilfelli tóms waiver-lista, bilun er sýnileg, og **ekkert sótt fyrr en flipinn er opnaður**. Tvær villur í prófinu sjálfu eru skjalaðar þar: dálka-vísitala lesin úr **öllum** töflum og notuð á aðra, og `meta.json` sem er **fest af fyrsta lestri** því `data.js` ber sameiginlegt skyndiminni |
| `standings.mjs` | Staðan. **`fpts_decimal` er hundraðshlutar**, mælt gegn óháðri leið (summa `/matchups/`: /100 hittir 10/10 upp á sent, /10 hittir 0). 15 stökkbreytingar felldar |
| `waivers.mjs` | Frjálsir leikmenn og skipti. **`rosters: null` → `pool = null`**, ekki allir. „Ekki pikka neinn upp" er prófað sem svar. 12 stökkbreytingar felldar, ein slapp í fyrstu tilraun og var endurskorin |
| `sleeper.mjs` | Draft-kvöldið í jsdom. Kaflar 2d/2e bera innflutninginn: **VBD-tölurnar verða að breytast** þegar deildin er flutt inn, annars er innflutningurinn skraut |

**Mynstur sem á að endurtaka:** `render.mjs` krefst þess að núlldreifingin
standi **á undan** stigatöflunni í DOM. Það er ekki stílpróf heldur efnislegt:
tafla án vikmarka segir „þessi er bestur" þegar gögnin segja „þessi var heppnari".

**Gildra sem kostaði tíma:** jsdom-prófið rendrar `App` **án** StrictMode og sá
því ekki skyndiminnis-villuna sem hékk að eilífu í vafranum. AST- og jsdom-próf
lesa kóða; þau sjá ekki skjáinn.

---

## 6b. Úttektin 9.8.2026 — hvað hún fann

`tests/audit.mjs` var skrifað til að spyrja **„hvað er að?"** í stað „virkar það
sem ég ætlaði?". Það keyrir hvern flipa og hvern chip, allar níu samsetningar
liðafjölda og stigagjafar, og fellur á NaN, `undefined`, `[object Object]`,
React-viðvörunum, tölum utan marka og hruni við tómt inntak. **Sé það alltaf
grænt er það ekki að leita nógu vítt.**

Sjö villur fundust. Þrjár skiptu raunverulega máli:

| # | Villa | Afleiðing |
|---|---|---|
| 1 | **Deildin í appinu bar enga `maxPos`** | `advice-lab` staðfesti ráðgjöfina **með** stöðuþaki; `build.js` bar það ekki og `recommend()` sleppir því þegjandi. **Það sem var mælt fór ekki í loftið.** Hermdar 14 umferðir: `RB1 WR4 TE5 QB0` án þaks á móti `RB3 WR7 TE2 QB2` með því. Fyrri hópurinn er ekki lakari — hann er ónothæfur. Vörður: `advice.mjs` kafli 8 |
| 2 | **`useMemo` ekki fluttur inn í `ModelLab.jsx`** | Undirflipinn „vs Sleeper" **hrundi**. `render.mjs` sá það ekki því það smellti aldrei á hann. Vörður: kyrrstæð hook-skönnun á öllum `.jsx` |
| 3 | **Dálkurinn `sleeperRank` laug** | Nótan sagði „það sem þú sérð í Sleeper-appinu sjálfu". Talan er **okkar** röðun á spá Sleeper eftir hrástigum — röð sem setur 14 QB í topp-20 í PPR og 20 af 20 í standard. Það er einmitt borðið sem VBD er til að laga. Röðin sem Sleeper birtir er ADP. Sama fullyrðing var á tveimur stöðum í Model lab |

Fjórar minni: **K og DST komu hvergi fram í ráðgjöfinni** (þeir eru réttilega
utan A-Ranking, en að raða þeim ekki má ekki þýða að þegja um þá — nú
`mustFill`); **aðeins höfnuð skrif voru skráð** í `status.json`, svo rauð röð
gat aldrei hreinsast; **`stale`-flaggið var aldrei birt** þótt 21 af 50 röðum
væru bornar á milli þrepa; og **stöðnuð `data-nfl/`-slóð** í 15 skjölum og
útskriftarlínum eftir flutninginn.

**Tvö ný óháð akkeri komu úr úttektinni** — hvorugt var til áður:

- **Spá Sleeper borin við okkar eigin stigareglu.** Sleeper sendir bæði birta
  spá **og** magnsundurliðun. Sé `scoring.js` rétt verða þær að hittast. Mælt:
  miðgildi |frávik| **0,00** og p90 **2,0** í öllum þremur stigagjöfum, 558
  leikmenn, **enginn** yfir 15 stigum. Afgangurinn er fumbles og 2pt sem
  sundurliðunin ber ekki. Sama ætt og „Arsenal mælist með 27 mörk á sig í
  skotakortunum": tvær óskyldar leiðir að sömu tölu.
- **Grásugan borin við tæmandi bakspors-leit** á 6.000 slembnum liðum í 15
  deildarformum, þar með superflex og tvöfaldur flex: **alltaf best, engin
  bekkjarbrot.** Rökin (sætamengin eru hreiðruð eða sundurlæg) voru rétt, en
  rök eru ekki sönnun.

**Það sem var mælt og reyndist í lagi** — ekki endurmæla: neikvæð spá hjá
Duvernay (−1,4) og Davis (−0,9) er **tala Sleeper**, ekki okkar reikningur, og
mennirnir eru í sæti 511–512 af 558; 46% af ESPN-fréttatöggum parast ekki en
það eru varnarmenn og línumenn sem eiga réttilega ekkert erindi á borðið;
auðkennin okkar **eru** Sleeper-auðkenni (tölur, liðsskammstöfun fyrir DST), svo
draft-pörunin er rétt í grunninn.

---

## 6e. Deildin er LESIN, ekki slegin inn — 12.8.2026

Fram að þessu las appið **völin** úr Sleeper en **engar reglur**. Lið­afjöldi,
stigagjöf og byrjunarsæti voru slegin inn í hendi í flipastikunni — og þau eru
ekki skraut: `teams` og `scoring` ráða **báðum** hvaða ADP er lesið OG hvar
varamanns-þrepið liggur (`model.js`). Deild sem er slegin inn rangt reiknar
**aðra deild en notandinn spilar í**, og hún gerir það þögult, með tölum sem líta
nákvæmlega eins út.

Og slóðin sem notandinn **hefur** er deildarslóð (`/leagues/{id}/predraft`), ekki
draft-slóð. Gamla `extractDraftId` tók fyrsta 6+ stafa tölustrenginn og kallaði
hann draft-id, svo deildarslóð gaf `/draft/{leagueId}` og **404 fyrir slóð sem
var alveg rétt**.

Nú er ein slóð nóg. Vörpunin er í `src/sleeper-league.js` — **hrein**, svo prófin
keyra sama kóða og appið notar.

### Enga innskráningu — og það er mælt, ekki áætlað

Notandinn bauð að útvega login með passcode. Það var **óþarft og verra**:
Sleeper-endapunktarnir sem allt þetta þarf eru **opnir og með CORS-hausa**.
Mælt 12.8.2026 gegn deild `1389356308104249344`, **engin skilríki**:

| endapunktur | gefur |
|---|---|
| `/league/{id}` | `scoring_settings`, `roster_positions`, `total_rosters`, `draft_id` |
| `/draft/{id}` | `type`, `settings.rounds`, `settings.teams`, `draft_order`, `slot_to_roster_id` |
| `/league/{id}/users` · `/rosters` | liðsheiti og `owner_id` → sætavalið |

Innskráning hefði sett **raunverulegt skilríki í vafra-app í opnu repo-i** og gefið
**engin ný gögn**. Hún er ekki „óþörf í bili" heldur röng leið.

### Tvær gildrur sem AÐEINS raunverulegt svar sýndi

Báðar hefðu farið beint í loftið ef prófið hefði verið byggt á tilbúnu svari —
og báðar eru nú fastar í `tests/sleeper-league.mjs`.

| # | gildran | hvað hún hefði kostað |
|---|---|---|
| 1 | **`league.settings.draft_rounds` er 3** meðan `draft.settings.rounds` er **15** | Ráðgjöfin hefði talið þrjár umferðir eftir og **aldrei sagt þér að taka spyrnumann né vörn**. `advice.js` les `rounds` til að vita hve mörg völ eru eftir. **Draftið er heimildin um draftið**; deildin er heimildin um reglurnar |
| 2 | **`draft.draft_order` er `null`** — Sleeper dregur röðina EFTIR á | Leiðin gegnum `draft_order` gaf ekkert, og **án sætis fyllist þinn hópur aldrei**, svo „hvern á að taka næst" veit ekki hvað þú átt. Sætið kemur nú úr `slot_to_roster_id` → `rosters[].owner_id` → `users[].display_name`, svo notandinn **smellir á liðið sitt**. Að röðin sé ódregin er **upplýsing, ekki bilun**, og það er sagt |

### Stöðu-þakið var LÁTIÐ STANDA — og það var ákvörðun

Freistnin var að skala `maxPos` eftir innfluttri deild: „tvö FLEX-sæti, þá má
TE-þakið vera 4." Sú tala væri **ómæld** og hún myndi líta nákvæmlega eins út og
mælda talan við hliðina — versta útkoman í þessu repo-i. `maxPos` var mælt í
**12-liða deild með QB1/RB2/WR3/TE1/FLEX1** (`accuracy.js`).

Þakið stendur því óbreytt. Eina breytingin sem er gerð er **réttleiks-gólf**:
þakið má ekki vera lægra en fjöldi sæta sem VERÐUR að fylla (annars gæti hermunin
ekki fyllt byrjunarliðið). Það er ekki fínstilling, það er að forða ómöguleika.
Sé lögun deildarinnar ekki ein af þeim sem **voru** mældar
(`shapes_sleeper.json`) er það **sagt** í viðvörun. Vörður:
`sleeper-league.mjs` kafli 4 fellur ef einhver skalar þakið — mælt með
stökkbreytingu.

### Nálgun má aldrei lesast eins og vissa

Appið ber **þrjár** stigagjafir og ekki fleiri, því spáin og ADP eru sótt í
nákvæmlega þeim þremur afbrigðum (`pts_ppr`, `pts_half_ppr`, `pts_std`). Deild
með `rec: 0,75`, TE-premium eða 6-stiga pass-TD er því **ekki reiknanleg** — hún
er nálguð, og þá er `exactScoring: false` og viðvörunin nefnir raunverulega töluna.
Sama regla og verðspáin í FPL-appinu.

Innflutt deild fer gegnum `normalizeLeague`, svo **eitt ónýtt svið kostar bara
sig sjálft** — sama vörn og `saved-state.mjs` ber um vistað ástand, og hún á við
hér líka: svar frá ytri heimild er alveg eins óvarið og blob í vafranum.

### Þögul villa sem fannst í leiðinni

Vistunar-umgjörðin um `sync` tók **aðeins við gildi**, en `pull()` kallar
`setSync(prev => …)` þegar `draft_order` bætist við í miðjum polli. Þá var
**fallið sjálft** sent í `saveState`, `JSON.stringify` á falli skilar `undefined`,
og strengurinn `"undefined"` lenti í `localStorage` — svo **sætið tapaðist við
næstu hleðslu** þótt skjárinn hefði sýnt það rétt alla lotuna. Uppfærslu-form er
nú leyst út áður en það er vistað.

### Staðfest í raunverulegum vafra, ekki bara í jsdom

`AST-próf lesa kóða; þau sjá ekki skjáinn` — svo þetta var keyrt í **alvöru
Chrome gegn lifandi Sleeper-API**, sem er líka eina leiðin til að sjá hvort
CORS-leiðin virkar í raun. Slóðin límd inn, `Connect`:

- `Teams` fór **12 → 10**, `Scoring` PPR, 15 umferðir, `snake`
- byrjunarsæti `QB · 2RB · 2WR · TE · 2FLEX · K · DST · 5 bench`
- **VBD-tölurnar breyttust** — varamanns-þrepið fylgdi með (það er prófsteinninn;
  fullyrðing um textann einan hefði verið græn þótt deildin hefði aldrei lent í
  `league`-state)
- öll tíu liðsheitin með sætistölu; smellur á `mattitim` setti sætið í **7**
- tvær viðvaranir, báðar réttar: **keeper-deild** (`max_keepers: 1`, svo ADP á
  borðinu er redraft) og **ómæld lögun**
- ekkert `NaN`, engar console-villur, **ekkert lárétt yfirflæði** við 390 og 768 px

---

## 6f. Forsíðan og fleiri deildir — 12.8.2026

Notandinn, orðrétt: *„ég vill að forsíðan sé þannig með báðum deildunum mínum
sýni upplýsingar um standings. og start og sit advise og hvaða leikmenn (ef
einhverja á að pikka upp af weiver)"* — og síðar *„ég mun bara vilja sjá Draft
og svo dashbordið"*.

### Fleiri deildir, og ástandið fylgir hverri

Áður bar appið **eina** deild. Notandi í tveimur þurfti að slá stillingum inn
upp á nýtt við hverja svissun — og verra: hann hefði haldið áfram að nota borð
sem var reiknað úr **annarri** deild án að sjá það, því tölurnar líta eins út.

Deildarnar hans eru ekki sama deild:

| | Patriots SB champs | Sófahetjur |
|---|---|---|
| lið · stigagjöf | 10 · PPR | 12 · **half-PPR** |
| byrjunarlið | QB RB2 WR2 TE FLEX2 **K DEF** | QB RB2 WR2 TE FLEX2 (**hvorugt**) |
| umferðir | 15 | 14 |
| mælt forskot A-Ranking | **+188,0** (11/11, t=4,10) | **+147,4** (10/11, t=3,44) |

`taken`, `myPicks` og `sync` eru því **lykluð á deild** (`D.scoped`), og
`DraftBoard`/`MyTeam` eru endurræst með `key={activeId}`. Deildu tvær deildir
sama mengi væru leikmenn sem þú tókst í A strikaðir út í B og ráðgjöfin teldi
hóp sem þú eigir ekki þar.

**Gamalt ólyklað ástand flyst yfir** (`migrateScopedState`). Notandi í **miðju
drafti** þegar uppfærslan kemur hefði annars opnað appið og séð **tómt borð** —
mengið er enn í vafranum, appið væri einfaldlega hætt að leita að því. Gamli
lykillinn er **ekki** eyddur. Vörður: `sleeper.mjs` kafli 2h.

**Samnefndar deildir eru greindar á tímabili.** Fannst í vafranum: 2026- og
2025-útgáfur af „Patriots SB champs" eru báðar 10 lið og báðar PPR, svo
fliparnir voru **stafréttur eins** — og athugasemdin í `App.jsx` fullyrti að
`teams`/`scoring` gerðu þau greinanleg. Tímabilinu er bætt við **aðeins** þegar
nafnið rekst á.

### Handvirku reitirnir voru teknir út

`Teams` / `Scoring` / `Superflex` eru farnir, að beiðni notandans, því deildin
er lesin. Tveir reitir sem segja það sama eru ekki bara óþarfir heldur **hætta**:
sá sem hreyfir „Scoring" eftir innflutning reiknar deild sem Sleeper ber ekki og
ekkert á skjánum segði honum það. Í staðinn er **lestexti** (`ActiveLeague`) sem
greinir `from Sleeper` frá `default, no league connected` — talan sjálf verður að
vera sýnileg, því `teams` og `scoring` ráða hvaða ADP er lesið OG hvar
varamanns-þrepið liggur.

### Endurlestur reglna er HNAPPUR — og tvö próf sönnuðu það

Vistaðar reglur geta orðið úreltar **þögult**: Sófahetjur fóru úr 10 liðum í 12
milli tímabila, og það eitt færir varamanns-þrepið RB 27→32, WR 30→35, TE 14→17,
QB 10→12 — **75 af topp 100 hreyfast**, Lamar Jackson úr 40 í 52.

Fyrsta útgáfan endurlas reglurnar við **flipa-svissun**, með þeim rökum að
svissun sé notanda-aðgerð. Tvö próf felldu það:

- `audit.mjs` kafli 9 sá **20** Sleeper-köll þar sem enginn var leyfður
- `dashboard.mjs` kafli 1 sá **2** köll **við ræsingu**, því effectið endurkeyrir
  í hvert sinn sem `rereadRules` er endurmynduð (hún háðist af `entries` og
  `extra.shapes`, sem breytast bæði meðan appið hleðst). `firstDraftView`
  slepptu aðeins allra fyrsta kallinu.

Fyrri villan er sú mikilvæga: **flipa-svissun er weak evidence** um að
notandinn vilji að appið tali við þriðja aðila. Vörðurinn segir *„pollun sem
enginn kveikti á er bæði óvænt og dónaleg við gestgjafann"* og það gildir um
flipa-flakk alveg eins og um ræsingu. Sjálfvirknin var **ekki** beiðni notandans.

Nú er þetta **„re-read"-hnappur**. Forsíðan er annað mál: **þar eru
Sleeper-gögn allt innihaldið**, svo að opna hana ER beiðnin.

> `audit.mjs` kafli 9 var **hertur, ekki linaður**. Áður: „engin Sleeper-köll".
> Nú: „ekkert kall NEMA `/rosters` og `/users`" — svo kall frá Players, Experts,
> Market, Schedule eða Sources fellir hann áfram. Slóðirnar eru **skráðar** og
> ekki bara taldar; tala ein gæti ekki greint rétt kall frá röngu. Og forsíðan er
> raunverulega **opnuð með deild** í þeim kafla, annars væri fullyrðingin „0 af
> 0" — sönn af því að ekkert var kallað.

### Þrjár rangar fullyrðingar sem fundust með því að HORFA

Allar þrjár voru **grænar í prófunum** og allar þrjár voru fullyrðingar sem
gögnin styðja ekki.

| # | fullyrðingin | hvers vegna hún var röng |
|---|---|---|
| 1 | **„Nobody on waivers beats anyone on your roster"** | Sagt um **tóman hóp**. Í forleik eru allir 1.043 leikmenn lausir og ég á engan — setningin les eins og **yfirveguð niðurstaða** („við skoðuðum, það er ekkert") þegar sannleikurinn er „það er ekkert til að skoða enn". Talan var rétt; **ramminn** var rangur. Fjögur ólík tilfelli bera nú sinn texta hvert |
| 2 | **Tveir eins dálkar** („Sleeper" og „Ours") | Í forleik er engin vika, svo `weeklyProjection` hefur ekkert að laga og „Ours" er **nákvæmlega jöfn** „Sleeper". Tveir eins dálkar fullyrða edge sem er ekki til. Prófið féll og **appið var rangt** |
| 3 | **Aukatexti á völdu chip** | `.chip.on` er accent-blár með dökkum texta, en `.dim` setur `#98a0b0` — grátt á bláu. „10 · PPR" hvarf nánast alveg í svissaranum. **Engin talning hefði fundið þetta** |

Lagfæringin á (3) er `color: inherit; opacity: .72` og **ekki** fastur litur: þá
fylgir aukatextinn alltaf grunnlitnum og getur ekki rekið í sundur ef palettan
breytist. Vörður: `layout.mjs` kafli 1b.

### Forsíðan reiknar EKKERT sjálf

Hver tala kemur úr hreinni einingu sem er prófuð sér: `standingsFrom`,
`myRosterId`, `recordLine`, `optimalLineup`, `lineupAdvice`, `weekRows`,
`freeAgents`, `pickupAdvice`, `edgeSentence`. Væri formúla í `.jsx`-skránni
gætu prófin aðeins prófað **afrit** af henni.

**`weekview.js` var dregin út af þeirri ástæðu.** Viku-vörpunin (`proj/17` →
`weeklyProjection` með markaðslínu og vörn gegn stöðu) var inni í `MyTeam.jsx`,
og forsíðan þarf nákvæmlega sama reikning fyrir báðar deildir.

> **VILLA Í FYRSTU ÚTGÁFU ÚTDRÁTTARINS:** hún **giskaði** á
> `impliedTeamTotals(market, games)`. Rétta viðmótið er **`(total, spread)`** —
> tvær tölur per leik. Giskið hefði skilað `{home: null, away: null}` fyrir hvern
> leik, svo engin markaðslína og engin viku-aðlögun hefði keyrt og tölurnar hefðu
> verið **árstíðar-meðaltalið með útlit viku-spár**. Fannst með því að **lesa**
> `model.js`. Þetta er sama ættin og `buildTeamMetrics`-afritið í FPL-appinu.

### `standings.js` — tvær tölur sem líta rétt út

**`fpts_decimal` er HUNDRAÐSHLUTAR**, mælt gegn óháðri leið: summa `points` úr
`/matchups/{w}`, vikur 1–14 á loknu tímabili — **`/100` hittir 10 af 10 rostrum
upp á sent, `/10` hittir 0**. Að lesa aðeins `fpts` er þögul villa: `1234` er
fullkomlega trúverðug tala. Sama gildir um `fpts_against`.

**Forleikur: allt er núll og það má ekki lesast eins og mæling.** Hvert `wins`
og hvert `fpts` er 0 í báðum deildum, svo `complete: false`, `rank: null` á
öllum og `why` er birt **í stað** töflunnar. Tafla sem raðar tíu liðum 1–10
eftir engum leikjum er **tilbúningur með útlit mælingar**. `playoff_teams` er
samt birt: það er deildar-**regla**, ekki mæling.

Fjögur svið eru **viljandi ekki lesin**, og hvert af mældri ástæðu:
`waiver_position` (Sófahetjur bera **0 og −1 í sama svari**; −1 er ekki
staðsetning) · `ppts` (svarar „settir þú upp rétt", sem forsíðan spyr ekki) ·
`co_owners` (**null í öllum 32 rostrum** — lögun sem hefur aldrei verið séð) ·
`total_moves` (**0 á öllum 32, líka á loknu tímabili þar sem skipti urðu
vissulega** — sviðið mælir ekki það sem það heitir).

### `waivers.js` — „ekki pikka neinn upp" er svar

Gjaldmiðillinn er **`vbd`** (mælt: +233,6 gegn ADP, 5/5 tímabil), ekki spáð stig
— virði yfir varamanni **í þinni deild** er það sem skipti breyta.

`rosters` ólesnir → **`pool = null`, EKKI allir**. „Við vitum ekki hverjir eru
teknir" má aldrei lesast eins og „enginn er tekinn"; hitt væri listi sem býður
þér 300 leikmenn í eigu annarra.

**Stöðuþörf og bye-vika eru NEFNDAR en ráða ENGU** („noted, not ranked") — það
var mælt og fellt þrisvar: 19 stöðuplön, bráðanauðsyn sem röð (−63,8 í standard,
0/4 ár), lifunarlíkur sem jafnteflisrof (t = −0,06 / +0,79). **`minGain = 10` er
MERKT ÓMÆLD** — varfærið gólf, ekki fittuð tala — og `confident: false` segir
hvaða inntak liggur utan þess sem var mælt.

---

## 6d. Vistað ástand og Sleeper-tengingin — 10.8.2026

### Vistað ástand er alvarlegra en vantandi gögn

Úr FPL-verkefninu orðrétt: *„`data/` lagast við næstu sókn, en blobbið er í
vafranum og fer hvergi."* `loadState` bar þegar ytri gerðarvörn — en hún dugði
ekki, því fallbackið fyrir deildina er **tómur hlutur** og *hver* hlutur stenst
`typeof`-prófið. Svo var honum dreift **yfir** sjálfgefnu gildin.

`saved-state.mjs` keyrir **28 skemmd blob**, öll gilt JSON. Tvö felldu appið:

| blob | afleiðing |
|---|---|
| `nfl_league = {"teams":"abc"}` | `(st[pos]\|\|0) * "abc"` → **hver einasta VBD-tala NaN**, við hverja hleðslu, að eilífu |
| `nfl_view = "ekki-flipi"` | hver `view === k` grein ósönn → **auður skjár**, varanlega |

Lausnin er **ekki** að henda vistuðu ástandi — það væri að henda deildar-
stillingu notandans í hvert sinn sem eitt svið er skakkt. `normalizeLeague`
þvingar **hvern reit fyrir sig**, svo einn ónýtur kostar bara sig sjálfan, og
flipaheiti er borið við `TABS`. Prófið krefst líka þess að **gilt ástand fari
óbreytt í gegn** — annars væri „lagfæringin" að eyða plönun notandans.

### Sleeper-tengingin hafði aldrei séð rétt löguð svör

Úttektin hermdi aðeins **bilun** (HTTP 500). Hún sagði ekkert um það sem
raunverulega gerist: að Sleeper svari rétt. `sleeper.mjs` keyrir sjö
atburðarásir draft-kvöldsins gegn svörum í réttu sniði — draft óbyrjað, í gangi,
búið, val á leikmanni utan borðsins, **vörn þar sem `player_id` er liðsskammstöfun
en ekki tala**, draft án stillinga, og svið sem vantar — auk þriggja bilana
(404, net dettur út, svarið er ekki JSON).

**Og hún prófar að tengingin geri sitt verk, ekki bara að ekkert hrynji:** eftir
samstillingu eru 20 leikmenn strikaðir út, **tveir réttir** lenda í mínum hóp
(sæti 7 af 12), og sá sem var tekinn er ekki lengur boðinn. Stökkbreyting sem
hunsaði sætið felldi það með tölunni 0.

### Flöktandi próf er verra en ekkert

`visual.mjs` féll í 2 af 3 heildarkeyrslum með *„appið hleðst ekki"* — en stóðst
alltaf eitt og sér. Mælirinn sagði `0 flipar` í 30 sekúndur og næsta kall fann þá
umsvifalaust. **Það var ekki hleðsluvandamál heldur CDP-hengi:** `Runtime.evaluate`
var bundið við keyrsluhengi sem flakkið hafði eytt. Nú er beðið eftir
`Page.loadEventFired` frá vafranum áður en nokkuð er spurt. **Röng greining í
prófi er verri en fall — hún sendir mann af stað að leita að villu sem er ekki til.**

---

## 6c. Útlitið — mælt í alvöru vafra

`layout.mjs` keyrir í jsdom og `visual.mjs` keyrir **alvöru Chrome** í
headless-ham gegnum DevTools-bókunina yfir WebSocket. Node 22+ ber `WebSocket`
innbyggt, svo **þetta þarf enga nýja pakka** — sem skiptir máli í verkefni sem
heldur `dependencies` í tveimur.

**Af hverju bæði:** jsdom **reiknar ekkert útlit**. Breiddir eru núll, ekkert
brotnar, ekkert skarast og `matchMedia` er ekki til. Grænt útlitspróf í jsdom er
sönnun um DOM, ekki um útlit. Það sem jsdom *getur* er samt meira en flesta
grunar: dálkafjöldi í haus á móti röð, `colSpan` sem summast ekki, CSS-klasar sem
eru notaðir en hvergi skilgreindir, stytting og langritun í sama stíl, og
andstæða reiknuð úr CSS-breytunum.

`visual.mjs` mælir hitt: lárétt skrun á **fjórum breiddum × öllum flipum**, hvort
haus-heiti klippist, hvort efsta röðin feli sig bak við fasta hausinn, hvort
spjöld skarist, símahaminn með **raunverulegri `matchMedia`**, og villur í
console við raunverulega hleðslu. Það tekur líka skjámyndir — **þær sanna
ekkert, þær eru til að SKOÐA.**

### Þrjár villur sem þetta fann

| # | Villa | Hvernig hún fannst |
|---|---|---|
| 1 | **Þrep 1 hjá QB bar 22 menn og spannaði 98,8 stig** — Josh Allen (65,6) og maður á −33,2 sagðir skiptanlegir, meðan þrep 1 hjá RB spannaði 6,5 | **Á skjámynd.** Engin tala flaggaði því |
| 2 | **`Replication` og `Shapes` sátu inni í öðru spjaldi** — rammi innan ramma, tvöföld fylling | Mæling í vafra |
| 3 | **„−0,0" í Value-dálknum** hjá fjórum leikmönnum í topp-tíu | Skjámynd, svo vörður |

**Villa 1 var ekki þröskuldurinn heldur `minTier`.** Bilið Allen → Jackson er
35,5 og þröskuldurinn 13,3, svo skilin áttu að koma strax — en
`sinceBreak >= minTier` bannaði þrep með einum manni og dró Jackson inn. Eftir
það er QB-brekkan slétt niður í sæti 22. Reglan sem leysir það þarf **enga nýja
tölu**: *fjarlægðin innan þreps verður að vera minni en sú sem telst þrepaskil.*
Nú er þrep 1 hjá QB **Allen einn**, og þrepin lesa: Jackson/Maye/Daniels, svo
Hurts/Burrow/Prescott. Það er uppbyggingin sem draftari þarf.

**Villa 3 var þegar leyst — annars staðar.** `DraftBoard.jsx` bar rétta
útfærslu *og* rétta athugasemd um `-0.0`. En hún var stök þar, svo
leikmannalistinn erfði hana ekki. `signed()` býr nú í `columns.js` og bæði lesa
hana. **Lærdómur sem er lærður á einum stað og ekki fluttur er ekki lærður.**

### Stökkbreytingar sem staðfestu að prófin geti fallið

Grænt próf sannar ekkert fyrr en það hefur fallið. Fjórar afturkallanir voru
keyrðar og allar felldu réttan vörð með nafni og tölu: spjald sett aftur inn í
spjald (`4b` féll og nefndi spjaldið), dálkar þvingaðir í 30 px (`2` féll og taldi
upp fjögur klippt heiti), `signed()` fjarlægt úr `PlayerTable` (`6b` féll og fann
bæði `-0.0` og `+0.0`), og `minTier` skilað í fyrra horf.

### Það sem þetta sér samt ekki

Hvernig þetta **lítur út** — hvort það sé fallegt, hvort stigveldið sé rétt,
hvort eitthvað sé ljótt. Skjámyndirnar eru í `dist/shots/` og þær þarf að skoða.
Vafraviðbótin var ekki tengd í þessari lotu, svo ég las þær sem myndir.

---

## 7. Pipeline

```bash
node scripts/fetch-nfl.mjs --stage=core      # ADP, meiðsli, spár, línur — daglega
node scripts/fetch-nfl.mjs --stage=experts   # ~230 sérfræðingaborð
node scripts/fetch-nfl.mjs --stage=history   # 2019-2025 — handvirkt, breytist aldrei
node scripts/measure-experts.mjs             # -> accuracy.json
node scripts/calibrate.mjs                   # -> calibration.json (fastarnir)
node scripts/fetch-ecr-history.mjs           # -> ecr_history.json (arlega)
node scripts/build-features.mjs              # -> features.json (arlega)
node scripts/model-lab.mjs [--scoring=…]     # -> model_eval_*.json
node scripts/strategy-lab.mjs [--scoring=…]  # -> strategy_*.json
node scripts/market-lab.mjs                  # -> market_history.json
node scripts/advice-lab.mjs [--scoring=…]     # -> advice_*.json
node scripts/arank-lab.mjs [--scoring=…]      # -> arank_*.json (marktaekni)
node scripts/arank-search.mjs [--scoring=…]   # 422 afbrigdi + fjolprofa-leidretting
node scripts/projector-lab.mjs [--scoring=…]  # -> projectors_*.json (hver er bestur)
node scripts/feature-probe.mjs                # -> feature_probe.json (nyjar breytur)
node scripts/fetch-wayback-projections.mjs   # -> wayback_projections.json (haeg, handvirk)
```

Þrepin eru aðskilin eftir **eðli gagnanna**, ekki smekk: `core` breytist daglega,
`experts` nokkrum sinnum í viku, `history` aldrei fyrir lokið tímabil.

`.cache-nfl/` er þróunartæki (`.gitignore`). Það **frystir heiminn meðan verið
er að mæla** — annars er ekki hægt að segja hvort breyting á tölu kom frá
kóðanum eða gögnunum. `NFL_NO_CACHE=1` í CI.

**`status.json` er SAMEINAÐ yfir þrep, ekki yfirskrifað.** Fyrsta útgáfan
skrifaði það upp á nýtt í hverri keyrslu, svo eftir `--stage=experts` báru
aðeins 6 heimildir sig fram og hinar 40 hurfu úr yfirlitinu þótt gögnin þeirra
væru fersk. Það er nákvæmlega þögla bilunin sem skráin á að hindra.

`fetch-nfl.yml`: 09 UTC daglega, **auk 21 UTC í ágúst og september** (ADP
hreyfist mest á kvöldin í BNA í drafttíð). Sama endurtilraunalykkja og
push-kapphlaupið í `fetch.yml` — `data/` er endurmyndað í heild í hverri
keyrslu, svo `rebase -X theirs` er rétt hér af sömu ástæðu.

---

## 8. Bíður tímabilsins

| atriði | af hverju blokkað |
|---|---|
| Vikulegar spár og byrjunarliðs-tól | `weeklyProjection` er skrifað og prófað en hefur **aldrei keyrt á lifandi viku** |
| Vænt stigaskor á flesta leiki | Aðeins **337 af 557** leikjum hafa línu í forleik. Leikur án línu fær **—**, ekki meðaltal |
| Ár-á-ár nákvæmni sérfræðinga | 2026-borðin eiga eftir að spilast. **Þetta er stærsta ómælda spurningin í verkefninu** |
| Sleeper í beinni | Kóðinn pollar `/draft/{id}/picks` á 5 sek en hefur ekki verið keyrður í raunverulegu drafti. **Innflutningur reglnanna er hins vegar staðfestur á lifandi deild** (sjá 6e) — það sem eftir stendur óprófað er pollunin meðan völ tínast inn |
| Dregin draft-röð | `draft_order` var **null** 12.8.2026 og verður það þar til röðin er dregin. Sætin sem appið sýnir eru þá **hópsæti** úr `slot_to_roster_id`; þau verða valröðin þegar dregið er, og pollunin les hana þá sjálf. **Fyrsta raunprófun þess er draft-kvöldið** |
| Trending add/drop sem waiver-merki | Í forleik er þetta meiðsla-frétt; á tímabili er það waiver-hlaupið |

---

## 9. Það sem þetta skjal getur ekki flutt með sér

Þitt eigið draft-ástand (deildarsnið, valdir leikmenn, Sleeper draft-id,
dálkaval) er í `localStorage` undir `nfl_*` og fer **aldrei í neitt kall út**.

Allt annað er í repo-inu: prófin (þau **framkvæma** ákvarðanirnar í köflum 3–5
og eru þar með áreiðanlegri en prósa), `data/` og commit-sagan.
