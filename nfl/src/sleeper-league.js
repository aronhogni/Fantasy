/* ============================================================
   sleeper-league.js — DEILDIN LESIN UR SLEEPER. HREIN.

   Ekkert React, ekkert `fetch`. Thetta er VORPUNIN: Sleeper-svar inn,
   deildarsnid appsins ut. Ástaedan fyrir thvi ad hun er ser skra og
   utan .jsx er sama og annars stadar i thessu repo — profin verda ad
   geta keyrt NAKVAEMLEGA somu vorpun og appid notar. Vaeri hun inni i
   `DraftBoard.jsx` gaeti profid adeins profad AFRIT af henni.

   ============================================================
   HVERS VEGNA THETTA ER TIL
   ============================================================
   Adur bar appid EINN reit: draft-id. Notandinn limdi inn slod og
   appid strikadi ut tha sem voru farnir. Reglurnar — stigagjof, fjoldi
   lida, byrjunarsaeti, umferdir — voru slegnar inn i HENDI i
   flipastikunni, og thaer eru EKKI skraut: `teams` og `scoring` raeda
   badum hvada ADP er lesid OG hvar varamanns-threpid liggur (sja
   `model.js`). Deild sem er slegin inn rangt reiknar adra deild en
   notandinn spilar i — og hun gerir thad THOGULT, med tolum sem lita
   nakvaemlega eins ut.

   Sleeper ber allt thetta a OPNUM endapunktum med CORS-hausum. Enginn
   lykill, engin innskraning, ekkert leyndarmal. Innskraning vaeri
   STRICT VERRI: hun setti raunverulegt skilriki i vafra-app i OPNU
   repo-i og gaefi engin ny gogn.

   ============================================================
   TVAER GILDRUR SEM MAELDAR VORU A RAUNVERULEGRI DEILD
   (league 1389356308104249344, 12.8.2026)
   ============================================================
   1. `league.settings.draft_rounds` VAR 3. Draftid sjalft
      (`draft.settings.rounds`) bar **15**. Hefdum vid lesid deildina
      hefdi radgjofin talid ad thrjar umferdir vaeru eftir og aldrei
      sagt ther ad taka spyrnumann ne vorn. **Draftid er heimildin um
      draftid**; deildin er heimildin um reglurnar.

   2. `draft.draft_order` var `null` — Sleeper dregur rodina EFTIR ad
      deildin er stofnud. Thad er ekki bilun og ma ekki lesast eins og
      bilun. Saetid er tha OTHEKKT, og ver leysum thad i stad thess
      gegnum `slot_to_roster_id` -> `rosters[].owner_id` -> lidsheiti,
      svo notandinn geti SMELLT a lidid sitt.
   ============================================================ */

import { DEFAULT_LEAGUE, normalizeLeague } from "./build.js";

/* ============================================================
   1. SLODIN
   ============================================================
   Notandinn limir inn thad sem hann hefur i vafranum. Thad er
   YFIRLEITT deildarslod (`/leagues/{id}/predraft`) thvi thad er
   sidan sem madur er a fyrir draft — EKKI draft-slod, sem var thad
   eina sem gamla reitið tok vid.

   Gamla `extractDraftId` tok FYRSTA 6+ stafa tolustrenginn og kalladi
   hann draft-id. A deildarslod gaf thad DEILDAR-id sem draft-id, svo
   `/draft/{leagueId}` skiladi 404 og notandinn sa "Draft fannst ekki"
   fyrir slod sem var alveg rett. Tegundin verdur ad radast af
   SLODINNI, ekki af tolunni.                                        */

/**
 * Skilar `{ kind, id }` thar sem `kind` er:
 *   "league" — deildarslod, vid vitum thad fyrir vist
 *   "draft"  — draft-slod, vid vitum thad fyrir vist
 *   "id"     — bert audkenni; TVIRAETT, sa sem kallar verdur ad kanna
 *   null     — ekkert nothaeft i strengnum
 *
 * Bert audkenni er viljandi ekki gisk. Deildar- og draft-audkenni eru
 * bædi 19 stafa snjokorn og thau eru ekki adgreinanleg a forminu.
 */
export function parseSleeperInput(s) {
  const str = String(s == null ? "" : s).trim();
  if (!str) return { kind: null, id: null };

  /* Rodin skiptir mali: `/draft/nfl/123` ber lika tolustreng sem
     almenna reglan myndi gleypa. Serstoku mynstrin fyrst. */
  const league = str.match(/\/leagues?\/(\d{6,})/);
  if (league) return { kind: "league", id: league[1] };

  const draft = str.match(/\/drafts?\/(?:nfl\/)?(\d{6,})/);
  if (draft) return { kind: "draft", id: draft[1] };

  /* Bert audkenni. TVIRAETT viljandi: deildar- og draft-audkenni eru
     bædi 19 stafa snjokorn og eru EKKI adgreinanleg a forminu, svo sa
     sem kallar verdur ad kanna badar leidir. Vid herdum ekki a
     tolustafi — hafnad audkenni gefur "thetta er ekki slod", en
     audkenni sem er reynt gefur svar fra Sleeper sjalfum, sem er
     rettari villuboð. */
  const bare = str.match(/^([A-Za-z0-9_-]{2,})$/);
  if (bare) return { kind: "id", id: bare[1] };

  /* Slod med tolu einhvers stadar en engu thekktu mynstri — betra ad
     na audkenninu en ad hafna ollu. Tha er thad tviraett. */
  const any = str.match(/(\d{6,})/);
  return any ? { kind: "id", id: any[1] } : { kind: null, id: null };
}

/* ============================================================
   2. BYRJUNARSAETIN UR `roster_positions`
   ============================================================
   Sleeper ber saetin sem FYLKI i rod, eitt stak per saeti:
     ["QB","RB","RB","WR","WR","TE","FLEX","FLEX","K","DEF","BN",...]
   Appid vill TALNINGU (`{QB:1, RB:2, ...}`), svo thetta er talning
   — ekki vorpun stak fyrir stak.

   BEKKUR ER EKKI BYRJUNARSAETI. `BN`/`IR`/`TAXI` verda ad falla ut,
   annars taeldi `starters` 15 saeti i 10-lida deild og varamanns-
   threpid faeri ut i hafsauga (`replacementRanks` i `model.js`
   margfaldar saetafjoldann med lidafjoldanum).                     */

/** Sleeper-heiti -> okkar stodur. `DEF` er `DST` hja oss. */
const FLEX_KINDS = {
  FLEX:        ["RB", "WR", "TE"],
  WRRB_FLEX:   ["RB", "WR"],
  REC_FLEX:    ["WR", "TE"],
  SUPER_FLEX:  ["QB", "RB", "WR", "TE"],
};

const BENCH_KINDS = ["BN", "IR", "TAXI"];
/* IDP — sokn-eingongu likan. Thetta er ekki stutt og thad verdur ad
   SEGJAST; thogul sleppa vaeri deild sem reiknar annad en hun synir. */
const IDP_KINDS = ["DL", "LB", "DB", "IDP_FLEX", "DE", "DT", "CB", "SS", "FS", "LB_DB"];

/**
 * `roster_positions` -> `{ starters, flexPos, superflex, bench, idp, unknown }`
 *
 * `starters` notar okkar lykla (QB/RB/WR/TE/K/DST/FLEX/SUPERFLEX).
 * `flexPos` er stodurnar sem FLEX-saetid tekur. Appid ber EINN
 * `flexPos`-lista (sja `lineup.js`), svo deild sem blandar `FLEX` og
 * `REC_FLEX` faer SAMMENGID og vidvorun — ad velja annad thegjandi
 * vaeri ad reikna annad saeti en deildin hefur.
 */
export function startersFromRoster(rosterPositions) {
  const out = { starters: {}, flexPos: null, superflex: false,
                bench: 0, idp: 0, unknown: [], mixedFlex: false };
  if (!Array.isArray(rosterPositions)) return out;

  const flexSets = [];
  for (const raw of rosterPositions) {
    const p = String(raw || "").toUpperCase();
    if (!p) continue;

    if (BENCH_KINDS.includes(p)) { out.bench++; continue; }
    if (IDP_KINDS.includes(p)) { out.idp++; continue; }

    if (p === "SUPER_FLEX") {
      out.starters.SUPERFLEX = (out.starters.SUPERFLEX || 0) + 1;
      out.superflex = true;
      continue;
    }
    if (FLEX_KINDS[p]) {
      out.starters.FLEX = (out.starters.FLEX || 0) + 1;
      flexSets.push(FLEX_KINDS[p]);
      continue;
    }
    if (p === "DEF" || p === "DST" || p === "D/ST") {
      out.starters.DST = (out.starters.DST || 0) + 1;
      continue;
    }
    if (["QB", "RB", "WR", "TE", "K"].includes(p)) {
      out.starters[p] = (out.starters[p] || 0) + 1;
      continue;
    }
    out.unknown.push(p);
  }

  if (flexSets.length) {
    const uniq = [...new Set(flexSets.map((s) => s.join("/")))];
    out.mixedFlex = uniq.length > 1;
    out.flexPos = [...new Set(flexSets.flat())];
  }
  return out;
}

/* ============================================================
   3. STIGAGJOFIN
   ============================================================
   HER ER RAUNVERULEG TAKMORKUN OG HUN VERDUR AD VERA SYNILEG.

   Appid ber THRJAR stigagjafir og ekki fleiri — `ppr`, `half-ppr`,
   `standard` — thvi Sleeper-spain og ADP eru sott i nakvaemlega theim
   thremur afbrigdum (`pts_ppr`, `pts_half_ppr`, `pts_std` og somu thrju
   ADP-svid; sja `scripts/sources/sleeper.mjs`). Deild med `rec: 0,75`
   eda TE-premium er thvi EKKI reiknanleg her; hun er NALGUD.

   Su nalgun ma ekki fara thegjandi i gegn. Sama regla og verdspain i
   FPL-appinu: nalgun ma aldrei birtast sem vissa.                   */

/** Sleeper-sjalfgefid. Frávik hedan skekkja SPAINA, ekki bara talninguna. */
const CANON = {
  pass_yd: 0.04, pass_td: 4, pass_int: -1,
  rush_yd: 0.1, rush_td: 6,
  rec_yd: 0.1, rec_td: 6,
  fum_lost: -2,
};

/** Svid sem gera stigagjofina oreiknanlega fyrir okkar spa. */
const BONUS_FIELDS = [
  ["bonus_rec_te", "TE premium"],
  ["bonus_rec_wr", "WR reception bonus"],
  ["bonus_rec_rb", "RB reception bonus"],
  ["bonus_rush_yd_100", "100-yard rushing bonus"],
  ["bonus_rec_yd_100", "100-yard receiving bonus"],
  ["bonus_pass_yd_300", "300-yard passing bonus"],
];

/**
 * `scoring_settings` -> `{ scoring, rec, exact, warnings }`
 *
 * `exact === false` thydir "vid notum naesta afbrigdi og thad er
 * NALGUN". Sa sem kallar verdur ad birta thad.
 */
export function scoringFromSettings(ss) {
  const s = ss && typeof ss === "object" ? ss : {};
  const warnings = [];
  const rec = Number.isFinite(Number(s.rec)) ? Number(s.rec) : null;

  let scoring = "ppr", exact = true;
  if (rec == null) {
    /* Ekkert `rec`-svid. Sleeper sleppir thvi ekki i raun, svo thetta
       er oheilt svar — ekki "standard". Sjalfgefna appsins stendur. */
    scoring = DEFAULT_LEAGUE.scoring;
    exact = false;
    warnings.push("No `rec` value in the league scoring — kept the current setting.");
  } else if (rec === 1) scoring = "ppr";
  else if (rec === 0.5) scoring = "half-ppr";
  else if (rec === 0) scoring = "standard";
  else {
    /* Naesta af theim thremur sem vid EIGUM spa fyrir. */
    const cands = [["ppr", 1], ["half-ppr", 0.5], ["standard", 0]];
    cands.sort((a, b) => Math.abs(a[1] - rec) - Math.abs(b[1] - rec));
    scoring = cands[0][0];
    exact = false;
    warnings.push(
      `This league gives ${rec} per reception. Projections exist only for ` +
      `1.0 / 0.5 / 0 — using ${cands[0][0]}, which is an approximation.`);
  }

  for (const [k, label] of BONUS_FIELDS) {
    const v = Number(s[k]);
    if (Number.isFinite(v) && v !== 0) {
      exact = false;
      warnings.push(`${label} (${k} = ${v}) is not in the projections — ` +
                    `players at that position will read low.`);
    }
  }

  const off = [];
  for (const [k, want] of Object.entries(CANON)) {
    const v = Number(s[k]);
    if (Number.isFinite(v) && v !== want) off.push(`${k} ${v} (usually ${want})`);
  }
  if (off.length) {
    exact = false;
    warnings.push(`Non-standard scoring: ${off.join(", ")}. The projections are ` +
                  `Sleeper's own at default values, so those positions shift.`);
  }

  return { scoring, rec, exact, warnings };
}

/* ============================================================
   4. STODU-THAKID — HER ER EKKI FUNDID UPP A TOLU
   ============================================================
   `maxPos` er EKKI deildarregla. Thad er hegdunar-thak i draft-
   herminum: hve marga af hverri stodu MADUR draftar. Talan
   `{QB:2, RB:6, WR:7, TE:2}` var maeld (sja `accuracy.js`) i
   12-lida deild med QB1/RB2/WR3/TE1/FLEX1.

   FREISTNIN ER AD SKALA HANA eftir innfluttri deild — t.d. "tvo FLEX
   saeti, tha ma TE-thakid vera 4". Su tala vaeri OMAELD og hun
   myndi lita nakvaemlega eins ut og maelda talan vid hlidina. Thad er
   versta utkoman i thessu repo-i.

   Thess vegna er thakid latid STANDA, og eina breytingin sem er gerd
   er RETTLEIKS-GOLF: thakid ma ekki vera laegra en fjoldi saeta sem
   VERDUR ad fylla, annars gaeti hermunin ekki fyllt byrjunarlidid.
   Thad er ekki fínstilling, thad er ad forda omoguleika.

   Se logun deildarinnar ekki ein af theim sem VORU maeldar
   (`shapes_sleeper.json`) er thad SAGT — sja `unmeasuredShape`.      */
export function maxPosFor(starters, superflex) {
  const st = starters || {};
  const base = DEFAULT_LEAGUE.maxPos;
  const out = {};
  for (const pos of Object.keys(base)) {
    let need = st[pos] || 0;
    /* Superflex-saetid er i raun fyllt af QB i flestum tilfellum, svo
       thakid verdur ad leyfa thann mann. Adrar stodur geta fyllt thad
       lika og thaer eiga sin eigin, haerri thok hvort ed er. */
    if (pos === "QB" && superflex) need += st.SUPERFLEX || 1;
    out[pos] = Math.max(base[pos], need);
  }
  return out;
}

/* ============================================================
   5. VAR THESSI LOGUN MAELD?
   ============================================================
   `shapes_sleeper.json` ber theer logunar sem `shape-lab.mjs` maeldi.
   Notandi i 10-lida deild med tveimur FLEX-saetum a rett a ad vita
   hvort tolurnar hans voru nokkurn timann profadar — ad thegja um thad
   er ad lata omælda logun lesast eins og maelda.                    */
export function unmeasuredShape(league, shapes) {
  const table = shapes && shapes.shapes ? shapes.shapes : null;
  if (!table) return null;                 // engin gogn -> engin fullyrding
  const st = league.starters || {};
  const same = (a, b) => {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
    return true;
  };
  for (const v of Object.values(table)) {
    if (v.scoring !== league.scoring) continue;
    if (v.teams !== league.teams) continue;
    /* Hermunin telur ekki K/DST (sja `excludePos`), svo their eru
       utan samanburdarins — annars vaeri HVER deild omaeld. */
    const mine = { ...st }; delete mine.K; delete mine.DST;
    if (same(mine, v.starters)) return null;
  }
  const shown = Object.entries(st)
    .filter(([k]) => k !== "K" && k !== "DST")
    .map(([k, n]) => `${n}${k}`).join(" ");
  return `${league.teams}-team ${league.scoring} with ${shown} is not one of the ` +
         `shapes in Model lab. Position caps were measured on 12-team ` +
         `QB1 RB2 WR3 TE1 FLEX1 and are carried over unchanged.`;
}

/* ============================================================
   6. LIDIN — SVO SAETID SE VALID, EKKI SLEGID INN
   ============================================================
   Saetid er thad sem gerir tenginguna heila: an thess strikar appid
   ut tha sem eru farnir en THINN hopur fyllist aldrei, svo "hvern a
   ad taka naest" veit ekki hvad thu att.

   THRJAR LEIDIR AD SAETINU, i thessari rod:
     1. `draft_order[user_id]` — beint, thegar rodin er dregin
     2. `slot_to_roster_id` + `rosters[].owner_id` — virkar THOTT
        rodin se ekki dregin, thvi saeti->hopur er sett vid stofnun
     3. notandinn slaer inn tolu

   Leid 2 er astaedan fyrir thessu falli: a raunverulegri deild var
   `draft_order` NULL og leid 1 gaf ekkert. Ad birta lidsheitin og
   lata notandann smella er bædi opinbert og oyggjandi.              */
export function teamsFromLeague({ draft, users, rosters }) {
  const byUser = new Map();
  for (const u of Array.isArray(users) ? users : []) {
    if (u && u.user_id) byUser.set(String(u.user_id), u);
  }
  const byRoster = new Map();
  for (const r of Array.isArray(rosters) ? rosters : []) {
    if (r && r.roster_id != null) byRoster.set(Number(r.roster_id), r);
  }

  const order = draft && draft.draft_order && typeof draft.draft_order === "object"
    ? draft.draft_order : null;
  const s2r = draft && draft.slot_to_roster_id && typeof draft.slot_to_roster_id === "object"
    ? draft.slot_to_roster_id : null;

  const out = [];
  const seen = new Set();

  const push = (slot, userId) => {
    const key = `${slot}|${userId || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    const u = userId ? byUser.get(String(userId)) : null;
    out.push({
      slot: slot == null ? null : Number(slot),
      userId: userId ? String(userId) : null,
      /* `team_name` er valfritt i Sleeper; `display_name` er alltaf
         thar. Bædi vantad -> saetatala, aldrei "undefined" a skja. */
      name: (u && u.metadata && u.metadata.team_name) ||
            (u && u.display_name) ||
            (slot != null ? `Slot ${slot}` : "Unknown"),
    });
  };

  if (order) {
    for (const [userId, slot] of Object.entries(order)) {
      if (Number.isFinite(Number(slot))) push(Number(slot), userId);
    }
  }
  if (s2r) {
    for (const [slot, rosterId] of Object.entries(s2r)) {
      const r = byRoster.get(Number(rosterId));
      const uid = r && r.owner_id ? String(r.owner_id) : null;
      /* Se saetid thegar komid ur `draft_order` ma thad ekki
         tvitakast — thess vegna er `seen` a saeti+notanda. */
      if (!out.some((t) => t.slot === Number(slot))) push(Number(slot), uid);
    }
  }
  /* Ekkert saetakort til: birtum tha lidin an saetis svo notandinn
     sjai ad thau eru thekkt, en slaí inn saetid sjalfur. */
  if (!out.length) {
    for (const u of Array.isArray(users) ? users : []) push(null, u.user_id);
  }

  out.sort((a, b) => (a.slot == null ? 1e9 : a.slot) - (b.slot == null ? 1e9 : b.slot));
  return out;
}

/* ============================================================
   7. ALLT SAMAN — SLEEPER-SVAR INN, DEILDARSNID UT
   ============================================================ */

/**
 * `{ league, draft, shapes }` -> `{ league, imported, warnings }`
 *
 * `league`   Sleeper `/league/{id}`  (reglurnar)
 * `draft`    Sleeper `/draft/{id}`   (draftid — HEIMILDIN um umferdir,
 *                                     lidafjolda og tegund)
 * `shapes`   `shapes_sleeper.json`   (valfrjalst — "var thetta maelt?")
 *
 * Utkoman fer gegnum `normalizeLeague`, svo innflutt deild getur ekki
 * komid appinu i verra astand en handvirkt innslattur gat.
 */
export function leagueFromSleeper({ league: lg, draft, shapes } = {}) {
  const warnings = [];
  const L = lg && typeof lg === "object" ? lg : {};
  const D = draft && typeof draft === "object" ? draft : {};
  const dset = D.settings && typeof D.settings === "object" ? D.settings : {};
  const lset = L.settings && typeof L.settings === "object" ? L.settings : {};

  /* --- fjoldi lida ---
     Draftid fyrst: thad er thad sem er raunverulega draftad i. */
  const teams = num(dset.teams) ?? num(L.total_rosters) ?? num(lset.num_teams);

  /* --- byrjunarsaeti --- */
  const rp = startersFromRoster(L.roster_positions);
  const starters = Object.keys(rp.starters).length ? rp.starters : null;
  if (!starters) {
    warnings.push("No `roster_positions` in the league — starting slots kept as they were.");
  }
  if (rp.idp > 0) {
    warnings.push(`${rp.idp} IDP slot${rp.idp > 1 ? "s" : ""} (DL/LB/DB) — this app ` +
                  `models offence only, so those slots are ignored.`);
  }
  if (rp.unknown.length) {
    warnings.push(`Unrecognised roster slots: ${[...new Set(rp.unknown)].join(", ")}.`);
  }
  if (rp.mixedFlex) {
    warnings.push("This league mixes flex types (e.g. FLEX and REC_FLEX). The app " +
                  "carries one flex definition, so the union is used.");
  }

  /* --- stigagjof --- */
  const sc = scoringFromSettings(L.scoring_settings);
  warnings.push(...sc.warnings);

  /* `draft.metadata.scoring_type` er ANNAD svid og thau geta rekid i
     sundur. Reglurnar (`scoring_settings.rec`) eru heimildin; hitt er
     merking. Vid THEGJUM ekki um osamraemi. */
  const metaType = D.metadata && D.metadata.scoring_type
    ? String(D.metadata.scoring_type).toLowerCase() : null;
  if (metaType) {
    const asOurs = metaType === "std" ? "standard"
                 : metaType.replace("_", "-").replace("half-ppr", "half-ppr");
    if (["ppr", "half-ppr", "standard"].includes(asOurs) && asOurs !== sc.scoring) {
      warnings.push(`The draft is labelled "${metaType}" but the league scores ` +
                    `${sc.rec} per reception — using the league rules.`);
    }
  }

  /* --- umferdir ---
     MAELT A RAUNVERULEGRI DEILD: `league.settings.draft_rounds` var 3
     thar sem draftid bar 15. Deildar-svidið er ONYTT her. */
  const rounds = num(dset.rounds) ?? num(lset.draft_rounds);

  /* --- thakid og logunin --- */
  const superflex = rp.superflex;
  const draftShape = {
    ...DEFAULT_LEAGUE,
    ...(teams != null ? { teams } : {}),
    ...(starters ? { starters } : {}),
    ...(rp.flexPos ? { flexPos: rp.flexPos } : {}),
    ...(rounds != null ? { rounds } : {}),
    scoring: sc.scoring,
    superflex,
  };
  draftShape.maxPos = maxPosFor(draftShape.starters, superflex);

  const out = normalizeLeague(draftShape);

  /* --- thad sem likanid getur ekki heidrad --- */
  if (D.type && D.type !== "snake" && D.type !== "linear") {
    warnings.push(`This is a ${D.type} draft. The board still prices players, but ` +
                  `pick order and "who is left at your next pick" assume snake order.`);
  }
  if (num(lset.best_ball) === 1) {
    warnings.push("Best ball league — there is no weekly lineup to set, so the " +
                  "My team tab's start/sit advice does not apply.");
  }
  const keepers = num(lset.max_keepers) || 0;
  if (keepers > 0 || L.previous_league_id) {
    warnings.push(
      `This looks like a keeper/dynasty league` +
      (keepers > 0 ? ` (${keepers} keeper${keepers > 1 ? "s" : ""} each)` : "") +
      `. ADP and ECR on the board are redraft numbers, so kept players are ` +
      `priced as if they were still in the pool.`);
  }

  const shapeNote = unmeasuredShape(out, shapes);
  if (shapeNote) warnings.push(shapeNote);

  return {
    league: out,
    imported: {
      leagueId: L.league_id ? String(L.league_id) : null,
      draftId: D.draft_id ? String(D.draft_id) : null,
      name: L.name || null,
      season: L.season || D.season || null,
      status: L.status || null,
      draftStatus: D.status || null,
      draftType: D.type || null,
      teams: out.teams,
      rounds: out.rounds,
      scoring: out.scoring,
      rec: sc.rec,
      exactScoring: sc.exact,
      superflex,
      bench: rp.bench,
      starters: out.starters,
      flexPos: out.flexPos || null,
      orderDrawn: !!(D.draft_order && Object.keys(D.draft_order).length),
    },
    warnings,
  };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
