/* ============================================================
   ENSK ORÐABÓK — lyklarnir eru ISLENSKU FRUMTEXTARNIR.

   REGLUR SEM PROFID VER (tests/i18n.mjs):
     1. Hver lykill sem `tx(...)` kallar a VERDUR ad vera her. Vantar hann
        -> islenskan birtist i ensku vidmoti og profid fellur.
     2. Stikur `{0}`, `{1}` ... verda ad vera THAER SOMU a badum malum
        (mega endurradast — thad er tilgangurinn), annars birtist tom tala.
     3. Enginn lykill her sem ekkert kallar a (daudur texti sem enginn ser).
     4. STAT_DEFS-heiti <= 22 stafir, sama vordur sem islenskan hefur
        (tests/stats.test.mjs) — toflufhausinn er 88 px.

   TVENNT SEM ER VILJANDI OTHYTT:
     - Stat-skammstafanir (xG, xA, xGI, BPS, ICT, DC, CS) og chip-heiti
       (Wildcard, Free Hit, Bench Boost, Triple Captain). Their eru ENSK
       thegar og FPL-notendur thekkja their nakvaemlega svona.
     - Tolustafir i texta: islenska notar kommu (2,89) og enskan punkt
       (2.89). Thess vegna er talan SKRIFUD I THYDINGUNNI, ekki sniðin.
   ============================================================ */
export const EN = {

/* ================= App.jsx ================= */
  /* FPL explain-lyklar (stiga-uppskipting a leikmannaspjaldi) */
  "Mínútur": "Minutes",
  "Mörk": "Goals",
  "Assist": "Assists",
  "Hreint blað": "Clean sheets",
  "Mörk á sig": "Goals conceded",
  "Sjálfsmörk": "Own goals",
  "Vítavörslur": "Penalty saves",
  "Klúðruð víti": "Penalties missed",
  "Gult spjald": "Yellow card",
  "Rautt spjald": "Red card",
  "Vörslur": "Saves",
  "Bónus": "Bonus",
  "Varnarframlag": "Defensive contribution",
  /* Chips */
  "Ótakmörkuð skipti, engin refsing": "Unlimited transfers, no hit",
  "Lið eina umferð, fer svo til baka": "Squad for one gameweek, then reverts",
  "Bekkurinn skorar líka (allir 15)": "The bench scores too (all 15)",
  "Fyrirliði ×3 í stað ×2": "Captain ×3 instead of ×2",
  /* Dagsetningar og timi */
  "sun": "Sun",
  "mán": "Mon",
  "þri": "Tue",
  "mið": "Wed",
  "fim": "Thu",
  "fös": "Fri",
  "lau": "Sat",
  "núna": "now",
  "f. {0} mín": "{0} min ago",
  "f. {0} klst": "{0}h ago",
  "{0}.{1}. kl. {2}:{3}": "{0}/{1} at {2}:{3}",
  /* Tiltaekileiki */
  "Til leiks": "Available",
  "Vafi": "Doubt",
  "Meiddur": "Injured",
  "Í banni": "Suspended",
  "Ótiltækur": "Unavailable",
  "Ekki í hóp": "Not in squad",
  "Merki reiknilíkans fyrir Fantasy-fótbolta": "Logo of a Fantasy football model",
  "lið {0}": "team {0}",
  /* Andstaedingar */
  "Slóð eða númer andstæðings — t.d. 606 eða .../entry/606/":
    "Rival URL or team ID — e.g. 606 or .../entry/606/",
  "Þegar á listanum.": "Already on the list.",
  "Það ert þú sjálf/ur.": "That is your own team.",
  "líkindi": "probability",
  "mælt": "measured",
  /* Skipti */
  "Skiptin verða að vera í sömu stöðu.": "Transfers must be in the same position.",
  "Of margir frá {0} — hámark 3 per félagi.": "Too many from {0} — maximum 3 per club.",
  "Vantar £{0}m — of dýr skipti.": "£{0}m short — transfer too expensive.",
  "GW{0}: {1} → {2} · banki £{3}": "GW{0}: {1} → {2} · bank £{3}",
  "Báðir í byrjunarliði — veldu einn á bekk.": "Both are starting — pick one on the bench.",
  "Báðir á bekk.": "Both are on the bench.",
  "Ólögleg uppstilling (1 GK, 3+ vörn, 2+ miðja, 1+ sókn).":
    "Illegal formation (1 GK, 3+ DEF, 2+ MID, 1+ FWD).",
  "GW{0} endurstillt — upprunalega liðið aftur.": "GW{0} reset — original squad restored.",
  "Öll plönun endurstillt.": "All planning reset.",
  "Slóð þarf að innihalda /entry/{númer}/": "The URL must contain /entry/{number}/",
  "Tengt lið {0} — sæki raunlið og stig.": "Connected team {0} — fetching real squad and points.",
  /* Rodunarskor — drivers */
  "mín {0}′": "mins {0}′",
  "mín {0}%": "mins {0}%",
  "leikir": "fixtures",
  "{0} ({1}% af skori)": "{0} ({1}% of score)",
  "sl. tímabil": "last season",
  "í ár": "this year",
  /* Hledsla og villa */
  "Sæki opinber FPL-gögn…": "Fetching official FPL data…",
  "Náði ekki í gögnin úr": "Could not fetch the data from",
  ". Keyrðu GitHub Actions (fetch-data) og reyndu aftur.":
    ". Run GitHub Actions (fetch-data) and try again.",
  /* Haus */
  "Leikjaþyngd allra liða, varnar- og sóknar-hópur":
    "Fixture difficulty for every team, defensive and attacking",
  "📊 FFDR": "📊 FFDR",
  "🎫 Chips": "🎫 Chips",
  "Uppfæra": "Refresh",
  "Tengja": "Connect",
  /* Flipar */
  "⚽ Skipulag": "⚽ Planner",
  "👥 Leikmannatölur": "👥 Player stats",
  "📊 Umferðin": "📊 Gameweek",
  "🏆 Stigatafla": "🏆 Leaderboard",
  "⚽️ Föst leikatriði": "⚽️ Set pieces",
  "Tímabilið 2026/27 er ekki byrjað. Tölurnar hér eru uppsafnaðar tölur sem FPL birtir núna — þær nollast þegar GW1 opnar.":
    "The 2026/27 season has not started. The numbers here are the cumulative totals FPL is showing right now — they reset to zero when GW1 opens.",
  /* Timalina umferda */
  "Fyrri umferðir": "Earlier gameweeks",
  " — vænt +{0} stig": " — expected +{0} pts",
  "{0} skipti, {1} yfir frí = {2} stig": "{0} transfers, {1} over the free ones = {2} pts",
  "Landsleikjahlé": "International break",
  "Næstu umferðir": "Later gameweeks",
  "· frestur": "· deadline",
  " · lokið": " · finished",
  "{0} skipti": "{0} transfers",
  "{0} bekkjar-breyting": "{0} bench change",
  "{0} bekkjar-breytingar": "{0} bench changes",
  "Hreinsa": "Clear",
  "já": "yes",
  "nei": "no",
  "Hreinsa alla plönun í GW{0}: {1}": "Clear all planning in GW{0}: {1}",
  "↺ endurstilla GW": "↺ reset GW",
  "{0} — ótakmörkuð skipti": "{0} — unlimited transfers",
  "ótakmörkuð frí skipti": "unlimited free transfers",
  "skipti ·": "transfers ·",
  "frí": "free",
  " · {0} stig": " · {0} pts",
  "Fyrir tímabil.": "Preseason.",
  "Verð hreyfast ekki og skipti eru ótakmörkuð og frí þar til frestur GW1 rennur út":
    "Prices do not move and transfers are unlimited and free until the GW1 deadline passes",
  ". Kaupverð læsist þá — 50%-söluregla gildir eftir það.":
    ". Purchase prices lock then — the 50% sell rule applies after that.",
  /* Toppspjold */
  "Banki": "Bank",
  "lið £{0} · alls £{1}": "squad £{0} · total £{1}",
  "Heildarstig": "Total points",
  "tengdu FPL Url": "connect FPL URL",
  "Umferð {0}": "Gameweek {0}",
  "refsing {0} tekin": "{0} hit taken",
  "áætluð refsing {0}": "planned hit {0}",
  "lokið": "finished",
  "ekki hafin": "not started",
  /* Vollur og bekkur */
  "Núllstilla bekk": "Reset bench",
  "Bekkur": "Bench",
  /* Tiltaekileiki lidsins */
  "Tiltækileiki liðsins": "Squad availability",
  "Allir 15 tiltækir — engin meiðsli, bönn eða spjaldahætta.":
    "All 15 available — no injuries, suspensions or card risk.",
  "gul": "yellow",
  "byrj": "start",
  "Úr FPL: status, chance_of_playing, news, gul spjöld og byrjunarhlutfall. Spjaldabann: 5 gul (til umf. 19) = 1 leikur, 10 = 2, 15 = 3.":
    "From FPL: status, chance_of_playing, news, yellow cards and start rate. Card bans: 5 yellows (up to GW19) = 1 match, 10 = 2, 15 = 3.",
  /* Verdbreytingar */
  "Verðbreytingar — flutningar í umferð": "Price changes — transfers this gameweek",
  "Raungögn: transfers_in/out og cost_change_event úr FPL.":
    "Real data: transfers_in/out and cost_change_event from FPL.",
  "„í nótt?\"": "\"tonight?\"",
  "er nálgun (nettó-flutningar á móti eignarhaldi) — FPL birtir ekki formúluna sína, svo þetta er vísbending, ekki vissa. Grænt nafn = þú ert með hann í skiptaáætlun:":
    "is an approximation (net transfers against ownership) — FPL does not publish its formula, so this is an indication, not a certainty. A green name = he is in your transfer plan:",
  "flýttu skiptunum": "bring the transfer forward",
  "ef hann hækkar.": "if he rises.",
  "Nettó-flutningar yfir áætluðum þröskuldi — líklega hækkun í næstu verðkeyrslu FPL (nálgun)":
    "Net transfers above the estimated threshold — likely a rise in FPL's next price run (approximation)",
  "↑ í nótt?": "↑ tonight?",
  "Mest út": "Most out",
  "Nettó-útflutningar yfir þröskuldi — líklega lækkun í nótt (nálgun). Ef þú ætlar að selja hann: gerðu það fyrir verðkeyrsluna.":
    "Net transfers out above the threshold — likely a fall tonight (approximation). If you plan to sell him: do it before the price run.",
  "↓ í nótt?": "↓ tonight?",
  /* Skiptaaaetlun */
  "Skiptaáætlun": "Transfer plan",
  "nettó": "net",
  "stig": "pts",
  "Ávinningur = vænt stig (stig/leik + FDR, FPL ep_next fyrir næstu umferð) yfir 5 umferðir. Refsing dregst frá. Áætlun, ekki vissa.":
    "Gain = expected points (points/match + FDR, FPL ep_next for the next gameweek) over 5 gameweeks. The hit is subtracted. An estimate, not a certainty.",
  "Hreinsa ALLA plönun (": "Clear ALL planning (",
  "skipti,": "transfers,",
  "umferðir m. bekkjar-breytingum,": "gameweeks with bench changes,",
  "chip)?": "chip)?",
  "já, allt": "yes, everything",
  "Hreinsa öll skipti, bekkjar-breytingar og chips — upprunalega liðið aftur":
    "Clear every transfer, bench change and chip — original squad restored",
  "↺ endurstilla alla plönun": "↺ reset all planning",
  "Free Hit — liðið fer til baka eftir umferðina, skiptin gilda aðeins í henni":
    "Free Hit — the squad reverts after the gameweek, the transfers only count in it",
  "vænt stig yfir 5 umferðir": "expected points over 5 gameweeks",
  "hlutdeild í refsingu": "share of the hit",
  "þess virði": "worth it",
  "kostar meira en það gefur": "costs more than it gives",
  /* Chips-spjald */
  "Tvö sett — eitt fyrir hvern hálfleik. Gildistími kemur úr FPL-API-inu. Ein chip per umferð. Wildcard og Free Hit byrja í GW2.":
    "Two sets — one for each half of the season. Validity comes from the FPL API. One chip per gameweek. Wildcard and Free Hit start in GW2.",
  "Fyrri hluti": "First half",
  "Seinni hluti": "Second half",
  "útrunnið": "expired",
  /* "fellur" hefur ENGA broddstafi, svo AST-skonnunin i tests/i18n.mjs var
     blind a hann og enska chip-spjaldid sagdi "fellur 20/9 at 17:30".
     Fundinn 31.7. af tests/i18n-dom.mjs (IS/EN-mismunur a skjanum).     */
  "fellur {0}": "expires {0}",
  " · {0} ónotuð": " · {0} unused",
  "· vænt +": "· expected +",
  "best í": "best in",
  /* Lid — FFDR */
  "Lið — FFDR GW": "Teams — FFDR GW",
  "FFDR vörn": "FFDR defence",
  "FFDR sókn": "FFDR attack",
  "FFDR er": "FFDR is",
  "útkoman": "the output",
  "— ClubElo, xGC og markaðslínan eru inntök í hana og eru því ekki sýnd sér. Lægra FFDR = léttara. (DefCon-tækifærið er sér-merki og sést á leikmannaspjöldum og í liða-yfirlitinu.)":
    "— ClubElo, xGC and the market line are inputs to it and are therefore not shown separately. Lower FFDR = easier. (The DefCon opportunity is its own signal and appears on player cards and in the team overview.)",
  "Lið": "Team",
  "FFDR fyrir varnarmenn, meðaltal valins bils": "FFDR for defenders, average over the selected range",
  "vörn": "def",
  "FFDR fyrir framherja": "FFDR for forwards",
  "sókn": "att",
  /* Andstaedingar */
  "Andstæðingar": "Rivals",
  "Berðu liðið þitt við keppinauta í mini-deildinni: hverjir eru":
    "Compare your squad with rivals in your mini-league: who are",
  "sérstöðumennirnir": "the differentials",
  "(differentials) á báða bóga, og hver ber bandið hjá þeim.":
    "on both sides, and who wears their armband.",
  "FPL-slóð eða liðsnúmer": "FPL URL or team ID",
  "Bæta við": "Add",
  "Engir skráðir enn. Númerið er í slóð liðsins á fantasy.premierleague.com.":
    "None added yet. The ID is in the team's URL on fantasy.premierleague.com.",
  "lið": "teams",
  "sæki…": "fetching…",
  "GW {0} · alls {1}": "GW {0} · total {1}",
  "Fjarlægja": "Remove",
  "/15 sameiginlegir": "/15 shared",
  "· fyrirliði": "· captain",
  " (sami og þú)": " (same as yours)",
  "þeirra sérstaða": "their differentials",
  "þín sérstaða": "your differentials",
  "náðist ekki — er númerið rétt?": "could not be fetched — is the ID right?",
  "ekkert lið skráð í þessari umferð enn (fyrir tímabil er það eðlilegt)":
    "no squad registered for this gameweek yet (normal in preseason)",
  /* Gagnaheimildir */
  "Gagnaheimildir": "Data sources",
  "leikmenn,": "players,",
  "Meiðsli og verð —": "Injuries and prices —",
  "{0} merktir · uppfært {1}": "{0} flagged · updated {1}",
  "bíður hraðakeyrslu": "waiting for the fast run",
  "leikir + FDR": "fixtures + FDR",
  "FPL events — frestir,": "FPL events — deadlines,",
  "umferðir": "gameweeks",
  "Bókmakera-CS%": "Bookmaker CS%",
  "({0} lið, úr pipeline)": "({0} teams, from the pipeline)",
  "(sæki…)": "(fetching…)",
  "(skrá til, engir leikir á línu)": "(file exists, no matches priced)",
  "(odds.json vantar — keyrðu fetch-data)": "(odds.json missing — run fetch-data)",
  " · {0} leikir m. CS-líkindum": " · {0} matches with CS probabilities",
  "Veður —": "Weather —",
  "{0} leikir": "{0} matches",
  "utan 16-daga spár": "outside the 16-day forecast",
  "Meiðsla-tegundir (API-Sports) —": "Injury types (API-Sports) —",
  "bíður fyrstu keyrslu": "waiting for the first run",
  "villa: {0}": "error: {0}",
  "{0} paraðir": "{0} matched",
  "engir leikdagar í glugga (bíður GW1)": "no match days in the window (waiting for GW1)",
  "DefCon-tækifæri —": "DefCon opportunity —",
  " (reiknað í appi)": " (computed in the app)",
  "leikmenn": "players",
  "(bíður leikja)": "(waiting for matches)",
  "Leikjatölur E0 (yfirstandandi)": "Match stats E0 (current)",
  "Leikjatölur E0 (saga)": "Match stats E0 (history)",
  "Skot með hnitum (ESPN)": "Shots with coordinates (ESPN)",
  "Umferðarskýrsla": "Gameweek report",
  "Fyrri tímabil leikmanna": "Players' earlier seasons",
  "Ferðalengdir": "Travel distances",
  "Rótasjón": "Rotation",
  "Liðsform": "Team form",
  "Heppnismælir": "Luck meter",
  "Rúllandi form": "Rolling form",
  "Umferðalögun": "Gameweek shape",
  "Evrópuleikir": "European fixtures",
  "óþekkt": "unknown",
  "bíður gagna": "waiting for data",
  /* Tillogur */
  "Mælt með kaupum — GW": "Recommended buys — GW",
  "næsti leikur": "next match",
  "næstu 2": "next 2",
  "næstu 3": "next 3",
  "næstu 4": "next 4",
  "næstu 5": "next 5",
  "næstu 6": "next 6",
  "næstu 8": "next 8",
  "Sýna aðeins leikmenn undir þessu verði": "Show only players below this price",
  "hám. £": "max £",
  "Hreinsa verðþak": "Clear price cap",
  "allar stöður": "all positions",
  "markverðir": "goalkeepers",
  "miðja": "midfield",
  "Mælt líkan.": "Measured model.",
  "Vogtölur fittaðar út-af-úrtaki á 2025/26 (": "Weights fitted out-of-sample on 2025/26 (",
  "umferðir í rúllandi glugga). Ríkjandi þáttur er":
    "gameweeks in a rolling window). The dominant factor is",
  "mínútur": "minutes",
  ". Leikjaþyngd er": ". Fixture difficulty is a",
  "mæld tafla": "measured table",
  "úr 1.102 leikjum, ekki línuleg ágiskun — FDR er rétt kvarðað að meðaltali en of grófkornótt, svo við fínum það með liðsstyrk.":
    "from 1,102 matches, not a linear guess — FDR is correctly calibrated on average but too coarse, so we refine it with team strength.",
  "Fyrir-tímabils ham.": "Preseason mode.",
  "Mínútur síðustu umferða eru ríkjandi þátturinn en þær eru ekki til enn. Notum verð, FPL ep_next og síðasta tímabil. Mæling sýnir að þetta er":
    "Minutes from recent gameweeks are the dominant factor but they do not exist yet. We use price, FPL ep_next and last season. Measurement shows this is",
  "~1,5 stigum ónákvæmara": "~1.5 points less accurate",
  "— skorið verður skarpara frá GW6.": "— the score sharpens from GW6.",
  /* Leikmannaspjald */
  "{0} · {1} leikmenn": "{0} · {1} players",
  " — {0}% líkur á að spila": " — {0}% chance of playing",
  "Tegund:": "Type:",
  "API-Sports skráir:": "API-Sports records:",
  "— FPL hefur ekki flaggað hann, svo þetta getur verið úrelt eða smávægilegt.":
    "— FPL has not flagged him, so this may be out of date or minor.",
  "gul spjöld": "yellow cards",
  "frá": "from",
  "-þröskuldi (": " threshold (",
  "leikur": "match",
  "í banni)": "ban)",
  "Spá næstu (ep)": "Next GW forecast (ep)",
  "Byrjaði": "Started",
  "Vítaröð": "Penalty order",
  "fyrsti taki": "first taker",
  "Horn/aukasp.": "Corners/FK",
  "Aukaspyrnur": "Free kicks",
  "Styrkur liðsins": "Team strength",
  "reiknað mat appsins (": "the app's own estimate (",
  ") · ClubElo lifandi": ") · ClubElo live",
  "ekki paraður": "not matched",
  "xG / leik": "xG / match",
  "lægra betra": "lower is better",
  "DefCon-tækifæri": "DefCon opportunity",
  "hærra = fleiri CBIT": "higher = more CBIT",
  "frammistaða": "performance",
  "Engar tölur fyrir GW": "No numbers for GW",
  "enn — umferðin er ekki byrjuð (tímabil hefst 21. ágúst).":
    "yet — the gameweek has not started (the season begins 21 August).",
  "stig ·": "pts ·",
  "mín": "min",
  " · lifandi": " · live",
  "Stig": "Points",
  "Bónus / BPS": "Bonus / BPS",
  "{0} á sig": "{0} conceded",
  "Spjöld": "Cards",
  "Hvaðan stigin komu": "Where the points came from",
  "er ekki í FPL-API-inu. Það er afleitt úr Understat skot-gögnum (skot með xG yfir 0,30 sem fór ekki inn) — birtist þegar skot-gögn eru komin (tímabil hafið).":
    "is not in the FPL API. It is derived from Understat shot data (a shot with xG above 0.30 that did not go in) — it appears once shot data arrives (season under way).",
  "Leikir": "Fixtures",
  "deild · Evrópa · bikar": "league · Europe · cup",
  "deild (Evrópu/bikar-gögn ekki komin)": "league (Europe/cup data not in yet)",
  "FDR {0}, samsett {1}": "FDR {0}, combined {1}",
  "þyngd": "difficulty",
  /* SPLITT 31.7.: {2} var islenskur buti (" — langferð (300+ km)") sem var
     aldrei thyddur, svo enska vidmotid birti "travel 359 km (langferð)".
     Nu er HEIL setning i hvorri leid. Sama a vid um ✈-utgafuna nedar. */
  "{0} ferðast {1} km (loftlína)": "{0} travels {1} km (as the crow flies)",
  "{0} ferðast {1} km (loftlína) — langferð (300+ km)":
    "{0} travels {1} km (as the crow flies) — long trip (300+ km)",
  "Liðið": "The team",
  "Mælt heimavallar-forskot fyrir {0}: +{1} stig/leik":
    "Measured home advantage for {0}: +{1} pts/match",
  "úti": "away",
  "Engir leikir skráðir.": "No fixtures listed.",
  "Skipta út": "Transfer out",
  "{0} er fyrirliði": "{0} is captain",
  "Fyrirliði": "Captain",
  "{0} er varafyrirliði": "{0} is vice-captain",
  "Varafyrirliði": "Vice-captain",
  "Bæta þessum leikmanni í samanburð": "Add this player to the comparison",
  "⇄ Bera saman": "⇄ Compare",
  "Sjá lið:": "See team:",
  /* Leit */
  "Leita — nafn eða lið": "Search — name or team",
  "Allir": "All",
  /* ATH: "Vörn"/"Miðja"/"Sókn" eru BADE stodu-sia OG flokka-heiti
     (STAT_GROUPS, Compare-grp). Einn lykill = ein thyding, svo bædi nota
     FULLA ordid — eins og islenskan gerir. "DEF/MID/FWD" hefdi lesist
     betur i siu-hnappi en tha hefdi flokka-hausinn heitið "FWD".      */
  "Vörn": "Defence",
  "Miðja": "Midfield",
  "Sókn": "Attack",
  "3 per félag": "3 per club",
  "vantar £{0}": "£{0} short",
  "Ólöglegt: {0}": "Illegal: {0}",
  "Fyrsti vítataki (uppfærist daglega úr FPL)": "First penalty taker (updated daily from FPL)",
  "Enginn leikmaður fannst.": "No player found.",
  "{0}: kaupverð hreinsað": "{0}: purchase price cleared",
  "{0}: kaupverð £{1}": "{0}: purchase price £{1}",
  "⇄ Samanburður (": "⇄ Comparison (",
  /* Leikjaflisar og threp */
  "{0} — algildur kvarði, samanburðarhæfur milli liða":
    "{0} — absolute scale, comparable between teams",
  "heima": "home",
  "dökkgrænt": "dark green",
  "grænt": "green",
  "hlutlaust": "neutral",
  "dökkgult": "dark yellow",
  "ljósrautt": "light red",
  "rautt": "red",
  /* Leikjadagar */
  "sunnudagur": "Sunday",
  "mánudagur": "Monday",
  "þriðjudagur": "Tuesday",
  "miðvikudagur": "Wednesday",
  "fimmtudagur": "Thursday",
  "föstudagur": "Friday",
  "laugardagur": "Saturday",
  "jan": "Jan",
  "feb": "Feb",
  "mars": "March",
  "apríl": "April",
  "maí": "May",
  "júní": "June",
  "júlí": "July",
  "ágúst": "August",
  "sept": "Sep",
  "okt": "Oct",
  "nóv": "Nov",
  "des": "Dec",
  "Ótímasett": "Not scheduled",
  "Leikir GW": "Fixtures GW",
  "Engir leikir skráðir — auð umferð.": "No fixtures listed — blank gameweek.",
  "Smelltu fyrir markaskorara": "Click for goalscorers",
  " · úrkoma": " · rain",
  "✈ {0} ferðast {1} km": "✈ {0} travels {1} km",
  "✈ {0} ferðast {1} km (langferð)": "✈ {0} travels {1} km (long trip)",
  /* FFDR-tafla */
  "VÖRN": "DEFENCE",
  "SÓKN": "ATTACK",
  "FFDR — leikjaþyngd": "FFDR — fixture difficulty",
  "· raðað eftir meðal-FFDR (léttast efst).": "· sorted by average FFDR (easiest on top).",
  "Þetta er ALGILDUR kvarði": "This is an ABSOLUTE scale",
  "— samanburðarhæfur milli liða, svo lélegt lið er rautt jafnvel í léttum leik. Það er rétt fyrir „hvern á ég að kaupa\". Leikja-flísar á spjöldum eru":
    "— comparable between teams, so a weak team is red even in an easy match. That is right for \"who should I buy\". The fixture tiles on player cards are",
  "afstæðar innan liðsins": "relative within the team",
  "— fyrir „hvenær á ég að spila honum\".": "— for \"when should I play him\".",
  "Meðaltal yfir sviðið": "Average over the range",
  "Með.": "Avg.",
  "Auð umferð": "Blank gameweek",
  " (ú)": " (a)",
  "ú": "a",
  /* Spjold a vellinum */
  "Valinn — smelltu á annan til að skipta": "Selected — click another to swap",
  "Smelltu til að skipta við annan leikmann": "Click to swap with another player",
  "Upplýsingar": "Information",
  "Skipta út — opnar leit": "Transfer out — opens search",
  "FFDR-samanburður — finndu mann sem á léttar umferðir þar sem hann á þungar":
    "FFDR comparison — find a player with easy gameweeks where his are hard",
  " — {0}% líkur": " — {0}% chance",
  "{0}{1}ATH: FPL-myndin getur sýnt GAMALT félag eftir skipti. Merkið er rétt.":
    "{0}{1}NOTE: the FPL photo can show an OLD club after a transfer. The crest is right.",
  "Söluverð eftir 50%-reglunni: £{0}": "Sell price under the 50% rule: £{0}",
  "Vænt stig í þessari umferð (mínútur + FFDR + form)":
    "Expected points this gameweek (minutes + FFDR + form)",
  "DefCon-tækifæri {0} — mikið vinnuálag varnar":
    "DefCon opportunity {0} — heavy defensive workload",
  "DC-hittni": "DC hit rate",
  "{0} byrjaðir · hrá {1}%": "{0} starts · raw {1}%",
  "{0} gul spjöld — 1 frá {1}-þröskuldi ({2} leikja bann)":
    "{0} yellow cards — 1 from the {1} threshold ({2}-match ban)",
  "Byrjaði {0} af {1} leikjum — skiptingar-hætta":
    "Started {0} of {1} matches — rotation risk",
  "Byrjaði {0} af {1} leikjum tímabilið {2} — skiptingar-hætta":
    "Started {0} of {1} matches in {2} — rotation risk",
  "samsett þyngd {0} (FDR {1})": "combined difficulty {0} (FDR {1})",
  "Meðal-FFDR yfir sviðið (algildur kvarði) — lægra er léttara":
    "Average FFDR over the range (absolute scale) — lower is easier",
  "CS-vænting": "CS expectation",
  "DefCon-tækifæri liðsins — hærra = fleiri varnaraðgerðir í boði":
    "The team's DefCon opportunity — higher = more defensive actions on offer",
  "ClubElo-styrkur liðsins": "The team's ClubElo strength",
  "Stærstu þættirnir á bak við skorið": "The biggest factors behind the score",

/* ================= Compare.jsx ================= */
  "Grunnur": "Basics",
  "FPL-stig": "FPL points",
  "Byrjaðir leikir": "Starts",
  "Stig / 90": "Points / 90",
  "Mín. per stig": "Mins per point",
  "Lægra er betra — hversu lengi hann er að vinna sér inn stig":
    "Lower is better — how long he takes to earn a point",
  "Verð": "Price",
  "Stig per milljón": "Points per million",
  "Mörk + assist": "Goals + assists",
  "M+A / 90": "G+A / 90",
  "Mín. per framlag": "Mins per involvement",
  "Væntingar": "Expected",
  "Mörk − xG": "Goals − xG",
  "Yfir núlli = klínísk nýting eða heppni": "Above zero = clinical finishing or luck",
  "Assist − xA": "Assists − xA",
  "Mín. per xGI": "Mins per xGI",
  "Undir núlli = varist betur en færin gáfu": "Below zero = defended better than the chances implied",
  "Bónus og agi": "Bonus and discipline",
  "DC per byrjun": "DC per start",
  "Bónusstig": "Bonus points",
  "Gul spjöld": "Yellow cards",
  "Rauð spjöld": "Red cards",
  "Lægra er betra": "Lower is better",
  "Samanburður": "Comparison",
  " (ekki hafið)": " (not started)",
  "Snið samanburðar": "Comparison layout",
  "▤ Sjónrænt": "▤ Visual",
  "≡ Tafla": "≡ Table",
  "Enginn valinn. Opnaðu leikmann og smelltu á": "None selected. Open a player and click",
  "til að bæta honum við.": "to add him.",
  "er ekki hafið": "has not started",
  "— engar tölur til. Veldu eldra tímabil í fellilistanum til að bera saman.":
    "— no numbers exist. Pick an earlier season in the dropdown to compare.",
  "Borið saman yfir": "Compared over a",
  "heilt tímabil": "whole season",
  ", ekki frjálst umferðabil: per-umferðar tölur liggja aðeins fyrir í":
    ", not an arbitrary gameweek range: per-gameweek numbers only exist in",
  "og þær fyllast fyrst þegar 2026/27 byrjar. Tímabila-samanburður virkar strax og nær 3 ár aftur.":
    "and they only fill up once 2026/27 begins. Season comparison works right away and reaches 3 years back.",
  "fjarlægja": "remove",
  "Grænt": "Green",
  "= betra gildi (aðeins merkt þegar einn er ótvírætt hærri). Í sjónræna sniðinu er":
    "= the better value (only marked when one is unambiguously higher). In the visual layout,",
  "súlulengd": "bar length",
  "kvörðuð": "is scaled",
  "per röð": "per row",
  "(xG og BPS eiga ekki sama kvarða),": "(xG and BPS do not share a scale),",
  "merkir tölu þar sem": "marks a number where",
  "lægra er betra": "lower is better",
  ", og tölur með formerki (Mörk − xG) eru": ", and signed numbers (Goals − xG) are",
  "frávikssúlur út frá miðju": "deviation bars from the centre",
  ". Vantandi tala fær „—\" og": ". A missing number gets \"—\" and",
  "enga": "no",
  "súlu — súla af lengd 0 læsist eins og mæld nulltala. Tölur sem FFS birtir en engin heimild okkar gefur — snertingar í teig, big chances, dribbles, návígi — eru":
    "bar — a bar of length 0 reads like a measured zero. Numbers FFS shows but no source of ours provides — touches in the box, big chances, dribbles, duels — are",
  "ekki": "not",
  "hér. Sjá kafla 6b í CLAUDE.md.": "here. See section 6b in CLAUDE.md.",

/* ================= GwReport.jsx ================= */
  "Yfirlit": "Overview",
  "Skot-kort{0}": "Shot map{0}",
  "Leikirnir ({0})": "Matches ({0})",
  "Skot-kort, {0} skot": "Shot map, {0} shots",
  "Umferðin": "The gameweek",
  "Umferðarskýrslan er ekki komin.": "The gameweek report has not arrived.",
  "Hún kemur úr": "It comes from",
  ", sem pipeline skrifar (": ", which the pipeline writes (",
  "í": "in",
  "Þrjár ástæður, í líklegri röð:": "Three reasons, in order of likelihood:",
  "Skráin er ekki ýtt á GitHub enn.": "The file has not been pushed to GitHub yet.",
  "Appið les": "The app reads",
  "— nýjar pipeline-skrár sjást ekki fyrr en þær eru committaðar og ýttar.":
    "— new pipeline files are invisible until they are committed and pushed.",
  "Pipeline hefur ekki keyrt": "The pipeline has not run",
  "síðan skrefið var bætt við. Keyrðu": "since the step was added. Run",
  "eða": "or",
  "Netið/GitHub svarar ekki": "The network/GitHub is not responding",
  "— endurhlaða síðuna.": "— reload the page.",
  "Flipinn": "The tab",
  "Stigatafla": "Leaderboard",
  "virkar óháð þessu, hann les": "works independently of this, it reads",
  "Umferðin — GW": "The gameweek — GW",
  "leikmenn með tölur ·": "players with numbers ·",
  "mörk ·": "goals ·",
  "assist ·": "assists ·",
  "hrein blöð · meðalstig": "clean sheets · average points",
  "Þetta er síðasta LOKNA umferðin, ekki yfirstandandi.":
    "This is the last FINISHED gameweek, not the current one.",
  "{0} sjálfsmörk": "{0} own goals",
  "FPL-skilgreining": "FPL definition",
  "Hrein blöð (leikmenn)": "Clean sheets (players)",
  "{0} lið héldu hreinu": "{0} teams kept a clean sheet",
  "Bónus gefinn": "Bonus awarded",
  "xG samtals": "xG total",
  "raun {0}": "actual {0}",
  "xA samtals": "xA total",
  "10+ stiga leikir": "10+ point hauls",
  "Blönk (60+ mín, ≤2 stig)": "Blanks (60+ min, ≤2 pts)",
  "Skot": "Shots",
  "{0} í teig": "{0} in the box",
  "Skot á mark": "Shots on target",
  "{0}% nýting": "{0}% conversion",
  "Í stöng/slá": "Woodwork",
  "Blokkuð skot": "Blocked shots",
  "Hrein blöð eru talin per LEIKMANN, ekki per lið.": "Clean sheets are counted per PLAYER, not per team.",
  "FPL veitir hreint blað þeim sem spilar 60+ mínútur án þess að fá á sig mark":
    "FPL awards a clean sheet to anyone who plays 60+ minutes without conceding",
  "á meðan hann er inni á": "while he is on the pitch",
  "— svo leikmaður sem er tekinn af velli áður en mótherjinn skorar heldur sínu. Dæmi úr þessari umferð: Palace skoraði á 89. mínútu gegn Arsenal, og þrír Arsenal-menn sem fóru af velli á undan (83., 74. og 61. mín) fá hreint blað þótt liðið hafi fengið á sig mark.":
    "— so a player subbed off before the opponent scores keeps his. An example from this gameweek: Palace scored in the 89th minute against Arsenal, and three Arsenal players who came off before that (83rd, 74th and 61st min) get a clean sheet even though the team conceded.",
  "Assist fylgja FPL-skilgreiningu": "Assists follow the FPL definition",
  ", sem er rýmri en Opta — FPL gefur t.d. assist fyrir að vinna víti sem er skorað. Í þessari umferð telur FPL":
    ", which is broader than Opta — FPL awards an assist for winning a penalty that is scored, for instance. In this gameweek FPL counts",
  "en ESPN 17.": "while ESPN counts 17.",
  "Lið vikunnar —": "Team of the week —",
  "Besta leyfilega FPL-uppstilling úr umferðinni (1 markv. · 3–5 vörn · 2–5 miðja · 1–3 sókn). Ekki FPL-„Dream Team“ heldur reiknað úr sömu tölum.":
    "The best legal FPL formation from the gameweek (1 GK · 3–5 DEF · 2–5 MID · 1–3 FWD). Not the FPL \"Dream Team\" but computed from the same numbers.",
  "Yfir væntingum": "Over expectation",
  "Mörk + assist mínus xGI. Klínísk nýting eða heppni.": "Goals + assists minus xGI. Clinical finishing or luck.",
  "Undir væntingum": "Under expectation",
  "Færin voru þarna en fóru ekki inn.": "The chances were there but did not go in.",
  "Stigahæstir": "Top scorers",
  "BPS — bónus-stigin": "BPS — the bonus points system",
  "BPS ræður hverjir fá 3/2/1 bónus.": "BPS decides who gets 3/2/1 bonus.",
  "{0} bónus": "{0} bonus",
  "Varnarframlag (DC)": "Def. contribution (DC)",
  "Skot-gögn eru ekki komin.": "Shot data has not arrived.",
  "Pipeline hefur ekki skrifað": "The pipeline has not written",
  "enn (ESPN-hlutinn,": "yet (the ESPN part,",
  "Allir leikir": "All matches",
  "Öll lið": "All teams",
  "Lóðrétti ásinn er fjarlægð frá markinu sem sótt er að":
    "The vertical axis is the distance from the goal being attacked",
  "— mælt, ekki gefið: í CRY 1–2 ARS liggja öll þrjú mörkin nálægt marki þótt sitt hvort liðið skoraði, svo bæði lið leggjast á sama vallarhelming.":
    "— measured, not assumed: in CRY 1–2 ARS all three goals sit close to goal even though different teams scored them, so both teams land on the same half.",
  "Kvarðinn er kvarðaður": "The scale is calibrated",
  "gegn svæðis-texta ESPN, sem er óháður hnitunum: markteigs-skot nema x≤0,110 og markteigurinn er 5,5/52,5=0,105; teig-skot nema x≤0,336 og teigurinn er 16,5/52,5=0,314. Þess vegna er":
    "against ESPN's zone text, which is independent of the coordinates: six-yard-box shots reach only x≤0.110 and the six-yard box is 5.5/52.5=0.105; penalty-box shots reach only x≤0.336 and the box is 16.5/52.5=0.314. That is why",
  "metrafjöldi = x × 52,5": "metres = x × 52.5",
  ", ekki × 105.": ", not × 105.",
  "skot eru ekki á kortinu": "shots are not on the map",
  "— ESPN skráði engin hnit fyrir þau (0,0).": "— ESPN recorded no coordinates for them (0,0).",
  "Á mark": "On target",
  "Blokkuð": "Blocked",
  "Framhjá": "Off target",
  "Í teig": "In the box",
  "{0} fyrir utan": "{0} outside",
  "Hægri / vinstri / haus": "Right / left / head",
  "Skotin": "The shots",
  "Mín": "Min",
  "Leikmaður": "Player",
  "Útkoma": "Outcome",
  "Svæði": "Zone",
  "Fótur": "Foot",
  "Fyrstu 120 af": "First 120 of",
  "sýnd.": "shown.",
  "* ótraust hnit — ekki á kortinu.": "* unreliable coordinates — not on the map.",
  "Miðja teigs": "Centre of the box",
  "Vinstri teig": "Left of the box",
  "Utan teigs": "Outside the box",
  "35+ yardar": "35+ yards",
  "Vinstri": "Left",
  "Haus": "Head",
  /* "M" er HOMOGRAF: Mork her, Midja i stodu-toflunni. Sja samhengis-
     lyklana i i18n.js — "M|mörk" birtist sem "M" a islensku.          */
  "M|mörk": "G",
  "M+A−xGI": "G+A−xGI",
  "{0}G / {1}R": "{0}Y / {1}R",
  "Hægri teig": "Right of the box",
  "Nærfæri": "Close range",
  "Vítapunktur": "Penalty spot",
  "Hægri": "Right",
  "miðja vallar": "halfway line",
  "mark": "goal",
  "Engin skot með nothæfum hnitum í þessu vali.": "No shots with usable coordinates in this selection.",
  "Bón": "Bon",
  "Vörsl": "Sav",
  "Skot-dálkarnir koma úr ESPN og eru paraðir við FPL á eftirnafni + liði.":
    "The shot columns come from ESPN and are matched to FPL on surname + team.",
  "leikmenn pöruðust,": "players matched,",
  "ekki (þeir hafa engar skot-tölur, ekki núll).": "did not (they have no shot numbers, not zero).",
  "Á móti": "Against",
  "Úr ESPN": "From ESPN",
  "Stöng": "Wood",
  "Færi sköpuð — hversu oft hann lagði upp skot (úr ESPN)":
    "Chances created — how often he set up a shot (from ESPN)",
  "Færi": "Chances",
  "Krossar sem leiddu til skots (úr ESPN)": "Crosses that led to a shot (from ESPN)",
  "Kross": "Cross",
  "Through balls sem leiddu til skots (úr ESPN)": "Through balls that led to a shot (from ESPN)",
  "Þ.bolti": "T.ball",
  "Fyrstu 250 af": "First 250 of",
  "· uppstilling ·": "· formation ·",
  "xG (úr FPL, lagt saman)": "xG (from FPL, summed)",
  "úr E0": "from E0",
  "Skot (E0)": "Shots (E0)",
  "Á mark (E0)": "On target (E0)",
  "Hornspyrnur": "Corners",
  "Brot": "Fouls",
  "Dómari:": "Referee:",
  "úr ESPN": "from ESPN",
  "Vald á bolta %": "Possession %",
  "Sendingar": "Passes",
  "Nákvæmni %": "Accuracy %",
  "Krossar": "Crosses",
  "Tacklingar": "Tackles",
  "Rof": "Interceptions",
  "Hreinsanir": "Clearances",
  "Rangstöður": "Offsides",
  "Stjarna:": "Star:",
  "stig,": "pts,",
  "{0} — {1} stig, {2} BPS": "{0} — {1} pts, {2} BPS",
  "Engar tölur.": "No numbers.",

/* ================= PlayerList.jsx ================= */
  "Leita að tölu": "Search for a stat",
  "veldu tölu": "pick a stat",
  "engin tala passar við „": "no stat matches \"",
  "Fylgir EKKI valdu tímabili": "Does NOT follow the selected season",
  "nú": "now",
  "mitt lið": "my squad",
  "Leikmenn": "Players",
  "söguleg tölur": "historical numbers",
  "hreinsa allt": "clear all",
  "— öll árstíðarsvið eru núll fyrir alla": "— every season field is zero for all",
  "leikmenn, svo þessi sýn hefur engar tölur að raða. Veldu":
    "players, so this view has no numbers to sort. Pick",
  "eldra tímabil": "an earlier season",
  "í fellilistanum.": "in the dropdown.",
  "ekki hafið — sýnir": "not started — showing",
  "af hverju?": "why?",
  ", svo listinn sýnir": ", so the list shows",
  ". Verð, staða og eignarhlutfall eru samt": ". Price, position and ownership are still",
  "úr dagsins gögnum": "from today's data",
  "— þú kaupir á verði dagsins, ekki á verði": "— you buy at today's price, not at the price of",
  "fela": "hide",
  "Þessi flokkur sýnir NÚTÍMA-gögn": "This group shows CURRENT data",
  "— ekki": "— not",
  ". Hann byggir á síðustu loknu umferð, form-glugganum eða leikjum framundan, svo hann breytist ekki þótt þú veljir annað tímabil. Árstíðar-summurnar (Grunnur, Sókn, Vörn …) fylgja hins vegar":
    ". It is based on the last finished gameweek, the form window or upcoming fixtures, so it does not change when you pick another season. The season totals (Basics, Attack, Defence …) do follow",
  "Verðbil í milljónum": "Price range in millions",
  "til": "to",
  "+ lið": "+ team",
  "Aðeins stjörnumerktir": "Starred players only",
  "★ vaktlisti (": "★ watchlist (",
  "Aðeins leikmenn í mínu liði": "Only players in my squad",
  "mitt lið (": "my squad (",
  "fela valda (": "hide selected (",
  "fela valda": "hide selected",
  "★ vaktlisti": "★ watchlist",
  "Fjarlægja {0} af vaktlista": "Remove {0} from the watchlist",
  "Setja {0} á vaktlista": "Add {0} to the watchlist",
  "Þröskuldur:": "Threshold:",
  "tala": "number",
  "bæta við": "add",
  "{0} dálkar hafa engin gögn í {1}": "{0} columns have no data in {1}",
  "fela tóma": "hide empty",
  "sýna tóma dálka ({0})": "show empty columns ({0})",
  "Enginn leikmaður passar.": "No player matches.",
  "Virkar síur:": "Active filters:",
  "engar": "none",
  "hreinsa þröskulda og verðbil": "clear thresholds and price range",
  "Sýna alla": "Show all",
  "Sýna aðeins vaktlista": "Show watchlist only",
  "Eign %": "Owned %",
  "Byrjunar-líkur — mælt, sjá Bekkjar-hætta": "Start probability — measured, see Bench risk",
  "Byrjar": "Starts",
  "Á vaktlista — smelltu til að fjarlægja": "On the watchlist — click to remove",
  "Setja á vaktlista": "Add to the watchlist",
  "Ekki leikhæfur": "Not available",
  "Engin gögn í {0}": "No data in {0}",
  "Byrjaði síðast en er í bekkjar-hættu": "Started last time but is at risk of the bench",
  "Í samanburði": "In the comparison",
  "Bæta í samanburð": "Add to the comparison",
  "= reiknað af okkur úr FPL-sviðum.": "= computed by us from FPL fields.",
  "= gögn vantar (ekki núll) og raðast": "= data missing (not zero) and always sorts",
  "alltaf síðast": "last",
  ", í báðar áttir. Dálkar sem eru tómir fyrir alla í": ", in both directions. Columns empty for everyone in",
  "eru faldir — kveiktu á þeim með hnappnum. Smelltu á haus til að raða, á nafn til að opna spjaldið, á":
    "are hidden — turn them on with the button. Click a header to sort, a name to open the card,",
  "til að bera saman.": "to compare.",
  "setur á vaktlista (vistast milli heimsókna); stjarnan í hausnum sýnir aðeins vaktlistann.":
    "adds to the watchlist (saved between visits); the star in the header shows the watchlist only.",
  "Græn rönd": "A green stripe",
  "= leikmaður í þínu liði — röndin er á nafna-hólfinu því röðin skrunar til hliðar.":
    "= a player in your squad — the stripe is on the name cell because the row scrolls sideways.",

/* ================= PlayerPanel.jsx ================= */
  "Breyta innkaupsverði": "Edit the purchase price",
  "keypt £": "bought £",
  "· sala £": "· sell £",
  "ekki hafið": "not started",
  "Stig/leik": "Points/match",
  "rúllandi 30 dagar": "rolling 30 days",
  "Eignarhlutfall": "Ownership",
  "{0} af {1}": "{0} of {1}",
  "Byrjaðir / stig 90": "Starts / points 90",
  "Byrjaðir leikir og stig per 90 mínútur": "Starts and points per 90 minutes",
  "Mörk / xG / xG90": "Goals / xG / xG90",
  "Assist / xA / xA90": "Assists / xA / xA90",
  "Mörk á sig og vænt mörk á sig — lægra er betra":
    "Goals conceded and expected goals conceded — lower is better",
  "Varnarframlag alls og per byrjaðan leik. Kom fyrst 2025/26.":
    "Defensive contribution in total and per start. First appeared in 2025/26.",
  "Tímabil": "Season",
  "sæti er röðun meðal allra sem spiluðu það tímabil":
    "the rank is among everyone who played that season",
  "engin fyrri tímabil skráð á þennan leikmann": "no earlier seasons on record for this player",
  "er ekki hafið.": "has not started.",
  "FPL birtir enn lokatölur fyrra tímabils í þessum reitum, svo þær eru":
    "FPL still shows last season's final numbers in these fields, so they are",
  "sýndar undir": "shown under",
  "— það væri tvítekning á": "— that would duplicate",
  "fyrra tímabili": "last season",
  "undir röngu ártali. Dálkurinn fyllist þegar GW1 er lokið.":
    "under the wrong year. The column fills up once GW1 is finished.",
  "Feitletrað grænt": "Bold green",
  "= hærra en næsta tímabil á undan ·": "= higher than the season before ·",
  "= lægra. Fyrir": "= lower. For",
  "og": "and",
  "er þessu snúið við — lægra er betra. Sæti er meðal allra sem spiluðu það tímabil.":
    "this is reversed — lower is better. The rank is among everyone who played that season.",
  "Innkaupsverð —": "Purchase price —",
  "Söluverð reiknast af þessu: kaupverð + 50% af hagnaði, niðurjafnað á næstu 0,1.":
    "The sell price is derived from this: purchase price + 50% of the profit, rounded down to the nearest 0.1.",
  "Vista": "Save",
  "Hreinsa (nota núverandi verð)": "Clear (use the current price)",
  "Hætta við": "Cancel",

/* ================= Rotation.jsx ================= */
  "Auð umferð — leikmaðurinn spilar ekki og fær 0 stig":
    "Blank gameweek — the player does not play and gets 0 points",
  "{0} — FFDR {1} ({2})": "{0} — FFDR {1} ({2})",
  "\nTVÖFÖLD UMFERÐ": "\nDOUBLE GAMEWEEK",
  "FFDR-samanburður — róterings-par": "FFDR comparison — rotation pair",
  "Umferðir": "Gameweeks",
  "allar": "all",
  "Verðþak": "Price cap",
  "sama verð": "same price",
  "ekkert þak": "no cap",
  "Erfitt frá": "Hard from",
  "hlutlaust (hvítt)": "neutral (white)",
  "aðeins mitt lið": "my squad only",
  "Loka": "Close",
  "Enginn valinn. Opnaðu leikmann á vellinum og smelltu á":
    "None selected. Open a player on the pitch and click",
  "Finnur mann sem á": "Finds a player with",
  "léttar umferðir NÁKVÆMLEGA þar sem þínir eru þungir":
    "easy gameweeks EXACTLY where yours are hard",
  ". Þetta er annað en FFDR-taflan: maður með betri 6 umferðir í heild er gagnslaus sem par ef hann er þungur í sömu umferðunum.":
    ". This is a different question from the FFDR table: a player with better 6 gameweeks overall is useless as a pair if he is hard in the same gameweeks.",
  " Markmaður valinn — því eru aðeins markmenn í boði.":
    " A goalkeeper is selected — so only goalkeepers are offered.",
  " Allar stöður nema markmenn eru í boði.": " Every position except goalkeeper is offered.",
  "Erfið umferð — þyngd {0}": "Hard gameweek — weight {0}",
  "Í lagi": "Fine",
  "Hlutfall þyngdarinnar í erfiðu umferðunum sem hann mætir með hlutlausum leik eða betri":
    "The share of the weight in the hard gameweeks that he meets with a neutral fixture or better",
  "Þekja": "Cover",
  "Vænt stig hans mínus vænt stig þess sem hann kemur inn fyrir, lagt saman yfir erfiðu umferðirnar":
    "His expected points minus those of the player he replaces, summed over the hard gameweeks",
  "Vinn.": "Gain",
  "Taka úr samanburði": "Remove from the comparison",
  "erfið": "hard",
  "erfiðar": "hard",
  "Bæta öðrum við:": "Add another:",
  "— veldu —": "— select —",
  "Engar erfiðar umferðir næstu": "No hard gameweeks in the next",
  "— ekkert að leysa. Þessi maður má vera inni.": "— nothing to solve. This player can stay in.",
  "Enginn þekur þessar umferðir innan þaksins": "Nobody covers these gameweeks within the cap",
  " í liðinu þínu": " in your squad",
  ". Hækkaðu verðþakið": ". Raise the price cap",
  " eða slepptu „aðeins mitt lið“": " or drop \"my squad only\"",
  "BESTU PÖR — raðað eftir vinningi í erfiðu umferðunum":
    "BEST PAIRS — sorted by gain in the hard gameweeks",
  "Þegar í liðinu þínu — engin skipti": "Already in your squad — no transfer needed",
  "í liðinu": "in squad",
  "Sömu leikir — FFDR er eiginleiki LIÐSINS:\n": "Same fixtures — FFDR is a property of the TEAM:\n",
  "= umferð sem þinn maður á erfiða (dökkgult, ljósrautt, rautt) eða":
    "= a gameweek your player has hard (dark yellow, light red, red) or",
  "auða": "blank",
  "; auð umferð telst þyngst því hún gefur 0 stig. Rauður rammi merkir þær.":
    "; a blank counts heaviest because it gives 0 points. A red outline marks them.",
  "= tvöföld umferð.": "= double gameweek.",
  "er FFDR-svarið: hversu miklu af erfiðleikunum hann mætir með hlutlausum leik eða betri.":
    "is the FFDR answer: how much of the difficulty he meets with a neutral fixture or better.",
  "er ákvörðunin: vænt stig hans mínus þess sem hann kemur inn fyrir, aðeins í erfiðu umferðunum. Raðað eftir vinningi — hrein þekja setur menn í slökum liðum á toppinn.":
    "is the decision: his expected points minus those of the player he replaces, in the hard gameweeks only. Sorted by gain — pure cover puts players in weak teams on top.",
  "Ein röð per LIÐ — FFDR er eiginleiki liðsins, svo allir varnarmenn sama félags eiga sömu leiki;":
    "One row per TEAM — FFDR is a property of the team, so every defender at the same club has the same fixtures;",
  "eru hinir í sama liði.": "are the others at that team.",
  "ekkert": "none",
  " Hlutlausir (hvítir) leikir teljast með, og þá þarf parið að vera GRÆNT.":
    " Neutral (white) fixtures count too, and then the pair has to be GREEN.",
  "Hreinsa val": "Clear selection",

/* ================= SetPieces.jsx ================= */
  "Víti": "Penalties",
  "Horn": "Corners",
  "Föst leikatriði": "Set pieces",
  " Uppfært {0}.": " Updated {0}.",
  "Fyrirliðar (armbandið) eru ekki hér.": "Captains (the armband) are not here.",
  "Hvorki FPL-API-ið né ESPN-fæðið gefur hver ber fyrirliðabandið, svo við sýnum það ekki frekar en að giska. Það sem er":
    "Neither the FPL API nor the ESPN feed says who wears the armband, so we do not show it rather than guess. What is",

/* ================= stats.js ================= */
  /* Flokkar */
  "Væntingar (xG/xA)": "Expected (xG/xA)",
  "Bónus og ICT": "Bonus and ICT",
  "Verð og eignarhald": "Price and ownership",
  "Ógn (ESPN, síðasta umferð)": "Threat (ESPN, last gameweek)",
  "Form-gluggi (síðustu 4–5)": "Form window (last 4–5)",
  "Leikir framundan": "Upcoming fixtures",
  "FPL-sæti (innan stöðu)": "FPL rank (within position)",
  "Spjöld og refsingar": "Cards and penalties",
  /* Toluheiti — MEGA EKKI vera >22 stafir (toflufhaus er 88 px) */
  "Stig/90": "Points/90",
  "Stig deilt á spilaðar mínútur × 90. Refsar ekki fyrir litla spilun eins og stig/leik.":
    "Points divided by minutes played × 90. Does not punish limited minutes the way points/match does.",
  "Byrjunarlið": "Starts",
  "Byrjunarhlutfall": "Start rate",
  "Opinber FPL-tala (starts_per_90) — 1,0 = byrjar alltaf þegar hann spilar.":
    "Official FPL figure (starts_per_90) — 1.0 = always starts when he plays.",
  "FPL-form: meðalstig síðustu 30 daga.": "FPL form: average points over the last 30 days.",
  "Lið vikunnar": "Team of the week",
  "Hversu oft leikmaðurinn hefur komist í FPL-lið vikunnar.":
    "How often the player has made the FPL team of the week.",
  "M+A /90": "G+A /90",
  "Mín/framlag": "Mins/involvement",
  "Mínútur per mark eða assist. Lægra er betra. Tómt ef ekkert framlag.":
    "Minutes per goal or assist. Lower is better. Empty if there is no involvement.",
  "Yfir núlli = skorar meira en færin gefa (klínísk nýting eða heppni). Undir núlli = klúðrar færum.":
    "Above zero = scores more than the chances imply (clinical finishing or luck). Below zero = wastes chances.",
  "Framlög − xGI": "Involvements − xGI",
  "Heildarmunur á raunverulegum framlögum og væntum. Sterkasta einstaka merkið um óheppni/heppni.":
    "The total gap between real and expected involvements. The single strongest signal of bad or good luck.",
  "Hreint blað %": "Clean sheet %",
  "Hreint blað deilt á byrjunarliðs-leiki.": "Clean sheets divided by starts.",
  "Mörk á sig − xGC": "Conceded − xGC",
  "Undir núlli = vörnin (eða markvörðurinn) heldur betur en færin gefa.":
    "Below zero = the defence (or the goalkeeper) holds up better than the chances imply.",
  "Vörslur/90": "Saves/90",
  "Opinber FPL-tala (saves_per_90).": "Official FPL figure (saves_per_90).",
  "Vörsluhlutfall %": "Save %",
  "Vörslur / (vörslur + mörk á sig). Gróft — FPL telur ekki skot á mark per markvörð.":
    "Saves / (saves + goals conceded). Rough — FPL does not count shots on target per keeper.",
  "FPL DefCon-stig. Athugið: DC er VILJANDI utan FFDR — sjá kafla 3 í CLAUDE.md.":
    "FPL DefCon points. Note: DC is DELIBERATELY outside FFDR — see section 3 in CLAUDE.md.",
  "Opinber FPL-tala (defensive_contribution_per_90).":
    "Official FPL figure (defensive_contribution_per_90).",
  "Hreint blað /90": "Clean sheets /90",
  "Opinber FPL-tala (clean_sheets_per_90) — ólíkt CS% sem deilir á byrjunarliðs-leiki.":
    "Official FPL figure (clean_sheets_per_90) — unlike CS%, which divides by starts.",
  "Mörk á sig /90": "Conceded /90",
  "Opinber FPL-tala (goals_conceded_per_90).": "Official FPL figure (goals_conceded_per_90).",
  "Opinber FPL-tala (expected_goals_conceded_per_90).":
    "Official FPL figure (expected_goals_conceded_per_90).",
  "Hreinsanir/blokk/rof": "Clear/block/intercept",
  "Endurheimtur": "Recoveries",
  "ICT-vísitala": "ICT index",
  "Áhrif": "Influence",
  "Sköpun": "Creativity",
  "Hætta": "Threat",
  "FPL-mæling á hversu hættulegar stöður leikmaðurinn kemst í.":
    "FPL's measure of how dangerous the positions the player gets into are.",
  "Stig per m": "Points per m",
  "FPL-eigin verðmæta-tala (value_season): heildarstig deilt á núverandi verð.":
    "FPL's own value figure (value_season): total points divided by the current price.",
  "Form per milljón": "Form per million",
  "FPL-eigin value_form: form deilt á verð — verðmæti í NÚVERANDI formi.":
    "FPL's own value_form: form divided by price — value at CURRENT form.",
  "Eignarhald %": "Ownership %",
  "Verðbreyting": "Price change",
  "Breyting frá byrjun tímabils.": "Change since the start of the season.",
  "Verðbreyting í umferð": "Price change (GW)",
  "Verðbreyting í yfirstandandi umferð.": "Price change in the current gameweek.",
  "Nettóflutningar": "Net transfers",
  "Inn mínus út í yfirstandandi umferð.": "In minus out in the current gameweek.",
  "Stig/leik — sæti": "Points/match — rank",
  "Sæti í stig/leik innan stöðunnar (FPL points_per_game_rank_type).":
    "Rank in points/match within the position (FPL points_per_game_rank_type).",
  "Form — sæti": "Form — rank",
  "ICT — sæti": "ICT — rank",
  "Áhrif — sæti": "Influence — rank",
  "Sköpun — sæti": "Creativity — rank",
  "Hætta — sæti": "Threat — rank",
  "Eignarhald — sæti": "Ownership — rank",
  "Sæti í eignarhaldi innan stöðunnar — lágt sæti = mikið eignað.":
    "Rank in ownership within the position — a low rank = widely owned.",
  "Verð — sæti": "Price — rank",
  "Sæti í verði innan stöðunnar — 1 = dýrastur.":
    "Rank in price within the position — 1 = most expensive.",
  /* Skot-tegundir (ESPN) */
  "Mark": "Goal",
  "Blokkað": "Blocked",
  "Sjálfsmark": "Own goal",
  /* Byrjunar-likur */
  "Byrjar líklega": "Likely to start",
  "Óvíst": "Uncertain",
  "Bekkjar-hætta þrátt fyrir að hafa byrjað": "Bench risk despite having started",
  "Byrjar ólíklega": "Unlikely to start",
  /* Afleiddar tolur */
  "Mörk /90": "Goals /90",
  "Assist /90": "Assists /90",
  "Nýting mörk": "Goal conversion",
  "Yfir 1,00 = skorar meira en færin gefa. Undir = klúðrar. Þarf xG>0,5 til að vera merkingarbært.":
    "Above 1.00 = scores more than the chances imply. Below = wasteful. Needs xG>0.5 to mean anything.",
  "Nýting assist": "Assist conversion",
  "Vænt framlög á hverja milljón — verðmæti UNDIRLIGGJANDI, ekki stiga.":
    "Expected involvements per million — value of the UNDERLYING, not of points.",
  "xG-hlutur": "xG share",
  "Hversu stór hluti af væntum mörkum liðsins kemur frá honum. Normaliserar fyrir liðsstyrk.":
    "How much of the team's expected goals comes from him. Normalises for team strength.",
  "Hreins/blokk /90": "Clear/block /90",
  "Tacklingar /90": "Tackles /90",
  "Endurheimtur /90": "Recoveries /90",
  "Bónus /90": "Bonus /90",
  "Bónus-hlutur": "Bonus share",
  "Hve stór hluti stiga kom úr bónus. Hátt = háður bónus, sem er sveiflukenndara.":
    "How much of his points came from bonus. High = bonus-dependent, which is more volatile.",
  "Bón/100 BPS": "Bon/100 BPS",
  "Hversu vel BPS breytist í raunverulegan bónus — hátt = hann er oft í topp-3 í sínum leik.":
    "How well BPS converts into real bonus — high = he is often in the top 3 of his match.",
  "Hætta /90": "Threat /90",
  "Sköpun /90": "Creativity /90",
  "Bónus per m": "Bonus per m",
  "Mín. per m": "Mins per m",
  "Spilatími á hverja milljón — hversu ódýrt þú kaupir mínútur.":
    "Playing time per million — how cheaply you buy minutes.",
  /* Ogn (ESPN) */
  "Skot í síðustu loknu umferð (ESPN).": "Shots in the last finished gameweek (ESPN).",
  "Skotnýting": "Shot conversion",
  "Skot í teig": "Shots in the box",
  "Woodwork — eigin leiktegund hjá ESPN.": "Woodwork — its own event type at ESPN.",
  "Færi skópuð": "Chances created",
  "Hversu oft hann lagði upp skot (lesið úr ESPN-texta).":
    "How often he set up a shot (read from ESPN's text).",
  "Krossar→skot": "Crosses→shots",
  "Krossar sem LEIDDU TIL SKOTS — ekki hráar krossatölur.":
    "Crosses that LED TO A SHOT — not raw cross counts.",
  /* Form-gluggi */
  "Mín. í glugga": "Mins in window",
  "xG í glugga": "xG in window",
  "xA í glugga": "xA in window",
  "Hætta gl.": "Threat (win.)",
  "Sköpun gl.": "Creativity (win.)",
  /* IG/IA, EKKI GI/AI — "GI" er FOST FPL-SKAMMSTOFUN fyrir *goal
     involvement* (mork+assist), og thessi sama tafla hefur dalkana xGI,
     xGI/90, xGI per m og "Framlög − xGI". Dalkur sem heitir GI vid hlid
     theirra lesst sem UPPSAFNAD FRAMLAG, en mó er SPA um framlag sem er
     ekki komid. IG/IA fylgir lika skyringunni ("Imminent goal").
     ATH: thetta var TVISKILGREINT (IG i einni lotu, GI i annarri) og JS
     helt thegjandi seinni — sja duplicate-vordinn i tests/i18n.mjs.     */
  "mó": "IG",
  "Mark óhjákvæmilegt. Mælt: efsti tíundarhluti skorar 2,89× meðaltalið. Aðeins fyrir 0–1 framlag í glugga.":
    "Imminent goal. Measured: the top decile scores 2.89× the average. Only for 0–1 involvements in the window.",
  "aó": "IA",
  "Assist óhjákvæmilegt. Bert creativity/90 — samsettur stuðull féll á mælingu (0/3 tímabil).":
    "Imminent assist. Plain creativity/90 — a composite score failed on measurement (0/3 seasons).",
  "Byrjunar-líkur": "Start probability",
  "Líkur á 60+ mínútum næst. Mælt á 65.557 sýnum; lægsti tíundarhluti fangar 2,09× bekkjar-föllin.":
    "Probability of 60+ minutes next. Measured on 65,557 samples; the lowest decile captures 2.09× the bench drops.",
  /* Leikir framundan */
  "FDR næstu 6": "FDR next 6",
  "Meðal-FDR næstu sex leikja (opinbert FPL-FDR). Lægra er léttara.":
    "Average FDR over the next six matches (official FPL FDR). Lower is easier.",
  "Heima /6": "Home /6",
  "Leikir /6": "Matches /6",
  "Undir 6 = auð umferð. Yfir 6 = tvöföld umferð.":
    "Below 6 = a blank gameweek. Above 6 = a double gameweek.",
  "CS-líkur liðsins": "Team CS probability",
  "Úr bókmakera-línu (odds.json).": "From the bookmaker line (odds.json).",
  "DefCon liðs": "Team DefCon",
  /* Fost leikatridi */
  "Víta-röð": "Penalty order",
  "1 = fyrsti vítataki. Sterkasta einstaka fyrirliða-vísbendingin í gögnunum.":
    "1 = first penalty taker. The single strongest captaincy signal in the data.",
  "Aukasp.-röð": "FK order",
  "Horna-röð": "Corner order",
  "Spjöld /90": "Cards /90",

/* ================= Leaderboard.jsx ================= */
  "Sæki leikmannagögn…": "Fetching player data…",
  "Hverjir eru í bekkjar-hættu þrátt fyrir að hafa byrjað":
    "Who is at risk of the bench despite having started",
  "Bekkjar-hætta": "Bench risk",
  "Hverjir eru við það að skora eða leggja upp": "Who is about to score or assist",
  "Óhjákvæmilegt": "Imminent",
  "Tafla": "Table",
  "Enginn leikmaður hefur spilaðar mínútur í þessum gögnum — tímabilið er ekki byrjað. Töflurnar fyllast þegar GW1 er lokið.":
    "No player has minutes played in this data — the season has not started. The tables fill up once GW1 is finished.",
  "Leita að leikmanni": "Search for a player",
  "Sleppir leikmönnum undir {0} mín í /90- og %-tölum. Verndar gegn 12-mínútna úrtökum.":
    "Skips players below {0} min in /90 and % figures. Guards against 12-minute samples.",
  "mín.": "min.",
  "mín í hlutfallstölum": "min in rate figures",
  "aðeins leikhæfir": "available only",
  "Þetta eru FPL-sæti INNAN stöðunnar": "These are FPL ranks WITHIN the position",
  ", ekki meðal allra leikmanna — svo hver staða á sinn nr. 1. Þess vegna sjást fjórir með „1\" þegar ekki er síað á stöðu (besti GK, besti DEF, besti MID, besti FWD).":
    ", not among all players — so each position has its own no. 1. That is why four players show \"1\" when no position filter is set (best GK, best DEF, best MID, best FWD).",
  "Lægra er betra.": "Lower is better.",
  "Dæmi: Raya er með 4,4 stig/leik → sæti": "Example: Raya has 4.4 points/match → rank",
  "innan markvarða en 32. yfir alla.": "among goalkeepers but 32nd overall.",
  "Reiknað af okkur úr FPL-sviðum": "Computed by us from FPL fields",
  "= reiknað af okkur úr FPL-sviðum, ekki svið sem FPL birtir sjálft. Hlutfallstölur (/90, %) hlýða mínútu-þakinu; heildartölur ekki.":
    "= computed by us from FPL fields, not a field FPL publishes itself. Rate figures (/90, %) obey the minutes floor; totals do not.",
  "Sæki": "Fetching",
  "… pipeline hefur ekki skrifað hana enn.": "… the pipeline has not written it yet.",
  "⚽ Mark óhjákvæmilegt": "⚽ Goal imminent",
  "◎ Assist óhjákvæmilegt": "◎ Assist imminent",
  "SAFN · ": "ARCHIVE · ",
  "Hverjir eru við það að skora.": "Who is about to score.",
  "Aðeins leikmenn með": "Only players with",
  "0–1 framlag": "0–1 involvement",
  "í síðustu": "in the last",
  "umferðum — sá sem er þegar sprunginn út þarf enga spá. Stuðullinn er":
    "gameweeks — a player who has already exploded needs no forecast. The score is",
  "xG·0,8 + threat/25·0,3 + óheppni·0,2": "xG·0.8 + threat/25·0.3 + bad luck·0.2",
  "mældur": "measured",
  "á 13.273 sýnum yfir 3 tímabil: efsti tíundarhlutinn skorar":
    "on 13,273 samples over 3 seasons: the top decile scores",
  "2,89×": "2.89×",
  "meðaltalið, á móti 2,70 fyrir xG eitt og 2,78 fyrir threat eitt (út af úrtaki, 2/3 tímabil).":
    "the average, against 2.70 for xG alone and 2.78 for threat alone (out of sample, 2/3 seasons).",
  "Hverjir eru við það að leggja upp.": "Who is about to assist.",
  "Þetta er": "This is",
  "bert creativity/90": "plain creativity/90",
  "— og það er niðurstaða mælingar, ekki leti: samsettur aó-stuðull (xA + creativity + óheppni) var prófaður og":
    "— and that is a measured result, not laziness: a composite IA score (xA + creativity + bad luck) was tested and",
  "féll": "failed",
  ", 2,18 á móti 2,21 fyrir bert creativity, og tapaði í":
    ", 2.18 against 2.21 for plain creativity, and lost in",
  "0 af 3": "0 of 3",
  "tímabilum. xA-vogin valdist alltaf 0. Við birtum því það sem virkar.":
    "seasons. The xA weight was always selected as 0. So we show what works.",
  "mó-stuðull": "IG score",
  "aó-stuðull": "IA score",
  "xG per umferð": "xG per gameweek",
  "creativity per umferð": "creativity per gameweek",
  "xG mínus mörk — hversu mikið hann á inni": "xG minus goals — how much he is owed",
  "á inni": "owed",
  "framlag": "involvement",
  "Enginn leikmaður í markhóp í þessum glugga.": "No player in the target group in this window.",
  "Hverjir eru í bekkjar-hættu þrátt fyrir að hafa byrjað síðast.":
    "Who is at risk of the bench despite having started last time.",
  "Af þeim sem byrjuðu síðast spila": "Of those who started last time,",
  "EKKI 60+ mínútur næst — og það eru dýrustu einstöku mistökin í FPL.":
    "do NOT play 60+ minutes next — and that is the single most expensive mistake in FPL.",
  "Mælt á": "Measured on",
  "sýnishornum yfir": "samples over",
  "tímabil. Líkanið er": "seasons. The model is",
  "ekki nákvæmara": "not more accurate",
  "en reglan „byrjaði síðast\" (88,0% á móti 88,2% yfir alla leikmenn) — það væri óheiðarlegt að segja annað. Ábatinn er annars staðar: það er":
    "than the rule \"started last time\" (88.0% against 88.2% across all players) — it would be dishonest to claim otherwise. The gain is elsewhere: it is",
  "betur kvarðað": "better calibrated",
  "á móti": "against",
  ", −24%) svo hægt er að": ", −24%) so you can",
  "raða": "rank",
  "eftir hættu, og lægsti tíundarhlutinn fangar": "by risk, and the lowest decile captures",
  "þeirra sem falla á bekk —": "of those who drop to the bench —",
  "× lyfting": "× lift",
  ", samhljóða í öllum þrem tímabilum.": ", consistent across all three seasons.",
  "Hvíld (<4 dagar) hafði engin áhrif og er ekki í líkaninu.":
    "Rest (<4 days) had no effect and is not in the model.",
  "Bekkjar-hætta (": "Bench risk (",
  "Enginn í þessum flokki í núverandi glugga.": "Nobody in this group in the current window.",
  "mínútur síðustu": "minutes over the last",
  "Öruggastir": "Safest",
  "Opna fulla töflu": "Open the full table",
  "hæst": "highest",
  "lægst": "lowest",
  "Engar tölur": "No numbers",
  "{0} leikmenn undir {1} mín eru ekki með": "{0} players below {1} min are excluded",
  "undir mínútu-þaki": "below the minutes floor",
  "af": "of",
  "Ekki fullkomlega leikhæfur": "Not fully available",
  "Enginn leikmaður með tölu í þessum flokki.": "No player has a number in this group.",
  "sýndir.": "shown.",
  " {0} sleppt vegna mínútu-þaks ({1} mín).": " {0} skipped by the minutes floor ({1} min).",
  "tekinn út": "removed",
  "— FPL-API-ið gefur tölu sem er ómöguleg miðað við 0 spilaðar mínútur.":
    "— the FPL API gives a number that is impossible given 0 minutes played.",
  /* POS_TABS og POS_LABEL: lyklarnir eru islenskir, thydast a notkunarstad */
  "Markv.": "GK",
  "MV": "GK",
  "V": "D",
  "M": "M",
  "S": "F",
  /* PlayerList POS: eins a badum malum, en verda ad vera i ordabokinni
     svo t() skrai their ekki sem vantandi.                             */
  "GK": "GK",
  "DEF": "DEF",
  "MID": "MID",
  "FWD": "FWD",

/* ================= ErrorBoundary.jsx ================= */
  "Eitthvað brotnaði": "Something broke",
  "Appið gat ekki teiknað þessa sýn. Öll gögn eru óskemmd á GitHub — þetta er villa í viðmótinu, ekki í gögnunum þínum.":
    "The app could not render this view. All your data is intact on GitHub — this is a bug in the interface, not in your data.",
  "Endurhlaða": "Reload",
  "Hreinsa vistaða plönun": "Clear saved planning",
  "já — hreinsa og endurhlaða": "yes — clear and reload",
  "Þetta eyðir skiptaáætlun, fyrirliða, chips, andstæðingum og vaktlista — tungumálið heldur sér. Liðið sjálft kemur úr FPL og hverfur ekki.":
    "This deletes your transfer plan, captain, chips, rivals and watchlist — the language is kept. The squad itself comes from FPL and is unaffected.",
  "Ef appið hrynur við HVERJA hleðslu er vistaða plönunin líklega orsökin.":
    "If the app crashes on EVERY load, the saved planning is the likely cause.",
  "Tæknilegar upplýsingar": "Technical details",

/* ================= i18n.js ================= */
  "Fantasy plönun": "Fantasy planner",
  /* ---- BAETT VID 31.7.: nyir strengir ur annarri lotu (leikmannalisti,
     byrjunar-likur, mó/aó, verdspa). Their voru i kodanum en ekki her, svo
     enska vidmotid hefdi birt islensku. ---- */
  "Opna leikmannalistann — leit, síur og samanburður":
    "Open the player list — search, filters and comparison",
  "🔍 Leita": "🔍 Search",
  /* Threskuldar-flisar i leikmannalistanum: ">= minnst 5" / "<= mest 5". */
  "Elo-gögn eru {0} daga gömul — ClubElo hefur ekki svarað síðan þá.":
    "Elo data is {0} days old — ClubElo has not responded since then.",
  /* CS% ER SKILYRT EN LEIT OSKILYRT UT: 152 af 564 leikmonnum syna
     LIDS-CS% vid hlid PER-LEIKMANNS vaentra stiga. Fyrirvarinn segir
     baedi skilyrdin. Odyrasta lagfaeringin i allri yfirferdinni.        */
  "Líkur á hreinu blaði — LIÐSINS, ekki leikmannsins. Hann fær stigin aðeins ef liðið heldur hreinu OG hann spilar 60+ mín.":
    "Clean-sheet probability — for the TEAM, not the player. He only gets the points if the team keeps a clean sheet AND he plays 60+ mins.",
  "Líkur á hreinu blaði að meðaltali yfir sviðið — LIÐSINS. Leikmaðurinn fær stigin aðeins ef hann spilar 60+ mín.":
    "Average clean-sheet probability over the range — for the TEAM. The player only gets the points if he plays 60+ mins.",
  /* STADFEST BYRJUNARLID (lineups.json). Stadfesting, ekki spa. */
  /* ThRIR NAESTU LEIKIR A SPJALDINU (1.8.2026) */
  "Auð umferð — hann spilar ekki og fær 0 stig":
    "Blank gameweek — he does not play and scores 0",
  "TVÖFÖLD UMFERÐ": "DOUBLE GAMEWEEK",
  "Staðfest byrjunarlið": "Confirmed lineups",
  "BYRJAR": "STARTS",
  "BEKKUR": "BENCHED",
  "STAÐFEST í byrjunarliði (úr uppstillingu leiksins)":
    "CONFIRMED in the starting XI (from the match lineup)",
  "STAÐFEST Á BEKKNUM — hann byrjar EKKI þennan leik":
    "CONFIRMED ON THE BENCH — he is NOT starting this match",
  "minnst": "min",
  "mest": "max",
  "Líkur á 60+ mínútum — mælt líkan (Brier 0,089 á móti 0,118 fyrir „byrjaði síðast\"). Glugginn er SÍÐUSTU 5 LOKNU UMFERÐIR; fyrir tímabil eru það lok síðasta tímabils, þar sem hvíld og rótasjón eru miklar. Undir 50% = bekkjar-hætta.":
    "Chance of 60+ minutes — measured model (Brier 0.089 vs 0.118 for \"started last time\"). The window is the LAST 5 COMPLETED GAMEWEEKS; in preseason that means the end of last season, when rest and rotation are heavy. Below 50% = bench risk.",
  "mó — magn (xGI) + ógn + óheppni síðustu 4 umferðir. Aðeins fyrir þá sem eru í markhópnum (0–1 framlag, 180+ mín).":
    "Goal imminent — volume (xGI) + threat + bad luck over the last 4 gameweeks. Only for players in the target group (0–1 returns, 180+ mins).",
  "aó — sköpun per 90 mín. Hátt = leggur upp færi en fær ekki assist.":
    "Assist imminent — creativity per 90 mins. High = creating chances without getting the assist.",
  "Líklega hækkun í nótt — NÁLGUN, FPL birtir ekki formúluna":
    "Likely price rise tonight — AN APPROXIMATION, FPL does not publish the formula",
  "Líklega lækkun í nótt (nálgun) — kauptu eftir verðkeyrslunni":
    "Likely price fall tonight (approximation) — buy after the price run",

  /* ---- umferdar-bil, fost leikatridi, skipta-gluggi (31.7.2026) ---- */
  "Umferðir:": "Gameweeks:",
  "allt tímabilið": "whole season",
  "fyrri hluti": "first half",
  "seinni hluti": "second half",
  "hleð…": "loading…",
  "gögn vantar": "data missing",
  "Veldu umferðabil": "Select gameweek range",
  "Bilið gildir um tölur sem má LEGGJA SAMAN. Verð, eignarhald, form, ICT og FPL-sæti eru árstíðartölur og fylgja EKKI bilinu — þeir dálkar eru merktir": "The range applies to numbers that can be SUMMED. Price, ownership, form, ICT and FPL ranks are season figures and do NOT follow the range — those columns are marked",
  "árstíð": "season",
  "og sýna heildina.": "and show the season total.",
  "ÁRSTÍÐARTALA: fylgir ekki umferðabilinu, sýnir heildina": "SEASON FIGURE: does not follow the gameweek range, shows the total",
  "árstíðartala": "season figure",
  "Fyrsti taki hjá hverju liði — úr FPL, uppfærist sjálfkrafa með daglegu gagnasækninni.": "First taker for each team — from FPL, updates automatically with the daily data fetch.",
  "— og skiptir mestu fyrir fantasy — er spyrnu-röðunin: víta­skytta nr. 1 er sterkasta einstaka fyrirliða-vísbendingin sem gögnin geyma.": "— and matters most for fantasy — is the set-piece order: the no. 1 penalty taker is the strongest single captaincy hint the data holds.",
  "FPL hefur ekki skráð röðun fyrir þetta lið": "FPL has no order recorded for this team",
  "FPL-röðun": "FPL order",
  "Táknin:": "The icons:",
  "víti": "penalties",
  "aukaspyrnur": "free kicks",
  "horn": "corners",
  "„Fyrsti taki\" er lægsta FPL-röðun liðsins, ekki talan 1.": "\"First taker\" is the team's LOWEST FPL order, not the number 1.",
  "Mælt á raungögnum: víti og aukaspyrnur eru númeruð 1–5, en horn": "Measured on real data: penalties and free kicks are numbered 1–5, but corners",
  "4–10 og ná aldrei 1": "4–10 and never reach 1",
  "— FPL notar annan grunn þar. Eldri útgáfa krafðist talsins 1 og sýndi því aldrei hornataka.": "— FPL uses a different base there. An older version required the number 1 and so never showed a corner taker.",
  "Röðunin er handskráð hjá FPL og getur verið úrelt snemma tímabils — sannreyndu gegn síðustu leikjum áður en þú byggir fyrirliða-val á henni.": "The order is hand-entered by FPL and can be stale early in the season — verify against recent matches before basing a captaincy pick on it.",
};
