#!/usr/bin/env node
/* ============================================================
   gap-lab.mjs — HVAR LIGGJA THAU 94% AF BILINU SEM ERU OLOKUD?

     node scripts/gap-lab.mjs [--from=2019] [--boot=400]

   -> data/measure/gap.json

   ============================================================
   SPURNINGIN, OG HVERS VEGNA HUN FORGANGSRADAR OLLU ODRU
   ============================================================
   `startsit-lab.mjs` maeldi ad `weeklyProjection` lokar **5,831%** af
   bilinu `flat -> ceiling` (t = 4,328, 7/7 timabil). Talan STENST — en
   hun segir lika ad **94,2% af bilinu se olokad**.

   Adur en meiri vinna er logd i start/sit tharf ad vita HVAR thau 94%
   liggja, thvi bilid er ekki allt sama efnid:

     (a) TILTAEKILEIKI  — sa sem var settur i lidid spiladi ekki eda
                          spiladi skertur. Thetta er AVAILABILITY, ekki
                          spa: rett gogn leysa thad, ekki betra likan.
     (b) HLUTVERK       — leikmadur fekk allt annad hlutverk en adur.
                          Leysanlegt med hlutdeildar-merkjum.
     (c) VORN           — vornin var betri/verri en DvP-talan sagdi.
                          Leysanlegt med betri vornarlikani.
     (d) TD-SLEMBNI     — somu taekifaeri, annad TD-tal. **ENGIN spa
                          naer thessu.**
     (e) OFLOKKAD       — leifin. Hun er BIRT SEM SINN EIGIN FLOKKUR;
                          se hun stor er thad sjalft nidurstadan.

   **(d) ER TALAN SEM SKIPTIR MALI.** Se (d) t.d. 80% af bilinu er
   5,831% naerri thvi sem er MOGULEGT og frekari start/sit-vinna er
   litils virdi. Se (d) 30% er mikid eftir og (a)/(b)/(c) segja hvar.

   ============================================================
   TVENNT SEM MAELINGIN LEIDDI I LJOS OG SEM BEIDNIN GAT EKKI VITAD
   ============================================================
   1. **ThAKID ER STAERRA EN (d).** TD-slembni er adeins EIN tegund
      utkomu-slembni. Sami leikmadur med somu 8 sendingar getur naed
      55 yardum eda 120 — thad er hvorki TD, hlutverk ne vorn, og thad
      er jafn OSPAANLEGT. Taxonomian (a)-(d) hefur ekkert holf fyrir
      thad, svo (d) EIN vanmælir thakid. Thess vegna er thridja
      gagnveroldin (kafli 3b): utkomu-slembni = TD + skilvirkni.
      **Maelt (ppr): TD 18,9% + skilvirkni 10,4% = 29,3% af bilinu.**

   2. **VORNAR-FLOKKURINN (c) ER NULL-BUCKET.** Hann fangar 26,7% af
      bilinu og var thvi *staersti* flokkurinn — en audgun hans er
      **0,96x**: merkid flaggar eftirsja SJALDNAR en venjulega viku.
      Hlutfall an grunntidni er merkingarlaust, og thad er astaedan til
      ad `enrichment` er maeld her. An threpsins faer (d) 17,7% i stad
      10,8% — 1,2 pp fra throskuldalausu tolunni. **Vinnu-rodunin i
      `verdict` er thvi vegin med audgun, ekki hraum hlutfollum.**
      Hefdi hun ekki verid maeld hefdi thessi skra sagt "byrjadu a
      vornarlikaninu", sem er nakvaemlega rong nidurstada.

   ============================================================
   RETROSPECTIVE A MOTI EX ANTE — SA GREINARMUNUR ER ALLT HER
   ============================================================
   Thessi skrifta gerir BADI, og thad er viljandi. Ruglist thau saman
   maelist leki sem innsaei.

   **EX ANTE (engin hindsight, nakvaemlega eins og `startsit-lab`):**
     `flat`    = timabils-spa / 17            (thad sem appid gerir)
     `weekly`  = `weeklyProjection(base, implied, def)`
   Hvorugt ser vikuna. `weekly` fær `avail: 1` a alla — eins og i
   `startsit-lab` — thvi sogulegar meidslaskyrslur per viku eru ekki i
   gognunum. Thad er einmitt astaedan til ad flokkur (a) er MAELDUR og
   ekki agiskadur.

   **RETROSPECTIVE (notar utkomuna, og MA gera thad):**
     `ceiling` = fullkomin vitneskja um vikuna
     FLOKKUNIN sjalf — "hvers vegna var bekkurinn betri?"
   Thetta er GREINING a thvi sem gerdist, ekki spa. Ad flokka orsok
   verdur ekki gert an utkomunnar; thad vaeri spa um spa. Ekkert ur
   flokkuninni fer inn i `weekly` eda `flat`.

   AKKERID ER SKYLDA: skriftan endurgerir 5,831% (ppr) og 2,967% (std)
   ur `startsit_*.json` UPP A THRIDJA AUKASTAF, annars deyr hun. Se
   uppbyggingin ekki sama og i `startsit-lab` er maelingin
   osamanburdarhaef og thessi skra vaeri toluleg skreyting.

   ============================================================
   ThRJAR GAGNVEROLDIR OG TVAER OSKYLDAR LEIDIR AD (d) — ASETT
   ============================================================
   (d) er hausverkurinn: hun a ad vera THROSKULDALAUS thvi hun er
   nidurstadan. Thess vegna er hun maeld tvisvar:

     1. TD-HLUTLAUS GAGNVEROLD (adalmaelingin, ENGIR throskuldar).
        Skiptu raunverulegum TD-stigum hvers leikmanns ut fyrir VAENT
        TD-tal ur hans eigin taekifaerum (maeldar tidnir per stodu).
        Endurreiknadu `ceiling`. Thad sem HVERFUR ur bilinu var
        TD-slembni:  tdShare = 1 - gapTDn / gapFull
        Kvardinn helst thvi summa vaentra TD-stiga = summa raunverulegra
        per stodu ER JAFNGILD — ad SLEPPA TD-um vaeri ekki hlutlaust,
        thad myndi minnka bilid af thvi einu ad stigin yrdu faerri.

     2. FLOKKUNAR-KASKADI (sundurlidunin, med throskuldum).
        Hver bekkjar-eftirsja er flokkud i (a)-(e). Bucket (d) thar er
        OHAD MAT a somu tolu.

   Beri thaer saman er talan traust. Beri thaer ekki saman er thad
   sjalft nidurstada og hun er sogd.

   ============================================================
   THROSKULDARNIR ERU HUNDRADSHLUTAR UR GOGNUNUM, EKKI VALDIR
   ============================================================
   Husreglan: tolur eru MAELDAR, ekki valdar. `A_CUT`/`B_CUT`/`C_CUT`
   eru hundradshlutar raunverulegu dreifinganna (p10 / p80 / p80),
   reiknadir ur sama gagnasetti og birtir i utkomunni. Thad gerir tvennt:

     · thau eru ENDURGERANLEG og segja sjalf hvad thau eru,
     · og af thvi ad grunntidnin er thekkt (10% / 20% / 20%) ma
       reikna AUDGUN: "hve miklu oftar en tilviljun". Hlutfall an
       grunntidni segir litid — 20% i flokki sem hefur 20% grunntidni
       er EKKERT.

   Naemi er keyrt a odru throskulda-setti; breytist rodun orsakanna
   ekki er nidurstadan ekki throskulda-verk.

   ============================================================
   HVAD ER OSYNILEGT — OG THAD ER STAERSTA VARUDIN I THESSARI SKRA
   ============================================================
   Leikmadur sem var OVIRKUR hefur ENGA rod i `data/weekly/`. Baedi
   `weekly` og `ceiling` sia hann ut ur lauginni (sama `p.proj != null`
   skilyrdi), svo hann kemst i HVORUGA uppstillinguna og leggur
   **NULL** til `ceiling - weekly`.

   Thad er ekki villa heldur eiginleiki hermunarinnar: hun er hlutlaus
   milli adferdanna. EN thad thydir ad flokkur (a) her maelir adeins
   **hluta-brest a tiltaekileika** (madur sem spiladi en fekk nanast
   engin taekifaeri: for ut i 1. fjordungi, sat af meidslum). Fullur
   OVIRKILEIKI er UTAN maelingarinnar og talan `invisible` i utkomunni
   segir hve stor sa hluti er af hopa-vikum. (a) her er thvi
   **nedri mork** a tiltaekileika-vandanum.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { weeklyProjection, impliedTeamTotals } from "../src/model.js";
import { optimalLineup, slotsFor, benchRegret } from "../src/lineup.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), { from: "number", boot: "number" });
const FROM = Number(ARG.from ?? 2019);
const BOOT = Number(ARG.boot ?? 400);

/* Deildin er SAMA og i `startsit-lab` — 12 lid, 14 umferdir. Onnur
   deild gefur adra hopa og tha er akkerid ekki akkeri. */
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const SLOTS = slotsFor(LEAGUE);                       // QB,RB1,RB2,WR1..3,TE,FLEX

const FORMATS = ["ppr", "half", "standard"];
const POSN = ["QB", "RB", "WR", "TE"];
/* Rodun stada. NOTUD TIL AD BRJOTA JAFNTEFLI EINS OG `startsit-lab`.
   Sja `lineupIds` — thetta er ekki smekkur, thad er akkerid. */
const PORD = { QB: 0, RB: 1, WR: 2, TE: 3 };
const BANDS = [{ key: "1-4", lo: 1, hi: 4 }, { key: "5-9", lo: 5, hi: 9 },
               { key: "10-17", lo: 10, hi: 17 }];
const CAUSES = ["availability", "role", "defense", "td", "unclassified"];

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const bandOf = (w) => (BANDS.find((b) => w >= b.lo && w <= b.hi) || BANDS[2]).key;
const die = (m) => { console.error(`\n  ${m}\n`); process.exit(2); };
const quant = (a, p) => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(s.length * p)))];
};
/* Fast fraekorn — endurgeranleg keyrsla er krafa, ekki thaegindi. */
const rngOf = (seed) => { let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

/* ============================================================
   1. UPPSTILLING UR MATI — GEGNUM `optimalLineup`, EKKI AFRIT
   ============================================================
   `startsit-lab` hefur sitt eigid graduga `lineupFrom`. Ad afrita thad
   hingad vaeri ONNUR UTFAERSLA a somu reglu og tha gaeti hun rekid i
   sundur an ad neitt segdi fra. Thess vegna er `optimalLineup` ur
   `src/lineup.js` flutt inn — sama fall sem appid notar.

   EITT SKILYRDI ThURFTI AD FINNAST OG ThAD VAR MAELT. Hrátt gefur
   `optimalLineup` **8 af 3.687** uppstillingum annad svar en
   `lineupFrom`, og heildin fell ur 5,831% i 5,657%. Orsokin er ekki
   rokfraedin (badar eru sama gradugu reglan, og `lineup.js` ber
   sonnun a henni) heldur **JAFNTEFLI I FLEX-SAETINU**: `lineupFrom`
   leggur afgangana saman i rodinni RB, WR, TE, svo jafntefli fellur
   RB-manni; `optimalLineup` gengur gegnum fylkid sem thad fekk.
   Vikuleg spa er RUNNUD A 0,1 STIG, svo jafntefli eru raunveruleg.

   Lausnin er ad rada inntakinu eftir stodu (QB,RB,WR,TE). `Array.sort`
   er STODUG i JS, svo rodin INNAN stodu (hopa-rodin) helst — fostu
   saetin fa thvi sama jafnteflis-brot og adur og FLEX faer RB>WR>TE.
   Maelt: **0 af 3.687** og heildin 5,831% upp a thridja aukastaf.
   Vid rodum inntakinu; vid endurskrifum ekki regluna. */
function lineupIds(roster, scoreOf, rowOf) {
  const players = roster
    .map((id) => { const a = rowOf(id); return a ? { id, pos: a.pos, proj: scoreOf(id) } : null; })
    .filter((p) => p && PORD[p.pos] != null && p.proj != null)
    .sort((a, b) => PORD[a.pos] - PORD[b.pos]);
  const res = optimalLineup(players, SLOTS);
  return res.starters.map((s) => s.player && s.player.id).filter(Boolean);
}
const sumPts = (ids, ptOf) => ids.reduce((a, id) => a + (ptOf(id) ?? 0), 0);

/* ============================================================
   2. SUNDURGREINING BILSINS I SKIPTI
   ============================================================
   `ceiling - weekly` er summa STAKRA SKIPTA: menn sem fullkomin
   vitneskja setti i lidid en vikulega spain skildi eftir (`in`), a
   moti theim sem hun setti inn en attu ad sitja (`out`).

   HVERS VEGNA PORUNIN MA VERA GRADUG: summan
     sum actual(in) - sum actual(out)
   er ONHAD PORUNINNI — hun er bara munur tveggja mengja. Porunin
   raedur thvi EINGONGU MERKIMIDANUM, aldrei tolunni. Thad er
   sjalfsprofad hér ad nedan (`pairSumOk`), svo thessi fullyrding se
   ekki bara sogd heldur vardi.

   Fost stodu-por fyrst (thau eru otvirad), sidan afgangurinn (FLEX-
   skipti milli stada) eftir staerstum mun — "staersta eftirsja fyrst",
   sem er sama rodun og notandi myndi sja. */
function pairSwaps(chosen, best, ptOf, posOf) {
  const cs = new Set(chosen), bs = new Set(best);
  const ins = best.filter((id) => !cs.has(id));
  const outs = chosen.filter((id) => !bs.has(id));
  const pairs = [];
  const byPos = (arr) => { const m = new Map();
    for (const id of arr) { const p = posOf(id); if (!m.has(p)) m.set(p, []); m.get(p).push(id); }
    return m; };
  const iP = byPos(ins), oP = byPos(outs);
  const leftIn = [], leftOut = [];
  for (const p of new Set([...iP.keys(), ...oP.keys()])) {
    const a = (iP.get(p) || []).slice().sort((x, y) => (ptOf(y) ?? 0) - (ptOf(x) ?? 0));
    const b = (oP.get(p) || []).slice().sort((x, y) => (ptOf(x) ?? 0) - (ptOf(y) ?? 0));
    const k = Math.min(a.length, b.length);
    for (let i = 0; i < k; i++) pairs.push([a[i], b[i]]);
    leftIn.push(...a.slice(k)); leftOut.push(...b.slice(k));
  }
  leftIn.sort((x, y) => (ptOf(y) ?? 0) - (ptOf(x) ?? 0));
  leftOut.sort((x, y) => (ptOf(x) ?? 0) - (ptOf(y) ?? 0));
  for (let i = 0; i < Math.min(leftIn.length, leftOut.length); i++) pairs.push([leftIn[i], leftOut[i]]);
  return pairs;
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const sched = JSON.parse(await readFile(path.join(OUT, "schedule_history.json"), "utf8"));
  const defFile = JSON.parse(await readFile(path.join(OUT, "defense.json"), "utf8"));
  const dvp = new Map();
  for (const d of defFile) dvp.set(`${d.season}|${d.team}|${d.pos}`, d);

  const years = [...new Set(feats.rows.filter((r) => r.sleeperProj != null || r.ffProj != null)
    .map((r) => r.season))].sort().filter((y) => y >= FROM);

  /* ---------- vikugogn, oll ar i einu ---------- */
  const weekRows = new Map();                 // season -> radir
  for (const y of years) {
    try {
      const w = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8"));
      weekRows.set(y, w.filter((r) => r.week <= 18 && POSN.includes(r.pos)));
    } catch { /* ar an vikugagna er sleppt — sama og i startsit-lab */ }
  }
  requireSeasons([...weekRows.keys()], "timabil med vikugognum");

  /* ============================================================
     3. TAEKIFAERI, TD-STIG OG VAENT TD-TAL
     ============================================================
     `opp` er TAEKIFAERI: fyrir QB kastid + hlaupin, fyrir hina
     hlaup + sendingar a hann. Thad er talan sem "somu taekifaeri,
     annad TD-tal" i skilgreiningu (d) hangir a.

     TD-stig eru FORM-OHAD (4/6/6 i ollum thremur snidum), svo sama
     tala gildir fyrir ppr, half og standard. */
  const oppOf = (r) => (r.pos === "QB" ? (r.att || 0) + (r.car || 0) : (r.car || 0) + (r.tgt || 0));
  const tdPtsOf = (r) => 4 * (r.ptd || 0) + 6 * (r.rtd || 0) + 6 * (r.rectd || 0);

  /* Vaent TD-tal: MAELDAR tidnir per stodu og per taekifaerategund.
     Fittud sem hrein hlutfoll (summa TD-stiga / summa taekifaera), svo
     **summa vaentra TD-stiga = summa raunverulegra** innan hverrar
     stodu. Thad er skilyrdid sem gerir gagnveroldina KVARDA-HLUTLAUSA:
     bilid minnkar tha adeins vegna minni DREIFNI, ekki vegna laegri
     stigafjolda. */
  const tdRate = {};
  for (const p of POSN) {
    let sa = 0, sc = 0, sg = 0, pa = 0, pc = 0, pg = 0;
    for (const [, rs] of weekRows) for (const r of rs) {
      if (r.pos !== p) continue;
      sa += r.att || 0; sc += r.car || 0; sg += r.tgt || 0;
      pa += 4 * (r.ptd || 0); pc += 6 * (r.rtd || 0); pg += 6 * (r.rectd || 0);
    }
    tdRate[p] = { att: sa ? pa / sa : 0, car: sc ? pc / sc : 0, tgt: sg ? pg / sg : 0 };
  }
  const expTdOf = (r) => tdRate[r.pos].att * (r.att || 0) + tdRate[r.pos].car * (r.car || 0) +
                         tdRate[r.pos].tgt * (r.tgt || 0);

  /* ============================================================
     3b. TAEKIFAERA-HLUTLAUS GAGNVEROLD — OG HVERS VEGNA HUN VARD TIL
     ============================================================
     FYRSTA UTGAFA THESSARAR SKRIFTU MAELDI (d) EINA OG FEKK 11,6%,
     med **35,2% OFLOKKAD**. Oflokkada leifin var thvi THREFALT staerri
     en TD-slembnin og hun var ekki thogn heldur SVAR: risastor hluti
     bilsins er "somu taekifaeri, sama hlutverk, sama vorn — ANNAD
     UTKOMA", thar sem munurinn er ekki TD heldur YARDAR PER TAEKIFAERI.

     Madur sem faer 8 sendingar og naer 120 yardum i stad 55 er EKKI
     TD-flukt og hann er ekki hlutverkabreyting. Hann er **skilvirkni-
     flokt** — og thad er jafn OSPAANLEGT og TD-in. Taxonomian (a)-(d)
     sem beðid var um hefur ekki holf fyrir thad, svo an thessarar
     maelingar hefdi ThAKID maelst allt of LAGT og svarid ordid
     "mikid eftir ad gera" ad osonnu.

     Thess vegna er thridja gagnveroldin: skiptu OLLUM stigum ut fyrir
     VAENT stig ur taekifaerunum einum (yardar OG TD). Thad sem eftir er
     af bilinu er thad sem TAEKIFAERA-SPA gaeti i besta falli nad —
     hitt er utkomu-slembni sem engin spa naer:

       outcomeNoise = 1 - gapOppN / gapFull      (TD + skilvirkni)
       tdShare      = 1 - gapTDn  / gapFull      (adeins TD)

     Tidnirnar eru hrein hlutfoll per taekifaerategund, svo summan
     helst og kvardinn haggast ekki (sama rok og vid `expTd`).
     Fumblar og 2pt eru ekki i neinni tegundinni; sa leki er
     **maeldur og prentadur** (`oppNeutralLevelErr`) og hann er sami
     fyrir baedi `ceiling` og `weekly`, svo hann strykur ut i
     HLUTFALLI bilanna sem er talan sem er notud. */
  const RECW = { ppr: 1, half: 0.5, standard: 0 };
  const ptsRate = {};                            // fmt -> pos -> { att, car, tgt }
  const levelErr = {};
  for (const fmt of FORMATS) {
    ptsRate[fmt] = {};
    let sTot = 0, sExp = 0;
    for (const p of POSN) {
      let sa = 0, sc = 0, sg = 0, pa = 0, pc = 0, pg = 0;
      for (const [, rs] of weekRows) for (const r of rs) {
        if (r.pos !== p) continue;
        sa += r.att || 0; sc += r.car || 0; sg += r.tgt || 0;
        /* Sundurlidun er NAKVAEMLEGA SEPARANLEG per taekifaerategund:
           kast-stig hanga a kostum, hlaupa-stig a hlaupum, mottoku-stig
           a sendingum. `passInt` er -1 (sja `BASE` i src/scoring.js). */
        pa += 0.04 * (r.py || 0) + 4 * (r.ptd || 0) - 1 * (r.int || 0);
        pc += 0.1 * (r.ry || 0) + 6 * (r.rtd || 0);
        pg += RECW[fmt] * (r.rec || 0) + 0.1 * (r.recy || 0) + 6 * (r.rectd || 0);
      }
      ptsRate[fmt][p] = { att: sa ? pa / sa : 0, car: sc ? pc / sc : 0, tgt: sg ? pg / sg : 0 };
    }
    for (const [, rs] of weekRows) for (const r of rs) {
      const pts = fmt === "ppr" ? r.ppr : fmt === "half" ? r.half : r.std;
      sTot += pts;
      const q = ptsRate[fmt][r.pos];
      sExp += q.att * (r.att || 0) + q.car * (r.car || 0) + q.tgt * (r.tgt || 0);
    }
    levelErr[fmt] = r3(sTot ? (sExp - sTot) / sTot * 100 : null);
  }
  const expPtsOf = (r, fmt) => { const q = ptsRate[fmt][r.pos];
    return q.att * (r.att || 0) + q.car * (r.car || 0) + q.tgt * (r.tgt || 0); };
  console.log(`taekifaera-hlutlaus kvardi: ` +
    FORMATS.map((f) => `${f} ${levelErr[f] > 0 ? "+" : ""}${levelErr[f]}%`).join(" · ") +
    `  (fumblar/2pt — sami fyrir ceiling og weekly, strykast i hlutfalli)`);

  /* ============================================================
     4. MERKIN — OLL RETROSPECTIVE, OLL UR FYRRI VIKUM SAMA ARS
     ============================================================
     Grunnlinan er **adeins undangengnar vikur** (allt ad 4), thott
     flokkunin MEGI nota framtidina. Astaedan er ekki leki heldur
     merking: spurningin i (b) er "fekk hann annad hlutverk EN VIKUNA
     ADUR", og thad er afturvirk grunnlina i sinni natturu.

     `share` er HLUTDEILD I LIDINU, ekki hra tala — madur sem faer 8
     sendingar i leik sem lidid kastadi 25 sinnum i er i odru hlutverki
     en madur med 8 af 45. Fyrir QB er thad hlutdeild i kostum lidsins
     (hun hrynur thegar hann er tekinn ut), fyrir hina hlutdeild i
     snertingum + sendingum. */
  const teamAtt = new Map(), teamTouch = new Map();
  for (const [y, rs] of weekRows) for (const r of rs) {
    if (!r.team) continue;
    const k = `${y}|${r.week}|${r.team}`;
    teamAtt.set(k, (teamAtt.get(k) || 0) + (r.att || 0));
    teamTouch.set(k, (teamTouch.get(k) || 0) + (r.car || 0) + (r.tgt || 0));
  }
  const shareOf = (r) => {
    const k = `${r.season}|${r.week}|${r.team}`;
    if (r.pos === "QB") { const t = teamAtt.get(k); return t ? (r.att || 0) / t : null; }
    const t = teamTouch.get(k); return t ? ((r.car || 0) + (r.tgt || 0)) / t : null;
  };

  /* Grunnlinur per leikmann-ar, byggdar upp i vikurod. */
  const sig = new Map();                       // "id|season|week" -> merkin
  for (const [y, rs] of weekRows) {
    const byPl = new Map();
    for (const r of rs) { const k = `${r.id}`; if (!byPl.has(k)) byPl.set(k, []); byPl.get(k).push(r); }
    for (const [, arr] of byPl) {
      arr.sort((a, b) => a.week - b.week);
      for (let i = 0; i < arr.length; i++) {
        const r = arr[i];
        const prior = arr.slice(Math.max(0, i - 4), i);
        /* TVAER FYRRI VIKUR ER LAGMARKID. Ein vika er ekki grunnlina,
           hun er ein maeling — og tha vaeri "hlutverkabreyting" bara
           venjulegt flokt. Vikur an grunnlinu eru merktar og TALDAR
           i (e); thad er upplysing um viku-bil 1-4, ekki thogn. */
        const okBase = prior.length >= 2;
        const oppBase = okBase ? mean(prior.map(oppOf)) : null;
        const shPrior = okBase ? prior.map(shareOf).filter((v) => v != null) : [];
        const shareBase = shPrior.length >= 2 ? mean(shPrior) : null;
        const sh = shareOf(r);
        sig.set(`${r.id}|${y}|${r.week}`, {
          pos: r.pos, opp: oppOf(r), oppBase, share: sh, shareBase,
          /* Hlutfall, ekki mismunur: 4 taekifaeri i stad 12 er annad
             mal en 4 i stad 5, thott mismunurinn se sami i sidara. */
          oppRatio: oppBase != null && oppBase >= 5 ? oppOf(r) / oppBase : null,
          shareDev: shareBase != null && shareBase > 0.02 && sh != null
            ? (sh - shareBase) / shareBase : null,
          hasBase: okBase, td: tdPtsOf(r), expTd: expTdOf(r), opp0: oppOf(r) === 0,
        });
      }
    }
  }

  /* Vorn: HVERNIG VORNIN SPILADI I RAUN thessa viku, borid vid
     DvP-toluna. Baedi eru **hlutfall af sinu eigin deildarmedaltali**
     svo stigasnid stryki ut — realized/weekMean deilt med adj/leagueMean.
     Ratio-af-ratio er eina utgafan sem er samanburdarhaef milli ppr og
     standard an ad reikna DvP upp a nytt (thad vaeri onnur utfaersla). */
  const allowRaw = new Map();                  // "y|w|def|pos" -> { ppr, half, standard }
  for (const [y, rs] of weekRows) for (const r of rs) {
    if (!r.opp) continue;
    const k = `${y}|${r.week}|${r.opp}|${r.pos}`;
    const c = allowRaw.get(k) || { ppr: 0, half: 0, standard: 0 };
    c.ppr += r.ppr || 0; c.half += r.half || 0; c.standard += r.std || 0;
    allowRaw.set(k, c);
  }
  const weekMean = new Map();                  // "y|w|pos|fmt" -> medaltal yfir varnir
  {
    const acc = new Map();
    for (const [k, v] of allowRaw) {
      const [y, w, , pos] = k.split("|");
      for (const f of FORMATS) {
        const kk = `${y}|${w}|${pos}|${f}`;
        const c = acc.get(kk) || { s: 0, n: 0 };
        c.s += v[f]; c.n++; acc.set(kk, c);
      }
    }
    for (const [k, c] of acc) weekMean.set(k, c.n ? c.s / c.n : null);
  }
  const defDevOf = (y, w, defTeam, pos, fmt) => {
    const a = allowRaw.get(`${y}|${w}|${defTeam}|${pos}`);
    const m = weekMean.get(`${y}|${w}|${pos}|${fmt}`);
    const d = dvp.get(`${y}|${defTeam}|${pos}`);
    if (!a || !m || m === 0 || !d || !d.leagueMean) return null;
    const realized = a[fmt] / m;               // 1 = eins og medalvorn thessa viku
    const expected = d.adj / d.leagueMean;      // 1 = eins og medalvorn timabilsins
    return expected ? realized / expected : null;
  };

  /* ============================================================
     5. THROSKULDAR — HUNDRADSHLUTAR, REIKNADIR HER
     ============================================================ */
  /* THROSKULDARNIR ERU PER STODU OG THAD VAR MAELT, EKKI KOSID.
     Fyrsta utgafan hafdi EINN throskuld a allar stodur og gaf
     **role = 0,0% hja QB** — ekki af thvi ad leikstjornendur missi
     ekki hlutverk heldur af thvi ad `B_CUT` var 0,721 ur SAMEIGINLEGRI
     dreifingu sem WR og RB raða (16.828 + 11.322 radir a moti 4.490
     QB-radum). Hlutdeild QB i kostum lidsins er naerri 1 og flotar
     litid, svo hann naer ALDREI throskuldi sem er fittadur a
     mottakara-flokt. Talan 0,0% var thvi eiginleiki throskuldsins,
     ekki stadreynd um QB.

     Per stodu heldur grunntidnin 10% / 20% / 20% INNAN hverrar stodu,
     og thad er forsenda thess ad stodurnar seu samanburdarhaefar —
     annars er "TE hefur meira role-flokt" bara "TE er minni hluti
     lauginnar sem throskuldurinn var fittadur a". */
  const popA = {}, popB = {}, popC = {};
  for (const p of POSN) { popA[p] = []; popB[p] = []; popC[p] = []; }
  for (const [, s] of sig) {
    if (!s.pos || !popA[s.pos]) continue;
    if (s.oppRatio != null) popA[s.pos].push(s.oppRatio);
    if (s.shareDev != null) popB[s.pos].push(Math.abs(s.shareDev));
  }
  for (const [y, rs] of weekRows) {
    const seen = new Set();
    for (const r of rs) {
      const k = `${y}|${r.week}|${r.opp}|${r.pos}`;
      if (!r.opp || seen.has(k)) continue;
      seen.add(k);
      const v = defDevOf(y, r.week, r.opp, r.pos, "ppr");
      if (v != null) popC[r.pos].push(Math.abs(v - 1));
    }
  }
  /* p10 a taekifaeri (nedri tail = hrun), p80 a hlutverk og vorn
     (badar attir telja, thess vegna algildi). */
  const A_CUT = {}, B_CUT = {}, C_CUT = {}, ALT = { A: {}, B: {}, C: {} };
  for (const p of POSN) {
    A_CUT[p] = quant(popA[p], 0.10); B_CUT[p] = quant(popB[p], 0.80); C_CUT[p] = quant(popC[p], 0.80);
    ALT.A[p] = quant(popA[p], 0.05); ALT.B[p] = quant(popB[p], 0.90); ALT.C[p] = quant(popC[p], 0.90);
  }
  console.log(`throskuldar ur gognunum (per stodu):`);
  for (const p of POSN) console.log(`  ${p}  A(opp p10)=${r3(A_CUT[p])}` +
    `  B(|share dev| p80)=${r3(B_CUT[p])}  C(|def dev-1| p80)=${r3(C_CUT[p])}` +
    `   [n ${popA[p].length}/${popB[p].length}/${popC[p].length}]`);

  /* ============================================================
     6. FLOKKUNAR-KASKADINN
     ============================================================
     RODIN ER ROKSTUDD, EKKI SMEKKUR. Hver fyrri orsok gerir seinni
     merkin OMARKTAEK: madur sem spiladi nanast ekki hefur lika hrunda
     hlutdeild (thad er sama stadreyndin sed tvisvar) og "vornin
     hleypti fau ad honum" er merkingarlaust um mann sem var ekki a
     vellinum. Thess vegna er spurt "var hann yfirhofud tharna?" fyrst.

     (a) er BUNDIN VID `out` — thann sem VAR SETTUR I LIDID. Thad er
     akvordunin sem notandinn tok og eina hlidin sem er ADGERDAHAEF.
     Sa a bekknum sem hafdi hrunin taekifaeri OG skoradi samt meira er
     ekki tiltaekileika-mal, thad er TD-flukt.

     (b) og (c) eru SAMHVERFAR (badar hlidar taldar) thvi bekkjarmadur
     sem SPRAKK UPP i nyju hlutverki er nakvaemlega thad tilfelli sem
     hlutverka-merki aetti ad na. Merkimidinn fylgir tha theirri hlid
     sem hefur STAERRI leif — hun er sú sem raunverulega faerdi bilid.

     (d) krefst ad ALLT THRENNT se normal og ad TD-a-munurinn skyri
     minnst helming leifarinnar. Tvennt gerir hana varfaerna (og
     varfaerin (d) er retta attin ad skeika i, thvi (d) er ThAKID:
     of ha (d) segir "ekkert ad gera" ad osonnu). */
  const HALF = 0.5;
  function classify(pairIn, pairOut, y, week, fmt, ctx) {
    const sIn = sig.get(`${pairIn}|${y}|${week}`), sOut = sig.get(`${pairOut}|${y}|${week}`);
    const rIn = ctx.resid(pairIn), rOut = ctx.resid(pairOut);
    const dom = Math.abs(rIn) >= Math.abs(rOut) ? "in" : "out";
    const domId = dom === "in" ? pairIn : pairOut;
    const domSig = dom === "in" ? sIn : sOut;
    const domResid = dom === "in" ? rIn : rOut;

    /* (a) — adeins `out`: sa sem var settur i lidid fekk hrunin
       taekifaeri. `opp0` (nakvaemlega 0 taekifaeri) telur alltaf, lika
       an grunnlinu: madur i byrjunarlidi med engin taekifaeri er ekki
       spavilla. Throskuldurinn er ur HANS stodu. */
    if (sOut && (sOut.opp0 || (sOut.oppRatio != null && sOut.oppRatio <= ctx.A[sOut.pos])))
      return { cause: "availability", id: pairOut, pos: ctx.posOf(pairOut) };

    /* (b) — hlutverk, badar hlidar, merkimidi a domineranda ef hann
       er sjalfur merktur, annars a theirri hlid sem er. */
    const bIn = sIn && sIn.shareDev != null && Math.abs(sIn.shareDev) >= ctx.B[sIn.pos];
    const bOut = sOut && sOut.shareDev != null && Math.abs(sOut.shareDev) >= ctx.B[sOut.pos];
    if (bIn || bOut) {
      const id = (dom === "in" && bIn) || (dom === "out" && bOut) ? domId : (bIn ? pairIn : pairOut);
      return { cause: "role", id, pos: ctx.posOf(id) };
    }

    /* (c) — vornin langt fra DvP-tolunni.
       `skipDef` SLEPPIR THESSU THREPI VILJANDI. Astaedan er maeld:
       audgun vornar-merkisins er **0,96x** — thad flaggar eftirsja
       SJALDNAR en venjulega viku. Bucket sem er tilviljun stelur samt
       26,7% af bilinu af thvi einu ad hann stendur framar i kaskadanum
       en (d) og (e). Med `skipDef` sest HVAR thau stig eiga heima, og
       thad er sundurlidunin sem er trulegri. */
    if (!ctx.skipDef) {
      const dIn = ctx.defDev(pairIn), dOut = ctx.defDev(pairOut);
      const cIn = dIn != null && sIn && Math.abs(dIn - 1) >= ctx.C[sIn.pos];
      const cOut = dOut != null && sOut && Math.abs(dOut - 1) >= ctx.C[sOut.pos];
      if (cIn || cOut) {
        const id = (dom === "in" && cIn) || (dom === "out" && cOut) ? domId : (cIn ? pairIn : pairOut);
        return { cause: "defense", id, pos: ctx.posOf(id) };
      }
    }

    /* (d) — taekifaeri, hlutverk og vorn ollu normal; munurinn er TD.
       `expTd` er MAELT vaent TD-tal ur hans eigin taekifaerum, svo
       "TD-a-munur" er ekki "hann skoradi TD" heldur "hann skoradi
       ANNAD en taekifaerin sogdu". */
    if (domSig && Math.abs(domResid) > 0) {
      const tdSurp = Math.abs(domSig.td - domSig.expTd);
      if (tdSurp >= HALF * Math.abs(domResid))
        return { cause: "td", id: domId, pos: ctx.posOf(domId) };
    }
    return { cause: "unclassified", id: domId, pos: ctx.posOf(domId),
             noBase: !(domSig && domSig.hasBase) };
  }

  /* ============================================================
     7. ENDURSPILUN — EITT SNID I EINU
     ============================================================ */
  const anchors = {}, tdCeil = {}, events = [];
  const invisible = { rosterWeeks: 0, noRow: 0, bye: 0, absent: 0 };
  const enr = { pop: {}, swap: {} };
  for (const p of POSN) { enr.pop[p] = { n: 0, a: 0, b: 0, c: 0 }; enr.swap[p] = { n: 0, a: 0, b: 0, c: 0 }; }
  let brChecked = 0, brLeftBad = 0, brAvoidBad = 0, pairSumBad = 0, selfBad = 0;

  /* Rodun ADP: fyrir `half` er hun EKKI til (sja `half-lab.mjs` —
     sogulegt half-ADP ber FFC adeins fyrir yfirstandandi ar). Ppr-ADP
     er notud sem VIKMORK og thad er skrad; hoparnir eru nanast eins
     hvort eda er, og spurningin her er ekki hvad var draftad heldur
     hvad var stillt upp. */
  const rowsBy = new Map();
  for (const r of feats.rows) rowsBy.set(`${r.scoring}|${r.season}|${r.id}`, r);

  for (const fmt of FORMATS) {
    const src = fmt === "standard" ? "standard" : "ppr";
    const closed = [], closedTDn = [], perSeason = {}, tdPerSeason = {};
    let gFull = 0, gTDn = 0, gOppN = 0;

    for (const y of years) {
      const rs = weekRows.get(y);
      if (!rs) continue;
      const games = sched.games.filter((g) => g.season === y && g.type === "REG");
      if (!games.length) continue;

      const implied = new Map(), oppTeam = new Map(), playing = new Map();
      for (const g of games) {
        const t = impliedTeamTotals(g.total, g.spread);
        if (t) { implied.set(`${g.home}|${g.week}`, t.home); implied.set(`${g.away}|${g.week}`, t.away); }
        oppTeam.set(`${g.home}|${g.week}`, g.away); oppTeam.set(`${g.away}|${g.week}`, g.home);
        if (!playing.has(g.week)) playing.set(g.week, new Set());
        playing.get(g.week).add(g.home); playing.get(g.week).add(g.away);
      }

      /* Laugin. `half` er (ppr + standard)/2 — ALGEBRA, ekki nalgun
         (0,5 per motttoku ER medaltal af 1,0 og 0,0). Sama rok og
         `half-lab.mjs` skjalar. */
      const base = feats.rows.filter((r) => r.scoring === src && r.season === y &&
        r.adp != null && (r.sleeperProj != null || r.ffProj != null));
      if (base.length < 120) continue;
      const pool = [];
      for (const r of base) {
        const pj = r.sleeperProj != null ? r.sleeperProj : r.ffProj;
        let proj = pj, act = r.pts;
        if (fmt === "standard") { act = r.ptsStd; }
        if (fmt === "half") {
          const o = rowsBy.get(`standard|${y}|${r.id}`);
          if (!o) continue;                     // opardar radir eru SLEPPT, ekki agiskad
          const sj = o.sleeperProj != null ? o.sleeperProj : o.ffProj;
          if (sj == null) continue;
          proj = (pj + sj) / 2; act = (r.pts + o.ptsStd) / 2;
        }
        pool.push({ id: r.id, pos: r.pos, proj, adp: r.adp, actual: act });
      }
      if (pool.length < 120) continue;

      /* Vikuleg raunstig i thessu snidi + lid leikmannsins tha viku. */
      const wk = new Map(), teamWk = new Map(), weeks = new Set();
      for (const r of rs) {
        weeks.add(r.week);
        const pts = fmt === "ppr" ? r.ppr : fmt === "half" ? r.half : r.std;
        wk.set(`${r.id}|${r.week}`, { pos: r.pos, pts,
          /* TD-hlutlaus utgafa: raunstig - TD-stig + VAENT TD-tal. */
          tdn: pts - tdPtsOf(r) + expTdOf(r),
          /* Taekifaera-hlutlaus: VAENT stig ur taekifaerunum einum. */
          oppn: expPtsOf(r, fmt) });
        if (r.team) teamWk.set(`${r.id}|${r.week}`, r.team);
      }
      const wl = [...weeks].sort((a, b) => a - b);
      const seasonTeam = new Map();             // mest-spilada lid (fyrir bye-talningu)
      { const cnt = new Map();
        for (const r of rs) { if (!r.team) continue;
          const k = `${r.id}|${r.team}`; cnt.set(k, (cnt.get(k) || 0) + 1); }
        for (const [k, c] of cnt) { const [id, t] = k.split("|");
          const cur = seasonTeam.get(id);
          if (!cur || c > cur.c) seasonTeam.set(id, { t, c }); } }

      const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
      const field = new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1]));
      const rosters = [];
      for (let slot = 1; slot <= TEAMS; slot++)
        rosters.push(simulateDraft({ board: field, fieldBoard: field, actual, slot, league: LEAGUE }).roster);
      const projOf = new Map(pool.map((p) => [p.id, p.proj]));

      let sFlat = 0, sWeek = 0, sCeil = 0, n = 0;
      let sFlatN = 0, sWeekN = 0, sCeilN = 0;
      let sWeekO = 0, sCeilO = 0;
      /* Fraekornid er EINS og i `startsit-lab` (y*7919) og hendingar-
         uppstillingin er kollud i somu rod, svo `floor` sem thar er
         reiknadur eyði nakvaemlega somu slembitolum. Vid notum hann
         ekki, en ad sleppa honum vaeri ad nota annan straum. */
      for (const roster of rosters) {
        for (const week of wl) {
          const rowOf = (id) => wk.get(`${id}|${week}`) || null;
          const played = roster.filter((id) => rowOf(id));
          if (played.length < 9) continue;
          n++;

          if (fmt === "ppr") {                  // talid EINU SINNI
            invisible.rosterWeeks += roster.length;
            for (const id of roster) {
              if (rowOf(id)) continue;
              invisible.noRow++;
              const t = seasonTeam.get(id);
              const pl = playing.get(week);
              if (t && pl && !pl.has(t.t)) invisible.bye++; else invisible.absent++;
            }
          }

          const ptOf = (id) => { const a = rowOf(id); return a ? a.pts : null; };
          const tdnOf = (id) => { const a = rowOf(id); return a ? a.tdn : null; };
          const oppnOf = (id) => { const a = rowOf(id); return a ? a.oppn : null; };
          const posOf = (id) => { const a = rowOf(id); return a ? a.pos : null; };
          const flatS = (id) => (projOf.get(id) ?? 0) / 17;
          const weekS = (id) => {
            const a = rowOf(id); if (!a) return null;
            const b = (projOf.get(id) ?? 0) / 17;
            const team = teamWk.get(`${id}|${week}`);
            const imp = team ? implied.get(`${team}|${week}`) : null;
            const opp = team ? oppTeam.get(`${team}|${week}`) : null;
            const d = opp ? dvp.get(`${y}|${opp}|${a.pos}`) : null;
            const wp = weeklyProjection({ base: b, pos: a.pos, implied: imp,
              def: d ? { adj: d.adj, leagueMean: d.leagueMean } : null, avail: 1, bye: false });
            return wp && wp.pts != null ? wp.pts : b;
          };

          const idFlat = lineupIds(roster, flatS, rowOf);
          const idWeek = lineupIds(roster, weekS, rowOf);
          const idCeil = lineupIds(roster, ptOf, rowOf);
          const vFlat = sumPts(idFlat, ptOf), vWeek = sumPts(idWeek, ptOf), vCeil = sumPts(idCeil, ptOf);
          sFlat += vFlat; sWeek += vWeek; sCeil += vCeil;

          /* TD-hlutlaus gagnverold. `weekly` VELUR EINS (hun ser ekki
             TD-in hvort eda er) og er adeins SKORUD upp a nytt; adeins
             `ceiling` er endurvalid, thvi fullkomin vitneskja i theim
             heimi er vitneskja um TD-hlutlaus stig. */
          const idCeilN = lineupIds(roster, tdnOf, rowOf);
          sFlatN += sumPts(idFlat, tdnOf);
          sWeekN += sumPts(idWeek, tdnOf);
          sCeilN += sumPts(idCeilN, tdnOf);

          /* Taekifaera-hlutlaus gagnverold: sama uppskrift, en NU er
             baedi TD- og skilvirkni-flokt farid. Thad sem eftir er af
             bilinu er thad sem TAEKIFAERA-SPA gaeti nad. */
          const idCeilO = lineupIds(roster, oppnOf, rowOf);
          sWeekO += sumPts(idWeek, oppnOf);
          sCeilO += sumPts(idCeilO, oppnOf);

          /* ---------- SJALFSPROF a hverri uppstillingu ---------- */
          if (pairSwaps(idCeil, idCeil, ptOf, posOf).length !== 0 ||
              pairSwaps(idFlat, idFlat, ptOf, posOf).length !== 0) selfBad++;

          /* `benchRegret` ur `src/lineup.js` — OHAD UTFAERSLA a somu
             tolu. Se `weekly` raunverulega `optimalLineup` undir
             vikuspanni tha er `avoidable` = 0 og `left` = bilid. Thetta
             er ekki skraut: thad profar ad endurspilunin OG appid seu
             sama vélin. */
          {
            const st = idWeek.slice();
            const bn = played.filter((id) => !st.includes(id));
            const mk = (ids) => ids.map((id) => ({ id, pos: posOf(id) }));
            const am = {}, pm = {};
            for (const id of played) { am[id] = ptOf(id); pm[id] = weekS(id); }
            const br = benchRegret({ started: mk(st), bench: mk(bn), actual: am,
              projected: pm, slots: SLOTS });
            brChecked++;
            /* VIKMORKIN ERU 0,105 OG THAD ER MAELT, EKKI VALID.
               `benchRegret` skilar `perfect: round1(...)` og reiknar
               sidan `left: round1(perfect.projected - yours)` — talan er
               thvi RUNNUD TVISVAR. Vikuleg ppr-stig hafa TVO aukastafi
               (0,04 per kastyarda: 521 af 6.436 radum 2023), svo summa
               attra manna er t.d. 121,37 -> 121,4 og skekkjan hledst upp
               i 0,05 + 0,05. Fyrsta utgafan hafdi 0,051 og fell i
               162/3.508 — EKKI af jafnteflum heldur af runnun. Vikmork
               sem eru THRENGRI en einingin sem talan er birt i maela
               framsetningu, ekki samhljod. */
            if (Math.abs(br.left - (vCeil - vWeek)) > 0.105) brLeftBad++;
            if (Math.abs(br.avoidable) > 0.051) brAvoidBad++;
          }

          /* ---------- AUDGUN: NULLLINAN FYRIR HVERT MERKI ----------
             HLUTFALL AN GRUNNTIDNI SEGIR EKKERT. `C_CUT` er p80, svo
             20% AF OLLUM leikmanna-vikum eru flaggadar hvort sem
             eftirsja er eda ekki. Fangi vornar-merkid 22% af bilinu er
             thad **tilviljun i dulargervi**, ekki merki.

             Nulllinan er sami merki-hlutfall a ollum theim sem VORU I
             LAUGINNI thessa viku (their sem hofdu rod og gatu thvi
             verid valdir). Audgun = hlutfall i skiptum / hlutfall i
             lauginni. Audgun ~1,0 = merkid greinir eftirsja EKKI fra
             venjulegri viku. */
          if (fmt === "ppr") for (const id of played) {
            const s = sig.get(`${id}|${y}|${week}`);
            if (!s) continue;
            const p = s.pos;
            if (!p || !enr.pop[p]) continue;
            enr.pop[p].n++;
            if (s.opp0 || (s.oppRatio != null && s.oppRatio <= A_CUT[p])) enr.pop[p].a++;
            if (s.shareDev != null && Math.abs(s.shareDev) >= B_CUT[p]) enr.pop[p].b++;
            const team = teamWk.get(`${id}|${week}`);
            const opp = team ? oppTeam.get(`${team}|${week}`) : null;
            const dd = opp ? defDevOf(y, week, opp, p, "ppr") : null;
            if (dd != null && Math.abs(dd - 1) >= C_CUT[p]) enr.pop[p].c++;
          }

          /* ---------- skiptin og flokkunin ---------- */
          const pairs = pairSwaps(idWeek, idCeil, ptOf, posOf);
          let ps = 0;
          const ctx = { A: A_CUT, B: B_CUT, C: C_CUT, posOf,
            resid: (id) => { const a = rowOf(id); const w = weekS(id);
              return a && w != null ? a.pts - w : 0; },
            defDev: (id) => { const team = teamWk.get(`${id}|${week}`);
              const opp = team ? oppTeam.get(`${team}|${week}`) : null;
              const a = rowOf(id);
              return opp && a ? defDevOf(y, week, opp, a.pos, fmt) : null; } };
          const ctxAlt = { ...ctx, A: ALT.A, B: ALT.B, C: ALT.C };
          for (const [pin, pout] of pairs) {
            const loss = (ptOf(pin) ?? 0) - (ptOf(pout) ?? 0);
            ps += loss;
            /* Sama merki-talning, en adeins a theim sem TOKU THATT i
               skiptum. Badar hlidar taldar, thvi merkid ma na hvorri
               sem er (sama og i kaskadanum). */
            if (fmt === "ppr") for (const id of [pin, pout]) {
              const s = sig.get(`${id}|${y}|${week}`);
              const p = s && s.pos;
              if (!p || !enr.swap[p]) continue;
              enr.swap[p].n++;
              if (s.opp0 || (s.oppRatio != null && s.oppRatio <= A_CUT[p])) enr.swap[p].a++;
              if (s.shareDev != null && Math.abs(s.shareDev) >= B_CUT[p]) enr.swap[p].b++;
              const team = teamWk.get(`${id}|${week}`);
              const opp = team ? oppTeam.get(`${team}|${week}`) : null;
              const dd = opp ? defDevOf(y, week, opp, p, "ppr") : null;
              if (dd != null && Math.abs(dd - 1) >= C_CUT[p]) enr.swap[p].c++;
            }
            const c = classify(pin, pout, y, week, fmt, ctx);
            const cAlt = classify(pin, pout, y, week, fmt, ctxAlt);
            const cND = classify(pin, pout, y, week, fmt, { ...ctx, skipDef: true });
            events.push({ fmt, y, band: bandOf(week), pos: c.pos, cause: c.cause,
              causeAlt: cAlt.cause, causeNoDef: cND.cause, loss, cluster: c.id,
              noBase: c.cause === "unclassified" && c.noBase });
          }
          /* SUMMA SKIPTANNA VERDUR AD VERA BILID. Ef hun er ekki thad
             er porunin ekki bijection og hlutfollin summast ekki i 100%. */
          if (Math.abs(ps - (vCeil - vWeek)) > 1e-6) pairSumBad++;
        }
      }
      if (!n) continue;
      const pct = sCeil - sFlat > 0 ? (sWeek - sFlat) / (sCeil - sFlat) * 100 : null;
      const pctN = sCeilN - sFlatN > 0 ? (sWeekN - sFlatN) / (sCeilN - sFlatN) * 100 : null;
      closed.push(pct); closedTDn.push(pctN);
      gFull += sCeil - sWeek; gTDn += sCeilN - sWeekN; gOppN += sCeilO - sWeekO;
      perSeason[y] = { lineups: n, flat: r1(sFlat / n), weekly: r1(sWeek / n),
        ceiling: r1(sCeil / n), gapPerLineup: r1((sCeil - sFlat) / n),
        pctOfGapClosed: r3(pct) };
      tdPerSeason[y] = { gapFull: r1((sCeil - sWeek) / n), gapTDn: r1((sCeilN - sWeekN) / n),
        gapOppN: r1((sCeilO - sWeekO) / n),
        tdShare: r3(sCeil - sWeek > 0 ? (1 - (sCeilN - sWeekN) / (sCeil - sWeek)) * 100 : null),
        outcomeNoiseShare: r3(sCeil - sWeek > 0 ? (1 - (sCeilO - sWeekO) / (sCeil - sWeek)) * 100 : null),
        pctOfGapClosedTDn: r3(pctN) };
    }

    const ys = Object.keys(perSeason).map(Number).sort();
    requireSeasons(ys, `timabil i sniði ${fmt}`);
    const lineupCount = ys.reduce((a, y) => a + perSeason[y].lineups, 0);
    anchors[fmt] = { seasons: ys, perSeason, lineups: lineupCount,
      pctOfGapClosed: r3(mean(closed)) };
    tdCeil[fmt] = { perSeason: tdPerSeason,
      gapFullPerLineup: r3(gFull / lineupCount),
      tdShare: r3(gFull > 0 ? (1 - gTDn / gFull) * 100 : null),
      outcomeNoiseShare: r3(gFull > 0 ? (1 - gOppN / gFull) * 100 : null),
      efficiencyShare: r3(gFull > 0 ? (gTDn - gOppN) / gFull * 100 : null),
      pctOfGapClosedTDn: r3(mean(closedTDn)),
      perSeasonTdShare: ys.map((y) => tdPerSeason[y].tdShare),
      perSeasonOutcomeNoise: ys.map((y) => tdPerSeason[y].outcomeNoiseShare) };
    console.log(`${fmt.padEnd(9)} pctOfGapClosed=${anchors[fmt].pctOfGapClosed}` +
      `  TD-slembni ${tdCeil[fmt].tdShare}%` +
      `  + skilvirkni ${tdCeil[fmt].efficiencyShare}%` +
      `  = utkomu-slembni ${tdCeil[fmt].outcomeNoiseShare}%`);
  }

  /* ============================================================
     8. AKKERIN OG SJALFSPROFIN — SKRIFTAN DEYR FREMUR EN AD SKRIFA
     ============================================================ */
  const expect = {};
  for (const f of ["ppr", "standard"]) {
    try { expect[f] = JSON.parse(await readFile(path.join(OUT, `startsit_${f}.json`), "utf8")).totals.pctOfGapClosed; }
    catch { expect[f] = null; }
  }
  const selfTests = {
    sameEstimatorZeroSwaps: selfBad === 0,
    pairSumEqualsGap: pairSumBad === 0,
    benchRegretLeftMatches: { checked: brChecked, bad: brLeftBad },
    benchRegretAvoidableZero: { checked: brChecked, bad: brAvoidBad },
    anchorPpr: { got: anchors.ppr.pctOfGapClosed, want: expect.ppr },
    anchorStandard: { got: anchors.standard.pctOfGapClosed, want: expect.standard },
  };
  if (selfBad) die(`SJALFSPROF FELL: sami metill gaf skipti i ${selfBad} tilfellum.\n` +
    "   `ceiling - ceiling` og `flat - flat` VERDA ad vera 0 skipti.");
  if (pairSumBad) die(`SJALFSPROF FELL: summa skipta != bilid i ${pairSumBad} uppstillingum.\n` +
    "   Tha er porunin ekki bijection og hlutfollin summast ekki i 100%.");
  /* Jafnteflis-brot i `benchRegret` er ekki alveg thad sama (hun
     raular `[...started, ...bench]` og thar er FLEX-madurinn ekki i
     stodu-rod), svo krafan er hlutfallsleg og MAELD, ekki 100%. */
  if (brChecked && brLeftBad / brChecked > 0.01)
    die(`SJALFSPROF FELL: benchRegret.left != ceiling-weekly i ${brLeftBad}/${brChecked}.`);
  if (brChecked && brAvoidBad / brChecked > 0.01)
    die(`SJALFSPROF FELL: benchRegret.avoidable != 0 i ${brAvoidBad}/${brChecked}` +
      " — `weekly` er tha ekki optimalLineup undir vikuspanni.");
  for (const f of ["ppr", "standard"]) {
    if (expect[f] == null) die(`AKKERI VANTAR: data/startsit_${f}.json las ekki.`);
    if (Math.abs(anchors[f].pctOfGapClosed - expect[f]) > 0.0005)
      die(`AKKERID BRAST (${f}): ${anchors[f].pctOfGapClosed}% a moti ${expect[f]}% ur startsit_${f}.json.\n` +
        "   Uppbyggingin er tha EKKI su sama og i startsit-lab og maelingin er osamanburdarhaef.\n" +
        "   Thetta er ekki naemi-atriði — thad er akkerid.");
  }
  console.log(`\nakkeri OK: ppr ${anchors.ppr.pctOfGapClosed}% = ${expect.ppr}%` +
    ` · standard ${anchors.standard.pctOfGapClosed}% = ${expect.standard}%`);
  console.log(`sjalfsprof OK: sami metill -> 0 skipti · summa skipta = bilid` +
    ` · benchRegret left ${brChecked - brLeftBad}/${brChecked}, avoidable ${brChecked - brAvoidBad}/${brChecked}`);

  /* ============================================================
     9. HLUTFOLL PER HOLF + BOOTSTRAP KLASAD PER LEIKMANN
     ============================================================
     Klasinn er LEIKMADURINN sem merkimidinn hangir a. Sami madur
     kemur fyrir i morgum af 12 hopum og i morgum vikum, svo
     uppstillingar eru EKKI ohadar — ars-klasun svarar "flokta arin?"
     en her er spurningin "hefdi onnur teikning ur somu leikmanna-
     dreifingu gefid sama svar?". `vbdbase-lab` maeldi hvad thetta
     kostar: 29 holf voru marktaek eftir timabili og **0 af 153** per
     leikmanni. Thess vegna er thad thessi klasun sem er birt. */
  function shares(evs) {
    const tot = evs.reduce((a, e) => a + e.loss, 0);
    const per = {};
    for (const c of CAUSES) per[c] = 0;
    for (const e of evs) per[e.cause] += e.loss;
    return { tot, per };
  }
  function cellStats(evs, nLineups) {
    if (!evs.length) return null;
    const { tot, per } = shares(evs);
    /* Klasar: einn per leikmann. */
    const byCl = new Map();
    for (const e of evs) { if (!byCl.has(e.cluster)) byCl.set(e.cluster, []); byCl.get(e.cluster).push(e); }
    const cls = [...byCl.values()];
    const boot = {};
    for (const c of CAUSES) boot[c] = [];
    if (BOOT > 0 && cls.length >= 5) {
      const rnd = rngOf(cls.length * 7919 + evs.length * 104729 + 11);
      for (let b = 0; b < BOOT; b++) {
        const acc = {}; for (const c of CAUSES) acc[c] = 0;
        let t = 0;
        for (let i = 0; i < cls.length; i++) {
          for (const e of cls[Math.floor(rnd() * cls.length)]) { acc[e.cause] += e.loss; t += e.loss; }
        }
        if (t > 0) for (const c of CAUSES) boot[c].push(acc[c] / t * 100);
      }
    }
    const out = {};
    for (const c of CAUSES) {
      const a = boot[c].slice().sort((x, y) => x - y);
      out[c] = {
        share: r3(tot > 0 ? per[c] / tot * 100 : null),
        points: r3(nLineups ? per[c] / nLineups : null),
        ci: a.length >= 50 ? [r1(a[Math.floor(a.length * 0.025)]), r1(a[Math.floor(a.length * 0.975)])] : null,
        n: evs.filter((e) => e.cause === c).length,
      };
    }
    return { totalPoints: r3(nLineups ? tot / nLineups : null), events: evs.length,
      clusters: cls.length, causes: out };
  }

  const lineupsOf = (fmt) => Object.values(anchors[fmt].perSeason).reduce((a, s) => a + s.lineups, 0);
  const cells = {}, rollFmt = {}, rollPos = {}, rollBand = {};
  for (const fmt of FORMATS) {
    const nL = lineupsOf(fmt);
    const fe = events.filter((e) => e.fmt === fmt);
    rollFmt[fmt] = cellStats(fe, nL);
    for (const p of POSN) rollPos[`${p}|${fmt}`] = cellStats(fe.filter((e) => e.pos === p), nL);
    for (const b of BANDS) rollBand[`${b.key}|${fmt}`] = cellStats(fe.filter((e) => e.band === b.key), nL);
    for (const p of POSN) for (const b of BANDS)
      cells[`${p}|${b.key}|${fmt}`] = cellStats(fe.filter((e) => e.pos === p && e.band === b.key), nL);
  }

  /* Naemi: sama sundurlidun med odru throskulda-setti, OG an
     vornar-threpsins (audgun 0,96x — sja `skipDef`). */
  const sens = {}, sensNoDef = {};
  for (const fmt of FORMATS) {
    const fe = events.filter((e) => e.fmt === fmt);
    sens[fmt] = cellStats(fe.map((e) => ({ ...e, cause: e.causeAlt })), lineupsOf(fmt));
    sensNoDef[fmt] = cellStats(fe.map((e) => ({ ...e, cause: e.causeNoDef })), lineupsOf(fmt));
  }
  /* ============================================================
     VIKMORK A ThAKINU — KLASAD PER TIMABIL, OG THAD ER SAGT HVERS VEGNA
     ============================================================
     Hlutfollin i kaskadanum eru klasad PER LEIKMANN thvi merkimidinn
     hangir a leikmanni. `outcomeNoise` og `tdShare` eru hins vegar
     UPPSTILLINGA-tolur — thaer eru ekki summa leikmanna-atburda heldur
     hlutfall tveggja heilda, svo "leikmadur" er ekki eining theirra.
     Their eru thvi klasad PER TIMABIL (t-vikmork, 7 ar) og thad er
     merkt sem slikt. Ad kalla thad leikmanna-klasun vaeri ranglega
     throngari fullyrding en gognin bera. */
  const tCI = (a) => {
    const v = a.filter((x) => x != null);
    if (v.length < 3) return null;
    const m = mean(v);
    const sd = Math.sqrt(mean(v.map((x) => (x - m) ** 2)) * v.length / (v.length - 1));
    const se = sd / Math.sqrt(v.length);
    const tc = v.length > 6 ? 2.447 : 2.776;    // df = n-1 (7 ar -> 2,447)
    return { mean: r3(m), lo: r3(m - tc * se), hi: r3(m + tc * se), n: v.length };
  };
  for (const fmt of FORMATS) {
    tdCeil[fmt].outcomeNoiseCI = tCI(tdCeil[fmt].perSeasonOutcomeNoise);
    tdCeil[fmt].tdShareCI = tCI(tdCeil[fmt].perSeasonTdShare);
    tdCeil[fmt].clustering = "season (7); these are lineup-level ratios, not sums of player events";
  }

  /* Audgun, per stodu og samanlagt. */
  const enrich = {};
  {
    const tot = { pop: { n: 0, a: 0, b: 0, c: 0 }, swap: { n: 0, a: 0, b: 0, c: 0 } };
    for (const p of POSN) for (const side of ["pop", "swap"])
      for (const k of ["n", "a", "b", "c"]) tot[side][k] += enr[side][p][k];
    const mk = (P, S) => {
      const o = {};
      for (const [k, name] of [["a", "availability"], ["b", "role"], ["c", "defense"]]) {
        const pr = P.n ? P[k] / P.n : null, sr = S.n ? S[k] / S.n : null;
        o[name] = { poolRate: r3(pr == null ? null : pr * 100), swapRate: r3(sr == null ? null : sr * 100),
          enrichment: r3(pr && sr != null ? sr / pr : null) };
      }
      return { poolN: P.n, swapN: S.n, signals: o };
    };
    enrich.all = mk(tot.pop, tot.swap);
    for (const p of POSN) enrich[p] = mk(enr.pop[p], enr.swap[p]);
  }

  const noBaseShare = (() => {
    const fe = events.filter((e) => e.fmt === "ppr" && e.cause === "unclassified");
    const t = fe.reduce((a, e) => a + e.loss, 0);
    const nb = fe.filter((e) => e.noBase).reduce((a, e) => a + e.loss, 0);
    return r3(t > 0 ? nb / t * 100 : null);
  })();

  /* ============================================================
     10. UTPRENTUN
     ============================================================ */
  const line = "=".repeat(100);
  console.log(`\n${line}\n  SUNDURLIDUN BILSINS \`ceiling - weekly\` — HLUTFALL AF BILINU\n${line}`);
  for (const fmt of FORMATS) {
    const s = rollFmt[fmt];
    console.log(`\n  ${fmt.toUpperCase()}  (bil ${s.totalPoints} stig/uppstillingu · ${s.events} skipti · ${s.clusters} leikmenn)`);
    console.log(`  ${"orsok".padEnd(15)}${"hlutf.".padStart(9)}${"stig".padStart(9)}${"95% CI (per leikmann)".padStart(26)}${"n".padStart(8)}`);
    for (const c of CAUSES) {
      const q = s.causes[c];
      console.log(`  ${c.padEnd(15)}${(q.share == null ? "-" : q.share.toFixed(1) + "%").padStart(9)}` +
        `${(q.points == null ? "-" : q.points.toFixed(2)).padStart(9)}` +
        `${(q.ci ? `[${q.ci[0].toFixed(1)}%, ${q.ci[1].toFixed(1)}%]` : "-").padStart(26)}${String(q.n).padStart(8)}`);
    }
    console.log(`  ${"SUMMA".padEnd(15)}${(CAUSES.reduce((a, c) => a + (s.causes[c].share || 0), 0)).toFixed(1).padStart(8)}%`);
  }

  console.log(`\n${line}\n  ThAKID — HVE MIKID AF BILINU NAER ENGIN SPA?\n${line}`);
  console.log(`  ${"snid".padEnd(10)}${"TD-slembni".padStart(13)}${"kaskadi (d)".padStart(13)}` +
    `${"+ skilvirkni".padStart(14)}${"= UTKOMU-SLEMBNI".padStart(18)}${"eftir: taekif.".padStart(16)}${"pctClosed".padStart(11)}`);
  for (const fmt of FORMATS) {
    const t = tdCeil[fmt];
    console.log(`  ${fmt.padEnd(10)}${(t.tdShare.toFixed(1) + "%").padStart(13)}` +
      `${(rollFmt[fmt].causes.td.share.toFixed(1) + "%").padStart(13)}` +
      `${(t.efficiencyShare.toFixed(1) + "%").padStart(14)}` +
      `${(t.outcomeNoiseShare.toFixed(1) + "%").padStart(18)}` +
      `${((100 - t.outcomeNoiseShare).toFixed(1) + "%").padStart(16)}` +
      `${(anchors[fmt].pctOfGapClosed.toFixed(1) + "%").padStart(11)}`);
  }
  console.log(`  per timabil (ppr) utkomu-slembni: ${tdCeil.ppr.perSeasonOutcomeNoise.map((v) => v.toFixed(1)).join(" · ")}`);
  for (const fmt of FORMATS) {
    const o = tdCeil[fmt].outcomeNoiseCI, t = tdCeil[fmt].tdShareCI;
    console.log(`  ${fmt.padEnd(9)} utkomu-slembni 95% CI (klasad per timabil) [${o.lo}%, ${o.hi}%]` +
      ` · TD-slembni [${t.lo}%, ${t.hi}%]`);
  }

  console.log(`\n${line}\n  AUDGUN — GREINA MERKIN EFTIRSJA FRA VENJULEGRI VIKU?\n${line}`);
  console.log(`  ${"merki".padEnd(15)}${"i lauginni".padStart(12)}${"i skiptum".padStart(12)}${"audgun".padStart(10)}`);
  for (const [k, nm] of [["availability", "availability"], ["role", "role"], ["defense", "defense"]]) {
    const s = enrich.all.signals[k];
    console.log(`  ${nm.padEnd(15)}${(s.poolRate.toFixed(1) + "%").padStart(12)}` +
      `${(s.swapRate.toFixed(1) + "%").padStart(12)}${(s.enrichment == null ? "-" : s.enrichment.toFixed(2) + "x").padStart(10)}`);
  }
  console.log(`  (laug ${enrich.all.poolN} leikmanna-vikur · skipti ${enrich.all.swapN} hlidar)`);

  console.log(`\n${line}\n  PER STODU (ppr, hlutfall af bilinu)\n${line}`);
  console.log(`  ${"stada".padEnd(8)}${CAUSES.map((c) => c.slice(0, 11).padStart(14)).join("")}${"stig/upps.".padStart(12)}`);
  for (const p of POSN) {
    const s = rollPos[`${p}|ppr`];
    if (!s) { console.log(`  ${p.padEnd(8)}  (engin skipti)`); continue; }
    console.log(`  ${p.padEnd(8)}${CAUSES.map((c) => (s.causes[c].share == null ? "-" : s.causes[c].share.toFixed(1) + "%").padStart(14)).join("")}` +
      `${s.totalPoints.toFixed(2).padStart(12)}`);
  }
  /* Sama tafla AN vornar-threpsins. Hun er su sem a ad lesa per stodu:
     med threpinu fara 22-35% af hverri stodu i bucket sem greinir
     ekkert, og tha er "WR hefur adeins 5,5% TD-slembni" ekki stadreynd
     um WR heldur um hve mikid threpid hirti fra honum. */
  const rollPosND = {};
  for (const p of POSN) rollPosND[p] = cellStats(events.filter((e) => e.fmt === "ppr" && e.pos === p)
    .map((e) => ({ ...e, cause: e.causeNoDef })), lineupsOf("ppr"));
  console.log(`\n  PER STODU AN VORNAR-THREPSINS (ppr) — talan sem a ad lesa`);
  console.log(`  ${"stada".padEnd(8)}${CAUSES.map((c) => c.slice(0, 11).padStart(14)).join("")}${"stig/upps.".padStart(12)}`);
  for (const p of POSN) {
    const s = rollPosND[p];
    if (!s) continue;
    console.log(`  ${p.padEnd(8)}${CAUSES.map((c) => (s.causes[c].share == null ? "-" : s.causes[c].share.toFixed(1) + "%").padStart(14)).join("")}` +
      `${s.totalPoints.toFixed(2).padStart(12)}`);
  }

  console.log(`\n  PER VIKU-BIL (ppr)`);
  console.log(`  ${"vikur".padEnd(8)}${CAUSES.map((c) => c.slice(0, 11).padStart(14)).join("")}${"stig/upps.".padStart(12)}`);
  for (const b of BANDS) {
    const s = rollBand[`${b.key}|ppr`];
    if (!s) continue;
    console.log(`  ${b.key.padEnd(8)}${CAUSES.map((c) => (s.causes[c].share == null ? "-" : s.causes[c].share.toFixed(1) + "%").padStart(14)).join("")}` +
      `${s.totalPoints.toFixed(2).padStart(12)}`);
  }

  console.log(`\n  OSYNILEGT: ${invisible.noRow} af ${invisible.rosterWeeks} hopa-vikum (` +
    `${(invisible.noRow / invisible.rosterWeeks * 100).toFixed(1)}%) hafa ENGA rod i data/weekly` +
    ` — ${invisible.bye} aud vika, ${invisible.absent} fjarverandi.`);
  console.log(`  Their eru siadir ut ur BADUM uppstillingum og leggja NULL til bilsins.` +
    ` Flokkur (a) her er thvi nedri mork.`);
  console.log(`  OFLOKKAD an grunnlinu (ppr): ${noBaseShare}% af oflokkada bilinu` +
    ` — vikur 1-2 hafa engar tvaer fyrri vikur.`);
  console.log(`  NAEMI (annad throskulda-sett, ppr): ` +
    CAUSES.map((c) => `${c.slice(0, 4)} ${sens.ppr.causes[c].share.toFixed(1)}%`).join(" · "));
  console.log(`  AN VORNAR-THREPSINS (audgun 0,96x, ppr): ` +
    CAUSES.map((c) => `${c.slice(0, 4)} ${sensNoDef.ppr.causes[c].share.toFixed(1)}%`).join(" · "));

  /* ============================================================
     11. NIDURSTADAN — REIKNUD UR TOLUNUM
     ============================================================ */
  const P = rollFmt.ppr.causes;
  const tdA = tdCeil.ppr.tdShare, tdB = P.td.share, tdC = sensNoDef.ppr.causes.td.share;
  const noise = tdCeil.ppr.outcomeNoiseShare;
  /* Rodun: HVAR BORGAR NAESTA VINNA SIG.
     Adeins (a)/(b)/(c) eru adgerdahaefar. TVENNT RADAR THEIM, ekki
     eitt: STIGIN (hlutfall af litlu bili er litil vinna) OG AUDGUNIN
     (bucket sem fangar sinn eigin grunntidni-hlut er tilviljun i
     dulargervi og thar er ekkert ad vinna). Vinnu-vaenting er thvi
     stigin **ad fradregnum theim hluta sem tilviljun hefdi gefid**:
         adjusted = points * max(0, 1 - 1/enrichment)
     Audgun 1,0 -> 0 stig ad vinna. Audgun 2,0 -> helmingurinn er
     merki. Thad er nedri mork og thad er retta attin ad skeika i. */
  const enrOf = { availability: enrich.all.signals.availability.enrichment,
    role: enrich.all.signals.role.enrichment, defense: enrich.all.signals.defense.enrichment };
  const actionable = ["availability", "role", "defense"]
    .map((c) => ({ cause: c, share: P[c].share, points: P[c].points, ci: P[c].ci,
      enrichment: enrOf[c],
      signalPoints: r3(enrOf[c] ? P[c].points * Math.max(0, 1 - 1 / enrOf[c]) : 0) }))
    .sort((a, b) => b.signalPoints - a.signalPoints);
  const verdict = {
    /* (d) — TVAER OSKYLDAR LEIDIR, OG THRIDJA TALAN SEM SAETTIR THAER.
       Throskuldalausa gagnveroldin gefur 18,9%, kaskadinn 10,8%. Su
       gja var EKKI mælióvissa heldur **null-bucket**: vornar-threpid
       stendur framar en (d) i kaskadanum og hirdir 26,7% af bilinu
       med audgun 0,96x — the. an ad greina eftirsja fra venjulegri
       viku. Se thad threp fellt ut (`skipDef`) faer (d) **17,7%**, sem
       er 1,2 pp fra throskuldalausu tolunni.

       ThAD ER SAMHLJODID: tvaer aðferdir sem eiga ekkert sameiginlegt
       — ein endurreiknar ceiling i gagnverold, onnur flokkar stok
       skipti — gefa 18,9% og 17,7%. Og lagfaeringin var ekki fittud
       til ad na theim saman; hun var akvedin af AUDGUNARMAELINGU sem
       veit ekkert um TD. */
    tdRandomness: { counterfactual: tdA, cascade: tdB, cascadeNoDefenseStep: tdC,
      preferred: tdA, agree: Math.abs(tdA - tdC) < 3,
      statement: `TD-slembni: throskuldalaus gagnverold ${tdA}%, kaskadi an null-bucketsins ${tdC}%` +
        ` (${r3(Math.abs(tdA - tdC))} pp a milli). Kaskadinn MED vornar-threpinu gefur ${tdB}%` +
        " og thad er vanmat — threpid stelur fra (d) med audgun 0,96x.",
      whyDefenseStepIsNull: `defense-merkid flaggar ${enrich.all.signals.defense.swapRate}% skipta` +
        ` en ${enrich.all.signals.defense.poolRate}% lauginnar — audgun` +
        ` ${enrich.all.signals.defense.enrichment}x. Bucket sem er tilviljun.` },
    /* ThAKID ER STAERRA EN (d) EIN. TD er adeins ein tegund utkomu-
       slembni; yardar per taekifaeri eru onnur og jafn ospaanleg. */
    outcomeNoise: { share: noise, td: tdA, efficiency: tdCeil.ppr.efficiencyShare,
      perSeason: tdCeil.ppr.perSeasonOutcomeNoise,
      statement: `Utkomu-slembni (TD + skilvirkni) er ${noise}% af bilinu.` +
        ` Adeins ${r3(100 - noise)}% er taekifaera-spaanlegt.` },
    closableCeiling: r3(100 - noise),
    achievedOfClosable: r3(anchors.ppr.pctOfGapClosed / Math.max(1e-9, 100 - noise) * 100),
    nextWork: actionable,
    unclassified: { share: P.unclassified.share, points: P.unclassified.points,
      noBaselineShareOfIt: noBaseShare },
    /* Kaefir TD-slembni merkid? Ef vikuspain lokadi MEIRA i TD-hlutlausum
       heimi vaeri merkid til en drukknadi. Prófid er berort. */
    weeklyInTdNeutralWorld: { tdNeutral: tdCeil.ppr.pctOfGapClosedTDn,
      real: anchors.ppr.pctOfGapClosed,
      lift: r3(tdCeil.ppr.pctOfGapClosedTDn - anchors.ppr.pctOfGapClosed) },
  };
  console.log(`\n${line}\n  NIDURSTADA\n${line}`);
  console.log(`  ThAKID: ${verdict.outcomeNoise.statement}`);
  console.log(`    ur thvi: TD-slembni ${tdA}% · skilvirkni (yardar/taekifaeri) ${tdCeil.ppr.efficiencyShare}%`);
  console.log(`  (d) ${verdict.tdRandomness.statement}`);
  console.log(`  -> lokanlegt bil ~${verdict.closableCeiling}%; spain naer ${anchors.ppr.pctOfGapClosed}%` +
    ` af ollu bilinu = ${verdict.achievedOfClosable}% af thvi lokanlega.`);
  console.log(`  I TD-hlutlausum heimi lokar sama spa ${verdict.weeklyInTdNeutralWorld.tdNeutral}%` +
    ` (lyfting ${verdict.weeklyInTdNeutralWorld.lift > 0 ? "+" : ""}${verdict.weeklyInTdNeutralWorld.lift} pp)` +
    ` — ${verdict.weeklyInTdNeutralWorld.lift > 0 ? "TD-slembni KAEFIR merkid" : "merkid batnar EKKI thott TD-flokt se fjarlaegt"}.`);
  console.log(`  HVAR BORGAR NAESTA VINNA SIG (ppr, rodad eftir merki-stigum):`);
  actionable.forEach((a, i) => console.log(`    ${i + 1}. ${a.cause.padEnd(14)} ${a.points.toFixed(2)} stig` +
    ` = ${a.share.toFixed(1)}% af bilinu · audgun ${a.enrichment == null ? "-" : a.enrichment.toFixed(2) + "x"}` +
    ` -> merki ${a.signalPoints.toFixed(2)} stig  CI ${a.ci ? `[${a.ci[0]}%, ${a.ci[1]}%]` : "-"}`));
  console.log(`  OFLOKKAD: ${P.unclassified.share.toFixed(1)}% (${P.unclassified.points.toFixed(2)} stig)` +
    ` — ${noBaseShare}% af thvi er vikur an grunnlinu.`);

  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", "gap.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: { from: 2019, boot: 400 },
      inputs: ["features.json", "schedule_history.json", "defense.json",
        ...years.map((y) => `weekly/${y}.json`), "startsit_ppr.json", "startsit_standard.json"],
      dataDir: OUT }),
    question: "Hvar liggja thau 94% af flat->ceiling bilinu sem weeklyProjection lokar ekki?",
    seasons: years,
    method: {
      exAnte: ["flat = seasonProjection/17", "weekly = weeklyProjection(base, implied, def), avail=1"],
      retrospective: ["ceiling = perfect weekly knowledge", "cause classification of every bench regret"],
      leakage: "Nothing from the classification enters flat or weekly. The classifier is analysis of what happened, not a forecast.",
      lineupEngine: "src/lineup.js optimalLineup, input sorted QB,RB,WR,TE to reproduce startsit-lab FLEX tie-breaks (measured: 0/3687 mismatches, 8/3687 unsorted)",
      pairing: "same-position pairs first, then cross-position by largest regret; the SUM is pairing-invariant and that is self-tested",
      cascade: "availability (started player only) -> role -> defense -> td -> unclassified; order is justified because each earlier cause corrupts the later signals",
      tdCounterfactual: "actual TD points replaced by expected TD points from the player's own opportunities (measured per-position rates); sums are preserved per position so the scale is unchanged",
      halfScoring: "half = (ppr + standard) / 2, exact algebra; half ADP does not exist historically so PPR ADP is used as a bound (same convention as half-lab.mjs)",
      clustering: "bootstrap clustered per player (the player the label is attached to)",
    },
    thresholds: {
      perPosition: true,
      A_availability: { value: A_CUT, definition: "p10 of opp/oppBase over player-weeks with oppBase>=5, PER POSITION", baseRate: 10 },
      B_role: { value: B_CUT, definition: "p80 of |relative deviation of team-opportunity share from prior-4-week mean|, PER POSITION", baseRate: 20 },
      C_defense: { value: C_CUT, definition: "p80 of |realized position points allowed / DvP expectation - 1|, both normalised to their own league mean, PER POSITION", baseRate: 20 },
      sensitivitySet: ALT,
      note: "Percentiles, not chosen numbers. Per position because a pooled cut is fitted on the WR/RB mass and then never fires for QB — the first version reported role=0.0% for QB, which was a property of the threshold, not a fact about QBs.",
    },
    tdRatePerOpportunity: tdRate,
    ptsRatePerOpportunity: ptsRate,
    oppNeutralLevelErr: levelErr,
    enrichment: enrich,
    anchors: { ...anchors, expected: expect, selfTests },
    tdCeiling: tdCeil,
    rollupByFormat: rollFmt,
    rollupByPosition: rollPos,
    rollupByPositionNoDefenseStep: rollPosND,
    rollupByWeekBand: rollBand,
    cells,
    sensitivity: sens,
    sensitivityNoDefenseStep: sensNoDef,
    invisible: { ...invisible,
      pctOfRosterWeeks: r3(invisible.noRow / invisible.rosterWeeks * 100),
      note: "Players with no weekly row are filtered out of BOTH lineups and contribute ZERO to ceiling-weekly. Category (a) therefore measures only PARTIAL availability failure and is a lower bound." },
    unclassifiedNoBaselineShare: noBaseShare,
    verdict,
  }, null, 1));
  console.log(`\n-> data/measure/gap.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
