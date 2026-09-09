# CLAUDE.md — leiðarvísir fyrir Claude Code í þessu repo

Byrjaðu á `npm ci && npm test && npm run build`. Allt á að vera grænt.

Þetta skjal er **reglurnar sem gilda**. Mælingarnar sem réttlæta þær — töflur,
úrtaksstærðir, villusögur og allt sem var flutt héðan — eru í
**`docs/MAELINGAR.md`** (sögulegt, uppfærist ekki). Skjalið var stytt tvisvar:
8.8.2026 (3.141 -> ~1.000 línur) og **9.9.2026 (2.511 -> ~900 línur)**. Í
bæði skiptin var **ekkert fellt út, aðeins flutt** — línurnar sem hurfu héðan
eru orðréttar í MAELINGAR.md undir dagsettum kafla.

> **KAFLANÚMERIN ERU FÖST.** Um 420 athugasemdir í `src/`, `tests/` og
> `scripts/` vísa í „CLAUDE.md kafli N" (N = 1–16, 5b). Þau númer mega ekki
> breytast. **Númer með bókstaf eða aukastaf** (3d · 6j · 7.1 · 8e …) eru
> kaflar í `docs/MAELINGAR.md`, ekki hér — nema 5b.

> **Grunnreglan í öllu repo-inu:** tölur eru **mældar**, ekki valdar. Ef þú
> vilt breyta vog, þröskuldi eða töflu þarf mæling að réttlæta það. Ómæld tala
> sem lítur út eins og mæling er versta útkoman — hún er röng OG trúverðug.

> **Spurðu gögnin, ekki skjalið.** Föst fullyrðing um lifandi ástand
> („preseason", „the range is 4–10", „sjálfgefið er fyrra tímabil", línutölur,
> fjöldi prófasafna) úreldist þegjandi. Klukkan er `seasonHasStarted` /
> `planningGw` í `src/availability.js` og `playedGwIds` í `scripts/fetch.mjs`;
> leikur telst spilaður við `finished || finished_provisional`, því `finished`
> flettist fyrst ~3 dögum eftir umferð. `wc -l`, `node -e` og `SUITES` svara
> tölu-spurningum rétt á sekúndubroti — prósa gerir það ekki.

---

## 1. Hvað þetta er

FPL-skipulagstól (Fantasy Premier League) fyrir eigin notkun. **Viðmótið er
enskt og bara enskt** (kafli 9). Tímabilið 2026/27 hófst 21.8.2026.

| Hluti | Hvar | Athugasemd |
|---|---|---|
| Framendi | GitHub Pages, `https://aronhogni.github.io/Fantasy/` | Vite, base `/Fantasy/` |
| Gagna-pipeline | GitHub Actions → `data/*.json` í repo | `fetch.yml` daglega 05 UTC, `fetch-fast.yml` á 30 mín |
| Gögn lesin af | `raw.githubusercontent.com/.../main/data/*.json` | appið sækir beint, **enginn bakendi** |
| Proxy | Netlify function `netlify/functions/odds.js` | **EINA** sem Netlify hýsir |

**Sjö flipar** (`view` í `App.jsx`): `⚽ Planner` · `👥 Player stats`
(`PlayerList.jsx` — aðalverkfærið; fjórir lesmátar: `Groups` · `Build table` ·
`Buy windows` · `Imminent`) · `🛡️ Teams` · `📊 Gameweek` · `🏆 Leaderboard` ·
`Best of the best` · `Set pieces`. Allir nema Planner lesa **AÐEINS `data/`**.
**Ný sýn fer inn í Player stats sem `mode`**, ekki sem áttundi flipi.

### Skráaskipanin — hrein rökfræði aðskilin frá React

Forsenda þess að prófin séu marktæk: **prófin keyra nákvæmlega sama kóða og
appið birtir.** Ekki afrita formúlur inn í `.jsx`-skrár.

| Hreint (ekkert React) | Birting eingöngu |
|---|---|
| `model.js` — FFDR, þrep, vænt stig, söluverð, `rankScore` | `App.jsx` (langstærst) |
| `stats.js` — dálkaskráin, mó/aó, byrjunar-líkur, auðgun | `PlayerList.jsx` |
| `market.js` — odds → vænt mörk → FFDR-þyngd | `GwReport.jsx` · `Compare.jsx` |
| `rotation.js` — róterings-par | `Rotation.jsx` · `PlayerPanel.jsx` |
| `teamstats.js` — liða-tölur, `buildTeamMetrics` | `Teams.jsx` · `Leaderboard.jsx` |
| `advisor.js` — kaup-ráðgjöfin | `SetPieces.jsx` · `Leagues.jsx` · `Imminent.jsx` |
| `bsd.js` — BSD-samlagning | `ShotMap.jsx` · `Icons.jsx` · `Pitch.jsx` |
| `buywindow.js` — kaup-gluggar per leikmann | `BuyWindows.jsx` |
| `swaptiming.js` — HVENÆR á að skipta · `buysell.js` — pörun og vikuröð | `BuySell.jsx` |
| `availability.js` — klukkan (`seasonHasStarted`, `planningGw`, `fixturePlayed`) | |

**Engar línutölur hér — þær reka.** `wc -l src/*.js* scripts/fetch.mjs` gefur
þær réttar.

**Leyndarmál í GitHub Secrets:** `ODDS_API_KEY`, `EURO_API_KEY`,
`API_SPORTS_KEY`, `BSD_KEY`. Gefin sem `env` í workflow-unum, **write-only**.
Aldrei lykil í kóða eða commit; repo-ið er **public**. `.env*` er í `.gitignore`.

---

## 2. Vinnulag sem gildir hér

1. **`git pull --rebase` ALLTAF fyrst.** `fetch-fast` cron committar `data/`
   á 30 mín fresti; annars fæst fast-forward-höfnun við push.
2. **`git add <skrár>`, ALDREI `git add -A`.** Tvær lotur hafa unnið á þessu
   vinnutré samtímis og `-A` sópaði vinnu annarrar inn í commit hinnar.
   `_to_delete/` (snapshot-tarbollar notandans) og `.claude/worktrees/` eru
   ótrökkuð og eiga að vera það.
3. **Keyrðu prófin þrisvar fyrir hverja ýtingu.** Nokkur próf lesa raunveruleg
   `data/`-gögn og kvörðunarpróf endurreikna úr þeim — flökt á að finnast
   áður en það lendir í main.
4. `npm run build` verður að vera grænt. **`npx esbuild` er EKKI nóg eftir að
   kóði er fluttur milli skráa** — hann þáttar, hann leysir ekki nöfn.
   Flutningur skildi eftir þrjár tilvísanir í horfin nöfn og gaf hvítan skjá
   meðan esbuild var grænt. Eftir flutning: `await import()` á skrána eða
   keyrðu `data-resilience.mjs`.
5. **Netlify: forðastu byggingar.** `netlify.toml` byggir AÐEINS þegar
   `netlify/` breytist (hver bygging kostar credit).
6. Commit-skilaboð á **íslensku án broddstafa** (ASCII), ítarleg: hvað, hvers
   vegna, hvað var mælt. Sagan er raunveruleg skjölun hér.
7. Pipeline er ræst handvirkt með `gh workflow run fetch.yml` og niðurstaða
   lesin úr `data/`.
8. **Handover-skjöl** fara í `docs/handover/` og eru committuð — ótrökkuð skjöl
   í rótinni fylgja ekki `git clone` og hverfa þegjandi.

---

## 3. Reiknilíkanið — MÁ EKKI FÍNSTILLA Á TILFINNINGU

Vogtölur og töflur í `model.js` eru mældar með grid-leit og krossprófun,
liðsstyrkur alltaf úr **fyrra** tímabili (ekkert leki). Breytir þú þeim án
mælingar fer bakprófið niður — og það er rétt hjá því.

### Hvar tölurnar búa (ekki afrita þær hingað — þær reka)

| fasti | skrá | hlutverk |
|---|---|---|
| `SCALE_FIX` | `model.js` | færir líkanskjarnann af 1–5 kvarða yfir á töflukvarðann |
| `MEASURED` / `MEASURED_POS` | `model.js` | birt mörk á sig, CS%, vænt stig per þrep |
| `TIER_CUTS`, `TIER_NEUTRAL = 2` | `model.js` | sextílar raunverulegrar FFDR-dreifingar; hlutlausa gráa miðþrepið |
| `DIFF_W`, `homeCore` | `model.js` | vogir inntaka; heimavöllur DEF 0,20 / GK 0 (mælingin í athugasemdinni við `DIFF_W`) |
| `PREV_K = 10` | `model.js` | blöndun fyrra og yfirstandandi tímabils, `w_prev = K/(n+K)` — endurmælt með CI 24.8.2026, vörður `form-blend.mjs` |
| `MARKET_DIFF_A/B` | `market.js` | hvar taflan er lesin út frá markaðslínunni |
| `RANK_W`, `rankScore` | `model.js` | röðunarskorið fyrir KAUP-tillögur (`advisor.js` flytur inn) |
| `BASE_K = 8`, `BASE_PRIOR_M90 = 5`, `BASE_POS_PRIOR`, `BASE_CAL` | `model.js` | grunnur væntra stiga og kvörðun hans (kafli 15) |
| `START_MODEL`, `PRESEASON_CAL` | `stats.js` | byrjunar-líkurnar |
| `ADVISOR_CAL`, `ADVISOR_MAX_GAP` | `advisor.js` | kaup-prósentan |
| `MIN_START_PROB = 0.15` | `rotation.js` | byrjunar-gólf í róterings-pari |
| `BIG_CHANCE_XG = 0.18`, `IN_BOX_X = 17` | `bsd.js` | BSD-skotakort |
| `SWAP_KMAX = 3` (mælt), `SWAP_TAU = 0.25` (**stilling**), `SWAP_WEAK_NET = 3` (kvörðun) | `swaptiming.js` | kaup-/sölu-tímasetning |
| `DC_P0_PRIOR` | `scripts/fetch.mjs` | DefCon-forgildi per stöðu, **per LEIK** (kafli 16c) |

### Niðurstaðan í einni töflu

FFDR gegn opinberu FPL-FDR, 10 tímabil, 6.080 lið-leikir (`ffdr-vs-fdr.mjs`):

| mælikvarði | FFDR | FDR |
|---|---|---|
| r við mörk á sig | **0,397** | 0,302 |
| AUC (hreint blað) yfir tilviljun | **17,2%** | 12,0% |
| CS% léttasti 1/6 á móti þyngsta | **44,9% / 7,8%** | 39,0% / 12,2% |

FFDR vinnur í 10/10 tímabilum, og enn 1,79× þvingað í fjögur þrep FDR —
forskotið er **upplýsingar, ekki fínni þrep**. Gegn raunverulegum
leikmannastigum slær FFDR FDR í öllum fjórum stöðum; DEF er sterkast.

### Uppflettingar milli tímabila fara á `code`, aldrei á nafn eða lið

`imminent.json` bar lið **síðasta** tímabils, appið fletti upp eftir liði
**í dag**, uppflettingin misheppnaðist, `P` varð `null` og null-reglan
(*`P=null` útilokar ALDREI*) hleypti varamarkmanni gegnum `MIN_START_PROB`.
Golfið virtist virka; það var aldrei spurt. Mælt: 38 leikmenn á röngu liði.
**Null-reglan sjálf stendur**; villan var fals-null. Join-lykillinn er `code`
(fast yfir tímabil; `players_raw.csv` parar `element` við það) — í pipeline,
í spá-bókhaldinu OG í les-leið appsins (`IMM_BY_CODE`). Rétta fullyrðingin í
verðinum er **finnanleiki, ekki ferskleiki** (`rotation.mjs` kafli 8, 8b).

### Ákvarðanir sem hafa þegar verið véfengdar — ekki taka þær upp aftur

- **FFDR er ÚTKOMAN.** ClubElo, xGC og markaðslínan eru inntök og birtast
  ekki sem sjálfstæðir dálkar við hliðina.
- **Markaðsvog er 0,80 í ÖLLUM stöðum** — sóknarhópurinn notar
  `marketAttackDiff` (eigin vænt mörk), ekki `marketDiff` (mörk á sig).
- **Markaðsþyngd er reiknuð úr `xga` þegar `diff` vantar.** Án þeirrar
  varaleiðar var markaðsliðurinn dauður í viku með græn próf. Vörður:
  `model.test.mjs` 5b (hver röð í `odds.json` verður að vera NÝTILEG).
- **Þrepin á spjöldum eru ALGILD, ekki afstæð innan liðsins** (afstæð hentu
  ~30% af merkinu). Arsenal fær mikið grænt og það er rétt — `TIER_CUTS` eru
  deildar-víðir sextílar.
- **Sex þrep með hlutlausu gráu miðþrepi** (`#ecedf1`); nágrannaþrep ≥20 í
  RGB; `tierOf` skilar `TIER_CUTS.length` sem þyngsta þrepi, aldrei harðri
  tölu. Litirnir eru afstæð kvörðun; tölurnar haggast ekki. Sjöunda þrepið
  var mælt og hafnað (kafli 4).
- **`homeCore`:** DEF 0,20, GK 0, dregið frá aðeins þegar markaðslínan tók
  ekki við OG Elo var notað — liðurinn slokknar sjálfur án Elo. Lið-útkoma og
  stig leikmanns toppa á sitthvorum stað; **stigin eru markmiðið**.
- **`rankScore` RAÐAR KAUPUM. Sölur raðast eftir `score` (`FIT` í
  `recommend.js`).** `rankScore` fyrir sölur var mælt á hermdum hópum og var
  ógreinanlegt (−0,118 CI [−0,328, +0,088]); yfir deildina vinnur `score`.
  Vörður: `tests/recommend.mjs`.
- **Wildcard og Free Hit eyða EKKI söfnuðum frískiptum** (þak 5).
- **Söluverð** = kaupverð + 50% af hagnaði, niðurjafnað á 0,1; tap = fullt
  verð. Reiknað í tíundum (`sellTenths`).
- **Vænt stig** (`expPointsFor`) = grunnur (kafli 15) × mældur margfaldari
  fyrir FFDR leiksins × tiltækileiki, kvarðað per LEIK. Tvöföld umferð leggst
  saman, auð umferð = 0. **Mínútur og byrjunar-líkur eru EKKI í tölunni** —
  margfeldi við `startProb` var mælt og hafnað (kafli 4); það stendur aðeins
  fyrir fyrirliða (`captain.js`, N=1).
- **Verðspáin („↑ í nótt?") er NÁLGUN** og má aldrei birtast sem vissa.
  Opinberu sviðin (`price_change_percent`, `_projections`, `_locked_until`)
  birtast **óbreytt** í dálkinum „Progress to price change"; pipeline sleppir
  þeim meðan þau eru 0 hjá öllum (`priceChangeSignal`) svo 0 á `hi:true`
  dálki lesi ekki eins og mæling. Jákvætt = leið upp; enginn utan [−100,100].
  Verðir: `fetch-entry.mjs` 6, `stats.test.mjs` 22.
- **`odds.gw` er LEIDD af innihaldinu** (`oddsGwCoverage`), `gws` ber allar
  umferðir sem raðirnar spanna, `gw_deadline` heldur frest-tölunni. **Ein
  odds-röð per félag = FYRSTI leikur félagsins í svarinu** (`preferNextMatch`),
  ekki síðasti — svarið spannar oft tvær umferðir. `csFor` sannreynir
  mótherja OG dagsetningu per félag, svo gagnkvæmni yfir skrána er ekki krafa.
  Skráin er endurbyggjanleg úr `odds_raw/` án sóknar (`rebuild-odds.mjs`,
  `oddsTeamsFromRaw`/`oddsFileFrom` hrein); `updated` fylgir sókninni sem
  gögnin komu úr. Vörður: `odds-transform.mjs`, `model.test.mjs`.
- **Samtölur í Teams** (`xg`/`xgc`/`goals`/`conceded`) koma úr SAMA bili og
  per-leik tölurnar, nefnarinn (`played`/`bsd_matches`) fylgir og heimildirnar
  telja sinn hvorn leikjafjöldann. Nýliðar fá null (`luck.json` ber
  Championship-tölur). Verðir: `team-stats.mjs` 4 og 14.
- **Teams býður yfirstandandi tímabil úr `fixtures.json`** (`buildLiveTeamForm`,
  hreint). Skot/horn/spjöld eru EKKI þar → `null`, aldrei 0; xG/xGC koma úr
  `bsd_live.team_matches` (`aggLiveMatchRange`). Sjálfgefið er **lifandi**
  (`useState("live")` alls staðar, ákvörðun notandans 25.8.2026) með
  `liveOn`-varaleið í fyrra tímabil þegar ekkert er spilað. Heitið er leitt
  (`currentSeasonLabel`). Verðir: `team-stats.mjs` 12g/15, `team-gw.mjs` 4d.
- **API-Sports er uppsagður** (`suspended`, ekki kvóti) og lagast aðeins á
  `dashboard.api-football.com`. Byrjunarlið koma úr FotMob (kafli 6).
  **Kveikjan er útkoman** („vantar byrjunarlið?"), ekki orsökin, og
  **varaleið sem er götuð á aðalleiðinni er ekki varaleið** (`fetchLineups`
  er ógatað; API-Sports-kallið gatað inni í því). `PROBE_TTL_BLOCKED = 1`.
  Vörður: `wiring.mjs`.
- **Mínútuþróun** (`RANK_W.minsTrend = 0,01`) er lögð ofan á gömlu vogirnar,
  ekki endurfittuð. 0 í forleik, kviknar við GW4.
- **mó** = `(xG + xA)·0,8 + threat/25·0,3 + óheppni·0,2` (xGI, ekki xG).
  **aó = bert `creativity/90`.**
- **Róterings-par raðast eftir VINNINGI, ekki þekju**; auð umferð er þyngst
  (3); verðþakið er UI-afmörkun, ekki hluti líkansins.
- **Kaup-gluggar (`buywindow.js`) eru AFSTÆÐIR VIÐ MANNINN SJÁLFAN** —
  „HVENÆR", ekki „HVERN" (það svarar FFDR-taflan). Einingin er
  `lookupPos(pos,"pts",d)`; staðan er inntak (DEF≠FWD í 17 af 20 liðum,
  vörður A10); auð umferð MÁ vera inni í glugga (andstætt `greenRuns`), óvís
  umferð klýfur hann; tiltækileiki er MERKTUR, ekki í tölunni; einn
  mælikvarði (`sum/(len+3)`) á val OG þak; liturinn er `his own`-kvarði
  sjálfgefið — vörpunin **færir** (`tierOf(d − (meanD − NEUTRAL_MID))`),
  teygir ekki; `meanDifficulty` námundað í 2 aukastafi eins og `d`;
  `MIN_WINDOW = 3`, `MAX_WINDOWS = 3` eru UI-afmarkanir. Vörður:
  `buy-windows.mjs`.
- **Kaup-/sölu-listinn (`swaptiming.js` + `buysell.js`) svarar „HVENÆR".**
  Mælt á 5 tímabilum, 8.400 pörum með FFDR frosið: SKIPTU NÚNA í 78–92%;
  bið borgar sig í 17,1% (+1,136 CI [0,681, 1,573]); ~72% af
  tímasetningar-virðinu eru blank/tvöfaldar umferðir, FFDR-liturinn +0,072
  CI [0,006, 0,151]. **Engin orakel-tala má birtast** (100% hávaði). Staðan
  er HART skilyrði. Þögn er tvenns konar: „bíddu" og „ekki þess virði"
  (`SWAP_WEAK_NET`) — veik skipti fá ENGA viku. Flaggaður maður ber
  FPL-fréttina sjálfa. Vörður: `buy-sell.mjs`.
- **Byrjunar-líkurnar eru KVÖRÐUN, ekki véfrétt.** Nákvæmni 88,0% = „byrjaði
  síðast"; ábatinn er Brier −24% og bekkjar-gildran (lyfting 2,09×). Ekki
  selja nákvæmnina sem ábatann. Í forleik gildir `PRESEASON_CAL` og
  `trap`-þrepið er slökkt (merkið snýst við, kafli 4).
- **Kaup-prósentan í ráðgjöfinni þýðir EITT**: hlutfall sambærilegra
  samanburða þar sem sá efri skoraði raunverulega meira (306.653
  samanburðir). Þakið ~81% er mælt — „95% buy" væri lygi.
- **`dcChance` (líkur á DefCon-stigum í valinni umferð)** = `hit_rate_adj ×
  startProb`, tvöföld umferð `1 − (1−p)^n`, GK fá enga tölu, `startProb ===
  null` gefur `p: null`. Mótherjinn hreyfir DC-**stig** ekki (+0,007/þrep,
  CI inniheldur null) og tooltipið segir það. Vörður: `dc-hit-display.mjs`.
- **Tvær spár mega ekki bera eitt heiti.** FPL-talan heitir „FPL's own
  ep_next" alls staðar; okkar grunnur heitir ekki `ep_next`.

---

## 4. MÆLT OG HAFNAÐ — lokaðar spurningar

**Lestu þessa töflu áður en þú leggur til „augljósa bætingu".** Hvert atriði
var mælt á raungögnum og féll. Smáatriði, úrtaksstærðir og CI eru í
`docs/MAELINGAR.md` (dálkurinn vísar). Reglan sem öll röðin fylgir: *liður er
þess virði AÐEINS ef CI útilokar núll* — sjöunda þrepið féll við +0,00085 og
„sleppa óheppnis-liðnum" við P=74%.

| hugmynd | niðurstaða | MAELINGAR |
|---|---|---|
| Ferðalengd í FFDR | t=−0,42 á 3.420 útileikjum. Vörður `travel-measure.mjs` | 3 |
| DefCon í FFDR / röðun / sem inntak í vænt stig | DC-**aðgerðir** hreyfast +0,123/þrep (raunverulegt), DC-**stig** +0,007/þrep CI [−0,032, +0,048] — þröskuldurinn lokar rásinni. Sem inntak í stigalíkan: d top15 0,000 CI [−0,239, +0,232]; form notandans (`nonDC × mult + 2·p_hit`) VERRA, −0,344 | 3, 6l, 20.8., 25.8. |
| DC-miðjumaður fær fleiri stig í ERFIÐARI leik (snúinn halli) | Víxlverkun innan leikmanns 0,000 CI [−0,301, +0,296]; skiptir formerki milli hálfleikja tímabils; 0/5 næmis-útfærslur | 20.8.2026 |
| Form / „heitur leikmaður" / form sem inntak í FFDR | Afturhvarf innan leikmanns (−4,52pp eftir mark); hrein blöð raðast ekki í runur (lyfting 0,99). `PREV_K` ER blöndunarvélin og var endurmæld: K=10 stendur, ekkert K nær marki | 6c, 24.8. |
| Stöður gegn ákveðnum liðum | Leifin flyst ekki milli tímabila. `pos-vs-opponent.mjs` | 3 |
| xGChain / xGBuildup | −0,0009 / −0,0014 ofan á xG+xA (StatsBomb 2015/16) | 4 |
| Snertingar í vítateig | +0,0156 CI [−0,0079, +0,0389]; `shots_in_box` −0,0008. Engin heimild þarf — merkið er ekki staðfest. `measure-box-touches.mjs` | 4 |
| Post-shot xG (PSxG) | Líkanið er gilt (Brier 0,193→0,165) en „goals prevented" flyst ekki (r −0,217). Ekki velja markvörð eftir því | 4 |
| Staðsetningarhæfni skota | r +0,050 innan tímabils; hrátt PSxG−xG mælir skotmagn | 4 |
| Dómara-spjöld | r(N→N+1) 0,182, 6/14 pör neikvæð; ~0,016 stig nýtanleg | 4 |
| Víti og dómari · meiðsli mótherja · hrá skot-talning | Dómara-helmingur ómælanlegur (E0 ber engin víti); fjarvera í N−1 d r +0,0003 (null); skot-talning d topp-15 −0,196, ÚTILOKAR NULL Í RANGA ÁTT. `measure-opp-pens-shots.mjs` | 25.8.2026 |
| Varnarsinnaðir miðjumenn fá varnar-FFDR | 0,1σ; w skiptir formerki milli tímabila | 3 |
| Stóra stigalíkans-beiðnin (sex tilgátur) | Allar felldar; bygging appsins jafnar 56-inntaka ridge þegar grunnurinn er góður; FFDR-margfaldarinn ber sitt (+0,175 CI [+0,066, +0,292]). `measure-exp-points-v2.mjs` | 25.8.2026 |
| FPL-eigið `xP` sem viðmið eða inntak | LEKIÐ (r 0,4529 á móti 0,0720). Vörður `xp-contaminated.mjs`; `xP5` leyft | 25.8.2026 |
| Veldi á FFDR-margfaldarann (`mult^a`) · blanda `ep_next` í grunninn | Nested −0,007, foldar ósammála; `a=0` gefur −0,138 (p 0,0043) svo margfaldarinn ber merki. Blöndun neikvæð í öllum þyngdum (−0,154 við w=0,5) | 4.9.2026 |
| Merki ofan á góðan grunn (`threat90`, `bps90`, `xgi90`, `dc90` …) | Sterkast `threat90 + 0,2`: +0,072, p 0,0813, lifir ekki Holm. Eina sem lifir Holm gerir spána VERRI (`hauls − 0,2`). `threat90` er skráður opinn frambjóðandi; endurmælist við sjötta tímabilið | 4.9.2026 |
| K=20 (skrumpun út fyrir rist) | +0,077 en CI [−0,075, +0,123], brýtur kvörðunina. **Sterkasti opni frambjóðandinn**; skilyrði: `BASE_CAL`-endurfitt og CI sem útilokar null | 4.9.2026 |
| Bónus sem sér liður · betra mínútu-líkan · lengri saga en eitt tímabil · stöðu-bundið K · forgildi sem stig/leik | Öll felld nested (−0,021 · −0,021 · −0,011 · −0,021 · +0,381 á móti +0,406). Tvöföld umferð þarf enga afsláttar-tölu (−0,005 ± 0,046) | 4.9.2026 |
| Lið leikmannsins / mótherjinn sem inntak í DC-hittni | Lið: samsetningar-núll fellir (stokkað r 0,774 = raun). Mótherji: **ekki lokað** — eingöngu DEF, hornrétt á FFDR, en split skiptir formerki; endurmælist eftir 2026/27 | 4.9.2026 |
| Ein byrjun sem DefCon-merki | DC/90 í fyrstu byrjun ber merki (r 0,396 hjá MID) en birtingin (línа í stað `hit_rate_adj`) bætir MAE 0,0063 CI inniheldur null. Skrumpaða talan stendur | 27.8.2026 |
| Stöðu-forgildi í stað `ep_next` fyrir nýliða | Hver leiðrétting gerir spána VERRI (MAE 0,848→0,873). Vörður `exp-points.mjs` | 3e |
| `full90` + `start_rate5` í rankScore | −0,018 | 3c |
| Margföldunar-liður `W.xg≈0,20` | 0,14σ | 3 |
| `FIT` fittað gegn FFDR | Hnífjafnt á 85.646 sýnum | 0b |
| Hvíld / leikjaálag | 27,0% á móti 27,3%; flaggið tekið út 29.7. `deriveRotation` og skráin fjarlægð 31.8. | 6h |
| Evrópu-/bikarálag | −1,37pp CI [−4,67; +1,92]. Sýnt sem grátt SAMHENGI (★), hvergi í `fixDifficulty`/`expPointsFor`/`rankScore` | 6k |
| Staða-dúmmíar í byrjunar-líkan · mó × byrjunar-líkur · sleppa óheppnis-lið · mó per 90 · xA í aó · aó hrá summa · Fable mó/liðsval · Aron-stuðull og afbrigði | Öll felld | 6d, 6g, 6h, 6k, 6o |
| BSD `availability` í stað FPL-status · BSD í bakprófin · BSD í stað E0 · big chances úr ESPN · heatmap úr BSD | Felld af gagna-ástæðum (23 rangir, aðeins 2025/26, engir sögulegir oddar, engin per-skot xG, einn punktur per leik) | 6t, 6b, 8i |
| Sjöunda þrepið | Þrepin eru BIRTING, ekki líkan; +0,00085, CI inniheldur núll, P 67,3%. Fjölgun má rökstyðja sem læsileika, ekki forspá | 9.8.2026 |
| `selected_by_percent` úr archive sem GW1-merki | LEKI (lokastaða) | 6g |
| Skipta-hreyfing fjöldans | Ofan á `ep_next` r −0,0005 CI [−0,019, +0,019] | 9.8.2026 |
| Sérfræðinga-hópurinn: helmingunartími · fleiri þættir · klippa útlaga · lítill hópur · hygla bestu · þröskuldur · síðasta tímabil eitt | Recency h=3,0, jöfn vog, N=1.000, samfelldur kvarði, full saga. Allt annað mælt verra eða suð | 9.–10.8.2026 |
| Kaup-gluggar: sextílar hans eigin gilda · algild regla · ber ábati · ber þéttleiki · miðgildi | Öll felld (allir litir á flatri skrá · Arsenal GW1–38 · 20 vikna „gluggi" · 9/10 nákvæmlega 3 vikur · óstöðugt í báða enda) | 19.8.2026 |
| `expPointsFor × startProbability` sem XI-val | Með FPL-varaskiptum TAPAR það í öllum laugum (88,9% bekkjaðra sem blönkuðu voru varaskiptir hvort eð er); `sp^k` einrænt minnkandi. Naíft `× sp` án `?? 1` kostar −3,86 stig/umferð. Stendur fyrir fyrirliða | 20.8.2026 |
| Keppinautur úr leik lyftir byrjunar-líkum (útileikmenn) · GK-liðurinn inn í töluna · færa `startRisk`-þrep · `trap` í forleik · fyrra tímabil í heild í stað tail-5 · verð sem staðgengill | Útileikmenn −0,0057 CI [−0,0096, −0,0014]; GK lifir sem SAMHENGI (`gk_chief_out`); þrepið var rétt, kvarðinn ekki (`PRESEASON_CAL`); `trap` snýst við í forleik (+0,19) og er slökkt; tail-5 heldur; verð AUC 0,597 → `null`, ekki ágiskun | 20.8.2026 |
| Community Shield / „sást í æfingaleik" sem byrjunar-merki | Dagsetningin ber merkið (+0,034), keppnin ekki; „sást ekki" er gegnsýrt af þekju (23/80 lið-tímabil án uppstillingar) | 20.8.2026 |

**Handvirkar mælinga-skriftur** (ekki í `npm test`): `ffdr-vs-fdr.mjs` ·
`euro-congestion.mjs` (GitHub-kvóti gaf 403) · allar `scripts/measure-*.mjs`
(sjá töfluna í kafla 7). Þær flytja `makeFixDifficulty`, `tierOf`,
`bootstrapCI` o.s.frv. **inn** — ekkert endurritað (handafrit af
`buildTeamMetrics` skrifaði NaN á 17 lið og merkti það sem mælingu).

**Óframkvæmanlegt af ytri ástæðum:** FFS-spár (borgunarveggur) · FBref (403)
· frjáls skipti annarra stjórnenda (FPL birtir þau hvergi) · söguleg
stigatafla (`leagues-classic/314` skilar aðeins yfirstandandi tímabili).

---

## 5. Prófakerfið — `npm test`

`tests/run-tests.mjs` keyrir öll söfnin í `SUITES`. **Fjöldinn er REIKNAÐUR
úr `SUITES`** og stendur hvergi í prósa (þrjár ólíkar tölur hafa staðið hér
og allar urðu rangar). Söfn merkt `true` þurfa jsx-loaderinn.

Taflan nefnir þau sem **bera ákvarðanir**:

| Safn | Hvað það ver |
|---|---|
| `model.test.mjs` | Hver birt tala; endurkvarðar litamörkin úr `data/`; 5b: hver röð í `odds.json` NÝTILEG; odds-raðir svara raunverulegum leik |
| `ffdr-walkforward.mjs` · `ffdr-player-points.mjs` · `ffdr-backtest.mjs` | FFDR betri en sitt besta inntak og rétt kvörðuð; raunveruleg leikmannastig; halda litirnir |
| `rank-model.mjs` | `rankScore` LOSO með orakel-þaki |
| `exp-points.mjs` | Grunnur væntra stiga (kafli 15): formúla á handreiknuðum tölum, kvörðun per leik, klukkan í `pointsBase`, lifandi þekja sem fullyrðing |
| `advisor.mjs` · `recommend.mjs` | Kaup-prósentan; sölur á `score` |
| `stats.test.mjs` | Dálkaskráin öll: tóm inntök, einkvæmir lyklar (talan reiknuð), `note` skylda, samfelld bönd, `headWidth`/`BADGE_W` deild með viðmótinu, kafli 14 auðgunin, 14c teljari/nefnari sama heimild |
| `rotation.mjs` | Kafli 3 prófsteinn: spegilmynd verður að vinna þann sem er BETRI Í HEILD; 8/8b `code`-uppflettingin |
| `mo-candidates.mjs` · `form-blend.mjs` · `defcon-shrink.mjs` · `dc-hit-display.mjs` | mó með bootstrap; `PREV_K`; DefCon per LEIK (6a lifandi, 6b sögulegur) og afturvirkjaða talan aðaltalan |
| `buy-windows.mjs` · `buy-sell.mjs` | Kaup-gluggar (A tilbúið, A8 300 slembnar raðir gegn uppteljara, A9b afstæði kvarðinn, B af skjánum); kaup-/sölu-listinn (staðan hart skilyrði, vantandi ep ≠ 0, veik skipti þögul) |
| `workflow-push.mjs` · `fetch-entry.mjs` · `validate-data.mjs` | Push-kapphlaupið á alvöru git; pipeline keyrir þegar hún er keyrð og AÐEINS þá; commit-hliðið |
| `gw1-checklist.mjs` · `calibration.mjs` · `prediction-ledger.mjs` | Vaknar við lokna umferð; heldur mælingin; spá-bókhaldið (odds sem TAFLA, `base`/`exp_points` aðskilin, báðir kallendur) |
| `name-match.mjs` · `no-icelandic.mjs` · `react-warnings.mjs` · `wiring.mjs` · `wiring-static.mjs` | Pörun við viðmiðs-útfærslu; enska (kafli 9); React-viðvaranir með ≥90% þekju; skrifað-og-ólesið; stílar/props/sóttar skrár/**ónotaðir innflutningar** |
| `team-stats.mjs` · `team-gw.mjs` · `ffdr-table.mjs` · `compare-visual.mjs` · `shotmap.mjs` · `set-pieces.mjs` | Lægra-er-betra listað berum orðum; xGC af skjánum sem delta; liturinn segir það sama og talan; græna súlan á réttum manni; skotpunktar gegn þremur akkerum; fyrsti taki = lægsta röðun |
| `bsd.mjs` · `bsd-pipeline.mjs` · `elo-fetch.mjs` · `fdcouk-e0.mjs` · `odds-transform.mjs` · `lineups.mjs` | Engin dauð svið; nótur aðgreina ástönd; vefvaraleið á frystu HTML; `Div === "E0"`; fyrsti leikur vinnur; skammstöfuð nöfn og innan-umferðar sameining |
| `smoke.test.mjs` · `data-resilience.mjs` · `player-cards.mjs` · `error-boundary.mjs` · `untrusted-input.mjs` · `monkey.mjs` | Appið í jsdom; hvítur skjár í 16+ bilunum (`settleOn`, leidd skel, spjald nefnir sig); öll spjöld; útgangan; skemmd blob og proxy-svör; 800 slembnir smellir (**net, ekki vörður**) |
| `playerlist-sort.mjs` · `playerlist-narrow.mjs` · `player-gw-range.mjs` · `watchlist.mjs` · `ffdr4-and-filter-step.mjs` · `initial-squad.mjs` · `planner-pitch.mjs` | Tómt gildi aldrei á toppnum; síminn (390 px); blindir dálkar leiddir; borðinn á frosna hólfinu; FFDR4 og síu-skref; þrír endurstillingar-hnappar; umferðar-ástönd |
| `pros.mjs` · `pros-render.mjs` · `leagues.mjs` | Sérfræðinga-hópurinn (ekkert sótt fyrir frest, kvóti, `--fast`); tölur af skjánum; verðlaun ≤ pottur |

**`tests/lib/e0.mjs`** byggir spá-heiminn fyrir ÖLL bakprófin — ein
uppbygging á einum stað. **`tests/lib/select-gw.mjs`**: próf sem er UM eina
umferð á að VELJA hana, ekki erfa sjálfgildið (fimm söfn féllu 27.8. án
villu í appinu). **`tests/lib/panel2.mjs`**: panellinn fyrir stigalíkans-
mælingar; summar aðeins yfir raðir sem bera gildi (kafli 16a).

**Vörður sem keyrir ekki er ekki vörður.** `pos-vs-opponent.mjs` bar `ok()` og
var utan `SUITES` í vikur; `validate-data.mjs` var skrifuð 25.8. og tengd
engu til 31.8. — og nákvæmlega bilunin sem hún er til fyrir slapp í gegn á
meðan. Mynstur sem á að endurtaka: kóði sem kviknar fyrst á ákveðnum degi er
dreginn ÚT ÚR `fetch.mjs` og prófaður á TILBÚNUM gögnum.

**Gildrur í jsdom-prófunum:** sértækir `fetch`-mock-ar Á UNDAN almenna
`raw`-handlernum · innsláttur í stýrða reiti er ótraustur → forfylltu
`localStorage`, og notaðu RÖÐUNINA til að fleyta röð inn í sýndargluggann ·
tvö `✕` í DOM → `.at(-1)` · prófaðu hegðun, ekki orðalag (ikon-forskeytið) ·
`narrow` þarf BÆÐI `innerWidth` og `matchMedia` · fastur biðtími er ekki
mæling á að teikningu sé lokið (`settleOn`) · `textContent` límir texta án
bila (`MUNaNEW` ber `NaN`, „GW3"+„33%" verður „GW33 · 3%") → `\bNaN\b` og
lesa reiti sem aðskilda hnúta.

### 5b. ÞÖGUL PRÓF — TÓMAR FULLYRÐINGAR

Prófið sem **finnur ekki neitt og heldur áfram** er verra en það sem fellur
við endurnefningu: það verður grænt og hættir að mæla. `react-warnings.mjs`
heimsótti 0 af 22 viðmótum (íslensk leitarorð eftir ensku-umritun), prentaði
`0/22` og var grænt meðan tvær raunverulegar viðvaranir lifðu. Sama ætt:
`!text().includes("róterings-par")` þar sem strengurinn var hvergi í viðmótinu;
`b.title === "Upplýsingar"` inni í `if (info.length)`.

**Reglurnar:**

1. **ÞEKJA ER FULLYRÐING, EKKI LOGGA.** Talan sem prófið telur verður að
   FELLA það þegar hún hrynur (`MIN_VISITED`, ≥500 spjöld, ≥100 innflutningar).
2. **NEIKVÆÐ FULLYRÐING VERÐUR AÐ NEFNA STRENG SEM VAR SANNANLEGA ÞARNA.**
   `!includes(X)` er einskis virði nema prófið hafi sýnt `includes(X)` áður.
3. **STÖKKBREYTTU ÞVÍ SEM ÞÚ LAGAR.** Afturkallaðu lagfæringuna og sjáðu
   prófið falla. React kvartar aðeins við endurteikningu þegar eiginleiki er
   FJARLÆGÐUR, svo að heimsækja viðmót nægir ekki.
4. **MÆLITÆKIÐ GETUR SJÁLFT VERIÐ VILLAN.** Áður en þú trúir falli (eða
   grænu): athugaðu hvort prófið mæli það sem það heldur — `MUNaNEW`,
   80 ms biðtími á 409 KB skrá, hnappa-texti sem er ekki heiti spjaldsins.
5. **Fullyrðing sem þarf tvennt til að bregðast er veikari en hún lítur út.**
   „Ekkert tómt gildi ofan við tölu" getur ekki brugðist þegar tómu gildin
   fylla gluggann; rétta invariantið er ósamhverft (toppurinn má aldrei vera
   tómur ef dálkurinn hefur tölur).
6. **Afrit staðfestir afrit.** Próf sem ENDURRITAR fallið (`wOf` með eigin
   `marker`, `buildTeamMetrics`-handafrit, DefCon úr samanlögðu skránni) er
   grænt eftir að frumritið breytist. Flyttu inn; sendu SÖMU skrár sem
   keyrslan fær (`player_seasons.json` vantaði í `prediction-ledger`,
   `odds` var send sem skrá en ekki tafla).
7. **Textaleit yfir blokk er veikari en hún lítur út** (kafli 13).

---

## 6. Gagnaheimildir

**FPL-status ræður tiltækileika. Punktur.** Allar aðrar heimildir mega auðga
hann, aldrei skipta honum út — og auðgunin má ekki birtast FREMST (kafli 16c-3).

| Heimild | Staða | Hlutverk og regla |
|---|---|---|
| **FPL** `bootstrap-static` / `live` / `entry/{id}` | virk | Kjarninn. `picks` svara 404 fyrir frest — regla leiksins |
| **football-data.co.uk (E0)** | 200 fyrir lokin tímabil | B365-oddar fyrir bakprófin. **Prófsteinninn er `Div === "E0"`, ekki HTTP-staðan** — vantandi skrá hefur svarað 404, 301 → `EC.csv` (utandeild, 200 með röngum gögnum) og 300 (mod_speling). 300/404 = „bíður"; 500/403/429 KASTA. Vörður `fdcouk-e0.mjs` |
| **ClubElo** | `api.clubelo.com` ÓNÁANLEG · `clubelo.com` UPPI | Elo-inntak. API er aðalleið, vefurinn **valideruð varaleið** (`parseClubEloWeb`: öll 20 liðin eða ekkert). Ógild þáttun heldur GÖMLU skránni. Tvær `status.json`-raðir: `elo` grænt við hlið `elo_api` rautt ER hönnunin. Frosin Elo er EKKI hlutlaus (rak 25,3 stig á viku og RÖÐIN breyttist). **`/Fixtures` svarar 200 með „Fixtures API deactivated"** → rauð röð, innihaldið er prófsteinninn; `eloCsByFx` er þrep 2 af 3 í `csFor` og þrepið sem tekur við er mælt betra (`cs-logistic.mjs`) |
| **Odds API** (um Netlify-proxy) | virk, kvótaður | Markaðslínan. Hliðið hleypir einni sókn per glugga (`age < 30` klst); endurbygging úr `odds_raw/` án sóknar |
| **ESPN** site-API | 200 | Eina lifandi skot-heimildin (hnit, útkoma, `assist_by`). Engin xG |
| **BSD** (`sports.bzzoiro.com`) | 200, ókeypis | Per-skot xG, skotakort, föst leikatriði, `team_matches`. **Aðeins 2025/26 →** |
| **API-Sports** | UPPSAGÐUR (`suspended`) | `/fixtures/lineups`, `/injuries`. Lagast aðeins hjá veitunni. Meiðsla-TEGUND: FPL nefnir hana í 80,8% raunverulegra mála og gatið (14 leikmenn, 2,1%) er þögn félaganna sem engin heimild lagar (kafli 16c-3) |
| **FotMob `/api/data/matchDetails`** | virk, enginn token | Staðfest byrjunarlið. Aðeins `lineupType === "standard"` OG nákvæmlega 11 fer í skrána; spá má ALDREI rata í skrá sem segist bera staðfestingu. Klúbbar gegnum `teamIdOf` í deild 47 einni („Arsenal" er líka Arsenal Tula). `lineups.json` **sameinar innan umferðar** (`carryLineups`) — tóm keyrsla má ekki þurrka út (þrjár tómar leiðir, hver með sitt próf). Shotmap-endapunkturinn er ÁFRAM token-varinn; per-leikmanns varnartölur ná til 2016-17 (kafli 16d) |
| **vaastav-speglun** | 200 | Söguleg per-umferðar CSV 2019-20 til 2025-26 (sjá kafla 16a um svið sem vantar) |
| Understat | lifandi en Cloudflare-læst fyrir HTTP | Eina talan sem hún átti ein (xGChain) mældist gagnslaus. Ekki elta |
| FBref · SofaScore | 403 | Ónothæfar |

**Ekki endurmæla heimildirnar** — fjórar voru prófaðar á mörgum hostum og
tímabilum (MAELINGAR 6b, 6e).

### ESPN og BSD nota SITTHVORN KVARÐANN

| | kvarði á x | teigur |
|---|---|---|
| **ESPN** | hlutfall af **HÁLFUM** velli (52,5 m) | 0,314 |
| **BSD** | hlutfall af **FULLUM** velli (105 m) | **17** (`IN_BOX_X`, fittað) |

Fyrsta útgáfan margfaldaði ESPN með 105 og setti hvert skot í tvöfalda
fjarlægð; ekkert próf sá það. Skotakortið les því **sömu kvörðunartölur og
punktarnir eru teiknaðir úr** (`calib` í `bsd_shots.json`). Svæðis-reglan
(`ZONE_RE`) býr í `scripts/espn-zones.mjs` sem BÆÐI skriftirnar flytja inn —
afrit í tveimur skriftum vantaði báðum markteiginn.

### BSD — reglurnar

- **Birtingar-heimild, ekki burðarvirki.** Ekkert í FFDR, `rankScore` eða
  væntum stigum les BSD (né `lineups.json`).
- **~20 svið eru alltaf null** → ekkert dautt svið í skrána, hvert birt svið
  með raunverulega dreifingu (`bsd.mjs`). `has_xg` í lista-endapunkti LÝGUR.
- **BSD-assist eru 29% færri en FPL-assist** (Opta-skilgreining) — ekki villa,
  skipta aldrei út FPL-tölunni.
- **Liða-vörpunin er HANDSTAÐFEST tafla** (`BSD_TEAM`), ekki fuzzy (fuzzy
  felldi Man United inn í Man City). Leikmanna-pörun notar nafn OG mínútur.
- **Endurgeranleg keyrsla:** mistekin köll talin og keyrslan deyr fremur en
  að skrifa hluta-tímabil · lið leikmanns er FLEST-LEIKIÐ lið, ekki „síðasti
  vinnur" · summur í fastri event-id röð.
- **Tóm keyrsla má ALDREI þurrka út góð gögn** (`exit 2`); skráin er lykluð á
  tímabil og keyrsla sameinar.
- **Skotakortin** (`bsd_shots.json` + `ShotMap.jsx`): ein flöt röð per skot,
  letihlaðið, radíus √xG, leikmaður án skota fær ekkert kort, 17 lið af 20
  (COV/HUL/IPS eiga ekkert og það er rétt). Smellur á lið í Teams opnar
  skot Á SIG fyrst. Vörður `shotmap.mjs` prófar staðsetningu gegn þremur
  akkerum, ekki „birtist kortið".

---

## 7. Pipeline og gagnaskrár

`scripts/fetch.mjs` skrifar allt í `data/` (sjá `data/SCHEMA.md`). Hver heimild
skráir sig í `status.json` með `record(...)` og birtist undir **Data sources**.
**Bætir þú við heimild: skráðu hana þar.** Vantar API-lykil → `FLAGS` sleppir
heimildinni þegjandi. **HTTP 200 er ekki gögn** — prófsteinninn er innihaldið
(E0 `Div`, ClubElo „deactivated", `lineupType`).

**`main()` er skilyrt** (`invokedDirectly`, `realpathSync` báðum megin) svo
skráin sé innflytjanleg og hrein föll prófanleg. Vörðurinn keyrir raunverulegt
afrit í nýju ferli báðar leiðir (`fetch-entry.mjs`) — texta-leit gæti ekki
fellt það, því athugasemdin nefnir sjálf `main()`.

**Push-kapphlaupið:** endurtilraunalykkja (5) í BÁÐUM workflow-um, `rebase -X
theirs` í `data/` (endurmyndað í heild). Vörður `workflow-push.mjs`.

**Hliðið fyrir commit** (`scripts/validate-data.mjs`) hafnar ógildu JSON,
`teams.json` ≠ 20 félög og **afturför í null**; keyrir í báðum vinnuskrám, á
undan commit, án `continue-on-error`. Undirmöppur eru þáttaðar.

**`season_baseline.json` er skrifað aðeins fyrir fyrsta leik** og **aldrei
verri skrá ofan á betri** (`seasonBaselineDecision`, hreint). FPL nullstillir
uppsöfnuðu tölurnar VIÐ frestinn; `!events.some(finished)` hefði skrifað 600
raðir með max starts 1 ofan á 599 með max starts 38. Eina sviðið sem greinir
ástöndin er `starts`. Tvær skrár í sama `data/` bera SITTHVORN aldur (daglega
á móti hröðu keyrslunni) — athugaðu hvort mælitækið mæli það sem þú heldur.

### `data/predictions/` — SPÁ-BÓKHALDIÐ, OG ÞAÐ MÁ EKKI EYÐA

`scripts/snapshot-predictions.mjs` (kallað úr **BÁÐUM** vinnuskrám) skrifar
`gw{N}.json` með því sem við SPÁÐUM: FFDR per leik, `rankScore` með inntökum,
byrjunar-líkur, **`base` og `exp_points`** (aðskilin), `ep_next` sem viðmið.
Appið les þetta aldrei; `continue-on-error: true`.

Reglurnar: **36 klst fræ-gluggi** (`WINDOW_H`; mesta mælda bil keyrslna var
12,5 klst og GW2 tapaðist) · **ein uppfærsla leyfð** þegar fræ utan 12-klst
bandsins (`NEAR_H`) víkur fyrir betri mynd — aldrei eftir frest · **röð sem er
til er aldrei endurskrifuð** eftir frest (retro-fitting) · **þunn inntök →
engin skrá** · röðin ber `lead_h`. Inntökin hverfa við frestinn, svo „hvað
hefðum við sagt" er ósvaranlegt eftir á — sama rök og `history/`.

**Odds fara inn sem TAFLA (`odds.teams`), ekki skrá.** `gw1.json` var skrifuð
með skránni og ber engan markaðslið; hún stendur óbreytt og kvörðunin á að
vita það. `buildTeamMetrics` er flutt inn úr `teamstats.js` — App.jsx má ekki
skilgreina hann sjálft (`prediction-ledger.mjs` fellur).

### `data/history/` — skrifað, ólesið, MÁ EKKI EYÐA

Dagleg verðmynd (~80 KB/dag) frá 25.7.2026, óendurheimtanleg. Sleppur við
`wiring.mjs` því slóðin er sniðmát. Grisjun eftir aldri væri leiðin, ekki
eyðing. **Reglan sem greinir dautt frá vísvitandi ólesnu:** leidd og
endurgeranleg skrá má fara (`rotation`, `gameweek_shape` fóru 31.8.); dagleg
mynd ekki. Hver lykill í `OK_UNREAD` verður að vera skrá sem pipeline SKRIFAR
ENN.

### Handvirkar skriftur — EKKI í daglegu pipeline

| skrifta | skrifar | athugasemd |
|---|---|---|
| `fetch-bsd.mjs` · `fetch-bsd-teams.mjs` | `bsd_players/shots/teams.json` | ~1.400 köll; `exit 2` á tómu tímabili |
| `fetch-team-shots.mjs` | `team_shots.json` | ~660 ESPN-köll, talið eftir svæðis-texta |
| `fetch-player-gw.mjs` | `player_gw_*.json`, `fpl_player_gw.json` | per-umferðar sagan; svið sem vantar → `null` (kafli 16a) |
| `fetch-fdr-history.mjs` · `fetch-clubelo-history.mjs` | FDR 1819–2526, Elo-saga | |
| `scan-elite.mjs` | `pros.json` | ~2 M köll, ~5 klst, einu sinni á sumri |
| `rebuild-odds.mjs` | `odds.json` | úr `odds_raw/`, engin sókn; færri félög en fyrir er stöðvað |
| `start-panel.mjs` · `tests/lib/panel2.mjs` | (hleðarar) | ein útfærsla fyrir allar byrjunar-/stigalíkans-mælingar; `code`-pörun |
| `measure-prev-k.mjs` | skýrsla | `PREV_K` með CI |
| `measure-defcon-ffdr.mjs` · `measure-dc-flag.mjs` · `measure-first-start-dc.mjs` | skýrsla | DefCon-spurningarnar (kafli 4) |
| `measure-exp-points-v2.mjs` · `measure-opp-pens-shots.mjs` | skýrsla | stóra stigalíkans-beiðnin og þrjú inntök til viðbótar |
| `measure-base.mjs` · `measure-base-search.mjs` · `backtest-season.mjs` | skýrsla | grunnurinn, leitin (300 afbrigði, nested, Holm, neikvæð viðmið), gönguleikur yfir 2025/26 (kafli 15) |
| `measure-tail-to-gw1.mjs` · `measure-rival-out.mjs` · `measure-preseason-starts.mjs` · `measure-friendly-form.mjs` · `measure-friendly-dc.mjs` | skýrsla | forleiks-spurningarnar (kafli 4) |
| `measure-box-touches.mjs` | skýrsla | StatsBomb-cache ~600 MB, ~20 mín |

Allar mælinga-skriftur eru **deterministískar** (fast fræ), lesa committuð
`data/` og flytja föllin inn úr `src/` — engin formúla endurrituð.

### Cron

`fetch.yml` daglega 05 UTC · `fetch-fast.yml` á 30 mín **auk**
`*/15 10-21 * * 0,1,5,6`. GitHub þynnir `*/30` niður í 1–3,5 klst raunbil og
sleppir keyrslum að vild; kvótinn er varinn **í `fetch.mjs`**. `fetchLineups()`
og `snapshot-predictions` eru kölluð úr **`--fast`**; `fetch-fast.yml` þarf
sinn eigin `env`-blokk (án hans var `FLAGS.apisports` false og fallið sleppt
þegjandi meðan prófið sem las KÓÐANN var grænt).

### `netlify/functions/odds.js`

**Strict routing: óþekkt `path` skilar 400** (áður féll allt í bókmakera-
greinina og eyddi kvótanum). CDN-cache 60 s. `fpl-entry`, `fpl-picks`,
`fpl-league` eru þarna því FPL er CORS-lokað.

---

## 8. Viðmótsreglur sem hafa þegar verið lærðar

### Gögn og birting

- **Appið opnar á umferðinni sem er verið að skipuleggja** (`planningGw`),
  ekki `is_current` (sem FPL heldur til næsta frests). Reglan les LEIKINA
  (`fixturePlayed`): umferð í gangi er enn umferðin manns · tóm leikjaskrá
  ákveður ekkert (`[].every` er `true`) · GW38 á sig sjálf. Liðið er sótt
  fyrir `latestStartedGw` (picks 404 fyrir frest); stig og refsing eru
  núllstillt þegar sótta umferðin er önnur. Umferðar-ástandið er þrígilt
  (not started · in progress n/10 · finished), leitt af leikjunum; engin
  leikjaskrá → `null`. Vörður `planner-pitch.mjs` E9.
- **NULL ER EKKI NÚLL.** `null` → „—" grátt og raðast **síðast í BÁÐAR áttir**;
  `0` er raunverulegt núll. `Number(null)` er 0 og er villa í samningi.
  `?? 0` báðum megin mismunar býr til tölu sem er ekki til. Vörður á nefnara
  einum dugar ekki (`11 mörk / 0 mín` → efstur).
- **Tómt gildi er SLEPPT, ekki sett í 0.** Súla af lengd 0 les eins og mæld
  nulltala; FPL geymir `0` fyrir þann sem aldrei spilaði og það er ekki mæling
  (164 leikmenn efstir á `hi:false` dálki).
- **Ómæld tala fær ekki reit.** Markmenn fá hvorki mó, aó né DefCon.
- **`hi` (hærra-er-betra) er FORSENDA.** Lægra er betra fyrir verð, GC, xGC,
  spjöld og allt sem lið fær á sig — nema langskot. **Flokkurinn er sjálfur
  fullyrðing** (`bsd_blocks` eru hans eigin blokkeruðu skot, ekki vörn).
- **Ófullkomin tala fullyrðir ekki**: `incomplete`-dálkar fá gulan haus, ekki
  græna „best"-merkingu. Liða-xG/xGC koma úr BSD (r 0,369 → 0,818 gegn
  raunmörkum) og eru `season_locked`.
- **Teljari og nefnari úr SÖMU heimild og sama tímabili.** Hlutur yfir 100%
  er sönnun um tvær heimildir (`xg_share` 148%). Vörður `stats.test.mjs` 14c.
- **Leikmannanafn í `data/` er `web_name` á báðum leiðum** (archive-leiðin
  skrifaði fullt nafn, 55 stafir); leyst með uppflettingu í `players_raw.csv`,
  ekki styttingarreglu.
- **Bókmakaralína gildir um EINN leik** — sannreyndu mótherja OG dagsetningu
  alls staðar (`csFor` og `_team_cs`).
- **Andlitsmyndir eru tvær fótur og keðja** (`photoNext` í `Crest.jsx`);
  109 eru raunverulega myndalausir. Myndamirrun hafnað (44,7 MB, public).
- **Tómir dálkar eru leiddir út, ekki taldir upp**, og fjöldinn sagður í
  fótnótu. Sjálfvirk felun faldi einu sinni raunverulega villu.
- **Nótur lofa ekki lið sem er ekki í tölunni.** Vænt stig: „mínútur" og
  „form" voru í nótunni og hvorugt í formúlunni.

### Dálkaskráin (`STAT_DEFS` í `stats.js`)

- **EIN dálkaskrá, EIN röð; birtingar-röðin ER skrá-röðin.** Eyddu dálki þar
  og hann hverfur úr töflu, röðun, þröskuldum og stigatöflu í einu.
- **Fjögur svið:** `label` · `short` (≤12) · `band` · `note` (skylda, ≥12).
- **Auðgunin er `makeEnricher`** og BÁÐIR lesmátar nota hana. `fixDifficulty`
  er **send inn** frá `PlayerList` (smíðuð einu sinni í `App.jsx`). `FFDR4`
  telur næstu fjóra ÓLEIKNU LEIKI (ekki umferðir) með stöðu-skiptingu spjaldanna.
- **Blindir dálkar eru leiddir** (`gwBlindKeys`), sviðin sem þarf að bera
  yfir eru leidd (`liveOnlyRawFields`) — handskrifaðir listar stöðnuðu (13 af
  22 rangir). `sumGwRange` skilar FPL-sviðaheitum af ásettu ráði.
- **Talið sem hlutfall, ekki fast þak** (vörður með `< 40` féll þegar dálkum
  fjölgaði).
- **Síu-skrefið er leitt af `dec` dálksins**, ekki valið.
- **`starts_per_90` er ekki hlutfall**; spurningin „byrjar hann næsta?" er
  `start_prob`.

### Töflur og rúmfræði

- **ALDREI BLANDA STYTTINGU OG LANGRITUN Í SAMA STÍL** — `border` OG
  `borderRadius`. Grunnstíllinn skrifar allar fjórar hliðar/horn berum orðum.
  Vörður `react-warnings.mjs`.
- **Frosinn dálkur fær bakgrunn BEINT**, aldrei `inherit`; kant-skuggi við
  `scrollLeft > 2`. **`boxSizing: border-box` á BÁÐUM** haus og hólfi.
- **Skjá-letur er MÆLT með canvas** (6,32 px, ekki 5,9). **Allt sem situr í
  hausnum er í breiddinni — líka merki** (`headWidth`, `headBadge`, `BADGE_W`
  útflutt og deild með prófinu; `BADGE_W` leidd af stafabreiddinni).
- **Röðunar-örin er tekin frá á ÖLLUM dálkum** (yfirflæði hverfur vinstra megin).
- **Breið tafla fær sinn eigin skrun-kassa**; síðan skrunar hvergi lárétt.
- **Símahamurinn** (`narrow` < 560 px) er prófaður í `playerlist-narrow.mjs`:
  nafnahólf 140 px, tölur 66 px, andlitsmyndir 0, liðsmerki áfram.
- **Hitakortið kvarðast innan SÍAÐA hópsins**, P10–P90, `hi === false` snýr
  kvarðanum, aðeins efsti og neðsti fjórðungur litaðir, föstu dálkarnir líka.

### Litir og merki

**Grænt = í mínu liði · ljósfjólublátt = í samanburði/röðun · blátt = valinn
dálkur.** Borðinn liggur á **frosna hólfinu**, ekki röðinni. Vörður `watchlist.mjs`.

### Íkon

**Í smárri stærð er SILHÚETTAN allt** — hvert íkon á annarri grunnform-
samsetningu (víti = lóðrétt tvennd · aukaspyrna = lárétt · horn = skálína) og
er prófað í RAUNSTÆRÐ. Tveir flipar með sama tákni = ekkert tákn.

### Annað

- **Völlurinn er í venjulegu flæði** (`rowsArea` space-evenly). Skel
  `maxWidth: 1280`; leikjadálkur `minmax(280px, 340px)`; spjaldabreidd
  `clamp(62px, 17.5%, 100px)`. Responsive í `src/styles.css` (1020/760/480).
- **Lyklaborðs-fókus:** `:focus-visible`, `currentColor`, negatíft
  `outline-offset`.
- **Föst leikatriði: „fyrsti taki" er LÆGSTA RÖÐUN INNAN LIÐSINS**, ekki
  `order === 1` — FPL endurnúmeraði grunninn tvisvar á fimm dögum (13.8.).
  Sviðin eru REIKNUÐ (`spRanges`), aldrei skrifuð í nótu. Vörður
  `set-pieces.mjs` liggur á TILBÚNU liði sem getur ekki orðið tómt.
- **Grænar runur** (`greenRuns`): grænt = þrep undir hlutlausu; auð umferð
  SLÍTUR runu; `null >= 2` er `false` svo `!= null` er prófað sérstaklega;
  `borderSpacing: 0` með 2px gagnsæjum ramma.
- **Verðlaun í einka-deildum:** `Math.max(0, …)` báðum megin, námundað NIÐUR;
  notanda-gögn í `localStorage` fara aldrei í kall út.
- **Villuvörnin** (`ErrorBoundary.jsx`) er SÍÐASTA úrræði: `loadState`
  þvingar gerð hvers sviðs við lestur (`benchSwaps` er hlutur AF FYLKJUM), svo
  eitt ónýtt svið kostar bara sig. Hnappurinn er tvístiga og hreinsar alla
  `fpl_*`-lykla. Gilt ástand verður að fara í gegn óbreytt
  (`untrusted-input.mjs`). Grípur ekki async-villur.
- **Sjálfgildi í falli ver aðeins `undefined`, ekki `null`** — React-state
  sem bíður eftir neti er `null`. Notaðu `Array.isArray(...)` (kafli 13).
- **Skipta-glugginn (`selling`) má ekki fjarlægja** (bankinn, 3-per-félag).
- **`isIncoherent`-talningin verður að haldast sýnileg** (`goals_scored: 11`
  með `minutes: 0`).
- **FFDR-taflan byrjar á fyrstu ÓLEIKNU umferð** (`firstOpenGw`) — sjálfgildi,
  ekki hindrun.

---

## 9. Enska eingöngu

Tungumálalagið var **tekið út 7.8.2026**; `<html lang>` er `en`. Eftir stendur
`src/interp.js` (93 sniðmáts-setningar). Leifarnar (lötu getterarnir,
`langBtn`-stílar, `_IS`-nöfn) voru hreinsaðar 8.8. — **ekki endurvekja
getterana** (MAELINGAR 8b er fallin úr gildi).

**Allir strengir sem pipeline skrifar eru ENSKIR** (nótur, keppnisheiti,
`note:`-svið, loggar) — þeir birtast undir Data sources og á spjöldum.
**Athugasemdir eru áfram íslenskar og það er ásett**: viðmót og gögn á ensku,
rökstuðningur á íslensku.

**Vörður: `no-icelandic.mjs`.** Kafli C ver DOM-inn með lista yfir
ASCII-íslensku (52 orðmyndir, byggður á því sem lak; orð með enskri merkingu
viljandi utan hans); kafli D les `scripts/*.mjs` með skanna (ekki regexi —
`/["']/` gleypti 200 línur). AST-próf sér ekki skjáinn: keyrðu appið og lestu.

---

## 10. Tímabilið er byrjað — `gw1-checklist.mjs` vaktar

Þessi kafli bar biðlista fyrir GW1 (21.8.2026). Hann er liðinn; listinn er í
MAELINGAR.md. Það sem lifir sem regla: **`fdcouk_e0` nýs tímabils er þríbreytt
í HTTP** (404/301/300) og prófsteinninn er `Div === "E0"` (kafli 6) · BSD spáð
byrjunarlið á að **mælast gegn byrjunar-líkaninu áður en því er treyst** ·
elite-eignarhald fer ekki í líkanið fyrr en það er mælt ofan á `ep_next`
(prófið krefst merkisins „ELITE-EO MÆLT GEGN ep_next" í þessu skjali eða
MAELINGAR.md þegar 10 umferðir liggja fyrir).

---

## 11. Það sem þetta skjal getur EKKI flutt með sér

1. **Git-skilríki.** `gh auth login` eða SSH-lykill.
2. **API-lyklarnir.** Write-only í GitHub Secrets; aðeins notandinn getur
   flutt þá út staðbundið:
   ```bash
   export API_SPORTS_KEY=... ODDS_API_KEY=... EURO_API_KEY=... BSD_KEY=...
   node scripts/fetch.mjs
   ```
3. **Þitt eigið liðsástand** er í `localStorage` undir `fpl_*`. `START_IDS` í
   `smoke.test.mjs` er aðeins prófliðið.

Allt annað er í repo-inu: prófin (þau **framkvæma** ákvarðanirnar og eru
áreiðanlegri en prósa), `README.md`, `data/SCHEMA.md`, `docs/MAELINGAR.md`,
`docs/handover/` og commit-sagan.

---

## 12. LEIKMANNADÁLKARNIR — reglur úr endurreikningi allra 124 (17.8.2026)

Sjö dálkar báru rangar tölur; reglurnar sem leiða af þeim eru að hluta í
kafla 8 (teljari/nefnari, `?? 0`, FPL-núll). Það sem stendur aðeins hér:

- **Dálkur sem les hrátt FPL-svið deyr í sögulegu tímabili**
  (`pen/fk/ck_order` tómir hjá öllum í `player_seasons.json`). Sviðin sem þarf
  að bera yfir eru LEIDD (`liveOnlyRawFields`, Proxy-könnun).
- **Afrituð tafla er tvær töflur sem reka í sundur** (`ZONE_RE` →
  `scripts/espn-zones.mjs`).

### DefCon

- **Markmenn fá engin DefCon-stig — mælt** (757 umferðir, 0 stig). Dálkarnir
  bera `pos:[2,3,4]`, báðir smiðirnir sleppa GK, `DC_P0`-færslur fyrir GK
  fjarlægðar.
- **Nefnarinn eru BYRJANIR, ekki leikir** (þröskuldurinn er ónáanlegur á 15
  mín): DEF 0,2134 → 0,2632, og `p0` er reiknað úr sömu summum svo skekkjan
  kom tvisvar við. Sá sem byrjaði aldrei fær **enga röð**, ekki 0%.
- **`cbit_per_90`/`cbirt_per_90` eru per 90**, ekki per byrjun. Vörður þarf
  mann sem byrjar og er skipt af — annars gefa báðar formúlur sömu tölu.
- **Tvöföld umferð er tveir leikir** — sjá kafla 16c.

---

## 13. TVÆR REGLUR ÚR ANDSTÆÐU-PRÓFUN (18.8.2026)

**Sjálfgildi í falli ver aðeins `undefined`, ekki `null`.** `priceFloors`
kastaði `TypeError` hjá hverjum notanda með plönun þegar sóknin tók >5 ms, og
eina útgangan var að eyða öllu liðinu. Hvorugt þolprófa-safnið sá það — villan
þurfti vistað ástand OG hæga sókn í einu. Nýr kóði sem les hvort tveggja á að
prófast á báðum ásum.

**`||` bindur fastar en `?:`** — `ok(A || B || C ? true : x <= 6)` getur aðeins
fallið á `x > 6`. Sama lota: textaleit sem athugasemd uppfyllti (`//` ekki
strippað), einkvæmni sem aftanliggjandi bil slapp gegnum, `>= 20` gólf á 22
dálkum, gluggi 22 stöfum frá tómi.

> **PRÓFAÐU FULLYRÐINGUNA, EKKI BARA KÓÐANN:** stökkbreyttu því sem hún segist
> verja og sjáðu hana FALLA. Tvö aðskilin `test()` yfir sama textabút er ekki
> sama og eitt `test()` á sviðinu sjálfu (`/matchesPlayed:\s*playedByClub/`).

---

## 14. ENDURSTILLING OG TENGDA LIÐIÐ (4.9.2026)

| hnappur | hvað fer | hvað stendur |
|---|---|---|
| `↺ transfers` (per umferð) | skiptin í ÞEIRRI umferð | uppstilling, fyrirliði, chip, aðrar umferðir |
| `↺ reset GW{n}` | allt í þeirri umferð | aðrar umferðir |
| `↺ my FPL team` (haus, aðeins tengt) | öll plönun **og fyrirliðinn** | upphafsliðið (GW1-raðirnar) |

- **Hvorugur per-umferðar hnappurinn snertir upphafsliðið** — sían liggur í
  EINU falli (`clearableIn`) sem báðir kalla. Sá gamli henti hópnum þegjandi
  meðan völlurinn féll á `START_SQUAD`.
- **`↺ my FPL team` er ekki `resetAll`**: munurinn er fyrirliðinn, geymdur
  aðskilinn (`official = {gw, cap, vice}`) því sóknin skrifar `captain`.
- **Hnappurinn er í hausnum**, ekki gataður á `planMoves.length > 0` — þá var
  hann ósýnilegur þegar frábrigðið var uppstilling eða chip, og skilyrðið
  „ekkert frábrugðið" ónáanlegt (tóm fullyrðing, 5b).
- Vörður `initial-squad.mjs` R og S; fyrirliðinn borinn gegnum viðmótið.
- **NUL-bæti í prófaskrá lét `grep` þegja** (`"\0none"`) meðan JS þáttaði hana.
  Ekkert annað í repo-inu ber NUL.

---

## 15. GRUNNURINN Í VÆNTUM STIGUM — `ep_next` VAR EKKI SPÁ (4.9.2026)

**`ep_next` er FORM, ekki spá:** jafnt `form` hjá 94,2% þeirra sem hafa spilað
(mælt 31.8.2026). Bygging appsins (`grunnur × FFDR-margfaldari`) var alltaf í
lagi; grunnurinn var ekki. Leit yfir 300 afbrigði með **nested vali**,
tekna-prófi á árum, **Holm** og **neikvæðum viðmiðum sem verða að tapa** (snúið
skor −4,1) valdi `K8 · M5 · mins5+leitni · per-leik`: held-out **+0,380
topp-15, 5/5 ár**; gegn `ppg5` +0,406 (p 0,0012). Holm-varúðin er sögð: hann
lifir hana ekki, en afbrigðin eru nær-eintök og sönnunin sem stendur ein er
nested held-out. Það sem var mælt og hafnað í sömu leit er í kafla 4.

**Formúlan í appinu** (`pointsBase` + `calibrateExp`, `src/model.js`):
```
posP90   = BASE_POS_PRIOR[pos] / (60/90)
prev90   = prevPts / (prevMins/90)                  (ef fyrra tímabil er til)
w        = (prevMins/90) / ((prevMins/90) + BASE_PRIOR_M90)      M = 5
prior90  = w*prev90 + (1-w)*posP90
perMatch = (total_points + K*prior90*(60/90)) / (leikir félagsins + K)   K = 8
mínútur  = clamp(mins5 + mins_trend, 0, 90)
grunnur  = perMatch * (mínútur / 60)

vænt stig = SUM_leikir  cal(grunnur * FFDR-margfaldari)  *  tiltækileiki
             þar sem cal(x) = 0,76 + 0,96 * x^0,7   (x > 0, annars 0)
```

**Reglurnar sem formúlan ber:**
- **`M = 5` — forgildið er sjálft úrtak.** 12 stig á 88 mín gaf grunn yfir 4,8
  út á ekkert; nú dregið að stöðu-meðaltali eftir hans eigin mínútum.
- **Nefnarinn er LEIKIR FÉLAGSINS**, ekki byrjanir (blönk eru inni).
- **Kvörðunin `cal()` er einræn** svo hún hreyfir EKKI röðunina; hún lagar
  +1,61 skekkju í efsta tíundarhlutanum sem bakprófið fann
  (`backtest-season.mjs`: líkanið 4,530 · `ppg5` 4,108 · orakel 11,805 ·
  tilviljun 1,002). **Mælikvarðinn er skekkja per tíundarhlut, ekki MAE**
  (MAE-fitting stefnir á miðgildið, sem er null) og **laugin er jákvæður
  grunnur** (60% raða fá `ep_next`, ekki kvörðunina). Kvörðun per LEIK, ekki á
  summuna; tiltækileiki UTAN hennar; `ep_next`-varaleiðin ÓKVÖRÐUÐ.
- **`ep_next` heldur sér** fyrir tímabil (tölur bera fyrra tímabil) og þegar
  `mins5` vantar — „fáar mælingar → ENGIN tala". **Skilyrðið býr í
  `pointsBase`**, ekki í kallandanum (textaleit í deps-fylki stóðst
  stökkbreytingu).
- **`rotation.js` fékk grunninn líka** — annars tvær tölur undir sama heiti.
  `bestteam.js`/`captain.js` fá skorið aðflutt.
- **`Number(null)` er 0 og ekki vantandi tala** — samningur fallsins skiptir
  máli þótt útkoman á skjánum hafi verið rétt.
- **Þetta breytir skipta-ráðgjöfinni**: `transferNet` var uppblásið á toppnum
  meðan refsingin (−4) er rauntala.
- **Slembi-gólfið:** tólf hallar á STOKKUÐUM gögnum gefa miðgildi +0,020,
  hámark +0,032, og fjórir „vinna 4 ár af 5". Ars-prófið stendur Á BAK VIÐ p
  og bootstrap-CI, ekki við hliðina. Split-half fylgni með 20 punktum þarf
  **hermi-núll**, ekki bara bootstrap-CI (r allt að +0,44 kemur úr engu).
- **Okkar tala er í spá-bókhaldinu** (`base`, `exp_points`, kafli 7).

Verðir: `exp-points.mjs` (formúla á handreiknuðum tölum 4,6044; sex
stökkbreytingar), `prediction-ledger.mjs`.

---

## 16. FPL FELLDI DÁLKA ÚT OG TÓK ÞÁ UPP AFTUR — NÚLLIN LITU ÚT EINS OG MÆLINGAR (4.9.2026)

### 16a. `starts`, xG, xA og xGC birtast fyrst í umferð 16 í 2022/23

`num()` breytti vantandi gildi í 0 — rétt fyrir staka röð þar sem sviðið er
til, RANGT þegar sviðið er ekki til yfir höfuð. 2021/22 ber 0% raða með
`starts >= 1`, 2022/23 47,3% (frá umferð 16). `panel2.mjs` reiknaði
`xg90`/`startRate`/`full90` með `(x[k] || 0)` → fast 0 í 25% panelsins.

**Þrjár lagfæringar, allar leiddar:** svið sem bar aldrei gildi það tímabil →
`null` · svið sem kemur inn á miðju tímabili: fyrsta umferð með gildi > 0
markar upphafið (forsendan sögð: ~220 byrjunarliðsmenn per umferð) ·
`panel2.mjs` summar yfir raðir sem bera gildi, `hasXg`/`hasStarts` segja hvort
glugginn átti gögn.

### 16b. Leitin endurkeyrð á heiðarlegri laug — niðurstaðan stendur

`--pool=starts` (101.508 raðir): besta afbrigðið gegn líkaninu í appinu d
topp-15 +0,003 CI [−0,272, +0,108], d MAE +0,0146 VERRA. Fasi B og C falla enn.

### 16c. Tvöföld umferð er TVEIR leikir — báðir DefCon-smiðirnir töldu einn

Summan var borin að þröskuldi sem er per LEIK (10+8 = „hit" upp á 18). Mælt
2025/26: 76 byrjanir týndust, 32 draugahittir. Vörðurinn var grænn af því að
hann las samanlögðu skrána (afrit staðfesti afrit) — viðmiðið er nú
`fpl_player_gw.json` (ein röð per LEIK).
- **Lifandi smiðurinn** les `explain` (ein færsla per leik), teljari þakaður
  við byrjanir.
- **Sögulegi smiðurinn**: `starts >= 2 && dc >= th` er ÓÁKVARÐAÐ og fer út úr
  BÁÐUM teljara og nefnara (`undecided` skráð).
- `DC_P0_PRIOR` endurmæld per leik: DEF 0,256 · MID 0,163 · FWD 0,011.
Verðir: `defcon-shrink.mjs` 6a/6b, sex stökkbreytingar.

### 16c-2. „Fixtures API deactivated" — 200 sem er ekki gögnin

Sjá kafla 6 (ClubElo). Rauðu raðirnar í Data sources eru ekki allar bilanir:
`elo_api` rautt við hlið `elo` grænt er hönnunin; `apisports_*` lagast aðeins
hjá veitunni; `prediction_ledger` „utan 36 klst gluggans" er rétt hegðun.

### 16c-3. Meiðsla-heimildin: rauð röð er rétta svarið

Gatið er 14 leikmenn af 652 (2,1%) og aðeins líkamshlutinn — `chance_of_playing`
er til fyrir alla. FotMob ber margræð `injury.id`, sportsgambler bætir 5 röðum
með 0,8% eignarhald og endurkomudagur skeikar 22 dögum milli heimilda. **Þögn
félaganna, ekki gagnaskortur.** Rauða röðin ber þessa ástæðu.
**Og áhættulistinn birti `reason` ytri heimildar FEITLETRAÐ FREMST** með
FPL-fréttina stytta á eftir — það sneri grunnreglunni í kafla 6 við. Nú leiðir
FPL-fréttin. Vörður `smoke.test.mjs`.

### 16d. Hve langt aftur ná gögnin? — mælt

FPL bar `tackles`/`cbi`/`recoveries` 2016-17 til 2018-19, felldi út 2019-20,
tók upp 2025-26. Gömlu árgangarnir eru stigvaxandi vanskráðir (`tackles == 0`
52% → 65%) og ónothæfir í DefCon. FotMob `/matchDetails` nær aftur til 2016-17
(27/27 nákvæm á yfirlapinu), ~2.280 köll fylla 2019-20 til 2024-25. **Sér
ákvörðun, ekki tekin** — virðið er þrautseigja milli tímabila, sem er prófið
sem næsta DefCon-spurning þarf.
