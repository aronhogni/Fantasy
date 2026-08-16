/* ============================================================
   RADGJOFIN — src/advisor.js

   HVAD ThETTA VER: talan sem stendur efst i samanburdar-glugganum er
   sterkasta fullyrding sem appid gefur fra ser — "taktu THENNAN". Tvennt
   getur eyðilagt hana thogult og hvorugt fellur a byggingu:

     1. KVORDUNIN REKUR. Prosentan er ekki hugmynd heldur MAELING:
        P(sa haerri skorar meira) sem fall af bili i rankScore, mæld a
        306.653 samanburdum INNAN SOMU UMFERDAR (5 timabil, sama spjald
        og rank-model.mjs notar). Se fastanum breytt an nyrrar maelingar
        er talan ordin agiskun i bunimgi maelingar.

     2. HAFNAD MERKI LAEDIST INN I SKORID. Notandinn bad um "oll gogn" og
        thad er FREISTING ad blanda DefCon, jofnudi og "formi" inn i
        toluna. Oll thrju voru MAELD OG HOFNUD (CLAUDE.md 3, 6c, 6o).
        Their eru birt SER; se theim blandad inn er verkfaerid ordid
        havadi sem litur ut eins og visdomur.

   MAELDA TAFLAN SEM FASTARNIR KOMA UR (endurkeyranleg, sja
   tests/lib/panel.mjs — timaheidarleg):
      bil       n         P(haerri skorar meira)
      0-0,25    42.861    51,2%
      0,5-0,75  38.069    57,2%
      1-1,5     57.046    63,4%
      2-3       38.805    73,1%
      3+        13.295    80,6%
   LOSO: B = 0,400-0,416 · A = 0,022-0,027. Brier slaer 0,5-vidmidid i
   5/5 timabilum UT FYRIR URTAK.

   Keyrsla: node tests/advisor.mjs
   ============================================================ */
import { advise, contextFactors, pairWinProb, ADVISOR_CAL, ADVISOR_MAX_GAP }
  from "../src/advisor.js";
import { RANK_W, rankScore } from "../src/model.js";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

console.log(`\n${"=".repeat(84)}`);
console.log("RADGJOFIN — samanburdar-glugginn");
console.log("=".repeat(84));

const P = (id, name, inputs, extra = {}) => ({ id, name, inputs, ...extra });

/* ---------- 1. KVORDUNIN ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("1. KVORDUNIN — talan er MAELD, ekki valin");
console.log("─".repeat(84));
{
  ok("fastarnir eru their sem voru maeldir (A 0,0258 · B 0,4066)",
    Math.abs(ADVISOR_CAL.A - 0.0258) < 1e-9 && Math.abs(ADVISOR_CAL.B - 0.4066) < 1e-9,
    JSON.stringify(ADVISOR_CAL));
  /* Fastarnir verda ad liggja INNI i LOSO-svidinu; geri their thad ekki
     eru their fittadir a eitthvad annad en gognin syndu.               */
  ok("og their liggja inni i LOSO-svidinu (A 0,022-0,027 · B 0,400-0,416)",
    ADVISOR_CAL.A >= 0.022 && ADVISOR_CAL.A <= 0.027 &&
    ADVISOR_CAL.B >= 0.400 && ADVISOR_CAL.B <= 0.416);

  ok("ekkert bil -> ~50% (jafntefli er jafntefli)",
    Math.abs(pairWinProb(0) - 0.5) < 0.02, `${pairWinProb(0)}`);
  ok("einhalla: staerra bil -> haerri tala",
    [0, 0.5, 1, 2, 3].every((g, i, a) => i === 0 || pairWinProb(g) > pairWinProb(a[i - 1])));

  /* ThAKIÐ ER RAUNVERULEIKINN. Verkfaeri sem segdi "95% buy" vaeri ad
     ljuga: haesta maelda talan i gognunum er 80,6%.                    */
  ok("thakid er raunhaeft — ALDREI yfir 85%, hvad sem bilid er",
    [3, 10, 50, 1e6].every(g => pairWinProb(g) < 0.85),
    `${pairWinProb(1e6)}`);
  ok("bil er KLIPPT vid maeldu mork (framreikningur er ekki maeling)",
    pairWinProb(ADVISOR_MAX_GAP) === pairWinProb(999));

  /* Maelda taflan sjalf — hvert bil verdur ad lenda i sinum flokki. */
  const T = [[0.1, 0.512], [0.6, 0.572], [1.2, 0.634], [2.5, 0.731], [3.4, 0.806]];
  const off = T.map(([g, want]) => Math.abs(pairWinProb(g) - want));
  ok(`fitunin fylgir maeldu toflunni (mesta frávik ${(Math.max(...off) * 100).toFixed(1)}pp)`,
    Math.max(...off) < 0.045, off.map(o => (o * 100).toFixed(1)).join(" "));
}

/* ---------- 2. HLUTDEILDIN ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("2. HLUTDEILD — leggst saman i 1 og fylgir skorinu");
console.log("─".repeat(84));
{
  const hi = { form: 6, minsPerGame: 88, price: 9, ffdr: 2.0, minsTrend: 5 };
  const lo = { form: 2, minsPerGame: 55, price: 5, ffdr: 3.4, minsTrend: -10 };
  const r2 = advise([P(1, "Hi", hi), P(2, "Lo", lo)]);
  ok("tveir menn gefa nidurstodu", r2.ok && r2.rows.length === 2);
  ok("hlutdeildin leggst saman i 1",
    Math.abs(r2.rows.reduce((a, b) => a + b.share, 0) - 1) < 1e-9);
  ok("sa med haerra skor faer haerri hlutdeild", r2.lead.name === "Hi");
  /* FYRIR TVO MA HLUTDEILDIN EKKI VERA ONNUR TALA EN MAELDA LIKINDIN —
     annars vaeri birt tvennt sem thykist vera thad sama.               */
  const gap = r2.ranked[0].score - r2.ranked[1].score;
  ok("fyrir TVO er hlutdeildin NAKVAEMLEGA maeldu likindin",
    Math.abs(r2.ranked[0].share - pairWinProb(gap)) < 1e-9,
    `${r2.ranked[0].share} vs ${pairWinProb(gap)}`);

  const r4 = advise([P(1, "A", hi), P(2, "B", lo), P(3, "C", { ...hi, ffdr: 2.6 }),
                     P(4, "D", { ...lo, form: 4 })]);
  ok("fjorir menn ganga lika", r4.ok && r4.rows.length === 4);
  ok("og hlutdeildin leggst enn saman i 1",
    Math.abs(r4.rows.reduce((a, b) => a + b.share, 0) - 1) < 1e-9);
  ok("rodun fylgir skori i ollum hopnum",
    r4.ranked.every((r, i, a) => i === 0 || a[i - 1].score >= r.score));
  ok("enginn faer 0% eda 100% (fjorir menn geta ekki verid vissa)",
    r4.rows.every(r => r.share > 0.02 && r.share < 0.98));

  ok("einn madur gefur ENGA radleggingu (ekkert ad velja a milli)",
    advise([P(1, "A", hi)]).ok === false);
  ok("tomt inntak fellur ekki", advise([]).ok === false && advise(null).ok === false);
}

/* ---------- 3. JAFNTEFLI ER SAGT UPPHATT ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("3. ThEGAR GOGNIN VITA ThAD EKKI — 'close' ma ekki thegja");
console.log("─".repeat(84));
{
  const a = { form: 4, minsPerGame: 80, price: 7, ffdr: 2.5, minsTrend: 0 };
  const same = advise([P(1, "A", a), P(2, "B", { ...a })]);
  ok("tveir eins menn -> jafntefli", same.close === true);
  ok("og hlutdeildin er 50/50",
    same.rows.every(r => Math.abs(r.share - 0.5) < 1e-9));
  const far = advise([P(1, "A", { form: 8, minsPerGame: 90, price: 12, ffdr: 1.6, minsTrend: 20 }),
                      P(2, "B", { form: 1, minsPerGame: 30, price: 4.5, ffdr: 3.8, minsTrend: -30 })]);
  ok("stort bil -> EKKI jafntefli", far.close === false);
  ok("en talan er samt undir thakinu", far.decisiveProb < 0.85, `${far.decisiveProb}`);
}

/* ---------- 4. FRAMLOGIN ERU RETT, EKKI SKRAUT ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("4. FRAMLOG — thau LEGGJAST SAMAN i skor-muninn");
console.log("─".repeat(84));
{
  const r = advise([
    P(1, "A", { form: 6, minsPerGame: 90, price: 9, ffdr: 2.0, minsTrend: 10 }),
    P(2, "B", { form: 3, minsPerGame: 60, price: 6, ffdr: 3.0, minsTrend: -5 }),
    P(3, "C", { form: 4, minsPerGame: 75, price: 7, ffdr: 2.5, minsTrend: 0 }),
  ]);
  const meanScore = r.rows.reduce((a, b) => a + b.score, 0) / r.rows.length;
  for (const row of r.rows) {
    const sum = row.terms.reduce((a, t) => a + (t.delta || 0), 0);
    const want = row.score - meanScore;
    ok(`${row.name}: summa framlaga = skor minus medaltal hopsins`,
      Math.abs(sum - want) < 1e-6, `${sum.toFixed(4)} vs ${want.toFixed(4)}`);
  }
  /* Formerkin verda ad vera tulkanleg — thau eru rokstudningurinn sem
     notandinn les. THYNGRI leikur (haerra FFDR) VERDUR ad draga nidur.  */
  const hard = r.rows.find(x => x.name === "B").terms.find(t => t.key === "ffdr");
  ok("thyngri leikir draga NIDUR (FFDR er neikvaett inntak)", hard.delta < 0,
    `${hard.delta}`);
  const mins = r.rows.find(x => x.name === "A").terms.find(t => t.key === "minsPerGame");
  ok("fleiri minutur draga UPP", mins.delta > 0, `${mins.delta}`);
  ok("staersta framlagid er efst (thad svarar 'af hverju hann?')",
    r.rows.every(row => row.terms.every((t, i, a) =>
      i === 0 || Math.abs(a[i - 1].delta ?? 0) >= Math.abs(t.delta ?? 0))));
  /* Vantandi inntak ma ekki thykjast vera 0-framlag. */
  const miss = advise([P(1, "A", { form: 5, minsPerGame: 80, price: 7, ffdr: 2.2 }),
                       P(2, "B", { form: 3, minsPerGame: 70, price: 6, ffdr: 2.8 })]);
  ok("inntak sem vantar hja BADUM gefur `delta: null`, ekki 0",
    miss.rows.every(r2 => r2.terms.find(t => t.key === "minsTrend").delta === null));
}

/* ---------- 5. VORDURINN: HAFNAD MERKI FER ALDREI I SKORID ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("5. VORDUR — DefCon, jofnudur og byrjunar-likur eru UTAN talunnar");
console.log("─".repeat(84));
{
  const base = { form: 4, minsPerGame: 80, price: 7, ffdr: 2.5, minsTrend: 0 };
  const plain = advise([P(1, "A", base), P(2, "B", { ...base, form: 5 })]);
  /* Sami hopur, en annar madurinn ber NU DefCon 95, jofnud +0,40 og
     byrjunar-likur 0,95. Hlutdeildin ma EKKI haggast — thaer tolur voru
     MAELDAR OG HAFNADAR sem spágildi og eru birtar SER.                */
  const loaded = advise([
    P(1, "A", base, { dc: 95, aron: 0.4, startProb: 0.95, bigChances: 9 }),
    P(2, "B", { ...base, form: 5 }),
  ]);
  ok("DefCon, jofnudur, byrjunar-likur og big chances HREYFA EKKI hlutdeildina",
    Math.abs(plain.rows[0].share - loaded.rows[0].share) < 1e-12,
    `${plain.rows[0].share} vs ${loaded.rows[0].share}`);

  const ctx = contextFactors({ startProb: 0.42, dc: 88, aron: 0.31, bigChances: 4 });
  ok("thaer eru samt BIRTAR (fjorar samhengis-tolur)", ctx.length === 4,
    ctx.map(c => c.key).join(","));
  ok("og HVER THEIRRA er merkt `weighted:false`", ctx.every(c => c.weighted === false));
  ok("hver theirra ber skyringu a thvi HVERS VEGNA hun vegur ekki",
    ctx.every(c => (c.note || "").length > 40));
  ok("laegar byrjunar-likur fa vidvorunar-ton", ctx.find(c => c.key === "start").tone === "bad");
  ok("engin samhengis-tala birtist thegar gognin vanta",
    contextFactors({}).length === 0);

  /* Vordur a SKRANNI: rankScore ma ekki byrja ad taka thessi inntok. */
  ok("rankScore tekur AÐEINS maeldu fimm inntokin",
    Object.keys(RANK_W).sort().join(",") === "bias,ffdr,form,minsPerGame,minsTrend,price");
  const probe = rankScore({ form: 4, minsPerGame: 80, price: 7, ffdr: 2.5, minsTrend: 0,
                            dc: 99, aron: 1, startProb: 1, consistency: 1 });
  ok("og hunsar allt annad sem er rett ad thvi",
    probe === rankScore({ form: 4, minsPerGame: 80, price: 7, ffdr: 2.5, minsTrend: 0 }));
}

/* ---------- 6. SEIGLA ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("6. SEIGLA — engin vantandi tala ma fella gluggann");
console.log("─".repeat(84));
{
  const cases = [
    ["engin inntok", [P(1, "A", {}), P(2, "B", {})]],
    ["null inntok", [P(1, "A", null), P(2, "B", null)]],
    ["rusl", [P(1, "A", { form: "x", minsPerGame: NaN, price: null, ffdr: undefined }),
              P(2, "B", { form: Infinity, minsPerGame: -5, price: 0, ffdr: 99 })]],
    ["nofn vanta", [P(1, undefined, {}), P(2, undefined, {})]],
  ];
  let bad = null;
  for (const [name, arg] of cases) {
    try {
      const r = advise(arg);
      if (!r.ok) { bad = `${name}: ok=false`; break; }
      for (const row of r.rows) {
        if (!Number.isFinite(row.share) || row.share < 0 || row.share > 1) { bad = `${name}: share=${row.share}`; break; }
        if (!Number.isFinite(row.score)) { bad = `${name}: score=${row.score}`; break; }
      }
      if (Math.abs(r.rows.reduce((a, b) => a + b.share, 0) - 1) > 1e-9) bad = `${name}: summa != 1`;
    } catch (e) { bad = `${name}: ${e.message}`; }
    if (bad) break;
  }
  ok("oll gollud inntok gefa gilda hlutdeild sem leggst i 1", !bad, bad || "");
  /* 500 slembin inntok — obrigdula reglan ma aldrei brotna. */
  let seed = 20260808;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  let broke = null;
  for (let i = 0; i < 500 && !broke; i++) {
    const n = 2 + Math.floor(rnd() * 3);
    const ps = Array.from({ length: n }, (_, k) => P(k, `P${k}`, {
      form: rnd() * 12, minsPerGame: rnd() * 95, price: 4 + rnd() * 10,
      ffdr: 1 + rnd() * 4, minsTrend: (rnd() - 0.5) * 100,
    }));
    const r = advise(ps);
    const sum = r.rows.reduce((a, b) => a + b.share, 0);
    if (Math.abs(sum - 1) > 1e-9 || r.rows.some(x => x.share <= 0 || x.share >= 1)) broke = JSON.stringify({ n, sum });
  }
  ok("500 slembin inntok: hlutdeild alltaf a (0,1) og summan 1", !broke, broke || "");
}

/* ---------- 7. VOGTOLURNAR ERU EIN HEIMILD (C2) ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("7. VOGTOLURNAR — EIN HEIMILD, OG `weights`-VIDFANGID ER FARID");
console.log("─".repeat(84));
{
  /* `advise(xs, { weights })` GERDI EKKI ThAD SEM ThAD SAGDIST GERA:
     SKORID kemur ur `rankScore`, sem les `RANK_W` innbyrdis, svo vidfangid
     hafdi ADEINS ahrif a delta-skyringarnar. Hefdi einhver sent eigin vogir
     hefdi skorid komid ur RANK_W en delturnar ur odrum vogum — og tha haetta
     delturnar ad leggjast saman i skor-muninn, sem er einmitt thad sem
     kafli 4 sannreynir. `RANK_W_SAFE()` var auk thess HARDKODAD AFRIT af
     fimm MAELDUM vogum (ridge, 5 timabil), svo endurmaeling i model.js hefdi
     ekki nad hingad.

     ATHUGASEMDIR SKORNAR BURT: skyringin i advisor.js nefnir bædi
     `RANK_W_SAFE` og gomlu tolurnar, og myndi annars uppfylla sina eigin
     fullyrdingu.                                                          */
  const { readFileSync } = await import("node:fs");
  const raw = readFileSync(new URL("../src/advisor.js", import.meta.url).pathname, "utf8");
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  ok("advisor.js skilgreinir EKKI sinar eigin vogir", !/RANK_W_SAFE\s*\(/.test(code));
  ok("og ber engar hardkodadar vogtolur", !/0\.13805|0\.01607|0\.28235|0\.59359/.test(code));
  ok("hun flytur RANK_W inn ur model.js", /import\s*\{[^}]*RANK_W[^}]*\}\s*from\s*"\.\/model\.js"/.test(code));
  ok("`advise` tekur ekki lengur `weights`", !/function advise\([^)]*weights/.test(code));
  /* Fullyrdingarnar ma ekki vera tomar: `advise` OG `RANK_W` verda ad vera
     tharna, annars er thetta safn ad maela fjarveru sinnar eigin leitar.  */
  ok("`advise` er enn til (annars maelir thetta ekkert)", /export function advise\(/.test(code));
  ok("`RANK_W` er raunverulega notad i skranni", /\bRANK_W\b/.test(code));

  /* OG HEGDUNIN: delturnar VERDA ad leggjast saman i skor-muninn, sem er
     einmitt thad sem brotnar ef skor og skyring lesa sitthvorar vogir.    */
  const mk = (id, inputs) => ({ id, name: "P" + id, pos: "MID", inputs });
  const r = advise([mk(1, { form: 6, minsPerGame: 85, price: 8, ffdr: 2.1, minsTrend: 5 }),
                    mk(2, { form: 3, minsPerGame: 60, price: 5, ffdr: 2.9, minsTrend: -5 })]);
  const avg = r.rows.reduce((a, x) => a + x.score, 0) / r.rows.length;
  const bad = r.rows.filter(row => {
    const sum = row.terms.reduce((a, t) => a + (t.delta || 0), 0);
    return Math.abs(sum - (row.score - avg)) > 1e-9;
  });
  ok(`delturnar leggjast saman i skor-muninn fyrir ALLA (${r.rows.length})`, bad.length === 0,
     bad.map(b => b.name).join(", "));
}

/* ============================================================
   SVID-WIRING — HVER SAMHENGIS-ThATTUR VERDUR AD HAFA FRAMLEIDANDA

   MAELT 14.8.2026: tveir af fjorum thattum voru DAUDIR i framleidslu og
   thessi svita var graen, thvi hun byggir inntakid SJALF
   (`{dc:95, aron:0.4, startProb:0.95, bigChances:9}`). Hun profadi thvi
   formuluna og ALDREI tenginguna:
     · `dc` las `defcon.players[p.id]` — FYLKI flett upp eftir saeti, og
       `defcon_opportunity` bur a `defcon.opportunity[TEAM_ID]`.  -> 0 gildi
     · `bigChances` var HVERGI sett i `src/` — `advisor.js` var eini lesandinn.
   Vordurinn er a SVIDUM, ekki skram (sbr. `wiring.mjs` sem telur SKRAR):
   fyrir hvert svid sem `contextFactors` les verdur ad vera til STADUR I `src/`
   sem SETUR thad — annars er thatturinn skraut.

   OG ThESSI VORDUR ER EKKI NOGUR — HANN VAR AFSANNADUR 16.8.2026.
   Her stod: "Textalestur er nog og er VILJANDI valinn: hann fellur lika thegar
   svidid er sett i skra sem enginn sendir inn, sem er einmitt hvernig
   `bigChances` gat horfid." Sa rokstudningur var rangur. `bigChances` VAR sett
   i `Compare.jsx` — kaflinn her ad nedan fann strenginn og var graenn — medan
   framleidslan gaf **0 gildi af 587**: `<Advisor season={currentLabel}>` sendi
   "2026/27" en `bsd_players.json` ber "2025/26" og `bsd_live.json` er ekki til
   fyrr en eftir 21.8., svo `files.find(f => f.season === season)` skiladi null.
   Setningin var thvi rett skrifud og daud i keyrslu — nakvaemlega bilunin sem
   vordurinn atti ad grípa, og hann getur thad ekki thvi hann les KODA en ekki
   ThAD SEM BIRTIST. Textalestur getur sannad ad svid se SETT; hann getur aldrei
   sannad ad thad beri GILDI.
   Raunverulegi vordurinn er thvi i `tests/compare-visual.mjs` kafla 4: hann
   teiknar radgjofina i jsdom med raungognum og krefst thess ad "Big chances"
   standi i samhengis-kassanum med TOLU. Sa kafli fellur vid season-villuna
   (stadfest med stokkbreytingu) medan thessi kafli helst graenn.
   Kaflinn her stendur afram — hann er odyr og hann ver ANNAD: ad ekkert svid
   se munadarlaust og ad rangi `defcon.players[...]`-hatturinn se horfinn.
   ============================================================ */
console.log("\nWIRING: hvert svid sem contextFactors les hefur framleidanda");
{
  const { readFileSync, readdirSync } = await import("node:fs");
  const SRC = new URL("../src/", import.meta.url).pathname;
  const files = readdirSync(SRC).filter(f => /\.jsx?$/.test(f));
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const code = Object.fromEntries(files.map(f => [f, strip(readFileSync(SRC + f, "utf8"))]));
  const advisorSrc = code["advisor.js"] || "";

  /* Sviðin eru LEIDD UT UR advisor.js, ekki handskrifud — handskrifadur listi
     staðnar um leid og fimmta thaetti er baett vid (CLAUDE.md 8).          */
  const fields = [...new Set([...advisorSrc.matchAll(/num\(p\?\.([A-Za-z_]\w*)\)/g)].map(m => m[1]))];
  ok(`svidin eru leidd ut ur advisor.js (${fields.join(", ")})`, fields.length >= 4, String(fields.length));

  const producers = {};
  for (const [f, src] of Object.entries(code)) {
    if (f === "advisor.js") continue;
    for (const k of fields) {
      /* "Framleidandi" = stadur sem SETUR svidid i hlut: `k:` eda `k =`.  */
      if (new RegExp(`\\b${k}\\s*:`).test(src) || new RegExp(`\\b${k}\\s*=[^=]`).test(src))
        (producers[k] ||= []).push(f);
    }
  }
  const orphan = fields.filter(k => !producers[k]?.length);
  ok("hvert svid hefur framleidanda i src/", orphan.length === 0,
     orphan.length ? `AN FRAMLEIDANDA: ${orphan.join(", ")}` : "");
  for (const k of fields)
    ok(`  ${k} <- ${(producers[k] || []).join(", ") || "ENGINN"}`, !!producers[k]?.length);

  /* OG ad rangi uppflettingar-hatturinn se HORFINN. Neikvaed fullyrding med
     sannadri forsendu: mynstrid `defcon?.players?.[` VAR i Compare.jsx.    */
  ok("enginn les `defcon.players[...]` sem uppflettingu eftir leikmanns-id",
     !/defcon\?\.players\?\.\[/.test(Object.values(code).join("\n")));
  /* `defcon.players` ER fylki — svo rétta leidin er `.find(...)` eda
     lids-taflan `opportunity[...]`. Bædi eru til i repo-inu.              */
  ok("Compare les `opportunity[...]` (sama leid og stats.js)",
     /opportunity\b/.test(code["Compare.jsx"] || ""));
}

console.log(`\nRADGJOFIN: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
