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
  { key: "name", label: "Player", short: "Player", band: "", note: "Nafn og lid.", type: "text", frozen: true },
  { key: "pos", label: "Position", short: "Pos", band: "", note: "QB/RB/WR/TE/K/DST.", type: "text" },
  { key: "team", label: "Team", short: "Team", band: "", note: "Lid fyrir 2026.", type: "text" },
  { key: "bye", label: "Bye week", short: "Bye", band: "", note: "Vikan sem lidid spilar ekki. Kemur ur FantasyPros.", hi: null },
  { key: "age", label: "Age", short: "Age", band: "", note: "Aldur ur Sleeper.", hi: false },
  { key: "exp", label: "Years experience", short: "Exp", band: "", note: "Ar i deildinni. 0 = nyliði.", hi: null },

  /* ---------- likanid ---------- */
  { key: "aRank", label: "A-Ranking", short: "A-Rank", band: "Model", hi: false,
    note: "Okkar rod: spa Sleeper umreiknud i virdi yfir varamanni fyrir thina deild. MAELD 2021-2025: slaer ADP um +234 stig og vinnur OLL FIMM arin (marktaekt). Gegn Sleeper-rodinni sjalfri er hun +60 og vinnur 3 af 5 — jakvaett i hverri hermun en EKKI marktaekt; thad thyrfti 13 timabil." },
  { key: "proj", label: "Projected points", short: "Proj", band: "Model",
    note: "Spa Sleeper i thinni stigagjof. MAELD sterkasta heimildin (rho 0,695 gegn 0,458 hja ADP). ESPN er notad ef Sleeper thegir." },
  /* HEITID LAUG. Thetta er OKKAR rod a spa Sleeper eftir hrastigum, EKKI
     rodin sem Sleeper-appid synir (thar er Josh Allen QB1, ekki heildar-1).
     Hrastigarod setur 14 QB i topp-20 i PPR og 20 af 20 i standard — hun
     er einmitt bordid sem VBD er til ad laga, og ad kalla hana "thad sem
     thu sérd i Sleeper" gerdi hana ad einhverju sem hun er ekki.
     Rodin sem Sleeper birtir sjalfur er ADP-dalkurinn. */
  { key: "sleeperRank", label: "Sleeper projection, raw order", short: "Raw #", band: "Model", hi: false,
    note: "Rod eftir HRASTIGUM spar Sleeper, reiknud her. Thetta er EKKI rodin i Sleeper-appinu (hun er ADP) — hrastig setja QB efst thvi their skora mest, an tillits til varamanns." },
  { key: "vsSleeperRank", label: "A-Rank vs raw order", short: "vs Raw", band: "Model",
    note: "Hve morgum saetum ofar A-Ranking setur hann en hra stigarod. Jakvaett = varamanns-leidrettingin lyftir honum." },
  { key: "vbd", label: "Value over replacement", short: "VBD", band: "Model",
    note: "Spa minus spa varamanns a somu stodu i THINNI deild. Thetta er talan sem radar — ekki hrastigin." },
  { key: "tier", label: "Model tier", short: "Tier", band: "Model", hi: false,
    note: "Threp eftir BILUM i VBD, ekki fostum fjolda. Svarar: fae ég sambaerilegan mann i naesta vali?" },
  { key: "posRank", label: "Positional rank (model)", short: "Pos #", band: "Model", hi: false,
    note: "Rod innan stodu eftir spa likansins." },

  /* ---------- markadurinn ---------- */
  { key: "adp", label: "ADP (your league format)", short: "ADP", band: "Market", hi: false,
    note: "Medal-draftstada i thvi sniði sem thu valdir. Ur FantasyFootballCalculator (raunveruleg droft)." },
  { key: "adpSleeper", label: "Sleeper ADP", short: "ADP Slp", band: "Market", hi: false,
    note: "ADP a Sleeper — vettvangnum sem thu draftar a. Tomgildi (999/400) eru fjarlaegð." },
  { key: "adpEspn", label: "ESPN ADP", short: "ADP ESPN", band: "Market", hi: false,
    note: "ADP a ESPN. Munur a honum og Sleeper-ADP er merki, ekki havadi: vettvangarnir meta olikt." },
  { key: "value", label: "Value vs market", short: "Value", band: "Market",
    note: "Hversu morgum UMFERDUM sidar markadurinn tekur hann en okkar rod segir. Jakvaett = kaup." },
  { key: "auctionEspn", label: "Auction value (ESPN)", short: "Auction", band: "Market",
    note: "Medalverd i uppbodsdrofti a ESPN, i dollurum af 200." },
  { key: "ownedEspn", label: "Rostered %", short: "Owned%", band: "Market",
    note: "Hlutfall ESPN-deilda sem a hann. Atferli milljona lida, ekki skodun." },
  { key: "trendAdd", label: "Adds (24h)", short: "Adds 24h", band: "Market",
    note: "Fjoldi Sleeper-deilda sem baettu honum vid sidasta solarhring. Ferskasta markadsmerkid sem til er." },

  /* ---------- serfraedingar ---------- */
  { key: "ecr", label: "Expert consensus rank", short: "ECR", band: "Experts", hi: false,
    note: "Samsteypa ~93 serfraedinga hja FantasyPros. MAELD 2025: betri en 43% einstakra borda." },
  { key: "ecrTier", label: "FantasyPros tier", short: "FP tier", band: "Experts", hi: false,
    note: "Threp FantasyPros. Onnur skodun vid hlidina a okkar threpum, ekki i stad theirra." },
  { key: "ecrSd", label: "Expert disagreement", short: "ECR sd", band: "Experts", hi: null,
    note: "Stadalfravik rada serfraedinga. HATT GILDI ER EKKI SLAEMT — thad merkir umdeildan leikmann, og thar liggja baedi bestu og verstu valin." },
  { key: "ecrBest", label: "Highest expert rank", short: "Best", band: "Experts", hi: false,
    note: "Haesta rod sem NOKKUR serfraedingur gaf honum." },
  { key: "ecrWorst", label: "Lowest expert rank", short: "Worst", band: "Experts", hi: false,
    note: "Laegsta rod sem nokkur serfraedingur gaf honum." },
  { key: "sharpRank", label: "Sharp-weighted rank", short: "Sharp #", band: "Experts", hi: false,
    note: "Samsteypa ADEINS theirra borda sem maeldust YFIR nulldreifingu 2025. Rodin sem maelingin styður." },
  { key: "sharpDelta", label: "Sharp vs consensus", short: "Sharp Δ", band: "Experts",
    note: "Hvad skorpu bordin eru haerri a honum en samsteypan. Jakvaett = their sem hittu i fyrra eru hrifnari." },

  /* ---------- 2025 ---------- */
  { key: "lastPpg", label: "2025 points per game", short: "PPG 25", band: "2025",
    note: "Raunveruleg PPR-stig per leik 2025, reiknud ur nflverse-fylkjum." },
  { key: "lastPts", label: "2025 total points", short: "Pts 25", band: "2025",
    note: "Heildarstig 2025. Ólikt PPG refsar thetta fyrir meidsli — og thad er RETT fyrir draft." },
  { key: "lastGames", label: "2025 games", short: "G 25", band: "2025",
    note: "Leikir spiladir 2025 af 17." },
  { key: "lastBoom", label: "2025 boom weeks", short: "Boom", band: "2025",
    note: "Vikur yfir 85. hundradshluta byrjunarlids-vikna (MAELT: QB 30 / RB 25 / WR 24 / TE 21 stig)." },
  { key: "lastBust", label: "2025 bust weeks", short: "Bust", band: "2025", hi: false,
    note: "Vikur undir 25. hundradshluta (MAELT: QB 20 / RB 14 / WR 13 / TE 12). Thetta eru vikurnar sem tapa thér leiknum." },
  { key: "lastTgt", label: "2025 targets", short: "Tgt 25", band: "2025",
    note: "Sendingar a hann 2025. Magn er stodugra milli ara en skilvirkni." },
  { key: "lastTshare", label: "2025 target share", short: "Tgt%", band: "2025",
    note: "Hlutfall sendinga lidsins sem fóru a hann. Besta einstaka maelistikan a hlutverki mottakara." },
  { key: "lastWopr", label: "2025 WOPR", short: "WOPR", band: "2025",
    note: "Vegin samsetning sendingahlutfalls og loftyarda-hlutfalls. Nær hlutverki betur en hvorugt eitt." },

  /* ---------- adstaedur ---------- */
  { key: "sos", label: "Strength of schedule", short: "SoS", band: "Context", hi: false,
    note: "Medal vaent stigaskor andstaedinganna gegn hans stodu. VARNAGLI: maeld ahrif eru ORSMA (0,13% i RMSE) — thetta radar ekki, thad brytur jofn tilvik." },
  { key: "playoffSos", label: "Playoff SoS (wk 15-17)", short: "PO SoS", band: "Context", hi: false,
    note: "Sama fyrir vikur 15-17 thar sem fantasy-urslitakeppnin er. Sami varnagli gildir." },
  { key: "depth", label: "Depth chart spot", short: "Depth", band: "Context", hi: false,
    note: "Saeti a dyptartoflu Sleeper. 1 = byrjar." },
  { key: "injury", label: "Injury status", short: "Status", band: "Context", type: "text",
    note: "Opinber stada. HUN RAEDUR tiltaekileika — adrar heimildir mega audga hana, aldrei skipta henni ut." },
];

/** Uppfletting eftir lykli. */
export const COL = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));

/** Sjalfgefnir dalkar — thad sem svarar draft-spurningunni strax. */
export const DEFAULT_COLS = [
  "name", "pos", "team", "bye", "aRank", "proj", "vbd", "tier",
  "adp", "value", "ecr", "sharpDelta", "lastPpg", "lastGames",
];

/** Bond i skra-rod — birtingar-rodin ER skra-rodin. */
export const BANDS = (() => {
  const out = [];
  for (const c of COLUMNS) {
    const last = out[out.length - 1];
    if (last && last.band === c.band) last.n++;
    else out.push({ band: c.band, n: 1 });
  }
  return out;
})();
