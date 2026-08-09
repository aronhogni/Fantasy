/* ============================================================
   nfl-render.mjs — EINA PROFID SEM SER HVITAN SKJA.

   Keyrt med jsx-loader: sja `SUITES` i run-tests.mjs.

   HVERS VEGNA THETTA ER TIL: `npm run build` var GRAEN medan
   FPL-appid syndi hvitan skja — thattari leysir ekki nofn. Sama
   gildir hér, og enn frekar thvi NFL-appid er sex flipar sem allir
   hlada sinum eigin gognum. Flipi sem enginn opnar i profi er flipi
   sem enginn veit hvort virkar.

   PROFID KREFST MARKTAEKS INNIHALDS, ekki bara ad DOM se ekki tomt.
   "Rendered without throwing" er ekki thad sama og "syar tolur":
   flipi sem birtir 40 strik thar sem tolur eiga ad vera fellur ekki
   a undantekningu en er jafn onothaefur og hrun.
   ============================================================ */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data-nfl");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

if (!existsSync(path.join(DATA, "players.json"))) {
  console.log("  data-nfl/players.json vantar — keyrdu scripts/nfl/fetch-nfl.mjs");
  process.exit(1);
}

/* ---------- jsdom + fetch af diski ---------- */
const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>",
  { url: "https://example.test/nfl.html", pretendToBeVisual: true });

global.window = dom.window;
global.document = dom.window.document;
/* `navigator` er getter-only a globalThis i Node 26 — verdur ad
   skilgreina, ekki setja. Sama sniglahus og i `smoke.test.mjs`. */
Object.defineProperty(globalThis, "navigator",
  { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.localStorage = dom.window.localStorage;
global.confirm = () => false;
global.location = dom.window.location;

/* Hermdur `fetch` sem les `data-nfl/` af diski. Sleeper-kollur eru
   EKKI hermdir — their eiga adeins ad gerast thegar notandi biður
   um thad, og ef profid faer theim svar vaeri thad ad profa hermuna
   frekar en appid. Their skila 500 og appid a ad tholla thad. */
let sleeperCalls = 0;
global.fetch = async (url) => {
  const s = String(url);
  if (s.includes("api.sleeper")) {
    sleeperCalls++;
    return { ok: false, status: 500, json: async () => ({}) };
  }
  const m = s.match(/data-nfl\/(.+)$/);
  if (!m) return { ok: false, status: 404, json: async () => ({}) };
  const f = path.join(DATA, m[1]);
  if (!existsSync(f)) return { ok: false, status: 404, json: async () => ({}) };
  const body = JSON.parse(readFileSync(f, "utf8"));
  return { ok: true, status: 200, json: async () => body };
};

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
global.IS_REACT_ACT_ENVIRONMENT = true;

const App = (await import("../src-nfl/App.jsx")).default;

const root = createRoot(document.getElementById("root"));
const settle = async (ms = 60) => {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)); });
};

await act(async () => { root.render(React.createElement(App)); });
await settle(400);

const text = () => document.body.textContent || "";
const clickTab = async (label) => {
  const btns = [...document.querySelectorAll("button.tab")];
  const b = btns.find((x) => (x.textContent || "").includes(label));
  if (!b) return false;
  await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle(400);
  return true;
};

/* ---------- 1. RAESING ---------- */
console.log("\n1. raesing");
{
  ok(!text().includes("Something broke"), "villuvornin greip ekki — appid raesist");
  ok(!/Loading…$/.test(text().trim()), "kominn framhja hledslu");
  ok(text().includes("NFL Fantasy"), "hausinn birtist");
  ok(/20\d\d/.test(text()), "timabil birtist i hausnum");
}

/* ---------- 2. HVER FLIPI BER MARKTAEKT INNIHALD ----------
   Krafan er TOLUR, ekki bara ad ekkert hrundi. Flipi sem birtir
   eintom strik fellur ekki a undantekningu en er jafn gagnslaus. */
const digitsIn = (t) => (t.match(/\d/g) || []).length;
const dashesIn = (t) => (t.match(/—/g) || []).length;

console.log("\n2. draft-flipinn");
{
  ok(text().includes("Positional scarcity"), "skortstadan birtist");
  /* TILLAGAN SJALF — thad sem allar tolurnar eru til fyrir. */
  ok(/Pick \d+ — take this/.test(text()), "tillagan fyrir naesta val birtist");
  ok(/Lasts\?/.test(text()), "lifunarlikur eru birtar");
  ok(/standard deviation/i.test(text()),
    "og thad er sagt ad dreifing ADP se notud, ekki bara ADP");
  ok(text().includes("Connect your Sleeper draft"), "draft-tengingin birtist");
  const rows = document.querySelectorAll("table.data tbody tr");
  ok(rows.length > 50, `bordid ber ${rows.length} leikmenn`);
  ok(digitsIn(text()) > 400, `marktaekt magn talna (${digitsIn(text())})`);
  /* Fleiri tolur en strik — annars er taflan tom i reynd. */
  ok(digitsIn(text()) > dashesIn(text()) * 2,
    `tolur eru fleiri en strik (${digitsIn(text())} vs ${dashesIn(text())})`);
  ok(sleeperCalls === 0, "engin Sleeper-koll an thess ad notandi bidji um thad");
}

console.log("\n3. players-flipinn");
{
  ok(await clickTab("Players"), "flipinn finnst");
  ok(!text().includes("Something broke"), "engin villa");
  const rows = document.querySelectorAll("table.data tbody tr");
  ok(rows.length > 50, `taflan ber ${rows.length} radir`);
  ok(text().includes("VBD"), "VBD-dalkurinn birtist");
  const heads = [...document.querySelectorAll("table.data thead tr.cols th")];
  ok(heads.length >= 10, `${heads.length} dalkar i haus`);
  /* HVER DALKUR BER `note` — dalkur an skyringar er tala sem enginn
     getur metid. Hausinn ber hana sem `title`. */
  ok(heads.every((h) => h.getAttribute("title") || h.textContent.trim() === ""),
    "hver dalkahaus ber skyringu (title)");
}

console.log("\n4. experts-flipinn");
{
  ok(await clickTab("Experts"), "flipinn finnst");
  ok(!text().includes("Something broke"), "engin villa");
  const t = text();
  const measured = t.includes("Random baseline");
  ok(measured || t.includes("has not been run"),
    "annadhvort maelingin eda skyr yfirlysing um ad hun vanti");
  if (measured) {
    /* NULLDREIFINGIN VERDUR AD STANDA OFAN VID LISTANN. Listi an
       hennar er sannfaerandi hvort sem hann maelir haefni eda heppni. */
    ok(t.includes("Random baseline"), "nulldreifingin birtist");
    ok(t.includes("Beat random"), "hlutfallid sem slaer handahof birtist");
    ok(t.indexOf("Random baseline") < t.indexOf("Draft pts"),
      "og hun stendur A UNDAN stigatoflunni, ekki i nedanmalsgrein");
    const rows = document.querySelectorAll("table.data tbody tr");
    ok(rows.length > 10, `${rows.length} serfraedingar i toflu`);
  }
}

console.log("\n4a. market-flipinn");
{
  ok(await clickTab("Market"), "flipinn finnst");
  ok(!text().includes("Something broke"), "engin villa");
  const t = text();
  ok(t.includes("Softest defences") || t.includes("did not load"),
    "annadhvort markadstoflurnar eda skyr yfirlysing um ad thaer vanti");
  if (t.includes("Softest defences")) {
    ok(t.includes("Toughest defences"), "badar attir birtar");
    const rows = document.querySelectorAll("table.data tbody tr");
    ok(rows.length >= 30, `${rows.length} lid i markadstoflunni`);
    /* VARNAGLINN VERDUR AD FYLGJA TOLUNNI. "Stig a sig" an thess ad
       segja ad thad se OSUNDURLIDAD eftir stodu vaeri ad selja hana
       sem meira en hun er. */
    ok(/not.{0,20}broken down by position/i.test(t),
      "og notan um ad talan se ekki sundurlidud eftir stodu");

    /* 20-ARA MAELINGIN VERDUR AD VERA ADGENGILEG UR SAMA FLIPA.
       Flipi sem synir markadstolur an thess ad segja hvad thaer eru
       virdi selur their sem meira en thaer eru. */
    const chips = [...document.querySelectorAll("button.chip")];
    const hist = chips.find((c) => (c.textContent || "").includes("actually work"));
    ok(!!hist, "flipinn 'does it actually work' er til");
    if (hist) {
      await act(async () => {
        hist.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      });
      await settle(400);
      const h = text();
      ok(/player-weeks/i.test(h), "20-ara urtakid birtist");
      ok(/0\.\d\d%/.test(h), "lyftingin er birt sem prosenta");
      ok(/tiny/i.test(h), "og thad er SAGT ad hun se orsma");
      ok(/receivers do not care/i.test(h), "WR-nidurstadan stendur");
    }
  }
}

console.log("\n4b. model-lab-flipinn");
{
  ok(await clickTab("Model lab"), "flipinn finnst");
  ok(!text().includes("Something broke"), "engin villa");
  const t = text();
  const live = t.includes("A-Ranking") && !t.includes("have not been generated");
  ok(live || t.includes("have not been generated"),
    "annadhvort maelingarnar eda skyr yfirlysing um ad thaer vanti");
  if (live) {
    /* FULLYRDINGIN OG VARNAGLINN VERDA AD STANDA SAMAN. Tafla sem
       segir "+228" an thess ad segja "fjogur timabil" er ad selja
       meira en hun maeldi. */
    ok(t.includes("vs ADP"), "samanburdurinn vid ADP birtist");
    ok(t.includes("vs Sleeper"), "og vid Sleeper");
    /* TVAER FULLYRDINGAR MED OLIKAN STYRK VERDA AD SJAST SEM TVAER.
       Fyrri utgafa vidmotsins sagdi "+228 gegn ADP OG +55 gegn
       Sleeper, vinnur oll arin" i einum andardraetti, eins og badar
       hefdu sama styrk. Su fyrri er maeld; su sidari er von i PPR. */
    ok(/Two claims, and they are not equally strong/i.test(t),
      "vidmotid adgreinir fullyrdingarnar tvaer");
    ok(/Against ADP this holds/i.test(t), "og segir hvor stenst");
    ok(/does not, yet/i.test(t), "og hvor gerir thad ekki");
    ok(/thirteen seasons/i.test(t),
      "og hvad thyrfti til: threttan timabil");
    ok(/head to head/i.test(t) || /Head to head/.test(t),
      "beina einvigid birtist");
    ok(/sign test/i.test(t), "og teknaprofid med p-gildi");
    ok(/higher correlation is not the same/i.test(t),
      "og notan um ad haerri fylgni se ekki betri akvordun");
    const rows = document.querySelectorAll("table.data tbody tr");
    ok(rows.length > 8, `${rows.length} rodun i samanburdi`);
  }
}

console.log("\n5. schedule-flipinn");
{
  ok(await clickTab("Schedule"), "flipinn finnst");
  ok(!text().includes("Something broke"), "engin villa");
  ok(/schedule/i.test(text()), "leikjaskrain birtist");
  const rows = document.querySelectorAll("table.data tbody tr");
  ok(rows.length >= 10, `${rows.length} leikir i vikunni`);
  ok(text().includes("Bye weeks"), "bye-vikur birtast");
}

console.log("\n6. sources-flipinn");
{
  ok(await clickTab("Sources"), "flipinn finnst");
  ok(!text().includes("Something broke"), "engin villa");
  const t = text();
  ok(t.includes("Data sources"), "heimildaskrain birtist");
  const rows = document.querySelectorAll("table.data tbody tr");
  ok(rows.length > 10, `${rows.length} heimildir skradar`);
  /* KVORDUNIN VERDUR AD STANDA. Notandi sem ser ad varnarlidurinn
     baetir 0,13% ofmetur hann ekki. */
  ok(t.includes("Calibration"), "kvordunin birtist");
  ok(t.includes("0.13%"), "og hun segir hve LITLU varnarlidurinn raedur");
  ok(t.includes("not distinguishable from zero"),
    "og ad WR-teygnin se ekki marktaek");
}

/* ---------- 7. ENGIN ISLENSKA I VIDMOTINU ----------
   Vidmotid er enskt og bara enskt, eins og i FPL-appinu (kafli 9).
   Athugasemdir i koda mega vera islenskar — thaer rata ekki i DOM. */
console.log("\n7. vidmotid er enskt");
{
  await clickTab("Draft");
  let all = "";
  for (const tab of ["Draft", "Players", "Experts", "Schedule", "Sources"]) {
    await clickTab(tab);
    all += " " + text();
  }
  const icelandic = all.match(/[þðæöáéíóúýÞÐÆÖÁÉÍÓÚÝ]/g) || [];
  ok(icelandic.length === 0,
    `engir islenskir stafir i DOM (fann ${icelandic.length}: ${[...new Set(icelandic)].join("")})`);

  /* ASCII-islenska er OSYNILEG fyrir stafa-skynjun — sama gildra og
     kafli C i `no-icelandic.mjs`. Listinn er ordmyndir sem eru
     islenskar en bera enga enska merkingu. */
  const words = ["leikmadur", "leikmenn", "serfraedingur", "serfraedingar",
    "vidmot", "gogn", "maeling", "maelt", "urtak", "threp", "rodun",
    "utkoma", "villa", "heimild", "timabil", "stada", "sokn", "vorn"];
  const found = words.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(all));
  ok(found.length === 0, `engin ASCII-islenska i DOM (${found.join(", ") || "hrein"})`);
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
