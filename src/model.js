/* ============================================================
   MODEL.JS — hreina reiknilíkanið, dregið út úr App.jsx

   AF HVERJU SÉR SKRÁ: prófin (tests/) og bakprófunin þurfa að keyra
   NÁKVÆMLEGA sama kóða og appið birtir notandanum — ekki eftirlíkingu
   sem getur rekið frá raunverulegu formúlunni. Hér er ekkert React,
   engin state, aðeins hrein föll: sömu inntök gefa alltaf sömu útkomu.

   Allar mælingar-athugasemdir fylgja föllunum sem þær eiga við.
   ============================================================ */

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- FPL SÖLUVERÐ (50%-hagnaðarreglan) ----
   Þú fær kaupverðið + 50% af hagnaði, NIÐURJAFNAÐ á næstu 0,1.
   Tap: þú fær fullt núverandi verð (engin vörn).
   Dæmi: kaup 7,0 -> verð 7,5 gefur 7,2 (ekki 7,5).
   Verð eru heiltölur x10 í API-inu, svo við reiknum í tíundum.       */
export function sellTenths(purchase10, current10) {
  if (current10 == null) return 0;
  if (purchase10 == null || current10 <= purchase10) return current10;
  return purchase10 + Math.floor((current10 - purchase10) / 2);
}

/* ---- SÉR-LEIKJAÞYNGD PER STÖÐU (FFDR) ----
   TVEIR HÓPAR (GK+DEF = varnar-umbreyting, MID+FWD = sóknar) — mælt
   betra en fjórar stöður á 7 tímabilum (fylgni 0,238 á móti 0,236).
   Vogtölur úr grid-leit + krossprófun, 2.720 lið-leikir, ekkert leki
   (liðsstyrkur alltaf úr FYRRA tímabili).                              */
export const DIFF_W = {
  1: { fdr:0.45, own:0.55, opp:0, useDef:true, home:0, sot:0.45, prev:0.00, elo:0, mkt:0.5 },
  2: { fdr:0.45, own:0.55, opp:0, useDef:true, home:0, sot:0.45, prev:0.00, elo:0, mkt:0.5 },
  3: { fdr:0.45, own:0.55, opp:0, useDef:false, home:0.12, sot:0, prev:0.00, elo:0.15, mkt:0.35 },
  4: { fdr:0.45, own:0.55, opp:0, useDef:false, home:0.12, sot:0, prev:0.00, elo:0.15, mkt:0.35 },
};
export const ELO_SCALE = 150;   // Elo-stig sem svara ~1 þrepi í þyngd
export const LG_SOT = 4.4;      // deildarmeðaltal skota á mark per leik (mælt úr E0)
export const LG_XG = 1.45;      // deildarmeðaltal marka per lið-leik

/* MÆLD TAFLA PER STÖÐU — 3.808 lið-leikir, 7 tímabil, á SAMA FFDR-kvarða
   sem appið notar. pts = raunveruleg meðalstig per leikmann í einum leik. */
export const MEASURED_POS = {
  1: [{d:1.99,pts:4.03,cs:38.9}, {d:2.40,pts:3.79,cs:29.4}, {d:2.70,pts:3.51,cs:26.4}, {d:3.04,pts:3.33,cs:21.6}, {d:3.68,pts:2.80,cs:10.5}],
  2: [{d:1.81,pts:4.12,cs:38.6}, {d:2.21,pts:3.59,cs:30.9}, {d:2.50,pts:3.08,cs:26.2}, {d:2.86,pts:2.59,cs:19.9}, {d:3.58,pts:1.93,cs:10.9}],
  3: [{d:1.94,pts:4.23,cs:38.8}, {d:2.40,pts:3.69,cs:30.7}, {d:2.70,pts:3.26,cs:24.1}, {d:3.03,pts:3.17,cs:22.1}, {d:3.65,pts:2.79,cs:10.9}],
  4: [{d:1.82,pts:4.96,cs:36.5}, {d:2.41,pts:4.73,cs:29.5}, {d:2.74,pts:3.85,cs:24.2}, {d:3.10,pts:3.72,cs:21.7}, {d:3.77,pts:3.42,cs:12.4}],
};
export function lookupPos(pos, key, d) {
  const T = MEASURED_POS[pos] || MEASURED_POS[3];
  const x = clamp(d, T[0].d, T[T.length-1].d);
  for (let i = 0; i < T.length - 1; i++) {
    if (x >= T[i].d && x <= T[i+1].d) {
      const t = (x - T[i].d) / (T[i+1].d - T[i].d);
      return T[i][key] + (T[i+1][key] - T[i][key]) * t;
    }
  }
  return T[T.length-1][key];
}
/* Meðalstig stöðu — jafnvegið meðaltal pts-dálksins í MEASURED_POS.
   Notað sem nefnari í expPoints-margfaldaranum; prófað í tests/.       */
export const POS_MEAN_PTS = { 1: 3.492, 2: 3.062, 3: 3.428, 4: 4.136 };

/* MÆLT Á SAMSETTA KVARÐANUM — 2.720 lið-leikir, 5 tímabil. */
export const MEASURED = [
  { d: 2.00, cs: 40.2, ga: 1.00, def: 18.8, gk: 4.2, att: 31.2 },
  { d: 2.40, cs: 30.3, ga: 1.11, def: 17.3, gk: 4.2, att: 29.9 },
  { d: 2.80, cs: 28.5, ga: 1.28, def: 15.1, gk: 3.8, att: 28.0 },
  { d: 3.20, cs: 22.8, ga: 1.53, def: 13.9, gk: 3.5, att: 26.3 },
  { d: 4.00, cs: 13.0, ga: 1.99, def: 10.2, gk: 3.0, att: 22.8 },
];
export function lookupMeasured(key, d) {
  const x = clamp(d, MEASURED[0].d, MEASURED[MEASURED.length-1].d);
  for (let i = 0; i < MEASURED.length - 1; i++) {
    const a = MEASURED[i], b = MEASURED[i+1];
    if (x >= a.d && x <= b.d) {
      const t = (x - a.d) / (b.d - a.d);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return MEASURED[MEASURED.length-1][key];
}

/* SEX LITAÞREP — mörkin eru SEXTÍLAR raunverulegrar FFDR-dreifingar
   tímabilsins 2026/27 (1.520 lið-leikir × 2 hópar, reiknað með
   nákvæmlega inntökum appsins í tests/model.test.mjs).

   ENDURKVÖRÐUN 2026-07: gömlu mörkin (2,11/2,41/2,66/2,94/3,35) komu
   úr 7-tímabila safni og gáfu 3,8% dökkgrænt en 26% rautt á þessu
   tímabili — kvarðinn "hallaði á rautt" og nær allt leit þungt út.
   Nú fær hvert þrep ~1/6 leikja. Þetta breytir AÐEINS litunum;
   tölurnar sjálfar (CS%, vænt stig) koma áfram úr mældu töflunum
   á samfellda d-gildinu og haggast ekki.
   Prófið endurreiknar sextílana úr data/ og fellur ef þeir reka
   >0,12 frá þessum mörkum — þá er kominn tími á endurkvörðun.        */
export const TIER_CUTS = [2.45, 2.76, 2.92, 3.21, 3.45];
export function tierOf(d) {
  for (let i = 0; i < TIER_CUTS.length; i++) if (d < TIER_CUTS[i]) return i;
  return 5;                 // þyngst
}
export const TIER_BG   = ["#b8ecd0", "#d8f5e4", "#fdf6d8", "#f9e6a8", "#fde0e2", "#f7c4c9"];
export const TIER_FG   = ["#02402a", "#046b41", "#75620f", "#7a5600", "#a33540", "#87141e"];
export const TIER_NAME = ["dökkgrænt", "grænt", "ljósgult", "dökkgult", "ljósrautt", "rautt"];

/* ---- FFDR-VERKSMIÐJAN ----
   Skilar fixDifficulty(teamId, fx, pos) fyrir gefin gögn. App.jsx OG
   prófin kalla á þetta sama fall — engin tvítekning á formúlunni.

   Inntök:
     teamMetrics  { [teamId]: { xg90, xgc90, sotFor, sotAg, prevGoals, prevConc } }
     teamById     { [teamId]: { short, ... } }
     odds         { [short]: { diff, opp, kickoff, ... } } | null
     eloByTeam    { [teamId]: { elo } } | {}
   fx: { opp, home, fdr, kickoff? }                                     */
export function makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam }) {
  return function fixDifficulty(teamId, fx, pos) {
    if (!fx) return null;
    const me = teamMetrics[teamId], opp = teamMetrics[fx.opp];
    if (!me || !opp) return fx.fdr;
    const W = DIFF_W[pos] || DIFF_W[3];
    // 2-tímabila blöndun (prev-vog) ef fyrra tímabil er til
    const mix = (cur, prv) => (prv == null || !W.prev) ? cur : (1 - W.prev) * cur + W.prev * prv;
    const mg = W.useDef ? mix(me.xgc90, me.prevConc)  : mix(me.xg90, me.prevGoals);
    const og = W.useDef ? mix(opp.xg90, opp.prevGoals) : mix(opp.xgc90, opp.prevConc);
    // sóknar-umbreyting: LÍNULEG (mælt betri en gagnstæð)
    let own  = W.useDef ? (mg / LG_XG) : (2 - mg / LG_XG);
    let them = W.useDef ? (og / LG_XG) : (2 - og / LG_XG);
    if (W.sot && me.sotFor != null && opp.sotFor != null) {
      const ms = W.useDef ? me.sotAg  : me.sotFor;
      const os = W.useDef ? opp.sotFor : opp.sotAg;
      const ownS  = W.useDef ? (ms / LG_SOT) : (LG_SOT / Math.max(1.5, ms));
      const themS = W.useDef ? (os / LG_SOT) : (LG_SOT / Math.max(1.5, os));
      own  = (1 - W.sot) * own  + W.sot * ownS;
      them = (1 - W.sot) * them + W.sot * themS;
    }
    /* MARKAÐS-ÞYNGD TEKUR FORGANG þegar hún gildir um RÉTTA leikinn —
       staðfest gegn mótherja + dagsetningu. Mælt 1,3x betri spá en FDR. */
    const short_ = teamById[teamId]?.short;
    const bk = odds && short_ && odds[short_];
    const bkValid = bk && bk.diff != null &&
      teamById[fx.opp]?.short === bk.opp &&
      (!fx.kickoff || !bk.kickoff || fx.kickoff.slice(0,10) === bk.kickoff.slice(0,10));

    let core = fx.fdr * W.fdr + (own * 3) * W.own + (them * 3) * W.opp;
    if (bkValid && W.mkt) {
      core = W.mkt * bk.diff + (1 - W.mkt) * core;
    }
    if (W.elo) {
      const me_e = eloByTeam[teamId]?.elo, op_e = eloByTeam[fx.opp]?.elo;
      if (me_e && op_e) {
        const eScore = clamp((op_e - me_e) / ELO_SCALE + 3, 1, 5);
        core = (1 - W.elo) * core + W.elo * eScore;
      }
    }
    const homeAdj = (W.home || 0) * (fx.home ? 1 : -1);
    return +clamp(core - homeAdj, 1, 5).toFixed(2);
  };
}

/* ---- SKIPTA-KOSTNAÐUR per umferð ----
   FPL-reglur 2026/27: 1 frítt skipti á umferð, safnast upp í 5.
   Hvert aukalegt = −4 stig. Wildcard og Free Hit: ótakmörkuð skipti og
   SÖFNUÐU skiptin HALDAST og halda áfram að safnast (+1 næstu umferð,
   þak 5) — regla frá 2024/25 sem eldri útgáfa braut með ft=1.
   GW1 fyrir frest: ótakmörkuð, og allir byrja með 1 FT í GW2.          */
export function computeTransferCost({ plan, chipAt, maxGw, preSeason }) {
  const made = {};
  plan.forEach(t => { made[t.gw] = (made[t.gw] || 0) + 1; });
  const out = {};
  let ft = 1;
  for (let g = 1; g <= maxGw; g++) {
    const n = made[g] || 0;
    const chip = chipAt(g);
    const isGw1Free = (g === 1 && preSeason);
    const unlimited = isGw1Free || chip === "wildcard" || chip === "freehit";
    if (unlimited) {
      out[g] = { made: n, free: n, hits: 0, points: 0, unlimited: true, chip, ftAvailable: ft };
      // GW1: allir byrja tímabilið með 1 FT. WC/FH: söfnuð skipti
      // HALDAST og +1 bætist við eins og venjulega (þak 5).
      ft = isGw1Free ? 1 : Math.min(5, ft + 1);
    } else {
      const used = Math.min(n, ft);
      const extra = n - used;
      out[g] = { made: n, free: used, hits: extra, points: extra * -4, unlimited: false, ftAvailable: ft };
      ft = Math.min(5, ft - used + 1);
    }
  }
  return out;
}

/* ---- VÆNT STIG per leik ----
   EIN aðferð allar umferðir: grunnur (ep_next ef til, annars stig/leik)
   × margfaldari (mæld stig við FFDR leiksins / meðaltal stöðunnar)
   × tiltækileiki. Tvöföld umferð leggst saman; auð umferð = 0.         */
export function expPointsFor({ p, fxs, fixDifficulty, teamId }) {
  if (!p || !fxs?.length) return 0;
  const avail = p.status === "a" ? 1 : (p.chance_of_playing_next_round ?? 0) / 100;
  const pos = p.element_type;
  const ep = parseFloat(p.ep_next);
  const ppg = parseFloat(p.points_per_game || 0);
  const base = Number.isFinite(ep) && ep > 0 ? ep : ppg;
  if (!base) return 0;
  const mean = POS_MEAN_PTS[pos] || 3.4;
  let mult = 0;
  for (const f of fxs) {
    const d = fixDifficulty(teamId, f, pos);
    const pts = d != null ? lookupPos(pos, "pts", d) : null;
    mult += Number.isFinite(pts) ? pts / mean : 1;
  }
  return base * mult * avail;
}

/* ---- VERÐSPÁ (nálgun) ----
   FPL birtir ekki verðbreytingaformúluna; þekkta mynstrið er að nettó-
   flutningar þurfi að ná þröskuldi sem SKALAST með eignarhaldi (fjölda-
   maður þarf fleiri flutninga til að hreyfast). Við notum kvaðratrótar-
   skölun á selected_by_percent með 60k grunn — gróf en gagnleg nálgun,
   MERKT sem spurning ("í nótt?") en aldrei sem vissa.
   Skilar "up" / "down" / null. chg != 0 = búinn að hreyfast í dag
   (FPL hreyfir verð að hámarki einu sinni á dag) -> engin spá.          */
export function priceMovePrediction({ net, selectedByPct, chg }) {
  if (chg) return null;
  const pct = Math.max(0.3, parseFloat(selectedByPct) || 0.3);
  const threshold = 60000 * Math.sqrt(pct / 5);
  if (net > threshold) return "up";
  if (net < -threshold) return "down";
  return null;
}
