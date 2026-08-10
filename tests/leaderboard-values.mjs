/* ============================================================
   STIGATAFLAN — ER TALAN VID RETTA MANNINN?

   AF HVERJU ThETTA SAFN ER TIL: stigataflan er AKVORDUNARFLOTUR. Hun
   segir "thessir fimm eru bestir i X", og notandinn kaupir eftir thvi.
   Villa hér er ekki utlitsgalli heldur rong akvordun — nakvaemlega sama
   flokkur og lids-xGC-villan sem gaf Leeds "bestu vornina" (0,70 a moti
   raunverulegum 1,47) og var hreinn tilbuningur.

   ThRJU VENSL ERU PROFUD, OG ThAU ERU OHAD `buildLeaderboard`:

     1. TALAN TILHEYRIR MANNINUM. Nafnid er lesid AF SKJANUM, leikmadurinn
        flettur upp i RAUNGOGNUNUM og dalkurinn reiknadur upp a nytt med
        `STAT_DEFS.get()`. Ef skjarinn segir "Haaland 27" verdur Haaland
        ad hafa 27. Thetta fangar hverja vixlun a rod og gildi — og
        ekkert i `buildLeaderboard` tekur thatt i profinu.

     2. ROdIN FYLGIR `hi`. Hausinn segir sjalfur "highest" eda "lowest";
        profid les ThAD og krefst einhalla radar i theirri att. Ef ordid
        og rodin eru osammala er myndin villandi — sama regla og
        `compare-visual.mjs` ver i sulunum.

     3. SAETISNUMERIN ERU 1..n AN GATA. Rank sem stekkur felur ad einhver
        var siadur ut EFTIR rodun.

   ATH: profid endurreiknar EKKI hverjir eiga ad vera i topp-5 (thad vaeri
   onnur utfaersla af siunum — minutu-golf, stodu-sia, `isIncoherent` —
   og thar med gildran sem CLAUDE.md lysir). Thad profar ad ThEIR SEM ERU
   SYNDIR beri rett gildi i rettri rod.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { STAT_DEFS, STAT_BY_KEY, fmtStat, makeEnricher } from "../src/stats.js";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

const dom = new JSDOM("<!doctype html><div id=root></div>",
                      { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const origErr = console.error; console.error = () => {};
globalThis.fetch = async url => {
  const n = String(url).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 400)); });
console.error = origErr;
const fire = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await new Promise(r => setTimeout(r, 90)); });
};

console.log(`\n${"─".repeat(72)}\nSTIGATAFLAN — TALAN VID RETTA MANNINN\n${"─".repeat(72)}`);

await fire([...document.querySelectorAll("button")].find(b => b.textContent.includes("Leaderboard")));
const section = [...document.querySelectorAll("h2")]
  .find(h => h.textContent.includes("Leaderboard"))?.closest("section");
ok("stigataflan er a skjanum", !!section);

/* ---------- HVADA GOGN ER TAFLAN AD LESA? ----------
   Í forleik synir appid FYRRA timabil. Uppflettingin verdur ad nota SOMU
   rodum og skjarinn, annars vaeri profid ad bera saman sitt hvora heima.
   Radirnar eru fundnar a ThVI hvor lindin ber toluna sem birtist.       */
/* AUDGADAR RADIR, EKKI HRAAR. Dalkar eins og "Share of team xG" lesa
   svid sem `makeEnricher` baetir vid (lids-summur, imminent, BSD). Med
   hraum rodum skila their null og profid flaggadi FJORAR rettar tolur
   sem rangar. Sama audgun og Leaderboard.jsx gerir sjalf.             */
const live = (() => {
  const raw = J("players.json"); const rows = raw.players || raw;
  try {
    const teams = J("teams.json"); const tl = Array.isArray(teams) ? teams : (teams.teams || []);
    const teamById = Object.fromEntries(tl.map(t => [t.id, t]));
    const safe = f => { try { return J(f); } catch { return null; } };
    const e = makeEnricher({
      players: rows, teamById, imminent: safe("imminent.json"),
      shotsFile: safe("last_gw_shots.json"), fixtures: safe("fixtures.json"),
      /* `events.json` er HLUTUR (`{events:[...]}`), ekki fylki — og
         `makeEnricher` gerir `(events||[]).find(...)`, svo rangt lag
         KASTAR. Fyrsta utgafan sendi hlutinn, fell i catch og profadi
         thvi ohaudgadar radir an thess ad segja fra.                    */
      events: (safe("events.json")?.events ?? safe("events.json")),
      odds: safe("odds.json"),
      defcon: safe("defcon.json"), defconHist: safe("defcon_history.json"),
      consist: safe("consistency.json"), bsd: [safe("bsd_players.json"), safe("bsd_live.json")],
    });
    /* `e(p)` skilar HLUT MED `.fields`, ekki rodinni sjalfri — Leaderboard
       gerir `{...p, ...e(p).fields}`. Fyrsta utgafan notadi `e(p)` beint og
       fekk thvi null i alla audgadu dalkana.                            */
    return rows.map(p => { try { return { ...p, ...e(p).fields }; } catch { return p; } });
  } catch { return rows; }
})();
const hist = (() => {
  try {
    const s = J("player_seasons.json");
    const label = J("season_baseline.json").label;
    const out = [];
    for (const byS of Object.values(s.players || {})) if (byS[label]) out.push(byS[label]);
    return out;
  } catch { return []; }
})();

/* Ein mini-lista = DIV thar sem born eru: haus + radir sem byrja a saeti. */
/* HALINN ER VALFRJALS: "N below the minutes floor" og "of 573" hanga
   aftan a sumum listum. Fyrsta utgafan krafdist `kids === ranked + 1` og
   fann thvi ENGAN lista. Skilyrdid er thvi a haus + fjolda rada, ekki a
   heildar-barnafjolda.                                                  */
const lists = [...section.querySelectorAll("div")].filter(d => {
  const kids = [...d.children];
  if (kids.length < 4) return false;
  const ranked = kids.filter(c => /^\d/.test((c.textContent || "").trim()));
  const headOk = /highest$|lowest$/.test((kids[0].textContent || "").trim());
  return headOk && ranked.length >= 3 && ranked.length <= 6;
});
ok(`mini-listar fundnir (${lists.length})`, lists.length >= 15, `fann ${lists.length}`);

/* Haus: "<label><highest|lowest>" limt saman i textContent.            */
const parseHead = el => {
  const t = (el.textContent || "").trim();
  const m = t.match(/^(.*?)(highest|lowest)$/);
  return m ? { label: m[1].trim(), dir: m[2] } : null;
};
/* Rod: "<saeti><nafn><POS><gildi>" — saetid fremst, gildid aftast.
   Nafnid og stadan eru i eigin <span>-um svo thau eru lesin thadan.    */
const parseRow = el => {
  const sp = [...el.querySelectorAll("span")].map(s => (s.textContent || "").trim());
  if (sp.length < 4) return null;
  return { rank: +sp[0], name: sp[1], pos: sp[2], val: sp[3] };
};

const byLabel = new Map(STAT_DEFS.map(d => [d.label, d]));
let checkedLists = 0, checkedRows = 0;
const problems = [];

for (const L of lists) {
  const head = parseHead(L.children[0]);
  if (!head) continue;
  const def = byLabel.get(head.label);
  if (!def) { problems.push(`dalkur "${head.label}" fannst ekki i STAT_DEFS`); continue; }
  /* Ordid i hausnum verdur ad segja thad sama og `hi` i skranni.       */
  const wantDir = def.hi === false ? "lowest" : "highest";
  if (head.dir !== wantDir)
    problems.push(`${head.label}: hausinn segir "${head.dir}" en skrain segir "${wantDir}"`);

  const rows = [...L.children].slice(1).map(parseRow).filter(Boolean);
  if (rows.length < 3) continue;
  checkedLists++;

  /* 3. SAETI: 1 EFST, VAXANDI, OG JAFNTEFLI DEILA SAETI.
     Fyrsta utgafan krafdist 1..n og flaggadi "1,2,3,4,4" — sem er RETT:
     tveir jafnir menn eiga BADIR fjorda saetid. Krafan er thvi vaxandi
     rod sem byrjar i 1, og ad endurtekid saeti thydi jafnt GILDI.      */
  if (rows[0].rank !== 1 || !rows.every((r, i) => i === 0 || r.rank >= rows[i - 1].rank))
    problems.push(`${head.label}: saeti eru ${rows.map(r => r.rank).join(",")}`);
  for (let i = 1; i < rows.length; i++)
    if (rows[i].rank === rows[i - 1].rank && rows[i].val !== rows[i - 1].val)
      problems.push(`${head.label}: saeti ${rows[i].rank} tvitekid en gildin eru ${rows[i - 1].val}/${rows[i].val}`);

  /* 1. TALAN TILHEYRIR MANNINUM — flett upp i raungognum. */
  const nums = [];
  for (const r of rows) {
    checkedRows++;
    const cands = [...live, ...hist].filter(p => p.web_name === r.name);
    if (!cands.length) continue;               // nafn sem finnst ekki: sleppt, talid nedar
    /* Se nafnid tvitekid er nog ad EINN theirra beri toluna.           */
    const shown = r.val;
    const match = cands.some(p => {
      let v; try { v = def.get(p); } catch { return false; }
      if (v == null || !Number.isFinite(v)) return false;
      nums.push(v);
      return fmtStat(def, v) === shown;
    });
    if (!match) {
      const got = cands.map(p => { try { return fmtStat(def, def.get(p)); } catch { return "?"; } });
      problems.push(`${head.label}: skjarinn segir ${r.name}=${shown}, gognin segja ${got.join("/")}`);
    }
  }

  /* 2. ROdIN FYLGIR ORDINU I HAUSNUM. Bornar eru BIRTU tolurnar, thvi
     thad er thad sem notandinn les.                                     */
  const shownNums = rows.map(r => parseFloat(String(r.val).replace(/[£%,+]/g, "")))
                        .filter(Number.isFinite);
  if (shownNums.length >= 3) {
    const mono = head.dir === "highest"
      ? shownNums.every((v, i) => i === 0 || v <= shownNums[i - 1])
      : shownNums.every((v, i) => i === 0 || v >= shownNums[i - 1]);
    if (!mono) problems.push(`${head.label} (${head.dir}): rodin er ${shownNums.join(", ")}`);
  }
}

ok(`listar profadir (${checkedLists}) og radir (${checkedRows})`,
   checkedLists >= 15 && checkedRows >= 60, `${checkedLists} listar / ${checkedRows} radir`);
ok("hver birt tala tilheyrir sinum manni, rodin fylgir hausnum, saeti an gata",
   problems.length === 0, [...new Set(problems)].slice(0, 6).join(" | "));

console.log(`\nSTIGATAFLA: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
