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

  /* ============================================================
     ÞEIR SEM SPILA EKKI — LESID AF SKJANUM
     ============================================================
     `tests/advice.mjs` kafli 14 ver REGLUNA og ad `DraftBoard` sendi
     `avail` afram. Hvorugt segir ad ThAD SJAIST. Villan sem var —
     Kittle med PUP og "+5,4 umferdir" GRAENT a somu rod — var
     BIRTINGAR-villa jafnt sem rokvilla, og hun var a skjanum.

     Þrjar fullyrdingar, hver a sinu lagi:
       (a) kassinn NEFNIR tha, med stodu; ad sia thegjandi vaeri
           radgjof sem ekki er haegt ad vera osammala
       (b) enginn theirra er i rokstudningnum (og "enginn" er marktaekt
           adeins thvi (a) sannadi ad their eru til — sja CLAUDE.md 5b).
           OG ThESSI ER VEIK, ThAD ER MAELT OG ThAD ER SAGT: skjarinn ber
           adeins EFSTU FIMM, svo hun getur ekki fallid nema sidumadur
           komist i toppinn. Stokkbreyting (`for (const p of playable)`
           -> `available`) hleypti theim ollum inn i rodina aftur og
           ThETTA PROF VAR GRAENT; `tests/advice.mjs` kafli 14 felldi
           hana med tveimur fullyrdingum. Su er burdarasin, thessi er
           lyktarprofid — sama ósamhverfa og `playerlist-sort.mjs` i
           FPL-verkefninu, thar sem fullyrding sem tharf tvennt til ad
           bregdast var veikari en hun leit ut fyrir.
       (c) merkid i bordinu er RAUTT, ekki gult. Þar stod nafnalisti
           {Out, IR} og PUP/NA/Suspended komu gul.                    */
  {
    const note = [...document.querySelectorAll(".note")]
      .find((x) => /they are not playing/i.test(x.textContent || ""));
    ok(note != null, "kassinn nefnir tha sem spila ekki");
    if (note) {
      const named = [...note.querySelectorAll("span.pos")].map((s) => s.textContent.trim());
      const flat0 = (note.textContent || "").replace(/\s+/g, " ");
      const counted = Number((/(\d+) more (?:is|are) out/.exec(flat0) || [0, 0])[1]);
      /* ============================================================
         (a) VAR BUNDIN VID NEFNDA HELMINGINN — OG HANN TAEMDIST
         ============================================================
         Kassinn hefur TVO helminga: their sem eru YFIR varamanni eru
         NEFNDIR, hinir TALDIR (`advice.js`, `sidelined` gegn
         `sidelinedBelowRepl`). Fullyrdingin las adeins thann fyrri.

         MAELT 31.8.2026: af 70 monnum med tiltaekileika 0 na 24 a
         bordid og **ENGINN theirra er yfir varamanni** i neinni af
         thremur deildarlogunum (bestur er Jordyn Tyson a -59,8).
         Kassinn segir thvi rettilega "24 more are out and not named
         here" og nefnir engan. Ekkert er thaggad — kassinn er heill.

         AKKERIN TVO SEM HEILUDUST voru Kittle (PUP -> Questionable,
         avail 0,75, VBD +9,9 — hann er NU I RODINNI) og Alec Pierce,
         sem faerdist milli commit-a 27.-28.8. Þa vard safnid rautt.

         OG ÞAD SEM SKIPTIR MEIRA MALI: med tomum nefndum helmingi urdu
         ThRJAR nagranna-fullyrdingar TAUTOLOGIUR og heldust graenar
         (`badges.length === named.length` = 0===0, `(b)` yfir tomum
         lista, og bædi `(c)`-throfin sem sitja inni i `if (row)`).
         Fullyrdingin spyr thvi nu um KASSANN, ekki um annan helming
         hans: nefndir EDA taldir. */
      ok(named.length + counted > 0,
        `(a) ${named.length} nefndir med stodu (${named.join(",") || "engir"}) + ${counted} taldir`);
      const badges = [...note.querySelectorAll("span.badge.bad")]
        .map((b) => b.textContent.trim());
      ok(badges.length === named.length,
        `og hver NEFNDUR ber stoduna sina (${badges.length}/${named.length}` +
        `${badges.length ? ": " + badges.join(", ") : ""})`);

      /* ============================================================
         (a2) OG HANN NEFNIR EKKI ALLA — TALAN ER LESIN AF SKJANUM
         ============================================================
         Kassinn bar THRETTAN nofn og notandinn sa thad: Bridgewater a
         VBD -288 keppti um athygli vid Kittle. `advice.mjs` kafli 14
         ver skurdinn (`vbd > 0`) og talninguna; hér er spurt hvort
         THAD SJAIST — sama skipting og milli (a) og reglunnar sjalfrar.

         BAÐAR TOLUR VERDA AD VERA A SKJANUM. Ad klippa og telja i
         `advice.js` en gleyma tolunni i .jsx-skranni vaeri nakvaemlega
         thogla horfid sem kassinn var byggdur til ad utiloka — og
         thad myndi ekkert prof sja nema thetta. */
      const flat = (note.textContent || "").replace(/\s+/g, " ");
      const more = /(\d+) more (?:is|are) out and not named here/.exec(flat);
      ok(more != null, `talan um tha sem eru EKKI nefndir sest (\"${flat.slice(0, 90)}…\")`);
      ok(named.length < 13 && more != null && Number(more[1]) > 0,
        `${named.length} nefndir og ${more ? more[1] : "?"} taldir — hvorugt er 13 i vegg`);
      ok(/below replacement/.test(flat),
        "og ASTAEDAN fyrir klippingunni stendur, ekki adeins talan");
      ok(/VBD/.test(flat),
        "med verstu VBD-tolunni, svo \"below replacement\" se maelanleg fullyrding");

      /* Nofnin ur nótunni. Ekki `querySelectorAll("span")` — ytri
         umgjordin um hvern mann er LIKA span an klasa og ber tha
         "TE George Kittle PUP" sem eitt "nafn". Nafnid er BERI
         textahnuturinn, svo hann er lesinn sem slikur. */
      const names = [...note.querySelectorAll("span.pos")].map((posEl) => {
        const wrap = posEl.parentNode;
        return [...wrap.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent).join("").trim();
      }).filter(Boolean);
      const why = [...document.querySelectorAll(".reasoning table.data tbody tr td.frozen")]
        .map((t) => t.textContent);
      ok(why.length > 0, "rokstudningurinn ber rodina (annars maelir (b) ekkert)");
      /* (b) HAFDI ENGA FRAMBJODENDUR thegar nefndi helmingurinn var
         tomur (0 nofn -> 0 leki -> alltaf graent). Kandidatarnir eru
         their sem BORDID merkir raudan — their eru 24 i dag, ekki 0. */
      const redNames = [...document.querySelectorAll("table.data tbody tr")]
        .filter((tr) => tr.querySelector("td.frozen span.badge.bad"))
        .map((tr) => {
          const c = tr.querySelector("td.frozen").cloneNode(true);
          for (const b of [...c.querySelectorAll(".badge")]) b.remove();
          return (c.textContent || "").trim();
        }).filter(Boolean);
      const cands = names.length ? names : redNames;
      ok(cands.length > 0, `ThEKJA/(b): ${cands.length} frambjodendur til leka`);
      const leak = cands.filter((n) => n && why.some((w) => w.includes(n)));
      ok(leak.length === 0, `(b) enginn theirra i rokstudningnum (${leak.join(", ") || "engir"})`);

      /* ============================================================
         (c) LAS UR NEFNDA HELMINGNUM — NU UR BORDINU SJALFU
         ============================================================
         `names[0]` er `undefined` thegar enginn er nefndur, svo
         fullyrdingin fell med ordunum "undefined er enn i bordinu" OG
         bædi throfin fyrir nedan hana slokknudu thegjandi (thau sitja i
         `if (row)`). Spurningin sem hun ber er hins vegar um BORDID:
         "sa sem spilar ekki er ekki thaggadur, bara ekki radlagdur" —
         og bordid merkir hann RAUTT ur `avail`, ohað thvi hvorum megin
         varamanns-linunnar hann er. Þar er thvi lesid. */
      const redRows = [...document.querySelectorAll("table.data tbody tr")]
        .filter((tr) => tr.querySelector("td.frozen span.badge.bad"));
      ok(redRows.length > 0,
        `ThEKJA: ${redRows.length} raudmerkt(ar) rod(ir) i bordinu (annars maelir (c) ekkert)`);
      const row = names[0]
        ? redRows.find((tr) => (tr.querySelector("td.frozen").textContent || "")
            .includes(names[0])) || null
        : redRows[0] || null;
      ok(row != null,
        "sa sem spilar ekki er enn i bordinu — hann er ekki thaggadur, bara ekki radlagdur");
      if (row) {
        ok(row.querySelector("td.frozen span.badge.bad") != null,
          "(c) merkid er RAUTT, ekki gult — liturinn kemur ur avail, ekki nafnalista");
        const valueCell = row.querySelectorAll("td")[8];
        ok(valueCell && !/\bgood\b/.test(valueCell.className),
          `og "Value" er ekki graent kaup (class="${valueCell ? valueCell.className : "?"}")`);
      }
    }
  }

  /* ============================================================
     SKILIN ThAR SEM VBD FER UNDIR NULL — LESID AF SKJANUM
     ============================================================
     Bordid ber ~557 menn og draftid er 150 vol, en adeins ~78 hafa
     POSITIFT VBD. Fra thvi marki nidur er rodin "minnst negatift VBD",
     sem svarar ANNARRI spurningu en efri helmingurinn — og maelingin
     sem rettlaetir rodina er skorud a BYRJUNARLIDINU, svo hun hefur
     naestum ekkert vald thar. Linan er BIRTING; rodin haggast ekki.

     ThEKJAN ER FULLYRT FYRST: bordid VERDUR ad bera bædi positift og
     negatift VBD, annars er "linan er a rettum stad" fullyrding um
     skil sem eru ekki til.                                          */
  {
    /* ============================================================
       TAFLAN ER VALIN UT FRA SETNINGUNNI, EKKI "table.data"
       ============================================================
       FYRSTA UTGAFA ThESSA KAFLA VAR ROng OG PROFID SAGDI ThAD:
       `querySelectorAll("table.data tbody tr")` tekur LIKA rokstudnings-
       toflunna inni i <details>, thar sem `td[4]` er "Next best" og ekki
       VBD. Fimm positifar tolur ur RANGRI toflu skekktu talninguna i 99
       medan bordid bar 94 — og fullyrdingin "talan i setningunni er
       talan i toflunni" felldi thad. Hun er thvi ekki bara vordur um
       vidmotid heldur um sjalfa sig.

       Taflan er nu tekin UR SOMU `.tablewrap` og setningin, svo thaer
       geta ekki lesid sitthvora toflu.                              */
    const cap = [...document.querySelectorAll(".tablewrap > div")]
      .find((d) => /above replacement/i.test(d.textContent || ""));
    ok(cap != null, "skilin eru SOGD i texta, ekki bara teiknud");
    const board = cap ? cap.parentNode.querySelector("table.data") : null;
    ok(board != null, "og setningin situr i somu umgjord og bordid");
    const cells = [...(board ? board.querySelectorAll("tbody tr") : [])]
      .map((tr) => ({ tr, v: Number((tr.querySelectorAll("td")[4] || {}).textContent) }))
      .filter((x) => Number.isFinite(x.v));
    ok(cells.length > 50, `ThEKJA: ${cells.length} VBD-tolur lesnar ur bordinu`);
    const pos = cells.filter((x) => x.v > 0).length;
    ok(pos > 0 && pos < cells.length,
      `ThEKJA: ${pos} yfir varamanni og ${cells.length - pos} undir — skilin ERU til`);

    const marked = cells.filter((x) => x.tr.classList.contains("vbdzero"));
    ok(marked.length === 1, `nakvaemlega EIN lina er merkt (${marked.length})`);
    if (marked.length === 1) {
      const idx = cells.indexOf(marked[0]);
      ok(marked[0].v <= 0, `og hun liggur a fyrsta negatifa VBD (${marked[0].v})`);
      ok(idx > 0 && cells[idx - 1].v > 0,
        `og rodin fyrir ofan er enn positif (${idx > 0 ? cells[idx - 1].v : "—"})`);
    }
    /* Talan i setningunni verdur ad vera talan sem taflan ber, annars
       segdi skjarinn tvennt um sama bord — sja notuna ad ofan. */
    if (cap) {
      const said = Number((cap.textContent.match(/^\s*(\d+)/) || [])[1]);
      ok(said === pos,
        `og talan i setningunni er talan i toflunni (${said} = ${pos})`);
    }
  }

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

  /* ============================================================
     MEIDSLASTADAN ER I SJALFGEFNA SETTINU — OG A SKJANUM
     ============================================================
     Notandinn bad um thetta berum ordum (README 6h). Fullyrdingin er
     TVISKIPT af thvi ad `DEFAULT_COLS` er adeins SJALFGEFID gildi:
     `PlayerTable` les `loadState("cols", DEFAULT_COLS)`, svo notandi
     sem hefur adur breytt dalkavalinu faer thennan dalk EKKI. Vaeri
     dalkurinn eina leidin vaeri upplysingin thvi horfin hja theim sem
     mest hefur notad appid.

       (a) dalkurinn ER i sjalfgefna settinu og HAUSINN hans er a skjanum
       (b) og merkid vid NAFNID birtist LIKA — su leid er oháð
           dalkavalinu og hun er thess vegna su sem stendur eftir
       (c) og liturinn er RAUDUR vid `avail === 0`, ekki gulur; hér stod
           sami {Out, IR}-nafnalisti og i `DraftBoard.jsx` og adeins
           annar var lagfaerdur fyrst.

     Fjoldinn er REIKNADUR ur `DEFAULT_COLS`, ekki bokadur: harðkoðuð
     tala stadnar um leid og dalki er baett vid (sja CLAUDE.md 5).     */
  {
    const { DEFAULT_COLS, COL } = await import("../src/columns.js");
    ok(DEFAULT_COLS.includes("injury"),
      `(a) "injury" er i DEFAULT_COLS (${DEFAULT_COLS.length} dalkar)`);
    ok(heads.length === DEFAULT_COLS.length,
      `og hausinn ber nakvaemlega thann fjolda (${heads.length} = ${DEFAULT_COLS.length})`);
    const want = COL.injury.short;
    ok(heads.some((h) => (h.textContent || "").includes(want)),
      `og heitid "${want}" er a skjanum`);

    /* (b) + (c) — merkid, sem er ohad dalkavalinu. Positift fyrst:
       taflan VERDUR ad bera slikan mann, annars maelir (c) ekkert. */
    const badges = [...document.querySelectorAll("table.data tbody td.frozen span.badge")]
      .filter((b) => (b.textContent || "").trim() !== "R");
    ok(badges.length > 0,
      `(b) ${badges.length} meidsla-merki a nafnahólfunum (ohad dalkavalinu)`);
    /* ============================================================
       LISTINN AF STODUM ER LESINN UR `AVAIL`, EKKI HANDSKRIFADUR
       ============================================================
       OG ThAD ER EKKI SNYRTING — FYRSTA UTGAFA ThESSA PROFS
       HANDSKRIFADI HANN OG VAR RONG. Hun bar `DNR` i "spilar ekki"
       settid og profid felldi `DNR`-merkid fyrir ad vera gult. Merkid
       var RETT: `AVAIL.DNR = 0,5`, thvi DNR er **holdout, ekki
       meidsli** — hann GETUR spilad en er ekki maettur (sja notuna vid
       `AVAIL` i model.js).

       ThAD ER NAKVAEMLEGA VILLAN SEM ThESSI KAFLI VER, I PROFINU
       SJALFU: handskrifadur listi af stodum sem rekur fra heimildinni.
       `AVAIL` er heimildin, i kodanum og hér.                        */
    const { AVAIL } = await import("../src/model.js");
    const wontPlay = new Set(Object.keys(AVAIL)
      .filter((k) => k !== "null" && k !== "undefined" && AVAIL[k] === 0));
    ok(wontPlay.size > 5,
      `ThEKJA: ${wontPlay.size} stodur i AVAIL thyda "spilar ekki" (lesid, ekki skrifad)`);
    const zeroBadges = badges.filter((b) => wontPlay.has((b.textContent || "").trim()));
    ok(zeroBadges.length > 0,
      `ThEKJA: ${zeroBadges.length} merki a skjanum bera slika stodu`);
    const wrong = zeroBadges.filter((b) => !b.classList.contains("bad"));
    ok(wrong.length === 0,
      `(c) og allir theirra eru RAUDIR (${wrong.length} gulir: ${
        wrong.slice(0, 3).map((b) => b.textContent.trim()).join(", ") || "engir"})`);
    /* Og andstaeda attin: stada sem er EKKI 0 ma ekki vera raud, annars
       vaeri "lagfaeringin" ad hrópa um hvern sem er skrad ur af aefingu. */
    const soft = badges.filter((b) => !wontPlay.has((b.textContent || "").trim())
      && (b.textContent || "").trim() !== "");
    ok(soft.length === 0 || soft.every((b) => !b.classList.contains("bad")),
      `og stada sem thydir EKKI "spilar ekki" er gul (${soft.length} slik: ${
        [...new Set(soft.map((b) => b.textContent.trim()))].join(", ") || "engin"})`);
  }
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

/* `4c`, EKKI `4b`: kaflaheitid `4b` var NOTAD TVISVAR i thessari skra
   (linu 508 fyrir "where they disagree" og hér) fram til 19.8.2026. Tvo
   heiti sem eru eins gera utkomuna oleitanlega — "4b fell" bendir a tvo
   stadi — og thad er sama vandamal og tveir flipar med sama takni. */
console.log("\n4c. model-lab-flipinn");
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
   Athugasemdir i koda mega vera islenskar — thaer rata ekki i DOM.

   ============================================================
   `title=` ER VIDMOT LIKA — GATID SEM ThESSI KAFLI HAFDI (25.8.2026)
   ============================================================
   Fullyrdingarnar tvaer (stafir og ASCII-ordalisti) voru rettar en
   thaer lasu ADEINS `textContent`. Notur dalkanna i `columns.js` rata
   HVERGI ANNARS STADAR en i `title=` — `PlayerTable` setur
   `title={c.note}` a hvern toflu-haus og a hvern hnapp i
   dalkavalaranum — svo **42 islenskir strengir voru synilegir
   notandanum** medan thessi kafli var graenn. Fullyrding sem les ekki
   thann stad thar sem strengurinn birtist maelir hann ekki; sama aett
   og "neikvaed fullyrding verdur ad nefna streng sem var sannanlega
   tharna" (CLAUDE.md 5b).

   DALKAVALARINN ER OPNADUR VILJANDI. Sjalfgefid eru adeins 15 dalkar
   valdir, svo 15 af 39 notum eru i DOM-inu og thekjan vaeri 38% — og
   thaer 24 sem ut af standa vaeru nakvaemlega thaer sem enginn sér
   fyrr en hann opnar valarann. ThEKJAN ER FULLYRDING, EKKI LOGGA
   (CLAUDE.md 5b regla 1): talan fellir kaflann ef hun hrynur.        */
console.log("\n7. vidmotid er enskt");
{
  await clickTab("Draft");
  /* Hvert `title=` i DOM-inu, hvar sem thad situr. */
  const titles = () => [...document.querySelectorAll("[title]")]
    .map((el) => el.getAttribute("title") || "").join("  ");
  const openPicker = async () => {
    const b = [...document.querySelectorAll("button.act")]
      .find((x) => /^Columns \(/.test((x.textContent || "").trim()));
    if (!b) return false;
    await act(async () => {
      b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    await settle(300);
    return true;
  };
  let all = "";
  let colNotes = 0;
  for (const tab of ["Draft", "Players", "Experts", "Schedule", "Sources"]) {
    await clickTab(tab);
    if (tab === "Players") {
      ok(await openPicker(), "dalkavalarinn opnast svo ALLAR dalka-noturnar seu i DOM");
      colNotes = [...document.querySelectorAll("button.chip[title]")]
        .filter((b) => (b.getAttribute("title") || "").length >= 12).length;
    }
    all += " " + text() + "  " + titles();
  }
  ok(colNotes >= 39,
    `ThEKJA: ${colNotes} dalka-notur lesnar ur title= (>= 39 — ein per dalk)`);
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

/* ---------- 8. FELLDUR ROKSTUDNINGUR — STUTT SJALFGEFID, EKKI EYTT ----------
   BEIDNI NOTANDANS 20.8.2026: "Eg vill ekki hafa svona auka texta, bara ad
   appid velji rettan kall til ad drafta."

   HANN HEFUR RETT UM BORDID og THAD ER SAMT EKKI EYDING. Nokkrar af thessum
   setningum eru til THVI ThAD SEM ThAER LYSA ER OMAELT; ef ein theirra er
   eydd fer omaelt merki ad lesast eins og MAELT merki, sem er versta
   utkoman i thessu repo-i. Þess vegna profar thessi kafli TVENNT SAMAN og
   hvorugt naegir eitt:

     (a) setningin er ENN I DOM-inu           -> hun var ekki eydd
     (b) hun er inni i `<details>` sem er EKKI `open`  -> hun er FELLD

   Med (a) einu maetti skilja allar malsgreinarnar eftir opnar og kaflinn
   vaeri graenn — thad er nakvaemlega thad sem hann bad um ad yrdi breytt.
   Med (b) einu maetti eyda setningunni og hafa TOMT details — graent lika.
   Bædi thurfa ad haldast.

   OG "unmeasured" ER NEFNT BERUM ORDUM, ekki adeins talid. `<details>`-
   talning er thekja (hve margar felldar blokkir eru til) og hun getur
   stadid medan JUST ThESSI setning er horfin: hun er su eina sem heldur
   omældu merki fra ad lesast sem maelt, svo hun er fullyrding um sjalfa
   sig og ekki hluti af talningu. Sama rok og "neikvaed fullyrding verdur
   ad nefna streng sem var sannanlega tharna" (CLAUDE.md 5b).            */
console.log("\n8. felldur rokstudningur a draft-bordinu");
{
  await clickTab("Draft");
  const bodyText = () => (document.body.textContent || "").replace(/\s+/g, " ");

  /* Felldu blokkirnar. `.fine` er sniðið sem `Fine` teiknar. */
  const fines = [...document.querySelectorAll("details.fine")];
  ok(fines.length >= 3,
    `ThEKJA: ${fines.length} felldar rokstudnings-blokkir a bordinu (>= 3)`);
  const openByDefault = fines.filter((d) => d.hasAttribute("open"));
  ok(openByDefault.length === 0,
    `og ENGIN er opin sjalfgefid (${openByDefault.length} opnar)`);
  /* Hver ein verdur ad hafa BADA hluta — tomt details er "eytt" i dulargervi. */
  const emptyFines = fines.filter((d) =>
    ((d.querySelector(".fine-body") || {}).textContent || "").trim().length < 40);
  ok(emptyFines.length === 0,
    `og engin er tom (${emptyFines.length} undir 40 stafi — tomt details er eyding)`);
  const noSummary = fines.filter((d) =>
    ((d.querySelector("summary") || {}).textContent || "").trim().length < 8);
  ok(noSummary.length === 0,
    `og hver ber laesilegt summary (${noSummary.length} an)`);

  /* ============================================================
     SETNINGIN SEM MA ALDREI HVERFA
     ============================================================ */
  const fineText = fines
    .map((d) => (d.querySelector(".fine-body") || {}).textContent || "").join(" ")
    .replace(/\s+/g, " ");
  ok(/\bunmeasured\b/.test(fineText),
    "\"unmeasured\" er ENN a skjanum — trending-merkid segir sjalft ad thad se omaelt");

  /* Sjalfgefna synin = allur textinn minus INNIHALD hverrar felldrar
     blokkar. `summary`-linan er VILJANDI inni i henni: hun er synileg og
     hun a ad teljast bædi i thekju og i lengd. */
  let dflt = bodyText();
  for (const d of fines) {
    const b = ((d.querySelector(".fine-body") || {}).textContent || "")
      .replace(/\s+/g, " ");
    if (b) dflt = dflt.split(b).join(" ");
  }

  /* ============================================================
     ORDID MA STANDA UPPI — SETNINGIN ER FELLD
     ============================================================
     FYRSTA UTGAFA ThESSA KAFLA FULLYRTI `!/unmeasured/.test(dflt)` OG
     HUN FELL A RETTUM KODA. Astaedan er ad `summary`-linan heitir
     "…and what is unmeasured about it" — ordid stendur thvi uppi AN
     smells, sem er RETT hegdun og ekki bilun: eins ords fyrirvari er
     synilegur a 90 sekundum, malsgrein er thad ekki.

     Fullyrdingin er thvi um SETNINGUNA, ekki um ordid: rokin sjalf
     ("whether it predicts points is unmeasured, and it is unmeasured
     for a reason…") verda ad vera felld, medan flaggid ma sjast. Ad
     krefjast thess ad ordid HORFI vaeri profid ad thvinga fram verri
     framsetningu en sú sem er thar.                                  */
  ok(/predicts points is/.test(fineText),
    "sjalf setningin um omaelda merkid er til i fullri lengd");
  ok(!/predicts points is/.test(dflt),
    "og hun er FELLD — malsgreinin stendur ekki i sjalfgefnu syninni");
  ok(/\bunmeasured\b/.test(dflt),
    "en FLAGGID sest an smells (summary nefnir \"unmeasured\")");

  /* Hitt sem var fellt: adferdafraedin sem hann limdi. Baðar setningar
     verda ad vera til (a) og felldar (b).

     ============================================================
     OG FJORAR TIL FRA 24.8.2026 — URSKURDAR-SPJALDID SJALFT
     ============================================================
     BEIDNI NOTANDANS, ordrett: "Mer finnst alltof mikid ad gera a
     forsidunni, taktu ut eithvad af thessum texta, eg vill adalega nota
     draft siduna til ad segja mer hvenr eg a ad velja."

     Sjalfgefni flipinn ER `draft` (`App.jsx`), svo "forsidan" og
     "draft siduna" eru SAMA SIDAN — og styttingin 20.8. nadi til
     trending- og skortstodu-spjaldanna en EKKI til `NextPick`, sem er
     nakvaemlega spjaldid sem svarar spurningunni. Þad bar fjorar
     malsgreinar af adferdafraedi UNDIR urskurdinum.

     Hver thessara fjogurra er (a) — hun ver tolu sem er OMAELD eda utan
     maelingar — svo hver ein verdur ad vera TIL og FELLD:

       "interval includes zero"  bye-overlap: merkid er sterkara en null
                                 og veikara en maeling
       "no injury discount"      rodin/threpid a bordinu ER enn reiknad
                                 ur stigum sem madurinn skorar ekki
       "guess dressed as a"      K/DST voru utan hverrar hermunar
       "unmeasured number"       sama, i K/DST-spjaldinu sjalfu         */
  for (const phrase of ["seven-day average", "starters only",
                        "no injury discount", "guess dressed as a",
                        "unmeasured number"]) {
    ok(fineText.includes(phrase), `"${phrase}" er enn til (rokstudningur ekki eyddur)`);
    ok(!dflt.includes(phrase), `og "${phrase}" er fellt undan sjalfgefnu syninni`);
  }

  /* ============================================================
     BYE-OVERLAP: PROFUD A UPPRUNANUM, OG ThAD ER EKKI SLOKUN
     ============================================================
     "interval includes zero" ER FIMMTI (a)-fyrirvarinn og hann hlytur
     somu medferd — en hann er profadur ANNARS STADAR, thvi kassinn
     `rec.byeClash` TEIKNAST EKKI i thessu drafti: fixturan hefur engan
     hop med tvo menn i somu audu viku.

     ÞETTA VAR FUNNID MED ÞVI AD KEYRA KAFLANN A KODANUM FYRIR
     STYTTINGUNA. Fullyrdingin `fineText.includes(...)` fell thar — sem
     hun a ad gera — EN hun fell LIKA a rettum koda eftir, af THVI AD
     KASSINN ER EKKI A SKJANUM. Fullyrding sem fellur i badar attir maelir
     ekkert; hun er verri en engin, thvi hun litur ut eins og vordur.

     Uppruna-leitin krefst thess ad setningin se INNI I `<Fine>`-blokk —
     ekki adeins ad hun se i skranni — svo hun getur ekki verid grae
     medan malsgreinin stendur opin. Sama medferd og `dashboard.mjs`
     kafli 3h gefur greinum sem teiknast ekki i sinni fixturu.        */
  {
    const src = readFileSync(
      path.join(new URL(".", import.meta.url).pathname, "..", "src", "DraftBoard.jsx"),
      "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
    /* AKKERID FYLGIR KASSANUM, EKKI ORDALAGINU SEM VAR: fyrirsognin var
       "Bye overlap in your roster" thar til rodun theirra var lagfaerd
       31.8.2026 (taldar A VIKU, ekki innan stodu). Fullyrdingin er um
       ad kassinn SE til; hun ma ekki falla thegar hann er lagfaerdur. */
    ok(/worst bye week/.test(src),
      "ThEKJA: uppruna-leitin les raunverulega `DraftBoard.jsx` (bye-kassinn fannst)");
    const fineBlocks = src.match(/<Fine\b[\s\S]*?<\/Fine>/g) || [];
    ok(fineBlocks.length >= 4,
      `ThEKJA: ${fineBlocks.length} <Fine>-blokkir i uppruna (>= 4)`);
    ok(fineBlocks.some((b) => /interval includes zero/.test(b)),
      "\"interval includes zero\" er til OG inni i `<Fine>` — bye-merkid er " +
      "sterkara en null og veikara en maeling, og thad ma hvorugt hverfa ne stanta opid");
  }

  /* ============================================================
     OG ThAD SEM KVIKNAR A RAUNVERULEGRI BILUN VAR EKKI HREYFT
     ============================================================
     Styttingin ma EKKI hafa tekid greiningarnar med. Hver thessara er
     setning sem var skrifud VEGNA konkrets tilfellis (rangur hopur, mock
     i annarri staerd, vol sem bordid kann ekki ad para) og hver theirra
     verdur ad standa SYNILEG — felld vaeri hun jafngild thogn.

     Þaer eru profadar a SJALFGEFNU SYNINNI (`dflt`), ekki a `bodyText()`:
     krafan er ad hann sjai thaer AN SMELLS.                           */
  for (const keep of ["Not in the list", "Still to fill",
                      "Every simulation in this app excluded them",
                      "take one of last season"]) {
    ok(dflt.includes(keep), `greiningin/urskurdurinn stendur an smells: "${keep}"`);
  }

  /* ============================================================
     OG PROSAN SJALF ER STUTT — ThAD ER BEIDNIN
     ============================================================
     MAELT A PROSU, EKKI A SPJALDINU. Fyrsta utgafan las ALLAN
     spjald-textann og felldi trending a 468 stofum — en ~250 af theim
     eru NOFNIN i chip-unum (tolf leikmenn + tolur). Þau eru ekki
     "auka texti"; thau eru innihaldid. Þak a spjaldi i heild hefdi
     thvi fallid um leid og fleiri nofn hreyfdust, sem er suð, og thad
     hefdi verid slokkt innan viku.

     Prosan er `.sub` + `.note` — nakvaemlega thau tvo snid sem baru
     malsgreinarnar sem hann limdi.                                   */
  const panelProse = (h2re) => {
    const h = [...document.querySelectorAll(".panel h2")]
      .find((x) => h2re.test((x.textContent || "").trim()));
    if (!h) return null;
    const p = h.parentElement;
    let t = [...p.querySelectorAll(".sub, .note")]
      .map((x) => (x.textContent || "")).join(" ").replace(/\s+/g, " ");
    for (const d of p.querySelectorAll("details")) {
      const b = ((d.querySelector(".fine-body") || d).textContent || "")
        .replace(/\s+/g, " ");
      if (b) t = t.split(b).join(" ");
    }
    return t.trim();
  };
  /* ÞOKIN ERU MAELD, EKKI VALIN. Hvert var lesid af skjanum FYRIR og
     EFTIR styttinguna med thessum sama maeli:

       spjald          fyrir   eftir   thak
       trending          203     203     260   (fellt 20.8.)
       skortstadan        87      87     160   (fellt 20.8.)
       urskurdurinn    1.284     658     800   (24.8., -49%)
       K og DST        1.103     343     420   (24.8., -69%)

     Þokin eru ~21% ofan vid utkomuna: nog fyrir eina nya GREININGU
     (thaer eru ekki prosa i thessum skilningi), of litid fyrir nya
     malsgrein. Kemur ny greining inn a ad maela upp a nytt og uppfaera
     thessa toflu — ekki hreyfa thakid eitt.                           */
  for (const [name, re, cap] of [
    ["trending", /room is moving/i, 260],
    ["skortstadan", /Positional scarcity/i, 160],
    ["urskurdurinn", /^Pick \d+ —/, 800],
    ["K og DST", /Kickers and defences/i, 420],
  ]) {
    const t = panelProse(re);
    if (t == null) { ok(false, `${name}-spjaldid finnst`); continue; }
    ok(t.length > 20, `ThEKJA: ${name}-prosan er raunverulega lesin (${t.length} stafir)`);
    ok(t.length <= cap,
      `${name}-prosan er STUTT sjalfgefid (${t.length} stafir <= ${cap})`);
  }
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
