# HANDOVER — NÆSTA SESSION (skrifað 25.8.2026)

Þetta skjal er **vísirinn**, ekki heildin. Þrjár lotur unnu samtímis á sama
vinnutré 24.–25.8. og hver skrifaði sitt skjal. Byrjaðu hér, farðu þaðan í
þau tvö.

| skjal | hver skrifaði | umfang |
|---|---|---|
| **ÞETTA** | FPL-lotan (fantasy-72) | vísir + það sem notandinn þarf sjálfur að gera |
| `HANDOVER-KODARYNI-NEXT.md` | kóðarýni-lotan (fantasy-48) | 359 línur: kóðarýni-skjalið, §0 vinnutrés-gildrur, §8 mælt-og-hafnað, §10 fullyrðinga-fossílar |
| `HANDOVER-NFL-4.md` | NFL-lotan (fantasy-cd) | allt undir `nfl/` |

---

## 0. SVARIÐ VIÐ SPURNINGUNNI: JÁ — MEÐ EINUM FYRIRVARA

Þú spurðir hvort það sé ekki auðveldara að opna nýja lotu og láta hana gera
allt á nýjum stað. **Það er réttari leið en að halda þessum áfram**, af tveimur
ástæðum sem eru mældar og ekki smekkur:

1. **Þrjár lotur á einu vinnutré kostuðu raunverulegan tíma í nótt.** Sameiginleg
   `git index`, `pkill -f` sem drap heilbrigðar keyrslur annarrar lotu (`-f` parar
   við SKIPANASTRENGINN, svo sérstakt `git worktree` ver ekki neitt), og
   CPU-keppni sem framleiddi **falskt rautt** próf (§4 hér). Ein lota á einum
   stað hefur enga þessa áhættu.
2. **Löng lota þynnist.** Ákvarðanir héðan úr nóttinni eru **skrifaðar** í þessi
   þrjú skjöl og í commit-söguna, svo ný lota tapar engu — hún fær þau án
   yfirbyggingarinnar.

**FYRIRVARINN:** ný lota veit ekkert nema það sem er SKRIFAÐ. Byrjaðu hana á
`npm ci && npm test && npm run build` og láttu hana lesa þessi þrjú skjöl
**áður en** hún skrifar línu. Það sem er ekki í þeim er horfið þegar þessir
gluggar lokast.

> **ÞESSI ÞRJÚ SKJÖL ERU EKKI Í GIT — OG ÞAÐ ER ÞÖGUL GILDRA.** Ekkert
> `HANDOVER-*.md` er trakkað (og ekkert er í `.gitignore` heldur), svo þau búa á
> disknum hjá notandanum og **eru EKKI í nýju `git clone`**. „Lestu handover-ið"
> bregst því **þegjandi** hjá hverjum sem klónar í stað þess að `pull`-a: hann
> fær repo sem virkar, sér engin skjöl, og hefur enga ástæðu til að vita að þau
> eigi að vera til. Ný lota á að vinna **í þessari möppu** (`~/Fantasy`), eða
> skjölin verða að fylgja handvirkt. Sama ætt og allt annað hér: fjarvera sem
> lítur út eins og eðlilegt ástand.

> **OG VERKEFNALISTINN ER MINNST VERÐI HLUTINN AF ÞESSUM SKJÖLUM.** §3 og §4
> hér líta aðkallandi út og eru fljótlesin; það sem sparar raunverulegan tíma er
> **§8 („mælt og hafnað") og §10 („fullyrðinga-fossílar") í
> `HANDOVER-KODARYNI-NEXT.md`**, auk `CLAUDE.md` kafla 4. Lota sem les
> verkefnalistann og sleppir þeim **endurgerir vinnu sem er þegar afsönnuð** —
> og `num()` er fyrsta gildran sem hún fellur í. Verkefnalisti býður upp á
> framkvæmd; höfnunarlistinn er það eina sem kemur í veg fyrir ÓNÝTA
> framkvæmd, og aðeins annar þeirra lítur áríðandi út.

---

## 1. STAÐAN Í TÖLUM (25.8.2026, ~12:25 UTC)

- `origin/main` = **fa40cd6**. Efsta commitið er **cron-ið**, ekki lota
  (`github-actions`, „nfl: adp 2026-08-25T12:21Z") — `fetch-fast` committar `data/`
  á 30 mín fresti. **Þess vegna er `git pull --rebase` ALLTAF fyrsta skipunin**
  (kafli 7 regla 1): annars fæst fast-forward-höfnun í lok grænnar keyrslu.
- **Öll 79 prófasöfnin græn** á `a1b92b4`, staðfest **þrisvar af tveimur óháðum
  lotum**: kóðarýni-lotan keyrði 954fd5d tvisvar (eins, exit 0) og þessi lota
  keyrði `a1b92b4` einu sinni með `npm run build` (exit 0) — **engin
  draugs-undirskrift** í neinni keyrslu (§9).
- NFL-safnið **27/27 grænt**.
- **ALLT ER ÝTT. Ekkert er óafgreitt hjá neinni lotu.** Lokakeyrsla á
  lokatrénu (eftir `9e4f3b6` og bæði cron-commitin): `npm run build` **exit 0** og
  **öll 79 prófasöfnin græn, exit 0**, engin draugs-undirskrift. `nfl/` **27/27**.
- **Commitin eru aðgreind eftir tré og það er bisect-línan** — hvert var
  sannreynt með `git diff-tree --no-commit-id --name-only -r <sha>` á
  commitinu SJÁLFU, **ekki með `git diff A..B`**, sem spannar cron-commitin
  sem lentu á milli og eignar þeim skrár sem eru ekki þeirra:
  · `a1b92b4` -> `tests/clock-states.mjs` **eingöngu** (1 skrá, 0 undir `nfl/`)
  · `9e4f3b6` -> **9 skrár, ALLAR undir `nfl/`, NÚLL undir `data/`** (kóði eingöngu)
  · `fa40cd6` / `d93e1fd` -> `data/` eingöngu (cron)
  Þurfi einhvern tíma að leita orsakar í **gögnum** eru það cron-commitin, aldrei
  `9e4f3b6`. **Lærdómurinn er almennur: `A..B` er BIL, ekki commit** — og bil sem
  cron hefur gengið í gegnum ber skrár sem enginn maður skrifaði.

## 2. ÞAÐ SEM ÞÚ SJÁLFUR ÞARFT AÐ GERA — ENGIN LOTA GETUR ÞETTA

### 2.1 NETLIFY — ÞETTA ER **EKKI** LENGUR ÓGERT (leiðrétt 25.8.2026)

**Hér stóð að útgefna fallið væri „~13 dögum á eftir `HEAD`" og að þú þyrftir að
endurútgefa handvirkt. ÞAÐ VAR ORÐIÐ ÓSATT ÞEGAR ÞAÐ VAR SKRIFAÐ.** Ég las
`netlify.toml` og LEIDDI af `ignore`-skilyrðinu að engin bygging hefði keyrt.
Kóðarýni-lotan gerði það sem ég gerði ekki: **hún kallaði á endapunktinn.**

Sannreynt af mér sjálfstætt á `mellifluous-hummingbird-565c85.netlify.app`:

```
?path=fpl-typo      -> HTTP 400
   {"error":"unknown or disabled path: fpl-typo",
    "hint":"known paths: live, fpl-bootstrap, fpl-fixtures, fpl-entry, ..."}
?path=fpl-fixtures  -> HTTP 200
   cache-status: "Netlify Durable"; ... ; stored
```

`hint`-strengurinn er **stafrétt eins** og línur 212–213 í
`netlify/functions/odds.js` á `HEAD`, með sömu sjö slóðirnar í sömu röð, svo
útgefna fallið ER núverandi. Og `Durable … stored` sannar að
`Netlify-CDN-Cache-Control` sé virt — Netlify **eyðir** þeim haus í stað þess að
endurvarpa honum, svo `cache-status` er eina merkið; áður var `fpl-fixtures`
**óvistað**.

Ástæðan er einföld: `ignore`-skilyrðið byggir **ÞEGAR** `netlify/` breytist, og
þrjú commit í nótt snertu `odds.js`. Fullyrðingin var sönn FYRIR þá ýtingu og varð
ósönn MEÐ henni.

> **REGLAN, OG HÚN ER ALMENN:** `netlify.toml` segir hvað **ÆTTI** að gerast;
> `curl` segir hvað **GERÐIST**. Stilling er fullyrðing um hegðun, ekki hegðun.
> Þetta er sama ættin og allt annað í §9 og í §10 hjá kóðarýni-lotunni: ég las
> heimildina sem lýsir kerfinu í stað þess að spyrja kerfið. **Ekkert í þessari
> skrá um lifandi ástand á að trúa án þess að vera prófað — þar á meðal þetta.**

### 2.2 API-SPORTS — VALKVÆTT, EKKI BLOKKERANDI (og nú EINA atriðið á listanum)
Reikningurinn er `suspended` (svarar `{"access":"Your account is suspended…"}` á
tveimur endapunktum, með ~4 af 100 daglegum köllum notuð — **það er ekki kvóti**).
Lagast aðeins á `dashboard.api-football.com`.
**Þetta blokkar ekki neitt lengur:** staðfest byrjunarlið koma nú úr FotMob
(`/api/data/matchDetails`, enginn token). API-Sports er þar til að hafa tvær
heimildir, ekki eina.

---

## 3. OPIÐ — EPL VIÐMÓT (`src/App.jsx`, sem er NÚ FRÍTT)

Þessi þrjú voru blokkuð af því einu að `App.jsx` var upptekið alla nóttina.
**Full greining, með `grep`-sannreyningu, er í `HANDOVER-KODARYNI-NEXT.md` §1.**

| # | atriði | kjarninn |
|---|---|---|
| **V8** | fyrirliðinn er aldrei sannreyndur gegn byrjunarliðinu | þú getur bekkjað eða SELT fyrirliðann og `C` hangir á honum; Triple-Captain nullast þegjandi. **Sýnileg viðvörun er rétta umfangið — EKKI færa bandið sjálfkrafa** (það felur villuna) |
| **B4** | FFDR-hliðartaflan endurreiknuð í hverri teikningu | **MÆLDU FYRST** með `performance.now()`. `useMemo` á ómælda blokk er ágiskun, og `React.memo` á `PlayerCard` (27 props) er líklega stærri sigur |
| **B5** | aðgengi: `role="dialog"`, Esc, focus-trap | finnst í `PlayerList.jsx` EINUM. Vantar í DetailOverlay, Compare, Rotation. **`PriceEditor` kann þetta þegar — afritaðu þaðan** |

**B5 á að fá sína eigin lotu** og ekki hengjast á endann á langri: það opnar
`App.jsx` aftur um leið og það var losað, og aðgengi sem er gert í flýti er
verra en ógert (`role` án focus-trap **lofar** lyklaborðsstuðningi sem er ekki til).

---

## 4. OPIÐ — NFL (`nfl/`)

**N6, N7 og N8 eru ASSIGNED á NFL-lotuna**, ekki opin — hún heldur þeim skrám.
Sjá `HANDOVER-NFL-4.md`. Í stuttu máli: N6 `DraftBoard` poll-lokun á `slotRoute`
(hefur tennur á draft-nótt, sem er eina nóttin sem skiptir máli), N7 „lesið úr
Sleeper í þessari sekúndu" sem FASTI, N8 `/leagues/nfl/undefined` þegar
`meta.json` bregst.

> **N8 ER LEYST — OG ÞAÐ VAR VERRA EN SKÝRSLAN SAGÐI (25.8.2026).**
> Kóðarýni-lotan `grep`-aði `"leagues/nfl/"` og fékk **0** í bæði `MyTeam.jsx` og
> `DraftBoard.jsx`. **Núllið var RÉTT og ályktunin af því hefði verið röng** —
> slóðin er **byggð úr brotum** og strengurinn er hvergi heill:
> `nfl/src/data.js:238` ber `` sleeperGet(`/user/${userId}/leagues/nfl/${season}`) ``.
> Sannreynt af mér: `grep -c 'leagues/nfl/'` gefur **0** í báðum skrám, sniðmátið
> er á þessari einu línu, og `core.meta || {}` er á `nfl/src/App.jsx:514`.
> Þetta er þriðja af þremur merkingum núlls úr `grep`: **byggt á keyrslutíma**.
>
> **OG EINKENNIÐ SEM VAR SKRÁÐ VAR RANGT Í ÞÁ ÁTT SEM SKIPTIR MÁLI.** Skýrslan
> sagði „notandinn fær hrátt 404". Mælt á lifandi endapunkti:
> `/leagues/nfl/undefined` skilar **HTTP 200 með `[]`**, ekki 404.
> **404 hefði verið SÝNILEG bilun.** `[]` er það ekki: appið segir „þú átt engar
> deildir" — ákveðið, ranglega, og fullkomlega trúverðugt — og notandinn fer að
> leita að vandanum í Sleeper-reikningnum sínum. Orsökin er OKKAR
> (`meta.season` er `undefined` þegar `meta.json` bregst).
> **Þetta er ættin sem gengur eins og þráður í gegnum alla nóttina: fjarvera sem
> birtist eins og eðlilegt svar.** **Vörður sem spyr „kom villa?" tekur ekkert af
> þessu** — spurningin verður að vera „er svarið SANNANLEGA til?"
>
> **EN ÆTTIN HEFUR TVÆR GREINAR OG ÞÆR HAFA SITTHVORA LAGFÆRINGU** (skerpt af
> NFL-lotunni, og aðgreiningin er munurinn á lagfæringu og plástri):
>
> · **INNRI grein — OKKAR kóði mislesur OKKAR gögn.** `null` sem verður `0`, tómt
>   svið sem verður súla af lengd 0, frosin Elo sem lítur hlutlaus út,
>   `price_change_percent` sem er 0 hjá öllum, `?? 0` báðum megin á mismun tveggja
>   vantandi talna. **Lagfæringin er á LESTRARHLIÐINNI:** aðgreindu `null` frá
>   núlli og birtu „—".
> · **YTRI grein — heimildin svarar 200 við ÓGILDRI spurningu.**
>   `/leagues/nfl/undefined` -> `200 []`. Hér er **EKKERT á lestrarhliðinni til að
>   taka**, því svarið er fullkomlega vel formað; það er spurningin sem var ógild.
>   **Lagfæringin er HLIÐ Á KALLINU, ekki próf á svarinu** — sama rök og gera að
>   meiðsla-söfnunin er gátuð á tímabilinu í stað þess að sía svarið, og að
>   `bsd_lineups.json` er skrifuð ólesin. Að sannreyna svarið hér væri plástur:
>   það lætur eitt ógilt kall líta löglegt út í staðinn fyrir að hindra það.

Auk þess: NFL-lotan á **eitt óvistað skjal**, `stageHistory` í `fetch-nfl.mjs`,
sem sleppir tímabili með tómum svörum með berum `continue` **áður en** `writeJson`
fær að skrá höfnun. Fyrir lokin ár er það rétt; fyrir **yfirstandandi** ár þýðir
það að `data/weekly/2026.json` verður aldrei til og **fjórar tengdar útkomur fara
þegjandi í forleiks-hegðun**. Þriggja-ástands `record()` er í smíðum.
**Vörðurinn fyrir RAUÐA greinina verður að vera á tilbúnum gögnum** — dagsins
ástand er „waiting"-greinin, svo lifandi gögn geta ekki keyrt hana, og annars fer
hún ómæld í loftið 10. september.

---

## 5. OPIÐ — MÆLINGAR SEM BÍÐA DAGSETNINGAR (ekki hægt að flýta)

| hvað | hvenær opnast | af hverju það bíður |
|---|---|---|
| **`ep_next` sem grunnur í væntum stigum** | **~GW6** | Þetta er **eina opna leiðin að raunverulegri bætingu á stigalíkaninu.** Öll bilið milli appsins og fittaðs líkans er í GRUNNINUM, og grunnurinn er `ep_next`, sem **á engan sögulegan staðgengil** — hann er ekki mælanlegur á safninu. `data/predictions/` myndar hann nú fyrir frest, lyklað á `code`; frá ~GW6 er hann mælanlegur. Sjá `scripts/measure-exp-points-v2.mjs`. **FPL-eigið `xP` er LEKIÐ og má ALDREI vera viðmið** (fylgir raunstigum 0,4529 á móti 0,0720 hjá besta leka-frjálsa líkaninu) |
| BSD spáð byrjunarlið gegn 6h-líkaninu | GW1–4 lokið | glugginn er ~11–13 klst fyrir leik, FPL-frestur ~1,5 klst fyrir FYRSTA leik |
| Mínútuþróun (`player_form.json`) | GW4 | kviknar sjálf |
| `fdcouk_e0` 2026/27 | við fyrsta leik | **prófsteinninn er `Div === "E0"`, EKKI HTTP-staðan** — sama ástand hefur svarað 404, 301 (yfir á utandeildar-`EC.csv`, sem `fetch` fylgir þegjandi) og 300 á þremur vikum |
| „í ár vs. í fyrra"-taflan | fyrsta lokna umferð | byggð og villuvarin, hefur **aldrei keyrt** |

**Vaktað vélrænt af `tests/gw1-checklist.mjs`**, sem sefur í forleik og vaknar
við fyrstu loknu umferð. Ekki treysta minninu hér.

---

## 6. EKKI ENDURGERA — TVEIR LISTAR

1. **`CLAUDE.md` kafli 4** — ~50 hugmyndir mældar á raungögnum og felldar, hver
   með vikmörkum. Lestu hana ÁÐUR en þú leggur til „augljósa bætingu".
2. **`HANDOVER-KODARYNI-NEXT.md` §8** — það sem var afsannað í nótt.

Sex tilgátur voru mældar og felldar í stigalíkaninu 25.8. (DefCon, mótherji×staða,
markaðsoddar, big chances, mínútur/byrjunarlíkur, threat/ICT/xGI) — bootstrap
klasað per leikmann, 400 ítranir. **Engin breyting á `src/model.js` var réttlætt
og engin var gerð.** Athygli: mínútur/byrjunarlíkur LÍTA út eins og eini
sigurvegarinn á `ppg5`-grunni og **snúast við á skrumpuðum grunni** — það var
aldrei um mínútur, hrátt 5-leikja meðaltal er einfaldlega vondur grunnur.

---

## 7. VINNULAG — FJÓRAR REGLUR SEM KOSTUÐU TÍMA Í NÓTT

1. **`git add <skrár>`, ALDREI `git add -A`.** Tvær lotur á einu vinnutré:
   `-A` sópar vinnu annarrar inn í commit hinnar.
2. **ALDREI `pkill`.** `pkill -f` parar við SKIPANASTRENGINN, ekki slóðina, svo
   sérstakt `git worktree` ver **ekkert**. Ég drap þrjár heilbrigðar keyrslur
   annarrar lotu og lét þær líta rauðar út. Drepðu með **skýru PID** eða ekki.
3. **„Ég stoppaði keyrsluna mína" er ekki staðreynd fyrr en `ps` segir það.**
   Tvö munaðarlaus ferli mín lifðu það sem ég taldi stöðvun.
4. **`exit 143` án `✗` er DRÁP, ekki bilun.** Sjá §4 hér fyrir ofan.

---

## 7b. SEX SINNUM LÝSTI LOTA SINNI EIGIN STÖÐU OG HAFÐI RANGT FYRIR SÉR

**Þetta er skarpasta rekstrar-niðurstaðan úr nóttinni og hún er ekki um próf.**
Þrjár lotur unnu saman í ~16 klst og mældu kóðann af mikilli varúð allan tímann.
Það sem brotnaði var **sjálfs-skýrslan**:

| lota | fullyrðingin | raunveruleikinn |
|---|---|---|
| kóðarýni | „engin keyrsluferli eftir að lotan endar" | **fjögur** í gangi, eitt þeirra keyrsla 3 |
| NFL | „kóðarýni-lotan er búin" (endursögn) | ómælt — aldrei `ps` |
| NFL | undirskrifaði þrjú skeyti með **nöfnum annarra lotna** | tvisvar |
| FPL | „sætið er þitt" **og** „CPU-inn er minn einn" í SAMA skeyti | hvorugt satt |
| FPL | „Netlify er 13 dögum á eftir" leitt af `netlify.toml` | útgefið og ferskt (§2.1) |
| NFL | sá **eitt ferli** í `ps` og var í þann mund að segja CPU-inn upptekinn | það var **hennar eigin** stöðnuð `sleep`-lykkja frá klukkutímum áður |

**GREININGIN SEM GILDIR:** hver einasta önnur fullyrðing þessa nótt var sannreynd
af einhverjum — kóði, gögn, sha-ættir, HTTP-svör. **Sjálfs-skýrslurnar voru þær
einu sem enginn athugaði**, því samskiptareglan gekk út frá því að lota sé
heimildin um sína eigin stöðu. **Hún er það ekki.** `ps`, `ListAgents`,
`git ls-remote` og `git status` eru heimildin; sjálfsskoðun er tilgáta.

**Og einkennið er EINS í öllum fimm:** fullyrðing um **ætlun eða nýliðna fortíð**,
sögð í **nútíð um núverandi ástand**. Sama ætt og §2.1 og §9 — kyrrstætt gagn
(eða áform) lesið eins og lifandi staða. Þrjú afbrigði sama forms:

- `netlify.toml` segir hvað **ætti** að byggjast -> `curl` segir hvað **gerðist**
- óhreyfð sha segir ekkert um **hver** ýtti -> `merge-base --is-ancestor` segir hvað er **í** henni
- „ég stoppaði það" segir hvað ég **ætlaði** -> `ps` segir hvað **er**

> **OG SÍÐASTA RÖÐIN ER SÚ VERSTA OG NYTSAMLEGASTA:** lotan gat **ekki greint
> sitt eigið ferli** í fimm lína `ps`-úttaki. Þetta er ekki „lotur lýsa sinni stöðu
> ranglega" heldur **lota þekkir ekki sjálfa sig** — sama lota hafði áður
> undirskrifað þrjú skeyti með nöfnum annarra. Tvennt sem hún var ónákvæmust um
> var hún sjálf: **nafnið sitt og sínar eigin leifar.**
>
> **VERKFÆRIÐ SEM TÓK ÞAÐ ER ÞAÐ SAMA Í ÖLLUM TILFELLUM:** `pgrep -fl` fremur en
> `grep -c`. Og ástæðan er sterkari en „upptalning segir hvers" — **TALNING GETUR
> VERIÐ RÖNG Í BÁÐAR ÁTTIR OG SEGIR ÞÉR ALDREI HVORA.** Mælt á einni mínútu í
> NFL-lotunni: `node: 3` þar sem hún hafði rétt sagt 0 (öll þrjú voru **annarrar
> lotu**, sem `-fl` sýndi samstundis af slóðinni), og `grep -c "nflwt"` skilaði
> **1** sem var **grep-skipunin sjálf að para við sig**. Þrjú sem voru ekki hennar,
> og eitt sem var ekki til. **Upptalningin var rétt í bæði skiptin.**
>
> Sama regla og „þekja er fullyrðing, ekki logga" (CLAUDE.md 5b) og sama og
> `\bNaN\b`-gildran (5b): **tala án auðkennis er ekki mæling heldur ábending**, og
> `grep` sem parar við sína eigin skipanalínu er mælitækið sem er sjálft villan.

> **REGLA FYRIR NÆSTU LOTU:** ætlar þú að segja annarri lotu — eða notandanum —
> í hvernig ástandi þú ert, **mældu það í sömu andrá.** Og fáir þú
> sjálfs-skýrslu frá annarri lotu, **endursegðu hana ekki sem staðreynd**;
> mældu hana eða merktu hana sem endursögn.

---

## 8. ÞAÐ SEM ÞESSI LOTA GERÐI (svo þú endurgerir það ekki)

Fullur listi í commit-sögunni (105 commit síðan 24.8. um hádegi). Kjarninn:

- **EIN TÍMABILS-KLUKKA.** Sex byggjendur lásu `e.finished`, sem flettist fyrst
  ~3 dögum eftir frest. Það var **rót fjögurra ólíkra kvartana** frá þér.
  `startedGameweeks`/`seasonHasStarted` í `src/availability.js` er nú eina
  klukkan; `playedGwIds` í `fetch.mjs` telur umferð spilaða þegar **allir** leikir
  hennar eru `finished || finished_provisional`. Sannreynt í raunkeyrslu:
  `defcon.players` 0 → **200**, `player_form.gws_used` 0 → **1**.
- **FotMob TÓK YFIR staðfest byrjunarlið** frá uppsagða API-Sports — aðeins
  `lineupType === "standard"` með nákvæmlega 11 byrjunarmönnum, **bæði** félög
  sannreynd gegn FPL-leiknum.
- **ESPN SKIPTI UM HNITAKERFI 25.8.** — skotakortið var 100× út fyrir völlinn.
  Kvarði OG viðmiðunarpunktur fluttust SAMAN. Athugið: **hálf-lagfæring stenst
  svið-vörð** (deiling með 100 gerir sviðið grænt meðan kortið er enn spegilvent),
  svo kvörðun gegn ESPN-EIGIN svæðistexta var það sem tók hana.
- **Watkins-lekinn:** ESPN-skot úr fyrra tímabili blæddu í 2026/27-sýnina
  (169 → 0 raðir) auk 25 rangra leikmanna-pörunar.
- 35 atriði úr skjalinu þínu; `team_matches`-síðasta míla (`<Teams>` fékk aldrei
  `bsdLive`); stigatöflu-glugginn.

**Tvennt sem ekki er hægt, með ástæðu — ekki reyna aftur án nýrrar heimildar:**
- **Mark ↔ assist pörun er ekki til í NEINNI tiltækri heimild.** `live/gw1.json`,
  `last_gw.json` og `explain`-blokkirnar voru allar skoðaðar.
- **`ep_next` hefur engan sögulegan staðgengil**, svo grunninn er ekki hægt að
  mæla á safninu fyrr en ~GW6 (§5).

---

## 9. FALSKT RAUTT — LESTU ÞETTA ÁÐUR EN ÞÚ ELTIR BILUN

`clock-states.mjs` mældist **rautt** kl. 11:46 (1 af 79) með þremur röðum,
þar á meðal „0 fullyrdingar keyrdu". Sama safn, sama `HEAD`, keyrt **eitt og sér**:
**189 stóðust, 0 féllu.**

**TÓM SVIGI ER FINGRAFARIÐ.** Skilaboðin voru `...gognum ()` — sá texti er
byggður úr stdout undirferlisins, og **barn sem fellur á fullyrðingu PRENTAR hana;
barn sem er DREPIÐ prentar EKKERT.** Þrjár lotur voru á CPU-inu í þeim glugga.

Þetta var lagað í **a1b92b4**, og lærdómurinn er almennur:
**gólf sem lætur „keyrði ekkert" falla er NAUÐSYNLEGT EN EKKI NÓG.** Það verður
líka að greina „keyrði ekkert af því að það brotnaði" frá „keyrði ekkert af því
að það var drepið" — annars **framleiðir það draug** undir nákvæmlega þeim
aðstæðum (álagi) þar sem menn eru líklegastir til að keyra það. Gólfið sjálft
(`nAsserts >= 20`) er ÓBREYTT; það sem breyttist er hvað skilaboðin SEGJA.

---

## 10. VIÐBÆTUR FRÁ ÖÐRUM LOTUM

> Hinar tvær loturnar skrifa hér að neðan það sem þær eiga eftir. Skildu
> kaflaskilin eftir — næsta lota les þau sem sinn verkefnalista.

### 10a. Frá kóðarýni-lotunni (fantasy-48)
**Fullur listi og öll mæld rök: `HANDOVER-KODARYNI-NEXT.md` (359 línur).**
Hér er aðeins **það sem er EFTIR**, plús tvær leiðréttingar á þessu skjali.

**LEIÐRÉTTING 1 — NETLIFY-ATRIÐIÐ Í §2 ER AFGREITT. Ekki setja það á
notandann.** Ég prófaði FALLIÐ SEM ER Í LOFTINU, ekki `netlify.toml`:

```
?path=fpl-typo  ->  HTTP 400
  {"error":"unknown or disabled path: fpl-typo","hint":"known paths: live, …"}
  access-control-allow-origin: *
?path=fpl-fixtures -> HTTP 200
  cache-status: "Netlify Durable"; stored     <- CDN-hausinn er virkur
OPTIONS -> 204
```
Hintan er orðrétt úr V3-lagfæringunni minni og `Durable … stored` sannar
að `Netlify-CDN-Cache-Control` úr B6 sé í gildi. **Deployið gekk** — og
það var vænta: `ignore`-skilyrðið byggir ÞEGAR `netlify/` breytist, og
þrjár af mínum commitum snerta `netlify/functions/odds.js`. Fullyrðingin
„~13 dagar á eftir" var sönn FYRIR push-ið og er ósönn núna.
**Lærdómur:** `netlify.toml` segir hvað ÆTTI að gerast; `curl` segir hvað
gerðist. Spurðu endapunktinn.

**LEIÐRÉTTING 2 — V8/B4/B5-taflan í §3 er rétt.** Ekkert að breyta.

---

**OPIÐ, í þeirri röð sem ég myndi taka það:**

| # | Hvað | Athugasemd sem sparar tíma |
|---|---|---|
| 1 | **V8** fyrirliði vs byrjunarlið | `grep -c "captainInXi\|captainValid\|capNotStarting"` → **0**. Sýnileg viðvörun, EKKI sjálfvirk færsla |
| 2 | **P5** tímabils-fastar (5 staðir) | Snertir `deriveTeamForm`, fdcouk-slóð og `ARCHIVE_SEASON` Í EINU. Þarf pipeline-keyrslu á eftir → **taktu snemma í lotu** |
| 3 | **B4** FFDR-taflan í render | `App.jsx:3549`. Fable nefnir 3685–3752 — **þær hafa færst**. MÆLDU FYRST |
| 4 | **B5** aðgengi + overlay-skel | Sama vinna og T4-overlay. `role="dialog"` er í EINNI skrá. Eigin lota |
| 5 | **T4** GwRangePicker · mynd-fallback | **þrír** og **fjórir**, ekki fimm. `Crest.jsx` fékk `key`-endurstillingu (V7) — hún VERÐUR að fylgja |
| 6 | Naívu CSV-þáttararnir | **Eitt netkall:** sæktu hverja skrá, `grep -c '"'`, færðu þá hreinu í `scripts/csv.mjs` |
| 7 | T1/T2/T3 | Sér lota. Sjá §4 í mínu skjali — esbuild leysir EKKI nöfn |

**ÚTHLUTAÐ (ekki taka):** N6/N7/N8 → `fantasy-cd`, röð N6→N7→N8.

**ÓTENGT AÐ ÁSETTU RÁÐI:** `scripts/validate-data.mjs`. Þekjan er
**efsta lagið eitt** — trunkuð `live/gw1.json` (409 KB, sem appið les)
slyppi gegnum hliðið. Sé það tengt: það er fyrsta viðbótin.

**ÞAÐ SEM MÁ EKKI GLEYMAST — ESPN.** Tvær óháðar samningsbreytingar
sama dag (hnitakerfi hjá mér, formerki á `spread` hjá NFL-lotunni).
Báðar höfðu **hálfa lagfæringu sem stenst trúverðugan vörð**: að deila
með 100 gerir sviðs-vörðinn grænan meðan kortið er speglað; snúið
formerki gefur samt tölu á réttum kvarða. **Sviðs- og gerðar-verðir
grípa hvorki stefnu né formerki — aðeins óháð viðmið gerir það.**
Finnist þriðja svið rangt: gefðu þér samnings-skrið yfir allt fæðið.

**EITT SEM ÉG MYNDI GERA FYRST, ÁÐUR EN NOKKUÐ ANNAÐ:** lestu §8 í mínu
skjali („mælt og hafnað"). Af níu „dauður kóði"-atriðum Fable stóðust
**þrjú**, og **hvert** „tvítekning"-atriði var frávik að ásettu ráði.
Að sameina `num()` *býr til villu* (`parseFloat("2026-08-25T…")` = 2026).
Þar er mesti sparnaðurinn í skjalinu.

### 10b. Frá NFL-lotunni (fantasy-cd) — HVAÐ ER EFTIR

`nfl/` er grænt (27/27) og allt sem stóð opið í `HANDOVER-NFL-4.md` kafla 5 er
afgreitt. Það skjal ber frásögnina; hér er **aðeins það sem er ógert.**

#### 1. ALLT BÍÐUR VIKU 1 — OG ÞÖGNIN VAR LÖGUÐ, EKKI BIÐIN

Fjórar mældar niðurstöður eru **tengdar og varðar** en engin þeirra getur skilað
tölu fyrr en `data/weekly/2026.json` verður til: `usageblend`, ROS-waiver-
gjaldmiðillinn, `weekRegret` og `loadWeekly` sjálf. Í dag falla þær allar í
forleiks-hegðun **bæti-eins**, sem er rétt.

**Hættan var að þær gerðu það áfram þegjandi.** `stageHistory` sleppti tómu ári
með berum `continue` áður en `writeJson` fékk færi á að skrá synjun. Það er nú
þriggja-stöðu (`weeklyCurrentDecision`): *ekki byrjað* → grænt „bíður"; *byrjað
með raðir* → grænt; **byrjað án raða → RAUTT**, sem nefnir árið, skrána og hvað
það kostar. Rauða greinin er prófuð á **tilbúnum inntökum** — hún getur ekki
keyrt á gögnum dagsins og hefði annars farið í loftið ómæld 10. september.

**Fyrsta verk þess sem tekur við:** í fyrstu viku, staðfestu í `Sources` að
röðin `weekly_current_season` sé græn. Sé hún rauð er hún sjálf-skýrandi.

#### 2. `practice_status` ER SAFNAÐ EN ÓMÆLT

`nv.injuries()` var aldrei kölluð; hún er nú í `archiveDaily` og skrifar
dagsetta seríu (`injuries/{dagur}.json`), gátuð á `seasonUnderway` svo forleikur
gefur enga sókn og enga rauða röð. **Ekkert í appinu les hana.** Þetta er
hráefni — safnað núna því skráin hjá nflverse er endurskrifuð og „hvað sagði
skýrslan í viku 6" verður ósvaranlegt eftir á. Fyrsta færi á mælingu er í
október. **Ekki tengja hana í ráðgjöfina án mælingar.**

#### 3. `MyTeam`-FLIPINN — ÁKVÖRÐUN NOTANDANS

Eina bókaða ástæðan fyrir því að geyma hann var `benchRegret`, sem er nú á
forsíðunni (þar sem deildar-auðkennið og lifandi hópurinn eru). Flipinn var
**ekki** fjarlægður: að henda flipa er ákvörðun sem enginn bað um. Hann er
falinn á bak við „More".

#### 4. EKKERT ÓPUSHAÐ, ENGIN HANDTÖK

`NFL_LEDGER_USER` er enn eina `gh variable`-handtakið og stendur óbreytt.

#### 5. TVÆR REGLUR ÚR ÞESSARI LOTU SEM EIGA VIÐ NFL-HLIÐINA ALMENNT

- **Hlið á sókninni, ekki sía á svarinu.** Sleeper svarar **HTTP 200 með `[]`**
  fyrir `/leagues/nfl/undefined`; ytri þjónusta getur gefið vel-formað svar við
  spurningu sem aldrei átti að spyrja. Þá er ekkert á lestrarhliðinni til að
  grípa — eina vörnin er að senda ekki fyrirspurnina. Sama rök og gata
  meiðsla-söfnunina á tímabilinu í stað þess að sía svarið.
- **Þekjugólf verður að vera þriggja-stöðu.** „Keyrði ekkert" þarf að greina
  *brotnaði* frá *var drepið* — annars framleiðir það draugafall undir álagi,
  sem er nákvæmlega þegar fólk er líklegast að keyra það (sjá `clock-states`
  hjá fantasy-72).
