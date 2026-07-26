/* ============================================================
   Netlify Function: odds.js
   Sækir bókmakera-línur frá The Odds API og FPL-gögn,
   reiknar CS% fyrir hvert lið úr væntum mörkum (Poisson).

   Lykillinn er GEYMDUR SEM UMHVERFISBREYTA (ODDS_API_KEY) á
   Netlify — ALDREI í kóðanum, aldrei sýnilegur í framenda.

   Slóð eftir uppsetningu:  /.netlify/functions/odds
   ============================================================ */

const ODDS_BASE = "https://api.the-odds-api.com/v4";
const FPL_BASE  = "https://fantasy.premierleague.com/api";

// FPL-liðakóðar -> The Odds API heiti (til að para saman leiki)
const TEAM_ALIAS = {
  "Arsenal":"ARS","Aston Villa":"AVL","Bournemouth":"BOU","Brentford":"BRE",
  "Brighton and Hove Albion":"BHA","Brighton":"BHA","Chelsea":"CHE",
  "Coventry City":"COV","Coventry":"COV","Crystal Palace":"CRY","Everton":"EVE",
  "Fulham":"FUL","Hull City":"HUL","Hull":"HUL","Ipswich Town":"IPS","Ipswich":"IPS",
  "Leeds United":"LEE","Leeds":"LEE","Liverpool":"LIV","Manchester City":"MCI",
  "Manchester United":"MUN","Man Utd":"MUN","Newcastle United":"NEW","Newcastle":"NEW",
  "Nottingham Forest":"NFO","Nott'm Forest":"NFO","Sunderland":"SUN",
  "Tottenham Hotspur":"TOT","Tottenham":"TOT","West Ham United":"WHU","West Ham":"WHU",
};
const alias = (name) => TEAM_ALIAS[name] || name;

// ---- Poisson: P(X=0) = e^(-lambda) => CS-líkur = P(andstæðingur skorar 0) ----
function cleanSheetPct(oppExpectedGoals) {
  return Math.round(Math.exp(-oppExpectedGoals) * 100);
}

// Skiptir væntum heildar-mörkum leiksins niður á liðin út frá sigurlíkum.
// homeWinP/awayWinP/drawP eru líkur (0–1). Sterkara lið fær stærri hlut.
function splitGoals(totalGoals, homeWinP, awayWinP) {
  // einfalt en stöðugt: hlutdeild ræðst af hlutfalli sigurlíkna (+ jafn grunnur)
  const hShare = 0.5 + (homeWinP - awayWinP) * 0.35; // 0.15–0.85 bil
  const home = totalGoals * Math.min(0.85, Math.max(0.15, hShare));
  const away = totalGoals - home;
  return { home, away };
}

function impliedProb(decimalOdds) { return decimalOdds > 0 ? 1 / decimalOdds : 0; }

// Normaliserar h2h-líkur (fjarlægir "vig" bókmakarans)
function devig(h, d, a) {
  const raw = [impliedProb(h), impliedProb(d), impliedProb(a)];
  const s = raw.reduce((x,y)=>x+y,0) || 1;
  return { home: raw[0]/s, draw: raw[1]/s, away: raw[2]/s };
}

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

  const key = process.env.ODDS_API_KEY;
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
    if (path === "fpl-entry") {
      const id = event.queryStringParameters.id;
      const data = await getJSON(`${FPL_BASE}/entry/${id}/`);
      return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
    }
    if (path === "fpl-picks") {
      const { id, gw } = event.queryStringParameters;
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

    // Óþekkt path á að SVARA 400, ekki falla í bókmakera-greinina —
    // það var kvóta-lekinn.
    if (path !== "odds") {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `óþekkt path: ${path}` }) };
    }

    // --- Bókmakera-línur + CS%-útreikningur ---
    if (!key) {
      return { statusCode: 200, headers: cors, body: JSON.stringify({
        error: "ODDS_API_KEY vantar. Bættu honum við í Netlify → Site settings → Environment variables.",
        games: [],
      })};
    }

    // h2h (sigurlíkur) + totals (mörk). regions=uk fyrir breska banka. Eitt kall = báðir markaðir.
    const url = `${ODDS_BASE}/sports/soccer_epl/odds/?apiKey=${key}`
      + `&regions=uk&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso`;
    const raw = await getJSON(url);

    // Veldu 3 helstu banka ef til (annars hvað sem er)
    const PREFERRED = ["bet365","williamhill","betfair_ex_uk","skybet","paddypower"];

    const games = (raw || []).map((g) => {
      const home = g.home_team, away = g.away_team;

      // finn bókmakara sem hafa bæði h2h og totals
      const books = (g.bookmakers || []).filter(b =>
        b.markets?.some(m=>m.key==="h2h") && b.markets?.some(m=>m.key==="totals"));
      const pick = books.sort((a,b)=>
        (PREFERRED.indexOf(a.key)+1||99)-(PREFERRED.indexOf(b.key)+1||99)).slice(0,3);
      if (!pick.length) return null;

      // meðaltal yfir völdu bankana
      let totLine=0, totN=0, hO=0, dO=0, aO=0, n=0;
      for (const b of pick) {
        const h2h = b.markets.find(m=>m.key==="h2h");
        const tot = b.markets.find(m=>m.key==="totals");
        if (h2h) {
          const ho = h2h.outcomes.find(o=>o.name===home)?.price;
          const ao = h2h.outcomes.find(o=>o.name===away)?.price;
          const dr = h2h.outcomes.find(o=>o.name==="Draw")?.price;
          if (ho&&ao&&dr){ hO+=ho; aO+=ao; dO+=dr; n++; }
        }
        if (tot) {
          // notum "over" viðmiðunarlínuna (t.d. 2.5) sem vænt mörk-nálgun
          const over = tot.outcomes.find(o=>o.name==="Over");
          if (over?.point){ totLine+=over.point; totN++; }
        }
      }
      if (!n || !totN) return null;

      const probs = devig(hO/n, dO/n, aO/n);
      const expTotal = totLine/totN + 0.2; // línan er miðgildi; +0.2 nálgar meðal-mörk
      const { home:hxg, away:axg } = splitGoals(expTotal, probs.home, probs.away);

      return {
        home: alias(home), away: alias(away),
        commence: g.commence_time,
        expTotalGoals: Math.round(expTotal*10)/10,
        homeXG: Math.round(hxg*10)/10,
        awayXG: Math.round(axg*10)/10,
        homeCS: cleanSheetPct(axg), // heima heldur hreinu ef ÚTI skorar 0
        awayCS: cleanSheetPct(hxg),
        books: pick.map(b=>b.title),
      };
    }).filter(Boolean);

    return { statusCode: 200, headers: cors, body: JSON.stringify({ games, fetched: new Date().toISOString() }) };

  } catch (err) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ error: String(err.message||err), games: [] }) };
  }
};
