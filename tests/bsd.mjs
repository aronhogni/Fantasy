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
      (`player_gw_2526.json`, FROSIN saga sama timabils, lyklud a `code`):
      mork og minutur verda ad stemma. Thetta er sama tegund vardar og
      "value_season == stig/verd a ollum 563 raungognum" (6f).
      Vidmidid var `season_baseline.json` til 21.8.2026 og hun skipti
      TIMABILI undir omreyttum merkimida — sja langa athugasemdina vid
      kafla 3.

   3. MAELDU FASTARNIR. `big_chance_xg` og `in_box_x` eru FITTADIR, ekki
      valdir. Ef einhver breytir theim an nyrrar maelingar a thad ad
      sjast: skrain ber tolurnar og prófid neglir thaer.
   ============================================================ */
import { readFileSync } from "node:fs";
import { STAT_DEFS, STAT_BY_KEY } from "../src/stats.js";
import { finalize, matchShotTotals, BIG_CHANCE_XG } from "../src/bsd.js";

const ROOT = new URL("../", import.meta.url).pathname;
const read = f => JSON.parse(readFileSync(ROOT + f, "utf8"));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); }
                       else { fail++; console.log("  ✗ " + m); } };
const H = t => { console.log(`\n${"─".repeat(84)}\n${t}\n${"─".repeat(84)}`); };

/* ============================================================
   0a. LIDS-TOLUR PER LEIK — `matchShotTotals`

   ThETTA STENDUR FYRIR OFAN SKRA-GATTINA VILJANDI. Kaflarnir hér ad nedan
   sleppa sér med `process.exit(0)` thegar `bsd_players.json` vantar (hun er
   skrifud handvirkt), en `matchShotTotals` er HREINT FALL sem engin skra
   kemur vid — og hun er kodinn sem kviknar i pipeline naest thegar leikur
   klarast. Kodi sem fer i gang mannlaus einn morgun og er osýnilegur
   profunum er nakvaemlega thad sem CLAUDE.md kafli 5 bannar.

   HVERS VEGNA FALLID ER TIL: notandinn spurdi "afhverju fae eg ekki xGC a
   lid?" a yfirstandandi timabili. xG lidsins ma summa ur leikmanna-rodunum
   i `bsd_live.json`; xGC er summa MOTHERJANNA og hun er ekki i theim —
   engin rod ThAR nefnir motherja. Attributionin (`sh.home` + `home_team_id`
   / `away_team_id`) er til i BSD-svarinu THEGAR leikurinn er sottur og
   hvergi eftir thad, svo hun er skrifud nidur tha.
   ============================================================ */
H("0a. LIDS-TOLUR PER LEIK (matchShotTotals) — xGC-heimildin");
{
  const S = (home, xg, x = 10, y = 50, type = "miss") => ({ home, xg, type, pos: { x, y } });
  const t = matchShotTotals([
    S(true, 0.50), S(true, 0.10), S(true, 0.90, 5, 50, "goal"),
    S(false, 0.10), S(false, 0.30, 8, 50, "goal"),
  ], { home: "ARS", away: "COV" });

  ok(t.home.team === "ARS" && t.away.team === "COV", "hvor hlidin er hvad");
  ok(Math.abs(t.home.xg - 1.5) < 1e-9 && Math.abs(t.away.xg - 0.4) < 1e-9,
     `xG skiptist eftir \`sh.home\` (${t.home.xg} / ${t.away.xg})`);
  ok(t.home.shots === 3 && t.away.shots === 2, "skot-fjoldi per hlid");
  ok(t.home.goals === 1 && t.away.goals === 1, "mork talin ur `type === \"goal\"`");
  /* STORAR FAERIR NOTA MAELDA THROSKULDINN, EKKI TOLU A STADNUM. */
  /* Heima: 0,50 og 0,90 teljast, 0,10 ekki. Uti: 0,30 telst, 0,10 ekki.
     Throskuldurinn er thvi PROFADUR i badar attir a badum hlidum — tala
     sem taeldi OLL skot gaefi 3/2 og tala sem taeldi engin gaefi 0/0.   */
  ok(t.home.bc === 2 && t.away.bc === 1,
     `storar faerir eru skot >= BIG_CHANCE_XG (${BIG_CHANCE_XG}): ${t.home.bc}/${t.away.bc}`);

  /* ---- ThRJAR REGLUR SEM VERJA GEGN TILBUNUM TOLUM ---- */

  /* 1. ENGIN SKOTAKORT -> ENGIN ROD. Rod af nullum vaeri fullyrding um ad
        hvorugt lidid hafi skotid — "vantar" er ekki "ekkert".           */
  ok(matchShotTotals(undefined, { home: "ARS", away: "COV" }) === null &&
     matchShotTotals(null, {}) === null,
     "vantandi skotakort gefur null, EKKI rod af nullum");
  /* En TOMT kort er raunverulegt null: kortid var thar og bar ekkert. */
  {
    const e = matchShotTotals([], { home: "ARS", away: "COV" });
    ok(e && e.home.shots === 0 && e.home.xg === 0,
       "tomt kort er hins vegar RAUNVERULEG nulltala (0 skot)");
  }

  /* 2. SKOT AN `home` ER OSTADSETT OG FER HVERGI. An thessa fer
        `sh.home ? H : A` med OLL slik skot a utilidid — heimalidid fengi
        hreint blad og utilidid oll skotin, thogult.                     */
  {
    const bad = matchShotTotals([
      S(true, 0.4), { xg: 5.0, type: "goal", pos: { x: 1, y: 50 } },
    ], { home: "ARS", away: "COV" });
    ok(bad.away.xg === 0 && bad.away.shots === 0 && bad.away.goals === 0,
       "skot an `home` lendir EKKI a utilidinu (5,0 xG hefdi sest)");
    ok(bad.dropped === 1, `og thad er TALID (dropped ${bad.dropped})`);
  }

  /* 3. SAMA ThYDI OG FROSNA LEIDIN: adeins skot med hnit. Hver einasta
        lids-xG-tala i appinu i dag er summa ur thvi thydi
        (`fetch-bsd.mjs` sleppir hinum), svo vaeri live-leidin rudari
        thyddi "sama tala" sitthvad i sitthvoru timabilinu.              */
  {
    const nc = matchShotTotals([
      S(true, 0.4), { home: true, xg: 9.9, type: "goal", pos: {} },
      { home: true, xg: 9.9, type: "goal" },
    ], { home: "ARS", away: "COV" });
    ok(Math.abs(nc.home.xg - 0.4) < 1e-9 && nc.home.shots === 1,
       `skot an hnita telja ekki (xG ${nc.home.xg}, ekki 20,2)`);
    ok(nc.dropped === 2, `og thau eru TALIN lika (dropped ${nc.dropped})`);
  }

  /* LID UTAN DEILDAR: `team` er null OG ThAD ER RETT — tolur hlidarinnar
     eru afram thar, thvi thaer eru xGC hins lidsins.                    */
  {
    const u = matchShotTotals([S(false, 0.8)], { home: "ARS", away: null });
    ok(u.away.team === null && Math.abs(u.away.xg - 0.8) < 1e-9,
       "lid utan BSD_TEAM fær `team: null` en heldur tolunni (hun er xGC hins)");
  }
}

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
/* ============================================================
   VIDMIDID VAR `season_baseline.json` OG ThAD BRAST 21.8.2026 — EKKI
   AF ThVI AD PORUNIN VERSNADI, HELDUR AF ThVI AD SKRAIN SKIPTI TIMABILI
   UNDIR NAFNI SEM BREYTTIST EKKI.

   BSD naer ADEINS yfir 2025/26 (CLAUDE.md 6t) og er frosin. Vidmidid
   ThARF thvi ad vera 2025/26 lika. `season_baseline.json` VAR thad:
   `fetch.mjs` skrifar hana daglega medan `!events.some(e => e.finished)`
   og lokatolur fyrra timabils standa i bootstrap-inu allan forleikinn.
   Um leid og FPL nullstillti uppsofnudu tolurnar vid tímabils-byrjun var
   ENGIN umferd `finished` — sa fani slokknar ekki fyrr en OLL leikir
   umferdarinnar eru bunir — svo skriftan hélt afram ad skrifa, nu med
   2026/27-tolum, OG MERKIMIDINN VAR AFRAM "2025/26" (hann er reiknadur
   ur ARTALI GW1-frestsins, ekki ur innihaldinu).
   Maelt a skranni: 600 leikmenn, 31 med minutur, HAMARK 90 MINUTUR —
   a moti 400 med minutur og hamarki 3.420 sama morgun. Vordurinn hér
   (`base.label !== "2025/26"`) gat ekki greint thad, af thvi ad hann
   spurdi um merkimidann.

   ThVI ER VIDMIDID FLUTT A `player_gw_2526.json`: hun er FROSIN
   per-umferdar saga 2025/26 ur vaastav-speglinum, hun er lyklud a
   `code` (fast yfir timabil, CLAUDE.md 3) og hun getur ekki skipt
   timabili undir nafninu sinu — thad er einmitt gatid sem brast.
   `fpl_id` var lykillinn adur og hann er TIMABILS-BUNDID element-id,
   svo hann bendir a mann i YFIRSTANDANDI timabili; `code` bendir a
   manninn sjalfan.

   OG SVARID ER ThAD SAMA UPP A STAFINN, sem er sonnun thess ad porunin
   var alltaf i lagi og thad var vidmidid sem hvarf: maelt 22.8.2026 a
   415 rodum (415 af 415 parast, ENGIN utundan) er r fyrir minutur
   0,9998 og fyrir mork 0,9998 — nakvaemlega tolurnar sem CLAUDE.md 6t
   skrair fyrir thessa porun — mork stemma i 99,5% (413/415) og
   MESTA MINUTU-FRAVIK ER 90 (Robin Roefs, 3.060 a moti 3.150), sem er
   sami madur og sama tala sem gamla athugasemdin nefndi.
   72 stemma upp a minutu og 343 skeika um alt ad 90 af thvi ad BSD
   telur EINN leik odruvisi (uppbotartimi/skiptingar), svo 90 er
   raunveruleg lofthaed gagnanna og allt tharumfram er porunar-villa,
   ekki taln-mismunur. ThROSKULDURINN ER ThVI MAELDUR, EKKI VALINN —
   og hann er OBREYTTUR fra fyrri utgafu.
   ============================================================ */
H("3. VORPUN VID FPL — borid vid player_gw_2526.json (frosid 2025/26)");
let hist = null;
try { hist = read("data/player_gw_2526.json"); } catch {}
/* VIDMIDID VERDUR AD VERA SAMA TIMABIL SEM BSD NAER YFIR, og nu er
   spurt um INNIHALDID og ekki bara um merkimidann: `season` OG `label`
   verda ad segja 2025/26 og skrain ad bera per-umferdar rod. */
const histOk = !!hist && hist.season === "2526" && hist.label === "2025/26"
  && Array.isArray(hist.stats) && hist.players && typeof hist.players === "object";
if (!histOk) {
  ok(false, "player_gw_2526.json er frosin 2025/26-saga svo haegt se ad bera saman"
     + ` (season=${hist?.season}, label=${hist?.label})`);
} else {
  const iM = hist.stats.indexOf("mins"), iG = hist.stats.indexOf("goals");
  ok(iM >= 0 && iG >= 0, `stats-skrain ber mins og goals (${iM}, ${iG})`);
  /* Timabils-summa per `code` — logd saman i FASTRI umferdar-rod, sama
     regla og i `fetch-bsd.mjs` (fleytitolu-samlagning er ekki vixlin). */
  const FPL = new Map();
  for (const [code, row] of Object.entries(hist.players)) {
    let mins = 0, goals = 0;
    for (const gw of Object.keys(row.gw || {}).map(Number).sort((a, b) => a - b)) {
      const r = row.gw[gw]; if (!r) continue;
      mins += r[iM] || 0; goals += r[iG] || 0;
    }
    FPL.set(Number(code), { mins, goals });
  }
  ok(FPL.size > 700, `leikmenn i frosnu 2025/26-sogunni: ${FPL.size}`);

  const paired = P.filter(p => p.code != null && FPL.has(p.code));
  ok(paired.length > 300, `pöruð pör til samanburdar: ${paired.length}`);
  /* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b). Rod i BSD-skranni
     sem ENGIN 2025/26-saga bakkar upp er sjalf grunsamleg — hun a ad
     hafa spilad thad timabil. Maelt 22.8.2026: 0 af 415 utundan.     */
  const unpaired = P.filter(p => p.code == null || !FPL.has(p.code));
  ok(unpaired.length === 0,
     `hver BSD-rod parast vid frosnu soguna a \`code\`${unpaired.length
       ? ` — ${unpaired.length} gera thad ekki: ` + unpaired.slice(0, 5).map(p => p.name).join(", ") : ""}`);

  let exact = 0, badMin = 0;
  for (const p of paired) {
    const b = FPL.get(p.code);
    if ((p.goals ?? 0) === b.goals) exact++;
    /* ThROSKULDURINN VAR 300 MINUTUR — OG ThAD VAR AGISKAD, EKKI MAELT.
       300 minutur eru ThRIR heilir leikir; vixl milli fastamanns og
       varamanns rumast innan theirra. 90 er maeld lofthaed (sja
       athugasemdina vid kaflann).                                    */
    if (Math.abs((p.minutes ?? 0) - b.mins) > 90) badMin++;
  }
  const pct = 100 * exact / paired.length;
  ok(pct >= 97, `mork stemma nakvaemlega vid FPL i ${pct.toFixed(1)}% tilvika (>=97%)`);
  /* ThETTA ER VORDURINN SEM FANN VIXLID: Jacob/Alex Murphy og Gabriel
     Martinelli/Gabriel voru RANGT pörud og minutur skildu ad.          */
  ok(badMin === 0,
     `engin pörun thar sem minutur skeikar >90 (vixlud nofn)${badMin ? ` — ${badMin} fundust` : ""}`);

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
/* HVOR ER RETTI ADSKILNADURINN? Sa sem SPILADI en skaut ekki er MAELDUR:
   talan hans er NULL SKOT, sem er 0 — ekki "vantar". Sa sem er ekki i
   gognunum a ad hafa null. Kodinn var lagadur 11.8.2026 (`per()` a skot-
   svidin) en SKRAIN var fra 9.8., svo hun bar enn null — og THETTA PROF
   varði gomlu skrana i staðinn fyrir regluna. Endurkeyrslan 19.8. leiddi
   thad i ljos: 77 leikmenn med leiki og engin skot bera nu 0.
   HLUTFOLL eru undanskilin og thad er ekki undanthaga heldur reglan
   sjalf: `xg_per_shot` og `sp_xg_share` eru OSKILGREIND an skota (deiling
   med 0), svo thar er null RETTA svarid.                               */
const noShots = P.filter(p => !p.shots && p.apps > 0);
ok(noShots.length > 0, `forsenda: ${noShots.length} leikmenn spiludu an thess ad skjota`);
ok(noShots.every(p => p.xg === 0 && p.big_chances === 0),
   `their bera MAELT 0 i xG/big chances, ekki null (${noShots.length} menn)`);
ok(noShots.every(p => p.xg_per_shot == null && p.sp_xg_share == null),
   "en HLUTFOLLIN eru null — oskilgreind an skota, ekki 0");
const noApps = P.filter(p => !p.apps);
ok(noApps.every(p => p.xg == null || p.xg === 0),
   `sa sem spiladi ALDREI ber ekki tilbuna tolu (${noApps.length} menn)`);
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


/* ============================================================
   SP + OP VERDUR AD JAFNGILDA ThVI SEM HLUTFALLID DEILIR MED

   `sp_xg` og `op_xg` skipta a milli sin NPXG (viti er hvorki i
   `SET_PIECE` ne `OPEN_PLAY`), en `sp_xg_share` deildi med HEILDAR-xG.
   A skjanum las Bruno Fernandes `xG 10,88 · npxG 6,15 · SP 0,96 ·
   SP% 9% · OP 5,18` — SP+OP = 6,14 og 4,73 xG hvergi taldir.
   Maelt a 316 leikmonnum: SP+OP er JAFNT `np_xg` hja OLLUM og ojafnt
   `xg` hja 25 — nakvaemlega theim sem taka viti.
   ============================================================ */
{
  const mk = over => finalize({ apps:5, minutes_played:450, goals:0, goal_assist:0,
    shots:10, xg:10, pen_xg:4, sp_xg:2, op_xg:4, big_chances:0, shots_in_box:0,
    shots_out_box:0, sp_shots:0, head_shots:0, head_xg:0, pen_shots:1, woodwork:0,
    key_pass:0, crosses:0, crosses_acc:0, touches:0, dribbles:0, fouled:0,
    rating_sum:0, tackles:0, interceptions:0, clearances:0, blocks:0, aerial_won:0,
    ...over }, { bsd_id:1, name:"T", pos:"F", team:"ARS", fpl_id:1, code:1 });

  const r = mk({});
  ok(+(r.sp_xg + r.op_xg).toFixed(3) === r.np_xg,
     `SP + OP = npxG (${r.sp_xg} + ${r.op_xg} = ${r.np_xg})`);
  ok(Math.abs(r.sp_xg_share - 2 / 6) < 5e-4,
     `hlutfallid deilir med npxG: ${r.sp_xg_share} (heildar-xG hefdi gefid 0,200)`);
  /* Vitalaus leikmadur: npxG = xG, svo badar formulur gefa ThAD SAMA —
     thess vegna ma profid ekki hvila a honum einum.                   */
  const noPen = mk({ pen_xg: 0, xg: 6 });
  ok(Math.abs(noPen.sp_xg_share - 2 / 6) < 5e-4,
     "an vita gefa badar formulur sama svar (thess vegna er vita-tilfellid burdarvirki)");
  /* Adeins viti og ekkert annad -> nefnarinn 0 -> OSKILGREINT, ekki 0. */
  const allPen = mk({ xg: 4, pen_xg: 4, sp_xg: 0, op_xg: 0 });
  ok(allPen.sp_xg_share === null, "npxG = 0 -> null (oskilgreint), ekki 0");
}

/* ============================================================
   LIFANDI PORUNIN VERDUR AD FA MINUTURNAR

   MAELT A `bsd_live.json` 26.8.2026 — thetta er ekki tilgata:
     BSD "James Trafford" (LEE, GK, 90 min, 3 vorslur, einkunn 7,3)
       lenti a **Daniel James** (LEE, MID) sem spiladi 0 minutur
     BSD "Jacob Murphy" (NEW, 14 min)
       lenti a **Alex Murphy** (NEW, DEF) sem spiladi 0 minutur
   Menn sem spiludu fengu EKKERT; menn sem spiludu ekki baru einkunn
   annars manns a spjaldinu sinu.

   ThRJU ATRIDI URDU AD FARA SAMAN:
     1. `nameScore` deilir med `min(tokens)`, svo eins-ords `web_name`
        faer 1,0 — "James Trafford" skorar 1,0 gegn BADUM leikmonnum.
     2. Stodu-vordurinn er snidgenginn vid `s >= 0.99`.
     3. Jafntefli brotnar a LAEGSTA FPL-id, og i badum tilvikum var thad
        madurinn sem spiladi EKKI.

   `fetch-bsd.mjs` sendi alltaf `minutesOf`; `fetch.mjs` gerdi thad ekki.
   Vordurinn er thvi um BADAR attir: an minutna VELST rangi madurinn
   (svo profid getur fallid) og med theim sa retti.
   ============================================================ */
console.log("\nLIFANDI PORUN — minuturnar skera ur");
{
  const { pairPlayers } = await import("../src/bsd.js");
  const LEE = [
    { id: 343, web_name: "James",    first_name: "Daniel", second_name: "James",    element_type: 3 },
    { id: 385, web_name: "Trafford", first_name: "James",  second_name: "Trafford", element_type: 1 },
  ];
  const cands = [{ bsd_id: 1, name: "James Trafford", short_name: "J. Trafford",
                   pos: "G", minutes: 90, pool: LEE }];
  const mins = new Map([[343, 0], [385, 90]]);
  const withMin = pairPlayers(cands, { minutesOf: (id) => mins.get(id) ?? null });
  ok(withMin.get(1)?.id === 385,
     `markmadurinn sem SPILADI faer sina eigin skra (${withMin.get(1)?.web_name})`);
  /* MAELITAEKID SJALFT: an minutna A rangi madurinn ad veljast. Se thad
     ekki svo er profid ekki ad maela thad sem thad heldur. */
  ok(pairPlayers(cands).get(1)?.id === 343,
     "og an minutna velst RANGI madurinn — svo fullyrdingin getur fallid");

  const NEW = [
    { id: 451, web_name: "A.Murphy", first_name: "Alex",  second_name: "Murphy", element_type: 2 },
    { id: 457, web_name: "J.Murphy", first_name: "Jacob", second_name: "Murphy", element_type: 3 },
  ];
  const c2 = [{ bsd_id: 2, name: "Jacob Murphy", short_name: "J. Murphy",
                pos: "M", minutes: 14, pool: NEW }];
  const m2 = new Map([[451, 0], [457, 14]]);
  ok(pairPlayers(c2, { minutesOf: (id) => m2.get(id) ?? null }).get(2)?.id === 457,
     "Murphy-braedurnir: sa sem spiladi faer skrana");

  /* OG TENGINGIN — hreint fall sem er rett en ekki kallad rett ver ekkert. */
  const src = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url).pathname, "utf8");
  ok(/pairPlayers\(cands,\s*\{\s*minutesOf/.test(src),
     "`fetch.mjs` sendir `minutesOf` inn i lifandi porunina");
}

console.log(`\nBSD: ${pass} stodust, ${fail} féllu`);
if (fail) process.exit(1);
