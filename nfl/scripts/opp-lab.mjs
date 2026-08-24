#!/usr/bin/env node
/* ============================================================
   opp-lab.mjs — BAETIR TAEKIFAERI (OPPORTUNITY) VID SEM LITIL VOG
   OFAN A VBD-RODINA? OG ER SVARID ANNAD I PPR EN I STANDARD?

     node scripts/opp-lab.mjs [--runs=4] [--from=2015] [--boot=1000]

   -> data/measure/opp.json

   ============================================================
   HVERS VEGNA THETTA ER ONNUR SPURNING EN `feature-probe` SVARADI
   ============================================================
   `feature-probe.mjs` spurdi: "ber breytan fylgni vid LEIF sparinnar?"
   og svarid var nei fyrir allar 14 (allt undir |r| = 0,14, jointLift
   -0,071). Thad LOKAR EKKI thessari spurningu, af threm astaedum:

     1. fylgni vid leif er LINULEG og SAMFELLD; rodun er EINRAEN og
        notar adeins ROD, ekki staerd. Breyta ma vera bogin, thykk-
        holudd og samt rada rett.
     2. breyta getur verid gagnslaus AD MEDALTALI en gagnleg I
        TOPPNUM — og toppurinn er thad eina sem draft notar.
     3. FPL-verkefnid maeldi einmitt thetta: `RANK_W.minsTrend = 0,01`
        bar hverfandi fylgni en LITIL VOG OFAN A kjarnann HELT, medan
        ENDURFITTING vann a raunlauginni og TAPADI topp-5.

   Thess vegna er hér maelt THAD SEM MINSTREND-AKVORDUNIN VAR MAELD
   MED: lítil, einraen vog LOGD OFAN A obreyttan kjarna, domd a
   AKVORDUNINNI (stig byrjunarlids i draft-hermun), aldrei sem
   endurfitting.

   ============================================================
   TVENNT SEM ER SAGT BERUM ORDUM AF THVI THAD SLAER A NIDURSTODUNA
   ============================================================
   (a) SAMLAGNING OG BLONDUN ERU SAMA FJOLSKYLDA AF RODUNUM.
       `board-lab.mjs` notar `(1-w)*zVbd + w*zX`. Hér er notad
       `zVbd + w*zX`, sem er "ofan a" i theim skilningi ad stuðull
       kjarnans er OBREYTT 1. En rod er ovord vid deilingu med (1+w),
       svo samlagning med vog w gefur NAKVAEMLEGA somu ROD og blondun
       med w' = w/(1+w). Grid-id hér (0…0,10) svarar thvi til
       blondunar 0…0,0909 — thad er FINNA UPPLAUSN I SMAA ENDANUM en
       ekki nyr mekanismi. Munurinn a "ofan a" og "endurfitting" i
       FPL-verkefninu var ekki samlagning-vs-blondun heldur hvort
       stuðlar KJARNANS voru fittadir upp a nytt. Their eru thad ekki
       hér. Ad thykjast hafa nyjan mekanisma vaeri ord, ekki maeling.

   (b) Z-STODLUN VERDUR AD VERA INNAN STODU, EKKI YFIR LAUGINA.
       Taekifaeri er stodubundid i einingum: RB faer ~20 snertingar/
       leik, WR ~7 kost/leik. Laugarvid z-stoðlun myndi thvi FAERA
       ALLA RB UPP um leid og w > 0, og thad sem maeldist vaeri
       "draftadu fleiri RB" — spurning sem `strategy-lab.mjs` hefur
       thegar svarad (RB-RB +8 i PPR, -20 i standard). Innan stodu
       maelist thad sem spurt er um: radar taekifaeri MONNUM I SOMU
       STODU rettar en spain gerir?

   ============================================================
   KJARNATILGATAN: PPR GEGN STANDARD
   ============================================================
   Mottaka er TAEKIFAERI SEM TELUR STIG I PPR (1,0) og telur nanast
   ekkert i standard (0,0 — adeins yardarnir). Beri mottoku-taekifaeri
   raunverulegt merki aetti thad thvi ad maelast STERKAR I PPR en i
   standard, og half ad liggja MILLI theirra. Su rodun (ppr > half >
   standard) er PROFANLEG og hun er thad sem gerir mælinguna ad meira
   en einni tolu: se hun til er thetta fyrsta maelda astaedan i
   verkefninu til ad hafa OLIKA VOG PER STIGAGJOF. Se hun ekki til er
   thad lika nidurstada — og hun segir ad taekifaeri se ekki
   stigagjafarbundid merki heldur (eda ekkert merki).

   HALF-PPR ER REIKNAD, EKKI NALGAD — sama algebra og i `half-lab.mjs`:
       PPR = STD + mottokur  =>  HALF = STD + mottokur/2 = (STD+PPR)/2
   Sogulegt half-ADP er hins vegar EKKI til (FFC ber `half-ppr_12`
   adeins fyrir yfirstandandi ar), svo vollurinn i half-hermuninni
   draftar eftir ppr-ADP og badar attir eru maeldar fyrir thad sem
   vinnur (`adpBounds`).

   ============================================================
   MAELIKVARDARNIR — TVEIR, MED OLIKUM KLOSUM, OG THAD ER ASETT
   ============================================================
   B. AKVORDUNIN (thad sem gildir): draft-hermun, bordid med vog w
      gegn bordinu med w=0 I SOMU DEILD, ollum saetum, badar attir.
      Klasar eru TIMABIL. Per-leikmanns klasun er EKKI SKILGREIND
      hér: ein draft-utkoma er SAMEIGINLEG afleidling allrar
      laugarinnar, ekki summa af leikmanna-framlogum, svo thad er
      engin leikmanna-vig ad endursyna.
   A. MERKID (fylgir sem forsenda, ekki nidurstada): fylgni breytu
      vid LEIF sparinnar, z-stoðlud innan (timabil x stada). Hér ER
      per-leikmanns klasun skilgreind og hun er notud (>=400 itranir).
      Tholmorkin ur `feature-probe`: fylgni ~0 getur ekki batid
      akvordun, en fylgni 0,05 er tilgáta og ekki nidurstada.

   TOPPURINN ER MAELDUR SER. Draft notar toppinn; breyta sem hjalpar
   a saeti 400 er gagnslaus. Vogin er thvi lika maeld TAKMORKUD vid
   topp-100 og topp-50 af grunnbordinu (`scope`). VARNAGLI SEM VERDUR
   AD STANDA: maelingalaugin er ~150 leikmenn per ar (ADP-poruð), ekki
   1.100 eins og laugin i appinu. "Topp 100" er thvi ~2/3 af lauginni
   hér og topp-50 er retta topp-skurdurinn — hann er ~fjorar fyrstu
   umferdir i 12-lida deild, thar sem draftid raest.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean, bootstrapDiff } from "../src/learn.js";
import { getText, record } from "./lib/http.mjs";
import { objects, num, str } from "./lib/csv.mjs";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const REL = "https://github.com/nflverse/nflverse-data/releases/download";
const ARG = parseArgs(process.argv.slice(2), {
  runs: "number", from: "number", boot: "number", extra: "string", only: "string",
  out: "string",
});
const RUNS = Number(ARG.runs || 4);
const FROM = Number(ARG.from || 2015);
const BOOT = Number(ARG.boot || 1000);
/* ============================================================
   --extra / --only — SAMA NET, NYJAR BREYTUR (24.8.2026)
   ============================================================
   Spurningin "geta nyju markadsodds eda serfraedingarnir baett
   A-Ranking?" er NAKVAEMLEGA sama spurning sem thetta net var byggt
   fyrir: baetir litil, einraen vog OFAN A obreyttan kjarna
   akvordunina, maeld gegn atta plaseboum og walk-forward? Thess vegna
   er hun ekki ny vel heldur nyjar BREYTUR i gomlu velina.

   `--extra=<skra>`  les `data/measure/<skra>` (byggd af
                     `build-extra-features.mjs`) og laetur breyturnar
                     thar fljota med i ollu — grid, plaseboum,
                     lekahlidi, Tier A, Tier B, walk-forward.
   `--only=a,b,c`    keyrir adeins thessar RAUNBREYTUR. PLASEBOARNIR
                     ERU ALDREI FILTERADIR — thak an nulldreifingar er
                     ekki thak, og su villa vaeri osynileg i utkomunni.
   `--out=<skra>`    skrifar i `data/measure/<skra>` i stad `opp.json`
                     svo ny keyrsla eydi ekki bokudu maelingunni.

   AD BAETA BREYTU VID KOSTAR FRIGRADUR OG THAD ER TALID i
   `degreesOfFreedom`. Netid er obreytt ad odru leyti — sama grid, sami
   BOOT, somu lognun, somu stigagjafir — svo tolur ur `--extra`-keyrslu
   eru SAMANBURDARHAEFAR vid bokudu `prevCarG`-tolurnar. Vaeri einhverju
   odru breytt i leidinni vaeri sa samanburdur ord, ekki maeling.     */
const EXTRA_FILE = ARG.extra ? String(ARG.extra) : null;
const ONLY = ARG.only ? String(ARG.only).split(",").map((s) => s.trim()).filter(Boolean) : null;
const OUT_FILE = ARG.out ? String(ARG.out) : "opp.json";

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const sgn = (x) => (x == null ? "   -  " : ((x > 0 ? "+" : "") + x.toFixed(1)));

/* Stadalvilla ur ARA-MEDALTOLUM, ekki ur ollum eintokum — radir innan
   ars eru hadar hver annarri (sama laug, sami vollur). Sama regla og
   `arank-lab.mjs` og `half-lab.mjs` beita. */
function tOf(a) {
  const v = a.filter((x) => x != null);
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
}

/* ============================================================
   LOGUNIN — RAUNVERULEGU DEILDIRNAR OG SU ALMENNA
   ============================================================
   Notandinn spilar i 10-lida PPR og 12-lida half-PPR, badar med TVO
   FLEX. Almenna lögunin (`DEFAULT_LEAGUE`, 12 lid, eitt flex) er med
   thvi ad allar adrar maelingar i verkefninu eru gerdar i henni — se
   nidurstada onnur i henni en i deildunum tveimur er thad sjalft
   upplysing.                                                        */
const SHAPES = [
  { key: "10-2flex", label: "10 teams, 2 FLEX (PPR league)",
    league: { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
              flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
  { key: "12-2flex", label: "12 teams, 2 FLEX (half-PPR league)",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
  { key: "12-generic", label: "12 teams, 1 FLEX (project default)",
    league: { ...DEFAULT_LEAGUE, teams: 12, rounds: 14 } },
];
const FORMATS = ["ppr", "half", "standard"];

/* ============================================================
   BREYTURNAR — MAGN, SAMHENGI, FRAMVINDA, NYTNI
   ============================================================
   `kind` er ekki skraut: FPL-verkefnid maeldi ad MAGNLIDURINN eigi ad
   vera xGI og ekki xG — markmidid inniheldur assist, svo magn slaer
   nytni. Hlidstaedan hér er "taekifaeri slaer nytni", og hun er
   PROFUD med thvi ad hafa nytni-breyturnar i somu toflu.            */
const BASE_VARS = [
  { key: "prevTshare",       kind: "volume",  label: "Target share, prior season" },
  { key: "prevWopr",         kind: "volume",  label: "Weighted opportunity rating, prior season" },
  { key: "prevTouches",      kind: "volume",  label: "Touches (carries + receptions), prior season" },
  { key: "prevOppG",         kind: "volume",  label: "Opportunities per game, prior season" },
  { key: "prevTgtG",         kind: "volume",  label: "Targets per game, prior season" },
  { key: "prevCarG",         kind: "volume",  label: "Carries per game, prior season" },
  { key: "prevOppShare",     kind: "volume",  label: "Share of team opportunities, prior season" },
  { key: "prevTeamPassRate", kind: "context", label: "Team pass rate, prior season" },
  { key: "oppLateMinusEarly", kind: "trend",  label: "Ended prior season with more opportunity than he started" },
  { key: "prevYpt",          kind: "efficiency", label: "Yards per target, prior season (efficiency)" },
  { key: "prevYpc",          kind: "efficiency", label: "Yards per carry, prior season (efficiency)" },
];

/* Fyllt i `main()` — `VARS` er thad sem raunverulega er keyrt eftir
   ad `--extra` og `--only` hafa verid tekin til greina. */
let VARS = BASE_VARS;

/* ============================================================
   PLASEBO-BREYTURNAR — OG HVERS VEGNA THAER ERU NAUDSYNLEGAR
   ============================================================
   `board-lab.mjs` setti regluna "nulltilgatan verdur ad vera hlutlaus"
   og profadi hana med BORDI GEGN SJALFU SER: w=0 gefur nakvaemlega 0.
   Thad prof er nauðsynlegt og thad er EKKI NOG. Thad getur ekki
   greint mun a "breytan ber merki" og "HVER SEM ER truflun a
   grunnbordinu baetir utkomuna" — og sidara er raunverulegur
   moguleiki: `startersPoints` er graeðug best-ball rodun, svo se
   stodu-blandan sem hreint VBD gefur ekki optimal getur HVADEINA sem
   dreifir henni maelst jakvaett, einraent i w.

   Fyrsta keyrslan gaf einmitt thad mynstur: 10 af 11 breytum jakvaedar
   og staekkandi i w i sama reit. Su tafla er ekki laesileg an
   viðmiðunar.

   Thess vegna eru hér FJORAR TILBUNAR BREYTUR sem bera EKKERT merki
   — deterministiskt suð, fast fraekorn, sami kvarði og hinar (z innan
   stodu). Thaer fara gegnum NAKVAEMLEGA sama grid, sama hermun, sama
   walk-forward. Their gefa RAUNVERULEGU NULLDREIFINGUNA, og krafan a
   raunverulega breytu er ad hun slai HANA — ekki nullid.

   Sama hugsun og "eitt stokkad bord sem null-vidmid" i README kafla 4,
   thar sem eitt frækast hafdi sina eigin heppni og maeldist HAERRA en
   samsteypan. Fjogur fraekost gefa dreifingu.                        */
/* ATTA FRAEKORN, EKKI FJOGUR. Fjogur gefa nulldreifingu med thremur
   frigradum og hun er of thunn til ad bera throskuld; atta gefa
   marktaekt bil. Kostnadurinn er keyrslutimi og ekkert annad. */
const PLACEBOS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
  key: `placebo${i}`, kind: "placebo", label: `Placebo: deterministic noise, seed ${i}`,
}));

/** Deterministiskt suð ur (id, timabil, fraekorn) — engin slembivél. */
function placeboValue(id, season, seed) {
  let h = (2166136261 ^ seed * 16777619) >>> 0;
  const s = `${id}|${season}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  /* Tvaer jafndreifdar tolur -> nálægt normal, svo kvarðinn se
     sambaerilegur vid raunverulegar breytur eftir z-stodlun. */
  const u = ((h >>> 8) & 0xffff) / 65536, v = (h & 0xff) / 256;
  return u + v - 1;
}

/* Vog: LITIL og EINRAEN, og 0 er NULLTILGATAN sem vinnur nema
   vikmorkin utiloki hana. Efri endinn (0,10) er valinn af thvi ad
   samsvarandi blondun er 0,09 — innan thess bils sem `board-lab`
   maeldi fyrir adrar fjolskyldur, svo tolurnar eru sambaerilegar.

   GRIDID ER TVIHLIDA OG THAD ER ASETT. Einhlida grid (adeins w >= 0)
   GEFUR SER ATTINA: "meira taekifaeri er betra". Attin er nakvaemlega
   thad sem `feature-probe` gat ekki stadfest — formerkin thar snerust
   vid milli laugarinnar i heild og RB (t.d. `first4` -0,134 en -0,224
   hjá RB, `lateMinusEarly` +0,061 en +0,193). Og hlidstaedan i
   FPL-verkefninu er skyr: "form er AFTURHVARF", -4,52pp eftir mark.
   Se rett svar "fadaðu thann sem fekk mest i fyrra" ma grid-id ekki
   vera olaest thvi ad finna thad. Verdid er tvofalt fleiri afbrigdi og
   thad er talid i frigradunum. */
const WEIGHTS = [-0.10, -0.08, -0.06, -0.04, -0.02, 0,
                 0.02, 0.04, 0.06, 0.08, 0.10];
const NONZERO = WEIGHTS.filter((w) => w !== 0);

/* Hvar vogin er LATIN VIRKA. `all` er oll laugin; `top100`/`top50`
   takmarka hana vid efstu N af GRUNNBORDINU — thad er eina leidin ad
   svara "hjalpar hun THAR SEM DRAFTID RAEST" an thess ad breyta
   maelikvardanum i leidinni. */
const SCOPES = [
  { key: "all", n: null },
  { key: "top100", n: 100 },
  { key: "top50", n: 50 },
];

/* ---------- VBD ---------- */
/** VBD-gildi per leikmadur. Nakvaemlega sama adgerd og `half-lab`. */
function vbdValues(pool, repl, projOf) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const out = new Map();
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map(projOf).filter((v) => v != null).sort((a, b) => b - a);
    if (!vals.length) continue;
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) {
      const v = projOf(p);
      if (v != null) out.set(p.id, v - base);
    }
  }
  return out;
}

const rankOf = (scores) => new Map([...scores.entries()]
  .sort((a, b) => b[1] - a[1]).map(([id], i) => [id, i + 1]));

/** Z-stodlun YFIR LAUGINA — notud adeins a VBD, sem er stodu-hlutlaust. */
function zPool(pool, get) {
  const vals = pool.map(get).filter((v) => v != null && Number.isFinite(v));
  if (vals.length < 20) return null;
  const m = mean(vals);
  const s = Math.sqrt(mean(vals.map((v) => (v - m) ** 2))) || 1;
  return (p) => {
    const v = get(p);
    return v == null || !Number.isFinite(v) ? 0 : (v - m) / s;
  };
}

/** Z-stodlun INNAN STODU — sja (b) i haus. Vantandi gildi -> 0 (hlutlaust). */
function zWithinPos(pool, get) {
  const st = {};
  for (const p of pool) {
    const v = get(p);
    if (v == null || !Number.isFinite(v)) continue;
    (st[p.pos] = st[p.pos] || []).push(v);
  }
  const par = {};
  let covered = 0;
  for (const [pos, vals] of Object.entries(st)) {
    if (vals.length < 8) continue;              // stada med 7 monnum ber engan z
    const m = mean(vals);
    const s = Math.sqrt(mean(vals.map((v) => (v - m) ** 2))) || 1;
    par[pos] = { m, s };
    covered += vals.length;
  }
  if (!covered) return null;
  const f = (p) => {
    const v = get(p), q = par[p.pos];
    return q == null || v == null || !Number.isFinite(v) ? 0 : (v - q.m) / q.s;
  };
  f.covered = covered;
  return f;
}

/* ============================================================
   FRAMVINDU-BREYTAN — SOTT UR NFLVERSE
   ============================================================
   `oppLateMinusEarly` er EKKI i `features.json`; `feature-probe`
   reiknadi hana i keyrslu ur vikulegum nflverse-fylkjum og maeldi
   hana staersta af framvindu-breytunum (+0,084 vid leif). Hun er
   endurreiknud hér med NAKVAEMLEGA somu formulu (thridjungar, >=8
   vikur) svo tolurnar seu sambaerilegar.

   BREST HEIMILDIN DEYR KEYRSLAN EKKI — breytan er tha merkt
   `unmeasured` i utkomunni. Thogul brotthvarf breytu vaeri verra en
   bilun: hun myndi einfaldlega vanta ur toflunni og enginn saei thad.
   `coverage` i utkomunni ber toluna svo thetta se synilegt.        */
async function loadTrend(seasons) {
  const out = new Map();                        // `${gsis}|${season}` -> value
  let okYears = 0;
  for (const y of seasons.map((s) => s - 1)) {
    try {
      const t = await getText(`${REL}/stats_player/stats_player_week_${y}.csv`);
      const wk = objects(t, ["player_id", "season_type", "week", "targets", "carries"]);
      const by = new Map();
      for (const r of wk) {
        if (r.season_type !== "REG") continue;
        const id = str(r.player_id);
        if (!id) continue;
        const n = (v) => (v == null || !Number.isFinite(Number(v)) ? 0 : Number(v));
        (by.get(id) || by.set(id, []).get(id)).push(
          { week: num(r.week), opp: n(r.targets) + n(r.carries) });
      }
      for (const [id, list] of by) {
        if (list.length < 8) continue;
        list.sort((a, b) => a.week - b.week);
        const third = Math.max(3, Math.floor(list.length / 3));
        out.set(`${id}|${y + 1}`,
          mean(list.slice(-third).map((x) => x.opp)) -
          mean(list.slice(0, third).map((x) => x.opp)));
      }
      okYears++;
      record(`weekly_${y}`, true, `${by.size} players`);
    } catch (e) {
      record(`weekly_${y}`, false, `failed: ${e.message}`);
    }
  }
  return { map: out, okYears };
}

/* ---------- fylgni ---------- */
/** P(X >= k) fyrir X ~ Bin(n, 0,5) — einhlida tekna-prof a rodinni. */
function binomTail(k, n) {
  let sum = 0;
  for (let i = k; i <= n; i++) {
    let c = 1;
    for (let j = 1; j <= i; j++) c = (c * (n - i + j)) / j;
    sum += c;
  }
  return sum / 2 ** n;
}

function corr(a, b) {
  const ma = mean(a), mb = mean(b);
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : 0;
}

/**
 * Bootstrap KLASADUR PER LEIKMANN. Klasinn er leikmadurinn, ekki
 * radirnar hans: sami madur kemur fyrir i allt ad 11 timabilum og
 * radir hans eru hadar hver annarri (sami hafileiki, sama lid). Ad
 * endursyna radir vaeri ad thykjast hafa fleiri ohad sýni en til eru
 * — nakvaemlega sami varnagli og `mo-candidates.mjs` i FPL-verkefninu.
 */
function bootCorrByPlayer(rows, iters, seed = 20260812) {
  const byP = new Map();
  for (const r of rows) (byP.get(r.pid) || byP.set(r.pid, []).get(r.pid)).push(r);
  const ids = [...byP.keys()];
  if (ids.length < 30) return null;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const rs = [];
  for (let it = 0; it < iters; it++) {
    const x = [], y = [];
    for (let i = 0; i < ids.length; i++) {
      for (const r of byP.get(ids[Math.floor(rnd() * ids.length)])) { x.push(r.f); y.push(r.e); }
    }
    rs.push(corr(x, y));
  }
  rs.sort((a, b) => a - b);
  const lo = rs[Math.floor(iters * 0.025)], hi = rs[Math.floor(iters * 0.975)];
  return { lo: r3(lo), hi: r3(hi), excludesZero: lo > 0 || hi < 0,
           players: ids.length, iters };
}

/** Vikmork a ARA-MEDALTOLUM — klasinn er timabilid (sja haus, B). */
function bootSeasons(per) {
  const zeros = Object.fromEntries(Object.keys(per).map((k) => [k, 0]));
  const b = bootstrapDiff(per, zeros, 2000, 777);
  return b ? { lo: r1(b.lo), hi: r1(b.hi), excludesZero: b.excludesZero } : null;
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));

  /* ---------- --extra: NYJAR BREYTUR I SAMA NETID ---------- */
  let extra = null;                             // `${id}|${season}` -> row
  let extraMeta = null;
  if (EXTRA_FILE) {
    const raw = JSON.parse(await readFile(path.join(OUT, "measure", EXTRA_FILE), "utf8"));
    extra = new Map(raw.rows.map((r) => [`${r.id}|${r.season}`, r]));
    const keys = Object.keys(raw.variables || {});
    if (!keys.length) { console.error(`${EXTRA_FILE} ber engar breytur`); process.exit(2); }
    VARS = [...BASE_VARS, ...keys.map((k) => ({
      key: k, kind: "extra", label: raw.variables[k], fromExtra: true }))];
    extraMeta = { file: EXTRA_FILE, provenance: raw.provenance, leak: raw.leak,
      coverage: raw.coverage, anchor: raw.anchor, honestVsOracle: raw.honestVsOracle,
      variables: raw.variables };
    console.log(`--extra=${EXTRA_FILE}: ${keys.length} nyjar breytur, ${extra.size} radir`);
  }
  if (ONLY) {
    const before = VARS.length;
    VARS = VARS.filter((v) => ONLY.includes(v.key));
    if (!VARS.length) { console.error(`--only skildi engar breytur eftir`); process.exit(2); }
    console.log(`--only: ${VARS.length} af ${before} raunbreytum ` +
      `(${VARS.map((v) => v.key).join(", ")}); PLASEBOARNIR ERU OSKERTIR`);
  }

  /* ---------- PORUN ppr <-> standard (half er algebra) ---------- */
  const byKey = { ppr: new Map(), standard: new Map() };
  for (const r of feats.rows) {
    if (!byKey[r.scoring]) continue;
    byKey[r.scoring].set(`${r.season}|${r.id}`, r);
  }
  let paired = 0, unpaired = 0;
  for (const k of byKey.ppr.keys()) (byKey.standard.has(k) ? paired++ : unpaired++);
  console.log(`porun ppr<->standard: ${paired} por, ${unpaired} oporud`);

  const years = [...new Set(feats.rows.map((r) => r.season))].sort()
    .filter((y) => y >= FROM && y <= 2025);

  /* ---------- FRAMVINDU-BREYTAN ----------
     Sotti EKKI ~11 vikuleg nflverse-fylki thegar `--only` skilur
     `oppLateMinusEarly` ekki eftir; hun vaeri tha bara ekki notud. */
  const needTrend = !ONLY || ONLY.includes("oppLateMinusEarly");
  let trend = { map: new Map(), okYears: 0 };
  if (needTrend) {
    console.log(`\nsaeki vikuleg nflverse-fylki fyrir oppLateMinusEarly …`);
    trend = await loadTrend(years);
  } else {
    console.log(`\n(sleppi vikulegum nflverse-fylkjum: oppLateMinusEarly er ekki i --only)`);
  }

  /* ---------- LAUGIN PER AR ---------- */
  const pools = {};
  for (const y of years) {
    const rows = [];
    for (const [k, a] of byKey.ppr) {
      if (!k.startsWith(`${y}|`)) continue;
      const b = byKey.standard.get(k);
      if (!b || a.adp == null || b.adp == null) continue;
      const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
      const sj = b.sleeperProj != null ? b.sleeperProj : b.ffProj;
      if (pj == null || sj == null) continue;
      if (a.pts == null || b.ptsStd == null) continue;
      const p = {
        id: a.id, pos: a.pos, name: a.name,
        adpPpr: a.adp, adpStd: b.adp, adpSd: a.adpSd,
        g: a.g,
        proj: { ppr: pj, standard: sj, half: (pj + sj) / 2 },
        actual: { ppr: a.pts, standard: b.ptsStd, half: (a.pts + b.ptsStd) / 2 },
        sleeperEra: a.sleeperProj != null,
      };
      /* Breyturnar eru stigagjafar-obundnar (thaer eru tolfraedi fyrra
         timabils), svo thaer eru teknar ur ppr-rodinni. */
      const xr = extra ? extra.get(`${a.id}|${y}`) : null;
      for (const v of VARS) {
        if (v.fromExtra) p[v.key] = xr && xr[v.key] != null ? xr[v.key] : null;
        else p[v.key] = a[v.key] != null ? a[v.key] : null;
      }
      if (!ONLY || ONLY.includes("oppLateMinusEarly")) {
        p.oppLateMinusEarly = trend.map.has(`${a.id}|${y}`)
          ? trend.map.get(`${a.id}|${y}`) : null;
      }
      for (let i = 0; i < PLACEBOS.length; i++) {
        p[PLACEBOS[i].key] = placeboValue(a.id, y, i + 1);
      }
      rows.push(p);
    }
    if (rows.length >= 120) pools[y] = rows;
  }
  const ys = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, "timabil med baedi spa, ADP og raunstig");
  console.log(`\n${ys.length} timabil · ` +
    `${r1(mean(ys.map((y) => pools[y].length)))} leikmenn ad medaltali`);

  /* Plaseboarnir fara gegnum NAKVAEMLEGA sama grid og hinar — sama
     z-stodlun, sama hermun, sami walk-forward. Vaeri thad ekki svo
     vaeri nulldreifingin ekki nulldreifing thessarar maelingar. */
  const ALL_VARS = [...VARS, ...PLACEBOS];

  /* ---------- THEKJA HVERRAR BREYTU ---------- */
  const coverage = {};
  const allRows = ys.flatMap((y) => pools[y]);
  for (const v of ALL_VARS) {
    const n = allRows.filter((p) => p[v.key] != null).length;
    coverage[v.key] = { rows: n, of: allRows.length, pct: r3(n / allRows.length) };
  }
  console.log(`\nthekja per breytu:`);
  for (const v of ALL_VARS) {
    console.log(`   ${v.key.padEnd(20)} ${String(coverage[v.key].rows).padStart(5)}/` +
      `${coverage[v.key].of}  (${(coverage[v.key].pct * 100).toFixed(0)}%)`);
  }
  const unmeasured = VARS.filter((v) => coverage[v.key].rows < 300).map((v) => v.key);
  if (unmeasured.length) console.log(`   OMAELDAR (of thunn thekja): ${unmeasured.join(", ")}`);

  /* ============================================================
     LEKAHLIDID — GENGID GEGNUM THAD I STAD THESS AD GEFA THAD SER
     ============================================================
     `prev*` KOMA ur `seasons.get(id|year-1)` i `build-features.mjs`,
     svo thaer eru byggingarlega ur fyrra timabili. Thad er sterkasta
     sonnunin, en hun er lestur a kóda og ekki maeling. Hlidid sem
     README-kafli "Lekavarnir" beitir a spar er thvi keyrt hér lika:
     fylgni breytu vid LEIKI SPILADA A MAELDA ARINU. Uppfaerd —
     mengud — tala myndi gefa ~0,7; Sleeper og ADP gefa 0,09–0,21.
     Mork: 0,45, sama tala og `nfl-pipeline.mjs` notar.              */
  const leakGate = {};
  for (const v of ALL_VARS) {
    const rows = [];
    for (const y of ys) {
      const z = zWithinPos(pools[y], (p) => p[v.key]);
      const zg = zWithinPos(pools[y], (p) => p.g);
      if (!z || !zg) continue;
      for (const p of pools[y]) if (p[v.key] != null && p.g != null) rows.push([z(p), zg(p)]);
    }
    const r = rows.length > 50 ? corr(rows.map((x) => x[0]), rows.map((x) => x[1])) : null;
    leakGate[v.key] = { rWithGamesPlayed: r3(r), n: rows.length, passes: r == null || Math.abs(r) < 0.45 };
  }
  const leakFail = Object.entries(leakGate).filter(([, q]) => !q.passes).map(([k]) => k);
  console.log(`\nlekahlid (fylgni vid leiki spiladda a maelda arinu, mork 0,45):`);
  for (const v of ALL_VARS) {
    console.log(`   ${v.key.padEnd(20)} r=${String(leakGate[v.key].rWithGamesPlayed).padStart(7)}` +
      `  ${leakGate[v.key].passes ? "ok" : "FELLUR"}`);
  }

  /* ============================================================
     TIER A — MERKID: FYLGNI VID LEIF SPARINNAR
     ============================================================
     Leif = raunstig - spa, z-stodlud INNAN (timabil x stada) svo
     olikar stigagjafir og olikar stodur seu a sama kvarda. Fylgnin er
     nedri mork a gagnsemi (sja `feature-probe`), ekki nidurstada —
     nidurstadan er Tier B.                                          */
  console.log(`\n${"=".repeat(92)}`);
  console.log(`  TIER A — MERKID: fylgni breytu vid LEIF sparinnar (bootstrap klasad per leikmann)`);
  console.log("=".repeat(92));

  const replBySpape = Object.fromEntries(
    SHAPES.map((s) => [s.key, replacementRanks({ ...s.league, scoring: "ppr" })]));
  /* Grunnrod fyrir `scope` er tekin ur ALMENNU lögunni — hun ma ekki
     vera ólik milli forma, annars vaeri "topp 50" annar hopur i hverju
     formi og samanburdurinn milli forma ekki paraður. */
  const baseRankFor = {};
  for (const y of ys) {
    baseRankFor[y] = {};
    for (const fmt of FORMATS) {
      const vbd = vbdValues(pools[y], replBySpape["12-generic"], (p) => p.proj[fmt]);
      baseRankFor[y][fmt] = rankOf(new Map(pools[y].map((p) => [p.id, vbd.get(p.id) ?? -1e9])));
    }
  }

  const tierA = {};
  for (const fmt of FORMATS) {
    tierA[fmt] = {};
    for (const sc of SCOPES) {
      tierA[fmt][sc.key] = {};
      for (const v of ALL_VARS) {
        const rows = [];
        for (const y of ys) {
          const inScope = pools[y].filter((p) =>
            sc.n == null || (baseRankFor[y][fmt].get(p.id) || 1e9) <= sc.n);
          if (inScope.length < 40) continue;
          const zf = zWithinPos(inScope, (p) => p[v.key]);
          const ze = zWithinPos(inScope, (p) => p.actual[fmt] - p.proj[fmt]);
          if (!zf || !ze) continue;
          for (const p of inScope) {
            if (p[v.key] == null) continue;
            rows.push({ pid: p.id, pos: p.pos, f: zf(p), e: ze(p) });
          }
        }
        if (rows.length < 150) { tierA[fmt][sc.key][v.key] = { n: rows.length, r: null, note: "too few rows" }; continue; }
        const r = corr(rows.map((x) => x.f), rows.map((x) => x.e));
        /* PER STODU LIKA. Thvert a stodur getur breyta fylgt leifinni
           bara af thvi ad hun fylgir stodunni — og hér er hitt eins
           mikilvaegt: `prevCarG` er nanast NULL hjá WR/TE, svo z hennar
           innan theirra stodu er suð. Se merkid allt hjá RB og QB er
           thad SITT MERKI (vinnualag hlaupara, hlaupandi leikstjornandi)
           og ekki "taekifaeri" i almennum skilningi. */
        const byPos = {};
        for (const pos of ["QB", "RB", "WR", "TE"]) {
          const sub = rows.filter((x) => x.pos === pos);
          byPos[pos] = sub.length >= 60
            ? r3(corr(sub.map((x) => x.f), sub.map((x) => x.e))) : null;
        }
        tierA[fmt][sc.key][v.key] = { n: rows.length, r: r3(r), byPos,
          ci: bootCorrByPlayer(rows, BOOT) };
      }
    }
  }
  console.log(`\n   ${"breyta".padEnd(20)}${"kind".padEnd(11)}` +
    FORMATS.map((f) => `${f} (all / top50)`.padStart(24)).join(""));
  for (const v of ALL_VARS) {
    const cells = FORMATS.map((f) => {
      const a = tierA[f].all[v.key], t = tierA[f].top50[v.key];
      const s = (q) => (q && q.r != null
        ? `${q.r >= 0 ? "+" : ""}${q.r.toFixed(3)}${q.ci && q.ci.excludesZero ? "*" : " "}` : "   -   ");
      return `${s(a)} / ${s(t)}`.padStart(24);
    }).join("");
    console.log(`   ${v.key.padEnd(20)}${v.kind.padEnd(11)}${cells}`);
  }
  console.log(`   * = 95% bootstrap-vikmork (klasad per leikmann, ${BOOT} itranir) utiloka null`);

  /* ============================================================
     TIER B — AKVORDUNIN: DRAFT-HERMUN, PORAD EINVIGI
     ============================================================ */
  const noisyField = (pool, adpKey, seed) => {
    let a = seed >>> 0;
    const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const gauss = () => {
      const u = Math.max(1e-9, rnd()), v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return new Map(pool.map((p) => {
      const sd = p.adpSd > 0 ? p.adpSd : 1.082 * Math.sqrt(Math.max(1, p[adpKey]));
      return [p.id, p[adpKey] + gauss() * sd];
    }).sort((x, z) => x[1] - z[1]).map(([id], i) => [id, i + 1]));
  };

  /* Fyrirfram-reiknad per (ar, logun, form): VBD, z af VBD, grunnrod,
     raunstig og vollur. Bordin sjalf eru odyr; thetta er thad sem er
     dyrt ad reikna 1.500 sinnum. */
  const W = {};
  for (const sh of SHAPES) {
    W[sh.key] = {};
    for (const fmt of FORMATS) {
      W[sh.key][fmt] = {};
      for (const y of ys) {
        const pool = pools[y];
        const vbd = vbdValues(pool, replBySpape[sh.key], (p) => p.proj[fmt]);
        const zv = zPool(pool, (p) => vbd.get(p.id));
        const base = rankOf(new Map(pool.map((p) => [p.id, zv(p)])));
        W[sh.key][fmt][y] = {
          pool, vbd, zv, base,
          actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[fmt] }])),
          zf: Object.fromEntries(ALL_VARS.map((v) => [v.key, zWithinPos(pool, (p) => p[v.key])])),
        };
      }
    }
  }

  const adpKeyFor = (fmt) => (fmt === "standard" ? "adpStd" : "adpPpr");

  /**
   * Eitt porad einvigi: bordid med vog w gegn bordinu med w=0, BADIR
   * i somu deild, ollum saetapörum, badar attir. Skilar per-ars
   * medaltali af (min stig - hans stig).
   */
  function duel(sh, fmt, varKey, w, scopeN, adpKey) {
    const per = {};
    const L = sh.league, T = L.teams;
    for (const y of ys) {
      const w0 = W[sh.key][fmt][y];
      const zf = w0.zf[varKey];
      if (!zf) continue;
      const scoped = scopeN == null ? null
        : new Set(w0.pool.filter((p) => (w0.base.get(p.id) || 1e9) <= scopeN).map((p) => p.id));
      const mine = rankOf(new Map(w0.pool.map((p) => [p.id,
        w0.zv(p) + (scoped == null || scoped.has(p.id) ? w * zf(p) : 0)])));
      const d = [];
      for (let r = 0; r < RUNS; r++) {
        const field = r === 0
          ? new Map(w0.pool.slice().sort((a, b) => a[adpKey] - b[adpKey]).map((p, i) => [p.id, i + 1]))
          : noisyField(w0.pool, adpKey, y * 1000 + r * 7919);
        for (let i = 1; i <= T; i++) {
          const j = (i % T) + 1;
          for (const swap of [false, true]) {
            const out = simulateDraft({ board: mine, fieldBoard: field, actual: w0.actual,
              slot: swap ? j : i, league: L, rival: { slot: swap ? i : j, board: w0.base } });
            d.push(out.points - out.rivalPoints);
          }
        }
      }
      per[y] = mean(d);
    }
    return per;
  }

  /** Tekur per-ars medaltol og gerir ur theim maelinguna sjalfa.
      GEYMIR EKKI ERA-SKIPTINGU PER REIT — hun var thar i fyrri utgafu
      og gerdi utkomuskrana 4 MB an ad vera birt nokkurs stadar. Hun er
      nu reiknud A BREYTU-STIGI (`perVariable.sleeperEra`), thar sem hun
      er raunverulega lesin, ur somu `per`-tolum. Maelingaskra sem ber
      gogn sem enginn les er ekki varfaernin sem hun litur ut fyrir. */
  function summarize(per) {
    const v = Object.values(per);
    return {
      mean: r1(mean(v)), t: tOf(v), wins: v.filter((x) => x > 0).length, years: v.length,
      ci: bootSeasons(per),
      per: Object.fromEntries(Object.entries(per).map(([k, x]) => [k, r1(x)])),
    };
  }

  /* ---------- NULLTILGATAN VERDUR AD VERA HLUTLAUS ----------
     Bord gegn sjalfu ser skal gefa NAKVAEMLEGA 0. Gerdi thad thad
     ekki vaeri hermunin osamhverf og hver einasta tala hér
     merkingarlaus. Thetta er FYRSTA profid, ekki thad sidasta —
     sama regla og `board-lab.mjs` setti. */
  console.log(`\nnull-prof (bord gegn sjalfu ser skal gefa nakvaemlega 0):`);
  const nullCheck = {};
  for (const sh of SHAPES) {
    for (const fmt of FORMATS) {
      const per = duel(sh, fmt, VARS[0].key, 0, null, adpKeyFor(fmt));
      const worst = Math.max(...Object.values(per).map((v) => Math.abs(v)));
      nullCheck[`${sh.key}|${fmt}`] = { maxAbsPerSeason: r3(worst), neutral: worst === 0 };
      console.log(`   ${sh.key.padEnd(12)} ${fmt.padEnd(9)} max|per ar| = ${worst}` +
        `  ${worst === 0 ? "hlutlaus" : "OSAMHVERF — allar tolur her eru omarktaekar"}`);
    }
  }
  if (Object.values(nullCheck).some((q) => !q.neutral)) {
    console.error("\n  NULL-PROFID FELL. Skrifa EKKERT — osamhverf hermun gerir hverja tolu villandi.\n");
    process.exit(3);
  }

  /* ---------- GRID-IÐ ---------- */
  const usable = VARS.filter((v) => !unmeasured.includes(v.key));
  /* GRID-IÐ KEYRIR PLASEBOANA LIKA. `usable` er thad sem er PROFAD
     (og thad eina sem telur i frigradurnar); `gridVars` er thad sem er
     KEYRT, thvi nulldreifingin verdur ad koma ur somu vel. */
  const gridVars = [...usable, ...PLACEBOS];
  const tried = usable.length * NONZERO.length * SCOPES.length * FORMATS.length * SHAPES.length;
  console.log(`\n${"=".repeat(92)}`);
  console.log(`  TIER B — AKVORDUNIN: ${usable.length} breytur x ${NONZERO.length} vogir x ` +
    `${SCOPES.length} svid x ${FORMATS.length} form x ${SHAPES.length} logun = ${tried} afbrigdi`);
  console.log("=".repeat(92));

  const decision = {}, placeboRef = {};
  for (const sh of SHAPES) {
    decision[sh.key] = {};
    for (const fmt of FORMATS) {
      decision[sh.key][fmt] = {};
      for (const sc of SCOPES) {
        decision[sh.key][fmt][sc.key] = {};
        for (const v of gridVars) {
          decision[sh.key][fmt][sc.key][v.key] = {};
          for (const w of WEIGHTS) {
            if (w === 0) continue;              // nulltilgatan er maeld i null-profinu
            const per = duel(sh, fmt, v.key, w, sc.n, adpKeyFor(fmt));
            decision[sh.key][fmt][sc.key][v.key][w] = summarize(per);
          }
        }
      }
      const cell = decision[sh.key][fmt];

      /* ---------- NULLDREIFINGIN UR PLASEBOUNUM ----------
         20 sýni per reit (4 fraekorn x 5 vogir). Krafan a raunverulega
         breytu er ad slá THETTA, ekki nullid: se p95 hér +40 stig er
         "+35 stig, t=3" hjá raunverulegri breytu EKKI merki. */
      const plc = [];
      for (const sc of SCOPES) for (const v of PLACEBOS) for (const w of WEIGHTS) {
        if (w === 0) continue;
        plc.push({ scope: sc.key, key: v.key, w, ...cell[sc.key][v.key][w] });
      }
      const pm = plc.map((x) => x.mean).sort((a, b) => a - b);
      const pt = plc.map((x) => x.t ?? 0).map(Math.abs).sort((a, b) => a - b);
      placeboRef[`${sh.key}|${fmt}`] = {
        n: pm.length,
        mean: r1(mean(pm)), p50: r1(pm[Math.floor(pm.length * 0.5)]),
        p95: r1(pm[Math.floor(pm.length * 0.95)]), max: r1(pm[pm.length - 1]),
        min: r1(pm[0]),
        maxAbsT: r3(pt[pt.length - 1]), p95AbsT: r3(pt[Math.floor(pt.length * 0.95)]),
        significantCells: plc.filter((x) => x.ci && x.ci.excludesZero).length,
      };

      /* Best i hverjum reit — LEIT, ekki nidurstada. */
      const flat = [];
      for (const sc of SCOPES) for (const v of usable) for (const w of WEIGHTS) {
        if (w === 0) continue;
        flat.push({ scope: sc.key, key: v.key, w, ...cell[sc.key][v.key][w] });
      }
      flat.sort((a, b) => b.mean - a.mean);
      const pr = placeboRef[`${sh.key}|${fmt}`];
      console.log(`\n   ${sh.label} · ${fmt.toUpperCase()}`);
      console.log(`   PLASEBO (${pr.n} syni): medaltal ${sgn(pr.mean)} · p95 ${sgn(pr.p95)} · ` +
        `haest ${sgn(pr.max)} · haesta |t| ${pr.maxAbsT} · ` +
        `${pr.significantCells} af ${pr.n} "marktaek"`);
      console.log(`   ${"breyta".padEnd(20)}${"svid".padEnd(8)}   w   ` +
        `${"stig".padStart(8)}  ar    t      95% CI          > plasebo-p95?`);
      for (const b of flat.slice(0, 5)) {
        console.log(`   ${b.key.padEnd(20)}${b.scope.padEnd(8)}${String(b.w).padStart(5)} ` +
          `${sgn(b.mean).padStart(8)}  ${b.wins}/${b.years}  ${String(b.t).padStart(6)}  ` +
          `[${sgn(b.ci && b.ci.lo)}, ${sgn(b.ci && b.ci.hi)}]`.padEnd(20) +
          `${b.mean > pr.p95 ? "JA" : "nei"}`);
      }
      const worst = flat[flat.length - 1];
      console.log(`   verst: ${worst.key} ${worst.scope} w=${worst.w} -> ${sgn(worst.mean)} (t=${worst.t})`);
    }
  }

  /* ============================================================
     WALK-FORWARD — EINA TALAN SEM MA BERA SAMAN VID NUVERANDI BORD
     ============================================================
     Fyrir hvert ar er (breyta, vog, svid) valid A ARUNUM A UNDAN og
     beitt a arid sjalft. Ad velja best a ollum arunum og birta thad
     sem arangur er leki, og hann litur ALLTAF vel ut — `board-lab`
     maeldi thad: aldur vann hráu leitina 4/4 og fell walk-forward
     4/4.                                                            */
  console.log(`\n${"=".repeat(92)}`);
  console.log("  WALK-FORWARD (breyta, vog og svid valin a fyrri arum eingongu)");
  console.log("=".repeat(92));
  /* Walk-forward er keyrt TVISVAR: einu sinni a raunverulegu
     breytunum og einu sinni a PLASEBOUNUM EINGONGU. Sidara er
     nulldreifing walk-forward-vals sjalfs — leit yfir 60 gagnslaus
     afbrigdi getur lika "valid" eitthvad sem virkar naesta ar af
     tilviljun, og su tala er thad sem raunverulega breytan verdur ad
     sla. Nakvaemlega sama rok og "eitt stokkad bord" i README kafla 4. */
  const wfFor = (sh, fmt, vars) => {
    const cell = decision[sh.key][fmt];
    const cands = [];
    for (const sc of SCOPES) for (const v of vars) for (const w of WEIGHTS) {
      if (w === 0) continue;
      cands.push({ scope: sc.key, key: v.key, w, per: cell[sc.key][v.key][w].per });
    }
    const perYear = {}, chosen = {};
    for (let i = 1; i < ys.length; i++) {
      const y = ys[i], prior = ys.slice(0, i);
      let best = null;
      for (const c of cands) {
        const m = mean(prior.map((p) => c.per[p]).filter((x) => x != null));
        if (best == null || m > best.m) best = { m, c };
      }
      if (!best || best.c.per[y] == null) continue;
      perYear[y] = best.c.per[y];
      chosen[y] = `${best.c.key} w=${best.c.w} ${best.c.scope}`;
    }
    const vals = Object.values(perYear);
    return { mean: r1(mean(vals)), t: tOf(vals),
      wins: vals.filter((x) => x > 0).length, years: vals.length,
      ci: bootSeasons(perYear), chosen,
      perYear: Object.fromEntries(Object.entries(perYear).map(([k, v]) => [k, r1(v)])) };
  };
  const walkForward = {}, walkForwardPlacebo = {};
  for (const sh of SHAPES) {
    walkForward[sh.key] = {}; walkForwardPlacebo[sh.key] = {};
    for (const fmt of FORMATS) {
      const q = wfFor(sh, fmt, usable);
      const z = wfFor(sh, fmt, PLACEBOS);
      walkForward[sh.key][fmt] = q;
      walkForwardPlacebo[sh.key][fmt] = z;
      console.log(`   ${sh.key.padEnd(12)} ${fmt.padEnd(9)} ${sgn(q.mean).padStart(8)} stig · ` +
        `${q.wins}/${q.years} ar · t=${String(q.t).padStart(6)} · ` +
        `[${sgn(q.ci && q.ci.lo)}, ${sgn(q.ci && q.ci.hi)}]`.padEnd(20) +
        ` plasebo ${sgn(z.mean)} (${z.wins}/${z.years})`);
    }
  }

  /* ============================================================
     KJARNATILGATAN — PPR GEGN HALF GEGN STANDARD, PORAD PER AR
     ============================================================
     Somu ar, somu leikmenn, sama vog, sama logun: munurinn a formum
     er thvi PORUD spurning og er profud sem pardur samanburdur per
     timabili, ekki med tveimur ohadum medaltolum. Sama rok og
     `half-lab.mjs` beitir.                                          */
  console.log(`\n${"=".repeat(92)}`);
  console.log("  ER MERKID STERKARA I PPR EN I STANDARD? (porad per timabili)");
  console.log("=".repeat(92));
  const formatContrast = {};
  for (const sh of SHAPES) {
    formatContrast[sh.key] = {};
    for (const v of usable) {
      formatContrast[sh.key][v.key] = {};
      for (const sc of SCOPES) {
        for (const w of WEIGHTS) {
          if (w === 0) continue;
          const cell = (f) => decision[sh.key][f][sc.key][v.key][w].per;
          for (const [a, b] of [["ppr", "standard"], ["ppr", "half"], ["half", "standard"]]) {
            const A = cell(a), B = cell(b);
            const d = ys.map((y) => (A[y] != null && B[y] != null ? A[y] - B[y] : null))
              .filter((x) => x != null);
            formatContrast[sh.key][v.key][`${a}-${b}|${sc.key}|${w}`] = {
              mean: r1(mean(d)), t: tOf(d), years: d.length,
              wins: d.filter((x) => x > 0).length,
            };
          }
        }
      }
    }
  }
  /* Birt fyrir svidid sem draftid notar (top50) og thyngstu vog, thvi
     thad er thar sem tilgatan segir ad munurinn eigi ad sjast. */
  const SHOW_W = 0.10, SHOW_SC = "top50";
  console.log(`\n   (svid=${SHOW_SC}, w=${SHOW_W} — thar sem tilgatan segir munurinn eigi ad sjast)`);
  for (const sh of SHAPES) {
    console.log(`\n   ${sh.label}`);
    console.log(`   ${"breyta".padEnd(20)}${"ppr".padStart(9)}${"half".padStart(9)}` +
      `${"std".padStart(9)}${"ppr-std".padStart(11)}${"t".padStart(8)}  ar`);
    for (const v of usable) {
      const g = (f) => decision[sh.key][f][SHOW_SC][v.key][SHOW_W].mean;
      const c = formatContrast[sh.key][v.key][`ppr-standard|${SHOW_SC}|${SHOW_W}`];
      console.log(`   ${v.key.padEnd(20)}${sgn(g("ppr")).padStart(9)}${sgn(g("half")).padStart(9)}` +
        `${sgn(g("standard")).padStart(9)}${sgn(c.mean).padStart(11)}${String(c.t).padStart(8)}  ${c.wins}/${c.years}`);
    }
  }

  /* ============================================================
     HALF-ADP SEM VIKMORK — SOGULEGT half-ADP ER EKKI TIL
     ============================================================
     Vollurinn i half-hermuninni draftar eftir ppr-ADP hér ad ofan.
     Fyrir thann sem VINNUR er hitt endamarkid (std-ADP) maelt lika,
     svo nidurstada sem er hád ADP-valinu se synileg sem slik.       */
  const adpBounds = {};
  for (const sh of SHAPES) {
    const cell = decision[sh.key].half;
    const flat = [];
    for (const sc of SCOPES) for (const v of usable) for (const w of WEIGHTS) {
      if (w === 0) continue;
      flat.push({ scope: sc.key, key: v.key, w, mean: cell[sc.key][v.key][w].mean });
    }
    flat.sort((a, b) => b.mean - a.mean);
    const b = flat[0];
    const per = duel(sh, "half", b.key, b.w, SCOPES.find((s) => s.key === b.scope).n, "adpStd");
    adpBounds[sh.key] = { variant: `${b.key} w=${b.w} ${b.scope}`,
      withPprAdp: b.mean, withStdAdp: summarize(per) };
  }
  console.log(`\n  half-ADP vikmork (besta afbrigdi i half, mælt med badum ADP-bordum):`);
  for (const sh of SHAPES) {
    const q = adpBounds[sh.key];
    console.log(`   ${sh.key.padEnd(12)} ${q.variant.padEnd(32)} ` +
      `ppr-ADP ${sgn(q.withPprAdp)} · std-ADP ${sgn(q.withStdAdp.mean)} (t=${q.withStdAdp.t})`);
  }

  /* ============================================================
     FJOLDI SAMANBURDA — FRIGRADURNAR SAGDAR BERUM ORDUM
     ============================================================
     Vid `tried` samanburdi er BESTA utkoman vaentanlega jakvaed af
     tilviljun einni. Hráu mörkin eru thvi birt VID HLIDINA a
     leidrettum, og thad eru thau leidrettu sem gilda — sama
     leidrettingarform og `board-lab.mjs` notar svo tolurnar seu
     sambaerilegar milli maelinga.                                   */
  /* `tCrit` og `bonf` eru birt TIL SAMANBURDAR vid `board-lab.mjs`,
     sem notar nakvaemlega thessa leidrettingu — svo lesandi geti sett
     tolurnar hlid vid hlid. THAU ERU EKKI SKILYRDI HER. Astaedan er
     maeld: leidrettingin er FORMULA og plaseboarnir eru MAELING, og
     thegar bædi eru til er maelingin sem gildir. Formulan gefur 5,2
     vid 2.970 afbrigdi — throskuld sem ekkert 11-ara medaltal getur
     naest — medan plaseboarnir syna ad raunverulega familywise-morkin
     i STOKUM reit eru ~3,5. Formula sem er allt of hord er ekki
     varfaernin sem hun litur ut fyrir ad vera: hun fellir allt og
     maelir thvi ekkert. */
  const tCrit = { 4: 2.776, 10: 2.228 }[Math.max(4, Math.min(10, ys.length - 1))] || 2.228;
  const bonf = tCrit * Math.sqrt(Math.log(Math.max(2, tried)) / Math.log(2)) * 0.6 + tCrit * 0.4;
  const bestOverall = [];
  for (const sh of SHAPES) for (const fmt of FORMATS) for (const sc of SCOPES)
    for (const v of usable) for (const w of WEIGHTS) {
      if (w === 0) continue;
      const q = decision[sh.key][fmt][sc.key][v.key][w];
      bestOverall.push({ shape: sh.key, fmt, scope: sc.key, key: v.key, w,
        mean: q.mean, t: q.t, wins: q.wins, years: q.years, ci: q.ci });
    }
  bestOverall.sort((a, b) => (b.t ?? -99) - (a.t ?? -99));
  const top = bestOverall[0];
  const wfVals = SHAPES.flatMap((sh) => FORMATS.map((f) => walkForward[sh.key][f].mean));
  const wfPlc = SHAPES.flatMap((sh) => FORMATS.map((f) => walkForwardPlacebo[sh.key][f].mean));

  /* ============================================================
     EIN TALA PER BREYTU — OG HUN ER EKKI HAMARK
     ============================================================
     `bestOverall[0]` er HAMARK yfir thusundir afbrigda og hamark er
     hvorki mat ne nidurstada — plasebo-hamarkid hér ad ofan sannar
     thad. Robusta talan er POOLED: fyrir hvert timabil er tekid
     MEDALTAL breytunnar yfir ALLA reiti (vogir x svid x form x
     lagnir), og ur theim 11 tolum kemur t og bootstrap klasad per
     timabili. Thad er EITT prof per breytu, ekki 135, og eining
     tilgatunnar er breytan — vogin, svidid og lögunin eru
     onaudsynlegar breytur (nuisance), ekki adskildar tilgatur.

     HVERS VEGNA POOLED OG EKKI BESTA REITUR: sé breytan raunveruleg
     ma hun ekki tharfnast thess ad rett vog se valin fyrirfram —
     "litil, einraen vog ofan a" er einmitt fullyrding um ad
     nakvaemt gildi vogarinnar skipti ekki mali. Se hun sonn heldur
     medaltalid.                                                     */

  /** Per-ars gildi breytu, medaltal yfir tilgreinda reiti. */
  const pooledPer = (varKey, keep = () => true) => {
    const acc = {};
    for (const y of ys) acc[y] = [];
    for (const sh of SHAPES) for (const fmt of FORMATS) for (const sc of SCOPES)
      for (const w of NONZERO) {
        if (!keep({ shape: sh.key, fmt, scope: sc.key, w })) continue;
        const per = decision[sh.key][fmt][sc.key][varKey][w].per;
        for (const y of ys) if (per[y] != null) acc[y].push(per[y]);
      }
    const out = {};
    for (const y of ys) if (acc[y].length) out[y] = mean(acc[y]);
    return out;
  };

  /* ============================================================
     SUNDURLIDUNIN SEM TVIHLIDA GRIDID GERIR MOGULEGA
     ============================================================
     Fyrsta utgafa poolsins tok MEDALTAL yfir ALLAR vogir — og thad var
     RANGT um leid og gridid vard tvihlida: fyrir einraent merki eyda
     +w og -w hvor odru og medaltalid verdur ~0 hvad sem merkid er.
     Villan var synileg i keyrslunni (oll pooled-medaltol hrundu i
     nagrenni nulls medan +w og -w baru andstaed formerki), og hun er
     verd thess ad skrifa nidur thvi hun litur ut eins og nidurstada.

     RETTA SUNDURLIDUNIN ER SAMHVERF/OSAMHVERF:

       samhverfur lidur  = ( E[w>0] + E[w<0] ) / 2
       osamhverfur lidur = ( E[w>0] - E[w<0] ) / 2

     Samhverfi lidurinn er thad sem TRUFLUNIN SJALF gerir — hann er
     eins fyrir +w og -w og er thvi ekki merki, heldur svarid vid
     "kostar thad ad hrista bordid?". Plaseboarnir bera hann lika.
     Osamhverfi lidurinn er ATTIN, og hann er eina talan sem getur
     verid merki. Hann ER lika onaemur fyrir samhverfa artefaktinu, sem
     er nakvaemlega thad sem plasebo-keyrslan fann: reitir thar sem
     hvadeina hjalpar.

     Thetta er ekki nytt hugtak i verkefninu, thad er sama hugsun og
     "talid badar leidir" i `risk-lab` (kafli 5m): maeling sem stenst
     adeins annan lid er artefakt.                                     */
  const symmetricPer = (varKey, keep = () => true) => pooledPer(varKey, keep);
  const directionalPer = (varKey, keep = () => true) => {
    const pos = pooledPer(varKey, (c) => c.w > 0 && keep(c));
    const neg = pooledPer(varKey, (c) => c.w < 0 && keep(c));
    const out = {};
    for (const y of ys) if (pos[y] != null && neg[y] != null) out[y] = (pos[y] - neg[y]) / 2;
    return out;
  };
  const statOf = (per) => {
    const v = Object.values(per);
    return { mean: r1(mean(v)), t: tOf(v), wins: v.filter((x) => x > 0).length,
      years: v.length, ci: bootSeasons(per),
      per: Object.fromEntries(Object.entries(per).map(([k, x]) => [k, r1(x)])) };
  };

  /* ---------- PLASEBO-NULLDREIFINGIN A OSAMHVERFA KVARDANUM ---------- */
  const placeboPooled = PLACEBOS.map((v) => statOf(directionalPer(v.key)));
  const placeboSym = PLACEBOS.map((v) => statOf(symmetricPer(v.key)));
  const plcMeans = placeboPooled.map((q) => q.mean);
  const plcTs = placeboPooled.map((q) => Math.abs(q.t ?? 0));
  const plcMean = mean(plcMeans);
  const plcSd = Math.sqrt(mean(plcMeans.map((x) => (x - plcMean) ** 2)) *
    plcMeans.length / Math.max(1, plcMeans.length - 1));
  const plcMaxPooledT = Math.max(...plcTs);
  /* Forspabil fyrir NYTT frækast: medaltal +- t(n-1) * sd * sqrt(1+1/n).
     Thad er retta bilid — vid erum ekki ad spyrja hvar plasebo-
     MEDALTALID liggur heldur hvort raunveruleg breyta se GREINANLEG
     fra einu plasebo-kasti. */
  const T_TAB = { 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306 };
  const tp = T_TAB[Math.max(3, Math.min(8, plcMeans.length - 1))] || 2.306;
  const plcHi = plcMean + tp * plcSd * Math.sqrt(1 + 1 / plcMeans.length);
  const plcLo = plcMean - tp * plcSd * Math.sqrt(1 + 1 / plcMeans.length);

  const perVariable = {};
  for (const v of usable) {
    const cells = [];
    for (const sh of SHAPES) for (const fmt of FORMATS) for (const sc of SCOPES)
      for (const w of NONZERO) cells.push(decision[sh.key][fmt][sc.key][v.key][w]);

    /* Einraeni yfir TVIHLIDA gridid: -0,10 -> +0,10 i tiu threpum.
       Raunverulegt merki er einraent (upp se attin jakvaed, nidur se
       hun neikvaed); suð hoppar. Talid a THVERSNIDI yfir reiti svo
       einn reitur geti ekki borid thad. */
    const byW = NONZERO.map((w) => {
      const vals = [];
      for (const sh of SHAPES) for (const fmt of FORMATS) for (const sc of SCOPES)
        vals.push(decision[sh.key][fmt][sc.key][v.key][w].mean);
      return r1(mean(vals));
    });
    let up = 0, down = 0;
    for (let i = 1; i < byW.length; i++) (byW[i] > byW[i - 1] ? up++ : down++);

    const ms = cells.map((c) => c.mean);
    const pooled = statOf(directionalPer(v.key));
    const symmetric = statOf(symmetricPer(v.key));
    const byFormat = Object.fromEntries(FORMATS.map((f) =>
      [f, statOf(directionalPer(v.key, (c) => c.fmt === f))]));
    const byShape = Object.fromEntries(SHAPES.map((sh) =>
      [sh.key, statOf(directionalPer(v.key, (c) => c.shape === sh.key))]));
    const byScope = Object.fromEntries(SCOPES.map((sc) =>
      [sc.key, statOf(directionalPer(v.key, (c) => c.scope === sc.key))]));
    const posW = statOf(pooledPer(v.key, (c) => c.w > 0));
    const negW = statOf(pooledPer(v.key, (c) => c.w < 0));
    /* ERA-SKIPTINGIN: 2021-2025 eru arin thar sem spain er Sleeper
       (99%+ radanna), 2015-2020 eru FFToday. Se merkid adeins i odrum
       theirra er thad merki um HEIMILDINA og ekki um breytuna — sama
       varnagli sem README kafli 5k setur a shape-toflurnar. */
    const dp = directionalPer(v.key);
    const subYears = (keep) => Object.fromEntries(
      Object.entries(dp).filter(([y]) => keep(Number(y))));
    const sleeperEra = statOf(subYears((y) => y >= 2021));
    const ffEra = statOf(subYears((y) => y < 2021));
    /* Osamhverfi lidurinn per STAERD vogar. Se merkid raunverulegt a
       thessi kurfa ad vaxa einraent i |w| fra ~0; sud hoppar. Thetta er
       einraeni-profid sem gildir, ekki hrái w-ferillinn (sem ber
       samhverfa artefaktid med ser). */
    const byMag = [0.02, 0.04, 0.06, 0.08, 0.10].map((m) =>
      r1(statOf(directionalPer(v.key, (c) => Math.abs(c.w) === m)).mean));
    let mUp = 0;
    for (let i = 1; i < byMag.length; i++) if (Math.abs(byMag[i]) > Math.abs(byMag[i - 1])) mUp++;

    perVariable[v.key] = {
      kind: v.kind, label: v.label,
      directional: pooled, symmetric, byFormat, byShape, byScope,
      sleeperEra, ffEra,
      positiveWeightsOnly: posW, negativeWeightsOnly: negW,
      byMagnitude: Object.fromEntries([0.02, 0.04, 0.06, 0.08, 0.10].map((m, i) => [m, byMag[i]])),
      magnitudeMonotoneSteps: mUp,
      cellMean: r1(mean(ms)), cells: ms.length,
      positiveCells: ms.filter((x) => x > 0).length,
      significantCells: cells.filter((c) => c.ci && c.ci.excludesZero && c.mean > 0).length,
      byWeight: Object.fromEntries(NONZERO.map((w, i) => [w, byW[i]])),
      monotone: `${Math.max(up, down)}/${byW.length - 1} ${up >= down ? "up" : "down"}`,
      monotoneSteps: Math.max(up, down), monotoneDir: up >= down ? "up" : "down",
      excessOverPlacebo: r1(pooled.mean - plcMean),
      outsidePlaceboInterval: pooled.mean > plcHi || pooled.mean < plcLo,
      beatsPlaceboMaxT: pooled.t != null && Math.abs(pooled.t) > plcMaxPooledT,
    };
  }
  const ranked = Object.entries(perVariable)
    .sort((a, b) => Math.abs(b[1].directional.t ?? 0) - Math.abs(a[1].directional.t ?? 0));

  console.log(`\n${"=".repeat(104)}`);
  console.log(`  EIN TALA PER BREYTU — OSAMHVERFI LIDURINN (E[w>0] - E[w<0])/2, ` +
    `pooled yfir ${NONZERO.length * SCOPES.length * FORMATS.length * SHAPES.length} reiti, t ur ${ys.length} timabilum`);
  console.log("=".repeat(104));
  const symPlc = mean(placeboSym.map((q) => q.mean));
  console.log(`   PLASEBO a sama kvarda (${PLACEBOS.length} fraekorn): osamhverft ${sgn(r1(plcMean))} · ` +
    `sd ${r1(plcSd)} · haesta |t| ${r3(plcMaxPooledT)}  ·  SAMHVERFT ${sgn(r1(symPlc))} stig`);
  console.log(`   forspabil fyrir eitt frækast: [${sgn(r1(plcLo))}, ${sgn(r1(plcHi))}] stig ` +
    `— breyta INNAN thess er ekki greinanleg fra suði`);
  console.log(`   ${"breyta".padEnd(20)}${"kind".padEnd(12)}${"osamhv".padStart(8)}${"t".padStart(8)}` +
    `${"ar".padStart(7)}${"95% CI".padStart(18)}${"utan plsb".padStart(11)}${"samhv".padStart(8)}  |w|-einraeni`);
  for (const [k, q] of ranked) {
    console.log(`   ${k.padEnd(20)}${q.kind.padEnd(12)}${sgn(q.directional.mean).padStart(8)}` +
      `${String(q.directional.t).padStart(8)}${(q.directional.wins + "/" + q.directional.years).padStart(7)}` +
      `${`[${sgn(q.directional.ci.lo)}, ${sgn(q.directional.ci.hi)}]`.padStart(18)}` +
      `${(q.outsidePlaceboInterval ? "JA" : "nei").padStart(11)}` +
      `${sgn(q.symmetric.mean).padStart(8)}  ${q.magnitudeMonotoneSteps}/4  ` +
      `${Object.values(q.byMagnitude).map((x) => sgn(x)).join(" ")}`);
  }
  console.log(`\n   heimildaskiptingin — er merkid i BADUM spaheimildum?`);
  console.log(`   ${"breyta".padEnd(20)}${"fftoday 2015-20".padStart(22)}${"sleeper 2021-25".padStart(22)}`);
  for (const [k, q] of ranked) {
    console.log(`   ${k.padEnd(20)}` +
      `${(sgn(q.ffEra.mean) + " (" + q.ffEra.wins + "/" + q.ffEra.years + ", t=" + q.ffEra.t + ")").padStart(22)}` +
      `${(sgn(q.sleeperEra.mean) + " (" + q.sleeperEra.wins + "/" + q.sleeperEra.years + ", t=" + q.sleeperEra.t + ")").padStart(22)}`);
  }

  console.log(`\n   attin — pooled per formerki vogar ("meira er betra" a moti "fadaðu thann")`);
  console.log(`   ${"breyta".padEnd(20)}${"w > 0".padStart(20)}${"w < 0".padStart(20)}`);
  for (const [k, q] of ranked) {
    console.log(`   ${k.padEnd(20)}${(sgn(q.positiveWeightsOnly.mean) + " (t=" +
      q.positiveWeightsOnly.t + ")").padStart(20)}` +
      `${(sgn(q.negativeWeightsOnly.mean) + " (t=" + q.negativeWeightsOnly.t + ")").padStart(20)}`);
  }

  /* ============================================================
     KJARNATILGATAN, POOLED — ER MERKID STERKARA I PPR EN I STANDARD?
     ============================================================
     Reita-taflan hér ad ofan svarar thessu i STOKUM reit og er thvi
     hávaði. Retta profid er PORAD per timabili a OSAMHVERFA lidnum:
     somu ar, somu leikmenn, sama vog, sama logun — adeins stigagjofin
     er onnur. Mottaka er taekifaeri sem TELUR STIG i PPR (1,0) og
     nanast ekkert i standard, svo se merkid raunverulega "taekifaeri"
     aetti thad ad vera STAERRA i PPR og half ad liggja MILLI.         */
  const formatContrastPooled = {};
  for (const v of usable) {
    formatContrastPooled[v.key] = {};
    for (const [a, b] of [["ppr", "standard"], ["ppr", "half"], ["half", "standard"]]) {
      const A = directionalPer(v.key, (c) => c.fmt === a);
      const B = directionalPer(v.key, (c) => c.fmt === b);
      const per = {};
      for (const y of ys) if (A[y] != null && B[y] != null) per[y] = A[y] - B[y];
      formatContrastPooled[v.key][`${a}-${b}`] = statOf(per);
    }
  }
  console.log(`\n${"=".repeat(104)}`);
  console.log("  KJARNATILGATAN, POOLED: er osamhverfa merkid staerra i PPR en i STANDARD?");
  console.log("=".repeat(104));
  console.log(`   ${"breyta".padEnd(20)}${"ppr".padStart(9)}${"half".padStart(9)}${"std".padStart(9)}` +
    `${"ppr-std".padStart(10)}${"t".padStart(8)}${"ar".padStart(7)}${"95% CI".padStart(18)}  rod ppr>half>std?`);
  for (const [k, q] of ranked) {
    const c = formatContrastPooled[k]["ppr-standard"];
    const P = q.byFormat.ppr.mean, H = q.byFormat.half.mean, S = q.byFormat.standard.mean;
    console.log(`   ${k.padEnd(20)}${sgn(P).padStart(9)}${sgn(H).padStart(9)}${sgn(S).padStart(9)}` +
      `${sgn(c.mean).padStart(10)}${String(c.t).padStart(8)}${(c.wins + "/" + c.years).padStart(7)}` +
      `${`[${sgn(c.ci.lo)}, ${sgn(c.ci.hi)}]`.padStart(18)}  ${P > H && H > S ? "JA" : "nei"}`);
  }
  const ordered = ranked.filter(([, q]) =>
    q.byFormat.ppr.mean > q.byFormat.half.mean && q.byFormat.half.mean > q.byFormat.standard.mean);
  const pprBigger = ranked.filter(([, q]) => q.byFormat.ppr.mean > q.byFormat.standard.mean);
  const pprSig = ranked.filter(([k]) => formatContrastPooled[k]["ppr-standard"].ci &&
    formatContrastPooled[k]["ppr-standard"].ci.excludesZero);
  /* OG PLASEBOARNIR FARA GEGNUM SAMA KONTRAST. Breyta sem ber ekkert
     merki hefur EKKERT formadamun heldur, svo hlutfall "marktaekra"
     kontrasta hjá theim er falspositifu-tidnin i thessu profi. An
     hennar les "4 af 11 marktaek" eins og nidurstada. */
  const plcContrast = PLACEBOS.map((v) => {
    const A = directionalPer(v.key, (c) => c.fmt === "ppr");
    const B = directionalPer(v.key, (c) => c.fmt === "standard");
    const per = {};
    for (const y of ys) if (A[y] != null && B[y] != null) per[y] = A[y] - B[y];
    return statOf(per);
  });
  const plcContrastSig = plcContrast.filter((q) => q.ci && q.ci.excludesZero).length;
  console.log(`\n   ppr > standard hjá ${pprBigger.length}/${ranked.length} breytum ` +
    `(tekna-prof p = ${r3(binomTail(pprBigger.length, ranked.length))})`);
  console.log(`   full rod ppr > half > standard hjá ${ordered.length}/${ranked.length}` +
    `  ·  ppr-std marktaekt (CI utilokar null) hjá ${pprSig.length}/${ranked.length}`);
  console.log(`   PLASEBO: ppr-std marktaekt hjá ${plcContrastSig}/${PLACEBOS.length} ` +
    `— falspositifu-tidni thessa profs`);

  /* ============================================================
     MAGN GEGN NYTNI — HLIDSTAEDA VID xGI GEGN xG
     ============================================================
     FPL-verkefnid maeldi ad magnlidurinn i mó eigi ad vera xGI og ekki
     xG: markmidid inniheldur assist, svo MAGN slaer NYTNI. Hlidstaedan
     hér er "taekifaeri slaer nytni". Profad a osamhverfa lidnum,
     medaltal per timabili yfir ALLAR breytur i hverjum flokki, svo
     einstok breyta geti ekki borid flokkinn.                          */
  const kindPer = (kind, keep = () => true) => {
    const vs = usable.filter((v) => v.kind === kind);
    if (!vs.length) return {};
    const pers = vs.map((v) => directionalPer(v.key, keep));
    const out = {};
    for (const y of ys) {
      const vals = pers.map((q) => q[y]).filter((x) => x != null);
      if (vals.length) out[y] = mean(vals);
    }
    return out;
  };
  const KINDS = ["volume", "efficiency", "context", "trend"];
  const volumeVsEfficiency = {
    overall: Object.fromEntries(KINDS.map((k) => [k, statOf(kindPer(k))])),
    byFormat: Object.fromEntries(FORMATS.map((f) =>
      [f, Object.fromEntries(KINDS.map((k) => [k, statOf(kindPer(k, (c) => c.fmt === f))]))])),
    byScope: Object.fromEntries(SCOPES.map((sc) =>
      [sc.key, Object.fromEntries(KINDS.map((k) => [k, statOf(kindPer(k, (c) => c.scope === sc.key))]))])),
    volumeMinusEfficiency: (() => {
      const A = kindPer("volume"), B = kindPer("efficiency"), per = {};
      for (const y of ys) if (A[y] != null && B[y] != null) per[y] = A[y] - B[y];
      return statOf(per);
    })(),
  };
  console.log(`\n${"=".repeat(104)}`);
  console.log("  MAGN GEGN NYTNI (osamhverfi lidurinn, medaltal breytna i hverjum flokki)");
  console.log("=".repeat(104));
  console.log(`   ${"flokkur".padEnd(12)}${"stig".padStart(8)}${"t".padStart(8)}${"ar".padStart(7)}` +
    `${"95% CI".padStart(18)}${"ppr".padStart(9)}${"half".padStart(9)}${"std".padStart(9)}` +
    `${"top50".padStart(9)}`);
  for (const k of KINDS) {
    const q = volumeVsEfficiency.overall[k];
    /* FLOKKUR GETUR VERID TOMUR — `--only` (eda `--extra` med adeins
       nyjum breytum) skilur t.d. "volume" eftir an breytu, og tha er
       `statOf` null. Prenta thad BERUM ORDUM; tom lina hér vaeri lesin
       eins og maeling upp a null. */
    if (!q || !q.ci) { console.log(`   ${k.padEnd(12)}${"engin breyta i thessum flokki".padStart(30)}`); continue; }
    console.log(`   ${k.padEnd(12)}${sgn(q.mean).padStart(8)}${String(q.t).padStart(8)}` +
      `${(q.wins + "/" + q.years).padStart(7)}${`[${sgn(q.ci.lo)}, ${sgn(q.ci.hi)}]`.padStart(18)}` +
      `${sgn(volumeVsEfficiency.byFormat.ppr[k].mean).padStart(9)}` +
      `${sgn(volumeVsEfficiency.byFormat.half[k].mean).padStart(9)}` +
      `${sgn(volumeVsEfficiency.byFormat.standard[k].mean).padStart(9)}` +
      `${sgn(volumeVsEfficiency.byScope.top50[k].mean).padStart(9)}`);
  }
  const vme = volumeVsEfficiency.volumeMinusEfficiency;
  if (!vme || !vme.ci) {
    console.log(`   magn - nytni: OMAELT (annar flokkurinn ber enga breytu i thessari keyrslu)`);
  } else {
    console.log(`   magn - nytni: ${sgn(vme.mean)} stig, t=${vme.t}, ${vme.wins}/${vme.years} ar, ` +
      `95% [${sgn(vme.ci.lo)}, ${sgn(vme.ci.hi)}]  -> ` +
      `${vme.ci && vme.ci.excludesZero ? (vme.mean > 0 ? "MAGN SLAER NYTNI" : "NYTNI SLAER MAGN")
        : "ekki greinanlegt"}`);
  }

  console.log(`\n${"=".repeat(104)}`);
  console.log("  NIDURSTADA");
  console.log("=".repeat(100));
  console.log(`  ${tried} afbrigdi profud (${usable.length} breytur x ${NONZERO.length} vogir x ` +
    `${SCOPES.length} svid x ${FORMATS.length} form x ${SHAPES.length} logun),`);
  console.log(`  auk ${PLACEBOS.length * NONZERO.length * SCOPES.length * FORMATS.length * SHAPES.length}` +
    ` plasebo-afbrigda sem eru NULLDREIFINGIN, ekki tilgatur.`);
  const plcMaxT = Math.max(...Object.values(placeboRef).map((q) => q.maxAbsT));
  const plcCellMax = Math.max(...Object.values(placeboRef).map((q) => q.max));
  console.log(`  haesta t i STOKUM reit: ${top.key} w=${top.w} ${top.scope} · ${top.shape}/${top.fmt}` +
    ` -> ${sgn(top.mean)} stig, t=${top.t}`);
  console.log(`  haesta t i stokum reit hjá PLASEBO: ${r3(plcMaxT)} (haesta stig ${sgn(plcCellMax)})` +
    ` — SAMI VEL, ekkert merki. Thess vegna er stakur reitur ekki maelikvardi.`);
  console.log(`  walk-forward: ${wfVals.filter((x) => x > 0).length}/${wfVals.length} ` +
    `frumur jakvaedar, medaltal ${sgn(r1(mean(wfVals)))} stig` +
    `  ·  PLASEBO ${wfPlc.filter((x) => x > 0).length}/${wfPlc.length}, ${sgn(r1(mean(wfPlc)))} stig`);

  /* ============================================================
     SKILYRDIN — FJOGUR, OG THAU ERU SETT AF ROKUM SEM ERU SKRIFUD
     ============================================================
     Eitt skilyrdi er ekki nog og "besti reitur" er EKKI skilyrdi —
     plasebo-hamarkid ad ofan sannar ad thad maelir leitina og ekki
     merkid. Breyta vinnur adeins ef:

       C1 MERKID: pooled bootstrap-vikmork (klasad per timabili)
          utiloka null OG pooled |t| slaer HAESTA pooled |t| sem
          plaseboarnir na. Sidara er EMPIRISK familywise-mork —
          engin t-tafla, engin Bonferroni-nalgun, heldur sama vél
          med ekkert merki i.
       C2 EKKI SUD: pooled medaltal er utan forspabils plaseboanna.
       C3 LOGUNIN: osamhverfi lidurinn vex einraent i |w| (>=3 af 4
          threpum) og er staerri vid fulla vog en vid minnstu. Vog sem
          hoppar er ekki "litil einraen vog", hvad sem medaltalid segir.
       C4 UT FYRIR URTAK: walk-forward-val slaer walk-forward
          plaseboans. Thad er eina talan sem eydir engum frigradum.

     C2 og C4 eru thau sem `board-lab` vantadi. Their eru astaedan til
     ad thessi maeling getur sagt "nei" MED ROKUM og ekki adeins
     "t var ekki nogu hatt".                                          */
  const wfBeatsPlacebo = mean(wfVals) > mean(wfPlc) &&
    wfVals.filter((x) => x > 0).length > wfVals.length / 2;
  const conditions = {};
  for (const [k, q] of ranked) {
    conditions[k] = {
      C1_signal: !!(q.directional.ci && q.directional.ci.excludesZero) && q.beatsPlaceboMaxT,
      C2_notNoise: q.outsidePlaceboInterval,
      C3_shape: q.magnitudeMonotoneSteps >= 3 &&
        Math.abs(q.directional.mean) > Math.abs(q.byMagnitude[0.02]),
      C4_outOfSample: wfBeatsPlacebo,
    };
    conditions[k].all = Object.values(conditions[k]).every(Boolean);
  }
  const winners = ranked.filter(([k]) => conditions[k].all);

  console.log(`\n  SKILYRDIN`);
  console.log(`   ${"breyta".padEnd(20)}${"C1 merki".padStart(10)}${"C2 ekki sud".padStart(13)}` +
    `${"C3 logun".padStart(10)}${"C4 walk-fwd".padStart(13)}${"OLL".padStart(6)}`);
  for (const [k] of ranked) {
    const c = conditions[k];
    const m = (b) => (b ? "ja" : "nei");
    console.log(`   ${k.padEnd(20)}${m(c.C1_signal).padStart(10)}${m(c.C2_notNoise).padStart(13)}` +
      `${m(c.C3_shape).padStart(10)}${m(c.C4_outOfSample).padStart(13)}${m(c.all).padStart(6)}`);
  }

  const verdict = winners.length
    ? `OPPORTUNITY EARNS A SMALL WEIGHT — ${winners.map(([k]) => k).join(", ")}. ` +
      `Pooled over all ${NONZERO.length * SCOPES.length * FORMATS.length * SHAPES.length} cells ` +
      `(one test per variable, t from ${ys.length} seasons), ` +
      winners.map(([k, q]) => `${k}: antisymmetric ${q.directional.mean > 0 ? "+" : ""}` +
        `${q.directional.mean} points per unit of the weight grid ` +
        `(t=${q.directional.t}, ${q.directional.wins}/${q.directional.years} seasons, ` +
        `95% CI [${q.directional.ci.lo}, ${q.directional.ci.hi}], ` +
        `monotone in |w| ${q.magnitudeMonotoneSteps}/4, direction ` +
        `${q.directional.mean > 0 ? "MORE is better" : "LESS is better — fade last season's volume"})`).join("; ") +
      `. All four pre-set conditions hold: the pooled CI excludes zero and the pooled |t| beats ` +
      `the largest pooled |t| any of ${PLACEBOS.length} placebo noise variables reaches through ` +
      `the identical grid; the pooled mean is outside the placebo prediction interval; the ` +
      `weight curve is monotone across the two-sided grid; and walk-forward selection beats ` +
      `placebo walk-forward. NOTHING IS WIRED INTO src/ ON THIS EVIDENCE — see README 5b on the ` +
      `variant that gained +109 and was still rejected because the search chose it, and 5h on ` +
      `age winning the raw search 4/4 and failing walk-forward 4/4.`
    : `OPPORTUNITY DOES NOT EARN A WEIGHT. The null hypothesis (w = 0, the current VBD board) ` +
      `survives: of ${tried} variants, not one variable clears all four pre-set conditions. The ` +
      `decisive instrument is the placebo family — ${PLACEBOS.length} meaningless noise variables ` +
      `pushed through the identical grid, which reach a single-cell max |t| of ${r3(plcMaxT)} and ` +
      `${r1(plcCellMax)} points. A "positive and significant" cell is what noise looks like here, ` +
      `so the per-cell table is a search and not a result. Same outcome as board-lab.mjs (ADP, ` +
      `ECR, durability, age, team offence) and first4-lab.mjs (the strongest residual correlation ` +
      `in feature-probe). Correlation in a table is a hypothesis, not a result.`;

  await mkdir(path.join(OUT, "measure"), { recursive: true });
  /* ---------- STAERD SKRARINNAR ER AKVORDUN ----------
     `JSON.stringify(x, null, 1)` setur HVERT FYLKISSTAK a sina linu, svo
     5.130 reitir x 11 timabil urdu 4 MB af hvitu rymi. Lausnin er ekki
     ad henda gognunum heldur ad thjappa EINA blokkina sem er stor og
     lesin af vel, medan allt sem manneskja les helst inndregid. */
  const BIG = "__TIER_B__";
  const compactDecision = () => {
    const out = {};
    for (const sh of SHAPES) {
      out[sh.key] = {};
      for (const fmt of FORMATS) {
        out[sh.key][fmt] = {};
        for (const sc of SCOPES) {
          out[sh.key][fmt][sc.key] = {};
          for (const v of gridVars) {
            out[sh.key][fmt][sc.key][v.key] = {};
            for (const w of NONZERO) {
              const c = decision[sh.key][fmt][sc.key][v.key][w];
              out[sh.key][fmt][sc.key][v.key][w] = {
                mean: c.mean, t: c.t, wins: c.wins,
                ci: c.ci ? [c.ci.lo, c.ci.hi] : null,
                per: ys.map((y) => (c.per[y] == null ? null : c.per[y])),
              };
            }
          }
        }
      }
    }
    return out;
  };
  const payloadText = JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({
      argv: process.argv.slice(2),
      defaults: { runs: 4, from: 2015, boot: 1000, extra: null, only: null, out: "opp.json" },
      resolved: {
        runs: RUNS, boot: BOOT, weights: WEIGHTS,
        scopes: SCOPES.map((s) => s.key), formats: FORMATS,
        shapes: SHAPES.map((s) => s.key),
        variables: VARS.map((v) => `${v.key}:${v.kind}`),
        placebos: PLACEBOS.map((v) => v.key),
        placeboRole: "four deterministic-noise variables through the identical grid — they " +
                     "are the null DISTRIBUTION, not hypotheses, and are excluded from the " +
                     "degrees-of-freedom count for that reason",
        overlay: "rank(zPool(vbd) + w * zWithinPos(feature)) — core coefficient stays 1, never refit",
        orderEquivalence: "additive w == blend w/(1+w); 0..0.10 == blend 0..0.0909",
        zScope: "feature z is WITHIN POSITION; pool-wide z would measure position mix, not ranking",
        halfIsExact: "half = (ppr + standard) / 2, algebra",
        halfAdp: "historical half-PPR ADP does not exist; ppr-ADP is the field, std-ADP measured as a bound",
        clustering: "Tier A bootstrap clusters on PLAYER; Tier B clusters on SEASON (a draft outcome has no per-player decomposition)",
        projection: "sleeperProj when present, else ffProj (same rule as half-lab)",
        trendSource: `nflverse stats_player_week, ${trend.okYears}/${years.length} seasons read`,
      },
      inputs: EXTRA_FILE ? ["features.json", `measure/${EXTRA_FILE}`] : ["features.json"],
      dataDir: OUT,
    }),
    /* Fingrafar a `--extra`-skranni fylgir MED, ekki i stad. Vaeri thad
       ekki hér gaeti tvaer keyrslur med somu vidfong en OLIKA
       inntaksskra litid samanburdarhaefar ut — nakvaemlega villan sem
       `provenance.mjs` var skrifad til ad utiloka. */
    extraInputs: extraMeta,
    seasons: ys, pairing: { paired, unpaired },
    poolSize: Object.fromEntries(ys.map((y) => [y, pools[y].length])),
    coverage, leakGate, leakGateFailures: leakFail,
    nullCheck,
    degreesOfFreedom: {
      variants: tried, variables: usable.length, weights: NONZERO.length,
      scopes: SCOPES.length, formats: FORMATS.length, shapes: SHAPES.length,
      seasons: ys.length,
      tCrit, correctedT: r3(bonf),
      correctedTNote: "board-lab.mjs's Bonferroni-like formula, reported for comparability " +
        "only. It is NOT a condition here: with this many variants it demands |t| > 5 from an " +
        "11-season mean, which no real effect of this size could ever reach, so it would fail " +
        "everything and therefore measure nothing. The placebo family replaces it with a " +
        "measured family-wise threshold.",
      note: "The reported walk-forward number spends none of these on hindsight: " +
            "variable, weight and scope are chosen on prior seasons only. The negative half of " +
            "the weight grid was added AFTER Tier A showed every volume variable correlating " +
            "NEGATIVELY with the projection residual — that is a data-dependent widening of the " +
            "search and it is counted in `variants` for exactly that reason.",
    },
    tierA_signal: tierA,
    /* ---------- THJAPPAD SNID A REITUNUM ----------
       5.130 reitir x 11 timabil er audvelt ad skrifa svo ad skran verdi
       4 MB, og hun VAR thad: `per` sem hlutur med arstolum sem lykla og
       `ci` sem hlutur med threm sviðum eru ~60% hvitt rymi. Hér er
       `per` FYLKI i somu rod og `seasons`, og `ci` er [lo, hi]. Ekkert
       tapast — `perSeasonOrder` segir rodina — og skran helmingast.
       Astaedan er su sama og "ein rod per skot, ekki thrjar" i
       FPL-verkefninu: staerd er ekki bara staerd. */
    perSeasonOrder: ys,
    tierB_decision: BIG,

    placeboReference: placeboRef,
    placeboPooled: {
      metric: "antisymmetric component (E[w>0] - E[w<0]) / 2, pooled over all cells",
      perSeed: placeboPooled.map((q, i) => ({ seed: i + 1, mean: q.mean, t: q.t,
        wins: q.wins, years: q.years, symmetric: placeboSym[i].mean })),
      mean: r1(plcMean), sd: r1(plcSd), maxAbsPooledT: r3(plcMaxPooledT),
      predictionInterval: [r1(plcLo), r1(plcHi)],
      note: "the null DISTRIBUTION of this measurement. A real variable must beat this, not zero.",
    },
    perVariable, conditions,
    walkForward, walkForwardPlacebo,
    /* `formatContrast` (per stakan reit) er EKKI vistad — thad er
       einfoldur mismunur a `per`-tolum sem thegar eru i
       `tierB_decision`, svo thad vaeri 200 KB af AFLEIDDUM gognum.
       Taflan er prentud i keyrslunni og pooled-utgafan (sem er
       nidurstadan) er hér. Sama regla og "sömu gögn thrivegis er ekki
       bara staerd heldur haetta" i FPL-verkefninu. */
    formatContrastPooled,
    coreHypothesis: {
      question: "Is the signal stronger in PPR than in standard? Receptions are opportunity " +
        "that scores 1.0 in PPR and ~0 in standard, so a genuine reception-opportunity effect " +
        "should be larger in PPR, with half between.",
      metric: "antisymmetric component per format, paired per season",
      pprGreaterThanStandard: `${pprBigger.length}/${ranked.length}`,
      signTestP: r3(binomTail(pprBigger.length, ranked.length)),
      fullOrderingPprHalfStandard: `${ordered.length}/${ranked.length}`,
      contrastsExcludingZero: `${pprSig.length}/${ranked.length}`,
      variablesWithSignificantContrast: pprSig.map(([k]) => k),
      placeboContrastsExcludingZero: `${plcContrastSig}/${PLACEBOS.length}`,
      placeboContrasts: plcContrast.map((q, i) => ({ seed: i + 1, mean: q.mean, t: q.t })),
    },
    volumeVsEfficiency,
    adpBounds,
    best: bestOverall.slice(0, 20),
    verdict,
  }, null, 1).replace(`"${BIG}"`, JSON.stringify(compactDecision()));
  await writeFile(path.join(OUT, "measure", OUT_FILE), payloadText);
  console.log(`\n-> data/measure/${OUT_FILE} (${(payloadText.length / 1e6).toFixed(2)} MB)`);
  console.log(`\n  ${verdict}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
