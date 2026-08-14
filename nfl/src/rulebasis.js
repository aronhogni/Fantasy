/* ============================================================
   rulebasis.js — HVADA DEILD ER THETTA, OG HVAD ER RODIN THESS VIRDI
   THAR? HREIN.

   Notandinn sagdi: "eg vill ekki stilla neitt, eg vill ad appid skodi
   reglur og lidafjolda og segi mer byggt a ollum upplysingum hvern a ad
   taka." Urskurdarkassinn segir nafnid. Thessi eining svarar hinu
   helmingnum: HVERS VIRDI er su rod i THESSARI deild, og vitum vid thad
   yfirleitt?

   HVERS VEGNA HUN ER TIL SEM SER EINING. `unmeasuredShape` i
   `sleeper-league.js` las ADEINS `shapes_sleeper.json` (16 logun,
   EINN FLEX, adeins ppr og standard). Eftir `half-lab.mjs` var thad
   ordid RANGT fyrir BADAR deildir notandans:

     Patriots   10 lid, 2 FLEX, ppr   -> "not one of the shapes"
                                          en maelt: +188,0 (11/11, t=4,10)
     Sofahetjur 12 lid, 2 FLEX, half  -> "not one of the shapes"
                                          en maelt: +147,4 (10/11, t=3,44)

   Thad var thvi eina vidvorunin sem BADAR deildirnar bàru — og hun var
   OSONN. Fals-vidvorun a hverja deild er verri en engin: hun kennir
   notandanum ad hunsa vidvaranir.

   THRJAR REGLUR SEM MA EKKI BROTA
   -------------------------------
   1. OMAELD LOGUN FAER ENGA TOLU. `null` og skyring — aldrei naesta
      tala birt eins og hun se thessi logun. Sama regla og "omaeld tala
      fær ekki reit" annars stadar i verkefninu.
   2. OMARKTAEK LOGUN MA EKKI LESA EINS OG MARKTAEK. `12-sflex` er
      +140,5 med t=1,80 og +79,7 i standard med t=0,96. Thad a ad
      birtast SEM omarktaekt, ekki sem stigatala.
   3. VARFAERNA TALAN ER BIRT. Half-PPR var maeld tvisvar — med ppr-ADP
      og std-ADP sem markadsbord, thvi sogulegt half-ADP er ekki til —
      og TOLURNAR HER ERU LAKARI ENDINN. Besta talan vaeri val a
      vikmarki eftir a.
   ============================================================ */

/* ============================================================
   MAELDA TAFLAN — BOKUD, OG PROFID BER HANA VID DISKINN
   ============================================================
   Tolurnar bua i `data/measure/half.json` en eru bakadar hingad af
   sömu astaedu og `MEASURED` i `advice.js`: vidmotid les thaer i hverri
   teikningu og ny gagnaskra i lestrarleidinni tharf sina eigin
   throlni-vord. `tests/rulebasis.mjs` ber toflina vid skrana a diski og
   FELLUR ef hun rekur — svo hun getur ekki ordid urelt i thogn.

   `half-lab.mjs`, 11 timabil (2015-2025), 1.748 poruð leikmanna-timabil.
   HALF ER REIKNUD UPP A STIG, ekki interpoluð: PPR = STD + mottokur,
   svo HALF = (STD + PPR)/2. Algebra, ekki nalgun.                    */
export const HALF_LAB = {
  "10-2flex": {
    ppr:      { mean: 188.0, t: 4.101, wins: 11, years: 11 },
    half:     { mean: 175.6, t: 3.485, wins: 11, years: 11 },
    standard: { mean: 159.4, t: 3.118, wins: 9,  years: 11 },
  },
  "12-2flex": {
    ppr:      { mean: 188.4, t: 3.990, wins: 10, years: 11 },
    half:     { mean: 147.4, t: 3.443, wins: 10, years: 11 },
    standard: { mean: 157.1, t: 3.279, wins: 10, years: 11 },
  },
};

/* Tvi-hlida t-mork vid p=0,05. Fjoldi ara er ekki fasti — `shape-lab`
   maeldi 5 timabil og `half-lab` 11 — svo threskuldurinn MA EKKI vera
   hardkodadur i eina tolu. */
const T_CRIT = { 3: 4.303, 4: 3.182, 5: 2.776, 6: 2.571, 7: 2.447,
                 8: 2.365, 9: 2.306, 10: 2.262, 11: 2.228 };
const tCrit = (years) => T_CRIT[Math.min(11, Math.max(3, years))] ?? 2.228;
const isSig = (q) => q != null && q.t != null && q.years != null &&
  Math.abs(q.t) > tCrit(q.years);

/**
 * Stigagjof appsins -> lykill i maeldu toflunum.
 *
 * ============================================================
 * OÞEKKT STIGAGJOF SKILAR `null`, EKKI `"ppr"`
 * ============================================================
 * Hér stod `return "ppr"` sem sjalfgefid. `measuredEdge` notar lykilinn
 * til ad fletta upp i MAELDU toflunum, svo deild med `scoring: null`
 * hefdi fengid **+188,0 stiga "maelda" tolu ur PPR-toflunni** — tala ur
 * odru sniði, birt undir heiti thessarar deildar. Þad er ordrett
 * skilgreiningin a verstu utkomunni i thessu verkefni: omaeld tala sem
 * litur ut eins og maeling.
 *
 * `usageblend.scoringKey` skilar `null` i sama tilfelli og athugasemdin
 * thar nefnir einmitt thennan mun. Nu eru thaer samhljoda.
 *
 * ÞETTA GETUR EKKI GERST I DAG og thad er skrifad hér svo enginn fjarlaegi
 * varnaglann sem "daudan koda": `normalizeLeague` hvitlistar `scoring`, svo
 * appid getur ekki sent othekkt gildi. Varnaglinn er fyrir naesta
 * innflutnings-veg — Sleeper gaeti kynnt nytt snid, og tha a thetta ad
 * SKILA ENGU fremur en ad giska. Sama rok og `AVAIL_KNOWN` i FPL-hlutanum:
 * ovirk vorn er vorn, ekki daudur kodi.
 */
export function scoringKeyOf(league) {
  const s = league && league.scoring;
  if (s === "ppr") return "ppr";
  if (s === "half-ppr") return "half";
  if (s === "standard") return "standard";
  return null;
}

/**
 * Logunar-lykill: `${teams}-${afbrigdi}`.
 *
 * Afbrigdin eru THAU SEM VORU MAELD og ekki fleiri. Rodin skiptir mali
 * og hun er ekki handahof: superflex er sterkasta einkennid (thad
 * faerir varamannsthrep QB um tug), tveir QB naest, tha tveir FLEX.
 * Deild sem er baedi superflex OG med tvo FLEX telst superflex, thvi
 * thad var logunin sem var maeld.
 */
export function shapeKeyOf(league) {
  if (!league) return null;
  const teams = Number(league.teams);
  if (!Number.isFinite(teams)) return null;
  const st = league.starters || {};
  const qb = Number(st.QB) || 0;
  const flex = Number(st.FLEX) || 0;
  const variant = league.superflex ? "sflex"
                : qb >= 2 ? "2qb"
                : flex >= 2 ? "2flex"
                : "std";
  return `${teams}-${variant}`;
}

const ORDER = ["QB", "RB", "WR", "TE", "FLEX", "SUPERFLEX", "K", "DST"];

/** Laesileg lina: "10 teams · PPR · QB/RB2/WR2/TE/2FLEX/K/DST · 15 rounds" */
export function describeLeague(league) {
  if (!league) return "no league";
  const st = league.starters || {};
  const slots = ORDER.filter((p) => (Number(st[p]) || 0) > 0).map((p) => {
    const n = Number(st[p]) || 0;
    return n > 1 ? `${n}${p}` : p;
  });
  const extra = Object.keys(st).filter((p) => !ORDER.includes(p) && (Number(st[p]) || 0) > 0);
  const label = league.scoring === "half-ppr" ? "half-PPR"
              : league.scoring === "standard" ? "standard" : "PPR";
  const parts = [`${league.teams} teams`, label];
  if (slots.length || extra.length) parts.push([...slots, ...extra].join("/"));
  if (league.rounds) parts.push(`${league.rounds} rounds`);
  if (league.superflex) parts.push("superflex");
  return parts.join(" · ");
}

/**
 * Hvad er A-Ranking thess virdi i THESSARI deild?
 *
 * `shapes` er innihald `data/shapes_sleeper.json` (thegar hladid og
 * sent i draft-flipann). Se hun ekki gefin er adeins bakada
 * tveggja-FLEX taflan notud — thad er RETT hegdun, ekki hrun: minni
 * thekja, en engin agiskun.
 *
 * Skilar `null` thegar logunin var ALDREI maeld. Kallandinn ma tha
 * segja "we have not measured this shape" en ALDREI birta tolu.
 */
export function measuredEdge(league, shapes = null) {
  const shape = shapeKeyOf(league);
  if (!shape) return null;
  /* `null` -> ENGIN TALA. Se stigagjofin othekkt vitum vid ekki hvada
     tafla gildir, og "engin maeld tala" er retta svarid. */
  const fmt = scoringKeyOf(league);
  if (!fmt) return null;

  /* 1. NAKVAEM SAMSVORUN i half-lab — logunin OG snidid maeld beint. */
  const direct = HALF_LAB[shape] && HALF_LAB[shape][fmt];
  if (direct) {
    return { shape, scoring: fmt, source: "half-lab", exact: true,
             mean: direct.mean, bracket: null, t: direct.t,
             wins: direct.wins, years: direct.years, significant: isSig(direct) };
  }

  const table = shapes && shapes.shapes ? shapes.shapes : null;
  if (!table) return null;
  const at = (sc) => {
    const row = table[`${sc}|${shape}`];
    const v = row && row.vsAdp;
    return v && v.mean != null ? { mean: v.mean, t: v.t, wins: v.wins, years: v.years } : null;
  };

  /* 2. NAKVAEM SAMSVORUN i shape-lab (adeins ppr og standard eru thar). */
  if (fmt !== "half") {
    const q = at(fmt);
    if (!q) return null;
    return { shape, scoring: fmt, source: "shape-lab", exact: true,
             mean: q.mean, bracket: null, t: q.t, wins: q.wins, years: q.years,
             significant: isSig(q) };
  }

  /* 3. HALF-PPR I LOGUN SEM HALF-LAB NAER EKKI YFIR.
        Half var aldrei maeld i shape-lab, svo THAD ER ENGIN PUNKTTALA.
        En hun liggur milli tveggja maeldra snida og BAEDI mork eru til —
        thvi er skilad VIKMORKUM, ekki punkti. `exact: false` segir
        kallandanum ad tetta se bil.

        Og `significant` er satt ADEINS ef BADIR endar eru marktaekir:
        bil sem inniheldur omarktaekan enda er ekki marktaekt bil.
        (Daemi: `16-std` er +214,5 marktaekt i ppr en +169,0 med t=1,11
        i standard — half-PPR thar er thvi EKKI marktaekt.)          */
  const lo = at("ppr"), hi = at("standard");
  if (!lo || !hi) return null;
  const a = Math.min(lo.mean, hi.mean), b = Math.max(lo.mean, hi.mean);
  return { shape, scoring: "half", source: "shape-lab-bracket", exact: false,
           mean: null, bracket: [a, b],
           t: Math.abs(lo.t) < Math.abs(hi.t) ? lo.t : hi.t,
           wins: Math.min(lo.wins, hi.wins), years: Math.min(lo.years, hi.years),
           significant: isSig(lo) && isSig(hi) };
}

/**
 * Ein lina sem ma setja undir urskurdinn, med ollum thremur reglunum
 * innbyggdum. Skilar `null` thegar ekkert ma segja — tha a kallandinn
 * ad thegja um toluna, ekki fylla i hana.
 *
 * ============================================================
 * TVAER OLIKAR ASTAEDUR, TVAER OLIKAR SETNINGAR
 * ============================================================
 * Hér stod EIN setning fyrir hvert `null` ur `measuredEdge`: "this
 * league shape has not been backtested". Hun var rett svo lengi sem
 * `scoringKeyOf` skiladi `"ppr"` sjalfgefid, thvi tha gat ADEINS logunin
 * verid orsokin. Um leid og sa varnagli fór ad skila `null` (sja notuna
 * thar) opnadist onnur leid inn i sama `null` — OÞEKKT STIGAGJOF — og
 * setningin nefndi tha RANGA ORSOK: logunin ma vera fullmaeld (`10-2flex`
 * ber +188,0 i 11 af 11 timabilum) medan thad er stigagjofin sem vid
 * hofum aldrei maelt.
 *
 * Rong orsok i vidvorun er ekki ordalag. Notandi sem les "shape has not
 * been backtested" um `10-2flex` sér setningu sem hann getur SANNAD ranga
 * — og laerir thar med ad hunsa kassann; sami skadi og fals-vidvorunin
 * sem thessi eining var smiðuð til ad fjarlaegja.
 *
 * `reason` er thvi vél-laesilegi adgreinirinn ("shape" / "scoring") svo
 * kallandi (og profid) geti krafist thess ad THAER SEU TVAER. Prof sem
 * adeins spyr "kom einhver setning?" gat ekki sed thennan mun.
 */
export function edgeSentence(league, shapes = null) {
  const e = measuredEdge(league, shapes);
  if (!e) {
    /* Logunin fyrst: vitum vid ekki hve mörg lid eru i deildinni er
       ekkert vitad um logun, og tha er thad orsokin. Se logunin lesin
       en stigagjofin othekkt er thad HITT tilfellid. */
    if (shapeKeyOf(league) && !scoringKeyOf(league)) {
      return { text: "This league's scoring is not one that was backtested — the " +
                     "measurements cover PPR, half-PPR and standard only. The shape " +
                     "itself may well be measured; the scoring is what is missing, " +
                     "so no measured margin is shown.",
               measured: false, significant: false, reason: "scoring" };
    }
    return { text: "This league shape has not been backtested — the order is the " +
                   "same model, but there is no measured margin for it.",
             measured: false, significant: false, reason: "shape" };
  }
  const shapeTxt = `${e.shape.replace("-", "-team ")}`;
  if (!e.significant) {
    return { text: `Measured in this shape (${shapeTxt}, ${e.scoring}) but ` +
                   `not significantly better than ADP — treat the order as ` +
                   `unproven here.`,
             measured: true, significant: false, ...e };
  }
  const amount = e.exact
    ? `+${e.mean} points`
    : `between +${e.bracket[0]} and +${e.bracket[1]} points`;
  return { text: `Measured: ${amount} over ADP across a season in this exact ` +
                 `league shape (${e.wins} of ${e.years} seasons).`,
           measured: true, significant: true, ...e };
}
