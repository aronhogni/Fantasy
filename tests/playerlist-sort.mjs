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
import { STAT_DEFS, STAT_GROUPS, tableDefs } from "../src/stats.js";

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

/* FLOKKARNIR ERU LEIDDIR UT UR `STAT_GROUPS`, EKKI TALDIR UPP.
   Her stod handskrifad ["Basics", "Defence", "Attack", "Set pieces and
   cards"] — og tveir flokkar voru thvi ALDREI skannadir: "Consistency
   (Aron)" og "Upcoming fixtures". Handskrifadur listi er thekkt villuaett i
   thessu repo-i (`gwBlindKeys`, 13 af 22 lyklum rangir; CLAUDE.md 8), og
   hann bilar ThEGJANDI: nyr flokkur baetist vid, ekkert fellur, thekjan
   minnkar. Nu fellur profid ef flokka-hnappur finnst ekki, og talningin
   nedar er FULLYRDING um ad allir flokkarnir hafi verid heimsottir.
   AF HVERJU ThETTA ER MARKTAEKT: "Defence" ber markmanns-dalka (vorslur,
   vorslud viti) sem eru null hja ollum utivallarmonnum og "Attack" ber
   BSD-dalka sem vantar hja oporudum — thad er thar sem null-reglan reynir a.
   MAELT 17.8.2026 vid ad leida listann ut: dalka-attir foru ur 121 i 134
   (flokkarnir tveir baeta vid 13) og null-berandi dalkar STODU I STAD, 2.
   Vinningurinn er thvi ekki fleiri null i dag heldur ad flokkarnir tveir
   eru ekki lengur ovaktadir — og ad naesti flokkur verdur skannadur an
   thess ad nokkur muni eftir thvi.                                       */
let scannedGroups = 0;
async function scanGroup(label) {
  const btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === label);
  if (!btn) { problems.push(`flokkurinn "${label}" fannst ekki`); return; }
  scannedGroups++;
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

/* FLOKKUR AN SYNDS DALKS A ENGAN HNAPP (25.8.2026). "Set pieces and
   cards" er allur `build_only` og er thvi ekki i flokka-rodinni — ad
   leita ad honum hefdi gefid "fannst ekki" fyrir HEGDUN SEM ER RETT.
   Listinn er leiddur ur SOMU siu og hnapparnir sjalfir (`tableDefs`),
   ekki ur `STAT_GROUPS` hrau og ekki handskrifadur: baetist flokkur vid
   — eda hverfur `build_only` af einhverjum — fylgir thekjan med.       */
const SCANNED = STAT_GROUPS.filter(g => tableDefs({ group: g.key }).length);
for (const g of SCANNED) await scanGroup(g.label);

/* ============================================================
   BANDS-RODIN A SKJANUM — HUN VERDUR AD STANDA YFIR SINUM DALKUM
   OG RUMA SITT EIGID HEITI (25.8.2026)

   TILKYNNT AF NOTANDA: "M, NEXT MA" og "EAM, NEXT 6" i "Upcoming
   fixtures". Breidd bands-holfsins var SUMMAN AF BREIDDUM SINNA DALKA og
   heitid var hvergi i theim reikningi, svo band med EINUM dalki fekk
   66 px fyrir heiti sem tharf 101. `stats.test.mjs` ver REIKNINGINN
   (`bandLayout`); HER er varin TENGINGIN — ad holfin lesi hann lika.
   Vaeri hun rofin (holf a `wBase`, band a `bandLayout`) yrdi bandid
   BREIDARA en dalkarnir undir thvi og hausinn faeri ur samhengi vid
   tolurnar — nakvaemlega afturforin sem `boxSizing` olli i einu threpi.
   ============================================================ */
{
  const PLm = await import(new URL("../src/PlayerList.jsx", import.meta.url).href);
  const bandRowOf = () => {
    const h = headerRow();
    /* Bands-rodin er systkini haus-rodarinnar inni i sticky-umgjordinni. */
    const kids = h?.parentElement ? [...h.parentElement.children] : [];
    return kids[kids.indexOf(h) - 1] || null;
  };
  const wpx = el => parseFloat(el.style.width);
  let checked = 0, oneCol = 0; const bad = [];
  for (const g of SCANNED) {
    const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === g.label);
    if (!b) continue;
    await fire(b);
    const brow = bandRowOf(), hrow2 = headerRow();
    if (!brow || !hrow2) { bad.push(`${g.label}: bands-rod eda haus-rod fannst ekki`); continue; }
    /* Fyrstu tvo holfin i bands-rodinni eru frosna nafna-holfid og
       "Today" (fostu dalkarnir); haus-rodin ber thrju (nafn + tveir).  */
    const bcells = [...brow.children].slice(2);
    const hcells = [...hrow2.children].slice(3);
    let i = 0;
    for (const bc of bcells) {
      const label = (bc.textContent || "").trim();
      const want = PLm.bandWidth(label);
      const got = wpx(bc);
      checked++;
      /* (1) heitid rumast — thad er tilkynnta bilunin.                 */
      if (Number.isFinite(got) && got + 0.5 < want)
        bad.push(`${g.label}/"${label}" faer ${got} px en tharf ${want}`);
      /* (2) OG bandid stendur NAKVAEMLEGA yfir sinum dalkum. An thessa
             gaeti hver sem er "lagad" (1) med thvi ad breikka bandid eitt
             og setja hausinn ur samhengi vid tolurnar.                 */
      let sum = 0, n = 0;
      while (i < hcells.length && sum + 0.5 < got) { sum += wpx(hcells[i]); i++; n++; }
      if (n === 1) oneCol++;
      if (Math.abs(sum - got) > 0.5)
        bad.push(`${g.label}/"${label}": band ${got} px en dalkar ${sum} px`);
    }
  }
  ok(`bands-holf maeld a skjanum (${checked})`, checked >= 10);
  ok(`...thar af ${oneCol} EINS-DALKS bond — tilfellid sem klipptist`, oneCol > 0);
  ok(`hvert band rumar heiti sitt OG stendur yfir sinum dalkum (${bad.length} frávik)`,
     bad.length === 0, bad.slice(0, 3).join(" · "));
}

/* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b regla 1).               */
ok(`allir ${SCANNED.length} synilegu flokkarnir voru heimsottir (${scannedGroups})`,
   scannedGroups === SCANNED.length,
   `${scannedGroups} af ${SCANNED.length} — flokkur sem er ekki heimsottur er ekki varinn`);
/* OG SA SEM ER UTUNDAN ER ThAD AF MAELDRI ASTAEDU, EKKI AF ThVI AD HANN
   GLEYMDIST: hver flokkur sem er EKKI skannadur verdur ad eiga NULL synda
   dalka. Vaeri sian of vid faeri flokkur ur vaktun thogult.            */
{
  const skipped = STAT_GROUPS.filter(g => !SCANNED.includes(g));
  ok(`${skipped.length} flokkur utan skonnunar og hann a 0 synda dalka`
     + `${skipped.length ? " (" + skipped.map(g => g.key).join(",") + ")" : ""}`,
     skipped.every(g => tableDefs({ group: g.key }).length === 0));
}
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
   er skonnunin haett ad sja null og fullyrdingarnar ofan eru ordnar tomar.
   ENDURMAELT 17.8.2026 thegar flokka-listinn var leiddur ut (6 flokkar i
   stad 4, 134 dalka-attir i stad 121): talan er ENN 2, somu tveir dalkar.
   Golfid var EKKI faert upp i 2 af nakvaemlega sama tilefni og thad var
   faert nidur ur 3 — thad er anti-tomleika-golf, ekki soguleg mynd.      */
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

/* ============================================================
   ThETTAR RADIR (`≡ compact`) — GREININ SEM ENGINN HAFDI SED

   AF HVERJU HER: thetta safn er thad eina sem SKRUNAR syndarvædda
   listann, og thad HARDKODADI `* 34` i linunni her fyrir ofan — sem er
   nakvaemlega fastinn sem `dense` skiptir ut (34 -> 26).

   MAELT 21.8.2026: strengurinn `dense` — og lykillinn `fpl_dense` —
   kemur fyrir i **ENGRI** skra undir `tests/`. Samt les
   `PlayerList.jsx:1131` `const rowH = dense ? ROW_H_DENSE : ROW_H` og
   thad gildi drifur syndarvæðinguna beint:
       first = floor(scrollTop / rowH) - OVERSCAN
       last  = ceil((scrollTop + viewH) / rowH) + OVERSCAN
   Se `rowH` i utreikningnum ur takt vid haedina sem radirnar eru
   TEIKNADAR i, skrunar notandinn a stad thar sem engar radir eru — eda
   sér radir sem hann skrunadi framhja. Og valid er VISTAD (`fpl_dense`),
   svo hann lendir i ohreinsada astandinu vid HVERJA heimsokn.

   Sama aett og `narrow` (CLAUDE.md kafli 8: "fast false i ollum
   profum"), nema hér var thad `false` af thvi ad enginn smellti.

   STOKKBREYTINGARNAR, OG EIN THEIRRA LIFDI — ThAD VAR UPPLYSING:
     · `top: headH + idx * ROW_H` (utlitid ur takt vid reikninginn) FELLUR
       — millibilid og skrun-stadurinn.
     · `last = ceil((scrollTop+viewH) / ROW_H)` FELLUR HART: **455 af 599**
       rodum urdu aldrei teiknadar. Thad er villan sem raunverulega bitur.
     · `first = floor(scrollTop / ROW_H)` LIFDI — og hun a ad lifa:
       laegri `first` teiknar radir OFAN vid gluggann, svo hun kostar DOM
       en tapar ENGRI rod. Fullyrding sem felldi hana vaeri ad verja
       afkost i dulargervi rettleika.
     · `!narrow && (photo...)` (myndir i thettum rodum) FELLUR.
     · Vistunin: badar hlidar (ritun OG lestur vid nyja hledslu).
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nThETTAR RADIR — `
  + `syndarvæðingin, myndirnar og vistunin\n${"─".repeat(72)}`);
{
  const scroller = [...document.querySelectorAll("div")]
    .find(d => (d.style.overflowY || d.style.overflow || "").includes("auto"));
  ok("skrun-kassinn finnst", !!scroller);
  /* Radirnar liggja absolute a `top = headH + idx*rowH` inni i kassa sem
     er `sorted.length*rowH + headH` har. Baedi eru lesin AF SKJANUM.   */
  /* Skannad AFRAM UR SKRUN-KASSANUM, ekki ur `document` — `bodyRows()`
     gengur hvert einasta div i appinu og thetta er kallad i lykkju.    */
  const rowsWithTop = () => [...(scroller || document).querySelectorAll("div")]
    .filter(d => d.style.position === "absolute" && d.style.top && d.style.height)
    .map(d => ({ el: d, top: parseFloat(d.style.top), h: parseFloat(d.style.height) }))
    .filter(r => Number.isFinite(r.top) && Number.isFinite(r.h))
    .sort((a, b) => a.top - b.top);
  const spacer = () => [...document.querySelectorAll("div")]
    .map(d => ({ d, h: parseFloat(d.style.height) }))
    .filter(x => Number.isFinite(x.h) && x.h > 1000 && x.d.style.position === "relative")
    .sort((a, b) => b.h - a.h)[0] || null;
  const nameOf = r => (r.el.children[0]?.textContent || "").trim();


  const scrollTo = async y => {
    scroller.scrollTop = y;
    await act(async () => { scroller.dispatchEvent(new dom.window.Event("scroll")); });
    await settle();
  };
  await scrollTo(0);

  /* ---- 1. GRUNNASTANDID: 34 px ---- */
  const before = rowsWithTop();
  ok(`forsenda: radir teiknast og eru allar jafn haar (${before.length} radir)`,
    before.length > 10 && new Set(before.map(r => r.h)).size === 1,
    [...new Set(before.map(r => r.h))].join(","));
  const H0 = before[0].h;
  ok(`grunnhaedin er 34 px (fekk ${H0})`, H0 === 34);
  /* MILLIBILID VERDUR AD VERA HAEDIN — annars skarast radir eda gliðna. */
  const gaps0 = before.slice(1).map((r, i) => r.top - before[i].top);
  ok(`millibil radanna = haedin i ollum ${gaps0.length} skrefum`,
    gaps0.every(g => g === H0), [...new Set(gaps0)].join(","));
  const sp0 = spacer();
  ok("innri kassinn ber HEILDARHAEDINA", !!sp0);
  /* Fjoldinn er lesinn af skjanum ("N of M"), ekki gefinn.             */
  const shownTxt = (document.body.textContent || "").match(/(\d+) of (\d+)/);
  const nRows = shownTxt ? +shownTxt[1] : null;
  ok(`radafjoldinn stendur a skjanum (${nRows} af ${shownTxt?.[2]})`, nRows > 100);
  /* Haus-haedin er LEIDD (`sp0.h - nRows*H0`), ekki hardkodud — hun er
     `BAND_H + LABEL_H` og ma breytast. Fullyrdingin er ad hun se HEILL
     haus og hvorki 0 ne rodahaed: annars vaeri "heildarhaedin fylgir"
     nedar tautologia (baedi hlidar leiddar ur somu tolu).              */
  const headH = sp0.h - nRows * H0;
  ok(`heildarhaedin = ${nRows} x ${H0} + haus, og hausinn er raunverulegur `
    + `(${headH} px)`, Number.isInteger(headH) && headH > H0 && headH < 200);
  /* MYNDIN ER 20x25 px (`S.img`) — liðsmerkin eru 11 px og MEGA EKKI
     teljast med (sama gildra sem felldi fyrstu utgafu simaprofsins:
     thad taldi allar <img> og felldi RETTA hegdun).                    */
  const photoImgs = () => [...document.querySelectorAll("img")]
    .filter(i => i.style.height === "25px").length;
  const crestImgs = () => [...document.querySelectorAll("img")]
    .filter(i => i.style.height === "11px" || i.getAttribute("width") === "11").length;
  const photos0 = photoImgs(), crests0 = crestImgs();

  /* ---- 2. SMELLURINN — HEFUR HANN AHRIF? ---- */
  const tgl = [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "≡ compact");
  ok("`≡ compact` er til", !!tgl);
  ok("...og hann er AF i upphafi", tgl.getAttribute("aria-pressed") === "false");
  await fire(tgl);
  ok("aria-pressed kviknar", tgl.getAttribute("aria-pressed") === "true");
  const after = rowsWithTop();
  const H1 = after[0].h;
  ok(`radahaedin fer 34 -> 26 (fekk ${H1})`, H1 === 26);
  const gaps1 = after.slice(1).map((r, i) => r.top - after[i].top);
  ok(`...OG millibilid fylgir med i ollum ${gaps1.length} skrefum`,
    gaps1.every(g => g === H1), [...new Set(gaps1)].join(","));
  ok(`heildarhaedin fylgir lika (${spacer().h} = ${nRows} x ${H1} + ${headH})`,
    spacer().h === nRows * H1 + headH);
  /* Tilgangurinn sjalfur: FLEIRI radir a skja. Textinn a hnappnum lofar
     "um 20 i stad 12", svo talan verdur ad HAEKKA — ekki bara breytast. */
  ok(`fleiri radir i syndarglugganum (${before.length} -> ${after.length})`,
    after.length > before.length);
  /* Myndirnar eru faldar VILJANDI (thaer thurfa haedina) — thad er
     fullyrt her thvi annars vaeri "haedin minnkadi" satt um utlit sem
     klippir andlitin.                                                  */
  const photos1 = photoImgs(), crests1 = crestImgs();
  ok(`andlitsmyndirnar hverfa (${photos0} -> ${photos1})`,
    photos0 > 0 && photos1 === 0, `fyrir=${photos0} eftir=${photos1}`);
  /* ...EN LIDSMERKIN EKKI. Tvo olik atrid, og fyrsta utgafa simaprofsins
     felldi rett hegdun einmitt hér (CLAUDE.md kafli 8).                */
  ok(`...en lidsmerkin eru afram (${crests0} -> ${crests1})`,
    crests1 > 0 && crests1 >= after.length - 4,
    `merki=${crests1} radir=${after.length}`);

  /* ---- 3. SYNDARVAEDINGIN OG HAEDIN MEGA EKKI REKA I SUNDUR ----
     Vid skrunum a stad sem er HEIL rod nidur i listanum og krefjumst
     thess ad rodin sem A ad liggja thar se raunverulega i DOM-inu.
     Se `rowH` i utreikningnum annad en teiknada haedin er thessi rod
     utan gluggans og finnst ekki.                                     */
  let hit = 0, miss = [];
  for (const idx of [40, 120, 260, nRows - 1]) {
    await scrollTo(headH + idx * H1);
    const want = headH + idx * H1;
    const there = rowsWithTop().some(r => r.top === want);
    if (there) hit++; else miss.push(idx);
  }
  ok(`rodin sem liggur a skrun-stadnum er i DOM-inu i ${hit} af 4 stodum`,
    miss.length === 0, `vantar vid idx ${miss.join(",")}`);

  /* ---- 4. FULLKOMNUN: ENGIN ROD MA VERA OSYNILEG ----
     Gengid i skrefum sem eru MINNI en glugginn, svo skorun se trygg, og
     hvert nafn talid. Fari `rowH` ur takt hoppar glugginn yfir radir og
     talan lendir undir `nRows`.                                       */
  {
    const seen = new Set();
    /* SKREFID ER FAST OG LEITT UR HAEDINNI (8 radir), EKKI UR
       `after.length`. Fyrsta utgafan las glugga-staerdina ur DOM-inu og
       thad gerdi PROFID SJALFT ostodugt: stokkbreyting sem stækkar
       gluggann gaf risa-skref, og stokkbreyting sem minnkar hann gaf
       thusundir itrana. Fast skref + hart thak gerir keyrslutimann
       fyrirsjaanlegan og bilunina snogga.                              */
    const step = H1 * 16;
    const total = nRows * H1 + headH;
    const CAP = 200;
    let steps = 0;
    for (let y = 0; y <= total && steps < CAP; y += step, steps++) {
      await scrollTo(y);
      for (const r of rowsWithTop()) seen.add(nameOf(r));
    }
    ok(`skonnunin komst yfir allan listann i ${steps} skrefum (thak ${CAP})`,
      steps < CAP);
    ok(`hver einasta rod var teiknud einhvern tima (${seen.size} af ${nRows})`,
      seen.size === nRows, `vantadi ${nRows - seen.size}`);
  }

  /* ---- 5. VISTUNIN — `fpl_dense` er hringferd ---- */
  ok(`valid er vistad (fpl_dense = "${localStorage.getItem("fpl_dense")}")`,
    localStorage.getItem("fpl_dense") === "1");
  await fire(tgl);
  ok("...og slokknar aftur baedi a skjanum og i geymslu",
    tgl.getAttribute("aria-pressed") === "false"
    && localStorage.getItem("fpl_dense") === "0"
    && rowsWithTop()[0].h === 34);
  /* NY HLEDSLA les geymsluna — annars vaeri "vistad" adeins ritun.     */
  localStorage.setItem("fpl_dense", "1");
  const host2 = document.createElement("div");
  document.body.appendChild(host2);
  const root2 = createRoot(host2);
  await act(async () => { root2.render(React.createElement(App)); });
  await act(async () => { await new Promise(r => setTimeout(r, 400)); });
  await act(async () => {
    [...host2.querySelectorAll("button")].find(b => b.textContent.includes("Player stats"))
      ?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  await settle(150);
  const t2 = [...host2.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "≡ compact");
  ok("ny hledsla kemur upp ThETT thegar fpl_dense = 1",
    t2?.getAttribute("aria-pressed") === "true");
  await act(async () => { root2.unmount(); });
  host2.remove();
  localStorage.removeItem("fpl_dense");
}

console.log(`\nRODUNAR-PROF: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
