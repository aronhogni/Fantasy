/* ============================================================
   FFDR-SAMANBURÐUR — RÓTERINGS-PAR
   Hreint (ekkert React) svo prófin keyri NÁKVÆMLEGA sama kóða og appið.

   SPURNINGIN SEM ÞETTA SVARAR:
     "VVD á City á útivelli og Arsenal tveimur umferðum seinna. Hver
      kemur inn fyrir hann í þeim umferðum?"

   Þetta er ANNAÐ starf en FFDR-taflan. Taflan spyr "hver er bestur næstu
   6 umferðir?" — hér spyrjum við "hver er bestur í ÞESSUM TILTEKNU
   umferðum, þeim sem minn maður á erfiðar". Maður með jafngóða 6 umferðir
   en erfiða leiki í sömu umferðum er GAGNSLAUS sem par; maður sem er
   síðri í heild en á léttar umferðir NÁKVÆMLEGA þar sem minn er þungur
   er sá rétti. Það er RÓTERING, ekki röðun.

   TVEIR MÆLIKVARÐAR, OG ÞEIR SEGJA SITT HVAÐ:
     ÞEKJA (cover)  — hlutfall þyngdarinnar í erfiðu umferðunum sem
                      frambjóðandinn mætir með hlutlausum leik eða betri.
                      Þetta er FFDR-svarið og það sem notandinn bað um.
     VINNINGUR      — vænt stig frambjóðandans MÍNUS vænt stig þess
                      (verri) manns sem hann kemur inn fyrir, lagt saman
                      yfir erfiðu umferðirnar. Þetta er ÁKVÖRÐUNIN.

   RAÐAÐ ER EFTIR VINNINGI, ekki þekju — og það er vísvitandi. Hrein
   FFDR-þekja setur á toppinn menn í slökum liðum sem eiga létta leiki en
   skora ekki. Vinningurinn notar MÆLDA FFDR-margfaldarann úr model.js
   (`expPointsFor`), svo FFDR ræður áfram, en gegnum stig í stað litar.
   ÞEKJAN ER SAMT SKILYRÐI: sá sem þekur ekkert kemst ekki á listann.

   AUÐ UMFERÐ ER ÞYNGSTA UMFERÐIN. Notandinn nefndi hana ekki en blank =
   0 stig, sem er verra en hvaða rauði leikur sem er. Hún fær hæsta
   þyngd og frambjóðandi sem er sjálfur auður þekur ekkert.
   ============================================================ */
import { expPointsFor, tierOf } from "./model.js";

/* Erfitt = dökkgult (3), ljósrautt (4), rautt (5) — það sem notandinn
   kallaði "rauðir, dökkrauðir, jafnvel dökk gulir". Þyngd stigvaxandi:
   rauður leikur kallar á hjálp þrefalt frekar en dökkgulur.             */
export const HARD_TIER_MIN = 3;
/* LAGMARKS-BYRJUNARLIKUR FRAMBJODANDA. Varamarkmadur sem spilar aldrei
   var fullgildur frambjodandi: heilbrigdur (tiltaekileiki 1,0), odyr
   (undir verdthakinu) og med graena leiki (FFDR er eiginleiki LIDSINS).
   Notandinn sa slika menn a listanum og bad um lagfaeringu 4.8.2026.
   Golfid notar MAELDA 6h-likanid (startProbability, Brier -24%):
   maelt a raungognum 4.8. eru hreinir varamarkmenn P=0,038-0,039 en
   hvildur adalmarkmadur (Raya, GW38) P=0,47 — 0,15 sker their fyrri fra
   med breidu bili a bada boga. P=null (engin gogn, t.d. nyr leikmadur)
   UTILOKAR EKKI: "engin gogn" og "spilar ekki" eru ekki sama hlutid.   */
export const MIN_START_PROB = 0.15;
/* Thyngd per threp. HLUTLAUST (2) faer 0,5 og telur AÐEINS thegar
   throskuldurinn er faerdur nidur i 2 — tha er spurningin "grænn leikur
   a moti hvitum": hvitur utileikur er ekki VONDUR en hann er UPPFAERANLEGUR
   ef annar madur a graenan heimaleik i somu umferd.                     */
export const TIER_NEED = [0, 0, 0.5, 1, 2, 3];
export const BLANK_NEED = 3;          // auð umferð = jafn slæm og rauð
export const DEFAULT_HORIZON = 6;

/* Umferðirnar sem skoðaðar eru: gwFrom .. gwFrom+horizon-1, klippt við
   síðustu umferð sem til er í gögnunum.                                 */
export function horizonGws(gwFrom, horizon = DEFAULT_HORIZON, maxGw = 38) {
  const out = [];
  for (let g = gwFrom; g < gwFrom + horizon && g <= maxGw; g++) out.push(g);
  return out;
}

/* Leikir liðs í umferð -> { fxs, ffdr, tier, blank, dbl }.
   Tvöföld umferð: FFDR = LÉTTASTI leikurinn (þrepið sem birtist) en
   stigin leggjast saman í expPointsFor — tvennt sem má ekki blanda.    */
export function gwCell({ teamId, pos, gw, fixByTeamGw, fixDifficulty }) {
  const fxs = fixByTeamGw?.[teamId]?.[gw] || [];
  if (!fxs.length) return { fxs: [], ffdr: null, tier: null, blank: true, dbl: false };
  let best = null;
  for (const f of fxs) {
    const d = fixDifficulty(teamId, f, pos);
    if (d != null && (best == null || d < best)) best = d;
  }
  return {
    fxs, ffdr: best, tier: best == null ? null : tierOf(best),
    blank: false, dbl: fxs.length > 1,
  };
}

/* Þyngd umferðar fyrir EINN mann: 0 ef leikurinn er hlutlaus eða léttari. */
export function needOf(cell, hardFrom = HARD_TIER_MIN) {
  if (!cell) return 0;
  if (cell.blank) return BLANK_NEED;
  if (cell.tier == null) return 0;
  if (cell.tier < hardFrom) return 0;
  return TIER_NEED[cell.tier] ?? 0;
}
/* Frambjodandi ThEKUR umferd ef hann er UNDIR throskuldinum sjalfum.
   Thetta er almenna formid: vid throskuld 3 tydir thad hlutlaust eda betra
   (eins og adur), vid throskuld 2 tydir thad graent eda dokkgraent — th.e.
   "graenn a moti hvitum" fæst sjalfkrafa, an serreglu.                  */
export function coversNeed(cell, hardFrom = HARD_TIER_MIN) {
  return !!cell && !cell.blank && cell.tier != null && cell.tier < hardFrom;
}

/* ---- KJARNINN ----
   targets     [{ p, teamId }]  1-2 menn sem ég á og vil fá hjálp með
   candidates  [{ p, teamId }]  laugin (App.jsx sér um stöðu-regluna)
   Skilar { gws, hard, totalNeed, targets, results }.                    */
export function findRotationPartners({
  targets, candidates, gwFrom, horizon = DEFAULT_HORIZON, maxGw = 38,
  fixByTeamGw, fixDifficulty, ownedIds, limit = 10, maxTenths = null,
  hardFrom = HARD_TIER_MIN, byTeamOnly = true, startProbOf = null,
}) {
  const gws = horizonGws(gwFrom, horizon, maxGw);
  const T = (targets || []).filter(t => t?.p);
  const owned = ownedIds instanceof Set ? ownedIds : new Set(ownedIds || []);
  if (!T.length || !gws.length)
    return { gws, hard: [], totalNeed: 0, targets: [], results: [] };
  /* Byrjunar-likur: null = engin gogn = voginni sleppt (x1). */
  const pOf = p => (startProbOf ? startProbOf(p) : null);

  /* 1. Rúta hvers markmanns yfir sjóndeildarhringinn */
  const tRows = T.map(t => ({
    ...t,
    cells: gws.map(gw => gwCell({
      teamId: t.teamId, pos: t.p.element_type, gw, fixByTeamGw, fixDifficulty })),
  }));

  /* 2. Þörf per umferð. Tveir menn valdir -> ÞYNGDIN LEGGST SAMAN, svo
        umferð þar sem BÁÐIR eru þungir fer efst í forgang.
        ep er VEGID med byrjunar-likum (symmetriskt vid frambjodendur):
        vaentistig = P(spilar) x stig|spilar.                            */
  const need = gws.map((gw, i) => {
    const per = tRows.map(t => ({
      id: t.p.id, name: t.p.web_name, cell: t.cells[i], need: needOf(t.cells[i], hardFrom),
      ep: epOf(t.p, t.teamId, t.cells[i], fixDifficulty) * (pOf(t.p) ?? 1),
    }));
    return { gw, need: per.reduce((a, x) => a + x.need, 0), per };
  });
  const hard = need.filter(n => n.need > 0);
  const totalNeed = hard.reduce((a, n) => a + n.need, 0);
  if (!hard.length)
    return { gws, hard: [], totalNeed: 0, targets: tRows, results: [] };

  /* 3. Hver frambjóðandi metinn AÐEINS á erfiðu umferðunum */
  const tIds = new Set(T.map(t => t.p.id));
  const out = [];
  for (const c of (candidates || [])) {
    if (!c?.p || tIds.has(c.p.id)) continue;
    /* VERÐÞAK. Án þess raðast Haaland á toppinn hjá HVERJUM varnarmanni:
       hann er réttasta svarið við "hver skorar mest?" en RANGA svarið við
       "hver kemur inn af bekknum fyrir VVD?". Þakið er sett af UI-inu
       (sjálfgildi þar: verð mannsins + 2,0) og er EKKI hluti líkansins —
       það afmarkar aðeins hvað er raunverulega í boði.                  */
    if (maxTenths != null && (c.p.now_cost ?? 0) > maxTenths) continue;
    /* BYRJUNAR-GOLFID: madur sem MAELIST ekki spila (P < 0,15) er ekki
       par, sama hversu graenir leikir lidsins hans eru — FFDR er
       eiginleiki lidsins en stigin krefjast thess ad HANN se a vellinum.
       null sleppur i gegn: engin gogn eru ekki donn a bekknum.          */
    const cP = pOf(c.p);
    if (cP != null && cP < MIN_START_PROB) continue;
    let gain = 0, covered = 0;
    const per = [];
    for (const n of hard) {
      const cell = gwCell({ teamId: c.teamId, pos: c.p.element_type, gw: n.gw,
                            fixByTeamGw, fixDifficulty });
      const cEp = epOf(c.p, c.teamId, cell, fixDifficulty) * (cP ?? 1);
      /* skipt er út þeim VERSTA af völdu mönnunum sem er þungur í þessari
         umferð — það er stærsta framförin sem raunverulega er í boði.   */
      const hardHere = n.per.filter(x => x.need > 0);
      const worst = hardHere.reduce((a, x) => (a == null || x.ep < a.ep ? x : a), null);
      const g = Math.max(0, cEp - (worst ? worst.ep : 0));
      gain += g;
      const covers = coversNeed(cell, hardFrom);
      if (covers) covered += n.need;
      per.push({ gw: n.gw, cell, ep: +cEp.toFixed(2), gain: +g.toFixed(2), covers,
                 vs: worst ? worst.name : null });
    }
    if (!covered) continue;                       // þekur ekkert -> ekki par
    out.push({
      p: c.p, teamId: c.teamId, owned: owned.has(c.p.id),
      cover: Math.round(100 * covered / totalNeed),
      gain: +gain.toFixed(2), per, startP: cP,
    });
  }

  /* Raðað eftir VINNINGI; þekja er jafnteflis-brjótur, svo verð (ódýrari
     fyrst) þegar hvorugt skilur.                                        */
  out.sort((a, b) => b.gain - a.gain || b.cover - a.cover
                  || (a.p.now_cost || 0) - (b.p.now_cost || 0));

  /* EITT LID = EIN ROD. FFDR er EIGINLEIKI LIDSINS, svo allir varnarmenn
     Arsenal fengu NAKVAEMLEGA somu sex leiki og listinn var 4-5 eins radir.
     Vid hordum besta manninn ur hverju lidi og teljum hina — thad er sama
     upplysing i einni rod i stad fimm.                                   */
  const shown = [];
  if (byTeamOnly) {
    const seen = new Map();
    for (const r of out) {
      const cur = seen.get(r.teamId);
      if (cur) { cur.others.push(r.p); continue; }
      const row = { ...r, others: [] };
      seen.set(r.teamId, row); shown.push(row);
    }
  } else {
    shown.push(...out.map(r => ({ ...r, others: [] })));
  }
  return { gws, hard, totalNeed, targets: tRows, hardFrom,
           results: shown.slice(0, limit) };
}

/* Vænt stig fyrir EINA umferð úr þegar-reiknaðri rútu (auð umferð = 0). */
function epOf(p, teamId, cell, fixDifficulty) {
  if (!cell || cell.blank || !cell.fxs.length) return 0;
  return expPointsFor({ p, fxs: cell.fxs, fixDifficulty, teamId });
}

/* ---- STÖÐU-REGLAN ----
   Markmaður kemur ALDREI inn fyrir varnarmann. Sé einhver valinn maður
   markmaður er laugin markmenn EINGÖNGU; annars allir NEMA markmenn.   */
export function candidatePool(players, targets, { byTeam } = {}) {
  const T = (targets || []).filter(t => t?.p);
  const anyGk = T.some(t => t.p.element_type === 1);
  return (players || [])
    .filter(p => anyGk ? p.element_type === 1 : p.element_type !== 1)
    .map(p => ({ p, teamId: byTeam ? byTeam(p) : p.team }));
}
