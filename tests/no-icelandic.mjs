/* ============================================================
   ENGIN ISLENSKA A SKJANUM — LESID AF DOM-INUM, EKKI UR KODANUM

   Appid var tvityngt til 7.8.2026 og thetta safn bar tha IS-DOM saman vid
   EN-DOM. Tungumalalagid er farid (`tx()`, ordabokin, IS/EN-hnappurinn);
   vidmotid er enskt og BARA enskt. Spurningin sem eftir stendur er onnur
   og einfaldari: KOMST ISLENSKA AD?

   HUN GETUR THAD ENN, OG A THREMUR LEIDUM:
     1. Nyr strengur skrifadur a islensku (repo-id er islenskt: hver
        athugasemd, hvert commit, thetta profskjal).
     2. ISLENSKA AN BRODDSTAFA — "Yfirlit", "laugardagur", "Grunnur",
        "lau", "Utan teigs". Stafa-skynjun ser thaer EKKI. Their sluppu
        allir 31.7. og fundust af MANNI sem las skjainn.
     3. Islenskur butur sprautadur INN i enskan streng: "travel 359 km
        (langferd)". Sniðmatid er enskt, buturinn ekki.

   AF HVERJU DOM OG EKKI AST: profid les TEXTANN SEM BIRTIST. Kodalestur
   getur hvorki greint "Yfirlit" fra ensku ordi ne sed hvad `record()`
   skrifadi i status.json.

   EITT LEYFT, OG ThAD ER LEITT UT UR data/ SVO LISTINN GETI EKKI STADNAD:
     · NOFN leikmanna og lida (Gudmundsson, Sævarsson, Senesi Barón).
       Their eru fjarlaegdir sem UNDIRSTRENGIR (longstu fyrst), ekki sem
       ORD: ordalisti leyfdi sprautada butinn "lið £ ferðalög · alls" ad
       sleppa af thvi ad "ferðalög" var lika i status.json. Mutations-prof
       M4b sannadi thad.

   >>> PIPELINE-NOTURNAR ERU EKKI LENGUR UNDANThEGNAR (9.8.2026). <<<
   Adur stod hér ad `record(...)`-notur maettu vera islenskar thvi thaer
   vaeru "gogn, ekki vidmot". ThAD VAR RANGT I FRAMKVAEMD: `v.note` er birt
   undir "Data sources" — bædi sem synilegur texti og sem tooltip — og
   `comp_label` for beint i leikjalistann a leikmannaspjaldinu ("Ofurbikar"
   a Aston Villa-manni, maelt 9.8.2026). Undanthagan sem var rett fyrir
   FRETTIR og NOFN var gat fyrir texta sem VID skrifum sjalf.

   Allir pipeline-strengir eru nu enskir og kafli D ver thad VID UPPRUNANN
   (scripts/*.mjs), thvi kafli C getur ekki sed thad: hann leyfir islensku
   sem kemur ur data/, og notan kom einmitt thadan.

   Keyrsla: loader-safn (sja run-tests.mjs).
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
  /* FLIPARNIR ERU VALDIR UT FRA FLIPASTIKUNNI SJALFRI, EKKI A IKONI.
     Fyrri utgafa siadi a emoji-lista (\u26bd\ud83d\udc65\ud83d\udcca\ud83c\udfc6) og SLEPPTI thar med
     **\ud83d\udee1\ufe0f Teams og Set pieces** \u2014 Teams er nyjasti flipinn og ber
     BSD-gognin, svo islensku-lekaprofid las hann aldrei. Ikona-listi er
     sama aett af hardkodun og islensku leitarordin i react-warnings:
     hann eldist thogult. Stikan er fundin sem sameiginlegt for-element
     Planner-hnappsins og allir hnappar hennar teknir.                  */
  const tabBtns = () => {
    const seed = [...container.querySelectorAll("button")]
      .find(b => /^\u26bd/.test((b.textContent || "").trim()));
    const bar = seed?.parentElement;
    return bar ? [...bar.children].filter(el => el.tagName === "BUTTON") : [];
  };
  const headBtns = () => [...container.querySelectorAll("button")]
    .filter(b => /^(\ud83d\udcca FFDR|\ud83c\udfab)/.test((b.textContent || "").trim()));

  /* haus-spjold: FFDR-tafla og Chips */
  for (const b of headBtns()) { await click(b); chunks.push(harvest()); }

  /* leikmannaspjald — staersta texta-flotid */
  /* OLL SPJOLDIN A VELLINUM, EKKI EITT — ORDAFORDI DUGDI EKKI, ThEKJA
     ThURFTI TIL. "yfir"/"undir" stodu a leikmannaspjaldinu og sluppu i
     uttekt FABLE. Fyrsta vidbrogd min voru ad baeta ordunum a listann i
     kafla C — og ThAD DUGDI EKKI: stokkbreyting (setja islenskuna aftur
     inn) SLAPP samt, thvi profid opnadi adeins FYRSTA spjaldid og su
     undir-merking birtist einungis hja leikmonnum sem eiga xG OG minutur.
     Ordalistinn var aldrei vandamalid; ThEKJAN var thad. Nu eru oll 15
     spjoldin a vellinum opnud — hvert theirra er nytt texta-flot.      */
  const infoBtns = () => [...container.querySelectorAll("button")]
    .filter(b => b.title === "Information");
  const nCards = infoBtns().length;
  for (let i = 0; i < nCards; i++) {
    const b = infoBtns()[i];
    if (!b) continue;
    await click(b);
    chunks.push(harvest());
    const x = [...container.querySelectorAll("button")]
      .filter(y => (y.textContent || "").trim() === "✕");
    if (x.length) await click(x.at(-1));
  }
  /* ThEKJAN ER FULLYRDING (CLAUDE.md 5b): se ekkert spjald opnad er
     kaflinn haettur ad maela og ma ekki vera graenn.                   */
  if (nCards < 10)
    throw new Error(`no-icelandic: adeins ${nCards} leikmannaspjold fundust (>=10 thurfa)`);

  /* roterings-spjaldid (FFDR-samanburdur) */
  /* "FFDR" er othytt, svo thetta virkar a badum malum. ATH: EKKI nota
     tilbuinn lykil (tx("FFDR-samanburður")) — hann er ekki i ordabokinni
     og profid skradi hann tha sjalft sem VANTANDI lykil i kafla C.    */
  const rot = [...container.querySelectorAll("button")]
    .filter(b => (b.title || "").startsWith("FFDR compar"));
  if (rot[0]) {
    await click(rot[0]); chunks.push(harvest());
    const x = [...container.querySelectorAll("button")].filter(b => (b.textContent || "").trim() === "✕");
    if (x.length) await click(x.at(-1));
  }

  /* fliparnir sjalfir */
  const tabs = tabBtns();
  /* ThEKJAN ER FULLYRDING, EKKI LOGGA (sja CLAUDE.md 5b): ef flipar
     haetta ad finnast a profid ad FALLA, ekki ad skanna minna i thogn.  */
  if (tabs.length < 6)
    throw new Error(`no-icelandic: fann adeins ${tabs.length} flipa (>=6 thurfa) — flipastikan fannst ekki`);
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

async function renderIn() {
  if (root) await act(async () => { root.unmount(); });
  container.innerHTML = "";
  root = createRoot(container);
  await act(async () => { root.render(React.createElement(App)); });
  await settle(); await settle();
  return await walkEverything();
}

console.log("\n=== RENDER ===");
const enText = await renderIn("en");
ok("appid teiknast", enText.length > 5000, `${enText.length} stafir`);

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
/* UNDANTEKNINGIN ER FARIN — 8.8.2026.
   Hér var vel sem las HVERJA `note`/`via` ur ollum data-skram og fjarlaegdi
   thaer ur DOM-inum adur en leitad var ad islensku. Hun var til af thvi ad
   `record(...)` i fetch.mjs skrifadi ISLENSKA prosu sem appid birti hratt
   (CLAUDE.md 7b taldi thad of breitt ad thyda).

   Notandinn sa afleidinguna: Umferdar-flipinn bar islenskan gulan kassa i
   ENSKU vidmoti. Nu eru ALLAR 24 pipeline-notur enskar, svo undantekningin
   hefur ekkert ad fela — og AN hennar er profid STRANGARA: hver islensk
   nóta sem einhver skrifar hedan i fra fellur strax i stad thess ad vera
   hvitthvegin. Staðfest: profid er graent an hennar.                     */

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

/* Engar undantekningar lengur: IS/EN-vixlarinn var eina ordid sem matti
   standa a islensku, og hann er farinn.                                */
const SWITCHER = new Set();

const residualOf = (line) => {
  const r = line;
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
ok("hver lina i enska DOM-inum er thydd (engar undantekningar)",
   codeLeaks.length === 0, [...new Set(codeLeaks)].slice(0, 8).join("\n     "));

/* ---------- B. Stikur, undefined, NaN ---------- */
console.log("\n=== B. OFYLLTAR STIKUR OG RUSL ===");
const slotLeft = enText.match(/\{\d+\}/g) || [];
ok("engin ofyllt stika ({0}) a skjanum", slotLeft.length === 0, slotLeft.slice(0, 8).join(" "));
for (const bad of ["undefined", "NaN", "[object Object]"]) {
  ok(`ekkert "${bad}" i enska DOM-inum`, !enText.includes(bad));
}
/* ---------- C. ISLENSKA AN BRODDSTAFA ---------- */
console.log("\n=== C. ASCII-ISLENSKA (blindi bletturinn) ===");
/* KAFLI A GETUR THETTA EKKI, OG THAD ER EDLISLAEGT: hann leitar ad
   stofum sem enskan a ekki (þðæö, broddar). "Yfirlit", "Grunnur",
   "laugardagur" og "Utan teigs" hafa ENGA slika stafi — their sluppu
   ALLIR 31.7.2026 og fundust af manni sem las skjainn.

   MEDAN APPID VAR TVITYNGT var svarid IS/EN-SAMANBURDUR: strengur sem
   var ordrett eins a badum malum var grunsamlegur. Sa samanburdur er
   farinn med odru malinu, svo hann er ekki i bodi lengur.

   THETTA ER ORDALISTI OG HANN GETUR STADNAD — thad er vidurkennt hér og
   ekki falid. Hann er thvi ekki gitskadur heldur BYGGDUR A THVI SEM
   RAUNVERULEGA LAK (CLAUDE.md 8b) auk algengra islenskra ordmynda sem
   hafa ENGA enska merkingu. Ord med enskri merkingu ("lid", "min",
   "man", "mid", "sun", "form", "mark") eru VILJANDI UTAN listans — their
   myndu fella profid a rettum enskum texta og tha vaeri thad slokkt
   innan viku.                                                          */
const ASCII_IS = [
  /* raunverulegir lekar 31.7.2026 */
  "yfirlit", "grunnur", "hreinsa", "laugardagur", "utan", "teigs",
  /* vikudagar og skammstafanir theirra (birtast a leikjarodum) */
  "sunnudagur", "manudagur", "thridjudagur", "midvikudagur",
  "fimmtudagur", "fostudagur", "mandagur",
  /* ordmyndir sem koma fyrir i vidmotstexta appsins */
  "umferd", "umferdin", "umferdir", "leikmenn", "leikmadur", "stigatafla",
  "skipulag", "sokn", "midja", "vorn", "markv", "bekkur", "spjold",
  "allir", "alls", "engin", "engir", "ekkert", "ekki", "sidustu",
  "naestu", "thegar", "thetta", "thessi", "vantar", "bidur", "hafid",
  "faerslur", "adeins", "samtals", "medaltal", "heildar", "vaentanleg",
  "endurhlada", "stadfesta", "breyta", "loka", "opna", "veldu",
  /* BAETT VID 10.8.2026 EFTIR UTTEKT: "yfir"/"undir" stodu a
     leikmannaspjaldinu ("+0.42 yfir") og THESSI LISTI SA THAU EKKI.
     Listinn er byggdur a thvi sem hefur RAUNVERULEGA lekid — hann er
     thvi alltaf a eftir, og hver nyr leki a ad baetast vid hann, ekki
     bara ad vera lagfaerdur i kodanum.                                */
  "yfir", "undir", "hlutur", "hlutfall", "fjoldi", "nafn", "verd",
];
{
  const seen = new Set();
  for (const line of enText.split("\n"))
    for (const tok of line.split(/[^\p{L}]+/u)) {
      const w = tok.toLowerCase();
      if (ASCII_IS.includes(w) && !dataTokens.has(w)) seen.add(`${w}  <-  ${line.slice(0, 60)}`);
    }
  ok(`engin ASCII-islenska a skjanum (${ASCII_IS.length} ordmyndir vaktadar)`,
     seen.size === 0, [...seen].slice(0, 6).join("\n     "));
}

/* ============================================================
   D. PIPELINE-STRENGIR — ThAD SEM ER SKRIFAD I `data/`

   HVERS VEGNA KAFLI A-C DUGDU EKKI: their lesa DOM-inn og leyfa
   VILJANDI islensku sem kemur UR `data/` (lidsnofn, frettir FPL,
   leikmannanofn med broddstofum). Su undanthaga er RETT fyrir gogn — en
   hun var GAT fyrir texta sem VID skrifum sjalf i gagnaskrarnar:

     `comp_label` var "Ofurbikar"/"Meistaradeild" og BIRTIST i
     leikjalistanum a leikmannaspjaldinu (maelt 9.8.2026 a Aston
     Villa-manni). Kafli C sa thad ekki thvi ordid kom ur data/.
     `record(...)`-noturnar birtast undir "Data sources" i hlidarstiku —
     bædi sem texti og sem tooltip.

   ThESS VEGNA ER LEITAD I UPPRUNANUM: hver STRENGJA-BOKSTAFUR i
   scripts/*.mjs. ATHUGASEMDIR ERU UNDANSKILDAR OG ThAD ER ASETT —
   thaer eru throunar-skjolun (rokstudningur, maelingar, villusogur) og
   eru islenskar eins og CLAUDE.md sjalf. Vidmot og gogn eru ensk;
   rokstudningurinn er a islensku. Sja kafla 9 i CLAUDE.md.

   scripts/nfl/* er UNDANSKILID: thad er sjalfstaett app med eigin
   sofnum og eigin lotu.
   ============================================================ */
console.log("\n=== D. PIPELINE-STRENGIR (scripts/*.mjs) ===");
{
  const { readdirSync } = await import("node:fs");
  const dir = new URL("../scripts/", import.meta.url).pathname;
  const files = readdirSync(dir).filter(f => f.endsWith(".mjs"));
  /* Sömu ordmyndir og kafli C plus thaer sem koma fyrir i pipeline-texta.
     Broddstafir eru lika prófadir — bædi form leka.                    */
  const PIPE_IS = new RegExp(
    "[þðæöáíóúéýÞÐÆÖÁÍÓÚÉÝ]|\\b(" + [
      "timabil", "timabils", "timabilum", "umferd", "umferdir", "umferdar",
      "leikir", "leikja", "leikur", "adeins", "thetta", "thvi", "engin",
      "engir", "ekkert", "gogn", "gognum", "skrifad", "lidid", "lidi",
      "klst", "gluggi", "glugga", "vantar", "innan", "koll", "sott",
      "paradir", "treverk", "nofn", "maelt", "radir", "sleppt", "svaedi",
      "skotakort", "lokid", "leyst", "thekja", "byrjunarlid", "stadfest",
      "hittni", "nothaeft", "lokatolur", "speglun",
      /* ordin sem SLUPPU i fyrstu atrennu — sonnun thess ad listinn
         verdur ad vaxa thegar hann fellur, ekki ad vera "nogu godur". */
      "byrja", "byrjar", "oparadir", "oparad", "leidir", "lykill", "lykli",
      "sia", "sott", "sotti", "fjarlaegd", "kvardi", "kvarda", "vollur",
      "velli", "midja", "breidd", "fallin", "skyttu", "eldri",
      /* ============================================================
         SMAORDIN ERU STERKASTA MERKID — og thau eru thad sem gerir
         listann ad einhverju odru en kapphlaupi vid sjalfan sig.
         Ordalisti yfir NAFNORD verdur ALLTAF ofullkominn: hver ny nota
         ber ny ord ("fittad", "lids-svidinu", "skilgreining") og tvaer
         atrennur i rod slupptu einmitt thannig. En ISLENSK SETNING BER
         NANAST ALLTAF SMAORD — og thau eru fa og lokud. Ekkert theirra
         er enskt ord, svo falskar jakvaedar eru ekki vandamal.        */
      "og", "er", "eru", "ekki", "sem", "med", "fyrir", "til", "thad",
      /* "their" ER EKKI HER: islenska "þeir" an broddstafa er STAFRETT
         EINS OG ENSKA ORDID "their", svo hun felldi retta enska notu
         ("`ai_score` is their own model"). Ord med enskri merkingu eru
         VILJANDI utan listans — sama regla og "lid"/"min"/"man"/"sun". */
      "thaer", "hun", "hann", "vid", "tha", "svo", "eda", "hvert",
      /* LAK 10.8.2026 I ANNARRI UTTEKT — FIMM strengir sem thessi listi sa
         EKKI, thott hann hefdi verid hertur med smaordunum somu nott:
           "engar dagsetningar i last_gw.json"     (record-nota, birt)
           "kvoti at throtum ... threpid lokadi"   (fer i lineups.json)
           "REIKNINGUR I VANDRAEDUM: ..."          (fer i injuries.json.plan)
           "svar an threps-upplysinga"             (sama)
           "ESPN telur KERFISBUNDID ~3,5% faerri"  (i team_shots.json)
         Hvorugur listinn nadi theim: strengirnir eru STUTTIR og bera hvorki
         "og/er/eru/ekki" ne nokkurt ordanna sem thegar voru skrad.
         ThETTA ER SONNUNIN: SVARTLISTI VERDUR ALDREI TAEMANDI. Hann er
         GOLF, ekki thak. Reglan stendur — hver raunverulegur leki staekkar
         listann — en treystu honum ekki sem einu vorninni.               */
      "engar", "dagsetningar", "kvoti", "throtum", "threp", "threpid",
      "threps", "reikningur", "vandraedum", "upplysinga", "telur",
      "kerfisbundid", "faerri", "formerki", "stodvad", "eftir",
      "hverja", "thess", "thessi", "annad", "onnur", "bædi", "badir",
    ].join("|") + ")\\b", "i");

  /* STRENGIR ERU LESNIR MED SKANNA, EKKI REGEXI.
     Fyrsta utgafan skar athugasemdir burt med regexi og flaggadi ThRJAR
     falskar: `// aðeins PL-umferðir` er athugasemd AFTAN VID KODA a somu
     linu, sem `^\s*\/\/` naer ekki, og thegar hun sat eftir ruglaðist
     strengja-leitin a urfellingar-merkjum i kodanum. Skanni sem gengur
     staf fyrir staf veit hvenaer hann er i streng og hvenaer i
     athugasemd — og ruglast hvorki a `https://` ne a "don't".          */
  const strings = src => {
    const out = [];
    let i = 0, prev = "";
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "/" && n === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
      /* REGLULEG SEGD ER EKKI STRENGUR — og `/["']/` felldi fyrstu
         utgafuna: skanninn sa gaesalappirnar INNI i segdinni, opnadi
         streng og gleypti 200 linur af koda i einn "streng". Segd er
         thekkt a thvi ad `/` komi a eftir tákni sem getur ekki endad
         segdargildi (venjuleg heuristik).                              */
      if (c === "/" && "(,=:[!&|?{;+-*%~^".includes(prev)) {
        i++;
        while (i < src.length && src[i] !== "/") {
          if (src[i] === "\\") i++;
          else if (src[i] === "[") { while (i < src.length && src[i] !== "]") { if (src[i] === "\\") i++; i++; } }
          else if (src[i] === "\n") break;
          i++;
        }
        i++; continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        const q = c; let j = i + 1, buf = "";
        while (j < src.length) {
          if (src[j] === "\\") { buf += src[j + 1] ?? ""; j += 2; continue; }
          if (src[j] === q) break;
          buf += src[j]; j++;
        }
        out.push(buf); i = j + 1; prev = q; continue;
      }
      if (!/\s/.test(c)) prev = c;
      i++;
    }
    return out;
  };

  const bad = [];
  let checked = 0;
  for (const f of files) {
    for (const lit of strings(readFileSync(dir + f, "utf8"))) {
      if (lit.length < 3) continue;
      checked++;
      if (PIPE_IS.test(lit)) bad.push(`${f}: ${lit.slice(0, 70)}`);
    }
  }
  /* ThEKJA ER FULLYRDING (CLAUDE.md 5b): ef leitin finnur enga strengi er
     hun haett ad maela og ma ekki vera graen.                          */
  ok(`strengir skodadir i ${files.length} skriftum (${checked})`, checked > 300, `adeins ${checked}`);
  ok(`engin islenska i pipeline-strengjum${bad.length ? ` — ${bad.length} fundust` : ""}`,
     bad.length === 0, [...new Set(bad)].slice(0, 8).join("\n     "));
}

console.log(`\nENGIN ISLENSKA: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
