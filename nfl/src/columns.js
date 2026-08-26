/* ============================================================
   columns.js — EIN DALKASKRA. Taflan, dalkavalarinn, rodunin og
   profin lesa hana alla.

   SAMA REGLA OG `STAT_DEFS` I FPL-APPINU og hun er thar af reynslu:
   vilir thu taka dalk ut, eyddu honum HER og hann hverfur ur toflu,
   rodun, threskuldum og dalkavalara i einu. Tveir listar reka i
   sundur; einn getur thad ekki.

   FJOGUR SVID, OLL SKYLDA:
     key    einkvaemur lykill (og svidsheiti i leikmannaradinni)
     label  fullt heiti — dalkavalari og tooltip
     short  toflu-hausinn, <= 12 stafir
     band   spannandi hausrod ("Market", "2025", "Model" ...)
     note   HVAD TALAN ER OG HVADAN HUN KEMUR. >= 12 stafir.
            Dalkur an nota er tala sem enginn getur metid.

   `hi: false` thydir LAEGRA ER BETRA. Thad er FORSENDA, ekki skraut:
   ADP, rod og threp eru oll "laegra er betra" og hitakortid snyr
   kvardanum eftir thvi. Villandi mynd er verri en engin mynd.
   ============================================================ */

export const COLUMNS = [
  /* ---------- audkenni ---------- */
  { key: "name", label: "Player", short: "Player", band: "", note: "Player name and team.", type: "text", frozen: true },
  { key: "pos", label: "Position", short: "Pos", band: "", note: "QB/RB/WR/TE/K/DST.", type: "text" },
  { key: "team", label: "Team", short: "Team", band: "", note: "Team for the 2026 season.", type: "text" },
  { key: "bye", label: "Bye week", short: "Bye", band: "", note: "The week his team does not play. From FantasyPros.", hi: null },
  { key: "age", label: "Age", short: "Age", band: "", note: "Age, from Sleeper.", hi: false },
  { key: "exp", label: "Years experience", short: "Exp", band: "", note: "Years in the league. 0 = rookie.", hi: null },

  /* ---------- likanid ---------- */
  { key: "aRank", label: "A-Ranking", short: "A-Rank", band: "Model", hi: false,
    /* ============================================================
       TALAN VAR RETT EN HARNESSID VAR OSAGT — LAGAD 17.8.2026
       ============================================================
       Hér stod "slaer ADP um +234 stig og vinnur OLL FIMM arin", og talan
       er rett — EN hun var maeld i `arank-lab.mjs` a TEAMS=12, ROUNDS=14,
       byrjunarlidi {QB1,RB2,WR3,TE1,FLEX1}, sem gefur varamanns-threp
       **WR42**. Hvorug deild notandans er thad: hans eru WR29 og WR35.

       ÞETTA ER REPO-INS EIGIN REGLA BROTIN INNI I TOOLTIP-I: "TALA AN
       HARNESS ER OSAMANBURDARHAEF" (notan vid `aRankVsAdp` i `advice.js`).
       Og logunar-tolurnar eru TIL — `HALF_LAB` i `rulebasis.js` ber
       10-2flex ppr = +186,1 og 12-2flex half = +147,4 — og eru birtar i
       draft-flipanum gegnum `edgeSentence`, sem les RETTU tofluna fyrir
       thina deild.

       Lausnin er ekki ad skipta einni logun ut fyrir adra i tooltip-i sem
       er lesid i ollum deildum, heldur ad NEFNA harnessid og benda a
       toluna sem er logunar-bundin. Vordur: `sleeper.mjs` (d2) ver ad
       logunar-talan a skjanum se su retta.                            */
    note: "Our ranking: Sleeper's projection converted into value over replacement for your league. MEASURED 2021-2025 IN A 12-TEAM LEAGUE with QB/RB2/WR3/TE/FLEX (replacement level WR42): beats ADP by +234 points and wins ALL FIVE seasons (significant). YOUR LEAGUE SHAPE MAY DIFFER, and then so does the number — the Draft tab shows the measured edge for your own shape (e.g. +186.1 in a 10-team two-FLEX PPR). Against Sleeper's own raw order it is +60 and wins 3 of 5 — positive in every simulation but NOT significant; that would take 13 seasons." },
  { key: "proj", label: "Projected points", short: "Proj", band: "Model",
    note: "Sleeper's projection in your scoring. MEASURED the strongest single source (rho 0.695 against 0.458 for ADP). ESPN is used when Sleeper is silent." },
  /* HEITID LAUG. Thetta er OKKAR rod a spa Sleeper eftir hrastigum, EKKI
     rodin sem Sleeper-appid synir (thar er Josh Allen QB1, ekki heildar-1).
     Hrastigarod setur 14 QB i topp-20 i PPR og 20 af 20 i standard — hun
     er einmitt bordid sem VBD er til ad laga, og ad kalla hana "thad sem
     thu sérd i Sleeper" gerdi hana ad einhverju sem hun er ekki.
     Rodin sem Sleeper birtir sjalfur er ADP-dalkurinn. */
  { key: "sleeperRank", label: "Sleeper projection, raw order", short: "Raw #", band: "Model", hi: false,
    note: "Rank by the RAW projected points from Sleeper, computed here. THIS IS NOT the order the Sleeper app shows (that one is ADP) — raw points put quarterbacks on top because they score the most, with no account of replacement level." },
  { key: "vsSleeperRank", label: "A-Rank vs raw order", short: "vs Raw", band: "Model",
    note: "How many places higher A-Ranking puts him than the raw points order does. Positive = the replacement-level correction lifts him." },
  { key: "vbd", label: "Value over replacement", short: "VBD", band: "Model",
    note: "His projection minus the projection of the replacement player at the same position in YOUR league. This is the number that ranks — not the raw points." },
  { key: "tier", label: "Model tier", short: "Tier", band: "Model", hi: false,
    note: "Tiers cut at the GAPS in VBD, not at a fixed count. It answers: will I still get a comparable player with my next pick?" },
  { key: "posRank", label: "Positional rank (model)", short: "Pos #", band: "Model", hi: false,
    note: "Rank within his position by the model's projection." },

  /* ---------- markadurinn ---------- */
  { key: "adp", label: "ADP (your scoring)", short: "ADP", band: "Market", hi: false,
    note: "Average draft position in the format you selected. From FantasyFootballCalculator (real drafts)." },
  { key: "adpSleeper", label: "Sleeper ADP", short: "ADP Slp", band: "Market", hi: false,
    note: "ADP on Sleeper — the platform you actually draft on. Placeholder values (999/400) are stripped out." },
  { key: "adpEspn", label: "ESPN ADP", short: "ADP ESPN", band: "Market", hi: false,
    note: "ESPN's ADP, verbatim. The difference between it and Sleeper ADP is signal, not noise: the platforms value players differently. CAVEAT: ESPN gives an UNDRAFTED player a sentinel around 170 — 81% of rows sit in [169,171], among them players who are not in the NFL — so a value there means 'never drafted', not a price. It is THEREFORE NOT used as the market price; see `adp`." },
  { key: "value", label: "Value vs market", short: "Value", band: "Market",
    note: "How many ROUNDS later the market takes him than our ranking says. Positive = a bargain. BOTH ORDERS COUNT ONLY WHAT WE RANK: the market position is shifted down by the number of players the market takes ahead of him that our ranking leaves out (K, DST and skill players with no projection — 237 of 1,175). Without that shift the number mixed two different bases and overstated bargains by a median of +2.80 rounds at ADP > 120 (worst +20.90), even though it was EXACTLY right inside the draft." },
  { key: "auctionEspn", label: "Auction value (ESPN)", short: "Auction", band: "Market",
    note: "Average price in ESPN auction drafts, in dollars out of 200." },
  { key: "ownedEspn", label: "Rostered %", short: "Owned%", band: "Market",
    note: "Share of ESPN leagues that roster him. The behaviour of millions of teams, not an opinion." },
  { key: "trendAdd", label: "Adds (24h)", short: "Adds 24h", band: "Market",
    note: "Number of Sleeper leagues that added him in the last 24 hours. The freshest market signal there is." },

  /* ---------- serfraedingar ---------- */
  { key: "ecr", label: "Expert consensus rank", short: "ECR", band: "Experts", hi: false,
    note: "FantasyPros' expert consensus FOR YOUR SCORING. The format matters: of 502 players present in both, 467 sit at a different rank in standard than in PPR, and the top four swap around." },
  { key: "ecrTier", label: "FantasyPros tier", short: "FP tier", band: "Experts", hi: false,
    note: "FantasyPros' own tiers. A second opinion alongside our tiers, not a replacement for them." },
  { key: "ecrSd", label: "Expert disagreement", short: "ECR sd", band: "Experts", hi: null,
    note: "Standard deviation of the expert ranks. A HIGH VALUE IS NOT BAD — it marks a divisive player, and that is where both the best and the worst picks are." },
  { key: "ecrBest", label: "Highest expert rank", short: "Best", band: "Experts", hi: false,
    note: "The highest rank ANY single expert gave him." },
  { key: "ecrWorst", label: "Lowest expert rank", short: "Worst", band: "Experts", hi: false,
    note: "The lowest rank any single expert gave him." },
  { key: "sharpRank", label: "Sharp-weighted rank", short: "Sharp #", band: "Experts", hi: false,
    note: "Consensus of ONLY the boards that measured ABOVE the null distribution in 2025. The ranking the measurement supports." },
  { key: "sharpDelta", label: "Sharp vs consensus", short: "Sharp Δ", band: "Experts",
    note: "How much higher the sharp boards have him than the consensus does. Positive = the boards with the best TRACK RECORD like him more. The group is picked on the median over >= 4 years and they must still be publishing — a single year is too weak a selector (rho 0.370). CONTEXT, NOT A RANKING: their deviation from ADP carries real signal (partial r 0.105 on top of our own deviation, 7/7 years), but blending it into A-Ranking LOST points in draft simulation (-11.6, 1/6 years). So read it as an opinion, not as a rank." },

  /* ---------- 2025 ---------- */
  { key: "lastPpg", label: "2025 points per game", short: "PPG 25", band: "2025",
    note: "Actual PPR points per game in 2025, computed from the nflverse weekly player stats." },
  { key: "lastPts", label: "2025 total points", short: "Pts 25", band: "2025",
    note: "Total points in 2025. Unlike points per game this punishes missed time through injury — and for a draft that is RIGHT." },
  { key: "lastGames", label: "2025 games", short: "G 25", band: "2025",
    note: "Games played in 2025, out of 17." },
  { key: "lastBoom", label: "2025 boom weeks", short: "Boom", band: "2025",
    note: "Weeks above the 85th percentile of starter weeks (MEASURED: QB 30 / RB 25 / WR 24 / TE 21 points)." },
  { key: "lastBust", label: "2025 bust weeks", short: "Bust", band: "2025", hi: false,
    note: "Weeks below the 25th percentile (MEASURED: QB 20 / RB 14 / WR 13 / TE 12). These are the weeks that lose you the matchup." },
  { key: "lastTgt", label: "2025 targets", short: "Tgt 25", band: "2025",
    note: "Targets thrown his way in 2025. Volume is more stable from year to year than efficiency is." },
  { key: "lastTshare", label: "2025 target share", short: "Tgt%", band: "2025",
    note: "Share of his team's targets that went to him. The best single measure of a receiver's role." },
  { key: "lastWopr", label: "2025 WOPR", short: "WOPR", band: "2025",
    note: "A weighted combination of target share and air-yards share. Captures role better than either one on its own." },

  /* ---------- adstaedur ---------- */
  /* ============================================================
     NOTAN LOFADI SUNDURLIDUN SEM ER EKKI TIL — LEIDRETT 18.8.2026
     ============================================================
     Her stod "Medal vaent stigaskor andstaedinganna GEGN HANS STODU".
     Talan er ThAD EKKI. `buildSos` skilar `t.allowed` ur `market.json`
     — vaent stigaskor andstaedinganna gegn LIDINU, ein tala per lid.
     MAELT: allar 30 ARI-radirnar (QB, RB, WR, TE, K, DST) bera SAMA
     gildid 26,97, og **0 af 32 lidum** bera fleiri en eitt gildi.
     Engin stodu-sundurlidun er reiknud, hvorki her ne i pipeline.

     "Gegn hans stodu" er orðalag ur `DEF_WEIGHT` (vorn gegn stodu),
     sem er VIKULEGI likansthatturinn og lifir annars stadar. Notan
     hafdi tekid ordin ad lani og lofad thar med tolu sem er ekki i
     dalkinum — nakvaemlega "birt tala sem ekkert bakar upp".

     VARNAGLI SEM STENDUR OLAGFAERDUR OG ER SKJALADUR I README 6j:
     `hi: false` (laegra er betra) er RETT fyrir DST — vorn vill fa a
     sig litid — en fyrir sóknarmann er ha andstaedings-lina oft
     SKOTHRID og thvi GOTT. Ad snua honum vaeri fullyrding sem enga
     maelingu hefur; ahrifin eru hvort sem er 0,13% i RMSE.          */
  { key: "sos", label: "Strength of schedule", short: "SoS", band: "Context", hi: false,
    note: "Average points his opponents are expected to score against the TEAM, taken from the betting line. A TEAM FIGURE: every position on the team carries the same value and NO positional breakdown is computed. CAVEAT: the measured effect is TINY (0.13% in RMSE) — this does not rank anyone, it breaks ties." },
  { key: "playoffSos", label: "Playoff SoS (wk 15-17)", short: "PO SoS", band: "Context", hi: false,
    note: "The same team figure for weeks 15-17, where the fantasy playoffs are played. The same caveat applies, and it is not broken down by position either." },
  { key: "depth", label: "Depth chart spot", short: "Depth", band: "Context", hi: false,
    note: "His spot on Sleeper's depth chart. 1 = starter." },
  { key: "injury", label: "Injury status", short: "Status", band: "Context", type: "text",
    note: "The official status. IT DECIDES availability — other sources may add to it, never replace it." },
];

/** Uppfletting eftir lykli. */
export const COL = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));

/**
 * Sjalfgefnir dalkar — thad sem svarar draft-spurningunni strax.
 *
 * ============================================================
 * `injury` VAR EKKI HER OG HANN A AD VERA — 18.8.2026
 * ============================================================
 * Notandinn bad um thad berum ordum eftir ad ein villa hafdi kostad
 * rettan svar: `avail` var aldrei sendur i `recommend()` og George
 * Kittle, a PUP-lista, bar "+5,4 umferdir kaup" (README 6g). Radgjofin
 * er lagfaerd, en BROWSING-listinn er onnur spurning og hann er
 * lesinn AN radgjafarinnar.
 *
 * SAETID ER VALID, EKKI HANDAHOF. Hann kemur EFTIR `bye` og THAR AF
 * ASTAEDU: `PlayerTable` byggir band-rodina med thvi ad hopa
 * SAMLIGGJANDI dalka eftir `band`. `name/pos/team/bye` bera ekkert
 * band; `injury` ber "Context". Vaeri hann settur milli `pos` og `team`
 * klofnadi bandalausi hopurinn i tvo hluta med einmanna "Context" a
 * milli — thrju bond thar sem tvo eiga ad vera. Eftir `bye` er hann
 * fimmti dalkur, sem er innan skjas an skruns, og bondin eru tvo.
 *
 * ATH: thetta er SJALFGEFID GILDI og `PlayerTable` les
 * `loadState("cols", DEFAULT_COLS)`. Notandi sem hefur ADUR breytt
 * dalkavalinu ber sinn eigin lista og faer thennan dalk ekki — thess
 * vegna er merkid vid NAFNID (bædi hér og a draft-bordinu) hitt sem
 * ber upplysinguna, og thad er nu RAUTT vid `avail === 0` i BADUM
 * toflunum. Tvaer leidir ad somu upplysingu, ekki ein.
 *
 * Vordur: `tests/render.mjs` kafli 3 (dalkurinn ER i sjalfgefna
 * settinu OG merkid birtist ThOTT dalkurinn se ekki valinn) og
 * `tests/visual.mjs` koflum 1-2 (raunverulegt Chrome: engin larett
 * skrun a 390/768/1440 og ekkert klippt haus-heiti).
 */
export const DEFAULT_COLS = [
  "name", "pos", "team", "bye", "injury", "aRank", "proj", "vbd", "tier",
  "adp", "value", "ecr", "sharpDelta", "lastPpg", "lastGames",
];

/**
 * FORMERKI ADEINS THEGAR TALAN ER RAUNVERULEGA YFIR EDA UNDIR NULL.
 *
 * `(-0.04).toFixed(1)` gefur `"-0.0"` i JS. I dalki sem heitir "Value"
 * les thad eins og villa: thad segir "adeins undir markadi" thegar
 * retta svarid er "a markadsverdi". Fjorir leikmenn i topp-tiu baru
 * thad a Players-flipanum.
 *
 * ÞETTA VAR THEGAR LEYST — i `DraftBoard.jsx`, med thessari nakvaemu
 * utfaerslu og thessari nakvaemu athugasemd. En hun var STOK THAR, svo
 * leikmannalistinn erfdi hana ekki. Lærdómur sem er lærdur a einum
 * stad og ekki fluttur er ekki lærdur, og thess vegna er hun hér.
 *
 * Þroskuldurinn ver ADEINS birtinguna; talan sjalf haggast ekki.
 */
export function signed(v, digits = 1) {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) < 0.5 / 10 ** digits) return (0).toFixed(digits);
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}
