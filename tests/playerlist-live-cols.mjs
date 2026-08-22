/* ============================================================
   LIFANDI DÁLKAR Í LEIKMANNALISTANUM — tengingavörður

   AF HVERJU: "DefCon liðs"-dálkurinn var DAUÐUR FRÁ FÆÐINGU og enginn
   sá það — cook gaf num() HLUTINN sjálfan (ekki .defcon_opportunity),
   num(hlutur) er null, og dálkur sem er null hjá öllum FELUR SIG
   SJÁLFUR sem "tómur dálkur". Eiginleikinn sem gerir dálka örugga
   (null-reglan í 6i) faldi líkið. Fannst 4.8.2026 þegar sama tenging
   var skrifuð fyrir DC-hittni.

   Þetta safn opnar leikmannalistann í jsdom með HERMDU defcon.json
   (DC-hittni-dálkarnir eru annars tómir til 21.8.) og les GILDIN úr
   DOM-inu. TVÆR jsdom-gildrur sem prófið sneiðir hjá:
     · leitin er stýrður React-reitur og innsláttur er ótraustur
       (sama gildra og smoke-prófið skjalfestir) — því er RAÐAÐ í stað
       þess að sía: null raðast ALLTAF SÍÐAST (6i-reglan), svo röðun
       eftir nýja dálknum flýtur einu gagna-röðinni efst í sýndarglugga
       listans. Prófið notar þannig eiginleikann sem það ver.
     · listinn er sýndarvæddur — röð utan gluggans er EKKI í DOM.

   Keyrsla: loader-safn (sjá run-tests.mjs).
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const DEF_ID = 11; // Mosquera — ARS DEF (lid 1), i sjalfgefna lidinu

/* ============================================================
   ARS `defcon_opportunity` ER HERMD ThEGAR RAUNSKRAIN ER NULL (21.8.2026)

   `team_dc`-fullyrdingin las toluna UR RAUNSKRANNI (`53` i forleik) og fell
   somu nott sem timabilid for i gang: `defcon_opportunity` varð `null` hja
   ollum 20 lidum, svo `String(null)` = "null" og prófið leitadi ad
   strengnum "null" i rodinni.

   ThAD ER RETT ASTAND OG ThAD ER SKJOLAD: talan krefst markmanns yfir 400
   minutum fyrir eigin xGC OG jakvaedrar sokn-summu hja hverjum andstaeding
   i sex-leikja glugganum. Notan i skranni segir sjalf "an empty column
   early in a season means 'not measurable yet', not 'average'", og
   athugasemdin i `fetch.mjs` spair ThVI berum orðum ad thad standi i ~5
   umferdir. Fullyrdingin um TENGINGUNA — ad `_team_dc` lesi
   `.defcon_opportunity` og ekki HLUTINN — getur thvi ekki notad raungogn
   naestu fimm vikur.

   Skran er thegar HERMD her (`players`-radirnar eru tilbunar af nakvaemlega
   somu astaedu: DC-hittni er tom fyrir 21.8.), svo herming a thessu eina
   svidi er sama adferd, ekki ny. Raunverulega gildid er notað thegar thad
   ER til; annars sentinel sem er MAELT einkvaemt i rodinni her fyrir nedan.
   Og regimeid sjalft er FULLYRT (kafli 3 hér): se ARS null verda OLL 20 ad
   vera null — eitt bilad lid er ekki regime.                            */
const REAL_ARS_OPP = J("defcon.json").opportunity?.["1"]?.defcon_opportunity ?? null;
const ARS_OPP = REAL_ARS_OPP ?? 6437;

globalThis.fetch = async u => {
  const n = String(u).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  /* DEFCON_HISTORY: fra 7.8.2026 FYLGJA DC-dalkarnir voldu timabili og
     lesa `defcon_history.json` (lyklad a `code`) thegar sogulegt timabil
     er valid — sem er SJALFGEFID i forleik (2025/26). Hermum thvi BADAR
     heimildir: history fyrir sjalfgefna sýn, defcon.json fyrir lifandi. */
  if (n === "defcon_history.json") {
    return { ok: true, status: 200, json: async () => ({
      seasons: { "2025/26": { "500040": {   // Mosquera (FPL code)
        pos: "DEF", starts: 12, hits: 9, p0: 0.361,
        hit_rate: 0.75, hit_rate_adj: 0.573 } } } }) };
  }
  if (n === "defcon.json") {
    const real = J(n);
    return { ok: true, status: 200, json: async () => ({ ...real,
      opportunity: { ...real.opportunity,
        1: { ...(real.opportunity?.["1"] || {}), defcon_opportunity: ARS_OPP } },
      players: [
      { fpl_id: DEF_ID, position: 2, starts: 12, threshold_hits: 9,
        hit_rate: 0.75, hit_rate_adj: 0.573, p0: 0.361, cbit_per_90: 9.1, cbirt_per_90: 13.2 },
    ] }) };
  }
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

localStorage.setItem("fpl_planner_v3", JSON.stringify({ watch: [] }));

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 300)); });

const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 120)); }); };
const fire = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
};
const byTab = emoji => [...document.querySelectorAll("button")].find(x => x.textContent.trim().startsWith(emoji));
const byExact = t => [...document.querySelectorAll("button")].find(x => x.textContent.trim() === t);

/* Haus-hólfin eru div (listinn er ekki <table>) — smellt á minnsta
   stakið sem ber nákvæmlega heitið (röðunar-örvar og ∑ hreinsuð).      */
const clickHeader = async label => {
  const el = [...document.querySelectorAll("div,span")]
    .filter(x => x.textContent.trim().replace(/[↑↓∑†]/g, "").trim() === label)
    .at(-1);
  if (!el) return false;
  await fire(el);
  return true;
};
/* Textinn í röð Mosquera: gengið upp frá nafna-hnappnum þar til hólfið
   ber tölugildi (röðin), en stoppað áður en allt tréð gleypist.         */
const mosRowText = () => {
  const mos = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Mosquera"));
  let el = mos;
  for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
    const t = el.textContent || "";
    if (t.length > 2000) break;
    if (/%|\d\d/.test(t.replace("Mosquera", ""))) return t;
  }
  return mos?.textContent || "";
};

await fire(byTab("👥"));
console.log("\nLIFANDI DÁLKAR (hermt defcon.json)");

/* ---- 1. DC-hittni-flokkurinn: nyju dalkarnir ---- */
ok("flokka-hnappurinn 'Vörn' er til (DC-hittni fluttist thangad 7.8.)", !!byExact("Defence"));
await fire(byExact("Defence"));
ok("raðað eftir 'DC-leikir (n)' — null-síðast flýtur gagna-röðinni efst",
  await clickHeader("DC n"));
let txt = mosRowText();
ok("Mosquera-röðin er í sýnda glugganum eftir röðun", txt.includes("Mosquera"),
  `— fékk "${txt.slice(0, 80)}"`);
ok("leiðrétta talan er birt (57%)", /57%/.test(txt),
  "— afturvirknin er dauð í listanum ef aðeins hráa talan birtist");
ok("hráa talan sést til gagnsæis (75%)", /75%/.test(txt));
/* Dalkarnir limast saman i textContent ("...57%75%12...") — n-gildid er
   thvi profad sem THRENNDIN adj%,raw%,n i skilgreiningar-rod, ekki med
   \b (tolustafur fylgir beint a eftir og eydir ordamorkunum).          */
ok("n-dálkurinn ber leikjafjöldann (þrenndin 57%75%12)", txt.includes("57%75%12"));

/* ---- 2. team_dc UPPRISAN: dalkurinn var daudur fra faedingu ----
   Rodunin eftir dc_starts heldur ser thegar skipt er um flokk, svo
   Mosquera er AFRAM efstur — vid lesum team_dc-toluna ur hans rod.
   ARS defcon_opportunity: raunskrain thegar hun ber tolu (53 i forleik),
   annars sentinel — sja skyringuna vid `ARS_OPP` i hausnum.             */
const arsOpp = String(ARS_OPP);
await fire(byExact("Upcoming fixtures"));
txt = mosRowText();
/* SENTINELLINN VERDUR AD VERA EINKVAEMUR I RODINNI, annars gaeti
   `includes` verid satt um ALLT ANNAN dalk og fullyrdingin maeldi ekkert
   (kafli 5b: "MAELITAEKID GETUR SJALFT VERID VILLAN" — `textContent`
   limir dalkana saman an bila, svo undirstrengur er ohaeður dalkamorkum). */
const occurrences = txt.split(arsOpp).length - 1;
ok(`team_dc-talan (${arsOpp}) er EINKVAEM i rodinni — undirstrengur ur odrum dalki`
  + ` maeldi ekkert`, occurrences === 1,
  `— fann ${occurrences} i "${txt.slice(0, 160)}"`);
ok(`team_dc ber TÖLU — ARS-röð Mosquera sýnir ${arsOpp} (dálkurinn var dauður frá fæðingu)`,
  txt.includes("Mosquera") && txt.includes(arsOpp),
  `— fékk "${txt.slice(0, 120)}" · num(hlutur)=null stökkbreytingin fellir þetta`);
/* OG REGIMEID SJALFT ER FULLYRT, EKKI HERMT I ThOGN. Se ARS-gildid null i
   raunskranni verda OLL 20 ad vera null: thad er "ekki maelanlegt enn"
   (markvordur undir 400 min), og thad er astand skrarinnar sem heild.
   Eitt lid med null medan onnur bera tolu er ekki regime heldur bilun —
   og hun myndi FELAST inni i hermingunni her.                          */
{
  const opp = J("defcon.json").opportunity || {};
  const rows = Object.values(opp);
  const rated = rows.filter(o => o.defcon_opportunity != null).length;
  ok(`raunskra defcon.opportunity er samkvaem: ${rated}/${rows.length} lid med tolu`
    + ` (ARS ${REAL_ARS_OPP == null ? "null -> HERMT" : REAL_ARS_OPP})`,
    rows.length >= 20 && (REAL_ARS_OPP == null ? rated === 0 : rated >= 10),
    "— eitt null innan um tolur er BILUN, ekki 'ekki maelanlegt enn'");
}

/* ---- 3. STIGATAFLAN FAER SOMU AUDGUN — VORDUR GEGN 20 TOMUM KOSSUM ----
   MAELT 8.8.2026: stigataflan fekk HRAT players.json, svo hver kassi i Ogn
   (8/8), Leikjum framundan (5/5) og Jofnudi (4/4) sagdi "No numbers" — thrir
   HEILIR flokkar daudir. Rotin var ekki tolan og ekki skrain: audgunin var
   adeins til a EINUM stad (cook i PlayerList).
   Thetta profar TENGINGUNA, ekki formuluna: `stats.test.mjs` kafli 14 maelir
   ad `makeEnricher` fylli dalkana, en HER er spurningin hvort App.jsx skili
   skránum yfirleitt til stigatoflunnar. Ef einhver fjarlaegir `imminent=` eda
   `fixtures=` ur <Leaderboard> fer talan i núll og THETTA fellur — an thess
   myndi hun thegja, thvi tomur dalkur er ekki villa i sjalfu ser.        */
await fire(byTab("🏆"));
await new Promise(r => setTimeout(r, 60));
{
  const noNums = [...document.querySelectorAll("div")]
    .filter(d => d.textContent.trim() === "No numbers").length;
  ok("stigataflan sýnir ENGAN tóman kassa í opnum flokki", noNums === 0,
    `— fann ${noNums}; audgunin kemst ekki til Leaderboard.jsx`);
  /* OGNAR-DALKARNIR FLUTTUST I "Attack" 8.8.2026 ad beidni notanda —
     serflokkur "Threat" er ekki lengur til. Profid eltir EIGINLEIKANN,
     ekki HEITID: thad sem her skiptir mali er ad ESPN-audgunin komist til
     Leaderboard.jsx, og hun er nu profud i sinum nyja flokki. Vaeri hakid
     afram a "Threat" myndi thad falla af ENDURNEFNINGU i stad bilunar —
     "Prof a ad profa hegdun, ekki ordalag" (CLAUDE.md 6k).             */
  const attack = byExact("Attack");
  ok("Soknar-flokkurinn er til i stigatoflunni", !!attack);
  if (attack) {
    await fire(attack);
    const noNums2 = [...document.querySelectorAll("div")]
      .filter(d => d.textContent.trim() === "No numbers").length;
    ok("Sokn (m.a. ognar-dalkarnir): engir tomir kassar eftir audgun",
       noNums2 === 0, `— fann ${noNums2}`);
  }
  ok("serflokkurinn 'Threat' er FARINN (dalkarnir eru i Attack)", !byExact("Threat"));
}

/* ============================================================
   4. FORLEIKS-BORDINN — HANN FULLYRTI EITTHVAD SEM VAR OSATT A SAMA SKJA

   Bordinn sagdi: "<timabil> has not started — every season field is zero
   for all 587 players, so this view has no numbers to sort."
   MAELT A SAMA SKJA I SOMU ANDRA (16.8.2026): B.Fernandes ICT 381,4 ·
   Creativity 1938,5 · Haaland Threat 1520,0. `players.json` er LIFANDI
   bootstrap FPL og FPL hafdi ekki nullstillt hana.

   HER ER VARIN TALAN SJALF, ekki ordalagid. Tvaer ovinsaelustu utkomurnar
   eru BADAR "graenar" hja naivri fullyrdingu:
     · talan er 0     -> bordinn fullyrdir gamla ranga textann aftur
     · talan er ALLIR -> hun er ekki maeling heldur fasti i dulargervi
   Og sidara tilvikid VAR RAUNVERULEGT (maelt 17.8.2026): fyrsta utgafa
   `staleSeasonRows` taldi alla `!live_only`-dalka, og `now_cost` (Price) er
   non-null hja OLLUM 587 — svo talan var 587 af 587, sem er `Price > 0`.
   Verst: verdid nullstillist aldrei, svo bordinn hefdi haldid afram ad
   fullyrda thetta longu eftir ad FPL nullstillti arstidina. Nakvaemlega
   sama villuaett og "MEASURED: the range is 4-10" (CLAUDE.md 8/12).
   ============================================================ */
{
  const { STAT_DEFS, gwBlindKeys } = await import(new URL("src/stats.js", REPO).href);
  const PL = await import(new URL("src/PlayerList.jsx", REPO).href);
  const players = J("players.json").players;
  const blind = gwBlindKeys();
  const rows = players.map(p => ({ src: p, p }));
  const n = PL.staleSeasonRows(rows, blind);

  console.log(`\nFORLEIKS-BORDINN (staleSeasonRows = ${n} af ${players.length})`);
  /* ANTI-TOMLEIKI I BADAR ATTIR — thad er thessi fullyrding sem bitur. */
  ok(`talan er maeling en ekki fasti: 0 < ${n} < ${players.length}`,
     n > 0 && n < players.length,
     n === players.length ? "ALLIR — thetta er `Price > 0` i dulargervi, ekki arstidar-tala"
                          : "ENGINN — bordinn fullyrdir tha gamla ranga textann");
  /* FORSENDAN SEM GERIR EFRI MORKIN MARKTAEK: Price ER non-null hja ollum,
     svo gamla skilyrdid HEFDI raunverulega skilad 587. Neikvaed fullyrding
     verdur ad nefna eitthvad sem var sannanlega tharna (CLAUDE.md 5b).   */
  ok(`Price er non-null hja OLLUM ${players.length} (thess vegna maeldi gamla skilyrdid ekkert)`,
     players.every(p => (p.now_cost ?? 0) > 0));
  const priceDef = STAT_DEFS.filter(d => d.key === "now_cost");
  ok("...og `staleSeasonRows` telur Price EKKI med (0 rader af honum einum)",
     PL.staleSeasonRows(rows, blind, priceDef) === 0,
     `fekk ${PL.staleSeasonRows(rows, blind, priceDef)}`);

  /* SJALFHREINSUNIN ER KRAFAN, EKKI TALAN: thegar FPL nullstillir arstidina
     A bordinn ad verda rettur AN ThESS ad nokkur snerti kodann. Hermt med
     thvi ad nulla hverja tolu i lifandi rodinni NEMA thaer sem eru dagsins
     (verd, eignarhald, stada) — thad er nakvaemlega thad sem FPL gerir.  */
  const KEEP = new Set(["id", "code", "team", "element_type", "now_cost", "selected_by_percent"]);
  const resetRows = players.map(p => {
    const q = { ...p };
    for (const [k, v] of Object.entries(q)) {
      if (KEEP.has(k)) continue;
      if (typeof v === "number") q[k] = 0;
      else if (typeof v === "string" && v !== "" && !isNaN(+v)) q[k] = "0";
    }
    return { src: q, p: q };
  });
  ok("nullstilli FPL arstidina fer talan i 0 af sjalfu ser (bordinn laeknast an breytingar)",
     PL.staleSeasonRows(resetRows, blind) === 0,
     `fekk ${PL.staleSeasonRows(resetRows, blind)} — bordinn myndi fullyrda um arstidar-tolur sem eru farnar`);

  /* ---- OG TALAN A SKJANUM ER SAMA TALAN ---- */
  await fire(byTab("👥"));
  const sel = [...document.querySelectorAll("select")]
    .find(s => [...s.options].some(o => /\d{4}\/\d{2}/.test(o.textContent)));
  const liveOpt = sel && [...sel.options].find(o => /not started/.test(o.textContent));
  ok("timabils-valarinn ber yfirstandandi timabil merkt '(not started)'", !!liveOpt);
  if (liveOpt) {
    await act(async () => {
      sel.value = liveOpt.value;
      sel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await settle();
    const t = document.body.textContent || "";
    ok(`bordinn birtir MAELDU toluna (${n} of ${players.length}), ekki skrifada`,
       t.includes(`${n} of ${players.length}`),
       "— fost tala i texta ureldist thegjandi");
    /* Neikvaeda fullyrdingin nefnir streng sem VAR sannanlega tharna:
       thetta stod ordrett i bordanum til 16.8.2026.                     */
    ok("...og segir EKKI lengur 'every season field is zero' a skja sem synir tolur",
       !/every season field is zero/i.test(t));
    ok("bordinn nefnir timabilid sem tolurnar tilheyra i raun",
       /still last season's numbers/i.test(t) && /2025\/26/.test(t));
  }
}

/* ============================================================
   5. ALT-SMELLUR A TOLU = THROSKULDUR (21.8.2026)

   SAGAN: smellur a tolu SIADI SJALFUR til 17.8.2026 — hvert einasta
   tolu-holf bar `onClick={() => filterOnValue(d, v)}`, svo EINN smellur a
   239 hja Haaland for listann ur 587 af 587 nidur i 1 af 587. Notandinn:
   "eg smelli a listann og filteringin dettur sjalfkrafa inn". Sian var thvi
   fjarlaegd — og 21.8. bad hann um hana AFTUR ("eg get ekki lengur smellt
   a stats i player stats til ad filtera eftir").

   ThVI ER MIKILVAEGASTA FULLYRDINGIN HER NEIKVAED: BER SMELLUR SIAR EKKI.
   Hun er profud FYRST og a somu holfum sem alt-smellurinn siar sidan, svo
   hun geti ekki verid tom (CLAUDE.md 5b): holfid er sannanlega tharna og
   sannanlega sianlegt — thad er MODIFIER-inn sem er skilyrdid.

   ALLT ER LESID AF SKJANUM: rada-talan ur bordanum ("N of M"), chip-textinn
   og hausamerkid. Rada-talan er RAUNTALAN, ekki thad sem sest — listinn er
   syndarvaeddur og adeins ~24 radir eru i DOM.
   ============================================================ */
{
  console.log("\nALT-SMELLUR A TOLU (throskuldar-sian)");
  const players = J("players.json").players;
  const { STAT_BY_KEY } = await import(new URL("src/stats.js", REPO).href);

  const altFire = async el => {
    await act(async () => {
      el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, altKey: true }));
    });
    await settle();
  };
  /* RAUNTALAN, EKKI SU SYNILEGA: bordinn i hausnum er `sorted.length of
     players.length` — sami bordi sem var thegar til, engin ny talning.  */
  const count = () => {
    const el = [...document.querySelectorAll("div")]
      .map(d => (d.textContent || "").trim())
      .find(t => /^\d+ of \d+ · \d{4}\/\d{2}$/.test(t));
    return el ? +el.split(" of ")[0] : -1;
  };
  const cells = prefix => [...document.querySelectorAll("div[title]")]
    .filter(d => (d.getAttribute("title") || "").startsWith(prefix));
  const thChips = () => [...document.querySelectorAll("button[aria-label]")]
    .filter(b => (b.getAttribute("aria-label") || "").startsWith("Remove filter"));
  const clearAll = () => [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "clear all");

  /* ---- 5a. FORSENDAN: listinn er STOR adur en nokkud er siad ---- */
  const N0 = count();
  ok(`bordinn les rada-tolu og hun er STOR fyrir siun (${N0} af ${players.length})`,
     N0 > 400 && N0 <= players.length,
     "— an thessarar forsendu er 'listinn styttist' ekki maeling");
  ok("engin throskuldar-chip i upphafi", thChips().length === 0);

  /* ---- 5b. BER SMELLUR SIAR EKKI — ThETTA ER AFTURFORIN SJALF ---- */
  /* Radad eftir eignarhaldi (fallandi) svo efsta rodin beri HAMARKID —
     tha er "min <hamark>" harð sia og bilun sest strax.                 */
  ok("hausinn 'Owned %' er til og radar", await clickHeader("Owned %"));
  let own = cells("Ownership %: ");
  ok(`eignarhalds-holf eru i DOM (${own.length}) — holfid sem beri smellurinn hittir`,
     own.length > 5);
  await fire(own[0]);
  ok("BER SMELLUR A TOLU SIAR EKKI (afturforin sem notandinn tilkynnti 17.8.)",
     count() === N0 && thChips().length === 0,
     `— fekk ${count()} af ${N0} og ${thChips().length} chip`);

  /* ---- 5c. ALT-SMELLUR SIAR, `hi:true` -> MIN ---- */
  own = cells("Ownership %: ");
  const ownTop = own[0].getAttribute("title").match(/Ownership %: ([\d.]+)/)?.[1];
  await altFire(own[0]);
  const n1 = count();
  ok(`alt-smellur a haesta eignarhaldid (${ownTop}%) styttir listann: ${N0} -> ${n1}`,
     n1 > 0 && n1 < N0, `— fekk ${n1}`);
  let chip = thChips()[0]?.parentElement?.textContent || "";
  ok(`chipid NEFNIR dalkinn OG throskuldinn ("${chip.replace("✕", "").trim()}")`,
     /Owned %/.test(chip) && /min/.test(chip) && chip.includes(ownTop),
     "— sia sem madur ser ekki hvers vegna er verri en engin sia");
  /* ---- 5d. EITT ✕ SKILAR FULLUM LISTA ---- */
  await fire(thChips()[0]);
  ok(`✕ a chipinu skilar fullum lista (${count()} af ${N0})`,
     count() === N0 && thChips().length === 0);

  /* ---- 5e. `hi:false` SIAR I RETTA ATT: VERD FAER MAX, EKKI MIN ----
     Radad eftir verdi (LAEGRA er betra -> fyrsti smellur gefur asc), svo
     efsta rodin er ODYRASTI madurinn. `>=` a theim manni myndi hleypa
     ollum i gegn og talan stæði i stad — thess vegna er ThESSI rod valin:
     hun greinir attirnar i sundur.                                     */
  ok("hausinn 'Price' er til og radar", await clickHeader("Price"));
  const price = cells("Price: £");
  const pTop = price[0].getAttribute("title").match(/Price: £([\d.]+)/)?.[1];
  await altFire(price[0]);
  const n2 = count();
  chip = thChips()[0]?.parentElement?.textContent || "";
  ok(`verd-chipid segir MAX (£${pTop}), ekki MIN ("${chip.replace("✕", "").trim()}")`,
     /max/.test(chip) && !/min/.test(chip) && chip.includes(pTop),
     "— `>=` a dalki thar sem laegra er betra siar UT einmitt thann sem smellt var a");
  ok(`...og hun siar: ${N0} -> ${n2} (med `+"`>=`"+` a odyrasta manni hefdi hun stadid i stad)`,
     n2 > 0 && n2 < N0, `— fekk ${n2}`);
  await fire(clearAll());
  ok(`"clear all" skilar fullum lista (${count()} af ${N0})`,
     count() === N0 && thChips().length === 0);

  /* ---- 5f. NULL ER EKKI NULL — `?? 0`-GILDRAN UR KAFLA 12 ----
     "GC/90 max 0,00" a ad skila theim sem HAFA toluna og hun er 0 — EKKI
     theim sem eiga hana EKKI. Vaeri vantandi gildi lesid sem 0 (eda syn
     sleppti null-vordinni) faeri talan upp um allan null-hopinn.
     Vaentitalan er reiknud med DALKSINS EIGIN getter — sami kodi, adeins
     annad rada-mengi; hun er thvi ekki endurutfaersla a siunni.         */
  const gcd = STAT_BY_KEY.gc_per_90;
  const vals = players.map(p => { try { return gcd.get(p); } catch { return null; } });
  const nonNull = vals.filter(v => v != null && Number.isFinite(v));
  const zeros = nonNull.filter(v => +v.toFixed(gcd.dec) === 0).length;
  const nulls = players.length - nonNull.length;
  ok(`forsenda: dalkurinn HEFUR tom holf (${nulls} af ${players.length} eiga enga GC/90)`,
     nulls > 0, "— an theirra maelir null-fullyrdingin ekkert");
  ok(`forsenda: og einhver eiga raunverulegt 0,00 (${zeros})`, zeros > 0);
  ok("Defence-flokkurinn opnast", !!byExact("Defence"));
  await fire(byExact("Defence"));
  ok("hausinn 'GC/90' er til og radar (laegra betra -> asc, 0,00 efst)",
     await clickHeader("GC/90"));
  const gc = cells("Conceded per 90: ");
  const gcTop = gc[0]?.getAttribute("title").match(/Conceded per 90: ([\d.]+)/)?.[1];
  ok(`efsta GC/90-holfid er 0.00 (fekk "${gcTop}")`, gcTop === "0.00");
  await altFire(gc[0]);
  const n3 = count();
  ok(`"GC/90 max 0,00" skilar ${zeros} — theim sem HAFA toluna, ekki ${zeros + nulls}`,
     n3 === zeros,
     `— fekk ${n3}; ${zeros + nulls} thydir ad tom holf komust i gegnum <= (`+"`?? 0`"+`-gildran)`);
  /* Hausinn ma ekki thegja heldur: chip-rodin getur legid ofan vid skrunid
     og dalkurinn getur legid i lokudum flokki. GC/90 er DALKUR i toflunni
     (ekki fastur), svo merkid a ad sjast a honum.                       */
  ok("siadur dalkur er merktur i HAUSNUM (▼ a GC/90)",
     [...document.querySelectorAll("div")]
       .some(d => /^▼\s*GC\/90/.test((d.textContent || "").trim())),
     "— sia a dalki i lokudum flokki vaeri annars osynileg i hausnum");
  await fire(clearAll());
  ok(`hreinsad aftur (${count()} af ${N0})`, count() === N0);
}

console.log(`\nLIFANDI DÁLKAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
