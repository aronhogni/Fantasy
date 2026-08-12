/* ============================================================
   standings.js — STADAN I DEILDINNI, LESIN UR SLEEPER. HREIN.

   Ekkert React, ekkert `fetch`. Sleeper-svor inn, radir ut. Sama
   forsenda og i `sleeper-league.js`: profin verda ad geta keyrt
   NAKVAEMLEGA somu vorpun og forsidan birtir. Vaeri hun inni i
   `Dashboard.jsx` gaeti profid adeins profad AFRIT af henni.

   Notandinn spilar i TVEIMUR deildum og vill sja badar a einum stad:
     Patriots SB champs  1389356308104249344  10 lid  PPR
     Sofahetjur          1389328159903580160  12 lid  half-PPR

   Endapunktarnir eru opnir med CORS-hausum (stadfest 12.8.2026, engin
   skilriki) — sama rok og i kafla 6e i README: innskraning hefdi sett
   raunverulegt skilriki i vafra-app i OPNU repo-i og gefid engin ny
   gogn.

   ============================================================
   GILDRA 1 — STIGIN ERU TVEIR REITIR, OG SU RANGA TALA ER TRULEG
   ============================================================
   Sleeper geymir stig sem HEILTOLU + HUNDRADSHLUTA i sitt hvoru svidi:

     { fpts: 1815, fpts_decimal: 34 }   ->  1815,34
     { fpts_against: 1850, fpts_against_decimal: 84 }  ->  1850,84

   Ad lesa adeins `fpts` er THOGUL VILLA af verstu gerd: 1815 er
   fullkomlega truverdileg stigatala, hun er nalaegt rettu, og hun
   birtist an nokkurs merkis um ad eitthvad se ad. Verra: `fpts` eitt
   brytur JAFNTEFLI RANGT — tvo lid med somu sigra og `fpts` 1815 a
   moti 1815 eru jofn i heiltolunni en 1815,34 a moti 1815,92 i raun,
   svo rodin snyst upp a handahof (innslattarrod svarsins).

   HUNDRADSHLUTAR, EKKI TIUNDU — OG THAD VAR MAELT, EKKI GISKAD.
   Kvardinn a `fpts_decimal` er ekki i neinu svari; hann var stadfestur
   gegn OHADRI leid ad somu tolu (sama munstur og "Arsenal maelist med
   27 mork a sig i skotakortunum" i FPL-verkefninu):

     summa `points` ur `/league/{id}/matchups/{w}`, vikur 1-14
     borin vid  fpts + fpts_decimal/100  og  fpts + fpts_decimal/10

   Deild 1257117602308689920 (Patriots 2025, `status: "complete"`),
   maelt 12.8.2026:  /100 hittir  10 af 10 rostrum upp a sentid
                     /10  hittir   0 af 10
   Daemi: roster 1 -> 1815,34 ur badum leidum.

   Tvennt annad kom ur somu maelingu og er skjalad her thvi thad er
   ekki i neinu svari heldur:
     · `fpts` er REGLULEGA TIMABILID EINGONGU. Summa vikna 1-17 gefur
       2268,18 a roster 1 en `fpts` er 1815,34 = vikur 1-14, og
       `settings.playoff_week_start` er 15. Urslitakeppnin er UTAN.
     · `fpts_decimal` maeldist alltaf a bilinu 0-99. Gildi utan thess
       er thvi EKKI hundradshluti og er sleppt (sja `pointsOf`) —
       ad leggja 156/100 vid vaeri ad tvitelja.

   ============================================================
   GILDRA 2 — FORLEIKUR: ALLT ER NULL OG THAD MA EKKI LESAST SEM MAELING
   ============================================================
   THETTA ER MIKILVAEGASTA REGLAN I THESSARI SKRA.

   Maelt 12.8.2026 a badum deildum notandans: hvert einasta
   `wins`/`losses`/`ties`/`fpts` er **0**, thvi timabilid er ekki byrjad.
   Tafla sem radar tiu lidum 1-10 eftir engum leikjum er TILBUNINGUR
   MED UTLIT MAELINGAR — versta utkoman i thessu repo-i (CLAUDE.md 3).
   Og hun vaeri ekki bara gagnslaus heldur VILLANDI: rodin yrdi
   innslattarrod svarsins og notandinn laesi hana sem stodu.

   Thess vegna:  ENGIR LEIKNIR LEIKIR  ->  `rank: null` a OLLUM
                                           `complete: false`
                                           `why` segir hvers vegna
   Sa sem kallar birtir tha "no games played yet" I STAD toflu.

   `rows` er samt radad (og i rostur-rod i forleik, thvi allir lyklar
   eru jafnir) — en rodin er BIRTINGARROD, ekki rodun, og `rank: null`
   er thad sem segir thad. Kallandinn ma ALDREI leida saeti af
   vistfangi i fylkinu.

   ============================================================
   GILDRA 3 — SVID SEM VANTAR ER NULL, SVID SEM ER 0 ER NULL-TALA
   ============================================================
   Maelt i somu svorum, i SAMA svari:

     Patriots 2026 (forleikur):  `fpts: 0` ER thar
                                 `fpts_decimal` er EKKI thar
                                 `fpts_against` er EKKI thar
     Sofahetjur 2026:            rostur 1-10 bera EKKI `fpts_decimal`
                                 rostur 11-12 bera `fpts_decimal: 0`

   Sami hlutur, tvenns konar svar, i einu og sama svarinu. Reglan er
   thvi ORDID: `fpts: 0` er MAELT null (lidid hefur skorad 0 stig i
   0 leikjum), en `fpts_against` sem vantar er OTHEKKT -> `null`, ekki
   0. "Points against: 0" vaeri fullyrding sem gognin bera ekki.
   NULL ER EKKI NULL (CLAUDE.md 8).

   ============================================================
   SVID SEM VORU LESIN OG SLEPPT VILJANDI
   ============================================================
   · `waiver_position` — Sofahetjur bera **0** a einu rostri og **-1**
     a odru i sama svari. Tala sem er -1 er ekki saeti; hun er merki um
     ad Sleeper hafi ekki radad vidskiptarodinni. Vaeri hun birt sem
     "waiver 0" vaeri thad omaeld tala i tolulegu reiti.
   · `ppts` / `ppts_decimal` (mogulegu stigin) — thau eru raunveruleg en their
     svara annarri spurningu (hve vel stilltir thu upp) og eru ekki i
     nokkru sem forsidan spyr. Daudur kodi er verri en enginn i thessu
     repo-i (sja `dstPoints` i `scoring.js`), svo their eru ekki lesnir
     fyrr en einhver spyr theirrar spurningar.
   · `co_owners` — **null i ollum 32 rostrum** thriggja raunsvara
     (Patriots 2026 og 2025, Sofahetjur 2026), svo formid a fylkinu
     hefur ALDREI verid sed. Uppfletting sem er skrifud gegn osednu
     formi er sami flokkur og BSD-`availability`: hun getur skeikad i
     ranga att an thess ad nokkud sjaist. `myRosterId` les thvi
     `owner_id` EINGONGU, og sam-eigandi faer `null` = "vid vitum ekki",
     sem er rett svar, ekki rangt rostur.
   · `total_moves` — 0 a ollum 32 rostrum, lika i loknu timabili thar
     sem menn SKIPTU vissulega. Svidid maelir eitthvad annad en thad
     heitir og er ekki nothaeft.
   · `metadata.record` — Sleeper ber stundum streng eins og "WWLWL".
     Hann er ekki i thessum svorum og er hvort ed er afleiddur af
     `wins`/`losses`.
   ============================================================ */

/* ---------- talnathvingun ----------
   `Number(null)`, `Number("")`, `Number([])` og `Number(false)` eru OLL
   **0**, svo bert `Number(v)` gerir vantandi gogn ad maeldu nulli —
   nakvaemlega su villa sem thessi skra er til ad forda. Thess vegna er
   gerdin thvingud FYRST og adeins tolur og tolustrengir teknir. */
function num(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Heiltala >= 0, annars null. Sigrar/tap/jafntefli geta ekki verid brot. */
function count(v) {
  const n = num(v);
  if (n == null) return null;
  const i = Math.trunc(n);
  return i >= 0 ? i : null;
}

/** Strengur sem er raunverulega eitthvad, annars null. */
function text(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/* ---------- stigin: TVO SVID, EITT GILDI ----------
   Sja GILDRA 1 i hausnum. `whole` vantar -> null (othekkt).
   `dec` vantar -> 0 hundradshlutar (maelt: thad er thad sem Sleeper
   thegir um i forleik og a 10 af 12 Sofahetju-rostrum).
   `dec` utan 0-99 -> sleppt; thad er ekki hundradshluti.

   Reiknad i HUNDRADSHLUTUM og deilt einu sinni, svo talan verdi
   naesta double vid 1815,34 og `=== 1815.34` standist. `whole/1 +
   dec/100` gefur sama gildi her en fleytitolu-samlagning er ekki
   vixlin (sama regla og BSD-summurnar i CLAUDE.md 6). */
function pointsOf(whole, dec) {
  const w = num(whole);
  if (w == null) return null;
  const d = count(dec);
  const cents = d != null && d <= 99 ? d : 0;
  return (Math.round(w * 100) + cents) / 100;
}

/* ---------- lidsheitid ----------
   `metadata.team_name` gengur framar `display_name` thegar thad er til
   — thad er heitid sem notandinn valdi sjalfur og thad sem hann ser i
   Sleeper-appinu. Maelt: 3 af 10 i Patriots og 7 af 12 i Sofahetjum
   bera team_name, svo BADAR greinar eru raunverulegar.

   Rostur an eiganda faer FAST heiti. "undefined" a skja er verra en
   nafnlaust lid — sama regla og `Slot 2` i `teamsFromLeague`. */
function nameOf(user, rosterId) {
  const meta = user && user.metadata && typeof user.metadata === "object"
    ? user.metadata : null;
  return text(meta && meta.team_name) ||
         text(user && user.display_name) ||
         (rosterId != null ? `Team ${rosterId}` : "Unknown team");
}

/** `users`-fylki -> Map(user_id -> user). */
function usersById(users) {
  const m = new Map();
  for (const u of Array.isArray(users) ? users : []) {
    if (u && typeof u === "object" && u.user_id != null) m.set(String(u.user_id), u);
  }
  return m;
}

/* ============================================================
   MITT ROSTUR
   ============================================================
   `null` thydir OTHEKKT og thad ma ALDREI lesast eins og rostur 0 eda
   eins og "fyrsta lidid". Kallandinn birtir tha enga graena rod i stad
   thess ad merkja ranga.

   Tvaer leidir, i thessari rod:
     1. `owner_id` === `userId` — beint, og thad er thad sem Sleeper ber
     2. `userId` er notandanafn (`display_name`) eda lidsheiti — thvi
        thad er thad sem notandinn HEFUR i hendi; hann veit ekki sitt
        19-stafa snjokorn

   Leid 2 er TVIRAETT ef tveir bera sama heiti, og tha er svarid ENGIN
   PORUN — sami laerdomur og "tviraedur lykill skilar ENGU" i
   `names.mjs`. Thogul rong porun er verri en engin.
   ============================================================ */
export function myRosterId({ rosters, users, userId } = {}) {
  const want = text(userId != null && typeof userId !== "object" ? String(userId) : null);
  if (!want) return null;

  const list = (Array.isArray(rosters) ? rosters : [])
    .filter((r) => r && typeof r === "object" && count(r.roster_id) != null);

  /* 1. beint a `owner_id`. */
  const direct = list.filter((r) => r.owner_id != null && String(r.owner_id) === want);
  if (direct.length === 1) return count(direct[0].roster_id);
  /* Tveir rostrar med sama eiganda er ekki mogulegt i Sleeper og vaeri
     skemmt svar — tha er svarid ekkert, ekki "fyrsti". */
  if (direct.length > 1) return null;

  /* 2. sem notandanafn eda lidsheiti. Beran samanburd, svo "steindorb"
        finni "SteindorB" — heitid er slegid inn i hendi. */
  const low = want.toLowerCase();
  const hits = [];
  for (const u of Array.isArray(users) ? users : []) {
    if (!u || typeof u !== "object" || u.user_id == null) continue;
    const dn = text(u.display_name);
    const tn = text(u.metadata && typeof u.metadata === "object" ? u.metadata.team_name : null);
    if ((dn && dn.toLowerCase() === low) || (tn && tn.toLowerCase() === low)) {
      hits.push(String(u.user_id));
    }
  }
  const uniq = [...new Set(hits)];
  if (uniq.length !== 1) return null;          // 0 eda tviraett -> ekkert

  const owned = list.filter((r) => r.owner_id != null && String(r.owner_id) === uniq[0]);
  return owned.length === 1 ? count(owned[0].roster_id) : null;
}

/* ============================================================
   STADAN
   ============================================================
   `{ rosters, users, league, userId? }` ->
     { rows, playoffTeams, complete, why }

   `rosters`  /league/{id}/rosters
   `users`    /league/{id}/users
   `league`   /league/{id}       (`settings.playoff_teams`, `num_teams`)
   `userId`   VALFRITT. Er hann ekki gefinn ber ENGIN rod `isMe` — sja
              athugasemdina vid `isMe` her fyrir nedan.

   Hver rod:
     { rosterId, userId, name, wins, losses, ties,
       pointsFor, pointsAgainst, rank, inPlayoffs, isMe? }
   ============================================================ */
export function standingsFrom({ rosters, users, league, userId } = {}) {
  const byUser = usersById(users);
  const L = league && typeof league === "object" ? league : {};
  const lset = L.settings && typeof L.settings === "object" ? L.settings : {};

  const numTeams = count(lset.num_teams) ?? count(L.total_rosters);

  const list = (Array.isArray(rosters) ? rosters : [])
    .filter((r) => r && typeof r === "object" && count(r.roster_id) != null);

  const meRoster = myRosterId({ rosters: list, users, userId });
  /* `isMe` er sett ADEINS thegar vid vitum hver notandinn er. `isMe:
     false` a hverri rod thegar vid vitum thad ekki vaeri fullyrding um
     rodina sem ER hann — "thetta er ekki thu" um lidid thitt. Reitur
     sem vid getum ekki fyllt faer ekki reit (CLAUDE.md 8). */
  const knowMe = meRoster != null;

  const rows = list.map((r) => {
    const s = r.settings && typeof r.settings === "object" ? r.settings : {};
    const rosterId = count(r.roster_id);
    const uid = r.owner_id != null ? String(r.owner_id) : null;
    const row = {
      rosterId,
      userId: uid,
      name: nameOf(uid ? byUser.get(uid) : null, rosterId),
      wins: count(s.wins),
      losses: count(s.losses),
      ties: count(s.ties),
      pointsFor: pointsOf(s.fpts, s.fpts_decimal),
      pointsAgainst: pointsOf(s.fpts_against, s.fpts_against_decimal),
      rank: null,
      inPlayoffs: false,
    };
    if (knowMe) row.isMe = rosterId === meRoster;
    return row;
  });

  /* ---------- var raunverulega spilad? ----------
     Krafan er ad HVER rod hafi spilad ad minnsta kosti einn leik, ekki
     ad SUMMAN se yfir null. Ad rada lidi med 0 leiki innan um lid med
     leiki er sami tilbuningur i minni utgafu, og "einn hefur spilad"
     mundi opna toffluna fyrir alla. */
  const played = (row) => (row.wins || 0) + (row.losses || 0) + (row.ties || 0);
  const none = rows.filter((r) => played(r) === 0).length;
  const complete = rows.length > 0 && none === 0;

  /* ---------- rodun: SIGRAR > JAFNTEFLI > STIG FYRIR ----------
     Jafntefli a undan stigum thvi 7-6-1 er betri en 7-7-0 (leikurinn
     var ekki tapadur). Stig fyrir er thridji lidurinn og hann er
     ASTAEDAN fyrir gildru 1: an `fpts_decimal` er hann heiltolu-grofur
     og jafnteflisbrotid fellur i rostur-rod.

     `rosterId` er FJORDI lidurinn — ekki regla deildarinnar heldur
     krafa um ad utkoman se endurgeranleg. Tvaer keyrslur a sama svari
     verda ad gefa somu rod (sama regla og "fost event-id rod" i
     BSD-samlagningunni).

     Vantandi tala radast SIDAST i bada enda; hun er ekki 0. */
  const cmp = (a, b) => {
    const d = (x, y) => (x == null ? 1 : y == null ? -1 : 0);
    for (const k of ["wins", "ties", "pointsFor"]) {
      if (a[k] == null || b[k] == null) { const t = d(a[k], b[k]); if (t) return t; continue; }
      if (a[k] !== b[k]) return b[k] - a[k];
    }
    return (a.rosterId ?? 0) - (b.rosterId ?? 0);
  };
  rows.sort(cmp);

  /* ---------- urslitakeppnin ----------
     `playoff_teams` er REGLA deildarinnar, ekki maeling, svo hun er
     lesin lika i forleik. Hun verdur samt ad vera vitleg: fleiri saeti
     en lid er skemmt svar. */
  let playoffTeams = count(lset.playoff_teams);
  if (playoffTeams != null && (playoffTeams < 1 ||
      (numTeams != null && playoffTeams > numTeams))) playoffTeams = null;

  /* ---------- saetin ----------
     ENGIR LEIKNIR LEIKIR -> ENGIN SAETI. Sja GILDRA 2. */
  if (complete) {
    rows.forEach((row, i) => {
      row.rank = i + 1;
      /* Cutid othekkt -> `null`, EKKI `false`. `false` segdi "thu ert
         ekki i urslitakeppninni", sem er fullyrding sem vid getum ekki
         gert thegar vid vitum ekki hve morg saeti eru. */
      row.inPlayoffs = playoffTeams == null ? null : row.rank <= playoffTeams;
    });
  }
  /* Vid `!complete` stendur `inPlayoffs: false` a ollum og thad er SONN
     setning burtsed fra cutinu: saeti er AFLAD, og enginn hefur aflad
     thess i null leikjum. */

  /* ---------- hvers vegna ekki ----------
     Strengur a ensku (vidmot og gogn a ensku, rokstudningur a islensku
     — README kafli 4 / CLAUDE.md 9). `null` thegar taflan ER maeling;
     tha hefur kallandinn ekkert ad birta. */
  let why = null;
  if (!rows.length) {
    why = "No rosters in this league response — there is nothing to rank.";
  } else if (!complete) {
    why = none === rows.length
      ? `No games played yet — ${rows.length} teams, 0 games. ` +
        `Ranking them would be an order with nothing behind it.`
      : `${none} of ${rows.length} teams have not played a game yet, so the ` +
        `table is not a standing.`;
  }

  return { rows, playoffTeams: playoffTeams ?? null, complete, why };
}

/* ============================================================
   METID SEM STRENGUR
   ============================================================
   "8-6-0". `null` thegar enginn leikur er spiladur — **EKKI "0-0-0"**,
   sem les nakvaemlega eins ut og maelt jafnt met eftir 14 vikur. Sama
   regla og "tomt gildi er SLEPPT, ekki sett i 0" (CLAUDE.md 8): sula af
   lengd 0 les eins og maeld nulltala.

   Jafnteflin eru ALLTAF med, lika thegar thau eru 0. Ad birta "8-6"
   stundum og "7-6-1" stundum gerir tvo olik snid ad sama dalki og
   lesandinn getur ekki sed hvort thridja talan vanti eda hun se null
   (sama aett og "aldrei blanda styttingu og langritun i sama stil").
   ============================================================ */
export function recordLine(row) {
  if (!row || typeof row !== "object") return null;
  const w = count(row.wins), l = count(row.losses), t = count(row.ties);
  if (w == null || l == null || t == null) return null;
  if (w + l + t === 0) return null;
  return `${w}-${l}-${t}`;
}
