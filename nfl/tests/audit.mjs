/* ============================================================
   audit.mjs — HORD UTTEKT. Leitar ad villum, ekki ad stadfestingu.

   Hin profin spyrja "virkar thad sem eg aetladi?". Thetta spyr
   "hvad er ad?" — og thad er allt onnur spurning. Thad keyrir appid
   i gegnum HVERT vidmot, HVERJA deildarstillingu og hvert jadartilvik
   sem mer datt i hug, og fellur a ollu sem litur ut eins og bilun:

     NaN, Infinity, "undefined", "null", "[object Object]" i DOM
     React-vidvaranir (lyklar, stjornadir reitir, oskilgreind stodd)
     tolur utan raunhaefra marka
     tomir flipar sem aettu ad hafa innihald
     hrun vid tomt inntak

   ÞETTA A AD FALLA THEGAR EITTHVAD ER AD. Se thad alltaf graent er
   thad ekki ad leita nogu vitt.
   ============================================================ */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data");

let fail = 0, warn = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const soft = (c, m) => { if (!c) { console.log(`  warn ${m}`); warn++; } };

/* ---------- umhverfi ---------- */
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
global.confirm = () => false;

/* HVER EINASTA console.error/warn ER SKRAD. React skrifar sinar
   vidvaranir thangad, og hin profin hunsudu thaer alveg. */
const logged = [];
for (const level of ["error", "warn"]) {
  const orig = console[level];
  console[level] = (...a) => {
    const s = a.map((x) => (typeof x === "string" ? x : String(x))).join(" ");
    /* Sleppum eigin uttaki profsins OG kvortunum Node sjalfs yfir
       `module.register()` i jsx-keyraranum — thad er umhverfid. */
    const mine = /^\s*(ok|warn|FAIL)\s/.test(s);
    const node = /DeprecationWarning|module\.register|trace-deprecation/.test(s);
    if (!mine && !node) logged.push({ level, s });
    orig.apply(console, a);
  };
}

let fetchCount = 0, sleeperCalls = 0;
/* SLODIRNAR ERU SKRADAR, ekki bara taldar. Kafli 9 ver nu ad forsidan
   megi kalla `/rosters` og `/users` en EKKERT annad megi kalla neitt —
   og til thess tharf hann ad vita HVAD var kallad, ekki bara hve oft.
   Tala ein gaeti ekki greint rett kall fra rongu. */
const sleeperUrls = [];
global.fetch = async (url) => {
  const s = String(url);
  fetchCount++;
  if (s.includes("api.sleeper")) {
    sleeperCalls++; sleeperUrls.push(s);
    return { ok: false, status: 500, json: async () => ({}) };
  }
  const m = s.match(/\/data\/(.+)$/);
  if (!m) return { ok: false, status: 404, json: async () => ({}) };
  const f = path.join(DATA, m[1]);
  if (!existsSync(f)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(f, "utf8")) };
};

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
global.IS_REACT_ACT_ENVIRONMENT = true;
const App = (await import("../src/App.jsx")).default;

const root = createRoot(document.getElementById("root"));
const settle = async (ms = 350) => {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)); });
};
const text = () => document.body.textContent || "";
const html = () => document.body.innerHTML || "";

await act(async () => { root.render(React.createElement(App)); });
await settle(600);

/* ============================================================
   1. RUSL I DOM
   ============================================================ */
console.log("\n1. rusl i DOM");
const TRASH = [
  [/\bNaN\b/, "NaN"],
  [/\bInfinity\b/, "Infinity"],
  [/\bundefined\b/, "undefined"],
  [/\[object Object\]/, "[object Object]"],
  [/\bnull\b/, "orðið null"],
];

async function tabs() {
  return [...document.querySelectorAll("button.tab")]
    .map((b) => (b.textContent || "").trim()).filter(Boolean);
}
  /* FALDIR FLIPAR (12.8.2026): sex flipar eru ekki i DOM fyrr en
     "More" er smellt. Their eru afram virkir — thad var birtingar-
     akvordun, ekki likans-akvordun — svo prófid a ad OPNA thá, ekki
     ad sleppa theim. Vaeri theim sleppt hyrfi thekjan thogult og
     safnid yrdi graent an ad heimsaekja neitt.
     `revealTabs` er ohaett ad kalla oft: hnappurinn er horfinn eftir
     fyrsta smell. */
  const revealTabs = async () => {
    const more = [...document.querySelectorAll("button.tab")]
      .find((x) => /More/.test(x.textContent || ""));
    if (!more) return;
    await act(async () => {
      more.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    await settle(500);
  };
async function clickTab(label) {
  await revealTabs();
  const b = [...document.querySelectorAll("button.tab")]
    .find((x) => (x.textContent || "").includes(label));
  if (!b) return false;
  await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle(500);
  return true;
}
async function clickChips() {
  /* Smellir a hvern chip i rod og bidur — sumir skipta um undirflipa. */
  const chips = [...document.querySelectorAll("button.chip")];
  for (const c of chips.slice(0, 12)) {
    await act(async () => { c.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    await settle(220);
  }
}

/* Faldir flipar opnadir ADUR EN thad er talid — annars hrynur thekjan
   ur 8 i 2 og lykkjan hér a eftir heimsaekir tvo flipa. `TABS.length >= 6`
   hefdi fellt profid, sem er rett hegdun; rett svar er ad opna thá. */
await revealTabs();
const TABS = (await tabs()).filter((t) => !/More/.test(t));
console.log(`  flipar: ${TABS.join(" · ")}`);
ok(TABS.length >= 6, `${TABS.length} flipar finnast`);

const dirty = [];
for (const t of TABS) {
  if (/FPL/.test(t)) continue;              // ytri hlekkur
  await clickTab(t);
  await clickChips();
  const body = text();
  for (const [re, name] of TRASH) {
    if (re.test(body)) dirty.push(`${t}: ${name}`);
  }
  soft(!text().includes("Something broke"), `${t}: villuvorn greip`);
}
ok(dirty.length === 0, `ekkert rusl i neinum flipa (${dirty.join(", ") || "hreint"})`);

/* ============================================================
   2. REACT-VIDVARANIR
   ============================================================ */
console.log("\n2. React-vidvaranir");
const reactWarn = logged.filter((l) =>
  /Warning|Each child|controlled|uncontrolled|key|validateDOMNesting|act\(/i.test(l.s));
for (const w of reactWarn.slice(0, 6)) console.log(`     ${w.s.slice(0, 150)}`);
ok(reactWarn.length === 0, `engar React-vidvaranir (${reactWarn.length})`);

const otherErr = logged.filter((l) => l.level === "error" && !reactWarn.includes(l));
for (const w of otherErr.slice(0, 5)) console.log(`     ${w.s.slice(0, 150)}`);
ok(otherErr.length === 0, `engar villur i console (${otherErr.length})`);

/* ============================================================
   3. ALLAR DEILDARSTILLINGAR
   ============================================================
   Stillingarnar breyta ADP-setti, spa, varamanns-threpi OG radgjof.
   Hver samsetning er annar heimur og hver theirra verdur ad standa. */
console.log("\n3. deildarstillingar");
/* ============================================================
   HANDVIRKU REITIRNIR ERU FARNIR — DEILDIN ER FLUTT INN
   ============================================================
   Þessi kafli stillti adur `<select>`-reitina "Teams" og "Scoring" i
   hausnum. Their voru teknir ut 12.8.2026: deildin er lesin ur Sleeper,
   svo tveir reitir sem segja thad sama voru ofthorf OG haetta (sa sem
   hreyfdi "Scoring" eftir innflutning reiknadi deild sem Sleeper ber
   ekki, og ekkert a skjanum sagdi honum thad).

   ÞEKJAN MA EKKI FARA MED THEIM. Nu er deildin sett thar sem hun
   raunverulega byr — `nfl_leagues` — og appid endurraest. Thad er
   STRANGARA en adur: prófid fer sama leid og innflutningurinn fer, i
   stad thess ad fara leid sem er ekki lengur til.

   Vaeri thetta einfaldlega fellt ut hefdi thekjan horfid THEGJANDI —
   sami flokkur og `react-warnings.mjs` sem heimsotti 0 af 22 vidmotum
   og var graent. Thess vegna er `comboFails` talid og TALAN fellir
   prófid, og `shapesSeen` sannar ad hver samsetning var raunverulega
   heimsott.                                                          */
let auditRoot = root;
const bootWithLeague = async (rules) => {
  /* FERSKUR `root` I HVERT SINN. `root.render` a SAMA rot uppfaerir
     adeins — `useState`-upphafsgildin keyra ekki aftur, svo deildin sem
     var skrifud i geymsluna hefdi ALDREI verid lesin og lykkjan hefdi
     maelt sjalfgefna 12-lida deildina niu sinnum. Thad las eins og niu
     graen prof. Vordurinn er `shapesSeen`, sem sa thad. */
  auditRoot.unmount();
  await settle(50);
  localStorage.setItem("nfl_leagues", JSON.stringify([{
    id: "audit", name: "Audit league", rules,
    imported: { leagueId: "audit", name: "Audit league", teams: rules.teams,
                rounds: rules.rounds, scoring: rules.scoring, exactScoring: true,
                bench: 5, starters: rules.starters, superflex: false,
                orderDrawn: false, draftId: "" },
    warnings: [], teams: [], sync: { draftId: "", slot: null },
  }]));
  localStorage.setItem("nfl_activeLeague", JSON.stringify("audit"));
  auditRoot = createRoot(document.getElementById("root"));
  await act(async () => { auditRoot.render(React.createElement(App)); });
  await settle(700);
};

let comboFails = 0;
const shapesSeen = [];
for (const teams of [8, 12, 16]) {
  for (const scoring of ["ppr", "half-ppr", "standard"]) {
    await bootWithLeague({
      teams, scoring, rounds: 15, superflex: false,
      starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 },
      maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
    });
    await clickTab("Draft");

    /* Deildin verdur ad hafa TEKID VID — annars maelir lykkjan sama
       heiminn niu sinnum og les eins og niu graen prof. */
    const hdr = (document.querySelector("header.top") || {}).textContent || "";
    /* `\b${teams}\b` VIRKADI EKKI og gaf 0/9 — hausinn er
       "…preseason8 teams…" thvi `textContent` límir saman texta an bila
       (sama gildra og `MUNaNEW` -> `NaN` i FPL-verkefninu). Milli `n` og
       `8` er ekkert ordamark. Leitum thvi a "N teams" med varnagla svo
       "18 teams" geti ekki lesist sem "8 teams". */
    if (!new RegExp(`(^|[^0-9])${teams} teams`).test(hdr)) {
      console.log(`     ${teams}/${scoring}: deildin tok EKKI vid (haus: ${hdr.slice(0, 60)})`);
      comboFails++;
      continue;
    }
    shapesSeen.push(`${teams}/${scoring}`);

    const body = text();
    const bad = TRASH.filter(([re]) => re.test(body)).map(([, n]) => n);
    if (bad.length) { console.log(`     ${teams}/${scoring}: ${bad.join(",")}`); comboFails++; }
    const rows = document.querySelectorAll("table.data tbody tr").length;
    if (rows < 20) { console.log(`     ${teams}/${scoring}: adeins ${rows} radir`); comboFails++; }
  }
}
ok(comboFails === 0, `allar 9 samsetningar lidafjolda og stigagjafar i lagi`);
ok(shapesSeen.length === 9,
  `og allar NIU voru raunverulega heimsottar (${shapesSeen.length})`);
/* Skilum heiminum i sjalfgefid astand fyrir kaflana sem a eftir koma. */
await bootWithLeague({
  teams: 12, scoring: "ppr", rounds: 15, superflex: false,
  starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 },
  maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
});

/* ============================================================
   4. TOLUR INNAN RAUNHAEFRA MARKA
   ============================================================ */
console.log("\n4. tolur innan marka");
{
  const { buildRows } = await import("../src/build.js");
  const rd = (f) => JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
  const built = buildRows({
    players: rd("players.json"), seasons: rd("seasons.json"),
    schedule: rd("schedule.json"), market: rd("market.json"),
    league: { teams: 12, scoring: "ppr",
              starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 } },
  });
  const R = built.rows;
  const num = (k) => R.map((r) => r[k]).filter((v) => v != null && Number.isFinite(v));

  /* `proj` MA vera litillega neikvaett. Sleeper gefur t.d. Devin Duvernay
     -1,4 (1 hlaup, 6 jardar, og fumble-lidur sem magnsundurlidunin theirra
     synir ekki). Thad er TALA HEIMILDARINNAR, ekki okkar reikningur, og
     mennirnir eru i saeti 511-512 af 558. Vid buum ekki til 0 ur henni —
     tha vaeri omaeld tala komin i stadinn fyrir maelda. Golfid -10 grípur
     hins vegar merkjaskipti eda kvardavillu. */
  /* ============================================================
     KVARDA-GATID — SJO STOKKBREYTINGAR LIFDU, OG ThAER VORU ALLAR
     SOMU GERDAR
     ============================================================
     Uttekt 21.8.2026 keyrdi 16 stokkbreytingar a birtum, afleiddum
     svidum. SJO lifdu, og thaer voru naestum allar KVARDI:

         waiver `gain` x17 · `playoffSos` x17 · `teamScored` x17
         `lastPpg` x17 · `lastTshare` x17 · `age` -> null
         `value` + 3 umferdir

     ASTAEDAN VAR EKKI ad vantadi vordur heldur ad taflan var
     HANDSKRIFAD URTAK: `sos` var i henni og `playoffSos` — sami
     reikningur, sami kvardi, systkin i sömu rod i `build.js` — var thad
     ekki. Sama gerd og handskrifadi listinn i `wiring.mjs` kafla 7.

     TOLURNAR ERU MAELDAR UR RAUNGOGNUM 21.8.2026 (844-1113 radir) og
     bilin eru RUM: thau eru ekki kvordun, thau eru til thess ad
     utiloka staerdargradu-villu. Sama regla og staerdar-akkerid i
     `dashboard.mjs` kafla 3b.

         playoffSos   20,33 - 27,25   -> x17 gefur 345+
         teamScored   18,44 - 26,65   -> x17 gefur 313+
         lastPpg      -1,00 - 24,51   -> x17 gefur 416
         lastTshare    0,00 -  0,368  -> hlutfall; x17 gefur 6,2
         value       -26,63 -  8,19   -> sja EIGIN vordinn nedar

     `value` FAER SITT EIGID PROF OG ThAD ER ASETT. Rumt bil getur ekki
     greint "+3 umferdir" (8,19 -> 11,19) an thess ad vera svo throngt
     ad thad flokti med daglegu ADP-inu, og "floktandi prof er verra en
     ekkert" (README 6d). Rett vordur er SKILGREININGIN: talan verdur ad
     vera `valueVsMarket(rank, adp, teams)` — sama fall og `build.js`
     kallar, FLUTT INN og ekki afritad. Grunnurinn sjalfur er OPIN
     spurning (uttekt, atridi 5) og er EKKI hreyfdur hér.            */
  const bounds = {
    proj: [-10, 600], vbd: [-400, 400], adp: [0.5, 400],
    aRank: [1, 2000], tier: [1, 30], ecr: [1, 1200], bye: [4, 15],
    /* 46 kom upp 24.8.2026 (langlifur spyrnumadur) og felldi profid.
       Mork sem eru pinnud vid thad sem var i gogunum i dag eru daemi,
       ekki fasti — sja README 4b. Efra markid er nu 50: enn langt undir
       ollu sem vaeri gagnavilla (villa i fodun gefur 0, negatift eda
       thriggja stafa tolu), en tholir raunverulegan langlifan leikmann. */
    age: [18, 50], sos: [10, 40],
    playoffSos: [10, 40], teamScored: [3, 60],
    lastPpg: [-10, 50], lastTshare: [0, 1],
    value: [-60, 40],
  };
  for (const [k, [lo, hi]] of Object.entries(bounds)) {
    const v = num(k);
    /* ============================================================
       DALKUR SEM HVERFUR ALVEG VAR VIDVORUN SEM SKILADI 0 — LAGAD
       ============================================================
       Hér stod `soft(false, …)`, sem prentar `warn` og fellir EKKERT.
       Þess vegna lifdi `age -> null`: allur dalkurinn hvarf ur
       leikmannaspjaldinu og keyrslan var graen. Dalkur sem er BUNDINN
       er dalkur sem er BIRTUR, og "svidid er tomt" er thvi bilun, ekki
       athugasemd — sama regla og "thekja er fullyrding, ekki logga"
       (CLAUDE.md 5b regla 1).

       Golfid er 20 gildi og ekki 1: dalkur sem hrynur ur 844 rodum i
       tvaer er jafn bilaður og dalkur sem hrynur i null, og
       "ekki-tomt" getur ekki greint thad.                          */
    ok(v.length >= 20,
      `${k}: ${v.length} gildi bera tolu (dalkur sem hverfur er BILUN)`);
    if (!v.length) continue;
    const out = v.filter((x) => x < lo || x > hi);
    ok(out.length === 0,
      `${k}: ${v.length} gildi, oll innan [${lo}, ${hi}]` +
      (out.length ? ` — ${out.length} utan, t.d. ${out[0]}` : ""));
  }

  /* ---- `value` ER SKILGREINING, EKKI BIL ---- */
  {
    const { valueVsMarket } = await import("../src/model.js");
    const withBoth = R.filter((r) => r.value != null && r.rank != null && r.adp != null);
    ok(withBoth.length >= 50,
      `ThEKJA: ${withBoth.length} radir bera BADI \`rank\` og \`adp\` — ` +
      "an theirra er fullyrdingin nedan tom");
    const wrong = withBoth.filter((r) =>
      Math.abs(r.value - valueVsMarket(r.rank, r.adp, 12)) > 1e-9);
    ok(wrong.length === 0,
      `\`value\` ER \`valueVsMarket(rank, adp, teams)\` a ollum ${withBoth.length} ` +
      `rodum (${wrong.length} skekkja` +
      (wrong.length ? `, t.d. ${wrong[0].name}: ${wrong[0].value} gegn ` +
        `${valueVsMarket(wrong[0].rank, wrong[0].adp, 12)}` : "") + ")");
    /* Og fullyrdingin verdur ad geta brugdist: hlidrun um eina umferd
       er thad sem stokkbreytingin gerdi, og hun ma ekki sleppa. */
    ok(withBoth.some((r) =>
      Math.abs((r.value + 3) - valueVsMarket(r.rank, r.adp, 12)) > 1e-9),
      "og +3 umferdir vaeri ONNUR tala (maelitaekid virkar)");
  }

  /* ---- WAIVER-ABATINN ER LIKA KVARDI, OG HANN VAR OBUNDINN ----
     `gain` er TIMABILS-VBD (sja `WAIVER_CAL.currency`), svo hann er
     mismunur tveggja `vbd`-talna og bilid leidir af theirra bili. x17
     for i gegn af thvi ad ENGINN vordur skodadi toluna a raunbordi.  */
  {
    const { freeAgents, pickupAdvice } = await import("../src/waivers.js");
    const L = { teams: 12, scoring: "ppr",
                starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 } };
    /* Einn "hopur" med tiu monnum ur midjunni, svo laugin beri raunveruleg
       skipti. Rostrarnir eru LESANLEGIR — annars er laugin null og
       kaflinn maelir ekkert. */
    const pool = R.filter((r) => r.vbd != null).slice(0, 200);
    const mineIds = pool.slice(120, 130).map((r) => String(r.id));
    const fa = freeAgents({ rows: pool, myRosterId: 1,
      rosters: [{ roster_id: 1, owner_id: "u1", players: mineIds }] });
    ok(fa.pool != null && fa.pool.length > 20,
      `ThEKJA: laugin er lesin (${fa.pool ? fa.pool.length : "null"} lausir)`);
    const picks = pickupAdvice({ pool: fa.pool, mine: fa.mine, league: L, week: null });
    ok(picks.length >= 1, `og ${picks.length} skipti radlogd (annars er bilid tomt)`);
    const badGain = picks.filter((p) => !(p.gain > 0 && p.gain <= 600));
    ok(badGain.length === 0,
      `waiver \`gain\` innan (0, 600] a ollum ${picks.length} skiptum ` +
      `(${badGain.length} utan${badGain.length ? `, t.d. ${badGain[0].gain}` : ""})`);
    /* OG SKILGREININGIN, eins og med `value`: `gain` er munur a `vbd`.
       x17 er tha ekki "utan bils" heldur "ekki thad sem hun segir". */
    const r1 = (x) => Math.round(x * 10) / 10;
    const wrong = picks.filter((p) =>
      Math.abs(p.gain - r1(p.add.vbd - p.drop.vbd)) > 1e-9);
    ok(wrong.length === 0,
      `og hann ER \`vbd(inn) - vbd(ut)\` (${wrong.length} skekkja)`);
  }

  /* Rodin verdur ad vera THETT og EINKVAEM. Gloppa eda tvitekning
     thydir ad tveir menn deila saeti eda eitt saeti vantar. */
  const ranks = R.map((r) => r.aRank).filter((v) => v != null).sort((a, b) => a - b);
  ok(new Set(ranks).size === ranks.length, `A-Rank einkvaem (${ranks.length} saeti)`);
  ok(ranks[0] === 1 && ranks.at(-1) === ranks.length,
    `A-Rank er thett 1..${ranks.length} (byrjar ${ranks[0]}, endar ${ranks.at(-1)})`);

  /* K og DST mega EKKI vera i A-Ranking (sja notu i build.js). */
  const kdst = R.filter((r) => ["K", "DST"].includes(r.pos) && r.aRank != null);
  ok(kdst.length === 0, `K/DST utan A-Ranking (${kdst.length} inni)`);

  /* Threp: hvorki eitt threp med ollum ne threp per mann. */
  const tiers = new Set(R.map((r) => r.tier).filter((v) => v != null));
  ok(tiers.size >= 3 && tiers.size <= 25, `${tiers.size} threp — hvorki eitt ne per mann`);

  /* Hver leikmadur med spa VERDUR ad hafa VBD, og ofugt. */
  const projNoVbd = R.filter((r) => r.proj != null && r.vbd == null &&
                                    !["K", "DST"].includes(r.pos));
  ok(projNoVbd.length === 0, `enginn med spa en an VBD (${projNoVbd.length})`);
}

/* ============================================================
   5. JADARTILVIK — TOMT OG VITLAUST INNTAK
   ============================================================ */
console.log("\n5. jadartilvik");
{
  const { buildRows } = await import("../src/build.js");
  const L = { teams: 12, scoring: "ppr", starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } };

  ok(buildRows({ players: [], league: L }).rows.length === 0, "tomur leikmannalisti fellir ekki");
  ok(buildRows({ players: null, league: L }).rows.length === 0, "null leikmannalisti fellir ekki");

  const junk = [{ id: "x", name: "X", pos: "RB" }];   // engin spa, ekkert annad
  const r = buildRows({ players: junk, league: L });
  ok(r.rows.length === 1 && r.rows[0].vbd == null,
    "leikmadur an nokkurra gagna faer null VBD, ekki 0");

  const { optimalLineup } = await import("../src/lineup.js");
  ok(optimalLineup([]).starters.every((s) => s.player === null),
    "tomur hopur gefur tom saeti, ekki hrun");
  const allOut = optimalLineup([
    { id: "a", pos: "RB", proj: 20, avail: 0 },
    { id: "b", pos: "RB", proj: 15, bye: true },
  ]);
  ok(allOut.projected === 0, "hopur thar sem enginn getur spilad gefur 0 stig");
  ok(allOut.unfilled.length > 0, "og saetin eru MERKT ofyllt");

  const { recommend } = await import("../src/advice.js");
  const rec = recommend({ available: [], roster: [], pick: 1, league: L });
  ok(rec.picks.length === 0, "radgjof a tomum lista fellur ekki");

  const { survivalProb } = await import("../src/advice.js");
  ok(survivalProb(0, 0, 1) != null, "ADP 0 fellir ekki lifunarlikur");
  ok(!Number.isNaN(survivalProb(1, 0, 1)), "sd 0 gefur ekki NaN");
}

/* ============================================================
   6. GAGNASKRARNAR — HEILLEIKI
   ============================================================ */
console.log("\n6. gagnaskrarnar");
{
  const files = readdirSync(DATA).filter((f) => f.endsWith(".json"));
  ok(files.length >= 15, `${files.length} gagnaskrar`);
  let broken = 0, empty = 0;
  for (const f of files) {
    try {
      const j = JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
      const n = Array.isArray(j) ? j.length : Object.keys(j).length;
      if (n === 0) { console.log(`     TOM: ${f}`); empty++; }
    } catch (e) { console.log(`     BILUD: ${f} — ${e.message.slice(0, 60)}`); broken++; }
  }
  ok(broken === 0, `allar skrar lesast (${broken} biladar)`);
  ok(empty === 0, `engin tom skra (${empty})`);

  /* Skra sem APPID les verdur ad vera til. Fyrsta utgafa `data.js`
     las `weekly/2025.json` sem er 2 MB og aldrei notud i vidmoti —
     thetta ver ad listinn og raunveruleikinn haldist saman. */
  const src = readFileSync(path.join(ROOT, "src", "data.js"), "utf8");
  const wanted = [...src.matchAll(/load\("([^"]+\.json)"\)/g)].map((m) => m[1]);
  const missing = wanted.filter((w) => !existsSync(path.join(DATA, w)));
  ok(missing.length === 0, `allar skrar sem appid bidur um eru til (${missing.join(", ") || "allar"})`);
}

/* ============================================================
   7. NETKOLL
   ============================================================ */
/* ============================================================
   7. HOOKAR SEM ERU NOTADIR EN EKKI FLUTTIR INN
   ============================================================
   `ModelLab.jsx` notadi `useMemo` an thess ad flytja hann inn. Sa
   undirflipi HRUNDI — og render-profid sa thad ekki thvi thad smellti
   aldrei a hann. Kyrrstaeda skonnunin ser thad an thess ad thurfa ad
   opna hvern einasta undirflipa, og hun er odyr. */
console.log("\n7. hookar fluttir inn");
{
  const HOOKS = ["useState", "useEffect", "useMemo", "useRef",
                 "useCallback", "useReducer", "useLayoutEffect"];
  const bad = [];
  for (const f of readdirSync(path.join(ROOT, "src")).filter((x) => x.endsWith(".jsx"))) {
    const src = readFileSync(path.join(ROOT, "src", f), "utf8");
    const imp = (src.match(/^import\s+React\s*,?\s*\{([^}]*)\}/m) || [, ""])[1]
      .split(",").map((s) => s.trim());
    for (const h of HOOKS) {
      if (new RegExp(`\\b${h}\\(`).test(src) && !imp.includes(h)) bad.push(`${f}:${h}`);
    }
  }
  ok(bad.length === 0, `hver hookur fluttur inn thar sem hann er notadur (${bad.join(", ") || "allir"})`);
}

/* ============================================================
   8. SPA SLEEPER BORIN VID OKKAR EIGIN STIGAREGLU
   ============================================================
   OHAD AKKERI. Sleeper sendir baedi birta spa (`projSleeper*`) OG
   magnsundurlidun (`projSleeperVol`). Se `scoring.js` rett verda thaer
   ad hittast — og ef half/standard-afleidslan okkar er rong skilur hun
   sig fra theirra tolu. Thetta er sama aett af profi og "Arsenal maelist
   med 27 mork a sig i skotakortunum": tvaer oskyldar leidir ad somu tolu.

   MAELT: midgildi |fravik| = 0,00 og p90 = 2,0 i ollum thremur
   stigagjofum, 558 leikmenn, ENGINN yfir 15 stigum. Afgangurinn eru
   fumbles og 2pt sem sundurlidunin ber ekki. */
console.log("\n8. spa vs eigin stigaregla");
{
  const { offensePoints, rules } = await import("../src/scoring.js");
  const P = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
  for (const [sc, key] of [["ppr", "projSleeper"], ["half", "projSleeperHalf"],
                           ["standard", "projSleeperStd"]]) {
    const R = rules(sc), dev = [];
    for (const p of P) {
      const v = p.projSleeperVol, s = p[key];
      if (!v || s == null || ["K", "DST"].includes(p.pos)) continue;
      const mine = offensePoints({
        passing_yards: v.pyd, passing_tds: v.ptd, passing_interceptions: v.pint,
        rushing_yards: v.ryd, rushing_tds: v.rtd, receptions: v.rec,
        receiving_yards: v.recyd, receiving_tds: v.rectd }, R, p.pos);
      dev.push(Math.abs(s - mine));
    }
    dev.sort((a, b) => a - b);
    const med = dev[dev.length >> 1], over = dev.filter((d) => d > 15).length;
    ok(dev.length > 400 && med <= 0.5 && over === 0,
      `${sc}: n=${dev.length}, midgildi ${med.toFixed(2)} (<=0,5), ${over} yfir 15 stigum`);
  }
}

/* ============================================================
   9. NETKOLL
   ============================================================ */
console.log("\n9. netkoll");
/* ============================================================
   HVERGI SLEEPER-KOLL NEMA THAR SEM ER BEDID UM THAU
   ============================================================
   Vordurinn var adur "engin Sleeper-koll" i heild. Fra 12.8.2026 er
   FORSIDAN til og THAR eru Sleeper-gogn allt innihaldid: stada, hopurinn
   minn, frjalsir leikmenn. Ad opna hana ER beidnin, svo tvo koll
   (`/rosters`, `/users`) per deild eru RETT hegdun — og thessi kafli
   smellir a hvern flipa, svo hann heimsaekir hana.

   FULLYRDINGIN VAR THVI HERT, EKKI LINUD. Adur: "ekkert kall". Nu:
   "ekkert kall NEMA thessir tveir endapunktar" — svo kall fra Players,
   Experts, Market, Schedule eda Sources fellir hann afram, og lika hvert
   annad Sleeper-kall en thau tvo. Ad slokkva a honum hefdi verid ad
   henda vordinum til ad halda profinu graenu.

   ÞETTA GREIP RAUNVERULEGA VILLU: fyrsta utgafa af endurlestri reglna
   keyrdi vid flipa-svissun og gaf **20** koll her. Flipa-flakk er ekki
   beidni um net-kall; endurlesturinn er nu hnappur.                   */
{
  /* FORSIDAN VERDUR AD VERA OPNUD MED RAUNVERULEGRI DEILD, annars er
     fullyrdingin hér nedan "0 af 0" — sonn af thvi ad ekkert var kallad,
     sem er tom fullyrding (CLAUDE.md 5b). Kafli 1 opnar hana AN deildar
     (tha ber hun "No league connected" og kallar rettilega ekkert) og
     kafli 3 opnar adeins Draft, svo hvorugur snerti thennan kodann. */
  await bootWithLeague({
    teams: 12, scoring: "ppr", rounds: 15, superflex: false,
    starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 },
    maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
  });
  sleeperUrls.length = 0;
  await clickTab("Dashboard");
  await settle(900);
  ok(sleeperUrls.length > 0,
    `forsidan var raunverulega heimsott og saekir (${sleeperUrls.length} koll)`);

  const allowed = /\/league\/[^/]+\/(rosters|users)$/;
  const stray = sleeperUrls.filter((u) => !allowed.test(u));
  for (const u of stray.slice(0, 5)) console.log(`     ${u}`);
  ok(stray.length === 0,
    `engin Sleeper-koll utan forsidunnar (${stray.length} af ${sleeperUrls.length})`);
}

/* ============================================================
   NIDURSTADA — OG HUN VERDUR AD KOMAST UT UR FERLINU
   ============================================================
   ÞETTA VANTADI, OG ÞAD GERDI ALLT SAFNID SKRAUT (19.8.2026).
   `fail` var talid i hverri einustu fullyrdingu hér fyrir ofan og svo
   ALDREI notad: skrain endadi a kafla 9 an samantektar og an
   `process.exit`. Node skilar tha 0, `run.mjs` telur safnid graent, og
   keyrslan endadi a "HEILD: oll 25 profasofnin graen" MEDAN kafli 1
   prentadi `FAIL ekkert rusl i neinum flipa (Sources: ordid null)`.

   Safnid var thvi ekki bara ohaeft ad fella — thad var virk RANGFAERSLA
   um thekjuna: talan 25 sagdi ad 25 sofn hefdu stadist prof, en eitt
   theirra gat ekki fallid, hvad sem thad fann. Sama flokkur og
   `react-warnings.mjs` i FPL-appinu sem heimsotti 0 af 22 vidmotum og
   var graent (CLAUDE.md 5b), nema verri: thar var thekjan tom, hér var
   hun raunveruleg og NIDURSTADAN var thogguð.

   Fyrsta fullyrdingin sem thetta fellir er su sem var alltaf ad segja
   satt: `null` i Sources-flipanum.

   `warn` fellir EKKI — `soft()` er fyrir thad sem er vert ad sja en er
   ekki fullyrding. Talan er samt prentud, annars er hun ekki til. Vordur
   gegn thvi ad thetta gleymist aftur: `wiring.mjs` kafli 8, sem les
   HVERT safn i tests/ og krefst thess ad thad beri exit-kodann OG se i
   `SUITES`.                                                            */
console.log(`\n${"=".repeat(56)}`);
console.log(fail ? `${fail} PROF FELLU (${warn} vidvaranir)`
                 : `oll prof graen (${warn} vidvaranir)`);
process.exit(fail ? 1 : 0);

