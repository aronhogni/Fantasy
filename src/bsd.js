/* ============================================================
   BSD — UPPSOFNUN UR SKOTAKORTI OG LEIKMANNATOLUM (hreint, ekkert React)

   AF HVERJU SER SKRA: thessi logik er notud a ThREMUR stodum —
   `scripts/fetch-bsd.mjs` (lokid timabil, handvirkt), `fetchBsdLive()` i
   `scripts/fetch.mjs` (yfirstandandi timabil, daglega) og profunum.
   Vaeri hun afrituð i pipeline-ið yrdi hun OPROFANLEG thar, nakvaemlega
   sama villa og `market.js` var stofnad til ad laga (CLAUDE.md kafli 1):
   markadsformulan bar 0,80 af vog varnarmanns og var samt oprofud af thvi
   ad hun bjó inni i `fetch.mjs`.

   **EKKI AFRITA ThESSAR FORMULUR TIL BAKA INN I `fetch.mjs`.**

   Fastarnir eru MAELDIR, ekki valdir — sja CLAUDE.md 6t:
     BIG_CHANCE_XG 0,18 · fittad gegn RAUNVERULEGA lids-svidinu
       `big_chances` a 748 lid-leikjum. MAE 0,746 · r 0,774.
       Tillagan 0,35 ur handoffi №5 maelist MAE 1,385 — tvofalt verri.
     IN_BOX_X 17 · fittad gegn `shots_inside_box` a 760 lid-leikjum,
       MAE 0,133. BSD-x er hlutfall af FULLUM velli (105 m) — ANNAR
       kvardi en ESPN (halfur vollur, 31,4), sem gefur MAE 4,079 og er
       thar med utilokadur.
   ============================================================ */

export const BIG_CHANCE_XG = 0.18;
export const IN_BOX_X = 17;

/* HANDSTADFEST LIDATAFLA: BSD team_id -> FPL short_name.
   Fuzzy porun felldi Man United inn i Man City (badir verda "manchester"
   eftir normaliseringu) — THOGUL RONG PORUN ER VERRI EN ENGIN, svo thessi
   tafla er handstadfest og verdur ad vera thad.

   HUN VAR AFRITUD I ThRJAR SKRAR (lagad 11.8.2026): scripts/fetch-bsd.mjs,
   scripts/fetch-bsd-teams.mjs og scripts/fetch.mjs (thar undir nafninu
   `BSD_TEAM_SHORT`). Afritin voru STAFRETT EINS thegar thau voru sameinud
   — mælt: sami md5 af ollum thremur — svo sameiningin breytir engu i dag.
   Astaedan til ad gera hana er su ad thau MUNDU reka i sundur: nyliðar
   koma upp og fara nidur hvert sumar, og tha tharf ad breyta ThRIMUR
   stodum. Su sem er gleymd gefur `null` lid — thogult.

   Athugid ad hausinn her segir bervorðum ordum "EKKI AFRITA ThESSAR
   FORMULUR TIL BAKA INN I fetch.mjs", og taflan var samt afritud thrisvar.
   Vordur: tests/name-norm.mjs (ATHUGASEMDIR SKORNAR BURT ADUR EN LEITAD
   ER — thessi athugasemd vitnar sjalf i gomlu nofnin).                  */
export const BSD_TEAM = {
  18: "ARS", 3: "AVL", 2: "BOU", 16: "BRE", 5: "BHA", 13: "CHE", 203: "COV",
  14: "CRY", 20: "EVE", 6: "FUL", 204: "HUL", 200: "IPS", 19: "LEE", 1: "LIV",
  12: "MCI", 17: "MUN", 4: "NEW", 15: "NFO", 9: "TOT", 7: "SUN",
};

/* SUMMANLEG svid ur /events/{id}/player-stats/.
   DAUD SVID ERU VILJANDI EKKI HER. Maelt 8.8.2026 a 15.189 leikmanna-
   leikjum: `big_chance_created`, `big_chance_missed`,
   `expected_goals_on_target`, `goals_prevented`, `keeper_save_value`,
   oll `*_value_normalized`, ball-carry/progression, `outfielder_block`,
   `error_lead_to_a_shot/goal`, `hit_woodwork`, `high_claims`,
   `last_man_tackle`, `clearance_off_line`, `total_offside` og
   halfvallar-sendingar eru 100% NON-NULL og ALLTAF NULL.
   Svid sem er alltaf 0 LITUR UT EINS OG MAELING en thydir "gognin eru
   ekki til" — gildran sem kafli 3 og 6n fordast.                      */
const SUM_FIELDS = [
  /* `total_shots` og `shots_on_target` VORU HER OG ERU FARIN (11.8.2026):
     thau voru summud i hverri umferd en `finalize` skilade theim ALDREI og
     ekkert i repo-inu las thau (staðfest med grepp yfir src/, scripts/ og
     tests/ — nul tilvik utan thessarar linu). Skot-fjoldinn sem appid
     birtir er talinn UR SKOTAKORTINU (`addShot`), sem er maelda heimildin;
     thessi tvo voru BSD-eigin samtolur vid hlidina, ospurd og obirt.
     Ad summa svid sem hvergi kemur ut er sama aett og daud svid sem
     athugasemdin fyrir ofan bannar.                                    */
  "minutes_played", "goals", "goal_assist",
  "key_pass", "total_cross", "accurate_cross", "touches",
  "total_contest", "won_contest", "duel_won", "duel_lost", "aerial_won", "aerial_lost",
  "total_pass", "accurate_pass", "total_long_balls", "accurate_long_balls",
  "dispossessed", "possession_lost", "was_fouled", "fouls",
  "blocked_scoring_attempt", "total_tackle", "won_tackle", "interception",
  "total_clearance", "ball_recovery", "saves", "punches", "goals_conceded",
  "yellow_card", "red_card",
];

/* SKOT-SUNDURLIDUN — maeld 8.8.2026, `sit` og `body` eru 100% fyllt og
   RAUNVERULEGIR flokkar: assisted 47,7% · corner 17,6% · regular 13,1% ·
   fast-break 6,9% · set-piece 5,9% · throw-in-set-piece 5,1% ·
   free-kick 2,6% · penalty 1,0% (medal-xG 0,788 = thekkta vitahlutfallid,
   sjalfstaed stadfesting a xG-likaninu). Skallar 18,7%.                */
const SET_PIECE = new Set(["corner", "set-piece", "throw-in-set-piece", "free-kick"]);
const OPEN_PLAY = new Set(["assisted", "regular", "fast-break"]);

/** Tomur safnari fyrir einn leikmann. */
export function newAcc() {
  const o = {
    apps: 0, team_id: null, teams: new Map(), rating_sum: 0, rating_n: 0,
    shots: 0, xg: 0, big_chances: 0, shots_in_box: 0, shots_out_box: 0,
    sp_shots: 0, sp_xg: 0, op_xg: 0, head_shots: 0, head_xg: 0,
    pen_shots: 0, pen_xg: 0, woodwork: 0,
  };
  for (const k of SUM_FIELDS) o[k] = 0;
  return o;
}

/** Ein rod ur `player_stats` inn i safnara. */
export function addPlayerRow(acc, r) {
  /* LIDID ER ThAD SEM HANN SPILADI FLESTA LEIKI FYRIR, ekki thad sem
     vardst SIDAST unnid ur — "sidasti vinnur" gaf leikmanni sem skipti
     um lid a midju timabili ROSANDI lid milli keyrslna (sja resolveTeam). */
  acc.apps++;
  if (r.team_id != null) acc.teams.set(r.team_id, (acc.teams.get(r.team_id) || 0) + 1);
  for (const k of SUM_FIELDS) if (typeof r[k] === "number") acc[k] += r[k];
  if (typeof r.rating === "number") { acc.rating_sum += r.rating; acc.rating_n++; }
}

/** Eitt skot ur `shotmap` inn i safnara. */
export function addShot(acc, s) {
  acc.shots++;
  const xg = typeof s.xg === "number" ? s.xg : 0;
  if (typeof s.xg === "number") {
    acc.xg += s.xg;
    if (s.xg >= BIG_CHANCE_XG) acc.big_chances++;
  }
  const x = s.pos?.x;
  if (typeof x === "number") (x <= IN_BOX_X ? acc.shots_in_box++ : acc.shots_out_box++);
  if (SET_PIECE.has(s.sit)) { acc.sp_shots++; acc.sp_xg += xg; }
  else if (OPEN_PLAY.has(s.sit)) { acc.op_xg += xg; }
  /* VITASPYRNUR DREGNAR FRA — npxG.
     Viti er 0,788 xG ad medaltali (maelt a 92 vitum) og segir ekkert um
     faera-skopun; thad segir ad hann se VITASKYTTAN, sem er birt ser
     (vitarod i Fost leikatridi). Maelt hja okkur: Bruno Fernandes fer ur
     10,9 xG i 6,1 npxG (43% var viti), Palmer 10,6 -> 5,8, Le Fee
     5,2 -> 2,0. An thessa raðar xG-dalkurinn vitaskyttum, ekki skyttum. */
  if (s.sit === "penalty") { acc.pen_shots++; acc.pen_xg += xg; }
  if (s.body === "head") { acc.head_shots++; acc.head_xg += xg; }
  /* TREVERK — `luck.json` hefur borid woodwork: null sidan Understat do
     (6b) og 6e taldi thad oendurheimtanlegt. BSD skilar thvi sem EIGIN
     utkomu-tegund: 211 skot 2025/26.                                   */
  if (s.type === "post") acc.woodwork++;
}

/** Flest-leikid lid; jafntefli brotnar a laegsta id svo thetta se FAST. */
export function resolveTeam(acc) {
  let best = null, bn = -1;
  for (const [tid, n] of [...acc.teams].sort((a, b) => a[0] - b[0]))
    if (n > bn) { bn = n; best = tid; }
  acc.team_id = best;
  return best;
}

/** Safnari -> birt rod. TOM GILDI ERU null, ALDREI 0 (CLAUDE.md 6i). */
/* SKOT-SVIDIN NOTA NU `per()` EINS OG ALLIR ADRIR TELJARAR (11.8.2026).
   ADUR: `shots: s || null` og `<svid>: s ? … : null`, thar sem `s` er
   FJOLDI SKOTA. Leikmadur sem SPILADI en skaut EKKI fekk thvi `null` —
   sem birtist sem "—" og segir "gognin vantar", thott vid vitum
   nakvaemlega hvad hann gerdi: hann skaut ekki. Thad er RAUNVERULEGT NULL
   og reglan i CLAUDE.md kafla 8 er skyr: NULL ER EKKI NULL.

   MAELT a committudu skranni (393 leikmenn): **77 hafa apps>0 og
   shots===null** — 37 markmenn, 19 varnarmenn, 15 midjumenn, 6 framherjar.
   Markmennirnir eru fyrirsjaanlegir, en utileikmennirnir eru thad ekki:
     Lamare Bogarde (AVL M) 38 apps, 1.104 min, 0 skot
     Adam Smith     (BOU D) 33 apps, 1.095 min, 0 skot
   Fyrir thá tvo er "—" hreinlega ROENG birting.

   ThAD SEM SETTI ThETTA UT AF: SAMA ROD ber thegar `touches: 0` og
   `key_pass: 0` fyrir leikmann med 0 minutur (staðfest: Anthony Patterson,
   23 apps, 0 min -> touches 0, key_pass 0, shots **null**). `shots` var
   thvi EINA teljarinn i rodinni sem hagadi ser ekki eins og hinir; thetta
   samraemir hann vid rodina sem hann bur i, thad byr ekki til nya reglu.

   HLUTFOLL FYLGJA EKKI MED og thad er asetningur: `xg_per_shot` er 0/0
   an skota og `sp_xg_share` krefst `acc.xg > 0`. Thar ER null rett svar —
   ekki "vantar" heldur "OSKILGREINT".                                   */
export function finalize(acc, { bsd_id, name, pos, team, fpl_id, code }) {
  const per = v => (acc.apps ? v : null);
  const s = acc.shots;
  return {
    bsd_id, name: name ?? null, pos: pos ?? null, team: team ?? null,
    fpl_id: fpl_id ?? null, code: code ?? null,
    apps: acc.apps,
    minutes: per(acc.minutes_played),
    rating: acc.rating_n ? +(acc.rating_sum / acc.rating_n).toFixed(2) : null,
    goals: per(acc.goals), assists: per(acc.goal_assist),
    shots: per(s),
    xg: per(+acc.xg.toFixed(3)),
    xg_per_shot: s ? +(acc.xg / s).toFixed(4) : null,
    big_chances: per(acc.big_chances),
    shots_in_box: per(acc.shots_in_box),
    shots_out_box: per(acc.shots_out_box),
    sp_shots: per(acc.sp_shots),
    sp_xg: per(+acc.sp_xg.toFixed(3)),
    op_xg: per(+acc.op_xg.toFixed(3)),
    /* NEFNARINN ER npxG, EKKI xG — MAELT 19.8.2026.
       `sp_xg` og `op_xg` skipta a milli sin NPXG (viti er hvorki i
       `SET_PIECE` ne `OPEN_PLAY`), en hlutfallid deildi med HEILDAR-xG
       ad meðtoldum vitum. Thau thrju stemmdu thvi ekki: a skjanum las
       Bruno Fernandes `xG 10,88 · npxG 6,15 · SP xG 0,96 · SP % 9% ·
       OP xG 5,18` — SP+OP = 6,14 og 4,73 xG hvergi taldir.
       SANNAD A RAUNGOGNUM (316 leikmenn): SP+OP er JAFNT np_xg hja
       ollum 316 og ojafnt xg hja 25 — theim sem taka viti. Nefnarinn
       verdur ad vera thad sem hlutarnir tveir mynda.
       Vitin sjalf eru hvorki soknar- ne fastaleikur i thessari skiptingu;
       hver sem vill "vita-hlutfall" tharf sinn eigin dalk, ekki ad lauma
       theim inn i thennan.                                             */
    sp_xg_share: (acc.xg - acc.pen_xg) > 0
      ? +(acc.sp_xg / (acc.xg - acc.pen_xg)).toFixed(3) : null,
    head_shots: per(acc.head_shots),
    head_xg: per(+acc.head_xg.toFixed(3)),
    pen_shots: per(acc.pen_shots),
    np_xg: per(+(acc.xg - acc.pen_xg).toFixed(3)),
    woodwork: per(acc.woodwork),
    key_pass: per(acc.key_pass),
    crosses: per(acc.total_cross), crosses_acc: per(acc.accurate_cross),
    touches: per(acc.touches),
    dribbles: per(acc.total_contest), dribbles_won: per(acc.won_contest),
    duels_won: per(acc.duel_won), duels_lost: per(acc.duel_lost),
    aerial_won: per(acc.aerial_won), aerial_lost: per(acc.aerial_lost),
    passes: per(acc.total_pass), passes_acc: per(acc.accurate_pass),
    long_balls: per(acc.total_long_balls), long_balls_acc: per(acc.accurate_long_balls),
    dispossessed: per(acc.dispossessed), possession_lost: per(acc.possession_lost),
    was_fouled: per(acc.was_fouled), fouls: per(acc.fouls),
    blocks: per(acc.blocked_scoring_attempt),
    tackles: per(acc.total_tackle), tackles_won: per(acc.won_tackle),
    interceptions: per(acc.interception), clearances: per(acc.total_clearance),
    recoveries: per(acc.ball_recovery),
    saves: per(acc.saves), punches: per(acc.punches), goals_conceded: per(acc.goals_conceded),
    yellow: per(acc.yellow_card), red: per(acc.red_card),
  };
}

/* ---------- SPAD BYRJUNARLID: SKOT-SAFN ----------
   BSD GEYMIR EKKI SPAR AFTURVIRKT. Maelt 8.8.2026: leikur sem er buinn
   skilar `lineup_status: "confirmed"`, ekki thvi sem spad var adur. Spa
   sem er ekki soft fyrir leik er thvi TOPUD AD EILIFU — og hun er einmitt
   thad sem a ad maela sidar gegn 6h-likaninu.

   ThESS VEGNA ER ThETTA VIDBOT, ALDREI YFIRSKRIFT. Fallid er hreint svo
   su eina regla se profanleg: eldra skot ma ALDREI hverfa.            */
export function mergeLineupSnapshot(prev, { eventId, fixture, kickoff, lineups, status, at }) {
  const out = { ...prev };
  const key = String(eventId);
  const rec = out[key]
    ? { ...out[key], snapshots: [...(out[key].snapshots || [])] }
    : { fixture, kickoff, snapshots: [] };
  const last = rec.snapshots[rec.snapshots.length - 1];
  /* Eitt skot per STODU. `predicted` getur uppfaerst oft an thess ad
     breytast; thegar `confirmed` kemur viljum vid EIGA badar til
     samanburdar, svo stodu-breyting er thad sem kallar a nytt skot.   */
  if (!last || last.status !== status) {
    rec.snapshots.push({ at, status, home: lineups?.home ?? null, away: lineups?.away ?? null });
  }
  out[key] = rec;
  return out;
}

/* ---------- NAFNA-PORUN VID FPL ----------
   NORMUNIN OG TAKNUNIN KOMA UR src/names.js (11.8.2026). Adur var
   `normName` skilgreint bædi her og i src/stats.js, badar utgafur
   `export`-adar undir sama nafni og badar poradar vid somu FPL-nofn — svo
   lagfaering a annarri hefdi ALDREI nad til hinnar.

   Utgafan HER var su svakari: hun sendi `'` i BIL og `nameTokens` henti svo
   eins-stafs takninu, svo "O'Riley" varo `[riley]` i stad `[oriley]`. Thad
   er raunveruleg svidsmynd fyrir falska porun i lidi sem a bædi "O'Riley"
   og "Riley". Hun vantadi einnig fjora stafi (ħ ŋ ĸ ŧ).

   MAELT ADUR EN BREYTT VAR — sameiningin er HREINSUN, ekki lagfaering:
   endurbyggt frambod (**393 leikmenn**, sama skorun undir badum
   normolurum) gefur **0 breytta porun**.
   ATH: fyrsta maelingin sagdi "284" og "0 fravik fra committudu skranni".
   Badar tolur voru rangar — maeliskriftan las `unmatched_names` (284
   strengi) i stad `players` (393). Rett maeling gefur SOMU nidurstodu.
   Sja alla soguna i names.js; hun er skjolud thar af thvi ad tóm maeling
   sem les eins og maeling er versta utkoman (CLAUDE.md kafli 3).

   `nameScore` HER AD NEDAN FYLGDI EKKI MED OG ThAD ER ASETT: hun skilar
   HLUTFALLI (0..1) thvi `pairPlayers` ber thad vid throskuldinn 0,6, en
   stats.js-utgafan skilar FJOLDA + 0,5 fyrir sameiginlegt eftirnafn. Tvaer
   stadfestar poranir — ekki steypa theim saman.                         */
import { normName, nameTokens } from "./names.js";
export { normName, nameTokens };
/** Hlutfall sameiginlegra takna. De-dupe an `Set` (sbr. 6i-hagraedinguna). */
export function nameScore(a, b) {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  let hit = 0;
  for (let i = 0; i < ta.length; i++) {
    if (ta.indexOf(ta[i]) !== i) continue;
    if (tb.includes(ta[i])) hit++;
  }
  return hit / Math.min(new Set(ta).size, new Set(tb).size);
}

export const FPL_POS = { 1: "G", 2: "D", 3: "M", 4: "F" };

/**
 * EITT-A-EITT PORUN, skordud vid LID og stadfest med STODU.
 * `minutesOf(fplId)` er valfrjals onnur visbending — nafnid eitt vixladi
 * Jacob og Alex Murphy (badir NEW) og setti Gabriel Martinelli a Gabriel.
 * Skilar Map: bsdId -> fplPlayer.
 */
/* SEINNI UMFERD FYRIR ThA SEM FAERDU SIG — MAELT 19.8.2026.
   `c.pool` er FPL-leikmenn hja felaginu I DAG, en BSD ber felagid sem hann
   spiladi fyrir I FYRRA. Leikmadur sem seldist i sumarglugganum er thvi
   ALDREI i sinni eigin laug og hverfur ur skranni med ollu.
   Maelt: endurkeyrsla 19.8. tapadi SEX raunverulegum leikmonnum — Bruno
   Guimaraes (NEW->ARS, 30 leikir, 2.455 min, 42 skot), Brennan Johnson
   (CRY->EVE), Lukic (FUL->IPS), McNeil (EVE->CRY), Guessand (AVL->CRY) og
   Awoniyi (NFO->COV). Allir sex eru VIRKIR i FPL i dag. Nakvaemlega sama
   aett og Meslier-villan (CLAUDE.md 3): uppfletting a felagi DAGSINS a
   gogn FYRRA timabils.

   SEINNI UMFERDIN ER STRONG, EKKI RUM: hun keyrir ADEINS a theim sem
   fundust ekki i eigin laug, hun leitar i ollum sem eru ENN OTEKNIR, og
   hun krefst BAEDI sterkara nafns (0,85 i stad 0,6) OG ad minuturnar
   stemmi. Minuturnar eru thad sem gerir hana orugga: grunn-minuturnar eru
   FYRRA timabils, svo faerdur leikmadur ber somu tolu og BSD hefur um
   hann. Nafna-parun EIN og ser er thad sem vixladi Jacob og Alex Murphy.  */
export function pairPlayers(cands, { minutesOf, fallbackPool } = {}) {
  const scored = [];
  for (const c of cands) {
    for (const fp of c.pool) {
      const full = `${fp.first_name || ""} ${fp.second_name || ""}`;
      const s = Math.max(nameScore(c.name, full), nameScore(c.name, fp.web_name),
                         nameScore(c.short_name, fp.web_name));
      if (s < 0.6) continue;
      if (FPL_POS[fp.element_type] !== c.pos && s < 0.99) continue;
      let score = s;
      if (minutesOf) {
        const fm = minutesOf(fp.id);
        if (fm != null && (c.minutes || fm))
          score += 0.5 * (1 - Math.abs((c.minutes || 0) - fm) / Math.max(c.minutes || 0, fm, 1));
      }
      scored.push([score, c.bsd_id, fp]);
    }
  }
  /* STODUG ROD — jafntefli eru raunveruleg (samnefningar i sama lidi) og
     verda ad brotna a EINHVERJU FOSTU, annars er skrain ekki endurgeranleg. */
  scored.sort((a, b) => (b[0] - a[0]) || (a[1] - b[1]) || (a[2].id - b[2].id));
  const out = new Map(), usedFpl = new Set();
  for (const [, bid, fp] of scored) {
    if (out.has(bid) || usedFpl.has(fp.id)) continue;
    out.set(bid, fp); usedFpl.add(fp.id);
  }

  /* ---- SEINNI UMFERD: their sem faerdu sig milli felaga ---- */
  if (fallbackPool && fallbackPool.length) {
    const rest = [];
    for (const c of cands) {
      if (out.has(c.bsd_id)) continue;
      for (const fp of fallbackPool) {
        if (usedFpl.has(fp.id)) continue;
        const full = `${fp.first_name || ""} ${fp.second_name || ""}`;
        const s = Math.max(nameScore(c.name, full), nameScore(c.name, fp.web_name),
                           nameScore(c.short_name, fp.web_name));
        if (s < 0.85) continue;                       // strangara en i eigin laug
        if (FPL_POS[fp.element_type] !== c.pos) continue;   // stadan verdur ad passa
        const fm = minutesOf ? minutesOf(fp.id) : null;
        /* MINUTURNAR ERU ORYGGID. An theirra vaeri thetta nafna-parun yfir
           ALLA deildina, sem er einmitt thad sem vixladi Murphy-braedurna. */
        if (fm == null) continue;
        const cm = c.minutes || 0;
        /* TVO NULL ERU EKKI SAMKOMULAG — ThAU ERU SKORTUR A GOGNUM.
           Fyrsta utgafa thessarar umferdar leyfdi `|0 - 0| = 0` og pardi
           BSD "James Wilson" (TOT, 2 leikir, 0 min) vid FPL "Callum Wilson"
           (BRE) — sitthvorn manninn. Minuturnar eru ORYGGID i thessari
           umferd; se hvorug hlidin med minutur er ENGIN sonnun til stadar
           og hun verdur ad sitja hja. "Thogul rong porun er verri en engin"
           (CLAUDE.md 6) — og hun kostadi r(minutur) 0,9998 -> 0,9982.     */
        if (cm <= 0 || fm <= 0) continue;
        if (Math.abs(cm - fm) > Math.max(90, 0.10 * Math.max(cm, fm))) continue;
        rest.push([s, c.bsd_id, fp]);
      }
    }
    rest.sort((a, b) => (b[0] - a[0]) || (a[1] - b[1]) || (a[2].id - b[2].id));
    for (const [, bid, fp] of rest) {
      if (out.has(bid) || usedFpl.has(fp.id)) continue;
      out.set(bid, fp); usedFpl.add(fp.id);
    }
  }
  return out;
}
