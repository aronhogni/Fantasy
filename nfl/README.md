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

### 2b. HEILSUFAR HVERS ENDAPUNKTS — mælt 21.8.2026

Hver endapunktur sem pipeline-ið snertir var **kallaður** og hausar allra
CSV-skránna lesnir með Range-fyrirspurn. Þetta er myndin þann dag; hún er
bókuð svo næsta lota þurfi ekki að endurmæla heldur aðeins að spyrja hvað
hefur breyst.

| endapunktur | staða | raðir / ferskleiki |
|---|---|---|
| `api.sleeper.app/v1/state/nfl` | 200 | 2026, `pre`, vika 2 |
| `api.sleeper.app/v1/players/nfl` | 200, 14,6 MB | 12.221 → **4.263** í fantasy-stöðum; gsis á 1.322, espn_id á 2.312 |
| `api.sleeper.com/projections/nfl/2026` | 200 | 3.301 raðir, **636 með `pts_ppr`** — hinar bera null í hverju sviði |
| `…/projections/nfl/2026/{1,2}` | 200 | 3.301 raðir, **540 / 545** með spá. **Vikuleg spá er ÞEGAR TIL**; hliðið er rétt lokað (gluggi opnast ~6.9.) |
| `…/trending/add` | 200 | 100 raðir, toppur 91.833 |
| `fantasyfootballcalculator /adp/{ppr,half-ppr,standard,2qb}` | 200 | 267 · 225 · 214 · 240 leikmenn; 7.112 · 2.741 · 1.521 · 4.847 dröft, allt að 21.8. |
| `…/adp/dynasty` | 200 | **7 leikmenn úr 79 dröftum** — sjá viðvörun neðar |
| `raw.githubusercontent …/db_playerids.csv` | 200 | 35 dálkar, **enginn vantar**; 12.480 raðir (fp-id 4.870, sleeper-id 6.384) |
| `raw.githubusercontent …/fp_latest_weekly.csv` | 200 | 28 dálkar, enginn vantar; `scrape_date` enn **2025-12-30** (rétt í forleik) |
| `partners.fantasypros … consensus-rankings` | 200 | 520 leikmenn, **100 sérfræðingar**, uppfært 8/21 |
| `fantasypros.com/nfl/rankings/*.php` | 200 | ppr 520 · half 866 · standard 513, þrep á öllum |
| `fantasypros.com/nfl/accuracy/draft.php` | 200 | 215 sérfræðingar. `?year=2026` skilar **2025-síðunni** og hliðið í `accuracy()` fellir hana — rétt |
| `site.api.espn.com/**` | **403 ÚR CI**, 200 lókalt | sjá 2c |
| `site.web.api.espn.com/**` | 200 **úr CI** | sama slóð, **eins svar** — sjá 2c |
| `sports.core.api.espn.com/…/futures` | 200 | 23 markaðir, 11 passa síuna, 32 bækur |
| `sports.core.api …/odds` (marka-prop) | 200 | vika 1: **83 „Anytime TD" listuð, 0 með verð**. Vika 3 ber ekkert `propBets` |
| `lm-api-reads.fantasy.espn.com` | 200 (HEAD → **405**) | 11.612 leikmenn → 1.027 með ADP/eignarhald; **spá á 38**, 16 felldar af skynsemishliðinu |
| nflverse `players.csv` | 200 | 39 dálkar — **TVEIR HORFNIR ÚR PICK-LISTANUM**, sjá 2d |
| nflverse `schedules/games.csv` | 200 | 46 dálkar, enginn vantar; 2026 ber **272 leiki en aðeins 112 með línu** — þess vegna er ESPN markaðsheimildin fyrir yfirstandandi ár |
| nflverse `stats_player_week_2025` · `stats_team_week_2025` | 200 | 150 / 138 dálkar, **enginn vantar** (fjórir pick-listar prófaðir: `sources/nflverse`, `build-features`, `market-lab`, `opp-lab`) |
| nflverse `snap_counts_2025` · `injuries_2025` | 200 | 16 dálkar hver, enginn vantar |
| nflverse `depth_charts_2026.csv.gz` | 200 | 8,96 MB (43,5 MB ópakkað), uppfært 21.8. 07:41; 12 dálkar, nýja sniðið |
| nflverse **2026**: `stats_player_week` · `stats_team_week` · `snap_counts` · `injuries` · `ngs_*` | **404** | Réttmætt — engir leikir spilaðir. Snap-brúin kviknar við fyrsta leik og vörðurinn „TÓM SNAP-SÓKN (404) → tölur sem voru til STANDA ÓSNERTAR" er þegar prófaður |

**ÞRJÁR ATHUGASEMDIR SEM ERU EKKI BILANIR EN ERU ÞESS VERT AÐ VITA:**

1. **`ffc dynasty` er 7 leikmenn úr 79 dröftum** og hangir á 7 leikmönnum í
   `players.json` (á móti ppr 242 · 2qb 221 · half 206 · standard 197).
   Úrtaksstærðin ER sýnileg (`total_drafts`) sem er nákvæmlega ástæðan fyrir
   að hún er sótt þannig — en dynasty-sniðið er í reynd **ekki þakið** og á
   ekki að lesast sem það sé.
2. **ESPN-frétta-glugginn er ~22 klst**, ekki „50 nýjustu greinar". Mælt: 50
   greinar, nýjasta 21.8. 16:18, elsta **20.8. 18:16**. Gærdagurinn er ekki
   til neins staðar, hvorki hjá ESPN né annars staðar — þess vegna er
   `news/{dagur}.json` óendurheimtanlegt og þess vegna kostaði 403-ið fimm
   daga (2c).
3. **Sex raðir í `status.json` geta aldrei hreinsast**: `ffc_ppr_10`,
   `ffc_ppr_14`, `ffc_half-ppr_10`, `ffc_half-ppr_14`, `ffc_standard_10`,
   `ffc_standard_14` eru frá 10.8., þegar `ffcAll` var mælt niður í **eitt
   sett per stigagjöf** (FFC hunsar liðafjöldann). Þær eru `ok` og `stale`
   að eilífu. Það er sama ætt og nótan við `writeJson` varar við — röð sem
   hreinsast aldrei kennir manni að hunsa spjaldið — bara í hina áttina
   (græn í stað rauð).

### 2c. `site.api.espn.com` ER 403 ÚR CI — OG ANNAR HOSTUR BER SÖMU SLÓÐ

Þetta var **standandi rekstrarsár**, ekki jaðartilfelli.
`site.api.espn.com` skilar **403 úr GitHub Actions** meðan
`lm-api-reads.fantasy.espn.com` og `sports.core.api.espn.com` skila 200
**úr sömu keyrslu**. Lókalt svara allir þrír. Það er jaðar-/svæða-sía hjá
einum hosti — ekki kvóti (engin heimild hér þarf lykil) og ekki leiðin.

Kostnaðurinn var tvöfaldur og annar helmingurinn óendurheimtanlegur:

- **18 raðir** `espn_lines_w{n} failed: HTTP 403`. `market.json` er varið af
  `minRows: 200` og stóð ósnert — sem er rétt — en markaðslagið **rotnaði**
  nema einhver keyrði lókalt. Commit-sagan sýnir það: *„nfl: dagsmynd 21.8.
  — keyrt lokalt thvi CI naer ekki site.api.espn.com"*.
- **`archive:news/{dagur}` HAFNAÐ fimm daga í röð** (15.–19.8.,
  „REFUSED: 4 rows"). Safnið er dagsett, `writeOnce` skrifar aldrei ofan í,
  og glugginn hjá ESPN er ~22 klst. Þeir dagar eru **farnir**.

**Lausnin er hvorki proxy né önnur heimild.** `site.web.api.espn.com` ber
nákvæmlega sömu slóðir. Mælt 21.8.2026, svið fyrir svið:

| slóð | samanburður |
|---|---|
| `/teams` | **IDENTICAL** — 32 lið, id/skammstöfun/litir/merki |
| `/injuries` | **IDENTICAL** — 32 lið, 800 raðir |
| `/news?limit=50` | **IDENTICAL** — sömu 50 greina-id í sömu röð |
| `/scoreboard?…&week=3` | **IDENTICAL** — 16 leikir, spread/overUnder/details/provider |

Þetta er því **sama svar úr öðrum dyrum**, ekki ný heimild með nýju sniði
(sem væri þögul sniðsbreyting í bið). Þáttararnir eru ósnertir.
`getJSONFirst(tag, urls)` í `lib/http.mjs` reynir hostana í röð og skráir
`host:{tag}` **aðeins þegar varahostur svarar** — „allt eins og venjulega"
er ekki frétt. Staðfest í CI 21.8. kl. 18:14: allar 18 vikur, fréttir,
meiðsli og liðaskrá afgreidd af `site.web.api`, og `market.json` skrifuð
með **272 línum úr CI** í fyrsta sinn. Vörður: `tests/pipeline.mjs`
(„ESPN-site: tveir hostar").

> **AÐALHOSTURINN ER ÁFRAM SÁ FYRSTI OG ÞAÐ ER ÁSETT.** Detti sían niður
> hjá ESPN fer allt aftur í fyrri leiðina af sjálfu sér, og `host:`-röðin
> hverfur úr `status.json` — sem er þá réttur mælikvarði á hvort sárið er
> enn opið.

### 2d. `players.csv` HAFÐI MISST TVO DÁLKA OG HVORUGT SÁST

`objects(text, pick)` **sleppir þögult** dálki sem er ekki í hausnum. Það er
rétt hegðun (einn týndur dálkur á ekki að fella keyrslu) en hún er þögul, og
sú þögn hefur nú kostað tvisvar — **í bæði skiptin skráði heimildin sig `ok`**:

| hvað | afleiðing |
|---|---|
| `depthCharts(2026)`, ágúst | nflverse skipti um snið; af 15 dálkum lifði `gsis_id` einn. **0 raðir, skráð `ok`** |
| `players.csv`, mælt 21.8. | `draft_club` → **endurnefnt `draft_team`** og `sleeper_id` **tekið út alveg** |

`draftTeam` var þar með **null á öllum 25.049 leikmönnum** (eftir lagfæringu:
12.229 bera lið), og `nvBySleeper` — varaleiðin að nflverse-röð þegar
DynastyProcess-brúin þegir — var **tóm Map**.

**Og varaleiðin hafði engu að tapa; það er mælingin sem afgreiðir málið:**
af 1.167 röðum í `players.json` para **1.035 gegnum brúna**, 2 gegnum
Sleeper-eigið gsis og **0 gegnum `nflverse_sleeper_id`**. Þeir 130 sem para
ekki bera **allir `gsisId: null` OG `team: null`** (Reggie Diggs, Valdez
Showers, Gabe Marks) — menn sem eru ekki í nflverse, svo engin brú hefði
fundið þá. Dálkurinn er því hafður sem `optional`: lesinn áfram (kviknar af
sjálfu sér skili nflverse honum aftur) en **ekki krafist**, svo Sources fái
ekki rauða röð að eilífu fyrir dálk sem heimildin fjarlægði viljandi.

**Mekanisminn, ekki bara lagfæringin:** `missingCols(text, pick)` í
`lib/csv.mjs` (hreint, þáttar aðeins fyrstu línuna — skrárnar eru upp í
43 MB) og `parse()` í `sources/nflverse.mjs` skráir `schema:{tag}` sem
**villu** í `status.json`. Sex lestrar í `nflverse.mjs` fara gegnum hana;
`adp.mjs` (auðkennisbrúin) og `fantasypros.mjs` (vikuleg ECR) kalla hana
beint.

> **ÞAÐ FELLIR EKKI KEYRSLUNA OG ÞAÐ ER ÁKVÖRÐUN.** `tests/pipeline.mjs` er
> hlið á undan commit-inu, og 21.8. felldi **ein flökrandi fullyrðing þrjár
> keyrslur í röð og allt ADP á draftdegi** (sjá 2e). Vörður sem stoppar öll
> gögn af því að nflverse endurnefndi dálk sem enginn les væri sama stíflan.
> Drift verður **sýnileg** strax; prófið ver að hún SÉ sýnileg.

### 2e. VÖRÐUR SEM FLÖKRAR ER STÍFLA — 21.8.2026

Bókað hér því lærdómurinn er almennur og hann kostaði dag.

Fullyrðingin „ESPN-sentinel verður aldrei markaðsverð" spurði
`Math.abs(p.adpEspn - r.adp) < 1e-9` — þ.e. *„er birt ADP SAMA TALA og
ESPN-talan?"*. Sú spurning mælir **uppruna aðeins ef tölurnar geta ekki
verið eins af tilviljun**. Þær geta.

```
CI 21.8.2026 kl. 09:28
  FAIL 12-lida half: ekkert ADP er ESPN-talan (1: Jahmyr Gibbs 1.5)
```

Gibbs er fyrsta val í deildinni. FFC half-ppr gaf 1,5 og ESPN gaf 1,5 —
**tvær óháðar heimildir sammála um besta leikmanninn**, sem prófið las sem
„sentinel-inn er í verðinu". Kl. 16:18 sama dag var ESPN-talan 1,49 og
prófið grænt aftur; hún er **meðaltal** og flökrar. Og það er ekki
jaðartilfelli heldur þéttleiki: **141 af 979** ESPN-gildum bera nákvæmlega
einn aukastaf, og hittnin er mest ofar á borðinu — þar sem heimildirnar eru
sammála.

**Kostnaðurinn var allur dagurinn, ekki ein rauð röð.** Prófið er hlið á
undan commit-inu, svo 09:00-keyrslan skrifaði öll gögnin í runner-inn og
henti þeim. `trending/2026-08-21.json` var þar með aldrei committuð og
„trending-vörðurinn (dagurinn í dag)" felldi því **12:19- og
15:20-keyrslurnar líka**. Þrjár keyrslur, ekkert ADP, á draftdegi.

Nýja formið mælir **uppruna** og getur því ekki hitt á tilviljun:
`adp` í `src/build.js` er `ffc ? ffc.adp : (adpSleeper ?? null)` og ESPN er
hvergi í keðjunni, svo (b1) **609 leikmenn sem aðeins ESPN á ADP á** bera
`adp == null`, og (b2) hvert birt `adp` er **jafnt einhverju FFC- eða
Sleeper-gildi sama leikmanns**. Setti einhver ESPN aftur í keðjuna fellur
(b1) á ~609 röðum — margfalt sterkara stökkbreytingar-næmi en ein röð sem
gat komið úr tilviljun.

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

> **LÖGNIN SEM ÞETTA VAR MÆLT Á ER 12 LIÐ · WR3 · EITT FLEX · FULL PPR — OG
> HVORUG DEILD NOTANDANS ER HÚN.** Sama talningin
> (`scripts/lib/flex-occupancy.mjs`) gefur TE **0,073** í Patriots og **0,083**
> í Sófahetjum, og TE-hluturinn hleypur **0,130–0,352** milli tímabila í lögninni
> sem hann var mældur á. Talan hafði **engin vikmörk og var aldrei mæld sem
> útkoma**. Hún var **sveipuð 0 → 0,40 á báðum lögnum, á stigum OG á sigrum,
> 18.8.2026: 0 af 102 frumum standast barinn og 0,193 stendur** — sjá **4l**,
> sem er líka staðurinn þar sem TE-kaup-merkin á borðinu eru skýrð.

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
| **Ólínulegur aldursferill per stöðu** (`agecurve-lab.mjs`) | **HAFNAÐ.** Hrá leit jákvæð 8/10; **walk-forward jákvæð 4/10 og marktæk 1/10** (var 0/10 fyrir flex-lagfæringuna 14.8., sjá 4b-2 — hólfið sem breyttist er `sleeper\|ppr\|10-2flex`), tvö hólf marktækt *negatíf*; LOSO 3/10 (var 2/10). Valda fjölskyldan hoppar milli ára í hverju hólfi — sama undirskrift og CLAUDE.md 3 flaggar. `deltaR2` net of ADP er negatíft í **öllum 48 hólfum** |
| **Annar VBD-grunnur** (`vbdbase-lab.mjs`) | **HAFNAÐ — og fann VILLU.** 16 afbrigði × 3 lögun × 3 stigagjafir: **0 af 153 hólfum standast bootstrap klasaðan PER LEIKMANN**, þótt **28 standist** hann klasaðan eftir tímabili. Sjá 4b — það er sjálfstætt mikilvægasta aðferðar-atriðið hér |
| **`minGain` í waiver-ráðgjöfinni** (`waiver-lab.mjs`) | **ÓMÆLANLEGT Á SENDU REGLUNNI, og það er svarið.** Gólf 0 − gólf 10 = **−0,4**, CI [−2,1 · +1,4] (var +0,5, CI [−0,7 · +1,8] fyrir flex-lagfæringuna 14.8. — sjá 4g). `measured: false` **stendur** — gildið er val innan mældrar afskiptaleysis-bandar. Sjá 4g |
| **Rest-of-season sem gjaldmiðill** (`waiver-lab.mjs`) | **STENST** (+13,6 stig/tímabil, t=3,33, 7/7, CI [7,1 · 21,9], 17/18 hólf) — **en ekki tengjanlegt**: þarf vikurnar sem eftir eru, sem appið hefur ekki. Vikuleg spá sem gjaldmiðill er **mæld dauð** (−74,1). Sjá 4g |
| **Notkun það sem er liðið af tímabilinu** (`usage-lab.mjs`) | **STENST — fyrsti vinningurinn.** `opp_prior` lokar **12,25 / 10,75 / 10,76%** af bilinu á móti 5,83 / 3,20 / 2,97, og **per-leikmanns CI útilokar núll í öllum þremur**. Ferillinn er niðurstaðan: **ekkert í vikum 1–4, +12,3 pp í vikum 10+** (6/6 tímabil). Sjá 4e — **ekki tengt enn**, plumbing vantar |
| **Markaðurinn umfram `implied`** (`mktweek-lab.mjs`) | **FELLUR.** 0 af 45 hólfum standast öll fjögur skilyrðin i neinu sniði. Og **leikjaflæðis-folkloreið er RANGT**: hver staða gerir BETUR sem favorít, engin gerir betur á eftir — QB sem 10+ undirdogg er **−1,12**. Ósamhverfa: **12 af 12 CI innihalda núll** |
| **Availability-taflan** (`avail-lab.mjs`) | **ÁGISKAÐA TAFLAN STENDUR.** Engin mæld tafla slær hana í neinu sniði. `Questionable = 0,75` er kvarðað 0,666 en ákvörðunin er **flöt**; `Doubtful` 0,25 á móti 0,009 er 28× skekkja sem kostar 0,143 pp. `practice_status` gefur upplýsingar en **ekki ákvarðanir** (+0,44 pp, CI innihaldur núll). **OG ÞAÐ AFHJÚPAÐI AÐ `gap-lab` ER BLINT Á AVAILABILITY** — sjá 4i |
| **Handcuff / varamaður** (`handcuff-lab.mjs`) | **INNSAEI NOTANDANS VAR RETT OG STAERRA EN ÞAD HLJOMAR.** Fjarvistar-spikid er raunverulegt (QB +9,32, RB +4,86 yfir varamannsins eigin grunnlinu) en vikuna sem byrjunarmadurinn kemur til baka lifir adeins **19,6% (QB) / 8,1% (RB) / 2,0% (WR)** — og i raunverulegu akvordunininni er hann kominn aftur i 16–44% tilvika STRAX naestu viku, thar sem varamadurinn skorar **−11,77 (QB) / −2,53 (RB) / −5,01 (TE)**. „Hann skoradi vel i sidustu viku" er thvi EITRAD sem pickup-maelikvardi. **Appid er thegar rett** (`vbd`, ekki vikuleg stig) svo ekkert var tengt — sja 4j |
| **Vörn gegn stöðu, sundurliðuð** (`defweek-lab.mjs`) | **FELLUR — 0 af 2.700 hólfum.** Andstæðings-leiðrétting **skaðar** (marktækt í half, t −5,87). Íhlutir flytjast ekki. `DEF_WEIGHT = 0,20` stendur. **OG ÞAÐ FANN VILLU Í MÆLIKVARÐANUM:** birta talan 5,831% var sjálf-smituð; hrein walk-forward er **3,482%**. Sjá 4h |
| **Hvar liggja 94%** (`gap-lab.mjs`) | **Þakið er 29,3%** (TD 18,9 + nýtni 10,4). Vörn er **NULL-flaska** (enrichment 0,96×). Röð: availability → hlutverk → vörn ekki neitt. Sjá 4f |
| **Tækifæri sem lítil vog OFAN Á VBD-röðina** (`opp-lab.mjs`) | **EINN frambjóðandi, ekki breyting.** `prevCarG` (hlaup per leik, fyrra tímabil) mælist **+23,8 stig**, t=2,286, 8/11 ár, CI [+3,7, +42,4], einræn 4/4 (endurmælt 14.8., var +24,4 / CI [+3,7, +43,7] — sjá 4b-2). Fimm varnaglar fella hana samt sem *breytingu* — sjá 4d. **Endurmaeld a SIGRUM 15.8. (`h2h-lab` Q3): +0,09 af 14 gegn placebo-thaki +0,35 — maelikvardinn bjargar henni ekki.** Hinar tíu breyturnar: engin stenst |
| **Óvissu-háð hnignun spárinnar** (`shrink-lab.mjs`) | **HAFNAÐ.** 12 óvissu-mælar × 3 forgildi × 6 vogir: **0 af 36 samsetningum jákvæðar í öllum 10 hólfum á báðum spáheimildum**. Besta samkvæma hrifin +0,5 stig af ~1900. Marktækni í **0/14** hólfum (besta \|t\| = 3,4 gegn kröfu 4,5–5,7) |
| **Vikulegar viðureignir í stað stiga** (`h2h-lab.mjs`) | **NULL-NIÐURSTAÐA, OG HÚN ER VERÐMÆT: stigin voru fullnægjandi staðgengill allan tímann.** A-Ranking gegn ADP heldur á SIGRUM (**+2,4 til +3,8 af 14**, marktækt í 4/4 lögnum, met 9,6-4,4 á móti 7,2-6,8) og stiga-dálkurinn endurgerir bókuðu +233,6 sem **+223**. Stefnu-röðin færist ekki: rho(sigrar, stig) = **0,961–0,989** á móti sjálfsáreiðanleika 0,935–0,968 — og **rho(stig, bókuð röð) er LÆGRA (0,768–0,828)**, svo mælikvarðinn færir röðina minna en hermirinn gerir. **Meistaraprósenta ber ekki merkið** í 5 tímabilum (+17,8pp, CI innihaldur núll) þótt „komast í úrslitakeppni" geri það (+35,1pp). **Og Q3 spurdi hinnar attarinnar — bjargar maelikvardinn einhverju sem FELL? NEI:** `prevCarG` (4d) maelist **+0,09 sigrar af 14** (t=0,48, 3/7, CI [-0,24, +0,45]) gegn **placebo-thaki +0,35**, og stigin ur SOMU drofttum **+16,7 gegn thaki +42,2** — sami domur a badum. Sja 5n |

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
| 1 | **Ábatinn er EKKI í toppnum.** `all` +29,8 · `top100` +30,2 · **`top50` aðeins +11,4** (t=1,69). Hún vinnur í sætum 50–150 — miðjuumferðir, ekki þar sem draftið er ákveðið |
| 2 | **Ómarktæk í þeirri heimild sem appið notar.** FFToday 2015–20: +26,8 (5/6, t=2,31). **Sleeper 2021–25: +20,2 (3/5, t=1,02)** — sami veggur og 5b/5e: fimm tímabil |
| 3 | **Marginal gegn placebo:** +23,8 á móti placebo-þaki **+21,3** |
| 4 | **Fylgnin hefur ANDSTÆTT formerki.** Fylgni `prevCarG` við leif spárinnar er **−0,052**. Jákvæð ákvörðun, negatíf fylgni, í sama skripti — það er repo-ið eigin regla („hærri fylgni ≠ betri ákvörðun"), en það þýðir líka að **mekanisminn er óskýrður** |
| 5 | **Mekanisminn er líklega ekki „tækifæri".** Per stöðu lifir merkið í **RB og QB**; `prevCarG` er ~0 fyrir nánast hvern WR/TE. Líklegasta lesningin er **RB-vinnuálag + hlaupandi QB**, ekki tækifæri í heild. Óprófað |

> **ENDURMAELT A SIGRUM 15.8.2026 — OG THAD BREYTIR ENGU.** `h2h-lab.mjs` Q3 keyrir
> NAKVAEMLEGA thetta net (10 vogir x 3 svid x 3 lognun, atta placeboar) i gegnum
> deildarhermi thar sem maelikvardinn er SIGRAR i stad stiga. `prevCarG` maelist
> **+0,09 sigrar af 14** (t=0,48, 3/7 ar, CI [-0,24, +0,45]) gegn **placebo-thaki
> +0,35** — bord **-0,26** — og per-leikmanns bootstrappid inniheldur null
> ([-0,30, +0,81]). `top50` er **-0,05**, svo varnagli 1 her ad ofan gildir enn og
> hefur snuist i minus. **Sigrar bjarga henni ekki.** Sja 5n/Q3.

#### Placebo-familían — mælitækið sem gerði töfluna læsilega

**Átta placebo-breytur — ákveðinn hávaði — voru keyrðar gegnum sama netið.** Þær
ná einstöku hólfi með **\|t\| = 3,50 og +58,2 stig**, og 2–24 placebo-hólf per
lögun/snið koma út „marktæk". **Eitt jákvætt marktækt hólf er það sem hávaði
lítur út eins og hér.** Pooled gefa þær meðaltal −1,1, sd 8,9, hámark
\|t\| = **1,227** og forspárbil **[−23,4, +21,3]**.

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
**0 af 11** — á móti **1 af 8 placebo-um**, sem er nákvæmlega fals-jákvæðnin.
(Var **1 af 11**, `prevTeamPassRate`, fyrir 14.8.; það hólf hvarf við
flex-lagfæringuna og **niðurstaðan styrktist** — hún var alltaf sú sama.)
Móttökur skora 1,0 í PPR og ~0 í standard; væri þetta móttöku-tækifæri hefði
mismunurinn sýnt það. **Það er engin mæld ástæða til að bera ólíka vog per
stigagjöf.**

**Magn á móti nýtni — xGI-slær-xG hliðstæðan flyst EKKI.** volume +8,5
(t=1,72) · efficiency **+9,9 (t=2,46, CI [+2,2, +17,5])** · context −19,8 ·
trend +6,6. **volume − efficiency = −1,5, t=−0,24** — ógreinanlegt, og nýtnin er
nafnbótarlega **þéttari**. Í FPL var magn-slær-nýtni **mæld ákvörðun**; hér er
hún það ekki.

`prevTeamPassRate` er skýrasta negatífa niðurstaðan: jákvæð vog kostar
**−19,8 stig** (−29,8 í PPR), einræn 4/4 — eina „context"-breytan og það versta í
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

Taflan hér er **topphólf hvers sniðs** (sama hólf og taflan að ofan), ekki
hólfið sem er sent. Það er skrifað berum orðum af því að **einmitt sú tvíræðni
kostaði þrjár villur** í `usageblend.js` (sjá næsta undirkafla): `+12,1` er
`opp_prior · jump · const0.5`, ekki senda armið.

| viku-bil | ppr | half | std |
|---|---|---|---|
| 1–4 | +0,8 (t 0,62) | +2,2 (t 0,35) | +4,2 (t 1,26) |
| 5–9 | +2,0 (t 0,35) | +9,9 (t 3,35) | +5,9 (t 0,99) |
| **10–18** | **+12,3 (t 4,21, 6/6, boot [4,6 · 14,5])** | **+12,1 (t 4,51, 6/6)** | **+10,5 (t 3,89, 6/6)** |

**Senda armið** (`opp_prior · last3 · bayes10`) gefur aðrar tölur í half og std:
w1-4 **+0,8 / +5,1 / +1,8** og w10-18 **+12,3 / +10,2 / +9,0**.

Í vikum 10+ fer PPR úr því að loka 3,97% af bilinu í **18,0%** — 4,5×.

##### `DEAD_GAMES = 4` — ÞRJÁR VILLUR Á SÖMU FULLYRÐINGU (leiðrétt 14.8.2026)

Hér stóð: *„Í vikum 1–4 er **ekkert**, og **kröftug blöndun þar er SKAÐLEG**
(`const0.5`: −4 til −9 pp)."* **Hvorugur helmingurinn stenst á senda arminu.**
Töluröðin var lesin úr `grid.ptsPG` — **öðru armi** — í „leiðréttingu" degi
áður; sú leiðrétting skrifaði slóðina niður en akkeraði hana á ranga breytu.

Á senda arminu (`opp_prior · last3`), `bins["w1-4"]`, **gegn viðmiðinu**:

| ferill | ppr | half | std |
|---|---|---|---|
| `bayes10` (sent) | +0,8 (t 0,62) | **+5,1 (t 2,34)** | +1,8 (t 1,37) |
| `const0.5` | −3,9 (t −1,14) | +2,0 (t 0,34) | +4,2 (t 1,26) |
| `const0` | −19,7 (t −5,37) | −11,4 (t −1,29) | −13,5 (t −2,39) |

1. **`const0.5` er EKKI skaðleg** í w1-4: tap aðeins í ppr og **marktækt
   hvergi**. `const0` tapar hins vegar 11–20 pp — **það** er rökin fyrir því að
   hafa **vog**, og þau stóðu alltaf.
2. **„Merkið snýst við seint" var mælikvarða-villa.** `bins[].delta` er
   `arm − VIÐMIÐ` (`usage-lab.mjs` ~1290), svo jákvætt `const0.5` í w10-18
   slær **spána**, ekki senda ferilinn. Frádrátturinn gefur
   **−0,95 / −0,49 / +1,49** — hún slær sendan feril **aðeins í std**
   (punktmat; skráin ber engin vikmörk fyrir arm-gegn-armi).
3. **Dauða sviðið hefur MÆLDAN KOSTNAÐ.** Það nullar allt `w1-4` (`k = 0..3`),
   svo það fleygir w1-4-hagnaði senda ferilsins — sem er **marktækt jákvæður í
   half-PPR (t 2,34)**, eina marktæka hólfið í bilinu.

`DEAD_GAMES = 4` er því **val sem mælingin styður ekki**, og `deadMeasured`
stendur í `false` af þeirri ástæðu — ekki af því að það sitji „innan
jafnteflis-bands". **Talan er samt EKKI breytt:** sendi ferillinn *með* dauðu
sviði var aldrei í netinu (`usage-lab` mælir `bayes10 = 10/(10+k)`, án sviðs),
svo bæði 4 og 0 eru ómældar. Tillagan (`DEAD_GAMES = 0` eða 2) krefst **nýs
ferils í labinu**; að skipta ómældri 4 fyrir ómælda 0 væri sama tegund
ákvörðunar í aðra átt. Vörður: `tests/usageblend.mjs` kafli 9, sem flettir
tölunum upp **eftir bókuðu sviðunum** (`variable`/`window`/`bin`) og skannar
`JSON.stringify(USAGE_BLEND)` **og hráan skrártexta** — fyrri útgáfa skannaði
aðeins `deadBasis`, og þess vegna lifðu **þrjú** afrit annars staðar í skránni.

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

**EKKI TENGT ENN — EN PÍPULAGNIRNAR ERU KOMNAR.** `data/weekly/` ber 2019–2025
og **ekkert 2026**, því tímabilið hefur ekki verið spilað. Appið **getur ekki**
reiknað notkun-til-þessa í dag — en það er **skráin sem vantar, ekki leiðin að
henni**. Þrennt þarf, í þessari röð, og það þarf að vera til **fyrir viku 5**:

1. pípan skrifar `data/weekly/2026.json` yfir tímabilið — **KOMIÐ**:
   `historyYears()` les yfirstandandi tímabil úr `meta.json` (var harðkóðað
   `[2019..2025]`), `weeklyMinRows` hleypir viku 1 í gegn og cron þriðjudaga
   keyrir `core,history`. Skráin sjálf verður til við fyrstu spiluðu viku.
   Vörður: `pipeline.mjs`, „vikuleg gögn — keðjan".
2. `data.js` fær letihlaðinn `loadWeekly` — **KOMIÐ**: `src/data.js` ber
   `export const loadWeekly = (season) => load("weekly/${season}.json")`, og
   `null` í forleik er **rétt svar, ekki bilun**. Vörður: sami kafli.
3. `weekview.js` blandar með Bayesískum ferli sem er **nánast núll fram að viku
   6** — **EKKI KOMIÐ**. Þetta er það eina sem eftir er af þrennunni.

> **ÞESSI MÁLSGREIN FULLYRTI AÐ LESARINN VÆRI EKKI TIL — EFTIR AÐ HANN VAR
> SKRIFAÐUR**, og sama fullyrðing stóð á tveimur stöðum (hér og í 4g) á meðan
> `WAIVER_CAL.currency` í `src/waivers.js` hafði hana rétta. Úrelt „vantar" í
> skjali er dýrari en úrelt „komið": næsta lota byrjar á að byggja það sem er
> þegar til, og finnur það ekki fyrr en hún er hálfnuð. Vörður:
> `tests/waivers.mjs` kafli 11b, sem ber báðar fullyrðingarnar við `src/data.js`
> — þess vegna er gamla orðalagið **umritað hér og ekki vitnað orðrétt**.

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

- Parað á sömu dröftum, **á sendu reglunni** (`seasonVbd`, gólf 10):
  **gólf 0 − gólf 10 = −0,4 stig á tímabili, t=−0,37, CI [−2,1 · +1,4]**
- Walk-forward val á gólfinu **slær ekki gólf 0 í 12-liða half**: +1,3 (t=0,48)
- Deildirnar **vilja ekki mælanlega ólík gólf**

`10` er þess vegna **nákvæmlega eins defensíbelt og 0**, og `measured: false`
**stendur** — en ekki lengur af vanrækslu. Gildið er val **innan mældrar
afskiptaleysis-bandar**, sem er annað og heiðarlegra en óskoðuð ágiskun.

> **ÞESSAR TÖLUR HREYFÐUST 14.8.2026 OG EIN ÞEIRRA SKIPTI HLIÐ.** Flex-úthlutunin
> var lagfærð (4b-2) og WR-þrepið í 10-liða deildinni fór úr WR30 í WR29. Áður
> stóð hér: gólf 0 − gólf 10 = **+0,5, CI [−0,7 · +1,8]**, og *„walk-forward val
> á gólfinu slær ekki gólf 0: **+3,9 (t=1,37)** í 10-liða PPR"*. Eftir
> lagfæringuna er 10-liða talan **+3,3 en t=2,29**, sem fer yfir `t > 2`-hliðið í
> `waiver-lab`, svo `verdict.minGainMeasurable` **fór úr `false` í `true`**.
>
> **NIÐURSTAÐA APPSINS BREYTIST SAMT EKKI, og hér er af hverju — þrennt:**
> **(1)** Hliðið mælist á þeirri **gjaldmiðils-mynd sem deildin vinnur á**, og
> það er `rosVbd` — sem er **ekki tengdur** (gögnin eru ekki til, sjá næsta
> undirkafla). **Senda reglan** (`seasonVbd`) er áfram ómælanleg og CI hennar
> inniheldur núll. **(2)** Það gerist í **einni** deild af tveimur; 12-liða
> deildin er bitaeins óbreytt. **(3)** Hliðið er `t > 2`, sem er **lausara en
> t-taflan sem þetta repo notar annars staðar** (7 tímabil → 2,447); við þann
> þröskuld hefði ekkert skipt hlið.
>
> **Og lærdómurinn er stærri en talan:** hólf sem færist úr t=1,37 í t=2,29 við
> það eitt að varamanns-þrep WR færist um **eitt sæti** var aldrei sterk
> vísbending. Þetta er sama undirskrift og placebo-familían í 4d — *eitt jákvætt
> marktækt hólf er það sem hávaði lítur út eins og hér.*

> **EITT SKILYRT ATRIÐI FYLGIR:** verði `currency` að rest-of-season byrjar
> **ALGILT** gólf að skaða (gólf 0 − gólf 10 = **+7,1**, CI [3,8 · 10,0]; var
> +5,4, CI [2,2 · 8,2]) og verður þá að vera **hlutfallsreiknað** á vikurnar sem
> eftir eru. Áttin og niðurstaðan eru óbreyttar, talan er stærri.

#### Gjaldmiðillinn — tvær mældar niðurstöður, önnur nothæf

| samanburður | stig/tímabil | t | ár | CI |
|---|---|---|---|---|
| **rosVbdPro − seasonVbd** | **+13,6** | **3,33** | **7/7** | **[7,1 · 21,9]** |
| rosVbd − seasonVbd | +13,3 | 3,52 | 7/7 | [7,3 · 21,1] |
| weekVbd − seasonVbd | **−74,1** | −7,76 | 0/7 | [−90,6 · −56,2] |
| weekRaw − weekVbd | **−115,7** | −17,72 | 0/7 | [−128,9 · −104,5] |

> Endurmælt 14.8.2026 eftir flex-lagfæringuna (4b-2). Áður: **+13,2** (t 2,97,
> 6/7, [5,9 · 22,2]) · +12,3 · −74,6 · −118. **Hver einasta stefna og hver
> einasta ályktun stendur**; ROS fer úr 6/7 í **7/7** og t hækkar. Munurinn
> kemur eingöngu úr `10-2flex`-hólfunum — 12-liða hólfin eru bitaeins.

**Vikuleg spá sem gjaldmiðill er MÆLD DAUÐ** — að elta eina viku þyrlar burt
tímabils-virði — og að sleppa varamanns-þrepinu alveg (hrá vikuleg stig) er
−118 til viðbótar. Það staðfestir sjálfstætt það sem `WAIVER_CAL.currency` hélt
þegar fram: **ábatinn verður að vera í VBD**.

**Rest-of-season vinnur samt yfir tímabils-VBD** (+13,6, jákvætt í **17 af 18**
hólfum, 8 þeirra marktæk hvert fyrir sig — var 6) og það er **ekki tengt af því að gögnin eru ekki komin**: það þarf
vikurnar sem eftir eru og notkun-til-þessa á bak við þær. `data/weekly/` stoppar
í 2025 — **2026 hefur ekki verið spilað** — en leiðin að skránni er komin:
`data.js` ber `loadWeekly(season)` og pípan skrifar yfirstandandi tímabil (sjá
4e, þar sem tvö af þremur skrefum eru **KOMIN**). **Í forleik eru gjaldmiðlarnir
tveir hvort eð er eins**, svo ekkert er tapað í dag; skiptin verða lifandi og
prófanleg í viku 2. Sama plumbing og 4e þarf — og hún þjónar báðum.

#### „Gera ekkert" er rétt oftar en maður vill

- **43,4%** af öllum 2.205 hólfum (var 42,9% fyrir 14.8.)
- Reglan skilar **tómum lista** í **34,7%** af hóp-vikum (`seasonVbd@10`)
- Aðeins **~62%** af framkvæmdum skiptum voru rétt eftir á (`seasonVbd`)
- Vikulegt vinningshlutfall gegn aðgerðalausu sæti er aðeins **51–53%**

Svo `pickupAdvice` sem skilar `[]` er **algengt og rétt**, og forsíðan segir það
berum orðum.

#### Mótherjarnir hálfa áhrifin

Aðgerðalaus mótherja-völlur á móti virkum: **0 til +34 stig** yfir 27 VBD-hólf
(meðaltal +18,4). Season-VBD í 12-half fer **23,6 → 45,4** ef aðeins mitt lið
vinnur vírinn. Hefði hermunin sleppt því hefðu **allar tölur hér lesið um
tvöfalt hærra** — sama villa og stöðuþak-aðeins-á-okkar-liði í `accuracy.js`.

> Bilið stóð sem **+9 til +34 (meðaltal ≈ +24)**; neðra markið var endurmælt
> 14.8. og fór í **+0,3** (`10-2flex|half|rosVbdPro`). Meðaltalið hreyfist varla
> (19,0 → 18,4) og **12-liða hólfin níu eru bitaeins** — allur munurinn er í
> `10-2flex`, sem er lögnin sem flex-lagfæringin snerti (4b-2). **Áhrifin eru
> ekki lengur með gólf**, og það er rétt lesning: í einstöku hólfi er
> mótherja-áhrifið hverfandi. Fullyrðingin sem stendur er **stefnan og
> meðaltalið**, ekki lægsta talan.

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

### 4j. HANDCUFF — SPIKIÐ ER RAUNVERULEGT, OG „HANN SKORAÐI VEL Í SÍÐUSTU VIKU" ER GILDRA

Notandinn spurði um handcuff-leikmenn og benti sjálfur á gildruna:

> „kannski meiddist byrjunarliðsmaðurinn en hann er áætlaður strax í næsta leik,
> þá verður gaurinn sem stóð sig mjög vel ekki relevant."

**Þetta var mælt (`scripts/handcuff-lab.mjs`, 2019–2025, `data/measure/handcuff.json`)
og innsæið er RÉTT — og stærra en það hljómar.**

#### Spikið er raunverulegt og stórt

Vika sem byrjunarmaðurinn spilar ekki, mælt gegn **varamannsins eigin
grunnlínu** (PPR, `out+1`):

| staða | spik | kemst yfir per-leikmanns bootstrap OG 8-sæta placebo-þak |
|---|---|---|
| QB | **+9,32** | **já** |
| RB | **+4,86** | **já** |
| TE | +2,35 | nei |
| WR | −0,30 | nei |

#### Vikuna sem byrjunarmaðurinn kemur til baka er það suð

| staða | vikan eftir endurkomu | hlutfall spiksins sem lifir |
|---|---|---|
| QB | +1,56 | **19,6%** |
| RB | −0,85 | **8,1%** |
| WR | −1,69 | **2,0%** |
| TE | +1,37 | 48,6% |

**Tvær af fjórum stöðum eru ógreinanlegar frá núlli.** RB — sem er staðan sem
fólk sækir á waiver — heldur **8%**.

#### Og ákvörðunin sjálf: hann var startandi í fjarvistarvikunni, þú tókst hann upp

| staða | byrjunarmaður kominn aftur | stig þá vikuna gegn varamanns-línu |
|---|---|---|
| QB | 16,0% | **−11,77** |
| RB | 35,4% | **−2,53** |
| WR | 44,4% | +1,65 |
| TE | 40,6% | **−5,01** |

> **„HANN SKORAÐI VEL Í SÍÐUSTU VIKU" ER EITRAÐUR MÆLIKVARÐI FYRIR PICKUP.**
> Það er fullyrðing um viku sem er **þegar borguð**, og hún er **negatíf í 3 af
> 4 stöðum** um leið og byrjunarmaðurinn er kominn aftur — sem hann er í
> 16–44% tilvika strax næstu viku.
>
> **OG APPIÐ ER ÞEGAR RÉTT:** gjaldmiðillinn í `waivers.js` er `vbd`, ekki spáð
> stig og ekki síðasta vika. `WAIVER_CAL.currency` bókar að vikuleg mynt mælist
> **−74,6 stig/tímabil**. Þessi mæling er **óháð staðfesting á þeirri
> ákvörðun** — úr allt öðru horni. **Ekkert var tengt á þessum gögnum**, því það
> sem þau segja er *hvað á EKKI að gera*, og því er þegar fylgt.

#### Hvað flyst — tvennt, og hvorugt er stórt

- **Hlutdeild í spike-vikunni spáir því sem lifir hjá TE** (+2,53, CI leikmanna
  [+0,39 · +2,31]) og **QB** (+3,61, CI [+0,64 · +3,95]). Ekki hjá RB (CI
  innihaldur núll) né WR.
- **Handcuff FYRIRFRAM** (varamaður á hlaupaglöðu liði, allt skilgreint úr
  fyrstu fjórum leikjum) lifir í **QB/`teamPosTouchG`** (+3,67, t 3,55, 7/7 ár)
  og **TE/`teamPosTouchG`** (+1,25, t 4,05, 7/7 ár). **RB fellur** (t 1,32, CI
  [−0,43 · +1,50]) — og RB er staðan sem hugmyndin er alltaf sögð um.

#### Helmingurinn sem er ekki mælanlegur, og hann er skráður sem slíkur

„Hann er áætlaður strax í næsta leik" er **frétt**, og fréttir eru ekki
bakprófanlegar hér: `news.json` er **rúllandi 50-greina gluggi án safns**,
`injuryNote` er á **28 af ~1.040** leikmönnum og aðeins úr Sleeper (ESPN-fylkið
var mælt og tekið út — **661 af 800** röðum sögðu „Active" og `espnId` var
`null` á öllum 800), og `depth`/`depthPos` er **aðeins núverandi staða**.
Þess vegna er „byrjunarmaður spilaði ekki" skilgreint **úr vikugögnunum sjálfum**
og `depth` er **aldrei notað** í labinu. Nálgun sem lítur út eins og mæling er
versta útkoman.

### 4k. DST — SÆTIÐ SEM VAR ÓRÁÐLAGT, OG MÆLINGIN VALDI ANNAN EIGINLEIKA EN BEÐIÐ VAR UM

Notandinn spilar í tveimur deildum. Önnur byrjar **hvorki spyrnumann né vörn**;
hin byrjar **DST** — og appið sagði ekkert um það sæti. Eitt af níu
byrjunarsætum var utan tölunnar.

Beiðnin var „byggið DST-röðun". **Mælingin sagði nei og byggt var annað.**

#### Það sem var TIL og það sem VANTAÐI — talið áður en nokkuð var skrifað

`scoring.js` bar athugasemd sem sagði að `dstPoints` hefði verið fjarlægt
viljandi því „við eigum engin DST-gögn". Sú fullyrðing var **rétt um
`seasons.json` og `defense.json` og röng um pipeline-heimildina**:

| liður | staða áður | hvar |
|---|---|---|
| `def_sacks`, `def_interceptions` | **sótt og VÖRPUÐ**, en `teamAggregates` henti þeim | `sources/nflverse.mjs` → `team_form.json` |
| `def_tds` | **sótt, ekki vörpuð** — í `objects()`-listanum, ekki í röðinni | sama |
| `def_safeties`, `def_fumbles_forced` | í CSV, aldrei nefnd | `stats_team_week_{ár}.csv` |
| `fumble_recovery_opp`, `fumble_recovery_tds` | í CSV, aldrei nefnd | sama |
| `def_punt_blocks`, `def_pat_blocks`, `def_fg_blocks` | í CSV, aldrei nefnd | sama |
| `special_teams_tds` | í CSV (og í `WEEK_COLS` fyrir leikmenn) | sama |
| stig á sig | **leiðanlegt** úr `homeScore`/`awayScore` | `schedule.json` + `schedule_history.json` |
| **sérliðs-endurheimt aðgreind frá varnar-endurheimt** | **VANTAR OG FÆST EKKI** | — |

Skráin er **138 dálkar** og ber alla tíu stigagefandi liðina. Ekkert vantaði
nema sá síðasti — og hann er mældur kostnaður, ekki ágiskaður (5,0%, neðar).

#### AKKERIÐ — þrjár heimildir, og tvær þeirra eru Sleeper ósammála sjálfum sér

`scripts/dst-lab.mjs` ber okkar tölu við **tvær óháðar Sleeper-heimildir**
(sama tveggja-leiða akkering og skotakortin í FPL-hlutanum, `CLAUDE.md` 6b):

| | n | r | MAE | **rétt upp á stigið** |
|---|---|---|---|---|
| **gegn raunverulegri deild** (`league/{id}/matchups` → `players_points`) | 209 | **0,996** | **0,124** | **90,43%** |
| gegn `stats/nfl/2025/{vika}` (öll 32 liðin) | 544 | **0,997** | **0,108** | **91,18%** |

**Kerfisbundna bilið var raunveruleg regla sem vantaði, ekki hávaði** — og hún
fannst með því að **flokka leifina**, ekki með því að lesa kóðann:

| villa sem akkerið fann | kostnaður |
|---|---|
| **`fumble_recovery_tds` er varnar-TD** og nflverse geymir hann í **öðru sviði** en `def_tds` | MAE **0,306 → 0,112** |
| **`def_fumbles_forced` er stigagefandi (1)** og vantaði alveg | rétt upp á stigið **50,9% → 90,9%** |
| **CSV skilar STRENGJUM** og `n()` í `scoring.js` krefst `typeof === "number"` | hvert svið varð **0**; meðaltal **0,47 stig/viku í stað 7,33** og akkerið las bias nákvæmlega **−7,08** |

Þriðja er lærdómurinn sem á erindi út fyrir DST: **akkerið var skrifað ÁÐUR en
nokkur tala var mæld, og það er þess vegna sem hinar tölurnar eru marktækar.**
Hefði ferillinn milli ára verið reiknaður fyrst hefði hann gefið **r = 0,258**
úr nánast tómri formúlu — og litið alveg venjulega út við hliðina á réttu
tölunni **0,304**.

##### Stig á sig eru EKKI lokastaðan — mælt, ekki ályktað

| formúla | rétt af 527 |
|---|---|
| heil lokastaða andstæðingsins | 90,3% |
| aðeins sóknarstig andstæðingsins (TD+FG+PAT+2pt) | 94,7% |
| **lokastaða − 6·(varnar-TD andstæðings) − 2·(safety andstæðings)** | **99,6%** |

Endurkomu-TD á sérliði er **talinn með** (útgáfan sem dró hann líka frá féll í
95,1%). Tvær raðir standa eftir (ARI vikur 5 og 15) þar sem Sleeper færði
`fumble_recovery_tds` andstæðingsins á sóknina.

##### SLEEPER ER ÓSAMMÁLA SJÁLFUM SÉR — og deildin er heimildin

`stats`-endapunkturinn birtir `pts_std` með **`pts_allow_14_20 = 0`**.
Raunveruleg deild skorar þá röð **1**. Mælt á **209 sameiginlegum röðum**:
**160 eru jafnar** og **49 skeika** — og leifar-histogrammið er **eitt stak,
`+1 × 49`**. Að hver einasta skekkja sé sömu stærðar og sama formerkis er það
sem gerir „ekkert annað bil skeikar" trúverðugt; dreifðist hún á fleiri bil
bæri histogrammið fleiri en eitt stak. Bils-eignunin sjálf (pa=14…20) kemur úr
per-gildis-leiðslunni hér að neðan, ekki úr þessari talningu.

> Hér stóð áður **195 / 43 / 152**. Þær tölur voru úr eldri keyrslu og
> `DST_ANCHOR.sleeperSelfDisagreement` í `scoring.js` hafði borið 209/160/49
> síðan lab-ið var endurkeyrt — prósi og vélsvið sögðu sitt hvað í sömu skrá.
> Prófið las **aðeins vélsviðið**, svo prósinn var óvarinn. Kafli 10 í
> `tests/dst.mjs` les nú tölurnar **út úr prósanum** í báðum skrám og ber þær
> við akkerið.

Þröskuldarnir eru **leiddir út per staka `pts_allow`-tölu (0…52)**, ekki teknir
úr skjölun: hvert einasta gildi ber **eina** leif (pa=14…20 gefur 0 í 130 af
132 röðum í `stats`-heimildinni; pa=21…27 í 149 af 155).

Sá sem akkerar gegn `stats`-endapunktinum verður að nota 0, annars mælist hann
+1 úr engu: með deildar-töflunni fer sú keyrsla úr **91,2% í 70,6%**, sem er
**ekki villa í formúlunni**.

##### DST-STIGAGJÖFIN ER AKKERI, EKKI KÓÐI Á LEIÐINNI Á SKJÁ

Hér stóð áður: *„Þess vegna les appið reglurnar úr deildinni
(`dstRulesFromSettings`) og notar `BASE` aðeins þegar deildin nefnir regluna
ekki — og segir þá frá því (`missing`)."* **Sú setning var ósönn og hafði alltaf
verið það.** `dstPoints`, `dstBracket`, `dstPointsAllowed` og
`dstRulesFromSettings` hafa **núll kallendur í `src/`** — aðeins
`scripts/dst-lab.mjs` og `tests/dst.mjs` kalla þau. `missing`/`unmodelled`/
`warnings` ná því aldrei á skjá, og engin DST-verðlagning er til í waiver né
MyTeam.

**Og það á ekki að laga með því að víra þau, því hin leiðin var mæld og vann.**
Vikuleg DST-ákvörðun appsins er **streymi eftir væntu skori mótherjans**
(+3,82, t 5,75, **6/6 ár**), og að raða vörnum eftir stigum tapar fyrir því
(röðun eftir stigum í fyrra +0,77, t 1,16, 3/6; blöndun **kostar** 3,82 → 1,92).
Að reikna DST-stig úr deildarreglum og raða eftir þeim er nákvæmlega sú
töpuðu leið. DST er auk þess **viljandi utan A-Ranking** í draftinu
(`build.js`, `advice.js`), svo þar er heldur enginn staður fyrir töluna.

**Til hvers eru föllin þá?** Þau eru **heimildin fyrir tölunum í þessum kafla**:
`DST_ANCHOR` (r 0,996 / MAE 0,124 / 90,4% upp á stigið gegn raunverulegri deild)
er til af því að formúlan var skrifuð og akkeruð gegn tveimur óháðum heimildum.
Það er nákvæmlega skilyrðið sem `scoring.js` setti sjálfur áður en fallið mátti
koma aftur. Akkerað lab-fall sem ber sitt eigið próf er ekki dauður kóði í sama
skilningi og `ppts` í `standings.js` — **en munurinn verður að vera skrifaður,
annars les næsti maður README og heldur að appið geri þetta.**

Vörður: **`tests/dst.mjs` kafli 10**. Hann telur raunverulega kallendur í `src/`
og fellur **í báðar áttir** — bæði ef einhver vírar þau án þess að leiðrétta
þennan kafla, og ef kaflinn er endurskrifaður svo hann fullyrði vírun sem er
ekki til.

##### Leifin sem eftir stendur er TALIN, ekki kölluð hávaði

| flokkur | raðir af 544 |
|---|---|
| **sérliðs-endurheimt skoruð 2, Sleeper skorar 1** (nflverse aðgreinir hana ekki) | **27** (5,0%) |
| forced-fumble talning nflverse ≠ Sportradar | 8 |
| sack-talning nflverse ≠ Sportradar | 7 |
| óleyst | 6 |

Sá fyrsti er **efra þak á nákvæmninni með þessum gögnum** og hann er
skjalaður í `scoring.js`, ekki falinn. Sex heimildir voru ekki eltar: það er
ekki þess virði að sækja aðra heimild fyrir 5% af 27 röðum þegar ákvörðunin
sjálf reyndist vera allt annað mál (neðar).

#### 1. FLYST ÁRANGUR VARNAR? — já milli ára, nei milli vikna

7 tímabil, **3.742 liðsvikur**:

| | n | r |
|---|---|---|
| **milli ára**, stig í leik | 192 | **0,304** |
| tveggja ára bil | 160 | 0,076 |
| stök vika gegn slétt viku (sama tímabil) | 224 | 0,220 |
| fyrri helmingur gegn seinni | 224 | 0,188 |
| **vika N → vika N+1** | 3.518 | **0,049** |

Til samanburðar: **spyrnumenn 0,16**, RB/WR/TE **0,68–0,73**. Vörnin er því
**tvöfalt stöðugri en spyrnumaður** milli ára — og það er einmitt ástæðan fyrir
því að freistnin að raða henni er raunveruleg. Topp-8 í fyrra halda sér í
topp-8 í **43,8%** tilvika (tilviljun 25%), og „draftaðu topp-5 í fyrra" er
**+15,5 ± 3,6 stig** yfir tímabilið (t=4,30, **6/6 ár**).

**Vika-til-viku er hins vegar 0,049.** „Heit vörn" er ekki til.

#### 2. OG SAMT — RÖÐUN TAPAR, STREYMI VINNUR MARGFALT

Gangandi áfram, efsti valinn hverja viku, mælt gegn **meðaltali þeirra sem
spila þá viku** (ekki allra 32 — lið í fríi er ekki kostur):

| regla | stig | umfram | t | ár |
|---|---|---|---|---|
| röð eftir stigum **í fyrra** | 8,10 | +0,77 | 1,16 | 3/6 |
| röð eftir stigum **það sem af er** | 8,47 | +1,14 | 1,83 | 5/6 |
| **STREYMI: lægsta vænta skor mótherja** | **11,15** | **+3,82** | **5,75** | **6/6** |
| eigið vænta skor | 8,96 | +1,63 | 2,74 | 6/6 |
| streymi + hálft vægi á röðina | 9,62 | +2,30 | 4,01 | 6/6 |
| streymi + fullt vægi á röðina | 9,25 | +1,92 | 3,48 | 6/6 |
| orakel (fullkomin vitneskja) | 22,86 | +15,53 | — | 6/6 |
| **placebo-fjölskylda (8 slembin arm)** | — | **þak +0,26** | — | — |

**Í raunverulega hópnum snýst röðin við.** 12-liða deild draftar 12 varnir, svo
það sem má raunverulega skipta um er **restin**. Hópur takmarkaður við þá sem
voru **ekki** í topp-12 í fyrra:

| regla | umfram | t | ár |
|---|---|---|---|
| röð eftir stigum í fyrra | **−0,82** | −1,66 | **0/6** |
| **STREYMI** | **+3,96** | **6,86** | **6/6** |

Röðin er því ekki bara veik á vírnum heldur **neikvæð, í öllum sex árum**. Og
**hvert vægi á hana lækkar ábatann** (+3,82 → +2,30 → +1,92): hún er ekki
bara gagnslaus, hún þynnir merkið.

Heilt tímabil, beint einvígi: að **halda** bestu vörn fyrra árs gefur
**63,2 stigum minna** en að streyma (t=3,01, **5/6 tímabil**). Eina árið sem
streymið tapar er 2022 (DAL, −29).

> **HÆRRI FYLGNI ≠ BETRI ÁKVÖRÐUN, ENN EINU SINNI.** Ferillinn milli ára
> (r 0,304) er **raunverulegur og margfalt sterkari en spyrnumannsins**, og
> hann er samt **ekki nothæfur**: hann lifir *innan* topp-12 sem eru draftaðir,
> og á vírnum er hann neikvæður. Þetta er sama niðurstaða og `aron/verð` í
> FPL-hlutanum og `prevCarG` hér — merki sem mælist er ekki merki sem má nota.

#### Hvað var byggt

**Streymi, ekki röð.** `dstStream` í `src/weekview.js` og hlutinn
**„Defence this week"** í `src/Dashboard.jsx`, sýndur **aðeins** í deild sem ber
`DEF` í `roster_positions` — kassi sem kviknar á deild án varnarsætis er
hávaði, og hávaði er lærður sem eitthvað sem maður hunsar.

**`RANKED_POS` í `waivers.js` og `aRank`-útilokunin í `build.js` STANDA
ÓBREYTT.** Þær voru réttar; þær eru nú mældar fyrir DST sérstaklega en ekki
aðeins fyrir K. **Engin season-röð á vörnum var byggð** — hún væri ómæld tala
við hliðina á mældri.

`Gain` er **ekki** birt per vörn og það er ásett: labið mælir hvað **efsti**
kosturinn skorar umfram meðaltal, ekki hvað hver vörn skorar. Að hengja +3,82 á
hverja röð væri að selja hópmælingu sem einstaklingsspá.

**NULL-agi.** Þrjár ólíkar tegundir af engu, og þær mega ekki ruglast saman:
lið í **fríi** (engin röð í leikjaskrá), leikur **án línu** (mótherji þekktur,
tala ekki til) og **forleikur** (ekkert vikusamhengi). Allar þrjár skila `null`,
birtast sem „—" og **sitja síðast í BÁÐAR áttir** (`compareOppImplied`; naive
`a - b` gerir `null` að 0 og fleytir liði í fríi **efst** í „lægsta vænta skor",
sem er sannprófað í `tests/dst.mjs` kafla 8).

**„Engin lína" er NORMAL ÁSTAND í þessari skrá, ekki jaðartilfelli** — og það
er *invariantið*, ekki talan. Hér stóð „línur opnar í **vikum 1–3 og hálfri
viku 4** af 18" og það var rétt **12.8.2026**; 18.8. voru vikur 1–6 fullar og
vika 7 hálf (112 af 272 leikjum 2026). **Bókmakarar opna eftir sinni eigin
klukku, svo talan hreyfist í hverri viku** — hún er dæmi með dagsetningu, ekki
fasti (sama regla og VBD-tölurnar í 4b).

Þess vegna er ekkert próf pinnað á hana: `tests/dashboard.mjs` kafli 3g les
DST-töfluna af skjánum og krefst **minnst tveggja af þremur tegundum af engu**
og prentar hverjar hann sá, í stað þess að krefjast þess að ein tiltekin sé í
skránni í dag. Fyrsta útgáfa þess prófs gerði það og **féll á réttum kóða** —
hún var fullyrðing um bókmakara, ekki um appið.

**Og línurnar eru ferskar þegar það skiptir máli:** `schedule.json` er skrifuð
í `stageCore`, sem gengur **daglega kl. 09 UTC**, svo leikur vikunnar hefur
línu þegar ráðgjafar-bókhaldið (7c) skrifar sína röð 48 klst fyrir fyrsta leik.
Það eru **seinni** vikurnar sem eru tómar, og þær eiga að vera það.

#### Það sem er EKKI þess virði að gera — skráð svo það verði ekki reynt aftur

- **DST-röðun í `aRank` eða á draftborðið.** Mælt og fellt hér að ofan.
- **Að blanda fyrra tímabili inn í vikulega valið.** Mælt: kostar 1,5–1,9 stig
  á viku.
- **„Heit vörn" / síðustu vikur sem merki.** r = 0,049 vika-til-viku.
- **Að elta sérliðs-aðgreininguna í aðra heimild.** 27 raðir af 544, +1 stig
  hver, og formúlan er nú þegar rétt upp á stigið í 90%+ tilvika. Kostnaður og
  ábati eru ekki í sama stærðarflokki.
- **Að nota `stats`-endapunktinn sem sannleiksgildi.** Hann er ósammála
  deildinni sem notandinn spilar í, í 22% liðsvikna.
- **`yds_allow_*`-bónusar.** Ekki reiknaðir — deild sem ber þá fær það **sagt**
  (`unmodelled`), ekki þagað.
- **Hvað það KOSTAR að ná efsta kostinum** (waiver-forgangur, FAAB). Labið
  mælir hvað hann skorar, ekki hvað hann kostar. **Ómælt og því ófullyrt.**

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

> **TVENNT ANNAÐ FANNST OG VAR EKKI BREYTT** (11.–13.8.), því hvort um sig
> hreyfir **hvert varamanns-þrep** og þar með allar mælingar sem
> `shapes_sleeper.json` og `half.json` bera:
> - `replacementRanks` úthlutar flex-sætum með `Math.round` **per stöðu**, svo
>   úthlutuðu sætin summast ekki: 10-liða 2FLEX fær **21 sæti fyrir 20**
>   (RB 7 + WR 10 + TE 4), 14-liða 2FLEX fær **27 fyrir 28**.
> - `league.flexPos` er **hunsað**: `FLEX_SPLIT` er harðkóðað RB/WR/TE, svo
>   `REC_FLEX`-deild myndi samt ýta RB dýpra. Hvorugt er lifandi í deildum
>   notandans (báðar nota RB/WR/TE-flex).
>
> **BÁÐAR VORU MÆLDAR OG BÁÐAR LAGFÆRÐAR 14.8.2026 — sjá 4b-2.** Ástæðan til að
> láta þær standa var að lagfæringin gæti ómerkt allt sem var mælt. Sú áhyggja
> var **rétt en ómæld**, og ómæld áhyggja er sama tegund af tölu og ómæld vog:
> hún getur verið bæði stór og lítil og ekkert í skjalinu greindi þar á milli.

### 4b-2. FLEX-SÆTIN SUMMUÐUST EKKI — mælt 14.8.2026, og LAGFÆRT

Spurningin var einföld og hún hafði ekki verið spurð: **hreyfist borðið?**
`scripts/flexsplit-lab.mjs` svarar henni. Gamla hegðunin er geymd í
`scripts/lib/flexsplit-legacy.mjs` **nákvæmlega þess vegna** — spurningin er
ósvaranleg eftir á nema báðir armarnir séu til, og lab sem bæri núverandi kóða
við sjálfan sig fengi rho = 1,000 af rangri ástæðu.

**Harness:** `buildRows` — app-leiðin, 555 raðir með `aRank`, `players.json`
sha1 `6b3459ff55f7`, 14.8.2026. Legacy-armurinn er settur inn með **textaskiptum
úr `src/model.js`** í hverri keyrslu, svo hann getur ekki rekið frá honum; tvö
hlið deyja fremur en að mæla kóðann gegn sjálfum sér.

#### Fyrst: hvað er rangt, og hversu einhliða það er

Sætin summuðust ekki í **5 af 13** lögnum, og `flexPos` var hunsað í einni til
viðbótar. Og það er **ekki námundunarsuð heldur skekkja með formerki** — í
10-liða deildinni fór aukasætið **allt á WR**:

| lögn | gamalt | rétt (Hamilton) | sæti |
|---|---|---|---|
| **10-liða 2FLEX (Patriots)** | RB 27 · **WR 30** · TE 14 | RB 27 · **WR 29** · TE 14 | **21 fyrir 20** |
| 8-liða 1FLEX | RB 19 · WR 28 · **TE 10** | RB 19 · WR 28 · **TE 9** | 9 fyrir 8 |
| 14-liða 1FLEX | **RB 33** · WR 49 · TE 17 | **RB 32** · WR 49 · TE 17 | 15 fyrir 14 |
| 14-liða 2FLEX | RB 37 · WR 41 · **TE 19** | RB 37 · WR 41 · **TE 20** | 27 fyrir 28 |
| 10-liða 2FLEX, flex tekur WR/TE | RB 27 · WR 30 · TE 14 | **RB 20** · WR 34 · TE 16 | 21 fyrir 20 **og** `flexPos` |
| 12-liða 1FLEX, flex tekur RB/WR | RB 28 · WR 42 · **TE 14** | RB 29 · WR 43 · **TE 12** | summaðist, en `flexPos` hunsað |

`WRRB_FLEX` og `REC_FLEX` eru **raunverulegir Sleeper-reitir** sem
`startersFromRoster` þekkir nú þegar (`FLEX_KINDS`), svo seinni villan var
aðgengileg úr hvaða innfluttri deild sem er — hún var bara ekki í þessum tveimur.

> **OG APPIÐ VAR ÓSAMKVÆMT VIÐ SJÁLFT SIG:** `lineup.js` (`slotsFor`) og
> `accuracy.js` (`startersRaw`) **lásu `flexPos` allan tímann** þegar þau fylltu
> byrjunarliðið; það var **eingöngu VBD-grunnlínan** sem gerði það ekki. Deild
> með `REC_FLEX` stillti því upp réttu liði og verðlagði það á röngum varamanni.
> Vörður: `tests/model.mjs` kafli 8b, liður (c).

> **OG LAGFÆRINGIN OPNAÐI SJÁLF ÞRIÐJU MYNDINA AF SÖMU VILLU — fundin við
> yfirferð 15.8.2026, löguð í sömu ferð.** Síunin `flexPos.filter((p) =>
> FLEX_SPLIT[p] > 0)` gat skilað **tómum lista** — `["QB"]`, `["K","DST"]`,
> eða einfaldlega lágstafir, því `normalizeLeague` hleypir **hverjum streng**
> í gegn. Tómur listi gefur `apportion` engan lykil, hann skilar `{}`, og
> **öll flex-sætin hverfa þegjandi**: 10-liða 2FLEX fær QB10/RB20/WR20/TE10,
> þ.e. **0 af 20** úthlutað. Það er nákvæmlega sá ósamræmi sem 4b-2 var
> skrifað gegn — sætin summast ekki — bara í **hina áttina og tuttugufalt
> stærra**: gamla hegðunin gaf einu sæti of mikið, þessi gaf tuttugu of lítið.
> Tóm sía er nú meðhöndluð eins og enginn listi (fall aftur í `FLEX_SPLIT` í
> heild). **Hvorug deild notandans kemst nálægt þessu** (báðar RB/WR/TE úr
> Sleeper, og `SUPER_FLEX` er þátta á undan `FLEX_KINDS`), svo engin birt tala
> hreyfist — þetta er vörn að framtíð. Vörður: `tests/model.mjs` kafli 8b,
> liður (d2); stökkbreyting sem tekur fallbackið út fellir **7 fullyrðingar**.

`FLEX_SPLIT` segir að WR eigi **9,54 af 20** sætum; kóðinn gaf 10. **Hamilton
(largest-remainder) er því ekki ný mæling heldur rétt heiltölu-lesning á þeirri
sem var þegar til** — hlutföllin sjálf haggast ekki.

#### Svarið: borðið hreyfist í 10-liða deildinni og EKKI í 12-liða

| | Patriots (10, 2FLEX) | Sófahetjur (12, 2FLEX) |
|---|---|---|
| varamanns-þrep | **WR 30 → 29**, annað eins | **bitaeins óbreytt** |
| Spearman rho | **0,999262** | **1,000000** |
| raðir sem hreyfast | 429 af 555 | **0** |
| topp 12 | **2 hreyfast (max 1 sæti)**, hópurinn sá sami | 0 |
| topp 24 | 7 hreyfast (max 2), hópurinn sá sami | 0 |
| topp 50 | 20 hreyfast (max 5), **1 nýr í hópnum** | 0 |
| topp 100 | 60 hreyfast (max 7), 2 nýir | 0 |

**12-liða deildin er óbreytt af arithmetískri ástæðu, ekki af heppni:** 24 sæti
deilast nákvæmlega (RB 7,92 · WR 11,448 · TE 4,632 → 8/11/5 = 24) hvort sem
námundað er per stöðu eða með Hamilton.

**Í 10-liða deildinni er áttin sú sama alla leið:** WR-þrepið var einu sæti of
djúpt, svo hver WR fékk VBD sem `FLEX_SPLIT` styður ekki. **Sendinga-móttakarar
falla og hlauparar hækka.** Efsta hreyfingin er á **1.10 — vendipunkti
10-liða drafts**:

| | gamalt | rétt |
|---|---|---|
| Chase Brown (RB) | 11 | **10** |
| Jaxon Smith-Njigba (WR) | 10 | **11** |
| Josh Jacobs · David Montgomery (RB) | 39 · 40 | 36 · 37 |
| Quinshon Judkins (RB) | 50 | **45** |
| Garrett Wilson · Tee Higgins (WR) | 44 · 45 | 47 · 48 |
| Mike Evans (WR) | 49 | **51 — út úr topp 50** |

#### Og hvað það kostaði: **ekkert bókað hlutfall skipti formerki eða marktækni**

Átta lab lesa `replacementRanks` (`handcuff-lab` gerir það líka en notar
`normalizeLeague({})` — 12 lið, einn flex — og er því **bitaeins óbreytt**).

> **TALNINGIN VAR ÓFULLKOMIN: ELLEFU SKRIFTUR FLYTJA INN `replacementRanks`,
> EKKI TÍU** (leiðrétt 15.8.2026). Sú sem vantaði er **`h2h-lab.mjs`**, og hún
> vantaði af saklausri ástæðu — hún var skrifuð **eftir** lagfæringuna, svo hún
> hefur aldrei séð gamla kóðann og átti aldrei „fyrir"-arm. Hún ber það meira að
> segja sjálf: `data/measure/h2h.json` var skrifuð `2026-08-14T22:57` og geymir
> `shapeGuard.legacyDrift` = *„10-2flex.WR: waiver.json 30 vs her 29 … skýrt af
> apportion-lagfæringunni"*. **En það þýðir að committuð mæling hvíldi á
> ócommittuðum kóða** þangað til þessi ferð — h2h.json var í `ecd8533`, `model.js`
> hvergi. Væri lagfæringunni hent núna stæði eftir mæling sem **enginn committaður
> kóði getur endurgert**. Það er sjálfstæð ástæða til að hún lendi, og hún er
> skráð hér svo talningin „átta/ellefu" sé rétt næst þegar einhver telur.
**Þrjú voru keyrð í BÁÐUM örmum** — og akkerið fyrst, því annars væri
samanburðurinn ómarktækur: **`shapes_sleeper.json`, `shapes_fftoday.json`,
`measure/half.json` og `measure/ecr_duel.json` voru endurgerðar UPP Á BITANN úr
gamla kóðanum** áður en honum var breytt, svo hver munur hér á eftir er
lagfæringin og ekkert annað. Hin fimm (`vbdbase`, `shrink`, `opp`, `agecurve`,
`waiver` — sem öll bera `10-2flex`) voru **endurgerð með lagfærða kóðanum og
borin við committuðu skrárnar**, sem eru sami hlutur og legacy-armurinn af
nákvæmlega sömu ástæðu.

| bókuð fullyrðing | fyrir | eftir |
|---|---|---|
| `shape-lab` gegn ADP | **12 af 12** gildum lögnum, +169 til **+314,2** | **12 af 12 eins; efra markið +344,7** |
| `shape-lab` gegn hrárri röð | **14 af 16** | **eins** |
| sama á FFToday | 3 af 12 · 10 af 16 · verst −133,1 | **eins** |
| `half-lab` Sófahetjur | +147,4 (10/11, t 3,44) | **bitaeins eins** |
| `half-lab` Patriots ppr | +188,0 (11/11, t 4,10) | **+186,1** (11/11, t 4,09) |
| `half-lab` Patriots **half** | +175,6 (11/11, t 3,48) | **+182,9** (11/11, t 3,84) |
| `ecr-duel` Patriots | +148,0 (8/10, t 2,04) | +145,1 (**9/10**, t 2,06) |

Fjögur hólf í `shape-lab` breytast (8-std og 14-std × tvær stigagjafir) og
**hvorugt merki snýst**: ppr 8-std gegn hrárri röð fer **+66,8 (t 1,72, 4/5) →
+99,0 (t 2,91, 5/5)** og ppr 14-std **+129,4 (t 1,73) → +104,9 (t 1,34)** — bæði
punktmöt jákvæð fyrir og eftir, og hvorugt fer yfir eða undir marktæknimörkin á
þann veg að niðurstaðan breytist. **Hin lögnin tólf eru bitaeins.**

#### Hin fimm labin: 10-liða hólfin hreyfast, 12-liða hólfin eru BITAEINS

Þetta er sterkasta einstaka staðfestingin á að lagfæringin geri það sem hún á að
gera og ekkert annað. Í hverju einasta labi var hvert hólf borið saman:

| lab | hólf sem breytast | hólf sem eru bitaeins |
|---|---|---|
| `vbdbase` | **96** (öll `10-2flex`) | **210** (öll `12-2flex` og `12-generic`) |
| `shrink` | **2** (bæði `10-2flex\|ppr`) | **12** |
| `agecurve` | **2** (bæði `10-2flex`) | **8** |
| `waiver` | `10-2flex`-hólfin | níu `12-*`-hólf, þar á meðal `12-2flex\|half` **upp á aukastaf** |

**Ekki eitt einasta 12-liða hólf hreyfðist í neinu labi.** Það er ekki heppni:
24 flex-sæti deilast nákvæmlega, svo úthlutunin er sú sama hvor leiðin sem er
farin — og þar með er hermunin, RNG-röðin og hvert einasta bootstrap-bil óbreytt.

**Ályktanirnar standa allar**, en tvær tölur skiptu hlið og þær eru skrifaðar
niður þar sem þær eiga heima, ekki faldar hér:

| lab | hvað breyttist | stendur ályktunin? |
|---|---|---|
| `vbdbase` | **0 af 153** óbreytt; tímabils-klösuðu hólfin 31 → 28 | **já** — sjá 4c |
| `shrink` | `verdict.headline` **stafrétt eins**, `qualifyingCombinations` áfram tómt | **já** |
| `opp` | `prevCarG` +24,4 → **+23,8**; placebo-þak +21,7 → +21,3; `ppr−standard` útilokar núll í **1/11 → 0/11** | **já, og styrktist** — sjá 4d |
| `agecurve` | walk-forward marktæk **0/10 → 1/10**, LOSO 2/10 → 3/10; `held` áfram `false` | **já** — sjá 4a |
| `waiver` | `minGainMeasurable` **`false` → `true`** (10-liða, á ótengdum gjaldmiðli) | **já fyrir sendu regluna** — sjá 4g, þar sem hliðið er tekið í sundur |

> **TVÖ HLIÐ SEM SKIPTU UM SVAR VIÐ EITT SÆTI ERU EKKI SÖNNUN UM AÐ EITTHVAÐ HAFI
> BROTNAÐ — ÞAU ERU MÆLING Á ÞVÍ HVE ÞUNN ÞAU VORU.** `agecurve`-hólfið og
> `waiver`-gólfhliðið færðust bæði yfir marktæknimörk við það eitt að
> varamanns-þrep WR færðist um **eitt sæti** í **einni** af lögnunum. Repo-ið á
> þegar orðin yfir þetta (4d: *„eitt jákvætt marktækt hólf er það sem hávaði
> lítur út eins og hér"*), og báðar hafnanirnar standa af sjálfstæðum ástæðum
> sem eru útskýrðar á sínum stað.

> **HVAÐ ÞESSI LAGFÆRING ER OG HVAÐ HÚN ER EKKI.** Hún er **rétt lesning á
> mældri tölu**, ekki mæld bæting. Við þessa áhrifastærð er ekki hægt að mæla
> hvort nýja borðið **draftar betur** — `shape-lab` og `half-lab` lesa flatt, og
> það á að standa hér berum orðum. Rökin eru: 20 sæti eru til, 21 voru gefin,
> aukasætið fór allt á eina stöðu, og `FLEX_SPLIT` segir aðra tölu en kóðinn
> notaði. **Að selja hana sem forspárbætingu væri ómæld tala sem lítur út eins
> og mæling.**

> **`flexPos`-helmingurinn er VÖRÐ AÐ FRAMTÍÐ, ekki lagfæring á lifandi tölu** —
> báðar deildir notandans nota RB/WR/TE-flex. Og eitt í honum er **ekki mælt og
> er sagt vera það**: hlutföllin eru **endurnormöluð** á þær stöður sem flexið
> tekur, en `FLEX_SPLIT` var mælt á RB/WR/TE-flexi, svo sannur RB/WR-split er
> **ómældur**. Endurnormölun er samt eina svarið sem tapar ekki sætum (RB+WR eitt
> summast í 0,807, svo 20 sæti yrðu 16). **Fjöldi sætanna er mældur; skiptingin
> innan hlutmengis er varfærin nálgun.**

**Vörður: `tests/model.mjs` kafli 8b**, og hann er byggður á invariantinu því
tölurnar hér að ofan reka með `players.json`: sætin **summast** yfir 72+9 lagnir,
hver staða er **innan kvóta síns** (sjálfstæð einkennun, ekki endurkeyrsla á
Hamilton), `flexPos` er virt, og **gamla hegðunin verður að FALLA á
summu-invariantinu** (23 af 72) — annars væri það fullyrðing sem getur ekki
brugðist. **Fimm stökkbreytingar felldar**, og sú fimmta afhjúpaði holu í fyrstu
útgáfu kaflans: `sum = 1` (engin endurnormölun) stóðst **bæði** summuna og
kvótann, því leifar-umferðin hringsólar og fyllir upp í 20 á meðan skiptingin er
röng. Handreiknuð hlutföll fyrir hlutmengin voru sett inn af þeirri ástæðu.

### 4l. `FLEX_SPLIT.TE` — MÆLD Á LÖGUN SEM HANN SPILAR EKKI, OG SAMT STENDUR HÚN (18.8.2026)

**Einkennið sem úttekt sá:** öll **tólf** stærstu „Value vs market"-kaupin á
borðinu eru þéttendar — Gunnar Helm **+11,2 umferðir**, Strange +9,0, Kincaid
+8,3, Hockenson +8,0. Hann byrjar **einn** þéttenda. Endurmælt hér á sama borði:
`mean(ADP − aRank)` er **TE −70,9** á móti **WR −147,5** í 10-liða PPR-deildinni
— þéttendar sitja **76,6 sætum ríkari** en sendingamóttakarar. Sama merki í
half-deildinni (TE −67,0 · WR −126,3, 11 af 12 efstu kaupum þéttendar).

**Reikningurinn er réttur.** Þetta er ekki villa heldur **ágreiningur um
stöðu-kvörðun**, og hann rekur allur til einnar tölu: `FLEX_SPLIT.TE = 0,193`
→ `replacementRanks` → `computeVbd` → `aRank`.

> **OG ÞAÐ ER EKKI TILEFNI TIL AÐ STILLA HANA AÐ MARKAÐINUM.** Öll mælda
> forsenda appsins er að A-Ranking **SLÁI** markaðinn (+186,1 í 10-liða PPR,
> +147,4 í 12-liða half, +2,5 sigrar/tímabil). Að vera sammála ADP er ekki
> markmiðið; **ágreiningur er varan**. Spurningin er eina: er ÞESSI ágreiningur
> raunverulegt forskot eða kvörðunar-villa — og hún er **útkomu-spurning**,
> ekki samræmis-spurning.

#### Hvað talan er, og þrennt sem athugasemdin sagði EKKI

| | |
|---|---|
| hvaðan | `scripts/calibrate.mjs` → `data/calibration.json`, mæld 9.8.2026 |
| hvernig | **eftir-á tíðni**: í hverri viku raðað eftir RAUNSTIGUM vikunnar, þeir utan fastra sæta teknir, topp-N taldir |
| úrtak | 2020–2025, 38.710 leikmanna-vikur |
| **lögnin** | **12 lið · RB2/WR3/TE1 · EITT flex · FULL PPR** |
| vikmörk | **engin** |
| út fyrir úrtak | **ekkert** |
| útkoma mæld | **aldrei** |

**HVORUG DEILD NOTANDANS ER ÞESSI LÖGN.** Patriots eru 10 lið, WR2, **TVÖ**
flex; Sófahetjur eru 12 lið, WR2, tvö flex, **half-PPR**. Talningin var því
dregin út í `scripts/lib/flex-occupancy.mjs` (**flutt, ekki afrituð** — sannreynt
bitaeins gegn gömlu útfærslunni áður en hún var fjarlægð) og keyrð á hans lögnum:

| lögn | RB | WR | **TE** | TE-bil yfir 6 tímabil |
|---|---|---|---|---|
| `calibrate.mjs` (12, WR3, 1 FLEX, ppr) — **þaðan kemur 0,193** | 0,329 | 0,478 | **0,193** | 0,130 – **0,352** |
| **Patriots** (10, WR2, 2 FLEX, ppr) | 0,179 | 0,749 | **0,073** | 0,044 – 0,144 |
| **Sófahetjur** (12, WR2, 2 FLEX, half) | 0,240 | 0,677 | **0,083** | 0,058 – 0,148 |

Í deildunum sem hann spilar segir **sama talningin 0,073 og 0,083** — minna en
**helmingur** af 0,193, og lægra en ágiskunin **0,10** sem 0,193 kom í stað.
Mekanisminn er einfaldur: með WR2 í stað WR3 fellur WR-skurðurinn úr WR36 í
WR20/WR24, svo raunverulega góðir sendingamóttakarar hrynja í flex-laugina og
fylla hana. **Þetta er þriðja tilvikið í þessari viku af „fittað á lögn sem hann
spilar ekki".**

> **EN TÍÐNI ER EKKI ÁKVÖRÐUN, OG TALNINGIN SJÁLF ER LÖSK SEM MARKMIÐ.** Hún
> telur hvað **alvitur** stjórnandi HEFÐI flexað, svo hún mælir að hluta **hve
> margir spila stöðuna** — 432 sendingamóttakarar á móti 220 þéttendum — ekki
> virði jaðar-mannsins. Þess vegna er hún **samhengi hér og ekki dómari**.
> Dómarinn er sveipurinn.

#### Sveipurinn — sömu vélar, engin ný

`FLEX_SPLIT.TE` er sveipað **0 → 0,40** með **RB:WR haldið föstu** innbyrðis
(0,330:0,477 endurnormað) — einn frelsisgráður, því það var TE sem var í deilu.

**Hvorug hlið er ný skrifta.** `vbdbase-lab.mjs --tesweep` og
`h2h-lab.mjs --tesweep` skipta AÐEINS út afbrigða-skránni og úttaks-heitinu; að
skrifa nýtt lab hefði kallað á **afrit** af sjálfsprófi, báðum bootstrap-unum,
akkerunum og walk-forward-inu. Varamanns-þrepin koma úr **PATCHUÐU afriti** af
`src/model.js` (`scripts/lib/te-sweep.mjs`) — **ekki úr afriti af `apportion`**,
sem er nákvæmlega sú villa sem `buildTeamMetrics` kostaði í FPL-verkefninu.

**FJÖGUR HLIÐ, ÖLL DAUÐHLIÐ:**

1. **Þvert akkeri (stig).** `k1-raw` er sama regla með SENDU þrepunum;
   `te0.193` er sama regla með þrepunum úr patchaða afritinu. Þau eru
   **bitaeins í öllum 198 (fruma × tímabil)**.
2. **Nullhlið (sigrar).** Sent gildi gefur **nákvæmlega 0,000** sigra, stig og
   titla í öllum frumum — nákvæmt að byggingu, því `arankBoard` fær þrepin sem
   viðfang.
3. **Patchið er lifandi.** Minnst tvö te-gildi verða að gefa ólík þrep.
4. **Akkeri N1–N4 í `h2h-lab` á undan** (9 af 9): orakel **+3,85** sigrar,
   andhverft ADP **−10,30**. Flöt tafla er því **mæld jafntefli, ekki blint
   mælitæki**.

##### STIG — 11 tímabil, 10-liða PPR (Patriots), afstætt við 0,193

| TE | sæti | stig | t | ár+ | árs-CI | **leikm.-CI** | laug |
|---|---|---|---|---|---|---|---|
| 0 | RB28 WR32 **TE10** | +34,2 | 1,16 | 7/11 | [−20,0, +90,8] | [−48,0, +82,5] | |
| 0,05 | RB28 WR31 **TE11** | −3,3 | −0,10 | 7/11 | [−64,3, +56,0] | [−43,6, +69,6] | |
| **0,10** | RB27 WR31 **TE12** | **+23,6** | 1,36 | **8/11** | [−6,0, +57,2] | [−45,0, +64,8] | |
| 0,15 | RB27 WR30 **TE13** | +1,2 | 0,08 | 6/11 | [−26,6, +34,2] | [−28,8, +43,3] | |
| **0,193 SENT** | RB27 WR29 **TE14** | **0,0** | — | — | [0, 0] | — | |
| 0,25 | RB26 WR29 **TE15** | +4,9 | 0,38 | 6/11 | [−17,3, +28,9] | [−46,1, +37,4] | þak 3/11 |
| 0,30 | RB26 WR28 **TE16** | −14,3 | −1,34 | 3/11 | [−34,2, +5,8] | [−59,1, +38,2] | þak 5/11 |
| **0,40** | RB25 WR27 **TE18** | **−56,1** | **−2,52** | 3/11 | **[−98,7, −16,7]\*** | [−86,1, +47,7] | þak 9/11 |

##### SIGRAR — 5 tímabil, sama deild (`h2h-lab`, 14 vikur, 6 lið í úrslit)

| TE | sigrar | árs-CI | **leikm.-CI** | stig | úrslitak. | án hindsight |
|---|---|---|---|---|---|---|
| 0 | **+0,60** | **[+0,20, +0,99]\*** | [−0,76, +1,47] | +76 | +0,032 | +0,70 |
| 0,05 | +0,16 | [−0,26, +0,58] | [−0,83, +1,20] | +14 | +0,029 | +0,14 |
| **0,10** | **+0,64** | **[+0,36, +0,88]\*** | [−0,71, +1,00] | +72 | +0,049 | +0,80 |
| 0,15 | +0,09 | [−0,23, +0,39] | [−0,62, +0,69] | +10 | +0,028 | +0,13 |
| **0,193 SENT** | **0,00** | [0, 0] | [0, 0] | 0 | 0,000 | 0,00 |
| 0,25 | −0,13 | [−0,70, +0,39] | [−0,91, +0,61] | +25 | +0,015 | −0,01 |
| 0,30 | −0,16 | [−0,42, +0,10] | [−1,05, +0,67] | +4 | +0,008 | −0,08 |
| **0,40** | **−0,74** | **[−1,37, −0,24]\*** | [−1,36, +0,69] | −75 | −0,030 | −0,63 |

##### OG SAMA SVEIPUR Í 12-LIÐA HALF-DEILDINNI (Sófahetjur) — ÖNNUR ÁTT

| TE | sæti | sigrar | árs-CI | stig | laug |
|---|---|---|---|---|---|
| 0 | RB34 WR38 **TE12** | **−0,18** | [−1,15, +0,51] | **−11,1** | |
| 0,05 | RB33 WR38 **TE13** | +0,10 | [−0,18, +0,54] | +9,4 | |
| 0,10 | RB33 WR37 **TE14** | −0,11 | [−0,37, +0,13] | +7,1 | |
| 0,15 | RB32 WR36 **TE16** | +0,08 | [+0,02, +0,15]\* | +19,0 | þak 5/11 |
| **0,193 SENT** | RB32 WR35 **TE17** | 0,00 | [0, 0] | 0,0 | **þak 6/11** |
| 0,25 | RB31 WR35 **TE18** | +0,20 | [−0,25, +0,78] | +22,0 | þak 9/11 |
| 0,30 | RB31 WR34 **TE19** | +0,04 | [−0,12, +0,23] | +17,1 | þak 10/11 |
| 0,40 | RB30 WR32 **TE22** | +0,07 | [−0,46, +0,59] | +7,1 | þak 11/11 |

`* = árs-klasað 95% bil útilokar núll.`
**„þak n/11" = TE-sætið er á eða framar laugar-gólfi þéttenda** í n tímabilum, svo
grunngildið er „versti þéttendi sem nokkur draftar" og **dýpri sæti mæla ekkert**.
Sú takmörkun bindur AÐEINS efri arminn í stiga-hliðinni (`features.json` ber ~17
þéttenda á tímabili); `h2h-lab` hefur **~130** og er því ómarkaður í báðar áttir.
**Sama vandamál er þegar bókað sem `depthOverrun` í `vbdbase.json`** — 12-liða
deildin er í þaki við SENT gildi, 6 af 11 tímabilum.

#### Niðurstaðan: **0 af 102 frumum standast barinn — 0,193 STENDUR**

| mælieining | frumur | **standast** (jákvætt + árs-CI + leikm.-CI) |
|---|---|---|
| stig, 11 tímabil (`tesplit.json`) | **81** | **0** |
| sigrar, 5 tímabil (`tesplit_h2h.json`) | **21** | **0** |

> **HVAÐ „102" TELUR — spurt í úttekt 19.8.2026, svarað með talningu.**
> Úttektin sagði töluna ranga og bauð **154** í staðinn. Hvorugt er rétt:
> **þrír denominatorar eru allir raunverulegir** og sá sem er bókaður er
> sá í miðjunni.
>
> | tala | hvað hún telur |
> |---|---|
> | **176** | allar frumur í mæliskránum (144 stig + 32 sigrar) |
> | **102** | frumur **sem barinn mat** (81 + 21) — **þetta er bókaða talan** |
> | **84** | raunverulegir TE-vs-sent samanburðir (63 + 21) |
>
> `176 − 102` er **annar ADP-glugginn**: bæði löbbin *prenta* hann en
> hvorugt *metur* hann (`PRIMARY_FIELD[fmt]` í `vbdbase-lab.mjs:1526`,
> `ADP_SRC[sh.fmt][0]` í `h2h-lab.mjs:1350`). `102 − 84` er 9 `k1-raw`
> (þvert akkeri, ekki TE-afbrigði) og 9 `te0.193` (sent gildi við sjálft
> sig, sem er null **að byggingu** — nullhliðið).
> **Útkoman er 0 á öllum þremur.**
>
> **OG ÞAÐ SEM VAR RAUNVERULEGA AÐ: engin fullyrðing taldi töluna.**
> Hún stóð á fjórum stöðum — hér (þrisvar), `model.js`, `Sources.jsx` og
> haus kafla 9b í `tests/model.mjs` — og ekkert próf gat fellt hana. Það
> er sama gerð og DST-nótan sem var löguð í sömu lotu. **Nýr kafli 9c í
> `tests/model.mjs`** leiðir allar sex tölurnar út úr mæliskránum,
> endurtelur barinn á **víðasta** netinu (154 samanburðir, báðir
> ADP-gluggar) og fellur ef bókaða talan og skráin fara í sundur.
> Sex stökkbreytingar felldar, þar á meðal „ein fruma stenst barinn"
> og „102 → 103 á skjánum".

**Hvert einasta leikmanna-klasað bil inniheldur núll** — í báðum mælieiningum, í
öllum þremur lögnum. Það er nákvæmlega undirskriftin úr 4c: `vbdbase-lab` fékk 28
hólf sem stóðust árs-klösun og **0 af 153** sem stóðust leikmanna-klösun. Og með
102 samanburðum er hæsta talan **væntanlega** jákvæð af tilviljun einni.

**FIMM ÁSTÆÐUR TIL AÐ ÞETTA SÉ „ENGIN BREYTING" OG EKKI „NÆRRI ÞVÍ":**

1. **Enginn frambjóðandi nær barnum**, á hvorugri mælieiningu.
2. **Áttin heldur ekki milli hans TVEGGJA deilda.** 10-liða PPR hallar
   **grynnra** (te=0,10 → +23,6 stig OG +0,64 sigrar); 12-liða half hallar
   **flatt til dýpra** (te=0 → **−0,18** sigrar og **−11,1** stig). Merki sem
   skiptir formerki milli deildanna sem það á að ráða er ekki merki.
3. **Ferillinn er ekki einræn — hann hoppar.** Í stigum: +34,2 · −3,3 · +23,6 ·
   +1,2 · 0 · +4,9. Nágrannar sem eru **eitt sæti** í sundur skipta formerki.
   Raunverulegur halli hoppar ekki þannig; suð gerir það.
4. **DÝPRA er MÆLANLEGA VERRA og það er eina markið sem gögnin sjá.** te=0,40
   fellur á BÁÐUM mælieiningum (−56,1 stig, t −2,52 · −0,74 sigrar), svo 0,193
   er á **réttri hlið** einu marktæku brúninni sem finnst.
5. **ÞRIÐJA, ÓHÁÐA AÐFERÐIN SEGIR EITT TIL TVÖ SÆTI — EKKI SEX.**
   `startable`-þrepin í `vbdbase.json` (dýpsti maður sem einhver **gat** sett í
   byrjunarlið, mæld úr FYRRI tímabilum, allt önnur aðferð en tíðni) gefa
   **TE13** þar sem við notum TE14 og **TE15–16** þar sem við notum TE17. Það
   svarar TE-hlut **~0,15**, ekki 0,073. Og **eins-sætis breyting var ÞEGAR
   mæld ómælanleg** (4b-2, þar sem WR fór úr WR30 í WR29 og bæði `shape-lab` og
   `half-lab` lásu flatt).

> **HVAÐ HEFÐI BREYST Á BORÐINU — svo „engin breyting" sé ekki lesin sem
> „engu máli skipti".** Mælt á lifandi `players.json`, 10-liða PPR: við te=0,05
> fellur **TE1 úr sæti 7 í sæti 13** (úr 1. umferð í 2. umferð í 10-liða
> drafti), þéttendar í topp-24 fara **3 → 2**, og stærsta þéttenda-hnikið er
> **59 sæti**. Þetta er raunveruleg borðs-breyting sem mælingin **hafnaði** —
> ekki hnik sem enginn hefði séð.

> **OG TALAN SKÝRIR EKKI ALLT EINKENNIÐ.** Jafnvel við te=0 er
> `mean(ADP − aRank)` **TE −104,9 á móti WR −128,3** (bil 23,4 í stað 76,6) og
> efstu kaupin eru **enn** að mestu þéttendar. **~70% af halla er þessi tala;
> afgangurinn er spá-heimildin sjálf** — Sleeper spáir djúpum þéttendum
> rausnarlega gagnvart ADP þeirra. Að stilla `FLEX_SPLIT` til að fela það hefði
> verið að fela villu í annarri heimild bak við kvörðun í þessari.

#### Hvað VAR breytt, þá

**Engin tala.** Þrennt annað:

1. **Athugasemdin við `FLEX_SPLIT` í `src/model.js`** sagði „MAELT" og ekkert um
   lögnina, vikmörkin eða að útkoman væri ómæld. Hún gerir það nú. Það var
   raunverulegur skjölunar-galli: úttekt rakti tólf kaup-merki til tölu sem leit
   fullmæld út.
2. **`scripts/lib/flex-occupancy.mjs`** — talningin dregin út úr `calibrate.mjs`
   svo hún sé keyranleg á annarri lögn og **per tímabili**. `calibrate.mjs`
   skrifar nú `flexSplitPerSeason` og `flexSplitShape`, en **committaða
   `calibration.json` er ELDRI en breytingin og var VILJANDI ekki endurgerð**:
   skriftan sækir `games.csv` af netinu og `data/weekly/*.json` hefur verið
   endurskrifað síðan, svo endurgerð hefði hreyft teygnina — tölu sem
   `Sources`-flipinn birtir og README kafli 3 bókar — af ástæðu sem hefur
   ekkert með flex-skiptinguna að gera. Per-tímabils-tölurnar eru því bókaðar
   í `data/measure/tesplit.json` (`teSweep.__meta.occupancy`), þar sem þær voru
   reiknaðar. Headline-talan er óhögguð.
4. **Notan í `Sources`-flipanum** sagði „measured" og „nearly double" og ekkert
   um lögnina. Hún segir nú lögnina, tölurnar úr hans eigin deildum, að sveipurinn
   hafi verið gerður — og að **TE-kaupin séu ómæld, ekki sterkustu merkin**. Það
   er eini staðurinn þar sem hann les þetta á draftdegi.
3. **`tests/model.mjs` kafli 9b** pinnar **0,193 nákvæmlega** (kafli 9 leyfði
   allt yfir 0,15 — innan þess bils liggja bæði 0,15 og 0,25, sem sveipurinn
   mældi og hvorugt er talan) og krefst þess að `FLEX_SPLIT`-línan finnist
   **orðrétt einu sinni**, því `lib/te-sweep.mjs` finnur hana með textaleit.
   **Þrjár stökkbreytingar felldar**, þar á meðal `0.330 → 0.33` sem heldur
   TÖLUNNI en drepur sveipinn þegjandi, og `0,16` sem gamli vörðurinn hleypti
   í gegn.

> **TRAUSTIÐ Á TE-DÁLKINN, BERUM ORÐUM.** Röðunin **innan** þéttenda er óhögguð
> og henni má trúa. Það sem er **ÓSTAÐFEST** er stöðu-samanburðurinn: „+11,2
> umferðir" á þéttenda er sá eini staður á borðinu þar sem ágreiningur við BÆÐI
> markaðinn og sérfræðingana er **hvorki staðfestur né afsannaður** af mælingu.
> Hallinn sem gögnin sýna, þótt hann nái ekki barnum, er að borðið sé **ef
> eitthvað of rausnarlegt** við þéttenda — aldrei of hart. **Lestu TE-kaupin sem
> ómæld, ekki sem sterkustu merkin á borðinu.**

### 4c. Bootstrap KLASAÐUR PER LEIKMANN — aðferðin sem breytti niðurstöðu

Þetta er almennt og það á að standa: `vbdbase-lab` fékk **28 hólf** sem
standast bootstrap klasaðan **eftir tímabili** — sem er staðallinn í
`bootstrapDiff` hér — og **0 af 153** sem standast hann klasaðan **per
leikmann**.

> **TALAN VINSTRA MEGIN REKUR, TALAN HÆGRA MEGIN GERIR ÞAÐ EKKI, og það er
> nákvæmlega punkturinn.** Hér stóð **29**; endurmælt 14.8.2026 (eftir
> flex-lagfæringuna, 4b-2) telst jákvæð-og-marktæk tímabils-klösuð hólf
> **28 af 288** — og fyrir lagfæringuna taldist sama viðmið **31**, ekki 29.
> Bókaða talan var því **þegar örlítið skökk**, og hún er þess eðlis: hún
> hoppar um nokkur hólf við hverja endurmælingu því hún er **fjöldi hólfa sem
> rétt sleppa yfir mörk**. **`0 af 153` hreyfðist ekki um eitt hólf** — hvorki
> við lagfæringuna né á milli laugar-mynda. Sterki mælikvarðinn er stöðugur og
> sá veiki er það ekki; það er sjálfstæð staðfesting á kaflanum.

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
| **Annað `FLEX_SPLIT.TE` en 0,193** | Sveipað 0 -> 0,40 (RB:WR fast) í BÁÐUM deildum hans, á STIGUM (11 tímabil, 81 fruma) og á SIGRUM (5 tímabil, 21 fruma). **0 af 102 standast**; hvert leikmanna-klasað bil inniheldur núll. Áttin skiptir formerki milli deildanna tveggja. **Dýpra er mælanlega verra** (te=0,40 fellur á báðum), svo 0,193 er á réttri hlið. Sjá **4l** |
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

**Mælt 17.8.2026, fjórum dögum fyrir draft: 7 af 15.** `rule` er `career`, svo
`meta.sharpMeasured` er **true** og Sharp-dálkarnir eru raunveruleg tala — borðið
er *ekki* að vega alla jafnt í kyrrþey. Hinir átta voru staðfestir sem
**raunverulega óbirtir**, ekki sem sóknarvilla: hver þeirra var prófaður í
PPR, half og standard **og** í fjórum stöðulistum (QB/RB/WR/TE) og skilaði engu
borði. Einn — Wolf of Roto Street (960) — á **half-PPR borð (271 leikmenn) en
ekkert PPR borð**; það var *ekki* tengt, sjá „Mælt og ekki tengt" hér að neðan.

### Textinn í Experts sagði ANNAÐ VAL en borðið notaði (lagað 17.8.2026)

Panillinn „Sharp boards vs the consensus" sagði að hópurinn væri *„boards that
finished above the 95th percentile of the random baseline"*. Það er
**varaleiðin** (`rule: "single-season"`), ekki reglan sem er í notkun
(`career`). Flipinn sem er til þess að bera varnaglana bar því ranga reglu.

Setningin er nú **leidd af `buildSharpBoard`**, sömu köllun sem borðið gerir, og
úrtaksstærðin stendur með henni (*„This rests on 7 boards of the 15 experts
selected"*) — með `warn`-stíl þegar færri en helmingur er kominn. Vörður:
**`tests/render.mjs` kafli 4b**, sem opnar undirflipann sem ekkert próf hafði
opnað (kafli 4 lendir alltaf á `tab === "board"` — sama ætt og `pros-render.mjs`
í FPL-verkefninu). Prófið ber DOM við **óháðan útreikning**, ekki við harðkóðaðan
streng, svo það stendur ekki áfram ef reglan breytist. **Þrjár stökkbreytingar
felldar:** upprunalega orðalagið, `sharp.count` → `sharp.ids.length` (15 í stað
7), og að fella úrtaksstærðina út.

### Kostar það stig að drafta 21. ágúst? — mælt, og svarið er tvíþætt

`scripts/ecr-timing.mjs` → `data/measure/ecr_timing.json`.

Notandinn spurði hvort fleiri sérfræðingar væru búnir að senda inn. Þeir eru —
**128 borð 12.8. → 140 borð 17.8.** — en spurningin sem það vekur er önnur:
**borðið sem hann fær 21. ágúst er ekki síðasta orð þeirra.** `db_fpecr`
(DynastyProcess) geymir hverja skröpun með dagsetningu, svo samsteypan *eins og
hún var* 21. ágúst er raunveruleg söguleg stærð. Tvær myndir á ári, látnar
drafta gegn hver annarri í hans eigin deildum.

**(1) SAMSTEYPAN HAGGAST VARLA — og það er sterka niðurstaðan.**

| ár | ágúst | final | rho (allir) | rho (topp 50) | miðg. hreyfing | topp 50 | max topp 50 |
|---|---|---|---|---|---|---|---|
| 2021 | 08-20 | 09-03 | 0,992 | 0,995 | 0,6 | 0,1 | 1,4 |
| 2022 | 08-19 | 09-02 | 0,997 | 0,989 | 0,5 | 0,2 | 1,4 |
| 2023 | 08-18 | 09-01 | 0,990 | 0,992 | 0,5 | 0,2 | 1,2 |
| 2024 | 08-16 | 08-30 | 0,997 | 0,990 | 0,5 | 0,2 | 1,7 |

**Stærsta hreyfing innan topp 50 er 1,7 sæti** á öllu bilinu, í 4/4 árum. Sá
sem draftar í miðjum ágúst er með sama borð og þeir skila af sér í september.

**(2) EINVÍGIÐ ER ÓSKORIÐ OG ER SAGT ÞAÐ.** Ágúst-borðið mælist **−50 stig**
(−50,3 / −49,7 / −46,6 í þremur afbrigðum), 3 af 4 árum negatíft — en
**|t| ≤ 1,49 þar sem 3,18 væri krafist við n=4**. Þrennt sem má ekki lesa
öðruvísi:

- **Fjögur ár er allt sem heimildin á.** 2019 hefur enga ágúst/september-skröpun,
  standard-myndin 2020 nær ekki 120 leikmönnum, og **2025 hefur aðeins tvær
  skrapanir (1. og 8. ágúst)** svo báðar myndir eru sama myndin. Safnið þynntist;
  það er ekki okkar val.
- **Þrjú afbrigði sem eru sammála eru EKKI þrjár staðfestingar.** Þau hvíla á
  sömu fjórum tímabilum og sömu laug, svo þau deila hávaðanum. Að telja
  samhljóðan þeirra sem aukið úrtak væri sami flokkur villu og „hærri fylgni er
  betri ákvörðun".
- **Null-viðmiðið er nákvæmlega 0** (sama borð báðum megin, stærsta flakk 0), svo
  hermunin sjálf bætir engum hávaða við. Munurinn er borðanna, en hann er of
  lítill fyrir fjögur ár.

**Vogin var ekki hreyfð og átti ekki að vera.** Hann draftar 21. ágúst og getur
ekki notað september-borðið; það sem mælingin styður er að **gögn séu endurnýjuð
á draft-degi** og að seinar fréttir séu lesnar sér. Talan var mæld við
`--runs=40`, ekki 6: við 6 flökti árs-talan um ±30 stig milli afbrigða af því að
draft-hávaðinn var ekki fullnægjandi meðaltalaður, og **flökt úr eigin keyrslu
hefði verið lesið sem munur á borðunum.**

### Mælt og ekki tengt — heimildir sem voru skoðaðar 17.8.2026

Spurningin var „eru komnar fleiri sérfræðinga-raðningar sem væri sniðugt að
horfa til?". Svarið er **nei, og þekjan er þegar full** — bókað hér svo það
verði ekki endurmælt.

| heimild / hugmynd | niðurstaða |
|---|---|
| **Fleiri FantasyPros-sérfræðingar** | **Þekjan er full.** Sameinað mengi auðkenna úr þremur ECR-síðum (ppr 89 · half 92 · standard 88) er **94**; pipeline-ið reynir **229** (ppr-auðkenni + öll 215 nákvæmnis-auðkenni). Aðeins **2 auðkenni** (7671, 6468) eru í half/standard-síðunum og aldrei reynd — og **hvorugt á nákvæmnis-sögu**, svo hvorugt getur fengið vog í skorpu-borðinu. Að tengja þau bætti engu nema í flötu samsteypuna, sem FantasyPros reiknar sjálft.<br>**ENDURMÆLT 21.8.2026 — TÖLURNAR ERU HÆRRI OG NIÐURSTAÐAN STENDUR STERKARI.** Hópurinn stækkaði: ppr **100** · half **104** · standard **99**, sameinað mengi **104**. Fjögur auðkenni (960, 1661, 6658, 2751) eru **ekki** á ppr-síðunni — en **öll fjögur eru í nákvæmnis-listanum**, svo pipeline-ið reynir þau. **Auðkenni sem pipeline-ið myndi aldrei reyna: 0.** Þekjan er ekki bara full, hún er fyllri en hún var. Athugið að **talan er leidd í hverri keyrslu** (`ecrData.filters` ∪ nákvæmnis-auðkenni), svo hún þarf ekki uppfærslu í kóða — aðeins hér, því 94 var skrifað sem staðreynd |
| **Half-PPR borð sem varaleið fyrir PPR** | Myndi færa skorpu-hópinn úr **7 í 8** (Wolf of Roto Street). **EKKI TENGT:** það blandaði half-PPR röð inn í PPR-skorpusamsteypu, og munurinn milli sniða er mældur og raunverulegur (467 af 502 leikmönnum eiga annað sæti í standard en PPR). Það er líka **breyting á því hvernig sérfræðingar eru sameinaðir** og þyrfti að standast mælingar-þröskuldinn — fjórum dögum fyrir draft er það rangur tími |
| **ESPN-eigin raðningar** | **ÞEGAR SÓTTAR** — `draftRanksByRankType` (`rankPpr`/`rankStd`) í `sources/espn.mjs`. Þær eru **ómælanlegar**: ESPN geymir enga sögulega mynd, svo engin nákvæmni er til að vega þær með |
| **NFL.com fantasy-API** | **404** á `/v2/players/researchinfo` og `/v1/players/editorranks` |
| **`db_fpecr` (DynastyProcess) sem ný heimild** | **ÞEGAR NOTUÐ** af `fetch-ecr-history.mjs`. Nýja notkunin hér er önnur spurning (5c), ekki ný heimild. Skrapanirnar eru **vikulegar** og **þynntust 2025** (tvær í ágúst-glugganum) |
| **`db_fpecr_latest.csv` sem ECR-heimild** | Óþarfi: partners-API-ið gefur sömu tölu **ferskari** (uppfærð 8/17 í keyrslunni í dag) og með þrepum og dreifingu |
| **`WEEKLY_MIRROR` / vikuleg ECR** | **TENGD OG VIRK** — `fetch-nfl.mjs` kallar `weeklyEcr()` og skrifar `weekly-ecr/{scrape_date}.json`. Í forleik ber speglunin **síðustu viku fyrra tímabils** (`2025-12-30`, ein skrá), og það er rétt: lyklun á `scrape_date` gerir vistunina ónæma svo ~60 eins skrár verða ekki til |

**FBref, SofaScore, FotMob og Understat voru ekki endurmæld** — þau eru skjöluð
sem 403/gated/Cloudflare og sú spurning er lokuð.

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

> **TENGT SEM DAGSETT SERÍA 21.8.2026 — OG ÁSTÆÐAN ER AÐ VERÐIN HVERFA.**
> `mk.tdProps` var til og **enginn kallaði hana**: `espn_td_props` hafði
> aldrei birst í `status.json`, í neinni keyrslu. Sama undirskrift og sex
> heimildirnar sem voru tengdar 14.8.
>
> `sports.core.api` geymir **enga sögu** — línan hverfur um leið og leikurinn
> er búinn — svo *„hvað sagði markaðurinn um hver myndi skora í viku 1"* er
> **ósvaranleg** spurning eftir viku 1. Sama röksemd og `data/history/` og
> `weekly-proj`: dagsmynd verður ekki búin til eftir á. Að bíða þess að við
> vitum hvað við myndum mæla væri að bíða þess að gögnin séu farin.
>
> `data/td-props/{ár}-w{vika}.json`, glugginn er **sami fasti** og vikuleg
> spá notar (`PROJ_WINDOW_H`, 72 klst) svo tvær dagsettar seríur geti ekki
> rekið í sundur. Endurmælt 21.8. (20 dögum fyrir viku 1): NE@SEA bar 5
> síður, 111 prop, **22 „Anytime TD", 0 með verð**; yfir alla 16 leiki
> vikunnar **83 listuð, 0 verðlögð**; vika 3 bar ekkert `propBets` svið.
> Talan 24 að ofan er frá 9.8. og hún hélt.
>
> **ÞRJÁR HLIÐAR OG ÞÆR ERU EKKI SAMA HLIÐIÐ:** utan gluggans → engin sókn,
> skráð `ok` · gluggi opinn og **0 verðlögð → skráð `ok` MEÐ tölunni,
> EKKERT skrifað** (bókmakari sem hefur ekki opnað markað er ekki bilun, og
> rauð röð hér kennir manni að hunsa spjaldið) · verð til → `writeOnce`,
> `minRows: 50`, aldrei ofan í.
>
> Og gildran sem `minRows` hefði annars fallið í er **stærri hér en í
> `weekly-proj`**: væru LISTAÐAR raðir vistaðar bæri skráin 83 raðir, gólfið
> 50 hleypti henni í gegn, og vika af **nullum** væri fryst að eilífu — merkt
> sem markaðsmynd. `tdProps` skilar því aðeins `decimal != null`.
> Vörður: `tests/pipeline.mjs` kafli F3, fjórar stökkbreytingar felldar.

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

- **Gegn ADP: jákvætt í 12 af 12 gildum lögnum** (+169 til **+344,7** stig).
- **Gegn hrárri spá-röð: 14 af 16.**

> **EFRA MARKIÐ STÓÐ Í „+322" OG PASSAÐI VIÐ HVORUGA ARMINN** (leiðrétt
> 15.8.2026). Talan er `shapes_sleeper.json -> ppr|8-std -> vsAdp.mean`, sem
> var **314,2** fyrir flex-lagfæringuna og er **344,7** eftir hana. „+322" var
> hvorugt — hún var röng ÁÐUR en 4b-2 var mæld, svo lagfæringin bjó hana ekki
> til heldur afhjúpaði hana. Neðra markið (+169, `standard|16-std`) og talningin
> **12 af 12** eru réttar í báðum örmum. Sama ætt og `DEAD_GAMES`-villan í 4e:
> tala sem er lesin úr töflu, skrifuð niður og aldrei borin aftur við töfluna.

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

## 5n. Vikulegar viðureignir — mælikvarðinn sem allt hitt var mælt án

**Hver einasta niðurstaða í þessu verkefni var mæld í STIGUM.** A-Ranking slær
ADP um +233,6 stig, „WR fyrst" slær BPA um +23,5, bye-vogin gefur +28. Fantasy
vinnst ekki á stigum. Hún vinnst á **vikulegum viðureignum** og á úrslitakeppni.
Borð sem skorar meira yfir tímabilið getur tapað fleiri vikum — 2.000 stig sem
koma í þremur 200-stiga vikum og ellefu 130-stiga vikum er verri deildarútkoma en
1.950 sem koma jafnt — og **ekkert í repo-inu hefði tekið eftir því**, því engin
mæling hér hafði mótherja í viku.

`scripts/h2h-lab.mjs` → `data/measure/h2h.json`. Handvirk, **tengir ekkert inn í
`src/`**, er ekki í `npm test`.

### Reglurnar eru LESNAR, ekki valdar

| regla | gildi | hvaðan |
|---|---|---|
| reglulegt tímabil | **vikur 1–14** | `fpts` í raunsvari Sleeper er 1815,34 á rosteri 1 en vikur 1–17 gefa 2268,18 |
| úrslitakeppni | **vikur 15–17** | `playoff_week_start: 15` |
| lið í úrslitakeppni | **6** | `playoff_teams: 6` í **báðum** deildum |
| röðun | `wins + ties/2`, síðan stig | regla Sleeper |

Svörin sjálf eru orðrétt í `tests/standings.mjs`. Lögunin (10 lið PPR 2FLEX ·
12 lið half-PPR 2FLEX · 12-1FLEX almenna) er sú sama og `half-lab`, `opp-lab`,
`vbdbase-lab` og `waiver-lab` bera, og **varamannsþrepið er borið vélrænt við
`data/measure/waiver.json`**; skriftan deyr ef það stemmir ekki.

### NÚLLPRÓFIÐ FYRST — OG ÞAÐ ER HLIÐ

Borð sem spilar gegn **sjálfu sér** verður að gefa nákvæmlega 50%. Mælt á
**15 frumum, 680 hermdum deildum**:

| | stærsti munur |
|---|---|
| sigrar | **0** |
| meistaratitlar | **0** |
| stig | **0** |
| vikuleg sigurprósenta frá 50% | **0** |

**Og það er sagt berum orðum hvernig núllið fæst: speglunin gerir það nákvæmt AÐ
BYGGINGU.** Hver fruma er keyrð í báðar áttir (meðferð í sæti A og viðmið í B,
síðan öfugt), svo armarnir eru skiptanlegir og núllið getur ekki brugðist nema
armabókhaldið sjálft sé bilað. **Það þýðir að núllprófið ver EKKI sætis-skekkju**
— og hún er raunveruleg og stór. Þess vegna eru þrjú hlið til viðbótar:

- **Bókhaldið** (9 deildir, 0 villur): sigrar = töp, hvert lið spilar nákvæmlega
  14 leiki, hver vika er fullkomin pörun, nákvæmlega einn meistari.
- **Sætis-dreifingin, óspegluð** — allir á SAMA borði: bilið milli besta og versta
  sætis er **3,87 · 3,20 · 2,87 sigrar** af 14 (og 170–241 stig). Það er
  **STÆRRA en áhrifin sem verið er að mæla**, og er ástæðan fyrir spegluninni.
  Talan er birt, ekki falin.
- **Akkeri í BÁÐA enda**, í öllum þremur lögnum: orakel-borð (raunstig
  tímabilsins) **+3,5 til +3,9 sigrar** gegn A-Ranking, andhverft ADP **−10,0 til
  −10,3**, slembin röð **−9,8 til −10,2**. Öll níu vikmörk útiloka núll.

> **Fjórða núllið er inni í mælingunni sjálfri.** Í stefnutöflunni er
> `bpa`-röðin meðferð == viðmið, og hún les **0 sigra / 0 stig / 0 titla** í öllum
> þremur lögnum. Núll sem keyrir í töflunni sem er birt er sterkara en núll sem
> keyrir í lykkju við hliðina á henni.

### Q1 — A-RANKING GEGN ADP HELDUR, OG HELDUR VEL

10 frækorn × öll sæti × speglun × 5 tímabil = **1.000–1.200 hermdar deildir á
frumu**. Vikmörkin eru **bootstrap klasaður per tímabili** (`bootstrapDiff`,
2.000 ítranir) — raðir innan árs eru ekki óháðar.

| lögun | met | sigrar | vika-móti-viku | úrslitakeppni | tímabils-stig |
|---|---|---|---|---|---|
| 10-2flex (Patriots) | **9,7-4,3** á móti 7,2-6,8 | **+2,58** [+0,45, +4,44] | 66,2% | 87,4% á móti 65,4% | +236 |
| 12-2flex (Sófahetjur, ADP=ppr) | **9,8-4,2** á móti 7,2-6,8 | **+2,52** [+0,86, +4,21] | 67,1% | 86,9% á móti 53,8% | +244 |
| 12-2flex (ADP=std) | **10,8-3,2** á móti 6,9-7,1 | **+3,81** [+2,89, +4,73] | 75,1% | 98,4% á móti 49,9% | +283 |
| 12-1flex (bókaða lögnin) | **9,6-4,4** á móti 7,2-6,8 | **+2,36** [+1,09, +3,58] | 65,8% | 90,9% á móti 55,9% | **+223** |

**Jákvætt í 4 af 4, marktækt í 4 af 4.** Tvennt sem gerir töfluna trúverðuga:

1. **Stiga-dálkurinn endurgerir bókuðu töluna.** Í lögninni sem +233,6 var mælt í
   mælist hér **+223** — sjálfstæð laug, önnur vélin, sama svar. Sigra-dálkurinn
   er því ekki „önnur mæling" heldur **sama mælingin talin öðruvísi**.
2. **Það lifir af að taka fullkomnu vitneskjuna af.** Byrjunarlið vikunnar er
   valið tvisvar á SAMA draftinu — af raunstigum vikunnar og af **gangandi spá**
   (hrist ppg, vikur < w). Án hindsight: **+2,25 · +2,41 · +3,12 · +1,90**, öll
   marktæk. README 5m varar við að vikuleg talning með fullkominni vitneskju
   verðlauni sveiflu; hér er sýnt að niðurstaðan er ekki það artefakt.

### MEISTARATITILL ER HÁVAÐASAMASTI MÆLIKVARÐINN — OG ÞAÐ ER NIÐURSTAÐA

Stærsta mælda áhrifið í öllu repo-inu færir titla-líkurnar úr **8,1% í 25,9%**
(12-1flex) — meira en þreföldun. **Og það er samt ekki marktækt** (95% vikmörk
[−7,0pp, +47,9pp], 3/5 ár). Ástæðan er ekki að áhrifin séu lítil heldur að
klasarnir eru **fimm tímabil** og meistaratitill er einn atburður á deild.

| mælikvarði (12-1flex) | munur | marktækt? |
|---|---|---|
| sigrar | +2,36 | **já** |
| komast í úrslitakeppni | +35,1pp | **já** |
| efsta sæti | +33,5pp | **já** |
| **meistaratitill** | **+17,8pp** | **NEI** |

> **Reglan sem af þessu leiðir:** *meistaraprósenta úr fáum tímabilum er hávaði í
> prósentubúningi.* Hún er birt af því að hún er spurningin sem fólk spyr, en
> **„komast í úrslitakeppni" er talan sem ber merkið.** Næmni á
> úrslitakeppnisstærð (4 lið í vikum 16–17 í stað 6 í 15–17) breytir engu um
> þetta: titillinn er ómarktækur í 3 af 3 lögnum þar líka.

### Q2 — STEFNU-RÖÐIN BREYTIST EKKI, OG ÞAÐ ER NIÐURSTAÐAN

19 stefnur × 3 lagnir × 7 tímabil × klofin frækorn = **1.120–1.344 deildir á
stefnu**. Sama draftið talið **fjórum sinnum**: tímabils-stig, vikustig, sigrar,
titlar.

| lögun | rho(sigrar, tímabils-stig) | rho(stig, bókuð röð) | sjálfsáreiðanleiki sigra |
|---|---|---|---|
| 10-2flex | **0,989** | 0,828 | 0,935 |
| 12-2flex | **0,961** | 0,768 | 0,947 |
| 12-1flex | **0,979** | 0,812 | 0,968 |

**Að skipta um MÆLIKVARÐA færir röðina minna en að skipta um HERMI — í 3 af 3
lögnum.** Það er samanburðurinn sem sker úr, og hann var byggður inn viljandi:
án hans er „röðin breyttist" ómælanleg fullyrðing, því einhver munur er alltaf.
Sjálfsáreiðanleikinn (sami mælikvarði, tvö óháð frækorn) setur þakið: 0,935–0,968.
**rho(sigrar, stig) liggur AÐ ÞAKINU** — röðin er eins nálægt því að vera sú sama
og hávaðinn leyfir henni að mælast.

> **Þetta er null-niðurstaða og hún er bókuð sem slík, ekki sem bilun:**
> **tímabils-stig voru fullnægjandi staðgengill allan tímann.** Öll hin
> mælitækin í verkefninu voru að svara réttri spurningu með rangri einingu — og
> einingin skipti ekki máli.

**Það sem er marktækt er allt NEIKVÆTT.** Yfir allar þrjár lagnir og báða
mælikvarða: **engin stefna slær BPA marktækt**, hvorki á sigrum né stigum.
Marktæku frumurnar eru **17 á sigrum og 20 á stigum — allar 37 neikvæðar**
(`zero_rb`, `zero_rb6`, `qb1`, `qb2`, `wr_wr`, `wr_wr_wr`, `te1`, `te2`,
`hero_rb`). Það sem er mælanlegt er **hvað má EKKI gera**, ekki hvað á að gera,
og báðir mælikvarðarnir segja það eins.

**Toppurinn á röðinni hér er ekki sá bókaði, og orsökin er mæld en ekki metrikin.**
Bókaða taflan setur `wr_rb` efst; hér er það `rb_rb`/`rb_rb_rb`/`balanced` — á
**báðum** mælikvörðum. Ein mælanleg orsök liggur í lauginni: `strategy-lab`
draftar úr `features.json` **eingöngu**, og 12×14 draft þarf 168 leikmenn.

| ár | laug | vantar |
|---|---|---|
| 2016 | 161 | 7 |
| 2017 | 161 | 7 |
| 2018 | 167 | 1 |
| **2022** | **145** | **23** |

Í 4 af 11 árum gekk laugin upp og **síðustu umferðirnar skiluðu engum manni** —
nákvæmlega þar sem stöðu-áætlun á að borga sig eða ekki. `h2h-lab` draftar úr
öllum sem eiga vikugögn (586–648) og raðar taglinu eftir gangandi forgildi, sama
lausn og `waiver-lab` skjalar. **Þetta er takmörkun á bókuðu töflunni sem fannst
við að endurmæla hana, ekki niðurstaða um mælikvarðann.**

### Q3 — BJARGAR SIGRA-MAELIKVARDINN HAFNADRI HUGMYND? NEI

Q1 og Q2 spyrja hvort bokudu tolurnar HALDI i sigrum. Q3 spyr hinnar
spurningarinnar: **bjargar thad ad skipta um maelikvarda einhverju sem FELL a
stigum?** Eini frambjodandinn sem er nogu naerri morkunum til ad svarid se ekki
fyrirfram vitad er `prevCarG` (4d): +23,8 stig, t=2,286, 8/11 ar — en
placebo-thakid var +21,3, svo hun slapp yfir thad um **+2,5 ein**.

**Medferdin er A-Ranking bordid endurradad eftir `z(VBD) + w * z(prevCarG)`, z
INNAN STODU** — ordrett regla `opp-lab`. Vidmidid er hreint A-Ranking.
Z-stodlun a VBD er einraen umbreyting svo `w = 0` gefur NAKVAEMLEGA sama bord.
Gridid er thad sama og `opp-lab` sveiflar: 10 vogir (-0,10 til +0,10) x 3 svid
(`all` / `top100` / `top50`) x 3 lognun x 7 timabil = **810 reitir**, hver
skoradur i BADUM einingum ur SOMU drofttum.

**OG PLACEBO-FJOLSKYLDAN VAR PORTUD LIKA, THVI AN HENNAR ER TAFLAN OLAESILEG.**
`startersPoints` er graedug best-ball rodun, svo HVER SEM ER truflun a
stodu-blondu grunnbordsins getur lesid jakvaett. Atta deterministiskar
sud-breytur fara gegnum nakvaemlega sama net, sama pooling og sama
walk-forward; thaer gefa nulldreifinguna og krafan a raunverulega breytu er ad
sla HANA, ekki nullid.

| | sigrar (af 14) | t | ar | 95% CI (ars-klasad) | stig, SOMU droft |
|---|---|---|---|---|---|
| `prevCarG`, osamhverfi lidurinn | **+0,09** | 0,48 | 3/7 | **[-0,24, +0,45]** | **+16,7** (t=1,07) |
| placebo-thak (forspabil fyrir eitt nytt fraekast) | **+0,35** | — | — | — | **+42,2** |
| **bord yfir thakid** | **-0,26** | | | | **-25,5** |

Placebo-atta gefa medaltal **-0,04**, sd **0,16**, haesta einstaka gildi
**+0,17** og haesta \|t\| **1,85**; **eitt af atta** les „marktaekt" a
ars-klasada bootstrappinu, sem er nakvaemlega fals-jakvaednin sem thakid er til
ad verja gegn.

**Skilyrdin thrju — og tvo fella hana:**

| # | skilyrdi | nidurstada |
|---|---|---|
| 1 | **per-LEIKMANNS bootstrap** utilokar null (200 itranir, laugin endursynd MED endurtekningu) | **FELLUR** — punktur +0,28, CI **[-0,30, +0,81]**. Sama hlid og felldi `vbdbase-lab` i 153 holfum af 153 (4c) |
| 2 | **slaer placebo-thakid** | **FELLUR** — +0,09 gegn thaki +0,35, bord **-0,26** |
| 3 | **heldur walk-forward** | stenst ad forminu (+0,11 gegn placebo-leit -0,12) en **3/6 ar, t = 0,18** |

`placebo1` for gegnum NAKVAEMLEGA sama per-leikmanns bootstrap og gefur
**-0,28, CI [-0,69, +0,50]** — jafn ogreinanlegt fra nulli og raunverulega
breytan, i sitt hvora attina.

**Toppurinn er enn ekki thar sem abatinn er — og nu er hann NEIKVAEDUR thar.**
Varnagli 1 i 4d sagdi ad af +23,8 stigum vaeru adeins +11,4 i `top50`. A sigrum
er `all` **+0,18** (thak +0,44), `top100` **+0,14** (thak +0,41) og **`top50`
-0,05** (thak +0,25). Svidid sem draftid raest i liggur undir nulli.

**Heimildaskiptingin segir thad sama og 4d.** Sleeper-arin 2021-25 gefa **+0,12
(2/5)**. FFToday-helmingurinn ber adeins **tvo ar** her (vikugognin byrja 2019)
og er thvi birtur sem samhengi en ekki sem prof: +0,04 (1/2).

> **OG WALK-FORWARD A STIGUM SNERIST VID — thad er sjalfstaett rok fyrir
> placebo-fjolskyldunni og thad er bokad af thvi ad thad hefdi getad ordid
> nidurstada.** `prevCarG` maelist **-12,2 (3/6)** medan **placebo-LEITIN**
> maelist **+71,1 (6/6)**. Leit yfir 240 gagnslaus afbrigdi valdi eitthvad sem
> virkadi naesta ar — betur en raunverulega breytan gerdi. Vaeri thakid ekki
> maelt vaeri su tala laesileg sem sonnun um hvad sem er.

#### Nullhlidid a Q3 hefur THRJA lidi, og sa thridji er ekki skraut

`w = 0` verdur ad gefa nakvaemlega sama bord OG nakvaemlega 0 i duellinu.
Hvorutveggja er profad — 21 fruma (3 lognun x 7 timabil): bordamunur **0**,
max\|sigrar\| **0**, max\|stig\| **0**. Thridji lidurinn er **sentinel**:
staersti munur sem einhver vog naer i sama neti verdur ad vera **> 0**, annars
gaeti nullid verid satt af thvi einu ad velin lesi ALLTAF 0. Hann maelist
**3,94 sigrar**.

**Stokkbreytt og stadfest — og ein af fjorum kom a ovart:**

| | breyting | nidurstada |
|---|---|---|
| M1 | `tail.sort` snuid vid | bordamunur 9, duel **0** — bordasamanburdurinn EINN sa thetta, thvi taglid er sjaldan draftad |
| M2 | taglsgolfid -1e5 -> -100 | **hlidid sagdi ekkert, og thad var RETT**: hausinn er z-stodladur (sd = 1) svo -100+ppg liggur enn langt undir honum og bordid er obreytt |
| M3 | 0,02 x placebo laett i hausinn vid `w = 0` | bordamunur 9, max\|sigrar\| 0,125, max\|stig\| 21,5 — exit 3 |
| M4 | bordid latid hunsa `w` alveg | bordamunur 0, duel 0, **sentinel 0 -> FELLUR**. Thetta er tilfellid thar sem nullprofid er fullkomlega graent OG maelir ekkert |

#### Og thad almenna: maelikvardi sem faerir rodina MINNA en sitt eigid sud getur ekki snuid neinu vid

`prevCarG` var eina hugmyndin sem thurfti ad maela. Hinar thrjar sem var hafnad
i kafla 4 falla um vegalengd sem enginn maelikvardi bruar, og Q2 segir hvers
vegna: **rho(sigrar, stig) er 0,961-0,989 medan sjalfsareidanleiki
sigra-maelikvardans er adeins 0,935-0,968.** Ad skipta um einingu faerir rodina
MINNA en maelikvardinn flokkar vid sjalfan sig.

| hafnad | fjarlaegd fra morkum | gaeti sigra-maelikvardi snuid thvi? |
|---|---|---|
| `vbdbase-lab` (annar VBD-grunnur) | **0 af 153 holfum** standast per-leikmanns bootstrap | **nei.** 0 er ekki jadartilfelli — og per-leikmanns hlidid er nakvaemlega thad hlid sem fellir `prevCarG` her lika |
| `shrink-lab` (ovissu-had hnignun) | **0 af 36** samsetningum jakvaedar i ollum 10 holfum a BADUM spaheimildum; besta \|t\| **3,4** gegn kroffu 4,5-5,7 | **nei.** Merkid tharf ad vaxa um 30-70%; maelikvardi sem faerir minna en sitt eigid sud getur ekki gefid thann vaxt |
| `agecurve-lab` (olinulegur aldursferill) | walk-forward marktaek **1 af 10**, tvo holf marktaekt NEIKVAED, `deltaR2` net of ADP negatift i **ollum 48** | **nei.** Og orsokin er thekkt: Sleeper-spain hefur thegar etid aldursmerkid (kafli 4). Eining utkomunnar breytir engu um thad |

**Thetta er ekki latur rokstudningur heldur nidurstadan sjalf.** Stigin voru
fullnaegjandi stadgengill allan timann, og Q3 er beina profid a thvi: sami
draftur, tveir maelikvardar, **sami domur a badum**.

> **Keyrslutiminn for ur ~100 s i ~670 s** og thad er nanast allt Q3: 810 reitir
> x 7 timabil (~220 s) og per-leikmanns bootstrappid (200 itranir, ~370 s).
> `--q3runs` og `--pboot` stjorna hvoru fyrir sig; sjalfgefnu gildin eru thau
> sem tolurnar her voru maeldar med.

### Raunveruleika-akkeri — samhengi, EKKI hlið

Eina lokna deildin sem við eigum er Patriots 2025 (raunsvar Sleeper). `ppts` þar
er **besta mögulega byrjunarlið**, sem er nákvæmlega það sem hermunin reiknar.

| | raun | hermt |
|---|---|---|
| staðalfrávik sigra | 1,41 | 2,09 |
| stig (besta byrjunarlið, vikur 1–14) | 2016,3 | 1753,1 |

Bilið er **263,2 stig, þar af er spyrnumaðurinn 123,7** — reiknað úr sömu
vikuskrám (K er í `data/weekly/`, DST er það ekki). Afgangurinn er vörn og
waiver-hreyfing. **Þetta er ekki hlið** og má ekki verða það: hermda deildin ber
hvorki K/DEF né waiver, svo hún **á** að liggja lægra.

### Hvað stenst og hvað gerir það ekki

| bókað | á sigrum |
|---|---|
| A-Ranking slær ADP (+233,6 stig, 5/5) | **STENST** — +2,4 til +3,8 sigrar, marktækt í 4/4 lögnum, og heldur án hindsight-uppstillingar |
| Röð stefnanna í `strategy_ppr.json` | **STENST sem röð** (rho 0,96–0,99) — en hvorugur mælikvarðinn finnur stefnu sem slær BPA |
| „hrá spá-röð" (+74,7 stig) | **VEIKARA** — +0,11 til +1,69 sigrar, marktækt í 2 af 4 frumum |
| Meistaraprósenta sem mælikvarði | **BER EKKI MERKIÐ** í 5 tímabilum — notið „komast í úrslitakeppni" |
| `prevCarG` (4d), sem slapp yfir placebo-thakid a stigum um adeins +2,5 | **FELLUR LIKA A SIGRUM** — +0,09 af 14 gegn thaki +0,35; per-leikmanns CI [-0,30, +0,81]. Sja Q3 |

### Það sem er ÓMÆLT hér, og það er skráð

- **Waiver og skipti.** Hóparnir eru fastir allt tímabilið; `waiver-lab` mælir
  waiver-regluna og að blanda því saman hér væri að mæla tvennt í einu. Meiddur
  maður er 0 stig í tíu vikur og enginn getur skipt honum út.
- **K og DST** eru utan draftsins og því tóm sæti hjá ÖLLUM liðum — þau falla út
  úr hverjum mun. `data/weekly/` ber enga DST.
- **Skrá-styrkur.** Hringaðferð með slembaðri umferðaröð, ekki raunveruleg
  Sleeper-skrá og engar deildir. Spegluninni er ætlað að fella það út, ekki að
  herma það.
- **Sögulegt half-PPR ADP er ekki til** (5l/half-lab), svo 12-liða deildin er
  mæld með **báðum** (ppr og std) sem vikmörkum.

Verðir: `tests/accuracy.mjs` kaflar **5b** (vikulega byrjunarliðið er EIN
útfærsla, borin orðrétt við gamla afritið á 3.400 vikum) og **5c** (skráin,
staðan, bracketið og **null-eiginleiki hermisins**). Sex stökkbreytingar felldar,
þar á meðal „jafntefli telst sigur", „efsta sæti mætir röngum andstæðingi" og
„áætlun lekur á öll sæti".

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
| `advice.mjs` | Kaup-röðin. Kafli 7 ber hana við mælinguna á disknum. **Kafli 8 ver að deildin í appinu beri sömu reglur og hermunin** — sjá 6b. **Kafli 14 ver að `avail: 0` sé ALDREI í röðinni og sé samt NEFNDUR** — sjá 6g; þekjan er fullyrt fyrst (raunborðið verður að bera slíka menn, annars getur kaflinn ekki mælt) og bæði `avail == null` og 0,25/0,75 verða að fara ÓBREYTT í gegn |
| `lineup.mjs` | Uppstillingin. Endar á **bakspors-leit**: 1.500 slembin lið og 15 deildarform, grásugan verður að vera sannanlega best og enginn á bekk má skora meira en gjaldgengt byrjunarsæti |
| `names.mjs` | Raunveruleg NFL-jaðartilfelli. **Tvíræður lykill skilar ENGU** — „síðasti vinnur" er þögla ranga pörunin |
| `pipeline.mjs` | **Gögnin sjálf, ekki formúlurnar.** Nafna-pörun má ekki taka yfir; engin tómgildi; hvert birt svið hefur raunverulega dreifingu; PPR > half > std hjá hverjum móttakara |
| `render.mjs` | **Eina prófið sem sér hvítan skjá.** Opnar hvern flipa með raunverulegum `data/` og krefst **talna, ekki bara þess að ekkert hrundi**. Ver að viðmótið sé enskt — líka ASCII-íslenska, sem stafa-skynjun sér ekki |
| `audit.mjs` | **Leitar að villum, ekki staðfestingu.** Sjá 6b. **Og það gat ekki fellt neitt fram til 19.8.2026** — sjá 6l |
| `entry.mjs` | Hleður síðan rétta appið? `nfl/index.html` bar **algilda** slóð `/src/main.jsx`, svo NFL-hlekkurinn skilaði **inngangi FPL-appsins** staðbundið: slóðin breyttist, titillinn sagði „NFL Fantasy", og FPL-appið teiknaðist — engin villa, ekkert í console. Krefst afstæðrar slóðar í HTML **og** að byggði búnturinn beri NFL-viðmótið og **ekki** FPL-viðmótið, lesið úr skráarinnihaldi. **Var utan `SUITES` og keyrði hjá engum til 19.8.2026** — sjá 6l |
| `sleeper-league.mjs` | **Deildin lesin úr Sleeper.** Hrein vörpun, svo prófið keyrir sama kóða og appið. Fastarnir eru **raunverulegt svar** (deild 1389356308104249344) og verja tvær gildrur sem tilbúið svar hefði ekki sýnt: umferðirnar koma úr **draftinu** (15), ekki úr deildinni (`draft_rounds: 3`), og sætið kemur úr `slot_to_roster_id` þegar `draft_order` er **null**. Kafli 8 keyrir 8 ruslsvör; gilt svar verður að fara **óbreytt** í gegn. Sjá 6e |
| `wiring.mjs` | **Er hreina rökfræðin raunverulega TENGD?** Hreint fall getur verið fullkomlega prófað og **aldrei kallað** — það er markaðsliðurinn í FPL-appinu sem var dauður í viku með græn próf. AST-próf krefst þess að borðið kalli `pickSignature`, `pollDelay`, `edgeSentence`, `nextOwnPick`, `survivalProb`, `leagueFromSleeper` og `teamsFromLeague`, að pollunin sé ekki `setInterval`, og að `mean` sé ekki birt beint. **Kafli 5 prófar MÆLITÆKIÐ**: athugasemdir eru strippaðar, annars hefði `grep` fundið föllin í athugasemdunum sem NEFNA þau og verið grænt þótt kallið væri farið. Fyrirvari í hausnum: AST-próf les kóða, ekki skjáinn |
| `dashboard.mjs` | **Forsíðan.** 8 kaflar: báðar deildir með sínum reglum, forleikur er ekki röðuð staða, báðar spátölur, fjögur ólík tilfelli tóms waiver-lista, bilun er sýnileg, og **ekkert sótt fyrr en flipinn er opnaður**. Tvær villur í prófinu sjálfu eru skjalaðar þar: dálka-vísitala lesin úr **öllum** töflum og notuð á aðra, og `meta.json` sem er **fest af fyrsta lestri** því `data.js` ber sameiginlegt skyndiminni |
| `standings.mjs` | Staðan. **`fpts_decimal` er hundraðshlutar**, mælt gegn óháðri leið (summa `/matchups/`: /100 hittir 10/10 upp á sent, /10 hittir 0). 15 stökkbreytingar felldar |
| `waivers.mjs` | Frjálsir leikmenn og skipti. **`rosters: null` → `pool = null`**, ekki allir. „Ekki pikka neinn upp" er prófað sem svar. 12 stökkbreytingar felldar, ein slapp í fyrstu tilraun og var endurskorin |
| `sleeper.mjs` | Draft-kvöldið í jsdom. Kaflar 2d/2e bera innflutninginn: **VBD-tölurnar verða að breytast** þegar deildin er flutt inn, annars er innflutningurinn skraut |
| `draft-live.mjs` | **Draftið KEYRT, ekki ljósmyndað** — 150 val, eitt í einu, gegnum raunverulega `DraftBoard`. Sjá 6d: það fann **sjö villur** sem `sleeper.mjs` gat ekki séð, því allar voru skilgreindar af tímanum sem líður |
| `dst.mjs` | Vörnin. Kafli 1 ber **27 bakaðar tölur** við `data/measure/dst.json`. Kafli 3 er ekki „skilar hún tölu" heldur **DEN vika 1 2025 = 16, nákvæmlega eins og Sleeper**. Kafli 5 telur upp **sex leiðir að engu svari** og krefst `null` af hverri — og sannar líka að `0` kemst í gegn, því próf sem sýnir aðeins að null verði null stenst þótt fallið skili alltaf null. Kafli 7 aðgreinir **frí, línulausan leik og forleik**, sem eru þrjár ólíkar tegundir af engu. **19 stökkbreytingar felldar**, taldar upp í hausnum; þrjár þeirra fundust við keyrslu en ekki lestur. Kafli 9 er AST-vörður: `dstStream` má ekki vera fullprófað og aldrei kallað |

**Mynstur sem á að endurtaka:** `render.mjs` krefst þess að núlldreifingin
standi **á undan** stigatöflunni í DOM. Það er ekki stílpróf heldur efnislegt:
tafla án vikmarka segir „þessi er bestur" þegar gögnin segja „þessi var heppnari".

**Gildra sem kostaði tíma:** jsdom-prófið rendrar `App` **án** StrictMode og sá
því ekki skyndiminnis-villuna sem hékk að eilífu í vafranum. AST- og jsdom-próf
lesa kóða; þau sjá ekki skjáinn.

---

## 6l. PRÓFAKERFIÐ SJÁLFT LAUG UM ÞEKJUNA — 19.8.2026, tveir dagar í draftið

Keyrslan prentaði þetta, í sömu keyrslu, fjórum sekúndum á milli:

```
  FAIL ekkert rusl i neinum flipa (🔌 Sources: ordid null)
  ...
HEILD: oll 25 profasofnin graen
```

**Safn greindi raunverulega villu og byggingin varð græn.** Þetta er nákvæmlega
sá flokkur sem `CLAUDE.md` 5b er skrifaður um — *vörður sem skýrir frá í stað
þess að fella er ekki vörður* — nema hér var þekjan ekki tóm heldur **raunveruleg
og niðurstaðan þögguð**, sem er verri útgáfa: 29 fullyrðingar keyrðu, ein féll,
og talan sem allir lásu sagði 25/25.

### Orsökin, og hún var ein lína sem VANTAÐI

`audit.mjs` taldi `fail++` í hverri einustu fullyrðingu — og notaði svo `fail`
**aldrei**. Skráin endaði á kafla 9 án samantektar og án `process.exit`. Node
skilar þá 0 og `run.mjs` telur safnið grænt. Hin 24 söfnin bera öll
`process.exit(fail ? 1 : 0)`; þetta eina gerði það ekki.

**Þetta var því ekki bara vantandi vörður heldur rangfærsla um þekjuna.** „25
söfn græn" er fullyrðing um að 25 söfn hafi *staðist próf*; eitt þeirra gat ekki
fallið, hvað sem það fann. Sama villa og harðkóðaða safna-talan sem kafli 6
varar við, nema hún var í niðurstöðunni og ekki í talningunni.

### Tvær aðrar holur í sömu ætt, fundnar við sömu skönnun

| hola | afleiðing |
|---|---|
| **`entry.mjs` var utan `SUITES`** | Fullgildur vörður — níu fullyrðingar, `ok()`, `process.exit(fail ? 1 : 0)` á sínum stað — sem **keyrði hjá engum**. Sama og `pos-vs-opponent.mjs` í FPL-appinu. Hann ver villu sem sást BARA í notkun (NFL-hlekkurinn hlóð FPL-appinu), svo hann er á draft-leiðinni. Skráður; grænn, 0 s |
| **`run.mjs` fleygði stderr** | `stdio: ["ignore", "inherit", "pipe"]` — stderr var þaggað til að kæfa `module.register()`-suðið og svo **aldrei lesið**. Safn sem **hrynur** skrifar stakkinn þangað, svo keyrslan sagði „safn fell" og birti ekki eitt orð um hvers vegna. Nú prentað, **aðeins við fall**, svo græn keyrsla er áfram hrein |

### Vörðurinn — og hann er í `wiring.mjs`, ekki nýju safni

`wiring.mjs` er safnið sem spyr *„er hreina rökfræðin raunverulega tengd?"*.
Kafli 8 leggur **sömu spurningu fyrir prófin sjálf**: hvert safn í `tests/`
verður að bera `process.exit(fail ? 1 : 0)` **og** vera í `SUITES`. Listinn er
**leiddur út úr möppunni**, ekki handskrifaður — handskrifaður listi staðnar um
leið og safni er bætt við, sem er villan sem `run.mjs` varar sjálfur við.

Miðja fullyrðingin (`fail` verður að vera **í skilyrðinu**) er nauðsynleg:
`process.exit(0)` í lokin væri exit-kóði sem getur ekki fellt neitt — gatið
sjálft í nýjum klæðum.

**Stökkbreytt, þrennt, allt fellt:**

| stökkbreyting | útkoma |
|---|---|
| `process.exit` fjarlægt úr `audit.mjs` | `FAIL … (audit.mjs)` |
| `process.exit(0)` í stað fail-hliðarinnar | `FAIL … (audit.mjs)` |
| `entry.mjs` út úr `SUITES` | `FAIL … (entry.mjs)` |

### OG VILLAN SEM VAR FALIN: orðið `null` á skjánum

Fullyrðingin sem hafði rétt fyrir sér allan tímann. Uppruninn var **mældur og
ekki giskaður** — rannsóknarskrifta gekk DOM-tréð og prentaði forfeðra-slóðina,
og nákvæmlega **eitt** textahnoð bar orðið:

```
td.txt.dim < tr < tbody < table.data < div.tablewrap < div.panel
"2026 week null: no league week yet - preseason has no matchup to advise on"
```

Það er `note`-svið `advice_ledger`-raðarinnar í `data/status.json`, skrifað af
`recordLedger()` í `scripts/snapshot-advice.mjs`:

```js
note: `${season} week ${week}: ${note}${gapTxt}`
```

Í forleik er `week` **null** (`seasonType: "pre"`) og skilyrðislaus innsetning
gerði hana að strengnum `"null"`.

**Fyrsta tilgátan var röng og mælingin sagði það.** Hún var að þetta væri
varnar-`null`-ið (`defense.json` ber 0 raðir fyrir 2026) — það er einmitt
ástæðan fyrir að ganga tréð í stað þess að grepa.

**`v.note` er ekki innri loggi.** Hann er sýnilegur texti undir „Data sources"
**og** tooltip á hverri röð — sama víxlun og `comp_label`/„Ofurbikar" í
FPL-appinu, þar sem „gögn, ekki viðmót" var forsenda sem hélt ekki í framkvæmd.

**Og skriftan vissi þetta þegar.** Tveimur tugum lína neðar stendur

```js
const label = week == null ? "preseason (no week)" : `${season} w${week}`;
```

fyrir **nákvæmlega sama gildi**. Konsól-úttakið var því rétt allan tímann og
aðeins það sem notandinn sér var rangt — versta víxlunin af þeim tveimur.

Lagað með sömu skilum: `week == null ? `${season} preseason``. `data/status.json`
var **endurmynduð með skriftunni sjálfri**, ekki handrituð (`recordLedger` er
les-breyta-skrifa á einn lykil); sannreynt með JSON-samanburði röð fyrir röð:
144 → 144 raðir, **ein** breytt, engin ný, engin horfin, ekkert toppsvið hreyft.
Stökkbreytt: skilyrðið fjarlægt, skriftan endurkeyrð → `audit.mjs` **fellur**,
exit 1.

### HVERT ANNAÐ SAFN VAR SÍÐAN MÆLT — með V8-þekju, ekki með lestri

Spurningin „er þessi hola í fleiri söfnum?" má ekki svara með heuristík. Fyrsta
tilraunin bar fasta textabúta úr hverri `ok()` við loggann og gaf **40 fölsk
jákvæð** í `render.mjs` einu — sniðmáts-strengir gera slíka pörun ónýta.

Rétta mælingin er `NODE_V8_COVERAGE` yfir **prófskrárnar sjálfar**:
`ok(`-kallstaður með telju **0** er fullyrðing sem keyrði aldrei. Yfir öll 26
söfnin (~2.000 kallstaðir) eru **tíu** dauðir, og enginn þeirra er hola:

| söfn | staðir | hvers vegna það er rétt |
|---|---|---|
| `dst.mjs` · `rulebasis.mjs` · `pipeline.mjs` · `learn.mjs` · `draft-live.mjs` | 5 | `ok(false, …)`-greinar sem kvikna **aðeins þegar eitthvað er að** (`dst.json vantar`, `catch`, „borðið tók ekki við valinu"). Þær eiga ekki að keyra í grænni keyrslu |
| `render.mjs` | 3 | Ótekna helftin af **ásettum** annaðhvort-eða greinum (`!S.measured`, og `S.rule !== "career"`). Báðar greinar eru prófaðar gegn `S.rule`, svo hvorug getur staðið þegar hin er í gildi — það er rétt hönnun og athugasemdin segir það |
| `dashboard.mjs` | 2 | Ein er skjöluð með `else`-grein sem **vísar á hvar tilfellið ER prófað** (`dst.mjs` kafli 8) og þekjan sjálf er fullyrt (`kinds.length >= 2`). Sú síðari er raunveruleg smá-hola, hér að neðan |

**Sterkasta niðurstaðan er neikvæð:** engin `ok()` inni í lykkju hafði telju 0,
svo **ekkert safn hefur tóma lykkju** — `react-warnings`-flokkurinn (0 af 22
viðmótum, grænt) er ekki til hér. Það er fullyrðing sem lestur getur ekki gefið.

### FUNDIÐ OG **EKKI** LAGFÆRT: `dashboard.mjs` l.873

```js
const { tCritFor } = await import("../src/rulebasis.js")
  .then((m) => ({ tCritFor: m.tCritFor || m.tCrit || null }))
  .catch(() => ({ tCritFor: null }));
...
if (tCritFor) { ok(Math.abs(tCritFor(7) - T_CRIT_7) < 0.0005, …); }
```

`tCrit` í `rulebasis.js` er **module-privat** (`const tCrit = (years) => …`, ekki
`export`). `m.tCritFor || m.tCrit` er því **alltaf null** og fullyrðingin getur
aldrei keyrt.

**Hún er samt ekki fals-grænt og því ekki lagfærð tveimur dögum fyrir draftið:**
aðal-akkerið tveimur línum ofar (`T_CRIT_7` == talan í töflunni í
`rulebasis.js`, og hún er **ekki** df=10-gildið 2,228) **keyrir** og myndi fella
prófið ef talan rækist. Það sem tapast er þverprófun á **fallinu** — bakfallið
`?? 2.228` eða uppflettingin gæti bilað á meðan töflu-talan stendur rétt.
Lagfæringin er ein lína (`export` á `tCrit`) og á að fara inn **eftir** draftið,
með stökkbreytingu sem sannar að fullyrðingin geti fallið.

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
| mælt forskot A-Ranking | **+186,1** (11/11, t=4,09) | **+147,4** (10/11, t=3,44) |

`taken`, `myPicks` og `sync` eru því **lykluð** (`D.scoped`), og
`DraftBoard`/`MyTeam` eru endurræst með `key`. Deildu tvær deildir
sama mengi væru leikmenn sem þú tókst í A strikaðir út í B og ráðgjöfin teldi
hóp sem þú eigir ekki þar.

#### DEILDIN VAR EKKI NÓG — BORÐIÐ TILHEYRIR DRAFTINU (16.8.2026)

Hér stóð að lyklarnir væru „á deild". Það var rétt lýsing á kóðanum og **röng
skorðun**, og munurinn er allur í ágúst: eitt mock á eftir öðru **í sömu deild**.
Notandinn hitti þetta lifandi fimm dögum fyrir alvöru draftið — nýtt mock sem
var rétt að byrja sagði **„Pick 60 — take this"** og „Your next pick is 66".

**Mekanisminn er tvíþættur og bæði þarf til:**

1. `taken` var vistað á **deildinni**, svo bæði mock lásu sama mengi.
2. `lastSync` — viðmiðið sem mismunar-reglan í `onPicks` dregur frá (villa 1 í
   töflunni neðar) — er `useRef` og byrjar **tóm við hverja hleðslu**. Fyrsta
   pollun eftir mount hefur því ekkert í `gone` og **getur ekkert annað en bætt
   við**. Mismunurinn sem var smíðaður til að hleypa Sleeper að taka til baka
   **fellur niður í sammengi þvert yfir F5**.

> **ÞESS VEGNA ER ENDURHLEÐSLAN Í MIÐJU PRÓFINU OG HÚN ER EKKI SKRAUT.** Mælt:
> í **samfelldri lotu virkar borðið rétt** — mismunurinn fjarlægir völ fyrra
> draftsins (59 → 3). Próf sem sleppti F5 hefði verið **grænt á villunni**.
> Handvirku völin eru hin leiðin að sömu villu í **sömu lotu**: þau eru
> viljandi utan mismunarins (þín skráning, ekki hans), svo ekkert fjarlægði þau
> nokkurn tímann — mælt 3 handvirk + 3 ný = **6**.

**Lausnin er skorðunin sjálf, ekki refin:** `D.boardScope(leagueId, draftId)`
gefur `deild@draft` þegar draft er tengt og `deild` eina þegar ekki. Draft-borð
geta þá ekki lesið hvert annað, og handvirk skráning heldur sínum stað.

**Fjögur skilyrði toga hvert á annað og þau eru öll vörður** (`draft-live.mjs`
kafli 15, tíu stökkbreytingar felldar):

| # | skilyrði | af hverju það togar á móti |
|---|---|---|
| a | annað draft **erfir ekki** | ella er alvöru draftið mengað af hverju mock-i |
| b | **F5 í miðju drafti skilar borðinu** | mengið er vistað nákvæmlega þess vegna; að tapa því í beinni væri verri villa en sú sem er verið að laga |
| c | **sama draft aftur skilar borðinu** | villa 4 í töflunni neðar var einmitt tómt borð í beinni |
| d | **handvirk skráning lifir** F5 án tengingar | þá er engin Sleeper-heimild til að lesa hana upp á nýtt |

**Þrjár afleiddar reglur, hver með sinn vörð** (`saved-state.mjs` kafli 8):

- **Hálfslegið auðkenni er ekki borð.** Notandinn slær í reitinn og hvert
  innsláttar-atvik gefur nýtt gildi — „1", „13", „138"… Skorðunin krefst því
  **berrar tölu af raunhæfri lengd**; allt annað fellur á deildina.
- **Tómt borð býr ekki til lykil, en tómt borð skrifast á lykil sem er til.**
  Fyrri helmingurinn ver gegn hálfskrifuðum borðum í geymslunni, sá seinni gegn
  því að „Reset" komi til baka við næstu hleðslu. `D.saveScoped`.
- **Borðum er grisjað** (`touchBoardScope`, síðast-notað röð, þak 8) því hvert
  mock skilur eitt eftir sig — **nema handvirka borðinu**, sem er eina eintakið
  af sínum völum og má aldrei detta út af aldri.

**Og „Reset" hreinsar geymsluna, ekki bara skjáinn.** Að slíta tenginguna færir
borðið samstundis yfir á deildar-lykilinn, svo `setTaken(tómt)` eitt hefði
**aldrei ratað í lykil draftsins** — hann hefði setið óskertur og endurtenging
hefði skilað völunum úr geymslu. Hnappur sem segist hreinsa verður að hreinsa
það sem hann sýnir.

**Borð sem fyllist af sjálfu sér þegir ekki lengur.** Villan var ekki aðeins
röng tala heldur **þögul** röng tala: 59 völ birtust án þess að neitt segði
hvaðan. Borðið segir það nú — *„59 picks restored from this browser"* — og
aðeins þá: fullyrðingin er „þetta kom úr vafranum", svo hún hverfur um leið og
Sleeper hefur talað eða notandinn hreyft eitt val.

**Reset-hnappurinn fluttist upp í tengi-spjaldið**, að beiðni notandans, og
rökin eru stærri en þægindin: hann er þurfandi á nákvæmlega því augnabliki sem
draft er sett upp. Hann situr **aftast í röðinni**, aftan við skilrúm og án
aðallitarins — eyðandi aðgerð á ekki að kalla á sig við hliðina á þeirri sem er
sótt oftast. **Enginn staðfestingargluggi:** modal á draftkvöldi stöðvar allt
meðan klukkan gengur, og verðið af óviljandi ýtingu er ein endurtenging.

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
milli tímabila, og það eitt færir varamanns-þrepið RB 27→32, WR 29→35, TE 14→17,
QB 10→12 — **83 af topp 100 hreyfast**, Lamar Jackson úr 38 í 52.

> Tölurnar voru **75 af topp 100** og **40 → 52**, og þrepið stóð sem
> „WR 30→35". Þær eru endurreiknaðar 14.8.2026: `WR 30` var flex-úthlutunar-
> villan sem 4b-2 lagfærði, og hinar tvær eru `players.json`-tölur sem reka
> daglega. **Fullyrðingin sem skiptir máli er hlutfallið, ekki talan** — að
> skipta um deildarstærð umskrifar meirihluta borðsins.

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

## 6g. DRAFT-RÁÐGJÖFIN VAR BLIND Á MEIÐSLI — 18.8.2026

**Þrír dagar í draftið, og appið sagði „kauptu" um mann sem er ekki í liðinu.**

`DraftBoard.jsx` sendi `recommend()` nákvæmlega
`{ id, name, pos, vbd, adp, adpSd, tier, proj }` — **ekkert um meiðsli**, þótt
`build.js` reikni `avail` (`availability()` í `model.js`) í sömu röð, fjórum
línum frá `proj`. Sleeper-spáin er **óafslegin**: hún er heilt 17-leikja
tímabil, líka hjá manni sem er á PUP-lista.

Mælt á raunborði dagsins, 10-liða PPR (hans eigin deild):

| | |
|---|---|
| George Kittle · `injury: "PUP"` · `avail: 0` | spá **169,3** stig, heilir 17 leikir |
| → | **aRank 61**, VBD 9,9, tier 14 |
| → | **Value +5,4 umferðir** — og hún var teiknuð **GRÆN** |
| Merkið á röðinni | **gult** („warn"), af því að liturinn kom úr nafnalista |

**Þrettán leikmenn með `avail: 0` báru aRank.** Kittle er sá eini sem er hátt,
en hann er nákvæmlega sá sem einhver tekur: TE, 61. sæti í röð, ADP 115, og
skjárinn segir að markaðurinn sé fimm umferðum á eftir.

**Þetta var YFIRSJÓN, EKKI HÖNNUN, og það er sannanlegt:** `src/lineup.js`
(`optimalLineup`) hefur **alltaf** borið `avail`, og `waivers.js` gerir það líka
(`value: "vbd > 0 AND projection is Sleeper's own AND availability 1"`). Tveir
hlutar sama apps spurðu sitthvorrar heimildar um sama mann.

**STÆRÐARGREINING FYRST, LAUSN Á EFTIR.** Þetta er **gildra per leikmann, ekki
halli á kerfinu**: að meðaltali eru meiddir leikmenn *ekki* sýndir sem kaup
(meðal-`value` heilbrigðra **+0,55** umferðir á móti **−0,99** hjá flögguðum).
Röðin í heild var því ekki skekkt — það er einn maður í 61. sæti sem er sagður
kaup og er það ekki. Þess vegna var lausnin **ekki** ný vog á allar spár.

**REGLAN ER MÆLD OG HÚN ER FLÖT.** FPL-hlutinn þessa repo mældi að
**`Out -> 0` sótti 84% af öllum tiltækileika-ábatanum** og að fínni þrep
(Questionable/Doubtful/æfingastaða) bættu engu þar sem vikmörkin útiloka null.
`avail-lab.mjs` hér ber **sömu** niðurstöðu (4i): ágiskaða taflan stendur,
`practice_status` gefur +0,44 pp með null innan CI. Því er **null-tilfellið eitt**
tekið hart og **enginn halli fundinn upp** — 0,25 og 0,75 ráða engu, nákvæmlega
eins og áður. Að finna upp gráðu hér væri ómæld tala í eigin reit.

**NULL ER EKKI NÚLL:** `avail == null` þýðir „við vitum ekki" og hann spilar.
Skilyrðið er `p.avail != null && Number(p.avail) === 0`. Stökkbreyting í
`!p.avail` **fellir öll fyrri köll** (þau senda ekkert `avail`, svo `undefined`
yrði „spilar ekki") — og prófið hrundi, sem er rétt hegðun.

**OG ÞEIM ER EKKI ÞAGAÐ Í HEL.** Ráðgjöf sem lætur mann horfa er ráðgjöf sem
ekki er hægt að vera ósammála: notandinn leitar Kittle, finnur hann ekki og
grunar villu. `recommend()` skilar þeim í nýju sviði **`sidelined`** með ástæðu
per mann (`"PUP — his projection is a full 17-game number and is not discounted
for this"`) og kassinn birtir hana. Sama krafa og `unranked` gerir um K og DST.

**Þrennt breyttist, allt lítið:**

1. `advice.js` — ein sía, **tvö notkunarsvið**: `avail: 0` fer úr `picks` **og**
   úr `expectedBestAt`. Hitt hefði blásið `expectedNext` upp og bráðanauðsyn
   hinna niður út frá stigum sem eru ekki til.
2. `DraftBoard.jsx` — `avail` og `injury` send inn; nótan birt.
3. Tveir **litir** sem lugu á sömu röð: merkið var `{Out, IR}`-**nafnalisti**, svo
   PUP/NA/Suspended/DNR/Practice Squad komu gul þótt `AVAIL` gefi þeim öllum 0
   — spurt er nú um **töluna**, ekki tvö af nöfnunum. Og græna „kaup"-merkið er
   tekið af „Value" hjá `avail === 0` (talan sjálf er áfram birt, sama regla og
   gulu hausarnir í FPL-hlutanum: **ófullkomin tala fullyrðir ekki**).

**Verðir og stökkbreytingar — níu, allar felldar:**

| stökkbreyting | hvað féll |
|---|---|
| `for (const p of playable)` -> `available` | `advice.mjs` 14, **2 fullyrðingar** |
| `expectedBestAt(playable)` -> `available` | `advice.mjs` 14, 1 |
| `avail != null && === 0` -> `!p.avail` | hrun (öll köll án `avail`) |
| `=== 0` -> `< 1` (uppfundinn halli) | `advice.mjs` 14, 2 |
| `sidelined` alltaf `[]` | `advice.mjs` 14 |
| `avail: r.avail` fellt úr `.jsx` | `advice.mjs` 14 **og** `render.mjs` 2 |
| merkið aftur í `{Out, IR}` | `render.mjs` 2 (c) |
| „Value" aftur grænt | `render.mjs` 2 |
| nótan fjarlægð úr `.jsx` | `render.mjs` 2 (a) |

> **OG MÆLITÆKIÐ SJÁLFT VAR VILLAN Í FYRSTU TILRAUN.** Stökkbreytingin
> `=== 0` -> `< 1` mældist **lifandi** — `perl -0pi -e s///` án `/g` skipti út
> **fyrsta** fundinum, sem var *athugasemdin* fjórum línum ofar sem NEFNIR
> skilyrðið. Kóðinn var óhreyfður og prófið því réttilega grænt. Sama ætt og
> `\bNaN\b`-gildran í `CLAUDE.md` 5b: *áður en þú trúir að stökkbreyting hafi
> lifað, athugaðu hvort hún var raunverulega gerð.*

> **OG EIN FULLYRÐING ER VEIK — ÞAÐ ER MÆLT OG ÞAÐ ER SKRIFAÐ Í PRÓFIÐ.**
> `render.mjs` (b) („enginn þeirra í rökstuðningnum") getur ekki fallið nema
> hliðarsettur maður komist í **efstu fimm**, því það er allt sem skjárinn ber.
> Stökkbreytingin sem hleypti þeim öllum inn í röðina aftur **var græn hjá
> henni**; `advice.mjs` kafli 14 felldi hana. Sama ósamhverfa og
> `playerlist-sort.mjs` í FPL-verkefninu.

**`injury` var EKKI sett í `DEFAULT_COLS`** — rökin eru í 6h.

---

## 6h. ÞVERSTÖÐU-ÞREPIN VORU BLÖNDUÐ — hálf útilokun á K/DST, 18.8.2026

**Þetta er sama villan og README 4b lýsir, í deildarlöguninni sem 4b gat ekki
séð.** 4b lagfærði leiguna sem hefur **engin** K/DST-sæti (`repl[pos] === 0`
→ `null` VBD). Deild notandans **hefur bæði sætin**, svo þar fá K/DST
raunverulegt VBD — og útilokunin á þeim var **hálf**:

| | K/DST í 10-liða deild með sætin |
|---|---|
| `rank`, `aRank`, `value` | **null** — `RANKED_POS` síar þau |
| `vbd` | tala, og **það er rétt** (deildin hefur K-varamann) |
| `posTier` | tala, og það er rétt (innan stöðu, smitast ekki) |
| **`tier`** (þverstöðu) | **tala — og hún smitaði** |

`tierize` reiknar þrepaskil úr **dreifingu bilanna** (`cut = meðaltal + sd`), svo
**76 K/DST-gildi í miðjunni færðu þröskuldinn**. Mælt 18.8.2026 á raunborði:

| leikmaður | aRank | VBD | þrep birt | þrep rétt |
|---|---|---|---|---|
| James Cook (RB) | 8 | 90,9 | **7** | 6 |
| De'Von Achane (RB) | 10 | 87,5 | **8** | 7 |

**Tveir af 1.067 — og báðir í topp tíu.** Það er ekki tilviljun: bilin eru stærst
í toppnum, svo þröskuldur sem hnikast hittir einmitt þar sem þrepaskil eru tekin
alvarlega. Á draft-borðinu er `tier` líka það sem dregur **skiptilínurnar** milli
raða, svo villan sást sem lína á vitlausum stað.

**HVERS VEGNA PRÓFIÐ SÁ ÞETTA EKKI — FÖLSK UNDANTEKNING.** `tests/model.mjs`
kafli 8 **(c)** prófaði þrepa-hreinleikann **aðeins** á löguninni **án** K/DST —
þar sem `vbd` þeirra er hvort eð er `null`, svo þrepið verður `null` af sjálfu
sér. **Fullyrðingin gat ekki brugðist í því formi.** Kafli **(b)** byggir lögun
**með** K/DST og prófar VBD þeirra, en spyr ekki um þrepin. **Tvær helftir sem
hvorug spurði** — sama ætt og `NextPick`-þakið, sem var grænt í hverju prófi því
hvert próf gaf deild og drafti SÖMU lögun.

**Orsökin í kóðanum var TVÖ AFRIT AF SAMA LISTA.** `const RANKED_POS` var
skrifað **tvisvar inni í `buildRows`**, sinn í hvorum hluta fallsins — annar
síaði K/DST úr `aRank`, hinn sleppti þeim inn í þrepin. Tvö afrit af sömu reglu
eru tvær útgáfur af henni; listinn er nú **eitt útflutt gildi** á
einingarsviði og prófið spyr hann.

**`computeVbd` er RÉTT sem hún er og má ekki „lagfærast" í sömu átt.**
Varamanns-gildin eru **per stöðu**, svo K/DST hafa engin áhrif á VBD annarra —
**mælt: 0 leikmenn af 1.067 haggast** sé þeim hent úr lauginni. Og deild sem
hefur K-sæti hefur raunverulegan K-varamann; að nulla það væri að henda stöðu
sem deildin ber. Útilokunin á að vera á **þrepunum**, ekki á VBD.

**Vörður: `tests/model.mjs` kafli 8c-2**, á því formi sem gat bilað — 10-liða
deild **með** bæði sætin, þekjan fullyrt fyrst (76 K/DST verða að bera VBD,
annars mælir kaflinn ekkert), og þrepin borin við **sjálfstætt viðmið** sem
byggir laugina með `filter` í stað `map`. Tvær stökkbreytingar felldar:
`tierPool` aftur í blandaða laug endurgerði **nákvæmlega** James Cook 7 og
De'Von Achane 8; `RANKED_POS` með K/DST inni felldi þrjár fullyrðingar.

> **OG EITT PRÓF FÉLL AF RÉTTUM ÁSTÆÐUM VIÐ ÞETTA.** `tests/learn.mjs` festi
> „`sharpDelta` er hvergi í A-Ranking-útreikningnum" með akkerinu
> `const RANKED_POS` — og þegar listinn fluttist upp á einingarsvið benti
> akkerið á hausinn á skránni og blokkin gleypti nánast alla `buildRows`,
> `sharpDelta` þar með. Nýja akkerið er `const ranked = withVbd.slice()`:
> **AST-akkeri sem er NAFN getur færst; akkeri sem er SETNING getur það ekki án
> þess að röðunin sjálf breytist** — sem er einmitt það sem á að fella prófið.
> Þekja er líka fullyrt núna (blokkin verður að vera >200 stafir og bera
> „aRank"), því `slice` sem verður tóm er þögul græn fullyrðing.

### `injury` ER NÚNA SJÁLFGEFINN DÁLKUR — notandinn bað um það

Fyrsta útgáfa þessa kafla sagði að `injury` hefði verið **skoðað og hafnað**
sem sjálfgefinn dálkur, með þeim rökum að Players-flipinn sé **falinn** og að
draft-borðið beri merkið hvort sem er. **Notandinn bað um dálkinn berum orðum**
og það er rétt hjá honum: „ég þarf að kveikja á honum sjálfur" er handvirkt
skref í tóli sem á að svara spurningunni óspurt, og röksemdin „hann er á
öðrum flipa" er ekki svar.

**Sætið er valið, ekki handahóf.** Hann kemur **eftir `bye`**, sem er fimmti
dálkur og innan skjás án skruns. `PlayerTable` byggir band-röðina með því að
hópa **samliggjandi** dálka eftir `band`: `name/pos/team/bye` bera ekkert band,
`injury` ber „Context". Væri hann settur milli `pos` og `team` klofnaði
bandalausi hópurinn í tvo hluta með einmanna „Context" á milli — **þrjú bönd
þar sem tvö eiga að vera**.

**LAYOUT-KOSTNAÐURINN VAR MÆLDUR Í ALVÖRU CHROME, EKKI ÁGISKAÐUR** (`visual.mjs`,
sem er eina prófið sem reiknar útlit): eftir að dálkurinn var settur inn er
**ekkert lárétt yfirflæði á 1440, 1024, 768 né 390 px**, **ekkert klippt
haus-heiti**, og símahamurinn óbreyttur (skrunkassi 342 px, taflan skrunar
**innan** hans). Dálkurinn er `type: "text"` með `short: "Status"` — 6 stafir,
innan 12-stafa marksins.

**OG DÁLKURINN ER EKKI EINA LEIÐIN, VILJANDI.** `PlayerTable` les
`loadState("cols", DEFAULT_COLS)`, svo notandi sem hefur **áður** breytt
dálkavalinu ber sinn eigin lista og fær þennan dálk **ekki**. Hefði dálkurinn
verið eina svarið væri upplýsingin horfin hjá þeim sem mest hefur notað appið.
Þess vegna eru **tvær leiðir að sömu upplýsingu**: dálkurinn, og merkið við
nafnið — sem er óháð dálkavalinu.

**OG MERKIÐ VAR GULT Á RÖNGUM MÖNNUM Á PLAYERS-FLIPANUM LÍKA.** Nákvæmlega
sami `{Out, IR}`-nafnalisti og í `DraftBoard.jsx` (6g), sami texti, í
`PlayerTable.jsx` — og aðeins annar var lagfærður fyrst. **Mælt: fjögur PUP-merki
komu gul** eftir að borðið var lagað. Þessi skrá ber sjálf setninguna
*„lærdómur sem er lærður á einum stað og ekki fluttur er ekki lærður"* (um
`signed()`), og hún gilti um þetta líka.

**Vörður: `render.mjs` kafli 3**, þrískiptur af því að `DEFAULT_COLS` er aðeins
sjálfgefið gildi — (a) dálkurinn er í settinu og hausinn á skjánum, fjöldinn
**reiknaður úr `DEFAULT_COLS`** og ekki bókaður · (b) merkið birtist **óháð**
dálkavalinu · (c) liturinn er rauður við `avail === 0` **og gulur annars**.
Þrjár stökkbreytingar felldar: dálkurinn tekinn úr settinu (2 fullyrðingar),
nafnalistinn aftur inn (**endurgerði PUP-in gulu**), og merkið **alltaf** rautt
— sú síðasta féll á (c)-andstæðunni, sem er til einmitt til að „lagfæringin"
verði ekki að hrópa um hvern sem er skráður úr af æfingu.

> **OG PRÓFIÐ SJÁLFT VAR RANGT Í FYRSTU ÚTGÁFU, AF NÁKVÆMLEGA ÞEIRRI VILLU SEM
> ÞAÐ VER.** Það **handskrifaði** listann af stöðum sem þýða „spilar ekki" og
> bar `DNR` með — svo það **felldi DNR-merkið fyrir að vera gult**. Merkið var
> rétt: `AVAIL.DNR = 0,5`, því DNR er **holdout, ekki meiðsli** — hann getur
> spilað en er ekki mættur. Listinn er nú **lesinn úr `AVAIL`**
> (`AVAIL[k] === 0`, 12 stöður), í prófinu eins og í kóðanum. Handskrifaður
> listi af stöðum var villan í `DraftBoard.jsx`, í `PlayerTable.jsx` og í
> prófinu sem átti að finna hana.

---

## 6i. ESPN-SENTINEL VAR MARKAÐSVERÐ — 654 tilbúin ADP, 18.8.2026

ESPN gefur leikmanni sem **er aldrei draftaður** sinn eigin
`averageDraftPosition`: sentinel um **170** með örlitlu flökti
(169,88–170,96). Flöktið er ekki hávaði heldur **meðaltal** — maður sem er
tekinn einu sinni og óskrifaður í 99 deildum lendir á 169,95.

Hann komst í `adp` gegnum **þriðja hlekkinn** í keðjunni
(`ffc ?? adpSleeper ?? adpEspn`) og `valueVsMarket` las hann sem verð.

**Mælt 18.8.2026 á `data/players.json`:**

| | |
|---|---|
| leikmenn með `adpEspn` | 982 |
| þar af í `[169, 171]` | **799 (81%)** |
| þéttleiki undir 165 | **4–8 leikmenn per 5 stiga bil** |
| þéttleiki 165–170 | **630** í einu bili |
| í klasanum: | **Joe Flacco, Frank Gore, Philip Rivers, Marcedes Lewis, Justin Tucker** |

Síðasta línan er sönnunin: **170 leikmenn í klasanum hafa hvorki lið né
Sleeper-spá.** Þeir eru ekki í NFL. Talan er „aldrei draftaður", ekki verð.

**AFLEIÐINGIN VAR Á SKJÁNUM:** `Darren Waller` (TE) bar **„+3,4 umferðir"
kaup**, `Mike Gesicki` +2,2, `Kenyon Sadiq` +1,8 — allir reiknaðir af tölu sem
þýðir að markaðurinn tók þá aldrei. Og **`adpSd` er `null` hjá öllum 654
ESPN-röðum**, svo lifunarlíkurnar keyrðu `1,08·√ADP`-varaleiðina á tilbúinni
tölu og borðið litaði þá eftir henni.

**RÖÐIN AFGREIÐIR SPURNINGUNA ÁN ÞRÖSKULDS — og það er atriðið.** Að velja
„sentinel er allt yfir X" væri ómæld tala. Það þurfti ekki:

> Í **báðum** deildarlögunum (10-liða PPR og 12-liða half) tók `adp` gildi úr
> ESPN í **654 / 677** röðum og **NÚLL af þeim var undir 165**. Hver leikmaður
> sem ESPN **veit** draftstöðu á er líka þekktur hjá FFC eða Sleeper. ESPN var
> því hlekkur sem skilaði **aðeins sentinel**.

Að taka ESPN úr keðjunni kostar þannig **nákvæmlega enga** raunverulega tölu og
fjarlægir 654 tilbúningsverð. `adp` er nú `ffc ?? adpSleeper ?? null`.

**Þetta er sama hlið og `sane()` í `scripts/sources/espn.mjs`**, sem sleppir
ESPN-spá yfir þreföldu meti í stað þess að lagfæra hana. **Og Sleeper-hliðið
var ÞEGAR til** — `adpSleeper`-nótan segir „Tómgildi (999/400) eru fjarlægð".
**Ein heimild var skoluð og hin ekki.**

**`adpEspn` stendur áfram** sem sitt eigið svið og sinn eigin dálkur: það er
ESPN-talan orðrétt, undir nafni ESPN. **Nótan segir nú frá sentinel-inum** —
að fjarlægja hann þar hefði kallað á þröskuld, og hann er ekki það sem fæðir
„Value" eða „Lasts?".

**Vörður: `tests/pipeline.mjs`** — þekjan fyrst (skráin **verður** að bera
sentinel-inn og menn án liðs, annars mælir kaflinn ekkert og væri samt grænn),
svo í báðum deildarlögunum: ekkert `adp` er ESPN-talan, og enginn þeirra 654
sem **aðeins** ESPN þekkir ber `value`. Stökkbreyting (ESPN aftur í keðjuna)
felldi **fjórar** fullyrðingar og endurgerði nöfnin: Matt Prater, Joe Flacco,
Frank Gore.

---

## 6j. A-RANKING MEÐDDAR VIÐ VARAMANN — og línan var ekki dregin, 18.8.2026

Borðið ber **557 menn** og draftið er **150 val**, en aðeins **78 hafa POSITÍFT
VBD** (mælt 18.8.2026, 10-liða PPR). Frá röð ~79 og niður er röðin því
**„minnst negatíft VBD"** — og það svarar **annarri spurningu** en efri
helmingurinn:

| | merking |
|---|---|
| `VBD > 0` | hversu miklu **betri** en maðurinn sem er **frír** á hans stöðu |
| `VBD < 0` | hversu miklu **verri** en maðurinn sem er frír á hans stöðu |

Neðan við núllið er samanburður **milli** staða enn reiknanlegur en hann er ekki
lengur ákvörðunin sem hann var: þú myndir hvorugan **byrja**. Að bera −16 (WR)
við −20 (TE) er formlega sama reikningur og að bera +90 við +80, og hann er
prentaður **eins letraður** — en hann ber ekki sama vægi.

**OG MÆLINGIN HEFUR NÆSTUM EKKERT VALD ÞARNA, ÞAÐ ER ÞAÐ SEM SKIPTIR MÁLI.**
`accuracy.js` draftar 14 umferðir en skorar á **`startersPoints`** — byrjunarliði
einu. Bekkjarval skorar **0** nema það komist í liðið. Fullyrðingin „+233,6 gegn
ADP, vinnur öll fimm árin" er þess vegna nær eingöngu um **fyrstu ~7 umferðir**.
Talan í röð 120 er ekki röng; hún er **minna mæld**, og skjárinn sagði það ekki.

**RÖÐIN HAGGAST EKKI — HÚN ER FRYST OG HÚN ER MÆLD.** Þetta er **birting**:
strikuð lína (`.vbdzero`, gulur í stað `--accent` svo hún lesist ekki eins og
þrepalína) á fyrstu röð með `vbd <= 0`, og **setning sem segir töluna**: „N of
these 200 are above replacement… the backtest that justifies this order scores
**starters only**, so it has almost no power down there."

**Vörður: `render.mjs` kafli 2** — þekjan fyrst (borðið **verður** að bera bæði
positíft og negatíft VBD, annars eru engin skil til að draga), **nákvæmlega ein**
lína merkt, hún liggur á fyrsta non-positífa VBD og röðin fyrir ofan er enn
positíf, og **talan í setningunni er talan í töflunni**. Þrjár stökkbreytingar
felldar: klasinn tekinn út, **hver** negatíf röð merkt (litur í stað skila), og
talan í setningunni skipt út.

> **OG SÚ SÍÐASTA FULLYRÐING FELLDI MITT EIGIÐ PRÓF FYRST, ÁÐUR EN HÚN VARÐ
> VÖRÐUR.** Fyrsta útgáfan las `querySelectorAll("table.data tbody tr")`, sem
> tekur **líka** rökstuðningstöfluna inni í `<details>` — þar sem `td[4]` er
> „Next best", ekki VBD. Fimm positífar tölur úr **rangri töflu** gáfu 99 þar
> sem borðið bar 94, og fullyrðingin „talan í setningunni er talan í töflunni"
> **féll**. Taflan er nú tekin úr **sömu `.tablewrap`** og setningin, svo þær
> geta ekki lesið sitthvora töflu. Fullyrðingin er þannig vörður um viðmótið
> **og um sjálfa sig**.

### `sos`-nótan lofaði stöðu-sundurliðun sem er ekki til

Nótan sagði *„Meðal vænt stigaskor andstæðinganna **gegn hans stöðu**"*. Talan
er það ekki. `buildSos` skilar `t.allowed` úr `market.json` — vænt stigaskor
andstæðinganna gegn **liðinu**, ein tala per lið.

**Mælt 18.8.2026:** allar **30 ARI-raðirnar** (QB, RB, WR, TE, K, DST) bera
**sama gildið 26,97**, og **0 af 32 liðum** bera fleiri en eitt gildi. Engin
stöðu-sundurliðun er reiknuð, hvorki í `build.js` né í pipeline.

Orðalagið „gegn hans stöðu" er úr **`DEF_WEIGHT`** (vörn gegn stöðu), sem er
**vikulegi** líkansþátturinn og lifir annars staðar. Nótan hafði tekið orðin að
láni og lofað þar með tölu sem er ekki í dálkinum — nákvæmlega „birt tala sem
ekkert bakar upp". Nótan segir nú **„LIÐS-TALA"** berum orðum, bæði fyrir `sos`
og `playoffSos`.

**Vörður: `pipeline.mjs`**, í báðar áttir — (a) talan **er** liðs-tala (þekjan
fullyrt: hvert lið verður að bera ≥3 stöður, annars væri „eitt gildi per lið"
satt af tómum ástæðum), og (b) nótan má ekki bera loforðið aftur. Væri
stöðu-sundurliðun einhvern tíma reiknuð á (a) að **falla og verða skoðað**, ekki
þagna.

**ÓLAGFÆRT OG ÞAÐ ER ÁKVÖRÐUN:** `hi: false` (lægra er betra) er **rétt fyrir
DST** — vörn vill fá á sig lítið — en fyrir **sóknarmann** er há andstæðingslína
oft **skothríð** og því **gott**. Sami dálkur ber því tvær áttir og myndin er
villandi fyrir aðra þeirra (`compare-visual`-lærdómurinn úr FPL-verkefninu:
*„villandi mynd er verri en engin mynd"*). Að snúa honum væri hins vegar
fullyrðing sem enga mælingu hefur, og mæld áhrif dálksins eru **0,13% í RMSE**.
Rétta röðin er **mæling fyrst** — hún á að spyrja hvort `hi` eigi að fylgja
stöðu — og hún bíður tímabilsins. Skráð hér svo hún þagni ekki.

---

## 6k. FUNDIÐ OG **EKKI** LAGFÆRT — 18.8.2026, þrír dagar í draftið

Þrjú atriði voru staðfest á raungögnum og **viljandi látin standa**. Ástæðan er
sú sama í öllum þremur: **lagfæringin þyrfti mælingu sem ekki er til, og
ómæld lagfæring þremur dögum fyrir draft getur gert appið verra en það er.**
Þau eru skráð hér svo þau þagni ekki.

### (1) TIGHT ENDS ERU 3–4 UMFERÐUM RÍKARI EN BÆÐI MARKAÐURINN OG SÉRFRÆÐINGAR

**Mælt 18.8.2026, innan draftanlegs bils (`aRank <= teams·rounds`):**

| staða | 10-liða PPR (hans): ADP − aRank | ECR − aRank | 12-liða half: ADP − aRank | ECR − aRank |
|---|---|---|---|---|
| QB | +11,2 | 0,0 | +0,1 | −10,9 |
| RB | −3,0 | +2,2 | −3,9 | −3,7 |
| WR | −20,0 | −16,2 | −13,9 | −4,7 |
| **TE** | **+38,8** | **+29,4** | **+40,8** | **+31,5** |

Positíft = við röðum honum **fyrr** en þeir. **TE er eina staðan sem er ríkari en
BÁÐAR óháðar heimildir**, og áhrifin á skjáinn eru alger: **12 af 12 hávaðamestu
„BUY"-merkjum eru tight ends** í hans deild (11 af 12 í 12-liða half). Við höfum
**5 TE í topp 50**; markaðurinn hefur **2**.

**MEKANISMINN ER FUNDINN OG HANN ER EIN TALA.** `replacementRanks` gefur
**`TE: 14`** í 10-liða deild sem hefur **eitt** TE-sæti: `FLEX_SPLIT.TE = 0,193`
× 2 flex × 10 lið = 3,86 flex-TE ofan á TE10. Varamanns-þrep tight ends er því
sett á **TE14** og hver einasti TE fær VBD sem er TE10→TE14-bilið hærra.

**`FLEX_SPLIT.TE = 0,193` ER MÆLD TALA OG HÚN VAR EKKI HREYFÐ.** Hún lagfærði
raunverulega villu (fyrsta útgáfan ágiskaði 0,10) og `model.mjs` kafli 9 ver
hana. **Að endurstilla hana núna væri nákvæmlega það sem þetta skjal bannar.**

**TILGÁTAN VAR AÐ ÞAÐ VÆRI LÖGUNIN — OG HÚN VAR MÆLD SAMA DAG.** Sjá
`fc279d9` („FLEX_SPLIT.TE sveipað"), sem er sjálfstæð mæling og hún **staðfestir
uppruna** en **hafnar breytingunni**:

| | |
|---|---|
| `calibrate.mjs` mældi 0,193 á | **12 liðum, RB2/WR3/TE1, EINU flexi, fullri PPR** |
| **hvorug deild notandans er sú lögun** | 10-liða PPR 2FLEX · 12-liða half 2FLEX |
| flex-hlutdeild TE **í hans lögunum** | **0,073** og **0,083** |
| per tímabili í upprunalegu löguninni | 0,130–0,352 (engin `se`, engin `n` bókuð) |
| sveipur TE 0 → 0,40, tvær mælieiningar | **0 af 102 frumum standast** bootstrap klasaðan per leikmann |

Talan var því **mæld á rangri lögun** — nákvæmlega sama ætt og
„helmingunartími 1,5 — mælt á röngu markmiði" og „talan 5,831% var
sjálf-smituð". **En það þýðir EKKI að nýtt gildi sé betra:** hvert einasta
leikmanna-klasað bil inniheldur null, alveg eins og í README 4c (28 hólf
árs-klasað → **0 af 153** leikmanna-klasað). Þrennt stendur samt:

- **Dýpra er MÆLANLEGA VERRA:** `te = 0,40` gefur −56,1 stig (t −2,52) og −0,74
  sigra, bæði árs-CI útiloka null. **0,193 er á RÉTTRI hlið.**
- **Grynnra hallar rétt en fellur á klösuninni:** `te = 0,10` gefur +23,6 stig
  **og** +0,64 sigra í 10-liða PPR, en leikmanna-CI [−0,71, +1,00].
- **Áttin heldur ekki milli deildanna tveggja:** 12-liða half gefur `te = 0`
  −0,18 sigra og −11,1 stig. **Merki sem skiptir formerki milli deildanna sem
  það á að ræða er ekki merki.**

**Niðurstaðan er því ÓBREYTT TALA MEÐ ÞEKKTA SKEKKJU, ekki ný tala** — og það er
sterkari staða en áður, því nú er vitað **hvar** skekkjan liggur og að hún hallar
í átt sem mælingin getur ekki greint frá núlli.

**Þangað til: TE-„BUY"-merkin eru RAUNVERULEG SPÁ LÍKANSINS, ekki villa — en
þau eru öll sama veðmálið.** Sá sem tekur fjóra af tólf hávaðamestu kaupum
hefur veðjað öllu á eina tölu, í deild með **eitt** TE-sæti og `maxPos.TE = 2`.
Þakið verndar hann; röðin gerir það ekki.

### (2) „Still to fill" segir „take him now" þegar **engin val eru eftir**

`mustFillUrgent = needed > 0 && picksLeft <= needed + 1`, og
`picksLeft = max(0, rounds − roster.length)`. Við `roster.length >= rounds`
verður `picksLeft` **0** — og skilyrðið er þá **satt**, svo kassinn skrifar
*„You have **0** picks left and still need K and DST. **Take him now** or start a
player short."* Tvennt í sömu setningu sem getur ekki bæði verið rétt.
**Endurgert 18.8.2026** með 20 „mine"-klikkum í 15-umferða deild.

**EKKI LAGFÆRT, OG ÁSTÆÐAN ER RISK-ASYMMETRÍA.** Ástandið krefst
`roster.length >= rounds` — í Sleeper-tengdu drafti þýðir það að draftið er
**búið** hjá honum, og í handvirka borðinu að hann klikkaði of oft. En
`mustFillUrgent` er **það eina sem segir honum að taka spyrnumann og vörn**, og
mæld hermun sýndi hópinn `RB3 WR7 TE2 QB2` með **tvö tóm byrjunarsæti** þegar
það þagði (README 4b / `advice.js`). Að þrengja skilyrðið í `picksLeft > 0` gæti
slökkt á viðvöruninni í **síðustu umferð**, sem er einmitt umferðin sem hún er
til fyrir. **Sjálfmótsagnakennd setning í ástandi sem er þegar búið er minni
skaði en þögn í síðustu umferð.** Rétta lagfæringin er að skilja
„taktu hann núna" frá „þú endaðir einn skammur", og hún á að koma **eftir**
draftið með prófi sem drífur allar 15 umferðirnar til enda.

### (3) `MAE 50` prentar tvo aukastafi þar sem allt í kring prentar einn

`Experts.jsx` skrifar `{e.mae50 ?? "—"}` **hrátt af diski** (43,79 · 66,04 ·
22,31) meðan `z` við hliðina er `toFixed(1)` og `Sharp Δ` er `toFixed(0)`.
**Mælt á skjánum:** af öllum tölum í öllu appinu bera **53 leaf-element**
tvo aukastafi og **öll nema eitt** eru þessi eini dálkur (það eina er `r = 0,16`
í prósa, þar sem tveir aukastafir eru réttir). Tveir aukastafir á MAE yfir topp
50 eru auk þess **fals-nákvæmni**.

**Ekki lagfært:** Experts er **falinn flipi**, þetta er hreint snyrtimál, og
sérhver breyting kallar á vörð sem kostar meira en villan. **Það var samt mælt,
ekki ágiskað** — sem er ástæðan fyrir að hún er hér með stað og stærð í stað þess
að vera „eitthvað um aukastafi einhvers staðar".

> **OG EITT SEM VAR RANNSAKAÐ OG **REPRODUCERAÐIST EKKI**:** „59 raðir prenta tvo
> aukastafi" var leiðin inn í (3), og hún er **röng um `proj` og `value`**.
> Þau bera vissulega tvo aukastafi **í gögnunum** (59 og 244 raðir), en **hver
> birtingarleið rúnnar** — `fmt()` í `PlayerTable`, `n()` og `signed()` í
> `DraftBoard`. DOM-skönnun á öllum níu flipum fann **ekkert** af þeim á skjánum.
> Villa í gögnum sem enginn sér er ekki villa á skjánum, og það er munur sem
> aðeins skjá-lestur getur gert.

---

## 6o. „FINNDU SLOTTIÐ MITT" — appið les sætið sjálft, líka í mock-i, 20.8.2026

Beiðnin var orðrétt: *„Nei eg vill ad thu finnir slottid mitt, finndu leidir til
thess ad lata appid gera thad."* Tölu-reiturinn var ekki svar heldur uppgjöf.

### Hvers vegna mock hafði enga leið

`resolveSlot` bar tvær leiðir — `draft_order[uid]` og deildar-vörpunina — og
**báðar kröfðust `uid`**, sú síðari líka deildar. Í mock-i (engin deild, og hann
hafði aldrei slegið inn nafn svo `uid` var `null`) hafði hún því **enga gilda
leið**.

**Mælt, ekki tilgáta:** hún skilaði `null`, hún skilaði **ekki** 5. Erfða sætið
kom úr einni línu í `connect` (`slot: slot != null ? slot : sync.slot`).
Stökkbreyting á þeirri línu fellir `draft-live.mjs` 18 með fjórum fullyrðingum;
uppflettingin sjálf var alltaf heiðarleg. Tilgátan um að ein leiðanna paraði á
einhverju sem er ekki identitet var **röng**.

### Mælt á lifandi API 20.8.2026 — fjögur lokin draft

| draft | vol mín | `draft_slot` | `draft_order[ég]` |
|---|---|---|---|
| 1257479008598110209 | 14/14 | **5** | 5 |
| 1257117602308689921 | 15/15 | **3** | 3 |
| 1126700095157714944 | 14/14 | **1** | 1 |
| 1124851993081290753 | 15/15 | **5** | 5 |

**Fjögur draft, fjögur ólík sæti.** Sjálfstæð staðfesting á því að sætið sé
eiginleiki *draftsins* og megi aldrei erfast — hann hefur ekki setið í sama sæti
tvisvar í röð. Og leiðirnar tvær gáfu **sömu tölu í öllum fjórum**, sem er
forsendan fyrir því að hafa þær báðar í stað að velja eina.

> **GILDRA SEM KOSTAÐI MÍNA EIGIN FYRSTU MÆLINGU:** LISTA-endapunkturinn
> (`/user/{id}/drafts/nfl/{ár}`) **nullar `draft_order`** — líka á loknum
> draftum. STAKI (`/draft/{id}`, sá sem appið notar) ber hana. Fyrsta mælingin
> las listann, fékk null í **sex af sex** og dró af því að leið A væri nánast
> aldrei til. Hún er til; hún kemur þegar röðin er dregin. Bæði 2026-draftin hans
> eru `pre_draft` og bera null, bæði loknu bera hana. **Og þetta er raunveruleg
> gildra í okkar eigin kóða:** `sleeperResolve` fellur í `sleeperDrafts(leagueId)`
> — listann — þegar `league.draft_id` brestur, svo leið A getur verið dauð af
> okkar eigin völdum. `pull()` sækir stakan í hverri pollun og nær henni inn.

### Þrjár leiðir, og sú sterkasta er völin

`resolveSeat` (`sleeper-league.js`, **hreint fall**), í þessari röð:

| | leið | hvað hún notar | gerð |
|---|---|---|---|
| **B** | völin | `picks[].picked_by === uid` -> `draft_slot` | **sönnunargagn** |
| A | röðin | `draft_order[uid]` | stilling |
| C | deildin | `slot_to_roster_id` -> `rosters[].owner_id` | stilling |

**Leið B er ný og hún er sú sem virkar í mock-i:** hún þarf hvorki deild,
`slot_to_roster_id` né notendalista. Botar geta ekki ruglað hana — við leitum að
**hans** auðkenni, svo hvað sem þeir bera er ósnert (mælt: `picked_by` var ekki
tómt í einu af 580 völum).

**VÖLIN VINNA ÞEGAR LEIÐIRNAR REKAST Á**, og það er ekki smekkur: B er dregin af
því sem **gerðist**, A og C segja hvað **átti** að gerast. Stilling getur verið
gömul, afrituð eða innslegin; val sem er skráð á mig **er** mitt.

Þess vegna yfirskrifar B líka sæti sem er **slegið inn í hendi** — undantekning
frá „handvirkt slær sjálfvirkt", vísvitandi: rangt sæti sem **lítur trúverðugt
út** (3 er gilt sæti í 10-liða drafti, svo `slotOk` kviknar ekki) stóð áður allt
draftið. Nú læknast það við **fyrsta val hans**. Stilling fær hins vegar
**aldrei** að yfirskrifa innslátt.

### Leiðin er nefnd á skjánum

`slotAuto` (boolean) sagði „read from Sleeper", sem er satt um allar þrjár leiðir
— svo sæti úr **rangri** leið las eins út og sæti úr réttri. Nú:
`read from your own picks` · `read from the draft order` ·
`read from the league roster`. **Þögult rétt svar og þögult rangt svar líta eins
út**, og það var nákvæmlega ástandið sem lét hann drafta sem sæti 5.

Sætið er leyst **í hverri pollun**, ekki aðeins við tengingu. Gamla hliðið var
`sync.slot == null`, sem gerði það einskipta: rangt sæti var **óleiðréttanlegt af
appinu sjálfu**.

Reiturinn er síðasta úrræðið og **segir hvers vegna** — þrjú ástönd, þrjár
setningar, því þau kalla á sitthvora aðgerð: auðkenni vantar -> settu
**notandanafn** í reitinn ofar (eitt kall, vistað eftir það) · auðkenni til en
engin heimild -> **bíða**, „it reads itself from your first pick" · annað draft
en deildin -> listinn er ekki þessa draftsins.

### Verðir — og hver leið prófuð ein

`sleeper-league.mjs` 11 prófar hverja leið með **laug þar sem aðeins hún getur
svarað**. Það er forsenda, ekki þægindi: laug með allar þrjár heimildirnar gæti
verið græn þótt tvær væru dauðar. Auk þess: ágreiningur (A segir 5, C segir 9, B
segir 7 -> **7**, og án valanna svarar sama laug 5, svo A er raunveruleg) ·
tvírætt -> `null`, ekki „fyrsta" · sæti utan draftsins -> `null` á öllum leiðum.

**Prófið fann tvær villur í fallinu sjálfu:** `= {}` ver aðeins `undefined` svo
`resolveSeat(null)` hrundi, og `"   "` er sanngildi sem strengur svo hvítbil
taldist auðkenni.

`draft-live.mjs` 18 var **endurskrifaður** og ástæðan er verðmæt: hann fullyrti
að nýtt mock án sæta-heimildar gefi **tóman** hóp og spurningu. Það varð **ósatt**
þegar leið B kom, prófið fell — og það var **rétt hjá því að falla**: forsendan
var ekki lengur til. Nú í fjórum þrepum, hans eigin saga: sæti 5 í drafti A ->
sami maður í sæti **7** í mock-i B, leyst **án innsláttar** -> draft C án
heimildar **spyr** -> innslegið sæti 3 leiðréttist í 7 við hans fyrsta val.

**Níu stökkbreytingar, þrjár lifðu fyrst og voru lagaðar.** Sú lærdómsríkasta:
„stilling má yfirskrifa innslátt" lifði því fullyrðingin var **eftir** að völin
höfðu leyst sætið, svo `draft_order` var aldrei spurð. Hún var **færð framar** —
CLAUDE.md 5b, fullyrðing sem þarf tvennt til að bregðast er veikari en hún lítur
út fyrir að vera.

---

## 6p. HEILT MOCK KEYRT EFTIR RÁÐGJÖFINNI — 20.8.2026

Hann fór eftir **hverri** ráðleggingu og endaði með tíu WR, tvo TE, einn QB,
tvær varnir og **engan RB, engan spyrnumann** — þrjú byrjunarsæti tóm, síðasta
lið af tíu. Ekkert próf gat fangað það, og ástæðan er ein: **hvert einasta
fixture gaf appinu réttan hópinn.**

`draft-live.mjs` 21 keyrir 10 liða, 15 umferða, full-PPR mock **úr sæti 7** og
les nafnið **af skjánum** (`.verdict-name b`) við hvert eitt af 15 völunum.
Ekkert í prófinu veit hvernig `recommend` vinnur; það hlýðir úrskurðinum,
nákvæmlega eins og notandinn gerði. Botarnir velja eftir ADP — það er forsenda,
ekki smekkur: laug valin til að **þvinga** RB-skort væri prófið að svara sinni
eigin spurningu. ADP-röðin gefur líka K og DST sinn raunverulega stað (sjö
varnir, sex spyrnumenn innan fyrstu 150 valanna).

**Niðurstaðan er græn:**

```
hopurinn: QB 2 · RB 6 · WR 3 · TE 2 · K 1 · DST 1   (FLEX-afgangur 6)
volin:    7:RB 14:TE 27:TE 34:RB 47:RB 54:RB 67:WR 74:QB 87:QB
          94:WR 107:RB 114:RB 127:K 134:DST 147:WR
```

Hvert byrjunarsæti fyllt, **sex RB** og spyrnumaður/vörn þegar `mustFill` nefndi
þau. **Ráðgjöfin var aldrei biluð; hún var spurð um lið annars manns.**

Röðin var **ekki hreyfð og má ekki vera**: bráðanauðsyn sem *röð* er mæld og
hafnað (`urgencyDrivesOrder: false`, −60,06 í standard, 0 af 5 árum). Hefði
kaflinn fallið **með réttum hóp** væri það ný vísbending gegn mældri niðurstöðu —
tilefni til að mæla upp á nýtt, ekki til að endurraða listanum.

Uppstillanleikinn er **reiknaður í prófinu**, ekki fluttur inn: `optimalLineup`
svarar sömu spurningu og því má hún ekki vera svarið — tvær útfærslur af sömu
reglu sem eru báðar skakkar eru grænar saman. Talningin er lesin af skjánum
(„RB 2/2") og FLEX úr afgangnum. **Tveir óháðir lesarar** á sömu staðreynd: talan
sem prófið reiknar og `warn`-merkið sem notandinn sér.

**Tvær stökkbreytingar, og þær skipta verkum:** `needKdst = false` -> **K0 DST0**,
síðustu þrjú völin öll WR (tvö af þremur tómu sætunum hans) · `isMine` les sæti 5
þegar þú ert 7 -> kafli **18** fellur með tveimur og kafli **21** með QB0/K0. Sú
síðari afmarkar verkin berum orðum: **18 ver identitetið, 21 ver afleiðinguna.**
Hvorugur er nóg einn — 21 les sama hóp og ráðgjöfin fær.

---

## 6q. VISTAÐ ÁSTAND GAT BORIÐ „DEF" — og þá var varnar-sætið aldrei fyllt

`normalizeLeague` þvingaði **töluna** í `starters` en ekki **heitið**. Deild sem
ber `starters: { DEF: 1 }` — Sleeper-stafsetningin, sem eldra vistað ástand getur
borið — gaf `mustFill = [{ pos: "DEF" }]` meðan **hver röð** í appinu ber
`pos: "DST"` (mælt: `players.json` ber DST í öllum 32 liðum og DEF í engu).
`NextPick` velur K/DST-manninn með `kdst.find(r => mustFill.some(m => m.pos === r.pos))`
sem finnur þá **aldrei neinn**: úrskurðurinn nefnir aldrei vörn,
`mustFillUrgent` stendur satt til draftsloka, og notandinn endar með **tómt
varnar-sæti**. Ekkert hrynur og engin tala er röng — stöðurnar tvær eru einfaldlega
ekki sami strengurinn.

> **ÞETTA VAR AFGREITT SEM „EKKI VILLAN" SAMA DAG OG ÞAÐ VAR RÉTT UM ÞANN
> VILLUFUND** — rótin þar var erfða `slot`-ið. En það var mælt á **einni** leið af
> þremur: `startersFromRoster` varpar `DEF -> DST`, stillinga-viðmótið skrifar
> aðeins `DST`, og **þriðja leiðin — vistað ástand um `normalizeLeague` — slapp.**
> Nákvæmlega flokkurinn sem CLAUDE.md kafli 8 lýsir.

Leyst með `normPos` (`scoring.js`) — vörpuninni sem **pipeline-ið sjálft** notar
þegar það skrifar `players.json` (ellefu kallstaðir í `scripts/`). Að lesa
deildina með sömu vörpun er að spyrja skrifarann; þetta er **fyrsti kallstaður
hennar í `src/`**. Lagt saman, ekki yfirskrifað — og **summan lýtur sama þaki og
liðurinn** (`int(n, 0, 6)`), því tölu-vörn sem gildir per svið en ekki per summu
er engin vörn.

**Skráð, ekki lagað:** `startersFromRoster` ber sitt eigið handskrifaða afrit af
sömu vörpun og kallar ekki `normPos`. Tvö afrit geta rekið í sundur.

Vörður: `advice.mjs` 16, tvíþættur — heitið þvingað við lestur, **og**
invariantið sem hliðið hvílir á: hver staða sem `mustFill` **nefnir** verður að
vera staða sem röð **getur borið**, og orðaforðinn er lesinn úr `players.json`.
Þrjár stökkbreytingar, engin lifði.

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

### 6b-6. TVEIR KOSTIR — OG 95%-MÓTSÖGNIN SEM STÓÐ Í KASSANUM (20.8.2026)

Notandinn las þetta:

    Pick 17 — take this: TE Brock Bowers · bye 13
    95% likely to still be here in 8 picks

og spurði — réttilega — **hvers vegna hann ætti að eyða vali 17 á mann sem er 95%
viss um að vera enn laus í vali 25.** Talan var rétt, hún var mæld
(`survivalProb`, `SD_K = 1,08` fittað á 1.882 leikmanna-árum) og hún stóð sem
**rökstuðningur** fyrir vali sem var tekið á virðinu einu. Merkið var þegar í
appinu og mótsagði úrskurðinum í sínu eigin spjaldi.

**Beiðnin sem kom út úr því:** *„eg vill ad appid maeli med 2 leikmonnum. Thannig
ad eg geti valid ut. 2 bestu sem eru i bodi."*

#### Þetta snýr við eigin ákvörðun hans — og hún var rétt þá

Kassinn bar áður **fimm raðir** og hann sagði: *„eg vill ekki thurfa ad velja
neitt"*. Það er rétt um fimm óaðgreindar raðir: þær skila ákvörðuninni til baka
án hjálpar. **Tveir eru ekki fimm** — annað nafnið ber nákvæmlega það sem greinir
þau að:

- **bilið í VBD** („18,7 VBD behind him")
- **hvort hvor lifir að næsta vali** — fyrir **báða**, sem var einmitt það sem
  vantaði
- **stöðurnar**, því það er ásinn sem hann velur á

Einn 95% og annar 20% er **ekki jafntefli heldur augljóst svar**, og appið faldi
það. Ein setning er dregin út úr því (`waitNoteFor`, hrein): *„Bowers is 92%
likely to still be there at pick 25 and Gibbs only 1% — taking Gibbs now is the
one order that can end with both. The order above is still by value: Gibbs is 8
behind."* Það er **aritmetík á mældum tölum**, ekki ný vog — og hún er
staðfesting á því sem `advice.js` segir sjálft að lifunarlíkur séu til fyrir:
*þær segja þér hvort þú getir beðið, en þær ráða ekki.*

#### Hvað var EKKI gert

- **Röðin haggast ekki.** `choice.list[0]` **ER** `picks[0]` — sami maður sem
  mælda röðin (A-Ranking/VBD) setur fyrstan. Bráðanauðsyn sem **röð** var mæld og
  hún tapar (−60,06 í standard, **0 af 5 árum**); lifunarlíkur sem
  jafnteflis-rof gáfu ekkert (t = −0,06 / +0,79). Hvorugt er tekið upp aftur.
- **Ekkert er raðað eftir lifun.** Sama ástæða.
- **K/DST standa fyrir utan** og koma áfram úr sinni eigin töflu með
  `mustFill`-línunni.
- **Sá sem spilar ekki (`avail: 0`) er hvorugur kosturinn** — sama sía, ekki ný.
- **Ekkert fyllt upp í annað sætið:** skurðurinn er `vbd > 0` (virði ofan á
  varamann, sama mælda lína og `sidelined` notar). Sé aðeins einn yfir henni er
  **einn** sýndur og það er sagt berum orðum.
- **Þriðja nafnið birtist AÐEINS þegar tveir fyrstu eru í sömu stöðu** — þá eru
  þeir skiptanlegir fyrir hópinn og valið sem hann stendur frammi fyrir er ekki á
  skjánum. Hans orð: *„svo leikmadur til vara ef eg tharf frekar RB"*. Það er
  besti maður úr **annarri** stöðu úr sama lista — ekki ný röð.

#### Stökkbreytingar — og sú fyrsta lifði

| stökkbreyting | útkoma |
|---|---|
| `choice.list` raðað eftir bráðanauðsyn | **LIFÐI** í fyrstu útgáfu prófsins. Laugin hafði McCaffrey bæði hæstan á VBD OG bráðastan, svo röðunin var **aðgerðalaus** — fullyrðing sem þarf tvær raðir í ósamlyndi til að bregðast er veikari en hún lítur út fyrir (CLAUDE.md 5b). Ný laug er byggð svo þær SÉU ósammála: djúpt fyrir aftan WR-inn (bráðanauðsyn ~10), hengiflug fyrir aftan RB-inn (~30), og topp-tveir á VBD eru samt þeir tveir. Þá **fellur** hún |
| spjöldin snúið við í viðmótinu einu (rökfræðin óhreyfð) | `draft-live.mjs` kafli 20 fellur: fyrsta spjaldið er Taylor en taflan segir McCaffrey |

**Verðir:** `advice.mjs` kafli 15 (hreina rökfræðin: tveir þegar tveir eru til,
bilið, lifun beggja, þriðji aðeins í sömu stöðu, einn þegar aðeins einn er yfir
línunni, `avail: 0` hvergi) og `draft-live.mjs` kafli 20 (**lesið af skjánum** í
lifandi drafti: tvö spjöld, „take"/„or", bilið í VBD, lifunartala fyrir báða, og
fyrsta spjaldið er sami maður sem rökstuðnings-taflan setur fyrst).

### 6b-5. „CONNECT THE LEAGUE THIS DRAFT BELONGS TO" — RÁÐ SEM ER ÓGERANLEGT (20.8.2026)

Notandinn tengdi 10-liða **mock** og las þetta, á meðan draftið var í beinni og
pollunin gekk:

    Disconnected — draft has 10 teams, league has 12 — connect the league
    this draft belongs to
    Every VBD number on this board is computed for your league, not for this
    draft — the replacement receiver moves WR29 -> WR42...
    snake draft · 10 teams · 15 rounds · status drafting · 3 picks made · live

**Báðir hlutar voru ósannir um það ástand:**

1. **Mock-draft á enga deild.** Sleeper skilar honum án `league_id` — það er
   ástæðan fyrir því að `connect` flytur engar reglur inn. Boðin báðu hann því um
   að gera **það sem ekki er hægt**.
2. **„Disconnected" um draft sem svaraði 1,5 sek áður** og bar „3 picks made ·
   live" tveimur línum neðar.

**Tveimur ástandum var steypt saman og þau eru ekki sama málið:**

| ástand | hver er heimildin | ljós |
|---|---|---|
| **engin deild** (mock, `league_id: null`) | **draftið** — það er það eina sem til er | **grænt**, með einni línu um hvaðan hvert svið kemur |
| **önnur deild** (`league_id` sem er ekki sú hlaðna) | deildin sem er hlaðin, og hún er **röng** fyrir þetta draft | **rautt** — þetta er villan sem kostaði sex WR í sjö umferðum |

#### Mælt á lifandi API 20.8.2026 — hvað mock-svar BER

`/v1/draft/1389356308125192192` (deildardraft notandans) ber allt sem þarf, **á
draftinu sjálfu, ekki á deildinni**:

    settings.teams 10 · settings.rounds 15
    settings.slots_qb 1 · slots_rb 2 · slots_wr 2 · slots_te 1 · slots_flex 2
    settings.slots_k 1 · slots_def 1 · slots_bn 5
    metadata.scoring_type "ppr"

Að þessi svið tilheyra draftinu er staðfest úr annarri átt: `create_draft`-mutationin
í GraphQL-API-i Sleeper (`sleeper.com/graphql`, skoðuð með introspection sama dag)
tekur `k_settings`/`v_settings` og `k_metadata`/`v_metadata` með `league_id` sem
**valfrjálsan** lið — mock er sama kallið án deildar.

> **ÞAÐ SEM EKKI VAR MÆLT, OG ÞAÐ SKAL SEGJAST:** lifandi mock-svar (með
> `league_id: null`) fékkst **ekki**. Mock-draft er hvorki í
> `/user/{id}/drafts/nfl/2026` (mælt: 4 draft, öll með deild) né í neinum
> opinberum lobby-endapunkti, og GraphQL-leiðirnar (`user_drafts_by_league_mock`,
> `create_draft`) skila **`unauthorized`** án tókens. Þess vegna er kóðinn
> skrifaður svo að **hvert svið er tekið aðeins ef það er þarna** og fellur
> annars í deildina — og `from` segir hvort. Ef mock skilar engum `slots_*`
> hegðar appið sér rétt og **segir** að sætin komi úr deildinni.

#### Fjórar tölur sem hann sá, allar úr sömu rót

`boardShape` (`sleeper-league.js`) er nú **ein** hrein uppspretta fyrir bæði
tölurnar og ljósið, og `buildRows` í `App.jsx` fær hana — það var forsendan:

| einkenni | var | er |
|---|---|---|
| „Disconnected" á lifandi mock-i | rautt ljós, ógeranlegt ráð | **grænt**, „mock draft with no league — 10 teams, 15 rounds and ppr from this draft; starting slots from the league you have loaded" |
| VBD reiknað fyrir 12-liða deild í 10-liða mock-i | WR-þrepið WR29 -> **WR42**, +26,9 stig á hvern WR | þrepin **úr draftinu** |
| „You have **2** picks left" þar sem hann átti **3** | `picksLeft = league.rounds - roster` (14 í stað 15) | úr draftinu — og K/DST-viðvörunin kviknar ekki umferð of snemma |
| „Slot 12 does not exist in a 10-team league" í 12-liða mock-i | fals-jákvætt á **réttu** sæti | sætið er borið við **draftið**, og orðið er „draft" |

**MÖRKIN SJÁLF Á `mustFillUrgent` (`picksLeft <= needed + 1`, og að kassinn kalli
enn í síðustu umferð þegar `picksLeft` er 0) VORU EKKI HREYFÐ** og það er ásett:
að þagga K/DST-viðvörunina í síðustu umferð — þeirri einu umferð sem hún er til
fyrir — væri verri skekkja en skrýtin setning. Það sem var lagað er **heimildin**,
ekki mörkin.

#### Það sem VAR EKKI gert

- **`metadata.scoring_type` yfirskrifar aldrei `scoring_settings` deildarinnar.**
  Í deildardrafti er `rec`-talan sjálf nákvæm og merkingin getur rekið frá henni
  (`leagueFromSleeper` varar þegar við því). Aðeins mock — sem hefur ekkert annað
  — les merkinguna.
- **Aðrir flipar halda DEILDINNI.** Mock má ekki endurskilgreina deildina sem
  notandinn spilar í; borðið fær sínar eigin raðir og ekkert annað.
- **Kassinn „Every VBD number on this board is computed for your league" var
  fjarlægður**, ekki mildaður: hann var orðinn **ósannur** í nákvæmlega því
  tilfelli sem hann var skrifaður fyrir. Tveir textar um sama hlut reka í sundur;
  ein lína, við ljósið.

**Verðir:** `sleeper-league.mjs` kafli 10 (hrein vörpunin, öll svið, báðar
áttir), `draft-live.mjs` 16 (mock -> grænt, engin ógeranleg boð), 16b
(deildardraft -> grænt **án línu**), **16c** (draft annarrar deildar -> rautt),
**16d** (`picksLeft` úr draftinu), `sleeper.mjs` 2bb3/2bb4, og `wiring.mjs`
kafli 4 — `boardShape` má ekki verða hreint fall sem enginn kallar, og útkoman
verður að fara **bæði** í `buildRows` og niður í borðið.

**Fjórar stökkbreytingar felldar:** `rounds` tekið úr deildinni aftur -> 16d
fellur með **„0 picks left"** í stað 3 (nákvæmlega off-by-one villan hans) ·
mock steypt saman við „önnur deild" -> **10** fullyrðingar falla og línan verður
„belongs to another Sleeper league (**null**)" · „önnur deild" teiknuð græn ->
16c fellur á þremur · `teams` úr deildinni -> þrjár í `sleeper-league.mjs` og
þrjár í `sleeper.mjs`.

### 6b-4. SÆTIÐ ERFÐIST — OG APPIÐ SÝNDI HÓP ANNARS MANNS (20.8.2026)

Alvarlegasta villan sem fannst þessa viku. Notandinn tengdi nýtt mock —
**KanelGifler, sæti 7** — og „My team" bar: *Jayden Daniels, Jonathan Taylor,
Etienne, Kenneth Walker, RJ Harvey, Jadarian Price, Jeremiyah Love, Metcalf,
Pittman, Waddle, Wan'Dale Robinson, Hunter Henry, Kincaid, Jason Myers,
Detroit Lions.* Það er **hópur liðs 5, upp á mann** — því í **fyrra** mock-inu
var hann sæti 5.

**Rótin er ein lína** í `connect` (`DraftBoard.jsx`):

    slot: slot != null ? slot : sync.slot        // <- erfði sætið

Rökin voru „hann situr venjulega í sama sæti í næsta mock-i". Þau eru röng:
**sætið er eiginleiki DRAFTSINS, ekki stilling á deildinni.** `sync` er vistað
á deildinni (`entries[].sync`), svo nýtt mock í sömu deild erfði það — sama ætt
og `boardScope`-villan (`taken`/`myPicks` voru lyklað á deild, ekki draft).
Sætið var einfaldlega **ekki flutt með** þegar hin tvö voru.

**FJÓRAR VILLUSKÝRSLUR, EIN RÓT.** Þrjár aðrar sem hann meldaði sama dag voru
þessi villa í dulargervi — og hver þeirra hefði kallað á „lagfæringu" á kóða
sem var réttur:

| einkenni | hvað var í raun að gerast |
|---|---|
| „**10 WR í röð**" | `recommend` fékk hóp sætis 5 — **sex RB**, þunnt í WR. Rétt svar um RANGAN hóp. `urgencyDrivesOrder: false` var aldrei spurt |
| „**still need K and DST**" í 14. umferð | lið 5 tók K í 14.6 og DEF í 15.5, svo hópurinn sem var lesinn hafði **raunverulega** hvorugt nánast allt draftið |
| „**ráðlagði AÐRA vörn**" í 14.4 | sama: lið 5 átti enga vörn þá. `DEF`/`DST`-stafsetningin var **mæld og hún er ekki villan** — `players.json` ber `DST` í öllum 32 liðum, `startersFromRoster` varpar `DEF -> DST`, og `recommend` með `pos: "DST"` í hópnum skilar **engri** DST-þörf (mælt beint á fallinu) |

**Sætið 5 var í alla staði trúverðugt.** Það er gilt sæti í 10-liða drafti, svo
`slotOk` kviknaði ekki og „Slot N does not exist" birtist aldrei. **Það sem var
rangt voru NÖFNIN** — og það var það sem hann sá.

**Leyst:** sæti erfist aldrei milli drafta. Verður það ekki leyst úr draftinu
sjálfu (`draft_order[user_id]`, svo `slot_to_roster_id` -> `rosters[].owner_id`)
er það **`null` og appið SPYR**. Tómur hópur með spurningu er óþægilegur en hann
**lýgur ekki**, meðan erft sæti gerir hverja tölu ranga og sýnir hóp annars
manns undir heitinu „My team". **Sama draft er undantekningin** (eftir F5 er
reiturinn forfylltur og einn smellur tengir aftur): þá er vistaða sætið hans
eigið og að henda því gerði innsláttarvillu óviðgerðanlega.

**Tvennt í viðmótinu fylgdi með, því mock ber engan notendalista:**
liðsspjöld deildarinnar eru **ekki** sýnd í mock-i (þau eru úr annarri deild —
„You are Sofahetjur, slot 5" í mock-i þar sem Sofahetjur er ekki með, og 12
spjöld í 10-liða mock-i), svo tölu-reiturinn kemur í staðinn; og **setningin um
sætið er nú sýnd líka þegar engin spjöld eru**. Hún var skilyrt á spjöldunum,
svo mock — tilfellið þar sem rangt sæti kostar mest — var **eina tilfellið án
hennar**. Tölu-spjöld 1..N úr draftinu voru prófuð og **tekin út**: önnur leið
að sama svari er nákvæmlega það sem „eitt reit, einn hnappur" hreinsaði út.

**Vörður: `draft-live.mjs` kafli 18**, og hann fullyrðir um **innihald hópsins,
ekki um töluna** — talan var trúverðug, nöfnin voru það ekki. Þrjú þrep í röð
(CLAUDE.md 5b: neikvæð fullyrðing verður að nefna streng sem var sannanlega
þarna): sæti 5 í drafti A -> nöfn sætis 5 **eru** í hópnum · nýtt draft B með
óleysanlegt sæti -> hópurinn **tómur** og nöfn sætis 5 hvergi · sætið sett -> nöfn
sætis 7 koma inn. Þriðja þrepið er nauðsynlegt, annars væri kaflinn uppfyllanlegur
með sæti sem er **aldrei** leyst (sama regla og 16b).

**Stökkbreyting (erfða sætið sett aftur inn):** fjórar fullyrðingar falla og
**tveir leikmenn liðs 5 birtast í „My team"** — nákvæmlega það sem hann sá.

### 6b-3. SEX WR Í SJÖ UMFERÐUM — RÖÐIN VAR EKKI BILUÐ, HÚN VAR SVAR VIÐ ANNARRI DEILD (17.8.2026)

Notandinn draftaði raunverulegt mock á Sleeper — **10 lið, sæti 5** — og fylgdi
ráðgjöfinni í hverju vali. Eftir sjö umferðir:

    1.5 Puka Nacua WR · 2.6 Amon-Ra St. Brown WR · 3.5 Brock Bowers TE
    4.6 Rashee Rice WR · 5.5 DeVonta Smith WR · 6.6 Mike Evans WR
    7.5 Parker Washington WR

**Fyrsta tilgátan var röng og hún var trúverðug.** Hún var að stöðuþörf hefði
verið mæld og hafnað (`urgencyDrivesOrder: false`) og að borðið skilaði því WR
eftir WR í fullu PPR. Notandinn hafnaði líka forsendunni sem lá undir: *„það eru
flex stöður í sumum deildum, svo það má alveg taka 4xWR"* — og hann hefur rétt
fyrir sér. Með 2 FLEX er WR1/WR2/WR3/WR4 fullkomlega lögleg uppstilling og sex WR
í sjö umferðum er **hvorki ólöglegt né endilega slæmt**. `maxPos`-þak eða
„jafnaðu stöðurnar"-regla hefði bannað löglega byggingu, og var **ekki** sett inn.

**Rétta spurningin var því: hvers vegna slær sjötti WR besta RB á VBD?** Og
svarið var ekki í röðuninni:

> **BORÐIÐ VAR AÐ REIKNA FYRIR 12-LIÐA DEILD MEÐAN DRAFTIÐ VAR 10 LIÐA.**

Mock-draft ber **enga `league_id`**, svo `connect` flytur engar reglur inn —
aðeins völin og sætið. Deildin í appinu stóð því á 12-liða sniði meðan völin komu
úr 10-liða mock-i. Vörnin var til: kassinn *„This draft is not the shape of the
league the board is using — 10 teams in the draft against 12 in this league"*
stóð **á skjánum allan tímann**. Notandinn sá hana ekki, því hún var málsgrein í
vegg af málsgreinum — og hún **nefndi ranga afleiðingu**.

#### Mælt á hans eigin gögnum, sama laug, sama dag

| staða | þrep 10-liða (hans) | þrep 12-liða (sjálfgefið) | lyfting á VBD |
|---|---|---|---|
| QB | QB10 | QB12 | +3,6 |
| RB | RB27 | RB28 | +1,0 |
| TE | TE14 | TE14 | **0,0** |
| WR | **WR29** | **WR42** | **+26,9** |

**Það er ekki jöfn lyfting heldur skekkja með formerki.** WR er dýpsta staðan,
svo þrepið færist **þrettán sæti** meðan RB færist eitt og TE ekkert. VBD
sendingamóttakara tvöfaldast nærri: Rashee Rice **29,6 → 58,5** · DeVonta Smith
**29,5 → 58,4** · Mike Evans **22,5 → 51,4** · Parker Washington **12,7 → 41,6**.

Og útkoman var mæld alla leið — hermt draft frá sæti 5, sjö umferðir, mótherjar
eftir ADP:

| lögun borðsins | hópurinn eftir 7 umferðir |
|---|---|
| **rétt 10-liða PPR 2WR/2FLEX** | **RB4 · TE2 · WR1** |
| 12-liða sjálfgefið 3WR/1FLEX | RB1 · TE2 · WR3 · QB1 — og toppur borðsins í umferðum 4–7 er WR-eftir-WR (McConkey/Higgins/Egbuka/McMillan, Evans/Waddle/McLaurin/Washington) |
| 10-liða **3WR/1FLEX** (WR35) | **WR5 · TE2** — næst hans raunverulegu röð |

Með réttri lögun **ræður borðið RB fjórum sinnum** og nefnir Parker Washington
aðeins í sjöundu umferð. **`urgencyDrivesOrder: false` stendur óskert** — röðunin
var aldrei spurð; hún var spurð um aðra deild.

#### Þrjú einkenni, ein rót — og öll þrjú voru sýnileg

| einkenni | orsök |
|---|---|
| „**Pick 151** — take this" í 10×15 drafti sem endar á **150** | Hliðið var til (`totalPicks` í `NextPick`, skrifað 14.8. gegn nákvæmlega þessu) en las **`league.teams * league.rounds`** = 12×15 = **180**. Lagfæringin frá 14.8. var ekki röng — hún spurði ranga heimild |
| „only 0% likely to last your next **13** picks" | `nextOwnPick(..., league.teams)` gaf 12-liða vörpun á 10-liða draft. Hver lifunartala var úr annarri deild |
| **sex WR** | varamanns-þrepin, taflan hér að ofan |

**Reglan sem gildir — og hún var ÞEGAR skráð í `sleeper-league.js` um `rounds`:
DRAFTIÐ ER HEIMILDIN UM DRAFTIÐ.** Þar var henni beitt á innflutninginn; á borðið
var henni ekki beitt. `snakeTeams`/`rounds`/`totalPicks` í `DraftBoard` eru nú
lesin úr `/draft/{id}` (`settings.teams`/`settings.rounds`) þegar draft er tengt,
með deildina sem varaleið — það er rétt, því án tengingar er deildin eina
heimildin sem til er.

**VBD kemur ÁFRAM ÚR DEILDINNI og það er ásetningur.** Þetta eru reglur
notandans og appið yfirskrifar þær ekki þegjandi (sama ákvörðun og stóð þar áður:
hann gæti verið að æfa sig í mock-i af annarri stærð viljandi). Það sem breyttist
er **þögnin**: mismunurinn er nú **staða á tengingunni**, ekki málsgrein í miðjum
texta.

#### Stöðuljósið — þrjár stöður urðu TVÆR, og vörnin var LEYST, ekki slökkt

**17.8.2026** var ljósið gert þriggja stöðu þótt beiðnin væri tveggja
(*„status ljos sem er rautt eda graent eftir thvi hvort tenging tokst"*), með
þeim rökum að tveggja stöðu ljós hefði verið **grænt allan þann mock-draft** —
tengingin heppnaðist; það var lögunin sem var röng.

**19.8.2026 bað hann um það sama í þriðja sinn** og þá var röksemdin skoðuð
aftur. Hún var rétt um afleiðinguna og **röng um forsenduna**: hún gerði ráð
fyrir að „tengt" þýði *„kallið gekk"*. Það er ekki það sem notandi spyr um.
Hann spyr hvort **tölurnar á skjánum eigi við draftið sem hann er í** — og séu
þær reiknaðar fyrir aðra deild er svarið nei.

| ljós | merking |
|---|---|
| **grænt** „Connected" | Sleeper svaraði um ÞETTA draft, **og** lögunin er sú sem borðið reiknar |
| **rautt** „Disconnected" | allt annað: engin tenging, kallið brast, **eða lögunin stemmir ekki** |

Lögunar-tilfellið fær **eina línu** við ljósið (*„draft has 10 teams, league has
14 — connect the league this draft belongs to"*) og eina línu um kostnaðinn
(VBD-röðin, `WR29 -> WR42`). Málsgreinin sem stóð þar áður var ~460 stafir; hún
er nú ~200, og **kafli 16 mælir þá tölu** — viðvörun í vegg af texta er einmitt
villan sem kostaði hann mock-draftið.

Liturinn er **ekki eina merkið**: orðin standa við hann (`Connected` /
`Disconnected`) og `data-conn`-sviðið er í DOM-inum, svo hann les eins fyrir þann
sem greinir ekki grænt frá rauðu og fyrir próf.

**Vörður: `draft-live.mjs` kaflar 16 og 16b + `sleeper.mjs` 2bb4.** Kafli 16
lætur lögunina **reka í sundur** (deild 14 lið, draft 10) og krefst þriggja
hluta: snakk-tölurnar komi úr draftinu (næsta val 14, ekki 22), þakið komi úr
draftinu (*„All 150 picks are in"*, hvergi „Pick 151"), og að **röng lögun geti
ALDREI teiknast græn**. Kafli 16b er andstæðan og hann er nauðsynlegur: án hans
væri kafli 16 uppfyllanlegur með ljósi sem er **aldrei** grænt (sama regla og 5b).

> **STÖKKBREYTINGAR-MÆLING 19.8.2026 — og hún fann veika fullyrðingu.**
> `dTeams !== lTeams` var tekið úr sambandi. `draft-live.mjs` kafli 16 **hélt
> áfram að segja rautt**, því þar skeika BÆÐI liðafjöldi og umferðir, svo
> ljós-fullyrðingin var uppfyllt af hinum liðnum og aðeins textinn féll.
> `sleeper.mjs` 2bb4 bar sama galla (mock 15 umferðir á móti 16). Umferðirnar í
> mock-inu voru því **stilltar á 16, eins og deildin**, svo ljósið er rautt af
> NÁKVÆMLEGA einni ástæðu — þeirri sem kostaði hann draftið: 12 lið á móti 10.
> Sama ætt og *„fullyrðing sem þarf tvennt til að bregðast er veikari en hún
> lítur út fyrir að vera"*. Eftir stillinguna fellur ljósið sjálft.

> **HVERS VEGNA ENGIN AF 24 SÖFNUNUM GAT FELLT ÞETTA:** hvert einasta próf gaf
> **sömu lögun á bæði deild og draft**. Fullyrðingin „valnúmerið er rétt" gat því
> ekki brugðist — báðar heimildirnar sögðu 10 lið, svo það var sama hvor var
> spurð. Sama ætt og `maxPos`-villan sem `build.js` skjalar (*„það sem var mælt
> var ekki það sem fór í loftið"*) og `react-warnings.mjs` í FPL-verkefninu, sem
> heimsótti 0 af 22 viðmótum og var grænt. **Próf sem getur ekki greint tvær
> heimildir í sundur prófar hvoruga.**

### 6b-1b. EITT REIT, EINN HNAPPUR, TVÖ LJÓS (19.8.2026)

Beiðni notandans, **þrisvar**, tveimur dögum fyrir draftið:

> *„eg vill bara hafa eitt plass til ad paista (ma gera league id eda allt url),
> og svo connect button sem tengir allt og status ljos sem segir connected eda
> disconnected med graenu og raudu"*

Spjaldið bar **sex stýringar og málsgrein af texta**: deildarslóð + Connect,
„or", notandanafn + Find leagues, Draft ID, Your slot, Start live sync. Hver
þeirra var svar við raunverulegu tilfelli — og samanlagt var **tengingin sjálf
orðin verkefni á draftkvöldi**.

| áður | nú |
|---|---|
| „League or draft URL" + **Connect** | **eitt** reit: deildarslóð · draft-slóð · bert deildar-id · bert draft-id · **eða notandanafn** |
| „or" + „Sleeper username" + **Find leagues** | sama reit (notandanafn er **varaleið**, sjá neðar) |
| **Draft ID** (textareit) | forfyllt í sama reitnum — endurtenging eftir F5 er einn smellur |
| **Your slot** (tölureit) | **leitt út**; birtist aðeins þegar leiðslan brestur |
| **Start live sync** | Connect kveikir á henni sjálfur |
| málsgrein (4 línur) um hvað Connect gerir | farin |

#### Tvennt var leitt út í stað þess að spyrja

**Sætið.** `resolveSlot` bar ÞEGAR þrjár leiðir (`draft_order[user_id]` ·
`slot_to_roster_id` -> `rosters[].owner_id` · smellur á liðið); reiturinn var
**fjórða leiðin að sama svari**. Það sem er leitt út er nú **sýnt með nafni** —
*„You are mattitim, slot 7 · read from Sleeper"* — því rangt sæti gerir hverja
tölu ranga (borðið litar engan, hópurinn fyllist aldrei, ráðgjafarkassinn giskar
að valið á klukkunni sé mitt, sem er rangt í 9 völum af 10 í 10-liða deild). Þögul
ágiskun er versta útkoman; **nafnið gerir vonda ágiskun sýnilega.**
**Engin sjálfgefin 1:** `resolveSlot` skilar `null`.

Reiturinn er **skilyrtur, ekki fjarlægður**: draft sem ber hvorki `draft_order`,
`slot_to_roster_id` né notendalista gefur engin sætaspjöld, og þá er ekkert eftir
að smella á. Skilyrðið er `teams.length === 0` — **sama skilyrði og gerir
spjöldin engin**, svo þau tvö geta ekki bæði horfið.

> Fyrsta útgáfa skilyrðisins var `sync.slot == null` og hún var röng í báðar
> áttir: reiturinn hvarf um leið og sæti var slegið inn, svo **innsláttarvilla
> varð óviðgerðanleg**, og sæti úr eldra vistuðu ástandi (`nfl_sync`, kafli 2h)
> var hvergi sýnilegt. **Stýring sem hverfur þegar hún hefur verið notuð er verri
> en engin.**

**Samstillingin.** „Start live sync" var sér hnappur af **byggingarlegri** ástæðu,
ekki af smekk: `live` var `useState` inni í `SleeperSync`, og innflutningur á
deild breytir `activeId`, sem endurræsir `DraftBoard` (`key={activeId}`) — svo
samstilling sem var kveikt í SÖMU aðgerð og innflutningurinn **var slökkt áður en
hún byrjaði**. Ástandið er nú **skorða** ofar (`liveScope`, sjá 6b-3 hér að ofan).

#### Notandanafn er VARALEIÐ, ekki fyrsta gisk — og það er mælt

Reglan sem virkar á Sleeper (*„auðkenni eru 18–19 stafa snjókorn, notandanafn er
það ekki"*) er **rétt um Sleeper og röng sem regla**: `d2`, `m12`, `L1` — auðkenni
sem prófin og eldri gögn bera — eru hvorugt, svo formið getur ekki skorið úr.
Reglan er því **ORÐIN**: reyndu auðkennið, og **aðeins** ef Sleeper segir að
hvorki deild né draft sé til með því er notandanafn reynt. Kostnaðurinn er tvö 404
fyrir þann sem límir inn nafn, einu sinni per smell.

> **ÞETTA AFHJÚPAÐI TVÆR LYGAR Í HERMUNUM og báðar var nauðsynlegt að leiðrétta.**
> `byDraft(id) || scenario` (`sleeper.mjs`) og `live.strictIds && !knownDraftId(id)`
> (`draft-live.mjs`) létu **hvaða streng sem var** svara sem gilt draft. Það var
> þægilegt — og það varð **bindandi** um leið og reiturinn tók við notandanafni:
> `/draft/adi` svaraði með drafti, svo nafna-varaleiðin var **aldrei reynd** og
> kaflarnir 6/6b/16 tengdu allt annað draft en þeir ætla. Raunverulegur Sleeper
> skilar 404. Og `sleeperLeagues` skilaði `league_id: "L1"` sem svaraði engu —
> **deildarlisti með auðkenni sem svarar engu er sama lygin í annarri mynd.**

#### Tvær „stöður" sem deildu reit og átu hvor aðra

`status` var bæði útkoma **aðgerðar** og útkoma **pollunar**. `connect` skrifaði
villuna og næsta pollun skrifaði `setStatus(null)` af því að **hún** gekk — svo
notandi sem ýtti á Connect á röngu auðkenni fékk **enga svörun** (6 ms í prófi,
1,5 s í beinni). Nú `status` (aðgerð) og `pollErr` (pollun) hvor í sínum reit, og
bæði eru birt í ljósinu. Vörður: `draft-live.mjs` kafli 15c — **mistekin tenging
verður að segjast MEÐAN borðið sem er í gangi helst óskert** (ljósið er þá grænt,
og það er rétt: tengingin slitnaði ekki, það var tilraunin sem brást).

**Villuboðin urðu ensk** (`data.js`, 10 strengir). Þau voru íslensk í skjóli þess
að þau sáust sjaldan í lítilli nótu neðst; ljósið ber þau nú við hliðina á
„Disconnected", svo þau eru það fyrsta sem hann les.

#### Vörður á loforðinu sjálfu: `draft-live.mjs` kafli 17

Þrír hlutar sem hver getur brugðist einn:

1. **Öll fjögur formin** fara gegnum sama reitinn — fjórar keyrslur, ekki ein,
   því `parseSleeperInput` ber sitthvert mynstur og bert auðkenni er **tvírætt**
   (deildar- og draft-id eru bæði 19 stafa snjókorn, svo `sleeperResolve` reynir
   báðar leiðir). Þrjú af fjórum væri „nánast rétt" og hann myndi líma inn það
   fjórða.
2. **Einn smellur tengir OG samstillir** — völin koma á borðið án þess að neitt
   annað sé ýtt, og fullyrðingin er í **báðar áttir**: enginn annar hnappur má
   vera til sem hana gæti uppfyllt (`!btn(/live sync/)`).
3. **Spjaldið ber EITT textareit og TVO hnappa** — talið, ekki skoðað (þekja er
   fullyrðing). Væri „Draft ID" settur inn aftur sem *þægindi* fellur þetta.

#### Smellur á þitt lið KENNIR appinu hver þú ert

Það sem gerir „eitt reit" einfalt í **annað** sinn. Sætið krefst **identitets**
(`resolveSlot` les `draft_order[user_id]`), svo sá sem límir inn deildarslóð í
ferskum vafra og hefur aldrei slegið inn notandanafn fær rétt á sig
spurninguna *„hvaða lið er þitt?"*. **En svarið við henni ER identitetið**:
`t.userId` kemur úr `rosters[].owner_id`, sem er sama snjókornið og
`/user/{nafn}` skilar. Að henda því og spyrja aftur í næsta mock væri að gleyma
því sem notandinn var búinn að segja.

Eftir einn smell á sitt lið er **hver mock á draftkvöldi með sætið sjálfkrafa**.
Varfærnin er í einu skilyrði: **auðkenni sem er ÞEGAR til er ekki yfirskrifað** —
það kom frá notandanum sjálfum, og smellur á lið í EINNI deild má ekki
endurskilgreina hver hann er í öllum hinum.

Vörður: `sleeper.mjs` kafli 2e2, **tvískiptur af nauðsyn** (sama lexía og 2bb2):
án endurhleðslu í millitíðinni gæti fullyrðingin verið uppfyllt af
`userId`-ástandinu í hlutnum sjálfum, sem lifir hvorki F5 né svissun. Lota 2
hleður upp á nýtt og tengir **mock sem appið hefur aldrei séð**, án þess að
neitt sé slegið inn — og mock-ið er viljandi í **sömu lögun** sem deildin, svo
kaflinn mæli sætið og ekki lögunar-hliðið líka.

#### Átta stökkbreytingar felldar 19.8.2026

| stökkbreyting | felldi |
|---|---|
| lögunar-hliðið tekið úr sambandi (`connected = !!info`) | 5 fullyrðingar |
| liðafjölda-liðurinn einn (`dTeams !== lTeams`) | 1 → **5** eftir að mock-umferðirnar voru stilltar (sjá 6b-3) |
| `resolveSlot` skilar `1` í stað `null` | 9 + 1 |
| sætis-reiturinn fjarlægður alveg | 4 + 7 |
| annað textareit sett inn („Draft ID" aftur) | 4 |
| `onLive` tekið út svo Connect samstillir ekki | **92** |
| smellur á lið kennir ekkert | 5 |
| smellur á lið yfirskrifar þekkt auðkenni | 1 |

#### Þrennt sem var EKKI einfaldað, og hvers vegna

| ekki gert | ástæða |
|---|---|
| **Sætaspjöldin** felld saman í eina fellilista | Þau eru **ekki prósa** heldur valmynd með nöfnum, og þau eru **eina** leiðin að sætinu í ferskum vafra. Fellilisti myndi fela nöfnin sem gera vonda ágiskun sýnilega |
| Sér **„Disconnect"**-hnappur | „Reset & disconnect" gerir það þegar, og hann var **beinlínis settur þar** 16.8. að beiðni notandans. Þriðji hnappur til að slökkva á því sem Connect kveikti á væri sú flækja sem er verið að fjarlægja |
| **Deildir sem flipar** beint úr notandanafni | `LeagueSwitcher` gerir þetta þegar — deild sem er tengd **verður** flipi. Það sem vantar er að tengja allar tíu í einni aðgerð, og það er **tíu Sleeper-köll** á draftkvöldi fyrir níu deildir sem hann er ekki að drafta í. Chip-röðin er einn smellur per deild og hún kostar ekkert fyrirfram |

### 6b-2. EN EITT AUGNABLIK ER EKKI DRAFT — 150 VÖL, EITT Í EINU (14.8.2026)

`sleeper.mjs` frystir hermt svar, tengist og fullyrðir um það sem sést. Það er
gagnlegt og það er **ekki það sem gerist 21. ágúst**: þar tínast 150 völ inn í
90 mínútur, og villurnar sem kosta draftið eru þær sem **byggjast upp** — tala
sem skeikar um eitt og skeikar síðan áfram, mengi sem gleymir aldrei, fingrafar
sem sest ekki upp á nýtt. Ekkert þeirra er sýnilegt á einni mynd.

`draft-live.mjs` keyrir því draftið: 10 lið, 15 umferðir, snákur, gegnum
raunverulega `DraftBoard` með Sleeper-endapunkti sem færist fram val fyrir val.
Við **hvert einasta val** er borið saman valnúmerið á skjánum, sætis- og
umferða-vörpunin (sjálfstæð útfærsla, ekki innflutt úr `advice.js` — annars bæri
prófið fallið við sjálft sig), að borðið og ráðgjafarkassinn segi **sömu tölu**,
að þeir sem eru farnir hverfi og komi aldrei aftur, að mín völ lendi í mínum hóp,
og að hvergi sé `NaN`/`undefined`/`[object Object]` (með `\b`, sjá 5b).

> **HRAÐINN ER SKALAÐUR, EKKI ÞEKJAN.** `pollDelay` skilar 1500/5000 ms, svo 150
> völ væru >4 mínútur af hreinni bið. Prófið skiptir út `setTimeout` fyrir
> umbúðir sem stytta **nákvæmlega þessar tvær tölur** (lesnar úr `POLL`) og láta
> allar aðrar bíðir óhaggaðar — almenn skölun („allt yfir 1000 ms verður 10")
> gæti flýtt React-tímaseljara og falið raunverulega bið. **Engu vali er sleppt.**
> Dýra fullyrðingin (litur borinn við prósentuna í hverri röð) er keyrð á 10.
> hverju vali og **það er sagt** fremur en falið. Heildartími: ~20 sekúndur.

**Sjö villur, allar ósýnilegar á einni mynd.** Hver ein var stökkbreytt til baka
og prófið féll (níu stökkbreytingar alls):

| # | villa | hvað hún kostar á draftkvöldi |
|---|---|---|
| 1 | **`onPicks` var SAMMENGI og gat ekki minnkað** | Sleeper-listinn styttist í raun: umsjónarmaður eyðir vali, sætið er leiðrétt, eða þú tengist öðru mock-i. Borðið hélt manninum, og `pickNo = taken.size + offBoard + 1` skekktist því **allt sem eftir var af draftinu**. Mælt: val dregið til baka við val 20 skildi borðið eftir á 21 að eilífu. Leyst með **mismun** (það sem var í síðasta svari en er ekki í þessu er fjarlægt) — handvirk völ voru aldrei í svarinu og lifa því af |
| 2 | **Rangt sæti valið og leiðrétt skildi hóp hins mannsins eftir** | Sama orsök: `myPicks` var sammengi. Smellur á rangt lið og leiðrétting gaf **fjögur** eigin völ þar sem tvö voru rétt — og ráðgjöfin taldi hóp sem þú átt ekki |
| 3 | **Óporuð völ komust aldrei í valnúmerið** | `offBoard` berst foreldrinu aðeins gegnum `onPicks`, og `onPicks` er aðeins kallað þegar **fingrafarið** breytist. Val á manni utan `players.json` bætir engu í `ids` né `mine`, svo fingrafarið stóð kyrrt. Mælt: átta þekkt + fimm óporuð gáfu valnúmer **9 í stað 14**. Hliðið sem átti að spara endurteikningu var líka hlið á upplýsingunni |
| 4 | **„Reset & disconnect" og tengja aftur skildi borðið TÓMT** | `lastSig` lifði reset-ið, svo óbreytt svar frá sama drafti las eins og „ekkert hefur gerst" og `onPicks` var **aldrei** kallað. Tengingin sagðist lifandi, `info` taldi „24 picks made", borðið stóð á valnúmeri 1. Mælt: **0 af 24 völum** komu til baka. Þetta var breytt 12.8. og hafði aldrei keyrt í beinni |
| 5 | **Síðasta umferðin lofaði vali sem er ekki til** | `nextOwnPick(..., (rounds \|\| 15) + 2)` — tveir aukaumferðir sem voru **slaki án heimildar**. Í 150 vala drafti sagði kassinn „Your next pick is **154**" og borðið litaði hvern mann „óbíðu". Notandi sem treystir því sleppir manni í **síðasta vali sínu**. `null` er rétt svar og er nú borið alla leið: `lastPick` í `advice.js` er **annað** en `nextPick: null`, sem þýðir áfram „ég veit ekki sætið, giskaðu" og er rétt í handvirku drafti |
| 6 | **Kassinn hélt áfram að ráðleggja eftir að draftinu lauk** | „Pick 151 — take this" með lifunartölum að vali sem er ekki til. Ekkert hrundi, og það er einmitt vandinn. Nú: **Draft complete** |
| 8 | **Annað mock í sömu deild erfði það fyrra** (16.8.2026, kafli 15) | Borðið var lyklað á **deild**, ekki draft, og `lastSync` byrjar tóm við hverja hleðslu — svo fyrsta pollun eftir F5 gat **ekkert annað en bætt við**. Mælt: mock A með 59 völum, F5, nýtt mock með þremur → **62 og „Pick 63"**. Það sem notandinn sá var sama villa með tómu mock-i: **„Pick 60 — take this"** á drafti sem var rétt að byrja. Í samfelldri lotu virkar borðið rétt, svo próf án F5 hefði verið grænt. Sjá kaflann um `boardScope` ofar |
| 7 | **Liturinn og talan sögðu ekki það sama** | `title` skrifaði `Math.round(p * 100)` en þrepið las hrátt `p`, svo röð með **„80% likely to last"** var ólituð (0,7951 < 0,80). Þrjár raðir í einu drafti. Rúnnun á að gerast einu sinni |

Tvær smærri lagfæringar fylgdu, báðar stökkbreyttar: **tvítekin óporuð röð**
taldist tvisvar í `offBoard` (umsjónarmaður sem lagfærir val skilur eftir tvær
raðir), og **`userId` vantaði í deps pollunarinnar** — notandi sem tengist
FYRST og slær nafnið inn Á EFTIR (nákvæmlega röðin sem viðmótið býður) fékk
aldrei sætið sitt lesið, því lykkjan lifði í lokun með `userId = null`. Sama
villu-ætt og felldi `onPicks` upphaflega.

> **TVÆR STÖKKBREYTINGAR SLUPPU Í FYRSTU UMFERÐ og það var prófið sem var veikt,
> ekki lagfæringin.** Tvítekningin var prófuð á leikmanni sem borðið **þekkir** —
> þar bítur hún ekki, því `taken` er mengi. Og `userId`-kaflinn sló nafnið inn Á
> UNDAN, svo lokunin var þá þegar rétt. Báðir kaflar voru endurskornir þangað til
> stökkbreytingin féll. **Stökkbreyting sem sleppur er niðurstaða, ekki óþægindi.**

> **OG PRÓFIÐ FANN VILLU Í ELDRA PRÓFI.** `sleeper.mjs` skilaði `scenario.picks`
> fyrir **hvaða draft sem var spurt um**, svo þegar kafli 2f svissar `scenario`
> yfir í deild B fór draft deildar **A** að svara tómum lista fyrir sitt eigið
> draft. Mock sem lýgur — og hann var ósýnilegur nákvæmlega á meðan `onPicks` gat
> ekki minnkað mengið. Um leið og pollunin fylgir Sleeper niður líka las tómi
> listinn eins og „umsjónarmaður núllstillti draftið", sem er **réttur lestur**.
> Villan var í herminum. Hann er nú lyklaður á draft-auðkenni.

#### Og það sem EKKI tókst að fella — talið upp berum orðum

Skýrsla sem telur aðeins upp fundnar villur segir ekki hvað var reynt, og þá er
ekki hægt að vita hvað er óprófað enn. Þetta stóðst **allt** og var raunverulega
reynt:

| atburðarás | niðurstaða |
|---|---|
| Sleeper svarar **500**, dettur út (`TypeError`), eða skilar **ekki-JSON** í miðju drafti, og batnar | Borðið heldur því sem það hafði (fer **aldrei** í 0), engin `NaN`, engin villuvörn — og nær **öllum** völum sem bárust á meðan þegar sambandið kemur aftur. Fingrafarið hleypir batanum í gegn af því að það breyttist á meðan |
| **Sjálfval springur** — átta völ milli tveggja pollana | Öll átta skila sér, valnúmerið stekkur rétt, og eigið val inni í sprengingunni ratar í hópinn |
| **Þitt eigið val er sjálfvalið** meðan þú horfir á borðið | Ratar í hópinn samstundis. Prófað 15 sinnum í heilu drafti (`myPickMissed === 0`) |
| **Draftið sett í hlé** og haldið áfram | Staðan sést, ekkert breytist á meðan, og pollunin tekur við sér aftur |
| **Völ berast úr röð** | Níu völ skiluð í viðsnúinni röð: öll skila sér, valnúmerið er rétt og mitt val ratar í hópinn. Valnúmerið er **talning**, ekki `max(pick_no)`, og talning er óháð röð |
| **`draft_order` er null og birtist í miðju drafti** | Sætið les sig sjálft og fyrri völ sætisins rata í hópinn eftir á |
| **Síðan endurhlaðin í miðju drafti** | Völ, hópur, valnúmer, næsta eigið val og draft-auðkenni koma öll til baka. Samstillingin er **slökkt** eftir endurhleðslu og það er ásett (ekkert kall án þess að beðið sé um það) — krafan er að hnappurinn segi það, og hann gerir það. Hún nær svo því sem gerðist á meðan |
| **Tengt öðru drafti eftir reset** | Byrjar á sínum eigin völum, ekki gömlu |
| **Tveir flipar á sama drafti** | Hvorugur fellur, báðir teikna, vistaða mengið þurrkast ekki út. Sjá varnaglann að neðan |
| **Svissað um deild í miðju drafti og til baka** | Hvor deild heldur sínum völum, sínum hóp, sínu valnúmeri og sínum reglum. **En samstillingin slokknar** — sjá að neðan |
| **Deildarslóð → reglur → sæti → tengja → ráðleggja**, alla leið | Reglurnar úr Sleeper drífa tölurnar sannanlega: `re-read` sem skiptir deildinni úr PPR í standard **breytir VBD-dálkinum** og byrjunarsætunum. Umferðirnar koma úr **draftinu**, ekki deildinni |
| **Tvítekin röð á leikmanni sem borðið þekkir** | Kostar ekkert — `taken` er mengi |

> **EINN VARNAGLI SEM VAR EKKI LAGAÐUR, OG HANN ER SKRÁÐUR FREMUR EN ÞAGGAÐUR.**
> Tveir flipar sem eru **báðir opnir** deila `localStorage`. Flipi sem er opinn en
> ekki samstilltur ber eldra mengi, og breyti notandinn einhverju í honum skrifar
> hann það yfir. Ég smíðaði lagfæringu (skrifa ekki óbreytt gildi) og **tók hana
> út aftur**: mér tókst ekki að smíða atburðarás þar sem hún skiptir máli — við
> mount les hvor flipi það sem stendur í geymslunni, svo fyrsta skriftin er alltaf
> eins og það sem er þar. **Ómæld lagfæring er nákvæmlega það sem þetta verkefni
> segir vera verstu útkomuna**, svo hún fer ekki inn. Reglan á draftkvöldi er
> einföld: **einn flipi**.

> **OG EIN GILDRA ER FEST SEM HEGÐUN FREMUR EN LAGFÆRÐ.** Svissun um deild í
> miðju drafti **slekkur á samstillingunni** — og eftir 19.8.2026 er ástandið
> **skorða** (`liveScope` í `App.jsx`, `boardScope`-strengur) fremur en boolean
> inni í `SleeperSync`. Það gefur þrjár reglur í einni línu: svissað um deild ->
> önnur skorða -> slokknar · nýtt draft-auðkenni -> slokknar · endurhleðsla ->
> `null`. Að **vista** hana myndi þýða að appið byrjaði að polla af sjálfu sér
> við næstu hleðslu, sem **tveir aðrir verðir banna berum orðum** (`audit.mjs`
> kafli 9, `dashboard.mjs` kafli 1: *„pollun sem enginn kveikti á er bæði óvænt
> og dónaleg við gestgjafann"*), svo hún er **viljandi ekki vistuð**.
>
> Krafan er því að það **sjáist**, og akkerið er nú **ljósið** í stað hnapps:
> `draft-live.mjs` kaflar 8 og 14 krefjast `data-conn="bad"`, orðsins
> „Disconnected" og að hvergi standi „reading picks live". Hnappur getur verið
> til án þess að segja neitt um ástandið; **rautt ljós ER ástandið.** Og
> endurtenging kostar einn smell, því eina reitið er **forfyllt úr
> tengingunni sem er í gildi**. **Á draftkvöldi: ekki svissa.**

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
node scripts/flexsplit-lab.mjs                # -> measure/flexsplit.json (sja 4b-2)
node scripts/vbdbase-lab.mjs --tesweep        # -> measure/tesplit.json (stig, sja 4l)
node scripts/h2h-lab.mjs --tesweep            # -> measure/tesplit_h2h.json (sigrar, 4l)
node scripts/dst-lab.mjs                      # -> measure/dst.json (sja 4k)
node scripts/ecr-timing.mjs [--day=21]        # -> measure/ecr_timing.json (sja kafla 5)
```

`dst-lab.mjs` er **handvirk og á ekki heima í pipeline-inu**: hún sækir sjö
nflverse-tímabil, 18 Sleeper-vikur og 17 deildar-umferðir (~45 köll, allt í
`.cache-nfl/`), og tímabil sem er lokið breytist aldrei. Hún er keyrð þegar
`BASE`-DST-reglurnar, `dstPoints` eða `dstPointsAllowed` breytast — og þá fellur
`tests/dst.mjs` kafli 1 þar til bökuðu tölurnar í `src/scoring.js`
(`DST_ANCHOR`) og `src/weekview.js` (`DST_STREAM_MEASURED`) eru uppfærðar.
**Þá uppfærir maður töfluna, ekki prófið.**

**`--tesweep`-hliðarnar eru handvirkar mælingar og eiga ekki í pipeline-ið.**
Þær skipta AÐEINS út afbrigða-skránni og úttaks-heitinu í tveimur labbum sem eru
þegar til; án flaggsins eru `vbdbase.json` og `h2h.json` **bitaeins óbreytt**.
Þær eru keyrðar þegar `FLEX_SPLIT` er véfengt — og þá **verður** líka að endurgera
það sem er talið upp hér að neðan, því `tests/model.mjs` kafli 9b pinnar töluna.
Sigra-hliðin tekur ~12 mín með `--tepboot=200`.

`flexsplit-lab.mjs` er **ekki í neinu þrepi og á ekki að vera það**: hún ber
sendan kóða við hegðun sem er ekki lengur til (`lib/flexsplit-legacy.mjs`).
Hún er keyrð þegar `FLEX_SPLIT`, `SUPERFLEX_SPLIT` eða úthlutunin sjálf
breytist — og þá **verður** líka að endurgera `shapes_*.json`,
`measure/half.json` og `measure/ecr_duel.json`, því `HALF_LAB` í
`src/rulebasis.js` er borin við diskinn í hverri keyrslu prófanna.

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

## 7b. DAGSETTAR SERÍUR — sex heimildir sem voru í kóðanum og enginn kallaði

Tímabilið byrjar í september og draftið er **21.8.2026**. Sex heimildir voru
þegar skrifaðar, prófaðar að hluta og **kölluð af engum**; fimm þeirra bera
gögn sem **verða ekki til eftir á**. Þetta var tengt 14.8.2026.

> **RÖKIN ERU EIN OG ÞAU ERU ÞAU SÖMU SEM `data/history/` HVÍLIR Á
> (CLAUDE.md kafli 7): dagleg mynd verður ekki búin til eftir á.**
> „Hvað sagði dýptartaflan / fréttin / vikuspáin í viku 5?" er **ósvaranleg**
> spurning eftir að vika 5 er liðin — inntökin eru horfin. Að byrja í dag
> þýðir að mæling er möguleg í október; að byrja í október þýðir mæling á
> næsta tímabili.

| sería | hvað hún svarar | mæld stærð |
|---|---|---|
| `trending/` | waiver-hlaupið (var þegar til) | **6,8 KB/dag** |
| `news/` | „er byrjunarmaðurinn að koma til baka?" | **23,7 KB/dag** |
| `adp-history/` | FFC-ADP í öllum sniðum, half-PPR þar með | **127,3 KB/dag** |
| `depth/` | hver er RB1/RB2 á hverju liði, hvern dag | **121,7 KB/dag** |
| `weekly-ecr/` | vikuleg ECR + start/sit-einkunn | **193,9 KB** per nýtt `scrape_date` |
| `weekly-proj/` | vikuleg Sleeper-spá (580 raðir með spá) | **204 KB/viku**, 18 á tímabili |
| `weekly/{ár}` | **+ snap-hlutföll**, sameinuð inn í raðirnar | engin ný skrá |

**Vöxturinn:** fjórar daglegu seríurnar eru **279,5 KB/dag = 100 MB/ár**, og
vikulegu tvær leggja **~57 KB/dag** við á tímabili (`weekly-ecr` ~194 KB/viku,
`weekly-proj` ~204 KB/viku) — **~336 KB/dag samanlagt á tímabili**. Það er
stærra en `data/history/` í FPL-hlutanum (~80 KB/dag, ~29 MB/ár), sem er þar
skjalað sem „þess virði að fylgjast með". **Lausnin væri grisjun eftir aldri,
ekki eyðing** — sama regla og þar.

### Reglan er strangari en `writeJson` og það er ástæða

`writeJson` **má** skrifa ofan í: `players.json` *er* myndin í dag og gamla
myndin hefur ekkert gildi. `writeOnce` má **aldrei** — röð sem er til er
**saga**, og endurskrifuð saga er retro-fitting. Þrjú hlið, öll nauðsynleg:

| hlið | hegðun | af hverju |
|---|---|---|
| skrá er til | **ónæmandi**, ekkert skráð | dagur sem er þegar vistaður er ekki aðgerð og má ekki fylla `status.json` |
| þunn gögn | ekkert skrifað, **OG það er skráð** | þögn hér væri „vistunin er í lagi" á skjánum meðan dagurinn tapaðist |
| bæði | fyrsta keyrsla dagsins sem fær **nýtileg** gögn vinnur | |

Miðröðin er mæld, ekki tilgáta: **13.8.2026 skilaði ESPN 3 greinum** og
`news.json` var (réttilega) hafnað. Hefði fréttasafnið skrifað þá þunnu mynd
og fryst hana væri dagurinn geymdur **rangur að eilífu**.

### Glugginn á vikulegu spánni — villan sem FPL-hlutinn gerði fyrst

„Aðeins fyrir vikuna" og „aðeins einu sinni" eru **báðar réttar** og gefa
**saman** ranga hegðun: *skrifa við fyrsta tækifæri og frysta*. Í FPL-hlutanum
varð GW1-röðin þannig skrifuð **222 klst fyrir frestinn** með `start_prob` null
hjá 577 af 577 (CLAUDE.md kafli 7).

`PROJ_WINDOW_H = 72`. Þrír þættir eru mældir, ekki valdir:

- **72 klst, ekki 12 eins og í FPL.** Þar er cron á 30 mín (~24 tækifæri);
  hér keyrir `core` **einu sinni á dag**, svo 72 klst gefa **þrjú** tækifæri.
  GitHub þynnir og sleppir cron-keyrslum; ein sleppt keyrsla má ekki kosta vikuna.
- **Akkerið er `date` úr `schedule.json` á miðnætti UTC, ekki raunverulegur
  byrjunartími.** `gametime` í nflverse er **austurstrandartími**, svo fyrsti
  leikur viku 1 2026 er 2026-09-09 20:20 ET = **2026-09-10 00:20 UTC**.
  Miðnætti UTC á leikdegi er ~24 klst **fyrr** en satt er, og **báðir endar eru
  ekki jafn dýrir**: skekkja sem er of sein skrifar spá eftir að leikur er
  byrjaður og það er leki.
- **Vikan er lesin úr leikjaskránni, ekki úr `state.week`.** Í forleik ber
  Sleeper `week: 1, seasonType: "pre"` — það er vika 1 af **forleik** og ekki
  sama tala.

### Þrennt sem mælingin afhjúpaði og var ekki spurt um

**1. `depthCharts()` skilaði 0 röðum og skráði sig sem `ok`.** nflverse
**skipti um snið** milli 2024 og 2025: gamla skráin ber
`season,club_code,week,…,position,depth_position`, nýja ber
`dt,team,player_name,espn_id,gsis_id,…,pos_abb,pos_slot,pos_rank`. Af þeim
dálkum sem lesturinn bað um er **`gsis_id` sá eini** sem er til í nýja sniðinu,
svo `pos` varð `undefined` og sían henti **hverri einustu röð**. Þetta sást
aldrei því fallið var **aldrei kallað** — þögla tóma fullyrðingin úr CLAUDE.md
5b, í pipeline-i í stað prófs. Sniðið er nú **greint af hausnum, ekki af árinu**.

**2. Dýptartaflan er EKKI óendurheimtanleg — og það er skráð sem slíkt.**
`depth_charts_2025.csv` ber **554.215 raðir og 219 einkvæma daga**
(2025-08-03 → 2026-03-14), þar af **151 dag innan tímabilsins**. nflverse
geymir söguna sjálft í nýja sniðinu. Að segja „annars tapast hún" væri **ómæld
fullyrðing sem lítur út eins og mæling**. Vistunin stendur samt af þrem rökum
sem eru **minni** en „tapast að eilífu": nýtileiki (sagan er annars 8,5 MB skrá
sem vex daglega og lab getur ekki lesið), vátrygging (**heimildin hefur þegar
breytt sniði einu sinni**), og að skrárnar séu fastar í git.

**3. Snap-hlutföllin brúast um `pfr_player_id` og það var mælt fyrst.**
Snap-skrárnar bera PFR-auðkenni („BankKe01"), vikulegu raðirnar bera gsis.
`nv.players()` ber bæði, svo **nafna-pörun er óþörf**. Mælt á 2025: 26.612
snap-raðir, 2.189 einkvæm PFR-auðkenni, **2.181 leyst um brúna (99,6%)**,
**6.624 af 6.638 vikuröðum auðgaðar (99,8%)**. Þær 14 sem eftir eru fá **null,
ekki 0** — snap-hlutfall 0 þýðir „spilaði ekki eitt snapp", sem er allt annað
en „vantar".

> **`snap_counts_2026.csv` ER 404** (mælt 14.8.2026 — hvorki `.csv` né
> `.csv.gz` er til fyrr en fyrsti leikur er spilaður). Sameiningin lætur þá
> raðirnar **ósnertar** í stað þess að skrifa `snaps: null` yfir tölu. Það er
> ekki varkárni: skrifuðum við null-svið í hverja röð myndi keyrslan í næstu
> viku **eyða** snöppunum sem sú á undan hafði sótt, um leið og GitHub skilaði
> 404 í eitt skipti.

### Tvær tölur sem eru síaðar, og hvorug vegna stærðar

Báðar eru síaðar til að **hliðið verði ekki tóm fullyrðing**:

- **`weekly-proj/` geymir aðeins raðir sem bera spá.** Vika 1 2026 ber **3.300
  raðir en aðeins 580 með `pts_ppr`**. `rowCount` finnur stærsta fylkið, svo
  með öllum röðum væri talan **alltaf 3.300** og `minRows: 100` gæti **aldrei**
  fallið — það hefði fryst viku með 3.300 nullum sem „í lagi". Sama gildra og
  `market.json` („röð er farmur, ekki umbúðir"), einu lagi innar: **röð án spár
  er umbúð, ekki farmur.** Hliðarábati: 204 KB í stað 1.147 KB.
- **`depth/` geymir aðeins fantasy-stöður** (QB/RB/WR/TE/K; `normPos` gerir
  FB→RB og PK→K). Mælt: **975 raðir af 3.228**, 122 KB á móti 408 KB.
  `dt` og `week` eru strippuð úr röðunum — `dt` er **fasti innan dagsmyndar**
  og er geymdur einu sinni sem `sourceDt`, `week` er **alltaf null** í nýja
  sniðinu. Það er tvítekning, ekki gildi (sama ákvörðun og BSD-skotin í
  FPL-hlutanum, 543 KB → 338 KB).

> **`FANTASY_DEPTH_POS` ER EKKI ÓÞÖRF SÍA OG ÞAÐ SANNAÐI SIG Í KEYRSLU.**
> `normPos` skilaði `null` fyrir „RCB" þegar þetta var skrifað og
> **breyttist í gegnumstreymi meðan verkið var í gangi** (önnur lota).
> Raðafjöldi dagsmyndarinnar hélst **nákvæmlega 975 og 122 KB** í bæði skiptin,
> því sían pinnar mengið. Án hennar hefði serían farið úr 975 röðum í 3.228
> (100 → 146 MB/ár) við breytingu í **allt öðru falli** og orðið
> ósamanburðarhæf við sjálfa sig.

### Tímabils-merkið á vikulegri ECR var RANGT — mælt og lagað 16.8.2026

`weekly-ecr/2025-12-30.json` bar **`"season": 2026`** á gögnum frá **viku 17 af
tímabilinu 2025**. Skráarnafnið kemur úr `scrape_date` og var rétt; **sviðið**
var `season`, breytan sem heldur utan um tímabil **keyrslunnar**. Lab sem
joinar á `season` hefði því borið desember-2025 saman við 2026 — **þögul röng
pörun**, sama ætt og BSD-liðavörpunin í FPL-hlutanum, og verri en engin pörun
því hún les eins og mæling.

`seasonOfScrape(scrapeDate)` leysir þetta: tímabil Y nær **september Y → febrúar
Y+1**, svo janúar og febrúar tilheyra fyrra ári (`month >= 3 ? year : year - 1`).
Ónýt dagsetning skilar **`null`, ekki ágiskun** — „við vitum ekki" er rétt svar,
2026 var það ekki.

**Skráin sem lá á disknum var leiðrétt** (809 raðir, `players`-farmurinn
**bæti-eins**, `scrapeDate` og `captured` ósnert — aðeins afleidda merkið).
Það er ekki brot á `writeOnce`: reglan bannar að **endurskrifa sögu**, og hér
var ekkert mælt gildi snert, aðeins merki sem var sannanlega rangt.

Vörður: **`tests/pipeline.mjs` → „tímabils-merkið"**. Hann prófar formúluna á
sex dagsetningum þar sem svarið er þekkt fyrirfram (bæði mörk: 2026-02-08 → 2025
og 2026-03-01 → 2026), fimm ónýtum inntökum → `null`, **og skrárnar á disknum**.
Sá síðasti er sá sem hefði fundið villuna — formúlan var aldrei til, svo próf á
henni einni hefði verið grænt í tómarúmi. Fimm stökkbreytingar felldar (þ.á m.
„skilaðu bara árinu úr nafninu", sem er nákvæmlega gamla hegðunin).

### `trending/` sækir tvisvar á dag og MORGUNMYNDIN TAPAST — mælt, EKKI lagað

Talið 16.8.2026 yfir sex daga sem serían nær yfir. `core` keyrir **tvisvar**
(~09:20 og ~21:15 UTC) og trending notar `writeJson`, ekki `writeOnce`, svo
kvöldkeyrslan skrifar ofan í morgunmyndina:

| skrá | `captured` sem lifði | morgunkeyrsla sama dags |
|---|---|---|
| `2026-08-11` … `2026-08-16` | **21:14–21:49 UTC, allar sex** | 09:19–09:56, **allar sex horfnar** |

**100% morgunsýnanna eru töpuð**, ekki eitt tilvik eins og fyrri úttekt sagði.
Endapunkturinn er 24-klst gluggi, svo myndirnar tvær eru **ólík gögn**, ekki
tvö eintök af sama.

**OG SAMT VAR ÞESSU EKKI BREYTT — ástæðan er mæld.** Það sem lifir er
**samkvæmt sýnatökuþrep**: allar sex skrárnar eru teknar á sama tíma sólarhrings
(21:14–21:49), svo serían er **innbyrðis samanburðarhæf**. Hún er ekki brotin;
hún er grófari en hún gæti verið. `writeOnce` hér myndi færa sýnatökuna í
09:xx og búa til **rof í miðri seríu** — sex kvöldmyndir og svo morgunmyndir —
sem er verra fyrir tímaröð en að missa af hinu sýninu.

Rétta lausnin er **tíma-lyklun** (`2026-08-14T0953.json`), sem heldur báðum og
býr ekki til rof. Hún breytir hins vegar **lögun seríunnar** og dags-vörðurinn
í `pipeline.mjs` er lyklaður á `{dagur}.json`, svo hún kostar samstillta
breytingu á vistun og verði. **Það er ekki verk sem á að vinna fimm dögum fyrir
draft**, og serían tapar engu sem hún hefur þegar. Skráð hér svo ákvörðunin sé
ákvörðun en ekki gleymska.

> **Athugið að þetta er EKKI brot á `writeOnce`-kenningunni** þótt fyrri úttekt
> hafi flokkað það þannig. `writeOnce` bannar að endurskrifa **sögu**;
> trending-endapunkturinn er **lifandi 24-klst gluggi** og ný sókn er ný mæling,
> ekki endurritun á þeirri gömlu. Munurinn er raunverulegur og athugasemdin í
> `fetch-nfl.mjs` sagði hann rétt allan tímann.

### Vörðurinn — og hann getur fellt gagna-keyrsluna

`tests/pipeline.mjs` fékk 60+ nýjar fullyrðingar. Allt er keyrt á **tilbúnum
gögnum** því hvorug leiðin er keyranleg í beinni í ágúst (`snap_counts_2026`
er 404 og gluggi vikuspárinnar opnast **6.9.2026**) — „kóði sem kviknar fyrst
einn morgun er ekki ásættanlegur ómældur".

**Trending-vörðurinn er nýr og hann er tengdur við cron-ið:** í
**ágúst–janúar** og **eftir 10:00 UTC** fellur hann ef dagsmynd **dagsins í
dag** vantar. 09:00-keyrslan hefur í verki lokið **09:53–09:56** (mælt á fjórum
keyrslum), svo eftir kl. 10 er skráin komin — eða vistunin er brotin.
Hann **sefur í febrúar–júlí**: í mars er engin waiver-hreyfing og vörður sem
flöktir í sex mánuði kennir manni að slökkva á honum — og þá er hann slökktur
í ágúst líka.

> Gamli kaflinn spurði `days.length >= 1`, sem er **satt í eilífð** eftir að
> vistunin hættir að keyra, og las alltaf **nýjustu** myndina — svo hann hefði
> lesið eins og allt væri í lagi. Þekja er fullyrðing; „einhver dagur" er það
> ekki.

**11 stökkbreytingar felldar**, hver ein á sínum verði: `minRows` fjarlægt ·
tilvistarhliðið úr `writeOnce` · gluggahliðið hunsað í kallandanum · **báðar
never-wipe hliðar** úr snap-sameiningunni · þunn-brú hliðið · `pos` sleppt úr
dýptar-útkomunni · `latestOnly` hunsað · **nýja sniðið ekki greint (upprunalega
villan)** · `weekly-ecr` lyklað á daginn í dag í stað `scrape_date` ·
ADP-serían aðeins í `core` · dagsmynd dagsins fjarlægð.

> **`weekly-ecr/` ER LYKLAÐ Á `scrape_date` ÚR GÖGNUNUM, EKKI Á DAGINN Í DAG.**
> Speglunin ber **`2025-12-30`** í dag — síðustu viku **fyrra** tímabils,
> nákvæmlega eins og athugasemdin við `WEEKLY_MIRROR` sagði. Væri hún vistuð
> undir dagsetningu dagsins hefðum við skrifað ~60 **eins** skrár sem allar
> heita eitt en innihalda annað — ferill sem lítur út fyrir að vera langur en
> er sami dagurinn endurtekinn. Sama regla og `accuracy()` hefur þegar: hún
> fellur ef `?year=` skilar öðru ári en um var beðið.

**Ekkert af þessu er LESIÐ af appinu** og það er ásetningur, eins og
`data/history/` og `data/predictions/` í FPL-hlutanum. Þær eru **mælitæki, ekki
birtingargagn** — þess vegna er hvert þrep í sínu `try`: bilun í mælitæki má
ekki taka ADP-ið og meiðslin með sér. **Ekki eyða þeim í „hreinsun".**

---

## 7c. RÁÐGJAFAR-BÓKHALDIÐ — óendurheimtanlegt ef það byrjar ekki fyrir viku 1

`scripts/snapshot-advice.mjs` skrifar `nfl/data/advice/{ár}-w{vika}.json` með
**því sem appið ráðlagði**, áður en vikan var spiluð: start/sit (hvert sæti,
hver leikmaður, `proj` OG `projSleeper`), waiver-tillögur (`gain` í
season-VBD), DST-streymi (allar 32 raðirnar) og stöðuna — **ásamt inntökunum**:
markaðslína liðsins, mótherji, vörn hans gegn stöðunni, tiltækileiki, bye.

**Af hverju það er ekki hægt eftir á.** Þetta er sama röksemd og
`data/predictions/` í FPL-hlutanum (CLAUDE.md 7.1) og hún er ekki fræðileg
hér: veðbankalínan **hverfur eftir leik**, rosterarnir breytast við hvert
waiver, `defense.json` er endurskrifuð í hverri viku, og Sleeper-spár færast.
„Hvað hefðum við ráðlagt í viku 5" er **ósvaranlegt** þegar vika 5 er liðin.
Ráðgjöf sem var ekki skrifuð niður fyrirfram er ekki ráðgjöf, hún er
eftirá-skýring.

**`benchRegret` er útkomu-mælikvarðinn og hann er þegar til** (`lineup.js`).
Hann þarf `started`, `bench`, `projected` og `actual`. Þrennt af því fjórum er
**horfið** eftir vikuna; bókhaldið er það sem varðveitir þau. `projSleeper` er
viðmiðið — nákvæmlega eins og `ep_next` er viðmiðið í FPL-bókhaldinu, því
„lokaði 3,5% af bilinu" er tala án samanburðar.

### Fjórar reglur — allar keyptar með villum í FPL-bókhaldinu

| regla | af hverju |
|---|---|
| **Aðeins fyrir fyrsta leik vikunnar** | Akkerið er **miðnætti UTC á degi fyrsta leiks**, viljandi ~24 klst FYRR en raunverulegt upphaf (20:15 ET = 00:15 UTC næsta dag). Skekkjan má aðeins vera í þá átt |
| **Aðeins einu sinni** | Röð sem er til er ALDREI endurskrifuð. Endurskrifuð ráðgjöf er retro-fitting |
| **Þunn inntök -> ENGIN skrá** | Betra að vika vanti en að hún beri ráðgjöf úr hálfum gögnum; það síðara les eins og mæling |
| **GLUGGI, ekki „við fyrsta tækifæri"** | Sjá næsta kafla — þetta var **raunveruleg villa** í FPL-bókhaldinu |

### Glugginn er 48 klst og talan kemur ÚR CRON-INU

FPL-bókhaldið skrifaði GW1-röðina **222 KLST fyrir frestinn** með `start_prob`
null hjá 577 af 577, því „aðeins fyrir frest" OG „aðeins einu sinni" gefa
**saman** „skrifa við FYRSTA tækifæri og frysta". Kvörðunin hefði því mælt
líkanið á **þess eigin verstu ágiskun**.

Hér er cron-ið annað og því er talan önnur. Akkeri venjulegrar viku er
fimmtudagur 00:00 UTC.

> **TÖLURNAR HÉR VORU RANGAR OG PRÓFIÐ GAT EKKI SAGT ÞAÐ — leiðrétt
> 19.8.2026 (úttekt).** Hér stóð „**48 klst gefa þrjú tækifæri**" og
> „fyrsta tækifærið er **~2,5 dögum** fyrir sunnudagsleikina". Hvorugt
> gildir almennt: **fjórða cron-línan var ekki talin.**
> `0 0,3,6,12,15,18 * 8,9 *` keyrir `--stage=adp`, og skrefið „Skra
> radgjof" í workflow-inu hefur **engan `if:`** — svo bókhaldið fær
> **átta** tækifæri á dag í ágúst–september, ekki tvö.
>
> | regima | tækifæri | fryst (dagar fyrir sunnudag) |
> |---|---|---|
> | september (vikur **1–4**) | **16** | **6,71** (v.1) / **5,71** (v.2–4) |
> | október–janúar | **3** | **5,33** |
> | vika 18 (föstudags-akkeri) | **2** | **2,33** |
>
> „Þrjú" var því rétt fyrir **október–janúar** og „~2,5 dagar" rétt fyrir
> **viku 18** — hvorugt fyrir vikurnar 1–4, sem eru einmitt þær sem
> bókhaldið skrifar fyrst. 24 klst gæfu **eitt** í regimu 2.
>
> **Og prófið prentaði rétta töluna en fullyrti `>= 2`** — fullyrðing sem
> getur ekki greint 16 frá 3 frá 2 er logga með `ok` fyrir framan (5b
> regla 1). Kafli 1 í `tests/advice-ledger.mjs` **fullyrðir nú hverja
> tölu** með raunverulegri cron-þýðingu (mánuður OG vikudagur, ekki bara
> klukkutími) og mælir frystingar-daga úr `schedule.json`. Færi cron-ið
> fellur prófið og bókaða talan verður að uppfærast.

**RÖÐIN FRYSTIST VIÐ FYRSTA TÆKIFÆRI — og það er VALIÐ, ekki óvart.**
„Aðeins í glugga" OG „aðeins einu sinni" gefa saman „skrifa við fyrsta
tækifæri og frysta", og í september er það **fyrsta augnablik gluggans**
(00:00 UTC þriðjudag). Það er sama form og FPL-villan hér að ofan.

**Samt er glugginn EKKI narraður niður, og ástæðan er mæld:** akkerið er
**fimmtudagsleikurinn (TNF)**, svo hvert einasta tækifæri í 48-tíma
glugganum liggur 5,3–6,7 dögum frá **sunnudagsleikjunum** — þar sem ~13 af
16 byrjunarliðssætum eru. Að skrifa við **síðasta** tækifæri í stað fyrsta
færði röðina fram um ~1,9 dag (þri 00:00 → mið 21:00) og hún væri **enn**
3,8 dögum frá sunnudegi. **Það er akkerið sem ræður ferskleikanum, ekki
gluggabreiddin** — engin breyting á breidd getur lagað það.

**Rétta lagfæringin er annað akkeri** (per leikjaslot: sunnudags-ráðgjöf
akkeruð á sunnudag) og hún er **opin spurning** — ekki gerð tveimur dögum
fyrir draft á mælitæki sem skrifar fyrst 8. september.

Það sem er gert í staðinn: hver röð ber `hoursToAnchor`, svo kvörðunin geti
flokkað eftir ferskleika. **En það er klst til fimmtudags-akkerisins, ekki
til leiks leikmannsins**, svo það greinir **ekki** „sunnudagsleikmaður,
ráðið á þriðjudegi" frá „fimmtudagsleikmaður, ráðið á þriðjudegi". Sú
takmörkun er hluti af sömu opnu spurningu og má ekki lesast eins og hún sé
leyst.

### Appið les þetta ALDREI

Það er **mælitæki, ekki birtingargagn**. `tests/advice-ledger.mjs` kafli 7 les
`src/` og fellur ef nokkur skrá þar nefnir `advice/`-möppuna. Þess vegna er
líka `continue-on-error: true` á skrefinu: bókhaldið má **aldrei** fella
gagna-keyrsluna. En það þýðir að bilun INNAN gluggans yrði **þögul**, svo
skriftan skrifar sjálf röð í `status.json` (`advice_ledger`) sem
`Sources`-flipinn birtir — og reglan þar er: **skip er grænt, gluggi opinn +
engin skrá er RAUTT.**

### `NFL_LEDGER_USER` VERÐUR AÐ VERA STILLT — annars vantar start/sit

Sleeper gefur **enga leið** að vita hver af tíu eigendum er notandinn. Appið
veit það úr `localStorage` (notandanafnið sem var slegið inn í Draft-flipann);
pipeline-ið hefur engan aðgang að því. Án hans ber röðin waiver og DST en
**`startsit: null` MEÐ ástæðu** — sagt, ekki giskað, því ráðgjöf um rangt lið
er verri en engin.

Það er `vars`, ekki `secrets` (Sleeper-notandanafn er opinbert):

```
gh variable set NFL_LEDGER_USER --body "<sleeper notandanafn>"
```

**Þetta er eina handtakið sem er eftir áður en vikan 1 er skráð.** Deildirnar
sjálfar eru þegar stilltar (`LEAGUES` í skriftunni, sömu tvö auðkenni og
`src/standings.js` hefur borið í athugasemd; `NFL_LEDGER_LEAGUES` tekur
framyfir).

### Æfing áður en það kviknar

```
node scripts/snapshot-advice.mjs --dry            # forleikur: engin vika
node scripts/snapshot-advice.mjs --dry --week=1   # ÆFIR viku 1
```

`--week` er **æfingaflagg og því er hafnað í raunkeyrslu** (annars gæti það
skrifað röð fyrir viku sem appið sýnir ekki). `--dry` skrifar **ekkert** —
hvorki `data/advice/` né `status.json` — og það er prófað **á bætum skrárinnar
fyrir og eftir**, því í FPL-bókhaldinu gerði `--dry` nákvæmlega hvorugt þess
sem það er til fyrir: það skrifaði, og það prentaði enga þekju.

---

## 8. Bíður tímabilsins

| atriði | af hverju blokkað |
|---|---|
| Vikulegar spár og byrjunarliðs-tól | `weeklyProjection` er skrifað og prófað en hefur **aldrei keyrt á lifandi viku** |
| Vænt stigaskor á flesta leiki | Leikur án línu fær **—**, ekki meðaltal. **Talan er dæmi með dagsetningu:** 337 af 557 (9.8.), **397 af 557 (18.8.)** — bókmakarar opna eftir sinni klukku og `schedule.json` er endurskrifuð daglega. Sjá 4k |
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
