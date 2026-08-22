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
async function runDefcon({ gwMetrics, els, fixtures = [], bench = new Set(), recov = {}, mins = {},
                           existing = null }) {
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
  /* `existing` = defcon.json SEM ER ThEGAR A DISKI. Tom-keyrslu-vordurinn
     les hana, svo kafli 7 getur ekki profad hann an hennar.            */
  if (existing) await writeFile(join(dir, "defcon.json"), JSON.stringify(existing));
  let written = null;
  const rec = { ok: null, n: 0, note: null };
  const factory = new Function("existsSync", "readFile", "DATA", "writeJSON", "record", "status",
    `${decl}\nreturn computeDefcon;`);
  const computeDefcon = factory(
    existsSync, readFile, dir,
    async (name, obj) => { written = { name, obj }; },
    /* NOTAN VAR EKKI GRIPIN (baett vid 20.8.2026). Fjorda breytan er
       `note` og hun er thad EINA sem segir hvad tapadist i tomri keyrslu
       — an hennar gat kafli 7 ekki verid til.                        */
    (k, o, c, note) => { rec.ok = o; rec.n = c; rec.note = note ?? null; },
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
  /* FYRSTA UTGAFAN VAR TAUTOLOGIA OG VAR AFHJUPUD 18.8.2026:
       ok(r5 == null || r5.starts === 0 || r5.starts === undefined ? true
          : r5.starts <= 6, "bekkjar-madur bloes ekki upp nefnarann")
     `||` bindur fastar en `?:`, svo thetta var `(A||B||C) ? true : ...` og
     eina leidin ad `false` var `starts > 6` — i profi sem hefur SEX
     umferdir, svo mork falska greinarinnar VORU hamark gagnanna.
     Stokkbreytingin sem hun heitir eftir (innkomur taldar sem byrjanir
     aftur) skildi eftir `r5` med `starts: 6, hits: 3` og hun helst GRAEN.
     Nu er hun tvihlida og bein: madur sem byrjar ALDREI a enga rod, og
     til samanburdar er madur sem BYRJAR med rod og rettan nefnara.     */
  ok(r5 == null, "leikmadur sem BYRJADI ALDREI fær enga rod (0 af 6 innkomum)");
  {
    const { written: w3 } = await runDefcon({
      gwMetrics: { 5: [12,12,12,0,0,0] },        // sami madur, EN byrjar
      els: [{ id:5, element_type:2 }],
    });
    const r = (w3?.obj?.players ?? []).find(x => x.fpl_id === 5);
    ok(r != null, "forsenda: sami madur BYRJANDI fær rod");
    ok(r && r.starts === 6, `nefnarinn er 6 byrjanir, ekki fleiri (${r?.starts})`);
    ok(r && r.threshold_hits === 3, `3 af 6 yfir throskuldi (${r?.threshold_hits})`);
  }
}

/* Og ad reglurnar seu i pipeline-kodanum sjalfum, ekki adeins i profinu. */
{
  const body = src.slice(start, end);
  ok(/pos !== 2 && pos !== 3 && pos !== 4/.test(body),
     "utilokunin krefst ThEKKTRAR utileikmanna-stodu (ekki adeins pos === 1)");
  ok(/st\.starts/.test(body), "byrjana-hlidid les `starts`, ekki adeins minutur");
}

/* STADA SEM VANTAR MA EKKI OPNA GK-GATID UM BAKDYRNAR (18.8.2026).
   `pos` kemur ur `posOf[id]`, byggt ur bootstrap-`els`. Element sem er i
   live-skranni en VANTAR i bootstrap fekk `pos === undefined`, slapp gegnum
   `pos === 1`-utilokunina og var skorad a `cbirt`-greininni — somu
   endurheimta-braut og markmenn, sem er einmitt thad sem lokad var fyrir. */
{
  const { written } = await runDefcon({
    gwMetrics: { 42: [0,0,0,0,0,0], 2: [12,12,12,12,12,12] },
    recov: { 42: 14 },
    els: [{ id: 2, element_type: 2 }],     // 42 VANTAR viljandi i els
  });
  const rows = written?.obj?.players ?? [];
  ok(rows.some(r => r.fpl_id === 2), "forsenda: thekktur utileikmadur er skrifadur");
  ok(!rows.some(r => r.fpl_id === 42),
     "element an stodu i bootstrap fær ENGA rod (GK-brautin er lokud)");
  ok(rows.every(r => [2,3,4].includes(r.position)),
     "engin rod med ohreinni/vantandi stodu");
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

/* ============================================================
   7. TOM KEYRSLA: SKRAIN ER FRYST — OG NOTAN VERDUR AD NEFNA
      `opportunity` LIKA (20.8.2026)

   Vordurinn fra 18.8. heldur gomlu skranni thegar `out` er tomt. Thad er
   rett. EN `opportunity` er byggd A UNDAN honum ur `els` (lids-xGI og
   xGC markvarda) og er ekki had `starts` — hun getur thvi verid FERSK og
   RETT og er samt hent med. Notan sagdi adeins "kept the old file", sem
   gefur ranga mynd af thvi hvad tapadist.

   SVIDSMYNDIN ER RAUNVERULEG, EKKI TILBUIN: allir leikmenn af bekknum
   (`starts: 0`) gefur `out.length === 0` medan `teamAtt` — sem les EKKERT
   ur live-skranum — er full. Nakvaemlega su blanda sem 18.8.-vordurinn
   var skrifadur fyrir.

   VID SAMEINUM EKKI OG ThAD ER MAELT VAL: sameining myndi skrifa gomlu
   leikmanna-rodina med `updated` dagsins, svo frosin tafla fengi ferskan
   timastimpil. Kafli 4 ("raunskrain") og allt annad i thessu repo-i les
   `updated` sem "hvenaer var thetta maelt".
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("7. TOM KEYRSLA — FRYSTING, OG NOTAN SEGIR HVAD TAPADIST");
console.log("─".repeat(84));
{
  const els = [
    { id:1, element_type:2, team:1, expected_goal_involvements:"3.5", minutes:0 },
    { id:2, element_type:3, team:2, expected_goal_involvements:"7.1", minutes:0 },
    { id:3, element_type:1, team:1, expected_goal_involvements:"0.0",
      minutes:3420, expected_goals_conceded:"38.0" },
  ];
  const existing = {
    updated: "gamalt", players: [{ id:99, starts:12, hit_rate_adj:0.31 }],
    opportunity: { 1: { defcon_opportunity: 50 } },
  };
  const { written, rec } = await runDefcon({
    /* ALLIR af bekknum -> `starts: 0` -> `out` verdur tomt. */
    gwMetrics: { 1: [12], 2: [12] },
    bench: new Set([1, 2]),
    els,
    fixtures: [{ id:1, finished:false, team_h:1, team_a:2, event:1 }],
    existing,
  });

  ok(written === null, "skrain er EKKI skrifud — gamla skran stendur",
     JSON.stringify(written?.obj?.players));
  ok(rec.ok === false, `heimildin er RAUD, ekki graen (${rec.ok})`);
  ok(rec.n === 1, `talan er fjoldinn A DISKI (1), ekki 0 — ${rec.n}`);
  /* FORSENDA FYRIR NEIKVAEDU FULLYRDINGUNNI (CLAUDE.md 5b regla 2):
     notan verdur ad vera til og nefna frystinguna adur en spurt er
     hvort hun nefni `opportunity`.                                   */
  ok(typeof rec.note === "string" && /KEPT the old file/.test(rec.note),
     "notan er til og segir ad skrain se fryst", String(rec.note).slice(0, 60));
  ok(/opportunity/i.test(rec.note || ""),
     "OG hun nefnir `opportunity` — ferska taflan var hent lika", rec.note);
  /* Talan i notunni er RAUNVERULEG: tvo lid komu ur `els`, svo hun ma
     ekki vera 0 (thad vaeri "engin fersk tafla", sem er ekki tilfellid). */
  /* TALAN ER TVIThAETT SIDAN 20.8.2026 og thad er lagfaeringin sem sest hér:
     "for R of N teams". N = radirnar sem voru byggdar (2), R = thaer sem fengu
     RAUNVERULEGA tolu (1). Lid 2 hefur engan markmann yfir 400 minutum, svo
     eigid xGC er ekki maelanlegt — adur skilaði `?? 1,4` tolu og bædi lidin
     virtust rated. Fullyrdingin ver bædi ad N se raunverulegt (ekki 0) OG ad
     R telji ekki radir sem bera null. */
  const m = /for (\d+) of (\d+) teams/.exec(rec.note || "");
  ok(!!m && +m[2] === 2, `og hun telur lidin sem toldust (2) — ${m?.[2]}`);
  ok(!!m && +m[1] === 1,
    `og ADEINS 1 theirra fékk raunverulega tolu (lid 2 hefur engan markmann yfir 400 min) — ${m?.[1]}`);
  /* VAR TAUTOLOGIA (fundid 21.8.2026): `String(written)` er "null" thegar
     ekkert var skrifad og "[object Object]" thegar SKRIFAD VAR — hvorugt
     getur nokkru sinni innihaldid "updated", svo fullyrdingin var sonn
     an tillits til hegdunar. Sannad med stokkbreytingu: skrifa-faersla
     med `updated:"2026-08-21T00:00:00Z"` for gegn ohaggud.
     `JSON.stringify` ser innihaldid; `String` ser gerd hlutarins.      */
  ok(!/updated/.test(JSON.stringify(written)),
     "engin skrif thydir enginn nyr timastimpill");
}

/* ============================================================
   8. DEFCON-TAEKIFAERI: NULLSTILLT BOOTSTRAP -> `null`, EKKI 57 (20.8.2026)

   VILLAN SEM VAR: `own = teamDef[tid]?.xgc90 ?? 1.4` og
   `oppAttSum += (teamAtt[opp] || 50) / 38`. Baðar varaleidirnar segja
   "vantar" med TOLU. Um leid og FPL nullstillir bootstrap-summurnar vid
   timabils-vendingu fara thaer i gang hja OLLUM 20 klubbum samtimis og
   formulan gefur 1,4*22 + (50/38)*20 = **57 hja ollum**. MAELT 20.8.2026 a
   raunskranni: i dag 14 olik gildi (53-86); nullstillt -> ein tala, tuttugu
   sinnum. Hun stendur i ~5 umferdir thvi `minutes > 400` er onaeðanlegt.

   HVERS VEGNA ThETTA VERDUR AD VERA TILBUID OG EKKI RAUNSKRAIN:
   nullstillingin GERIST 21. agust. `clock-states.mjs` kafli B3c maelir hrun-
   nemann a raungognum (14 olik gildi i dag) og fullyrdir ad varaleidirnar
   seu FARNAR ur kodanum — en hvorugt getur svarad "hvad gerir kodinn thegar
   summurnar ERU 0?". Thad er nakvaemlega mynstrid i haus thessarar skrar:
   kodinn kviknar einn morgun, svo hann er dreginn UT og keyrdur adur.

   FJOGUR ASTOND, OLL A SOMU BRAUT:
     A  nullstillt bootstrap        -> null hja ollum (gamla kodinn: 57)
     B  raunveruleg inntok          -> TALA, og hun er hvorki 57 ne su sama
     C  eigid xGC til, sokn 0       -> null (halfur utreikningur er sama villa)
     D  engir leikir framundan      -> null (gamla kodinn: oppAttAvg = 1,4)
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("8. DEFCON-TAEKIFAERI — VANTANDI INNTOK GEFA null, ALDREI TILBUINN FASTA");
console.log("─".repeat(84));
{
  /* Tveir varnarmenn sem BYRJA (svo `out` se ekki tomt og skrain skrifist)
     og einn markmadur per lid. Leikjaskra: lid 1 gegn lidi 2. */
  const gwMetrics = { 1: [12, 12], 2: [12, 12] };
  const fixtures = [{ id: 1, finished: false, team_h: 1, team_a: 2, event: 1 }];
  const oppOf = w => (w?.obj?.opportunity) || {};

  /* ---- A. NULLSTILLT BOOTSTRAP (21. agust) ---- */
  const zeroed = [
    { id: 1, element_type: 2, team: 1, expected_goal_involvements: "0.0", minutes: 0 },
    { id: 2, element_type: 2, team: 2, expected_goal_involvements: "0.0", minutes: 0 },
    { id: 3, element_type: 1, team: 1, expected_goal_involvements: "0.0", minutes: 0,
      expected_goals_conceded: "0.0" },
    { id: 4, element_type: 1, team: 2, expected_goal_involvements: "0.0", minutes: 0,
      expected_goals_conceded: "0.0" },
  ];
  const A = oppOf((await runDefcon({ gwMetrics, els: zeroed, fixtures })).written);
  ok(Object.keys(A).length === 2,
    `A: rodin er SKRIFUD fyrir bædi lidin (${Object.keys(A).length}) — hun ma ekki horfa, `
    + "App.jsx reiknar sitt eigid afrit thegar taflan er TOM");
  ok(Object.values(A).every(o => o.defcon_opportunity === null),
    `A: defcon_opportunity er null hja ollum (${Object.values(A).map(o => o.defcon_opportunity).join(",")})`);
  ok(!Object.values(A).some(o => o.defcon_opportunity === 57),
    "A: og ENGIN ber 57 — talan sem gamli kodinn gaf ollum 20 klubbum");
  ok(Object.values(A).every(o => o.own_xgc90 === null && o.opp_attack_avg === null),
    "A: badir undirlidirnir eru null lika (ekki 1,4 og 50/38)");

  /* ---- B. RAUNVERULEG INNTOK: talan kemur, og hun er dreifd ----
     lid 1: markm. 38,0 xGC / 3420 min = 1,00 per 90 · sokn lids 2 = 7,1/38
     lid 2: markm. 57,0 xGC / 3420 min = 1,50 per 90 · sokn lids 1 = 3,5/38 */
  const real = [
    { id: 1, element_type: 2, team: 1, expected_goal_involvements: "3.5", minutes: 900 },
    { id: 2, element_type: 2, team: 2, expected_goal_involvements: "7.1", minutes: 900 },
    { id: 3, element_type: 1, team: 1, expected_goal_involvements: "0.0", minutes: 3420,
      expected_goals_conceded: "38.0" },
    { id: 4, element_type: 1, team: 2, expected_goal_involvements: "0.0", minutes: 3420,
      expected_goals_conceded: "57.0" },
  ];
  const B = oppOf((await runDefcon({ gwMetrics, els: real, fixtures })).written);
  const exp1 = Math.round(1.0 * 22 + (7.1 / 38) * 20);      // 26
  const exp2 = Math.round(1.5 * 22 + (3.5 / 38) * 20);      // 35
  ok(B[1]?.defcon_opportunity === exp1,
    `B: lid 1 fær ${exp1} ur raunverulegum inntokum (${B[1]?.defcon_opportunity})`);
  ok(B[2]?.defcon_opportunity === exp2,
    `B: lid 2 fær ${exp2} (${B[2]?.defcon_opportunity})`);
  ok(B[1]?.defcon_opportunity !== B[2]?.defcon_opportunity,
    "B: og lidin fa SITT HVORT gildi — lagfaeringin slokkti ekki a dalknum");
  ok(B[1]?.own_xgc90 === 1 && B[2]?.own_xgc90 === 1.5,
    `B: eigid xGC per 90 er raunverulega maelt (${B[1]?.own_xgc90} / ${B[2]?.own_xgc90})`);

  /* ---- C. HALFUR UTREIKNINGUR ER SAMA VILLAN I MINNI STAERD ----
     Markmenn med minutur (eigid xGC TIL) en sokn allra = 0. Gamli kodinn
     hefdi blandad raunverulegu xGC vid `50/38` og skilad tolu.        */
  const half = [
    { id: 1, element_type: 2, team: 1, expected_goal_involvements: "0.0", minutes: 0 },
    { id: 2, element_type: 2, team: 2, expected_goal_involvements: "0.0", minutes: 0 },
    { id: 3, element_type: 1, team: 1, expected_goal_involvements: "0.0", minutes: 3420,
      expected_goals_conceded: "38.0" },
    { id: 4, element_type: 1, team: 2, expected_goal_involvements: "0.0", minutes: 3420,
      expected_goals_conceded: "57.0" },
  ];
  const C = oppOf((await runDefcon({ gwMetrics, els: half, fixtures })).written);
  ok(C[1]?.own_xgc90 === 1,
    `C: forsenda — eigid xGC ER til (${C[1]?.own_xgc90}), svo naesta fullyrding maelir eitthvad`);
  ok(C[1]?.defcon_opportunity === null && C[2]?.defcon_opportunity === null,
    `C: en gildid er samt null thvi sokn andstaedings vantar `
    + `(${C[1]?.defcon_opportunity} / ${C[2]?.defcon_opportunity})`);

  /* ---- D. ENGIR LEIKIR FRAMUNDAN -> null, ekki `oppAttAvg = 1,4` ---- */
  const D = oppOf((await runDefcon({ gwMetrics, els: real, fixtures: [] })).written);
  ok(Object.values(D).every(o => o.fixtures_used === 0),
    "D: forsenda — glugginn er tomur (fixtures_used = 0)");
  ok(Object.values(D).every(o => o.defcon_opportunity === null),
    `D: og gildid er null, ekki 1,4-varaleidin `
    + `(${Object.values(D).map(o => o.defcon_opportunity).join(",")})`);

  /* ---- `record`-talan ma ekki ljuga um thetta ---- */
  const recA = (await runDefcon({ gwMetrics, els: zeroed, fixtures })).rec;
  ok(/^0 of 2 teams/.test(String(recA.note)),
    `record segir "0 of 2 teams with an opportunity rating" — ekki "2" (${recA.note?.slice(0, 40)})`);
  const recB = (await runDefcon({ gwMetrics, els: real, fixtures })).rec;
  ok(/^2 of 2 teams/.test(String(recB.note)),
    `og "2 of 2" thegar tolurnar eru raunverulegar (${recB.note?.slice(0, 20)})`);
}

console.log(`\nDC-AFTURVIRKNI: ${pass} stóðust, ${fail} féllu`);
if (fail) process.exit(1);
