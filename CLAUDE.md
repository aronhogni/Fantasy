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
> **ÞESSI LÍNA VAR ORÐIN ÓSÖNN OG ER NÚ LEIDD, EKKI SKRIFUÐ (25.8.2026).**
> Hér stóð *„Þegar þetta er skrifað er **preseason — engin umferð lokin**, og
> það skýrir flestar tómar tölur í appinu."* GW1 var spiluð 21.–24. ágúst, svo
> setningin var orðin röng — og hún var *skýringin* sem skjalið bauð á tómum
> tölum, þannig að hún sendi næsta mann í að afgreiða raunveruleg göt sem
> „preseason". Nákvæmlega sama ætt og „the range is 4–10 and NO club has a 1"
> í `SetPieces` og hörðu „2025/26"-strengirnir í haus skotakortsins: **föst
> fullyrðing um lifandi ástand úreldist þegjandi.**
>
> **Spurðu gögnin, ekki skjalið.** Klukkan er sameiginleg og er þegar til:
> `seasonHasStarted` í `src/availability.js` (appið) og `playedGwIds` í
> `scripts/fetch.mjs` (pipeline). Fyrri umferð telst spiluð við
> `finished || finished_provisional` — `finished` flettist ekki fyrr en bónus
> er staðfestur, ~3 dögum eftir umferðina, og sex byggjendur gátu á honum og
> sögðu því allir „engin umferð lokin" í þrjá daga eftir GW1.
> `node -e 'JSON.parse(...).filter(f => f.finished_provisional).length'` á
> `data/fixtures.json` svarar þessu á sekúndubroti og er alltaf rétt.

| Hluti | Hvar | Athugasemd |
|---|---|---|
| Framendi | GitHub Pages, `https://aronhogni.github.io/Fantasy/` | Vite, base `/Fantasy/` |
| Gagna-pipeline | GitHub Actions → `data/*.json` í repo | `fetch.yml` daglega 05 UTC, `fetch-fast.yml` á 30 mín |
| Gögn lesin af | `raw.githubusercontent.com/.../main/data/*.json` | appið sækir beint, **enginn bakendi** |
| Proxy | Netlify function `netlify/functions/odds.js` | **EINA** sem Netlify hýsir |

**Sjö flipar** (`view` í `App.jsx`): `⚽ Planner` (upprunalega appið) ·
`👥 Player stats` (`PlayerList.jsx` — aðalverkfærið, sjá 6s; **fjórir
lesmátar**: `Groups` · `Build table` · **`Buy windows`** (`BuyWindows.jsx`,
19.8.2026) · `Imminent`) · `🛡️ Teams`
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
| `buywindow.js` — kaup-gluggar per leikmann | `BuyWindows.jsx` |

> **ENGAR LÍNUTÖLUR HÉR — ÞÆR REKA.** Taflan bar áður nákvæman línufjölda
> per skrá; hann var **úreltur innan sólarhrings** (t.d. `App.jsx` 4.162 ->
> 4.294, `teamstats.js` 243 -> 284). Tala sem er alltaf röng er verri en
> engin tala. `wc -l src/*.js*` gefur hana rétta á sekúndubroti.

`scripts/fetch.mjs` skrifar allt í `data/`.

> **HÉR STÓÐ „er 3.371 lína" OG ÞAÐ VAR 82% RANGT (leiðrétt 25.8.2026).**
> Rétt tala þann dag: **6.212**. Þetta er sama villan og taflan sextíu
> línum ofar varar við í hástöfum („ENGAR LÍNUTÖLUR HÉR — ÞÆR REKA") —
> hún lifði af í einu setningarbroti undir sinni eigin reglu.
> **Engin ný tala kemur í staðinn**, því hver rétt tala verður röng við
> næsta commit. `wc -l scripts/fetch.mjs` svarar á sekúndubroti.

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
- **`rankScore` (`model.js`) er það sem RAÐAR KAUP-tillögum**, ekki `FIT`. Það
  slær bæði aðferð appsins og FPL-eigið xP, og `rank-model.mjs` ber orakel-þak
  sem sýnir að hærri tala væri **leki, ekki afrek**.
  > **EN ÞAÐ RAÐAR EKKI SÖLUNUM, OG ÞESSI LÍNA ÞAGÐI UM ÞAÐ (leiðrétt
  > 18.8.2026).** Sölu-tillögur raðast eftir `score` (`FIT`-líkanið í
  > `src/recommend.js`), ekki `rankScore` — setningin hér var sönn um kaup og
  > **ósönn um sölur**, og sölu-leiðin var hvergi nefnd í þrjú handover.
  > **Mælt áður en nokkru var breytt:** á hermdum 15-manna hópum (botn-2,
  > 100 hópar per umferð) mælist `rankScore` **−0,118 CI [−0,328, +0,088]** og
  > **−0,187 CI [−0,393, +0,009]** — **ógreinanlegt í báðum laugum**. Yfir alla
  > deildina vinnur `score` beinlínis (0,291 á móti 0,766).
  > **Engin mæling styður að skipta sölunum yfir í `rankScore`, svo `score`
  > stendur** — og það er ákvörðun byggð á mælingu, ekki á því að enginn hafi
  > spurt. Vörður: `tests/recommend.mjs`.
- **Wildcard og Free Hit eyða EKKI söfnuðum frískiptum** (FPL-regla frá
  2024/25; þau haldast og +1 bætist við, þak 5).
- **Söluverð** = kaupverð + 50% af hagnaði, **niðurjafnað** á næstu 0,1. Tap =
  fullt núverandi verð. Reiknað í tíundum (`sellTenths`).
- **Vænt stig** (`expPointsFor`) = grunnur (`ep_next`, annars
  `points_per_game`) × mældur margfaldari fyrir FFDR leiksins × tiltækileiki.
  Tvöföld umferð leggst saman, auð umferð = 0.
- **Verðspáin („↑ í nótt?“) er NÁLGUN** — FPL birtir ekki formúluna. Hún má
  aldrei birtast sem vissa.
  > **EN FRAMVINDAN ER NÚ OPINBER (22.8.2026).** Setningin hér að ofan er enn
  > sönn um **formúluna** og var orðin hálf-röng um **framvinduna**:
  > `bootstrap-static` ber núna `price_change_percent`,
  > `price_change_hourly_rate`, `price_change_projections`
  > (`[{offset, projected_percent, likelihood}]`), `price_change_locked_until`
  > og `price_change_calibrating` per leikmann. Nýr dálkur í Basics
  > („Progress to price change") ber **tölu FPL óbreytta** — hvorki skölluð
  > né formerkið túlkað, því kvarðinn er ómældur þar til fyrsta breytingin
  > lendir. Nálgunin lifir áfram sem „↑ í nótt?" og er áfram merkt sem
  > ágiskun; **tvær tölur undir sama dálka-heiti væru tveir kvarðar**, svo
  > dálkurinn ber opinberu töluna eða ekkert.
  > **DÁLKURINN ER TÓMUR Í DAG OG ÞAÐ ER RÉTT.** Mælt 22.8.2026 á lifandi
  > svari, öllum 600: `price_change_percent` **0 hjá öllum**, `calibrating`
  > false, `locked_until` null, engin projection með `likelihood > 0` — og
  > `cost_change_start !== 0` hjá **0 af 600**, því FPL frystir verð fram
  > yfir fyrstu umferð. Flutningarnir eru á meðan sprelllifandi (Calafiori
  > +26.570 nettó), svo þögnin er ástand en ekki biluð sókn.
  > **Pipeline-an SLEPPIR sviðunum** meðan svo er (`priceChangeSignal`) —
  > BSD-reglan úr kafla 6 færð yfir á FPL: 0 hjá öllum á `hi:true` dálki
  > setur alla jafna á toppinn og les eins og mæling. Hliðið opnast sjálft
  > við fyrsta merki. Verðir: `fetch-entry.mjs` kafli 6, `stats.test.mjs`
  > kafli 22.
  > **KVARÐINN OG FORMERKIÐ VORU MÆLD SAMDÆGURS (22.8.2026 kl. 19:30 UTC),
  > ÞEGAR SVIÐIN VÖKNUÐU** — 440 af 600 bera nú tölu. **Jákvætt er leið upp
  > á við:** 177 með jákvæða prósentu hafa meðal-nettó **+2.570**
  > flutninga, 263 með neikvæða **−1.664**; Calafiori **+34,2** (nettó
  > +58.432) efst, Gyökeres **−29,3** neðst. Sviðið er **−36,5 .. +34,2**
  > og **enginn utan [−100, 100]**, sem styður að 100 sé þröskuldurinn.
  > Formerkin eru samstíga í **73,3%** og það er RÉTT tala en ekki lak
  > merki: þröskuldurinn skalast með eignarhaldi og prósentan safnast upp
  > yfir daga meðan `transfers_in_event` er þessi umferð ein — Martinelli
  > mælist −36,5 með nettó aðeins −1.344. Að „laga" það með eigin skölun
  > væri að setja nálgun ofan á opinbera tölu.
  > `price_change_locked_until` er **notað** (30 leikmenn í dag) og
  > `projections` bera nú `likelihood: 1` með vaxandi `projected_percent`
  > (1,8 → 3,6 → 5,3 eftir dögum). Hvorugt er birt enn — það er sér
  > ákvörðun, ekki þessi.
  > **OG FYRSTA SPÁIN STÓÐST Í RAUNKEYRSLU:** dagskeyrslan 22.8. kl. 05:23
  > hitti nákvæmlega tilfellið sem `seasonBaselineDecision` var smíðuð
  > fyrir og skráði `season under way (max starts 1) - frozen`.
  > `players.json` ber þessa árstíðar núll (600 raðir, max starts 1) meðan
  > `season_baseline.json` stendur ósnert frá 21.8. (599 raðir, max starts
  > 38). Klobburinn var spáður kl. 01:30 og afstýrt kl. 05:23.
- **SAMTÖLUR Í TEAMS ERU EKKI NÝ STÆRÐ — ÞÆR VORU REIKNAÐAR OG ÓBIRTAR**
  (22.8.2026). Notandinn: *„ég vill geta séð samtals xGC fyrir allar valdar
  gameweeks — 20 xGC yfir 20 umferðir."* Taflan bar aðeins per-leik tölur, svo
  GW26–38 las „xGC 0,94" þar sem spurningin var „hve mikið alls". `xg`, `xgc`,
  `goals` og `conceded` eru **þegar** á hverri röð og `applyTeamRange` leggur
  þau saman **úr sama bili** og per-leik tölurnar; þau áttu engan dálk. Sama
  ætt og `played`/`bsd_matches`. **Nefnarinn fylgir og það er ekki skraut:**
  samtala er háð því hve margir leikir lenda í bilinu, svo lið með auða umferð
  fær lægri samtölu án þess að vera betra — og nefnarinn er líka prófið sem
  notandinn lýsti sjálfur (samtala ÷ leikir = per-leik dálkurinn). `played` og
  `bsd_matches` eru **aðskildir** því heimildirnar telja sinn hvorn
  leikjafjöldann; samtala undir röngum nefnara lítur rétt út og er það ekki.
  > **OG DÁLKARNIR AFHJÚPUÐU LATENTA VILLU SEM VAR ÓSÝNILEG MEÐAN ENGINN
  > BIRTI ÞÁ.** `luck.json` ber `goals`/`conceded`/`matches` fyrir NÝLIÐANA
  > líka — en það eru **Championship-tölur**: COV **97 mörk á 46 leikjum**,
  > HUL 70, IPS 80. `team_form.json` gerir það ekki (`matches: 0,
  > source: "none"`), sem er ástæðan fyrir því að `goals_pg` er null hjá þeim.
  > Röðin tók því **samtöluna úr einni heimild og per-leik töluna úr annarri,
  > og þær eru úr sitthvorri deildinni** — nákvæmlega ættin úr kafla 12
  > (`xg_share` 148%). Um leið og dálkurinn kom hefði Coventry setið með 97
  > mörk, efst í deildinni: rétt tala um ranga deild. Skilyrðið er nú það sama
  > og nullar `goals_pg` (PL-leikir úr `team_form`). Vörður: `team-stats.mjs`
  > kafli 4 féll á þessu strax, og kafli 14 ver samlagninguna sjálfa —
  > **68/68 samtölur deilast rétt** í heilu tímabili og í tveimur bilum, og
  > fjórar stökkbreytingar eru felldar.
- **TEAMS BÝÐUR NÚ YFIRSTANDANDI TÍMABIL — REIKNAÐ ÚR `fixtures.json`, ENGIN
  NÝ GAGNASKRÁ** (22.8.2026). Notandinn: *„ég vill að Teams stats bjóði upp á
  nýjasta season, að ég geti valið það og þá bara skoðað GW1 núna."* Taflan las
  aðeins `team_form.json`, sem er **fyrra tímabil** — E0-skráin fyrir 2026/27
  verður ekki til fyrr en tímabilið er af stað (kafli 6), svo yfirstandandi
  tímabil átti **enga leið inn**. Heimildin sem ER til er leikjaskráin sjálf:
  hún ber úrslitin um leið og leikur er búinn og appið les hana þegar.
  `buildLiveTeamForm` er hreint fall; ekkert nýtt kall, engin ný skrá.
  · **HÚN BER EKKI ALLT OG ÞAÐ ER AÐALATRIÐIÐ.** Úr úrslitum einum fást leikir,
    mörk, mörk á sig og hrein blöð. **Skot, skot á mark, horn, brot og spjöld
    eru EKKI í `fixtures.json`**, svo þeir reitir eru ekki settir og verða
    `null` → „—", aldrei 0. xG/xGC koma úr BSD sem nær yfir 2025/26 eitt.
    > **xG/xGC Á YFIRSTANDANDI TÍMABILI KOMA NÚ ÚR `bsd_live.team_matches`
    > — OG SÍÐASTI SPOLURINN VANTAÐI (24.8.2026).** `teamstats.js` bar
    > **bæði** samlagninguna (`aggLiveMatchRange`) **og** jafngildis-vörðinn
    > (`team-stats.mjs` kafli 12g), og `fetch.mjs` skrifaði röðina — en
    > `App.jsx` sendi `bsdLive` **aldrei** inn í `<Teams>` og `Teams.jsx`
    > nefndi `liveMatches` **hvergi**. Dálkarnir hefðu því staðið tómir
    > þótt pipeline-an skrifaði gögnin, og lesist eins og „BSD vantar" í
    > stað „við gleymdum að tengja". **Nákvæmlega sú villa sem
    > `lineups.json` er nefnd fyrir í kafla 7.1** — og hún er ástæðan fyrir
    > því að „kóðinn og verðirnir eru komnir" er **ekki** sama og „talan
    > lendir á skjánum". Vörður: `team-gw.mjs` kafli 4d les xGC **af
    > skjánum** sem **delta** (tómt án `bsdLive`, tala með henni) og
    > fullyrðir að hún sé xG **mótherjans**, ekki liðsins sjálfs — snúin
    > tenging er tengd og röng, sem er verra en ótengd.
    > **AUKAVÍSBENDING SEM ER RÉTT HEGÐUN, EKKI VILLA:** sjálfgefni
    > flokkurinn **skiptir** um leið og skota-heimildin fær gögn (úr vörn
    > yfir í skot), því flokkurinn er valinn eftir því hvað er ekki tómt.
    > Prófið færir **báðar** teikningar í sama flokk — annars væri það að
    > bera saman tvær ólíkar töflur.
  · **LEIKUR TELST SPILAÐUR VIÐ `finished_provisional`, EKKI `finished`.**
    Mælt: allir sex leiknu GW1-leikirnir bera `finished: false` með
    `finished_provisional: true, minutes: 90` og fullum úrslitum — `finished`
    flettist fyrst þegar umferðin er staðfest með bónus. Að bíða eftir henni
    hefði sýnt tóma töflu í marga daga eftir að leikirnir voru búnir. Leikur
    **í gangi** er hins vegar útilokaður, svo tölurnar hoppa ekki á meðan
    spilað er. Það tilfelli er **ekki til í `data/` í dag**, svo stökkbreyting
    sem taldi óleikna leiki með **slapp í gegn á raungögnum einum** — vörðurinn
    er því á tilbúnum gögnum (`team-stats.mjs` kafli 15).
  · **NOTANDINN LENDIR EKKI Á TÓMUM FLOKKI.** Sjálfgefni flokkurinn er
    skota-drifinn að öllu leyti, svo smellurinn skilaði tíu dálkum af „—".
    Leiðréttingin liggur á **skiptunum einum** — fyrsta útgáfan leiðrétti við
    hverja teikningu og henti þá notanda sem valdi þann flokk **strax til
    baka**, svo hann gat ekki skoðað flokkinn sem hann bað um.
  · **HEITIÐ ER LEITT, EKKI SKRIFAÐ.** `SEASON_LIVE_LABEL = "2026-27"` var
    fyrsta útgáfan og `team-stats.mjs` felldi hana samstundis („engin
    tímabils-tala er harðkóðuð"). Sú regla er til vegna hörðu
    „2025/26"-strengjanna í haus skotakortsins og á jafn vel við hér: föst tala
    úreldist þegjandi næsta ágúst. `seasonLabel` kemur úr `currentSeasonLabel`.
  · **SJÁLFGEFIÐ VAR FYRRA TÍMABIL — ÞVÍ VAR SNÚIÐ VIÐ SAMDÆGURS OG ÞESSI
    LÍNA STÓÐ ÓSÖNN EFTIR (leiðrétt 25.8.2026).** Hér stóð *„SJÁLFGEFIÐ ER
    ÁFRAM FYRRA TÍMABIL og það er mælt val"*. Notandinn bað um hið gagnstæða
    („ég vill hafa nýjasta tímabilið auto valið allsstaðar") og `Teams.jsx`
    ber núna `useState("live")`; sama gildir um `PlayerList`, `Compare` og
    `SeasonTable`. **Mælingin sem stóð að baki gömlu línunni er ENN RÉTT** —
    yfirstandandi tímabil er eins-leiks úrtak og skota-dálkarnir tómir — en
    hún var **rök, ekki ákvörðun**, og notandinn tók ákvörðunina. Það sem
    gerir þetta að villu í skjalinu er að línan sagði „er", ekki „var mælt":
    **föst fullyrðing um lifandi stillingu úreldist þegjandi**, nákvæmlega
    eins og „preseason — engin umferð lokin" í kafla 1 og „the range is 4–10"
    í `SetPieces`. Vörnin gegn eins-leiks úrtakinu er ekki sjálfgildið heldur
    `liveOn`-varaleiðin (ekkert spilað -> fyrra tímabil) og `setGwRange(null)`
    við skipti, svo GW30–38 val geti ekki setið ofan á einum leik.
- **`odds.gw` VAR MERKIMIÐI UM FREST, EKKI UM INNIHALD** (22.8.2026). Hliðið
  skilar `gw: next.id` — umferð næsta frests — og sú tala var stimpluð á
  skrána. En bókmakarinn gefur línur á **þá leiki sem eru óleiknir**, og það
  tvennt fer í sundur í hvert sinn sem frestur líður áður en umferðin klárast.
  Mælt: `odds.json` bar **`gw: 2`** meðan **18 af 18 röðum voru GW1-leikir**,
  tíu þeirra þegar byrjaðir. **Þetta er merkimiða-villa, ekki gagna-villa** —
  `csFor` sannreynir hverja röð á mótherja OG dagsetningu, svo notandinn fékk
  aldrei ranga tölu; dálkurinn var tómur, sem er rétt svar. En allt sem las
  merkimiðann var blekkt, og `stats.test.mjs` fann það orðrétt. Talan er nú
  **leidd af innihaldinu** (`oddsGwCoverage`), `gws` ber allar umferðir sem
  raðirnar spanna og `gw_deadline` heldur gömlu tölunni undir sínu eigin nafni.
- **EIN ODDS-RÖÐ PER FÉLAG — OG HÚN VAR SÚ SÍÐASTA Í SVARINU, EKKI SÚ NÆSTA**
  (27.8.2026). `teams[hs] = {...}` í lykkju yfir svar bókmakarans er
  „síðasti vinnur", og svarið **spannar oft tvær umferðir** (hann verðleggur
  viku fram í tímann). Mælt: `data/odds_raw/2026-08-27-sharp.json` ber 20 leiki
  frá 28.8. til 6.9. — GW2 OG GW3 — og `odds.json` sat eftir með **GW3 hjá
  öllum 20 félögum** (`gws: [3]`) daginn fyrir GW2-frestinn. Afleiðingin er
  ekki röng tala heldur **engin**: `csFor` sannreynir mótherja OG dagsetningu,
  svo CS%-dálkurinn og markaðsliðurinn — sterkasta einstaka inntakið í FFDR —
  voru **tóm fyrir þá umferð sem verið var að skipuleggja**. Sama ætt og
  BSD-reglan „lið leikmanns er FLEST-LEIKIÐ lið, ekki síðasti sem vinnur"
  (kafli 6): þegar tvær raðir keppa um sama reit má röðin ekki ráðast af röð í
  svarinu. Leyst með `preferNextMatch` (fyrsti leikur vinnur).
  · **OG LAGFÆRINGIN SANNAÐI SIG Á LIFANDI GÖGNUM DAGINN EFTIR.** Sóknin
    29.8. kl. 11:27 (plan-gluggi fyrir GW3) fékk svar sem spannaði GW2 OG
    GW3: **18 félög halda GW2-leiknum sínum**, en CRY og MCI — sem spiluðu
    sinn GW2-leik 28.8. — fá GW3-leikinn, og `gws` er `[2,3]`. Með gömlu
    reglunni hefðu öll félög sem eiga GW3-línu verið yfirskrifuð og
    markaðsliðurinn dottinn út fyrir umferðina sem var að hefjast.
    **AFLEIÐINGIN ER AÐ GAGNKVÆMNI YFIR SKRÁNA GILDIR EKKI LENGUR** og það
    er rétt: `csFor` sannreynir mótherja OG dagsetningu per félag, svo
    per-félags-réttleiki er það sem gildir. Vörðurinn í `model.test.mjs`
    krafðist gagnkvæmni yfir ALLA skrána — sem var satt af RANGRI ástæðu
    (skráin bar eina umferð af því að hún var skökk). Hann spyr nú um
    tvennt sem hefur tennur: hver röð verður að svara **raunverulegum leik**
    í `fixtures.json` (lið + mótherji + kickoff), og línur **sama leiks**
    verða að benda hvor á aðra.

  · **OG SKRÁIN VAR ENDURBYGGÐ ÚR ARKÍVINU, EKKI SÓTT AFTUR.** Hliðið hleypir
    aðeins einni sókn í hvorn glugga (`age < 30` klst), svo skráin hefði borið
    GW3 fram yfir GW2-frestinn. Umbreytingin bjó INNI í `fetchOdds`, sem gerir
    HTTP-kallið sjálft — hún var því óprófanleg án API-lykils OG hráa svarið,
    sem er committað, varð ekki lesið aftur. **Arkív sem ekki er hægt að lesa
    aftur er arkív að nafninu til.** Nú eru `oddsTeamsFromRaw` og
    `oddsFileFrom` hrein föll með þrjá lesendur (sóknin,
    `scripts/rebuild-odds.mjs`, `tests/odds-transform.mjs`) og GW2-línurnar
    voru endurbyggðar úr `odds_raw/2026-08-27-sharp.json` — **engin ný sókn,
    enginn kvóti**. `updated` fylgir sókninni sem gögnin komu úr, ekki
    klukkunni: hliðið gátar á aldri hennar, svo „núna“ hefði lokað glugganum í
    30 klst til viðbótar fyrir gögn sem eru ekki ný.
  · **FULLYRÐING PRÓFSINS ER TÍMA-STÖÐUG OG ÞAÐ ER ÁSETT:** hún er um
    eiginleika umbreytingarinnar (hver röð er FYRSTI leikur félagsins í
    svarinu), ekki um dagatalið. „Næsti óleikni leikur“ hefði verið sannur í
    dag og ósannur í næstu viku — og þá hefði safnið fallið án þess að nokkuð
    væri að. Stökkbreytingin („síðasti vinnur“) fellir 3 fullyrðingar.
- **API-SPORTS ER UPPSAGÐUR AFTUR — OG ÞAÐ ER EKKI KVÓTI** (22.8.2026, milli
  05:23 og 18:23). Svarið er `{"access":"Your account is suspended…"}` á
  **tveimur ólíkum endapunktum**, og aðeins ~4 af 100 daglegum köllum voru
  notuð þegar það gerðist — `/injuries` hafði virkað um morguninn. Þrepið
  **leyfði** `/fixtures/lineups` 21 klst fyrr á sama fría plani, svo gamla
  fullyrðingin („þrepið leyfir ekki") nefndi **ranga orsök** og hefði sent
  næsta mann í að uppfæra plan sem er ekki vandamálið. Lagast aðeins á
  `dashboard.api-football.com`. Vörðurinn í `wiring.mjs` sefur með **þremur
  fullyrðingum sem hafa tennur** (ferskleiki rannsóknarinnar, sýnileiki í
  „Data sources", og að ósamhverfa geymslan `PROBE_TTL_BLOCKED = 1` sé óbreytt
  — væri lokað svar geymt í 7 daga gæti endurheimt aðgangs farið fram hjá
  okkur í viku og merkið aldrei vaknað).
  > **OG HANN VAR BLINDUR Á LEIKDEGI, SEM ER EINI DAGURINN SEM SKIPTIR MÁLI.**
  > `fetchLineups` skrifar `probe` UTAN glugga en `errors[]` **innan** hans, og
  > gamla fullyrðingin las aðeins `probe.gated` → `undefined` → grænt. Sannað
  > með því að spila leikdags-skrána aftur.
  > **OG HANN ER EKKI LENGUR EINRÁÐUR (24.8.2026).** Notandinn: *„allir API
  > eiga að vera inni á GIT, ef ekki finndu aðra leið sem virkar."* Lykillinn
  > ER í GitHub Secrets og hann er ekki vandamálið — **reikningurinn** er það,
  > og hann lagast hvergi nema hjá veitunni. Leiðin sem virkar er **FotMob
  > `/matchDetails`** (200, enginn token) og hún er **mæld, ekki áætluð** —
  > tölurnar eru í heimilda-töflunni í kafla 6. Tvennt hér er almennt:
  > **(a) KVEIKJAN ER ÚTKOMAN, EKKI ORSÖKIN.** Varaleiðin fer í gang þegar
  > *byrjunarlið vantar*, ekki þegar *reikningurinn er uppsagður* — skilyrði
  > sem telur upp orsakir gleymir alltaf einni, nákvæmlega eins og „suspended"
  > vantaði í `gated`-regexið hér að ofan.
  > **(b) VARALEIÐ SEM ER GÖTUÐ Á AÐALLEIÐINNI ER EKKI VARALEIÐ.** Kallið á
  > `fetchLineups` var gatað á `FLAGS.apisports` (sem krefst API-lykilsins),
  > svo FotMob hefði **aldrei keyrt** þann dag sem lykillinn hverfur. Nú er
  > fallið ógatað og API-Sports-**kallið** gatað inni í því. Sama ætt og
  > `fetch-fast.yml` án `env`-blokkar: fallið var kallað og sleppti sér þegjandi.
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
- **KAUP-GLUGGAR (`buywindow.js`, 19.8.2026) ERU AFSTÆÐIR VIÐ MANNINN
  SJÁLFAN — og það er ÖNNUR spurning en FFDR-taflan svarar.** Taflan er
  **algild** („hvern á ég að kaupa"); glugginn er **afstæður við hans eigið
  meðaltal** yfir sýnda bilið („HVENÆR á ég að kaupa hann"). Bæði eru rétt um
  sína spurningu og bæði bera merkimiða um hvor er hvor á skjánum. **Algild
  regla var mæld og hafnað** (kafli 4): með þröskuldi á græna þrepinu fær
  Arsenal **einn glugga, GW1–38**, sem er satt og gagnslaust.
  · Einingin er `lookupPos(pos,"pts",d)` — **MEASURED_POS**, raunveruleg
    meðalstig **MEÐAL-manns í þeirri stöðu**, ekki hans eigin geta. Það er
    ásett: `ep_next` er null hjá mörgum í forleik og hefði þaggað heilan
    glugga niður í 0 — tala sem les eins og „engir góðir leikir". Eigin geta
    er fastur margfaldari og fellur hvort eð er út þegar borið er við hans
    eigið meðaltal, svo **lögun glugganna er sú sama**.
  · **STAÐAN ER INNTAK, OG ÞAÐ ER ÁSTÆÐAN FYRIR SÝNINNI:** mælt á öllum 20
    liðum fá DEF og FWD **ólíka glugga í 17 af 20**, GK og DEF í 17 af 20.
    Væri það 0 væri sýnin óþörf — FFDR-taflan gerði það sama. Vörður:
    `buy-windows.mjs` kafli A10 fellur undir 10 af 20.
  · **AUÐ UMFERÐ MÁ VERA INNI Í GLUGGA — VILJANDI ANDSTÆTT `greenRuns`.**
    Þar SLÍTUR hún runu (runan spyr „á hann góðan LEIK í hverri viku?"); hér
    er spurningin „er þetta góður tími að EIGA hann?" og þá er auð vika
    kostnaður **inni í** glugganum, ekki endalok hans. Óvís umferð (`d`
    vantar) KLYFUR hann hins vegar — vantar er ekki núll (kafli 8).
  · **TILTÆKILEIKI ER EKKI Í ÞESSU.** Maður með `status:"i"`, `chance:0` og
    enga dagsetningu fær avail 0 fyrir ALLAR 38 umferðir, svo röðin yrði öll
    núll og gluggarnir hyrfu — birting sem les eins og „hann á engan góðan
    leik" en þýðir „hann er meiddur í dag". Meiðsli lagast; leikjaprógrammið
    gerir það ekki. Staðan er MERKT á röðinni (FPL-status ræður, kafli 6).
  · **EINN MÆLIKVARÐI Á VAL OG ÞAK — ÞAÐ VAR VILLA Í FYRSTU ÚTGÁFU.** Leitin
    velur eftir **skori** (`sum/(len+3)`) en þakið skar eftir **ábata**, svo
    gluggi sem leitin valdi FYRST var skorinn burt fyrir lengri glugga sem
    var VERRI á sinn eigin mælikvarða. Fannst af slembna prófinu (1 af 300).
    `windows[0]` er því valröðin sjálf, og viðmótið raðar eftir SÖMU tölu.
  · **LITURINN VAR ALGILDUR MEÐAN RAMMINN VAR AFSTÆÐUR — LAGAÐ 19.8.2026.**
    Notandinn: *„það þarf ekki að vera absolute green, bara besta tímabil
    leikmannsins — ef ég ætla að kaupa hann hvort sem er, hvaða gameweeks á
    ég að kaupa hann í."* Gluggarnir voru afstæðir frá fyrstu útgáfu, en
    hólfin voru máluð með `tierOf(d)`, svo **besta runa Hull-varnarmanns var
    römmuð í grænu og máluð rauð** — tvær fullyrðingar um sama hólf, hvor úr
    sinni spurningu. Mælt: **Hull, allar fjórar stöður, á ENGA umferð undir
    hlutlausa þrepinu** á algilda kvarðanum (4 af 80 samsetningum; 36 raðir
    á skjánum). Nú er **`his own` sjálfgefinn kvarði** og `league` (kvarði
    FFDR-töflunnar) einn smellur undan, bæði með merkimiða.
  · **AFSTÆÐA VÖRPUNIN FÆRIR, HÚN TEYGIR EKKI:**
    `tierOf(d − (meanD − NEUTRAL_MID))`. Þrepabreiddirnar eru áfram
    **mældu deildar-sextílarnir** og `NEUTRAL_MID` er **LEIDD** af
    `TIER_CUTS` og `TIER_NEUTRAL`, svo engin ný tala verður til.
    **Sextílar HANS EIGIN gilda voru hafnað:** þá fengi hver leikmaður alla
    sex litina og flöt leikjaskrá (spönn 0,04) læsi eins og sveiflukennd —
    sama tap sem afstæð þrep innan LIÐS voru mæld og hafnað fyrir (~30% af
    merkinu). Vörður: `buy-windows.mjs` kafli A9b, *„flöt leikjaskrá er ÖLL
    hlutlaus"*, fellur við nákvæmlega þá stökkbreytingu.
  · **`meanDifficulty` er NÁMUNDAÐ Í TVO AUKASTAFI eins og `d` sjálft.**
    Talan er birt í tooltip-inu og er sú sem liturinn er reiknaður úr; með
    fullri nákvæmni lágu **11 hólf** við þrepamörk á öðrum lit en birta talan
    sagði. Tvær nákvæmnir á sama kvarða eru tveir kvarðar.
  · **`MIN_WINDOW = 3` og `MAX_WINDOWS = 3` eru UI-afmarkanir**, eins og
    verðþakið í `rotation.js` — ekki hluti líkansins. Ekkert í FFDR,
    `rankScore` né væntum stigum les þessa skrá.
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
| DefCon í FFDR eða í röðun | DC fylgir *þyngri* leikjum — dregur í gagnstæða átt við hreint blað. Lifir á spjöldum og í dálkum. **MEKANISMINN VAR FULLYRÐING TIL 20.8.2026, ÞÁ MÆLDUR — OG HANN ER RAUNVERULEGUR:** innan leikmanns, á 3.580 MID-byrjunum 2025/26, gefur hvert FFDR-þrep **+0,123 DC-aðgerðir CI [0,032, 0,216]** og **+0,150 DC/90 CI [0,062, 0,235]** — bæði útiloka null. **EN STIGA-RÁSIN ER LOKUÐ AF ÞRÖSKULDINUM:** DefCon-stig hreyfast **+0,007/þrep CI [−0,032, +0,048]** hjá há-DC miðjumönnum, því +0,6–0,9 aðgerðir yfir ALLT þrepasviðið færa engan yfir 12-þröskuldinn. Yfir sviðið 0→5 er rásin **0,03 stig, í besta falli (efri CI) 0,24** á móti 1,89 stiga leikja-spönn líkansins fyrir grunn 4,5. Sami sami mælikvarði finnur **−0,123 CI [−0,210, −0,035]** í mörkum+assistum í sömu röðum, svo nullið er null og ekki brotið mælitæki | 3, 6l, 20.8.2026 |
| Form / „heitur leikmaður" | Innan leikmanns er þetta **afturhvarf**: −4,52pp eftir mark (t=−5,26). Hrein blöð liða raðast ekki í runur (lyfting 0,99) | 6c |
| Stöður gegn ákveðnum liðum | Leifin flyst ekki milli tímabila í neinni stöðu — 38-leikja úrtakshávaði. `pos-vs-opponent.mjs` | 3 |
| **xGChain / xGBuildup** | **Mælt 9.8.2026 á StatsBomb-opnu gögnunum (PL 2015/16, 380 leikir, 549 leikmenn, 10.450 leikmanna-leikir).** Bæta **ENGU** ofan á xG+xA: út fyrir úrtak (leikmanna-skipt) −0,0009 og −0,0014. Í öfugri röð, ofan á snertingar, −0,003. Ein og sér eru þær VERRI en xG+xA (r 0,370 og 0,344 á móti 0,469). Understat-arfurinn er ekki þess virði að elta | 4 |
| **Snertingar í vítateig** | **ENDURMÆLT 12.8.2026 OG STENST EKKI — flutt hingað úr „stenst"-flokknum.** Endurmælt á SÖMU gögnum og í sömu stærð sem fyrri mælingin nefnir (StatsBomb PL 2015/16, 380 leikir, **10.450 leikmanna-leikir** — talan stemmir orðrétt), með **bootstrap klösuðum per leikmann** (400 ítranir), sem er staðallinn í `mo-candidates.mjs`: **delta +0,0156, 95% CI [−0,0079, +0,0389] — INNIHELDUR NULL.** Fyrri talan var +0,036; hér mælist minna en helmingur og CI útilokar ekki núll. Sami mælikvarði felldi „sleppa óheppnis-liðnum" við CI [−0,023, +0,055]. **OG STAÐGENGILLINN ER ENGINN:** `shots_in_box` (sem BSD HEFUR) fylgir sanna sviðinu r 0,721 en bætir **engu** ofan á xG+xA — delta −0,0008, CI [−0,0194, +0,0091] — því hún fylgir xG (0,578) sem er ÞEGAR í líkaninu. **Há fylgni við sviðið segir ekkert um hvort sviðið bæti við það sem við höfum þegar.** Snertingar Í HEILD gefa aðeins r 0,266 við sanna sviðið, sem staðfestir mekanismann („hvar", ekki „hve mikið") en hjálpar ekki. Sex heimildir prófaðar 12.8.2026: FBref `cf-mitigated: challenge`, SofaScore 403, FotMob token-varðað, Understat ber engar snertingar, worldfootballR hefur sviðið en er ÓVIRK (síðast 2022-10-25), BSD engin snerti-hnit. **Við þurfum EKKI heimild — merkið er ekki staðfest.** Skrifta: `scripts/measure-box-touches.mjs` | 4 |
| **Post-shot xG (PSxG) — LÍKANIÐ VIRKAR, MÆLIKVARÐINN FLYST EKKI** | **Mælt 9.8.2026.** BSD birtir markhnit með HÆÐ (`gm.x/y/z`) fyrir **100% skota á mark** (3.224). Úr þeim var **fittað post-shot xG-líkan** (logistic: xG, frávik frá miðju, hæð, fjarlægð): út fyrir úrtak er það **kvarðað** (315,2 á móti 304 mörkum) þar sem hrátt xG vanmetur um **44%**, Brier 0,193 → **0,165**, AUC 0,763 → **0,793**. Líkanið sjálft er því gilt og er ÓKEYPIS útgáfa af tölu sem er seld. **EN afleiddi mælikvarðinn — „goals prevented" per lið — FLYST EKKI: r(fyrri helmingur → seinni) = −0,217** (SUN +6,7 → −3,8; TOT +1,4 → −11,0). Á einu tímabili er hann LÝSING á því sem gerðist, ekki spá. Ekki velja markvörð eftir honum | 4 |
| **Staðsetningarhæfni skota (placement)** | Sama líkan: PSxG − vænt PSxG per skot. **Flyst ekki innan tímabils: r = +0,050** (39 leikmenn með ≥20 skot á mark) — veikara en dómara-spjöldin sem var hafnað. Hrátt „PSxG − xG" er auk þess ONYTT: það er jákvætt hjá ÖLLUM af því að skot á mark eru valin úrtak (44% skekkjan), svo það mælir skotmagn, ekki hæfni | 4 |
| **Dómara-spjöld í spá (B7)** | **Mælt 9.8.2026 á 15 tímabilum E0.** Spjaldatíðni dómara **flyst ekki**: r(N→N+1) = **0,182** að meðaltali en **6 af 14 pörum eru NEIKVÆÐ** (−0,370 til +0,619), 95% CI [0,008, 0,356]. Sama undirskrift og stöður-gegn-liðum. Og stærðin er hverfandi: allt bilið frá spjaldaglaðasta til rólegasta dómara er 1,93 gul/leik, sem **deilist á 22 byrjunarliðsmenn** = 0,088 stig/leikmann/leik með FULLKOMINNI vitneskju, ~**0,016 nýtanleg**. Vænt stig eru 2–7. **Gagnaskorturinn var aldrei bindandi — merkið er það** | 4 |
| Varnarsinnaðir miðjumenn fá varnar-FFDR | 0,1σ; besta w hoppar milli tímabila og skiptir formerki | 3 |
| **DC-miðjumaður á að FÁ FLEIRI stig í ERFIÐARI leik (flatari eða snúinn FFDR-halli)** | **ENDURMÆLT 20.8.2026 MEÐ DEFCON-STIGAGJÖF LIFANDI — HAFNAÐ Á ÖLLUM ÞREM ÁSUM.** Þetta er **þriðja og ólík** spurning: hinar tvær (varnar-FFDR úr xGI-proxy, `tests/defcon-mid.mjs` úr raun-DefCon) spurðu **hvor FFDR-BREYTAN spáir betur (r)**; `expPointsFor` notar ekki r heldur **HALLANN**, og tvær breytur geta haft sama r og allt annan halla. Fyrri mælingarnar gátu því ekki svarað þessu. **Sannreynt fyrst að stigin séu til:** 2 stig fyrir DC-þröskuld endurbyggjast í **1398 af 1443** röðum í `player_gw_2526.json`, svo 2025/26 er raunverulega heimur þar sem varnaraðgerðir borga. Mælt á **3.580 MID-BYRJUNUM** (nefnarinn er byrjanir, ekki leikir; GK útilokaðir), tertílar á `hit_rate_adj` (afturvirkjað, K=10, p0=0,17). Víxlverkunin halli(HÁTT DC) − halli(LÁGT DC), **innan leikmanns**, bootstrap klösuð per leikmann, 400 ítranir: tíma-heiðarleg (GW1–19 -> GW20+) **0,000 CI [−0,301, +0,296]**, allt tímabilið **+0,029 CI [−0,145, +0,233]** — **fellur á marktækni**. **Fellur á stærð:** 0,029 stig/þrep = **0,14 stig yfir allt sviðið**, og stiga-rásin sjálf er bundin við 0,03 (efri CI 0,24) — dómara-spjöldin voru felld á 0,088 með FULLKOMINNI vitneskju. **Fellur á stöðugleika:** víxlverkunin er **+0,089 í GW1–19 og −0,063 í GW20–38, SKIPTIR FORMERKI** — sama undirskrift sem felldi varnar-FFDR 28.7. **0 af 5 næmis-útfærslum útiloka null** (topp-desíl, hrá hittni, CBIRT/90, mín≥60, samfelld d). Stigin FALLA áfram með þrepi hjá há-DC hópnum (4,15 -> 3,35 frá þrepi 0 til 5) og hjá erkitýpunni sjálfri (Ibrahim Sangaré, 25 byrjanir, halli −0,42/þrep). Skrifta: `scripts/measure-defcon-ffdr.mjs` | 20.8.2026 |
| **`PREV_K` — blöndun fyrra og yfirstandandi tímabils, ENDURMÆLD MEÐ VIKMÖRKUM** | **Mælt 24.8.2026 að beiðni notandans („endurskoðaðu FFDR eftir nýjustu upplýsingar, og form"), `scripts/measure-prev-k.mjs`, 6.080 lið-leikir.** FFDR blandar þegar (`w_prev = K/(n+K)`, `PREV_K = 10`, fittað 28.7.2026) — en sú fitting var **tafla án vikmarka** og hámarkið sagt „flatt (k=10–40)". Flatt hámark án CI er myndlýsing, ekki mæling. Endurmælt: K=10 gefur vegið \|r\| á raunstigum **0,2214**, besta K á ristinni (15) gefur **0,2216** — ábati **+0,0003**. **Ekkert K nær marki**: hvert einasta glugga-delta inniheldur núll (t.d. n=4–6 stig d=+0,0054 CI [−0,0016, +0,0137]; n=23–37 d=−0,0001). Með markaðslínunni eru K=0/10/20/∞ ógreinanleg (0,3929–0,3945). Til samanburðar var sjöunda þrepið hafnað við **+0,00085** og „sleppa óheppnis-liðnum" við **P=74%**. **K=10 STENDUR** — og er nú varðað (`form-blend.mjs`), því stökkbreyting 10→40 slapp áður gegnum ALLT safnið. **Blöndunin sjálf borgar sig og það staðfestist:** K=10 slær bæði jaðartilfellin í öllum fjórum stöðum (DEF −0,269 á móti −0,256 fyrir K=0 og −0,253 fyrir hreint fyrra tímabil) | 24.8.2026 |
| **„Form" sem nýtt inntak í FFDR** | **Ekki endurmælt og á ekki að vera:** spurningin er lokuð í tvennu lagi hér að ofan (leikmanns-form er afturhvarf, −4,52pp eftir mark; hrein blöð liða raðast ekki í runur, lyfting 0,99). Það sem notandinn var í raun að spyrja um — hvenær yfirstandandi tímabil á að taka við af því fyrra — er `PREV_K`, sem ER blöndunarvélin og var endurmæld (röðin fyrir ofan). **GW1 2026/27 gefur EKKERT svar:** 12 lið eiga bæði spá og úrslit, 2–3 per þrep (mörk á sig eftir spáðu þrepi: 1,00 · 1,33 · 1,00 · 1,00 · 1,50). Það er 0,2% ofan á 6.080 lið-leiki og að fitta á það væri hávaða-fitting | 24.8.2026 |
| **STÓRA STIGALÍKANS-BEIÐNIN (25.8.2026) — SEX TILGÁTUR, ALLAR FELLDAR** | **Mælt að beiðni notandans** („ég vill búa til betra spálíkan fyrir stig … ekki hætta fyrr en þú nærð marktækri bætingu"), `scripts/measure-exp-points-v2.mjs`, 5 tímabil, **51.262 / 126.730 leikmanna-umferðir**, bootstrap **klasað per leikmann**, 400 ítranir, fast fræ. **ENGIN breyting á `src/model.js` var réttlætt og engin var gerð.** (1) **DefCon sem inntak:** þrautseigjan er raunveruleg (DC-hittni split-half **r 0,7551** á móti **0,3263** fyrir stig = **2,31×**) en ákvörðunin hreyfist ekki — `d top15` **0,000 CI [−0,239, +0,232]**; og formið sem notandinn lýsti sjálfur (`nonDC-ppg × mult + 2 × p_hit`) er **VERRA**: `d top15` **−0,344 CI [−0,565, −0,088]**, útilokar null í RANGA átt. (2) **Mótherji × staða:** `d r` **−0,0007 CI [−0,0014, −0,0000]** (neikvætt), þekja 92,7% — ekki gagnaskortur. (3) **Markaðsoddar:** ÞEGAR inni; DEF **+0,0038 [+0,0018, +0,0059]**, GK **−0,0008 [−0,0051, +0,0031]**. (4) **Big chances:** `d r` +0,0009 CI [−0,0027, +0,0046]. (5) **Mínútur/byrjunar-líkur:** lítur út eins og eini sigurvegarinn á `ppg5`-grunni og **SNÝST VIÐ** á skrumpuðum grunni (`d top15` −0,179 [−0,287, −0,080]) — það var aldrei um mínútur, hrátt 5-leikja meðaltal er einfaldlega vondur grunnur. (6) **threat/ICT/xGI:** að fella xG/xA-fjölskylduna úr 56-inntaka ridge gefur `d r` **−0,0003 [−0,0005, −0,0001]** — hún er þegar inni og ber sitt. **VÖRNIN SEM VANN:** bygging appsins (`grunnur × FFDR-margfaldari`) **jafnar eða slær** 56-inntaka ridge þegar grunnurinn er góður (topp-15 5,104 á móti 5,104), og FFDR-margfaldarinn ber sitt þar: **Δtopp-15 +0,175 CI [+0,066, +0,292]**, útilokar null. **Sangaré-dæmið sem notandinn nefndi er RÉTT SÉÐ EN RANGT GREINT:** hans eigið meðaltal 2025/26 var **3,24** svo 2,3 var raunverulega lágt — en orsökin er skrumpun grunnsins, ekki vantandi DC-liður; 14 stig eru **hala-atburður** (4,19% raða ná 10+, besta líkan spáir þeim 3,58) | 25.8.2026 |
| **FPL-EIGIÐ `xP` SEM VIÐMIÐ EÐA INNTAK** | **LEKIÐ — og það er nú VARÐAÐ, ekki bara skjalað.** `xP` fylgir raunstigum **r 0,4529** innan leikmanns á móti **0,0720** hjá besta leka-frjálsa líkaninu — **6,3×**, sem er ekki gæði heldur gegnsýring (það er reiknað eftir á). Safn sem notar `xP` sem viðmið mælir því hversu vel við hermum eftir leka. **`tests/xp-contaminated.mjs` fellur** ef `xP` er notað sem viðmið eða sem inntak í sömu röð; `xP5` (aðeins fortíð) er beinlínis leyft | 25.8.2026 |
| **ÞRJÚ INNTÖK ÚR BEIÐNINNI SEM VORU ALDREI MÆLD — NÚ MÆLD (25.8.2026)** | **`scripts/measure-opp-pens-shots.mjs`**, committuð `data/`, engin ytri köll, ~38 s, **deterministísk** (fast fræ 7, bootstrap klasað per leikmann fyrir r/MAE og per umferð fyrir topp-15). Röðin hér að neðan hét áður „ekki reynt"; hún er nú **reynd og felld**, nema þar sem gögnin eru einfaldlega ekki til. **(a) MEIÐSLI Í LIÐI MÓTHERJANS — EKKI MÆLANLEG SEM MEIÐSLI.** Ekkert í repo-inu geymir **sögu um tiltækileika**: `fpl_player_gw.json` ber ekkert slíkt svið, og `data/history/` er **verð-eingöngu og hefst 25.7.2026**, svo hún spannar enga lokna umferð. Staðgengillinn sem ER hægt að byggja er **fjarvera** (hlutfall mínútna mótherjans síðustu 5 umferðir sem tilheyra mönnum sem spiluðu 0 í dag) og hann blandar meiðslum, bönnum, róteringu og félagaskiptum — ekkert í gögnunum skilur þau að. Orakel-útgáfan: hrár halli innan leikmanns **+0,0954 stig per +0,10 fjarveru CI [0,0666, 0,1236]**, net af líkani **+0,0703 CI [0,0427, 0,0974]** = **~0,16 stig** yfir raunsviðið. **En nothæfa útgáfan (fjarvera í N−1, sú eina sem er þekkt fyrir frest) mælist `d r +0,0003 CI [−0,0002, +0,0007] — INNIHELDUR NULL**, og topp-15 versnar í **öllum fjórum** reitum (t.d. orakel `−0,029`). Óstöðug líka: halli per tímabil 0,0086–0,1506, **17× spönn**, og nýjasta tímabilið er nánast núll. **(b) VÍTI OG DÓMARI — DÓMARA-HELMINGURINN ER EKKI MÆLANLEGUR.** E0 ber `Referee` í öllum 15 tímabilum en **ENGAN víta-dálk í neinu þeirra** (dálkarnir eru nákvæmlega `HS,AS,HST,AST,HF,AF,HC,AC,HY,AY,HR,AR`); víti eru aðeins til í BSD, sem nær yfir **2025/26 eitt**. Prófið sem felldi dómara-spjöldin — `r(N→N+1)` yfir 14 tímabila-pör — **er því ekki hægt að keyra**. Innan þess eina tímabils: 89 víti á 17 dómara með ≥10 leiki, umfram-dreifni **0,00265 CI [−0,00713, +0,01751] — inniheldur null**, og þak með FULLKOMINNI vitneskju **0,102 stig** (á móti 0,016 sem spjöldin voru felld við). Lids-víti á sig: `d r −0,0013 CI [−0,0042, +0,0016]`; og fullyrðing notandans sjálfs (hjálpar það vítaskyttunni?) mælist **+1,063 stig per +1 víti/leik CI [−3,773, +6,639]** — CI 20× breiðara en matið. Aflið skýrir hvers vegna: 0,24 víti per leik þýðir að félag hefur gefið **um tvö** við GW20. **(c) HRÁ SKOT-TALNING SEM EP-LIÐUR — FELLD, OG HÚN SKAÐAR.** Ofan á grunn sem ber ÞEGAR `xg90/xa90/xgi90/threat90/ict90`: `d r +0,0026 CI [−0,0036, +0,0080]` og `d MAE` inniheldur null — **en `d topp-15 −0,196 CI [−0,330, −0,074]`, sem ÚTILOKAR NULL Í RANGA ÁTT.** Sama niðurstaða og box-snertingarnar eftir annarri leið: **merki sem fylgir því sem er þegar í líkaninu er ekki ný upplýsing.** Pörunin er BYGGINGARLEG (mínútu/stiga-vigur per umferð, ekki nöfn): 534 einkvæm af 537 | 25.8.2026 |
| **EIN BYRJUN SEM DEFCON-MERKI — MERKIÐ ER RAUNVERULEGT, BIRTINGIN BREYTIST SAMT EKKI** | **Mælt 27.8.2026 að beiðni notandans um M.Sangaré** („hann er líklegur að fara að ná DefCon" eftir 13 DC á 75 mín í GW1), `scripts/measure-first-start-dc.mjs`, 360 leikmenn 2025/26 með ≥6 byrjanir, bootstrap klasað per leikmann, fast fræ. **`measure-dc-flag.mjs` setti GÓLF VIÐ 5 BYRJANIR og það er rétt um SINN mælikvarða** — hrá hittni á einni byrjun er 0% eða 100%. **En DC-TALNINGIN er samfelld og var aldrei mæld**, svo gólfið gilti um hana án mælingar. Hún ber merki: `r(DC/90 í fyrstu byrjun -> hittni í ÞEIM SEM Á EFTIR KOMA)` = **0,396 CI [0,274, 0,511] hjá MID** (DEF 0,259 [0,077, 0,418]; FWD 0,149 [−0,090, 0,361] inniheldur null), og hún slær **binæru** hittuna (0,230 [0,059, 0,399]). Hópur ≥15 DC/90 á móti <15: **+0,221 CI [+0,062, +0,422]**, útilokar null — **en n=9 í efri hópnum og bandið er ekki einrænt** (12–15 mælist 0,171, LÆGRA en 8–12 sem er 0,214), sem er undirskrift hávaða. **ÞAÐ SEM ER FELLT ER BIRTINGIN:** að skipta `hit_rate_adj` út fyrir DC/90-línu bætir MAE um **0,0063 CI [−0,0010, +0,0136] — INNIHELDUR NULL**, og línan var meira að segja fittuð á SÖMU gögnum (þak, ekki tillaga). **Skrumpaða talan stendur.** Sami mælikvarði og felldi „sleppa óheppnis-liðnum" | 27.8.2026 |
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
| **Kaup-gluggar: sextílar HANS EIGIN gilda sem litakvarði** | Freistandi því það gefur hverjum leikmanni fulla litaskalann — og það er einmitt villan: flöt leikjaskrá með spönn **0,04** fékk alla sex litina og las eins og sveiflukennd, svo sýnin hefði sagt að hann hefði glugga sem hann hefur ekki. Sama tap sem afstæð þrep innan liðs voru hafnað fyrir. Rétta vörpunin **færir** kvarðann (`d − (meanD − NEUTRAL_MID)`) og heldur mældu sextíla-breiddunum | 19.8.2026 |
| **Kaup-gluggar: ALGILD regla (þröskuldur á græna þrepinu)** | **Mælt 19.8.2026 á öllum 80 (lið × staða) samsetningum.** Freistandi því þröskuldurinn er MÆLDUR (sextíla-mörkin sem skilgreina „grænt" alls staðar í appinu) og engin ný tala þarf. Útkoman er samt ónothæf: Arsenal og Man City fá **EINN glugga, GW1–38**, af því að þeir eiga raunverulega góða leiki allt tímabilið (og það er RÉTT, sjá kafla 3). Spurningin „hvenær" er afstæð við manninn; algildi kvarðinn svarar „hvern" og hann er þegar til í FFDR-töflunni | 19.8.2026 |
| **Kaup-gluggar: BER ÁBATI (`sum`) sem markmið** | Rétt hagfræði, ónothæf birting: Arsenal-vörn fær **GW3–22 — tuttugu vikur með +0,07 stig/umferð**. Það er meðaltalið sjálft með hávaða utan um sig, ekki gluggi. Medallengd 7,7, hámark **26 vikur** | 19.8.2026 |
| **Kaup-gluggar: BER ÞÉTTLEIKI (`sum/len`)** | Hinn öfgi: **9 af 10 gluggum verða nákvæmlega 3 vikur** (miðgildi 3, hámark 4) og „góðar GW30–38" — sem var beinlínis það sem var beðið um — finnst **ALDREI**. Lausnin er skriða á lengd (`sum/(len+3)`, sama form og `hit_rate_adj`): meðallengd 4,0, p90 6, hámark 10. Næmið er mjúkt (k=0…8 færir meðallengd 3,2→4,2), svo talan velur bragð, ekki útkomu | 19.8.2026 |
| **Kaup-gluggar: MIÐGILDI í stað meðaltals sem viðmið** | **Óstöðugt í báða enda á sömu gögnum:** Arsenal-vörn fær **ENGAN** glugga (næstum allar umferðir bera sama `v`, svo miðgildið liggur ofan á þeim) en Sunderland og Newcastle fá **GW1–37** — einn glugga sem er nánast allt tímabilið. Meðaltalið er stöðugt af því að summan af (v − meðaltal) er núll með byggingu | 19.8.2026 |
| **`expPointsFor × startProbability` sem XI-val („Pick best team")** | **MÆLT 20.8.2026 á 125.187 leikmanna-umferðum, 53.700 hermdum 15-manna hópum, 182 umferðum, 5 tímabilum** (`scripts/measure-best-xi-rule.mjs`). **FORMERKIÐ SNÝST VIÐ EFTIR MÆLIKVARÐA — og það er allur lærdómurinn.** Á HRÁRRI XI-summu vinnur margfeldið (regulars +0,043 · priced **+0,358** [+0,246, +0,462]); með **FPL-VARASKIPTUM** — sem er það sem notandinn fær í raun — **TAPAR það í öllum þremur laugum**: −0,0550 [−0,0938, −0,0243] · −0,0961 [−0,1251, −0,0699] · −0,0060 [−0,0099, −0,0020], öll CI útiloka null, og negatíft á þremur óháðum fræjum. **MEKANISMINN: varaskiptin gefa ábatann FRÍTT.** Af þeim sem margfeldið setur á bekk og sem blönkuðu voru **88,9% varaskipt hvort sem er**. Að byrja róterings-mann er því frír valréttur; að bekkja mann með háum væntum stigum sem SPILAR er óafturkræft tap. Það tapar á BÁÐUM hlutum: XI-val −0,0392, bekkjar-röð −0,0125. **`sp^k` er EINRÆNT MINNKANDI í k**, svo k=0 (ekkert margfeldi) er hámarkið — engin vog vinnur. Líka mælt og fellt: `MIN_START_PROB` sem hörð útilokun (priced **−0,169**) og `trap`-þrepið (priced −0,060). **OG VARÚÐIN SEM MÁ ALDREI GLEYMAST:** naíft `expPts × sp` án `?? 1` bekkjar **81,6%** þeirra 134 sem eiga ENGA byrjunar-tölu og kostar **−3,86 stig/umferð** — sjötugfalt eigin áhrif margfeldisins, og í GW1 er sá hópur hver einasti nýliði. Margfeldið stendur ÁFRAM fyrir fyrirliða (N=1, +0,790 [+0,379, +1,178] í `captain.js`) — **sama formúla, önnur ákvörðun, önnur útkoma** | 20.8.2026 |
| **Keppinautur úr leik lyftir byrjunar-líkum (ÚTILEIKMENN)** | **MÆLT 20.8.2026 á 91.300 röðum, 1.755 leikmönnum, 5 tímabilum.** Notandinn spurði út frá Ben White: *„aðal keppinautur hans er meiddur, svo hann byrjar pottþétt."* Hugmyndin er rétt í eðli sínu og **mælist samt núll — eða neikvæð — þar sem hún á að gagnast.** Nothæfa formið („samherji í sömu stöðu spilaði 0 mín í N−1"), skorðað við þá sem EIGA dýrari keppinaut: allir +0,0050 [+0,0005, +0,0103], en `p<0,45` **−0,0017 [−0,0059, +0,0025]** og `p<0,30` **−0,0057 [−0,0096, −0,0014]**. Lággildis-hópurinn er einmitt sá sem spurningin er um. **Og ÞAKIÐ er lágt þótt maður VITI svarið:** orakel-lyfting per stöðu er DEF +0,063 · MID +0,036 · FWD +0,056 — 3–6 prósentustig með FULLKOMINNI vitneskju. Mekanisminn er skýrður: félag með 5–8 menn í sömu stöðu **endurstillir**, það kallar ekki inn einn ákveðinn varamann, og FPL-gögn hafa enga nákvæma stöðu (hægri bakvörður á móti miðverði), svo Timber-gegn-White er ekki einu sinni orðanlegt. **GK er ANNAÐ MÁL og var samþykkt** (sjá kafla 12b) | 20.8.2026 |
| **Keppni-merkið á æfingaleik (Community Shield) sem byrjunar-merki** | **MÆLT 20.8.2026 á fjórum sumrum.** Notandinn: *„byrjaði síðasta leik í Community Shield sem menn nota oftast sterkasta liðið sitt."* **Innsæið er rétt um HVAÐ á að skoða og rangt um HVERS VEGNA.** Þegar vitað er að hann byrjaði SÍÐASTA æfingaleikinn bætir keppnis-merkið engu: hópur A +0,0003 [−0,0083, +0,0081], og hópur B (nýliðar, þeir sem spurningin er um) **NEIKVÆTT −0,0083 [−0,0166, −0,0019]**. Liðurinn sem gerir allt gagnið er „byrjaði síðasta æfingaleikinn" (+0,0341 [+0,0267, +0,0423]) — dagsetningin, ekki merkimiðinn. Sama ætt og „selected_by_percent sem GW1-merki": talan sem lítur mikilvægust út er ekki sú sem ber merkið | 20.8.2026 |
| **„Sást í æfingaleik" sem byrjunar-merki** | Fellt af ÞEKJU-ástæðu, ekki merkja-ástæðu: **23 af 80 lið-tímabilum eiga ENGA FotMob-uppstillingu**, svo „sást ekki" er gegnsýrt af því hvort heimildin náði leiknum. Appið má ALDREI lesa „sást ekki" sem „byrjar ekki". Liðurinn sem lifir er `started_last_friendly`, sem er skilgreindur aðeins fyrir þá sem SÁUST | 20.8.2026 |
| **Velja hópinn eftir síðasta tímabili einu** | Freistandi því það þarf enga skönnun: 1,149% á móti **0,892%** fyrir recency yfir allan ferilinn (N=1000). Tvö síðustu tímabil gefa 0,958%. Full saga borgar skönnunina | 9.8.2026 |
| **„Keppinauturinn í minni stöðu er úti" fyrir ÚTILEIKMENN** | **MÆLT 20.8.2026, `scripts/measure-rival-out.mjs`, 5 tímabil, bootstrap klasað per leikmann.** Þetta er innsæi notandans („Ben White er með ST 24% en aðal keppinautur hans er meiddur") og það er RÉTT um markmenn og RANGT um alla aðra. Orakel-þök net af líkani: **GK +0,1934** · DEF +0,0627 · MID +0,0361 · FWD +0,0564. En orakel er LEKI; liðurinn sem er nýtilegur fyrir frest („missti N−1") mælist í þeim lága hópi sem málið snýst um (p_model < 0,30) **−0,0057, 95% CI [−0,0096, −0,0014] — NEIKVÆÐUR og útilokar null.** Vélbúnaðurinn skýrir það: eitt byrjunarsæti per lið hjá markmönnum, 4–5 hjá hverjum útileikmannahóp, og „varnarmaðurinn fyrir framan mig er meiddur" þýðir oft að einhver ANNAR var keyptur. Markmanns-liðurinn lifir sem **SAMHENGI, EKKI TALA** (`gk_chief_out`, `stats.js` kafli 6) | 20.8.2026 |
| **GK-liðurinn INN Í `start_prob` (talan, ekki samhengið)** | Mælingin er sterk (varamarkmaður byrjar **0,2%** þegar nr. 1 spilar og **63,6%** þegar hann gerir ekki, en líkanið segir 5,7% í báðum tilfellum; net af líkani +0,105 CI [+0,037, +0,175] fyrir frest, +0,391 CI [+0,317, +0,469] orakel). **Það sem féll er KVEIKJAN og ÁGISKUNIN, ekki merkið.** (a) Lifandi kveikjan er `chance_of_playing_next_round === 0`, sem er HVORUG þeirra tveggja sem var mæld — að velja +0,105 eða +0,391 væri að velja tölu. (b) „Hver er nr. 1" er ágiskun okkar og hún er **mæld röng í dag**: í forleik ber `players.json` mínútur fyrra tímabils, líka þegar þær voru unnar hjá ÖÐRU félagi, svo Dubravka (3.150 mín hjá Burnley) raðast ofan á Vicario (2.790) hjá Tottenham — og það er Vicario sem er á 0%. Þrír klúbbar (COV/HUL/IPS) eiga engan markmann með mínútur, svo röðunin þar er tilviljun. (c) Staðreyndin er um ANNAN leikmann; FPL-gólfið breytir tölunni því `chance === 0` er staðreynd um ÞENNAN. Sama rök og gera að 25/50/75 er látið standa. Fordæmið er Evrópu-álagið: sýnt sem samhengi af því að mælingin studdi ekki meira | 20.8.2026 |
| **Færa `startRisk`-þrepin (0,75 / 0,45) fyrir forleik** | **MÆLT 20.8.2026 á sömu 1.901 röðum, LOSO-endurkvörðuðum.** Freistandi því grunnhlutfallið er annað (0,356 í GW1). Útkoman: þrepið var ekki rangt, **KVARÐINN var það.** Á hráa kvarðanum sagði „safe" (≥0,75) 0,75 en raunverulegt var **0,695 CI [0,650, 0,730] — 0,75 UTAN CI, merkimiðinn var mælt ósannur.** Á endurkvarðaða kvarðanum er sama þrep **0,746 CI [0,674, 0,814] — 0,75 INNAN CI, nú sannur**; og „low" (<0,45) er 0,196 CI [0,173, 0,218]. Grid-leit 0,20–0,55 og 0,65–0,85 finnur ENGAN stað þar sem krafan brotnar eftir endurkvörðun, svo engin mæling KALLAR á flutning — og að flytja þrepið líka væri að leiðrétta sömu villuna tvisvar. Áhrifin eru samt raunveruleg: **443 af 1.901 (23,3%) skipta um merkimiða, ALLAR í strangari átt** | 20.8.2026 |
| **`trap`-þrepið í forleik** | **MÆLT OG SNÝST VIÐ.** Innan tímabils er „byrjaði síðast en líkurnar lágar" hópurinn sem fellur á bekk (lyfting 2,09×). Í forleik er `started_last` = „byrjaði SÍÐASTA LEIK FYRRA TÍMABILS" og það er **POSITÍVT**: í bandinu p < 0,45 byrjar hann GW1 í **0,372 CI [0,284, 0,481]** á móti **0,183 CI [0,160, 0,209]** — delta **+0,1895 CI [+0,0937, +0,3028], útilokar null**, í GAGNSTÆÐA átt við það sem rauði `trap`-reiturinn segir á skjánum. Þrepið er því **slökkt í arkiv-glugganum**. Merkið er ekki þaggað heldur sett í MERKIMIÐANN: +0,19 ofan á p væri nýr liður á n=86 röðum sem engin mæling fittaði | 20.8.2026 |
| **Fyrra tímabil Í HEILD í stað tail-5 gluggans** | Mælt í sömu skriftu (`measure-tail-to-gw1.mjs`): byrjunar-HLUTFALL d Brier +0,00355 CI [−0,00430, +0,01201] og MÍNÚTUR/umferð +0,00562 CI [−0,00211, +0,01401] — **báðar innihalda null.** Glugginn er ekki rangur; kvarðinn var það (`PRESEASON_CAL`). **Tail-5 + fyrra tímabil SAMAN vinnur** (+0,01220 CI [+0,00729, +0,01765]) en það er NÝ VIDD sem krefst nýrra vogtalna í `START_MODEL` sjálfu — önnur ákvörðun, skráð svo hún týnist ekki | 20.8.2026 |
| **Verð sem staðgengill fyrir þá sem fá ENGA byrjunar-tölu** | 632 leikmenn á fjórum tímabilamótum (19,3% allra GW1-byrjunarmanna) fá `null` því `start_feats` vantar. Verð-eitt líkan út fyrir úrtak: **AUC 0,5972** og d Brier gegn fasta **+0,00240 CI [−0,00185, +0,00648] — innihelda null.** Þeir fá áfram `null`, ekki ágiskun — „fáar mælingar → ENGIN tala" | 20.8.2026 |

> **HANDVIRKAR MÆLINGA-SKRIFTUR (ekki í `npm test`, ekki í pipeline):**
> `ffdr-vs-fdr.mjs` · `euro-congestion.mjs` · **`scripts/measure-box-touches.mjs`**
> — sú síðasta sækir StatsBomb-opnu gögnin (~380 skrár) í `scripts/.boxtouch-cache/`
> (gitignored, ~600 MB rannsóknargögn) og endurmælir box-snertingarnar. Hún er
> **eina leiðin til að endurtaka niðurstöðuna hér að ofan** og hún tekur ~20 mín
> í fyrstu keyrslu, sekúndur úr cache.
> · **`scripts/measure-defcon-ffdr.mjs`** (20.8.2026) endurmælir DC-miðjumanns-
> spurninguna á committuðum `data/` — engin ytri köll, ~20 s, **deterministísk**
> (fast fræ í `bootstrapCI`). Hún flytur `makeFixDifficulty`, `tierOf`,
> `lookupPos` og `POS_MEAN_PTS` INN úr `src/model.js` og `bootstrapCI`/`byPlayer`
> úr `scripts/start-panel.mjs` — **ekkert endurritað** (kafli 7: handafrit af
> `buildTeamMetrics` skrifaði NaN á 17 lið og merkti það sem mælingu).
> `--json <slóð>` skrifar allar tölurnar út.

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
> skjalinu sem varar við henni.
>
> **OG SÚ LEIÐRÉTTING ÚRELTIST SJÁLF (25.8.2026): 48 er nú 81.** Það er
> þriðja talan á sama stað, og hún sannar að vandinn var aldrei talan
> heldur **formið**: hver ný rétt tala verður röng við næsta safn.
> **Þess vegna stendur hér engin tala framar.** `SUITES` í
> `tests/run-tests.mjs` ER skráin, keyrarinn telur hana sjálfur, og
> `node -e` gefur fjöldann rétt á sekúndubroti. Sama regla og felldi
> línutölurnar úr töflunni í kafla 1 og „the range is 4–10" úr
> `SetPieces`: **tala um lifandi ástand á heima í kóðanum sem les hana,
> ekki í prósa sem enginn endurreiknar.**

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
| `fetch-entry.mjs` | **Að pipeline-an keyri þegar hún er keyrð, og AÐEINS þá.** Keyrir raunverulegt afrit af `scripts/fetch.mjs` í nýju ferli, báðar leiðir — beint og innflutt — með `main()` skipt út fyrir prentun. Bilun í því skilyrði er **þögul**: græn keyrsla, útgangsstaða 0, engin skrif |
| `buy-windows.mjs` | **Kaup-gluggarnir.** Kafli A9b ver afstæða litakvarðann: *flöt leikjaskrá er ÖLL hlutlaus* (fellur ef vörpunin teygir í stað þess að færa) og *hver röð án góðs leiks á algilda kvarðanum hefur góðan á hans eigin* — lesið AF SKJÁNUM á öllum 592 röðum (36 slíkar, allar Hull). Kafli A er á TILBÚNUM röðum þar sem svarið er þekkt fyrirfram (erfiður leikur inni í glugga klýfur hann EKKI · auð umferð má spanna en aldrei vera endi · óvís umferð KLYFUR · flöt röð fær ENGAN glugga); A8 er **300 slembnar raðir gegn óháðum uppteljara** — hann fann villuna í valröðinni (tveir mælikvarðar á sömu ákvörðun). A10 er á RAUNGÖGNUM og fullyrðir að staðan skipti máli (DEF≠FWD í 17 af 20) — væri það 0 væri sýnin óþörf. Kafli B les tímalínuna AF SKJÁNUM: liturinn = `tierOf`, græni ramminn, og **enda-invariantið** (bekkjar-punktur má aldrei sitja á enda glugga). **Sex stökkbreytingar felldar**, þar á meðal `border`-styttingin sem gaf React-viðvörun |
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
| **ClubElo** | **SKIPT: `api.clubelo.com` ÓNÁANLEG · `clubelo.com` UPPI** | Elo-inntak í FFDR. **LEIÐRÉTT 20.8.2026 — hér stóð „virk" og það var hálf-rangt.** Þetta eru **tveir hostar** og bara annar svarar: `api.clubelo.com` (DNS 37.128.134.74) gefur **0 bæti, timeout á 12 s OG 25 s, bæði http og https**, héðan og úr CI-tölum, og `elo.json` var þess vegna frosin frá 14.8.; `clubelo.com` (DNS 172.66.0.96, Cloudflare) svarar **200, ~595 KB, 0,11 s**. Notandinn sagði réttilega „ClubElo er ekki niðri" á meðan staðan sagði „timeout" — **bæði var satt**. **Frosin Elo er EKKI hlutlaus þótt engin umferð sé lokin:** 14.8. -> 20.8. rak hún að meðaltali **25,3 stig, mest 58,8** (ARS 2063,8 -> 2005) og **RÖÐIN breyttist** — forskot ARS á MCI fór úr 92,9 í 13 og TOT fór upp fyrir LEE. Röðin er það sem FFDR les. **API-inn er ÁFRAM aðalleiðin** (hreint CSV með `Rank`/`Level`); vefurinn er **valideruð varaleið** (`parseClubEloWeb` í `fetch.mjs` — svið, spönn, einkvæmni, röðun<->Elo einræni, krossprófun við Vega-blobbið á sömu síðu, og **öll 20 liðin eða ekkert**). **Ógild þáttun heldur GÖMLU skránni** og `elo.json.source` + tvær aðskildar `status.json`-raðir (`elo` grænt, `elo_api` rautt) segja hvor heimildin var notuð. Vörður: `elo-fetch.mjs` á frystu HTML-i. **OG `elo_fixtures` FÆR ALDREI ÞESSA VARALEIÐ — MÆLT 21.8.2026.** Endurmælt í dag: `api.clubelo.com` tekur **enga tengingu á hvorugum endapunkti** (`/Fixtures` OG dagsetta CSV-ið, bæði 0 bæti), meðan `clubelo.com/Fixtures` svarar **200, 613 KB** og `clubelo.com/ENG` **200, 560 KB** — svo það er hosturinn sem er niðri, ekki ein slóð. **Vefsíðan getur samt ekki þjónað þessari röð:** hún ber `1`/`X`/`2` en **ENGA úrslita-fylki** (`R:0-0`…`R:6-0`), svo `cs_home/away` og `xg_home/away` eru ekki reiknanleg. Hlutaskrá með `0` í CS%-sviðinu væri „tómt gildi er ekki null" (kafli 8) — og verri hér en annars staðar, því talan færi í CS-keðjuna sem **miðþrep**. **KOSTNAÐURINN ER MÆLDUR OG LÍTILL:** `eloCsByFx` er annað þrep af þremur í `csFor` (`App.jsx:1181` — bókmakari, svo elo, svo `cleanSheetProb`), og þrepið sem tekur við er **mælt betra** en gamla uppflettitaflan (skill 5,94% á móti 3,91%, ΔBrier +0,00569 CI [+0,00555, +0,00584]; `tests/cs-logistic.mjs`). Rauð röð þýðir því „ein heimild af þremur vantar", ekki „CS% er ónýtt" — og **nótan segir það núna berum orðum**, því rauð röð sem segir aðeins „timeout" sendir mann í að leita á röngum stað |
| **Odds API** (um Netlify-proxy) | virk, kvótaður | Markaðslínan; `h2h,totals,spreads`. Sótt tvisvar per umferð |
| **ESPN** site-API | 200 | **Eina lifandi skot-heimildin**: hnit, útkoma, stöng, svæði, upplegg úr texta. Gefur **enga xG** |
| **BSD** (`sports.bzzoiro.com`) | 200, ókeypis, enginn kvóti | Per-skot xG, skotakort, treverk, föst leikatriði. **Aðeins 2025/26** |
| **API-Sports** | **UPPSAGÐUR — og hann er ekki lengur eina leiðin** | `/fixtures/lineups` (staðfest byrjunarlið). Reikningurinn er `suspended` í annað sinn og lagast **aðeins** á `dashboard.api-football.com` — ekkert í repo-inu getur opnað hann. **STAÐFEST BYRJUNARLIÐ KOMA NÚ ÚR FOTMOB ÞEGAR HANN ÞEGIR** (24.8.2026, `fotmobLineups` í `fetch.mjs`): kveikjan er **útkoman, ekki orsökin** — við spyrjum „vantar okkur byrjunarlið?", ekki „er reikningurinn uppsagður?", því uppsögn, kvóti, tímamörk og sniðsbreyting enda öll á sama stað og skilyrði sem telur upp orsakir gleymir alltaf einni (sbr. „suspended" sem VANTAÐI í `gated`-regexið). Kallið er **ekki lengur gatað á `FLAGS.apisports`** — væri það svo myndi varaleiðin aldrei keyra þann dag sem lykillinn hverfur, sem er einmitt dagurinn sem hún er til fyrir |
| **FotMob `/matchDetails`** — staðfest byrjunarlið | virk, **enginn token** | **MÆLT 24.8.2026, ekki áætlað:** `lineupType` er prófsteinninn — leikinn GW1-leikur gefur **`"standard"`** með 11 byrjunarmönnum, leikur eftir 5 daga gefur **`"unavailable"`** með **0**. Aðeins `"standard"` **og nákvæmlega 11** fer í skrána; **spá má ALDREI rata í skrá sem segist bera staðfestingu** (sama regla og geymir `bsd_lineups.json` ólesna). Öll 10 GW1-leikina: `lineupType` „standard" í **10/10**, **20/20** byrjunarlið með 11 menn. Klúbbar: **20/20** leysast gegnum `teamIdOf` — **engin ný tafla**; leitað er í **deild 47 einni** (svo „Arsenal" verði ekki FC Arsenal Tula) og **báðir** klúbbar sannreyndir gegn FPL-leiknum. Leikmenn: **397/400 (99,3%)** — þrír sem eftir standa eru **rétt** ópöraðir (tveir ekki í FPL, einn stafsettur öðruvísi). **BSD-REGLAN HELDUR:** `lineups.json` fæðir AÐEINS „STARTS/BENCHED"-merkið á spjaldinu — ekkert í FFDR, `rankScore` né væntum stigum les hana, svo þetta er birtingar-heimild en ekki burðarvirki |
> **`lineups.json` SAMEINAR NÚ INNAN UMFERÐAR — HÚN ÞURRKAÐI SIG SJÁLF ÚT
> (29.8.2026).** `fetchLineups` skrifaði AÐEINS það sem var í glugganum
> þegar hún keyrði, svo hver keyrsla henti því sem sú fyrri hafði náð.
> **Mælt á commit-sögunni 29.8.** (leikdagur, fimm GW2-leikir): 13:55 →
> 4 lið / 79 leikmenn · 17:29 → **2 / 40** (fyrri leikirnir dottnir úr
> glugganum) · 19:57 → **0 / 0**. Fyrir notandann þýðir það að
> **STARTS/BENCHED-merkið hverfur nokkrum klukkustundum eftir leik** —
> gögn sem VIÐ HÖFÐUM voru urðuð. Reglan er sú sama og gildir um BSD
> (kafli 6): *tóm keyrsla má ALDREI þurrka út góð gögn*, og skrá sem er
> lykluð SAMEINAR. Hér er lykillinn **umferð**: raðir sömu umferðar
> safnast og eldri umferð dettur út um leið og sú næsta byrjar að fyllast,
> svo skráin ber í mesta lagi eina umferð. `carryLineups` er hreint fall.
> **ÞRJÁR TÓMAR LEIÐIR, EKKI EIN:** enginn API-lykill · geymt probe-svar ·
> ferskt probe — allar þrjár skrifuðu `players: []`. Fyrsta útgáfa
> varðarins prófaði aðeins þá þriðju, svo stökkbreyting á hinum tveimur
> **slapp í gegn (0 fallnar)**; hver grein sem SKRIFAR skrána hefur nú sitt
> eigið tilfelli. **Raðir dagsins voru endurheimtar úr commit-sögunni**
> (119 leikmenn, 6 lið, 3 leikir) — engin ný sókn, sama regla og
> `rebuild-odds.mjs`.

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

> **MARKAÐSLIÐURINN VAR ALDREI Í BÓKHALDINU — LAGAÐ 27.8.2026.**
> `makeFixDifficulty` tekur **töfluna** (`odds[short]`), ekki skrána:
> `App.jsx:692` skrifar `setOdds(d?.teams || null)`. `buildSnapshot` fékk
> hins vegar **skrána sjálfa** (`tryJ("odds.json")`), svo `odds["ARS"]` var
> `undefined` og markaðsliðurinn — sterkasta einstaka inntakið í FFDR —
> datt út úr bókhaldinu einu. Mælt á GW2: **19 af 20 röðum** bera aðra tölu
> og **þrepið færist líka** (def 3,05/þrep 4 → 3,27/þrep 5). Bókhaldið
> skráði því ANNAÐ LÍKAN en notandinn sá, og kvörðunin hefði mælt það —
> nákvæmlega ástæðan fyrir því að `buildTeamMetrics` var flutt úr App.jsx.
> **OG PRÓFIÐ GAT EKKI SÉÐ ÞAÐ ÞVÍ VIÐMIÐS-ÚTFÆRSLAN BAR SÖMU VILLU:**
> „bókhaldið == endurreiknað, á bitanum" sendi líka skrána, svo tvö eintök
> af sömu villu staðfestu hvort annað og kaflinn var grænn. Bæði eru
> leiðrétt; nýr kafli fullyrðir að taflan **HREYFI** töluna (≥10 raðir),
> því „odds eru send" var satt allan tímann — í röngu sniði.
> **`data/predictions/gw1.json` VAR SKRIFUÐ MEÐ VILLUNNI OG STENDUR
> ÓBREYTT.** Röð sem er til er aldrei endurskrifuð (reglan hér að neðan);
> kvörðun sem les hana á að vita að FFDR-tölur hennar bera **engan
> markaðslið**. Að „laga" hana eftir á væri retro-fitting.

> **OG GLUGGINN VAR 12 KLST — GW2 TAPAÐIST SAMT (28.8.2026).** Reglan
> „aðeins í 12 klst glugga“ byggði á því að `fetch-fast` gengur á 30 mín
> fresti og gefi ~24 tækifæri. **Mælt á raunverulegri keyrslusögu**
> (`gh run list`, 100 keyrslur, 4,8 dagar): miðgildi bils **0,79 klst**,
> p90 1,58 — **en mesta bil 12,5 klst**, og það bil lá 28.8. milli kl.
> 05:04 og 17:34, þvert yfir allan GW2-gluggann (frestur 17:30). Engin
> keyrsla snerti hann og **röðin er töpuð fyrir fullt og allt** — inntökin
> hverfa við frestinn. Þéttari cron á leikdögum breytti engu: GitHub
> sleppir skipulögðum keyrslum að vild, og **daglega keyrslan er ekki
> akkeri heldur**: hún færðist úr 05:2x í 16–17 síðustu þrjá dagana.
> **Tvennt lagað, hvorugt slakar á því sem máli skiptir:**
> **(a) fræ-gluggi 36 klst** (`WINDOW_H`) — við mesta mælda bil gefur hann
> tvö sjálfstæð tækifæri; röðin ber `lead_h` svo kvörðunin viti nákvæmlega
> hversu fersk hún var. **(b) EIN uppfærsla leyfð, strangt fyrir frest**:
> fræ sem var skrifað utan 12-klst bandsins (`NEAR_H`) má víkja fyrir betri
> mynd þegar við komumst inn í það — aldrei eftir að röð er komin innan
> bandsins, og **aldrei eftir frestinn**. Þakið er því **tvær skrifanir**
> per umferð, ekki ~40. Að skrifa betri mynd ÁÐUR en útkoman er til er
> ekki retro-fitting heldur rétt tímasetning á mælingu — sama rök og þegar
> GW1-röðin var tekin upp á nýtt 16.8.2026.
> **(c) SKRIFTAN ER NÚ KÖLLUÐ ÚR BÁÐUM VINNUSKRÁM.** Tvær ólíkar cron-skrár
> bresta ekki á sama tíma; `prediction-ledger.mjs` kafli 4b fellur ef
> annar kallandinn hverfur, því þögult hvarf sæist fyrst þegar næsta röð
> tapast.

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

### TILTEKT 31.8.2026 — HVAÐ MÁTTI FARA OG EFTIR HVAÐA REGLU

**Reglan sem greinir dautt frá vísvitandi óles­nu:** *leidd og
endurgeranleg skrá má fara — óendurheimtanleg dagleg mynd ekki.*
`history/` og `predictions/` verða ekki búnar til eftir á (kaflarnir hér
að neðan); `rotation` og `gameweek shape` voru hins vegar reiknaðar úr
`fixtures.json` og `euro_fixtures.json`, sem eru committaðar og lesnar
áfram, svo ekkert tapaðist við að taka þær út.

| tekið út | af hverju |
|---|---|
| `deriveRotation` + skráin (109 KB **í hverri keyrslu**) | Kjarninn — hvíld undir 4 dögum — var **mældur ónýtur 29.7.2026** (27,0% á móti 27,3%, n=10.448) og flaggið tekið út þá. Evrópu-nálægðin sem eftir stóð kemur úr `euro_fixtures.json`, sem appið hleður sjálft. **Enginn las skrána** |
| `deriveGameweekShape` + skráin | Auðar/tvöfaldar umferðir eru leiddar úr `fixtures.json`, sem appið hleður. **Enginn las skrána** |
| tveir merkimiðar í „Data sources" (`rotation`, `gameweek_shape`) | Merkimiði án stöðu-raðar er þögull dauður kóði — hann sýndi aldrei neitt en hefði látið næsta mann halda að heimildin væri til |
| 12 ónotaðir `React`-innflutningar + 2 aðrir | Bæði `@vitejs/plugin-react` og `tests/jsx-loader.mjs` nota **automatic** JSX-runtime, svo `import React` er dauð þyngd. `App.jsx` heldur sínum — hann notar `React.Fragment` |
| `bandEstimate` í `measure-first-start-dc.mjs` | Útflutt API án lesanda — boð um að kalla það rangt |

> **OG HVÍTLISTINN LAUG.** `wiring.mjs` hleypti báðum skránum í gegn á
> `OK_UNREAD` með ástæðunum *„lesin í GwReport gegnum breytu"* og *„lesin
> sem `rotation` (14 tilvik)"*. **Hvorug stóðst:** einu tilvikin í `src/`
> voru merkimiðinn í „Data sources"-töflunni og orðið `rotationRisk`, sem
> er annað fall. Afsökun sem hættir að vera sönn er þögul heimild — nákvæmlega
> það sem listinn á að hindra. Nýr vörður: **hver lykill í `OK_UNREAD`
> verður að vera skrá sem pipeline-an SKRIFAR ENN** (svið-afsakanir og
> sniðmát undanskilin, enda nefnir `writeJSON` þau ekki).

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
| `measure-prev-k.mjs` | ekkert (skýrsla) | **`PREV_K` endurmæld með vikmörkum** (24.8.2026) — svarar þrennu sem fyrri fittingin gerði ekki: er K=10 rétt með CI, er formið `K/(n+K)` rétt, og blandast skot á mark líka. Les committuð `data/`, engin ytri köll. **Fann að `tests/form-blend.mjs` blandaði EKKI skot á mark meðan `model.js` gerir það** — vörður sem mældi veikara líkan en það sem keyrir (lagað) |
| `measure-friendly-dc.mjs` | ekkert (skýrsla; `--json <slóð>`) | **VANTAÐI Í ÞESSA TÖFLU til 16.8.2026** — óskráð mælingaskrifta er skrifta sem enginn getur endurtekið. Sækir FotMob `/api/data/matchDetails` (sjá kafla 6) fyrir varnar-tölur úr æfingaleikjum |
| `start-panel.mjs` | ekkert (sameiginlegur hleðari) | **BYRJUNAR-LÍKANA-PANELLINN, ein útfærsla fyrir þrjár mælingar** (sama regla og `espn-zones.mjs`). Parar `fpl_player_gw.json` við FPL-`code` gegnum `players_raw.csv`; mælt **733/735 · 776/777 · 865/869 · 804/805 · 841/841** — NAFNA-pörun milli tímabila tapar þögult 10–52 raunverulegum tengingum per skil (2,4–7,5%). Geymir líka klasaða bootstrappið (400 ítranir, ákveðið RNG) |
| `measure-dc-flag.mjs` | ekkert (skýrsla; `--json <slóð>`) | **MÁ MERKJA MANN SEM „DC-LEIKMANN"?** (25.8.2026) Skilgreining notandans (hrá hittni > 0,50) mæld á `player_gw_2526.json`: golf **5 byrjanir** (1 byrjun gefur 0% eða 100%), og merkt á fyrstu 5 skilur hópana **0,441 á móti 0,168 í ÞEIM SEM EFTIR ERU — +0,273 CI [0,218, 0,334]**. Deterministísk, ~1 s. **Skjalar líka MITT EIGIÐ ranga mælitæki:** fyrsta fals-jákvæðu talan (79%) taldi tímabils-hittni 0,48 sem VILLU; sundurliðuð er hún 12 sannir · 11 á jaðri · 5 undir · **0 undir 0,25** |
| `measure-base.mjs` | ekkert (skýrsla; `--json <slóð>`) | **GRUNNURINN Í VÆNTUM STIGUM** (4.9.2026, sjá kafla 15). Les committuð `data/` gegnum `tests/lib/panel2.mjs`, engin ytri köll, ~3 mín, **deterministísk** (fast fræ 7). Ber fjóra grunna gegnum SÖMU byggingu appsins og velur eftir MAE + topp-15 með vikmörkum; prentar líka K-næmið og stöðu-forgildin sem `model.js` ber, svo talan í kóðanum sé rekjanleg til mælingar |
| `measure-opp-pens-shots.mjs` | ekkert (skýrsla; `--json <slóð>`) | **ÞRJÚ INNTÖK SEM VANTAÐI ÚR STÓRU BEIÐNINNI** (25.8.2026): meiðsli mótherjans, víti/dómari, hrá skot-talning. Öll þrjú **felld** — sjá kafla 4. Flytur inn `panel2.mjs`, `e0.mjs` og `bootstrapCI` úr `start-panel.mjs`; **engin formúla endurrituð**. Deterministísk (sannreynt með því að bera tvær heilar keyrslur saman bæti fyrir bæti) |
| `rebuild-odds.mjs` | `odds.json` | **ENDURBYGGIR MARKAÐSLÍNUNA ÚR COMMITTAÐA HRÁA SVARINU** (27.8.2026) — engin netköll, enginn kvóti. Til vegna þess að hliðið (`shouldFetchOdds`) hleypir aðeins einni sókn í hvorn glugga, svo skrá sem er skökk daginn fyrir frest hefði staðið þannig fram yfir hann. Notar SÖMU föll og sóknin (`oddsTeamsFromRaw`, `oddsFileFrom`) — ekkert endurritað. Þrír verðir í skriftunni sjálfri: tómt svar skrifar ekkert · engin pöruð félög skrifa ekkert · **færri félög en fyrir er stöðvað** (afturför er merki um bilun í umbreytingunni, ekki um þögn á markaðnum). `--dry` skrifar ekkert |
| `measure-first-start-dc.mjs` | ekkert (skýrsla; `--json <slóð>`) | **HVAÐ SEGIR EIN BYRJUN UM DEFCON?** (27.8.2026) Svarar spurningunni sem 5-byrjana gólfið í `measure-dc-flag.mjs` lokaði án þess að mæla hana: hittnin er ómæld á einni byrjun, **talningin er það ekki**. Les `player_gw_2526.json` eitt (sannreynt: `dc > 0` í 9.620 röðum 2526 og **0 í öllum fjórum eldri skrám**), flytur inn `bootstrapCI` úr `start-panel.mjs` — **engin formúla endurrituð**. Deterministísk (tvær keyrslur bornar saman, eins staf fyrir staf), ~2 s. **MÆLIKVARÐINN ER `dc`-DÁLKURINN Í ÖLLUM STÖÐUM, LÍKA HJÁ VÖRNINNI** — fyrsta útgáfan las `cbit` fyrir DEF af því að FPL skilgreinir þröskuld varnarmanna sem CBIT án endurheimta, en skráin ber BÁÐA dálka og þeir eru ekki þeir sömu (meðaltal á byrjun 7,30 á móti 5,70, jafnir í 802 af 3.150 röðum). Sú útgáfa mældi hittni **0,1546** meðan pipeline-an sjálf (`fetch.mjs`:1493) les `dc` og fær **0,2632** — talan sem kafli 12 skjalar. **Endurreiknuð skilgreining laug**, sama ætt og `buildTeamMetrics`-afritið; villan fannst við að bera nýju töluna við skjalið. Ber líka **stigin sjálf**: MID með fyrstu byrjun í DC/90 13–18 skoruðu **4,02 stig/byrjun CI [3,51, 4,52]** í síðari byrjunum á móti 3,78 hjá öllum. Niðurstaða í kafla 4 |
| `measure-tail-to-gw1.mjs` | ekkert (skýrsla) | **Halda inntök síðustu fimm umferða FYRRA tímabils fyrir GW1?** Svarið er JÁ en á RÖNGUM KVARÐA — sjá kafla 12b |
| `measure-rival-out.mjs` | ekkert (skýrsla) | Keppinautur úr leik. Fellt fyrir útileikmenn, samþykkt fyrir markmenn (kafli 4 og 12b) |
| `measure-preseason-starts.mjs` | ekkert (skýrsla; `--now`, `--covered`) | Æfingaleikja-byrjanir sem GW1-merki. **FotMob svarar sögulegum dagsetningum** (`/api/data/matches?date=20210724` o.s.frv., 200, engan token), svo þetta er EKKI aðeins framvirkt prófanlegt — mælt á fjórum sumrum. **TVÆR GILDRUR SEM ÞÖGÐU:** (a) `matches?date=` skilar STUTTUM félagsnöfnum og `matchDetails.lineup` LÖNGUM, svo uppflettingin skilaði `undefined` og `continue` — **22 af 80 lið-tímabilum fengu núll uppstillingar** og „sást í æfingaleik" mældist 26% í stað 54%; (b) **„Arsenal" hjá FotMob eru TVÖ félög** — 6 af 13 leikjum sumarið 2026 eru **FC Arsenal Tula úr rússnesku B-deildinni**. Bæði leyst með því að **festa FotMob-id** (Arsenal = 9825) og varpa heima/úti eftir STÖÐU, ekki nafni. Vörður prentar þekju per lið-tímabil og kastar ef eitthvert af 20 liðum parast ekki |
| `measure-friendly-form.mjs` | ekkert (skýrsla; `--json <slóð>`) | Sama; ber FotMob við ESPN-liðstölur. **Staðan er `UNVERIFIED`** — krossprófunin er skrifuð en hefur aldrei haft gögn, fyrst 21.8. **Vináttuleikir sem form-merki eru MÆLDIR OG FELLDIR: mínúturnar eru merkið, mörkin ekki** (skjalað í haus beggja skriftanna — ekki endurmæla) |

### TIMABILIÐ VARÐ LIFANDI 21.8.2026 — OG ÞAÐ BRAUT SJÖ SÖFN Í EINU

GW1-fresturinn leið, einn leikur var spilaður, `data/live/gw1.json` (600
raðir) varð til og `data/events.json` fékk GW1 með `is_current: true,
finished: false`. **Sjö söfn féllu samstundis** eftir að hafa verið 100%
græn — og aðeins ÞRENNT af sjö var raunveruleg bilun í appinu. Skiptingin
sjálf er lærdómurinn og hún á að vera fyrsta spurningin næst þegar regime
skiptir: **er þetta (a) staðnað forsenda, (b) raunveruleg villa sem nýja
ástandið afhjúpaði, eða (c) brotið mælitæki?**

**(b) TVEIR RAUNVERULEGIR GALLAR, BÁÐIR ÞÖGLIR:**

1. **`season_baseline.json` VAR SKRIFAÐ YFIR MEÐ NÝJA TÍMABILINU.** Gatið
   var `!events.some(ev => ev.finished)` og athugasemdin sagði „daglega
   MEÐAN engin umferð er lokin" — en **„engin umferð LOKIN" er ekki
   „tímabilið er ekki byrjað".** GW1 er `finished: false` í ~3 daga eftir
   frestinn, og FPL nullstillir uppsöfnuðu tölurnar VIÐ frestinn. Mælt:
   keyrslan kl. 23:28 skrifaði **600 raðir með max starts 1** ofan á **599
   raðir með max starts 38**. Og hún var þögul — `label` er leitt af ári
   frestarins og stóð áfram „2025/26" ofan á 2026/27-gögnum. **Eina sviðið
   sem greinir ástöndin í sundur er `starts`.** Vörðurinn sem var til
   (`gw1-checklist.mjs`) skoðaði `label` og `players.length > 400`; **báðir
   lifðu klobburinn** og prentuðu grænt tikk ofan á horfnum gögnum.
   **Tvær reglur, og sú síðari er sú sem ver:** klukkan er FYRSTI LEIKUR
   (`started || finished || finished_provisional`), og **aldrei skrifa verri
   skrá ofan á betri** — sú regla stendur þótt FPL breyti hvenær tölurnar
   nullstillast. `seasonBaselineDecision` er hreint, útflutt fall;
   `fetch-entry.mjs` kafli 5 prófar það á tilbúnum inntökum (8 tilvik,
   3 stökkbreytingar felldar) OG fullyrðir um raunskrána.
   > **SANNREYNT GEGN ÞVÍ INNTAKI SEM 05:00-KEYRSLAN FÆR, EKKI AÐEINS Á
   > TILBÚNUM GÖGNUM** (22.8.2026 kl. 01:30 UTC). Lifandi
   > `bootstrap-static` svarar **600 röðum, max starts 1, minutes 90,
   > total_points 11** — nullstillingin er raunveruleg. Gamla gatið
   > (`!events.some(ev => ev.finished)`) mælist **`true`**, svo það
   > **HEFÐI SKRIFAÐ** kl. 05:00 og klobbrað origin. Nýja ákvörðunin skilar
   > `write: false`; og með klukkuna fjarlægða stöðvar afturfarar-vörnin það
   > **sjálfstætt** („max starts 38 against 1"). Bæði netin taka það, og
   > hvorugt er óþarft.
   > **OG FYRSTA ÞURR-KEYRSLAN MÍN VAR MÆLD MEÐ RÖNGU INNTAKI:** hún las
   > committaða `data/players.json`, sem er sjálf frá **05:28 í gær — FYRIR**
   > nullstillinguna (hún er skrifuð af DAGLEGU keyrslunni, ekki þeirri
   > hröðu), og gaf því „candidate max starts 38". Það las eins og mælingin
   > hér að ofan væri ósönn, og ég var nærri því að „leiðrétta" rétt skjal.
   > Sami lærdómur og allt annað þessa nótt: **athugaðu hvort mælitækið sé
   > að mæla það sem þú heldur** — og hér var gildran að tvær skrár í sama
   > `data/` bera SITTHVORN aldur.
2. **`matchImminent` flettist upp með NAFNA-SKORUN SKORÐAÐRI VIÐ LIÐ.**
   Sjá kafla 3: sú villa er skjöluð sem LEYST, og `code`-lausnin var sett í
   pipeline-una og í spá-bókhaldið — **en aldrei í les-leið appsins.** Mælt
   21.8.: `Konsa: AVL != ARS`. Orsökin er **cadence-ósamhverfa sem er
   byggingarleg:** `imminent.json` er skrifuð af DAGLEGU keyrslunni (05 UTC)
   meðan `players.json` er endurnýjuð á **30 mín fresti**, svo hver
   félagaskipti gera liðið úrelt í allt að **24 klst** — og á hverri þeirri
   klukkustund fellur uppflettingin og maðurinn sleppur gegnum
   `MIN_START_PROB`. Nú er `code` join-lykillinn (`IMM_BY_CODE`, Symbol svo
   allir fimm lesendur `by[teamShort]` séu óbreyttir). Nafna-skorunin er
   varaleið fyrir raðir án `code`.
   > **OG VÖRÐURINN VARÐI RANGA STÆRÐ.** Hann fullyrti að `imminent.json`
   > BERI lið dagsins — sem er óhaldanlegt með byggingu og flakkar með
   > cron. Rétta fullyrðingin er **finnanleiki, ekki ferskleiki**: hver
   > maður í deildinni í dag verður að finnast gegnum `matchImminent`,
   > óháð því hvaða lið röðin skráði. Decíderandi tilfellið er **tilbúið**
   > (`rotation.mjs` kafli 8b), því lifandi tilfellið hverfur við næstu
   > dagskeyrslu og kaflinn hefði þagnað án þess að neitt segði frá.

**(c) TVÖ BROTIN MÆLITÆKI, BÆÐI Í `data-resilience.mjs` — „eina sem sér
hvítan skjá":**

- **FASTUR BIÐTÍMI ER EKKI MÆLING Á ÞVÍ AÐ TEIKNINGU SÉ LOKIÐ.** 80 ms var
  kvarðað á forleiks-gagnamagni; með `live/gw1.json` (409 KB) næst Teams
  ekki að teikna og **MIÐJA teikningin** mældist — 93 stafir, svo safnið
  sagði „spjaldið nánast tómt" í **öllum 21** atburðarásum. Sjálfstæð
  mæling á sama flipa: **2.275 stafir af raunverulegum liðstölum.** Nú er
  beðið þangað til textinn hættir að vaxa (`settleOn`), sem er óháð
  gagnamagni.
- **„STÆRSTA HYLKI SEM BER EKKI HEITI ANNARRA FLIPA" GETUR EKKI FUNDIÐ
  SPJALD SEM NEFNIR ANNAN FLIPA.** Teams-spjaldið ber `"Gameweeks"`
  (`Teams.jsx:376`), sem inniheldur `"Gameweek"`. Mælt: heuristíkin gefur
  **998**, rétt mæling **2.185** — 54% horfið, og talan hefði líka getað
  falið tómt spjald. **Þriðja aðferðin er LEIDD, ekki valin:** skelin er
  per skilgreiningu það sem er EINS á öllum flipum, svo hún er langsti
  sameiginlegi forskeytis- og viðskeytis-hluti bolanna sex. Tvær aðferðir
  sem voru mældar og felldar gáfu tómum flipa **1.002** og **929** stafi
  (skelin var inni í tölunni); sú þriðja gefur **0**. Mælt yfir 21×6:
  lægsta HEILBRIGÐA spjaldið er **591** (Gameweek án `last_gw.json`), svo
  golfið 400 liggur undir öllu heilbrigðu og óendanlega yfir tómu.
  > **TVÆR ÓHÁÐAR ÚTFÆRSLUR GÁFU SÖMU TÖLURNAR UPP Á STAF** (591, 1179,
  > 2666, 3451, 1096 í skel) — það er sterkari sönnun en hvor um sig.
- **OG GATIÐ SEM MÆLINGIN OPNAÐI VAR LOKAÐ:** ekkert batt spjald við
  IDENTITET flipans, svo hver flipi mátti teikna spjald ANNARS flipa og
  safnið haldist grænt. Akkerið er mælt: hvert spjald nefnir sig í sinni
  eigin yfirskrift (21×6). **Hnappa-textinn er ónýtt akkeri** — spjaldið
  heitir ekki það sama sem hnappurinn í tveimur tilvikum af sex
  („Player stats" -> `Players`, „Gameweek" -> `The gameweek`), svo gamla
  eigið-nafn-prófið hefði verið **mælt ósannur** á spjaldinu.

### `scripts/fetch.mjs` ER NÚ INNFLYTJANLEG — `main()` ER SKILYRT (21.8.2026)

`main()` var kallað **óskilyrt** í botni skrárinnar, svo **hver innflutningur
keyrði alla pipeline-una**: öll netköllin, allan kvótann, og skrif í `data/`.
Afleiðingin var ekki óheppileg heldur **bindandi**: hvert hreint fall inni í
3.400 línunum var óprófanlegt nema með því að **lesa textann og byggja það upp
aftur** í `new Function` (`tests/elo-fetch.mjs:25`) — og sú leið prófar
**afrit**, ekki kóðann sem keyrir, sem er nákvæmlega gildran í kafla 5b.

Nú er kallið `if (invokedDirectly) main()`, þar sem `invokedDirectly` ber
`realpathSync` á **báðum** megin (`import.meta.url` gegn `process.argv[1]`) svo
symlinkuð eða afstæð slóð þaggi hana ekki.

> **VÖRÐURINN SJÁLFUR ER VARÐAÐUR, OG ÞAÐ ER EKKI SKRAUT.** Væri skilyrðið
> rangt myndi pipeline-an **þegja**: ljúka á sekúndubroti með útgangsstöðu **0**
> og engum skrifum. Græn keyrsla sem gerir ekkert er verri útkoma en hrun — það
> er engin rauð röð til að taka eftir og `data/` frystist á þeim degi. Og
> **texta-leit gæti ekki fellt það**: athugasemdin við vörðinn nefnir sjálf
> `main()` og `invokedDirectly` (kafli 5b — athugasemd sem uppfyllir
> fullyrðinguna). `tests/fetch-entry.mjs` keyrir því **raunverulegt afrit** af
> skránni í nýju ferli, **báðar leiðir**: beint (á að kalla) og innflutt (á EKKI
> að kalla), með `main()` skipt út fyrir eina prentun svo engin netköll og engin
> skrif verði. Kaflinn les líka `.github/workflows/*.yml` og fellur ef þau hætta
> að kalla hana beint. **Tvær stökkbreytingar felldar:** óskilyrt `main()`
> (3 fullyrðingar) og skilyrði fast á `false` (1 — einmitt þögla tilfellið).

**Fyrsta notkunin:** BSD-gluggarnir. `bsd_lineups` og `bsd_odds` báru nótur sem
voru **niðurstöður sem skriftan dró af sinni eigin síu** („no matches within
24h"), byggðar á staðnum inni í netföllunum og því óprófanlegar án BSD-lykils.
**Mælt 21.8.2026 kl. 22:49 UTC: níu óleiknir GW1-leikir stóðu í `fixtures.json`,
sá næsti eftir 12,7 klst, og báðar nóturnar sögðu samt „ekkert í glugganum".**
Tóm svarröð (rangt tímabils-id, eða BSD hefur leikina ekki) og full svarröð
(allt í lagi, glugginn bara ekki opinn) hafa **andstæða orsök og andstæða
lagfæringu** — og nótan lagði þær í sama flokk. Nóturnar eru nú útfluttu, hreinu
föllin `bsdLineupNote`/`bsdOddsNote`, prófuð á tilbúnum inntökum þar sem svarið
er þekkt fyrirfram; prófsteinninn er **ekki orðalagið** heldur að ástöndin gefi
**sitthvora** nótu (`bsd-pipeline.mjs` kafli 9).

### HLIÐIÐ FYRIR COMMIT — SKRIFAÐ 25.8., TENGT 31.8.2026

`scripts/validate-data.mjs` hafnar commit-i (`exit 1`) þegar snapshot er
skemmt: ógilt JSON, `teams.json` sem er ekki 20 félög, og **afturför í
null** (svið sem fór úr N í 0 eða hvarf). Hún var skrifuð 25.8.2026 og
**tengd engu** — hvorki vinnuskrám, `package.json` né prófum.

**ÞAÐ VAR EKKI FRÆÐILEGT.** Nákvæmlega sú bilun sem hún er til fyrir
slapp í gegn 29.8.2026: `lineups.json` fór úr 40 leikmönnum í 0 og var
committuð. Endurspilað á commit-sögunni hafnar reglan þeirri breytingu
orðrétt — `players: 40 -> 0`, `teams: 2 -> 0`, `sources` HVARF. *Vörður
sem keyrir ekki er ekki vörður* (kafli 5), og hér kostaði það gögn.

Hliðið keyrir nú í **báðum** vinnuskrám, **á undan** commit-skrefinu og
**án `continue-on-error`** — það er munurinn á því og spá-bókhaldinu:
bókhaldið er mælitæki og má ekki fella keyrsluna, en þetta hlið ER
tilgangurinn. Appið les `data/` beint af raw.githubusercontent, svo
skemmd skrá fer óleiðrétt í vafra notandans.

Tvennt fylgdi með: **undirmöppurnar eru nú þáttaðar** (`live/`,
`predictions/`, `history/`, `odds_raw/`, `fdcouk/` — 64 skrár til
viðbótar; hausinn á skriftunni nefndi sjálfur að trunkuð `live/gw1.json`
slyppi í gegn), og **skriftan er `invokedDirectly`-hliðuð** eins og
`fetch.mjs`, því innflutningur keyrði allt hliðið og kallaði
`process.exit()` — prófið komst ekki að fyrstu fullyrðingu sinni.
Vörður: `tests/validate-data.mjs` (25 fullyrðingar, fjórar
stökkbreytingar felldar; reglan sjálf er hreint fall, `regressions`).

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

- **APPIÐ OPNAR Á UMFERÐINNI SEM ER VERIÐ AÐ SKIPULEGGJA, EKKI Á `is_current`**
  (27.8.2026). FPL heldur `is_current` á umferðinni **þangað til næsti frestur
  líður**, svo frá síðasta flauti og fram að næsta fresti — þrír til fjórir
  dagar af hverri viku, nákvæmlega þeir dagar sem skipti eru gerð — opnaðist
  skipuleggjarinn á umferð sem **var búin**. Mælt 27.8.2026: allir tíu
  GW1-leikirnir `finished_provisional`, GW2-fresturinn eftir ~21 klst, og
  `gw` samt 1 — svo **vænt stig á öllum 616 spjöldunum** voru reiknuð úr leik
  sem var þegar spilaður (Sangaré 2,12 gegn Tottenham í stað 1,92 að Leeds).
  Reglan er `planningGw` (`availability.js`) og hún les **LEIKINA**
  (`fixturePlayed`), ekki `finished` á umferðinni — það svið flettist ~3 dögum
  of seint (kafli 1). Þrjú skilyrði sem hún verður að virða: **umferð í gangi
  er enn umferðin manns** · **tóm leikjaskrá ákveður ekkert** (`[].every` er
  `true`, sem er hol fullyrðing í skilningi 5b) · **GW38 á sig sjálf**.
  · **OG LIÐIÐ ER SÓTT FYRIR AÐRA UMFERÐ EN ÞÁ SEM ER OPIN.** FPL birtir
    `picks` fyrst eftir frest, svo GW2-sókn hefði skilað 404 og **tengda liðið
    horfið af vellinum** einmitt þessa þrjá daga. `latestStartedGw` sækir liðið;
    **stig umferðarinnar og refsingin í henni** eru hins vegar UM umferðina og
    eru núllstillt þegar sótta umferðin er önnur — samtala undir röngum haus er
    sama ætt og xGC-dálkarnir í Teams (kafli 3).
  · **OG UMFERÐ Í GANGI ER ÞRIÐJA ÁSTANDIÐ — ÞAÐ VANTAÐI** (28.8.2026).
    Undirtextinn á Gameweek-hólfinu var `evPlayed ? "finished" : "not
    started"`. Athugasemdin í `App.jsx` sagði það sjálf — *„umferð í GANGI
    er `is_current` en er ekki spiluð, og `finished` á henni væri jafn
    rangt og `not started` er í dag"* — en tvígilda skilyrðið gaf henni
    samt „not started". Mælt 28.8.2026 kl. 21:25 UTC: fresturinn leið kl.
    17:30, **einn af tíu leikjum búinn**, og hólfið sagði **„Gameweek 2 —
    not started"**. Ástandið er nú leitt af LEIKJUNUM (`started`,
    `fixturePlayed`, kickoff sem er liðinn) og ber töluna með sér
    („in progress · 1/10 played"); **engin leikjaskrá -> ENGIN fullyrðing**
    (`null`), ekki „not started". `ev.finished` vinnur áfram yfir öllu —
    staðfest umferð er staðfest. Vörður: `planner-pitch.mjs` kafli E9,
    þrjú tilbúin ástönd + mótpróf á `ev.finished`; tvígilda skilyrðið
    fellir fjórar fullyrðingar.

  · **FIMM PRÓFASÖFN FÉLLU VIÐ ÞETTA OG EKKERT ÞEIRRA VEGNA VILLU Í APPINU.**
    Þau sögðu aldrei hvaða umferð þau meintu — þau erfðu sjálfgildið. Reglan
    sem leiðir af því: **próf sem er UM eina umferð á að VELJA hana**
    (`tests/lib/select-gw.mjs`, akkerið er `title` á tímalínu-hnútnum því
    textinn er berr tölustafur). `gw1-persistence` leitaði meira að segja að
    hólfinu `"📅Gameweek 1"` — orðalag, ekki hegðun (kafli 5).


- **LEIKMANNANAFN Í `data/` ER `web_name`, Á BÁÐUM LEIÐUM.** Fundið 20.8.2026:
  `last_gw.json` hefur **tvo** byggjendur — lifandi (`p.web_name`) og
  archive-leiðina úr vaastav-speglinum, sem skrifaði `r.name` = **fullt
  lagalegt nafn**. Mælt á skránni: lengsta nafnið **55 stafir** („João Maria
  Lobo Alves Palhares Costa Palhinha Gonçalves") og fjögur önnur yfir 32; þau
  eru birt í `XiCard` („Team of the week"), spjaldaröð með fastri breidd, svo
  þau **klipptust** — og verra: merkingin hefði breyst undir manni 21. ágúst
  þegar lifandi leiðin tekur yfir. **Sama svið má ekki þýða sitthvað eftir því
  hvort tímabilið er byrjað.** Leyst með **uppflettingu, ekki styttingarreglu**:
  `players_raw.csv` sama tímabils parar `element` við `web_name`, svo vörpunin
  er nákvæm. Styttingar-heuristikin er **mæld röng** — „síðasta orðið" gefur
  `Gonçalves`, sem er rétt stytting á röngu nafni. Vörður:
  `archive-gw-report.mjs` kaflar 4 og 4b; 4b krefst þess að skýrslan LIFI þótt
  `players_raw` svari 404, því lagfæringin bætti við HTTP-kalli inni í henni.
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

### BEIÐNIR 31.8.2026 — FFDR4, STILLANLEG SÍA, OG FFDR SEM BYRJAR Á RÉTTUM STAÐ

**`FFDR4` í Basics** (`stats.js`): meðal-FFDR yfir **næstu fjóra ÓLEIKNU
LEIKI** félagsins. GK+DEF fá varnar-töluna (pos 2), MID+FWD sóknar-töluna
(pos 4) — sama skipting og spjöldin og `expPointsFor` nota, svo **engin ný
regla verður til**. Talið er í LEIKJUM: tvöföld umferð leggur til tvo, auð
umferð ekkert (`_fdr6` við hliðina telur UMFERÐIR og svarar annarri
spurningu). `fixDifficulty` er **send inn** í `makeEnricher` frá
`PlayerList` — hún er þegar smíðuð einu sinni í `App.jsx` og önnur smíði
væri annað líkan undir sama nafni (sama rök og `buildTeamMetrics`).
Mælt á lifandi gögnum: DEF og MID fá **ólíka tölu í 20 af 20 félögum** —
væri það 0 væri skiptingin marklaus. Vörður:
`tests/ffdr4-and-filter-step.mjs`.

**Síur eru stillanlegar á staðnum**: hvert þröskulds-chip ber nú `−`/`+`.
**Skrefið er LEITT AF DÁLKINUM, ekki valið**: `dec` segir hversu marga
aukastafi hann birtir, svo heiltöludálkur færist um 1 og tveggja-aukastafa
dálkur um 0,01 — föst tala væri röng í annan hvorn endann (1 er gagnslaust
á xG/90, 0,01 á mínútum). Prósentu-dálkar færast um 0,01 því `fmtStat`
margfaldar sjálft með 100. Stökkbreyting sem neglir skrefið í 1 fellur.

**FFDR-taflan byrjar á fyrstu ÓLEIKNU umferð** (`firstOpenGw`, leitt af
`fixturePlayed` á leikjunum — ekki `is_current`, ekki `finished` á
umferðinni). Þetta er **sjálfgildi, ekki hindrun**: „pick" og „−" ná áfram
yfir liðnar umferðir. Vörður í `ffdr-table.mjs` ber saman við leikjaskrána
sjálfa, svo hann segir ekki „GW3" heldur „fyrsta umferð sem á óleikinn
leik" — og fyrsta útgáfa hans sneri `ok(nafn, skilyrði)` við, svo allar
þrjár fullyrðingarnar voru holar (prentuðu nöfnin voru „false, false,
true"); það sást vegna þess að stökkbreytingin felldi þær ekki.

> **OG NÓTAN Á VÆNTUM STIGUM LOFAÐI LIÐ SEM ER EKKI Í TÖLUNNI.** Hún sagði
> *„Expected points this gameweek (minutes + FFDR + form)"*. **Mínútur eru
> hvergi í `expPointsFor`** — margfeldi við byrjunar-líkur var mælt og
> hafnað 20.8.2026 (kafli 4) — og *„form"* er ekki okkar liður heldur
> **grunnurinn frá FPL**: mælt 31.8.2026 er `ep_next` nákvæmlega jafnt
> `form` hjá **94,2%** þeirra sem hafa spilað og `points_per_game` hjá
> **71,7%**. Þess vegna „spáir" appið Sangaré ~10 stigum í GW3: hann fékk
> 18 stig í tveimur byrjunum, FPL setur `ep_next` í 9,0 og okkar
> FFDR-margfaldari færir hann í ~10. **Nótan nefnir enga prósentu** — hún
> segir mekanismann, sem stendur þótt FPL skipti yfir í eigið líkan.
> Þetta er sama niðurstaða og stóra stigalíkans-mælingin 25.8.2026:
> **gatið er í grunninum**, og eina opna leiðin að því er spá-bókhaldið
> frá ~GW6.

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
| `/fixtures/lineups` staðfest byrjunarlið | **EKKI LENGUR BLOKKAÐ** — FotMob tók við 24.8.2026 (sjá kafla 6); API-Sports-leiðin stendur óbreytt ef aðgangur opnast | pörun við skammstöfuð nöfn hjá API-Sports, **full nöfn** hjá FotMob (þrep 4 í `apiNameIndex`) |
| „í ár vs. í fyrra"-taflan | byggð og villuvarin, hefur **aldrei keyrt** | birtist hún rétt? |
| `fdcouk_e0` 2026/27 | CSV verður til við fyrsta leik | **EKKI „404 → 200" — það merki er ekki til, og HTTP-staðan er ÞRÍBREYTT.** Sama ástand („PL-skráin er ekki til enn") hefur svarað á þrjá vegu á þremur vikum: **404** upphaflega · **301** 14.8. yfir á `EC.csv` (utandeild, og `fetch` fylgir því þegjandi svo það kemur inn sem 200 með röngum gögnum) · **300** 20.8. „Multiple Choices" frá Apache mod_speling, sem `fetch` fylgir EKKI, svo heimildin varð rauð með engu nema tölunni. 300 og 404 eru nú bæði „bíður tímabils" (mælt: 300-svarið segir orðrétt „could not be found on this server" og mod_speling kviknar aðeins þegar slóðin finnst ekki), en **prófsteinninn er áfram `Div === "E0"`, ekki HTTP-staðan** — hann er sá eini sem tekur 301-tilfellið. Vörður: `fdcouk-e0.mjs` kaflar 4b/4c, þar sem 4c krefst þess að 500/403/429 KASTI, því „bíður" er græn heimild og víkkað skilyrði myndi fela raunverulega bilun |
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

### DefCon — þrennt sem var rangt, allt lagað 17.8.2026

> **MARKMENN FÁ ENGIN DEFCON-STIG — MÆLT, EKKI ÁLYKTAÐ.** `player_gw_2526.json`:
> **757 leikja-umferðir, 750 byrjanir, NÚLL stig, hámark 0** — á móti DEF 6,24
> að meðaltali (hámark 27), MID 5,75 (29), FWD 2,86 (21). Dálkarnir fimm bera
> `pos:[2,3,4]`, og **báðir smiðirnir sleppa þeim núna**.

1. **Nefnarinn voru LEIKIR, ekki BYRJANIR** þótt báðar nóturnar segðu „starts".
   Gáttin var `if (mins <= 0) continue`, svo hver innkoma af bekknum — þar sem
   10/12-þröskuldurinn er **ónæðanlegur** á 15 mínútum — taldist sem **miss**.
   Mælt: útileikmenn **0,1361 á leiki en 0,1907 á byrjanir (+40%)**; DEF
   0,2134 → 0,2632, MID 0,1133 → 0,1675, FWD 0,0078 → 0,0134. **Skekkjan kom
   tvisvar við:** `p0` er reiknað úr sömu summum, svo aðlagaða talan dró alla
   að meðaltali sem var sjálft vanmetið. Raðir 537 → 435 (40 markmenn +
   ~62 sem byrjuðu aldrei og fá nú **enga röð** í stað 0%).
2. **Lifandi smiðurinn hefði byrjað að gefa markmönnum DefCon 21. ágúst.**
   Hann reiknar mælikvarðann sjálfur og sendi þá í `cbirt`-greinina, sem hjá
   markmanni er drifin af **endurheimtum** — að grípa boltann (Roefs 333,
   Raya 304). Hermt með nákvæmlega þeirri formúlu: **211 af 757 umferðum
   (27,9%)** ná þröskuldinum. Sást ekki því `defcon.json.players` er tóm í
   forleik. Þröskuldarnir tveir voru auk þess ósammála um markmenn
   (`POS_THRESH.GK = 10` en `pos === 2 ? 10 : 12` gaf þeim 12) — merki um að
   GK-tilfellið hefði aldrei verið ákveðið. `DC_P0_FALLBACK`-færslurnar fyrir
   GK voru **fjarlægðar**: tilbúið 2% forgildi má ekki liggja í leyni.
3. **`cbit_per_90` / `cbirt_per_90` voru per BYRJUN, ekki per 90.** Reiknað
   var `total / starts`, svo talan var hærri hjá þeim sem spilar 90 mín en
   þeim sem er skipt af eftir 60 — þótt hún heiti per 90.

> **TVÆR TÓMAR FULLYRÐINGAR FUNDUST VIÐ AÐ VERJA ÞETTA, OG BÁÐAR VORU MÍNAR.**
> (a) Fyrsta útgáfa lagfæringarinnar bjó til `agg[id]` **á undan** byrjana-
> hliðinu og hljóp svo `continue`, svo leikmaður sem byrjaði aldrei sat eftir
> með `starts: 0, hit_rate: 0` — nákvæmlega tilbúna nulltalan sem verið var að
> laga. Prófið fann það. (b) Vörðurinn á per-90 var `/a\.mins/.test(body)`,
> sem stenst áfram vegna `a.mins += minutes` í söfnuninni; stökkbreytingin
> slapp í gegn (**0 fallnar**). Hann mælir nú **töluna sjálfa**, og til þess
> þarf leikmann sem **byrjar en er skipt af** — annars eru mínútur nákvæmlega
> 90 per byrjun og báðar formúlur gefa sömu tölu (72/540×90 = 12 = 72/6).
> **Fullyrðing sem getur ekki greint tvær formúlur í sundur mælir hvoruga.**
> Verðir: `defcon-shrink.mjs` kafli 6 (29 fullyrðingar, þrjár stökkbreytingar
> staðfestar).


---

## 13. TVÆR REGLUR ÚR ANDSTÆÐU-PRÓFUN (18.8.2026)

**SJÁLFGILDI Í FALLI VER AÐEINS `undefined`, EKKI `null`.**
`function f(xs = [])` gerir ekkert þegar kallandinn sendir `null` — og
React-state sem bíður eftir neti er `null`, ekki `undefined`. `priceFloors`
kastaði þess vegna `TypeError` í hverri teikningu hjá hverjum notanda sem
hafði planað eitthvað, og af því að `ErrorBoundary` liggur utan um allt appið
var **eina útgangan sú að eyða öllu liðinu**. Mælt: 0–1 ms töf á sókn
teiknast, **5 ms og upp úr hrynur** — enginn vafri nær GitHub raw undir 5 ms.
Notaðu `Array.isArray(...)` þegar inntakið kemur úr state.

> **OG HVORUGT ÞOLPRÓFA-SAFNIÐ GAT SÉÐ ÞETTA.** `data-resilience.mjs` skrifar
> aldrei `fpl_planner_v3`; `untrusted-input.mjs` gefur heilbrigð gagnaskrár.
> Villa sem þarf **vistað ástand OG hæga sókn í einu** bjó nákvæmlega í bilinu
> á milli þeirra. Nýr kóði sem les hvort tveggja á að prófast á báðum ásum.

**`||` BINDUR FASTAR EN `?:` — OG ÞANNIG VERÐUR FULLYRÐING AÐ TAUTÓLÓGÍU.**
`ok(A || B || C ? true : x <= 6, "...")` er `(A||B||C) ? true : ...`, svo hún
getur aðeins fallið á `x > 6` — í prófi þar sem `x` getur ekki farið yfir 6.
Sömu lotu bættust við fjórar aðrar fullyrðingar sem gátu ekki fallið:
textaleit sem **athugasemd uppfyllti** (`//` var ekki strippað), einkvæmni sem
**aftanliggjandi bil** slapp gegnum, `>= 20` gólf á **22** dálkum, og 400-stafa
gluggi sem var 22 stöfum frá tómi. Sjá `docs/MAELINGAR.md` 18.8.2026.

> **PRÓFAÐU FULLYRÐINGUNA, EKKI BARA KÓÐANN:** stökkbreyttu því sem hún segist
> verja og gakktu úr skugga um að hún FALLI. Fullyrðing sem stenst
> stökkbreytinguna sem hún heitir eftir er verri en engin, því hún lítur út
> eins og þekja.

---

## 14. ENDURSTILLING OG TENGDA LIDID (4.9.2026)

### ThRIR HNAPPAR, ThRJAER SPURNINGAR

Notandinn: *„baettu vid rest gameweeks transfers i fantasy plannerinn, svo eg
geti verid buinn ad gera breytingar og testad og svo haett vid og byrjad upp a
nytt bara a theirri gameweek"* og sidan *„eg vill sem sagt getad resetad a
standard lidid eins og thad er stadfest fra official sidunni."*

| hnappur | hvad fer | hvad stendur |
|---|---|---|
| `↺ transfers` (per umferd) | skiptin i ÞEIRRI umferd | uppstilling, fyrirlidi, chip **og allar adrar umferdir** |
| `↺ reset GW{n}` | allt i theirri umferd | adrar umferdir |
| `↺ my FPL team` (haus, adeins tengt) | oll plonun **og fyrirlidinn** | upphafslidid (GW1-radirnar) |

**HVORUGUR PER-UMFERDAR HNAPPURINN SNERTIR UPPHAFSLIDID — OG SA GAMLI GERDI
ThAD.** `resetAll` var lagfaert 20.8.2026 (`isInitialSquadPick`) en
per-umferdar hnappurinn sio afram `t.gw !== g`, svo **„↺ reset GW1" henti
hopnum hans**. Maelt i jsdom adur en nokkru var breytt: fjorar GW1-radir ->
null, medan vollurinn syndi AFRAM 15 spjold thvi hann fellur a `START_SQUAD` —
notandinn hefdi fengid sjalfgefid lid sem hann valdi aldrei, **thegjandi**.
Merkimidinn laug lika: hann taldi upphafs-radirnar sem „3 transfers". Nu
liggur sian i **einu falli** (`clearableIn`) sem badir hnapparnir kalla.

**`↺ my FPL team` ER EKKI `resetAll` UNDIR ODRU NAFNI, OG MUNURINN ER EITT
SVID: FYRIRLIDINN.** `resetAll` snertir hvorki `captain` ne `vice`, svo eftir
hann situr fyrirlidi sem notandinn valdi ofan a opinberum hopi — mynd sem er
hvorki hans plonun ne opinbera lidid. `squadOverride` (hopurinn OG rodin) er
adeins skrifud af sokninni og er thvi opinber i sjalfu ser; **opinberi
fyrirlidinn var hins vegar horfinn um leid og notandinn smellti**, thvi
sokningin setur hann i `captain` sem er sidan breytt. Hann er nu geymdur
adskilinn (`official = {gw, cap, vice}`).

**HNAPPURINN FLUTTIST UR PLONUNAR-SPJALDINU I HAUSINN, OG ThAD ER MAELT VAL.**
I spjaldinu var hann gatadur a `planMoves.length > 0`, svo hann var
**osynilegur** thegar frabrigdid var uppstilling eda chip AN skipta — og
skilyrdid „ekkert frabrugdid" var **onaanlegt**, thvi spjaldid sjalft hverfur
tha. Vordurinn gat thvi hvorki fallid ne fundid gatid: **fullyrding sem stenst
af thvi ad astandid er onaanlegt er tom fullyrding** (kafli 5b). Sama lota
felldi tvo adrar toma nagranna i profinu sjalfu — „hnappurinn er ekki their"
er SONN i hruninu lika, svo hun tharf nagranna sem sannar ad rodin se a lifi.

Vordur: `initial-squad.mjs` kaflar R og S. **Fimm stokkbreytingar felldar**
(gamla eydingin · gamli merkimidinn · skipta-hnappurinn sem sami hnappur ·
fyrirlidinn otalinn · fyrirlidinn ekki endurheimtur). Kafli S ber fyrirlidann
**gegnum vidmotid** (i-hnappurinn -> „Captain") thvi sokning yfirskrifar
`captain`, svo vistad frabrigdi gaeti aldrei lifad raesingu af.

### NUL-BAETI I `tests/initial-squad.mjs` — GREP SA SKRANA SEM TVIUNDARSKRA (4.9.2026)

`BENCH_RGB = … : "\0none"` (eitt NUL-baeti inni i streng) gerdi `file` ad
segja **„data"** og `grep` ad medhondla skrana sem tviundarskra: `grep -n` a
henni skilar **engu**, thogult. JS thattadi hana afram og **413 fullyrdingar
voru graenar** — svo villan var osynileg bædi keyrslunni og leitinni.
Ekkert annad i repo-inu bar NUL-baeti (skannad). Ath: **hver text-leit sem
sveimar yfir `tests/` — thar med talin handvirk leit ad tomum fullyrdingum —
slepptu thessari skra thegjandi** medan baetid var inni.

---

## 15. GRUNNURINN I VAENTUM STIGUM — `ep_next` VAR EKKI SPA (4.9.2026)

Notandinn: *„eg vill lika gera projected points betri, thad er ekkert ad marka
thau."* Kaeran var rett og orsokin er maeld.

**`ep_next` ER FORM, EKKI SPA.** Maelt a lifandi `players.json` 31.8.2026:
`ep_next` er **nakvaemlega jafnt `form` hja 94,2%** theirra sem hafa spilad og
`points_per_game` hja 71,7%. Eftir tvaer umferdir er thad tveggja-leikja
medaltal — Sangare bar 9,0 af thvi einu ad hann skoradi vel tvisvar, og
FFDR-margfaldarinn faerdi hann i ~10. **Bygging appsins var alltaf i lagi
(sja stora stigalikans-beidnina 25.8.2026, sex tilgatur felldar); ThAD SEM
ENGINN HAFDI PROFAD VAR GRUNNURINN SJALFUR.**

`scripts/measure-base.mjs` — 134.711 leikmanna-umferdir, 5 timabil, blonk
medtalin, GW1 utan (engin innan-timabils saga). Hver frambjodandi fer gegnum
**somu byggingu** (`grunnur x FFDR-margfaldari`), svo thad er grunnurinn einn
sem er borinn saman. Vidmidid er `ppg5` — stadgengill `ep_next` i sogunni, thvi
FPL-eigid `xP` er reiknad EFTIR A og ma ekki vera vidmid
(`tests/xp-contaminated.mjs`).

| grunnur | r | MAE | topp-15 |
|---|---|---|---|
| `ppg5` (thad sem appid gerdi) | 0,4918 | 1,0756 | 4,293 |
| `ppgAll` | 0,4961 | 1,0924 | 4,404 |
| `shrunk` (skrumpud stig/leik) | **0,5036** | 1,1366 | **4,535** |
| **`shrunkMin`** (skrumpud stig/90 x vaentar minutur) | 0,4975 | **1,0243** | 4,433 |

**VALID ER A MAELIKVARDANUM SEM SPURNINGIN SNYST UM.** `shrunk` raðar best en er
**verri a MAE i ollum thremur bilum** — og MAE er nakvaemlega „er talan
truverdug", sem var kaeran. `shrunkMin` vinnur MAE alls stadar
(**d MAE −0,0513 CI [−0,0615, −0,0361]**, utilokar null) og **tapar hvergi**.

**Í GW1-5 — thar sem sarsaukinn er — vinnur hann BADAR attir:**
**d topp-15 +0,530 CI [+0,040, +0,976]** og **d MAE −0,1191 CI [−0,1478,
−0,0886]**, badar utiloka null.

**K = 3 ER MAELT:** LOSO valdi 3 i fjorum timabilum af fimm og ristin er flot
(topp-15 4,449 · 4,461 · **4,504** · 4,489 · 4,484 fyrir K = 1 · 2 · 3 · 5 · 8).
K = 0 er urkynjad. Stodu-forgildin eru medalstig per rod, maeld a somu 5
timabilum, LOSO-sveifla **±0,03** — thess vegna dugar **ein** tala per stodu.

**HVENAER `ep_next` HELDUR SER** (og thad er regla, ekki varud): adur en
timabilid byrjar, thvi tha bera `minutes`/`total_points` tolur **fyrra**
timabils (sami klobbur og `season_baseline` bar, kafli 7.1); og thegar `mins5`
vantar — **„faar maelingar -> ENGIN tala"**.

**SKILYRDID BYR I `pointsBase`, EKKI I KALLANDANUM.** Fyrsta utgafan gataði
klukkuna i `App.jsx` og vordurinn var **textaleit** — sem stodst afram thegar
skilyrdid var fjarlaegt, thvi `seasonStarted` stod eftir i deps-fylkinu tveimur
linum nedar. **Stokkbreytingin slapp i gegn.** Fullyrding sem stenst
stokkbreytinguna sem hun heitir eftir er verri en engin (kafli 13).

**OG `rotation.js` FEKK HANN LIKA.** Hun reiknar sin eigin vaentu stig; hefdi
hun setid eftir baeri rotering `ep_next` medan vollurinn baeri maelda toluna —
**tvaer tolur undir sama heiti**. Sama astaeda og `bsdLive`-tengingin (kafli 3).
Chip-tolurnar (`bestteam.js`, `captain.js`) taka skorid **adflutt** fra appinu
og fylgdu thvi sjalfkrafa.

**`Number(null)` ER 0 OG ThAD ER EKKI VANTANDI TALA.** Fyrsta utgafa
`pointsBase` notadi `Number(...)` og hleypti `null`/`undefined`/`""` i gegn sem
nulli. Utkoman a skjanum var rett (grunnur 0 fellur hvort ed er a `ep_next`) en
**samningur fallsins var rangur**, og naesti kallandi hefdi treyst honum. Sama
regla og „NULL ER EKKI NULL" (kafli 8), her i talnabreytunni sjalfri.

Vordur: `tests/exp-points.mjs` kafli 6 — formulan a handreiknudum tolum,
margfoldun a moti samlagningu, skrumpunar-attin, hvert vantandi inntak fyrir
sig, tengingin i BADUM skram, og **lifandi thekja sem er fullyrding** (yfir 200
leikmenn verda ad fa maeldan grunn og hann verdur ad vera raunverulega annar en
`ep_next` hja minnst fjordungi theirra — profid les tolurnar sjalft, thvi
fost tala um lifandi gogn ureldist thegjandi). **Sex stokkbreytingar felldar**, thar med talin klukkan bædi
fjarlaegd og linkud, og `seasonStarted: true` sem fasti i kallandanum.

### LIKUR A DEFCON-STIGUM I VALINNI UMFERD (`dcChance`, 4.9.2026)

Notandinn: *„eg vill baeta vid a player cardid hversu liklegt er ad leikmadur fai
DC stig a moti naesta andstaedingi i vikunni sem eg er med valda."*

**TVENNT AF ThRENNU ER MAELT OG ThAD ThRIDJA ER MAELT AD VERA NULL:**

1. **Hans eigin hittni er thrautseig.** Split-half areidanleiki DC-hittni er
   **0,7551** a moti **0,3263** fyrir stig — **2,31x** (25.8.2026). Birt tala er
   `hit_rate_adj`, afturvirkjud; hraa hlutfallid ofmaelist a litlum synum.
2. **Byrjun er skilyrdid.** Throskuldurinn er onaanlegur a 15 minutum, svo
   hittnin er per BYRJUN og likurnar i umferdinni eru `hittni x byrjunar-likur`.
3. **Andstaedingurinn hreyfir thetta EKKI.** +0,123 DC-**adgerdir**/threp
   CI [0,032, 0,216] — merkid er raunverulegt — en DC-**stig** hreyfast
   **+0,007/threp CI [−0,032, +0,048]**, samtals 0,03 stig yfir svidid
   (kafli 4). **Skjarinn SEGIR thetta i tooltipinu** i stad thess ad thegja:
   thogn um lid sem vantar les eins og gleymska, ekki eins og akvordun.

Tvofold umferd er `1 − (1−p)^n` — spurningin er „faer hann DC-stig i VIKUNNI".
Markmenn fa enga tolu (750 byrjanir, **null** DC-stig, hamark 0).
`startProb === null` gefur **`p: null`**, ekki `p = hittnin` — ad margfalda med
einum vaeri ad fullyrda ad hann byrji orugglega af thvi ad okkur VANTAR gogn.

**TVAER VILLUR SEM SASTU A SKJANUM EN EKKI I KODANUM:**
· Fyrsta utgafan sotti leikina med **`nextGwFixtures`, sem skilar ThREMUR
  UMFERDUM** (thad er hvad `fxNext3` heitir eftir), svo spjaldid sagdi
  *„DC points GW3 · 70% · 3 matches"* — **truverdug tala vid rangan merkimida**.
· Vordurinn thattadi fyrst `textContent` med regexi og fekk *„GW33 · 3%"* ur
  „GW3" + „33%": **tolur limast saman an bils**, sama gildra og `MUNaNEW`
  -> `NaN` (kafli 5b). Hann les nu reitina thrja sem **adskilda hnuta**.

Vordur: `dc-hit-display.mjs` — hreint fall a tolum thar sem svarid er thekkt,
og holfid lesid AF SKJANUM. **Fjorar stokkbreytingar felldar** (rangt
leikjasvid · `null` byrjunar-likur sem 1 · markmenn hleypt inn · `p x n` i stad
`1 − (1−p)^n`). Signature-vordur fellur ef leikjathyngd raetist inn i fallid.

### TVAER SPAR MEGA EKKI BERA EITT HEITI (sama lota)

Um leid og appid eignadist sinn eigin grunn urdu thrju stod i vidmotinu ad
**tveimur tolum undir einu heiti**, og oll thrju voru endurnefnd:
`„Next GW forecast (ep)"` -> **`„FPL's own ep_next"`** · `„ep 9.0"` a
andstaedinga-flisunum -> **`„FPL ep_next 9.0"`** · og tooltipid a vollunum segir
nu hvad grunnurinn ER i stad thess ad nefna `ep_next`. Sama regla og
`„DC hit rate"` (per byrjun, yfir hofud) a moti `„DC points GWn"` (i theirri
umferd): **tvaer prosentur hlid vid hlid an merkimida eru tvaer tolur undir einu
heiti.**

