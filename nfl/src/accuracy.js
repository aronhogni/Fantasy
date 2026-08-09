/* ============================================================
   accuracy.js — HREIN maeling a thvi hver hafdi rett fyrir ser.
   Ekkert React, engin netkoll. Profin keyra thetta beint.

   SPURNINGIN SEM NOTANDINN SPURDI var "hverjum er haegt ad treysta
   og hver er klarastur i spa". Thad er MAELANLEG spurning og hun er
   maeld hér — hun er ekki svaraeð med thvi ad vitna i thann sem er
   fraegastur eda thann sem FantasyPros setur efst.

   FJORIR MAELIKVARDAR, OG THEIR ERU EKKI SAMMALA. Thad er ekki galli
   heldur nidurstadan sjalf:

   1. SPEARMAN (rho)       — radadi hann ollum rett i heild?
   2. TOPP-50 MAE          — hversu langt fra ser hann i fyrstu
                             fimm umferdunum, thar sem draftid raest?
   3. HITTNI a stodu       — af topp-24 RB hans, hve margir enduðu
                             i topp-24 RB?
   4. DRAFT-HERMUN         — ef thu hefdir draftad EFTIR HANS BORDI
                             i 12-lida snak, hve morg stig hefdi lidid
                             thitt skorad i raun?

   MAELIKVARDI 4 ER SA EINI SEM MAELIR AKVORDUNINA. Hinir thrir maela
   fylgni, og laerdomurinn ur FPL-verkefninu (kafli 6o) er skyr:
   **haerri fylgni er EKKI sama og betri akvordun.** Bord sem er
   frabaert a leikmonnum 150–300 vinnur a Spearman en breytir engu
   um lidid thitt, thvi thu draftar tha aldrei. Thess vegna er
   hermunin adalmaelikvardinn og hinir eru birtir vid hlidina.

   VARNAGLI SEM MA ALDREI FALLA UT: thetta er EITT TIMABIL (2025).
   Eitt timabil er ~200 leikmenn og haváðinn er STOR. Rodun
   serfraedinga eftir einu ari er ad staerstum hluta heppni. Thess
   vegna skilar `rankExperts` LIKA `noise` — dreifingu utkomunnar
   yfir draft-saeti — og appid VERDUR ad birta hana. Tafla an
   vikmarka segir "thessi er bestur" thegar gognin segja "thessi var
   heppnari".
   ============================================================ */

/* ---------- fylgni og villa ---------- */

/** Spearman rho a pordum { pred, actual }. Jafntefli fa medalrod. */
export function spearman(pairs) {
  const n = pairs.length;
  if (n < 3) return null;
  const rp = ranksOf(pairs.map((p) => p.pred));
  const ra = ranksOf(pairs.map((p) => p.actual));
  const mp = mean(rp), ma = mean(ra);
  let num = 0, dp = 0, da = 0;
  for (let i = 0; i < n; i++) {
    const a = rp[i] - mp, b = ra[i] - ma;
    num += a * b; dp += a * a; da += b * b;
  }
  return dp && da ? num / Math.sqrt(dp * da) : null;
}

function ranksOf(xs) {
  const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(xs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k][1]] = r;
    i = j + 1;
  }
  return out;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/**
 * Medal-rodarvilla a EFSTU N. Thetta er thar sem draftid raest:
 * ad vera 40 saetum af i saeti 250 kostar ekkert, ad vera 40 saetum
 * af i saeti 10 kostar timabilid.
 */
export function topMae(pairs, n = 50) {
  const top = pairs.filter((p) => p.pred <= n);
  if (top.length < 5) return null;
  return mean(top.map((p) => Math.abs(p.pred - p.actual)));
}

/**
 * Hittni: af theim sem hann setti i topp-N a stodu, hve margir
 * enduðu i topp-N a theirri stodu? Skilad sem hlutfall.
 */
export function positionHitRate(pairs, pos, n) {
  const inPos = pairs.filter((p) => p.pos === pos);
  /* KREFST 1,5n I LAUGINNI, EKKI n.
     Med nakvaemlega n leikmonnum i lauginni er "topp n" ALLIR, og
     hittnin verdur 1,000 hvernig sem bordid radar theim. Su tala er
     ekki bara gagnslaus heldur VILLANDI: hun gefur fullt hus theim
     bordum sem eru GRUNNUST. Fyrsta utgafan krafdist adeins n og
     profid greip thad. */
  if (inPos.length < n * 1.5) return null;
  const predTop = new Set(
    inPos.slice().sort((a, b) => a.pred - b.pred).slice(0, n).map((p) => p.key));
  const actTop = new Set(
    inPos.slice().sort((a, b) => a.actual - b.actual).slice(0, n).map((p) => p.key));
  let hit = 0;
  for (const k of predTop) if (actTop.has(k)) hit++;
  return hit / n;
}

/* ---------- draft-hermunin ---------- */

/**
 * Sjalfgefid snid: 12 lid, snakk, byrjunarlid QB/RB/RB/WR/WR/WR/TE/FLEX.
 * Thetta er algengasta uppsetningin og er valid THVI hun er algengust,
 * ekki thvi hun henti einhverju likani.
 */
export const DEFAULT_LEAGUE = {
  teams: 12,
  rounds: 14,
  starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 },
  flexPos: ["RB", "WR", "TE"],
  /**
   * STODU-THAK SEM GILDIR UM ALLA, LIKA MOTHERJANA.
   *
   * FYRSTA UTGAFAN LAGDI THAK ADEINS A OKKUR og let motherjana
   * drafta hreina rod. Su hermun var ROG og hun var TRUVERDUG:
   * samsteypan sjalf lenti i 124. saeti af 208 og TAPADI fyrir
   * bordi sem var HANDAHOF innan threpa (1.701 a moti 1.855).
   *
   * ORSOKIN sast um leid og hopurinn var prentadur: samsteypu-lidid
   * draftadi **Josh Allen i 2. umferd, Burrow i 4. og Fields i 9.**
   * — thrja leikstjornendur thar sem adeins einn er i byrjunarlidi.
   * Enginn draftar svona. Med thakid adeins a okkur var verid ad
   * maela "gefur bordid jafnt snid undir barnalegri best-available
   * reglu", ekki "hafdi hann rett fyrir ser".
   *
   * NU DRAFTA ALLIR EFTIR SOMU REGLUM. Thar med er samsteypu-lidid
   * ORDID markadurinn sjalfur og er retta nulllinan: bord sem slaer
   * hana gerdi thad med thvi ad vera NAKVAEMARA, ekki med thvi ad
   * vera odruvisi.
   */
  maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
  /* Spyrnumenn og varnir eru UTAN hermunarinnar. Their eru teknir i
     sidustu umferdunum, hafa nanast enga dreifingu milli borda og
     baeta adeins vid havada. Ad hafa tha med vaeri ad thynna maelinguna
     med thvi sem enginn draftar eftir. */
  excludePos: ["K", "DST"],
};

/**
 * Hermir eitt draft og skilar RAUNVERULEGUM stigum byrjunarlidsins.
 *
 * `board`     Map(key -> rank)  bordid sem VID erum ad maela
 * `fieldBoard` Map(key -> rank) bordid sem HINIR draftar eftir
 *              (samsteypa/ADP — their eiga ad vera "markadurinn")
 * `actual`    Map(key -> { pos, pts })  thad sem raunverulega gerdist
 * `slot`      1..teams  hvar vid sitjum i fyrstu umferd
 *
 * HVERS VEGNA HINIR DRAFTA EFTIR SAMSTEYPUNNI: ef allir draftudu
 * eftir sama bordi og vid vaeri ekkert eftir ad maela — utkoman vaeri
 * bara "hver var efst i hans eigin rod". Med markadinn sem motherja
 * maelist thad sem raunverulega skiptir mali: hvar VIKUR hann fra
 * markadinum, og BORGADI su vik sig?
 */
/**
 * `rival` (valfrjalst) — { slot, board }: annad lid i SOMU deild sem
 * draftar eftir ODRU bordi. Skilar `rivalPoints`.
 *
 * HVERS VEGNA THETTA ER TIL: ad bera saman tvo ADSKILIN droft laetur
 * ars-havadann (sd ~150 stig milli timabila) drekkja mun sem er ~75.
 * Med badum bordum I SOMU DEILD dregst arsahrifin UT — bædi lidin
 * nutu goda arsins eda lidu fyrir thad slaema — og eftir stendur
 * adeins munurinn a bordunum. Thad er lika raunsaerra: i thinni deild
 * ertu ad keppa vid folkid i herberginu, ekki vid medaltal aranna.
 */
export function simulateDraft({ board, fieldBoard, actual, slot,
                                league = DEFAULT_LEAGUE, plan = null,
                                rival = null }) {
  const { teams, rounds } = league;
  const taken = new Set();
  /* Hvert lid ber sina eigin stodutalningu — LIKA motherjarnir.
     Thad er breytingin sem gerir samsteypuna ad rettri nulllinu. */
  const counts = Array.from({ length: teams + 1 }, () => ({}));
  const rosters = Array.from({ length: teams + 1 }, () => []);

  // Snakk-rodin: umferd 1 er 1..N, umferd 2 er N..1, o.s.frv.
  for (let r = 0; r < rounds; r++) {
    const order = r % 2 === 0 ? range(1, teams) : range(1, teams).reverse();
    for (const t of order) {
      const mine = t === slot;
      /* BORD MA VERA FALL, EKKI ADEINS KORT.
         Kyrrstaett bord er rodun sem er akvedin fyrir draftid. Sumar
         hugmyndir eru THAD EKKI — kvikt VBD endurreiknar varamanns-
         threpid ur THEIM SEM ERU EFTIR i hvert sinn, svo rodin breytist
         eftir thvi hvernig herbergid hagar ser. Fall faer `taken` og
         stodutalningu lidsins og skilar kortinu sem gildir NUNA.
         Kyrrstaedu kortin virka obreytt. */
      const resolve = (b) => (typeof b === "function" ? b(taken, counts[t], r) : b);
      const use = resolve(mine ? board
        : (rival && t === rival.slot ? rival.board : fieldBoard));
      /* `plan` er STODU-AAETLUN fyrir okkar lid: hvada stodur ma taka
         i hverri umferd. Notad af `strategy-lab.mjs` til ad maela
         "RB fyrst eda WR fyrst". Motherjarnir fylgja ALDREI aaetlun —
         their drafta eftir markadinum, sem er thad sem raunverulega
         gerist i herberginu. */
      const allow = mine && plan ? plan[r] : null;
      let pick = bestAvailable(use, taken, actual, league, counts[t], allow);
      /* Aaetlun sem ekki er haegt ad uppfylla (staðan uppurin eda
         thak nad) MA EKKI stodva valid — tha vaeri verid ad maela
         "hvad gerist ef thu sleppir vali", sem enginn gerir. */
      if (!pick && allow) pick = bestAvailable(use, taken, actual, league, counts[t], null);
      if (!pick) continue;
      taken.add(pick);
      rosters[t].push(pick);
      const p = actual.get(pick);
      if (p) counts[t][p.pos] = (counts[t][p.pos] || 0) + 1;
    }
  }
  const myRoster = rosters[slot];
  return {
    points: startersPoints(myRoster, actual, league),
    roster: myRoster,
    rivalPoints: rival ? startersPoints(rosters[rival.slot], actual, league) : null,
    rivalRoster: rival ? rosters[rival.slot] : null,
  };
}

function range(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; }

/** Besti lausi leikmadur sem lidid MA enn taka. */
function bestAvailable(board, taken, actual, league, posCount, allow = null) {
  for (const [key] of board) {                 // bordid er thegar radad
    if (taken.has(key)) continue;
    const p = actual.get(key);
    const pos = p ? p.pos : null;
    if (pos && league.excludePos && league.excludePos.includes(pos)) continue;
    if (allow && (!pos || !allow.includes(pos))) continue;
    const max = pos ? league.maxPos[pos] : null;
    if (max != null && (posCount[pos] || 0) >= max) continue;
    return key;
  }
  return null;
}

/**
 * Stig byrjunarlidsins ur hopnum — GRADUG BEST-BALL rodun.
 * Athugid: thetta er TIMABILS-summa, ekki vikuleg akvordun. Ad herma
 * vikulegar start/sit-akvardanir baetti vid hávaða sem maelir
 * lineup-hegdun frekar en draftid, og thad er onnur spurning.
 */
export function startersPoints(roster, actual, league = DEFAULT_LEAGUE) {
  const byPos = {};
  for (const k of roster) {
    const p = actual.get(k);
    if (!p) continue;
    (byPos[p.pos] = byPos[p.pos] || []).push(p.pts);
  }
  for (const k of Object.keys(byPos)) byPos[k].sort((a, b) => b - a);

  let total = 0;
  const used = {};
  for (const [pos, n] of Object.entries(league.starters)) {
    if (pos === "FLEX") continue;
    const list = byPos[pos] || [];
    for (let i = 0; i < n; i++) { total += list[i] || 0; }
    used[pos] = n;
  }
  // FLEX: besti afgangur ur leyfdum stodum
  const flexN = league.starters.FLEX || 0;
  const pool = [];
  for (const pos of league.flexPos) {
    const list = byPos[pos] || [];
    for (let i = used[pos] || 0; i < list.length; i++) pool.push(list[i]);
  }
  pool.sort((a, b) => b - a);
  for (let i = 0; i < flexN; i++) total += pool[i] || 0;
  return Math.round(total * 10) / 10;
}

/**
 * Keyrir hermunina fra OLLUM draft-saetum og skilar medaltali + dreifingu.
 * Ad herma eitt saeti vaeri ad maela heppni: saeti 1 og saeti 12 fa
 * gerolika leikmenn og munurinn a theim er STAERRI en munurinn a
 * godu og slaemu bordi.
 */
export function simulateAllSlots({ board, fieldBoard, actual,
                                   league = DEFAULT_LEAGUE, plan = null }) {
  const pts = [];
  for (let slot = 1; slot <= league.teams; slot++) {
    pts.push(simulateDraft({ board, fieldBoard, actual, slot, league, plan }).points);
  }
  const m = mean(pts);
  const sd = Math.sqrt(mean(pts.map((p) => (p - m) ** 2)));
  return {
    mean: Math.round(m * 10) / 10,
    sd: Math.round(sd * 10) / 10,
    min: Math.round(Math.min(...pts) * 10) / 10,
    max: Math.round(Math.max(...pts) * 10) / 10,
    bySlot: pts,
  };
}

/* ---------- heildarmatid ---------- */

/**
 * Metur EITT bord gegn raunveruleikanum og skilar ollum fjorum
 * maelikvordunum.
 *
 * `board`  Map(key -> rank)
 * `actual` Map(key -> { pos, pts, posRank, overallRank })
 */
export function scoreBoard({ board, fieldBoard, actual, league = DEFAULT_LEAGUE }) {
  const pairs = [];
  for (const [key, rank] of board) {
    const a = actual.get(key);
    if (!a || a.overallRank == null) continue;
    pairs.push({ key, pred: rank, actual: a.overallRank, pos: a.pos });
  }
  if (pairs.length < 20) return null;

  const posPairs = (pos) => {
    const inPos = pairs.filter((p) => p.pos === pos);
    return inPos.map((p) => ({ ...p, actual: actual.get(p.key).posRank }));
  };

  const sim = fieldBoard
    ? simulateAllSlots({ board, fieldBoard, actual, league })
    : null;

  return {
    n: pairs.length,
    rho: round3(spearman(pairs)),
    mae50: round2(topMae(pairs, 50)),
    mae100: round2(topMae(pairs, 100)),
    hit: {
      RB: round3(positionHitRate(posPairs("RB"), "RB", 24)),
      WR: round3(positionHitRate(posPairs("WR"), "WR", 36)),
      TE: round3(positionHitRate(posPairs("TE"), "TE", 12)),
      QB: round3(positionHitRate(posPairs("QB"), "QB", 12)),
    },
    draft: sim,
  };
}

const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const round3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);

/**
 * Radar mörgum bordum og baetir vid VIKMORKUM sem eru raunveruleg.
 * `sd` ur hermuninni yfir draft-saeti er dreifing UTKOMUNNAR, ekki
 * ovissa um medaltalid — vikmorkin eru sd/sqrt(saeti).
 *
 * SKILAR LIKA `gap`: hversu langt fra BESTA bordi, i stigum. Thad er
 * talan sem svarar "skiptir thetta mali?" Ef bilid milli besta og
 * versta bords er minna en vikmorkin er svarid NEI, og thad a ad
 * standa i vidmotinu jafn skyrt og rodin sjalf.
 */
export function rankExperts(scored) {
  const withSim = scored.filter((s) => s.draft && s.draft.mean != null);
  if (!withSim.length) return scored;
  const best = Math.max(...withSim.map((s) => s.draft.mean));
  return scored
    .map((s) => ({
      ...s,
      gap: s.draft ? round2(s.draft.mean - best) : null,
      se: s.draft ? round2(s.draft.sd / Math.sqrt(s.draft.bySlot.length)) : null,
    }))
    .sort((a, b) => (b.draft ? b.draft.mean : -1e9) - (a.draft ? a.draft.mean : -1e9));
}
