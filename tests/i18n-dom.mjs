/* ============================================================
   TUNGUMAL — LESID AF SKJANUM, EKKI UR KODANUM

   AF HVERJU THETTA SAFN ER TIL (og af hverju kafli 5 i i18n.mjs naegir EKKI):
   31.7. voru 14 islenskir strengir eftir i ENSKA vidmotinu a fjorum flipum
   medan tests/i18n.mjs var GRAENT. Their fundust af MANNI sem skipti i EN i
   Chrome og las skjainn. Tvennt er AST-profi ohaegt ad sja i eðli sínu:

     1. ISLENSKA AN BRODDSTAFA. `þðæö`-skynjun ser ekki "Yfirlit",
        "laugardagur", "Utan teigs", "Grunnur", "lau". Their sluppu ALLIR og
        fundust a skjanum. Kodinn getur ekki greint "Yfirlit" fra ensku ordi.
     2. TEXTI SEM ER SETTUR INN I THYDDAN STRENG. Sniðmatið er thytt en
        buturinn ekki: "travel 359 km (langferð)".

   ThESSI PROF LESA DOM-INN A BADUM MALUM OG BERA THA SAMAN. Thad snyr
   vandanum vid: i stad ad spyrja "er thetta islenskt?" (sem krefst
   ordabokar) er spurt "BREYTTIST thad?" — strengur sem er ORDRETT EINS a
   islensku og ensku er annadhvort viljandi eins (xG, BPS, Haaland, £4.5)
   eda othyddur. Sa listi er stuttur og upptalinn her.

   ThRIR VORDUR:
     A. Enginn islenskur STAFUR i enska DOM-inum nema hann komi UR GOGNUNUM
        (leikmannanofn, status.json-notur) — sannreynt gegn data/-skranum
        sjalfum, svo listinn getur ekki stadnad.
     B. Engin OFYLLT stika ({0}) og hvorki "undefined" ne "NaN".
     C. Enginn lykill vantar i keyrslu (missingKeys) — thetta naer DYNAMISKU
        lyklunum (tx(TIER_NAME[t]), tx(l)) sem statiska profid ser ekki.
     D. Mismunur IS/EN: hver textabutur sem er EINS a badum malum er annad
        hvort a IDENTICAL-listanum eda leki.
   ============================================================ */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const DATA = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "\n     " + extra : ""}`); }
};

/* ---------- jsdom ---------- */
const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  url: "https://aronhogni.github.io/Fantasy/", pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
/* react-dom fellur a IE9-polyfill i jsdom og kallar attachEvent/detachEvent
   sem eru ekki til -> TypeError-suð i utprentun. No-op thaggar thad.     */
for (const m of ["attachEvent", "detachEvent"])
  if (!(m in dom.window.HTMLElement.prototype))
    dom.window.HTMLElement.prototype[m] = function () {};
if (!("oninput" in dom.window.HTMLElement.prototype)) {
  for (const ev of ["oninput", "onchange"])
    Object.defineProperty(dom.window.HTMLElement.prototype, ev, {
      get() { return null; }, set() {}, configurable: true });
}
globalThis.fetch = async (url) => {
  url = String(url);
  const raw = String(url).match(/data\/(.+)$/);
  if (raw) {
    const f = `${DATA}${raw[1]}`;
    if (!existsSync(f)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(f, "utf8")) };
  }
  return { ok: false, status: 404, json: async () => ({}) };
};

const { t: tx, setLang, getLang, missingKeys } = await import("../src/i18n.js");
const App = (await import("../src/App.jsx")).default;

const container = dom.window.document.getElementById("root");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let root = null;
const settle = async () => { await act(async () => { await sleep(60); }); };
const click = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
};

/* Texti + ollum notanda-synilegum eigindum safnad. `title` er EKKI
   valfrjalst: helmingur skyringanna i thessu appi lifir i tooltip-um.  */
function harvest() {
  /* EINN TEXTAHNUTUR = EIN LINA. `container.textContent` limir texta
     nagranna-hnuta saman AN skila ("FéeSemenyoB.FernandesGarner...") og
     tha verdur ord-greiningin rusl. Thetta var villa i FYRSTU utgafu
     thessa profs og faldi bædi leka og rangar samsvaranir.            */
  const out = [];
  const walk = dom.window.document.createTreeWalker(container, dom.window.NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const s = (n.nodeValue || "").trim();
    if (s) out.push(s);
  }
  for (const el of container.querySelectorAll("[title],[aria-label],[placeholder]")) {
    for (const a of ["title", "aria-label", "placeholder"]) {
      const v = el.getAttribute(a);
      if (v) out.push(v);
    }
  }
  return out.join("\n");
}

/* Gengid um ALLA flipa + staerstu spjoldin. Flipar eru valdir a emoji svo
   valid se OHAD tungumali (annars vaeri profid sjalft tungumals-bundid).  */
async function walkEverything() {
  const chunks = [];
  const tabBtns = () => [...container.querySelectorAll("button")]
    .filter(b => /^(\u26bd|\ud83d\udc65|\ud83d\udcca|\ud83c\udfc6)/.test((b.textContent || "").trim()));
  const headBtns = () => [...container.querySelectorAll("button")]
    .filter(b => /^(\ud83d\udcca FFDR|\ud83c\udfab)/.test((b.textContent || "").trim()));

  /* haus-spjold: FFDR-tafla og Chips */
  for (const b of headBtns()) { await click(b); chunks.push(harvest()); }

  /* leikmannaspjald — staersta texta-flotid */
  const info = [...container.querySelectorAll("button")].filter(b => b.title === tx("Upplýsingar"));
  if (info[0]) { await click(info[0]); chunks.push(harvest()); }
  const closeX = [...container.querySelectorAll("button")].filter(b => (b.textContent || "").trim() === "✕");
  if (closeX.length) await click(closeX.at(-1));

  /* roterings-spjaldid (FFDR-samanburdur) */
  /* "FFDR" er othytt, svo thetta virkar a badum malum. ATH: EKKI nota
     tilbuinn lykil (tx("FFDR-samanburður")) — hann er ekki i ordabokinni
     og profid skradi hann tha sjalft sem VANTANDI lykil i kafla C.    */
  const rot = [...container.querySelectorAll("button")]
    .filter(b => (b.title || "").startsWith("FFDR-samanb") || (b.title || "").startsWith("FFDR compar"));
  if (rot[0]) {
    await click(rot[0]); chunks.push(harvest());
    const x = [...container.querySelectorAll("button")].filter(b => (b.textContent || "").trim() === "✕");
    if (x.length) await click(x.at(-1));
  }

  /* fliparnir sjalfir */
  const tabs = tabBtns();
  for (let i = 0; i < tabs.length; i++) {
    const fresh = tabBtns()[i];
    if (!fresh) continue;
    await click(fresh);
    chunks.push(harvest());
    /* undirflipar (Umferdin: Yfirlit/Skot-kort/Leikmenn/Leikirnir,
       Stigatafla: Yfirlit/Bekkjar-haetta/Ohjakvaemilegt/Tafla)          */
    /* MA ALDREI smella a IS/EN (thad skipti um mal i midri sofnun og
       eyddi profinu) ne a endurstillingar/hreinsun.                    */
    const SAFE = t => t && t.length < 24 && !/^\d+$/.test(t) &&
      !/^(IS|EN)$/.test(t) && !/endurstilla|reset|hreinsa|clear|já|yes|allt|✕/i.test(t);
    const subs = [...container.querySelectorAll("button")].slice(0, 40)
      .filter(b => SAFE((b.textContent || "").trim()));
    for (const s of subs.slice(0, 14)) {
      if (!container.contains(s)) continue;
      await click(s);
      chunks.push(harvest());
    }
  }
  return chunks.join("\n");
}

async function renderIn(lang) {
  setLang(lang);
  if (root) await act(async () => { root.unmount(); });
  container.innerHTML = "";
  root = createRoot(container);
  await act(async () => { root.render(React.createElement(App)); });
  await settle(); await settle();
  return await walkEverything();
}

console.log("\n=== RENDER ===");
const isText = await renderIn("is");
ok("appid teiknast a islensku", isText.length > 5000, `${isText.length} stafir`);
missingKeys().length = 0;
const enText = await renderIn("en");
ok("appid teiknast a ensku", enText.length > 5000, `${enText.length} stafir`);

/* ---------- A. Islenskir stafir i enska DOM-inum ---------- */
console.log("\n=== A. ISLENSKA I ENSKA VIDMOTINU ===");
const IS_CHARS = /[þðæöÞÐÆÖ]|[áíéúýóÁÍÉÚÝÓ]/;

/* ---- LINU-NAKVAEM GREINING, EKKI ORDA-LISTI ----
   FYRSTA UTGAFA THESSA PROFS leyfdi ORD ef thad kom fyrir EINHVERS STADAR i
   pipeline-notu. Thad var of grofkornott: mutations-prof sannadi ad thegar
   islenskum bút er sprautad INN i thyddan streng ("lið £ ferðalög · alls")
   slapp hann i gegn — af thvi ad "ferðalög" er lika i status.json.

   Nu er hver LINA (einn textahnutur eda eitt eigindi) skodud fyrir sig:
     1. Fjarlaegdu ur henni HVERJA nótu sem pipeline skrifadi (nakvaem
        undirstrengs-samsvorun, longstu fyrst).
     2. Fjarlaegdu nofn leikmanna og lida.
     3. Se ISLENSKUR STAFUR eftir -> LEKI, og leifin er birt.
   Thetta leyfir "Match stats E0 (current) — bíður tímabils..." (notan er
   fjarlaegd) en fellir sprautada butinn (hann er hvorki nóta ne nafn).   */
const notes = [];
const eatNotes = (obj) => {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && /^(note|via|error|reason|label|season|name)$/.test(k)) {
      notes.push(v);
    } else if (v && typeof v === "object") eatNotes(v);
  }
};
for (const f of readdirSync(DATA).filter(n => n.endsWith(".json"))) {
  try { eatNotes(JSON.parse(readFileSync(DATA + f, "utf8"))); } catch { /* ignore */ }
}
notes.sort((a, b) => b.length - a.length);

/* NOFN — OG ADEINS NOFN. Ekki heilu skrarnar: fyrsta utgafa las HVERT
   islenskt tak ur ollum JSON-skram, sem gleypti nótu-prosuna lika ("löng
   ferðalög") og tha slapp sprautadur bútur med thvi ordi. Mutations-profid
   M4b sannadi thad. Nu eru adeins NAFNA-SVID lesin; notur eru fjarlaegdar
   sem UNDIRSTRENGIR (positional), sem er thad sem gerir greininguna nakvaema. */
const NAME_KEY = /(^|_)(name|player|team|short|first|second|web|opponent|referee|scorer|assist)(_|$)/i;
const dataTokens = new Set();
const eatNames = (obj) => {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && NAME_KEY.test(k)) {
      for (const tok of v.split(/[\s.·\-']+/)) {
        const w = tok.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
        if (w.length > 1) dataTokens.add(w.toLowerCase());
      }
    } else if (v && typeof v === "object") eatNames(v);
  }
};
for (const f of readdirSync(DATA).filter(n => n.endsWith(".json"))) {
  try { eatNames(JSON.parse(readFileSync(DATA + f, "utf8"))); } catch { /* ignore */ }
}

/* Tungumals-vixlarinn stendur VILJANDI a sinu eigin mali: "Íslenska"/
   "English" og aria-label "Language / Tungumál" — sa sem lendir i rongu
   tungumali verdur ad geta fundid leidina til baka.                    */
const SWITCHER = new Set(["Íslenska", "Tungumál"]);

const residualOf = (line) => {
  let r = line;
  for (const n of notes) if (r.includes(n)) r = r.split(n).join(" ");
  return r.split(/[\s·—–|/()\[\]{}<>"'’“”:;,!?%+=]+/)
    .filter(tok => {
      const w = tok.replace(/^[^\p{L}]+|[^\p{L}%]+$/gu, "");
      if (!w || !IS_CHARS.test(w)) return false;
      if (SWITCHER.has(w)) return false;
      return !dataTokens.has(w.toLowerCase());   // nofn og notu-ord
    }).join(" ");
};
const codeLeaks = [];
for (const line of enText.split("\n")) {
  const l = line.trim();
  if (!l || !IS_CHARS.test(l)) continue;
  const res = residualOf(l);
  if (res) codeLeaks.push(`${JSON.stringify(l.slice(0, 60))} -> ${res}`);
}
ok(`hver lina i enska DOM-inum er thydd (${notes.length} pipeline-notur leyfdar)`,
   codeLeaks.length === 0, [...new Set(codeLeaks)].slice(0, 8).join("\n     "));

/* ---------- B. Stikur, undefined, NaN ---------- */
console.log("\n=== B. OFYLLTAR STIKUR OG RUSL ===");
const slotLeft = enText.match(/\{\d+\}/g) || [];
ok("engin ofyllt stika ({0}) a skjanum", slotLeft.length === 0, slotLeft.slice(0, 8).join(" "));
for (const bad of ["undefined", "NaN", "[object Object]"]) {
  ok(`ekkert "${bad}" i enska DOM-inum`, !enText.includes(bad));
  ok(`ekkert "${bad}" i islenska DOM-inum`, !isText.includes(bad));
}

/* ---------- C. Vantandi lyklar i KEYRSLU ---------- */
console.log("\n=== C. VANTANDI LYKLAR I KEYRSLU (dynamiskir) ===");
const miss = missingKeys();
ok("enginn lykill vantadi medan appid var teiknad a ensku", miss.length === 0,
   miss.slice(0, 12).map(k => JSON.stringify(k)).join(" · "));

/* ---------- D. Mismunur IS/EN ---------- */
console.log("\n=== D. TEXTI SEM BREYTTIST EKKI ===");
/* Viljandi EINS a badum malum. Hver flokkur med astaedu — thetta er
   samningurinn sem CLAUDE.md kafli 8b lysir.                          */
const IDENTICAL = new Set([
  /* SLODA-HLUTAR. Daemid um FPL-slodina (.../entry/1234567/event/1) er
     ordrett eins a badum malum — slod er slod. 4.8.2026.               */
  "entry", "event", "premierleague", "fantasy", "com",
  /* stat-skammstafanir: ensk thegar, FPL-notendur thekkja thaer svona */
  "xG", "xA", "xGI", "xGC", "BPS", "BP", "ICT", "DC", "CS", "GC", "YC", "RC",
  "FDR", "FFDR", "EP", "ep", "GW", "PEN", "DefCon", "CBIT", "xG90", "xA90",
  "Form", "form", "Saves", "Elo", "ClubElo", "FPL", "ESPN", "Understat",
  "Opta", "Brier", "LOSO", "sd", "vs", "v", "of", "and", "not", "no",
  /* chip-heiti */
  "Wildcard", "Free", "Hit", "Bench", "Boost", "Triple", "Captain", "Chips",
  "WC", "FH", "BB", "TC",
  /* stodur og einingar */
  "GK", "DEF", "MID", "FWD", "MV", "M", "S", "D", "F", "G", "Y", "R", "A",
  "km", "min", "mins", "pts", "m", "h", "C", "V", "i", "k",
  /* eigin heiti i vidmotinu */
  "FantasyApp", "Fantasy", "IS", "EN", "Url", "URL", "json", "data",
  "Players", "Player", "Overview", "Table", "Goals", "Assists", "Minutes",
  "Starts", "Price", "Bonus", "Cards", "Shots", "Team", "Teams",
  /* FPL-svid, slodir og vorumerki eru VITNAD i vidmotinu og eru eins a
     badum malum — "Real data: transfers_in/out and cost_change_event".  */
  "API-Sports", "Understat", "FotMob", "SofaScore", "FBref", "GitHub",
  "Actions", "pipeline", "bootstrap", "fixtures", "events", "differentials",
  "Netlify", "Chrome", "PWA", "CSV", "E0", "L1", "L2", "CL",
  /* Ensk ord sem islenska vidmotid notar LIKA — thau eru eins af thvi ad
     their eru eins, ekki af thvi ad thydingu vanti:
       "out"       — vitnad FPL-svid: "transfers_in/out"
       "hit-rate"  — "DefCon hit-rate" stendur svo a islensku lika
       "chip"      — FPL-heiti, obeygt i islenska vidmotinu
       "best"      — "best í" / "best in"
       "entry"     — slodar-butur: /entry/{numer}/
       "fantasy"   — "fyrir fantasy" / "for fantasy"
       "Assist"    — is. heiti dalks; en. "Assist conversion"
       "Start"     — "DC / DC%Start", samsett skammstofun a badum malum    */
  "out", "hit-rate", "chip", "best", "entry", "fantasy", "Assist", "assist",
  "Start",
]);
/* Kodaheiti (`chance_of_playing`), slodir (`fantasy.premierleague.com`) og
   skraaheiti eru vitnud orðrétt i badum malum.                          */
const isIdentifier = w => /[_.]/.test(w) || /^[a-z]+[A-Z]/.test(w);
/* PIPELINE-NOTUR eru gogn, ekki vidmot: `record()` i fetch.mjs skrifar
   islenska prosu i status.json (og last_gw.json.note) og appid birtir hana
   HRATT a badum malum — thess vegna eru ord ur theim eins a badum malum an
   ad thyding vanti. Sja CLAUDE.md kafla 8b. Leitt ut ur `notes` sem kafli A
   byggdi, svo ein uppspretta se til fyrir badar profanir.                */
const noteWords = new Set();
for (const n of notes)
  for (const tok of n.split(/[\s·—–|/()\[\]{}<>"'’“”:;,!?%+=]+/)) {
    const w = tok.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (w.length > 1) noteWords.add(w.toLowerCase());
  }

/* Nofn og tolur eru ekki thyding — byggt UR GOGNUNUM. */
const nameTokens = new Set();
for (const f of ["players.json", "teams.json", "player_seasons.json",
                 "last_gw.json", "last_gw_shots.json", "imminent.json"]) {
  if (!existsSync(DATA + f)) continue;
  const blob = readFileSync(DATA + f, "utf8");
  for (const tok of blob.split(/[\s"'\\,{}\[\]:()]+/)) {
    const w = tok.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (w.length > 1) nameTokens.add(w.toLowerCase());
  }
}
const words = s => {
  const out = new Set();
  for (const tok of s.split(/[\s·—–|/()\[\]{}<>"'’“”:;,!?%+=≈↑↓★☆✕⇄↺▤≡⧫’]+/)) {
    const w = tok.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (w.length > 2 && /\p{L}/u.test(w) && !/^\d/.test(w)) out.add(w);
  }
  return out;
};
const isW = words(isText), enW = words(enText);
const unchanged = [...isW].filter(w =>
  enW.has(w) && !IDENTICAL.has(w) && !nameTokens.has(w.toLowerCase()) &&
  !dataTokens.has(w.toLowerCase()) && !noteWords.has(w.toLowerCase()) &&
  !isIdentifier(w) && !SWITCHER.has(w) && w !== "English" && w !== "Language");
ok(`ord sem eru eins a badum malum eru OLL vitud (${isW.size} is / ${enW.size} en)`,
   unchanged.length === 0, unchanged.slice(0, 30).join(" · ")
   + (unchanged.length > 30 ? `  (+${unchanged.length - 30})` : ""));

/* ---------- E. Vixlarinn sjalfur ---------- */
console.log("\n=== E. VIXLARINN ===");
ok("IS/EN-hnapparnir eru i hausnum", (() => {
  const b = [...container.querySelectorAll("button")].map(x => (x.textContent || "").trim());
  return b.includes("IS") && b.includes("EN");
})());
const enBtn = [...container.querySelectorAll("button")].find(b => (b.textContent || "").trim() === "EN");
ok("enski hnappurinn er MERKTUR valinn (aria-pressed)", enBtn?.getAttribute("aria-pressed") === "true");
const isBtn = [...container.querySelectorAll("button")].find(b => (b.textContent || "").trim() === "IS");
await click(isBtn);
ok("smellur a IS skiptir raunverulega", getLang() === "is");
/* Flipa-rodin er ALLTAF a skjanum; "Bekkur" er adeins a Skipulags-flipa
   og gangan endar ekki thar, svo fyrri utgafa profsins fell a rongum stad. */
ok("og DOM-inn fylgir (flipa-heiti a islensku)",
   (container.textContent || "").includes("Skipulag") &&
   !(container.textContent || "").includes("Planner"));
ok("vistast i localStorage", dom.window.localStorage.getItem("fpl_lang") === "is");
ok("<html lang> fylgir valinu", dom.window.document.documentElement.lang === "is");

console.log(`\nTUNGUMAL-DOM: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
