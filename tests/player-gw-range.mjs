/* ============================================================
   PER-UMFERDAR SKRARNAR (player_gw_{season}.json) — VORDUR

   Thessar skrar eru grunnurinn undir umferdar-bil i leikmannalistanum
   ("bara GW 30-38 sidasta timabil"). Ef thaer eru rangar er sian rong og
   HUN SYNIR SAMT TOLU — sem er verra en tomt. Thess vegna er prófid
   ekki "eru skrarnar til" heldur "STEMMA SUMMURNAR".

   KJARNAPROFID: summa yfir ALLAR umferdir verdur ad vera jofn
   arstidartolunni i player_seasons.json. Thad er OHAD heimild (annar
   endapunktur FPL) svo thetta er raunveruleg krossprófun, ekki
   sjálfsstadfesting.

   TVITEKNINGAR — MAELT VANDAMAL, EKKI TILGATA:
     FPL a stundum TVO `element` fyrir sama mann (nytt skrasetningarnumer
     a midju timabili) og badir varpast a sama `code`. Junior Kroupi fekk
     thvi 1826 minutur i stad 1663 — umferdir 1-9 tvitaldar.
     Afmorkunin er a (code, umferd, DAGSETNING), EKKI a umferd eingongu:
     i umferd 33 hafdi hann tvo RAUNVERULEGA leiki (18/04 og 22/04) —
     tvofold umferd — og their eiga BADIR ad teljast. Ad afmarka a umferd
     hefdi thagt yfir tvofaldar umferdir hja OLLUM leikmonnum.
     Kafli 3 hér ver bædi attir.

   Maelt 31.7.2026: 2025/26 og 2023/24 stemma 100%, 2024/25 99,7%.
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (n, c, x = "") => {
  if (typeof n !== "string") throw new Error("ok(): heiti verdur ad vera strengur");
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${x ? "   " + x : ""}`); }
};

const SEASONS = [["2526", "2025/26"], ["2425", "2024/25"], ["2324", "2023/24"],
                 ["2223", "2022/23"], ["2122", "2021/22"]];

console.log("\n=== 1. SKRARNAR ===");
const files = {};
for (const [key] of SEASONS) {
  const f = `player_gw_${key}.json`;
  const has = existsSync(D + f);
  ok(`${f} er til`, has);
  if (has) files[key] = J(f);
}
const any = Object.values(files)[0];
ok("`stats` er listi af tolu-heitum", Array.isArray(any?.stats) && any.stats.length > 10,
   String(any?.stats?.length));
ok("`scale` segir hvernig desimalar eru lesnir", any?.scale && any.scale.xg === 100,
   JSON.stringify(any?.scale));
/* Lyklarnir VERDA ad vera `code`, ekki `id`: FPL endurnytir id milli
   timabila, svo id-lykill vaeri rangur leikmadur i eldra timabili.      */
ok("lyklad a `code` (ekki `id`) — kennitolur eru > 1000",
   Object.keys(any?.players || {}).every(k => +k > 1000),
   Object.keys(any?.players || {}).slice(0, 3).join(","));
/* `_seen` er afmorkunar-hjalp i pipeline og a ALDREI ad lenda i skranni. */
ok("engin `_seen`-leif ur pipeline i skranni",
   Object.values(any?.players || {}).every(e => !("_seen" in e)));

console.log("\n=== 2. SUMMUR STEMMA VID ARSTIDARTOLUR (ohad heimild) ===");
const ps = J("player_seasons.json");
const FIELDS = [["mins", "minutes"], ["pts", "total_points"], ["goals", "goals_scored"],
                ["assists", "assists"], ["bps", "bps"]];
for (const [key, label] of SEASONS) {
  const g = files[key]; if (!g) continue;
  const ix = {}; g.stats.forEach((k, i) => ix[k] = i);
  const S = g.scale || {};
  let n = 0, good = 0; const bad = [];
  for (const [code, e] of Object.entries(g.players)) {
    const sea = ps.players?.[code]?.[label];
    if (!sea) continue;
    n++;
    const tot = {};
    for (const arr of Object.values(e.gw))
      for (const [a] of FIELDS) tot[a] = (tot[a] ?? 0) + arr[ix[a]] / (S[a] || 1);
    let miss = null;
    for (const [a, f] of FIELDS) {
      const v = +sea[f];
      if (Number.isFinite(v) && Math.abs(tot[a] - v) > 0.51) { miss = `${a} ${tot[a]} vs ${v}`; break; }
    }
    if (miss) { if (bad.length < 3) bad.push(`${sea.web_name || code}: ${miss}`); }
    else good++;
  }
  if (!n) { ok(`${label}: engin porun (timabil ekki i player_seasons)`, true); continue; }
  const rate = good / n;
  ok(`${label}: ${good}/${n} stemma (${(rate * 100).toFixed(1)}%)`, rate >= 0.99, bad.join(" · "));
}

console.log("\n=== 3. TVITEKNINGAR OG TVOFALDAR UMFERDIR ===");
/* (a) TVITEKNING MA EKKI TELJAST TVISVAR. Junior Kroupi 2025/26 er
       raunverulega tilvikid sem fannst; hann er nefndur beint svo profid
       falli ef afmorkunin er fjarlaegd.                                  */
const g26 = files["2526"];
if (g26) {
  const ix = {}; g26.stats.forEach((k, i) => ix[k] = i);
  let kroupi = null;
  for (const [code, e] of Object.entries(g26.players)) {
    const nm = ps.players?.[code]?.["2025/26"]?.web_name || "";
    if (/kroupi/i.test(nm)) kroupi = { code, e, nm };
  }
  ok("Kroupi finnst i 2025/26 (tilvikid sem afmorkunin var gerd fyrir)", !!kroupi);
  if (kroupi) {
    const mins = Object.values(kroupi.e.gw).reduce((a, r) => a + r[ix.mins], 0);
    const sea = +ps.players[kroupi.code]["2025/26"].minutes;
    ok(`tvitekning ekki tvitalin: ${mins} min == arstid ${sea}`, mins === sea,
       `an afmorkunar var thetta 1826`);
    /* (b) TVOFOLD UMFERD MA EKKI HORFA. Umferd 33 hafdi tvo leiki
           (18/04 og 22/04) og summan theirra verdur ad vera > 90 min. */
    const r33 = kroupi.e.gw["33"];
    ok("tvofold umferd heldur BADUM leikjum (umferd 33 > 90 min)",
       r33 != null && r33[ix.mins] > 90, r33 ? String(r33[ix.mins]) : "vantar");
  }
}
/* (c) Almennt: engin umferd ma hafa MEIRA en 3 leiki ad verdmaeti minutna.
       Tvofold umferd = 2 leikir (max ~180+uppbotartimi). Yfir thad er
       tvitekning sem slapp fram hja afmorkuninni.                        */
for (const [key, label] of SEASONS) {
  const g = files[key]; if (!g) continue;
  const ix = {}; g.stats.forEach((k, i) => ix[k] = i);
  let worst = 0, who = null;
  for (const [code, e] of Object.entries(g.players))
    for (const [rd, arr] of Object.entries(e.gw))
      if (arr[ix.mins] > worst) { worst = arr[ix.mins]; who = `${code} GW${rd}`; }
  ok(`${label}: engin umferd yfir 200 min (tvofold umferd er hamark)`, worst <= 200,
     `${worst} min hja ${who}`);
}

console.log("\n=== 4. AD SIAN SE RAUNVERULEGA NOTHAEF ===");
/* Ef umferdar-bil a ad virka verda skrarnar ad hafa NOG umferdir og
   raunveruleg gildi — tomar skrar mundu gefa sian sem skilar alltaf 0. */
/* 2022/23 HEFUR 37 UMFERDIR, EKKI 38 — OG THAD ER RETT.
   Umferd 7 hefur NULL radir i heimildinni sjalfri (vaastav merged_gw), ekki
   adeins i thjoppudu skranni: leikirnir 10.-11. september 2022 voru
   frestadir og umferdin var aldrei spilud sem umferd 7. Fyrsta utgafa
   thessa profs krafdist 38 og FELL a raungognum — krafan var rong, ekki
   gognin. Vordurinn er thvi >=37 OG samfelldni: ef umferd hverfur ur odru
   timabili (t.d. vegna dagsetningar-porunar sem brotnar) fellur hann enn. */
const KNOWN_BLANK = { "2223": [7] };      // frestad, sja skyringu ofar
for (const [key, label] of SEASONS) {
  const g = files[key]; if (!g) continue;
  const rounds = new Set();
  for (const e of Object.values(g.players)) for (const rd of Object.keys(e.gw)) rounds.add(+rd);
  const blank = KNOWN_BLANK[key] || [];
  const missing = [];
  for (let i = 1; i <= 38; i++) if (!rounds.has(i) && !blank.includes(i)) missing.push(i);
  ok(`${label}: ${rounds.size} umferdir, engin OVAENT vantandi`, missing.length === 0,
     `vantar ${missing.join(",")}`);
  for (const b of blank)
    ok(`${label}: umferd ${b} er tom i HEIMILDINNI (frestad) — vitad`, !rounds.has(b));
}
const g26b = files["2526"];
if (g26b) {
  const ix = {}; g26b.stats.forEach((k, i) => ix[k] = i);
  /* Daemi notandans: GW30-38. Verdur ad gefa tolur fyrir marga leikmenn. */
  let withMins = 0, sumPts = 0;
  for (const e of Object.values(g26b.players)) {
    let m = 0, p = 0;
    for (let r = 30; r <= 38; r++) { const a = e.gw[r]; if (a) { m += a[ix.mins]; p += a[ix.pts]; } }
    if (m > 0) { withMins++; sumPts += p; }
  }
  ok(`GW30-38 gefur tolur (daemi notandans): ${withMins} leikmenn med minutur`, withMins > 250,
     String(withMins));
  ok("stig i bilinu eru raunveruleg (> 3000 samanlogd)", sumPts > 3000, String(sumPts));
  /* Desimal-kvordunin: xg/100 verdur ad gefa truverdugt svid, ekki 100x. */
  let maxXg = 0;
  for (const e of Object.values(g26b.players))
    for (const a of Object.values(e.gw)) maxXg = Math.max(maxXg, a[ix.xg] / 100);
  ok(`xg-kvordun rett: haesta xG i einni umferd = ${maxXg.toFixed(2)} (< 4)`,
     maxXg > 0.5 && maxXg < 4, String(maxXg));
}

console.log("\n=== 5. sumGwRange — SKILAR FPL-NEFNDUM SVIDUM ===");
const M = await import(new URL("src/stats.js", REPO).href);
const g = files["2526"];
if (g) {
  /* HEILT BIL 1-38 VERDUR AD VERA JAFNT ARSTIDINNI. Thad er sterkasta
     profid a reiknivélinni: hun ma ekki tapa ne tvitelja neinu.        */
  let code = null;
  for (const [c, v] of Object.entries(ps.players))
    if (/Haaland/.test(v["2025/26"]?.web_name || "")) code = c;
  ok("Haaland finnst (vidmid fyrir reiknivelina)", !!code);
  if (code) {
    const full = M.sumGwRange(g.players[code], g, 1, 38);
    const sea = ps.players[code]["2025/26"];
    ok(`heilt bil 1-38 == arstid (stig ${full.total_points})`,
       full.total_points === +sea.total_points, `vs ${sea.total_points}`);
    ok(`heilt bil 1-38 == arstid (minutur ${full.minutes})`,
       full.minutes === +sea.minutes, `vs ${sea.minutes}`);
    ok("svidin heita FPL-heitum (svo allir 108 dalkar virki obreyttir)",
       "total_points" in full && "expected_goals" in full && "goals_scored" in full);
    const r = M.sumGwRange(g.players[code], g, 30, 38);
    ok(`hlutabil GW30-38 er MINNA en heilt (${r.total_points} < ${full.total_points})`,
       r.total_points < full.total_points);
    /* points_per_game deilir med LEIKJUM SEM HANN SPILADI, ekki fjolda
       umferda — annars fengi meiddur madur ranglega lagt medaltal.      */
    ok(`points_per_game deilir med leikjum (apps ${r._gw_apps}, ppg ${r.points_per_game})`,
       Math.abs(r.points_per_game - r.total_points / r._gw_apps) < 0.06,
       `${r.points_per_game} vs ${(r.total_points / r._gw_apps).toFixed(1)}`);
    ok("per-90 tolur reiknadar ur summum",
       r.expected_goals_per_90 != null &&
       Math.abs(r.expected_goals_per_90 - (r.expected_goals / r.minutes) * 90) < 0.02);
    /* ARSTIDARTOLUR ERU OSKILGREINDAR, EKKI 0 — 0 vaeri rong tala. */
    ok("arstidartolur eru OSKILGREINDAR (ekki 0)",
       r.now_cost === undefined && r.selected_by_percent === undefined &&
       r.form === undefined);
    ok("umferd utan bils telst ekki (1-1 er minna en 1-38)",
       M.sumGwRange(g.players[code], g, 1, 1).total_points < full.total_points);
    ok("bil utan timabils skilar null", M.sumGwRange(g.players[code], g, 60, 70) === null);
    ok("tomt inntak skilar null", M.sumGwRange(null, g, 1, 38) === null);
    ok("snuid bil (38-1) er sama og 1-38",
       M.sumGwRange(g.players[code], g, 38, 1)?.total_points === full.total_points);
  }
}

console.log("\n=== 6. gwBlindKeys — LEITT UT, EKKI HANDSKRIFAD ===");
const blind = M.gwBlindKeys();
/* HLUTFALL, EKKI FAST ThAK. Morkin voru `< 40` og féllu um leid og
   BSD-dalkarnir baettust vid (43 af 123) — thott their SEU rettilega
   blindir: their eru timabils-summur og geta ekki fylgt umferdar-bili,
   alveg eins og verd og form. Fast thak a talningu stadnar um leid og
   dalkum fjolgar, sama villa og hardkodada safna-talan i run-tests
   (CLAUDE.md kafli 4). Tilgangur vardarins er ad grípa ad AFLEIDSLAN
   brotni — tha verda annadhvort nanast allir blindir eda nanast engir —
   svo hann er nu maeldur sem HLUTFALL af heildinni.                    */
{
  const share = blind.size / M.STAT_DEFS.length;      // maelt 8.8.2026: 35,0%
  ok(`blindir dalkar greindir (${blind.size} af ${M.STAT_DEFS.length} = ${(100 * share).toFixed(0)}%)`,
     blind.size > 10 && share > 0.10 && share < 0.55, `${blind.size}/${M.STAT_DEFS.length}`);
}
/* Thessir VERDA ad vera blindir: verd og eignarhald koma ur lifandi gognum
   og geta ekki fylgt bili.                                              */
for (const k of ["now_cost", "selected_by_percent", "form", "ict_index",
                 "cost_change_event", "net_transfers_event"])
  ok(`"${k}" er blindur (arstid/nutid)`, blind.has(k));
/* Og thessir VERDA ad fylgja bilinu — thad er tilgangurinn. Fyrsta utgafa
   probunnar taldi "goals_minus_xg" og "conversion" ranglega blinda thvi
   tveir margfaldarar kollideruðu; "bonus_per_bps" thvi profgildin klarudu
   ekki BPS>=50 throskuldinn. Thessar linur fella slikt aftur.           */
for (const k of ["total_points", "minutes", "goals_scored", "expected_goals",
                 "goals_minus_xg", "conversion", "bonus_per_bps", "cbi_per_90",
                 "saves_per_90", "gi_minus_xgi"])
  ok(`"${k}" FYLGIR bilinu`, !blind.has(k));
const defs = M.STAT_DEFS.filter(d => d.key && !d.live_only);
ok(`fleiri dalkar fylgja bilinu en gera ekki (${defs.length - [...blind].filter(k => defs.some(d => d.key === k)).length} a moti ${blind.size})`,
   defs.length - blind.size > blind.size);

console.log(`\nPER-UMFERDAR SKRAR: ${pass}/${pass + fail} graen`);
process.exit(fail ? 1 : 0);
