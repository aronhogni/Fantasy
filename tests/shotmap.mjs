/* ============================================================
   SKOTAKORT PER LEIKMANN — GOGN OG BIRTING

   ThAD SEM ER RAUNVERULEGA VARID HER er ekki "birtist kortid" heldur
   **ad punktarnir seu a rettum stad a vellinum**. Nakvaemlega su villa
   kom upp i ESPN-kortinu (CLAUDE.md 6b): fyrsta utgafan margfaldadi med
   105 i stad 52,5 og setti HVERT SKOT i tvofalda fjarlaegd, svo mork
   birtust uppi vid midjulinu. **Ekkert prof sa thad** — notandinn sa thad
   a vellinum. Thess vegna er hér profad gegn thremur OHADUM akkerum:

     1. xG FELLUR EINRAENT MED FJARLAEGD. Se hnitakerfid eda kvardinn
        rangur brotnar su rod. Thetta er sterkasta profid thvi thad tengir
        hnitin vid xG-tolurnar — tvaer oskyldar staerdir ur sama svari.
     2. VITASPYRNUR liggja a x 11,5 og y 50,00 NAKVAEMLEGA (92 af 92).
        Fastur punktur sem er thekktur ur raunheimi.
     3. TEIGURINN: 99,5% teigsskota falla innan y 20,4-79,6.

   Teiknadi vollurinn les SOMU `calib`-tolur og punktarnir, svo hann getur
   ekki rekid fra theim — en profid neglir ad hann geri thad i raun.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ShotMap from "../src/ShotMap.jsx";

const ROOT = new URL("../", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); }
                       else { fail++; console.log("  ✗ " + m); } };
const H = t => { console.log(`\n${"─".repeat(84)}\n${t}\n${"─".repeat(84)}`); };

let F = null;
try { F = JSON.parse(readFileSync(ROOT + "data/bsd_shots.json", "utf8")); } catch {}
if (!F) {
  console.log("data/bsd_shots.json vantar — safnid er sleppt (skrifad handvirkt).");
  console.log(`\nSKOTAKORT: ${pass} stodust, ${fail} féllu`);
  process.exit(0);
}
/* EIN ROD PER SKOT (endurskipulagt 8.8.): synirnar eru SIADAR ur einni
   flatri rod i stad thess ad geyma somu skotin thrisvar.               */
const IDX = Object.fromEntries((F.legend?.fields || []).map((f, i) => [f, i]));
const all = F.shots || [];
const byCode = new Map();
for (const s of all) {
  const c = s[IDX.code];
  if (c == null) continue;
  (byCode.get(c) || byCode.set(c, []).get(c)).push(s);
}
const rows = [...byCode.entries()];

/* ---------- 1. SKRAIN ---------- */
H("1. SKRAIN");
ok(F.source === "bsd_shotmap", `heimild merkt (${F.source})`);
ok(F.season === "2025/26", `timabil merkt (${F.season})`);
ok(rows.length > 200, `leikmenn med skot: ${rows.length}`);
ok(Array.isArray(F.legend?.teams) && F.legend.teams.length === 20,
   `lidin i legend: ${F.legend?.teams?.length}`);
ok(all.length > 5000, `skot alls: ${all.length}`);
ok(Array.isArray(F.legend?.type) && Array.isArray(F.legend?.fields),
   "legend fylgir svo skrain se lesanleg an thess ad thekkja kodann");
ok(rows.every(([k]) => /^\d+$/.test(k)),
   "lyklad a FPL `code` (fast yfir timabil, olikt `id`)");
ok(all.every(s => Array.isArray(s) && s.length === (F.legend?.fields || []).length),
   `hver rod hefur ${(F.legend?.fields||[]).length} svid`);

/* ---------- 2. AKKERI 1: xG FELLUR MED FJARLAEGD ---------- */
H("2. xG FELLUR EINRAENT MED FJARLAEGD (sterkasta hnita-profid)");
{
  const bands = [[0, 6], [6, 12], [12, 17], [17, 25], [25, 40]];
  const means = bands.map(([lo, hi]) => {
    const g = all.filter(s => s[IDX.x] >= lo && s[IDX.x] < hi && s[IDX.xg] != null).map(s => s[IDX.xg]);
    return g.length ? g.reduce((a, b) => a + b, 0) / g.length : null;
  });
  means.forEach((m, i) => {
    if (m == null) return;
    console.log(`     x ${bands[i][0]}-${bands[i][1]}: mean xG ${m.toFixed(3)}`);
  });
  let mono = true;
  for (let i = 1; i < means.length; i++) if (means[i] >= means[i - 1]) mono = false;
  ok(mono, "medal-xG fellur i HVERJU threpi — hnit og xG eru a sama kvarda");
  ok(means[0] > 3 * means[4],
     `naerfaeri er margfalt haerra en langskot (${means[0].toFixed(3)} a moti ${means[4].toFixed(3)})`);
}

/* ---------- 3. AKKERI 2: VITASPYRNUR ---------- */
H("3. VITASPYRNUR — fastur punktur ur raunheimi");
{
  const iPen = F.legend.sit.indexOf("penalty");
  const pens = all.filter(s => s[IDX.sit] === iPen);
  ok(pens.length > 50, `vitaspyrnur i skranni: ${pens.length}`);
  const ys = [...new Set(pens.map(s => s[IDX.y]))];
  ok(ys.length === 1 && ys[0] === 50,
     `allar vitaspyrnur liggja a y = 50,00 nakvaemlega (${ys.join(", ")})`);
  const mx = pens.reduce((a, s) => a + s[IDX.x], 0) / pens.length;
  ok(Math.abs(mx - F.calib.pen_spot_x) < 0.5,
     `medal-x vitaspyrna (${mx.toFixed(2)}) passar vid teiknada vitapunktinn (${F.calib.pen_spot_x})`);
  const mxg = pens.filter(s => s[IDX.xg] != null).reduce((a, s) => a + s[IDX.xg], 0) / pens.length;
  ok(mxg > 0.7 && mxg < 0.85,
     `medal-xG vitaspyrnu er ${mxg.toFixed(3)} — thekkta vitahlutfallid, sjalfstaed stadfesting a xG-likaninu`);
}

/* ---------- 4. AKKERI 3: TEIGURINN ---------- */
H("4. TEIGURINN");
{
  const inbox = all.filter(s => s[IDX.x] <= F.calib.box_x);
  const [lo, hi] = F.calib.box_y;
  const inside = inbox.filter(s => s[IDX.y] >= lo && s[IDX.y] <= hi).length;
  const share = inside / inbox.length;
  ok(share > 0.98,
     `${(100 * share).toFixed(1)}% teigsskota falla innan teiknadrar teigsbreiddar`);
  ok(all.every(s => s[IDX.y] >= 0 && s[IDX.y] <= 100), "y er alltaf innan vallarbreiddar 0-100");
  ok(all.every(s => s[IDX.x] >= 0), "x er aldrei neikvaett (marklinan er 0)");
}

/* ---------- 4b. LIDS-KORTIN ---------- */
H("4b. LIDS-KORTIN (fyrir og A SIG)");
{
  const teams = F.legend.teams || [];
  const byTeam = new Map(), byOpp = new Map();
  for (const s of all) {
    const t = s[IDX.team], o = s[IDX.opp];
    if (t != null) byTeam.set(t, (byTeam.get(t) || 0) + 1);
    if (o != null) byOpp.set(o, (byOpp.get(o) || 0) + 1);
  }
  /* 17 af 20 — Coventry, Hull og Ipswich komu UPP og spiludu ekki 2025/26.
     Ad krefjast 20 vaeri ad krefjast gagna sem eiga ekki ad vera til.    */
  ok(byTeam.size === 17 && byOpp.size === 17,
     `17 lid eiga skot bada vegu (hin 3 komu upp og spiludu ekki 2025/26): ${byTeam.size}/${byOpp.size}`);
  ok([...byTeam.values()].every(n => n > 200),
     "hvert lid a raunverulegan skotafjolda (>200 a timabili)");
  /* HVERT SKOT ER BAEDI "fyrir" og "a sig" — nema thegar annad lidid er
     fallid ur deildinni og hefur thvi engan vísi. Summan getur thvi verid
     mismunandi, EN hvorug ma vera staerri en heildin.                    */
  const sumFor = [...byTeam.values()].reduce((a, b) => a + b, 0);
  const sumAg = [...byOpp.values()].reduce((a, b) => a + b, 0);
  ok(sumFor <= all.length && sumAg <= all.length,
     `hvorug hlidin fer yfir heildarskot (${sumFor} og ${sumAg} af ${all.length})`);
  /* ANDLITSPROF: lid a ad SKJOTA naer markinu en thad faer a sig? Nei —
     thad er symmetriskt. En medal-xG a sig verdur ad vera a SOMU stardgrad
     og fyrir; annars er "fyrir/a sig" vixlad.                            */
  const mean = (m, idx) => {
    const g = all.filter(s => s[idx] === m && s[IDX.xg] != null).map(s => s[IDX.xg]);
    return g.reduce((a, b) => a + b, 0) / g.length;
  };
  const ti = teams.indexOf("ARS");
  if (ti >= 0) {
    const f = mean(ti, IDX.team), a = mean(ti, IDX.opp);
    ok(f > 0.03 && f < 0.25 && a > 0.03 && a < 0.25,
       `ARS medal-xG: skotid ${f.toFixed(3)} · a sig ${a.toFixed(3)} — badar a truverdugu bili`);
  }
}

/* ---------- 5. BIRTINGIN ---------- */
H("5. BIRTINGIN (jsdom)");
{
  const dom = new JSDOM("<!doctype html><body></body>");
  global.window = dom.window; global.document = dom.window.document;
  const [code, shots] = rows.sort((a, b) => b[1].length - a[1].length)[0];
  const html = renderToStaticMarkup(
    React.createElement(ShotMap, { shots, calib: F.calib, label: "T" }));
  const circles = (html.match(/<circle/g) || []).length;
  ok(circles === shots.length + 1,
     `hvert skot er teiknad: ${circles - 1} hringir + vitapunktur (skot: ${shots.length})`);
  const iGoal = F.legend.type.indexOf("goal");
  const goals = shots.filter(s => s[IDX.type] === iGoal).length;
  ok(new RegExp(`${goals} goals`).test(html), `mork talin rett i aria-label (${goals})`);
  ok(/aria-label="Shot map/.test(html), "svg ber aria-label (skjalesari)");
  /* TOMT MA ALDREI TEIKNA TOMAN VOLL: "engin gogn" og "skaut aldrei" eru
     ekki sama hlutid — tomur vollur les eins og hid sidara (sbr. 6i).   */
  ok(renderToStaticMarkup(React.createElement(ShotMap, { shots: [], calib: F.calib })) === "",
     "leikmadur AN skota fær EKKERT kort (tomur vollur laesist eins og 'skaut aldrei')");
  ok(renderToStaticMarkup(React.createElement(ShotMap, { shots: null, calib: F.calib })) === "",
     "null-inntak hrynur ekki og teiknar ekkert");
  ok(renderToStaticMarkup(React.createElement(ShotMap, { shots, calib: undefined })) !== "",
     "vantandi calib hrynur ekki (fellur a maeld sjalfgildi)");

  /* HNIT I SVG: mark UPPI, svo naerfaeris-skot verda ad hafa LAEGRA cy en
     langskot. Snuist thad vid er vollurinn a hvolfi.                    */
  const near = renderToStaticMarkup(React.createElement(ShotMap, {
    shots: [[2, 50, 0.5, 0, 0, 1]], calib: F.calib }));
  const far = renderToStaticMarkup(React.createElement(ShotMap, {
    shots: [[30, 50, 0.5, 0, 0, 1]], calib: F.calib }));
  const cyOf = h => { const m = [...h.matchAll(/cy="([\d.]+)"/g)].map(x => +x[1]); return Math.max(...m); };
  ok(cyOf(near) < cyOf(far),
     `markid er UPPI: skot a 2 einingum (cy ${cyOf(near).toFixed(0)}) er ofar en a 30 (cy ${cyOf(far).toFixed(0)})`);

  /* RADIUS BER xG — annars er "bubble = xG" i skyringunni LYGI.        */
  const big = renderToStaticMarkup(React.createElement(ShotMap, {
    shots: [[10, 50, 0.9, 2, 0, 1]], calib: F.calib }));
  const small = renderToStaticMarkup(React.createElement(ShotMap, {
    shots: [[10, 50, 0.02, 2, 0, 1]], calib: F.calib }));
  const rOf = h => Math.max(...[...h.matchAll(/r="([\d.]+)"/g)].map(x => +x[1]));
  ok(rOf(big) > rOf(small) * 1.8,
     `hár xG gefur MIKLU staerri kúlu (${rOf(big).toFixed(1)} a moti ${rOf(small).toFixed(1)})`);
}

console.log(`\nSKOTAKORT: ${pass} stodust, ${fail} féllu`);
if (fail) process.exit(1);
