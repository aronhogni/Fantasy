/* ============================================================
   ROÐUN OG TOM GILDI — LESIN UT UR TOFLUNNI, EKKI UR KODANUM

   CLAUDE.md kallar thetta "algengasta villan i svona toflum": tomur
   reitur sem er lesinn sem NULL flytur ser upp i "asc" og fyllir toppinn,
   svo dalkur litur ut fyrir ad hafa 30 lakustu leikmenn deildarinnar i
   efstu saetunum thegar hann hefur i raun 30 leikmenn AN GAGNA.

   Reglan sem a ad halda er skyr og osamhverf:
     VANTAR (null)  -> alltaf NEDST, i BAÐUM attum
     0 (raunveruleg tala) -> radast eins og hver onnur tala

   Profad UT UR DOM-INU a raungognum, ekki med thvi ad kalla a
   samanburdarfallid — thad fall er `useMemo` inni i PlayerList og ad
   skrifa thad upp aftur i profinu vaeri onnur utfaersla af sama hlut
   (sama gildran og nafna-porunin, CLAUDE.md).

   Listinn er SYNDARVAEDDUR, svo adeins efstu radirnar eru i DOM. Thad
   dugar: reglan snyst einmitt um hverjir eru EFSTIR.

   HI:FALSE ER PROFAD SERSTAKLEGA. Fyrir Verd, Min/framlag, GC, xGC og
   spjold er LAEGRA betra. Rodunin sjalf er samt bara tala — thad sem
   verdur ad halda er ad "asc" gefi vaxandi rod og "desc" minnkandi, og
   ad tomu gildin sitji nedst i badum. Ef ordid "besta" snyst vid an thess
   ad rodin geri thad er myndin villandi (sbr. `compare-visual.mjs`).
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { STAT_DEFS } from "../src/stats.js";

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
const settle = async (ms = 30) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const fire = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
};

console.log(`\n${"─".repeat(72)}\nRODUN OG TOM GILDI I LEIKMANNATOFLUNNI\n${"─".repeat(72)}`);

await fire([...document.querySelectorAll("button")].find(b => b.textContent.includes("Player stats")));

/* GAGNA-ROD er DIV thar sem FYRSTA barnid ber stjornu-hnappinn (frosna
   nafnaholfid). Thad er eina ORUGGA audkennid: raðirnar hafa breytilegan
   dalkafjolda eftir thvi hvada flokkur er valinn, svo fastur fjoldi
   dygdi ekki, og hvorki `class` ne `data-` attribute eru i notkun.    */
const dataRows = () => [...document.querySelectorAll("div")].filter(d => {
  const first = d.children[0];
  return first && first.tagName === "DIV" &&
         [...first.children].some(c => c.tagName === "BUTTON" && /^[☆★]$/.test(c.textContent.trim()));
});

/* HAUS-RODIN LENDIR I SOMU SIU — og thad er ekki tilviljun heldur
   skjalfest honnun: stjarnan i HAUSNUM er SIA en stjarnan i rodinni er
   vaktlisti (CLAUDE.md 6i). Baðar eru ☆-hnappar i frosna holfinu, svo
   hausinn er einfaldlega FYRSTA rodin sem siann finnur — auðkenndur a
   thvi ad fyrsta holfid ber ordid "Player".                            */
const allRows = () => dataRows();
const headerRow = () => allRows().find(d => /Player/.test(d.children[0]?.textContent || "")) || null;
const bodyRows = () => { const h = headerRow(); return allRows().filter(d => d !== h); };

/* Les gildin i dalki `idx` ur syndarglugganum (efstu radir).           */
const columnValues = idx => {
  const out = [];
  for (const row of bodyRows()) {
    const cell = row.children[idx];
    if (!cell) continue;
    const t = (cell.textContent || "").trim();
    if (!t) continue;
    out.push(t === "—" ? null : parseFloat(t.replace(/[£%,+]/g, "")));
  }
  return out;
};

/* HAUS-HOLFIN ERU <div onClick>, EKKI <button> — svo leit ad hnoppum
   fann adeins stjornu-siuna. Radad er thvi med thvi ad smella a holfid
   sjalft, eins og notandinn gerir.                                     */
const hrow = headerRow();
ok("haus-rodin fannst", !!hrow);
const hs = hrow ? [...hrow.children] : [];
ok(`haus-holf fundust (${hs.length})`, hs.length >= 8, `fann ${hs.length}`);
ok(`gagna-radir i syndarglugga (${bodyRows().length})`, bodyRows().length >= 8);

/* ---------- Farid yfir uppadrifid urtak dalka ----------
   Allir 100+ dalkar x 2 attir vaeri margra minutna keyrsla; hér eru
   teknir their sem MESTU MALI SKIPTA fyrir regluna: dalkar sem HAFA
   raunveruleg tom gildi i valdri sýn (annars profar ekkert null-regluna). */
let checkedCols = 0, nullBearing = 0;
const problems = [];

/* ATTIN ER LESIN AF HAUSNUM, EKKI GEFIN SER.
   Fyrsti smellur gefur SJALFGEFNU attina og hun fer eftir `hi`: dalkur
   thar sem haerra er betra opnast i "desc" (besti efst) en dalkur thar
   sem laegra er betra i "asc". Fyrsta utgafa profsins kalladi fyrsta
   smell alltaf "asc" og flaggadi thvi 6 RETTA dalka sem ranga. Orin
   (↑/↓) og `aria-sort` segja hid retta, svo thau eru lesin.           */
const dirOf = h => {
  const a = h.getAttribute?.("aria-sort");
  if (a === "ascending") return "asc";
  if (a === "descending") return "desc";
  const t = h.textContent || "";
  return t.includes("↑") ? "asc" : t.includes("↓") ? "desc" : null;
};

/* FLEIRI EN EINN FLOKKUR — annars profast null-reglan varla.
   Sjalfgefni flokkurinn ("Basics") er nanast fullur af gognum og bar
   adeins EINN dalk med tomu gildi. "Defence" ber markmanns-dalka (vorslur,
   vorslud viti) sem eru null hja ollum utivallarmonnum, og "Attack" ber
   BSD-dalka sem vantar hja oporudum. Thad er thar sem reglan reynir a. */
async function scanGroup(label) {
  const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === label);
  if (!btn) { problems.push(`flokkurinn "${label}" fannst ekki`); return; }
  await fire(btn);
  const hrow2 = headerRow();
  if (!hrow2) { problems.push(`haus-rod fannst ekki i "${label}"`); return; }
  const cells = [...hrow2.children];
  for (let i = 1; i < cells.length; i++) await scanColumn(cells, i, label);
}

async function scanColumn(cells, i, group) {
  const h = cells[i];
  const name = `${group}/${h.textContent.replace(/[↓↑▼]/g, "").trim() || i}`;
  await fire(h);
  const d1 = dirOf(cells[i]), v1 = columnValues(i);
  await fire(h);
  const d2 = dirOf(cells[i]), v2 = columnValues(i);
  if (v1.length < 8 || v2.length < 8) return;
  if (!d1 || !d2 || d1 === d2) { problems.push(`${name}: attin snerist ekki (${d1} -> ${d2})`); return; }
  const asc  = d1 === "asc"  ? v1 : v2;
  const desc = d1 === "desc" ? v1 : v2;
  checkedCols++;

  const hasNull = asc.includes(null) || desc.includes(null);
  if (hasNull) {
    nullBearing++;
    /* REGLAN: ekkert null ma standa OFAN VID tolu — i hvorugri att.    */
    const firstNull = a => a.findIndex(v => v === null);
    const lastNum   = a => a.reduce((k, v, i) => v !== null ? i : k, -1);
    for (const [dir, arr] of [["asc", asc], ["desc", desc]]) {
      const fn = firstNull(arr), ln = lastNum(arr);
      if (fn !== -1 && ln > fn)
        problems.push(`${name} (${dir}): tomt gildi i saeti ${fn + 1} en tala i saeti ${ln + 1}`);
    }
    /* OG ThETTA ER FULLYRDINGIN SEM RAUNVERULEGA BITUR.
       "Null ofan vid tolu" ein og ser DUGAR EKKI: ef tomu gildin flaeda
       yfir ALLAN syndargluggann sest engin tala, `lastNum` verdur -1 og
       skilyrdid slokknar. Stokkbreyting (`return dir` i stad `return 1`)
       slapp einmitt thannig i gegn medan tom gildi foru ur 4 i 113.
       Retta invariantid er OSAMHVERFT: se dalkurinn med tolur a annad
       bord ma TOPPURINN aldrei vera tomur — i HVORUGRI att.            */
    const anyNumber = [...asc, ...desc].some(v => v !== null && Number.isFinite(v));
    if (anyNumber) for (const [dir, arr] of [["asc", asc], ["desc", desc]])
      if (arr[0] === null)
        problems.push(`${name} (${dir}): TOPPURINN er tomur thott dalkurinn hafi tolur`);
  }
  /* Rodin sjalf verdur ad vera einhalla medal talnanna.                */
  const nums = a => a.filter(v => v !== null && Number.isFinite(v));
  const na = nums(asc), nd = nums(desc);
  if (na.length >= 5 && !na.every((v, i) => i === 0 || v >= na[i - 1]))
    problems.push(`${name}: "asc" er ekki vaxandi (${na.slice(0, 5).join(", ")})`);
  if (nd.length >= 5 && !nd.every((v, i) => i === 0 || v <= nd[i - 1]))
    problems.push(`${name}: "desc" er ekki minnkandi (${nd.slice(0, 5).join(", ")})`);
}

for (const g of ["Basics", "Defence", "Attack", "Set pieces and cards"]) await scanGroup(g);

ok(`dalkar lesnir i badar attir (${checkedCols})`, checkedCols >= 30, `adeins ${checkedCols}`);
/* AD TOM GILDI SJAIST SJALDAN A TOPPNUM ER REGLAN AD VIRKA, ekki thekjubrestur
   — thau eru einmitt SEND NIDUR. Thetta er ANTI-TOMLEIKA-fullyrding: hun
   sannar ad null-greinin hafi yfirleitt verid keyrd, svo fullyrdingarnar
   tvaer hér ad ofan ("null ofan vid tolu" og "toppurinn tomur") seu ekki
   sjalfkrafa graenar. SONNUNIN a thvi ad tomu gildin hafi farid NIDUR en
   ekki HORFID er skrunprofid hér a eftir — hun er sterka fullyrdingin.

   THROSKULDURINN VAR 3 (maelt 4) OG HANN VAR AD MAELA VILLU (16.8.2026).
   Thrjar af theim fjorum dalka-attum voru `Order` (pen_order), `FK` og
   `Corners` — dalkar sem voru TOMIR HJA OLLUM 587 i sjalfgefnu utsyninni
   af thvi ad getterarnir lasu hra FPL-svid sem `player_seasons.json` ber
   ekki. Their toldust "null-berandi" af thvi ad their voru bilaðir.
   Thegar sviðin voru borin yfir a `src` hurfu their ur talningunni og
   `Net trans` kom i stadinn (rett null i stad tilbuins 0), svo talan er
   nu 2: `Chg GW` og `Net trans`.

   ThESS VEGNA ER GOLFID 1, EKKI FAST SOGULEGT TAL. Talan raest af thvi hve
   margir dalkar eiga faerri en 31 gildi i thessum gognum — eiginleiki
   GAGNANNA, ekki kodans — og fast tal um lifandi gogn urealdist thegjandi
   (sama aett og "MEASURED: the range is 4-10", CLAUDE.md 8). Ef hun fer i 0
   er skonnunin haett ad sja null og fullyrdingarnar ofan eru ordnar tomar. */
ok(`tom gildi sjast a toppnum i ${nullBearing} tilvikum (maelt 2: Chg GW, Net trans)`,
   nullBearing >= 1, `ENGIN null i skonnuninni — fullyrdingarnar ofan maela ekkert`);

/* ---------- SONNUNIN: TOMU GILDIN ERU NEDST, EKKI HORFIN ---------- */
{
  const scroller = [...document.querySelectorAll("div")]
    .find(d => (d.style.overflowY || d.style.overflow || "").includes("auto"));
  let bottomNulls = 0, cols = 0;
  if (scroller) {
    /* "Defence" ber markmanns-dalka sem eru null hja ~90% leikmanna.  */
    const g = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Defence");
    if (g) await fire(g);
    const cells = headerRow() ? [...headerRow().children] : [];
    for (let i = 1; i < Math.min(cells.length, 8); i++) {
      await fire(cells[i]);                    // rada eftir dalkinum
      /* SKRUNID VERDUR AD LENDA INNAN LISTANS. Fyrsta utgafa setti
         600*34 = 20.400 px en listinn er 573*34 = 19.482 px, svo
         syndarglugginn reiknadi svid AFTAN VID sidustu rod og teiknadi
         EKKERT — profid las tha 0 dalka og leit ut fyrir ad falla.    */
      scroller.scrollTop = Math.max(0, (bodyRows().length ? 573 : 0) * 34 - 700);
      await act(async () => { scroller.dispatchEvent(new dom.window.Event("scroll")); });
      await settle();
      const vals = columnValues(i);
      if (!vals.length) continue;
      cols++;
      if (vals.at(-1) === null) bottomNulls++;
    }
  }
  ok(`nedstu radirnar bera tom gildi i ${bottomNulls} af ${cols} dalkum — thau foru NIDUR`,
     cols > 0 && bottomNulls >= 1, `cols=${cols} bottomNulls=${bottomNulls}`);
}
ok("VANTAR situr alltaf NEDST og rodin er einhalla", problems.length === 0,
   [...new Set(problems)].slice(0, 6).join(" | "));

/* ---------- hi:false er merking, ekki rodun ---------- */
{
  const lower = STAT_DEFS.filter(d => d.hi === false);
  ok(`dalkar thar sem LAEGRA er betra eru merktir (${lower.length})`, lower.length >= 10);
  ok("hver theirra ber skyringu (note) svo attin se laesileg",
     lower.every(d => (d.note || "").length > 10),
     lower.filter(d => (d.note || "").length <= 10).map(d => d.key).join(","));
}

console.log(`\nRODUNAR-PROF: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
