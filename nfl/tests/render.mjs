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
const DATA = path.join(ROOT, "data");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

if (!existsSync(path.join(DATA, "players.json"))) {
  console.log("  data/players.json vantar — keyrdu scripts/fetch-nfl.mjs");
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

/* Hermdur `fetch` sem les `data/` af diski. Sleeper-kollur eru
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
  const m = s.match(/\/data\/(.+)$/);
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

const App = (await import("../src/App.jsx")).default;

const root = createRoot(document.getElementById("root"));
const settle = async (ms = 60) => {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)); });
};

await act(async () => { root.render(React.createElement(App)); });
await settle(400);

const text = () => document.body.textContent || "";
  /* FALDIR FLIPAR (12.8.2026): sex flipar eru ekki i DOM fyrr en
     "More" er smellt. Their eru afram virkir — thad var birtingar-
     akvordun, ekki likans-akvordun — svo prófid a ad OPNA thá, ekki
     ad sleppa theim. Vaeri theim sleppt hyrfi thekjan thogult og
     safnid yrdi graent an ad heimsaekja neitt.
     `revealTabs` er ohaett ad kalla oft: hnappurinn er horfinn eftir
     fyrsta smell. */
  const revealTabs = async () => {
    const more = [...document.querySelectorAll("button.tab")]
      .find((x) => /More/.test(x.textContent || ""));
    if (!more) return;
    await act(async () => {
      more.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    await settle(400);
  };
const clickTab = async (label) => {
  await revealTabs();
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
  /* ============================================================
     URSKURDURINN VERDUR AD NEFNA MANN — OG RETTA MANNINN.
     ============================================================
     "Pick N — take this" stod i profinu adur og THAD EITT er
     fullyrding sem hausinn einn uppfyllir: hann er fastur strengur og
     stendur thott enginn leikmadur se nefndur. Her er lesid nafnid
     sjalft af skjanum og borið vid efstu rod rokstudningsins.

     Og athugid: `textContent` i jsdom ber LIKA innihald sem er lokad
     inni i <details>, svo fullyrdingarnar her fyrir nedan (Lasts?,
     standard deviation) segja EKKERT um hvort thaer seu synilegar.
     Thess vegna er urskurdurinn lesinn ur sinu eigin element. */
  const vEl = document.querySelector(".verdict .verdict-name b");
  ok(vEl && vEl.textContent.trim().length > 2,
    `urskurdurinn nefnir mann ("${vEl ? vEl.textContent.trim() : "ekkert"}")`);
  const vWhy = document.querySelector(".verdict .verdict-why");
  ok(vWhy && vWhy.textContent.trim().length > 10,
    "og segir i einni setningu hvers vegna");

  /* Sami madur og efst i maelda listanum. Vaeri urskurdurinn tekinn
     annars stadar fra vaeri hann annad likan an thess ad nokkud
     brotni — og THAD er villan sem thetta prof er til fyrir. */
  const firstRow = document.querySelector(".reasoning table.data tbody tr td.frozen");
  ok(firstRow && firstRow.textContent.includes(vEl.textContent.trim()),
    `urskurdurinn er efsti madur rokstudningsins ("${firstRow ? firstRow.textContent.trim() : "—"}")`);

  /* Rokin eru TIL en LOKUD. Badar attir skipta mali: opid <details>
     vaeri gamla utlitid aftur, og ekkert <details> vaeri orakli. */
  const det = document.querySelector("details.reasoning");
  ok(det && !det.open, "rokstudningurinn er til stadar en lokadur");
  ok(det && det.querySelector("summary"),
    "og hann hefur smellanlegan haus");

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

  /* ============================================================
     STAERDARGRADA — VILLAN SEM ENGIN FULLYRDING GAT SED
     ============================================================
     ÞETTA VANTADI OG THAD ER SKRIFAD BERUM ORDUM: spanni a bordinu maetti
     margfalda med 17 og hvert einasta prof helst graent. Þau spyrja um
     ROD ("RB0 hefur haerra VBD en QB0"), um TENGSL ("urskurdurinn er
     efsti madur rokstudningsins"), um FJOLDA ("meira en 50 rodir",
     "meira en 400 tolustafir") og um NULL. Ekkert theirra spyr hvort
     talan se AF RETTRI STAERD — og skala-villa heldur rodinni obreyttri,
     svo hun laumast gegnum thau oll.

     ÞETTA ER LESID AF SKJANUM, EKKI UT UR `buildRows`. Anker sem kallar
     sama fall og appid er ad bera formuluna vid sjalfa sig; hér er lesid
     ur toflunni sem notandinn ser, thvi thad er thar sem skalinn getur
     tapast (sniðun, /90-deiling, umreikningur milli stigagjafa).

     MORKIN ERU LIFFRAEDILEG, EKKI BOKAD DAGSGILDI. Efsti madur mældist
     331,4 stig 16.8.2026 og su tala REKUR i hverri daglegri keyrslu —
     bokud vaeri hun rong innan vikunnar (sama lexia og K/DST-tolurnar i
     `model.js`). 120-600 er thad sem heilt NFL-timabil getur borid i
     hvada sniði sem er. 17x villa gefur 5.634 og fellur; 1/17 gefur 19,5
     og fellur lika — fullyrdingin er TVIHLIDA.                        */
  {
    const boardTable = [...document.querySelectorAll("table.data")]
      .find((t) => /Bye/.test(t.querySelector("thead")?.textContent || "")) || null;
    const head = [...(boardTable?.querySelectorAll("thead th") || [])]
      .map((th) => (th.textContent || "").trim());
    const iVbd = head.indexOf("VBD"), iProj = head.indexOf("Proj");
    ok(iVbd > 0 && iProj > 0,
      `dalkarnir VBD og Proj finnast i hausnum (${iVbd}, ${iProj})`);

    const trs = [...(boardTable?.querySelectorAll("tbody tr") || [])];
    const cellNum = (tr, i) => Number((tr?.querySelectorAll("td")[i]?.textContent || "").trim());
    const proj = cellNum(trs[0], iProj), vbd = cellNum(trs[0], iVbd);
    ok(Number.isFinite(proj) && proj >= 120 && proj <= 600,
      `efsti madur ber spa af NFL-staerd (${proj} stig, mork 120-600)`);
    /* VBD er MISMUNUR og thvi minni tala — en hann fylgir sama skala,
       svo hann fellur med spanni ef skalinn brenglast. */
    ok(Number.isFinite(vbd) && vbd >= 30 && vbd <= 400,
      `og VBD hans er af somu staerdargradu (${vbd}, mork 30-400)`);
    /* Og rodin er raunverulega efst — annars vaeri thetta ad maela
       einhverja rod, ekki thá sem bordid setti fremst. */
    const vbd2 = cellNum(trs[1], iVbd);
    ok(Number.isFinite(vbd2) && vbd2 <= vbd,
      `og rod 2 er ekki haerri (${vbd2} <= ${vbd})`);
  }

  /* GRUNNUR SHARP Δ ER SAGDUR A SKJANUM. `sharpDelta` er PPR-ECR minus
     skorpu rod (sja `model.mjs` kafla 8c) medan ECR-dalkurinn fylgir
     stigagjof deildarinnar — i standard snyst formerkid vid a 17 af topp
     60. Talan er rett; thognin var thad ekki. */
  ok(/measured against the PPR consensus/i.test(text()),
    "grunnur Sharp Delta (PPR) er sagdur a draft-bordinu");
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

/* ============================================================
   4b. "WHERE THEY DISAGREE" — UNDIRFLIPINN SEM ENGINN OPNADI
   ============================================================
   Kafli 4 her ofan opnar Experts-flipann en LENDIR ALLTAF a
   `tab === "board"`, svo helmingurinn af flipanum var oprofadur —
   sama aett og `pros-render.mjs` i FPL-verkefninu, thar sem almenna
   profid hitti alltaf a toma astandid.

   OG I SKJOLINU LIFDI RONG SETNING. Panillinn sagdi ad skorpu
   hopurinn vaeri "boards that finished above the 95th percentile of
   the random baseline" — sem er VARALEIDIN (`rule: "single-season"`),
   ekki reglan sem er i notkun (`rule: "career"`). Textinn lysti thvi
   ODRU vali en bordid notadi, i flipanum sem er TIL THESS ad bera
   varnaglana.

   PROFID BER DOM VID OHADA UTREIKNINGU, ekki vid hardkodadan streng:
   `buildSharpBoard` er kollud her ur SOMU gognum og appid les, og
   krafan er ad talan a skjanum se SU TALA. Vaeri strengurinn
   hardkodadur myndi profid halda afram ad standa thott reglan
   breyttist — thad er nakvaemlega villan sem var verid ad laga.

   URTAKSSTAERDIN ER KRAFA AF THVI AD HUN ER BINDANDI I AGUST: 15 eru
   valdir en adeins their sem hafa BIRT bord i ar telja (7 af 15 maelt
   17.8.2026). Tafla sem heitir "sharp" og hvilir a sjo bordum a ad
   segja thad sjalf.
   ============================================================ */
console.log("\n4b. experts — 'where they disagree'");
{
  ok(await clickTab("Experts"), "flipinn finnst");
  const chips = [...document.querySelectorAll("button.chip")];
  const dis = chips.find((c) => (c.textContent || "").includes("disagree"));
  ok(!!dis, "undirflipinn 'Where they disagree' er til");
  if (dis) {
    await act(async () => {
      dis.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    await settle(400);
    const t = text();
    ok(!t.includes("Something broke"), "engin villa");

    /* OHAD UTREIKNINGUR A SANNLEIKANUM — sama funktion sem bordid notar. */
    const { buildSharpBoard } = await import("../src/build.js");
    const acc = JSON.parse(readFileSync(path.join(DATA, "accuracy.json"), "utf8"));
    const exp = JSON.parse(readFileSync(path.join(DATA, "experts.json"), "utf8"));
    const S = buildSharpBoard(acc, exp);

    if (!S.measured) {
      ok(/No sharp board is available/.test(t),
        "an skorpu bords er thad SAGT, ekki synt tomt");
    } else {
      /* Fyrst er STADFEST ad panillinn se a skjanum — annars vaeri hver
         neikvaed fullyrding her a eftir TOM (CLAUDE.md 5b: `!includes(X)`
         er einskis virdi nema `includes(X)` hafi verid synt adur). */
      ok(/Sharp boards vs the consensus/.test(t), "panillinn er a skjanum");

      /* URTAKSSTAERDIN, OG HUN VERDUR AD VERA RETTA TALAN. */
      const m = t.match(/This rests on\s*(\d+)\s*boards?\s*of the\s*(\d+)\s*experts/);
      ok(!!m, "urtaksstaerdin er sogd berum ordum");
      if (m) {
        ok(Number(m[1]) === S.count,
          `bordafjoldinn a skjanum er sa raunverulegi (${m[1]} = ${S.count})`);
        ok(Number(m[2]) === S.ids.length,
          `og valda mengid lika (${m[2]} = ${S.ids.length})`);
      }

      /* REGLAN SEM ER SOGD VERDUR AD VERA REGLAN SEM VAR NOTUD. Baðar
         greinar eru profadar gegn `S.rule`, svo hvorug getur stadid
         thegar hin er i gildi. */
      if (S.rule === "career") {
        ok(/median accuracy percentile/.test(t) && /4 or more/.test(t),
          "ferils-reglan er sogd (midgildi percentila, >= 4 ar)");
        ok(!/95th percentile/.test(t),
          "og varaleidin er EKKI sogd (hun VAR thad — villan sem var logud)");
      } else {
        ok(/95th percentile/.test(t), "varaleidin er sogd thegar hun er i gildi");
        ok(!/median accuracy percentile/.test(t), "og ferils-reglan er thad EKKI");
      }

      /* Og taflan sjalf ber tolur, ekki eintom strik. */
      const drows = [...document.querySelectorAll("table.data tbody tr")];
      ok(drows.length >= 10, `${drows.length} leikmenn i osaettis-toflunni`);
      ok(digitsIn(drows.slice(0, 10).map((r) => r.textContent).join("")) > 20,
        "og hun ber raunverulegar tolur");
    }
  }
}

console.log("\n3b. my-team-flipinn");
{
  ok(await clickTab("My team"), "flipinn finnst");
  ok(!text().includes("Something broke"), "engin villa");
  const t = text();
  /* An hops a flipinn ad SEGJA thad, ekki syna tomt bord. */
  ok(/No roster yet|Start these/.test(t),
    "annadhvort byrjunarlid eda skyr yfirlysing um ad hop vanti");
  ok(/Load my league/.test(t), "Sleeper-tengingin er til stadar");
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
