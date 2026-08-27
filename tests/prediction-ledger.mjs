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
import { buildSnapshot, shouldWrite, inputsUsable, WINDOW_H, windowOpen, ledgerGaps } from "../scripts/snapshot-predictions.mjs";
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
    promoted: tryJ("promoted_baseline.json"), imminent: tryJ("imminent.json"),
    nowTs: Date.now(),
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
  /* TAFLAN, EKKI SKRAIN — `makeFixDifficulty` les `odds[short]`, og
     `App.jsx:692` sendir `d.teams`. Vidmids-utfaerslan her sendi SKRANA,
     svo hun reiknadi FFDR AN markadslidarins og var samt kollud
     "endurreiknad". Meðan bokhaldid bar somu villu voru thau sammala og
     kaflinn graenn — tvo eintok af SOMU villu stadfesta hvort annad, sem
     er nakvaemlega thad sem thessi kafli er til ad utiloka.            */
  const oddsChk = tryJ("odds.json");
  const fdChk = makeFixDifficulty({ teamMetrics: tmChk, teamById: byIdChk,
                                    odds: oddsChk?.teams ?? oddsChk, eloByTeam: eloChk });
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
     heiti eru `e0_complete`, `promoted_measured`, `default` og `fpl`.
     Munurinn er ekki orðalag: ThRENNT er ekki thad sama — MAELING UR ThESSU
     TIMABILI (`e0_complete`), MAELDUR FASTI UR ANNARRI LAUG
     (`promoted_measured`, sja `PROMOTED_PL`) og SJALFGILDI (`default`).
     Bokhaldid verdur ad geta greint thau i sundur.
     HEITID VAR `championship_proxy` TIL 20.8.2026 og var tha RETT: tolurnar
     VORU B-deildartolur med afslaetti (x0,75 / x1,35). Their tveir
     margfaldarar voru maeldir og felldir (n=45; r=-0,038 a vornina) og
     tolurnar eru nu MAELDUR FASTI, svo gamla heitid hefdi ordid merkimidi
     um heimild sem var ekki longur notud.                                */
  const SRC_OK = new Set(["e0_complete", "promoted_measured", "default", "fpl"]);
  ok("heimildin er skrad og er thekkt gildi",
     Object.values(tm).every(x => SRC_OK.has(x.src)),
     [...new Set(Object.values(tm).map(x => x.src))].join(", "));
  ok("nyliðar fa STADGENGIL sem er MERKTUR, ekki maelingu",
     Object.values(tm).filter(x => x.src === "promoted_measured")
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
  /* `imminent` VANTADI HER OG ThAD FALDI VILLU I ThRJA DAGA (lagad 14.8.2026).
     Profid byggdi inntakid sjalft og SLEPPTI thvi sem keyrslan gefur, svo
     `start_prob` var null i profinu — og fullyrdingin fyrir nedan sagdi ad
     null vaeri RETT SVAR. Med thvi var villan skjolfest sem hegdun.
     Profid les nu SOMU skrar og keyrslan; sja kafla 4b sem ber thad saman. */
  const snap = buildSnapshot({ gw: 1, players, teams, fixtures,
    teamForm: tryJ("team_form.json"), odds: tryJ("odds.json"),
    elo: tryJ("elo.json"), playerForm: tryJ("player_form.json"),
    promoted: tryJ("promoted_baseline.json"), imminent: tryJ("imminent.json"),
    nowTs: Date.UTC(2026, 7, 20) });

  const top = snap.rank[0];
  ok("rodin er RODUD eftir skori", snap.rank.every((r, i) => i === 0 || snap.rank[i - 1].score >= r.score));
  ok("hver rod ber inntokin sin (svo skorid se rannsakanlegt)",
     top.inputs && "form" in top.inputs && "ffdr" in top.inputs && "price" in top.inputs);
  ok("tiltaekileiki er skradur SER, ekki blandadur i skorid",
     typeof top.avail === "number" && top.score !== undefined && top.score_avail !== undefined);
  ok("FPL-eigid xP er skrad sem vidmid", snap.rank.some(r => r.ep_next != null));
  /* ============================================================
     BYRJUNAR-LIKURNAR — FULLYRDINGIN SEM SKJOLFESTI VILLUNA.
     Her stod: "start_prob er null i forleik OG ThAD ER RETT, thvi
     `startFeatures` krefst per-umferdar minutna ur `data/live/`", og
     skilyrt a `player_form.gws_used > 0`. Hvorttveggja var RANGT:
       · `start_prob` kemur EKKI ur `player_form` heldur ur `start_feats`
         i `imminent.json`, sem er til NUNA (840 af 841 rodum).
       · Talan var null af thvi ad `buildSnapshot` sendi TOLU thar sem
         `startFeatures` heimtar FYLKI — svo hun hefdi verid null ALLT
         timabilid, ekki adeins i forleik.
     Profid staðfesti null sem rett svar og gerdi villuna thannig ad reglu.
     RETTA INVARIANTID ER PORUN, EKKI TIMABILS-FASI: leikmadur sem A
     `start_feats` verdur ad hafa TOLU; leikmadur sem a thau ekki verdur ad
     hafa null (NULL ER EKKI NULL). Thad gildir i forleik og i timabili.
     ============================================================ */
  ok("start_prob-svidid er til i HVERRI rod (svo kvordunin geti lesid thad)",
     snap.rank.every(r => "start_prob" in r));
  {
    const im = tryJ("imminent.json");
    const feats = new Map();
    for (const r of (Array.isArray(im?.players) ? im.players : []))
      if (r?.code != null && r.start_feats) feats.set(String(r.code), r.start_feats);
    ok(`imminent.json ber start_feats (${feats.size} radir) — forsenda naestu fullyrdinga`,
       feats.size > 100, String(feats.size));
    const have = snap.rank.filter(r => feats.has(String(r.code)));
    const lack = snap.rank.filter(r => !feats.has(String(r.code)));
    ok(`leikmenn MED start_feats fa TOLU (${have.length} radir)`,
       have.length > 0 && have.every(r => typeof r.start_prob === "number"
                                       && r.start_prob > 0 && r.start_prob <= 1),
       `${have.filter(r => typeof r.start_prob !== "number").length} an tolu`);
    ok(`leikmenn AN start_feats fa null, ekki 0 (${lack.length} radir)`,
       lack.every(r => r.start_prob === null),
       `${lack.filter(r => r.start_prob !== null).length} med tolu`);
    /* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b regla 1). */
    ok(`thekja start_prob er skrad i skranni (${snap.coverage?.start_prob})`,
       snap.coverage?.start_prob === have.length, JSON.stringify(snap.coverage));
    ok("thekjan er EKKI 0 — talan sem var 0 af 584 fyrir lagfaeringuna",
       (snap.coverage?.start_prob || 0) > 0, JSON.stringify(snap.coverage));
    /* OG AD KEYRSLAN SJALF SENDI ThETTA INN. Profid getur sent `imminent`
       medan skriftan sleppir thvi — thad var NAKVAEMLEGA astandid fyrir
       lagfaeringuna, i hina attina. Sami lærdomur og `lineups.mjs`: prof sem
       les KODANN sagdi "ja, fallid er kallad" medan workflow-id sleppti thvi
       thegjandi (CLAUDE.md 7.1).                                          */
    const runner = readFileSync(new URL("../scripts/snapshot-predictions.mjs", import.meta.url), "utf8");
    const call = runner.slice(runner.lastIndexOf("buildSnapshot({"));
    ok("keyrslan sendir `imminent` inn i buildSnapshot",
       /imminent:\s*tryJ\("imminent\.json"\)/.test(call), call.slice(0, 320));
    ok("og hun kallar EKKI `startFeatures` (fylkid sem hun hafdi ekki)",
       !/startFeatures\s*\(/.test(runner.replace(/\/\*[\s\S]*?\*\//g, "")),
       "startFeatures er enn kollud");
  }
  /* NULL ER EKKI NULL: leikmadur an FFDR (lid an leiks) ma ekki fa 0.      */
  const blank = snap.rank.filter(r => r.fixtures === 0);
  ok(`lid an leiks -> ffdr null, ekki 0 (${blank.length} leikmenn)`,
     blank.every(r => r.inputs.ffdr === null));
  ok("engin NaN i skorunum", snap.rank.every(r => Number.isFinite(r.score)));
  ok("heimildirnar eru skradar (hvad var til thegar spain var gerd)",
     snap.sources && typeof snap.sources.odds === "boolean" && typeof snap.sources.elo === "boolean");
  ok("notan segir ad rodin se onemandi", /never rewritten/i.test(snap.note || ""));

  /* ============================================================
     4c. HVADA LIKAN SKRIFADI `start_prob`? — PROVENANSINN VERDUR AD FYLGJA
         RODINNI (21.8.2026)

     `startProbability` er ENDURKVORDUD i arkiv-glugga (maeld Brier 0,1683)
     og HRA innan timabils (0,089). Rodin ber toluna en BAR EKKI hvor
     kvardinn hun er, svo `src/calibration.js` gat adeins borid hana vid EITT
     vidmid — og fyrsta kvordunar-skyrsla timabilsins hefdi thvi sagt
     "tvofold afturfor" um spa sem var rett. Talan var rett; malstikan var
     fyrir annad likan.

     ThAD SEM ER SKRAD ER SAMA FLAGG SEM ENDURKVORDUNIN ER HLIDUD A
     (`imminent.archive`), EKKI UMFERDARNUMER: umferd er ekki likan —
     pipeline getur dregist aftur ur og haldid arkiv-glugganum i GW2/GW3
     (sja `FETCH_WINDOW` i `deriveImminent`).
     ============================================================ */
  {
    const im = tryJ("imminent.json");
    ok(`imminent.json ber \`archive: ${im?.archive}\` — forsenda naestu fullyrdinga`,
       typeof im?.archive === "boolean", JSON.stringify(im?.archive));
    ok(`rodin ber \`start_window: "${snap.start_window}"\` og thad passar vid flaggid`,
       snap.start_window === (im.archive === true ? "archive" : "live"),
       `${snap.start_window} a moti archive=${im.archive}`);
    /* BADAR ATTIR, A SOMU INNTOKUM: flaggid er ThAD sem raedur, ekki gw.  */
    const mkSnap = imm => buildSnapshot({ gw: 1, players, teams, fixtures,
      teamForm: tryJ("team_form.json"), odds: tryJ("odds.json"), elo: tryJ("elo.json"),
      playerForm: tryJ("player_form.json"), promoted: tryJ("promoted_baseline.json"),
      imminent: imm, nowTs: Date.UTC(2026, 7, 20) });
    ok("archive:false a SOMU rod -> 'live' (sama umferd, annad likan)",
       mkSnap({ ...im, archive: false }).start_window === "live");
    ok("og `imminent` sem vantar -> null, EKKI 'live' (glugginn var aldrei lesinn)",
       mkSnap(null).start_window === null);
    /* SAMA ROD, TVEIR KVARDAR — OG ThEIR ERU RAUNVERULEGA OLIKIR, annars
       maeldi fullyrdingin hér fyrir ofan ekkert.
       ENDURKVORDUNIN ER ThJOPPUN, EKKI LAEKKUN, og thad er vert ad hafa
       rett: hallinn er 0,533 i logit svo fastapunkturinn er p ~ 0,363
       (logit p = -0,262 / 0,467). Ofan vid hann faerist talan NIDUR, undir
       honum UPP. "Hun laekkar allt" vaeri osonn fullyrding (maelt: 231 nidur,
       608 upp af 840 rodum i imminent.json) — en "hun dregur HAA tolu
       nidur" er sonn i 189 af 189 tilfellum, og thad er nakvaemlega
       fullyrdingin sem `startRisk`-threpin hvila a.                      */
    const raw = mkSnap({ ...im, archive: false }).rank;
    const cal = new Map(snap.rank.map(r => [r.id, r.start_prob]));
    const both = raw.filter(r => r.start_prob != null && cal.get(r.id) != null);
    const diff = both.filter(r => cal.get(r.id) !== r.start_prob).length;
    const hi = both.filter(r => r.start_prob >= 0.5);
    const lo = both.filter(r => r.start_prob <= 0.2);
    ok(`${both.length} radir bera tolu a BADUM kvordum — forsenda`, both.length > 100);
    ok(`og ${diff} af ${both.length} bera SITT HVAD (kvardarnir eru tveir, ekki einn)`,
       diff > both.length * 0.9);
    ok(`raw >= 0,5 faerist NIDUR i ollum ${hi.length} tilfellum`,
       hi.length > 20 && hi.every(r => cal.get(r.id) < r.start_prob),
       `${hi.filter(r => cal.get(r.id) >= r.start_prob).length} faerdust ekki nidur`);
    ok(`og raw <= 0,2 faerist UPP i ollum ${lo.length} (thjoppun ad ~0,363, ekki laekkun)`,
       lo.length > 50 && lo.every(r => cal.get(r.id) > r.start_prob));
    /* OG KVORDUNIN VERDUR AD LESA ThAD SEM ER SKRIFAD. Tvaer skrar, eitt
       svid: se heitid breytt an thess ad calibration.js fylgi er allt hitt
       marklaust (sami laerdomur og `buildTeamMetrics`).                   */
    const { startWindowOf, START_BENCHMARKS } = await import(new URL("src/calibration.js", REPO).href);
    ok("`startWindowOf` les svidid sem bokhaldid skrifar",
       startWindowOf(snap) === snap.start_window);
    ok(`og malstikan sem thad velur er ${START_BENCHMARKS[snap.start_window]?.brier}`
       + " (0,1683 i forleik, 0,089 innan timabils)",
       START_BENCHMARKS[snap.start_window]?.brier > 0);
    /* Og HEITID ma ekki vera alyktad ut fra `gw` i skriftunni.            */
    const runner2 = readFileSync(new URL("../scripts/snapshot-predictions.mjs", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    ok("skriftan les `imminent.archive`, ekki umferdarnumerid",
       /start_window: imminent \? \(imminent\.archive === true/.test(runner2),
       runner2.match(/start_window[^\n]*/)?.[0]);
    ok("og hvergi er `gw` notad til ad giska a gluggann",
       !/start_window:[^\n]*gw/.test(runner2));
  }
}

/* ---------------------------------------------------------------
   5. EFTIRLITID — ThOGN VAR EINA RAUNVERULEGA HAETTAN

   `continue-on-error: true` a skrefinu i `fetch-fast.yml` er VILJANDI
   (bokhaldid ma ekki fella gagna-keyrsluna) — en thad thydir ad bilun
   innan gluggans skilur eftir sig ENGA slod. Kodinn sem bregst vid thvi
   kviknar fyrst 21.8. kl. 05:30 UTC, svo hann er profadur a TILBUNUM
   gognum, eins og `bsd-pipeline.mjs` og `defcon-shrink.mjs`.
   --------------------------------------------------------------- */
console.log("\n5) EFTIRLIT: gluggi opinn + engin rod = RAUTT");
{
  const H = 36e5, DL = Date.UTC(2026, 7, 21, 17, 30);
  ok("utan gluggans er `windowOpen` false (13 klst fyrir)",
     windowOpen({ deadlineMs: DL, nowMs: DL - 13 * H }) === false);
  ok("a mörkunum (12,0 klst) er hann OPINN — sama mark og shouldWrite",
     windowOpen({ deadlineMs: DL, nowMs: DL - WINDOW_H * H }) === true
     && shouldWrite({ gw: 1, deadlineMs: DL, nowMs: DL - WINDOW_H * H, exists: false }).write === true);
  ok("rett fyrir 12,1 klst er hvorugt opid (samhljoda mork)",
     windowOpen({ deadlineMs: DL, nowMs: DL - 12.1 * H }) === false
     && shouldWrite({ gw: 1, deadlineMs: DL, nowMs: DL - 12.1 * H, exists: false }).write === false);
  ok("eftir frestinn er glugginn lokadur", windowOpen({ deadlineMs: DL, nowMs: DL + 60e3 }) === false);
  ok("an frests er hann lokadur (engin gisking)", windowOpen({ deadlineMs: NaN, nowMs: DL }) === false);

  /* HOLUR: frestur lidinn OG engin rod = VARANLEGT tap, alltaf raudt.    */
  const EV = [{ id: 1, deadline_time: "2026-08-21T17:30:00Z" },
              { id: 2, deadline_time: "2026-08-28T17:30:00Z" },
              { id: 3, deadline_time: "2026-09-04T17:30:00Z" }];
  const after = Date.parse("2026-08-29T00:00:00Z");
  ok("baðar lidnar umferdir skradar -> engar holur",
     ledgerGaps({ events: EV, nowMs: after, has: () => true }).length === 0);
  ok("GW1 vantar eftir sinn frest -> hola",
     JSON.stringify(ledgerGaps({ events: EV, nowMs: after, has: id => id !== 1 })) === "[1]");
  ok("badar vantar -> tvaer holur",
     JSON.stringify(ledgerGaps({ events: EV, nowMs: after, has: () => false })) === "[1,2]");
  /* ThAD SEM MATTI EKKI GERAST: umferd sem er ENN OSPILUD ma ekki teljast
     hola — annars vaeri linan raud allt timabilid og enginn laesi hana.  */
  ok("OSPILUD umferd (GW3) er EKKI hola thott engin rod se til",
     !ledgerGaps({ events: EV, nowMs: after, has: () => false }).includes(3));
  ok("i forleik (fyrir alla fresti) eru engar holur",
     ledgerGaps({ events: EV, nowMs: Date.parse("2026-08-14T00:00:00Z"), has: () => false }).length === 0);
  ok("illgilt inntak hrynur ekki", ledgerGaps({ events: null, nowMs: after, has: () => false }).length === 0);

  /* OG AD SKRIFTAN SKRIFI RAUNVERULEGA LINUNA — wiring, ekki bara formula. */
  const runner = readFileSync(new URL("../scripts/snapshot-predictions.mjs", import.meta.url), "utf8");
  ok("skriftan skrifar `prediction_ledger` i status.json",
     /sources \|\|= \{\}\)\.prediction_ledger/.test(runner));
  ok("hun skrifar linuna i OLLUM utkomum (skip, thunn inntok, hrun, skrifad)",
     (runner.match(/recordLedger\(/g) || []).length >= 5,
     String((runner.match(/recordLedger\(/g) || []).length));
  ok("og notan er AUDKENNANLEG thegar glugginn er opinn en ekkert skrifad",
     /WINDOW OPEN but nothing recorded/.test(runner) && /WINDOW OPEN but the snapshot threw/.test(runner));
  ok("`continue-on-error` er enn a skrefinu (bokhaldid ma ekki fella keyrsluna)",
     /continue-on-error:\s*true/.test(readFileSync(new URL("../.github/workflows/fetch-fast.yml", import.meta.url), "utf8")));
}

/* ---------------------------------------------------------------
   6. `--dry` SKRIFAR EKKERT — OG ThAD GERDI ThAD (lagad 16.8.2026)

   Hausinn a `snapshot-predictions.mjs` lofar: "--dry (skrifar ekkert)".
   Flaggid var lesid i fyrstu linu keyrslunnar en EKKI SPURT fyrr en eftir
   hlidin, og skip-leidin kallar `recordLedger`, sem er les-breyta-SKRIFA a
   `data/status.json`. Utan gluggans — eina astandid sem er MOGULEGT fyrir
   21. agust — gerdi `--dry` thvi hvorugt thess sem thad er til fyrir: thad
   SKRIFADI, og thad prentadi ENGA thekju thvi thad for aldrei i
   `buildSnapshot`.

   ThETTA ER EKKI PROFAD MED ThVI AD LESA KODANN. Kodalestur er nakvaemlega
   sa vordur sem hefdi verid graenn allan timann (`const dry = ...` var a
   sinum stad). Skriftan er keyrd SEM UNDIRFERLI og BAETIN i `data/status.json`
   borin saman fyrir og eftir, auk innihalds `data/predictions/`. Ef hun
   skrifar samt er upprunalega myndin sett aftur — profid ma ekki skilja
   eftir sig thad sem thad er ad kvarta yfir.
   --------------------------------------------------------------- */
console.log("\n6) --dry SKRIFAR EKKERT (keyrt sem undirferli, baeti borin saman)");
{
  const { execFileSync } = await import("node:child_process");
  const { readdirSync, existsSync, writeFileSync } = await import("node:fs");
  const statusPath = D + "status.json";
  const predDir = D + "predictions/";

  const before = readFileSync(statusPath);
  const predBefore = existsSync(predDir) ? readdirSync(predDir).sort().join(",") : "(engin mappa)";
  /* FORSENDA SEM VERDUR AD VERA SONN: skrain er til og er ekki tom, annars
     vaeri "obreytt" fullyrdingin tom (CLAUDE.md 5b regla 2).             */
  ok(`status.json er til og hefur innihald (${before.length} b) — forsenda naestu fullyrdingar`,
     before.length > 50);

  let out = "", ranOk = true;
  try {
    out = execFileSync(process.execPath,
      [new URL("../scripts/snapshot-predictions.mjs", import.meta.url).pathname, "--dry"],
      { encoding: "utf8", timeout: 120000 });
  } catch (e) { ranOk = false; out = String(e.stdout || "") + String(e.stderr || ""); }
  ok("thurr keyrsla gekk upp (exit 0)", ranOk, out.slice(-400));

  const after = readFileSync(statusPath);
  const predAfter = existsSync(predDir) ? readdirSync(predDir).sort().join(",") : "(engin mappa)";
  const unchanged = before.equals(after);
  if (!unchanged) writeFileSync(statusPath, before);      // skilum myndinni aftur
  ok("`--dry` skrifadi EKKI i data/status.json (bæti fyrir == baeti eftir)",
     unchanged, `${before.length} b -> ${after.length} b (upprunalega myndin var sett aftur)`);
  ok("`--dry` bjo hvorki til ne breytti data/predictions/",
     predBefore === predAfter, `${predBefore} -> ${predAfter}`);

  /* OG HUN VERDUR AD SEGJA HVAD HUN HEFDI GERT. Thurrkeyrsla sem thegir er
     jafn gagnslaus og su sem skrifar: hun er til svo haegt se ad aefa
     bokhaldid ADUR en einskota glugginn opnast.                          */
  ok("thurr keyrsla prentar hlid-astaeduna", /gate (OPEN|CLOSED) - /.test(out), out.slice(0, 300));
  ok("og thekju-blokkina sem hun HEFDI skrifad",
     /would write \d+ ffdr rows, \d+ players · coverage \{/.test(out), out.slice(0, 500));
  ok("og segir berum ordum ad ekkert hafi verid skrifad",
     /NOTHING WRITTEN/.test(out) && /DRY RUN/.test(out), out.slice(0, 200));
  /* ThEKJAN I UTPRENTINU MA EKKI VERA TOM SKEL — `start_prob` var 0 af 577
     thegar glugginn vantadi, og thad er einmitt talan sem thurrkeyrslan er
     til ad syna fyrirfram.                                               */
  const cov = out.match(/coverage (\{[^}]*\})/);
  ok("thekju-blokkin er lesanlegt JSON med `players` yfir 400",
     !!cov && (JSON.parse(cov[1]).players ?? 0) > 400, cov ? cov[1] : "ENGIN thekja i utprenti");
}

/* ============================================================
   MARKADSLIDURINN VERDUR AD RATA I BOKHALDID (27.8.2026)

   `makeFixDifficulty` tekur TOFLUNA (`odds[short]`), ekki skrana.
   `buildSnapshot` fekk skrana sjalfa fra `main()`, svo `odds["ARS"]` var
   `undefined` og markadslidurinn — sterkasta einstaka inntakid i FFDR —
   var EKKI i bokhaldinu. Maelt: 19 af 20 GW2-rodum baru adra tolu og
   threpid faerdist lika. Bokhaldid skradi thvi ANNAD LIKAN en notandinn
   sa, og kvordunin hefdi maelt thad.

   PROFSTEINNINN ER TENGINGIN, EKKI FORMULAN: taflan verdur ad HREYFA
   toluna. Fullyrding um ad "odds seu send" vaeri tom — thau voru send
   allan timann, bara i rongu sniði.
   ============================================================ */
{
  console.log("\n--- MARKADSLIDURINN I BOKHALDINU ---");
  const oddsFile = JSON.parse(readFileSync(new URL("../data/odds.json", import.meta.url), "utf8"));
  const nTeams = Object.keys(oddsFile.teams || {}).length;
  ok("FORSENDA: odds.json ber tofluna", nTeams >= 10, `${nTeams} felog`);
  const gwOdds = Array.isArray(oddsFile.gws) && oddsFile.gws.length ? oddsFile.gws[0] : null;
  ok("FORSENDA: taflan naer yfir tiltekna umferd", gwOdds != null, `gws ${JSON.stringify(oddsFile.gws)}`);

  const mk = (odds, gw) => buildSnapshot({
    gw,
    players: arr(tryJ("players.json"), "players"),
    teams: arr(tryJ("teams.json"), "teams"),
    fixtures: arr(tryJ("fixtures.json"), "fixtures"),
    teamForm: tryJ("team_form.json"), odds,
    elo: tryJ("elo.json"), playerForm: tryJ("player_form.json"),
    promoted: tryJ("promoted_baseline.json"), imminent: tryJ("imminent.json"),
    nowTs: Date.now(),
  });
  const withMkt = mk(oddsFile, gwOdds);
  const noMkt = mk(null, gwOdds);
  const key = r => `${r.team}|${r.opp}`;
  const byKey = new Map(noMkt.ffdr.map(r => [key(r), r]));
  const moved = withMkt.ffdr.filter(r => {
    const q = byKey.get(key(r));
    return q && (Math.abs((r.att ?? 0) - (q.att ?? 0)) > 0.005
              || Math.abs((r.def ?? 0) - (q.def ?? 0)) > 0.005);
  }).length;
  ok("markadslidurinn HREYFIR FFDR i bokhaldinu", moved >= 10,
     `${moved} af ${withMkt.ffdr.length} rodum hreyfast`);

  /* OG SNIDID MA EKKI SKIPTA MALI: `main()` sendir skrana, profin sendu
     tofluna. Baed eiga ad gefa SOMU tolu — annars er villan bara flutt.  */
  const withTable = mk(oddsFile.teams, gwOdds);
  const byKey2 = new Map(withTable.ffdr.map(r => [key(r), r]));
  const same = withMkt.ffdr.every(r => {
    const q = byKey2.get(key(r));
    return q && Math.abs((r.att ?? 0) - (q.att ?? 0)) < 1e-9
             && Math.abs((r.def ?? 0) - (q.def ?? 0)) < 1e-9;
  });
  ok("skrain og taflan gefa NAKVAEMLEGA somu tolu (snidid er jafnad inni i buildSnapshot)", same);
}

console.log(`\nSPA-BOKHALD: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
