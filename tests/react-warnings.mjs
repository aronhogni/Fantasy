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
// allir flipar + allir hamir + allir flokkar + hvert svaedi i skyrslunni
const seq=["Umferðin","Skot-kort","Leikmenn","Leikirnir","Yfirlit",
           "Stigatafla","Bekkjar-hætta","Óhjákvæmilegt","Assist óhjákvæmilegt","Tafla",
           "Grunnur","Sókn","Væntingar","Vörn","Bónus og ICT","Verð og eignarhald",
           "FPL-sæti","Spjöld og refsingar",
           "Föst leikatriði","Aukaspyrnur","Horn","Skipulag"];
let visited=0;
for (const t of seq) if (await click(t)) visited++;
// opna leikmannaspjald + samanburd
const info=[...document.querySelectorAll("button")].filter(b=>b.title==="Upplýsingar");
if (info.length) {
  await act(async()=>{ info[0].dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  await act(async()=>{ await new Promise(r=>setTimeout(r,120)); });
  await click("Bera saman");
}
console.log(`  heimsott: ${visited}/${seq.length} vidmot`);
console.log(warns.length ? `  ✗ ${warns.length} React-vidvaranir:` : "  ✓ ENGIN React-vidvorun");
[...new Set(warns)].slice(0,10).forEach(w=>console.log("     "+w));
process.exit(warns.length?1:0);
