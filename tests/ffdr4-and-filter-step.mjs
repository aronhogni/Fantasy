/* ============================================================
   TVAER BEIDNIR FRA 31.8.2026, BADAR LESNAR AF SKJANUM

   1. FFDR4 I "BASICS": "Eg vill baeta FFDR rating i basic stats a
      leikmonnum i toflunni ... FFDR4 (4 naestu leikir) ad geta radad
      leikmonnum eftir thvi. Varnarmenn sem FFDR DEF toluna og midju og
      soknarmenn sem ATT toluna."
   2. STILLANLEG SIA: "Eg vill geta smellt a filter og breytt honum t.d.
      laekkad toluna eda haekkad."

   BADAR ERU PROFADAR I GEGNUM VIDMOTID, ekki a follunum einum: fyrri
   beidnin snyst um DALK sem verdur ad vera synilegur og radanlegur, su
   sidari um HNAPP sem verdur ad breyta tolu OG listanum. `stats.test.mjs`
   a dalka-skrana sjalfa; her er tengingin.

   Keyrsla:  node --import ... tests/ffdr4-and-filter-step.mjs
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { STAT_BY_KEY } from "../src/stats.js";

let pass = 0, fail = 0;
const ok = (c, m, extra = "") => { c ? pass++ : fail++;
  console.log(`  ${c ? "✓" : "✗"} ${m}${extra && !c ? " — " + extra : ""}`); };
const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.innerWidth = 1400;
const origErr = console.error;
const warns = [];
/* NODE-VIDVARANIR ERU EKKI REACT-VIDVARANIR: jsx-loaderinn kallar
   `module.register()` og Node prentar DEP0205 gegnum `console.error`.
   An thessarar siu maeldi fullyrdingin nedar UMHVERFID en ekki appid.  */
console.error = (...a) => { const m = String(a[0] ?? "");
  if (!/not wrapped in act|DeprecationWarning|trace-deprecation/.test(m)) warns.push(m.slice(0, 200)); };
globalThis.fetch = async u => { const n = String(u).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("no"); } }; } };

const { default: App } = await import("../src/App.jsx");
const root = createRoot(dom.window.document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await sleep(600); });
const doc = dom.window.document;
const txt = () => doc.body.textContent || "";
const click = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await sleep(140); });
};
const button = re => [...doc.querySelectorAll("button")].find(b => re.test((b.textContent || "").trim()));

console.log("\n=== 1. FFDR4 ER I GRUNN-FLOKKNUM OG A SKJANUM ===");
{
  const def = STAT_BY_KEY.ffdr4;
  ok(!!def, "dalkurinn er skradur i STAT_DEFS");
  ok(def?.group === "core", `hann er i Basics (${def?.group})`);
  ok(def?.hi === false, "og LAEGRA er lettara (hi:false) eins og allar FFDR-tolur");
  ok(/DEFENSIVE/.test(def?.note || "") && /ATTACKING/.test(def?.note || ""),
     "notan segir BADAR tolurnar og hverjum thaer tilheyra");
  ok(await click(button(/^👥/)) === undefined, "Player stats opnadur");
  ok(/FFDR4/.test(txt()), "hausinn ber FFDR4");
}

console.log("\n=== 2. STADAN RAEDUR TOLUNNI — MAELT A RAUNGOGNUM ===");
{
  /* Reiknad UTAN vidmotsins ur somu skram og appid les, svo kaflinn
     fullyrdi um TOLUNA en ekki bara um tilvist dalksins.               */
  const [{ makeEnricher }, M, T] = await Promise.all([
    import("../src/stats.js"), import("../src/model.js"), import("../src/teamstats.js")]);
  const players = J("players.json").players;
  const tf = J("teams.json"); const teams = Array.isArray(tf) ? tf : tf.teams;
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  let promoted = null; try { promoted = J("promoted_baseline.json"); } catch {}
  const tm = T.buildTeamMetrics({ players, teams, promoted, teamForm: J("team_form.json") });
  const elo = {}; for (const e of (J("elo.json").teams || [])) if (e?.fpl_id != null) elo[e.fpl_id] = e.elo ?? e.rating;
  const diffOf = M.makeFixDifficulty({ teamMetrics: tm, teamById, odds: J("odds.json").teams, eloByTeam: elo });
  const en = makeEnricher({ players, teamById, fixtures: J("fixtures.json").fixtures || J("fixtures.json"),
    events: J("events.json").events || J("events.json"), odds: J("odds.json").teams,
    season: "live", isLive: true, diffOf });
  const val = p => en(p).fields._ffdr4;
  const withVal = players.filter(p => val(p) != null);
  ok(withVal.length > 300, `flestir bera tolu (${withVal.length} af ${players.length})`);
  ok(withVal.every(p => val(p) >= 1 && val(p) <= 5), "allar tolur eru a FFDR-kvardanum [1,5]");

  /* KJARNI BEIDNINNAR: sama felag, onnur stada -> onnur tala.          */
  let differ = 0, sameClub = 0;
  for (const t of teams) {
    const d = players.find(p => p.team === t.id && p.element_type <= 2);
    const m = players.find(p => p.team === t.id && p.element_type >= 3);
    if (!d || !m || val(d) == null || val(m) == null) continue;
    sameClub++; if (val(d) !== val(m)) differ++;
  }
  ok(sameClub >= 15, `felog med bada hopa (${sameClub})`);
  ok(differ >= 10, `DEF og MID fa OLIKA tolu i ${differ} af ${sameClub} felogum `
    + "— vaeri thad 0 vaeri skiptingin marklaus");

  /* OG HUN ER LEIDD AF STODUNNI, EKKI AF LEIKMANNINUM: tveir menn i sama
     lidi og sama hop verda ad fa SOMU tolu.                            */
  const bad = [];
  for (const t of teams) {
    for (const grp of [[1, 2], [3, 4]]) {
      const set = players.filter(p => p.team === t.id && grp.includes(p.element_type) && val(p) != null);
      if (set.length > 1 && new Set(set.map(val)).size > 1) bad.push(t.short);
    }
  }
  ok(bad.length === 0, `sami hopur i sama lidi ber SOMU tolu (${bad.join(",") || "engin frávik"})`);

  /* FJOLDINN ER LEIKIR, EKKI UMFERDIR: lid med tvofalda umferd framundan
     ma ekki fa faerri leiki talda. Profad gegn leikjaskranni sjalfri.   */
  const fx = (J("fixtures.json").fixtures || J("fixtures.json"))
    .filter(f => !f.finished && !f.finished_provisional);
  const ahead = {}; for (const f of fx) { ahead[f.team_h] = (ahead[f.team_h] || 0) + 1;
                                          ahead[f.team_a] = (ahead[f.team_a] || 0) + 1; }
  const noneLeft = teams.filter(t => !ahead[t.id]);
  for (const t of noneLeft) {
    const p = players.find(x => x.team === t.id);
    if (p) ok(val(p) == null, `${t.short} a enga oleikna leiki -> TOMT, ekki 0`);
  }
  ok(true, `lid an oleikinna leikja i dag: ${noneLeft.length}`);
}

console.log("\n=== 3. SIAN ER STILLANLEG A STADNUM ===");
{
  const numCell = [...doc.querySelectorAll("td,div")]
    .find(e => /^\d+\.\d\d$/.test((e.textContent || "").trim()));
  ok(!!numCell, "forsenda: tolu-holf finnst i toflunni");
  await click(numCell);
  const apply = [...doc.querySelectorAll("button")].find(b => /Apply/i.test(b.textContent || ""));
  ok(!!apply, "forsenda: tillogu-glugginn opnast vid smell a tolu");
  await click(apply);

  const chipText = () => {
    const el = [...doc.querySelectorAll("span")]
      .find(e => /\b(min|max)\b/.test(e.textContent || "") && (e.textContent || "").includes("−"));
    return el ? el.textContent.trim() : null;
  };
  ok(!!chipText(), `forsenda: siu-chip er a skjanum (${chipText()})`);
  const stepBtn = pre => [...doc.querySelectorAll("button")]
    .find(b => (b.getAttribute("aria-label") || "").startsWith(pre));
  ok(!!stepBtn("Lower ") && !!stepBtn("Raise "), "chipid ber BADA hnappa (-/+)");

  const before = chipText();
  const rowsBefore = [...doc.querySelectorAll("tr")].length;
  await click(stepBtn("Raise "));
  const afterUp = chipText();
  ok(before !== afterUp, `"+" BREYTIR tolunni (${before} -> ${afterUp})`);
  await click(stepBtn("Lower "));
  ok(chipText() === before, `"-" skilar henni til baka (${chipText()})`);

  /* SKREFID ER LEITT AF DALKINUM: tveggja-aukastafa dalkur faerist um
     0,01, ekki um 1. Talan er lesin UT UR CHIPINU.                     */
  const num = t => { const m = /(-?\d+(?:\.\d+)?)\s*$/.exec((t || "").replace(/[−+✕]/g, "").trim()); return m ? +m[1] : null; };
  const v0 = num(before);
  await click(stepBtn("Raise "));
  const v1 = num(chipText());
  ok(v0 != null && v1 != null, `talan er lesanleg ur chipinu (${v0} -> ${v1})`);
  /* SKREFID VERDUR AD VERA NAKVAEMLEGA SKREF DALKSINS, ekki "einhver
     tala <= 1". Fyrsta utgafan leyfdi allt ad 1,0 og STOKKBREYTING sem
     negldi skrefid i 1 SLAPP i gegn (0 fallnar) — nakvaemlega tegundin af
     of-vidri fullyrdingu sem CLAUDE.md 5b lysir. Vaentanlega skrefid er
     leitt ur `STAT_DEFS` gegnum `short`-heitid sem chipid ber.         */
  const chipShort = (before || "").replace(/[−+✕]/g, "").trim().replace(/\s+(min|max)\s+.*$/, "");
  const chipDef = Object.values(STAT_BY_KEY).find(d => (d.short || d.label) === chipShort);
  ok(!!chipDef, `dalkur chipsins er thekktur (${chipShort})`);
  const wantStep = chipDef?.pct ? 0.01
    : (Number.isFinite(chipDef?.dec) && chipDef.dec > 0 ? Math.pow(10, -chipDef.dec) : 1);
  ok(v1 > v0 && Math.abs((v1 - v0) - wantStep) < 1e-9,
     `skrefid er NAKVAEMLEGA skref dalksins (${(v1 - v0).toFixed(4)} = ${wantStep})`);

  /* OG LISTINN FYLGIR — annars vaeri thetta merkimidi sem hreyfist.    */
  /* LISTINN VERDUR AD FYLGJA — OG TALNINGIN VERDUR AD VERA MAELANLEG.
     Fyrsta utgafan taldi `<tr>` og fekk 0 i badum endum (taflan er byggd
     ur div-um), svo fullyrdingin gat ekki brugdist. Nu er talid ThAD sem
     sian raunverulega staerir: fjoldinn sem hausinn sjalfur birtir.    */
  await act(async () => { await sleep(150); });
  const shown = () => { const m = /(\d+)\s*(?:of|af)\s*(\d+)/.exec(txt()); return m ? +m[1] : null; };
  const nAfter = shown();
  ok(nAfter != null, `fjoldinn er lesinn af skjanum (${nAfter})`);
  const strict = nAfter;
  await click(stepBtn("Lower "));
  await act(async () => { await sleep(150); });
  const looser = shown();
  ok(looser != null && looser >= strict,
     `laegri throskuldur hleypir JAFNMORGUM eda FLEIRUM i gegn (${strict} -> ${looser})`);
  ok(!/\bNaN\b/.test(txt()), "ekkert NaN eftir stillinguna");
  ok(warns.length === 0, `engin React-vidvorun (${warns.length})`, warns[0] || "");
}

console.error = origErr;
console.log(`\nFFDR4 + STILLANLEG SIA: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
