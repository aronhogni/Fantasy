/* ============================================================
   draft-live.mjs — DRAFTID KEYRT, EKKI LJOSMYNDAD.

   Oll onnur prof a Sleeper-tengingunni (`sleeper.mjs`) syna EITT
   AUGNABLIK: hermt svar er fryst, appid tengist, og fullyrt er um thad
   sem sest. Thad er nytsamlegt og thad er EKKI thad sem gerist 21.
   agust. Thar tinast 150 vol inn, eitt i einu, i 90 minutur — og
   villurnar sem kosta drafthaeftid eru thaer sem BYGGJAST UPP: tala
   sem skeikar um eitt og skeikar sidan afram, mengi sem gleymir aldrei,
   fingrafar sem sest ekki upp a nytt.

   Þess vegna KEYRIR thetta safn draft. 10 lid, 15 umferdir, 150 vol,
   snakk, gegnum RAUNVERULEGA `DraftBoard` med Sleeper-endapunkti sem
   faerist fram val fyrir val. Vid hvert einasta val er spurt:

     · er valnumerid a skjanum rett?
     · er saeta-/umferda-vorpunin rett (snakk snyr vid i jofnum)?
     · segja BORDID og RADGJAFARKASSINN somu tolu um naesta val?
     · hverfa their sem eru farnir — og koma their aldrei aftur?
     · lenda MIN vol i minum hop?
     · segir liturinn thad sama og prosentan sem hann er dreginn af?
     · og hvergi NaN/undefined/[object Object]

   HRADINN ER SKALADUR, EKKI ÞEKJAN. `pollDelay` skilar 1500/5000 ms;
   150 vol vaeru thvi >4 minutur af hreinni bid. Profid skiptir UT
   `setTimeout` fyrir umbudir sem stytta NAKVAEMLEGA thessar tvaer tolur
   (`POLL.fast`/`POLL.slow`, lesnar ur `draft-sync.js`) og laetur allar
   adrar bidir oshaggadar. Ekkert val er sleppt: oll 150 fara i gegn.
   Dyru fullyrdingarnar (litur gegn tolu yfir allar rodir) eru keyrdar a
   10. hverju vali og thad er SAGT hér fremur en falid.
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

/* ============================================================
   POLLUNAR-BIDIN ER STYTT — OG ADEINS HUN
   ============================================================
   Umbudirnar sla adeins a NAKVAEMLEGA thau tvo gildi sem `pollDelay`
   getur skilad. Almenn skolun ("allt yfir 1000 ms verdur 10") vaeri
   hin utgafan af thessu og hun er verri: hun gaeti bædi flytt React-
   timaseljara og falið raunverulega bid sem appid tekur. Her getur
   ekkert annad en pollunin breyst.                                  */
const { POLL } = await import("../src/draft-sync.js");
const rawSetTimeout = globalThis.setTimeout;
const SCALED = new Map([[POLL.fast, 6], [POLL.slow, 10]]);
let pollTicks = 0;
const scaledSetTimeout = (fn, ms, ...a) => {
  if (SCALED.has(ms)) { pollTicks++; return rawSetTimeout(fn, SCALED.get(ms), ...a); }
  return rawSetTimeout(fn, ms, ...a);
};
globalThis.setTimeout = scaledSetTimeout;
dom.window.setTimeout = scaledSetTimeout;

/* ---------- deildin sem er draftad i ---------- */
const TEAMS = 10, ROUNDS = 15, MY_SLOT = 7, TOTAL = TEAMS * ROUNDS;
const LEAGUE_ID = "1389356308104249344";
const DRAFT_ID = "1389356308125192192";

/* Snakk-vorpunin, skrifud UPP A NYTT hér og ekki flutt inn ur
   `advice.js`. Vaeri hun flutt inn vaeri profid ad bera fallid vid sjalft
   sig: bædi appid og profid myndu skeika eins og fullyrdingin gaeti ekki
   brugdist. Sjalfstaed utfaersla er thad sem gerir hana ad profi. */
const slotOfPick = (p) => {
  const round = Math.ceil(p / TEAMS);
  const idx = p - (round - 1) * TEAMS;
  return { round, slot: round % 2 === 1 ? idx : TEAMS - idx + 1 };
};
/* Naesta val SAETIS `MY_SLOT` eftir valnumer `cur`, innan RAUNVERULEGRA
   umferda. `null` thydir "thu att ekkert val eftir" og thad er svar. */
const myNextPick = (cur) => {
  for (let p = cur + 1; p <= TOTAL; p++) {
    const { slot } = slotOfPick(p);
    if (slot === MY_SLOT) return p;
  }
  return null;
};

/* ---------- draft-hopurinn, LEIDDUR UT UR GOGNUNUM ----------
   `players.json` er endurskrifud daglega af pipeline-inu, svo hvert
   harðkodað nafn og hver ADP-haed tala er sprungin adur en hun er
   committud. Hopurinn er thvi valinn UR SKRANNI vid keyrslu: their sem
   bordid raðar (QB/RB/WR/TE med ADP), i ADP-rod, og adeins their sem
   bera EINKVAEMT nafn — annars gaeti "hann hvarf af bordinu" fallid a
   nafna, ekki a villu.                                              */
const players = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
const nameCount = new Map();
for (const p of players) nameCount.set(p.name, (nameCount.get(p.name) || 0) + 1);
const POOL = players
  .filter((p) => ["QB", "RB", "WR", "TE"].includes(p.pos))
  .filter((p) => p.adpSleeper != null && nameCount.get(p.name) === 1)
  .sort((a, b) => a.adpSleeper - b.adpSleeper)
  .slice(0, TOTAL + 40);
if (POOL.length < TOTAL + 10) {
  console.log(`  FAIL hopurinn er of litill (${POOL.length}) — gognin bera ekki profid`);
  process.exit(1);
}

/* ---------- hermdur Sleeper ---------- */
const LEAGUE_RESP = {
  league_id: LEAGUE_ID, draft_id: DRAFT_ID, name: "Patriots SB champs",
  season: "2026", status: "drafting", total_rosters: TEAMS,
  roster_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF",
                     "BN", "BN", "BN", "BN", "BN"],
  settings: { num_teams: TEAMS, draft_rounds: 3, max_keepers: 1, best_ball: 0 },
  scoring_settings: { rec: 1, pass_yd: 0.04, pass_td: 4, pass_int: -1, rush_yd: 0.1,
                      rush_td: 6, rec_yd: 0.1, rec_td: 6, fum_lost: -2 },
};
const LEAGUE_USERS = Array.from({ length: TEAMS }, (_, i) =>
  ({ user_id: `u${i + 1}`, display_name: `team${i + 1}` }));
const LEAGUE_ROSTERS = Array.from({ length: TEAMS }, (_, i) =>
  ({ roster_id: i + 1, owner_id: `u${i + 1}` }));

const mkDraft = (over) => ({
  draft_id: DRAFT_ID, league_id: LEAGUE_ID, status: "drafting", type: "snake",
  season: "2026", draft_order: null,
  slot_to_roster_id: Object.fromEntries(
    Array.from({ length: TEAMS }, (_, i) => [i + 1, i + 1])),
  metadata: { scoring_type: "ppr" },
  settings: { teams: TEAMS, rounds: ROUNDS, slots_flex: 2 },
  ...over,
});

/* ONNUR DEILD — vidsjarverdlega odruvisi (14 lid, half-ppr) svo hvert
   svid sem lekur milli theirra se synilegt. Hennar draft ber ENGIN vol. */
const LEAGUE_B_ID = "2222222222222222222";
const LEAGUE_B_DRAFT_ID = "2222222222222222223";
const LEAGUE_B = {
  league_id: LEAGUE_B_ID, draft_id: LEAGUE_B_DRAFT_ID, name: "Deildin B",
  season: "2026", status: "pre_draft", total_rosters: 14,
  roster_positions: ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX",
                     "BN", "BN", "BN", "BN"],
  settings: { num_teams: 14, draft_rounds: 12, type: 0, best_ball: 0 },
  scoring_settings: { rec: 0.5, pass_yd: 0.04, pass_td: 4, pass_int: -1,
                      rush_yd: 0.1, rush_td: 6, rec_yd: 0.1, rec_td: 6, fum_lost: -2 },
};
const LEAGUE_B_DRAFT = {
  draft_id: LEAGUE_B_DRAFT_ID, league_id: LEAGUE_B_ID, status: "pre_draft",
  type: "snake", season: "2026", draft_order: null,
  slot_to_roster_id: { 1: 1, 2: 2, 3: 3 },
  metadata: { scoring_type: "half_ppr" },
  settings: { teams: 14, rounds: 12 },
};

/* ============================================================
   MOCK-DRAFT — BER ENGA `league_id`, OG THAD ER ALLT
   ============================================================
   Sleeper skilar mock-drafti AN deildar. `connect` flytur thvi ENGAR
   reglur inn — adeins draft-audkennid og saetid — og deildin i appinu
   stendur afram a thvi sem var valid. Þad er nakvaemlega leidin sem
   notandinn fór 17.8.2026: 10-lida mock ofan a 12-lida deild.

   `draft_order` er sett svo saetid RADIST (mock ber enga lista af
   lidum, svo saeta-smellurinn i `connectAndSync` er ekki i bodi).    */
const MOCK_DRAFT_ID = "3333333333333333333";
const MOCK_DRAFT = {
  draft_id: MOCK_DRAFT_ID, league_id: null, status: "drafting", type: "snake",
  season: "2026", draft_order: { u7: MY_SLOT },
  slot_to_roster_id: Object.fromEntries(
    Array.from({ length: TEAMS }, (_, i) => [i + 1, i + 1])),
  metadata: { scoring_type: "ppr" },
  settings: { teams: TEAMS, rounds: ROUNDS },
};

/* Lifandi astand hermda draftsins. Profid faerir thad afram. */
const live = { draft: mkDraft(), picks: [], mode: "ok", secondDraft: null };

const mkPick = (no, player) => {
  const { round, slot } = slotOfPick(no);
  return {
    player_id: String(player.id), picked_by: `u${slot}`, roster_id: slot,
    round, draft_slot: slot, pick_no: no, is_keeper: null,
    metadata: { first_name: player.name.split(" ")[0],
                last_name: player.name.split(" ").slice(1).join(" "),
                position: player.pos, team: player.team || "FA" },
  };
};

/* ============================================================
   AUDKENNI SEM HERMIRINN THEKKIR — OG **BARA** THAU
   ============================================================
   Þetta var skilyrt vid `live.strictIds` og sjalfgefid fell hermirinn i
   `live.draft` fyrir HVADA audkenni sem var. Thad var thaegilegt og thad
   var lygi — og lygin vard bindandi um leid og reiturinn tok vid
   notandanafni: `sleeperResolve("team7")` reynir `/league/team7` (404) og
   sidan `/draft/team7`, sem hermirinn svaradi med gildu drafti. Þa var
   nafna-varaleidin ALDREI reynd og kaflarnir 6/6b/16 tengdu sig vid allt
   annad draft en their aetla.

   Raunverulegur Sleeper skilar 404 a audkenni sem er ekki til. Nu gerir
   hermirinn thad lika, alltaf. `strictIds`-flaggid er thar med onauðsyn-
   legt og farid.                                                     */
const knownDraftId = (id) => id === live.draft.draft_id
  || id === LEAGUE_B_DRAFT_ID || id === MOCK_DRAFT_ID
  || !!(live.secondDraft && id === live.secondDraft.draft.draft_id);

const calls = [];
global.fetch = async (url) => {
  const s = String(url);
  if (s.includes("api.sleeper")) {
    calls.push(s);
    if (live.mode === "net") throw new TypeError("Failed to fetch");
    if (live.mode === "500") return { ok: false, status: 500, json: async () => ({}) };
    if (live.mode === "rusl") {
      return { ok: true, status: 200,
               json: async () => { throw new SyntaxError("Unexpected token < in JSON"); } };
    }
    /* Notandanafn -> audkenni. `team7` VERDUR ad gefa `u7`, annars vaeri
       profid ad para saeti vid mann sem a thad ekki. */
    if (/\/user\/[^/]+$/.test(s)) {
      const nm = decodeURIComponent(s.split("/").pop());
      const found = LEAGUE_USERS.find((u) => u.display_name === nm);
      return jsonOk({ user_id: found ? found.user_id : "uX", username: nm });
    }
    if (/\/league\/[^/]+\/users$/.test(s)) return jsonOk(LEAGUE_USERS);
    if (/\/league\/[^/]+\/rosters$/.test(s)) return jsonOk(LEAGUE_ROSTERS);
    if (/\/drafts$/.test(s)) {
      return jsonOk([s.includes(LEAGUE_B_ID) ? LEAGUE_B_DRAFT : live.draft]);
    }
    if (/\/league\/[^/]+$/.test(s)) {
      if (s.endsWith(`/league/${LEAGUE_ID}`)) return jsonOk(LEAGUE_RESP);
      if (s.endsWith(`/league/${LEAGUE_B_ID}`)) return jsonOk(LEAGUE_B);
      return { ok: false, status: 404, json: async () => null };
    }
    /* VOLIN ERU LYKLUD A DRAFT-AUDKENNI. Hermir sem skilar sama lista
       fyrir hvada draft sem er lygur um leid og tvo draft eru til — og
       thad var nakvaemlega gildran sem fannst i `sleeper.mjs` kafla 2f. */
    if (/\/picks(\?|$)/.test(s)) {
      const id = /\/draft\/([^/]+)\/picks/.exec(s)[1];
      /* OTHEKKT AUDKENNI SVARAR 404 — sja notuna vid `knownDraftId`. */
      if (!knownDraftId(id)) {
        return { ok: false, status: 404, json: async () => null };
      }
      if (id === LEAGUE_B_DRAFT_ID) return jsonOk([]);
      if (live.secondDraft && id === live.secondDraft.draft.draft_id) {
        return jsonOk(live.secondDraft.picks.slice());
      }
      return jsonOk(live.picks.slice());
    }
    if (/\/draft\//.test(s)) {
      const id = /\/draft\/([^/?]+)/.exec(s)[1];
      if (!knownDraftId(id)) {
        return { ok: false, status: 404, json: async () => null };
      }
      if (id === LEAGUE_B_DRAFT_ID) return jsonOk(LEAGUE_B_DRAFT);
      if (id === MOCK_DRAFT_ID) return jsonOk(MOCK_DRAFT);
      if (live.secondDraft && id === live.secondDraft.draft.draft_id) {
        return jsonOk(live.secondDraft.draft);
      }
      return jsonOk(live.draft);
    }
    return jsonOk({});
  }
  const m = s.match(/\/data\/(.+)$/);
  if (!m) return { ok: false, status: 404, json: async () => ({}) };
  try {
    return jsonOk(JSON.parse(readFileSync(path.join(DATA, m[1]), "utf8")));
  } catch { return { ok: false, status: 404, json: async () => ({}) }; }
};
const jsonOk = (v) => ({ ok: true, status: 200, json: async () => v });

/* ---------- React ---------- */
const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
global.IS_REACT_ACT_ENVIRONMENT = true;
const App = (await import("../src/App.jsx")).default;

const settle = async (ms = 40) => {
  await act(async () => { await new Promise((r) => rawSetTimeout(r, ms)); });
};
const waitFor = async (cond, ms = 4000) => {
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

/* ---------- lesarar a skjainn ---------- */
const num = (re) => { const m = re.exec(text()); return m ? Number(m[1]) : null; };
const draftedOnScreen = () => num(/(\d+) drafted/);
const yoursOnScreen = () => num(/(\d+) yours/);
const pickHeader = () => num(/Pick\s*(\d+)\s*[—-]\s*take this/);
const boxNext = () => {
  const m = /Your next pick is\s*(\d+),\s*(\d+) picks? away/.exec(text());
  return m ? { next: Number(m[1]), wait: Number(m[2]) } : null;
};
const boardNext = () => num(/next pick\s*\(#(\d+)\)/i);
/* Hop-talan er LESIN UR SINU SPJALDI, ekki ur `body.textContent`. Fyrsta
   utgafan leitadi ad `/(\d+) picks? ·/` i ollum textanum og hitti a
   allt annad — "5 picks · " kemur lika fyrir annars stadar. Prof sem
   les ranga tolu er verra en ekkert: thad sendir mann af stad ad leita
   ad villu sem er ekki til. */
const rosterCount = () => {
  const h = [...document.querySelectorAll(".panel h2")]
    .find((x) => /^My team$/.test((x.textContent || "").trim()));
  const sub = h && h.parentElement.querySelector(".sub");
  const m = sub && /(\d+) picks?/.exec(sub.textContent || "");
  return m ? Number(m[1]) : null;
};
/* BORDID, EKKI HVAÐA TAFLA SEM ER. `NextPick` teiknar SINA `table.data`
   (rokstudningurinn, fimm radir) og hun kemur FYRR i DOM-inu. Fyrsta
   utgafan las `document.querySelectorAll("table.data ...")` og fekk thvi
   radir ur badum — sem thydir ad "smelltu a take i rod 4" smellti a rod
   sem hefur engan hnapp, og fullyrdingin las eins og villa i appinu.
   Bordid er su tafla sem ber `Bye`-dalkinn. */
const boardTable = () => [...document.querySelectorAll("table.data")]
  .find((t) => /Bye/.test(t.querySelector("thead")?.textContent || "")) || null;
const boardRows = () => [...(boardTable()?.querySelectorAll("tbody tr") || [])];
const boardNames = () => boardRows()
  .map((tr) => (tr.querySelector("td.frozen")?.textContent || "")
    .replace(/\s*(R|Out|IR|Q|D|PUP|Sus|NA)$/, "").trim());
/* `\b` er NAUDSYNLEG: `textContent` limir saman texta an bila, svo
   "MUN"+"a"+"NEW" ber undirstrenginn "NaN". Sja CLAUDE.md 5b — su
   gildra felldi fimm sofn i hinu verkefninu. */
const junk = () => {
  const t = text();
  const m = /\bNaN\b|\bundefined\b|\[object Object\]/.exec(t);
  return m ? m[0] : null;
};

/* ============================================================
   HANDVIRK YFIRTAKA — FORSENDA ThESS AD SKRA I HENDI I SAMSTILLINGU
   ============================================================
   Fra 21.8.2026 eru `mine`/`gone` FALDIR medan pollunin skrifar sjalf
   (kafli 22): notandinn bad um ad thurfa ekki ad haka. Kaflar sem skra
   val I HENDI ofan a Sleeper-volin verda thvi ad kveikja a yfirtokunni
   fyrst.

   REGLAN SEM ThEIR VERJA ER OHREYFD — "handvirkt val lifir pollun og
   Sleeper getur ekki tekid thad til baka" — og hun er ekki minna verd
   fyrir thad ad leidin ad henni er einn smellur i vidbot. Þad sem MA
   EKKI gerast er ad kaflinn verdi thogull: `click(null)` skilar `false`
   an athugasemdar, svo hver kallstadur FULLYRDIR ad hnappurinn se
   thar (`ok(!!btn)`) i stad thess ad smella ut i loftid og falla seinna
   af astaedu sem les eins og onnur villa.                            */
const enableManual = async () => {
  const b = [...document.querySelectorAll("button.chip")]
    .find((x) => /^manual entry$/.test((x.textContent || "").trim()));
  if (b) await click(b, 150);
  return !!b;
};

/* ============================================================
   EIN LEID INN — LIMA I REITINN, YTTA A CONNECT
   ============================================================
   Spjaldid bar sex styringar og hvert prof valdi ser thaegilegasta
   (sum slogu i "Draft ID", sum limdu i slodar-reitinn, sum ytu a "Start
   live sync"). Nu er EIN leid, og hver kafli sem notar `go()` er thvi
   lika fullyrding um ad hun EIN nægi.                                */
const go = async (value, ms = 200) => {
  const set = await setInput("Sleeper league, draft or username", value);
  if (!set) return false;
  return await click(btn(/^Connect/i), ms);
};
/* Ljosid er lesid ur SINU EIGIN SVIDI — `textContent` limir "…Sleeper
   draft" og "Connected" saman i "draftConnected", svo `\bConnected\b`
   a body-textanum fellur a rettum koda (CLAUDE.md 5b). */
const connEl = () => document.querySelector("[data-conn]");
const conn = () => { const d = connEl(); return d ? d.getAttribute("data-conn") : null; };
const connText = () => { const d = connEl(); return d ? (d.textContent || "") : ""; };

/* ---------- uppsetning ---------- */
async function boot() {
  localStorage.clear();
  const root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await settle(500);
  return root;
}

/** Limir inn deildarslod og velur saeti. Samstillingin kviknar MED
    Connect — `start` er thvi ekki lengur til: einn smellur gerir allt.
    Sja `liveScope` i `App.jsx`. */
async function connectAndSync({ slot = MY_SLOT } = {}) {
  await go(`https://sleeper.com/leagues/${LEAGUE_ID}/predraft`);
  await waitFor(() => /rules imported/i.test(text()), 5000);
  if (slot != null) {
    const chip = [...document.querySelectorAll("button.chip")]
      .find((b) => new RegExp(`^${slot}\\.\\s`).test((b.textContent || "").trim()));
    await click(chip);
  }
}

/** Baetir vali `n` (1-basad) vid hermda draftid. */
const pushPick = (n) => { live.picks.push(mkPick(n, POOL[n - 1])); };

/* ============================================================
   1. HEILT DRAFT — 150 VOL, EITT I EINU
   ============================================================ */
console.log("\n1. heilt 10x15 snakk-draft keyrt i gegn");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();

  ok(pickHeader() === 1, `bordid byrjar a vali 1 (fann ${pickHeader()})`);

  const gone = new Set();          // nofn sem eru sannanlega farin
  const mineNames = new Set();
  let mismatchPick = 0, mismatchNext = 0, mismatchBoardBox = 0,
      reappeared = 0, junkSeen = null, junkAt = 0,
      rosterWrong = 0, colourWrong = 0, colourChecked = 0,
      snakeWrong = 0, myPickMissed = 0, lastPickWrong = 0, lastPickSeen = 0;

  for (let n = 1; n <= TOTAL; n++) {
    const player = POOL[n - 1];
    const { round, slot } = slotOfPick(n);
    /* Sjalfstaed vorpun borin vid thad sem hermirinn setti i svarid —
       ef thau tvo skildu vaeri profid ad maela sinn eigin hermi. */
    pushPick(n);
    if (live.picks[n - 1].round !== round || live.picks[n - 1].draft_slot !== slot) snakeWrong++;
    if (slot === MY_SLOT) mineNames.add(player.name);

    const got = await waitFor(() => draftedOnScreen() === n, 4000);
    if (!got) { ok(false, `val ${n}: bordid tok ekki vid valinu (${draftedOnScreen()}/${n})`); break; }

    /* (a) valnumerid — og eftir sidasta val er RETT SVAR ad hann se
       enginn: "Pick 151 — take this" i 150 vala drafti er fullyrding
       um akvordun sem er ekki til. */
    if (n + 1 > TOTAL) {
      if (!/Draft complete/.test(text())) { if (!mismatchPick) console.log(`       val ${n}: segir ekki "Draft complete"`); mismatchPick++; }
    } else if (pickHeader() !== n + 1) {
      if (!mismatchPick) console.log(`       val ${n}: haus ${pickHeader()}, atti ad vera ${n + 1}`);
      mismatchPick++;
    }

    /* (b) naesta val mitt — BORDID og KASSINN verda ad segja thad sama.
       `exp === null` thydir "eg a ekkert val eftir" og THA ma engin tala
       standa: gamla utgafan (rounds + 2) skrifadi thar val nr. 154 i
       150 vala drafti. Fullyrdingin er thvi tviskipt og BADIR helmingar
       geta brugdist. */
    const exp = myNextPick(n + 1);
    const bn = boardNext(), bx = boxNext();
    if (exp != null) {
      if (!bx || bx.next !== exp) {
        if (!mismatchNext) console.log(`       val ${n}: kassinn segir ${bx ? bx.next : "ekkert"}, rett er ${exp}`);
        mismatchNext++;
      } else if (bx.wait !== exp - (n + 1)) mismatchNext++;
      if (bn != null && bx && bn !== bx.next) mismatchBoardBox++;
    } else {
      lastPickSeen++;
      if (bx) { if (!lastPickWrong) console.log(`       val ${n}: lofar vali ${bx.next} thott ekkert se eftir`); lastPickWrong++; }
      else if (!/last pick|Draft complete/i.test(text())) lastPickWrong++;
    }

    /* (c) sa sem var tekinn hverfur — og kemur aldrei aftur */
    gone.add(player.name);
    const shown = new Set(boardNames());
    for (const g of gone) if (shown.has(g)) { reappeared++; break; }

    /* (d) min vol lenda i minum hop */
    if (rosterCount() !== mineNames.size) {
      if (!rosterWrong) console.log(`       val ${n}: hopur ${rosterCount()}, atti ad vera ${mineNames.size}`);
      rosterWrong++;
    }
    if (slot === MY_SLOT && yoursOnScreen() !== mineNames.size) myPickMissed++;

    /* (e) ekkert rusl a skjanum */
    if (!junkSeen) { const j = junk(); if (j) { junkSeen = j; junkAt = n; } }

    /* (f) DYRA FULLYRDINGIN — a 10. hverju vali, og thad er SAGT.
       Liturinn er dreginn af `survivalProb`; talan er i `title`. Se
       threpunum snuid vid, eda se litud rod med annarri tolu en hun
       ber, sest thad hér og hvergi annars stadar. */
    if (n % 10 === 0) {
      colourChecked++;
      for (const tr of boardRows()) {
        const td = tr.querySelector("td.frozen");
        const title = td && td.getAttribute("title");
        const m = title && /(\d+)% likely to last/.exec(title);
        const cls = tr.className;
        if (!m) { if (/reach-(hi|lo)/.test(cls)) colourWrong++; continue; }
        const p = Number(m[1]);
        if (/reach-hi/.test(cls) && p < 80) colourWrong++;
        else if (/reach-lo/.test(cls) && p >= 40) colourWrong++;
        else if (!/reach-(hi|lo)/.test(cls) && (p >= 80 || p < 40)) colourWrong++;
      }
    }
  }

  ok(draftedOnScreen() === TOTAL, `oll ${TOTAL} volin komust a bordid (${draftedOnScreen()})`);
  /* ÞEKJA ER FULLYRDING: hafi lokakaflinn aldrei verid heimsottur er
     "engin rong tala i lokin" tom fullyrding. Sidasta val saetis 7 er
     nr. 147, svo volin 147-150 eiga OLL ad falla i thennan flokk. */
  ok(lastPickSeen === TOTAL - 145,
    `sidustu ${TOTAL - 145} volin voru raunverulega skodud sem "ekkert val eftir" (${lastPickSeen})`);
  ok(lastPickWrong === 0,
    `og engin tala er lofad thegar ekkert val er eftir (${lastPickWrong} rong)`);
  ok(snakeWrong === 0, `snakk-vorpun hermisins stemmir vid sjalfstaeda utfaerslu (${snakeWrong} frávik)`);
  ok(mismatchPick === 0, `valnumerid a skjanum er rett i ollum ${TOTAL} volum (${mismatchPick} rong)`);
  ok(mismatchNext === 0, `"naesta val mitt" er rett i ollum volum (${mismatchNext} rong)`);
  ok(mismatchBoardBox === 0, `bordid og radgjafarkassinn segja SOMU tolu (${mismatchBoardBox} osamhljoda)`);
  ok(reappeared === 0, `enginn drafteður leikmadur birtist aftur (${reappeared} skipti)`);
  ok(rosterWrong === 0, `minn hopur telur rett i ollum volum (${rosterWrong} rong)`);
  ok(myPickMissed === 0, `hvert eigid val skilar ser samstundis (${myPickMissed} tind)`);
  ok(!junkSeen, `ekkert NaN/undefined/[object Object] i 150 volum${junkSeen ? ` — "${junkSeen}" vid val ${junkAt}` : ""}`);
  ok(colourChecked === Math.floor(TOTAL / 10),
    `litur-gegn-tolu skodad ${colourChecked} sinnum (a 10. hverju vali)`);
  ok(colourWrong === 0, `liturinn segir thad sama og prosentan (${colourWrong} rodir osatt)`);
  ok(yoursOnScreen() === ROUNDS, `eg endadi med ${ROUNDS} vol (fann ${yoursOnScreen()})`);

  /* ---- draftid er BUID: hegdar appid ser skynsamlega? ---- */
  live.draft = mkDraft({ status: "complete" });
  await waitFor(() => /status\s*complete|complete/.test(text()), 2000);
  const t = text();
  ok(!/\bNaN\b|Something broke/.test(t), "vid val 150+ stendur appid");
  ok(draftedOnScreen() === TOTAL, `og telur enn ${TOTAL} (ekki 151)`);
  ok(/Draft complete/.test(t), "kassinn segir ad draftid se buid");
  ok(!/take this/.test(t), "og hann segir EKKI \"take this\" thegar ekkert er eftir");
  ok(!boxNext(), `og lofar ENGU vali eftir ${TOTAL} (kassinn: ${boxNext() ? boxNext().next : "ekkert"})`);
  root.unmount();
}

/* ============================================================
   2. SLEEPER BRESTUR I MIDJU DRAFTI — OG KEMUR AFTUR
   ============================================================ */
console.log("\n2. 500 / timeout / rusl i midju drafti, og batnar");
for (const mode of ["500", "net", "rusl"]) {
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 12; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 12, 4000);
  const before = draftedOnScreen();

  live.mode = mode;
  for (let n = 13; n <= 20; n++) pushPick(n);          // vol berast medan allt er bilad
  await settle(180);
  const during = draftedOnScreen();
  ok(during === before, `${mode}: bordid heldur ${before} volum medan bilad er (fann ${during})`);
  ok(!/\bNaN\b|Something broke/.test(text()), `${mode}: engin NaN, engin villuvorn`);

  live.mode = "ok";
  const back = await waitFor(() => draftedOnScreen() === 20, 4000);
  ok(back, `${mode}: og nær ollum 20 volunum thegar Sleeper kemur aftur (${draftedOnScreen()})`);
  ok(pickHeader() === 21, `${mode}: valnumerid er rett eftir batann (${pickHeader()})`);
  root.unmount();
}

/* ============================================================
   3. VAL ER DREGID TIL BAKA — LISTINN STYTTIST
   ============================================================
   Umsjonarmadur getur eytt vali (rangur madur, botur sem for af stad,
   endurtekid val). Tha SKREPPUR listinn saman hja Sleeper. Bordid ma
   ekki halda manninum — hvorki a listanum yfir farna ne i valnumerinu,
   sem myndi thá skeika um eitt ALLT SEM EFTIR ER AF DRAFTINU.        */
console.log("\n3. val dregid til baka");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 20; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 20, 4000);
  ok(pickHeader() === 21, `20 vol komin, bordid a vali 21 (${pickHeader()})`);

  const dropped = POOL[19];                   // val nr. 20
  live.picks = live.picks.slice(0, 19);
  const shrank = await waitFor(() => draftedOnScreen() === 19, 4000);
  ok(shrank, `bordid fylgir Sleeper nidur i 19 (fann ${draftedOnScreen()})`);
  ok(pickHeader() === 20, `og valnumerid fer aftur i 20 (fann ${pickHeader()})`);
  await waitFor(() => boardNames().includes(dropped.name), 1500);
  ok(boardNames().includes(dropped.name),
    `og ${dropped.name} er LAUS aftur a bordinu`);

  /* Og handvirkt val ma EKKI hverfa i somu adgerd — thad er ekki
     Sleeper-megin og enginn dro thad til baka. */
  /* Yfirtakan FYRST — hun endurteiknar rodina, svo hun ma ekki koma
     eftir ad `manualRow` er tekid. Sja `enableManual`. */
  ok(await enableManual(), "yfirtoku-hnappurinn er thar (skraning i hendi er möguleg)");
  const manualRow = boardRows()[3];
  const takeBtn = manualRow.querySelector("button");
  const manualName = manualRow.querySelector("td.frozen").textContent.trim();
  ok(!!takeBtn, "og rodin ber hnapp til ad skra i hendi");
  await click(takeBtn);
  const withManual = draftedOnScreen();
  live.picks = live.picks.slice(0, 18);
  await waitFor(() => draftedOnScreen() === withManual - 1, 4000);
  ok(draftedOnScreen() === withManual - 1,
    `annad afturkall taldi rett (${draftedOnScreen()} af ${withManual - 1})`);
  ok(!boardNames().includes(manualName),
    `og handvirka valid (${manualName}) lifdi afturkallid`);
  root.unmount();
}

/* ============================================================
   4. SJALFVAL SPRINGUR — 8 VOL MILLI TVEGGJA POLLANA
   ============================================================ */
console.log("\n4. atta vol i einum polli (sjalfval)");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 10; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 10, 4000);
  /* Saeti 7 a val 14 — thad er INNI i sprengingunni, svo prófid ser
     lika hvort eigid val ratar i hopinn thegar thad kemur i hop.
     Val 7 (umferd 1) var thegar komid, svo talan a ad fara i TVO. */
  for (let n = 11; n <= 18; n++) pushPick(n);
  const got = await waitFor(() => draftedOnScreen() === 18, 4000);
  ok(got, `atta vol i einu skiluðu ser oll (${draftedOnScreen()})`);
  ok(pickHeader() === 19, `valnumerid stokk rett i 19 (${pickHeader()})`);
  ok(yoursOnScreen() === 2, `og eigid val (nr. 14) rataði i hopinn (${yoursOnScreen()})`);
  ok(rosterCount() === 2, `og hopurinn syair thad (${rosterCount()})`);

  /* ------------------------------------------------------------
     VOL UR ROD
     ------------------------------------------------------------
     Sleeper skilar fylki; rodin er ekki lofud og botar sem skila inn
     samtimis geta lent i hvada rod sem er. Valnumerid ma thvi ALDREI
     vera `max(pick_no)` — thad er TALNING, og talning er ohad rod.
     Prófad med thvi ad skila 19-27 i vidsnuinni rod.               */
  const scrambled = [27, 22, 19, 25, 21, 26, 20, 24, 23];
  for (const n of scrambled) live.picks.push(mkPick(n, POOL[n - 1]));
  const inOrder = await waitFor(() => draftedOnScreen() === 27, 4000);
  ok(inOrder, `niu vol i vidsnuinni rod skila ser oll (${draftedOnScreen()})`);
  ok(pickHeader() === 28, `og valnumerid er 28, ohað rodinni (${pickHeader()})`);
  ok(yoursOnScreen() === 3, `og val nr. 27 (mitt) rataði i hopinn (${yoursOnScreen()})`);
  root.unmount();
}

/* ============================================================
   5. VAL A MANNI SEM ER EKKI A BORDINU
   ============================================================
   `taken.size` eitt taldi thau EKKI, svo valnumerid skeikadi. `offBoard`
   er til vegna thess. Profad er a TOLUNNI, ekki a thvi ad textinn
   birtist.                                                          */
console.log("\n5. oporad val heldur valnumerinu rettu");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 8; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 8, 4000);
  /* FIMM vol a leikmonnum sem eru EKKI i `players.json`. Fimm, ekki
     thrju, og thad er ekki tilviljun: med thremur er `myNextPick(12)`
     og `myNextPick(9)` BADIR 14, svo fullyrdingin um naesta val gaeti
     ekki brugdist. Med fimm er rett svar 27 og rangt svar 14. */
  const UNK = ["99990001", "99990002", "99990003", "99990004", "99990005"];
  for (const [i, id] of UNK.entries()) {
    const { round, slot } = slotOfPick(9 + i);
    live.picks.push({ player_id: id, picked_by: `u${slot}`, roster_id: slot,
      round, draft_slot: slot, pick_no: 9 + i, is_keeper: null,
      metadata: { first_name: "Deep", last_name: `Guy${i}`, position: "RB", team: "SF" } });
  }
  await waitFor(() => /not on this board/i.test(text()), 4000);
  ok(/5 picks are not on this board/i.test(text()),
    "fimm oporud vol eru TALIN og sogd");
  ok(draftedOnScreen() === 8, `bordid strikar ut atta (${draftedOnScreen()})`);
  ok(pickHeader() === 14, `en valnumerid er 14 — 8 + 5 + 1 (fann ${pickHeader()})`);
  const exp = myNextPick(14), wrong = myNextPick(9);
  ok(exp !== wrong, `forsendan: rett (${exp}) og rangt (${wrong}) svar eru ADGREINANLEG`);
  ok(boxNext() && boxNext().next === exp,
    `og naesta eigid val reiknast af RETTA valnumerinu (${boxNext() ? boxNext().next : "?"} = ${exp})`);

  /* ------------------------------------------------------------
     TVITEKID OPORAD VAL — HER BITUR TVITEKNINGIN, EKKI A BORDINU
     ------------------------------------------------------------
     Tvitekin rod a leikmanni SEM BORDID THEKKIR kostar ekkert:
     `taken` er mengi og telur hann einu sinni. Tvitekin rod a manni
     sem bordid thekkir EKKI fer hins vegar i gegnum `unknown++`, sem
     er hrein talning — og hun taldi tha tvo. Fyrsta utgafa thessa
     kafla profadi ranga helminginn og stokkbreytingin slapp.        */
  live.picks.push({ ...live.picks[live.picks.length - 1], pick_no: 99 });
  await settle(200);
  ok(/5 picks are not on this board/i.test(text()),
    "tvitekin oporud rod telst EINU sinni");
  ok(pickHeader() === 14, `og valnumerid stendur i 14, ekki 15 (${pickHeader()})`);

  /* ============================================================
     OG ThEGAR LOGUNIN ER SU SAMA MA RETTINGIN EKKI STANDA ThAR
     ============================================================
     Neikvaeda hlidin a kafla 16d. Deildin hér er 10 lid, PPR, TVO FLEX
     og draftid er hennar eigid — sama logun, svo "this shape" ER
     deildarinnar og engin retting er a stad. Kassi sem er ALLTAF a
     skjanum segir ekkert, og su neikvaeda fullyrding er einskis virdi
     nema 16d syni ad hann GETI birst (CLAUDE.md 5b regla 2).        */
  const flat5 = () => text().replace(/\s+/g, " ");
  ok(/rules imported/.test(flat5()),
    "ThEKJA: reglurnar eru fluttar inn (kassinn er a skjanum)");
  ok(/over ADP across a season/.test(flat5()),
    "og maelda setningin lika (annars er fullyrdingin nedan tom)");
  ok(!/is the draft.s, not the league.s/.test(flat5()),
    "en ENGIN retting — logun draftsins og deildarinnar er sú sama");
  root.unmount();
}

/* ============================================================
   6. `draft_order` ER NULL OG BIRTIST I MIDJU DRAFTI
   ============================================================ */
console.log("\n6. draft_order birtist i midjum draftinu");
{
  /* MOCK-DRAFT (`league_id: null`) — thad er tilfellid thar sem saetid
     GETUR ekki komid annars stadar fra: engin deild, engir `rosters`,
     svo hvorki lidsheiti ne `slot_to_roster_id` bjarga ther. Eina
     leidin er `draft_order`, og Sleeper dregur hana eftir a. */
  const MOCK_ID = "7777666655554444";
  live.picks = []; live.mode = "ok"; live.secondDraft = null;
  live.draft = { ...mkDraft({ draft_order: null }),
                 draft_id: MOCK_ID, league_id: null, slot_to_roster_id: null };
  const root = await boot();
  /* Notandanafnid FYRST — `user_id` er forsenda thess ad rodin lesist
     thegar hun kemur. */
  /* BADIR GEGNUM SAMA REIT. Nafnid finnur hvorki deild ne draft, svo
     `connect` fer i nafna-varaleidina; audkennid finnur draft. Ein leid,
     tvenns konar inntak. */
  await go("team7", 150);
  await go(MOCK_ID, 250);
  for (let n = 1; n <= 6; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 6, 4000);
  const slotBefore = [...document.querySelectorAll("label.field")]
    .find((l) => /Your slot/i.test(l.textContent || ""))?.querySelector("input").value;
  ok(slotBefore === "", `saetid er tomt medan rodin er odregin ("${slotBefore}")`);
  ok(yoursOnScreen() === 0, "og enginn er merktur minn");

  /* Sleeper dregur rodina — MIDJUM POLLI. */
  live.draft = { ...live.draft, draft_order: { u7: MY_SLOT } };
  for (let n = 7; n <= 14; n++) pushPick(n);
  const drew = await waitFor(() => {
    const v = [...document.querySelectorAll("label.field")]
      .find((l) => /Your slot/i.test(l.textContent || ""))?.querySelector("input").value;
    return Number(v) === MY_SLOT;
  }, 5000);
  ok(drew, "saetid lest sjalfkrafa thegar rodin er dregin i midju drafti");
  await waitFor(() => draftedOnScreen() === 14, 4000);
  ok(yoursOnScreen() === 2,
    `og BADI fyrri vol saetisins (nr. 7 og 14) rata i hopinn eftir a (${yoursOnScreen()})`);
  root.unmount();
}

/* ============================================================
   6b. NOTANDANAFNID SLEGID INN EFTIR AD SAMSTILLING ER HAFIN
   ============================================================
   Sama villu-aett og felldi `onPicks` upphaflega: pollunin lifir i
   lokun sem var buin til vid EINA teikningu. `pull` les `userId` — en
   `userId` var EKKI i deps effectsins, svo lykkjan helt afram med
   `userId = null` ur theirri teikningu sem var thegar kveikt var a
   samstillingu. Notandi sem tengist FYRST og slaer nafnid inn A EFTIR
   (sem er nakvaemlega rodin sem vidmotid bydur: reiturinn stendur vid
   hlidina a "Connect") fekk aldrei saetið sitt lesid.

   Kafli 6 sest EKKI thessa villu og thad er lærdomurinn: thar er
   nafnid slegið inn A UNDAN, svo lokunin er tha thegar rett. Stokk-
   breytingin (`userId` ut ur deps) SLAPP i gegnum hann.             */
console.log("\n6b. notandanafn slegid inn EFTIR ad samstilling hofst");
{
  const MOCK_ID = "7777666655554444";
  live.picks = []; live.mode = "ok"; live.secondDraft = null;
  live.draft = { ...mkDraft({ draft_order: { u7: MY_SLOT } }),
                 draft_id: MOCK_ID, league_id: null, slot_to_roster_id: null };
  const root = await boot();
  await go(MOCK_ID, 250);
  for (let n = 1; n <= 14; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 14, 4000);
  const slotVal = () => [...document.querySelectorAll("label.field")]
    .find((l) => /Your slot/i.test(l.textContent || ""))?.querySelector("input").value;
  ok(slotVal() === "", `saetid er tomt medan appid veit ekki hver eg er ("${slotVal()}")`);
  ok(yoursOnScreen() === 0, "og enginn er merktur minn");

  /* NUNA slaer hann inn nafnid — medan pollunin er i gangi. Sami reitur,
     annad inntak: nafna-varaleidin ma EKKI slita tengingunni sem er i
     gangi (hun setur `userId`, ekki `draftId`), og thad er einmitt thad
     sem thessi kafli maelir. */
  await go("team7", 200);
  const read = await waitFor(() => Number(slotVal()) === MY_SLOT, 5000);
  ok(read, `saetid lest ur draft_order thott nafnid komi A EFTIR (fann "${slotVal()}")`);
  await waitFor(() => yoursOnScreen() === 2, 4000);
  ok(yoursOnScreen() === 2, `og bædi vol saetisins rata i hopinn (${yoursOnScreen()})`);
  root.unmount();
}

/* ============================================================
   7. RANGT SAETI VALID OG SIDAN LEIDRETT
   ============================================================
   Notandi sem smellir a rangt lid og leidrettir thad ma EKKI sitja
   uppi med hop hins mannsins. `myPicks` var SAMMENGI, svo gomlu volin
   sátu eftir og radgjofin taldi hop sem hann a ekki.                */
console.log("\n7. rangt saeti leidrett");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync({ slot: 3 });
  for (let n = 1; n <= 20; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 20, 4000);
  const wrong = yoursOnScreen();
  ok(wrong === 2, `saeti 3 gefur ${wrong} eigin vol (a ad vera 2)`);

  const chip = [...document.querySelectorAll("button.chip")]
    .find((b) => new RegExp(`^${MY_SLOT}\\.\\s`).test((b.textContent || "").trim()));
  await click(chip, 200);
  await waitFor(() => yoursOnScreen() === 2 && rosterCount() === 2, 4000);
  ok(yoursOnScreen() === 2,
    `eftir leidrettingu i saeti ${MY_SLOT} eru THAU TVO min, ekki fjogur (${yoursOnScreen()})`);
  const names = [...document.querySelectorAll(".panel h2")]
    .find((h) => /My team/.test(h.textContent));
  ok(!!names, "hop-spjaldid er a sinum stad");
  ok(rosterCount() === 2, `og hopurinn ber tvo (${rosterCount()})`);
  root.unmount();
}

/* ============================================================
   8. ENDURHLEDSLA I MIDJU DRAFTI
   ============================================================ */
console.log("\n8. sidan endurhladin i midju drafti");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  let root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 34; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 34, 5000);
  const beforeDrafted = draftedOnScreen(), beforeMine = yoursOnScreen(),
        beforePick = pickHeader(), beforeNext = boxNext();
  root.unmount();

  /* F5: nytt mount, SAMA localStorage. */
  root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await settle(600);
  ok(draftedOnScreen() === beforeDrafted,
    `bordid kemur til baka med ${beforeDrafted} vol (${draftedOnScreen()})`);
  ok(yoursOnScreen() === beforeMine, `og ${beforeMine} min (${yoursOnScreen()})`);
  ok(pickHeader() === beforePick, `og somu valtolu (${pickHeader()} af ${beforePick})`);
  ok(boxNext() && beforeNext && boxNext().next === beforeNext.next,
    `og sama naesta val (${boxNext() ? boxNext().next : "?"} af ${beforeNext ? beforeNext.next : "?"})`);
  /* AUDKENNID LIFIR — OG ThAD ER I EINA REITNUM, FORFYLLT. Þad er
     forsendan fyrir thvi ad endurtenging i midju drafti se EINN SMELLUR:
     an forfyllingar yrdi hann ad finna slodina upp a nytt. */
  ok([...document.querySelectorAll("input")].some((i) => i.value === DRAFT_ID),
    "draft-id lifir endurhledsluna og er forfyllt i reitnum");
  /* Samstillingin er SLOKKT eftir endurhledslu — thad er asett (ekkert
     kall an thess ad bedid se um thad, sja `liveScope`). Krafan er ad
     thad SJAIST, og ljosid er thad sem segir thad nu. */
  ok(conn() === "bad", `og ljosid er RAUT (fann "${conn()}")`);
  ok(/Disconnected/.test(connText()), `og segir thad i ordum ("${connText().trim()}")`);
  ok(!!btn(/^Connect$/), "og hnappurinn heitir Connect — einn smellur tengir aftur");
  /* Og hun tekur vid ther sem gerdist medan slokkt var. */
  for (let n = 35; n <= 40; n++) pushPick(n);
  await click(btn(/^Connect$/), 200);
  const caught = await waitFor(() => draftedOnScreen() === 40, 5000);
  ok(caught, `og nær theim sex volum sem komu a medan (${draftedOnScreen()})`);
  root.unmount();
}

/* ============================================================
   9. RESET & DISCONNECT — OG TENGT UPP A NYTT
   ============================================================
   Breytt 12.8.2026 og hefur ALDREI keyrt i beinni. Tvennt er profad og
   thad seinna er thad sem bitur: ad tengja sig aftur vid SAMA draft.
   Fingrafarid (`lastSig`) lifir reset-id, svo obreytt svar les eins og
   "ekkert hefur gerst" — og bordid stendur TOMT medan tengingin segist
   vera lifandi.                                                      */
console.log("\n9. reset & disconnect, og tengt aftur");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 24; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 24, 5000);

  ok(!!btn(/Reset & disconnect/), "hnappurinn heitir \"Reset & disconnect\" thegar tengt er");
  await click(btn(/Reset & disconnect/), 150);
  ok(draftedOnScreen() === 0, `bordid tæmist (${draftedOnScreen()})`);
  ok(conn() === "bad", `og ljosid fer i RAUT (fann "${conn()}")`);
  await settle(150);
  ok(draftedOnScreen() === 0, "og fyllist EKKI aftur af sjalfu ser");

  /* (a) tengt aftur vid SAMA draft — bordid verdur ad fyllast upp a nytt */
  await go(DRAFT_ID, 200);
  const refilled = await waitFor(() => draftedOnScreen() === 24, 5000);
  ok(refilled, `sama draft: bordid fyllist aftur (${draftedOnScreen()} af 24)`);
  ok(pickHeader() === 25, `og valnumerid er rett (${pickHeader()})`);

  /* (b) reset og sidan ANNAD draft — gomlu volin mega ekki fylgja med */
  live.secondDraft = {
    draft: { ...mkDraft(), draft_id: "9999888877776666", league_id: null },
    picks: [],
  };
  for (let n = 1; n <= 5; n++) {
    const { round, slot } = slotOfPick(n);
    live.secondDraft.picks.push({ ...mkPick(n, POOL[100 + n]), round, draft_slot: slot });
  }
  await click(btn(/Reset & disconnect/), 150);
  await go("9999888877776666", 200);
  const swapped = await waitFor(() => draftedOnScreen() === 5, 5000);
  ok(swapped, `nytt draft byrjar a SINUM fimm volum (${draftedOnScreen()})`);
  ok(pickHeader() === 6, `og valnumerid er 6, ekki 30 (${pickHeader()})`);
  root.unmount();
}

/* ============================================================
   10. TVEIR FLIPAR — TVOFOLD POLLUN A SAMA DRAFT
   ============================================================ */
console.log("\n10. tvofold pollun (tveir flipar)");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const rootA = await boot();
  await connectAndSync();
  for (let n = 1; n <= 12; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 12, 4000);

  const second = document.createElement("div");
  document.body.appendChild(second);
  const rootB = createRoot(second);
  await act(async () => { rootB.render(React.createElement(App)); });
  await settle(600);
  for (let n = 13; n <= 20; n++) pushPick(n);
  await settle(250);
  const t = text();
  const counts = [...t.matchAll(/(\d+) drafted/g)].map((m) => Number(m[1]));
  ok(counts.length === 2, `badir flipar teikna bordid (${counts.join(", ")})`);
  ok(!/\bNaN\b|Something broke/.test(t), "tvofold pollun fellir hvorugan");
  /* LYKILLINN ER DEILD **OG DRAFT** fra 16.8.2026 — sja kafla 15. Var
     `nfl_taken:<deild>`, sem tvo mock i somu deild deildu. */
  const saved = JSON.parse(
    localStorage.getItem(`nfl_taken:${LEAGUE_ID}@${DRAFT_ID}`) || "[]");
  ok(saved.length >= 12, `vistada mengid er ekki thurrkad ut af hinum flipanum (${saved.length})`);
  rootB.unmount(); second.remove();
  rootA.unmount();
}

/* ============================================================
   11. TVITEKID VAL I SVARINU
   ============================================================
   Umsjonarmadur sem lagfaerir val getur skilid eftir tvaer radir a sama
   leikmanni. `taken` er MENGI, svo thad telur einn — en valnumerid ma
   ekki telja tvo.                                                    */
console.log("\n11. tvitekid val i svarinu");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 10; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 10, 4000);
  live.picks.push({ ...live.picks[4], pick_no: 11 });     // sami leikmadur aftur
  await settle(200);
  ok(draftedOnScreen() === 10, `bordid telur enn 10 (${draftedOnScreen()})`);
  ok(pickHeader() === 11, `og valnumerid er 11, ekki 12 (${pickHeader()})`);
  root.unmount();
}

/* ============================================================
   12. DRAFTID ER I HLEI OG HELDUR SIDAN AFRAM
   ============================================================ */
console.log("\n12. draft i hlei og afram");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 15; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 15, 4000);
  live.draft = mkDraft({ status: "paused" });
  await waitFor(() => /paused/.test(text()), 2000);
  ok(/paused/.test(text()), "hleid sest a skjanum");
  await settle(200);
  ok(draftedOnScreen() === 15 && pickHeader() === 16,
    `og ekkert breytist medan bedid er (${draftedOnScreen()}/${pickHeader()})`);
  live.draft = mkDraft({ status: "drafting" });
  for (let n = 16; n <= 22; n++) pushPick(n);
  const on = await waitFor(() => draftedOnScreen() === 22, 4000);
  ok(on, `og draftid heldur afram (${draftedOnScreen()})`);
  root.unmount();
}

/* ============================================================
   13. INNFLUTTAR REGLUR RADA RAUNVERULEGA TILLOGUNNI
   ============================================================
   Rong `starters` eda `scoring` breytir HVERRI tolu an thess ad
   nokkud lati illa. Profad med thvi ad flytja inn TVAER deildir sem
   eru sannanlega olikar og krefjast thess ad tillagan sjalf breytist.  */
console.log("\n13. reglurnar rada tillogunni");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  const verdict = () => {
    const v = document.querySelector(".verdict-name");
    return v ? v.textContent.trim() : null;
  };
  const vbdTop = () => [...document.querySelectorAll("table.data tbody tr")].slice(0, 8)
    .map((tr) => (tr.children[4]?.textContent || "").trim()).join("|");

  await connectAndSync();
  const rules = () => {
    const id = JSON.parse(localStorage.getItem("nfl_activeLeague") || '""');
    const es = JSON.parse(localStorage.getItem("nfl_leagues") || "[]");
    return (es.find((e) => e.id === id) || {}).rules || {};
  };
  ok(rules().teams === TEAMS && rules().scoring === "ppr",
    `deildin lesin: ${rules().teams} lid, ${rules().scoring}`);
  ok(rules().rounds === ROUNDS, `og ${ROUNDS} umferdir ur DRAFTINU (fann ${rules().rounds})`);
  ok(rules().starters && rules().starters.FLEX === 2,
    `og tvo FLEX (fann ${rules().starters && rules().starters.FLEX})`);
  const pprVbd = vbdTop(), pprVerdict = verdict();
  ok(!!pprVerdict && !/\bNaN\b/.test(pprVerdict), `tillagan er til: ${pprVerdict}`);

  /* SAMA deild, EIN regla breytt: standard i stad PPR. Breytist ekkert
     er innflutningurinn skraut. */
  LEAGUE_RESP.scoring_settings = { ...LEAGUE_RESP.scoring_settings, rec: 0 };
  LEAGUE_RESP.roster_positions = ["QB", "RB", "RB", "RB", "WR", "TE", "K", "DEF",
                                  "BN", "BN", "BN", "BN", "BN", "BN", "BN"];
  await click(btn(/^re-read$/i), 250);
  await waitFor(() => rules().scoring === "standard", 5000);
  ok(rules().scoring === "standard", `endurlestur skipti i standard (${rules().scoring})`);
  ok(rules().starters.RB === 3 && !rules().starters.FLEX,
    `og byrjunarsaetin fylgdu (RB ${rules().starters.RB}, FLEX ${rules().starters.FLEX || 0})`);
  await settle(200);
  ok(vbdTop() !== pprVbd, "VBD-dalkurinn breyttist — stigagjofin for alla leid inn");
  /* Endurstillum svo naestu keyrslur seu ohreyfdar. */
  LEAGUE_RESP.scoring_settings = { ...LEAGUE_RESP.scoring_settings, rec: 1 };
  LEAGUE_RESP.roster_positions = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX",
                                  "K", "DEF", "BN", "BN", "BN", "BN", "BN"];
  root.unmount();
}

/* ============================================================
   14. SVISSAD UM DEILD I MIDJU DRAFTI — OG TIL BAKA
   ============================================================
   `DraftBoard` er endurraest (`key={activeId}`) vid svissun, sem er RETT
   fyrir mengin: hvert draft a sitt bord. En thad hefur afleiðingu sem er
   ekki skrad annars stadar og notandinn verdur ad vita af:
   **SAMSTILLINGIN SLOKKNAR**. `live` er astand i `SleeperSync`, svo hun
   fer med endurraesingunni.

   Þetta er PROFAD SEM HEGDUN, ekki lagfaert. Ad vista `live` myndi thyda
   ad appid byrjadi ad polla af sjalfu ser vid naestu hledslu, sem tveir
   adrir verdir banna berum ordum (`audit.mjs` kafli 9, `dashboard.mjs`
   kafli 1: "pollun sem enginn kveikti a er baedi ovaent og donaleg vid
   gestgjafann"). Krafan er thvi ad thad SJAIST — hnappurinn verdur ad
   segja "Start live sync" — og prófid festir thad svo hegdunin geti ekki
   breyst thegjandi i hvoruga att.                                     */
console.log("\n14. svissad um deild i midju drafti");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 26; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 26, 5000);
  /* Vaentanleg eigin vol eru TALIN ur vorpuninni, ekki skrifud sem tala:
     hardkodud tala hér vaeri onnur utgafa af snakk-vorpuninni og gaeti
     skeikad eins og appid. */
  const expMine = [...Array(26)].filter((_, i) => slotOfPick(i + 1).slot === MY_SLOT).length;
  const aDrafted = draftedOnScreen(), aMine = yoursOnScreen();
  ok(aDrafted === 26 && aMine === expMine,
    `deild A: ${aDrafted} strikadir, ${aMine} minir (vaentanlegt ${expMine})`);

  /* Onnur deild flutt inn medan draft A er i gangi. */
  await go(`https://sleeper.com/leagues/${LEAGUE_B_ID}/predraft`, 300);
  await waitFor(() => draftedOnScreen() === 0, 5000);
  ok(draftedOnScreen() === 0, `deild B byrjar a tomu bordi (${draftedOnScreen()})`);
  ok(/14/.test(text()), "og reglur deildar B eru komnar (14 lid)");

  /* Og til baka. */
  const chipA = [...document.querySelectorAll(".league-switch button.chip")]
    .find((c) => /Patriots/.test(c.textContent || ""));
  await click(chipA, 300);
  await waitFor(() => draftedOnScreen() === aDrafted, 5000);
  ok(draftedOnScreen() === aDrafted, `til baka i A: ${draftedOnScreen()} strikadir (voru ${aDrafted})`);
  ok(yoursOnScreen() === aMine, `og ${aMine} minir (${yoursOnScreen()})`);
  ok(pickHeader() === aDrafted + 1, `og valnumerid er ${aDrafted + 1} (${pickHeader()})`);
  /* GILDRAN, FEST SEM HEGDUN: samstillingin er SLOKKT og thad verdur ad
     sjast. Adur var akkerid hnappurinn ("Start live sync"); nu er thad
     LJOSID, sem er sterkara — hnappur getur verid til an ad segja neitt
     um astandið, en raut ljos ER astandið. */
  ok(conn() === "bad",
    `samstillingin slokknar vid svissun — og ljosid er RAUT (fann "${conn()}")`);
  ok(/Disconnected/.test(connText()), `og segir thad i ordum ("${connText().trim()}")`);
  ok(!/reading picks live/.test(text()),
    "og ekkert a skjanum heldur thvi fram ad hun se lifandi");
  /* Og hun tekur upp thrádinn thegar tengt er aftur — EINN SMELLUR, thvi
     reiturinn ber enn audkennid. */
  for (let n = 27; n <= 33; n++) pushPick(n);
  await click(btn(/^Connect$/), 200);
  const caught = await waitFor(() => draftedOnScreen() === 33, 5000);
  ok(caught, `og nær theim sem baettust vid a medan (${draftedOnScreen()})`);
  root.unmount();
}

/* ============================================================
   15. ANNAD MOCK I SOMU DEILD — BORDID MA EKKI ERFAST
   ============================================================
   ÞETTA GERDIST HJA NOTANDANUM 16.8.2026, FIMM DOGUM FYRIR ALVORU
   DRAFTID: hann keyrdi eitt mock, byrjadi annad, og bordid sagdi
   "Pick 60 - take this" a drafti sem var rett ad byrja.

   MEKANISMINN — endurgerdur her og BADIR helmingar tharf til:

     1. `taken` var vistad a DEILDINNI (`nfl_taken:<deild>`), svo bædi
        mock lasu SAMA mengi.
     2. `lastSync` — vidmidid sem mismunar-reglan i `onPicks` dregur fra
        — er `useRef` og byrjar TOM vid hverja hledslu. Fyrsta pollun
        eftir mount hefur thvi ekkert i `gone` og GETUR EKKERT ANNAD EN
        BAETT VID.

   Þess vegna er ENDURHLEDSLAN i midjunni her og hun er ekki skraut:
   MAELT, an hennar (sama lota, samfelld) VIRKAR bordid rett — mismunurinn
   fjarlaegir vol fyrra draftsins. Prof sem slepti F5 hefdi verid graent a
   villunni. Handvirku volin i (e) eru hin leidin ad somu villu i SOMU
   lotu: thau eru VILJANDI utan mismunarins (thin skraning, ekki Sleepers)
   svo ekkert fjarlaegdi thau nokkurn timann.

   FJOGUR SKILYRDI TOGA HVERT A ANNAD og thau eru oll her:
     (a) annad draft ERFIR EKKI — annars er alvoru draftid mengad
     (b) F5 I MIDJU DRAFTI SKILAR BORDINU — thess vegna er thad vistad
     (c) SAMA draft aftur SKILAR bordinu — ekki tomt bord i beinni
     (d) HANDVIRK skraning an tengingar lifir lika
   Ad festa eitt theirra og gleyma hinum er audvelt; thess vegna er
   hvert theirra sér-fullyrding hér.                                  */
const MOCK_B_ID = "7777666655554444";
console.log("\n15. annad mock i somu deild erfir ekki thad fyrra");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  let root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 59; n++) pushPick(n);
  const gotA = await waitFor(() => draftedOnScreen() === 59, 9000);
  ok(gotA, `mock A: 59 vol strikud ut (${draftedOnScreen()})`);
  ok(pickHeader() === 60, `mock A stendur a vali 60 (${pickHeader()})`);
  root.unmount();

  /* (b) F5 — og bordid VERDUR ad koma til baka. Þetta er skilyrdid sem
     togar a moti (a): mengid er vistad NAKVAEMLEGA thess vegna, og ad
     tapa thvi i midju drafti vaeri verri villa en su sem er verid ad
     laga. Tekid her lika thott kafli 8 profi thad, thvi hér er thad
     hin hlidin a sama peningi og verdur ad falla MED honum ef
     skorðunin er tekin ur sambandi. */
  root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await settle(700);
  ok(draftedOnScreen() === 59, `(b) eftir F5 er mock A oskert (${draftedOnScreen()})`);
  ok(pickHeader() === 60, `og valnumerid enn 60 (${pickHeader()})`);
  /* Og bordid THEGIR EKKI um thad. Þogul endurfylling var thad sem gerdi
     villuna oskiljanlega — 59 vol birtust an thess ad neitt segdi hvadan. */
  ok(/59 picks restored from this browser/.test(text()),
    "og bordid segir berum ordum ad volin komi ur vafranum");

  /* (a) NYTT mock i somu deild. Ekkert reset, ekkert annad — bara nytt
     audkenni, nakvaemlega thad sem notandinn gerdi. */
  live.secondDraft = {
    draft: { ...mkDraft(), draft_id: MOCK_B_ID, league_id: null },
    picks: [],
  };
  for (let n = 1; n <= 3; n++) {
    const { round, slot } = slotOfPick(n);
    live.secondDraft.picks.push({ ...mkPick(n, POOL[100 + n]), round, draft_slot: slot });
  }
  await go(MOCK_B_ID, 250);
  const clean = await waitFor(() => draftedOnScreen() === 3, 6000);
  ok(clean, `(a) mock B byrjar a SINUM thremur volum (${draftedOnScreen()})`);
  ok(pickHeader() === 4, `og valnumerid er 4, ekki 63 (${pickHeader()})`);
  const bMine = yoursOnScreen();
  ok(bMine === (slotOfPick(1).slot === MY_SLOT ? 1 : 0) +
               (slotOfPick(2).slot === MY_SLOT ? 1 : 0) +
               (slotOfPick(3).slot === MY_SLOT ? 1 : 0),
    `og hopurinn er mock B-s, ekki mock A-s (${bMine} minir)`);

  /* Mengin bua i SITTHVORUM lykli — sagt berum ordum, thvi thad er
     einmitt fullyrdingin sem villan braut. */
  const kA = `nfl_taken:${LEAGUE_ID}@${DRAFT_ID}`;
  const kB = `nfl_taken:${LEAGUE_ID}@${MOCK_B_ID}`;
  ok(JSON.parse(localStorage.getItem(kA) || "[]").length === 59,
    `mock A a sinn eigin lykil med 59 volum (${kA})`);
  ok(JSON.parse(localStorage.getItem(kB) || "[]").length === 3,
    `mock B a sinn eigin lykil med 3 (${kB})`);

  /* (c) OG TIL BAKA I MOCK A — sama draft skilar sinu bordi. Þetta er
     hin attin og hun var LOGUD adur (kafli 9): "reset og tengja aftur"
     skildi bordid eftir TOMT. Baðar attir verda ad vera rettar. */
  await go(DRAFT_ID, 250);
  const back = await waitFor(() => draftedOnScreen() === 59, 6000);
  ok(back, `(c) aftur i mock A: 59 vol koma til baka (${draftedOnScreen()})`);
  ok(pickHeader() === 60, `og valnumerid er 60 aftur (${pickHeader()})`);

  /* (d) HANDVIRK SKRANING. Reset slitur tenginguna, og tha er bordid ekki
     lengur bundid neinu drafti — en thad verdur samt ad lifa F5, thvi tha
     er ENGIN Sleeper-heimild til ad lesa thad upp a nytt. */
  await click(btn(/Reset & disconnect/), 200);
  ok(draftedOnScreen() === 0, `(d) reset taemir bordid (${draftedOnScreen()})`);
  let marked = 0;
  for (let i = 0; i < 3; i++) {
    const b = boardTable() && boardTable().querySelector("tbody tr button");
    if (await click(b, 60)) marked++;
  }
  ok(marked === 3 && draftedOnScreen() === 3,
    `thrju vol skrad i hendi (${draftedOnScreen()})`);
  root.unmount();
  root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await settle(700);
  ok(draftedOnScreen() === 3,
    `(d) handvirka skraningin lifir F5 an tengingar (${draftedOnScreen()})`);
  ok(/3 picks restored from this browser/.test(text()) &&
     /marked by hand/.test(text()),
    "og hun er merkt sem handvirk, ekki sem draft-bord");
  /* Og hun bytr i SINUM lykli — hvorugt draftid vissi af henni. */
  ok(JSON.parse(localStorage.getItem(`nfl_taken:${LEAGUE_ID}`) || "[]").length === 3,
    "handvirka bordid a sinn eigin lykil (deildin ein, ekkert `@`)");
  ok(JSON.parse(localStorage.getItem(kB) || "[]").length === 3,
    "og mock B er oskert — handvirku volin runnu ekki inn i thad");
  /* ============================================================
     OG "RESET" HREINSADI GEYMSLUNA, EKKI ADEINS SKJAINN
     ============================================================
     Reset i (d) var gert MEDAN mock A var a skjanum, svo bord mock A a
     ad vera tomt — og thad er profad hér thvi thad er audvelt ad gera
     rangt: `setTaken(tomt)` eitt hefdi ALDREI ratad i lykil mock A.
     Reset slitur tenginguna, sem faerir bordid samstundis yfir a
     deildar-lykilinn, svo vistunar-effectid skrifar tomid a RANGAN
     lykil. Mock A hefdi tha komid oskert til baka vid endurtengingu og
     hnappurinn hefdi logið. */
  ok(JSON.parse(localStorage.getItem(kA) || "[]").length === 0,
    "og \"Reset\" tæmdi lykil mock A i geymslunni, ekki bara skjainn");
  root.unmount();
}

/* ============================================================
   15b. RESET-HNAPPURINN SITUR THAR SEM AKVORDUNIN ER TEKIN
   ============================================================
   Beidni notandans 16.8.2026: "settu reset takkann ofar, vid hlidina a
   live connect". Hann var i bords-stikunni vid hlidina a "N drafted",
   ~300 px nedar en reitirnir sem draft er sett upp i — svo hann thurfti
   ad leita ad honum medan bordid syndi vol einhvers annars.

   PROFAD SEM STADSETNING OG HEGDUN, ekki sem orðalag: hnappurinn er
   fundinn eftir heiti (kafli 9 gerir thad lika) en fullyrdingarnar eru
   um hvar hann SITUR, hvad hann heitir i hvoru astandi og hvenaer hann
   er virkur. Heiti sem eina akkerid felldi tvo sofn i FPL-appinu vid
   endurnefningu; hér ber heitid merkingu (thad SEGIR ad tengingin fari
   lika) svo thad er profad, en stadsetningin er lesin ur DOM-trenu.  */
console.log("\n15b. reset-hnappurinn er kominn upp i tengi-spjaldid");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();

  const connectPanel = () => [...document.querySelectorAll(".panel")]
    .find((p) => /Connect your Sleeper draft/.test(
      p.querySelector("h2")?.textContent || "")) || null;
  const resetBtn = () => {
    const p = connectPanel();
    return p ? [...p.querySelectorAll("button")]
      .find((b) => /^Reset/.test((b.textContent || "").trim())) || null : null;
  };

  ok(!!resetBtn(), "hnappurinn er INNI i \"Connect your Sleeper draft\"-spjaldinu");
  /* Og hvergi annars stadar — tveir reset-hnappar vaeru verri en enginn. */
  ok([...document.querySelectorAll("button")]
      .filter((b) => /^Reset/.test((b.textContent || "").trim())).length === 1,
    "og hann er BARA a einum stad");
  ok(/^Reset board$/.test(resetBtn().textContent.trim()),
    `an tengingar heitir hann "Reset board" ("${resetBtn().textContent.trim()}")`);
  ok(resetBtn().disabled, "og hann er slokktur thegar ekkert er ad hreinsa");

  /* Radin: adalhnappurinn fyrst, skilrum, eydandi hnappurinn sidast.
     Hann ma ekki lenda undir fingrinum a theim sem aetlar a "Connect" —
     thad er ein ytting fra thvi ad henda bordinu. Adalhnappurinn er nu
     Connect (hann tengir OG samstillir, sja `liveScope`), svo rodin er
     fundin eftir honum. */
  const row = [...connectPanel().querySelectorAll(".row")]
    .find((r) => [...r.querySelectorAll("button")]
      .some((b) => /^Connect/.test((b.textContent || "").trim())));
  ok(!!row, "hann er i SOMU rod og Connect");
  const labels = [...row.querySelectorAll("button")].map((b) => b.textContent.trim());
  ok(labels.findIndex((l) => /^Reset/.test(l)) >
     labels.findIndex((l) => /^Connect/.test(l)),
    `og A EFTIR honum i rodinni (${labels.join(" | ")})`);
  ok(!!row.querySelector(".spacer"), "med skilrum a milli theirra");
  ok(!resetBtn().classList.contains("primary"),
    "og hann ber ekki adallitinn — eydandi adgerd a ekki ad kalla a sig");

  /* TENGT MOCK MED ENGUM PORUDUM VOLUM verdur samt ad vera haegt ad
     slita. Þetta var villa adur (`!taken.size` eitt) og hun laesti
     notandann inni i drafti sem hann var haettur i. */
  await connectAndSync();
  await settle(200);
  ok(/^Reset & disconnect$/.test(resetBtn().textContent.trim()),
    `tengdur heitir hann "Reset & disconnect" ("${resetBtn().textContent.trim()}")`);
  ok(draftedOnScreen() === 0 && !resetBtn().disabled,
    "og hann er VIRKUR thott ekkert val se komid — tengingin ein dugar");
  root.unmount();
}

/* ============================================================
   15c. AD SLA DRAFT-AUDKENNI I HENDI EYDDI BORDINU SEM VAR I GANGI
   ============================================================
   HAETTULEGASTA VILLAN SEM FANNST I THESSU APPI, og hun kom UPP UR
   THEIRRI VINNU sem kafli 15 ver: skorðunin er rett, grisjunin var
   rong, og saman eyddu thaer bordinu.

   KEDJAN — hver hlekkur rettur, samsetningin eyðandi:
     · `DRAFT_ID_RE` tekur 6-32 tolustafi
     · reiturinn uppfaerir `sync.draftId` VID HVERN INNSLATT
     · hver breyting a `scope` skradi bord i grisjunar-listann (8 sess)

   19 stafa Sleeper-audkenni gefur thvi **14 millistig** sem oll
   standast regexid. Listinn fylltist af theim og bordin sem voru
   RAUNVERULEG fellu ut — MAELT a gomlu utfaerslunni: bord med 59
   volum -> **0**, lykillinn eyddur, og listinn bar atta halfslegin
   audkenni sem enginn hafdi draftad i.

   PROFID SLÆR AUDKENNID STAF FYRIR STAF. Ad lima thad inn i einu
   (`setInput` med fullu gildi) FELLDI ALDREI villuna — thad gefur eitt
   `scope` og eitt kall. Sama kynslod villu og "tvennt tharf til ad
   bregdast" (CLAUDE.md 5b): fullyrding sem prófar limingu eina getur
   ekki brugdist.

   ============================================================
   OG NU ER ANNAR HLEKKUR HORFINN — EN PROFID STENDUR — 19.8.2026
   ============================================================
   "Draft ID"-reiturinn er farinn (eitt reit, einn hnappur), svo
   `sync.draftId` breytist ekki lengur VID HVERN INNSLATT heldur adeins
   thegar Connect er yttur. Kedjan er thvi BYGGINGARLEGA brotin.

   ÞAD ER ASTAEDA TIL AD STYRKJA PROFID, EKKI TIL AD FELLA THAD UT.
   Grisjunin er a sinum stad og hun getur enn eytt bordi; thad sem
   breyttist er hver getur ræst hana. Profid slaer thvi enn staf fyrir
   staf (nu i eina reitinn — thad MA ekki hreyfa neitt) OG ytir sidan a
   Connect a halfslegnu audkenni sem Sleeper svarar 404 um. Su sidasta er
   NY fullyrding: mistekin tenging ma ekki taka sess i grisjunar-
   listanum, thvi hun er nakvaemlega thad sem "audkenni sem er ekki til"
   var i gomlu kedjunni.

   FULLYRDINGIN ER I BADAR ATTIR og su fyrri er nauðsynleg: bord SEM
   HEFUR VOL verdur ad vera skrad i listann, annars vaeri "engu eytt"
   uppfyllt med thvi ad gera grisjunina ad engu — og tha vaeri profid
   graent a kodanum sem safnar bordum ad eilifu.                    */
const TYPED_ID = "1420000000000000007";   /* 19 stafir, eins og Sleeper */
console.log("\n15c. draft-audkenni slegid i hendi — bordid i gangi verdur ad lifa");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  let root = await boot();
  await connectAndSync();
  for (let n = 1; n <= 59; n++) pushPick(n);
  ok(await waitFor(() => draftedOnScreen() === 59, 9000),
    `bordid ber 59 vol adur en nokkud er slegid (${draftedOnScreen()})`);
  ok(!!root, "forsenda: bordid er tengt og lifandi");

  const kA = `nfl_taken:${LEAGUE_ID}@${DRAFT_ID}`;
  const boards = () => {
    try { return JSON.parse(localStorage.getItem("nfl_boards") || "[]"); }
    catch { return []; }
  };
  const takenKeys = () => {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("nfl_taken:")) out.push(k);
    }
    return out;
  };

  /* ---- ATTIN SEM MA EKKI GLEYMAST: bord MED volum ER skrad ---- */
  ok(boards().includes(`${LEAGUE_ID}@${DRAFT_ID}`),
    `bord med volum ER i grisjunar-listanum (${JSON.stringify(boards())})`);
  ok(JSON.parse(localStorage.getItem(kA) || "[]").length === 59,
    "og lykill thess ber 59 vol");

  /* ============================================================
     EITT VAL SKRAD I HENDI — OG THAD ER PROFSTEINNINN
     ============================================================
     SKJARINN EINN GETUR EKKI FELLT THESSA VILLU og thad var MAELT:
     med gamla kodanum var lykill bords A eyddur, og fullyrdingin
     "59 vol koma til baka a skjainn" stod SAMT — thvi pollunin sótti
     thau oll upp a nytt fra Sleeper. Sjalfvirk endurheimt fal
     eydinguna.

     Þess vegna er eitt val skrad I HENDI. Handvirk vol eru VILJANDI
     utan mismunarins i `onPicks` (thin skraning, ekki Sleepers), svo
     Sleeper getur ekki skilad theim — thau eru sa hluti bordsins sem
     er OAFTURKRAEFUR. Fullyrdingin "60, ekki 59" er thvi um raunverulegt
     tap, ekki um birtingu.                                          */
  ok(await enableManual(), "yfirtoku-hnappurinn er thar (skraning i hendi er möguleg)");
  const handRow = boardTable() && boardTable().querySelector("tbody tr");
  const handName = handRow && (handRow.querySelector("td.frozen")?.textContent || "").trim();
  const handBtn = handRow && handRow.querySelector("button");
  ok(!!handBtn, "og rodin ber hnapp til ad skra i hendi");
  await click(handBtn, 120);
  ok(draftedOnScreen() === 60,
    `eitt val skrad i hendi ofan a Sleeper-volin (${draftedOnScreen()}) — "${handName}"`);
  ok(JSON.parse(localStorage.getItem(kA) || "[]").length === 60,
    "og lykillinn ber 60");

  /* ---- OG SVO ER SLEGID, STAF FYRIR STAF ---- */
  for (let i = 1; i <= TYPED_ID.length; i++) {
    await setInput("Sleeper league, draft or username", TYPED_ID.slice(0, i));
  }
  await settle(300);

  ok(JSON.parse(localStorage.getItem(kA) || "[]").length === 60,
    `bord A er OSKERT eftir ${TYPED_ID.length} innslatta`
    + ` (${JSON.parse(localStorage.getItem(kA) || "[]").length} vol)`);
  ok(boards().includes(`${LEAGUE_ID}@${DRAFT_ID}`),
    `og thad er enn i listanum (${JSON.stringify(boards())})`);
  /* Halfslegid audkenni ma hvorki eiga lykil ne sess. Talid, ekki
     skodad: thekja er fullyrding. */
  const half = boards().filter((s) => {
    const d = String(s).split("@")[1] || "";
    return d !== TYPED_ID && TYPED_ID.startsWith(d);
  });
  ok(half.length === 0,
    `ekkert halfslegid audkenni tok sess i listanum (${half.length}: ${half.join(", ")})`);
  ok(takenKeys().length === 1,
    `og adeins EITT bord a lykil i geymslunni (${takenKeys().length}: ${takenKeys().join(", ")})`);

  /* ---- OG TENGING SEM BREST MA EKKI TAKA SESS HELDUR ----
     Þetta er attin sem varð til thegar reiturinn hvarf: `sync.draftId`
     breytist nu adeins vid Connect, svo eina leidin ad grisjunar-
     listanum er RAUNVERULEG tengitilraun. Hermirinn svarar 404 um
     TYPED_ID (sja `knownDraftId`), eins og Sleeper gerir um audkenni sem
     er ekki til. */
  await click(btn(/^Connect/i), 300);
  ok(JSON.parse(localStorage.getItem(kA) || "[]").length === 60,
    `bord A er OSKERT eftir mistekna tengitilraun`
    + ` (${JSON.parse(localStorage.getItem(kA) || "[]").length} vol)`);
  ok(!boards().some((b) => String(b).endsWith(`@${TYPED_ID}`)),
    `og audkennid sem SVARADI ENGU tok engan sess (${JSON.stringify(boards())})`);
  ok(takenKeys().length === 1,
    `og enn adeins EITT bord med lykil (${takenKeys().join(", ")})`);
  /* LJOSID ER GRAENT — OG ThAD ER RETT. Tengingin vid bord A slitnadi
     ekki; thad var TILRAUNIN sem brast. Krafan er thvi ekki raut ljos
     heldur ad bilunin SEGIST: thogul mistokst tenging er thad sem laetur
     notandann ytta aftur og aftur an ad vita hvers vegna. */
  ok(conn() === "good",
    `bordid sem var i gangi er ENN tengt (fann "${conn()}")`);
  ok(/could not be found|not found/i.test(connText()),
    `og mistokin tenging er SOGD ("${connText().trim()}")`);

  /* ---- OG BORDID KEMUR TIL BAKA. Lykill sem er oskertur en birtist
     ekki er jafn tapadur fyrir notandann. Talan er **60**: 59 fra
     Sleeper OG hitt sem Sleeper veit ekki af. ---- */
  await go(DRAFT_ID, 250);
  ok(await waitFor(() => draftedOnScreen() === 60, 8000),
    `aftur a bordi A: oll 60 volin koma til baka a skjainn (${draftedOnScreen()})`);
  ok(!boardNames().includes(handName),
    `og handvirka valid ("${handName}") er enn strikad ut, ekki komid til baka a bordid`);
  /* 61, ekki 60: handvirka valid telur MED i valnumerinu — ad merkja
     mann "gone" ER notandinn ad segja ad val hafi verid tekid sem
     Sleeper hefur ekki skilad enn. Sja `offBoard`. */
  ok(pickHeader() === 61, `og valnumerid er 61 (${pickHeader()})`);
  ok(!junk(), `ekkert NaN/undefined a skjanum (${junk() || "-"})`);
  root.unmount();
}

/* ============================================================
   16. DRAFTID ER HEIMILDIN UM DRAFTID — 10-LIDA DRAFT, 12-LIDA DEILD
   ============================================================
   ÞETTA ER VILLAN SEM KOSTADI NOTANDANN MOCK-DRAFT 17.8.2026 og ekkert
   safn gat fellt hana, af einni astaedu sem er verd ad skra: **hvert
   einasta prof i thessu safni gaf SOMU logun a bædi deild og draft.**
   Fullyrdingin "valnumerid er rett" gat thvi ekki brugdist — bædi
   heimildirnar sogdu 10 lid, svo thad var sama hvor var spurd.

   ThRENNT SEM HANN SA A SKJANUM, ALLT UR SOMU ROT:
     · "This draft is not the shape of the league the board is using —
       10 teams in the draft against 12 in this league" — SATT, og hann
       las hana ekki, thvi hun var malsgrein i vegg af malsgreinum
     · "Pick 151 — take this" i 10x15 drafti sem endar a 150. Hlidid var
       til (`totalPicks`) en las `league.teams * league.rounds` = 180
     · "only 0% likely to last your next 13 picks" — 13 er 12-lida bid

   OG FJORDA, SEM ER STAERST OG SEM ENGIN VIDVORUN NEFNDI: varamanns-
   threpin. 12-lida sjalfgefid snid setur WR-threpid i **WR42** thar sem
   hans 10-lida deild setur thad i **WR29** — thretta saeti dypra a
   DYPSTU stodunni, medan RB faerist eitt saeti og TE ekkert. Maelt a
   somu laug: +26,9 stig af VBD a hvern WR, +1,0 a RB, 0,0 a TE. VBD
   sendingamottakara tvofaldast naerri (Rice 29,6 -> 58,5, Washington
   12,7 -> 41,6) og hermt draft fra saeti 5 skilar **RB4 TE2 WR1** med
   rettri logun en WR-eftir-WR med 12-lida sniðinu. Hann tok sex WR og
   fylgdi radgjofinni i hverju vali.

   PROFID GERIR ThVI ThAD SEM ENGIN ONNUR KEYRSLA GERIR: laetur logunina
   REKA I SUNDUR og krefst thriggja hluta — ad snakk-tolurnar komi ur
   DRAFTINU, ad thakid komi ur DRAFTINU, og ad tenging a rangri logun
   geti ALDREI teiknast graen.                                        */
console.log("\n16. 10-lida mock ofan a 14-lida deild — DRAFTID er heimildin, og ljosid er GRAENT");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();

  /* ============================================================
     LEIDIN ER HANS, EKKI STYSTA LEIDIN AD MISMUNI
     ============================================================
     Fyrsta utgafa thessa kafla setti `LEAGUE_RESP.settings.num_teams = 12`
     og VAR GRAEN A RONGUM FORSENDUM: `leagueFromSleeper` les
     `dset.teams` FYRST, svo innflutt deild getur ALDREI rekid fra sinu
     eigin drafti. Mismunurinn er ekki til a theirri leid — og prof sem
     byr til astand sem appid getur ekki verid i maelir ekkert.

     Rétta leidin er su sem hann fór: (1) deild flutt inn, (2) MOCK-draft
     tengt, sem ber enga `league_id`, (3) deildin stendur eftir i sinni
     staerd medan volin koma ur mock-inu. Hér er deildin B (14 lid, 12
     umferdir, half-ppr) og mock-id 10x15 ppr.                          */
  await go("team7", 200);
  await settle(200);

  await go(`https://sleeper.com/leagues/${LEAGUE_B_ID}/predraft`, 200);
  await waitFor(() => /rules imported/i.test(text()), 5000);
  await settle(200);

  await go(`https://sleeper.com/draft/nfl/${MOCK_DRAFT_ID}`, 200);
  await settle(400);

  const flat = () => text().replace(/\s+/g, " ");

  /* ============================================================
     ÞETTA VAR RAUTT OG SAGDI HONUM AD GERA ThAD SEM ER OMOGULEGT
     ============================================================
     20.8.2026, daginn fyrir draftid, las hann thetta a lifandi mock-i:

       "Disconnected — draft has 10 teams, league has 12 — connect the
        league this draft belongs to"

     MOCK-DRAFT A ENGA DEILD — thess vegna flytur `connect` engar reglur
     inn — svo bodin bad hann um ad tengja eitthvad sem ER EKKI TIL. Og
     "Disconnected" stod a drafti sem svaradi 1,5 sek adur ("3 picks made
     · live" tveimur linum nedar).

     RETTA HEGDUNIN, OG HUN ER EKKI MILDARI ORDALAG A SOMU FULLYRDINGU:
     thegar draftid a enga deild er DRAFTID EINA HEIMILDIN og bordid
     reiknar THAD. Þa er enginn mismunur til ad segja fra — ljosid er
     GRAENT og linan segir hvadan hvert svid kemur. Sja `boardShape`.   */
  ok(conn() === "good",
    `lifandi mock an deildar er TENGT, ekki "disconnected" (fann "${conn()}")`);
  ok(/Connected/.test(connText()) && !/Disconnected/.test(connText()),
    `og ordin segja thad lika ("${connText().trim()}")`);
  /* HIN ATTIN: bodin sem ekki er haegt ad fylgja ma hvergi standa. */
  ok(!/connect the league this draft belongs to/i.test(flat()),
    "og hvergi bod um ad tengja deild sem mock-draft hefur ekki");
  ok(/mock draft with no league/i.test(flat()),
    "heldur er astandid nefnt berum ordum: mock an deildar");
  /* OG HVADAN HVERT SVID KEMUR. Mock-id ber `scoring_type: "ppr"` en
     ENGIN `slots_*`, svo thetta er hlutasannleikur — og hann er sagdur
     sem hlutasannleikur, ekki sem "allt ur draftinu". */
  ok(/10 teams, 15 rounds and ppr from this draft/.test(flat()),
    "logun OG stigagjof ur draftinu (10 lid, 15 umferdir, ppr)");
  ok(/starting slots from the league you have loaded/.test(flat()),
    "og byrjunarsaetin ur deildinni — thau eru ekki i mock-svarinu");
  /* LINAN ER EIN LINA. Vidvorun i vegg af texta er villan sem kostadi
     hann mock-draftid; malsgreinin sem stod hér var ~460 stafir. */
  const line = /mock draft with no league[^·]*/.exec(flat());
  ok(line && line[0].trim().length < 210,
    `og hun er EIN LINA (${line ? line[0].trim().length : "?"} stafir)`);

  /* ---- snakk-tolurnar koma ur DRAFTINU ----
     Saeti 7 i 10-lida snakki: umferd 1 -> val 7, umferd 2 -> val 14.
     Undir 14-lida vorpun vaeri naesta val **22**. Talan er lesin EFTIR ad
     mitt val i umferd 1 er lidid — fyrir thad er rett svar 7 i badum
     vorpunum og fullyrdingin gaeti ekki brugdist. */
  for (let n = 1; n <= MY_SLOT; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === MY_SLOT, 6000);
  await settle(250);
  const bx = boxNext();
  ok(bx && bx.next === 14,
    `naesta val er 14 (10-lida vorpun), ekki 22 (14-lida) — fann ${bx ? bx.next : "ekkert"}`);
  ok(bx && bx.wait === 6,
    `og bidin er 6 vol fra vali 8 (fann ${bx ? bx.wait : "ekkert"})`);

  /* ---- ThAKID kemur ur DRAFTINU: 10 x 15 = 150, ekki 14 x 12 = 168 ---- */
  for (let n = MY_SLOT + 1; n <= TOTAL; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === TOTAL, 30000);
  await settle(400);
  ok(/Draft complete/.test(flat()),
    `eftir oll ${TOTAL} volin segir kassinn "Draft complete"`);
  ok(!/Pick 151 [—-] take this/.test(flat()),
    "og hvergi \"Pick 151 — take this\" i 150 vala drafti");
  ok(/All 150 picks are in/.test(flat()),
    "thakid sjalft er talid ur draftinu (150), ekki ur deildinni (168)");
  ok(!junk(), `ekkert NaN/undefined a skjanum (${junk() || "-"})`);

  root.unmount();
}

/* ============================================================
   16b. OG ThEGAR DRAFTID ER DEILDARINNAR ER LJOSID GRAENT — AN LINU
   ============================================================
   An thessa kafla vaeri kafli 16 uppfyllanlegur med ljosi sem er ALLTAF
   graent OG linu sem er alltaf birt. Hér er hvorugt: samstaeður
   deildardraft ber ENGA linu, thvi thar er ekkert ad segja.            */
console.log("\n16b. deildardraft -> graent, og ENGIN lina");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  await settle(300);
  ok(conn() === "good", `deild og draft bædi 10 lid -> graent (fann "${conn()}")`);
  ok(/Connected/.test(connText()) && !/Disconnected/.test(connText()),
    `og thad stendur i ordum, ekki adeins i lit ("${connText().trim()}")`);
  ok(/reading picks live/.test(connText()),
    "og thad stendur ad volin sesu lesin i beinni");
  ok(!/mock draft with no league|belongs to another/.test(text()),
    "engin logunar-lina thegar ekkert er ad segja");
  root.unmount();
}

/* ============================================================
   16c. DRAFT SEM TILHEYRIR **ANNARRI** DEILD — OG ThAD ER RAUTT
   ============================================================
   ÞETTA ER VORDURINN SEM MA EKKI MILDAST thegar mock vard graent.
   Astandunum tveimur var steypt saman adur ("engin deild" og "onnur
   deild" fengu somu bodin) og thau eru ekki sama malid:

     mock (engin `league_id`)  -> draftid er eina heimildin  -> GRAENT
     draft med `league_id` sem er ONNUR en su sem er hladin -> RAUTT

   Hid sidara er raunveruleg notandavilla og hun er su sem kostadi sex WR
   i sjo umferdum: reglurnar a skjanum eru einnar deildar, volin annarrar.

   LEIDIN THANGAD ER RAUNVERULEG, ekki tilbuid astand: `sleeperResolve`
   saekir deild draftsins og **kyngir** thvi ef hun svarar ekki (deild
   eydd, 404, netid). Þa lendir draftid a THEIRRI deild sem er opin —
   nakvaemlega thad astand sem thessi kafli ber.                       */
console.log("\n16c. draft sem tilheyrir annarri deild -> RAUTT");
{
  const FOREIGN_LEAGUE = "5555444433332222";
  const FOREIGN_DRAFT = "5555444433332223";
  live.picks = []; live.draft = mkDraft(); live.mode = "ok";
  live.secondDraft = {
    draft: { draft_id: FOREIGN_DRAFT, league_id: FOREIGN_LEAGUE, status: "drafting",
             type: "snake", season: "2026", draft_order: { u7: MY_SLOT },
             slot_to_roster_id: null, metadata: { scoring_type: "ppr" },
             settings: { teams: TEAMS, rounds: ROUNDS } },
    picks: [],
  };
  const root = await boot();
  await connectAndSync();
  await settle(250);
  ok(conn() === "good", "forsenda: eigid draft er graent");

  /* `/league/5555...` svarar 404 hja herminum, eins og Sleeper gerir um
     deild sem er ekki til — svo ENGIN deild er flutt inn og draftid
     lendir a deildinni sem er opin. */
  await go(FOREIGN_DRAFT, 300);
  await settle(400);
  const flat = () => text().replace(/\s+/g, " ");
  ok(conn() === "bad",
    `draft annarrar deildar er RAUTT (fann "${conn()}")`);
  ok(conn() !== "good", "og thad getur ALDREI teiknast graent");
  ok(/Disconnected/.test(connText()), `og ordin segja thad ("${connText().trim()}")`);
  ok(new RegExp(`belongs to another Sleeper league \\(${FOREIGN_LEAGUE}\\)`).test(flat()),
    "linan nefnir AUDKENNI deildarinnar sem draftid tilheyrir");
  ok(/priced for a different one/.test(flat()),
    "og hvad thad kostar — tolurnar eru annarrar deildar");
  /* OG HER MA BODIN STANDA: thessi deild ER til og hana MA tengja. */
  ok(/connect that league/i.test(flat()),
    "og bodin eru ognaeg: tengdu THA deild (hun er til, olikt mock)");

  /* ============================================================
     OG LIDSSPJOLDIN HVERFA — SAMA VILLAN, ADRAR DYR (20.8.2026)
     ============================================================
     Raut ljos var ThEGAR retta svarid hér, og samt stodu lidsspjold
     DEILDARINNAR SEM ER HLADIN eftir undir thvi, smellanleg. `seatList`
     greindi adeins MOCK (`!info.leagueId`) fra ollu odru, svo astandid
     "onnur deild" hleypti theim i gegn. Þad er sama villan sem `keptSlot`
     ver — appid bydur ther hop annars manns — nema hér er tilefnid
     notandinn sjalfur: smellur skrifar `sync.slot` OG tekur `t.userId`
     sem AUDKENNI HANS ur allt annarri deild.

     FULLYRDINGIN ER UM NOFNIN, EKKI UM TOLUNA — sama regla og kafli 18.
     `team7` er gilt saeti i hvorri deild sem er, svo talan 7 gat aldrei
     kviknad; thad sem var rangt voru nofnin. Neikvaeda fullyrdingin
     nefnir thvi streng sem var SANNANLEGA a skjanum: spjaldid "7. team7"
     sest i kafla 17 og i `connectAndSync`, svo `!includes` er ekki tomt
     (CLAUDE.md 5b).

     SKORDAD A TENGI-SPJALDID, EKKI A `button.chip` I OLLU DOM-INU:
     `chip`-stillinn er lika a leitni-listanum, a stodu-siunum og a
     K/DST-toflunni (maelt: 34 spjold utan saetalistans), svo talning a
     ollu skjanum vaeri fullyrding um allt annad. Fyrsta utgafan gerdi
     nakvaemlega thad og las 34 — profid hefdi fallid a rettum koda.   */
  const seatPanel = () => [...document.querySelectorAll(".panel")]
    .find((p) => /Connect your Sleeper draft/.test(
      p.querySelector("h2")?.textContent || "")) || null;
  const chipNames = () => [...(seatPanel()?.querySelectorAll("button.chip") || [])]
    .map((b) => (b.textContent || "").trim());
  ok(chipNames().length === 0,
    `engin lidsspjold i drafti annarrar deildar (${chipNames().length}: ${
      chipNames().join(" | ")})`);
  ok(!chipNames().some((n) => /team\d/.test(n)),
    "og nofn ur deildinni sem er hladin eru hvergi smellanleg");
  /* Nafnid ma ekki lifa spjoldin: "You are team7, slot 7" i drafti sem
     team7 er ekki i vaeri sama lygin i einni linu. */
  ok(!/You are team\d/.test(flat()),
    `og saetis-nafnid fylgir theim ut ("${
      (/You are [^,]{0,20}/.exec(flat()) || ["-"])[0]}")`);
  ok(!junk(), `ekkert NaN/undefined (${junk() || "-"})`);
  root.unmount();
}

/* ============================================================
   16d. `picksLeft` KEMUR UR DRAFTINU — VILLAN VAR EIN UMFERD
   ============================================================
   Hann sa thetta a lifandi mock-i 20.8.2026:

     "You have 2 picks left and still need K and DST"

   medan hann atti **3** vol eftir. Deildin ber 14 umferdir og mock-id 15,
   svo `picksLeft = rounds - roster.length` var talid ur RANGRI heimild —
   og thad ryður `mustFillUrgent` (`picksLeft <= needed + 1`) EINNI UMFERD
   OF SNEMMA: kassinn skiptir ut radgjofinni fyrir spyrnumann/vorn adur en
   thad er timabaert.

   ÞETTA VAR EKKI SAMA VILLAN SEM `totalPicks` LAGADI 17.8. Þar var thakid
   ("Pick 151") faert ur deildinni i draftid; `advice.js` ber sinar EIGIN
   `rounds` gegnum `league`-hlutinn, og HANN var afram deildarinnar. Tvo
   svid, sama rot, og adeins annad var faert.

   MORKIN SJALF (`picksLeft <= needed + 1`, og ad kassinn kalli enn i
   SIDUSTU umferd thegar `picksLeft` er 0) eru OHREYFD og thad er asett:
   ad thagga K/DST-vidvorunina i sidustu umferd — theirri einu umferd sem
   hun er til fyrir — vaeri verri skekkja en skrytin setning. Þessi kafli
   maelir HEIMILDINA, ekki morkin.                                     */
console.log("\n16d. picksLeft er talid ur draftinu, ekki ur deildinni");
{
  const MOCK_D = "6666555544443333";
  live.picks = []; live.draft = mkDraft(); live.mode = "ok";
  /* Mock: 10 lid, 15 umferdir. Deildin B: 14 lid, 12 umferdir. */
  live.secondDraft = {
    draft: { draft_id: MOCK_D, league_id: null, status: "drafting", type: "snake",
             season: "2026", draft_order: { u7: MY_SLOT }, slot_to_roster_id: null,
             metadata: { scoring_type: "ppr" },
             settings: { teams: TEAMS, rounds: ROUNDS,
                         slots_qb: 1, slots_rb: 2, slots_wr: 2, slots_te: 1,
                         slots_flex: 2, slots_k: 1, slots_def: 1, slots_bn: 5 } },
    picks: [],
  };
  /* TOLF VOL, OLL MIN — thad er stysta leidin ad thvi astandi thar sem
     tolurnar tvaer (15-12=3 og 12-12=0) segja SITTHVAD. Snakk-rodin
     sjalf er maeld i kafla 1 og 16; hér er hun ekki til umraedu. */
  for (let i = 0; i < 12; i++) {
    live.secondDraft.picks.push({
      ...mkPick(i + 1, POOL[70 + i]), round: i + 1, draft_slot: MY_SLOT,
    });
  }
  const root = await boot();
  await go("team7", 200);
  await go(`https://sleeper.com/leagues/${LEAGUE_B_ID}/predraft`, 200);
  await waitFor(() => /rules imported/i.test(text()), 5000);
  await go(MOCK_D, 300);
  await waitFor(() => draftedOnScreen() === 12, 8000);
  await settle(400);
  const flat = () => text().replace(/\s+/g, " ");

  ok(rosterCount() === 12, `forsenda: hopurinn ber 12 vol (${rosterCount()})`);
  const m = /You have (\d+) picks? left and still need ([^.]+)\./.exec(flat());
  ok(!!m, `kassinn ber K/DST-linuna (${m ? m[0] : "engin"})`);
  ok(m && Number(m[1]) === 3,
    `og talan er 3 (15 umferdir - 12 vol), ekki 0 ur 12-umferda deildinni (fann ${
      m ? m[1] : "?"})`);
  /* OG BYRJUNARSAETIN KOMU LIKA UR DRAFTINU — `slots_*` eru i svarinu,
     svo linan vid ljosid segir "all read from this draft". */
  ok(/the starting slots all read from this draft/.test(flat()),
    "og byrjunarsaetin lasust ur `slots_*` draftsins");
  /* Mock-id ber `slots_k: 1` og `slots_def: 1`, svo thorfin er raunveruleg
     — an theirra vaeri fullyrdingin ofar uppfyllt af deildinni. */
  ok(m && /K/.test(m[2]) && /DST/.test(m[2]),
    `og thorfin sjalf er K og DST ur draftinu (${m ? m[2] : "?"})`);

  /* ============================================================
     OG OPORAD EIGID VAL TELUR MED — ThAD GERDI ThAD EKKI
     ============================================================
     Bordid ber ~1.130 leikmenn af ~11.400 hja Sleeper, svo djupt eigid
     val fer i `unmatched.mine` og HVERGI annad. Appid taldi thau ThEGAR
     i valnumerid (`offBoard` -> `pickNo`, kafli 5) en EKKI i hopinn, svo
     `picksLeft = rounds - roster.length` sagdi EINU VALI FLEIRA en eg a
     — og `mustFillUrgent` (`picksLeft <= needed + 1`) kviknadi UMFERD OF
     SEINT. Sami toluflutningur, sama heimild, onnur notkun.

     Fullyrdingin er a TOLUNNI A SKJANUM og hun er ADGREINANLEG: 3 an og
     2 med, i sama drafti, i sömu keyrslu.                           */
  live.secondDraft.picks.push({
    player_id: "99991313", picked_by: "u7", roster_id: MY_SLOT,
    round: 13, draft_slot: MY_SLOT, pick_no: 13, is_keeper: null,
    metadata: { first_name: "Deep", last_name: "Own", position: "RB", team: "SF" },
  });
  await waitFor(() => /not on this board/i.test(text()), 5000);
  await settle(400);
  ok(/1 of them yours/i.test(flat()),
    "oporada valid er skrad sem MITT (annars maelir kaflinn ekkert)");
  ok(rosterCount() === 12,
    `bordid thekkir enn adeins 12 (${rosterCount()}) — thad er einmitt vandinn`);
  const m2 = /You have (\d+) picks? left and still need ([^.]+)\./.exec(flat());
  ok(!!m2, `kassinn ber linuna enn (${m2 ? m2[0] : "engin"})`);
  ok(m2 && Number(m2[1]) === 2,
    `og talan er nu 2, ekki 3 — oporada valid telur MED (fann ${m2 ? m2[1] : "?"})`);

  /* ============================================================
     OG MAELDA FORSKOTID VAR EIGNAD RANGRI DEILD
     ============================================================
     `ImportedRules` ber DEILDINA i hausnum (`imported.*`) medan
     `MeasuredEdge` reiknar ur `board.league`, sem er DRAFTID thegar
     draft er tengt. Þessi svidsmynd er nakvaemlega thad: deildin B er
     **14 lid, half-PPR, eitt FLEX** og mock-id er **10 lid, PPR, tvo
     FLEX**. Setningin endar a "in this exact league shape" og talan var
     +186,1 (10-lida 2FLEX PPR) — medan deildin i hausnum a +147,4
     (12-lida half i toflunni). Yfirmat sem er birt SEM MAELING.

     Rettingin FULLYRDIR EKKI hvor logunin se "rett" — hun nefnir BADAR,
     thvi thad er thad sem vid vitum.                                 */
  ok(/This shape.{0,4} is the draft.s, not the league.s/.test(flat()),
    "rettingin stendur vid setninguna (logunin er DRAFTSINS)");
  ok(/10-team 2flex, ppr/.test(flat()),
    `og logun DRAFTSINS er nefnd ("${
      (/measured in [^;]{0,32}/.exec(flat()) || ["-"])[0]}")`);
  ok(/14-team std, half/.test(flat()),
    `og logun DEILDARINNAR lika ("${
      (/box above is [^.]{0,32}/.exec(flat()) || ["-"])[0]}")`);
  ok(!junk(), `ekkert NaN/undefined (${junk() || "-"})`);
  root.unmount();
}

/* ============================================================
   17. EITT REIT, FJOGUR FORM, EINN SMELLUR
   ============================================================
   BEIDNI NOTANDANS 19.8.2026: "eg vill bara hafa eitt plass til ad
   paista (ma gera league id eda allt url), og svo connect button sem
   tengir allt". Spjaldid bar sex styringar.

   ÞETTA ER VORDURINN A LOFORDINU, og hann hefur ThRJA HLUTA sem hver
   getur brugdist einn:

     (a) OLL FJOGUR FORMIN fara gegnum SAMA reit. Þetta er ekki eitt
         prof heldur fjogur: `parseSleeperInput` ber sitthvert mynstur
         fyrir `/leagues/{id}`, `/draft/nfl/{id}` og bert audkenni, og
         bert audkenni er TVIRAETT (deildar- og draft-id eru bædi 19
         stafa snjokorn), svo `sleeperResolve` reynir BADAR leidir. Þrju
         af fjorum vaeru "nanast rett" og hann myndi lima inn thad
         fjorda.
     (b) EINN SMELLUR TENGIR **OG** SAMSTILLIR. Fullyrdingin er ad
         volin komi a bordid an thess ad neitt annad se yttt — og hun er
         profud i BADAR ATTIR: engin annar hnappur ma vera til sem hana
         gaeti uppfyllt (`!btn(/live sync/)`), annars vaeri hun sonn af
         thvi ad profid hefdi ytt a hann ohaldid.
     (c) SPJALDID BER EITT TEXTAREIT, EKKI SEX. Talid, ekki skodad:
         thekja er fullyrding (CLAUDE.md 5b). Vaeri "Draft ID" settur
         inn aftur sem "thaegindi" fellur thetta.                     */
console.log("\n17. eitt reit — fjogur form, einn smellur");
{
  const connectPanel = () => [...document.querySelectorAll(".panel")]
    .find((p) => /Connect your Sleeper draft/.test(
      p.querySelector("h2")?.textContent || "")) || null;

  const FORMS = [
    ["deildarslod",     `https://sleeper.com/leagues/${LEAGUE_ID}/predraft`],
    ["draft-slod",      `https://sleeper.com/draft/nfl/${DRAFT_ID}`],
    ["bert deildar-id", LEAGUE_ID],
    ["bert draft-id",   DRAFT_ID],
  ];

  for (const [name, value] of FORMS) {
    live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
    const root = await boot();
    for (let n = 1; n <= 9; n++) pushPick(n);

    /* (c) EITT TEXTAREIT — talid ADUR en nokkud er tengt. */
    const panel = connectPanel();
    const texts = [...panel.querySelectorAll("input")]
      .filter((i) => (i.getAttribute("type") || "text") === "text");
    ok(texts.length === 1,
      `${name}: spjaldid ber EITT textareit (${texts.length}: ${
        texts.map((i) => (i.closest("label")?.textContent || "?").trim()).join(" | ")})`);
    const acts = [...panel.querySelectorAll("button")]
      .filter((b) => !b.classList.contains("chip"))
      .map((b) => (b.textContent || "").trim());
    ok(acts.length === 2 && /^Connect/.test(acts[0]) && /^Reset/.test(acts[1]),
      `${name}: og TVO hnappa — Connect og Reset (${acts.join(" | ")})`);

    /* (a) + (b): eitt gildi, einn smellur. */
    ok(await go(value, 250), `${name}: reiturinn tok vid gildinu`);
    const arrived = await waitFor(() => draftedOnScreen() === 9, 8000);
    ok(arrived,
      `${name}: 9 vol komu a bordid AN annars smells (${draftedOnScreen()})`);
    ok(conn() === "good", `${name}: og ljosid er graent (fann "${conn()}")`);
    /* Hin attin a (b): hnappurinn sem hefdi getad gert thetta er EKKI til. */
    ok(!btn(/live sync|Stop syncing/i),
      `${name}: og enginn serstakur samstillingar-hnappur er til`);
    ok(!junk(), `${name}: ekkert NaN/undefined (${junk() || "-"})`);
    /* `pull()` getur verid I LOFTINU thegar hlutnum er slitid og setur tha
       astand a hlut sem er farinn — React kvartar ("not wrapped in
       act"). Vid latum hana lenda fyrst; annars fyllist logginn af
       vidvorunum sem hafa ekkert ad gera med thad sem er maelt. */
    await settle(80);
    await act(async () => { root.unmount(); });
  }

  /* FIMMTA FORMID — NOTANDANAFN. Þad er varaleid (sja `looksLikeName`),
     svo thad tengir ekki sjalft: thad skilar deildunum sem chip. Krafan
     er ad SAMI reitur taki vid thvi og ad audkennid se vistad, thvi thad
     er thad eina sem `resolveSlot` getur notad. */
  {
    live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
    const root = await boot();
    await go("team7", 250);
    const stored = JSON.parse(localStorage.getItem("nfl_sleeperUser") || "null");
    ok(stored && stored.userId === "u7" && stored.name === "team7",
      `notandanafn: sami reitur leysti thad og audkennid er vistad (${
        stored ? stored.name + "/" + stored.userId : "ekkert"})`);
    await settle(80);
    await act(async () => { root.unmount(); });
  }
}

/* ============================================================
   18. SAETID ER LEST UR DRAFTINU — OG ERFIST ALDREI MILLI THEIRRA
   ============================================================
   ÞETTA ER ALVARLEGASTA VILLAN SEM FANNST I VIKUNNI OG HUN VAR THOGUL A
   VERSTA MOGULEGA HATT: appid syndi notandanum HOP ANNARS MANNS undir
   heitinu "My team" og gaf sidan rad ut fra honum.

   Hann tengdi nytt mock (KanelGifler, saeti 7) og bordid syndi lid 5 —
   Daniels, Taylor, Etienne, Walker, Harvey, Price, Love, Metcalf,
   Pittman, Waddle, Robinson, Henry, Kincaid, Myers, Detroit. I FYRRA
   mock-inu var hann saeti 5, og `sync` er vistad a DEILDINNI, svo nytt
   draft i somu deild ERFDI saetid: `slot: slot != null ? slot : sync.slot`.

   ÞRJAR ADRAR VILLUR SEM HANN MELDI SAMA DAG VORU SAMA VILLAN:
     · "10 WR i rod" — `recommend` fekk hop saetis 5 (sex RB, thunnt i
       WR), svo hun radlagdi WR eftir WR. Rett svar um RANGAN hop.
     · "still need K and DST" i 14. umferd — lid 5 tok K i 14.6 og DEF i
       15.5, svo hopurinn sem var lesinn hafdi RAUNVERULEGA hvorugt.
     · "radlagdi ADRA vorn" — sama: lid 5 atti enga vorn tha.
   Fjorar villuskyrslur, ein rot.

   ============================================================
   KAFLINN VAR ENDURSKRIFADUR 20.8.2026 — OG ASTAEDAN ER VERDMAET
   ============================================================
   Hann fullyrti adur ad nytt mock an saeta-heimildar gefi TOMAN hop og
   spurningu. Þad var rett um thann kóda — og VARD OSATT thegar
   `resolveSeat` fekk leid B (volin): fixture-id ber `picked_by: u5` a
   volum saetis 5, svo appid LEYSIR nu saetid og svarid er 5. Profid fell,
   og thad var RETT hja thvi ad falla: forsendan "saetid er oleysanlegt"
   var ekki lengur til i thvi astandi.

   NOTANDINN BAD NAKVAEMLEGA UM ThETTA: „Nei eg vill ad thu finnir
   slottid mitt, finndu leidir til thess ad lata appid gera thad." Tomur
   hopur med spurningu LYGUR ekki, en hann er ekki svarid — svarid er ad
   LESA saetid. Kaflinn ver thvi nu sterkari eiginleika, i thremur threpum:

     1. draft A: hann er `u5` og situr i saeti 5 -> nofn saetis 5 i hopnum
     2. draft B: SAMI notandi (`u5`) situr i saeti **7** -> hopurinn er
        SAETIS 7 an thess ad neitt se slegid inn, og nofn saetis 5 UR
        DRAFTI B eru hvergi. Þetta er hans eigin saga: saeti 5, sidan 7.
     3. draft C: hann eigir ENGIN vol og engin rod er dregin -> tha, og
        ADEINS tha, er spurt

   Þrep 2 er thad sem villan hefdi fallid a i BADA attir: erft saeti gaefi
   5, og "spyrja alltaf" gaefi tomt. Adeins rett svar gefur nofn saetis 7.
   Þrep 3 ver ad leidin se ekki ord i eyra: `resolveSeat` verdur ad skila
   `null` thegar engin heimild er til, i stad thess ad giska.

   FULLYRT ER UM INNIHALD HOPSINS, EKKI UM TOLUNA. Saeti 5 er gilt saeti i
   10-lida drafti, svo `slotOk` gat ekki kviknad og "Slot N does not
   exist" birtist aldrei. Talan 5 var i alla stadi truverdug; thad sem var
   rangt voru NOFNIN — og thad var thad sem hann sa.                    */
console.log("\n18. saetid les sig ur draftinu — og erfist aldrei milli theirra");
{
  const MOCK_B_ID = "8888777766665555";
  const MOCK_C_ID = "8888777766664444";
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();

  const myTeamPanel = () => [...document.querySelectorAll(".panel")]
    .find((p) => /^My team$/.test(p.querySelector("h2")?.textContent || "")) || null;
  const inMyTeam = (nm) => (myTeamPanel()?.textContent || "").includes(nm);
  const slotField = () => [...document.querySelectorAll("label.field")]
    .find((l) => /Your slot/i.test(l.textContent || ""))?.querySelector("input");
  const flat = () => text().replace(/\s+/g, " ");

  /* ---- 1. draft A: saeti 5 valid MED SMELLI, og hopurinn fyllist ---- */
  await connectAndSync({ slot: 5 });
  for (let n = 1; n <= 20; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 20, 8000);
  await settle(250);
  /* Vol 5 og 16 tilheyra saeti 5 i 10-lida snakki (umferd 2 er andhverf). */
  const a5 = [POOL[4].name, POOL[15].name];
  ok(slotOfPick(5).slot === 5 && slotOfPick(16).slot === 5,
    "vol 5 og 16 eru saetis 5 (sjalfstaed snakk-vorpun)");
  ok(inMyTeam(a5[0]) && inMyTeam(a5[1]),
    `draft A: hopurinn ber bædi vol saetis 5 (${a5.join(", ")})`);
  ok(rosterCount() === 2, `og telur tvo (${rosterCount()})`);
  /* Smellurinn kenndi appinu hver hann er — thad er forsenda threps 2 og
     hun er FULLYRD, ekki gefin ser: vaeri audkennid ekki vistad gaeti
     leid B ekki fundid neitt og threp 2 vaeri uppfyllt af tilviljun. */
  const uid = () => {
    try { return (JSON.parse(localStorage.getItem("nfl_sleeperUser") || "null") || {}).userId; }
    catch { return null; }
  };
  ok(uid() === "u5", `og audkennid er vistad (${uid() || "ekkert"})`);

  /* ---- 2. draft B: SAMI MADUR, ANNAD SAETI ----
     Mock: engin `league_id`, engin `draft_order`, ekkert
     `slot_to_roster_id` — svo leidir A og C geta EKKERT. Eina heimildin
     eru volin, og thau bera `picked_by: "u5"` a saeti **7**. Nakvaemlega
     hans saga: hann flutti ur saeti 5 i saeti 7. */
  const mkPickAs = (no, player, uidAt7) => {
    const p = mkPick(no, player);
    return { ...p, picked_by: p.draft_slot === 7 ? uidAt7 : `bot${p.draft_slot}` };
  };
  live.secondDraft = {
    draft: { draft_id: MOCK_B_ID, league_id: null, status: "drafting", type: "snake",
             season: "2026", draft_order: null, slot_to_roster_id: null,
             metadata: { scoring_type: "ppr" },
             settings: { teams: TEAMS, rounds: ROUNDS } },
    picks: [],
  };
  for (let n = 1; n <= 20; n++) {
    live.secondDraft.picks.push(mkPickAs(n, POOL[40 + n], "u5"));
  }
  const b5 = [POOL[45].name, POOL[56].name];      // vol 5 og 16 = saeti 5
  const b7 = [POOL[47].name, POOL[54].name];      // vol 7 og 14 = saeti 7
  ok(slotOfPick(7).slot === 7 && slotOfPick(14).slot === 7,
    "og vol 7 og 14 eru saetis 7");

  await go(MOCK_B_ID, 250);
  await waitFor(() => draftedOnScreen() === 20, 8000);
  await settle(400);
  /* ÞETTA ER FULLYRDINGIN SEM BEIDNIN KALLADI A: engin innslattur, og
     samt RETT saeti — i mock-i, thar sem gamla leidin hafdi ekkert. */
  ok(inMyTeam(b7[0]) && inMyTeam(b7[1]),
    `draft B: hopurinn er SAETIS 7 an ad neitt se slegid inn (${b7.join(", ")})`);
  ok(!inMyTeam(b5[0]) && !inMyTeam(b5[1]),
    `og hopur SAETIS 5 er hvergi i "My team" (${b5.join(", ")})`);
  ok(rosterCount() === 2, `og telur tvo, ekki noll og ekki fjora (${rosterCount()})`);
  ok(slotField() == null || Number(slotField().value) === 7,
    `saetis-reiturinn ber 7 se hann til (${
      slotField() ? `"${slotField().value}"` : "hann er ekki synilegur"})`);
  /* OG LEIDIN ER NEFND. Þogult rett svar og thogult rangt svar lita eins
     ut — thad var astandid sem let hann drafta sem saeti 5. */
  ok(/read from your own picks/i.test(flat()),
    `og appid SEGIR hvadan saetid kom ("${
      (/read from [a-z ]+/i.exec(flat()) || ["ekkert"])[0]}")`);

  /* ---- 3. draft C: ENGIN heimild -> ThA er spurt ----
     Sama mock-logun, en volin eru ALLT ANNARRA (`bot*`), svo leid B
     finnur ekkert og hinar tvaer eiga ekkert. Þetta threp ver ad leidin
     se raunveruleg uppfletting og ekki „skila alltaf einhverju". */
  live.secondDraft = {
    draft: { draft_id: MOCK_C_ID, league_id: null, status: "drafting", type: "snake",
             season: "2026", draft_order: null, slot_to_roster_id: null,
             metadata: { scoring_type: "ppr" },
             settings: { teams: TEAMS, rounds: ROUNDS } },
    picks: [],
  };
  for (let n = 1; n <= 20; n++) {
    live.secondDraft.picks.push(mkPickAs(n, POOL[60 + n], "nobody"));
  }
  await go(MOCK_C_ID, 250);
  await waitFor(() => draftedOnScreen() === 20, 8000);
  await settle(400);
  ok(rosterCount() === 0,
    `draft C: engin heimild -> hopurinn er TOMUR, ekki agiskadur (${rosterCount()})`);
  ok(!!slotField() && slotField().value === "",
    `og saetis-reiturinn er TOMUR, ekki 7 ("${
      slotField() ? slotField().value : "vantar"}")`);
  ok(/reads itself from your first pick/i.test(flat()),
    "og appid segir ad thad lesi saetid ur fyrsta vali hans — ekki bara \"slaðu thad inn\"");
  ok(!/read from your own picks/i.test(flat()),
    "og fullyrdir ekki lengur ad thad hafi lesid thad (leidin fylgir svarinu)");

  /* ---- 4. handvirkt saeti gengur enn — og VOLIN LEIDRETTA ThAD ----
     Þetta er sterkasti eiginleiki leidarinnar og hann var OASSERADUR i
     fyrstu utgafu: stokkbreyting sem tok yfirskriftina ur `pull`
     (`curSlot == null` eitt) LIFDI oll profin. Fullyrding sem ekkert
     maelir er ekki vordur (CLAUDE.md 5b).

     RANGT SAETI SEM LITUR TRUVERDUGT UT er nakvaemlega thad sem kostadi
     hann mock-draftid: 3 er gilt saeti i 10-lida drafti, svo `slotOk`
     kviknar ekki og ekkert segir fra. Adur stod slikt saeti ALLT
     DRAFTID. Nu laeknast thad vid FYRSTA val hans — og skiptin eru
     SOGD, thvi thogul leidretting er sami othekkjanleiki i hina attina.

     ÞAD ER UNDANTEKNING FRA "HANDVIRKT SLAER SJALFVIRKT" og hun er
     visvitandi: `draft_order` og deildin fa ALDREI ad yfirskrifa
     innslegid saeti (thau eru stillingar), en vol sem eru SKRAD A MIG
     eru sonnunargagn og thau mega. Hin attin er profud beint fyrir
     nedan, thvi an hennar vaeri "volin vinna" uppfyllanlegt med "allt
     vinnur" — sem vaeri ad henda svari notandans.                    */
  const c3 = [POOL[63].name, POOL[78].name];      /* vol 3 og 18 = saeti 3 */
  const c7 = [POOL[67].name, POOL[74].name];      /* vol 7 og 14 = saeti 7 */
  ok(slotOfPick(3).slot === 3 && slotOfPick(18).slot === 3
     && slotOfPick(7).slot === 7 && slotOfPick(14).slot === 7,
    "vol 3/18 eru saetis 3 og 7/14 eru saetis 7 (sjalfstaed vorpun)");
  await setInput("Your slot", "3");
  await settle(300);
  ok(inMyTeam(c3[0]) && inMyTeam(c3[1]),
    `innslegid saeti gengur afram sem SIDASTA urraedi (${c3.join(", ")})`);
  ok(!/read from/i.test(flat()),
    "og thad er EKKI merkt sem lesid — innslattur er innslattur");

  /* ---- STILLING MA ALDREI YFIRSKRIFA INNSLATT ----
     ÞETTA VERDUR AD KOMA HER, ADUR EN VOLIN LEYSA SAETID. Fyrsta utgafan
     profadi thad EFTIR a og su fullyrding gat ekki brugdist: tha var leid
     B thegar buin ad svara, svo `draft_order` var aldrei spurd og
     stokkbreyting sem HENTI skilyrdinu alveg LIFDI. Nakvaemlega gildran i
     CLAUDE.md 5b — fullyrding sem tharf tvennt til ad bregdast er
     veikari en hun litur ut fyrir ad vera.

     Her eru volin ENN annarra manna, svo `draft_order` er eina heimildin
     sem gaeti svarad — og hun ma EKKI, thvi 3 er svar notandans.       */
  live.secondDraft.draft = { ...live.secondDraft.draft, draft_order: { u5: 9 } };
  await settle(700);
  ok(!!slotField() && Number(slotField().value) === 3,
    "`draft_order` segir 9 en 3 var slegid inn — stilling yfirskrifar EKKI"
    + ` (${slotField() ? slotField().value : "vantar"})`);
  ok(!/read from/i.test(flat()),
    "og saetid er enn omerkt — stillingin fekk ekki ad eigna ser thad");

  /* Og nu tekur hann sitt fyrsta val. Draftid vissi hvar hann sat allan
     timann; appid vissi thad ekki fyrr en NU. */
  live.secondDraft.picks = live.secondDraft.picks
    .map((p) => (p.draft_slot === 7 ? { ...p, picked_by: "u5" } : p));
  await waitFor(() => /read from your own picks/i.test(flat()), 8000);
  ok(inMyTeam(c7[0]) && inMyTeam(c7[1]),
    `VOLIN LEIDRETTA innslegid saeti: 3 -> 7 (${c7.join(", ")})`);
  ok(!inMyTeam(c3[0]) && !inMyTeam(c3[1]),
    `og hopur saetis 3 er farinn (${c3.join(", ")})`);
  ok(!!slotField() && Number(slotField().value) === 7,
    `reiturinn sjalfur ber nu 7 (${slotField() ? `"${slotField().value}"` : "vantar"})`);
  ok(/read from your own picks/i.test(flat()),
    "og skiptin eru SOGD, ekki thogul");

  /* ---- OG VOLIN HALDA GEGN STILLINGU ----
     `draft_order` stendur enn a 9 (sett ofar) medan volin segja 7. */
  await settle(400);
  ok(!!slotField() && Number(slotField().value) === 7,
    "`draft_order` segir 9 en volin segja 7 — volin halda"
    + ` (${slotField() ? slotField().value : "vantar"})`);
  ok(!junk(), `ekkert NaN/undefined a skjanum (${junk() || "-"})`);

  await settle(80);
  await act(async () => { root.unmount(); });
}

/* ============================================================
   20. TVEIR KOSTIR A SKJANUM — LESNIR AF HONUM, EKKI UR FALLINU
   ============================================================
   `advice.mjs` kafli 15 ver HREINU rokfraedina (tveir kostir, bilid,
   lifun beggja, rodin oskert). Þad prof getur EKKI sagt hvort thad se
   TENGT — og thad er nakvaemlega villan sem thetta verkefni hefur
   endurtekid oftast: markadslidurinn i FPL-appinu var daudur i viku med
   graen prof, og `boardShape` hefdi getad verid hreint fall sem enginn
   kallar.

   Hér er allt lesid AF SKJANUM i lifandi drafti:
     · TVO spjold, ekki eitt og ekki fimm
     · sa fyrri ber "take", sa seinni "or"
     · bilid er a skjanum i VBD (`N VBD behind`)
     · LIFUNARTALA fyrir BADA — thad var motsognin sem hann sa
     · og fyrsta nafnid er SAMA nafn sem rokstudnings-taflan (`take`-rodin,
       rodud eftir VBD) setur fyrst. Vaeri annad saetid latid verda thad
       fyrsta myndi ThESSI fullyrding falla og engin onnur.            */
console.log("\n20. tveir kostir eru a skjanum, og urskurdurinn er oskertur");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  /* Nokkur vol svo bordid se i midju drafti, ekki i vali 1. */
  for (let n = 1; n <= 5; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 5, 6000);
  await settle(300);

  const cards = () => [...document.querySelectorAll(".verdict-name")];
  const cardText = () => cards().map((c) => (c.textContent || "").trim());
  ok(cards().length === 2, `TVO spjold, ekki eitt og ekki fimm (${cards().length})`);

  /* ============================================================
     STJARNAN — OG HVERS VEGNA GAMLA FULLYRDINGIN VAR TOM
     ============================================================
     HER STOD: `/take/.test(card[0]) && /or/.test(card[1])`.

     SEINNI HALFINN VAR SONN UM NAER HVERN LEIKMANN SEM HEITIR EITTHVAD.
     `or` er undirstrengur i Jordan, George, Moore, Gordon, Hollywood,
     Thornton — svo fullyrdingin "sa seinni ber merkimidann or" var i
     raun "seinna nafnid inniheldur bokstafina o og r". Hun hefdi verid
     graen thott merkimidinn hefdi verid fjarlaegdur alveg. Þetta er
     nakvaemlega tom fullyrding i skilningi CLAUDE.md 5b — og hun var i
     safninu sem a ad verja kassann.

     ÞVI ER LESID UR HNUTUM OG EKKI UR TEXTA:
       · `.verdict-star` er TALIN i ollum kassanum og verdur ad vera 1
       · merkimidarnir eru lesnir sem NAKVAEM jafngildi ("take"/"backup")
       · og `.verdict.backup` verdur ad vera a seinni EN EKKI a fyrri —
         sjonraeni munurinn er thridji axinn og hann er profadur.       */
  const starEls = () => [...document.querySelectorAll(".verdict-star")];
  ok(starEls().length === 1,
    `NAKVAEMLEGA EIN stjarna i kassanum (${starEls().length}) — ` +
    "tvaer stjornur eda engin svara ekki spurningunni \"hvor er hvor\"");
  const badgeOf = (c) => (c.querySelector(".badge")?.textContent || "").trim();
  ok(badgeOf(cards()[0]) === "take",
    `fyrri merkimidinn er NAKVAEMLEGA "take" ("${badgeOf(cards()[0])}")`);
  ok(badgeOf(cards()[1]) === "backup",
    `seinni er NAKVAEMLEGA "backup", ekki "or" ("${badgeOf(cards()[1])}")`);
  /* Kassarnir sjalfir (`.verdict`), ekki nafnalinan. */
  const boxes = [...document.querySelectorAll(".verdict")]
    .filter((b) => b.querySelector(".verdict-name"));
  ok(boxes.length === 2 && !boxes[0].classList.contains("backup")
     && boxes[1].classList.contains("backup"),
    "og SJONRAENI munurinn er a seinni kassanum, ekki a fyrri "
    + `(${boxes.map((b) => b.className).join(" | ")})`);
  /* Stjarnan er a FYRRI kassanum — ekki bara einhvers stadar. */
  ok(cards()[0].querySelector(".verdict-star")
     && !cards()[1].querySelector(".verdict-star"),
    "stjarnan er a FYRRI kassanum og hvergi annars stadar");

  const whys = [...document.querySelectorAll(".verdict-why")]
    .map((d) => (d.textContent || "").replace(/\s+/g, " ").trim());
  ok(whys.length === 2, `og badir bera sina astaedu (${whys.length})`);
  ok(/VBD behind him/.test(whys[1] || ""),
    `bilid er a skjanum i VBD ("${(whys[1] || "").slice(0, 70)}")`);
  /* LIFUN BEGGJA. Talan er i orðum ("likely to") vid BADA — hun var adur
     adeins vid thann eina sem var valinn, sem er einmitt hvernig 95%
     gat lesist eins og ROKSTUDNINGUR fyrir hann. */
  const lastsCount = whys.filter((t) =>
    /likely to still be there|likely to last|coin toss|no ADP for him/.test(t)).length;
  ok(lastsCount === 2,
    `lifunartala fyrir BADA, ekki adeins thann sem er valinn (${lastsCount}/2)`);

  /* URSKURDURINN ER OSKERTUR: fyrsta nafnid er sama nafn sem
     rokstudnings-taflan setur fyrst (hun er rodud eftir VBD). */
  const openTable = async () => {
    const sum = [...document.querySelectorAll("details.reasoning summary")]
      .find((x) => /Why him/.test(x.textContent || ""));
    if (sum) await click(sum, 120);
  };
  await openTable();
  const reasonTable = [...document.querySelectorAll("table.data")]
    .find((t) => /Lasts\?/.test(t.querySelector("thead")?.textContent || "")) || null;
  const firstRanked = reasonTable
    ? (reasonTable.querySelector("tbody tr td.frozen")?.textContent || "")
        .replace(/^take/, "").trim()
    : null;
  /* ============================================================
     NAFNID ER LESID UR ÞEIM KASSA SEM BER STJORNUNA
     ============================================================
     ÞETTA ER HARDA SKILYRDID og thad er hert her viljandi. Adur var
     lesid ur "kassa nr. 1" — sem er rett svo lengi sem stjarnan situr
     a kassa nr. 1, en ThAD var ekki fullyrt. Nu er nafnid tekid ur
     ThEIM kassa sem BER stjornuna og bordid vid maeldu rodina tvisvar
     (rokstudnings-toflu OG bordid sjalft), svo:

       · vaeri stjarnan faerd a varamanninn -> ThETTA fellur
       · vaeri kossunum vixlad             -> ThETTA fellur
       · vaeri rodinni sjalfri breytt      -> ThETTA fellur

     Birtingar-breyting getur thvi ekki thegjandi yfirtekid maelda rod,
     og "stjarnan a maelda besta" er nu FULLYRDING og ekki asetningur. */
  const starredCard = cards().find((c) => c.querySelector(".verdict-star")) || cards()[0];
  const firstCard = (starredCard.textContent || "")
    .replace(/^\s*★?\s*take/, "").trim();
  ok(!!firstRanked, `rokstudnings-taflan er lesin (${firstRanked || "ekkert"})`);
  ok(firstRanked && firstCard.includes(firstRanked),
    `STJORNUMERKTA spjaldid er MAELDA rodin (spjald "${firstCard}" gegn toflu "${firstRanked}")`);

  /* ============================================================
     OG SAMA SPURNING UM OBUNDNA LEID: BORDID SJALFT
     ============================================================
     Fullyrdingin hér fyrir ofan ber spjaldid vid rokstudnings-tofluna —
     en BADAR eru teiknadar ur `rec.picks` i SAMA hlut (`NextPick`). Þaer
     geta thvi ekki greint a milli "rodin heldur" og "sami listi tvisvar".
     Ef birting nr. 2 tekur einn dag yfir rodina fylgir taflan med og
     kaflinn helst graenn — nakvaemlega "tvaer utfaerslur af somu reglu
     sem eru bædi skakkar eru graenar saman" (kafli 21).

     BORDID er onnur leid: `shown` -> `BoardTable`, annar hlutur, onnur
     tafla, radad eftir `aRank` i `DraftBoard` sjalfu. Se fyrsta spjaldid
     ekki fyrsta rod bordsins hefur BIRTING yfirtekid MAELDA ROD, og thad
     er thad eina sem thessi lota matti ekki gera.

     `avail: 0` ER TEKINN UT UR RADGJOFINNI (advice.mjs kafli 14) EN
     STENDUR A BORDINU — sa madur BER tolu, hun er bara ekki kaup. Fyrsta
     rodin sem radgjofin getur nefnt er thvi fyrsta rodin AN `badge bad`
     (thad er merkid sem `avail === 0` teiknar). Vaeri thetta ekki sift
     vaeri kaflinn flokkandi: hann myndi fella rettan kod um leid og
     meiddur madur raddist efst.                                       */
  const firstDraftable = boardRows()
    .find((tr) => !tr.querySelector("td.frozen .badge.bad"));
  const firstBoard = firstDraftable
    ? (firstDraftable.querySelector("td.frozen")?.textContent || "")
        .replace(/\s*(R|Out|IR|Q|D|PUP|Sus|NA)$/, "").trim()
    : null;
  ok(!!firstBoard, `bordid er lesid, obundid (${firstBoard || "ekkert"})`);
  ok(firstBoard && firstCard.includes(firstBoard),
    `fyrsta spjaldid ER fyrsta rod BORDSINS — birting yfirtok ekki rodina `
    + `(spjald "${firstCard}" gegn bordi "${firstBoard}")`);
  /* Og hausinn nefnir enn urskurdinn — hann er ekki ordinn matsedill. */
  ok(/take this/.test(text()), "hausinn segir enn \"take this\" um thann fyrsta");
  ok(!junk(), `ekkert NaN/undefined (${junk() || "-"})`);

  await settle(60);
  await act(async () => { root.unmount(); });
}

/* ============================================================
   21. HEILT MOCK KEYRT EFTIR RADGJOF APPSINS — OG HOPURINN VERDUR
       AD VERA UPPSTILLANLEGUR
   ============================================================
   ÞETTA ER PROFID SEM HEFDI FANGAD ÞAD SEM KOM FYRIR HANN.

   Hann keyrdi mock og FOR EFTIR HVERRI RADLEGGINGU. Nidurstadan var
   tiu WR, tveir TE, einn QB, tvaer varnir — og **ENGINN RB, ENGINN
   SPYRNUMADUR**. Þrju byrjunarsaeti tom, sidasta lid af tiu, 215 stigum
   undir. Tveir RB sem voru A BORDINU i hans eigin volum (2.4 og 4.4)
   hefdu gert hann fyrstan.

   ENGIN FULLYRDING GAT FANGAD THAD, og astaedan er ein: HVERT EINASTA
   fixture i thessu safni gaf appinu RETTA hopinn. Adrir kaflar profa
   valnumer, snakk-vorpun, litina, thekjuna — en enginn profadi
   NIDURSTODUNA af thvi ad fara eftir radgjofinni. Kafli 18 ver
   identitetid (hvers hopur er lesinn); thessi kafli ver AFLEIDINGUNA
   (hvad hopurinn verdur ad ef thu ferd eftir radinu).

   ÞETTA ER EKKI HERMUN A RADGJOFINNI — ÞAD ER HUN SJALF. Vid hvert
   eitt af 15 volum saetis 7 er nafnid LESID AF SKJANUM (`.verdict-name b`,
   sama hnutur sem kafli 20 les) og THAD nafn er valid. Ekkert i profinu
   veit hvernig `recommend` vinnur; thad les urskurdinn og hlydir honum,
   nakvaemlega eins og notandinn gerdi.

   BOTARNIR VELJA EFTIR ADP, sem er thad sem Sleeper-botar gera. Þad er
   ekki smekkur heldur forsenda: laug sem er valin til ad THVINGA RB-skort
   (eda til ad forda honum) vaeri profid ad svara sinni eigin spurningu.
   ADP-rodin gefur lika K og DST sinn raunverulega stad — sjo varnir og
   sex spyrnumenn eru innan fyrstu 150 valanna — svo K/DST-saetin eru
   raunverulega i haettu, eins og thau voru hja honum.

   LOGUNIN ER HANS: 10 lid, 15 umferdir, full PPR, og
   `roster_positions` deildarinnar gefur QB1 RB2 WR2 TE1 FLEX2 K1 DST1.

   UPPSTILLANLEIKINN ER REIKNADUR HER, EKKI FLUTTUR INN. `optimalLineup`
   i `lineup.js` svarar somu spurningu — og thess vegna ma hun ekki vera
   svarid: tvaer utfaerslur af somu reglu sem eru bædi skakkar eru graenar
   saman. Talningin er lesin AF SKJANUM (`My team`-spjaldid ber "RB 2/2")
   og FLEX-saetin eru reiknud ur afgangnum.

   OG ÞETTA MA EKKI VERDA ROD I DULARGERVI: bradanauðsyn sem ROD er
   MAELD OG HAFNAD (`urgencyDrivesOrder: false`, -60,06 i standard, 0 af
   5 arum). Fælli thessi kafli MED rettum hop vaeri thad NY VISBENDING
   gegn maeldri niðurstodu — tilefni til ad maela upp a nytt, ekki til ad
   endurraða listanum svo profid verdi graent.                        */
console.log("\n21. heilt mock eftir radgjof appsins — hopurinn verdur ad vera uppstillanlegur");
{
  /* ---- laugin: OLL stodur, i ADP-rod, einkvaem nofn ----
     `POOL` ofar sleppir K og DST (adrir kaflar tharfnast theirra ekki),
     en HER eru thau kjarninn i spurningunni: tvo af thremur tomu
     saetunum hans voru K og DST. */
  const FULL = players
    .filter((p) => p.adpSleeper != null && nameCount.get(p.name) === 1)
    .sort((a, b) => a.adpSleeper - b.adpSleeper)
    .slice(0, TOTAL + 60);
  const kAdp = FULL.filter((p) => p.pos === "K").length;
  const dAdp = FULL.filter((p) => p.pos === "DST").length;
  ok(FULL.length >= TOTAL + 20 && kAdp >= 3 && dAdp >= 3,
    `laugin ber ${FULL.length} menn, thar af ${kAdp} K og ${dAdp} DST` +
    " — annars vaeri K/DST-saetid oleysanlegt af gagnaskorti, ekki af radgjof");
  /* Uppflettingin sem gerir "hlyda urskurdinum" mogulega: appid ma
     radleggja HVERN SEM ER ur `players.json`, ekki adeins ur lauginni. */
  const byName = new Map();
  for (const p of players) if (nameCount.get(p.name) === 1) byName.set(p.name, p);

  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  await settle(200);

  /* Deildin VERDUR ad bera hans logun, annars er kaflinn ad maela adra
     spurningu. Lesid af skjanum ur `My team`-spjaldinu sjalfu. */
  const myPanel = () => [...document.querySelectorAll(".panel")]
    .find((p) => /^My team$/.test(p.querySelector("h2")?.textContent || "")) || null;
  /* "RB 2/2" -> { RB: { have: 2, need: 2 } }. Sama hnut sem berst
     notandanum; `warn`-stillinn a tolunni er hitt merkid. */
  const rosterByPos = () => {
    const out = {};
    for (const d of myPanel()?.querySelectorAll(".dimmer") || []) {
      /* FLEX OG SUPERFLEX ERU MED FRA 24.8.2026. Spjaldid teiknadi
         thau ekki adur — sja notuna vid `wideSlots` i `DraftBoard.jsx`:
         tvo af ellefu byrjunarsaetum hofdu enga rod, svo "RB 2/2" las
         graent medan tvo saeti voru tom. */
      const m = /^(QB|RB|WR|TE|K|DST|FLEX|SUPERFLEX)\s+(\d+)\s*\/\s*(\d+)$/
        .exec((d.textContent || "").replace(/\s+/g, " ").trim());
      if (m) out[m[1]] = { have: Number(m[2]), need: Number(m[3]),
                           warn: !!d.querySelector(".warn") };
    }
    return out;
  };
  const NEED = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1, FLEX: 2 };
  {
    const seen = rosterByPos();
    /* `FLEX` ER EKKI LENGUR UNDANSKILID. Adur stod hér
       `.filter((p) => p !== "FLEX")` af theirri einfoldu astaedu ad
       spjaldid teiknadi enga FLEX-rod — svo undantekningin i profinu
       VAR bilunin, skjalfest sem asetningur. Nu er hun krofd, og
       thetta er thvi vordurinn a thvi ad rodin se yfirleitt teiknud. */
    const shape = Object.keys(NEED).every((p) => seen[p] && seen[p].need === NEED[p]);
    ok(shape,
      `deildin ber HANS logun — QB1 RB2 WR2 TE1 FLEX2 K1 DST1 (${
        Object.entries(seen).map(([k, v]) => `${k} ${v.need}`).join(" ")})`);
  }

  /* ---- keyrslan ---- */
  const taken = new Set();
  const botPick = () => FULL.find((p) => !taken.has(p.id)) || null;
  const mineTaken = [];
  let stalled = null;

  for (let n = 1; n <= TOTAL; n++) {
    if (slotOfPick(n).slot !== MY_SLOT) {
      const b = botPick();
      if (!b) { stalled = `laugin thraut i vali ${n}`; break; }
      taken.add(b.id);
      live.picks.push(mkPick(n, b));
      continue;
    }
    /* MITT VAL. Bordid verdur fyrst ad hafa nad theim sem komu a undan —
       urskurdur sem er reiknadur ur GAMLA bordinu vaeri rad um annad
       draft en thad sem er i gangi. */
    const arrived = await waitFor(
      () => draftedOnScreen() === n - 1 && pickHeader() === n, 9000);
    if (!arrived) {
      stalled = `bordid nadi ekki vali ${n} (drafted ${
        draftedOnScreen()}, header ${pickHeader()})`;
      break;
    }
    const nameEl = myPanel() && document.querySelector(".verdict-name b");
    const nm = nameEl ? (nameEl.textContent || "").trim() : "";
    const who = nm ? byName.get(nm) : null;
    if (!who) {
      stalled = `val ${n}: urskurdurinn las "${nm || "ekkert"}"` +
                " og hann er ekki einkvaemur i players.json";
      break;
    }
    if (taken.has(who.id)) {
      stalled = `val ${n}: appid radlagdi "${nm}" sem er ThEGAR farinn`;
      break;
    }
    taken.add(who.id);
    mineTaken.push({ pick: n, name: nm, pos: who.pos });
    live.picks.push(mkPick(n, who));
  }
  ok(!stalled, `draftid rann til enda, 150 vol${stalled ? ` — ${stalled}` : ""}`);

  await waitFor(() => draftedOnScreen() === TOTAL, 12000);
  await settle(400);
  ok(draftedOnScreen() === TOTAL,
    `oll ${TOTAL} volin eru a bordinu (${draftedOnScreen()})`);
  ok(mineTaken.length === ROUNDS,
    `og saeti 7 tok ${ROUNDS} menn, alla eftir urskurdi appsins (${mineTaken.length})`);
  ok(rosterCount() === ROUNDS,
    `hopurinn a skjanum telur ${ROUNDS} (${rosterCount()})`);

  /* ---- OG HER ER SPURNINGIN ---- */
  const seen = rosterByPos();
  const cnt = (p) => (seen[p] ? seen[p].have : 0);
  const miss = [];
  for (const p of ["QB", "RB", "WR", "TE", "K", "DST"]) {
    if (cnt(p) < NEED[p]) miss.push(`${p} ${cnt(p)}/${NEED[p]}`);
  }
  /* FLEX er reiknad ur AFGANGNUM af RB/WR/TE — nakvaemlega reglan sem
     gerir FLEX ad FLEX — og thad er REIKNAD HER, ekki flutt inn, af
     somu astaedu sem haus kaflans gefur: tvaer utfaerslur af somu reglu
     sem eru bædi skakkar eru graenar saman. */
  const spare = ["RB", "WR", "TE"]
    .reduce((a, p) => a + Math.max(0, cnt(p) - NEED[p]), 0);
  if (spare < NEED.FLEX) miss.push(`FLEX ${spare}/${NEED.FLEX}`);

  /* ============================================================
     OG NU SVARAR SPJALDID SOMU SPURNINGU — TVEIR OSHADIR REIKNINGAR
     ============================================================
     FRA 24.8.2026 teiknar `MyRoster` FLEX-rod. Talan i henni er reiknud
     INNI I HLUTNUM (`wideSlots`), og talan hér er reiknud ur hopnum sem
     ThETTA PROF byggdi — tvaer leidir ad somu stadreynd, hvorug flutt
     inn ur annarri. Se thar munur er onnur theirra skokk, og adur var
     ENGIN leid ad sja thad thvi rodin var ekki a skjanum.

     SPJALDID ThAKAR VID ThORFINNI (`min(need, spare)`) thvi thad telur
     SAETI og saeti eru tvo; talan hér er othokud. Þvi er borid vid
     thakid og ekki vid hráa afganginn — annars felldi profid rettan
     kod um leid og hann drafti thridja WR-inn.                       */
  const panelFlex = seen.FLEX || null;
  ok(!!panelFlex, "spjaldid teiknar FLEX-rod (hun var ekki til fyrir 24.8.2026)");
  ok(panelFlex && panelFlex.have === Math.min(NEED.FLEX, spare),
    `og talan i henni stemmir vid afganginn sem ThETTA prof reiknadi — ` +
    `spjald ${panelFlex ? panelFlex.have : "?"}/${NEED.FLEX}, afgangur ${spare}`);

  const shapeLine = ["QB", "RB", "WR", "TE", "K", "DST"]
    .map((p) => `${p} ${cnt(p)}`).join(" · ");
  console.log(`  ·    hopurinn: ${shapeLine} (FLEX-afgangur ${spare})`);
  console.log(`  ·    volin:    ${mineTaken
    .map((m) => `${m.pick}:${m.pos}`).join(" ")}`);

  ok(miss.length === 0,
    `hopurinn er UPPSTILLANLEGUR — hvert byrjunarsaeti fyllt${
      miss.length ? ` — TOM SAETI: ${miss.join(", ")}` : ""}`);
  /* HITT MERKID, LESID AF SKJANUM: spjaldid setur `warn` a tolu sem er
     undir thorf. Tveir oshadir lesarar a sama stadreynd — talan sem eg
     reiknadi og merkid sem NOTANDINN ser. */
  const warned = Object.entries(seen).filter(([, v]) => v.warn).map(([k]) => k);
  ok(warned.length === 0,
    `og spjaldid flaggar engu saeti sem otomu (${warned.join(", ") || "-"})`);
  ok(!junk(), `ekkert NaN/undefined a skjanum (${junk() || "-"})`);

  await settle(80);
  await act(async () => { root.unmount(); });
}

/* ============================================================
   22. "MINE"/"GONE" HVERFA ThEGAR APPID SER ThETTA SJALFT — OG
       KOMA AFTUR ThEGAR ThAD GERIR ThAD EKKI
   ============================================================
   BEIDNI NOTANDANS: "Her vill eg ekki thurfa ad haka hvort i mine eda
   gone, eg vill ad appid sjai thad."

   ÞRJU ASTOND ERU PROFUD, thvi tvo hefdu leyft verstu utkomunni:

     A. engin samstilling      -> BADIR hnappar (handvirkt bord er
                                  studdur hattur — draft an Sleeper)
     B. pollun OG saeti        -> HVORUGUR, og volin skila ser samt i
                                  BADAR attir (`taken` OG hopurinn)
     C. pollun EN ekkert saeti -> `mine` STENDUR, `gone` fer

   C ER KAFLINN SEM SKIPTIR MALI. Appid getur ekki vitad hverjir eru
   HANS an saetis; feldi `mine` thar vaeri hopurinn OSKRAANLEGUR og
   radgjofin laesi tomt lid — nakvaemlega bilunin sem gaf honum
   10 WR / 0 RB. "Faerri hnappar" er thvi ekki markmidid; RETT hnappar er.

   OG BADAR ATTIR ERU LESNAR I B. Fyrri villa i thessu tre lét vol na i
   `taken` en ekki i hopinn sem radgjofin les, svo talan "N drafted" var
   rett medan "My team" var tom. Þess vegna er bædi `yours`-talan OG
   `My team`-spjaldid spurt, ekki adeins ad hnapparnir hafi horfid.   */
console.log("\n22. mine/gone eru sjalfvirk i samstillingu, handvirk an hennar");
{
  const actionCell = () => {
    const rs = boardRows();
    if (!rs.length) return null;
    const tds = rs[0].querySelectorAll("td");
    return tds[tds.length - 1] || null;
  };
  const actBtns = () => [...(actionCell()?.querySelectorAll("button") || [])]
    .map((b) => (b.textContent || "").trim());
  /* ThEKJA: bordid verdur ad vera a skjanum, annars er "engir hnappar"
     satt af tomri astaedu og allur kaflinn les eins og upplysing. */
  const boardUp = () => boardRows().length > 5;

  /* ---- A. ENGIN SAMSTILLING: badir hnappar ---- */
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  let root = await boot();
  await settle(300);
  ok(boardUp(), `ThEKJA/A: bordid er a skjanum an samstillingar (${boardRows().length} radir)`);
  ok(actBtns().join(",") === "mine,gone",
    `A: handvirkt bord ber BADA hnappa ("${actBtns().join(",") || "enga"}")`);
  ok(!/Picks are read from your draft/.test(text()),
    "A: og ENGIN lina fullyrdir um samstillingu sem er ekki til");
  await settle(60);
  await act(async () => { root.unmount(); });

  /* ---- B. POLLUN + SAETI: hvorugur, og volin skila ser i BADAR attir ---- */
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  root = await boot();
  await connectAndSync({ slot: MY_SLOT });
  for (let n = 1; n <= 16; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 16, 8000);
  await settle(300);
  ok(boardUp(), `ThEKJA/B: bordid er a skjanum i samstillingu (${boardRows().length} radir)`);
  ok(actBtns().length === 0,
    `B: HVORUGUR hnappur — appid sér um thetta ("${actBtns().join(",") || "engir"}")`);
  const autoMark = actionCell()?.querySelector("[data-auto]");
  ok(!!autoMark && /auto/.test(autoMark.textContent || ""),
    "B: og holfid er ekki tomt heldur segir \"auto\"");
  ok(/Your draft feeds this board/.test(text()),
    "B: linan segir hvadan volin koma");
  ok(/Nothing to tick/.test(text()), "B: og ad ekkert se ad haka");
  /* BADAR ATTIR — talan OG hopurinn. Saeti 7 a vol 7 og 14 i 10-lida
     snakki (umferd 2 er andhverf), svo tveir eiga ad vera komnir. */
  const mine7 = [POOL[6].name, POOL[13].name];
  ok(slotOfPick(7).slot === MY_SLOT && slotOfPick(14).slot === MY_SLOT,
    "B: vol 7 og 14 eru saetis 7 (sjalfstaed snakk-vorpun)");
  ok(yoursOnScreen() === 2, `B: "yours"-talan er 2 (${yoursOnScreen()})`);
  const myTeam = () => ([...document.querySelectorAll(".panel")]
    .find((p) => /^My team$/.test(p.querySelector("h2")?.textContent || ""))
    ?.textContent || "");
  ok(mine7.every((nm) => myTeam().includes(nm)),
    `B: og ThEIR SOMU eru i "My team" (${mine7.join(", ")}) — ekki adeins i tolunni`);
  /* CHIPARNIR SKRIFA EKKI HELDUR. Fantom-val i hopnum er oafturkallanlegt
     i samstillingu (`reconcile` sleppir handvirkum audkennum), svo thetta
     er ekki snyrting heldur vordur um `myRoster`. */
  const kdstPanel = [...document.querySelectorAll(".panel")]
    .find((p) => /Kickers and defences/.test(p.querySelector("h2")?.textContent || ""));
  const kdstChips = kdstPanel
    ? [...kdstPanel.querySelectorAll(".chips > *")] : [];
  ok(kdstChips.length > 0, `ThEKJA/B: K/DST-chipar eru a skjanum (${kdstChips.length})`);
  ok(kdstChips.every((c) => c.tagName !== "BUTTON"),
    `B: og ENGINN theirra er hnappur sem skrifar i hopinn `
    + `(${kdstChips.filter((c) => c.tagName === "BUTTON").length} hnappar)`);

  /* ---- og HANDVIRK YFIRTAKA skilar theim ---- */
  const manualBtn = [...document.querySelectorAll("button.chip")]
    .find((b) => /^manual entry/.test((b.textContent || "").trim()));
  ok(!!manualBtn, "B: yfirtoku-hnappurinn er a skjanum (pollun getur misst val)");
  if (manualBtn) {
    await click(manualBtn, 200);
    ok(actBtns().join(",") === "mine,gone",
      `B: yfirtaka skilar BADUM hnoppum ("${actBtns().join(",") || "enga"}")`);
    await click(manualBtn, 200);
    ok(actBtns().length === 0, "B: og hun slokknar aftur");
  }
  ok(!junk(), `B: ekkert NaN/undefined (${junk() || "-"})`);
  await settle(60);
  await act(async () => { root.unmount(); });

  /* ---- C. POLLUN AN SAETIS: `mine` stendur, `gone` fer ---- */
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  /* `draft_order` er ThAD sem gefur appinu saetid an smells — tomt hér,
     svo pollunin gengur en saetid er OThEKKT. */
  live.draft = { ...mkDraft(), draft_order: null };
  root = await boot();
  await connectAndSync({ slot: null });
  for (let n = 1; n <= 8; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 8, 8000);
  await settle(300);
  ok(boardUp(), `ThEKJA/C: bordid er a skjanum (${boardRows().length} radir)`);
  /* ThEKJA a forsendunni sjalfri: vaeri saetid komid inn einhvern veginn
     vaeri C sama tilfelli og B og fullyrdingin hér undir lygi. */
  ok(yoursOnScreen() === 0, `ThEKJA/C: saetid er OThEKKT, svo "yours" er 0 (${yoursOnScreen()})`);
  ok(actBtns().join(",") === "mine",
    `C: "mine" STENDUR an saetis, "gone" fer ("${actBtns().join(",") || "enga"}")`);
  ok(/your slot is not set/.test(text().replace(/\s+/g, " ")),
    "C: og linan segir hvers vegna hnappurinn er enn thar");
  ok(!junk(), `C: ekkert NaN/undefined (${junk() || "-"})`);
  await settle(60);
  await act(async () => { root.unmount(); });
}

/* ============================================================
   23. POLLUNIN VERDUR AD KOMAST FRAM HJA JADAR-MINNI SLEEPER
   ============================================================
   HVERS VEGNA THESSI KAFLI ER TIL — MAELT 27.8.2026 A LIFANDI API:

     GET /v1/draft/{id}/picks  ->  cache-control: public, s-maxage=300,
                                   stale-while-revalidate=300
     thrjar radir a somu slod  ->  cf-cache-status: HIT, HIT, HIT
                                   **age: 103, 103, 103**

   Somu baetin, sami aldur. Cloudflare svarar sjalfur innan `s-maxage`,
   svo pollun a 1,5 sek fresti las FIMM MINUTNA GAMALT draft. Notandinn
   sa thad orðrétt: bordid stod a sex volum medan botarnir toku 47, og
   svo "poppadi upp pick 53". Hann fell ut a tima a sinu eigin vali.

   ÞETTA ER PROFAD A SLODUNUM, EKKI A SVARINU. Hermirinn hér svarar
   ferskt hvad sem er i slodinni, svo ENGINN annar kafli i thessari skra
   getur brugdist thott bustinn se fjarlaegdur — jsdom hefur ekkert
   jadar-minni og getur ekki hermt eftir thvi. Fullyrdingin verdur thvi
   ad vera um lykilinn sem vid sendum.

   ÞRJAR FULLYRDINGAR, OG SU MIDJA ER SU SEM BITUR:
     A. hver draft-/picks-slod ber `_=`            (bustinn er a)
     B. ENGIR TVEIR eru eins                       (lykillinn er
        EINKVAEMUR — fastur busti stenst A og fellur hér)
     C. slodir sem eru sottar EINU SINNI bera hann EKKI (`/league/…`,
        `/user/…`): vid erum gestir hja Sleeper og jadar-minnid er
        GAGN a theim, svo akvordunin er skorðud og synileg.

   STOKKBREYTINGAR STADFESTAR: `{ fresh: true }` fjarlaegt af
   `sleeperPicks` -> A fellur; `nextStamp` skipt ut fyrir fastan streng
   -> B fellur; `fresh` sett a `sleeperLeague` -> C fellur.          */
console.log("\n23. pollunin ber einkvaeman cache-lykil");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  calls.length = 0;
  await connectAndSync();
  /* ÞEKJA: kaflinn er einskis virdi an raunverulegra pollana. Fjogur vol
     med bid a milli tryggja ad lykkjan hafi gengid margar umferdir —
     tvaer slodir per pollun. */
  for (let n = 1; n <= 4; n++) { pushPick(n); await settle(80); }
  await waitFor(() => draftedOnScreen() === 4, 8000);

  const draftCalls = calls.filter((u) => /\/draft\/[^/]+(\/picks)?(\?|$)/.test(u));
  ok(draftCalls.length >= 8,
    `ThEKJA: pollunin sotti draftid margsinnis (${draftCalls.length} koll)`);

  const withoutBust = draftCalls.filter((u) => !/[?&]_=/.test(u));
  for (const u of withoutBust.slice(0, 3)) console.log(`     ${u}`);
  ok(withoutBust.length === 0,
    `A: hver draft-slod ber cache-bust (${withoutBust.length} af ${draftCalls.length} an hans)`);

  const uniq = new Set(draftCalls);
  ok(uniq.size === draftCalls.length,
    `B: allar slodirnar eru EINKVAEMAR (${uniq.size} af ${draftCalls.length})`);

  /* C — og hér er ThEKJA lika nauðsyn: vaeri listinn tomur vaeri
     fullyrdingin sonn af tomri astaedu (CLAUDE.md 5b). */
  const once = calls.filter((u) => !/\/draft\//.test(u));
  ok(once.length > 0, `ThEKJA/C: einu-sinnis slodir voru sottar (${once.length})`);
  const bustedOnce = once.filter((u) => /[?&]_=/.test(u));
  ok(bustedOnce.length === 0,
    `C: og THAER bera hann EKKI (${bustedOnce.length} af ${once.length})`);
  ok(!junk(), `ekkert NaN/undefined (${junk() || "-"})`);
  await settle(60);
  await act(async () => { root.unmount(); });
}

console.log(`\n(pollunar-bidir styttar: ${pollTicks})`);
console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
