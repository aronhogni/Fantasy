/* ============================================================
   sleeper.mjs — LIFANDI DRAFT-TENGINGIN.

   ÞETTA ER ÞAÐ SEM ER NOTAD 21. AGUST OG THAD HEFUR ALDREI VERID
   PROFAD GEGN RAUNVERULEGA LOGUDUM SVORUM. Uttektin hermdi adeins
   BILUN (HTTP 500); hun sagdi ekkert um hvad gerist thegar Sleeper
   svarar RETT — sem er tilfellid sem raunverulega gerist.

   PROFAD ER GEGN HERMDUM SVORUM I RETTU SNIDI, thar med talin oll
   jadartilvikin sem draft-kvold ber med ser:

     · draft sem er ekki byrjad (`pre_draft`, engin vol)
     · draft i gangi, vol tinast inn
     · vol a leikmanni sem er EKKI a bordinu okkar (djupt val)
     · varnir, thar sem `player_id` er lidsskammstofun ("SF") en ekki tala
     · notandi finnst ekki · deild an drafts · draft an stillinga
     · net dettur ut i midjum polli
     · svid sem vantar i svarinu

   REGLAN SEM PROFID VER: **thogul vantalning er verri en synileg
   bilun.** Val sem bordid thekkir ekki ma ekki hverfa ur MINUM hop an
   thess ad thad se sagt — annars vantar mann i lidid og ekkert segir fra.
   ============================================================ */

import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

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

/* ---------- raunveruleg leikmanna-audkenni af bordinu ---------- */
const players = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
const byAdp = players.filter((p) => p.adpSleeper != null && p.adpSleeper < 400)
  .sort((a, b) => a.adpSleeper - b.adpSleeper);
const REAL_IDS = byAdp.slice(0, 40).map((p) => String(p.id));
const DST_ID = (players.find((p) => p.pos === "DST") || {}).id;

/* ---------- hermd Sleeper-svor i RETTU sniði ---------- */
const mkPick = (i, id, slot) => ({
  player_id: String(id),
  picked_by: `user${slot}`,
  roster_id: slot,
  round: Math.floor(i / 12) + 1,
  draft_slot: slot,
  pick_no: i + 1,
  is_keeper: null,
  metadata: { first_name: "Nafn", last_name: `#${i}`, position: "RB", team: "SF" },
});

const SCENARIOS = {
  /* Draft er til en ekki byrjad. */
  preDraft: {
    draft: { draft_id: "d1", status: "pre_draft", type: "snake",
             settings: { teams: 12, rounds: 15 }, draft_order: null },
    picks: [],
  },
  /* Draft i gangi — 20 vol komin, vid i saeti 7. */
  inProgress: {
    draft: { draft_id: "d2", status: "drafting", type: "snake",
             settings: { teams: 12, rounds: 15 }, draft_order: { u1: 7 } },
    picks: REAL_IDS.slice(0, 20).map((id, i) =>
      mkPick(i, id, (i % 12) + 1)),
  },
  /* Val a leikmanni sem er EKKI a bordinu — djupur varamadur. */
  unknownPick: {
    draft: { draft_id: "d3", status: "drafting", type: "snake",
             settings: { teams: 12, rounds: 15 } },
    picks: [
      mkPick(0, REAL_IDS[0], 1),
      mkPick(1, "9999999", 7),          // ekki til a bordinu — OG THAD ER OKKAR
      mkPick(2, REAL_IDS[1], 3),
    ],
  },
  /* Vorn: `player_id` er lidsskammstofun, ekki tala. */
  defensePick: {
    draft: { draft_id: "d4", status: "drafting", type: "snake",
             settings: { teams: 12, rounds: 15 } },
    picks: [mkPick(0, DST_ID, 7), mkPick(1, REAL_IDS[0], 8)],
  },
  /* Draft buid. */
  complete: {
    draft: { draft_id: "d5", status: "complete", type: "snake",
             settings: { teams: 12, rounds: 15 } },
    picks: REAL_IDS.map((id, i) => mkPick(i, id, (i % 12) + 1)),
  },
  /* Stillingar vantar alveg — Sleeper gerir thetta i sumum sniðum. */
  noSettings: {
    draft: { draft_id: "d6", status: "drafting", type: "auction" },
    picks: [mkPick(0, REAL_IDS[0], 1)],
  },
  /* Svid vantar i volunum sjalfum. */
  sparsePicks: {
    draft: { draft_id: "d7", status: "drafting", settings: { teams: 12, rounds: 15 } },
    picks: [{ player_id: REAL_IDS[0] }, { player_id: null }, {}],
  },
  /* ============================================================
     RAUNVERULEG DEILD — SLODIN SEM NOTANDINN LIMIR INN
     ============================================================
     Svarid er snyrt utgafa af Sleeper-svari fyrir deild
     1389356308104249344 (sott 12.8.2026). Tvo svid eru NAKVAEMLEGA
     eins og thau komu og bædi eru gildrur:

       `draft_order: null`  Sleeper dregur rodina EFTIR a, svo saetid
                            verdur ad koma ur `slot_to_roster_id`.
       `draft_rounds: 3`    a deildinni, meðan draftid ber 15.

     10 lid, tvo FLEX-saeti — ONNUR deild en sjalfgefna 12-lida
     uppsetningin, svo profid getur seð hvort reglurnar lentu i raun. */
  leagueUrl: {
    draft: {
      draft_id: "1389356308125192192", league_id: "1389356308104249344",
      status: "pre_draft", type: "snake",
      season: "2026", draft_order: null,
      slot_to_roster_id: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 },
      metadata: { scoring_type: "ppr" },
      /* 16, EKKI 15: sjalfgefid `rounds` i appinu ER 15, svo fullyrding
         um 15 vaeri sonn hvort sem talan kom ur draftinu eda ur
         sjalfgefna snidinu — hun gaeti ekki brugdist (CLAUDE.md 5b).
         Med 16 er hun sonnun. */
      settings: { teams: 10, rounds: 16, slots_flex: 2 },
    },
    picks: REAL_IDS.slice(0, 20).map((id, i) => mkPick(i, id, (i % 10) + 1)),
  },
  /* Deild B — draftid er til en EKKERT val komid. */
  leagueB: {
    draft: {
      draft_id: "2222222222222222223", league_id: "2222222222222222222",
      status: "pre_draft", type: "snake", season: "2026", draft_order: null,
      slot_to_roster_id: { 1: 1, 2: 2, 3: 3 },
      metadata: { scoring_type: "half_ppr" },
      settings: { teams: 14, rounds: 12 },
    },
    picks: [],
  },
};

/* ONNUR deild — vidsjarverdlega ODRUVISI: 14 lid, half-ppr, superflex,
   ANNAD draft og ENGIN vol. Vaeri astandid deilt myndi hun erfa 20 vol
   ur deild A og reglurnar ur henni, og hvorugt saest a bordinu sjalfu. */
const LEAGUE_B = {
  league_id: "2222222222222222222", draft_id: "2222222222222222223",
  name: "Deildin B", season: "2026", status: "pre_draft", total_rosters: 14,
  roster_positions: ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "SUPER_FLEX",
                     "BN", "BN", "BN", "BN"],
  settings: { num_teams: 14, draft_rounds: 12, type: 0, best_ball: 0 },
  scoring_settings: { rec: 0.5, pass_yd: 0.04, pass_td: 4, pass_int: -1,
                      rush_yd: 0.1, rush_td: 6, rec_yd: 0.1, rec_td: 6, fum_lost: -2 },
};

/* Deildin sjalf — REGLURNAR. */
const LEAGUE_RESP = {
  league_id: "1389356308104249344", draft_id: "1389356308125192192",
  previous_league_id: "1257117602308689920",
  name: "Patriots SB champs", season: "2026", status: "pre_draft",
  total_rosters: 10,
  roster_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF",
                     "BN", "BN", "BN", "BN", "BN"],
  settings: { num_teams: 10, draft_rounds: 3, max_keepers: 1, best_ball: 0 },
  scoring_settings: { rec: 1, pass_yd: 0.04, pass_td: 4, pass_int: -1, rush_yd: 0.1,
                      rush_td: 6, rec_yd: 0.1, rec_td: 6, fum_lost: -2 },
};
const LEAGUE_USERS = [
  { user_id: "u1", display_name: "adi" },
  { user_id: "u7", display_name: "mattitim" },
];
const LEAGUE_ROSTERS = [
  { roster_id: 3, owner_id: "u1" },
  { roster_id: 7, owner_id: "u7" },
];

let scenario = SCENARIOS.inProgress;
let sleeperMode = "ok";        // ok | 404 | net | rusl
const calls = [];

global.fetch = async (url) => {
  const s = String(url);
  if (s.includes("api.sleeper")) {
    calls.push(s);
    if (sleeperMode === "net") throw new TypeError("Failed to fetch");
    if (sleeperMode === "404") return { ok: false, status: 404, json: async () => ({}) };
    if (sleeperMode === "rusl") {
      return { ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token"); } };
    }
    if (/\/user\/[^/]+$/.test(s)) {
      return { ok: true, status: 200, json: async () => ({ user_id: "u1", username: "adi" }) };
    }
    if (/\/leagues\/nfl\//.test(s)) {
      return { ok: true, status: 200,
               json: async () => [{ league_id: "L1", name: "Deildin", total_rosters: 12 }] };
    }
    /* Rodin skiptir mali: `/users` og `/rosters` enda a deildarslodinni,
       svo bera `/league/{id}$` verdur ad koma SIDAST af theim thremur. */
    if (/\/league\/[^/]+\/users$/.test(s)) {
      return { ok: true, status: 200, json: async () => LEAGUE_USERS };
    }
    if (/\/league\/[^/]+\/rosters$/.test(s)) {
      return { ok: true, status: 200, json: async () => LEAGUE_ROSTERS };
    }
    if (/\/drafts$/.test(s)) {
      return { ok: true, status: 200, json: async () => [scenario.draft] };
    }
    if (/\/league\/[^/]+$/.test(s)) {
      /* Deildin er adeins til fyrir `leagueUrl`-atburdarasina. Adrar
         atburdarasir fara draft-leidina, og tha VERDUR thetta ad svara
         eins og deild sem er ekki til — annars faeri hver atburdaras
         gegnum deildar-vorpunina og profadi annad en hun aetlar. */
      if (/\/league\/1389356308104249344$/.test(s)) {
        return { ok: true, status: 200, json: async () => LEAGUE_RESP };
      }
      if (/\/league\/2222222222222222222$/.test(s)) {
        return { ok: true, status: 200, json: async () => LEAGUE_B };
      }
      return { ok: false, status: 404, json: async () => null };
    }
    /* ============================================================
       VOLIN ERU LYKLUD A DRAFT-AUDKENNI, EKKI A `scenario`
       ============================================================
       Adur skiladi `/picks` alltaf `scenario.picks`, hvada draft sem
       var spurt um. Kafli 2f svissar `scenario` yfir i deild B MEDAN
       samstilling deildar A er enn i gangi — svo draft A fór ad svara
       TOMUM lista fyrir sitt eigid draft. Þad er mock sem lygur, og
       hann var osynilegur svo lengi sem `onPicks` gat ekki minnkad
       mengið: sammengið hunsadi tomma listann.

       Um leid og pollunin fylgir Sleeper NIDUR lika (afturkolluð vol,
       sja `draft-live.mjs` kafla 3) les tomi listinn eins og
       "umsjonarmadur nullstillti draftid" — sem er RETT lestur. Villan
       var i hermunum, ekki i appinu.                                */
    const byDraft = (id) => Object.values(SCENARIOS)
      .find((sc) => sc.draft && sc.draft.draft_id === id) || scenario;
    if (/\/picks$/.test(s)) {
      const id = (/\/draft\/([^/]+)\/picks/.exec(s) || [])[1];
      return { ok: true, status: 200, json: async () => byDraft(id).picks };
    }
    if (/\/draft\//.test(s)) {
      const id = (/\/draft\/([^/?]+)/.exec(s) || [])[1];
      return { ok: true, status: 200, json: async () => byDraft(id).draft };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }
  const m = s.match(/\/data\/(.+)$/);
  if (!m) return { ok: false, status: 404, json: async () => ({}) };
  try {
    return { ok: true, status: 200,
             json: async () => JSON.parse(readFileSync(path.join(DATA, m[1]), "utf8")) };
  } catch { return { ok: false, status: 404, json: async () => ({}) }; }
};

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
global.IS_REACT_ACT_ENVIRONMENT = true;
const App = (await import("../src/App.jsx")).default;

const settle = async (ms = 400) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
/* Bid a SKILYRDI, ekki a klukku. Fost bid er flöktandi prof i dulargervi:
   hun er of long i hverri keyrslu sem gengur og of stutt i theirri sem
   fellur. */
const waitFor = async (cond, ms = 3000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (cond()) return true;
    await settle(100);
  }
  return cond();
};
const text = () => document.body.textContent || "";
const click = async (el) => {
  if (!el) return false;
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle(400);
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
  await settle(200);
  return true;
};

/* Fersk uppsetning fyrir hverja atburdarás — vistad astand ur einni
   ma ekki lekja i naestu. */
async function boot() {
  localStorage.clear();
  const el = document.getElementById("root");
  const root = createRoot(el);
  await act(async () => { root.render(React.createElement(App)); });
  await settle(700);
  return root;
}

/* ============================================================
   1. HVER ATBURDARAS TEIKNAST AN HRUNS
   ============================================================ */
console.log("\n1. atburdarasir draft-kvoldsins");
for (const [name, sc] of Object.entries(SCENARIOS)) {
  scenario = sc; sleeperMode = "ok";
  const root = await boot();
  let crashed = false;
  try {
    await setInput("Draft ID", sc.draft.draft_id);
    const start = [...document.querySelectorAll("button")]
      .find((b) => /live sync|Start/i.test(b.textContent || ""));
    await click(start);
    await settle(800);
  } catch { crashed = true; }
  const t = text();
  const bad = /\bNaN\b|\bundefined\b|Something broke/.test(t);
  ok(!crashed && !bad && t.length > 400,
    `${name}: teiknast${crashed ? " — HRUN" : bad ? " — NaN/villuvorn" : ""}`);
  root.unmount();
}

/* ============================================================
   2. OTHEKKT VAL HVERFUR EKKI THEGJANDI
   ============================================================
   Bordid ber ~1.130 leikmenn af ~11.400 hja Sleeper, svo djupt val
   getur verid utan thess. Ad sleppa thvi ur `taken` er RETT — thad var
   hvort ed er ekki i tillogunum. Ad sleppa thvi ur MINUM HOP er thad
   EKKI: tha vantar mann og ekkert segir fra thvi.                  */
console.log("\n2. othekkt val er talid, ekki hent");
{
  scenario = SCENARIOS.unknownPick; sleeperMode = "ok";
  const root = await boot();
  await setInput("Draft ID", "d3");
  await click([...document.querySelectorAll("button")]
    .find((b) => /live sync|Start/i.test(b.textContent || "")));
  await settle(900);
  const t = text();
  ok(/not on this board/i.test(t),
    "appid segir fra voli sem bordid thekkir ekki");
  ok(/\b1\b[^.]*not on this board/i.test(t) || /1 pick/i.test(t),
    "og telur thau");
  root.unmount();
}

/* ============================================================
   2b. VIRKAR SAMSTILLINGIN I RAUN?
   ============================================================
   Kaflarnir ad ofan sanna adeins ad EKKERT HRYNUR. Thad er ekki thad
   sama og ad tengingin geri sitt verk — og fullyrding sem getur ekki
   brugdist er engin fullyrding (CLAUDE.md 5b).

   Hér er profad thad sem tengingin er TIL FYRIR: eftir samstillingu
   verda leikmennirnir sem eru farnir ad hverfa af bordinu, og their
   sem VID tokum ad birtast i hopnum okkar.                        */
console.log("\n2b. samstillingin gerir sitt verk");
{
  scenario = SCENARIOS.inProgress; sleeperMode = "ok";
  const root = await boot();

  const countBefore = document.querySelectorAll("table.data tbody tr").length;
  const takenBefore = /(\d+) drafted/.exec(text());

  await setInput("Draft ID", "d2");
  await setInput("Your slot", "7");
  await click([...document.querySelectorAll("button")]
    .find((b) => /live sync|Start/i.test(b.textContent || "")));
  await settle(1000);

  const t = text();
  const takenAfter = /(\d+) drafted/.exec(t);
  ok(takenBefore && takenAfter && Number(takenAfter[1]) >= 20,
    `${takenAfter ? takenAfter[1] : "?"} leikmenn strikadir ut ` +
    `(voru ${takenBefore ? takenBefore[1] : "?"}, 20 vol komin)`);

  /* Saeti 7 atti tvo af fyrstu 20 volunum (i=6 og i=18). */
  const mine = /(\d+) yours/.exec(t);
  ok(mine && Number(mine[1]) === 2,
    `og TVO theirra eru minir (saeti 7 af 12) — fann ${mine ? mine[1] : "?"}`);

  /* Sa sem var tekinn ma ekki lengur standa efstur i tillogunni. */
  const firstTaken = players.find((p) => String(p.id) === REAL_IDS[0]);
  ok(firstTaken && !new RegExp(`take[\\s\\S]{0,40}${firstTaken.name}`).test(t),
    `${firstTaken ? firstTaken.name : "?"} er ekki lengur bodinn (hann er farinn)`);

  root.unmount();
}

/* ============================================================
   2bb. SAETID ER LESID UR DRAFTINU
   ============================================================
   AN SAETIS VAR TENGINGIN HALF. Appid strikadi ut tha sem voru farnir
   — en hopurinn THINN fylltist aldrei, svo "hvern a ad taka naest"
   vissi ekki hvad thu attir thegar. Rad an vitneskju um hopinn er
   ekki rad.

   Sleeper ber `draft_order` a draftinu: `{ user_id: saeti }`, og vid
   vitum `user_id` um leid og notandanafnid finnst. Profid fer LEIDINA
   SEM NOTANDINN FER — notandanafn, deild, tengja — og krefst thess ad
   saetid komi af sjalfu ser.                                        */
console.log("\n2bb. saetid les sig sjalft ur draft_order");
{
  scenario = SCENARIOS.inProgress; sleeperMode = "ok";
  const root = await boot();

  await setInput("Sleeper username", "adi");
  await click([...document.querySelectorAll("button")]
    .find((b) => /Find leagues/i.test(b.textContent || "")));
  await settle(600);
  /* Deildin birtist sem chip — smellt a hana eins og notandinn gerir. */
  const league = [...document.querySelectorAll("button.chip")]
    .find((b) => /Deildin/.test(b.textContent || ""));
  await click(league);
  await settle(700);

  const slotInput = [...document.querySelectorAll("label.field")]
    .find((l) => /Your slot/i.test(l.textContent || ""))?.querySelector("input");
  ok(slotInput && Number(slotInput.value) === 7,
    `saetid lesid ur draft_order (fann "${slotInput ? slotInput.value : "?"}", a ad vera 7)`);
  ok(/read from Sleeper/i.test(text()),
    "og thad er MERKT sem lesid, ekki innslegid");

  /* Og tha VIRKAR radgjofin a rettum hop: samstillum og teljum. */
  await click([...document.querySelectorAll("button")]
    .find((b) => /live sync|Start/i.test(b.textContent || "")));
  await settle(900);
  const mine = /(\d+) yours/.exec(text());
  ok(mine && Number(mine[1]) === 2,
    `hopurinn fylltist an thess ad slá inn neitt (${mine ? mine[1] : "?"} minir)`);
  root.unmount();
}

/* ============================================================
   2c. HANDVIRKT VAL MA EKKI AFTURKALLAST AF POLLINUM
   ============================================================
   ALVARLEGASTA VILLAN I nfl/ SAMKVAEMT UTTEKTINNI, og hun er lumsk
   thvi hun tekur FIMM SEKUNDUR ad birtast — notandinn smellir, sér
   rett, og sidan hverfur thad.

   `onPicks` er orva-fall sem er buid til i hverri teikningu og lokast
   um `taken` og `myPicks` EINS OG THAU VORU THA. Pollunar-effectid ber
   `[live, sync.draftId, sync.slot, byId]` i deps — EKKI `onPicks` —
   svo `setInterval` heldur afram ad kalla GOMLU utgafuna. Vid hvern
   tikk er mengid endurbyggt ur urveltri mynd:

       const t = new Set([...taken, ...ids]);   // `taken` er gamalt

   Handvirkt val sem kom EFTIR ad effectid keyrdi er thvi ekki i `taken`
   og hverfur. Og `persist(t, m)` SKRIFAR afturforina i localStorage,
   svo hun lifir endurhledslu.

   Profid bidur raunverulegar 5,5 sekundur. Thad er haegt, og thad er
   thess virdi: thetta er eina leidin til ad sja villu sem er skilgreind
   af timanum sem lidur.                                            */
console.log("\n2c. handvirkt val lifir pollunina");
{
  scenario = SCENARIOS.inProgress; sleeperMode = "ok";
  const root = await boot();

  await setInput("Draft ID", "d2");
  await setInput("Your slot", "7");
  await click([...document.querySelectorAll("button")]
    .find((b) => /live sync|Start/i.test(b.textContent || "")));
  await settle(900);

  /* Veljum mann sem er EKKI i Sleeper-volunum — hreint handvirkt val.
     `take`-hnapparnir eru i bordinu; sa fyrsti er efsti lausi madurinn. */
  const before = /(\d+) drafted/.exec(text());
  const takeBtn = [...document.querySelectorAll("table.data tbody button")]
    .find((b) => /take|mine|\+/i.test(b.textContent || "")) ||
    [...document.querySelectorAll("table.data tbody td button")][0];
  const clicked = await click(takeBtn);
  const afterClick = /(\d+) drafted/.exec(text());
  ok(clicked && afterClick && Number(afterClick[1]) > Number(before[1]),
    `handvirkt val skradist (${before[1]} -> ${afterClick ? afterClick[1] : "?"})`);

  /* Nu lidur einn pollunar-tikkur. */
  await settle(5600);
  const afterTick = /(\d+) drafted/.exec(text());
  ok(afterTick && Number(afterTick[1]) >= Number(afterClick[1]),
    `og lifir pollunina 5 sek sidar (${afterClick ? afterClick[1] : "?"} -> ` +
    `${afterTick ? afterTick[1] : "?"})`);

  /* Og afturforin ma ekki hafa verid SKRIFUD i localStorage.
     LYKILLINN ER LYKLADUR A DEILD fra 12.8.2026 (`nfl_taken:<id>`) —
     deildu tvaer deildir sama mengi vaeru leikmenn sem thu tokst i
     annarri strikadir ut i hinni. Olyklada deildin heitir "local". */
  const saved = JSON.parse(localStorage.getItem("nfl_taken:local") || "[]");
  ok(saved.length >= Number(afterClick[1]),
    `og vistada mengid ber thad lika (${saved.length} audkenni)`);
  ok(localStorage.getItem("nfl_taken") == null,
    "og olyklada lykillinn er EKKI skrifadur (annars tvo mengi i einu)");
  root.unmount();
}

/* ============================================================
   2d. DEILDARSLODIN — REGLURNAR KOMA MED, EKKI BARA VOLIN
   ============================================================
   ÞETTA VAR STAERSTA GATID OG THAD VAR THOGULT. Appid las VOLIN ur
   Sleeper en engar REGLUR: lidafjoldi, stigagjof og byrjunarsaeti voru
   slegin inn i HENDI i flipastikunni. Thau eru ekki skraut — `teams` og
   `scoring` raeda BADUM hvada ADP er lesid OG hvar varamanns-threpid
   liggur (`model.js`). Deild sem er slegin inn rangt reiknar adra deild
   en notandinn spilar i, med tolum sem lita nakvaemlega eins ut.

   Og slodin sem notandinn HEFUR er deildarslod, ekki draft-slod. Gamla
   reitið tok fyrsta tolustrenginn og kalladi hann draft-id, svo
   `/draft/{leagueId}` gaf 404 fyrir slod sem var alveg rett.

   PROFSTEINNINN ER EKKI "birtist kassinn" HELDUR AD TOLURNAR BREYTTUST.
   Fullyrding um textann eina hefdi verid graen thott deildin hefdi
   aldrei lent i `league`-state — og tha vaeri innflutningurinn skraut.  */
console.log("\n2d. deildarslod flytur inn REGLURNAR");
{
  scenario = SCENARIOS.leagueUrl; sleeperMode = "ok";
  const root = await boot();

  /* Hvernig VBD les FYRIR innflutning (sjalfgefid: 12 lid, PPR). */
  const vbdCol = () => {
    const ths = [...document.querySelectorAll("table.data thead th")];
    return ths.findIndex((th) => /^VBD$/i.test((th.textContent || "").trim()));
  };
  const vbdSnapshot = () => {
    const col = vbdCol();
    if (col < 0) return null;
    return [...document.querySelectorAll("table.data tbody tr")].slice(0, 6)
      .map((tr) => (tr.children[col]?.textContent || "").trim()).join("|");
  };
  /* HANDVIRKU REITIRNIR VORU TEKNIR UT 12.8.2026 — deildin er flutt
     inn, svo tveir reitir sem segja thad sama vaeru ofthorf OG haetta.
     Vidmotid ber nu LESTEXTA (`ActiveLeague`), og hin RAUNVERULEGA
     heimild um hvad bordid reiknar er `nfl_leagues`. Profid les BADAR:
     textann (thad sem notandinn ser) og geymsluna (thad sem likanid
     notar) — annars gaeti skjarinn sagt annad en reiknad er.        */
  const savedEntries = () => JSON.parse(localStorage.getItem("nfl_leagues") || "[]");
  const activeRules = () => {
    const id = JSON.parse(localStorage.getItem("nfl_activeLeague") || '""');
    const es = savedEntries();
    return (es.find((e) => e.id === id) || es[0] || {}).rules || {};
  };
  const headerText = () => (document.querySelector("header.top") || {}).textContent || "";

  ok(vbdCol() >= 0, "VBD-dalkurinn er a bordinu (forsenda maelingarinnar)");
  const beforeVbd = vbdSnapshot();
  ok(activeRules().teams === 12,
    `fyrir innflutning: 12 lid (sjalfgefid) — fann ${activeRules().teams}`);
  ok(/default, no league connected/.test(headerText()),
    "og hausinn SEGIR ad thetta se sjalfgefid, ekki deildin thin");

  /* Notandinn limir inn thad sem hann hefur i vafranum. */
  await setInput("League or draft URL",
    "https://sleeper.com/leagues/1389356308104249344/predraft");
  await click([...document.querySelectorAll("button")]
    .find((b) => /^(Connect|Reading)/i.test((b.textContent || "").trim())));
  /* Innflutningur breytir `activeId`, sem ENDURRAESIR bordid og
     endurreiknar `buildRows` yfir ~1.100 leikmenn. Vid 900 ms var
     VBD-fullyrdingin GRAEN I EINNI KEYRSLU OG RAUD I NAESTU — og
     flöktandi prof er verra en ekkert: thad sendir mann af stad ad
     leita ad villu sem er ekki til. Bidum thangad til talan er komin
     i stad thess ad giska a timann. */
  await waitFor(() => activeRules().teams === 10, 4000);
  await settle(400);

  const t = text();

  /* --- (a) reglurnar lentu i DEILDINNI, ekki bara a skjanum --- */
  ok(activeRules().teams === 10, `deildin er nu 10 lid (fann ${activeRules().teams})`);
  ok(/10<\/b> teams|10 teams/.test(document.querySelector("header.top").innerHTML),
    "og hausinn syair thad lika");
  ok(/from Sleeper/.test(headerText()) && !/default, no league/.test(headerText()),
    "og hann greinir \"lesid ur Sleeper\" fra \"sjalfgefid\"");
  const afterVbd = vbdSnapshot();
  ok(beforeVbd && afterVbd && beforeVbd !== afterVbd,
    "og VBD-tolurnar breyttust — varamanns-threpid fylgdi med");
  ok(!/\bNaN\b/.test(afterVbd || ""), "engin NaN i VBD eftir innflutning");

  /* --- (b) thad sem var lesid er BIRT, ekki gefid ser --- */
  ok(/rules imported/i.test(t), "\"rules imported\" er sagt berum ordum");
  ok(/Patriots SB champs/.test(t), "heiti deildarinnar birtist");
  ok(/16/.test(t), "umferdirnar eru birtar");
  ok(/2FLEX|FLEX/.test(t), "byrjunarsaetin eru birt");
  ok(/5 bench/.test(t), "bekkurinn er talinn (5)");

  /* --- (c) UMFERDIRNAR KOMA UR DRAFTINU, EKKI DEILDINNI ---
     `draft_rounds` a deildinni er 3; draftid ber 15. Vaeri deildin
     lesin taeldi radgjofin thrjar umferdir eftir og myndi aldrei segja
     ther ad taka spyrnumann ne vorn. Prófad a THVI SEM VAR VISTAD, sem
     er thad sem `advice.js` les. */
  const savedLeague = activeRules();
  ok(savedLeague.rounds === 16,
    `umferdir ur DRAFTINU: 16 (fann ${savedLeague.rounds})`);
  ok(savedLeague.rounds !== 3, "og EKKI 3 ur deildinni (gildran)");
  ok(savedLeague.rounds !== 15,
    "og EKKI 15 ur sjalfgefna snidinu — talan er sannanlega LESIN");
  ok(savedLeague.teams === 10 && savedLeague.scoring === "ppr",
    `vistad: ${savedLeague.teams} lid, ${savedLeague.scoring}`);
  ok(savedLeague.starters && savedLeague.starters.FLEX === 2,
    `tvo FLEX-saeti (fann ${savedLeague.starters && savedLeague.starters.FLEX})`);
  ok(!("BN" in (savedLeague.starters || {})),
    "bekkurinn lak ekki inn i byrjunarsaetin");

  /* --- (d) vidvaranirnar ---
     MAELT 12.8.2026: thessi deild er `settings.type: 0` (redraft) og
     `is_keeper` var null i ollum 150 volum sidasta drafts. Fyrsta
     utgafan flaggadi hana samt sem keeper-deild af thvi ad
     `max_keepers` er 1 — sem er Sleeper-sjalfgefid i HVERRI deild.
     Vidvorun sem kviknar a venjulegri deild er havadi, og tha laerir
     notandinn ad hunsa kassann. */
  ok(!/keeper|dynasty/i.test(t),
    "redraft-deild er EKKI flogguð sem keeper (fals-jakvaett sem var lagad)");
  /* Vidvorunar-kassinn a nu ad vera TOMUR a thessari deild — badar
     vidvaranirnar sem hun bar voru osannar (keeper ur `max_keepers`,
     omaeld logun ur einn-flex-toflunni). Kassi sem er alltaf raudur
     haettir ad segja neitt, svo thognin er krafan. Ad hann se ekki
     dauður er varid i `sleeper-league.mjs` (keeper/dynasty/taxi/
     uppbod/best-ball/TE-premium kvikna oll). */
  ok(!/things the model cannot take|thing the model cannot take/i.test(t),
    "og vidvorunar-kassinn er ALLS EKKI a thessari deild");

  /* --- (d2) MAELDA FORSKOTID I ÞESSARI LOGUN ---
     Innflutningur segir hvad deildin ER; thetta segir hvad bordid er
     THESS VIRDI thar. Talan kemur ur `src/rulebasis.js` og er EKKI
     reiknud i vidmótinu. 10-lida tveggja-FLEX PPR maelist +188,0 yfir
     ADP i 11 af 11 timabilum, svo hun a ad standa a skjanum. */
  ok(/Measured:/.test(t) && /over ADP/.test(t),
    "maelda forskotid i thessari logun er birt");
  ok(/188/.test(t),
    "og talan er su sem half-lab maeldi fyrir 10-2flex ppr (+188)");
  ok(!/has not been backtested/.test(t),
    "og logunin er EKKI kollud omaeld (gamla fals-vidvorunin)");

  /* --- (e) draft-id fylltist af sjalfu ser --- */
  const idInput = [...document.querySelectorAll("label.field")]
    .find((l) => /Draft ID/.test(l.textContent || ""))?.querySelector("input");
  ok(idInput && idInput.value === "1389356308125192192",
    `draft-id kom med deildinni (fann "${idInput ? idInput.value : "?"}")`);

  root.unmount();
}

/* ============================================================
   2e. SAETID ER VALID MED SMELLI THOTT RODIN SE EKKI DREGIN
   ============================================================
   `draft_order` var **null** a raunverulegri deild — Sleeper dregur
   rodina eftir a — svo leidin gegnum `draft_order` gaf EKKERT. An
   saetis strikar appid ut tha sem eru farnir en THINN hopur fyllist
   aldrei, svo "hvern a ad taka naest" veit ekki hvad thu att.

   Lidsheitin koma ur `slot_to_roster_id` -> `rosters[].owner_id` ->
   `users[].display_name`, sem er allt opinbert. Profid fer LEIDINA SEM
   NOTANDINN FER: limir inn slod, smellir a lidid sitt, samstillir.    */
console.log("\n2e. saetid valid med smelli (draft_order er null)");
{
  scenario = SCENARIOS.leagueUrl; sleeperMode = "ok";
  const root = await boot();

  await setInput("League or draft URL",
    "https://sleeper.com/leagues/1389356308104249344/predraft");
  await click([...document.querySelectorAll("button")]
    .find((b) => /^(Connect|Reading)/i.test((b.textContent || "").trim())));
  await settle(900);

  ok(scenario.draft.draft_order === null,
    "forsendan: `draft_order` ER null i thessu svari");
  ok(/Which team is yours/i.test(text()),
    "appid spyr hvada lid er mitt (i stad thess ad thegja)");
  ok(/not been drawn/i.test(text()),
    "og segir ad rodin se ekki dregin — thad er ekki bilun");

  const chips = [...document.querySelectorAll("button.chip")];
  const mineChip = chips.find((b) => /mattitim/.test(b.textContent || ""));
  ok(mineChip, `lidsheitin birtust (${chips.length} chip)`);
  ok(/7\.\s*mattitim/.test(mineChip ? mineChip.textContent : ""),
    `og saetatalan fylgir heitinu ("${mineChip ? mineChip.textContent.trim() : "?"}")`);

  await click(mineChip);
  const slotInput = [...document.querySelectorAll("label.field")]
    .find((l) => /Your slot/i.test(l.textContent || ""))?.querySelector("input");
  ok(slotInput && Number(slotInput.value) === 7,
    `smellur setti saetid i 7 (fann "${slotInput ? slotInput.value : "?"}")`);

  /* Og tha VIRKAR thad: samstillum og teljum. Saeti 7 af 10 atti
     tvo af fyrstu 20 volunum (i=6 og i=16). */
  await click([...document.querySelectorAll("button")]
    .find((b) => /live sync|Start/i.test(b.textContent || "")));
  await settle(1000);
  const t = text();
  const drafted = /(\d+) drafted/.exec(t);
  ok(drafted && Number(drafted[1]) >= 20,
    `${drafted ? drafted[1] : "?"} leikmenn strikadir ut (20 vol komin)`);
  const mine = /(\d+) yours/.exec(t);
  ok(mine && Number(mine[1]) === 2,
    `og TVEIR theirra eru minir (saeti 7 af 10) — fann ${mine ? mine[1] : "?"}`);

  root.unmount();
}

/* ============================================================
   2f. TVAER DEILDIR — OG ASTANDID MA EKKI BLANDAST
   ============================================================
   ÞETTA ER HAETTULEGASTA VILLAN I FJOL-DEILDA-STUDNINGI og hun er
   thogul: deildu tvaer deildir sama `taken`/`myPicks` vaeru leikmenn
   sem thu tokst i deild A strikadir ut i deild B, og "hvern a ad taka
   naest" taeldi hop sem thu eigir ekki thar. Bordid liti fullkomlega
   normalt ut — thad vaeri einfaldlega ad reikna annad draft.

   Profid svissar A -> B -> A og krefst thess ad HVER deild haldi sinu.  */
console.log("\n2f. tvaer deildir halda sinu astandi");
{
  scenario = SCENARIOS.leagueUrl; sleeperMode = "ok";
  const root = await boot();

  const switcherNames = () => [...document.querySelectorAll(".league-switch button.chip")]
    .map((c) => (c.textContent || "").trim())
    .filter((t) => t !== "\u00d7");
  const draftedCount = () => {
    const m = /(\d+) drafted/.exec(text());
    return m ? Number(m[1]) : null;
  };

  /* --- deild A: flytjum inn og samstillum, 20 vol --- */
  await setInput("League or draft URL",
    "https://sleeper.com/leagues/1389356308104249344/predraft");
  await click([...document.querySelectorAll("button")]
    .find((b) => /^(Connect|Reading)/i.test((b.textContent || "").trim())));
  await settle(900);
  await click([...document.querySelectorAll("button.chip")]
    .find((c) => /7\.\s*mattitim/.test(c.textContent || "")));
  await click([...document.querySelectorAll("button")]
    .find((b) => /live sync|Start/i.test(b.textContent || "")));
  await settle(1000);
  const aDrafted = draftedCount();
  ok(aDrafted >= 20, `deild A: ${aDrafted} strikadir ut`);

  /* --- deild B: onnur deild, ANNAD draft, engin vol --- */
  scenario = SCENARIOS.leagueB;
  await setInput("League or draft URL",
    "https://sleeper.com/leagues/2222222222222222222/predraft");
  await click([...document.querySelectorAll("button")]
    .find((b) => /^(Connect|Reading)/i.test((b.textContent || "").trim())));
  await settle(1000);

  const names = switcherNames();
  ok(names.some((n) => /Patriots/.test(n)) && names.some((n) => /Deildin B/.test(n)),
    `svissarinn ber BADAR deildirnar (${names.join(" | ")})`);
  /* "My league" var ohreyfdur sjalfgefinn hlekkur — hann a ad hafa
     vikid, ekki safnast sem daudur flipi. */
  ok(!names.some((n) => /My league/.test(n)),
    "ohreyfdi sjalfgefni hlekkurinn vek fyrir raunverulegri deild");

  const bDrafted = draftedCount();
  ok(bDrafted === 0,
    `deild B byrjar med TOMT bord (${bDrafted}) — astand deildar A lak ekki`);
  const teamsB = /(\d+)<\/b> teams|(\d+) teams/.exec(document.body.innerHTML);
  ok(/14/.test(text()), "og reglur deildar B eru komnar (14 lid)");

  /* --- til baka i A: mengið verdur ad vera thar enn --- */
  const chipA = [...document.querySelectorAll("button.chip")]
    .find((c) => /Patriots/.test(c.textContent || ""));
  await click(chipA);
  await settle(700);
  const backDrafted = draftedCount();
  ok(backDrafted === aDrafted,
    `til baka i A: ${backDrafted} strikadir ut (voru ${aDrafted})`);
  const slotInput = [...document.querySelectorAll("label.field")]
    .find((l) => /Your slot/i.test(l.textContent || ""))?.querySelector("input");
  ok(slotInput && Number(slotInput.value) === 7,
    `og saetid fylgdi deildinni (${slotInput ? slotInput.value : "?"})`);
  ok(/10/.test(text()), "og reglur deildar A komu til baka");

  /* Vistad astand verdur ad bera BADAR — annars hverfur onnur vid F5. */
  const saved = JSON.parse(localStorage.getItem("nfl_leagues") || "[]");
  ok(saved.length === 2, `badar deildir vistadar (${saved.length})`);
  ok(saved.every((e) => e.rules && e.rules.teams >= 4),
    "og hver ber sinar eigin reglur");
  root.unmount();
}

/* ============================================================
   2g. LITURINN A BORDINU — HVERJUM NA EG?
   ============================================================
   Liturinn er BIRTING a `survivalProb`, sem er maeld. Prófsteinninn er
   ekki "er einhver rod litud" heldur:
     · AN SAETIS ma ENGIN rod vera litud (litur ur ovissu er tilbuningur)
     · MED saeti verda thaer ad vera litadar
     · og efstu leikmenn (ADP 1-3) ma ALDREI vera "likely" — their eru
       farnir langt fyrir val 14. Su fullyrding fellur ef threpin eru
       snuin vid, sem er lumskasta villan her.                        */
console.log("\n2g. litun eftir lifun");
{
  scenario = SCENARIOS.leagueUrl; sleeperMode = "ok";
  const root = await boot();

  const shaded = () => ({
    hi: document.querySelectorAll("table.data tbody tr.reach-hi").length,
    mid: document.querySelectorAll("table.data tbody tr.reach-mid").length,
    lo: document.querySelectorAll("table.data tbody tr.reach-lo").length,
    rows: document.querySelectorAll("table.data tbody tr").length,
  });

  const before = shaded();
  ok(before.hi === 0 && before.mid === 0 && before.lo === 0,
    `an saetis er EKKERT litad (${before.hi}/${before.mid}/${before.lo})`);
  ok(!/Shading =/.test(text()), "og engin skyring birtist");

  await setInput("League or draft URL",
    "https://sleeper.com/leagues/1389356308104249344/predraft");
  await click([...document.querySelectorAll("button")]
    .find((b) => /^(Connect|Reading)/i.test((b.textContent || "").trim())));
  await settle(900);
  await click([...document.querySelectorAll("button.chip")]
    .find((c) => /7\.\s*mattitim/.test(c.textContent || "")));
  /* SAMSTILLUM LIKA. An volanna er `taken` tomt, svo naesta val mitt er
     #7 — fyrsta valid — og tha lifir nanast hver leikmadur. Thad er
     rett en thad er ekki astandid sem liturinn er TIL FYRIR: hann er
     til fyrir midjan draftinn, thar sem 20 vol eru komin og naesta val
     mitt er #27. Prof sem maelir bara byrjunina profar auðvelda
     tilfellid. */
  await click([...document.querySelectorAll("button")]
    .find((b) => /live sync|Start/i.test(b.textContent || "")));
  await waitFor(() => /20 drafted/.test(text()), 4000);
  await settle(400);

  const after = shaded();
  ok(after.mid === 0, `midjan er OLITUD — engin fullyrding (${after.mid})`);
  ok(after.hi > 0 && after.lo > 0,
    `med saeti litast BADIR endar (${after.hi} obida, ${after.mid} vafi, ` +
    `${after.lo} farinn af ${after.rows})`);
  /* ============================================================
     TONARNIR VERDA AD VERA GREINANLEGIR A SKJA
     ============================================================
     Þrju-tona utgafan TALDIST rett (189/5/6) og var samt onyt: gult og
     raudt voru ogreinanleg, (2, 5, 1) i RGB. Tvaer tolur sem teljast
     rett geta verid einn litur fyrir auganu, svo talningin ein er
     ekki nog — fjarlaegdin verdur ad vera FULLYRDING. Sama regla og
     FPL-verkefnid ber um nagrannathrep.

     LESID UR `styles.css`, EKKI UR `getComputedStyle`: jsdom hledur
     ENGU stilblaði, svo `getComputedStyle(...).backgroundColor` er tomur
     strengur og fullyrdingin hefdi verid `null === null` — thogul
     fullyrding sem gat ekki brugdist. `layout.mjs` les CSS-skrana af
     sama tilefni.                                                    */
  const css = readFileSync(path.join(ROOT, "src", "styles.css"), "utf8");
  const hex = (cls) => {
    const re = new RegExp(`\\.reach-key\\.${cls}\\s*\\{[^}]*background:\\s*#([0-9a-fA-F]{6})`);
    const m = re.exec(css);
    return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
  };
  const cHi = hex("reach-hi"), cLo = hex("reach-lo");
  ok(cHi && cLo, `tonarnir lesast ur styles.css (${cHi} / ${cLo})`);
  if (cHi && cLo) {
    const d = Math.max(...cHi.map((v, i) => Math.abs(v - cLo[i])));
    ok(d >= 20, `og eru sjonraent adgreindir — max RGB-fjarlaegd ${d} (>=20)`);
  }
  /* ============================================================
     MERKID ER I FRAVIKINU — "TAKE HIM NOW" VERDUR AD VERA FATT
     ============================================================
     Tvaer utgafur mistokust adur (sja `reachClass`): 94% radanna
     litadar i einum ton, og sidan 1%. Sa tonn sem KALLAR A ADGERD —
     "farinn adur en thu velur aftur" — er sa sem verdur ad vera
     sjaldgaefur; annars er hann bakgrunnur og notandinn les hann ekki.

     Fullyrdingin er a HLUTFALLI, ekki a fjolda: fost tala staðnar um
     leid og bordid staekkar (sama villan og hardkodada safna-talan). */
  const act = (after.mid + after.lo) / after.rows;
  ok(act > 0 && act < 0.35,
    `og adgerda-tonarnir eru fair — ${Math.round(act * 100)}% ` +
    `(${after.mid + after.lo} af ${after.rows})`);
  /* Skyringin er prófuð a BYGGINGU, ekki a ordalagi — tvo prof i
     FPL-verkefninu fellu vid endurnefningu a flipa af thvi ad thau
     smelltu eftir nakvaemu heiti. Stodugu merkin eru depillinn sjalfur
     (`.reach-key`, sami litur og rodin) og VALNUMERID, sem er thad eina
     sem skyringin fullyrdir um. */

  ok(/#27\b/.test(text()),
    "og nefnir naesta val MITT (#27 — saeti 7 af 10, 20 vol komin)");

  /* ------------------------------------------------------------
     OG KASSINN VERDUR AD SEGJA SOMU TOLUNA — LESID AF SKJANUM
     ------------------------------------------------------------
     Talan hér ofan kemur ur BORDINU (`nextOwn`). Radgjafarkassinn
     skrifadi sina eigin (`Your next pick is X, Y picks away`) og thaer
     voru samhljoda i 6 af 60 volum: i thessari nakvaemu svidsmynd sagdi
     sami skjar "#27" og "next pick is 40, 19 picks away".

     `tests/advice.mjs` kafli 12 ver hreinu rokfraedina og `wiring.mjs`
     ver ad `nextPick` se SENT. HVORUGT LES SKJAINN. Fyrri fullyrdingin
     hér (`/#27\b/`) er tilvist EINNAR tolu; hun getur ekki sed ad ONNUR
     tala a sama skja se osatt vid hana. Þess vegna eru thaer bornar
     saman hér, i DOM-inu, thar sem notandinn ser thaer.               */
  {
    const t = text();
    const box = t.match(/Your next pick is\s*(\d+),\s*(\d+) picks? away/);
    ok(!!box, `kassinn birtir naesta val og bid (${box ? box[0] : "FANNST EKKI"})`);
    if (box) {
      ok(box[1] === "27",
        `og thad er SAMA talan sem bordid litar med — 27 (kassinn: ${box[1]})`);
      ok(Number(box[2]) === 27 - 21,
        `og bidin er samhljoda tolunni (${box[2]}, vaentanlegt ${27 - 21})`);
    }
    /* Valnumerid i hausnum a kassanum lika — thad var `taken.size + 1`
       og telur nu oporud vol med (`pickNo`). */
    const hdr = t.match(/Pick\s*(\d+)\s*—\s*take this/);
    ok(!!hdr, `kassinn birtir valnumerid sjalft (${hdr ? hdr[0] : "FANNST EKKI"})`);
    if (hdr) ok(hdr[1] === "21",
      `og thad er 21 (20 vol komin) — ekki bara "einhver tala" (${hdr[1]})`);
  }

  /* Toppurinn a bordinu ma EKKI vera "likely" — saeti 7 velur naest i
     vali 14, og ADP 1-3 er longu farinn tha. Snuin threp faella thetta. */
  const firstRows = [...document.querySelectorAll("table.data tbody tr")].slice(0, 3);
  ok(firstRows.length === 3 && firstRows.every((tr) => !tr.classList.contains("reach-hi")),
    "efstu thrir (ADP naest valinu) eru EKKI merktir \"obidu\"");
  /* Og djupt a bordinu ma enginn vera "farinn" — ADP 100 er ekki
     tekinn i vali 27. Snuin threp faella BADAR thessar. */
  const deep = [...document.querySelectorAll("table.data tbody tr")].slice(60, 160);
  ok(deep.some((tr) => tr.classList.contains("reach-hi")),
    "en djupt a bordinu er \"obidu\"");
  ok(!deep.some((tr) => tr.classList.contains("reach-lo")),
    "og enginn djupt a bordinu er \"farinn\" (snuin threp faella thetta)");
  const keys2 = document.querySelectorAll(".reach-key");
  ok(keys2.length === 2, `skyringin ber tvo depla, ekki thrja (${keys2.length})`);

  /* Talan sjalf verdur ad vera lesanleg — tonn an tolu er rada sem
     enginn getur boriđ vid neitt. */
  const titled = [...document.querySelectorAll("table.data tbody td.frozen[title]")]
    .filter((td) => /% likely to last/.test(td.getAttribute("title") || ""));
  ok(titled.length > 0, `${titled.length} rodir bera prosentuna i title`);
  root.unmount();
}

/* ============================================================
   2f2. SAMNEFNDAR DEILDIR VERDA AD VERA GREINANLEGAR
   ============================================================
   FANNST I VAFRANUM, EKKI I PROFI. 2026- og 2025-utgafur af sama
   nafni ("Patriots SB champs") eru BADAR 10 lid og BADAR PPR, svo
   flipirnir voru staffrettur EINS — og athugasemdin i `App.jsx`
   fullyrdi ad `teams`/`scoring` gerdu thau greinanleg. Sama aett og
   fuzzy-liða-porunin sem felldi Man United inn i Man City: thogul
   samsomun er verri en engin.

   Prófad i BADAR ATTIR: samnefndar fa timabilid, ossamnefndar fa thad
   EKKI (annars baeri hver flipi "2026" ad eilifu).                   */
console.log("\n2f2. samnefndar deildir");
{
  scenario = SCENARIOS.leagueUrl; sleeperMode = "ok";
  localStorage.clear();
  /* Tvaer faerslur, SAMA nafn, sama stigagjof og lidafjoldi — eina sem
     skilur thaer er timabilid. */
  const mk = (id, season) => ({
    id, name: "Patriots SB champs",
    rules: { teams: 10, scoring: "ppr", rounds: 15, superflex: false,
             starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
             maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } },
    imported: { leagueId: id, name: "Patriots SB champs", season, teams: 10,
                rounds: 15, scoring: "ppr", exactScoring: true, bench: 5,
                starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
                superflex: false, orderDrawn: false, draftId: "" },
    warnings: [], teams: [], sync: { draftId: "", slot: null },
  });
  localStorage.setItem("nfl_leagues", JSON.stringify([mk("111111111111111111", "2026"),
                                                     mk("222222222222222222", "2025")]));
  localStorage.setItem("nfl_activeLeague", JSON.stringify("111111111111111111"));
  const el = document.getElementById("root");
  const root = createRoot(el);
  await act(async () => { root.render(React.createElement(App)); });
  await settle(800);

  const chips = [...document.querySelectorAll(".league-switch button.chip")]
    .map((c) => (c.textContent || "").trim())
    .filter((t) => t !== "\u00d7");
  ok(chips.length === 2, `badir flipar birtast (${chips.length})`);
  ok(chips[0] !== chips[1],
    `og their eru EKKI eins — "${chips[0]}" / "${chips[1]}"`);
  ok(chips.some((c) => /2026/.test(c)) && chips.some((c) => /2025/.test(c)),
    "timabilid er thad sem skilur thau");
  root.unmount();

  /* OSSAMNEFNDAR fa EKKI timabilid — annars vaeri thad havadi. */
  localStorage.clear();
  const a2 = mk("333333333333333333", "2026");
  const b2 = { ...mk("444444444444444444", "2026"), name: "Deildin B" };
  localStorage.setItem("nfl_leagues", JSON.stringify([a2, b2]));
  localStorage.setItem("nfl_activeLeague", JSON.stringify(a2.id));
  const root2 = createRoot(document.getElementById("root"));
  await act(async () => { root2.render(React.createElement(App)); });
  await settle(800);
  const chips2 = [...document.querySelectorAll(".league-switch button.chip")]
    .map((c) => (c.textContent || "").trim())
    .filter((t) => t !== "\u00d7");
  ok(chips2.length === 2 && !chips2.some((c) => /2026/.test(c)),
    `ossamnefndar bera ekki timabil (${chips2.join(" | ")})`);
  root2.unmount();
}

/* ============================================================
   2h. UPPFAERSLAN MA EKKI THURRKA UT DRAFT SEM ER I GANGI
   ============================================================
   Fyrir 12.8.2026 var astandid OLYKLAD: `nfl_taken`, `nfl_myPicks`,
   `nfl_sync` og `nfl_league`. Notandi sem er i MIDJU DRAFTI thegar
   uppfaerslan kemur myndi opna appid og sja TOMT bord — mengid er enn
   i vafranum, appid vaeri einfaldlega hætt ad leita ad thvi. Thad er
   nakvaemlega sami flokkur og "tom keyrsla ma aldrei thurrka ut god
   gogn": gagnid er oskert, tengingin slitin.

   Profid skrifar GAMLA snidid beint i geymsluna, raesir appid og
   krefst thess ad allt komi med.                                    */
console.log("\n2h. gamalt astand flyst yfir");
{
  scenario = SCENARIOS.inProgress; sleeperMode = "ok";
  localStorage.clear();
  const legacyIds = REAL_IDS.slice(0, 9);
  localStorage.setItem("nfl_taken", JSON.stringify(legacyIds));
  localStorage.setItem("nfl_myPicks", JSON.stringify(legacyIds.slice(0, 3)));
  localStorage.setItem("nfl_sync", JSON.stringify({ draftId: "d2", slot: 4 }));
  localStorage.setItem("nfl_league", JSON.stringify({ teams: 14, scoring: "standard" }));

  const el = document.getElementById("root");
  const root = createRoot(el);
  await act(async () => { root.render(React.createElement(App)); });
  await settle(900);

  const t = text();
  const drafted = /(\d+) drafted/.exec(t);
  ok(drafted && Number(drafted[1]) === 9,
    `gomlu 9 volin komu med (${drafted ? drafted[1] : "?"})`);
  const mine = /(\d+) yours/.exec(t);
  ok(mine && Number(mine[1]) === 3, `og gomlu 3 minir (${mine ? mine[1] : "?"})`);

  const idInput = [...document.querySelectorAll("label.field")]
    .find((l) => /Draft ID/.test(l.textContent || ""))?.querySelector("input");
  ok(idInput && idInput.value === "d2", `gamla draft-id kom med ("${idInput ? idInput.value : "?"}")`);
  const slotInput = [...document.querySelectorAll("label.field")]
    .find((l) => /Your slot/i.test(l.textContent || ""))?.querySelector("input");
  ok(slotInput && Number(slotInput.value) === 4,
    `og gamla saetid (${slotInput ? slotInput.value : "?"})`);

  const es = JSON.parse(localStorage.getItem("nfl_leagues") || "[]");
  ok(es.length === 1 && es[0].rules.teams === 14 && es[0].rules.scoring === "standard",
    `gamla deildin vard fyrsti hlekkurinn (${es.length ? es[0].rules.teams + "/" + es[0].rules.scoring : "?"})`);
  ok(/14/.test(document.querySelector("header.top").textContent || ""),
    "og hausinn ber hana");
  root.unmount();
}

/* ============================================================
   3. BILANIR — SYNILEGAR, EKKI THOGULAR
   ============================================================ */
console.log("\n3. bilanir");
for (const [mode, label] of [["404", "Sleeper svarar 404"],
                             ["net", "netid dettur ut"],
                             ["rusl", "svarid er ekki JSON"]]) {
  scenario = SCENARIOS.inProgress; sleeperMode = mode;
  const root = await boot();
  let crashed = false;
  try {
    await setInput("Sleeper username", "adi");
    await click([...document.querySelectorAll("button")]
      .find((b) => /Find leagues/i.test(b.textContent || "")));
    await settle(600);
    await setInput("Draft ID", "d2");
    await click([...document.querySelectorAll("button")]
      .find((b) => /live sync|Start/i.test(b.textContent || "")));
    await settle(600);
  } catch { crashed = true; }
  const t = text();
  ok(!crashed && !/Something broke/.test(t) && t.length > 400,
    `${label}: appid stendur`);
  root.unmount();
}

/* ============================================================
   4. ENGIN SLEEPER-KOLL AN THESS AD BEDID SE UM THAU
   ============================================================
   Appid ma ekki kalla i Sleeper vid raesingu. Notandinn hefur ekki
   bedid um thad, og pollun sem enginn kveikti a er bædi ovaent og
   dónaleg vid gestgjafann.                                        */
console.log("\n4. engin sjalfvirk koll");
{
  calls.length = 0;
  scenario = SCENARIOS.inProgress; sleeperMode = "ok";
  const root = await boot();
  await settle(900);
  ok(calls.length === 0, `engin Sleeper-koll vid raesingu (${calls.length})`);
  root.unmount();
}

/* ============================================================
   5. ENGIN LEIKMANNA-AUDKENNI FARA UT
   ============================================================
   Slodin ma bera draft-id — thad er notandans eigid og hann limdi thad
   inn. Hun ma EKKI bera hop, nofn ne stillingar.                   */
console.log("\n5. ekkert fer ut sem a ad vera kyrrt");
{
  calls.length = 0;
  scenario = SCENARIOS.inProgress; sleeperMode = "ok";
  const root = await boot();
  await setInput("Draft ID", "d2");
  await click([...document.querySelectorAll("button")]
    .find((b) => /live sync|Start/i.test(b.textContent || "")));
  await settle(800);
  const leaky = calls.filter((u) => /taken|roster|league=|players=|nfl_/.test(u));
  ok(leaky.length === 0, `engar slodir bera hopinn (${leaky.slice(0, 2).join(", ") || "hreint"})`);
  ok(calls.every((u) => u.startsWith("https://api.sleeper.app/")),
    `oll koll fara adeins til Sleeper (${calls.length} koll)`);
  root.unmount();
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
