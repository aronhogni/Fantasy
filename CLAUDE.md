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
`src/App.jsx` 3.397 l · `scripts/fetch.mjs` 1.769 l · `src/model.js` 232 l ·
`src/Pitch.jsx` 124 l · `netlify/functions/odds.js` 201 l · prófin ~790 l.

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
- **`TIER_CUTS = [2.45, 2.76, 2.92, 3.21, 3.45]`** eru **sextílar raunverulegrar
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

---

## 4. Prófakerfið — `npm test`

`tests/run-tests.mjs` keyrir fjögur söfn, **144 próf**, öll græn:

| Safn | Fjöldi | Hvað það gerir |
|---|---|---|
| `model.test.mjs` | 77 | Hver birt tala: söluverð, frí skipti/refsingar, vænt stig, mælda taflan, FFDR-eiginleikar, verðspá, PWA-skrár. **Endurkvarðar litamörkin úr `data/`.** |
| `ffdr-backtest.mjs` | 10 | FFDR spáð fyrir öllum 380 leikjum 2025/26 með styrk 2024/25 eingöngu. Grænasti sjöttungur 38% CS vs 13% rauðasti; r=0,220 við mörk á sig (hrátt FDR 0,169). Tölfræðileg vikmörk, ekki hörð mörk. |
| `travel-measure.mjs` | 2 | Vörðurinn í kafla 3. |
| `smoke.test.mjs` | 55 | Appið keyrt í **jsdom** með raunverulegum `data/`-skrám og hermdu `fetch`. 15 spjöld, peningar (banki+lið = £100.0), umferðaskipti, FPL-reglur, chips, andstæðingar, vistun, meiðsli, ferðalengd. |

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

## 7. Næstu skref (rædd, ekki byrjað)

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
