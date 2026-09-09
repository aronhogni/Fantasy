# HANDOVER — NFL appið (`nfl/`), 19.8.2026 (v3)

**Draftið er 21.8. — innan við tveir sólarhringar.** A-kaflinn verður að klárast
fyrir það; annað má bíða. Reglur óbreyttar (README fyrst — nýir kaflar 4l
(FLEX_SPLIT.TE), 6i–6k, ledger-kaflinn; tölur mældar; per-leikmanns bootstrap
er ráið; mutate-aðu allt).

**Staða 19.8. í hreinu umhverfi:** 24 af 25 svítum grænar ×3 keyrslur (aðeins
`visual.mjs` sleppt — Chrome ræsist ekki í sandkassanum; **keyrðu hana lókalt
fyrir draftið**, hún er eina útlitsvörðurinn). Appið byggt og öll töpp
skjámynduð — útlitið er sterkt (sjá E). Lotan 15.–18.8. klárar nánast allt úr
v2: flexsplit committað + h2h-drift horfið, DST-vörðurinn tvíátta, mock-draftið
KEYRT (7+1 villur fundnar og lagaðar), borð-per-draft lyklun, meiðsla-blindni
draftráðgjafar löguð (Kittle-málið), viku-samhengið tímabilslyklað,
advice-ledger byggt, snap-gögnin komin í weekly (99,8%), FLEX_SPLIT.TE mælt á
réttum lögnum og sveipað (0,193 stendur — 0 hólf standast bar).

---

## A. FYRIR DRAFTIÐ 21.8.

**A.1 🔴 STÖÐVANDI VILLA: að slá draft-id inn Í HENDI eyðir ÖLLUM geymdum
borðum — líka því sem þú ert að drafta.** `DRAFT_ID_RE` (`data.js:363`) tekur
6–32 tölustafi; `DraftBoard.jsx:1382` uppfærir `sync.draftId` við HVERT
ásláttarslag; `:200` kallar `touchBoardScope` við hverja scope-breytingu; og
LRU-listinn er **8 sæti** með `dropScopedState` á öllu sem dettur út. 19 stafa
id = 14 milliskref = listinn yfirfyllist og **nfl_taken/myPicks/sync fyrir öll
fyrri borð er eytt** (endurskapað: 59 pick borð → 0). Þetta brýtur einmitt
invariantana sem boardScope-vinnan setti. *Lagfæring:* `DRAFT_ID_RE` →
`{16,20}`, debounce-a scope-skiptin, og `touchBoardScope` má aldrei evikta
fleiri en eina færslu per kall. *Vörður:* draft-live §15 fær tilfelli sem slær
id inn staf fyrir staf og krefst þess að fyrri borð lifi.

**A.2 🔴 ESPN er 403 í CI — 32 rauðar línur, og `market.json`/`teams.json`
eru 10 daga gömul inn í draftið.** Refusal-hliðin virkuðu rétt (ekkert
yfirskrifað) og Sources-flipinn segir frá — en `sos`-dálkurinn (846 raðir) og
Market-flipinn hvíla á 9.8.-skrá. Athugaðu fyrir föstudag hvort þetta er
Actions-IP-blokk (prófaðu annan User-Agent / keyrðu stage-inn lókalt og
committaðu ferskt market/teams í hendi ef þarf). **Afleidd og verri afleiðing:
news-safnið hefur MISST 5 daga í röð** (ESPN-news skilar 3–4 greinum < minRows
20) — serían er óendurskapanleg; hver dagur í viðbót er varanlegt gat.

**A.3 Fyrir draft-kvöldið, gátlisti:** keyrðu `visual.mjs` lókalt; mock-draft
generalprufa er þegar gerð (sjö villurnar + boardScope-lekinn lagaðir og
varðir) en LIFANDI pollun gegn alvöru API og DREGIN draft-röð eru enn
óprófaðar — fyrsta raunprófun er kvöldið sjálft; þristands-ljósið
(connected / wrong shape / not connected) er nýtt — staðfestu að það sé GRÆNT
þegar þú tengir alvöru deildina (mock-lærdómurinn: rangt lið = 6 WR í 7
umferðum); K/DST koma úr sinni töflu seint (mustFill segir frá); og mundu
skjalaða lesninguna: **TE-buy-merkin tólf eru öll sama veðmálið** —
`maxPos.TE = 2` ver þig, ekki röðin.

**A.4 `NFL_LEDGER_USER`** — eina handvirka skrefið fyrir viku 1:
`gh variable set NFL_LEDGER_USER --body "<sleeper-notandanafn>"`, annars ber
hver ledger-lína `startsit: null`.

## B. Villur fundnar 19.8. (sannreyndar, file:line)

1. **„0 af 102 frumum"-fyrirsögnin er röng tala á fjórum stöðum** (README 4l
   ×3, `model.js:140`, `Sources.jsx:165`, `tests/model.mjs:254`): measure-
   skrárnar bera 144+32 hólf (126+28 samanburði); „81" er úr ÖÐRU neti
   (vbd-afbrigðin) og „21" sleppir fjórða prefixinu. Niðurstaðan er ÓBREYTT
   (ég endurkeyrði barinn: 0/126 og 0/28) en talan er á skjánum og ekkert próf
   telur hólfin — nákvæmlega „athugasemd sem ekkert próf getur fellt" sem sama
   lota lagaði fyrir DST. Teldu úr skránum + assertion.
2. **Ledger-glugginn: rökin röng fyrir september.** README segir „þrjú
   tækifæri á 48 klst" reiknað úr cron-línunum — en ágúst/sept-cron keyrir
   ÁTTA sinnum á dag → **16 tækifæri**, fyrsta skrif fellur á FYRSTA
   augnablik gluggans (48,0 klst fyrir akkeri; ~6,7 dagar fyrir
   sunnudagsleikina, ekki „~2,5") — FPL-„222 klst"-villan í smækkaðri mynd.
   Prófið prentar rétta tölu en assertar bara `>= 2`. Ákveddu: annaðhvort
   þrengja gluggann/seinka skrifi (t.d. skrifa við SÍÐASTA cron fyrir akkeri)
   eða skjala meðvitað að fyrsta-skrif-frysting sé valið — og láttu prófið
   asserta raunverulegan fjölda.
3. **`mean([]) → null` breytingin taldi kallendur „tæmandi" en missti af
   þriðja:** `advice-lab.mjs:110` (`mean(...).toFixed(1)` → TypeError á tómu
   ári) og `:97` breytir null þegjandi í 0 (`null * 10`) — einmitt villan sem
   breytingin átti að drepa. Og **gamla formúlan lifir enn í `src/`**:
   `accuracy.js:59` ber `/ (xs.length || 1)`. Lagaðu báða + fjarlægðu
   tvítekninguna eða skjalaðu hana.
4. **`defSeason == null`-nótan er bara í Dashboard:** `MyTeam.jsx:98` notar
   sama `weekContext` og sýnir viku-1 lineup án varnarliðar ÞEGJANDI. Sama
   „lærdómur lærður á einum stað"-mynstur og skráin sjálf vitnar í. Flyttu
   nótuna.
5. **Snap-merge hálfskráar-vörðurinn enn `< 100`** (~1,5% af 6.637) — og nú
   ver hann RAUNVERULEG gögn í weekly/*.json; hálf skrá skrifar null yfir
   ~3.600 raðir. Hlutfall af fyrra ári (brúar-vörðurinn `< 1000` sýnir
   mynstrið).
6. **Sidelined-boxið er óklippt:** 13 nöfn, tólf óviðkomandi (Bridgewater
   VBD −288) kaffæra þann eina sem skiptir máli (Kittle) — sást skýrt á
   skjámyndinni. `vbd > 0` eða topp-N + „and N others".
7. Smærra: prósatalningar skakkar um einn („ellefu gildi" í tveimur UI-
   athugasemdum, AVAIL ber tólf; „Þrennt annað" = 4 liðir í röð 1,2,4,3;
   „Sjö villur" = 8 raðir); tvö „4b"-kaflaheiti í `render.mjs` (README vísar í
   annað þeirra); `weekly-ecr`-viðgerðin góð en depth-`formation` ber enn
   pos_grp í nýja skemanu (ósnert úr v2); `PRIOR_FIT_SCALE` dautt export í
   FJÓRÐA handoverinu — eyddu því núna; today-vörðurinn nær enn bara yfir
   trending (fimm seríur án dagsvarðar); TD-props enn ókallað — þarf writeOnce-
   seríu fyrir byrjun september.

## C. Stórar niðurstöður lotunnar sem eiga að STANDA (ekki endurvinna)

`FLEX_SPLIT.TE = 0,193` stendur eftir 154-hólfa sveip á báðum metríkum — en
trúnaðarmörkin eru nú skjalfest: á ÞÍNUM lögnum mælist occupancy 0,073/0,083,
svo þverstöðu-TE-merkin eru ÓSTAÐFEST spá, ekki sterkasta merkið (Sources
segir það nú). · trending-yfirskriftin var mæld (100% morgunsnappa tapast) og
frestað MEÐ rökum — tímalyklun er rétta lausnin eftir draft. · h2h/waiver
drift er horfið. · minGain-hliðið sem flippaði við flex-lagfæringuna er tekið
í sundur í 4g og höfnunin stendur.

## D. Eftir draftið (röð)

1. B.1–B.3 hér að ofan + `usageblend`-vírunin (accFit-stuðlar úr usage-lab á
   disk + pípan skrifar `weekly/2026.json` — ROS-gjaldmiðillinn fylgir, með
   hlutfallsreiknuðu gólfi). 2. Snap-handcuff og snap-probe (gögnin loks til).
3. `stream-lab` QB/TE/K þegar vikuspár safnast (weekly-proj glugginn opnast
   ~6.9.). 4. winprob-lineup-lab á h2h-primitívunum. 5. today-verðir á allar
   seríur + status-línur. 6. Skuggabókhaldið er komið (advice-ledger) — eftir
   3–4 vikur fyrsta kvörðunarskýrslan.

## E. Útlit (skjámyndað 19.8., desktop + sími)

Sterkt: Draft-flipinn skýr með græna „Pick 1"-kortinu, sidelined-boxið
heiðarlegt (en sjá B.6 um þéttleikann), Players-taflan með meiðsladálk og
hitakóðun læsileg, Dashboard-tómstaðan segir nákvæmlega hvað á að gera,
Sources-bannerinn („32 sources failed. Columns fed by them are blank, not
guessed") er til fyrirmyndar, síminn brotnar hvergi. Tvö atriði: **(a)**
Sources-nótur blanda ensku og ASCII-íslensku („266 radir, 130 KB" við hlið
enskra) — ein átt, þetta er notendaflötur; **(b)** falda flipa-röðin („… More")
opnast ekki fyrr en eftir fyrstu flipaskipti — staðfestu að það sé viljandi.

## EKKI gera
Allt af gamla listanum + úr þessari lotu: ekki hreyfa FLEX_SPLIT.TE án nýrrar
mælingar (0/154 hólf); ekki „laga" mustFillUrgent með picksLeft>0 (rökin í 6k);
ekki setja room-greiningu, meistaraprósentu-metrík né vikuspá-sem-gjaldmiðil
aftur á dagskrá.
