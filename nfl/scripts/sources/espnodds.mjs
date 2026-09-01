/* ============================================================
   espnodds.mjs — MARKADSLAGID. Vedbankalinur, framtidarmarkadir og
   marka-prop, allt OKEYPIS og an lykils.

   HVERS VEGNA ESPN EN EKKI THE ODDS API:
   FPL-verkefnid a `ODDS_API_KEY` og hann er kvotadur og kostar. ESPN
   birtir DraftKings-linur fyrir hvern leik, framtidarmarkadi fyrir
   ollum 32 lidum og marka-prop per leik — an lykils og an kvota.
   NFL-hlutinn er byggdur a thvi ad ENGIN heimild krefjist lykils
   (sja NFL.md kafla 2), og thetta helst innan theirrar reglu.

   THRENNT SEM MARKADURINN SVARAR OG EKKERT ANNAD GERIR JAFN VEL:

   1. HVERSU MORG STIG VERDA SKORUD OG AF HVERJUM.
      vaent stig heimalids = total/2 + spread/2. Thetta er sterkasta
      einstaka inntakid i vikulega framleidslu og thad er lika
      besta svarid vid "hver er liklegur til ad skora".

   2. HVADA VARNIR ERU GODAR OG SLAEMAR.
      Vorn lids = MEDALTAL VAENTRA STIGA ANDSTAEDINGA THESS yfir
      timabilid. Thad er domur markadarins um vornina, tekinn ur
      272 leikjum, og hann er til STRAX i forleik — olikt tolfraedi
      sem tharf leiki til ad verda til.

   3. MARKA-LIKUR PER LEIKMANN ("Anytime Touchdown Scorer").
      Beinasta svarid vid spurningunni. En sja notu vid `tdProps`:
      thau eru EKKI verdlogd fyrr en naerri leikdegi.

   ============================================================
   FORMERKID A FORGJOFINNI — STAERSTA GILDRAN HER

   ESPN: `spread` er NEIKVAETT thegar HEIMALIDID er favorit.
   nflverse `spread_line`: JAKVAETT thegar heimalidid er favorit.

   THAU ERU ANDSTAED. Stadfest 9.8.2026 a ollum 16 leikjum viku 1:
     NE @ SEA   spread -3.5   details "SEA -3.5"   -> heimalid favorit
     BAL @ IND  spread  3.5   details "BAL -3.5"   -> utilid favorit

   Snuist thetta vid les ALLT vikulega likanid ofugt — sterku lidin
   faengju lag vaent skor — og EKKERT brotnar synilega. Thess vegna
   er merkid snuid HER, einu sinni, i nflverse-konvensjonina sem
   `impliedTeamTotals` i `model.js` gerir rad fyrir. Vordur:
   `tests/nfl-market.mjs` kafli 1.
   ============================================================ */

import { getJSON, getJSONFirst, record, pool } from "../lib/http.mjs";
import { normTeam } from "../../src/names.js";

/* TVEIR HOSTAR, SAMA LEID — sja `getJSONFirst` i lib/http.mjs. Vikuleg
   linu-sokn er nakvaemlega thad sem 403-id ur CI slo ut: 18 radir
   `espn_lines_w{n} failed: HTTP 403` i status.json 20.-21.8.2026. */
const SITES = [
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl",
  "https://site.web.api.espn.com/apis/site/v2/sports/football/nfl",
];
const CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

/**
 * Linur fyrir allar umferdir timabilsins.
 * EITT KALL A VIKU (18 alls) i stad tveggja per leik (544) — vika-
 * yfirlitid ber baedi lidin og linurnar.
 */
export async function gameLines(season, weeks = 18) {
  const wk = Array.from({ length: weeks }, (_, i) => i + 1);
  const out = [];
  await pool(wk, 4, async (w) => {
    try {
      const d = await getJSONFirst(`espn_lines_w${w}`,
        SITES.map((h) => `${h}/scoreboard?dates=${season}&seasontype=2&week=${w}`));
      for (const e of d.events || []) {
        const c = (e.competitions || [])[0];
        if (!c) continue;
        const tm = {};
        for (const t of c.competitors || []) tm[t.homeAway] = t.team;
        const o = (c.odds || [])[0] || {};
        const espnSpread = num(o.spread);
        out.push({
          id: e.id, week: w, date: e.date,
          home: normTeam(tm.home && tm.home.abbreviation),
          away: normTeam(tm.away && tm.away.abbreviation),
          /* SNUID I nflverse-KONVENSJON: jakvaett = heimalid favorit.
             Sja langa notu i haus skrarinnar. */
          spread: espnSpread == null ? null : -espnSpread,
          total: num(o.overUnder),
          provider: (o.provider && o.provider.name) || null,
          details: o.details || null,
        });
      }
    } catch (e) {
      record(`espn_lines_w${w}`, false, `failed: ${e.message}`);
    }
  });
  /* ============================================================
     ROD UT UR `pool` ER KOMURODIN — OG HUN SKILAR SER A SKJAINN
     ============================================================
     `pool(..., 4, ...)` keyrir fjora samtimis og `out.push` skrifar i
     ThEIRRI rod sem svorin berast. Maelt 31.8.2026: `market/2026-08-30`
     og `-08-31` bera NAKVAEMLEGA somu leiki i ANNARRI rod.

     ÞAD ER EKKI SNYRTIMAL: `teamMarketStrength` byggir kort sitt i
     thessari rod og radar sidan a NAMUNDADRI tolu, svo jafntefli
     leysast eftir komurod — sami inntakslisti i ondverdri rod faerdi
     `allowedRank`/`scoredRank` hja **2 lidum af 32**. Þaer tolur eru
     birtar sem varnar-rod i bordinu.

     Þetta er sama aett og BSD-keyrslan i FPL-verkefninu sem gaf
     389/390/391 paranir i thremur keyrslum: keyrsla sem er ekki
     endurgeranleg er ekki maeling. */
  out.sort((a, b) => (a.week - b.week)
    || String(a.id).localeCompare(String(b.id)));
  const withLine = out.filter((g) => g.total != null && g.spread != null).length;
  record("espn_game_lines", out.length > 200,
    `${out.length} games, ${withLine} with a posted line`);
  return out;
}

/**
 * Framtidarmarkadir — domur markadarins um lidsstyrk I FORLEIK,
 * adur en nokkur leikur hefur farid fram.
 *
 * Likur eru AFVIGADAR (de-vigged): hraar bokmakara-likur leggjast i
 * meira en 1 thvi alagid er inni i theim. An afvigunar vaeri
 * "likur a Super Bowl" hja ollum lidum samtals ~1,3 og hver einasta
 * tala of ha.
 */
export async function futures(season) {
  try {
    const d = await getJSON(`${CORE}/seasons/${season}/futures`);
    const wanted = /super bowl|conference|division/i;
    const out = [];
    for (const m of d.items || []) {
      const name = m.name || "";
      if (!wanted.test(name)) continue;
      for (const f of m.futures || []) {
        const prov = (f.provider && f.provider.name) || null;
        const rows = [];
        for (const b of f.books || []) {
          if (!b.team) continue;
          const abbr = teamAbbrFromRef(b.team.$ref);
          const dec = decimalFrom(b);
          if (!abbr || !dec) continue;
          rows.push({ team: abbr, decimal: dec, raw: 1 / dec });
        }
        if (rows.length < 2) continue;
        const sum = rows.reduce((a, r) => a + r.raw, 0);
        out.push({
          market: name, provider: prov,
          teams: rows.map((r) => ({
            team: r.team,
            prob: Math.round((r.raw / sum) * 10000) / 10000,
          })).sort((a, b) => b.prob - a.prob),
        });
      }
    }
    record("espn_futures", out.length > 0,
      `${out.length} team futures markets`);
    return out;
  } catch (e) {
    record("espn_futures", false, `failed: ${e.message}`);
    return [];
  }
}

/**
 * "Anytime Touchdown Scorer" per leik.
 *
 * VARNAGLI SEM VERDUR AD FYLGJA: bokmakarar verdleggja marka-prop
 * FYRST NOKKRUM DOGUM FYRIR LEIK. Maelt 9.8.2026 (manudi fyrir viku 1):
 * 24 leikmenn a lista per leik en **0 med verd**. I loknum 2025-leik
 * voru 1.697 prop med raunverulegum verdum.
 *
 * Thess vegna skilar thetta TOMU i forleik og thad er RETT. Ad fylla
 * i eydurnar med tolfraedi-agiskun vaeri tala sem litur ut eins og
 * markadsverd en er thad ekki.
 */
export async function tdProps(eventIds, { concurrency = 4 } = {}) {
  const out = [];
  let priced = 0, listed = 0;
  await pool(eventIds, concurrency, async (eid) => {
    try {
      const o = await getJSON(`${CORE}/events/${eid}/competitions/${eid}/odds`);
      const item = (o.items || [])[0];
      if (!item || !item.propBets) return;
      let page = 1, pages = 1;
      while (page <= pages && page <= 8) {
        const p = await getJSON(
          `${item.propBets.$ref.replace(/^http:/, "https:")}&page=${page}`);
        pages = p.pageCount || 1;
        for (const b of p.items || []) {
          const type = (b.type && b.type.name) || "";
          if (!/anytime touchdown/i.test(type)) continue;
          listed++;
          const cur = b.current || {};
          const price = cur.over || cur.under || cur.target || null;
          const dec = price && Number.isFinite(price.value) ? price.value : null;
          if (dec) priced++;
          out.push({
            eventId: eid,
            espnAthleteId: athleteIdFromRef(b.athlete && b.athlete.$ref),
            decimal: dec,
            /* Hra likindi ur einni linu. EKKI afvigud — afviging
               krefst allra utkoma i sama markadi og "einhver skorar"
               er ekki lokad mengi. Talan er thvi OFMAT og er merkt
               sem slik i vidmotinu. */
            prob: dec ? Math.round((1 / dec) * 1000) / 1000 : null,
          });
        }
        page++;
      }
    } catch { /* einn leikur ma bregdast an thess ad fella hitt */ }
  });
  record("espn_td_props", true,
    `${listed} anytime-TD entries, ${priced} with a posted price`);
  return out.filter((r) => r.decimal != null);
}

/* ============================================================
   AFLEIDDAR LIDSTOLUR — thetta er svarid vid "hvada varnir eru
   godar og slaemar".
   ============================================================ */

/**
 * Reiknar, fyrir hvert lid: vaent stig SKORUD og vaent stig A SIG,
 * ad medaltali per leik yfir thau timabil sem hafa linu.
 *
 * `allowed` ER VARNAR-MATID og thad er thad sem fantasy-notandinn
 * vill: ha tala = markadurinn byst vid ad andstaedingar skori mikid
 * a thetta lid = GOD vidureign fyrir sokn.
 *
 * VIKUR AN LINU ERU SLEPPT, ekki fylltar med medaltali. Lid sem a
 * adeins tvo verdlagda leiki faer tolu ur tveimur leikjum og
 * `games` segir thad — tala an urtaksstaerdar er halfa tala.
 */
export function teamMarketStrength(lines) {
  const by = new Map();
  for (const g of lines) {
    if (g.total == null || g.spread == null || !g.home || !g.away) continue;
    const home = g.total / 2 + g.spread / 2;
    const away = g.total / 2 - g.spread / 2;
    push(by, g.home, { week: g.week, scored: home, allowed: away, opp: g.away });
    push(by, g.away, { week: g.week, scored: away, allowed: home, opp: g.home });
  }
  const out = [];
  for (const [team, rows] of by) {
    const sc = rows.map((r) => r.scored), al = rows.map((r) => r.allowed);
    const po = rows.filter((r) => r.week >= 15 && r.week <= 17);
    out.push({
      team, games: rows.length,
      scored: r2(avg(sc)), allowed: r2(avg(al)),
      margin: r2(avg(sc) - avg(al)),
      /* Vikur 15-17 eru fantasy-urslitakeppnin. Lid med letta
         vidureign thar er meira virdi en medaltal timabilsins segir. */
      playoffAllowed: po.length ? r2(avg(po.map((r) => r.allowed))) : null,
      playoffGames: po.length,
      weeks: rows.sort((a, b) => a.week - b.week)
        .map((r) => ({ week: r.week, opp: r.opp,
                       scored: r2(r.scored), allowed: r2(r.allowed) })),
    });
  }
  /* ============================================================
     Rodun: 1 = mest gefid a sig (BESTA vidureign fyrir sokn).
     ============================================================
     JAFNTEFLIS-ROFID ER LIDSHEITID, EKKI KOMURODIN. Tolurnar eru
     NAMUNDADAR (`r2`), svo jafntefli eru raunveruleg og ekki sjaldgaef;
     stodug rodun i JS leysir thau eftir rod i fylkinu, sem var komurod
     ur `pool`. Maelt: sami inntakslisti i ondverdri rod faerdi
     `allowedRank`/`scoredRank` hja tveimur lidum af 32.

     Med lidsheitinu sem sidasta lykli er rodin fall af GOGNUNUM einum
     og keyrslan endurgeranleg. */
  const byTeam = (a, b) => String(a.team || "").localeCompare(String(b.team || ""));
  out.sort((a, b) => (b.allowed - a.allowed) || byTeam(a, b))
    .forEach((t, i) => { t.allowedRank = i + 1; });
  out.slice().sort((a, b) => (b.scored - a.scored) || byTeam(a, b))
    .forEach((t, i) => { t.scoredRank = i + 1; });
  return out.sort((a, b) => (b.scored - a.scored) || byTeam(a, b));
}

/* ---------- hjalparfoll ---------- */
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const r2 = (x) => Math.round(x * 100) / 100;
function push(m, k, v) { (m.get(k) || m.set(k, []).get(k)).push(v); }

function teamAbbrFromRef(ref) {
  if (!ref) return null;
  const m = String(ref).match(/\/teams\/(\d+)/);
  return m ? ESPN_TEAM_ID[m[1]] || null : null;
}
function athleteIdFromRef(ref) {
  if (!ref) return null;
  const m = String(ref).match(/\/athletes\/(\d+)/);
  return m ? m[1] : null;
}

/**
 * Fyrsta nothaefa tugagildid ur bokar-faerslu.
 *
 * FRAMTIDARMARKADIR SKILA AMERISKUM STUDLUM SEM STRENG ("+550",
 * "-200"), EKKI TUGATOLU. Fyrsta utgafan leitadi adeins ad
 * `Number.isFinite(value) && value > 1` og fann thvi EKKERT — 0
 * markadir af 23. Villan var thogul: fallid skiladi null, markadurinn
 * var sleppt og skrain leit ut fyrir ad vera i lagi ad odru leyti.
 */
function decimalFrom(b) {
  for (const k of ["current", "open"]) {
    const v = b[k];
    if (v && Number.isFinite(v.value) && v.value > 1) return v.value;
    if (v && v.odds && Number.isFinite(v.odds.value) && v.odds.value > 1) return v.odds.value;
  }
  if (Number.isFinite(b.value) && b.value > 1) return b.value;
  return americanToDecimal(b.value);
}

/**
 * Ameriskir studlar -> tugastudlar.
 *   +550 -> 6,50   (leggdu 100, faerd 550 i vinning)
 *   -200 -> 1,50   (leggdu 200 til ad vinna 100)
 * Skilar null fyrir allt annad — thar med "EVEN" og tomstrengi.
 */
export function americanToDecimal(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (/^even$/i.test(s)) return 2;
  const m = s.match(/^([+-])(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const n = Number(m[2]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return m[1] === "+" ? 1 + n / 100 : 1 + 100 / n;
}

/* ESPN-lidsnumer -> skammstofun. Handstadfest tafla, EKKI fuzzy —
   thogul rong porun a lidum er verri en engin (sami laerdomur og
   `BSD_TEAM` i FPL-verkefninu, thar sem fuzzy felldi Man United
   inn i Man City). */
export const ESPN_TEAM_ID = {
  1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN",
  8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR",
  15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI",
  22: "ARI", 23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WAS",
  29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
};
