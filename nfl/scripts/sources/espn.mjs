/* ============================================================
   espn.mjs — ESPN gefur okkur thrennt sem hinar heimildirnar gefa ekki.

   1. ADP OG UPPBODSVERD ur staersta fantasy-vettvangi heims.
      Sleeper-ADP er rettara fyrir Sleeper-draft, en ESPN-ADP er
      staerra urtak og THAER TVAER ERU EKKI EINS. Munurinn sjalfur er
      merki: leikmadur sem er 40. a ESPN en 25. a Sleeper er
      metinn olikt eftir vettvangi, og tha er verdid i thinu drafti
      allt annad en "markadsverdid".
   2. EIGNARHALDS-HLUTFALL (`percentOwned`, `percentStarted`) —
      raunverulegt atferli milljona lida, ekki skodun.
   3. HEILDARSPA (`appliedTotal` a timabils-radinni) sem fjordi
      ohadi spamadur vid hlidina a Sleeper, FantasyPros og okkur.

   AD SVARINU "38 MB": endapunkturinn hunsar `X-Fantasy-Filter`-hausinn
   thegar engin deild fylgir kallinu (stadfest 9.8.2026 — `limit: 8`
   skiladi 11.531 leikmanni). Vid saekjum thvi allt og siium hedan.
   Thad er einn kollur a dag; skyndiminnid ber hann i throun.

   VARNAGLI: `appliedTotal` er 0 a VIKULEGU rodunum thvi engin
   stigagjof fylgir kallinu — adeins timabils-summan (`statSplitTypeId
   === 0`) ber raunverulega tolu. Ad lesa vikulegu tolurnar vaeri ad
   birta 0 sem spa. Thess vegna er adeins timabils-radan lesin.
   ============================================================ */

import { getJSON, getJSONFirst, record } from "../lib/http.mjs";

const HOST = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";
/* TVEIR HOSTAR, SAMA LEID. `site.api.espn.com` skilar 403 ur GitHub
   Actions medan `lm-api-reads` og `sports.core.api` skila 200 ur SOMU
   keyrslu; `site.web.api.espn.com` ber somu slodir og — maelt svid fyrir
   svid 21.8.2026 — NAKVAEMLEGA sama svar. Sja langa notu vid
   `getJSONFirst` i lib/http.mjs. */
const SITES = [
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl",
  "https://site.web.api.espn.com/apis/site/v2/sports/football/nfl",
];
const site = (tag, p, opt) => getJSONFirst(tag, SITES.map((h) => h + p), opt);

/* ESPN notar eigin numer fyrir stodur og lid. */
const POS = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
const TEAM = {
  0: null, 1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN",
  8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR",
  15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI",
  22: "ARI", 23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WAS",
  29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
};

/**
 * Leikmenn + ADP + uppbodsverd + heildarspa fyrir gefid timabil.
 * Sian `percentOwned > 0.1 || adp != null` heldur skranni vid ~700
 * leikmenn i stad 11.500 — restin eru oskrifadir varamenn sem enginn
 * draftar og their myndu adeins thynna ut allt sem birtist.
 */
/**
 * EFRI MORK A TIMABILS-SPA per stodu. Thetta er EKKI kvordun heldur
 * SPILLINGARHLID: metsamtal a timabili er ~430 stig (RB, PPR) og
 * ~480 fyrir QB. Gildi yfir threfoldu meti er ekki spa heldur brengluð
 * rod.
 *
 * MAELT 9.8.2026: af 1.130 leikmonnum bar ESPN adeins **56**
 * timabils-spa yfirleitt, og **5 af theim voru spilltar** — Drake
 * London kom ut a 13.797 thar sem hra-svarid segir 274,3 (50x), og
 * tveir spyrnumenn a ~2.400. Uppruninn er ovis; ESPN skilar fleiri
 * en einni rod med somu merkingum og thaer eru ekki allar sambaerilegar.
 *
 * NIDURSTADAN SEM GILDIR: ESPN er ADP- OG EIGNARHALDSHEIMILD, ekki
 * spaheimild. Talan er tekin THEGAR hun stenst hlidid og annars
 * SLEPPT — ekki lagfaerd, ekki skolud. Sja CLAUDE.md kafla 8:
 * omaeld tala faer ekki reit.
 */
const PROJ_MAX = { QB: 600, RB: 500, WR: 500, TE: 400, K: 250, DST: 250 };
let projRejected = 0;

export async function playerPool(season) {
  const raw = await getJSON(
    `${HOST}/seasons/${season}/players?scoringPeriodId=0&view=kona_player_info`,
    { headers: { "X-Fantasy-Filter": '{"players":{"filterActive":{"value":true}}}' },
      timeout: 120_000 });

  const out = [];
  for (const p of raw) {
    const pos = POS[p.defaultPositionId];
    if (!pos) continue;
    const own = p.ownership || {};
    const adp = num(own.averageDraftPosition);
    const owned = num(own.percentOwned);
    if ((owned == null || owned < 0.1) && adp == null) continue;

    const seasonRow = (p.stats || []).find(
      (s) => s.statSplitTypeId === 0 && s.statSourceId === 1 &&
             s.seasonId === season && s.appliedTotal != null);
    const lastRow = (p.stats || []).find(
      (s) => s.statSplitTypeId === 0 && s.statSourceId === 0 &&
             s.seasonId === season - 1);

    const ranks = p.draftRanksByRankType || {};
    out.push({
      espnId: String(p.id),
      name: p.fullName,
      pos,
      team: TEAM[p.proTeamId] ?? null,
      adp,
      auction: num(own.auctionValueAverage),
      owned,
      started: num(own.percentStarted),
      adpChange: num(own.averageDraftPositionPercentChange),
      rankPpr: ranks.PPR ? num(ranks.PPR.rank) : null,
      rankStd: ranks.STANDARD ? num(ranks.STANDARD.rank) : null,
      // Heildarspa ESPN i THEIRRA sjalfgefnu stigagjof (PPR-afbrigdi).
      // Hun er EKKI omreiknud i adrar stigagjafir — ad gera thad an
      // hra-fylkjanna vaeri agiskun sem liti ut eins og maeling.
      projPts: sane(seasonRow ? seasonRow.appliedTotal : null, pos),
      lastSeasonPts: lastRow && lastRow.appliedTotal != null
        ? round2(lastRow.appliedTotal) : null,
      injured: !!p.injured,
      injuryStatus: p.injuryStatus || null,
    });
  }
  const withProj = out.filter((p) => p.projPts != null).length;
  record("espn_players", true,
    `${out.length} players with ADP or roster share (of ${raw.length}); ` +
    `season projection on ${withProj}, ${projRejected} rejected by the sanity gate`);
  return out;
}

/** Skilar tolunni ef hun stenst hlidid, annars null (og telur). */
function sane(v, pos) {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  const max = PROJ_MAX[pos] ?? 600;
  if (v > max) { projRejected++; return null; }
  return round2(v);
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round2 = (x) => Math.round(x * 100) / 100;

/** Meidslalisti allra lida — ferskari en vikulega skyrslan i forleik. */
export async function injuries() {
  const d = await site("espn_injuries", "/injuries", { timeout: 120_000 });
  const out = [];
  for (const t of d.injuries || []) {
    for (const i of t.injuries || []) {
      const a = i.athlete || {};
      out.push({
        espnId: a.id ? String(a.id) : null,
        name: a.displayName || null,
        pos: (a.position && a.position.abbreviation) || null,
        team: t.abbreviation || t.displayName || null,
        status: i.status || null,
        type: (i.type && i.type.description) || (i.details && i.details.type) || null,
        detail: (i.details && i.details.detail) || null,
        date: i.date || null,
        comment: i.longComment || i.shortComment || null,
      });
    }
  }
  record("espn_injuries", true, `${out.length} injuries, ${(d.injuries || []).length} teams`);
  return out;
}

/**
 * FRETTIR. ESPN birtir 50 nyjustu greinar an lykils.
 *
 * HVERS VEGNA THETTA SKIPTIR MALI FYRIR TOLURNAR: meidsli birtast i
 * FRETT nokkrum dogum adur en thau rata i opinbera meidslaskyrslu, og
 * hlutverkabreytingar (nyr byrjunarmadur) birtast ALDREI i skyrslu.
 * Spar uppfaerast haegar en frettir.
 *
 * TOLID LES THAER EKKI OG TULKAR THAER EKKI. Thad birtir thaer vid
 * hlidina a theim leikmonnum sem thaer nefna, og notandinn les. Ad
 * lata malgreiningu breyta spa vaeri omaeld tala i reit — og su
 * greining er ekki gerd hér.
 */
export async function news(limit = 50) {
  const d = await site("espn_news", `/news?limit=${limit}`);
  const out = (d.articles || []).map((a) => ({
    id: a.id ? String(a.id) : null,
    headline: a.headline || null,
    description: a.description || null,
    published: a.published || null,
    type: a.type || null,
    url: (a.links && a.links.web && a.links.web.href) || null,
    /* ESPN merkir greinar med theim leikmonnum og lidum sem thaer
       fjalla um. Thad er notad til ad para frett vid leikmann an
       nafnaleitar i texta, sem vaeri hávaðasöm. */
    athletes: (a.categories || []).filter((c) => c.type === "athlete")
      .map((c) => ({ espnId: c.athleteId != null ? String(c.athleteId) : null,
                     name: (c.athlete && c.athlete.description) || null })),
    teams: (a.categories || []).filter((c) => c.type === "team")
      .map((c) => (c.team && c.team.abbreviation) || null).filter(Boolean),
  })).filter((a) => a.headline);
  const tagged = out.filter((a) => a.athletes.length).length;
  record("espn_news", out.length > 10,
    `${out.length} articles, ${tagged} tagged to a player`);
  return out;
}

/** Lidaskra med litum og merkjum — notad i vidmotinu. */
export async function teams() {
  const d = await site("espn_teams", "/teams");
  const list = d.sports[0].leagues[0].teams.map(({ team: t }) => ({
    espnId: t.id, abbr: t.abbreviation, name: t.displayName,
    short: t.shortDisplayName, nick: t.name, location: t.location,
    color: t.color ? `#${t.color}` : null,
    alt: t.alternateColor ? `#${t.alternateColor}` : null,
    logo: (t.logos && t.logos[0] && t.logos[0].href) || null,
  }));
  record("espn_teams", true, `${list.length} teams`);
  return list;
}
