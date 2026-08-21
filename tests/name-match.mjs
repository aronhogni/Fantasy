/* ============================================================
   NAFNA-PORUN — RETT OG INNAN VIDMIDS

   AF HVERJU SER SAFN: `nameScore` er heitasta fallid i appinu. Hun er
   kollud ~25.000 sinnum i HVERRI "cook"-umferd i leikmannalistanum (564
   leikmenn x ~25 ESPN-skyttur x tvo nafnaform) og var hagraedd 31.7. Tvennt
   getur farid urskeidis vid slika hagraedingu og HVORUGT sest i vidmotinu:

     1. SKORID BREYTIST. Tha faera skot-tolur sig milli leikmanna — Rodrigo
        Gomes fengi tolur Angel Gomes. Enginn tekur eftir thvi; tolurnar
        lita jafn trulegar ut.
     2. HAGRAEDINGIN ER AFTURKOLLUD OG ENGINN VEIT. 60 ms i cook er ekki
        hrun, bara sljott app a sima.

   Thess vegna: (a) skorið er bein samanburd vid VIDMIDS-UTFAERSLU sem er
   skrifud upp ur skjalfestu reglunni (ekki afrit af shipped-kodanum), a
   ollum raunverulegum nafnaporum; (b) timinn er maeldur med thaki.

   MAELT 31.7.2026: 60,1 ms -> 4,7 ms (12,8x), porun ORDRETT obreytt.
   ============================================================ */
import { readFileSync } from "node:fs";
const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
import { nameScore, nameTokens, normName, indexImminentByTeam, matchImminent }
  from "../src/stats.js";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

const players = J("players.json").players ?? J("players.json");
const teams = J("teams.json").teams ?? J("teams.json");
const shotsFile = J("last_gw_shots.json");
const imminent = J("imminent.json");
const teamById = {};
for (const t of teams) teamById[t.id] = t;

/* ---------- 1. VIDMIDS-UTFAERSLA ur skjalfestu reglunni ----------
   "Skor = fjoldi sameiginlegra EINKVAEMRA orda, +0,5 ef SIDASTA ordid er
   sameiginlegt." Skrifad her fra grunni med Set-um — EKKI afritad ur
   stats.js — svo profid se sjalfstaett vitni um regluna.               */
function refScore(a, b) {
  const ta = normName(a).split(" ").filter(t => t.length >= 2);
  const tb = normName(b).split(" ").filter(t => t.length >= 2);
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  let shared = 0;
  for (const t of new Set(ta)) if (setB.has(t)) shared++;
  if (!shared) return 0;
  return shared + (ta[ta.length - 1] === tb[tb.length - 1] ? 0.5 : 0);
}

console.log("\n=== 1. SKORID ER OBREYTT (vidmid vs shipped) ===");
const shotByTeam = {};
for (const sp of shotsFile?.players || []) (shotByTeam[sp.team] ||= []).push(sp);
let pairs = 0, mismatch = [];
for (const p of players) {
  const cands = shotByTeam[teamById?.[p.team]?.short] || [];
  for (const c of cands) {
    for (const form of [p.web_name, `${p.first_name} ${p.second_name}`]) {
      pairs++;
      const got = nameScore(form, c.name), want = refScore(form, c.name);
      if (got !== want && mismatch.length < 5)
        mismatch.push(`"${form}" vs "${c.name}": ${got} != ${want}`);
    }
  }
}
ok(`${pairs} raunveruleg nafnapor prófuð`, pairs > 5000, `${pairs}`);
ok("shipped nameScore == vidmids-utfaersla a OLLUM porum",
   mismatch.length === 0, mismatch.join(" | "));

/* ---------- 1b. TILBUIN JADARTILFELLI ----------
   RAUNVERULEG NOFN NAEGJA EKKI. Endurskrifadi nameScore skipti `new Set(ta)`
   ut fyrir `ta.indexOf(t) !== i` — sem er de-dupe. En ENGINN raunverulegur
   knattspyrnumadur i gognunum hefur TVITEKID tak i nafninu sinu, svo kafli 1
   getur ekki greint hvort de-dupe se rett. Stokkbreyting sem fjarlaegdi
   hann slapp thvi i gegn (maelt 31.7.). Thessi tilfelli eru bygd til ad
   hitta einmitt thau greinamork.                                        */
console.log("\n=== 1b. JADARTILFELLI (tvitekin tokn o.fl.) ===");
const EDGE = [
  ["Ola Ola Solberg", "Ola Solberg"],        // tvitekid tak i ta
  ["Ola Solberg", "Ola Ola Solberg"],        // tvitekid tak i tb
  ["Ola Ola", "Ola Ola"],                    // allt tvitekid
  ["Gomez Gomez Gomez", "Gomez"],            // threfalt
  ["Kinsky", "Kinsky"],                      // eitt tak, eins
  ["Kinsky", "Palmer"],                      // ekkert sameiginlegt
  ["", "Palmer"], ["Palmer", ""], ["", ""],  // tomt
  ["A B", "B A"],                            // rod skiptir mali fyrir +0,5
  ["Jo", "Jo"],                              // tveggja stafa tak (a ad telja)
  ["J", "J"],                                // eins stafs tak (a AD SLEPPA)
  ["Diego Gómez Amarilla", "Diego Gomez"],   // broddstafir
  ["O'Riley", "ORiley"], ["Groß", "Gross"],
  ["Kadıoğlu", "Kadioglu"], ["Højlund", "Hojlund"],
  ["van Dijk", "Virgil van Dijk"],
  ["Mac Allister", "Alexis Mac Allister"],
];
const edgeBad = [];
for (const [a, b] of EDGE) {
  const got = nameScore(a, b), want = refScore(a, b);
  if (got !== want) edgeBad.push(`"${a}" vs "${b}": ${got} != ${want}`);
}
ok(`${EDGE.length} jadartilfelli: shipped == vidmid`, edgeBad.length === 0,
   edgeBad.join(" | "));
/* Og ad tvitekna tilfellid se raunverulega ADGREINANDI — annars vaeri
   listinn hér ofan skraut sem stadfestir ekkert.                        */
ok("tvitekid tak ER adgreinandi (de-dupe skiptir mali)",
   refScore("Ola Ola Solberg", "Ola Solberg") === 2.5,
   `${refScore("Ola Ola Solberg", "Ola Solberg")}`);

/* Serstok tilfelli sem skjolin nefna — thau eiga ad haldast. */
console.log("\n=== 2. TILFELLIN SEM SKJOLIN NEFNA ===");
ok("samsett eftirnofn: 'Diego Gómez Amarilla' ~ 'Diego Gómez' skorar > 0",
   nameScore("Diego Gómez Amarilla", "Diego Gómez") > 0);
ok("TRANSLIT a undan NFD: 'Groß' -> 'gross'", normName("Groß") === "gross",
   normName("Groß"));
ok("punktlaust i: 'Kadıoğlu' -> 'kadioglu'", normName("Kadıoğlu") === "kadioglu",
   normName("Kadıoğlu"));
ok("olik nofn i sama lidi skora ekki eins (Bueno-tilfellid)",
   nameScore("Hugo Bueno", "Santiago Ignacio Bueno") !==
   nameScore("Santiago Bueno", "Santiago Ignacio Bueno"));

/* ---------- 3. MINNID (memo) ---------- */
console.log("\n=== 3. MINNI A TAKNUN ===");
const a1 = nameTokens("Antonín Kinský"), a2 = nameTokens("Antonín Kinský");
ok("sama strengur skilar SOMU toknum", JSON.stringify(a1) === JSON.stringify(a2));
ok("minnid skilar TOMU fyrir tomt inntak", nameTokens("").length === 0);
ok("minnid tholir null/undefined", nameTokens(null).length === 0 &&
   nameTokens(undefined).length === 0);
/* Thakid: yfir 4.000 einkvaemir strengir hreinsa minnid — skorið verdur
   ad vera thad SAMA eftir hreinsun, annars vaeri minnid ekki gagnsaett. */
const before = nameScore("Antonín Kinský", "A. Kinsky");
for (let i = 0; i < 4200; i++) nameTokens(`gervinafn nr ${i}`);
ok("skor obreytt eftir ad thakid hreinsadi minnid",
   nameScore("Antonín Kinský", "A. Kinsky") === before,
   `${nameScore("Antonín Kinský", "A. Kinsky")} vs ${before}`);

/* ---------- 4. TIMINN ---------- */
console.log("\n=== 4. VIDMID A TIMA ===");
const immByTeam = indexImminentByTeam(imminent);
const findShot = (p) => {
  const cands = shotByTeam[teamById?.[p.team]?.short] || [];
  let best = null, bs = 0, second = 0;
  for (const c of cands) {
    const sc = Math.max(nameScore(p.web_name, c.name),
                        nameScore(`${p.first_name} ${p.second_name}`, c.name));
    if (sc > bs) { second = bs; bs = sc; best = c; }
    else if (sc > second) second = sc;
  }
  return (best && bs >= 1 && bs > second) ? best : null;
};
const times = [];
let matched = 0;
for (let r = 0; r < 7; r++) {
  const t0 = performance.now();
  matched = 0;
  for (const p of players) {
    if (findShot(p)) matched++;
    matchImminent(p, immByTeam, teamById?.[p.team]?.short);
  }
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
const med = times[Math.floor(times.length / 2)];
console.log(`  nafna-porun: median ${med.toFixed(1)} ms (${players.length} leikmenn)`);
/* THAKID ER RUMT VILJANDI: 25 ms er enn 2,4x undir thvi sem OHAGRAEDDA
   utgafan maeldist (60 ms) og 5x yfir maeldu gildinu (4,7 ms), svo thetta
   fellur ekki a hægri vel eda alagi — adeins ef hagraedingin er tekin ut. */
ok(`median undir 25 ms (maelt 4,7 ms; ohagraett var 60 ms)`, med < 25,
   `${med.toFixed(1)} ms`);
ok("porunin finnur enn skyttur (semantik ekki brotin)", matched > 100,
   `${matched} paradir`);

/* ============================================================
   5. API-SPORTS -> FPL: ThRJU ThREP, MAELD A ALLRI DEILDINNI  (21.8.2026)

   HVERS VEGNA HER: `matchFpl` i scripts/fetch.mjs er ONNUR porun en
   `nameScore` ofan — hun er SKORDUD VID LID og hefur ENGAN throskuld
   (mengja-innihald, ekki skor). Hun var samt oprofud a nokkru odru en
   tveimur handskrifudum nofnum i tests/lineups.mjs, og 21.8.2026 — fyrsta
   daginn sem heimildin bar raungogn — vantadi hana ThRJAR reglur:
     · TRANSLIT ("Nørgaard")            -> laest med src/names.js
     · samsett eftirnofn ("M. Joseph")  -> threp 3, orda-yfirskorun
     · einkvaemni i threpi 1            -> bert "Fletcher" hitti RANGAN
       mann af tveimur Fletcher hja Man Utd (ThOGUL RONG PORUN)

   MAELIKVARDINN ER SJALFPORUN A RAUNVERULEGA API-SNIDINU. Fyrir HVERN
   leikmann i deildinni eru bygd thrju nafnaform sem heimildin sendir i reynd
   ("J. Trafford", "M. de Ligt", "Gabriel" — stadfest gegn lifandi svari,
   sja tests/lineups.mjs) og krafan er ad porunin skili HONUM. Rangporun
   (annar madur i sama lidi) er MÆLD SER, thvi hun er hitt einkennid og
   verra: 1.278/1.279 rett MED einni rangporun er verri utkoma en 1.270
   rett med engri.

   MAELT: threp 1+2 ein gefa 94,3% og EINA rangporun; med threpi 3 og
   einkvaemni i threpi 1 er utkoman 100,0% og ENGIN rangporun.
   ============================================================ */
console.log("\n=== 5. API-SPORTS -> FPL: ThREP 1-3 A ALLRI DEILDINNI ===");
{
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
  const axStart = src.indexOf("async function apiNameIndex(");
  ok("apiNameIndex finnst i scripts/fetch.mjs", axStart > 0);
  const axDecl = src.slice(axStart, src.indexOf("\n}\n", axStart) + 3);
  const idx = await new Function("readFile", "DATA", "normName",
    `${axDecl}\nreturn apiNameIndex;`)(readFile,
      new URL("../data", import.meta.url).pathname, normName)();

  /* Snidin sem heimildin sendir i reynd. "F. Sidasta-tak" er algengast;
     "F. Fullt eftirnafn" kemur fyrir; bert web_name kemur fyrir (Gabriel). */
  const forms = p => {
    const sn = p.second_name || p.web_name, parts = String(sn).split(/\s+/);
    return [...new Set([`${(p.first_name || "")[0]}. ${parts[parts.length - 1]}`,
                        `${(p.first_name || "")[0]}. ${sn}`, p.web_name])];
  };
  let tot = 0, right = 0, wrong = [], none = 0;
  for (const p of players) for (const f of forms(p)) {
    tot++;
    const g = idx.matchFpl(f, p.team);
    if (g === p.id) right++;
    else if (g == null) none++;
    else wrong.push(`"${f}" -> #${g} (atti ad vera ${p.web_name} #${p.id})`);
  }
  console.log(`  ${tot} nofn i API-snidinu: ${right} rett, ${none} oparad, ${wrong.length} RANGPORUN`);
  ok(`thekja: yfir 1.000 nafnaform profud (${tot})`, tot > 1000, `${tot}`);
  ok(`ENGIN RANGPORUN (${wrong.length})`, wrong.length === 0, wrong.slice(0, 3).join(" | "));
  ok(`>=99% sjalfporun (${(100 * right / tot).toFixed(1)}%)`, right / tot >= 0.99,
     `${right}/${tot}`);

  /* LID-SKORDUNIN ER FORSENDAN, EKKI SKRAUT. "B. Fredrick" hja Brentford
     ma ALDREI hitta Tyler Fredricson hja Man Utd. Prófad berum ordum a
     nakvaemlega thvi pari sem raungognin bodu upp a 21.8.2026.          */
  const fredricson = players.find(p => /Fredricson/i.test(p.second_name || ""));
  ok("forsenda: Fredricson er i gognunum (annars maelir naesta lina ekkert)",
     !!fredricson, String(fredricson?.web_name));
  const bre = teams.find(t => t.short === "BRE")?.id;
  ok("lid-skordun: \"B. Fredrick\" (Brentford) hittir EKKI Fredricson (Man Utd)",
     bre != null && idx.matchFpl("B. Fredrick", bre) == null,
     `fekk ${idx.matchFpl("B. Fredrick", bre)}`);
  ok("og hann finnst i SINU lidi — svo skordunin er thad sem stoppar hann",
     fredricson != null && idx.matchFpl("T. Fredricson", fredricson.team) === fredricson.id,
     `fekk ${fredricson && idx.matchFpl("T. Fredricson", fredricson.team)}`);

  /* TVIRAEDNI: tveir Fletcher hja Man Utd. Upphafsstafurinn er SKILYRDI i
     threpi 3, svo bædi eiga ad radast RETT — og bert "Fletcher" ma ekki
     radast a thann sem er EKKI web_name-jafn (thad var villan).        */
  const fl = players.filter(p => /^Fletcher$/i.test(p.second_name || ""));
  ok(`forsenda: tveir menn med eftirnafnid Fletcher i sama lidi (${fl.length})`,
     fl.length === 2 && fl[0].team === fl[1].team,
     fl.map(p => `${p.first_name} ${p.web_name}`).join(" / "));
  for (const p of fl)
    ok(`"${(p.first_name || "")[0]}. Fletcher" -> ${p.first_name} (#${p.id})`,
       idx.matchFpl(`${(p.first_name || "")[0]}. Fletcher`, p.team) === p.id,
       `fekk ${idx.matchFpl(`${(p.first_name || "")[0]}. Fletcher`, p.team)}`);
  const bare = fl.find(p => p.web_name === "Fletcher");
  ok("bert \"Fletcher\" -> sa sem BER thad web_name, ekki sa sem kom fyrr i fylkinu",
     bare != null && idx.matchFpl("Fletcher", bare.team) === bare.id,
     `fekk ${bare && idx.matchFpl("Fletcher", bare.team)}`);

  /* ThREP 3 A ThVI TILFELLI SEM VAR RAUNVERULEGA TAPAD 21.8.2026. */
  const joseph = players.find(p => /^Joseph\s/i.test(p.second_name || ""));
  ok("forsenda: samsett eftirnafn sem byrjar a \"Joseph\" er i gognunum",
     !!joseph, String(joseph?.second_name));
  ok("threp 3: \"M. Joseph\" -> Mateo Joseph (samsett eftirnafn i FPL)",
     joseph != null && idx.matchFpl("M. Joseph", joseph.team) === joseph.id,
     `fekk ${joseph && idx.matchFpl("M. Joseph", joseph.team)}`);
  /* OG ThREP 3 MA EKKI VERA VITLEYSA: rangur upphafsstafur -> ENGIN porun. */
  ok("threp 3 krefst upphafsstafsins: \"Q. Joseph\" -> null",
     joseph != null && idx.matchFpl("Q. Joseph", joseph.team) == null,
     `fekk ${joseph && idx.matchFpl("Q. Joseph", joseph.team)}`);
}

console.log(`\nNAFNA-PORUN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
