# HANDOVER — FPL appið, 15.8.2026 (v2)

Þú tekur við eftir úttektarlotuna 14.8. sem lagaði sjö lifandi villur úr fyrra
handoveri og leiðrétti fjórar fullyrðingar þess (sjá `docs/MAELINGAR.md:3170` —
lestu þann kafla; leiðréttingarnar eru hluti af samhenginu). Reglurnar standa:
`CLAUDE.md` fyrst, tölur mældar ekki valdar, mutate-aðu hverja lagfæringu,
`git pull --rebase` fyrst, `git add <skrár>` aldrei `-A`, prófin þrisvar +
`npm run build` fyrir push. Fullkeyrsla 15.8.: **öll 61 prófasöfn græn.**

**Staða fyrra handovers, stutt:** A.1 (last_gw), A.2 (GK mó/aó — lagað dýpra:
pos-þvingun á einum kvörnpunkti í `stats.js:703`), A.3a (dc-vírun), A.5
(rowsOf + fjórði staðurinn), A.6 allt (FLAGS.espn EYTT með rökum, tóm-skrifa-
vörður, bsd_live.shots fjarlægt, pros-control lagað, doc-drift) = **lagað og
varið**. A.4 = **viljandi ósnert og skjalað** (hvorug talan er mæld — ekki
endurvekja án mælingar). Auk þess fundust og löguðust: E0-2627 bar National
League undir grænu ljósi, og `start_prob` í spábókhaldinu var null fyrir alla
584 (prófið staðfesti villuna sem hegðun) — nú 459/584 með þekju-tölu.
C- og D-kaflarnir (sölu-ráðgjöfin, captain, archív) eru enn ósnertir.

**Tímapressa: GW1-deadline 21.8. kl. 17:30 UTC — sex dagar.**

Sannreyndu fyrst: `npm ci && npm test && npm run build`, og rauðar línur í
`data/status.json` (elo var `ok:false` með timeout 15.8. en `elo_age` græn 23,2h
— það er einmitt hléskennda mynstrið sem `elo_age` var smíðuð fyrir).

---

## A. Nýjar villur, allar sannreyndar í kóðanum 15.8.

**A.1 `Compare.jsx:478` — skýringin lofar ▼-merki sem er ekki lengur til.**
„Töfluvæðingin" 14.8. eyddi `VisualRows` og þar með eina staðnum sem rendraði
▼. `grep "▼" src/Compare.jsx` skilar EINNI línu — skýringunni sjálfri. Röðin
sem skiptir mestu (níu `hi:false`-raðir: verð, spjöld, mörk fengin...) ber því
ekkert merki en notandanum er sagt að leita að því. Prófið getur ekki gripið
þetta: `tests/compare-visual.mjs:100` gerir `.replace("▼","")` sem er no-op.
*Lagfæring:* rendra ▼ í `tdK`-hólfinu fyrir `hi:false`-raðir (eða fella
setninguna) + próf sem krefst þess að merkið sé til áður en það neitar neinu.

**A.2 `Compare.jsx:405` — `bigChances` er ENN dautt í framleiðslu: 0 af 584.**
Vírunin frá 14.8. valdi BSD-skrá með `files.find(f => f.season === season)` en
fær `season={currentLabel}` = **„2026/27"** — `bsd_players.json` ber
`"2025/26"` og `bsd_live.json` er ekki til fyrr en eftir 21.8. Uppfletting
skilar því null og `bigByCode` er tóm. Mælingin sem MAELINGAR bókar (316
leikmenn) var gerð gegn 2025/26-skránni; nóta ráðgjafans lofar sjálf „from the
BSD shot map (2025/26 only)" (`advisor.js:259`). Vörðurinn er holur: regex yfir
`src/` sem finnur framleiðanda í texta. *Lagfæring (eitt tákn):* sendu `season`
-state Compare-gluggans (sjálfgefið `seasons[0]` = 2025/26) eða pinnaðu á
skrána sem raunverulega ber shot map. *Vörður:* keyrðu `advise()` gegnum
alvöru `data/` og krefstu `bigChances != null` fyrir >100 leikmenn.

**A.3 `PlayerList.jsx:~580` — pos-vörðurinn er sniðgenginn í GW-bils-ham.**
Kvörnpunkturinn (`stats.js:706`) hleypir röðum án `element_type` í gegn
(rétt fyrir prófgögn) — en `sumGwRange`-raðirnar í sögulegu tímabili með
GW-bili bera ekki `element_type`, svo framherjar fá aftur `Clean sheet %`,
`Goals conceded`, `xGC per 90` — nákvæmlega lekinn sem var lagaður fyrir
season-ham. Endurskapað: FWD-röð án element_type fékk 13 pos-læst gildi.
*Lagfæring:* `element_type: p.element_type` inn í src-spreadið. *Vörður:*
stats.test §15 keyrt líka á gw-range-lagaða röð.

**A.4 `PlayerList.jsx:1161` — „season totals"-borðinn getur nefnt rangan hóp
og mótsagt sýnilegum dálki.** Í custom-ham heldur `group` síðasta gildi (t.d.
„Basics") þótt notandinn horfi á allt aðra dálka, og `total_points` (pinnað,
ekki blint) breytist með bilinu meðan borðinn fullyrðir að allt sé árstala.
*Lagfæring:* borðinn les `mode` og telur aðeins sýnilega+pinnaða dálka.

**A.5 Smærra, tekið í einni lotu:**
- `fetch.mjs:3661` — `elo_age` skrifar ENGA línu ef `updated` er óþáttanlegt
  (`if (Number.isFinite(ageH))` án else) — þögla eyðan sem blokkin á að hindra.
- `measure-friendly-*.mjs` — `--json` skrifar á harðkóðaða macOS-scratch-slóð
  (ENOENT annars staðar); og hvorug skriftan er skráð í CLAUDE.md
  handvirka-lista né á MAELINGAR-færslu — gegn eigin lokareglu handoversins.
- `CLAUDE.md:466` segir FotMob „404/gated" meðan `measure-friendly-dc.mjs:24`
  sannar hið gagnstæða (slóðin breyttist í `/api/data/matchDetails`); sama
  úrelding um fdcouk-2627 „404" á `:456` og `:921` (raunin er 301→EC).
- `tests/player-gw-range.mjs:192` — „108 dalkar" lifði dálkatalninguna af.
- `Compare.jsx:524` — `S.vGrp` dauður stíll; og `dc`-línan er send fyrir
  `element_type <= 2`, þ.e. 65 MARKMENN fá „DefCon opportunity"-línu — sama
  „ómæld tala fær ekki reit"-brot og mó/aó var (spegla `scoreOf`? mældu/skjala).
- `snapshot-predictions.mjs:285` — athugasemdin um status-skrif lýsir daglegu
  keyrslunni en fallið keyrir í fast-jobbinu (status_fast); ≤30 mín sjálfheilun
  en villandi. `pros-collect.mjs:227` ber `__outcomeAdded` áfram af diski.

---

## B. Fyrir GW1 (21.8. 17:30 UTC)

**B.1 Ledger-vaktin, síðasta skrefið:** status-línan er komin en enginn vörður
segir „glugginn er OPINN og engin skrá kom". Bættu í fast-workflowið: ef
`hoursToDeadline < 12` og `data/predictions/gw{N}.json` vantar eftir keyrslu →
rauð lína í status (og helst í README-badge). Einskota tækifærið stendur.

**B.2 Generalprufa á ledger + pros-collect saman:** keyrðu `buildSnapshot` og
`collectPros` handvirkt á deadline-daginn −1 með þurrkeyrslu; staðfestu
`coverage`-blokkina (459/584 start_prob er talan í dag) og að control-hópurinn
skrifist (nýja `dirty`-flæðið, 3 skrif í prófinu).

**B.3 E0-2627 blöndunarákvörðunin stendur enn** (nú með réttri lýsingu í
`wiring.mjs:83`): mæla fyrst, ákveða svo — óbreytt frá fyrra handoveri.

---

## C. Stærri verk í forgangsröð (óbreytt skuld + eitt nýtt)

**C.1 Sölu-ráðgjöfin (`App.jsx:1557–1727`)** — enn ANNAÐ stigalíkan (`FIT`) með
níu ómældum föstum og DefCon inni þvert á mælt-og-fellt. Stærsta einstaka
skuldin, þriðja handoverið í röð. Dragðu í `src/recommend.js`, mældu hvern lið
sem yfirlag (LOSO, ákvörðunar-metrík), fjarlægðu það sem fellur, vörður.

**C.2 Captain-ráðgjöf** — ekkert til enn; `penalties_order` er sterkasta staka
merkið skv. dálknótunni. Mæld captain-röð (expPointsFor × start-líkur; víti
sem yfirlag) bakprófuð á `fpl_player_gw.json`; viðmið EO-toppur og ep_next.

**C.3 `csFor`-fossinn og `chipValue`/`bestGwFor`** úr App.jsx í hrein módúl + próf.

**C.4 Archív sem glatast:** hrá Odds-API verð (aðeins afleiður geymdar),
FPL `events`-crowd-sviðin (most_captained o.fl.), ESPN officials. Sömu rök og
`data/history/` — verður ekki endurskapað. Ódýrt, fyrir GW1 ef hægt.

**C.5 FotMob-áreiðanleiki** — fyrst CLAUDE.md-taflan er röng: uppfærðu hana, og
láttu `measure-friendly-form` fullgilda FotMob gegn ESPN-liðstölum þegar alvöru
PL-leikir byrja (validation-hlutinn er skrifaður; í dag „UNVERIFIED").

**C.6 `bsd_odds` fallback-vírun, `data/history/` fyrsti lesandi, panel-mæling
eftir ~10 umferðir, kvörðunarskýrsla á skjá** — óbreytt frá fyrra handoveri.

## EKKI gera
CLAUDE.md §4-listinn allur óbreyttur (ferðalög, DefCon-í-röðun, heitur
leikmaður, xGChain, box-touches, PSxG-afleiður, dómaraspjöld, sjöunda þrep,
crowd-transfers, lítið panel o.s.frv.) — og nú líka: ekki „samræma" A.4 á 0,5
án mælingar, og ekki endurmæla vináttuleiki sem form-merki (mínútur eru merkið,
mörk ekki — skjalað í báðum friendly-skriftunum).

Keyrðu `npm test` þrisvar fyrir push og skráðu hverja mælingu í MAELINGAR —
líka þær sem falla. Byrjaðu á A.2 (eitt tákn, mæling þegar til) og A.1.
