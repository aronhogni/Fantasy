# MÆLINGA-SKJALASAFN — full saga ákvarðana (26.7.–8.8.2026)

> **Þetta er EKKI leiðarvísirinn. `CLAUDE.md` er hann.**
>
> Þessi skrá er orðrétt afrit af `CLAUDE.md` eins og hún var 8.8.2026, áður en
> hún var stytt úr 3.141 línu í ~700. Ekkert var fellt út héðan — allar
> mælingar, allar töflur, allar villusögur og öll rökstuðningur standa hér.
>
> **Hvers vegna klofningur:** `CLAUDE.md` er hlaðin inn í samhengi Claude Code
> í HVERRI einustu lotu. 182 KB af mælinga-sögu í hverri lotu er kostnaður sem
> skilar sér ekki; reglurnar sem þarf að FYLGJA eru allt annað og miklu minna
> mengi en mælingarnar sem réttlæta þær.
>
> **Hvenær á að lesa þessa skrá:** þegar þú ætlar að breyta vogtölu, taka upp
> inntak sem stendur á „MÆLT OG HAFNAÐ“-listanum í kafla 4 í `CLAUDE.md`, eða
> skilja HVERS VEGNA tala er eins og hún er. Kaflanúmerin hér eru þau sömu og
> vísað er í þaðan.
>
> **Þessi skrá er söguleg og á ekki að uppfærast.** Nýjar mælingar fara í
> `CLAUDE.md` (stutt niðurstaða) og, ef þær bera langan rökstuðning, aftast
> hér með dagsetningu.

Upphaflegur haus skjalsins fylgir hér að neðan óbreyttur.

---

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
`src/App.jsx` 3.572 l · `scripts/fetch.mjs` ~2.714 l · `src/model.js` 599 l ·
`src/market.js` 95 l · `src/Pitch.jsx` 124 l · `netlify/functions/odds.js` 201 l ·
`src/stats.js` ~430 l · `src/GwReport.jsx` ~600 l · `src/Leaderboard.jsx` ~300 l ·
`src/rotation.js` 171 l · `src/Rotation.jsx` 332 l ·
prófin (**38 söfn**, sjá kafla 4).

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

### 3e. NÝLIÐA-GRUNNURINN — MÆLT 2.8.2026 OG HAFNAÐ

Kóða-yfirferð benti á að `ep_next` sé of lágt fyrir nýliða og að þetta væri
„stærsti mældi ábatinn sem eftir er". **Skekkjan er raunveruleg. Hún er samt
EKKI nýtanleg.** Mælt á fjórum nýliða-árgöngum (2223 Bournemouth/Forest/Fulham,
2324 Sheffield Utd/Burnley/Luton, 2425 Southampton/Leicester/Ipswich,
2526 Sunderland/Burnley/Leeds), GW1–5, LOSO á árgöngum.

**Skekkjan, á BYRJUNARLIÐSMÖNNUM** (starts≥1, mín≥60; n=446):

| staða | raunstig | FPL-xP | halli | t |
|---|---|---|---|---|
| GK | 3,14 | 2,05 | **+1,09** | 3,3 |
| DEF | 2,33 | 1,38 | **+0,95** | 5,9 |
| MID | 3,01 | 1,78 | **+1,24** | 8,3 |
| FWD | 3,43 | 2,17 | **+1,26** | 3,3 |

Á þeirri laug slær 50/50-blanda við stöðu-forgildi xP-ið: MAE 1,646 -> 1,452.
**Þess vegna leit þetta út eins og stór ábati.**

**EN LAUGIN SEM APPIÐ BEITIR GRUNNINUM Á ER ÖNNUR** — allir nýliðar, líka
þeir sem spila ekki (n=1994). Þar er niðurstaðan viðsnúin:

| kostur | MAE (LOSO) |
|---|---|
| **xP óbreytt** | **0,848** |
| blanda 50/50 | 0,873 |
| flatt stöðu-forgildi | 1,217 |

Skekkjan er enn til (+0,44 til +0,48, t upp í 11,1) en **hver leiðrétting
gerir spána VERRI** á þeirri laug. Blint grunn-skipti myndi því versna appið.

**SKILYRT LEIÐRÉTTING VIRKAR EKKI HELDUR.** Fjórar útfærslur prófaðar með
mínútum úr FYRRI umferðum sama tímabils (enginn leki): blanda ef mín≥60,
blanda × mín/90, halli × mín/90, blind blanda. Besta gaf **0,0005 stig í MAE**
og vann í **2/4 árgöngum** — hreint suð.

**HVERS VEGNA:** skekkjan er samanþjöppuð í þeim sem BYRJA, og þegar við
vitum að hann byrjar (fyrri mínútur) er xP-ið þegar búið að ná honum. Í GW1 —
þar sem þetta myndi skipta mestu — er ENGIN fyrri-mínútu-vísbending til að
skilyrða á.

**Niðurstaða: LOKAÐ sem mælt-og-hafnað.** Ekki taka upp stöðu-forgildi fyrir
nýliða. Vörður: `tests/exp-points.mjs` (nýliða-kafli) fellur ef blint
forgildi er sett inn. Ef einhver vill reyna aftur þarf **nýtt inntak** sem
segir fyrir GW1 hver byrjar — ekki nýja töflu ofan á sömu inntök.

### 3c. MÍNÚTUÞRÓUN — eina inntakið sem árstölur geta ekki gefið (mælt 29.7.)

Appið hafði aðeins ÁRSTÖLUR (`minutes / gamesPlayed`). Sú tala getur ekki
greint mann sem er að **vinna sér sess** frá manni sem er að **missa hann**
— báðir geta endað í 60 mín/leik. Per-umferðar sagan getur:

    mins_trend = mín/umferð síðustu 2  MÍNUS  mín/umferð þriggja þar á undan

Mælt á 5 tímabilum, vog **0,01** valin með LOSO. Niðurstaðan er SKILYRT VIÐ
LAUGINA og það er kjarninn:

| laug | fall í topp-15 | tímabil jákvæð |
|---|---|---|
| **allir leikmenn** (það sem tillögu-vélin raðar í raun) | **+0,066** | **5/5**, t=6,66 |
| aðeins þeir sem SPILUÐU | −0,008 | 2/5 — hávaði |

Seinni röðin er ekki bilun heldur skiljanleg: hafi maður þegar spilað er
þróunin búin að segja sitt í mínútunum sjálfum. LOSO út fyrir úrtak gaf
+0,066 (4/5), svo þetta er ekki grid-yfirfitting.

**LAGT OFAN Á gömlu vogtölurnar, EKKI endurfittað.** Endurfitting á raunsæju
lauginni gaf +0,100 þar en **TAPAÐI topp-5 (6,025 -> 5,779)**. Viðbótin
heldur báðum. **MÆLT OG SLEPPT:** `full90` + `start_rate5` gáfu −0,018 í
BÁÐUM laugum — ekki setja inn aftur án nýrrar mælingar.

Gögnin koma úr `data/player_form.json`, LEITT ÚT ÚR `data/live/gw{n}.json`
sem pipeline skrifar þegar — **engin ný köll**. Raðirnar eru per UMFERÐ, ekki
per leikinn leik (bekkjarmaður fær 0 og telur með); fyrri mæling sem sleppti
0-röðum sagði bekkjarmenn „í formi“. **Í forleik er `data/live/` tóm, svo
þróunin er 0 og skorið er NÁKVÆMLEGA eins og áður — hún kviknar við GW4.**

### 3d. FFDR-SAMANBURÐUR — RÓTERINGS-PAR (`src/rotation.js`, 29.7.)

Svarar: *„VVD á City á útivelli og Arsenal tveimur umferðum seinna — hver
kemur inn fyrir hann í ÞEIM umferðum?“* Ikon **↻** á leikmannaspjaldinu.

Þetta er **önnur spurning en FFDR-taflan** og prófið sannar það: maður með
BETRI 6 umferðir í heild er gagnslaus sem par sé hann þungur í sömu
umferðunum. `tests/rotation.mjs` kafli 3 er sá prófsteinn.

- erfitt = dökkgult(3)/ljósrautt(4)/rautt(5), þyngd **1/2/3**
- **AUÐ UMFERÐ ER ÞYNGST** (3). Notandinn nefndi hana ekki, en blank = 0 stig
  og það er verra en hvaða rauði leikur sem er.
- tveir menn valdir -> þyngdin **LEGGST SAMAN** (sammengi, ekki snið)
- **ÞEKJA** = hlutfall þyngdarinnar sem hann mætir með hlutlausum leik eða
  betri. Þetta er FFDR-svarið.
- **VINNINGUR** = vænt stig hans mínus þess (verri) manns sem hann kemur inn
  fyrir, AÐEINS í erfiðu umferðunum. Þetta er ákvörðunin.
- **RAÐAÐ EFTIR VINNINGI**, ekki þekju: hrein FFDR-þekja setur menn í slökum
  liðum á toppinn. Þekja > 0 er samt SKILYRÐI.
- stöðu-reglan: markmaður kemur ALDREI inn fyrir varnarmann, svo GK valinn ->
  aðeins GK; annars allt nema GK.
- **VERÐÞAK** (sjálfg. +£2,0): ÁN þess raðast Haaland á toppinn hjá HVERJUM
  varnarmanni — rétt svar við „hver skorar mest?“ en rangt við „hver kemur
  inn af bekknum?“. Þakið er **UI-afmörkun, EKKI hluti líkansins**.
- **BYRJUNAR-GOLF OG -VOG** (4.8.2026, að beiðni notanda): varamarkmaður
  sem spilar aldrei var fullgildur frambjóðandi — heilbrigður
  (tiltækileiki 1,0), ódýr og með græna leiki, því FFDR er eiginleiki
  LIÐSINS. Nú: `MIN_START_PROB = 0,15` — frambjóðandi með MÆLDAR
  byrjunar-líkur (6h-líkanið) undir golfi er útilokaður, og vinningurinn
  er veginn `ep × P(byrjar)` báðum megin (líka hjá valda manninum).
  Golfið er mælt: hreinir varamarkmenn P=0,038–0,039, hvíldur aðalmaður
  (Raya GW38) P=0,47 — 0,15 sker með breiðu bili á báða bóga.
  **`P=null` (engin gögn, t.d. nýliðar/nýflutt lið) útilokar ALDREI** —
  „engin gögn“ og „spilar ekki“ eru ekki sama hlutið; þeir birtast án
  ▶%-merkis og lagast sjálfkrafa þegar umferðargögn koma. Vörður:
  kafli 7 í `tests/rotation.mjs`, þrjár stökkbreytingar felldar.

Reikningurinn er allur í `src/rotation.js` (hreint, ekkert React) af sömu
ástæðu og `model.js`. `src/Rotation.jsx` er birting eingöngu.

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

`tests/run-tests.mjs` keyrir **38 söfn** (auk 7
seiglu-atburðarása og 22 viðmóta sem telja ekki eins), öll græn (keyrt 3x).
**Fjöldinn er reiknaður úr `SUITES`** — hann var harðkóðaður strengur
("fimmtan") sem staðnaði um leið og safni var bætt við.

Taflan hér að neðan er ekki tæmandi; hún nefnir þau sem bera ákvarðanir.

| Safn | Fjöldi | Hvað það gerir |
|---|---|---|
| `model.test.mjs` | 84 | Hver birt tala: söluverð, frí skipti/refsingar, vænt stig, mælda taflan, FFDR-eiginleikar, verðspá, PWA-skrár. **Endurkvarðar litamörkin úr `data/`.** Kafli 5b: vörður að hver röð í `odds.json` sé NÝTILEG (`diff` eða `xga`, `opp`, `kickoff`, gagnkvæm) — sá vörður vantaði og það kostaði viku af dauðum markaðslið. |
| `ffdr-backtest.mjs` | 10 | Spáir öllum 380 leikjum 2025/26 með styrk 2024/25 eingöngu. Svarar **„halda LITIRNIR?“** á einu tímabili. Grænasti sjöttungur 33% CS vs 13% rauðasti; r=0,217. Tölfræðileg vikmörk, ekki hörð mörk. |
| `ffdr-walkforward.mjs` | 27 | **8 tímabil (1819–2526), 6.080 lið-leikir, FULL inntök** — markaðslína endurbyggð úr B365-oddsum og Elo reiknað fram í tímann. Svarar því sem eldra bakprófið gat ekki: er FFDR betri en **sitt besta inntak**, er MEASURED-taflan rétt **kvörðuð** (ekki bara rétt röðuð), og virkar **sóknarhópurinn**. Sjá kafla 3. |
| `stats.test.mjs` | 121 | Flipana `Umferðin` og `Stigatafla`. Stat-skráin (hvert `get()` þolir tóm/vitlaus inntök — engin deiling með núlli), stigatöflu-röðun, jafnteflis-sæti og mínútu-þak, `bestXi` gegn FPL-formasjón, ESPN-skotin, nafna-pörun, og **vörður að mörk stemmi við úrslitin**. Tveir varðar sem eiga að fella: (a) ef X>0,5 hættir að vera undantekning hefur ESPN breytt hnitakerfinu og kortið er vitlaust; (b) ef nafna-pörun fellur undir 90% hefur heimild breytt nafnaformi. |
| `rank-model.mjs` | 13 | RÖÐUNARSKORIÐ fyrir tillögur (`rankScore`). Mælt á 5 tímabilum, LOSO: topp-15 5,13 og topp-5 6,07 á móti 4,70/5,29 hjá aðferð appsins og 4,48/5,20 hjá **FPL-eigin xP**. Inniheldur ORAKEL-ÞAKIÐ (5,62 / 6,54) sem sýnir að hærri tala væri LEKI, ekki afrek. |
| `mins-trend.mjs` | 22 | MÍNÚTUÞRÓUN í röðunarskori (`RANK_W.minsTrend`). Sjá kafla 3c. Kafli 0 dregur `computePlayerForm` ÚT ÚR `scripts/fetch.mjs` og keyrir hana á TILBÚNUM live-skrám — sá kóði kviknar fyrst 21. ágúst og ómældur kóði sem fer í gang einn morgun var ekki ásættanlegt. |
| `rotation.mjs` | 44 | FFDR-SAMANBURÐUR / róterings-par (`src/rotation.js`). Sjá kafla 3d. Kafli 3 er PRÓFSTEINNINN: spegilmynd verður að vinna þann sem er BETRI Í HEILD, annars er þetta röðun í dulargervi. |
| `workflow-push.mjs` | 37 | PUSH-KAPPHLAUPIÐ í pipeline. Dregur shell-blokkina ÚT ÚR `.github/workflows/*.yml` og keyrir hana á ALVÖRU git-hirslum með kapphlaupið þvingað fram. Sjá kafla 5b. |
| `travel-measure.mjs` | 2 | Vörðurinn í kafla 3. |
| `mo-candidates.mjs` | 9 | **mó gegn frambjóðendum á 4 tímabilum** (2223–2526). Mælir shipped `moScore` (ekki afrit af formúlunni) og heldur `xGI`-ábatanum með **bootstrap klösuðum per leikmann** — CI verður að útiloka núll. Sami vörður hafnaði því að sleppa óheppnis-liðnum. Sjá 6d. |
| `error-boundary.mjs` | 18 | **HVÍTI SKJÁRINN.** Prófar ÚTGÖNGUNA, ekki bara að kassinn birtist: tvístiga hreinsun vistaðs ástands, að `fpl_*` fari en **`fpl_lang` haldi sér**, og að lyklar annarra appa á sömu slóð séu óhreyfðir. Sjá 8c. |
| `name-match.mjs` | 14 | **NAFNA-PÖRUNIN — heitasti kóðinn í appinu.** Skorið borið við sjálfstæða viðmiðs-útfærslu á 9.464 raunverulegum pörum OG tilbúnum jaðartilfellum (tvítekin tökn — raungögn hafa þau ekki, svo þau nægja ekki). Tíma-þak 25 ms; hagræðingin mældist 60,1 -> 4,7 ms. Sjá 6i. |
| `i18n-dom.mjs` | 18 | **TUNGUMÁL LESIÐ AF SKJÁNUM.** Appið teiknað í jsdom á BÁÐUM málum og DOM-arnir bornir saman: lína sem er eins á báðum málum er annaðhvort viljandi eins eða óþýdd. Nær það sem AST-prófið getur ekki séð — ASCII-íslensku („fellur") og íslenskan bút sprautaðan INN í þýddan streng. Sex stökkbreytingar prófaðar. |
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

### 5b. PUSH-KAPPHLAUPIÐ — LAGAÐ 29.7.2026, hafði ÞEGAR kostað dag

`fetch-data` féll 29.7. kl. 07:40:28 UTC:

    [main 76b0b9b] data: 2026-07-29
     25 files changed, 25 insertions(+), 25 deletions(-)
    ! [rejected]  main -> main (fetch first)

`fetch-fast` pushaði kl. 07:40:16 — **tólf sekúndum á undan**. Sóknin var
fullkomlega í lagi (25 skrár, engin heimild brast) en pushinu var hafnað og
**gögn dagsins fóru í ruslið**. Keyrslan varð rauð og ekkert sagði HVAÐ
tapaðist.

Orsökin var tvíþætt: `fetch.yml` hafði **enga `git pull`**, og `fetch-fast.yml`
pullaði **áður en hún committaði** — sem lokar minni glugganum en ekki þeim
sem felldi hana. Þetta er sama kapphlaupið sem kafli 2 varar MANNESKJUR við,
en workflowin sjálf gerðu það ekki.

**Lausn:** endurtilraunalykkja (5 tilraunir) í BÁÐUM. Við höfnun er sótt og
endurstillt ofan á `origin/main` og pushað aftur. Við árekstur í `data/`
vinnur OKKAR fersk sókn (`rebase -X theirs` = commitið sem er endurspilað).
Það er rétt hér því `data/` er endurmyndað Í HEILD í hverri keyrslu.

**Staðfest í raun:** bæði workflow ræst samtímis 29.7. kl. 19:58 — `fetch-fast`
kláraðist á 14 s meðan `fetch-data` var í gangi, og logið sýnir
`! [rejected]` -> `push hafnað (tilraun 1)` -> **`pushað í tilraun 2`**, keyrslan
GRÆN. Vörður: `tests/workflow-push.mjs`.

Actions-útgáfur `checkout`/`setup-node` eru **v5** í öllum þrem workflowum
(Node 20 afskrifað; runnerinn þvingaði þegar Node 24). Prófið ver það — og það
var einmitt prófið sem fann að `pages.yml` var enn á v4.

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

## 6c. TREND — MÆLT 28.7.2026 á 3 tímabilum (114 umferðir)

Gögn: `vaastav`-speglun, per-umferðar CSV 2023-24 / 2024-25 / 2025-26.
Greiningarnar eru í `scratchpad` (ekki í repo) en **niðurstöðurnar eru hér**
því þær breyta því hvað við megum segja í viðmótinu.

### „Heitur leikmaður" ER BLEKKING — mikilvægasta niðurstaðan

Hrátt lítur formið sterkt út: sá sem skoraði skorar í næsta leik í **20,6%**
tilvika á móti **9,5%** hjá þeim sem skoraði ekki — *2,17× lyfting*, og hún
helst yfir 1–4 umferðir (2,09–2,17×). Það er nákvæmlega mynstrið sem fær fólk
til að elta „heita" leikmenn.

**En það er gæða-rugl (confound): góðir leikmenn skora oftar OG eru líklegri
til að skora aftur.** Þegar hver leikmaður er borinn saman við **sitt eigið**
meðaltal snýst niðurstaðan við:

| Innan-leikmanns próf (n=291 leikmenn) | Eigið grunnhlutfall | Eftir atburð | Munur |
|---|---|---|---|
| **Eftir að hafa skorað** | 24,3% | 19,8% | **−4,52pp** (t = −5,26) |
| Eftir óheppinn leik (xG≥0,5, ekkert mark) | 30,8% | 32,0% | +1,24pp (t = 0,37) |
| Eftir daufan leik (xG<0,1) | 10,3% | 11,2% | +0,93pp (t = +3,21) |

**Innan leikmanns er væg AFTURHVARF TIL MEÐALTALS, ekki form.** Að kaupa
leikmann *af því að hann skoraði síðast* er að kaupa á toppi sveiflu.
Það sem heldur er **magnið** (xG, threat), ekki atburðurinn — og það er
einmitt þess vegna sem mó-stuðullinn vegur magn þyngst (sjá 6d).

### Hrein blöð liða RAÐAST EKKI Í RUNUR

| | Hreint blað í næsta leik |
|---|---|
| Eftir hreint blað | **22,8%** |
| Eftir að hafa fengið á sig mark | **23,0%** |
| **Lyfting** | **0,99 — enginn munur** |
| Eftir TVÖ hrein í röð | 21,2% (n=113) — *lægra en grunnur* |
| Eftir sigur MEÐ hreinu blaði | 24,1% (n=399) |

Úrtak: 505 leikir eftir CS, 1.672 eftir mark á sig. **Að elta vörn „á hreinu-
blaðs rúnti" á sér enga stoð í gögnunum.** FFDR og xGC eiga að ráða vali á
vörnum, ekki síðasta úrslit.

---

## 6d. MÓ / AÓ — „óhjákvæmilegt" (mælt, annað féll)

Markhópur: leikmenn með **0–1 framlag** síðustu 4 umferðir og 180+ mín.
Mælt á 13.273 sýnum. Mælikvarði: lyfting efsta tíundarhlutans.

**MÓ stenst — samsettur stuðull `xG·0,8 + threat/25·0,3 + óheppni·0,2`:**
vogtölur valdar á 2 tímabilum og prófaðar á því þriðja (út af úrtaki):

| Haldið eftir | mó | xG eitt | threat eitt |
|---|---|---|---|
| 2023-24 | 2,711 | 2,449 | 2,711 |
| 2024-25 | **3,059** | 2,844 | 2,995 |
| 2025-26 | **2,895** | 2,794 | 2,631 |
| **Meðaltal** | **2,888** | 2,696 | 2,779 |

Vinnur í 2/3 og jafnar í því þriðja. Hóflegur en raunverulegur ábati.

**AÓ FÉLL og er því BERT `creativity/90`:** samsettur stuðull gaf 2,179 á
móti **2,206** fyrir bert creativity og tapaði í **0 af 3** tímabilum;
xA-vogin valdist alltaf **0**. Að birta samsettan aó-stuðul væri skraut sem
mælingin hafnaði. Þetta er skjalfest í `data/imminent.json` (`measured.ao`)
og prófað í `tests/stats.test.mjs` kafla 10.

**Óheppni er veikasta inntakið** (lyfting 2,27 ein og sér, á móti 2,70 fyrir
xG og 2,78 fyrir threat) — sem passar við 6c: sá sem *býr til* færi er
líklegri en sá sem *klúðraði* þeim. Vogin á óheppni er því lítil (0,2).

### ENDURMÆLT 29.7.2026 — MAGNLIÐURINN VAR RANGUR: xGI, EKKI xG

`tests/mo-candidates.mjs` (nýtt safn). **Fjögur** tímabil úr
`data/fpl_player_gw.json`, þ.e. 2022-23 líka — tímabil sem `MO_WEIGHTS`
**hafa aldrei séð** (vogirnar voru valdar á 2324+2425, prófaðar á 2526).

**INNTAKIÐ PASSAÐI EKKI VIÐ MARKMIÐIÐ.** Markmið mó er mörk **+ assist**
næstu 4 umferðir, en magnliðurinn taldi aðeins **xG**. xA var hvergi, þótt
útkoman sem við mælum innihaldi assist. Þetta er sama ætt af villu og
markaðs-sóknarliðurinn í kafla 3 atriði 2: **rétt mælt á röngu inntaki.**

| markmið (lyfting efsta 1/6... reyndar 1/10) | xG (var) | **xGI (er)** | ábati |
|---|---|---|---|
| mörk+assist næstu 4 | 2,379 | **2,498** | +0,119 (3/4 tímabil) |
| stig næstu 4 | 1,268 | **1,311** | +0,043 (3/4 tímabil) |

**ENGIR NÝIR STIKAR** — `xg`-vogin (0,8) liggur einfaldlega á `(xg + xa)`.

**Fjórar óháðar staðfestingar á að þetta sé merki og ekki fitt:**
1. **Bootstrap, klasað per leikmann** (sami maður í mörgum umferðum er ekki
   sjálfstætt sýni): +0,138 með 95% CI **[0,061, 0,239]**, P(betri) **100%**
   á mörk+assist; +0,052 CI [0,026, 0,084] á stig. Núll er útilokað.
2. **LOSO-tún** (vogir valdar á 3 tímabilum, mælt á hinu) velur xA-vog
   **0,8 / 1,0 / 1,0 / 1,0** — stöðug í öllum fjórum brotum. Vogir sem eru
   hávaði hoppa og skipta formerki (sbr. def/att-blöndun í kafla 3).
3. **Túnaða þakið er 2,504; þessi útgáfa nær 2,498** — 99,8% af ábatanum
   fæst án þess að fitta nokkuð.
4. **xA EITT er 1,945 — verra en xG eitt (2,130).** Ábatinn er samlegð
   milli þeirra, ekki að lélegra inntak hafi verið skipt út fyrir betra.

**Hvar ábatinn er:** DEF **+0,226** (1,170 → 1,395, +19%) · FWD +0,081 ·
MID +0,059. Rökrétt: framlög varnarmanna eru óhlutfallslega **assist** og
xG ein sá þau næstum ekki.
**Fyrirvari sem má ekki fela:** innan FWD eingöngu er lyftingin ~1,0 bæði
fyrir og eftir (n=973) — mó greinir **ekki** milli framherja. Hún virkar
þegar borið er saman þvert á stöður.

**Skörun mó og aó** fer 21% → 30% á efsta tíundarhluta; þeir eru enn
aðgreindir listar. **aó er ÓBREYTT**: xA bætir engu ofan á creativity
(mælt 28.7., xA-vog valdist alltaf 0) og það stangast ekki á — creativity
kóðar þegar færa-sköpun, xG gerir það ekki.

**PRÓFAÐ OG HAFNAÐ Í SÖMU MÆLINGU** (svo þetta sé ekki endurtekið):

| frambjóðandi | niðurstaða |
|---|---|
| **mó × byrjunar-líkur** | vinnur á STIGUM (4/4, +0,041) en **tapar** á mörk+assist (−0,040). LOSO velur veldi 1–2 fyrir stig en **0** fyrir mörk — ekki einrátt yfir markmið. Byrjunar-líkur eru birtar **sér** (Bekkjar-hætta + eigin dálkur), sem er gagnsærra en að blanda þeim inn |
| **að sleppa óheppnis-liðnum** | punktmat +0,022 leit betra út, en bootstrap gefur CI **[−0,023, +0,055]**, P(betri) 74% — **ógreinanlegt frá núlli**. Liðurinn heldur sér. Sama mælistika sem samþykkti xGI hafnaði þessu |
| óheppni úr xGI (`max(0, xgi−gi)`) | 2,493 á móti 2,498 — jafnt. Haldið xG-útgáfunni: „óheppni" er **eigin** klúður í dauðafærum, ekki samherja-klúður í færum sem hann lagði upp |
| mó / mín (per 90) | 2,393 — **verra**. Magnið í glugganum er það sem gildir |

**VÖRÐUR GEGN ÞVÍ AÐ LIÐURINN DEYI ÞÖGULT** (kafli 10 í `stats.test.mjs`):
`imminent.json` verður að bera `xa` í **hverjum** glugga, hún verður að vera
raunverulega fyllt (mælt: 334/841 = 40%, hærra en xG) og hún verður að
**hreyfa** mó hjá raunverulegum leikmönnum (169 af 184 í markhóp). Án þessa
gæti pipeline hætt að skrifa `xa`, formúlan læsi 0 og bætingin væri horfin
þögult — nákvæmlega gildran sem kostaði viku þegar markaðsliðurinn var
dauður í `odds.json` og öll 144 prófin voru græn.
Níu stökkbreytingar-prófuð: að skila magnliðnum í xG eitt fellir **4 próf í
`stats.test.mjs` og 4 í `mo-candidates.mjs`**, þar á meðal bæði bootstrap-in.

---

## 6e. GAGNAHEIMILDIR — HLIÐIN MÆLD 28.7.2026 (svar við Fable-handoff)

`TERMINAL_HANDOFF.md` (Fable) leggur til að fjarlægja og bæta við heimildum.
**Þrjú af fjórum hliðum þess FALLA á mælingu.** Hér er hvað var mælt og hvað
var gert — svo þetta sé ekki endurtekið.

| Heimild | Svar 28.7. | Tillaga Fable | GERT |
|---|---|---|---|
| **ESPN** site-API | **200** | „valkvætt · bætir engu við mó/aó" | **HALDIÐ — BURÐARVIRKI** |
| **fdcouk_e0** | 404 (2026/27) · **200 (2025/26)** | „brotin slóð → FJARLÆGJA" | **HALDIÐ** |
| **Understat** | 200 en **gagnalaus** | „HALDA+LAGA, scraper bilaður" | **SLÖKKT** |
| **API-Sports** | 0 paraðir (rétt) | „0 paraðir → FJARLÆGJA" | **HALDIÐ** |
| **FBref** | **403** | „BÆTA VIÐ um `soccerdata`" | **EKKI BÆTT VIÐ** |
| **FotMob** | details **404/gated** | „VARA fyrir Understat" | **ÓNOTHÆFT** |
| SofaScore | **403** (4 hostar) | „EKKI NOTA" | rétt — ónothæft |
| xgabora | **200** | bæta við (statískt) | **reachable — bíður FFDR-lotu** |
| FPL-Core-Insights | **200** | P7.4 bikar/Evrópa | reachable, ekki byggt enn |

### Hlið 1 — `fdcouk_e0` → FBref: **FELLUR**
Tvær ástæður, báðar mældar:
1. **Slóðin er EKKI brotin.** `mmz4281/2627/E0.csv` → 404, en `mmz4281/2526/E0.csv`
   → **200 með 203 KB**. Sama mynstur, eldra tímabil virkar. 404-ið er einfaldlega
   það að **2026/27 er ekki byrjað** — football-data býr skrána til við fyrsta leik.
   Birtist nú sem „bíður tímabils", ekki rauð villa.
2. **FBref getur ekki tekið yfir: HTTP 403.** Hliðið sjálft krefst „FBref-scrape
   VIRKT FYRST" — það er ófullnægt, svo skv. eigin reglu handoff-sins má ekki
   fjarlægja `fdcouk_e0`. Auk þess er `soccerdata` Python-pakki og pipeline er
   Node **án dependencies** — það væri arkitektúr-breyting, ekki viðbót.

### Hlið 3 — Understat-viðgerð: **FELLUR, ÓVIÐGERANLEGT**
Handoff segir „stöng/slá-heimildin er ÞEGAR til … scraperinn er bilaður".
**Gögnin eru farin, ekki scraperinn.** Mælt: league-síður skila byte-eins
18.645 b skel í 5/5 tilraunum, öll tímabil. Leikjasíður hafa aðeins
`var match_info`; `shotsData` og `rostersData` eru **horfin**. Sama leikjasíða
fór úr **30.898 b → 5.570 b á einum degi** (28.7.) — hún heldur áfram að rýrna.
Þar með fellur allt sem byggði á henni í handoff-inu:
- **Big Chances** „leiðum við út sjálf úr per-skot xG" — það er engin per-skot xG.
- **In Box = `X≥0,84` og `0,20≤Y≤0,80`** — það er Understat-hnitakerfi. ESPN notar
  annað (x = hlutfall af HÁLFUM velli frá sótta markinu, teigmörk 0,314) — sjá 6b.
- **Stöng/slá** kemur nú úr ESPN sem **eigin leik-tegund** (`Shot Hit Woodwork`).

### ESPN er ekki „valkvætt" — hún er eina skot-heimildin sem svarar
Handoff: „Bætir engu við mó/aó". Rangt: ESPN gefur skot-hnit, útkomu
(mark / á mark / framhjá / blokkað / **í stöng**), skyttu, svæði, líkamshluta,
skot+SoT **per leikmann** og 28 liða-tölur. Án hennar er ekkert skot-kort og
ekkert woodwork. **Ekki fjarlægja.**

### Hlið 2 — API-Sports út: **forsendan er ÖNNUR EN HANDOFF SEGIR**
Rétt í handoff: „Meiðsli og verð" kemur úr **FPL** (`fetchFast` → `news.json` úr
`e.news`, `e.news_added`, `chance_of_playing_*`) — ekki úr API-Sports.
**En „0 paraðir" er ekki bilun.** Fría þrepið leyfir aðeins leikdaga innan ±1
dags og fyrir tímabil eru þeir ekki til → 0 köll notuð, engin villa. Og
API-Sports gefur það sem FPL gefur **ekki**: TEGUND meiðsla („Hamstring
Injury"), birt feitletruð á spjaldi (`App.jsx` ~1834).
**Niðurstaða: HALDIÐ.** Fyrsta raunprófunin er 20.–21. ágúst (kafli 6). Að
fjarlægja hana núna væri að henda mældri vinnu rétt fyrir fyrsta prófið.
Staðan segir nú „engir leikdagar í glugga (bíður GW1)" í stað „0 paraðir".

### Það sem enn VANTAR og engin náanleg heimild gefur
`aó`-inntökin úr handoff-inu — **through balls, crosses, chances created,
snertingar í vítateig** — koma öll úr FBref (403). Þess vegna er aó **bert
creativity/90**, sem er hvort sem er það sem mældist best (sjá 6d).
**Big Chances** eru ekki reiknuð: þær þurfa per-skot xG sem hvorki ESPN,
FotMob né Understat gefa okkur lengur.

---

## 6f. ÚR FABLE-HANDOFF — HVAÐ VAR TEKIÐ (stats/leaderboard), 28.7.

Valið á verðleikum, ekki í heild. FFDR-hlutinn (P1) fór til annarrar lotu.

### TEKIÐ — og það kom úr gögnum sem við sóttum ÞEGAR
Fable vildi fá `Chances Created`, `Crosses`, `Through Balls` og `SoT` úr
**FBref**, sem svarar **403**. Þau fást öll úr **ESPN-textanum** sem við sækjum
þegar. ESPN skrifar upplögnina út:

> „Attempt saved. X (Team) right footed shot from the centre of the box is
> saved. **Assisted by Y with a cross following a corner.**"

Mælt á GW38 2025/26: **219 af 290 skotum (76%)** nefna upplegg —
`pass` 144 · **`cross` 54** · `following a corner` 33 · **`through ball` 12** ·
`set piece` 10 · `headed pass` 9 · `fast break` 8 · `direct free kick` 3.

Þar með fást per leikmann: **færi sköpuð**, **krossar**, **through balls**,
**föst leikatriði** — birt í `Umferðin → Leikmenn`. Og þetta er **betri** tala
en hrár FBref-kross: Fable vildi vega krossa *lægra* því þeir „geta verið
lélegir" — hér er sían innbyggð, krossinn þarf að hafa **leitt til skots**.
Krossprófun: Mateus Mané efstur í færum sköpuðum (6) og líka efstur í aó.

### TEKIÐ — 39 FPL-svið sem við sóttum en birtum EKKI
Audit á `bootstrap-static`: **105 svið, 44 í notkun.** Bætt við:
- **`*_rank_type` — FPL-sæti INNAN stöðu.** Nýr flokkur í stigatöflunni.
  Þetta er það sem skiptir máli í fantasy: Raya er **3. besti GK** í stig/leik
  en 32. yfir alla. Átta sæti (stig/leik, form, ICT, áhrif, sköpun, hætta,
  eignarhald, verð). Lægra er betra.
- **Opinberar FPL-tölur í stað okkar eigin útreiknings.** `value_season`
  (stig/milljón), `value_form`, `saves_per_90`, `defensive_contribution_per_90`,
  `clean_sheets_per_90`, `goals_conceded_per_90`,
  `expected_goals_conceded_per_90`, `starts_per_90`, `cost_change_event`.
  Þær voru afleiddar hjá okkur (`†`) — nú birtum við FPL-töluna og höfum
  **eina tölu færri til að verja**. Vörður: prófið sannreynir að
  `value_season == stig/verð` á **öllum 563 raungögnum**.
  Stigatafla: **65 tölur í 8 flokkum** (var 47/7); afleiddar `†` 12 af 65.

**VILLA SEM PRÓFIÐ FANN:** ný svið voru í `STAT_DEFS` en `fetchFPL` skrifar
aðeins VALIN svið í `players.json` — allur nýi flokkurinn hefði birst sem
strik. Prófið „value_season == stig/verð á 0 raungögnum" felldi það. Svið
bætt í pipeline.

### EKKI TEKIÐ — og hvers vegna
| Úr handoff | Ástæða |
|---|---|
| `penalties_text` / `direct_freekicks_text` / `corners_..._text` | **Tóm hjá öllum 563 leikmönnum.** Mælt. Gefa ekkert. |
| FBref um `soccerdata` | 403 · Python-pakki í Node-pipeline án dependencies |
| FotMob sem vara | `matchDetails` 404/gated með GILDU id → engin shotmap |
| Understat „HALDA+LAGA" | gögnin eru farin, ekki scraperinn (sjá 6e) |
| Big Chances úr per-skot xG | engin heimild gefur per-skot xG |
| Snertingar í vítateig | krefjast fulls event-fæðis (FBref) |
| `scout_risks`, `squad_number`, `event_points` | tóm (preseason) |
| xgabora, FPL-Core-Insights | **náanleg (200)** — bíða FFDR-lotu / P7.4 |

---

## 6g. HANDOFF №2 FRÁ FABLE — PRÓFAÐ 28.7., TVENNU HAFNAÐ

Handoff №2 **samþykkir allar fjórar vettvangs-athuganir** úr 6e og leiðréttir
kafla 8 formlega. Sú leiðrétting er þegar komin í kóðann (6e) — ekkert nýtt
verk þar. Það sem var NÝTT var prófað:

### §2 mó-endurhönnun Fable: **HAFNAÐ á mælingu**
Fable-formúlan `rank(xgi5) + rank(markaðs-mörk) − rank(GI−xGI)` var prófuð
gegn okkar mó **í Fable-lauginni sjálfri** (MID/FWD, mins5≥45, ≤1 GI síðustu 5;
**8.675 sýnishorn**, 3 tímabil, LOSO):

| Stuðull | Mörk næstu 4 | Stig næstu 4 |
|---|---|---|
| **Okkar mó** (`xG·0,8 + threat/25·0,3 + óheppni·0,2`) | **1,998** | **1,313** |
| Fable án óheppnis-liðar (`pct(xgi5)`) | 1,722 | 1,298 |
| **Fable eins og hún er skrifuð** | **1,673** | **1,259** |

Okkar vinnur á BÁÐUM markmiðum í ÖLLUM þrem tímabilum. Og **óheppnis-liður
Fable gerir hana VERRI** (1,673 á móti 1,722 án hans) — þriðja óháða
staðfestingin á því að „óheppni" er veikt merki (sjá 6c og 6d).

**Markaðs-/leikja-liðurinn (nýja hugmyndin) bætir ekki heldur:**
- heimaleikja-hlutfall næstu 4: **enginn ábati** við neina vog (1,998 → ≤1,996)
- styrkur mótherja (fyrra tímabil, lekafrítt): **+0,7%** í besta falli
  (2,053 → 2,068 við vog 0,25–0,5) og hrynur í 1,846 við vog 2,0.
Það er suð. mó heldur sér óbreyttur.

Þrennt í §2 var þegar rétt hjá okkur: in-box reglan var leidd úr **ESPN-svæðis-
texta** (ekki 0,84-reglunni, sem Fable fellir formlega úr gildi), Big Chances
eru sleppt, og tréverk kemur úr ESPN-leiktegund.

### §4 fyrirfram-liðsvals-tól: **REPRODUCERAST EKKI → EKKI BYGGT**
Endurgert í Python (OLS á 6 tímabila-pörum, £83,0m, hám. 3/félag, 8
uppstillingar, grædgi + skiptaleit). Eftirá-þakið mitt **2.093–2.195** passar
við þeirra 2.076–2.238, svo bestunin er ekki vandinn.

| Markár | Þak | Hjörð GW1 | Líkan | Fable segir |
|---|---|---|---|---|
| 2023-24 | 2174 | **70,0%** | 58,9% | 62,6% |
| 2024-25 | 2187 | **70,1%** | 68,2% | 77,8% |
| 2025-26 | 2141 | 57,1% | **66,7%** | 75,3% |
| **meðaltal** | | **65,7%** (n=3) | **66,8%** (n=5) | 70,8% |

**Líkanið tapar fyrir hráu GW1-eignarhaldi í 2 af 3 tímabilum** og nær ekki
75–78% þeirra. Ekki byggt: við sendum ekki eiginleika sem slær ekki eins-línu
viðmið. Ef þetta á að ganga þarf `team.py`/`team2.py`/`teamall.py` frá hinni
lotunni til að finna hvar útfærslurnar skilja.

**LEKI SEM VAR FUNDINN Í MINNI EIGIN PRÓFUN:** fyrsta keyrslan gaf hjörðinni
**95,7%** af þakinu. Ástæðan: `selected_by_percent` í `players_raw.csv` fyrir
gengið tímabil er **LOKASTAÐA**, gegnsýrð af útkomunni. Með raunverulegu
GW1-eignarhaldi úr `gws/gw1.csv` fór talan í **65,7%** — sem passar við
Fable's 64,0% og staðfestir bæði lagfæringuna og þeirra tölu.
**Notið ALDREI `selected_by_percent` úr archive-skrá sem GW1-merki.**

---

## 6h. BYRJUNAR-LÍKUR — eigin hugmynd, mæld 28.7.2026

Þegar báðar Fable-hugmyndirnar féllu (6g) var spurt: hvað er ÞÁ mest að vinna?
Svarið kom úr eigin mælingum: **allt annað í appinu er verðlaust ef
leikmaðurinn spilar ekki.** Dýrasta einstaka mistökin í FPL eru að stilla upp
manni sem endar á bekknum, og forsendan sem allir nota — „hann byrjaði síðast,
hann byrjar næst" — er rétt í 88,2% tilvika en **þegir um hin 11,8%**.

**Mælt á 65.557 sýnishornum** (3 tímabil, 114 umferðir), LOSO:

| | Nákvæmni | Brier |
|---|---|---|
| Grunnregla „byrjaði síðast" | **88,2%** | 0,1176 |
| `starts5` (hlutfall síðustu 5) | — | 0,1028 |
| **Líkanið** (5 breytur) | 88,0% | **0,0888** |

**NÁKVÆMNI ER EKKI ÁBATINN — og það á ekki að selja hana sem slíkan.**
Líkanið er jafn nákvæmt og grunnreglan. Ábatinn er tvennskonar:

1. **Kvörðun:** Brier −24%. Líkanið gefur LÍKUR, ekki já/nei, svo það má
   **raða** leikmönnum eftir hættu.
2. **BEKKJAR-GILDRAN — notagildið.** Af þeim sem byrjuðu síðast spila
   **21,6% EKKI** 60+ næst. Lægsti tíundarhlutinn fangar **42–49%** þeirra:
   **lyfting 2,09×**, samhljóða öll þrjú tímabilin [2,05 · 2,15 · 2,07].
   Þýðing: *„af þeim sem þú telur örugga er þetta tíundarhlutinn sem er í raun
   í hættu — nærri helmingur þeirra fellur á bekk."*

Breyturnar fimm: `starts5`, `mins5`, `trend`, `started_last`, `value`
(logistísk aðhvarfsgreining; vogtölur og normalisering FESTAR í
`START_MODEL` í `src/stats.js`).

### PRÓFAÐ OG HAFNAÐ — ekki endurtaka
- **HVÍLD / LEIKJAÁLAG: engin áhrif.** Eftir <4 daga hvíld spila **27,0%**
  60+ mínútur, á móti **27,3%** annars (10.448 leikir með skammri hvíld).
  **FLAGGIÐ VAR TEKIÐ ÚT 29.7.2026.** `rotation.json` flaggaði „<4 daga
  hvíld" og pipeline taldi það í `status.json` („40 m. <4 daga hvíld"), þar
  sem það las eins og rótasjón-hætta við hlið raunverulegra hættu-merkja.
  Talningin er farin; `rest_days` er **geymt sem upplýsing** og skráin ber nú
  `rest_measured` með tölunum. Sama regla og ferðalengd í kafla 3: mælt
  ómarktækt ⇒ birt, ekki vegið. **Evrópu-nálægð er ÓMÆLD og heldur sér.**
  (Appið las `rotation.json` aldrei, svo þetta var aðeins í status-línunni —
  `rotationRisk` í `App.jsx` er allt annað: byrjunarhlutfall, ekki hvíld.)
- **Staða (GK/DEF/FWD-dúmmíar):** +0,03× = suð. Sleppt; einfaldara er betra.
- **FPL `starts`-flagg og „kom inn af bekk":** engin bæting yfir mínútur.

### Útfærsla
Pipeline sækir nú **5 umferðir** (`FETCH_WINDOW`) en mó/aó halda sínum
**4-umferða glugga** — validering þeirra er bundin við 4, svo mó-glugginn er
LEIDDUR út úr seríunni. Vörður í prófi: mó-gluggi má aldrei verða >4.
Tvöföld umferð er **lögð saman í eina umferð** (spurningin er um UMFERÐ, ekki
stakan leik). Birt í `Stigatafla → Bekkjar-hætta` með mínútu-röðinni sýnilegri
svo röksemdin sé gagnsæ.

---

## 6i. LEIKMANNALISTINN — flipinn „Leikmenn" (29.7.2026)

`src/PlayerList.jsx`. Allir 564 leikmenn í einni töflu: síanlegir,
raðanlegir, með mynd, yfir fjögur tímabil.

### EIN DÁLKASKRÁ — ekki tvær
Dálkarnir eru **`STAT_DEFS` úr `src/stats.js`** — sama skrá sem stigataflan
og prófin nota. Sérstakur dálkalisti fyrir listann hefði farið úr samhengi
við hana innan viku. **Ef þú vilt taka dálk út: eyddu honum úr `STAT_DEFS`
og hann horfur úr töflu, röðun, þröskuldum OG stigatöflu í einu.**

**108 dálkar í 12 flokkum** (var 65 í 8). Nýir flokkar: `Ógn (ESPN,
síðasta umferð)` · `Form-gluggi (síðustu 4–5)` · `Leikir framundan` ·
`Föst leikatriði`.

### TÍMABILIÐ STÝRIR SJÁLFGEFNU VALI — aldrei hardkóðað
Mælt: `finished_gw = 0` í dag, GW1-frestur 21.8. Þess vegna eru **öll**
árstíðarsvið í `players.json` núll fyrir alla 564 — listi sem raðaði eftir
`total_points` raðaði 564 nullum og hefði litið út eins og bilun.
`finished_gw` er lesið úr `events.json` í hverri hleðslu:

    finished_gw === 0  ->  sjálfgefið tímabil er SÍÐASTA LOKNA (2025/26)
    finished_gw >= 1   ->  2026/27 verður sjálfgefið

**Verð, staða og eignarhlutfall eru ALLTAF úr gögnum dagsins**, líka þegar
söguleg tölur eru sýndar — þú kaupir á verði dagsins, ekki á verði 2023/24.

### `live_only` — og villan sem var
Dálkar sem byggja á nútíma-gögnum (ESPN síðustu umferðar, form-gluggi,
leikir framundan, spyrnu-röð) eru merktir `live_only` og fá **grænan borða**
sem segir að þeir fylgi EKKI valdu tímabili.
**Fyrsta útgáfan FALDI þá í sögulegu tímabili** — sem gerði þá ónáanlega,
því 2026/27 er tómt og það er sjálfgefið val ekki. Nú eru þeir alltaf
sýnilegir og heiti flokkanna bera tímabilið sjálf.

### `SEASON_CARRY` í pipeline
`player_seasons.json` bar aðeins 26 svið, svo **aðeins 31 af 108 dálkum**
virkaði á sögulegri röð. 25 svið bætt við (form, ICT, áhrif, sköpun, hætta,
eignarhlutfall, spjöld, tacklingar, endurheimtur, per-90 svið,
`value_season`/`value_form`) → **74 dálkar með gildi** á 2025/26.
Kostnaður 1,29 → 1,83 MB (eftir 63%-síuna í 6f).
Svið sem vantar í eldra tímabili verða **null (VANTAR), EKKI 0** — `DC/90`
er aðeins til frá 2025/26 og próf staðfestir að það sé null áður.

### NULL ER EKKI NÚLL
    null (gögn vantar)      -> "—" grátt, raðast ALLTAF SÍÐAST í BÁÐAR áttir
    0    (raunverulegt núll) -> "0"
Tóm gildi fljóta annars upp í „asc" og fylla toppinn — algengasta villan í
svona töflum. Dálkur sem er tómur fyrir alla í völdu tímabili er **falinn**,
með hnapp og tölu um hve margir.

### ALMENNUR ÞRÖSKULDUR
Velja dálk → `≥`/`≤` → tala → verður chip. Þrjátíu sliderar á skjá í einu
eru ónothæfir; þetta gefur sama kraft í einu chipi og virkar á **hvaða** af
108 dálkunum sem er.

### FRAMMISTAÐA (mælt í dev-console)
`cook` 564 raðir **1,6–2,2 ms** · sía **0,1 ms** · röðun **0,2 ms**.
Viðmið var 8 ms. Sýndarvæðing með fastri raðahæð (34 px) + 12 overscan.
**Engin ný dependency.**

**ÞESSI TALA STAÐNAÐI OG VAR ORÐIN 30× OF LÁG — LAGAÐ 31.7.2026.**
Talan að ofan var rétt þegar hún var mæld, en **áður en** dálkarnir fyrir
ESPN-ógn (6f) og byrjunar-líkur (6h) komu inn. Þeir tveir bættu við
**tveimur nafna-pörunum PER LEIKMANN** inni í `cook` (`findShot` og
`findImm`), svo raunveruleg tala var **66,8 ms** — 8× yfir viðmiðinu.
Það sást í dev-console allan tímann og enginn las það.

Orsökin var ekki pörunin sjálf heldur **endurtekin normalísering**:
`nameScore` er kölluð ~25.000 sinnum per `cook` (564 leikmenn × ~25
ESPN-skyttur × tvö nafnaform) en ólíku strengirnir eru aðeins ~1.500.
`normName` gerir NFD-normalization + fjórar regex-yfirferðir, svo **sami
strengurinn var normalíseraður tugþúsundum sinna**, og `nameScore`
úthlutaði tveimur `Set`-um í hverju kalli.

Tvennt lagað í `src/stats.js`, **hvorugt breytir niðurstöðu** (bæði eru
hrein umritun):

| mæling | fyrir | eftir |
|---|---|---|
| Node, `findShot`+`findImm`, 564 leikmenn (median af 7) | 60,1 ms | **4,7 ms** (12,8×) |
| Chrome, `findShot` einn | 19,6 ms | **1,1 ms** (17,8×) |
| pörunin sjálf (hver leikmaður → hvaða skytta) | — | **564/564 EINS** |

1. `nameTokens` fékk **minni** (memo, þak 4.000 strengir).
2. `nameScore` **hætti að úthluta `Set`-um** — nöfn hafa 2–4 tökn, svo
   `ta.indexOf(t) !== i` gerir sama de-dupe án úthlutunar.

**Vörður: `tests/name-match.mjs`.** Hann ber skorið við **sjálfstæða
viðmiðs-útfærslu** (skrifaða upp úr reglunni, ekki afrit af kóðanum) á
9.464 raunverulegum nafnapörum, OG á tilbúnum jaðartilfellum — því
**raunveruleg nöfn nægja ekki**: enginn knattspyrnumaður í gögnunum hefur
tvítekið tak í nafni sínu, svo stökkbreyting sem fjarlægði de-dupe slapp
þegar aðeins raungögn voru prófuð. Tíma-þak (25 ms) fellur ef hagræðingin
er afturkölluð (mælt: 51,4 ms).

### SÍMI (prófað á 380 px, ekki á skjáborði)
Frosni nafnadálkurinn var **196 px af 380** — meira en helmingur skjásins.
Nú `matchMedia`-skynjun: nafn 196→124 px, tölur 88→66 px, **mynd falin**
(hvert pixel þarf að fara í nafnið), flokkahnappar skruna lárétt í stað
þess að taka fjórar línur, og borðarnir dragast saman í eina ýtanlega línu.

### VILLUR SEM VORU LAGAÐAR
- **Byrjunar-líkur sýndu „—" fyrir ALLA:** `imminent.json` geymir fullt nafn
  („Cole Palmer") en `players.json` `web_name` („Palmer"), svo bein
  nafna-uppfletting skilaði engu. Nú orða-skorun + LIÐ með óþræddum
  sigurvegara, sama aðferð og `matchShotsToPlayers`.
- **Haus-heiti þoldu saman** („ByrjunarliðByrjunarhlutfall"): dálkar voru
  78 px en heitin lengri. Breidd 88 px + ellipsis + stytt heiti.
- **Nýting (mörk/xG) krefst xG ≥ 0,5** og `bónus/BPS` krefst BPS ≥ 50 —
  annars gæfi 1 mark úr 0,04 xG 25× og trónaði á toppnum.

### VAKTLISTI OG „MITT LIГ — tveir litir, tvær merkingar
Stjarna (☆/★) í frosna nafna-hólfinu setur leikmann á **vaktlista**; hann
vistast í `localStorage` undir `watch` (**ekkert þak**, ólíkt andstæðingum).
Stjarnan **í hausnum er SÍA**, ekki röðun — hún situr í röðunar-hausnum og
þarf `stopPropagation`, annars raðar smellurinn eftir nafni í leiðinni.

**BORÐINN ER Á HÓLFINU, EKKI Á RÖÐINNI.** Röðin skrunar lárétt yfir 108
dálka; grænn borði á henni hefði horfið við fyrsta skrun. Frosna hólfið er
alltaf á skjánum, svo `cellMine` er `inset 3px` skuggi þar.

**Liturinn var í árekstri:** samanburðar-röðin notaði `C.greenBg` — sami
græni og eignarhald á að bera. Samanburður er nú **ljósfjólublár** (`#f7f2f8`)
og grænt þýðir aðeins „í mínu liði". Bæði merkin sjást samtímis: bakgrunnur
segir „í samanburði", borðinn segir „minn".

Próf: `tests/watchlist.mjs` (18 próf) — vistun, síun, afmerking, og að
borðinn liggi á hólfinu. **Fjórar stökkbreytingar prófaðar** (borði fjarlægður,
borði færður á röðina, samanburður settur í grænt aftur, `watch` tekið úr
`saveState`) og allar fundust — prófið er ekki innantómt.

Próf: kafli 13 í `tests/stats.test.mjs` (28 próf) — 108 einkvæmir lyklar,
`STAT_BY_KEY` nær yfir alla eftir viðbætur, `live_only` aðeins á
nútíma-flokkum, **öll 108 `get()` þola tóm inntök**, hver ný afleidd tala á
þekktum inntökum, og að söguleg sýn tæmist ekki (74 dálkar með gildi).

---

## 6j. SKIPTA-GLUGGINN, LEITIN OG SJÓNRÆNI SAMANBURÐURINN (31.7.2026)

### 🔍-hnappurinn vísar nú á flipann — `browse` var tvíverknaður
Leitarglugginn þjónaði **tveimur óskyldum** hlutverkum:

| hlutverk | inn um | hvað | staða |
|---|---|---|---|
| `browse` | 🔍-hnappinn | nafna-leit + stöðu-sía → opnar spjald | **fjarlægt** |
| `selling` | „Skipta út" | mótframbjóðendur með **lögmæti forreiknað** (`3 per félag`, `vantar £X`) og `commitTransfer` | **óbreytt** |

`browse` gerði minna en Leikmenn-flipinn (108 dálkar, þröskuldar, vaktlisti,
samanburður, fjögur tímabil). `selling` **má ekki fjarlægja**: hann veit hvað
þú ert að selja, hvað er í bankanum og hvað 3-per-félag reglan segir —
leikmannalistinn veit ekkert af því.

Hnappurinn heitir nú **„🔍 Leita"**, ekki „Leikmenn". Nafna-áreksturinn var
**mældur, ekki tilgátulegur**: tveir hnappar hétu „Leikmenn" og bæði
vafra-leit og `byText("Leikmenn")` í prófi greipu þann ranga í þróun — það
þurfti að skjalfesta í `tests/watchlist.mjs`. Dauður kóði fór með:
`browse`/`setBrowse`, `searchPos`, `posFilter`/`posBtn`-stílar. Í skipti-ham
er staðan **alltaf** sú sem er seld (FPL leyfir ekki DEF→FWD), svo stöðu-sían
átti hvergi heima eftir það.

### Mældu tölurnar í skipta-gluggann — augnablik ákvörðunarinnar
Hann sýndi aðeins `ep_next` og andstæðing þótt fjórar mældar tölur væru til.
Röðin er **ásett**: byrjunar-líkur fyrst (allt annað er verðlaust ef hann
spilar ekki, kafli 6h), þá FFDR næstu leikja, þá mó/aó, þá verðspá.

**MARKMENN FÁ HVORKI mó NÉ aó — mælingar-atriði, ekki smekkur.** Þeir komast
í markhópinn *af því að* þeir hafa 0 framlög, og `mo-candidates.mjs` mældi
**DEF/MID/FWD — GK var aldrei mældur**. „mó 0,0" á markverði er ómæld tala
sem lítur út eins og mæling. Sömu ástæðu fær mó undir 0,05 enga birtingu:
0,0 er ekki upplýsing.

**Tómt gildi er SLEPPT, ekki sett í 0** — „engin gögn" og „lág tala" eru ekki
sama hlutið. Staðfest á raungögnum: 60/60 raðir fá FFDR, 45/60 byrjunar-líkur
(Meslier fær enga — 0 mínútur, sbr. `isIncoherent`), 26 MID fá mó, 12 aó,
**0 markmenn fá mó**. Verð-örvarnar eru tómar í preseason og það er rétt:
`transfers_in_event` er 0 fyrir tímabil.

Byrjunar-líkurnar bera **glugga-fyrirvara í tooltip**: glugginn er síðustu 5
LOKNU umferðir, sem fyrir tímabil er lok síðasta tímabils þar sem hvíld er
mikil. Raya fær 47% því hann var hvíldur í GW38 — líkanið hegðar sér rétt,
en talan er samhengisháð og það á að standa þar.

### `imminent`-pörunin er nú EIN útfærsla
`indexImminentByTeam` + `matchImminent` fluttust í `src/stats.js`.
`imminent.json` geymir fullt nafn („Cole Palmer"), `players.json` `web_name`
(„Palmer"), svo bein uppfletting skilar engu. Þegar skipta-glugginn fór að
birta sömu tölur var þetta að verða **önnur** útfærsla á sama hlut — og tvær
útfærslur á nafnapörun þýðir að „Byrjar"-dálkurinn getur virkað í listanum og
verið tómur í glugganum **án þess að neitt próf falli**.

### Sjónrænn samanburður (`Compare.jsx`)
Rofi „Sjónrænt / Tafla", sjálfgefið sjónrænt þegar **tveir** eru valdir (með
3–4 verða fjórar súlur per röð of þunnar). Kvarðinn er **per röð** — xG (0–20)
og BPS (0–800) í sama kvarða gæfi ósýnilegar xG-súlur. Tölur með formerki
(Mörk − xG) fá **frávikssúlu út frá miðju**. Vantandi gildi fær „—" og **enga**
súlu: súla af lengd 0 læsist eins og mæld nulltala.

**`hi` (hærra-er-betra) er forsenda þess að myndin sé rétt, ekki skraut.**
Fyrir Mín./stig, Verð, GC, xGC, Mín./framlag, Mín./xGI og spjöld er **lægra**
betra — þá væri lengsta súlan VERSTI leikmaðurinn. **Villandi mynd er verri
en engin mynd.** Vörður: `tests/compare-visual.mjs` les 7 lægra-er-betra og
21 hærra-er-betra röð úr DOM á raungögnum og fellur ef græna súlan er á
röngum manni. Stökkbreyting (hunsa `hi`) snýr 7 röðum við og fellur.

### Leitanlegur dálkavalari í þröskuldinum
108 dálkar í native `<select>` þýddi skrun; native-select hoppar aðeins á
fyrsta staf. Nú combobox með leit, örvalyklum og `scrollIntoView`.
**Leitin er brottfelld á broddstöfum** — íslenskt viðmót þar sem leitin
krefst broddstafa er leit sem virkar ekki: „vaent" finnur **Væntingar**
(108 → 12), „spjold" finnur **Gul spjöld** (→ 5).
Leitað er í **þrennu**: dálksheiti, flokksheiti OG `key`. Lykla-leitin var
nauðsynleg því lyklarnir eru á **ensku** og það er það sem FPL-fólk slær inn:
„threat" gaf **enga** niðurstöðu áður, því íslenska heitið er „Ógn".

### UMFERÐAR-BIL Í LISTANUM (31.7.) — „bara GW 30–38"
38 kassar undir tímabils-valinu. Smellur setur upphaf, næsti endann; smellur
**fyrir** upphafið snýr bilinu við (annars virkaði valarinn „bara til hægri").

`sumGwRange` í `stats.js` skilar röð með **FPL-sviðaheitum**
(`total_points`, `expected_goals`…). Það er ásett: `STAT_DEFS` lesa FPL-heiti,
svo allir dálkar — líka afleiddu — virka **óbreyttir** á bilinu. Ný heiti hefðu
kallað á annað dálkasett og þá væru **tvær dálkaskrár** (sjá 6i).

Staðfest: Haaland 1–38 = **239 stig / 2.953 mín / 25,5 xG**, nákvæmlega
árstíðartalan. GW30–38 = **44 stig / 630 mín**, ppg 7,3.
`points_per_game` deilir með **leikjum sem hann spilaði**, ekki fjölda umferða —
annars fengi meiddur maður ranglega lágt meðaltal.

Skrárnar (`player_gw_{season}.json`, 1,2–1,5 MB) eru **letihlaðnar** og bilið
**nullstillist við tímabils-skipti**.

**BLINDIR DÁLKAR ERU LEIDDIR ÚT, EKKI HANDSKRIFAÐIR** (`gwBlindKeys`).
Fyrsta útgáfan var handskrifaður lyklalisti og **13 af 22 lyklum voru rangir** —
ég giskaði á heitin, svo merkingin birtist hvergi. Nú er hver dálkur kallaður á
tveimur röðum sem eru eins nema summanlegu sviðin hafa ólík gildi; dálkur sem
skilar sömu tölu les ekki summurnar.
Tvær villur í prófuninni **sjálfri** fundust þannig: margfaldarar `10 + (i % 7)`
**kollíderuðu** (svo „Mörk − xG" og „nýting" töldust ranglega blindir), og
prófgildin voru **undir þröskuldum** („bónus/BPS" krefst BPS ≥ 50).
Niðurstaða: **21 blindir · 62 fylgja bilinu**, merkt `∑` á dálkinum sjálfum.

### FÖST LEIKATRIÐI — EINN RAMMI PER LIÐ (31.7.)
Þrír undirflipar urðu **eitt spjald per lið** með ikonum; aðeins fyrsti taki.

**MÆLING SEM BREYTTI HÖNNUNINNI — HORN NÁ ALDREI 1:**

| svið | röðunar-svið | talan 1 |
|---|---|---|
| `penalties_order` | 1–5 | 20/20 lið |
| `direct_freekicks_order` | 1–5 | 20/20 lið |
| `corners_and_indirect_freekicks_order` | **4–10** | **0/20 lið** |

FPL notar annan grunn fyrir horn (Arsenal: Rice=5, Saka=6, Madueke=7). Tvær
**þöglar** villur: „aðeins fyrsti taki" (`order===1`) sýndi **ekkert** fyrir
horn, og `setPieceBadges` með `order <= 3` þýddi að **hornatakar fengu aldrei
ikon**. Talan VAR til — hún var bara aldrei ≤ 3.
„Fyrsti taki" er nú **lægsta röðun innan liðsins** (`setPieceRanks`): horn fóru
**0/20 → 20/20**, ARS ⌾ = Rice. Vörður: `tests/set-pieces.mjs`.

### DÁLKABREIDD OG RÖÐUN UNDIR HEITUM (31.7.)
108 dálkar höfðu allir 88 px af því að **lengsta** heitið þurfti það.
Breiddin er nú reiknuð per dálk, klippt í [46, 76].

| útgáfa | skrunleið | sparnaður |
|---|---|---|
| 88 px allir | 9.504 px | — |
| ein lína í haus, þak 88 | 7.451 px | 21,6% |
| **tvær línur, þak 76** | **6.031 px** | **36,5%** |

Með einni línu stjórna **íslensku heitin** breiddinni og 17 dálkar lentu í
þakinu; með tveimur stjórnar **talan**. Hausinn er ein röð, svo hæð hans er
einskiptis-kostnaður.
**`boxSizing:"border-box"` Á BÁÐUM** — án þess var haus 2 px smærri en hólf og
skekkjan **hlóðst upp** (dálkur 9 var 16 px af, svo heitið sat ekki yfir sínum
dálki). Mælt eftir: skekkja **0 px**.
`≥`/`≤` urðu **„minnst"/„mest"** — tákn sem krefjast þess að muna hvor bogi
opnast hvert eru vanaspurning í filter-viðmóti.

### VARÚÐ FYRIR NÆSTU LOTU — TVÆR LOTUR Á EINU VINNUTRÉ
Þessi vinna varð fyrir raunverulegum skaða af samhliða vinnu, þrisvar:
1. **Hunkur horfinn:** skrif hinnar lotunnar í `App.jsx` yfirskrifuðu
   merkja-blokkina í skipta-glugganum; hún þurfti að vera endursett. Ekkert
   próf hefði fundið það — kóðinn var einfaldlega ekki þar.
2. **`git add -A` sópar vinnu annarra:** mó-breytingin (§6d) og þessi vinna
   lentu inni í commit-um hinnar lotunnar, svo commit-textinn lýsir þeim ekki.
   Þess vegna er röksemdin skráð **hér**; CLAUDE.md er heimildin sem gildir.
3. **`npm test` er ótraust á meðan:** safna-fjöldinn fór 23 → 24 → 25 milli
   keyrslna og eitt fall var hálfskrifað `i18n-dom.mjs`. Keyrðu **þín** söfn
   sér áður en þú ályktar að flökt sé raunverulegt.
**Notaðu `git add <skrár>`, aldrei `git add -A`, í þessu repo.**

---

## 6k. LOKAHNYKKUR 31.7.2026 — P7.4 MÆLT OG HAFNAÐ, aó STENDUR

> **Þetta er á grein `lokahnykkur`, EKKI á `main`** (notandinn bað um að ekki
> yrði ýtt). Sjá „Hvernig þetta kemst í main" neðst.

### P7.4 (bikar/Evrópa) — MÆLT OG **EKKI BYGGT**
Handoff №1 leggur til að feitletra leikmenn sem byrjuðu í Evrópu/bikar, því
þeir séu ólíklegri í næsta EPL-start. **Áður en það var byggt var það mælt** —
að birta ómælt merki er það sem kafli 3 forðast.

Heimildin **er** til: `olbauday/FPL-Core-Insights` →
`data/2025-2026/By Tournament/{Champions,Europa,Conference} League + EFL Cup/GW{n}/`
með `lineups.csv` (`is_starting`) og `fixtures.csv` (`gameweek` = FPL-umferðin).
`player_id` og `team_code` eru **tóm**, svo liðið er leitt út úr `match_id` og
pörun er nafna-skorun með liði.

| | |
|---|---|
| Evrópu-byrjanir | 2.154 tilvik · 941 pöruð (77%) · 188 leikmenn |
| hrátt: byrjar EPL eftir Evrópu-start | **45,0%** á móti **46,4%** |
| **innan leikmanns** | **−1,37pp · t = −0,82 · 95% CI [−4,67; +1,92]** |

**Núll er innan CI ⇒ P7.4 verður ekki byggt.** Samhljóða hvíldar-mælingunni í
6h (−0,3pp), en nú mælt á **réttu inntakinu**: Evrópuleikjunum sjálfum, ekki
hvíld milli EPL-leikja. 6h gat ekki séð miðvikudagsleik í Evrópu — þetta gat
það, og svarið er það sama.

**Innan-leikmanns samanburður var skilyrði, ekki skraut:** hráar tölur mæla að
Evrópulið eiga fastamenn, sem dregur í **gagnstæða** átt við tilgátuna.

**Villa í minni eigin mælingu sem hefði gefið skekkt úrtak:** fyrsta útgáfan
þáttaði `match_id` með ógráðugu regexi og fékk „league-arsenal" sem lið. Það
felldi 131 af 181 lyklum — og þar með fóru byrjanir hjá **Arsenal, Chelsea og
Man City út úr úrtakinu**. Mælingin hefði „virkað" og verið marklaus.
Lagað með þekktum keppnis-forskeytum: 108/193 lið pöruð (hin eru erlend félög
sem skipta ekki máli), pörun 73% → 77%, n 112 → 188.

**Skriftan er `tests/euro-congestion.mjs` og er EKKI í `npm test`** — hún
sækir ~65 skrár og GitHub-kvótinn (60/klst.) gaf **HTTP 403** við endurteknar
keyrslur, svo safnið féll af ástæðu sem hafði ekkert með mælinguna að gera.
Öll önnur söfn lesa committuð `data/`. Keyrsluskipun er í hausnum á skránni.

### aó VERÐUR ÁFRAM `creativity/90` — ákveðið
Mælt að hrá creativity-**summa** slær `/90`: assist 2,421 á móti 2,297
(CI [0,027; 0,246], P=99%), stig 1,294 á móti 1,225 (CI [0,047; 0,100]).
**Samt ekki tekið upp:** innan **mínútu-þriðjunga** hrynur ábatinn í
+0,105 / +0,013 / +0,003. Með fastar mínútur er summa = hlutfall × fasti, svo
röðunin er nánast sú sama — ábatinn kemur úr **samanburði þvert á mínútuhópa**,
þ.e. að hygla þeim sem spila meira.

Það er **merkingar-ákvörðun, ekki tæknileg**: aó svarar „hver leggur upp færi
án að fá assist" og `/90` er rétta formið á þeirri spurningu. Mínútur eru þegar
sýndar í eigin dálki og í byrjunar-líkunum (6h); að blanda þeim inn í aó gerði
vísinn tvíræðan. Skjalað í `stats.js` svo þetta sé ekki endurmælt.
**xA fór hins vegar INN í mó** (6d) því þar var inntakið raunverulega rangt.

### Flipinn heitir nú „Leikmannatölur" / „Player stats"
Bæði tungumál samræmd. Tvö af mínum prófum **felldu** endurnefninguna því þau
smelltu á flipann eftir **nákvæmu** heiti; þau nota nú `👥`-forskeytið. Nákvæma
leitin var sett inn af því að 🔍-hnappurinn hét líka „Leikmenn" — sá árekstur
er farinn (hann heitir „Leita"), svo forskeytið er óhætt. **Próf á að prófa
hegðun, ekki orðalag.**

### Það sem BÍÐUR TÍMABILSINS og er ekki hægt að klára núna
| atriði | af hverju blokkað |
|---|---|
| API-Sports meiðsla-**tegund** | frí-þrepið sér aðeins ±1 dag; fyrsta raunprófun **20.–21. ágúst** |
| `/fixtures/lineups` staðfest byrjunarlið | krefst `API_SPORTS_KEY` sem er **write-only** í GitHub Secrets — ég get ekki kallað |
| „í ár vs. í fyrra"-taflan | kviknar fyrst þegar GW1 klárast |
| `fdcouk_e0` 2026/27 | CSV verður til við fyrsta leik |

### Hvernig þetta kemst í main
```bash
git worktree list                      # sjá /Users/arongeorgsson/Fantasy-lokahnykkur
git merge lokahnykkur                  # úr Fantasy/ á main
npm test && npm run build              # 29/29 græn, staðfest á greininni
```
Eða `git worktree remove --force ../Fantasy-lokahnykkur && git branch -D lokahnykkur`
til að hafna öllu.

> **ATH:** `lokahnykkur` var síðan sameinuð í main (33940f5) — leiðbeiningin
> að ofan er söguleg.

---

## 6l. HANDOFF №4 (FFS-ytra viðmið) — AFGREITT 2.8.2026

Handoff №4 ber okkar DC-hittni-mælingar við ytra viðmið (FFS Season-Long
Projections, ~470 leikmenn, borgunarveggur — notandi lagði fram afrit).
**Eitt tekið, restin annaðhvort þegar uppfyllt eða óframkvæmanleg.**

### TEKIÐ — afturvirkni á DC-hittni (§2, tillaga 1)
Kjarninn í handoffinu og hann er réttur: `hit_rate = hits/starts` í
`computeDefcon` (`fetch.mjs`) ofmælist á litlum sýnum. Sönnunin er ytri:
enginn leikmaður í öllu FFS-safninu fer yfir ~57% hittni, en okkar
GW20+-mælingar (n=10–15) fóru í 75–80% — og frávikin voru kerfisbundið
stærst þar sem sýnið var lítið OG hittnin há (Danso 80→15, Botman 75→30),
nánast núll þar sem sýnið var stórt (Ampadu, Groß, Stach, Sangaré innan
8 pp). Klassísk ofmæling á litlum sýnum.

Lögun í pipeline (EKKI í líkani — DC er áfram utan FFDR):

    hit_rate_adj = (hits + 10·p0) / (starts + 10)
    p0 = stöðu-meðaltal úr sömu gögnum (laug ≥ 50 startir),
         annars fastar: DEF 0,27 · MID 0,17 · FWD 0,10 · GK 0,02

Hráa talan og `starts` HALDA SÉR í skránni — afturvirknin er viðbót.
`defcon.json.players` ber nú `hit_rate_adj` og `p0`; birting á að nota
afturvirkjuðu töluna og sýna alltaf leikjafjöldann við hlið hennar.
**Vörður: `tests/defcon-shrink.mjs`** (21 próf) — dregur `computeDefcon`
ÚT ÚR `fetch.mjs` og keyrir á tilbúnum live-skrám (sama mynstur og
`mins-trend.mjs` kafli 0, af sömu ástæðu: kóðinn kviknar fyrst 21.8.).
Þrjár stökkbreytingar prófaðar (K breytt, afturvirkni fjarlægð,
fallback-fastar teknir úr sambandi) — allar felldar.

**BIRTING:** DStat „DC-hittni" á leikmannaspjaldinu (modal, `App.jsx`)
— DC lifir á spjöldum skv. kafla 3. Sýnir `hit_rate_adj`% með
`starts` og hráu töluna sem undirtexta. **GK fær reitinn ALDREI**:
DefCon-stig eru fyrir útivallarmenn og GK-tala væri ómæld tala sem liti
út eins og mæling (sama regla og mó/aó í 6j). Reiturinn er ósýnilegur
fram að 21.8. (players tómt) — þess vegna er **`tests/dc-hit-display.mjs`**
(10 próf): hermir defcon.json MEÐ leikmönnum í jsdom, opnar spjald og
neglir að afturvirkjaða talan sé aðaltalan (ekki sú hráa), að n sjáist,
og að GK sé útilokaður. Tvær stökkbreytingar felldar (hrá í stað
afturvirkjaðrar; GK-útilokun fjarlægð).

**DÁLKAR Í LEIKMANNATÖLUM (4.8.):** eigin flokkur `dcstat`
(„DC-hittni (yfirstandandi)" — hvorki form-gluggi né leikir framundan,
svo heitið ljúgi ekki) með þremur dálkum: leiðrétt %, hrá % (gagnsæi)
og n. `live_only` — fylgja EKKI völdu sögulegu tímabili.
**VIÐ TENGINGUNA FANNST AÐ „DefCon liðs"-dálkurinn VAR DAUÐUR FRÁ
FÆÐINGU**: cook gaf `num()` hlutinn sjálfan (ekki `.defcon_opportunity`),
num(hlutur)=null, og null-hjá-öllum dálkur FELUR SIG SJÁLFUR sem tómur —
eiginleikinn sem gerir dálka örugga (6i) faldi líkið. Lagað. Vörður:
**`tests/playerlist-live-cols.mjs`** — les GILDIN úr DOM (ekki bara að
dálkarnir séu til), notar röðunina sjálfa til að fleyta gagna-röð inn í
sýndarglugga listans (leitin er ótraust í jsdom, smoke-gildran). Tvær
stökkbreytingar felldar (dauði team_dc endurvakinn; adj les hráu).

### ÞEGAR UPPFYLLT — DC sem eiginleiki, ekki röðunar-ás (§5, tillaga 2)
FFS raðar Ampadu neðstan af fjórum þrátt fyrir hæstu DC-töluna, því
sóknarframlag ræður (31,7 DC-stig ≈ 0,83 stig/leik; eitt mark + stoðsending
= 8). Það er nákvæmlega afstaðan sem þetta repo tók 27.7.: DC er VILJANDI
utan FFDR og utan röðunar (kafli 3), birt sem merki (DC≥70) og upplýsing.
Engin breyting.

### EKKERT SKOTMARK — liðs-stíls-regla og kvörðunar-kúrfa (§3, tillögur 3–4)
Formúlurnar sem handoffið varar við (`hittni ≈ 0,183 − 0,0014·markatala`,
`DEF: hittni ≈ 0,094·DC/leik − 0,424`) eru úr handoffi №3 og voru **aldrei
útfærðar í þessu repo-i**. Varnaglarnir eiga sér ekkert skotmark hér.
Ef einhver leggur til að spá nýliða-hittni út frá Championship-tölum:
lesið §3 í handoffinu fyrst — kúrfan er PL-mæld og ofmælir líklega
20–25 pp á annarrar-deildar inntaki.

### ÓFRAMKVÆMANLEGT — QA-hlið gegn ytra viðmiði (§7.5)
Hugmyndin er góð (flagga spár >20 pp frá ytra viðmiði) en FFS-gögnin eru
á borgunarvegg og ekki sjálfvirkt aðgengileg (§8 í handoffinu sjálfu
staðfestir það). Ekkert til að tengja við í pipeline. Fallback-fastarnir
í afturvirkninni (DEF 0,27 / MID 0,17) eru kvarðaðir við FFS-dreifinguna
og eru það sem hægt er að flytja úr viðmiðinu án sjálfvirks aðgengis.

### UPPLÝSING SEM Á AÐ MUNA — mínútu-spá (§4)
Ytri heimildir sjá æfingaleiki, pressuherbergi og félagaskipti í rauntíma;
söguleg byrjunar-hlutföll gera það ekki. Það rímar við 6h (líkanið er
kvörðun, ekki véfrétt) og við að staðfest byrjunarlið (`lineups.json`)
er lifandi merkið sem á að vega þyngst á leikdegi.

---

## 6m. ÞRÍR SMÆRRI EIGINLEIKAR 4.8.2026 (að beiðni: „gerðu allar hugmyndir")

1. **GW1-VÖKULISTINN — `tests/gw1-checklist.mjs`.** CLAUDE.md geymdi ~6
   dreifðar „athuga þegar GW1 klárast"-athugasemdir. Nú eru þær vélrænar:
   safnið sefur í forleik (prófar að svefnstaðan sé samkvæm: player_form
   tómt, defcon tómt, imminent=archive, baseline á fyrra tímabili) og
   VAKNAR við fyrstu loknu umferð — þá verður live/gw{n}, player_form,
   last_gw(+shots á réttri umferð), defcon MEÐ hit_rate_adj, imminent án
   archive, baseline ÁFRAM frosið á 2025/26 og E0-2627 til. Vakandi
   greinin var prófuð á TILBÚNUM gögnum um `GW1_DATA_DIR`-umhverfisbreytu
   (hún hefur aldrei keyrt á raunverulegum) og þrjár svefnpurrkur felldar
   (staðnað last_gw, horfin afturvirkni, yfirskrifað baseline).
   **Dagurinn sem safnið fyrst fellur er dagurinn sem það borgar sig.**
2. **ÞÉTTARI CRON Á LEIKDÖGUM** (`fetch-fast.yml`): mælt 4.8. að GitHub
   þynnir `*/30` niður í 1–3,5 klst raunbil. Viðbótar-cron
   `*/15 10-21 * * 0,1,5,6` (fös–mán, PL-tímar) gefur sömu þynningu
   2–4× fleiri raunkeyrslur á leikdögum — glugginn fyrir staðfest
   byrjunarlið er ~5 klst og liðin birtast ~60 mín fyrir leik. Kvótinn
   er varinn í `fetch.mjs` (geymsla per leik), ekki í cron-inu.
3. **DC-hittni dálkarnir** — sjá lok kafla 6l (og team_dc-upprisan þar).
4. **HAUS-BROTIN Í LEIKMANNATÖFLUNNI — LAGAÐUR 6.8.2026** (notandinn sá:
   „útlitið er sérstakt á sumum stöðum"). Dálkabreiddin (6j) mat staf á
   **5,9 px en hann mælist 6,32** (canvas.measureText á raunverulega
   hausletrinu í Chrome) og taldi hvorki †-merkið né bilstafinn — 34 heiti
   á báðum málum brotnuðu í miðju orði („Point/s", „Minute/s") eða féllu
   í þriðju línu sem 30px hausinn klippti („Team of the week",
   „Clean sheet %†", „DC-hittni (leiðrétt)†"). Þrennt lagað í `wOf`:
   (a) mælt stafamat 6,35 + †-vídd á afleiddum, (b) ceil(len/2)-ágiskunin
   vék fyrir nákvæmri tveggja-línu skiptingu orða, (c) **76px þakið víkur
   fyrir orði sem getur ekki brotnað** (hart hámark 114 — innri breidd er
   breidd−10 padding−1 border, og „Byrjunarhlutfall" mælist 101,1 px; 112
   vantaði 0,1 px og skildi eftir stakt „l" á línu tvö). Sjö íslensk heiti
   og fimm ensk stytt í leiðinni (þau sem ekkert þak bjargar: „CBI alls",
   „Verðbr. í umferð", „Krossar → skot"…). Sannreynt VÉLRÆNT í Chrome:
   13 flokkar × bæði mál, 0 klippt/yfirfull haus-hólf (scrollHeight-skönn).
   **Vörður í `stats.test.mjs`** speglar formúluna og fellur á hverju
   heiti sem passar ekki í ≤2 línur á öðru hvoru málinu — stökkbreytt með
   klippara sem mældist (felld) og með heiti sem þakið bjargar (slapp,
   rétt). AÐFERÐIN ER FYRIRMYNDIN: skjá-letur er MÆLT með canvas, ekki
   giskað — 5,9-talan lifði í þrjár vikur af því að hún var nálægt.

---

## 6n. DC-HITTNI FYRRI TIMABILA + EINKA-DEILDIR (7.8.2026, ad beidni)

### DC-hittni fylgir nu voldu timabili
`computeDefconHistory()` i `fetch.mjs` -> `data/defcon_history.json`.
Leitt ur `player_gw_{s}.json` (`dc` = FPL `defensive_contribution`, sem er
TALNINGIN 1-27, ekki stigin) — **engin ny koll**. Somu throskuldar
(DEF 10, MID/FWD 12) og SAMA afturvirkni (K=10) og `defcon.json`, svo
tolurnar seu samanburdarhaefar. Dalkarnir threir eru ekki lengur
`live_only`; `cook` velur heimild eftir voldu timabili (history er
lyklad a `code`, sem er fast yfir timabil, en `defcon.json` a `fpl_id`).

**GILDRA SEM VAR FUNDIN OG LOKAD:** fyrsta keyrslan skrifadi FIMM timabil.
En 2122-2425 geyma `dc` sem **0, ekki null** — an siu hefdi hver leikmadur
fengid hittni **0,000**, sem LITUR UT EINS OG MAELING en thydir "gognin eru
ekki til". Nakvaemlega gildran sem kafli 3 fordast. Nu er timabil sleppt ef
ENGINN i thvi naer throskuldinum; appid synir "—" (VANTAR). DefCon er ny
stigagjof, svo adeins **2025/26** hefur raunveruleg gogn.

### Einka-deildir + verdlaunapottur (`src/Leagues.jsx`)
Undir Stigatoflunni. Deildir baettar vid med numeri EDA FPL-slod; stada,
umferdar-stig, heildarstig og hreyfing (▲/▼ fra sidustu umferd), eigid lid
audkennt. **Pottur og skipting** (sjalfgefid 50/30/20, ritanleg) synir hvad
hvert saeti er vert eins og staðan er nuna — namundad NIDUR svo greidslur
fari aldrei yfir pottinn.

**TVAER PENINGA-VILLUR FUNDNAR I UTLITSPROFUN 7.8. OG LOKADAR:**
`prizeFor` deildi med SUMMU skiptingarinnar an thess ad klippa neikvaed
gildi — `pottur 10.000, skipting [50,-30]` gaf fyrsta saeti **25.000**,
th.e. **2,5x allan pottinn** (summan vard 20, svo 50/20 = 2,5). Og
neikvaedur pottur gaf neikvaed verdlaun. Badar lokadar med `Math.max(0,…)`
a badum hlidum. Reitirnir eru FRJALS TEXTI (`50/30/20`) svo their fa hvad
sem er. **Vordur: `tests/leagues.mjs`** (22 prof) med 500 slembnum
inntokum sem verja obrigdulu regluna — *summa verdlauna ma ALDREI fara
yfir pottinn og ekkert verdlaun ma vera neikvaett*. Thrjar
stokkbreytingar felldar (klipping fjarlaegd, namundad UPP, neikvaedur
pottur leyfdur). Taflan fekk lika eigin skrun-kassa svo breid lidsnofn
ryðji ekki SIDUNNI ut a sima (kafli 8).

**Peningar og deildar-numer eru NOTANDA-GOGN**: geymt i `localStorage`
(`fpl_leagues`) og fara ALDREI i nein kall ut. Ny leid `fpl-league` i
`netlify/functions/odds.js` (FPL-standings er CORS-lokad eins og allt
annad FPL), med 60 s CDN-cache og tolu-stadfestingu a id.
**ATH: thetta er `netlify/`-breyting og kveikir thvi EINA Netlify-byggingu**
(sja kafla 2 atridi 4) — ohjakvaemilegt fyrir eiginleikann.

---

## 6o. ARON-STUDULL (JOFNUDUR) — MAELT 7.8.2026, BIRT EN EKKI RADAD

Spurning notandans: "hverjir fa ALLTAF 4-6 stig thegar their spila, i stad
thess ad fa 2 og 2 og 2 og svo 11?"

`consistency.json` (computeConsistency i fetch.mjs, leitt ur
`player_gw_*.json`, engin ny koll, oll 5 timabilin):
`hit4_pct` / `hit6_pct` / `blank_pct` = hlutfall SPILADRA leikja med
>=4 / >=6 / <=2 stig, afturvirkjad (K=10 ad stodu-medaltali).
**`aron = hit4_pct - blank_pct`** — "4+ er gott, 1-2 er galli".

### ThRENNT MAELT — OG HVERT ThEIRRA FELLDI EINA UTFAERSLU

**1. Throskuldurinn skiptir ekki mali.** FPL-stig eru ALLTAF heiltolur
(0 af 11.361 leik med aukastaf), svo >=3,5 ER >=4 og >=5,5 ER >=6.
Raunthroskuldar 3/4/5/6/7 gefa ALLIR r ~ 0,90 vid stig/leik og abatinn
umfram stig/leik **skiptir formerki**: +0,6 / +1,4 / -0,6 / +1,4 / -1,0 pp.
Havada-undirskrift; enginn throskuldur "vinnur".

**2. Jofnudur er ekki sjalfstaedur eiginleiki.** Leif hit4 eftir ad
stjornad er fyrir stigum flyst med r = 0,418 — EN thad reyndist vera
STADAN i dulargervi: innan stodu hrynur hun (DEF 0,10 · MID 0,12 · FWD
-0,11). Og med VERD lika stjornad (r(verd,ppg) = 0,43-0,66): DEF 0,122 og
MID 0,126 med 2*SE 0,21-0,27, formerki flakka. **Ekkert eftir.**

**3. AD DEILA MED VERDI VAR PROFAD OG HAFNAD.** `aron/verd` heldur ser
BETUR milli timabila (0,441 a moti 0,389) — en i akvordunarprofinu (byggja
gilt 15-manna lid undir £100m i ari N, maela utkomu i N+1) er thad VERRA:
4,09 -> 3,92 stig/leik og 37,8% -> 35,6% hittni.
**Skyringin er ThESS VIRDI AD MUNA: verd er sjalft mjog stodugt milli
timabila, svo hlutfall erfir thann stodugleika. Persistence haekkadi an
thess ad UPPLYSINGAR baettust vid.** Haerri fylgni != betri akvordun.
`ppg/milljon` og `hit4/milljon` eru enn verri — thaer skildu **£22m af
£100m OSNERTA** thvi thaer rada odyrum monnum efst (3,69 og 3,44 stig/leik).
`aron/verd` slapp vid tha gildru af thvi ad studullinn getur verid
NEIKVAEDUR og neikvaed tala deilt med lagu verdi verdur MEIRA neikvaed.

### ThROSKULDURINN: 4 ER RETTUR — 5 OG 6 ERU VERRI (maelt 7.8.)
Notandinn spurdi hvort 5 eda 6 vaeri betra. Svarid er NEI og astaedan er
odrugsaeisleg: **jafni madurinn fer sjaldan yfir 6, en 2-2-2-og-svo-11
madurinn KLARAR 6 og 7 i sprengingunum.** Har throskuldur telur thvi
sprengingar, ekki jofnud. Maelt sem fylgni hitT vid SVEIFLUSTUDUL innan
ppg-bils (5 timabil): T=3 -0,546 · T=4 -0,272 · T=5 -0,176 · T=6 -0,081 ·
**T=7 +0,148 — SNYST VID og verdlaunar sveiflur.**
Studullinn sjalfur (med blank-lidnum): aron_3 -0,546 · aron_4 -0,490 ·
aron_5 -0,472 · aron_6 -0,432.
T=3 maelist adeins betur EN ER HRORNUD: >=3 og <=2 eru SAMFYLLI, svo
aron_3 = 2*hit3 - 1 og blank-lidurinn haettir ad baeta nokkru vid.
**T=4 stendur**: hann heldur hlutlausa 3-stiga bilinu og blank-lidurinn
ber sjalfstaeda upplysingu. `6+`-dalkurinn er afram birtur EN ber nu
maelinguna i tooltip: hann maelir SPRENGIKRAFT, ekki jofnud.

### AFLEIDINGIN
Studullinn fer **ALDREI i `rankScore`** — vordur er kafli 5 i
`tests/consistency.mjs` sem fellur ef einhver reynir thad. Hann er birtur
sem LYSING i eigin flokki ("Jofnudur (Aron)", 5 dalkar) med fyrirvaranum
i tooltip. **Retta notkunin er ad rada eftir Jofnudi OG nota
verd-throskuldinn** — thad heldur samanburdinum innan verdflokks i stad
thess ad lata hlutfall blanda theim saman.

---

## 6p. FIMM TIMABIL I LEIKMANNALISTANUM (7.8.2026)

`SEASON_DIRS` var hardkodad a ThRJU timabil ("2025-26","2024-25","2023-24")
svo fellilistinn bar adeins thau — notandinn bad um fleiri. Maelt: vaastav-
speglunin ber `players_raw.csv` fyrir **2019-20 til 2025-26, oll HTTP 200**
(174-380 KB). Faert i FIMM (2021-22 og 2022-23 baett vid) svo listinn passi
vid `player_gw_*.json` sem umferdar-bilid les — annars gaeti notandinn
valid timabil i fellilistanum sem umferdar-bilid a ekki.
`player_seasons.json` fer ur ~1,9 MB i ~2,5 MB (493 leikmenn eftir siu,
1.304 utan deildar sleppt). Hun er LETIHLADIN svo thetta snertir ekki
fyrstu hledslu appsins.

---

## 6q. DALKAFLOKKARNIR ENDURSKIPULAGDIR (7.8.2026, ad beidni)

**14 flokkar -> 7, 115 dalkar -> 102.** Notandinn bad um faerri og breidari
flokka: verd/eignarhald og bonus/ICT i Grunn, xG/xA og vitin i Sokn,
DC-hittni i Vorn, spjold i Fost leikatridi, og "ESPN, sidasta umferd"
tekid ur heiti Ognar.

**TVEIR FLOKKAR FELLDIR EFTIR ATHUGUN — spurt var "segir thetta okkur
eitthvad?" og svarid var maelt, ekki agiskad:**
- **Form-gluggi (8 dalkar):** FIMM theirra (min/xG/xA/haetta/skopun i
  glugga) ma fa MED UMFERDAR-BILINU sem notandinn velur sjalfur — hrein
  tvitekning. ThRIR eru hvergi annars stadar: `mo`, `ao` og
  `byrjunar-likur` (maelda 6h-likanid). Their voru FLUTTIR (mo/ao -> Sokn,
  byrjunar-likur -> Grunnur), hinir fimm fjarlaegdir.
- **FPL-saeti innan stodu (8 dalkar):** syndu ROD FPL a somu tolum og eru
  THEGAR i toflunni (stig/leik, form, ICT...). Taflan radar sjalf, svo
  thetta var tvitekin upplysing i annarri framsetningu. Allir fjarlaegdir.

**UMFERDAR-VALARINN:** forstillingarnar ("allt timabilid / 30-38 / 20-29 /
fyrri hluti / seinni hluti") fjarlaegdar — kassa-valarinn gerir thad sama
og meira, svo tvaer leidir ad somu stillingu voru bara havadi. "Allt
timabilid" er eftir sem ein hreinsun. ALLIR 38 kassar bera nu tolu (adur
adeins 1,5,10,...): minWidth 14 -> 19 px og letur 8,5 -> 9.

**VILLA SEM VORDURINN FANN VID ENDURSKIPULAGNINGUNA:** hausinn er
haegri-jafnadur og `nowrap` fra 6m, svo yfirflaedi hverfur **VINSTRA**
megin — "Points ↓" birtist sem "oints ↓". Rodunar-orin (9 px) var ekki
talin i breiddar-matinu. Hun er nu tekin fra A OLLUM dalkum (rodunin
faerist milli theirra) og thakid faert 136 -> 142 px svo lengsta heitid
("DC-hittni (leidr.)", 141 px) rumist. Vordurinn i `stats.test.mjs` var
samstilltur vid EINNAR-LINU formuluna — hann var enn a gomlu
tveggja-linu utgafunni og hefdi thagad.

---

---

## 6r. DALKASKRAIN ENDURHONNUD — FFS-LAGID, STUTT HEITI, SMELLANLEG SIA (8.8.2026)

Beidni notandans i einni ferd (med tveimur FFS-skjamyndum). Allt her er
gert; thad sem var SPURT um en EKKI byggt er i lokin med astaedu.

### `short` OG `band` — TVO NY SVID I `STAT_DEFS`
`label` var latid gera tvo storf: vera lysandi i dalkavalaranum OG passa i
46-142 px haus. Thad gengur ekki upp — "Clearances/blocks/int" er rett heiti
og ONYTT haus-heiti. Nu:

| svid | hvar birtist |
|---|---|
| `label` | dalkavalari, filter-chip, tooltip, stigatafla |
| `short` | TOFLUHAUSINN (sjalfgefid = label) |
| `band` | spannandi hausrod fyrir ofan dalkana |
| `note` | **SKYLDA** — tooltip a hverjum dalki |

**BANDID ER FORSENDA STYTTINGARINNAR, EKKI SKRAUT.** FFS birtir 100+ tolur i
einni toflu og gerir thad laesilegt med tveimur threpum: `Goals | Tot In Out
H M/G`. Undirheitin eru ORDLAUS ein ("/90", "Tot") en fullkomlega laes undir
bandinu. Thess vegna gengur "Goals · /90" thar sem "Goals per 90" hefdi
thurft 108 px. Skrunleidin i Grunni for **1.615 -> 1.208 px** (25%) THOTT
dalkur hafi verid baettur vid.
Vordur i `stats.test.mjs` kafla 13: haus-heiti <= 12 stafir, hver dalkur ber
`note` (>= 12 stafir) og **hvert band er SAMFELLT** — band sem klofnar i tvo
myndi setja hausinn ur samhengi vid tolurnar undir honum.

### SMELLUR A TOLU = RITANLEG SIA (kjarninn i beidninni)
> "ef ég smelli á ákveðið stat t.d. start prósentu 90%, þá poppar það upp sem
> filter möguleiki sem ég get svo breytt og hann eltir ef ég skipti um flokk"

- Smellur a **hvada tolu sem er** setur throskuld a hennar dalk. Reiturinn
  faer FOKUS og textinn er VALINN, svo "85" kemur beint i stad "90".
- **Attin er LEIDD UT UR `hi`**, ekki gefin: a Verdi og Min/framlag er
  LAEGRA betra, svo smellur thar setur **ham**. Annars hefdi smellurinn siad
  burt einmitt tha sem var smellt a.
- **Talan er tekin EINS OG HUN BIRTIST** (`toFixed(dec)`), ekki hra:
  notandinn smellti a "90%", ekki a 0,8967 — throskuldur sem siar ut
  leikmanninn sem var smellt a er villa.
- Chip-in eru **RITANLEG A SINUM STAD**: tala, atti (min/max) og eyding.
  Heiti chipsins er hnappur sem OPNAR flokkinn sem dalkurinn er i.
- **Sian lifir utan flokks**: `thresholds` er einn listi sem flokka-skipti
  hreyfa ekki. Thrjar visbendingar svo hun se ekki thogul: eigin rammi
  ("FILTERS n"), **▼ i haus** sídada dalksins, og **tala a flokkahnappnum**
  ("Basics ①") thegar sian liggur i lokudum flokki.
- **HALFSKRIFAD GILDI SIAR EKKI.** `5 >= ""` er TRUE i JS (tomur strengur
  verdur 0), svo an vardar hefdi listinn hoppad i fulla lengd i hvert sinn
  sem reiturinn var tæmdur i innslætti. `Number.isFinite(t.val)` fyrst.

### FROSNI DALKURINN — VILLAN SEM NOTANDINN SA, MAELD OG LOKUD
> "Þegar ég skrolla langt inn í stats gluggann fer texti undir nöfnin og
> myndir af köllum."

`cName` ber `background:"inherit"`. Thad VIRKAR i gagnarodunum (rodin sjalf
setur lit) en i hausnum sat liturinn a sticky-UMGJORDINNI, svo haus-rodin
var gagnsae og frosna "Player"-holfid erfdi **rgba(0,0,0,0)** — maelt i
Chrome. Haus-heitin skrunudu thvi SYNILEGA undir nafnadalkinn
("s/xGIPlayer xGI/£m"). Gagnarodirnar voru alltaf i lagi (zoom-maelt).
Thrennt lagad, hvert um sig naudsynlegt:
1. **Beinn bakgrunnur** a haus-holfid — aldrei `inherit` thar sem
   for-elementid er gagnsaett.
2. **`frozenShadow`** a kantinum thegar `scrollLeft > 2`: dyptar-visbending
   um ad efnid heldur afram UNDIR holfinu. Hun var ALDREI til, og thad var
   ástæða thess ad hálf-klippt haus-heiti las eins og bilun.
3. **"Player" er VINSTRI-jafnad** (allir adrir hausar haegri). Adur sat thad
   thett upp vid naesta haus sem klippist vinstra megin — tvo half ord i
   beinni rod.
Skuggarnir tveir a sama holfi (graena "mitt lid"-rondin, inset, og
kant-skugginn) eru **lagdir saman i einn `boxShadow`**; `cellMine` var
spread-ad EFTIR og hefdi thurrkad kantinn ut.

### TVITEKNINGAR SEM VORU FJARLAEGDAR
| var | nu |
|---|---|
| **Verd og Eign% TVISVAR** — fastir dalkar OG i "Grunni", svo "price við hliðina á Threat" | `PINNED` er nu NOTAD til ad sleppa theim ur flokka-dalkunum. Their halda skra-legum samastad (stigataflan radar eftir theim) |
| **"Start prob" og "Starts" — SAMA TALAN** hlid vid hlid | Hardkodadi dalkurinn lengst til haegri var `startP` med RONGU heiti ("Starts"). Farinn; `start_prob` i Grunni ber litinn sem hann hafdi |
| `bps_per_90`, `mins_per_million`, `bonus_per_million` | fjarlaegd ad beidni |
| "fela toma"-hnappurinn | farinn — tomur dalkur segir "engin gogn", horfinn dalkur segir ekkert, og sjalfvirk felun faldi einu sinni RAUNVERULEGA VILLU (daudi `team_dc`, kafli 6l) |

### START% — SPURNINGIN SEM VAR SPURD, OG SVARID ER I TOOLTIP-INU
> "Hvaðan kemur start% ? Afhverju eru sumir með yfir 1.0 í start rate?"

`starts_per_90` er OPINBER FPL-tala og hun er **EKKI hlutfall leikja sem
hann byrjadi**. Hun er `startir / (minutur / 90)` — **byrjanir per 90
MINUTUR A VELLI**. Maelt i `data/players.json`: **186 af 365** eru yfir 1,0,
haest 2,37 (Jocelin.T: 1 byrjun, 38 minutur).

| tala | hvad hun thydir |
|---|---|
| ~1,00 | byrjar og spilar allan leikinn — **thad er markmidid** |
| > 1 | byrjar en er tekinn af snemma, EDA urtakid er ortitid |
| < 1 | mikill hluti minutna hans kemur AF BEKKNUM (George: 1 byrjun, 351 min = 0,26) |

Heitid var "Start rate" — sem las eins og hlutfall a [0,1] og var thvi
**villandi heiti, ekki bara stutt**. Nu **"Starts/90"** og tooltip-id ber
allar tolurnar hér fyrir ofan. Spurningin "byrjar hann NAESTA?" er onnur
tala: `start_prob` (maelda 6h-likanid).

### ANNAD SEM VAR GERT
- **`pts_per_start`** ("Per start") baett vid: `points_per_game` deilir med
  leikjum sem hann SPILADI, svo varamanns-innkoma dregur byrjunarlidsmann
  nidur. Per start er thad sem hann gefur i leikjum sem hann byrjar.
- **`influence_per_90`** baett vid svo /90-parid vanti ekki i Indexes.
- **ICT, ahrif, skopun og ogn -> SOKN** (ur Grunni), band "Indexes", hver
  med sitt /90 vid hlidina. Thau maela sokn; i Grunni sátu thau a milli
  verds og eignarhalds.
- **Allt /90 stendur nu VID SINA GRUNNTOLU.** Ástæða thess ad thau voru
  langt fra henni var **SKRA-LEG**: `STAT_DEFS` var i TVEIMUR hlutum
  (grunn-fylki + `STAT_DEFS.push(...)` 800 linum nidar), svo ICT var i einum
  og ICT/90 i odrum. Nu er **EIN ROD** og birtingar-rodin ER skra-rodin.
- **Vitin saman** i bandi "Penalties" (rod + klikkud); vorslud viti (PS) er
  i "Goalkeeping" thvi thad er GK-tala.
- **Styttingar**: Clean sheets -> CS, Penalty saves -> PS, TOTW,
  CBI, GC/xGC, G−xG, GA−xGI o.s.frv. — **oll med skyringu i tooltip**.
- **"available only" -> "fit to play"** med tooltip. Notandinn spurdi hvort
  thad vaeri "bara their sem eg hef efni a": thad er FPL `status === "a"`
  (heilbrigdur og leikheimill) og verd kemur thvi ekkert vid.
- Dalkavalarinn leitar nu lika i `short` og `band` ("CBI" finnur
  "Clearances/blocks/int") og birtir haus-heitid vid hlid fulla heitisins.

### SPURT UM OG **EKKI** BYGGT — MED ASTAEDU
- **BIG CHANCES (og "big chances created"):** thaer eru **ekki i toflunni og
  geta ekki verid**. Thaer krefjast **xG PER SKOT** og ENGIN heimild sem vid
  naum i gefur hana: ESPN gefur skot-hnit en enga xG, Understat er
  gagnalaust, FBref og SofaScore skila 403 (kafli 6b/6e). FFS hefur thaer
  ur Opta. **"Chances created"** i Ogn er thad naesta sem er RAUNVERULEGT:
  hve oft hann lagdi upp SKOT, lesid ur ESPN-texta (76% skota nefna upplegg,
  svo hun er GOLF, ekki nakvaem tala) — og note-id segir thad, svo hun verdi
  ekki lesin sem big chances.
- **`points_per_start` var EKKI til** fyrr en nu (svarid vid "erum við með
  points per start í basic?" var NEI).

---

## 6s. LEIKMANNATAFLAN VARD ADALVERKFAERID (8.8.2026, seinni ferd)

Notandinn: *"Ég er lang mest að fara nota player stats töfluna til að skoða
og bera saman leikmenn."* Thess vegna fluttist thad sem hann notar THANGAD og
thad sem sagdi sama hlutinn tvisvar var TEKID UT.

### THRIR LESMATAR I EINUM FLIPA
| lesmati | hvad | hvadan |
|---|---|---|
| **Groups** | einn flokkur i einu med bands-hausnum (6r) | var |
| **Build table** | NOTANDINN VELUR DALKANA | "Table" i stigatoflunni |
| **Imminent** | IG/IA-spjoldin med linuriti | stigatoflunni |

### "BUILD TABLE" — OG HVERS VEGNA HUN ER EKKI SAMA OG GAMLA "Table"
Gamli toflu-hamurinn i stigatoflunni gat **EINA tolu i einu**: madur valdi xG
og fekk xG-tofluna med fjorum samhengis-dalkum. Beidnin var onnur og hun var
um SAMANBURD: *"ég vill geta valið mörg stats með því að smella á þau, þá
birtast þau við hlið leikmanns... ég vill geta smellt á mörg stats sem verða
þá bláir."*

- **Blatt = valid.** Blai liturinn er ASETT ANNAR en fjolublai (rodun/sia) og
  graeni ("mitt lid") — thrju merki, thrir litir. Sami arekstur var lagadur
  einu sinni adur (samanburdar-rodin, kafli 6i).
- **VALROD, EKKI SKRA-ROD.** Sa sem er valinn fyrst stendur fyrst. Skra-rod
  hefdi verid "snyrtilegri" en tha getur madur ekki stillt tveimur tolum HLID
  VID HLID, sem er allt sem hamurinn er til fyrir.
- **FASTIR DALKAR: VERD OG STIG** ("Fast verður þá bara verð og stig,
  restina bætir maður við"). I flokka-ham eru their afram verd og
  eignarhald, thvi thar er "stig" fyrsti dalkur i Grunni og yrdi tvitekid.
  Listinn `pinnedKeys` styrir BAEDI birtingu OG utilokun ur valaranum —
  annars hefdi madur getad valid "Points" og fengid hann tvisvar.
- **STIGIN FYLGJA TIMABILI OG UMFERDAR-BILI** eins og hver onnur summa (lesin
  ur `src` gegnum skrana, ekki ur `p.total_points`). Fastur dalkur sem birti
  arstidartolu vid hlid bils-talna hefdi logið.
- Rodun er obreytt: smellur a haus radar, svo "geta raðað eftir ákveðnu stats"
  er thegar til — tooltip-id segir thad nu upphatt.
- Valid **vistast** (`fpl_cols` i localStorage, `fpl_*`-nafnareglan svo
  hreinsunar-hnappurinn i ErrorBoundary taki hann med, kafli 8c).
- **BANDS-RODIN ER SLEPPT i thessum ham.** Valrod brytur samfelluna, svo
  hausinn las `MINUTES  EXPECTED  MINUTES` — sama bandid tvisvar med gati a
  milli. Band sem endurtekur sig er verra en ekkert band. `headH` fylgir thvi
  hvort rodin er teiknud, thvi radirnar eru absolute-stadsettar undir hausnum.

### VALARINN VARD FJOLDALKA YFIRLIT — BREYTT AF HINNI LOTUNNI, HALDID
Fyrsta utgafan min var 210 px kassi med `overflowY:auto`. Hin lotan skipti
honum ut fyrir **`columns:"170px"`** (fjoldalka-flaedi) og hafdi RETT FYRIR
SER: 100 dalkar i skrun-kassa thyda ad madur SKRUNAR til ad sja hvad er i
bodi, sem er akkurat ofugt vid tilganginn — thetta er YFIRLIT yfir allt sem
ma velja. `breakInside:"avoid"` situr a BONDUNUM (4-5 dalkar hvert), ekki a
flokkunum: Attack er 33 dalkar og kemst aldrei i einn dalk, svo vordur a
flokknum vaeri hunsadur hvort sem er. A sima helst skrunid (`pickBodyNarrow`).
**Samanbrotid vard thvi BRYNNA, ekki onodsynlegt**: yfirlitid er ~490 px hatt
og taflan er thad sem madur er ad byggja.
Skjalad her thvi tvaer lotur unnu a somu skra samtimis (sbr. varuðina i 6j) —
thessi breyting er MELD og haldið, ekki mistok.

### TEKID UT: BEKKJAR-HAETTA
Hun birti **somu maeldu toluna** sem `Start prob`-dalkurinn birtir, ur somu
skra (`startRisk` -> `imminent.json`). Tvaer birtingar a einni maelingu, og su
i toflunni er nytilegri thvi hun radast og siast med ollu odru.
`startRisk`, `startProbability` og `START_MODEL` eru **obreytt i stats.js** og
prófin a thau (kafli 12 i `stats.test.mjs`) obreytt — thad var BIRTINGIN sem
for, ekki maelingin.

### VORDURINN SEM MATTI EKKI FARA MED "Table"
`buildLeaderboard` telur **ovaenlegar tolur** (`isIncoherent`): FPL skilar
`goals_scored: 11` med `minutes: 0` (Meslier, 1 af 563 — kafli 6b atridi 3).
Talan var birt **adeins i toflu-hamnum**, svo hun hefdi horfid thegjandi med
honum. Hun er nu birt i hverjum topp-5 kassa i yfirlitinu (`{n} impossible`).
Ad fjarlaegja birtingu a verdi og halda talningunni er nakvaemlega gildran sem
kostadi viku thegar markadslidurinn var daudur (kafli 3).

### FOST LEIKATRIDI — TEIKNUD IKON (`src/Icons.jsx`)
Sagan er lærdomurinn og hun er thegar i `SP_KINDS`: taknin **⚽ / ◎ / ⌾ voru
OGREINANLEG i 13px** (tvo naer eins hringir), svo 31.7. var theim skipt ut
fyrir **bokstaf** (P/F/C). Bokstafur er laesilegur en merkingarlaus — madur
les "C" og verdur ad VITA ad thad se corner.

**REGLAN: I SMARRI STAERD ER SILHUETTAN ALLT.** Tvo ikon sem eru bædi
"hringur med smaatridum" verda EINS vid 13px, hvad sem smaatridin eru. Thess
vegna er hvert ikon a annarri grunnform-samsetningu:

| ikon | silhuetta |
|---|---|
| **viti** | hringur + FLATUR DEPILL undir — lodrett tvennd |
| **aukaspyrna** | hringur + THRJAR STANGIR (veggur) — larett tvennd |
| **horn** | FANI a stong + fjordungsbogi — skálína |
| **flipinn** | markramma + strikud ferd + knottur |

**VITA-IKONID VAR ENDURTEIKNAD EFTIR SKJA-PROFUN, TVISVAR.** Fyrsta utgafan
hafdi vitateigs-bogann YFIR knettinum: vid 15px las boginn plus
pentagon-strikin inni i knettinum sem **HORN A ANDLITI**. Onnur utgafa setti
hringlaga depil undir — hun las sem **stadsetningar-naell** (kula med totu).
Thridja og gildandi: **flatur sporbaugur** = punktur A JORDU. Teikningin var
"rett" i ollum thremur; myndin var vitlaus i tveimur. Ikon verdur ad profa i
RAUNSTAERD, ekki i editor.
Flipinn bar `⚽️` sem er SAMA taknid sem "⚽ Planner" bar — tveir flipar med
sama tákni er thad sama og ekkert tákn.

### VILLA SEM `npx esbuild` SA EKKI — OG HVAD SA HANA
Ad flytja `ImminentPanel` og `StartRiskPanel` ut ur `Leaderboard.jsx` skildi
eftir **thrjar tilvisanir i horfin nofn**: `...SR_STYLES`, `...IMM_STYLES` og
— verst — `C` og `mono`, sem bjuggu MILLI theirra tveggja stila-blokka og
fylgdu theim ut. Nidurstadan var `ReferenceError: C is not defined` =
**HVITUR SKJAR a stigatoflunni**.

`npx esbuild src/Leaderboard.jsx` var **GRAENT** allan tímann: hann thattar,
hann leysir ekki nofn. Syntax-tekk er thvi EKKI nog eftir ad blokkir eru
fluttar milli skraa. Tvennt sa thetta og bædi tharf:
`tests/data-resilience.mjs` (opnar hvern flipa og krefst marktaeks innihalds)
og appid i vafra. **Nyja reglan: eftir ad kodi er FLUTTUR milli skraa,
`await import()` a skrana — thad leysir nofn a einingarsvidi.**

## 6t. BSD — NY GAGNAHEIMILD, MAELD 8.8.2026 (handoff №5)

`https://sports.bzzoiro.com/api/v2/` · `Authorization: Token <BSD_KEY>` ·
lykill i GitHub Secrets. **Okeypis, enginn kvoti** (maelt: ~1.400 koll i
einni lotu an throttlunar). Skjolin eru a `/openapi.json` (790 KB, 196
slodir) — EKKI `/api/v2/openapi.json` eins og handoff №5 segir.
Fotbolti er sjalfgefna ithrottin: `/api/v2/*` an forskeytis, 64 endapunktar.
**Premier League = `league_id 1`** · 2025/26 = `season_id 337` ·
2026/27 = `season_id 1058` · 35 timabil til.

### HLIDID — hvad STENST og hvad FELLUR

| handoff | tillaga | MAELD NIDURSTADA |
|---|---|---|
| **B1** odds | „HAESTA FORGANG, losar P1.2" | **HALF-STENST** — sja hér nedar |
| **B2** big chances per leikmann | „endurlifgar felld verk" | **FELLUR — SVIDID ER ALLTAF NULL** |
| **B3** shotmap + xG | „in-box reglan verdur lettvaeg" | **STENST AD FULLU** |
| **B4** spad byrjunarlid | „staersta oleysta vandamalid" | **STENST, EN GLUGGINN ER ~13 KLST** |
| **B5** meidsli per leik | beint i T6 | endapunktur til, tomur i forleik |
| **B6** thjalfarar | sjalfvirka DC-flaggid | 3.400 thjalfarar med profil — nothaeft |
| **B7** domarar | skerpir spjalda-leidrettingu | 1.231 domari, spjold/leik til |

### ThAD SEM SKIPTIR MESTU: **DAUD SVID SEM LITA UT EINS OG MAELING**

`big_chance_created` og `big_chance_missed` eru **100% non-null og
ALLTAF NULL** — 15.189 leikmanna-leikir, ekkert gildi ≠ 0. Handoff №5 §B2
hefdi sent **dalk af nullum**. Sama gildir um ~20 onnur svid:
`expected_goals_on_target` (xGOT), `goals_prevented`, `keeper_save_value`,
oll `*_value_normalized`, ball-carry/progression, `outfielder_block`,
`error_lead_to_a_shot/goal`, `hit_woodwork`, `high_claims`,
`last_man_tackle`, `clearance_off_line`, `total_offside`,
`saved_shots_from_inside_the_box`, halfvallar-sendingar.

**Thetta er nakvaemlega gildran sem kafli 3 og 6n fordast** og hun er nu
vordud tvisvar i `tests/bsd.mjs`: (a) ekkert dautt svid ma rata i skrana,
(b) hvert birt svid verdur ad hafa RAUNVERULEGA dreifingu. Stokkbreyting
sem laumar `big_chance_created` inn fellur.

### PER-SKOT xG — I FYRSTA SINN I ThESSU REPO-I
`/events/{id}/stats/` → `shotmap`: **100% skota bera `xg`** i ollum 380
leikjum 2025/26 (9.544 skot). Auk thess `pos{x,y}`, `gm` (marksstadsetning),
`sit` (horn/fastbreak/vitaspyrna), `body`, `type` og `block`. Skran ber lika
`momentum`, `average_positions` (RAUNVERULEG medalstadsetning — 6b segir
hana vanta) og `xg_per_minute`. `/events/{id}/incidents/` gefur
**uppbyggingar-kedjur marka med hnitum**, sem er naest thvi sem Understat
gaf i xGChain.

**ThEKJAN ER EITT TIMABIL.** Maelt a 8 timabilum: 2025/26 hefur skotakort i
oll 380 skiptin, **2024/25 og eldri hafa EKKERT** (0/8 i hverju profudu
timabili). BSD getur thvi **ALDREI** fætt bakprofin — thau krefjast 8-15
timabila (kafli 3) — og ma ekki fara i FFDR-kjarnann. Hun er
BIRTINGAR- og LIFANDI-heimild, ekki likans-heimild.
**`has_xg` i lista-endapunktinum LYGUR**: hann er `false` fyrir OLL timabil,
lika 2025/26 sem hefur full gogn. Ekki treysta honum; sæktu `/stats/`.

### TVEIR FASTAR — FITTADIR GEGN BSD-INS EIGIN LIDSTOLUM
Lids-svidin `big_chances` og `shots_inside_box` i `/stats/` ERU raunveruleg
(0-8 per lid-leik), svo thau eru SANNLEIKURINN sem per-skot talan er fittud ad:

| fasti | valid | MAE | tillaga handoffs | MAE hennar |
|---|---|---|---|---|
| `BIG_CHANCE_XG` | **0,18** | 0,746 (r 0,774) | 0,35 | 1,385 (r 0,612) |
| `IN_BOX_X` | **17** | 0,133 | (ESPN-reglan) 31,4 | 4,079 |

**KVARDINN ER ANNAR EN HJA ESPN.** BSD-`pos.x` er hlutfall af **FULLUM**
velli (105 m): vitateigur 16,5 m = 15,7 og optimum maelist 16,5-17.
ESPN er hlutfall af **HALFUM** velli (6b). Handoff №2 varadi vid ad flytja
ESPN-regluna — su vorun var rett, og hér er malid **maelt** i stadinn fyrir
ad vera flutt. Vordur i `tests/bsd.mjs` kafla 2 neglir badar tolurnar.

### VORPUN — LIDIN HANDSTADFEST, LEIKMENN MED MINUTUM
- **Lidin: HANDSTADFEST tafla** (`BSD_TEAM` i `fetch-bsd.mjs`), 20↔20
  gagntaek. Fuzzy pörun **felldi Man United inn i Man City** (badir verda
  „manchester" eftir normaliseringu) — thogul RONG pörun er verri en engin.
  BSD-lidin 2026/27 stemma NAKVAEMLEGA vid `teams.json`, lika nyliðarnir
  Coventry/Hull/Ipswich, og GW1 er 21.8. eins og FPL-fresturinn.
- **Leikmenn: eitt-a-eitt + MINUTUR.** Nafnid eitt vixladi Jacob og Alex
  Murphy (badir NEW) og setti Gabriel Martinelli a Gabriel. `season_baseline.json`
  geymir FPL-minutur SAMA timabils, svo minutu-samraemi er lagt vid
  nafnaskorid. Fyrir: mork r 0,9970, 3 rangar paranir. Eftir:
  **r 0,9998 · 389/391 nakvaem · 0 rangar**.
- **Stadfesting gegn FPL** (391 pör): mork **r 0,9998** · minutur **0,9998**
  · xG **r 0,995**. Assist eru hins vegar **29% faerri** (503 a moti 708) —
  thad er OPTA-skilgreiningin a moti FPL-skilgreiningunni (FPL gefur assist
  fyrir unnid viti o.fl., sbr. 6b) og er ThVI EKKI VILLA. BSD-assist eiga
  aldrei ad skipta ut FPL-tolunni.

### ODDS — B1 FELLUR EKKI, EN GLUGGINN ER ~4 DAGAR
Kerfid er raunverulegt: **81 bokari**, 373.890 raðir, uppfaert a klst.
`/events/{id}/odds/comparison/` gefur per-bokara toflu **og
`movement` (DRIFTING/SHORTENING)** sem engin onnur heimild okkar hefur.
**EN:** upcoming-oddar na adeins **~4 daga fram** (maelt 8.8.: allir 257
verdlagdir leikir liggja 8.-12.8.). PL GW1 er 21.8. og hefur thvi **0
bokara** nuna — thad er GLUGGINN, ekki bilun; enskir Carabao-leikir innan
gluggans hafa 17 bokara. Fyrir okkur er thad **nog**: markadslinan er notud
fyrir NAESTU umferd.
**GATIÐ: ENGIR SPREADS.** BSD hefur 1X2, O/U 1,5/2,5/3,5 og BTTS — en
**engan asiskan forgjafar-markad**. `market.js` reiknar `(T±S)/2`, svo
S vantar. Hun er endurheimtanleg (leysa λ_heima/λ_uti ur 1X2 + O/U 2,5
undir Poisson) EN thad er NY afleidsla sem verdur ad maelast gegn
`odds.json` adur en hun fer i FFDR. **EKKI GERT** — sja kafla 7.

### SPAD BYRJUNARLID — GLUGGINN ER MAELDUR OG HANN ER STUTT
`/events/{id}/lineups/` gefur `lineup_status` (`predicted`/`confirmed`/
`unavailable`), `confidence` per lid og **`ai_score` per leikmann** —
th.e. nakvaemlega staerdina sem 6h-likanid metur.
**EN glugginn er ~11-13 klst fyrir leik** (maelt: allir 14 Carabao-leikir a
T+11-13 klst eru `predicted`, allt thar fyrir utan `unavailable`; PL-opnunar-
leikurinn er undantekning sem er spadur 13 dogum fram).

**AFLEIDINGIN FYRIR FPL ER ThAD SEM HANDOFF №5 SEGIR EKKI:** FPL-fresturinn
er ~1,5 klst fyrir FYRSTA leik umferdarinnar. Med 13 klst glugga eru
laugardagsleikir spadir ~13 klst fyrir sinn eigin leik — sem er **EFTIR**
fostudags-frestinn i GW1. Vid frest fast thvi spar adeins fyrir tha leiki
sem hefjast innan ~13 klst fra fresti. Thetta er **gagnlegt en ekki
lausnin** sem §B4 lysir, og ma ekki selja sem slika. Retta notkunin:
(a) birta sem SPA med oryggistolu, (b) **maela hana gegn okkar eigin
6h-likani yfir GW1-4** adur en henni er treyst.

### ThAD SEM VAR BYGGT
`scripts/fetch-bsd.mjs` (handvirkt, ~1.400 koll, timabil sem er LOKID
breytist ekki) → **`data/bsd_players.json`** (271 KB, 391 leikmenn pöradir).
Adeins pöradir menn fara i skrana; hinir 286 (foru ur deildinni) eru
taldir og nefndir i `unmatched_names` svo hvarfid se SYNILEGT.
**17 nyir dalkar** i `STAT_DEFS`, thrju bond:
`Shot quality` (skot, xG ur skotum, xG/skot, big chances, teigsskot) ·
`Creation` (faeri skopud, krossar, snertingar, rekstur, brotid a, einkunn) ·
`Defensive detail` (tacklingar, stodvanir, hreinsanir, stodvud skot,
skallaeinvigi — FPL bundlar thrju thau fyrstu i EINA CBI-tolu).
Their eru **EKKI `live_only`**: their FYLGJA voldu timabili og eru tomir
(„—") a ollum timabilum nema 2025/26 — stadfest sjonraent i Chrome.

**`key_pass` er raunveruleg „faeri skopud"**, olikt ESPN-dalkinum i Ogn sem
er lesinn UR TEXTA og er GOLF (6f). Badir eru birtir; heitin adgreina tha.

### OSVARAD — spyrja Discord theirra
1. **Hvadan koma gognin?** Osvarad og mikilvaegast. Sniðið
   (`rating`, `big_chance_created`, `*_value_normalized`) er **SofaScore-laga**
   — og SofaScore-skilmalar banna sjalfvirka sofnun (6e/handoff §1). Ef
   thetta er endurmidlad thadan erum vid i somu skilmalastodu einu lagi fjaer.
   **Thess vegna er BSD birtingar-heimild med fallbacki, ekki burdarvirki.**
2. Leyfi til endurbirtingar i appi med notendum.
3. Hvada xG-likan (tolurnar stemma vid FPL innan 0,5% svo thad er
   Opta-ættad, en er ekki sama likan).

**Fallback-stigveldid ur handoffinu stendur og er nu raunverulegt:**
BSD dettur ut → dalkarnir verda tomir („—"), EKKERT annad brotnar, thvi
ekkert i FFDR, `rankScore` eda vænt stig les BSD.

### 6t-b. SEINNI FERD — MA BSD LEYSA ADRAR HEIMILDIR AF HOLMI? (8.8.)

Spurt var beint. Svarid er **NEI VID OLLUM** og hvert er maelt:

| heimild | ma BSD taka vid? | MAELINGIN |
|---|---|---|
| **football-data.co.uk (E0)** | **NEI** | BSD geymir **ENGA sogulega odda** — 0/3 i 25/26, 24/25, 22/23 og 19/20. Oddar eru LIFANDI (~4 daga gluggi) og hverfa eftir leik. E0 er einmitt notud fyrir B365-oddana sem bakprofin endurbyggja markadslinuna ur. E0 STENDUR. |
| **ESPN (skot)** | **NEI, ekki einhlitt** | BSD er betri (xG per skot) EN nær adeins yfir 2025/26. ESPN gefur SIDUSTU LOKNU UMFERD lifandi, sem BSD-skran gerir ekki. Their svara ólíkum spurningum. |
| **API-Sports** | **NEI — en forsendan er brostin** | sja nedar |
| **ClubElo** | **NEI** | BSD hefur engan Elo. |
| **FPL (status/meidsli)** | **ALLS EKKI** | sja nedar |

**BSD-`availability` ER VERRI EN FPL-STATUS — MAELT A 374 LEIKMONNUM.**
BSD segir „available" um **23** leikmenn sem FPL flaggar rett: Saliba
(bakmeidsli), Timber (nara, aftur 21.8.), Ferguson (okkla, aftur 10.10.),
threir i BANNI (Christie, Fofana, Andersen) og tveir a LANI (Bassette,
Burstow). BSD hefur hvorki bann- ne lans-hugtak. A moti flaggar BSD 7 menn
sem FPL telur heila og sem hafa ENGAR FPL-frettir.
**Nidurstada: FPL-status er afram einrátt, og BSD-availability a ekki einu
sinni ad audga hann — hun skeikar i RONGU attina.** (Sbr. regluna i kafla 6.)

**FORSENDA API-SPORTS ER BROSTIN — MAELT.** Kafli 6 segir markmidid vera
„TEGUND meidsla („Hamstring Injury") sem FPL-frettirnar sleppa."
Maelt 8.8. a ollum 58 flogguðum leikmonnum: **71% FPL-frettanna NEFNA
TEGUNDINA** („Groin injury", „Back injury", „Knee injury"; 14 hnjameidsli,
6 laeri, 4 aftanlaeri...) og **0 flaggadir menn eru an frettar**. Hin 29%
eru bonn, lan og „Unspecified injury" — thar er ENGIN tegund til ad saekja.
API-Sports er thvi ad saekja tolu sem FPL gefur nu thegar.
**EKKI FJARLAEGT** (hun a enn `/fixtures/lineups`, byggt 31.7., og fyrsta
raunprofun beggja er 20.-21.8.), en rokstudningurinn i kafla 6 er ranghermi
og verdur ad endurmetast eftir GW1. BSD gefur stadfest byrjunarlid an kvota.

### NY GOGN SEM VORU TEKIN (maeld, ekki agiskud)
`sit` og `body` i skotakortinu eru 100% fyllt og RAUNVERULEGIR flokkar:
assisted 47,7% · corner 17,6% · regular 13,1% · fast-break 6,9% ·
set-piece 5,9% · innkast-fast 5,1% · aukaspyrna 2,6% · **viti 1,0% med
medal-xG 0,788** — thekkta vitahlutfallid, sjalfstaed stadfesting a
xG-likaninu. Skallar 18,7%.
**Sex nyir dalkar**, band `Set-piece threat`: SP xG · SP % · OP xG ·
Head xG · Headers · **Woodwork**.
- **Fost leikatridi eru 31,2% skota** og adgreinanleg per leikmann.
  Andlitsprof: haest hlutfall eru Thiaw 98%, van Dijk 97%, Gabriel 97%,
  van den Berg 99% — nakvaemlega hornamidverdirnir. Rodun i appinu
  stadfest sjonraent.
- **TREVERK ER LOKS TIL.** `luck.json` hefur borid `woodwork: null` sidan
  Understat do (6b) og 6e taldi thad oendurheimtanlegt. BSD skilar thvi sem
  eigin utkomu-tegund (`type: "post"`): 211 skot 2025/26, 150 a poruðum
  monnum, Haaland efstur med 6.

### ANNAD SEM ER TIL EN VAR **EKKI** TEKID (og hvers vegna)
| gogn | astaeda |
|---|---|
| lids-xGF/xGA i `/standings/` | **GILDRA:** `xgf` er **0,0 (ekki null)** fyrir 23/24 og eldri, og 24/25 er HLUTA (xg_games 22-23 af 38 — Liverpool 53,1 er ekki arstidartala). **`xg_games` er vordur-svidid** og verdur alltaf ad lesast. Adeins 25/26 er heilt. |
| `/transfers/` (538.791 raðir) | raunveruleg, en FPL-lidid i `players.json` er thegar rett; „nykominn" er snyrti-upplysing, ekki akvordun |
| `market_value_eur`, `wage`, `potential`, `injury_risk` | 68-83% fyllt en eru FIFA-aett skatamat, ekki maeldar FPL-staerdir |
| `strengths`/`weaknesses`/`attributes`/`weight_kg` | **DAUD** (0,1-0,7% fyllt) |
| `/players/{id}/stats/` | eitt kall per leikmann og ber BIKAR + LANDSLEIKI — en sama eins-timabils thekja. Landslids-alag er OMAELT hja okkur; Evropu-alag var maelt og HAFNAD (6k) |
| `/events/{id}/h2h/`, `/metadata/`, `bestxi`, `top/{stat}` | virka, en eru afleiddar ur gognum sem vid hofum thegar |

### ThRJAR ThOGULAR VILLUR SEM FUNDUST VID ENDURKEYRSLU
Skran var **ekki endurgeranleg** — tvaer EINS keyrslur gafu 389, 390 og 391
pörun. Thrjar oskyldar orsakir, allar lagadar:
1. **ThOGULT GAGNATAP.** `pool` gleypti villur, svo eitt mistekid kall let
   HEILAN LEIK hverfa an merkis (Harry Maguire fekk 25 leiki i einni keyrslu
   og 26 i annarri). Nu eru mistekin koll TALIN, reynd aftur, og keyrslan
   **deyr fremur en ad skrifa hluta-timabil**.
2. **LIDID VAR „SIDASTI VINNUR".** Samhlida vinnsla gaf leikmanni sem skipti
   um lid rosandi `team_id` og thar med annan frambjodenda-hop. Nu raedur
   **flest-leikid lid**, jafntefli brotnar a laegsta id.
3. **FLEYTITOLU-ROD.** Samlagning er ekki vixlin, svo Rodri fekk einkunn
   7,40 i einni keyrslu og 7,41 i annarri. I/O er nu adskilid fra
   uppsofnun: koll ganga samhlida, **summur eru lagdar saman i fastri
   event-id rod**.
Stadfest: tvaer fullar keyrslur eru nu **byte-eins**. Pörun for i **393**
(haerri en adur — flest-leikid lid er rettara en sidasta).

**VORDUR SEM ThURFTI AD BREYTA:** `player-gw-range.mjs` taldi blinda dalka
med fostu thaki (`< 40`) og féll a 43 thott nyju dalkarnir seu RETTILEGA
blindir (timabils-summur geta ekki fylgt umferdar-bili, frekar en verd eda
form). Fast thak a talningu stadnar um leid og dalkum fjolgar — sama villa
og hardkodada safna-talan (kafli 4). Maelt sem **hlutfall** nuna (35,0%).

---

---

### 6t-c. SKOTAKORT PER LEIKMANN (8.8.2026)

`data/bsd_shots.json` (168 KB, 316 leikmenn, 7.105 skot) + `src/ShotMap.jsx`,
birt a leikmannaspjaldinu. **Fyrsta skotakortid i repo-inu med xG PER SKOT** —
ESPN-kortid i Umferdinni hefur hnit EN ENGA xG (6b), sem er einmitt talan
sem gerir kort ad upplysingum i stad punktaskys.
**LETIHLADID**: sott i fyrsta sinn sem spjald er opnad, ekki vid raesingu.

**KVORDUNIN KEMUR UR GOGNUNUM, EKKI UR REGLUGERD.** Vollurinn er teiknadur
eftir `calib` i skranni, sem er MAELT ur somu skotum og eru teiknud ofan a
hann. Astaedan er villan sem ESPN-kortid hafdi (6b): fyrsta utgafan
margfaldadi med 105 i stad 52,5 og setti HVERT SKOT i tvofalda fjarlaegd —
**ekkert prof sa thad, notandinn sa thad a vellinum**. Lesi vollurinn somu
tolur og punktarnir getur thad ekki gerst.

| kvordun | gildi | hvernig maelt |
|---|---|---|
| vitapunktur x | **11,5** | medaltal 92 vitaspyrna; y = **50,00 hja OLLUM** |
| teigur x | **17** | fittad gegn `shots_inside_box`, MAE 0,133 |
| teigsbreidd y | **20,4-79,6** | 99,5% teigsskota falla thar innan |
| markteigur | 5,5 / y 36,5-63,5 | nominal, samraemt vid maeldu tolurnar |

**ThRJU OHAD AKKERI I PROFINU** (`tests/shotmap.mjs`, 24 prof) — kortid er
ekki profad a "birtist thad" heldur a **hvort punktarnir seu a rettum stad**:
1. **xG FELLUR EINRAENT MED FJARLAEGD** (0,262 → 0,151 → 0,085 → 0,044 →
   0,028 yfir fimm threp). Sterkasta profid thvi thad tengir HNITIN vid
   xG-TOLURNAR — tvaer oskyldar staerdir ur sama svari.
2. **VITASPYRNUR** a x 11,5 og y 50,00 nakvaemlega.
3. **TEIGURINN**: 99,5% innan teiknadrar breiddar.
Fimm stokkbreytingar felldar, thar a medal **ESPN-kvardavillan sjalf**
(x × 2 → vitapunkturinn faerist i 23,0 og profid fellur) og oxul-vixl.

**HONNUN SEM ER MAELD, EKKI VALIN:**
- **Radius = √xG**, ekki xG. Flatarmal kulunnar er tha i hlutfalli vid xG;
  annars lita 0,50 og 0,25 ut eins og fjorfaldur munur.
- **Storu kulurnar teiknast UNDIR theim litlu** svo smau punktarnir hverfi ekki.
- **Leikmadur AN skota fær EKKERT kort.** Tomur vollur les eins og "skaut
  aldrei" en thydir "engin gogn" — sama regla og null-ekki-null (6i).
  197 utivallarmenn og nanast allir markmenn fa thvi ekkert kort, og thad
  er RETT. (Fjorir markmenn EIGA skot — hornspyrnur i uppbotartima.)

**EITT UTLAGA-SKOT AF 7.105** (0,01%) er xG 0,694 ur 30 einingum. Thad er
`fast-break`, og opid mark ur 31 m a skyndisokn ER haakt xG — thad er
EKKI lagfaert. Ad "laga" raungogn vaeri ad finna upp gogn.

**HEATMAP ER EKKI HAEGT OG VERDUR ThAD EKKI.** `average_positions` gefur
EINN medalpunkt per leikmann per leik (~15 radir per lidshluta, `n` =
snertingar), ekki thettleika-net. Ekkert i BSD ber snerti-hnit, svo
"hvar hann spilar" er ekki leidanlegt. Medalstada MA birta sem punkt —
en hun heitir thad tha, ekki heatmap. Skot-thettleiki ER hins vegar
raunverulegur og er thad sem kortid synir.

---

## 6t. UTLITS-YFIRFERD OG THRJAR VILLUR (8.8.2026)

Beidni: *"villuprofadu, farðu yfir utlitid, komdu med tillogur"* — og svo
*"gerdu allt sem tharf"*. Allt her var MAELT i Chrome, ekki agiskad.

### VILLA 1: STIGATAFLAN HAFDI 20 VARANLEGA TOMA KASSA
`live_only`-dalkarnir lesa `_`-reiti (`_mo`, `_espn_shots`, `_fdr6`,
`_dc_hit_adj` …) sem eru settir saman ur SEX skram. Audgunin var adeins til a
EINUM stad — inni i `cook` i PlayerList.jsx. Stigataflan fekk hrat
`players.json` og thvi:

| flokkur | tomir kassar |
|---|---|
| Ogn | **8 af 8** |
| Leikir framundan | **5 af 5** |
| Jofnudur (Aron) | **4 af 4** |
| Grunnur / Sokn / Vorn | 1 hver |

Thrir HEILIR flokkar sogdu "No numbers" i hverjum kassa. Talan var ekki bilud
og skrain ekki tom; formulan var einfaldlega ekki til nema a einum stad — sama
aett af villu og daudi markadslidurinn (kafli 3) og daudi `team_dc` (6l).

**Audgunin er nu `makeEnricher` i `src/stats.js`** og BADIR lesmatarnir nota
hana. Maelt eftir: audgunin fyllir **16 live_only dalka sem hra rod skilar
tomum (3 -> 19 af 20)**, og stigataflan sýnir **0 toma kassa**.

**TOMIR DALKAR ERU LEIDDIR UT, EKKI TALDIR UPP.** Sumt getur ekki fyllst fyrr
en seinna (Jofnudur krefst loknar umferdar, BSD krefst sins timabils), svo
reglan er ALMENN: dalkur sem enginn hefur gildi i birtist ekki, og flokkur sem
er thannig alveg tomur faer engan hnapp. Talan er sogd i fotnotu ("30 stats are
not shown …"). Upptalning med nafni hefdi stadnad vid fyrstu vidbot.

**TVEIR VORDUR, OG THEIR MAELA SITT HVAD:**
`stats.test.mjs` kafli 14 maelir FORMULUNA (fyllir `makeEnricher` dalkana?) —
og hann maelir thad sem **DELTA**, ekki sem upptalningu: fyrsta utgafa profsins
krafdist thess ad hrat `players.json` gaefi ENGAN live_only dalk og var RONG,
thvi `pen_order`/`fk_order`/`ck_order` eru live_only af thvi ad thau eru
RÖÐ DAGSINS en lesa vanaleg FPL-svid.
`playerlist-live-cols.mjs` kafli 3 maelir TENGINGUNA (skilar App.jsx skránum
til stigatoflunnar?). Stokkbreyting profud: `imminent=`/`fixtures=` fjarlaegd
ur `<Leaderboard>` -> Ogn-flokkurinn horfinn -> profid fellur.

### `cook` KEYRIR FJORUM SINNUM VID HLEDSLU — MAELT, OG **EKKI** LAGAD
Maelt fyrir: **63 + 28 + 14 + 15 ms**. Maelt eftir ad audgunin var flutt i
sitt eigid memo: **43 + 30 + 14 + 15 ms** — thad er EKKERT SEM MUNAR, og thad
er rett greint svona: keyrslurnar eru fjorar af thvi ad gagnaskrarnar LENDA
FJORUM SINNUM (imminent, shots, defcon, consistency/bsd koma hver i sinu
`fetch`). Audgunin VERDUR ad endurreiknast thegar inntak hennar kemur, og
`cook` verdur ad beita henni aftur. Memo-skiptingin fjarlaegdi thvi ekki
keyrslurnar — hun gerdi audgunina SAMNYTANLEGA, sem var raunverulega
tilgangurinn (villa 1).

**AD SKIPTA AUDGUNINNI I TVO LOG** (dyru nafna-uppfletti-toflurnar ohad
timabili, odyru timabils-lykluðu uppflettingarnar per kall) myndi gera
timabils-skipti odyrari — `season` er i deps og dregur thvi nafna-porunina med
ser. **EKKI GERT**: 30 ms sem notandinn getur ekki greint, a modi thvi ad
kljufa fall sem tveir lesmatar deila. Talan er skrad her svo naesti madur
thurfi ekki ad maela hana upp a nytt.

**ATH VID KAFLA 6i:** talan thar (1,6–2,2 ms fyrir `cook`) er STÖDNUÐ. Hun var
rett thegar hun var maeld, en sidan hafa ESPN-ogn, byrjunar-likur, DC-hittni,
Aron-studull og BSD allt lagst vid. **Raunveruleg tala i dag: 7–15 ms i
jafnvaegi, 30–45 ms i fyrstu keyrslu.**

### VILLA 3: THRIR TOMIR REITIR A LEIKMANNASPJALDI
I forleik eru stig, stig/leik og bonus OLL "—/not started", svo thrir af sex
reitum baru enga upplysingu og rodin brotnadi i **5+1** (einn einmana reitur a
naestu linu). Sameinadir i einn reit. **HEITIN ERU HIN SOMU** — fyrsta utgafan
skrifadi "Points, pts/match, bonus" og tapadi nakvaemu heitunum; kafli 6 i
`smoke.test.mjs` felldi thad og gerdi RETT.

### UTLIT: 51% AF SKJANUM VAR UMGJORD
MAELT: **415 px af 813** foru i umgjord adur en fyrsta gagnarodin byrjadi —
11 radir synilegar. Og kassinn var `min(66vh, 620px)`, svo BOTNINN hans la
**140 px UNDIR skjanum**: tvo skrun-svaedi ofan i hvort annad, thar sem
mus-hjolid gerdi sitt hvad eftir thvi hvar bendillinn var.

| lagfaering | sparnadur |
|---|---|
| tveir bordar -> EIN lina med "why?"-rofa | 80 px |
| GW-strikid (38 kassar) i samanbrot | 44 px |
| throskuldur inn i siu-rodina (hann ER sia) | 26 px |
| **taflan fyllir thad sem eftir er af skjanum** | einn skrun-gluggi |

**Maelt eftir: 324 px umgjord (40%), botninn 7 px OFAN vid skjabrun, 13 radir
— og 17 i thettum radir.** GW-strikid opnast SJALFKRAFA um leid og bil er
valid, og "GW 30–38"-merkid og "whole season"-hnappurinn stada afram thott
strikid se lokad: valid ma aldrei vera falid fyrir theim sem valdi thad.

**BYGGINGA-HAMURINN: valarinn er nu LOKADUR sjalfgefid thegar dalkar eru
thegar valdir.** Maelt: med hann opinn byrjadi taflan i **974 px a 813 px
skja** — hun var ALVEG utan skjas og notandinn sa engan leikmann. Sa sem kemur
til baka med dalka i vali vill sja TOFLUNA; sa sem hefur enga VERDUR ad velja
fyrst, svo sjalfgefna stadan er LEIDD UT UR `keys.length`.

### HITAKORT — STAERSTI LAESILEIKA-ABATINN
Hundrad dalkar af einslitum grattonum tolum eru laesilegir en EKKI
SKANNANLEGIR: til ad sja hver er godur i xGI/90 tharf madur ad rada eftir
honum, sem thydir ad madur getur adeins skodad einn i einu. Lida-flipinn i
thessu sama appi litar sinar tolur og er miklu fljotlesnari.

Thrennt asett:
1. **KVARDINN ER INNAN SIADA HOPSINS**, ekki allra 573. Ef notandinn siar a
   varnarmenn undir 5,0 er spurningin "hver er bestur AF THESSUM".
2. **P10–P90, ekki min-max.** Haaland i xG gerir min-max kvarda thannig ad
   allir adrir liggja i sama tonn.
3. **`hi === false` SNYR KVARDANUM** (Verd, Min/framlag, GC) — annars vaeri
   sterkasti graeni liturinn a VERSTA manninum, sama villa sem
   `compare-visual.mjs` ver gegn i samanburdinum.

**BONDIN VORU THRENGD EFTIR SKJA-PROFUN:** fyrsta utgafan litadi allt fra 0,55
upp / 0,45 nidur = **90% af hverjum dalki**, og taflan vard graen-raud flis thar
sem tonarnir hættu ad benda a nokkud. Nu efsti og nedsti FJORDUNGUR, midjan
helmingurinn olitadur — liturinn thydir "thetta er utgildi". Fostu dalkarnir
(Verd, Stig/Eign) eru litadir LIKA: tveir olitadir dalkar innan um litada las
eins og villa, ekki eins og akvordun.

### TVENNT SMATT SEM VAR MAELT
- **STADAN SEM LITADUR TEXTI, EKKI 5 PX DEPILL.** Depillinn krafdist thess ad
  madur VISSI litakodann; "MID" i sama lit segir thad sjalft og kostar 17 px
  af 200.
- **HEITA-AREKSTUR I STIGATOFLUNNI.** Stodu-fliparnir hetu "Defence" og
  "Attack" — NAKVAEMLEGA somu ord og tolu-flokkarnir i rodinni beint fyrir
  nedan, med allt adra merkingu. Nu GK/DEF/MID/FWD, sama skammstofun sem
  leikmannataflan notar.
- **Thettar radir** (26 px) og hitakort vistast i `fpl_dense`/`fpl_heat`.
  Myndin er falin i thettum radum: hun er 25 px ha og passar ekki i 26.

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

**EFTIRSTÖÐVARNAR — LAGAÐAR 29.7.2026.** `marketDiff` lét töfluna lesa of
bjartsýnt (~1,4pp þegar hér var komið, upphaflega 2,4pp). Rótin var EKKI í
væntu mörkunum: `MARKET_CALIB` mælist rétt innan 0,8%. Skekkjan var í affina
fallinu sem ræður **hvar taflan er lesin**:

    marketDiff(xga) = A + (xga − 0,5) · B      A: 1,00 -> 1,05 · B: 1,55 -> 1,65

Ástæðan fyrir að þetta var ekki lagað fyrr — fittið lenti á grid-jaðrinum —
var **leyst með því að stækka gridið**: A 0,60–1,60 · B 1,00–2,40, og besta
gildið er nú INNI í því. Fittað gegn raunverulegum úrslitum (Brier á birta
CS%-inu), 11.400 lið-leikir með markaðslínu, 15 tímabil:

| mæling | fyrir | eftir |
|---|---|---|
| kvörðunarhalli | +0,89pp | **−0,71pp** |
| meðalfrávik (tíundarhlutar) | 2,69pp | **1,75pp** |
| Brier | 0,18534 | **0,18495** |
| vörður í walkforward kafla 9 | ~1,4pp | **0,2pp** |

LOSO: A 0,95–1,10 · B 1,60–1,80, og 1,05/1,65 er jafnframt tíðasta LOSO-valið.
Brier batnar **út fyrir úrtak í 12/15 tímabilum**.

**AÐGREINING HAGGAST EKKI — OG ÞAÐ ER EKKI TILVILJUN:** affin einhalla
umbreyting breytir ENGRI röðun, svo r og AUC *geta* ekki haggast. Mælt til að
vera viss: r(d,ga) 0,39219 -> 0,39176, r(d,cs) −0,25919 -> −0,25991 (fjórði
tugstafur = rounding). Þetta er KVÖRÐUN, ekki aðgreining — sama tegund
lagfæringar sem `SCALE_FIX` var. Meðal-d fer 2,41 -> 2,55, sem er einmitt
miðja MEASURED-töflunnar.

**VÖRÐUR SEM HEFÐI ÞAGAÐ:** `ffdr-walkforward.mjs` reiknaði andhverfu
`marketDiff` með **harðkóðuðum** föstum (1,0 / 1,55). Eftir endurfittun hefði
sá vörður mælt annan kvarða en appið keyrir OG VIRST GRÆNN. Fastarnir eru nú
`MARKET_DIFF_A/B`, fluttir út úr `market.js`, og prófið les þá þaðan.

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

**FIT GEGN FFDR — MÆLT 29.7.2026 OG HAFNAÐ. EKKI ÓAFGREITT LENGUR.**
Handoff-ið sagði að `FIT` (`src/App.jsx`, `fdr:−0,597` fyrir GK o.s.frv.) væri
fittað gegn **hráu FDR** og að skipta FFDR inn án endurfits setti vog af einum
kvarða á annan. Það var RÉTT en **óveruleg** athugasemd, og hér er mælingin.

Skriftin sem „vantaði í repo-ið“ var skrifuð og fittið gert almennilega:
**85.646 sýnishorn, 5 tímabil, LOSO, per stöðu** — `FIT` sjálft var fittað á
EINU tímabili og EINUM split (GW6–20 -> GW21–33).

| MAE (lægra betra) | FFDR | hrátt FDR | ekkert |
|---|---|---|---|
| GK | 2,512 | 2,516 | **2,481** |
| DEF | 3,963 | 3,951 | **3,947** |
| MID | 3,814 | **3,806** | 3,814 |
| FWD | 4,223 | **4,222** | 4,223 |

| ákvörðun: raunstig topp-N innan stöðu | topp-3 | topp-5 | topp-10 |
|---|---|---|---|
| FFDR | **19,816** | 18,875 | 17,321 |
| hrátt FDR | 19,807 | **18,895** | **17,370** |
| ekkert | 19,748 | 18,729 | 17,218 |

**Leikja-liðurinn í heild er verður ~0,1 stig af ~19, og FFDR gegn FDR er
hnífjafnt** — hrátt FDR er meira að segja örlítið á undan á topp-5 og topp-10.
Kvarðamálið er þar með óvirkt í reynd: vogin sem það snýr að er nánast núll.
Að skipta væri hreyfing án mælanlegs ábata.

**ORSÖKIN MÆLD** — meðaltal yfir marga leiki þvær liðinn út, og MJÖG ólíkt
fyrir FFDR og FDR:

| sjóndeildarhringur | sd(meðal-FFDR) | sd(meðal-FDR) |
|---|---|---|
| 1 umferð | 0,727 | 0,983 |
| 5 umferðir | 0,501 | 0,396 |
| 8 umferðir | 0,481 | **0,296** |

FFDR heldur tveimur þriðju af breytileika sínum út í 8 umferðir; FDR tapar
70%. Það er raunverulegur punktur í vil FFDR — en hann breytir ekki
ÁKVÖRÐUNUM hér, því stig næstu 5 umferða eru ráðin af MÍNÚTUM. Merkið per
leik er ósvikið (r −0,275 fyrir DEF á einni umferð, kafli 3); það er
samlagningin sem drepur það.

**Niðurstaða: lokað sem MÆLT-OG-HAFNAÐ.** `rankScore` (kafli 3, `RANK_W`) er
það sem RAÐAR tillögum og það notar FFDR beint á einni umferð, þar sem merkið
er. `FIT` heldur sínum vogtölum.

### Annað

1. **`/fixtures/lineups` — staðfest byrjunarlið. BYGGT 31.7.2026.**
   `fetchLineups()` í `scripts/fetch.mjs` -> `data/lineups.json`, kallað úr
   **`--fast`** (30 mín) — EKKI daglegu keyrslunni, sem gengur kl. 05 UTC
   meðan leikir byrja 12–19 UTC. Glugginn er leikur innan 2 klst eða
   nýbyrjaður; utan hans 0–1 kall.
   **Tvö köll per leikdags-lotu, ekki eitt:** FPL-fixture-id og
   API-Sports-fixture-id eru ÖNNUR NÚMER, svo `/fixtures?league=39&date=`
   kemur fyrst og er parað eftir liðum. ~11 köll á leikdegi af 100.
   **HEIMILDIN ER STAÐFEST — MÆLT Í ACTIONS 31.7.2026.** Hún var óstaðfest
   þegar þetta var byggt: `API_SPORTS_KEY` er aðeins í GitHub Secrets, svo
   `curl` héðan skilar `{"errors":{"token":"Missing application key"}}` (prófað
   af BÁÐUM). Svarið kom með því að ræsa `fetch-fast` í Actions, þar sem
   lykillinn ER:

       API-Sports /fixtures/lineups RANNSOKN: http=200 results=2 errors=[]
       lyklar=["team","coach","formation","startXI","substitutes"]
       team="Burnley" formation="5-4-1" startXI=11 substitutes=9
       player0={"id":162489,"name":"J. Trafford","number":1,"pos":"G","grid":"1:1"}

   Fría þrepið **LEYFIR** endapunktinn (`errors=[]`, engin plan-villa) og
   sniðið er nú **mælt, ekki tekið úr skjölun**.

   **NÖFNIN ERU SKAMMSTÖFUÐ: „J. Trafford“, ekki „James Trafford“.** Pörunin
   virkar því hún endurnýtir `"F. Eftirnafn"`-lykilinn úr `fetchInjuries` — en
   fyrsta útgáfa prófsins notaði FULL nöfn og staðfesti þar með snið sem
   API-ið sendir aldrei. Það var heppni, ekki mæling; prófið notar nú
   raunverulega sniðið.

   **TVÆR VILLUR FUNDUST VIÐ AÐ RÆSA ÞETTA, HVORUG MEÐ LESTRI:**
   (a) fallið var fyrst aðeins kallað úr daglegu keyrslunni (05 UTC) meðan
   leikir byrja 12–19 UTC — glugginn hefði nánast aldrei opnast;
   (b) `fetch-fast.yml` hafði **engan `env`-blokk**, svo `FLAGS.apisports` var
   false og fallið var sleppt þegjandi. Prófið „er fetchLineups kallað úr
   fetchFast?“ var grænt allan tímann því það les KÓÐA, ekki workflow-ið.
   Vörður í `tests/workflow-push.mjs` ber nú saman kóðann OG workflowið.
   Prófað í `tests/lineups.mjs` (29 próf) á **hermdum svörum í skjalfestu
   v3-sniði**, þar á meðal öll bilunartilvikin: þrep lokað, óvænt snið,
   engin pörun, rate-limit. Vörður fylgir um að fallið sé kallað úr
   `fetchFast` — fyrsta útgáfan mín tengdi það aðeins við daglegu keyrsluna
   og hefði verið **dautt kóði sem virtist virka**.
2. `/players?league=39&season=` — ítarlegri tölur (skot, lykilsendingar,
   einvígi, einkunn). Líklega læst eins og meiðslin; kostar 1 kall að prófa.
3. `/predictions`, `/odds` — **ekki þess virði**: við höfum bókmakera-línu og
   Elo *mæld* inn í FFDR. Ómæld spá færi aldrei í líkanið, aðeins í birtingu.
4. **Samanburðartaflan „í ár vs. í fyrra“** er byggð og villuvarin en hefur
   **aldrei keyrt** — hún kviknar fyrst þegar GW1 klárast. Skoða þá.
5. Hugmynd sem notandi hefur ekki beðið um: mjókka hægri hliðarstiku
   (320 → ~290 px) ef völlurinn má stækka enn meira.

---

## 7b. TUNGUMÁL — TVÆR VILLUR Í VERÐINUM SEM PRÓFIÐ FANN EKKI (31.7.)

> **SÖGULEGT — TUNGUMÁLALAGIÐ ER FARIÐ (7.8.2026).** Appið er enskt og
> bara enskt; `tx()`, orðabókin og IS/EN-hnappurinn voru fjarlægð. Sjá
> kafla 8d. Kaflinn stendur eftir því **lærdómurinn** í honum gildir enn:
> AST-próf sér ekki það sem er á skjánum, og ASCII-íslenska sleppur í
> gegnum stafa-skynjun. Það er nákvæmlega vandinn sem
> `tests/no-icelandic.mjs` erfir.

`tests/i18n.mjs` var grænt og samt var enska viðmótið hálf-íslenskt á fjórum
flipum. Fundið með því að **KEYRA appið á ensku í Chrome og leita að þ/ð/æ í
DOM-inu** — 14 strengir. Tvær villur í prófinu sjálfu:

1. **`inCall(p, "tx")` spurði „er strengurinn EINHVERS STAÐAR inni í
   tx()-kalli?“** Það er allt annað en „er hann LYKILLINN?“. Með því slapp
   `tx("✈ {0} ferðast {1} km{2}", [a, b, langt ? " (langferð)" : ""])`:
   sniðmátið er þýtt en íslenski búturinn sem er settur INN í það er það ekki.
   Viðmótið birti **„travel 359 km (langferð)“** — hálf-þýtt, sem er verra en
   óþýtt því það lítur út eins og villa. Nú er spurt `isTxKey` = `arguments[0]`.
2. **`TemplateElement`-greinin notaði `EXEMPT.some(e => v.includes(e))`** og
   `EXEMPT` inniheldur stöku stafina `"ð"`, `"þ"`, `"æ"` (fyrir translit-töfluna
   í `stats.js`). Þar með slapp **sérhver** íslenskur sniðmáts-strengur, því
   nær allir innihalda ð. Kafli 5 var nánast óvirkur fyrir template-strengi.
   Nú er nákvæm samsvörun (`EXEMPT.includes(v.trim())`).

Lagað: fimm strengir splittaðir í **heilar setningar** í stað sniðmáts + búts
(ferðalengd ×2, róterings-hætta) og enskar þýðingar bættar við.

### ÞAÐ SEM EFTIR STENDUR OG ER *EKKI* KÓÐI — MÖRK SEM ER RÉTT AÐ ÞEKKJA
Níu strengir eru enn íslenskir á ensku, og **allir níu koma úr GÖGNUNUM**:
`status.json`-nóturnar (`record(...)` í `fetch.mjs`) og `last_gw.json.note`.
Dæmi: „engir leikdagar innan frí-þreps gluggans (±1 dagur)“, „64 löng ferðalög
(>300 km)“, „0 auðar, 0 tvöfaldar“.

`tx()` getur ekki hjálpað: þetta er prósa með innfelldum tölum sem pipeline
skrifar, ekki strengir í kóða. Rétta lausnin væri að `record()` skrifaði
**skipulögð svið** (kóði + tölur) og appið byggði setninguna — það er ~20+
kallstaðir í `fetch.mjs`. **EKKI GERT**: þetta er hliðarstiku-greining og ein
upplýsinga-lína, og breytingin er breið og áhættusöm fyrir snyrti-ábata.
**AST-prófið NÁIR ALDREI ÞESSU** — það les kóða, ekki DOM. Eina leiðin til að
finna þetta er að keyra appið á ensku og skoða, eins og var gert hér.

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
- **LYKLABORÐS-FÓKUS VAR ENGINN — lagað 31.7.2026** (`src/styles.css`).
  Mælt í Chrome: `document.activeElement` með `outlineStyle: "none"`.
  Nokkrir reitir bera `outline:"none"` **inline** (`urlInput`, `search`,
  `capSel`, `chipSel`, `costIn`) til að fela sjálfgefna hringinn, svo það
  var **engin** fókus-vísbending í öllu appinu. Þrennt í lausninni og
  hvert um sig þarf að haldast: `:focus-visible` (ekki `:focus`) svo
  músarnotandi fái ekkert nýtt suð · `currentColor` í stað fasts litar,
  því appið hefur bæði ljósa hnappa með dökkum texta og dökkfjólubláa með
  hvítum — fastur litur hyrfi á öðrum þeirra · **negatíft** `outline-offset`
  svo hringurinn sé INNAN reitsins, því `langWrap` og leikmannalistinn nota
  `overflow:hidden` og ytri hringur var klipptur. Staðfest sjónrænt á
  fjórum tilfellum: ljós hnappur, dökkur hnappur, reitur með inline
  `outline:none`, og klippandi umgjörð.

---

## 8b. TUNGUMÁL — enskur hnappur í hausnum (30.7.2026)

> **SÖGULEGT — allt í þessum kafla var tekið út 7.8.2026 (sjá 8d).**
> Geymt af tveimur ástæðum: `tx`-gegn-`t` áreksturinn endurtók sig
> orðrétt þegar `interp` hét fyrst `fmt`, og lista-hlutinn skýrir hvers
> vegna sumir strengir eru enskir hvort sem er (xG, BPS, chip-heiti).

`IS | EN` í hausnum (`LangToggle` í `App.jsx`). Valið vistast í
`localStorage` undir `fpl_lang` og `<html lang>` + flipa-titill fylgja.
**Íslenska er sjálfgefin og getur ekki brostið** (sjá lykla-regluna).

### ÍSLENSKI FRUMTEXTINN ER LYKILLINN — ekki `nav.planner`

`src/i18n.js` er hreint (ekkert React) og `src/i18n-en.js` er orðabókin:
`{ "Bekkur": "Bench" }`. Abstrakt lyklar hefðu krafist þess að hver af
**933** strengjum færi í tvö skjöl og hver ósamstæður lykill (`nav.planer`)
hefði birt lykilinn sjálfan í viðmótinu. Með frumtextann sem lykil skilar
`t()` lyklinum þegar þýðingu vantar — íslenskan er því alltaf rétt og eina
sem getur brostið er þýðingin, sem **prófið finnur** (`tests/i18n.mjs`).

### FJÖGUR ATRIÐI SEM KOSTUÐU TÍMA — ekki endurtaka

1. **Kallið heitir `tx()`, EKKI `t()`.** `t` er upptekið í þessu repo-i sem
   lið/þrep — **51 staðbundin binding** (`.map(t => ...)`, `TIER_NAME[t]`).
   Fyrsta útfærslan notaði `t()` og **95 köll lentu í skugga** af
   staðbundnu `t` og hefðu kastað `TypeError` í keyrslu. Að endurnefna 51
   staðbundna breytu var stærri og hættulegri breyting en að flytja inn
   undir öðru nafni. Vörður: kafli 5 í prófinu.
2. **Töflur á einingarsviði verða að vera LAZY.** `STAT_DEFS`,
   `STAT_GROUPS`, `CHIPS`, `EXPLAIN_IS`, `ROWS`, `SP_KINDS` og `ZONE_IS`
   eru reiknaðar EINU SINNI við innflutning — `label: tx("Stig")` hefði
   frosið á því tungumáli sem var valið þá. Þær nota því **getter**
   (`get label() { return tx("Stig"); }`), 211 talsins. Vörður: kafli 7.
3. **`lang` er í HVERJUM `useMemo`/`useCallback` dep-lista** (62 talsins,
   `useLang()` gefur hann). Dep-listi breytist ekki þótt `LANG` breytist,
   svo vistað gildi sem BER texta yrði stöðugt eftir tungumálsskipti.
   `useEffect` fékk hann VILJANDI EKKI — það hefði endursótt öll `data/`.
4. **ASCII-íslenska er ósýnileg fyrir stafa-skynjun.** Leitin að
   þýðanlegum strengjum fann `þðæö` sjálfkrafa, en „Grunnur", „Hreinsa",
   „Yfirlit", „laugardagur", „lau" og „Utan teigs" hafa enga broddstafi og
   sluppu. Þeir fundust á **skjánum**, ekki í kóðanum. Ef nýr texti er
   settur inn: prófið skannar `þðæö` sjálfkrafa, en ASCII-íslenska þarf
   **auga** — eða keyrðu appið á ensku og lestu það.

**Samhengis-lyklar:** `"M|mörk"` birtist sem `M` á íslensku og `G` á ensku.
Til af því að `M` er **homógraf** — Mörk í skotatöflunni, Miðja í
stöðutöflunni — og einn lykill getur ekki haft tvær þýðingar. Notaðu þetta
sparlega; það var þörf á því á einum stað.

### ÞAÐ SEM ER VILJANDI ÓÞÝTT
- **Stat-skammstafanir** (xG, xA, xGI, BPS, ICT, DC, CS) og **chip-heiti**
  (Wildcard, Free Hit, Bench Boost, Triple Captain) — þau eru ensk þegar og
  FPL-notendur þekkja þau nákvæmlega svona.
- **Skilaboð til forritara** (`console.warn`, `new Error`) — ekki viðmót.
- **STATUS-NÓTUR ÚR PIPELINE.** `data/status.json` og `last_gw.json` bera
  íslenskan texta sem `scripts/fetch.mjs` skrifar („bíður tímabils — E0
  2026/27 verður til við fyrstu umferð"). Þær birtast **áfram á íslensku**
  undir *Data sources* og í umferðar-skýrslunni. Að þýða þær er ekki
  strengja-verk heldur endurhönnun á `record(...)` í 2.714-línu skriftu sem
  keyrir mannlaus — það á að vera sér lota með sinni eigin mælingu.
- **Tölur eru ekki sniðnar per tungumál.** Appið notar `toFixed` (punktur)
  þegar, svo enskan er þegar rétt; íslensku kommurnar í PRÓSA („2,89×")
  eru skrifaðar með punkti í þýðingunni sjálfri. Eina staðar-næma tala er
  `toLocaleString(getLang())` í `Leaderboard.jsx` (65.557 / 65,557).

---

## 8c. VILLUVÖRN — hvíti skjárinn (31.7.2026)

`src/ErrorBoundary.jsx`, utan um `<App/>` í `main.jsx`. Áður: eitt óvænt
svið í render → React aftengir allt tréð → **hvítur skjár, engin skilaboð,
engin leið til baka**. Ekkert í appinu greip það, og appið les 25 skrár úr
sex heimildum sem pipeline skrifar daglega.

**MIKILVÆGARA EN KASSINN ER ÚTGANGAN.** `loadState` les `fpl_planner_v3`
úr localStorage og setur beint í state (`App.jsx` ~701). Sé blobbið óheilt
— skiptaáætlun úr eldri útgáfu, chip-lykill sem er ekki lengur til —
**hrynur appið við HVERJA hleðslu** og notandinn hefur enga leið til baka
nema devtools. Þess vegna er hnappurinn „Hreinsa vistaða plönun":

- **Tvístiga** (eyðir raunverulegri vinnu; einn smellur er of nærri).
- Hreinsar alla `fpl_*`-lykla — **valið yfir harðkóðaðan lista** svo nýr
  lykill (`fpl_planner_v4`) verði ekki útundan þegjandi.
- **HREINSAR ALDREI `fpl_lang`.** Sá sem hrundi á ensku verður að fá ensku
  aftur; annars kastast hann í íslensku ofan á hrunið og skilur ekki
  lengur hnappana. Vörður í prófinu — `localStorage.clear()` er einfaldari
  og fellur á honum.
- Villuskilaboðin sjálf eru **sýnd** (svo megi segja frá þeim) og
  component-stakkurinn er í `<details>`. Skilaboðin eru **ekki þýdd**: þau
  koma úr JS-vixlinum og eru villuskilaboð, ekki viðmótstexti.

**Grípur EKKI async-villur** (fetch) — þær eru þegar meðhöndlaðar í
`dataState`, sem sýnir sinn eigin villukassa. Þetta er viljandi.

Prófað sjónrænt í Chrome með **raunverulegu** hruni (throw settur í
`Pitch.jsx`, kassinn birtist, throw fjarlægt aftur) — ekki aðeins í jsdom.
Vörður: `tests/error-boundary.mjs` (18), tvær stökkbreytingar prófaðar:
`localStorage.clear()` og hreinsun í einum smell. Báðar felldar.


---

## 8d. ENSKA EINGÖNGU — tungumálalagið tekið út (7.8.2026)

Notandinn bað um það: *„taktu út íslenskuna, höfum bara appið á ensku, það
flækir það að vera á íslensku líka. Taktu þá hnappinn IS/EN í burtu líka."*

**Farið:** `src/i18n.js`, `src/i18n-en.js` (1.023 lyklar), `src/useLang.js`,
`LangToggle`, `applyDocument()`, `tests/i18n.mjs`, `tests/i18n-dom.mjs`.
`<html lang>` er `en`. `fpl_lang` er nú **hreinsaður** af villuvörninni —
undantekningin sem verndaði hann (8c) sneri við um leið og hún hætti að eiga
við: lykillinn er dauður afgangur hjá þeim sem notuðu tvítyngdu útgáfuna.

**Eftir stendur `src/interp.js` — eitt fall.** 93 setningar eru byggðar með
sniðmáti (`"£{0}m short — transfer too expensive"`) og orðaröðin er hluti af
setningunni; samskeyting hefði verið 93 handbreytingar með raunverulegri hættu
á týndu bili. **Fyrsta heitið `fmt` rakst á staðbundna talnasniðgerð í
`GwReport.jsx`** og byggingin féll strax — sama gildran og `t` gegn `tx` var
(8b). `interp` var valið **mælt**: það kemur hvergi fyrir í `src/`, `tests/`
né `scripts/`.

**UMRITUNIN VAR VÉLRÆN.** Babel-AST fann hvert `tx()`-kall og skipti því út
fyrir enska strenginn úr orðabókinni — innst fyrst, endurtekið, svo hreiðruð
köll leystust rétt. **1.048 stöðug köll + 96 með stikum = 1.144. Enginn lykill
vantaði.** 24 köll flettu upp í töflum (`TIER_NAME`, `POS_LABEL`, `POS_TABS`);
þær voru þýddar sjálfar og hjúpurinn tekinn af.

**SÖNNUNIN — þetta er aðalatriðið.** DOM-mynd af öllu appinu (allir flipar,
undirflipar, leikmannaspjald, róterings-spjald, FFDR-tafla, chips) var tekin
**á ensku FYRIR** breytinguna og aftur **EFTIR**, með nákvæmlega sömu vélinni:

| | stafir |
|---|---|
| fyrir | 832.812 |
| eftir | 830.060 |
| munur | 5 strengir × 64 söfnun = **IS/EN-hnappurinn, ekkert annað** |

### `tests/no-icelandic.mjs` kemur í stað beggja gömlu safnanna
Spurningin er önnur núna — ekki „er þýðingin til?" heldur **„komst íslenska
að?"**. Þrír kaflar: (A) enginn íslenskur stafur í DOM-inum nema hann komi
**úr `data/`** (nöfn og pipeline-nótur, fjarlægðar sem **undirstrengir**, ekki
orð); (B) engin ófyllt stika, ekkert `undefined`/`NaN`; (C) **ASCII-ÍSLENSKA**.

**Kafli C er þar af því að kafli A GETUR EKKI séð „Yfirlit", „Grunnur" eða
„laugardagur".** Meðan appið var tvítyngt fann IS/EN-samanburðurinn þær, og sá
samanburður fór með hinu málinu. **Listinn (52 orðmyndir) getur staðnað og það
er sagt berum orðum í skjalinu** — hann er byggður á **því sem raunverulega
lak 31.7.** Orð með enskri merkingu (`lid`, `min`, `man`, `mid`, `sun`) eru
**viljandi utan hans**; þau myndu fella prófið á réttum enskum texta og þá
væri það slökkt innan viku.
**Fjórar stökkbreytingar prófaðar** — broddstafir, ASCII-íslenska, sprautaður
bútur í sniðmát, ófyllt stika — og allar fjórar felldu prófið.

**Tvennt í öðrum söfnum var EKKI bara endurnefning:**
1. „sl. tímabil" og prósan „fyrra tímabil" þýddust **báðar** í `last season`,
   svo heildarleitin féll á réttum texta. Vörðurinn er nú bundinn við
   **dálkahausana**, sem var alltaf tilgangur hans.
2. Verðlaun í einka-deildum eru nú `en-GB`-sniðin (`5,000` í stað `5.000`).

**Það sem er enn íslenskt og á að vera það:** `status.json`- og
`last_gw.json`-nóturnar sem `record(...)` skrifar. Þær eru **gögn**, ekki
viðmót, og að þýða þær er endurhönnun á ~20 kallstöðum í 3.000-línu skriftu
sem keyrir mannlaus (sjá 7b). Kafli A í nýja prófinu leyfir þær beinlínis.

---

## 8e. LIÐA-TÖLUR — nýr flipi „Teams" (8.8.2026)

Beðið var um dálk sem sýnir **hvernig liðin sjálf spila** — xG, xGC, skot á
sig, „big chances" á sig, langskot á sig — til dæmis við val á markverði.

`src/teamstats.js` (hreint) + `src/Teams.jsx` (birting eingöngu), sömu skiptingu
og `model.js`/`stats.js`. **Sér flipi en ekki dálkar í leikmannalistanum:**
röðin er LIÐIÐ, og að hengja 20 liða-tölur á 572 leikmenn væri að endurtaka
sömu tuttugu raðirnar 28 sinnum hverja.

### BIG CHANCES ERU EKKI Í ÞESSARI TÖFLU — ENN
Svæðin hér koma úr **ESPN**, sem gefur staðsetningu hvers skots en **enga
xG-tölu** fyrir það, svo ekkert hér getur greint gott færi frá vonarskoti.
Það sem ESPN-gögnin leyfa er **nærfæri á sig** — skot úr markteig, talin af
ESPN sjálfu. Skyld tala en ekki sama talan, og hún ber því sitt rétta nafn.
Vörður: kafli 6 í `tests/team-stats.mjs` fellur ef dálkur fer að heita það.

**LEIÐRÉTT 8.8.2026 — ÞÆR ERU EKKI ÓFÁANLEGAR LENGUR.** Fyrsta útgáfa þessa
kafla sagði „engin náanleg heimild gefur xG per skot". Það var rétt meðan ESPN
var eina skot-heimildin, en **BSD (kafli 6t) gefur per-skot xG í öllum 380
leikjum 2025/26 OG raunverulegt liðs-svið `big_chances`** í
`/events/{id}/stats/` (0–8 per lið-leik, mælt). „Big chances á sig" er þá
**bein talning** — talan hjá mótherjanum í hverjum leik — ekki afleiðsla.
Tvennt vantar áður en hún fer inn: (a) eigin sókn á liðs-`/stats/`-endapunktinn
(`bsd_players.json` er per LEIKMANN og ber hana ekki), og (b) að BSD nær yfir
**eitt tímabil**, svo dálkurinn væri tómur í öllum öðrum.
**Viðmótstexti sem segir „ófáanlegt" er nú rangur og var lagfærður** — hann
stangaðist beinlínis á við `Big chances (derived)`-dálkinn sem er þegar í
leikmannalistanum.

### BSD NÆR YFIR EITT TÍMABIL — ENDURMÆLT 8.8.2026 OG STAÐFEST
Beðið var um að sækja BSD fyrir fleiri tímabil. **Gögnin eru ekki til.** BSD
skráir **35 tímabil** af ensku úrvalsdeildinni en skotakortið nær aðeins yfir
2025/26 (`season_id 337`). Mælt með **átta leikjum DREIFÐUM yfir hvert tímabil**
(ekki þremur fyrstu, sem hefðu getað verið byrjunar-skekkja):

| tímabil | skotakort | liðs-`big_chances` |
|---|---|---|
| 2024/25 | 0/8 | 0/8 |
| 2023/24 | 0/8 | 0/8 |
| 2021/22 | 0/8 | 0/8 |
| 2017/18 | 0/8 | 0/8 |

**Það er ekki aðeins skotakortið sem vantar heldur LÍKA liðs-sviðið
`big_chances`**, svo eldri tímabil eru ónothæf eftir *hvorri* leið sem er.

**TÓM KEYRSLA MÁ ALDREI ÞURRKA ÚT GÓÐ GÖGN — VILLA SEM VAR FUNDIN VIÐ ÞETTA.**
2026/27 (`season_id 1058`) er í BSD með 200 leiki, **alla `notstarted`**. Án
varðar hefði `node scripts/fetch-bsd-teams.mjs 1058` skrifað skrá með **núll
liðum ofan á heilt 2025/26** — og hún hefði litið út eins og mæling („engin big
chances"), nákvæmlega gildran sem kaflar 3 og 6n forðast. Skriftan deyr nú með
`exit 2` fremur en að skrifa tómt tímabil.

Skráin er samt **lykluð á tímabil** (`seasons: { "2025/26": … }`) og keyrsla
**sameinar** í stað þess að yfirskrifa, svo 2026/27 slæst inn við hliðina þegar
hún fer af stað. Efsta lagið speglar nýjasta tímabilið sem hefur gögn, svo
viðmótið og prófin haldast óbreytt. Tímabils-heitið er **sótt úr API-inu**, ekki
harðkóðað — „2025/26" var fast í skránni og hefði logið um leið og annað
tímabil væri sótt. Verðir: kafli 11 í `tests/team-stats.mjs`, tvær
stökkbreytingar felldar (vörðurinn fjarlægður, sameining gerð að yfirskrift).

### `data/team_shots.json` — ný heimild, sótt EINU SINNI
`scripts/fetch-team-shots.mjs` gengur um tímabilið dag fyrir dag (~660 köll:
einn scoreboard per dag + eitt summary per leik) og telur skot eftir **svæðis-
texta ESPN**, ekki hnitum — textinn er óháður kvarðanum (6b). **Ekki í daglegu
pipeline:** tímabil sem er lokið breytist ekki, svo skráin er skrifuð einu
sinni og committuð. Sjálfsmörk eru sleppt (skyttan tilheyrir röngu liði).

**KROSSPRÓFAÐ GEGN E0 — tvær óháðar heimildir um sama hlut:**

| | |
|---|---|
| lið í báðum skrám | 17 (hin þrjú féllu úr deildinni) |
| mesta frávik | **0,71 skot/leik** |
| meðalfrávik | −0,47 (skot) · −0,43 (á mark) |

ESPN telur **kerfisbundið ~3,5% færri — sama formerki í ÖLLUM liðum**, sem er
munur á heimildum (commentary sleppir hluta blokkaðra skota) en **ekki villa í
úrdrættinum**. Væri skekkjan handahófskennd — sum lið yfir, önnur undir — væri
úrdrátturinn að para skot við röng lið, sem er allt annað og miklu verra. Sá
vörður er kafli 3 í prófinu.
**Notið E0 fyrir MAGN og ESPN fyrir SVÆÐI.** 8,9% skota bera engan svæðis-texta
og teljast því aðeins í heildartölunni.

### xG/xGC ERU ÓFULLKOMIN OG ERU MERKT SEM SLÍK
`luck.json` leggur saman FPL-leikmannatölur og leikmenn sem fóru úr deildinni
eru fjarlægðir úr bootstrap — **~19% vantar** (`xg_incomplete: true`). Talan er
því kerfisbundið of lág: **berið hana saman MILLI liða, lesið hana ekki sem
absolút xG.** Dálkarnir bera `incomplete`-flagg og skýringin segir frá því.

### LÆGRA-ER-BETRA ER FORSENDA, EKKI SKRAUT
Fyrir allt sem lið fær **á sig** er hærri tala verri — **nema langskot**, því
þau eru ódýrustu skotin sem hægt er að gefa frá sér. Tafla sem litar hæstu
töluna græna í „skot á sig" segir notandanum að versta vörnin sé sú besta.
Sama regla og `compare-visual.mjs` ver (6j). Kafli 2 telur upp báða listana
**berum orðum** svo þeir brotni sýnilega ef einhver snýr þeim.

### NÝLIÐAR: NULL ER EKKI NÚLL
Coventry, Hull og Ipswich áttu enga röð í ensku úrvalsdeildinni í fyrra. Væri
`null` lesið sem 0 yrðu þeir með **núll skot á sig** og röðuðust efst í „besta
vörnin". Nöfnin í skýringunni eru **leidd út úr gögnunum**, ekki handskrifuð.
`tests/team-stats.mjs`: 35 próf, **fjórar stökkbreytingar prófaðar** (langskot
snúið við, null raðast fyrst, vantandi gildi verður 0, dálkur endurnefndur
„Big chances") og allar fjórar felldu prófið.

---

## 8f. FFDR — GRÆN RUNA FÆR RAMMA (8.8.2026)

Beðið var um: *„þegar það koma 3 leikir eða fleiri sem eru grænir, ramma það
inn með þunnum grænum ramma."*

`greenRuns(tiers, minLen = 3)` í **`model.js`** (ekki inni í `App.jsx`) af sömu
ástæðu og allt annað reiknað — prófin keyra sama kóðann. Runan svarar **annarri
spurningu en þrepið**: þrepið segir „er þessi leikur léttur?", runan segir „á
þetta lið gott PROGRAM?".

Tvær reglur sem eru ákvarðanir:
1. **Grænt = þrep UNDIR hlutlausu.** Hlutlaust er hlutlaust.
2. **AUÐ UMFERÐ SLÍTUR RUNU.** Blank er 0 stig og því þyngra en hvaða rauður
   leikur sem er (sama rök og `rotation.js`, 3d). **`null >= 2` er `false` í
   JS**, svo naív skilyrði hleypir auðri umferð í gegn — `!= null` er prófað
   sérstaklega.

**RÚMFRÆÐIN VAR VANDINN, EKKI REGLAN.** Taflan hafði `borderSpacing: 2`, svo
rammi teiknaður á hólfin hefði **slitnað** yfir hvert bil og lesist eins og
strikalína. Nú er `borderSpacing: 0` með **2px gagnsæjum ramma** á hverju hólfi:
rúmfræðin er sú sama (2+2 = bil milli hólfa) en brúnir næstliggjandi hólfa
**snertast**, svo ramminn verður samfelldur. `backgroundClip: "padding-box"`
heldur litfletinum innan við rammann. Bilið var **hækkað úr 1px í 2px að beiðni
notandans** — með 1px lásust hólfin í runu sem einn klumpur.

**Lykkjan var hert:** `i = j` eitt sér er óöruggt — verði ytra og innra
skilyrðið einhvern tíma ósamstæð er `j === i` og lykkjan snýst að eilífu. Það
**gerðist í raun** við stökkbreytingaprófun (`>=` á móti `>`) og **hengdi
prófakeyrsluna í stað þess að fella hana**. Nú `i = Math.max(j, i + 1)`.
Stökkbreytingar: þröskuldur 3→2, auð umferð brúar, rammi opinn — allar felldar.
*(Ein reyndist **jafngild stökkbreyting**: ytra skilyrðið er aðeins flýtileið,
innri lykkjan ræður niðurstöðunni, svo hún getur ekki breytt útkomu.)*

---

## 8g. ÞRENNT SMÁTT SEM VAR BEÐIÐ UM (8.8.2026)

- **`†`-merkið tekið af dálkaheitum.** „Afleidd tala" er skýring, ekki eitthvað
  sem maður les í hverri einustu hausröð; hún stendur áfram í tooltip-inu.
  **Plássið fór með:** dálkur sem heldur 7px fyrir tákn sem er ekki teiknað er
  of breiður að eilífu, og 60+ afleiddir dálkar gera það að raunverulegu skruni.
  `wOf` og vörðurinn í `stats.test.mjs` uppfærðir saman.
- **„Build your table" flæðir nú í dálka.** Valarinn var 210px kassi með
  `overflowY:auto` — maður **skrunaði til að sjá hvað væri í boði**, sem er
  öfugt við tilgang hans. `columns:"170px"` lætur efnið renna niður einn dálk og
  byrja efst í þeim næsta; fjöldi dálka er leiddur út úr breiddinni.
  `breakInside:"avoid"` er á **böndunum** (4–5 dálkar hvert), ekki flokkunum:
  Attack er 33 dálkar og kemst aldrei í einn dálk, svo vörður á flokknum yrði
  hunsaður hvort sem er. **Á síma helst skrunið** — þar er einn dálkur.
- **Föst leikatriði: sá sem tekur fleiri en eina tegund er feitletraður.**
  Talið á **röðun innan liðs** (`rank === 1`), ekki FPL-tölunni — horn ná aldrei
  1 (6j), svo `order === 1` hefði talið hornin úr. Mælt: **10 leikmenn** taka
  tvær tegundir, **enginn** tekur allar þrjár. Aðeins þyngd, enginn nýr litur:
  litirnir í spjaldinu bera þegar merkingu (rauður=víti, blár=aukaspyrna,
  grænn=horn).


---

## 8h. UTLITS-YFIRFERD 8.8.2026 — FJOGUR SEM VORU LOGUD

Sjonræn ur­tekt a ollum sex flipum eftir ad enskan var kláruð. Sidan skrunar
**hvergi larett** (maelt: `scrollWidth − clientWidth = 0` a ollum flipum) og
eina klippta textabrotid er „João Maria Lobo Alves Palhares C…" sem ER
ellipsis viljandi. Thad sem var lagad:

1. **TEAM OF THE WEEK LAS EINS OG BILUN.** `xiCard` hafdi `flex:"1 1 120px"`,
   svo spjoldin VOXU til ad fylla rodina: markvordurinn — einn i sinni rod —
   spannadi **alla breiddina** og fimm midjumenn urdu misbreidir eftir thvi
   hve long nofnin voru. Nu `flex:"0 1 172px"` + `justifyContent:center`:
   allir jafnbreidir og hver lina midjud, svo 1-3-5-2 les sem **formasjon**.
   `0` i grow er thad sem skiptir mali.

2. **OMERKT PROSENTA A LEIKMANNASPJALDINU.** Rotasjon-haettan birtist sem
   bert `24%` VID HLIDINA A `CS 44%` sem ER merkt — talan las thvi sem onnur
   likindi. Nu `st24%` (hlutfall leikja sem hann BYRJADI); tooltip-id ber
   fulla setningu. Spjaldid er 62–100 px svo heilt ord kemst ekki fyrir.

3. **LIDA-DALKURINN FROSINN i Teams.** Taflan ber 22 dalka og skrunar larett
   innan sins kassa; an frysts fyrsta dalks veit madur ekki hvada rod hann
   les thegar hann er kominn ut i „langskot a sig" — og thad er einmitt
   dalkurinn sem madur skrunar ad. **Bakgrunnurinn er gefinn BEINT, ekki
   `inherit`**: sama villa var maeld i leikmannalistanum samdaegurs
   („6*Gabriel +GBP1.3" skein i gegn) og hun er ekki endurtekin hér.

4. **†-MERKID FOR LIKA UR STIGATOFLUNNI.** Thad var tekid ur
   leikmannalistanum ad beidni notandans, en lifdi i `Leaderboard.jsx`. Hefdi
   thad stadid thar einni hefdi SAMA TALAN borid merki i annarri toflunni en
   ekki hinni — og notandinn lesid thann mun sem MERKINGU. Skyringin stendur
   afram i tooltip-inu.


---

## 8i. BIG CHANCES A SIG — BYGGT 8.8.2026, BIDUR EINNAR KEYRSLU

Fyrirvarinn i 8e sagdi ad thaer vaeru ofaanlegar. **Thad var rett medan ESPN
var eina skot-heimildin og er thad ekki lengur** (BSD, kafli 6t, gefur per-skot
xG i ollum 380 leikjum 2025/26).

`scripts/fetch-bsd-teams.mjs` -> `data/bsd_teams.json`. **SER SKRIFTA vid
hlidina a `fetch-bsd.mjs`** af thvi ad su er per LEIKMANN: leikmanna-summa yfir
timabil veit ekkert um hver mótherjinn var i hverjum leik, svo hun getur ekki
svarad „hvad faer thetta LID a sig". Faced-tolur krefjast thess ad hvert skot
se eignad lidi og hinu lidinu talid a moti, **per leik**.

**TVAER TOLUR, EKKI EIN.** `bc_*` er okkar talning (skot med xg >= 0,18) og
`bc_reported_*` er lids-svidid `big_chances` sem BSD birtir sjalft. Badar eru
geymdar svo rek sjaist STRAX — throskuldurinn 0,18 var fittadur gegn thvi svidi
(MAE 0,746, r 0,774 a 748 lid-leikjum) og skipti BSD um xG-likan myndi okkar
tala reka **thogult** ef hin vaeri ekki vid hlidina.

**ThRJAR REGLUR I SAMLAGNINGUNNI, ALLAR AKVARDANIR:**
1. **Skot an lids er sleppt, ekki eignad heimalidinu.** Rong eignun telur
   BADUM megin rangt (fyrir hja einu, a sig hja hinu) — tvofold villa.
2. **Skot an xG telst i `shots` en ekki i xG.** Ad lata thad gilda 0 thynnti
   medaltalid thogult.
3. **Leikur an skotakorts telst ekki sem leikur.** Annars deildum vid med
   haerri leikjafjolda en gognin na yfir og hver per-leik tala yrdi
   kerfisbundid of lag.

**PROFAD AN LYKILS.** `BSD_KEY` er write-only i GitHub Secrets, svo soknin
keyrir ekki her. Samlagningin er thvi dregin UT sem hreint fall
(`aggregateTeamShots`) og profud a **tilbunum BSD-svorum** — sama mynstur og
`mins-trend.mjs` kafli 0 og `defcon-shrink.mjs` nota, af somu astaedu: omældur
kodi sem fer i gang einn morgun er ekki asaettanlegt. Fimm stokkbreytingar
felldar (skot eignad rongu lidi, leikur an skotakorts talinn med, throskuldur
strangt staerra, xG-vantar gildir 0, BSD-tala sett i stad okkar).

**VORDURINN ThRENGDIST I STAD ThESS AD SLOKKNA.** Kafli 6 i `team-stats.mjs`
bannadi heitid „big chance" ALFARID. Nu ma dalkur heita thad — **en adeins ef
`src === "BSD"`**, th.e. ef hann er raunverulega talinn ur per-skot xG.
ESPN-dalkur sem thættist vera big chance fellur enn.

### OFULLKOMNIR DALKAR FULLYRDA EKKI LENGUR
`xG`/`xGC` koma ur FPL-summu sem vantar ~19% — og **undirtalningin er MISJOFN
milli lida**, thvi hun raest af thvi hve margir foru ur deildinni fra hverju
lidi. Maelt daemi: **Leeds maelist med laegsta xGC i deildinni (0,70) medan
raunveruleg mork a sig eru 1,47.** Graena „best"-merkingin thar sagdi
notandanum ad Leeds hefdi att bestu vaentu vornina — gervi.
Merkingin er FULLYRDING og su tala getur ekki borid hana, svo hun er tekin af
ollum `incomplete`-dalkum. **Tolurnar standa afram** (thaer eru gagnlegar i
samanburdi) og hausinn theirra er **gulur** svo fyrirvarinn sjaist a skjanum en
ekki adeins i tooltip-i. **Litur en EKKI nytt tákn**: †-merkid var tekid ut
samdaegurs ad beidni notandans, svo nytt tákn vaeri ad ganga aftur i sama vanda.


---

## 8j. RADGJOFIN I SAMANBURDAR-GLUGGANUM (8.8.2026)

Bedid var um: *„svakalega god AI reccomendation thegar eg ber saman tvo
leikmenn ... tillogu ad kaupum i % 30% buy 70% buy ... byggt a ollum gognum og
FFDR og FFDR-DEFCON Start% Form og OLLUM gognum. Ultimate tool til ad velja 1
leikmann thegar eg er buinn ad finna 3-4 moguleika."*

`src/advisor.js` (hreint) + spjald efst i `Compare.jsx`.

### HVAD PROSENTAN ThYDIR — ThETTA ER ALLT ATRIDID
Hun er **EKKI** „70% likur a ad thetta se god kaup". Su tala er omaelanleg
(enginn veit hvad „god kaup" er sem utkoma) og hun vaeri thvi okkar agiskun i
bunimgi maelingar — nakvaemlega thad sem thetta repo fordast alls stadar.

Hun **ER**: hlutfall theirra skipta i fortidinni sem sa sem skorid setti ofar
skoradi raunverulega fleiri stig. **MAELT A 306.653 SAMANBURDUM INNAN SOMU
UMFERDAR**, 5 timabil, ur sama spjaldi og `rank-model.mjs` notar
(`tests/lib/panel.mjs`, timaheidarlegt):

| bil i rankScore | n | P(haerri skorar meira) |
|---|---|---|
| 0–0,25 | 42.861 | 51,2% |
| 0,5–0,75 | 38.069 | 57,2% |
| 1–1,5 | 57.046 | 63,4% |
| 2–3 | 38.805 | 73,1% |
| 3+ | 13.295 | **80,6%** |

Logistisk fitun `P = 1/(1+exp(-(A + B·bil)))` med **A = 0,0258 · B = 0,4066**.
**LOSO: B = 0,400–0,416 og A = 0,022–0,027** — thett, svo thetta er ekki
yfirfitting. **Brier slaer 0,5-vidmidid i 5/5 timabilum** (0,1706–0,1818 a moti
0,1923–0,1996), UT FYRIR URTAK.

### ThAKID ER RAUNVERULEIKINN, EKKI HOGVAERD
Vid MESTA bil sem gognin geyma fer talan adeins i **~81%**. Verkfaeri sem segdi
„95% buy" vaeri ad ljuga, og thetta getur thad ekki: thakid kemur ur
maelingunni. Bil umfram 3,5 er **klippt** — thar fyrir utan er framreikningur,
ekki maeling.

### KJARNINN ER `rankScore`, OG ThAD ER ASETT
Nytt skor fyrir thetta vidmot hefdi thytt annad, **omælt** skor vid hlidina a
thvi maelda. `rankScore` slaer badi adferd appsins (topp-15 5,13 a moti 4,70)
OG **FPL-eigid xP** (4,48). Fjogur inntokin voru ekki valin af smekk: 57 inntok
voru profud og **VERSNUDU** valid.

### HLUTDEILD UR PORUM, EKKI SOFTMAX
Softmax hefdi verid NY tala med nyjum hitastigs-stika sem enginn hefur maelt.
Medal-vinningslikindi gegn hinum i hopnum er BEIN framlenging a thvi sem VAR
maelt — og **fyrir tvo menn skilar hun nakvaemlega maeldu tolunni** (vordur i
`tests/advisor.mjs` kafla 2).

### ThAD SEM ER **EKKI** I TOLUNNI — OG ER SAMT BIRT
Notandinn bad um „OLL gogn". Sum theirra hafa verid **MAELD OG HOFNUD**:
DefCon dregur i GAGNSTAEDA att vid hreint blad (kafli 3), jofnudur er
ogreinanlegur fra nulli innan stodu (6o), og „heitur leikmadur" er vaeg
AFTURHVARF (6c). Ad lauma theim inn i toluna vaeri ad selja havada sem visdóm.
Their eru thvi i **eigin kassa** merktir `weighted:false`, hver med skyringu a
thvi hvers vegna hann vegur ekki. Vordur: kafli 5 i `advisor.mjs` sannar ad
DefCon 95 + jofnudur 0,40 + byrjunar-likur 0,95 **hreyfa hlutdeildina EKKI**.

### BYRJUNAR-LIKUR ERU HLID, EKKI LIDUR
Talan svarar „hvor skorar meira **ef badir spila**". Sa sem spilar ekki skorar
ekki neitt — onnur og hardari spurning. Ad margfalda thessu saman hefdi falid
badar: 60% sem verdur 45% segir hvorki ad hann se betri ne ad hann se i haettu.
Prosentan stendur thvi obreytt OG vidvorunin vid hlidina.

### FRAMLOGIN LEGGJAST SAMAN — ThAU ERU EKKI EFTIRA-ROKSTUDNINGUR
`rankScore` er LINULEGT, svo framlag hvers inntaks er nakvaemlega
`w·(x − medaltal hopsins)`. Thess vegna **leggjast tolurnar undir hverju nafni
saman i skor-muninn**, og skyringin getur ekki stangast a vid nidurstoduna.
Fyrsta utgafan namundadi thau i gognunum og braut thad um 0,0002 — profid greip
thad. Namundad er i BIRTINGU i stadinn.

### VERD TELUR UPP A VIÐ, OG ThAD ER UTSKYRT A SKJANUM
Sterkasti lidurinn i raun. An skyringar les „Price +1,04" eins og villa
(„betri af thvi ad hann er dyr"). Textinn segir thvi berum ordum: verd er
**markadurinn ad meta getu sem okkar fimm tolur sja ekki**; likanid verdlaunar
ekki kostnadinn heldur les hvad hann gefur i skyn.

### VILLA SEM VAR FUNDIN VID SJONPROFUN
Byrjunar-likurnar voru lesnar sem `im.start_prob` — **thad svid er ekki til**.
Reiturinn var thvi alltaf tomur og enginn hefdi tekid eftir thvi, thvi „engin
gogn" er gild nidurstada i thessu appi. Nu leiddar ur `start_feats` gegnum
`startRisk`, sama utfaersla og dalkurinn i leikmannalistanum notar.

`tests/advisor.mjs`: 38 prof, thar a medal 500 slembin inntok sem verja
obrigdulu regluna (hlutdeild alltaf a (0,1) og summan nakvaemlega 1).

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

---

## 14.8.2026 — ÚTTEKT Á HANDOVER-FPL.md, MÆLT OG LAGAÐ

Handover-skjalið (13.8.2026) var sannreynt lið fyrir lið með keyrðum
endurgerðum. Meirihlutinn stóðst; hér er það sem MÆLDIST, þar með talið það
sem skjalið sagði rangt og það sem það sá ekki.

### Fjórar fullyrðingar handover-skjalsins sem stóðust EKKI

| fullyrðing | mælt |
|---|---|
| A.4: „null = 0,5 er hin MÆLDA ákvörðun" | **Hvorug talan er mæld.** Hvorki `0` (`availForKickoff`) né `0,5` (App.jsx, snapshot) á sér mælingu; `tests/exp-points.mjs:20-25` segir beinum orðum að `chance_of_playing_next_round` sé framtíðar-upplýsing og **ekki mælanleg** þar. `availForKickoff` er auk þess ELDRI (31.7.) en 0,5-reglan (10.8.) og sama `?? 0` stendur í þremur frystum afritum — arfur, ekki ásetningur. **Ósnert**: að samræma á 0,5 væri að velja ómælda tölu, sem er nákvæmlega það sem kafli 3 bannar. Áhrif í dag: **0 af 70** óheilbrigðum leikmönnum bera null-líkur (33 committaðar útgáfur skoðaðar) |
| A.5: „hálfskrifað JSON gefur hlut þar sem fylki á að vera" | **Rangt ógnarlíkan.** 2.000 klipppunktar á `last_gw_shots.json`: **1.999 SyntaxError, 0** tilfelli af hlut-í-stað-fylkis. Hálfskrifað JSON kastar í `r.json()` og er ÞEGAR varið. Raunverulega leiðin er snið-breyting eða mis-víruð prop — `players` ER þegar hlutur í `player_form.json`, `player_seasons.json` og öllum `player_gw_*.json`. Lagað samt (`rowsOf`), en af réttri ástæðu |
| B.2: „elo ok:false núna; `homeCore` slekkur á sér" | **Úrelt OG rangur gangvirki.** Elo var `ok:true` í 14.8-keyrslunni; bilanir 11.8 og 13.8, grænt 10., 12. og 14. — ~2 dagar af 5, hléskennt. Og bilun EYÐIR EKKI `elo.json`, svo `usedElo` helst satt og `homeCore` er ÁFRAM Á með gömlum tölum. Hættan er ekki að liður slokkni heldur að **gömul gögn séu birt sem ný** |
| B.3: „ekkert les E0-2627" | **Ósatt** — `buildLiveGwReport` (`fetch.mjs:2742`) les hana. Rétta fullyrðingin er að `team_form` geri það ekki. Nótan í `wiring.mjs` var sjálf úrelt, líka línunúmerin |

### Þrennt sem handover-skjalið sá ekki

**1. `data/fdcouk/E0-2627.json` bar NATIONAL LEAGUE og heimildin var græn.**
Mælt beint: `curl -w "%{http_code} %{redirect_url}"` gefur
`301 -> .../2627/EC.csv` fyrir 2627 og `200` fyrir 2526. `fetch` fylgir
redirectum og `fetchFdcouk` sannreyndi AÐEINS 404, svo skráin bar 12 raðir,
allar `Div: "EC"` (Altrincham v Southend, 08/08/2026) og `status.json` sagði
`fdcouk_e0 ok:true, count:12`. **`gw1-checklist` atriði 8 („er skráin til með
röðum?") var þegar uppfyllt af utandeildar-röðum** og hefði orðið grænt af
rangri ástæðu 21. ágúst. Vörður: `Div === "E0"` í `fetchFdcouk` (óhreint svar
meðhöndlað eins og 404), `tests/fdcouk-e0.mjs` (21 fullyrðing), og
checklistinn prófar nú deildina. Skráin var **fjarlægð**.

**2. `start_prob` í spá-bókhaldinu var null fyrir ALLA — og hefði verið það
allt tímabilið.** `buildSnapshot` kallaði
`startProbability(startFeatures(mins, …))` þar sem `mins` var **tala**
(`Number(p.minutes) || 0`); `startFeatures` heimtar **fylki** af mínútum
síðustu umferða → `Array.isArray` false → `[]` → `length < 2` → null.
Kvörðunin (Brier + bekkjar-gildran) hefði því aldrei getað mælt þá vídd.
Handover-skjalið las þetta sem „gate er einu skilyrði of fátt"; orsökin var
dýpri. Rétt heimild er sú sem appið notar: `start_feats` í `imminent.json`.
Pörun á `code` (fast yfir tímabil, 841 raðir/841 einkvæm): **459 af 584**
parast, allir með `start_feats`; hinir 125 eiga engin gögn og fá réttilega
null. Mælt eftir lagfæringu: `start_prob` **0/584 → 459/584**.
Prófið sem átti að verja þetta **staðfesti villuna sem hegðun** — það kallaði
`buildSnapshot` ÁN `imminent` og fullyrti svo að null væri „rétt svar í
forleik". Nú les það sömu skrár og keyrslan.

**3. Control-hópurinn tapaðist í GW1 — ~1.000 köll í ekkert.** `agg.control`
er sett EFTIR `writeJSON` og endurskrifin var skilyrt á `__outcomeAdded`, sem
krefst FYRRI umferðar. Í GW1 er engin, svo hópurinn var sóttur og hent; þekju-
vörðurinn hefði komið í veg fyrir endursöfnun. `pros.json` ber `control: 1000`
(athugasemdin í kóðanum sagði 300 og var úrelt). **Og prófið gat ekki fallið**:
harnessið geymdi `wrote[p] = o` — SÖMU TILVÍSUN og kóðinn hélt áfram að breyta —
svo `control` sást í prófinu þótt hún væri aldrei skrifuð. Harnessið
serialiserar nú, og fullyrðingin er á NÁKVÆMLEGA þremur skrifum
(tilraun · hrun-vörn · endurskrif); `>= 2` var mín eigin tóma fullyrðing því
`markAttempt()` skrifar alltaf einu sinni fyrst.

### FPL endurgrunnaði hornaröðunina 13.8.2026

Mælt úr committuðum `data/players.json` (6 útgáfur):

| keyrslur | `corners_and_indirect_freekicks_order` | lið með 1 |
|---|---|---|
| 9.8 – 12.8 | 2 – 12 | **0 af 20** |
| 13.8 – 14.8 | **1 – 6** | **18 af 20** |

`pen` og `fk` eru bæði 1–5, svo öll þrjú sviðin hafa nú sama grunn.
`fetch.mjs:262` afritar töluna óbreytta → FPL sjálft. Reglan (röðun innan
liðs) stóðst óbreytt og er enn nauðsynleg: **FUL** (Iwobi 2, Bobb 3, Kevin 4)
og **NEW** (Hall 2, J.Murphy 3, L.Miley 4, Elanga 5) hafa enga 1.
Þrjár fullyrðingar féllu og **allar voru um FPL-númerin, ekki um regluna**.
Tvær aðrar birtingar voru orðnar ÓSANNAR á skjánum: `stats.js`-nótan
(„MEASURED: … the range is 4–10 and NO club has a 1") og legend-textinn í
flipanum („4–10 and never reach 1"). Sviðin eru nú REIKNUÐ (`spRanges`).
**Vörðurinn þurfti að breytast í eðli sínu:** með nýja grunninum finnur
`order === 1` taka fyrir 18 af 20 liðum, svo lifandi gögn ein duga ekki lengur
— tilbúið lið (4/7/9) ber vörðinn, plús lifandi liðin án 1, talin.

### Stöðu-lekinn í leikmannatöflunni (A.2 — stærri en skjalið sagði)

Skjalið nefndi mó/aó á markmönnum. Mælt: **12 dálkar bera `pos` og
leikmannataflan virti það hvergi** — `buildLeaderboard` gerir það. Framherjar
birtu `Clean sheet %: 32%`, `Goals conceded: 36`, `xGC per 90: 1.26`
(70 framherjar með `clean_sheets`, 39 með `cs_pct`) meðan stigataflan hafði 0
í sömu dálkum: **tvær töflur sögðu sitthvað um sama dálk**. Markmenn: 17 báru
`_mo`/`_ao`, **10 birtu `0.00`** og 13 `0.0` — ómæld tala sem leit út eins og
mæling, þvert á nótu dálksins sjálfs.
Skjalið lagði til `pos:[2,3,4]` + lagfæringu á `PlayerList.jsx:78`; það hefði
lagað **stigatöfluna eina**, því `numericDefs` þar hleypir 124 af 124 gegnum
OG er **aldrei kölluð** (dautt fall). Vörðurinn er því á **getternum sjálfum**,
sem báðar töflur, þröskuldarnir, hitakortið og prófin lesa. Óþekkt staða
(`element_type` vantar) fer ÓSNERT í gegn — fimm einingapróf féllu á fyrstu
útgáfu sem síaði hana líka, og „vantar" er ekki „utan sviðs".

### Dauðir samhengis-þættir í ráðgjöfinni (A.3)

Mælt á öllum 584: `start` 465 gildi, `aron` 473, **`dc` 0 og `bc` 0**.
`dc` fletti upp í FYLKI eftir sæti (`defcon.players[p.id]`) og
`defcon_opportunity` býr á `defcon.opportunity[TEAM_ID]`. Hermt í-tímabils-
fylki sýndi að **299 af 300 uppflettingum hittu á annan leikmann**, svo hefði
sviðið einhvern tíma verið sett á raðirnar hefði þetta birt tölu ANNARS manns.
`bigChances` átti **engan framleiðanda** í `src/` — `advisor.js` var eini
lesandinn. Eftir tengingu: `dc` 255 (GK+DEF, sama staða og skorið notar),
`bigChances` 316. Vörður er á SVIÐUM, ekki skrám: hvert svið sem
`contextFactors` les verður að eiga stað í `src/` sem setur það.

### Fjórða hlut-í-stað-fylkis staðurinn fannst þegar prófið var skrifað

`makeEnricher` hafði þrjá (`shotsFile`, `defcon`, `bsd`) — nýja
atburðarásin í `data-resilience.mjs` felldi líka **`threatByTeam` í
`SetPieces.jsx`**, sem enginn hafði nefnt. `|| []` ver aðeins null/undefined;
`{} || []` er `{}`.

### Verðir sem voru stökkbreyttir (afturkallað, staðfest að þeir falla)

`set-pieces` (rank-innan-liðs → FPL-tala: 8 fullyrðingar féllu; hardkóðað svið
aftur í legend: 2) · `archive-gw-report` (`.rows` aftur: 13, þ.m.t. 39 köll;
naívur parser: 6) · `fdcouk-e0` (vörður fjarlægður: 10) · `prediction-ledger`
(`startFeatures(mins)` aftur: 4) · `pros` (`dirty` → `__outcomeAdded`: 5) ·
`stats.test` (pos-vörður fjarlægður: 1; GK-vörður: 1) · `advisor`
(`bigChances`-framleiðandi fjarlægður: 2; fylkis-uppfletting aftur: 1) ·
`data-resilience` (`rowsOf` → `|| []`: 1) · `workflow-push` (dautt
`ENABLE_ESPN` sett aftur: 1).

---

## 16.8.2026 — ÚTTEKT Á HANDOVER-FPL-2.md, OG SJÖ ATRIÐI FRÁ NOTANDA

Handover-skjalið (15.8.2026, Fable) var sannreynt lið fyrir lið með keyrðum
endurgerðum, eins og útttektin 14.8. Meirihlutinn stóðst. Samhliða komu sjö
athugasemdir frá notandanum sjálfum, og **tvær þeirra voru spurningar um tölur
sem reyndust RÉTTAR** — sem er sín eigin niðurstaða og er skráð hér svo hún
verði ekki „löguð" seinna.

### A. Tvær tölur sem notandinn véfengdi — BÁÐAR RÉTTAR

**A1. „CS EXPECTATION 37% fyrir Raya næstu 5 — getur ekki verið rétt."**
Talan er **einfalt meðaltal** yfir leikina fimm, ekki margfeldi:

| GW | mótherji | H/A | FFDR (staða 2) | grein í fossinum | CS |
|---|---|---|---|---|---|
| 1 | COV | H | 1,45 | **bookie** | 45% |
| 2 | AVL | A | 2,35 | probability | 28% |
| 3 | CHE | H | 1,84 | probability | 40% |
| 4 | SUN | A | 1,70 | probability | 39% |
| 5 | BHA | A | 1,79 | probability | 34% |

186/5 = 37,2 → **37**. Hinar túlkanirnar passa ekki: margfeldi (CS í ÖLLUM
fimm) = **0,668%**, summa = 186. Við `range` 6 les reiturinn 39%, við 8 les
hann 40% — hann eltir meðaltalið, aldrei margfeldi.

**Kvörðunin var mæld, ekki fullyrt.** Uppsett `cleanSheetProb` var keyrt yfir
14-tímabila spá-heiminn sem `tests/lib/e0.mjs` byggir, **10.640 lið-leikir**:
spáð meðaltal **27,53%** á móti raun **27,23%**, hver tíundarhlutur innan
3,2pp. Og fyrir varnir í Arsenal-flokki (≤0,90 á sig per leik, **n=874**):
**spáð 40,0%, raun 38,1%.** Það er nákvæmlega sviðið sem talan liggur á.

**Innsæið var akkerað á RANGA viðmiðinu og það er þegar skjalað:** Arsenal
fékk 19/38 = 50,0% hrein blöð 2025/26 og hrátt Poisson (`e^-0,711`) gefur
**49,1%** — en kafli 3 í `CLAUDE.md` skráir einmitt að hráa Poisson-viðmiðið
sé of bjartsýnt og hafi verið hafnað (29,9% fyrir MCI heima á móti 43%).
Eitt tímabil er auk þess ein raungerð: SE ≈ 8,1pp á 19/38.

**GW1 er dregin niður af MARKAÐNUM, ekki líkaninu.** Á sömu 20 leikjum er
líkanið **+3,7pp HÆRRA** en bókmakarinn að meðaltali; fyrir ARS–COV segir
líkanið 53% en markaðurinn 45%, og fossinn tekur markaðinn. **Engin villa.**

**A2. „Vitlaus CS í Upcoming fixtures — 6 umferðir og efsti með 23%."**
Talan er rétt en **HÓPHEITIÐ er villandi**. `23%` finnst í nákvæmlega tveimur
hólfum: `Team clean sheet prob.` fyrir **BRE** og **LEE**, báðir með
`cs=23, xga=1,46` (`e^-1,46` = 23,2%) — rétt bókmakaralína fyrir **GW1 EINA**.
Dálkurinn ber bandið „Team, next match" en situr við hliðina á þremur
dálkum undir bandinu „Next 6 gameweeks", í hóp sem heitir „Upcoming fixtures".

**Og hann var ALDREI efstur:** smellur á dálkinn setur **ARS 45%** á toppinn
(asc setur BOU/COV 7%). Stigataflan fyrir sama dálk sýnir `1. Gabriel ARS 45%`.
Sex-umferða meðaltal `csFor` raðar líka ARS efst (39%); þeir sem liggja nálægt
23% yfir 6 umferðir eru SUN/BOU (23%), COV (22%), IPS (21%), HUL (15%) — **botninn**.
**Enginn 6-umferða CS-samtala er til í appinu**, svo það var ekkert að bera hana við.

### B. TVÆR RAUNVERULEGAR VILLUR SEM FUNDUST VIÐ AÐ RENNA A1/A2 TIL BOTNS

**B1. `_team_cs` hafði ENGA ferskleika-vörn þótt `csFor` hefði hana.**
`csFor` (`App.jsx` ~1135) sannreynir bókmakaralínuna gegn **mótherja OG
dagsetningu** áður en hún er notuð. `stats.js` fletti upp á **lids-skammstöfun
EINNI**. Í dag meinlaust (`odds.json` er `window:"plan"`, `gw:1`, allar 20
raðirnar passa við GW1) — **en sókninni er sleppt þegar hún var nýleg**
(`status.json` í dag: *„skipped: plan window already fetched 23h ago"*), svo um
leið og tímabilið byrjar og skráin dregst aftur úr hefði dálkurinn birt línu
fyrir leik **sem er þegar búinn, án nokkurs merkis**. Það er nákvæmlega
„gömul gögn birt sem ný" (sama ætt og `homeCore`-lærdómurinn og dauði
markaðsliðurinn). Sama tveggja-þátta próf er nú í `makeEnricher`.
**Mælt eftir lagfæringu:** óbreytt í dag **587/587** leikmenn með gildi
(15 ólík), en **0/587** bæði þegar `kickoff` er úrelt og þegar `opp` passar ekki.

**B2. `RecCard` teiknaði annað mengi en það sem það lagði saman.**
Strimillinn rendraði `fxs.slice(0, range || 6)` en CS-væntingin lagði saman
**ALLA** `fxs`. Í dag ósýnilegt: leikjaskrá 2026/27 hefur **0 auðar og 0
tvöfaldar umferðir**, svo mengin eru eins. Við fyrstu tvöföldu umferð hefði
kortið sýnt `range` reiti meðan talan var meðaltal af fleirum. Eitt mengi (`shown`) núna.

### C. ANDLITSMYNDIRNAR — SLÓÐIN VAR EINNI KYNSLÓÐ Á EFTIR

Notandinn: *„Það vantar myndir af fullt af leikmönnum."* **Heil talning á
öllum 587 leikmönnum í `data/players.json`** (HEAD-köll, ekkert úrtak):

| slóð | 200 | vantar |
|---|---|---|
| `premierleague/photos/players/110x140/p{code}.png` (sú sem var notuð) | 381 | **206 (35,1%)** |
| `premierleague25/photos/players/110x140/{code}.png` | 411 | 176 |
| **önnur hvor** | **478** | **109 (18,6%)** |

Nýja fotan **sleppir „p"-forskeytinu** og heitir eftir tímabili. **Hvorug er
yfirfota hinnar:** 97 menn eru aðeins í `premierleague25` og **67 aðeins í
þeirri gömlu** (þeir sem skiptu um félag — Meslier, Bruno G., Garnacho,
Rogers, Lacroix). **Þess vegna KEÐJA, ekki skipti.**

Sjálfstæð staðfesting á 70-manna úrtaki: vantandi myndir fara **15 → 5**, og
`p25` bjargar m.a. **Zubimendi, Hincapie, Mosquera, Truffert, Rayan**.

Ábatinn liggur þar sem hann skiptir máli: hjá þeim sem meira en **5%** eiga
fer vantandi mynd **11 → 1**, og hjá þeim sem spiluðu einhverjar mínútur
**106 → 19**. Þeir **109** sem eftir standa eru raunverulega myndalausir hjá
FPL: **90** þeirra hafa NÚLL mínútur og **52** eru hjá COV/HUL/IPS.
**Það er RÉTT niðurstaða** og treyju-fallbackið á við — myndirnar birtast
sjálfkrafa um leið og FPL myndar þá.

**Prófað og fellt** (403 fyrir bæði virkan og vantandi leikmann): `.webp` í
öllum stærðum · `photo-2/` · pulselive-lénið · `premierleague24` ·
`premierleague26` (**þess vegna er hún EKKI sett inn fyrirfram** — hún svarar
403 fyrir alla í dag og bætti aðeins við tómu kalli).

**Myndamirrun í repo-ið var MÆLD OG HAFNAÐ:** 478 myndir eru **44,7 MB**
(meðaltal 91 KB — „110x140"-slóðin skilar 220x280 skrá), hún getur hvort eð er
ekki náð í það sem er ekki til, og repo-ið er **public** (höfundaréttur).
BSD ber ekkert mynd-svið; SofaScore/Transfermarkt falla á sama prófi og
þyrftu proxy-inn, sem er strict-routed af ásettu ráði.

### D. MARKMENN FÁ ENGIN DEFCON-STIG — OG BÁRU SAMT DEFCON-LIÐ Í SKORINU

`App.jsx` gaf `dcB` fyrir `element_type <= 2`, sem er **GK OG DEF**.
Mælt á `data/player_gw_2526.json`:

| staða | leikja-umferðir | DefCon alls | meðaltal | hámark |
|---|---|---|---|---|
| **GK** | **663** | **0** | **0,00** | **0** |
| DEF | 3.057 | 19.248 | 6,30 | 27 |
| MID | 4.392 | 25.756 | 5,86 | 29 |
| FWD | 1.082 | 2.816 | 2,60 | 15 |

**663 markmanna-umferðir, aldrei eitt DefCon-stig.** `defcon.json` spannar
53–86 í tækifæri, svo `dcB = (o−60)/30` gaf 65 markmönnum **−0,23 til +0,87**
á birta skorið fyrir tækifæri sem er ekki til. Sama brot og mó/aó á
markmönnum („MÆLINGA-REGLA, EKKI SNYRTING", `stats.js` ~1745).
**Þetta er ÞRENGING, ekki ný vog:** kafli 4 hafnaði DefCon **í röðun** og
`rankScore` ber hann hvergi — hann lifir áfram á skorinu sem er BIRT, nú
aðeins hjá þeim sem geta unnið hann. Sama gildir um `dc`-línuna í
ráðgjafarglugganum.

**Aukafundur sem er sofandi en ómældur:** `fetch.mjs:605` er
`const threshold = pos === 2 ? 10 : 12;` með athugasemdinni „GK teljum sem
DEF-lík" — en `pos === 2` er DEF EIN, svo GK fellur þegjandi í 12 og
athugasemdin lýsir hinu gagnstæða við kóðann. Meinlaust í dag því GK-inntakið
er alltaf 0, **en `DC_P0_FALLBACK` ber `GK: 0,02`**, sem myndi draga markmenn
að tilbúinni 2% hittni ef dálkurinn birtist þeim nokkurn tíma.

### E. TVÆR ENDAPUNKTA-MÆLINGAR SEM FELLDU FULLYRÐINGAR Í `CLAUDE.md`

Báðar mældar beint í dag, **með venjulegum UA-haus og ENGUM token**:

| endapunktur | niðurstaða |
|---|---|
| `fotmob.com/api/matchDetails` | **404** (þetta var talan sem skjalið bar) |
| `fotmob.com/api/data/matchDetails?matchId=…` | **200, 259.341 bæti** af raunverulegu JSON |
| `fotmob.com/api/data/matches?date=…` | **200, 288.828 bæti** |
| `football-data.co.uk/mmz4281/2627/E0.csv` | **301 → `2627/EC.csv`** → 200, 13 línur |

FotMob-svarið ber `Tackles`, `Clearances`, `Interceptions`, `Blocks`,
`Recoveries`, `Minutes played` **og `shotmap`** — sem fellir röksemdina
„Engin shotmap með gildu id" orðrétt. **En staðan er SKIPT og má ekki
einfalda:** skot-heimildin sjálf er enn token-varin þar sem
`measure-box-touches.mjs` og `fetch-team-shots.mjs` sækja hana, svo „FotMob
virkar" væri ný röng fullyrðing í stað gamallar.

**fdcouk-2627 gefur EKKI 404** heldur 301 í utandeildar-skrá (`Div: "EC"` —
Altrincham, Southend, Boreham Wood, Tamworth, Boston Utd, Aldershot). Kóðinn
var **þegar réttur** (`Div === "E0"`-vörðurinn frá 14.8.); það voru **skjölin**
sem sögðu enn „404 → 200", og GW1-tékklistinn hefði því leitað að merki sem
er ekki til. Til samanburðar skilar `2526/E0.csv` 200 með 380 `E0`-röðum.

### F. HANDOVER-ATRIÐIN — HVAÐ STÓÐST

`bigChances` **0 af 587** í framleiðslu, staðfest með keyrslu: `Compare.jsx`
sendi `season={currentLabel}` = **„2026/27"** meðan `bsd_players.json` ber
„2025/26" og `bsd_live.json` er ekki til fyrr en eftir 21.8. Með
`season={season}` (eigið ástand gluggans, sjálfgefið 2025/26 — **EKKI**
`seasons[0]`, sem er lifandi færslan) fara þeir í **316 af 587**.
**Vörðurinn var holur:** `tests/advisor.mjs` lét sér nægja regex sem fann
strenginn `bigChances:` einhvers staðar í `src/` — hann var **grænn 53/53**
meðan framleiðslan var 0/587, og hélst grænn þegar lagfæringin var afturkölluð.
Raunverulegi vörðurinn les DOM-inn.

`▼`-merkið: skýringin lofaði því en **0 af 32 röðum** báru það eftir að
`VisualRows` var eytt 14.8.; prófið gerði `.replace("▼","")`, sem er **no-op**
þegar merkið er hvergi. Nú **9 raðir** (nákvæmlega `hi:false`-mengið).

Stöðu-lekinn í GW-bils-ham: `sumGwRange`-raðir bera ekkert `element_type`, svo
kvörnpunkturinn hleypti þeim öllum í gegn. Mælt á 2025/26, GW1–38:
**410 raðir leka 1.535 stöðu-læstum gildum** — DEF 150 raðir/417 gildi,
MID 207/576, FWD 53/542; versti framherji (Gyökeres) bar **11** gildi, þar á
meðal `Clean sheet %: 46,2`, `Goals conceded: 14`, `Saves: 0`.
Og **árstíðarhamurinn var ekki hreinn heldur**: raðirnar bera SÖGULEGT
`element_type` meðan sían og merkimiðinn lesa það LIFANDI, svo tvær raðir
(**Marmoush og Georginio**, live=4 hist=3) leka **16 gildum** í dag — af tíu
leikmönnum sem skiptu um stöðu milli tímabila. **Ein lína**
(`element_type: p.element_type` í sama spread) lagar hvort tveggja, og eftir
hana er lekinn **0 og 0**.

**Vörðurinn harðkóðar EKKI lyklana sem eru fluttir:** hann skannar `src`-blokkina
út úr `PlayerList.jsx`, dregur út hvert `x: p.y` par og endurbyggir röðina úr
`sumGwRange` eins og appið gerir — svo nýr fluttur lykill fellur ekki utan hans
þegjandi (sama regla og `gwBlindKeys` er LEIDD, ekki handskrifuð).

### G. „SEASONS-FLIPINN ER ÓLÆSILEGUR" — BREIDDIN VISSI EKKI AF MERKINU

Enginn flipi heitir „Seasons". Það sem notandinn sá er **`season`-merkið á
dálkahausum, klippt**: `wOf` frátók `const marker = 9` fyrir **röðunar-örina
eina**, en merkið (sem kom 14.8. í stað ólæsilega `∑`) situr í sama
`S.hCell`, sem er `nowrap; overflow:hidden; justifyContent:flex-end` — svo
yfirflæðið hverfur **vinstra megin**, nákvæmlega eins og þegar „Points ↓"
varð „oints ↓".

**Mælt í rendruðum DOM** (2025/26, GW-bil 30–38): **44 blindir dálkar, 43
merktir**, og **ALLIR 43 voru of mjóir** — minnsta vöntun **23 px** — og
**25 misstu heitið að fullu**, svo sýnilegi hausinn var brot úr orðinu
„season" og ekkert annað (`Aron` 55 px þar sem þarf 89; `4+ pts` 60/102;
`n` 46/70). „Consistency (Aron)" er verst því **4 af 4** dálkum hennar eru
merktir, svo öll hausröðin er ólæsileg í einu.
**Eftir lagfæringu: 0 klippt** (Aron 55→90, 4+ pts 60→103, n 46→71, breiðasti
129 undir 142 px þakinu).

Tvær reglur féllu út úr þessu og hvorug er handskrifaður listi:
**merkið er sleppt þegar heitið endar þegar á „season"** (þess vegna 43 en
ekki 44 — `Chg season` las áður sem **„Chg season season"**), og
**merkið er sleppt undir 560 px**. Símahamurinn negldi hvert hólf í 66 px
(kafli 6i) og merkin þyrftu ~110 px hvert; haus sem er klipptur niður í
„season" segir auk þess ekki HVAÐA dálkur hann er, svo hann tapar meiru en
hann skilar. Merkingin ríður áfram á `hBlind`-tóninum, tooltip-inu og
borðanum. **Kostnaðurinn er skráður:** á síma er tooltip-ið óaðgengilegt, svo
per dálk er þetta litur einn.

**Vörðurinn gat ekki fallið og það var kjarni málsins:** `stats.test.mjs`
**endurritaði `wOf` með sínu eigin `marker = 9`**, svo afritið var grænt eftir
að merkið bættist við — sama ætt og `buildTeamMetrics`-atvikið. Breiddin,
merkja-reglan og fastinn eru nú **útflutt** (`headWidth`, `headBadge`,
`BADGE_W`) og bæði viðmótið og prófið lesa SÖMU útfærsluna.
`BADGE_W = 43` er **leidd af mældu stafabreiddinni** (kafli 6i), ekki valin:
ui-monospace kvarðast línulega, svo `6,35 × 9/10,5 = 5,44` px/staf, og
`6 × (5,44 + 0,2 letterSpacing) + 6 padding + 3 marginLeft = 42,9 → 43`.
Canvas er ekki til staðar í jsdom (og pipeline hefur engar dependencies), svo
**afleiðslan sjálf er prófuð** í stað þess að fastinn sé sleginn inn.

Og `playerlist-gw-filter.mjs:141` fullyrti „**læsilegt** season-merki" með
`/season/i.test(text())` — sem klipping getur ekki haggað; það er þriðja tóma
fullyrðingin í þessari ætt (kafli 5b). Hún mælir nú hólfið sjálft.
`playerlist-narrow.mjs` hafði heldur **aldrei kveikt á umferðar-bili**, svo
símahamurinn hafði aldrei rendrað merki yfirleitt.

### I. BANNER-TEXTINN VAR SJÁLFUR HANDSKRIFAÐUR LISTI — OG HANN VAR RANGUR

„Season totals"-borðinn (A.4 í handoverinu) nefndi **rangan hóp** í
sérsniðnum ham (`group` frýs á „core" því hann er aðeins settur úr
hópa-valaranum) og fullyrti að ekkert á skjánum gæti breyst meðan sýnilegi,
pinnaði **Points**-dálkurinn fer 239 → 98 fyrir Haaland þegar bilið breytist
(**374 leikmenn** breytast milli GW1–38 og GW1–10).

Tvær ákvarðanir voru teknar berum orðum í stað þess að giska:
**pinnaðir dálkar eru TALDIR** — sem þýðir að borðinn hverfur réttilega úr
sérsniðnum ham, því þar fylgir alltaf eitthvað bilinu; í staðinn fær sá
hamur **eigið orðalag sem nefnir ENGAN hóp**. Í hópa-ham er hegðunin
óbreytt (pinnaða parið þar, Verð og Eignarhald, er hvort tveggja blint), svo
viðvörunin frá 14.8.2026 kviknar áfram.

Og **tillögulistinn („Basics, Attack eða Defence") var LEIDDUR**, með
skilyrðinu `!blind && !live_only`. Hann reyndist **þegar rangur**: réttur
listi er **Basics, Attack, Defence OG „Set pieces and cards"** (spjalda-dálkar
fylgja bilinu). `live_only`-helmingur skilyrðisins er sá sem heldur
„Upcoming fixtures" úti — sá hópur á **0 blinda dálka en 5 af 5 `live_only`**,
svo leiðsla af `blindKeys` EINUM hefði mælt með framsýnum hóp sem getur ekki
fylgt bilinu.

### H. VIÐMÓTSBREYTINGAR AÐ BEIÐNI NOTANDA — OG HVAÐ MÁTTI EKKI FARA MEÐ

Fjórar skýringar-málsgreinar voru teknar út (FFDR-málsgreinin, COV/HUL/IPS-nótan,
legend-blokkin í Teams og elo-aldurs-setningin), og **Data sources** færður úr
hliðarstiku Planner-flipans í **borða neðst yfir alla breidd**. Þrennt er
skjalfest hér því það var EKKI snyrting:

1. **Elo-aldurinn fór EKKI með málsgreininni.** `eloStale` býr nú í
   ClubElo-röðinni í borðanum. Athugasemdin sem verið var að eyða skráði
   sjálf hvers vegna hann var settur þar sem FFDR er birt: 31.7.2026 var
   `elo.json` einn og hálfan dag gömul því ClubElo brást og **ekkert í
   viðmótinu sagði það**. Mælist í dag **2,7 dagar**. Client-megin prófunin
   er auk þess **sterkari** en `elo_age` úr `status.json`: stöðvist pipeline-in
   frýs `elo_age` en þessi telur áfram.
2. **`prediction_ledger` var skrifuð í `status.json` en var EKKI í `SHOW`** —
   svo rauð lína frá spá-bókhaldinu hefði farið á disk, verið committuð og
   **sýnd engum**. Athugasemdin í `snapshot-predictions.mjs` fullyrti að
   röðin birtist undir Data sources; **hún var ósönn.** Bókhaldið á
   **eitt skot** per umferð og glugginn fyrir GW1 opnast 21.8.
   **`elo_age` var LÍKA utan `SHOW` en er þar áfram viljandi:** hún segir
   aldurinn eins og hann var í síðustu pipeline-keyrslu (23,2 klst) meðan
   ClubElo-röðin telur hann lifandi (2,7 dagar). Tvær tölur um sama hlut,
   sín með hvoru svari, er verra en ein.
3. **Legend-textinn í Teams bar STAÐA FULLYRÐINGU sem var röng síðan 8.8.2026:**
   „xG and xGC — FPL player totals, roughly 19% short". Liða-xG/xGC koma úr
   **BSD-skotakortinu** (per-skot xG) og eru ekki lengur `incomplete`.
   `luck.json` leggur nú aðeins til RAUN-mörkin fyrir G−xG. `luck &&`-skilyrðið
   á línunni lét hana líta lifandi út meðan báðir helmingar voru ósannir.
   Skýringarnar liggja nú á hverjum dálki (hover) og **stefnan er leidd af
   `d.hi`**, ekki handskrifuðum undantekningarlista („nema langskot") —
   nýr `hi:true`-dálkur hefði þagað þvert á textann. Talnagildi í
   nótunum eru **reiknuð** úr gögnunum (`teamShots.no_zone`, `bsdTeams.season`),
   ekki fest: „380 matches" var ekki reiknanlegt þar (summa per félag / 2 gefur
   **323** af því að fallnu félögin þrjú vantar) og var því orðað án tölunnar.

---

## 16.–17.8.2026 — LEIKMANNADALKARNIR ALLIR 124 ENDURREIKNADIR

Notandinn sagdi: *„Fardu yfir allar birtar tolur i player stats og
double-checkadu thaer, mer synist einhverjar ekki vera rettar."* **Hann hafdi
rett fyrir ser.** Allir 124 dalkar voru bornir vid **sjalfstaeda endurreikninga
ur hraustu heimildunum** OG lesnir AF SKJANUM i jsdom. Thad sem fannst:

### Rangar tolur (ekki orðalag — TOLUR)

| dalkur | einkenni | rett |
|---|---|---|
| **`xg_share`** | Ogbene **148%**, Szmodics 114%, Lukic **74%** i sjalfgefnu utsyninni; Isak 40% thar sem rett var 31% | teljarinn fylgdi ARSTIDINNI en nefnarinn (`_team_xg`) er summa yfir tha sem eru **i dag** skradir hja felaginu — tvo timabil i sama broti, og hja nyliðunum var nefnarinn **0** |
| **`net_transfers_event`** | hardur **`0`** hja ollum 587 i hverju sogulegu timabili | `?? 0` badum megin breytti VANTANDI i `0 − 0`; svidin eru hvergi i `player_seasons.json` (0 af 459 rodum) |
| **`mins_per_gi`** | Meslier **`0`** og EFSTUR a hlutfalls-dalki | vordurinn varði adeins nefnarann; `11 mork / 0 minutur` gaf „framlag a hverjum 0 minutum" |
| **`bsd_blocks`** | **sokn-tala i VORNAR-flokki** med `hi:true` — B.Fernandes 30, Haaland 24, medan midvordur med 132 hreinsanir syndi 5 | thetta eru HANS EIGIN skot sem voru blokkerud. Sannad tvivegis: `type === 3` i `bsd_shots.json` endurgerir toluna nakvaemlega fyrir 388 af 393 og ±1 fyrir 393/393; og ad bæta henni vid CBI brytur 0,90× hlutfallid vid FPL nakvaemlega thar sem skotmagnid er (MID 1,11×, FWD 1,27×) |
| **fimm `*_per_90` ur FPL-svidum** | `0.00` hja 54 leikmonnum med **0 minutur**, medan systkini i SOMU ROD syndu rettilega „—" | FPL geymir `0` fyrir tha sem aldrei spiludu. Verst: `gc_per_90`/`xgc_per_90` eru `hi:false`, svo **164 leikmenn sem aldrei spiludu satu EFST** sem bestu varnirnar |
| **`espn_in_box`** | 22 af 170 rangir, **11,8% kerfisbundid vanmat**; Semenyo/Pau/Awoniyi lasu hart **`0`** | ESPN-oradid „the left/right side of the **six yard box**" atti ENGA grein i svaeda-toflunni, svo skotin fengu `zone: null` og toldust **utan teigs**. Semenyo skoradi ur markteignum |
| **`pen_order`/`fk_order`/`ck_order`** | **tomir hja ollum 587** i sjalfgefnu utsyninni | getterarnir lesa hra FPL-svid; `player_seasons.json` ber thau ekki. Maelt eftir lagfaeringu: **0 -> 55** bera vitaroðina |

### Markmenn og DefCon

Maelt a `data/player_gw_2526.json`: markmenn eiga **NULL DefCon-stig i hverri
einustu leikja-umferd**, undir hverri sigtun sem reynd var (DEF ~6,2 ad
medaltali, MID ~5,8, FWD ~2,9). Samt syndi taflan `DC hit% 0% · DC n 36` fyrir
Raya — **maelingar-fullyrding um taekifaeri sem eru ekki til**. `pos:[2,3,4]`
er nu a ollum fimm DefCon-dalkunum, sama fordaemi og mo/ao-lagfaeringin.

**TVENNT ER ENN OLAGAD OG THAD ER EKKI SNYRTING:**
1. **Nefnarinn i DC-hittni eru LEIKIR, ekki BYRJANIR** thott badar noturnar
   segi „starts". Sannad: talan jafngildir leikja-talningu fyrir **537 af 537**
   leikmonnum en byrjunum fyrir adeins 81. Hver innkoma af bekknum — thar sem
   12-CBIRT threskuldurinn er ORNAEDANLEGUR — telst sem MISS. Deildar-hittni
   les 0,1361 en er raunverulega **0,1907 (+40%)**, og af thvi ad `p0`
   (samdrattar-forgildid) er vanmetid af SOMU villu erfir adlagada talan
   skekkjuna TVISVAR. **73 af 339 utileikmonnum skeika ≥5 prosentustigum**
   (Danso birtir 42% thar sem rett er 54%; Cook 39% a moti 88%).
2. **Lifandi smiðurinn gefur markmonnum DefCon fra GW1.** `computeDefcon`
   endurreiknar mælikvardann sjalfur og sendir markmenn i `cbirt`-greinina,
   sem hja theim er drifin af ENDURHEIMTUM (Roefs 333, Raya 304 — ad grípa
   boltann). Hermt a raunverulegum 2025/26-gognum: **211 af 757 markmanna-
   umferdum (27,9%) na threskuldinum.** `defcon.json.players` er tom i
   forleik, svo ekkert sest enn — thetta byrjar ad birtast **21. agust**.

### Vordur sem var ad maela VILLU, ekki reglu

`playerlist-sort.mjs` krafdist ad tom gildi saeust a toppnum i **minnst 3**
dalka-attum („maelt 4 af 121") — anti-tomleika-fullyrding. Eftir
lagfaeringarnar fell hun i **2**, og astaedan var sonnun um ad lagfaering hefdi
virkad: **thrjar af theim fjorum voru `Order`, `FK` og `Corners`** — dalkarnir
sem voru TOMIR VEGNA VILLU. Their toldust „null-berandi" af thvi ad their voru
bilaðir. Fast sogulegt tal um lifandi gogn urealdist thegjandi (sama aett og
„MEASURED: the range is 4-10"); golfid er nu **1**, thvi talan raest af thvi
hve margir dalkar eiga faerri en 31 gildi — eiginleiki GAGNANNA, ekki kodans.

### Tvaer profa-fullyrdingar sem gatu ekki fallid

- §15 „hver pos-dalkur ber ENN tolur innan sinnar stodu" keyrdi a **hrau**
  `players.json`. Thegar `pos` baettist a DefCon-dalkana fellu thrir — ekki af
  thvi ad lagfaeringin taemdi tha, heldur af thvi ad their lesa `_dc_*`-reiti
  sem AUDGUNIN setur. Fullyrdingin var ad maela annad en skjarinn synir; hun
  les nu audgadar radir, svo undanthagulistinn tharf ekki ad vaxa i hvert sinn.
- Profgognin fyrir `*_per_90` baru engar minutur og STADFESTU thvi gomlu
  hegdunina. Nu bera thau thaer, og null-tilfellid er profad VID HLIDINA.

### Svaeda-taflan var AFRITUD og badi afritin voru rong

`ZONE_RE` stod ordrett i BADUM `fetch.mjs` og `fetch-team-shots.mjs`, og bædi
vantadi markteiginn. Hun byr nu i `scripts/espn-zones.mjs` sem badar flytja
inn — thaer geta ekki rekid i sundur. Ordaforðinn var maeldur a **1.166
skotum (50 leikir)**: `six yard box` 57 skot (0,020–0,110 = markteigur),
`difficult angle` 31 skot, og `the penalty spot` **0 af 1.166** — DAUD grein
sem stod i toflunni. Rodin skiptir mali: „a difficult angle **and long range**"
verdur ad koma a undan „a difficult angle". Skot an svaedis eru nu **TALIN og
birt** (`no_zone`) svo thognin hafi staerd i skranni sjalfri.

### Omaeld fullyrding sem stod i TOOLTIP a skjanum

`pen_order` sagdi: *„The strongest single captaincy signal in the data."*
`grep -i captain docs/MAELINGAR.md` skilar EINU — heiti Triple Captain-chipsins.
**Engin fyrirlida-maeling er til i thessu repo-i.** Setningin var fjarlaegd.

---

## 17.8.2026 — DEFCON-PIPELINE: ÞRENNT RANGT, ALLT MÆLT

Framhald af dálka-úttektinni. Þrjú atriði sem hún fann en náði ekki að laga.

### Nefnarinn voru leikir, ekki byrjanir

`computeDefconHistory` og `computeDefcon` gættu báðar á `mins <= 0` og settu
töluna í reit sem heitir `starts`. Mælt á `data/player_gw_2526.json`
(`starts` er svið nr. 1 í `stats`-fylkinu og er til í öllum árgöngum frá
2223):

| staða | leikir | byrjanir | hittni á leiki | hittni á byrjanir | meðal-DC | hámark |
|---|---|---|---|---|---|---|
| MID | 5.288 | 3.553 | 0,1133 | **0,1675** | 5,75 | 29 |
| DEF | 3.904 | 3.150 | 0,2134 | **0,2632** | 6,24 | 27 |
| FWD | 1.412 | 823 | 0,0078 | **0,0134** | 2,86 | 21 |
| **GK** | **757** | **750** | **0,0000** | **0,0000** | **0,00** | **0** |

Útileikmenn í heild: **0,1361 → 0,1907, +40%.** Og skekkjan kom **tvisvar
við**: `p0` (samdráttar-forgildið) er reiknað úr sömu summum, svo aðlagaða
talan dró alla að meðaltali sem var sjálft vanmetið.

**Ekkert tímabil tapaðist við breytinguna** — mælt fyrir og eftir: aðeins
2025/26 stenst `anyHit`-gáttina í báðum tilvikum (2122 ber **engar byrjanir**
yfirleitt, en það tímabil var þegar fellt út því `dc` er skrifað sem 0 þar).
Raðir 537 → 435: 40 markmenn plús ~62 útileikmenn sem byrjuðu aldrei og fá nú
**enga röð** í stað hittni sem var reiknuð úr innkomum einum.

### Lifandi smiðurinn hefði byrjað að gefa markmönnum DefCon 21. ágúst

Sögulegi smiðurinn skrifaði markmönnum `hit_rate: 0` — slæmt en satt.
`computeDefcon` **reiknar mælikvarðann sjálfur** og sendi þá í `cbirt`-greinina
(`pos === 2 ? cbit : cbirt`), sem hjá markmanni er drifin af **endurheimtum**.
Hermt með nákvæmlega þeirri formúlu á raungögnum: **211 af 757 markmanna-
umferðum (27,9%)** ná þröskuldinum. `defcon.json.players` er tóm í forleik svo
ekkert sást — þetta hefði kviknað við fyrstu umferð.

Þröskuldarnir tveir voru ósammála um markmenn (`POS_THRESH.GK = 10` en
`pos === 2 ? 10 : 12` gaf þeim 12) og athugasemdin sagði „GK teljum sem
DEF-lík", sem lýsti hinu gagnstæða við kóðann — merki um að GK-tilfellið hefði
aldrei verið ákveðið. `DC_P0_FALLBACK`-færslurnar fyrir GK (0,02) voru
fjarlægðar: tilbúið forgildi má ekki liggja í leyni fyrir hóp sem er útilokaður.

### `_per_90` var per byrjun

`total / starts` er meðaltal **per leik**, svo talan var hærri hjá þeim sem
spilar 90 mínútur en þeim sem er skipt af eftir 60 — þótt hún héti per 90.
Enginn lesandi er í `src/`, svo `0 → null` er óhætt.

### TVÆR TÓMAR FULLYRÐINGAR, BÁÐAR MÍNAR EIGIN

**(a)** Fyrsta útgáfa lagfæringarinnar bjó til `agg[id]` **á undan** byrjana-
hliðinu og hljóp svo `continue`. Leikmaður sem byrjaði aldrei sat því eftir
með `starts: 0, hit_rate: 0` — nákvæmlega tilbúna nulltalan sem verið var að
laga, endurgerð í lagfæringunni sjálfri. Prófið fann það (1 fallin).

**(b)** Vörðurinn á per-90 var `/a\.mins/.test(body) && /\* 90/.test(body)`.
Hann **stenst áfram** eftir að deilingunni er snúið til baka, því
`a.mins += minutes` stendur eftir í söfnuninni. Stökkbreytingin gaf **0
fallnar** og prófið sagði ekkert. Hann mælir nú töluna sjálfa — og til þess
þarf leikmann sem **byrjar en er skipt af**: með 90 mínútum per byrjun gefa
báðar formúlur nákvæmlega sömu tölu (72/540×90 = 12 = 72/6), svo prófgögnin
hefðu ekki getað greint þær í sundur. **Fullyrðing sem getur ekki greint tvær
formúlur í sundur mælir hvoruga.** Með 45 mínútum: 24,0 á móti 12,0.

Þrjár stökkbreytingar staðfestar: GK-útilokun fjarlægð → 2 fallnar; byrjana-
hlið fjarlægt → 2 fallnar; per-90 aftur í per byrjun → 1 fallin (var 0 áður en
fullyrðingin var lagfærð). `defcon-shrink.mjs`: **29 stóðust, 0 féllu.**

---

## 17.8.2026 — „ÞÚ NOTAR HANN ALDREI" (neverStarted)

Beiðni notandans: *„Ég vil að appið sýni mér þann leikmann sem er minnst
notaður þegar ég er búinn að stilla upp liði fyrir kannski næstu 5–6 umferðir
og nota aldrei ákveðinn leikmann (þá vill ég að appið bendi á að líklega ætti
að selja hann) — þetta á ekki að gerast fyrir ódýrustu bench fodderana."*

**Undantekningin er kjarni reglunnar, ekki snyrting.** Ódýrasti bekkjarmaðurinn
**á** að sitja; það er hlutverkið hans. Að selja hann losar **ekkert fé** því
ekkert ódýrara er til, svo ábendingin væri ekki bara gagnslaus heldur **röng** —
hún segði „gerðu skipti" þar sem ekkert skipti er mögulegt.

**Verðgólfið er REIKNAÐ, ekki slegið inn.** Notandinn nefndi 4,0/4,5 og mælt á
`players.json` stemmir það nákvæmlega í dag:

| staða | lægsta verð | fjöldi á því verði |
|---|---|---|
| GK | £4,0 | 20 af 65 |
| DEF | £4,0 | 49 af 193 |
| MID | £4,5 | 25 af 259 |
| FWD | £4,5 | 12 af 70 |

En FPL færir verð á hverri nóttu og bætir við leikmönnum í janúar; harðkóðað
gólf yrði rangt þegjandi — sama ætt og „MEASURED: the range is 4-10" nótan.
Gólfið er því lægsta verð sem **er til** í stöðunni, lesið úr lauginni.

**Hún les EKKERT nema áætlun notandans** — enga FFDR, engin vænt stig, ekkert
`rankScore`. Fullyrðingin er staðreynd um plönunina („þú ætlar aldrei að spila
honum"), ekki mat á leikmanninum, og hún á hvergi heima í röðun.

**Þrjú skilyrði sem komu úr því að prófa hana á raungögnum:**
1. **Aðeins þegar notandinn hefur raunverulega planað.** Án þess væri
   ábendingin sjálfgefin: ósnertur bekkur „byrjar aldrei" í hverri umferð, svo
   appið hefði bent á sölu áður en notandinn gerði nokkuð.
2. **Sá sem hverfur úr hópnum í miðri áætlun er ekki flaggaður** — hann er
   þegar á förum og ábendingin væri að segja notandanum það sem hann veit.
3. **Þrjár umferðir eru lágmark.** „Aldrei" um eina umferð er ekki upplýsing.

**Prófliðið sannaði regluna óvart:** bekkur sjálfgefna liðsins er **allur á
verðgólfi** (Dubravka £4,0 · Thomas £4,0 · Hughes £4,0 · Walle Egeli £4,5), svo
`neverStarted` skilar réttilega **engu**. Til að sýna borðann þurfti að benkja
Haaland (£15,5) í öllum sex umferðunum — þá les hann *„frees up to £11,0"*
(15,5 − gólf 4,5).

**Ein útfærsla, ekki þrjár.** Lykkjan sem byggir liðið í tiltekinni umferð stóð
þegar tvisvar (`squadAt`, `chipValue`); þetta hefði orðið þriðja afritið.
Hún er nú `squadForGw` og báðar lesa hana — `buildTeamMetrics`-atvikið var
nákvæmlega þetta.

**Stökkbreytingar:** verðgólfs-undantekningin fjarlægð → 1 fallin í
`model.test` **og 2 í `smoke.test`** (bekkjar-maðurinn birtist og „frees up to
£0,0" kemur fram); „aldrei" slakað í „sjaldan" → 1 fallin. Vörður er á báðum
stigum: reglan í `model.test.mjs`, skjárinn í `smoke.test.mjs`.

> **ATH — VÖRÐUR SEM ER TÓMUR ÞANGAÐ TIL HANN ER SETTUR Á RÉTTAN STAÐ.**
> Fyrsta útgáfa DOM-varðarins var sett **aftast** í `smoke.test.mjs`, eftir
> kafla sem breyta umferð og endurstilla plönun. Borðinn var þá horfinn, og
> tvær af fimm fullyrðingum stóðust **í tómarúmi** (leitarsvæðið var tómt, svo
> „nefnir ekki bekkjarmanninn" var sjálfkrafa satt). Hann var færður fram fyrir
> kafla 3, þar sem ástandið er enn það sem prófið setti upp.

---

## 17.8.2026 — SÍUR TEKNAR ÚT, OG SMELLURINN SEM SÍAÐI SJÁLFUR

Notandinn: *„Það má taka þessa filteringu út og verðið Threshold ▾ — því núna
smelli ég á listann og filteringin dettur sjálfkrafa inn"*, síðan *„og líka
team filteringu"* og *„taka líka fit to play og my team hakið"*.

**Orsökin var mæld áður en nokkuð var fjarlægt, og hún var ekki fókus né
endurteikning:** hvert einasta tölu-hólf bar `onClick={() => filterOnValue(d, v)}`
með tooltip *„Click to filter (min N)"*. **Einn smellur á 239 hjá Haaland fór
með listann úr 587 af 587 niður í 1 af 587**, og `autoFocus` á nýja chip-inu tók
fókusinn úr töflunni í leiðinni. Eiginleikinn var beðinn um 8.8. sem *möguleiki*
á síun; hann síaði samstundis.

Fjarlægt: þröskulda-sían öll (stýring, chips, `filterOnValue`, haus-merki,
flokka-merki og smell-höndlararnir í hólfunum), verð min/max, liða-sían,
„fit to play", „my squad" — auk `StatPicker` (eini neytandinn), **29 dauðra
stílalykla** og ónotaðrar `teams`-prop. `hidePicked`/`onlyWatch` standa óbreytt.
**Engin `localStorage`-snerting:** PlayerList geymir aðeins `fpl_gwopen`,
`fpl_dense`, `fpl_cols`, svo ekkert gamalt blob getur borið fjarlægðan lykil.

> **APAPRÓFIÐ FANN RAUNVERULEGT HRUN SEM ÚRFELLINGIN OLLI.** `fold` (broddstafa-
> felling fyrir leit) stóð milli haus-athugasemdar `StatPicker` og fallsins
> sjálfs, svo úrklippan tók hana með — en `ColumnPicker` notar hana enn og
> **„Build table" féll með `fold is not defined`**. Það felldi líka
> `react-warnings.mjs`. Ekkert annað safn opnar þá braut með leit.

### Forleiks-borðinn fullyrti „587 af 587" og það var `Price > 0` í dulargervi

Fyrri útgáfa taldi **alla** `!live_only` dálka, og `now_cost` er nenni-núll hjá
öllum 587 — svo talan var alltaf full þekja. Verra: verð **endurstillist aldrei**,
svo borðinn hefði haldið áfram að fullyrða þetta **eftir** að FPL endurstillir —
nákvæmlega fúinn sem hann var skrifaður til að forðast. Hann telur nú dálka sem
**safnast yfir umferðir** (sama `rangeBlind`-forsenda og `rangeBanner` notar; með
`finished_gw === 0` getur nenni-núll þar aðeins verið síðasta tímabil), mælt yfir
**alla skrána** en ekki sýnilegu dálkana — því „Upcoming fixtures" á 0 slíka og
hefði flett borðanum yfir í ósönnu greinina. Skjárinn les nú **405 af 587**
(`minutes > 0` er 400; fimm til bera stig/mörk án mínútna — þekkta FPL-ósamræmið).

### `no_heat` — hitakortið mátti ekki fullyrða „bestur"

`heatScale` kann aðeins tvennt: hærra betra eða lægra betra. `starts_per_90` er
hvorugt — nótan segir sjálf að **báðir endar séu verri en miðjan** (~1,0 er
kjörið). Með `hi:true` fékk Jocelin.T (**2,37 úr EINNI byrjun í 38 mínútum**)
sterkasta græna litinn og las sem besti maður töflunnar, á dálki sem varar
sjálfur við nákvæmlega því. Röðun er óbreytt — það var **liturinn** sem laug.
Vörðurinn liggur á **tengingunni**, ekki gildinu: `stats.test.mjs` kafli 15c
krefst þess að `PlayerList.jsx` LESI reitinn inni í `heatScale`-smíðinni, svo
hann verði ekki flagg sem enginn les (`team_dc`-bilunin, kafli 6l).
Stökkbreyting: lesturinn fjarlægður → 2 fallnar.

---

## 18.8.2026 — ANDSTÆÐU-PRÓFUN Á EIGIN VERKI: EIN HRUNVILLA OG SEX TÓMAR FULLYRÐINGAR

Tvær samhliða úttektir voru settar á kóðann frá 17.8. — önnur átti að **brjóta
hann með illgjörnum inntökum**, hin að **stökkbreyta hverri nýrri fullyrðingu**
og finna þær sem geta ekki fallið. Báðar fundu raunverulegt.

### HRUNVILLAN — `priceFloors(null)`, og hún hefði hitt hvern einasta notanda

`export function priceFloors(players = [])` — sjálfgildið ver **aðeins
`undefined`**. Í `App.jsx` er `players` `useState(null)` og `unusedPlan`-memo-an
keyrir í **hverri teikningu**, svo `for (const p of null)` kastaði
`TypeError: players is not iterable`. `ErrorBoundary` er utan um allt appið og
**eina útgangan þar eyðir liðinu, fyrirliðanum, skiptaáætluninni og chip-unum.**

**Mæld, ekki ályktuð.** `localStorage` er samstillt en netið ekki, svo planið er
komið löngu áður en `players.json` skilar sér:

| töf á sókn | útkoma (fyrir lagfæringu) |
|---|---|
| 0 ms, 1 ms | teiknast |
| **5 · 20 · 50 · 120 ms** | **HRUN** |

Enginn vafri nær GitHub raw undir 5 ms, svo þetta hefði gerst **við hverja
hleðslu** hjá hverjum sem hafði bekkjar-víxl eða skipti í glugganum.

**Hvorugt prófasafnið gat séð það:** `data-resilience.mjs` skrifar aldrei
`fpl_planner_v3` og `untrusted-input.mjs` gefur heilbrigðar gagnaskrár. Villan
bjó nákvæmlega í bilinu á milli þeirra.

> **OG SÖGNIN UM HANA VAR SJÁLF PRÓFUÐ.** Hin úttektin sagði að hrunið
> sæist „aðeins undir stökkbreytingu", því `smoke.test.mjs` er grænt með
> nákvæmlega þessu ástandi. Það reyndist rétt athugað en röng ályktun:
> `smoke` notar `fetch`-hermi sem skilar **samstundis**, svo hann hittir aldrei
> gluggann. Málið var útkljáð með því að afturkalla EINGÖNGU null-vörðinn og
> keyra aftur: **5 ms og 50 ms hrundu bæði, 0 ms ekki.** Tvær úttektir sem
> stangast á eru ekki jafngildar — sú sem MÆLIR sviðið vinnur.

### Fimm aðrar veilur í sama kóða (allar mældar, allar lagaðar)

| einkenni | inntak sem framkallar | leiðrétting |
|---|---|---|
| `frees up to £NaN` á skjánum | einn leikmaður með `now_cost:"mikid"` | ómæld tala fær enga ábendingu |
| verðgólf **hrundi í 0** fyrir heila stöðu | einn leikmaður með `now_cost: null` (`Number(null)` er 0 og stenst `isFinite`) | `c <= 0` síað burt |
| „frees up to £0,0" — tillaga án tilgangs | `element_type` vantar → gólf óþekkt | vitum ekki gólfið → þegjum |
| seldur maður **flaggaður samt** | keyptur tvisvar, seldur tvisvar: `gws++` taldi **færslur**, ekki umferðir | talið á einkvæmum umferðum + viðmiðið er **síðasta umferð gluggans** |
| **keyptur og aldrei spilað = ÞÖGN** | kaup í GW1 flaggað, sömu kaup í GW2 þögn | sama regla: viðvera í síðustu umferð, ekki full þekja |

Það síðasta er verst og var **öfugsnúið**: „þú ætlar að KAUPA hann og aldrei
spila honum" er verðmætasta útgáfa ábendingarinnar og var einmitt sú sem gamla
reglan (`gws < perGw.length`) henti.

**Hliðið „hefur notandinn planað?" var of ódýrt:** `[[411,411]]` (víxl við
sjálfan sig) og `[[999998,999999]]` (id sem eru hvergi til) töldust bæði planun.
Nú er spurt hvort **byrjunarliðið sé raunverulega annað** en sjálfgefna
uppstillingin. Og orðalagið „You have planned 6 gameweeks" ofsagði — það sagði
það líka þegar ein umferð var snert; nú stendur „Looking at the next 6
gameweeks as you have them set up".

### Pipeline: tvennt til viðbótar

- **Tóm keyrsla gat þurrkað út `defcon.json`** og skráð `record(…, true, 0)` —
  grænt ljós yfir tapi. `out` verður tómt hvenær sem enginn ber jákvætt
  `starts`. Nú er gamla skráin **haldið** og RAUTT skráð; fyrsta keyrsla (engin
  skrá til) má áfram skrifa tómt, því það er upphafsstaða en ekki tap.
- **GK-gatið opnaðist um bakdyrnar:** `pos` kemur úr `posOf[id]`, og element sem
  er í live-skránni en vantar í bootstrap fékk `pos === undefined`, slapp gegnum
  `pos === 1` og var **skorað á endurheimta-brautinni** — sömu braut og markmenn.
  Nú verður staðan að vera **þekkt útileikmanna-staða**.

### SEX TÓMAR FULLYRÐINGAR — allar úr þessari lotu, allar mínar

1. **Tautólógía.** `ok(A||B||C ? true : r5.starts <= 6, …)` — `||` bindur fastar
   en `?:`, svo eina leiðin að `false` var `starts > 6` í prófi sem hefur **sex**
   umferðir. Mörk fölsku greinarinnar VORU hámark gagnanna. Stökkbreytingin sem
   hún heitir eftir hélst græn.
2. **`no_heat`-vörðurinn var uppfylltur af athugasemd.** Strippan tók aðeins
   `/* */`, ekki `//`. Að skipta lestrinum út fyrir `// no_heat: viljandi hunsað`
   hélt **öllum fjórum** fullyrðingunum grænum — fullyrðing sem segir sjálf
   „ekki aðeins nefnt í athugasemd". Nú er `heatScale` **keyrð** og kvarðinn
   mældur, með ómerktum dálki sem viðmiði.
3. **Tvítekning aðgreind með AFTANLIGGJANDI BILI slapp** gegnum alla þrjá
   einkvæmnis-verðina meðan hausinn birti „Goals · /90" tvisvar. Augað sér ekki
   bilið; vörðurinn má það ekki heldur.
4. **`counts.per90 >= 20`** — dálkarnir eru **22**, svo regla sem missir tvo fer
   í 20 og stenst, og skilaboðin prenta „nær yfir alla 20". Nákvæmlega sama lögun
   og `counts.bsd >= 20` sem hafði þegar sloppið einu sinni.
5. **400-stafa gluggi** í `smoke` var 22 stöfum frá því að verða tómur, og
   féll ranglega við 900. Nú er svæðið **elementið sjálft** úr DOM-inum.
6. **Athugasemd sem laug:** „profad nedar" um þögnina — sú fullyrðing var
   hvergi til. Nýtt safn `planner-idle.mjs` prófar fjórar hliðar.

> **OG NÝJA SAFNIÐ SANNAR MINNA EN ÞAÐ LÍTUR ÚT FYRIR — ÞAÐ ER SKRÁÐ Í ÞVÍ.**
> Bekkur prófliðsins er **allur á verðgólfi**, svo þögn hefur **tvær óháðar
> orsakir**: hliðið OG verðgólfs-undantekninguna. Mælt: stökkbreyting sem
> slekkur á hliðinu heldur safninu grænu. Það sannar því ÚTKOMUNA, ekki að
> hliðið sé það sem þaggar. Að sýna hliðið eitt þyrfti hóp með dýrum manni á
> bekknum án nokkurrar plönunar, og þann hóp er ekki hægt að smíða úr
> `localStorage` — hann kemur úr tengdu FPL-liði.

### Það sem stóð af sér árásina

`no_heat` mælt með jákvæðu viðmiði: **0 af 31** hólfum í `Starts/90` lituð
meðan `Starts` (20/31), `Start prob` (26/31) og 16 aðrir dálkar eru litaðir.
Engin ósýnileg sía eftir: **590 af 590** í öllum sex flokkum, óbreytt eftir
röðun og eftir smell á tölu-hólf, og skrun nær 590 einkvæmum röðum. Fjandsamleg
`localStorage`-blob eru öll hreinsuð rétt. Röðunin er stöðug.

---

## 18.8.2026 — C.2: FYRIRLIÐA-RÖÐUN, MÆLD (og hún vinnur MINNA en hún lítur út fyrir)

`captainScore = expPoints × startProb`. Bæði **innspýtt** — `expPointsFor` úr
`model.js`, `startProbability` úr `stats.js`; `captain.js` reiknar hvorugt,
hún margfaldar og raðar. Null byrjunar-líkur → hlutlaus 1 (útilokar ALDREI,
null-reglan), mælt `0` → útilokað, `expPoints ≤ 0` (auð umferð) → útilokað,
jafntefli brotin á nafni svo „besti fyrirliði" breytist ekki milli teikninga.

**Bakpróf: 174 umferðir, 5 tímabil, N=1, ~733 kandídatar per umferð.**

| röðun | meðal-stig | í raun-topp-3 | 10+ | ≤2 | valdi mann með 0 mín |
|---|---|---|---|---|---|
| dýrasti byrjunarliðsmaður (barnalegt viðmið) | 5,43 | 7,5% | 18,4% | 43,1% | 20/174 |
| `xP5` | 5,92 | 10,9% | 21,3% | 38,5% | 17/174 |
| `expPoints` eitt | 6,13 | 11,5% | 23,0% | 37,4% | 16/174 |
| **`rankScore` (það sem repo-ið á ÞEGAR)** | **6,62** | 14,4% | 21,8% | 33,9% | 11/174 |
| **CAPTAIN = expPoints × startProb** | **6,97** | 14,4% | 25,9% | **28,2%** | **6/174** |
| FPL-eigið `xP` (EFTIR Á) | 10,37 | — | — | — | — |
| óraklið | 17,21 | 100% | 100% | 0% | 0 |

**Liðirnir, bootstrap 400 klasað per leikmann** (staðallinn í `mo-candidates.mjs`):

| liður | Δ | 95% CI | niðurstaða |
|---|---|---|---|
| CAPTAIN − barnalegt viðmið | **+1,046** | [0,178, 1,902] | vinnur |
| byrjunar-líkna liðurinn | **+0,790** | [0,379, 1,178] | **stenst** |
| leikja-þyngd (inni í `expPoints`) | +0,133 | [−0,241, 0,649] | ógreinanlegt við N=1 |
| víta-yfirlag w=0,10 / 0,25 / 0,50 | −0,081 / −0,300 / −0,331 | öll innihalda núll | **fellt** |

### ÞRENNT SEM MÁ EKKI SNÚA UPP Í SIGUR

1. **Barnalega viðmiðið er ekki strámaður.** „Dýrasti byrjunarliðsmaður" velur
   Haaland í 96 af 174 umferðum og Salah í 71. Forskotið er +1,5 stig
   (+3 með borðanum) — raunverulegt, ekki risavaxið.
2. **CAPTAIN er EKKI greinanlega betri en `rankScore` sem er þegar til:**
   +0,351, CI **[−0,420, 1,122]**, per tímabil +0,40 / +0,88 / +0,69 / 0,00 /
   −0,20. Rökin fyrir módúlnum eru að hann er á **stiga-kvarða** og ber
   byrjunar-líkur — **ekki** að hann skori hærra. `CAPTAIN_MEASURED.vsRankScore`
   ber `"indistinguishable"` og vörður fellur ef einhver skrifar sigur-fullyrðingu
   sem vikmörkin styðja ekki (stökkbreyting M8 staðfesti það).
3. **Leikja-þyngdin er ógreinanleg við N=1.** Hún stendur eingöngu af því að
   hún tilheyrir `expPointsFor`, sem kallandinn á — módúllinn fullyrðir
   ekkert um hana.

**`includeBlanks: true` er burðarvirki, ekki stilling:** með sjálfgefnu lauginni
er bekkjaði leikmaðurinn EKKI í gögnunum, svo byrjunar-líkur gætu ekki tapað.
Stökkbreyting í `false` setur „0 mínútur" í 0/174 hjá ÖLLUM röðunum.

**Ekki tekið, þótt það liti betur út:** `startProb^1,5` (+0,201, CI [−0,025,
0,427]) og `^2` — vikmörk innihalda núll, svo k=1 og engin stilling. Gólf í
ætt við `MIN_START_PROB` (0,15/0,30/0,50) breytir valinu í **nákvæmlega núll**
umferðum þegar margföldunin er komin, svo það er ekki í kóðanum.
`rankScore × startProb` er VERRA en bert `rankScore` (6,53 á móti 6,62) —
`rankScore` er ekki á stiga-kvarða.

### VÍTA-FULLYRÐINGIN SEM VAR PRÓFUÐ, EKKI ERFÐ

Hún heldur ekki, og **auðkenningin er bindandi takmörkun**: committuð saga ber
**enga `penalties_order`**. `players.json` hefur hana fyrir yfirstandandi
tímabil eitt, `player_seasons.json` ber `penalties_missed` en ekki
`penalties_scored`. Eina leka-lausa taka-auðkennið er „misnotaði víti í fyrri
umferð" — nákvæmni 1,0 en léleg endurheimt: **59 leikmenn, 4.218 af 126.730
röðum**. Á þeim hópi er punktmatið neikvætt við allar þrjár vogtölur og ekkert
vikmark útilokar núll.

> **RÉTTA SETNINGIN ER ÞRÖNG:** yfirlagið **mældist ekki hjálpa á þeim hópi sem
> hægt er að auðkenna án leka** — ekki að vítaspyrnur skipti ekki máli. Að víkka
> hann þarf nýja heimild; BSD hefur vítin en aðeins 2025/26, og „BSD í bakprófin"
> er þegar mælt og fellt (kafli 4).

**OG FULLYRÐINGIN LIFÐI Á SKJÁNUM.** Setningin sem var fjarlægð úr `stats.js`
17.8. stóð enn í `SetPieces.jsx`: *„the no. 1 penalty taker is the strongest
single captaincy hint the data holds"* — **skáletruð beint á eftir orðinu
`measured`**. Hún var ekki lengur aðeins ómæld heldur **mæld og felld**.
Textinn segir nú það sem mælingin styður: föst leikatriði eru þess virði að
vita fyrir sig, en þau eru **ekki** fyrirliða-flýtileið.

**Stökkbreytingar: 12, allar gripnar** — m.a. sleppa `startProb` (22 fallnar),
leggja saman í stað þess að margfalda (20), `null → 0` (4), raða öfugt (3),
fela auka-lið í skorinu (3), og skjöl sem fullyrða sigur sem vikmörkin styðja
ekki (1). `tests/captain.mjs`: **69 stóðust, 0 féllu**, eins í þremur keyrslum.

---

## 18.8.2026 — C.1: SÖLU-RÁÐGJÖFIN, ÞRÍR HANDSETTIR LIÐIR MÆLDIR OG FELLDIR

Stærsta standandi skuldin, þrjú handover í röð. Skorið er nú í
`src/recommend.js`. **Jafngildið var sannað ÁÐUR en nokkurri tölu var breytt:**
frumritið er lesið **beint úr git** (`git show 264a50c:src/App.jsx`) og keyrt
sem fall — ekkert handafrit. Yfir 6 atburðarásir var öll útkoman (`byPos`,
`sellIds`, `inSquadScores`, `advisorById`, 606 raðir hver) **eins**. Að hreyfa
einn fasta (2,2 → 2,3) felldi allar sex, svo samanburðurinn er ekki tómur.

| liður | niðurstaða | ákvörðun |
|---|---|---|
| `ep × 1,2` | topp-15 **+2,002** CI [1,608, 2,385], LOSO 5/5 | **HELDUR** |
| víta-taki `+2,2` | topp-4 **+1,221** CI [0,680, 1,739], LOSO 4/4 | **HELDUR** |
| `mins > 400` | þröskuldur 0→1800 gefur **sömu ákvörðun** (22,146) | heldur, **merktur ÓVIRKUR** |
| `banPen` −2,5/−1 | topp-15 **−0,143** CI [−0,249, −0,057] | **BURT — SKAÐAR** |
| `rotPen` −2/−0,8 | öll vikmörk innihalda núll, LOSO vinnur 0/5 | **BURT — ógreinanlegt** |
| `dcB` | kafli 4 hafnaði DefCon í röðun þegar | **BURT — fylgir höfnuninni** |

> **`banPen` VAR EKKI BARA ÓMÆLDUR — MERKIÐ SNÝR ÖFUGT.** Leikmenn nálægt banni
> skora **13,09** á móti **11,21** hjá öllum öðrum: gul spjöld safnast á þá sem
> spila HVERJA MÍNÚTU. Sama undirskrift og DefCon-höfnunin — refsingin dró niður
> nákvæmlega þá sem eiga mestu mínúturnar.

**Tvær af þremur „ómælanlegu" reyndust mælanlegar og forsendan var röng.**
`banRisk` les `yellow_cards` og `rotationRisk` les `starts` — hvort tveggja er
dálkur í `fpl_player_gw.json`, svo uppsafnað ástand **fyrir** umferð t er
reiknanlegt og leka-laust. Báðar mældar með sjálfum föllunum sem appið keyrir,
báðar féllu. Aðeins **tiltækileika-fjölskyldan** er raunverulega ómælanleg
(`status`/`chance_of_playing`/`news` eiga enga sögu); hún **stendur**, sem
útflutt `UNMEASURED_UI` þar sem hausinn segir berum orðum að tölurnar séu
**valdar, ekki mældar**. Að fjarlægja hana myndi endurvekja raunverulega villu
sem notandi tilkynnti (meiddur J. Timber í 2. sæti varnarmanna 7.8.2026).

### SÖLU-RÖÐUNIN — MÆLD, OG SVARIÐ VAR „ENGIN BREYTING"

`rankScore` á móti `score` á **botninum**, sem er það sem sölu-mælikvarði gerir:
hermdir 15-manna hópar, botn-2, 100 hópar per umferð. **−0,118 CI [−0,328,
+0,088]** og **−0,187 CI [−0,393, +0,009]** — **ógreinanlegt í báðum laugum**.
Yfir alla deildina vinnur `score` beinlínis (0,291 á móti 0,766).
**Engin mæling styður að skipta, svo `score` stendur.** CLAUDE.md sagði
`rankScore` raða „tillögum" — satt um kaup, ósatt um sölur, og sölu-leiðin var
hvergi nefnd í þrjú handover. Línan ber nú kvalifíkatorinn.

### MÆLITÆKIÐ VAR BILAÐ FYRST — OG ÞAÐ LAS EINS OG HREINT NULL-SVAR

`buildPanel` reiknar `fdr` á leikinn en **afritaði hann aldrei á röðina**, svo
`r.fdr` var `undefined` á **öllum 126.730 röðum**. Mæling sem las hann fékk NaN
— og **`Array.sort` með NaN skilur röðina ÓSNERTA**, svo hver einasti delta
mældist **nákvæmlega 0,000**. Það er versta mögulega útkoman: ekki hrun, ekki
augljóst rugl, heldur **fullkomlega trúverðugt núll**. Sú tala var keyrð og
nærri því trúað.

Röðin ber nú báðar tölur og heitin segja hvor er hvað — `fdr` er **opinbera
FPL-talan (inntak)**, `ffdr` er **okkar útkoma** (kafli 3). Vörður í
`tests/recommend.mjs` fellur bæði ef `fdr` hverfur aftur (2 fallnar) **og ef
einhver „lagar" hann með því að afrita `ffdr` í hann** (1 fallin) — því sú
lagfæring myndi endurvekja gildruna í dulargervi.

**Stökkbreytingar: 15, allar gripnar** — m.a. að setja hvern fjarlægðan lið inn
aftur (bæði beint og gegnum raunveruleg `banRisk()`-köll), breyta hvorri mældri
tölu sem er, endurvekja `45`-tvítekninguna, bæta dauðri deps við, fjarlægja
`seasonGames` úr deps, raða sölum eftir `rank`, og benda frosnu útgáfunni á
blokk sem er ekki til (fellur hátt, ekki þögult).

### OG VÖRÐUR SEM TALDI KALLSTAÐI Í EINNI SKRÁ

`tests/set-pieces.mjs` taldi `setPieceOf(p, spRanks)` **í App.jsx einni** og
krafðist **≥ 3**. Útdrátturinn flutti einn kallstað í `recommend.js` og safnið
varð rautt þótt kóðinn væri réttur — tvöföld harðkóðun (ein skrá, ein tala).
Hann **finnur nú sjálfur** alla kallstaði í `src/` og krefst þess að hver og
einn sendi tvö rök, með forsendu um að minnst einn hafi fundist. Stökkbreyting
sem sleppir röðuninni **í `recommend.js`** — sem gamli vörðurinn gat
byggingarlega aldrei séð — fellir hann nú.

---

## 19.8.2026 — BSD: `?limit=5` VAR FELLT, OG VILLAN BAR EKKI SVARIÐ

Notandinn lét mig fá BSD-lykilinn, sem gerði greininguna mögulega. **Lykillinn
fór hvergi í skrá né commit** — repo-ið er public (kafli 1) — aðeins í minni.

`bsd_live`, `bsd_lineups` og `bsd_odds` féllu öll á hverri keyrslu frá
aðfaranótt 18.8. með `BSD HTTP 400 /leagues/1/seasons/?limit=5`. Ég hafði áður
staðfest að **auðkenningin væri í lagi** (án lykils fæst 401, pipeline-in með
lykli fékk 400), svo þetta væri beiðnin sjálf — en lengra varð ekki komist.

**Svarið lá í svarbolnum allan tímann:**

```
{"detail": "Unknown query parameter(s): limit.",
 "unknown_parameters": ["limit"], "accepted_parameters": []}
```

`bsdGet` henti bolnum og skilaði aðeins stöðukóðanum. **Sama ætt og
elo-sóknin sem sagði eitt orð („timeout"):** talan ein greinir ekkert.
Villan ber nú bolinn með (180 stafir), svo næsta API-breyting greinir sig sjálf.

**Og reglan er endapunkts-bundin, ekki almenn** — það var prófað svo enginn
fjarlægi `limit` alls staðar:

| kall | staða |
|---|---|
| `/leagues/1/seasons/?limit=5` | **400** — `accepted_parameters: []` |
| `/leagues/1/seasons/` | 200, 35 tímabil, `is_current` finnst |
| `/events/?…&status=notstarted&limit=30` | 200, 380 leikir |
| `/events/?…&limit=200&offset=0` | 200 |
| `/events/?…` (án limit) | 200 |
| `/events/live/` | 200 |

Handvirku skrifturnar (`fetch-bsd.mjs`, `fetch-bsd-teams.mjs`) voru **þegar
réttar** — aðeins `fetch.mjs` bar `?limit=5`. Staðfest með því að keyra
raunverulegt `bsdCurrentSeason()` úr `fetch.mjs`: **season_id 1058
(„Premier League 26/27"), 380 leikir**.

### `sp_xg_share` — NEFNARINN VAR RANGUR OG ÞAÐ ER SANNAÐ Á GÖGNUNUM

`sp_xg` og `op_xg` skipta á milli sín **npxG** (víti er hvorki í `SET_PIECE` né
`OPEN_PLAY`), en hlutfallið deildi með **heildar-xG að meðtöldum vítum**. Þau
þrjú stemmdu því ekki: á skjánum las Bruno Fernandes
`xG 10,88 · npxG 6,15 · SP 0,96 · SP% 9% · OP 5,18` — SP+OP = 6,14 og
**4,73 xG hvergi taldir**.

**Mælt á öllum 316 leikmönnum með gögn:**

| samanburður | fjöldi sem stemmir ekki |
|---|---|
| SP + OP ≠ **`np_xg`** | **0 af 316** |
| SP + OP ≠ `xg` | **25 af 316** — nákvæmlega vítaskytturnar |

Nefnarinn verður að vera það sem hlutarnir tveir mynda. Dæmi: xG 10, víti 4,
SP 2, OP 4 → hlutfallið fer úr **0,200 í 0,333**.

> **VÖRÐURINN HVÍLIR Á VÍTA-TILFELLINU OG ÞAÐ ER ÁSETNINGUR.** Hjá vítalausum
> leikmanni er npxG = xG, svo **báðar formúlur gefa sama svar** — próf sem
> notaði slíkan mann einan gæti ekki greint þær í sundur. Prófið segir það
> berum orðum og ber báðar hliðar.

**Þetta var eitt af tveimur atriðum sem biðu `BSD_KEY`.** Kóðinn er nú réttur,
en talan á skjánum breytist ekki fyrr en `scripts/fetch-bsd.mjs` er keyrð
aftur — `sp_xg_share` er **geymt** gildi í `bsd_players.json`, ekki reiknað í
appinu. Hitt atriðið (40 útileikmenn sem sýna „—" í stað `0`) bíður sömu
keyrslu; kóðinn þar var lagaður 11.8. en skráin er frá 9.8.

---

## 19.8.2026 — BSD ENDURSÓTT: MATCHERINN TAPAÐI SEX MÖNNUM, OG LAGFÆRINGIN BJÓ TIL RANGA PÖRUN

Lykillinn frá notandanum gerði endurkeyrslu mögulega. **Hann fór hvergi í skrá
né commit** — repo-ið er public.

### Fyrsta keyrsla: kóðinn lagaðist, gögnin töpuðu sex mönnum

`sp_xg_share` og skotlausu leikmennirnir lagfærðust eins og til stóð
(Thiago 0,108 → 0,165; 77 menn fóru úr `null` í mælt `0`). **En skráin fór úr
393 í 387 og sex RAUNVERULEGIR leikmenn hurfu** — Bruno Guimarães (30 leikir,
2.455 mín, 42 skot), Brennan Johnson, Lukić, McNeil, Guessand og Awoniyi.
Allir sex eru **virkir í FPL í dag**.

**Orsökin er nákvæmlega Meslier-villan aftur** (kafli 3): `c.pool` er
FPL-leikmenn hjá félaginu **í dag**, en BSD ber félagið sem hann spilaði fyrir
**í fyrra**. Allir sex skiptu um félag í sumarglugganum:

| leikmaður | BSD (25/26) | FPL í dag |
|---|---|---|
| Bruno Guimarães | NEW | ARS |
| Brennan Johnson | CRY | EVE |
| Lukić | FUL | IPS |
| McNeil | EVE | CRY |
| Guessand | AVL | CRY |
| Awoniyi | NFO | COV |

Þeir voru í skránni frá 9.8. af því að skiptin höfðu ekki gerst þá. **Þetta
hefði versnað með hverjum degi gluggans.**

### Lagfæringin: seinni umferð — og hún bjó til RANGA PÖRUN

Bætt við annarri umferð í `pairPlayers` sem keyrir **aðeins** á þeim sem
fundust ekki í eigin laug, leitar í öllum ótekknum, og krefst **bæði** sterkara
nafns (0,85 í stað 0,6) **og** að mínúturnar stemmi.

**Fyrsta útgáfa hennar paraði BSD „James Wilson" (TOT, 2 leikir, 0 mín) við
FPL „Callum Wilson" (BRE)** — sitthvorn manninn. Mínútu-vörnin hleypti því í
gegn af því að **báðar hliðar voru 0**: `|0 − 0| = 0`. Tvö núll eru ekki
samkomulag, þau eru **skortur á gögnum**.

**Mælingin fann það, ekki lesturinn:** valideringin gegn FPL féll úr
skjalaða 0,9998 í **0,9982 (mínútur)** og **0,9948 (mörk)**, með **einu**
fráviki yfir 200 mínútur. Sú tala var það eina sem benti á villuna.

Eftir að núll-gatið var lokað (`cm <= 0 || fm <= 0 → sitja hjá`):

| | fyrir | eftir |
|---|---|---|
| leikmenn með FPL-kóða | 393 | **415** |
| r(mínútur) gegn FPL | 0,9982 | **0,9998** |
| r(mörk) gegn FPL | 0,9948 | **0,9998** |
| frávik > 200 mín | 1 | **0** |
| Callum Wilson-pörunin | til staðar | horfin |

**Tveir standa enn úti** (Brennan Johnson, Guessand) og það er RÉTT: seinni
umferðin **situr hjá** þegar sönnunin er ekki nógu sterk. Að para þá myndi
krefjast þess að slaka á nafni eða mínútum, sem er einmitt það sem víxlaði
Wilson-bræðurna.

> **REGLAN SEM STENDUR EFTIR:** mínúturnar eru öryggið í nafna-pörun yfir
> félagsmörk — en **aðeins þegar þær bera upplýsingar**. Núll á móti núlli er
> engin sönnun, og vörður sem tekur því sem samræmi er verri en enginn.

### `tests/bsd.mjs` varði GÖMLU SKRÁNA, ekki regluna

Fullyrðingin var „leikmenn án skota fá null í xG, ekki 0". Kóðinn var lagaður
**11.8.** (`per()` á skot-sviðin) en skráin var frá **9.8.**, svo prófið
staðfesti gamla ástandið. Endurkeyrslan leiddi það í ljós. Reglan er nú rétt
orðuð: sá sem **spilaði** en skaut ekki ber **mælt 0**; **hlutföllin**
(`xg_per_shot`, `sp_xg_share`) eru **null**, því þau eru óskilgreind án skota.

---

## 20.8.2026 — DC-MIÐJUMENN OG FFDR-HALLINN: MEKANISMINN ER RAUNVERULEGUR, RÁSIN ER LOKUÐ

**Spurning eiganda:** *„Spurning hvort að FFDR hjá t.d. Sangaré sé rétt, hann er
DC miðjumaður sem ætti að fá fleiri stig í erfiðari leikjum, t.d. á móti
A.Villa úti í GW6."*

Skrifta: **`scripts/measure-defcon-ffdr.mjs`** (handvirk, ekki í `npm test`).
Deterministísk, ~20 s, engin ytri köll.

### ÞETTA VAR ÞRIÐJA SPURNINGIN, EKKI ENDURUPPTAKA Á TVEIMUR

Tvær fyrri mælingar eru nálægt en **svara henni ekki**, og það er ekki
formsatriði:

| mæling | hvað hún spurði | hvað hún notaði |
|---|---|---|
| „Varnarsinnaðir miðjumenn fá varnar-FFDR" (28.7., `ffdr-player-points.mjs` kafli C) | HVOR FFDR-breytan (`useDef` eða sóknar) fylgir stigum betur — **r** | xGI/90 úr FYRRA tímabili sem **proxy** fyrir varnarsinna; laug **2223–2526**, þ.e. 2025/26 var INNI en þynnt ~4:1 af tímabilum þar sem DefCon gaf NULL stig |
| `tests/defcon-mid.mjs` (29.7.) | SAMA spurning, með RÉTTU skilgreiningunni | raun-DefCon, **2025/26 EINGÖNGU**, GW1–19 -> GW20+ |
| **HÉR (20.8.)** | er **HALLINN** flatari eða snúinn hjá há-DC miðjumönnum | raun-DefCon, 2025/26, innan leikmanns |

**`expPointsFor` notar ekki r.** Hún notar `lookupPos(3,"pts",d)/POS_MEAN_PTS[3]`
— **hallann**. Tvær breytur geta haft sama r og allt annan halla, svo hvorug
fyrri mælingin gat svarað eigandanum. **Þær voru því ekki staðnaðar; þær voru
um annað.** Það sem VAR staðnað er orðalagið í kafla 4 um mekanismann sjálfan:
„DC fylgir *þyngri* leikjum" stóð þar sem **fullyrðing án tölu** frá 27.7.

### KAFLI 0 — FYRST VAR SANNREYNT AÐ STIGIN SÉU TIL

Ekkert hér þýðir neitt nema 2025/26 sé raunverulega heimur þar sem
varnaraðgerðir borga. Stigin voru endurbyggð úr þáttunum (koma-við, mörk,
assist, hreint blað, mörk á sig, vörslur, bónus, kort) og **leifin** skoðuð
við DC-þröskuld í `data/player_gw_2526.json`:

| | leif |
|---|---|
| DC-þröskuldi náð | **+2 í 1.398 af 1.443 röðum (96,9%)** |
| ekki náð | **0 í 9.794 af 9.918 röðum (98,7%)** |

Restin er vítaspyrnur (−2/+5) og tvöfaldar umferðir. **DefCon-stigin eru í
`pts`.** Um leið fellur röksemdin sem hefði réttlætt endurmælingu í eldri
tímabilum: þar er þetta ekki „ómælt", það er **ekki til**.

### LAUGIN

**3.580 MID-BYRJANIR, 209 leikmenn, 2025/26.** Nefnarinn er **byrjanir, ekki
leikir** (lagað 17.8., +40%); markmenn útilokaðir (757 umferðir, 0 stig).
DC-þröskuldi (12+) náð í 583 röðum (16,3%). FFDR kemur úr **`makeFixDifficulty`
sem er FLUTT INN** úr `src/model.js` með pos 3 (`DIFF_W[3].useDef === false`,
þ.e. sóknarhliðin — nákvæmlega það sem appið gefur miðjumanni í dag).
`fpl_player_gw.json` er notuð fremur en `player_gw_2526.json` af því að hún ber
**dagsetningu og lið per röð**, sem uppflettingin þarf; nafn er gildur lykill
**innan** eins tímabils (nafna-pörunartapið 2,4–7,5% er per tímabila-skil).

Skilgreining á „DC-maður": **`hit_rate_adj`** = `(hits + 10·p0)/(starts + 10)`,
p0(MID) = 0,17 — afturvirkjaða talan úr 6l, valin því hrá hittni ofmælist á
litlum sýnum (FFS: enginn yfir ~57%, okkar n=10–15 gáfu 75–80%).
`r(hit_rate_adj, CBIRT/90) = 0,644`, svo hún mælir sama eiginleikann.

### INNAN LEIKMANNS ER RÉTTA FORMIÐ, OG ÞAÐ ER SAMA LÆRDÓMUR SEM 6c GAF

Þversniðs-halli blandar tvennu: há-DC miðjumenn spila fyrir **aðra
liðshelminginn** (þeir verjast meira), svo þversnið mælir að hluta liðið, ekki
leikinn. Báðar breytur eru því **dregnar frá HANS EIGIN meðaltali**. Sama gildra
og „heitur leikmaður": hráa talan mældi bara að góðir leikmenn skora oft.

### NIÐURSTAÐAN — VÍXLVERKUNIN, bootstrap KLÖSUÐ PER LEIKMANN, 400 ítranir

| útfærsla | n | halli(HÁTT) − halli(LÁGT), innan leikmanns |
|---|---|---|
| tíma-heiðarleg (GW1–19 -> GW20+) | 470 + 500 | **0,000 CI [−0,301, +0,296]** |
| allt tímabilið (leave-one-row-out) | 1.153 + 1.220 | **+0,029 CI [−0,145, +0,233]** |

**Fimm næmis-útfærslur, 0 af 5 útiloka null:** topp-desíl á móti neðri helmingi
+0,135 CI [−0,092, +0,360] · hrá hittni −0,002 CI [−0,201, +0,207] · CBIRT/90
sem skilgreining +0,041 CI [−0,124, +0,217] · aðeins mín≥60 +0,053
CI [−0,148, +0,256] · samfelld `d` í stað þreps +0,210 CI [−0,260, +0,776].

### SUNDURLIÐUNIN SÝNIR HVERS VEGNA — OG MEKANISMINN ER RAUNVERULEGUR

Há-DC hópurinn (n=1.153), meðaltal per þrepi:

| þrep | n | stig | koma-við | mörk+ass | CS | **DEFCON** | bónus | kort |
|---|---|---|---|---|---|---|---|---|
| 0 | 164 | 4,15 | 1,94 | 1,10 | 0,39 | 0,52 | 0,40 | −0,18 |
| 1 | 143 | 4,45 | 1,96 | 1,23 | 0,31 | 0,73 | 0,45 | −0,23 |
| 2 | 136 | 3,82 | 1,95 | 0,77 | 0,35 | 0,68 | 0,28 | −0,20 |
| 3 | 142 | 3,90 | 1,93 | 0,87 | 0,31 | 0,68 | 0,27 | −0,16 |
| 4 | 213 | 3,41 | 1,94 | 0,75 | 0,21 | 0,59 | 0,23 | −0,30 |
| 5 | 355 | **3,35** | 1,95 | 0,51 | 0,15 | 0,77 | 0,19 | −0,21 |

**Stigin FALLA, 4,15 -> 3,35.** Innan leikmanns, halli per þrepi:

| þáttur | HÁTT DC | LÁGT DC |
|---|---|---|
| mörk + assist | **−0,123 CI [−0,210, −0,035]** | **−0,156 CI [−0,258, −0,059]** |
| hreint blað | −0,051 | −0,051 |
| bónus | −0,049 | −0,036 |
| koma-við | −0,004 | −0,003 |
| **DEFCON-stig** | **+0,007 CI [−0,032, +0,048]** | +0,002 CI [−0,007, +0,009] |

**MEKANISMINN Í HRÁU TÖLUNNI ER SAMT RAUNVERULEGUR — og hann var fullyrðing
til í dag.** Innan leikmanns, á öllum MID-byrjunum:

| | halli per þrepi |
|---|---|
| DC-aðgerðir (CBIRT) | **+0,123 CI [0,032, 0,216] — ÚTILOKAR NULL** |
| DC/90 | **+0,150 CI [0,062, 0,243] — ÚTILOKAR NULL** |

**Eigandinn hefur rétt fyrir sér um mekanismann. Þröskuldurinn eyðir honum.**
+0,12 til +0,19 aðgerðir per þrep gefa **0,6–0,9 aðgerðir yfir ALLT
þrepasviðið** — og þröskuldurinn er **12**. Merki sem hreyfist um 0,9 færir
engan yfir stall sem er 12 hár nema hann standi þegar á honum, og
þröskuldur-stigagjöf er stallafall, ekki línuleg.

### STÆRÐIN — RÁSIN BUNDIN

DEFCON-liðurinn er **eina leiðin** sem þyngri leikur getur gefið DC-miðjumanni
FLEIRI stig (koma-við er fast; mörk/assist og hreint blað fara bæði NIÐUR), svo
það er hann sem á að binda — og hann er þéttari en heildar-hallinn:

| | stig |
|---|---|
| DEFCON-rás, punktur, yfir þrep 0->5 | **0,03** |
| DEFCON-rás, **efri CI-mörk** | **0,24** |
| leikja-spönn líkansins fyrir MID, grunn 4,5 | **1,89** (margfaldari 1,234 -> 0,814) |
| viðmið: dómara-spjöldin, FELLD | 0,088 með FULLKOMINNI vitneskju |

Í besta falli (efri CI, grunnur 3,0) er þetta **19%** af leikja-spönninni; á
punktinum **1–3%**. Umfang: 52 há-DC miðjumenn, 1.153 byrjanir, 49% þeirra í
þrepi 4–5. DEFCON-stig eru 18,0% af stigum há-DC miðjumanns (0,67 af 3,73).

### STÖÐUGLEIKINN — FORMERKIÐ SKIPTIST, SAMA UNDIRSKRIFT SEM FELLDI 28.7.

| helmingur | HÁTT DC | LÁGT DC | víxlverkun |
|---|---|---|---|
| GW1–19 | −0,256 | −0,345 | **+0,089** |
| GW20–38 | −0,205 | −0,142 | **−0,063** |

Þetta er nákvæmlega undirskriftin sem felldi varnar-FFDR 28.7. („besta w hoppar
milli tímabila og **skiptir formerki**") og stöður-gegn-liðum 28.7. — nema nú
milli **helminga eins tímabils**, sem er verra, ekki betra.

### NULLIÐ ER NULL, EKKI BROTIÐ MÆLITÆKI

Þetta er lærdómurinn úr 5b í `CLAUDE.md` beitt á eigin mælingu: fullyrðing sem
finnur ekkert er verðlaus nema hún geti fundið eitthvað. **Sami mælir, sömu
raðir, sama bootstrap** skilar **þrem** niðurstöðum sem útiloka null: mörk+assist
−0,123, DC-aðgerðir +0,123, DC/90 +0,150. Mælitækið virkar; rásin er tóm.

### ERKITÝPAN SJÁLF

**Tveir miðjumenn í `players.json` bera `web_name` „Sangaré"**, og það skiptir
máli fyrir spurninguna:

| | lið | byrjanir | mín | stig |
|---|---|---|---|---|
| **Mamadou** Sangaré (id 565) | Brentford | **0** | **0** | 0 |
| **Ibrahim** Sangaré (id 488) | Nott'm Forest | 25 | 2.073 | 89 |

GW6 er **Aston Villa – Brentford**, svo eigandinn meinar **Mamadou**, sem á
enga PL-sögu og getur ekki verið í lauginni. Ibrahim er hins vegar erkitýpan
og hann er í efsta DC-tertíl (hittni 9/25 = 36%, afturvirkjuð 31%, CBIRT/90
4,1). **Hans eigin halli er −0,42 stig/þrep** — steypri en hópsins. Í þyngsta
þrepinu (12 byrjanir) fékk hann 2,42 stig/leik og **0,50 DEFCON-stig**, á móti
4,00 og 2,00 í léttasta. Lýsing á einum manni, ekki mæling — en hún dregur ekki
í þá átt sem spurningin gerir ráð fyrir.

### NIÐURSTAÐA — HAFNAÐ Á ÖLLUM ÞREM ÁSUM

**Marktækni:** víxlverkunin inniheldur null í báðum aðal-útfærslum og í 5 af 5
næmis-útfærslum. **Stærð:** 0,14 stig yfir allt sviðið, rásin bundin við 0,03
(0,24 í besta falli) — undir dómara-spjöldunum sem voru felld. **Stöðugleiki:**
formerkið skiptist milli helminga.

**Engin breyting á `fixDifficulty`, `expPointsFor` né `rankScore`.** DC lifir
áfram þar sem hann lifði: á spjöldum, í dálkunum og í `hit_rate_adj`.

**HVAÐ MYNDI SETTLA ÞETTA (ef einhver vill spyrja aftur):** ekki fleiri
útfærslur á sömu gögnum — **fleiri tímabil með DefCon-stigagjöf**. Núverandi
n=3.580 MID-byrjanir gefur CI-breidd ~±0,19 stig/þrep á víxlverkuninni; til að
skera 0,03 frá null þyrfti breiddina niður í ~0,03, sem er **~40× úrtakið** eða
~40 tímabil. Það er ekki bið, það er höfnun. **Ef eitthvað á að endurmæla er
það hvort FPL BREYTIR ÞRÖSKULDINUM** — stallurinn, ekki hallinn, er það sem
lokar rásinni, og lægri þröskuldur er eina inntakið sem gæti opnað hana.


---

# FLUTT UR CLAUDE.md 9.9.2026 — LINURNAR SEM STYTTINGIN FELLDI UR REGLUSKJALINU

CLAUDE.md var stytt ur 2.511 linum i ~1.100 thann 9.9.2026. Reglurnar standa thar; her
ad nedan eru ORDRETT thaer linur sem foru — maelingar, villusogur og leidrettingar-
frasagnir — undir upprunalegum kaflaheitum (eitt threp dypra). Linur sem lifdu
styttinguna eru ekki endurteknar (autt bil i stadinn), svo samhengid er stundum
slitrott: thetta er arkiv, ekki lesefni. Kaflanumerin sem koma fyrir ("kafli 6",
"5b") visa i CLAUDE.md eins og hun var thann dag.

## CLAUDE.md — leiðarvísir fyrir Claude Code í þessu repo

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

---

### 1. Hvað þetta er

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

#### Skráaskipanin — hrein rökfræði aðskilin frá React

Þetta er ekki smekkur heldur forsenda þess að prófin séu marktæk: **prófin

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
| `swaptiming.js` — HVENÆR á að skipta · `buysell.js` — pörun og vikuröð | `BuySell.jsx` |

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

`API_SPORTS_KEY`, `BSD_KEY`. Þau eru gefin sem `env` í workflow-unum og eru
**write-only** — þú getur ekki lesið þau héðan. Aldrei lykil í kóða eða commit;
repo-ið er **public**. `.env`/`.env.local` eru í `.gitignore`.

---

### 2. Vinnulag sem gildir hér

   vinnutré samtímis og `-A` sópaði vinnu annarrar inn í commit hinnar, svo
   commit-textinn lýsti henni ekki.
3. **Keyrðu prófin þrisvar fyrir hverja ýtingu**, ekki einu sinni. Nokkur próf

   þáttar, hann leysir ekki nöfn. Flutningur á blokk úr `Leaderboard.jsx` skildi
   eftir þrjár tilvísanir í horfin nöfn og gaf **hvítan skjá** meðan esbuild var
   grænt. Eftir flutning: `await import()` á skrána, eða keyrðu prófin sem opna
   flipann (`data-resilience.mjs`).

   vegna, og hvað var mælt. Sagan er raunveruleg skjölun hér.

   lesin úr `data/`.

---

#### Hvar tölurnar búa (ekki afrita þær hingað — þær reka)

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

#### Sumarglugginn — golfið var ÓVIRKT fyrir alla sem skiptu um lið (8.8.)

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

#### Niðurstaðan í einni töflu

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

#### HEIMAVÖLLUR FYRIR GK/DEF (`homeCore`, 9.8.2026)

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

#### Ákvarðanir sem hafa þegar verið véfengdar — ekki taka þær upp aftur

- **FFDR er ÚTKOMAN.** ClubElo, xGC og markaðslínan eru **inntök** og eru því
  ekki birt sem sjálfstæðir dálkar við hliðina.
- **Markaðsvog er 0,80 í ÖLLUM stöðum** — en sóknarhópurinn notar

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

- **Verðspáin („↑ í nótt?“) er NÁLGUN** — FPL birtir ekki formúluna. Hún má

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
- **KAUP-/SÖLU-LISTINN (`swaptiming.js` + `buysell.js`, 8.9.2026) SVARAR
  „HVENÆR", EKKI „HVERN" — og hálft svarið var ÞEGAR í appinu.**
  Notandinn: *„það hlýtur að vera réttur tími ef við horfum sérstaklega á
  FFDR. Þegar leikmaður sem ég ætla að selja á erfitt program og sem ég ætla
  að kaupa létt program."* Innsæið er rétt og `expPointsFor` ber FFDR-
  margfaldarann, svo `transferNet` er ÞEGAR „skiptu þegar leikirnir snúast".
  Það er VIÐMIÐIÐ sem þetta þurfti að slá, ekki niðurstaða. Opna spurningin
  var sú gagnstæða: **borgar sig að BÍÐA?**
  · **Mælt á 5 tímabilum, 140 ákvörðunar-punktum, 8.400 pörum** með FFDR
    FROSIÐ við hvern punkt. Laugin er þau pör sem appið metur ÞEGAR jákvæð
    (3.267) — „hvenær" er aðeins spurning um skipti sem eru þess virði.
    Reglan segir SKIPTU NÚNA í 78–92%, og í **92,1%** þeirra þar sem sá sem
    kemur inn á léttari leik þessa viku — sem er einmitt dæmi notandans.
    Bið borgar sig í **17,1%** paranna og er þá verð **+1,136 CI [0,681,
    1,573]**; á hreinni leikjaþyngd (án blanks og tvöfaldra) **11,0%** og
    **+0,841 CI [0,274, 1,348]**, 4 ár af 5 í báðum.
  · **ENGIN ORAKEL-TALA MÁ BIRTAST.** „Besta vikan hefði verið verð +3,08"
    er **100% hávaði**: sama orakel á STOKKUÐUM vikum gefur +3,12. Hámark
    yfir fjóra hávaða-kosti er alltaf jákvætt.
  · **FFDR-LITURINN ER EKKI AÐAL-DRIFKRAFTURINN** þótt spurningin hafi verið
    um hann: ~72% af tímasetningar-virðinu eru **blank og tvöfaldar
    umferðir**, og eiginlegt framlag litarins er **+0,072 CI [0,006, 0,151]**
    — raunverulegt og þunnt. Báðar brautir eru samt SÝNDAR, því það var
    beðið um þær og þær eru satt samhengi.
  · **`SWAP_KMAX = 3` ER MÆLT** (nested val velur k3 í öllum fimm foldum).
    **`SWAP_TAU = 0,25` ER STILLING**, ekki mældur fasti: öll 21 afbrigði
    hafa CI sem útiloka null og ávinningurinn fellur einrænt 0,257 -> 0,088
    þegar tau fer 0 -> 2. Hún MÁ ALDREI birtast sem mæld tala og skjárinn
    segir það sjálfur.
  · **STAÐAN ER HART SKILYRÐI, EKKI STUÐULL.** Skipti eru líkt fyrir líkt,
    svo par úr sitt hvorri stöðu er tillaga um aðgerð sem er EKKI HÆGT að
    framkvæma — verri en engin tillaga, því hún lítur út eins og ráð.
  · **ÞÖGN ER SVAR Í TVEIMUR ADSKILDUM MYNDUM.** „Bíddu tvær vikur" og
    „ekki þess virði" eru SITT HVAÐ; síðara var beinlínis beðið um. Veik
    skipti fá ENGA viku — að setja þau í röð væri að breyta þögn í tillögu.
    Þröskuldurinn (`SWAP_WEAK_NET = 3`) er KVÖRÐUN: undir ~+3 spáðum stigum
    á sex umferðum er raunútkoman **hlutkesti** (49–52% jákvæð) meðan hún er
    65,9% yfir +5.
  · **MEIÐSLI VERÐA AÐ SEGJA SIG SJÁLF.** Rásin liggur gegnum `expPointsFor`
    (sem ber tiltækileika) og hún ein er EKKI NÓG: flaggaður maður fær lægri
    vænt stig, nettóið fellur undir þröskuldinn og spjaldið segði „No change
    worth making" — SATT um töluna og VILLANDI um ástæðuna. Flaggið ber
    **FPL-fréttina sjálfa** (kafli 6: FPL-status ræður, engin ágiskun).
    Sama ætt og E0-núllin: **rétt tala, röng merking.**
  · **MÆLINGIN KEYRÐI MEÐ `avail = 1`** — engin tiltækileika-saga er til í
    repo-inu (`data/history/` er verð-eingöngu frá 25.7.2026). Að ráðið
    uppfærist við nýjar fréttir er eiginleiki PIPELINE-unnar, ekki
    niðurstaða héðan, og notan segir það.
- **Byrjunar-líkurnar eru KVÖRÐUN, ekki véfrétt.** Nákvæmnin (88,0%) er sú sama
  og hjá „byrjaði síðast"; ábatinn er Brier −24% og **bekkjar-gildran**: lægsti
  tíundarhlutinn fangar 42–49% þeirra sem falla á bekk (lyfting 2,09×,
  samhljóða öll þrjú tímabilin). **Ekki selja nákvæmnina sem ábatann.**

  samanburða í fortíðinni þar sem sá sem skorið setti ofar skoraði raunverulega
  meira (306.653 samanburðir innan sömu umferðar). Hún er **ekki** „líkur á að
  þetta séu góð kaup". Þakið ~81% kemur úr mælingunni — verkfæri sem segði
  „95% buy" væri að ljúga.

---

### 4. MÆLT OG HAFNAÐ — lokaðar spurningar

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
| **VELDI A FFDR-MARGFALDARANN (`mult^a`)** | **Mælt 4.9.2026, fasi B (28 afbrigði).** Nested held-out **−0,007, 2 ár af 5**, og foldarnir ÓSAMMÁLA. `a = 1,5` lítur best út á öllu úrtakinu (+0,056) og **fellur í nested-prófinu**. **EN `a = 0` (enginn leikjaliður) gefur −0,138, p 0,0043** — margfaldarinn ber merki og það er nú prófað með tönnum | 4.9.2026 |
| **BLANDA `ep_next` AFTUR INN Í GRUNNINN** | **Mælt 4.9.2026, fasi B.** Neikvætt í ÖLLUM þyngdum: −0,072 við w = 0,3 og **−0,154 við w = 0,5 (p 0,0025)**. Okkar grunnur ber ÞEGAR það sem FPL-talan hefur — sjálfstæð staðfesting á því að `ep_next` sé form en ekki spá | 4.9.2026 |
| **MERKI OFAN Á GÓÐAN GRUNN (`threat90`, `bps90`, `xgi90`, `dc90` …)** | **Mælt 4.9.2026, fasi C (60 afbrigði) — og þetta er NÝ spurning, því 25.8. voru þau prófuð ofan á `ppg5`-grunni sem var sjálfur vondur.** Sterkastur er `threat90 + 0,2`: nested í **5 af 5** foldum, held-out **+0,072**, 4 ár af 5 — **en p = 0,0813 og hann lifir ekki Holm**. Fellur á sama þröskuldi og sjöunda þrepið (+0,00085) og „sleppa óheppnis-liðnum" (P = 74%). **Eina afbrigðið sem lifir Holm er `hauls − 0,2` með −0,737** — einu áhrifin sem eru nógu sterk eru þau sem gera spána VERRI. `threat90` er skráður sem sterkasti opni frambjóðandinn og á að endurmælast við sjötta tímabilið | 4.9.2026 |
| **LID LEIKMANNSINS SEM INNTAK I DC-HITTNI** | **Mælt 4.9.2026** á 7.602 útileikmanna-byrjunum 2025/26 (mótherji tengdur úr E0, 0 raðir ópáraðar). Taflan LÍTUR sterk út — Everton O/E **1,479**, Aston Villa **0,446**, og félags-hittnin helst milli helminga (split-half **r 0,769**, betur en mörk á sig sem gefa 0,402). **EN SAMSETNINGAR-NÚLLIÐ FELLIR HANA:** séu heilir leikmenn stokkaðir milli félaga með sín eigin gögn óbreytt mælist **r 0,774** — tölfræðilega eins. Þrautseigjan er ÖLL „hverjir spila þarna", sem er þegar í hverjum leikmanni. Félags-O/E fylgir mörkum á sig r **+0,517**: taflan er „lélið lið verjast meira". Út fyrir úrtak inniheldur **hvert einasta CI núll á öllum þremur klasa-stigum**. Aflprófun sýnir auk þess að tækið hefur nánast ekkert afl: aðeins **7 leikmenn** eiga ≥5 byrjanir hjá tveimur félögum á einu tímabili | 4.9.2026 |
| **MOTHERJINN SEM INNTAK I DC-HITTNI — EKKI LOKAD, EN EKKI TEKID UPP** | **Mælt 4.9.2026, sama laug.** Þetta lifir meira en félags-liðurinn og á að endurmælast: það er **hornrétt á FFDR** (\|r\| ≤ 0,18 gegn markamun, mörkum, skotum, hornum — þess vegna náði lokaða FFDR-þrepa-spurningin því aldrei), það er **EINGÖNGU varnarmanna-áhrif** (DEF split-half r 0,412 og 0,637; MID −0,132 og 0,031, bæði með núll), stuðullinn flyst við ≈1,0, og orakel-spönnin er **0,31 DefCon-stig per DEF-byrjun** (nýtanleg 0,235) á móti 0,016 sem dómara-spjöldin voru felld við. **EN annað split-hönnunin stenst og hin SKIPTIR FORMERKI** — sama undirskrift sem felldi varnar-FFDR og DC×FFDR. Endurmælist eftir 2026/27 þegar milli-tímabila þrautseigja verður loks mælanleg | 4.9.2026 |
| **K = 20 (SKRUMPUN UT FYRIR RIST FASA A) — STERKASTI OPNI FRAMBJODANDINN** | **Mælt 4.9.2026.** Rist fasa A var `{1,2,3,5,8}` og sigurvegarinn K=8 sat **Á JAÐRI HENNAR** — yfirborðið heldur áfram að rísa upp í ~20 (**+0,077**). Sama villa og í kvörðunar-veldinu, þar sem hún VAR gripin. **Fellur samt á þrennu:** bootstrap-CI **[−0,075, +0,123] inniheldur núll** (sami þröskuldur og felldi sjöunda þrepið við +0,00085); besta K per tímabili spannar **10–24** og 2022/23 er neikvætt við ÖLL K; og **hún brýtur kvörðunina** — meðal-skekkja per tíundarhlut tvöfaldast (0,046 → 0,099) og efsti hlutinn snýr við (+0,09 → −0,166). Að taka hana upp væri TVAER breytingar og sú síðari afturkallar level-lagfæringuna sem svaraði upprunalegu kærunni. **Leysir `threat90` af sem sterkasti opni frambjóðandinn**; endurmælist við sjötta tímabilið, með skilyrði um `BASE_CAL`-endurfitt og CI sem útilokar núll | 4.9.2026 |
| **BONUS SEM SER LIDUR I GRUNNINUM** | **Mælt 4.9.2026 — og VIÐMIÐIÐ AFHJÚPAÐI HANA.** Besta bónus-skiptingin gefur +0,050, en **„sleppa bónus ALVEG úr grunninum" gefur +0,018** og einföld K=16/K=20 án nokkurrar skiptingar gefur +0,067/+0,077. Skiptingin var því **almenn viðbótar-skrumpun í dulargervi bónuss**. „Mæla bónus betur" er RANGA spurningin | 4.9.2026 |
| **BETRA MINUTU-LIKAN** | **Mælt 4.9.2026 á 17 afbrigðum.** `mins5 + leitni` er **best af öllum sautján á MAE mínútnanna sjálfra** (12,129 — ekkert sló hana), og fylgni milli „betri á mínútum" og „betri á stigum" er **+0,775**, svo rásin er raunveruleg og ÞEGAR mettuð. Nested held-out á stigum: **−0,021**. Aukafundur í sömu fjölskyldu: tveggja-þátta mínútulíkön lækka MAE stiga verulega (1,872 á móti 2,017) og kosta **−0,177 á topp-15** — röðun á móti trúverðugleika, í nýjum stað | 4.9.2026 |
| **TVOFOLD UMFERD ER EKKI TVEIR HALFIR LEIKIR** | **Mælt 4.9.2026 innan leikmanns:** raunstig per leik, tvöföld mínus einföld = **−0,005 ± 0,046 (n=1.136)**. Samlagning modelsins per leik þarf ENGA afsláttar-tölu. Sama fjölskylda: stutt hvíld (≤4 d) mínus löng (≥6 d) = **+0,005 ± 0,024 (n=1.726)** — nákvæmt núll, svo þver-sniðs hvíldar-hallinn var staðgengill fyrir liðsstyrk (og stærð hans er hvort eð er innan slembi-gólfsins) | 4.9.2026 |
| **LENGRI SAGA EN EITT FYRRA TIMABIL** | **Mælt 4.9.2026 á 12 afbrigðum** (tvö og þrjú fyrri tímabil úr `player_seasons.json`): besta fullt úrtak **+0,001**, nested held-out **−0,011**, **0 ár af 5**. Eitt fyrra tímabil er nóg | 4.9.2026 |
| **STODU-BUNDID K I GRUNNI VAENTRA STIGA** | **Mælt 4.9.2026** (`measure-base-search.mjs` kafli 5b), nested val a þjálfunar-tímabilum: **held-out −0,021, 1 ár af 5**. Ein skrumpunar-tala fyrir allar stöður stendur. Prófað sem EIN breyting á sigurvegaranum, ekki sem 5⁴ rist — það síðara væri ofurmátun í dulargervi leitar | 4.9.2026 |
| **FORGILDID SEM „STIG PER LEIK" Í STAÐ per-90 × 60 mín** | **Mælt 4.9.2026, fimmti ás í leitinni (300 afbrigði).** Grunurinn er réttmætur — fasti 60/90 lítur út fyrir að skera 90-mínútna mann niður um þriðjung — en beina leiðin (`prevPts/prevMatches`) **kemst í topp-8 og vinnur ekki**: +0,381 á móti +0,406. Fastinn stendur | 4.9.2026 |
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

### 5. Prófakerfið — `npm test`

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
| `buy-sell.mjs` | **Kaup-/sölu-listinn.** Kafli A er á TILBÚNUM gögnum þar sem svarið er þekkt fyrirfram — raunveruleg leikjaskrá getur ekki framkallað árekstur tveggja skipta í sömu viku þegar mér hentar, og prófið má ekki bíða eftir þeim degi. Prófsteinarnir: **staðan er HART skilyrði** (DEF út + FWD inn gefur ENGA tillögu og báðir eru TALDIR) · **vantandi ep er ekki 0** (ein vantandi vika gerir parið óvíst — væri hún talin sem 0 yrði parið EFSTA tillagan) · **veik skipti fá enga viku** (þögn má ekki verða tillaga) · **færsla milli vikna er MERKT** · hver maður einu sinni. Kafli B les spjaldið AF SKJÁNUM með seeduðu `localStorage` og krefst þess að **flaggaður maður beri FPL-fréttina sjálfa** sem titil. **Átta stökkbreytingar felldar.** Tvær tómar fullyrðingar fundust í prófinu sjálfu: `|| true` í þrískiptu skilyrði, og kafli sem endurteiknaði á SAMA `root` þótt spjaldið lesi `localStorage` í mount-effekti — hann mældi því GAMLA parið meðan hann taldi sig mæla það nýja |
| `playerlist-narrow.mjs` | **Símahamurinn — sem ekkert próf hafði séð.** Stillir `innerWidth` OG `matchMedia` á 390 px svo báðar greinar keyri; mælir dálkabreiddir og að andlitsmyndin hverfi en liðsmerkið ekki |
| `error-boundary.mjs` | Prófar ÚTGÖNGUNA, ekki bara að kassinn birtist |
| `monkey.mjs` | 800 handahófskenndir smellir (4 föst fræ). **NET, EKKI VÖRÐUR — og það er mælt:** bilun á algengri braut (Teams-flipinn) fannst í báðum fræjum, en bilun á djúpu marki (röðun eftir Verði) **slapp í gegn í 800 smellum**. Segðu því aldrei „apinn ver X"; hver uppgötvun á að festast í alvöru verði |
| `untrusted-input.mjs` | Tvær uppsprettur sem appið ræður engu um: 15 skemmd `fpl_planner_v3`-blob og 12 proxy-svör. **Vistað ástand er alvarlegra en vantandi gagnaskrá** — `data/` lagast við næstu sókn, en blobbið er í vafranum og fer hvergi, svo óheilt blob felldi appið við HVERJA hleðslu, að eilífu. Proxy-hlutinn: net-bilanir voru allar í lagi, **talna-gerðin var gatið** (`bank:"mikid"` → `NaN` á skjá) |
| `leagues.mjs` | 500 slembin inntök: summa verðlauna má **aldrei** fara yfir pottinn og ekkert verðlaun vera neikvætt |
| `pros.mjs` | Sérfræðinga-hópurinn. Valreglan (einræn, nýleiki vegur þyngra), talningin, EO **yfir 100%**, og söfnunin sjálf á **hermdum** svörum — `picks` svara 404 í forleik svo hún getur ekki verið prófuð lifandi fyrr en 21. ágúst. Kafli 12 ver að **ekkert sé sótt fyrr en fresturinn er liðinn**; kafli 13 ver kvótann (hver umferð sótt nákvæmlega einu sinni — annars 96.000 köll á dag); kafli 17 ver að fallið sé kallað úr `fetchFast` **og** að workflow-ið keyri `--fast` |
| `pros-render.mjs` | **Fyllti helmingurinn af flipanum.** `data-resilience` opnar hann í öllum 16 bilunum en `pros_gw.json` er ekki til í forleik, svo það próf hittir alltaf á TÓMA ástandið. Hér eru tölurnar lesnar AF SKJÁNUM: hlutfall miðast við þá sem svöruðu (65,3%, ekki 62,0%), EO fer yfir 100%, vikmörkin sjást, umferðar-valarinn breytir raunverulega töflunni, og chip-athugasemdin hverfur í umferð án chips. Sex stökkbreytingar felldar |
| `prediction-ledger.mjs` | **Spá-bókhaldið.** `scripts/snapshot-predictions.mjs` skrifar niður hvað við SPÁÐUM fyrir umferð (FFDR per leik, `rankScore` per leikmann með INNTÖKUNUM, byrjunar-líkur, `ep_next` sem viðmið) svo kvörðunin geti síðar spurt hvort mælingarnar HALDI. Hliðin eru prófuð á TILBÚNUM gögnum: 1 ms eftir frest -> ekkert · nákvæmlega á frestinum -> ekkert · röð sem er til -> ekkert (ÓNEMANDI) · þunn inntök -> ekkert. **Prófsteinninn er BYGGINGARLEGUR:** App.jsx VERÐUR að flytja `buildTeamMetrics` inn úr `teamstats.js` og má EKKI skilgreina hann sjálft — og hvert FFDR-gildi er endurreiknað og borið Á BITANUM. Tvær fyrri útgáfur þessa prófsteins voru rangar og prófið sagði það: DOM-samanburður fann 0 tölur (töflan sýnir GW-BIL, ekki eina umferð) |
| `calibration.mjs` | **Heldur mælingin enn?** Ber bókhaldið við það sem gerðist: FFDR -> hrein blöð (PRÓFIÐ ER EINRÆNI, ekki stök prósenta), topp-15 -> raunstig gegn FPL-eigin `ep_next`, byrjunar-líkur -> Brier + bekkjar-gildran. **Fáar mælingar -> ENGIN tala** (`null` + `why`); tala úr einni umferð sem les eins út og tala úr átta tímabilum er versta útkoman. Vélin er sannreynd á TILBÚNUM gögnum þar sem svarið er þekkt fyrirfram (þrep 0 -> 0,75 nákvæmlega, Brier -> 0 nákvæmlega, snúið merki -> einræni brotin). **Kaflinn á raungögnum SEFUR** í forleik og fullyrðir samt að vélin hafi verið sannreynd, svo „sefur" getur ekki orðið „mælir ekkert" þegjandi |

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

#### 5b. ÞÖGUL PRÓF — ÞRJÁR TÓMAR FULLYRÐINGAR (fundið 8.8.2026)

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

### 6. Gagnaheimildir

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

#### ESPN og BSD nota SITTHVORN KVARÐANN — ekki flytja reglu milli þeirra

| | kvarði á x | teigur |
|---|---|---|
| **ESPN** | hlutfall af **HÁLFUM** velli (52,5 m), fjarlægð frá sótta markinu | 0,314 |
| **BSD** | hlutfall af **FULLUM** velli (105 m) | **17** (`IN_BOX_X`, fittað) |

ESPN-kvarðinn kostaði villu sem **ekkert próf sá**: fyrsta útgáfan margfaldaði
með 105 og setti hvert skot í tvöfalda fjarlægð. Notandinn sá það á vellinum.
Þess vegna les skotakortið (`ShotMap.jsx`) **sömu kvörðunartölur og punktarnir
eru teiknaðir úr** — þá getur völlurinn og gagnasettið ekki farið í sundur.

#### BSD — reglurnar sem gilda um hana

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

#### Skotakortin — `bsd_shots.json` + `ShotMap.jsx`

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

### 7. Pipeline og gagnaskrár

í hliðarstiku. **Bætir þú við heimild: skráðu hana þar**, annars er hún
ósýnileg þegar hún brotnar.

**Vantar API-lykil → `FLAGS` sleppir þeirri heimild þegjandi** (ekki hrun), svo
þú getur keyrt hitt án þeirra.

#### Push-kapphlaupið — lagað 29.7.2026, hafði þegar kostað dag

`fetch-data` féll því `fetch-fast` pushaði **tólf sekúndum á undan**; sóknin var
fullkomlega í lagi en gögn dagsins fóru í ruslið og ekkert sagði HVAÐ tapaðist.
Lausn: **endurtilraunalykkja (5 tilraunir) í BÁÐUM** workflow-um. Við árekstur í
`data/` vinnur okkar ferska sókn (`rebase -X theirs`) — það er rétt hér því
`data/` er endurmyndað Í HEILD í hverri keyrslu. Actions-útgáfur eru **v5** í
öllum þrem workflow-um. Vörður: `workflow-push.mjs`.

#### `data/predictions/` — SPÁ-BÓKHALDIÐ, OG ÞAÐ MÁ EKKI EYÐA

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

#### TILTEKT 31.8.2026 — HVAÐ MÁTTI FARA OG EFTIR HVAÐA REGLU

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

#### `data/history/` — SKRIFAÐ, ÓLESIÐ, OG MÁ EKKI EYÐA

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

#### Handvirkar skriftur — EKKI í daglegu pipeline

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
| `measure-base-search.mjs` | ekkert (skýrsla; `--json`, `--quick`) | **LEITIN AD BESTA GRUNNINUM — ÞRÍR FASAR** (4.9.2026, sjá kafla 15). **A:** 300 afbrigði af GRUNNINUM. **B:** margfaldarinn sjálfur (veldi + blöndun við `ep_next`) — 28 afbrigði. **C:** bætir nokkuð OFAN Á góðan grunn — 60 mjúkir hallar. Allir með **nested vali**, tekna-prófi á árum, **Holm-leiðréttingu** og **neikvæðum viðmiðum sem VERÐA að tapa** (snúið skor −4,1; fast skor −3,4; `a = 0` gefur −0,138). Sama strangleiki og `nfl/scripts/arank-search.mjs`. Les committuð `data/`, engin ytri köll, ~15 mín (`--quick` ~2 mín) |
| `backtest-season.mjs` | ekkert (skýrsla; `--season=`, `--json`) | **HVERNIG HEFÐI LÍKANIÐ GENGIÐ?** (4.9.2026, sjá kafla 15). Gönguleikur yfir eitt tímabil með föstum sem LOSO valdi ÁN þess. Ber líkanið við `ppg5`, **oraklið** (þak) og **tilviljun** (gólf) — ein tala segir ekkert án beggja. Prentar líka kvörðunartöflu per tíundarhlut, sem er **hún sem fann +1,61 skekkjuna á toppnum**. ~2 mín |
| `measure-base.mjs` | ekkert (skýrsla; `--json <slóð>`) | **GRUNNURINN Í VÆNTUM STIGUM** (4.9.2026, sjá kafla 15). Les committuð `data/` gegnum `tests/lib/panel2.mjs`, engin ytri köll, ~3 mín, **deterministísk** (fast fræ 7). Ber **fimm** grunna gegnum SÖMU byggingu appsins og velur eftir MAE + topp-15 með vikmörkum; prentar líka K-næmið og stöðu-forgildin sem `model.js` ber, svo talan í kóðanum sé rekjanleg til mælingar. **Hún er FYRSTA skrefið, ekki það síðasta** — fjórir handvaldir grunnar eru ekki leit; sjá `measure-base-search.mjs` |
| `measure-opp-pens-shots.mjs` | ekkert (skýrsla; `--json <slóð>`) | **ÞRJÚ INNTÖK SEM VANTAÐI ÚR STÓRU BEIÐNINNI** (25.8.2026): meiðsli mótherjans, víti/dómari, hrá skot-talning. Öll þrjú **felld** — sjá kafla 4. Flytur inn `panel2.mjs`, `e0.mjs` og `bootstrapCI` úr `start-panel.mjs`; **engin formúla endurrituð**. Deterministísk (sannreynt með því að bera tvær heilar keyrslur saman bæti fyrir bæti) |
| `rebuild-odds.mjs` | `odds.json` | **ENDURBYGGIR MARKAÐSLÍNUNA ÚR COMMITTAÐA HRÁA SVARINU** (27.8.2026) — engin netköll, enginn kvóti. Til vegna þess að hliðið (`shouldFetchOdds`) hleypir aðeins einni sókn í hvorn glugga, svo skrá sem er skökk daginn fyrir frest hefði staðið þannig fram yfir hann. Notar SÖMU föll og sóknin (`oddsTeamsFromRaw`, `oddsFileFrom`) — ekkert endurritað. Þrír verðir í skriftunni sjálfri: tómt svar skrifar ekkert · engin pöruð félög skrifa ekkert · **færri félög en fyrir er stöðvað** (afturför er merki um bilun í umbreytingunni, ekki um þögn á markaðnum). `--dry` skrifar ekkert |
| `measure-first-start-dc.mjs` | ekkert (skýrsla; `--json <slóð>`) | **HVAÐ SEGIR EIN BYRJUN UM DEFCON?** (27.8.2026) Svarar spurningunni sem 5-byrjana gólfið í `measure-dc-flag.mjs` lokaði án þess að mæla hana: hittnin er ómæld á einni byrjun, **talningin er það ekki**. Les `player_gw_2526.json` eitt (sannreynt: `dc > 0` í 9.620 röðum 2526 og **0 í öllum fjórum eldri skrám**), flytur inn `bootstrapCI` úr `start-panel.mjs` — **engin formúla endurrituð**. Deterministísk (tvær keyrslur bornar saman, eins staf fyrir staf), ~2 s. **MÆLIKVARÐINN ER `dc`-DÁLKURINN Í ÖLLUM STÖÐUM, LÍKA HJÁ VÖRNINNI** — fyrsta útgáfan las `cbit` fyrir DEF af því að FPL skilgreinir þröskuld varnarmanna sem CBIT án endurheimta, en skráin ber BÁÐA dálka og þeir eru ekki þeir sömu (meðaltal á byrjun 7,30 á móti 5,70, jafnir í 802 af 3.150 röðum). Sú útgáfa mældi hittni **0,1546** meðan pipeline-an sjálf (`fetch.mjs`:1493) les `dc` og fær **0,2632** — talan sem kafli 12 skjalar. **Endurreiknuð skilgreining laug**, sama ætt og `buildTeamMetrics`-afritið; villan fannst við að bera nýju töluna við skjalið. Ber líka **stigin sjálf**: MID með fyrstu byrjun í DC/90 13–18 skoruðu **4,02 stig/byrjun CI [3,51, 4,52]** í síðari byrjunum á móti 3,78 hjá öllum. Niðurstaða í kafla 4 |
| `measure-tail-to-gw1.mjs` | ekkert (skýrsla) | **Halda inntök síðustu fimm umferða FYRRA tímabils fyrir GW1?** Svarið er JÁ en á RÖNGUM KVARÐA — sjá kafla 12b |
| `measure-rival-out.mjs` | ekkert (skýrsla) | Keppinautur úr leik. Fellt fyrir útileikmenn, samþykkt fyrir markmenn (kafli 4 og 12b) |
| `measure-preseason-starts.mjs` | ekkert (skýrsla; `--now`, `--covered`) | Æfingaleikja-byrjanir sem GW1-merki. **FotMob svarar sögulegum dagsetningum** (`/api/data/matches?date=20210724` o.s.frv., 200, engan token), svo þetta er EKKI aðeins framvirkt prófanlegt — mælt á fjórum sumrum. **TVÆR GILDRUR SEM ÞÖGÐU:** (a) `matches?date=` skilar STUTTUM félagsnöfnum og `matchDetails.lineup` LÖNGUM, svo uppflettingin skilaði `undefined` og `continue` — **22 af 80 lið-tímabilum fengu núll uppstillingar** og „sást í æfingaleik" mældist 26% í stað 54%; (b) **„Arsenal" hjá FotMob eru TVÖ félög** — 6 af 13 leikjum sumarið 2026 eru **FC Arsenal Tula úr rússnesku B-deildinni**. Bæði leyst með því að **festa FotMob-id** (Arsenal = 9825) og varpa heima/úti eftir STÖÐU, ekki nafni. Vörður prentar þekju per lið-tímabil og kastar ef eitthvert af 20 liðum parast ekki |
| `measure-friendly-form.mjs` | ekkert (skýrsla; `--json <slóð>`) | Sama; ber FotMob við ESPN-liðstölur. **Staðan er `UNVERIFIED`** — krossprófunin er skrifuð en hefur aldrei haft gögn, fyrst 21.8. **Vináttuleikir sem form-merki eru MÆLDIR OG FELLDIR: mínúturnar eru merkið, mörkin ekki** (skjalað í haus beggja skriftanna — ekki endurmæla) |

#### TIMABILIÐ VARÐ LIFANDI 21.8.2026 — OG ÞAÐ BRAUT SJÖ SÖFN Í EINU

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

#### `scripts/fetch.mjs` ER NÚ INNFLYTJANLEG — `main()` ER SKILYRT (21.8.2026)

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

#### HLIÐIÐ FYRIR COMMIT — SKRIFAÐ 25.8., TENGT 31.8.2026

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

#### Cron

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

#### `netlify/functions/odds.js`

**Strict routing: óþekkt `path` skal skila 400.** Áður féll allt óþekkt í
bókmakera-greinina og **eyddi Odds-API kvótanum**. CDN-cache 60 s. Leiðirnar
`fpl-entry`, `fpl-picks` og `fpl-league` eru þarna því FPL er CORS-lokað.

---

#### Gögn og birting

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

#### Dálkaskráin (`STAT_DEFS` í `stats.js`)

- **EIN dálkaskrá.** Leikmannalistinn, stigataflan og prófin lesa hana alla.
  Vilt þú taka dálk út: eyddu honum úr `STAT_DEFS` og hann hverfur úr töflu,

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

#### Töflur og rúmfræði

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

#### Litir og merki

Þrír litir, þrjár merkingar — þeir hafa rekist á áður og mega ekki gera það
aftur: **grænt = í mínu liði** · **ljósfjólublátt = í samanburði/röðun** ·
**blátt = valinn dálkur**. Borðinn liggur á **frosna hólfinu, ekki röðinni** —
röðin skrunar lárétt yfir 100+ dálka og borði á henni hyrfi við fyrsta skrun.
Vörður: `watchlist.mjs` (vistun, síun, og að borðinn liggi á hólfinu).

#### Íkon

**Í smárri stærð er SILHÚETTAN allt.** Tvö íkon sem eru bæði „hringur með
smáatriðum" verða EINS við 13 px, hvað sem smáatriðin eru — þess vegna er
hvert á annarri grunnform-samsetningu (víti = lóðrétt tvennd · aukaspyrna =
lárétt tvennd · horn = skálína). **Íkon verður að prófa í RAUNSTÆRÐ**:
víta-íkonið var endurteiknað tvisvar eftir skjá-prófun (bogi yfir knetti las
sem horn á andliti; hringlaga depill las sem staðsetningar-næll). Teikningin
var „rétt" í öllum þremur; myndin var vitlaus í tveimur.
Tveir flipar með sama tákni er það sama og ekkert tákn.

#### Annað

- **Völlurinn er í venjulegu flæði** (`rowsArea` space-evenly), EKKI negldur á
  fastar prósentur. Gamla útgáfan lét spjöld skarast og klippti bekkinn.
- Skel `maxWidth: 1280`; leikjadálkur `minmax(280px, 340px)`; spjaldabreidd

- **Lyklaborðs-fókus:** `:focus-visible` (ekki `:focus`), `currentColor` (appið
  hefur bæði ljósa og dökka hnappa) og **negatíft** `outline-offset` (umgjörðir
  með `overflow:hidden` klipptu ytri hring).

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

#### BEIÐNIR 31.8.2026 — FFDR4, STILLANLEG SÍA, OG FFDR SEM BYRJAR Á RÉTTUM STAÐ

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

### 9. Enska eingöngu

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

#### ÞETTA SNERI VIÐ 9.8.2026 — PIPELINE-STRENGIRNIR ERU LÍKA ENSKIR

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

### 10. Bíður tímabilsins — GW1 er 21. ágúst 2026

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

### 11. Það sem þetta skjal getur EKKI flutt með sér

2. **API-lyklarnir.** Þeir búa í GitHub Secrets og eru **write-only** — þú getur
   ekki lesið þá héðan; aðeins notandinn getur flutt þá út staðbundið:
   ```bash

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

### 12. LEIKMANNADALKARNIR — SJO TOLUR SEM VORU RANGAR (17.8.2026)

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

#### DefCon — þrennt sem var rangt, allt lagað 17.8.2026

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

### 13. TVÆR REGLUR ÚR ANDSTÆÐU-PRÓFUN (18.8.2026)

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

> verja og gakktu úr skugga um að hún FALLI. Fullyrðing sem stenst
> stökkbreytinguna sem hún heitir eftir er verri en engin, því hún lítur út
> eins og þekja.

---

#### ThRIR HNAPPAR, ThRJAER SPURNINGAR

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

#### NUL-BAETI I `tests/initial-squad.mjs` — GREP SA SKRANA SEM TVIUNDARSKRA (4.9.2026)

`BENCH_RGB = … : "\0none"` (eitt NUL-baeti inni i streng) gerdi `file` ad
segja **„data"** og `grep` ad medhondla skrana sem tviundarskra: `grep -n` a
henni skilar **engu**, thogult. JS thattadi hana afram og **413 fullyrdingar
voru graenar** — svo villan var osynileg bædi keyrslunni og leitinni.
Ekkert annad i repo-inu bar NUL-baeti (skannad). Ath: **hver text-leit sem
sveimar yfir `tests/` — thar med talin handvirk leit ad tomum fullyrdingum —
slepptu thessari skra thegjandi** medan baetid var inni.

---

### 15. GRUNNURINN I VAENTUM STIGUM — `ep_next` VAR EKKI SPA (4.9.2026)

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

> **OG ThAD VAR EKKI ENDIRINN — LEITIN (4.9.2026, sama dag).** Notandinn:
> *„eg vill ad projected points verdi besta og nakvaemasta forspain i heimi
> ... testadu modelid svipad og a-ranking i nfl."* Fjorir handvaldir grunnar
> eru nauðsynleg byrjun en ekki leit: **„besti" an leitar er „besti af theim
> sem mer datt i hug".** `scripts/measure-base-search.mjs` ber **200
> afbrigdi** yfir fjora asa (skrumpun K · vaegi forgildisins M · thrju snid
> af vaentum minutum · per-90 a moti per-leik) med fernu sem er tekid beint
> ur `nfl/scripts/arank-search.mjs`:
> **(1) NESTED VAL** — afbrigdid er valid a thjalfunar-timabilunum EINUM og
> maelt a thvi sem var haldid eftir; **(2) AKVORDUNIN ER MAELIKVARDINN**
> (topp-15 raunstig per umferd, ekki `r`); **(3) TEKNA-PROF A ARUM** vid
> hlidina a t-profi; **(4) FJOLPROFA-LEIDRETTING (Holm)** — 300 afbrigdi
> gefa ~15 „marktaek" af hreinni tilviljun.
>
> **NIDURSTADAN:** `K8 · M5 · mins5+leitni · per-leik` er valid nested i
> **4 af 5** foldum (og **5 af 5** i fyrri, minni ristinni), held-out
> medaltal **+0,380 topp-15** og **5/5 ar unnin**; gegn `ppg5` a ollu
> urtakinu **+0,406, t 8,16, p 0,0012**. Gegn thvi sem var sett inn fyrr um daginn (`K3 · M0 · mins5 ·
> per-90`): **d topp-15 +0,192 CI [0,149, 0,457]** og **d MAE −0,0278 CI
> [−0,0390, −0,0172]** — vinnur BADAR attir, badar utiloka null.
>
> **HOLM-VARUDIN ER SOGD, EKKI FALIN:** frambjodandinn er i saeti 52 af 300
> a p-gildi og **lifir ekki Holm** (adeins 2 gera). Thad er RETT ad segja og
> rangt ad lata stodva malid: afbrigdin eru naer-eintok hvert af odru,
> svo profin eru gifurlega fylgd og Holm er thar ofur-varfaerin. Sonnunin
> sem stendur ein er **nested held-out** — afbrigdid sa aldrei timabilid
> sem thad var maelt a og vann i ollum fimm.
>
> **TVAER VIDBAETUR VID LEITINA VORU MAELDAR OG FELLDAR SAMDAEGURS** —
> badar komu ur thvi ad LESA FORMULUNA UPPHATT, ekki ur ristinni:
> · **Forgildid sem STIG PER LEIK i stad per-90 x 60 min.** Fasti
>   `60/90` er RETTUR fyrir stodu-medaltalid (thad ER stig per rod) en
>   litur ut fyrir ad vera kerfisbundid rangur fyrir mann sem spiladi 90
>   minutur i hverjum leik — hann er skorinn nidur um thridjung. Beina
>   leidin (`prevPts / prevMatches`) var sett i ristina sem FIMMTI ASINN
>   (300 afbrigdi i stad 200). **Hun kemst i topp-8 en vinnur ekki:**
>   besta `pm`-afbrigdid er `K8·M20·B·perStart·pm` med **+0,381** a moti
>   **+0,406** hja thvi sem stendur. Grunurinn var rettmaetur og
>   maelingin svarar honum: fastinn stendur.
> · **STODU-BUNDID K.** Markmenn og framherjar hafa olika dreifingu, svo
>   ein skrumpunar-tala er tilgata en ekki stadreynd. Profad SEM EIN
>   BREYTING a sigurvegaranum (ekki sem 5^4 rist — thad vaeri ofurmátun i
>   dulargervi leitar), med somu nested-adferd: **held-out −0,021 og
>   1 ar af 5.** Ein tala stendur.
>
> **FASI B — MARGFALDARINN SJALFUR, SEM HAFDI ALDREI VERID LEITAD.**
> Fasi A leitadi ad grunninum og helt margfaldaranum fostum; hann er samt
> HELMINGUR formulunnar og var adeins punkt-maeldur 25.8.2026. Tveir asar,
> badir ein tala: **veldi** a margfaldarann (`mult^a`) og **blondun**
> grunnsins vid `ppg5` (stadgengil `ep_next`). 28 afbrigdi, sama
> nested-adferd.
> **NIDURSTADA: ENGIN BREYTING.** Nested held-out **−0,007 og 2 ar af 5**;
> foldarnir eru meira ad segja OSAMMALA (a1,5 a moti a2·w0,15), sem er
> undirskrift havada. `a = 1,5` litur best ut a ollu urtakinu (+0,056) og
> **fellur i nested-profinu** — nakvaemlega valskekkjan sem adferdin er til
> ad hindra.
> · **EN MARGFALDARINN BER MERKI OG ThAD ER NU PROFAD MED TENNUR:**
>   `a = 0` (enginn leikjaliður) gefur **−0,138, t −5,82, p 0,0043**.
>   Punkt-maelingin fra 25.8. stendur, nu med almennilegu profi.
> · **OG BLONDUN VID `ep_next` ER NEIKVAED I OLLUM ThYNGDUM** — −0,072 vid
>   w = 0,3 og **−0,154 vid w = 0,5** (p 0,0025). **Okkar grunnur ber ThEGAR
>   thad sem FPL-talan hefur**, og ad blanda henni aftur inn thynnir hann.
>   Thad er sjalfstaed stadfesting a thvi ad `ep_next` se form en ekki spa.
>
> **FASI C — BAETIR NOKKUD OFAN A GODAN GRUNN?** Stora maelingin 25.8.
> felldi sex merki — **en hun profadi thau ofan a `ppg5`-grunni**, sem var
> einmitt grunnurinn sem reyndist vondur. Spurningin er thvi ny. Tiu merki
> ur panelinu (`xgi90`, `bps90`, `threat90`, `bonusRate`, `dc90`,
> `csRate5`, `hauls`, `own`, `minsTrend`, `startRate`), hvert sem MJUKUR
> HALLI (`base x (1 + c*z)`), `z` stadlad **innan stodu**, c i badar attir
> — 60 afbrigdi.
> **NIDURSTADA: EKKERT ER TEKID UPP.** Sterkasti frambjodandinn er
> `threat90 + 0,2`: valinn nested i **5 af 5** foldum, held-out **+0,072**,
> **4 ar af 5** — **en p = 0,0813 a ollu urtakinu og hann lifir ekki Holm.**
> Reglan i thessu repo-i er skyr og hun var sett fyrir nakvaemlega thetta:
> *lidur er thess virdi ADEINS ef CI utilokar null* (sjounda threpid var
> fellt vid +0,00085 og „sleppa oheppnis-lidnum" vid P = 74%). Ahrifin eru
> auk thess **5x minni** en grunnbreytingin sjalf (+0,380).
> · **OG HOLM-SIAN SEGIR EITTHVAD OSKEMMTILEGT UM RISTINA:** **eina
>   afbrigdid sem lifir leidrettinguna er `hauls − 0,2` med −0,737** — thad
>   er ad segja **einu ahrifin sem eru nogu sterk til ad lifa af eru thau
>   sem GERA SPANA VERRI.** Thad er retta myndin af thvi hversu litid er
>   eftir: hægt er ad EYDILEGGJA spana med merkjum, ekki ad bæta hana.
> · `threat90` er skrad her sem **sterkasti opni frambjodandinn** og a ad
>   endurmælast thegar sjotta timabilid baetist vid — ekki ad vera tekinn
>   upp i millitiðinni af thvi ad einhver muni eftir honum sem „naestum
>   marktækum".
>
> **OG GRINDIN GETUR TAPAD — ThAD ER PROFAD:** snuid skor gefur **−4,147**
> og fast skor **−3,437**. Leit sem skilar „bæting" i 218 af 300 afbrigdum
> a ad vekja grun um grindina adur en hun vekur gledi; neikvaedu vidmidin
> eru sama hlutverk og orakel-thakid i `rank-model.mjs`, hinum megin fra.
>
> **HVAD BREYTTIST I FORMULUNNI OG HVERS VEGNA:**
> · **`M = 5` — forgildid er sjalft urtak.** Fyrri utgafa tok fyrra timabil
>   obreytt, svo leikmadur med **12 stig a 88 minutum** bar 12,3 stig/90 og
>   fekk grunn yfir 4,8 ut a ekkert. Nu er thad dregid ad stodu-medaltalinu
>   eftir HANS EIGIN minutufjolda (`w = prevMin90/(prevMin90 + 5)`).
>   **Fannst a lifandi gognum, ekki i leitinni** — fjorir slikir menn voru a
>   listanum — og leitin stadfesti sidan ad lagfaeringin borgar sig.
> · **Nefnarinn er LEIKIR FELAGSINS, ekki byrjanir.** Blonk eru thegar i
>   talningunni; ad sleppa theim vaeri ad spyrja „hve morg stig EF hann
>   spilar", sem er onnur spurning en „hvern a eg ad velja".
> · **Minutu-LEITNIN telur** (`mins5 + mins_trend`, thakad vid 90).

**K = 3 VAR MAELT ThANNIG (fyrri utgafan, geymt thvi hun skyrir K-asinn):**
LOSO valdi 3 i fjorum timabilum af fimm og ristin er flot
(topp-15 4,449 · 4,461 · **4,504** · 4,489 · 4,484 fyrir K = 1 · 2 · 3 · 5 · 8).
K = 0 er urkynjad. Stodu-forgildin eru medalstig per rod, maeld a somu 5
timabilum, LOSO-sveifla **±0,03** — thess vegna dugar **ein** tala per stodu.

#### BAKPROFID A SIDUSTU LEIKTID — OG GALLINN SEM ThAD FANN (4.9.2026)

Notandinn: *„keyrdu projected points spalikanid a sidustu leiktid, sjadu
hvernig thvi modeli hefdi gengid."* `scripts/backtest-season.mjs` keyrir
likanid **gonguleik** yfir 2025/26 (hver rod ur fortid einni) med fostum
sem **LOSO valdi AN thess timabils** — bakprof med fittudum fostum er ekki
bakprof.

| regla | raunstig theirra 15 sem hun valdi |
|---|---|
| **likanid** | **4,530** |
| `ppg5` (thad sem appid gerdi) | 4,108 |
| orakel (15 bestu EFTIR A) | 11,805 |
| tilviljun (golf) | 1,002 |

Likanid lokar **32,7%** af bilinu fra tilviljun ad orakli; gamla adferdin
lokadi 28,8%. Thad vann **25 af 37 umferdum**; yfir 15 val og 37 umferdir
er munurinn **~234 stig**.

**EN KVORDUNARTAFLAN AFHJUPADI RAUNVERULEGAN GALLA — I EFSTA
TIUNDARHLUTANUM, SEM ER EINMITT LIDID HANS:** spad **5,46**, raun **3,84**
— **+1,61 of hatt**. Nionda tiundin var nakvaem (3,01 a moti 2,96), svo
skekkjan var ekki fasti heldur ThJOPPUN: likanid teygdi toppinn.
**Upprunalega kaeran i nyrri mynd.**

**MEKANISMINN:** `perMatch x (vaentar minutur / 60)` margfaldar tolu sem
BER ThEGAR minutur mannsins. Fyrir 90-minutna mann er thad x1,5 ofan a
tolu sem innihelt 90 minuturnar. Leitin valdi thad thvi **thad baetir
rodun** — og rodun og staerd eru tvo olik storf.

**LAGFAERINGIN HREYFIR EKKI RODUNINA:** `a + b*x^g` med b, g > 0 er
**einraen**, svo hver einasta topp-15 maeling stendur obreytt MED
BYGGINGU (sannreynt a 4.000 rodum og i profinu a atta gildum).
Eftir kvordun er **hver einasti tiundarhluti innan ±0,23** og sa efsti
**+0,16** — og MAE fer ur 0,970 i **0,919** (og ur 4,37 i **3,14** a theim
15 sem likanid velur).

**SLEMBI-GOLFID — „VINNUR 4 AF 5 ARUM" ER EKKI SONNUN (4.9.2026).** Tolf
hallar a **STOKKUDUM** gognum (sama dreifing, ekkert samband vid neitt), thar
sem betra formerkid er valid eins og leit myndi gera: **midgildi +0,020,
hamark +0,032, og FJORIR AF TOLF „vinna 4 ar af 5"**. Enginn theirra naer
p < 0,10. I halla-laga fjolskyldum er ars-profid thvi nanast einskis virdi
eitt og ser, og **allt undir ~+0,03 er olesanlegt**. Thetta endurmetur
`threat90` (+0,072): hann er yfir slembi-hamarkinu, en ekki um mikid.
**Ars-profid a ad standa A BAK VID p og bootstrap-CI, ekki vid hlidina a
theim.**

**AÐFERÐAR-ATRIÐI SEM Á AÐ GILDA HÉÐAN Í FRÁ (4.9.2026):** klasa-bootstrap á
split-half fylgni með 20 punktum svarar *„hversu nákvæm er þessi r"*, ekki
*„gæti þessi r komið úr engu"*. Mælt í félags-DC-athuguninni: bootstrap gaf
[0,180, 0,734] þar sem **kvarðað hermi-núll segir að r allt að +0,44 komi upp
án nokkurra áhrifa**. Aðeins seinni spurningin ræður upptöku. Hver split-half
prófun hér eftir á að bera hermi-núll við hliðina á bootstrap-vikmörkunum.

**MAELIKVARDINN ER SKEKKJA PER TIUNDARHLUT, EKKI MAE — OG ThAD KOSTADI
TVAER UTGAFUR AD SJA.** MAE-fittud utgafa BATNADI a MAE og rak um leid
veldid i `g -> 0`, sem stefnir a FASTA: a dreifingu thar sem 60% radanna
eru null er MAE minnkud med thvi ad spa naerri MIDGILDINU, sem er null.
„Kvordunin" var thvi a leid i **„spadu ollum lagt"**. Vaent stig eru logd
saman yfir 11 menn, svo staerdin sem skiptir mali er MEDALTALID
(ohlutdraegni), ekki midgildid.

**OG LAUGIN VARD AD VERA SU SEM KVORDUNIN GILDIR A.** Fyrsta utgafa
fasans fittadi a OLLUM rodum — en 60% theirra bera grunn upp a nakvaemlega
0 og fa i appinu `ep_next`, aldrei thessa kvordun. **Maelingin maeldi annan
heim en keyrslan**, sama villa og profid sem sendi ekki
`player_seasons.json`. Skorðud vid jakvaedan grunn (59.800 af 134.711
rodum) faerdist held-out skekkjan ur −0,279 i **−0,670** og MAE hætti ad
versna: hun **batnar** um 0,082. Enginn fornarkostnadur eftir ad rett
laug var maeld.

**OG ThETTA BREYTIR SKIPTA-RADGJOFINNI, EKKI ADEINS TOLUNNI A SPJALDINU.**
`transferNet` er `SUM (vaent stig inn - vaent stig ut)` yfir sjondeildarhringinn
og BADAR tolur voru teygdar a toppnum, svo avinningurinn var uppblasinn — medan
refsingin (-4) er RAUNTALA fra FPL. Uppblasinn avinningur a moti raunverulegri
refsingu rettlaetir hits sem borga sig ekki. Eftir kvordun eru baðar hlidar a
sama kvarda.

**Vordur:** `exp-points.mjs` — einraeni a atta gildum, `cal(0) = 0`,
thjoppun a toppnum, lyfting a botninum, **per LEIK en ekki a summuna**
(tvofold umferd er tvisvar kvordud), **tiltaekileiki UTAN kvordunarinnar**
(profanlegt adeins med `avail < 1` — fyrsta utgafan profadi mann a fullum
tiltaekileika og stokkbreytingin slapp i gegn), og ad `ep_next`-varaleidin
se OKVORDUD. **Fimm stokkbreytingar felldar.**

**FORMULAN SEM ER I APPINU I DAG** (`pointsBase` + `calibrateExp`,
`src/model.js`):
```

prev90   = prevPts / (prevMins/90)                  (ef fyrra timabil er til)

perMatch = (total_points + K*prior90*(60/90)) / (leikir felagsins + K)   K = 8
minutur  = clamp(mins5 + mins_trend, 0, 90)
grunnur  = perMatch * (minutur / 60)

vaent stig = SUM_leikir  cal(grunnur * FFDR-margfaldari)  *  tiltaekileiki
             thar sem cal(x) = 0,76 + 0,96 * x^0,7   (x > 0, annars 0)
```

**OKKAR EIGIN TALA ER NU I SPA-BOKHALDINU** (4.9.2026). Fram ad thessu
skrasetti `snapshot-predictions.mjs` `rankScore` (rodun) og `ep_next`
(vidmid FPL) — en **EKKI toluna sem notandinn ser**. Medan grunnurinn VAR
`ep_next` var thad ekki gat; fra og med `pointsBase` er thad gat sem
**lokast ekki eftir a**: `mins5`, `mins_trend`, leikjafjoldi felagsins og
fyrra timabil eru oll fortid sem breytist i hverri viku, svo „hvad spadum
vid Sangare fyrir GW4" er osvaranlegt thegar GW4 er lidin — nakvaemlega
roksemdin fyrir bokhaldinu i heild (kafli 7). Badar tolur eru skradar:
**`base`** (grunnurinn einn) og **`exp_points`** (grunnur x FFDR-margfaldari
x tiltaekileiki), thvi their svara sitt hvorri spurningunni — er GRUNNURINN
godur, og er MARGFALDARINN thad. Thekjan er i `coverage`, svo otengd
`pointsBase` sæist strax i stad thess ad skila tomum dalki.
· **Vordur: `prediction-ledger.mjs`** — sjo fullyrdingar, thar med taldar
  ad `base` og `exp_points` seu ADSKILDAR tolur (annars vaeri margfaldarinn
  otengdur), ad grunnurinn se ekki `ep_next` i dulargervi, og ad **fyrra
  timabilid faeri hann raunverulega** (beint samanburdar-prof, ekki
  textaleit). Fjorar stokkbreytingar felldar.
· **OG PROFID SJALFT SENDI EKKI SOMU SKRAR OG KEYRSLAN.** Fyrsta utgafa
  kaflans keyrdi gegn `buildSnapshot` **an `player_seasons.json`**, svo
  grunnurinn var byggdur a stodu-forgildinu einu og allar fullyrdingar um
  hann stodust samt. Sama aett og `buildTeamMetrics`-afritid: **profid maeldi
  annan heim en keyrslan.** Bædi er lagfaert og nyja fullyrdingin fellur ef
  skran hverfur ur odrum hvorum.

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

Vordur: `tests/exp-points.mjs` kafli 6 — formulan a handreiknudum tolum
(4,6044 upp a fjora aukastafi), thakid a minutum, skrumpun forgildisins
eftir minutum, attin i skrumpun eigin talna,
margfoldun a moti samlagningu, skrumpunar-attin, hvert vantandi inntak fyrir
sig, tengingin i BADUM skram, og **lifandi thekja sem er fullyrding** (yfir 200
leikmenn verda ad fa maeldan grunn og hann verdur ad vera raunverulega annar en
`ep_next` hja minnst fjordungi theirra — profid les tolurnar sjalft, thvi
fost tala um lifandi gogn ureldist thegjandi). **Sex stokkbreytingar felldar** (K=0 · oskrumpad forgildi · ekkert
minutu-thak · samlagning i stad margfoldunar · 0 leikir leyfdir ·
leikjafjoldi neglt i fasta), og tvaer fyrri sem varda klukkuna.

**TVAER TOMAR FULLYRDINGAR I MINUM EIGIN VERDI, BADAR SAMA AETTAR:**
`/seasonStarted/.test(blokk)` og `/matchesPlayed/.test(blokk) &&
/playedByClub/.test(blokk)` stodust badar thegar svidid var neglt i fasta —
thvi nafnid stod eftir i **deps-fylkinu** tveimur linum nedar. Tvo adskilin
`test()` yfir sama textabut er ekki sama og eitt `test()` a sviðinu sjalfu:
`/matchesPlayed:\s*playedByClub/`. Sama regla og CLAUDE.md kafli 13 („profadu
fullyrdinguna, ekki bara kodann") — og hun kom upp **tvisvar i somu lotu**,
sem segir ad textaleit yfir blokk se almennt veikari en hun litur ut.

#### LIKUR A DEFCON-STIGUM I VALINNI UMFERD (`dcChance`, 4.9.2026)

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

#### TVAER SPAR MEGA EKKI BERA EITT HEITI (sama lota)

Um leid og appid eignadist sinn eigin grunn urdu thrju stod i vidmotinu ad
**tveimur tolum undir einu heiti**, og oll thrju voru endurnefnd:
`„Next GW forecast (ep)"` -> **`„FPL's own ep_next"`** · `„ep 9.0"` a
andstaedinga-flisunum -> **`„FPL ep_next 9.0"`** · og tooltipid a vollunum segir
nu hvad grunnurinn ER i stad thess ad nefna `ep_next`. Sama regla og
`„DC hit rate"` (per byrjun, yfir hofud) a moti `„DC points GWn"` (i theirri
umferd): **tvaer prosentur hlid vid hlid an merkimida eru tvaer tolur undir einu
heiti.**

---

### 16. FPL FELLDI DALKA UT OG TOK ThA UPP AFTUR — OG NULLIN LITU UT EINS OG MAELINGAR (4.9.2026)

Notandinn bad um betri DC-hittni og ad **fara lengra aftur i timann**. Fyrsta
svarid vid thvi var ekki maeling heldur uppgotvun: **gognin okkar loga um
hvad er til.**

#### 16a. `starts`, xG, xA og xGC BIRTAST FYRST I UMFERD 16 I 2022/23

`fetch-player-gw.mjs` notadi `num()` sem breytir vantandi gildi i **0**. Thad
er RETT fyrir staka rod i timabili thar sem svidid er til (madur sem gerdi
enga stodsendingu leggur 0 til summunnar) og **RANGT thegar svidid er ekki til
yfir hofud**.

**MAELT 4.9.2026 a hraskranni:**

| timabil | leiknar radir | med `starts >= 1` |
|---|---|---|
| 2021/22 | 10.485 | **0 (0%)** |
| 2022/23 | 11.345 | 5.368 (47,3%) |
| 2023/24 | 11.384 | 8.360 (73,4%) |
| 2024/25 | 11.566 | 8.360 (72,3%) |
| 2025/26 | 11.498 | 8.362 (72,7%) |

Fyrsta umferd 2022/23 med `starts >= 1` er **UMFERD 16** — umferdir 1-15 bera
0 i ollum ~4.000 leiknum rodum. FPL baetti dalkinum vid um HM-hleid. Sama
gildir um `expected_goals`, `expected_assists` og `expected_goals_conceded`.

**AFLEIDINGIN VAR I MAELITAEKINU SJALFU:** `tests/lib/panel2.mjs` reiknar
`xg90`, `xa90`, `xgi90`, `overPerf`, `startRate` og `full90` med
`(x[k] || 0)`, svo thau voru **fost 0 i einu og halfu timabili af fimm** —
**25% panelsins** — og litu ut eins og maeling. Hvert einasta afbrigdi i
leitinni sem las thessi svid var thvi doemt a tilbunum nullum.

**ThRJAR LAGFAERINGAR, ALLAR LEIDDAR OG ENGIN MED TIMABILS-LISTA:**
- Slim-skrarnar: svid sem bar **aldrei** gildi thad timabil verdur `null`.
- Hraskrain: sama, **auk** reglu um svid sem kemur inn a midju timabili —
  fyrsta umferd med gildi > 0 markar upphafid og allt a undan verdur `null`.
  **Forsendan er sogd:** hver umferd hefur ~220 byrjunarlidsmenn og fjolda
  manna med xG > 0, svo umferd thar sem ENGIN rod ber gildi getur ekki verid
  raunveruleg nulltala. Thess vegna er listinn stuttur og handvalinn.
- `panel2.mjs`: summan er tekin **yfir thaer radir sem bera gildi** og
  nefnarinn er minutur SOMU rada; `hasXg`/`hasStarts` segja hvort glugginn
  atti nokkur gogn.

#### 16b. OG LEITIN VAR ENDURKEYRD A HEIDARLEGRI LAUG — NIDURSTADAN STENDUR

`measure-base-search.mjs --pool=starts` skorðar lauginа vid radir thar sem
svidin eru raunverulega til (101.508 af 134.711, fjogur timabil). Thar faer
`startRate`-afbrigdid loksins sanngjarnt prof — og **fellur samt**:

| | nested held-out | ar |
|---|---|---|
| besta afbrigdi (`K8·M5·C·per90`, notar `startRate`) | +0,311 | 4/4 |
| **gegn modelinu i appinu** | **d topp-15 +0,003 CI [−0,272, +0,108]** | inniheldur null |
| | **d MAE +0,0146** | utilokar null — VERRA |

Fasi B fellur enn (−0,041, 0 ar af 4) og fasi C lika (−0,026, 2 af 4).
**Hofnunin var adur ad hluta gerviverk; nu er hun maeld a rettum gognum og
segir thad sama.**

#### 16c. TVOFOLD UMFERD ER TVEIR LEIKIR — OG BADIR DEFCON-SMIDIRNIR TOLDU EINN

Slim-skrain **leggur saman** leikina i tvofaldri umferd (skjalad og viljandi),
og `live/gwN.json` ber samanlagdar tolur umferdarinnar. Badir DefCon-smidirnir
gerdu thvi tvennt rangt i einu: **toldu eina byrjun af tveimur** og **baru
SUMMUNA ad throskuldi sem er per LEIK**. Madur med 10 og 8 fekk „hit" upp a 18
thott hvorugur leikur naedi 12.

**MAELT a 2025/26:** 76 byrjanir tyndust og 32 draugahittir urdu til.
Hittnin i skranni er 0,1907 en per LEIK er hun 0,1853.

**OG VORDURINN VAR GRAENN AF ThVI AD HANN ENDURREIKNADI UR SOMU SKEKKJU** —
hann las `player_gw_2526.json`, sem er samanlagda skrain. **Afritid stadfesti
afritid**, nakvaemlega mynstrid sem `buildTeamMetrics` er skjalad fyrir (kafli
7). Vidmidid er nu `fpl_player_gw.json`, sem ber **eina rod per LEIK**.

**FORGILDIN VORU ThVI OFMAELD OG ERU NU ENDURMAELD PER LEIK:**
`DC_P0_PRIOR` fer ur `{DEF 0,263 · MID 0,168 · FWD 0,013}` i
**`{DEF 0,256 · MID 0,163 · FWD 0,011}`** (817/3188 · 583/3580 · 9/834).
Forgildid dregur ALLA ad ser medan laugin er litil, svo ofmaeling thar
ofmaelir alla.

**LAGFAERINGARNAR ERU SITT HVOR, ThVI GOGNIN ERU OLIK:**
- **Lifandi smiðurinn** faer thad rett: `explain` er **fylki med einni faerslu
  per LEIK** og hver ber `defensive_contribution` med `points`. Hittir eru
  taldir thadan, byrjanir ur `st.starts`, og teljarinn er thakadur vid
  byrjanir (`Math.min`) — hittur i leik sem hann byrjadi ekki ma ekki fara i
  teljara sem hefur byrjanir i nefnara.
- **Sogulegi smiðurinn** getur ekki nad thvi: summan leyfir **thrju** svor.
  `starts === 1` er venjulegt; `starts >= 2 && dc < th` er **akvardad**
  (hvorugur leikur gat nad throskuldi); `starts >= 2 && dc >= th` er
  **oakvardad** og fer ut ur BADUM — teljara og nefnara. „Faar maelingar ->
  ENGIN tala" gildir lika um staka rod. Talan er skrad (`undecided`) svo
  thognin se synileg.

**ThETTA HAFDI EKKI BITID ENN og hefdi bitid i FYRSTU TVOFOLDU UMFERD
2026/27.** Thess vegna er thad profad a TILBUNUM gognum, ekki bedid eftir
deginum. Verdir: `defcon-shrink.mjs` kaflar 6a (lifandi, `explain`) og 6b
(sogulegur, hreint fall) — **sex stokkbreytingar felldar**.

#### 16c-2. „FIXTURES API DEACTIVATED" — 200 SEM ER EKKI GOGNIN (4.9.2026)

Notandinn: *„lagadu allar brotnar API tengingar."* Ein theirra var brotin a
thann hatt sem enginn gat sed:

**`http://api.clubelo.com/Fixtures` svarar HTTP 200 med 26 baetum og bolurinn
er ordrett `Fixtures API deactivated`.** ClubElo hefur slokkt a
endapunktinum. Kodinn gataði a HTTP-stodunni, thattadi tomt CSV, skrifadi
`fixtures: []` og skradi **GRAENA rod med 0**. Graen rod sem ber ekkert er
verri en raud — hun segir „i lagi" um heimild sem er farin.

Nakvaemlega sama aett og `fdcouk` 301 -> `EC.csv` (kafli 6), og sama lausn:
**profsteinninn er INNIHALDID, ekki HTTP-stadan.** Rodin er nu raud og notan
segir bædi hvad gerdist og hvad tekur vid.

**KOSTNADURINN ER MAELDUR OG LITILL:** `eloCsByFx` er annad threp af thremur
i `csFor` (bokmakari, svo elo, svo `cleanSheetProb`), og threpid sem tekur
vid er **maelt betra** en gamla uppflettitaflan (skill 5,94% a moti 3,91%,
ΔBrier +0,00569). Raud rod thydir „ein heimild af thremur vantar".

**HINAR RAUDU RADIRNAR ERU EKKI ALLAR BILANIR:**
- `elo_api` — 502 a doguðu CSV-inu, EN vefurinn (`clubelo.com`) svarar 200 og
  vardadi varaleiðin fyllir `elo.json` (0,1 klst gomul). Raud `elo_api` vid
  hlidina a graenni `elo` ER honnunin (kafli 6).
- `apisports_account` / `apisports_injuries` — reikningurinn er **uppsagdur**
  og lagast ADEINS a `dashboard.api-football.com`. Ekkert i repo-inu getur
  opnad hann. Byrjunarlidin foru thegar yfir a FotMob.
- `prediction_ledger` — „184 klst fyrir frest, utan 36 klst gluggans" er RETT
  hegdun, ekki bilun.

#### 16c-3. MEIDSLA-HEIMILDIN: RAUD ROD ER RETTA SVARID — OG AUDGUNIN VAR AD YFIRTAKA HEIMILDINA (5.9.2026)

`apisports_injuries` hefur verid raud i niu daga (reikningurinn uppsagdur).
Spurningin „hvada heimild kemur i stadinn?" var **maeld adur en henni var
svarad**, og svarid er **engin**:

| | fjoldi |
|---|---|
| leikmenn | 652 |
| flaggadir (`status !== "a"` eda frett) | 172 |
| — brottfor/lan (`status: "u"`) | **99** — ekki meidsla-spurning |
| raunveruleg tiltaekileika-mal | **73** |
| … thar sem FPL NEFNIR tegundina | **59 (80,8%)** |
| … an tegundar | **14 (19,2%)** |
| radir med tomri frett | **0** |

Gatid er thvi **14 leikmenn af 652 (2,1%)** og thad er **likamshlutinn einn** —
`chance_of_playing_next_round` er til fyrir ALLAR 73. Talan 71% fra 8.8.2026
hefur ef eitthvad er batnad i 80,8%.

**BADAR FRIAR VARALEIDIR ERU VAGAR A NAKVAEMLEGA ThESSUM RODUM:**
- **FotMob** (20/20 HTTP 200, enginn token) ber `injury.id` — **EKKI
  likamshluta-koða**: sjo id sem thekja flest tilfellin eru **margraedd**
  (`130` -> Ankle/Other/Knee/Knock/Thigh). Vorpun sem vid smiðudum vaeri
  vorpun sem vid **fundum upp**.
- **sportsgambler** (HTTP 200, læsileg tegund) er **trufverdug heimild** —
  93,6% samhljoda FPL thar sem FPL hefur ThEGAR tegund — en a gap-rodunum
  baetir hun raunverulegum likamshluta a **5 radir med 0,8% samanlagt
  eignarhald**. „Other" er i **50%** gap-radanna a moti **4,1%** theirra sem
  FPL hefur typad: **~12x thjoppun**.

**BADAR ThEGJA A SOMU STODUM ThVI KLUBBARNIR HAFA EKKI GEFID ThAD UPP.
ThETTA ER ThOGN FELAGANNA, EKKI GAGNASKORTUR** — engin heimild lagar hana.
Endurkomudagurinn er sama saga: FotMob gefur mat a 40 af 45 „Unknown return
date" rodum, en heimildirnar tvaer **skeikar ad midgildi 22 dogum** (17% meira
en manud). Dagsetning sem tveir adilar deila um i thrjar vikur er omaeld tala
sem liti ut eins og maeling.

**Rauda rodin ber nu ThESSA astaedu, ekki bert „suspended"** — bert
villuskeyti sendir naesta mann i ad laga reikning eda leita ad heimild sem er
ekki til.

**OG UPPGOTVUNIN SEM VAR MEIRA VIRDI EN NOKKUR NY HEIMILD:** i
ahaettulistanum var `reason` ur ytri heimildinni birtur **FEITLETRADUR
FREMST** og FPL-frettin stytt i 30 stafi a eftir honum. Thad snyr vid
grunnreglunni sem allt repo-id stendur a — **FPL-status raedur tiltaekileika;
adrar heimildir mega AUDGA hann, aldrei skipta honum ut** (kafli 6) — og thad
var **virkt i dag** fyrir hverja rod sem `injuries.json` snerti. Nu leidir
FPL-frettin og audgunin fylgir a eftir. Vordur: `smoke.test.mjs` (rodin lesin
AF SKJANUM, ein stokkbreyting felld).

> **OG MAELITAEKIN SJALF BILUDU TVISVAR I ThESSARI ATHUGUN, BADI EINS:**
> fyrsta tegundar-thattunin fann likamshlutann „back" inni i **„Expected back
> 18 Sep"** og typadi thar med hverja dagsetta rod — gatid maeldist 12 i stad
> 14 og bjó til sjo gervi-ósamhljóða. Sama aett og `MUNaNEW` -> `NaN`:
> **taekid maeldi annad en thad sagdist maela.** Og „samhljoda" id i
> FotMob-vorpuninni voru naer oll **n = 1** — samhljomur vid n = 1 er tom
> fullyrding.

#### 16d. HVE LANGT AFTUR NA GOGNIN? — MAELT, EKKI ALYKTAD

Athugasemdin i `fetch-player-gw.mjs` sagdi ad varnar-dalkarnir vaeru „adeins
til fra 2025/26". **Thad er rangt:** FPL bar `tackles`,
`clearances_blocks_interceptions` og `recoveries` **2016-17 til 2018-19**,
felldi thau ut 2019-20 og tok thau upp aftur 2025-26. Okkar `SEASONS`-tafla
byrjar 2021/22 og missti thvi af theim.

**En thau eru ekki nothaef i DefCon-utreikning:** `tackles` er **stigvaxandi
vanskrad** i gomlu argongunum (hlutfall rada med `tackles == 0` fer 52,3% ->
58,2% -> 64,7% a moti 35,0% i 2025/26), staðfest gegn FotMob thar sem vaastav
les 0 en FotMob hefur raunverulega tolu. `tackles` er naudsynlegur hluti CBIT
fyrir DEF, svo DefCon reiknad ur theim vaeri kerfisbundid of lagt.

**LEIDIN SEM ER TIL er FotMob `/matchDetails`** — opid, enginn token, og
**27/27 nakvaem** samsvorun vid FPL a yfirlaps-timabilinu. Per-leikmanns
varnartolur na aftur til **2016-17** (2015-16 svarar ekki). ~2.280 koll fylla
gatid 2019-20 til 2024-25 = **65.787 leikmanna-umferdir**.
**Thad er sér ákvördun og hun er ekki tekin her**, thvi DefCon hreyfir ekki
stiga-akvordunina (+0,007/threp, CI inniheldur null); virdid er i ad maela
**thrautseigju milli timabila**, sem er einmitt profid sem naesta spurning
tharf.


