# Fantasy plönun — FPL 2026/27

Skipulagstól fyrir Fantasy Premier League: völlur með liðinu þínu, framtíðar-skipti
eftir umferðum, FFDR-leikjaþyngd (mæld, ekki ágiskuð), CS%-líkur, chips-plönun,
tillögu-kerfi og lifandi staða — allt úr opinberum gögnum.

**Appið:** https://aronhogni.github.io/Fantasy/

## Uppbygging

| Hluti | Hvar | Kostnaður |
|---|---|---|
| **Framendi** (`src/`) | GitHub Pages, byggt af `pages.yml` við hverja ýtingu á app-skrár | frítt |
| **Gagna-pipeline** (`scripts/fetch.mjs`) | GitHub Actions cron: `fetch.yml` daglega kl. 05 UTC, `fetch-fast.yml` á 30 mín (meiðsli/verð) | frítt |
| **Gögn** (`data/`) | Committuð í repo, framendinn les frá raw.githubusercontent (CORS-opið) | frítt |
| **Proxy** (`netlify/functions/odds.js`) | Netlify — AÐEINS fyrir slóðir sem vafrinn nær ekki beint í (FPL-API sendir ekki CORS-höfuð): lifandi staða, picks, live-tölur | ~4 credit/mán |

`netlify.toml` er með ignore-reglu: Netlify byggir **aðeins** þegar `netlify/` breytist.
App- og gagna-breytingar kosta því engin Netlify-credit.

## Leyndarmál (GitHub Secrets / Netlify env)

- `ODDS_API_KEY` — the-odds-api.com, fyrir bókmakera-CS% (valfrjálst; appið virkar án)
- `EURO_API_KEY` — football-data.org, fyrir Evrópu-/bikarleiki (valfrjálst)
- `API_SPORTS_KEY` — api-football.com, staðfest byrjunarlið og tegund meiðsla (valfrjálst)
- `BSD_KEY` — sports.bzzoiro.com, per-skot xG og skotakort (valfrjálst, ókeypis þrep)

Vanti lykil sleppir pipeline þeirri heimild **þegjandi** (`FLAGS`) — ekkert hrynur,
dálkarnir hennar verða einfaldlega tómir.

Pipeline-inn sækir odds aðeins tvisvar per umferð (36 klst og 6–8 dögum fyrir frest)
— ~25 credit/mán af 500 fríum.

## Þróun

```bash
npm install
npm run dev      # staðbundin þróun
npm run build    # framleiðslu-bygging í dist/
npm test         # keyrslupróf (jsdom + alvöru data/-skrárnar)
```

## Prófin

`tests/smoke.test.mjs` rennir appinu í jsdom með raunverulegu gagnaskránum úr
`data/` og fer í gegnum: hleðslu, völlinn (15 spjöld), umferðaskipti, skipti með
FPL-reglum, endurstillingu, leikmannayfirlit, FFDR-töfluna, chips, tillögur og
vistun. Fetch er hermt — engin netköll.
