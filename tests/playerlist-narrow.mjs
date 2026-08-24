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
ok("ekkert undefined/NaN i simaham", !/\bundefined\b|\bNaN\b|\[object Object\]/.test(txt()));

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

/* ============================================================
   "season"-MERKID I SIMA — AKVORDUN, EKKI TILVILJUN (16.8.2026)

   Merkid (43 px) baettist i hausinn 14.8.2026. I sima er hvert tolu-holf
   negld i 66 px, svo merkid eitt aetti ekki eftir plass fyrir heitid: haus
   sem segir "season" og ekkert annad segir ekki HVADA dalkur thetta er.
   Valid stod milli thess ad hækka 66 px thakid fyrir 43 af 124 dalkum —
   sem eydileggur simahaminn sem thad thak var smidad fyrir (kafli 6i) —
   og thess ad SLEPPA merkinu i sima. Heitid vann.
   MERKINGIN MA SAMT EKKI HVERFA MED THVI: bakgrunnur holfsins (`hBlind`)
   og skyringin i tooltip-inu fylgja HINU skilyrdinu og eru profud her.
   Thetta safn hafdi ALDREI valid umferdar-bil, svo thad hafdi aldrei sed
   merkid — hvorki teiknad ne sleppt.                                    */
{
  /* ============================================================
     UMFERDAR-BIL ER ADEINS TIL A LOKNU TIMABILI — VELJUM ThAD ThVI
     VILJANDI (22.8.2026)

     `season`-merkid teiknast adeins thegar `gwActive` er satt, og
     `gwActive` krefst per-umferdar skrarinnar (`player_gw_<key>.json`).
     Hun er EKKI til fyrir yfirstandandi timabil — appid segir thad sjalft
     i valaranum ("no gameweek data for 2026/27 — pick a finished season")
     — svo a yfirstandandi timabili er ENGINN dalkur merktur og kaflinn
     maelir ekkert. Maelt 22.8.2026: 0 merkt af 7 hausum.

     Kaflinn ERFDI arkivid thangad til GW1-fresturinn leid og sjalfgildid
     faerdist a yfirstandandi timabil (`startedGw > 0`). Hann velur thad nu
     sjalfur, og talan er LEIDD ur `player_seasons.json` (sama skra og
     `olderSeasons` i PlayerList) svo hun ureldist ekki naesta agust.
     ============================================================ */
  const settleOn = async () => {
    let last = -1, stable = 0;
    for (let i = 0; i < 40; i++) {
      await act(async () => { await new Promise(r => setTimeout(r, 25)); });
      const n = (document.body.textContent || "").length;
      if (n === last) { if (++stable >= 2) break; } else { stable = 0; last = n; }
    }
  };
  const ARCHIVE = J("player_seasons.json").seasons[0];
  const seasonSel = () => document.querySelector("select");
  const wasSeason = seasonSel()?.value;
  ok("timabils-valid er addressanlegt i sima", !!seasonSel());
  seasonSel().value = ARCHIVE;
  await act(async () => { seasonSel().dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  await settleOn();
  ok(`listinn stendur a ${ARCHIVE} (valid tok, ekki erft)`,
     seasonSel()?.value === ARCHIVE, String(seasonSel()?.value));

  /* Samanbrotid man sig i localStorage, svo strikid getur thegar verid
     opid — toggla thvi ADEINS ef kassarnir finnast ekki.                */
  const gwBtn = n => [...document.querySelectorAll("button")]
    .filter(b => b.textContent.trim() === String(n))
    .find(b => b.closest('[aria-label="Select gameweek range"]'));
  if (!gwBtn(30)) {
    const toggle = [...document.querySelectorAll("button")]
      .find(b => /Gameweeks/.test(b.textContent));
    if (toggle) await fire(toggle);
  }
  ok("umferdar-valarinn er adgengilegur i sima", !!gwBtn(30));
  if (gwBtn(30)) {
    await fire(gwBtn(30)); await fire(gwBtn(38));
    await act(async () => { await new Promise(r => setTimeout(r, 600)); });
    const aron = [...document.querySelectorAll("button")]
      .find(b => b.textContent.trim().startsWith("Consistency"));
    if (aron) await fire(aron);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });

    const heads = [...document.querySelectorAll("[aria-sort]")];
    const blindHeads = heads.filter(h => /SEASON FIGURE/i.test(h.getAttribute("title") || ""));
    /* FORSENDA: an blindra dalka a skjanum maeldi kaflinn ekkert.        */
    ok(`${blindHeads.length} arstidar-dalkar eru a skjanum i sima (forsenda)`,
       blindHeads.length >= 4, `heild ${heads.length}`);
    const withBadge = heads.filter(h =>
      [...h.childNodes].some(n => n.nodeType === 1 && n.textContent.trim() === "season"));
    ok("merkid er SLEPPT i sima (annars aeti thad allan dalkinn)",
       withBadge.length === 0, `${withBadge.length} merki teiknud`);
    /* EN MERKINGIN LIFIR: litur + tooltip. Hvorugt kostar pixel.         */
    ok("arstidar-dalkar bera samt litinn (hBlind) i sima",
       blindHeads.every(h => /243, *236, *247/.test(h.style.background
         || h.style.backgroundColor || "")),
       blindHeads[0]?.style?.background || "(enginn litur)");
    ok("og skyringin er afram i tooltip-inu",
       blindHeads.every(h => /does not follow the gameweek range/i.test(h.getAttribute("title") || "")));
    /* OG THAKID HELST — thetta er astaedan fyrir akvordunni.             */
    /* Nafnadalkurinn er undanskilinn — hann er frosinn og 140 px ad honnun
       (maelt haer ad ofan); thakid a vid TOLU-dalkana.                   */
    const hw = heads.filter(h => !/Player/.test(h.textContent))
      .map(h => parseFloat(h.style.width)).filter(Number.isFinite);
    ok(`haus-holfin eru enn <= 66 px med umferdar-bili (mest ${Math.max(...hw)})`,
       hw.length > 3 && Math.max(...hw) <= 66);
    /* Og hverfum svo aftur i heilt timabil svo restin af safninu maeli
       sama astand og adur.                                              */
    const whole = [...document.querySelectorAll("button")]
      .find(b => b.textContent.trim() === "whole season");
    if (whole) await fire(whole);
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
  }
  /* OG TIMABILID LIKA TIL BAKA — restin af safninu (myndir, lidsmerki,
     flipa-flakkid) a ad maela SJALFGEFNA astandid, ekki thad sem thessi
     kafli tharfnadist.                                                  */
  if (wasSeason != null && seasonSel()) {
    seasonSel().value = wasSeason;
    await act(async () => { seasonSel().dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
    await settleOn();
    ok(`timabilid skilad til baka (${wasSeason})`, seasonSel()?.value === wasSeason,
       String(seasonSel()?.value));
  }
}

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

/* ---------- FLIPARNIR VIRKA LIKA I SIMA ----------
   FLIPARNIR ERU LEIDDIR UT UR FLIPASTIKUNNI, EKKI TALDIR UPP.
   Hér stod hardkodadur listi af FIMM flipum. "Best of the best" baettist
   vid 10.8.2026 og listinn eltist EKKI — profid hefdi haldid afram ad
   segja "allir flipar teiknast i simabreidd" medan nyjasti flipinn var
   aldrei opnadur i sima. Nakvaemlega sama aett og emoji-listinn i
   `no-icelandic.mjs` (sem sleppti Teams) og islensku leitarordin i
   `react-warnings.mjs` (0 af 22). Hardkodadur listi eldist thogult.
   Stikan sjalf veit hvada flipar eru til; profid spyr hana.           */
{
  const tabBar = () => {
    const seed = [...document.querySelectorAll("button")]
      .find(b => /^⚽/.test((b.textContent || "").trim()));
    const bar = seed?.parentElement;
    return bar ? [...bar.children].filter(el => el.tagName === "BUTTON") : [];
  };
  const total = tabBar().length;
  ok(`flipastikan fannst og ber ${total} flipa`, total >= 6, `fann ${total}`);

  let switched = 0; const nanOn = [];
  for (let i = 0; i < total; i++) {
    const b = tabBar()[i];
    if (!b) continue;
    const name = (b.textContent || "").trim();
    await fire(b);
    switched++;
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(txt())) nanOn.push(name);
  }
  ok(`allir ${total} flipar teiknast i simabreidd (${switched})`, switched === total);
  ok("enginn flipi ber undefined/NaN i sima", nanOn.length === 0, nanOn.join(", "));
  ok("engin console-villa eftir flipa-flakk i sima", errors.length === 0, errors[0] || "");
}

console.error = origErr;
console.log(`\nSIMA-PROF: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
