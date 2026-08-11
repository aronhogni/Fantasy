/* ============================================================
   Netlify Function: odds.js
   Sækir bókmakera-línur frá The Odds API og FPL-gögn,
   reiknar CS% fyrir hvert lið úr væntum mörkum (Poisson).

   Lykillinn er GEYMDUR SEM UMHVERFISBREYTA (ODDS_API_KEY) á
   Netlify — ALDREI í kóðanum, aldrei sýnilegur í framenda.

   Slóð eftir uppsetningu:  /.netlify/functions/odds
   ============================================================ */

const FPL_BASE  = "https://fantasy.premierleague.com/api";

// FPL-liðakóðar -> The Odds API heiti (til að para saman leiki)

// ---- Poisson: P(X=0) = e^(-lambda) => CS-líkur = P(andstæðingur skorar 0) ----

// Skiptir væntum heildar-mörkum leiksins niður á liðin út frá sigurlíkum.
// homeWinP/awayWinP/drawP eru líkur (0–1). Sterkara lið fær stærri hlut.


// Normaliserar h2h-líkur (fjarlægir "vig" bókmakarans)

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url.replace(/apiKey=[^&]+/, "apiKey=***")}`);
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
    if (path === "fpl-bootstrap") {
      const data = await getJSON(`${FPL_BASE}/bootstrap-static/`);
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }
    if (path === "fpl-fixtures") {
      const data = await getJSON(`${FPL_BASE}/fixtures/`);
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
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
                 body: JSON.stringify({ error: "id verdur ad vera tala" }) };
      }
      const data = await getJSON(`${FPL_BASE}/entry/${id}/`);
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }
    /* EINKA-DEILDIR (mini-leagues). Standings-endapunkturinn er opinn en
       CORS-lokadur, eins og allt annad FPL — thess vegna fer hann hedan.
       `page` fylgir svo staerri deildir (>50 lid) seu naanlegar.
       CDN-cache 60 s: stadan breytist adeins thegar stig uppfaerast.     */
    if (path === "fpl-league") {
      const { id, page } = event.queryStringParameters;
      if (!/^\d+$/.test(String(id || ""))) {
        return { statusCode: 400, headers: cors,
                 body: JSON.stringify({ error: "id verdur ad vera tala" }) };
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
                 body: JSON.stringify({ error: "id og gw verda ad vera tolur" }) };
      }
      const data = await getJSON(`${FPL_BASE}/entry/${id}/event/${gw}/picks/`);
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
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
      if (!/^\d+$/.test(gw || "")) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "gw vantar" }) };
      const data = await getJSON(`${FPL_BASE}/event/${gw}/live/`);
      return { statusCode: 200, headers: liveCache, body: JSON.stringify(data) };
    }

    // Samandregin leikja-staða umferðar — fyrir stigatöfluna við völlinn.
    // Lögunin sem framendinn les: { any_live, fixtures:[{id, started,
    // finished, h:{score,goals,assists}, a:{...}}] } með leikmanna-ID-um.
    if (path === "live") {
      const gw = event.queryStringParameters.gw;
      if (!/^\d+$/.test(gw || "")) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "gw vantar" }) };
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
        error: `óþekkt eða óvirk path: ${path}`,
        hint: path === "odds"
          ? "bókmakera-greinin er óvirk — appið les data/odds.json úr pipeline"
          : undefined,
      }) };
    }
    /* Hingað kemst aðeins þekkt `fpl-*` sem féll ekki í greinarnar að ofan
       (t.d. `fpl-bootstrap`/`fpl-fixtures`, sem framendinn les núna beint
       af raw.githubusercontent). Þær svara enn — engin kvóta-áhætta.    */
    /* BOKMAKERA-GREININ VAR HER OG ER FARIN (10.8.2026).
       Hlidid ad ofan skilar 400 fyrir allt sem er ekki `live`/`fpl-*`, svo
       hun var ordin OAANAANLEG — ~60 linur sem enginn gat kallad a, asamt
       eigin afritum af devig/splitGoals/cleanSheetPct sem enginn annar
       notadi. Verra: sa kodi bar enn omaeldu `line + 0.2` nalgunina sem
       src/market.js leysti af holmi med MAELDRI kvordun — tvaer olikar
       formulur undir sama nafni.

       Appid les markadslinur ur data/odds.json (pipeline saekir Odds-API
       BEINT). Se leidin endurvakin: taktu formuluna UR src/market.js
       (esbuild er thegar stillt i netlify.toml) og settu CDN-cache a hana.
       Git-sagan geymir gomlu utfaersluna.                              */
  } catch (err) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ error: String(err.message||err), games: [] }) };
  }
};
