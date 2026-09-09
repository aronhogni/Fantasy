# HANDOVER — það sem EFTIR ER úr `docs/KODARYNI-2026-08-24.md`

Skrifað 25.8.2026 af session `fantasy-48`. **Allt hér að neðan var
SANNREYNT Í KÓÐANUM rétt áður en þetta var skrifað** — ekki afritað úr
Fable-skjalinu. Það skiptir máli, því **§4 og T4 í því skjali eru
ónákvæm**: af níu „dauður kóði"-atriðum stóðust **þrjú** athugun, og
**hvert einasta** „tvítekning"-atriði reyndist FRÁVIK AÐ ÁSETTU RÁÐI.
Sjá „Mælt og hafnað" neðst — **ekki taka þau upp aftur.**

`origin/main` er **`954fd5d`** þegar þetta er skrifað. Þrjár lotur
unnu samtímis í sama vinnutré; allt er pushað og vinnutréð er hreint.

---

## 0. LESTU ÞETTA FYRST — VINNULAG SEM KOSTAÐI TÍMA Í NÓTT

**Þrjár lotur deila EINU vinnutré og EINNI grein.** Fjórar gildrur, allar
raunverulegar:

1. **ALLAR ÞRJÁR `git commit`-leiðir leka í þessu tré.**

   | leið | tekur það sem þú skoðaðir EKKI |
   |---|---|
   | bert `git commit` | **stagead** vinna annarrar lotu (`MM`-skrá) |
   | `git commit -- <slóðir>` | **endurles vinnutréð** → ÓstageADAR breytingar þeirra |
   | `git add` + hvort sem er | erfir gatið sem commit-formið hefur |

   Ég tók vinnu annarrar lotu inn í mína commit **tvisvar á tólf
   klukkustundum**, sitt hvoru megin. Eina leiðin sem committar það sem
   þú last:

   ```bash
   export GIT_INDEX_FILE=/tmp/mine        # EKKI sameiginlega indexið
   git read-tree HEAD
   git update-index --cacheinfo 100644,$(git hash-object -w /tmp/blob),slod/skra
   git commit-tree $(git write-tree) -p HEAD    # svo git update-ref refs/heads/main <sha>
   unset GIT_INDEX_FILE
   ```
   **Á eftir:** `git reset -q HEAD -- <nákvæmlega slóðirnar>` — `commit-tree`
   fer framhjá sameiginlega indexinu, svo það verður **staðnað** og skrárnar
   sýnast `D` (eyddar). Aldrei bert `git reset` — það eyðir staging annarra.

2. **`git diff --stat` er ekki lás.** Bilið milli þess að þú lest diffið og
   committar er nóg fyrir aðra lotu til að skrifa.

3. **`pkill -f` passar við SKIPANASTRENGINN, ekki slóðina.** Sérstakt
   `git worktree` verndar ÞIG EKKERT. Ég tapaði **þremur** heilum
   keyrslum í röð (exit 143, núll `✗` í loggnum) við `pkill -f
   "run-tests.mjs"` frá annarri lotu. **Afritaðu keyrarann undir
   einkvæmu nafni** (`cp tests/run-tests.mjs tests/zz-mitt.mjs`) og
   notaðu ALDREI `pkill` á nafn sem þú átt ekki einn.
   **`exit 143` með engu `✗` er DRÁP, ekki bilun.**

4. **PRÓFA-SÆTIÐ ER EITT.** Þrjár samtímis `npm test` metta vélina —
   keyrsla annarrar lotu fór úr ~10 mín í yfir klukkutíma og dó í 49.
   Samið var: **tilkynntu „TAKING TEST SLOT" / „SLOT FREE"**, og
   **aldrei pusha rebase sem þú hefur ekki prófað** (rebase breytir
   samsetningunni, svo grænt-fyrir er ekki grænt-eftir).

**„Ég stoppaði keyrsluna mína" er ekki staðreynd fyrr en `ps` segir það.**
Önnur lotan hafði tvö munaðarlaus `zz-verify-all`-ferli sem `TaskStop`
náði ekki.

---

## 1. OPIÐ — EPL VIÐMÓT (allt í `src/App.jsx`, sem er NÚ FRÍTT)

`App.jsx` var upptekið alla nóttina; það er committað og laust. **Þessi
þrjú voru blokkuð af því einu.**

### V8 — fyrirliðinn er ALDREI sannreyndur gegn byrjunarliðinu
**SANNREYNT 25.8.:** `grep -c "captainInXi\|captainValid\|capNotStarting"`
→ **0**. Ekkert skilyrði nokkurs staðar.

Þú getur bekkjað eða **selt** fyrirliðann og `C`-merkið hangir á honum;
valmyndin verður tóm og Triple-Captain-gildið núllast **hljóðlaust**.
Fable biður um „a.m.k. sýnilega viðvörun" og það er rétta umfangið —
**EKKI** færa fyrirliðabandið sjálfkrafa: það er ákvörðun notandans og
sjálfvirk færsla myndi fela villuna í staðinn.

> **VARÚÐ SEM ER MÆLD:** CLAUDE.md kafli 4 hafnaði
> `expPointsFor × startProbability` sem XI-vali — og skráir að naíft
> `expPts × sp` **án `?? 1`** bekkjar **81,6%** þeirra sem eiga ENGA
> byrjunar-tölu og kostar **−3,86 stig/umferð**. Sértu að skoða XI-röðun
> í leiðinni, ekki endurvekja það.

### B4 — FFDR-hliðartaflan reiknuð í hverri teikningu
`<FfdrTable>` er á **`src/App.jsx:3549`** og fær `teams`,
`fixByTeamGw`, `teamById` — engin `useMemo` í kring. Fable nefnir
línur 3685–3752; **þær hafa færst**, svo finndu blokkina, ekki línuna.

Hver lyklaborðsásláttur í `urlInput`/`rivalInput` og hver 60 s
`liveTick` endurteiknar hana. **Mældu fyrst** (`performance.now()` um
blokkina) — `useMemo` á ómælda blokk er ágiskun, og
`React.memo` á `PlayerCard` (27 props) er líklega stærri sigur.

### B5 — aðgengi: `role="dialog"`, Esc og focus-trap
**SANNREYNT:** `role="dialog"` finnst í **`src/PlayerList.jsx` EINUM**
(1 tilvik). Vantar í DetailOverlay, Compare, Rotation.
**`PriceEditor` kann þetta þegar — afritaðu þaðan.**
`PlayerCard` — **kjarnainteraksjón appsins** — er klikkanlegt `<div>`
án lyklaborðsstuðnings; `PlayerList`-hausarnir eru fyrirmyndin í repo-inu.

> **LEIÐRÉTTING Á FABLE:** „óaðgengileg grein í search-modal
> (App.jsx:4513)" er **MOOT**. `🔍 Search`-hnappurinn var fjarlægður í
> `dbc7826` (hann gerði aðeins `setView("players")`, sama og flipinn).
> **SANNREYNT:** `grep -c "searchOpen\|showSearch"` → **0**.

---

## 2. ÚTHLUTAÐ, EKKI OPIÐ — NFL (N6 / N7 / N8)

> **ÞESSI ÞRJÚ ERU TEKIN.** NFL-lotan (`fantasy-cd`) staðfesti 25.8. að
> öll þrjú séu **hennar**, að öll þrjú séu **raunveruleg**, og að hún taki
> þau **í röðinni N6 → N7 → N8** eftir sinn yfirstandandi
> watchdog-commit. Hún lofaði líka að **segja það berum orðum ef hún
> kemst ekki yfir þau** fremur en að láta þau skrást sem afgreidd.
>
> **Ekki byrja á þeim án þess að spyrja hana fyrst.** Það sem hér fylgir
> er greiningin, til vöktunar — ekki verkefnalisti.
>
> Hún bendir sjálf á að **N6 sé sá sem hefur tennur: hann bítur aðeins á
> draft-nótt, sem er eina nóttin sem máli skiptir.**

- **N6** `DraftBoard.jsx` — `pull()` les `slotRoute` en poll-effectið
  hefur það ekki í deps → **staðnað lokun** við endurstaðfestingu á sama
  sæti. **SANNREYNT: 11 tilvik af `slotRoute` í skránni.** Leystu
  flokkinn: `pull` í `useCallback` með réttum deps, eða `slotRoute` í ref.
- **N7** `Dashboard.jsx:178` — **„read from Sleeper just now" er FASTI.**
  Klukkutíma gamalt snapshot segist enn „just now". **`when()`-hjálparinn
  er þegar til í `Sources.jsx`** — notaðu hann.
- **N8 — LEYST 25.8., og úrlausnin er lærdómur.** Grep-ið mitt
  (`leagues/nfl/` → **0** í báðum skrám) var **RÉTT**; það var
  ÁLYKTUNIN af því sem hefði verið röng. Slóðin er byggð úr brotum í
  `data.js:238` (`/user/${userId}/leagues/nfl/${season}`), svo strengurinn
  er hvergi í þeim skrám — þær bera aðeins KALLIÐ.
  **Og einkennið sem Fable lýsti var RANGT, í verri áttina.** Mælt á
  lifandi API: `/leagues/nfl/undefined` skilar **HTTP 200 með `[]`**, ekki
  404. Það er því **ekki hávær bilun heldur þögult rangt svar** — appið
  segir „þú átt engar deildir", sem er sjálfsöruggt, trúverðugt og ósatt,
  og sendir notandann að leita í Sleeper-reikningnum sínum að vandamáli
  sem er okkar (`core.meta || {}` gerir `meta.season` `undefined`).
  Lagað á EINUM kverkastað (`sleeperLeagues`) svo báðir kallendur séu
  varðir. **`Number(null)` er 0**, svo `Number.isFinite` eitt nægði ekki —
  sama gildra og `num()`-fráviks-mælingin.

> **FLOKKUN SEM SKIPTIR MÁLI FYRIR ÞENNAN LISTA:** N8 er **fjórða**
> ónákvæmnin í Fable-skjalinu en hún er af **annarri tegund** en hinar
> þrjár. `PRESETS` og `dstRulesFromSettings` voru **staðnaðar
> fullyrðingar** — ekkert var þar. N8 var **RAUNVERULEG VILLA MEÐ
> RANGLÝSTU EINKENNI**.
> Þetta þarf að greina í sundur, því lesandinn gerir sitthvað:
> „Fable hafði rangt fyrir sér" → slepptu atriðinu.
> „Fable hafði rangt fyrir sér um EINKENNIÐ en rétt að þar er eitthvað"
> → **skoðaðu samt, en trúðu ekki lýsingunni.**
> Almennt: **grep sem skilar núlli hreinsar ekki atriði.** Núll getur
> þýtt lagað, flutt, EÐA byggt í keyrslu úr brotum — og þriðja skýringin
> er sú sem lítur mest út eins og fyrsta.

---

## 3. OPIÐ — PIPELINE

### P5 — harðkóðaðir tímabils-fastar á fimm stöðum
`seasonYear = 2026`, `E0-2526`, `"2025-26"` í `deriveTeamForm`, `2627` í
fdcouk-slóð, `ARCHIVE_SEASON`. Fable vill einn `SEASON_KEYS` leiddan af
`events.json` — **trixið er þegar til í `seasonLabelFromEvents`**.

**EKKI GERT VILJANDI:** breytingin snertir `deriveTeamForm`,
fdcouk-slóðina og `ARCHIVE_SEASON` í einu, og hún þarf einhvern sem
getur **keyrt pipeline-una á eftir og lesið `data/`**. Gerðu þetta
snemma í lotu, ekki síðast.

### Naívu CSV-þáttararnir — ÞARF EITT NETKALL AÐ MÆLA
`fetch.mjs:parseCSV`, `fetch-clubelo-history.mjs` og
`measure-promoted-proxy.mjs` nota bert `split(",")`. Það er ónýtt fyrir
gæsalappað CSV og fullkomlega í lagi fyrir töflur án komma í sviðum.
**Engin CSV-skrá er committuð** (þær eru allar sóttar í keyrslu), svo
„þetta gagnasett ber aldrei kommu" væri **ágiskun**.

**Aðferðin:** sæktu hverja skrá EINU SINNI, `grep -c '"'`, og færðu þá
sem eru hreinar yfir í `scripts/csv.mjs` (`rowsToObjects`, tekur
`minFields` sem breytu). **ATH:** `tests/elo-fetch.mjs:262` PINNAR
heitið `function parseCSV(text)` með textaleit.

---

## 4. STÓRU UPPSKIPTINGARNAR — T1 / T2 / T3

**EKKI GERT, OG ÉG STEND VIÐ ÞAÐ.** `App.jsx` er 5.177 línur,
`DraftBoard.jsx` 3.279, `fetch.mjs` ~5.700.

**Ástæðan er mæld, ekki smekkur:** `npx esbuild` **þáttar en leysir ekki
nöfn**. Ég skrifaði bert `useRef` í stað `React.useRef` í ÞESSARI lotu —
esbuild var grænt og **ÞRJÁTÍU prófasöfn dóu**. Fable segir sjálft að
`tests/lineups.mjs` les `apiNameIndex` sem TEXTA úr `fetch.mjs` og
`tests/fetch-entry.mjs` pinnar entry-hegðun.

**Sé þetta gert:** ein skrá í einu, `await import()` á hverja færða skrá
(nafna-leysing, ekki bara þáttun), og `data-resilience.mjs` +
`player-cards.mjs` eftir hverja — þau eru einu söfnin sem sjá hvítan
skjá. **Ekki byrja á þessu í sömu lotu og öðru.**

> **RÖKSEMD SEM ER VERT AÐ VITA:** `App.jsx` er skráin sem tvær lotur
> lentu í samtímis fjórum sinnum í nótt. Það er **byggingarlegt**, ekki
> óheppni — hver eiginleika-beiðni endar þar. Það er sterkasta röksemdin
> fyrir T1, og hún er önnur en Fable gefur.

---

## 5. T4 — SAMEININGAR SEM EFTIR STANDA

Allar í `App.jsx`/components:
- **GW-bil-valarinn** — `App.jsx`, `Rotation.jsx`, `FfdrTable.jsx`
  (**sannreynt**; Fable segir fimm, ég finn þrjá) → `<GwRangePicker/>`
- **Mynd-með-fallback** — `Compare.jsx`, `Imminent.jsx`,
  `PlayerList.jsx`, `Crest.jsx` (**fjögur, sannreynt**) → einn component.
  **ATH:** `Crest.jsx` fékk `key`-endurstillingu í nótt (V7) — sú
  hegðun VERÐUR að fylgja með, annars smitar biluð mynd á næsta leikmann.
- **Overlay/modal-skel** — fimm handrúlluð, aðeins `PriceEditor` styður
  Esc. Sama vinna og B5; **gerðu þau í einu**.

**T5** (eitt `tests/lib/assert.mjs`) — ég gerði **greininguna** í staðinn:
`tests/assert-signature.mjs` skannar **6.461 fullyrðingu í 105 skrám** og
finnur núll brotleg. Migrationin er þrifnaður, ekki lagfæring, og hún
snertir 103 prófaskrár. **Lág forgangur.**

---

## 6. DISKUR OG SKJÖL — ÞITT KALL, EKKI SESSIONS

> **STAÐA UPPFÆRÐ 25.8. — NFL-lotan hreinsaði 1.225 MB.**
> Mælt á eftir: **repo fór úr 3,6 GB í 2,4 GB.**
> · `_to_delete/` (160 MB) **EYTT** — með skýru samþykki notandans, og
>   eftir að ég staðfesti að ekkert í henni væri mitt (`review-src.tgz`
>   var tímastimplað 20:18, tveimur og hálfum tíma FYRIR mína fyrstu
>   aðgerð, svo hún var aldrei mín).
> · `.cache-nfl/` **Í RÓT REPO-SINS** (1,0 GB) **EYTT** — hún var
>   MUNAÐARLAUS og það var mælt: 791 skrár, allar síðast skrifaðar
>   9. ágúst, meðan lifandi skyndiminnið er `nfl/.cache-nfl` (1.267
>   skrár, 21. ágúst). Lab-skriftirnar leysa `ROOT` sem
>   `path.resolve(HERE, "..")` = `nfl/`, svo rótar-afritið var leifar
>   frá því áður en `nfl/` var klofið út. Núll tilvísanir í kóða.
>
> **`.gitignore`-færslan á `_to_delete/` STENDUR ÞÓTT MAPPAN SÉ FARIN.**
> Það er ásett: `fantasy_snapshot.tar.gz` var 126 MB og **GitHub tekur
> ekki við stökum skrám yfir 100 MB**, svo eitt `git add -A` hefði gefið
> push-bilun sem er erfitt að rekja. Nafnið getur birst aftur.

- `scripts/.boxtouch-cache` **1,1 GB**, gitignored, endurgeranlegt
  (~20 mín). CLAUDE.md segir „~600 MB" — **næstum tvöfaldað**. STENDUR.
- `nfl/.cache-nfl` **848 MB** — LIFANDI, ekki rusl. Ekki eyða.
- `CLAUDE.md` 142 KB, `nfl/README.md` 377 KB. Ritstjórnarákvörðun.
  **Ein lína var leiðrétt** („preseason — engin umferð lokin" var orðin
  ÓSÖNN og var *skýringin* sem skjalið bauð á tómum tölum).
- `HANDOVER*.md` — 7 óracked skrár. Þín ákvörðun.

## 7. `scripts/validate-data.mjs` — SKRIFUÐ, VILJANDI ÓTENGD

Afturför-byggð (ekki þröskuldar): óþáttanlegt JSON, svið sem fór úr N í
**0**, og `teams.json ≠ 20`. **Raðar heimildir stöðva EKKI** — fjórar eru
rauðar í dag og allar fjórar eru þekkt, samþykkt ástand; hlið hefði fryst
`data/` strax.

**Þekjan er efsta lagið EITT** — 51 skrá; `data/{fdcouk,history,live,odds_raw,predictions}/`
(53 skrár) eru UTAN. **Trunkuð `live/gw1.json` (409 KB, sem appið les)
slyppi gegnum hliðið.** Sé það tengt: það er fyrsta viðbótin.

---

## 8. MÆLT OG HAFNAÐ — EKKI TAKA ÞETTA UPP AFTUR

| Fable segir | Mælt |
|---|---|
| `PRESETS` „núll köll" | **NOTAÐ**, `scoring.js:114` |
| `dstRulesFromSettings` „dauð grein" | **14 tilvik** + heill kafli í `dst.mjs` |
| `superflexPos` „lesið en aldrei skrifað" | LES-helmingur **rangur** (`DraftBoard:1216`, `model.js:309`, `model.mjs:1011`). „Aldrei skrifað" ER satt |
| `blendWeights` „dauð" | engir src-kallendur en **profað** í `model.mjs:64` |
| `bestWindow`/`nextWindow` „óhætt að henda" | **fimm fullyrðingar** hanga á þeim í `buy-windows.mjs` |
| `num()` — sameina 3 útgáfur | **SAMEINING BÝR TIL VILLU:** `parseFloat("2026-08-25T…")` = **2026**, `parseFloat("2025-26")` = **2025**. Laus er rétt fyrir FPL (6.710 tölu-strengir í `players.json`), STRÖNG fyrir dagsetninga-skrár. Vörður í `name-norm.mjs` |
| Tveir klúbba-normólarar „tvítekning" | Þeir **VORU ÓSAMMÁLA** (einn strippaði `afc/fc/the`). Sameinað eftir mælingu: 0 árekstrar, 0 afturför, **5 nöfn leysast NÚ** |
| CSV-þáttarar „tveir byte-eins" | Kjarnar eins, **síurnar ólíkar** (`>3` vs `>1`) og þær eru ÞEKKING á gagnasettinu |
| `B1` usage-blend „ekki tengt" | **ÞEGAR GERT** (`f8835b2`), og talan er walk-forward með klasaðri bootstrap — ekki „modulsins eigin tafla" |
| `nfl/.avail-cache` „tracked" | **0 skrár** í `git ls-files` |
| `package-lock.json` „ótracked" | **TRACKED og til** |

---

## 9. SEM FANNST ÁN AÐ VERA Í SKJALINU — LESTU ÞETTA

**ESPN skipti um hnitakerfi 25.8.2026.** Fannst þegar `stats.test.mjs`
féll með 8 fullyrðingum í lokakeyrslu. Rakið: `max x` var **0,96** í
hverjum snapshot til 24.8. og **98,80** í `cb99d34` (25.8.) — enginn
kóði okkar breyttist.

**TVENNT breyttist:** kvarði 0-1 → 0-100 **OG** viðmiðun (hálfur völlur
frá sótta markinu → heill völlur frá EIGIN marki, y speglað).

> **LÆRDÓMURINN SEM GILDIR ALMENNT:** að deila með 100 EINU hefði gert
> „x er 0-1"-vörðinn **GRÆNAN** meðan kortið var enn spegilmynd af
> sjálfu sér. **Hálf lagfæring er verri en engin** — sama form og
> `lookupPos(NaN)` sem skilaði ÞYNGSTA þrepinu: trúverðugt úttak, röng
> merking, og vörðurinn horfir á rangan ás.

Vörpunin er kvörðuð gegn ESPN-**textanum** (`zone`), sem er óháður
hnitunum: **0 brot í öllum sex svæðum, 268 skot**. Sjálf-leiðréttandi
(0-1 gildi getur aldrei farið yfir 1).

**`fetchEspnShots` keyrir 05:00 UTC.** Fixið er pushað, svo næsta
keyrsla skrifar rétt.

> **TVÆR ÓHÁÐAR ESPN-SAMNINGSBREYTINGAR SAMA DAG — GERÐU RÁÐ FYRIR ÞRIÐJU.**
> Á meðan ég fann hnita-breytinguna fann önnur lota (`fantasy-cd`,
> commit `e02ff5b`) að **formerkið á `spread` hafði snúist** gagnvart
> ESPN-textanum. Tvær ólíkar lotur, tvö ólík svið, sami veitandi, sami
> dagur.
>
> **Það sem gerir báðar hættulegar er að hvor á sér HÁLFA lagfæringu sem
> stenst trúverðugan vörð:** að deila með 100 gerir sviðs-vörðinn grænan
> meðan kortið er enn speglað, og snúið formerki gefur samt tölu á
> réttum stærðarkvarða. **Sviðs- og gerðar-verðir grípa hvorki
> STEFNU né FORMERKI** — það gerir aðeins ÓHÁÐ viðmið. Þess vegna var
> kvörðunin gegn `zone`-textanum rétta leiðin.
>
> **Finnist þriðja ESPN-svið rangt: gefðu þér samnings-skrið yfir allt
> fæðið, ekki þrjár tilviljanir.** Farðu þá yfir hvert svið sem við
> lesum úr ESPN og finndu óháð viðmið fyrir hvert.

**Og tvær fullyrðingar í `stats.test.mjs` voru sjálfar ófullkomnar:**
þær prófuðu „utan teigs" á `x` EINUM, svo hvert skot nær marki en 16,5 m
taldist í teig hversu langt úti sem það var. **Teigurinn er
RÉTTHYRNINGUR.** Hert í báða ása.

---

## 10. MYNSTUR SEM KOM ÞRISVAR Í NÓTT — SKRIFAÐU ÞAÐ INN

**Fullyrðing um LIFANDI ástand verður að bera MEKANISMANN, ekki TÖLUNA.**
- „GW1 hefur engin skipti" er **steingervingur**
- „inn og út eru samhljóða því `event`-sían hittir báðar hliðar eða
  hvoruga" er **regla**

Þrjú tilvik: (a) `finished_provisional`-klukkan, (b) `nIn === 0 && nOut
=== 0` fyrir GW1, (c) `team-gw`-fullyrðing skrifuð klukkutímum áður gegn
þessu sama. **Allar þrjár voru SANNAR ÞEGAR ÞÆR VORU SKRIFAÐAR.**

Og: **þekjugólf er það sem gerir „keyrði ekkert" að falli** í stað
þöguls pass. `clock-states.mjs` fann hrunið safn AÐEINS af því að það
ber „0 fullyrðingar keyrðu"-vörð. `assert-signature.mjs` fellur undir
2.000 skoðuð köll af sömu ástæðu.

> **EN GÓLFIÐ NÆGIR EKKI — ÞAÐ VERÐUR AÐ NEFNA RÉTTA ORSÖK.**
> Fjórða tilvikið, og það skarpasta, fannst 25.8. af `fantasy-72`:
> `clock-states.mjs` varð RAUÐ með
> `✗ 0 fullyrdingar keyrdu (thekjan er fullyrding, ekki logga)` — og
> safnið var **GRÆNT (189/0)** þegar það var keyrt EITT á sama
> commit-i og hreinu tré.
>
> **VÍSBENDINGIN ER TÓM SVIGI.** Sá texti er byggður úr `stdout`
> barnsins (`gw1-checklist`). Barn sem **FELLUR** á fullyrðingu
> prentar hana; barn sem er **DREPIÐ** prentar ekkert. Tómur sviginn
> + núll fullyrðingar = SIGKILL undir álagi — nákvæmlega glugginn þar
> sem þrjár lotur voru á CPU-inu samtímis.
>
> Gólfið **greindi einkennið og nefndi RANGA orsök**: það sagði
> „þekjan hrundi" þegar sannleikurinn var „barnið var drepið". Það er
> sama greinarmun sem `run-tests.mjs` gerir þegar fyrir hengjur
> (`status: null` + `signal` er ÓBREYTANLEGA ekki það sama og fallin
> fullyrðing), og hann verður að vera í SKILABOÐUNUM.
>
> **Reglan: gólf sem lætur „keyrði ekkert" falla er NAUÐSYNLEGT en
> ekki NÓG. Það verður líka að greina „keyrði ekkert af því að það
> brotnaði" frá „keyrði ekkert af því að það var drepið" — annars
> framleiðir það draugavillu undir einmitt þeim aðstæðum (álagi) þar
> sem menn eru líklegastir til að keyra það.**
> Lagað: safnið endurtekur einu sinni (dráp undir álagi er
> augnabliks) og segir `barnid var DREPID (SIGKILL) — UMHVERFI, ekki
> klukkan` ef það gerist aftur. Báðar fullyrðingar FALLA áfram í
> báðum tilvikum; aðeins orsökin breytist, og `nAsserts >= 20`
> gólfið er ósnert svo raunveruleg þekju-afturför fellur enn.
