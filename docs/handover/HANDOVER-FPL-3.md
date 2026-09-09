# HANDOVER — FPL appið, 19.8.2026 (v3)

**GW1-deadline er 21.8. kl. 17:30 UTC — innan við 48 klst.** Röðin hér að neðan
miðast við það. Reglurnar standa óbreyttar (CLAUDE.md fyrst; tölur mældar;
mutate-aðu hverja lagfæringu; `git pull --rebase`; `git add <skrár>`; prófin
þrisvar + `npm run build` fyrir push).

**Staða:** Full yfirferð 19.8. í hreinu umhverfi: 64 af 65 svítum grænar,
build grænt, appið keyrt í alvöru Chromium og öll töpp skjámynduð í desktop-
og símabreidd — útlitið er hreint (sjá D). Lotan 16.–18.8. lagaði nánast allt
úr v2 (▼-merkið, bigChances-vírunina, pos-lekann — sem reyndist 410 raðir/1.535
gildi, ekki 13 — borðann, elo_age, FIT-úttektina, sjö rangar leikmannatölur,
DefCon-pípuna þrefalt). MAELINGAR:3294 leiðrétti fjórar v2-fullyrðingar; lestu
þann kafla.

---

## A. STÖÐVANDI: committaða tréð vísar í ÓTRACKAÐAR skrár — `npm test` er
rautt á hverju fersku kloni

`tests/run-tests.mjs:19` ber `captain.mjs` í SUITES, MAELINGAR:3974 skjalar alla
C.2-mælinguna, og `SetPieces.jsx:272` vísar í `src/captain.js` — en **hvorug
skráin er í git** (`?? src/captain.js`, `?? tests/captain.mjs`). Ferskt klón
fær `HEILD: 1 af 65 prófasöfnum féll` með TÓMU captain-blokki því
`run-tests.mjs` pípar stderr (`stdio: ["ignore","inherit","pipe"]`) — bilunin
er kyngd. Og einn dev-commit (54ca944) er enn ópushaður.
**Gerðu strax:** `git add src/captain.js tests/captain.mjs && git commit` +
push á allt. Íhugaðu líka að `run-tests.mjs` prenti stderr þegar svíta fellur.

## B. Fyrirliða-módúllinn (captain.js) — mældur, ókláraður

Vinnan er góð (tveir liðir: `expPointsFor × startProb`; +1,05 yfir naive 5/5
tímabil; vítayfirlag mælt og FELLT −0,08/−0,30/−0,33; heiðarlega skjalað að
hann er EKKI aðgreinanlegur frá rankScore). Fjögur atriði áður en hann telst
kláraður:
1. **Enginn kallari í `src/`** — 13,7 KB dautt módúl; App.jsx captain-valið er
   enn handvirkt. Vírun: birta topp-3 með dreifingunni (`CAPTAIN_MEASURED` er
   exportað einmitt til þess) við captain-selectið í Planner.
2. **`vsRankScore` er reiknað með veikari aðferð en allt annað í skránni:**
   normal-nálgun yfir umferðir gefur +0,351; bootstrap klasað per leikmann —
   staðallinn sem hausinn VITNAR í — gefur **+0,096** [−0,54, +0,51]. Sama
   niðurstaða (ógreinanlegt) en birt punktmat er 3,7× of hátt. Endurreiknaðu
   með klasaða bootstrapinu og uppfærðu töluna.
3. **Strengja-gildran:** FPL skilar `ep_next` sem STRENG; `captainScore`
   krefst `Number.isFinite` → frambjóðandi þegjandi FELLDUR og `bestCaptain`
   skilar null, sem er líka lögmætt svar. Sá sem vírar þarf annaðhvort
   `Number()`-þvingun í `rankCaptains` eða vörð sem fellur á streng.
4. Smáatriði: hausinn (`captain.js:94`) fullyrðir að SetPieces-setningin lifi
   enn — hún var löguð; og dagsetningar stangast á (16.8. vs 17.8.).

## C. Villur fundnar 19.8. (allar sannreyndar með file:line/repro)

1. **`RowPhoto` gengur EKKI photoNext-keðjuna** (`PlayerList.jsx:56-59`) meðan
   CLAUDE.md:711 og `Crest.jsx:92` fullyrða að allir fjórir notendur geri það.
   67 leikmenn (félagaskiptin: Meslier, Bruno G., Garnacho...) fá staf í stað
   myndar í AÐALVERKFÆRINU. Lagfæring: sama onError-keðja og Compare/Imminent;
   vörður sem grep-ar alla fjóra notendur fyrir `photoNext`.
2. **66 markmenn fá enn „DefCon opportunity"-línu** í ráðgjafarglugganum
   (`Compare.jsx:212`, `element_type <= 2` = GK+DEF) — og MAELINGAR:3423
   fullyrðir að þetta hafi verið lagað. Mælt: 663 GK-umferðir, 0 DefCon-stig.
   Réttlætingar-athugasemdin vísar í `scoreOf`-reglu sem var EYDD 18.8. þegar
   `dcB` fór úr recommend. `<= 2` → `=== 2` + próf sem telur GK með dc-línu = 0.
3. **Elo-diagnostíkin er klippt nákvæmlega þar sem upplýsingin býr:**
   `fetch.mjs:1122` sker error-strenginn við **150 stafi** — sex tilraunir
   rúmast ekki, svo keyrsla sem blandar throttlun/429/tómu svari les sem hrein
   throttlun (staðfest á lifandi status: strengurinn endar á „#4 The opera").
   Og `tests/elo-fetch.mjs:67` krefst `>= 3` merkja — gólfið er sett Í
   klippingunni. Hækkaðu í ~330 eða þjappaðu (`4× timeout | 1× 429`), assertaðu
   `=== tries`. **Samhengið:** elo hefur verið rautt síðan ~14.8. og
   `elo.json` er 5,4 daga gamalt → `eloStale = "bad"`; GW1-FFDR keyrir á
   14.8.-Elo nema það náist ferskt — eða skjalaðu það meðvitað.
4. **fdcouk svarar nú HTTP 300, ekki 301** — hannaða græna „waiting"-slóðin er
   ónáanleg (fetch fylgir ekki 300) og rauða línan ber bara töluna „300".
   `tests/fdcouk-e0.mjs` stubbar textann og á EKKERT non-2xx tilfelli. Meðhöndlaðu
   300 eins og 404/301-í-EC (bið, ekki bilun) + próf; uppfærðu CLAUDE.md §10
   (þriðja leiðréttingin á sömu röð — 404 → 301 → 300).
5. **Tímasprengja við GW1-lok:** þegar `events` ber fyrstu kláruðu umferðina
   flippast sjálfgefna tímabilið í Compare í „2026/27", `bigChances` verður
   aftur 0/592 og TVÖ assertion í `compare-visual.mjs` (:185, :189) verða rauð
   — í sömu viku og draftið. Ákveddu NÚNA: pinna ráðgjafann á BSD-skrána sem
   ber shot map (nótan lofar hvort sem er „2025/26 only") eða endurorða
   vörðinn. Skjalaðu að „316 af 587"-mælingin lýsir forleik.
6. **`tests/recommend.mjs:117` harðkóðar git-SHA í npm test** (`git show
   264a50c:...`) — fellur í shallow-kloni/tarball (það var eina rauða svítan
   hjá mér) og sleppir 7 assertion-um þegjandi gegnum `if (FZ)`. Jafngildis-
   sönnunin er einskiptis-mæling: færðu hana í `scripts/` + MAELINGAR-færslu.
7. **Tátólógía í nýju prófi:** `stats.test.mjs:1030` fyrri helmingurinn ber
   segð saman við sjálfa sig (`headWidth(d,false) === headWidth(d,false)`) —
   alltaf satt. Sama villuklasi og §13 var skrifaður um, þremur línum frá.
8. **BSD er alveg niðri** (HTTP 400 á seasons-endapunktinum í öllum þremur
   notendum) og CLAUDE.md §6 segir enn „200, ókeypis". Uppfærðu töfluna; engin
   BSD-spáð byrjunarlið fyrir GW1-mælinguna og §5.10-sprengjan helst virk.
9. Smærra: `defcon`-tómkeyrsluvörðurinn frystir líka fersku `opportunity`-
   töfluna án þess að nótan segi það; `collectPros` vantar `--dry` (fyrsta
   alvöru keyrslan 21.8. er án generalprufu); friendly-skriftirnar eiga enn
   enga MAELINGAR-færslu.

## D. Útlit (skjámyndað 19.8. í Chromium, 1440px + 390px)

Heildin er hrein: Planner þéttur og læsilegur, Player stats með bönd/litakóða
rétt, Teams sýnir „—" fyrir nýliðana og elo-öldrun með rauðum þríhyrningi,
Set pieces ber leiðréttu fyrirliða-setninguna, síminn brotnar hvergi. Tvö
atriði: **(a)** Team of the week í Gameweek notar full lagaleg nöfn sem
klippast („Bruno Borges Ferna…", „João Maria Lobo Alv…") meðan allt annað
notar web_name — skiptu í web_name; **(b)** nýliðalið vantar aerial-threat
línu í Set pieces-kortum (gagnadrifið — í lagi, en mætti sýna „—" með nótu í
stað þess að fella röðina).

## E. Röðin næstu 48 klst

1. A (commit + push) → 2. C.3/elo (ferskt Elo eða skjalað) → 3. C.5-ákvörðunin
→ 4. C.1/C.2 (RowPhoto + GK-dc, bæði lítil) → 5. ledger-vaktin á
deildardaginn: glugginn opnast ~05:30 UTC 21.8., `coverage` á að sýna
start_prob ~460/592, og `prediction_ledger`-línan á að verða til í status →
6. eftir GW1: C.4, C.6, B-vírunin, `csFor`/chip-úttektin (enn í App.jsx),
BSD-lineups-mælingin GW1–4, E0-2627 blöndunarmælingin.

## EKKI gera
Allt í CLAUDE.md §4 óbreytt, plús úr þessari lotu: ekki setja vítayfirlag í
captain-röðina (mælt, fellt), ekki „samræma" A.4-availability án mælingar, ekki
selja fixture-þyngd sem captain-merki (ógreinanlegt við N=1).
