# CLAUDE.md — leiðarvísir fyrir Claude Code í þessu repo

Skrifað 26. júlí 2026 sem afhending úr löngum spjall-lotum yfir í Claude Code.
Lestu þetta, keyrðu svo `npm test` og `npm run build` áður en þú breytir nokkru.

---

## 1. Hvað þetta er

FPL-skipulagstól (Fantasy Premier League) fyrir eigin notkun. Íslenskt viðmót.
Tímabilið **2026/27 hefst 21. ágúst 2026** (GW1-frestur 21.8 kl. 17:30 UTC);
þegar þetta er skrifað er **preseason** — engin umferð lokin.

**Hýsing og flæði**

| Hluti | Hvar | Athugasemd |
|---|---|---|
| Framendi | GitHub Pages, `https://aronhogni.github.io/Fantasy/` | Vite, base `/Fantasy/` |
| Gagna-pipeline | GitHub Actions → `data/*.json` í repo | `fetch.yml` daglega 05 UTC, `fetch-fast.yml` á 30 mín |
| Gögn lesin af | `raw.githubusercontent.com/.../main/data/*.json` | appið sækir beint, engin bakendi |
| Proxy | Netlify function `netlify/functions/odds.js` | **EINA** sem Netlify hýsir |

**Skráastærðir** (til að vita hvað þú ert að opna):
`src/App.jsx` 3.397 l · `scripts/fetch.mjs` ~1.740 l · `src/model.js` ~265 l ·
`src/market.js` 95 l · `src/Pitch.jsx` 124 l · `netlify/functions/odds.js` 201 l ·
`src/stats.js` ~430 l · `src/GwReport.jsx` ~600 l · `src/Leaderboard.jsx` ~300 l ·
prófin ~1.500 l (sex söfn, sjá kafla 4).

**Þrír flipar** (frá 28.7.): `Skipulag` (upprunalega appið) · `Umferðin`
(`src/GwReport.jsx` — skýrsla um síðustu loknu umferð + skot-kort) ·
`Stigatafla` (`src/Leaderboard.jsx`). Flipa-státið er `view` í `App.jsx`.
Nýju fliparnir lesa AÐEINS `data/`-skrár — þeir hanga ekki á liðinu þínu
og virka þótt ekkert sé tengt. Allar tölur þeirra eru í `src/stats.js`
(hreint, ekkert React) af sömu ástæðu og `model.js`: prófin keyra sama kóða.

**`src/market.js`** (nýtt 27.7.): markaðs-umbreytingin (odds -> vænt mörk ->
FFDR-þyngd) var inni í `fetch.mjs` og því ÓPRÓFANLEG þótt hún beri 0,80 af
vog varnarmanns. Nú flytja pipeline OG bakprófin sömu skrá. Ekki afrita
þessar formúlur til baka inn í `fetch.mjs`.

**Leyndarmál í GitHub Secrets:** `ODDS_API_KEY`, `EURO_API_KEY`, `API_SPORTS_KEY`.
Þau eru gefin sem `env` í `fetch.yml`. Aldrei setja lykil í kóða eða í commit.

> **ÖRYGGI — GERÐU ÞETTA FYRST:** GitHub-PAT var notað í spjall-lotunum og er
> í spjallsögu. **Afturkallaðu það** (github.com/settings/tokens) og notaðu
> staðbundin git-skilríki héðan í frá. Ekkert token á að fara í þetta repo.

---

## 2. Vinnulag sem gildir hér

1. **`git pull --rebase` ALLTAF fyrst.** `fetch-fast` cron committar `data/`
   á 30 mín fresti og annars fæst fast-forward-höfnun við push.
2. **Prófin þrisvar fyrir hverja ýtingu**, ekki einu sinni. Nokkur próf lesa
   raunveruleg `data/`-gögn og kvörðunarpróf endurreikna úr þeim — flökt á að
   finnast áður en það lendir í main.
3. `npm run build` verður að vera grænt (Vite; `npx esbuild ... --outfile=/dev/null`
   er fljótlegt syntax-tékk á `App.jsx` meðan unnið er).
4. **Netlify: forðastu byggingar.** `netlify.toml` hefur ignore-reglu sem byggir
   AÐEINS þegar `netlify/` breytist (hver bygging kostar credit). Ekki hrófla við
   `odds.js` að óþörfu.
5. Commit-skilaboð á **íslensku án broddstafa** (ASCII), ítarleg: hvað, hvers
   vegna, og hvað var mælt. Sagan er raunveruleg skjölun hér.
6. Pipeline er ræst handvirkt með `workflow_dispatch` á `fetch.yml`
   (eða `gh workflow run fetch.yml`) og niðurstaða lesin úr `data/`.

---

## 3. Reiknilíkanið — MÁ EKKI FÍNSTILLA Á TILFINNINGU

Allt reiknilíkanið er í **`src/model.js`** (hreint, ekkert React) svo prófin
keyri nákvæmlega sama kóða og appið birtir. Ekki afrita formúlur inn í `App.jsx`.

Vogtölur og töflur þar eru **mældar**, ekki valdar: grid-leit með krossprófun á
2.720–3.808 lið-leikjum, liðsstyrkur alltaf úr fyrra tímabili (ekkert leki).
Ef þú vilt breyta þeim, þarf mæling að réttlæta það — annars fer bakprófið
niður og það er rétt hjá því.

**MÆLT 27.7.2026 — WALK-FORWARD Á 8 TÍMABILUM** (`tests/ffdr-walkforward.mjs`,
6.080 lið-leikir, styrkur alltaf úr fyrra tímabili, markaðslína endurbyggð úr
B365-oddsum, Elo reiknað fram í tímann). Þrennt sem eldra bakprófið gat ekki séð:

| inntak | r við mörk á sig |
|---|---|
| markaðslínan ein | **0,394** |
| FFDR (full inntök, mkt 0,80) | 0,393 |
| FFDR án markaðar (líkanskjarninn) | 0,293 |
| hrátt FDR eitt | 0,252 |

Sóknarhliðin, |r| við mörk **skoruð**: FFDR-sókn **0,383** · hrátt FDR 0,168.

### FFDR GEGN RAUNVERULEGUM STIGUM LEIKMANNA (mælt 28.7.2026)

Allt hér að ofan mældi FFDR gegn **lið**-útkomum, því per-umferðar
leikmannatölur voru ekki til í repo-inu. Nú eru þær:
`data/fpl_player_gw.json` (56.278 raðir, 5 tímabil, `scripts/fetch-player-gw.mjs`).
`tests/ffdr-player-points.mjs` mælir því loks **rétta markmiðið**, á 28.355
byrjunarliðs-umferðum (starts≥1, mín≥60):

| staða | stig/leik | r(FFDR) | r(FDR) | léttasti 1/6 -> þyngsti 1/6 |
|---|---|---|---|---|
| GK | 3,38 | **−0,167** | −0,141 | 4,06 -> 2,61 (+55%) |
| DEF | 3,15 | **−0,275** | −0,198 | 4,48 -> 1,83 (**+145%**) |
| MID | 3,74 | **−0,203** | −0,138 | 4,78 -> 2,88 (+66%) |
| FWD | 4,36 | **−0,214** | −0,143 | 5,66 -> 3,37 (+68%) |

FFDR slær opinbert FDR í **öllum fjórum stöðum**, og vænt stig
(`MEASURED_POS.pts`) er rétt kvarðað innan 0,28 stiga í öllum stöðum.

**ALGILT ÞREP Í STAÐ AFSTÆÐS Á SPJÖLDUM — LAGAÐ.** Spjöldin sýndu þrep
AFSTÆTT innan liðsins (röð leikja liðsins þvinguð í sex jafna hluta), sem
lét HVERT lið nota alla litina. Arsenal fékk því „rautt“ á leik sem er
algilt dökkgult og „ljósrautt“ á leik sem er algilt **grænn** — það var
raunveruleg röng birting. Notandinn tók eftir henni á Rice (2 rauðir leikir
sem voru í raun léttir).

| staða | r(ALGILT þrep) | r(afstætt þrep) | tapað merki |
|---|---|---|---|
| GK | −0,166 | −0,110 | 34% |
| DEF | −0,267 | −0,190 | 29% |
| MID | −0,195 | −0,139 | 29% |
| FWD | −0,204 | −0,144 | 29% |

Algilda þrepið tapar nánast engu gegn samfellda FFDR (−0,267 á móti −0,275)
en afstæða þrepið henti ~30% af merkinu. Spjöld OG tillögur eru nú algild,
og þar með samræmd „Lið — FFDR“-töflunni. Vörður: kafli E í
`ffdr-player-points.mjs`.

**VARNARSINNAÐIR MIÐJUMENN (Rice, Caicedo) — ENGIN BREYTING, MÆLT.**
Spurt var hvort þeir eigi að fá varnar-formúluna. Skilgreint úr gögnum
(xGI/90 úr FYRRA tímabili, svo ekkert leki): varnar-FFDR gefur −0,156 á
móti −0,153 fyrir sóknar-FFDR — **0,1σ**, hreint suð. Blöndusveipun
(`d = w·dDef + (1−w)·dAtt`) gefur besta w=0,55 með 0,009 ábata, en
hópaskiptingin er **ekki einræn** (3. fjórðungur vill w=0,95, sóknarsinnar
w=0) og besta w hoppar milli tímabila (0 / 0,65 / 0,75 / 1,0) og skiptir
formerki. Það sem notandinn sá hjá Rice var afstæða þrepið, ekki formúlan.

### TREND — „HEITUR“ LEIKMAÐUR ER EKKI HEITUR (mælt 28.7.2026)

Andstætt almennri FPL-visku, og því skjalað hér svo það sé ekki „lagað“:

| | hrá tala | eftir stjórnun fyrir gæðum |
|---|---|---|
| mark eftir mark í síðasta leik | 21,0% á móti 9,5% (**+11,5pp**) | **−2,9pp** |
| sjálffylgni innan leikmanns | — | **−0,061** (±0,007) |
| hreint blað eftir hreint blað | 29,0% á móti 26,4% (+2,7pp) | **−1,5pp** |

Hráa talan mælir bara að **góðir leikmenn skora oft**. Innan hópa með sömu
grunn-markatíðni snýst áhrifið við: leikmaður sem var nýbúinn að skora hnígur
að sínu eigin meðaltali. Sama gildir um lið og hrein blöð (15 tímabil).
**FORM ER ÞVÍ EKKI INNTAK Í FFDR** — það væri að verðleggja hávaða.

### STÖÐUR GEGN LIÐUM — HÁVAÐI, EKKI EIGINLEIKI (mælt 28.7.2026)

Spurt var hvort ákveðnar stöður nái stigum gegn ákveðnum liðum, svo það megi
spá fyrir sambærilega leikmenn í framtíðinni. `tests/pos-vs-opponent.mjs`
mælir leif (raunstig − FFDR-vænting) per (mótherji, staða) og spyr svo
**lykilspurningarinnar: flyst hún milli tímabila?**

| staða | pör | r(N -> N+1) | |
|---|---|---|---|
| GK | 34 | −0,182 (±0,180) | hávaði |
| DEF | 51 | −0,051 (±0,144) | hávaði |
| MID | 51 | −0,014 (±0,144) | hávaði |
| FWD | 35 | +0,059 (±0,177) | hávaði |

Stóru tölurnar innan tímabils (Wolves DEF +1,49 stig/leik, Ipswich FWD +1,52)
eru **38-leikja úrtakshávaði**, ekki eiginleiki liðsins. Þetta má EKKI fara í
FFDR: það myndi líta út eins og innsæi og vera tilviljun. Að leifin flytjist
ekki er jafnframt staðfesting á að FFDR sé þegar búið að draga út þann hluta
mótherjans sem ER stöðugur (xG/xGC, Elo, markaðslínan).

### FFDR GEGN OPINBERU FPL-FDR — 10 tímabil (mælt 28.7.2026)

`tests/ffdr-vs-fdr.mjs`. **FDR-ið er nú það raunverulega**, ekki nálgun:
`data/fpl_fdr_history.json` geymir `team_h_difficulty`/`team_a_difficulty` per
leik 1819–2526 úr afriti af FPL-API-inu (sótt af `scripts/fetch-fdr-history.mjs`,
öll 380/380 leikir per tímabil pöruð við E0 og staðfest gagntækt). Það munar:
FPL notar FDR **1** í 10% leikja 2024/25, sem nálgunin gerði aldrei.

| mælikvarði (6.080 lið-leikir með opinberu FDR) | FFDR | FDR | forskot |
|---|---|---|---|
| r við mörk á sig | **0,397** | 0,302 | +31% |
| AUC (hreint blað), yfir tilviljun | **17,2%** | 12,0% | 1,44x |
| Brier-skill eftir LOSO-kvörðun | **6,95%** | 3,56% | 1,95x |
| CS% léttasti 1/6 á móti þyngsta | **44,9% / 7,8%** | 39,0% / 12,2% | 37,1pp á móti 26,8pp |

**FFDR vinnur á báðum röðunarmælikvörðum í 10/10 tímabilum.** Þvingað í
**4 þrep** — sömu upplausn sem FDR hefur — er FFDR enn **1,79x**, svo forskotið
er upplýsingar og ekki fínni þrep. Án markaðslínunnar er FFDR 1,35x, svo
líkanið sjálft slær FDR og bókmakararnir bæta þar ofan á.

**ENDURFITTAÐ 28.7. Á OPINBERA FDR-IÐ.** Fyrsta `SCALE_FIX`-fittið notaði
nálgaða FDR-ið, en appið keyrir á opinbera — með því var kjarninn 0,090
léttari en fittið gerði ráð fyrir. Endurfittað á sama hátt (Brier gegn
úrslitum fyrir vörn, aðhvarf á markaðs-sóknarþyngd fyrir sókn), á þeim 8
tímabilum sem HAFA opinbera FDR-ið:

| | var | er |
|---|---|---|
| `SCALE_FIX.def` | 2,54 / 1,22 | **2,63 / 1,20** |
| `SCALE_FIX.att` | 2,57 / 0,89 | **2,62 / 0,87** |
| kvörðunarhalli varnar | −1,0pp | **+0,2pp** |
| meðalfrávik | 2,2pp | **2,0pp** |

LOSO-stöðugt (def center 2,58–2,66, att 2,61–2,64). LOSO-**Brier** batnar
aðeins í 3/8 tímabilum og það er rétt: þetta er KVÖRÐUN (hvar taflan er
lesin), ekki aðgreining. Aðgreining haggast ekki af affinu falli — r og AUC
í töflunni að ofan eru óbreytt.

Tvennt fylgdi: `MEASURED`-hnitin endurreiknuð með nýja fittinu
(1,43/1,91/2,39/2,87/3,83) og `TIER_CUTS` -> `[2,02, 2,39, 2,53, 2,80, 3,08]`.
**NÝR VÖRÐUR** (`model.test.mjs` kafli 4b) endurreiknar `MEASURED[i].d` úr
`MEASURED_LEGACY_D` og fellur ef þau reka frá `SCALE_FIX` — sú hætta var
raunveruleg því engin sjálfstæð heimild er til um birt mörk á sig.

Bakprófin nota nú **opinbera FDR-ið** (`fdrFor()` í `tests/lib/e0.mjs`) þegar
það er til, svo þau mæli sama heim sem appið keyrir í. Það styrkti kjarnann
mælanlega: r 0,293 -> **0,328**, og FFDR (0,406) nær nú markaðslínunni einni
(0,404) í fyrsta sinn.

1. **`mkt` fyrir GK/DEF var hækkað 0,50 -> 0,80.** Einræn framför upp að ~0,8
   og 0,80 slær 0,50 í **8/8 tímabilum**; kvörðun birtu CS%-talnanna batnaði
   samtímis úr +2,5pp halla í −0,6pp. Tvö óskyld viðmið sammála. Síðustu 0,2
   eru viljandi eftir (dómur, ekki mæling): línan kemur úr fáum bókmökurum og
   ein skekkt lína á ekki að ráða þyngdinni alveg.
2. **Sóknarhópurinn fékk RANGA markaðsstærð** — stærsti einstaki fundurinn.
   Markaðsliðurinn gaf ÖLLUM stöðum `marketDiff(xga)`, þ.e. þyngd þess að
   halda **hreinu blaði**. Fyrir miðjumann og framherja er það rangt: það
   mælir hvað mótherjinn skorar, ekki hvað liðið skorar. Rétta stærðin —
   eigin vænt mörk — var **þegar í `odds.json` sem `xg`**, ónotuð (pipeline
   sækir `totals,spreads`). Lagað með `marketAttackDiff`:
   r −0,345 -> **−0,383** við mörk skoruð, betra í **8/8 tímabilum**.
3. **`mkt` fyrir MID/FWD 0,35 -> 0,80** — og sagan er lærdómur: fyrsta
   mælingin sagði að 0,35 væri optimum og hækkun væri suð (0,50 gaf −0,3404
   á móti −0,3403). Það var **rétt mælt á röngu inntaki**. Með réttu stærðinni
   varð vogin einræn upp í 0,8 (−0,367 -> −0,388). Mæling á röngu inntaki
   gefur rétt svar við rangri spurningu.
4. **Handoff-tilgátan um margföldunar-lið** (`xgTeam = (mg/LG)*(og/LG)*LG*heima`
   með vog `W.xg≈0,20`) **mældist suð** og var EKKI tekin upp: r −0,3360 á
   móti −0,3342 fyrir kjarnann (0,14σ), slær hann í 5/8 tímabilum.
   Fyrirvari: sú tilgáta var mæld gegn **leikmannastigum** í öðru samhengi, hér
   gegn **mörkum skoruðum** — ekki sama markmið, svo þetta afsannar hana ekki
   formlega. En á markmiðinu sem má mæla með raungögnum í þessu repo er hún
   suð, og hún var ekki þess virði á móti T1 að ofan (0,050).

Ákvarðanir sem eru vísvitandi og hafa þegar verið véfengdar einu sinni:

- **FFDR** er útkoman. ClubElo, xGC og markaðslína (bókmakarar) eru **inntök**
  og eru því ekki birt sem sjálfstæðir dálkar við hliðina.
- **Ferðalengd er EKKI í FFDR.** Mælt á 3.420 útileikjum / 9 tímabilum, parað
  innan liðs-tímabils og mótherja-leiðrétt: t=−0,42, r=−0,037 — ógreinanlegt
  frá núlli. `tests/travel-measure.mjs` er **vörður** sem endurmælir og fellur
  ef áhrifin verða marktæk (|t|≥2 og |r|≥0,06). Ferðin birtist sem upplýsing
  (✈ km á leikjaröðum), ekki sem vog.
- **DefCon (DC) er EKKI í FFDR** og það er ekki gleymska: DC mælir vinnuálag
  varnar og fylgir oft *þyngri* leikjum — dregur í gagnstæða átt við hreint
  blað. Blöndun myndi láta merkin éta hvort annað. DC lifir á leikmannaspjöldum
  (≥70) og í liða-yfirlitinu.
- **LITIRNIR: sex þrep með HLUTLAUSU GRÁU MIÐÞREPI** (28.7.). Grænt og
  ljósgult voru nánast eins á skjá, svo miðjan var ólæsileg. Ljósgula þrepið
  varð `hlutlaust` grátt (`#ecedf1`), sem frelsaði dökkgrænt og dökkgult til
  að vera afgerandi mettuð. `TIER_NEUTRAL = 2`. Prófin verja bæði að
  miðþrepið sé ómettað og að nágranna-þrep séu sjónrænt aðgreind (≥20 í RGB).
  `tierOf` skilaði HARÐKÓÐUÐU 5 sem þyngsta þrepi — nú `TIER_CUTS.length`,
  svo fjöldi þrepa má breytast án þess að efsta þrepið verði ónothæft.
- **`TIER_CUTS`** eru **sextílar raunverulegrar
  FFDR-dreifingar** tímabilsins, ekki handvaldar tölur. Gömlu mörkin gáfu 3,8%
  dökkgrænt en 26% rautt („af hverju á hann alltaf rauða leiki?“). Prófið
  endurreiknar sextílana úr `data/` í hverri keyrslu og fellur ef þeir reka
  >0,12. **Litirnir eru afstæð kvörðun; tölurnar sjálfar haggast ekki.**
- **Wildcard og Free Hit eyða EKKI söfnuðum frískiptum** — þau haldast og +1
  bætist við (þak 5). FPL-regla frá 2024/25; eldri kóði endurstillti í 1 og
  sýndi ranga „X frí“-tölu.
- **Söluverð**: kaupverð + 50% af hagnaði, **niðurjafnað** á næstu 0,1. Tap =
  fullt núverandi verð. Reiknað í tíundum (`sellTenths`).
- **Vænt stig** (`expPointsFor`): grunnur (`ep_next`, annars `points_per_game`)
  × mældur margfaldari fyrir FFDR leiksins × tiltækileiki. Tvöföld umferð
  leggst saman, auð umferð = 0.
- **Verðspáin** („↑ í nótt?“) er **nálgun** — FPL birtir ekki formúluna. Þröskuldur
  skalast með eignarhaldi (√). Hún má aldrei birtast sem vissa.
- **Markaðsþyngd er reiknuð úr `xga` þegar `diff` vantar** (`model.js`). Ekki
  fjarlægja þá varaleið: `diff` var bætt í pipeline 25.7. kl. 20:29 en
  `odds.json` var síðast skrifuð kl. 17:30 sama dag, og odds eru aðeins sótt
  tvisvar per umferð — svo skráin í notkun hafði **aldrei** `diff`, `bkValid`
  var alltaf falskt og **markaðsliðurinn var dauður í appinu í heila viku**
  þótt öll 144 prófin væru græn (þau prófuðu formúluna, ekki hvort gögnin sem
  hún fær séu nýtileg). `xga` er einmitt inntakið í `marketDiff`, svo þetta er
  sama talan. Vörður: kafli 5b í `model.test.mjs`.

---

## 4. Prófakerfið — `npm test`

`tests/run-tests.mjs` keyrir **sex** söfn, **299 próf**, öll græn (keyrt 3x):

| Safn | Fjöldi | Hvað það gerir |
|---|---|---|
| `model.test.mjs` | 84 | Hver birt tala: söluverð, frí skipti/refsingar, vænt stig, mælda taflan, FFDR-eiginleikar, verðspá, PWA-skrár. **Endurkvarðar litamörkin úr `data/`.** Kafli 5b: vörður að hver röð í `odds.json` sé NÝTILEG (`diff` eða `xga`, `opp`, `kickoff`, gagnkvæm) — sá vörður vantaði og það kostaði viku af dauðum markaðslið. |
| `ffdr-backtest.mjs` | 10 | Spáir öllum 380 leikjum 2025/26 með styrk 2024/25 eingöngu. Svarar **„halda LITIRNIR?“** á einu tímabili. Grænasti sjöttungur 33% CS vs 13% rauðasti; r=0,217. Tölfræðileg vikmörk, ekki hörð mörk. |
| `ffdr-walkforward.mjs` | 27 | **8 tímabil (1819–2526), 6.080 lið-leikir, FULL inntök** — markaðslína endurbyggð úr B365-oddsum og Elo reiknað fram í tímann. Svarar því sem eldra bakprófið gat ekki: er FFDR betri en **sitt besta inntak**, er MEASURED-taflan rétt **kvörðuð** (ekki bara rétt röðuð), og virkar **sóknarhópurinn**. Sjá kafla 3. |
| `stats.test.mjs` | 121 | Flipana `Umferðin` og `Stigatafla`. Stat-skráin (hvert `get()` þolir tóm/vitlaus inntök — engin deiling með núlli), stigatöflu-röðun, jafnteflis-sæti og mínútu-þak, `bestXi` gegn FPL-formasjón, ESPN-skotin, nafna-pörun, og **vörður að mörk stemmi við úrslitin**. Tveir varðar sem eiga að fella: (a) ef X>0,5 hættir að vera undantekning hefur ESPN breytt hnitakerfinu og kortið er vitlaust; (b) ef nafna-pörun fellur undir 90% hefur heimild breytt nafnaformi. |
| `travel-measure.mjs` | 2 | Vörðurinn í kafla 3. |
| `smoke.test.mjs` | 55 | Appið keyrt í **jsdom** með raunverulegum `data/`-skrám og hermdu `fetch`. 15 spjöld, peningar (banki+lið = £100.0), umferðaskipti, FPL-reglur, chips, andstæðingar, vistun, meiðsli, ferðalengd. |

**`tests/lib/e0.mjs`** byggir spá-heiminn (liðsstyrkur, FDR-nálgun, markaðslína,
Elo) fyrir BÁÐA bakprófin. Ein uppbygging á einum stað — annars getur eitt
bakpróf mælt annan heim en hitt og bæði virst græn á meðan þau eru
ósamanburðarhæf. **FDR-nálgunin er kvörðuð gegn raunverulegu FPL-FDR** í
`data/fixtures.json` (meðaltal 3,05); gamla nálgunin var 0,25 þyngri og
skekkti allan líkanskjarna bakprófsins. Vörður fylgir.

**Gildrur í smoke-prófinu** (kostuðu tíma, ekki endurtaka):
- Sértækir `fetch`-mock-ar verða að koma **Á UNDAN** almenna `raw`-handlernum.
- Innsláttur í stýrða React-reiti er ótraustur í jsdom → andstæðingur er
  **forfylltur í `localStorage`** í staðinn; hnappurinn prófaður sér.
- Tvö eins `✕`-tákn í DOM (loka yfirliti + fjarlægja andstæðing). Notaðu
  `.at(-1)`, annars eyðir prófið sínum eigin gögnum.

---

## 5. Pipeline og gagnaskrár

`scripts/fetch.mjs` skrifar allt í `data/` (sjá `data/SCHEMA.md`). Hver heimild
skráir sig í `status.json` (`record(...)`) — appið birtir það undir
**Gagnaheimildir** í hliðarstiku. Ef ný heimild bætist við: skráðu hana þar,
annars er hún ósýnileg þegar hún brotnar.

Athugaðu sérstaklega:
- `season_baseline.json` — lokatölur fyrra tímabils (`label: "2025/26"`,
  558 leikmenn). Skrifað daglega **fram að GW1**, frýs svo. Þetta fæðir
  „í ár vs. í fyrra“-dálkana í yfirlitinu.
- `travel.json` — km og langferðaflagg per leik (birt, ekki reiknað í FFDR).
- `injuries.json` — sjá kafla 6.
- `odds.js` (proxy) hefur **strict routing**: óþekkt `path` skal skila 400.
  Áður féll allt óþekkt í bókmakera-greinina og **eyddi Odds-API kvótanum**.
  CDN-cache 60 s. Leiðirnar `fpl-entry` og `fpl-picks` eru endurnýttar fyrir
  andstæðinga-eininguna — engin ný Netlify-uppsetning þarf.

---

## 6. Í VINNSLU NÚNA — API-Sports (api-football.com v3)

Frítt þrep, 100 köll/dag. `API_SPORTS_KEY` er í secrets og `fetch.yml` gefur það.
Markmið: TEGUND meiðsla („Hamstring Injury“) sem FPL-fréttirnar sleppa.
**FPL-status ræður áfram tiltækileika; API-Sports auðgar hann bara.**

**Þrjár takmarkanir mældar empírískt** (ekki giskaðar — hver kostaði keyrslu):
1. `season=2026` er **læst** á fría þrepinu.
2. `date=` virkar, en síar eftir **leikdegi leiksins** sem meiðslin tengjast.
3. `date=` má aðeins vera innan **±1 dags** frá í dag
   („Free plans do not have access to this date…“).

**Núverandi útfærsla** (`fetchInjuries()` í `fetch.mjs`): reynir `season` fyrst
(svo uppfærsla í borgað þrep virki sjálfkrafa með 1 kalli), fellur svo á
leikdaga innan ±1 dags gluggans úr `fixtures.json`. Nafnapörun við FPL-id er
normalíseruð og **skorðuð við liðið** (annars ranganir á algengum eftirnöfnum);
óparaðir eru taldir í `injuries.json`.

**Staðan 26.7.:** hrein keyrsla, engin villa, `via: "engir leikdagar innan
frí-þreps gluggans (±1 dagur)"`, 0 köll notuð. Þetta er **réttur** preseason-
árangur. **PENDING: fyrsta raunprófunin er 20.–21. ágúst**, þegar GW1-leikir
koma inn í gluggann. Athugaðu þá `injuries.json` → `via`, `players`, `unmatched`
og lagaðu nafnapörun ef `unmatched` er stór.

---

## 6b. SKOT-GÖGN — mælt 27.–28. júlí 2026, ekki giskað

Þetta kostaði margar mælingar. **Ekki endurtaka þær; lestu töfluna.**

| Heimild | Svar | Skot-hnit | Woodwork | xG/skot |
|---|---|---|---|---|
| **ESPN** `site.api.espn.com/.../soccer/eng.1` | **200** | **já** | **já** | nei |
| Understat (bein) | 200 en **gagnalaust** | nei | nei | — |
| vaastav-speglun `understat/` | 200 | nei (aðeins leikja-samantekt) | nei | — |
| FBref | **403** | — | — | — |
| SofaScore (4 hostar) | **403** | — | — | — |

- **Understat er dautt fyrir okkur.** Leikjasíður skila aðeins `var match_info`
  (liða-xG, skot, skot á mark, deep, PPDA); `shotsData` og `rostersData` eru
  **horfin**. League-síður skila **byte-eins 18.645 b skel í 5/5 tilraunum og
  fyrir öll tímabil** (2019/2024/2025) — það er ekki timeout og batnar ekki í
  ágúst. `fetchUnderstatShots()` getur því ekki skilað gögnum og
  `luck.json`-woodwork verður áfram `null`. Skilaboðin þar voru ÓSÖNN
  („tímabil ekki byrjað?“) og eru nú lagfærð.
- **vaastav-speglunin** hafði aldrei skotstig og **stöðvaðist eftir 2024-25**.
  En hún gaf annað sem vantaði: `data/{season}/gws/gw{n}.csv` = raunveruleg
  per-umferðar FPL-gögn. Það er heimildin fyrir safn-skýrsluna.
- **SofaScore** var skoðað (shotmap MEÐ xG og post-flaggi — það sem ESPN vantar)
  en skilar 403 á fjórum hostum, líka á venjulegu vefsíðunni. Ónothæft óháð
  því hve gott fæðið er.

**ESPN-hnitakerfið er MÆLT:** `fieldPositionX` er **fjarlægð frá markinu sem
sótt er að**, ekki absolút staða. Prófið: í CRY 1–2 ARS liggja öll þrjú mörkin
á lágu X (0,262 / 0,264 / 0,128) þótt sitt hvort liðið skoraði — absolút kerfi
hefði sett þau á gagnstæða enda. Þess vegna er kortið **einn vallarhelmingur**,
markið UPPI, í réttum stærðarhlutföllum (68 m breitt × 52,5 m langt). Fyrsta
útgáfan hafði markið vinstra í 760×480 kassa og **togaði x-ásinn**.

**KVARÐINN — x er hlutfall af HÁLFUM velli (52,5 m), ekki af 105 m.**
Þetta kostaði villu sem ekkert próf sá: fyrsta útgáfan margfaldaði með 105 og
setti **hvert skot í tvöfalda fjarlægð**, svo mörk birtust uppi við miðjulínu.
Notandinn sá það á vellinum áður en nokkur tala afhjúpaði það.

Kvörðunin er mæld gegn **svæðis-texta ESPN, sem er óháður hnitunum**:

| Svæði (ESPN-texti) | mælt x | rétt hlutfall af 52,5 m |
|---|---|---|
| `close_range` (markteigur 5,5 m) | max **0,110** | 5,5/52,5 = **0,105** |
| í teig (vítateigur 16,5 m) | max **0,336** | 16,5/52,5 = **0,314** |
| utan teigs | min 0,340 | — |

Með 105 m kvarða ætti teigmarkið að vera 0,157 — það passar ekki. Y er hlutfall
af breidd (68 m): `box_left` 0,241–0,368 · `box_centre` 0,370–0,622 ·
`box_right` 0,634–0,766, óskarandi og í réttri röð.
**Metrar frá marki = x × 52,5.**

**Það eru ENGIN „ótraust" hnit.** Fyrri útgáfa henti 19 skotum með x>0,5 sem
„ótraustum" — en með réttum kvarða eru þau 27–51 m, öll merkt „outside the box"
af ESPN sjálfu. Þau voru aldrei rusl; kvarðinn okkar var rangur. x-sviðið er
0,040–0,964 = 2–51 m.

`tests/stats.test.mjs` kafli 6 er **kvörðunar-vörður**: hann ber hnitin við
svæðis-textann OG **útilokar 105 m kvarðann sérstaklega**, svo þessi villa geti
ekki laumast inn aftur.

**Nafna-pörun FPL↔ESPN er 99% (161/162), var 80%.** Þrennt þurfti: TRANSLIT-tafla
á undan NFD (`ß`→ss, punktlaust `ı`; „Groß“ varð „gro“ og „Kadıoğlu“ varð
„kad oglu“), orða-skörun í stað síðasta orðs (samsett eftirnöfn: „Diego Gómez
Amarilla“ vs „Diego Gómez“), og **eitt-á-eitt pörun** — annars hirtu tveir
Gomes-ar sömu skyttuna. Ópöraðir fá `null`, EKKI 0.

**Það sem enn vantar og má ALDREI látið sem sé til:** xG per skot (ESPN gefur
hana ekki → **big chances eru EKKI reiknuð**), touches í teig, og raunveruleg
meðalstaðsetning. `formation` er birt sem *uppstilling*, ekki sem mæld staðsetning.

**Krossprófun sem sannar úrdráttinn:** 23 mörk + 1 sjálfsmark = 24 = summa
úrslitanna í GW38, úr BÁÐUM heimildum sjálfstætt; og ESPN-skotafjöldi stemmir
við E0 upp á skot í helmingi leikja og víkur mest um 1. Bæði prófað.

**ÞRJÁR TÖLUR SEM LÍTA RANGT ÚT EN ERU RÉTTAR** — ekki „laga" þær:
1. **45 hrein blöð í 10 leikjum.** Þau eru talin **per leikmann**, ekki per lið:
   4 lið héldu hreinu (≈42 leikmenn) og 3 Arsenal-menn til viðbótar voru teknir
   af velli **áður en** Palace skoraði á 89. mín (83./74./61. mín). FPL-reglan er
   60+ mín án þess að fá á sig mark *meðan maður er inni á*. Liða-talan er nú
   birt við hliðina svo þetta lesist rétt.
2. **23 assist á móti 23 mörkum (100%).** FPL-skilgreiningin er rýmri en Opta —
   t.d. gefur FPL assist fyrir að vinna víti sem er skorað. ESPN telur 17 í sömu
   umferð. Þar sem þetta er FPL-tól er FPL-talan sú rétta; heimildin er merkt.
3. **Meslier með 11 mörk — ÞETTA ER RANGT, og það er FPL sem lýgur.**
   `bootstrap-static` skilar `goals_scored:11` með `minutes:0` og
   `total_points:0` (11 mörk gæfu ≥66 stig). Einn af 563. `isIncoherent()` í
   `stats.js` tekur út tölu sem krefst spilunar þegar mínútur eru 0, **telur
   hana og birtir þá tölu** — hún er ekki skrifuð í 0, því það fæli vandann.

---

## 7. Næstu skref (rædd, ekki byrjað)

### 0. KVARÐAGALLINN — LAGAÐUR 27.7.2026 (`SCALE_FIX`)

Var stærsta ómleysta atriðið. **Þrír** kvarðar stönguðust á, ekki tveir:

| kvarði | meðalleikur var við d | staða |
|---|---|---|
| `MEASURED_POS` (CS% og vænt stig á spjöldum) | **2,51** | viðmiðið |
| `marketDiff` (bókmakaralínan) | **2,44** | samræmi |
| líkanskjarninn `fdr*0,45 + own*3*0,55` + `elo` | **3,02** | ~0,5 of þungt |
| `MEASURED` (`lookupMeasured`, birt mörk á sig) | **2,97** | á LEGACY-kvarða |

Kjarninn OG `elo` eru á „1–5 kvarða með miðju í 3“; töflurnar eru á 2,5-kvarða.
Afleiðing: leikir **án** markaðslínu — allar umferðir nema næsta — fengu d sem
var ~0,5 of þungt og birt CS% var **6,7pp of svartsýnt**. Næsta umferð litaðist
grænni en seinni umferðir án þess að vera léttari, sem bitnaði beint á því sem
tólið er til fyrir.

**LAGAÐ** með `SCALE_FIX` í `model.js`: affint fall, **fittað gegn raunverulegum
úrslitum** (Brier á birta CS%-inu gegn því hvort hreint blað varð, 6.080
lið-leikir, LOSO-krossprófað). Röðin er nú: `fdr`+`own`+`elo` blandast á
3-kvarðanum -> `SCALE_FIX` færir á töflukvarðann -> markaðurinn blandast
**síðast** (hann er þegar á rétta kvarðanum og á ekki að þynnast eftir á).

| mæling | fyrir | eftir |
|---|---|---|
| kjarninn lætur töfluna lesa | −6,7pp | **−0,3pp** |
| kvörðunarhalli / meðalfrávik | +6,7 / 6,7pp | **+0,3 / 1,1pp** |
| Brier (kjarni, án markaðar) | 0,1902 | **0,1850** |
| stökk milli næstu og seinni umferða | ~9pp | **2,7pp** |

Staðfest á raungögnum: GW1 (hefur línu) meðal-FFDR 2,47 / birt CS 27,2% ·
GW3 (engin lína) 2,44 / 27,1% — **stökkið er farið**.

Tvennt fylgdi með og hvorugt var valfrjálst:
- **`MEASURED` d-hnitin endurmerkt** (2,00/2,40/2,80/3,20/4,00 -> 1,32/1,81/
  2,30/2,78/3,76). Þau voru á legacy-kvarðanum svo `App.jsx:1016` (birt mörk á
  sig) las töfluna á röngum stað eftir leiðréttinguna. Endurmerking, **ekki**
  endurmæling: `cs`/`ga`/`def`/`gk`/`att` haggast ekki.
- **`TIER_CUTS` endurreiknuð** -> `[1,92, 2,30, 2,46, 2,75, 3,03]`. Öll
  dreifingin færðist um ~0,5 svo gömlu mörkin gáfu 48,8% dökkgrænt. Litirnir
  eru afstæðir sextílar og fylgja kvarðanum; hvert þrep fær nú ~1/6 aftur.
  Prófið sem felldi þau gerði nákvæmlega það sem það átti að gera.

**EFTIRSTÖÐVAR (minni, sér yfirferð):** `marketDiff` sjálf lætur töfluna lesa
**~2,4pp of bjartsýnt**. Það er fjórðungur af upphaflega gallanum. Ekki lagað
því fittið á markaðnum lenti á grid-jaðrinum (center 3,1 = jaðar) og er þar með
ekki traust, og `MARKET_CALIB` var mælt sérstaklega annars staðar. Vörður í
`ffdr-walkforward.mjs` kafla 9 heldur því innan 4pp.

**ATH VIÐ ENDURKVÖRÐUN — REGIME-BREYTING:** hreint blað hefur **fallið**:
~28% (2017–2023) -> ~23% (2023–2026), mörk/leik upp. `SCALE_FIX` var samt
fittað á öll 8 tímabilin því fitt á síðustu 3 var **óstöðugt** undir LOSO
(center 2,53–2,73, spread 0,86–1,28) og gaf ekki betra meðalfrávik (3,1 á móti
3,2pp) og VERRA á 2025/26 einu (+1,8pp á móti −0,3pp). Ef regime-breytingin
heldur áfram er þetta fyrsta talan sem á að endurmæla.

### 0b. ÚR HANDOFF-I 27.7. — AFGREITT OG ÓAFGREITT

Handoff úr spjall-lotu lagði fram fjögur atriði. Staða þeirra eftir mælingu:

| atriði | staða |
|---|---|
| Markaðs-lína á **lið-mörkum** („bæta totals+spreads við h2h“) | **VAR ÞEGAR TIL.** `fetch.mjs:1109` sækir `h2h,totals,spreads` og `odds.json` geymir `xg` per lið. Ekkert API-verk þurfti — stærðin var bara ónotuð. Sjá kafla 3 atriði 2. |
| Sóknar-liðurinn er ekki betri en hrátt FDR | **Var rétt greint í eðli, rangt í orsök.** Orsökin var ranga markaðsstærðin, ekki `own`-liðurinn. Lagað. |
| Margföldunar-liður `W.xg≈0,20` | **Mælt suð, ekki tekið upp.** Sjá kafla 3 atriði 4. |
| Tillögu-líkanið noti FFDR í stað hrás FDR | **ÓAFGREITT — ekki í repo.** Prótótýpan var aldrei ýtt. Sjá hér að neðan. |

**ÓAFGREITT: tillögu-líkanið (`recs`) notar hrátt FDR.** Handoff-ið segir að
FIT-vogtölurnar (`src/App.jsx:170`, `fdr:-0,597` fyrir GK o.s.frv.) hafi verið
fittaðar gegn **hráu FDR**. Að skipta FFDR inn án endurfits setur vog sem var
mæld á einum kvarða á annan kvarða — og við vitum núna að kvarðarnir eru ekki
þeir sömu (kafli 7.0: kjarninn miðar á 3,0, taflan á 2,5). Því er þetta
**ekki einföld skipting** og var ekki gert blint.

Rétta röðin er:
1. Leysa kvarðamálið í 7.0 (það ræður hvaða kvarði FFDR er á).
2. Endurfitta `FIT`-vogtölurnar gegn FFDR — þarf `form_features.json`
   (er í `data/`) og fittunar-skriftuna, sem er **ekki í repo-inu**.
   Hún þarf að koma inn áður en þetta er hægt; annars er hvert nýtt
   vogtölusett ómælt og fellur á reglunni í kafla 3.
3. Þá fyrst skipta, og mæla að bakprófið batni.

### Annað

1. **`/fixtures/lineups` — staðfest byrjunarlið.** Verðmætasta viðbótin:
   liðin birtast 40–60 mín fyrir leik, innan ±1 dags gluggans, og `fetch-fast`
   (30 mín) gæti gripið þau → „byrjar EKKI“-flagg á þínum mönnum fyrir seinni
   leiki dagsins. ~10 köll/leikdag. **Á að vera til fyrir GW1.**
2. `/players?league=39&season=` — ítarlegri tölur (skot, lykilsendingar,
   einvígi, einkunn). Líklega læst eins og meiðslin; kostar 1 kall að prófa.
3. `/predictions`, `/odds` — **ekki þess virði**: við höfum bókmakera-línu og
   Elo *mæld* inn í FFDR. Ómæld spá færi aldrei í líkanið, aðeins í birtingu.
4. **Samanburðartaflan „í ár vs. í fyrra“** er byggð og villuvarin en hefur
   **aldrei keyrt** — hún kviknar fyrst þegar GW1 klárast. Skoða þá.
5. Hugmynd sem notandi hefur ekki beðið um: mjókka hægri hliðarstiku
   (320 → ~290 px) ef völlurinn má stækka enn meira.

---

## 8. Viðmótsreglur sem hafa þegar verið lærðar

- **Völlurinn er í venjulegu flæði** (`rowsArea` space-evenly + HTML-bekkjarborði),
  EKKI negldur á fastar prósentur. Gamla útgáfan lét spjöld skarast og klippti
  bekkinn. Ekki fara til baka í absolute-staðsetningu.
- Skel `maxWidth: 1280`; leikjadálkur `minmax(280px, 340px)`; spjaldabreidd
  `clamp(62px, 17.5%, 100px)`. Responsive í `src/styles.css` (brot við
  1020/760/480 með `!important`).
- **Tölur í yfirliti eru flokkaðar undir þremur fyrirsögnum** sem bera heimildina:
  NÚNA (lifandi) · TÍMABILIÐ `<ártal>` (uppsafnað, ártal reiknað úr GW1-fresti) ·
  STYRKUR LIÐSINS (reiknað). Per-tölu merki (`nú`/`∑`/`reikn.`) voru fjarlægð
  sem tvítekning — ekki setja þau inn aftur.
- Notandinn vill **einfaldar töflur**. Ekki bæta dálkum í „Lið — FFDR“ nema
  hann biðji um það.

---

## 9. Það sem þetta skjal getur EKKI flutt með sér

Þrennt fylgir ekki repo-inu og þarf að vera til á vélinni:

1. **Git-skilríki.** `gh auth login` eða SSH-lykill. (Og afturkallaðu PAT-ið, sjá kafla 1.)
2. **API-lyklarnir**, ef þú vilt keyra `scripts/fetch.mjs` staðbundið. Þeir búa í
   GitHub Secrets og pipeline fær þá þar; `fetch.mjs` les aðeins `process.env`
   (ekkert dotenv). Staðbundið:
   ```bash
   export API_SPORTS_KEY=...  ODDS_API_KEY=...  EURO_API_KEY=...
   node scripts/fetch.mjs
   ```
   Vantar lykil → `FLAGS` sleppir þeirri heimild þegjandi (ekki hrun), svo þú
   getur keyrt hitt án þeirra. `.env` og `.env.local` eru í `.gitignore` —
   **repo er public, aldrei lykil í commit.**
3. **Þitt eigið liðsástand** (byrjunarlið, fyrirliði, skiptaáætlun, chips,
   andstæðingar) er í `localStorage` í vafranum, ekki í repo. Það flyst ekki
   milli véla; `START_IDS` í `tests/smoke.test.mjs` er aðeins prófliðið.

Allt annað er í repo-inu: prófin (144, þau **framkvæma** ákvarðanirnar í kafla 3
og eru þar með áreiðanlegri en prósa), `README.md`, `data/SCHEMA.md` og
commit-sagan á íslensku.

---

## 10. Fyrsta lota í Claude Code — tillaga

```bash
npm ci && npm test && npm run build      # allt á að vera grænt
npm run dev                              # sjáðu völlinn í raun (ég gat ekki)
```

Það sem ég gat **ekki** gert og þú getur:
- Opnað live-síðuna eða `npm run dev` (útlitsbreytingar voru reiknaðar blint).
- Kallað á `fantasy.premierleague.com` eða `api-football.com` beint — API-Sports
  mælingin tók 3 Actions-keyrslur sem eitt `curl` hefði afgreitt.
- Prófað PWA-uppsetningu á síma.

Byrjaðu þar: **staðfestu útlitið sjónrænt** og **prófaðu API-Sports-lykilinn
beint** áður en næsta eiginleiki fer inn.
