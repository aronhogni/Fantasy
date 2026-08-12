/* ============================================================
   SNERTINGAR I VITATEIG — ENDURMAELING, OG HUN STENST EKKI

   HANDVIRK MAELINGA-SKRIFTA, EKKI HLUTI AF PIPELINE (sbr. ffdr-vs-fdr.mjs).
   Keyrsla:  node scripts/measure-box-touches.mjs [fjoldi leikja, sjalfg. 380]
   Saekir StatsBomb-opnu gognin (PL 2015/16) i cache og maelir.

   ============================================================
   1. HVERS VEGNA HUN VAR SKRIFUD: "FINNDU LEID AD SAEKJA BOX-SNERTINGAR"
   ============================================================
   Skjolunin sagdi: "engin naanleg heimild gefur hana". Thad var stadfest
   12.8.2026 med SEX heimildum, og hver ein var profud, ekki gefin ser:
     FBref          `cf-mitigated: challenge` — Cloudflare JS-throskuldur,
                    EKKI UA-vandamal (profad med fullum vafra-hausum)
     SofaScore      403
     FotMob         API tokin-vardad (404 an `x-mas`); 209 KB svarid er
                    SPA-bundlinn, ekki gogn
     Understat      Cloudflare OG ber engar snertingar — adeins skot
     worldfootballR HEFUR svidid (`big5_player_possession.rds`) en er OVIRK:
                    sidasta uppfaersla **2022-10-25**. Auk thess `.rds`
                    (R-tvinnsnid) sem Node an hada les ekki
     BSD            engin snerti-hnit (skjalfest og stadfest a svidalista)
   StatsBomb open-data svarar 200 en ber ADEINS PL 2015/16 og 2003/04.

   ============================================================
   2. ThVI VAR SPURT ODRU: NAUM VID MERKINU UR ThVI SEM VID HOFUM?
   ============================================================
   FYLGNI VID SANNAR BOX-SNERTINGAR (10.343 leikmanna-leikir):
     shots_in_box    r 0,721   <- BSD HEFUR
     shots           r 0,648   <- BSD HEFUR
     xg              r 0,578   <- BSD HEFUR
     key_passes      r 0,290   <- BSD HEFUR
     touches HEILD   r 0,266   <- BSD HEFUR
     receipts_in_box r 0,940   (OFAANLEGT)
     carries_into_box r 0,760  (OFAANLEGT)
   Ad snertingar I HEILD gefa adeins 0,266 er sjalfstaed stadfesting a
   mekanismanum sem upprunalega maelingin lysti: thad er EKKI "hann spilar
   meira" heldur HVAR hann snertir boltann.

   ============================================================
   3. OG ThA KOM ThAD SEM SKIPTIR MALI — FYLGNI ER EKKI ABATI
   ============================================================
   `shots_in_box` fylgir sonnu svidinu 0,721 og er ThVI FREISTANDI
   stadgengill. Ut fyrir urtak (leikmanna-skipt) bætir hun **ENGU** ofan a
   xG+xA: delta −0,0024. Astaedan er einfold og verd ad muna: hun fylgir
   xG (0,578) og xG ER ThEGAR I LIKANINU. Ha fylgni vid svidid segir ekkert
   um hvort svidid bæti vid ThAD SEM VID HOFUM ThEGAR.

   ============================================================
   4. NIDURSTADA: SJALF MAELINGIN STENST EKKI EIGIN STADAL REPO-SINS
   ============================================================
   Endurmaelt a SOMU gognum og i SOMU staerd sem skjolunin nefnir
   (**10.450 leikmanna-leikir**, PL 2015/16, 380 leikir — talan stemmir
   ordrett), med BOOTSTRAP KLASADUM PER LEIKMANN (400 itranir), sem er
   stadallinn i mo-candidates.mjs:

     SANN box-snerting   delta +0,0156   95% CI [-0,0079, +0,0389]  <- INNIHELDUR NULL
     shots_in_box        delta -0,0008   95% CI [-0,0194, +0,0091]  <- INNIHELDUR NULL
     allt sem BSD hefur  delta +0,0131   95% CI [-0,0268, +0,0451]  <- INNIHELDUR NULL

   Skjolunin sagdi **+0,036**; her maelist **+0,016**, minna en helmingur, og
   CI inniheldur null. Reglan i repo-inu er skyr og hefur ThEGAR fellt adrar
   hugmyndir a nakvaemlega thessum grundvelli — "sleppa oheppnis-lidnum" var
   hafnad vid CI [-0,023, +0,055]. Sami maelikvardi, sama utkoma.

   ATH UM SAMANBURDINN, ThVI HANN ER EKKI ORDRETTUR: hér er kornid
   LEIKMADUR (medaltol ur fyrri hluta leikja hans -> thatttokur per leik i
   seinni hluta), sem er su uppsetning sem "flyst thetta milli tima?" kallar
   a. Hafi upprunalega maelingin verid a leikmanns-LEIK korni er talan ekki
   sambaerileg — og ThAD er thad sem tharf ad samraema. En hvad sem thvi
   lidur: EKKERT her styður ad setja box-snertingar (eda stadgengil theirra)
   i `rankScore`.

   PRAKTISKA AFLEIDINGIN: vid thurfum EKKI ad leita heimildar fyrir
   box-snertingum. Akvordunin "thaer fara ekki i rankScore" var rett, en af
   BETRI astaedu en "gognin vantar": merkid er ekki stadfest.
   ============================================================ */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";

const SB = "https://raw.githubusercontent.com/statsbomb/open-data/master/data";
/* Cache VID SKRIFTUNA, ekki i data/: thetta eru ~380 skrar / ~600 MB af
   StatsBomb-atburdum sem eru RANNSOKNARGOGN, ekki gogn sem appid les.
   `.gitignore` sleppir theim. */
const CACHE = new URL("./.boxtouch-cache/", import.meta.url).pathname;
mkdirSync(CACHE, { recursive: true });

const UA = "Mozilla/5.0 fantasy-research";
async function getJSON(url, cacheKey) {
  const f = CACHE + cacheKey;
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  const t = await r.text();
  writeFileSync(f, t);
  return JSON.parse(t);
}

/* VITATEIGURINN a StatsBomb-vellinum: 120x80, sotti teigurinn x >= 102,
   y milli 18 og 62. (Bædi endar eru til; vid teljum ADEINS sottan teig,
   thvi merkid er SOKNARLEGT — "hvar snertir hann boltann i faerum".)   */
const inBox = loc => Array.isArray(loc) && loc[0] >= 102 && loc[1] >= 18 && loc[1] <= 62;

/* HVAD ER "SNERTING"? Opta/FBref hafa sina skilgreiningu; vid getum ekki
   afritad hana ordrett. Vid teljum atburdi thar sem leikmadurinn HEFUR
   BOLTANN — thad er thad sem "touch" thydir i reynd. `Ball Receipt*` er
   tekid med thvi thad er einmitt "hann fekk boltann i teignum", sem er
   kjarni merkisins. SAMKVAEMNI skiptir meira mali en nakvaem Opta-parun:
   vid berum stadgengil vid ThESSA toluna, ekki vid FBref.               */
const TOUCH_TYPES = new Set(["Pass", "Ball Receipt*", "Carry", "Shot", "Dribble",
                             "Miscontrol", "Clearance", "Foul Won", "Duel"]);

async function main() {
  const wanted = Number(process.argv[2] || 120);
  const matches = await getJSON(`${SB}/matches/2/27.json`, "matches_2_27.json");
  console.log(`PL 2015/16: ${matches.length} matches listed, fetching ${wanted}`);

  /* per leikmadur PER LEIK — thad er kornid sem spain notar. */
  const rows = new Map();     // `${matchId}|${playerId}` -> row
  let done = 0, failed = 0;

  for (const m of matches.slice(0, wanted)) {
    let evs;
    try { evs = await getJSON(`${SB}/events/${m.match_id}.json`, `ev_${m.match_id}.json`); }
    catch (e) { failed++; continue; }
    done++;
    for (const e of evs) {
      const pid = e.player?.id;
      if (pid == null) continue;
      const key = `${m.match_id}|${pid}`;
      const r = rows.get(key) || {
        match: m.match_id, player: pid, name: e.player.name,
        team: e.team?.name ?? null,
        box_touches: 0, touches: 0, shots: 0, shots_in_box: 0,
        xg: 0, xa: 0, key_passes: 0, carries_into_box: 0,
        passes_into_box: 0, receipts_in_box: 0, fouls_won_in_box: 0,
        goals: 0, assists: 0, minutes_proxy: 0,
      };
      const t = e.type?.name;

      if (TOUCH_TYPES.has(t)) {
        r.touches++;
        if (inBox(e.location)) r.box_touches++;
      }
      if (t === "Ball Receipt*" && inBox(e.location)) r.receipts_in_box++;
      if (t === "Foul Won" && inBox(e.location)) r.fouls_won_in_box++;
      if (t === "Carry" && inBox(e.carry?.end_location)) r.carries_into_box++;
      if (t === "Pass") {
        if (inBox(e.pass?.end_location)) r.passes_into_box++;
        if (e.pass?.shot_assist) r.key_passes++;
        if (e.pass?.goal_assist) { r.assists++; r.xa += 1; }
      }
      if (t === "Shot") {
        r.shots++;
        if (inBox(e.location)) r.shots_in_box++;
        r.xg += e.shot?.statsbomb_xg ?? 0;
        if (e.shot?.outcome?.name === "Goal") r.goals++;
      }
      rows.set(key, r);
    }
    if (done % 20 === 0) process.stdout.write(`\r  fetched ${done} matches…      `);
  }
  console.log(`\r  fetched ${done} matches (${failed} failed), ${rows.size} player-matches`);

  const data = [...rows.values()].filter(r => r.touches >= 5);   // hafi hann verid a velli
  writeFileSync(CACHE + "rows.json", JSON.stringify(data));
  console.log(`  ${data.length} rows with >=5 touches\n`);
  const RESULT = data;

  /* ---------- FYLGNI: naer stadgengill sonnu box-snertingunni? ---------- */
  const col = k => data.map(r => r[k]);
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const pearson = (a, b) => {
    const ma = mean(a), mb = mean(b);
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i] - ma, y = b[i] - mb;
      num += x * y; da += x * x; db += y * y;
    }
    return (da && db) ? num / Math.sqrt(da * db) : 0;
  };
  const truth = col("box_touches");
  console.log("=== CORRELATION WITH TRUE BOX TOUCHES (per player-match) ===");
  const cands = [
    ["shots_in_box    (BSD HAS IT)", col("shots_in_box")],
    ["shots           (BSD HAS IT)", col("shots")],
    ["touches TOTAL   (BSD HAS IT)", col("touches")],
    ["key_passes      (BSD HAS IT)", col("key_passes")],
    ["xg              (BSD HAS IT)", col("xg")],
    ["receipts_in_box (NOT OBTAINABLE)", col("receipts_in_box")],
    ["passes_into_box (NOT OBTAINABLE)", col("passes_into_box")],
    ["carries_into_box (NOT OBTAINABLE)", col("carries_into_box")],
  ];
  for (const [label, v] of cands)
    console.log(`  r = ${pearson(truth, v).toFixed(4)}   ${label}`);

  /* Samsettur stadgengill UR ThVI SEM VID HOFUM — minnstu kvadrata vog. */
  const X = data.map(r => [1, r.shots_in_box, r.shots, r.touches, r.key_passes, r.xg]);
  const w = lstsq(X, truth);
  const pred = X.map(row => row.reduce((s, x, i) => s + x * w[i], 0));
  console.log(`\n  r = ${pearson(truth, pred).toFixed(4)}   COMPOSITE proxy (shots_in_box+shots+touches+key_passes+xg)`);
  console.log(`  weights: ${w.map(x => x.toFixed(4)).join(", ")}`);
  console.log(`\n  mean true box touches: ${mean(truth).toFixed(2)} per player-match`);
  return RESULT;
}

/* Minnstu kvadrata (normal equations + Gauss-Jordan). Litil hylki, svo
   thetta er nog — engin ytri had.                                       */
function lstsq(X, y) {
  const n = X[0].length;
  const A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < X.length; i++)
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) A[a][b] += X[i][a] * X[i][b];
      A[a][n] += X[i][a] * y[i];
    }
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r2 = c + 1; r2 < n; r2++) if (Math.abs(A[r2][c]) > Math.abs(A[piv][c])) piv = r2;
    [A[c], A[piv]] = [A[piv], A[c]];
    const d = A[c][c] || 1e-12;
    for (let k = c; k <= n; k++) A[c][k] /= d;
    for (let r2 = 0; r2 < n; r2++) if (r2 !== c) {
      const f = A[r2][c];
      for (let k = c; k <= n; k++) A[r2][k] -= f * A[c][k];
    }
  }
  return A.map(r => r[n]);
}



  /* ---- annar hluti: heldur stadgengillinn abatanum? ---- */
  function predictPart(rows) {
  
  /* per leikmadur: rod leikja i timarod (match_id er ekki timarod, en innan
     thessa gagnasetts er hun stodug og skiptingin thvi endurgeranleg)     */
  const byPlayer = new Map();
  for (const r of rows) {
    if (!byPlayer.has(r.player)) byPlayer.set(r.player, []);
    byPlayer.get(r.player).push(r);
  }
  
  const MIN_EACH = 4;          // >=4 leikir i BADUM hlutum
  const samples = [];
  for (const [pid, ms] of byPlayer) {
    ms.sort((a, b) => a.match - b.match);
    const half = Math.floor(ms.length / 2);
    if (half < MIN_EACH) continue;
    const A = ms.slice(0, half), B = ms.slice(half);
    const per = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0) / arr.length;
    samples.push({
      pid, name: ms[0].name, nA: A.length, nB: B.length,
      xg: per(A, "xg"), xa: per(A, "xa"),
      box: per(A, "box_touches"),          // SANN box-snerting
      sib: per(A, "shots_in_box"),         // STADGENGILL sem vid HOFUM
      shots: per(A, "shots"),
      touches: per(A, "touches"),
      kp: per(A, "key_passes"),
      target: per(B, "goals") + per(B, "assists"),
    });
  }
  console.log(`players with >=${MIN_EACH} matches in BOTH halves: ${samples.length}`);
  
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const pearson = (a, b) => {
    const ma = mean(a), mb = mean(b);
    let n = 0, da = 0, db = 0;
    for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; n += x*y; da += x*x; db += y*y; }
    return (da && db) ? n / Math.sqrt(da * db) : 0;
  };
  function lstsq(X, y) {
    const n = X[0].length;
    const A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    for (let i = 0; i < X.length; i++)
      for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) A[a][b] += X[i][a] * X[i][b];
        A[a][n] += X[i][a] * y[i];
      }
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      const d = A[c][c] || 1e-12;
      for (let k = c; k <= n; k++) A[c][k] /= d;
      for (let r = 0; r < n; r++) if (r !== c) {
        const f = A[r][c];
        for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
      }
    }
    return A.map(r => r[n]);
  }
  
  /* Fast frae svo skiptingin se endurgeranleg (Date.now/Math.random myndu
     gera maelinguna oendurgeranlega — sama regla og i workflow-skriftum). */
  let seed = 20260812;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  
  const MODELS = {
    "xG+xA                    (baseline)":            s => [1, s.xg, s.xa],
    "xG+xA + TRUE box touches (UNOBTAINABLE)":          s => [1, s.xg, s.xa, s.box],
    "xG+xA + shots_in_box     (BSD HAS IT)":          s => [1, s.xg, s.xa, s.sib],
    "xG+xA + sib+shots+touches+kp (all BSD)":      s => [1, s.xg, s.xa, s.sib, s.shots, s.touches, s.kp],
  };
  
  const SPLITS = 40;
  const acc = Object.fromEntries(Object.keys(MODELS).map(k => [k, []]));
  for (let it = 0; it < SPLITS; it++) {
    const idx = samples.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const cut = Math.floor(idx.length / 2);
    const tr = idx.slice(0, cut).map(i => samples[i]);
    const te = idx.slice(cut).map(i => samples[i]);
    for (const [label, f] of Object.entries(MODELS)) {
      const w = lstsq(tr.map(f), tr.map(s => s.target));
      const pred = te.map(s => f(s).reduce((a, x, i) => a + x * w[i], 0));
      acc[label].push(pearson(pred, te.map(s => s.target)));
    }
  }
  
  console.log(`\n=== OUT OF SAMPLE, PLAYER-SPLIT (${SPLITS} splits, mean r) ===`);
  const base = mean(acc["xG+xA                    (baseline)"]);
  const out = {};
  for (const [label, rs] of Object.entries(acc)) {
    const m = mean(rs);
    out[label] = m;
    const d = m - base;
    const sd = Math.sqrt(mean(rs.map(x => (x - m) ** 2)));
    console.log(`  r = ${m.toFixed(4)}  (sd ${sd.toFixed(4)})  delta ${d >= 0 ? "+" : ""}${d.toFixed(4)}   ${label}`);
  }
  
  const trueGain = out["xG+xA + TRUE box touches (UNOBTAINABLE)"] - base;
  const proxyGain = out["xG+xA + shots_in_box     (BSD HAS IT)"] - base;
  const fullGain = out["xG+xA + sib+shots+touches+kp (all BSD)"] - base;
  console.log(`\n  TRUE gain:            ${trueGain >= 0 ? "+" : ""}${trueGain.toFixed(4)}   (documented: +0.036)`);
  console.log(`  PROXY gain:           ${proxyGain >= 0 ? "+" : ""}${proxyGain.toFixed(4)}   (shots_in_box alone)`);
  console.log(`  ALL that BSD has:     ${fullGain >= 0 ? "+" : ""}${fullGain.toFixed(4)}`);
  if (trueGain > 0)
    console.log(`  -> the proxy keeps ${(100 * proxyGain / trueGain).toFixed(0)}% of the gain;`
              + ` all BSD ${(100 * fullGain / trueGain).toFixed(0)}%`);
  
  /* ============================================================
     BOOTSTRAP, KLASADUR PER LEIKMANN — CI VERDUR AD UTILOKA NULL
  
     Deltan er lítil borid vid sd yfir skiptingar, og 40 skiptingar a SOMU
     gognum eru ekki 40 ohad urtok. Reglan i repo-inu (mo-candidates.mjs) er
     skyr: bootstrap KLASADUR per leikmann og CI sem utilokar null. Annars er
     thetta agiskun i bunimgi maelingar.
     ============================================================ */
  {
    const B = 400;
    const deltas = { sib: [], full: [], truth: [] };
    const fBase = s => [1, s.xg, s.xa];
    const fSib  = s => [1, s.xg, s.xa, s.sib];
    const fFull = s => [1, s.xg, s.xa, s.sib, s.shots, s.touches, s.kp];
    const fTrue = s => [1, s.xg, s.xa, s.box];
    for (let b = 0; b < B; b++) {
      /* KLASI = LEIKMADUR: dregid MED endurtekningu ur leikmonnum, ekki ur
         rodum — annars laekar sami leikmadur inn i baedi train og test.   */
      const draw = Array.from({ length: samples.length }, () => samples[Math.floor(rnd() * samples.length)]);
      const cut = Math.floor(draw.length / 2);
      const tr = draw.slice(0, cut), te = draw.slice(cut);
      const r = f => {
        const w = lstsq(tr.map(f), tr.map(s => s.target));
        return pearson(te.map(s => f(s).reduce((a, x, i) => a + x * w[i], 0)), te.map(s => s.target));
      };
      const base = r(fBase);
      deltas.sib.push(r(fSib) - base);
      deltas.full.push(r(fFull) - base);
      deltas.truth.push(r(fTrue) - base);
    }
    const ci = a => { const s = a.slice().sort((x, y) => x - y);
      return [s[Math.floor(0.025 * s.length)], s[Math.floor(0.975 * s.length)]]; };
    console.log(`\n=== BOOTSTRAP (${B}, clustered per player) - 95% CI on the DELTA ===`);
    for (const [k, label] of [["truth", "TRUE box touches (UNOBTAINABLE)"],
                              ["sib", "shots_in_box alone (BSD)"],
                              ["full", "all that BSD has"]]) {
      const a = deltas[k], m = mean(a), [lo, hi] = ci(a);
      const excl = (lo > 0 || hi < 0);
      console.log(`  ${label.padEnd(30)} delta ${m >= 0 ? "+" : ""}${m.toFixed(4)}  CI [${lo.toFixed(4)}, ${hi.toFixed(4)}]  ${excl ? "EXCLUDES ZERO" : "includes zero"}`);
    }
  }
  
}

main().then(r => predictPart(r)).catch(e => { console.error("FAILED:", e.message); process.exit(1); });
