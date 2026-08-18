/* ============================================================
   TILLOGU-KERFID (src/recommend.js) — VORDUR
   Keyrt ur `npm test`. Tharf jsx-loaderinn (les `setPieceRanks` ur
   SetPieces.jsx og App.jsx i kafla 1).

   VITASKYTTU-MAELINGIN ER EKKI HER SJALFKRAFA. Hun tharf `players_raw.csv`
   fra vaastav (4 skrar yfir net) og net i `npm test` er nakvaemlega thad
   sem tok `euro-congestion.mjs` ut ur safninu (HTTP 403 a GitHub-kvotanum
   felldi safn af astaedu sem kom maelingunni ekkert vid). Hun er keyrd
   handvirkt:
       node --import ... tests/recommend.mjs --pen
   Allt annad her les COMMITTUD gogn og keyrir a innan vid sekundu.

   SEX KAFLAR:
     1  TENGING      — App.jsx skilgreinir skorid EKKI sjalft, og hadalistinn
                       telur nakvaemlega thad sem fallid les.
     2  UTDRATTURINN — frysta utgafan ur git, med THREMUR FELLDU LIDUNUM
                       slokktum um theirra EIGIN null-hlid, er BITA-EINS.
     3  MAELDIR      — vitaskytta og ep hreyfa skorid nakvaemlega sem maelt.
     4  FELLDIR      — bann, rotering og DefCon hreyfa thad EKKI.
     5  YFIRLYSTAR   — omaeldu UI-tolurnar eru merktar sem slikar.
     6  MAELINGIN    — hun er ENDURKEYRD a committudum gognum: fellur ef
                       hofnunin haettir ad halda.
   ============================================================ */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { buildRecommendations, FIT, MEASURED_ADJ, UNMEASURED_UI, PER90_MIN_MINUTES } from "../src/recommend.js";
import { makeFixDifficulty, rankScore } from "../src/model.js";
import { buildTeamMetrics } from "../src/teamstats.js";
import { setPieceRanks } from "../src/SetPieces.jsx";
import { banRisk, setPieceOf, rotationRisk } from "../src/availability.js";
import { interp } from "../src/interp.js";
import { buildPanel } from "./lib/panel.mjs";

const ROOT = new URL("../", import.meta.url).pathname;
const SRC = readFileSync(ROOT + "src/recommend.js", "utf8");
const APP = readFileSync(ROOT + "src/App.jsx", "utf8");
const J = f => JSON.parse(readFileSync(ROOT + "data/" + f, "utf8"));
const arr = (v, k) => Array.isArray(v) ? v : (Array.isArray(v?.[k]) ? v[k] : null);
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

let pass = 0, fail = 0;
const ok = (c, m, extra = "") => { if (c) { pass++; console.log(`  ✓ ${m}${extra ? " — " + extra : ""}`); }
  else { fail++; console.log(`  ✗ ${m}${extra ? " — " + extra : ""}`); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/* ---------- Raunveruleg inntok ur committudum data/ ---------- */
function inputs(over = {}) {
  const players = arr(J("players.json"), "players");
  const teams = arr(J("teams.json"), "teams");
  const fixtures = arr(J("fixtures.json"), "fixtures");
  const events = arr(J("events.json"), "events");
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  const teamMetrics = buildTeamMetrics({ players, teams, promoted: J("promoted_baseline.json"), teamForm: J("team_form.json") });
  const eloByTeam = {}; (J("elo.json")?.teams || []).forEach(t => eloByTeam[t.fpl_id] = t);
  const fixDifficulty = makeFixDifficulty({ teamMetrics, teamById, odds: J("odds.json"), eloByTeam });
  const fixByTeamGw = {};
  fixtures.forEach(f => {
    if (!f.event) return;
    const add = (tid, opp, home, fdr) => {
      fixByTeamGw[tid] = fixByTeamGw[tid] || {};
      (fixByTeamGw[tid][f.event] = fixByTeamGw[tid][f.event] || []).push({ opp, home, fdr, kickoff: f.kickoff_time, id: f.id });
    };
    add(f.team_h, f.team_a, true, f.team_h_difficulty);
    add(f.team_a, f.team_h, false, f.team_a_difficulty);
  });
  const dcOpp = {};
  Object.entries(J("defcon.json")?.opportunity || {}).forEach(([tid, o]) => dcOpp[tid] = o);
  const cur = events.find(e => e.is_current) || events.find(e => e.is_next);
  const squadIds = new Set([...players].sort((a, b) => (b.now_cost - a.now_cost) || (a.id - b.id)).slice(0, 15).map(p => p.id));
  return { players, fixtures, teams, events, gw: cur ? cur.id : 1, maxGw: events.length,
    recRange: 5, recMaxCost: "", fixByTeamGw, fixDifficulty, dcOpp,
    spRanks: setPieceRanks(players), seasonStarted: events.some(e => e.finished),
    seasonGames: events.filter(e => e.finished).length, squadIds,
    formFeat: J("form_features.json"), playerForm: J("player_form.json"), ...over };
}

/* ============================================================
   1. TENGING — skorid ma EKKI bua i App.jsx
   ============================================================ */
console.log("\n1. TENGING");
ok(/import\s*\{\s*buildRecommendations\s*\}\s*from\s*"\.\/recommend\.js"/.test(APP),
   "App.jsx flytur inn buildRecommendations");
ok(!/const\s+scoreOf\s*=/.test(APP), "App.jsx skilgreinir EKKI `scoreOf` sjalft");
ok(!/^const FIT = \{/m.test(APP), "FIT-taflan er EKKI i App.jsx");
ok(/export const FIT = \{/.test(SRC), "FIT-taflan ER i recommend.js");
{
  /* HADALISTINN — sama MENGI og roksemdirnar. Gamli listinn taldi upp
     fimm breytur sem blokkin las ALDREI (`teamMetrics`, `odds`, `defcon`,
     `eloByTeam`, `eloCsByFx`) medan `fixDifficulty`, `spRanks`,
     `seasonStarted` og `seasonGames` VANTADI. Thau tvo sidustu koma ur
     `events`, sem var hvergi i listanum — thau gatu thvi frosid.        */
  const m = APP.match(/buildRecommendations\(\{([\s\S]*?)\}\),\s*\[([\s\S]*?)\]\);/);
  ok(!!m, "fann kallid og hadalistann i App.jsx");
  if (m) {
    const names = s => [...new Set(s.replace(/\/\*[\s\S]*?\*\//g, "").split(/[\s,]+/)
      .map(x => x.trim()).filter(x => /^[a-zA-Z_$][\w$]*$/.test(x)))].sort();
    const args = names(m[1]), deps = names(m[2]);
    ok(JSON.stringify(args) === JSON.stringify(deps),
       "hadalistinn er NAKVAEMLEGA roksemdirnar", `${args.length} nofn`);
    for (const dead of ["teamMetrics", "odds", "defcon", "eloByTeam", "eloCsByFx"])
      ok(!deps.includes(dead), `gamla dauda hadin "${dead}" er farin`);
    for (const need of ["fixDifficulty", "spRanks", "seasonGames"])
      ok(deps.includes(need), `hadid "${need}" er komid inn`);
  }
}

/* ============================================================
   2. UTDRATTURINN VAR HEGDUNAR-EINS
   Frysta utgafan er lesin BEINT UR GIT (ekki afritud i hondunum) og
   keyrd sem hreint fall. Slokkt er a THREMUR FELLDU LIDUNUM um theirra
   EIGIN null-hlid — `dcOpp:{}` -> dcB=0, `yellow_cards:null` ->
   banRisk null, `starts:null` -> rotationRisk null — og tha VERDUR
   utkoman ad vera bita-eins vid nuverandi utfaerslu.
   ============================================================ */
console.log("\n2. UTDRATTURINN (frysta utgafan ur git)");
const FROZEN_REV = "264a50c";           // sidasti commit fyrir C.1-utdrattinn
function frozenScorer() {
  const src = execSync(`git -C ${ROOT} show ${FROZEN_REV}:src/App.jsx`, { encoding: "utf8", maxBuffer: 64e6 });
  const start = src.indexOf("const recommendations = useMemo(() => {");
  const bodyStart = src.indexOf("{", start) + 1;
  const end = src.indexOf("\n  }, [players, fixtures, gw, recRange", bodyStart);
  if (start < 0 || end < 0) throw new Error("fann ekki blokkina i " + FROZEN_REV);
  const body = src.slice(bodyStart, end);
  return { body, make: D => new Function("D", `
    const {players,fixtures,gw,recRange,fixByTeamGw,squadIds,maxGw,formFeat,recMaxCost,
           playerForm,dcOpp,spRanks,seasonStarted,seasonGames,fixDifficulty,
           FIT,banRisk,setPieceOf,rotationRisk,rankScore,interp} = D;
    ${body}`).bind(null, D) };
}
const norm = R => JSON.stringify({
  byPos: Object.fromEntries([1,2,3,4].map(k => [k, (R.byPos[k]||[]).map(r =>
    [r.p.id, r.score, r.rank, r.ease, r.mode, r.avail, r.why, r.ffdrAvg])])),
  sellIds: [...(R.sellIds||[])], inSquadScores: R.inSquadScores,
  advisorById: R.advisorById && Object.fromEntries(Object.entries(R.advisorById)
    .map(([k,v]) => [k, [v.inputs, v.avail, v.ffdrAvg, v.fxs.length]])),
});
let FZ = null;
try { FZ = frozenScorer(); } catch (e) { ok(false, "nadi i frystu utgafuna ur git", e.message); }
if (FZ) {
  ok(FZ.body.includes("dcB") && FZ.body.includes("banPen") && FZ.body.includes("rotPen"),
     "frysta utgafan BER lidina thrja", `${FZ.body.split("\n").length} linur`);
  const strip = p => ({ ...p, yellow_cards: null, starts: null });
  const cases = [
    ["forleikur", d => d],
    ["recRange=3", d => ({ ...d, recRange: 3 })],
    ["verdthak 7,5", d => ({ ...d, recMaxCost: "7.5" })],
    ["FITTED grein", d => ({ ...d, formFeat: { mode: "fitted", players: d.players.map((p, i) =>
      ({ fpl_id: p.id, mins5: (i * 37) % 91, pts5: (i % 9) / 2, xgi90: ((i * 13) % 50) / 100, bps90: (i % 30) / 3 })) } })],
    ["timabil hafid", d => ({ ...d, seasonStarted: true, seasonGames: 12, gw: 13,
      players: d.players.map((p, i) => ({ ...p, yellow_cards: i % 12, starts: i % 13 })) })],
  ];
  let same = 0, diffWhenLive = 0;
  for (const [name, tweak] of cases) {
    const D = tweak(inputs());
    const off = { ...D, dcOpp: {}, players: D.players.map(strip) };
    const a = norm(FZ.make({ ...off, FIT, banRisk, setPieceOf, rotationRisk, rankScore, interp })());
    const b = norm(buildRecommendations(off));
    ok(a === b, `frysta = nuverandi thegar felldu lidirnir eru slokktir (${name})`);
    if (a === b) same++;
    /* OG NEIKVAEDA FULLYRDINGIN HVILIR A JAKVAEDRI (CLAUDE.md 5b regla 2):
       med lidina KVEIKTA verda utgafurnar ad vera OLIKAR — annars vaeri
       "slokkt" merkingarlaust og kaflinn maeldi ekkert.                  */
    const live = norm(FZ.make({ ...D, FIT, banRisk, setPieceOf, rotationRisk, rankScore, interp })());
    if (live !== norm(buildRecommendations(D))) diffWhenLive++;
  }
  ok(same === cases.length, "ALLAR svidsmyndir bita-eins", `${same}/${cases.length}`);
  ok(diffWhenLive === cases.length, "med lidina KVEIKTA eru utgafurnar olikar (slokkvunin gerir raunverulegt gagn)",
     `${diffWhenLive}/${cases.length}`);
}

/* ============================================================
   3. MAELDIR LIDIR LIFA — tviburar sem eru olikir i EINU
   ============================================================ */
console.log("\n3. MAELDIR LIDIR");
const D0 = inputs();
const scoreOfId = (D, id) => {
  const R = buildRecommendations(D);
  return R.advisorById[id] ? (R.inSquadScores?.[id] ?? null) : null;
};
/* Einn leikmadur i einu, i lidinu svo `inSquadScores` beri toluna. */
function twinScore(base, mutate) {
  const p0 = base.players.find(p => p.element_type === 3 && p.status === "a" && p.now_cost > 50
    && (base.fixByTeamGw[p.team] || {})[base.gw]);
  const p1 = { ...p0, ...mutate };
  const D = { ...base, players: [p1], squadIds: new Set([p1.id]),
    spRanks: mutate.__pen ? new Map([[p1.id, [{ key: "pen", rank: 1 }]]]) : new Map() };
  const R = buildRecommendations(D);
  return { id: p1.id, score: R.inSquadScores[p1.id], avail: R.advisorById[p1.id].avail };
}
{
  const base = { ...D0, formFeat: null };                 // forleiks-greinin
  const a = twinScore(base, { penalties_order: 1, __pen: true });
  const b = twinScore(base, { penalties_order: null });
  const mult = UNMEASURED_UI.availFloor + UNMEASURED_UI.availSlope * a.avail;
  ok(near(a.score - b.score, +(MEASURED_ADJ.penTaker * mult).toFixed(2), 0.011),
     "vitaskyttu-bonusinn er nakvaemlega MEASURED_ADJ.penTaker",
     `mismunur ${(a.score - b.score).toFixed(2)}, vaent ${(MEASURED_ADJ.penTaker * mult).toFixed(2)}`);
  ok(MEASURED_ADJ.penTaker === 2.2, "penTaker er 2,2 (maelt: topp-4 +1,221 CI [0,680 , 1,739])");
}
{
  const base = { ...D0, formFeat: null };
  const a = twinScore(base, { ep_next: "5.0" });
  const b = twinScore(base, { ep_next: "0.0" });
  const mult = UNMEASURED_UI.availFloor + UNMEASURED_UI.availSlope * a.avail;
  const want = 5 * MEASURED_ADJ.epWeight * (base.recRange / 5) * mult;
  ok(near(a.score - b.score, want, 0.011), "ep-vogin er nakvaemlega MEASURED_ADJ.epWeight",
     `mismunur ${(a.score - b.score).toFixed(2)}, vaent ${want.toFixed(2)}`);
  ok(MEASURED_ADJ.epWeight === 1.2, "epWeight er 1,2 (maelt: topp-15 +2,002 CI [1,608 , 2,385])");
}
ok(PER90_MIN_MINUTES === 400 && /OVIRKUR VARNAGLI, EKKI VOG/.test(SRC),
   "minutu-throskuldurinn er YFIRLYSTUR ovirkur, ekki seldur sem maeling");

/* ============================================================
   4. FELLDIR LIDIR ERU FARNIR — og mega ekki laumast inn aftur
   ============================================================ */
console.log("\n4. FELLDIR LIDIR");
ok(!/from "\.\/availability\.js"[\s\S]{0,80}banRisk/.test(SRC) && !/\bbanRisk\(/.test(SRC),
   "recommend.js kallar EKKI banRisk");
ok(!/\brotationRisk\(/.test(SRC), "recommend.js kallar EKKI rotationRisk");
ok(!/defcon_opportunity/.test(SRC) && !/\bdcOpp\b(?![^\n]*hadin)/.test(SRC.replace(/\/\*[\s\S]*?\*\//g, "")),
   "recommend.js les EKKI defcon");
{
  /* GW ER OSNERT (D0.gw) — 5-gula threpid gildir adeins TIL umferdar 19,
     svo `gw: 21` hefdi gefid "low" og fullyrdingin hefdi verid tom. */
  const base = { ...D0, formFeat: null, seasonStarted: true, seasonGames: 20 };
  /* BANN: 4 gul = "high" hja banRisk (1 fra 5-threpinu). */
  ok(banRisk({ yellow_cards: 4 }, D0.gw, true)?.level === "high",
     "vidmidid sjalft: 4 gul GEFA \"high\" bann-haettu (fullyrdingin hefur bit)");
  const a = twinScore(base, { yellow_cards: 4 }), b = twinScore(base, { yellow_cards: 0 });
  ok(a.score === b.score, "gul spjold hreyfa skorid EKKI", `${a.score} = ${b.score}`);
  /* ROTERING: 2 byrjanir af 20 = "high". */
  ok(rotationRisk({ starts: 2 }, 20)?.level === "high",
     "vidmidid sjalft: 2 byrjanir af 20 GEFA \"high\" roteringar-haettu");
  const c = twinScore(base, { starts: 2 }), d = twinScore(base, { starts: 20 });
  ok(c.score === d.score, "byrjanir hreyfa skorid EKKI", `${c.score} = ${d.score}`);
}
{
  /* DEFCON: varnarmadur, tvo gerolik defcon_opportunity. */
  const def = D0.players.find(p => p.element_type === 2 && p.status === "a" && (D0.fixByTeamGw[p.team] || {})[D0.gw]);
  const mk = o => buildRecommendations({ ...D0, formFeat: null, players: [def],
    squadIds: new Set([def.id]), spRanks: new Map(),
    dcOpp: { [def.team]: { defcon_opportunity: o } } }).inSquadScores[def.id];
  ok(mk(10) === mk(95), "DefCon-taekifaeri hreyfir skorid EKKI", `${mk(10)} = ${mk(95)}`);
}
ok(!/now_cost \?\? 45/.test(SRC), "tvitekna 4,5-sjalfgildid er farid (model.js a thad)");
ok(!/homeShare/.test(SRC) && !/homeShare/.test(APP), "daudi `homeShare` er farinn");

/* ============================================================
   5. OMAELDU TOLURNAR ERU YFIRLYSTAR
   ============================================================ */
console.log("\n5. YFIRLYSTAR UI-HEURISTIKUR");
ok(/OMAELDAR UI-HEURISTIKUR/.test(SRC) && /ERU VALDAR, EKKI MAELDAR/.test(SRC),
   "hausinn segir BERUM ORDUM ad tiltaekileika-tolurnar seu ekki maeldar");
ok(UNMEASURED_UI.availFloor === 0.35 && UNMEASURED_UI.availSlope === 0.65 && UNMEASURED_UI.unknownChance === 0.5,
   "tolurnar sjalfar eru a einum stad, ekki dreifdar um skrana");
ok(!/0\.35 \+ 0\.65/.test(SRC), "engin hardkodud afritun af golfi/halla i formulunni");
{
  const base = { ...D0, formFeat: null };
  const inj = twinScore(base, { status: "i", chance_of_playing_next_round: 0 });
  const fit = twinScore(base, { status: "a", chance_of_playing_next_round: 100 });
  ok(inj.avail === 0 && fit.avail === 1, "tiltaekileikinn les stodu og likur");
  ok(inj.score < fit.score, "meiddur madur skorar LAEGRA (bilunin fra 7.8.2026 er enn vardin)",
     `${inj.score} < ${fit.score}`);
  const unk = twinScore(base, { status: "d", chance_of_playing_next_round: null });
  ok(unk.avail === UNMEASURED_UI.unknownChance, "`null` likur eru 0,5, ekki 0 (madurinn hverfur ekki)");
}

/* ============================================================
   6. MAELINGIN SJALF — ENDURKEYRD A COMMITTUDUM GOGNUM
   Ef eitthvad af thessu snyst vid a hofnunin ad endurskodast, og tha a
   vordurinn ad SEGJA THAD, ekki thegja. Sama hlutverk og
   `travel-measure.mjs`: hann fellur ef hafnada merkid verdur marktaekt.
   ============================================================ */
console.log("\n6. MAELINGIN — HELDUR HOFNUNIN?");
{
  const PG = J("fpl_player_gw.json");
  const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
  const ptsAt = new Map(), xpAt = new Map(), cum = new Map();
  for (const [s, list] of Object.entries(PG.seasons)) {
    for (const q of list) {
      ptsAt.set(`${s}|${q[H.name]}|${q[H.round]}`, q[H.pts]);
      xpAt.set(`${s}|${q[H.name]}|${q[H.round]}`, q[H.xP]);
    }
    const by = {}; for (const q of list) (by[q[H.name]] ||= []).push(q);
    for (const [nm, a] of Object.entries(by)) {
      a.sort((x, y) => x[H.round] - y[H.round]);
      let yc = 0, st = 0, n = 0;
      for (const q of a) { cum.set(`${s}|${nm}|${q[H.round]}`, { yc, starts: st, played: n });
        yc += q[H.yc] || 0; st += (q[H.starts] >= 1 ? 1 : 0); n++; }
    }
  }
  const rows = buildPanel();
  for (const r of rows) {
    let s = 0; for (let k = 0; k < 5; k++) s += ptsAt.get(`${r.season}|${r.name}|${r.round + k}`) ?? 0;
    r.pts5fwd = s;
    r.ep = xpAt.get(`${r.season}|${r.name}|${r.round}`) ?? 0;
    const c = cum.get(`${r.season}|${r.name}|${r.round}`) || { yc: 0, starts: 0, played: 1 };
    r.banLevel = banRisk({ yellow_cards: c.yc }, r.round, true)?.level ?? "none";
    r.rotLevel = rotationRisk({ starts: c.starts }, Math.max(1, c.played))?.level ?? "none";
  }
  ok(rows.length > 40000, "panell byggdur", `${rows.length} spiladar radir`);
  /* GRUNNSKORID — FIT-taflan. `r.fdr` ER EKKI TIL a panel-rodum (buildPanel
     afritar hana aldrei af leiknum), svo FFDR er notud; kafli 4 i CLAUDE.md
     maeldi thau HNIFJOFN. Fyrsta utgafa thessarar maelingar las `r.fdr`,
     fekk NaN a ollum 126.730 rodunum, og `sort` med NaN skilar rodinni
     OHREYFDRI — svo hver einasti delta maeldist 0,000 og leit ut eins og
     hrein nidurstada. Thess vegna er NaN-vordurinn her.                   */
  const fitRaw = r => { const w = FIT[r.code] || FIT[3];
    return w.bias + w.mins5 * (r.mins5 / 90) + w.pts5 * r.ppg5 + w.xgi90 * (r.xg90 + r.xa90)
         + w.bps90 * r.bps90 + w.price * r.price + w.fdr * r.ffdr; };
  ok(rows.every(r => Number.isFinite(fitRaw(r))), "MAELITAEKID: fitRaw er endanlegt a OLLUM rodum");
  const decide = (rs, pred, N) => {
    const byGw = {}; rs.forEach((r, i) => (byGw[`${r.season}|${r.round}`] ||= []).push(i));
    const per = [];
    for (const ix of Object.values(byGw)) { if (ix.length < 30) continue;
      per.push(mean([...ix].sort((a, b) => pred[b] - pred[a]).slice(0, N).map(i => rs[i].pts5fwd))); }
    return per;
  };
  const ci = d => { let sd = 20260818; const rnd = () => (sd = (sd * 48271) % 2147483647) / 2147483647;
    const o = []; for (let i = 0; i < 400; i++) { let s = 0; for (let k = 0; k < d.length; k++) s += d[Math.floor(rnd() * d.length)]; o.push(s / d.length); }
    o.sort((a, b) => a - b); return [o[10], o[389]]; };
  const delta = (term, N) => { const a = decide(rows, rows.map(r => fitRaw(r) + term(r)), N), b = decide(rows, rows.map(fitRaw), N);
    const d = a.map((v, i) => v - b[i]); const [lo, hi] = ci(d); return { d: mean(d), lo, hi }; };

  /* (a) BANN-MERKID SNYST VID — thad er astaedan fyrir hofnuninni. */
  const bl = l => mean(rows.filter(r => r.banLevel === l).map(r => r.pts5fwd));
  ok(bl("high") > bl("low") && bl("mid") > bl("low"),
     "bann-merkid snyst enn vid: naerri banni = FLEIRI stig",
     `high ${bl("high").toFixed(2)} · mid ${bl("mid").toFixed(2)} · low ${bl("low").toFixed(2)}`);
  const B = delta(r => r.banLevel === "high" ? -2.5 : r.banLevel === "mid" ? -1 : 0, 15);
  ok(B.hi < 0, "gamli banPen SKADAR enn (CI helst undir null)",
     `${B.d.toFixed(3)} CI [${B.lo.toFixed(3)}, ${B.hi.toFixed(3)}]`);

  /* (b) ROTERINGIN: merkid ER til en lidurinn baetir engu. Vordurinn
         fellur EF hann fer ad baeta einhverju — tha a ad taka hann inn. */
  const rl = l => mean(rows.filter(r => r.rotLevel === l).map(r => r.pts5fwd));
  ok(rl("safe") > rl("high"), "roteringar-merkid ER til (jakvaeda fullyrdingin a undan theirri neikvaedu)",
     `safe ${rl("safe").toFixed(2)} · mid ${rl("mid").toFixed(2)} · high ${rl("high").toFixed(2)}`);
  const Rt = delta(r => r.rotLevel === "high" ? -2 : r.rotLevel === "mid" ? -0.8 : 0, 15);
  ok(Rt.lo <= 0, "gamli rotPen baetir enn ENGU (CI inniheldur null eda er negatift)",
     `${Rt.d.toFixed(3)} CI [${Rt.lo.toFixed(3)}, ${Rt.hi.toFixed(3)}]`);

  /* (c) ep-VOGIN HELDUR — hun er EKKI omaeld tala. */
  const withEp = rows.filter(r => r.ep > 0);
  ok(withEp.length > 20000, "ep (FPL-eigid xP) er til a marktaeku urtaki", `${withEp.length} radir`);
  const a = decide(withEp, withEp.map(r => fitRaw(r) + MEASURED_ADJ.epWeight * r.ep), 15);
  const b = decide(withEp, withEp.map(fitRaw), 15);
  const d = a.map((v, i) => v - b[i]); const [lo, hi] = ci(d);
  ok(lo > 0, "ep-vogin stendur enn (CI utilokar null)", `${mean(d).toFixed(3)} CI [${lo.toFixed(3)}, ${hi.toFixed(3)}]`);

  /* (d) SOLU-RODUNIN: `score` ma ekki vera MARKTAEKT VERRI en rankScore
         innan lids. Vordurinn fellur ef rankScore fer ad vinna. */
  const rankRaw = r => rankScore({ form: r.ppg5, minsPerGame: r.mins5, price: r.price, ffdr: r.ffdr, minsTrend: r.minsTrend });
  const byGw = {}; rows.forEach((r, i) => (byGw[`${r.season}|${r.round}`] ||= []).push(i));
  let sd = 987654321; const rnd = () => (sd = (sd * 48271) % 2147483647) / 2147483647;
  const per = [];
  for (const ix of Object.values(byGw)) {
    if (ix.length < 60) continue;
    const pool = [...ix].sort((x, y) => rows[y].mins5 - rows[x].mins5).slice(0, 120);
    let A = 0, Bb = 0; const it = 40;
    for (let t = 0; t < it; t++) {
      const cp = [...pool], sq = [];
      for (let j = 0; j < 15 && cp.length; j++) sq.push(cp.splice(Math.floor(rnd() * cp.length), 1)[0]);
      const bot = p => [...sq].sort((x, y) => p(rows[x]) - p(rows[y])).slice(0, 2);
      A += mean(bot(fitRaw).map(i => rows[i].pts5fwd));
      Bb += mean(bot(rankRaw).map(i => rows[i].pts5fwd));
    }
    per.push(A / it - Bb / it);
  }
  const [slo, shi] = ci(per);
  ok(slo <= 0, "solu-rodunin: `rankScore` er EKKI marktaekt betri en `score` innan lids",
     `delta(score-rank) ${mean(per).toFixed(3)} CI [${slo.toFixed(3)}, ${shi.toFixed(3)}]`);
}

/* ============================================================
   VALFRJALST: --pen  (tharf net, thvi EKKI i `npm test`)
   ============================================================ */
if (process.argv.includes("--pen")) {
  console.log("\n7. VITASKYTTU-MAELINGIN (sott yfir net)");
  const RAW = { "2122":"2021-22", "2223":"2022-23", "2324":"2023-24", "2425":"2024-25" };
  const cells = l => { const o = []; let c = "", q = false;
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === "," && !q) { o.push(c); c = ""; } else c += ch; }
    o.push(c); return o; };
  const takers = k => {
    const txt = execSync(`curl -sf "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/${RAW[k]}/players_raw.csv"`, { encoding: "utf8", maxBuffer: 64e6 });
    const L = txt.split("\n"), h = L[0].split(",");
    const iO = h.indexOf("penalties_order"), iT = h.indexOf("team"), iF = h.indexOf("first_name"), iS = h.indexOf("second_name");
    const byTeam = {};
    for (const l of L.slice(1)) { if (!l.trim()) continue; const c = cells(l);
      const o = parseInt(c[iO], 10); if (!Number.isFinite(o)) continue;
      (byTeam[c[iT]] ||= []).push({ name: `${c[iF]} ${c[iS]}`.trim(), o }); }
    const set = new Set();
    for (const v of Object.values(byTeam)) { const lo = v.reduce((a, x) => Math.min(a, x.o), 99); v.forEach(x => { if (x.o === lo) set.add(x.name); }); }
    return set;
  };
  console.log("  (lokastada FYRRA timabils notud a thad naesta — sama timabil vaeri leki)");
  for (const [s, prev] of [["2223","2122"],["2324","2223"],["2425","2324"],["2526","2425"]])
    console.log(`  ${s} <- ${prev}: ${takers(prev).size} vitaskyttur`);
}

/* ============================================================
   MAELITAEKID SJALFT — `r.fdr` MA ALDREI VERA ThOGULT undefined

   Fyrsta maelingin i thessari lotu las `r.fdr` af panel-rodum. Hun var
   `undefined` a ollum 126.730 rodum (leikja-hluturinn bar hana, RODIN
   ekki), svo samanburdurinn fekk NaN — og `Array.sort` med NaN SKILUR
   RODINA OSNERTA. Hver einasti delta maeldist thvi NAKVAEMLEGA 0,000 og
   las eins og hreint null-svar. Su tala var naerri thvi trud.
   Reitirnir eru nu badir a rodinni og ThESSI VORDUR VER ThAD: baedi ad
   their seu TOLUR og ad their seu EKKI SAMI HLUTURINN (annars vaeri
   hægt ad "laga" gildruna med thvi ad afrita ffdr i fdr).
   ============================================================ */
{
  const rows = buildPanel({ includeBlanks: false });
  ok(rows.length > 1000, `forsenda: panel-radir til ad maela (${rows.length})`);
  const badFdr = rows.filter(r => !Number.isFinite(r.fdr)).length;
  const badFfdr = rows.filter(r => !Number.isFinite(r.ffdr)).length;
  ok(badFdr === 0, `hver rod ber TOLULEGT \`fdr\` (${badFdr} an thess)`);
  ok(badFfdr === 0, `hver rod ber TOLULEGT \`ffdr\` (${badFfdr} an thess)`);
  const vals = [...new Set(rows.map(r => r.fdr))].sort((a, b) => a - b);
  ok(vals.length >= 3 && vals[0] >= 1 && vals[vals.length - 1] <= 5,
     `\`fdr\` er opinbera 1-5 kvardinn (${vals.join(",")})`);
  ok(rows.some(r => r.fdr !== r.ffdr),
     "`fdr` og `ffdr` eru EKKI sami hluturinn — inntak a moti utkomu (kafli 3)");
}

console.log(`\nTILLOGU-KERFI: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
