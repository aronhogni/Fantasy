# FPL Plönun — uppsetning (Netlify + The Odds API)

Þrjár skrár:
- `fpl_planner.jsx` — appið (framendi)
- `netlify/functions/odds.js` — proxy sem sækir bókmakera-línur + FPL-gögn og reiknar CS%
- `README.md` — þessi skrá

Þú setur þetta upp sjálf/ur á Netlify (frítt) — nákvæmlega eins og fyrri öppin þín. Ég get ekki hýst það né séð lyklana þína; það á að vera þannig.

---

## 1. Fáðu The Odds API lykil (frítt, 2 mín)

1. Farðu á **the-odds-api.com** → "Get API Key"
2. Skráðu netfang → lykillinn kemur í tölvupósti (löng runa af stöfum)
3. Ókeypis þrepið gefur ~500 köll/mánuði — nóg fyrir næstu 1–2 umferðir með vistun

**Ekki líma lykilinn inn í kóðann.** Hann fer í Netlify-umhverfisbreytu (skref 4). Þannig sést hann aldrei í vafranum.

---

## 2. Byggðu appið (Vite + React)

Í tölvunni (eða beint á Netlify — sjá skref 3b):

```bash
npm create vite@latest fpl-planner -- --template react
cd fpl-planner
npm install
```

Afritaðu svo:
- `fpl_planner.jsx` → `src/App.jsx` (skrifaðu yfir)
- `netlify/functions/odds.js` → `netlify/functions/odds.js` (búðu til möppuna)

Opnaðu `src/App.jsx` og settu proxy-slóðina efst (þú færð hana eftir fyrsta deploy — skref 3):
```js
const PROXY_URL = "https://ÞITT-APP.netlify.app/.netlify/functions/odds";
```

---

## 3. Settu í loftið á Netlify

**3a. Með GitHub (mælt með):**
1. Ýttu möppunni í nýtt GitHub-repo (`git init`, commit, push) — eins og fyrri verkefnin
2. Á **netlify.com** → "Add new site" → "Import from Git" → veldu repo-ið
3. Build command: `npm run build` · Publish directory: `dist`
4. Deploy → þú færð slóð eins og `https://fpl-planner-abc.netlify.app`

**3b. Án GitHub (drag & drop):** virkar fyrir framendann EN ekki fyrir functions. Notaðu GitHub-leiðina svo proxy-fallið keyri.

---

## 4. Settu API-lykilinn inn (falinn)

1. Netlify → síðan þín → **Site configuration → Environment variables**
2. "Add a variable":
   - Key: `ODDS_API_KEY`
   - Value: lykillinn úr skrefi 1
3. Vistaðu → **Deploys → Trigger deploy → Deploy site** (svo breytan taki gildi)

---

## 5. Kláraðu tenginguna

1. Settu réttu `PROXY_URL` slóðina í `src/App.jsx` (skref 2), committaðu, push → Netlify byggir aftur
2. Opnaðu appið. Efst á að standa:
   **"Bókmakera-CS% virkt"** með grænum punkti = allt tengt.
3. Leikja-flísarnar litast nú eftir raunverulegum hreint-líkum, varnarmenn sýna CS% og sóknarmenn vænt mörk.

---

## Hvað virkar strax vs hvað þarf tengingu

| Eiginleiki | Án proxy | Með proxy |
|---|---|---|
| Tímalína + lið morfast eftir GW | ✅ | ✅ |
| Framtíðar-skipti eftir vikum | ✅ | ✅ |
| Verðhækkunar-mælir | ✅ (sáð) | ✅ (lifandi kemur í v-næst) |
| Leikja-litur | FDR (sáð) | **CS% frá bókmökurum** |
| CS% á varnarmönnum | — | ✅ |
| Vænt mörk á sóknarmönnum | — | ✅ |

## Athugasemdir
- **Bókmakera-markaðir opna 5–7 daga fyrir leik.** Fjarlægar umferðir hafa engar línur → appið sýnir FDR/spá þar, skiptir sjálfkrafa í CS% þegar markaður opnar.
- **CS%-útreikningur:** vænt mörk leiksins (úr totals-línu) skipt á liðin (úr sigurlíkum), sett í Poisson: CS% = e^(−vænt mörk andstæðings). Staðlaða aðferðin.
- **Þrep-sparnaður:** fallið sækir aðeins `soccer_epl` og velur 3 helstu banka. Bættu við vistun (cache) í fallinu ef þú vilt spara enn meira (t.d. geyma svar í 3 klst).
- **FPL-gögn:** fallið hefur líka `?path=fpl-bootstrap|fpl-fixtures|fpl-entry|fpl-picks` tilbúið fyrir næsta skref (lifandi verð/stig/lið úr URL).
