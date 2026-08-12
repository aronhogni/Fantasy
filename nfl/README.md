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

**Fimm flipar** (`view` í `App.jsx`):

| Flipi | Hvað hann gerir |
|---|---|
| 🏈 **Draft** | Draft-borð með VBD, þrepum, skortstöðu og **beinni Sleeper-tengingu** |
| 👥 **Players** | Stóra taflan — 33 dálkar, hitakort, dálkavalari |
| 🧠 **Experts** | Nákvæmni ~205 sérfræðinga, **mæld af okkur** gegn 2025 |
| 📅 **Schedule** | Leikjaskrá, vænt stigaskor úr veðbankalínu, bye-vikur |
| 🔌 **Sources** | Heilsa hverrar heimildar + öll kvörðunin, með áhrifastærðum |

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
| `sleeper-league.js` — Sleeper-svar → deildarsnið | |

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
