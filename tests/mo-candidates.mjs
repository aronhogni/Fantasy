/* ============================================================
   MO — GETUM VID BAETT HANA? (maelt 29.7.2026)

   Spurningin var: "erum vid med besta studulinn eda ma baeta hann?"
   Thetta svarar henni med maelingu, ekki skodun, og er endurkeyranlegt.

   NYTT VID THESSA MAELINGU (a moti kafla 6d i CLAUDE.md):
     1. FJOGUR timabil, ekki thrju. `data/fpl_player_gw.json` hefur xG fra
        2223. Vogtolurnar i MO_WEIGHTS voru valdar a 2324+2425 og profadar a
        2526 — 2223 er thvi timabil sem THAER HAFA ALDREI SED. Hreint
        ut-af-urtaki prof ofan a thad sem thegar var gert.
     2. Frambodendur sem 6d profadi ALDREI, serstaklega BYRJUNAR-LIKUR
        (kafli 6h). Their eru rokrettasta gatid: mo radar theim sem er
        "kominn a tima", en ef hann sest a bekkinn getur framlagid ekki
        gerst. 6h maeldi ad 21,6% theirra sem byrjudu sidast spila EKKI 60+
        naest — thad er stort gat sem mo hunsar algjorlega.

   ADFERD (sama og 6d svo tolurnar seu samanburdarhaefar):
     markhopur:  <=1 framlag (mork+assist) sidustu 4 umferdir OG >=180 min
     markmid:    (a) mork+assist naestu 4 umferdir  (b) STIG naestu 4
     maelikvardi: LYFTING = medaltal efsta tiundarhlutans / medaltal allra
     tvofold umferd er LOGD SAMAN i eina umferd (spurningin er um UMFERD)

   Allar tunadar utgafur eru LOSO-krossprofadar: vogir valdar a hinum
   timabilunum, maelt a thvi sem er haldid eftir. Annars maeli eg bara
   hversu vel eg get fittad havada.
   ============================================================ */
import { readFileSync } from "node:fs";
import { MO_WEIGHTS, START_MODEL, moScore } from "../src/stats.js";

const REPO = new URL("../", import.meta.url);
const raw = JSON.parse(readFileSync(new URL("data/fpl_player_gw.json", REPO).pathname, "utf8"));
const H = raw.header, ix = {}; H.forEach((k, i) => ix[k] = i);
const N = v => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/* ---------- byggja per-leikmann per-UMFERD seriu ---------- */
/* Nafn+lid er lykillinn: nofn eru ekki einkvaem yfir lid, og leikmadur sem
   faerist milli lida a tímabili er tvo adskildar seriur — thad er rett hér,
   thvi glugginn a ad maela astandid i thvi lidi sem hann spilar med.      */
function seriesFor(rows) {
  const by = new Map();
  for (const r of rows) {
    const key = r[ix.name] + "|" + r[ix.team];
    const rd = r[ix.round];
    if (!by.has(key)) by.set(key, new Map());
    const m = by.get(key);
    const cur = m.get(rd) || { mins:0, goals:0, assists:0, xg:0, xa:0, threat:0,
                               creat:0, pts:0, starts:0, value:0, games:0 };
    cur.mins    += N(r[ix.mins]);
    cur.goals   += N(r[ix.goals]);
    cur.assists += N(r[ix.assists]);
    cur.xg      += N(r[ix.xg]);
    cur.xa      += N(r[ix.xa]);
    cur.threat  += N(r[ix.threat]);
    cur.creat   += N(r[ix.creat]);
    cur.pts     += N(r[ix.pts]);
    cur.starts  += N(r[ix.starts]);
    cur.value    = N(r[ix.value]);        // verd er astand, ekki summa
    cur.games   += 1;                     // 2 = tvofold umferd
    cur.pos      = r[ix.pos];
    m.set(rd, cur);
  }
  return by;
}

/* ---------- markhopur: hvert sýni er (leikmadur, umferd t) ---------- */
const W = 4, OUT = 4, SW = START_MODEL.window;   // gluggi 4, byrjunar-gluggi 5
function samplesFor(rows) {
  const by = seriesFor(rows);
  const out = [];
  for (const [key, m] of by) {
    const rds = [...m.keys()].sort((a, b) => a - b);
    if (!rds.length) continue;
    const maxR = rds[rds.length - 1];
    for (let t = 1 + SW; t + OUT - 1 <= maxR; t++) {
      /* GLUGGINN — sidustu 4 umferdir fyrir t */
      const win = { mins:0, goals:0, assists:0, xg:0, xa:0, threat:0, creat:0 };
      let seen = 0;
      for (let k = t - W; k <= t - 1; k++) {
        const g = m.get(k); if (!g) continue;
        seen++;
        for (const f of ["mins","goals","assists","xg","xa","threat"]) win[f] += g[f];
        win.creat += g.creat;
      }
      if (seen < W) continue;                       // krefjumst fulls glugga
      const gi = win.goals + win.assists;
      if (gi > 1 || win.mins < 180) continue;       // markhopur 6d

      /* BYRJUNAR-BREYTUR — 5 umferda gluggi, sama skilgreining sem 6h */
      let s5 = 0, m5 = 0, sGames = 0, lastMins = 0, lastStart = 0, val = 0;
      const mseq = [];
      for (let k = t - SW; k <= t - 1; k++) {
        const g = m.get(k); if (!g) continue;
        sGames++; s5 += g.starts > 0 ? 1 : 0; m5 += g.mins; mseq.push(g.mins);
        lastMins = g.mins; lastStart = g.starts > 0 ? 1 : 0; val = g.value || val;
      }
      if (sGames < SW) continue;
      const half = Math.floor(mseq.length / 2);
      const trend = (mseq.slice(half).reduce((a,b)=>a+b,0) / Math.max(1, mseq.length-half))
                  - (mseq.slice(0,half).reduce((a,b)=>a+b,0) / Math.max(1, half));

      /* UTKOMAN — naestu 4 umferdir */
      let giN = 0, ptsN = 0, have = 0;
      for (let k = t; k <= t + OUT - 1; k++) {
        const g = m.get(k); if (!g) continue;
        have++; giN += g.goals + g.assists; ptsN += g.pts;
      }
      if (have < OUT) continue;

      out.push({ key, t, pos: m.get(t - 1)?.pos, win,
                 starts5: s5 / SW, mins5: m5 / SW, trend, started_last: lastStart,
                 value: val, giN, ptsN });
    }
  }
  return out;
}

/* ---------- studlar ---------- */
const unluckyOf = w => Math.max(0, w.xg - w.goals);
const mo = (w, k = MO_WEIGHTS) =>
  k.xg * w.xg + k.threat * (w.threat / k.threat_scale) + k.unlucky * unluckyOf(w);

/* byrjunar-likur — sama logistiska likan sem 6h festi i START_MODEL */
function startProb(s) {
  let z = START_MODEL.bias;
  for (const term of START_MODEL.terms) z += term.w * ((s[term.key] - term.mu) / term.sd);
  return 1 / (1 + Math.exp(-z));
}

/* ---------- lyfting efsta tiundarhlutans ---------- */
function lift(rows, score, outcome) {
  const scored = rows.map(r => ({ s: score(r), y: outcome(r) }))
                     .filter(r => Number.isFinite(r.s));
  if (scored.length < 50) return null;
  const base = scored.reduce((a, r) => a + r.y, 0) / scored.length;
  if (!base) return null;
  scored.sort((a, b) => b.s - a.s);
  const n = Math.max(1, Math.round(scored.length / 10));
  const top = scored.slice(0, n).reduce((a, r) => a + r.y, 0) / n;
  return top / base;
}

/* ============================================================
   FRAMBODENDUR
   ============================================================ */
/* "mo (i notkun)" kallar SHIPPED kodann (moScore ur src/stats.js), ekki
   afrit af formulunni — annars getur profid verid graent medan appid keyrir
   adra formulu. Sama regla sem gildir um model.js.                        */
const CANDS = {
  "mo (i notkun)":        r => moScore({ ...r.win, minutes: r.win.mins }),
  "mo FYRIR 29.7. (xG)":  r => MO_WEIGHTS.xg * r.win.xg
                             + MO_WEIGHTS.threat * (r.win.threat / MO_WEIGHTS.threat_scale)
                             + MO_WEIGHTS.unlucky * unluckyOf(r.win),
  "xG eitt":              r => r.win.xg,
  "xA eitt":              r => r.win.xa,
  "threat eitt":          r => r.win.threat,
  "oheppni ur xGI":       r => MO_WEIGHTS.xg * (r.win.xg + r.win.xa)
                             + MO_WEIGHTS.threat * (r.win.threat / MO_WEIGHTS.threat_scale)
                             + MO_WEIGHTS.unlucky * Math.max(0, (r.win.xg + r.win.xa)
                                 - (r.win.goals + r.win.assists)),
  "mo x byrjunarlikur":   r => moScore({ ...r.win, minutes: r.win.mins }) * startProb(r),
  "mo / min (per 90)":    r => r.win.mins > 0
                             ? moScore({ ...r.win, minutes: r.win.mins }) / r.win.mins * 90 : NaN,
  "mo an oheppnis":       r => MO_WEIGHTS.xg * (r.win.xg + r.win.xa)
                             + MO_WEIGHTS.threat * (r.win.threat / MO_WEIGHTS.threat_scale),
};

const SEASONS = Object.entries(raw.seasons)
  .map(([sn, rows]) => [sn, samplesFor(rows)])
  .filter(([sn, s]) => s.length > 200 && s.some(r => r.win.xg > 0));   // 2122 hefur ekkert xG

const LBL = { "2223":"2022-23", "2324":"2023-24", "2425":"2024-25", "2526":"2025-26" };
const fmt = v => v == null ? "  —  " : v.toFixed(3);

let pass = 0, fail = 0;
const ok = (name, cond, extra="") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

for (const [target, outcome, tlabel] of
     [["gi", r => r.giN, "MORK+ASSIST naestu 4"], ["pts", r => r.ptsN, "STIG naestu 4"]]) {
  console.log(`\n================ MARKMID: ${tlabel} ================`);
  const head = SEASONS.map(([sn]) => LBL[sn].padStart(9)).join("");
  console.log("studull".padEnd(24) + head + "   medaltal");
  const means = {};
  for (const [name, fn] of Object.entries(CANDS)) {
    const per = SEASONS.map(([, s]) => lift(s, fn, outcome));
    const good = per.filter(v => v != null);
    const mean = good.length ? good.reduce((a,b)=>a+b,0) / good.length : null;
    means[name] = { mean, per };
    console.log(name.padEnd(24) + per.map(v => fmt(v).padStart(9)).join("") +
                "   " + fmt(mean));
  }
  /* Vinnur mo? Og hversu oft? */
  const base = means["mo (i notkun)"];
  for (const [name, v] of Object.entries(means)) {
    if (name === "mo (i notkun)" || v.mean == null) continue;
    const wins = v.per.filter((x, i) => x != null && base.per[i] != null && x > base.per[i]).length;
    const tot  = v.per.filter((x, i) => x != null && base.per[i] != null).length;
    const d = v.mean - base.mean;
    if (d > 0) console.log(`     ^ "${name}" slaer mo um ${d.toFixed(3)} (${wins}/${tot} timabil)`);
  }
  console.log(`  n per timabil: ${SEASONS.map(([, s]) => s.length).join(" · ")}`);
  globalThis[`__${target}`] = means;
}

/* ============================================================
   VORDUR: vogtolurnar i notkun ma ekki vera SLEGNAR merkjanlega
   ============================================================ */
console.log("\n================ VORDUR ================");
const gi = globalThis.__gi, pts = globalThis.__pts;
const beatenBy = Object.entries(gi)
  .filter(([n, v]) => n !== "mo (i notkun)" && v.mean != null
                   && v.mean - gi["mo (i notkun)"].mean > 0.15
                   && v.per.filter((x,i)=>x>gi["mo (i notkun)"].per[i]).length
                      >= Math.ceil(SEASONS.length * 0.75))
  .map(([n]) => n);
ok("enginn frambodandi slaer mo um >0,15 i >=3/4 timabilum", beatenBy.length === 0,
   beatenBy.join(", "));
ok("mo slaer xG eitt (rokstudningur samsetningarinnar)",
   gi["mo (i notkun)"].mean > gi["xG eitt"].mean,
   `${fmt(gi["mo (i notkun)"].mean)} vs ${fmt(gi["xG eitt"].mean)}`);
/* AFTURFOR-VORDUR: ef einhver skilar magnlidnum i xG eitt fellur thetta. */
ok("xGI-utgafan slaer thá sem var fyrir 29.7. (xG eitt) a badum markmidum",
   gi["mo (i notkun)"].mean > gi["mo FYRIR 29.7. (xG)"].mean
   && pts["mo (i notkun)"].mean > pts["mo FYRIR 29.7. (xG)"].mean,
   `gi ${fmt(gi["mo (i notkun)"].mean)}/${fmt(gi["mo FYRIR 29.7. (xG)"].mean)} · ` +
   `pts ${fmt(pts["mo (i notkun)"].mean)}/${fmt(pts["mo FYRIR 29.7. (xG)"].mean)}`);
/* xA EITT ma ekki sla samsetninguna — annars er magnlidurinn bara xA. */
ok("xA eitt slaer EKKI mo (abatinn er samlegd, ekki xA eitt)",
   gi["mo (i notkun)"].mean > gi["xA eitt"].mean,
   `${fmt(gi["mo (i notkun)"].mean)} vs ${fmt(gi["xA eitt"].mean)}`);
ok("mo hefur lyftingu yfir 2,0 a badum markmidum",
   gi["mo (i notkun)"].mean > 2.0 && pts["mo (i notkun)"].mean > 1.2,
   `gi ${fmt(gi["mo (i notkun)"].mean)} · pts ${fmt(pts["mo (i notkun)"].mean)}`);
ok("2022-23 (ut af urtaki fyrir vogirnar) heldur", gi["mo (i notkun)"].per[0] > 1.8,
   fmt(gi["mo (i notkun)"].per[0]));

/* ============================================================
   BOOTSTRAP — er breytingin merkjanleg eda er hun 4 punktar af havada?
   Endursyni er KLASAD PER LEIKMANN: sami leikmadur birtist i morgum
   umferdum og ma ekki teljast sem sjalfstaett syni, annars verdur CI-id
   of thröngt og allt lítur marktaekt ut. Fast seed svo profid se
   endurtakanlegt (Math.random myndi lata thad flokta milli keyrslna).
   ============================================================ */
console.log("\n================ BOOTSTRAP (400 itranir, klasad per leikmann) ================");
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const OLD_MO = CANDS["mo FYRIR 29.7. (xG)"], NEW_MO = CANDS["mo (i notkun)"];
const NO_UNLUCKY = CANDS["mo an oheppnis"];
function bootDiff(better, worse, outcome, iters = 400) {
  const diffs = [];
  for (let it = 0; it < iters; it++) {
    let sum = 0, k = 0;
    for (const [, s] of SEASONS) {
      const byKey = new Map();
      for (const r of s) { if (!byKey.has(r.key)) byKey.set(r.key, []); byKey.get(r.key).push(r); }
      const keys = [...byKey.keys()], boot = [];
      for (let i = 0; i < keys.length; i++) boot.push(...byKey.get(keys[Math.floor(rnd() * keys.length)]));
      const a = lift(boot, better, outcome), b = lift(boot, worse, outcome);
      if (a != null && b != null) { sum += a - b; k++; }
    }
    if (k) diffs.push(sum / k);
  }
  diffs.sort((a, b) => a - b);
  return { mean: diffs.reduce((a,b)=>a+b,0) / diffs.length,
           lo: diffs[Math.floor(0.025*diffs.length)], hi: diffs[Math.floor(0.975*diffs.length)],
           pPos: diffs.filter(d => d > 0).length / diffs.length };
}
for (const [tl, outcome] of [["mork+assist", r => r.giN], ["stig", r => r.ptsN]]) {
  const b = bootDiff(NEW_MO, OLD_MO, outcome);
  console.log(`  ${tl.padEnd(12)} xGI - xG = ${b.mean.toFixed(4)}`
    + `  95% CI [${b.lo.toFixed(4)}, ${b.hi.toFixed(4)}]  P(betri)=${Math.round(b.pPos*100)}%`);
  ok(`bootstrap: xGI-abatinn utilokar null (${tl})`, b.lo > 0,
     `CI [${b.lo.toFixed(4)}, ${b.hi.toFixed(4)}]`);
}
/* Og SAMA prof a thad sem var HAFNAD — svo mælistikan se ein og hin sama.
   "An oheppnis" leit betur ut i punktmati (+0,022) en CI-id spannar null. */
const bu = bootDiff(NO_UNLUCKY, NEW_MO, r => r.giN);
console.log(`  an-oheppnis  - mo  = ${bu.mean.toFixed(4)}`
  + `  95% CI [${bu.lo.toFixed(4)}, ${bu.hi.toFixed(4)}]  P(betri)=${Math.round(bu.pPos*100)}%`);
ok("bootstrap: ad sleppa oheppnis-lid er EKKI merkjanlegt (rettlaetir ad halda honum)",
   bu.lo < 0, `CI [${bu.lo.toFixed(4)}, ${bu.hi.toFixed(4)}]`);

console.log(`\nMO-FRAMBODENDUR: ${pass}/${pass+fail} graen`);
process.exit(fail ? 1 : 0);
