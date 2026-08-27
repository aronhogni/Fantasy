/* ============================================================
   HVAD SEGIR EIN BYRJUN UM DEFCON? (27.8.2026, beidni notandans um Sangare)

   SPURNINGIN: `measure-dc-flag.mjs` (25.8.2026) setti GOLF VID 5 BYRJANIR og
   thad var RETT UM SINN MAELIKVARDA — hra HITTNI a einni byrjun er 0% eda
   100% og ber thvi enga upplysingu. En hittni er ekki eina talan sem
   byrjunin skilar: DC-TALNINGIN sjalf er samfelld (13 af 12 er annad en 4 af
   12), og hun var ALDREI maeld. Golf sem er rett um binaeru toluna var latid
   gilda um tha samfelldu lika, an maelingar.

   ThVI ER ThETTA MAELT HER: spair DC/90 i FYRSTU BYRJUN thvi hvort madur
   naer throskuldinum i theim sem A EFTIR koma? Og — ef hun gerir thad —
   hversu mikid betri er hun en talan sem appid synir i dag (skrumpud hittni,
   `hit_rate_adj`, sem eftir eina byrjun er SAMA TALA hja ollum sem hittu).

   GOGN: `data/player_gw_2526.json` (eina timabilid med DC — sannreynt: dc>0
   i 9.620 rodum 2526 og 0 i ollum fjorum eldri skram). Engin ytri koll.
   Deterministisk: `bootstrapCI` med fostu fraei ur `start-panel.mjs`.

   THROSKULDIR: MID/FWD 12 CBIRT, DEF 10 CBIT — somu tolur og `defcon.json`
   skrifar, ekki nyjar.

   KEYRSLA:  node scripts/measure-first-start-dc.mjs [--json <slod>]
   ============================================================ */
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import { bootstrapCI } from "./start-panel.mjs";

const D = new URL("../data/", import.meta.url).pathname;
const G = JSON.parse(readFileSync(D + "player_gw_2526.json", "utf8"));
const IX = Object.fromEntries(G.stats.map((k, i) => [k, i]));
const THRESH = { DEF: 10, MID: 12, FWD: 12 };
/* MAELIKVARDINN ER `dc`-DALKURINN I OLLUM STODUM — LIKA HJA VORNINNI.
   Fyrsta utgafa thessarar skriftu las `cbit` fyrir DEF af thvi ad FPL
   skilgreinir throskuld varnarmanna sem CBIT (an endurheimta). Skrain ber
   hins vegar BADA dalka og their eru EKKI their somu: medaltal a byrjun er
   `dc` 7,30 a moti `cbit` 5,70 og their eru jafnir i adeins 802 af 3.150
   rodum. Hittnin sem ut kom var 0,1546 — en pipeline-an sjalf (`fetch.mjs`
   1493) les `dc` og faer **0,2632**, sem er talan sem CLAUDE.md 12 skjalar.
   Skriftan var thvi ad maela ANNAN maelikvarda en appid synir. Sama aett og
   `buildTeamMetrics`-afritid: endurreiknud skilgreining laug. */
const FIELD = { DEF: "dc", MID: "dc", FWD: "dc" };

/* Radir per leikmann: adeins BYRJANIR, i umferdaroð. */
function startsOf(row) {
  return Object.entries(row.gw)
    .map(([g, v]) => ({ gw: +g, mins: v[IX.mins], starts: v[IX.starts],
                        dc: v[IX.dc], cbit: v[IX.cbit], pts: v[IX.pts] }))
    .filter(x => x.starts > 0 && x.mins > 0)
    .sort((a, b) => a.gw - b.gw);
}

const MIN_LATER = 5;              /* nog eftir til ad maela utkomuna */
const pool = [];
for (const [code, row] of Object.entries(G.players)) {
  const pos = row.p;
  if (!THRESH[pos]) continue;     /* GK fa engin DC-stig (CLAUDE.md 12) */
  const st = startsOf(row);
  if (st.length < 1 + MIN_LATER) continue;
  const f = st[0], later = st.slice(1);
  const val = x => x[FIELD[pos]];
  const hit = x => val(x) >= THRESH[pos];
  pool.push({
    code, pos, team: row.t,
    first_dc: val(f), first_mins: f.mins,
    first_dc90: val(f) * 90 / f.mins,
    first_hit: hit(f) ? 1 : 0,
    later_n: later.length,
    later_rate: later.filter(hit).length / later.length,
    all_rate: st.filter(hit).length / st.length,
  });
}

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const clusters = pool.map(p => [p]);            /* ein rod per leikmann */
const rate = rs => rs.length ? mean(rs.map(r => r.later_rate)) : NaN;
const pearson = (xs, ys) => {
  const mx = mean(xs), my = mean(ys);
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < xs.length; i++) { const u = xs[i] - mx, v = ys[i] - my; a += u * v; b += u * u; c += v * v; }
  return a / Math.sqrt(b * c);
};

/* ============================================================
   TVEIR LESENDUR, EIN UTFAERSLA — og thess vegna er skyrslan GOTUD.

   `pool` og `bandEstimate` eru flutt ut svo lidsuttektin geti spurt
   NAKVAEMLEGA thessa toflu i stad thess ad byggja hana aftur. Afrit af
   utreikningi er tvaer utfaerslur sem reka i sundur — thad var
   `buildTeamMetrics` (CLAUDE.md 7.1, NaN a 17 lidum, MERKT sem maeling) og
   `wOf`-afritid i `stats.test.mjs` (CLAUDE.md 8).

   OG ThVI VERDUR SKYRSLAN AD VERA GOTUD VID BEINA KEYRSLU: vaeri hun thad
   ekki myndi HVER innflutningur prenta hana og keyra bootstrappid. Sama
   skilyrdi og `fetch.mjs` ber (`invokedDirectly`, CLAUDE.md 7.1) og af somu
   astaedu — innflutt skrifta a ad thegja.

   BONDIN ERU MAELINGIN SJALF, EKKI LIKAN: `bandEstimate` skilar HOPNUM sem
   madurinn lendir i, med `n` og CI, og `null` thegar hopurinn er of litill.
   Hun skilar ENGRI tolu fyrir GK (their fa engin DC-stig, CLAUDE.md 12) og
   engri fyrir FWD-bond thar sem merkid maeldist ekki (r inniheldur null).
   "Faar maelingar -> ENGIN tala" (CLAUDE.md 4).
   ============================================================ */
export { pool, THRESH };

const BANDS = [[0, 8], [8, 12], [12, 15], [15, 99]];
export function bandEstimate(pos, dc90, { minN = 8 } = {}) {
  if (!THRESH[pos] || !Number.isFinite(dc90)) return null;
  const band = BANDS.find(([lo, hi]) => dc90 >= lo && dc90 < hi);
  if (!band) return null;
  const rs = pool.filter(p => p.pos === pos && p.first_dc90 >= band[0] && p.first_dc90 < band[1]);
  if (rs.length < minN) return { band, n: rs.length, rate: null, ci: null, why: `only ${rs.length} comparable players` };
  const ci = bootstrapCI(rs.map(p => [p]), xs => xs.reduce((s, x) => s + x.later_rate, 0) / xs.length);
  return { band, n: rs.length, rate: ci.point, ci: [ci.lo, ci.hi] };
}

const invokedDirectly = (() => {
  try { return realpathSync(process.argv[1] || "") === realpathSync(new URL(import.meta.url).pathname); }
  catch { return false; }
})();
if (!invokedDirectly) { /* innflutt: engin skyrsla, engin prentun */ }
else {
const out = { generated: new Date().toISOString(), n_players: pool.length, min_later: MIN_LATER };
const say = (...a) => console.log(...a);

say(`\nPOOL: ${pool.length} players in 2025/26 with >=${1 + MIN_LATER} starts  `
  + `(DEF ${pool.filter(p => p.pos === "DEF").length} · MID ${pool.filter(p => p.pos === "MID").length} · FWD ${pool.filter(p => p.pos === "FWD").length})`);

/* ---- 1. BER FYRSTA BYRJUNIN MERKI? (allar stodur, svo per stodu) ---- */
for (const scope of ["ALL", "MID", "DEF", "FWD"]) {
  const rs = scope === "ALL" ? pool : pool.filter(p => p.pos === scope);
  if (rs.length < 15) { say(`\n${scope}: n=${rs.length} — too few, NO figure`); continue; }
  const r_dc90 = pearson(rs.map(p => p.first_dc90), rs.map(p => p.later_rate));
  const r_hit = pearson(rs.map(p => p.first_hit), rs.map(p => p.later_rate));
  const cl = rs.map(p => [p]);
  const ciR = bootstrapCI(cl, xs => pearson(xs.map(p => p.first_dc90), xs.map(p => p.later_rate)));
  const ciH = bootstrapCI(cl, xs => pearson(xs.map(p => p.first_hit), xs.map(p => p.later_rate)));
  say(`\n${scope} (n=${rs.length})`);
  say(`  r(DC/90 in first start -> later hit rate)   ${r_dc90.toFixed(3)}  CI [${ciR.lo.toFixed(3)}, ${ciR.hi.toFixed(3)}]${ciR.excludesZero ? "  EXCLUDES ZERO" : "  includes zero"}`);
  say(`  r(HIT in first start -> later hit rate)     ${r_hit.toFixed(3)}  CI [${ciH.lo.toFixed(3)}, ${ciH.hi.toFixed(3)}]${ciH.excludesZero ? "  EXCLUDES ZERO" : "  includes zero"}`);
  out[scope] = { n: rs.length, r_dc90, r_dc90_ci: [ciR.lo, ciR.hi], r_hit, r_hit_ci: [ciH.lo, ciH.hi] };
}

/* ---- 2. HOPAR: hvad faer madur MED Sangare-lika fyrstu byrjun? ---- */
const mid = pool.filter(p => p.pos === "MID");
const bands = [[0, 8], [8, 12], [12, 15], [15, 99]];
say(`\nMID — hit rate in LATER starts, by DC/90 in the FIRST one:`);
out.mid_bands = [];
for (const [lo, hi] of bands) {
  const rs = mid.filter(p => p.first_dc90 >= lo && p.first_dc90 < hi);
  if (!rs.length) continue;
  const ci = bootstrapCI(rs.map(p => [p]), rate);
  say(`  DC/90 ${String(lo).padStart(2)}-${hi === 99 ? "+ " : String(hi).padStart(2)}  n=${String(rs.length).padStart(3)}  `
    + `later hit rate ${rate(rs).toFixed(3)}  CI [${ci.lo.toFixed(3)}, ${ci.hi.toFixed(3)}]  `
    + `(mean later starts ${mean(rs.map(p => p.later_n)).toFixed(1)})`);
  out.mid_bands.push({ lo, hi, n: rs.length, later_rate: rate(rs), ci: [ci.lo, ci.hi] });
}

/* DELTA: >=15 a moti <15, klasad per leikmann — profsteinninn. */
const hiG = mid.filter(p => p.first_dc90 >= 15), loG = mid.filter(p => p.first_dc90 < 15);
const dCI = bootstrapCI(mid.map(p => [p]),
  xs => rate(xs.filter(p => p.first_dc90 >= 15)) - rate(xs.filter(p => p.first_dc90 < 15)));
say(`\n  DELTA (>=15 against <15): ${dCI.point.toFixed(3)}  CI [${dCI.lo.toFixed(3)}, ${dCI.hi.toFixed(3)}]`
  + `${dCI.excludesZero ? "  EXCLUDES ZERO" : "  includes zero"}   n ${hiG.length} / ${loG.length}`);
out.mid_delta_15 = { point: dCI.point, ci: [dCI.lo, dCI.hi], excludes_zero: dCI.excludesZero, n_hi: hiG.length, n_lo: loG.length };

/* ---- 3. SLAER ThAD TOLUNA SEM APPID SYNIR I DAG? ---- */
/* Appid: hit_rate_adj = (hits + 10*p0)/(starts + 10). Eftir EINA byrjun er
   hun sama talan hja ollum sem hittu (0,209 hja MID i dag).             */
const p0 = 0.13, K = 10;
const appEst = p => (p.first_hit + K * p0) / (1 + K);
const mae = (rs, f) => mean(rs.map(p => Math.abs(f(p) - p.later_rate)));
/* Einfoldust moguleg samfelld regla, fittud a SOMU gognum (thak, ekki tillaga) */
const xs = mid.map(p => p.first_dc90), ys = mid.map(p => p.later_rate);
const mx = mean(xs), my = mean(ys);
let sxy = 0, sxx = 0;
for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
const b = sxy / sxx, a = my - b * mx;
const lin = p => Math.min(1, Math.max(0, a + b * p.first_dc90));
const ciMae = bootstrapCI(mid.map(p => [p]), rs => mae(rs, appEst) - mae(rs, lin));
say(`\nMAE against the actual later hit rate (MID, n=${mid.length}):`);
say(`  the app today (shrunk hit rate)  ${mae(mid, appEst).toFixed(4)}`);
say(`  DC/90 line (fitted on the SAME data — a CEILING, not a proposal)  ${mae(mid, lin).toFixed(4)}   a=${a.toFixed(3)} b=${b.toFixed(4)}`);
say(`  DELTA (app - line) ${ciMae.point.toFixed(4)}  CI [${ciMae.lo.toFixed(4)}, ${ciMae.hi.toFixed(4)}]${ciMae.excludesZero ? "  EXCLUDES ZERO" : "  includes zero"}`);
out.mae = { app: mae(mid, appEst), lin: mae(mid, lin), delta: ciMae.point, ci: [ciMae.lo, ciMae.hi], a, b, excludes_zero: ciMae.excludesZero };

/* ---- 4. SANGARE SJALFUR: naesta nagranna-hopur ---- */
const like = mid.filter(p => p.first_dc90 >= 13 && p.first_dc90 <= 18);
const ciL = bootstrapCI(like.map(p => [p]), rate);
say(`\nSANGARE-LIKE (MID, first start DC/90 13-18): n=${like.length}  `
  + `later hit rate ${rate(like).toFixed(3)}  CI [${ciL.lo.toFixed(3)}, ${ciL.hi.toFixed(3)}]`);
say(`  for comparison: MID mean ${rate(mid).toFixed(3)} · what the app shows him today 0.209`);
out.sangare_like = { n: like.length, later_rate: rate(like), ci: [ciL.lo, ciL.hi], mid_mean: rate(mid) };

const ji = process.argv.indexOf("--json");
if (ji > -1 && process.argv[ji + 1]) { writeFileSync(process.argv[ji + 1], JSON.stringify(out, null, 1)); say(`\nwritten: ${process.argv[ji + 1]}`); }
say("");

/* ============================================================
   5. STIGIN SJALF — ThVI ThAD ER SPURNINGIN SEM NOTANDINN SPYR

   "Naer hann DefCon?" er millistærd; akvordunin er STIG. Her er maelt hvad
   MID-menn med Sangare-lika FYRSTU byrjun (DC/90 13-18) skorudu i theim
   byrjunum sem A EFTIR komu — beint sambaerilegt vid `ep_next`, sem er
   grunnurinn sem appid margfaldar. Og hvad DC-hittan sjalf er verd, maeld
   sem munur a byrjunum med og an hennar (LYSING, ekki orsakasamband:
   DC-stigin tvo eru INNI i toluni, svo hun getur ekki verid undir 2).
   ============================================================ */
{
  const rowsOf = (row) => Object.entries(row.gw)
    .map(([g, v]) => ({ gw: +g, mins: v[IX.mins], starts: v[IX.starts], dc: v[IX.dc], cbit: v[IX.cbit], pts: v[IX.pts] }))
    .filter(x => x.starts > 0 && x.mins > 0).sort((a, b) => a.gw - b.gw);
  const laterRows = [];        /* allar SIDARI byrjanir MID-manna i urtakinu */
  for (const p of pool.filter(x => x.pos === "MID")) {
    const st = rowsOf(G.players[p.code]).slice(1);
    for (const s of st) laterRows.push({ code: p.code, first_dc90: p.first_dc90, pts: s.pts, hit: s.dc >= 12 });
  }
  const mp = rs => rs.length ? mean(rs.map(r => r.pts)) : NaN;
  const like = laterRows.filter(r => r.first_dc90 >= 13 && r.first_dc90 <= 18);
  const all = laterRows;
  const byPl = rs => { const m = new Map(); for (const r of rs) (m.get(r.code) || m.set(r.code, []).get(r.code)).push(r); return [...m.values()]; };
  const ciLike = bootstrapCI(byPl(like), mp), ciAll = bootstrapCI(byPl(all), mp);
  const hitRows = all.filter(r => r.hit), missRows = all.filter(r => !r.hit);
  const ciDelta = bootstrapCI(byPl(all), rs => mp(rs.filter(r => r.hit)) - mp(rs.filter(r => !r.hit)));
  say(`\nPOINTS PER START (MID, later starts, 2025/26):`);
  say(`  Sangare-like (first start DC/90 13-18)  ${ciLike.point.toFixed(2)}  CI [${ciLike.lo.toFixed(2)}, ${ciLike.hi.toFixed(2)}]  n=${like.length} starts / ${byPl(like).length} players`);
  say(`  everyone in the pool                    ${ciAll.point.toFixed(2)}  CI [${ciAll.lo.toFixed(2)}, ${ciAll.hi.toFixed(2)}]  n=${all.length}`);
  say(`  start WITH a DC hit ${mp(hitRows).toFixed(2)} (n=${hitRows.length}) against WITHOUT ${mp(missRows).toFixed(2)} (n=${missRows.length})  `
    + `delta ${ciDelta.point.toFixed(2)} CI [${ciDelta.lo.toFixed(2)}, ${ciDelta.hi.toFixed(2)}]`);
  out.points = { like: ciLike.point, like_ci: [ciLike.lo, ciLike.hi], like_n: like.length,
                 all: ciAll.point, all_ci: [ciAll.lo, ciAll.hi],
                 hit: mp(hitRows), miss: mp(missRows), delta: ciDelta.point, delta_ci: [ciDelta.lo, ciDelta.hi] };
  say("");
}

}
