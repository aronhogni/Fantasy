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

const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* ============================================================
   REACT ER FLUTT INN *EFTIR* AD `window` ER TIL — OG ThAD ER EKKI
   SMEKKUR (22.8.2026)

   `import`-setningar eru LYFTAR: skrifadar efst keyra thaer ADUR en
   nokkur lina her fyrir ofan hefur sett `globalThis.window`. React-DOM
   reiknar `canUseDOM` VID INNFLUTNING, faer `false`, og af thvi leidir
   `isInputEventSupported = false`. Tha fer ChangeEventPlugin i
   IE8-VARALEIDINA: `input`-atburdir eru HUNSADIR, og hann bregst thess i
   stad vid `focusin`/`keyup` — thar sem hann kallar `attachEvent`, sem er
   ekki til i jsdom og KASTAR.

   ThETTA ER SKYRINGIN A GILDRUNNI SEM CLAUDE.md 5 SKJALFESTIR
   ("Innslattur i styrda React-reiti er otraustur -> forfylltu
   localStorage i stadinn"). Hun er ekki jsdom og hun er ekki React:
   hun er ROD INNFLUTNINGA I PROFINU. Med dynamiskum innflutningi her
   fyrir nedan faer React rettan heim, `input` virkar, og reiturinn i
   tillogu-glugganum er profanlegur eins og notandinn notar hann.
   Maelt: onChange kviknar 0 sinnum med lyftum innflutningi, 1 sinni
   med theim dynamiska — nakvaemlega sama kall, adeins onnur rod.
   ============================================================ */
const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");

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

/* Sja kafla 9: `BAN_ON` kveikir a spjalda-tilfellinu, `BAN_ID` er
   leikmadurinn sem er lyftur i 4 gul spjold. Byrjar SLOKKT.          */
let BAN_ON = false;
const BAN_ID = 115;   /* De Cuyper — haestur i stigum, svo hann er a FYRSTU sidu syndargluggans (leit i listanum er otraust, CLAUDE.md 5) */

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
  /* SPJALDA-MERKID (kafli 9 nedar) tharf leikmann sem er NAERRI BANNI.
     Raungogn i dag bera max 1 gult spjald, svo merkid er RETTILEGA
     osynilegt — og fullyrding um ad thad BIRTIST vaeri tom (CLAUDE.md 5b).
     Vid lyftum ThVI EINUM leikmanni i 4 spjold, og adeins thegar flaggid
     er sett, svo hinar 73 fullyrdingarnar sjai obreytt gogn.          */
  if (n === "players.json" && BAN_ON) {
    const real = J(n);
    return { ok: true, status: 200, json: async () => ({ ...real,
      players: real.players.map(p =>
        p.id === BAN_ID ? { ...p, yellow_cards: 4 } : p) }) };
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

/* ============================================================
   0b. MARKMANNS-DALKARNIR FYLGJA STODU-SIUNNI (25.8.2026)

   Beidni notandans: "Goalkeeping"-bandid (vorslur, vorslur/90, vorslu%,
   vorslud viti) synir "—" hja hverjum utileikmanni og etur larett plass
   fyrir alla hina, svo thad sest adeins thegar stodu-sian er GK.

   PROFAD I DOM OG ThAD ER NAUDSYNLEGT, EKKI VARUD: reglan sjalf er hreint
   fall (`tableDefs`, vardad i stats.test.mjs) en TENGINGIN er `pos` i
   fylgni-lista `visibleCols`-memosins. Gleymist hann er fallið RETT og
   taflan STODNUD — memo sem er ekki endurreiknad er nakvaemlega thoegla
   bilunin sem CLAUDE.md 5b lysir, og HREIN eining getur ekki sed hana.
   Fullyrdingin er thvi: skipta um stodu -> dalkurinn birtist/hverfur.
   ============================================================ */
{
  const heads = () => [...document.querySelectorAll("[aria-sort]")]
    .map(h => h.textContent.replace(/[↑↓▼]|season/g, "").trim());
  await fire(byExact("Defence"));
  const all0 = heads();
  ok(`forsenda: Defence-hausinn er a skjanum (${all0.length} holf)`, all0.length > 4);
  ok("stada \"All\": ENGINN markmanns-dalkur (Saves/Save %/PS)",
     !all0.includes("Saves") && !all0.includes("Save %") && !all0.includes("PS"),
     all0.join(" | "));
  await fire(byExact("GK"));
  const gk = heads();
  ok("stada GK: dalkarnir BIRTAST — memo-id endurreiknast a `pos`",
     gk.includes("Saves") && gk.includes("Save %") && gk.includes("PS"),
     gk.join(" | "));
  await fire(byExact("MID"));
  const mid = heads();
  ok("stada MID: their hverfa aftur",
     !mid.includes("Saves") && !mid.includes("Save %") && !mid.includes("PS"),
     mid.join(" | "));
  /* MOTVOGID: hinir dalkarnir i flokknum standa OSNERTIR, annars vaeri
     "hann hvarf" satt af thvi ad taflan hafi tæmst.                     */
  ok("...og adrir Defence-dalkar standa afram (CS, GC)",
     mid.includes("CS") && mid.includes("GC"), mid.join(" | "));
  await fire(byExact("All"));
}

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

  /* ---- BORDINN SJALFUR ER FARINN (22.8.2026) ----
     Hann var tekinn ut ad beidni notandans: skilyrdid var `finishedGw === 0`
     og umferd telst ekki "finished" fyrr en hun er stadfest med bonus, svo
     hann sagdi "2026/27 has not started" medan sex GW1-leikir voru bunir.
     FALLID stendur afram og er varid her ad ofan — reglan sem thad ber
     (arstidar-summa getur ekki verid fra obyrjudu timabili) er rett thott
     enginn bordi segi hana lengur. DOM-hlutinn faerdist i kafla 5, sem
     spyr thess sem eftir stendur: HVADA timabil er valid.               */
}

/* ============================================================
   5. SJALFGEFNA TIMABILID — "BYRJAD" ER EKKI "LOKID" (22.8.2026)

   Notandinn: "eg vill hafa nyjasta timabilid auto valid allstadar, og eg
   thurfti ad velja til baka ef eg vill sja thad."

   Sjalfgildid keyrdi a `finishedGw === 0` og datt thvi a ARKIVID. Umferd
   telst ekki `finished` hja FPL fyrr en hun er stadfest med bonus, dogum
   a eftir sidasta leik — svo GW1 2026/27 ber `finished: false` medan sex
   leikir eru bunir, og appid valdi 2025/26 fyrir mann.

   FORSENDAN ER MAELD HER, EKKI GEFIN. Prófið les `events.json` og
   fullyrdir baedi ad ENGIN umferd se `finished` OG ad ad minnsta kosti ein
   se byrjud. An fyrra lidarins vaeri "nyjasta timabilid er valid" satt af
   gomlu astaedunni lika og prófið maeldi ekki neitt — nakvaemlega gildran
   i CLAUDE.md 5b. Falli forsendan (FPL stadfestir GW1) segir prófið thad
   berum ordum i stad thess ad verda thogult.
   ============================================================ */
{
  console.log("\nSJALFGEFNA TIMABILID");
  const events = J("events.json");
  const evs = Array.isArray(events) ? events : (events.events || []);
  const nFinished = evs.filter(e => e.finished).length;
  const now = Date.now();
  const nStarted = evs.filter(
    e => e.finished || e.is_current
      || (e.deadline_time && Date.parse(e.deadline_time) <= now)).length;
  const y = new Date(evs.find(e => e.id === 1)?.deadline_time).getFullYear();
  const CUR = `${y}/${String((y + 1) % 100).padStart(2, "0")}`;

  ok(`forsenda A: ad minnsta kosti ein umferd er BYRJUD (${nStarted})`,
     nStarted > 0,
     "— i alvoru forleik er ekkert ad maela og sjalfgildid A ad vera arkivid");
  /* ============================================================
     FORSENDA B FELL 26.8.2026 — OG PROFID SAGDI ThAD SJALFT
     ============================================================
     Hér stod `ok(..., nFinished === 0, ...)` med skilabodum sem sogdu
     ordrett: "FPL hefur stadfest umferd: gamla skilyrdid gaefi nu sama
     svar, svo thessi kafli greinir ekki lengur utfaerslurnar i sundur."
     Nakvaemlega thad gerdist: FPL flettu `finished: true` a GW1 um
     nottina (maelt: 1 umferd `finished`, `data_checked: true`), og
     forsendan getur ALDREI ordid sonn aftur a thessu timabili.

     Fullyrding sem er bundin vid FORGENGILEGT astand i `data/` er ekki
     vordur heldur klukka. Greiningin — ad NYJA reglan telji umferd sem
     ER BYRJUD en OSTADFEST, thar sem gamla reglan taldi hana ekki —
     er flutt a TILBUIN inntok, thar sem hun er sonn ad eilifu og
     ohad thvi hvad FPL gerdi i nott. Sama regla og allur annar kodi
     sem kviknar a einum degi (CLAUDE.md kafli 5).

     LIFANDI HLUTINN STENDUR OBREYTTUR hér ad nedan: valarinn verdur
     afram ad standa a yfirstandandi timabili. Thad er thad sem
     notandinn bad um og thad er maelanlegt hvern dag. */
  {
    const { startedGameweeks } = await import("../src/availability.js");
    const T0 = Date.parse("2026-08-22T12:00:00Z");
    /* Umferd 1: FRESTURINN LIDINN, `is_current`, EKKI stadfest — thetta
       er glugginn sem varir ~3 daga eftir hverja umferd. */
    const synth = [
      { id: 1, finished: false, is_current: true,  deadline_time: "2026-08-21T17:30:00Z" },
      { id: 2, finished: false, is_current: false, deadline_time: "2026-08-28T17:30:00Z" },
    ];
    const oldRule = synth.filter(e => e.finished).length;      // gamla skilyrdid
    const newRule = startedGameweeks(synth, T0);               // thad sem keyrir
    ok(`forsenda B (TILBUIN): gamla skilyrdid telur ${oldRule}, nyja ${newRule}`
       + " — utfaerslurnar ERU greindar i sundur",
       oldRule === 0 && newRule === 1,
       "— an thessa vaeri 'nyjasta timabilid valid' satt af gomlu astaedunni lika");
    /* OG HIN ATTIN: umferd sem er hvorki byrjud ne stadfest ma ALDREI
       teljast — annars vaeri nyja reglan einfaldlega laus. */
    ok("og umferd sem er OBYRJUD telst ekki byrjud",
       startedGameweeks([{ id: 1, finished: false, is_current: false,
                           deadline_time: "2026-09-30T17:30:00Z" }], T0) === 0);
  }

  await fire(byTab("👥"));
  const sel = [...document.querySelectorAll("select")]
    .find(x => [...x.options].some(o => /^\d{4}\/\d{2}/.test(o.textContent.trim())));
  ok("timabils-valarinn er a skjanum", !!sel);
  /* LESID AF SKJANUM: `sel.value` er thad sem notandinn ser valid.       */
  ok(`nyjasta timabilid (${CUR}) er sjalfvalid — ekki arkivid`,
     sel?.value === CUR, `— fekk "${sel?.value}"`);
  /* HANN A AD GETA VALID TIL BAKA — thad var seinni helmingurinn af
     beidninni og an hans vaeri "nyjasta" ekki sjalfgildi heldur thvingun. */
  const older = sel ? [...sel.options].map(o => o.value).filter(v => v !== CUR) : [];
  ok(`...og eldri timabil eru afram i boði (${older.length}: ${older.slice(0, 3).join(", ")})`,
     older.length >= 2);
  /* MERKIMIDINN SEM VAR RANGUR: "(not started)" a byrjudu timabili.
     Fullyrdingin er JAKVAED (nakvaem jafna a textanum), ekki `!includes`
     — neikvaed fullyrding um streng sem er ekki lengur til getur ekki
     brugdist (CLAUDE.md 5b regla 2).                                    */
  const curOpt = sel && [...sel.options].find(o => o.value === CUR);
  ok(`valkosturinn heitir nakvaemlega "${CUR}" — enginn "(not started)"-vidauki`,
     curOpt?.textContent.trim() === CUR, `— fekk "${curOpt?.textContent.trim()}"`);

  /* ThUNNKAN ER SOGD, EKKI FALIN. Notandinn bad um nyjasta timabilid og
     faer thad; kostnadurinn (litid urtak) verdur ad SJAST i stad thess ad
     appid hunsi valid hans. Talan er MAELD ur `events.json`, svo hun vex
     sjalf og hverfur eftir GW5.                                         */
  const t0 = document.body.textContent || "";
  const wantTag = nStarted === 1 ? "GW1 only" : `GW1–${nStarted} only`;
  ok(`thunnt urtak er MERKT a skjanum ("${wantTag}")`,
     nStarted >= 5 || t0.includes(wantTag),
     `— urtakid er ${nStarted} umferd(ir) og notandinn a ad sja thad`);

  /* OG "TIL BAKA" VIRKAR: arkivid ber sitt eigid merki.                 */
  if (older.length) {
    await act(async () => {
      sel.value = older[0];
      sel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await settle();
    const t1 = document.body.textContent || "";
    ok(`val til baka (${older[0]}) merkir sig "historical numbers"`,
       t1.includes("historical numbers"));
    ok("...og thunnka-merkid vikur thegar timabilid er fullt",
       !t1.includes(wantTag) || nStarted >= 5);
    await act(async () => {
      sel.value = CUR;
      sel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await settle();
  }
}

/* ============================================================
   6. BER SMELLUR A TOLU = TILLAGA AD SIU (22.8.2026)

   ThRIDJA UTGAFAN AF SAMA EIGINLEIKA, OG ThRIDJA KVORTUNIN:
     · til 17.8.  ber smellur BEITTI siunni strax  -> "eg smelli a listann
       og filteringin dettur sjalfkrafa inn" (587 -> 1 i einum smell)
     · 21.8.      alt-smellur                      -> "eg get ekki enn ytt
       a akvedid stats til ad filtera eftir thvi"  (og i thridja sinn:
       "afhverju get eg ekki filterad leikmann i player stats!!!!!")
     · 22.8.      ber smellur opnar TILLOGU sem madur beitir sjalfur

   ROTIN VAR EIN LINA: `if (!e?.altKey) return;` i `cellFilterClick`. Bert
   ekkert gerdist — og `cellHit` setti samt `cursor:pointer` a hvert einasta
   holf, svo bendillinn lofadi smell sem var hardur no-op.

   OG HER STOD PROF SEM VARDI VILLUNA — LESTU ThETTA ADUR EN ThU SNYRD ThVI
   VID AFTUR. Kafli 5 i thessari skra bar aður fullyrdinguna
       ok("BER SMELLUR A TOLU SIAR EKKI (afturforin sem notandinn tilkynnti
           17.8.)", count() === N0 && thChips().length === 0)
   og hun var GRAEN. Hun var rett skrifud, hun maeldi thad sem hun sagdist
   maela — og hun negldi afturforina fasta: hver sa sem hefdi lagad berann
   smell hefdi fellt safnid og talid sig hafa gert villu.
   KVORTUNIN 17.8. VAR EKKI "smellur ma ekki sia". Hun var: **smellur til
   ad LESA rod ma ekki beita siu i thogn.** Svarid vid ThVI er TILLAGAN —
   gluggi sem breytir engu fyrr en ytt er a Apply — EKKI ad slokkva a
   smellinum. Kafli 6b heldur badum kroffum i einum smelli, hlid vid hlid,
   svo thaer geti ekki verid teknar i sundur aftur.

   FULLYRDINGARNAR HER ERU LESNAR AF SKJANUM MED RAUNVERULEGUM CLICK-
   ATBURDI, ekki med thvi ad kalla a handlerinn: prófið sem var her adur
   fullyrti ad ber smellur GERDI EKKERT og var graent — thad er nakvaemlega
   thad sem let villuna lifa af eina lagfaeringu.

   TVAER KROFUR TOGAST A OG BADAR ERU PROFADAR:
     A) BER SMELLUR VERDUR AD SVARA        (17.8.-utgafan fell ekki a thvi,
                                            21.8.-utgafan fell a thvi)
     B) HANN MA EKKI BREYTA LISTANUM SJALFUR (17.8.-utgafan fell a thvi)
   Thaer eru ekki i motsogn: smellurinn opnar tillogu, Apply beitir henni.
   ============================================================ */
{
  console.log("\nBER SMELLUR A TOLU (tillaga ad siu)");
  const players = J("players.json").players;
  const { STAT_BY_KEY } = await import(new URL("src/stats.js", REPO).href);

  /* RAUNTALAN, EKKI SU SYNILEGA: bordinn i hausnum er `sorted.length of
     players.length` — sami bordi sem var thegar til, engin ny talning.
     Hann ber nu lika merki (thunnt urtak, smell-abending), svo akkerid er
     BYRJUN strengsins og INNSTA div-id (`at(-1)`), ekki nakvaem jafna.  */
  const count = () => {
    const t = [...document.querySelectorAll("div")]
      .map(d => (d.textContent || "").trim())
      .filter(x => /^\d+ of \d+ · \d{4}\/\d{2}/.test(x)).at(-1);
    return t ? +t.split(" of ")[0] : -1;
  };
  const cells = prefix => [...document.querySelectorAll("div[title]")]
    .filter(d => (d.getAttribute("title") || "").startsWith(prefix));
  const thChips = () => [...document.querySelectorAll("button[aria-label]")]
    .filter(b => (b.getAttribute("aria-label") || "").startsWith("Remove filter"));
  const clearAll = () => [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "clear all");
  /* TILLOGU-GLUGGINN er auðkenndur a HLUTVERKI + heiti, ekki a stil.    */
  const pop = () => [...document.querySelectorAll("[role=dialog]")]
    .find(d => d.getAttribute("aria-label") === "Filter on this value") || null;
  const popBtn = t => pop() && [...pop().querySelectorAll("button")]
    .find(b => b.textContent.trim() === t);
  const popInput = () => pop()?.querySelector("input") || null;
  const setPopVal = async v => {
    const el = popInput();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        dom.window.HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    await settle();
  };
  const press = async key => {
    await act(async () => {
      document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true }));
    });
    await settle();
  };

  await fire(byTab("👥"));
  /* ---- 6a. FORSENDUR ---- */
  const N0 = count();
  ok(`bordinn les rada-tolu og hun er STOR fyrir siun (${N0} af ${players.length})`,
     N0 > 400 && N0 <= players.length,
     "— an thessarar forsendu er 'listinn styttist' ekki maeling");
  ok("engin throskuldar-chip i upphafi", thChips().length === 0);
  ok("enginn tillogu-gluggi i upphafi", pop() === null);
  /* AFFORDANCE: bendillinn logadi smell allan timann; nu segir skjarinn
     thad lika BERUM ORDUM. Fullyrdingin er jakvaed og strengurinn er
     sannanlega tharna — hun er sidar profud i hina attina (6h).        */
  ok('skjarinn segir hvad ma gera ("click a number to filter")',
     (document.body.textContent || "").includes("click a number to filter"),
     "— eiginleiki sem finnst ekki er verri en 44 px af skruni (CLAUDE.md 8)");

  /* ---- 6b. BER SMELLUR SVARAR — OG BREYTIR ENGU ----
     BAÐAR fullyrdingarnar i einum smelli, thvi thaer eru sitt hvor helmingur
     af sömu akvordun og hvorug ein er nog.                              */
  ok("hausinn 'Owned %' er til og radar", await clickHeader("Owned %"));
  let own = cells("Ownership %: ");
  ok(`eignarhalds-holf eru i DOM (${own.length}) — holfid sem smellurinn hittir`,
     own.length > 5);
  const ownTop = own[0].getAttribute("title").match(/Ownership %: ([\d.]+)/)?.[1];
  await fire(own[0]);
  ok(`BER SMELLUR A "${ownTop}%" OPNAR TILLOGU (rotin: \`if (!e?.altKey) return\`)`,
     pop() !== null,
     "— thetta er villan sem notandinn tilkynnti ThRISVAR");
  ok("...og hann BREYTIR ENGU af sjalfu ser (17.8.-villan kemur ekki aftur)",
     count() === N0 && thChips().length === 0,
     `— fekk ${count()} af ${N0} og ${thChips().length} chip`);

  /* ---- 6c. TILLAGAN ER FORFYLLT UR TOLUNNI SEM SMELLT VAR A ---- */
  /* TOLULEGUR SAMANBURDUR, EKKI STRENGJA (24.8.2026). Fullyrdingin bar
     `value === ownTop` og fell eftir ad gogn voru endurnyjud: efsta
     eignarhaldid vard slett tala, svo tooltip-id syndi "69.0" (snidid med
     `dec: 1`) medan reiturinn ber `+v.toFixed(1)` = talan **69**. Sama tala,
     annad snid — og fullyrdingin var thvi had ThVI HVORT gildid aetti
     aukastaf, ekki hegduninni sem hun heitir eftir. Hun var GRAEN i gaer og
     RAUD i dag an thess ad neinn kodi breyttist.
     Samningurinn er "tillagan ber toluna sem smellt var a"; talan er sama
     talan. Snidid a reitnum er ekki hluti af honum — hann er ritanlegur og
     notandinn slaer hvort ed er sina eigin tolu.                        */
  const clicked = Number.parseFloat(ownTop);
  const inVal = Number.parseFloat(popInput()?.value ?? "");
  ok(`tillagan ber toluna sem smellt var a (${ownTop})`,
     Number.isFinite(inVal) && Number.isFinite(clicked)
     && Math.abs(inVal - clicked) < 1e-9,
     `— fekk "${popInput()?.value}"`);
  ok("tillagan nefnir dalkinn (Owned %)",
     /Owned %/.test(pop()?.textContent || ""));
  ok("`hi:true` -> hun opnast a MIN",
     popBtn("min")?.getAttribute("aria-pressed") === "true"
     && popBtn("max")?.getAttribute("aria-pressed") === "false");

  /* ---- 6d. APPLY BEITIR HENNI ---- */
  await fire(popBtn("Apply filter"));
  const n1 = count();
  ok(`"Apply filter" styttir listann: ${N0} -> ${n1}`, n1 > 0 && n1 < N0, `— fekk ${n1}`);
  ok("...og tillogu-glugginn lokast", pop() === null);
  let chip = thChips()[0]?.parentElement?.textContent || "";
  ok(`chipid NEFNIR dalkinn OG throskuldinn ("${chip.replace("✕", "").trim()}")`,
     /Owned %/.test(chip) && /min/.test(chip) && chip.includes(ownTop),
     "— sia sem madur ser ekki hvers vegna er verri en engin sia");
  await fire(thChips()[0]);
  ok(`✕ a chipinu skilar fullum lista (${count()} af ${N0})`,
     count() === N0 && thChips().length === 0);

  /* ---- 6e. CANCEL OG ESC LOKA AN ThESS AD SIA ----
     ThETTA ER OFUGA KRAFAN VID 6d og hun er thad sem gerir berann smell
     oruggan: madur ma smella a tolu til ad LESA rod.                    */
  own = cells("Ownership %: ");
  await fire(own[0]);
  ok("tillaga opin fyrir Cancel", pop() !== null);
  await fire(popBtn("Cancel"));
  ok("Cancel lokar OG siar ekki",
     pop() === null && count() === N0 && thChips().length === 0,
     `— fekk ${count()} af ${N0}, ${thChips().length} chip`);
  await fire(cells("Ownership %: ")[0]);
  ok("tillaga opin fyrir Esc", pop() !== null);
  await press("Escape");
  ok("Esc lokar OG siar ekki",
     pop() === null && count() === N0 && thChips().length === 0);

  /* ---- 6f. `hi:false` OPNAST A MAX, OG ATTINNI MA SNUA ----
     Radad eftir verdi (LAEGRA er betra -> fyrsti smellur gefur asc), svo
     efsta rodin er ODYRASTI madurinn. `>=` a theim manni hleypir ollum i
     gegn og talan stæði i stad — thess vegna er ThESSI rod valin: hun
     greinir attirnar i sundur.                                          */
  ok("hausinn 'Price' er til og radar", await clickHeader("Price"));
  const price = cells("Price: £");
  const pTop = price[0].getAttribute("title").match(/Price: £([\d.]+)/)?.[1];
  await fire(price[0]);
  ok(`verd-tillagan opnast a MAX (£${pTop}), ekki MIN`,
     popBtn("max")?.getAttribute("aria-pressed") === "true"
     && popBtn("min")?.getAttribute("aria-pressed") === "false",
     "— `>=` a dalki thar sem laegra er betra siar UT einmitt thann sem smellt var a");
  await fire(popBtn("Apply filter"));
  const n2 = count();
  chip = thChips()[0]?.parentElement?.textContent || "";
  ok(`verd-chipid segir MAX (£${pTop}) ("${chip.replace("✕", "").trim()}")`,
     /max/.test(chip) && !/min/.test(chip) && chip.includes(pTop));
  ok(`...og hun siar: ${N0} -> ${n2} (med `+"`>=`"+` a odyrasta manni hefdi hun stadid i stad)`,
     n2 > 0 && n2 < N0, `— fekk ${n2}`);
  await fire(clearAll());
  ok(`"clear all" skilar fullum lista (${count()} af ${N0})`,
     count() === N0 && thChips().length === 0);

  /* ATTINNI MA SNUA — thad var beidnin ordrett ("filter MOGULEIKI sem eg
     get svo breytt"). Sama holf, ONNUR att: "min" a odyrasta manninum
     hleypir ollum i gegn, svo talan stendur i stad OG chipid segir min.
     Talan sem stendur i stad er hér RETT svar, ekki bilun — thess vegna
     er chip-textinn profadur lika.                                      */
  await fire(cells("Price: £")[0]);
  await fire(popBtn("min"));
  await fire(popBtn("Apply filter"));
  chip = thChips()[0]?.parentElement?.textContent || "";
  ok(`attinni ma snua i tillogunni: sama holf gefur nu MIN ("${chip.replace("✕", "").trim()}")`,
     /min/.test(chip) && !/max/.test(chip));
  await fire(clearAll());

  /* ---- 6g. TALAN ER RITANLEG, OG TOMUR REITUR BEITIR ENGU ----
     `+"" === 0` og `Number.isFinite(0)` er satt, svo bert
     `Number.isFinite(+v)` hefdi beitt "min 0" a tomum reit — sia sem litur
     ut fyrir ad virka og heldur ollum. `validThreshold` er vordurinn.   */
  const PL2 = await import(new URL("src/PlayerList.jsx", REPO).href);
  ok("`validThreshold` hafnar tomum reit (`+\"\" === 0` gildran)",
     PL2.validThreshold("") === false && PL2.validThreshold("  ") === false
     && PL2.validThreshold(null) === false && PL2.validThreshold("12.5") === true);
  await fire(cells("Ownership %: ")[0]);
  await setPopVal("");
  ok("tomur reitur slekkur a Apply", popBtn("Apply filter")?.disabled === true);
  await fire(popBtn("Apply filter"));
  ok("...og smellur a hann siar ekkert",
     count() === N0 && thChips().length === 0);
  /* OG RITUD TALA GILDIR — annars vaeri "sem eg get svo breytt" osatt.
     Valid er tala sem er SANNANLEGA harðari en sjalfgildid, svo hun geti
     ekki gefid sömu utkomu fyrir tilviljun.                             */
  await setPopVal("50");
  ok("rituð tala kveikir aftur a Apply", popBtn("Apply filter")?.disabled === false);
  await fire(popBtn("Apply filter"));
  const n4 = count();
  chip = thChips()[0]?.parentElement?.textContent || "";
  ok(`ritud tala er ThAD sem sian notar ("${chip.replace("✕", "").trim()}" -> ${n4})`,
     chip.includes("50") && n4 > 0 && n4 < N0, `— fekk ${n4}`);
  /* ABENDINGIN VIKUR ThEGAR HUN ER SONNUD — hin attin a 6a.            */
  ok('abendingin hverfur thegar sia er komin ("click a number to filter")',
     !(document.body.textContent || "").includes("click a number to filter"));
  await fire(clearAll());
  ok(`hreinsad aftur (${count()} af ${N0})`, count() === N0);

  /* ---- 6h. TOMT HOLF OPNAR ENGA TILLOGU ----
     "Engin gogn" er ekki tala og throskuldur ur henni vaeri tilbuningur.
     Forsendan er MAELD: dalkurinn verdur ad HAFA tom holf, annars maelir
     fullyrdingin ekkert (CLAUDE.md 5b).                                 */
  const gcd = STAT_BY_KEY.gc_per_90;
  const vals = players.map(p => { try { return gcd.get(p); } catch { return null; } });
  const nulls = players.length - vals.filter(v => v != null && Number.isFinite(v)).length;
  ok(`forsenda: GC/90 hefur tom holf (${nulls} af ${players.length})`, nulls > 0);
  ok("Defence-flokkurinn opnast", !!byExact("Defence"));
  await fire(byExact("Defence"));
  ok("hausinn 'GC/90' er til og radar (laegra betra -> asc)", await clickHeader("GC/90"));
  /* Rodun i hina attina fleytir tomu gildunum ekki upp (null radast alltaf
     sidast), svo tomt holf er sott beint: title-ið er "<heiti>: no data". */
  const empty = [...document.querySelectorAll("div[title]")]
    .filter(d => /: no data$/.test(d.getAttribute("title") || ""));
  ok(`tom holf eru i DOM (${empty.length})`, empty.length > 0);
  if (empty.length) {
    await fire(empty[0]);
    ok("smellur a TOMT holf opnar enga tillogu og siar ekkert",
       pop() === null && count() === N0 && thChips().length === 0);
  }

  /* ---- 6i. NULL ER EKKI NULL — `?? 0`-GILDRAN UR KAFLA 12 ----
     "GC/90 max 0,00" a ad skila theim sem HAFA toluna og hun er 0 — EKKI
     theim sem eiga hana EKKI. Vaentitalan er reiknud med DALKSINS EIGIN
     getter; hun er thvi ekki endurutfaersla a siunni.                   */
  const nonNull = vals.filter(v => v != null && Number.isFinite(v));
  const zeros = nonNull.filter(v => +v.toFixed(gcd.dec) === 0).length;
  ok(`forsenda: einhver eiga raunverulegt 0,00 (${zeros})`, zeros > 0);
  const gc = cells("Conceded per 90: ");
  const gcTop = gc[0]?.getAttribute("title").match(/Conceded per 90: ([\d.]+)/)?.[1];
  ok(`efsta GC/90-holfid er 0.00 (fekk "${gcTop}")`, gcTop === "0.00");
  await fire(gc[0]);
  await fire(popBtn("Apply filter"));
  const n3 = count();
  ok(`"GC/90 max 0,00" skilar ${zeros} — theim sem HAFA toluna, ekki ${zeros + nulls}`,
     n3 === zeros,
     `— fekk ${n3}; ${zeros + nulls} thydir ad tom holf komust i gegnum <= (`+"`?? 0`"+`-gildran)`);
  /* Hausinn ma ekki thegja heldur: chip-rodin getur legid ofan vid skrunid
     og dalkurinn getur legid i lokudum flokki. GC/90 er DALKUR i toflunni
     (ekki fastur), svo merkid a ad sjast a honum — fostu dalkarnir (Verd,
     Owned %) eru alltaf synilegir og bera thad ekki.                    */
  ok("siadur dalkur er merktur i HAUSNUM (▼ a GC/90)",
     [...document.querySelectorAll("div")]
       .some(d => /^▼\s*GC\/90/.test((d.textContent || "").trim())),
     "— sia a dalki i lokudum flokki vaeri annars osynileg i hausnum");
  await fire(clearAll());
  ok(`hreinsad aftur (${count()} af ${N0})`, count() === N0);
}

/* ============================================================
   9. GULT SPJALD I LISTANUM — SOFNUN, ALDREI "I BANNI" (25.8.2026)

   Notandinn: "baeta vid gulu spjaldi a playerinn sjalfann ... ef hann
   nalgast bann vegna spjalda" — OG hann gaf sjalfur skordunina:
   "menn taka ut bonn i sumum bikarleikjum ... og thvi ekki verid i banni
   i naesta deildarleik (thad eina sem fantasy appid skodar)."

   ThAD ER ThVI TVENNT SEM ER VARIÐ HER, OG ThAD SEINNA ER ThAD SEM
   AUDVELT ER AD BRJOTA SEINNA:
     (a) merkid BIRTIST thegar madur er einu spjaldi fra banni
     (b) thad segir ALDREI ad hann se i banni, og raud spjold reka thad
         EKKI — vid getum ekki vitad hvort bann var teki ut i bikarleik,
         svo FPL-status er einratt (CLAUDE.md 6).

   NEGATIFA TILFELLID ER MAELT, EKKI GEFID: raungogn i dag bera max 1
   gult spjald (maelt), svo merkid er rettilega hvergi — og ThAD er
   ástæðan fyrir ad positiva tilfellid tharf tilbuinn leikmann.
   ============================================================ */
console.log(`\n${"\u2500".repeat(72)}\n9. GULT SPJALD — SOFNUN, EKKI BANN\n${"\u2500".repeat(72)}`);
{
  const MARK = "\u25AE";
  /* --- negatift, a RAUNGOGNUM --- */
  const before = (document.body.textContent || "").split(MARK).length - 1;
  const maxY = Math.max(...J("players.json").players.map(p => +p.yellow_cards || 0));
  ok(`forsenda: raungogn bera max ${maxY} gult spjald, svo merkid a ad vera hvergi`,
    maxY < 4 && before === 0, `${before} merki`);

  /* --- positift, med TILBUNUM leikmanni (4 spjold -> einu fra banni) --- */
  BAN_ON = true;
  const host2 = document.createElement("div");
  host2.id = "root2";
  document.body.appendChild(host2);
  const root2 = createRoot(host2);
  await act(async () => { root2.render(React.createElement(App)); });
  await act(async () => { await new Promise(r => setTimeout(r, 400)); });
  const goPlayers = [...host2.querySelectorAll("button")]
    .find(b => (b.textContent || "").trim().startsWith("\uD83D\uDC65"));
  if (goPlayers) await act(async () => {
    goPlayers.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  await act(async () => { await new Promise(r => setTimeout(r, 300)); });
  const txt2 = host2.textContent || "";
  const marks = txt2.split(MARK).length - 1;
  ok(`leikmadur einu spjaldi fra banni FAER merkid (${marks})`, marks >= 1);

  /* ORDALAGID: merkid ma ekki segja "suspended", og ver ad nefna ad
     FPL-status se thad sem raedur. Titillinn er lesinn AF ELEMENTINU. */
  const markEl = [...host2.querySelectorAll("span")]
    .find(e => (e.textContent || "").trim() === MARK);
  const ttl = markEl?.getAttribute("title") || "";
  ok("merkid er a skjanum sem element med titli", !!markEl && ttl.length > 20, ttl.slice(0, 40));
  ok("titillinn segir SPJALDA-SOFNUN, ekki bann",
    /accumulation/i.test(ttl) && !/\bis suspended\b/i.test(ttl), ttl.slice(0, 70));
  ok("og hann nefnir ad FPL-status se thad sem raedur",
    /FPL status/i.test(ttl), ttl.slice(0, 70));
  ok("og hann nefnir bikarleikinn sem vid getum ekki sed",
    /cup match/i.test(ttl), ttl.slice(-70));

  /* RAUD SPJOLD REKA ThAD EKKI — hvergi i PlayerList ma bann leidast af
     `red_cards`. Lesid ur upprunanum thvi thetta er FJARVERA.          */
  const src = readFileSync(new URL("src/PlayerList.jsx", REPO), "utf8");
  ok("PlayerList leidir ALDREI bann af `red_cards`",
    !/red_cards[\s\S]{0,80}(ban|suspend)/i.test(src));

  await act(async () => { root2.unmount(); });
  host2.remove();
  BAN_ON = false;
}

console.log(`\nLIFANDI DÁLKAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
