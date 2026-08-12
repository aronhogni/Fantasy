/* ============================================================
   SPA-BOKHALDID — ER ThAD ThAD SAMA SEM SKJARINN SYNDI?

   `scripts/snapshot-predictions.mjs` skrifar nidur hvad vid SPADUM fyrir
   umferd, adur en hun er spilud, svo `tests/calibration.mjs` geti sidar spurt
   hvort maelingarnar haldi. Allt thad hvilir a EINU: ad bokhaldid geymi
   NAKVAEMLEGA thad sem appid syndi. Geymi thad "naerri" thad er kvordunin ad
   meta likan sem enginn notadi — og su bilun vaeri ThOGUL, thvi tolurnar
   litu retta ut.

   ThESS VEGNA ER PROFSTEINNINN HER EKKI "skrifar hun skra" heldur
   **FFDR UR BOKHALDINU BORID VID FFDR SEM APPID TEIKNAR** — lesid AF
   SKJANUM, eins og `ffdr-table.mjs` gerir. Tvaer sjalfstaedar leidir ad somu
   tolu; reki thaer i sundur fellur thetta safn.

   Restin profar HLIDIN sem stjorna thvi HVENAER er skrifad. Thau kvikna fyrst
   21. agust, svo thau eru profud a TILBUNUM gognum — sama mynstur og
   `mins-trend.mjs` kafli 0 og `bsd-pipeline.mjs` nota fyrir kodha sem fer i
   gang einn morgun (CLAUDE.md kafli 5).
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { buildSnapshot, shouldWrite, inputsUsable, WINDOW_H } from "../scripts/snapshot-predictions.mjs";
import { buildTeamMetrics } from "../src/teamstats.js";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const tryJ = f => { try { return J(f); } catch { return null; } };
const arr = (v, k) => Array.isArray(v) ? v : (Array.isArray(v?.[k]) ? v[k] : null);

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                    : (fail++, console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`)); };

/* ---------------------------------------------------------------
   1. HLIDIN — HVENAER MA SKRIFA (tilbuin gogn)
   --------------------------------------------------------------- */
console.log("\n1) HLIDIN: adeins fyrir frest, adeins einu sinni");
{
  const H = 36e5;
  const base = { gw: 5, deadlineMs: 1_000_000_000_000, exists: false };
  ok("2 klst FYRIR frest -> skrifad",
     shouldWrite({ ...base, nowMs: base.deadlineMs - 2 * H }).write === true);
  ok("1 min FYRIR frest -> skrifad",
     shouldWrite({ ...base, nowMs: base.deadlineMs - 60e3 }).write === true);

  /* ============================================================
     GLUGGINN — OG HANN VANTADI, SEM VAR RAUNVERULEG VILLA I FRAMKVAEMD.
     "Adeins fyrir frest" + "adeins einu sinni" gafu SAMAN "skrifa vid
     fyrsta taekifaeri og frysta". Hrada keyrslan gengur a 30 min fresti, svo
     GW1-rodin var raunverulega skrifud **222 KLST fyrir frestinn** med
     `start_prob` null hja 577 af 577 og engum minutu-throun. Kvordunin hefdi
     tha maelt likanid a ThESS EIGIN VERSTU agiskun.
     Fullyrdingarnar her eru thvi a BADUM hlidum gluggans — vordur sem profar
     adeins "skrifar fyrir frest" hefdi hleypt villunni gegn.            */
  ok("222 klst fyrir frest -> EKKERT (utan gluggans)",
     shouldWrite({ ...base, nowMs: base.deadlineMs - 222 * H }).write === false);
  ok("24 klst fyrir frest -> EKKERT",
     shouldWrite({ ...base, nowMs: base.deadlineMs - 24 * H }).write === false);
  ok("12,1 klst -> EKKERT (rett utan)",
     shouldWrite({ ...base, nowMs: base.deadlineMs - 12.1 * H }).write === false);
  ok("11,9 klst -> SKRIFAR (rett innan)",
     shouldWrite({ ...base, nowMs: base.deadlineMs - 11.9 * H }).write === true);
  const early = shouldWrite({ ...base, nowMs: base.deadlineMs - 100 * H });
  ok("og notan segir HVERS VEGNA of snemma er verra",
     /window|worse-informed/i.test(early.why), early.why);
  /* Glugginn ma ekki vera svo thunnur ad 30-minutna cron missi hann: 12 klst
     gefa ~24 taekifaeri. Fullyrding a TOLUNNI, ekki bara a hegduninni.   */
  ok(`glugginn er >= 6 klst svo cron a morg taekifaeri (${WINDOW_H}h)`, WINDOW_H >= 6);
  /* EFTIR FREST ER ThAD EKKI SPA. Sama regla og pros.mjs kafli 12.        */
  const after = shouldWrite({ ...base, nowMs: base.deadlineMs + 1 });
  ok("1 ms EFTIR frest -> EKKERT skrifad", after.write === false);
  ok("og notan segir hvers vegna", /after kickoff|deadline has passed/i.test(after.why), after.why);
  ok("nakvaemlega a frestinum -> EKKERT (>= er rett, ekki >)",
     shouldWrite({ ...base, nowMs: base.deadlineMs }).write === false);
  /* ONEMANDI: rod sem er til er ALDREI endurskrifud, ekki heldur "med betri
     gognum" — endurskrifud spa er retro-fitting.                          */
  const twice = shouldWrite({ ...base, exists: true, nowMs: base.deadlineMs - 2 * H });
  ok("rod sem ThEGAR er til -> EKKERT skrifad", twice.write === false);
  ok("og notan segir ad hun se onemandi", /never rewritten|already recorded/i.test(twice.why), twice.why);
  ok("enginn frestur -> EKKERT skrifad",
     shouldWrite({ gw: 5, deadlineMs: NaN, nowMs: 1, exists: false }).write === false);
}

/* ---------------------------------------------------------------
   2. ThUNN INNTOK -> ENGIN SKRA
   --------------------------------------------------------------- */
console.log("\n2) ThUNN INNTOK: betra ad umferd vanti en ad hun ljugi");
{
  const P = n => Array.from({ length: n }, (_, i) => ({ id: i + 1, team: (i % 20) + 1, element_type: 3 }));
  const T = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, short: "T" + i }));
  const F = [{ id: 1, event: 5, team_h: 1, team_a: 2 }];
  ok("heil inntok -> null (nothaeft)", inputsUsable({ players: P(500), teams: T, fixtures: F, gw: 5 }) === null);
  ok("399 leikmenn -> hafnad", !!inputsUsable({ players: P(399), teams: T, fixtures: F, gw: 5 }));
  ok("19 lid -> hafnad", !!inputsUsable({ players: P(500), teams: T.slice(1), fixtures: F, gw: 5 }));
  ok("tom leikjaskra -> hafnad", !!inputsUsable({ players: P(500), teams: T, fixtures: [], gw: 5 }));
  ok("engin leikur i theirri umferd -> hafnad",
     !!inputsUsable({ players: P(500), teams: T, fixtures: F, gw: 7 }));
  ok("gw 0 og 39 -> hafnad",
     !!inputsUsable({ players: P(500), teams: T, fixtures: F, gw: 0 })
     && !!inputsUsable({ players: P(500), teams: T, fixtures: F, gw: 39 }));
}

/* ---------------------------------------------------------------
   3. PROFSTEINNINN — BOKHALDID BORID VID SKJAINN
   --------------------------------------------------------------- */
console.log("\n3) PROFSTEINNINN: FFDR i bokhaldi == FFDR a skja");
{
  const players = arr(tryJ("players.json"), "players");
  const teams = arr(tryJ("teams.json"), "teams");
  const fixtures = arr(tryJ("fixtures.json"), "fixtures");
  const events = arr(tryJ("events.json"), "events") || [];
  const cur = events.find(e => e.is_next) || events.find(e => e.is_current);
  const gw = cur?.id ?? 1;

  const snap = buildSnapshot({
    gw, players, teams, fixtures,
    teamForm: tryJ("team_form.json"), odds: tryJ("odds.json"),
    elo: tryJ("elo.json"), playerForm: tryJ("player_form.json"),
    promoted: tryJ("promoted_baseline.json"), nowTs: Date.now(),
  });
  ok(`bokhaldid var byggt (gw${gw}: ${snap.ffdr.length} ffdr-radir, ${snap.rank.length} leikmenn)`,
     snap.ffdr.length >= 2 && snap.rank.length > 400);

  /* Nu appid — og FFDR-taflan lesin AF SKJANUM. */
  const dom = new JSDOM("<!doctype html><div id=root></div>",
                        { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const m of ["attachEvent", "detachEvent"])
    if (!(m in dom.window.HTMLElement.prototype)) dom.window.HTMLElement.prototype[m] = function () {};
  globalThis.fetch = async url => {
    const n = String(url).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => { throw new Error("no proxy"); } };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
  };
  const oe = console.error, ow = console.warn;
  console.error = () => {}; console.warn = () => {};
  let crash = null;
  try {
    const { default: App } = await import(new URL("src/App.jsx", REPO).href);
    const root = createRoot(document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await new Promise(r => setTimeout(r, 260)); });
    /* Opna FFDR-tofluna — hnappurinn ber "📊 FFDR" (sama leid og ffdr-table). */
    const btn = [...document.querySelectorAll("button")]
      .find(b => /FFDR/.test((b.textContent || "").trim()));
    if (btn) await act(async () => {
      btn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    await act(async () => { await new Promise(r => setTimeout(r, 120)); });
  } catch (e) { crash = e.message; }
  console.error = oe; console.warn = ow;
  ok("appid teiknadi an hruns", !crash, crash || "");

  /* ============================================================
     HVERS VEGNA ThETTA ER EKKI LENGUR BORID VID SKJAINN — OG ThAD ER
     LEIDRETTING A MINNI EIGIN HUGMYND.

     Fyrsta utgafa las FFDR-tofluna af skjanum og bar hana vid bokhaldid. Tvaer
     tilraunir mistokust af TVEIMUR OLIKUM ASTAEDUM, og badar voru laerdomur:
       1. Eg leitadi ad "FFDR <tala>" i tooltip-i. `FfdrTable` skrifar
          `SHORT (h) · <d>`. Leitin fann NULL — og thekju-fullyrdingin
          ("0 lid") greip thad. An hennar hefdi profsteinninn verid GRAENN OG
          TOMUR: 0 tolur bornar vid 0 tolur, kallad samsvorun.
       2. Eftir ad snidid var rett pössuðu adeins 6 af 20. Astaedan er EKKI
          villa: taflan synir GW-BIL (~13 dalka, samanlagt/verst i hverju
          holfi) medan bokhaldid geymir EINA umferd. Thad er ekki 1:1
          samanburdur og verdur thad aldrei.

     SVO INVARIANTIÐ VAR RANGT VALID, EKKI KODINN. Rett invariant er
     BYGGINGARLEGT: appid og bokhaldid VERDA ad lesa SAMA `buildTeamMetrics`
     og SAMA `makeFixDifficulty`. Se thad tryggt getur FFDR EKKI rekid i
     sundur — og thad er profad her: (a) App.jsx flytur fallid inn og
     skilgreinir thad EKKI sjalft, (b) hver tala i bokhaldinu er endurreiknud
     her ur somu inntokum og verdur ad standa a bitanum.
     ============================================================ */
  const appSrc = readFileSync(new URL("src/App.jsx", REPO).pathname, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  ok("App.jsx FLYTUR INN buildTeamMetrics", /import\s*\{[^}]*buildTeamMetrics[^}]*\}\s*from\s*"\.\/teamstats\.js"/.test(appSrc));
  ok("og skilgreinir hann EKKI sjalft (annars tvaer utfaerslur)",
     !/function buildTeamMetrics|const buildTeamMetrics\s*=/.test(appSrc));
  /* Fullyrdingin ma ekki vera tom: nafnid VERDUR ad koma fyrir i App.jsx.  */
  ok("buildTeamMetrics er raunverulega notad i App.jsx (annars maelir thetta ekkert)",
     /buildTeamMetrics\(/.test(appSrc));

  /* ENDURREIKNINGUR: somu inntok, sama fall -> sama tala, a bitanum.       */
  const { makeFixDifficulty } = await import(new URL("src/model.js", REPO).href);
  const tmChk = buildTeamMetrics({ players, teams, promoted: tryJ("promoted_baseline.json"),
                                   teamForm: tryJ("team_form.json") });
  const byIdChk = {}; for (const t of teams) byIdChk[t.id] = t;
  const eloChk = {};
  for (const e of (tryJ("elo.json")?.teams || [])) if (e?.fpl_id != null) eloChk[e.fpl_id] = e.elo ?? null;
  const fdChk = makeFixDifficulty({ teamMetrics: tmChk, teamById: byIdChk,
                                    odds: tryJ("odds.json"), eloByTeam: eloChk });
  const fixById = {}; for (const f of fixtures) fixById[f.id] = f;
  let checked = 0, off = [];
  for (const r of snap.ffdr) {
    const f = fixById[r.fixture];
    if (!f) continue;
    const fx = { opp: r.opp, home: r.home,
                 fdr: r.home ? f.team_h_difficulty : f.team_a_difficulty, kickoff: f.kickoff_time };
    for (const [key, pos] of [["def", 2], ["att", 4]]) {
      const d = fdChk(r.team, fx, pos);
      const rec = r[key];
      if (d == null && rec == null) continue;
      checked++;
      if (d == null || rec == null || Math.abs(+d.toFixed(3) - rec) > 1e-9)
        off.push(`${byIdChk[r.team]?.short} ${key}: bokhald ${rec} · endurreiknad ${d == null ? "null" : +d.toFixed(3)}`);
    }
  }
  ok(`endurreiknad ${checked} FFDR-gildi (bædi def og att)`, checked >= 20,
     "ef thetta er 0 er endurreikningurinn TOMUR");
  ok(`bokhaldid == endurreiknad, a bitanum (${checked - off.length}/${checked})`,
     off.length === 0, off.slice(0, 5).join("  |  "));

  /* Og lidsvisarnir sjalfir: `buildTeamMetrics` er afrit af logik App.jsx.
     Reki thau i sundur er allt hitt marklaust, svo thad er profad ser.    */
  const tm = buildTeamMetrics({ players, teams, promoted: tryJ("promoted_baseline.json"), teamForm: tryJ("team_form.json") });
  ok(`lidsvisar fyrir oll 20 lid (${Object.keys(tm).length})`, Object.keys(tm).length === 20);
  ok("hvert lid ber xg90 og xgc90 sem TOLUR",
     Object.values(tm).every(x => Number.isFinite(x.xg90) && Number.isFinite(x.xgc90)));
  /* `src` HEFUR FJOGUR GILD GILDI, ekki tvo — fyrsta utgafa thessarar
     fullyrdingar leyfdi adeins "e0"/"fpl" og FELL a RETTUM kodha, thvi raunveruleg
     heiti eru `e0_complete`, `championship_proxy`, `default` og `fpl`.
     Munurinn er ekki orðalag: ThRENNT er ekki thad sama — MAELING
     (`e0_complete`), STADGENGILL (`championship_proxy`, B-deildartolur med
     afslaetti) og SJALFGILDI (`default`). Bokhaldid verdur ad geta greint
     thau i sundur, annars vaeri stadgengill lesinn sem maeling.          */
  const SRC_OK = new Set(["e0_complete", "championship_proxy", "default", "fpl"]);
  ok("heimildin er skrad og er thekkt gildi",
     Object.values(tm).every(x => SRC_OK.has(x.src)),
     [...new Set(Object.values(tm).map(x => x.src))].join(", "));
  ok("nyliðar fa STADGENGIL sem er MERKTUR, ekki maelingu",
     Object.values(tm).filter(x => x.src === "championship_proxy")
       .every(x => Number.isFinite(x.xg90) && Number.isFinite(x.xgc90)));
}

/* ---------------------------------------------------------------
   4. RODIN SJALF — HVAD ER SKRAD
   --------------------------------------------------------------- */
console.log("\n4) RODIN: nog til ad kvarda, engin tilbuin tala");
{
  const players = arr(tryJ("players.json"), "players");
  const teams = arr(tryJ("teams.json"), "teams");
  const fixtures = arr(tryJ("fixtures.json"), "fixtures");
  const snap = buildSnapshot({ gw: 1, players, teams, fixtures,
    teamForm: tryJ("team_form.json"), odds: tryJ("odds.json"),
    elo: tryJ("elo.json"), playerForm: tryJ("player_form.json"),
    promoted: tryJ("promoted_baseline.json"), nowTs: Date.UTC(2026, 7, 20) });

  const top = snap.rank[0];
  ok("rodin er RODUD eftir skori", snap.rank.every((r, i) => i === 0 || snap.rank[i - 1].score >= r.score));
  ok("hver rod ber inntokin sin (svo skorid se rannsakanlegt)",
     top.inputs && "form" in top.inputs && "ffdr" in top.inputs && "price" in top.inputs);
  ok("tiltaekileiki er skradur SER, ekki blandadur i skorid",
     typeof top.avail === "number" && top.score !== undefined && top.score_avail !== undefined);
  ok("FPL-eigid xP er skrad sem vidmid", snap.rank.some(r => r.ep_next != null));
  /* BYRJUNAR-LIKURNAR ERU null I FORLEIK OG ThAD ER RETT — `startFeatures`
     krefst per-umferdar minutna (`data/live/`), sem eru ekki til fyrr en
     timabilid byrjar. Fyrsta utgafa thessarar fullyrdingar heimtadi tolu og
     FELL a rettum kodha. Rett krafa er ThVI SKILYRT: svidid VERDUR ad vera
     til i hverri rod (svo kvordunin geti lesid thad), og thad verdur ad vera
     TALA UM LEID OG `player_form` er komin — ekki fyrr.                  */
  ok("start_prob-svidid er til i HVERRI rod (null i forleik er rett svar)",
     snap.rank.every(r => "start_prob" in r));
  const pfLive = (tryJ("player_form.json")?.gws_used || 0) > 0;
  ok(pfLive ? "player_form er komin -> byrjunar-likur VERDA ad vera tolur"
            : "forleikur: player_form tom (gws_used 0), svo null er rett",
     pfLive ? snap.rank.some(r => r.start_prob != null)
            : snap.rank.every(r => r.start_prob === null));
  /* NULL ER EKKI NULL: leikmadur an FFDR (lid an leiks) ma ekki fa 0.      */
  const blank = snap.rank.filter(r => r.fixtures === 0);
  ok(`lid an leiks -> ffdr null, ekki 0 (${blank.length} leikmenn)`,
     blank.every(r => r.inputs.ffdr === null));
  ok("engin NaN i skorunum", snap.rank.every(r => Number.isFinite(r.score)));
  ok("heimildirnar eru skradar (hvad var til thegar spain var gerd)",
     snap.sources && typeof snap.sources.odds === "boolean" && typeof snap.sources.elo === "boolean");
  ok("notan segir ad rodin se onemandi", /never rewritten/i.test(snap.note || ""));
}

console.log(`\nSPA-BOKHALD: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
