/* ============================================================
   BSD — NYJA GAGNAHEIMILDIN (sports.bzzoiro.com), 8.8.2026

   Safnid les COMMITTAD `data/bsd_players.json` og kallar EKKI ut —
   sama regla og oll onnur sofn nema `euro-congestion.mjs` (6k).

   ThRIR VERDIR SEM EIGA AD FELLA, hver um sig af maeldri astaedu:

   1. DAUD SVID. `big_chance_created`, `big_chance_missed`,
      `expected_goals_on_target`, `goals_prevented` og ~20 onnur eru TIL
      i BSD-svarinu, eru 100% non-null og ERU ALLTAF NULL. Handoff №5 §B2
      lagdi til ad byggja "big chances" beint a theim — thad hefdi sent
      dalk af nullum sem LITUR UT EINS OG MAELING. Vordurinn fellur ef
      eitthvad theirra ratar i skrana.

   2. VORPUNIN. Fuzzy nafnapörun felldi Man United inn i Man City og
      vixladi Jacob/Alex Murphy (NEW). Thogul RONG pörun er verri en
      engin, svo hér er borid vid FPL-tolur sem VID EIGUM SJALFSTAETT
      (`season_baseline.json`, sama timabil): mork og minutur verda ad
      stemma. Thetta er sama tegund vardar og "value_season == stig/verd
      a ollum 563 raungognum" (6f).

   3. MAELDU FASTARNIR. `big_chance_xg` og `in_box_x` eru FITTADIR, ekki
      valdir. Ef einhver breytir theim an nyrrar maelingar a thad ad
      sjast: skrain ber tolurnar og prófid neglir thaer.
   ============================================================ */
import { readFileSync } from "node:fs";
import { STAT_DEFS, STAT_BY_KEY } from "../src/stats.js";

const ROOT = new URL("../", import.meta.url).pathname;
const read = f => JSON.parse(readFileSync(ROOT + f, "utf8"));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); }
                       else { fail++; console.log("  ✗ " + m); } };
const H = t => { console.log(`\n${"─".repeat(84)}\n${t}\n${"─".repeat(84)}`); };

let F = null;
try { F = read("data/bsd_players.json"); } catch { /* skrain ma vanta */ }

/* ---------- 0. SKRAIN ---------- */
H("0. SKRAIN");
if (!F) {
  console.log("  data/bsd_players.json vantar — safnid er sleppt (skrain er");
  console.log("  skrifud handvirkt med scripts/fetch-bsd.mjs).");
console.log(`\nBSD: ${pass} stodust, ${fail} féllu`);
  process.exit(0);
}
const P = F.players || [];
ok(F.source === "bsd_v2", `heimild merkt (${F.source})`);
ok(F.season === "2025/26", `timabil merkt (${F.season})`);
ok(F.matches === 380, `380 leikir lesnir (${F.matches})`);
ok(P.length > 300, `leikmenn i skra: ${P.length}`);
ok(typeof F.note === "string" && F.note.length > 200,
   "skrain ber nótu sem utskyrir hvad er LEITT UT og hvad er maelt");

/* ---------- 1. DAUD SVID MEGA ALDREI RATA INN ---------- */
H("1. DAUD SVID (maeld 8.8.2026 — alltaf null i BSD)");
const DEAD = [
  "big_chance_created", "big_chance_missed", "expected_goals_on_target",
  "goals_prevented", "keeper_save_value", "ball_carries_count",
  "progressive_ball_carries_count", "total_progression", "outfielder_block",
  "error_lead_to_a_shot", "error_lead_to_a_goal", "hit_woodwork", "high_claims",
  "last_man_tackle", "clearance_off_line", "total_offside", "challenge_lost",
  "unsuccessful_touch", "saved_shots_from_inside_the_box",
  "accurate_keeper_sweeper", "total_keeper_sweeper",
];
const keys = new Set();
for (const p of P) for (const k of Object.keys(p)) keys.add(k);
const leaked = DEAD.filter(d => keys.has(d));
ok(leaked.length === 0,
   `ekkert dautt svid i skranni${leaked.length ? ": " + leaked.join(", ") : ""}`);

/* Og enginn dalkur ma vera EINS OG ThAU: alltaf sama gildid hja ollum.
   Thad er einkennid sem gerdi big_chance_created ONYTAN — svid sem er
   til, er non-null og segir ekkert.                                    */
const NUMF = ["xg", "shots", "big_chances", "shots_in_box", "key_pass", "crosses",
              "touches", "tackles", "interceptions", "clearances", "blocks",
              "aerial_won", "rating", "dribbles_won", "was_fouled",
              "sp_xg", "op_xg", "head_xg", "head_shots", "woodwork", "sp_xg_share", "np_xg"];
const flat = [];
for (const f of NUMF) {
  const vals = P.map(p => p[f]).filter(v => v != null);
  const distinct = new Set(vals).size;
  if (vals.length && distinct <= 1) flat.push(f);
}
ok(flat.length === 0,
   `hvert birt svid hefur RAUNVERULEGA dreifingu${flat.length ? " — flatt: " + flat.join(", ") : ""}`);

/* ---------- 2. MAELDU FASTARNIR ---------- */
H("2. MAELDIR FASTAR (fittadir, ekki valdir)");
ok(F.measured?.big_chance_xg === 0.18,
   `big_chance_xg = 0,18 — fittad a 748 lid-leikjum (MAE 0,746; 0,35 gaf 1,385)`);
ok(F.measured?.in_box_x === 17,
   `in_box_x = 17 — fittad a 760 lid-leikjum (MAE 0,133)`);
/* ESPN-kvardinn (halfur vollur -> 31,4) var UTILOKADUR med MAE 4,079.
   Ef einhver "samraemir" thetta vid ESPN-regluna fellur thetta.        */
ok(F.measured?.in_box_x < 25,
   "teig-throskuldurinn er a 105 m kvarda (BSD), EKKI ESPN-kvardanum (31,4)");

/* ---------- 3. VORPUNIN GEGN OKKAR EIGIN TOLUM ---------- */
H("3. VORPUN VID FPL — borid vid season_baseline.json");
let base = null;
try { base = read("data/season_baseline.json"); } catch {}
if (!base || base.label !== "2025/26") {
  ok(false, "season_baseline.json er a 2025/26 svo hægt se ad bera saman");
} else {
  const B = new Map((base.players || []).map(p => [p.id, p]));
  const paired = P.filter(p => p.fpl_id != null && B.has(p.fpl_id));
  ok(paired.length > 300, `pöruð pör til samanburdar: ${paired.length}`);

  let exact = 0, badMin = 0;
  for (const p of paired) {
    const b = B.get(p.fpl_id);
    if ((p.goals ?? 0) === b.goals_scored) exact++;
    if (Math.abs((p.minutes ?? 0) - b.minutes) > 300) badMin++;
  }
  const pct = 100 * exact / paired.length;
  ok(pct >= 97, `mork stemma nakvaemlega vid FPL i ${pct.toFixed(1)}% tilvika (>=97%)`);
  /* ThETTA ER VORDURINN SEM FANN VIXLID: Jacob/Alex Murphy og Gabriel
     Martinelli/Gabriel voru RANGT pörud og minutur skildu ad.          */
  ok(badMin === 0,
     `engin pörun thar sem minutur skeikar >300 (vixlud nofn)${badMin ? ` — ${badMin} fundust` : ""}`);

  /* NAFNID SJALFT ER STERKASTI VORDURINN.
     Minutu- og marka-throskuldarnir hér ad ofan SLEPPTU vixli milli
     tveggja manna sem spila jafn mikid — profad med stokkbreytingu og
     hun lifdi af. Rett pörun DEILIR ALLTAF takni (eftirnafni) med
     FPL-nafninu, svo thetta fellur a hvaða vixli sem er.              */
  let fplPl = null;
  try {
    const raw = read("data/players.json");
    fplPl = Array.isArray(raw) ? raw : (raw.players || []);
  } catch {}
  if (!fplPl) ok(false, "players.json lesin til nafna-samanburdar");
  else {
    const byId = new Map(fplPl.map(p => [p.id, p]));
    const TR = { "ß":"ss", "ı":"i", "ø":"o", "đ":"d", "ð":"d", "þ":"th", "æ":"ae", "œ":"oe", "ł":"l" };
    const toks = s => {
      let t = String(s || "").toLowerCase();
      for (const [a, b] of Object.entries(TR)) t = t.split(a).join(b);
      return t.normalize("NFD").replace(/[̀-ͯ]/g, "")
              .replace(/[^a-z ]/g, " ").split(/\s+/).filter(w => w.length > 1);
    };
    const noShare = [];
    for (const p of paired) {
      const f = byId.get(p.fpl_id);
      if (!f) continue;
      const a = new Set(toks(p.name));
      const b = toks(`${f.first_name || ""} ${f.second_name || ""} ${f.web_name || ""}`);
      if (!b.some(t => a.has(t))) noShare.push(`${p.name}→${f.web_name}`);
    }
    ok(noShare.length === 0,
       `hver pörun deilir nafni med FPL-manninum${noShare.length ? ` — ${noShare.length} gera thad ekki: ` + noShare.slice(0, 5).join(", ") : ""}`);
  }

  /* fpl_id verdur ad vera EINKVAEMT — tveir BSD-menn a sama FPL-manni
     thydir ad eitt-a-eitt pörunin brast.                              */
  const ids = P.map(p => p.fpl_id).filter(v => v != null);
  ok(new Set(ids).size === ids.length, "hvert fpl_id kemur fyrir EINU SINNI (eitt-a-eitt)");
  ok(P.every(p => p.fpl_id != null), "hver rod i skranni er poruð (oparadir eru ekki sendir)");
  ok(P.every(p => p.code != null), "hver rod ber `code` — sogulegu gognin eru lyklud a thad");
}

/* ---------- 4. NULL ER EKKI NULL ---------- */
H("4. NULL ER EKKI NULL");
/* Leikmadur sem skaut ALDREI a ad hafa null i skot-svidunum, ekki 0:
   "hann skaut ekki" og "hann er ekki i gognunum" mega ekki lita eins ut. */
const noShots = P.filter(p => !p.shots);
ok(noShots.every(p => p.xg == null && p.big_chances == null),
   `leikmenn an skota fa null i xG/big chances, ekki 0 (${noShots.length} menn)`);
ok(P.every(p => p.minutes == null || typeof p.minutes === "number"),
   "minutur eru tala eda null");

/* ---------- 5. DALKARNIR I APPINU ---------- */
H("5. DALKAR — STAT_DEFS");
const BSD_COLS = STAT_DEFS.filter(d => d.key.startsWith("bsd_"));
ok(BSD_COLS.length >= 15, `BSD-dalkar skradir: ${BSD_COLS.length}`);
ok(BSD_COLS.every(d => typeof d.note === "string" && d.note.length >= 12),
   "hver BSD-dalkur ber `note` (tooltip) — skylda skv. 6r");
ok(BSD_COLS.every(d => (d.short ?? d.label).length <= 12),
   "hvert haus-heiti er <=12 stafir (haus-vordurinn i 6r)");
ok(BSD_COLS.every(d => STAT_BY_KEY[d.key]),
   "hver BSD-dalkur er i STAT_BY_KEY");
/* Bond verda ad vera SAMFELLD — band sem klofnar setur hausinn ur
   samhengi vid tolurnar undir honum (6r).                            */
{
  const seq = STAT_DEFS.map(d => `${d.group}|${d.band}`);
  const seen = new Set(); const split = [];
  let prev = null;
  for (const s of seq) {
    if (s !== prev) { if (seen.has(s)) split.push(s); seen.add(s); prev = s; }
  }
  ok(split.length === 0, `hvert band er samfellt${split.length ? ": " + split.join(", ") : ""}`);
}
/* Hver `get()` verdur ad thola TOM inntok — sama krafa og a alla hina. */
{
  const bad = [];
  for (const d of BSD_COLS) {
    for (const inp of [{}, { _b_shots: null }, null]) {
      try { d.get(inp || {}); } catch { bad.push(d.key); break; }
    }
  }
  ok(bad.length === 0, `hver BSD-get() tholir tom inntok${bad.length ? ": " + bad.join(", ") : ""}`);
}
/* Dalkarnir mega EKKI vera live_only: their FYLGJA voldu timabili
   (birtast adeins a 2025/26). live_only thydir "fylgir EKKI timabilinu"
   og vaeri thvi rangt merki (6i).                                     */
ok(BSD_COLS.every(d => !d.live_only),
   "BSD-dalkar eru EKKI live_only — their fylgja voldu timabili");

/* ---------- 6. TOLURNAR ERU TRUVERDUGAR ---------- */
H("6. HEILBRIGDISPROF A TOLUNUM");
const withShots = P.filter(p => p.shots > 0);
ok(withShots.every(p => p.big_chances <= p.shots),
   "big chances geta aldrei verid fleiri en skotin");
ok(withShots.every(p => (p.shots_in_box ?? 0) + (p.shots_out_box ?? 0) <= p.shots),
   "teigsskot + skot utan teigs fara aldrei yfir heildarskot");
ok(withShots.every(p => p.xg_per_shot == null || (p.xg_per_shot > 0 && p.xg_per_shot < 1)),
   "xG per skot liggur i (0,1)");
const top = [...withShots].sort((a, b) => (b.big_chances || 0) - (a.big_chances || 0))[0];
ok(top && top.big_chances >= 20,
   `efsti madur i big chances er truverdugur: ${top?.name} (${top?.big_chances})`);
ok(P.every(p => p.crosses_acc == null || p.crosses == null || p.crosses_acc <= p.crosses),
   "heppnadir krossar fara aldrei yfir reynda krossa");
ok(P.every(p => p.tackles_won == null || p.tackles == null || p.tackles_won <= p.tackles),
   "unnar tacklingar fara aldrei yfir reyndar");

/* ---------- 7. SKOT-SUNDURLIDUN ---------- */
H("7. FOST LEIKATRIDI / SKALLAR / TREVERK");
/* Sundurlidunin ma ALDREI fara yfir heildina — hun er hlutmengi hennar. */
ok(withShots.every(p => (p.sp_shots ?? 0) <= p.shots),
   "fastra-leikatrida skot fara aldrei yfir heildarskot");
ok(withShots.every(p => (p.head_shots ?? 0) <= p.shots),
   "skallar fara aldrei yfir heildarskot");
ok(withShots.every(p => (p.woodwork ?? 0) <= p.shots),
   "treverk fer aldrei yfir heildarskot");
/* sp_xg + op_xg ma ekki fara yfir heildar-xG: vitaspyrnur eru i HVORUGUM
   flokki (eigin `sit`), svo summan er <= xg, ekki == xg.
   VIKMORKIN ERU MAELD, EKKI VALIN: hver hinna thriggja er namundud i
   3 aukastafi HVOR I SINU LAGI, svo summa tveggja namundadra talna ma
   fara 0,001 yfir namunduðu heildina. Maelt: 30 leikmenn fara yfir og
   ALLIR um NAKVAEMLEGA 0,001 — engin undantekning er staerri, svo thetta
   er namundun en ekki gagnavilla. Vikmorkin eru 0,0015 (tvaer namundanir);
   raunveruleg villa vaeri margfalt staerri og felldi profid afram.      */
{
  const over = withShots.filter(p => ((p.sp_xg ?? 0) + (p.op_xg ?? 0)) > (p.xg ?? 0) + 0.0015);
  ok(over.length === 0,
     `fost + opinn leikur fer aldrei yfir heildar-xG (viti er i hvorugum)${over.length ? ` — ${over.length} yfir namundunar-vikmorkum` : ""}`);
}
ok(P.every(p => p.sp_xg_share == null || (p.sp_xg_share >= 0 && p.sp_xg_share <= 1)),
   "hlutfall fastra leikatrida liggur i [0,1]");
/* ANDLITSPROF: hornamidverdir eiga ad vera efstir i HLUTFALLI, ekki i
   heildar-xG. Ef thetta fellur er `sit`-flokkunin brotin.              */
{
  const big = P.filter(p => (p.sp_xg ?? 0) >= 2);
  const topShare = big.filter(p => (p.sp_xg_share ?? 0) >= 0.9);
  ok(topShare.length >= 3,
     `menn med >=2 sp_xg OG >=90% hlutfall (hornamidverdir): ${topShare.length} — ${topShare.slice(0, 3).map(p => p.name).join(", ")}`);
}
{
  const wood = P.reduce((s, p) => s + (p.woodwork || 0), 0);
  ok(wood > 80, `treverk talid: ${wood} (luck.json hefur borid null sidan Understat do)`);
}

/* ---------- 8. npxG ---------- */
H("8. npxG — VITASPYRNUR DREGNAR FRA");
{
  const withShots2 = P.filter(p => p.shots > 0);
  ok(withShots2.every(p => p.np_xg <= (p.xg ?? 0) + 1e-6),
     "npxG fer aldrei yfir xG (thad er hlutmengi)");
  ok(withShots2.filter(p => p.pen_shots > 0).every(p => p.np_xg < p.xg),
     "hver sem tok viti hefur LAEGRA npxG en xG");
  ok(withShots2.filter(p => !p.pen_shots).every(p => Math.abs(p.np_xg - p.xg) < 1e-6),
     "sa sem tok ekkert viti hefur npxG == xG");
  const pens = P.filter(p => (p.pen_shots || 0) >= 3);
  ok(pens.length >= 3, `vitaskyttur i gognunum: ${pens.length}`);
  const worst = pens.sort((a, b) => (b.xg - b.np_xg) - (a.xg - a.np_xg))[0];
  ok(worst && (worst.xg - worst.np_xg) > 2,
     `staersta vita-uppblasan: ${worst?.name} ${worst?.xg} -> ${worst?.np_xg}`);
}


console.log(`\nBSD: ${pass} stodust, ${fail} féllu`);
if (fail) process.exit(1);
