/* ============================================================
   flex-occupancy.mjs — HVE OFT ENDAR HVER STADA I FLEX?

   THETTA ER MAELINGIN SEM SETTI `FLEX_SPLIT` (`src/model.js`). Hun bjo
   inni i `calibrate.mjs` sem `measureFlexSplit(weeks)` og var thar
   HARDKODUD a EINA logun: 12 lid, RB2/WR3/TE1, EITT flex, FULL PPR
   (`startersUsed = { RB: 24, WR: 36, TE: 12 }`, `slice(0, 12)`).

   HVERS VEGNA HUN VAR DREGIN UT HINGAD (18.8.2026):
   hvorug deild notandans er su logun — Patriots eru 10 lid, WR2 og
   TVO flex i fullri PPR; Sofahetjur eru 12 lid, WR2, TVO flex i
   HALF-PPR. Talan 0,193 var thvi maeld i deild sem hann spilar ekki i,
   og hvorki per timabili ne med vikmorkum. Hvorttveggja er MAELANLEGT
   med somu adferd og hvorugt var maelt.

   Hun er DREGIN UT, ekki AFRITUD: `calibrate.mjs` flytur hana inn og
   kallar hana med gomlu sjalfgefnu gildunum, svo bokada talan getur
   ekki rekid fra thessari utfaerslu. Tvo afrit af somu talningu vaeri
   sama aett af villu og `buildTeamMetrics` i FPL-verkefninu.

   ============================================================
   OG HVAD HUN MAELIR — LESID THETTA ADUR EN TALAN ER NOTUD
   ============================================================
   Hun telur EFTIR A: innan hverrar viku er rodad eftir RAUNSTIGUM
   theirrar viku, their sem eru utan fastra saeta teknir, og TOPP-N
   theirra taldir. Hun svarar thvi "hvada stodu hafdi sa sem HEFDI
   fyllt flex-saetid hjá alvitrum stjornanda", ekki "hvada stodu setti
   raunverulegur stjornandi i flexid" og EKKI "hvada stada gefur mest
   VIRDI YFIR VARAMANNI".

   Thad er ekki hártogun heldur kjarni malsins: `replacementRanks`
   notar toluna sem SAETI a varamanns-threpi, sem er akvordunar-tala.
   Tidni og akvordun er ekki sami hlutur, og eina leidin til ad vita
   hvort tidnin se retta akvordunin er ad maela UTKOMUNA — sem
   `vbdbase-lab --tesweep` og `h2h-lab --tesweep` gera.
   ============================================================ */

/** Sjalfgefna lognin — NAKVAEMLEGA su sem `calibrate.mjs` notadi. */
export const LEGACY_SHAPE = {
  teams: 12, starters: { RB: 2, WR: 3, TE: 1, FLEX: 1 },
  flexPos: ["RB", "WR", "TE"], scoring: "ppr",
};

/**
 * `weeks` er `data/weekly/*.json` (flatt fylki af leikmanna-vikum med
 * `{ id, pos, season, week, ppr, half, std }`).
 *
 * Skilar `{ shares, counts, perSeason, flexSlots, startersUsed, n }`.
 * `perSeason[year].shares` er sama tala per timabili — thad er
 * vikmorkin sem vantadi.
 */
export function flexOccupancy(weeks, shape = LEGACY_SHAPE) {
  const teams = shape.teams;
  const st = shape.starters || {};
  const flexPos = shape.flexPos || ["RB", "WR", "TE"];
  const field = shape.scoring === "half" ? "half"
              : shape.scoring === "standard" || shape.scoring === "std" ? "std" : "ppr";
  const flexSlots = (st.FLEX || 0) * teams;
  const startersUsed = Object.fromEntries(flexPos.map((p) => [p, (st[p] || 0) * teams]));

  const zero = () => Object.fromEntries(flexPos.map((p) => [p, 0]));
  const counts = zero();
  const perSeasonCounts = new Map();
  const bySW = new Map();
  for (const r of weeks) {
    if (!flexPos.includes(r.pos)) continue;
    const k = `${r.season}|${r.week}`;
    let a = bySW.get(k);
    if (!a) { a = []; bySW.set(k, a); }
    a.push(r);
  }
  for (const [k, list] of bySW) {
    const season = Number(k.split("|")[0]);
    const rank = new Map();
    for (const pos of flexPos) {
      list.filter((r) => r.pos === pos).sort((a, b) => b[field] - a[field])
        .forEach((r, i) => rank.set(r.id, { pos, i: i + 1 }));
    }
    const pool = list.filter((r) => {
      const x = rank.get(r.id);
      return x && x.i > startersUsed[x.pos];
    }).sort((a, b) => b[field] - a[field]).slice(0, flexSlots);
    if (!perSeasonCounts.has(season)) perSeasonCounts.set(season, zero());
    const ps = perSeasonCounts.get(season);
    for (const r of pool) { counts[r.pos]++; ps[r.pos]++; }
  }

  const sharesOf = (c) => {
    const tot = Object.values(c).reduce((a, x) => a + x, 0) || 1;
    return Object.fromEntries(Object.entries(c)
      .map(([p, v]) => [p, Math.round((v / tot) * 1000) / 1000]));
  };
  const perSeason = {};
  for (const [y, c] of [...perSeasonCounts].sort((a, b) => a[0] - b[0])) {
    perSeason[y] = { counts: c, shares: sharesOf(c),
                     n: Object.values(c).reduce((a, x) => a + x, 0) };
  }
  return { shares: sharesOf(counts), counts, perSeason,
           flexSlots, startersUsed, scoringField: field,
           n: Object.values(counts).reduce((a, x) => a + x, 0),
           weeksSeen: bySW.size };
}
