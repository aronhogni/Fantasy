/* ============================================================
   draft-race.mjs — SEQUENCES, EKKI THREP. OG LOGUN SEM ENGINN PROFADI.

   `draft-live.mjs` keyrir draftid og hann keyrir thad VEL: 150 vol, eitt
   i einu, med fullyrdingum a hverju. `sleeper.mjs` syair eitt augnablik.
   Hvorugur getur sed thad sem thetta safn ver, og ekki af thvi ad thau
   eru of litil heldur af THREMUR BYGGINGARLEGUM astaedum:

   1. HVERT SVAR FRA HERMINUM ER SAMSTUNDIS. `global.fetch` i
      `draft-live.mjs` skilar thegar-uppfylltu `Promise`, svo pollun sem
      er I FLUGI thegar notandinn gerir eitthvad ANNAD er astand sem
      fixturan getur ekki tjad. Raunverulegur Sleeper svarar a 80-300 ms
      medan pollunin spyr a 1.500 ms — svo 5-20% af hverjum smell lendir
      ofan i svar sem er a leidinni. Þad er ekki jaðartilfelli, thad er
      hlutfall.

   2. HVER KAFLI BYRJAR A HREINU BORDI. Kaflarnir 3 (val dregid til
      baka), 4 (sjalfval i burst), 5 (oporad val) og 8 (F5) eru allir
      profadir — hver i sinu lagi, hver a sinu bordi. RODIN theirra er
      ekki profud, og thad er rodin sem byggir upp tolur: `offBoard` er
      SETT i hverri pollun, `lastSync` er MISMUNUR fra sidasta svari, og
      `taken` er hvorugt — hun er summan af theim badum yfir tima.

   3. LOGUN DEILDARINNAR ER SU SAMA I OLLUM PROFUM. `LEAGUE_RESP` i
      `draft-live.mjs` er 10 lid, PPR, K + DEF, 15 umferdir — Patriots.
      Sofahetjur (12 lid, half-PPR, HVORKI K NE DST, 14 umferdir) er
      onnur logun i FJORUM sviðum samtimis og hun er drifin i gegnum
      `computeVbd` i `model.mjs` kafla 8 — en ALDREI i gegnum bordid i
      beinni. `mustFill` telur nakvaemlega thau saeti sem thessi deild
      hefur EKKI, svo hun er eina logunin thar sem "0 saeti" er svarid.

   HVERS VEGNA THETTA ER SER SKRA OG EKKI KAFLI I `draft-live.mjs`:
   hermirinn thar er BYGGDUR a thvi ad svor seu samstundis (kaflarnir
   telja `pollTicks` og bida `settle(40)`); ad setja seinkun i hann
   myndi haegja a ollum 150 volunum. Hér er hermirinn seinkanlegur fra
   fyrstu linu.
   ============================================================ */

import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

/* ---------- jsdom ---------- */
const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>",
  { url: "https://example.test/nfl/", pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(globalThis, "navigator",
  { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.localStorage = dom.window.localStorage;
global.location = dom.window.location;

/* Somu umbudir og `draft-live.mjs`: ADEINS thau tvo gildi sem
   `pollDelay` getur skilad eru stytt, svo ekkert annad i appinu
   flytir ser. */
const { POLL } = await import("../src/draft-sync.js");
const rawSetTimeout = globalThis.setTimeout;
const SCALED = new Map([[POLL.fast, 6], [POLL.slow, 10]]);
const scaledSetTimeout = (fn, ms, ...a) =>
  (SCALED.has(ms) ? rawSetTimeout(fn, SCALED.get(ms), ...a) : rawSetTimeout(fn, ms, ...a));
globalThis.setTimeout = scaledSetTimeout;
dom.window.setTimeout = scaledSetTimeout;

/* ============================================================
   TVAER DEILDIR, TVAER LOGUN — OG THAER ERU BADAR HANS
   ============================================================
   Tolurnar eru lesnar UR `data/measure/half.json`, sem er skrain sem
   `rulebasis.js` bakar toluna sina ur: `10-2flex` og `12-2flex` eru
   nakvaemlega thau tvo logunar-lyklar sem voru maeld. Hardkodud logun
   hér vaeri thridja utgafan af sömu deild — sama villa sem `advice.js`
   skjalar um `rounds` (14 a moti 15).                                */
const MEASURED_SHAPES = JSON.parse(
  readFileSync(path.join(DATA, "measure", "half.json"), "utf8"));
const SHAPE_KEYS = Object.keys(MEASURED_SHAPES.results || {});

const PATRIOTS = {
  key: "10-2flex", name: "Patriots SB champs",
  teams: 10, rounds: 15, rec: 1, scoringType: "ppr",
  leagueId: "1389356308104249344", draftId: "1389356308125192192",
  rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF",
                    "BN", "BN", "BN", "BN", "BN"],
  slots: { slots_qb: 1, slots_rb: 2, slots_wr: 2, slots_te: 1, slots_flex: 2,
           slots_k: 1, slots_def: 1, slots_bn: 5 },
};
/* SOFAHETJUR — HVORKI K NE DST, OG 14 UMFERDIR.
   Þetta er logunin sem `computeVbd`-athugasemdin i `model.js` nefnir
   med nafni ("Sofahetjur: 12 lid, half-PPR, HVORKI K NE DEF") og sem
   `model.mjs` kafli 8 ver — a HREINU falli. Hún hefur aldrei verid
   drifin gegnum bordid i beinni. */
const SOFA = {
  key: "12-2flex", name: "Sofahetjur",
  teams: 12, rounds: 14, rec: 0.5, scoringType: "half_ppr",
  leagueId: "4444444444444444444", draftId: "4444444444444444445",
  rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX",
                    "BN", "BN", "BN", "BN", "BN", "BN"],
  slots: { slots_qb: 1, slots_rb: 2, slots_wr: 2, slots_te: 1, slots_flex: 2,
           slots_bn: 6 },
};
/* MOCK — engin deild, onnur staerd en BADAR deildirnar, svo hvert svid
   sem lekur fra deild i mock (eda milli drafta) se synilegt. */
const MOCK = { name: "mock", teams: 8, rounds: 16, scoringType: "std",
               draftId: "5555555555555555555" };

ok(SHAPE_KEYS.includes(PATRIOTS.key) && SHAPE_KEYS.includes(SOFA.key),
   `bædi logunar-lyklarnir eru i data/measure/half.json (${SHAPE_KEYS.join(", ")})`);

/* ---------- snakk, skrifad upp a nytt (sjalfstaed utfaersla) ---------- */
const slotOfPick = (p, teams) => {
  const round = Math.ceil(p / teams);
  const idx = p - (round - 1) * teams;
  return { round, slot: round % 2 === 1 ? idx : teams - idx + 1 };
};

/* ---------- hopurinn, leiddur ut ur gognunum ---------- */
const players = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
const nameCount = new Map();
for (const p of players) nameCount.set(p.name, (nameCount.get(p.name) || 0) + 1);
const POOL = players
  .filter((p) => ["QB", "RB", "WR", "TE"].includes(p.pos))
  .filter((p) => p.adpSleeper != null && nameCount.get(p.name) === 1)
  .sort((a, b) => a.adpSleeper - b.adpSleeper)
  .slice(0, 260);
if (POOL.length < 200) {
  console.log(`  FAIL hopurinn er of litill (${POOL.length}) — gognin bera ekki profid`);
  process.exit(1);
}
/* Audkenni sem BORDID ThEKKIR EKKI — thau eiga ad lenda i `offBoard`,
   ekki i `taken`. Sleeper ber ~11.400 leikmenn, bordid ~1.130. */
const KNOWN_IDS = new Set(players.map((p) => String(p.id)));
const OFF_IDS = [];
for (let i = 900000; OFF_IDS.length < 6; i++) {
  if (!KNOWN_IDS.has(String(i))) OFF_IDS.push(String(i));
}

/* ============================================================
   HERMIRINN — MED SEINKUN SEM MA STYRA
   ============================================================
   `delay[id]` er millisekundur sem svar fyrir thad draft-audkenni bidur
   adur en thad uppfyllist. Þad er ALLT sem tharf til ad tja "pollun i
   flugi": appid heldur afram, notandinn smellir, og svarid kemur EFTIR.
   `gate` er harda utgafan: svarid bidur thangad til profid sleppir thvi,
   svo enginn timi er giskadur.                                       */
const worlds = new Map();          // draftId -> { draft, picks }
const leagues = new Map();         // leagueId -> { league, users, rosters }
const delay = new Map();           // draftId -> ms
const gate = new Map();            // draftId -> { promise, open }
/* Draft sem BRESTUR eftir ad hlidid er opnad. Til thess ad geta spurt
   hvort VILLAN ur slitnu drafti komist a skjainn — hun fer adra leid en
   gognin (`setPollErr`, ekki `onPicks`) og tharf thvi sina fullyrdingu. */
const throwFor = new Set();        // draftId
let netCalls = 0;

const openGate = (id) => {
  let release;
  const promise = new Promise((r) => { release = r; });
  gate.set(id, { promise, release });
};
const releaseGate = (id) => {
  const g = gate.get(id);
  if (g) { gate.delete(id); g.release(); }
  return !!g;
};

const jsonOk = (v) => ({ ok: true, status: 200, json: async () => v });
const notFound = { ok: false, status: 404, json: async () => null };

const hold = async (id) => {
  const g = gate.get(id);
  if (g) await g.promise;
  const ms = delay.get(id);
  if (ms) await new Promise((r) => rawSetTimeout(r, ms));
  if (throwFor.has(id)) throw new TypeError("Failed to fetch");
};

global.fetch = async (url) => {
  const s = String(url);
  if (s.includes("api.sleeper")) {
    netCalls++;
    if (/\/user\/[^/]+$/.test(s)) {
      const nm = decodeURIComponent(s.split("/").pop());
      return jsonOk({ user_id: nm === "aron" ? "me" : "uX", username: nm });
    }
    /* Deildir notandans. Tomur listi er GILT svar (hann a engar i
       thessum hermi) og hann er thad sem tharf: leidin er notud til ad
       AUDKENNID komist inn, sem er forsenda leidar B. */
    if (/\/user\/[^/]+\/leagues\/nfl\/\d+$/.test(s)) return jsonOk([]);
    if (/\/league\/([^/]+)\/users$/.test(s)) {
      const L = leagues.get(/\/league\/([^/]+)\/users/.exec(s)[1]);
      return L ? jsonOk(L.users) : notFound;
    }
    if (/\/league\/([^/]+)\/rosters$/.test(s)) {
      const L = leagues.get(/\/league\/([^/]+)\/rosters/.exec(s)[1]);
      return L ? jsonOk(L.rosters) : notFound;
    }
    if (/\/drafts$/.test(s)) {
      const m = /\/league\/([^/]+)\/drafts/.exec(s);
      const L = m && leagues.get(m[1]);
      if (!L) return jsonOk([]);
      const w = worlds.get(L.league.draft_id);
      return jsonOk(w ? [w.draft] : []);
    }
    if (/\/league\/[^/]+$/.test(s)) {
      const L = leagues.get(s.split("/").pop());
      return L ? jsonOk(L.league) : notFound;
    }
    if (/\/picks$/.test(s)) {
      const id = /\/draft\/([^/]+)\/picks/.exec(s)[1];
      const w = worlds.get(id);
      if (!w) return notFound;
      await hold(id);
      return jsonOk(w.picks.slice());
    }
    if (/\/draft\//.test(s)) {
      const id = /\/draft\/([^/?]+)/.exec(s)[1];
      const w = worlds.get(id);
      if (!w) return notFound;
      await hold(id);
      return jsonOk({ ...w.draft });
    }
    return jsonOk({});
  }
  const m = s.match(/\/data\/(.+)$/);
  if (!m) return { ok: false, status: 404, json: async () => ({}) };
  try {
    return jsonOk(JSON.parse(readFileSync(path.join(DATA, m[1]), "utf8")));
  } catch { return { ok: false, status: 404, json: async () => ({}) }; }
};

/** Byggir deild + draft i herminum og skilar hjalparhlut. */
function makeWorld(cfg, { mySlot = null, ownerDupe = false } = {}) {
  const users = Array.from({ length: cfg.teams }, (_, i) =>
    ({ user_id: `u${i + 1}`, display_name: `team${i + 1}` }));
  const rosters = Array.from({ length: cfg.teams }, (_, i) =>
    ({ roster_id: i + 1, owner_id: `u${i + 1}` }));
  if (mySlot != null) {
    users[mySlot - 1] = { user_id: "me", display_name: "aron" };
    rosters[mySlot - 1].owner_id = "me";
  }
  /* TVEIR HOPAR A SAMA EIGANDA — heimadeild thar sem einn stjornar
     tveimur lidum. Sleeper leyfir thad og `owner_id` er tha THAD SAMA. */
  if (ownerDupe && mySlot != null) {
    const other = mySlot === cfg.teams ? 1 : cfg.teams;
    rosters[other - 1].owner_id = "me";
  }
  const league = {
    league_id: cfg.leagueId, draft_id: cfg.draftId, name: cfg.name,
    season: "2026", status: "drafting", total_rosters: cfg.teams,
    roster_positions: cfg.rosterPositions,
    settings: { num_teams: cfg.teams, draft_rounds: 3, max_keepers: 1,
                best_ball: 0, type: 0, playoff_teams: 4, playoff_week_start: 15 },
    scoring_settings: { rec: cfg.rec, pass_yd: 0.04, pass_td: 4, pass_int: -1,
                        rush_yd: 0.1, rush_td: 6, rec_yd: 0.1, rec_td: 6,
                        fum_lost: -2, fum: 0 },
  };
  leagues.set(cfg.leagueId, { league, users, rosters });
  const draft = {
    draft_id: cfg.draftId, league_id: cfg.leagueId, status: "drafting",
    type: "snake", season: "2026", draft_order: null,
    slot_to_roster_id: Object.fromEntries(
      Array.from({ length: cfg.teams }, (_, i) => [i + 1, i + 1])),
    metadata: { scoring_type: cfg.scoringType },
    settings: { teams: cfg.teams, rounds: cfg.rounds, ...cfg.slots },
  };
  worlds.set(cfg.draftId, { draft, picks: [] });
  return worlds.get(cfg.draftId);
}

function makeMock(cfg, { mySlot = null } = {}) {
  const draft = {
    draft_id: cfg.draftId, league_id: null, status: "drafting", type: "snake",
    season: "2026",
    draft_order: mySlot != null ? { me: mySlot } : null,
    slot_to_roster_id: Object.fromEntries(
      Array.from({ length: cfg.teams }, (_, i) => [i + 1, i + 1])),
    metadata: { scoring_type: cfg.scoringType },
    settings: { teams: cfg.teams, rounds: cfg.rounds,
                slots_qb: 1, slots_rb: 2, slots_wr: 3, slots_te: 1, slots_flex: 1,
                slots_k: 1, slots_def: 1, slots_bn: 7 },
  };
  worlds.set(cfg.draftId, { draft, picks: [] });
  return worlds.get(cfg.draftId);
}

/** Baetir vali `no` (1-basad) i heiminn `w`, sem hefur `teams`. */
const addPick = (w, cfg, no, player) => {
  const { round, slot } = slotOfPick(no, cfg.teams);
  w.picks.push({
    player_id: String(player.id), picked_by: `u${slot}`, roster_id: slot,
    round, draft_slot: slot, pick_no: no, is_keeper: null,
    metadata: { first_name: player.name.split(" ")[0],
                last_name: player.name.split(" ").slice(1).join(" "),
                position: player.pos, team: player.team || "FA" },
  });
};
/* Val a manni sem BORDID ThEKKIR EKKI. */
const addOffPick = (w, cfg, no, offId) => {
  const { round, slot } = slotOfPick(no, cfg.teams);
  w.picks.push({
    player_id: offId, picked_by: `u${slot}`, roster_id: slot,
    round, draft_slot: slot, pick_no: no, is_keeper: null,
    metadata: { first_name: "Deep", last_name: `Guy${offId}`, position: "WR", team: "FA" },
  });
};

/* ---------- React ---------- */
const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
global.IS_REACT_ACT_ENVIRONMENT = true;
const App = (await import("../src/App.jsx")).default;

const settle = async (ms = 40) => {
  await act(async () => { await new Promise((r) => rawSetTimeout(r, ms)); });
};
const waitFor = async (cond, ms = 5000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (cond()) return true; await settle(12); }
  return cond();
};
const text = () => document.body.textContent || "";
const click = async (el, ms = 60) => {
  if (!el) return false;
  await act(async () => {
    el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  await settle(ms);
  return true;
};
const setInput = async (labelPart, value) => {
  const label = [...document.querySelectorAll("label.field")]
    .find((l) => (l.textContent || "").includes(labelPart));
  const input = label && label.querySelector("input");
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  await settle(40);
  return true;
};
const btn = (re) => [...document.querySelectorAll("button")]
  .find((b) => re.test((b.textContent || "").trim()));
const chip = (re) => [...document.querySelectorAll("button.chip")]
  .find((b) => re.test((b.textContent || "").trim()));

const num = (re) => { const m = re.exec(text()); return m ? Number(m[1]) : null; };
const draftedOnScreen = () => num(/(\d+) drafted/);
const yoursOnScreen = () => num(/(\d+) yours/);
const pickHeader = () => num(/Pick\s*(\d+)\s*[—-]\s*take this/);
const boardNext = () => num(/next pick\s*\(#(\d+)\)/i);
const rosterNames = () => {
  const h = [...document.querySelectorAll(".panel h2")]
    .find((x) => /^My team$/.test((x.textContent || "").trim()));
  if (!h) return [];
  return [...h.parentElement.querySelectorAll("tbody tr td:first-child")]
    .map((td) => (td.textContent || "").trim());
};
const rosterCount = () => {
  const h = [...document.querySelectorAll(".panel h2")]
    .find((x) => /^My team$/.test((x.textContent || "").trim()));
  const sub = h && h.parentElement.querySelector(".sub");
  const m = sub && /(\d+) picks?/.exec(sub.textContent || "");
  return m ? Number(m[1]) : null;
};
const junk = () => {
  const m = /\bNaN\b|\bundefined\b|\[object Object\]/.exec(text());
  return m ? m[0] : null;
};
const connEl = () => document.querySelector("[data-conn]");
const conn = () => { const d = connEl(); return d ? d.getAttribute("data-conn") : null; };
const connText = () => { const d = connEl(); return d ? (d.textContent || "") : ""; };
const boardTable = () => [...document.querySelectorAll("table.data")]
  .find((t) => /Bye/.test(t.querySelector("thead")?.textContent || "")) || null;
/* Spjaldid "Kickers and defences" og radirnar i thvi. Lesarinn er
   SAMEIGINLEGUR kaflunum 2 og 4b viljandi: sami lesari sem finnur 0 i
   annarri deild og >0 i hinni getur ekki verid "lesari sem finnur
   ekkert". Sja notuna vid fullyrdinguna i kafla 2. */
const kdstPanel = () => {
  const h = [...document.querySelectorAll(".panel h2")]
    .find((x) => /Kickers and defences/i.test((x.textContent || "").trim()));
  return h ? h.parentElement : null;
};
/* LISTINN ER **CHIPAR**, EKKI TAFLA. Fyrsta utgafa thessa lesara taldi
   `tbody tr` og fekk thvi 0 i BADUM deildum — svo fullyrdingin "engin
   K/DST i bodi" i kafla 2 stodst af thvi ad lesarinn fann ekkert, ekki
   af thvi ad ekkert var i bodi. Jakvaeda vidmidid i kafla 4b felldi
   hana; an thess hefdi hun verid tom fullyrding i profinu sem var
   skrifad til ad finna tommar fullyrdingar. */
const kdstRowCount = () => {
  const p = kdstPanel();
  if (!p) return 0;
  const list = p.querySelector(".chips");
  return list ? list.querySelectorAll(".chip").length : 0;
};

async function boot() {
  localStorage.clear();
  const root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await settle(500);
  return root;
}
const go = async (value, ms = 220) => {
  const set = await setInput("Sleeper league, draft or username", value);
  if (!set) return false;
  return await click(btn(/^Connect/i), ms);
};

/* ============================================================
   1. POLLUN I FLUGI FRA DRAFTI SEM ER BUID AD SLITA
   ============================================================
   ÞETTA ER ASTAND SEM `draft-live.mjs` GETUR EKKI TJAD: hermirinn thar
   svarar samstundis, svo "svar a leidinni" er ekki til i honum.

   `pull(id)` skrifar FIMM hluti — `setInfo`, `onShape`, `setSync`
   (saetid), `setUnmatched` og `onPicks` — og HVORUGT theirra spyr hvort
   `id` se enn draftid sem er tengt. `stopped`-flaggid i pollunar-
   effectinu er skodad FYRIR og EFTIR `await pull(...)`, ekki INNI i
   henni, svo svar sem er a leidinni thegar notandinn slitur skrifar
   sig inn i bordid sem kom EFTIR.

   Tvo tilfelli, og thau eru ekki sama malid:
     1a. slitid MED "Reset & disconnect" -> ENGIN pollun a eftir, svo
         skrifin eru VARANLEG. Bordid sem var hreinsad fyllist aftur.
     1b. tengt STRAX vid annad draft   -> naesta pollun leidrettir, en
         a medan reiknar bordid snakk-tolur ur DRAFTI SEM ER EKKI TENGT.
   ============================================================ */
console.log("\n1. pollun i flugi fra drafti sem er buid ad slita");
{
  const root = await boot();
  const w = makeWorld(PATRIOTS, { mySlot: 7 });
  for (let i = 1; i <= 24; i++) addPick(w, PATRIOTS, i, POOL[i - 1]);

  await go(`https://sleeper.com/leagues/${PATRIOTS.leagueId}/predraft`);
  await waitFor(() => /rules imported/i.test(text()), 6000);
  await click(chip(/^7\.\s/));
  const gotPicks = await waitFor(() => draftedOnScreen() === 24, 6000);
  ok(gotPicks, `24 vol komin a bordid (${draftedOnScreen()})`);
  ok(yoursOnScreen() >= 2, `og saeti 7 ber sin vol (${yoursOnScreen()} yours)`);

  /* SVARID ER STOPPAD I HLIDI — enginn timi er giskadur. Naesta pollun
     sem fer af stad hangir thangad til profid sleppir henni. */
  openGate(PATRIOTS.draftId);
  await settle(60);                       // pollun fer af stad og hangir

  const resetBtn = btn(/Reset\s*&?\s*disconnect|^Reset/i);
  ok(!!resetBtn, "Reset-hnappurinn er a skjanum");
  await click(resetBtn, 120);
  ok(draftedOnScreen() === 0, `bordid er hreinsad (${draftedOnScreen()} drafted)`);

  /* OG NU KEMUR SVARID FRA DRAFTINU SEM VAR SLITID. */
  releaseGate(PATRIOTS.draftId);
  await settle(400);

  ok(draftedOnScreen() === 0,
     `svar ur slitnu drafti fyllir EKKI bordid aftur (${draftedOnScreen()} drafted)`);
  ok((yoursOnScreen() ?? 0) === 0,
     `og hopurinn er afram tomur (${yoursOnScreen()} yours)`);
  ok(!junk(), `ekkert NaN/undefined (${junk() || "-"})`);

  /* ---- OG VILLAN FER SOMU LEID: ANNAD HLID, ONNUR FULLYRDING ----
     `setPollErr` er skrifad i `catch`, ekki eftir hlidid i `try`, svo
     hun tharf SITT hlid. Rodin hér er nauðsynleg og hun er ekki
     smekkur: pollunin verdur ad vera **I FLUGI** ADUR en slitid er,
     annars er engin sokn til ad bresta og fullyrdingin getur ekki
     brugdist — tom fullyrding, sama gerd og CLAUDE.md 5b lysir.

     Þess vegna er tengt AFTUR fyrst, og fullyrt ad villan KOMIST a
     skjainn i tengdu astandi (sannar ad leidin se lifandi) adur en
     krafist er ad hun geri thad EKKI eftir slit. */
  await go(PATRIOTS.draftId, 300);
  await waitFor(() => draftedOnScreen() === 24, 6000);
  ok(draftedOnScreen() === 24, `endurtengt vid sama draft (${draftedOnScreen()})`);

  throwFor.add(PATRIOTS.draftId);
  await waitFor(() => /Sleeper did not answer/i.test(text()), 4000);
  ok(/Sleeper did not answer/i.test(text()),
     "villa i sokn KEMST a skjainn medan tengt er — leidin er lifandi");
  throwFor.delete(PATRIOTS.draftId);
  await waitFor(() => !/Sleeper did not answer/i.test(text()), 4000);

  /* NU: pollun i flugi sem MUN bresta, og slitid a medan. */
  throwFor.add(PATRIOTS.draftId);
  openGate(PATRIOTS.draftId);
  await settle(60);
  await click(btn(/Reset\s*&?\s*disconnect|^Reset/i), 120);
  releaseGate(PATRIOTS.draftId);
  await settle(400);
  ok(!/Sleeper did not answer/i.test(text()),
     `en bilun i SLITNU drafti skrifar hana ekki ("${
       (/Sleeper did not answer[^·]{0,40}/.exec(text()) || ["-"])[0]}")`);
  ok(draftedOnScreen() === 0, `og bordid er afram tomt (${draftedOnScreen()})`);
  throwFor.delete(PATRIOTS.draftId);
  await act(async () => { root.unmount(); });
}

/* ============================================================
   1b. SAMA SVAR, EN NYTT DRAFT TENGT I STADINN
   ============================================================
   Hér er skadinn annar: bordid er ekki tomt heldur BLANDA. `lastSync`
   er nullstillt i teikningu vid skiptin (`stateScope`), svo mismunar-
   reglan i `onPicks` hefur ENGAN grunn ad fjarlaegja ur — gamla svarid
   er thvi HREINT VIDBOT. Og `onShape` faerir logun gamla draftsins upp
   i `App`, thar sem HVERT VBD-gildi er reiknad ur henni.
   ============================================================ */
console.log("\n1b. svar ur gamla draftinu ofan i thad nyja");
{
  const root = await boot();
  const w = makeWorld(PATRIOTS, { mySlot: 7 });
  for (let i = 1; i <= 30; i++) addPick(w, PATRIOTS, i, POOL[i - 1]);
  const mockW = makeMock(MOCK, { mySlot: 3 });
  for (let i = 1; i <= 4; i++) addPick(mockW, MOCK, i, POOL[120 + i]);

  await go(`https://sleeper.com/leagues/${PATRIOTS.leagueId}/predraft`);
  await waitFor(() => /rules imported/i.test(text()), 6000);
  await click(chip(/^7\.\s/));
  await waitFor(() => draftedOnScreen() === 30, 6000);
  ok(draftedOnScreen() === 30, `30 vol i deildardraftinu (${draftedOnScreen()})`);

  openGate(PATRIOTS.draftId);
  await settle(60);
  await go(MOCK.draftId, 260);
  releaseGate(PATRIOTS.draftId);
  await settle(500);

  /* MOCK-ID BER FJOGUR VOL. Talan a skjanum verdur ad vera thess, ekki
     summa beggja. */
  const drafted = draftedOnScreen();
  ok(drafted === 4, `bordid ber ADEINS vol mock-sins (${drafted}, atti ad vera 4)`);
  ok(pickHeader() === 5, `og valnumerid er 5 (${pickHeader()})`);
  /* LOGUNIN: mock er 8 lid / 16 umferdir. Deildin er 10/15. Linan i
     ljosinu segir hvadan tolurnar koma og hun ma ekki nefna 10. */
  const t = connText();
  ok(/8 teams/.test(t), `ljosid nefnir 8 lid — logun mock-sins ("${t.slice(0, 130)}")`);
  ok(!junk(), `ekkert NaN/undefined (${junk() || "-"})`);
  await act(async () => { root.unmount(); });
}

/* ============================================================
   2. SOFAHETJUR — LOGUN SEM ENGIN FIXTURA HEFUR TJAD
   ============================================================
   12 lid · half-PPR · HVORKI K NE DST · 14 umferdir. Fjogur svid
   samtimis odruvisi en Patriots, og eitt theirra (engin K/DST-saeti) er
   thad sem `mustFill` telur — svo thetta er eina logunin thar sem
   RETTA SVARID er "engin saeti ad fylla".

   `model.mjs` kafli 8 ver `computeVbd` a hreinu falli i thessari logun.
   Hér er hun drifin gegnum BORDID: ljosid, valnumerid, radgjofina og
   K/DST-tofluna.
   ============================================================ */
console.log("\n2. Sofahetjur i beinni — 12 lid, half-PPR, engin K/DST, 14 umferdir");
{
  const root = await boot();
  const w = makeWorld(SOFA, { mySlot: 5 });
  const TOTAL = SOFA.teams * SOFA.rounds;      // 168
  for (let i = 1; i <= 40; i++) addPick(w, SOFA, i, POOL[i - 1]);

  await go(`https://sleeper.com/leagues/${SOFA.leagueId}/predraft`);
  await waitFor(() => /rules imported/i.test(text()), 6000);
  await click(chip(/^5\.\s/));
  await waitFor(() => draftedOnScreen() === 40, 6000);

  ok(conn() === "good", `ljosid er graent (${conn()})`);
  ok(draftedOnScreen() === 40, `40 vol (${draftedOnScreen()})`);
  ok(pickHeader() === 41, `valnumerid er 41 (${pickHeader()})`);
  /* Saeti 5 i 12-lida snakki: vol 5, 20, 29, 44, ... Naesta eftir 41 er 44. */
  ok(boardNext() === 44, `naesta eigid val er 44 (${boardNext()})`);
  const body = text();
  /* ENGIN K/DST-BRADANAUÐSYN MA KVIKNA — deildin hefur engin thau saeti.
     Þetta er fullyrdingin sem adeins ThESSI logun getur brotid. */
  ok(!/still need K/i.test(body) && !/still need DST/i.test(body)
     && !/need K and DST/i.test(body),
     "radgjofin nefnir HVORKI K NE DST — deildin hefur engin thau saeti");
  /* ============================================================
     ENGINN SPYRNUMADUR NE VORN MA VERA I BODI — TALIN, EKKI GISKAD
     ============================================================
     `model.mjs` kafli 8 ver ad `vbd` theirra se `null` i thessari logun
     (stada an byrjunarsaetis hefur engan varamann). Hér er sama regla
     lesin AF SKJANUM: taflan "Kickers and defences" er su leid sem
     urskurdurinn tekur thegar `mustFill` kviknar, svo tom tafla er
     forsenda thess ad hann geti ekki radlagt mann i saeti sem er ekki til.

     FYRSTA UTGAFAN AF ThESSARI FULLYRDINGU VAR TVILRAEDA OG STOD ALLTAF:
     `!head || rows === 0 || rows > 0` er satt fyrir hvad sem er. Þad er
     nakvaemlega tomma fullyrdingin sem CLAUDE.md 5b lysir, i profinu sem
     var skrifad til ad finna thaer. Krafan er nu HORD (`=== 0`) og
     jakvaeda vidmidid er i kafla 4b, thar sem SAMA lesari verdur ad
     finna radir i Patriots-deildinni — annars gaeti "0 radir" thytt
     "lesarinn finnur ekkert" i stad "ekkert er i bodi".              */
  ok(kdstRowCount() === 0,
     `engin K/DST i bodi i deild an theirra saeta (${kdstRowCount()} radir)`);
  /* HVER K OG DST A BORDINU VERDUR AD BERA `—`, EKKI TOLU. Þad er
     invariantid ur `model.mjs` kafla 8, lesid AF SKJANUM i staðinn. */
  const tbl = boardTable();
  const topPos = tbl
    ? [...tbl.querySelectorAll("tbody tr")].slice(0, 20)
        .map((tr) => (tr.textContent || "").match(/\b(QB|RB|WR|TE|K|DST)\b/))
        .map((m) => (m ? m[1] : null))
    : [];
  ok(topPos.length > 0 && !topPos.includes("K") && !topPos.includes("DST"),
     `enginn K/DST i topp 20 a bordinu (${[...new Set(topPos)].join(",")})`);
  ok(/half-PPR/i.test(body), "reglurnar segja half-PPR");
  ok(!junk(), `ekkert NaN/undefined (${junk() || "-"})`);

  /* ---- OG DRAFTID KLARAST: 168 vol, svo valnumer 169 er ekki val ---- */
  const rest = [];
  for (let i = 41; i <= TOTAL; i++) rest.push(i);
  /* Hopurinn er 260 menn; 168 vol thurfa 168 einkvaem audkenni. */
  for (const i of rest) addPick(w, SOFA, i, POOL[(i - 1) % POOL.length]);
  /* Endurtekin audkenni eru sied ut i `pull` (eitt audkenni = eitt val),
     svo taflan telur einkvaem. Prófid spyr thvi um ThAKID, ekki tolu. */
  await settle(400);
  await waitFor(() => /Draft complete/i.test(text()), 6000);
  const done = /Draft complete/i.test(text());
  ok(done, "draftid klarast og kassinn segir 'Draft complete'");
  ok(!/take this/i.test(text()) || !done,
     "og 'take this' er ekki lengur a skjanum");
  ok(/168 picks/.test(text()) || /All 168/.test(text()),
     `thakid er 168 vol, ekki 12x15 ("${(/All (\d+) picks/.exec(text()) || [])[1]}")`);
  ok(!junk(), `ekkert NaN/undefined eftir ad draftid klaradist (${junk() || "-"})`);
  await act(async () => { root.unmount(); });
}

/* ============================================================
   3. TVEIR HOPAR A SAMA EIGANDA — SAETID MA EKKI VERA GISKAD
   ============================================================
   `resolveSeat` ber regluna berum ordum um leid B (volin):
   "AMBIGUOUS -> ENGIN PORUN. Beri tvo vol MITT audkenni i sitthvoru
   saeti er svarid `null`, ekki 'fyrsta'."

   Leid C (deildin) fer ADRA leid: `teamsFromLeague(...).find(...)` — og
   `find` skilar FYRSTA saetinu thegjandi. Heimadeild thar sem einn
   stjornar tveimur lidum ber TVO `rosters` med SAMA `owner_id`, sem er
   nakvaemlega thad inntak. Utkoman er saeti sem lítur truverdugt ut og
   ber hop annars manns undir heitinu "My team" — sama villa sem
   `keptSlot` var skrifad gegn.
   ============================================================ */
console.log("\n3. tveir hopar a sama eiganda — engin thogul agiskun");
{
  const { resolveSeat, teamsFromLeague } = await import("../src/sleeper-league.js");
  const draft = { draft_id: "D", settings: { teams: 10 },
    slot_to_roster_id: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, i + 1])) };
  const users = [{ user_id: "me", display_name: "aron" },
                 { user_id: "u2", display_name: "b" }];
  const rosters = Array.from({ length: 10 }, (_, i) => ({ roster_id: i + 1, owner_id: `u${i + 1}` }));
  rosters[2].owner_id = "me";        // saeti 3
  rosters[7].owner_id = "me";        // saeti 8 — SAMI eigandi

  const both = teamsFromLeague({ draft, users, rosters }).filter((t) => t.userId === "me");
  ok(both.length === 2, `deildin ber TVO saeti a sama eiganda (${both.map((t) => t.slot).join(", ")})`);

  const r = resolveSeat({ draft, users, rosters, userId: "me" });
  ok(r.slot === null,
     `saetid er OThEKKT, ekki "fyrsta" (fekk ${r.slot}, route ${r.route})`);
  ok(r.route === null, "og engin heimild er nefnd fyrir tolu sem er ekki til");
  ok(typeof r.why === "string" && /two|2|both|more than one|different/i.test(r.why),
     `og skyringin nefnir ad thau seu tvo ("${r.why}")`);

  /* OG EIN HOPUR A SAMA EIGANDA VERDUR AFRAM AD LESAST — annars vaeri
     lagfaeringin ad slokkva a leid C fyrir alla. */
  const one = Array.from({ length: 10 }, (_, i) => ({ roster_id: i + 1, owner_id: `u${i + 1}` }));
  one[2].owner_id = "me";
  const r2 = resolveSeat({ draft, users, rosters: one, userId: "me" });
  ok(r2.slot === 3 && r2.route === "league",
     `einn hopur les afram rett (${r2.slot}, ${r2.route})`);

  /* VOLIN VINNA AFRAM: beri hann tvo hopa EN volin eitt saeti er thad
     svarid — sonnunargagn slaer stillingu. */
  const r3 = resolveSeat({ draft, users, rosters,
    picks: [{ picked_by: "me", draft_slot: 8 }], userId: "me" });
  ok(r3.slot === 8 && r3.route === "picks",
     `og vol yfirskrifa tvibendni deildarinnar (${r3.slot}, ${r3.route})`);

  /* ============================================================
     SAETI SEM ER GILT I DEILDINNI EN EKKI I DRAFTINU
     ============================================================
     `fits()` er EINA skordan sem gildir um allar thrjar leidirnar og
     hun er borin vid `draft.settings.teams`. Deildin getur verid staerri
     en draftid — 12-lida deild sem heldur 8-lida draft er raunverulegt
     Sleeper-astand — og tha er saeti 11 tala sem deildin ber en draftid
     hefur ekki. Þogul 11 hér gefur `slotOk === false` i bordinu, sem
     LITUR EINS UT og "vid vitum ekki saetið" en er annad mal.

     Þetta er borid HER thvi leid C var skrifud upp (`.find` -> filter) og
     `fits` faerdist inn i filterinn — ny leid ad sömu skordu tharf sina
     eigin fullyrdingu, annars gaeti hun horfid thegjandi.             */
  const d8 = { draft_id: "D", settings: { teams: 8 },
    slot_to_roster_id: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, i + 1])) };
  const u12 = Array.from({ length: 12 }, (_, i) => ({ user_id: `u${i + 1}`, display_name: `t${i + 1}` }));
  const r12 = Array.from({ length: 12 }, (_, i) => ({ roster_id: i + 1, owner_id: `u${i + 1}` }));
  const r4 = resolveSeat({ draft: d8, users: u12, rosters: r12, userId: "u11" });
  ok(r4.slot === null && r4.route === null,
     `leid C: saeti 11 i 8-lida drafti er EKKI saeti (${r4.slot}, ${r4.route})`);
  /* OG SAETI SEM PASSAR I BADAR LES AFRAM — annars vaeri skordan sia
     sem slokkti a leid C i staerdar-mismun i heild. */
  const r5 = resolveSeat({ draft: d8, users: u12, rosters: r12, userId: "u3" });
  ok(r5.slot === 3 && r5.route === "league",
     `en saeti 3 les afram (${r5.slot}, ${r5.route})`);

  /* SAMA SKORDA A HVERRI LEID — OG HUN VAR OPROFUD A THEIM TVEIMUR
     STERKUSTU. `fits` er skrifud THRISVAR i `resolveSeat` (leid B i
     filter, leid A i `if`, leid C i filter) og athugasemdin thar segir ad
     hun se "EINA skordan sem gildir um allar leidirnar". Þrjar utfaerslur
     af einni reglu geta rekid i sundur, svo hver theirra tharf sina
     fullyrdingu — annars getur ein horfid an ad nokkud falli.

     Þetta er ekki fraedilegt: leid B er SONNUNARGAGN og yfirskrifar
     saeti sem er slegid inn i hendi, svo `draft_slot` ur skemmdu svari
     er su leid sem kemst LENGST inn i appid. */
  const dB = { draft_id: "D", settings: { teams: 10 } };
  const rB = resolveSeat({ draft: dB, picks: [{ picked_by: "me", draft_slot: 13 }], userId: "me" });
  ok(rB.slot === null && rB.route === null,
     `leid B: val a saeti 13 i 10-lida drafti er EKKI saeti (${rB.slot}, ${rB.route})`);
  const rA = resolveSeat({ draft: { ...dB, draft_order: { me: 13 } }, userId: "me" });
  ok(rA.slot === null && rA.route === null,
     `leid A: draft_order sem segir 13 i 10-lida drafti er EKKI saeti (${rA.slot}, ${rA.route})`);
  /* OG BADAR LESA AFRAM INNAN MARKA — svo skordan se sia, ekki lokun. */
  const rB2 = resolveSeat({ draft: dB, picks: [{ picked_by: "me", draft_slot: 9 }], userId: "me" });
  const rA2 = resolveSeat({ draft: { ...dB, draft_order: { me: 9 } }, userId: "me" });
  ok(rB2.slot === 9 && rA2.slot === 9,
     `og saeti 9 les afram a BADUM (${rB2.slot}, ${rA2.slot})`);
}

/* ============================================================
   4. RODIN SJALF — RETRACTION, BURST, OPORAD VAL, F5, ENDURTENGING
   ============================================================
   Hver thessara er profadur i `draft-live.mjs`, hver a sinu hreina
   bordi. Hér koma their ALLIR i rod a SAMA bordi, thvi tolurnar sem
   thau hreyfa eru KUMULATIF: `taken` er summa, `offBoard` er SETT i
   hverri pollun, og `lastSync` er MISMUNUR. Þrenna sem er rett i
   hverju threpi getur samt rekid saman.

   INVARIANTID ER EITT OG ThAD ER LESID AF SKJANUM VID HVERT THREP:
     valnumer a skjanum  ==  einkvaem vol i herminum + 1
     "yours"             ==  vol saetis mins sem bordid thekkir
   ============================================================ */
console.log("\n4. retraction -> burst -> oporad val -> F5 -> endurtenging, i rod");
{
  let root = await boot();
  const w = makeWorld(PATRIOTS, { mySlot: 7 });
  const MYSLOT = 7;
  const uniq = () => new Set(w.picks.map((p) => String(p.player_id))).size;
  const knownOf = () => w.picks.filter((p) => KNOWN_IDS.has(String(p.player_id)));
  const mineKnown = () => new Set(knownOf().filter((p) => p.draft_slot === MYSLOT)
    .map((p) => String(p.player_id))).size;

  for (let i = 1; i <= 14; i++) addPick(w, PATRIOTS, i, POOL[i - 1]);
  await go(`https://sleeper.com/leagues/${PATRIOTS.leagueId}/predraft`);
  await waitFor(() => /rules imported/i.test(text()), 6000);
  await click(chip(/^7\.\s/));
  await waitFor(() => draftedOnScreen() === 14, 6000);

  /* ---- 4b. JAKVAEDA VIDMIDID FYRIR K/DST-LESARANN ----
     Kafli 2 krefst `=== 0` i deild an theirra saeta. Þessi lina sannar
     ad SAMI lesari finnur radir thegar thaer eru til — an hennar gaeti
     "0 radir" thytt "lesarinn er brotinn" og fullyrdingin thar vaeri
     tom (CLAUDE.md 5b, regla 2: neikvaed fullyrding verdur ad nefna
     eitthvad sem var SANNANLEGA tharna). */
  ok(kdstRowCount() > 0,
     `Patriots ber K/DST i sinni toflu — sami lesari (${kdstRowCount()} radir)`);

  const step = async (label) => {
    await settle(160);
    await waitFor(() => pickHeader() === uniq() + 1, 3000);
    ok(pickHeader() === uniq() + 1,
       `${label}: valnumer ${pickHeader()} == einkvaem vol ${uniq()} + 1`);
    ok(yoursOnScreen() === mineKnown(),
       `${label}: "yours" ${yoursOnScreen()} == min thekkt vol ${mineKnown()}`);
    ok(!junk(), `${label}: ekkert NaN/undefined (${junk() || "-"})`);
  };
  await step("upphaf");

  /* (a) VAL DREGID TIL BAKA — og thad er MITT val (14 er saeti 7 i
     annarri umferd: 20-14+1 = 7). */
  const retracted = w.picks.pop();
  ok(retracted.draft_slot === MYSLOT, `valid sem er dregid til baka var mitt (saeti ${retracted.draft_slot})`);
  await step("eftir retraction");

  /* (b) SJALFVAL I BURST — atta vol i einu polli, thar af tvo min. */
  for (let i = 14; i <= 21; i++) addPick(w, PATRIOTS, i, POOL[i - 1]);
  await step("eftir burst (8 vol)");

  /* (c) OPORAD VAL — mitt, svo bædi `offBoard` og `offBoardMine`. */
  addOffPick(w, PATRIOTS, 22, OFF_IDS[0]);
  addOffPick(w, PATRIOTS, 23, OFF_IDS[1]);
  await settle(200);
  ok(/not on this board/i.test(text()) || /2 picks/.test(text()),
     "oporud vol eru SOGD, ekki thogul");
  await step("eftir tvo oporud vol");

  /* (d) VAL DREGID TIL BAKA A MEDAN OPORUD VOL STANDA — samsetning sem
     hvorugur kaflinn i `draft-live.mjs` ber. `offBoard` er SETT en
     `taken` er MISMUNUR, svo thau tvo hreyfast i sitthvora att i sama
     polli. */
  w.picks = w.picks.filter((p) => p.pick_no !== 20 && p.pick_no !== 21);
  await step("retraction MEDAN oporud vol standa");

  /* (e) F5 — sidan endurhladin i midju drafti. */
  await act(async () => { root.unmount(); });
  const root2 = createRoot(document.getElementById("root"));
  await act(async () => { root2.render(React.createElement(App)); });
  await settle(500);
  root = root2;
  ok(conn() === "bad", `eftir F5 er ljosid raut — engin pollun sem enginn bad um (${conn()})`);
  const restoredDrafted = draftedOnScreen();
  ok(restoredDrafted != null && restoredDrafted > 0,
     `bordid er endurheimt ur vafranum (${restoredDrafted} drafted)`);

  /* (f) ENDURTENGING VID SAMA DRAFT — og fjogur ny vol komu a medan. */
  for (let i = 20; i <= 23; i++) {
    if (!w.picks.some((p) => p.pick_no === i)) addPick(w, PATRIOTS, i, POOL[i + 40]);
  }
  await go(PATRIOTS.draftId, 300);
  await waitFor(() => conn() === "good", 6000);
  ok(conn() === "good", `endurtengt (${conn()})`);
  await step("eftir endurtengingu");
  await act(async () => { root.unmount(); });
}

/* ============================================================
   5. RODIN DREGIN EFTIR AD SMELLT VAR A LIDID
   ============================================================
   ÞETTA ER SETNING SEM APPID SKRIFAR SJALFT A SKJAINN, undir
   saetaspjoldunum, thegar `draft_order` er ekki dregid:

     "The draft order has not been drawn on Sleeper yet, so these are
      roster slots. They become the pick order once it is drawn, and the
      app re-reads it while syncing."

   Fullyrdingin er thvi ekki min heldur appsins, og hun var OSONN:
   spjalda-smellurinn setur `slotRoute = "league"` og pollunar-hlidid
   hleypti ENGRI stillingu ad saeti sem var thegar sett. Draftid mátti
   draga hvad sem var — appid las thad ekki.

   FIXTURAN SEM VANTADI: hvert draft i `draft-live.mjs` ber
   `slot_to_roster_id` sem er SAMA VORPUN og `draft_order` (bædi
   samsemd), svo profin gefa theim tveimur ALDREI olik svor. Þad er sama
   gerd og "hvert prof gaf SOMU logun a deild og draft" — fixturan
   kodadi forsenduna sem var villan.
   ============================================================ */
console.log("\n5. rodin dregin EFTIR ad smellt var a lidid — appid verdur ad lesa hana");
{
  const root = await boot();
  /* `slot_to_roster_id` er samsemd, svo deildin setur mig i saeti 7.
     RODIN, thegar hun er dregin, setur mig i saeti 2. */
  const w = makeWorld(PATRIOTS, { mySlot: 7 });
  w.draft.status = "pre_draft";
  w.draft.draft_order = null;

  await go(`https://sleeper.com/leagues/${PATRIOTS.leagueId}/predraft`);
  await waitFor(() => /rules imported/i.test(text()), 6000);
  /* Fullyrdingin sem profid ber er a skjanum — annars vaeri thetta prof
     um setningu sem er ekki thar (CLAUDE.md 5b, regla 2). */
  ok(/draft order has not been drawn/i.test(text()),
     "appid segir sjalft ad rodin se ekki dregin og ad hun verdi lesin");
  await click(chip(/^7\.\s/));
  await settle(200);
  ok(/read from the league roster/i.test(text()),
     "saetid kemur ur deildar-hopnum eftir smellinn");

  /* OG NU ER RODIN DREGIN — i ANNAD saeti en deildin gaf. */
  w.draft.draft_order = { me: 2 };
  w.draft.status = "drafting";
  const moved = await waitFor(() => /read from the draft order/i.test(text()), 6000);
  ok(moved, "appid les rodina og segir hvadan talan kom");
  const seatShown = /You are [^,]*,?\s*slot\s*(\d+)/i.exec(text())
    || /slot\s*(\d+)/i.exec(text());
  ok(chip(/^2\.\s/) && /chip on/.test(chip(/^2\.\s/).className),
     `og spjaldid sem er valid er saeti 2 (${
       [...document.querySelectorAll("button.chip.on")]
         .map((b) => (b.textContent || "").trim()).join(" | ") || "ekkert"})`);
  ok(!junk(), `ekkert NaN/undefined (${junk() || "-"})`);
  await act(async () => { root.unmount(); });
}

/* ============================================================
   5b. OG INNSLEGID SAETI ER AFRAM OSNERT
   ============================================================
   Lagfaeringin i kafla 5 ma ekki verda "stilling slaer notandann".
   Reglan sem stendur: `draft_order` fyllir tomt saeti og leidrettir
   saeti sem APPID leiddi ut — en tolu sem notandinn slo inn mega
   ADEINS raunveruleg vol hnekkja.
   ============================================================ */
console.log("\n5b. innslegid saeti stendur — adeins vol mega hnekkja thvi");
{
  const root = await boot();
  /* AUDKENNID FYRST — an thess getur leid B (volin) ekki kviknad og
     sidasta fullyrdingin i thessum kafla vaeri TOM. Þetta er lika sa
     vegur sem notandinn fer i mock-i: hann ber ekkert nema nafnid sitt.
     `sleeperResolve("aron")` gefur 404 a badar leidir, svo nafna-leidin
     er reynd — nakvaemlega hegdunin sem `connect` skjalar. */
  await go("aron", 260);
  const gotUser = /No leagues for aron|league.? found for aron/i.test(text());
  ok(gotUser, `notandanafnid komst inn ("${(/(No leagues[^.]*\.|\d+ leagues? found[^.]*\.)/
    .exec(text()) || ["-"])[0]}")`);

  /* Mock ber engin saetaspjold, svo tolu-reiturinn er i bodi. Rodin er
     ekki dregin til ad byrja med. */
  const m = makeMock({ ...MOCK, draftId: "6666666666666666666" }, { mySlot: null });
  await go("6666666666666666666", 260);
  await waitFor(() => conn() === "good", 6000);
  const typed = await setInput("Your slot", "5");
  ok(typed, "tolu-reiturinn er i bodi i mock-i");
  await settle(200);

  /* Rodin dregin i ANNAD saeti. Innslattur er svar notandans. */
  m.draft.draft_order = { me: 3 };
  await settle(400);
  const field = [...document.querySelectorAll("label.field")]
    .find((l) => /Your slot/.test(l.textContent || ""));
  const val = field && field.querySelector("input").value;
  ok(String(val) === "5",
     `innslegid saeti 5 stendur thott rodin segi 3 (reiturinn ber "${val}")`);
  ok(!/read from the draft order/i.test(text()),
     "og skjarinn heldur ekki fram ad talan komi ur rodinni");

  /* EN VAL SEM ER SKRAD A MIG HNEKKIR THVI — leid B er sonnunargagn. */
  const { round, slot } = slotOfPick(3, MOCK.teams);
  m.picks.push({ player_id: String(POOL[2].id), picked_by: "me", roster_id: 3,
    round, draft_slot: 3, pick_no: 3, is_keeper: null,
    metadata: { first_name: POOL[2].name.split(" ")[0],
                last_name: POOL[2].name.split(" ").slice(1).join(" "),
                position: POOL[2].pos, team: POOL[2].team || "FA" } });
  const fixed = await waitFor(() => /read from your own picks/i.test(text()), 6000);
  ok(fixed, "en eigid val hnekkir innslaettinum og thad er SAGT");
  ok(!junk(), `ekkert NaN/undefined (${junk() || "-"})`);
  await act(async () => { root.unmount(); });
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
