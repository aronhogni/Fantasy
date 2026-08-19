/* ============================================================
   BUY WINDOWS — GLUGGARNIR SJALFIR OG TIMALINAN A SKJANUM

   Tveir kaflar, og their profa SITT HVAD:
     A. HREIN ROKFRAEDI (src/buywindow.js) a TILBUNUM rodum thar sem svarid
        er thekkt fyrirfram, auk 300 slembinna rada gegn OHADRI
        vidmids-utfaerslu (sama adferd sem `name-match.mjs` notar: ef eina
        profid er min eigin utfaersla af sömu formulu er thad ekki profun).
     B. TIMALINAN LESIN AF SKJANUM i jsdom — liturinn, ramminn og thakid.

   ThAD SEM ER VERID AD VERJA, i minnkandi rod eftir thvi hve dyrt thad
   vaeri ad brjota:

   1. ENDA-INVARIANTID. Gluggi ma ALDREI byrja ne enda a umferd undir hans
      eigin medaltali. Ef thad brotnar segir merkingin "kauptu i GW22" um
      viku sem er verri en medalvikan hans — beint rong akvordun. Profad
      BAEDI a tilbunum rodum, a 300 slembnum og A SKJANUM (punkturinn sem
      merkir bekkjar-viku ma ekki sitja a enda-holfi).
   2. ERFIDI LEIKURINN INNI I GLUGGA. Thad var beinlinis bedid um ("gódar
      gameweeks 30-38 en einn erfidur leikur sem haegt er ad bekkja"), svo
      thad er PROFSTEINN og ekki hlidarverkun: `[hi,hi,LOW,hi,hi]` verdur
      ad gefa EINN glugga af lengd 5 med LOW i `weak` — ekki tvo glugga.
   3. AUD UMFERD ER 0, OVISS UMFERD ER NULL. Thetta er OLIKT (CLAUDE.md 8)
      og ThAD ER OLIKT HER: auð umferd ma vera INNI i glugga (madur heldur
      manninum yfir hana) en ovis umferd KLYFUR rodina. Reglan er lika
      viljandi ONNUR en i `greenRuns`, thar sem auð umferd SLITUR runu —
      tvaer birtingar, tvaer spurningar, og profid skjalar ad thad se asett.
   4. STADAN SKIPTIR MALI. Sama lid, sitt hvor stada -> sitt hvor gluggi.
      Thad er astaedan fyrir thvi ad thetta er EKKI FFDR-taflan, svo se thad
      ekki satt er sy'nin oth'orf. MAELT a raungognum, tala birt.
   5. ENGIN FALSK GLUGGI. Flot rod (allir leikir eins) hefur ENGAN glugga.
      Gluggi sem birtist alltaf segir ekkert.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ffdrSeries, buyWindows, bestWindow, nextWindow, meanDifficulty, relTier,
         NEUTRAL_MID, MIN_WINDOW, MAX_WINDOWS } from "../src/buywindow.js";
import { makeFixDifficulty, tierOf, TIER_BG, TIER_CUTS, TIER_NEUTRAL,
         lookupPos } from "../src/model.js";
import { buildTeamMetrics } from "../src/teamstats.js";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};
const hdr = t => console.log(`\n${"─".repeat(72)}\n${t}\n${"─".repeat(72)}`);

/* ============================================================
   A. HREIN ROKFRAEDI
   ============================================================ */
hdr("A. GLUGGARNIR A TILBUNUM RODUM — SVARID ER ThEKKT FYRIRFRAM");

/* Bein rod: `v` gefid beint, engin FFDR i milli. Thad er visvitandi —
   kafli A profar LEITINA, kafli A2 profar hvernig `v` er BYGGT.        */
const mk = vals => vals.map((v, i) => ({
  gw: i + 1, v, blank: v === "blank" ? true : false, unknown: v == null,
  double: false, items: [], d: null, tier: null,
})).map(s => ({ ...s, v: s.blank ? 0 : s.v === "blank" ? 0 : s.v }));

/* A1. Grunn-tilfelli: einn skyr toppur i annars flotri rod. */
{
  const s = mk([3,3,3, 6,6,6, 3,3,3, 3,3,3]);
  const r = buyWindows(s);
  const w0 = r.windows[0] ?? { from: null, to: null, gain: null, mean: null, weak: [] };
  ok("einn toppur -> einn gluggi GW4-6",
     r.windows.length === 1 && w0.from === 4 && w0.to === 6,
     JSON.stringify(r.windows.map(w => `${w.from}-${w.to}`)));
  ok("medaltalid er hans eigid (3.75)", Math.abs(r.baseline - 3.75) < 1e-9, String(r.baseline));
  ok("gain = 3 x (6 - 3.75) = 6.75", Math.abs(w0.gain - 6.75) < 1e-6, String(w0.gain));
  ok("mean er ALGILD (6.00), ekki afstaed", w0.mean === 6, String(w0.mean));
  ok("enginn weak i einlitum glugga", w0.weak.length === 0);
}

/* A2. PROFSTEINN: EINN ERFIDUR LEIKUR INNI I GLUGGANUM.
   Bedid orðrétt um thetta. Rodin er 5 vikur thar sem sú i midjunni er
   VERRI en medaltalid — utkoman verdur ad vera EINN gluggi af lengd 5
   med GW3 i `weak`, EKKI tveir gluggar af lengd 2 (their eru undir
   lagmarki og hefdu horfid alveg).                                    */
{
  const s = mk([9,9,1,9,9, 2,2,2,2,2, 2,2]);
  const r = buyWindows(s);
  /* STOKKBREYTINGAR MEGA EKKI HRYNJA PROFINU — hun a ad FELLA thad.
     `?? {}` heldur fullyrdingunum aedandi thott glugginn se horfinn (M5 i
     stokkbreytinga-profuninni hrundi her i fyrstu utgafu og faldi thar
     med hinar fullyrdingarnar).                                         */
  const w = r.windows[0] ?? { from: null, to: null, weak: [], blanks: [] };
  ok("erfidur leikur INNI i glugga klyfur hann EKKI",
     r.windows.length === 1 && w.from === 1 && w.to === 5,
     JSON.stringify(r.windows.map(x => `${x.from}-${x.to}`)));
  ok("og hann er merktur bekkjanlegur (weak = [3])",
     w.weak.length === 1 && w.weak[0] === 3, JSON.stringify(w.weak));
  /* Sama rod EN med tvo erfida i midjunni sem draga summuna undir:
     tha ma glugginn ekki spanna thа.                                   */
  const s2 = mk([9,9,-40,-40,9,9, 2,2,2,2,2,2]);
  const r2 = buyWindows(s2);
  ok("nogu djupt gat spannast EKKI (summan tholir thad ekki)",
     r2.windows.every(w2 => !(w2.from <= 3 && w2.to >= 4)),
     JSON.stringify(r2.windows.map(x => `${x.from}-${x.to}`)));
}

/* A3. ENDA-INVARIANTID a tilbunu tilfelli sem er nakvaemlega minLen langt
   — thad er tilfellid thar sem hamarkid EITT hefdi ekki nægt (ekki haegt
   ad stytta 3 nidur i 2), svo hér sest hvort bera skilyrdid virkar.    */
{
  const s = mk([1, 9, 9, 9, 1, 1, 1, 1, 1, 1]);
  const r = buyWindows(s);
  const w = r.windows[0] ?? { from: null, to: null };
  ok("gluggi byrjar/endar EKKI a lakri viku (GW2-4, ekki GW1-4/2-5)",
     w.from === 2 && w.to === 4, `${w.from}-${w.to}`);
  const s2 = mk([9, 9, 9, 1, 9, 1, 1, 1, 1, 1, 1, 1]);
  const r2 = buyWindows(s2);
  ok("enginn gluggi endar a viku undir medaltali",
     r2.windows.every(x => s2[x.to - 1].v > r2.baseline),
     JSON.stringify(r2.windows.map(x => `${x.from}-${x.to}`)));
}

/* A4. AUD UMFERD (0) MA VERA INNI I GLUGGA, EN ALDREI A ENDA HANS.
   >>> VILJANDI ONNUR REGLA EN `greenRuns` <<< — sja haus.              */
{
  const s = mk([1,1, 9,9,"blank",9,9, 1,1,1,1,1]);
  const r = buyWindows(s);
  const w = r.windows[0] ?? { from: null, to: null, weak: [], blanks: [] };
  ok("auð umferd inni i glugga spannast", w.from === 3 && w.to === 7, `${w.from}-${w.to}`);
  ok("hun er i `blanks`, EKKI i `weak` (thar er ekkert ad bekkja)",
     w.blanks.length === 1 && w.blanks[0] === 5 && !w.weak.includes(5),
     `blanks ${JSON.stringify(w.blanks)} weak ${JSON.stringify(w.weak)}`);
  const s2 = mk(["blank",9,9,9,"blank", 1,1,1,1,1,1,1]);
  const r2 = buyWindows(s2);
  ok("auð umferd ma ALDREI vera endi glugga",
     r2.windows.every(x => !s2[x.from - 1].blank && !s2[x.to - 1].blank),
     JSON.stringify(r2.windows.map(x => `${x.from}-${x.to}`)));
}

/* A5. OVIS UMFERD (null) KLYFUR RODINA og er ekki i medaltalinu. */
{
  const s = mk([9,9,9, null, 9,9,9, 1,1,1,1,1]);
  const r = buyWindows(s);
  ok("enginn gluggi spannar ovissa umferd",
     r.windows.every(w => !(w.from <= 4 && w.to >= 4)),
     JSON.stringify(r.windows.map(w => `${w.from}-${w.to}`)));
  const known = s.filter(x => x.v != null);
  ok("medaltalid telur ADEINS thekktar umferdir",
     Math.abs(r.baseline - known.reduce((a, x) => a + x.v, 0) / known.length) < 1e-9);
  ok("`n` segir hve margar umferdir baru tolu", r.n === known.length, String(r.n));
}

/* A6. ENGIN FALSK GLUGGI. */
{
  const flat = buyWindows(mk([4,4,4,4,4,4,4,4,4,4]));
  ok("flot rod -> ENGINN gluggi", flat.windows.length === 0,
     JSON.stringify(flat.windows));
  const short = buyWindows(mk([9,1]));
  ok("rod styttri en lagmarkid -> enginn gluggi og baseline null",
     short.windows.length === 0 && short.baseline === null);
  const allNull = buyWindows(mk([null,null,null,null]));
  ok("engin gogn -> baseline null, engir gluggar",
     allNull.baseline === null && allNull.windows.length === 0);
}

/* A7. THAK OG SKORDUR. */
{
  const s = mk([9,9,9,1,9,9,9,1,9,9,9,1,9,9,9,1,9,9,9,1,9,9,9,1,9,9,9,1,9,9,9,1,9,9,9,1,9,9]);
  const r = buyWindows(s);
  ok(`thakid er ${MAX_WINDOWS} gluggar og thad bitur her`,
     r.windows.length === MAX_WINDOWS, String(r.windows.length));
  ok("gluggar skarast ALDREI", (() => {
    const used = new Set();
    for (const w of r.windows) for (let g = w.from; g <= w.to; g++) {
      if (used.has(g)) return false; used.add(g);
    }
    return true;
  })());
  ok(`hver gluggi er >= ${MIN_WINDOW} umferdir`,
     r.windows.every(w => w.len >= MIN_WINDOW));
  /* RODIN ER VALRODIN (haesta `score` fyrst), EKKI abati. Thad er sami
     maelikvardi sem valdi gluggana — sja villusoguna i `buyWindows`.    */
  ok("`windows` er rodud eftir SKORI (besti fyrst)",
     r.windows.every((w, i) => i === 0 || r.windows[i - 1].score >= w.score),
     JSON.stringify(r.windows.map(w => w.score)));
  ok("bestWindow er sami og windows[0]", bestWindow(r.windows) === r.windows[0]);
  ok("nextWindow(gwNow) er sa fyrsti sem er ekki buinn",
     nextWindow(r.windows, 1).from === Math.min(...r.windows.map(w => w.from)));
  const late = Math.max(...r.windows.map(w => w.to));
  ok("nextWindow eftir sidasta glugga er null", nextWindow(r.windows, late + 1) === null);
}

/* ============================================================
   A8. 300 SLEMBNAR RODIR GEGN OHADRI VIDMIDS-UTFAERSLU

   Vidmidid telur UPP alla moguleika og velur, i stad thess ad skanna
   eins og `greedyWindows`. Thad er onnur bygging á sömu SKILGREININGU —
   sem er tilgangurinn: se skilgreiningin brotin i utfaerslunni skilar
   uppteljarinn odru svari.
   ============================================================ */
hdr("A8. SLEMBIN PROFUN GEGN OHADRI UPPTELJARA (300 rodir)");
{
  const LEN_SHRINK = MIN_WINDOW;      // sama tenging og i buywindow.js
  /* Uppteljari: OLL segment, sia med skilyrdunum, velja hæsta skor.
     Endurtekid a thvi sem eftir stendur (grima), eins og greedy gerir. */
  const refWindows = rows => {
    const known = rows.filter(s => s.v != null);
    if (known.length < MIN_WINDOW) return { baseline: null, windows: [] };
    const base = known.reduce((a, s) => a + s.v, 0) / known.length;
    const blocked = rows.map(s => s.v == null);
    const out = [];
    for (let k = 0; k < MAX_WINDOWS; k++) {
      const cands = [];
      for (let a = 0; a < rows.length; a++) {
        for (let b = a + MIN_WINDOW - 1; b < rows.length; b++) {
          let bad = false, sum = 0;
          for (let i = a; i <= b; i++) { if (blocked[i]) { bad = true; break; } sum += rows[i].v - base; }
          if (bad) break;
          if (rows[a].v - base <= 0 || rows[b].v - base <= 0) continue;
          if (sum <= 0) continue;
          cands.push({ a, b, sum, score: sum / (b - a + 1 + LEN_SHRINK) });
        }
      }
      if (!cands.length) break;
      cands.sort((x, y) => y.score - x.score || x.a - y.a);
      const w = cands[0];
      for (let i = w.a; i <= w.b; i++) blocked[i] = true;
      out.push({ from: rows[w.a].gw, to: rows[w.b].gw, gain: +w.sum.toFixed(2) });
    }
    return { baseline: base, windows: out };
  };

  /* Fast fræ — slembin profun sem er ekki endurgeranleg er saga, ekki profun. */
  let seed = 20260819;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let mismatch = 0, checked = 0, withWin = 0, spanBlank = 0, endBad = 0;
  const bad = [];
  for (let it = 0; it < 300; it++) {
    const n = 6 + Math.floor(rnd() * 33);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const roll = rnd();
      rows.push({ gw: i + 1,
        v: roll < 0.06 ? null : roll < 0.14 ? 0 : +(1 + rnd() * 9).toFixed(2),
        blank: roll >= 0.06 && roll < 0.14, unknown: roll < 0.06,
        double: false, items: [], d: null, tier: null });
    }
    const got = buyWindows(rows), want = refWindows(rows);
    checked++;
    /* BORID I VALROD, EKKI I TIMAROD. Timarod hefdi latid ROD glugganna
       (hver er bestur) sleppa oprofada — og thad var einmitt villan sem
       thetta prof fann: rett MENGI, rong rod, thvi tvo maelikvardar voru i
       gangi. Timarodin er svo profud ser i kafla B (birtingin).          */
    const a = got.windows.map(w => `${w.from}-${w.to}`).join(",");
    const b = want.windows.map(w => `${w.from}-${w.to}`).join(",");
    if (a !== b) { mismatch++; if (bad.length < 3) bad.push(`${a} vs ${b}`); }
    if (got.windows.length) withWin++;
    for (const w of got.windows) {
      const first = rows[w.from - 1], last = rows[w.to - 1];
      if (!(first.v > got.baseline) || !(last.v > got.baseline)) endBad++;
      for (let g = w.from; g <= w.to; g++) if (rows[g - 1].blank) { spanBlank++; break; }
    }
  }
  ok(`${checked} rodir: uppteljarinn og skanninn eru SAMMALA`, mismatch === 0,
     `${mismatch} mismunir: ${bad.join(" | ")}`);
  ok("ENDA-INVARIANTID heldur i ollum slembnum rodum", endBad === 0, `${endBad} brot`);
  ok("profid hafdi raunverulega glugga ad skoda (thekja)", withWin > 250, `${withWin}/300`);
  ok("og raunveruleg tilfelli thar sem gluggi SPANNAR auda umferd",
     spanBlank > 20, `${spanBlank} gluggar`);
}

/* ============================================================
   A9. RODIN SJALF — `ffdrSeries` A TILBUNUM LEIKJUM
   ============================================================ */
hdr("A9. RODIN: TVOFOLD UMFERD, AUD UMFERD, ThREP");
{
  const fixByTeamGw = { 7: {
    1: [{ opp: 3, home: true,  fdr: 2 }],
    2: [],                                             // auð
    3: [{ opp: 4, home: true, fdr: 2 }, { opp: 5, home: false, fdr: 5 }],  // tvofold
    4: [{ opp: 6, home: false, fdr: null }],           // ovis
  } };
  /* Beint `fixDifficulty` — engin lids-tolur, svo profid mælir ThESSA skra. */
  const fd = (tid, fx) => fx.fdr == null ? null : fx.fdr;
  const s = ffdrSeries({ teamId: 7, pos: 3, fixByTeamGw, fixDifficulty: fd, from: 1, to: 4 });
  ok("auð umferd: blank=true og v=0 (RAUNVERULEG NULL)",
     s[1].blank === true && s[1].v === 0 && s[1].tier === null);
  ok("tvofold umferd LEGGST SAMAN",
     Math.abs(s[2].v - (lookupPos(3, "pts", 2) + lookupPos(3, "pts", 5))) < 1e-9,
     String(s[2].v));
  ok("threpid i tvofaldri umferd fylgir ThYNGSTA leiknum",
     s[2].tier === tierOf(5) && s[2].d === 5, `${s[2].tier} / ${s[2].d}`);
  ok("`double` er merkt", s[2].double === true && s[0].double === false);
  ok("ovis umferd: v=null, unknown=true, blank=FALSE",
     s[3].v === null && s[3].unknown === true && s[3].blank === false);
  /* STODAN ER INNTAK: sama leikur, tvaer stodur, tvaer tolur.           */
  const gk = ffdrSeries({ teamId: 7, pos: 1, fixByTeamGw, fixDifficulty: fd, from: 1, to: 1 });
  ok("sami leikur gefur SITT HVAD eftir stodu (MEASURED_POS)",
     gk[0].v !== s[0].v, `${gk[0].v} vs ${s[0].v}`);
}

/* ============================================================
   A9b. HANS EIGIN KVARDI (`relTier`) — LITURINN SVARAR SOMU SPURNINGU
        SEM RAMMINN

   Beidnin var: „thad tharf ekki ad vera absolute green, bara besta timabil
   leikmannsins". Gluggarnir voru ThEGAR afstaedir; LITIRNIR voru algildir,
   svo besta runa slaks lids var rommud i graenu og malad raud. Her er
   vorpunin profud, og ThAD SEM ER PROFAD ER AD HUN FAERI KVARDANN EN TEYGI
   HANN EKKI — sextilar hans eigin gilda hefdu gefid hverjum manni alla sex
   litina og thurrkad ut mun a flotum og sveiflukenndum leikjaskram.
   ============================================================ */
hdr("A9b. AFSTAEDI KVARDINN — FAERDUR, EKKI TEYGDUR");
{
  ok("NEUTRAL_MID er LEIDD af TIER_CUTS og TIER_NEUTRAL, ekki skrifud",
     Math.abs(NEUTRAL_MID - (TIER_CUTS[TIER_NEUTRAL - 1] + TIER_CUTS[TIER_NEUTRAL]) / 2) < 1e-12,
     String(NEUTRAL_MID));
  ok("hlutlausa threpid liggur um NEUTRAL_MID", tierOf(NEUTRAL_MID) === TIER_NEUTRAL,
     `tierOf(${NEUTRAL_MID}) = ${tierOf(NEUTRAL_MID)}`);

  const ser = d => d.map((x, i) => ({ gw: i + 1, d: x }));
  /* SLAKT LID: hver einasta umferd er ThUNG a algilda kvardanum. Thetta ER
     tilfellid sem notandinn tilkynnti, svo thad er profsteinn.           */
  const hard = ser([3.1, 3.4, 2.9, 3.0, 3.6, 3.3, 3.5, 3.2]);
  const mdH = meanDifficulty(hard);
  const absH = hard.map(x => tierOf(x.d));
  const relH = hard.map(x => relTier(x.d, mdH));
  ok("slakt lid: ENGIN umferd er god a algilda kvardanum",
     absH.every(t => t >= TIER_NEUTRAL), JSON.stringify(absH));
  ok("en a HANS kvarda eru hans bestu umferdir godar (thad var beidnin)",
     relH.some(t => t < TIER_NEUTRAL), JSON.stringify(relH));
  ok("og hans verstu eru afram slakar — kvardinn er faerdur, ekki flattur",
     relH.some(t => t > TIER_NEUTRAL), JSON.stringify(relH));

  /* STERKT LID: spegilmyndin. Ef vorpunin vaeri „sextilar hans eigin gilda"
     vaeri thetta eins hja badum — thad er einmitt thad sem ma ekki gerast. */
  const easy = ser([1.6, 1.9, 1.4, 2.1, 1.7, 2.3, 1.5, 2.0]);
  const relE = easy.map(x => relTier(x.d, meanDifficulty(easy)));
  ok("sterkt lid: hans VERSTU umferdir maelast slakar a hans kvarda",
     relE.some(t => t > TIER_NEUTRAL), JSON.stringify(relE));

  /* FLOT LEIKJASKRA VERDUR AD VERA GRA. Vaeri vorpunin teygd (sextilar
     hans eigin gilda) fengi thessi madur alla sex litina ur 0,04 i
     mun — og sy'nin segdi ad hann hefdi glugga sem hann hefur ekki.     */
  const flat = ser([2.40, 2.42, 2.38, 2.41, 2.39, 2.40, 2.41, 2.39]);
  const relF = flat.map(x => relTier(x.d, meanDifficulty(flat)));
  ok("flot leikjaskra er OLL hlutlaus (vorpunin teygir EKKI)",
     relF.every(t => t === TIER_NEUTRAL), JSON.stringify(relF));

  /* EINRAENNI: thyngri leikur ma ALDREI fa betri lit. Thetta er sama
     invariant sem `ffdr-table.mjs` ver a algilda kvardanum.             */
  let mono = true;
  for (let i = 1; i < hard.length; i++) {
    const a = [...hard].sort((x, y) => x.d - y.d);
    if (relTier(a[i].d, mdH) < relTier(a[i - 1].d, mdH)) mono = false;
  }
  ok("einraent: thyngri d faer aldrei betra threp", mono);

  /* HLIDRUN A OLLU LIDINU MA EKKI BREYTA LITUNUM — thad er einmitt thad sem
     „afstaett" thydir, og thad er profanlegt.                            */
  const shifted = ser(hard.map(x => x.d - 1.0));
  const relS = shifted.map(x => relTier(x.d, meanDifficulty(shifted)));
  ok("sama leikjaskra, oll hlidrud um 1.0 -> SOMU litir",
     JSON.stringify(relS) === JSON.stringify(relH),
     `${JSON.stringify(relS)} vs ${JSON.stringify(relH)}`);

  ok("meanD null (engin gogn) -> fell a algilda kvardann",
     relTier(2.9, null) === tierOf(2.9));
  ok("d null -> ekkert threp", relTier(null, 2.4) === null);
  ok("meanDifficulty sleppir audum og ovissum umferdum",
     meanDifficulty([{ d: 2 }, { d: null }, { d: 4 }]) === 3);
}

/* ============================================================
   A10. RAUNGOGN: STADAN BREYTIR GLUGGANUM — ASTAEDAN FYRIR SY'NINNI
   ============================================================ */
hdr("A10. RAUNGOGN — DEF OG FWD I SAMA LIDI FA SITT HVORN GLUGGA");
let real = null;
{
  const players = J("players.json").players || J("players.json");
  const teamsF = J("teams.json"); const teams = teamsF.teams || teamsF;
  const fixF = J("fixtures.json");
  const fixtures = Array.isArray(fixF) ? fixF : Object.values(fixF).filter(x => x && x.id);
  const teamForm = J("team_form.json");
  let promoted = null; try { promoted = J("promoted_baseline.json"); } catch { /* ekki til */ }
  let odds = null; try { odds = J("odds.json"); } catch { /* ekki til */ }
  let elo = null;  try { elo = J("elo.json"); } catch { /* ekki til */ }
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  const teamMetrics = buildTeamMetrics({ players, teams, promoted, teamForm });
  const eloByTeam = {};
  for (const t of teams) {
    const e = (elo?.teams || elo?.clubs || []).find?.(x => x.short === t.short || x.name === t.name);
    if (e) eloByTeam[t.id] = e;
  }
  const fixDifficulty = makeFixDifficulty({ teamMetrics, teamById, odds: odds?.teams || odds, eloByTeam });
  const fixByTeamGw = {};
  for (const f of fixtures) {
    if (!f.event) continue;
    const add = (tid, opp, home, fdr) => {
      (fixByTeamGw[tid] = fixByTeamGw[tid] || {});
      (fixByTeamGw[tid][f.event] = fixByTeamGw[tid][f.event] || []).push(
        { opp, home, fdr, kickoff: f.kickoff_time, id: f.id });
    };
    add(f.team_h, f.team_a, true, f.team_h_difficulty);
    add(f.team_a, f.team_h, false, f.team_a_difficulty);
  }
  real = { teams, teamById, fixByTeamGw, fixDifficulty };

  const keyOf = (tid, pos) => buyWindows(ffdrSeries(
      { teamId: tid, pos, fixByTeamGw, fixDifficulty, from: 1, to: 38 })).windows
    .slice().sort((a, z) => a.from - z.from).map(w => `${w.from}-${w.to}`).join(",");
  let diff = 0, gkDiff = 0, empty = 0, endBad = 0, nWin = 0, lenSum = 0;
  for (const t of teams) {
    const d = keyOf(t.id, 2), f = keyOf(t.id, 4), g = keyOf(t.id, 1);
    if (d !== f) diff++;
    if (g !== d) gkDiff++;
    for (const pos of [1, 2, 3, 4]) {
      const s = ffdrSeries({ teamId: t.id, pos, fixByTeamGw, fixDifficulty, from: 1, to: 38 });
      const r = buyWindows(s);
      if (!r.windows.length) empty++;
      for (const w of r.windows) {
        nWin++; lenSum += w.len;
        const a = s.find(x => x.gw === w.from), b = s.find(x => x.gw === w.to);
        if (!(a.v > r.baseline) || !(b.v > r.baseline)) endBad++;
      }
    }
  }
  /* MAELT 19.8.2026: 17 af 20. Throskuldurinn er 10 svo profid se um
     MERKID og ekki um nakvaemlega thessa leikjaskra — en 0 eda 1 mundi
     thyda ad sy'nin baeti engu vid FFDR-tofluna og hun aetti ad fara.  */
  ok(`DEF og FWD fa ULIKA glugga i >= 10 af 20 lidum (maelt: ${diff})`, diff >= 10);
  ok(`GK og DEF fa ULIKA glugga i nokkrum lidum (maelt: ${gkDiff})`, gkDiff >= 3);
  ok("ENDA-INVARIANTID heldur a raungognum (80 samsetningar)", endBad === 0, `${endBad} brot`);
  ok("hver samsetning fann glugga (engin tom)", empty === 0, `${empty} tomar`);
  /* MEDALLENGD ER MAELD OG BUNDIN I BADA ENDA. Skridan (LEN_SHRINK) er
     eina stillta talan i skranni; falli hun ut verda gluggar 3,2 ad
     medaltali (ber thettleiki) eda 7,7 (ber summa) — badar tolur eru
     UTAN thessa bils, svo vordurinn fellur se hun fjarlaegd.          */
  const meanLen = lenSum / nWin;
  ok(`medallengd glugga er 3.5-5.5 (maelt: ${meanLen.toFixed(2)}) — skridan a lengd virkar`,
     meanLen > 3.5 && meanLen < 5.5);
}

/* ============================================================
   B. TIMALINAN A SKJANUM
   ============================================================ */
hdr("B. BUY-WINDOWS-LESMATINN I JSDOM — LESID AF SKJANUM");

const dom = new JSDOM("<!doctype html><div id=root></div>",
                      { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = async url => {
  const n = String(url).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};
/* React-vidvaranir eru VILLA her: blondun styttingar og langritunar a
   `border`/`borderRadius` er nakvaemlega gildran sem thessi sy'n gengur i
   (14 vidvaranir i FFDR-toflunni), og hun er ekki synileg i DOM.       */
const warnings = [];
const realErr = console.error;
console.error = (...a) => { warnings.push(a.map(String).join(" ")); };

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 400)); });
const settle = async (ms = 40) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const fire = async el => {
  if (!el) return false;
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
  return true;
};
const btn = re => [...document.querySelectorAll("button")].find(b => re.test(b.textContent || ""));

/* Flipinn er valinn a IKON-FORSKEYTINU, ekki a nakvaemu heiti — tvo profa
   fellu adur vid endurnefningu a flipa (CLAUDE.md 5).                  */
await fire([...document.querySelectorAll("button")].find(b => /Player stats/.test(b.textContent || "")));
ok("Player stats opnadist", /Players/.test(document.body.textContent));

const winBtn = btn(/^Buy windows$/);
ok("lesmata-hnappurinn \"Buy windows\" er til", !!winBtn);
await fire(winBtn);

const bodyTxt = () => document.body.textContent || "";
ok("sy'nin teiknadist (skyringin er a skjanum)",
   /The green frame is a buy window/.test(bodyTxt()));
/* NEIKVAED FULLYRDING VERDUR AD NEFNA STRENG SEM VAR SANNANLEGA ThARNA
   (CLAUDE.md 5b): "Click a header to sort" er skyring TOFLUNNAR og var
   staðfest a skjanum i Groups-ham tveimur linum ofar i thessu profi.   */
ok("taflan (og skyring hennar) er farin i thessum ham",
   !/Click a header to sort/.test(bodyTxt()));
ok("umferda-valarinn fyrir SOGULEG gogn er ekki a skjanum",
   !/Select gameweek range/.test(document.body.innerHTML));

/* ---- radirnar ----
   HALDFANGID ER `role`, EKKI HOLFA-FJOLDI. Fyrsta utgafa thessa profs taldi
   born ("> 30 holf") og HRUNDI um leid og bilid var stytt i GW10-20 — hun
   maeldi thа ekki lengur radirnar heldur BILID. Haldfang sem breytist med
   gognunum er ekki haldfang.                                            */
const winRows = () => [...document.querySelectorAll("[role=row]")]
  .filter(r => !/^Player/.test(r.children[0]?.textContent || ""));
const cellsOf = r => [...r.querySelectorAll("[role=cell]")];
const rows0 = winRows();
ok(`radir teiknudust (${rows0.length})`, rows0.length > 5);
/* ThAKID ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b regla 1): talan sem er
   sogd a skjanum verdur ad vera talan sem er teiknud.                  */
const m = bodyTxt().replace(/\s+/g, " ").match(/Showing (\d+) of (\d+)/);
ok("thakid er SAGT a skjanum og talan stemmir vid rada-fjoldann",
   !!m && +m[1] === rows0.length, m ? `sagt ${m[1]}, teiknad ${rows0.length}` : "engin talning");
ok("og thad er sagt ad hinar seu EKKI a skjanum",
   +m[2] > +m[1] ? /not\s*on screen/.test(bodyTxt().replace(/\s+/g, " ")) : true);

/* ---- LITURINN VERDUR AD SEGJA ThAD SAMA OG TALAN, A BADUM KVORDUM ----
   Torfaeran OG hans medaltal eru lesin UR HOLFINU sjalfu (`title` ber
   "difficulty 2.47 · his average difficulty 2.31 · colour scale: ..."),
   ekki endurreiknud — tvaer utfaerslur af FFDR i einu profi vaeri sama
   villan sem `ffdr-table.mjs` forðast.                                  */
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}
const cellInfo = c => {
  const t = c.getAttribute("title") || "";
  if (/blank gameweek/.test(t)) return null;
  const d = t.match(/difficulty (\d+(?:\.\d+)?) ·/);
  const md = t.match(/his average difficulty (\d+(?:\.\d+)?)/);
  const sc = t.match(/colour scale: (his own|league)/);
  if (!d || !sc) return null;
  return { d: +d[1], meanD: md ? +md[1] : null, scale: sc[1],
           bg: (c.style.background || c.style.backgroundColor || "").replace(/\s/g, "").toLowerCase() };
};
/* SJALFGEFNI KVARDINN ER HANS EIGIN — thad var beidnin, svo thad er
   fullyrding og ekki stilling sem ma reka.                              */
ok("sjalfgefni kvardinn er HANS EIGIN",
   cellInfo(cellsOf(rows0[0]).find(c => cellInfo(c)))?.scale === "his own");
const colourCheck = (label, expect) => {
  let checked = 0, wrong = 0, good = 0;
  for (const r of winRows().slice(0, 14)) {
    for (const c of cellsOf(r)) {
      const i = cellInfo(c);
      if (!i) continue;
      checked++;
      const want = hexToRgb(TIER_BG[expect(i)]);
      if (i.bg !== want) wrong++;
      if (expect(i) < TIER_NEUTRAL) good++;
    }
  }
  ok(`${label}: liturinn = threpid i ollum holfum (${checked} holf)`,
     checked > 200 && wrong === 0, `${wrong} rong af ${checked}`);
  return { checked, good };
};
const relStat = colourCheck("his own", i => relTier(i.d, i.meanD));

await fire(btn(/^league$/));
colourCheck("league", i => tierOf(i.d));
await fire(btn(/^his own$/));

/* ---- RAMMINN OG ENDA-INVARIANTID, LESID AF SKJANUM ---- */
{
  const GREEN = hexToRgb("#00b96b");
  let frames = 0, badEdge = 0, dotOnEdge = 0, rowsWithFrame = 0;
  for (const r of rows0) {
    const cells = cellsOf(r);
    let any = false;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const lt = (c.style.borderLeftColor || "").replace(/\s/g, "").toLowerCase();
      const rt = (c.style.borderRightColor || "").replace(/\s/g, "").toLowerCase();
      const tp = (c.style.borderTopColor || "").replace(/\s/g, "").toLowerCase();
      const inFrame = tp === GREEN;
      if (!inFrame) continue;
      any = true;
      const isFirst = lt === GREEN, isLast = rt === GREEN;
      if (isFirst || isLast) {
        frames++;
        /* ENDA-INVARIANTID A SKJANUM: bekkjar-punkturinn ma ekki sitja a
           enda-holfi. Punkturinn er stakt barn med borderRadius.        */
        const hasDot = [...c.children].some(x => x.tagName === "SPAN" && x.style.borderRadius);
        if (hasDot) dotOnEdge++;
        if (/BELOW his average/.test(c.getAttribute("title") || "")) badEdge++;
      }
    }
    if (any) rowsWithFrame++;
  }
  ok(`graenir rammar teiknudust (${frames} enda-holf, ${rowsWithFrame} radir)`,
     frames >= 12 && rowsWithFrame === rows0.length);
  ok("ENGINN bekkjar-punktur a enda glugga (enda-invariantid a skjanum)",
     dotOnEdge === 0, `${dotOnEdge} punktar`);
  ok("ENGINN endi merktur \"BELOW his average\"", badEdge === 0, `${badEdge}`);
}

/* ---- BILID ER RAUNVERULEGA VALJANLEGT ----
   Fyrsta utgafa thessa profs taldi holf an thess ad opna valarann og gat
   thvi ekki fallid; hun er nu tvistigs: velja GW10, velja GW20, telja.  */
{
  const before = [...winRows()[0].children].length;
  await fire(btn(/^pick$/));
  const box = n => [...document.querySelectorAll("button")]
    .find(b => b.getAttribute("title") === `GW ${n}`);
  await fire(box(10));
  await fire(box(20));
  const r = winRows()[0];
  const cells = cellsOf(r);
  ok("valid bil GW10-20 gefur nakvaemlega 11 holf", cells.length === 11, String(cells.length));
  ok("og bilid var raunverulega ANNAD adur", before !== [...r.children].length);
  const first = cells[0].getAttribute("title") || "";
  ok("fyrsta holfid er GW10", /^GW10 —/.test(first), first.slice(0, 12));
  /* −/+ FAERA ENDANN (sama vidmot og FFDR-taflan). Prófad med TOLU, ekki med
     thvi ad hnappurinn se til: hnappur sem er til en gerir ekkert er thogul
     bilun.                                                              */
  const n11 = cellsOf(winRows()[0]).length;
  await fire(btn(/^−$/));
  ok("−  styttir bilid um EINA umferd", cellsOf(winRows()[0]).length === n11 - 1,
     `${n11} -> ${cellsOf(winRows()[0]).length}`);
  await fire(btn(/^\+$/));
  await fire(btn(/^\+$/));
  ok("+  lengir thad aftur", cellsOf(winRows()[0]).length === n11 + 1,
     `${cellsOf(winRows()[0]).length}`);
  await fire(btn(/^reset$/));
  ok("reset skilar fullu bili", cellsOf(winRows()[0]).length > 30,
     String(cellsOf(winRows()[0]).length));
}

/* ---- RODUNAR-ROFINN ---- */
{
  const nameOf = r => r.children[0].textContent;
  const before = winRows().slice(0, 6).map(nameOf);
  await fire(btn(/^best window$/));
  const after = winRows().slice(0, 6).map(nameOf);
  ok("\"best window\" endurradar raunverulega", before.join("|") !== after.join("|"),
     after.join(","));
  await fire(btn(/^next window$/));
  ok("\"next window\" gefur ThRIDJU rod",
     winRows().slice(0, 6).map(nameOf).join("|") !== after.join("|"));
  await fire(btn(/^table order$/));
  ok("\"table order\" skilar upprunalegu rodinni",
     winRows().slice(0, 6).map(nameOf).join("|") === before.join("|"));
}

/* ---- SIURNAR OG RODUNIN KOMA UR TOFLUNNI ---- */
{
  /* TALAN SEM MA MAELA ER HEILDIN ("of N"), EKKI RADA-FJOLDINN: thakid er 40
     og markmenn eru fleiri en 40, svo rada-fjoldinn er 40 -> 40 og
     fullyrding um hann getur ekki fallid a rettri hegdun. Fyrsta utgafa
     thessa profs gerdi einmitt thad og FELLDI virka siu.                 */
  const total = () => +(bodyTxt().replace(/\s+/g, " ").match(/Showing \d+ of (\d+)/) || [])[1];
  const t0 = total();
  await fire([...document.querySelectorAll("button")].find(b => (b.textContent || "").trim() === "GK"));
  const t1 = total();
  ok("stodu-sian ur toflunni threngir mengid", t1 < t0 && t1 > 0, `${t0} -> ${t1}`);
  ok("og allar radir eru tha markmenn",
     winRows().length > 0 && winRows().every(r => /GK/.test(r.children[0].textContent)));
  await fire([...document.querySelectorAll("button")].find(b => (b.textContent || "").trim() === "All"));
  ok("\"All\" skilar theim ollum", total() === t0, `${total()}`);
}

/* ---- "show more" ---- */
{
  const n0 = winRows().length;
  const more = btn(/show \d+ more/);
  if (more) {
    await fire(more);
    ok("\"show more\" fjolgar rodum", winRows().length > n0, `${n0} -> ${winRows().length}`);
    const m2 = bodyTxt().replace(/\s+/g, " ").match(/Showing (\d+) of (\d+)/);
    ok("og talningin fylgir", m2 && +m2[1] === winRows().length,
       m2 ? `${m2[1]} vs ${winRows().length}` : "engin");
  } else ok("\"show more\" birtist adeins thegar thakid bitur", winRows().length >= 40);
}

/* ---- ThAD SEM NOTANDINN TILKYNNTI: GLUGGI ROMMADUR I GRAENU A RAUDRI ROD ----
   „Thad tharf ekki ad vera absolute green, bara besta timabil leikmannsins."
   Profad a ThVI SEM ER A SKJANUM, a OLLUM leikmonnum: leitad ad rodum sem
   hafa ENGA goda umferd a algilda kvardanum og krafist thess ad ThAER ALLAR
   hafi goda umferd a hans eigin. MAELT a raungognum: nakvaemlega Hull (allar
   fjorar stodur) a enga goda umferd a algilda kvardanum, svo tilfellid er
   raunverulegt en fæst ADEINS med ollum rodum — thess vegna „show all" her
   og thess vegna er thessi kafli SIDASTUR (hann er dyr).                */
{
  const all = btn(/show all \d+/);
  ok("\"show all\" er i bodi og segir fjoldann", !!all, all?.textContent);
  await fire(all);
  const rows = winRows();
  ok(`allar radir teiknudust (${rows.length})`, rows.length > 500);
  const relByRow = rows.map(r => cellsOf(r).map(cellInfo).filter(Boolean));
  await fire(btn(/^league$/));
  const absByRow = winRows().map(r => cellsOf(r).map(cellInfo).filter(Boolean));
  let noAbsGood = 0, fixed = 0, moved = 0, total = 0;
  for (let k = 0; k < absByRow.length; k++) {
    const abs = absByRow[k].map(i => tierOf(i.d));
    const rel = relByRow[k].map(i => relTier(i.d, i.meanD));
    for (let j = 0; j < Math.min(abs.length, rel.length); j++) {
      total++; if (abs[j] !== rel[j]) moved++;
    }
    if (abs.some(x => x < TIER_NEUTRAL)) continue;
    noAbsGood++;
    if (rel.some(x => x < TIER_NEUTRAL)) fixed++;
  }
  /* ThEKJA ER FULLYRDING (5b regla 1): hefdi profid ekki fundid eina slika
     rod vaeri "0 vandamal" tom fullyrding, ekki gron nidurstada.        */
  ok(`radir an EINS goðs leiks a algilda kvardanum: ${noAbsGood} (thekja)`,
     noAbsGood >= 10, `af ${absByRow.length}`);
  ok("HVER SLIK ROD hefur goda umferd a HANS kvarda — beidnin, lesin af skjanum",
     noAbsGood > 0 && fixed === noAbsGood, `${fixed} af ${noAbsGood}`);
  ok(`kvarda-rofinn breytir raunverulega lit (${moved} af ${total} holfum)`,
     moved > total * 0.2, `${moved}/${total}`);
  await fire(btn(/^his own$/));
}

/* ---- NaN / undefined ----
   `\bNaN\b`, EKKI `includes("NaN")`: textContent limir texta an bila, svo
   "MUN"+"a"+"NEW" verdur `MUNaNEW` sem ber undirstrenginn (CLAUDE.md 5b). */
{
  const txt = bodyTxt();
  ok("engin NaN a skjanum", !/\bNaN\b/.test(txt));
  ok("engin undefined a skjanum", !/\bundefined\b/.test(txt));
  /* ISLENSKA: ADEINS I ThVI SEM SY'NIN SKRIFAR SJALF (skyringin og
     stjornin). RADIRNAR eru UNDANSKILDAR og thad er sama undanthaga sem
     `no-icelandic.mjs` kafli C gerir: leikmannanofn koma UR `data/` og
     "Guðmundsson" er RETT a ensku skjá. Fyrsta utgafa las radirnar og
     felldi profid a nafni ur FPL.                                       */
  /* ISLENSKA: ADEINS I ThVI SEM SY'NIN SKRIFAR SJALF. Rada-textinn er
     UNDANSKILINN og thad er sama undanthaga sem `no-icelandic.mjs` kafli C
     gerir: leikmannanofn koma UR `data/` og "Guðmundsson" er RETT a ensku
     skja. Fyrsta utgafa las OLL `<button>` a sidunni — sem eru lika
     nafna-hnapparnir i hverri rod — og felldi profid a nofnum ur FPL
     ("ééöé"). Stjornar-hnapparnir eru hvort eð er thegar profadir med
     nafni her ad ofan ("pick", "reset", "best window", ...), svo language-
     skanninn tharf adeins skyringuna, sem er langi textinn.             */
  const legStart = bodyTxt().indexOf("fixture difficulty for");
  ok("skyringin er a skjanum (POSITIF fullyrding fyrst — sja 5b regla 2)",
     legStart > 0);
  const leg = bodyTxt().slice(legStart);
  ok("engin islensk stafsetning i skyringunni",
     !/[þæðöáéíóúýÞÆÐÖÁÉÍÓÚÝ]/.test(leg),
     (leg.match(/[þæðöáéíóúýÞÆÐÖÁÉÍÓÚÝ]/g) || []).join(""));
}

/* ---- REACT-VIDVARANIR ----
   Ver nakvaemlega thann kafla sem `appStyles.js` og FFDR-taflan baru: se
   `border`/`borderRadius` blandad vid langritun kvartar React vid
   ENDURTEIKNINGU thegar eiginleiki er FJARLAEGDUR — thess vegna er profid
   AD BAKI a bil-skiptunum og rodunar-skiptunum her ad ofan, sem taka
   ramma af holfum.                                                     */
{
  console.error = realErr;
  const styleWarn = warnings.filter(w => /Updating a style property|shorthand|border/i.test(w));
  ok("engar React-stil-vidvaranir eftir bil- og rodunar-skipti",
     styleWarn.length === 0, styleWarn.slice(0, 2).join(" | "));
}

console.log(`\n${"─".repeat(72)}`);
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
