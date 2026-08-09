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
  for (const [via, keyFn, needTeam] of [
    ["exact", normName, false],
    ["loose", looseKey, false],
    ["initial", initialKey, true],
  ]) {
    const hit = idx[via] && idx[via].get(`${keyFn(name)}|${pos || ""}`);
    if (hit) {
      if (needTeam && team && hit.team && hit.team !== team) continue;
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
  };
}

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
export const NFL_TEAMS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET",
  "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA", "MIN", "NE",
  "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
];
