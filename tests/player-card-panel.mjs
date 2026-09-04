/* ============================================================
   LEIKMANNASPJALDID — FJORAR BREYTINGAR BEDNAR 25.8.2026, LESNAR AF SKJANUM

   HVERS VEGNA SER SKRA OG EKKI VIDBOT VID `smoke.test.mjs`: hvert tilfelli
   her tharf SITT EIGID `events.json` og/eda `players.json` (timabil byrjad
   a moti forleik, felag sem hefur spilad EINN leik a moti engum, leikmadur
   sem er ad falla i verdi a moti einum sem er laestur). Smoke-safnid
   teiknar appid EINU SINNI med fostu astandi. Sama rok og haus
   `planner-pitch.mjs` ber: safn sem tharf margar hledslur med olikum
   forsendum er annad safn, annars fara forsendurnar ad skarast og hver
   fullyrding maelir eitthvad annad en hun segir.

   KAFLAR
     A  „St%" HLIDID     — reiturinn hverfur thegar urtakid er of litid
                           (`rot.level === "low"`), og BIRTIST thegar thad
                           er nog. BADAR attir, thvi „hann er ekki their"
                           eitt og ser er satt lika ef reiturinn er aldrei til
     B  TIMABILID EFST   — `SeasonSoFar`: tolur ur `players.json`, per-umferdar
                           tafla, og heidarlegt tomt astand (ENGIN nulltala)
     C  FORLEIKS-TEXTAR  — hverfa vid klukkuna, og forsendan synir ad their
                           VORU their i hinu astandinu
     D  VERDFALL         — FPL-s EIGIN tala, oskolud; merki adeins thegar
                           hun er halfa leid nidur; LAS slekkur a merkinu

   ThRJAR REGLUR SEM ThETTA SAFN FYLGIR
     1. TOLUR ERU BORNAR VID HEIMILDINA, ekki hardkodadar. `rotationRisk`
        er FLUTT INN og DOM-id borid vid hana — endurritud regla her vaeri
        annad likan en appid keyrir (CLAUDE.md 7).
     2. HVER NEIKVAED FULLYRDING NEFNIR STRENG SEM VAR SANNANLEGA ThAR
        (CLAUDE.md 5b regla 2): forleiks-textarnir eru fyrst SYNDIR i
        forleiks-astandinu og svo fullyrt ad their seu farnir.
     3. ThEKJA ER FULLYRDING, EKKI LOGGA: kaflar sem telja upp menn fella
        ef talan hrynur i null.

   Keyrsla:
     node --import "data:text/javascript,import{register}from\"node:module\";\
register(\"<repo>/tests/jsx-loader.mjs\",\"file://<repo>/tests/\")" \
       tests/player-card-panel.mjs
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { rotationRisk, matchesPlayedByClub, planningGw } from "../src/availability.js";
import { priceChangeOf, PRICE_FALL_MARK } from "../src/PlayerPanel.jsx";

let pass = 0, fail = 0;
const ok = (c, n, x = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                 : (fail++, console.log(`  ✗ ${n}${x ? "   " + x : ""}`)); };
const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

const PLAYERS_FILE = J("players.json");
const ALL = PLAYERS_FILE.players;
const byId = {}; ALL.forEach(p => byId[p.id] = p);
const EVENTS = J("events.json");
const FIX = J("fixtures.json");

/* PROFLIDID ER ThAD SAMA OG I `smoke.test.mjs` og `planner-pitch.mjs`. */
const START_IDS = [496,11,356,423,542,397,426,239,368,411,346,497,173,278,321];

const realSetTimeout = globalThis.setTimeout;
const sleep = ms => new Promise(r => realSetTimeout(r, ms));
const NANRE = /\bNaN\b|\bundefined\b/;

async function mount(state, { patch = null } = {}) {
  const dom = new JSDOM("<!doctype html><div id=root></div>",
    { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.innerWidth = 1280;
  if (!("oninput" in dom.window.HTMLElement.prototype))
    for (const ev of ["oninput", "onchange"])
      Object.defineProperty(dom.window.HTMLElement.prototype, ev, {
        get() { return null; }, set() {}, configurable: true });
  if (state) dom.window.localStorage.setItem("fpl_planner_v3", JSON.stringify(state));
  const orig = console.error;
  console.error = (...a) => { const m = String(a[0] ?? ""); if (!/not wrapped in act|Warning:/.test(m)) orig(...a); };
  globalThis.fetch = async u => {
    const s = String(u);
    const n = s.split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => ({}) };
    if (patch && patch[n]) return { ok: true, status: 200, json: async () => patch[n] };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("no"); } }; }
  };
  const { default: App } = await import("../src/App.jsx");
  const root = createRoot(dom.window.document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await sleep(340); });
  console.error = orig;
  const doc = dom.window.document;
  const v = {
    doc,
    text: () => doc.body.textContent || "",
    q: s => [...doc.querySelectorAll(s)],
    click: async el => {
      await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
      await act(async () => { await sleep(60); });
    },
  };
  /* SPJALD OPNAD UM i-HNAPPINN A VELLINUM — sama leid og notandinn fer.
     Gengid UPP fra hnappnum thar til textinn ber nafnid, en STODVAD vid
     spjalds-staerd: an thess passar hnappur naesta manns vid nafn i sömu
     rod (gildran sem `dc-hit-display.mjs` skjalar).                     */
  v.openCard = async name => {
    for (const b of v.q("button").filter(x => (x.textContent || "").trim() === "i")) {
      let el = b;
      for (let i = 0; i < 4 && el; i++, el = el.parentElement) {
        const t = el.textContent || "";
        if (t.length > 220) break;
        if (t.includes(name)) { await v.click(b); return true; }
      }
    }
    return false;
  };
  /* MODALINN — staersta hylkid sem ber lokunar-hnappinn. `text()` er
     ONYTT her: vollurinn og listinn nefna sömu menn.                    */
  v.card = () => {
    const x = v.q("button").filter(b => (b.textContent || "").trim() === "✕").at(-1);
    let el = x;
    while (el && (el.textContent || "").length < 400) el = el.parentElement;
    return el ? (el.textContent || "") : "";
  };
  return v;
}

/* FORLEIKS-KLUKKA: enginn frestur lidinn, engin umferd byrjud. Sama form
   og `playedEvents` en i HINA attina — su skrifta byggir BYRJAD timabil.  */
const DAY = 86400000;
const preseasonEvents = () => (EVENTS.events || EVENTS).map((e, i) => ({
  ...e, finished: false, data_checked: false,
  is_current: false, is_next: e.id === 1, is_previous: false,
  deadline_time: new Date(Date.now() + (i + 1) * 7 * DAY).toISOString(),
}));

console.log(`\n${"=".repeat(84)}`);
console.log("LEIKMANNASPJALDID — St%-HLIDID, TIMABILID EFST, KLUKKU-TEXTAR, VERDFALL");
console.log("=".repeat(84));

/* ============================================================
   A. „St%" — REITURINN HVERFUR ThEGAR URTAKID ER OF LITID
   ============================================================
   Kaera notandans: „St% 1/1 · 100% eftir einn leik er ekki maeling."
   `rotationRisk` VEIT thetta thegar: `enough = prevSeason || seasonGames
   >= 3`, og an thess skilar hun `level: "low"`. Hinir tveir kallstadirnir
   (vallar-merkid og hlidarstikan) lesa `level`; ThESSI EINI gerdi thad
   ekki.
   NEFNARINN A SPJALDINU ER LEIKIR FELAGSINS (`matchesPlayedByClub`), svo
   MENGIN ERU BYGGD UR SOMU VEL og appid notar — endurritud regla vaeri
   annad likan (CLAUDE.md 7).                                           */
console.log("\n--- A. St%-HLIDID ---");
{
  const played = matchesPlayedByClub(FIX);
  const seasonGames = (EVENTS.events || EVENTS).filter(e => e.finished).length;
  const rotOf = (p, n) => rotationRisk(p, n);

  const squad = START_IDS.map(id => byId[id]);
  const low = squad.filter(p => rotOf(p, played[p.team] ?? seasonGames)?.level === "low");
  ok(low.length > 0,
     `forsenda: committud \`data/\` gefur mann med of litid urtak (${low.length} af 15)`,
     "ekkert i thessum kafla er maelt an hans");

  const v = await mount({ captain: 411 });
  const opened = await v.openCard(low[0].web_name);
  ok(opened, `spjald ${low[0].web_name} opnadist (of litid urtak)`);
  const t1 = v.card();
  /* AKKERID FAERDIST MED HEITINU (4.9.2026): reiturinn bar „Next GW
   forecast (ep)" en hann er FPL-s eigin `ep_next`, og fra og med
   maelda grunninum (`pointsBase`) er hun EKKI sama tala og spjaldid
   synir. Tvaer spar undir einu heiti — thvi var hann endurnefndur. */
  ok(/FPL's own ep_next/.test(t1), "forsenda: thad ER spjaldid (ep-reiturinn sest)");
  const rl = rotOf(low[0], played[low[0].team] ?? seasonGames);
  ok(!/Started/.test(t1),
     `„Started"-reiturinn er EKKI their (${rl.starts}/${rl.played} = ${rl.pct}%)`);

  /* HIN ATTIN — OG HUN ER BYGGD, EKKI FUNDIN. I dag hefur EKKERT felag
     spilad thrja leiki, svo „reiturinn birtist" er ekki profanlegt a
     committudum gognum. Tilbuinn heimur (GW1-3 leiknar) er thvi smiðadur
     hér: an hans vaeri hlidid oprofad i thá att sem SYNIR toluna, og
     stokkbreyting sem slekkur a reitnum ALLTAF slyppi i gegn.          */
  const FIX3 = FIX.map(f => (f.event != null && f.event <= 3
    ? { ...f, finished_provisional: true, team_h_score: 1, team_a_score: 1 }
    : f));
  const enoughId = squad.find(p => +p.minutes > 0 && rotOf(p, 3)?.level !== "low");
  ok(!!enoughId, "forsenda: einhver i proflidinu faer tolu thegar felagid hefur spilad thrjá");
  const v2 = await mount({ captain: 411 }, { patch: { "fixtures.json": FIX3 } });
  ok(await v2.openCard(enoughId.web_name), `spjald ${enoughId.web_name} opnadist (nog urtak)`);
  const t2 = v2.card();
  ok(/Started/.test(t2), "og ThAR ER reiturinn — hlidid slekkur ekki a ollu");
  const r2 = rotOf(enoughId, 3);
  ok(t2.includes(`${r2.starts}/${r2.played}`),
     `og talan er su sem \`rotationRisk\` segir (${r2.starts}/${r2.played})`);
  ok(!NANRE.test(t2), "ekkert NaN/undefined");
}

/* ============================================================
   B. TIMABILID EFST — `SeasonSoFar`
   ============================================================
   Beidni: „syna current season efst med per-gameweek tolum". Gagna-
   veggurinn er sagdur A SKJANUM: appid saekir EINA umferdaskra i einu
   (424 KB), svo umferdir sem eru ekki hladnar bera „—" MED SKYRINGU.
   ThRJAR FULLYRDINGAR OG SU ThRIDJA ER SU SEM SKIPTIR MALI:
     1. tolurnar eru ur `players.json`, obreyttar
     2. per-umferdar taflan er their fyrir BYRJADAR umferdir
     3. madur an minutna faer SETNINGU, ekki rod af nullum             */
console.log("\n--- B. TIMABILID EFST ---");
{
  /* BADIR HOPAR ERU UR PROFLIDINU — spjald er opnad um i-hnappinn A
     VELLINUM, sem er leidin sem notandinn fer, og hun nær adeins til
     theirra sem eru i hopnum.                                          */
  const squad = START_IDS.map(id => byId[id]);
  const withMins = squad.filter(p => +p.minutes > 0);
  const noMins = squad.filter(p => !(+p.minutes > 0));
  ok(withMins.length > 0, `forsenda: einhver i proflidinu hefur minutur (${withMins.length})`);
  ok(noMins.length > 0, `forsenda: og einhver i thvi hefur engar (${noMins.length})`);

  /* UTILEIKMADUR, EKKI „hver sem er": DC-reiturinn a EKKI ad vera a
     markmanni (sja neðar) og fyrsti madur i proflidinu ER markmadur.   */
  const P = withMins.find(p => p.element_type !== 1) || withMins[0];
  ok(P.element_type !== 1, `forsenda: profadur a utileikmanni (${P.web_name})`);
  const v = await mount({ captain: 411 });
  ok(await v.openCard(P.web_name), `spjald ${P.web_name} opnadist`);
  const t = v.card();
  ok(/this season so far/.test(t), "yfirstandandi timabil er a spjaldinu og er MERKT");
  ok(/Starts/.test(t) && /Assists/.test(t) && /DC/.test(t),
     "reitirnir sem var bedid um eru their (byrjanir · stodsendingar · DC)");
  ok(t.includes(`${P.minutes} min`), `minuturnar eru FPL-talan obreytt (${P.minutes})`);
  ok(/GW1/.test(t), "per-umferdar taflan ber BYRJADA umferd (GW1)");
  ok(!NANRE.test(t), "ekkert NaN/undefined");

  /* ============================================================
     ROD KASSANNA A SPJALDINU — TIMABILA-TAFLAN ER NEDST (25.8.2026)
     ============================================================
     Hun er staersti kassinn (allt ad ellefu radir x fimm timabil) og sat
     MILLI kaupakvordunar-talnanna og leikjanna, svo ThESSI umferd og
     leikirnir framundan voru undir henni. Saga er samhengi, ekki
     akvordun — sama rok og faerdi `PositionMap` nedst 16.8.
     ROÐIN ER LESIN UR TEXTANUM, ekki ur skra-linum: `indexOf` a
     `textContent` er rodin sem notandinn skrunar i gegnum.
     AKKERIN ERU EINKVAEM: „this season so far" (efsti kassinn),
     „Fixtures" (leikirnir) og skyringin undir timabila-toflunni.     */
  const iSoFar = t.indexOf("this season so far");
  const iFix = t.indexOf("Fixtures");
  const iSeason = t.indexOf("the rank is among everyone who played that season");
  ok(iSoFar >= 0 && iFix >= 0 && iSeason >= 0,
     `forsenda: oll thrju akkerin finnast (${iSoFar} · ${iFix} · ${iSeason})`);
  ok(iSoFar < iFix, "yfirstandandi timabil er EFST — a undan leikjunum");
  ok(iFix < iSeason, "og timabila-taflan er NEDST — a eftir leikjunum");
  /* EINU SINNI, EKKI TVISVAR. ROD-fullyrdingarnar tvaer her ad ofan eru
     BADAR sannar um tvitekna toflu (`indexOf` finnur thá fyrri), svo
     thaer geta ekki tekid ThESSA bilun — og hun er raunveruleg: flutningur
     sem gleymir ad taka gamla kallstadinn skilur eftir tvo. Hun kom
     RAUNVERULEGA fyrir i thessari lotu og ekkert prof sa hana.        */
  const seasonBlocks = t.split("the rank is among everyone who played that season").length - 1;
  ok(seasonBlocks === 1, `timabila-taflan er teiknud EINU SINNI (${seasonBlocks})`);

  /* ============================================================
     MARKMADUR FAER ENGA DC-TOLU — OG ThAD ER MAELT
     ============================================================
     MAELT 25.8.2026: allir 67 markmenn i `players.json` bera
     `defensive_contribution` og hun er 0 hja HVERJUM (hamark 0), medan
     DEF nær 21. FPL geymir raunverulegt `0` fyrir tolu sem er ekki
     maeld a theim (CLAUDE.md 12), svo reiturinn myndi lesa eins og
     „hann gerir ekkert i vorn". Hann faer samt HREIN BLOD — thau eru
     raunveruleg hja honum — svo kaflinn profar bæði: eitt hverfur,
     hitt verdur ad standa eftir.                                     */
  const GK = squad.find(x => x.element_type === 1 && +x.minutes > 0);
  ok(!!GK, `forsenda: markmadur med minutur er i proflidinu (${GK && GK.web_name})`);
  const vg = await mount({ captain: 411 });
  ok(await vg.openCard(GK.web_name), `spjald ${GK.web_name} opnadist (markmadur)`);
  const tg = vg.card();
  ok(/this season so far/.test(tg), "forsenda: kassinn er teiknadur a markmanninum lika");
  ok(/Clean sheets/.test(tg), "forsenda: hrein blod ERU synd — hann fær thau");
  ok(!/defensive contribution/.test(tg),
     "en DC-reiturinn er ALLS EKKI their (0 hja ollum 67 markmonnum = ekki maeling)");

  /* MADUR AN MINUTNA: SETNING, EKKI SEX NULL. Nulltala i staðin fyrir
     „hann var ekki a vellinum" er nakvaemlega gildran i CLAUDE.md 8.   */
  const v2 = await mount({ captain: 411 });
  ok(await v2.openCard(noMins[0].web_name), `spjald ${noMins[0].web_name} opnadist (engar minutur)`);
  const t2 = v2.card();
  ok(/No minutes yet/.test(t2), "hann faer SETNINGU um ad hann hafi ekki spilad");
  ok(/would read as a measurement/.test(t2), "og hun segir HVERS VEGNA nullin eru ekki synd");

  /* FORLEIKUR: kassinn er ALLS EKKI their. `PlayerHeadline` segir thegar
     „season not started" og tveir kassar um sama tomid reka i sundur.  */
  const v3 = await mount({ captain: 411 },
    { patch: { "events.json": { ...(EVENTS.events ? EVENTS : {}), events: preseasonEvents() } } });
  ok(await v3.openCard(withMins[0].web_name), "spjaldid opnadist i FORLEIKS-astandi");
  const t3 = v3.card();
  ok(/season not started/.test(t3), "forsenda: forleiks-astandid er raunverulega virkt");
  ok(!/this season so far/.test(t3), "og `SeasonSoFar` er ALLS EKKI teiknud tha");
}

/* ============================================================
   C. FORLEIKS-TEXTAR HVERFA VID KLUKKUNA
   ============================================================
   „the season begins 21 August" var FOST DAGSETNING um lifandi astand —
   sama aett og „the range is 4-10 and NO club has a 1". Hun ureltist
   ThOGULT vid frestinn.
   BADAR ATTIR ERU PROFADAR og forleiks-astandid er PROFAD FYRST, svo
   „strengurinn er farinn" hvili a streng sem var SANNANLEGA their.    */
console.log("\n--- C. KLUKKU-TEXTAR ---");
{
  /* `live/gw1.json` ER TOMD I BADUM HEIMUM. An thess er GW-frammistodu-
     kassinn FULLUR (committud skra er til) og TOMA-ASTANDID — thad eina
     sem bar fostu dagsetninguna — er aldrei teiknad. Fullyrding sem
     getur ekki nad kodanum sem hun heitir eftir maelir ekkert.         */
  /* UMFERDIN SEM APPID SYNIR ER LEIDD, EKKI NEGLD (29.8.2026).
     Her stod `{ "live/gw1.json": ... }` fast. Appid opnar a theirri umferd
     sem er verid ad SKIPULEGGJA (`planningGw`), og um leid og GW2 hofst las
     thad `live/gw2.json` — sem ER til i `data/` — svo toma-astandid var
     aldrei teiknad og fullyrdingin um setninguna fell an thess ad nokkud
     vaeri ad. Skran sem er tomd er thvi SU SEM APPID LES, fundin med sama
     falli og appid notar.                                               */
  const liveGw = planningGw(EVENTS.events || EVENTS,
                            (() => { const f = J("fixtures.json"); return Array.isArray(f) ? f : f.fixtures; })()) ?? 1;
  const EMPTY_LIVE = { [`live/gw${liveGw}.json`]: { elements: [] },
                       "live/gw1.json": { elements: [] } };
  const pre = await mount({ captain: 411 },
    { patch: { ...EMPTY_LIVE,
               "events.json": { ...(EVENTS.events ? EVENTS : {}), events: preseasonEvents() } } });
  const tp = pre.text();
  ok(/Preseason mode\./.test(tp), "FORSENDA: i forleik stendur „Preseason mode.\" a skjanum");
  ok(!/Early-season mode\./.test(tp), "og EKKI „Early-season mode.\"");

  const now = await mount({ captain: 411 }, { patch: { ...EMPTY_LIVE } });
  const tn = now.text();
  ok(/Early-season mode\./.test(tn), "eftir frestinn heitir hann „Early-season mode.\"");
  ok(!/Preseason mode\./.test(tn), "og forleiks-heitid er FARID");

  /* GW-FRAMMISTODU-TEXTINN: fasta dagsetningin ma hvergi vera.        */
  ok(!/the season begins 21 August/.test(tn),
     "fasta dagsetningin („the season begins 21 August\") er farin");
  ok(!/the season begins 21 August/.test(tp),
     "og hun er ekki einu sinni i forleiks-astandinu — hun er ur kodanum");
  /* OG SETNINGARNAR SEM TOKU VID ERU TVAER, EKKI EIN — thvi orsakirnar
     eru tvaer. Fyrir frest er timabilid ekki byrjad; eftir hann er
     umferdin oleikin eda skrain ekki komin, og ThA vaeri „timabilid er
     ekki byrjad" hrein osannindi. Baðar eru lesnar af skjanum.        */
  ok(await pre.openCard(byId[173].web_name), "spjald opnadist i forleik");
  ok(/the season has not started/.test(pre.card()),
     "forleiks-astandid segir „the season has not started\"");
  ok(await now.openCard(byId[173].web_name), "og sama spjald i byrjudu timabili");
  const tc = now.card();
  ok(/the gameweek file has not been published/.test(tc),
     "byrjada timabilid segir ADRA setningu — onnur orsok, onnur setning");
  ok(!/the season has not started/.test(tc),
     "og ThAR stendur EKKI ad timabilid se obyrjad");
}

/* ============================================================
   D. VERDFALL — FPL-s EIGIN TALA
   ============================================================
   ThRJAR OLIKAR FULLYRDINGAR, OG SU ThRIDJA ER SU SEM VER GEGN LYGI:
     1. TALAN ER FPL-s OG ER OSKOLUD — birt eins og hun kemur
     2. MERKID KVIKNAR adeins thegar hun er komin ad minnsta kosti halfa
        leid nidur (`PRICE_FALL_MARK`, LEIDD af FPL-throskuldinum 100)
     3. LAS SLEKKUR A MERKINU — verdid getur ekki breyst medan hann er
        laestur, svo vidvorun vaeri fullyrding um eitthvad omogulegt
   GOGNIN ERU TILBUIN, EKKI LIFANDI: hvada leikmadur er ad falla i dag
   breytist a hverjum degi, og fullyrding sem hangir a thvi er sofandi
   fullyrding a morgun.                                                */
console.log("\n--- D. VERDFALL ---");
{
  /* HREINA FALLID FYRST — an DOM. `priceChangeOf` er reglan sjalf.    */
  const FIXED = new Date("2026-08-25T12:00:00Z").getTime();
  ok(priceChangeOf({ price_change_percent: "-70" }, FIXED)?.falling === true,
     "-70 er FALL (halfa leid nidur ad FPL-throskuldinum 100)");
  ok(priceChangeOf({ price_change_percent: "-70" }, FIXED)?.pct === -70,
     "og talan er OBREYTT — engin skolun");
  ok(priceChangeOf({ price_change_percent: "-49" }, FIXED)?.falling === false,
     `-49 er ekki komid halfa leid (mark ${PRICE_FALL_MARK})`);
  ok(priceChangeOf({ price_change_percent: "70" }, FIXED)?.falling === false,
     "+70 er HAEKKUN og faer ekkert vidvorunar-merki");
  ok(priceChangeOf({ price_change_percent: "-70",
                     price_change_locked_until: "2026-09-01T00:00:00Z" }, FIXED)?.falling === false,
     "LAS slekkur a merkinu — verdid getur ekki breyst");
  ok(priceChangeOf({ price_change_percent: "-70",
                     price_change_locked_until: "2026-08-01T00:00:00Z" }, FIXED)?.falling === true,
     "en LIDINN las gerir thad ekki");
  ok(priceChangeOf({ price_change_percent: "-70", price_change_calibrating: true }, FIXED) === null,
     "`calibrating` -> ENGIN tala (FPL segir sjalft ad hun se omarktaek)");
  ok(priceChangeOf({}, FIXED) === null, "vantandi svid -> null, ekki 0");

  /* OG A SKJANUM. Tveir menn ur proflidinu: annar ad falla, hinn laestur
     a SOMU tolu — tha getur „merkid birtist" ekki verid satt af annarri
     astaedu en theirri sem er verid ad profa.                          */
  const FALL_ID = 411, LOCK_ID = 346;
  /* `calibrating: false` ER HLUTI AF HEIMINUM, EKKI SKRAUT (4.9.2026).
     Fixturinn setti tolu og las en LET `price_change_calibrating` liggja
     eins og hun var i raungognum. Eftir GW3-frestinn er hun `true` hja
     ollum 652, svo appid faldi merkid RETTILEGA og kaflinn fell a rettri
     hegdun. Tilbuinn heimur verdur ad vera HEILL — sama villa og
     `clock-states.mjs` bar samdaegurs (tvaer radir snertar, afgangurinn
     ur raungognum).                                                   */
  const live = p => ({ ...p, price_change_calibrating: false });
  const patched = ALL.map(p =>
    p.id === FALL_ID ? live({ ...p, price_change_percent: "-70.4", price_change_locked_until: null })
    : p.id === LOCK_ID ? live({ ...p, price_change_percent: "-70.4",
                                price_change_locked_until: "2099-01-01T00:00:00Z" })
    : live({ ...p, price_change_percent: "0", price_change_locked_until: null }));
  const v = await mount({ captain: 411 },
    { patch: { "players.json": { ...PLAYERS_FILE, players: patched } } });
  const pills = v.q("span").filter(s => /^↓\d+%$/.test((s.textContent || "").trim()));
  ok(pills.length === 1, `NAKVAEMLEGA eitt verdfalls-merki a vellinum (${pills.length})`);
  ok(pills[0] && pills[0].textContent.trim() === "↓70%",
     `og talan er FPL-s eigin, namunduð en OSKOLUD (${pills[0] && pills[0].textContent.trim()})`);
  /* LAESTI MADURINN BER SOMU TOLU OG FAER EKKI MERKI — thad er
     mismunurinn sem sannar ad lasinn se lesinn.                       */
  const lockCard = v.q('[draggable="true"]').find(c => (c.textContent || "").includes(byId[LOCK_ID].web_name));
  ok(lockCard && !/↓/.test(lockCard.textContent || ""),
     `${byId[LOCK_ID].web_name} ber SOMU tolu en er LAESTUR — ekkert merki`);

  ok(await v.openCard(byId[FALL_ID].web_name), "spjaldid opnadist");
  const t = v.card();
  ok(/to price change/.test(t), "verd-reiturinn ber framvinduna");
  ok(/-70\.4% to price change/.test(t), "og hana OBREYTTA — ekki skolada tolu");
  ok(/FPL's own figure/.test(t), "og hun er MERKT sem tala FPL, ekki okkar");
  ok(/falling/.test(t), "og hun er ordud sem FALL");
  ok(!NANRE.test(t), "ekkert NaN/undefined");
}

console.log(`\n${"=".repeat(84)}`);
console.log(`SPJALDID: ${pass} stodust, ${fail} fellu`);
console.log("=".repeat(84));
if (fail) process.exit(1);
