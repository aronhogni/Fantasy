/* pros.js — "Best of the best": hrein rokfraedi fyrir sérfraedinga-hopinn.
   ENGIN React-hae hér. `scripts/fetch-pros.mjs` byggir toluna, `BestOfBest.jsx`
   birtir hana og `tests/pros.mjs` prófar NAKVAEMLEGA sama kóda.

   ---------------------------------------------------------------------------
   HVER ER I HOPNUM OG HVERS VEGNA — allt maelt 9.8.2026 a 77.000+ raunverulegum
   FPL-ferlum (sja `scripts/scan-elite.mjs`). Ekki breyta thessum tolum an
   maelingar; hver theirra felldi einfaldari kost.

   1. VALID ER `recencyScore` — vegid medaltal a log10(percentíl) med
      HELMINGUNARTIMA 3 TIMABIL. Maelt ut fyrir urtak (fit a helmingi
      stjornenda, metid a hinum, n=30.795):

         recency eitt og sér .................. r = 0,540
         + breytileiki (jofnudur) ............. r = 0,542
         + leitni (batnandi/versnandi) ........ r = 0,539
         + fjoldi timabila .................... r = 0,539
         ALLT samanlagt ....................... r = 0,542
         FLATT medaltal ferilsins ............. r = 0,317   <- augljosi kosturinn, VERSTUR

      Vidbotarthaettirnir gefa ±0,002 = suð. "Verdlaunum jafna menn" og
      "verdlaunum batnandi menn" hljoma badir rett og MAELAST BADIR SEM NULL.

   1b. HELMINGUNARTIMINN VAR 1,5 OG THAD VAR MAELT A RONGU MARKMIDI.
      Fyrsta valid hamarkadi FYLGNI (r) yfir allan hopinn — 44.000 stjornendur
      — og r toppar vid h=1,75. En vid notum ekki fylgni: vid tokum TOPP 1.000.
      Thegar maelt er a THVI sem er notad heldur batinn afram langt fram yfir
      1,75. Maelt a FJORUM ohadum timaskiptingum (train <= 2019/20, 2020/21,
      2021/22, 2022/23), medaltal a framtidar-frammistodu hopsins:

        h=1,0 .... 1,113%      h=2,0 .... 0,951%      h=3,0 .... 0,929%
        h=1,25 ... 1,046%      h=2,5 .... 0,935%      h=4,0 .... 0,928%
        h=1,5 .... 0,991%                             (r toppar vid 1,75)

      Batinn helst vid HVERJA hopsstaerd (N=100: 0,881% -> 0,765%; N=250,
      500, 1.000, 2.000 oll eins) OG med badum gildis-umbreytingum
      (log-persentil og log-rodun). Delta a fjorum skiptingum er ALLTAF
      negatift: -0,047, -0,009, -0,025, -0,028 (log10), medaltal -6,2% i
      persentili. P(h=3 betra) per skipting: 99%, 69%, 88%, 90%.

      HVERS VEGNA VIKUR r FRA HOPSGAEDUM: r maelir rodun yfir allan hopinn og
      radast af MIDJUNNI; hopurinn er hins vegar YTSTI TAGLID. Long minni
      hjalpar ad greina VARANLEGA yfirburdi i taglinu (madur med eitt
      heppnis-timabil kemst ekki inn), en stutt minni radar midjunni betur.
      Markmidid er taglid.

      AUKAVINNINGUR: stodugleiki. Arleg endurbygging heldur 46% af hopnum
      vid h=3 en adeins 30% vid h=1,5. Hopur sem endurnyjar 70% a ari er
      sjalfur merki um ad valid se ad elta heppni.

   2. UTLAGAR ERU EKKI KLIPPTIR. A flotu medaltali borgar sig ad henda versta
      timabilinu (0,214 -> 0,224) — en med recency-voginni LAEKKAR thad
      (0,410 -> 0,401). Gamalt slaemt timabil er thegar vegid nidur; NYTT
      slaemt timabil er raunveruleg upplysing sem ma ekki henda.

   3. HOPURINN ER 1.000 MANNS, EKKI 5 EDA 50. Maeld framtidar-frammistada
      thess sem valinn er efstur:

         N=1 ...... 0,919%      N=100 .... 0,700%   <- BESTA maelda faernin
         N=3 ...... 1,088%      N=1000 ... 0,907%   (SE 1,6 prosentustig)
         N=5 ...... 0,854%      N=8000 ... 1,234%
         N=10 ..... 0,987%

      Topp-3 eftir fyrri ferli standa sig VERR en medaltal topp-100:
      efsti hluti hvers lista er ad hluta heppni (afturhvarf til medaltals).
      Og med 10 manns er 60/40 skipting ekki adgreinanleg fra hlutkesti
      (SE ±16 prosentustig). Vid 1.000 er SE 1,6 — akvardanir snuast um
      5-10 stiga mun, svo thad dugar rikulega. SNR-ferillinn minn heldur
      afram ad hakka upp ad N=8000 en thad er MITT eigid markfall og thad
      kaupir nakvaemni sem enginn tharf fyrir 36% af raunfaerni hopsins.

   4. JOFN VOG. Ad hygla theim allra bestu var maelt:
         alfa=0 (jofn) .... SNR 13,279      alfa=1,0 ... SNR 12,032
         alfa=0,25 ........ SNR 13,363      alfa=2,0 ... SNR  5,735
      Besta gildid (0,25) gefur +0,6% = ekkert, og hvert skref tharumfram
      eydileggur virkt urtak (1000 -> 146 vid alfa=2). Innan hopsins er
      faernimunur litill; thad sem thu kaupir er URTAKSSTAERD.

   5. HOPURINN ELDIST — ENDURBYGGDU HANN ARLEGA. Valinn a gognum t.o.m.
      2021/22 helt hann forskoti en tapadi 29% af thvi a fjorum arum
      (0,467 -> 0,483 -> 0,400 -> 0,331). Ein skonnun a ari kostar ekkert.

   ---------------------------------------------------------------------------
   HVAD THETTA ER **EKKI**: engin tala hedan fer i `rankScore`, `expPointsFor`
   eda FFDR. Hopurinn er MAELING a hegdun, ekki spa. Adur en nokkud af thessu
   fer inn i likanid tharf ad keyra somu vidbotarprofun og gerd var a
   almenna markadnum: baetir thetta einhverju OFAN A `ep_next`? Fyrir
   almenna hopinn var svarid NEI (r = -0,0005, og -0,111 medal theirra sem
   spiludu i raun). Sja `docs/MAELINGAR.md`.                                */

/* Fjoldi sem telst nothaef thekja. Undir thessu er hlutfall ekki birt sem
   hlutfall — sja `coverageOk`. THEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b).*/
export const MIN_PANEL_RESPONSE = 0.90;

export const PANEL_SIZE = 1000;
export const HALF_LIFE = 3.0;      // timabil; sja "HELMINGUNARTIMINN" hér fyrir nedan
export const MIN_SEASONS = 3;      // maelt: krafan skiptir nanast engu (0,899% vs 0,894%)

/* ---------------------------------------------------------------------------
   FJOLDI THATTTAKENDA PER TIMABIL. FPL birtir thetta hvergi — thad er
   MAELT ut ur `rank_percentage` sem fylgir hverri fortidar-umferd.

   ADFERDIN SKIPTIR MALI. Fyrsta atlagan tok `rank / (rank_percentage/100)`
   og medaltal — en `rank_percentage` er RUNNAD ad einum markverdum staf
   ("2", "0.2"), svo eitt gildi gefur allt ad 25% skekkju. Onnur atlagan
   skar bilin saman (interval intersection) og gaf TOM bil: forsendan um
   nammundun var rong.
   Thridja atlagan er su sem stendur: RISTLEIT a T fyrir hvert timabil,
   valid thad T sem endurgerir flest birt gildi. `round` vann yfir `floor`
   og `ceil`, og hittnin er 96-100% (t.d. 2025/26: 257 af 257 pörum).
   Skekkjan i fyrri utgafu var allt ad 11% (2008/09) og 5,7% (2023/24).

   OG THAD BREYTTI ENGU: allar nidurstodur voru endurkeyrdar a badum
   settum og reliability-tolurnar voru EINS upp a thrja aukastafi.
   Talan er samt leidrett — rett tala sem skiptir ekki mali er betri en
   rong tala sem gaeti farid ad skipta mali.                              */
export const SEASON_SIZE = {
  "2006/07": 1261853,  "2007/08": 1664384,  "2008/09": 1937353,  "2009/10": 2322811,
  "2010/11": 2457498,  "2011/12": 2778160,  "2012/13": 2607067,  "2013/14": 3208308,
  "2014/15": 3480338,  "2015/16": 3721026,  "2016/17": 4477303,  "2017/18": 5905733,
  "2018/19": 6292902,  "2019/20": 7592546,  "2020/21": 8220569,  "2021/22": 9111055,
  "2022/23": 11404197, "2023/24": 10810768, "2024/25": 11417023, "2025/26": 13087139,
};

/* Persentíl timabils. `null` fyrir timabil sem vid hofum enga staerd fyrir —
   thau eru SLEPPT, ekki giskud.                                            */
export function seasonPct(season, rank) {
  const t = SEASON_SIZE[season];
  if (!t || !Number.isFinite(rank) || rank <= 0) return null;
  return 100 * rank / t;
}

/* ---------------------------------------------------------------------------
   VALREGLAN SJALF. `past` er `history.past` beint ur FPL.

   Vegid medaltal a log10(persentíli) med helmingunartima HALF_LIFE. Log-
   kvardinn er notadur svo munurinn milli 0,1% og 0,2% vegi jafn thungt og
   milli 10% og 20% — annars raedur eitt slaemt timabil ollu.

   HVERS VEGNA EKKI FLATT MEDALTAL: flatt gaf r = 0,317 gegn framtidinni,
   thetta gefur 0,540 (n=30.795, fit a helmingi, metid a hinum).
   HVERS VEGNA EKKI KLIPPA UTLAGA: a flotu medaltali borgar thad sig
   (0,214 -> 0,224) en HER LAEKKAR thad (0,410 -> 0,401) — gamalt slaemt
   timabil er thegar vegid nidur og nytt slaemt timabil er upplysing.     */
export function recencyScore(past, halfLife = HALF_LIFE) {
  const rows = (past || [])
    .map(p => ({ s: p.season_name, rank: p.rank, pct: seasonPct(p.season_name, p.rank) }))
    .filter(r => r.pct != null)
    .sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : 0));
  if (rows.length < MIN_SEASONS) return null;
  let num = 0, den = 0;
  rows.forEach((r, i) => {
    const w = Math.pow(0.5, (rows.length - 1 - i) / halfLife);
    num += w * Math.log10(Math.max(r.pct, 0.005));
    den += w;
  });
  const t1 = rows.filter(r => r.pct <= 1).length;
  return {
    /* birt aftur a prosentu-kvarda: 0,0132 = endar ad jafnadi i efstu 0,0132% */
    score: Math.pow(10, num / den),
    seasons: rows.length,
    best: Math.min(...rows.map(r => r.rank)),
    t1,
  };
}

/* Fjarlaegd fra fjoldatolu yfir i hlutfall. `n` er their sem SVORUDU, ekki
   staerd hopsins — annars laekkar hvert hlutfall thegar eitt kall mistekst. */
const pct = (c, n) => (n > 0 ? c / n : null);

/* ---------------------------------------------------------------------------
   AGGREGATE — ein umferd, hrar svor -> talnaskra.

   `entries`: fylki af { picks, transfers } thar sem
     picks     = svar fra entry/{id}/event/{gw}/picks/
     transfers = SIADAR faerslur thessarar umferdar (event === gw)
   Skilar SPARSE kortum (adeins their sem einhver a) svo skrain haldist litil.

   EIN ROD PER LEIKMANN, EKKI THRJAR. Sama regla og bsd_shots: geymum talningu,
   ekki 1.000 lid — 1.000 hopar x 15 leikmenn per umferd vaeri ~20 MB a
   timabili og THRJAR afritanir af somu tolu geta rekid i sundur.           */
export function aggregate(entries) {
  const own = {}, capt = {}, vice = {}, tin = {}, tout = {}, chips = {};
  let n = 0, tr = 0, hits = 0, hitN = 0, val = 0, bank = 0, valN = 0;
  const ranks = [];

  for (const e of entries || []) {
    const p = e && e.picks;
    if (!p || !Array.isArray(p.picks) || !p.picks.length) continue;   // ONYTT SVAR TELUR EKKI MED
    n++;
    for (const pk of p.picks) {
      const id = pk && pk.element;
      if (id == null) continue;
      own[id] = (own[id] || 0) + 1;
      if (pk.is_captain) capt[id] = (capt[id] || 0) + 1;
      if (pk.is_vice_captain) vice[id] = (vice[id] || 0) + 1;
    }
    if (p.active_chip) chips[p.active_chip] = (chips[p.active_chip] || 0) + 1;

    const h = p.entry_history || {};
    if (Number.isFinite(h.event_transfers)) { tr += h.event_transfers; }
    if (Number.isFinite(h.event_transfers_cost)) {
      hits += h.event_transfers_cost; if (h.event_transfers_cost > 0) hitN++;
    }
    if (Number.isFinite(h.value)) { val += h.value; valN++; }
    if (Number.isFinite(h.bank)) bank += h.bank;
    if (Number.isFinite(h.overall_rank) && h.overall_rank > 0) ranks.push(h.overall_rank);

    for (const t of e.transfers || []) {
      if (t.element_in != null) tin[t.element_in] = (tin[t.element_in] || 0) + 1;
      if (t.element_out != null) tout[t.element_out] = (tout[t.element_out] || 0) + 1;
    }
  }

  ranks.sort((a, b) => a - b);
  return {
    n, own, capt, vice, in: tin, out: tout, chips,
    /* Medaltol. `null` thegar ENGINN svaradi — 0 vaeri maeld nulltala og
       "0 skipti ad medaltali" er allt onnur fullyrding en "vitum ekki".  */
    transfers: n ? tr / n : null,
    hitCost:   n ? hits / n : null,
    hitShare:  n ? hitN / n : null,
    value:     valN ? val / valN : null,
    bank:      valN ? bank / valN : null,
    rankMedian: ranks.length ? ranks[Math.floor(ranks.length / 2)] : null,
  };
}

/* Virkt eignarhald (EO) = eignarhald + fyrirlidaband. Fyrirlidi telur TVISVAR
   thvi hann skorar tvofalt; hratt eignarhald vanmetur mann sem er mikid
   fyrirlidi. Thetta er staerdin sem raedur RODUNARAHRIFUM, ekki `own`.     */
export function eo(agg, id) {
  if (!agg || !agg.n) return null;
  const o = agg.own[id] || 0, c = agg.capt[id] || 0;
  return (o + c) / agg.n;
}

/* Er thekjan nog til ad birta hlutfoll? */
export function coverageOk(agg, panelSize) {
  if (!agg || !panelSize) return false;
  return agg.n / panelSize >= MIN_PANEL_RESPONSE;
}

/* ---------------------------------------------------------------------------
   MOVERS — hverja voru their ad KAUPA og SELJA. Thetta er thad sem notandinn
   vill sja um leid og umferdin opnar.

   Rodun er eftir FJOLDA, ekki hlutfalli af eigendum: "150 af 1.000 keyptu
   hann" er frettin, ekki "3 af 4 sem attu hann seldu". `net` fylgir med thvi
   madur sem 90 kaupa og 80 selja er ALLT ONNUR saga en madur sem 90 kaupa og
   enginn selur — nettotalan ein feldi thann mun.                            */
export function movers(agg, kind, limit = 20) {
  if (!agg || !agg.n) return [];
  const src = kind === "out" ? agg.out : agg.in;
  const other = kind === "out" ? agg.in : agg.out;
  return Object.keys(src || {})
    .map(id => ({
      id: +id,
      count: src[id],
      share: pct(src[id], agg.n),
      opposite: other[id] || 0,
      net: src[id] - (other[id] || 0),
    }))
    .sort((a, b) => b.count - a.count || a.id - b.id)
    .slice(0, limit);
}

/* Munurinn a hopnum og fjoldanum. `crowdPct` er `selected_by_percent` ur FPL
   (0-100). Skilar `null` thegar almenna talan vantar — NULL ER EKKI NULL.

   VARUD: thetta er MAELING a mun, ekki spa. Almenni markadurinn maeldist
   virdislaus ofan a `ep_next` (r = -0,0005); hvort THESSI hopur se odruvisi
   er OSVARAD thar til ~10 umferdir eru komnar.                             */
export function differential(agg, id, crowdPct) {
  const e = eo(agg, id);
  if (e == null) return null;
  if (crowdPct == null || !Number.isFinite(+crowdPct)) return null;
  return e * 100 - +crowdPct;
}

/* Chip-dagatalid: hlutfall hopsins sem hefur spilad hvert chip i hverri
   umferd. THETTA er thad sem kennir chip-timasetningu, og thad er lika
   sterkasta rokid fyrir stórum hopi: med 10 manns er ein Bench Boost 10%.  */
export function chipTimeline(byGw, chipNames) {
  const gws = Object.keys(byGw || {}).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  return gws.map(gw => {
    const a = byGw[gw] || {};
    const row = { gw, n: a.n || 0 };
    for (const c of chipNames) row[c] = a.n ? (a.chips?.[c] || 0) / a.n : null;
    return row;
  });
}

/* Hversu oruggt er hlutfall ur `n` svorum? Tvofold stadalvilla (~95%).
   Birtum thetta vid hlid hverrar prosentu svo 62% ur 12 monnum liti EKKI
   eins ut og 62% ur 1.000.                                                 */
export function marginPct(p, n) {
  if (!n || p == null || !Number.isFinite(p)) return null;
  /* KLEMMT I [0,1]. Adur skilaði thetta NaN fyrir p>1 — og p>1 er NAANLEGT:
     EO er (eignarhald + fyrirlidi)/n og verdur 2,0 thegar allir eiga OG
     allir fyrirlida. NaN a skja er verra en varfaerin tala.               */
  const q = Math.min(1, Math.max(0, p));
  return 2 * Math.sqrt(q * (1 - q) / n) * 100;
}
