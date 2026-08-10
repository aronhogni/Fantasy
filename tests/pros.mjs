/* tests/pros.mjs — vordur um "Best of the best".

   HVERS VEGNA TILBUIN GOGN: `entry/{id}/event/{gw}/picks/` skilar 404 i
   forleik — LIKA fyrir umferdir sidasta timabils (profad 9.8.2026). Thad er
   thvi ENGIN leid ad sja raunverulegt svar fyrr en 21. agust. Somu adferd og
   `mins-trend.mjs` kafli 0 og `defcon-shrink.mjs`: kodinn sem kviknar fyrst
   a leikdegi er dreginn ut og keyrdur a tilbunum gognum ADUR.

   Vordurinn prófar HEGDUN, ekki ordalag.                                    */

import { aggregate, eo, movers, differential, coverageOk, marginPct,
         chipTimeline, MIN_PANEL_RESPONSE, recencyScore, seasonPct,
         MIN_SEASONS, HALF_LIFE } from "../src/pros.js";

let fail = 0;
const ok = (c, m) => { if (!c) { console.log("  FALL: " + m); fail++; } };
const near = (a, b, e, m) => ok(a != null && Math.abs(a - b) < e, `${m} (fekk ${a}, vaenti ${b})`);

/* Smidur eitt svar eins og FPL skilar thvi. */
function mkEntry({ ids, capt, vice, chip = null, tr = 0, cost = 0, value = 1000,
                   bank = 5, rank = 50000, tin = [], tout = [] }) {
  return {
    picks: {
      active_chip: chip,
      picks: ids.map(id => ({ element: id, is_captain: id === capt,
                              is_vice_captain: id === vice,
                              multiplier: id === capt ? 2 : 1 })),
      entry_history: { event_transfers: tr, event_transfers_cost: cost,
                       value, bank, overall_rank: rank },
    },
    transfers: tin.map((x, i) => ({ element_in: x, element_out: tout[i] ?? null })),
  };
}

console.log("1) talning — eignarhald, fyrirlidi, varafyrirlidi");
{
  const E = [
    mkEntry({ ids: [1, 2, 3], capt: 1, vice: 2 }),
    mkEntry({ ids: [1, 2, 4], capt: 2, vice: 1 }),
    mkEntry({ ids: [1, 5, 6], capt: 1, vice: 5 }),
  ];
  const a = aggregate(E);
  ok(a.n === 3, "n = 3");
  ok(a.own[1] === 3, "leikmadur 1 i ollum thremur");
  ok(a.own[4] === 1, "leikmadur 4 i einum");
  ok(a.capt[1] === 2, "leikmadur 1 fyrirlidi tvisvar");
  ok(a.vice[5] === 1, "varafyrirlidi talinn");
  ok(a.own[99] === undefined, "sparse: enginn lykill fyrir leikmann sem enginn a");
}

console.log("2) EO — fyrirlidi telur TVISVAR");
{
  const a = aggregate([mkEntry({ ids: [1, 2], capt: 1, vice: 2 }),
                       mkEntry({ ids: [1, 2], capt: 2, vice: 1 })]);
  near(eo(a, 1), (2 + 1) / 2, 1e-9, "EO(1) = (2 eiga + 1 fyrirlidi)/2");
  near(eo(a, 2), (2 + 1) / 2, 1e-9, "EO(2) eins");
  ok(eo(a, 77) === 0, "leikmadur an eignarhalds fer i 0, ekki null (n>0)");
  ok(eo({ n: 0, own: {}, capt: {} }, 1) === null, "engin svor -> null, EKKI 0");
}

console.log("3) NULL ER EKKI NULL — tomt inntak gefur null, ekki nullur");
{
  const a = aggregate([]);
  ok(a.n === 0, "n = 0");
  ok(a.transfers === null && a.hitCost === null && a.value === null,
     "medaltol eru null thegar enginn svaradi");
  ok(a.rankMedian === null, "midgildi radar er null");
  const b = aggregate([mkEntry({ ids: [1], capt: 1, vice: 1, tr: 0, cost: 0 })]);
  ok(b.transfers === 0, "raunverulegt 0 skiptum helst 0 (ekki null)");
}

console.log("4) onyt svor eru EKKI talin med");
{
  const a = aggregate([
    mkEntry({ ids: [1, 2], capt: 1, vice: 2 }),
    null, undefined, {}, { picks: null }, { picks: { picks: [] } },
  ]);
  ok(a.n === 1, `adeins gilt svar telur (n=${a.n})`);
}

console.log("5) chips");
{
  const a = aggregate([
    mkEntry({ ids: [1], capt: 1, vice: 1, chip: "bboost" }),
    mkEntry({ ids: [1], capt: 1, vice: 1, chip: "bboost" }),
    mkEntry({ ids: [1], capt: 1, vice: 1, chip: "3xc" }),
    mkEntry({ ids: [1], capt: 1, vice: 1 }),
  ]);
  ok(a.chips.bboost === 2 && a.chips["3xc"] === 1, "chip-talning");
  ok(a.chips.wildcard === undefined, "ospiladh chip faer engan lykil");
  const tl = chipTimeline({ 1: a }, ["bboost", "3xc", "wildcard"]);
  near(tl[0].bboost, 0.5, 1e-9, "helmingur spiladi bench boost");
  ok(tl[0].wildcard === 0, "wildcard 0 thegar einhver svaradi");
}

console.log("6) movers — rodun eftir FJOLDA og `net` adgreinir");
{
  /* A: 5 kaupa, 0 selja. B: 6 kaupa, 5 selja. Bert kaup setur B ofar, en
     `net` verdur ad syna ad A er raunverulega hreyfingin.                  */
  const E = [];
  for (let i = 0; i < 5; i++) E.push(mkEntry({ ids: [1], capt: 1, vice: 1, tin: [10], tout: [99] }));
  for (let i = 0; i < 6; i++) E.push(mkEntry({ ids: [1], capt: 1, vice: 1, tin: [20], tout: [98] }));
  for (let i = 0; i < 5; i++) E.push(mkEntry({ ids: [1], capt: 1, vice: 1, tin: [30], tout: [20] }));
  const a = aggregate(E);
  const mv = movers(a, "in", 5);
  ok(mv[0].id === 20 && mv[0].count === 6, "flest kaup efst");
  ok(mv[0].net === 1, `20: 6 inn - 5 ut = net 1 (fekk ${mv[0].net})`);
  const a10 = mv.find(m => m.id === 10);
  ok(a10.net === 5, "10: 5 inn - 0 ut = net 5 — nettotalan adgreinir");
  near(a10.share, 5 / 16, 1e-9, "hlutfall midast vid THA SEM SVORUDU");
  const out = movers(a, "out", 5);
  ok(out[0].id === 98 && out[0].count === 6, "solu-listinn er sjalfstaedur");
  ok(movers(aggregate([]), "in").length === 0, "tomt -> tomur listi, ekki hrun");
}

console.log("7) differential — vantandi almenn tala gefur null");
{
  /* EO GETUR FARID YFIR 100% og A ad gera thad: madur sem ALLIR eiga OG
     allir gera ad fyrirlida hefur EO 200% — hann skilar tvofoldum stigum
     per eiganda. Fyrsta utgafa thessa profs vaenti 100% og fell; kodinn
     hafdi rett fyrir ser. Fullyrdingin er hofd her til ad negla merkinguna. */
  const allCapt = aggregate([mkEntry({ ids: [1], capt: 1, vice: 1 }),
                             mkEntry({ ids: [1], capt: 1, vice: 1 })]);
  near(eo(allCapt, 1), 2.0, 1e-9, "allir eiga OG allir fyrirlida -> EO 200%");
  near(differential(allCapt, 1, 50), 150, 1e-9, "EO 200% gegn 50% almennu = +150");

  /* Venjulega tilfellid: allir eiga, ENGINN fyrirlidar -> EO 100%. */
  const a = aggregate([mkEntry({ ids: [1, 2], capt: 2, vice: 1 }),
                       mkEntry({ ids: [1, 2], capt: 2, vice: 1 })]);
  near(eo(a, 1), 1.0, 1e-9, "allir eiga, enginn fyrirlidar -> EO 100%");
  near(differential(a, 1, 50), 50, 1e-9, "EO 100% gegn 50% almennu = +50");
  ok(differential(a, 1, null) === null, "null crowd -> null");
  ok(differential(a, 1, "abc") === null, "onyt gerd -> null, ekki NaN");
  near(differential(a, 1, "12.5"), 87.5, 1e-9, "strengur ur FPL er thattadur");
  ok(differential({ n: 0, own: {}, capt: {} }, 1, 10) === null, "engin svor -> null");
}

console.log("8) THEKJA ER FULLYRDING (CLAUDE.md 5b)");
{
  const full = { n: 950 }, thin = { n: 500 };
  ok(coverageOk(full, 1000) === true, "95% thekja i lagi");
  ok(coverageOk(thin, 1000) === false, "50% thekja fellur");
  ok(coverageOk({ n: MIN_PANEL_RESPONSE * 1000 }, 1000) === true, "nakvaemlega a morkunum staest");
  ok(coverageOk(null, 1000) === false && coverageOk({ n: 10 }, 0) === false,
     "onyt inntok gefa false, ekki hrun");
}

console.log("9) vikmork — 62% ur 12 monnum er EKKI sama og 62% ur 1000");
{
  const few = marginPct(0.62, 12), many = marginPct(0.62, 1000);
  ok(few > 20, `12 manns -> +-${few?.toFixed(1)} stig (a ad vera >20)`);
  ok(many < 4, `1000 manns -> +-${many?.toFixed(1)} stig (a ad vera <4)`);
  ok(marginPct(0.5, 0) === null && marginPct(null, 10) === null, "onyt inntok -> null");
}

console.log("10) skemmd svor fella ekki keyrsluna (sbr. untrusted-input)");
{
  const junk = [
    { picks: { picks: [{ element: null }], entry_history: { value: "abc" } } },
    { picks: { picks: [{ element: 5 }], entry_history: null }, transfers: null },
    { picks: { picks: [{ element: 6 }] }, transfers: [{ element_in: null, element_out: 7 }] },
    { picks: { picks: "nope" } },
  ];
  let a;
  ok((() => { try { a = aggregate(junk); return true; } catch { return false; } })(),
     "aggregate kastar ekki a skemmdum inntokum");
  ok(a.own[5] === 1 && a.own[6] === 1, "gildu radirnar komast samt til skila");
  ok(a.out[7] === 1, "element_out telst thott element_in vanti");
  ok(a.value === null, "onyt talnagerd smitar ekki inn sem NaN");
  ok(!Number.isNaN(a.transfers), "ekkert NaN i medaltolum");
}

console.log("10b) VALREGLAN — recencyScore");
{
  const P = (rows) => rows.map(([s, r]) => ({ season_name: s, rank: r }));
  /* Nyleiki VERDUR ad vega thyngra. Tveir menn med somu tvo tolur i
     ondverdri rod eiga ad fa ANDSTAEDA rod.                                */
  const improving = recencyScore(P([["2023/24", 900000], ["2024/25", 400000], ["2025/26", 10000]]));
  const declining = recencyScore(P([["2023/24", 10000], ["2024/25", 400000], ["2025/26", 900000]]));
  ok(improving.score < declining.score,
     `batnandi madur skorar betur (${improving.score.toFixed(3)} < ${declining.score.toFixed(3)})`);

  /* Einrænni: betri rodun MA ALDREI gefa verri skor.                       */
  let prev = Infinity, mono = true;
  for (const r of [2000000, 500000, 100000, 20000, 2000, 200]) {
    const s = recencyScore(P([["2023/24", r], ["2024/25", r], ["2025/26", r]])).score;
    if (s > prev) mono = false;
    prev = s;
  }
  ok(mono, "betri rodun gefur alltaf laegra (betra) skor");

  ok(recencyScore(P([["2024/25", 100], ["2025/26", 100]])) === null,
     `undir ${MIN_SEASONS} timabilum -> null`);

  /* HELMINGUNARTIMINN ER MAELDUR FASTI, EKKI SMEKKUR — og hann var
     LEIDRETTUR 10.8.2026 (1,5 -> 3,0) thvi fyrra valid hamarkadi fylgni yfir
     allan hopinn i stad gaeda TOPP 1.000. Profid negglir baedi gildid og
     STEFNUNA: vid h=3 vegur timabil sem er 3 ara gamalt HELMING af thvi
     nyjasta. Ef einhver breytir HALF_LIFE an maelingar fellur thetta.     */
  ok(HALF_LIFE === 3.0, `HALF_LIFE er maeldur fasti 3.0 (er ${HALF_LIFE})`);
  {
    const n = 7;
    const w = i => Math.pow(0.5, (n - 1 - i) / HALF_LIFE);
    near(w(n - 1 - 3) / w(n - 1), 0.5, 1e-9,
         "timabil sem er 3 ara gamalt vegur HELMING af thvi nyjasta");
    ok(w(0) / w(n - 1) > 0.2,
       "elsta timabil i 7-ara ferli vegur enn >20% (langt minni, ekki bara 2 ar)");
  }
  ok(recencyScore([]) === null && recencyScore(null) === null, "tomt inntak -> null");

  /* Okunn timabil eru SLEPPT, ekki giskud — annars fengi 2005/06 persentíl
     ut ur staerd sem vid hofum aldrei maelt.                               */
  const withGhost = recencyScore(P([["1999/00", 5], ["2023/24", 100000],
                                    ["2024/25", 100000], ["2025/26", 100000]]));
  ok(withGhost.seasons === 3, `okunnugt timabil talid ekki med (fekk ${withGhost.seasons})`);
  ok(withGhost.best === 100000, "`best` litur framhja okunnu timabili lika");

  const t = recencyScore(P([["2023/24", 50000], ["2024/25", 50000], ["2025/26", 50000]]));
  ok(t.t1 === 3, "top-1% timabil talin");
  near(seasonPct("2025/26", 130871), 1.0, 0.01, "1% af 2025/26 er ~130.871");
  ok(seasonPct("1999/00", 5) === null, "okunn timabil gefa null persentíl");
  ok(seasonPct("2025/26", 0) === null, "rodun 0 er onyt -> null");
}

/* ==========================================================================
   11-15) SOFNUNIN SJALF (collectPros). Hun keyrir fyrst 21. agust og getur
   ekki verid profud gegn lifandi svari fyrr en tha — svo hun er profud gegn
   HERMDUM svorum nuna. Kvota-vornin (kafli 13) er sa hluti sem myndi kosta
   mest ef hann brygdist: 48 keyrslur a dag x 2.000 koll = 96.000 koll.     */
const { collectPros } = await import("../scripts/pros-collect.mjs");

function harness({ panel = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], events,
                   prevGw = null, entries = null, missing = [] } = {}) {
  const wrote = {}, recs = [];
  const calls = { picks: 0, transfers: 0 };
  const deps = {
    async getJSON(url) {
      const mp = url.match(/entry\/(\d+)\/event\/(\d+)\/picks/);
      if (mp) {
        calls.picks++;
        const id = +mp[1];
        if (missing.includes(id)) throw new Error("HTTP 404 fyrir " + url);
        return (entries && entries[id]) || {
          active_chip: null,
          picks: [{ element: 100 + id, is_captain: true, is_vice_captain: false, multiplier: 2 }],
          entry_history: { event_transfers: 1, event_transfers_cost: 0,
                           value: 1000, bank: 0, overall_rank: 1000 * id },
        };
      }
      const mt = url.match(/entry\/(\d+)\/transfers/);
      if (mt) {
        calls.transfers++;
        return [{ element_in: 500, element_out: 600, event: 7 },
                { element_in: 501, element_out: 601, event: 6 }];   // ONNUR umferd
      }
      throw new Error("oveant url " + url);
    },
    async writeJSON(p, o) { wrote[p] = o; },
    async readJSON(f) {
      if (f === "pros.json") {
        if (panel === null) throw new Error("ENOENT");
        return { season: "2026/27", panel };
      }
      if (f === "pros_gw.json") {
        if (!prevGw) throw new Error("ENOENT");
        return prevGw;
      }
      throw new Error("ENOENT");
    },
    record(name, ok, count, note) { recs.push({ name, ok, count, note }); },
  };
  return { deps, wrote, recs, calls,
           run: ev => collectPros(deps, ev ?? events
         ?? [{ id: 7, deadline_time: new Date(Date.now() - 36e5).toISOString() }]) };
}

console.log("11) vantandi pros.json fellir EKKI keyrsluna");
{
  const h = harness({ panel: null });
  await h.run();
  ok(h.recs.length === 1 && h.recs[0].ok === false, "skrair villu i status");
  ok(h.calls.picks === 0, "engin kall gerd an hops");
  ok(!h.wrote["pros_gw.json"], "skrifar ekki tomt yfir");
}

console.log("12) FRESTURINN — ekkert er sott fyrr en hann er lidinn");
{
  /* FPL SYNIR ENGUM LID ANNARRA FYRIR FREST. Thetta er ekki API-tilviljun
     heldur regla leiksins, svo vordurinn er a DAGSETNINGU, ekki a flaggi. */
  const future = new Date(Date.now() + 36e5).toISOString();
  const past   = new Date(Date.now() - 36e5).toISOString();

  const pre = harness({ events: [{ id: 1, is_next: true, deadline_time: future }] });
  await pre.run();
  ok(pre.calls.picks === 0, "frestur EKKI lidinn -> engin kall (annars 2.000 koll i 404)");
  ok(pre.recs[0].ok === true, "thetta er rett astand, ekki villa");

  const post = harness({ events: [{ id: 7, deadline_time: past }] });
  await post.run();
  ok(post.calls.picks === 4, `frestur lidinn -> sott (${post.calls.picks} koll)`);

  /* Og RETTA umferdin: sidasta sem er lidin, ekki su sem er framundan. */
  const mixed = harness({ events: [{ id: 6, deadline_time: past },
                                   { id: 7, deadline_time: past },
                                   { id: 8, deadline_time: future }] });
  await mixed.run();
  ok(!!mixed.wrote["pros_gw.json"] && !!mixed.wrote["pros_gw.json"].gw[7],
     "sidasta LIDNA umferdin (7) er sott, ekki 8");
  ok(!mixed.wrote["pros_gw.json"].gw[8], "umferd med opinn frest er EKKI skrifud");
}

console.log("13) KVOTAVORN — umferd sem er thegar sott er EKKI sott aftur");
{
  const full = { n: 4, own: {}, capt: {}, vice: {}, in: {}, out: {}, chips: {} };
  const h = harness({ prevGw: { season: "2026/27", gw: { 7: full } } });
  await h.run();
  ok(h.calls.picks === 0, `engin endurtekin kall (fekk ${h.calls.picks})`);
  ok(/skipped/.test(h.recs[0].note || ""), "skrair ad thvi var sleppt");
}
console.log("13b) ...en OFULL umferd ER sott aftur");
{
  const thin = { n: 1, own: {}, capt: {}, vice: {}, in: {}, out: {}, chips: {} };
  const h = harness({ prevGw: { season: "2026/27", gw: { 7: thin } } });
  await h.run();
  ok(h.calls.picks === 4, `ofull thekja er sott aftur (fekk ${h.calls.picks})`);
}

console.log("14) venjuleg keyrsla — skiptin eru SIUD eftir umferd");
{
  const h = harness();
  await h.run();
  const out = h.wrote["pros_gw.json"];
  ok(!!out, "skrifar pros_gw.json");
  const a = out.gw[7];
  ok(a.n === 4, `fjoldi svara ${a.n}`);
  ok(a.in[500] === 4, "kaup thessarar umferdar talin");
  ok(a.in[501] === undefined, "kaup ANNARRAR umferdar EKKI talin (siun virkar)");
  ok(a.out[600] === 4 && a.out[601] === undefined, "solur eins");
  ok(out.panel_size === 4, "hopsstaerdin fylgir med svo thekja se lesanleg");
  ok(out.gw[7].capt[101] === 1, "fyrirlidar taldir per leikmann");
}

console.log("15) 404 telst sem ekki-svar og lækkar THEKJU (ekki thogn)");
{
  const h = harness({ missing: [2, 3] });
  await h.run();
  const a = h.wrote["pros_gw.json"].gw[7];
  ok(a.n === 2, `tveir svorudu af fjorum (fekk ${a.n})`);
  const r = h.recs.find(x => x.name === "pros");
  ok(r.ok === false, "thekja undir 90% => status ER EKKI graent");
  ok(/2\/4/.test(r.note), `nota synir ${r.note}`);
}

console.log("14b) SAMEINING — ny umferd ma ALDREI thurrka ut theer fyrri");
{
  /* Sama regla og BSD (CLAUDE.md 6): "skrain er lykluð a timabil og keyrsla
     SAMEINAR". Ef GW8 skrifar yfir allt vaeri sagan tapud i hverri viku og
     chip-dagatalid — sem er ALLT byggt a fyrri umferdum — yrdi tomt.      */
  const gw7 = { n: 4, own: { 9: 4 }, capt: {}, vice: {}, in: { 5: 4 }, out: {}, chips: { bboost: 2 } };
  const past = new Date(Date.now() - 36e5).toISOString();
  const h = harness({ prevGw: { season: "2026/27", gw: { 7: gw7 } },
                      events: [{ id: 8, deadline_time: past }] });
  await h.run();
  const out = h.wrote["pros_gw.json"];
  ok(!!out, "skrifar");
  ok(!!out.gw[7], "GW7 er ENN i skranni");
  ok(!!out.gw[8], "GW8 var baett vid");
  ok(out.gw[7].chips.bboost === 2, "gomlu chip-tolurnar oskaddar (dagatalid lifir)");
  ok(out.gw[7].in[5] === 4, "gomlu kaupin oskoddu");
}

console.log("14c) BETRI thekja ma skrifa yfir verri i SOMU umferd");
{
  /* Fyrri keyrsla nadi 5 af 10 (undir morkum -> endursott). Ny naer 10.
     Tha VERDUR hun ad skrifa — annars frysi ein slok keyrsla umferdina.   */
  const panel = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
  const thin = { n: 5, own: { 99: 5 }, capt: {}, vice: {}, in: {}, out: {}, chips: {} };
  const h = harness({ panel, prevGw: { season: "2026/27", gw: { 7: thin } } });
  await h.run();
  const out = h.wrote["pros_gw.json"];
  ok(!!out, "skrifar thegar thekjan BATNAR");
  ok(out.gw[7].n === 10, `n uppfaert i 10 (fekk ${out.gw[7]?.n})`);
  ok(out.gw[7].own[99] === undefined, "gamla, ofulla talningin er REPLACED, ekki lögd vid");
}

console.log("15c) HTTP-STADA ER LESIN AF BYRJUNINNI, ekki leitad i slodinni");
{
  /* Lid med id 404 og VILLU 500: fyrsta utgafan notadi /\b404\b/ a allan
     strengnum, svo `500 .../entry/404/event/7/picks/` hefdi verid flokkud
     sem "lidid er ekki til" -> engar endurtilraunir og madurinn tapast
     thegjandi. Profid saekir bara eitt lid (404) og telur kollin: raunveruleg
     404 gefur EITT kall, 500 a ad gefa ENDURTILRAUNIR.                    */
  const mk = (msg) => {
    let n = 0;
    const deps = {
      async getJSON(url) {
        if (/picks/.test(url)) { n++; throw new Error(msg.replace("{url}", url)); }
        return [];
      },
      async writeJSON() {}, 
      async readJSON(f) {
        if (f === "pros.json") return { season: "2026/27", panel: [{ id: 404 }] };
        throw new Error("ENOENT");
      },
      record() {},
    };
    return { deps, calls: () => n };
  };
  const past = new Date(Date.now() - 36e5).toISOString();
  const a = mk("404 {url}");
  await collectPros(a.deps, [{ id: 7, deadline_time: past }]);
  ok(a.calls() === 1, `raunveruleg 404 -> eitt kall (fekk ${a.calls()})`);

  const b = mk("500 {url}");
  await collectPros(b.deps, [{ id: 7, deadline_time: past }]);
  ok(b.calls() > 1, `500 a lidi nr. 404 -> ENDURTILRAUNIR (fekk ${b.calls()} koll)`);
}

console.log("15b) ALGERLEGA tom keyrsla skrifar EKKERT");
{
  /* FUNDID MED LIFANDI THURRKEYRSLU 10.8.2026 gegn 1.000 raunverulegum
     lidum: oll 404 -> skrifad `{n:0, own:{}, in:{}}`. Rod med n=0 les eins
     og "enginn gerdi neitt" i stad "sofnunin brast".                     */
  const h = harness({ missing: [1, 2, 3, 4] });
  await h.run();
  ok(!h.wrote["pros_gw.json"], "engin skra skrifud thegar ENGINN svaradi");
  const r = h.recs.find(x => x.name === "pros");
  ok(r.ok === false, "status er raudur");
  ok(/nothing written/.test(r.note || ""), `notan segir ad ekkert var skrifad (${r.note})`);
}

console.log("16) verri keyrsla ma ALDREI skrifa yfir betri (sbr. 8e)");
{
  /* HER SKIPTIR UPPSETNINGIN OLLU. Fyrsta utgafa thessa profs gaf fyrri
     keyrslunni FULLA thekju (4/4) — tha slokknar a endursokninni i kafla 13
     og prófid for ALDREI inn i thann kodha sem thad thottist profa.
     "Engin skrif" var thvi satt af RANGRI astaedu. Nu er fyrri thekjan
     viljandi ofull (5 af 10 = undir 90%) svo endursokn EIGI ser stad,
     en ny keyrsla nái faerri — thad er tilfellid sem vordurinn ver.        */
  const panel = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
  const half = { n: 5, own: { 9: 5 }, capt: {}, vice: {}, in: {}, out: {}, chips: {} };
  const h = harness({ panel, prevGw: { season: "2026/27", gw: { 7: half } },
                      missing: [2, 3, 4, 5, 6, 7, 8, 9] });   // adeins 1 og 10 svara
  await h.run();
  ok(h.calls.picks === 10, `endursokn atti ser stad (${h.calls.picks} koll)`);
  ok(!h.wrote["pros_gw.json"], "engin skrif thegar ny keyrsla er verri");
  const r = h.recs.find(x => x.name === "pros");
  ok(r.ok === false && /kept previous/.test(r.note), `skrair ad gomlu var haldid (${r.note})`);
}

console.log("17) TENGINGIN — collectPros ER kolluð ur fetchFast, OG hrada keyrslan er i cron");
{
  /* CLAUDE.md 7.1 skjalfestir NAKVAEMLEGA thessa villu: `fetchLineups` var
     fullbyggt og maelt, en kallad ur RANGRI keyrslu — og profid "er thad
     kallad?" var graent allan timann af thvi ad thad las KODA en ekki
     workflow-id. Her er BAEDI athugad.                                    */
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
  const fastStart = src.indexOf("async function fetchFast()");
  const fastEnd = src.indexOf("\n}", fastStart);
  ok(fastStart > -1 && fastEnd > fastStart, "fetchFast fannst i fetch.mjs");
  const body = src.slice(fastStart, fastEnd);
  ok(/collectPros\s*\(/.test(body),
     "collectPros er kolluð INNAN fetchFast (ekki bara i daglegu keyrslunni)");
  ok(/import \{ collectPros \} from "\.\/pros-collect\.mjs"/.test(src),
     "fetch.mjs flytur inn collectPros");

  let wf = "";
  try { wf = readFileSync(new URL("../.github/workflows/fetch-fast.yml", import.meta.url), "utf8"); } catch {}
  ok(/fetch\.mjs\s+--fast/.test(wf),
     "fetch-fast.yml keyrir raunverulega `fetch.mjs --fast`");
}

console.log(fail ? `\npros: ${fail} fullyrdingar fellu` : "\npros: allt graent");
process.exit(fail ? 1 : 0);
