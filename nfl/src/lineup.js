/* ============================================================
   lineup.js — HVERJA A AD SPILA OG HVERJA A AD SKILJA EFTIR.
   Hrein rokfraedi, ekkert React, engin netkoll.

   KRAFAN ER SKYR: **enginn a bekknum ma skora meira en einhver sem
   spilar.** Thad er ekki alltaf haegt ad tryggja fyrirfram — vid
   vitum ekki utkomuna — en thad er haegt ad tryggja tvennt:

     1. FYRIRFRAM: byrjunarlidid se BESTA moguleg samsetning midad vid
        thaer spar sem vid hofum. Ef betri samsetning er til er thad
        villa i tolinu, ekki oheppni.
     2. EFTIR A: telja nakvaemlega hve morg stig satu a bekknum, svo
        haegt se ad sja hvort tapid var akvordun eda tilviljun.

   SIDARA ER MIKILVAEGARA EN THAD VIRDIST. Ad tapa 30 stigum a bekknum
   thegar spain sagdi rangt er OHEPPNI. Ad tapa theim thegar spain
   sagdi rett er VILLA. Toolid a ad geta greint thar a milli, annars
   laerir notandinn ekkert af thvi.

   ============================================================
   HVERS VEGNA GRADUG ADFERD ER SONNANLEGA RETT HER

   Byrjunarlids-saetin eru HREIDRUD: fost saeti taka adeins eina
   stodu, og FLEX tekur YFIRMENGI theirra stada. Vid thaer adstaedur
   er graduga lausnin — bestu k a hverri fostu stodu, sidan besti
   afgangur i flex — SONNANLEGA optimol:

     Latum S vera optimala lausn og G graduga. Ef their eru olikar er
     til fast saeti (stada p) thar sem G tekur mann a og S tekur b med
     spa(b) < spa(a). Tha ma skipta b ut fyrir a i S an thess ad
     brjota nokkud (badir eru af stodu p) og utkoman batnar eda helst
     — mótsogn vid ad S se optimal.

   Thess vegna tharf hvorki hermun ne heildarleit; svarid er reiknad
   beint. Prof: `tests/nfl-lineup.mjs` kafli 3 ber graduga svarid vid
   TAEMANDI leit a smaum tilvikum og krefst jafnaðar.
   ============================================================ */

/**
 * Sjalfgefid snid. `FLEX` tekur RB/WR/TE; `SUPERFLEX` tekur lika QB.
 * Rodin skiptir mali: fost saeti eru fyllt fyrst, sidan flex, sidan
 * superflex — thvi thvi vidari sem saetid er, thvi seinna a thad ad
 * velja.
 */
export const DEFAULT_SLOTS = [
  { id: "QB", pos: ["QB"] },
  { id: "RB1", pos: ["RB"] },
  { id: "RB2", pos: ["RB"] },
  { id: "WR1", pos: ["WR"] },
  { id: "WR2", pos: ["WR"] },
  { id: "WR3", pos: ["WR"] },
  { id: "TE", pos: ["TE"] },
  { id: "FLEX", pos: ["RB", "WR", "TE"] },
  { id: "K", pos: ["K"] },
  { id: "DST", pos: ["DST"] },
];

/** Byggir saeta-lista ur deildarstillingum. */
export function slotsFor(league = {}) {
  const st = league.starters || { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 };
  const out = [];
  for (const [pos, n] of Object.entries(st)) {
    if (pos === "FLEX" || pos === "SUPERFLEX") continue;
    for (let i = 1; i <= n; i++) out.push({ id: n > 1 ? `${pos}${i}` : pos, pos: [pos] });
  }
  for (let i = 1; i <= (st.FLEX || 0); i++) {
    out.push({ id: (st.FLEX > 1 ? `FLEX${i}` : "FLEX"), pos: league.flexPos || ["RB", "WR", "TE"] });
  }
  for (let i = 1; i <= (st.SUPERFLEX || (league.superflex ? 1 : 0)); i++) {
    out.push({ id: "SUPERFLEX", pos: ["QB", "RB", "WR", "TE"] });
  }
  return out;
}

/**
 * Besta byrjunarlid.
 *
 * `players`  [{ id, name, pos, proj, avail, injury, bye }]
 * `slots`    ur `slotsFor()`
 *
 * `proj` MA VERA NULL. Leikmadur an spar er EKKI settur i 0 — hann er
 * settur AFTAST og merktur, thvi "vitum ekki" og "spair 0 stigum" eru
 * ekki sama fullyrdingin. Vaeri hann settur i 0 myndi tolid stilla upp
 * theim sem spair 0,1 stigi framyfir hann, sem er verri agiskun en
 * engin.
 */
export function optimalLineup(players, slots = DEFAULT_SLOTS) {
  /* Aud vika og "Out" gefa NULL, ekki lagt gildi: their eru ekki
     valkostur, ekki lelegur valkostur. */
  const usable = players.map((p) => ({
    ...p,
    playable: p.bye ? false : (p.proj != null && (p.avail == null || p.avail > 0)),
    /* Vaent stig ad teknu tilliti til tiltaekileika. Leikmadur sem er
       50% liklegur til ad spila og spair 20 stigum er ekki jafn godur
       og sa sem spair 12 og spilar orugglega. */
    ev: p.bye ? 0 : (p.proj == null ? null : p.proj * (p.avail == null ? 1 : p.avail)),
  }));

  const taken = new Set();
  const filled = [];

  /* Saetin eru rodud eftir THRENGD — throngt saeti velur fyrst, thvi
     thad hefur faerri valkosti. Fost saeti (1 stada) a undan flex (3)
     a undan superflex (4). */
  const order = slots.slice().sort((a, b) => a.pos.length - b.pos.length);

  for (const slot of order) {
    let best = null;
    for (const p of usable) {
      if (taken.has(p.id) || !p.playable || p.ev == null) continue;
      if (!slot.pos.includes(p.pos)) continue;
      if (!best || p.ev > best.ev) best = p;
    }
    if (best) taken.add(best.id);
    filled.push({ slot: slot.id, eligible: slot.pos, player: best || null });
  }

  /* Skilad i UPPHAFLEGRI saetarod, ekki throngd-rod — notandinn vill
     sja QB efst, ekki thad saeti sem var reiknad fyrst. */
  const bySlot = new Map(filled.map((f) => [f.slot, f]));
  const starters = slots.map((s) => bySlot.get(s.id)).filter(Boolean);
  const bench = usable.filter((p) => !taken.has(p.id));

  return {
    starters,
    bench: bench.sort((a, b) => (b.ev ?? -1) - (a.ev ?? -1)),
    projected: round1(starters.reduce((a, s) => a + (s.player ? s.player.ev : 0), 0)),
    /* Saeti sem ekki tokst ad fylla — vantar leikmann a theirri stodu,
       eda allir a bekk med aud viku/meiddir. Thad er UPPLYSING, ekki
       villa, og ma ekki hverfa thogult. */
    unfilled: starters.filter((s) => !s.player).map((s) => s.slot),
    /* Leikmenn an spar. Their eru a bekk EN thad er ekki dómur um tha. */
    unknown: usable.filter((p) => p.ev == null && !p.bye).map((p) => p.id),
  };
}

/**
 * ER EINHVER A BEKKNUM SEM AETTI AD SPILA?
 * Skilar theim skiptum sem myndu HAEKKA vaent stig. Ef listinn er
 * tomur er uppstillingin optimal midad vid spana.
 *
 * Thetta er adskilid fra `optimalLineup` viljandi: notandinn getur
 * att uppstillingu sem hann setti sjalfur, og tha er spurningin ekki
 * "hver er best" heldur "hvad er ad hja mer".
 */
export function lineupAdvice(current, players, slots = DEFAULT_SLOTS) {
  const opt = optimalLineup(players, slots);
  const optIds = new Set(opt.starters.map((s) => s.player && s.player.id).filter(Boolean));
  const curIds = new Set(current);

  const shouldStart = opt.starters
    .filter((s) => s.player && !curIds.has(s.player.id))
    .map((s) => ({ slot: s.slot, eligible: s.eligible, player: s.player }));
  const shouldSit = players
    .filter((p) => curIds.has(p.id) && !optIds.has(p.id))
    .map((p) => ({ ...p, ev: p.bye ? 0
      : (p.proj == null ? null : p.proj * (p.avail == null ? 1 : p.avail)) }));

  /* ============================================================
     SKIPTI ERU PORUD EFTIR SAETI, EKKI EFTIR VISITOLU
     ============================================================
     Adur var `shouldStart[i]` pardur vid `shouldSit[i]` — tvo OSKYLD
     fylki i theirri rod sem thau raktust upp. Utkoman gat verid
     "settu inn mottakara, taktu ut leikstjornanda", sem er ekki
     skipti heldur tvaer adskildar tillogur limdar saman. Notandi sem
     fylgdi henni hefdi endad med tomt QB-saeti.

     Og `gain` bar `s.player.ev - shouldSit[i].proj`: VAENT gildi ad
     fradregnu HRAU gildi. Tvaer olikar einingar i sama fradraetti —
     madur sem er 50% liklegur til ad spila var borinn saman vid mann
     sem var talinn spila oruggega, og munurinn leit ut eins og abati.

     Nu er hver innkoma pordu vid THANN sem situr i saeti sem hun er
     GJALDGENG i, og bezti abatinn tekinn fyrst. Bædi gildin eru `ev`.  */
  const used = new Set();
  const changes = [];
  for (const s of shouldStart) {
    let best = null;
    for (const out of shouldSit) {
      if (used.has(out.id)) continue;
      /* Sa sem fer ut verdur ad vera gjaldgengur i saetid sem losnar —
         annars er thetta ekki skipti. */
      if (s.eligible && !s.eligible.includes(out.pos)) continue;
      if (!best || (out.ev ?? Infinity) < (best.ev ?? Infinity)) best = out;
    }
    if (best) used.add(best.id);
    changes.push({
      in: s.player, out: best || null, slot: s.slot,
      gain: best && best.ev != null && s.player.ev != null
        ? round1(s.player.ev - best.ev) : null,
    });
  }

  return {
    optimal: opt,
    changes,
    isOptimal: shouldStart.length === 0,
  };
}

/**
 * EFTIR A: hve morg stig satu a bekknum sem HEFDU att ad spila?
 *
 * `actual` er raunveruleg stig vikunnar. Tvaer tolur, og thaer segja
 * sitthvora soguna:
 *
 *   `left`     stig sem BESTA moguleg uppstilling hefdi gefid umfram
 *              thina. Thetta er heildartapid.
 *   `avoidable` sa hluti sem SPAIN SA FYRIR — the. skipti sem tolid
 *              hefdi radlagt fyrirfram.
 *
 * MUNURINN ER ALLT. `left - avoidable` er oheppni: madur a bekknum
 * sprakk an thess ad nokkur gaeti sed thad fyrir. `avoidable` er
 * villa: thu spiladir mann sem spain sagdi vera lakari.
 */
export function benchRegret({ started, bench, actual, projected, slots = DEFAULT_SLOTS }) {
  const all = [...started, ...bench];
  const withActual = all.map((p) => ({ ...p, proj: actual[p.id] ?? 0 }));

  const yours = started.reduce((a, p) => a + (actual[p.id] ?? 0), 0);
  /* Besta MOGULEGA uppstilling eftir a — hun notar raunstigin. */
  const perfect = optimalLineup(withActual.map((p) => ({ ...p, avail: 1, bye: false })), slots);
  /* Uppstillingin sem SPAIN hefdi radlagt fyrirfram. */
  const advised = optimalLineup(
    all.map((p) => ({ ...p, proj: projected[p.id] ?? null })), slots);
  const advisedIds = advised.starters.map((s) => s.player && s.player.id).filter(Boolean);
  const advisedPts = advisedIds.reduce((a, id) => a + (actual[id] ?? 0), 0);

  return {
    yours: round1(yours),
    perfect: round1(perfect.projected),
    advised: round1(advisedPts),
    left: round1(perfect.projected - yours),
    /* Adeins thad sem spain SA. Getur verid neikvaett — tha var thin
       uppstilling BETRI en radgjofin, sem er lika upplysandi. */
    avoidable: round1(advisedPts - yours),
    luck: round1(perfect.projected - advisedPts),
  };
}

const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

/* ============================================================
   INNTOKIN I `benchRegret` — HREIN, OG THVI PROFANLEG
   ============================================================
   `benchRegret` var skrifud, profud og OTENGD i tvaer vikur af thvi ad
   ENGINN byggdi inntokin i hana. Sama form og `usageblend`:
   `estimateFromZ` vantadi laugina, hér vantadi uppstillinguna EINS OG
   HUN VAR og raunstigin. Fallid sjalft var alltaf rett.

   FJORAR HEIMILDIR MAETAST HER OG THAER BERA THRJU OLIK AUDKENNI:
     · `matchups`   Sleeper-audkenni (strengir), uppstilling THEIRRAR viku
     · `rows`       Sleeper-audkenni + `gsisId` — bruin
     · `weeklyRows` GSIS-audkenni, raunstig per viku
     · `projected`  okkar spa, per Sleeper-audkenni

   LYKILLINN MILLI `rows` OG `weeklyRows` ER `gsisId`, EKKI `id`, af
   nakvaemlega somu astaedu og i `usagePool`: rangur lykill finnur ENGAN
   og skilar thogult "engin eftirsja", sem litur eins ut og fullkomin
   vika. Vordur: `tests/lineup.mjs` ber toluna.

   `null` ER SVAR OG THAD ER ALGENGASTA SVARID:
     · engin vika lidin · engin vikuskra (forleikur) · deildin svarar
       ekki · hopurinn minn finnst ekki i svarinu · engin raunstig fundust
   Ekkert af thessu er bilun. Eftirsja ur engum raunstigum vaeri hins
   vegar TILBUNINGUR: allir vaeru med 0 og "perfect" vaeri 0, svo
   `left: 0` laesist eins og "thu spiladir fullkomlega".              */

/** Stigagjafar-svid i viku-rodunum. Sama vorpun og `usageblend`/`ros`. */
const WEEK_PTS_FIELD = { ppr: "ppr", "half-ppr": "half", standard: "std" };

/**
 * Eftirsja vikunnar sem er LIDIN.
 *
 * @returns `{ ...benchRegret, week, startedN, benchN, scored }` eda `null`.
 *
 * `scored` er fjoldi leikmanna sem RAUNVERULEGA fundust med stig. Hann
 * er skiladur svo vidmotid geti sagt "6 af 15" i stad thess ad birta
 * tolu sem hvilir a thremur monnum — hlutfall sem er ekki synilegt er
 * fullyrding sem ekki er haegt ad vera osammala.
 */
export function weekRegret({ matchups, rosterId, rows, weeklyRows, week,
                             scoring, slots = DEFAULT_SLOTS } = {}) {
  if (!Array.isArray(matchups) || !Array.isArray(rows) || !Array.isArray(weeklyRows)) return null;
  const wk = Number(week);
  if (!Number.isFinite(wk) || wk < 1) return null;
  const field = WEEK_PTS_FIELD[scoring];
  if (!field) return null;                       /* omaeld stigagjof -> engin tala */

  const mine = matchups.find((m) => m && Number(m.roster_id) === Number(rosterId));
  if (!mine || !Array.isArray(mine.starters) || !mine.starters.length) return null;

  const byId = new Map(rows.filter((r) => r && r.id != null).map((r) => [String(r.id), r]));
  /* SLEEPER SKRIFAR "0" I TOMT SAETI og thad er EKKI leikmadur. Vaeri
     thad latid i gegn baeri uppstillingin fantom-mann med 0 stig, sem
     laekkar "yours" og buer til eftirsja ur engu. */
  const startIds = mine.starters.filter((x) => x && String(x) !== "0").map(String);
  const allIds = (Array.isArray(mine.players) ? mine.players : [])
    .filter((x) => x && String(x) !== "0").map(String);
  const startSet = new Set(startIds);
  const benchIds = allIds.filter((id) => !startSet.has(id));

  const pick = (ids) => ids.map((id) => byId.get(id)).filter(Boolean)
    .map((r) => ({ id: String(r.id), name: r.name, pos: r.pos, team: r.team,
                   proj: r.proj, gsisId: r.gsisId }));
  const started = pick(startIds);
  const bench = pick(benchIds);
  if (!started.length) return null;

  /* --- RAUNSTIGIN, gegnum `gsisId` --- */
  const ptsByGsis = new Map();
  for (const r of weeklyRows) {
    if (!r || Number(r.week) !== wk || r.id == null) continue;
    const v = Number(r[field]);
    if (Number.isFinite(v)) ptsByGsis.set(String(r.id), v);
  }
  if (!ptsByGsis.size) return null;              /* vikan er ekki i skranni */

  const actual = {}, projected = {};
  let scored = 0;
  for (const p of [...started, ...bench]) {
    const v = p.gsisId != null ? ptsByGsis.get(String(p.gsisId)) : undefined;
    if (v !== undefined) { actual[p.id] = v; scored++; }
    /* SPAIN ER ARSTIDAR-SPA DEILD A 17 og thad er sagt hér svo enginn
       lesi hana sem viku-spa Sleeper. `benchRegret` notar hana ADEINS
       til ad rada — kvardinn fellur ut i rodun. */
    if (p.proj != null) projected[p.id] = p.proj / 17;
  }
  if (!scored) return null;

  const out = benchRegret({ started, bench, actual, projected, slots });
  return { ...out, week: wk, startedN: started.length, benchN: bench.length, scored };
}
