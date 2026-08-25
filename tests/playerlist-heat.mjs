/* ============================================================
   HITAKORTID I LEIKMANNALISTANUM — FJORDUNGS-REGLAN, MAELD

   AF HVERJU: notandinn (20.8.2026) — *"i player stats eru eiginlega allir
   reitir graenlitadir thegar eg er ekki buinn ad filtera neitt ... thad
   segir manni litid ef allir reitir eru graenmerktir og oll verd
   raudmerkt. Bara thegar eg er ekki buinn ad velja neina filtera."*

   Athugasemdin i `PlayerList.jsx` hefur ALLTAF sagt regluna rett: "efsti
   og nedsti fjordungur litadur og MIDJAN HELMINGURINN olitadur". Threpin
   voru hins vegar lesin af `t = (v - P10) / (P90 - P10)` — stodu i
   GILDIS-RUMI, ekki hundradshluta — og thau tvo fara adeins saman ef
   dreifingin er JOFN a [P10, P90]. Maelt: midgildi litads hlutfalls
   **63,8%** og HAMARK **100,0%**, thar sem fjordungs-reglan getur aldrei
   farid yfir 50%. Fullyrdingin var thvi til i athugasemd og hvergi annars.

   ThREKKIR SEM ThETTA SAFN THEKKIR (CLAUDE.md 5b):
     · **THEKJA ER FULLYRDING, EKKI LOGGA.** "Ekki allt graent" sem er
       satt af thvi ad syndarglugginn synir faar radir er TOM fullyrding.
       Kafli B telur radir OG holf og FELLUR undir golfinu.
     · **FULLYRDING SEM THARF TVENNT TIL AD BREGDAST ER VEIKARI EN HUN
       LITUR UT.** "Litad hlutfall <= 50%" ein er of veik: hun er lika
       sonn ef ENGINN dalkur er litadur. Anti-tomleiki er thvi SER
       fullyrding i baedi A og B: naegilega margir dalkar VERDA ad na
       naerri thakinu.
     · MOTVOGIN ERU MERKT: A1b (thunn thok), A2 (>= 25 dalkar naerri
       thakinu), A4 (allir sex tonar notadir), A7/A9 (utgildi FA lit i
       sama pool) og B1 (>= 15 dalkar litadir a skjanum). Thau falla ef
       einhver SLEKKUR a lit i osiada astandinu i stad thess ad laga
       kvardann — sannreynt med stokkbreytingu M7.
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

const PL_SRC = readFileSync(new URL("src/PlayerList.jsx", REPO).pathname, "utf8");
const { STAT_DEFS } = await import(new URL("src/stats.js", REPO).href);

/* ============================================================
   A. FJORDUNGS-REGLAN A OLLUM RODUM x OLLUM DALKUM

   DOM-id ber adeins ~24 radir (syndarvaeding), svo per-dalks hlutfallid
   er EKKI maelanlegt thar. Thess vegna er `heatTone` a einingarsvidi og
   FLUTT UT — profid keyrir SAMA kodann sem appid teiknar med, ekki afrit
   (sbr. `buildTeamMetrics`, CLAUDE.md 7).

   `heatScale`-LYKKJAN er hins vegar afram inni i hooknum af thvi ad
   `stats.test.mjs` 15c dregur hana ut med regexi. Vid drogum hana ut med
   NAKVAEMLEGA sama hatti — thad er sami KODI, adeins onnur utdrattar-leid.
   ============================================================ */
const { heatTone, pctRank, HEAT_CUT, HEAT_GOOD, HEAT_BAD } =
  await import(new URL("src/PlayerList.jsx", REPO).href);

console.log("\nA) FJORDUNGS-REGLAN — OLL 595 x 124 HOLFIN");

ok("`heatTone`, `pctRank`, `HEAT_CUT` eru FLUTT UT (annars vaeri profid afrit)",
  typeof heatTone === "function" && typeof pctRank === "function" && HEAT_CUT === 0.25,
  `heatTone=${typeof heatTone} pctRank=${typeof pctRank} HEAT_CUT=${HEAT_CUT}`);
ok("threpin eru thrju i hvora att (thakid a darkasta tonninum er 1/3)",
  HEAT_GOOD.length === 3 && HEAT_BAD.length === 3);

const scaleM = PL_SRC.match(/const heatScale = useMemo\(\(\) => \{([\s\S]*?)\n  \}, \[/);
ok("`heatScale`-smidin fannst i PlayerList.jsx", !!scaleM);
const buildScale = new Function("visibleCols", "pinnedKeys", "filtered", "STAT_BY_KEY",
  `const m={};${scaleM[1].replace(/^\s*const m = \{\};/m, "")}\nreturn m;`);

/* ---- POOLINN EINS OG SJALFGEFNA SYNIN BYGGIR HANN ----
   Forleikur -> `season` er nyjasta LOKNA timabilid ur player_seasons.json,
   `src` er sogulega rodin med verdi/eignarhaldi/stodu dagsins ofan a.  */
const players = J("players.json").players || J("players.json");
const seasonsFile = J("player_seasons.json");
const season = (seasonsFile.seasons || [])[0];
const rows = players.map(p => {
  const hist = seasonsFile.players?.[String(p.code)]?.[season];
  return { p, name: p.web_name,
    src: hist ? { ...hist, now_cost: p.now_cost,
                  selected_by_percent: p.selected_by_percent,
                  element_type: p.element_type } : null };
});
const withSrc = rows.filter(r => r.src).length;
console.log(`   pool: ${rows.length} radir, ${withSrc} med ${season}-rod, `
  + `${rows.length - withSrc} an sogu`);
ok(`osiadi pooolinn er RAUNVERULEGA breidur (${rows.length} radir, ${withSrc} med gogn)`,
  rows.length > 500 && withSrc > 400 && rows.length - withSrc > 50,
  "— annars maelir thetta ekki thad astand sem var tilkynnt");

const heatCols = STAT_DEFS.filter(d => !d.no_heat);
const scale = buildScale(heatCols, new Set(), rows, {});
const scaled = Object.keys(scale);
console.log(`   dalkar med kvarda: ${scaled.length} af ${heatCols.length}`);

/* ---- A1. LITAD <=> UTAN MIDJU-HELMINGSINS, MAELT A HVERJU HOLFI ----
   ThETTA ER FULLYRDINGIN SJALF, ekki hlutfall: "efsti og nedsti
   fjordungur litadur og MIDJAN HELMINGURINN olitadur". Hun er profud
   gegn SJALFSTAEDRI VIDMIDS-UTFAERSLU a hundradshluta-rodinni (bein
   talning, engin tvi-leit) — sama adferd og `name-match.mjs` notar.
   Gamla formulan (`(v-P10)/(P90-P10)`) brytur hana i thusundum holfa:
   hun litar eftir stodu i GILDIS-RUMI, sem er ekki rod.              */
const refRank = (vals, v) => {          // vidmids-utfaersla: O(n) talning
  let below = 0, at = 0;
  for (const x of vals) { if (x < v) below++; else if (x === v) at++; }
  return (below + below + at) / (2 * vals.length);
};
const perCol = [];
let nullCells = 0, nullColoured = 0, tone = {};
let wrongSide = 0, cellsChecked = 0, outside = 0, inside = 0;
for (const d of heatCols) {
  const sc = scale[d.key];
  let g = 0, r = 0, n = 0;
  for (const row of rows) {
    const v = row.src ? d.get(row.src) : null;
    const bg = heatTone(sc, v);
    if (v == null || !Number.isFinite(v)) { nullCells++; if (bg) nullColoured++; continue; }
    n++;
    if (bg) { tone[bg] = (tone[bg] || 0) + 1; if (HEAT_GOOD.includes(bg)) g++; else r++; }
    if (!sc) continue;
    cellsChecked++;
    let t = refRank(sc.vals, v); if (sc.invert) t = 1 - t;
    const shouldColour = t >= 1 - HEAT_CUT || t <= HEAT_CUT;
    if (shouldColour) outside++; else inside++;
    if (shouldColour !== !!bg) wrongSide++;
    /* OG ATTIN: efri fjordungurinn VERDUR ad vera graenn, ekki bara
       litadur — annars vaeri `hi` snuid vid an thess ad thetta faelli. */
    if (bg && (t >= 1 - HEAT_CUT) !== HEAT_GOOD.includes(bg)) wrongSide++;
  }
  if (sc && n) perCol.push({ key: d.key, n, g, r, pct: 100 * (g + r) / n,
    vals: sc.vals, invert: sc.invert });
}
console.log(`   holf profud gegn vidmids-rodinni: ${cellsChecked} `
  + `(${outside} utan midju-helmingsins, ${inside} innan)`);
ok(`forsenda: BADIR flokkar eru raunverulega til (${outside} utan / ${inside} innan)`,
  outside > 5000 && inside > 5000);
ok(`LITAD <=> UTAN MIDJU-HELMINGSINS i ollum ${cellsChecked} holfum (${wrongSide} villur)`,
  wrongSide === 0,
  "— gamla formulan las stodu i GILDIS-RUMI, sem er ekki hundradshluti");

/* ---- A1b. PER-DALKS HLUTFALLID — TVEGGJA-HLIDA, LEITT THAK ----
   Ef engin jafngildi vaeru vaeri hlutfallid NAKVAEMLEGA 2*HEAT_CUT = 50%.
   Jafngildi eru eina fravikid, og thau eru MAELANLEG: adeins jafn-blokkin
   sem INNIHELDUR skurdpunktinn getur flutt holf yfir hann, og hun getur
   flutt i mesta lagi sjalfa sig. Thakid er thvi |f - 50%| <= (staerd
   blokkanna vid 0,25 og 0,75) — REIKNAD per dalk, ekki valid.
   Gamla formulan brytur thetta i 40 af 70 dolkum.                     */
const blockAt = (vals, q) => {          // staerd jafn-blokkar sem inniheldur rod q
  const v = vals[Math.min(vals.length - 1, Math.floor(q * vals.length))];
  let m = 0; for (const x of vals) if (x === v) m++;
  return m / vals.length;
};
for (const c of perCol) {
  const sl = blockAt(c.vals, HEAT_CUT), sh = blockAt(c.vals, 1 - HEAT_CUT);
  c.slack = 100 * (sl === sh ? sl : sl + sh);
  c.dev = Math.abs(c.pct - 100 * 2 * HEAT_CUT);
}
perCol.sort((a, b) => b.pct - a.pct);
const pcts = perCol.map(x => x.pct);
const med = [...pcts].sort((a, b) => a - b)[Math.floor(pcts.length / 2)];
console.log(`   litad hlutfall: midgildi ${med.toFixed(1)}%  hamark ${pcts[0].toFixed(1)}%`
  + ` (${perCol[0].key})   [gamla formulan: midgildi 63,8%  hamark 100,0%]`);
const overBound = perCol.filter(x => x.dev > x.slack + 1e-6);
ok(`hver dalkur liggur innan leidda thaksins |f - 50%| <= jafn-blokk `
  + `(${overBound.length} af ${perCol.length} yfir)`,
  overBound.length === 0,
  overBound.slice(0, 6).map(x =>
    `${x.key} f=${x.pct.toFixed(1)}% thak=${(50 + x.slack).toFixed(1)}%`).join(", "));
/* MOTVOGID: thakid er ONYTT ef jafn-blokkirnar eru storar hja ollum.
   Naegilega margir dalkar VERDA ad hafa THUNNT thak — hja theim er 50%
   naerri hart, svo fullyrdingin hefur bit.                            */
const tight = perCol.filter(x => x.slack <= 5);
ok(`...OG ${tight.length} dalkar hafa thak <= 55% (thar er 50% naerri hart)`,
  tight.length >= 20,
  "— vaeri thakid alls stadar breitt fullyrdi A1b ekkert");
ok(`midgildid liggur a reglunni (${med.toFixed(1)}%, var 63,8%)`, med > 45 && med <= 52);

/* ---- A2. ANTI-TOMLEIKI — MOTVOGID VID A1 ----
   A1 ein er ONYT: hun er lika sonn ef ekkert er litad. Naegilega margir
   dalkar VERDA ad liggja naerri thakinu.                              */
const nearCap = perCol.filter(x => x.pct >= 45);
ok(`...OG litirnir eru enn thar: ${nearCap.length} dalkar >= 45% litad (af ${perCol.length})`,
  nearCap.length >= 25,
  "— ef thetta hrynur er einhver buinn ad SLOKKVA a lit i stad thess ad laga kvardann");
const totalCells = perCol.reduce((s, x) => s + x.n, 0);
ok(`thekja: ${totalCells} holf med raunverulegt gildi maeld yfir ${perCol.length} dalka`,
  totalCells > 20000 && perCol.length >= 60, `fekk ${totalCells} / ${perCol.length}`);

/* ---- A3. NULL FAER ALDREI LIT ----
   Neikvaed fullyrding VERDUR ad nefna eitthvad sem var sannanlega tharna
   (CLAUDE.md 5b): nullin eru TALIN fyrst.                            */
console.log(`   null-holf i poolnum: ${nullCells}`);
ok(`forsenda: nullin eru raunverulega til (${nullCells} holf)`, nullCells > 5000);
ok("ENGIN null-holf eru litud — 'vantar' er ekki maeling", nullColoured === 0,
  `fekk ${nullColoured}`);

/* ---- A4. TONNINN HRYNUR EKKI I EINN ----
   "Allt graent" er TVAER fullyrdingar: of margt er litad, OG thad sem er
   litad er allt sami tonninn. Klippingin i `t=1` gaf Haaland (239 stig)
   og Bruno G. (154) NAKVAEMLEGA sama lit — maelt 64,5% af graenum
   holfum a darkasta tonninum. Med thremur JOFNUM threpum er thakid
   1/3, svo 40% er rumt golf ofan a byggingu, ekki stillt tala.       */
const greens = HEAT_GOOD.reduce((s, c) => s + (tone[c] || 0), 0);
const reds = HEAT_BAD.reduce((s, c) => s + (tone[c] || 0), 0);
const darkG = 100 * (tone[HEAT_GOOD[2]] || 0) / greens;
const darkR = 100 * (tone[HEAT_BAD[2]] || 0) / reds;
console.log(`   darkasti graeni ${darkG.toFixed(1)}% af graenum (var 64,5%), `
  + `darkasti raudi ${darkR.toFixed(1)}% af raudum (var 67,6%)`);
ok(`darkasti graeni tonninn er ekki meirihluti graenna holfa (${darkG.toFixed(1)}%)`,
  darkG < 40, "— threpin thrju eru til i kodanum en ekki a skjanum");
ok(`sama fyrir rauda endann (${darkR.toFixed(1)}%)`, darkR < 40);
ok(`...OG allir sex tonar eru raunverulega notadir`,
  [...HEAT_GOOD, ...HEAT_BAD].every(c => (tone[c] || 0) > 100),
  [...HEAT_GOOD, ...HEAT_BAD].map(c => `${c}=${tone[c] || 0}`).join(" "));

/* ---- A5. VERD ER EKKI ALLT RAUTT ----
   `now_cost` er `hi:false`, og hann er dalkurinn sem notandinn nefndi
   berum orðum. Hann er lika eini dalkurinn thar sem ENGINN er null, svo
   hann getur ekki falid sig i null-reglunni.                         */
const priceD = STAT_DEFS.find(d => d.key === "now_cost");
const pSc = scale.now_cost;
let pg = 0, pr = 0, pu = 0;
for (const row of rows) {
  const v = row.src ? priceD.get(row.src) : null;
  if (v == null) continue;
  const bg = heatTone(pSc, v);
  if (!bg) pu++; else if (HEAT_GOOD.includes(bg)) pg++; else pr++;
}
console.log(`   Verd: graent ${pg}, raudt ${pr}, olitad ${pu}`);
ok(`Verd er EKKI allt raudt — ${pg} graen / ${pr} raud / ${pu} olitud`,
  pg > 50 && pr > 20 && pu > 50, "— `hi:false` snyr kvardanum, hann litar ekki allt");
ok("Verd: odyrasti madurinn er GRAENN og dyrasti er RAUDUR (`hi:false` snyr)",
  HEAT_GOOD.includes(heatTone(pSc, pSc.vals[0]))
  && HEAT_BAD.includes(heatTone(pSc, pSc.vals[pSc.vals.length - 1])));

/* ---- A6. THEKKT SVAR FYRIRFRAM ----
   Jofn dreifing 0..99: fjordungs-reglan segir NAKVAEMLEGA 25 graen, 25
   raud, 50 olitud, og threpin jafn stor. Ef thetta er ekki nakvaemt er
   `t` ekki hundradshluti.                                            */
const uni = { vals: Array.from({ length: 100 }, (_, i) => i), invert: false };
const cnt = {};
for (const v of uni.vals) { const b = heatTone(uni, v) || "none"; cnt[b] = (cnt[b] || 0) + 1; }
const uG = HEAT_GOOD.reduce((s, c) => s + (cnt[c] || 0), 0);
const uR = HEAT_BAD.reduce((s, c) => s + (cnt[c] || 0), 0);
ok(`jofn dreifing 0..99 -> NAKVAEMLEGA 25 graen / 25 raud / 50 olitud `
  + `(fekk ${uG}/${uR}/${cnt.none || 0})`,
  uG === 25 && uR === 25 && (cnt.none || 0) === 50);
ok(`...og threpin eru jofn innan fjordungsins `
  + `(${HEAT_GOOD.map(c => cnt[c] || 0).join("/")})`,
  HEAT_GOOD.every(c => (cnt[c] || 0) >= 8 && (cnt[c] || 0) <= 9));

/* ---- A7. JAFNGILDI ERU EIN MAELING, EKKI MARGAR RODADAR ----
   50,5% af `goals_scored` eru NAKVAEMLEGA 0. Adur fengu their ALLIR
   darkasta rauda — 310 holf sem fullyrtu "verstur" um menn sem eru
   allir jafnir. Midpunkts-rod gefur theim EITT svar, og thad er
   olitad thegar blokkin sper yfir fjordungs-morkin.                  */
const tie = { vals: [...Array(60).fill(0), ...Array.from({ length: 40 }, (_, i) => i + 1)],
              invert: false };
ok("jafn-blokk sem sper yfir fjordungs-morkin faer EITT svar og thad er OLITAD",
  heatTone(tie, 0) === null,
  `fekk ${heatTone(tie, 0)} — midpunkts-rod ${pctRank(tie.vals, 0).toFixed(4)}`);
ok("...en jafn-blokk sem liggur ALVEG innan nedsta fjordungsins ER raud",
  HEAT_BAD.includes(heatTone(
    { vals: [...Array(10).fill(0), ...Array.from({ length: 90 }, (_, i) => i + 1)], invert: false }, 0)));
/* Og einraedid: raunveruleg utgildi FA lit i sama poolnum, svo A7 er
   ekki "aldrei litad" i dulargervi.                                  */
ok("...og hastu gildin i SAMA poolnum eru graen (A7 er ekki 'aldrei litad')",
  HEAT_GOOD.includes(heatTone(tie, 40)));

/* ---- A8. EINRAEDI ----
   Haerra gildi ma ALDREI fa "verri" ton en laegra (og andstaedan med
   `invert`). Threp sem er ekki einraett er villa sem hvorki hlutfoll ne
   tonar naa.                                                          */
{
  /* Kvardi fra VERSTA ton til BESTA. `null` (midjan) er i midjunni.   */
  const order = [...HEAT_BAD].reverse().concat([null], HEAT_GOOD);
  const idx = c => order.indexOf(c ?? null);
  let mono = 0, monoInv = 0, steps = 0;
  for (const key of scaled) {
    /* BADAR ATTIR PROFADAR A SAMA POOL, svo `hi:false`-dalkur og
       `hi:true`-dalkur eru ekki bornir saman vid sama vaentingu.       */
    const up = { vals: scale[key].vals, invert: false };
    const dn = { vals: scale[key].vals, invert: true };
    let prev = -1, prevInv = order.length;
    for (const v of up.vals) {
      const a = idx(heatTone(up, v)), b = idx(heatTone(dn, v));
      steps++;
      if (a < prev) mono++;
      if (b > prevInv) monoInv++;
      prev = a; prevInv = b;
    }
  }
  ok(`tonninn er EINRAETT BATNANDI med gildinu (hi:true) i ollum ${scaled.length} `
    + `dolkum, ${steps} skref (${mono} brot)`, mono === 0);
  ok(`...og einraett LAEKKANDI thegar \`invert\` er a (hi:false) (${monoInv} brot)`,
    monoInv === 0);
  /* Anti-tomleiki: einraedid er ONYTT ef tonninn er alltaf sá sami.   */
  const distinct = new Set();
  for (const key of scaled) for (const v of scale[key].vals)
    distinct.add(heatTone({ vals: scale[key].vals, invert: false }, v));
  ok(`forsenda: tonninn tekur raunverulega mörg gildi (${distinct.size} af 7)`,
    distinct.size === 7);
}

/* ---- A9. "ALLIR EINS" — OG HLIDID ER SHORT-CIRCUIT, EKKI VIRKNIN ----
   STOKKBREYTING SEM LIFDI, OG THAD VAR UPPLYSING (20.8.2026): ad
   fjarlaegja `if (!(vals[last] > vals[0])) continue;` ur `heatScale`
   BREYTIR ENGU a skjanum — med rodum er midpunktur jafn-blokkar sem er
   ALLUR poolinn nakvaemlega 0,5, sem liggur i midju-helmingnum og faer
   thvi engan ton hvort sem er. Med gomlu formulunni VAR hlidid
   nauðsynlegt (`(v-lo)/(hi-lo)` = 0/0 = NaN).
   Baedi eru thvi fullyrt her, hvort i sinu lagi:
     · HEGDUNIN (rodin sjalf ver hana — helst thott hlidid fari)
     · HLIDID (svo thad verdi ekki fjarlaegt thegjandi og `heatScale`
       fari ad geyma fylki fyrir dalka sem geta ekkert sagt)          */
{
  const flat = Array(50).fill(7);
  ok("allir eins -> OLITAD (rodin sjalf ver thetta, ekki hlidid)",
    heatTone({ vals: flat, invert: false }, 7) === null
    && heatTone({ vals: flat, invert: true }, 7) === null,
    `midpunkts-rod ${pctRank(flat, 7)}`);
  const flatCol = { key: "m_flat", hi: true, get: p => p.v };
  const varCol = { key: "m_var", hi: true, get: p => p.w };
  const synth = Array.from({ length: 50 }, (_, i) => ({ src: { v: 7, w: i } }));
  const out = buildScale([flatCol, varCol], new Set(), synth, {});
  ok("...OG `heatScale` gefur flotum dalki ENGA faerslu (short-circuit-hlidid)",
    !out.m_flat, "— hlidid var fjarlaegt: heatScale geymir nu fylki fyrir dauda dalka");
  ok("forsenda: dalkur MED dreifingu i sama kalli FAER faerslu", !!out.m_var);
}

/* ============================================================
   B. AF SKJANUM — OSIAD, A ThVI TIMABILI SEM VAR TILKYNNT

   Sama myndin sem var tilkynnt: `👥 Player stats`, engin sia, sjalfgefin
   rodun (total_points desc), flokkur "core". Holfin bera `title` =
   "<heiti>: <gildi>", svo hvert holf er RAKID TIL DALKS af skjanum.

   TIMABILID ER VALID, EKKI ERFT (22.8.2026). Kaflinn stod adur a
   sjalfgefna timabilinu og thad VAR arkivid; sjalfgildid faerdist a
   yfirstandandi timabil um leid og GW1-fresturinn leid (`startedGw > 0`).
   Eftir EINA umferd er meirihluti dalka JAFN-BLOKK i nulli, og
   jafn-blokk sem sper yfir fjordungs-morkin er RETTILEGA OLITUD (kafli A
   fullyrdir thad beinum ordum) — svo mot-vogin "litirnir eru enn a
   skjanum" datt i 14 af 15 an thess ad nokkud vaeri ad kvardanum.
   MAELT 22.8.2026 a yfirstandandi timabili, 20 dalkar med >= 100 gildum:
     cost_change_start 0% · cost_change_event 0% · starts_per_90 0% ·
     dreamteam_count 1% · bonus 3% · bonus_per_90 7%
   Sex dalkar thar sem allir eru jafnir, ekki sex dalkar thar sem liturinn
   brast.

   AD LAEKKA GOLFID I 14 HEFDI VERID AD SLOKKVA A MAELINGUNNI TIL AD FA
   HANA GRAENA. Kvortunin sem kaflinn ver ("oll verd raudmerkt", "sex
   dalkar 100% graenir") var lesin af TOFLU FULLRI AF ARSTIDAR-TOLUM, svo
   thad er thad svid sem hun a ad maelast a. Talan er LEIDD ur
   `player_seasons.json` (sama skra og `olderSeasons` i PlayerList), svo
   hun ureldist ekki naesta agust.
   ============================================================ */
console.log("\nB) AF SKJANUM — osiad, valid timabil");

const { JSDOM } = await import("jsdom");
const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");

const dom = new JSDOM("<!doctype html><div id=root></div>",
  { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = async u => {
  const n = String(u).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};
localStorage.setItem("fpl_planner_v3", JSON.stringify({ watch: [] }));

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 400)); });
const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 120)); }); };
const fire = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
};
await fire([...document.querySelectorAll("button")]
  .find(x => x.textContent.trim().startsWith("👥")));

/* Fast bid er ekki maeling a thvi ad teikningu se lokid — timabils-skipti
   endur-elda 600 radir x 124 dalka. Bedid er thangad til textinn haettir
   ad vaxa (sama adferd og `settleOn` i `data-resilience.mjs`).          */
const settleOn = async () => {
  let last = -1, stable = 0;
  for (let i = 0; i < 40; i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 25)); });
    const n = (document.body.textContent || "").length;
    if (n === last) { if (++stable >= 2) break; } else { stable = 0; last = n; }
  }
};
{
  const ARCHIVE = J("player_seasons.json").seasons[0];
  const sel = () => document.querySelector("select");
  ok("timabils-valid er addressanlegt", !!sel());
  sel().value = ARCHIVE;
  await act(async () => { sel().dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  await settleOn();
  /* SJA HAUS KAFLANS: an thessa maelist mot-vogin a toflu thar sem sex
     dalkar eru jafn-blokk i nulli.                                     */
  ok(`taflan stendur a ${ARCHIVE} (valid tok, ekki erft)`,
     sel()?.value === ARCHIVE, String(sel()?.value));
}

/* MAELITAEKID GAT SJALFT VERID VILLAN — OG VAR THAD (CLAUDE.md 5b).
   Fyrsta utgafa thessa kafla las `el.style.background` og bar hann vid
   HEX-strengina i kodanum. jsdom (eins og vafrar) normaliserar CSS-liti i
   `rgb(r, g, b)`, svo `bg.includes("#e9f9f1")` var ALDREI satt: HVERT
   litad holf var talid RAUTT. Utkoman var "Verd: graent 0, raudt 904" —
   nakvaemlega bilunin sem verid var ad leita ad, tilbuin af profinu.
   Umbreytingin er thvi REIKNUD ur sama fastanum og appid teiknar med.  */
const rgbOf = h => { const n = parseInt(h.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
const GOOD_RGB = HEAT_GOOD.map(rgbOf), BAD_RGB = HEAT_BAD.map(rgbOf);

/* Hvert tolu-holf ber `title` = "<label>: <gildi>". Nafna-holfid er
   <button> og ber annad snid, svo thad kemur ekki inn.               */
const LABELS = new Map(STAT_DEFS.map(d => [d.label, d]));
const readCells = () => {
  const out = [];
  for (const el of document.querySelectorAll("div[title]")) {
    const t = el.getAttribute("title") || "";
    const i = t.indexOf(": ");
    if (i < 0) continue;
    const d = LABELS.get(t.slice(0, i));
    if (!d) continue;
    /* `backgroundColor`, EKKI `background` — OG ThAD ER MAELING, EKKI SMEKKUR
       (25.8.2026). Dalka-randirnar sem baettust vid thennan dag eru
       `backgroundImage` (gradient) svo thaer liggi UNDIR hitakorts-litnum i
       stad thess ad skipta honum ut. `background` er STYTTING og CSSOM
       skilar tha BADUM lognum: maelt i jsdom gefur litad+randad holf
       "linear-gradient(...) rgb(233, 249, 241)", sem stenst ekkert af
       `GOOD_RGB`/`BAD_RGB`-samanburdunum — HVERT litad holf hefdi talist
       "annad" og kaflinn hefdi fundid bilun sem er ekki til (nakvaemlega
       gildran sem hausinn her ad ofan lysir). Langritunin skilar LITNUM
       EINUM og er thvi threngri maeling, ekki slakari: randin sest ekki og
       a ekki ad sjast — hun er ekki hitakortstonn.                      */
    out.push({ key: d.key, bg: el.style.backgroundColor || el.style.background || "",
               txt: (el.textContent || "").trim(),
               missing: /: no data$/.test(t) });
  }
  return out;
};

/* SKRUN — thekjan er FULLYRDING, ekki logga. Reynt er ad skruna
   syndarglugganum; ef jsdom heldur ekki `scrollTop` fellur golfid i B0
   og profid segir thad, i stad thess ad maela faar radir thegjandi.  */
const scroller = [...document.querySelectorAll("div")]
  .find(el => (el.style.overflow || el.style.overflowY || "").includes("auto")
              && el.querySelector("div[title]"));
const seen = new Map();     // key -> {g,r,u,miss,coloredMiss}
const rowIds = new Set();
const addCells = () => {
  for (const c of readCells()) {
    const s = seen.get(c.key) || { g: 0, r: 0, u: 0, miss: 0, colouredMiss: 0, seenTxt: new Set() };
    s.seenTxt.add(c.txt);
    const bg = c.bg.trim();
    if (c.missing) { s.miss++; if (bg) s.colouredMiss++; }
    else if (!bg) s.u++;
    else if (GOOD_RGB.includes(bg) || HEAT_GOOD.includes(bg)) s.g++;
    else if (BAD_RGB.includes(bg) || HEAT_BAD.includes(bg)) s.r++;
    else s.other = (s.other || 0) + 1;
    seen.set(c.key, s);
  }
  for (const b of document.querySelectorAll("button")) {
    const t = (b.getAttribute("title") || "");
    if (t && !t.includes(":")) rowIds.add(b.textContent.trim());
  }
};
addCells();
const firstPass = [...seen.values()].reduce((s, x) => s + x.g + x.r + x.u + x.miss, 0);
if (scroller) {
  for (let k = 1; k <= 40; k++) {
    await act(async () => {
      scroller.scrollTop = k * 380;
      scroller.dispatchEvent(new dom.window.Event("scroll", { bubbles: true }));
    });
    await settle();
    addCells();
  }
}
const totalSeen = [...seen.values()].reduce((s, x) => s + x.g + x.r + x.u + x.miss, 0);
console.log(`   holf lesin af skjanum: ${totalSeen} (fyrsti gluggi ${firstPass}), `
  + `${rowIds.size} olikar radir, ${seen.size} dalkar`);

/* ---- B0. THEKJA ER FULLYRDING (CLAUDE.md 5b) ----
   "Ekki allt graent" sem er satt af thvi ad glugginn synir faar radir er
   TOM fullyrding. Golfid er RUMLEGA meira en einn gluggi (24 radir), svo
   fullyrdingarnar hér a eftir geta ekki verid uppfylltar af tomleika. */
ok(`THEKJA: >= 200 olikar radir komust i DOM-id (fekk ${rowIds.size})`,
  rowIds.size >= 200,
  "— syndarglugginn synir ~24; an skruns maela B1-B3 ekkert");
ok(`THEKJA: >= 4000 holf lesin (fekk ${totalSeen})`, totalSeen >= 4000);
ok(`osiad: leikmannafjoldinn i haus er OSNERTUR (>= 500)`,
  /\b5\d\d\b/.test(document.body.textContent || ""),
  "— se buid ad sia er thetta ekki astandid sem var tilkynnt");

/* ---- B1. ENGINN DALKUR ER (NAERRI) ALLUR LITADUR ----
   Bandid er LEITT af fjordungs-reglunni: af holfum med raunverulegt
   gildi eiga ~50% ad vera OLITUD. Skjaglugginn er hins vegar ekki
   slembid urtak af poolnum (rodunin dregur einn endann upp), svo
   thakid her er RUMT — 90% — og thad er samt fullyrding sem gamla
   formulan FELLUR a: 6 dalkar voru 100% graenir i sjalfgefna
   glugganum og `now_cost` 23 af 24 raudur.                          */
const domCols = [...seen.entries()].map(([key, s]) => ({
  key, ...s, n: s.g + s.r + s.u,
  pct: (s.g + s.r + s.u) ? 100 * (s.g + s.r) / (s.g + s.r + s.u) : 0 }))
  .filter(x => x.n >= 100);
domCols.sort((a, b) => b.pct - a.pct);
console.log(`   verstu 5 a skjanum: `
  + domCols.slice(0, 5).map(x => `${x.key} ${x.pct.toFixed(0)}%`).join(", "));
const domOver = domCols.filter(x => x.pct > 90);
ok(`enginn dalkur a skjanum er > 90% litadur (${domOver.length} af ${domCols.length})`,
  domOver.length === 0,
  domOver.slice(0, 6).map(x => `${x.key} ${x.pct.toFixed(0)}% (G${x.g}/R${x.r}/olitad${x.u})`).join(", "));
const allGreen = domCols.filter(x => x.g === x.n && x.n > 0);
ok(`enginn dalkur er 100% GRAENN a skjanum (${allGreen.length})`, allGreen.length === 0,
  allGreen.map(x => x.key).join(", "));
/* MOTVOGID: hitakortid er enn A. Ef einhver slekkur a lit i osiada
   astandinu i stad thess ad laga kvardann fellur THETTA.            */
ok(`...OG litirnir eru enn a skjanum: >= 15 dalkar med >= 20% litad `
  + `(${domCols.filter(x => x.pct >= 20).length})`,
  domCols.filter(x => x.pct >= 20).length >= 15,
  "— slokkt hitakort felur vandamalid, thad leysir thad ekki");

/* ---- B2. VERD ER EKKI ALLT RAUTT A SKJANUM ---- */
const dp = seen.get("now_cost") || { g: 0, r: 0, u: 0, miss: 0 };
ok("forsenda: Verd-holf voru raunverulega a skjanum", !!seen.get("now_cost"));
console.log(`   Verd a skjanum: graent ${dp.g}, raudt ${dp.r}, olitad ${dp.u}`);
ok(`Verd er EKKI allt raudt a skjanum (G${dp.g} / R${dp.r} / olitad ${dp.u})`,
  dp.r < 0.8 * (dp.g + dp.r + dp.u) && dp.g > 0 && dp.u > 0,
  "— notandinn: 'oll verd raudmerkt'");
ok(`forsenda: Verd er non-null hja OLLUM sem sast (miss=${dp.miss})`, dp.miss === 0);

/* ---- B3. "—" (null) FAER ALDREI BAKGRUNN ----
   Talid FYRST, svo fullyrdingin geti bregdist.                      */
const missSeen = [...seen.values()].reduce((s, x) => s + x.miss, 0);
const missColoured = [...seen.values()].reduce((s, x) => s + x.colouredMiss, 0);
console.log(`   "—"-holf a skjanum: ${missSeen}`);
ok(`forsenda: "—"-holf voru raunverulega a skjanum (${missSeen})`, missSeen > 200);
ok(`ekkert "—"-holf ber bakgrunn (${missColoured})`, missColoured === 0);

/* ---- B4. LITIRNIR A SKJANUM ERU SOMU SEX OG I KODANUM ----
   Vordur gegn thvi ad einhver bui til nytt litakerfi vid hlidina: hvert
   litad holf a skjanum VERDUR ad bera einn af sex tonunum.           */
{
  const seenBg = new Set();
  for (const c of readCells()) if (c.bg) seenBg.add(c.bg.trim());
  const known = new Set([...GOOD_RGB, ...BAD_RGB, ...HEAT_GOOD, ...HEAT_BAD]);
  const unknown = [...seenBg].filter(x => !known.has(x));
  ok(`forsenda: litir voru a skjanum (${seenBg.size} olikir)`, seenBg.size >= 4);
  ok(`hver litur a skjanum er einn af sex tonunum (${unknown.length} okunnir)`,
    unknown.length === 0, unknown.join(", "));
  const other = [...seen.values()].reduce((s, x) => s + (x.other || 0), 0);
  ok(`...og ekkert holf var flokkad sem 'annad' i talningunni (${other})`, other === 0);
}

/* ============================================================
   B5. DALKA-RANDIRNAR — OG AD ThAER TAKI EKKI LITINN MED SER (25.8.2026)

   Beidni notandans: rod med 20+ dalkum er ekki laesileg thvert yfir, svo
   annar hver dalkur ber orlitinn ton. NAIVA UTFAERSLAN — `background` a
   holfinu — HEFDI SKIPT HITAKORTS-LITNUM UT a helmingi dalkanna, sem er
   nakvaemlega thad sem thetta safn er til ad verja. Randin er thvi
   `backgroundImage` (gradient) og liggur UNDIR litnum.

   ThRJAR FULLYRDINGAR OG ENGIN THEIRRA DUGAR EIN:
     1. randirnar eru RAUNVERULEGA a skjanum (annars maelir 2 og 3 ekkert)
     2. holf sem ber BAEDI rond OG hitakortston er til — thad er sonnunin
        a thvi ad thau LIFI SAMAN, ekki bara ad hvorugt hafi brugdist
     3. paritetid er ThAD SAMA i haus og i holfum, per dalk — annars
        faerast randirnar um einn dalk milli threpanna og lesast sem villa
   Og frosni nafnadalkurinn ber ENGA rond: hann erfir bakgrunn RADARINNAR
   ("mitt lid" graent, "i samanburdi" fjolublatt), sem er MERKING.
   ============================================================ */
{
  const PL = await import(new URL("src/PlayerList.jsx", REPO).href);
  const STRIPE = PL.STRIPE_BG;
  /* CSSOM NORMALISERAR: jsdom (og vafrar) skila `rgba(0, 0, 0, 0.022)` thar
     sem kodinn skrifadi `rgba(0,0,0,.022)` — bil BAETAST vid og `0` er sett
     framan a aukastafinn. Ber samanburdur a strengjunum var thvi ALLTAF
     osannur og fyrsta utgafa thessa kafla maeldi "0 randir" a skja sem var
     fullur af theim. Sama aett og `#e9f9f1`-samanburdurinn i hausnum her ad
     ofan (maelitaekid var villan). Bædi bil og forskeytis-null eru felld. */
  const norm = v => String(v || "").replace(/\s+/g, "").replace(/(^|[^\d.])0\./g, "$1.");
  const isStriped = el => norm(el.style.backgroundImage) === norm(STRIPE);

  const heads = [...document.querySelectorAll("[aria-sort]")];
  const stripedHeads = heads.filter(isStriped);
  ok(`forsenda: haus-holf eru a skjanum (${heads.length})`, heads.length > 5);
  ok(`randir eru a skjanum: ${stripedHeads.length} af ${heads.length} haus-holfum`,
     stripedHeads.length > 0 && stripedHeads.length < heads.length,
     "— hvorki engin rond ne rond a ollu (thad vaeri ekki rond heldur bakgrunnur)");

  /* Nafnadalkurinn: frosinn, `background:inherit`, ma ALDREI fa rond.   */
  const nameHead = heads.find(h => /Player/.test(h.textContent || ""));
  ok("frosni nafna-hausinn ber ENGA rond", !!nameHead && !isStriped(nameHead));
  const nameCells = [...document.querySelectorAll("div")]
    .filter(el => el.style.position === "sticky" && el.style.left === "0px");
  ok(`forsenda: frosin holf eru i DOM (${nameCells.length})`, nameCells.length > 0);
  ok("...og ekkert theirra ber rond", nameCells.every(el => !isStriped(el)));

  /* SAMSETNINGIN — randin OFAN A litnum, ekki i stad hans.              */
  const bodyCells = [...document.querySelectorAll("div[title]")]
    .filter(el => /: /.test(el.getAttribute("title") || ""));
  const both = bodyCells.filter(el => isStriped(el) && el.style.backgroundColor);
  const colourOnly = bodyCells.filter(el => !isStriped(el) && el.style.backgroundColor);
  ok(`forsenda: litud holf eru a skjanum (${both.length + colourOnly.length})`,
     both.length + colourOnly.length > 10);
  ok(`${both.length} holf bera BAEDI rond og hitakortston — randin skiptir litnum ekki ut`,
     both.length > 0,
     "— randin liggur ofan a litnum; se hun `background` hverfur liturinn");

  /* PARITETID: haus og holf lesa SAMA visi i `visibleCols`.             */
  {
    const key = h => (h.textContent || "").replace(/[↑↓▼]|season/g, "").trim();
    const headStripe = new Map();
    for (const h of heads) if (!/Player/.test(h.textContent || "")) headStripe.set(key(h), isStriped(h));
    ok(`forsenda: ${headStripe.size} dalka-hausar med heiti`, headStripe.size > 4);
    /* Holfin bera `title` "<label>: ...", svo dalkurinn er thekktur af
       skranni og borinn saman vid `short` i hausnum.                    */
    const mism = [];
    for (const el of bodyCells) {
      const t = el.getAttribute("title") || "";
      const d = LABELS.get(t.slice(0, t.indexOf(": ")));
      if (!d) continue;
      const sh = String(d.short ?? d.label);
      if (!headStripe.has(sh)) continue;
      if (headStripe.get(sh) !== isStriped(el)) mism.push(`${d.key}: haus ${headStripe.get(sh)} vs holf ${isStriped(el)}`);
    }
    ok(`randirnar standa i takti milli hauss og holfa (${mism.length} osamraemi)`,
       mism.length === 0, mism.slice(0, 3).join(" · "));
  }
}

console.log(`\nHITAKORTID: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
