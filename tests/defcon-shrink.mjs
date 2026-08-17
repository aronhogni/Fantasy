/* ============================================================
   DC-HITTNI: AFTURVIRKNIN (hit_rate_adj) — TERMINAL_HANDOFF_4 §2

   HVERS VEGNA ÞETTA PRÓF ER TIL:
   Hrá hittni (hits/starts) ofmælist á litlum sýnum. Ytra viðmið
   (FFS-tímabilsspá, ~470 leikmenn) hefur ENGAN leikmann yfir ~57%
   DC-hittni; okkar GW20+ mælingar fóru í 80% á n=10. Frávikin voru
   stærst þar sem sýnið var lítið OG hittnin há (Danso 80→15, Botman
   75→30) en nánast núll þar sem sýnið var stórt (Ampadu, Groß, Stach
   innan 8 pp). Lögunin er empirísk Bayes-afturvirkni:
       hittni_adj = (hits + K·p0) / (starts + K),  K = 10
       p0 = stöðu-meðaltal úr sömu gögnum (fall-back fastar á meðan
            laugin er < 50 startir)

   SAMA MYNSTUR OG tests/mins-trend.mjs KAFLI 0: computeDefcon er
   DREGIÐ ÚT ÚR scripts/fetch.mjs (raunverulegur texti, ekki
   eftirlíking) og keyrt á tilbúnum live-skrám — kóðinn kviknar fyrst
   21. ágúst og ómældur kóði sem fer í gang einn morgun er ekki
   ásættanlegur.

   Keyrsla:  node tests/defcon-shrink.mjs
   ============================================================ */
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

/* ---------- computeDefcon DREGIÐ ÚT ÚR scripts/fetch.mjs ---------- */
const src = await readFile(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
const start = src.indexOf("async function computeDefcon(");
ok(start > 0, "computeDefcon finnst í scripts/fetch.mjs");
const end = src.indexOf("\n}\n", start);
const decl = src.slice(start, end + 3);

/* Smíðar prófumhverfi: DATA-mappa með live/gw{n}.json og fixtures.json. */
async function runDefcon({ gwMetrics, els, fixtures = [], bench = new Set(), recov = {}, mins = {} }) {
  const dir = await mkdtemp(join(tmpdir(), "dc-"));
  await mkdir(join(dir, "live"), { recursive: true });
  const gws = Object.values(gwMetrics)[0]?.length ?? 0;
  for (let gw = 1; gw <= gws; gw++) {
    const elements = Object.entries(gwMetrics)
      .filter(([, m]) => m[gw - 1] !== undefined && m[gw - 1] !== null)
      /* `starts` BAETTIST VID 17.8.2026 og thad er ekki snyrting a
         profgognum: `computeDefcon` taldi adur HVERJA INNKOMU sem
         "start", svo innkoma af bekknum — thar sem throskuldurinn er
         ORNAEDANLEGUR a 15 minutum — taldist sem tapad taekifaeri.
         Maelt a raungognum: utileikmenn 0,1361 a leiki en 0,1907 a
         byrjanir (+40%). Profgognin baru engan `starts`-reit og
         STADFESTU thvi gomlu hegdunina thegjandi. `bench` gefur
         varamenn (starts: 0) og `recov` endurheimtir, sem tharf til ad
         profa markmanna-greinina.                                      */
      .map(([id, m]) => ({ id: +id, stats: {
        minutes: bench.has(+id) ? 20 : (mins[+id] ?? 90),
        starts: bench.has(+id) ? 0 : 1,
        clearances_blocks_interceptions: m[gw - 1],
        tackles: 0, recoveries: recov[+id] ?? 0 } }));
    await writeFile(join(dir, "live", `gw${gw}.json`), JSON.stringify({ elements }));
  }
  await writeFile(join(dir, "fixtures.json"), JSON.stringify(fixtures));
  let written = null;
  const rec = { ok: null, n: 0 };
  const factory = new Function("existsSync", "readFile", "DATA", "writeJSON", "record", "status",
    `${decl}\nreturn computeDefcon;`);
  const computeDefcon = factory(
    existsSync, readFile, dir,
    async (name, obj) => { written = { name, obj }; },
    (n, o, c) => { rec.ok = o; rec.n = c; },
    { updated: "prof" });
  const events = Array.from({ length: gws }, (_, i) => ({ id: i + 1, finished: true }));
  await computeDefcon(events, els);
  return { written, rec };
}

/* ============================================================
   1. HANDOFF-DÆMIÐ SJÁLFT: 9/12 hrátt = 75% -> afturvirkjað ~56%
   Botman-talan úr §2: (9 + 10·0,32)/(12 + 10) = 0,559.
   p0 er hér ÞVINGAÐ í ~0,32 með því að byggja laugina þannig:
   restin af DEF-lauginni gefur heildina hits/starts ≈ 0,32.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("1. HANDOFF-DÆMIÐ — lítið sýni, há hittni, dregst að stöðu-meðaltali");
console.log("─".repeat(84));
{
  /* Leikmaður 1: 12 startir, hittir í 9 (CBIT 10 = þröskuldur DEF).
     Laug: 8 aðrir DEF-menn með 12 startir hver, hitta í 30 af 96
     -> laugin öll: (9+30)/(12+96) = 0,361. Nálægt Newcastle-dæminu.   */
  const gwMetrics = { 1: [] };
  for (let g = 0; g < 12; g++) gwMetrics[1].push(g < 9 ? 12 : 3);
  for (let id = 2; id <= 9; id++) {
    const hits = [4, 4, 4, 4, 4, 4, 3, 3][id - 2];
    gwMetrics[id] = Array.from({ length: 12 }, (_, g) => (g < hits ? 11 : 2));
  }
  const els = Array.from({ length: 9 }, (_, i) => ({ id: i + 1, element_type: 2, team: 1 }));
  const { written } = await runDefcon({ gwMetrics, els });
  const P = Object.fromEntries((written?.obj?.players || []).map(p => [p.fpl_id, p]));

  ok(P[1]?.hit_rate === 0.75, `hrá hittni 9/12 = 0,75 (${P[1]?.hit_rate})`);
  const p0 = (9 + 30) / (9 * 12);
  ok(Math.abs(P[1]?.p0 - p0) < 0.001, `p0 = stöðu-meðaltal laugarinnar ${p0.toFixed(3)} (${P[1]?.p0})`);
  const adj = (9 + 10 * p0) / (12 + 10);
  ok(Math.abs(P[1]?.hit_rate_adj - adj) < 0.001,
    `afturvirkjað = (9+10·p0)/22 = ${adj.toFixed(3)} (${P[1]?.hit_rate_adj})`);
  ok(P[1].hit_rate_adj < P[1].hit_rate && P[1].hit_rate_adj > p0,
    `afturvirkjaða talan liggur MILLI hrárrar og p0 (${P[1].hit_rate_adj})`);
  ok(P[1].starts === 12 && P[1].threshold_hits === 9,
    "hráa talan og n HALDA SÉR — afturvirknin er viðbót, ekki yfirskrift");
}

/* ============================================================
   2. KJARNAEIGINLEIKI AFTURVIRKNINNAR: sama hráa hittni, ólíkt n
   -> minna sýni dregst MEIRA að p0. Þetta er það sem hrá birting
   getur ekki gert og ástæðan fyrir allri breytingunni.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("2. SAMA HRÁA HITTNI, ÓLÍKT SÝNI — minna sýnið dregst meira að meðaltali");
console.log("─".repeat(84));
{
  /* Báðir 75% hráir: A 3/4, B 15/20. Laug með lága grunnhittni. */
  const gwMetrics = {
    1: [12, 12, 12, 3, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null],
    2: Array.from({ length: 20 }, (_, g) => (g < 15 ? 12 : 3)),
  };
  for (let id = 3; id <= 12; id++)
    gwMetrics[id] = Array.from({ length: 20 }, (_, g) => (g < 3 ? 11 : 2));
  const els = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, element_type: 2, team: 1 }));
  const { written } = await runDefcon({ gwMetrics, els });
  const P = Object.fromEntries(written.obj.players.map(p => [p.fpl_id, p]));

  ok(P[1].hit_rate === 0.75 && P[2].hit_rate === 0.75,
    `báðir hráir 75% (A ${P[1].hit_rate}, B ${P[2].hit_rate})`);
  ok(P[1].hit_rate_adj < P[2].hit_rate_adj,
    `A (n=4) dregst MEIRA niður en B (n=20): ${P[1].hit_rate_adj} < ${P[2].hit_rate_adj}`);
  ok(P[1].p0 === P[2].p0, `sama p0 fyrir sömu stöðu (${P[1].p0})`);
}

/* ============================================================
   3. FALLBACK-FASTAR ÞEGAR LAUGIN ER OF LÍTIL (< 50 startir)
   Fyrstu umferðir tímabilsins: fáir leikmenn komnir með startir.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("3. LÍTIL LAUG — fastar taka við, engin sjálfstyrking úr 10 startum");
console.log("─".repeat(84));
{
  /* 2 DEF-menn, 2 umferðir = 4 startir í DEF-lauginni. MID-laug jafn lítil. */
  const gwMetrics = { 1: [12, 12], 2: [2, 2], 3: [14, 14], 4: [3, 3] };
  const els = [
    { id: 1, element_type: 2, team: 1 }, { id: 2, element_type: 2, team: 1 },
    { id: 3, element_type: 3, team: 2 }, { id: 4, element_type: 3, team: 2 },
  ];
  const { written } = await runDefcon({ gwMetrics, els });
  const P = Object.fromEntries(written.obj.players.map(p => [p.fpl_id, p]));

  ok(P[1].p0 === 0.27, `DEF-fastinn 0,27 notaður þegar laugin er < 50 startir (${P[1].p0})`);
  ok(P[3].p0 === 0.17, `MID-fastinn 0,17 (${P[3].p0})`);
  ok(P[1].hit_rate === 1 && P[1].hit_rate_adj < 0.6,
    `2/2 hrátt = 100% en afturvirkjað ${P[1].hit_rate_adj} — nákvæmlega ofmælingin sem á að hverfa`);
  const expect1 = (2 + 10 * 0.27) / (2 + 10);
  ok(Math.abs(P[1].hit_rate_adj - expect1) < 0.001,
    `formúlan rétt með fastanum: (2+10·0,27)/12 = ${expect1.toFixed(3)}`);
}

/* ============================================================
   4. RAUNGÖGNIN Í data/defcon.json — skema-vörður
   Í forleik er players tómt og það er RÉTT (engar loknar umferðir).
   Þegar tímabilið byrjar verður hver röð að bera bæði hráu töluna
   og afturvirkjuðu — annars getur birting aðeins sýnt þá hráu og
   ofmælingin er komin aftur án þess að nokkuð falli.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("4. RAUNSKRÁIN data/defcon.json — snið og forleiks-hegðun");
console.log("─".repeat(84));
{
  const real = JSON.parse(await readFile(new URL("../data/defcon.json", import.meta.url), "utf8"));
  ok(Array.isArray(real.players), "players er fylki");
  for (const p of real.players.slice(0, 500)) {
    if (!("hit_rate_adj" in p) || !("p0" in p) || !("starts" in p)) {
      ok(false, `röð ${p.fpl_id} vantar hit_rate_adj/p0/starts`); break;
    }
  }
  if (real.players.length) {
    ok(real.players.every(p => p.hit_rate_adj <= 1 && p.hit_rate_adj >= 0),
      "allar afturvirkjaðar tölur í [0,1]");
    ok(real.players.every(p => "hit_rate_adj" in p && "p0" in p),
      `allar ${real.players.length} raðir bera hit_rate_adj og p0`);
  } else {
    ok(true, "forleikur: players tómt — sniðið prófað á tilbúnu gögnunum að ofan");
  }
  /* Nótan í skránni verður að nefna afturvirkjuðu töluna svo næsti
     lesandi viti að hráa talan er ekki sú sem á að birta. Nótan er
     skrifuð af pipeline; hér lesum við hana úr KÓÐANUM því skráin
     sjálf endurnýjast ekki fyrr en pipeline keyrir næst.            */
  ok(/hit_rate_adj/.test(src), "fetch.mjs skrifar nótu sem nefnir hit_rate_adj");
}

/* ============================================================
   5. STÖKKBREYTINGAR-VÖRN — að fjarlægja afturvirknina FELLUR
   Prófið les formúluna úr kóðanum: ef DC_K eða laugar-reikningurinn
   hverfa er þetta próf það eina sem veit af því (appið birtir ekki
   hit_rate_adj enn — sjá CLAUDE.md).
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("5. VARÐAR UM AÐ AFTURVIRKNIN SÉ Í PIPELINE-KÓÐANUM");
console.log("─".repeat(84));
{
  const body = src.slice(start, end);
  ok(/DC_K\s*=\s*10/.test(body), "K = 10 (sama fjölskylda og prevWeight í handoff №4)");
  ok(/hit_rate_adj/.test(body), "hit_rate_adj reiknuð í computeDefcon");
  ok(/starts\s*>=\s*50/.test(body), "laugar-þröskuldur (50 startir) fyrir p0 úr gögnum");
  ok(/0\.27/.test(body) && /0\.17/.test(body), "fallback-fastar DEF 0,27 / MID 0,17 til staðar");
}

/* ============================================================
   6. MARKMENN ERU UTAN DEFCON — OG THETTA VAR VIRK TIMASPRENGJA

   Maelt a `data/player_gw_2526.json`: markmenn eiga **757 leikja-
   umferdir, 750 byrjanir og NULL DefCon-stig, hamark 0** (DEF 6,24 ad
   medaltali, MID 5,75, FWD 2,86). Their eru ekki gjaldgengir.
   EN `computeDefcon` reiknar maelikvardann SJALFUR og sendi markmenn i
   `cbirt`-greinina (`pos === 2 ? cbit : cbirt`), sem hja theim er drifin
   af ENDURHEIMTUM — ad gripa boltann. Hermt med nakvaemlega thessari
   formulu a raungognum: **211 af 757 markmanna-umferdum (27,9%)** na
   throskuldinum. `defcon.json.players` er tom i forleik svo ekkert sast;
   thetta hefdi byrjad ad birtast VID FYRSTU UMFERD.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("6. MARKMENN FA ENGA DEFCON-ROD (og bekkjar-innkoma er ekki miss)");
console.log("─".repeat(84));
{
  /* Markvordur med ENDURHEIMTIR eins og raunverulegur markvordur
     (Roefs 333 a timabili ~ 8-9 per leik) og enga hreinsun.        */
  const { written } = await runDefcon({
    gwMetrics: { 1: [0,0,0,0,0,0], 2: [12,12,12,12,12,12], 3: [12,12,12,12,12,12] },
    recov: { 1: 14 },                       // GK: 0 cbi + 0 tackles + 14 recov = 14 >= 12
    els: [{ id:1, element_type:1 }, { id:2, element_type:2 }, { id:3, element_type:3 }],
  });
  const rows = written?.obj?.players ?? [];
  const gk = rows.filter(r => r.position === 1);
  ok(rows.length > 0, `forsenda: einhverjar radir skrifadar (${rows.length})`);
  ok(gk.length === 0,
     `ENGIN markmanna-rod thott maelikvardinn nai throskuldi (${gk.length})`);
  ok(rows.some(r => r.position === 2) && rows.some(r => r.position === 3),
     "utileikmenn bera hana ENN — annars maelir fullyrdingin ofan ekkert");

  /* BEKKJAR-INNKOMA MA EKKI TELJAST SEM TAPAD TAEKIFAERI.
     Sami leikmadur, sami maelikvardi: 3 byrjanir yfir throskuldi og
     3 innkomur undir honum. Adur: 3/6 = 50%. Nu: 3/3 = 100%.      */
  const { written: w2 } = await runDefcon({
    gwMetrics: { 5: [12,12,12,0,0,0] },
    bench: new Set([5]),                    // sami madur — sja nedar
    els: [{ id:5, element_type:2 }],
  });
  const r5 = (w2?.obj?.players ?? []).find(r => r.fpl_id === 5);
  ok(r5 == null || r5.starts === 0 || r5.starts === undefined
       ? true : r5.starts <= 6,
     "bekkjar-madur bloes ekki upp nefnarann");
  ok(r5 == null, "leikmadur sem BYRJADI ALDREI fær enga rod (0 af 6 innkomum)");
}

/* Og ad reglurnar seu i pipeline-kodanum sjalfum, ekki adeins i profinu. */
{
  const body = src.slice(start, end);
  ok(/pos === 1\)\s*continue|pos === 1\) continue/.test(body.replace(/\s+/g, " "))
     || /if \(pos === 1\)/.test(body),
     "GK-utilokunin er i computeDefcon (ekki adeins i profinu)");
  ok(/st\.starts/.test(body), "byrjana-hlidid les `starts`, ekki adeins minutur");
}

/* _PER_90 — MAELT A HEGDUN, EKKI A TEXTA.
   Fyrsta utgafa thessarar fullyrdingar var `/a\.mins/.test(body) && /\* 90/`
   og hun VAR TOM: `a.mins += minutes` stendur eftir sem hluti af
   somnuninni, svo regexid stodst thott deilingunni vaeri snuid aftur i
   `/ a.starts`. Stokkbreytingin slapp i gegn (0 fallnar) og profid sagdi
   ekkert. Nu er talan sjalf borin saman, og til thess tharf leikmann sem
   BYRJAR en er skipt af — annars eru minutur nakvaemlega 90 per byrjun og
   badar formulur gefa SOMU TOLU (72/540*90 = 12 = 72/6). Fullyrding sem
   getur ekki greint tvaer formulur i sundur maelir hvoruga.             */
{
  const { written } = await runDefcon({
    gwMetrics: { 7: [12,12,12,12,12,12] },
    mins: { 7: 45 },                       // byrjar, skipt af i halfleik
    els: [{ id:7, element_type:2 }],
  });
  const r = (written?.obj?.players ?? []).find(x => x.fpl_id === 7);
  ok(r != null, "forsenda: rodin er skrifud (annars maelir naesta fullyrding ekkert)");
  // 6 byrjanir x 45 min = 270 min, cbit = 72  ->  72/270*90 = 24,0
  // gamla formulan (per byrjun) hefdi gefid 72/6 = 12,0
  ok(r && Math.abs(r.cbit_per_90 - 24) < 0.01,
     `cbit_per_90 = 24,0 per 90 MINUTUR (per byrjun hefdi gefid 12,0) — maelt ${r?.cbit_per_90}`);
}

console.log(`\nDC-AFTURVIRKNI: ${pass} stóðust, ${fail} féllu`);
if (fail) process.exit(1);
