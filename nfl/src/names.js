/* ============================================================
   names.js — nafna-normalisering. HREIN, engin gogn.

   THETTA ER SIDASTA URRAEDI, EKKI ADALLEIDIN.
   Audkennisbruin (`db_playerids.csv` + audkennin sem Sleeper ber
   sjalfur) parar meirihluta leikmanna an thess ad lita a nofn. Nafna-
   porun er notud fyrir thad sem eftir stendur — adallega nyliða sem
   eru ekki komnir i bruna — og hun er ALLTAF MERKT `via: "name"`
   svo hun se adgreinanleg fra oruggri porun.

   Lærdomurinn ur FPL-verkefninu sem gildir hér: THOGUL ROND PORUN ER
   VERRI EN ENGIN PORUN. Thess vegna krefst `matchByName` samhljoms
   i STODU og skilar engu ef tvo joft god somsvorun finnast — hun
   giskar ekki.

   NFL-serstakar gildrur sem thetta leysir:
   - Ættlidir: "Odell Beckham Jr." / "Odell Beckham" / "Odell Beckham II"
   - Punktar og bil: "A.J. Brown" / "AJ Brown" / "A. J. Brown"
   - Ur-stafir: "Amon-Ra St. Brown" (bandstrik OG punktur i einu nafni)
   - Fransk/spaensk brodd-staf: "Bryce Perkins" vs "Kenneth Walker III"
   - Vorn: "Houston Texans" vs "HOU" vs "Texans D/ST"
   ============================================================ */

/* ---------- lidsskammstafanir ---------- */

/**
 * Heimildirnar okkar nota ekki somu skammstafanir. nflverse notar
 * LA/LAR, Sleeper notar LAR, FFC notar LAR/LA, eldri gogn nota
 * OAK/SD/STL fyrir lid sem fluttu. Samraemt hedan.
 *
 * ATH: WAS/WSH og JAX/JAC eru BÆDI i notkun i lifandi heimildum i
 * dag — thetta er ekki bara soguleg hreinsun.
 */
export const TEAM_ALIAS = {
  LA: "LAR", STL: "LAR", SD: "LAC", OAK: "LV", SL: "LAR",
  WSH: "WAS", WFT: "WAS", JAC: "JAX", ARZ: "ARI", BLT: "BAL",
  CLV: "CLE", HST: "HOU", GNB: "GB", KAN: "KC", NWE: "NE",
  NOR: "NO", SFO: "SF", TAM: "TB", LVR: "LV",
};
export const normTeam = (t) => (t ? (TEAM_ALIAS[String(t).toUpperCase()] || String(t).toUpperCase()) : null);

/** 32 lid — notad til ad sannreyna ad porun hafi ekki buid til nytt lid. */

/** Vidskeyti sem segja EKKERT um hver madurinn er. */
const SUFFIX = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/**
 * Kjarna-normalisering: nidur i lagstafi, broddstafir felldir,
 * greinarmerki burt, vidskeyti burt, eitt bil.
 */
export function normName(s) {
  if (!s) return "";
  let t = String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // broddstafir
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.'’`]/g, "")                             // A.J. -> aj
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const parts = t.split(" ").filter((w) => w && !SUFFIX.has(w));
  return mergeInitials(parts).join(" ");
}

/**
 * Sameinar SAMLIGGJANDI eins-stafs ord i eitt.
 *
 * "A. J. Brown" -> ["a","j","brown"] -> ["aj","brown"]
 * "A.J. Brown"  -> ["aj","brown"]     (thegar rett)
 *
 * BADAR RITHAETTIR ERU I NOTKUN i lifandi heimildum og an thessa
 * porudust their EKKI saman — profid greip thad. Adgerdin er orugg
 * thvi eins-stafs ord innan nafns eru alltaf upphafsstafir; nofn
 * eins og "Amon Ra St Brown" bera engin eins-stafs ord og haggast
 * ekki.
 */
function mergeInitials(parts) {
  const out = [];
  let buf = "";
  for (const w of parts) {
    if (w.length === 1) { buf += w; continue; }
    if (buf) { out.push(buf); buf = ""; }
    out.push(w);
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Lykill sem tholir ad millinafn vanti: fyrsta ord + sidasta ord.
 * "Marvin Harrison Jr" og "Marvin Harrison" gefa bædi "marvin harrison".
 * Notad SEM VARALEID, ekki sem fyrsti lykill — hann sameinar fedga
 * med sama nafni (Marvin Harrison eldri er ekki i deildinni, en
 * reglan ma ekki byggja a thvi).
 */
export function looseKey(s) {
  const p = normName(s).split(" ");
  if (p.length <= 1) return p.join(" ");
  return `${p[0]} ${p[p.length - 1]}`;
}

/**
 * Enn losari lykill: fyrsti stafur fornafns + eftirnafn.
 * "Ken Walker" og "Kenneth Walker" gefa bædi "k walker".
 * Thetta er SIDASTA threpid og krefst thess ad stada OG lid passi.
 */
export function initialKey(s) {
  const p = normName(s).split(" ");
  if (p.length <= 1) return p.join(" ");
  return `${p[0][0]} ${p[p.length - 1]}`;
}

/** Vorn/serlid: "Houston Texans" og "Texans" -> "texans". */
export function dstKey(s) {
  const t = normName(s).replace(/\b(dst|def|d st|defense)\b/g, "").trim();
  const p = t.split(" ");
  return p[p.length - 1] || t;
}

/**
 * Byggir uppflettitoflu ur lista. Lyklar sem eru TVIRAEDIR (fleiri en
 * einn leikmadur) eru MERKTIR OGILDIR i stad thess ad sidasti vinni.
 * "Sidasti vinnur" er thogla ronga porunin sem vid erum ad forðast.
 */
export function buildIndex(list, { keyFn = looseKey, nameOf = (x) => x.name,
                                   posOf = (x) => x.pos } = {}) {
  const byKey = new Map();
  for (const item of list) {
    const nm = nameOf(item);
    if (!nm) continue;
    const pos = posOf(item);
    const k = `${keyFn(nm)}|${pos || ""}`;
    const cur = byKey.get(k);
    if (cur === undefined) byKey.set(k, item);
    else if (cur !== null && cur !== item) byKey.set(k, null);   // tviraett
  }
  return byKey;
}

/**
 * Parar `name`+`pos` (+ valfrjalst `team`) vid vistfang i toflu.
 * Skilar { item, via } eda null.
 *
 * THREPIN eru reynd i rod og STOPPA vid fyrsta ORUGGA svar:
 *   exact  — nakvaemt normalizerad nafn
 *   loose  — fyrsta+sidasta ord
 *   init   — upphafsstafur+eftirnafn, KREFST thess ad lid passi
 * Threpi 3 an lids vaeri agiskun; hun er ekki reynd.
 */
export function matchByName(idx, name, pos, team = null) {
  /* VORN FYRST OG A LIDI — sja notuna i `buildIndexes`. Nafnid er ekki
     spurt, thvi thad er ekki audkenni hennar. */
  const posUp = String(pos || "").toUpperCase();
  if ((posUp === "DST" || posUp === "DEF" || posUp === "D/ST") && idx && idx.dstTeam) {
    const t = normTeam(team);
    const hit = t ? idx.dstTeam.get(t) : null;
    if (hit) return { item: hit, via: "dst-team" };
  }
  for (const [via, keyFn, needTeam] of [
    ["exact", normName, false],
    ["loose", looseKey, false],
    ["initial", initialKey, true],
  ]) {
    const hit = idx[via] && idx[via].get(`${keyFn(name)}|${pos || ""}`);
    if (hit) {
      /* ============================================================
         "KREFST LIDS" THYDIR AD LID VERDI AD VERA TIL — BADUM MEGIN
         ============================================================
         SKJOLUNIN HER AD OFAN SAGDI THETTA RETT OG KODINN GERDI THAD
         EKKI: `team && hit.team && hit.team !== team` sleppur i gegn
         thegar ANNAD HVORT lidid vantar. Frjalsir agentar og
         FFC-radir an lids foru thvi i gegnum upphafsstafa-threpid an
         nokkurrar stadfestingar — nakvaemlega thad sem sidasta setning
         skjolunarinnar bannar: "threpi 3 an lids vaeri agiskun".

         MAELT A RAUNGOGNUNUM adur en thessu var breytt: 86 paranir
         komu um upphafsstaf og **85 theirra voru an lids okkar megin**
         — A.J. Green, Julio Jones, T.J. Jones, Devin Smith, allt
         arekstrarhaettu-eftirnofn. **ENGINN theirra er draftanlegur**
         (0 med ADP undir 400). Strangari reglan kostar thvi ekkert sem
         notandinn ser og fjarlaegir aetta hins vegar thogla ranga
         porun sem thessi modull er til ad hindra.

         Tvaer paranir sem eru TIL en OSAMANBURDARHAEFAR eru ekki
         staerdfraedilega jafngildar; "veit ekki" er ekki "passar". */
      if (needTeam && (!team || !hit.team || hit.team !== team)) continue;
      return { item: hit, via };
    }
  }
  return null;
}

/** Byggir oll thrju throfin i einu. */
export function buildIndexes(list, opt = {}) {
  return {
    exact: buildIndex(list, { ...opt, keyFn: normName }),
    loose: buildIndex(list, { ...opt, keyFn: looseKey }),
    initial: buildIndex(list, { ...opt, keyFn: initialKey }),
    /* ============================================================
       VORN ER LID, EKKI NAFN (31.8.2026)
       ============================================================
       FFC nefnir vardir "Seattle Defense" og "LA Rams Defense"; vid
       nefnum thaer "Seattle Seahawks" og "Los Angeles Rams". ÞAU NOFN
       PARAST ALDREI, og thad er RETT hegdun i nafna-pörun — hun er
       byggd til ad hafna oskyldum nofnum.

       AFLEIDINGIN VAR MAELD 31.8.2026 og hun kostar vol: **0 af 32**
       vordum baru FFC-ADP, svo `build.js` fell thegjandi i
       Sleeper-ADP fyrir thaer EINAR medan allir 251 skilamenn notudu
       FFC. Tveir kvardar i sama dálki: medal-|munur| **47,1 val =
       3,9 umferdir**, og **22 af 26 hallast SEINT** (NYJ 147,7 ->
       282,2). Ad bida eftir vorn eftir thessu bordi thydir ad vera
       ordinn seinn i hverja goda vorn.

       LAUSNIN ER EKKI LAUSARI NAFNA-PORUN — hun vaeri agiskun. Vorn
       hefur EINKVAEMT audkenni sem badar heimildir bera: LIDID. Þetta
       threp er thvi NAKVAEMT, ekki oruggara-en-ekkert: eitt lid, ein
       vorn, ekkert svigrum fyrir arekstur.                          */
    dstTeam: (() => {
      const m = new Map();
      for (const it of list || []) {
        const pos = String(it && it.pos || "").toUpperCase();
        if (pos !== "DST" && pos !== "DEF" && pos !== "D/ST") continue;
        const t = normTeam(it.team);
        if (t && !m.has(t)) m.set(t, it);
      }
      return m;
    })(),
  };
}

export const NFL_TEAMS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET",
  "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA", "MIN", "NE",
  "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
];
