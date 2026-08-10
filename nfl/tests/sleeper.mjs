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
};

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
    if (/\/drafts$/.test(s)) {
      return { ok: true, status: 200, json: async () => [scenario.draft] };
    }
    if (/\/picks$/.test(s)) {
      return { ok: true, status: 200, json: async () => scenario.picks };
    }
    if (/\/draft\//.test(s)) {
      return { ok: true, status: 200, json: async () => scenario.draft };
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

  /* Og afturforin ma ekki hafa verid SKRIFUD i localStorage. */
  const saved = JSON.parse(localStorage.getItem("nfl_taken") || "[]");
  ok(saved.length >= Number(afterClick[1]),
    `og vistada mengid ber thad lika (${saved.length} audkenni)`);
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
