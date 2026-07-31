/* ============================================================
   VILLUVORN — profar UTGONGUNA, ekki bara ad kassinn birtist

   Villuvorn sem synir "eitthvad brotnadi" og bydur enga leid ut er skraut.
   Verdmaetid liggur i ThESSU: se vistada astandid (`fpl_planner_v3`)
   orsokin, hrynur appid vid HVERJA hledslu og notandinn hefur enga leid til
   baka nema devtools. Thess vegna er profad:

     1. kassinn birtist i stad hvita skjasins (og bornin teiknast ella)
     2. villuskilabodin sjalf SJAST — annars getur notandinn ekki sagt fra
     3. hreinsunin er TVISTIGA (hun eydir plonun; einn smellur er of naerri)
     4. hun hreinsar `fpl_*` ...
     5. ... EN ALDREI `fpl_lang`. Sa sem hrundi a ensku verdur ad fa ensku
        aftur; annars kastast hann i islensku ofan a hrunid. Thetta er
        undirstada sem er audvelt ad brjota med `localStorage.clear()`.
     6. bædi mal virka (textinn fer gegnum tx())
   ============================================================ */
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
  { url: "https://aronhogni.github.io/Fantasy/", pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
for (const m of ["attachEvent", "detachEvent"])
  if (!(m in dom.window.HTMLElement.prototype))
    dom.window.HTMLElement.prototype[m] = function () {};

const EB = await import("../src/ErrorBoundary.jsx");
const ErrorBoundary = EB.default;
const { clearSavedState } = EB;
const { setLang, t: tx } = await import("../src/i18n.js");

let container = dom.window.document.getElementById("root");
const Boom = () => { throw new Error("logun kjarnagagna ovaent"); };
const Fine = () => React.createElement("p", null, "allt i lagi");

const click = async el => {
  await act(async () => {
    el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
};
async function mount(child) {
  /* FERSKUR container per mount: React vardar vid ef createRoot er kallad
     tvisvar a sama hnut, og vidvorunin faldi profutprentunina.          */
  container.remove?.();
  container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  /* React prentar hverja gripna villu i console.error — thaggad her svo
     utprentun profsins se laesileg. */
  const realErr = console.error;
  console.error = () => {};
  await act(async () => {
    root.render(React.createElement(ErrorBoundary, null, React.createElement(child)));
  });
  console.error = realErr;
  return root;
}
const btn = label => [...container.querySelectorAll("button")]
  .find(b => (b.textContent || "").trim() === label);

/* ---------- 1-2. kassinn og skilabodin ---------- */
console.log("\n=== 1. KASSINN I STAD HVITA SKJASINS ===");
setLang("is");
await mount(Fine);
ok("born teiknast oskert thegar ekkert brestur",
   (container.textContent || "").includes("allt i lagi"));
ok("engin villuvorn synileg tha", !(container.textContent || "").includes("brotnaði"));

await mount(Boom);
const txt = () => container.textContent || "";
ok("villa i render gefur KASSA, ekki tomt tre", txt().includes("Eitthvað brotnaði"),
   txt().slice(0, 60));
ok("skilabod villunnar sjast (svo megi segja fra henni)",
   txt().includes("logun kjarnagagna ovaent"));
ok("role=alert er sett (skjalesarar)",
   !!container.querySelector('[role="alert"]'));

/* ---------- 3. tvistiga hreinsun ---------- */
console.log("\n=== 2. UTGANGAN ER TVISTIGA ===");
ok("fyrsti hnappur er 'Endurhlaða'", !!btn("Endurhlaða"));
const clearBtn = btn("Hreinsa vistaða plönun");
ok("hreinsun er i bodi", !!clearBtn);
ok("EKKI hreinsad i einum smell (enginn 'já'-hnappur fyrirfram)",
   !btn("já — hreinsa og endurhlaða"));
await click(clearBtn);
ok("eftir fyrsta smell birtist stadfesting", !!btn("já — hreinsa og endurhlaða"));
ok("og hun segir HVAD tapast",
   txt().includes("skiptaáætlun") && txt().includes("tungumálið heldur sér"));

/* ---------- 4-5. hvad er hreinsad og hvad EKKI ---------- */
console.log("\n=== 3. HREINSUN: ASTAND FER, TUNGUMAL HELDUR SER ===");
dom.window.localStorage.setItem("fpl_planner_v3", '{"plan":[1,2,3]}');
dom.window.localStorage.setItem("fpl_watch_v1", "[1,2]");
dom.window.localStorage.setItem("fpl_lang", "en");
dom.window.localStorage.setItem("annad_app", "ma ekki hreyfa");
const dropped = clearSavedState();
ok("vistud plonun hreinsud", dom.window.localStorage.getItem("fpl_planner_v3") === null);
ok("adrir fpl_-lyklar lika (nyr lykill verdur ekki utundan)",
   dom.window.localStorage.getItem("fpl_watch_v1") === null, dropped.join(","));
ok("TUNGUMALID HELDUR SER — annars kastast notandinn i islensku ofan a hrunid",
   dom.window.localStorage.getItem("fpl_lang") === "en");
ok("lyklar annarra appa a somu slod eru ohreyfdir",
   dom.window.localStorage.getItem("annad_app") === "ma ekki hreyfa");
ok("hreinsun tholir ad localStorage se ekki til (private mode)", (() => {
  const real = globalThis.localStorage;
  try {
    Object.defineProperty(globalThis, "localStorage", { value: undefined, configurable: true });
    clearSavedState();
    return true;
  } catch { return false; }
  finally { Object.defineProperty(globalThis, "localStorage", { value: real, configurable: true }); }
})());

/* ---------- 6. bædi mal ---------- */
console.log("\n=== 4. TEXTINN FER GEGNUM tx() ===");
setLang("en");
await mount(Boom);
ok("enski kassinn er a ensku", txt().includes("Something broke"), txt().slice(0, 60));
ok("og islenskan er horfin ur honum", !txt().includes("Eitthvað brotnaði"));
ok("hnapparnir lika", !!btn("Reload"), [...container.querySelectorAll("button")]
   .map(b => b.textContent).join(" | "));
setLang("is");

console.log(`\nVILLUVORN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
