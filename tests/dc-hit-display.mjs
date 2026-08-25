/* ============================================================
   DC-HITTNI Á LEIKMANNASPJALDINU — tengingavörður

   AF HVERJU SÉR PRÓF: DStat-reiturinn „DC-hittni" les
   defcon.json.players, sem er TÓMT fram að 21.8. Reiturinn er því
   ósýnilegur í öllum öðrum prófum og gæti dáið þögult — nákvæmlega
   gildran sem kostaði viku þegar markaðsliðurinn var dauður í
   odds.json og öll próf græn (CLAUDE.md kafli 3). Hér er defcon.json
   HERMT MEÐ GÖGNUM og fjögur atriði negld:

     1. Reiturinn birtist með AFTURVIRKJUÐU tölunni (57%), ekki hráu.
        Stökkbreytingin „birta hit_rate í stað hit_rate_adj" fellur.
     2. n (byrjaðir) er sýnilegt við hlið tölunnar — krafa handoffs №4.
     3. Hráa talan er sýnd sem undirtexti (gagnsæi), merkt „hrá".
     4. GK fær ALDREI reitinn — DefCon-stig eru fyrir útivallarmenn og
        GK-tala væri ómæld tala sem liti út eins og mæling (sama regla
        og mó/aó í skiptaglugganum, CLAUDE.md 6j).

   Keyrsla:  node tests/dc-hit-display.mjs
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* Sjálfgefna byrjunarliðið hefur Mosquera (11, DEF) og Kinsky (496, GK). */
const DEF_ID = 11, GK_ID = 496;

/* SÉRTÆKI defcon-mockurinn Á UNDAN almenna handlernum — smoke-gildran. */
globalThis.fetch = async u => {
  const n = String(u).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  if (n === "defcon.json") {
    const real = J(n);
    return { ok: true, status: 200, json: async () => ({ ...real, players: [
      { fpl_id: DEF_ID, position: 2, starts: 12, threshold_hits: 9,
        hit_rate: 0.75, hit_rate_adj: 0.573, p0: 0.361, cbit_per_90: 9.1, cbirt_per_90: 13.2 },
      { fpl_id: GK_ID, position: 1, starts: 10, threshold_hits: 9,
        hit_rate: 0.9, hit_rate_adj: 0.8, p0: 0.02, cbit_per_90: 2.0, cbirt_per_90: 8.0 },
    ] }) };
  }
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

localStorage.setItem("fpl_planner_v3", JSON.stringify({}));

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 300)); });

const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 120)); }); };
const fire = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
};

/* i-hnappur spjalds fundinn í gegnum nafnið: gengið upp frá hnappnum
   þar til textinn ber nafnið, en hætt áður en allt tréð gleypist.      */
const infoBtnFor = name => {
  for (const b of [...document.querySelectorAll("button")].filter(x => x.textContent.trim() === "i")) {
    let el = b;
    for (let i = 0; i < 4 && el; i++, el = el.parentElement) {
      const t = el.textContent || "";
      /* SPJALDS-stærð (~120 stafir), ekki raðar-stærð: 200-þakið er það
         sem hindrar að Kinsky-hnappurinn passi við „Mosquera" í röð. */
      if (t.length > 200) break;
      if (t.includes(name)) return b;
    }
  }
  return null;
};

console.log("\nDC-HITTNI Á SPJALDINU (hermt defcon.json með leikmönnum)");

const mosBtn = infoBtnFor("Mosquera");
ok("i-hnappur Mosquera finnst", !!mosBtn);
await fire(mosBtn);

let txt = document.body.textContent;
ok("spjaldið opnaðist (Spá næstu sést)", txt.includes("Next GW forecast"));
ok("„DC-hittni“ birtist á DEF-spjaldi", txt.includes("DC hit rate"));
ok("AFTURVIRKJAÐA talan er birt (57%)", txt.includes("57%"),
  "— birting á hráu tölunni í staðinn er nákvæmlega villan sem prófið ver gegn");
ok("n er sýnilegt við hlið tölunnar (12 byrjaðir)", /12 starts/.test(txt));
ok("hráa talan sýnd sem undirtexti, merkt hrá (75%)", /raw 75%/.test(txt));
ok("hráa talan er EKKI aðaltalan", !/DChitrate75%/.test(txt.replace(/\s+/g, "")));

/* GK: spjaldið hefur gögn í mockinu en má samt ekki birta reitinn. */
const gkBtn = infoBtnFor("Kinsky");
ok("i-hnappur Kinsky finnst", !!gkBtn);
await fire(gkBtn);
txt = document.body.textContent;
/* FULLT nafn sést adeins i modal-hausnum; "Kinsky" (web_name) er lika a
   vellinum og segði ekkert um hvort spjaldid skipti um mann.            */
ok("Kinsky-spjaldið opnaðist (fullt nafn í haus)", txt.includes("Antonín"));
ok("GK fær ALDREI DC-hittni þótt gögnin séu til", !txt.includes("DC hit rate"),
  "— GK-talan væri ómæld tala sem liti út eins og mæling");

/* ============================================================
   "DC-LEIKMADUR"-MERKIMIDINN — ThRJU ASTOND, EKKI TVO (25.8.2026)

   Notandinn bad um ad DC-leikmenn yrdu merktir serstaklega ("+50%
   leikja ad fa DC stig"). Rokstudningurinn og vikmorkin eru i
   `scripts/measure-dc-flag.mjs` og i athugasemdinni vid
   `dcPlayerFlag` i `src/stats.js`; hér eru ASTONDIN negld.

   ThAD SEM ThESSI KAFLI VER, OG ThAD ER EKKI SMEKKUR:
     · undir golfinu er svarid `waiting`, ALDREI `no` — 1 byrjun gefur
       0% eda 100% og hvorug talan segir neitt,
     · `rate == null` er `none`, ALDREI `no` — `Number(null)` er 0 og
       0 er finite, svo bert `Number.isFinite` hefdi fullyrt "hann er
       ekki DC-leikmadur" ur engum gognum (N8-gildran),
     · `rate === 0` ER hins vegar maeling og verdur `no`.
   ============================================================ */
{
  const { dcPlayerFlag, DC_FLAG_MIN_STARTS, DC_FLAG_CUT } = await import("../src/stats.js");
  const st = (o) => dcPlayerFlag(o).state;

  ok("golfid er 5 byrjanir", DC_FLAG_MIN_STARTS === 5);
  ok("throskuldurinn er 0,50 (skilgreining notandans)", DC_FLAG_CUT === 0.50);

  ok("1 byrjun med 100% -> `waiting`, EKKI `yes`", st({ starts: 1, rate: 1 }) === "waiting",
    "— annars vaeri 1/1 nog til ad kalla mann DC-leikmann");
  ok("4 byrjanir -> `waiting` (golfid heldur)", st({ starts: 4, rate: 1 }) === "waiting");
  ok("5 byrjanir yfir throskuldi -> `yes`", st({ starts: 5, rate: 0.6 }) === "yes");
  ok("5 byrjanir undir throskuldi -> `no`", st({ starts: 5, rate: 0.4 }) === "no");
  ok("nakvaemlega 0,50 er EKKI yfir (>0,50, ekki >=)", st({ starts: 9, rate: 0.5 }) === "no");

  ok("`rate: null` -> `none`, EKKI `no` (Number(null) er 0!)",
    st({ starts: 9, rate: null }) === "none",
    "— fullyrding ur engum gognum vaeri verri en tomur reitur");
  ok("`rate` vantar alveg -> `none`", st({ starts: 9 }) === "none");
  ok("`rate: 0` ER maeling og verdur `no`", st({ starts: 9, rate: 0 }) === "no",
    "— NULL ER EKKI NULL, og thad gildir i BADAR attir");
  ok("0 byrjanir -> `none`", st({ starts: 0 }) === "none");
  ok("rusl-inntak fellir ekki fallid", st({}) === "none" && st() === "none");

  /* DALKURINN SJALFUR: `waiting` verdur ad vera TOMUR reitur, ekki 0.
     0 i `hi:true` dalki myndi rada theim sem vid vitum EKKERT um
     nedst — sama og "0.00 hja theim sem aldrei spiladi" (CLAUDE.md 12). */
  const { STAT_BY_KEY } = await import("../src/stats.js");
  const d = STAT_BY_KEY.dc_player;
  ok("dalkurinn `dc_player` er til", !!d);
  ok("og hann er tomur (null) medan urtakid er of litid",
    d.get({ _dc_starts: 1, _dc_hit_raw: 1 }) === null,
    "— 0 thar vaeri ómæld tala sem lítur út eins og mæling");
  ok("og ber 1 thegar merkid a vid", d.get({ _dc_starts: 8, _dc_hit_raw: 0.7 }) === 1);
  ok("og 0 thegar hann er MAELDUR og nær ekki", d.get({ _dc_starts: 8, _dc_hit_raw: 0.2 }) === 0);
  ok("og null thegar hittnin vantar", d.get({ _dc_starts: 8 }) === null);
}

console.log(`\nDC-HITTNI BIRTING: ${pass} stóðust, ${fail} féllu`);
if (fail) process.exit(1);
