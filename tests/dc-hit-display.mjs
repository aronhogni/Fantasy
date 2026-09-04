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
/* AKKERID VAR „Next GW forecast" OG ThAD HEITI FOR 4.9.2026: reiturinn
   ber FPL-s eigin `ep_next` og heitir thad nu, thvi appid reiknar sina
   eigin spa (`pointsBase`) og tvaer spar undir einu heiti eru tvaer
   spar undir einu heiti. Akkerid faerdist thvi med heitinu.          */
ok("spjaldið opnaðist (FPL-reiturinn sést)", txt.includes("FPL's own ep_next"));
ok("„DC-hittni“ birtist á DEF-spjaldi", txt.includes("DC hit rate"));
ok("AFTURVIRKJAÐA talan er birt (57%)", txt.includes("57%"),
  "— birting á hráu tölunni í staðinn er nákvæmlega villan sem prófið ver gegn");
ok("n er sýnilegt við hlið tölunnar (12 byrjaðir)", /12 starts/.test(txt));
ok("hráa talan sýnd sem undirtexti, merkt hrá (75%)", /raw 75%/.test(txt));
ok("hráa talan er EKKI aðaltalan", !/DChitrate75%/.test(txt.replace(/\s+/g, "")));

/* ============================================================
   LIKUR A DC-STIGUM I VALINNI UMFERD (4.9.2026, beidni notandans)

   „Eg vill baeta vid a player cardid hversu liklegt er ad leikmadur fai
   DC stig a moti naesta andstaedingi i vikunni sem eg er med valda."

   TVO HEITI, TVAER SPURNINGAR: „DC hit rate" er per BYRJUN yfir hofud;
   „DC points GWn" er I ThEIRRI UMFERD. Baðar verda ad sjast med sinum
   merkimida — tvaer prosentur hlid vid hlid an theirra vaeru tvaer tolur
   undir einu heiti.
   ============================================================ */
{
  /* LESID UR HOLFINU SJALFU, EKKI UR `textContent` HEILDARINNAR.
     Fyrsta utgafan thattadi „DC points GW333%" med regexi og fekk
     „GW33 · 3%" — tolurnar limast saman an bils, nakvaemlega sama
     gildra og `MUNaNEW` -> `NaN` (CLAUDE.md 5b). Reitirnir thrir eru
     adskildir hnutar; thad er thvi haegt ad lesa thá rett.            */
  const tile = [...document.querySelectorAll("div")]
    .filter(el => (el.children[0]?.textContent || "").startsWith("DC points GW"))
    .sort((a, b) => a.textContent.length - b.textContent.length)[0];
  ok("`DC points GWn` birtist a DEF-spjaldi", !!tile,
    "— " + (txt.match(/DC points[^A-Z]{0,60}/) || ["fannst ekki"])[0]);
  if (tile) {
    const [kEl, vEl, sEl] = tile.children;
    const g = +(kEl.textContent.match(/GW(\d+)/) || [])[1];
    const shown = +(vEl.textContent.match(/(\d+)%/) || [])[1];
    const sub = sEl?.textContent || "";
    const rate = +(sub.match(/(\d+)% per start/) || [])[1];
    const nStarts = +(sub.match(/per start \((\d+)\)/) || [])[1];
    const sp = +(sub.match(/(\d+)% to start/) || [])[1];
    ok(`umferdin i heitinu er su sem er VALIN (GW${g})`, g >= 1 && g <= 38);
    ok("hlutfallid er hittni x byrjunar-likur, ekki hittnin ein",
      Math.abs(shown - Math.round(rate * sp / 100)) <= 1,
      `— ${shown}% a moti ${rate}% x ${sp}%`);
    ok("og thad er LAEGRA en hittnin ein (byrjun er skilyrdi)", shown < rate);
    ok("hittnin i undirtextanum er AFTURVIRKJADA talan (57%), ekki hra (75%)",
      rate === 57, `— fekk ${rate}%`);
    /* `defcon.json` segir sjalf: „USE THAT ONE for display, always with
       starts beside it". Eftir tvaer umferdir er `hit_rate_adj` skrumpud
       nanast alveg ad stodu-medaltalinu, svo an `n` laesi hun eins og
       maeling a MANNINUM i stad forgildis a STODUNNI.                  */
    ok("og `n` fylgir henni i SAMA reit (12 byrjanir)", nStarts === 12,
      `— fekk ${nStarts}, undirtexti: "${sub}"`);
    /* EINN LEIKUR I UMFERDINNI -> ENGIN „N matches"-vidbot. Fyrsta
       utgafan notadi `nextGwFixtures`, sem skilar ThREMUR UMFERDUM, og
       spjaldid sagdi tha „70% · 3 matches" — truverdug tala vid rangan
       merkimida. Sast a skjanum, ekki i kodanum.                      */
    ok("engin tvofold-umferdar vidbot thegar leikurinn er einn",
      !/matches/.test(sub), `— "${sub}"`);
    ok("og motherjinn er nefndur i tooltipinu, ekki thagad um hann",
      /OPPONENT is deliberately not in it/.test(tile.getAttribute("title") || ""),
      "— thogn um lid sem vantar les eins og gleymska");
  }
}

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
ok("og ENGA umferdar-likindi heldur", !txt.includes("DC points GW"),
  "— maelt 25.8.2026: 750 GK-byrjanir, NULL DC-stig, hamark 0");

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

/* ============================================================
   `dcChance` A TOLUM ThAR SEM SVARID ER ThEKKT FYRIRFRAM
   ============================================================ */
{
  const { dcChance } = await import("../src/model.js");
  const D = { position: 3, hit_rate_adj: 0.5, starts: 12 };
  const one = dcChance({ dcRow: D, startProb: 0.8, fixtures: [1] });
  ok("einn leikur: 0,5 x 0,8 = 0,40", Math.abs(one.p - 0.4) < 1e-12);
  const two = dcChance({ dcRow: D, startProb: 0.8, fixtures: [1, 2] });
  ok("tvofold umferd: 1-(1-0,4)^2 = 0,64", Math.abs(two.p - 0.64) < 1e-12,
    "— spurningin er: faer hann DC-stig i VIKUNNI, ekki i leiknum");
  ok("og hun er HAERRI en einn leikur, ekki tvofold", two.p > one.p && two.p < 2 * one.p);

  /* `startProb === null` MA ALDREI VERDA 1. Ad margfalda med einum vaeri
     ad fullyrda ad hann byrji ORUGGLEGA af thvi ad okkur VANTAR gogn.  */
  const noSp = dcChance({ dcRow: D, startProb: null, fixtures: [1] });
  ok("byrjunar-likur vantar -> `p` er null, EKKI hittnin sjalf", noSp.p === null);
  ok("og per-byrjun talan stendur undir SINU eigin heiti", noSp.perStart === 0.5);

  ok("markmadur -> ENGIN tala", dcChance({ dcRow: { ...D, position: 1 },
    startProb: 0.9, fixtures: [1] }) === null);
  ok("aud umferd -> ENGIN tala", dcChance({ dcRow: D, startProb: 0.9, fixtures: [] }) === null);
  ok("0 byrjanir -> ENGIN tala", dcChance({ dcRow: { ...D, starts: 0 },
    startProb: 0.9, fixtures: [1] }) === null);
  ok("hittni vantar -> ENGIN tala (Number(null) er 0!)",
    dcChance({ dcRow: { ...D, hit_rate_adj: null }, startProb: 0.9, fixtures: [1] }) === null);
  ok("engin rod -> ENGIN tala", dcChance({ dcRow: null, startProb: 0.9, fixtures: [1] }) === null);

  /* MOTHERJINN ER EKKI I FORMULUNNI OG ThAD ER MAELT VAL (CLAUDE.md 4):
     DC-STIG hreyfast +0,007/threp CI [-0,032, +0,048]. Vordurinn er a
     SIGNATURNNI — vaeri leikjathyngd tekin inn kaemi hun her.          */
  const src = readFileSync(new URL("../src/model.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export function dcChance"));
  ok("`dcChance` tekur ENGA leikjathyngd inn",
    !/ffdr|fixDifficulty|tierOf|difficulty/i.test(body.slice(0, body.indexOf("\n}"))),
    "— +0,007 stig/threp CI [-0,032, +0,048]: ad thyngja hana vaeri omaeld tala");
}

console.log(`\nDC-HITTNI BIRTING: ${pass} stóðust, ${fail} féllu`);
if (fail) process.exit(1);
