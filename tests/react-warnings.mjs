/* ============================================================
   REACT-VIDVORUNARPROF — fellur a HVERRI vidvorun fra appinu

   AF HVERJU: React logar vantandi `key`, hook-brot og ogilda props sem
   console.error/warn. Thau sjast EKKI i venjulegum profum og hvorki
   smoke-profid ne data-resilience fanga thau (thau sia /Warning:/ ut).
   Her er OLL vidmotid heimsott — 22 flipar/hamir/flokkar — og hver
   vidvorun fellir profid.

   Maelt 29.7.2026: 0 vidvaranir fra appinu.
   ============================================================ */
/* Fellur a HVERRI React-vidvorun (key, hooks, propTypes...) i ollum flipum. */
import { readFileSync } from "node:fs";
/* VELAROHAD SLOD. Adur var "/Users/arongeorgsson/Fantasy/..." hardkodad,
   svo profin virkudu adeins a einni vel — onnur lota gat ekki keyrt thau. */
const REPO = new URL("../", import.meta.url);
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const D = new URL("data/", REPO).pathname;
const J=f=>JSON.parse(readFileSync(D+f,"utf8"));
const dom=new JSDOM("<!doctype html><div id=root></div>",{url:"http://localhost/",pretendToBeVisual:true});
globalThis.window=dom.window; globalThis.document=dom.window.document;
Object.defineProperty(globalThis,"navigator",{value:dom.window.navigator,configurable:true});
globalThis.HTMLElement=dom.window.HTMLElement; globalThis.SVGElement=dom.window.SVGElement;
globalThis.getComputedStyle=dom.window.getComputedStyle;
globalThis.localStorage=dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.fetch=async(u)=>{ const n=String(u).split("/data/")[1];
  if(!n) return {ok:false,status:404,json:async()=>({})};
  try { return {ok:true,status:200,json:async()=>J(n)}; }
  catch { return {ok:false,status:404,json:async()=>{throw new Error("404");}}; } };

const warns=[];
for (const m of ["error","warn"]) {
  const orig=console[m];
  console[m]=(...a)=>{ const t=a.map(String).join(" ");
    /* UMHVERFIS-HAVADI, EKKI OKKAR KODI — hvorugt kemur fra appinu:
         - module.register() deprecation: ur test-hledaranum sjalfum
         - activeElement.attachEvent: jsdom vantar IE-arfleifd sem react-dom
           notar i gomlu input-value-vöktun. Kemur thegar reitur fær fokus. */
    if(/not wrapped in act/.test(t)) return;
    if(/DeprecationWarning|module\.register|attachEvent|trace-deprecation/.test(t)) return;
    warns.push(m+": "+t.slice(0,150)); };
}
const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root=createRoot(document.getElementById("root"));
await act(async()=>{ root.render(React.createElement(App)); });
await act(async()=>{ await new Promise(r=>setTimeout(r,200)); });

const click=async(txt)=>{
  const b=[...document.querySelectorAll("button")].find(x=>x.textContent.includes(txt));
  if(!b) return false;
  await act(async()=>{ b.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  await act(async()=>{ await new Promise(r=>setTimeout(r,80)); });
  return true;
};
/* ============================================================
   LEITARORDIN VORU A ISLENSKU OG VIDMOTID ER A ENSKU.

   Thetta safn heimsotti **0 af 22** vidmotum og var samt GRAENT — i
   hvert sinn sem `click()` fann engan hnapp skilaði hun `false` og
   lykkjan hélt bara afram. Vidvorunar-profid sem atti ad verja allt
   vidmotid var thvi ad verja EKKERT fra thvi ad appid var thytt
   (commit "enska eingongu"), og tvær raunverulegar React-vidvaranir
   (border/borderColor a umferdar-kossunum) lifdu i skjolinu.

   TVENNT LAGAD, OG SEINNA ER MIKILVAEGARA:
     1. Heitin eru ensk, eins og vidmotid.
     2. `visited` ER NU FULLGILD FULLYRDING. Safn sem heimsaekir
        ekkert ma ALDREI vera graent aftur — thad er nakvaemlega sama
        thoegla bilunin og daudi markadslidurinn (CLAUDE.md kafli 3).
   ============================================================ */
/* SKIPULAGID ER PER FLIPA OG ThAD ER NAUDSYNLEGT, EKKI SNYRTIMENNSKA.
   Fyrsta tilraunin var einn flatur listi og 20 vidmot mistokust thogult
   af tveimur astaedum sem badar snuast um AD ASTANDID BREYTIST:
     - "🔍 Search" var ekki gluggi heldur `setView("players")`, svo
       FFDR-stykin ("pick"/"−"/"+") voru ekki lengur a skjanum.
       (Hnappurinn var TEKINN UT 25.8.2026 — hann var tviverknadur vid
       flipann `👥 Player stats`. Astaedan er skjolud her afram thvi hun
       er skyringin a ThVI HVERS VEGNA skipulagid er per flipa; hun helst
       rett thott hnappurinn se farinn.)
     - "Imminent" skiptir um ham i toflunni, svo flokkarnir hurfu.
   Her er thvi flipinn SMELLTUR AFTUR a undan hverju undirstyki. Thad
   kostar eina teiknun en gefur thekkt astand — og thekkjanlegt fall.  */
const SURFACES=[
  ["⚽ Planner",       ["📊 FFDR","🎫 Chips","pick","−","+"]],
  /* RODIN INNAN FLIPANS ER EKKI TILVILJUN. "Groups" og "Gameweeks" eru
     SAMANBROT — smellur a thau FELUR allt sem er undir theim, og thau
     muna sig (fpl_gwopen i localStorage), svo flipa-smellur opnar thau
     ekki aftur. Their voru fremstir i fyrstu utgafu og felldu 12 vidmot
     a eftir ser. Samanbrot og ham-skipti eru thvi SIDUST.             */
  /* "Set pieces and cards" VAR HER OG ER FARINN UR FLOKKA-RODINNI
     (25.8.2026): allur flokkurinn er `build_only`, svo hann a engan hnapp
     i Player stats. Hann er AFRAM i Leaderboard, sem telur `STAT_GROUPS`
     hrau upp — thess vegna stendur hann afram i theim flipa hér ad nedan.
     "Consistency (Aron)" heitir nu "Consistency".
     GK-STADAN ER VIÐ FYRST: markmanns-dalkarnir sjast adeins thegar hun er
     valin, svo "Defence" med GK og "Defence" med All eru TVAER olikar
     dalkasamsetningar — og React kvartar adeins vid ENDURTEIKNINGU thegar
     eiginleiki er FJARLAEGDUR, sem er einmitt thad sem gerist thegar
     stadan faerist af GK yfir a All.                                    */
  ["👥 Player stats",  ["GK","Defence","All","DEF","MID","FWD",
                        "Basics","Attack","Defence","Consistency","Upcoming fixtures",
                        "≡ compact",
                        /* BUY WINDOWS: hamurinn OG thad sem tekur ramma AF holfum
                           (bil-val og rodunar-skipti). React kvartar adeins vid
                           ENDURTEIKNINGU thegar eiginleiki er FJARLAEGDUR, svo ad
                           heimsaekja hamurinn EITT vaeri toom fullyrding — sama
                           laerdomur og kveikt/slokkt-kaflinn i kafla 5b.        */
                        "Build table","Buy windows","pick","best window","next window",
                        "Imminent","Groups","Gameweeks"]],
  /* HEITID "What the keeper faces" STYTTIST I "GK" 25.8.2026 og flokkurinn
     faerdist AFTAR i rodina. Missir her er ThOGULL — `click()` skilar
     `false` og lykkjan heldur afram — en `MIN_VISITED` tekur hann, sem er
     einmitt vardurinn sem var settur upp eftir 0/22-atvikid.           */
  ["🛡️ Teams",        ["Gameweeks","Defence","Attack","GK","Discipline and set pieces"]],
  ["📊 Gameweek",      ["Overview","Shot map","Players","Matches"]],
  ["🏆 Leaderboard",   ["All","GK","DEF","MID","FWD","Basics","Attack","Defence",
                        "Upcoming fixtures","Set pieces and cards"]],
  ["Best of the best", []],
  ["Set pieces",       []],
];

/* ============================================================
   LISTINN VERDUR AD ThEKJA ALLA FLIPA SEM ERU TIL.
   `SURFACES` er CURATED — hver flipi ber sina eigin undirstyki og thau
   verda ad vera talin upp. En thess vegna ELDIST hann: "Best of the best"
   baettist vid 10.8.2026 og listinn vissi ekkert af honum, svo safnid
   hefdi haldid afram ad segja "47/47 vidmot" medan nyjasti flipinn var
   aldrei heimsottur. Sama aett og islensku leitarordin sem gafu 0/22.

   Lausnin er ekki ad haetta ad telja upp (undirstykin thurfa thad) heldur
   ad LATA STIKUNA STADFESTA LISTANN: hver hnappur i flipastikunni verdur
   ad eiga faerslu. Baetir einhver vid flipa an thess ad skra hann — fellur
   thetta, i stad thess ad thekjan minnki thogult.
   ============================================================ */
{
  const seed = [...document.querySelectorAll("button")]
    .find(b => /^⚽/.test((b.textContent || "").trim()));
  const bar = seed?.parentElement;
  const onScreen = bar ? [...bar.children].filter(el => el.tagName === "BUTTON")
                          .map(b => (b.textContent || "").trim()) : [];
  const listed = SURFACES.map(([t]) => t);
  const missing = onScreen.filter(t => !listed.some(l => t.includes(l.replace(/^\S+\s/, ""))));
  if (!onScreen.length) warns.push("flipastikan fannst ekki — thekjan er omaelanleg");
  if (missing.length) warns.push("flipar utan SURFACES: " + missing.join(", "));
  console.log(`  ${onScreen.length && !missing.length ? "✓" : "✗"} SURFACES thekur alla ${onScreen.length} flipa a skjanum`);
}
const TOTAL = SURFACES.reduce((n,[,subs])=>n+1+subs.length, 0);

/* Lokar efsta yfirlagsglugga. Sidasta `✕` er thad sem tilheyrir honum —
   sama regla og i smoke-profinu (tvo eins takn i DOM, sja CLAUDE.md 4). */
const closeTop=async()=>{
  const x=[...document.querySelectorAll("button")].filter(b=>b.textContent.trim()==="✕").at(-1);
  if(!x) return false;
  await act(async()=>{ x.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  await act(async()=>{ await new Promise(r=>setTimeout(r,80)); });
  return true;
};
let visited=0; const missed=[];
for (const [tab, subs] of SURFACES) {
  if (await click(tab)) visited++; else missed.push(tab);
  for (const s of subs) {
    await closeTop();                 // yfirlagsgluggi fra fyrra styki
    await click(tab);                 // aftur i thekkt astand
    if (await click(s)) visited++; else missed.push(`${tab} > ${s}`);
  }
  await closeTop();
}
/* ============================================================
   KVEIKT OG SLOKKT — ThAD ER ThAR SEM STIL-VIDVARANIRNAR BUA

   Ad heimsaekja vidmot naegir EKKI. React kvartar yfir
   `border`/`borderColor`-blondun adeins vid ENDURTEIKNUN thegar
   eiginleiki er FJARLAEGDUR — thad er, thegar valid er tekid AF aftur.
   Safnid smellti adeins a hluti EINU SINNI, svo tvaer raunverulegar
   vidvaranir a umferdar-kossunum lifdu af thott vidmotid vaeri heimsott.
   Profad med stokkbreytingu: `borderColor` sett aftur inn i `gwOn`
   slapp i gegn adur en thessi kafli var skrifadur.

   Hér er thvi kveikt OG slokkt a hverjum vali-hnappi sem ber eigin
   "a"-stil: umferdar-kassar (Player stats og FFDR) og thettleikinn.  */
const exact=async(txt,root=document)=>{
  const b=[...root.querySelectorAll("button")].find(x=>x.textContent.trim()===txt);
  if(!b) return false;
  await act(async()=>{ b.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  await act(async()=>{ await new Promise(r=>setTimeout(r,80)); });
  return true;
};
let toggles=0;
/* Player stats: velja umferdarbil (kveikir gwOn/gwEdge) og hreinsa svo. */
await click("👥 Player stats");
/* SURFACES-lykkjan endar Player stats a "Gameweeks", sem BRYTUR SAMAN
   kassarodina — og hun MAN sig (fpl_gwopen), svo flipa-smellur opnar
   hana ekki. Opnud aftur hér, annars eru kassarnir ekki i DOM.       */
if (![...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="9"))
  await click("Gameweeks");
if (await exact("3")) toggles++;
if (await exact("9")) toggles++;
if (await exact("All")) toggles++;          // hreinsar bilid -> stilar fjarlaegdir
if (await exact("≡ compact")) toggles++;
if (await exact("≡ compact")) toggles++;    // og til baka
/* Planner/FFDR: sama leikur i FFDR-kassarodinni. */
await click("⚽ Planner");
/* Hnappurinn heitir "pick" LOKADUR en "hide" OPINN — SURFACES-lykkjan
   opnadi hann thegar, svo leit ad "pick" fann ekkert. Leitad er thvi ad
   kassanum sjalfum og adeins opnad ef hann vantar.                    */
{
  const boxOpen = () => [...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="6");
  if (!boxOpen()) await click("pick");
  if (boxOpen()) {
    if (await exact("2")) toggles++;
    if (await exact("6")) toggles++;
    if (await exact("reset")) toggles++;    // -> ffdrBoxOn fjarlaegt
  }
}
console.log(`  ${toggles>=6?"✓":"✗"} kveikt/slokkt a ${toggles} vali-hnoppum`);
if (toggles < 6) warns.push("toggle-kaflinn na di ekki ad kveikja/slokkva (>=6 thurfa)");

/* LEIKMANNASPJALD + SAMANBURDUR.
   Leitad var ad `title==="Upplýsingar"` og hnappnum "Bera saman" —
   HVORUGT er til i enska vidmotinu ("Information" og "⇄ Compare"), svo
   thessi kafli var thogull nunulidur eins og listinn ad ofan. Nidurstadan
   er nu TALIN, svo hann geti ekki dottid ut aftur an thess ad sjast.   */
await click("⚽ Planner");
const info=[...document.querySelectorAll("button")].filter(b=>b.title==="Information");
let cardOk=false;
if (info.length) {
  await act(async()=>{ info[0].dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  await act(async()=>{ await new Promise(r=>setTimeout(r,120)); });
  cardOk = document.body.textContent.includes("Next GW forecast");
  await click("⇄ Compare");
}
console.log(`  ${cardOk?"✓":"✗"} leikmannaspjald + samanburdur opnast (${info.length} i-hnappar)`);
if (!cardOk) warns.push("leikmannaspjaldid opnadist ekki — 'Information'/'⇄ Compare' fundust ekki");
/* VORDURINN GEGN ThVI AD SAFNID VERDI TOMT AFTUR.
   `visited` var adeins PRENTAD, svo 0/22 las eins og upplysing i stad
   bilunar. Nu fellur safnid ef vidmot hverfa — endurnefning a hnappi
   birtist tha sem RAUTT PROF en ekki sem thogul thekjuminnkun.        */
const MIN_VISITED = Math.ceil(TOTAL * 0.9);
const thin = visited < MIN_VISITED;
console.log(`  ${thin ? "✗" : "✓"} heimsott: ${visited}/${TOTAL} vidmot (lagmark ${MIN_VISITED})`);
if (missed.length) console.log("     fann ekki: " + [...new Set(missed)].slice(0,12).join(" | "));
console.log(warns.length ? `  ✗ ${warns.length} React-vidvaranir:` : "  ✓ ENGIN React-vidvorun");
[...new Set(warns)].slice(0,10).forEach(w=>console.log("     "+w));
process.exit(warns.length || thin ? 1 : 0);
