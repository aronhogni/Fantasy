/* ============================================================
   SIMA-UTLITID — SEM ENGIN PROF HOFDU NOKKURN TIMA SED

   CLAUDE.md lysir simaham leikmannatoflunnar i smaatridum (nafnadalkur
   196 -> 124 px, tolur 88 -> 66, MYND FALIN, flokkahnappar skruna
   larett) og segir ad hann hafi verid honnadur a 380 px. Samt keyrdi
   ENGINN profkodi hann nokkurn tima:

     const [narrow, setNarrow] = useState(window.innerWidth < 560)
     useEffect(() => { if (!window.matchMedia) return;  ... })

   jsdom gefur `innerWidth = 1024` og hefur ENGA `matchMedia`, svo
   `narrow` var **fast false i ollum profum** og effectinn skilaði ser
   strax ut. Sima-greinin — annar helmingur toflunnar — var thvi jafn
   oprofud og hun vaeri ekki til. Sama aett og thogulu profin i
   CLAUDE.md 5b: enginn sagdi neitt, thvi enginn spurdi.

   Hér er BÁÐUM leidum stillt upp: `innerWidth` (upphafsgildid) OG
   `matchMedia` (effectinn), svo baðar greinar keyri.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

const dom = new JSDOM("<!doctype html><div id=root></div>",
                      { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* 390 px = iPhone-breidd. Baedi upphafsgildid og fjolmidlafyrirspurnin
   verda ad segja ThAD SAMA, annars profast onnur greinin ekki.        */
const PHONE = 390;
Object.defineProperty(dom.window, "innerWidth", { value: PHONE, configurable: true, writable: true });
dom.window.matchMedia = q => ({
  media: q,
  matches: /max-width:\s*559px/.test(q) ? PHONE <= 559 : false,
  addEventListener() {}, removeEventListener() {},
  addListener() {}, removeListener() {},
});

const errors = [];
const origErr = console.error;
console.error = (...a) => {
  const m = String(a[0] ?? "");
  if (!/not wrapped in act|Warning:/.test(m)) errors.push(m.slice(0, 120));
};

globalThis.fetch = async url => {
  const n = String(url).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 350)); });
const fire = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await new Promise(r => setTimeout(r, 60)); });
};

console.log(`\n${"─".repeat(72)}\nLEIKMANNATAFLAN I SIMABREIDD (${PHONE} px)\n${"─".repeat(72)}`);

await fire([...document.querySelectorAll("button")].find(b => b.textContent.includes("Player stats")));

const rowsAll = () => [...document.querySelectorAll("div")].filter(d => {
  const f = d.children[0];
  return f && f.tagName === "DIV" &&
         [...f.children].some(c => c.tagName === "BUTTON" && /^[☆★]$/.test(c.textContent.trim()));
});
const header = () => rowsAll().find(d => /Player/.test(d.children[0]?.textContent || ""));
const body = () => { const h = header(); return rowsAll().filter(d => d !== h); };

ok(`taflan teiknast i simabreidd (${body().length} radir)`, body().length >= 8);
ok("engin console-villa i simaham", errors.length === 0, errors[0] || "");

const txt = () => document.body.textContent || "";
ok("ekkert undefined/NaN i simaham", !/undefined|NaN|\[object Object\]/.test(txt()));

/* ---------- NARROW ER RAUNVERULEGA VIRKT ----------
   Ef `narrow` vaeri enn false vaeri nafnaholfid 216 px. Mæld breidd
   segir hvort greinin keyrdi — annars vaeri thetta prof jafn tomt og
   thau sem thad var skrifad til ad forda.                             */
const nameCell = body()[0]?.children[0];
const wOf = el => parseFloat((el?.style?.width || "").replace("px", "")) || null;
const nameW = wOf(nameCell);
ok(`frosna nafnaholfid er MJORRA i sima (${nameW} px)`,
   nameW != null && nameW <= 160, `maeldist ${nameW} — 216 thydir ad narrow er ekki virkt`);

/* Tolu-dalkar mega ekki vera breidari en 66 px i sima.               */
const numW = [...(body()[0]?.children || [])].slice(1).map(wOf).filter(v => v != null);
ok(`tolu-dalkar eru <= 66 px (mest ${Math.max(...numW)})`,
   numW.length > 3 && Math.max(...numW) <= 66, `breidastur ${Math.max(...numW)}`);

/* LEIKMANNAMYNDIN ER FALIN — "hvert pixel tharf ad fara i nafnid".
   ATH: LIÐSMERKID (11 px badge) er ÁFRAM birt og a ad vera thad. Fyrsta
   utgafa profsins taldi ALLAR <img> og felldi thvi rett hegdun — 31
   myndir reyndust 31 lidsmerki, ekki andlitsmyndir. Skilyrdid er thvi
   bundid vid SLODINA (`/photos/players/`), sem er eina leidin til ad
   greina thetta tvennt ad.                                            */
const isPhoto = im => /\/photos\/players\//.test(im.getAttribute("src") || "");
const photos = body().reduce((n, r) => n + [...r.querySelectorAll("img")].filter(isPhoto).length, 0);
const crests = body().reduce((n, r) => n + [...r.querySelectorAll("img")].filter(im => !isPhoto(im)).length, 0);
ok(`andlitsmyndir eru FALDAR i sima (0 af ${body().length})`, photos === 0, `fann ${photos}`);
ok(`lidsmerkin eru samt AFRAM birt (${crests}) — thau kosta 11 px`, crests >= body().length - 1);

/* ---------- HEILDARBREIDD RADARINNAR ----------
   Frosni dalkurinn ma aldrei taka meira en helming skjasins — thad var
   upphaflega vandamalid (196 af 380).                                 */
ok(`nafnadalkurinn tekur < helming skjasins (${nameW}/${PHONE})`,
   nameW != null && nameW < PHONE / 2);

/* ---------- FLIPARNIR VIRKA LIKA I SIMA ---------- */
{
  let switched = 0;
  for (const t of ["🛡️ Teams", "📊 Gameweek", "🏆 Leaderboard", "Set pieces", "👥 Player stats"]) {
    const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes(t.replace(/^\S+\s/, "")));
    if (b) { await fire(b); switched++; }
    if (/undefined|NaN/.test(txt())) { ok(`${t} an NaN i sima`, false); break; }
  }
  ok(`allir flipar teiknast i simabreidd (${switched})`, switched >= 5);
  ok("engin console-villa eftir flipa-flakk i sima", errors.length === 0, errors[0] || "");
}

console.error = origErr;
console.log(`\nSIMA-PROF: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
