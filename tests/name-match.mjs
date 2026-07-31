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

console.log(`\nNAFNA-PORUN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
