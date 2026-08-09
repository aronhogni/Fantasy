# NFL.md — leiðarvísir fyrir NFL-hlutann

`npm ci && npm test && npm run build`. Allt á að vera grænt.

Þetta er **sjálfstætt app** í sama repo og FPL-verkefnið. Þau deila
**engum kóða, engum stílum og engum gögnum** — aðeins byggingarskrefi og
hýsingu. Það er viljandi: breyting í öðru má ekki geta fellt hitt.

| | FPL | NFL |
|---|---|---|
| Slóð | `/Fantasy/` | `/Fantasy/nfl.html` |
| Kóði | `src/` | `src-nfl/` |
| Gögn | `data/` | `data-nfl/` |
| Pipeline | `scripts/fetch.mjs` | `scripts/nfl/fetch-nfl.mjs` |
| Workflow | `fetch.yml`, `fetch-fast.yml` | `fetch-nfl.yml` |
| Leyndarmál | 4 lyklar | **engir** |

> **GRUNNREGLAN ER SÚ SAMA OG Í `CLAUDE.md`:** tölur eru **mældar**, ekki
> valdar. Hver einasti fasti í `src-nfl/model.js` kemur úr
> `scripts/nfl/calibrate.mjs` og ber mælinguna í athugasemd. Ómæld tala sem
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

Allt í `scripts/nfl/calibrate.mjs`. **25.160 leikmanna-vikur, 2020–2025**, með
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

`src-nfl/accuracy.js` + `scripts/nfl/measure-experts.mjs` → `data-nfl/accuracy.json`.

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

**Það sem þetta getur samt ekki sagt:** hvort sömu nöfnin endurtaka sig næsta
ár. Það krefst annars mælds tímabils og 2026-borðin eiga eftir að spilast.
Viðmótið segir þetta berum orðum og **verður að halda áfram að gera það**.

### „Skorpu"-röðunin

`buildSharpBoard` byggir samsteypu **aðeins** úr þeim borðum sem mældust yfir
**95. hundraðshluta** núlldreifingarinnar. Ekki „topp 10" — föst tala gefur
alltaf tíu nöfn, líka þegar enginn er betri en handahóf. Komist enginn yfir
þröskuldinn er **engin skorpu-röð til** og `measured: false` er skilað, sem
viðmótið **verður** að birta.

`sharpDelta` = ECR − skorpu-röð. Jákvætt: þeir sem hittu í fyrra eru hrifnari
en markaðurinn.

---

## 5b. A-RANKING — hvað spáir því hverjir verða góðir?

`scripts/nfl/build-features.mjs` → `model-lab.mjs` → `strategy-lab.mjs`.
Walk-forward 2015–2025: fyrir hvert próf-ár er **eingöngu** þjálfað á árum á
undan, `lambda` valið með krossprófun **innan** þjálfunargagna, og hvert borð
spilað sem raunverulegt 12-liða snák-draft frá **öllum 12 sætum**. Skorið er
það sem liðið **skoraði í raun**.

### Niðurstaðan

| röðun | draft-stig (PPR) | vs ADP | rho | vinnur ADP |
|---|---|---|---|---|
| **A-Ranking** (Sleeper → VBD) | **1975,8** | **+228** | 0,604 | **4/4** |
| Sleeper-spá, hrá | 1920,7 | +173 | 0,695 | 3/4 |
| Sleeper + tölfræði | 1831,1 | +83 | 0,608 | 3/4 |
| ADP + Sleeper (röðublanda) | 1735,3 | −13 | 0,567 | 2/4 |
| **ADP (markaðurinn)** | 1747,9 | 0 | 0,458 | — |
| Sleeper-ADP | 1734,2 | −14 | 0,498 | 1/4 |
| FantasyPros ECR | 1651,1 | −97 | 0,522 | 1/4 |
| öll tölfræði, engin skoðun | 1593,5 | −154 | — | — |

Í **standard** er munurinn enn stærri: A-Ranking **+270** gegn ADP.

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

`scripts/nfl/sources/espnodds.mjs` → `data-nfl/market.json`.

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

`scripts/nfl/market-lab.mjs` → `data-nfl/market_history.json`.
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
næsta og aðrir ekki. `src-nfl/advice.js` + `scripts/nfl/advice-lab.mjs`.

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

## 6. Prófin

Fimm söfn í `SUITES` (`npm test` keyrir þau með hinum 41).

| Safn | Hvað það ver |
|---|---|
| `nfl-model.mjs` | Hver birt tala. Kafli 2 er kjarninn: **QB0 skorar fleiri stig en RB0 en hefur lægra VBD** — falli það er appið að raða eftir hrástigum |
| `nfl-accuracy.mjs` | **Kafli 3 er PRÓFSTEINNINN:** fullkomið borð verður að slá handahóf með >4 staðalvillum, og hálfgott borð verður að lenda **á milli**. Það felldi fyrstu útgáfu hermunarinnar |
| `nfl-names.mjs` | Raunveruleg NFL-jaðartilfelli. Kafli 4: **tvíræður lykill skilar ENGU** — „síðasti vinnur" er þögla ranga pörunin |
| `nfl-pipeline.mjs` | **Gögnin sjálf, ekki formúlurnar.** Nafna-pörun má ekki taka yfir; engin tómgildi; hvert birt svið hefur raunverulega dreifingu; PPR > half > std hjá hverjum móttakara |
| `nfl-render.mjs` | **Eina prófið sem sér hvítan skjá.** Opnar hvern flipa með raunverulegum `data-nfl/` og krefst **talna, ekki bara þess að ekkert hrundi**. Kafli 7 ver að viðmótið sé enskt — líka ASCII-íslenska, sem stafa-skynjun sér ekki |

**Mynstur sem á að endurtaka:** `nfl-render.mjs` krefst þess að núlldreifingin
standi **á undan** stigatöflunni í DOM. Það er ekki stílpróf heldur efnislegt:
tafla án vikmarka segir „þessi er bestur" þegar gögnin segja „þessi var heppnari".

**Gildra sem kostaði tíma:** jsdom-prófið rendrar `App` **án** StrictMode og sá
því ekki skyndiminnis-villuna sem hékk að eilífu í vafranum. AST- og jsdom-próf
lesa kóða; þau sjá ekki skjáinn. Íslensku strengirnir í FPL-verkefninu fundust
líka með því að **keyra appið**.

---

## 7. Pipeline

```bash
node scripts/nfl/fetch-nfl.mjs --stage=core      # ADP, meiðsli, spár, línur — daglega
node scripts/nfl/fetch-nfl.mjs --stage=experts   # ~230 sérfræðingaborð
node scripts/nfl/fetch-nfl.mjs --stage=history   # 2019-2025 — handvirkt, breytist aldrei
node scripts/nfl/measure-experts.mjs             # -> accuracy.json
node scripts/nfl/calibrate.mjs                   # -> calibration.json (fastarnir)
node scripts/nfl/fetch-ecr-history.mjs           # -> ecr_history.json (arlega)
node scripts/nfl/build-features.mjs              # -> features.json (arlega)
node scripts/nfl/model-lab.mjs [--scoring=…]     # -> model_eval_*.json
node scripts/nfl/strategy-lab.mjs [--scoring=…]  # -> strategy_*.json
node scripts/nfl/market-lab.mjs                  # -> market_history.json
node scripts/nfl/advice-lab.mjs [--scoring=…]     # -> advice_*.json
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
push-kapphlaupið í `fetch.yml` — `data-nfl/` er endurmyndað í heild í hverri
keyrslu, svo `rebase -X theirs` er rétt hér af sömu ástæðu.

---

## 8. Bíður tímabilsins

| atriði | af hverju blokkað |
|---|---|
| Vikulegar spár og byrjunarliðs-tól | `weeklyProjection` er skrifað og prófað en hefur **aldrei keyrt á lifandi viku** |
| Vænt stigaskor á flesta leiki | Aðeins **337 af 557** leikjum hafa línu í forleik. Leikur án línu fær **—**, ekki meðaltal |
| Ár-á-ár nákvæmni sérfræðinga | 2026-borðin eiga eftir að spilast. **Þetta er stærsta ómælda spurningin í verkefninu** |
| Sleeper í beinni | Kóðinn pollar `/draft/{id}/picks` á 5 sek en hefur ekki verið keyrður í raunverulegu drafti |
| Trending add/drop sem waiver-merki | Í forleik er þetta meiðsla-frétt; á tímabili er það waiver-hlaupið |

---

## 9. Það sem þetta skjal getur ekki flutt með sér

Þitt eigið draft-ástand (deildarsnið, valdir leikmenn, Sleeper draft-id,
dálkaval) er í `localStorage` undir `nfl_*` og fer **aldrei í neitt kall út**.

Allt annað er í repo-inu: prófin (þau **framkvæma** ákvarðanirnar í köflum 3–5
og eru þar með áreiðanlegri en prósa), `data-nfl/` og commit-sagan.
