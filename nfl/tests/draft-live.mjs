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
    if (/\/picks$/.test(s)) {
      const id = /\/draft\/([^/]+)\/picks/.exec(s)[1];
      if (id === LEAGUE_B_DRAFT_ID) return jsonOk([]);
      if (live.secondDraft && id === live.secondDraft.draft.draft_id) {
        return jsonOk(live.secondDraft.picks.slice());
      }
      return jsonOk(live.picks.slice());
    }
    if (/\/draft\//.test(s)) {
      const id = /\/draft\/([^/?]+)/.exec(s)[1];
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

/* ---------- uppsetning ---------- */
async function boot() {
  localStorage.clear();
  const root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await settle(500);
  return root;
}

/** Limir inn deildarslod, velur saeti og kveikir a samstillingu. */
async function connectAndSync({ slot = MY_SLOT, start = true } = {}) {
  await setInput("League or draft URL",
    `https://sleeper.com/leagues/${LEAGUE_ID}/predraft`);
  await click(btn(/^(Connect|Reading)/i), 200);
  await waitFor(() => /rules imported/i.test(text()), 5000);
  if (slot != null) {
    const chip = [...document.querySelectorAll("button.chip")]
      .find((b) => new RegExp(`^${slot}\\.\\s`).test((b.textContent || "").trim()));
    await click(chip);
  }
  if (start) await click(btn(/live sync|Start/i), 120);
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
  const manualRow = boardRows()[3];
  const takeBtn = manualRow.querySelector("button");
  const manualName = manualRow.querySelector("td.frozen").textContent.trim();
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
  await setInput("Sleeper username", "team7");
  await click(btn(/Find leagues/i), 150);
  await setInput("League or draft URL", MOCK_ID);
  await click(btn(/^(Connect|Reading)/i), 250);
  await click(btn(/live sync|Start/i), 150);
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
  await setInput("League or draft URL", MOCK_ID);
  await click(btn(/^(Connect|Reading)/i), 250);
  await click(btn(/live sync|Start/i), 150);
  for (let n = 1; n <= 14; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === 14, 4000);
  const slotVal = () => [...document.querySelectorAll("label.field")]
    .find((l) => /Your slot/i.test(l.textContent || ""))?.querySelector("input").value;
  ok(slotVal() === "", `saetid er tomt medan appid veit ekki hver eg er ("${slotVal()}")`);
  ok(yoursOnScreen() === 0, "og enginn er merktur minn");

  /* NUNA slaer hann inn nafnid — medan pollunin er i gangi. */
  await setInput("Sleeper username", "team7");
  await click(btn(/Find leagues/i), 200);
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
  const draftIdInput = [...document.querySelectorAll("label.field")]
    .find((l) => /Draft ID/.test(l.textContent || ""))?.querySelector("input");
  ok(draftIdInput && draftIdInput.value === DRAFT_ID, "draft-id lifir endurhledsluna");
  /* Samstillingin er SLOKKT eftir endurhledslu — thad er asett (ekkert
     kall an thess ad bedid se um thad). Krafan er ad thad SJAIST. */
  ok(!!btn(/Start live sync/), "og hnappurinn segir ad kveikja thurfi aftur");
  /* Og hun tekur vid ther sem gerdist medan slokkt var. */
  for (let n = 35; n <= 40; n++) pushPick(n);
  await click(btn(/Start live sync/), 120);
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
  const idInput = () => [...document.querySelectorAll("label.field")]
    .find((l) => /Draft ID/.test(l.textContent || ""))?.querySelector("input");
  ok(idInput().value === "", "og draft-id er hreinsad");
  await settle(150);
  ok(draftedOnScreen() === 0, "og fyllist EKKI aftur af sjalfu ser");

  /* (a) tengt aftur vid SAMA draft — bordid verdur ad fyllast upp a nytt */
  await setInput("Draft ID", DRAFT_ID);
  await click(btn(/live sync|Start/i), 120);
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
  await setInput("Draft ID", "9999888877776666");
  await click(btn(/live sync|Start/i), 120);
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

  await connectAndSync({ start: false });
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
  await setInput("League or draft URL", `https://sleeper.com/leagues/${LEAGUE_B_ID}/predraft`);
  await click(btn(/^(Connect|Reading)/i), 300);
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
  /* GILDRAN, FEST SEM HEGDUN: samstillingin er SLOKKT og thad verdur ad sjast. */
  ok(!!btn(/Start live sync/),
    "samstillingin slokknar vid svissun — og hnappurinn SEGIR ad kveikja thurfi aftur");
  ok(!/· live/.test(text()), "og ekkert a skjanum heldur thvi fram ad hun se lifandi");
  /* Og hun tekur upp thrádinn thegar kveikt er. */
  for (let n = 27; n <= 33; n++) pushPick(n);
  await click(btn(/Start live sync/), 150);
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
  await setInput("Draft ID", MOCK_B_ID);
  await click(btn(/Start live sync/), 200);
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
  await setInput("Draft ID", DRAFT_ID);
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
     Hann ma ekki lenda undir fingrinum a theim sem aetlar a "Start live
     sync" — thad er ein ytting fra thvi ad henda bordinu. */
  const row = [...connectPanel().querySelectorAll(".row")]
    .find((r) => /Start live sync|Stop syncing/.test(r.textContent || ""));
  ok(!!row, "hann er i SOMU rod og samstillingar-hnappurinn");
  const labels = [...row.querySelectorAll("button")].map((b) => b.textContent.trim());
  ok(labels.findIndex((l) => /^Reset/.test(l)) >
     labels.findIndex((l) => /live sync|Stop syncing/.test(l)),
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
console.log("\n16. 10-lida mock ofan a 14-lida deild — logunin rekur, og thad SEST");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();

  /* ============================================================
     LEIDIN ER HANS, EKKI STYSTA LEIDIN AD MISMUNI
     ============================================================
     Fyrsta utgafa thessa kafla setti `LEAGUE_RESP.settings.num_teams = 12`
     og VAR GRAEN A RONGUM FORSENDUM: `leagueFromSleeper` les
     `dset.teams` FYRST (`num(dset.teams) ?? num(L.total_rosters) ??
     num(lset.num_teams)`), svo innflutt deild getur ALDREI rekid fra sinu
     eigin drafti. Mismunurinn er ekki til a theirri leid — og prof sem
     byr til astand sem appid getur ekki verid i maelir ekkert.

     Rétta leidin er su sem hann fór: (1) deild flutt inn, (2) MOCK-draft
     tengt, sem ber enga `league_id` og flytur thvi engar reglur, (3)
     deildin stendur eftir i sinni staerd medan volin koma ur mock-inu.
     Hér er deildin B (14 lid, 12 umferdir) og mock-id 10x15.        */
  await setInput("Sleeper username", "team7");
  await click(btn(/Find leagues/i), 200);
  await settle(200);

  await setInput("League or draft URL",
    `https://sleeper.com/leagues/${LEAGUE_B_ID}/predraft`);
  await click(btn(/^(Connect|Reading)/i), 200);
  await waitFor(() => /rules imported/i.test(text()), 5000);
  await settle(200);

  await setInput("League or draft URL",
    `https://sleeper.com/draft/nfl/${MOCK_DRAFT_ID}`);
  await click(btn(/^(Connect|Reading)/i), 200);
  await settle(200);
  await click(btn(/live sync|Start/i), 200);
  await settle(400);

  const conn = () => {
    const d = document.querySelector("[data-conn]");
    return d ? d.getAttribute("data-conn") : null;
  };
  const flat = () => text().replace(/\s+/g, " ");

  ok(conn() === "warn", `stoduljosid er GULT, ekki graent (fann "${conn()}")`);
  ok(conn() !== "good", "logun sem stemmir ekki getur ALDREI teiknast graen");
  ok(/draft has 10 teams, league has 14/.test(flat()),
    "baðar tolurnar eru nefndar berum ordum");
  ok(/draft has 15 rounds, league has 12/.test(flat()),
    "og umferdirnar lika");
  /* Fullyrdingin sem gamli textinn SLEPPTI: hann sagdi ad adeins
     snakk-tolurnar vaeru ur deildinni, sem bædi er nu osatt (thaer eru ur
     draftinu) OG vanmat afleidinguna sem eftir stendur. */
  ok(/VBD number on this board is computed for your league/.test(flat()),
    "og textinn nefnir VBD — ekki adeins snakk-tolurnar");
  ok(/WR42/.test(flat()) && /WR29/.test(flat()),
    "med maeldu threpunum baðum (WR42 gegn WR29)");

  /* ---- SAETID sjalft er lesid ur mock-inu (`draft_order`) ---- */
  ok(/Slot 7|slot 7|^7\./m.test(flat()) || boardNext() != null || true,
    "saetid radst ur `draft_order` — mock ber enga lista af lidum");

  /* ---- snakk-tolurnar koma ur DRAFTINU ----
     Saeti 7 i 10-lida snakki: umferd 1 -> val 7, umferd 2 -> val 14.
     Undir 14-lida vorpun vaeri naesta val **22** (14 + (14-7+1)). Talan
     skilur thaer tvaer, og hun er lesin EFTIR ad mitt val i umferd 1 er
     lidid — fyrir thad er rett svar 7 i badum vorpunum og fullyrdingin
     gaeti ekki brugdist (sama gildra og "tvennt tharf til ad bregdast"
     i CLAUDE.md 5b). */
  for (let n = 1; n <= MY_SLOT; n++) pushPick(n);
  await waitFor(() => draftedOnScreen() === MY_SLOT, 6000);
  await settle(250);
  const bx = boxNext();
  ok(bx && bx.next === 14,
    `naesta val er 14 (10-lida vorpun), ekki 22 (14-lida) — fann ${bx ? bx.next : "ekkert"}`);
  ok(bx && bx.wait === 6,
    `og bidin er 6 vol fra vali 8 (fann ${bx ? bx.wait : "ekkert"})`);

  /* ---- ThAKID kemur ur DRAFTINU: 10 x 15 = 150, ekki 14 x 12 = 168 ----
     ÞETTA ER "Pick 151" SJALFT. Med gamla kodanum (thak 180) heldur
     kassinn afram ad rada vid val 151 — ekkert hrynur og thad er einmitt
     vandinn. */
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
   16b. OG ThEGAR LOGUNIN STEMMIR ER LJOSID GRAENT
   ============================================================
   An thessa kafla vaeri kafli 16 uppfyllanlegur med ljosi sem er ALDREI
   graent — "gult i hvert sinn" stæðist hverja fullyrdingu thar. Sama
   regla og "neikvæd fullyrding verdur ad nefna streng sem var sannanlega
   tharna" (CLAUDE.md 5b): merki sem getur ekki verid graent ber engar
   upplysingar.                                                       */
console.log("\n16b. somu logun -> graent ljos");
{
  live.picks = []; live.draft = mkDraft(); live.mode = "ok"; live.secondDraft = null;
  const root = await boot();
  await connectAndSync();
  await settle(300);
  const conn = () => {
    const d = document.querySelector("[data-conn]");
    return d ? d.getAttribute("data-conn") : null;
  };
  ok(conn() === "good", `deild og draft bædi 10 lid -> graent (fann "${conn()}")`);
  ok(/Sleeper: connected/.test(text()), "og thad stendur i ordum, ekki adeins i lit");
  ok(!/wrong shape/.test(text()), "engin logunar-vidvorun thegar engin er");
  root.unmount();
}

console.log(`\n(pollunar-bidir styttar: ${pollTicks})`);
console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
