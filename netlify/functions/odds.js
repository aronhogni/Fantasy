/* ============================================================
   Netlify Function: odds.js
   Sækir bókmakera-línur frá The Odds API og FPL-gögn,
   reiknar CS% fyrir hvert lið úr væntum mörkum (Poisson).

   Lykillinn er GEYMDUR SEM UMHVERFISBREYTA (ODDS_API_KEY) á
   Netlify — ALDREI í kóðanum, aldrei sýnilegur í framenda.

   Slóð eftir uppsetningu:  /.netlify/functions/odds
   ============================================================ */

const FPL_BASE  = "https://fantasy.premierleague.com/api";

/* MUNADARLAUSAR ATHUGASEMDIR FJARLAEGDAR (25.8.2026). Fjorar
   athugasemdir stodu her og lystu follum sem eru EKKI i thessari skra —
   Poisson-CS, marka-skipting eftir sigurlikum og h2h-devigging fluttu i
   `src/market.js` thegar bokmakera-greinin var tekin ut 10.8.2026, en
   hausarnir urdu eftir yfir TOMU plassi.
   Thetta er ekki snyrting heldur sama regla og annars stadar i skjolun
   thessa repo-s: athugasemd sem lysir kóda sem er ekki tharna er RONG
   skjolun, og rong skjolun er verri en engin — hun sendir naesta mann i
   ad leita ad utfaerslu sem hann finnur aldrei. Nakvaemlega sama einkenni
   og athugasemdin sem var lagfaerd nedar i thessari skra i dag ("hingad
   kemst adeins thekkt fpl-*", sem var ofugt).                          */

/* TIMAMORK — VANTADI ALVEG (25.8.2026). Node/undici hefur ~300 s
   sjalfgildi, sem er ekki timamork heldur HENGJA, og Netlify drepur
   fallid a sinu eigin thaki (10 s) an thess ad skila CORS-hausum — svo
   vafrinn ser CORS-villu i stad "FPL svaradi ekki". Sama fjolskylda af
   thogulli bilun og var lagfaerd i `scripts/fetch.mjs` (FETCH_TIMEOUT_MS)
   og i `nfl/src/data.js` i dag. 8 s liggur UNDIR Netlify-thakinu, sem er
   allur tilgangurinn: vid viljum svara sjalf, ekki vera drepin.        */
const UPSTREAM_TIMEOUT_MS = 8000;

async function getJSON(url) {
  const safe = url.replace(/apiKey=[^&]+/, "apiKey=***");
  let r;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  } catch (e) {
    throw Object.assign(
      new Error(e?.name === "TimeoutError"
        ? `upstream timed out after ${UPSTREAM_TIMEOUT_MS / 1000}s: ${safe}`
        : `upstream unreachable: ${safe}`),
      { upstream: true });
  }
  if (!r.ok) throw Object.assign(new Error(`${r.status} ${safe}`),
                                 { upstream: true, status: r.status });
  return r.json();
}

export const handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  /* `key` var lesid hér fyrir bokmakera-greinina sem er farin — engin leid
     sem eftir stendur notar ODDS_API_KEY.                                */
  const path = (event.queryStringParameters && event.queryStringParameters.path) || "odds";

  try {
    // --- FPL-leiðir (opnar, engin lykill) — proxy framhjá CORS ---
    /* CDN-CACHE A ALLAR LEIDIR, EKKI ADEINS ThRJAR (25.8.2026).
       `fpl-league` og `fpl-live` hofdu hana; `bootstrap`, `fixtures`,
       `entry` og `picks` ekki — svo hver notandi, i hverri teikningu,
       kostadi sitt eigid kall i gegn. Fallid er OPID OG OAUDKENNT
       proxy, svo cache-hausinn er lika odyrasta motvaegid sem til er
       gegn thvi ad thad se misnotad: 60 s thak setur efri mork a hve
       mikid alag eitt kall getur borid uppstreymis.
       60 s er sama tala og hinar leidirnar bera — ekki ny akvordun,
       heldur SAMA akvordun latin gilda alls stadar.                   */
    const cache60 = { ...cors, "Netlify-CDN-Cache-Control": "public, durable, max-age=60" };

    if (path === "fpl-bootstrap") {
      const data = await getJSON(`${FPL_BASE}/bootstrap-static/`);
      return { statusCode: 200, headers: cache60, body: JSON.stringify(data) };
    }
    if (path === "fpl-fixtures") {
      const data = await getJSON(`${FPL_BASE}/fixtures/`);
      return { statusCode: 200, headers: cache60, body: JSON.stringify(data) };
    }
    /* `id` ER STADFEST SEM TALA — annars er slodin opin i uppstreymid.
       `fpl-league` gerdi thetta thegar; hér og i `fpl-picks` vantadi thad,
       svo `id=1/transfers/?x=` sotti adra slod undir fantasy.premierleague.com
       gegnum proxyid okkar. Strict-routing reglan (CLAUDE.md 7.2) a jafnt
       vid um innihald slodar og um `path` sjalft.                          */
    if (path === "fpl-entry") {
      const id = event.queryStringParameters.id;
      if (!/^\d+$/.test(String(id || ""))) {
        return { statusCode: 400, headers: cors,
                 body: JSON.stringify({ error: "id must be a number" }) };
      }
      const data = await getJSON(`${FPL_BASE}/entry/${id}/`);
      return { statusCode: 200, headers: cache60, body: JSON.stringify(data) };
    }
    /* EINKA-DEILDIR (mini-leagues). Standings-endapunkturinn er opinn en
       CORS-lokadur, eins og allt annad FPL — thess vegna fer hann hedan.
       `page` fylgir svo staerri deildir (>50 lid) seu naanlegar.
       CDN-cache 60 s: stadan breytist adeins thegar stig uppfaerast.     */
    if (path === "fpl-league") {
      const { id, page } = event.queryStringParameters;
      if (!/^\d+$/.test(String(id || ""))) {
        return { statusCode: 400, headers: cors,
                 body: JSON.stringify({ error: "id must be a number" }) };
      }
      const p = /^\d+$/.test(String(page || "")) ? page : 1;
      const data = await getJSON(
        `${FPL_BASE}/leagues-classic/${id}/standings/?page_standings=${p}`);
      return { statusCode: 200,
               headers: { ...cors, "Netlify-CDN-Cache-Control": "public, durable, max-age=60" },
               body: JSON.stringify(data) };
    }

    if (path === "fpl-picks") {
      const { id, gw } = event.queryStringParameters;
      if (!/^\d+$/.test(String(id || "")) || !/^\d+$/.test(String(gw || ""))) {
        return { statusCode: 400, headers: cors,
                 body: JSON.stringify({ error: "id and gw must be numbers" }) };
      }
      const data = await getJSON(`${FPL_BASE}/entry/${id}/event/${gw}/picks/`);
      return { statusCode: 200, headers: cache60, body: JSON.stringify(data) };
    }

    /* --- LIFANDI GÖGN — leiðirnar sem appið kallar á í hverri umferð ---
       ATH VILLAN SEM VAR: þessar leiðir VANTAÐI. Óþekkt path féll þá beint
       niður í bókmakera-greinina, sem (a) eyddi Odds-API-kvótanum við hverja
       umferðaskiptingu og (b) skilaði odds-JSON þar sem appið bjóst við
       leikja-stöðu — svo lifandi staðan virkaði aldrei.
       CDN-cache 60s: allir notendur deila einu FPL-kalli á mínútu.          */
    const liveCache = { ...cors, "Netlify-CDN-Cache-Control": "public, durable, max-age=60" };

    // Hráar leikmanna-tölur umferðar (stats + explain) — fyrir GW-frammistöðu
    if (path === "fpl-live") {
      const gw = event.queryStringParameters.gw;
      if (!/^\d+$/.test(gw || "")) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "gw must be a number" }) };
      const data = await getJSON(`${FPL_BASE}/event/${gw}/live/`);
      return { statusCode: 200, headers: liveCache, body: JSON.stringify(data) };
    }

    // Samandregin leikja-staða umferðar — fyrir stigatöfluna við völlinn.
    // Lögunin sem framendinn les: { any_live, fixtures:[{id, started,
    // finished, h:{score,goals,assists}, a:{...}}] } með leikmanna-ID-um.
    if (path === "live") {
      const gw = event.queryStringParameters.gw;
      if (!/^\d+$/.test(gw || "")) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "gw must be a number" }) };
      const fx = await getJSON(`${FPL_BASE}/fixtures/?event=${gw}`);
      const fixtures = (fx || []).map(f => {
        const stat = k => (f.stats || []).find(x => x.identifier === k) || { h: [], a: [] };
        const goals = stat("goals_scored"), assists = stat("assists");
        const ids = arr => (arr || []).map(x => x.element);
        return {
          id: f.id, started: !!f.started,
          finished: !!(f.finished || f.finished_provisional),
          minutes: f.minutes ?? 0,
          h: { score: f.team_h_score, goals: ids(goals.h), assists: ids(assists.h) },
          a: { score: f.team_a_score, goals: ids(goals.a), assists: ids(assists.a) },
        };
      });
      const any_live = fixtures.some(f => f.started && !f.finished);
      return { statusCode: 200, headers: liveCache, body: JSON.stringify({ gw: +gw, any_live, fixtures }) };
    }

    /* ÓÞEKKT path Á AÐ SVARA 400, ekki falla í bókmakera-greinina —
       það var kvóta-lekinn.

       OG `odds` ER NÚ MEÐTALIÐ (10.8.2026). Greinin var opin öllum
       (`Access-Control-Allow-Origin: *`, engin auðkenning, ENGINN
       CDN-cache) og hvert kall kostar 1 einingu af 500/mán. Hún er
       STAÐFEST ÓNOTUÐ: framendinn kallar aðeins á `live`, `fpl-live`,
       `fpl-picks`, `fpl-entry` og `fpl-league`, og pipeline sækir Odds-API
       BEINT með `ODDS_API_KEY` og skrifar `data/odds.json` — appið les þá
       skrá. Cache dugði ekki sem vörn: jafnvel 1 klst TTL leyfir ~720
       köll á mánuði, sem er yfir kvótanum.

       Sé hún tekin í notkun aftur: skila 200 hér OG setja
       `Netlify-CDN-Cache-Control` á hana, eins og `fpl-league`.        */
    if (path !== "live" && !path.startsWith("fpl-")) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({
        error: `unknown or disabled path: ${path}`,
        hint: path === "odds"
          ? "the bookmaker branch is disabled — the app reads data/odds.json from the pipeline"
          : undefined,
      }) };
    }
    /* ============================================================
       ATHUGASEMDIN SEM STOD HER VAR OFUG — OG HUN VAR EINA "VORNIN"
       (25.8.2026)

       Hun sagdi: "Hingad kemst adeins thekkt `fpl-*` sem fell ekki i
       greinarnar ad ofan." ThAD ER NAKVAEMLEGA OFUGT. ALLAR thekktar
       `fpl-*`-leidir skila svari i sinni eigin grein ad ofan, svo thad
       eina sem kemst hingad er `fpl-` MED OThEKKTU VIDSKEYTI —
       `?path=fpl-typo`. Hlidid ad ofan hleypir ollu sem byrjar a `fpl-`
       i gegn, og her var ENGIN `return`: fallid skiladi `undefined`,
       sem Netlify thydir i 502/tomt svar AN CORS-HAUSA. Vafrinn ser tha
       CORS-villu i stad skyrs 400, sem sendir naesta mann i ad leita ad
       CORS-stillingum sem eru ekki bilunin.

       Reglan er su sama og fyrir allar adrar othekktar leidir: 400 med
       CORS-hausum og skyrri skyringu. Athugasemd sem er rong er verri en
       engin — hun let gatid lita ut eins og ákvordun.

       (Bokmakera-greinin var her og er farin 10.8.2026; hlidid ad ofan
       skilar 400 fyrir `odds`. Se hun endurvakin: taktu formuluna UR
       `src/market.js` og settu CDN-cache a hana. Git-sagan geymir
       gomlu utfaersluna.)
       ============================================================ */
    return { statusCode: 400, headers: cors, body: JSON.stringify({
      error: `unknown or disabled path: ${path}`,
      hint: "known paths: live, fpl-bootstrap, fpl-fixtures, fpl-entry, "
          + "fpl-league, fpl-picks, fpl-live",
    }) };
  } catch (err) {
    /* ============================================================
       BILUN SVARADI 200 (25.8.2026)

       Her stod `statusCode: 200` med `{ error, games: [] }`. Klient sem
       les ekki `error`-svidid — og `App.jsx` gerir thad ekki, hann setur
       svarid beint i state — tulkar bilun sem GOGN. Tom `games` les tha
       eins og "engir leikir", sem er MAELING, i stad "vid vitum ekki".
       Nakvaemlega reglan sem allt thetta repo er byggt a: tomt gildi er
       ekki null (CLAUDE.md kafli 8).

       502 fyrir uppstreymis-bilun, 500 fyrir okkar eigin. CORS-hausar
       fylgja BADUM — an theirra ser vafrinn CORS-villu i stad
       skyringar, sem er villan sem var lagfaerd nokkrum linum ofar.
       `games: []` er varðveitt i bolnum svo eldri klient sem afbyggir
       hann hrynji ekki; thad sem breytist er ad stadan segir loksins
       satt.

       ATH: ENGINN CDN-CACHE a villu. Vaeri hun cachud i 60 s myndi eitt
       hiksti hja FPL frysta villuna fyrir ALLA notendur i minutu.
       ============================================================ */
    const upstream = err?.upstream === true;
    return {
      statusCode: upstream ? 502 : 500,
      headers: { ...cors, "Cache-Control": "no-store" },
      body: JSON.stringify({ error: String(err.message || err), games: [] }),
    };
  }
};
