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
