/* ============================================================
   VORDUR: FYRIRLIDA-RADGJOF (`src/captain.js`)

   Tvennt i einu safni, og badir hlutar VERDA ad geta fallid:

   A) EIGINLEIKAR SKORSINS — ad thad se NAKVAEMLEGA `expPoints x
      startProb` og ekkert annad, ad `null` byrjunar-likur utiloki
      ALDREI, ad `0` utiloki, og ad rodunin skili aldrei manni sem
      byrjar ekki.

   B) MAELINGIN SJALF, ENDURKEYRD. Tolurnar i `CAPTAIN_MEASURED` eru
      ekki skrautskrift — thaer eru endurreiknadar her ur
      `data/fpl_player_gw.json` og safnid FELLUR ef thaer reka i sundur.
      Thad er eina leidin til ad hardkodud maeling stadni ekki thegjandi
      (CLAUDE.md kafli 5b: "toma fullyrdingu" og "fost tala um lifandi
      gogn ureldist thegjandi").

   HVERS VEGNA `includeBlanks: true` ER SKILYRDI EN EKKI STILLING:
   med sjalfgefnu laugini (adeins radir med minutum > 0) er madur sem
   sat a bekknum EKKI TIL, svo byrjunar-likurnar gaeta ekki tapad neinu
   og maelingin vaeri sjalfgefid jakvaed. Kafli 0 fullyrdir thvi ad
   laugin innihaldi 0-minutu radir; snuist thad vid er maelingin ekki
   lengur um thad sem hun segist vera.

   VITASPYRNU-KAFLINN (5c) ER OFUGUR VORDUR: hann fellur ef overlay-id
   VERDUR marktaekt. `src/stats.js` bar tooltip sem sagdi rodun a
   vitaspyrnum vera "the strongest single captaincy signal in the data"
   an thess ad nokkur fyrirlida-maeling vaeri til i repo-inu. Talan a
   ad koma ur maelingu; verdi hun jakvaed einn daginn a safnid ad segja
   thad — ekki ad thegja.

   KEYRSLA: node tests/captain.mjs   (~10 s, engin net-koll)
   ============================================================ */
import { readFileSync } from "node:fs";
import { buildPanel, topN } from "./lib/panel.mjs";
import { lookupPos, POS_MEAN_PTS, rankScore } from "../src/model.js";
import { startFeatures, startProbability } from "../src/stats.js";
import { captainScore, rankCaptains, bestCaptain, CAPTAIN_MEASURED } from "../src/captain.js";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`); }
};
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

console.log(`\n${"=".repeat(84)}`);
console.log("FYRIRLIDA-RADGJOF — skorid og maelingin sem rettlaetir thad");
console.log("=".repeat(84));

/* ============================================================
   0. HEIMURINN — panel + threnn gogn sem panel ber ekki
   ============================================================ */
const SEASONS = CAPTAIN_MEASURED.seasons;
const PG = JSON.parse(readFileSync(new URL("../data/fpl_player_gw.json", import.meta.url).pathname, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));

/* Panel ber `startRate` en HUN ER ONYT I 2122: `starts` er 0 i ollum
   25.447 rodum thess timabils. Byrjunar-likurnar eru thvi reiknadar ur
   HRAUM MINUTUM (`START_MODEL` les hvort ed er minutur, ekki starts), sem
   er onaemt fyrir theirri eydu. Sama lykkja saekir eigid xP umferdarinnar
   (thak, ekki inntak), eigin minutur (til ad telja "spiladi ekki") og
   LEKALAUST vitaspyrnu-flagg (adeins pMiss i UMFERDUM A UNDAN).       */
const extra = new Map();
{
  const penSeen = new Set();
  for (const season of Object.keys(PG.seasons)) {
    const byPlayer = {};
    for (const q of PG.seasons[season]) (byPlayer[q[H.name]] ||= []).push(q);
    const penThis = new Map();
    for (const [nm, arr] of Object.entries(byPlayer)) {
      arr.sort((a, b) => a[H.round] - b[H.round]);
      const hist = [];
      for (const q of arr) {
        const k = `${season}|${nm}|${q[H.round]}`;
        const prev = extra.get(k);
        extra.set(k, {
          mins5: hist.slice(-5).map(x => x[H.mins]),
          value: q[H.value],
          xpOwn: q[H.xP] > 0 ? q[H.xP] : (prev?.xpOwn ?? null),
          /* tvofold umferd: minutur leggjast saman */
          minsOwn: (prev?.minsOwn ?? 0) + q[H.mins],
          pen: penSeen.has(nm) || (penThis.get(nm) ?? Infinity) < q[H.round] ? 1 : 0,
        });
        if (q[H.pMiss] && !penThis.has(nm)) penThis.set(nm, q[H.round]);
        hist.push(q);
      }
    }
    for (const nm of penThis.keys()) penSeen.add(nm);
  }
}

const rows = buildPanel({ minHistory: 3, includeBlanks: true })
  .filter(r => SEASONS.includes(r.season));
for (const r of rows) {
  const e = extra.get(`${r.season}|${r.name}|${r.round}`);
  r.xpOwn = e?.xpOwn ?? null;
  r.pen = e?.pen ?? 0;
  r.minsOwn = e?.minsOwn ?? 0;
  const f = startFeatures(e?.mins5 ?? [], e?.value);
  r.sp = f ? startProbability(f) : null;
  /* `expPointsFor`-jafngildid: grunnur x maeldur margfaldari fyrir
     leikjathyngd stodunnar. Tiltaekileiki er EKKI endurbyggjanlegur
     sogulega (engin `status`/`news`) og er thvi 1 — sja takmarkanir. */
  r.fixMult = lookupPos(r.code, "pts", r.ffdr) / (POS_MEAN_PTS[r.code] || 3.4);
  r.expP = r.xP5 * r.fixMult;
  r.rank = rankScore({ form: r.ppg5, minsPerGame: r.mins5, price: r.price,
                       ffdr: r.ffdr, minsTrend: r.minsTrend });
}

console.log("\n=== 0. LAUGIN ===");
ok(`panel byggd (${rows.length} radir, ${SEASONS.length} timabil)`, rows.length >= 100000,
   `adeins ${rows.length}`);
const blanks = rows.filter(r => r.minsOwn === 0).length;
ok(`laugin BER 0-minutu radir (${(100 * blanks / rows.length).toFixed(0)}%) — annars gaeti byrjunar-lidurinn ekki tapad`,
   blanks / rows.length > 0.3, `${blanks} af ${rows.length}`);
ok(`byrjunar-likur reiknadar fyrir allar radir (onaemt fyrir starts=0 i 2122)`,
   rows.every(r => r.sp != null));
ok("2122 er med i lauginni THOTT `starts` se allt-null thar",
   rows.some(r => r.season === "2122"));

/* ============================================================
   1. SKORID — EIGINLEIKAR, EKKI SVIPMYND
   ============================================================ */
console.log("\n=== 1. captainScore: tveir lidir og ekki fleiri ===");
{
  let seed = 987654321;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let bad = 0, monoE = 0, monoP = 0;
  for (let i = 0; i < 500; i++) {
    const e = rnd() * 20, p = rnd();
    if (Math.abs(captainScore({ expPoints: e, startProb: p }) - e * p) > 1e-12) bad++;
    if (captainScore({ expPoints: e + 1, startProb: p }) <= captainScore({ expPoints: e, startProb: p })) monoE++;
    if (p < 0.99 && captainScore({ expPoints: e || 1, startProb: p + 0.01 })
                 <= captainScore({ expPoints: e || 1, startProb: p })) monoP++;
  }
  ok("skorid er NAKVAEMLEGA expPoints x startProb a 500 slembnum inntokum (enginn falinn lidur)", bad === 0, `${bad} fravik`);
  ok("einraent vaxandi i vaentum stigum", monoE === 0);
  ok("einraent vaxandi i byrjunar-likum", monoP === 0);

  /* NULL ER EKKI NULL — CLAUDE.md kafli 8 */
  ok("null byrjunar-likur eru HLUTLAUSAR (1), ekki 0", captainScore({ expPoints: 5, startProb: null }) === 5);
  ok("vantandi svid er lika hlutlaust", captainScore({ expPoints: 5 }) === 5);
  ok("NaN byrjunar-likur eru hlutlausar", captainScore({ expPoints: 5, startProb: NaN }) === 5);
  ok("MAELD nulltala (0) tekur skorid i 0", captainScore({ expPoints: 5, startProb: 0 }) === 0);
  ok("aud umferd (expPoints 0) -> 0", captainScore({ expPoints: 0, startProb: 0.9 }) === 0);
  ok("neikvaed vaent stig -> 0, aldrei neikvaett skor", captainScore({ expPoints: -3, startProb: 0.9 }) === 0);
  ok("likur > 1 eru klipptar", captainScore({ expPoints: 5, startProb: 4 }) === 5);
  ok("likur < 0 eru klipptar", captainScore({ expPoints: 5, startProb: -2 }) === 0);
  ok("ekkert inntak -> 0, ekkert hrun", captainScore() === 0 && captainScore({}) === 0);
  ok("ruslgerdir hrynja ekki", captainScore({ expPoints: "8", startProb: "0.5" }) === 0);
}

/* ============================================================
   2. RODUNIN
   ============================================================ */
console.log("\n=== 2. rankCaptains ===");
{
  const cand = [
    { id: 1, name: "High xP, benched", expPoints: 12, startProb: 0 },
    { id: 2, name: "Solid",            expPoints: 6,  startProb: 0.95 },
    { id: 3, name: "Rotation risk",    expPoints: 9,  startProb: 0.35 },
    { id: 4, name: "Unknown prob",     expPoints: 5,  startProb: null },
    { id: 5, name: "Blank gameweek",   expPoints: 0,  startProb: 0.99 },
  ];
  const r = rankCaptains(cand);
  ok("madur sem BYRJAR EKKI (startProb 0) kemur aldrei ut", !r.some(x => x.id === 1));
  ok("aud umferd kemur aldrei ut", !r.some(x => x.id === 5));
  ok("ovitadar likur DETTA EKKI UT (null-reglan)", r.some(x => x.id === 4));
  ok("haesta skorid er efst", r[0].id === 2, JSON.stringify(r.map(x => [x.id, +x.score.toFixed(2)])));
  ok("rodunin er faellandi", r.every((x, i) => i === 0 || r[i - 1].score >= x.score));
  ok("`startProbKnown` adgreinir ovitad fra maeldu",
     r.find(x => x.id === 4).startProbKnown === false && r.find(x => x.id === 2).startProbKnown === true);
  ok("aukasvid berast obreytt i gegn", rankCaptains([{ name: "x", expPoints: 3, startProb: 1, team: "ARS" }])[0].team === "ARS");
  ok("bestCaptain skilar efsta", bestCaptain(cand).id === 2);

  /* JAFNTEFLI: sama skor, ollugt yfir umrodun inntaksins */
  const tie = [{ name: "Bravo", expPoints: 4, startProb: 1 }, { name: "Alpha", expPoints: 4, startProb: 1 }];
  ok("jafntefli leyst a nafni og er ohad rod inntaksins",
     rankCaptains(tie)[0].name === "Alpha" && rankCaptains([...tie].reverse())[0].name === "Alpha");

  /* HRAKANDI INNTOK */
  ok("tomt fylki -> tomt, bestCaptain null", rankCaptains([]).length === 0 && bestCaptain([]) === null);
  ok("ekki-fylki -> tomt", rankCaptains(null).length === 0 && rankCaptains(undefined).length === 0
     && rankCaptains({ a: 1 }).length === 0);
  ok("null-fardir og ruslfaerslur eru sleppt an hruns",
     rankCaptains([null, undefined, 5, "x", { name: "ok", expPoints: 3, startProb: 1 }]).length === 1);
  ok("aud umferd hja OLLUM -> null fyrirlidi (ekki tilbuinn)",
     bestCaptain([{ name: "a", expPoints: 0 }, { name: "b", expPoints: 0 }]) === null);
  ok("limit virkar", rankCaptains(cand, { limit: 2 }).length === 2);
  ok("limit 0 skilar ollum gildum", rankCaptains(cand).length === 3);
  ok("inntaks-fylkid er ekki bjagad", (() => { const c = [...cand]; rankCaptains(c); return c.length === 5 && c[0].id === 1; })());
}

/* ============================================================
   3. BAKPROFID — 174 UMFERDIR, ALLAR VIDMIDANIR
   ============================================================ */
const byGw = {};
rows.forEach((r, i) => (byGw[`${r.season}|${r.round}`] ||= []).push(i));
const GWS = Object.entries(byGw).filter(([, ix]) => ix.length >= 30);
const argmax = (pred, ix) => { let b = ix[0]; for (const i of ix) if (pred[i] > pred[b]) b = i; return b; };
function evaluate(f, filter = null) {
  const pred = rows.map(f), out = [];
  for (const [key, ix0] of GWS) {
    const ix = filter ? ix0.filter(i => filter(rows[i])) : ix0;
    if (ix.length < 10) continue;
    const r = rows[argmax(pred, ix)];
    const s = [...ix0].map(i => rows[i].pts).sort((a, b) => b - a);
    out.push({ season: key.split("|")[0], pts: r.pts, top3: r.pts >= s[2] ? 1 : 0, dnp: r.minsOwn === 0 ? 1 : 0 });
  }
  return { pts: out.map(x => x.pts), mean: mean(out.map(x => x.pts)), sd: sd(out.map(x => x.pts)),
           top3: mean(out.map(x => x.top3)), haul: mean(out.map(x => x.pts >= 10 ? 1 : 0)),
           blank: mean(out.map(x => x.pts <= 2 ? 1 : 0)), dnp: out.reduce((a, x) => a + x.dnp, 0),
           n: out.length, rowsOut: out };
}
const SC = {
  naivePrice: r => r.price,
  epNextOnly: r => r.xP5,
  expPoints:  r => r.expP,
  rankScore:  r => r.rank,
  /* SKORID SJALFT — safnid maelir MODULINN, ekki eftirlikingu af honum */
  CAPTAIN:    r => captainScore({ expPoints: r.expP, startProb: r.sp }),
  oracle:     r => r.pts,
};
const R = Object.fromEntries(Object.entries(SC).map(([k, f]) => [k, evaluate(f)]));

console.log("\n=== 3. BAKPROF (N=1 per umferd) ===");
console.log("  skor".padEnd(24) + "stig    sd   topp-3   10+    <=2   0 min");
for (const [k, v] of Object.entries(R))
  console.log("  " + k.padEnd(22) + v.mean.toFixed(2).padStart(5) + v.sd.toFixed(2).padStart(7)
    + (100 * v.top3).toFixed(1).padStart(8) + "%" + (100 * v.haul).toFixed(1).padStart(6) + "%"
    + (100 * v.blank).toFixed(1).padStart(6) + "%" + String(v.dnp).padStart(6) + `/${v.n}`);

/* FPL-EIGID xP — THAK, EKKI KEPPINAUTUR. Sott EFTIR ad umferdin klarast
   (data/SCHEMA.md), svo thad er leki sem inntak. Thekjan er strjal i
   2025/26, svo thad er maelt a theim umferdum thar sem >=50% rada hafa
   xP — annars maelist "thakid" a 4.475 rodum og les LAEGRA en CAPTAIN,
   sem vaeri nidurstada um thekju en ekki um spa.                       */
const cov = GWS.map(([, ix]) => ix.filter(i => rows[i].xpOwn != null).length / ix.length);
const xpFull = evaluate(r => r.xpOwn ?? -1);
const keep = cov.map(c => c >= 0.5);
const sub = a => a.filter((_, i) => keep[i]);
const xpSub = mean(sub(xpFull.pts)), capSub = mean(sub(R.CAPTAIN.pts)), naiSub = mean(sub(R.naivePrice.pts));
console.log(`\n  FPL-eigid xP (POST-HOC thak, ${sub(xpFull.pts).length} umferdir med >=50% thekju): ${xpSub.toFixed(2)}`);
console.log(`  ... a SOMU umferdum: CAPTAIN ${capSub.toFixed(2)} · naiv ${naiSub.toFixed(2)}`);

ok(`nog umferdir maeldar (${R.CAPTAIN.n})`, R.CAPTAIN.n >= 150, `adeins ${R.CAPTAIN.n}`);
ok(`fjoldi umferda stemmir vid skjalfesta tolu (${CAPTAIN_MEASURED.gameweeks})`,
   R.CAPTAIN.n === CAPTAIN_MEASURED.gameweeks, `maelt ${R.CAPTAIN.n}`);
ok("post-hoc thakid er HAERRA en spain (annars vaeri thakid rangt reiknad)", xpSub > capSub,
   `xP ${xpSub.toFixed(2)} vs CAPTAIN ${capSub.toFixed(2)}`);

/* SAMA TALA UR REPO-HJALPINNI. `topN(rows, pred, 1)` er akvordunin eins
   og hun er skilgreind annars stadar i repo-inu; faum vid adra tolu ur
   okkar eigin lykkju erum vid ad maela annad verkefni.                 */
{
  const t = topN(rows, rows.map(SC.CAPTAIN), 1);
  ok("okkar lykkja og `topN(...,1)` ur panel.mjs gefa somu tolu",
     near(t.got, R.CAPTAIN.mean, 0.02), `topN ${t.got.toFixed(3)} vs ${R.CAPTAIN.mean.toFixed(3)}`);
}

/* SKJALFESTU TOLURNAR VERDA AD STEMMA */
console.log("\n=== 3b. `CAPTAIN_MEASURED` a moti endurreikningi ===");
const M = CAPTAIN_MEASURED;
ok(`meanPoints ${M.meanPoints} ~ ${R.CAPTAIN.mean.toFixed(2)}`, near(M.meanPoints, R.CAPTAIN.mean, 0.15));
ok(`sd ${M.sd} ~ ${R.CAPTAIN.sd.toFixed(2)}`, near(M.sd, R.CAPTAIN.sd, 0.15));
ok(`top3Rate ${M.top3Rate} ~ ${R.CAPTAIN.top3.toFixed(3)}`, near(M.top3Rate, R.CAPTAIN.top3, 0.02));
ok(`haulRate ${M.haulRate} ~ ${R.CAPTAIN.haul.toFixed(3)}`, near(M.haulRate, R.CAPTAIN.haul, 0.02));
ok(`blankRate ${M.blankRate} ~ ${R.CAPTAIN.blank.toFixed(3)}`, near(M.blankRate, R.CAPTAIN.blank, 0.02));
ok(`didNotPlay ${M.didNotPlay} ~ ${R.CAPTAIN.dnp}`, Math.abs(M.didNotPlay - R.CAPTAIN.dnp) <= 2);
for (const [k, b] of Object.entries(M.baselines)) {
  if (k === "fplXpPostHoc") { ok(`vidmid ${k} ${b.meanPoints} ~ ${xpSub.toFixed(2)}`, near(b.meanPoints, xpSub, 0.2)); continue; }
  ok(`vidmid ${k} ${b.meanPoints} ~ ${R[k].mean.toFixed(2)}`, near(b.meanPoints, R[k].mean, 0.15));
  if (b.didNotPlay != null) ok(`vidmid ${k} didNotPlay ${b.didNotPlay} ~ ${R[k].dnp}`, Math.abs(b.didNotPlay - R[k].dnp) <= 2);
}

/* ============================================================
   4. TILTAEKILEIKINN ER MERKID — "spiladi ekki" per vidmidi
   ============================================================ */
console.log("\n=== 4. hversu oft var valdi madurinn EKKI a vellinum? ===");
ok(`CAPTAIN (${R.CAPTAIN.dnp}/${R.CAPTAIN.n}) velur sjaldnar mann sem spiladi ekki en naiva vidmidid (${R.naivePrice.dnp})`,
   R.CAPTAIN.dnp < R.naivePrice.dnp);
ok(`CAPTAIN (${R.CAPTAIN.dnp}/${R.CAPTAIN.n}) er lika undir expPoints einu (${R.expPoints.dnp}) — thad er byrjunar-lidurinn ad vinna`,
   R.CAPTAIN.dnp < R.expPoints.dnp);

/* ============================================================
   5. LIDIRNIR — BOOTSTRAP 400, KLASAD PER LEIKMANN
   Sami maelikvardi og `tests/mo-candidates.mjs`: vidurkenndur lidur
   verdur ad hafa CI sem UTILOKAR NULL.
   ============================================================ */
const byPlayer = new Map();
rows.forEach((r, i) => { const a = byPlayer.get(r.name); if (a) a.push(i); else byPlayer.set(r.name, [i]); });
const players = [...byPlayer.keys()];
const gwKey = rows.map(r => `${r.season}|${r.round}`);
function bootDelta(fA, fB, iters = 400) {
  const pa = rows.map(fA), pb = rows.map(fB);
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out = [];
  for (let it = 0; it < iters; it++) {
    const g = new Map();
    for (let k = 0; k < players.length; k++)
      for (const i of byPlayer.get(players[Math.floor(rnd() * players.length)])) {
        const a = g.get(gwKey[i]); if (a) a.push(i); else g.set(gwKey[i], [i]);
      }
    const A = [], B = [];
    for (const ix of g.values()) {
      if (ix.length < 30) continue;
      A.push(rows[argmax(pa, ix)].pts); B.push(rows[argmax(pb, ix)].pts);
    }
    if (A.length) out.push(mean(A) - mean(B));
  }
  out.sort((a, b) => a - b);
  return { d: mean(out), lo: out[Math.floor(0.025 * out.length)], hi: out[Math.floor(0.975 * out.length)] };
}
const show = (l, b) => `${l}: ${b.d >= 0 ? "+" : ""}${b.d.toFixed(3)}  95% CI [${b.lo.toFixed(3)}, ${b.hi.toFixed(3)}]`;

console.log("\n=== 5. LIDIRNIR (bootstrap 400, klasad per leikmann) ===");
const cap = r => captainScore({ expPoints: r.expP, startProb: r.sp });

/* 5a — byrjunar-likurnar VERDA ad utiloka null, annars a skorid ekki
   ad bera thaer. Thetta er lidurinn sem skrain baetti vid.            */
{
  const b = bootDelta(cap, r => r.expP);
  console.log("  " + show("startProb-lidurinn", b));
  ok("startProb-lidurinn utilokar null (rettlaetir ad hann se i skorinu)", b.lo > 0,
     `[${b.lo.toFixed(3)}, ${b.hi.toFixed(3)}]`);
  ok(`skjalfest tala ${M.terms.startProb.delta} ~ ${b.d.toFixed(3)}`, near(M.terms.startProb.delta, b.d, 0.15));
}
/* 5b — naiva vidmidid. Slaum vid thad yfirleitt? */
{
  const b = bootDelta(cap, r => r.price);
  console.log("  " + show("CAPTAIN - naiv dyrasti", b));
  ok("CAPTAIN slaer naiva vidmidid og CI utilokar null", b.lo > 0,
     `[${b.lo.toFixed(3)}, ${b.hi.toFixed(3)}] — EF THETTA FELLUR: birtu thad, ekki stilltu skorid`);
  ok(`skjalfest tala ${M.vsNaive.delta} ~ ${b.d.toFixed(3)}`, near(M.vsNaive.delta, b.d, 0.2));
}
/* 5c — VITASPYRNU-OVERLAY. OFUGUR VORDUR: fellur ef thad VERDUR marktaekt. */
{
  const flagged = rows.filter(r => r.pen);
  const names = new Set(flagged.map(r => r.name));
  console.log(`  vitaspyrnu-flagg: ${flagged.length} radir · ${names.size} leikmenn (lekalaus audkenning: pMiss i FYRRI umferd)`);
  ok(`flaggid er raunverulega til stadar en STRJALT (${names.size} leikmenn) — audkenningin er takmorkunin, ekki merkid`,
     names.size >= 20 && flagged.length / rows.length < 0.10);
  let anySignificant = null;
  for (const [w, key] of [[0.10, "penalties10"], [0.25, "penalties25"], [0.50, "penalties50"]]) {
    const b = bootDelta(r => cap(r) * (1 + w * r.pen), cap);
    console.log("  " + show(`vitaspyrnu-overlay w=${w}`, b));
    ok(`skjalfest tala ${M.terms[key].delta} ~ ${b.d.toFixed(3)} (w=${w})`, near(M.terms[key].delta, b.d, 0.15));
    if (b.lo > 0) anySignificant = `w=${w}: [${b.lo.toFixed(3)}, ${b.hi.toFixed(3)}]`;
  }
  ok("vitaspyrnu-overlay er ENN ogreinanlegt fra null — rettlaetir ad thad se UTAN skorsins",
     anySignificant === null,
     anySignificant ? `ORDID MARKTAEKT (${anySignificant}) — ENDURSKODADU ad sleppa thvi, og skrifadu maelinguna` : "");
}
/* 5d — LEIKJATHYNGDIN inni i expPoints: skjalfest sem OGREINANLEG.
   Vordurinn ver ordalagid: fullyrdum vid einn daginn ad hun se merki
   verdur maelingin ad segja thad fyrst.                                */
{
  const b = bootDelta(r => r.expP, r => r.xP5);
  console.log("  " + show("leikjathyngdar-lidurinn", b));
  ok("leikjathyngdin er skjalfest sem OGREINANLEG og maelist enn thannig",
     b.lo <= 0 && M.terms.fixtureDiff.verdict === "indistinguishable",
     `[${b.lo.toFixed(3)}, ${b.hi.toFixed(3)}] — er hun ordin marktaek? endurskrifadu tha skjolin`);
  ok(`skjalfest tala ${M.terms.fixtureDiff.delta} ~ ${b.d.toFixed(3)}`, near(M.terms.fixtureDiff.delta, b.d, 0.15));
}
/* 5e — HEIDARLEIKINN GAGNVART `rankScore`: skorid er EKKI greinanlega
   betra en thad sem repo-id a fyrir, og skjolin segja thad. Vordurinn
   fellur ef einhver skrifar "verdict: better" an thess ad CI stydji.  */
{
  const d = [], A = R.CAPTAIN.pts, B = R.rankScore.pts;
  for (let i = 0; i < A.length; i++) d.push(A[i] - B[i]);
  const se = sd(d) / Math.sqrt(d.length), lo = mean(d) - 1.96 * se, hi = mean(d) + 1.96 * se;
  console.log(`  CAPTAIN - rankScore: ${mean(d).toFixed(3)}  95% CI [${lo.toFixed(3)}, ${hi.toFixed(3)}]`);
  const better = lo > 0;
  ok("skjolin lysa sambandinu vid `rankScore` RETT (ogreinanlegt nema CI segi annad)",
     better === (M.vsRankScore.verdict !== "indistinguishable"),
     better ? "CI utilokar null NUNA — uppfaerdu vsRankScore.verdict" : "CI inniheldur null en skjolin fullyrda sigur");
  ok(`skjalfest tala ${M.vsRankScore.delta} ~ ${mean(d).toFixed(3)}`, near(M.vsRankScore.delta, mean(d), 0.1));
}

/* ============================================================
   6. STOFUGLEIKI YFIR TIMABIL — LOSO-heidarleiki
   Engin vog er fittud her, svo hvert timabil er thegar "haldid eftir".
   Krafan er ad forskotid a naiva vidmidid se ekki eitt timabil.
   ============================================================ */
console.log("\n=== 6. PER TIMABIL (CAPTAIN - naiv) ===");
{
  const bySeason = {};
  R.CAPTAIN.rowsOut.forEach((x, i) => (bySeason[x.season] ||= []).push(x.pts - R.naivePrice.rowsOut[i].pts));
  const line = Object.entries(bySeason).map(([s, a]) => `${s} ${mean(a) >= 0 ? "+" : ""}${mean(a).toFixed(2)}`);
  console.log("  " + line.join(" · "));
  const wins = Object.values(bySeason).filter(a => mean(a) > 0).length;
  ok(`forskotid er jakvaett i meirihluta timabila (${wins}/${Object.keys(bySeason).length})`,
     wins >= Math.ceil(Object.keys(bySeason).length * 0.6),
     "eitt timabil ma ekki bera maelinguna");
}

console.log(`\n${"=".repeat(84)}`);
console.log(`FYRIRLIDA-VORDUR: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
